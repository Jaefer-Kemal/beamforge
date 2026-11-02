## Why This Matters in Production

The **#1 cause of production outages** in network services is the unconstrained use of **`{active, true}`** on TCP sockets.

When a socket is opened in `{active, true}` mode, the operating system kernel delivers incoming network packets directly into the Erlang process's mailbox as fast as the physical network card can receive them. If a rogue client or malicious attacker blasts 200,000 packets per second, your Erlang process's mailbox queue length balloons from 0 to 1,000,000 messages in seconds. The BEAM VM consumes all available RAM and triggers the Linux Out-Of-Memory (OOM) Killer, destroying the entire node!

> [!abstract] Flow Control: `{active, true}` vs `{active, once}`
> - **Dangerous `{active, true}`:** Unbounded mailbox flood. Fast clients push 100k msgs/sec directly into actor mailbox, exhausting RAM and triggering OOM.
> - **Production Safe `{active, once}`:** Hardware backpressure. OS delivers exactly 1 packet, switches socket to passive mode, and waits until the actor calls `inet:setopts(Sock, [{active, once}])` before accepting the next packet.

## Deep Concept Breakdown & Under the Hood

### The Four Socket Active Modes
1. **`{active, false}` (Passive Mode)**:
   - The process must manually call `gen_tcp:recv(Socket, Length, Timeout)`.
   - Highest control, but completely blocks the calling process while waiting for network input, preventing it from handling supervisor messages or timers.
2. **`{active, true}` (Full Active Mode — DANGEROUS)**:
   - Every packet is converted into `{tcp, Socket, Binary}` and sent to the controlling process.
   - Zero flow control. The process has no way to say "stop sending, I am busy".
3. **`{active, once}` (Flow-Controlled Active Mode — Production Standard)**:
   - Delivers **exactly one** `{tcp, Socket, Binary}` message to your process mailbox.
   - The socket **automatically reverts to `{active, false}`** immediately after delivering that single message.
   - Any further packets sent by the client stay queued in the operating system's kernel TCP buffer. When the kernel buffer fills up, TCP window scaling kicks in and **physically slows down the client's network card**!
   - Once your process finishes handling the current frame, it re-arms the socket:
     ```erlang
     ok = inet:setopts(Socket, [{active, once}])
     ```
4. **`{active, N}` (Burst Active Mode)**:
   - Delivers `N` messages before flipping to passive and sending a `{tcp_passive, Socket}` notification.

> [!warning] Production Networking Trap: The Mailbox OOM Tsunami
> Under network jitter or traffic spikes, an active socket actor that takes 10ms to insert into a database will fall behind a client sending a packet every 0.1ms. The 100x discrepancy accumulates in the process mailbox. In production, **never use `{active, true}` on untrusted external network sockets**.

## Official Erlang Docs & Function Reference

```erlang
%% Official OTP Signature (kernel / inet)
inet:setopts(Socket, Options) -> ok | {error, Reason}
  Types:
    Socket = inet:socket()
    Options = [inet:socket_setopt()]
    %% Options can include: [{active, once}], [{active, true}], [{active, false}], [{active, N}]

%% Incoming Socket Messages Delivered to Mailbox
{tcp, Socket, Data}          %% Arrives when socket is active and bytes are read
{tcp_closed, Socket}        %% Arrives when remote peer disconnects
{tcp_error, Socket, Reason} %% Arrives on network fault
```

## Parallel Worked Example

Here is a supervised connection worker applying bounded `{active, once}` backpressure:

```erlang
-module(echo_backpressure_worker).
-behaviour(gen_server).
-export([init/1, handle_info/2, terminate/2]).

init([Socket]) ->
    ok = inet:setopts(Socket, [binary, {active, once}]),
    {ok, #{socket => Socket, count => 0}}.

handle_info({tcp, Socket, Data}, #{socket := Socket, count := Count} = State) ->
    ok = gen_tcp:send(Socket, <<"+ECHO: ", Data/binary>>),
    %% CRITICAL: Re-arm active once AFTER processing
    ok = inet:setopts(Socket, [{active, once}]),
    {noreply, State#{count => Count + 1}};
handle_info({tcp_closed, _Socket}, State) ->
    {stop, normal, State}.

terminate(_Reason, #{socket := Socket}) ->
    catch gen_tcp:close(Socket),
    ok.
```

## Assignment Specification

Implement module `src/tcp_flow_worker.erl` as a supervised `gen_server` that accepts a raw client socket, manages it in `{active, once}` mode, and applies strict backpressure:

1. **`start_link(Socket)`**:
   - Starts and links the `gen_server`.
   - In `init/1`, stores `Socket` and arms the socket with `inet:setopts(Socket, [binary, {active, once}])`.
2. **`handle_info({tcp, Socket, Data}, State)`**:
   - Sends back an echo response: `gen_tcp:send(Socket, <<"+ACK: ", Data/binary>>)`.
   - Increments packets and bytes processed counters.
   - **Crucial**: Calls `ok = inet:setopts(Socket, [{active, once}])` before returning `{noreply, NewState}`.
3. **`handle_info({tcp_closed, Socket}, State)`**:
   - Marks `closed => true` in state.
4. **`handle_call(get_stats, _From, State)`**:
   - Returns `#{packets_processed => Packets, bytes_processed => Bytes, closed => Closed}`.
5. **`get_stats(Server)` & `get_processed_count(Server)`**:
   - Synchronous helpers to inspect worker state.
6. **`start_server/0` & `stop_server/1`**:
   - Helper functions to start a listening server on port `0`, accept one client, register `tcp_flow_worker`, and tear down cleanly.

## Rules & Verification Constraints
- Verified by **`bf_backpressure_tester:verify_active_once_backpressure/5`**, which blasts 50 frames into your socket and asserts that your process mailbox queue length **never exceeds 5**!
- AST verifier enforces required calls: `inet:setopts/2` and `gen_tcp:send/2`.
    
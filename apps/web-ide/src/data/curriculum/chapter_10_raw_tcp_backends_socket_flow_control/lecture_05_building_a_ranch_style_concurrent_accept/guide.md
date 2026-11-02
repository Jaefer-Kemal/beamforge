## Why This Matters in Production

In high-concurrency systems (like WhatsApp, Discord, or financial order matching engines), thousands of clients connect simultaneously.

If your server runs a **single acceptor process** executing:
```erlang
accept_loop(ListenSocket) ->
    {ok, ClientSocket} = gen_tcp:accept(ListenSocket),
    handle_client(ClientSocket),  %% BOTTLENECK!
    accept_loop(ListenSocket).
```
every incoming connection is blocked behind every other client's request!

Production-grade servers (such as Nine Nines' **Ranch**, used by the Cowboy HTTP server and MongooseIM XMPP server) solve this using the **Acceptor Pool Pattern**:
1. A master listener opens a single shared `ListenSocket`.
2. A pool of $N$ acceptor processes **concurrently call `gen_tcp:accept(ListenSocket)`** on that identical socket descriptor.
3. The BEAM VM and Linux kernel dispatch incoming TCP SYN handshakes across the pool without lock contention.
4. The instant an acceptor receives `{ok, ClientSocket}`, it spawns a dedicated connection worker and transfers ownership via **`gen_tcp:controlling_process(ClientSocket, WorkerPid)`**, then immediately loops back to accept the next client!

> [!abstract] Ranch-Style Acceptor Pool Architecture
> - Multiple acceptor processes concurrently wait on the same shared `ListenSocket`.
> - When an incoming TCP handshake completes, one acceptor wakes up with `{ok, ClientSocket}`.
> - The acceptor spawns a dedicated connection worker, executes `gen_tcp:controlling_process(ClientSocket, WorkerPid)`, and immediately loops back to accept more connections without blocking.

## Deep Concept Breakdown & Under the Hood

### What is the "Controlling Process"?
In Erlang, every socket has an owner known as the **controlling process**.
- By default, the controlling process is whichever process called `gen_tcp:listen/2` or `gen_tcp:accept/1`.
- All incoming network events (`{tcp, Socket, Data}`, `{tcp_closed, Socket}`) are delivered **exclusively** to the controlling process's mailbox.
- If the controlling process dies, the BEAM VM automatically closes the underlying socket!

To transfer a socket from an Acceptor to a Connection Worker, you MUST call:
```erlang
ok = gen_tcp:controlling_process(ClientSocket, WorkerPid)
```
And then notify `WorkerPid` that it is now safe to arm the socket with `inet:setopts(ClientSocket, [{active, once}])`!

### The Safe Socket Handoff Protocol
1. **Passive Listener**: The listener opens in `{active, false}`.
2. **Accept Handshake**: Acceptor process executes `gen_tcp:accept(ListenSocket)` $\rightarrow$ `{ok, ClientSocket}`.
3. **Worker Spawning**: Acceptor spawns `WorkerPid`.
4. **Ownership Transfer**: Acceptor calls `gen_tcp:controlling_process(ClientSocket, WorkerPid)`.
5. **Worker Activation**: Acceptor sends `WorkerPid ! {socket_ready, ClientSocket}`.
6. **Flow Control Armed**: Inside `WorkerPid`, it calls `inet:setopts(ClientSocket, [{active, once}])` to begin receiving data!

> [!warning] Production Networking Trap: Race Conditions During Socket Handoff
> If an acceptor arms `{active, once}` *before* calling `gen_tcp:controlling_process/2`, the client's initial handshake frame lands in the **acceptor's** mailbox! When ownership transfers to the worker, the initial message is lost in the acceptor, causing a protocol deadlock. Always transfer ownership before arming active mode!

## Official Erlang Docs & Function Reference

```erlang
%% Official OTP Signature (kernel / gen_tcp)
gen_tcp:controlling_process(Socket, NewOwnerPid) -> ok | {error, Reason}
  Types:
    Socket = gen_tcp:socket()
    NewOwnerPid = pid()
```

## Parallel Worked Example

Here is a worker handoff function transferring ownership and notifying the worker:

```erlang
-module(connection_dispatcher).
-export([dispatch_socket/2]).

dispatch_socket(ClientSocket, WorkerPid) ->
    case gen_tcp:controlling_process(ClientSocket, WorkerPid) of
        ok ->
            WorkerPid ! {socket_ready, ClientSocket},
            ok;
        {error, Reason} ->
            gen_tcp:close(ClientSocket),
            {error, Reason}
    end.
```

## Assignment Specification

Implement module `src/tcp_acceptor_pool.erl` exporting connection handoff and acceptor pool management functions:

1. **`handoff_socket(ClientSocket, WorkerPid)`**:
   - Calls `gen_tcp:controlling_process(ClientSocket, WorkerPid)`.
   - If successful (`ok`), sends `WorkerPid ! {socket_ready, ClientSocket}` and returns `ok`.
   - If error (`{error, Reason}`), closes `ClientSocket` and returns `{error, Reason}`.
2. **`start_pooled_server(AcceptorCount, WorkerFun)`**:
   - Opens a listening socket on port `0` with `[binary, {packet, raw}, {active, false}, {reuseaddr, true}]`.
   - Retrieves actual port via `inet:port/1`.
   - Spawns `AcceptorCount` concurrent acceptor processes that:
     - Loop on `gen_tcp:accept(ListenSocket)`.
     - Spawn a worker running `WorkerFun(Socket)` upon receiving `{socket_ready, Socket}`.
     - Execute `handoff_socket(ClientSocket, WorkerPid)`.
   - Returns `{ok, ListenSocket, Port, AcceptorPidsList}`.
3. **`stop_pooled_server(ListenSocket)`**:
   - Closes `ListenSocket` with `gen_tcp:close/1` and returns `ok`.
4. (Also export `start_pool/2`, `get_active_workers/1`, and `stop_pool/1` for backward compatibility with automated test suites).

## Rules & Verification Constraints
- Verified by connecting 5 clients concurrently and verifying active workers and echo replies.
- AST verifier checks required calls: `gen_tcp:controlling_process/2`, `gen_tcp:listen/2`, and `gen_tcp:accept/1`.
    
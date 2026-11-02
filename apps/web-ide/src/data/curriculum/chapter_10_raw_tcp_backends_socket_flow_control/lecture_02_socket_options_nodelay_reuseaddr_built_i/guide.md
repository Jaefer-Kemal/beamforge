## Why This Matters in Production

Before writing custom stream framing loops or byte parsers, you must master the **built-in C-level socket options** provided by the BEAM runtime and OS kernel.

Misconfiguring socket options is the hidden cause behind the two most frustrating bugs in backend engineering:
1. **The 200ms Latency Mystery**: An API endpoint that should take 2ms randomly takes 202ms because the operating system is buffering packets under **Nagle's Algorithm**.
2. **Supervisor Restart Crash Loops**: A supervised TCP worker crashes and tries to restart, but crashes immediately with `{error, eaddrinuse}` because the operating system keeps the port locked in **`TIME_WAIT`**!

By passing the correct socket options, you delegate framing and low-latency packet flushing directly to the BEAM's optimized C port driver!

> [!abstract] Essential Socket Options Matrix
> - **`binary`**: Delivers packets as compact, contiguous binaries (`<<"...">>`) instead of 16-byte-per-char linked lists (`[104, 101, ...]`).
> - **`{nodelay, true}` (`TCP_NODELAY`)**: Disables Nagle's algorithm. Flushes small writes to the network interface immediately without a 40–200ms delay.
> - **`{reuseaddr, true}` (`SO_REUSEADDR`)**: Allows the server to rebind the port immediately upon supervisor restart without waiting for OS `TIME_WAIT` sockets to expire.
> - **`{packet, 4}`**: Instructs the C driver to automatically prepend a 4-byte big-endian length prefix on send, and buffer incoming chunks in C until the full payload arrives before delivering `{tcp, Sock, Payload}`!

## Deep Concept Breakdown & Under the Hood

### 1. Built-in C-Level Packet Framing
TCP is fundamentally an **unframed stream of bytes**, not a stream of messages. If a client sends `<<"HELLO">>`, the server might receive `<<"HEL">>` followed by `<<"LO">>`.

Instead of writing custom Erlang buffers for length-prefixed protocols, the BEAM C driver provides built-in packet framing:
- **`{packet, raw}` (or `0`)**: No automatic framing. Delivers raw TCP chunks as they arrive.
- **`{packet, 1 | 2 | 4}`**: Length-prefixed framing. The driver assumes every packet begins with a 1-, 2-, or 4-byte unsigned big-endian integer specifying the payload length.
  - On `gen_tcp:send(Socket, Payload)`: The C driver automatically prepends the 4-byte length header.
  - On reception: The C driver buffers bytes in OS C memory until the entire `Length` bytes have arrived. Only then does it deliver a single, complete `{tcp, Socket, Payload}` message into your Erlang mailbox!
- **`{packet, line}`**: Buffers incoming bytes in C and delivers one line at a time up to the newline character (`\n`).

### 2. Socket Lifecycle Event Handling
In active socket modes, the BEAM driver delivers three standardized message tuples to your process mailbox:
1. **Data Arrived**: `{tcp, Socket, DataBin}` when bytes are ready.
2. **Clean Disconnect**: `{tcp_closed, Socket}` when the remote peer gracefully closes the connection (`FIN` handshake).
3. **Network Error**: `{tcp_error, Socket, Reason}` on abrupt connection resets (`econnreset`) or timeouts.

> [!warning] Production Networking Trap: Nagle's Algorithm & Delayed ACK Deadlock
> In HTTP/1.1 or custom RPC, when a client sends a small command (e.g. `PING`), Nagle's algorithm may hold the packet waiting for more data. Meanwhile, the server's OS uses **Delayed ACK**, waiting up to 200ms to acknowledge the previous packet. Both operating systems wait on each other, causing an artificial **200ms latency spike**! In real-time servers, **always set `{nodelay, true}`**.

## Official Erlang Docs & Function Reference

```erlang
%% Official OTP Signature (kernel / inet)
inet:setopts(Socket, Options) -> ok | {error, Reason}
  Types:
    Options = [gen_tcp:listen_option()]
    %% Options can include:
    %%   binary,
    %%   {packet, raw | line | 1 | 2 | 4},
    %%   {active, once | true | false},
    %%   {nodelay, boolean()},
    %%   {reuseaddr, boolean()}
```

## Parallel Worked Example

Here is a module creating low-latency socket options, classifying events, and manually encoding length-prefixed frames:

```erlang
-module(socket_configurator).
-export([get_chat_options/0, parse_event/1, wrap_frame/1]).

get_chat_options() ->
    [binary, {packet, 4}, {active, once}, {nodelay, true}, {reuseaddr, true}].

parse_event({tcp, _Sock, Data}) when is_binary(Data) ->
    {ok, data, byte_size(Data), Data};
parse_event({tcp_closed, _Sock}) ->
    {ok, disconnected, normal};
parse_event({tcp_error, _Sock, Reason}) ->
    {ok, disconnected, {error, Reason}};
parse_event(_Other) ->
    {error, invalid_event}.

wrap_frame(PayloadBin) when is_binary(PayloadBin) ->
    Len = byte_size(PayloadBin),
    <<Len:32/big-unsigned-integer, PayloadBin/binary>>.
```

## Assignment Specification

Implement module `src/tcp_socket_opts.erl` exporting three essential socket configuration and event classification functions:

1. **`build_low_latency_opts(PacketMode)`**:
   - Validates that `PacketMode` is one of: `raw`, `line`, `1`, `2`, or `4`.
   - Returns the canonical low-latency options list:
     ```erlang
     [binary, {packet, PacketMode}, {active, once}, {nodelay, true}, {reuseaddr, true}]
     ```
   - If `PacketMode` is invalid (e.g. `udp`, `8`, or `invalid`), returns `{error, invalid_packet_mode}`.
2. **`classify_socket_event(EventTuple)`**:
   - Matches `{tcp, _Socket, DataBin}` when `is_binary(DataBin)` $\rightarrow$ returns `{data, byte_size(DataBin), DataBin}`.
   - Matches `{tcp_closed, _Socket}` $\rightarrow$ returns `{disconnected, normal_eof}`.
   - Matches `{tcp_error, _Socket, Reason}` $\rightarrow$ returns `{disconnected, {socket_error, Reason}}`.
   - Any other term $\rightarrow$ returns `{error, unknown_event}`.
3. **`encode_length_prefixed(PayloadBin)`**:
   - Manually constructs a `{packet, 4}` wire frame:
     ```erlang
     <<(byte_size(PayloadBin)):32/big-unsigned-integer, PayloadBin/binary>>
     ```

## Rules & Verification Constraints
- Use binary syntax (`<<...>>`) and guard clauses (`is_binary/1`).
- AST verifier checks required constructs: `bit_syntax` and `guards`.
    
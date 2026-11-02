## Why This Matters in Production

You have mastered raw sockets, socket options, `{active, once}` backpressure, custom stream framing, and concurrent acceptor pools. Now you will assemble these core building blocks into a production-grade, Redis-compatible **TCP Key-Value Backend Server** built entirely from scratch!

This mini-capstone mirrors the core network engine of production databases (Redis, Memcached) and real-time messaging servers (including the XMPP server you will build in Chapters 11 and 12).

> [!warning] Production Networking Trap: Lingering Sockets, Port Collisions & ETS Leaks
> In a production TCP server, three common traps cause cascading outages:
> 1. **Socket Descriptor Leaks**: If a client abruptly disconnects and your worker process does not handle `{tcp_closed, Socket}` or crashes before calling `gen_tcp:close/1`, the file descriptor remains allocated in the OS table. Under sustained traffic, the node quickly exhausts file descriptors (`EMFILE: Too many open files`)!
> 2. **Port Collisions**: Hardcoding port `8080` in tests causes immediate crashes when parallel test runners run concurrently. Always pass port `0` to let the OS assign an ephemeral port (`inet:port(ListenSocket) -> {ok, Port}`).
> 3. **ETS Table Orphan Leaks**: When spawning named ETS tables in tests, if the owner process terminates without passing ownership via `{heir, Pid, Data}`, attempting to recreate the table with the same name crashes with `badarg`. In tests, always clean up existing tables cleanly.

> [!abstract] TCP Key-Value Server Architecture
> 1. **Client Socket**: Raw fragmented byte stream arrives under `{active, once}` flow control.
> 2. **Framing Buffer**: Accumulates incoming chunks and slices clean `\r\n` command lines.
> 3. **Command Parser**: Tokenizes verbs (`SET`, `GET`, `DEL`, `PING`).
> 4. **ETS Store**: Executes atomic reads and writes against an off-heap concurrent ETS table.
> 5. **Wire Formatter**: Encodes responses (`+OK\r\n`, `$Value\r\n`, `:1\r\n`, `-ERR...\r\n`) and transmits via `gen_tcp:send/2`.
> 6. **Flow Control Armed**: Re-arms socket via `inet:setopts(Socket, [{active, once}])` after every frame!

## Deep Concept Breakdown & Wire Protocol

Your server speaks a newline-terminated (`\r\n`) ASCII wire protocol:

### The 5 Wire Commands
1. **`PING\r\n`**:
   - Reply: `<<"+PONG\r\n">>`
2. **`SET <Key> <Value>\r\n`**:
   - Stores `{Key, Value}` in ETS.
   - Reply: `<<"+OK\r\n">>`
3. **`GET <Key>\r\n`**:
   - If key exists: `<<"$", Value/binary, "\r\n">>`
   - If key does not exist: `<<"$-1\r\n">>`
4. **`DEL <Key>\r\n`**:
   - If key existed and was deleted: `<<":1\r\n">>`
   - If key did not exist: `<<":0\r\n">>`
5. **Unknown Command**:
   - Reply: `<<"-ERR unknown command\r\n">>`

## Parallel Worked Example

Here is a command parser and executor skeleton:

```erlang
-module(protocol_handler).
-export([parse/1, execute/2]).

parse(<<"PING">>) -> {ok, ping};
parse(<<"SET ", Rest/binary>>) ->
    case binary:split(Rest, <<" ">>) of
        [K, V] -> {ok, {set, K, V}};
        _ -> {error, unknown_command}
    end;
parse(_) -> {error, unknown_command}.

execute({ok, ping}, _Tab) -> <<"+PONG\r\n">>;
execute({ok, {set, K, V}}, Tab) ->
    ets:insert(Tab, {K, V}),
    <<"+OK\r\n">>;
execute({error, unknown_command}, _Tab) ->
    <<"-ERR unknown command\r\n">>.
```

## Assignment Specification

Implement module `src/tcp_kv_backend.erl` exporting:
```erlang
-module(tcp_kv_backend).
-export([
    start_server/0,
    stop_server/1,
    parse_command/1,
    execute_command/2
]).
```

### Function Requirements:
1. **`parse_command(RawLineBin)`**:
   - `<<"PING">>` $\rightarrow$ `{ok, ping}`
   - `<<"SET ", Rest/binary>>` $\rightarrow$ splits on first space into Key and Value: `{ok, {set, Key, Value}}`
   - `<<"GET ", Key/binary>>` $\rightarrow$ `{ok, {get, Key}}`
   - `<<"DEL ", Key/binary>>` $\rightarrow$ `{ok, {del, Key}}`
   - Other $\rightarrow$ `{error, unknown_command}`
2. **`execute_command(Command, EtsTable)`**:
   - Executes the command against `EtsTable` and returns the wire protocol binary:
     - `ping` or `{ok, ping}` $\rightarrow$ `<<"+PONG\r\n">>`
     - `{set, Key, Value}` or `{ok, {set, Key, Value}}` $\rightarrow$ `<<"+OK\r\n">>`
     - `{get, Key}` or `{ok, {get, Key}}` $\rightarrow$ `<<"$", Value/binary, "\r\n">>` or `<<"$-1\r\n">>`
     - `{del, Key}` or `{ok, {del, Key}}` $\rightarrow$ `<<":1\r\n">>` (if deleted) or `<<":0\r\n">>` (if absent)
     - `{error, unknown_command}` or unrecognized term $\rightarrow$ `<<"-ERR unknown command\r\n">>`
3. **`start_server/0`**:
   - Initializes named public table `tcp_kv_table` with `[set, public, named_table, {read_concurrency, true}, {write_concurrency, true}]`.
   - Binds ephemeral port `0` via `gen_tcp:listen(0, [binary, {packet, raw}, {active, false}, {reuseaddr, true}])`.
   - Obtains assigned OS port via `inet:port/1`.
   - Spawns an acceptor process that accepts connections, spawns connection workers, calls `gen_tcp:controlling_process/2`, and arms `{active, once}`.
   - Connection workers maintain a stream buffer, execute commands, reply via `gen_tcp:send/2`, and re-arm `{active, once}`!
   - Returns `{ok, ServerPid, Port}`.
4. **`stop_server(ServerPid)`**:
   - Closes the server and deletes `tcp_kv_table`. Returns `ok`.

## Rules & Verification Constraints
- Tested against live TCP client sockets with fragmented and coalesced packet bursts!
- AST verifier checks: `inet:setopts/2`, `gen_tcp:send/2`, `ets:insert/2`, and `ets:lookup/2`.
    
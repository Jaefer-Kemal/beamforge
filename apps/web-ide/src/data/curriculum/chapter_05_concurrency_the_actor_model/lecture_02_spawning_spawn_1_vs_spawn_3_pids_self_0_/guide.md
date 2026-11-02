## Why This Matters in Production

In microservice architectures and high-throughput network backends, services must communicate continuously without causing cascading stalls. In traditional languages, when Thread A invokes an RPC or sends data over an in-memory queue to Thread B, Thread A often blocks synchronously, idling its CPU core until Thread B completes. If Thread B slows down under load, Thread A's connection pool saturates, triggering cascading timeouts across the entire platform.

In Erlang, process communication is **strictly asynchronous** using the send operator: **`Pid ! Message`**. The sender **never blocks** and **never waits** for the recipient to read the message. The BEAM runtime copies `Message` into the recipient's private heap, appends a pointer into the recipient's mailbox, and immediately returns control to the sender in under **0.1 microseconds**!

## Deep Concept Breakdown & Under the Hood

### 1. How Message Passing Works Under the Hood
When Process A evaluates `Pid ! Message`:
1. The BEAM locates the memory descriptor for `Pid`.
2. The runtime performs an off-heap allocation or directly allocates space on `Pid`'s private heap and **deep-copies** `Message` terms into `Pid`'s memory space (unless it is a reference-counted binary > 64 bytes, where only a reference pointer is copied, as taught in Chapter 4).
3. The runtime appends a message envelope pointer to the tail of `Pid`'s mailbox queue.
4. If `Pid` is suspended waiting in a `receive` block, the scheduler marks `Pid` as runnable and enqueues it on its core's run queue.
5. The expression `Pid ! Message` evaluates to `Message` itself! This allows chaining: `P1 ! P2 ! {broadcast, Alert}`.

### 2. Identifying Callers with `self/0`
An actor has no built-in way of knowing who sent a message. Unlike TCP sockets with source IP headers, raw messages do not carry implicit return addresses. If a caller expects a response, it **must explicitly include its own PID** (`self()`) inside a tagged tuple:
```erlang
%% Caller sends request with self():
WorkerPid ! {ping, self(), <<"heartbeat">>}.

%% Worker pattern-matches CallerPid and replies:
receive
    {ping, CallerPid, Payload} ->
        CallerPid ! {pong, self(), Payload}
end.
```

### 3. Crucial Architectural Distinction: `spawn/1` vs. `spawn/3`
Erlang provides two ways to spawn processes:
- **`spawn(Fun)`**: Spawns an anonymous closure (`fun() -> ... end`). The closure is tightly bound to the current module version loaded in memory.
- **`spawn(Module, Function, Args)` (MFA Spawn)**: Uses module, function atom, and arguments list (`spawn(?MODULE, responder_loop, [])`).

> [!warning] Production Concurrency Trap: Closure Spawns Break Hot Code Reloading
> If you spawn a long-running process using `spawn(fun() -> loop() end)`, that process remains permanently tied to the exact bytecode version active when it was created. When you deploy a new version of the code at runtime, Erlang retains up to two versions of a module ("current" and "old"). If a third version is loaded while the closure process is still running, the runtime terminates the process!
> 
> In contrast, processes spawned via `spawn(?MODULE, loop, [])` that make fully qualified tail calls (`?MODULE:loop()`) seamlessly transition to the newest compiled bytecode without dropping existing state!

## Parallel Worked Example

Consider a distributed notification dispatcher:

```erlang
-module(notification_hub).
-export([start/0, send_alert/2, broadcast_alert/2, loop/0]).

%% Spawns the dispatcher actor using MFA spawn for hot-code upgrade compatibility
start() ->
    spawn(?MODULE, loop, []).

%% Client API: sends an alert and waits for confirmation
send_alert(HubPid, AlertText) ->
    HubPid ! {alert, self(), AlertText},
    receive
        {ack, HubPid, AlertText} ->
            {ok, AlertText}
    after 1000 ->
        {error, timeout}
    end.

%% Client API: broadcasts message to a list of subscriber PIDs
broadcast_alert(Subscribers, AlertText) ->
    [Pid ! {broadcast, AlertText} || Pid <- Subscribers],
    {sent, length(Subscribers)}.

%% Internal actor loop: executes inside the spawned process
loop() ->
    receive
        {alert, CallerPid, Text} ->
            CallerPid ! {ack, self(), Text},
            loop();
        stop ->
            ok
    end.
```

## Official Erlang Docs & Function Reference

```erlang
%% Official OTP Signatures (erts / erlang)
spawn(Fun) -> pid()
spawn(Module, Function, Args) -> pid()
  Types:
    Module = atom()
    Function = atom()
    Args = [term()]

self() -> pid()
Dest ! Message -> Message
```

## Assignment Specification

Implement `src/ping_actor.erl` exporting `start_responder/0`, `ping/2`, `broadcast/2`, and `responder_loop/0`:

1. `start_responder() -> pid()`:
   - Spawns `responder_loop/0` (or `spawn(?MODULE, responder_loop, [])`) and returns the newly spawned actor's PID.
2. `responder_loop() -> ok`:
   - Enters a tail-recursive `receive` loop.
   - When receiving `{ping, CallerPid, Payload}`: sends `CallerPid ! {pong, self(), Payload}` and recurses to `responder_loop()`.
   - When receiving `stop`: exits cleanly and returns `ok`.
3. `ping(ResponderPid, Payload) -> {ok, Payload} | {error, timeout}`:
   - Sends `{ping, self(), Payload}` to `ResponderPid`.
   - Waits up to 1,000ms in a `receive ... after 1000` block for `{pong, ResponderPid, Payload}`.
   - Returns `{ok, Payload}` on match, or `{error, timeout}` if no response arrives within 1,000ms.
4. `broadcast(PidsList, Msg) -> {sent, integer()}`:
   - Asynchronously sends `Msg` to every PID in `PidsList` using a list comprehension or `lists:foreach/2`.
   - Returns `{sent, Count}` where `Count` is the length of `PidsList`.

## Rules & Verification Constraints

- Must invoke `erlang:self/0` to include the caller's PID in request tuples.
- The `responder_loop/0` function must be strictly tail-recursive.
- All message transmissions must use the asynchronous `!` operator.
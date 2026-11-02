## Why This Matters in Production

In systems design, choosing the wrong process primitive causes severe architectural defects:
- Linking when you should have monitored causes **unintended death cascades**, where a non-critical worker crash takes down the entire application.
- Monitoring when you should have linked causes **zombie leaks**, where background workers continue running forever after their parent connection disconnects.

Every backend architect must master the **Architectural Decision Matrix**:
1. **Tightly-Coupled Symmetric Peers (e.g. TCP Socket Reader + TLS Codec):** Use **`link`**. Neither process has any purpose if the other crashes. They must live and die together.
2. **Supervision Trees (Supervisor to Worker):** Use **`link` + `process_flag(trap_exit, true)`**. The supervisor owns the lifecycle of the worker.
3. **Client-to-Server Requests (Calling an Actor):** Use **`monitor`**. The client wants to know if the server crashes mid-request, but the client must NOT die if the server fails!
4. **Independent Watchers / Metrics Monitors:** Use **`monitor`**. An observer should never risk termination because the monitored target crashed.

## Deep Concept Breakdown & Under the Hood

### How OTP's `gen:do_call/4` Uses Monitors for 0ms Crash Detection
In Chapter 5, our custom actor synchronous calls looked like:
```erlang
%% NAIVE CHAPTER 5 CALL:
Ref = make_ref(),
ServerPid ! {call, self(), Ref, Req},
receive
    {reply, Ref, Res} -> Res
after 5000 ->
    {error, timeout}
end.
```
If `ServerPid` crashes 1 microsecond after receiving the request, the client sits frozen in `after 5000` waiting five full seconds!

By attaching a temporary monitor:
```erlang
%% OTP PATTERN (gen.erl):
MRef = erlang:monitor(process, ServerPid),
ServerPid ! {'$gen_call', {self(), MRef}, Req},
receive
    {MRef, Reply} ->
        erlang:demonitor(MRef, [flush]),
        Reply;
    {'DOWN', MRef, process, ServerPid, Reason} ->
        {error, {server_crashed, Reason}}
after Timeout ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
end.
```
If the server crashes mid-call, the BEAM VM delivers the `'DOWN'` message with **0ms latency**! The client recovers instantly without wasting five seconds.

## Assignment Specification

Implement `src/my_gen_server.erl` exporting `start/2`, `call/3`, `cast/2`, `stop/1`, `choose_primitive/1`, and `loop/2`:

1. `choose_primitive(Scenario)`:
   - `tightly_coupled_peers` -> `use_link`
   - `supervisor_to_worker` -> `use_link_with_trap_exit`
   - `client_to_server_request` -> `use_monitor`
   - `independent_watcher` -> `use_monitor`
2. `start(CallbackMod, InitArg) -> {ok, Pid}`:
   - Spawns server executing `CallbackMod:init(InitArg) -> {ok, InitialState}` and enters `loop(CallbackMod, InitialState)`.
3. `call(ServerPid, Request, Timeout) -> Reply | {error, {server_crashed, Reason}} | {error, timeout}`:
   - Implements monitor-based synchronous request protocol with 0ms crash detection.
4. `cast(ServerPid, Request) -> ok`:
   - Asynchronously sends `{'$gen_cast', Request}`.
5. `stop(ServerPid) -> ok`:
   - Synchronously asks the server to stop with `call(ServerPid, stop, 1000)`.
6. `loop(CallbackMod, State)`:
   - Handles `{'$gen_call', {From, MRef}, stop}` -> replies `From ! {MRef, ok}` and exits with `normal`.
   - Handles `{'$gen_call', {From, MRef}, Request}` -> calls `CallbackMod:handle_call(Request, From, State) -> {reply, Reply, NewState}`, replies `From ! {MRef, Reply}`, recurses.
   - Handles `{'$gen_cast', Request}` -> calls `CallbackMod:handle_cast(Request, State) -> {noreply, NewState}`, recurses.

## Rules & Verification Constraints

- Must export all specified functions.
- Enforced AST rules: `requiredCalls: ["erlang:monitor/2", "erlang:demonitor/2"]`, `requiredConstructs: ["receive_after"]`.

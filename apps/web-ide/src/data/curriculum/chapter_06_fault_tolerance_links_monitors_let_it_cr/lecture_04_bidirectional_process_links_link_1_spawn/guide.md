## Why This Matters in Production

In long-running backend services, a single client request often spawns several auxiliary processes: a database stream reader, an image thumbnail resizer, and an encryption codec. In systems without built-in process relationships (like C++ or Node.js), if the main request worker crashes or the client disconnects, those auxiliary tasks continue running as **zombie processes**—silently consuming CPU, holding open file descriptors, and leaking socket connections until the server runs out of memory.

Erlang solves this fundamentally through **Process Links**. A link is a **bidirectional relationship** between two BEAM processes: if either process crashes, the BEAM VM automatically sends an **exit signal** to the other process, terminating it immediately!

## Deep Concept Breakdown & Under the Hood

### 1. Bidirectional Fate-Sharing
A link is symmetric: it does not matter whether Process A calls `link(PidB)` or Process B calls `link(PidA)`. If either process terminates, an exit signal travels across the link to the peer.

### 2. Atomic `spawn_link/1,3` vs. Microsecond Race Conditions
Never write:
```erlang
%% DANGEROUS CODE (RACE CONDITION):
Pid = spawn(fun() -> worker_loop() end),
link(Pid).
```
If the newly spawned process crashes in the microsecond between `spawn` and `link`, the parent process never links to it. The exit signal is lost, and the crash goes unnoticed!
Always use the atomic BIF:
```erlang
Pid = spawn_link(fun() -> worker_loop() end).
```

### 3. Critical Contrast: `exit(normal)` vs. Abnormal Exit Signals
Every exit signal carries an **exit reason**. The behavior of linked peers depends on this reason:
- **Normal Exit (`exit(normal)`):** When a worker finishes its assigned computation and finishes its top-level function (or evaluates `exit(normal)`), the exit signal carries the reason `normal`. A standard linked process (one that is not trapping exits) **completely ignores `normal` exit signals**! It remains alive and healthy.
- **Abnormal Exit (`exit(Reason)` or runtime bug):** When a worker crashes with `badarith`, `badarg`, or calls `exit(abnormal_fault)`, the abnormal exit signal **terminates the linked peer immediately**!

> [!warning] Fault-Tolerance Trap: Linking to Ephemeral Workers
> If a long-running service process links to short-lived background worker processes using `spawn_link/1`, any abnormal crash in a worker will instantly kill the main service process! In Lesson 6.6, you will learn how to use unidirectional **Monitors** when you want to observe worker termination without sharing its fate.

## Parallel Worked Example

Consider a two-stage data pipeline linking an extractor to a compressor:

```erlang
-module(pipeline_pair).
-export([start/0, stop_normal/1, crash_abnormal/2, loop1/1, loop2/0]).

start() ->
    P2 = spawn(fun() -> loop2() end),
    P1 = spawn_link(fun() -> link(P2), loop1(P2) end),
    {ok, P1, P2}.

stop_normal(P1) ->
    P1 ! stop_normal,
    ok.

crash_abnormal(P1, Reason) ->
    P1 ! {crash, Reason},
    ok.

loop1(P2) ->
    receive
        stop_normal ->
            exit(normal); %% P2 ignores normal exit!
        {crash, Reason} ->
            exit(Reason)  %% P2 dies with Reason!
    end.

loop2() ->
    receive
        _Any -> loop2()
    end.
```

## Official Erlang Docs & Function Reference

```erlang
%% BIFs: erlang (erts)
link(PidOrPort) -> true
spawn_link(Fun) -> pid()
spawn_link(Module, Function, Args) -> pid()
```

## Assignment Specification

Implement `src/linked_pipeline.erl` exporting `start_linked_pipeline/0`, `compute/2`, `stop_stage1_normal/1`, `crash_stage1/2`, `worker1_loop/1`, and `worker2_loop/0`:

1. `start_linked_pipeline() -> {ok, Worker1Pid, Worker2Pid}`:
   - Spawns `Worker2 = spawn(fun() -> worker2_loop() end)`.
   - Spawns and links `Worker1 = spawn_link(fun() -> link(Worker2), worker1_loop(Worker2) end)`.
   - Returns `{ok, Worker1, Worker2}`.
2. `compute(Worker1Pid, Number) -> {ok, Result} | {error, timeout}`:
   - Sends `{transform, self(), Ref, Number}` to `Worker1Pid`.
   - `Worker1` multiplies `Number * 2` and forwards `{transform_stage2, Caller, Ref, Doubled}` to `Worker2`.
   - `Worker2` squares `Doubled * Doubled` and replies `Caller ! {Ref, Squared}`.
3. `stop_stage1_normal(Worker1Pid) -> ok`:
   - Sends `{stop_normal, self(), Ref}` to `Worker1Pid`.
   - `Worker1` replies `From ! {Ref, ok}` and exits with `exit(normal)`.
   - `Worker2` stays alive because `normal` exit signals are ignored!
4. `crash_stage1(Worker1Pid, Reason) -> ok`:
   - Sends `{crash, Reason}` to `Worker1Pid`.
   - `Worker1` calls `exit(Reason)`.
   - The abnormal exit signal propagates across the link, terminating `Worker2`!

## Rules & Verification Constraints

- Must export all specified functions.
- Enforced AST rules: `requiredCalls: ["erlang:spawn_link/1", "erlang:link/1"]`.

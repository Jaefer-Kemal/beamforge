## Why This Matters in Production

While **Links** are ideal for supervisors and tightly bound worker clusters that must share fate, links are dangerous for **client-to-server interactions**.

Imagine an HTTP checkout handler calling a background pricing engine:
- If the checkout handler *links* to the pricing worker, and the pricing worker crashes with an out-of-memory error, the exit signal propagates across the link and **kills the checkout handler**!
- Even worse, using links requires setting `process_flag(trap_exit, true)`, which converts *all* exit signals across the process into mailbox messages—polluting clean request logic.

To solve this, Erlang provides **Monitors**. A monitor is **strictly unidirectional**: Process A watches Process B.
- If Process B crashes, Process A receives a **`'DOWN'`** message in its mailbox.
- Process A does **not** die.
- If Process A crashes, Process B is completely unaffected.

## Deep Concept Breakdown & Under the Hood

### 1. Monitoring Primitives
```erlang
%% Single BIF call:
{WorkerPid, MRef} = spawn_monitor(fun() -> do_work() end).
```
When the monitored process terminates, the BEAM posts a 5-element tuple into the monitor owner's mailbox:
```erlang
{'DOWN', MRef, process, WorkerPid, ExitReason}
```

### 2. The `noproc` Dead-PID Invariant
What happens if you call `MRef = erlang:monitor(process, TargetPid)` on a process that **already died 10 milliseconds ago**?
In traditional languages, this would cause a race condition or exception.
In the BEAM:
- `erlang:monitor/2` **never crashes**.
- If `TargetPid` does not exist, the runtime immediately synthesizes:
  ```erlang
  {'DOWN', MRef, process, TargetPid, noproc}
  ```
  and places it into your mailbox!
- This guarantees there are **zero check-then-monitor race conditions**. You never need to call `is_process_alive(Pid)` before monitoring!

## Parallel Worked Example

The following module executes an asynchronous task with a monitor-backed timeout:

```erlang
-module(async_task_watcher).
-export([run_task/2]).

run_task(Fun, TimeoutMs) ->
    Caller = self(),
    {Pid, MRef} = spawn_monitor(fun() ->
        Res = Fun(),
        Caller ! {res, MRef, Res}
    end),
    receive
        {res, MRef, Res} ->
            erlang:demonitor(MRef, [flush]),
            {ok, Res};
        {'DOWN', MRef, process, Pid, Reason} ->
            {error, {crashed, Reason}}
    after TimeoutMs ->
        exit(Pid, kill),
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.
```

## Assignment Specification

Implement `src/worker_watcher.erl` exporting `run_monitored_task/2` and `probe_pid_status/1`:

1. `run_monitored_task(TaskFun, TimeoutMs) -> {ok, Result} | {error, {crashed, Reason}} | {error, timeout}`:
   - Uses `spawn_monitor/1` to run `TaskFun`.
   - On completion -> `demonitor(MRef, [flush])`, returns `{ok, Result}`.
   - On worker crash -> receives `{'DOWN', MRef, process, WorkerPid, Reason}`, returns `{error, {crashed, Reason}}`.
   - On timeout -> kills worker via `exit(WorkerPid, kill)`, flushes monitor, returns `{error, timeout}`.
2. `probe_pid_status(TargetPid) -> alive | {dead, Reason}`:
   - Monitors `TargetPid` via `MRef = erlang:monitor(process, TargetPid)`.
   - Uses non-blocking check:
     ```erlang
     receive
         {'DOWN', MRef, process, TargetPid, Reason} -> {dead, Reason}
     after 20 ->
         erlang:demonitor(MRef, [flush]),
         alive
     end
     ```
   - If `TargetPid` is already dead, returns `{dead, noproc}` immediately.

## Rules & Verification Constraints

- Must export `run_monitored_task/2` and `probe_pid_status/1`.
- Enforced AST rules: `requiredCalls: ["erlang:spawn_monitor/1", "erlang:monitor/2", "erlang:demonitor/2"]`.

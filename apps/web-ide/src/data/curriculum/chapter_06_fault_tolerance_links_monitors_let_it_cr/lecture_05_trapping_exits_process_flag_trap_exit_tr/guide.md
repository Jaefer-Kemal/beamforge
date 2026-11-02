## Why This Matters in Production

If bidirectional links kill both processes whenever one crashes, how can Erlang systems ever survive failures? How do supervisors stay alive to restart crashed database pools, web servers, and payment gateways?

The answer is **Trapping Exits**. By default, incoming exit signals kill the receiving process. But when a process sets the system flag:

```erlang
process_flag(trap_exit, true)
```

the BEAM VM fundamentally changes how exit signals are handled: **the incoming exit signal is converted into a regular Erlang message tuple and placed directly into the process's mailbox!**

```erlang
{'EXIT', DeadPid, Reason}
```

This single primitive is the mechanical foundation of the entire **OTP Supervision Tree**.

## Deep Concept Breakdown & Under the Hood

### The Complete Exit Signal Truth Table
Every backend engineer on the BEAM must know this truth table by heart:

| Exit Signal Sent (`exit(Target, Reason)`) | Target Has `trap_exit = false` (Default) | Target Has `trap_exit = true` (Supervisor) |
| :--- | :--- | :--- |
| **`exit(Target, normal)`** | Ignored; Target continues running. | Receives `{'EXIT', Sender, normal}` in mailbox. |
| **`exit(Target, Reason)`** (Abnormal) | Target dies immediately with `Reason`. | Receives `{'EXIT', Sender, Reason}` in mailbox. |
| **`exit(Target, kill)`** (**Untrappable!**) | Target dies immediately with `killed`. | **Target dies unconditionally!** (Linked peers receive `{'EXIT', Target, killed}`). |

### Why Untrappable `kill` is Rewritten to `killed`
When you send `exit(Pid, kill)`:
1. The target process **cannot trap it**, even if `trap_exit` is `true`. It is terminated immediately.
2. The BEAM runtime then notifies the target's linked peers with reason **`killed`** (not `kill`).
3. This is a brilliant design: if the reason remained `kill`, the supervisor watching the runaway worker would be killed too! By rewriting it to `killed`, the supervisor can trap the exit message and cleanly restart a replacement worker.

## Parallel Worked Example

The following module implements a self-healing worker restarter:

```erlang
-module(worker_guardian).
-export([start/1, loop/2]).

start(WorkerFun) ->
    spawn(fun() ->
        process_flag(trap_exit, true),
        WorkerPid = spawn_link(WorkerFun),
        loop(WorkerFun, WorkerPid)
    end).

loop(WorkerFun, CurrentWorker) ->
    receive
        {'EXIT', CurrentWorker, normal} ->
            ok; %% Worker finished cleanly
        {'EXIT', CurrentWorker, Abnormal} ->
            %% Resurrect fresh worker!
            NewWorker = spawn_link(WorkerFun),
            loop(WorkerFun, NewWorker)
    end.
```

## Assignment Specification

Implement `src/exit_trapper.erl` exporting `start_supervised/1`, `get_worker_pid/1`, `kill_worker/2`, `simulate_exit_truth_table/2`, and `supervisor_loop/2`:

1. `start_supervised(WorkerFun) -> {ok, SupPid, InitialWorkerPid}`:
   - Spawns supervisor running `supervisor_loop(WorkerFun, WorkerPid)`.
   - Supervisor sets `process_flag(trap_exit, true)` and spawns linked initial worker: `WorkerPid = spawn_link(WorkerFun)`.
2. `get_worker_pid(SupPid) -> {ok, CurrentWorkerPid}`: Queries active worker.
3. `kill_worker(SupPid, Reason) -> ok`: Sends `{kill_worker, Reason}` to supervisor, which evaluates `exit(WorkerPid, Reason)`.
4. `supervisor_loop(WorkerFun, CurrentWorker)`:
   - `{get_worker, From, Ref}` -> replies `From ! {Ref, CurrentWorker}`.
   - `{kill_worker, Reason}` -> calls `exit(CurrentWorker, Reason)`, continues supervising.
   - `{'EXIT', CurrentWorker, normal}` -> exits cleanly with `ok`.
   - `{'EXIT', CurrentWorker, _AbnormalReason}` -> spawns replacement `NewWorker = spawn_link(WorkerFun)` and continues!
   - `stop` -> stops cleanly.
5. `simulate_exit_truth_table(TrappingBool, SignalReason) -> {died, Reason} | {survived, MailboxMsg | none}`:
   - Spawns probe process with `process_flag(trap_exit, TrappingBool)`.
   - Sends `exit(Probe, SignalReason)`.
   - Returns whether probe died or survived with mailbox message.

## Rules & Verification Constraints

- Must export all specified functions.
- Enforced AST rules: `requiredCalls: ["erlang:process_flag/2", "erlang:spawn_link/1"]`.

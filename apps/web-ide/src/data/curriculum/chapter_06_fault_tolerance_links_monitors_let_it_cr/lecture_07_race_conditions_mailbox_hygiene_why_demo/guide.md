## Why This Matters in Production

In high-throughput microservices handling millions of requests per hour, subtle resource leaks can take days to manifest. One of the most infamous leaks in Erlang systems is the **Lingering `'DOWN'` Message Leak**.

Consider a client sending a synchronous request to an ephemeral worker process:
1. The client monitors the worker: `MRef = erlang:monitor(process, WorkerPid)`.
2. The worker computes the answer, sends the reply `{done, self(), 42}` to the client, and immediately calls `exit(normal)`.
3. Because message passing and process exit happen within microseconds, **both the reply AND the `'DOWN'` message arrive in the client's mailbox simultaneously**!
4. The client's `receive` block matches `{done, WorkerPid, 42}` and finishes the function call.
5. The client calls plain `erlang:demonitor(MRef)` (without options).
6. **THE BUG:** Plain `demonitor(MRef)` tells ERTS not to deliver *future* messages for `MRef`. **It does NOT remove the `'DOWN'` message that is ALREADY sitting in the client's mailbox!**
7. Over 500,000 requests, 500,000 stale `'DOWN'` tuples accumulate in the client's Save Queue, consuming gigabytes of memory and degrading mailbox scan latency!

## Deep Concept Breakdown & Under the Hood

### The Solution: `erlang:demonitor(MRef, [flush])`
To eliminate this race condition, Erlang added the **`[flush]`** option:

```erlang
erlang:demonitor(MRef, [flush])
```

When `[flush]` is passed, the BEAM runtime in C performs an atomic operation:
1. It unregisters the monitor.
2. It immediately checks the calling process's mailbox and Save Queue.
3. If an existing `{'DOWN', MRef, ...}` message is present, it **purges it from memory immediately**.
4. The caller's mailbox is guaranteed to be 100% clean!

> [!warning] Fault-Tolerance Trap: Forgetting [flush] on Synchronous Helpers
> Whenever you write a synchronous helper using temporary monitors (`MRef = monitor(process, Pid)`), you **must always call `erlang:demonitor(MRef, [flush])`** once the reply has been processed. Omitting `[flush]` is a classic production defect.

## Parallel Worked Example

The following module executes a worker and measures mailbox contamination:

```erlang
-module(ephemeral_tester).
-export([call_worker/2, count_stale_downs/0]).

call_worker(Fun, Arg) ->
    Caller = self(),
    {Pid, MRef} = spawn_monitor(fun() ->
        Caller ! {reply, self(), Fun(Arg)},
        exit(normal)
    end),
    receive
        {reply, Pid, Res} ->
            %% Flush ensures the simultaneous 'DOWN' is purged!
            erlang:demonitor(MRef, [flush]),
            {ok, Res}
    after 1000 ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

count_stale_downs() ->
    drain_downs(0).

drain_downs(Count) ->
    receive
        {'DOWN', _, process, _, _} ->
            drain_downs(Count + 1)
    after 0 ->
        Count
    end.
```

## Assignment Specification

Implement `src/monitor_hygiene.erl` exporting `call_with_clean_mailbox/2` and `count_lingering_downs/0`:

1. `call_with_clean_mailbox(WorkerFun, Input)`:
   - Spawns and monitors an ephemeral worker: `{WorkerPid, MRef} = spawn_monitor(...)`.
   - The worker evaluates `WorkerFun(Input)`, sends `{done, self(), Result}` to the caller, and immediately terminates with `exit(worker_completed)`.
   - The caller pauses for 5ms (`timer:sleep(5)`) so both `{done, ...}` and `{'DOWN', ...}` are sitting in the mailbox.
   - The caller consumes `{done, WorkerPid, Result}`, calls `erlang:demonitor(MRef, [flush])`, and counts any remaining `'DOWN'` messages using `count_lingering_downs()`.
   - Returns `{ok, Result, LingeringCount}` (where `LingeringCount` must equal `0`).
2. `count_lingering_downs()`:
   - Non-blockingly drains and counts all `{'DOWN', _, process, _, _}` messages currently in `self()`'s mailbox using `after 0`.

## Rules & Verification Constraints

- Must call `erlang:demonitor(MRef, [flush])`.
- Enforced AST rule: `requiredCalls: ["erlang:demonitor/2"]`.

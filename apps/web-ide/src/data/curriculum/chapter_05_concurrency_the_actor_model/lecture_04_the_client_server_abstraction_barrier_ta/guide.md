## Why This Matters in Production

In functional programming, all variables and data structures are strictly **immutable**. There are no mutable objects, no `this.state = newState`, and no global pointers. How, then, can an Erlang backend manage a stateful shopping cart, maintain thousands of concurrent TCP user sessions, or track an e-commerce inventory count?

The answer is **Tail-Recursive Process State Loops**. A long-running process maintains mutable-like state across time by passing the updated state term as the argument to its recursive loop function. Because of **Tail-Call Optimization (TCO)**, the BEAM runtime reuses the exact same stack frame ($O(1)$ memory growth). Meanwhile, superseded state terms become unreferenced and are collected by the process's private garbage collector.

## Deep Concept Breakdown & Under the Hood

### 1. How Immutable Processes Hold State
Consider an actor with an integer state:
```erlang
loop(Count) ->
    receive
        {increment, Delta} ->
            loop(Count + Delta);
        {get, Caller} ->
            Caller ! {value, Count},
            loop(Count);
        stop ->
            ok
    end.
```
1. When started with `loop(0)`, the process's stack frame contains `Count = 0`.
2. When an `{increment, 5}` message arrives, the process computes `0 + 5 = 5` and evaluates `loop(5)`.
3. Because `loop/1` is in the **tail position** (the final expression of the clause), the BEAM executes the `call_last` opcode: it overwrites the current stack frame with `Count = 5` without pushing a new frame!
4. The actor can run for years, handling billions of state transitions, while consuming a constant **~2.5 KB** of stack memory!

### 2. The Client-Server Abstraction Barrier
A critical software engineering discipline in Erlang is separating **Client API Functions** from **Internal Server Callbacks**:
- **The Anti-Pattern (Leaky Abstraction):** Forcing callers outside the module to manually write `Pid ! {increment, 5}` and `Pid ! {get, self()}`. If the internal tuple protocol ever changes, every single file in the codebase breaks!
- **The Erlang Pattern (Clean Abstraction Barrier):** Encapsulating both roles inside a single module:
  - **Client API Functions (`increment/2`, `get_value/1`):** Execute inside the **caller's process** (`self()` is the caller!).
  - **Server Loop (`loop/1`):** Executes inside the **spawned actor process** (`self()` is the actor!).

### 3. Step-by-Step Message & Execution Flow
1. **Asynchronous Cast (`counter_actor:increment(Pid, 5)`):**
   - The caller evaluates `Pid ! {increment, 5}` and returns `ok` immediately without blocking.
   - The message arrives at the tail of `Pid`'s private mailbox.
   - The actor process awakens, matches `{increment, Delta}`, computes `NextVal = CurrentVal + 5`, and tail-calls `loop(NextVal)`.
2. **Synchronous Call (`counter_actor:get_value(Pid)`):**
   - The caller evaluates `Pid ! {get, self()}` and awaits a reply in a selective `receive` with a 1,000ms timeout guard.
   - The actor process matches `{get, Caller}`, replies `Caller ! {value, CurrentVal}`, and tail-calls `loop(CurrentVal)`.
   - The caller receives `{value, V}` and returns `{ok, V}`.

> [!warning] Production Concurrency Trap: Forgetting Tail Position Breaks O(1) Memory
> If you write `io:format("Done~n"), loop(NextState)` inside a clause, `loop/1` is STILL in tail position because `io:format` executes first. But if you write `loop(NextState) + 1`, the recursive call is NO LONGER in tail position! The BEAM must allocate a new stack frame for every single message, causing a memory exhaustion crash after a few thousand messages.

## Parallel Worked Example

The following module implements a stateful bank vault actor maintaining a balance:

```erlang
-module(vault_actor).
-export([start/1, deposit/2, get_balance/1, close/1, loop/1]).

%% ── Client API (Executes in Caller Process) ───────────────────────────────────
start(InitialBalance) ->
    spawn(fun() -> loop(InitialBalance) end).

deposit(Pid, Amount) when Amount > 0 ->
    Pid ! {deposit, Amount},
    ok.

get_balance(Pid) ->
    Pid ! {get_balance, self()},
    receive
        {balance, Balance} ->
            {ok, Balance}
    after 1000 ->
        {error, timeout}
    end.

close(Pid) ->
    Pid ! close,
    ok.

%% ── Server Loop (Executes in Actor Process) ───────────────────────────────────
loop(Balance) ->
    receive
        {deposit, Amount} ->
            loop(Balance + Amount);
        {get_balance, Caller} ->
            Caller ! {balance, Balance},
            loop(Balance);
        close ->
            ok
    end.
```

## Official Erlang Docs & Function Reference

```erlang
%% Official OTP Concept (stdlib / gen_server precursor)
%% State loop tail-call invariant:
loop(State) ->
    receive
        Msg ->
            NewState = handle_msg(Msg, State),
            loop(NewState)
    end.
```

## Assignment Specification

Implement `src/counter_actor.erl` exporting `start/1`, `increment/2`, `decrement/2`, `get_value/1`, `stop/1`, and `loop/1`:

1. `start(InitialValue) -> pid()`:
   - Spawns `loop(InitialValue)` and returns the newly spawned actor's PID.
2. `increment(Pid, Delta) -> ok`:
   - Asynchronously sends `{increment, Delta}` to `Pid` and returns `ok` immediately without waiting for a reply.
3. `decrement(Pid, Delta) -> ok`:
   - Asynchronously sends `{decrement, Delta}` to `Pid` and returns `ok` immediately.
4. `get_value(Pid) -> {ok, integer()} | {error, timeout}`:
   - Sends `{get, self()}` to `Pid`.
   - Selectively waits up to 1,000ms for `{value, Val}`, returning `{ok, Val}` or `{error, timeout}`.
5. `stop(Pid) -> ok`:
   - Asynchronously sends `stop` to `Pid` and returns `ok`.
6. `loop(CurrentVal) -> ok`:
   - Tail-recursive receive loop handling:
     - `{increment, Delta}` -> recurses to `loop(CurrentVal + Delta)`.
     - `{decrement, Delta}` -> recurses to `loop(CurrentVal - Delta)`.
     - `{get, Caller}` -> sends `Caller ! {value, CurrentVal}` and recurses to `loop(CurrentVal)`.
     - `stop` -> exits loop and returns `ok`.

## Rules & Verification Constraints

- The `loop/1` function must be strictly tail-recursive (enforced by AST rule `requireTailRecursion: ["loop/1"]`).
- Callers must not know internal tuple message formats; all operations must pass through exported client functions.
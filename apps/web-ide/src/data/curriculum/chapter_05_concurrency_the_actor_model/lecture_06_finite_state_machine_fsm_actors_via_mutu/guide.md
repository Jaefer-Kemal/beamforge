## Why This Matters in Production

In production network services and distributed protocol engines, an actor's valid operations change completely depending on its current mode:
- A TCP socket actor is initially in the `unauthenticated` state; once SASL authentication succeeds, it enters the `authenticated` state where stanzas are routed.
- A physical security vault or smart door is initially in the `locked` state; once the correct PIN is provided, it transitions to the `unlocked` state.

In traditional languages, developers attempt to model this with a single monolithic function stuffed with nested `switch` or `if (state == LOCKED)` branches. As features expand, this monolithic function degenerates into spaghetti code where invalid state transitions silently corrupt memory.

In Erlang, before adopting the OTP `gen_statem` behaviour (taught in Chapter 7), the idiomatic way to model a Finite State Machine (FSM) is **Mutual Tail Recursion**: writing **one dedicated function per state** (`locked/2` and `unlocked/1`) that transition states by directly tail-calling each other!

## Deep Concept Breakdown & Under the Hood

### 1. Modeling States as Distinct Functions
Instead of cramming all states into a single `loop(State)`, each state is its own function:
- `locked(SecretCode, FailedAttempts)`: Contains a `receive` block that only understands operations valid while locked.
- `unlocked(SecretCode)`: Contains a `receive` block that only understands operations valid while unlocked.

When a client enters the correct code:
```erlang
%% Inside locked/2:
receive
    {enter_code, From, Ref, SecretCode} ->
        From ! {reply, Ref, {ok, unlocked}},
        unlocked(SecretCode);  %% <-- State Transition via Tail Call!
    ...
end.
```

### 2. Tail-Call Optimization Across Different Functions
A common question from newcomers is: *"Does Tail-Call Optimization only work when a function recursively calls itself?"*
**No!** In the BEAM VM, tail-call optimization applies to **any function call in the tail position**, even if Function A calls Function B!
- When `locked/2` tail-calls `unlocked/1`, the compiler emits the `call_only` (or `call_last`) bytecode instruction.
- The BEAM deallocates `locked/2`'s stack arguments, writes `unlocked/1`'s argument into the register, and jumps directly to `unlocked/1`.
- **Zero additional stack frames are allocated!** An FSM actor can transition between `locked` and `unlocked` a billion times without consuming any extra memory!

### 3. Clear State-Specific Error Handling
Because each state has its own `receive` block, handling invalid actions is crystal clear:
- Attempting to unlock an already unlocked door doesn't crash; the `unlocked/1` function simply replies `{ok, already_unlocked}`.
- Attempting to lock an already locked door returns `ok` without resetting the failed attempts counter.
- Entering a wrong code in `locked/2` increments `FailedAttempts + 1` and remains in `locked/2`.

> [!warning] Production Concurrency Trap: State Leaks Across Transitions
> When transitioning from State A to State B, be deliberate about which state variables carry over. For example, when unlocking the door, the `FailedAttempts` counter is discarded; when locking the door again, it re-enters `locked(SecretCode, 0)` with a freshly zeroed counter.

## Parallel Worked Example

Consider a vending machine transitioning between `idle` and `paid`:

```erlang
-module(vending_fsm).
-export([start/0, insert_coin/2, select_item/1, refund/1, stop/1, idle/0, paid/1]).

start() ->
    spawn(fun() -> idle() end).

insert_coin(Pid, Amount) ->
    Ref = make_ref(),
    Pid ! {insert_coin, self(), Ref, Amount},
    receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end.

select_item(Pid) ->
    Ref = make_ref(),
    Pid ! {select_item, self(), Ref},
    receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end.

refund(Pid) ->
    Ref = make_ref(),
    Pid ! {refund, self(), Ref},
    receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end.

stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive {reply, Ref, ok} -> ok after 1000 -> {error, timeout} end.

%% State 1: IDLE
idle() ->
    receive
        {insert_coin, From, Ref, Amount} when Amount >= 25 ->
            From ! {reply, Ref, {ok, inserted}},
            paid(Amount);
        {insert_coin, From, Ref, _Small} ->
            From ! {reply, Ref, {error, coin_too_small}},
            idle();
        {select_item, From, Ref} ->
            From ! {reply, Ref, {error, insert_coin_first}},
            idle();
        {refund, From, Ref} ->
            From ! {reply, Ref, {ok, 0}},
            idle();
        {stop, Ref, From} ->
            From ! {reply, Ref, ok},
            ok
    end.

%% State 2: PAID (Mutually recursive transition from idle)
paid(Balance) ->
    receive
        {select_item, From, Ref} ->
            From ! {reply, Ref, {ok, item_dispensed}},
            idle();
        {refund, From, Ref} ->
            From ! {reply, Ref, {ok, Balance}},
            idle();
        {insert_coin, From, Ref, Extra} ->
            From ! {reply, Ref, {ok, Balance + Extra}},
            paid(Balance + Extra);
        {stop, Ref, From} ->
            From ! {reply, Ref, ok},
            ok
    end.
```

## Official Erlang Docs & Function Reference

```erlang
%% Official OTP Concept: Mutual Tail-Call State Machines
%% State A:
state_a(Arg) ->
    receive
        event_to_b -> state_b(NextArg);
        event_in_a -> state_a(UpdatedArg)
    end.

%% State B:
state_b(Arg) ->
    receive
        event_to_a -> state_a(NextArg);
        event_in_b -> state_b(UpdatedArg)
    end.
```

## Assignment Specification

Implement `src/door_lock_fsm.erl` exporting `start/1`, `enter_code/2`, `lock/1`, `get_state/1`, `stop/1`, `locked/2`, and `unlocked/1`:

1. `start(SecretCode) -> pid()`:
   - Spawns the actor starting in state `locked(SecretCode, 0)`.
2. `enter_code(Pid, AttemptCode) -> {ok, Status} | {error, Reason} | {error, timeout}`:
   - Generates `Ref = make_ref()`, sends `{enter_code, self(), Ref, AttemptCode}`, and waits for reply.
   - Behavior in `locked(SecretCode, FailedAttempts)`:
     - If `AttemptCode =:= SecretCode`: replies `{reply, Ref, {ok, unlocked}}` and transitions to `unlocked(SecretCode)`.
     - If `AttemptCode =/= SecretCode`: increments `Failed = FailedAttempts + 1`, replies `{reply, Ref, {error, {wrong_code, Failed}}}`, and remains in `locked(SecretCode, Failed)`.
   - Behavior in `unlocked(SecretCode)`:
     - Replies `{reply, Ref, {ok, already_unlocked}}` and remains in `unlocked(SecretCode)`.
3. `lock(Pid) -> ok | {error, timeout}`:
   - Generates `Ref = make_ref()`, sends `{lock, self(), Ref}`, and waits for reply.
   - When in `unlocked(SecretCode)`: replies `{reply, Ref, ok}` and transitions to `locked(SecretCode, 0)` (resetting failed attempts).
   - When already in `locked(SecretCode, FailedAttempts)`: replies `{reply, Ref, ok}` and remains in `locked(SecretCode, FailedAttempts)`.
4. `get_state(Pid) -> {locked, integer()} | unlocked | {error, timeout}`:
   - Generates `Ref = make_ref()`, sends `{get_state, self(), Ref}`, and returns `{locked, FailedAttempts}` or `unlocked`.
5. `stop(Pid) -> ok | {error, timeout}`:
   - Generates `Ref = make_ref()`, sends `{stop, self(), Ref}`, replies `{reply, Ref, ok}`, and terminates cleanly.

## Rules & Verification Constraints

- Both `locked/2` and `unlocked/1` must be tail-recursive (enforced by AST rule `requireTailRecursion: ["locked/2", "unlocked/1"]`).
- Must use `make_ref/0` for request-reply synchronization with 1,000ms timeouts.
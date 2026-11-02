## Why This Matters in Production

In banking engines, payment gateways, and order matching systems, **Data Consistency** is existential. Consider two concurrent withdrawal requests against an account with a $100 balance:
1. Request A checks the balance ($100 balance >= $80 requested) and approves an $80 withdrawal.
2. Simultaneously, Request B checks the balance ($100 balance >= $50 requested) and approves a $50 withdrawal.
3. Both deduct their amounts, leaving the final balance at -$30. This is the classic **Double-Spend Glitch**!

In traditional multithreaded backends (Java, C++, Go), engineers combat this by introducing row-level database locks, distributed Redis locks, or mutexes. However, locks introduce severe architectural hazards: **Deadlocks** (User 1 transfers to User 2 while User 2 transfers to User 1), lock convoying, and thread starvation under high concurrent traffic.

In the **Actor Model**, concurrency safety is solved mathematically without locks. A single `ledger_actor` process owns the bank accounts list. Because the actor's mailbox is **strictly sequential**, incoming deposits, withdrawals, and transfers are serialized one by one. The actor completes transaction $N$ and updates its state before it ever begins evaluating transaction $N+1$. Race conditions and deadlocks are **mathematically impossible**!

## Deep Concept Breakdown & Under the Hood

### 1. Atomic State Transitions in Memory
You will implement `ledger_actor`, maintaining account states in its tail-recursive loop:
```erlang
{account, AccountId :: integer(), OwnerName :: binary(), Balance :: integer()}
```
Because Erlang data structures are immutable, each transaction creates a new state list. If a transaction fails (e.g. `insufficient_funds` or `not_found`), the actor returns an error tuple and recurses with the **unmodified account list**, guaranteeing zero partial writes or balance corruption!

### 2. Multi-Account Atomic Transfers
A transfer between Account A and Account B must be completely atomic:
- If Account A lacks sufficient funds, Account B must NOT receive any money.
- If either account is missing, neither account's balance may change.
- In `ledger_actor`, this atomicity is trivial: the transaction is processed inside a single message clause, ensuring no other operation can interleave between deducting from Account A and adding to Account B!

### 3. Batch Processing with Dual Accumulators
The `process_batch/2` function receives a list of transactions, processing each item in sequence. It tracks both `AppliedCount` and `RejectedCount` using tail-recursive accumulators, applying valid transactions and skipping invalid ones without halting the batch.

> [!warning] Production Concurrency Trap: Forgetting Timeouts on Financial Calls
> Client calls querying financial ledger actors must always include a timeout. If a caller hangs waiting for a reply from an overloaded ledger, upstream payment gateways will timeout, leading to duplicate charges. Always use `make_ref/0` and `receive ... after 1000`.

## Parallel Worked Example

Consider a concurrent seat reservation actor for an airline flight:

```erlang
-module(flight_seat_actor).
-export([start/1, reserve_seat/3, get_available/1, loop/1]).

start(InitialSeats) ->
    spawn(fun() -> loop(InitialSeats) end).

reserve_seat(Pid, SeatNumber, PassengerName) ->
    Ref = make_ref(),
    Pid ! {reserve, self(), Ref, SeatNumber, PassengerName},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

get_available(Pid) ->
    Ref = make_ref(),
    Pid ! {get_available, self(), Ref},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

loop(SeatsMap) ->
    receive
        {reserve, From, Ref, SeatNo, Passenger} ->
            case maps:find(SeatNo, SeatsMap) of
                {ok, available} ->
                    NewSeats = maps:put(SeatNo, {reserved, Passenger}, SeatsMap),
                    From ! {reply, Ref, {ok, reserved}},
                    loop(NewSeats);
                {ok, {reserved, Other}} ->
                    From ! {reply, Ref, {error, {seat_taken, Other}}},
                    loop(SeatsMap);
                error ->
                    From ! {reply, Ref, {error, invalid_seat}},
                    loop(SeatsMap)
            end;
        {get_available, From, Ref} ->
            Available = [S || {S, available} <- maps:to_list(SeatsMap)],
            From ! {reply, Ref, {ok, Available}},
            loop(SeatsMap)
    end.
```

## Official Erlang Docs & Function Reference

```erlang
%% Official OTP Concept: In-Memory Ledger Pattern
-record(account, {id, owner, balance}).

%% Tail-recursive loop serialization:
loop(Accounts) ->
    receive
        {transaction, From, Ref, Tx} ->
            {Result, NewAccounts} = apply_tx(Tx, Accounts),
            From ! {reply, Ref, Result},
            loop(NewAccounts)
    end.
```

## Assignment Specification

Implement `src/ledger_actor.erl` exporting `start/1`, `get_balance/2`, `process_transaction/2`, `process_batch/2`, `stop/1`, and `loop/1`:

1. `start(InitialAccounts) -> pid()`:
   - Spawns `loop(InitialAccounts)` and returns the newly spawned actor's PID.
2. `get_balance(Pid, AccountId) -> {ok, integer()} | {error, not_found} | {error, timeout}`:
   - Uses `Ref = make_ref()`, sends `{get_balance, self(), Ref, AccountId}`, and waits up to 1,000ms for `{reply, Ref, Result}`.
3. `process_transaction(Pid, TxTuple) -> {ok, Result} | {error, Reason} | {error, timeout}`:
   - Uses `Ref = make_ref()`, sends `{transaction, self(), Ref, TxTuple}`, and waits up to 1,000ms for reply.
   - Supports three atomic transactions:
     - `{deposit, AccountId, Amount}` (`Amount > 0`): Increases balance, replies `{ok, NewBalance}`. Returns `{error, not_found}` if account does not exist.
     - `{withdraw, AccountId, Amount}` (`Amount > 0`):
       - If `Balance >= Amount`: deducts amount, replies `{ok, NewBalance}`.
       - If `Balance < Amount`: replies `{error, insufficient_funds}` and leaves balance unchanged.
       - If account missing: replies `{error, not_found}`.
     - `{transfer, FromId, ToId, Amount}` (`Amount > 0`):
       - Verifies **both** `FromId` and `ToId` exist. If either is missing, replies `{error, not_found}`.
       - If `FromBalance < Amount`: replies `{error, insufficient_funds}`.
       - If valid: atomically deducts `Amount` from `FromId` and adds `Amount` to `ToId`. Replies `{ok, RemainingFromBalance}`.
4. `process_batch(Pid, TransactionsList) -> {ok, AppliedCount, RejectedCount} | {error, timeout}`:
   - Uses `Ref = make_ref()`, sends `{process_batch, self(), Ref, TransactionsList}`, and waits up to 2,000ms for reply.
   - Evaluates transactions in order, applying valid ones and skipping invalid ones. Updates state with all successful transactions.
5. `stop(Pid) -> ok | {error, timeout}`:
   - Uses `Ref = make_ref()`, sends `{stop, self(), Ref}`, replies `{reply, Ref, ok}`, and terminates cleanly.

## Rules & Verification Constraints

- `loop/1` and all batch/update helpers must be strictly tail-recursive.
- Enforced by AST rule: `requireTailRecursion: ["loop/1"]`.
- All client functions must use `make_ref/0` and `receive ... after` timeouts (`requiredConstructs: ["receive_after"]`).
- Automated verification tests concurrent double-spend attacks with 10 parallel client workers!
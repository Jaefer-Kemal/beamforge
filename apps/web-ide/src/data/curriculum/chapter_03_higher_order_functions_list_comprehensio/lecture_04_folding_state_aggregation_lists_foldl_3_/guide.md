## Why This Matters in Production

In Chapter 2, you learned that calculating totals, tracking min/max bounds, and computing financial ledger balances requires iterating over a list while passing an updated accumulator to the next recursive call.

While `lists:map` produces a new list of the same length and `lists:filter` produces a smaller subset, **`lists:foldl/3`** (*fold left*) is the universal reduction operator. It can reduce any list into a single accumulated value: an integer sum, a statistical summary tuple, or an entirely new transformed data structure.

In fact, almost all collection operations—including `map`, `filter`, `reverse`, and `partition`—can be implemented using `foldl`!

## Deep Concept Breakdown & Under the Hood

### 1. Anatomy of `lists:foldl/3`
Here is the exact implementation of `lists:foldl/3` from the Erlang/OTP standard library source code:

```erlang
foldl(F, Accu, [Hd | Tail]) ->
    foldl(F, F(Hd, Accu), Tail);
foldl(F, Accu, []) when is_function(F, 2) ->
    Accu.
```

Notice that `foldl/3` is **strictly tail-recursive**! The recursive call `foldl(F, F(Hd, Accu), Tail)` is in the tail position, meaning the BEAM compiler emits the `call_last` opcode, reusing the current stack frame and running in **$O(1)$ constant stack space**.

### 2. CRITICAL TRAP — The Callback Argument Order!
In JavaScript (`Array.reduce((acc, elem) => ...)`) and Python (`functools.reduce(fun, seq)`), the accumulator is typically the first argument.

In Erlang `lists:foldl/3`, **the Element is FIRST and the Accumulator is SECOND**:

```erlang
lists:foldl(fun(Elem, AccIn) -> AccOut end, InitialAcc, List)
```

> [!warning] Common Beginner Syntax Trap: Inverted foldl Arguments
> If you write `fun(Acc, Elem) -> Acc + Elem end`, your code will fail with arithmetic exceptions the moment you aggregate non-numeric data structures like tuples or lists!
> Always remember: **`fun(Elem, Acc) -> ... end`**.

### 3. Multi-Value Tuple Accumulators
Your accumulator does not have to be a single number. In production telecom and financial systems, you frequently aggregate multiple running metrics inside a **Tagged Tuple Accumulator**:

```erlang
%% Tallying Credits, Debits, and Total Transactions in a single pass:
Entries = [{credit, 100}, {debit, 40}, {credit, 50}],
InitialAcc = {0, 0, 0},  %% {Credits, Debits, Count}

Summary = lists:foldl(fun
    ({credit, Amount}, {CredAcc, DebAcc, CountAcc}) ->
        {CredAcc + Amount, DebAcc, CountAcc + 1};
    ({debit, Amount}, {CredAcc, DebAcc, CountAcc}) ->
        {CredAcc, DebAcc + Amount, CountAcc + 1}
end, InitialAcc, Entries).
%% => {150, 40, 3}
```

### 4. `lists:foldl/3` (Tail-Recursive) vs. `lists:foldr/3` (Body-Recursive)
- **`lists:foldl/3`** processes elements from left-to-right (`Head` to `Tail`). It updates the accumulator eagerly and runs in **$O(1)$ stack space**.
- **`lists:foldr/3`** processes elements from right-to-left (`Tail` to `Head`). To reach the rightmost element first, `foldr` pushes $N$ activation frames onto the call stack before evaluating the first callback! On a list of 1,000,000 elements, `lists:foldr/3` will crash your BEAM process with a stack exhaustion crash, whereas `lists:foldl/3` executes smoothly with zero memory expansion.

99% of production Erlang code strictly uses `lists:foldl/3`.

## Parallel Worked Example

Consider tracking packet latency statistics:

```erlang
-module(latency_aggregator).
-export([analyze_latencies/1]).

%% Single-pass calculation of Count, TotalMs, MinMs, MaxMs:
analyze_latencies([First | Rest]) ->
    InitialAcc = {1, First, First, First},  %% {Count, Total, Min, Max}
    {Count, Total, Min, Max} = lists:foldl(fun(Ms, {Cnt, Sum, MinSoFar, MaxSoFar}) ->
        NewMin = case Ms < MinSoFar of true -> Ms; false -> MinSoFar end,
        NewMax = case Ms > MaxSoFar of true -> Ms; false -> MaxSoFar end,
        {Cnt + 1, Sum + Ms, NewMin, NewMax}
    end, InitialAcc, Rest),
    {latency_report, Count, Total div Count, Min, Max}.
```

## Official Erlang Docs & Function Reference

```erlang
lists:foldl(Fun, Acc0, List) -> Acc1
  types: Fun = fun((Elem :: term(), AccIn :: term()) -> AccOut :: term())
```

## Assignment Specification

Implement three folding aggregators in `src/hof_fold.erl`:

1. `sum_ledger(Entries)`:
   - Input: `[{entry, Amount, Type}, ...]` where `Type` is `credit` or `debit`.
   - Uses `lists:foldl/3` with initial tuple accumulator `{0, 0, 0}` (`{TotalCredit, TotalDebit, NetBalance}`).
   - For `credit`, add `Amount` to `TotalCredit` and `NetBalance`.
   - For `debit`, add `Amount` to `TotalDebit` and subtract `Amount` from `NetBalance`.
   - Returns `{ledger_summary, TotalCredit, TotalDebit, NetBalance}`.
2. `min_max_latency([First | Rest])`:
   - Input: non-empty list of integer millisecond latencies.
   - Uses `lists:foldl/3` with initial accumulator `{First, First}` (`{Min, Max}`) to traverse `Rest`.
   - Returns a 2-tuple `{MinLatency, MaxLatency}`.
3. `reverse_with_fold(List)`:
   - Uses `lists:foldl/3` with initial accumulator `[]` and prepends each element (`[Elem | Acc]`) to reverse `List`.

## Rules & Verification Constraints

- Must use `lists:foldl/3`.
- Strictly no Maps (`#{}`) or Bit-Syntax Binaries (`<<...>>`). Use tuples, lists, and integers only.
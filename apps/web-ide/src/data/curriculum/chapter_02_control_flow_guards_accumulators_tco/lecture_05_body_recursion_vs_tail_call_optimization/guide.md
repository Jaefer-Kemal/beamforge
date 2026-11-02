## Why This Matters in Production

In production BEAM applications processing millions of network packets, sensor readings, or ledger entries, how you write recursive functions directly determines whether your server runs smoothly or crashes with an **Out Of Memory (OOM)** error.

The BEAM VM allocates a execution stack frame for every active function call. If a recursive function is written poorly, the stack frame cannot be released until the entire list has been traversed. For a list of 1,000,000 items, this consumes gigabytes of RAM.

When a function is **Tail-Call Optimized (TCO)**, the BEAM VM reuses the exact same stack frame indefinitely. A TCO function can process 1,000,000,000 items in constant **$O(1)$ memory** (less than 64 words of stack)!

## Deep Concept Breakdown & Under the Hood

### 1. Body Recursion (The Stack-Hungry Trap)
Consider this common naive approach to summing a list of numbers:

```erlang
%% Body-recursive:
sum_naive([]) -> 0;
sum_naive([H | T]) -> H + sum_naive(T).
```

Why is this called "Body Recursion"?
Notice the expression `H + sum_naive(T)`. Before addition (`+`) can occur, the BEAM VM **must wait** for `sum_naive(T)` to complete.
Because the addition is suspended waiting for the recursive call to return, the current stack frame cannot be discarded. The BEAM pushes a new stack frame for each element:

```
[Frame 1: 10 + (waiting)]
  [Frame 2: 20 + (waiting)]
    [Frame 3: 30 + (waiting)]  <-- Stack grows linearly O(N)!
```

### 2. Tail-Call Optimization & The Accumulator Pattern
A function is **Tail-Recursive** if the recursive call is the **absolute last operation** executed in the clause. Nothing is suspended or waiting.

To make an aggregation tail-recursive, we introduce a private helper with an extra parameter called an **Accumulator (`Acc`)**:

```erlang
%% Public interface initializes accumulator to 0:
sum_tco(List) ->
    sum_tco(List, 0).

%% Private tail-recursive loop:
sum_tco([], Acc) ->
    Acc;
sum_tco([H | T], Acc) ->
    sum_tco(T, Acc + H).   %% Acc + H is evaluated BEFORE the call!
```

Notice:
1. `Acc + H` is calculated **before** `sum_tco/2` is entered.
2. The recursive call `sum_tco(T, ...)` is the final instruction.
3. The BEAM compiler detects this pattern and emits the `call_last` bytecode opcode. Instead of pushing a new frame, it overwrites the existing stack frame in place. Stack space remains constant $O(1)$!

> [!warning] Common Beginner Syntax Trap: Pseudo-TCO
> Writing `H + sum_tco(T, Acc)` is NOT tail-recursive!
> Even though you passed an accumulator, the `H +` operation is still outside the call, forcing the BEAM to hold the stack frame open. Always move the calculation inside the function call argument.

## Parallel Worked Example

Counting and aggregating network metric bytes:

```erlang
-module(metrics_tco).
-export([total_bytes/1, sample_count/1]).

%% Sum bytes with TCO
total_bytes(ByteList) ->
    total_bytes_loop(ByteList, 0).

total_bytes_loop([], Acc) ->
    Acc;
total_bytes_loop([Bytes | Rest], Acc) ->
    total_bytes_loop(Rest, Acc + Bytes).

%% Count items with TCO
sample_count(List) ->
    sample_count_loop(List, 0).

sample_count_loop([], CountAcc) ->
    CountAcc;
sample_count_loop([_Item | Rest], CountAcc) ->
    sample_count_loop(Rest, CountAcc + 1).
```

## Official Erlang Docs & Function Reference

```erlang
%% The Standard TCO Accumulator Pattern:
ExportedFunc(List) ->
    PrivateHelper(List, InitialAcc).

PrivateHelper([], Acc) ->
    Acc;
PrivateHelper([H | T], Acc) ->
    PrivateHelper(T, UpdateAcc(Acc, H)).
```

## Assignment Specification

Implement two tail-recursive accumulator functions in `tco_counter.erl`:

1. `sum_packets(List)`:
   - Takes a list of integer packet sizes, e.g. `[10, 20, 30, 40]`.
   - Delegates to a private helper `sum_packets(List, 0)`.
   - Returns the integer sum in $O(1)$ stack space.

2. `count_packets(List)`:
   - Takes a list of arbitrary packet items, e.g. `[a, b, c, d, e]`.
   - Delegates to a private helper `count_packets(List, 0)`.
   - Returns the integer count in $O(1)$ stack space.

## Rules & Verification Constraints

- Must be strictly tail-recursive (enforced by `bf_ast_verifier` bytecode disassembly checking for `call_last`).
- Forbidden calls: `lists:sum/1`, `erlang:length/1`.
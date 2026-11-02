## Why This Matters in Production

In Lesson 2.5, you used an accumulator to calculate a single number (a sum or a count).
Now, what happens when your goal is to **build a new list** (e.g. filtering valid orders, transforming records, or cleaning inputs)?

This introduces the single most pervasive pattern in the Erlang programming language: **The List Accumulator Pattern**.

## Deep Concept Breakdown & Under the Hood

### 1. Prepending `[NewItem | Acc]` is $O(1)$
In Erlang, singly-linked lists are constructed by creating a new cons cell whose tail points to the existing list.
Adding an element to the front of a list takes **1 memory allocation and 0 copied elements**: it is strictly **$O(1)$ constant time**.

### 2. The Reversal Paradox: `[Item | Acc]` Reverses Order
When you iterate through an input list and prepend each matching item onto an accumulator:
- Element 1 is pushed first $ightarrow$ `[Elem1]`
- Element 2 is pushed next $ightarrow$ `[Elem2, Elem1]`
- Element 3 is pushed next $ightarrow$ `[Elem3, Elem2, Elem1]`

Your accumulator ends up in **reverse order (LIFO - Last In, First Out)**!

### 3. The $O(N^2)$ Disaster: Never Append with `++`
Beginners often attempt to keep elements in order by appending to the end of the accumulator:
```erlang
%% DISASTROUS ANTI-PATTERN: DO NOT DO THIS!
filter_bad([H | T], Acc) ->
    filter_bad(T, Acc ++ [H]).
```
In Erlang, `Acc ++ [H]` must copy the entire left list `Acc` on every single iteration!
For a list of 10,000 items, appending copies $50,000,000$ elements, bringing your server to a grinding halt with $O(N^2)$ complexity.

### 4. The Idiomatic Erlang Solution: Prepend in $O(1)$, Reverse at Base Case
The standard Erlang technique used in 100% of production codebases is:
1. Prepend items to `Acc` in constant time: `[Item | Acc]`.
2. At the base case (`[]`), call the C-implemented BIF `lists:reverse(Acc)`.

```erlang
keep_evens(List) ->
    keep_evens(List, []).

keep_evens([], Acc) ->
    lists:reverse(Acc);   %% Reverses once in O(N) using fast C BIF
keep_evens([H | T], Acc) when H rem 2 =:= 0 ->
    keep_evens(T, [H | Acc]);
keep_evens([_ | T], Acc) ->
    keep_evens(T, Acc).
```

This guarantees strict $O(N)$ total execution time and minimal memory churn.

> [!warning] Common Beginner Syntax Trap: Forgetting lists:reverse
> If your function passes tests for item presence but fails ordering checks (e.g. returning `[4, 1]` instead of `[1, 4]`), you forgot to call `lists:reverse(Acc)` in the base case clause!

## Parallel Worked Example

Filtering active user IDs from user profile tuples:

```erlang
-module(user_filter).
-export([active_user_ids/1]).

active_user_ids(Users) ->
    active_user_ids_loop(Users, []).

active_user_ids_loop([], Acc) ->
    lists:reverse(Acc);
active_user_ids_loop([{user, Id, _Name, active} | Rest], Acc) ->
    active_user_ids_loop(Rest, [Id | Acc]);
active_user_ids_loop([{user, _Id, _Name, _OtherStatus} | Rest], Acc) ->
    active_user_ids_loop(Rest, Acc).
```

## Official Erlang Docs & Function Reference

```erlang
%% OTP stdlib: lists:reverse/1
lists:reverse(List1) -> List2
  Types:
    List1 = List2 = [T]
```
> `lists:reverse/1` is implemented as a direct C primitive inside the ERTS emulator. It is extraordinarily fast.

## Assignment Specification

Implement order filtering in `acc_filter.erl`:

1. `keep_valid_orders(Orders)`:
   - Input is a list of 4-tuples: `[{order, Id, Qty, Status}, ...]`.
   - An order is valid if `Qty > 0` AND `Status =:= confirmed`.
   - Extracts only the `Id` integers of valid orders.
   - Must preserve the exact relative order of the input.
   - Implemented using a private tail-recursive accumulator helper and `lists:reverse/1`.

## Rules & Verification Constraints

- Must be tail-recursive (enforced by `bf_ast_verifier`).
- Must call `lists:reverse/1` in the base case.
- Do not use `lists:filter/2` or `lists:map/2`.
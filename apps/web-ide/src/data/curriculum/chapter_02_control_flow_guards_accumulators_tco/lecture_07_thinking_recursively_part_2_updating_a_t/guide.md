## Why This Matters in Production

In real-world backend applications, you rarely just read or filter lists: you need to **update records inside an immutable dataset**.

In the upcoming Chapter 2 Capstone Problem Set (`inventory.erl` in Lesson 2.8), an incoming customer order requires you to find a specific product inside an inventory list and **deduct the purchased quantity from that product's stock**, while leaving all other products in their exact relative positions.

Because Erlang data structures are 100% immutable, you cannot do `product.stock -= qty`.
Instead, you must master the **Tail-Recursive List Update Pattern**.

## Deep Concept Breakdown & Under the Hood

### 1. The Tail-Recursive List Update Pattern
To "modify" a record in an immutable list:
1. Walk the list item by item.
2. If the current item does **not** match the target, accumulate it unchanged: `[CurrentItem | Acc]`.
3. When you find the target item, construct the **updated tuple** and push it onto the accumulator: `[UpdatedItem | Acc]`.
4. Continue traversing the rest of the list so subsequent items are preserved.
5. At the base case (`[]`), call `lists:reverse(Acc)` to restore original list order.

```erlang
update_stock([], _TargetId, _DeductQty, Acc) ->
    lists:reverse(Acc);
update_stock([{product, Id, Name, Price, Stock} | Rest], TargetId, DeductQty, Acc)
  when Id =:= TargetId, Stock >= DeductQty ->
    UpdatedProd = {product, Id, Name, Price, Stock - DeductQty},
    update_stock(Rest, TargetId, DeductQty, [UpdatedProd | Acc]);
update_stock([OtherProd | Rest], TargetId, DeductQty, Acc) ->
    update_stock(Rest, TargetId, DeductQty, [OtherProd | Acc]).
```

### 2. Dual-Accumulator Partitioning
Sometimes a function needs to produce **two separate lists** from a single stream of inputs (e.g. separating valid orders from invalid orders, or successful payments from failed payments).

Instead of traversing the list twice (which would be $2 	imes O(N)$), Erlang functions pass **two accumulators simultaneously**:

```erlang
partition_stream(List) ->
    partition_stream(List, [], []).

partition_stream([], PassAcc, FailAcc) ->
    {lists:reverse(PassAcc), lists:reverse(FailAcc)};
partition_stream([{event, Id, ok} | Rest], PassAcc, FailAcc) ->
    partition_stream(Rest, [Id | PassAcc], FailAcc);
partition_stream([{event, Id, error} | Rest], PassAcc, FailAcc) ->
    partition_stream(Rest, PassAcc, [Id | FailAcc]).
```

In a single, cache-friendly tail-recursive pass, both output lists are populated and reversed in constant stack memory.

> [!warning] Common Beginner Syntax Trap: Halting Immediately on Update
> A common beginner mistake is stopping the recursion as soon as the updated item is found (e.g. `return [Updated | Rest]`).
> If you do this without accounting for the items already accumulated in `Acc`, all previous elements of your inventory list will be lost! Always carry the tail through to the base case.

## Parallel Worked Example

Updating player levels and partitioning active vs inactive players in a gaming guild:

```erlang
-module(guild_manager).
-export([level_up_player/3, partition_by_level/2]).

level_up_player(Players, TargetPlayerId, BonusLevels) ->
    level_up_loop(Players, TargetPlayerId, BonusLevels, []).

level_up_loop([], _TargetId, _Bonus, Acc) ->
    lists:reverse(Acc);
level_up_loop([{player, Id, Name, Lvl} | Rest], TargetId, Bonus, Acc)
  when Id =:= TargetId ->
    Updated = {player, Id, Name, Lvl + Bonus},
    level_up_loop(Rest, TargetId, Bonus, [Updated | Acc]);
level_up_loop([OtherPlayer | Rest], TargetId, Bonus, Acc) ->
    level_up_loop(Rest, TargetId, Bonus, [OtherPlayer | Acc]).

partition_by_level(Players, MinLevel) ->
    partition_loop(Players, MinLevel, [], []).

partition_loop([], _MinLvl, HighAcc, LowAcc) ->
    {lists:reverse(HighAcc), lists:reverse(LowAcc)};
partition_loop([{player, _Id, _Name, Lvl} = P | Rest], MinLvl, HighAcc, LowAcc)
  when Lvl >= MinLvl ->
    partition_loop(Rest, MinLvl, [P | HighAcc], LowAcc);
partition_loop([P | Rest], MinLvl, HighAcc, LowAcc) ->
    partition_loop(Rest, MinLvl, HighAcc, [P | LowAcc]).
```

## Official Erlang Docs & Function Reference

```erlang
%% Multi-Accumulator Signature Pattern:
Process(List, AccA, AccB) ->
    case List of
        [] -> {lists:reverse(AccA), lists:reverse(AccB)};
        [H | T] when Condition(H) -> Process(T, [H | AccA], AccB);
        [H | T] -> Process(T, AccA, [H | AccB])
    end.
```

## Assignment Specification

Implement two list manipulation functions in `tuple_updater.erl`:

1. `update_product_price(Inventory, TargetId, NewPrice)`:
   - `Inventory` is a list of `[{product, Id, Name, Price, Stock}, ...]`.
   - Locates the product with `Id =:= TargetId` and constructs a new tuple with `NewPrice`.
   - All other products remain unchanged, in their exact original order.
   - If `TargetId` is not present, returns `Inventory` unchanged.

2. `partition_orders(Orders, MinQty)`:
   - `Orders` is a list of `[{order, Id, Qty}, ...]`.
   - Uses dual accumulators to partition into `{ValidOrders, RejectedOrders}`.
   - An order is valid if `Qty >= MinQty`. Both output lists must preserve original input order.

## Rules & Verification Constraints

- Must be tail-recursive (enforced by `bf_ast_verifier`).
- Must call `lists:reverse/1` on accumulators.
- Do not use `lists:partition/2` or `lists:keyreplace/4`.
## Why This Matters in Production

Before performing a critical transaction—such as placing a batch order, executing a database migration, or taking a node offline for maintenance—systems need to evaluate collection-wide invariants:
- *Are all items currently in stock?*
- *Has any worker thread logged a critical fatal error?*
- *Can we separate high-priority traffic from standard traffic in a single scan?*

In imperative languages, developers write nested loops with boolean flags (`bool allValid = true; for (...) { if (!v) { allValid = false; break; } }`).

In Erlang, the standard library provides optimized, short-circuiting predicate functions (`lists:all/2`, `lists:any/2`) and single-pass collection splitters (`lists:partition/2`).

## Deep Concept Breakdown & Under the Hood

### 1. Universal Validation with `lists:all/2`
`lists:all(Pred, List) -> boolean()` checks whether **every element** in a list satisfies the predicate function:

```erlang
AllPositive = lists:all(fun(X) -> X > 0 end, [10, 20, 30]).  %% => true
HasZero = lists:all(fun(X) -> X > 0 end, [10, 0, 30]).       %% => false
```

**Short-Circuit Evaluation:**
`lists:all/2` does not blindly scan the entire list. The moment `Pred(Elem)` returns `false`, `lists:all/2` immediately terminates its traversal and returns `false`, saving millions of CPU cycles on large datasets.

> [!important] Vacuous Truth on Empty Lists
> In accordance with formal logic, `lists:all(Pred, [])` **always returns `true`** regardless of `Pred`!
> If there are zero elements, no element violates the condition. Keep this edge case in mind when validating user input!

### 2. Existential Validation with `lists:any/2`
`lists:any(Pred, List) -> boolean()` checks whether **at least one element** satisfies the predicate:

```erlang
HasCritical = lists:any(fun({log, Lvl, _}) -> Lvl =:= critical end, Logs).
```

Just like `all/2`, `lists:any/2` short-circuits: the moment `Pred(Elem)` evaluates to `true`, scanning stops immediately and `true` is returned.
For an empty list `[]`, `lists:any(Pred, [])` **always returns `false`**.

### 3. Single-Pass Partitioning with `lists:partition/2`
In Chapter 2 Lesson 2.7, you implemented a custom dual-accumulator loop (`partition_orders/2`) to split orders into valid and rejected buckets.

In production Erlang, you use **`lists:partition/2`**:

```erlang
lists:partition(Pred, List) -> {SatisfyingList, NonSatisfyingList}
```

```erlang
Orders = [{order, 1, 10}, {order, 2, 2}, {order, 3, 50}],
{Bulk, Standard} = lists:partition(fun({order, _, Qty}) -> Qty >= 10 end, Orders).
%% Bulk     => [{order, 1, 10}, {order, 3, 50}]
%% Standard => [{order, 2, 2}]
```

`lists:partition/2` evaluates the predicate on each element in a single tail-recursive pass, appending matching items into one accumulator and non-matching items into another, returning both in their original relative order.

## Parallel Worked Example

Consider a telecommunication gateway auditing active channel metrics:

```erlang
-module(channel_auditor).
-export([channels_healthy/1, alert_present/1, segregate_channels/2]).

%% Verify all channels have positive signal-to-noise ratio:
channels_healthy(Channels) ->
    lists:all(fun({channel, _Id, Snr}) -> Snr > 15 end, Channels).

%% Check if any channel has dropped below critical threshold:
alert_present(Channels) ->
    lists:any(fun({channel, _Id, Snr}) -> Snr =< 0 end, Channels).

%% Segregate into high-bandwidth vs standard channels:
segregate_channels(Channels, MinBandwidth) ->
    lists:partition(fun({channel, _Id, _Snr, Bw}) ->
        Bw >= MinBandwidth
    end, Channels).
```

## Official Erlang Docs & Function Reference

```erlang
lists:all(Pred, List) -> boolean()
lists:any(Pred, List) -> boolean()
lists:partition(Pred, List) -> {Satisfying, NotSatisfying}
```

## Assignment Specification

Implement three validation and segregation functions in `src/hof_predicates.erl`:

1. `all_in_stock(Inventory)`:
   - Input: `[{product, Id, Name, Price, Stock}, ...]`.
   - Uses `lists:all/2` to return `true` if every product has `Stock > 0`, else `false`.
2. `has_critical_error(Logs)`:
   - Input: `[{log, Level, Msg}, ...]`.
   - Uses `lists:any/2` to return `true` if at least one log entry has `Level =:= critical`, else `false`.
3. `split_orders_by_stock(Orders, MaxSingleOrderQty)`:
   - Input: `[{order, Id, Qty}, ...]`.
   - Uses `lists:partition/2` to return a 2-tuple `{StandardOrders, BulkOrders}`.
   - `StandardOrders` are those where `Qty > 0 andalso Qty =< MaxSingleOrderQty`.
   - All other orders belong in `BulkOrders`.

## Rules & Verification Constraints

- Must use `lists:all/2`, `lists:any/2`, and `lists:partition/2`.
- Strictly no Maps (`#{}`) or Bit-Syntax Binaries (`<<...>>`). Use tuples, atoms, and integers only.
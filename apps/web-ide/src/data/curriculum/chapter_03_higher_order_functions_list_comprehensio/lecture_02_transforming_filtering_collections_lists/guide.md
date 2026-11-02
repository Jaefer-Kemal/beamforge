## Why This Matters in Production

In Chapter 2, you wrote manual tail-recursive loops with accumulators to search, filter, and transform lists. While writing recursion by hand is essential for understanding the BEAM VM stack, writing 12 lines of recursive boilerplate for every collection operation in production is slow, tedious, and error-prone.

The Erlang standard library's `lists` module provides battle-tested, high-performance Higher-Order Functions that compress common collection patterns into concise, expressive, one-line operations.

## Deep Concept Breakdown & Under the Hood

### 1. 1-to-1 Transformation with `lists:map/2`
When you need to transform every element of a list into a new element without changing the list's length or order:

```erlang
lists:map(fun((A) -> B), [A]) -> [B]
```

```erlang
Numbers = [1, 2, 3, 4],
Doubled = lists:map(fun(X) -> X * 2 end, Numbers).  %% => [2, 4, 6, 8]
```

`lists:map/2` applies the transformation to each element and guarantees that the resulting list has the exact same number of elements in the exact same sequential order.

### 2. Predicate Filtering with `lists:filter/2`
When you need to prune a collection, keeping only elements that satisfy a condition:

```erlang
lists:filter(fun((A) -> boolean()), [A]) -> [A]
```

```erlang
Sessions = [{session, 101, active}, {session, 102, expired}, {session, 103, active}],
ActiveOnly = lists:filter(fun({session, _, Status}) -> Status =:= active end, Sessions).
%% => [{session, 101, active}, {session, 103, active}]
```

> [!warning] Common Beginner Syntax Trap: Boolean Predicate Requirement
> The callback fun passed to `lists:filter/2` MUST return the literal boolean atom `true` or `false`.
> If your function returns an integer, an atom like `ok`, or `undefined`, the BEAM VM immediately crashes with a `{badarg, lists:filter}` runtime exception!

### 3. The Single-Pass Optimization: `lists:filtermap/2`
Frequently in production, you need to filter a list AND transform the retained elements.
A novice writes two sequential pipeline stages:

```erlang
%% Inefficient: Traverses the list twice and allocates an intermediate list in memory!
Filtered = lists:filter(fun({_, Val}) -> Val >= 0 end, RawMetrics),
Transformed = lists:map(fun({Metric, Val}) -> {Metric, round(Val)} end, Filtered).
```

Erlang provides **`lists:filtermap/2`**, which performs both operations in a **single pass**:

```erlang
lists:filtermap(fun((A) -> boolean() | {true, B}), [A]) -> [B]
```

The callback fun returns:
- `true`: Keep the element unchanged.
- `false`: Discard the element.
- `{true, NewElement}`: Keep the element and replace it with `NewElement`.

```erlang
RawMetrics = [{cpu, 12.8}, {temp, -1.0}, {disk, 44.2}],
Sanitized = lists:filtermap(fun
    ({Metric, Val}) when Val >= 0 ->
        {true, {Metric, round(Val)}};
    ({_, _Negative}) ->
        false
end, RawMetrics).
%% => [{cpu, 13}, {disk, 44}]  -- Completed in a SINGLE traversal!
```

## Parallel Worked Example

Consider processing orders in a logistics gateway:

```erlang
-module(logistics_pipeline).
-export([apply_tax/2, pending_deliveries/1, process_valid_shipments/1]).

%% 1. lists:map to add 15% VAT
apply_tax(Items, TaxPercent) ->
    lists:map(fun({item, Sku, Cost}) ->
        TaxedCost = Cost + ((Cost * TaxPercent) div 100),
        {item, Sku, TaxedCost}
    end, Items).

%% 2. lists:filter to retain only pending shipments
pending_deliveries(Shipments) ->
    lists:filter(fun({shipment, _Id, Status}) ->
        Status =:= pending
    end, Shipments).

%% 3. lists:filtermap in a single pass: reject zero-weight parcels, round parcel weights
process_valid_shipments(Parcels) ->
    lists:filtermap(fun
        ({parcel, TrackingId, Weight}) when Weight > 0 ->
            {true, {parcel, TrackingId, round(Weight)}};
        ({parcel, _TrackingId, _ZeroWeight}) ->
            false
    end, Parcels).
```

## Official Erlang Docs & Function Reference

```erlang
lists:map(Fun, List) -> [term()]
lists:filter(Pred, List) -> [term()]
lists:filtermap(Fun, List) -> [term()]
```

## Assignment Specification

Implement three collection transformers in `src/hof_transform.erl`:

1. `discount_prices(Products, DiscountPercent)`:
   - Input: `[{product, Id, Name, Price}, ...]` (where `Price` is an integer, e.g. in cents).
   - Uses `lists:map/2` to return each product with its price discounted:
     `NewPrice = Price - ((Price * DiscountPercent) div 100)`.
2. `active_sessions(Sessions)`:
   - Input: `[{session, SessionId, Status}, ...]`.
   - Uses `lists:filter/2` to retain only tuples where `Status =:= active`.
3. `sanitize_metrics(RawMetrics)`:
   - Input: `[{MetricAtom, Value}, ...]` (where `Value` is a float or integer).
   - Uses `lists:filtermap/2` in a single pass:
     - Discard any tuple where `Value < 0` (return `false`).
     - For `Value >= 0`, return `{true, {MetricAtom, round(Value)}}`.

## Rules & Verification Constraints

- Must use `lists:map/2`, `lists:filter/2`, and `lists:filtermap/2`.
- Strictly no Maps (`#{}`) or Bit-Syntax Binaries (`<<...>>`). Use tuples, atoms, and integers only.
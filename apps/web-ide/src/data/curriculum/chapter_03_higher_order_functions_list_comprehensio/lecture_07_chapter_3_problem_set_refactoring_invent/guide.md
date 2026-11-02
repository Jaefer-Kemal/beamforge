## Why This Matters in Production

In Chapter 2, you built the foundation of an inventory processing engine using manual tail-recursion. While functional, that engine required dozens of lines of helper loops and manual list traversals.

Now that you have mastered:
1. **`lists:foldl/3`** for tail-recursive accumulation,
2. **`lists:filtermap/2`** for single-pass filtering and transformation,
3. **`lists:keyfind/3` & `lists:keystore/4`** for C-speed tuple lookups and replacements,

you are ready to synthesize these tools into a clean, idiomatic, high-throughput analytics and order fulfillment engine.

## Deep Concept Breakdown & Under the Hood

### 1. Refactoring Manual Recursion with `lists:foldl/3`
In Chapter 2, calculating total inventory valuation required writing private `total/2` loop helpers.
With `lists:foldl/3`, it becomes a clear, 3-line reduction:

```erlang
total_inventory_valuation(Inventory) ->
    lists:foldl(fun({product, _Id, _Name, Price, Stock}, TotalAcc) ->
        TotalAcc + (Price * Stock)
    end, 0, Inventory).
```

### 2. Streamlining Order Application with `lists:keyfind` and `keystore`
In Chapter 2's `inventory:process_order/2`, you had an outer loop over orders and an inner loop updating inventory tuples.
Look how elegant this becomes when you fold over orders and use ERTS BIFs:

```erlang
apply_orders_with_keylists(Inventory, Orders) ->
    lists:foldl(fun({order, ProdId, Qty}, AccInv) ->
        case lists:keyfind(ProdId, 2, AccInv) of
            {product, ProdId, Name, Price, Stock} when Stock >= Qty, Qty > 0 ->
                UpdatedProd = {product, ProdId, Name, Price, Stock - Qty},
                lists:keystore(ProdId, 2, AccInv, UpdatedProd);
            _ ->
                AccInv
        end
    end, Inventory, Orders).
```

The accumulator `AccInv` starts as the initial `Inventory`. For each order, `lists:keyfind/3` locates the product in C speed. If stock is sufficient, `lists:keystore/4` replaces the tuple in-place. If insufficient or missing, `AccInv` is returned unchanged!

### 3. Service Level Agreement (SLA) Telemetry Aggregation
In backend telemetry, web gateways and message routers stream millions of endpoint request logs.
Each log event is a tuple: `{log, EndpointAtom, LatencyMs, StatusAtom}`.

Using `lists:foldl/3`, you can compute:
- Total requests processed,
- Number of failed requests (`StatusAtom =:= error`),
- Total latency in milliseconds,

all in a single pass into a tagged summary tuple:
`{sla_summary, TotalRequests, ErrorCount, TotalLatencyMs}`.

## Parallel Worked Example

```erlang
-module(telemetry_engine).
-export([audit_events/1]).

%% Aggregates event stream into {telemetry_summary, Total, WarnCount, TotalBytes}
audit_events(Events) ->
    lists:foldl(fun
        ({event, _Type, Bytes, warning}, {Total, Warns, SumBytes}) ->
            {Total + 1, Warns + 1, SumBytes + Bytes};
        ({event, _Type, Bytes, _Status}, {Total, Warns, SumBytes}) ->
            {Total + 1, Warns, SumBytes + Bytes}
    end, {telemetry_summary, 0, 0, 0}, Events).
```

## Assignment Specification

Implement four pipeline functions in `src/inventory_hof.erl`:

1. `total_inventory_valuation(Inventory)`:
   - `Inventory = [{product, Id, Name, Price, Stock}, ...]`.
   - Uses `lists:foldl/3` with initial accumulator `0` to return the total integer value `Sum(Price * Stock)`.
2. `critical_stock_alerts(Inventory, Threshold)`:
   - Uses `lists:filtermap/2` in a single pass:
     - If `Stock =< Threshold`, emits `{true, {alert, Id, Name, Stock}}`.
     - Otherwise emits `false`.
3. `apply_orders_with_keylists(Inventory, Orders)`:
   - Folds over `Orders = [{order, ProdId, Qty}, ...]` using `lists:foldl/3`.
   - Initial accumulator is `Inventory`.
   - For each order, looks up `ProdId` using `lists:keyfind(ProdId, 2, AccInv)`.
   - If found with `Stock >= Qty` and `Qty > 0`, updates the product using `lists:keystore(ProdId, 2, AccInv, {product, ProdId, Name, Price, Stock - Qty})`.
   - If stock is insufficient or product is not found, leaves `AccInv` unchanged.
4. `aggregate_sla_logs(Logs)`:
   - `Logs = [{log, EndpointAtom, LatencyMs, StatusAtom}, ...]`.
   - Uses `lists:foldl/3` with initial accumulator `{sla_summary, 0, 0, 0}` (`{sla_summary, TotalReqs, ErrorCount, TotalLatency}`).
   - Increments `TotalReqs` on every entry.
   - If `StatusAtom =:= error`, increments `ErrorCount`.
   - Adds `LatencyMs` to `TotalLatency`.
   - Returns `{sla_summary, TotalReqs, ErrorCount, TotalLatency}`.

## Rules & Verification Constraints

- Must use `lists:foldl/3`, `lists:filtermap/2`, `lists:keyfind/3`, and `lists:keystore/4`.
- Strictly no Maps (`#{}`) or Bit-Syntax Binaries (`<<...>>`). Use tagged tuples, atoms, and integers only.
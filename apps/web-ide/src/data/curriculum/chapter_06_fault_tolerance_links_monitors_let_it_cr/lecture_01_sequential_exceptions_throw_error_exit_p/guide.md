## Why This Matters in Production

In classical languages like Java, C++, Python, or TypeScript, developers are conditioned to rely on defensive programming: wrapping entire call stacks in blanket `try { ... } catch (Exception e)` blocks. When an unexpected error occurs, the catch block catches the exception, logs a generic stacktrace, and leaves the application running in **partially mutated, corrupt memory**. This corrupted state quietly spreads, eventually triggering subtle data loss or cascading outages hours later.

Erlang approaches reliability from the opposite, battle-tested philosophy: **"Let It Crash"**. In Erlang, processes are isolated memory containers. If an actor encounters invalid internal state, it should terminate immediately, letting its supervisor clean up its resources and restart it from a known-good configuration.

However, **at the outer boundaries of your system**—such as parsing untrusted network bytes from an external TCP socket or verifying incoming HTTP request payloads—you must classify incoming errors without terminating the supervisor. In sequential Erlang, this classification is handled by **`try ... catch Class:Reason -> ... end`**.

## Deep Concept Breakdown & Under the Hood

Unlike languages that have a single generic `Exception` base class, the BEAM runtime classifies sequential exceptions into **three distinct classes**, each carrying a precise architectural intent:

| Exception Class | Invocation Primitive | Production Semantics & Intended Usage |
| :--- | :--- | :--- |
| **`throw(Value)`** | `throw(Value)` | **Non-Local Return / Expected Domain Flow:** Used for intentional, expected early termination across deep recursion (e.g., aborting a nested syntax tree walk upon finding a target node, or signaling expected business validation failures like `throw(negative_amount)`). Callers are explicitly expected to catch throws. |
| **`error(Reason)`** | `erlang:error(Reason)` | **Runtime Bugs & Contract Violations:** Generated automatically by the BEAM for VM errors (`badarith`, `badmatch`, `function_clause`, `badarg`) or raised explicitly via `erlang:error(Reason)`. It automatically captures the full process stacktrace (`Class:Reason:Stacktrace`). |
| **`exit(Reason)`** | `exit(Reason)` | **Intentional Process Termination:** Signals that the current process deliberately wishes to stop running (e.g., `exit(normal)`, `exit(shutdown)`, or `exit(database_unreachable)`). When uncaught, it converts into an exit signal sent to linked processes. |

### Pattern Matching on Exception Classes

To catch and differentiate these three classes in sequential code, Erlang provides pattern-matching syntax inside `catch`:

```erlang
try
    check_payment(Payload)
catch
    throw:Reason ->
        {rejected, Reason};
    error:Reason ->
        {bug_detected, Reason};
    exit:Reason ->
        {process_aborted, Reason}
end
```

> [!warning] Fault-Tolerance Trap: The Default Catch Class is `throw`!
> If you write `catch Pattern -> ...` without specifying an explicit class prefix (e.g., `catch Reason -> {error, Reason}`), the BEAM defaults to matching **`throw` only**! It will completely ignore `error:...` and `exit:...` exceptions, causing your process to crash unexpectedly. Always write `Class:Reason` when you intend to intercept general exceptions.

## Parallel Worked Example

The following module inspects order requests, classifying invalid data with the appropriate exception primitive:

```erlang
-module(order_inspector).
-export([validate_order/1, safe_inspect/1]).

validate_order({order, Qty, Sku}) ->
    if
        not is_integer(Qty) -> erlang:error(bad_quantity_type);
        Qty < 0            -> throw(negative_quantity);
        Qty =:= 0          -> exit(zero_order_abort);
        not is_binary(Sku) -> throw(invalid_sku_format);
        true               -> {approved, Qty, Sku}
    end;
validate_order(_Invalid) ->
    erlang:error(invalid_order_tuple).

safe_inspect(OrderTuple) ->
    try validate_order(OrderTuple) of
        {approved, Qty, Sku} -> {ok, #{qty => Qty, sku => Sku}}
    catch
        throw:Reason -> {rejected, Reason};
        error:Reason -> {bug_detected, Reason};
        exit:Reason  -> {process_aborted, Reason}
    end.
```

## Official Erlang Docs & Function Reference

```erlang
%% BIFs: erlang (erts)
throw(Any) -> no_return()
erlang:error(Reason) -> no_return()
erlang:error(Reason, Args) -> no_return()
exit(Reason) -> no_return()
```

## Assignment Specification

Implement `src/exception_classifier.erl` exporting `check_payment/1`, `safe_check/1`, and `trigger_class/2`:

1. `check_payment(PaymentTuple)`:
   - Matches `{payment, Amount, Currency}`:
     - If `not is_integer(Amount)` -> raises `erlang:error(bad_amount_type)`.
     - If `Amount < 0` -> calls `throw(negative_amount)`.
     - If `Amount =:= 0` -> calls `exit(zero_payment_abort)`.
     - If `Currency =/= usd andalso Currency =/= eur andalso Currency =/= etb` -> calls `throw({unsupported_currency, Currency})`.
     - Otherwise -> returns `{approved, Amount, Currency}`.
   - If `PaymentTuple` is not a 3-element payment tuple -> raises `erlang:error(invalid_payment_tuple)`.
2. `safe_check(PaymentTuple)`:
   - Evaluates `check_payment(PaymentTuple)` inside a `try ... catch` block:
     - On successful approval -> returns `{approved, Amount, Currency}`.
     - On `throw:Reason` -> returns `{rejected, Reason}`.
     - On `error:Reason` -> returns `{bug_detected, Reason}`.
     - On `exit:Reason` -> returns `{process_aborted, Reason}`.
3. `trigger_class(ClassAtom, Reason)`:
   - When `ClassAtom =:= throw` -> executes `throw(Reason)`.
   - When `ClassAtom =:= error` -> executes `erlang:error(Reason)`.
   - When `ClassAtom =:= exit` -> executes `exit(Reason)`.

## Rules & Verification Constraints

- Must export `check_payment/1`, `safe_check/1`, and `trigger_class/2`.
- Must use `try ... catch` in `safe_check/1` (enforced by AST rule `requiredConstructs: ["try_catch"]`).

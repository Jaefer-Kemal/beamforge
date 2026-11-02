## Why This Matters in Production

Pattern matching alone cannot express numerical ranges, type boundaries, or arithmetic constraints. For example, pattern matching can verify that a parameter is a tuple `{port, Number}`, but it cannot verify that `Number` is strictly between `1024` and `65535`.

To enforce domain constraints without clunky nested `if` statements inside the function body, Erlang provides **Guard Clauses (`when`)**.

Guards run before the function body executes. If a guard evaluates to `true`, the clause executes. If it evaluates to `false`, the BEAM VM skips to the next clause with zero heap allocation.

## Deep Concept Breakdown & Under the Hood

### 1. The Purity Rule: Only Built-In Functions (BIFs) Allowed
Guards must be deterministic, lightning-fast, and free of side effects. For this reason, the Erlang compiler **strictly forbids user-defined functions inside guards**.

Only a curated set of Built-In Functions (BIFs) and operators can be used in guards:
- **Type BIFs**: `is_integer/1`, `is_float/1`, `is_number/1`, `is_atom/1`, `is_tuple/1`, `is_list/1`, `is_boolean/1`.
- **Comparison Operators**: `=:==`, `=/=`, `==`, `/=`, `<`, `=<`, `>`, `>=`.
- **Arithmetic & Logic**: `+`, `-`, `*`, `/`, `div`, `rem`, `andalso`, `orelse`, `not`.

```erlang
%% Valid guard:
is_adult(Age) when is_integer(Age), Age >= 18 -> true;
is_adult(_) -> false.
```

### 2. Compound Guards: Comma (,) vs. Semicolon (;)
Erlang guards use punctuation to express Boolean logic:
- **, (Comma)** means **AND**: all comma-separated conditions must evaluate to `true`.
- **; (Semicolon)** means **OR**: if any semicolon-separated guard evaluates to `true`, the clause is selected.

```erlang
%% Matches if X is integer AND X is between 1 and 100:
in_range(X) when is_integer(X), X >= 1, X =< 100 -> true;

%% Matches if Status is 'active' OR Status is 'pending':
is_open(Status) when Status =:= active; Status =:= pending -> true;
is_open(_) -> false.
```

### 3. THE SILENT GUARD EXCEPTION RULE (Crucial Erlang Invariant)
In standard Erlang expressions, dividing by zero (`10 / 0`) or calling an arithmetic function on an atom crashes the process immediately with `badarith`.

**Inside a guard clause, exceptions NEVER crash the process!**

If an expression inside a guard raises a runtime error (e.g. `A / B > 2` when `B =:= 0`, or `length(X) > 0` when `X` is an atom), the guard simply traps the failure and **silently evaluates to `false`**! The BEAM runtime immediately moves to evaluate the next clause.

```erlang
%% If Denom is 0, (Num / Denom) throws badarith, the guard fails silently,
%% and Erlang safely falls through to the next clause!
check_ratio(Num, Denom) when is_number(Num), is_number(Denom), (Num / Denom) >= 2.0 ->
    high_ratio;
check_ratio(_, _) ->
    not_high.
```

> [!warning] Common Beginner Syntax Trap: Less-Than-Or-Equal (=<)
> Remember Chapter 1: in Erlang, less-than-or-equal is written as **`=<`**, NOT `<=`!
> Writing `Port <= 65535` will trigger a syntax compiler error. Always write `Port =< 65535`.

## Parallel Worked Example

Validating server health metrics and resource utilization:

```erlang
-module(health_guard).
-export([check_load/1, check_ratio/2]).

check_load(Load) when is_number(Load), Load >= 0.0, Load =< 1.0 ->
    optimal;
check_load(Load) when is_number(Load), Load > 1.0, Load =< 4.0 ->
    elevated;
check_load(Load) when is_number(Load), Load > 4.0 ->
    critical;
check_load(_) ->
    {error, invalid_metric}.

%% Demonstrating silent guard exception handling when Divisor is 0
check_ratio(Value, Divisor)
  when is_number(Value), is_number(Divisor), Divisor =/= 0, (Value / Divisor) >= 5.0 ->
    extreme_ratio;
check_ratio(Value, Divisor)
  when is_number(Value), is_number(Divisor), Divisor =/= 0 ->
    standard_ratio;
check_ratio(_, _) ->
    {error, invalid_ratio}.
```

## Official Erlang Docs & Function Reference

```erlang
%% Guard Sequence Grammar
Clause(Args) when Guard1, Guard2 -> ...;      %% Comma = AND
Clause(Args) when Guard1; Guard2 -> ... .     %% Semicolon = OR
```

## Assignment Specification

Implement three validation functions in `guard_validator.erl`:

1. `validate_port(Port)`:
   - If `Port` is an integer between `1024` and `65535` (inclusive), return `{ok, unprivileged_port}`.
   - If `Port` is an integer between `1` and `1023` (inclusive), return `{ok, privileged_port}`.
   - Otherwise, return `{error, invalid_port}`.

2. `classify_temperature(TempC)`:
   - If `TempC` is a number and `TempC =< 0`, return atom `freezing`.
   - If `TempC` is a number and `TempC > 0` AND `TempC =< 25`, return atom `temperate`.
   - If `TempC` is a number and `TempC > 25`, return atom `hot`.
   - For non-numeric input, return `{error, invalid_temperature}`.

3. `safe_ratio(A, B)`:
   - If `A` and `B` are numbers, `B =/= 0`, and `(A / B) >= 2.0`, return atom `high_ratio`.
   - If `A` and `B` are numbers, `B =/= 0`, and `(A / B) < 2.0`, return atom `normal_ratio`.
   - Fallback returns `{error, invalid_ratio}`.

## Rules & Verification Constraints

- Guard clauses (`when`) must be used for all range and type assertions.
- Do not use `<=` (use `=<`).
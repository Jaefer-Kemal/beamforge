## Why This Matters in Production

High-throughput backend systems must never crash due to integer overflow, precision loss, or unexpected type coercions. Telecom switches calculate billing in exact micro-cents, and bandwidth shapers throttle network packets based on microsecond quotas.

Erlang provides **arbitrary-precision integers (bignums)** natively: integers seamlessly expand to consume as much memory as needed without ever wrapping around or overflowing into negative numbers.

However, Erlang's operator syntax differs from C, Java, Python, and JavaScript in several subtle ways. Mastering these rules upfront will prevent hours of debugging obscure syntax errors.

## Deep Concept Breakdown & Under the Hood

### Arithmetic Operators
Erlang distinguishes between integer division and floating-point division:
- `+`, `-`, `*`: Standard addition, subtraction, multiplication.
- `div`: **Integer division** (e.g., `14 div 4` evaluates to `3`).
- `rem`: **Integer remainder / modulo** (e.g., `14 rem 4` evaluates to `2`).
- `/`: **Floating-point division** (e.g., `14 / 4` evaluates to `3.5`, and `4 / 2` evaluates to `2.0`). Even if both operands are integers, `/` always returns a float!

### Booleans & Logical Operators
In Erlang, booleans are not special runtime primitives: they are simply the atoms `true` and `false`.
- `andalso`: Short-circuit logical AND (if the left side is `false`, the right side is never evaluated).
- `orelse`: Short-circuit logical OR (if the left side is `true`, the right side is never evaluated).
- `not`: Logical negation.
*(Always prefer `andalso` and `orelse` over the older eager operators `and` and `or` to prevent unnecessary evaluation).*

### Comparison Operators

In Erlang, comparison operators are written using standard ASCII characters:

| Operator | Meaning | Example | Result | Critical Rule |
| :--- | :--- | :--- | :--- | :--- |
| **`=:=`** | Exact Equality | `42 =:= 42` | `true` | Checks value **and** type (`42 =:= 42.0` is `false`) |
| **`=/=`** | Exact Inequality | `42 =/= 42.0` | `true` | Negation of `=:=` |
| **`==`** | Loose Equality | `42 == 42.0` | `true` | Coerces integer to float |
| **`/=`** | Loose Inequality | `10 /= 20` | `true` | Negation of `==` |
| **`<`** | Strictly Less Than | `5 < 10` | `true` | Standard less-than |
| **`=<`** | Less Than or Equal | `5 =< 5` | `true` | **Erlang Syntax:** `=<` (Never `<=`) |
| **`>`** | Strictly Greater Than | `10 > 5` | `true` | Standard greater-than |
| **`>=`** | Greater Than or Equal | `10 >= 10` | `true` | Standard greater-than-or-equal |

> [!warning] Common Beginner Syntax Trap: The =< Comparison Operator
> In nearly every programming language, "less-than-or-equal" is written as `<=`.
> **In Erlang, less-than-or-equal is written as `=<`!**
> Why? Because `<=` is reserved in Erlang for binary comprehension generators. If you type `X <= 10`, the compiler will throw a confusing syntax error.
> Remember: `=<` (arrow pointing into the equal sign) means less-than-or-equal.

> [!warning] Exact Equality (=:=) vs. Loose Numeric Equality (==)
> Erlang has two equality operators:
> - `=:=` (**Exact Equality**): Compares both value **and type**. `42 =:= 42.0` is `false` because an integer is not a float.
> - `==` (**Loose Equality**): Coerces numbers. `42 == 42.0` is `true`.
> In production Erlang, **always use `=:=` and `=/=`** to avoid subtle numerical type bugs!

## Parallel Worked Example

Here is a calculation module determining server cooling thresholds and thermal status:

```erlang
-module(thermal_monitor).
-export([calc_average/2, is_identical_temp/2, is_safe_range/3]).

calc_average(SumTemp, SensorCount) ->
    SumTemp div SensorCount.

is_identical_temp(TempA, TempB) ->
    TempA =:= TempB.

is_safe_range(CurrentTemp, MaxSafe, Override) ->
    Override =:= true orelse (CurrentTemp >= 0 andalso CurrentTemp =< MaxSafe).
```

Notice:
- `div` computes the integer average.
- `=:=` verifies strict identical values.
- `=<` correctly enforces the upper threshold without using `<=`.
- `>=` correctly enforces the non-negative lower threshold.

## Official Erlang Docs & Function Reference

```erlang
%% Operator Precedence Table (Standard Erlang):
%% Highest:  +, - (unary)
%% High:     *, /, div, rem
%% Medium:   +, - (binary)
%% Low:      =:=, =/=, ==, /=, <, =<, >, >=
%% Lowest:   andalso, orelse
```

## Assignment Specification

Implement three calculation functions in `basic_types.erl`:

1. `calculate_bandwidth(Bytes, Seconds)`:
   - Takes integer `Bytes` and integer `Seconds`.
   - Converts bytes to bits by multiplying by `8`.
   - Computes the whole integer bits-per-second using integer division `div`.

2. `is_exact_match(ValA, ValB)`:
   - Returns `true` if `ValA` and `ValB` are strictly identical in both type and value using exact equality `=:=`.
   - Returns `false` otherwise.

3. `is_within_quota(UsedMb, LimitMb, IsAdmin)`:
   - Returns `true` if `IsAdmin` is exactly `true`.
   - OR (`orelse`) returns `true` if `UsedMb` is greater than or equal to `0` (`UsedMb >= 0`) AND (`andalso`) less than or equal to `LimitMb` (`UsedMb =< LimitMb`).
   - Returns `false` otherwise.

## Rules & Verification Constraints

- Do not use `when` guard clauses or `if`/`case` statements yet—rely entirely on boolean expressions.
- Remember to use `=<` for less-than-or-equal to avoid syntax errors.
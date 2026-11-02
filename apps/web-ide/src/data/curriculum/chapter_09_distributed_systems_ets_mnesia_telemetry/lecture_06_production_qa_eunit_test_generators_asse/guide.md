## Why This Matters in Production

In mission-critical BEAM architectures, dynamic typing gives incredible development velocity and runtime hot-code loading. But how do telecom switches, banking ledgers, and payment platforms guarantee that a function never crashes with a `function_clause` or `badarith` error in production?

The Erlang ecosystem solves this with a two-tiered Quality Assurance pipeline:
1. **Dialyzer (Discrepancy Analyzer for Erlang)**: Uses **Success Typing** to statically analyze your code without running it. It verifies that function arguments and return types strictly obey your `-spec` and `-type` declarations, catching type errors, dead code, and broken contracts at compile time!
2. **EUnit**: The standard unit testing framework built into OTP. EUnit allows developers to write unit tests directly alongside code, supporting assert macros (`?assertEqual`), test generators (`?_assertEqual`), and fixture setup/teardown pipelines.

> [!NOTE]
> **Static Checking vs Unit Testing:**
> - **Dialyzer (`-spec`):** Proves mathematically that no inputs will violate the declared types across all execution branches.
> - **EUnit (`eunit.hrl`):** Proves behaviorally that concrete execution produces the expected business logic results.

## Deep Concept Breakdown & Under the Hood

### Dialyzer Type Specifications (`-type` and `-spec`)

```erlang
-type currency() :: usd | eur | etb.
-type balance() :: non_neg_integer().

-spec calculate_fee(pos_integer(), currency()) -> non_neg_integer().
calculate_fee(Amount, usd) -> (Amount * 15) div 1000;
calculate_fee(Amount, eur) -> (Amount * 20) div 1000;
calculate_fee(Amount, etb) -> (Amount * 10) div 1000.
```

If you pass an atom `gbp` to `calculate_fee/2`, Dialyzer detects that the contract is breached before your code ever deploys to production!

### EUnit Test Assertions and Test Generators

When you include `-include_lib("eunit/include/eunit.hrl").`:
1. **Immediate Assertions**:
   - `?assertEqual(Expected, Expression)`: Evaluates `Expression` immediately and raises an exception if not identical (`=: = `).
   - `?assertMatch(Pattern, Expression)`: Matches result against a pattern.
   - `?assertError(Reason, Expression)`: Asserts that `Expression` crashes with error `Reason`.
2. **Test Generators (`_test_()` Functions)**:
   Functions ending in `_test_()` return a test representation (or list of tests) to be executed by EUnit. They use underscore-prefixed macros:
   - `?_assertEqual(Expected, Expression)`: Returns an executable fun test object.

### Parallel Worked Example: Pricing Contract with EUnit

```erlang
-module(pricing_contract).
-include_lib("eunit/include/eunit.hrl").

-type plan() :: free | pro | enterprise.
-spec discount(pos_integer(), plan()) -> non_neg_integer().
discount(Amount, free) -> 0;
discount(Amount, pro) -> (Amount * 10) div 100;
discount(Amount, enterprise) -> (Amount * 25) div 100.

pricing_test_() ->
    [
        ?_assertEqual(0, discount(100, free)),
        ?_assertEqual(10, discount(100, pro)),
        ?_assertEqual(25, discount(100, enterprise))
    ].
```

## 📖 Official Erlang Docs & Function Reference

```erlang
%% Official EUnit Macros (eunit/include/eunit.hrl)
?assertEqual(Expected, Expr)
?assertMatch(Pattern, Expr)
?assertError(Reason, Expr)

?_assertEqual(Expected, Expr)
?_assertMatch(Pattern, Expr)
```

## Assignment Specification

Implement module `ledger_specs_and_tests` exporting:
1. `calculate_fee(Amount, Currency) -> non_neg_integer()`:
   - `-type currency() :: usd | eur | etb.`
   - `-spec calculate_fee(pos_integer(), currency()) -> non_neg_integer().`
   - Returns fee: `usd` -> `(Amount * 15) div 1000`, `eur` -> `(Amount * 20) div 1000`, `etb` -> `(Amount * 10) div 1000`.
2. `validate_transfer_spec(Balance, Amount, Currency) -> {ok, Remaining} | {error, Reason}`:
   - `-spec validate_transfer_spec(non_neg_integer(), integer(), currency()) -> {ok, non_neg_integer()} | {error, insufficient_funds | invalid_amount}.`
   - Rejects `Amount =< 0` with `{error, invalid_amount}`.
   - Computes `TotalDeduction = Amount + calculate_fee(Amount, Currency)`.
   - If `Balance < TotalDeduction`, returns `{error, insufficient_funds}`.
   - Otherwise returns `{ok, Balance - TotalDeduction}`.
3. `run_unit_checks/0 -> ok` AND `run_unit_tests/0 -> ok`:
   - Runs built-in EUnit tests for the functions and returns `ok`.

## Rules & Verification Constraints
- Must define type specs using `-spec` and `-type`.
- Must include `-include_lib("eunit/include/eunit.hrl").`

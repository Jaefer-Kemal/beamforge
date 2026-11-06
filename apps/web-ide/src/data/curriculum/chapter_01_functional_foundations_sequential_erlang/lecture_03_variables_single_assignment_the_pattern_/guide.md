## Why This Matters in Production

In imperative languages (C++, Java, Go, Python), variables are mutable memory slots that can be modified at any time by any thread. When multiple threads modify the same variable concurrently, race conditions and corrupted states occur.

Erlang eliminates an entire class of concurrency bugs by enforcing **Single Assignment Immutability**:
- Once a variable is bound to a value, **it can never be changed**.
- A variable is not a mutable box; it is an immutable alias for a specific value.
- The `=` operator is not an assignment statement—**it is a pattern matching assertion**.

## Deep Concept Breakdown & Under the Hood

### Variable Naming Rule
In Erlang, variable names **must begin with an Uppercase letter** or an underscore (`_`):
- `Count`, `TotalAmount`, `UserProfile` are Variables.
- `count`, `total_amount`, `user_profile` are **Atoms** (constants)!
- If you start a variable name with a lowercase letter, the compiler treats it as a constant atom, causing confusion.

### The "=" Operator is a Pattern Matcher

When Erlang evaluates `Pattern = Expression`:

1. If the variable on the left is **unbound** (has no value yet), Erlang binds it to the value on the right:

```erlang
X = 10.  %% X is now bound to integer 10
```

2. If the variable is **already bound**, Erlang does not reassign it. Instead, it asserts that both sides are identical:

```erlang
X = 10.  %% Succeeds: 10 matches 10
X = 20.  %% CRASHES with {badmatch, 20}!
```

Because `X` is already `10`, evaluating `X = 20` asserts that `10 = 20`. Since that is false, the BEAM throws a runtime `badmatch` error!

### The Anonymous Wildcard Variable ("_")
If you need to match a value in a pattern but do not intend to use it, use the single underscore `_`. The wildcard matches any term without binding a variable name:
```erlang
{_, UserStatus} = {101, active}.  %% Discards ID 101, binds UserStatus = active
```

> [!warning] Common Beginner Syntax Trap: How to "Update" State
> Beginners often wonder: *If variables are immutable, how do I calculate updated values?*
> The answer: **Create a new, descriptively named variable!**
> Instead of modifying `Price = Price * 1.1`, write:
> ```erlang
> BasePrice    = 100,
> TaxedPrice   = BasePrice * 1.1,
> FinalPrice   = TaxedPrice - Discount.
> ```

## Parallel Worked Example

Here is a function that calculates tax and shipping sequentially while tracking intermediate stages:

```erlang
-module(invoice_calculator).
-export([calc_final/2, get_second_item/1]).

calc_final(Subtotal, ShippingRate) ->
    Stage1 = Subtotal,
    Stage2 = Stage1 + 15,            %% Add flat handling
    Stage3 = Stage2 + ShippingRate,   %% Add shipping
    Stage3.

get_second_item(Triple) ->
    {_, Second, _} = Triple,
    Second.
```

Notice:
- In `calc_final`, variables `Stage1`, `Stage2`, and `Stage3` progress the calculation without mutation.
- In `get_second_item`, `{_, Second, _} = Triple` discards the first and third elements using the `_` wildcard and extracts `Second`.

## Official Erlang Docs & Function Reference

```erlang
%% Erlang Reference Manual (Pattern Matching)
Pattern = Expression
  Evaluates Expression and matches result against Pattern.
  Unbound variables in Pattern are bound.
  If matching fails, a badmatch run-time error occurs.
```

## Assignment Specification

Implement two functions in `pattern_vars.erl`:

1. `rebind_update(Base, Increment)`:
   - Bind variable `V1 = Base`.
   - Bind variable `V2 = V1 + Increment`.
   - Bind variable `V3 = V2 * 2`.
   - Return `V3`.

2. `extract_middle(TripleTuple)`:
   - Given a 3-element tuple passed as `TripleTuple` (e.g., `{first, target, last}`).
   - Use the pattern matching operator `=` with the wildcard `_` in the function body to extract the middle element:
     `{_, Middle, _} = TripleTuple`.
   - Return `Middle`.

## Rules & Verification Constraints

- Do not attempt to mutate or rebind any variable already bound.
- Ensure all variable names start with an Uppercase letter.
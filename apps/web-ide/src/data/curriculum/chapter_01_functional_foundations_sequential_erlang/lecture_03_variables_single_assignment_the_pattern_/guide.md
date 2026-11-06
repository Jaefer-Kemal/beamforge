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

Here is a module demonstrating how sequential calculations progress state through new variable names, and how pattern matching with wildcards extracts payload data from network packets:

```erlang
-module(packet_calculator).
-export([calc_packet_fee/2, extract_payload/1]).

calc_packet_fee(BaseFee, PerByteRate) ->
    InitialCharge = BaseFee,
    HandlingFee   = InitialCharge + 5,             %% Add handling charge
    TotalCost     = HandlingFee + (PerByteRate * 4), %% Add byte usage charge
    TotalCost.

extract_payload(NetworkPacket) ->
    %% NetworkPacket has the format: {packet, SeqNumber, PayloadData}
    %% The wildcard '_' discards the tag and sequence number without binding them
    {_, _, PayloadData} = NetworkPacket,
    PayloadData.
```

Notice:
- In `calc_packet_fee`, variables `InitialCharge`, `HandlingFee`, and `TotalCost` progress the calculation sequentially without mutation.
- In `extract_payload`, `{_, _, PayloadData} = NetworkPacket` discards the first two elements using `_` and extracts `PayloadData`.

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
   - Bind variable `V1` to `Base`.
   - Bind variable `V2` to `V1 + Increment`.
   - Bind variable `V3` to `V2 * 2`.
   - Return `V3`.

2. `extract_middle(TripleTuple)`:
   - Given a 3-element tuple passed as `TripleTuple` (e.g., `{alpha, target_val, omega}`).
   - Use the pattern matching operator `=` with the wildcard `_` to discard the first and third elements, extracting only the middle value.
   - Return the extracted middle value.

## Rules & Verification Constraints

- Do not attempt to mutate or rebind any variable already bound.
- Ensure all variable names start with an Uppercase letter.
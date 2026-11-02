## Why This Matters in Production

In mainstream programming languages, decision-making is expressed using nested `if / else if / else` branches or `switch / case` statements. In Erlang, branching is elevated to the function signature itself through **Multi-Clause Functions**.

When a function is called, the BEAM VM matches the arguments against each clause from top to bottom. The first clause whose pattern matches the arguments executes.

However, writing multi-clause functions requires understanding Erlang's most famous punctuation convention: **The Punctuation Triad**.

## Deep Concept Breakdown & Under the Hood

### The Punctuation Triad Explained
Erlang's punctuation is based on the logic of formal written English:

1. **, (Comma) — "AND THEN"**:
   Separates expressions inside the body of a clause.
   ```erlang
   Step1 = calculate_tax(),
   Step2 = apply_discount(Step1)  %% comma tells compiler: "continue to next line"
   ```

2. **; (Semicolon) — "OR ELSE"**:
   Separates alternative clauses of the **same function and arity**.
   ```erlang
   status(200) -> ok;             %% semicolon tells compiler: "or try next clause"
   status(404) -> not_found       %% no semicolon on the final clause
   ```

3. **. (Period) — "FULL STOP"**:
   Placed **only at the very end of the entire function definition**.
   ```erlang
   status(500) -> error.          %% period tells compiler: "function definition complete"
   ```

> [!warning] The Most Common Beginner Compiler Error
> Putting a period (`.`) instead of a semicolon (`;`) between function clauses immediately terminates the function!
> If you write:
> ```erlang
> handle(ok) -> success.
> handle(error) -> failure.
> ```
> The compiler will scream: `defining already defined function handle/1` or `syntax error before: '->'`!
> **Rule:** Use `;` between clauses; use `.` only after the last clause.

### Matching Repeated Variables in Patterns
Erlang allows the **same variable to appear multiple times in a single pattern**.
When a variable appears twice, Erlang asserts that both values must be identical:
```erlang
is_pair_equal({X, X}) -> {matched, X};
is_pair_equal(_)      -> mismatch.
```
If called with `{alpha, alpha}`, `X` binds to `alpha` on the left and asserts `alpha` on the right. The clause matches!
If called with `{alpha, beta}`, the first clause fails, falling through to the wildcard catch-all clause.

## Parallel Worked Example

Here is an HTTP status code classifier demonstrating the punctuation triad and catch-all clauses:

```erlang
-module(http_classifier).
-export([categorize/1, first_or_fallback/2, same_origin/1]).

categorize(200) -> {ok, success};
categorize(201) -> {ok, created};
categorize(404) -> {error, not_found};
categorize(500) -> {error, server_error};
categorize(_)   -> {error, unknown_status}.

first_or_fallback([Head | _], _Fallback) -> Head;
first_or_fallback([], Fallback)          -> Fallback.

same_origin({Host, Host}) -> {same, Host};
same_origin(_)            -> different_origins.
```

Notice:
- Each clause of `categorize/1` ends with a semicolon `;`, while the final clause ends with a period `.`.
- `first_or_fallback/2` handles non-empty vs empty list clauses.
- `same_origin/1` asserts identical host tuples using repeated variable `Host`.

## Official Erlang Docs & Function Reference

```erlang
%% Erlang Reference Manual (Function Definition Syntax)
Name(Patterns1) -> Body1;
Name(Patterns2) -> Body2;
...
Name(PatternsN) -> BodyN.
  Clauses are evaluated sequentially from top to bottom.
  First matching pattern executes.
  If no pattern matches, a function_clause run-time exception occurs.
```

## Assignment Specification

Implement three multi-clause functions in `clause_router.erl`:

1. `describe_status(Code)`:
   - Match `200` -> return `{ok, success}`.
   - Match `404` -> return `{error, not_found}`.
   - Match `500` -> return `{error, server_crash}`.
   - Catch-all wildcard `_` -> return `{error, unknown_code}`.

2. `head_or_default(List, Default)`:
   - First clause: Matches a non-empty list `[H | _]` -> returns `H`.
   - Second clause: Matches the empty list `[]` -> returns `Default`.

3. `verify_identical_pair(PairTuple)`:
   - First clause: Matches a 2-tuple with identical elements `{X, X}` -> returns `{matched, X}`.
   - Second clause: Wildcard `_` -> returns `mismatch`.

## Rules & Verification Constraints

- Follow the punctuation triad strictly: separate clauses of the same function with `;` and terminate each function with `.`.
- Do not use `case` or `if` expressions—rely entirely on multi-clause function head pattern matching.
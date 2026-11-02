## Why This Matters in Production

A foundational dilemma every backend engineer faces when designing APIs in Erlang is:
*When should a function return a tagged tuple like `{ok, Value} | {error, Reason}`, and when should it raise an exception?*

In languages with unchecked runtime exceptions (like Python or JavaScript), functions often raise exceptions for routine business conditions (e.g., `raise UserNotFoundError()`). Callers forget to wrap the call in `try/catch`, causing unhandled exceptions to crash the entire HTTP worker or thread pool.

In Erlang, the community established a clear, unambiguous **Golden Rule of API Design**:
1. **Expected Business Outcomes $\rightarrow$ Tagged Tuples:** If an error is an expected possibility in standard operation (e.g., a user enters an invalid email, a credit card is declined, or a division denominator is zero in user input), the function **must return `{ok, Value}` or `{error, Reason}`**.
2. **Corrupted Invariants & Bugs $\rightarrow$ Exceptions:** If a function's caller passes a malformed internal record, violates a cryptographic invariant, or crashes on an unexpected database response, raise an exception or let pattern matching fail with `badmatch` so the process terminates and the supervisor intervenes.

## Deep Concept Breakdown & Under the Hood

### 1. Tagged Tuples Force Explicit Error Handling
When a function returns `{ok, Result} | {error, Reason}`, callers cannot accidentally ignore failures. The caller naturally uses pattern matching:

```erlang
case domain_validator:check_amount(UserInput) of
    {ok, ValidAmount} ->
        proceed_with_charge(ValidAmount);
    {error, Reason} ->
        render_user_error(Reason)
end
```

### 2. Composing Validation Pipelines with `case` or Local `throw`
When an operation requires multiple sequential validations (e.g., validating an email, checking a balance, and splitting a total across participants), nested `case ... of` ladders can become verbose.

Erlang engineers frequently use a clean pipeline pattern where helper functions return tagged tuples, or an internal private helper uses `throw` inside a localized `try` block to short-circuit upon the first validation failure:

```erlang
validate_checkout(Email, Total, Splits) ->
    try
        ValidEmail = unwrap(validate_email(Email)),
        ValidTotal = unwrap(check_amount(Total)),
        ValidShare = unwrap(safe_divide(ValidTotal, Splits)),
        {ok, #{email => ValidEmail, share => ValidShare}}
    catch
        throw:{validation_error, Reason} ->
            {error, Reason}
    end.

unwrap({ok, Val}) -> Val;
unwrap({error, Reason}) -> throw({validation_error, Reason}).
```

> [!warning] Fault-Tolerance Trap: Never Crash on User Input
> Network servers and public APIs must never crash when receiving malformed user payloads. Crashing on user input creates trivial Denial-of-Service (DoS) vulnerabilities where malicious clients flood the node with bad strings to overwhelm BEAM supervisors. Always return `{error, Reason}` at external input boundaries.

## Parallel Worked Example

Consider a user profile updater validating username and age:

```erlang
-module(profile_validator).
-export([check_age/1, check_username/1, create_profile/2]).

check_age(Age) when is_integer(Age), Age >= 18 -> {ok, Age};
check_age(Age) when is_integer(Age)            -> {error, under_age};
check_age(_)                                   -> {error, invalid_age_type}.

check_username(Name) when is_binary(Name), byte_size(Name) >= 3 -> {ok, Name};
check_username(Name) when is_binary(Name)                       -> {error, username_too_short};
check_username(_)                                               -> {error, invalid_username_type}.

create_profile(Name, Age) ->
    case check_username(Name) of
        {ok, ValidName} ->
            case check_age(Age) of
                {ok, ValidAge} ->
                    {ok, #{username => ValidName, age => ValidAge}};
                {error, AgeErr} ->
                    {error, AgeErr}
            end;
        {error, NameErr} ->
            {error, NameErr}
    end.
```

## Assignment Specification

Implement `src/domain_validator.erl` exporting `safe_divide/2`, `check_amount/1`, `validate_email/1`, and `process_checkout_input/3`:

1. `safe_divide(Numerator, Denominator)`:
   - If `not (is_number(Numerator) andalso is_number(Denominator))` -> returns `{error, non_numeric}`.
   - If `Denominator == 0` -> returns `{error, division_by_zero}`.
   - Otherwise -> returns `{ok, Numerator / Denominator}`.
2. `check_amount(Amount)`:
   - If `is_integer(Amount) andalso Amount > 0` -> returns `{ok, Amount}`.
   - If `is_integer(Amount) andalso Amount =< 0` -> returns `{error, non_positive_amount}`.
   - Otherwise -> returns `{error, invalid_type}`.
3. `validate_email(EmailBin)`:
   - Checks that `EmailBin` is a binary containing exactly one `@` symbol with non-empty username and domain parts, and that the domain contains at least one dot (`.`).
   - If valid -> returns `{ok, EmailBin}`.
   - If invalid or not a binary -> returns `{error, invalid_email}`.
4. `process_checkout_input(EmailBin, TotalAmount, SplitCount)`:
   - Validates all three parameters using the helpers above.
   - If any validation fails, immediately returns `{error, Reason}` for the first failing field (order: email first, amount second, split count third).
   - If all succeed -> returns `{ok, #{email => EmailBin, per_person => Share}}`.

## Rules & Verification Constraints

- Must return tagged tuples `{ok, ...}` or `{error, ...}`; no unhandled exceptions allowed.

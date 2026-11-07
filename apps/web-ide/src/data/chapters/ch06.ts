import { LessonContent } from '../../types/workspace';

export const CHAPTER_6_LESSONS: LessonContent[] = [
  // ── Lesson 6.1: Concept Exercise ───────────────────────────────────────────
  {
    id: 'ch06-l01',
    chapterNumber: 6,
    lessonNumber: 1,
    lessonType: 'concept_exercise',
    title: 'Sequential Exceptions: throw, error, exit & Pattern Matching try...catch',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In classical languages like Java, C++, Python, or TypeScript, developers are conditioned to rely on defensive programming: wrapping entire call stacks in blanket \`try { ... } catch (Exception e)\` blocks. When an unexpected error occurs, the catch block catches the exception, logs a generic stacktrace, and leaves the application running in **partially mutated, corrupt memory**. This corrupted state quietly spreads, eventually triggering subtle data loss or cascading outages hours later.

Erlang approaches reliability from the opposite, battle-tested philosophy: **"Let It Crash"**. In Erlang, processes are isolated memory containers. If an actor encounters invalid internal state, it should terminate immediately, letting its supervisor clean up its resources and restart it from a known-good configuration.

However, **at the outer boundaries of your system**—such as parsing untrusted network bytes from an external TCP socket or verifying incoming HTTP request payloads—you must classify incoming errors without terminating the supervisor. In sequential Erlang, this classification is handled by **\`try ... catch Class:Reason -> ... end\`**.

## Deep Concept Breakdown & Under the Hood

Unlike languages that have a single generic \`Exception\` base class, the BEAM runtime classifies sequential exceptions into **three distinct classes**, each carrying a precise architectural intent:

| Exception Class | Invocation Primitive | Production Semantics & Intended Usage |
| :--- | :--- | :--- |
| **\`throw(Value)\`** | \`throw(Value)\` | **Non-Local Return / Expected Domain Flow:** Used for intentional, expected early termination across deep recursion (e.g., aborting a nested syntax tree walk upon finding a target node, or signaling expected business validation failures like \`throw(key_not_found)\`). Callers are explicitly expected to catch throws. |
| **\`error(Reason)\`** | \`erlang:error(Reason)\` | **Runtime Bugs & Contract Violations:** Generated automatically by the BEAM for VM errors (\`badarith\`, \`badmatch\`, \`function_clause\`, \`badarg\`) or raised explicitly via \`erlang:error(Reason)\`. It automatically captures the full process stacktrace (\`Class:Reason:Stacktrace\`). |
| **\`exit(Reason)\`** | \`exit(Reason)\` | **Intentional Process Termination:** Signals that the current process deliberately wishes to stop running (e.g., \`exit(normal)\`, \`exit(shutdown)\`, or \`exit(database_unreachable)\`). When uncaught, it converts into an exit signal sent to linked processes. |

### Pattern Matching on Exception Classes

To catch and differentiate these three classes in sequential code, Erlang provides pattern-matching syntax inside \`catch\`:

\`\`\`erlang
try
    evaluate_untrusted_input(Input)
catch
    throw:DomainError ->
        {expected_rejection, DomainError};
    error:RuntimeCrash ->
        {internal_bug, RuntimeCrash};
    exit:HaltSignal ->
        {subsystem_stopped, HaltSignal}
end
\`\`\`

> [!warning] Fault-Tolerance Trap: The Default Catch Class is \`throw\`!
> If you write \`catch Pattern -> ...\` without specifying an explicit class prefix (e.g., \`catch Reason -> {error, Reason}\`), the BEAM defaults to matching **\`throw\` only**! It will completely ignore \`error:...\` and \`exit:...\` exceptions, causing your process to crash unexpectedly. Always write \`Class:Reason\` when you intend to intercept general exceptions.

## Parallel Worked Example

The following module inspects hardware sensor telemetry packets, classifying invalid readings and status flags with the appropriate exception primitive:

\`\`\`erlang
-module(telemetry_codec).
-export([
    validate_telemetry/1,
    classify_telemetry/1,
    raise_signal/2
]).

%% @doc Validates a raw sensor packet: {sensor, DeviceId, Reading, Unit}
validate_telemetry({sensor, DeviceId, Reading, Unit}) ->
    if
        not is_number(Reading) ->
            erlang:error(malformed_reading_type);
        Reading < -273.15 ->
            throw(sub_absolute_zero);
        Reading == 0 ->
            exit(sensor_quiescent_abort);
        Unit =/= celsius andalso Unit =/= kelvin andalso Unit =/= fahrenheit ->
            throw({unsupported_unit, Unit});
        true ->
            {valid, DeviceId, Reading, Unit}
    end;
validate_telemetry(_Invalid) ->
    erlang:error(invalid_packet_format).

%% @doc Evaluates validation inside try...catch, normalizing each class
classify_telemetry(PacketTuple) ->
    try validate_telemetry(PacketTuple) of
        {valid, DeviceId, Reading, Unit} ->
            {accepted, DeviceId, Reading, Unit}
    catch
        throw:Reason ->
            {quarantined, Reason};
        error:Reason ->
            {protocol_violation, Reason};
        exit:Reason ->
            {stream_terminated, Reason}
    end.

%% @doc Directly raises the requested exception class and reason
raise_signal(throw, Reason) ->
    throw(Reason);
raise_signal(error, Reason) ->
    erlang:error(Reason);
raise_signal(exit, Reason) ->
    exit(Reason).
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% BIFs: erlang (erts)
throw(Any) -> no_return()
erlang:error(Reason) -> no_return()
erlang:error(Reason, Args) -> no_return()
exit(Reason) -> no_return()
\`\`\`

## Assignment Specification

Implement \`src/exception_classifier.erl\` exporting \`check_payment/1\`, \`safe_check/1\`, and \`trigger_class/2\`:

### 1. \`check_payment/1\`
- **Input**: \`PaymentTuple\` — expected structure \`{payment, Amount, Currency}\`.
- **Behavior**: Validates payment parameters and returns \`{approved, Amount, Currency}\` when valid:
  - If \`Amount\` is not an integer: raises \`erlang:error(bad_amount_type)\`.
  - If \`Amount < 0\`: throws \`throw(negative_amount)\`.
  - If \`Amount =:= 0\`: deliberately terminates the flow via \`exit(zero_payment_abort)\`.
  - If \`Currency\` is not an approved currency atom (\`usd\`, \`eur\`, or \`etb\`): throws \`throw({unsupported_currency, Currency})\`.
  - If \`PaymentTuple\` does not match the 3-element payment tuple structure: raises \`erlang:error(invalid_payment_tuple)\`.
- **Examples**:
  - \`exception_classifier:check_payment({payment, 150, usd})\` returns \`{approved, 150, usd}\`.

### 2. \`safe_check/1\`
- **Input**: \`PaymentTuple\`.
- **Behavior**: Evaluates \`check_payment(PaymentTuple)\` inside an isolated \`try ... catch\` expression, converting successes and each exception class into a standardized tagged return tuple:
  - Successful validation: returns \`{approved, Amount, Currency}\`.
  - On \`throw:Reason\`: returns \`{rejected, Reason}\`.
  - On \`error:Reason\`: returns \`{bug_detected, Reason}\`.
  - On \`exit:Reason\`: returns \`{process_aborted, Reason}\`.
- **Examples**:
  - \`exception_classifier:safe_check({payment, 200, usd})\` returns \`{approved, 200, usd}\`.
  - \`exception_classifier:safe_check({payment, -10, usd})\` returns \`{rejected, negative_amount}\`.
  - \`exception_classifier:safe_check({payment, "not_int", usd})\` returns \`{bug_detected, bad_amount_type}\`.
  - \`exception_classifier:safe_check({payment, 0, usd})\` returns \`{process_aborted, zero_payment_abort}\`.
  - \`exception_classifier:safe_check({payment, 50, gbp})\` returns \`{rejected, {unsupported_currency, gbp}}\`.

### 3. \`trigger_class/2\`
- **Input**: \`ClassAtom\` (one of \`throw\`, \`error\`, or \`exit\`), and \`Reason\` (any Erlang term).
- **Behavior**: Directly invokes the requested exception primitive:
  - When \`ClassAtom =:= throw\`: invokes \`throw(Reason)\`.
  - When \`ClassAtom =:= error\`: invokes \`erlang:error(Reason)\`.
  - When \`ClassAtom =:= exit\`: invokes \`exit(Reason)\`.
- **Examples**:
  - \`exception_classifier:trigger_class(throw, custom_reason)\` raises \`throw:custom_reason\`.
  - \`exception_classifier:trigger_class(error, custom_err)\` raises \`error:custom_err\`.
  - \`exception_classifier:trigger_class(exit, custom_exit)\` raises \`exit:custom_exit\`.

## Rules & Verification Constraints

- Must export \`check_payment/1\`, \`safe_check/1\`, and \`trigger_class/2\`.
- Must use \`try ... catch\` in \`safe_check/1\` (enforced by AST rule \`requiredConstructs: ["try_catch"]\`).
`,
    mentalModelCheck: {
      question: 'In Erlang, what happens if you write `try Expr catch Reason -> handle(Reason) end` without specifying an exception class prefix?',
      codeSnippet: `try
    1 / 0
catch
    Reason -> {caught, Reason}
end.`,
      options: [
        {
          id: 'A',
          label: 'The expression crashes with badarith because omitting the class prefix defaults strictly to matching `throw`, failing to catch runtime errors.',
          isCorrect: true,
          explanation: 'Correct! In Erlang syntax, `catch Pattern ->` without a class prefix matches only `throw:Pattern`. Runtime bugs like `badarith` raise `error:badarith`, which will bypass the catch and crash the process.',
        },
        {
          id: 'B',
          label: 'The clause catches all throws, errors, and exits identically.',
          isCorrect: false,
          explanation: 'To catch all three classes, you must explicitly specify `Class:Reason ->`.',
        },
        {
          id: 'C',
          label: 'The compiler throws a syntax error rejecting catch clauses without class prefixes.',
          isCorrect: false,
          explanation: 'Omitting the prefix is valid syntax, but it strictly restricts matching to throws.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'error',
        module: 'erlang',
        signature: 'erlang:error(Reason) -> no_return()',
        typesSpec: ['Reason = term()'],
        description: 'Stops execution of the calling process with reason {Reason, Stacktrace}. Used for runtime bugs.',
        complexityNote: 'O(1) exception unwinding.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#error/1',
      },
      {
        functionName: 'throw',
        module: 'erlang',
        signature: 'throw(Any) -> no_return()',
        typesSpec: ['Any = term()'],
        description: 'Throws a non-local value designed to be caught by an enclosing try/catch expression.',
        complexityNote: 'O(1) stack unwind to the nearest catch frame.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#throw/1',
      },
      {
        functionName: 'exit',
        module: 'erlang',
        signature: 'exit(Reason) -> no_return()',
        typesSpec: ['Reason = term()'],
        description: 'Terminates the process with deliberate exit Reason. Triggers exit signal propagation.',
        complexityNote: 'O(1) process termination trigger.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#exit/1',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch06-01-1',
        title: 'Approved Payment',
        erlangCall: 'exception_classifier:safe_check({payment, 150, usd})',
        expectedOutput: '{approved, 150, usd}',
        explanation: 'Valid positive USD payment passes checks and returns approved tuple.',
      },
      {
        id: 'tc-ch06-01-2',
        title: 'Caught Throw: Negative Amount Rejection',
        erlangCall: 'exception_classifier:safe_check({payment, -50, eur})',
        expectedOutput: '{rejected, negative_amount}',
        explanation: 'Negative amount triggers throw(negative_amount), caught and formatted as rejected.',
      },
      {
        id: 'tc-ch06-01-3',
        title: 'Caught Error: Bad Amount Type Bug',
        erlangCall: 'exception_classifier:safe_check({payment, "150", usd})',
        expectedOutput: '{bug_detected, bad_amount_type}',
        explanation: 'String amount raises error(bad_amount_type), caught and mapped to bug_detected.',
      },
      {
        id: 'tc-ch06-01-4',
        title: 'Caught Exit: Zero Payment Abort',
        erlangCall: 'exception_classifier:safe_check({payment, 0, etb})',
        expectedOutput: '{process_aborted, zero_payment_abort}',
        explanation: 'Zero payment triggers exit(zero_payment_abort), safely intercepted in safe_check.',
      },
    ],
    astRules: {
      requiredConstructs: ['try_catch'],
    },
    solutionExplanation: 'Implements check_payment using throw for domain rejections, error for type bugs, and exit for zero payment aborts, with safe_check normalizing each class distinctly.',
    starterCode: `-module(exception_classifier).
-export([
    check_payment/1,
    safe_check/1,
    trigger_class/2
]).

%% @doc Validates incoming payment parameters, classifying anomalies using
%% throw, error, or exit according to system reliability rules.
check_payment(PaymentTuple) ->
    ok.

%% @doc Evaluates payment validation inside an isolated try...catch boundary,
%% normalizing successes and each exception class into safe tagged tuples.
safe_check(PaymentTuple) ->
    ok.

%% @doc Directly invokes the specified BEAM exception primitive.
trigger_class(ClassAtom, Reason) ->
    ok.
`,
    solutionCode: `-module(exception_classifier).
-export([
    check_payment/1,
    safe_check/1,
    trigger_class/2
]).

check_payment({payment, Amount, Currency}) ->
    if
        not is_integer(Amount) ->
            erlang:error(bad_amount_type);
        Amount < 0 ->
            throw(negative_amount);
        Amount =:= 0 ->
            exit(zero_payment_abort);
        Currency =/= usd andalso Currency =/= eur andalso Currency =/= etb ->
            throw({unsupported_currency, Currency});
        true ->
            {approved, Amount, Currency}
    end;
check_payment(_InvalidTuple) ->
    erlang:error(invalid_payment_tuple).

safe_check(PaymentTuple) ->
    try check_payment(PaymentTuple) of
        {approved, Amount, Currency} ->
            {approved, Amount, Currency}
    catch
        throw:Reason ->
            {rejected, Reason};
        error:Reason ->
            {bug_detected, Reason};
        exit:Reason ->
            {process_aborted, Reason}
    end.

trigger_class(throw, Reason) ->
    throw(Reason);
trigger_class(error, Reason) ->
    erlang:error(Reason);
trigger_class(exit, Reason) ->
    exit(Reason).
`,
    files: [
      {
        name: 'exception_classifier.erl',
        path: 'src/exception_classifier.erl',
        content: `-module(exception_classifier).
-export([
    check_payment/1,
    safe_check/1,
    trigger_class/2
]).

%% @doc Validates incoming payment parameters, classifying anomalies using
%% throw, error, or exit according to system reliability rules.
check_payment(PaymentTuple) ->
    ok.

%% @doc Evaluates payment validation inside an isolated try...catch boundary,
%% normalizing successes and each exception class into safe tagged tuples.
safe_check(PaymentTuple) ->
    ok.

%% @doc Directly invokes the specified BEAM exception primitive.
trigger_class(ClassAtom, Reason) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/exception_classifier.erl': `-module(exception_classifier).
-export([
    check_payment/1,
    safe_check/1,
    trigger_class/2
]).

check_payment({payment, Amount, Currency}) ->
    if
        not is_integer(Amount) ->
            erlang:error(bad_amount_type);
        Amount < 0 ->
            throw(negative_amount);
        Amount =:= 0 ->
            exit(zero_payment_abort);
        Currency =/= usd andalso Currency =/= eur andalso Currency =/= etb ->
            throw({unsupported_currency, Currency});
        true ->
            {approved, Amount, Currency}
    end;
check_payment(_InvalidTuple) ->
    erlang:error(invalid_payment_tuple).

safe_check(PaymentTuple) ->
    try check_payment(PaymentTuple) of
        {approved, Amount, Currency} ->
            {approved, Amount, Currency}
    catch
        throw:Reason ->
            {rejected, Reason};
        error:Reason ->
            {bug_detected, Reason};
        exit:Reason ->
            {process_aborted, Reason}
    end.

trigger_class(throw, Reason) ->
    throw(Reason);
trigger_class(error, Reason) ->
    erlang:error(Reason);
trigger_class(exit, Reason) ->
    exit(Reason).
`,
    },
  },

  // ── Lesson 6.2: Concept Exercise ───────────────────────────────────────────
  {
    id: 'ch06-l02',
    chapterNumber: 6,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'Safe Operations & Return Values ({ok, Val} | {error, Reason}) vs. Exceptions',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

A foundational dilemma every backend engineer faces when designing APIs in Erlang is:
*When should a function return a tagged tuple like \`{ok, Value} | {error, Reason}\`, and when should it raise an exception?*

In languages with unchecked runtime exceptions (like Python or JavaScript), functions often raise exceptions for routine business conditions (e.g., \`raise UserNotFoundError()\`). Callers forget to wrap the call in \`try/catch\`, causing unhandled exceptions to crash the entire HTTP worker or thread pool.

In Erlang, the community established a clear, unambiguous **Golden Rule of API Design**:
1. **Expected Business Outcomes $\\rightarrow$ Tagged Tuples:** If an error is an expected possibility in standard operation (e.g., a user enters an invalid email, a credit card is declined, or a division denominator is zero in user input), the function **must return \`{ok, Value}\` or \`{error, Reason}\`**.
2. **Corrupted Invariants & Bugs $\\rightarrow$ Exceptions:** If a function's caller passes a malformed internal record, violates a cryptographic invariant, or crashes on an unexpected database response, raise an exception or let pattern matching fail with \`badmatch\` so the process terminates and the supervisor intervenes.

## Deep Concept Breakdown & Under the Hood

### 1. Tagged Tuples Force Explicit Error Handling
When a function returns \`{ok, Result} | {error, Reason}\`, callers cannot accidentally ignore failures. The caller naturally uses pattern matching:

\`\`\`erlang
case domain_validator:check_amount(UserInput) of
    {ok, ValidAmount} ->
        proceed_with_charge(ValidAmount);
    {error, Reason} ->
        render_user_error(Reason)
end
\`\`\`

### 2. Composing Validation Pipelines with \`case\` or Local \`throw\`
When an operation requires multiple sequential validations (e.g., validating an email, checking a balance, and splitting a total across participants), nested \`case ... of\` ladders can become verbose.

Erlang engineers frequently use a clean pipeline pattern where helper functions return tagged tuples, or an internal private helper uses \`throw\` inside a localized \`try\` block to short-circuit upon the first validation failure:

\`\`\`erlang
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
\`\`\`

> [!warning] Fault-Tolerance Trap: Never Crash on User Input
> Network servers and public APIs must never crash when receiving malformed user payloads. Crashing on user input creates trivial Denial-of-Service (DoS) vulnerabilities where malicious clients flood the node with bad strings to overwhelm BEAM supervisors. Always return \`{error, Reason}\` at external input boundaries.

## Parallel Worked Example

Consider a user profile updater validating username and age:

\`\`\`erlang
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
\`\`\`

## Assignment Specification

Implement \`src/domain_validator.erl\` exporting \`safe_divide/2\`, \`check_amount/1\`, \`validate_email/1\`, and \`process_checkout_input/3\`:

1. \`safe_divide(Numerator, Denominator)\`:
   - If \`not (is_number(Numerator) andalso is_number(Denominator))\` -> returns \`{error, non_numeric}\`.
   - If \`Denominator == 0\` -> returns \`{error, division_by_zero}\`.
   - Otherwise -> returns \`{ok, Numerator / Denominator}\`.
2. \`check_amount(Amount)\`:
   - If \`is_integer(Amount) andalso Amount > 0\` -> returns \`{ok, Amount}\`.
   - If \`is_integer(Amount) andalso Amount =< 0\` -> returns \`{error, non_positive_amount}\`.
   - Otherwise -> returns \`{error, invalid_type}\`.
3. \`validate_email(EmailBin)\`:
   - Checks that \`EmailBin\` is a binary containing exactly one \`@\` symbol with non-empty username and domain parts, and that the domain contains at least one dot (\`.\`).
   - If valid -> returns \`{ok, EmailBin}\`.
   - If invalid or not a binary -> returns \`{error, invalid_email}\`.
4. \`process_checkout_input(EmailBin, TotalAmount, SplitCount)\`:
   - Validates all three parameters using the helpers above.
   - If any validation fails, immediately returns \`{error, Reason}\` for the first failing field (order: email first, amount second, split count third).
   - If all succeed -> returns \`{ok, #{email => EmailBin, per_person => Share}}\`.

## Rules & Verification Constraints

- Must return tagged tuples \`{ok, ...}\` or \`{error, ...}\`; no unhandled exceptions allowed.
`,
    mentalModelCheck: {
      question: 'Why does idiomatic Erlang insist on returning `{error, Reason}` for user input validation rather than calling `erlang:error(invalid_input)`?',
      codeSnippet: `%% Approach A:
validate(Amount) -> erlang:error(invalid_amount).

%% Approach B:
validate(Amount) -> {error, invalid_amount}.`,
      options: [
        {
          id: 'A',
          label: 'User input validation errors are normal, expected business data; returning `{error, Reason}` forces callers to handle failure explicitly without crashing supervisors or risking DoS.',
          isCorrect: true,
          explanation: 'Correct! Expected domain failures are data terms. Raising exceptions on user input causes unnecessary process crashes and risks Denial-of-Service under hostile client traffic.',
        },
        {
          id: 'B',
          label: 'The BEAM runtime automatically blocks any process that calls erlang:error.',
          isCorrect: false,
          explanation: 'erlang:error does not block processes; it causes immediate process unwinding.',
        },
        {
          id: 'C',
          label: 'Tagged tuples execute 100x faster than boolean returns.',
          isCorrect: false,
          explanation: 'The difference is architectural clarity and error-handling discipline, not raw instruction speed.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'split',
        module: 'binary',
        signature: 'binary:split(Subject, Pattern) -> [binary()]',
        typesSpec: ['Subject = binary()', 'Pattern = binary() | [binary()]'],
        description: 'Splits Subject into binary chunks separated by Pattern.',
        complexityNote: 'O(N) optimized Boyer-Moore search.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#split/2',
      },
      {
        functionName: 'match',
        module: 'binary',
        signature: 'binary:match(Subject, Pattern) -> {Pos, Len} | nomatch',
        typesSpec: ['Subject = binary()', 'Pattern = binary()'],
        description: 'Searches for the first occurrence of Pattern in Subject.',
        complexityNote: 'O(N) zero-copy byte scan.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#match/2',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch06-02-1',
        title: 'Safe Division Success and Zero Division',
        erlangCall: '{domain_validator:safe_divide(100, 4), domain_validator:safe_divide(100, 0)}',
        expectedOutput: '{{ok, 25.0}, {error, division_by_zero}}',
        explanation: 'Confirms safe_divide returns float result on success and tagged error on zero division.',
      },
      {
        id: 'tc-ch06-02-2',
        title: 'Email Validation Check',
        erlangCall: '{domain_validator:validate_email(<<"alice@beamforge.io">>), domain_validator:validate_email(<<"invalid_email">>)}',
        expectedOutput: '{{ok, <<"alice@beamforge.io">>}, {error, invalid_email}}',
        explanation: 'Validates RFC-like email structure with @ and domain dot.',
      },
      {
        id: 'tc-ch06-02-3',
        title: 'Composite Checkout Pipeline',
        erlangCall: 'domain_validator:process_checkout_input(<<"bob@beamforge.io">>, 300, 3)',
        expectedOutput: '{ok, #{email => <<"bob@beamforge.io">>, per_person => 100.0}}',
        explanation: 'Validates email, amount, and split count, returning calculated per-person share in map.',
      },
    ],
    astRules: {},
    solutionExplanation: 'Implements safe tagged tuple returns across division, integer checking, email binary pattern matching, and a sequential checkout validation pipeline.',
    starterCode: `-module(domain_validator).
-export([
    safe_divide/2,
    check_amount/1,
    validate_email/1,
    process_checkout_input/3
]).

%% Divides Numerator by Denominator safely
%% - non-numeric -> {error, non_numeric}
%% - Denominator == 0 -> {error, division_by_zero}
%% - otherwise -> {ok, Numerator / Denominator}
safe_divide(Numerator, Denominator) ->
    ok.

%% Checks positive integer amount
%% - integer > 0 -> {ok, Amount}
%% - integer =< 0 -> {error, non_positive_amount}
%% - otherwise -> {error, invalid_type}
check_amount(Amount) ->
    ok.

%% Validates email binary has non-empty username, '@', and domain with '.'
%% - valid -> {ok, EmailBin}
%% - invalid -> {error, invalid_email}
validate_email(EmailBin) ->
    ok.

%% Composes email, amount, and split validation into a checkout summary
%% - on any error -> {error, FirstReason}
%% - all valid -> {ok, #{email => EmailBin, per_person => Share}}
process_checkout_input(EmailBin, TotalAmount, SplitCount) ->
    ok.
`,
    solutionCode: `-module(domain_validator).
-export([
    safe_divide/2,
    check_amount/1,
    validate_email/1,
    process_checkout_input/3
]).

safe_divide(Num, Den) when is_number(Num), is_number(Den) ->
    if
        Den == 0 -> {error, division_by_zero};
        true     -> {ok, Num / Den}
    end;
safe_divide(_Num, _Den) ->
    {error, non_numeric}.

check_amount(Amount) when is_integer(Amount) ->
    if
        Amount > 0 -> {ok, Amount};
        true       -> {error, non_positive_amount}
    end;
check_amount(_Other) ->
    {error, invalid_type}.

validate_email(EmailBin) when is_binary(EmailBin) ->
    case binary:split(EmailBin, <<"@">>) of
        [User, Domain] when byte_size(User) > 0, byte_size(Domain) > 0 ->
            case binary:match(Domain, <<".">>) of
                nomatch -> {error, invalid_email};
                _       -> {ok, EmailBin}
            end;
        _ ->
            {error, invalid_email}
    end;
validate_email(_Other) ->
    {error, invalid_email}.

process_checkout_input(EmailBin, TotalAmount, SplitCount) ->
    case validate_email(EmailBin) of
        {ok, ValidEmail} ->
            case check_amount(TotalAmount) of
                {ok, ValidTotal} ->
                    case safe_divide(ValidTotal, SplitCount) of
                        {ok, Share} ->
                            {ok, #{email => ValidEmail, per_person => Share}};
                        {error, DivErr} ->
                            {error, DivErr}
                    end;
                {error, AmtErr} ->
                    {error, AmtErr}
            end;
        {error, EmailErr} ->
            {error, EmailErr}
    end.
`,
    files: [
      {
        name: 'domain_validator.erl',
        path: 'src/domain_validator.erl',
        content: `-module(domain_validator).
-export([
    safe_divide/2,
    check_amount/1,
    validate_email/1,
    process_checkout_input/3
]).

%% Divides Numerator by Denominator safely
%% - non-numeric -> {error, non_numeric}
%% - Denominator == 0 -> {error, division_by_zero}
%% - otherwise -> {ok, Numerator / Denominator}
safe_divide(Numerator, Denominator) ->
    ok.

%% Checks positive integer amount
%% - integer > 0 -> {ok, Amount}
%% - integer =< 0 -> {error, non_positive_amount}
%% - otherwise -> {error, invalid_type}
check_amount(Amount) ->
    ok.

%% Validates email binary has non-empty username, '@', and domain with '.'
%% - valid -> {ok, EmailBin}
%% - invalid -> {error, invalid_email}
validate_email(EmailBin) ->
    ok.

%% Composes email, amount, and split validation into a checkout summary
%% - on any error -> {error, FirstReason}
%% - all valid -> {ok, #{email => EmailBin, per_person => Share}}
process_checkout_input(EmailBin, TotalAmount, SplitCount) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/domain_validator.erl': `-module(domain_validator).
-export([
    safe_divide/2,
    check_amount/1,
    validate_email/1,
    process_checkout_input/3
]).

safe_divide(Num, Den) when is_number(Num), is_number(Den) ->
    if
        Den == 0 -> {error, division_by_zero};
        true     -> {ok, Num / Den}
    end;
safe_divide(_Num, _Den) ->
    {error, non_numeric}.

check_amount(Amount) when is_integer(Amount) ->
    if
        Amount > 0 -> {ok, Amount};
        true       -> {error, non_positive_amount}
    end;
check_amount(_Other) ->
    {error, invalid_type}.

validate_email(EmailBin) when is_binary(EmailBin) ->
    case binary:split(EmailBin, <<"@">>) of
        [User, Domain] when byte_size(User) > 0, byte_size(Domain) > 0 ->
            case binary:match(Domain, <<".">>) of
                nomatch -> {error, invalid_email};
                _       -> {ok, EmailBin}
            end;
        _ ->
            {error, invalid_email}
    end;
validate_email(_Other) ->
    {error, invalid_email}.

process_checkout_input(EmailBin, TotalAmount, SplitCount) ->
    case validate_email(EmailBin) of
        {ok, ValidEmail} ->
            case check_amount(TotalAmount) of
                {ok, ValidTotal} ->
                    case safe_divide(ValidTotal, SplitCount) of
                        {ok, Share} ->
                            {ok, #{email => ValidEmail, per_person => Share}};
                        {error, DivErr} ->
                            {error, DivErr}
                    end;
                {error, AmtErr} ->
                    {error, AmtErr}
            end;
        {error, EmailErr} ->
            {error, EmailErr}
    end.
`,
    },
  },

  // ── Lesson 6.3: Concept Exercise ───────────────────────────────────────────
  {
    id: 'ch06-l03',
    chapterNumber: 6,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Guaranteed Resource Cleanup with try ... of ... catch ... after & Boundary Deserialization',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In systems languages like C++ or Rust, resource cleanup is automated using RAII (Resource Acquisition Is Initialization) or smart pointers. In Python, it is handled by \`with\` statement context managers.

Erlang does **not** have RAII destructors. Operating system resources—such as open file descriptors (\`file:open/2\`), network sockets (\`gen_tcp\`), or database handles—are tied to the lifetime of the process holding them. If a long-running process encounters an exception while streaming records from a file or socket without closing the descriptor, that file handle remains locked in the OS table until the process eventually exits. Over thousands of requests, this leads to **descriptor exhaustion** (\`EMFILE: too many open files\`).

To guarantee deterministic cleanup, Erlang provides the full **4-part \`try ... of ... catch ... after\`** expression.

## Deep Concept Breakdown & Under the Hood

### 1. The Full \`try ... of ... catch ... after\` Syntax

\`\`\`erlang
try AcquireOrComputeExpr of
    SuccessfulPattern ->
        ResultBody
catch
    Class:Reason:Stacktrace ->
        ErrorHandlerBody
after
    %% GUARANTEED TO RUN 100% OF THE TIME!
    ReleaseResourceFun(Handle)
end
\`\`\`

1. **Why the \`of\` Clause is Structurally Crucial:**
   - The expression between \`try\` and \`of\` (\`AcquireOrComputeExpr\`) is the protected operation.
   - If you place \`ResultBody\` inside the \`try\` head itself, any accidental exception raised inside your result processing logic will get swallowed by the \`catch\` block!
   - Putting \`SuccessfulPattern -> ResultBody\` inside \`of\` ensures that exceptions raised inside \`ResultBody\` are **NOT caught** by this \`catch\` block unless intended.
2. **The \`after\` Invariant:**
   - The code inside \`after\` is **guaranteed to execute**, whether the \`try\` block finishes normally, catches a throw, or unwinds from an unhandled error or exit.
   - The return value of the \`after\` block is **silently discarded**; the entire expression evaluates to the result of the \`of\` branch or \`catch\` branch!

### 2. Boundary Deserialization with \`erlang:binary_to_term(Bin, [safe])\`
When receiving serialized Erlang terms from network clients, calling raw \`binary_to_term(Bin)\` is an extreme security risk. A malicious client could stream arbitrary binary payloads that create millions of new atoms. Because atoms are stored in an un-garbage-collected global atom table with a default limit of 1,048,576 atoms, the node will crash with an out-of-memory error.

Passing **\`[safe]\`** instructs ERTS to only decode atoms that **already exist** on the node. If the binary references an unknown atom, it raises \`error:badarg\`, which we cleanly intercept inside \`try ... catch\`:

\`\`\`erlang
safe_parse(Bin) ->
    try erlang:binary_to_term(Bin, [safe]) of
        Term -> {ok, Term}
    catch
        error:badarg -> {error, invalid_or_unsafe_term}
    end.
\`\`\`

## Parallel Worked Example

The following module wraps transaction file processing with an assured close notification:

\`\`\`erlang
-module(secure_blob_reader).
-export([read_blob_safe/1, with_lease/3]).

read_blob_safe(Bin) when is_binary(Bin) ->
    try erlang:binary_to_term(Bin, [safe]) of
        Term -> {ok, Term}
    catch
        Class:Reason -> {error, {Class, Reason}}
    end.

with_lease(AcquireFun, ActionFun, ReleaseFun) ->
    Resource = AcquireFun(),
    try ActionFun(Resource) of
        Success -> {ok, Success}
    catch
        Class:Reason -> {error, {Class, Reason}}
    after
        ReleaseFun(Resource)
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% BIF: erlang (erts)
erlang:binary_to_term(Binary, Options) -> Term
  Types:
    Binary = binary()
    Options = [safe | used]
    Term = term()
\`\`\`

## Assignment Specification

Implement \`src/boundary_parser.erl\` exporting \`safe_parse_payload/1\`, \`with_resource_cleanup/3\`, and \`process_transaction_log/2\`:

1. \`safe_parse_payload(Binary)\`:
   - Uses \`try erlang:binary_to_term(Binary, [safe]) of Term -> {ok, Term} catch Class:Reason -> {error, {Class, Reason}} end\`.
2. \`with_resource_cleanup(AcquireFun, ActionFun, ReleaseFun)\`:
   - Acquires \`Resource = AcquireFun()\`.
   - Runs \`ActionFun(Resource)\` inside \`try ... of ... catch ... after\`.
   - Guarantees \`ReleaseFun(Resource)\` executes in the \`after\` block regardless of outcome.
   - Returns \`{ok, Result}\` on success, or \`{error, {Class, Reason}}\` on failure.
3. \`process_transaction_log(LinesList, CloseNotifyPid)\`:
   - Processes lines in \`LinesList\`. If any line equals \`<<"CORRUPT_LINE">>\`, raises \`erlang:error(transaction_processing_failed)\`.
   - In all cases, the \`after\` block **must** send \`CloseNotifyPid ! file_handle_closed\`.
   - Returns \`{ok, length(LinesList)}\` on success or \`{error, {error, transaction_processing_failed}}\` on failure.

## Rules & Verification Constraints

- Must export \`safe_parse_payload/1\`, \`with_resource_cleanup/3\`, \`process_transaction_log/2\`.
- Enforced AST rules: \`requiredConstructs: ["try_catch"]\`, \`requiredCalls: ["erlang:binary_to_term/2"]\`.
`,
    mentalModelCheck: {
      question: 'What happens to the return value of an `after` block in an Erlang `try ... catch ... after` expression?',
      codeSnippet: `Result = try
    compute_result()
after
    cleanup_socket(),
    cleaned_up
end.`,
      options: [
        {
          id: 'A',
          label: 'The return value of the after block is silently discarded; Result receives the outcome of the try (or catch) block.',
          isCorrect: true,
          explanation: 'Correct! The after block is strictly for side-effects (closing ports, files, sockets). Its return value is ignored by the runtime, ensuring the caller receives the actual computation or error result.',
        },
        {
          id: 'B',
          label: 'Result receives the tuple {try_result, after_result}.',
          isCorrect: false,
          explanation: 'Erlang does not bundle the after return value into a tuple.',
        },
        {
          id: 'C',
          label: 'The after block return value overrides the try result.',
          isCorrect: false,
          explanation: 'The try result is preserved; after block values are discarded.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'binary_to_term',
        module: 'erlang',
        signature: 'erlang:binary_to_term(Binary, [safe]) -> Term',
        typesSpec: ['Binary = binary()', 'Term = term()'],
        description: 'Decodes an external binary into an Erlang term. [safe] prevents DoS from arbitrary atom creation.',
        complexityNote: 'O(N) memory allocation on process heap.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#binary_to_term/2',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch06-03-1',
        title: 'Safe Deserialization of Valid Term',
        erlangCall: 'boundary_parser:safe_parse_payload(term_to_binary({user, 101, <<"Alice">>}))',
        expectedOutput: '{ok, {user, 101, <<"Alice">>}}',
        explanation: 'Valid serialized binary decodes into the original Erlang term cleanly.',
      },
      {
        id: 'tc-ch06-03-2',
        title: 'Guaranteed Resource Release on Deliberate Crash',
        erlangCall: 'begin P = spawn(fun() -> receive {release, R} -> receive {get, From} -> From ! R end end end), boundary_parser:with_resource_cleanup(fun() -> res_42 end, fun(_) -> erlang:error(boom) end, fun(R) -> P ! {release, R} end), P ! {get, self()}, receive Msg -> Msg after 200 -> timeout end end',
        expectedOutput: 'res_42',
        explanation: 'Confirms that ReleaseFun executed inside after despite ActionFun raising error(boom).',
      },
      {
        id: 'tc-ch06-03-3',
        title: 'Transaction Log Processing with File Close Notification',
        erlangCall: 'begin boundary_parser:process_transaction_log([<<"tx_1">>, <<"CORRUPT_LINE">>], self()), receive Msg -> Msg after 200 -> timeout end end',
        expectedOutput: 'file_handle_closed',
        explanation: 'Close notification sent to caller pid in after block even after corrupt line aborted processing.',
      },
    ],
    astRules: {
      requiredConstructs: ['try_catch'],
      requiredCalls: ['erlang:binary_to_term/2'],
    },
    solutionExplanation: 'Uses try...of...catch...after to deserialize safely with [safe] and guarantee resource release in after blocks across all error conditions.',
    starterCode: `-module(boundary_parser).
-export([
    safe_parse_payload/1,
    with_resource_cleanup/3,
    process_transaction_log/2
]).

%% Safely decodes untrusted binary with [safe]
safe_parse_payload(Binary) ->
    ok.

%% Executes ActionFun(Resource) with guaranteed ReleaseFun(Resource) in after
with_resource_cleanup(AcquireFun, ActionFun, ReleaseFun) ->
    ok.

%% Processes lines list, raising error on <<"CORRUPT_LINE">>, always notifying CloseNotifyPid ! file_handle_closed
process_transaction_log(LinesList, CloseNotifyPid) ->
    ok.
`,
    solutionCode: `-module(boundary_parser).
-export([
    safe_parse_payload/1,
    with_resource_cleanup/3,
    process_transaction_log/2
]).

safe_parse_payload(Binary) when is_binary(Binary) ->
    try erlang:binary_to_term(Binary, [safe]) of
        Term -> {ok, Term}
    catch
        Class:Reason ->
            {error, {Class, Reason}}
    end;
safe_parse_payload(_Other) ->
    {error, {error, badarg}}.

with_resource_cleanup(AcquireFun, ActionFun, ReleaseFun) when is_function(AcquireFun, 0),
                                                             is_function(ActionFun, 1),
                                                             is_function(ReleaseFun, 1) ->
    Resource = AcquireFun(),
    try ActionFun(Resource) of
        Result -> {ok, Result}
    catch
        Class:Reason ->
            {error, {Class, Reason}}
    after
        ReleaseFun(Resource)
    end.

process_transaction_log(LinesList, CloseNotifyPid) when is_list(LinesList), is_pid(CloseNotifyPid) ->
    try
        lists:foreach(fun(Line) ->
            case Line of
                <<"CORRUPT_LINE">> -> erlang:error(transaction_processing_failed);
                _ValidLine         -> ok
            end
        end, LinesList),
        {ok, length(LinesList)}
    catch
        Class:Reason ->
            {error, {Class, Reason}}
    after
        CloseNotifyPid ! file_handle_closed
    end.
`,
    files: [
      {
        name: 'boundary_parser.erl',
        path: 'src/boundary_parser.erl',
        content: `-module(boundary_parser).
-export([
    safe_parse_payload/1,
    with_resource_cleanup/3,
    process_transaction_log/2
]).

%% Safely decodes untrusted binary with [safe]
safe_parse_payload(Binary) ->
    ok.

%% Executes ActionFun(Resource) with guaranteed ReleaseFun(Resource) in after
with_resource_cleanup(AcquireFun, ActionFun, ReleaseFun) ->
    ok.

%% Processes lines list, raising error on <<"CORRUPT_LINE">>, always notifying CloseNotifyPid ! file_handle_closed
process_transaction_log(LinesList, CloseNotifyPid) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/boundary_parser.erl': `-module(boundary_parser).
-export([
    safe_parse_payload/1,
    with_resource_cleanup/3,
    process_transaction_log/2
]).

safe_parse_payload(Binary) when is_binary(Binary) ->
    try erlang:binary_to_term(Binary, [safe]) of
        Term -> {ok, Term}
    catch
        Class:Reason ->
            {error, {Class, Reason}}
    end;
safe_parse_payload(_Other) ->
    {error, {error, badarg}}.

with_resource_cleanup(AcquireFun, ActionFun, ReleaseFun) when is_function(AcquireFun, 0),
                                                             is_function(ActionFun, 1),
                                                             is_function(ReleaseFun, 1) ->
    Resource = AcquireFun(),
    try ActionFun(Resource) of
        Result -> {ok, Result}
    catch
        Class:Reason ->
            {error, {Class, Reason}}
    after
        ReleaseFun(Resource)
    end.

process_transaction_log(LinesList, CloseNotifyPid) when is_list(LinesList), is_pid(CloseNotifyPid) ->
    try
        lists:foreach(fun(Line) ->
            case Line of
                <<"CORRUPT_LINE">> -> erlang:error(transaction_processing_failed);
                _ValidLine         -> ok
            end
        end, LinesList),
        {ok, length(LinesList)}
    catch
        Class:Reason ->
            {error, {Class, Reason}}
    after
        CloseNotifyPid ! file_handle_closed
    end.
`,
    },
  },

  // ── Lesson 6.4: Concept Exercise ───────────────────────────────────────────
  {
    id: 'ch06-l04',
    chapterNumber: 6,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'Bidirectional Process Links (link/1, spawn_link/1) & Normal vs. Abnormal Exit Signals',
    difficulty: 'Intermediate',
    xpReward: 100,
    visualScene: 'links_monitors_signals',
    conceptMarkdown: `## Why This Matters in Production

In long-running backend services, a single client request often spawns several auxiliary processes: a database stream reader, an image thumbnail resizer, and an encryption codec. In systems without built-in process relationships (like C++ or Node.js), if the main request worker crashes or the client disconnects, those auxiliary tasks continue running as **zombie processes**—silently consuming CPU, holding open file descriptors, and leaking socket connections until the server runs out of memory.

Erlang solves this fundamentally through **Process Links**. A link is a **bidirectional relationship** between two BEAM processes: if either process crashes, the BEAM VM automatically sends an **exit signal** to the other process, terminating it immediately!

## Deep Concept Breakdown & Under the Hood

### 1. Bidirectional Fate-Sharing
A link is symmetric: it does not matter whether Process A calls \`link(PidB)\` or Process B calls \`link(PidA)\`. If either process terminates, an exit signal travels across the link to the peer.

### 2. Atomic \`spawn_link/1,3\` vs. Microsecond Race Conditions
Never write:
\`\`\`erlang
%% DANGEROUS CODE (RACE CONDITION):
Pid = spawn(fun() -> worker_loop() end),
link(Pid).
\`\`\`
If the newly spawned process crashes in the microsecond between \`spawn\` and \`link\`, the parent process never links to it. The exit signal is lost, and the crash goes unnoticed!
Always use the atomic BIF:
\`\`\`erlang
Pid = spawn_link(fun() -> worker_loop() end).
\`\`\`

### 3. Critical Contrast: \`exit(normal)\` vs. Abnormal Exit Signals
Every exit signal carries an **exit reason**. The behavior of linked peers depends on this reason:
- **Normal Exit (\`exit(normal)\`):** When a worker finishes its assigned computation and finishes its top-level function (or evaluates \`exit(normal)\`), the exit signal carries the reason \`normal\`. A standard linked process (one that is not trapping exits) **completely ignores \`normal\` exit signals**! It remains alive and healthy.
- **Abnormal Exit (\`exit(Reason)\` or runtime bug):** When a worker crashes with \`badarith\`, \`badarg\`, or calls \`exit(abnormal_fault)\`, the abnormal exit signal **terminates the linked peer immediately**!

> [!warning] Fault-Tolerance Trap: Linking to Ephemeral Workers
> If a long-running service process links to short-lived background worker processes using \`spawn_link/1\`, any abnormal crash in a worker will instantly kill the main service process! In Lesson 6.6, you will learn how to use unidirectional **Monitors** when you want to observe worker termination without sharing its fate.

## Parallel Worked Example

Consider a two-stage data pipeline linking an extractor to a compressor:

\`\`\`erlang
-module(pipeline_pair).
-export([start/0, stop_normal/1, crash_abnormal/2, loop1/1, loop2/0]).

start() ->
    P2 = spawn(fun() -> loop2() end),
    P1 = spawn_link(fun() -> link(P2), loop1(P2) end),
    {ok, P1, P2}.

stop_normal(P1) ->
    P1 ! stop_normal,
    ok.

crash_abnormal(P1, Reason) ->
    P1 ! {crash, Reason},
    ok.

loop1(P2) ->
    receive
        stop_normal ->
            exit(normal); %% P2 ignores normal exit!
        {crash, Reason} ->
            exit(Reason)  %% P2 dies with Reason!
    end.

loop2() ->
    receive
        _Any -> loop2()
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% BIFs: erlang (erts)
link(PidOrPort) -> true
spawn_link(Fun) -> pid()
spawn_link(Module, Function, Args) -> pid()
\`\`\`

## Assignment Specification

Implement \`src/linked_pipeline.erl\` exporting \`start_linked_pipeline/0\`, \`compute/2\`, \`stop_stage1_normal/1\`, \`crash_stage1/2\`, \`worker1_loop/1\`, and \`worker2_loop/0\`:

1. \`start_linked_pipeline() -> {ok, Worker1Pid, Worker2Pid}\`:
   - Spawns \`Worker2 = spawn(fun() -> worker2_loop() end)\`.
   - Spawns and links \`Worker1 = spawn_link(fun() -> link(Worker2), worker1_loop(Worker2) end)\`.
   - Returns \`{ok, Worker1, Worker2}\`.
2. \`compute(Worker1Pid, Number) -> {ok, Result} | {error, timeout}\`:
   - Sends \`{transform, self(), Ref, Number}\` to \`Worker1Pid\`.
   - \`Worker1\` multiplies \`Number * 2\` and forwards \`{transform_stage2, Caller, Ref, Doubled}\` to \`Worker2\`.
   - \`Worker2\` squares \`Doubled * Doubled\` and replies \`Caller ! {Ref, Squared}\`.
3. \`stop_stage1_normal(Worker1Pid) -> ok\`:
   - Sends \`{stop_normal, self(), Ref}\` to \`Worker1Pid\`.
   - \`Worker1\` replies \`From ! {Ref, ok}\` and exits with \`exit(normal)\`.
   - \`Worker2\` stays alive because \`normal\` exit signals are ignored!
4. \`crash_stage1(Worker1Pid, Reason) -> ok\`:
   - Sends \`{crash, Reason}\` to \`Worker1Pid\`.
   - \`Worker1\` calls \`exit(Reason)\`.
   - The abnormal exit signal propagates across the link, terminating \`Worker2\`!

## Rules & Verification Constraints

- Must export all specified functions.
- Enforced AST rules: \`requiredCalls: ["erlang:spawn_link/1", "erlang:link/1"]\`.
`,
    mentalModelCheck: {
      question: 'When process A and process B are linked, what happens to process B if process A terminates with `exit(normal)`?',
      codeSnippet: `link(PidB),
exit(normal).`,
      options: [
        {
          id: 'A',
          label: 'Process B ignores the normal exit signal and continues executing undisturbed (unless it is explicitly trapping exits).',
          isCorrect: true,
          explanation: 'Correct! By definition, an exit signal with reason `normal` indicates clean task completion. Non-trapping linked peers ignore `normal` exit signals and stay alive.',
        },
        {
          id: 'B',
          label: 'Process B terminates immediately with reason normal.',
          isCorrect: false,
          explanation: 'Only abnormal exit reasons terminate non-trapping linked peers.',
        },
        {
          id: 'C',
          label: 'The BEAM scheduler pauses process B until a supervisor wakes it up.',
          isCorrect: false,
          explanation: 'Process B is not paused; it continues running without interruption.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'spawn_link',
        module: 'erlang',
        signature: 'spawn_link(Fun) -> pid()',
        typesSpec: ['Fun = function()', 'pid()'],
        description: 'Atomically creates a new process and establishes a bidirectional link with caller.',
        complexityNote: 'O(1) allocation and lock-free link registration.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#spawn_link/1',
      },
      {
        functionName: 'link',
        module: 'erlang',
        signature: 'link(Pid) -> true',
        typesSpec: ['Pid = pid() | port()'],
        description: 'Creates a bidirectional link between caller and target Pid.',
        complexityNote: 'O(1). If Pid is dead, sends {EXIT, Pid, noproc}.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#link/1',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch06-04-1',
        title: 'Two-Stage Pipeline Computation',
        erlangCall: 'begin {ok, W1, W2} = linked_pipeline:start_linked_pipeline(), {ok, Res} = linked_pipeline:compute(W1, 3), {Res, is_process_alive(W1), is_process_alive(W2)} end',
        expectedOutput: '{36, true, true}',
        explanation: '3 doubled to 6 by Stage 1, squared to 36 by Stage 2. Both processes alive.',
      },
      {
        id: 'tc-ch06-04-2',
        title: 'Normal Exit Leaves Linked Peer Alive',
        erlangCall: 'begin {ok, W1, W2} = linked_pipeline:start_linked_pipeline(), ok = linked_pipeline:stop_stage1_normal(W1), timer:sleep(40), {is_process_alive(W1), is_process_alive(W2)} end',
        expectedOutput: '{false, true}',
        explanation: 'Stage 1 exited with normal; Stage 2 ignored normal signal and remained alive.',
      },
      {
        id: 'tc-ch06-04-3',
        title: 'Abnormal Crash Propagates Across Link',
        erlangCall: 'begin {ok, W1, W2} = linked_pipeline:start_linked_pipeline(), ok = linked_pipeline:crash_stage1(W1, fatal_crash), timer:sleep(40), {is_process_alive(W1), is_process_alive(W2)} end',
        expectedOutput: '{false, false}',
        explanation: 'Abnormal crash in Stage 1 propagated across link, terminating Stage 2.',
      },
    ],
    astRules: {
      requiredCalls: ['erlang:spawn_link/1', 'erlang:link/1'],
    },
    solutionExplanation: 'Implements a two-stage linked pipeline demonstrating normal exit survival vs abnormal exit propagation.',
    starterCode: `-module(linked_pipeline).
-export([
    start_linked_pipeline/0,
    compute/2,
    stop_stage1_normal/1,
    crash_stage1/2,
    worker1_loop/1,
    worker2_loop/0
]).

%% Architectural Requirement:
%% Spawn Worker2, spawn_link Worker1 (linked to Worker2), and return {ok, Worker1, Worker2}.
start_linked_pipeline() ->
    ok.

%% Architectural Requirement:
%% Send {transform, self(), Ref, Number} to Worker1, receive {Ref, Result} with 1000ms timeout.
compute(Worker1Pid, Number) ->
    ok.

%% Architectural Requirement:
%% Send {stop_normal, self(), Ref} to Worker1, receive {Ref, ok} with 1000ms timeout.
stop_stage1_normal(Worker1Pid) ->
    ok.

%% Architectural Requirement:
%% Send {crash, Reason} to Worker1, triggering unhandled exit signal across link.
crash_stage1(Worker1Pid, Reason) ->
    ok.

%% Architectural Requirement:
%% Match {transform, Caller, Ref, Value} -> forward {transform_stage2, Caller, Ref, Value * 2} to Worker2 and recurse.
%% Match {stop_normal, From, Ref} -> reply {Ref, ok} and exit(normal).
%% Match {crash, Reason} -> exit(Reason).
worker1_loop(Worker2) ->
    ok.

%% Architectural Requirement:
%% Match {transform_stage2, Caller, Ref, Doubled} -> reply {Ref, Doubled * Doubled} to Caller and recurse.
worker2_loop() ->
    ok.
`,
    solutionCode: `-module(linked_pipeline).
-export([
    start_linked_pipeline/0,
    compute/2,
    stop_stage1_normal/1,
    crash_stage1/2,
    worker1_loop/1,
    worker2_loop/0
]).

start_linked_pipeline() ->
    Worker2 = spawn(fun() -> worker2_loop() end),
    Worker1 = spawn_link(fun() ->
        link(Worker2),
        worker1_loop(Worker2)
    end),
    {ok, Worker1, Worker2}.

compute(Worker1Pid, Number) ->
    Ref = make_ref(),
    Worker1Pid ! {transform, self(), Ref, Number},
    receive
        {Ref, Result} -> {ok, Result}
    after 1000 ->
        {error, timeout}
    end.

stop_stage1_normal(Worker1Pid) ->
    Ref = make_ref(),
    Worker1Pid ! {stop_normal, self(), Ref},
    receive
        {Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

crash_stage1(Worker1Pid, Reason) ->
    Worker1Pid ! {crash, Reason},
    ok.

worker1_loop(Worker2) ->
    receive
        {transform, Caller, Ref, Value} when is_number(Value) ->
            Doubled = Value * 2,
            Worker2 ! {transform_stage2, Caller, Ref, Doubled},
            worker1_loop(Worker2);
        {stop_normal, From, Ref} ->
            From ! {Ref, ok},
            exit(normal);
        {crash, Reason} ->
            exit(Reason)
    end.

worker2_loop() ->
    receive
        {transform_stage2, Caller, Ref, Doubled} ->
            Squared = Doubled * Doubled,
            Caller ! {Ref, Squared},
            worker2_loop()
    end.
`,
    files: [
      {
        name: 'linked_pipeline.erl',
        path: 'src/linked_pipeline.erl',
        content: `-module(linked_pipeline).
-export([
    start_linked_pipeline/0,
    compute/2,
    stop_stage1_normal/1,
    crash_stage1/2,
    worker1_loop/1,
    worker2_loop/0
]).

%% Architectural Requirement:
%% Spawn Worker2, spawn_link Worker1 (linked to Worker2), and return {ok, Worker1, Worker2}.
start_linked_pipeline() ->
    ok.

%% Architectural Requirement:
%% Send {transform, self(), Ref, Number} to Worker1, receive {Ref, Result} with 1000ms timeout.
compute(Worker1Pid, Number) ->
    ok.

%% Architectural Requirement:
%% Send {stop_normal, self(), Ref} to Worker1, receive {Ref, ok} with 1000ms timeout.
stop_stage1_normal(Worker1Pid) ->
    ok.

%% Architectural Requirement:
%% Send {crash, Reason} to Worker1, triggering unhandled exit signal across link.
crash_stage1(Worker1Pid, Reason) ->
    ok.

%% Architectural Requirement:
%% Match {transform, Caller, Ref, Value} -> forward {transform_stage2, Caller, Ref, Value * 2} to Worker2 and recurse.
%% Match {stop_normal, From, Ref} -> reply {Ref, ok} and exit(normal).
%% Match {crash, Reason} -> exit(Reason).
worker1_loop(Worker2) ->
    ok.

%% Architectural Requirement:
%% Match {transform_stage2, Caller, Ref, Doubled} -> reply {Ref, Doubled * Doubled} to Caller and recurse.
worker2_loop() ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/linked_pipeline.erl': `-module(linked_pipeline).
-export([
    start_linked_pipeline/0,
    compute/2,
    stop_stage1_normal/1,
    crash_stage1/2,
    worker1_loop/1,
    worker2_loop/0
]).

start_linked_pipeline() ->
    Worker2 = spawn(fun() -> worker2_loop() end),
    Worker1 = spawn_link(fun() ->
        link(Worker2),
        worker1_loop(Worker2)
    end),
    {ok, Worker1, Worker2}.

compute(Worker1Pid, Number) ->
    Ref = make_ref(),
    Worker1Pid ! {transform, self(), Ref, Number},
    receive
        {Ref, Result} -> {ok, Result}
    after 1000 ->
        {error, timeout}
    end.

stop_stage1_normal(Worker1Pid) ->
    Ref = make_ref(),
    Worker1Pid ! {stop_normal, self(), Ref},
    receive
        {Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

crash_stage1(Worker1Pid, Reason) ->
    Worker1Pid ! {crash, Reason},
    ok.

worker1_loop(Worker2) ->
    receive
        {transform, Caller, Ref, Value} when is_number(Value) ->
            Doubled = Value * 2,
            Worker2 ! {transform_stage2, Caller, Ref, Doubled},
            worker1_loop(Worker2);
        {stop_normal, From, Ref} ->
            From ! {Ref, ok},
            exit(normal);
        {crash, Reason} ->
            exit(Reason)
    end.

worker2_loop() ->
    receive
        {transform_stage2, Caller, Ref, Doubled} ->
            Squared = Doubled * Doubled,
            Caller ! {Ref, Squared},
            worker2_loop()
    end.
`,
    },
  },

  // ── Lesson 6.5: Concept Exercise ───────────────────────────────────────────
  {
    id: 'ch06-l05',
    chapterNumber: 6,
    lessonNumber: 5,
    lessonType: 'concept_exercise',
    title: 'Trapping Exits (process_flag(trap_exit, true)), The Exit Signal Truth Table & Untrappable kill',
    difficulty: 'Advanced',
    xpReward: 100,
    visualScene: 'links_monitors_signals',
    conceptMarkdown: `## Why This Matters in Production

If bidirectional links kill both processes whenever one crashes, how can Erlang systems ever survive failures? How do supervisors stay alive to restart crashed database pools, web servers, and payment gateways?

The answer is **Trapping Exits**. By default, incoming exit signals kill the receiving process. But when a process sets the system flag:

\`\`\`erlang
process_flag(trap_exit, true)
\`\`\`

the BEAM VM fundamentally changes how exit signals are handled: **the incoming exit signal is converted into a regular Erlang message tuple and placed directly into the process's mailbox!**

\`\`\`erlang
{'EXIT', DeadPid, Reason}
\`\`\`

This single primitive is the mechanical foundation of the entire **OTP Supervision Tree**.

## Deep Concept Breakdown & Under the Hood

### The Complete Exit Signal Truth Table
Every backend engineer on the BEAM must know this truth table by heart:

| Exit Signal Sent (\`exit(Target, Reason)\`) | Target Has \`trap_exit = false\` (Default) | Target Has \`trap_exit = true\` (Supervisor) |
| :--- | :--- | :--- |
| **\`exit(Target, normal)\`** | Ignored; Target continues running. | Receives \`{'EXIT', Sender, normal}\` in mailbox. |
| **\`exit(Target, Reason)\`** (Abnormal) | Target dies immediately with \`Reason\`. | Receives \`{'EXIT', Sender, Reason}\` in mailbox. |
| **\`exit(Target, kill)\`** (**Untrappable!**) | Target dies immediately with \`killed\`. | **Target dies unconditionally!** (Linked peers receive \`{'EXIT', Target, killed}\`). |

### Why Untrappable \`kill\` is Rewritten to \`killed\`
When you send \`exit(Pid, kill)\`:
1. The target process **cannot trap it**, even if \`trap_exit\` is \`true\`. It is terminated immediately.
2. The BEAM runtime then notifies the target's linked peers with reason **\`killed\`** (not \`kill\`).
3. This is a brilliant design: if the reason remained \`kill\`, the supervisor watching the runaway worker would be killed too! By rewriting it to \`killed\`, the supervisor can trap the exit message and cleanly restart a replacement worker.

## Parallel Worked Example

The following module implements a self-healing worker restarter:

\`\`\`erlang
-module(worker_guardian).
-export([start/1, loop/2]).

start(WorkerFun) ->
    spawn(fun() ->
        process_flag(trap_exit, true),
        WorkerPid = spawn_link(WorkerFun),
        loop(WorkerFun, WorkerPid)
    end).

loop(WorkerFun, CurrentWorker) ->
    receive
        {'EXIT', CurrentWorker, normal} ->
            ok; %% Worker finished cleanly
        {'EXIT', CurrentWorker, Abnormal} ->
            %% Resurrect fresh worker!
            NewWorker = spawn_link(WorkerFun),
            loop(WorkerFun, NewWorker)
    end.
\`\`\`

## Assignment Specification

Implement \`src/exit_trapper.erl\` exporting \`start_supervised/1\`, \`get_worker_pid/1\`, \`kill_worker/2\`, \`simulate_exit_truth_table/2\`, and \`supervisor_loop/2\`:

1. \`start_supervised(WorkerFun) -> {ok, SupPid, InitialWorkerPid}\`:
   - Spawns supervisor running \`supervisor_loop(WorkerFun, WorkerPid)\`.
   - Supervisor sets \`process_flag(trap_exit, true)\` and spawns linked initial worker: \`WorkerPid = spawn_link(WorkerFun)\`.
2. \`get_worker_pid(SupPid) -> {ok, CurrentWorkerPid}\`: Queries active worker.
3. \`kill_worker(SupPid, Reason) -> ok\`: Sends \`{kill_worker, Reason}\` to supervisor, which evaluates \`exit(WorkerPid, Reason)\`.
4. \`supervisor_loop(WorkerFun, CurrentWorker)\`:
   - \`{get_worker, From, Ref}\` -> replies \`From ! {Ref, CurrentWorker}\`.
   - \`{kill_worker, Reason}\` -> calls \`exit(CurrentWorker, Reason)\`, continues supervising.
   - \`{'EXIT', CurrentWorker, normal}\` -> exits cleanly with \`ok\`.
   - \`{'EXIT', CurrentWorker, _AbnormalReason}\` -> spawns replacement \`NewWorker = spawn_link(WorkerFun)\` and continues!
   - \`stop\` -> stops cleanly.
5. \`simulate_exit_truth_table(TrappingBool, SignalReason) -> {died, Reason} | {survived, MailboxMsg | none}\`:
   - Spawns probe process with \`process_flag(trap_exit, TrappingBool)\`.
   - Sends \`exit(Probe, SignalReason)\`.
   - Returns whether probe died or survived with mailbox message.

## Rules & Verification Constraints

- Must export all specified functions.
- Enforced AST rules: \`requiredCalls: ["erlang:process_flag/2", "erlang:spawn_link/1"]\`.
`,
    mentalModelCheck: {
      question: 'Why does sending `exit(WorkerPid, kill)` terminate a worker even if that worker has executed `process_flag(trap_exit, true)`?',
      codeSnippet: `process_flag(trap_exit, true),
%% Inside another process:
exit(WorkerPid, kill).`,
      options: [
        {
          id: 'A',
          label: 'The atom `kill` is Erlang’s untrappable nuclear signal; the runtime bypasses mailbox trapping and terminates the process unconditionally.',
          isCorrect: true,
          explanation: 'Correct! `kill` is unconditionally untrappable. The BEAM runtime terminates the process directly, rewriting the reason to `killed` for linked peers so supervisors survive.',
        },
        {
          id: 'B',
          label: 'Trapping exits only works for throws, not exits.',
          isCorrect: false,
          explanation: 'Trapping exits is specifically for exit signals.',
        },
        {
          id: 'C',
          label: 'The target process traps the signal as {EXIT, Pid, kill}.',
          isCorrect: false,
          explanation: 'A process can never trap `kill`.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'process_flag',
        module: 'erlang',
        signature: 'process_flag(trap_exit, true) -> boolean()',
        typesSpec: ['trap_exit', 'boolean()'],
        description: 'Enables exit signal trapping, converting incoming exits into mailbox messages.',
        complexityNote: 'O(1) process control block update.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#process_flag/2',
      },
      {
        functionName: 'exit',
        module: 'erlang',
        signature: 'exit(Pid, Reason) -> true',
        typesSpec: ['Pid = pid()', 'Reason = term()'],
        description: 'Sends exit signal with Reason to target Pid. If Reason is kill, target terminates unconditionally.',
        complexityNote: 'O(1) signal dispatch.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#exit/2',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch06-05-1',
        title: 'Supervisor Reports Active Worker',
        erlangCall: 'begin {ok, Sup, W1} = exit_trapper:start_supervised(fun() -> receive stop -> ok end end), {ok, Reported} = exit_trapper:get_worker_pid(Sup), Sup ! stop, W1 =:= Reported end',
        expectedOutput: 'true',
        explanation: 'Supervisor correctly initialized and returned worker pid.',
      },
      {
        id: 'tc-ch06-05-2',
        title: 'Automatic Respawn on Abnormal Crash',
        erlangCall: 'begin {ok, Sup, W1} = exit_trapper:start_supervised(fun() -> receive stop -> ok end end), exit_trapper:kill_worker(Sup, badarith), timer:sleep(50), {ok, W2} = exit_trapper:get_worker_pid(Sup), Sup ! stop, {is_process_alive(W1), is_process_alive(W2), W1 =/= W2} end',
        expectedOutput: '{false, true, true}',
        explanation: 'When W1 died, supervisor trapped exit and spawned fresh worker W2.',
      },
      {
        id: 'tc-ch06-05-3',
        title: 'Untrappable Kill Signal Simulation',
        erlangCall: 'exit_trapper:simulate_exit_truth_table(true, kill)',
        expectedOutput: '{died, killed}',
        explanation: 'Even with trap_exit=true, kill terminates process and reports killed.',
      },
    ],
    astRules: {
      requiredCalls: ['erlang:process_flag/2', 'erlang:spawn_link/1'],
    },
    solutionExplanation: 'Implements supervisor primitives using trap_exit to convert exit signals into mailbox messages and respawn crashed workers, proving the complete exit signal truth table.',
    starterCode: `-module(exit_trapper).
-export([
    start_supervised/1,
    get_worker_pid/1,
    kill_worker/2,
    simulate_exit_truth_table/2,
    supervisor_loop/2
]).

%% Architectural Requirement:
%% Spawn supervisor with process_flag(trap_exit, true), spawn_link(WorkerFun), return {ok, SupPid, InitialWorker}.
start_supervised(WorkerFun) ->
    ok.

%% Architectural Requirement:
%% Synchronously query active worker PID via {get_worker, self(), Ref} with 1000ms timeout.
get_worker_pid(SupPid) ->
    ok.

%% Architectural Requirement:
%% Asynchronously forward {kill_worker, Reason} to SupPid.
kill_worker(SupPid, Reason) ->
    ok.

%% Architectural Requirement:
%% Spawn monitored probe with TrappingBool trap_exit, send exit(Probe, SignalReason),
%% and return {survived, ok} or {died, Reason}.
simulate_exit_truth_table(TrappingBool, SignalReason) ->
    ok.

%% Architectural Requirement:
%% Match {get_worker, From, Ref} -> reply {Ref, CurrentWorker} and recurse.
%% Match {kill_worker, Reason} -> exit(CurrentWorker, Reason) and recurse.
%% Match {'EXIT', CurrentWorker, normal} -> do not restart; set CurrentWorker to dead and recurse.
%% Match {'EXIT', CurrentWorker, Reason} -> restart fresh WorkerPid = spawn_link(WorkerFun) and recurse.
supervisor_loop(WorkerFun, CurrentWorker) ->
    ok.
`,
    solutionCode: `-module(exit_trapper).
-export([
    start_supervised/1,
    get_worker_pid/1,
    kill_worker/2,
    simulate_exit_truth_table/2,
    supervisor_loop/2
]).

start_supervised(WorkerFun) when is_function(WorkerFun, 0) ->
    InitRef = make_ref(),
    Parent = self(),
    SupPid = spawn(fun() ->
        process_flag(trap_exit, true),
        WorkerPid = spawn_link(WorkerFun),
        Parent ! {InitRef, WorkerPid},
        supervisor_loop(WorkerFun, WorkerPid)
    end),
    receive
        {InitRef, InitialWorker} -> {ok, SupPid, InitialWorker}
    after 1000 ->
        {error, timeout}
    end.

get_worker_pid(SupPid) ->
    Ref = make_ref(),
    SupPid ! {get_worker, self(), Ref},
    receive
        {Ref, WorkerPid} -> {ok, WorkerPid}
    after 1000 ->
        {error, timeout}
    end.

kill_worker(SupPid, Reason) ->
    SupPid ! {kill_worker, Reason},
    ok.

supervisor_loop(WorkerFun, CurrentWorker) ->
    receive
        {get_worker, From, Ref} ->
            From ! {Ref, CurrentWorker},
            supervisor_loop(WorkerFun, CurrentWorker);

        {kill_worker, Reason} ->
            exit(CurrentWorker, Reason),
            supervisor_loop(WorkerFun, CurrentWorker);

        {'EXIT', CurrentWorker, normal} ->
            ok;

        {'EXIT', CurrentWorker, _AbnormalReason} ->
            NewWorker = spawn_link(WorkerFun),
            supervisor_loop(WorkerFun, NewWorker);

        stop ->
            exit(CurrentWorker, shutdown),
            ok
    end.

simulate_exit_truth_table(TrappingBool, SignalReason) ->
    Parent = self(),
    Ref = make_ref(),
    ProbePid = spawn(fun() ->
        process_flag(trap_exit, TrappingBool),
        Parent ! {ready, Ref},
        receive
            Msg -> Parent ! {survived, Ref, Msg}
        after 50 ->
            Parent ! {survived, Ref, none}
        end
    end),
    receive {ready, Ref} -> ok end,
    MonitorRef = erlang:monitor(process, ProbePid),
    exit(ProbePid, SignalReason),
    receive
        {'DOWN', MonitorRef, process, ProbePid, DownReason} ->
            erlang:demonitor(MonitorRef, [flush]),
            {died, DownReason};
        {survived, Ref, Msg} ->
            erlang:demonitor(MonitorRef, [flush]),
            {survived, Msg}
    after 200 ->
        erlang:demonitor(MonitorRef, [flush]),
        {error, timeout}
    end.
`,
    files: [
      {
        name: 'exit_trapper.erl',
        path: 'src/exit_trapper.erl',
        content: `-module(exit_trapper).
-export([
    start_supervised/1,
    get_worker_pid/1,
    kill_worker/2,
    simulate_exit_truth_table/2,
    supervisor_loop/2
]).

%% Architectural Requirement:
%% Spawn supervisor with process_flag(trap_exit, true), spawn_link(WorkerFun), return {ok, SupPid, InitialWorker}.
start_supervised(WorkerFun) ->
    ok.

%% Architectural Requirement:
%% Synchronously query active worker PID via {get_worker, self(), Ref} with 1000ms timeout.
get_worker_pid(SupPid) ->
    ok.

%% Architectural Requirement:
%% Asynchronously forward {kill_worker, Reason} to SupPid.
kill_worker(SupPid, Reason) ->
    ok.

%% Architectural Requirement:
%% Spawn monitored probe with TrappingBool trap_exit, send exit(Probe, SignalReason),
%% and return {survived, ok} or {died, Reason}.
simulate_exit_truth_table(TrappingBool, SignalReason) ->
    ok.

%% Architectural Requirement:
%% Match {get_worker, From, Ref} -> reply {Ref, CurrentWorker} and recurse.
%% Match {kill_worker, Reason} -> exit(CurrentWorker, Reason) and recurse.
%% Match {'EXIT', CurrentWorker, normal} -> do not restart; set CurrentWorker to dead and recurse.
%% Match {'EXIT', CurrentWorker, Reason} -> restart fresh WorkerPid = spawn_link(WorkerFun) and recurse.
supervisor_loop(WorkerFun, CurrentWorker) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/exit_trapper.erl': `-module(exit_trapper).
-export([
    start_supervised/1,
    get_worker_pid/1,
    kill_worker/2,
    simulate_exit_truth_table/2,
    supervisor_loop/2
]).

start_supervised(WorkerFun) when is_function(WorkerFun, 0) ->
    InitRef = make_ref(),
    Parent = self(),
    SupPid = spawn(fun() ->
        process_flag(trap_exit, true),
        WorkerPid = spawn_link(WorkerFun),
        Parent ! {InitRef, WorkerPid},
        supervisor_loop(WorkerFun, WorkerPid)
    end),
    receive
        {InitRef, InitialWorker} -> {ok, SupPid, InitialWorker}
    after 1000 ->
        {error, timeout}
    end.

get_worker_pid(SupPid) ->
    Ref = make_ref(),
    SupPid ! {get_worker, self(), Ref},
    receive
        {Ref, WorkerPid} -> {ok, WorkerPid}
    after 1000 ->
        {error, timeout}
    end.

kill_worker(SupPid, Reason) ->
    SupPid ! {kill_worker, Reason},
    ok.

supervisor_loop(WorkerFun, CurrentWorker) ->
    receive
        {get_worker, From, Ref} ->
            From ! {Ref, CurrentWorker},
            supervisor_loop(WorkerFun, CurrentWorker);

        {kill_worker, Reason} ->
            exit(CurrentWorker, Reason),
            supervisor_loop(WorkerFun, CurrentWorker);

        {'EXIT', CurrentWorker, normal} ->
            ok;

        {'EXIT', CurrentWorker, _AbnormalReason} ->
            NewWorker = spawn_link(WorkerFun),
            supervisor_loop(WorkerFun, NewWorker);

        stop ->
            exit(CurrentWorker, shutdown),
            ok
    end.

simulate_exit_truth_table(TrappingBool, SignalReason) ->
    Parent = self(),
    Ref = make_ref(),
    ProbePid = spawn(fun() ->
        process_flag(trap_exit, TrappingBool),
        Parent ! {ready, Ref},
        receive
            Msg -> Parent ! {survived, Ref, Msg}
        after 50 ->
            Parent ! {survived, Ref, none}
        end
    end),
    receive {ready, Ref} -> ok end,
    MonitorRef = erlang:monitor(process, ProbePid),
    exit(ProbePid, SignalReason),
    receive
        {'DOWN', MonitorRef, process, ProbePid, DownReason} ->
            erlang:demonitor(MonitorRef, [flush]),
            {died, DownReason};
        {survived, Ref, Msg} ->
            erlang:demonitor(MonitorRef, [flush]),
            {survived, Msg}
    after 200 ->
        erlang:demonitor(MonitorRef, [flush]),
        {error, timeout}
    end.
`,
    },
  },

  // ── Lesson 6.6: Concept Exercise ───────────────────────────────────────────
  {
    id: 'ch06-l06',
    chapterNumber: 6,
    lessonNumber: 6,
    lessonType: 'concept_exercise',
    title: 'Unidirectional Monitors (erlang:monitor/2, spawn_monitor/1), \'DOWN\' Messages & The noproc Invariant',
    difficulty: 'Intermediate',
    xpReward: 100,
    visualScene: 'links_monitors_signals',
    conceptMarkdown: `## Why This Matters in Production

While **Links** are ideal for supervisors and tightly bound worker clusters that must share fate, links are dangerous for **client-to-server interactions**.

Imagine an HTTP checkout handler calling a background pricing engine:
- If the checkout handler *links* to the pricing worker, and the pricing worker crashes with an out-of-memory error, the exit signal propagates across the link and **kills the checkout handler**!
- Even worse, using links requires setting \`process_flag(trap_exit, true)\`, which converts *all* exit signals across the process into mailbox messages—polluting clean request logic.

To solve this, Erlang provides **Monitors**. A monitor is **strictly unidirectional**: Process A watches Process B.
- If Process B crashes, Process A receives a **\`'DOWN'\`** message in its mailbox.
- Process A does **not** die.
- If Process A crashes, Process B is completely unaffected.

## Deep Concept Breakdown & Under the Hood

### 1. Monitoring Primitives
\`\`\`erlang
%% Single BIF call:
{WorkerPid, MRef} = spawn_monitor(fun() -> do_work() end).
\`\`\`
When the monitored process terminates, the BEAM posts a 5-element tuple into the monitor owner's mailbox:
\`\`\`erlang
{'DOWN', MRef, process, WorkerPid, ExitReason}
\`\`\`

### 2. The \`noproc\` Dead-PID Invariant
What happens if you call \`MRef = erlang:monitor(process, TargetPid)\` on a process that **already died 10 milliseconds ago**?
In traditional languages, this would cause a race condition or exception.
In the BEAM:
- \`erlang:monitor/2\` **never crashes**.
- If \`TargetPid\` does not exist, the runtime immediately synthesizes:
  \`\`\`erlang
  {'DOWN', MRef, process, TargetPid, noproc}
  \`\`\`
  and places it into your mailbox!
- This guarantees there are **zero check-then-monitor race conditions**. You never need to call \`is_process_alive(Pid)\` before monitoring!

## Parallel Worked Example

The following module executes an asynchronous task with a monitor-backed timeout:

\`\`\`erlang
-module(async_task_watcher).
-export([run_task/2]).

run_task(Fun, TimeoutMs) ->
    Caller = self(),
    {Pid, MRef} = spawn_monitor(fun() ->
        Res = Fun(),
        Caller ! {res, MRef, Res}
    end),
    receive
        {res, MRef, Res} ->
            erlang:demonitor(MRef, [flush]),
            {ok, Res};
        {'DOWN', MRef, process, Pid, Reason} ->
            {error, {crashed, Reason}}
    after TimeoutMs ->
        exit(Pid, kill),
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.
\`\`\`

## Assignment Specification

Implement \`src/worker_watcher.erl\` exporting \`run_monitored_task/2\` and \`probe_pid_status/1\`:

1. \`run_monitored_task(TaskFun, TimeoutMs) -> {ok, Result} | {error, {crashed, Reason}} | {error, timeout}\`:
   - Uses \`spawn_monitor/1\` to run \`TaskFun\`.
   - On completion -> \`demonitor(MRef, [flush])\`, returns \`{ok, Result}\`.
   - On worker crash -> receives \`{'DOWN', MRef, process, WorkerPid, Reason}\`, returns \`{error, {crashed, Reason}}\`.
   - On timeout -> kills worker via \`exit(WorkerPid, kill)\`, flushes monitor, returns \`{error, timeout}\`.
2. \`probe_pid_status(TargetPid) -> alive | {dead, Reason}\`:
   - Monitors \`TargetPid\` via \`MRef = erlang:monitor(process, TargetPid)\`.
   - Uses non-blocking check:
     \`\`\`erlang
     receive
         {'DOWN', MRef, process, TargetPid, Reason} -> {dead, Reason}
     after 20 ->
         erlang:demonitor(MRef, [flush]),
         alive
     end
     \`\`\`
   - If \`TargetPid\` is already dead, returns \`{dead, noproc}\` immediately.

## Rules & Verification Constraints

- Must export \`run_monitored_task/2\` and \`probe_pid_status/1\`.
- Enforced AST rules: \`requiredCalls: ["erlang:spawn_monitor/1", "erlang:monitor/2", "erlang:demonitor/2"]\`.
`,
    mentalModelCheck: {
      question: 'What message does the BEAM deliver if you call `erlang:monitor(process, DeadPid)` on a process that already terminated?',
      codeSnippet: `DeadPid = spawn(fun() -> ok end),
timer:sleep(50),
MRef = erlang:monitor(process, DeadPid).`,
      options: [
        {
          id: 'A',
          label: 'The runtime places `{\'DOWN\', MRef, process, DeadPid, noproc}` into the caller’s mailbox immediately, avoiding any check-then-act race conditions.',
          isCorrect: true,
          explanation: 'Correct! The BEAM guarantees that monitoring a non-existent process immediately delivers `{\'DOWN\', MRef, process, DeadPid, noproc}`, completely preventing check-then-monitor race conditions.',
        },
        {
          id: 'B',
          label: 'erlang:monitor/2 crashes with badarg.',
          isCorrect: false,
          explanation: 'erlang:monitor/2 does not crash on dead PIDs; it sends a noproc DOWN message.',
        },
        {
          id: 'C',
          label: 'The caller hangs waiting for an exit signal.',
          isCorrect: false,
          explanation: 'Monitors do not wait or block callers.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'spawn_monitor',
        module: 'erlang',
        signature: 'spawn_monitor(Fun) -> {pid(), reference()}',
        typesSpec: ['Fun = function()', '{pid(), reference()}'],
        description: 'Atomically creates a new process and starts a monitor to watch it.',
        complexityNote: 'O(1) allocation with atomic monitor setup.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#spawn_monitor/1',
      },
      {
        functionName: 'monitor',
        module: 'erlang',
        signature: 'erlang:monitor(process, Item) -> reference()',
        typesSpec: ['Item = pid() | atom()'],
        description: 'Starts monitoring target. If target is dead, sends noproc DOWN message.',
        complexityNote: 'O(1) table registration.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#monitor/2',
      },
      {
        functionName: 'demonitor',
        module: 'erlang',
        signature: 'demonitor(Ref, [flush]) -> boolean()',
        typesSpec: ['Ref = reference()'],
        description: 'Removes monitor and flushes any pending DOWN message from mailbox.',
        complexityNote: 'O(1) deletion plus scan of mailbox.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#demonitor/2',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch06-06-1',
        title: 'Successful Task Execution',
        erlangCall: 'worker_watcher:run_monitored_task(fun() -> 21 * 2 end, 1000)',
        expectedOutput: '{ok, 42}',
        explanation: 'Worker completed calculation and monitor flushed cleanly.',
      },
      {
        id: 'tc-ch06-06-2',
        title: 'Crash Isolation: Caller Survives Badarith',
        erlangCall: 'worker_watcher:run_monitored_task(fun() -> 1 / 0 end, 1000)',
        expectedOutput: '{error, {crashed, badarith}}',
        explanation: 'Worker division by zero caught via DOWN message; caller unhurt.',
      },
      {
        id: 'tc-ch06-06-3',
        title: 'Dead-PID Noproc Invariant',
        erlangCall: 'begin Dead = spawn(fun() -> ok end), timer:sleep(30), worker_watcher:probe_pid_status(Dead) end',
        expectedOutput: '{dead, noproc}',
        explanation: 'Confirmed probe_pid_status returns {dead, noproc} on already-dead PID.',
      },
    ],
    astRules: {
      requiredCalls: ['erlang:spawn_monitor/1', 'erlang:monitor/2', 'erlang:demonitor/2'],
      requiredConstructs: ['receive_after'],
    },
    solutionExplanation: 'Demonstrates unidirectional process monitors, crash isolation, timeout worker termination, and the noproc dead-PID invariant.',
    starterCode: `-module(worker_watcher).
-export([
    run_monitored_task/2,
    probe_pid_status/1
]).

%% Architectural Requirement:
%% Atomically spawn and monitor TaskFun via spawn_monitor/1.
%% - Success: receive {task_result, WorkerPid, Result} -> demonitor(MRef, [flush]), return {ok, Result}.
%% - Crash: receive {'DOWN', MRef, process, WorkerPid, Reason} -> return {error, {crashed, NormalizedReason}}.
%% - Timeout: after TimeoutMs -> exit(WorkerPid, kill), demonitor(MRef, [flush]), return {error, timeout}.
run_monitored_task(TaskFun, TimeoutMs) ->
    ok.

%% Architectural Requirement:
%% Attach temporary monitor to TargetPid (erlang:monitor(process, TargetPid)).
%% - If {'DOWN', MRef, process, TargetPid, noproc} is immediately received -> return {dead, noproc}.
%% - If no message arrives after 20ms -> demonitor(MRef, [flush]), return alive.
probe_pid_status(TargetPid) ->
    ok.
`,
    solutionCode: `-module(worker_watcher).
-export([
    run_monitored_task/2,
    probe_pid_status/1
]).

run_monitored_task(TaskFun, TimeoutMs) when is_function(TaskFun, 0), is_integer(TimeoutMs) ->
    Caller = self(),
    {WorkerPid, MRef} = spawn_monitor(fun() ->
        Result = TaskFun(),
        Caller ! {task_result, self(), Result}
    end),
    receive
        {task_result, WorkerPid, Result} ->
            erlang:demonitor(MRef, [flush]),
            {ok, Result};
        {'DOWN', MRef, process, WorkerPid, Reason} ->
            Normalized = case Reason of
                {R, _} -> R;
                R      -> R
            end,
            {error, {crashed, Normalized}}
    after TimeoutMs ->
        exit(WorkerPid, kill),
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

probe_pid_status(TargetPid) when is_pid(TargetPid) ->
    MRef = erlang:monitor(process, TargetPid),
    receive
        {'DOWN', MRef, process, TargetPid, Reason} ->
            {dead, Reason}
    after 20 ->
        erlang:demonitor(MRef, [flush]),
        alive
    end.
`,
    files: [
      {
        name: 'worker_watcher.erl',
        path: 'src/worker_watcher.erl',
        content: `-module(worker_watcher).
-export([
    run_monitored_task/2,
    probe_pid_status/1
]).

%% Architectural Requirement:
%% Atomically spawn and monitor TaskFun via spawn_monitor/1.
%% - Success: receive {task_result, WorkerPid, Result} -> demonitor(MRef, [flush]), return {ok, Result}.
%% - Crash: receive {'DOWN', MRef, process, WorkerPid, Reason} -> return {error, {crashed, NormalizedReason}}.
%% - Timeout: after TimeoutMs -> exit(WorkerPid, kill), demonitor(MRef, [flush]), return {error, timeout}.
run_monitored_task(TaskFun, TimeoutMs) ->
    ok.

%% Architectural Requirement:
%% Attach temporary monitor to TargetPid (erlang:monitor(process, TargetPid)).
%% - If {'DOWN', MRef, process, TargetPid, noproc} is immediately received -> return {dead, noproc}.
%% - If no message arrives after 20ms -> demonitor(MRef, [flush]), return alive.
probe_pid_status(TargetPid) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/worker_watcher.erl': `-module(worker_watcher).
-export([
    run_monitored_task/2,
    probe_pid_status/1
]).

run_monitored_task(TaskFun, TimeoutMs) when is_function(TaskFun, 0), is_integer(TimeoutMs) ->
    Caller = self(),
    {WorkerPid, MRef} = spawn_monitor(fun() ->
        Result = TaskFun(),
        Caller ! {task_result, self(), Result}
    end),
    receive
        {task_result, WorkerPid, Result} ->
            erlang:demonitor(MRef, [flush]),
            {ok, Result};
        {'DOWN', MRef, process, WorkerPid, Reason} ->
            Normalized = case Reason of
                {R, _} -> R;
                R      -> R
            end,
            {error, {crashed, Normalized}}
    after TimeoutMs ->
        exit(WorkerPid, kill),
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

probe_pid_status(TargetPid) when is_pid(TargetPid) ->
    MRef = erlang:monitor(process, TargetPid),
    receive
        {'DOWN', MRef, process, TargetPid, Reason} ->
            {dead, Reason}
    after 20 ->
        erlang:demonitor(MRef, [flush]),
        alive
    end.
`,
    },
  },

  // ── Lesson 6.7: Concept Exercise ───────────────────────────────────────────
  {
    id: 'ch06-l07',
    chapterNumber: 6,
    lessonNumber: 7,
    lessonType: 'concept_exercise',
    title: 'Race Conditions & Mailbox Hygiene: Why demonitor(Ref, [flush]) is Mandatory',
    difficulty: 'Intermediate',
    xpReward: 100,
    visualScene: 'links_monitors_signals',
    conceptMarkdown: `## Why This Matters in Production

In high-throughput microservices handling millions of requests per hour, subtle resource leaks can take days to manifest. One of the most infamous leaks in Erlang systems is the **Lingering \`'DOWN'\` Message Leak**.

Consider a client sending a synchronous request to an ephemeral worker process:
1. The client monitors the worker: \`MRef = erlang:monitor(process, WorkerPid)\`.
2. The worker computes the answer, sends the reply \`{done, self(), 42}\` to the client, and immediately calls \`exit(normal)\`.
3. Because message passing and process exit happen within microseconds, **both the reply AND the \`'DOWN'\` message arrive in the client's mailbox simultaneously**!
4. The client's \`receive\` block matches \`{done, WorkerPid, 42}\` and finishes the function call.
5. The client calls plain \`erlang:demonitor(MRef)\` (without options).
6. **THE BUG:** Plain \`demonitor(MRef)\` tells ERTS not to deliver *future* messages for \`MRef\`. **It does NOT remove the \`'DOWN'\` message that is ALREADY sitting in the client's mailbox!**
7. Over 500,000 requests, 500,000 stale \`'DOWN'\` tuples accumulate in the client's Save Queue, consuming gigabytes of memory and degrading mailbox scan latency!

## Deep Concept Breakdown & Under the Hood

### The Solution: \`erlang:demonitor(MRef, [flush])\`
To eliminate this race condition, Erlang added the **\`[flush]\`** option:

\`\`\`erlang
erlang:demonitor(MRef, [flush])
\`\`\`

When \`[flush]\` is passed, the BEAM runtime in C performs an atomic operation:
1. It unregisters the monitor.
2. It immediately checks the calling process's mailbox and Save Queue.
3. If an existing \`{'DOWN', MRef, ...}\` message is present, it **purges it from memory immediately**.
4. The caller's mailbox is guaranteed to be 100% clean!

> [!warning] Fault-Tolerance Trap: Forgetting [flush] on Synchronous Helpers
> Whenever you write a synchronous helper using temporary monitors (\`MRef = monitor(process, Pid)\`), you **must always call \`erlang:demonitor(MRef, [flush])\`** once the reply has been processed. Omitting \`[flush]\` is a classic production defect.

## Parallel Worked Example

The following module executes a worker and measures mailbox contamination:

\`\`\`erlang
-module(ephemeral_tester).
-export([call_worker/2, count_stale_downs/0]).

call_worker(Fun, Arg) ->
    Caller = self(),
    {Pid, MRef} = spawn_monitor(fun() ->
        Caller ! {reply, self(), Fun(Arg)},
        exit(normal)
    end),
    receive
        {reply, Pid, Res} ->
            %% Flush ensures the simultaneous 'DOWN' is purged!
            erlang:demonitor(MRef, [flush]),
            {ok, Res}
    after 1000 ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

count_stale_downs() ->
    drain_downs(0).

drain_downs(Count) ->
    receive
        {'DOWN', _, process, _, _} ->
            drain_downs(Count + 1)
    after 0 ->
        Count
    end.
\`\`\`

## Assignment Specification

Implement \`src/monitor_hygiene.erl\` exporting \`call_with_clean_mailbox/2\` and \`count_lingering_downs/0\`:

1. \`call_with_clean_mailbox(WorkerFun, Input)\`:
   - Spawns and monitors an ephemeral worker: \`{WorkerPid, MRef} = spawn_monitor(...)\`.
   - The worker evaluates \`WorkerFun(Input)\`, sends \`{done, self(), Result}\` to the caller, and immediately terminates with \`exit(worker_completed)\`.
   - The caller pauses for 5ms (\`timer:sleep(5)\`) so both \`{done, ...}\` and \`{'DOWN', ...}\` are sitting in the mailbox.
   - The caller consumes \`{done, WorkerPid, Result}\`, calls \`erlang:demonitor(MRef, [flush])\`, and counts any remaining \`'DOWN'\` messages using \`count_lingering_downs()\`.
   - Returns \`{ok, Result, LingeringCount}\` (where \`LingeringCount\` must equal \`0\`).
2. \`count_lingering_downs()\`:
   - Non-blockingly drains and counts all \`{'DOWN', _, process, _, _}\` messages currently in \`self()\`'s mailbox using \`after 0\`.

## Rules & Verification Constraints

- Must call \`erlang:demonitor(MRef, [flush])\`.
- Enforced AST rule: \`requiredCalls: ["erlang:demonitor/2"]\`.
`,
    mentalModelCheck: {
      question: 'Why is `erlang:demonitor(MRef, [flush])` mandatory over plain `erlang:demonitor(MRef)` when finishing a synchronous call?',
      codeSnippet: `receive
    {done, WorkerPid, Result} ->
        erlang:demonitor(MRef, [flush])
end.`,
      options: [
        {
          id: 'A',
          label: 'If the worker terminated right as it sent its reply, its \'DOWN\' message is already queued in the mailbox; [flush] purges it atomically to prevent mailbox memory leaks.',
          isCorrect: true,
          explanation: 'Correct! Plain demonitor only prevents future DOWN messages. If the DOWN message arrived before demonitor was called, [flush] scans and deletes it, keeping the mailbox pristine.',
        },
        {
          id: 'B',
          label: 'Plain demonitor crashes the target worker process.',
          isCorrect: false,
          explanation: 'demonitor does not affect the target worker; it only affects the caller.',
        },
        {
          id: 'C',
          label: '[flush] is required to save the return value to ETS.',
          isCorrect: false,
          explanation: 'demonitor has nothing to do with ETS tables.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'demonitor',
        module: 'erlang',
        signature: 'erlang:demonitor(MonitorRef, [flush]) -> boolean()',
        typesSpec: ['MonitorRef = reference()'],
        description: 'Disables monitor and purges any already-delivered DOWN message for MonitorRef from mailbox.',
        complexityNote: 'O(M) scan of mailbox messages, but O(1) in typical clean mailboxes.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#demonitor/2',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch06-07-1',
        title: 'Zero Lingering DOWN Messages With [flush]',
        erlangCall: 'monitor_hygiene:call_with_clean_mailbox(fun(X) -> X * 2 end, 21)',
        expectedOutput: '{ok, 42, 0}',
        explanation: 'Worker exited immediately after reply; [flush] purged the DOWN message, leaving 0 lingering messages.',
      },
      {
        id: 'tc-ch06-07-2',
        title: 'Mailbox Drain Helper Count',
        erlangCall: `begin self() ! {'DOWN', make_ref(), process, self(), test}, monitor_hygiene:count_lingering_downs() end`,
        expectedOutput: '1',
        explanation: 'Verifies that count_lingering_downs accurately drains and tallies un-flushed DOWN messages.',
      },
    ],
    astRules: {
      requiredCalls: ['erlang:demonitor/2'],
    },
    solutionExplanation: 'Demonstrates the monitor race condition and why demonitor(Ref, [flush]) is mandatory to prevent Save Queue memory pollution.',
    starterCode: `-module(monitor_hygiene).
-export([
    call_with_clean_mailbox/2,
    count_lingering_downs/0
]).

%% Architectural Requirement:
%% 1. Spawn monitored worker: {WorkerPid, MRef} = spawn_monitor(...).
%% 2. Worker computes WorkerFun(Input), sends {done, self(), Result} to Caller, exits with worker_completed.
%% 3. Caller sleeps 10ms (timer:sleep(10)), receives {done, WorkerPid, Result},
%%    calls erlang:demonitor(MRef, [flush]), and returns {ok, Result, count_lingering_downs()}.
%% 4. Timeout after 1000ms: demonitor(MRef, [flush]), return {error, timeout}.
call_with_clean_mailbox(WorkerFun, Input) ->
    ok.

%% Architectural Requirement:
%% Drain all lingering {'DOWN', _, process, _, _} messages non-blockingly using 'after 0' and return count.
count_lingering_downs() ->
    ok.
`,
    solutionCode: `-module(monitor_hygiene).
-export([
    call_with_clean_mailbox/2,
    count_lingering_downs/0
]).

call_with_clean_mailbox(WorkerFun, Input) when is_function(WorkerFun, 1) ->
    Caller = self(),
    {WorkerPid, MRef} = spawn_monitor(fun() ->
        Res = WorkerFun(Input),
        Caller ! {done, self(), Res},
        exit(worker_completed)
    end),
    %% Sleep to allow both reply and exit signals to arrive in mailbox
    timer:sleep(10),
    receive
        {done, WorkerPid, Result} ->
            erlang:demonitor(MRef, [flush]),
            Lingering = count_lingering_downs(),
            {ok, Result, Lingering}
    after 1000 ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

count_lingering_downs() ->
    drain_downs(0).

drain_downs(Count) ->
    receive
        {'DOWN', _Ref, process, _Pid, _Reason} ->
            drain_downs(Count + 1)
    after 0 ->
        Count
    end.
`,
    files: [
      {
        name: 'monitor_hygiene.erl',
        path: 'src/monitor_hygiene.erl',
        content: `-module(monitor_hygiene).
-export([
    call_with_clean_mailbox/2,
    count_lingering_downs/0
]).

%% Architectural Requirement:
%% 1. Spawn monitored worker: {WorkerPid, MRef} = spawn_monitor(...).
%% 2. Worker computes WorkerFun(Input), sends {done, self(), Result} to Caller, exits with worker_completed.
%% 3. Caller sleeps 10ms (timer:sleep(10)), receives {done, WorkerPid, Result},
%%    calls erlang:demonitor(MRef, [flush]), and returns {ok, Result, count_lingering_downs()}.
%% 4. Timeout after 1000ms: demonitor(MRef, [flush]), return {error, timeout}.
call_with_clean_mailbox(WorkerFun, Input) ->
    ok.

%% Architectural Requirement:
%% Drain all lingering {'DOWN', _, process, _, _} messages non-blockingly using 'after 0' and return count.
count_lingering_downs() ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/monitor_hygiene.erl': `-module(monitor_hygiene).
-export([
    call_with_clean_mailbox/2,
    count_lingering_downs/0
]).

call_with_clean_mailbox(WorkerFun, Input) when is_function(WorkerFun, 1) ->
    Caller = self(),
    {WorkerPid, MRef} = spawn_monitor(fun() ->
        Res = WorkerFun(Input),
        Caller ! {done, self(), Res},
        exit(worker_completed)
    end),
    %% Sleep to allow both reply and exit signals to arrive in mailbox
    timer:sleep(10),
    receive
        {done, WorkerPid, Result} ->
            erlang:demonitor(MRef, [flush]),
            Lingering = count_lingering_downs(),
            {ok, Result, Lingering}
    after 1000 ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

count_lingering_downs() ->
    drain_downs(0).

drain_downs(Count) ->
    receive
        {'DOWN', _Ref, process, _Pid, _Reason} ->
            drain_downs(Count + 1)
    after 0 ->
        Count
    end.
`,
    },
  },

  // ── Lesson 6.8: Concept Exercise ───────────────────────────────────────────
  {
    id: 'ch06-l08',
    chapterNumber: 6,
    lessonNumber: 8,
    lessonType: 'concept_exercise',
    title: 'Architectural Decision Lab (Links vs. Monitors) & Building my_gen_server:call/3',
    difficulty: 'Advanced',
    xpReward: 100,
    visualScene: 'links_monitors_signals',
    conceptMarkdown: `## Why This Matters in Production

In systems design, choosing the wrong process primitive causes severe architectural defects:
- Linking when you should have monitored causes **unintended death cascades**, where a non-critical worker crash takes down the entire application.
- Monitoring when you should have linked causes **zombie leaks**, where background workers continue running forever after their parent connection disconnects.

Every backend architect must master the **Architectural Decision Matrix**:
1. **Tightly-Coupled Symmetric Peers (e.g. TCP Socket Reader + TLS Codec):** Use **\`link\`**. Neither process has any purpose if the other crashes. They must live and die together.
2. **Supervision Trees (Supervisor to Worker):** Use **\`link\` + \`process_flag(trap_exit, true)\`**. The supervisor owns the lifecycle of the worker.
3. **Client-to-Server Requests (Calling an Actor):** Use **\`monitor\`**. The client wants to know if the server crashes mid-request, but the client must NOT die if the server fails!
4. **Independent Watchers / Metrics Monitors:** Use **\`monitor\`**. An observer should never risk termination because the monitored target crashed.

## Deep Concept Breakdown & Under the Hood

### How OTP's \`gen:do_call/4\` Uses Monitors for 0ms Crash Detection
In Chapter 5, our custom actor synchronous calls looked like:
\`\`\`erlang
%% NAIVE CHAPTER 5 CALL:
Ref = make_ref(),
ServerPid ! {call, self(), Ref, Req},
receive
    {reply, Ref, Res} -> Res
after 5000 ->
    {error, timeout}
end.
\`\`\`
If \`ServerPid\` crashes 1 microsecond after receiving the request, the client sits frozen in \`after 5000\` waiting five full seconds!

By attaching a temporary monitor:
\`\`\`erlang
%% OTP PATTERN (gen.erl):
MRef = erlang:monitor(process, ServerPid),
ServerPid ! {'$gen_call', {self(), MRef}, Req},
receive
    {MRef, Reply} ->
        erlang:demonitor(MRef, [flush]),
        Reply;
    {'DOWN', MRef, process, ServerPid, Reason} ->
        {error, {server_crashed, Reason}}
after Timeout ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
end.
\`\`\`
If the server crashes mid-call, the BEAM VM delivers the \`'DOWN'\` message with **0ms latency**! The client recovers instantly without wasting five seconds.

## Assignment Specification

Implement \`src/my_gen_server.erl\` exporting \`start/2\`, \`call/3\`, \`cast/2\`, \`stop/1\`, \`choose_primitive/1\`, and \`loop/2\`:

1. \`choose_primitive(Scenario)\`:
   - \`tightly_coupled_peers\` -> \`use_link\`
   - \`supervisor_to_worker\` -> \`use_link_with_trap_exit\`
   - \`client_to_server_request\` -> \`use_monitor\`
   - \`independent_watcher\` -> \`use_monitor\`
2. \`start(CallbackMod, InitArg) -> {ok, Pid}\`:
   - Spawns server executing \`CallbackMod:init(InitArg) -> {ok, InitialState}\` and enters \`loop(CallbackMod, InitialState)\`.
3. \`call(ServerPid, Request, Timeout) -> Reply | {error, {server_crashed, Reason}} | {error, timeout}\`:
   - Implements monitor-based synchronous request protocol with 0ms crash detection.
4. \`cast(ServerPid, Request) -> ok\`:
   - Asynchronously sends \`{'$gen_cast', Request}\`.
5. \`stop(ServerPid) -> ok\`:
   - Synchronously asks the server to stop with \`call(ServerPid, stop, 1000)\`.
6. \`loop(CallbackMod, State)\`:
   - Handles \`{'$gen_call', {From, MRef}, stop}\` -> replies \`From ! {MRef, ok}\` and exits with \`normal\`.
   - Handles \`{'$gen_call', {From, MRef}, Request}\` -> calls \`CallbackMod:handle_call(Request, From, State) -> {reply, Reply, NewState}\`, replies \`From ! {MRef, Reply}\`, recurses.
   - Handles \`{'$gen_cast', Request}\` -> calls \`CallbackMod:handle_cast(Request, State) -> {noreply, NewState}\`, recurses.

## Rules & Verification Constraints

- Must export all specified functions.
- Enforced AST rules: \`requiredCalls: ["erlang:monitor/2", "erlang:demonitor/2"]\`, \`requiredConstructs: ["receive_after"]\`.
`,
    mentalModelCheck: {
      question: 'Why should a client process use a monitor rather than a link when querying a shared server actor?',
      codeSnippet: `%% Architecture Question:
%% Client <0.100.0> calls DatabaseServer <0.200.0>`,
      options: [
        {
          id: 'A',
          label: 'A monitor is unidirectional, allowing the client to detect a server crash in 0ms without sharing the server’s fate or dying itself.',
          isCorrect: true,
          explanation: 'Correct! If the client linked to the server, a crash in the server would terminate the client too. Monitors provide safe observation without fate-sharing.',
        },
        {
          id: 'B',
          label: 'Links cannot transmit messages longer than 64 bytes.',
          isCorrect: false,
          explanation: 'Links are signals, not message transports; message size is irrelevant.',
        },
        {
          id: 'C',
          label: 'Monitors allow the client to alter the server’s internal state directly.',
          isCorrect: false,
          explanation: 'Monitors never grant access to another process’s state.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'monitor',
        module: 'erlang',
        signature: 'erlang:monitor(process, ServerPid) -> reference()',
        typesSpec: ['ServerPid = pid()'],
        description: 'Creates temporary monitor providing 0ms notification if ServerPid crashes.',
        complexityNote: 'O(1) operation.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#monitor/2',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch06-08-1',
        title: 'Architectural Decision Matrix',
        erlangCall: '{my_gen_server:choose_primitive(client_to_server_request), my_gen_server:choose_primitive(tightly_coupled_peers)}',
        expectedOutput: '{use_monitor, use_link}',
        explanation: 'Confirms correct primitive selection for client calls vs tightly-coupled peers.',
      },
      {
        id: 'tc-ch06-08-2',
        title: '0ms Crash Detection on Server Mid-Call Crash',
        erlangCall: `begin CrashPid = spawn(fun() -> receive {'$gen_call', {From, MRef}, crash} -> exit(fatal_database_error) end end), my_gen_server:call(CrashPid, crash, 5000) end`,
        expectedOutput: '{error, {server_crashed, fatal_database_error}}',
        explanation: 'Caller returned immediately upon server crash via monitor DOWN message.',
      },
    ],
    astRules: {
      requiredCalls: ['erlang:monitor/2', 'erlang:demonitor/2'],
      requiredConstructs: ['receive_after'],
    },
    solutionExplanation: 'Implements the architectural decision matrix and reconstructs the OTP gen:do_call/4 synchronous protocol pairing calls with monitors.',
    starterCode: `-module(my_gen_server).
-export([
    start/2,
    call/3,
    cast/2,
    stop/1,
    choose_primitive/1,
    loop/2
]).

%% Architectural Requirement:
%% Return appropriate OTP primitive: tightly_coupled_peers -> use_link;
%% supervisor_to_worker -> use_link_with_trap_exit;
%% client_to_server_request -> use_monitor; independent_watcher -> use_monitor.
choose_primitive(Scenario) ->
    ok.

%% Architectural Requirement:
%% Spawn server running loop(CallbackMod, State) with CallbackMod:init(InitArg).
%% Parent receives {InitRef, ok, Pid} -> {ok, Pid} or {InitRef, error, Reason} -> {error, Reason}.
start(CallbackMod, InitArg) ->
    ok.

%% Architectural Requirement:
%% Reconstruct OTP gen:do_call/4:
%% 1. Attach MRef = erlang:monitor(process, ServerPid).
%% 2. Send {'$gen_call', {self(), MRef}, Request} to ServerPid.
%% 3. Match {MRef, Reply} -> demonitor(MRef, [flush]), return Reply.
%% 4. Match {'DOWN', MRef, process, ServerPid, Reason} -> return {error, {server_crashed, Reason}} immediately.
%% 5. After Timeout -> demonitor(MRef, [flush]), return {error, timeout}.
call(ServerPid, Request, Timeout) ->
    ok.

%% Architectural Requirement:
%% Send asynchronous {'$gen_cast', Request} to ServerPid and return ok.
cast(ServerPid, Request) ->
    ok.

%% Architectural Requirement:
%% Synchronously stop server via call(ServerPid, stop, 1000).
stop(ServerPid) ->
    ok.

%% Architectural Requirement:
%% Match {'$gen_call', {From, MRef}, stop} -> reply {MRef, ok} and terminate.
%% Match {'$gen_call', {From, MRef}, Request} -> CallbackMod:handle_call, reply to From, recurse with NewState.
%% Match {'$gen_cast', Request} -> CallbackMod:handle_cast and recurse with NewState.
loop(CallbackMod, State) ->
    ok.
`,
    solutionCode: `-module(my_gen_server).
-export([
    start/2,
    call/3,
    cast/2,
    stop/1,
    choose_primitive/1,
    loop/2
]).

choose_primitive(tightly_coupled_peers)    -> use_link;
choose_primitive(supervisor_to_worker)     -> use_link_with_trap_exit;
choose_primitive(client_to_server_request) -> use_monitor;
choose_primitive(independent_watcher)      -> use_monitor.

start(CallbackMod, InitArg) ->
    InitRef = make_ref(),
    Parent = self(),
    _Pid = spawn(fun() ->
        case CallbackMod:init(InitArg) of
            {ok, InitialState} ->
                Parent ! {InitRef, ok, self()},
                loop(CallbackMod, InitialState);
            {error, Reason} ->
                Parent ! {InitRef, error, Reason}
        end
    end),
    receive
        {InitRef, ok, ServerPid} -> {ok, ServerPid};
        {InitRef, error, Reason} -> {error, Reason}
    after 1000 ->
        {error, init_timeout}
    end.

call(ServerPid, Request, Timeout) ->
    MRef = erlang:monitor(process, ServerPid),
    ServerPid ! {'$gen_call', {self(), MRef}, Request},
    receive
        {MRef, Reply} ->
            erlang:demonitor(MRef, [flush]),
            Reply;
        {'DOWN', MRef, process, ServerPid, Reason} ->
            {error, {server_crashed, Reason}}
    after Timeout ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

cast(ServerPid, Request) ->
    ServerPid ! {'$gen_cast', Request},
    ok.

stop(ServerPid) ->
    call(ServerPid, stop, 1000).

loop(CallbackMod, State) ->
    receive
        {'$gen_call', {From, MRef}, stop} ->
            From ! {MRef, ok},
            ok;

        {'$gen_call', {From, MRef}, Request} ->
            case CallbackMod:handle_call(Request, From, State) of
                {reply, Reply, NewState} ->
                    From ! {MRef, Reply},
                    loop(CallbackMod, NewState);
                {stop, Reason, Reply, _FinalState} ->
                    From ! {MRef, Reply},
                    exit(Reason)
            end;

        {'$gen_cast', Request} ->
            case CallbackMod:handle_cast(Request, State) of
                {noreply, NewState} ->
                    loop(CallbackMod, NewState);
                {stop, Reason, _FinalState} ->
                    exit(Reason)
            end
    end.
`,
    files: [
      {
        name: 'my_gen_server.erl',
        path: 'src/my_gen_server.erl',
        content: `-module(my_gen_server).
-export([
    start/2,
    call/3,
    cast/2,
    stop/1,
    choose_primitive/1,
    loop/2
]).

%% Architectural Requirement:
%% Return appropriate OTP primitive: tightly_coupled_peers -> use_link;
%% supervisor_to_worker -> use_link_with_trap_exit;
%% client_to_server_request -> use_monitor; independent_watcher -> use_monitor.
choose_primitive(Scenario) ->
    ok.

%% Architectural Requirement:
%% Spawn server running loop(CallbackMod, State) with CallbackMod:init(InitArg).
%% Parent receives {InitRef, ok, Pid} -> {ok, Pid} or {InitRef, error, Reason} -> {error, Reason}.
start(CallbackMod, InitArg) ->
    ok.

%% Architectural Requirement:
%% Reconstruct OTP gen:do_call/4:
%% 1. Attach MRef = erlang:monitor(process, ServerPid).
%% 2. Send {'$gen_call', {self(), MRef}, Request} to ServerPid.
%% 3. Match {MRef, Reply} -> demonitor(MRef, [flush]), return Reply.
%% 4. Match {'DOWN', MRef, process, ServerPid, Reason} -> return {error, {server_crashed, Reason}} immediately.
%% 5. After Timeout -> demonitor(MRef, [flush]), return {error, timeout}.
call(ServerPid, Request, Timeout) ->
    ok.

%% Architectural Requirement:
%% Send asynchronous {'$gen_cast', Request} to ServerPid and return ok.
cast(ServerPid, Request) ->
    ok.

%% Architectural Requirement:
%% Synchronously stop server via call(ServerPid, stop, 1000).
stop(ServerPid) ->
    ok.

%% Architectural Requirement:
%% Match {'$gen_call', {From, MRef}, stop} -> reply {MRef, ok} and terminate.
%% Match {'$gen_call', {From, MRef}, Request} -> CallbackMod:handle_call, reply to From, recurse with NewState.
%% Match {'$gen_cast', Request} -> CallbackMod:handle_cast and recurse with NewState.
loop(CallbackMod, State) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/my_gen_server.erl': `-module(my_gen_server).
-export([
    start/2,
    call/3,
    cast/2,
    stop/1,
    choose_primitive/1,
    loop/2
]).

choose_primitive(tightly_coupled_peers)    -> use_link;
choose_primitive(supervisor_to_worker)     -> use_link_with_trap_exit;
choose_primitive(client_to_server_request) -> use_monitor;
choose_primitive(independent_watcher)      -> use_monitor.

start(CallbackMod, InitArg) ->
    InitRef = make_ref(),
    Parent = self(),
    _Pid = spawn(fun() ->
        case CallbackMod:init(InitArg) of
            {ok, InitialState} ->
                Parent ! {InitRef, ok, self()},
                loop(CallbackMod, InitialState);
            {error, Reason} ->
                Parent ! {InitRef, error, Reason}
        end
    end),
    receive
        {InitRef, ok, ServerPid} -> {ok, ServerPid};
        {InitRef, error, Reason} -> {error, Reason}
    after 1000 ->
        {error, init_timeout}
    end.

call(ServerPid, Request, Timeout) ->
    MRef = erlang:monitor(process, ServerPid),
    ServerPid ! {'$gen_call', {self(), MRef}, Request},
    receive
        {MRef, Reply} ->
            erlang:demonitor(MRef, [flush]),
            Reply;
        {'DOWN', MRef, process, ServerPid, Reason} ->
            {error, {server_crashed, Reason}}
    after Timeout ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

cast(ServerPid, Request) ->
    ServerPid ! {'$gen_cast', Request},
    ok.

stop(ServerPid) ->
    call(ServerPid, stop, 1000).

loop(CallbackMod, State) ->
    receive
        {'$gen_call', {From, MRef}, stop} ->
            From ! {MRef, ok},
            ok;

        {'$gen_call', {From, MRef}, Request} ->
            case CallbackMod:handle_call(Request, From, State) of
                {reply, Reply, NewState} ->
                    From ! {MRef, Reply},
                    loop(CallbackMod, NewState);
                {stop, Reason, Reply, _FinalState} ->
                    From ! {MRef, Reply},
                    exit(Reason)
            end;

        {'$gen_cast', Request} ->
            case CallbackMod:handle_cast(Request, State) of
                {noreply, NewState} ->
                    loop(CallbackMod, NewState);
                {stop, Reason, _FinalState} ->
                    exit(Reason)
            end
    end.
`,
    },
  },

  // ── Lesson 6.9: Incident Triage ───────────────────────────────────────────
  {
    id: 'ch06-l09',
    chapterNumber: 6,
    lessonNumber: 9,
    lessonType: 'incident_triage',
    title: 'Production Incident #102: Hanging Client Calls When Worker Crashes Mid-Request',
    difficulty: 'Production',
    xpReward: 175,
    visualScene: 'links_monitors_signals',
    incidentAlert: {
      incidentId: 'INC-102',
      severity: 'CRITICAL',
      serviceName: 'checkout-pricing-rpc',
      symptom: 'Whenever a malformed SKU triggers a badarith crash inside pricing_worker, 100% of calling HTTP checkout handlers freeze for 5,000ms before timing out, exhausting the web connection pool.',
      rootCauseHint: 'call_pricing_worker/2 uses raw make_ref() and receive ... after 5000 without monitoring the worker PID. When the worker crashes 1ms into the request, no reply is ever sent and the caller sits blind until the 5s timer expires.',
      fixObjective: 'Attach MRef = erlang:monitor(process, WorkerPid) before sending the request, demonitor with [flush] on reply, and handle {\'DOWN\', MRef, process, WorkerPid, Reason} to return {error, {worker_down, Reason}} in <10ms.',
    },
    conceptMarkdown: `## Why This Matters in Production

At 14:22 UTC, the e-commerce checkout gateway suffered a cascading outage. Customers attempting to purchase promotional items experienced 5-second spinning wheels, and frontend web server connection pools were 100% exhausted.

The post-mortem revealed that an inventory price sync bug caused \`pricing_worker\` to crash with \`badarith\` on certain SKUs. Because the client function \`call_pricing_worker/2\` relied strictly on \`make_ref()\` and \`receive ... after 5000\`, every single client process blocked for the full 5,000 milliseconds waiting for a reply from a dead process.

## Deep Concept Breakdown & Under the Hood

### Root Cause: Blind Receive Without Process Monitoring
\`\`\`erlang
%% BUGGY IMPLEMENTATION:
call_pricing_worker(WorkerPid, Item) ->
    Ref = make_ref(),
    WorkerPid ! {get_price, self(), Ref, Item},
    receive
        {price, Ref, Price} -> {ok, Price}
    after 5000 ->
        {error, timeout}
    end.
\`\`\`
1. Client sends request to \`WorkerPid\`.
2. \`WorkerPid\` crashes 0.1ms later due to invalid data.
3. No reply tuple is ever sent.
4. Client has no link and no monitor attached to \`WorkerPid\`. The client is completely blind to the crash!
5. Client remains suspended until the 5,000ms timeout expires.

### The Remedy: Attach Monitor for 0ms Crash Notification
To fix this production vulnerability:
1. Call \`MRef = erlang:monitor(process, WorkerPid)\` before sending the request.
2. In \`receive\`, match on \`{price, MRef, Price}\` (or correlated ref), flushing the monitor on reply.
3. Add a clause for \`{'DOWN', MRef, process, WorkerPid, Reason}\` that unblocks the caller immediately with \`{error, {worker_down, Reason}}\`.

## Assignment Specification

Triage and fix \`src/incident_hanging_call.erl\`:
1. In \`call_pricing_worker/2\`, attach \`erlang:monitor(process, WorkerPid)\`.
2. When the worker replies normally, call \`erlang:demonitor(MRef, [flush])\` and return \`{ok, Price}\`.
3. When the worker crashes mid-request, catch \`{'DOWN', MRef, process, WorkerPid, Reason}\` and return \`{error, {worker_down, Reason}}\` immediately (< 50ms).
4. Preserve export \`start_pricing_worker/0\` (and backward-compatible alias \`start_worker/0\`).

## Rules & Verification Constraints

- Crashed requests must return \`{error, {worker_down, ...}}\` in under 100ms.
- Valid requests must return \`{ok, Price}\`.
`,
    mentalModelCheck: {
      question: 'What is the root cause of client calls freezing for 5,000ms when a worker crashes mid-request?',
      codeSnippet: `call(Pid, Msg) ->
    Ref = make_ref(),
    Pid ! {req, self(), Ref, Msg},
    receive {reply, Ref, Res} -> Res after 5000 -> timeout end.`,
      options: [
        {
          id: 'A',
          label: 'The client is neither linked to nor monitoring the worker; when the worker crashes, the client has no way of knowing it died and must wait for the full timeout to expire.',
          isCorrect: true,
          explanation: 'Correct! Without a monitor, the caller is blind to process crashes. Attaching a monitor notifies the caller instantly via a DOWN message.',
        },
        {
          id: 'B',
          label: 'The BEAM kernel locks the caller’s socket during worker crashes.',
          isCorrect: false,
          explanation: 'Erlang does not lock sockets on process crashes.',
        },
        {
          id: 'C',
          label: 'make_ref() generates duplicate references when workers crash.',
          isCorrect: false,
          explanation: 'make_ref() generates globally unique 128-bit references.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'monitor',
        module: 'erlang',
        signature: 'erlang:monitor(process, WorkerPid) -> reference()',
        typesSpec: ['WorkerPid = pid()'],
        description: 'Enables instant notification if WorkerPid crashes during request.',
        complexityNote: 'O(1) operation.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#monitor/2',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch06-09-1',
        title: 'Valid Pricing Query',
        erlangCall: 'begin {ok, W} = incident_hanging_call:start_pricing_worker(), Res = incident_hanging_call:call_pricing_worker(W, widget_a), W ! stop, Res end',
        expectedOutput: '{ok, 49.99}',
        explanation: 'Normal item pricing query returns {ok, 49.99} cleanly.',
      },
      {
        id: 'tc-ch06-09-2',
        title: 'Fast-Fail Crash Notification (< 100ms)',
        erlangCall: 'begin {ok, W} = incident_hanging_call:start_pricing_worker(), incident_hanging_call:call_pricing_worker(W, poison_item) end',
        expectedOutput: '{error, {worker_down, badarith}}',
        explanation: 'Poison item crashed worker with badarith; caller unblocked in <10ms via monitor DOWN message.',
      },
    ],
    astRules: {
      requiredCalls: ['erlang:monitor/2', 'erlang:demonitor/2'],
      requiredConstructs: ['receive_after'],
    },
    solutionExplanation: 'Fixes production incident by attaching a temporary monitor in call_pricing_worker to detect worker crashes in 0ms without waiting for timeouts.',
    starterCode: `-module(incident_hanging_call).
-export([
    start_pricing_worker/0,
    start_worker/0,
    call_pricing_worker/2,
    worker_loop/0
]).

start_pricing_worker() ->
    Pid = spawn(fun() -> worker_loop() end),
    {ok, Pid}.

%% Backward-compatible alias
start_worker() ->
    start_pricing_worker().

%% % TODO [INC-102 Triage]:
%% The caller hangs for 5,000ms when the worker process crashes mid-request.
%% Eliminate blind timeouts by attaching a process monitor before sending,
%% handling instant 'DOWN' notifications, and demonitoring on success.
call_pricing_worker(WorkerPid, Item) ->
    Ref = make_ref(),
    WorkerPid ! {get_price, self(), Ref, Item},
    receive
        {price, Ref, Price} ->
            {ok, Price}
    after 5000 ->
        {error, timeout}
    end.

worker_loop() ->
    receive
        {get_price, From, Ref, widget_a} ->
            From ! {price, Ref, 49.99},
            worker_loop();
        {get_price, From, Ref, widget_b} ->
            From ! {price, Ref, 19.99},
            worker_loop();
        {get_price, _From, _Ref, poison_item} ->
            %% Deliberate production crash simulation!
            1 / 0;
        stop ->
            ok
    end.
`,
    solutionCode: `-module(incident_hanging_call).
-export([
    start_pricing_worker/0,
    start_worker/0,
    call_pricing_worker/2,
    worker_loop/0
]).

start_pricing_worker() ->
    Pid = spawn(fun() -> worker_loop() end),
    {ok, Pid}.

start_worker() ->
    start_pricing_worker().

call_pricing_worker(WorkerPid, Item) ->
    MRef = erlang:monitor(process, WorkerPid),
    WorkerPid ! {get_price, self(), MRef, Item},
    receive
        {price, MRef, Price} ->
            erlang:demonitor(MRef, [flush]),
            {ok, Price};
        {'DOWN', MRef, process, WorkerPid, Reason} ->
            NormReason = case Reason of
                {R, _} -> R;
                R      -> R
            end,
            {error, {worker_down, NormReason}}
    after 5000 ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

worker_loop() ->
    receive
        {get_price, From, Ref, widget_a} ->
            From ! {price, Ref, 49.99},
            worker_loop();
        {get_price, From, Ref, widget_b} ->
            From ! {price, Ref, 19.99},
            worker_loop();
        {get_price, _From, _Ref, poison_item} ->
            1 / 0;
        stop ->
            ok
    end.
`,
    files: [
      {
        name: 'incident_hanging_call.erl',
        path: 'src/incident_hanging_call.erl',
        content: `-module(incident_hanging_call).
-export([
    start_pricing_worker/0,
    start_worker/0,
    call_pricing_worker/2,
    worker_loop/0
]).

start_pricing_worker() ->
    Pid = spawn(fun() -> worker_loop() end),
    {ok, Pid}.

%% Backward-compatible alias
start_worker() ->
    start_pricing_worker().

%% % TODO [INC-102 Triage]:
%% The caller hangs for 5,000ms when the worker process crashes mid-request.
%% Eliminate blind timeouts by attaching a process monitor before sending,
%% handling instant 'DOWN' notifications, and demonitoring on success.
call_pricing_worker(WorkerPid, Item) ->
    Ref = make_ref(),
    WorkerPid ! {get_price, self(), Ref, Item},
    receive
        {price, Ref, Price} ->
            {ok, Price}
    after 5000 ->
        {error, timeout}
    end.

worker_loop() ->
    receive
        {get_price, From, Ref, widget_a} ->
            From ! {price, Ref, 49.99},
            worker_loop();
        {get_price, From, Ref, widget_b} ->
            From ! {price, Ref, 19.99},
            worker_loop();
        {get_price, _From, _Ref, poison_item} ->
            %% Deliberate production crash simulation!
            1 / 0;
        stop ->
            ok
    end.
`,
      },
    ],
    solutionFiles: {
      'src/incident_hanging_call.erl': `-module(incident_hanging_call).
-export([
    start_pricing_worker/0,
    start_worker/0,
    call_pricing_worker/2,
    worker_loop/0
]).

start_pricing_worker() ->
    Pid = spawn(fun() -> worker_loop() end),
    {ok, Pid}.

start_worker() ->
    start_pricing_worker().

call_pricing_worker(WorkerPid, Item) ->
    MRef = erlang:monitor(process, WorkerPid),
    WorkerPid ! {get_price, self(), MRef, Item},
    receive
        {price, MRef, Price} ->
            erlang:demonitor(MRef, [flush]),
            {ok, Price};
        {'DOWN', MRef, process, WorkerPid, Reason} ->
            NormReason = case Reason of
                {R, _} -> R;
                R      -> R
            end,
            {error, {worker_down, NormReason}}
    after 5000 ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

worker_loop() ->
    receive
        {get_price, From, Ref, widget_a} ->
            From ! {price, Ref, 49.99},
            worker_loop();
        {get_price, From, Ref, widget_b} ->
            From ! {price, Ref, 19.99},
            worker_loop();
        {get_price, _From, _Ref, poison_item} ->
            1 / 0;
        stop ->
            ok
    end.
`,
    },
  },

  // ── Lesson 6.10: Problem Set ───────────────────────────────────────────────
  {
    id: 'ch06-l10',
    chapterNumber: 6,
    lessonNumber: 10,
    lessonType: 'problem_set',
    title: 'Chapter 6 Mini-Capstone: The Resilient Payment Gateway, Watcher & Idempotent Store (payment_system.erl)',
    difficulty: 'Production',
    xpReward: 250,
    visualScene: 'links_monitors_signals',
    conceptMarkdown: `## Why This Matters in Production

In financial technology and high-volume transaction gateways, two requirements are absolute:
1. **Zero Double-Charges (Idempotency):** Network timeouts and retries must never cause a customer's credit card to be charged twice for the same purchase.
2. **Crash Resilience Without State Loss:** If a payment worker process encounters a poison pill payload or hardware fault and crashes, all previously settled transaction records must remain 100% durable in memory!

In traditional multithreaded languages, engineers attempt to achieve this with distributed locks and database transactions, which introduce lock contention and latency spikes.

In Erlang, we achieve this through **Separation of Concerns across Actors**:
- **The Watcher / Coordinator Process:** A durable, long-lived process holding the committed transaction store (\`tx_store\`) keyed by \`RequestId\` (**Idempotency Key**). It never performs risky validation or network calls directly.
- **The Disposable Payment Worker:** A monitored sub-process that validates and executes charges. If it crashes, the Watcher catches the \`'DOWN'\` message, spawns a pristine replacement worker up to \`MaxRestarts\`, and continues serving traffic with zero data loss!

## Deep Concept Breakdown & Under the Hood

### 1. The 3-Step Idempotent Charge Protocol
When a client invokes \`charge(WatcherPid, RequestId, Amount, Currency)\`:
1. **Step 1 (Idempotency Check):** The Watcher checks if \`RequestId\` already exists in its \`tx_store\`. If found, it immediately returns \`{ok, {already_processed, SavedReceipt}}\` without contacting the worker!
2. **Step 2 (Delegated Worker Execution):** If new, the Watcher delegates \`{validate_and_charge, RequestId, Amount, Currency}\` to its active \`worker_pid\`.
   - The worker validates:
     - \`Amount > 0\` and \`is_integer(Amount)\` -> if invalid, replies \`{error, invalid_amount}\` (business validation, worker stays alive).
     - \`Currency in [usd, eur, etb]\` -> if invalid, replies \`{error, unsupported_currency}\`.
     - Valid -> returns \`{ok, #{tx_id => RequestId, amount => Amount, currency => Currency, status => settled}}\`.
3. **Step 3 (Durable Commit):** The Watcher inserts \`RequestId => ReceiptMap\` into its \`tx_store\` and replies to the client with \`{ok, ReceiptMap}\`.

### 2. Automatic Worker Replacement & Crash Testing
When \`trigger_crash_test(WatcherPid)\` is called:
- The active worker is commanded to exit with \`exit(simulated_payment_worker_crash)\`.
- The Watcher intercepts \`{'DOWN', MRef, process, OldWorker, simulated_payment_worker_crash}\`.
- If \`restarts_left > 0\`, the Watcher decrements \`restarts_left\`, increments \`restart_count\`, spawns a fresh monitored worker, and preserves the entire \`tx_store\`!
- If \`restarts_left == 0\`, the Watcher records that no active worker is available and returns \`{error, max_restarts_exceeded}\`.

## Assignment Specification

Implement \`src/payment_system.erl\` with the following exports:
\`\`\`erlang
-module(payment_system).
-export([
    start_system/1,
    charge/4,
    trigger_crash_test/1,
    get_active_worker/1,
    get_processed_txs/1,
    stop_system/1,
    watcher_loop/1,
    worker_loop/0
]).
\`\`\`

1. \`start_system(MaxRestarts) -> {ok, WatcherPid}\`:
   - Spawns Watcher, which spawns and monitors the initial worker.
   - Initial state: \`#{worker_pid => W, worker_mref => MRef, restarts_left => MaxRestarts, restart_count => 0, tx_store => #{}}\`.
2. \`charge(WatcherPid, RequestId, Amount, Currency) -> {ok, ReceiptMap} | {ok, {already_processed, ReceiptMap}} | {error, Reason}\`.
3. \`trigger_crash_test(WatcherPid) -> {ok, OldWorkerPid, NewWorkerPid} | {error, max_restarts_exceeded}\`.
4. \`get_active_worker(WatcherPid) -> {ok, WorkerPid, RestartCount} | {error, no_active_worker}\`.
5. \`get_processed_txs(WatcherPid) -> #{RequestId => ReceiptMap}\`.
6. \`stop_system(WatcherPid) -> ok\`.

## Rules & Verification Constraints

- Must maintain \`tx_store\` durability across worker crashes.
- \`watcher_loop/1\` must be tail-recursive (\`requireTailRecursion: ["watcher_loop/1"]\`).
`,
    mentalModelCheck: {
      question: 'In the resilient payment gateway architecture, why does the Watcher store completed transactions rather than the Payment Worker?',
      codeSnippet: `%% Watcher State:
#{worker_pid => W, tx_store => SettledTxs}`,
      options: [
        {
          id: 'A',
          label: 'The worker is a disposable process that may crash on corrupted payloads; keeping durable financial history in the Watcher ensures all settled transactions survive worker crashes.',
          isCorrect: true,
          explanation: 'Correct! Isolating volatile worker tasks from durable state is the core principle of Erlang fault tolerance. Workers are disposable; the Watcher guarantees state continuity.',
        },
        {
          id: 'B',
          label: 'Erlang worker processes cannot write to maps.',
          isCorrect: false,
          explanation: 'Any process can write to maps.',
        },
        {
          id: 'C',
          label: 'The Watcher runs directly in the Linux kernel.',
          isCorrect: false,
          explanation: 'Both Watcher and Worker are standard user-space BEAM processes.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'spawn_monitor',
        module: 'erlang',
        signature: 'spawn_monitor(Fun) -> {pid(), reference()}',
        typesSpec: ['Fun = function()'],
        description: 'Atomically creates and monitors worker.',
        complexityNote: 'O(1) allocation.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#spawn_monitor/1',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch06-10-1',
        title: 'Settling Valid Transaction',
        erlangCall: 'begin {ok, W} = payment_system:start_system(3), Res = payment_system:charge(W, <<"req_1">>, 250, usd), payment_system:stop_system(W), Res end',
        expectedOutput: '{ok, #{amount => 250, currency => usd, status => settled, tx_id => <<"req_1">>}}',
        explanation: 'Charges 250 USD and returns settled receipt map.',
      },
      {
        id: 'tc-ch06-10-2',
        title: 'Idempotency Protection Against Double-Charge',
        erlangCall: 'begin {ok, W} = payment_system:start_system(3), {ok, _} = payment_system:charge(W, <<"req_dup">>, 100, usd), Res = payment_system:charge(W, <<"req_dup">>, 100, usd), payment_system:stop_system(W), Res end',
        expectedOutput: '{ok, {already_processed, #{amount => 100, currency => usd, status => settled, tx_id => <<"req_dup">>}}}',
        explanation: 'Second charge with identical RequestId returns already_processed without re-charging.',
      },
      {
        id: 'tc-ch06-10-3',
        title: 'Worker Crash Recovery and Transaction Store Survival',
        erlangCall: 'begin {ok, W} = payment_system:start_system(3), {ok, _} = payment_system:charge(W, <<"req_saved">>, 50, eur), {ok, OldW, NewW} = payment_system:trigger_crash_test(W), Txs = payment_system:get_processed_txs(W), payment_system:stop_system(W), {OldW =/= NewW, maps:is_key(<<"req_saved">>, Txs)} end',
        expectedOutput: '{true, true}',
        explanation: 'Worker crashed and was replaced with a new PID, while tx_store survived 100% intact.',
      },
    ],
    astRules: {
      requiredCalls: ['erlang:spawn_monitor/1', 'erlang:monitor/2'],
      requireTailRecursion: ['watcher_loop/1', 'worker_loop/0'],
    },
    solutionExplanation: 'Implements a complete resilient payment gateway with a durable Watcher coordinator, idempotent transaction store, and monitored worker crash recovery.',
    starterCode: `-module(payment_system).
-export([
    start_system/1,
    charge/4,
    trigger_crash_test/1,
    get_active_worker/1,
    get_processed_txs/1,
    stop_system/1,
    watcher_loop/1,
    worker_loop/0
]).

%% Architectural Requirement:
%% Spawn coordinator Watcher with initial state:
%% #{worker_pid => W, worker_mref => MRef, restarts_left => MaxRestarts, restart_count => 0, tx_store => #{}}.
%% Parent receives {InitRef, ok, self()} -> return {ok, WatcherPid}.
start_system(MaxRestarts) ->
    ok.

%% Architectural Requirement:
%% Synchronously request charge from Watcher via {charge, self(), Ref, RequestId, Amount, Currency} (2000ms timeout).
charge(WatcherPid, RequestId, Amount, Currency) ->
    ok.

%% Architectural Requirement:
%% Synchronously command Watcher to crash current worker via {trigger_crash_test, self(), Ref} (2000ms timeout).
trigger_crash_test(WatcherPid) ->
    ok.

%% Architectural Requirement:
%% Synchronously query active worker: {get_active_worker, self(), Ref} -> {ok, WorkerPid, RestartCount}.
get_active_worker(WatcherPid) ->
    ok.

%% Architectural Requirement:
%% Synchronously query committed transaction map: {get_processed_txs, self(), Ref} -> TxStore.
get_processed_txs(WatcherPid) ->
    ok.

%% Architectural Requirement:
%% Synchronously stop Watcher and terminate active worker cleanly via {stop, self(), Ref}.
stop_system(WatcherPid) ->
    ok.

%% Architectural Requirement:
%% Coordinator actor loop managing tx_store idempotency and worker crash recovery:
%% - {charge, From, Ref, RequestId, Amount, Currency}: check maps:find(RequestId, TxStore).
%%   If present, reply {ok, {already_processed, Receipt}}.
%%   If new and worker alive, forward {validate_and_charge, self(), Ref, ...} to WorkerPid.
%%   On {worker_reply, Ref, {ok, Receipt}}: commit to tx_store, reply to From, recurse.
%%   On {worker_reply, Ref, {error, Reason}}: reply error to From, recurse.
%% - {trigger_crash_test, From, Ref}: send crash_test to WorkerPid, wait for {'DOWN', ...}.
%%   If restarts_left > 0: spawn replacement, decrement restarts_left, increment restart_count, reply {ok, Old, New}.
%%   If restarts_left == 0: set worker_pid => undefined, reply {error, max_restarts_exceeded}.
%% - {get_active_worker, From, Ref}: reply {ok, WorkerPid, RestartCount} or {error, no_active_worker}.
%% - {get_processed_txs, From, Ref}: reply TxStore.
%% - {stop, From, Ref}: exit(WorkerPid, shutdown) and reply ok.
watcher_loop(State) ->
    ok.

%% Architectural Requirement:
%% Disposable payment worker:
%% - {validate_and_charge, From, Ref, RequestId, Amount, Currency}:
%%   If Amount =< 0 orelse not is_integer(Amount) -> reply {error, invalid_amount}.
%%   If Currency not in [usd, eur, etb] -> reply {error, unsupported_currency}.
%%   Else -> reply {ok, #{tx_id => RequestId, amount => Amount, currency => Currency, status => settled}}.
%% - crash_test -> exit(simulated_payment_worker_crash).
%% - stop -> ok.
worker_loop() ->
    ok.
`,
    solutionCode: `-module(payment_system).
-export([
    start_system/1,
    charge/4,
    trigger_crash_test/1,
    get_active_worker/1,
    get_processed_txs/1,
    stop_system/1,
    watcher_loop/1,
    worker_loop/0
]).

start_system(MaxRestarts) when is_integer(MaxRestarts), MaxRestarts >= 0 ->
    InitRef = make_ref(),
    Parent = self(),
    _WatcherPid = spawn(fun() ->
        {WorkerPid, MRef} = spawn_monitor(fun() -> worker_loop() end),
        State = #{
            worker_pid => WorkerPid,
            worker_mref => MRef,
            restarts_left => MaxRestarts,
            restart_count => 0,
            tx_store => #{}
        },
        Parent ! {InitRef, ok, self()},
        watcher_loop(State)
    end),
    receive
        {InitRef, ok, Pid} -> {ok, Pid}
    after 1000 ->
        {error, timeout}
    end.

charge(WatcherPid, RequestId, Amount, Currency) ->
    Ref = make_ref(),
    WatcherPid ! {charge, self(), Ref, RequestId, Amount, Currency},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

trigger_crash_test(WatcherPid) ->
    Ref = make_ref(),
    WatcherPid ! {trigger_crash_test, self(), Ref},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

get_active_worker(WatcherPid) ->
    Ref = make_ref(),
    WatcherPid ! {get_active_worker, self(), Ref},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

get_processed_txs(WatcherPid) ->
    Ref = make_ref(),
    WatcherPid ! {get_processed_txs, self(), Ref},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        #{}
    end.

stop_system(WatcherPid) ->
    Ref = make_ref(),
    WatcherPid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        ok
    end.

watcher_loop(State = #{worker_pid := WorkerPid,
                       worker_mref := WorkerMRef,
                       restarts_left := RestartsLeft,
                       restart_count := RestartCount,
                       tx_store := TxStore}) ->
    receive
        {charge, From, Ref, RequestId, Amount, Currency} ->
            case maps:find(RequestId, TxStore) of
                {ok, SavedReceipt} ->
                    From ! {reply, Ref, {ok, {already_processed, SavedReceipt}}},
                    watcher_loop(State);
                error when is_pid(WorkerPid) ->
                    WorkerPid ! {validate_and_charge, self(), Ref, RequestId, Amount, Currency},
                    receive
                        {worker_reply, Ref, {ok, Receipt}} ->
                            NewTxStore = maps:put(RequestId, Receipt, TxStore),
                            From ! {reply, Ref, {ok, Receipt}},
                            watcher_loop(State#{tx_store => NewTxStore});
                        {worker_reply, Ref, {error, Reason}} ->
                            From ! {reply, Ref, {error, Reason}},
                            watcher_loop(State)
                    after 1000 ->
                        From ! {reply, Ref, {error, worker_timeout}},
                        watcher_loop(State)
                    end;
                error ->
                    From ! {reply, Ref, {error, no_active_worker}},
                    watcher_loop(State)
            end;

        {trigger_crash_test, From, Ref} ->
            if
                is_pid(WorkerPid) andalso RestartsLeft > 0 ->
                    OldPid = WorkerPid,
                    WorkerPid ! crash_test,
                    receive
                        {'DOWN', WorkerMRef, process, OldPid, _Reason} ->
                            {NewPid, NewMRef} = spawn_monitor(fun() -> worker_loop() end),
                            NewState = State#{
                                worker_pid => NewPid,
                                worker_mref => NewMRef,
                                restarts_left => RestartsLeft - 1,
                                restart_count => RestartCount + 1
                            },
                            From ! {reply, Ref, {ok, OldPid, NewPid}},
                            watcher_loop(NewState)
                    after 1000 ->
                        From ! {reply, Ref, {error, crash_timeout}},
                        watcher_loop(State)
                    end;
                is_pid(WorkerPid) ->
                    OldPid = WorkerPid,
                    WorkerPid ! crash_test,
                    receive
                        {'DOWN', WorkerMRef, process, OldPid, _Reason} ->
                            NewState = State#{
                                worker_pid => undefined,
                                worker_mref => undefined,
                                restarts_left => 0,
                                restart_count => RestartCount + 1
                            },
                            From ! {reply, Ref, {error, max_restarts_exceeded}},
                            watcher_loop(NewState)
                    after 1000 ->
                        From ! {reply, Ref, {error, crash_timeout}},
                        watcher_loop(State)
                    end;
                true ->
                    From ! {reply, Ref, {error, no_active_worker}},
                    watcher_loop(State)
            end;

        {'DOWN', WorkerMRef, process, WorkerPid, _CrashReason} ->
            if
                RestartsLeft > 0 ->
                    {NewPid, NewMRef} = spawn_monitor(fun() -> worker_loop() end),
                    watcher_loop(State#{
                        worker_pid => NewPid,
                        worker_mref => NewMRef,
                        restarts_left => RestartsLeft - 1,
                        restart_count => RestartCount + 1
                    });
                true ->
                    watcher_loop(State#{
                        worker_pid => undefined,
                        worker_mref => undefined,
                        restarts_left => 0
                    })
            end;

        {get_active_worker, From, Ref} ->
            if
                is_pid(WorkerPid) ->
                    From ! {reply, Ref, {ok, WorkerPid, RestartCount}};
                true ->
                    From ! {reply, Ref, {error, no_active_worker}}
            end,
            watcher_loop(State);

        {get_processed_txs, From, Ref} ->
            From ! {reply, Ref, TxStore},
            watcher_loop(State);

        {stop, From, Ref} ->
            if
                is_pid(WorkerPid) ->
                    exit(WorkerPid, shutdown);
                true ->
                    ok
            end,
            From ! {reply, Ref, ok},
            ok
    end.

worker_loop() ->
    receive
        {validate_and_charge, From, Ref, RequestId, Amount, Currency} ->
            if
                not is_integer(Amount) orelse Amount =< 0 ->
                    From ! {worker_reply, Ref, {error, invalid_amount}},
                    worker_loop();
                Currency =/= usd andalso Currency =/= eur andalso Currency =/= etb ->
                    From ! {worker_reply, Ref, {error, unsupported_currency}},
                    worker_loop();
                true ->
                    Receipt = #{
                        tx_id => RequestId,
                        amount => Amount,
                        currency => Currency,
                        status => settled
                    },
                    From ! {worker_reply, Ref, {ok, Receipt}},
                    worker_loop()
            end;

        crash_test ->
            exit(simulated_payment_worker_crash);

        stop ->
            ok
    end.
`,
    files: [
      {
        name: 'payment_system.erl',
        path: 'src/payment_system.erl',
        content: `-module(payment_system).
-export([
    start_system/1,
    charge/4,
    trigger_crash_test/1,
    get_active_worker/1,
    get_processed_txs/1,
    stop_system/1,
    watcher_loop/1,
    worker_loop/0
]).

%% Architectural Requirement:
%% Spawn coordinator Watcher with initial state:
%% #{worker_pid => W, worker_mref => MRef, restarts_left => MaxRestarts, restart_count => 0, tx_store => #{}}.
%% Parent receives {InitRef, ok, self()} -> return {ok, WatcherPid}.
start_system(MaxRestarts) ->
    ok.

%% Architectural Requirement:
%% Synchronously request charge from Watcher via {charge, self(), Ref, RequestId, Amount, Currency} (2000ms timeout).
charge(WatcherPid, RequestId, Amount, Currency) ->
    ok.

%% Architectural Requirement:
%% Synchronously command Watcher to crash current worker via {trigger_crash_test, self(), Ref} (2000ms timeout).
trigger_crash_test(WatcherPid) ->
    ok.

%% Architectural Requirement:
%% Synchronously query active worker: {get_active_worker, self(), Ref} -> {ok, WorkerPid, RestartCount}.
get_active_worker(WatcherPid) ->
    ok.

%% Architectural Requirement:
%% Synchronously query committed transaction map: {get_processed_txs, self(), Ref} -> TxStore.
get_processed_txs(WatcherPid) ->
    ok.

%% Architectural Requirement:
%% Synchronously stop Watcher and terminate active worker cleanly via {stop, self(), Ref}.
stop_system(WatcherPid) ->
    ok.

%% Architectural Requirement:
%% Coordinator actor loop managing tx_store idempotency and worker crash recovery:
%% - {charge, From, Ref, RequestId, Amount, Currency}: check maps:find(RequestId, TxStore).
%%   If present, reply {ok, {already_processed, Receipt}}.
%%   If new and worker alive, forward {validate_and_charge, self(), Ref, ...} to WorkerPid.
%%   On {worker_reply, Ref, {ok, Receipt}}: commit to tx_store, reply to From, recurse.
%%   On {worker_reply, Ref, {error, Reason}}: reply error to From, recurse.
%% - {trigger_crash_test, From, Ref}: send crash_test to WorkerPid, wait for {'DOWN', ...}.
%%   If restarts_left > 0: spawn replacement, decrement restarts_left, increment restart_count, reply {ok, Old, New}.
%%   If restarts_left == 0: set worker_pid => undefined, reply {error, max_restarts_exceeded}.
%% - {get_active_worker, From, Ref}: reply {ok, WorkerPid, RestartCount} or {error, no_active_worker}.
%% - {get_processed_txs, From, Ref}: reply TxStore.
%% - {stop, From, Ref}: exit(WorkerPid, shutdown) and reply ok.
watcher_loop(State) ->
    ok.

%% Architectural Requirement:
%% Disposable payment worker:
%% - {validate_and_charge, From, Ref, RequestId, Amount, Currency}:
%%   If Amount =< 0 orelse not is_integer(Amount) -> reply {error, invalid_amount}.
%%   If Currency not in [usd, eur, etb] -> reply {error, unsupported_currency}.
%%   Else -> reply {ok, #{tx_id => RequestId, amount => Amount, currency => Currency, status => settled}}.
%% - crash_test -> exit(simulated_payment_worker_crash).
%% - stop -> ok.
worker_loop() ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/payment_system.erl': `-module(payment_system).
-export([
    start_system/1,
    charge/4,
    trigger_crash_test/1,
    get_active_worker/1,
    get_processed_txs/1,
    stop_system/1,
    watcher_loop/1,
    worker_loop/0
]).

start_system(MaxRestarts) when is_integer(MaxRestarts), MaxRestarts >= 0 ->
    InitRef = make_ref(),
    Parent = self(),
    _WatcherPid = spawn(fun() ->
        {WorkerPid, MRef} = spawn_monitor(fun() -> worker_loop() end),
        State = #{
            worker_pid => WorkerPid,
            worker_mref => MRef,
            restarts_left => MaxRestarts,
            restart_count => 0,
            tx_store => #{}
        },
        Parent ! {InitRef, ok, self()},
        watcher_loop(State)
    end),
    receive
        {InitRef, ok, Pid} -> {ok, Pid}
    after 1000 ->
        {error, timeout}
    end.

charge(WatcherPid, RequestId, Amount, Currency) ->
    Ref = make_ref(),
    WatcherPid ! {charge, self(), Ref, RequestId, Amount, Currency},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

trigger_crash_test(WatcherPid) ->
    Ref = make_ref(),
    WatcherPid ! {trigger_crash_test, self(), Ref},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

get_active_worker(WatcherPid) ->
    Ref = make_ref(),
    WatcherPid ! {get_active_worker, self(), Ref},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

get_processed_txs(WatcherPid) ->
    Ref = make_ref(),
    WatcherPid ! {get_processed_txs, self(), Ref},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        #{}
    end.

stop_system(WatcherPid) ->
    Ref = make_ref(),
    WatcherPid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        ok
    end.

watcher_loop(State = #{worker_pid := WorkerPid,
                       worker_mref := WorkerMRef,
                       restarts_left := RestartsLeft,
                       restart_count := RestartCount,
                       tx_store := TxStore}) ->
    receive
        {charge, From, Ref, RequestId, Amount, Currency} ->
            case maps:find(RequestId, TxStore) of
                {ok, SavedReceipt} ->
                    From ! {reply, Ref, {ok, {already_processed, SavedReceipt}}},
                    watcher_loop(State);
                error when is_pid(WorkerPid) ->
                    WorkerPid ! {validate_and_charge, self(), Ref, RequestId, Amount, Currency},
                    receive
                        {worker_reply, Ref, {ok, Receipt}} ->
                            NewTxStore = maps:put(RequestId, Receipt, TxStore),
                            From ! {reply, Ref, {ok, Receipt}},
                            watcher_loop(State#{tx_store => NewTxStore});
                        {worker_reply, Ref, {error, Reason}} ->
                            From ! {reply, Ref, {error, Reason}},
                            watcher_loop(State)
                    after 1000 ->
                        From ! {reply, Ref, {error, worker_timeout}},
                        watcher_loop(State)
                    end;
                error ->
                    From ! {reply, Ref, {error, no_active_worker}},
                    watcher_loop(State)
            end;

        {trigger_crash_test, From, Ref} ->
            if
                is_pid(WorkerPid) andalso RestartsLeft > 0 ->
                    OldPid = WorkerPid,
                    WorkerPid ! crash_test,
                    receive
                        {'DOWN', WorkerMRef, process, OldPid, _Reason} ->
                            {NewPid, NewMRef} = spawn_monitor(fun() -> worker_loop() end),
                            NewState = State#{
                                worker_pid => NewPid,
                                worker_mref => NewMRef,
                                restarts_left => RestartsLeft - 1,
                                restart_count => RestartCount + 1
                            },
                            From ! {reply, Ref, {ok, OldPid, NewPid}},
                            watcher_loop(NewState)
                    after 1000 ->
                        From ! {reply, Ref, {error, crash_timeout}},
                        watcher_loop(State)
                    end;
                is_pid(WorkerPid) ->
                    OldPid = WorkerPid,
                    WorkerPid ! crash_test,
                    receive
                        {'DOWN', WorkerMRef, process, OldPid, _Reason} ->
                            NewState = State#{
                                worker_pid => undefined,
                                worker_mref => undefined,
                                restarts_left => 0,
                                restart_count => RestartCount + 1
                            },
                            From ! {reply, Ref, {error, max_restarts_exceeded}},
                            watcher_loop(NewState)
                    after 1000 ->
                        From ! {reply, Ref, {error, crash_timeout}},
                        watcher_loop(State)
                    end;
                true ->
                    From ! {reply, Ref, {error, no_active_worker}},
                    watcher_loop(State)
            end;

        {'DOWN', WorkerMRef, process, WorkerPid, _CrashReason} ->
            if
                RestartsLeft > 0 ->
                    {NewPid, NewMRef} = spawn_monitor(fun() -> worker_loop() end),
                    watcher_loop(State#{
                        worker_pid => NewPid,
                        worker_mref => NewMRef,
                        restarts_left => RestartsLeft - 1,
                        restart_count => RestartCount + 1
                    });
                true ->
                    watcher_loop(State#{
                        worker_pid => undefined,
                        worker_mref => undefined,
                        restarts_left => 0
                    })
            end;

        {get_active_worker, From, Ref} ->
            if
                is_pid(WorkerPid) ->
                    From ! {reply, Ref, {ok, WorkerPid, RestartCount}};
                true ->
                    From ! {reply, Ref, {error, no_active_worker}}
            end,
            watcher_loop(State);

        {get_processed_txs, From, Ref} ->
            From ! {reply, Ref, TxStore},
            watcher_loop(State);

        {stop, From, Ref} ->
            if
                is_pid(WorkerPid) ->
                    exit(WorkerPid, shutdown);
                true ->
                    ok
            end,
            From ! {reply, Ref, ok},
            ok
    end.

worker_loop() ->
    receive
        {validate_and_charge, From, Ref, RequestId, Amount, Currency} ->
            if
                not is_integer(Amount) orelse Amount =< 0 ->
                    From ! {worker_reply, Ref, {error, invalid_amount}},
                    worker_loop();
                Currency =/= usd andalso Currency =/= eur andalso Currency =/= etb ->
                    From ! {worker_reply, Ref, {error, unsupported_currency}},
                    worker_loop();
                true ->
                    Receipt = #{
                        tx_id => RequestId,
                        amount => Amount,
                        currency => Currency,
                        status => settled
                    },
                    From ! {worker_reply, Ref, {ok, Receipt}},
                    worker_loop()
            end;

        crash_test ->
            exit(simulated_payment_worker_crash);

        stop ->
            ok
    end.
`,
    },
  },
];

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
case payment_gateway:validate_amount(UserInput) of
    {ok, ValidAmount} ->
        proceed_with_charge(ValidAmount);
    {error, Reason} ->
        render_user_error(Reason)
end
\`\`\`

### 2. Composing Validation Pipelines with \`case\`
When an operation requires multiple sequential validations (such as validating user credentials, verifying inventory availability, and calculating final shipping fees), nested \`case ... of\` ladders ensure that each step verifies prerequisites before subsequent calculations proceed:

\`\`\`erlang
%% Idiomatic nested case composition with early return on error:
execute_order(InputData) ->
    case validate_credentials(InputData) of
        {ok, User} ->
            case check_inventory(InputData) of
                {ok, Item} ->
                    case calculate_shipping(User, Item) of
                        {ok, Total} ->
                            {ok, #{user => User, total => Total}};
                        {error, ShippingErr} ->
                            {error, ShippingErr}
                    end;
                {error, InventoryErr} ->
                    {error, InventoryErr}
            end;
        {error, AuthErr} ->
            {error, AuthErr}
    end.
\`\`\`

> [!warning] Fault-Tolerance Trap: Never Crash on User Input
> Network servers and public APIs must never crash when receiving malformed user payloads. Crashing on user input creates trivial Denial-of-Service (DoS) vulnerabilities where malicious clients flood the node with bad strings to overwhelm BEAM supervisors. Always return \`{error, Reason}\` at external input boundaries.

## Parallel Worked Example

The following module configures and validates virtual network interfaces, verifying MAC formatting and bandwidth channels with safe return tuples:

\`\`\`erlang
-module(network_interface_validator).
-export([
    safe_bandwidth_split/2,
    check_mtu/1,
    validate_mac_address/1,
    configure_interface_input/3
]).

%% @doc Divides total bandwidth in Mbps safely across virtual channels.
safe_bandwidth_split(TotalMbps, Channels) when is_number(TotalMbps), is_number(Channels) ->
    if
        Channels == 0 -> {error, zero_channels};
        true          -> {ok, TotalMbps / Channels}
    end;
safe_bandwidth_split(_Total, _Channels) ->
    {error, non_numeric}.

%% @doc Validates integer MTU (Maximum Transmission Unit) within standard bounds.
check_mtu(Mtu) when is_integer(Mtu) ->
    if
        Mtu >= 576 andalso Mtu =< 9000 -> {ok, Mtu};
        true                           -> {error, invalid_mtu_range}
    end;
check_mtu(_Other) ->
    {error, invalid_type}.

%% @doc Validates a binary MAC address representation containing colon delimiters.
validate_mac_address(MacBin) when is_binary(MacBin) ->
    case binary:split(MacBin, <<":">>, [global]) of
        Parts when length(Parts) =:= 6 ->
            case lists:all(fun(P) -> byte_size(P) =:= 2 end, Parts) of
                true  -> {ok, MacBin};
                false -> {error, invalid_mac}
            end;
        _ ->
            {error, invalid_mac}
    end;
validate_mac_address(_Other) ->
    {error, invalid_mac}.

%% @doc Coordinates validation of interface parameters with short-circuit failure.
configure_interface_input(MacBin, TotalMbps, Channels) ->
    case validate_mac_address(MacBin) of
        {ok, ValidMac} ->
            case safe_bandwidth_split(TotalMbps, Channels) of
                {ok, ChannelRate} ->
                    {ok, #{mac => ValidMac, channel_rate => ChannelRate}};
                {error, SplitErr} ->
                    {error, SplitErr}
            end;
        {error, MacErr} ->
            {error, MacErr}
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% BIFs: binary (stdlib)
binary:split(Subject, Pattern) -> [binary()]
binary:split(Subject, Pattern, Options) -> [binary()]
binary:match(Subject, Pattern) -> {Pos, Len} | nomatch
\`\`\`

## Assignment Specification

Implement \`src/domain_validator.erl\` exporting \`safe_divide/2\`, \`check_amount/1\`, \`validate_email/1\`, and \`process_checkout_input/3\`:

### 1. \`safe_divide/2\`
- **Input**: \`Numerator\` (number), \`Denominator\` (number).
- **Behavior**: Safely divides \`Numerator\` by \`Denominator\`.
  - If either argument is not numeric, returns \`{error, non_numeric}\`.
  - If \`Denominator == 0\`, returns \`{error, division_by_zero}\`.
  - If valid, returns \`{ok, Numerator / Denominator}\` (float result).
- **Examples**:
  - \`domain_validator:safe_divide(100, 4)\` returns \`{ok, 25.0}\`.
  - \`domain_validator:safe_divide(10, 0)\` returns \`{error, division_by_zero}\`.
  - \`domain_validator:safe_divide("10", 2)\` returns \`{error, non_numeric}\`.

### 2. \`check_amount/1\`
- **Input**: \`Amount\` (integer).
- **Behavior**: Verifies that an amount is a strictly positive integer.
  - If \`Amount\` is an integer $> 0$, returns \`{ok, Amount}\`.
  - If \`Amount\` is an integer $\le 0$, returns \`{error, non_positive_amount}\`.
  - If \`Amount\` is not an integer, returns \`{error, invalid_type}\`.
- **Examples**:
  - \`domain_validator:check_amount(500)\` returns \`{ok, 500}\`.
  - \`domain_validator:check_amount(-50)\` returns \`{error, non_positive_amount}\`.
  - \`domain_validator:check_amount(<<"500">>)\` returns \`{error, invalid_type}\`.

### 3. \`validate_email/1\`
- **Input**: \`EmailBin\` (binary).
- **Behavior**: Verifies that \`EmailBin\` contains a username, exactly one \`@\` character, and a domain containing at least one dot (\`.\`).
  - If valid, returns \`{ok, EmailBin}\`.
  - If not a binary, missing \`@\`, having empty user or domain parts, or domain lacking a dot, returns \`{error, invalid_email}\`.
- **Examples**:
  - \`domain_validator:validate_email(<<"alice@beamforge.org">>)\` returns \`{ok, <<"alice@beamforge.org">>}\`.
  - \`domain_validator:validate_email(<<"noatsign.com">>)\` returns \`{error, invalid_email}\`.
  - \`domain_validator:validate_email(<<"user@nodot">>)\` returns \`{error, invalid_email}\`.

### 4. \`process_checkout_input/3\`
- **Input**: \`EmailBin\` (binary), \`TotalAmount\` (integer), \`SplitCount\` (number).
- **Behavior**: Coordinates checkout input validation in strict order:
  1. Validates \`EmailBin\` with \`validate_email/1\`.
  2. Validates \`TotalAmount\` with \`check_amount/1\`.
  3. Divides \`TotalAmount\` by \`SplitCount\` with \`safe_divide/2\`.
  - If any validation fails, immediately returns \`{error, Reason}\` for the first failing field without evaluating remaining steps.
  - If all succeed, returns \`{ok, #{email => EmailBin, per_person => PerPersonShare}}\`.
- **Examples**:
  - \`domain_validator:process_checkout_input(<<"alice@beamforge.org">>, 300, 3)\` returns \`{ok, #{email => <<"alice@beamforge.org">>, per_person => 100.0}}\`.
  - \`domain_validator:process_checkout_input(<<"bad_email">>, 300, 3)\` returns \`{error, invalid_email}\`.

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

%% @doc Safely divides Numerator by Denominator without crashing on zero or invalid inputs.
safe_divide(Numerator, Denominator) ->
    ok.

%% @doc Validates that an amount is a strictly positive integer.
check_amount(Amount) ->
    ok.

%% @doc Validates that an email binary adheres to basic user@domain.tld formatting.
validate_email(EmailBin) ->
    ok.

%% @doc Orchestrates checkout validation pipeline, returning per-person share or early error.
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

%% @doc Safely divides Numerator by Denominator without crashing on zero or invalid inputs.
safe_divide(Numerator, Denominator) ->
    ok.

%% @doc Validates that an amount is a strictly positive integer.
check_amount(Amount) ->
    ok.

%% @doc Validates that an email binary adheres to basic user@domain.tld formatting.
validate_email(EmailBin) ->
    ok.

%% @doc Orchestrates checkout validation pipeline, returning per-person share or early error.
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

The following module manages telemetry stream channels, ensuring deterministic channel release and frame unpacking with safe atom bounds:

\`\`\`erlang
-module(telemetry_stream_sink).
-export([
    safe_unpack_frame/1,
    with_stream_channel/3,
    flush_metrics_stream/2
]).

%% @doc Safely decodes a binary frame, intercepting format crashes.
safe_unpack_frame(<<Len:16/big, Payload:Len/binary>>) ->
    try binary_to_term(Payload, [safe]) of
        Term -> {ok, Term}
    catch
        Class:Reason -> {error, {Class, Reason}}
    end;
safe_unpack_frame(_InvalidFrame) ->
    {error, {error, invalid_frame_header}}.

%% @doc Executes a transmission action within an assured channel lifecycle.
with_stream_channel(OpenFun, ActionFun, CloseFun) when is_function(OpenFun, 0),
                                                       is_function(ActionFun, 1),
                                                       is_function(CloseFun, 1) ->
    Channel = OpenFun(),
    try ActionFun(Channel) of
        Result -> {ok, Result}
    catch
        Class:Reason -> {error, {Class, Reason}}
    after
        CloseFun(Channel)
    end.

%% @doc Flushes a batch of metrics records, ensuring drain notification to SinkPid.
flush_metrics_stream(BatchList, SinkPid) when is_list(BatchList), is_pid(SinkPid) ->
    try
        lists:foreach(fun(Item) ->
            case Item of
                {anomaly, Reason} -> erlang:error({sensor_anomaly, Reason});
                _ValidRecord      -> ok
            end
        end, BatchList),
        ok
    after
        SinkPid ! metrics_stream_drained
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

### 1. \`safe_parse_payload/1\`
- **Input**: \`Binary\` (binary external term representation).
- **Behavior**: Safely decodes an untrusted serialized Erlang term using \`erlang:binary_to_term(Binary, [safe])\`.
  - On valid binary input: returns \`{ok, Term}\`.
  - On corrupt binary, unknown atom, or non-binary input: intercepts the exception and returns \`{error, {Class, Reason}}\` (e.g., \`{error, {error, badarg}}\`).
- **Examples**:
  - \`boundary_parser:safe_parse_payload(term_to_binary({user, 101, <<"Alice">>}))\` returns \`{ok, {user, 101, <<"Alice">>}}\`.
  - \`boundary_parser:safe_parse_payload(<<"invalid_bytes_xyz">>)\` returns \`{error, {error, badarg}}\`.

### 2. \`with_resource_cleanup/3\`
- **Input**: \`AcquireFun\` (0-arity function), \`ActionFun\` (1-arity function), \`ReleaseFun\` (1-arity function).
- **Behavior**:
  1. Invokes \`Resource = AcquireFun()\`.
  2. Executes \`ActionFun(Resource)\` within a protected \`try ... of ... catch ... after\` expression.
  3. Guarantees that \`ReleaseFun(Resource)\` executes in the \`after\` block regardless of whether \`ActionFun\` returns or crashes.
  4. On successful completion: returns \`{ok, Result}\`.
  5. On exception: catches the exception and returns \`{error, {Class, Reason}}\`.
- **Examples**:
  - Returns \`{ok, Result}\` when \`ActionFun\` finishes normally.
  - Returns \`{error, {error, deliberate_crash}}\` when \`ActionFun\` raises an error, with \`ReleaseFun\` guaranteed to run.

### 3. \`process_transaction_log/2\`
- **Input**: \`LinesList\` (list of binary log lines), \`CloseNotifyPid\` (pid of the notification recipient).
- **Behavior**:
  - Iterates over \`LinesList\`. If any line equals \`<<"CORRUPT_LINE">>\`, raises \`erlang:error(transaction_processing_failed)\`.
  - If all lines are valid, returns \`ok\`.
  - In all execution paths (success or crash), the \`after\` block must deliver the message \`file_handle_closed\` to \`CloseNotifyPid\` (\`CloseNotifyPid ! file_handle_closed\`).
- **Examples**:
  - \`boundary_parser:process_transaction_log([<<"TX1">>, <<"TX2">>], Self)\` returns \`ok\` and delivers \`file_handle_closed\`.
  - \`boundary_parser:process_transaction_log([<<"TX1">>, <<"CORRUPT_LINE">>], Self)\` raises \`error:transaction_processing_failed\` and delivers \`file_handle_closed\`.

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

%% @doc Safely decodes an untrusted external binary term using [safe] atom protection.
safe_parse_payload(Binary) ->
    ok.

%% @doc Executes ActionFun with an acquired resource, guaranteeing ReleaseFun in after.
with_resource_cleanup(AcquireFun, ActionFun, ReleaseFun) ->
    ok.

%% @doc Iterates through transaction lines, ensuring file close notification on exit.
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
        ok
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

%% @doc Safely decodes an untrusted external binary term using [safe] atom protection.
safe_parse_payload(Binary) ->
    ok.

%% @doc Executes ActionFun with an acquired resource, guaranteeing ReleaseFun in after.
with_resource_cleanup(AcquireFun, ActionFun, ReleaseFun) ->
    ok.

%% @doc Iterates through transaction lines, ensuring file close notification on exit.
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
        ok
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

The following module coordinates an IoT sensor ingestion pair, linking a calibrating reader to a metrics aggregator process:

\`\`\`erlang
-module(sensor_ingestion_pair).
-export([
    start_sensor_pair/0,
    poll_reading/2,
    retire_reader_clean/1,
    abort_reader_fault/2,
    reader_loop/1,
    aggregator_loop/0
]).

%% @doc Spawns linked sensor reader and aggregator worker processes.
start_sensor_pair() ->
    Aggregator = spawn(fun() -> aggregator_loop() end),
    Reader = spawn_link(fun() ->
        link(Aggregator),
        reader_loop(Aggregator)
    end),
    {ok, Reader, Aggregator}.

%% @doc Queries the two-stage sensor pipeline with a raw reading.
poll_reading(ReaderPid, RawValue) ->
    Ref = make_ref(),
    ReaderPid ! {sample, self(), Ref, RawValue},
    receive
        {Ref, Result} -> {ok, Result}
    after 1000 ->
        {error, timeout}
    end.

%% @doc Gracefully retires the reader via normal exit; aggregator survives.
retire_reader_clean(ReaderPid) ->
    Ref = make_ref(),
    ReaderPid ! {retire, self(), Ref},
    receive
        {Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

%% @doc Simulates an abnormal sensor hardware fault; tears down aggregator.
abort_reader_fault(ReaderPid, FaultReason) ->
    ReaderPid ! {sensor_fault, FaultReason},
    ok.

%% @doc Stage 1 worker: applies calibration offset and forwards to aggregator.
reader_loop(AggregatorPid) ->
    receive
        {sample, Caller, Ref, RawVal} when is_number(RawVal) ->
            Calibrated = RawVal + 10,
            AggregatorPid ! {aggregate, Caller, Ref, Calibrated},
            reader_loop(AggregatorPid);
        {retire, From, Ref} ->
            From ! {Ref, ok},
            exit(normal);
        {sensor_fault, FaultReason} ->
            exit(FaultReason)
    end.

%% @doc Stage 2 worker: finalizes calculation and replies to caller.
aggregator_loop() ->
    receive
        {aggregate, Caller, Ref, Calibrated} ->
            Smoothed = Calibrated * 3,
            Caller ! {Ref, Smoothed},
            aggregator_loop()
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

### 1. \`start_linked_pipeline/0\`
- **Input**: None.
- **Behavior**:
  1. Spawns \`Worker2\` executing \`worker2_loop/0\`.
  2. Atomically spawns and links \`Worker1\` via \`spawn_link/1\`. Inside its initialization, \`Worker1\` links to \`Worker2\` (\`link(Worker2)\`) and begins executing \`worker1_loop(Worker2)\`.
  3. Returns \`{ok, Worker1, Worker2}\`.
- **Examples**:
  - \`{ok, W1, W2} = linked_pipeline:start_linked_pipeline()\` returns the process identifiers of both workers.

### 2. \`compute/2\`
- **Input**: \`Worker1Pid\` (pid of Stage 1 worker), \`Number\` (numeric input value).
- **Behavior**:
  - Sends a computation request with a unique reference to \`Worker1Pid\`.
  - \`Worker1\` multiplies \`Number\` by 2 (\`Number * 2\`) and forwards the intermediate result to \`Worker2\`.
  - \`Worker2\` squares the forwarded value (\`Doubled * Doubled\`) and replies directly to the caller.
  - Awaits the reply up to 1,000ms. Returns \`{ok, FinalResult}\` on success, or \`{error, timeout}\` on expiration.
- **Examples**:
  - \`linked_pipeline:compute(W1, 3)\` returns \`{ok, 36}\` ($[3 \\times 2]^2 = 36$).
  - \`linked_pipeline:compute(W1, 5)\` returns \`{ok, 100}\` ($[5 \\times 2]^2 = 100$).

### 3. \`stop_stage1_normal/1\`
- **Input**: \`Worker1Pid\` (pid of Stage 1 worker).
- **Behavior**:
  - Sends a normal stop request to \`Worker1Pid\` and awaits acknowledgement within 1,000ms.
  - \`Worker1\` replies to the caller and terminates with \`exit(normal)\`.
  - Because \`normal\` exit signals represent successful completion, the linked \`Worker2\` process completely ignores the signal and remains alive. Returns \`ok\`.
- **Examples**:
  - \`linked_pipeline:stop_stage1_normal(W1)\` returns \`ok\`, leaving \`W1\` dead and \`W2\` alive.

### 4. \`crash_stage1/2\`
- **Input**: \`Worker1Pid\` (pid of Stage 1 worker), \`Reason\` (abnormal exit reason term).
- **Behavior**:
  - Instructs \`Worker1Pid\` to terminate with \`exit(Reason)\`. Returns \`ok\`.
  - Because \`Reason\` is abnormal, the resulting exit signal propagates across the bidirectional link to \`Worker2\`, causing \`Worker2\` to terminate immediately as well (guaranteeing zero zombie leaks).
- **Examples**:
  - \`linked_pipeline:crash_stage1(W1, fatal_crash)\` terminates both \`W1\` and \`W2\`.

### 5. \`worker1_loop/1\` & \`worker2_loop/0\`
- **Input**: \`worker1_loop\` takes the \`Worker2\` PID; \`worker2_loop\` takes no arguments.
- **Behavior**: Tail-recursive message handling loops implementing the two computation stages, request forwarding, normal exit reply, and abnormal crash exit.

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

%% @doc Spawns a two-stage linked pipeline, establishing bidirectional links between workers.
start_linked_pipeline() ->
    ok.

%% @doc Dispatches a number through the two-stage pipeline, returning the final transformed result.
compute(Worker1Pid, Number) ->
    ok.

%% @doc Stops Stage 1 with exit(normal); Stage 2 ignores the normal exit signal and survives.
stop_stage1_normal(Worker1Pid) ->
    ok.

%% @doc Terminates Stage 1 with an abnormal reason; the exit signal tears down Stage 2 across the link.
crash_stage1(Worker1Pid, Reason) ->
    ok.

%% @doc Stage 1 worker loop: doubles numbers, forwards to Stage 2, and handles exit requests.
worker1_loop(Worker2) ->
    ok.

%% @doc Stage 2 worker loop: squares forwarded values and returns the result to the caller.
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

%% @doc Spawns a two-stage linked pipeline, establishing bidirectional links between workers.
start_linked_pipeline() ->
    ok.

%% @doc Dispatches a number through the two-stage pipeline, returning the final transformed result.
compute(Worker1Pid, Number) ->
    ok.

%% @doc Stops Stage 1 with exit(normal); Stage 2 ignores the normal exit signal and survives.
stop_stage1_normal(Worker1Pid) ->
    ok.

%% @doc Terminates Stage 1 with an abnormal reason; the exit signal tears down Stage 2 across the link.
crash_stage1(Worker1Pid, Reason) ->
    ok.

%% @doc Stage 1 worker loop: doubles numbers, forwards to Stage 2, and handles exit requests.
worker1_loop(Worker2) ->
    ok.

%% @doc Stage 2 worker loop: squares forwarded values and returns the result to the caller.
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

The following module implements a fault-tolerant sentinel process monitoring a queue consumer:

\`\`\`erlang
-module(queue_consumer_sentinel).
-export([
    start_sentinel/1,
    query_active_consumer/1,
    abort_consumer/2,
    sentinel_loop/3
]).

%% @doc Spawns a resilient sentinel process that traps exits and monitors an active queue consumer.
start_sentinel(ConsumerInitFun) ->
    InitRef = make_ref(),
    Caller = self(),
    SentinelPid = spawn(fun() ->
        process_flag(trap_exit, true),
        ConsumerPid = spawn_link(ConsumerInitFun),
        Caller ! {InitRef, ConsumerPid},
        sentinel_loop(ConsumerInitFun, ConsumerPid, 0)
    end),
    receive
        {InitRef, InitialConsumer} ->
            {ok, SentinelPid, InitialConsumer}
    after 1000 ->
        {error, timeout}
    end.

%% @doc Queries the sentinel for the PID of the current consumer and total restart count.
query_active_consumer(SentinelPid) ->
    Ref = make_ref(),
    SentinelPid ! {query_status, self(), Ref},
    receive
        {Ref, Status} -> {ok, Status}
    after 1000 ->
        {error, timeout}
    end.

%% @doc Forcibly crashes the consumer with a simulated fault to verify sentinel recovery.
abort_consumer(SentinelPid, FaultReason) ->
    SentinelPid ! {terminate_consumer, FaultReason},
    ok.

%% @doc Core sentinel loop maintaining consumer state and restart telemetry.
sentinel_loop(ConsumerInitFun, CurrentConsumer, RestartCount) ->
    receive
        {query_status, From, Ref} ->
            From ! {Ref, #{consumer => CurrentConsumer, restarts => RestartCount}},
            sentinel_loop(ConsumerInitFun, CurrentConsumer, RestartCount);

        {terminate_consumer, FaultReason} ->
            exit(CurrentConsumer, FaultReason),
            sentinel_loop(ConsumerInitFun, CurrentConsumer, RestartCount);

        {'EXIT', CurrentConsumer, normal} ->
            %% Consumer completed gracefully; sentinel retires without reviving
            ok;

        {'EXIT', CurrentConsumer, _AbnormalReason} ->
            %% Trapped abnormal termination: resurrect replacement consumer
            NewConsumer = spawn_link(ConsumerInitFun),
            sentinel_loop(ConsumerInitFun, NewConsumer, RestartCount + 1);

        shutdown ->
            exit(CurrentConsumer, shutdown),
            ok
    end.
\`\`\`

## Assignment Specification

Implement \`src/exit_trapper.erl\` exporting \`start_supervised/1\`, \`get_worker_pid/1\`, \`kill_worker/2\`, \`simulate_exit_truth_table/2\`, and \`supervisor_loop/2\`:

### 1. \`start_supervised/1\`
- **Input**: \`WorkerFun\` (a 0-arity fun defining the initial worker logic).
- **Behavior**:
  - Spawns a supervisor process running \`supervisor_loop/2\` configured with \`process_flag(trap_exit, true)\`.
  - Atomically spawns and links the initial worker via \`spawn_link(WorkerFun)\`.
  - Synchronously returns \`{ok, SupervisorPid, InitialWorkerPid}\` within 1,000ms (or \`{error, timeout}\`).
- **Examples**:
  - \`exit_trapper:start_supervised(fun() -> receive stop -> ok end end)\` returns \`{ok, SupPid, W1Pid}\`.

### 2. \`get_worker_pid/1\`
- **Input**: \`SupervisorPid\` (pid of supervisor).
- **Behavior**:
  - Synchronously queries the supervisor for the PID of its currently active worker.
  - Returns \`{ok, CurrentWorkerPid}\` within 1,000ms (or \`{error, timeout}\`).
- **Examples**:
  - \`exit_trapper:get_worker_pid(SupPid)\` returns \`{ok, W1Pid}\`.

### 3. \`kill_worker/2\`
- **Input**: \`SupervisorPid\` (pid of supervisor), \`Reason\` (arbitrary exit reason term, such as \`badarith\` or \`kill\`).
- **Behavior**:
  - Dispatches an asynchronous instruction to the supervisor to terminate its active worker with \`exit(CurrentWorker, Reason)\`.
  - Returns \`ok\`.
- **Examples**:
  - \`exit_trapper:kill_worker(SupPid, badarith)\` returns \`ok\`.

### 4. \`supervisor_loop/2\`
- **Input**: \`WorkerFun\` (0-arity function), \`CurrentWorker\` (pid of the active worker).
- **Behavior**:
  - Tail-recursive loop managing worker lifecycle and trapping exit signals:
    - Responds to worker PID queries with the active worker PID.
    - Handles worker termination requests by executing \`exit(CurrentWorker, Reason)\`.
    - Handles clean exits: when receiving \`{'EXIT', CurrentWorker, normal}\`, terminates cleanly with \`ok\`.
    - Handles abnormal crashes: when receiving \`{'EXIT', CurrentWorker, _AbnormalReason}\`, traps the exit signal, respawns a replacement worker via \`spawn_link(WorkerFun)\`, and continues looping with the new worker PID.
    - Handles \`stop\`: terminates the active worker with \`exit(CurrentWorker, shutdown)\` and exits cleanly with \`ok\`.

### 5. \`simulate_exit_truth_table/2\`
- **Input**: \`TrappingBool\` (\`boolean()\` flag indicating whether to trap exits), \`SignalReason\` (term indicating the exit signal reason, e.g. \`normal\`, \`badarith\`, or \`kill\`).
- **Behavior**:
  - Evaluates the BEAM exit signal truth table in an isolated probe process:
    - Spawns a probe configured with \`process_flag(trap_exit, TrappingBool)\`.
    - Once the probe is ready, monitors it via \`erlang:monitor(process, ProbePid)\` and sends \`exit(ProbePid, SignalReason)\`.
    - Awaits the outcome: if the probe dies, returns \`{died, DownReason}\`. If the probe survives and traps the signal into its mailbox, returns \`{survived, MailboxMsg}\` (or \`{survived, none}\` if the exit signal was ignored).
    - Always demonitors with \`erlang:demonitor(MonitorRef, [flush])\`.
- **Examples**:
  - \`simulate_exit_truth_table(false, normal)\` -> \`{survived, none}\`
  - \`simulate_exit_truth_table(false, badarith)\` -> \`{died, badarith}\`
  - \`simulate_exit_truth_table(false, kill)\` -> \`{died, killed}\`
  - \`simulate_exit_truth_table(true, normal)\` -> \`{survived, {'EXIT', Sender, normal}}\`
  - \`simulate_exit_truth_table(true, badarith)\` -> \`{survived, {'EXIT', Sender, badarith}}\`
  - \`simulate_exit_truth_table(true, kill)\` -> \`{died, killed}\`

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

%% @doc Spawns a supervisor that traps exits and links to an initial worker.
start_supervised(WorkerFun) ->
    ok.

%% @doc Queries the supervisor for the PID of the active worker.
get_worker_pid(SupPid) ->
    ok.

%% @doc Requests the supervisor to terminate its active worker with Reason.
kill_worker(SupPid, Reason) ->
    ok.

%% @doc Simulates exit signal behavior across trapping flags and signal reasons.
simulate_exit_truth_table(TrappingBool, SignalReason) ->
    ok.

%% @doc Supervisor loop managing worker lifecycle, exit trapping, and restarts.
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

%% @doc Spawns a supervisor that traps exits and links to an initial worker.
start_supervised(WorkerFun) ->
    ok.

%% @doc Queries the supervisor for the PID of the active worker.
get_worker_pid(SupPid) ->
    ok.

%% @doc Requests the supervisor to terminate its active worker with Reason.
kill_worker(SupPid, Reason) ->
    ok.

%% @doc Simulates exit signal behavior across trapping flags and signal reasons.
simulate_exit_truth_table(TrappingBool, SignalReason) ->
    ok.

%% @doc Supervisor loop managing worker lifecycle, exit trapping, and restarts.
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

The following module executes a remote RPC service call with monitor isolation and hard deadline enforcement:

\`\`\`erlang
-module(service_endpoint_watcher).
-export([
    dispatch_timed_call/3,
    check_service_health/1
]).

%% @doc Dispatches a remote RPC service call with monitor isolation and hard deadline.
dispatch_timed_call(EndpointUrl, Payload, DeadlineMs) ->
    Caller = self(),
    {WorkerPid, MRef} = spawn_monitor(fun() ->
        Response = mock_http_post(EndpointUrl, Payload),
        Caller ! {rpc_reply, MRef, Response}
    end),
    receive
        {rpc_reply, MRef, Response} ->
            erlang:demonitor(MRef, [flush]),
            {ok, Response};
        {'DOWN', MRef, process, WorkerPid, Reason} ->
            {error, {service_failed, Reason}}
    after DeadlineMs ->
        exit(WorkerPid, kill),
        erlang:demonitor(MRef, [flush]),
        {error, deadline_exceeded}
    end.

%% @doc Probes whether a service worker process is active or already dead.
check_service_health(ServicePid) ->
    MRef = erlang:monitor(process, ServicePid),
    receive
        {'DOWN', MRef, process, ServicePid, Reason} ->
            {down, Reason}
    after 50 ->
        erlang:demonitor(MRef, [flush]),
        up
    end.

mock_http_post(_Url, Payload) ->
    #{status => 200, echoed => Payload}.
\`\`\`

## Assignment Specification

Implement \`src/worker_watcher.erl\` exporting \`run_monitored_task/2\` and \`probe_pid_status/1\`:

### 1. \`run_monitored_task/2\`
- **Input**: \`TaskFun\` (a 0-arity function executing the computation), \`TimeoutMs\` (non-negative integer millisecond deadline).
- **Behavior**:
  - Spawns a dedicated worker process running \`TaskFun\` and establishes an atomic unidirectional monitor via \`spawn_monitor/1\`.
  - When the worker finishes and sends back its result before \`TimeoutMs\`, flushes the monitor via \`erlang:demonitor(MRef, [flush])\` and returns \`{ok, Result}\`.
  - If the worker crashes (e.g. division by zero, throw, or abnormal exit), receives the \`'DOWN'\` notification, normalizes the exit reason (extracting the raw tag from \`{Reason, Stack}\` tuples if formatted as an error), and returns \`{error, {crashed, NormalizedReason}}\`. The caller survives completely unharmed without needing to trap exits.
  - If \`TimeoutMs\` elapses before completion, terminates the runaway worker process with an untrappable \`kill\` signal (\`exit(WorkerPid, kill)\`), flushes the monitor, and returns \`{error, timeout}\`.
- **Examples**:
  - \`worker_watcher:run_monitored_task(fun() -> 21 * 2 end, 1000)\` -> \`{ok, 42}\`
  - \`worker_watcher:run_monitored_task(fun() -> 1 / 0 end, 1000)\` -> \`{error, {crashed, badarith}}\`
  - \`worker_watcher:run_monitored_task(fun() -> receive after infinity -> ok end end, 80)\` -> \`{error, timeout}\`

### 2. \`probe_pid_status/1\`
- **Input**: \`TargetPid\` (pid of the process to inspect).
- **Behavior**:
  - Dynamically monitors \`TargetPid\` using \`erlang:monitor(process, TargetPid)\`.
  - If the process has already terminated (or crashes within a 20ms window), captures the \`'DOWN'\` notification and returns \`{dead, Reason}\` (returning \`{dead, noproc}\` if the process was already dead prior to monitoring).
  - If no \`'DOWN'\` notification arrives within 20ms, demonitors \`TargetPid\` using \`erlang:demonitor(MRef, [flush])\` and returns \`alive\`.
- **Examples**:
  - \`worker_watcher:probe_pid_status(DeadPid)\` -> \`{dead, noproc}\`
  - \`worker_watcher:probe_pid_status(LivePid)\` -> \`alive\`

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

%% @doc Executes a task under a unidirectional monitor with crash isolation and timeout.
run_monitored_task(TaskFun, TimeoutMs) ->
    ok.

%% @doc Probes whether a process is alive or dead, demonstrating the noproc invariant.
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

%% @doc Executes a task under a unidirectional monitor with crash isolation and timeout.
run_monitored_task(TaskFun, TimeoutMs) ->
    ok.

%% @doc Probes whether a process is alive or dead, demonstrating the noproc invariant.
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

The following module submits an audit entry to an ephemeral worker process, flushing monitors upon completion:

\`\`\`erlang
-module(audit_event_collector).
-export([
    dispatch_audit_record/2,
    inspect_mailbox_backlog/0
]).

%% @doc Submits an audit entry to an ephemeral worker process, flushing monitors upon completion.
dispatch_audit_record(CollectorFun, EventData) ->
    Caller = self(),
    {WorkerPid, MRef} = spawn_monitor(fun() ->
        ProcessedRecord = CollectorFun(EventData),
        Caller ! {audit_committed, self(), ProcessedRecord},
        exit(normal)
    end),
    %% Allow momentary convergence for reply and termination signal
    timer:sleep(5),
    receive
        {audit_committed, WorkerPid, Record} ->
            erlang:demonitor(MRef, [flush]),
            ResidualDowns = inspect_mailbox_backlog(),
            {ok, Record, #{unflushed_monitors => ResidualDowns}}
    after 1000 ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

%% @doc Non-blocking diagnostic scan counting unprocessed monitor DOWN messages.
inspect_mailbox_backlog() ->
    scan_backlog(0).

scan_backlog(Acc) ->
    receive
        {'DOWN', _Ref, process, _Pid, _Reason} ->
            scan_backlog(Acc + 1)
    after 0 ->
        Acc
    end.
\`\`\`

## Assignment Specification

Implement \`src/monitor_hygiene.erl\` exporting \`call_with_clean_mailbox/2\` and \`count_lingering_downs/0\`:

### 1. \`call_with_clean_mailbox/2\`
- **Input**: \`WorkerFun\` (a 1-arity worker function), \`Input\` (argument passed into \`WorkerFun\`).
- **Behavior**:
  - Atomically spawns and monitors an ephemeral worker process executing \`WorkerFun(Input)\`.
  - The worker evaluates the function, dispatches a completion message containing the result to the caller, and immediately terminates with exit reason \`worker_completed\`.
  - The caller pauses briefly (e.g. 5–10ms via \`timer:sleep/1\`) to allow both the worker's completion reply and its \`'DOWN'\` exit notification to arrive concurrently in the mailbox.
  - Upon receiving the worker's result, the caller demonitors the reference with the \`[flush]\` option (\`erlang:demonitor(MRef, [flush])\`) to atomically purge the pending \`'DOWN'\` message from its mailbox.
  - Inspects the mailbox using \`count_lingering_downs/0\` to verify zero \`'DOWN'\` messages remain, returning \`{ok, Result, LingeringCount}\`.
  - If no response arrives within 1,000ms, demonitors with \`[flush]\` and returns \`{error, timeout}\`.
- **Examples**:
  - \`monitor_hygiene:call_with_clean_mailbox(fun(X) -> X * 2 end, 42)\` -> \`{ok, 84, 0}\`
  - \`monitor_hygiene:call_with_clean_mailbox(fun(X) -> X + 1 end, 99)\` -> \`{ok, 100, 0}\`

### 2. \`count_lingering_downs/0\`
- **Input**: None.
- **Behavior**:
  - Non-blockingly scans the caller's mailbox using a tail-recursive \`receive ... after 0\` construct to consume and count all un-flushed \`{'DOWN', _, process, _, _}\` tuples.
  - Returns the total count of drained \`'DOWN'\` messages as a non-negative integer.
- **Examples**:
  - \`monitor_hygiene:count_lingering_downs()\` -> \`0\` (in a clean mailbox)

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

%% @doc Executes a worker task and demonstrates atomic DOWN purging via demonitor(MRef, [flush]).
call_with_clean_mailbox(WorkerFun, Input) ->
    ok.

%% @doc Drains and counts lingering DOWN messages from the caller mailbox using a non-blocking timeout.
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

%% @doc Executes a worker task and demonstrates atomic DOWN purging via demonitor(MRef, [flush]).
call_with_clean_mailbox(WorkerFun, Input) ->
    ok.

%% @doc Drains and counts lingering DOWN messages from the caller mailbox using a non-blocking timeout.
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

### Instant Crash Detection in Synchronous Calls
In a naive request-response actor call:
1. The client generates a correlation reference, sends \`{call, self(), Ref, Query}\` to a server, and waits inside \`receive ... after 5000\`.
2. If the server terminates unexpectedly (e.g., due to an unhandled exception or memory exhaustion) immediately after receiving the message, the client has no way of knowing the server is dead.
3. The client sits idle for the entire 5,000ms duration before timing out!

To prevent this latency penalty, OTP's synchronous call implementation (\`gen_server:call/3\`, implemented under the hood in OTP's internal \`gen:do_call/4\` helper) pairs temporary unidirectional process monitors with request dispatching:
- **Temporary Monitor**: The caller monitors the server process right before dispatching the request.
- **Normal Flow**: When the server completes work and replies with \`{Ref, Reply}\`, the caller demonitors the reference with \`[flush]\` and returns the answer.
- **Crash Flow**: If the server crashes mid-flight, the BEAM runtime immediately synthesizes a \`'DOWN'\` message and delivers it to the caller's mailbox with near-zero latency (<1ms). The caller unblocks instantly with \`{error, {server_crashed, Reason}}\` instead of hanging for seconds.
- **Timeout**: If the deadline passes without a reply or exit, the monitor is flushed and \`{error, timeout}\` is returned.

## Parallel Worked Example

The following module coordinates requests against a distributed cluster gateway node, pairing temporary monitors with synchronous calls to achieve instant crash awareness:

\`\`\`erlang
-module(cluster_gateway_client).
-export([
    evaluate_topology_primitive/1,
    sync_query_gateway/3,
    async_notify_gateway/2
]).

%% @doc Maps infrastructure topologies to the appropriate BEAM linking or monitoring strategy.
evaluate_topology_primitive(symmetric_codecs) ->
    link_peers;
evaluate_topology_primitive(subsystem_supervisor) ->
    link_with_trapped_exits;
evaluate_topology_primitive(client_endpoint_query) ->
    monitor_target;
evaluate_topology_primitive(telemetry_observer) ->
    monitor_target.

%% @doc Dispatches a synchronous query to a gateway process with instant failure detection.
sync_query_gateway(GatewayPid, QueryPayload, TimeoutMs) ->
    MRef = erlang:monitor(process, GatewayPid),
    GatewayPid ! {gateway_query, {self(), MRef}, QueryPayload},
    receive
        {MRef, Reply} ->
            erlang:demonitor(MRef, [flush]),
            {ok, Reply};
        {'DOWN', MRef, process, GatewayPid, Reason} ->
            {error, {gateway_terminated, Reason}}
    after TimeoutMs ->
        erlang:demonitor(MRef, [flush]),
        {error, query_timeout}
    end.

%% @doc Asynchronously dispatches a fire-and-forget notification to the gateway.
async_notify_gateway(GatewayPid, EventPayload) ->
    GatewayPid ! {gateway_event, EventPayload},
    ok.
\`\`\`

## Assignment Specification

Implement \`src/my_gen_server.erl\` exporting \`start/2\`, \`call/3\`, \`cast/2\`, \`stop/1\`, \`choose_primitive/1\`, and \`loop/2\`:

### 1. \`choose_primitive/1\`
- **Input**: \`Scenario\` (one of the atoms \`tightly_coupled_peers\`, \`supervisor_to_worker\`, \`client_to_server_request\`, or \`independent_watcher\`).
- **Behavior**:
  - Implements the Architectural Decision Matrix:
    - Returns \`use_link\` for \`tightly_coupled_peers\` (symmetric fate-sharing).
    - Returns \`use_link_with_trap_exit\` for \`supervisor_to_worker\` (lifecycle control).
    - Returns \`use_monitor\` for \`client_to_server_request\` (safe query without fate-sharing).
    - Returns \`use_monitor\` for \`independent_watcher\` (observer isolation).
- **Examples**:
  - \`my_gen_server:choose_primitive(tightly_coupled_peers)\` returns \`use_link\`.
  - \`my_gen_server:choose_primitive(client_to_server_request)\` returns \`use_monitor\`.

### 2. \`start/2\`
- **Input**: \`CallbackMod\` (atom module implementing callback behaviours), \`InitArg\` (initial argument term passed to callback).
- **Behavior**:
  - Spawns a server process that invokes \`CallbackMod:init(InitArg)\`.
  - If \`init\` returns \`{ok, InitialState}\`, notifies the parent and enters \`loop(CallbackMod, InitialState)\`, returning \`{ok, ServerPid}\` synchronously within 1,000ms.
  - If \`init\` returns \`{error, Reason}\`, notifies the parent and terminates, returning \`{error, Reason}\` (or \`{error, init_timeout}\` on timeout).
- **Examples**:
  - \`my_gen_server:start(my_callback_mod, 10)\` returns \`{ok, ServerPid}\`.

### 3. \`call/3\`
- **Input**: \`ServerPid\` (pid of running server), \`Request\` (term containing request payload), \`Timeout\` (integer timeout in milliseconds).
- **Behavior**:
  - Executes a monitor-backed synchronous call following OTP's \`gen_server:call/3\` pattern (implemented internally via \`gen:do_call/4\`):
    - Attaches a temporary monitor to \`ServerPid\` via \`MRef = erlang:monitor(process, ServerPid)\`.
    - Dispatches \`{'$gen_call', {self(), MRef}, Request}\` to \`ServerPid\`.
    - Awaits \`{MRef, Reply}\`, flushes the monitor via \`erlang:demonitor(MRef, [flush])\`, and returns \`Reply\`.
    - If \`ServerPid\` crashes before replying, receives \`{'DOWN', MRef, process, ServerPid, Reason}\` and returns \`{error, {server_crashed, Reason}}\` immediately (0ms crash detection).
    - If \`Timeout\` elapses, demonitors with \`[flush]\` and returns \`{error, timeout}\`.
- **Examples**:
  - \`my_gen_server:call(ServerPid, {add, 5}, 1000)\` returns \`15\`.
  - \`my_gen_server:call(CrashPid, crash_now, 5000)\` returns \`{error, {server_crashed, Reason}}\` in <150ms.

### 4. \`cast/2\`
- **Input**: \`ServerPid\` (pid of running server), \`Request\` (term containing cast payload).
- **Behavior**:
  - Dispatches an asynchronous cast message \`{'$gen_cast', Request}\` to \`ServerPid\` and immediately returns \`ok\`.
- **Examples**:
  - \`my_gen_server:cast(ServerPid, {set, 100})\` returns \`ok\`.

### 5. \`stop/1\`
- **Input**: \`ServerPid\` (pid of running server).
- **Behavior**:
  - Synchronously requests the server to terminate cleanly via \`call(ServerPid, stop, 1000)\`.
  - Returns \`ok\`.
- **Examples**:
  - \`my_gen_server:stop(ServerPid)\` returns \`ok\`.

### 6. \`loop/2\`
- **Input**: \`CallbackMod\` (atom callback module), \`State\` (current server state term).
- **Behavior**:
  - Tail-recursive message loop handling gen_server protocols:
    - On \`{'$gen_call', {From, MRef}, stop}\`: replies \`From ! {MRef, ok}\` and terminates with \`ok\`.
    - On \`{'$gen_call', {From, MRef}, Request}\`: calls \`CallbackMod:handle_call(Request, From, State)\`; if \`{reply, Reply, NewState}\`, replies \`From ! {MRef, Reply}\` and recurses with \`NewState\`; if \`{stop, Reason, Reply, _FinalState}\`, replies and exits with \`exit(Reason)\`.
    - On \`{'$gen_cast', Request}\`: calls \`CallbackMod:handle_cast(Request, State)\`; if \`{noreply, NewState}\`, recurses with \`NewState\`; if \`{stop, Reason, _FinalState}\`, exits with \`exit(Reason)\`.

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

%% @doc Returns the appropriate BEAM process primitive for a given architectural scenario.
choose_primitive(Scenario) ->
    ok.

%% @doc Spawns and initializes a generic server instance using the provided callback module.
start(CallbackMod, InitArg) ->
    ok.

%% @doc Executes a synchronous call to the server with monitor-backed 0ms crash detection.
call(ServerPid, Request, Timeout) ->
    ok.

%% @doc Sends an asynchronous fire-and-forget message to the server.
cast(ServerPid, Request) ->
    ok.

%% @doc Synchronously stops the server instance.
stop(ServerPid) ->
    ok.

%% @doc Server loop dispatching incoming synchronous calls and asynchronous casts to the callback module.
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

%% @doc Returns the appropriate BEAM process primitive for a given architectural scenario.
choose_primitive(Scenario) ->
    ok.

%% @doc Spawns and initializes a generic server instance using the provided callback module.
start(CallbackMod, InitArg) ->
    ok.

%% @doc Executes a synchronous call to the server with monitor-backed 0ms crash detection.
call(ServerPid, Request, Timeout) ->
    ok.

%% @doc Sends an asynchronous fire-and-forget message to the server.
cast(ServerPid, Request) ->
    ok.

%% @doc Synchronously stops the server instance.
stop(ServerPid) ->
    ok.

%% @doc Server loop dispatching incoming synchronous calls and asynchronous casts to the callback module.
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
      fixObjective: 'Eliminate blind timeouts by attaching a process monitor in call_pricing_worker/2, handling instant worker exit notifications, and flushing the monitor on normal reply to achieve <100ms error recovery.',
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

### The Remedy: Ephemeral Monitor Integration
To eliminate blind timeouts in synchronous actor communication:
1. **Unidirectional Observation**: The caller establishes a temporary monitor on \`WorkerPid\` immediately before sending the request.
2. **Correlated Dispatches**: Passing the monitor reference as the message correlation tag ensures the worker replies with that exact reference.
3. **Immediate Crash Signal**: If \`WorkerPid\` crashes mid-request, the BEAM delivers a \`'DOWN'\` notification to the caller's mailbox within microseconds, allowing the client to unblock instantly with an error.
4. **Mailbox Hygiene**: When the worker replies successfully, the caller invokes \`erlang:demonitor(MRef, [flush])\` to purge any potential race-condition exit messages from its mailbox.

## Parallel Worked Example

The following module coordinates requests against a fraud assessment worker, pairing temporary monitors with query dispatching to avoid blind timeouts:

\`\`\`erlang
-module(fraud_check_client).
-export([evaluate_transaction/2]).

%% @doc Submits transaction telemetry to a fraud worker with monitor crash protection.
evaluate_transaction(WorkerPid, TxData) ->
    MRef = erlang:monitor(process, WorkerPid),
    WorkerPid ! {assess_fraud, self(), MRef, TxData},
    receive
        {assessment_score, MRef, Score} ->
            erlang:demonitor(MRef, [flush]),
            {ok, Score};
        {'DOWN', MRef, process, WorkerPid, Reason} ->
            {error, {fraud_detector_crashed, Reason}}
    after 5000 ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.
\`\`\`

## Assignment Specification

Triage and remediate the production outage in \`src/incident_hanging_call.erl\`:

### 1. \`call_pricing_worker/2\`
- **Input**: \`WorkerPid\` (pid of pricing worker), \`Item\` (atom or tuple identifier of product item).
- **Diagnostic**: Dispatches requests with a raw \`make_ref()\` and waits in an unprotected \`receive ... after 5000\` block. When \`WorkerPid\` encounters \`poison_item\` and terminates with \`badarith\`, no reply is dispatched, forcing the caller to hang for 5 full seconds.
- **Triage Objective**:
  - Dynamically monitor \`WorkerPid\` via \`MRef = erlang:monitor(process, WorkerPid)\` before dispatching \`{get_price, self(), MRef, Item}\`.
  - On normal reply: match \`{price, MRef, Price}\`, flush the monitor via \`erlang:demonitor(MRef, [flush])\`, and return \`{ok, Price}\`.
  - On worker crash: intercept \`{'DOWN', MRef, process, WorkerPid, Reason}\` with zero latency, normalize the exit reason (unwrapping single-element reason tuples if necessary), and return \`{error, {worker_down, Reason}}\` in < 100ms.
  - On timeout: demonitor with \`[flush]\` and return \`{error, timeout}\`.
- **Examples**:
  - \`incident_hanging_call:call_pricing_worker(W, widget_a)\` returns \`{ok, 49.99}\`.
  - \`incident_hanging_call:call_pricing_worker(W, poison_item)\` returns \`{error, {worker_down, badarith}}\` in < 100ms.

### 2. \`start_pricing_worker/0\` & \`start_worker/0\`
- **Behavior**: Spawns an ephemeral pricing worker running \`worker_loop/0\` and returns \`{ok, WorkerPid}\`. \`start_worker/0\` provides a backward-compatible alias.
- **Examples**:
  - \`incident_hanging_call:start_pricing_worker()\` returns \`{ok, WorkerPid}\`.

### 3. \`worker_loop/0\`
- **Behavior**: Tail-recursive loop handling item pricing queries (\`widget_a\` -> \`49.99\`, \`widget_b\` -> \`19.99\`, \`poison_item\` -> deliberate crash \`1 / 0\`, \`stop\` -> clean exit).

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

%% @doc Dispatches a synchronous pricing query to the worker actor.
%% Remediates Incident INC-102: eliminates blind timeouts by monitoring the worker.
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

%% @doc Dispatches a synchronous pricing query to the worker actor.
%% Remediates Incident INC-102: eliminates blind timeouts by monitoring the worker.
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

In financial technology, distributed backends, and high-volume transaction gateways, two architectural requirements are non-negotiable:
1. **Zero Double-Charges (Idempotency):** Transient network timeouts, client reconnects, and retries must never cause a client transaction to be executed twice for the same unique request token.
2. **Crash Resilience Without State Loss:** If a worker process encounters a corrupt payload, unhandled exception, or poison-pill input and crashes abruptly, all previously committed state and ledger history must remain 100% durable in memory!

In traditional multithreaded systems, developers frequently attempt to coordinate shared state using mutexes or database locks, introducing bottleneck contention and cascading deadlocks when threads abort unexpectedly.

In Erlang, this is solved cleanly by the **Coordinator-Worker Separation Pattern**:
- **The Long-Lived Coordinator (Watcher):** A durable, highly reliable process that owns the committed state archive indexed by unique client request tokens. The coordinator never performs risky deserialization, complex numerical calculations, or external I/O directly.
- **The Disposable Worker:** A monitored child process spawned dynamically to perform computation and validation. If the worker encounters a fault and terminates, the coordinator traps the \`'DOWN'\` signal, decrements a restart budget, spawns a pristine replacement worker, and continues servicing requests without losing a single committed entry!

## Deep Concept Breakdown & Under the Hood

### 1. The Idempotent Request Protocol
When a client invokes a state-mutating operation with an idempotency key:
1. **Cache Verification:** The coordinator looks up the key in its committed state map. If the key already exists, the coordinator immediately returns the cached result without delegating work to any child process.
2. **Worker Delegation:** If the key is new, the coordinator forwards the raw request to the monitored worker along with a unique reference tag (\`make_ref()\`).
3. **Validation & Execution:** The worker validates the payload. If business constraints fail, the worker returns an error tuple without terminating. If valid, the worker computes the result and replies to the coordinator.
4. **Atomic Commit:** The coordinator stores the successful result in its state map before acknowledging the client.

### 2. Monitored Worker Lifecycle & Crash Recovery
The coordinator manages the child worker using unidirectional monitors:
- **Atomic Creation:** Using \`spawn_monitor/1\` ensures no race window exists between process creation and monitoring.
- **DOWN Message Trapping:** When the child process terminates, the BEAM runtime enqueues \`{'DOWN', MonitorRef, process, ChildPid, Reason}\` in the coordinator mailbox.
- **Restart Budget Management:** The coordinator maintains a budget of remaining restarts. If the budget is greater than zero, it decrements the remaining allowance, increments a restart counter, and spawns a replacement worker. If the budget is exhausted, it transitions into a degraded state, refusing further restart attempts.
- **State Invariance:** Because all committed entries reside exclusively in the coordinator's loop variables, a child worker crash can never corrupt or erase accumulated history.

## Parallel Worked Example: The Resilient Sensor Ingestion Sentinel (telemetry_sentinel.erl)

The following production-grade module demonstrates a resilient telemetry ingestion sentinel. The sentinel coordinates calibrated sensor measurements, indexes historical readings in memory to reject duplicate sample tokens, and supervises a disposable calibrator worker with automatic crash recovery and restart budgeting.

\`\`\`erlang
-module(telemetry_sentinel).
-export([
    start_sentinel/1,
    record_reading/3,
    trigger_sensor_fault/1,
    get_active_calibrator/1,
    get_archive/1,
    stop_sentinel/1,
    sentinel_loop/1,
    calibrator_loop/0
]).

%% @doc Spawns the sentinel coordinator actor and initial monitored calibrator worker.
start_sentinel(MaxRetries) when is_integer(MaxRetries), MaxRetries >= 0 ->
    InitRef = make_ref(),
    Parent = self(),
    _SentinelPid = spawn(fun() ->
        {CalibratorPid, MRef} = spawn_monitor(fun() -> calibrator_loop() end),
        State = #{
            calibrator_pid => CalibratorPid,
            calibrator_mref => MRef,
            retries_left => MaxRetries,
            retry_count => 0,
            archive_map => #{}
        },
        Parent ! {InitRef, ok, self()},
        sentinel_loop(State)
    end),
    receive
        {InitRef, ok, Pid} -> {ok, Pid}
    after 1000 ->
        {error, timeout}
    end.

%% @doc Submits an idempotent sensor reading for calibration and archival.
record_reading(SentinelPid, SampleId, Measurement) ->
    Ref = make_ref(),
    SentinelPid ! {record_reading, self(), Ref, SampleId, Measurement},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

%% @doc Simulates a sensor calibration crash to verify coordinator resilience.
trigger_sensor_fault(SentinelPid) ->
    Ref = make_ref(),
    SentinelPid ! {trigger_sensor_fault, self(), Ref},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

%% @doc Returns the active calibrator PID and accumulated retry count.
get_active_calibrator(SentinelPid) ->
    Ref = make_ref(),
    SentinelPid ! {get_active_calibrator, self(), Ref},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

%% @doc Returns the archive map containing all calibrated sensor readings.
get_archive(SentinelPid) ->
    Ref = make_ref(),
    SentinelPid ! {get_archive, self(), Ref},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        #{}
    end.

%% @doc Cleanly stops the sentinel coordinator and terminates the calibrator worker.
stop_sentinel(SentinelPid) ->
    Ref = make_ref(),
    SentinelPid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        ok
    end.

%% @doc Tail-recursive coordinator loop managing state, idempotency, and crash recovery.
sentinel_loop(State = #{calibrator_pid := CalibratorPid,
                        calibrator_mref := CalibratorMRef,
                        retries_left := RetriesLeft,
                        retry_count := RetryCount,
                        archive_map := ArchiveMap}) ->
    receive
        {record_reading, From, Ref, SampleId, Measurement} ->
            case maps:find(SampleId, ArchiveMap) of
                {ok, ExistingSample} ->
                    From ! {reply, Ref, {ok, {already_archived, ExistingSample}}},
                    sentinel_loop(State);
                error when is_pid(CalibratorPid) ->
                    CalibratorPid ! {calibrate, self(), Ref, SampleId, Measurement},
                    receive
                        {calibrator_reply, Ref, {ok, Sample}} ->
                            NewArchive = maps:put(SampleId, Sample, ArchiveMap),
                            From ! {reply, Ref, {ok, Sample}},
                            sentinel_loop(State#{archive_map => NewArchive});
                        {calibrator_reply, Ref, {error, Reason}} ->
                            From ! {reply, Ref, {error, Reason}},
                            sentinel_loop(State)
                    after 1000 ->
                        From ! {reply, Ref, {error, calibrator_timeout}},
                        sentinel_loop(State)
                    end;
                error ->
                    From ! {reply, Ref, {error, no_active_calibrator}},
                    sentinel_loop(State)
            end;

        {trigger_sensor_fault, From, Ref} ->
            if
                is_pid(CalibratorPid) andalso RetriesLeft > 0 ->
                    OldPid = CalibratorPid,
                    CalibratorPid ! sensor_fault,
                    receive
                        {'DOWN', CalibratorMRef, process, OldPid, _Reason} ->
                            {NewPid, NewMRef} = spawn_monitor(fun() -> calibrator_loop() end),
                            NewState = State#{
                                calibrator_pid => NewPid,
                                calibrator_mref => NewMRef,
                                retries_left => RetriesLeft - 1,
                                retry_count => RetryCount + 1
                            },
                            From ! {reply, Ref, {ok, OldPid, NewPid}},
                            sentinel_loop(NewState)
                    after 1000 ->
                        From ! {reply, Ref, {error, fault_timeout}},
                        sentinel_loop(State)
                    end;
                is_pid(CalibratorPid) ->
                    OldPid = CalibratorPid,
                    CalibratorPid ! sensor_fault,
                    receive
                        {'DOWN', CalibratorMRef, process, OldPid, _Reason} ->
                            NewState = State#{
                                calibrator_pid => undefined,
                                calibrator_mref => undefined,
                                retries_left => 0,
                                retry_count => RetryCount + 1
                            },
                            From ! {reply, Ref, {error, retry_limit_reached}},
                            sentinel_loop(NewState)
                    after 1000 ->
                        From ! {reply, Ref, {error, fault_timeout}},
                        sentinel_loop(State)
                    end;
                true ->
                    From ! {reply, Ref, {error, no_active_calibrator}},
                    sentinel_loop(State)
            end;

        {'DOWN', CalibratorMRef, process, CalibratorPid, _CrashReason} ->
            if
                RetriesLeft > 0 ->
                    {NewPid, NewMRef} = spawn_monitor(fun() -> calibrator_loop() end),
                    sentinel_loop(State#{
                        calibrator_pid => NewPid,
                        calibrator_mref => NewMRef,
                        retries_left => RetriesLeft - 1,
                        retry_count => RetryCount + 1
                    });
                true ->
                    sentinel_loop(State#{
                        calibrator_pid => undefined,
                        calibrator_mref => undefined,
                        retries_left => 0
                    })
            end;

        {get_active_calibrator, From, Ref} ->
            if
                is_pid(CalibratorPid) ->
                    From ! {reply, Ref, {ok, CalibratorPid, RetryCount}};
                true ->
                    From ! {reply, Ref, {error, no_active_calibrator}}
            end,
            sentinel_loop(State);

        {get_archive, From, Ref} ->
            From ! {reply, Ref, ArchiveMap},
            sentinel_loop(State);

        {stop, From, Ref} ->
            if
                is_pid(CalibratorPid) ->
                    exit(CalibratorPid, shutdown);
                true ->
                    ok
            end,
            From ! {reply, Ref, ok},
            ok
    end.

%% @doc Tail-recursive worker loop performing sensor validation and calibration.
calibrator_loop() ->
    receive
        {calibrate, From, Ref, SampleId, {SensorType, RawValue}} ->
            ValidSensor = (SensorType =:= temperature orelse SensorType =:= humidity orelse SensorType =:= pressure),
            ValidVal = (is_integer(RawValue) orelse is_float(RawValue)) andalso RawValue >= 0,
            if
                not ValidSensor ->
                    From ! {calibrator_reply, Ref, {error, uncalibrated_sensor}},
                    calibrator_loop();
                not ValidVal ->
                    From ! {calibrator_reply, Ref, {error, invalid_reading}},
                    calibrator_loop();
                true ->
                    Sample = #{
                        sample_id => SampleId,
                        sensor => SensorType,
                        value => RawValue,
                        status => calibrated
                    },
                    From ! {calibrator_reply, Ref, {ok, Sample}},
                    calibrator_loop()
            end;

        sensor_fault ->
            exit(simulated_calibrator_fault);

        stop ->
            ok
    end.
\`\`\`

## Assignment Specification

Implement the \`payment_system\` module in \`src/payment_system.erl\` with the following exports:
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

### 1. \`start_system/1\`
- **Input**: Non-negative integer \`MaxRestarts\` representing the maximum allowable worker crash recoveries.
- **Behavior**: Spawns the coordinator watcher actor and initial worker process via \`spawn_monitor/1\`. Initializes internal coordinator state with \`restarts_left\` set to \`MaxRestarts\`, \`restart_count\` set to \`0\`, and an empty map for \`tx_store\`. Synchronously returns \`{ok, WatcherPid}\` to the calling process upon initialization.
- **Examples**:
  - \`payment_system:start_system(3)\` returns \`{ok, <0.150.0>}\`.

### 2. \`charge/4\`
- **Input**: Process identifier \`WatcherPid\`, binary \`RequestId\` (idempotency key), integer \`Amount\`, and atom \`Currency\` (\`usd\`, \`eur\`, or \`etb\`).
- **Behavior**: Synchronously submits a charge transaction to the watcher coordinator.
  - If \`RequestId\` already exists in \`tx_store\`, immediately returns \`{ok, {already_processed, ExistingReceipt}}\` without contacting the worker.
  - If new, forwards the request to the active worker for business validation and execution.
  - If \`Amount\` is not an integer or is less than or equal to zero, returns \`{error, invalid_amount}\` while keeping the worker alive.
  - If \`Currency\` is not \`usd\`, \`eur\`, or \`etb\`, returns \`{error, unsupported_currency}\` while keeping the worker alive.
  - If valid, commits \`RequestId => Receipt\` into \`tx_store\` where \`Receipt\` is \`#{tx_id => RequestId, amount => Amount, currency => Currency, status => settled}\` and returns \`{ok, Receipt}\`.
- **Examples**:
  - \`payment_system:charge(W, <<"req_101">>, 250, usd)\` returns \`{ok, #{tx_id => <<"req_101">>, amount => 250, currency => usd, status => settled}}\`.
  - \`payment_system:charge(W, <<"req_101">>, 250, usd)\` (duplicate replay) returns \`{ok, {already_processed, #{tx_id => <<"req_101">>, ...}}}\`.
  - \`payment_system:charge(W, <<"req_102">>, -50, usd)\` returns \`{error, invalid_amount}\`.
  - \`payment_system:charge(W, <<"req_103">>, 100, gbp)\` returns \`{error, unsupported_currency}\`.

### 3. \`trigger_crash_test/1\`
- **Input**: Process identifier \`WatcherPid\`.
- **Behavior**: Synchronously tests system fault tolerance by commanding the active worker to terminate abruptly with reason \`simulated_payment_worker_crash\`. The watcher intercepts the \`'DOWN'\` monitor notification.
  - If \`restarts_left > 0\`, decrements \`restarts_left\`, increments \`restart_count\`, spawns a fresh monitored worker, preserves \`tx_store\` intact, and returns \`{ok, OldWorkerPid, NewWorkerPid}\`.
  - If \`restarts_left == 0\`, updates state to indicate no active worker is available and returns \`{error, max_restarts_exceeded}\`.
- **Examples**:
  - \`payment_system:trigger_crash_test(W)\` returns \`{ok, <0.151.0>, <0.152.0>}\`.
  - Subsequent call when restarts exhausted returns \`{error, max_restarts_exceeded}\`.

### 4. \`get_active_worker/1\`
- **Input**: Process identifier \`WatcherPid\`.
- **Behavior**: Synchronously queries the process identifier and restart count of the active worker. Returns \`{ok, WorkerPid, RestartCount}\` if a worker is running, or \`{error, no_active_worker}\` if the restart budget is exhausted.
- **Examples**:
  - \`payment_system:get_active_worker(W)\` returns \`{ok, <0.151.0>, 0}\`.

### 5. \`get_processed_txs/1\`
- **Input**: Process identifier \`WatcherPid\`.
- **Behavior**: Synchronously retrieves the map of all committed transaction receipts (\`tx_store\`) held in the watcher's durable memory.
- **Examples**:
  - \`payment_system:get_processed_txs(W)\` returns \`#{<<"req_101">> => #{tx_id => <<"req_101">>, amount => 250, currency => usd, status => settled}}\`.

### 6. \`stop_system/1\`
- **Input**: Process identifier \`WatcherPid\`.
- **Behavior**: Synchronously shuts down the payment system by terminating the active worker with reason \`shutdown\` and returning \`ok\`.
- **Examples**:
  - \`payment_system:stop_system(W)\` returns \`ok\`.

### 7. \`watcher_loop/1\`
- **Input**: Map \`State\` containing \`worker_pid\`, \`worker_mref\`, \`restarts_left\`, \`restart_count\`, and \`tx_store\`.
- **Behavior**: Tail-recursive message handling loop. Dispatches charges, queries, crash testing, and monitor notifications without accumulating stack frames.
- **Examples**: Tail recursion is strictly enforced by compiler AST analysis.

### 8. \`worker_loop/0\`
- **Input**: None.
- **Behavior**: Tail-recursive disposable worker loop. Handles payment validation and receipt generation, crash simulations, and shutdown signals.
- **Examples**: Tail recursion is strictly enforced by compiler AST analysis.
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
      requiredCalls: ['erlang:spawn_monitor/1'],
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

%% @doc Spawns the watcher coordinator and initial monitored worker process.
start_system(MaxRestarts) ->
    ok.

%% @doc Submits an idempotent charge request to the payment gateway.
charge(WatcherPid, RequestId, Amount, Currency) ->
    ok.

%% @doc Triggers a simulated crash on the active worker to test fault recovery.
trigger_crash_test(WatcherPid) ->
    ok.

%% @doc Returns the process identifier and restart count of the active worker.
get_active_worker(WatcherPid) ->
    ok.

%% @doc Returns the map of all settled transaction receipts committed to the store.
get_processed_txs(WatcherPid) ->
    ok.

%% @doc Stops the watcher system and terminates the active worker.
stop_system(WatcherPid) ->
    ok.

%% @doc Tail-recursive coordinator loop managing state, idempotency, and worker lifecycle.
watcher_loop(State) ->
    ok.

%% @doc Worker loop handling payload validation and settlement execution.
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

%% @doc Spawns the watcher coordinator and initial monitored worker process.
start_system(MaxRestarts) ->
    ok.

%% @doc Submits an idempotent charge request to the payment gateway.
charge(WatcherPid, RequestId, Amount, Currency) ->
    ok.

%% @doc Triggers a simulated crash on the active worker to test fault recovery.
trigger_crash_test(WatcherPid) ->
    ok.

%% @doc Returns the process identifier and restart count of the active worker.
get_active_worker(WatcherPid) ->
    ok.

%% @doc Returns the map of all settled transaction receipts committed to the store.
get_processed_txs(WatcherPid) ->
    ok.

%% @doc Stops the watcher system and terminates the active worker.
stop_system(WatcherPid) ->
    ok.

%% @doc Tail-recursive coordinator loop managing state, idempotency, and worker lifecycle.
watcher_loop(State) ->
    ok.

%% @doc Worker loop handling payload validation and settlement execution.
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

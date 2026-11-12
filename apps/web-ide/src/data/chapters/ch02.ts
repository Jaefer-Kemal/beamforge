import { LessonContent } from '../../types/workspace';

export const CHAPTER_2_LESSONS: LessonContent[] = [
  // ── Lesson 2.1: Deep Pattern Matching & Aliasing ─────────────────────────
  {
    id: 'ch02-l01',
    chapterNumber: 2,
    lessonNumber: 1,
    lessonType: 'concept_exercise',
    title: 'Deep Pattern Matching in Function Heads & Simultaneous Aliasing',
    difficulty: 'Beginner',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In distributed systems, telecommunication gateways, and message brokers, network frames arrive as deeply nested structures containing protocol wrappers, routing headers, transaction identifiers, and payload records.

In imperative languages like Go, Java, Python, or C++, unpacking deeply nested packets requires multiple lines of defensive \`if != nil\` pointer checks, object navigation (\`packet.Header.Route.Destination\`), and manual error handling. If a single field is null or of an unexpected type, the program panics or throws a null pointer exception.

In Erlang, the BEAM Virtual Machine deconstructs arbitrary nested data structures directly in the function clause head in a single, atomic operation. If the data structure matches the expected shape, the variables are bound instantly; if not, the clause is skipped and the next clause is evaluated.

## Deep Concept Breakdown & Under the Hood

### 1. Nested Pattern Matching in Function Heads
When an Erlang function is invoked, the BEAM VM uses specialized bytecode instructions (\`test_heap\`, \`get_tuple_element\`, \`is_eq_exact\`) to test the shape and contents of arguments before the function body ever executes:

\`\`\`erlang
%% Unpacking nested configurations directly in clause heads:
parse_binding({tls, Host, {port, Port}}, enabled) ->
    {secure_socket, Host, Port};
parse_binding({tcp, Host, {port, Port}}, disabled) ->
    {plain_socket, Host, Port}.
\`\`\`

If an incoming argument does not match any declared pattern, Erlang raises a \`function_clause\` runtime exception immediately. This prevents corrupted state from silently propagating deeper into your application.

### 2. Simultaneous Aliasing (\`Pattern = Var\`) in Function Heads
Frequently in production, you need to inspect an inner field of a data structure, but you also need to pass along or return the **entire original structure** unchanged.

A novice might destructure the fields and then rebuild an identical tuple from scratch in the return expression:

\`\`\`erlang
%% Inefficient: Reconstructs a brand-new tuple on the process heap:
tag_record({item, archived, Code, Weight}) ->
    Copy = {item, archived, Code, Weight},
    {archived_item, Copy, Code}.
\`\`\`

Erlang provides **Pattern Aliasing** using the \`=\` operator directly inside the function signature:

\`\`\`erlang
%% Idiomatic: Binds the outer term to Record with ZERO heap re-allocation!
tag_record({item, archived, Code, _Weight} = Record) ->
    {archived_item, Record, Code}.
\`\`\`

Here, \`Record\` is an alias for the entire outer tuple term, while \`Code\` is simultaneously bound to the inner identifier field.

> [!warning] Common Beginner Syntax Trap: Aliasing Direction
> In function heads, \`Pattern = Var\` and \`Var = Pattern\` are both valid syntax in Erlang.
> However, placing the descriptive pattern first (e.g. \`{item, ...} = Record\`) makes your function signatures significantly easier for teammates to read during code review.
> Remember: never use uppercase names for atom tags (\`Item\` is a variable; \`item\` is an atom).

## Parallel Worked Example

Consider a financial clearing-house settlement ledger auditor:

\`\`\`erlang
-module(ledger_audit).
-export([classify_clearing/1, sign_batch/2]).

%% 1. Dispatch directly on distinct nested tuple shapes in clause heads
classify_clearing({wire, domestic, BankCode, Cents}) ->
    {local_rail, BankCode, Cents};
classify_clearing({wire, {swift, Corridor}, BankCode, Cents}) ->
    {cross_border, Corridor, BankCode, Cents};
classify_clearing(_) ->
    unrecognized_entry.

%% 2. Alias an immutable nested batch while inspecting an inner field
sign_batch(AuditorId, {batch, urgent, {vault, VaultTag, _Limit}} = FullBatch) ->
    {signed_priority, FullBatch, AuditorId, VaultTag};
sign_batch(AuditorId, RegularBatch) ->
    {queued_standard, AuditorId, RegularBatch}.
\`\`\`

Notice how the BEAM executes this module:
- \`classify_clearing/1\` matches structurally distinct shapes across clauses (flat \`domestic\` tuple vs nested \`{swift, Corridor}\` tuple) top-to-bottom and terminates safely on \`_\` with \`unrecognized_entry\`.
- \`sign_batch/2\` uses simultaneous pattern aliasing (\`= FullBatch\`) on the second argument to extract \`VaultTag\` while returning the full, unmodified batch term on the process heap with zero re-allocation, falling back cleanly for \`RegularBatch\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Function Clause Pattern Syntax
FunctionName(Pattern1, Pattern2, ...) -> Body;
FunctionName(PatternN = FullVar, ...) -> Body.
\`\`\`
> Function clauses are evaluated strictly from top to bottom. Place specific patterns above generic catch-all wildcards (\`_\`). See the Erlang Reference Card for complete type-spec notes and BEAM jump-table dispatch guarantees.

## Assignment Specification

Implement two deep pattern matching functions in \`deep_match.erl\`:

### 1. \`extract_route(Packet)\`
- **Input**: Any Erlang term \`Packet\`. Valid envelopes are 3-element tuples tagged with the atom \`packet\`, followed by a 3-element \`header\` tuple (holding a version value and a 3-element \`route\` tuple containing source and destination endpoint strings) and a payload list.
- **Behavior**: Unpack the nested header and route fields directly inside the function clause heads in O(1) decision-tree dispatch:
  - When the version is integer \`4\`, return a 4-element \`ok\` tuple tagged with \`ipv4\` followed by the source and destination endpoints.
  - When the version is integer \`6\`, return a 4-element \`ok\` tuple tagged with \`ipv6\` followed by the source and destination endpoints.
  - When the packet conforms to the nested \`packet\`, \`header\`, and \`route\` tuple structure but carries any other version value, return a 2-element \`error\` tuple wrapping an \`unsupported_version\` pair carrying that version value.
  - For any input that does not conform to the expected nested envelope structure, return a 2-element \`error\` tuple tagged with \`malformed_envelope\`.
- **Examples**:
  - \`deep_match:extract_route({packet, {header, 4, {route, "10.0.0.1", "10.0.0.2"}}, [ping, 1]})\` returns \`{ok, ipv4, "10.0.0.1", "10.0.0.2"}\`.
  - \`deep_match:extract_route({packet, {header, 6, {route, "fe80::1", "fe80::2"}}, []})\` returns \`{ok, ipv6, "fe80::1", "fe80::2"}\`.
  - \`deep_match:extract_route({packet, {header, 5, {route, "10.0.0.1", "10.0.0.2"}}, []})\` returns \`{error, {unsupported_version, 5}}\`.
  - \`deep_match:extract_route({corrupt, envelope})\` returns \`{error, malformed_envelope}\`.

### 2. \`repackage_envelope(Packet)\`
- **Input**: Any Erlang term \`Packet\`.
- **Behavior**: Inspect the packet structure directly in the function head using simultaneous pattern aliasing:
  - When matching an IPv4 packet envelope (version \`4\` with valid nested \`header\` and \`route\` tuples), return a 3-element \`forwarded\` tuple containing the extracted destination endpoint string followed by the entire untouched packet term bound via an alias variable.
  - For any other input that does not match an IPv4 packet envelope, return a 2-element \`dropped\` tuple containing the original input term unchanged.
- **Examples**:
  - \`deep_match:repackage_envelope({packet, {header, 4, {route, "src_host", "dst_host"}}, [data, 42]})\` returns \`{forwarded, "dst_host", {packet, {header, 4, {route, "src_host", "dst_host"}}, [data, 42]}}\`.
  - \`deep_match:repackage_envelope({packet, {header, 6, {route, "a", "b"}}, []})\` returns \`{dropped, {packet, {header, 6, {route, "a", "b"}}, []}}\`.

## Rules & Verification Constraints

- Pattern match directly in the function clause parameters.
- Do not use \`element/2\` to manually index into tuples, and do not use \`if\` expressions.
- Strictly no maps or binaries; use tuples, atoms, and strings only.`,
    otpDocCards: [
      {
        functionName: 'pattern_matching_heads',
        module: 'erlang',
        signature: 'Name(Pattern = Var) -> Body.',
        typesSpec: ['Pattern = term()', 'Var = term()'],
        description: 'Multi-clause pattern matching and simultaneous term aliasing in function heads.',
        complexityNote: 'Compiled by BEAM into O(1) decision trees of jump tables.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/functions.html#pattern-matching',
      },
    ],
    mentalModelCheck: {
      question: 'What is the primary operational benefit of using simultaneous aliasing ({packet, ...} = FullPacket) in a function head?',
      options: [
        {
          id: 'A',
          label: 'It avoids reconstructing the outer tuple, pointing directly to the existing term on the heap in O(1)',
          isCorrect: true,
          explanation: 'Aliasing binds the existing heap term to FullPacket without allocating memory or rebuilding fields.',
        },
        {
          id: 'B',
          label: 'It converts the tuple into an Erlang ETS table record automatically',
          isCorrect: false,
          explanation: 'ETS tables are separate in-memory storage facilities and are not related to pattern matching.',
        },
        {
          id: 'C',
          label: 'It creates a mutable reference that updates the caller environment',
          isCorrect: false,
          explanation: 'Erlang terms are strictly immutable; aliasing creates a local variable binding to the existing immutable term.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch02-01-a',
        title: 'Extract Valid IPv4 Route',
        erlangCall: 'deep_match:extract_route({packet, {header, 4, {route, "10.0.0.1", "10.0.0.2"}}, [ping, 1]})',
        expectedOutput: '{ok, ipv4, "10.0.0.1", "10.0.0.2"}',
        explanation: 'Deeply matches nested route tuple in IPv4 header.',
      },
      {
        id: 'tc-ch02-01-b',
        title: 'Reject Unsupported Version',
        erlangCall: 'deep_match:extract_route({packet, {header, 5, {route, "10.0.0.1", "10.0.0.2"}}, []})',
        expectedOutput: '{error, {unsupported_version, 5}}',
        explanation: 'Unrecognized integer version triggers the version fallback clause.',
      },
      {
        id: 'tc-ch02-01-c',
        title: 'Forward IPv4 Envelope with Aliasing',
        erlangCall: 'deep_match:repackage_envelope({packet, {header, 4, {route, "src_host", "dst_host"}}, [data, 42]})',
        expectedOutput: '{forwarded, "dst_host", {packet, {header, 4, {route, "src_host", "dst_host"}}, [data, 42]}}',
        explanation: 'Simultaneously extracts destination host string and returns intact aliased packet.',
      },
      {
        id: 'tc-ch02-01-d',
        title: 'Drop Non-IPv4 Packet Unchanged',
        erlangCall: 'deep_match:repackage_envelope({packet, {header, 6, {route, "a", "b"}}, []})',
        expectedOutput: '{dropped, {packet, {header, 6, {route, "a", "b"}}, []}}',
        explanation: 'Non-IPv4 envelopes fall through to the catch-all clause and return dropped unchanged.',
      },
    ],
    astRules: {
      forbiddenCalls: ['erlang:element/2'],
      forbiddenConstructs: ['if_expr'],
    },
    solutionExplanation: 'Uses nested tuple patterns directly in function heads with top-to-bottom clause ordering and pattern aliasing.',
    files: [
      {
        name: 'deep_match.erl',
        path: 'src/deep_match.erl',
        content: `-module(deep_match).
-export([extract_route/1, repackage_envelope/1]).

%% @doc Unpack the IP version protocol tag and source/destination endpoint strings from a nested packet envelope, returning an unsupported-version error for other versions or a malformed-envelope error when structure does not match.
extract_route(_Packet) ->
    ok.

%% @doc Forward an IPv4 packet envelope intact alongside its destination host string via function-head aliasing, or drop any non-matching term unchanged.
repackage_envelope(_Packet) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/deep_match.erl': `-module(deep_match).
-export([extract_route/1, repackage_envelope/1]).

%% @doc Unpack the IP version protocol tag and source/destination endpoint strings from a nested packet envelope, returning an unsupported-version error for other versions or a malformed-envelope error when structure does not match.
extract_route({packet, {header, 4, {route, From, To}}, _Payload}) ->
    {ok, ipv4, From, To};
extract_route({packet, {header, 6, {route, From, To}}, _Payload}) ->
    {ok, ipv6, From, To};
extract_route({packet, {header, OtherVer, {route, _From, _To}}, _Payload}) ->
    {error, {unsupported_version, OtherVer}};
extract_route(_) ->
    {error, malformed_envelope}.

%% @doc Forward an IPv4 packet envelope intact alongside its destination host string via function-head aliasing, or drop any non-matching term unchanged.
repackage_envelope({packet, {header, 4, {route, _From, Dst}}, _Payload} = FullPacket) ->
    {forwarded, Dst, FullPacket};
repackage_envelope(Packet) ->
    {dropped, Packet}.`,
    },
    starterCode: `-module(deep_match).
-export([extract_route/1, repackage_envelope/1]).

%% @doc Unpack the IP version protocol tag and source/destination endpoint strings from a nested packet envelope, returning an unsupported-version error for other versions or a malformed-envelope error when structure does not match.
extract_route(_Packet) ->
    ok.

%% @doc Forward an IPv4 packet envelope intact alongside its destination host string via function-head aliasing, or drop any non-matching term unchanged.
repackage_envelope(_Packet) ->
    ok.`,
    solutionCode: `-module(deep_match).
-export([extract_route/1, repackage_envelope/1]).

%% @doc Unpack the IP version protocol tag and source/destination endpoint strings from a nested packet envelope, returning an unsupported-version error for other versions or a malformed-envelope error when structure does not match.
extract_route({packet, {header, 4, {route, From, To}}, _Payload}) ->
    {ok, ipv4, From, To};
extract_route({packet, {header, 6, {route, From, To}}, _Payload}) ->
    {ok, ipv6, From, To};
extract_route({packet, {header, OtherVer, {route, _From, _To}}, _Payload}) ->
    {error, {unsupported_version, OtherVer}};
extract_route(_) ->
    {error, malformed_envelope}.

%% @doc Forward an IPv4 packet envelope intact alongside its destination host string via function-head aliasing, or drop any non-matching term unchanged.
repackage_envelope({packet, {header, 4, {route, _From, Dst}}, _Payload} = FullPacket) ->
    {forwarded, Dst, FullPacket};
repackage_envelope(Packet) ->
    {dropped, Packet}.`,
  },

  // ── Lesson 2.2: Guard Clauses (when) & Silent Failure ────────────────────
  {
    id: 'ch02-l02',
    chapterNumber: 2,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'Guard Clauses (when), Compound Guards & Silent Guard Failure',
    difficulty: 'Beginner',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

Pattern matching alone cannot express numerical ranges, type boundaries, or arithmetic constraints. For example, pattern matching can verify that a parameter is a tuple \`{port, Number}\`, but it cannot verify that \`Number\` is strictly between \`1024\` and \`65535\`.

To enforce domain constraints without clunky nested \`if\` statements inside the function body, Erlang provides **Guard Clauses (\`when\`)**.

Guards run before the function body executes. If a guard evaluates to \`true\`, the clause executes. If it evaluates to \`false\`, the BEAM VM skips to the next clause with zero heap allocation.

## Deep Concept Breakdown & Under the Hood

### 1. The Purity Rule: Only Built-In Functions (BIFs) Allowed
Guards must be deterministic, lightning-fast, and free of side effects. For this reason, the Erlang compiler **strictly forbids user-defined functions inside guards**.

Only a curated set of Built-In Functions (BIFs) and operators can be used in guards:
- **Type BIFs**: \`is_integer/1\`, \`is_float/1\`, \`is_number/1\`, \`is_atom/1\`, \`is_tuple/1\`, \`is_list/1\`, \`is_boolean/1\`.
- **Comparison Operators**: \`=:==\`, \`=/=\`, \`==\`, \`/=\`, \`<\`, \`=<\`, \`>\`, \`>=\`.
- **Arithmetic & Logic**: \`+\`, \`-\`, \`*\`, \`/\`, \`div\`, \`rem\`, \`andalso\`, \`orelse\`, \`not\`.

\`\`\`erlang
%% Valid guard:
is_adult(Age) when is_integer(Age), Age >= 18 -> true;
is_adult(_) -> false.
\`\`\`

### 2. Compound Guards: Comma (,) vs. Semicolon (;)
Erlang guards use punctuation to express Boolean logic:
- **, (Comma)** means **AND**: all comma-separated conditions must evaluate to \`true\`.
- **; (Semicolon)** means **OR**: if any semicolon-separated guard evaluates to \`true\`, the clause is selected.

\`\`\`erlang
%% Matches if X is integer AND X is between 1 and 100:
in_range(X) when is_integer(X), X >= 1, X =< 100 -> true;

%% Matches if Status is 'active' OR Status is 'pending':
is_open(Status) when Status =:= active; Status =:= pending -> true;
is_open(_) -> false.
\`\`\`

### 3. THE SILENT GUARD EXCEPTION RULE (Crucial Erlang Invariant)
In standard Erlang expressions, dividing by zero (\`10 / 0\`) or calling an arithmetic function on an atom crashes the process immediately with \`badarith\`.

**Inside a guard clause, exceptions NEVER crash the process!**

If an expression inside a guard raises a runtime error (e.g. \`A / B > 2\` when \`B =:= 0\`, or \`length(X) > 0\` when \`X\` is an atom), the guard simply traps the failure and **silently evaluates to \`false\`**! The BEAM runtime immediately moves to evaluate the next clause.

\`\`\`erlang
%% If ElapsedMs is 0 or not a number, (BytesTransferred / ElapsedMs) fails silently to false:
throughput_rating(Bytes, ElapsedMs)
  when is_number(Bytes), is_number(ElapsedMs), ElapsedMs > 0, (Bytes / ElapsedMs) >= 1024.0 ->
    high_throughput;
throughput_rating(_, _) ->
    standard_throughput.
\`\`\`

> [!warning] Common Beginner Syntax Trap: Less-Than-Or-Equal (=<)
> Remember Chapter 1: in Erlang, less-than-or-equal is written as **\`=<\`**, NOT \`<=\`!
> Writing \`Port <= 65535\` will trigger a syntax compiler error. Always write \`Port =< 65535\`.

## Parallel Worked Example

Consider an aeronautical telemetry and approach safety monitoring system:

\`\`\`erlang
-module(flight_telemetry).
-export([categorize_altitude/1, safe_glide_slope/2]).

%% Categorize flight level in thousands of feet (FL) using integer boundary guards
categorize_altitude(Feet) when is_integer(Feet), Feet >= 18000 ->
    class_a_airspace;
categorize_altitude(Feet) when is_integer(Feet), Feet >= 3000, Feet < 18000 ->
    controlled_airspace;
categorize_altitude(Feet) when is_integer(Feet), Feet >= 0, Feet < 3000 ->
    terminal_area;
categorize_altitude(_) ->
    {error, invalid_altitude}.

%% Calculate vertical descent rate vs distance without crashing on zero distance (runway threshold)
%% In guards, (DescentFt / Miles) silently evaluates to false if Miles is zero or non-numeric!
safe_glide_slope(DescentFt, Miles)
  when is_number(DescentFt), is_number(Miles), Miles > 0, (DescentFt / Miles) =< 318.0 ->
    normal_approach;
safe_glide_slope(DescentFt, Miles)
  when is_number(DescentFt), is_number(Miles), Miles > 0 ->
    steep_approach;
safe_glide_slope(_, _) ->
    {error, invalid_approach_parameters}.
\`\`\`

Notice:
- \`categorize_altitude/1\` combines type check \`is_integer/1\` with comma-separated range checks to enforce boundaries cleanly across multiple clauses.
- \`safe_glide_slope/2\` performs floating-point division in the guard; if \`Miles\` is zero or invalid, the guard fails silently to \`false\` and executes the fallback clause without crashing the process.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Guard Sequence Grammar
Clause(Args) when Guard1, Guard2 -> ...;      %% Comma = AND
Clause(Args) when Guard1; Guard2 -> ... .     %% Semicolon = OR
\`\`\`

## Assignment Specification

Implement three validation and classification functions in \`guard_validator.erl\` using guard clauses (\`when\`):

### 1. \`validate_port(Port)\`
- **Input**: Any term \`Port\`.
- **Behavior**: Use guard clauses with integer type assertions and range bounds:
  - Ports from \`1024\` to \`65535\` (inclusive): Return \`{ok, unprivileged_port}\`.
  - Ports from \`1\` to \`1023\` (inclusive): Return \`{ok, privileged_port}\`.
  - Any other value (negative numbers, 0, numbers greater than 65535, or non-integer terms): Return \`{error, invalid_port}\`.
- **Examples**:
  - \`guard_validator:validate_port(8080)\` returns \`{ok, unprivileged_port}\`.
  - \`guard_validator:validate_port(443)\` returns \`{ok, privileged_port}\`.
  - \`guard_validator:validate_port(0)\` returns \`{error, invalid_port}\`.
  - \`guard_validator:validate_port("80")\` returns \`{error, invalid_port}\`.

### 2. \`classify_temperature(TempC)\`
- **Input**: Any term \`TempC\`.
- **Behavior**: Classify numeric temperatures into climate status atoms using number guards:
  - Less than or equal to \`0\`: Return atom \`freezing\`.
  - Greater than \`0\` and less than or equal to \`25\`: Return atom \`temperate\`.
  - Greater than \`25\`: Return atom \`hot\`.
  - Any non-numeric value: Return \`{error, invalid_temperature}\`.
- **Examples**:
  - \`guard_validator:classify_temperature(-5)\` returns \`freezing\`.
  - \`guard_validator:classify_temperature(0)\` returns \`freezing\`.
  - \`guard_validator:classify_temperature(21.5)\` returns \`temperate\`.
  - \`guard_validator:classify_temperature(38)\` returns \`hot\`.
  - \`guard_validator:classify_temperature(warm)\` returns \`{error, invalid_temperature}\`.

### 3. \`safe_ratio(A, B)\`
- **Input**: Terms \`A\` and \`B\`.
- **Behavior**: Calculate the ratio of \`A\` divided by \`B\` using guards to protect against division by zero and invalid types:
  - If both \`A\` and \`B\` are numbers, \`B\` is not zero, and the quotient is greater than or equal to \`2.0\`: Return atom \`high_ratio\`.
  - If both \`A\` and \`B\` are numbers, \`B\` is not zero, and the quotient is less than \`2.0\`: Return atom \`normal_ratio\`.
  - If either argument is non-numeric, \`B\` is zero, or any guard fails: Return \`{error, invalid_ratio}\`.
- **Examples**:
  - \`guard_validator:safe_ratio(10, 2)\` returns \`high_ratio\`.
  - \`guard_validator:safe_ratio(3, 2)\` returns \`normal_ratio\`.
  - \`guard_validator:safe_ratio(10, 0)\` returns \`{error, invalid_ratio}\`.
  - \`guard_validator:safe_ratio(10, "2")\` returns \`{error, invalid_ratio}\`.

## Rules & Verification Constraints

- Guard clauses (\`when\`) must be used for all range and type assertions.
- Do not use \`<=\` (use \`=<\`).`,
    otpDocCards: [
      {
        functionName: 'guard_sequences',
        module: 'erlang',
        signature: 'Name(Arg) when GuardSequence -> Body.',
        typesSpec: ['GuardSequence = [guard_expr()]'],
        description: 'Pure predicate assertions compiled into single-cycle CPU tests.',
        complexityNote: 'Guards never trigger garbage collection and run directly in registers.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/expressions.html#guard-sequences',
      },
    ],
    mentalModelCheck: {
      question: 'What happens if an arithmetic exception (e.g. division by zero) occurs inside an Erlang guard clause?',
      options: [
        {
          id: 'A',
          label: 'The guard silently catches the exception, evaluates to false, and Erlang tests the next clause',
          isCorrect: true,
          explanation: 'In Erlang guards, exceptions never crash the process; they safely fail to false.',
        },
        {
          id: 'B',
          label: 'The entire BEAM emulator crashes with a core dump',
          isCorrect: false,
          explanation: 'The BEAM VM is fault-tolerant and isolates guard evaluations.',
        },
        {
          id: 'C',
          label: 'The process terminates immediately with {badarith, ...}',
          isCorrect: false,
          explanation: 'Expressions in function bodies crash with badarith, but inside guards they fail silently to false.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch02-02-a',
        title: 'Validate Unprivileged Port',
        erlangCall: 'guard_validator:validate_port(8080)',
        expectedOutput: '{ok, unprivileged_port}',
        explanation: 'Port 8080 is within [1024, 65535].',
      },
      {
        id: 'tc-ch02-02-b',
        title: 'Classify Freezing Temperature',
        erlangCall: 'guard_validator:classify_temperature(-5)',
        expectedOutput: 'freezing',
        explanation: '-5 is a number and =< 0.',
      },
      {
        id: 'tc-ch02-02-c',
        title: 'Safe Ratio Above Threshold',
        erlangCall: 'guard_validator:safe_ratio(10, 2)',
        expectedOutput: 'high_ratio',
        explanation: '10 / 2 = 5.0 which is >= 2.0.',
      },
      {
        id: 'tc-ch02-02-d',
        title: 'Safe Ratio Division By Zero Fallback',
        erlangCall: 'guard_validator:safe_ratio(10, 0)',
        expectedOutput: '{error, invalid_ratio}',
        explanation: 'B =:= 0 silently fails ratio guard and triggers fallback.',
      },
    ],
    astRules: {
      requiredConstructs: ['guards'],
    },
    solutionExplanation: 'Enforces numerical bounds using when is_integer, when is_number, and safe division guards.',
    files: [
      {
        name: 'guard_validator.erl',
        path: 'src/guard_validator.erl',
        content: `-module(guard_validator).
-export([validate_port/1, classify_temperature/1, safe_ratio/2]).

%% @doc Validate network port number and classify as privileged or unprivileged.
validate_port(Port) ->
    ok.

%% @doc Classify numeric Celsius temperature into freezing, temperate, or hot.
classify_temperature(TempC) ->
    ok.

%% @doc Compute division ratio with guard protection against zero divisors and invalid types.
safe_ratio(A, B) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/guard_validator.erl': `-module(guard_validator).
-export([validate_port/1, classify_temperature/1, safe_ratio/2]).

validate_port(Port) when is_integer(Port), Port >= 1024, Port =< 65535 ->
    {ok, unprivileged_port};
validate_port(Port) when is_integer(Port), Port >= 1, Port =< 1023 ->
    {ok, privileged_port};
validate_port(_) ->
    {error, invalid_port}.

classify_temperature(TempC) when is_number(TempC), TempC =< 0 ->
    freezing;
classify_temperature(TempC) when is_number(TempC), TempC > 0, TempC =< 25 ->
    temperate;
classify_temperature(TempC) when is_number(TempC), TempC > 25 ->
    hot;
classify_temperature(_) ->
    {error, invalid_temperature}.

safe_ratio(A, B) when is_number(A), is_number(B), B =/= 0, (A / B) >= 2.0 ->
    high_ratio;
safe_ratio(A, B) when is_number(A), is_number(B), B =/= 0 ->
    normal_ratio;
safe_ratio(_, _) ->
    {error, invalid_ratio}.`,
    },
    starterCode: `-module(guard_validator).
-export([validate_port/1, classify_temperature/1, safe_ratio/2]).

%% @doc Validate network port number and classify as privileged or unprivileged.
validate_port(Port) ->
    ok.

%% @doc Classify numeric Celsius temperature into freezing, temperate, or hot.
classify_temperature(TempC) ->
    ok.

%% @doc Compute division ratio with guard protection against zero divisors and invalid types.
safe_ratio(A, B) ->
    ok.`,
    solutionCode: `-module(guard_validator).
-export([validate_port/1, classify_temperature/1, safe_ratio/2]).

validate_port(Port) when is_integer(Port), Port >= 1024, Port =< 65535 ->
    {ok, unprivileged_port};
validate_port(Port) when is_integer(Port), Port >= 1, Port =< 1023 ->
    {ok, privileged_port};
validate_port(_) ->
    {error, invalid_port}.

classify_temperature(TempC) when is_number(TempC), TempC =< 0 ->
    freezing;
classify_temperature(TempC) when is_number(TempC), TempC > 0, TempC =< 25 ->
    temperate;
classify_temperature(TempC) when is_number(TempC), TempC > 25 ->
    hot;
classify_temperature(_) ->
    {error, invalid_temperature}.

safe_ratio(A, B) when is_number(A), is_number(B), B =/= 0, (A / B) >= 2.0 ->
    high_ratio;
safe_ratio(A, B) when is_number(A), is_number(B), B =/= 0 ->
    normal_ratio;
safe_ratio(_, _) ->
    {error, invalid_ratio}.`,
  },

  // ── Lesson 2.3: Branching Inside Bodies: case...of vs if...end ───────────
  {
    id: 'ch02-l03',
    chapterNumber: 2,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Branching Inside Bodies: case...of vs. if...end',
    difficulty: 'Beginner',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

While multi-clause function heads are the primary dispatch mechanism in Erlang, real-world systems frequently need to branch **in the middle of a function body** based on the result of an intermediate computation (such as calling a database, decoding a JSON envelope, or parsing an HTTP response).

In Erlang, inline branching is handled with \`case...of\` and \`if...end\`. Understanding the operational differences between them will prevent runtime \`if_clause\` crashes in production services.

## Deep Concept Breakdown & Under the Hood

### 1. \`case Expression of\` (The Workhorse of Erlang)
The \`case...of\` construct evaluates an arbitrary expression, and then pattern-matches the resulting value against one or more branches:

\`\`\`erlang
case disk_storage:read(SectorId) of
    {ok, data, Block} ->
        {ok, parse_block(Block)};
    {error, checksum_mismatch} ->
        {retry, SectorId};
    {error, unreadable} ->
        {quarantine, SectorId}
end
\`\`\`

Clauses inside \`case...of\` support all features of function heads: nested pattern destructuring, guard clauses (\`when\`), and wildcard matching (\`_\`).

### 2. \`if...end\` (Pure Guard Evaluation)
Unlike \`if\` in languages like C, Java, or JavaScript, **Erlang's \`if\` statement does NOT evaluate truthy/falsy booleans**. It evaluates **Guard Expressions**!

\`\`\`erlang
assess_battery_level(Percent) ->
    if
        Percent >= 80 -> battery_high;
        Percent >= 20 -> battery_medium;
        true -> battery_critical
    end.
\`\`\`

### 3. The Dreaded \`if_clause\` Runtime Crash
In Erlang, if none of the guard conditions in an \`if...end\` block evaluate to \`true\`, the BEAM VM crashes immediately with an \`{if_clause}\` runtime error!

To prevent this, Erlang programs using \`if\` must always include a final **\`true ->\` branch** as the fallback catch-all.

> [!warning] Common Beginner Syntax Trap: Why Erlang Pros Avoid if...end
> Because \`if...end\` can only evaluate guard BIFs (and not pattern matching or arbitrary expressions), and crashes if \`true ->\` is omitted, experienced Erlang engineers use \`case...of\` or multi-clause functions 95% of the time.

## Parallel Worked Example

Consider an industrial robotics arm controller inspecting optical sensor payloads and joint calibration angles:

\`\`\`erlang
-module(robot_controller).
-export([eval_sensor_reading/1, calibrate_joint_angle/1]).

eval_sensor_reading(SensorPacket) ->
    case SensorPacket of
        {optical_probe, ready, Intensity} when Intensity >= 95 ->
            {engaged, focused, Intensity};
        {optical_probe, calibrating, _} ->
            {hold, sensor_warmup};
        {optical_probe, fault, ErrorCode} ->
            {quarantine, {hardware_fault, ErrorCode}};
        {optical_probe, UnknownStatus, _} ->
            {error, {unsupported_probe_state, UnknownStatus}};
        _ ->
            {error, unrecognized_sensor_packet}
    end.

calibrate_joint_angle(Degrees) ->
    if
        Degrees >= -15, Degrees =< 15 -> aligned;
        Degrees < -15; Degrees > 180 -> out_of_bounds;
        true -> manual_trim_required
    end.
\`\`\`

Notice:
- \`eval_sensor_reading/1\` demonstrates \`case...of\` branching on a tuple, combining pattern matching with integer guards (\`when Intensity >= 95\`), specific error tuples, and a wildcard fallback.
- \`calibrate_joint_angle/1\` demonstrates \`if...end\` guard chains using compound comma AND, semicolon OR, and the mandatory \`true ->\` catch-all branch.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% case syntax:
case Expr of
    Pattern1 [when Guard1] -> Body1;
    Pattern2 [when Guard2] -> Body2;
    _Fallback -> FallbackBody
end.

%% if syntax:
if
    Guard1 -> Body1;
    Guard2 -> Body2;
    true -> FallbackBody
end.
\`\`\`

## Assignment Specification

Implement two flow control functions in \`flow_control.erl\`:

### 1. \`handle_http_response(Response)\`
- **Input**: Any term \`Response\`. Well-formed responses are 3-element tuples containing the atom tag \`http_response\`, an integer \`StatusCode\`, and a payload \`Body\`.
- **Behavior**: Inspect the response inside the function body using a \`case...of\` expression:
  - Status code \`200\`: Returns \`{ok, Body}\`.
  - Status code \`401\` or \`403\`: Returns \`{error, unauthorized}\`.
  - Status codes in the \`500\` through \`599\` range (inclusive): Returns \`{error, server_error}\`.
  - Any other integer status code: Returns \`{error, {unexpected_status, StatusCode}}\`.
  - Any term that does not match the 3-element \`http_response\` tuple structure: Returns \`{error, invalid_response}\`.
- **Examples**:
  - \`flow_control:handle_http_response({http_response, 200, "{\\"status\\":\\"healthy\\"}"})\` returns \`{ok, "{\\"status\\":\\"healthy\\"}"}\`.
  - \`flow_control:handle_http_response({http_response, 401, []})\` returns \`{error, unauthorized}\`.
  - \`flow_control:handle_http_response({http_response, 403, []})\` returns \`{error, unauthorized}\`.
  - \`flow_control:handle_http_response({http_response, 503, "Unavailable"})\` returns \`{error, server_error}\`.
  - \`flow_control:handle_http_response({http_response, 301, "Redirect"})\` returns \`{error, {unexpected_status, 301}}\`.
  - \`flow_control:handle_http_response(corrupt_payload)\` returns \`{error, invalid_response}\`.

### 2. \`grade_latency(LatencyMs)\`
- **Input**: An integer \`LatencyMs\` representing network round-trip time in milliseconds.
- **Behavior**: Classify latency using an \`if...end\` expression with guard conditions:
  - Latency strictly less than \`50\` ms: Returns the atom \`optimal\`.
  - Latency between \`50\` ms and \`200\` ms (inclusive): Returns the atom \`acceptable\`.
  - Any latency greater than \`200\` ms (handled via the mandatory \`true\` fallback branch): Returns the atom \`sla_breach\`.
- **Examples**:
  - \`flow_control:grade_latency(30)\` returns \`optimal\`.
  - \`flow_control:grade_latency(50)\` returns \`acceptable\`.
  - \`flow_control:grade_latency(150)\` returns \`acceptable\`.
  - \`flow_control:grade_latency(200)\` returns \`acceptable\`.
  - \`flow_control:grade_latency(500)\` returns \`sla_breach\`.

## Rules & Verification Constraints

- \`handle_http_response/1\` must use a \`case...of\` expression.
- \`grade_latency/1\` must use an \`if...end\` expression with a \`true ->\` catch-all.`,
    otpDocCards: [
      {
        functionName: 'case_expression',
        module: 'erlang',
        signature: 'case Expr of Pattern -> Body end.',
        typesSpec: ['Expr = term()', 'Pattern = term()'],
        description: 'Evaluates Expr and executes the first matching pattern branch.',
        complexityNote: 'Compiled into efficient jump tables and pattern decoders.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/expressions.html#case',
      },
    ],
    mentalModelCheck: {
      question: 'What occurs if an Erlang if...end expression evaluates without any condition matching and without a true -> branch?',
      options: [
        {
          id: 'A',
          label: 'The process crashes with an if_clause runtime exception',
          isCorrect: true,
          explanation: 'Erlang if statements must match at least one branch; otherwise an if_clause exception is raised.',
        },
        {
          id: 'B',
          label: 'The if statement silently returns the atom undefined',
          isCorrect: false,
          explanation: 'Erlang never supplies implicit return values; unhandled cases crash explicitly.',
        },
        {
          id: 'C',
          label: 'The expression re-evaluates the first clause in an infinite loop',
          isCorrect: false,
          explanation: 'Erlang evaluates conditions once from top to bottom.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch02-03-a',
        title: 'Handle Successful HTTP Response',
        erlangCall: 'flow_control:handle_http_response({http_response, 200, "{\\"status\\":\\"healthy\\"}"})',
        expectedOutput: '{ok, "{\\"status\\":\\"healthy\\"}"}',
        explanation: 'Matches 200 status branch in case...of.',
      },
      {
        id: 'tc-ch02-03-b',
        title: 'Handle Unauthorized HTTP Response',
        erlangCall: 'flow_control:handle_http_response({http_response, 401, []})',
        expectedOutput: '{error, unauthorized}',
        explanation: 'Matches 401/403 guard branch.',
      },
      {
        id: 'tc-ch02-03-c',
        title: 'Grade Optimal Latency',
        erlangCall: 'flow_control:grade_latency(30)',
        expectedOutput: 'optimal',
        explanation: '30 is < 50 ms in if...end.',
      },
      {
        id: 'tc-ch02-03-d',
        title: 'Grade SLA Breach Latency',
        erlangCall: 'flow_control:grade_latency(500)',
        expectedOutput: 'sla_breach',
        explanation: '500 triggers the true -> fallback.',
      },
    ],
    astRules: {
      requiredConstructs: ['case_expr'],
    },
    solutionExplanation: 'Demonstrates case...of pattern matching on HTTP response tuples and if...end guard chains for latency grading.',
    files: [
      {
        name: 'flow_control.erl',
        path: 'src/flow_control.erl',
        content: `-module(flow_control).
-export([handle_http_response/1, grade_latency/1]).

%% @doc Parse and normalize HTTP response tuples into success and error tagged envelopes.
handle_http_response(Response) ->
    ok.

%% @doc Classify round-trip latency into optimal, acceptable, or sla_breach status atoms.
grade_latency(LatencyMs) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/flow_control.erl': `-module(flow_control).
-export([handle_http_response/1, grade_latency/1]).

handle_http_response(Response) ->
    case Response of
        {http_response, 200, Body} ->
            {ok, Body};
        {http_response, Code, _Body} when Code =:= 401; Code =:= 403 ->
            {error, unauthorized};
        {http_response, Code, _Body} when Code >= 500, Code =< 599 ->
            {error, server_error};
        {http_response, Code, _Body} ->
            {error, {unexpected_status, Code}};
        _ ->
            {error, invalid_response}
    end.

grade_latency(LatencyMs) ->
    if
        LatencyMs < 50 -> optimal;
        LatencyMs >= 50, LatencyMs =< 200 -> acceptable;
        true -> sla_breach
    end.`,
    },
    starterCode: `-module(flow_control).
-export([handle_http_response/1, grade_latency/1]).

%% @doc Parse and normalize HTTP response tuples into success and error tagged envelopes.
handle_http_response(Response) ->
    ok.

%% @doc Classify round-trip latency into optimal, acceptable, or sla_breach status atoms.
grade_latency(LatencyMs) ->
    ok.`,
    solutionCode: `-module(flow_control).
-export([handle_http_response/1, grade_latency/1]).

handle_http_response(Response) ->
    case Response of
        {http_response, 200, Body} ->
            {ok, Body};
        {http_response, Code, _Body} when Code =:= 401; Code =:= 403 ->
            {error, unauthorized};
        {http_response, Code, _Body} when Code >= 500, Code =< 599 ->
            {error, server_error};
        {http_response, Code, _Body} ->
            {error, {unexpected_status, Code}};
        _ ->
            {error, invalid_response}
    end.

grade_latency(LatencyMs) ->
    if
        LatencyMs < 50 -> optimal;
        LatencyMs >= 50, LatencyMs =< 200 -> acceptable;
        true -> sla_breach
    end.`,
  },

  // ── Lesson 2.4: Thinking Recursively (Part 1): Base Cases & Tuple Lookup ──
  {
    id: 'ch02-l04',
    chapterNumber: 2,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'Thinking Recursively (Part 1): Base Cases & Searching a List of Tuples',
    difficulty: 'Beginner',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In imperative programming languages (Python, Go, Java, TypeScript), searching an inventory list is done with a \`for\` or \`while\` loop that mutates an index variable.

In pure functional programming, **there are no for loops or while loops**.
Instead, all iteration over data collections is expressed through **Recursion**: decomposing a list into its **Head (the current item)** and its **Tail (the rest of the list)**, processing the head, and recursively calling the function on the tail.

Before you can build complex systems like the Inventory Order Processor (\`inventory.erl\` in Lesson 2.8), you must master the fundamental building block: **Searching a list of domain tuples for a matching identifier**.

## Deep Concept Breakdown & Under the Hood

### The 3 Rules of Recursive Search
Every recursive search over an Erlang list consists of three distinct cases:

1. **The Base Case (List Exhausted):**
   If the list is empty (\`[]\`), we traversed all items and did not find the target. Return an error or not-found atom.
   \`\`\`erlang
   find_record([], _TargetKey) ->
       {error, not_present};
   \`\`\`

2. **The Match Case (Target Located):**
   If the head of the list contains the identifier we are searching for, stop immediately and return the item.
   \`\`\`erlang
   find_record([{entry, TargetKey, Value} | _Tail], TargetKey) ->
       {found, Value};
   \`\`\`

3. **The Recursive Step (Search Deeper):**
   If the head of the list does NOT match the target, discard the head and search the remaining tail!
   \`\`\`erlang
   find_record([_Other | Tail], TargetKey) ->
       find_record(Tail, TargetKey).
   \`\`\`

### Natural Tail Recursion
Notice what happens in step 3: the recursive call \`find_record(Tail, TargetKey)\` is the **very last operation** executed in that clause.
Because nothing remains to be calculated after \`find_record\` returns, the BEAM VM reuses the current stack frame. Searching a list of 100,000 items in Erlang does not allocate 100,000 stack frames—it runs in constant $O(1)$ stack space!

> [!warning] Common Beginner Syntax Trap: The Missing Base Case
> The most frequent beginner bug in recursive Erlang is forgetting the empty list clause (\`find_record([], _) -> ...\`).
> If this clause is omitted and an item is not in the list, the function will attempt to match \`[]\` against \`[Head | Tail]\`, immediately crashing with a \`function_clause\` runtime error!

## Parallel Worked Example

Consider a distributed cluster node discovery and region membership system:

\`\`\`erlang
-module(cluster_nodes).
-export([locate_active_peer/2, count_matching_region/2]).

%% Locate a healthy peer node matching a given node name in a cluster topology list
locate_active_peer([], _TargetNode) ->
    {error, peer_unreachable};
locate_active_peer([{peer, TargetNode, online, LatencyMs} | _Peers], TargetNode) ->
    {active_peer, TargetNode, LatencyMs};
locate_active_peer([_OtherPeer | Peers], TargetNode) ->
    locate_active_peer(Peers, TargetNode).

%% Recursively count how many nodes belong to a specific geographic region
count_matching_region([], _Region) ->
    0;
count_matching_region([{node, _Id, Region, _Cap} | Rest], Region) ->
    1 + count_matching_region(Rest, Region);
count_matching_region([_Node | Rest], Region) ->
    count_matching_region(Rest, Region).
\`\`\`

Notice:
- \`locate_active_peer/2\` demonstrates the 3-case recursive search pattern: empty list base case returning \`{error, peer_unreachable}\`, head pattern matching on \`TargetNode\`, and tail delegation.
- \`count_matching_region/2\` demonstrates recursive list processing for counting matches without shadowing simple boolean membership tests.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Recursive List Traversal Pattern:
traverse([]) -> BaseResult;
traverse([MatchItem | _Rest]) when Condition -> MatchResult;
traverse([_Other | Rest]) -> traverse(Rest).
\`\`\`

## Assignment Specification

Implement two recursive search functions in \`recursive_search.erl\`:

### 1. \`find_product(Inventory, TargetId)\`
- **Input**: A list \`Inventory\` of 5-element product tuples, and a target product identifier \`TargetId\`. Each product is structured as \`{product, Id, Name, Price, Stock}\` where \`Id\`, \`Price\`, and \`Stock\` are integers, and \`Name\` is a string.
- **Behavior**: Traverse the inventory list recursively using head/tail decomposition:
  - If a product whose ID matches \`TargetId\` is found, return \`{ok, ProductTuple}\` containing the complete matching product.
  - If the inventory is exhausted without finding a match, return the atom \`not_found\`.
  - Must handle the empty list \`[]\` base case cleanly.
- **Examples**:
  - \`recursive_search:find_product([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}], 2)\` returns \`{ok, {product, 2, "Mouse", 25, 5}}\`.
  - \`recursive_search:find_product([{product, 1, "Keyboard", 50, 10}], 99)\` returns \`not_found\`.
  - \`recursive_search:find_product([], 1)\` returns \`not_found\`.

### 2. \`contains_item(List, Target)\`
- **Input**: A list \`List\` of any terms and a \`Target\` term to locate.
- **Behavior**: Check whether \`Target\` exists as an element in \`List\` using pure recursive pattern matching:
  - If \`Target\` matches the head element of the list: Returns \`true\`.
  - If the list is exhausted without finding \`Target\`: Returns \`false\`.
- **Examples**:
  - \`recursive_search:contains_item([apple, banana, cherry], banana)\` returns \`true\`.
  - \`recursive_search:contains_item([apple, banana, cherry], date)\` returns \`false\`.
  - \`recursive_search:contains_item([], 42)\` returns \`false\`.

## Rules & Verification Constraints

- Implement using pure recursive pattern matching.
- Do not use functions from the \`lists\` module (such as \`lists:keyfind/3\` or \`lists:member/2\`).
- Must handle the empty list base case cleanly without crashing.`,
    otpDocCards: [
      {
        functionName: 'recursive_decomposition',
        module: 'erlang',
        signature: 'Search([H | T], Target) -> Result.',
        typesSpec: ['List = [term()]', 'Target = term()'],
        description: 'Recursive head/tail list decomposition pattern.',
        complexityNote: 'O(N) time complexity with O(1) stack space under tail-call optimization.',
        officialUrl: 'https://www.erlang.org/doc/programming_examples/list_comprehensions.html',
      },
    ],
    mentalModelCheck: {
      question: 'Why does an Erlang recursive search function crash with {function_clause} if the base case find_product([], _) -> not_found is omitted?',
      options: [
        {
          id: 'A',
          label: 'When the list is exhausted, Erlang attempts to match the empty list [] against [Head | Tail], which fails',
          isCorrect: true,
          explanation: 'The cons pattern [Head | Tail] requires at least one element. An empty list cannot match it.',
        },
        {
          id: 'B',
          label: 'The BEAM scheduler halts because empty lists cannot exist in memory',
          isCorrect: false,
          explanation: 'Empty lists [] are the fundamental nil terminator in Erlang.',
        },
        {
          id: 'C',
          label: 'The garbage collector deletes the TargetId variable when a list reaches zero length',
          isCorrect: false,
          explanation: 'Variable bindings persist throughout the execution of the function clause.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch02-04-a',
        title: 'Find Existing Product by ID',
        erlangCall: 'recursive_search:find_product([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}], 2)',
        expectedOutput: '{ok, {product, 2, "Mouse", 25, 5}}',
        explanation: 'Finds product 2 in the second tuple position.',
      },
      {
        id: 'tc-ch02-04-b',
        title: 'Return not_found for Non-Existent Product',
        erlangCall: 'recursive_search:find_product([{product, 1, "Keyboard", 50, 10}], 99)',
        expectedOutput: 'not_found',
        explanation: 'Traverses to base case [] and returns not_found.',
      },
      {
        id: 'tc-ch02-04-c',
        title: 'Contains Item Positive Check',
        erlangCall: 'recursive_search:contains_item([apple, banana, cherry], banana)',
        expectedOutput: 'true',
        explanation: 'Finds banana at head of sublist.',
      },
      {
        id: 'tc-ch02-04-d',
        title: 'Contains Item Negative Check',
        erlangCall: 'recursive_search:contains_item([apple, banana, cherry], date)',
        expectedOutput: 'false',
        explanation: 'Item not in list; returns false at base case.',
      },
    ],
    astRules: {
      forbiddenCalls: ['lists:keyfind', 'lists:member', 'lists:filter'],
    },
    solutionExplanation: 'Demonstrates base-case handling on [] and recursive head/tail pattern matching for tuple search and member verification.',
    files: [
      {
        name: 'recursive_search.erl',
        path: 'src/recursive_search.erl',
        content: `-module(recursive_search).
-export([find_product/2, contains_item/2]).

%% @doc Recursively search an inventory list for a product tuple matching TargetId.
find_product(Inventory, TargetId) ->
    ok.

%% @doc Check whether Target is an element of List using recursive pattern matching.
contains_item(List, Target) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/recursive_search.erl': `-module(recursive_search).
-export([find_product/2, contains_item/2]).

find_product([], _TargetId) ->
    not_found;
find_product([{product, TargetId, _Name, _Price, _Stock} = Prod | _Rest], TargetId) ->
    {ok, Prod};
find_product([_OtherProd | Rest], TargetId) ->
    find_product(Rest, TargetId).

contains_item([], _Target) ->
    false;
contains_item([Target | _Rest], Target) ->
    true;
contains_item([_Other | Rest], Target) ->
    contains_item(Rest, Target).`,
    },
    starterCode: `-module(recursive_search).
-export([find_product/2, contains_item/2]).

%% @doc Recursively search an inventory list for a product tuple matching TargetId.
find_product(Inventory, TargetId) ->
    ok.

%% @doc Check whether Target is an element of List using recursive pattern matching.
contains_item(List, Target) ->
    ok.`,
    solutionCode: `-module(recursive_search).
-export([find_product/2, contains_item/2]).

find_product([], _TargetId) ->
    not_found;
find_product([{product, TargetId, _Name, _Price, _Stock} = Prod | _Rest], TargetId) ->
    {ok, Prod};
find_product([_OtherProd | Rest], TargetId) ->
    find_product(Rest, TargetId).

contains_item([], _Target) ->
    false;
contains_item([Target | _Rest], Target) ->
    true;
contains_item([_Other | Rest], Target) ->
    contains_item(Rest, Target).`,
  },

  // ── Lesson 2.5: Body Recursion vs TCO ─────────────────────────────────────
  {
    id: 'ch02-l05',
    chapterNumber: 2,
    lessonNumber: 5,
    lessonType: 'concept_exercise',
    title: 'Body Recursion vs. Tail-Call Optimization (TCO) on the BEAM Stack',
    difficulty: 'Beginner',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In production BEAM applications processing millions of network packets, sensor readings, or ledger entries, how you write recursive functions directly determines whether your server runs smoothly or crashes with an **Out Of Memory (OOM)** error.

The BEAM VM allocates an execution stack frame for every active function call. If a recursive function is written poorly, the stack frame cannot be released until the entire list has been traversed. For a list of 1,000,000 items, this consumes hundreds of megabytes of RAM.

When a function is **Tail-Call Optimized (TCO)**, the BEAM VM reuses the exact same stack frame indefinitely. A TCO function can process 1,000,000,000 items in constant **$O(1)$ stack memory** (less than 64 words of stack)!

## Deep Concept Breakdown & Under the Hood

### 1. Body Recursion (The Stack-Hungry Trap)
Consider computing factorial naively:

\`\`\`erlang
%% Body-recursive:
factorial_naive(0) -> 1;
factorial_naive(N) when N > 0 -> N * factorial_naive(N - 1).
\`\`\`

Why is this called "Body Recursion"?
Notice the expression \`N * factorial_naive(N - 1)\`. Before multiplication (\`*\`) can occur, the BEAM VM **must wait** for \`factorial_naive(N - 1)\` to return a value.
Because the multiplication is suspended waiting for the recursive call to return, the current stack frame cannot be discarded. The BEAM pushes a new stack frame for each call:

\`\`\`
[Frame 1: 5 * (waiting)]
  [Frame 2: 4 * (waiting)]
    [Frame 3: 3 * (waiting)]  <-- Stack grows linearly O(N)!
\`\`\`

### 2. Tail-Call Optimization & The Accumulator Pattern
A function is **Tail-Recursive** if the recursive call is the **absolute last operation** executed in the clause. Nothing is suspended or waiting.

To make an aggregation tail-recursive, we introduce a private auxiliary helper with an extra parameter called an **Accumulator (\`Acc\`)**:

\`\`\`erlang
%% Public interface initializes accumulator to 1:
factorial_tco(N) ->
    factorial_loop(N, 1).

%% Private tail-recursive loop:
factorial_loop(0, Acc) ->
    Acc;
factorial_loop(N, Acc) when N > 0 ->
    factorial_loop(N - 1, Acc * N).   %% Acc * N is evaluated BEFORE the call!
\`\`\`

Notice:
1. \`Acc * N\` is evaluated **before** \`factorial_loop/2\` is called.
2. The recursive call \`factorial_loop(N - 1, ...)\` is the final instruction.
3. The BEAM compiler detects this pattern and emits the \`call_last\` bytecode opcode. Instead of pushing a new frame, it overwrites the existing stack frame in place. Stack space remains constant $O(1)$!

> [!warning] Common Beginner Syntax Trap: Pseudo-TCO
> Writing \`N * factorial_loop(N - 1, Acc)\` is NOT tail-recursive!
> Even though an accumulator was passed, the \`N *\` operation is still outside the call, forcing the BEAM to hold the stack frame open. Always perform the update calculation inside the function call argument.

### 3. Folding Lists with Tail Recursion
The same accumulator principle applies when iterating across lists:

\`\`\`erlang
%% The Standard List Accumulator Pattern:
process_items(List) ->
    process_loop(List, InitialAcc).

process_loop([], Acc) ->
    Acc;
process_loop([Head | Tail], Acc) ->
    NewAcc = update(Acc, Head),
    process_loop(Tail, NewAcc).
\`\`\`

## Parallel Worked Example

Aggregating satellite telemetry signal decay and detecting anomalies:

\`\`\`erlang
-module(telemetry_pipeline).
-export([compound_decay/1, count_spikes/2]).

%% Calculate compound decay factor over atmospheric layers:
compound_decay(Coefficients) ->
    decay_loop(Coefficients, 1.0).

decay_loop([], TotalDecay) ->
    TotalDecay;
decay_loop([Rate | Rest], TotalDecay) ->
    decay_loop(Rest, TotalDecay * Rate).

%% Count reading spikes that exceed a critical decibel threshold:
count_spikes(Readings, Threshold) ->
    spikes_loop(Readings, Threshold, 0).

spikes_loop([], _Threshold, SpikeCount) ->
    SpikeCount;
spikes_loop([Reading | Rest], Threshold, SpikeCount) when Reading > Threshold ->
    spikes_loop(Rest, Threshold, SpikeCount + 1);
spikes_loop([_Reading | Rest], Threshold, SpikeCount) ->
    spikes_loop(Rest, Threshold, SpikeCount).
\`\`\`

## Assignment Specification

Implement tail-recursive accumulator functions in \`tco_counter.erl\` to process network packet batches in constant stack space:

### \`sum_packets/1\`
- **Input**: \`List\` — A list of zero or more integers representing packet byte sizes.
- **Behavior**: Sums all integers in the list. The aggregation must be strictly tail-recursive using an auxiliary accumulator function, executing in constant $O(1)$ stack memory. Returns \`0\` for an empty list.
- **Examples**:
  - \`tco_counter:sum_packets([10, 20, 30, 40])\` returns \`100\`.
  - \`tco_counter:sum_packets([])\` returns \`0\`.

### \`count_packets/1\`
- **Input**: \`List\` — A list of zero or more arbitrary Erlang terms representing received packet descriptors.
- **Behavior**: Counts the total number of elements in the list. Must be strictly tail-recursive using an auxiliary accumulator function, executing in constant $O(1)$ stack memory. Returns \`0\` for an empty list.
- **Examples**:
  - \`tco_counter:count_packets([a, b, c, d, e])\` returns \`5\`.
  - \`tco_counter:count_packets([])\` returns \`0\`.

## Rules & Verification Constraints

- Must be strictly tail-recursive (enforced by \`bf_ast_verifier\` bytecode disassembly checking for \`call_last\`).
- Forbidden calls: \`lists:sum/1\`, \`erlang:length/1\`.`,
    visualScene: 'tco_vs_body_stack',
    otpDocCards: [
      {
        functionName: 'tail_call_optimization',
        module: 'erts',
        signature: 'call_last Function/Arity',
        typesSpec: ['Instruction = beam_opcode()'],
        description: 'BEAM opcode that reuses the current stack frame for recursive iterations.',
        complexityNote: 'Guarantees O(1) stack space regardless of list length.',
        officialUrl: 'https://www.erlang.org/doc/efficiency_guide/myths.html#tail_recursive',
      },
    ],
    mentalModelCheck: {
      question: 'Why does a tail-recursive function execute in O(1) stack space while a body-recursive function consumes O(N) stack frames?',
      options: [
        {
          id: 'A',
          label: 'Because the recursive call is the very last operation, allowing the BEAM VM to overwrite the active stack frame with call_last',
          isCorrect: true,
          explanation: 'In tail position, no computation remains to be performed after returning, so the stack frame is reused.',
        },
        {
          id: 'B',
          label: 'Because Erlang converts tail-recursive functions into C pointers in the runtime',
          isCorrect: false,
          explanation: 'Erlang compiles to BEAM bytecode instructions, not C pointers.',
        },
        {
          id: 'C',
          label: 'Because the accumulator allocates memory on the global heap instead of the process stack',
          isCorrect: false,
          explanation: 'Accumulators are arguments stored in CPU registers and stack slots.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch02-05-a',
        title: 'Sum Packet Sizes with TCO',
        erlangCall: 'tco_counter:sum_packets([10, 20, 30, 40])',
        expectedOutput: '100',
        explanation: 'Tail-recursively sums 10 + 20 + 30 + 40 = 100.',
      },
      {
        id: 'tc-ch02-05-b',
        title: 'Count Packets with TCO',
        erlangCall: 'tco_counter:count_packets([a, b, c, d, e])',
        expectedOutput: '5',
        explanation: 'Tail-recursively counts 5 items in O(1) stack space.',
      },
    ],
    astRules: {
      requireTailRecursion: ['sum_packets/1', 'count_packets/1'],
      forbiddenCalls: ['lists:sum/1', 'erlang:length/1'],
    },
    solutionExplanation: 'Implements tail-recursive loops with private accumulator helpers, compiling into call_last BEAM opcodes.',
    files: [
      {
        name: 'tco_counter.erl',
        path: 'src/tco_counter.erl',
        content: `-module(tco_counter).
-export([sum_packets/1, count_packets/1]).

%% @doc Calculate the total sum of integer packet sizes in O(1) stack space.
sum_packets(List) ->
    ok.

%% @doc Count the number of packet descriptors in O(1) stack space.
count_packets(List) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/tco_counter.erl': `-module(tco_counter).
-export([sum_packets/1, count_packets/1]).

sum_packets(List) ->
    sum_packets(List, 0).

sum_packets([], Acc) ->
    Acc;
sum_packets([H | T], Acc) ->
    sum_packets(T, Acc + H).

count_packets(List) ->
    count_packets(List, 0).

count_packets([], Acc) ->
    Acc;
count_packets([_ | T], Acc) ->
    count_packets(T, Acc + 1).`,
    },
    starterCode: `-module(tco_counter).
-export([sum_packets/1, count_packets/1]).

%% @doc Calculate the total sum of integer packet sizes in O(1) stack space.
sum_packets(List) ->
    ok.

%% @doc Count the number of packet descriptors in O(1) stack space.
count_packets(List) ->
    ok.`,
    solutionCode: `-module(tco_counter).
-export([sum_packets/1, count_packets/1]).

sum_packets(List) ->
    sum_packets(List, 0).

sum_packets([], Acc) ->
    Acc;
sum_packets([H | T], Acc) ->
    sum_packets(T, Acc + H).

count_packets(List) ->
    count_packets(List, 0).

count_packets([], Acc) ->
    Acc;
count_packets([_ | T], Acc) ->
    count_packets(T, Acc + 1).`,
  },

  // ── Lesson 2.6: The List Accumulator Pattern & lists:reverse/1 ───────────
  {
    id: 'ch02-l06',
    chapterNumber: 2,
    lessonNumber: 6,
    lessonType: 'concept_exercise',
    title: 'The List Accumulator Pattern & Why lists:reverse/1 is Mandatory',
    difficulty: 'Beginner',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In Lesson 2.5, you used an accumulator to calculate a single number (a sum or a count).
Now, what happens when your goal is to **build a new list** (e.g. filtering valid orders, transforming records, or cleaning inputs)?

This introduces the single most pervasive pattern in the Erlang programming language: **The List Accumulator Pattern**.

## Deep Concept Breakdown & Under the Hood

### 1. Prepending \`[NewItem | Acc]\` is $O(1)$
In Erlang, singly-linked lists are constructed by creating a new cons cell whose tail points to the existing list.
Adding an element to the front of a list takes **1 memory allocation and 0 copied elements**: it is strictly **$O(1)$ constant time**.

### 2. The Reversal Paradox: \`[Item | Acc]\` Reverses Order
When you iterate through an input list and prepend each matching item onto an accumulator:
- Element 1 is pushed first $\rightarrow$ \`[Elem1]\`
- Element 2 is pushed next $\rightarrow$ \`[Elem2, Elem1]\`
- Element 3 is pushed next $\rightarrow$ \`[Elem3, Elem2, Elem1]\`

Your accumulator ends up in **reverse order (LIFO - Last In, First Out)**!

### 3. The $O(N^2)$ Disaster: Never Append with \`++\`
Beginners often attempt to keep elements in order by appending to the end of the accumulator:
\`\`\`erlang
%% DISASTROUS ANTI-PATTERN: DO NOT DO THIS!
filter_bad([Head | Tail], Acc) ->
    filter_bad(Tail, Acc ++ [Head]).
\`\`\`
In Erlang, \`Acc ++ [Head]\` must copy the entire left list \`Acc\` on every single iteration!
For a list of 10,000 items, appending copies $50,000,000$ elements, bringing your server to a grinding halt with $O(N^2)$ complexity.

### 4. The Idiomatic Erlang Solution: Prepend in $O(1)$, Reverse at Base Case
The standard Erlang technique used in 100% of production codebases is:
1. Prepend items to \`Acc\` in constant time: \`[Item | Acc]\`.
2. At the base case (\`[]\`), call the C-implemented BIF \`lists:reverse(Acc)\`.

\`\`\`erlang
keep_evens(List) ->
    keep_evens(List, []).

keep_evens([], Acc) ->
    lists:reverse(Acc);   %% Reverses once in O(N) using fast C BIF
keep_evens([Head | Tail], Acc) when Head rem 2 =:= 0 ->
    keep_evens(Tail, [Head | Acc]);
keep_evens([_ | Tail], Acc) ->
    keep_evens(Tail, Acc).
\`\`\`

This guarantees strict $O(N)$ total execution time and minimal memory churn.

> [!warning] Common Beginner Syntax Trap: Forgetting lists:reverse
> If your function passes tests for item presence but fails ordering checks (e.g. returning \`[4, 1]\` instead of \`[1, 4]\`), you forgot to call \`lists:reverse(Acc)\` in the base case clause!

## Parallel Worked Example

Filtering and formatting critical incidents from gateway event logs:

\`\`\`erlang
-module(gateway_inspector).
-export([format_critical_alerts/1]).

format_critical_alerts(Events) ->
    alert_loop(Events, []).

alert_loop([], Acc) ->
    lists:reverse(Acc);
alert_loop([{event, Service, critical, Details} | Rest], Acc) ->
    AlertNotice = {critical_alert, Service, Details},
    alert_loop(Rest, [AlertNotice | Acc]);
alert_loop([{event, _Service, _Priority, _Details} | Rest], Acc) ->
    alert_loop(Rest, Acc).
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% OTP stdlib: lists:reverse/1
lists:reverse(List1) -> List2
  Types:
    List1 = List2 = [T]
\`\`\`
> \`lists:reverse/1\` is implemented as a direct C primitive inside the ERTS emulator. It is extraordinarily fast.

## Assignment Specification

Implement order filtering in \`acc_filter.erl\` to process incoming customer order batches:

### \`keep_valid_orders/1\`
- **Input**: \`Orders\` — A list of zero or more 4-element tuples of the format \`{order, Id, Qty, Status}\`, where \`Id\` is an integer, \`Qty\` is an integer count, and \`Status\` is an atom (such as \`confirmed\` or \`pending\`).
- **Behavior**: Filters the list and extracts the \`Id\` values of all orders that meet two criteria:
  1. The quantity \`Qty\` is strictly greater than \`0\`.
  2. The status \`Status\` is equal to the atom \`confirmed\`.
  The returned list must preserve the exact relative order of the original input. The solution must execute in linear $O(N)$ time using the tail-recursive accumulator pattern with \`lists:reverse/1\` invoked at the base case. Returns \`[]\` if no matching orders exist or the input list is empty.
- **Examples**:
  - \`acc_filter:keep_valid_orders([{order, 1, 5, confirmed}, {order, 2, 0, confirmed}, {order, 3, 10, pending}, {order, 4, 8, confirmed}])\` returns \`[1, 4]\`.
  - \`acc_filter:keep_valid_orders([{order, 5, 0, confirmed}, {order, 6, 12, canceled}])\` returns \`[]\`.
  - \`acc_filter:keep_valid_orders([])\` returns \`[]\`.

## Rules & Verification Constraints

- Must be tail-recursive (enforced by \`bf_ast_verifier\`).
- Must call \`lists:reverse/1\` in the base case.
- Do not use \`lists:filter/2\` or \`lists:map/2\`.`,
    otpDocCards: [
      {
        functionName: 'reverse',
        module: 'lists',
        signature: 'lists:reverse(List1) -> List2',
        typesSpec: ['List1 = List2 = [term()]'],
        description: 'Reverses the order of elements in List1.',
        complexityNote: 'Executed as a native C BIF in O(N) time with zero Erlang reduction overhead.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#reverse/1',
      },
    ],
    mentalModelCheck: {
      question: 'Why is prepending with [Item | Acc] and reversing once with lists:reverse(Acc) vastly superior to Acc ++ [Item]?',
      options: [
        {
          id: 'A',
          label: 'Acc ++ [Item] copies the accumulator on every step resulting in O(N^2) time, while prepend + reverse is strictly O(N)',
          isCorrect: true,
          explanation: 'In singly-linked lists, appending requires walking and copying the entire left list. Prepending takes 1 pointer allocation.',
        },
        {
          id: 'B',
          label: 'The ++ operator only supports lists of strings and fails on integers',
          isCorrect: false,
          explanation: 'The ++ operator works on any Erlang list, but exhibits quadratic performance in loops.',
        },
        {
          id: 'C',
          label: 'The BEAM VM garbage collector cannot free memory used by the ++ operator',
          isCorrect: false,
          explanation: 'Both operators use standard garbage collected heap memory.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch02-06-a',
        title: 'Filter Valid Confirmed Order IDs',
        erlangCall: 'acc_filter:keep_valid_orders([{order, 1, 5, confirmed}, {order, 2, 0, confirmed}, {order, 3, 10, pending}, {order, 4, 8, confirmed}])',
        expectedOutput: '[1, 4]',
        explanation: 'Extracts IDs 1 and 4 in original order, ignoring zero-qty and pending orders.',
      },
    ],
    astRules: {
      requireTailRecursion: ['keep_valid_orders/1'],
      requiredCalls: ['lists:reverse/1'],
      forbiddenCalls: ['lists:filter/2', 'lists:map/2'],
    },
    solutionExplanation: 'Demonstrates tail-recursive list accumulation using [Item | Acc] and base-case lists:reverse/1 order preservation.',
    files: [
      {
        name: 'acc_filter.erl',
        path: 'src/acc_filter.erl',
        content: `-module(acc_filter).
-export([keep_valid_orders/1]).

%% @doc Filter confirmed orders with quantity greater than zero and extract their IDs.
keep_valid_orders(Orders) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/acc_filter.erl': `-module(acc_filter).
-export([keep_valid_orders/1]).

keep_valid_orders(Orders) ->
    keep_valid_orders(Orders, []).

keep_valid_orders([], Acc) ->
    lists:reverse(Acc);
keep_valid_orders([{order, Id, Qty, confirmed} | Rest], Acc) when Qty > 0 ->
    keep_valid_orders(Rest, [Id | Acc]);
keep_valid_orders([_InvalidOrder | Rest], Acc) ->
    keep_valid_orders(Rest, Acc).`,
    },
    starterCode: `-module(acc_filter).
-export([keep_valid_orders/1]).

%% @doc Filter confirmed orders with quantity greater than zero and extract their IDs.
keep_valid_orders(Orders) ->
    ok.`,
    solutionCode: `-module(acc_filter).
-export([keep_valid_orders/1]).

keep_valid_orders(Orders) ->
    keep_valid_orders(Orders, []).

keep_valid_orders([], Acc) ->
    lists:reverse(Acc);
keep_valid_orders([{order, Id, Qty, confirmed} | Rest], Acc) when Qty > 0 ->
    keep_valid_orders(Rest, [Id | Acc]);
keep_valid_orders([_InvalidOrder | Rest], Acc) ->
    keep_valid_orders(Rest, Acc).`,
  },

  // ── Lesson 2.7: Updating Tuples in Lists & Dual Accumulators ──────────────
  {
    id: 'ch02-l07',
    chapterNumber: 2,
    lessonNumber: 7,
    lessonType: 'concept_exercise',
    title: 'Thinking Recursively (Part 2): Updating a Tuple in a List & Dual Accumulators',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In real-world backend applications, you rarely just read or filter lists: you need to **update records inside an immutable dataset**.

In the upcoming Chapter 2 Capstone Problem Set (\`inventory.erl\` in Lesson 2.8), an incoming customer order requires you to find a specific product inside an inventory list and deduct purchased units from stock, while leaving all other products in their exact relative positions.

Because Erlang data structures are 100% immutable, you cannot do \`product.stock -= qty\`.
Instead, you must master the **Tail-Recursive List Update Pattern**.

## Deep Concept Breakdown & Under the Hood

### 1. The Tail-Recursive List Update Pattern
To "modify" a record in an immutable list:
1. Walk the list item by item.
2. If the current item does **not** match the target, accumulate it unchanged: \`[CurrentItem | Acc]\`.
3. When you find the target item, construct the **updated tuple** and push it onto the accumulator: \`[UpdatedItem | Acc]\`.
4. Continue traversing the rest of the list so subsequent items are preserved.
5. At the base case (\`[]\`), call \`lists:reverse(Acc)\` to restore original list order.

\`\`\`erlang
update_entry([], _TargetKey, _NewVal, Acc) ->
    lists:reverse(Acc);
update_entry([{item, Key, Label, _OldVal} | Rest], TargetKey, NewVal, Acc)
  when Key =:= TargetKey ->
    UpdatedItem = {item, Key, Label, NewVal},
    update_entry(Rest, TargetKey, NewVal, [UpdatedItem | Acc]);
update_entry([OtherItem | Rest], TargetKey, NewVal, Acc) ->
    update_entry(Rest, TargetKey, NewVal, [OtherItem | Acc]).
\`\`\`

### 2. Dual-Accumulator Partitioning
Sometimes a function needs to produce **two separate lists** from a single stream of inputs (e.g. separating valid orders from invalid orders, or successful payments from failed payments).

Instead of traversing the list twice (which would be $2 \\times O(N)$), Erlang functions pass **two accumulators simultaneously**:

\`\`\`erlang
partition_stream(List) ->
    partition_stream(List, [], []).

partition_stream([], PassAcc, FailAcc) ->
    {lists:reverse(PassAcc), lists:reverse(FailAcc)};
partition_stream([{event, Id, ok} | Rest], PassAcc, FailAcc) ->
    partition_stream(Rest, [Id | PassAcc], FailAcc);
partition_stream([{event, Id, error} | Rest], PassAcc, FailAcc) ->
    partition_stream(Rest, PassAcc, [Id | FailAcc]).
\`\`\`

In a single, cache-friendly tail-recursive pass, both output lists are populated and reversed in constant stack memory.

> [!warning] Common Beginner Syntax Trap: Halting Immediately on Update
> A common beginner mistake is stopping the recursion as soon as the updated item is found (e.g. \`return [Updated | Rest]\`).
> If you do this without accounting for the items already accumulated in \`Acc\`, all previous elements of your inventory list will be lost! Always carry the tail through to the base case.

## Parallel Worked Example

Managing telecommunications SIP trunks and load-balancing traffic:

\`\`\`erlang
-module(sip_trunk_manager).
-export([adjust_trunk_codec/3, split_by_utilization/2]).

adjust_trunk_codec(Trunks, TargetId, NewCodec) ->
    adjust_loop(Trunks, TargetId, NewCodec, []).

adjust_loop([], _TargetId, _NewCodec, Acc) ->
    lists:reverse(Acc);
adjust_loop([{trunk, Id, Host, Port, _OldCodec, MaxChannels} | Rest], TargetId, NewCodec, Acc)
  when Id =:= TargetId ->
    Updated = {trunk, Id, Host, Port, NewCodec, MaxChannels},
    adjust_loop(Rest, TargetId, NewCodec, [Updated | Acc]);
adjust_loop([OtherTrunk | Rest], TargetId, NewCodec, Acc) ->
    adjust_loop(Rest, TargetId, NewCodec, [OtherTrunk | Acc]).

split_by_utilization(TrunkLoads, Threshold) ->
    split_loop(TrunkLoads, Threshold, [], []).

split_loop([], _Threshold, HighAcc, NormalAcc) ->
    {lists:reverse(HighAcc), lists:reverse(NormalAcc)};
split_loop([{load, _Id, ActiveCalls} = Load | Rest], Threshold, HighAcc, NormalAcc)
  when ActiveCalls > Threshold ->
    split_loop(Rest, Threshold, [Load | HighAcc], NormalAcc);
split_loop([Load | Rest], Threshold, HighAcc, NormalAcc) ->
    split_loop(Rest, Threshold, HighAcc, [Load | NormalAcc]).
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Multi-Accumulator Signature Pattern:
Process(List, AccA, AccB) ->
    case List of
        [] -> {lists:reverse(AccA), lists:reverse(AccB)};
        [H | T] when Condition(H) -> Process(T, [H | AccA], AccB);
        [H | T] -> Process(T, AccA, [H | AccB])
    end.
\`\`\`

## Assignment Specification

Implement tail-recursive immutable list manipulation functions in \`tuple_updater.erl\`:

### \`update_product_price/3\`
- **Input**:
  - \`Inventory\` — A list of zero or more product tuples of the form \`{product, Id, Name, Price, Stock}\`, where \`Id\` is an integer, \`Name\` is a string, and \`Price\` and \`Stock\` are numbers.
  - \`TargetId\` — An integer representing the unique product identifier to update.
  - \`NewPrice\` — A number representing the replacement price.
- **Behavior**: Traverses the inventory list and replaces the price of the product whose identifier matches \`TargetId\` with \`NewPrice\`, retaining all other tuple fields (\`Id\`, \`Name\`, and \`Stock\`) and preserving the exact relative position of all products. If \`TargetId\` is not found, the original inventory list is returned unchanged. Must be strictly tail-recursive using an auxiliary accumulator and \`lists:reverse/1\` at the base case.
- **Examples**:
  - \`tuple_updater:update_product_price([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}], 2, 30)\` returns \`[{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 30, 5}]\`.
  - \`tuple_updater:update_product_price([{product, 1, "Keyboard", 50, 10}], 99, 100)\` returns \`[{product, 1, "Keyboard", 50, 10}]\`.
  - \`tuple_updater:update_product_price([], 1, 10)\` returns \`[]\`.

### \`partition_orders/2\`
- **Input**:
  - \`Orders\` — A list of zero or more 3-element tuples of the form \`{order, Id, Qty}\`, where \`Id\` is an integer and \`Qty\` is an integer order quantity.
  - \`MinQty\` — An integer specifying the minimum threshold for valid orders.
- **Behavior**: Partitions the orders into a 2-tuple of lists \`{ValidOrders, RejectedOrders}\` in a single tail-recursive pass using dual accumulators. An order is valid if its quantity \`Qty\` is greater than or equal to \`MinQty\`; otherwise it is rejected. Both resulting lists must preserve the exact relative order of elements from the input. Returns \`{lists:reverse(ValidAcc), lists:reverse(RejectedAcc)}\` at the base case.
- **Examples**:
  - \`tuple_updater:partition_orders([{order, 1, 10}, {order, 2, 2}, {order, 3, 5}, {order, 4, 1}], 5)\` returns \`{[{order, 1, 10}, {order, 3, 5}], [{order, 2, 2}, {order, 4, 1}]}\`.
  - \`tuple_updater:partition_orders([], 5)\` returns \`{[], []}\`.

## Rules & Verification Constraints

- Must be tail-recursive (enforced by \`bf_ast_verifier\`).
- Must call \`lists:reverse/1\` on accumulators.
- Do not use \`lists:partition/2\` or \`lists:keyreplace/4\`.`,
    otpDocCards: [
      {
        functionName: 'partition_pattern',
        module: 'lists',
        signature: 'partition(Pred, List) -> {Satisfying, NotSatisfying}',
        typesSpec: ['Pred = fun((term()) -> boolean())', 'List = [term()]'],
        description: 'Single-pass dual-accumulator partitioning.',
        complexityNote: 'Processes stream in O(N) time with minimal heap garbage.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#partition/2',
      },
    ],
    mentalModelCheck: {
      question: 'When updating a single tuple in an immutable list using tail recursion, why must you continue recursing on Rest after finding the match?',
      options: [
        {
          id: 'A',
          label: 'To accumulate the remaining elements of the list so they are preserved in the final reversed list',
          isCorrect: true,
          explanation: 'Stopping immediately would drop all elements that appeared after the target item in the original list.',
        },
        {
          id: 'B',
          label: 'Because the BEAM bytecode verifier requires every function to process at least 1,000 items',
          isCorrect: false,
          explanation: 'Erlang has no arbitrary item threshold; lists of any length are supported.',
        },
        {
          id: 'C',
          label: 'To check if the target identifier exists multiple times in the global atom table',
          isCorrect: false,
          explanation: 'Product IDs are integers, not atoms.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch02-07-a',
        title: 'Update Product Price in Inventory',
        erlangCall: 'tuple_updater:update_product_price([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}], 2, 30)',
        expectedOutput: '[{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 30, 5}]',
        explanation: 'Updates mouse price to 30 while keeping keyboard intact and in position.',
      },
      {
        id: 'tc-ch02-07-b',
        title: 'Non-Existent Product Price Unchanged',
        erlangCall: 'tuple_updater:update_product_price([{product, 1, "Keyboard", 50, 10}], 99, 100)',
        expectedOutput: '[{product, 1, "Keyboard", 50, 10}]',
        explanation: 'TargetId 99 not found; returns original inventory intact.',
      },
      {
        id: 'tc-ch02-07-c',
        title: 'Dual-Accumulator Order Partitioning',
        erlangCall: 'tuple_updater:partition_orders([{order, 1, 10}, {order, 2, 2}, {order, 3, 5}, {order, 4, 1}], 5)',
        expectedOutput: '{[{order, 1, 10}, {order, 3, 5}], [{order, 2, 2}, {order, 4, 1}]}',
        explanation: 'Splits orders into Valid (Qty >= 5) and Rejected (Qty < 5) preserving order.',
      },
    ],
    astRules: {
      requireTailRecursion: ['update_product_price/3', 'partition_orders/2'],
      requiredCalls: ['lists:reverse/1'],
      forbiddenCalls: ['lists:partition/2', 'lists:keyreplace/4'],
    },
    solutionExplanation: 'Implements tail-recursive list updates and dual-accumulator partitioning with O(1) stack space.',
    files: [
      {
        name: 'tuple_updater.erl',
        path: 'src/tuple_updater.erl',
        content: `-module(tuple_updater).
-export([update_product_price/3, partition_orders/2]).

%% @doc Update the price of a matching product in inventory while preserving order.
update_product_price(Inventory, TargetId, NewPrice) ->
    ok.

%% @doc Partition orders into valid and rejected lists based on minimum quantity.
partition_orders(Orders, MinQty) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/tuple_updater.erl': `-module(tuple_updater).
-export([update_product_price/3, partition_orders/2]).

update_product_price(Inventory, TargetId, NewPrice) ->
    update_product_price(Inventory, TargetId, NewPrice, []).

update_product_price([], _TargetId, _NewPrice, Acc) ->
    lists:reverse(Acc);
update_product_price([{product, Id, Name, _OldPrice, Stock} | Rest], TargetId, NewPrice, Acc)
  when Id =:= TargetId ->
    Updated = {product, Id, Name, NewPrice, Stock},
    update_product_price(Rest, TargetId, NewPrice, [Updated | Acc]);
update_product_price([OtherProd | Rest], TargetId, NewPrice, Acc) ->
    update_product_price(Rest, TargetId, NewPrice, [OtherProd | Acc]).

partition_orders(Orders, MinQty) ->
    partition_orders(Orders, MinQty, [], []).

partition_orders([], _MinQty, ValidAcc, RejAcc) ->
    {lists:reverse(ValidAcc), lists:reverse(RejAcc)};
partition_orders([{order, _Id, Qty} = O | Rest], MinQty, ValidAcc, RejAcc)
  when Qty >= MinQty ->
    partition_orders(Rest, MinQty, [O | ValidAcc], RejAcc);
partition_orders([O | Rest], MinQty, ValidAcc, RejAcc) ->
    partition_orders(Rest, MinQty, ValidAcc, [O | RejAcc]).`,
    },
    starterCode: `-module(tuple_updater).
-export([update_product_price/3, partition_orders/2]).

%% @doc Update the price of a matching product in inventory while preserving order.
update_product_price(Inventory, TargetId, NewPrice) ->
    ok.

%% @doc Partition orders into valid and rejected lists based on minimum quantity.
partition_orders(Orders, MinQty) ->
    ok.`,
    solutionCode: `-module(tuple_updater).
-export([update_product_price/3, partition_orders/2]).

update_product_price(Inventory, TargetId, NewPrice) ->
    update_product_price(Inventory, TargetId, NewPrice, []).

update_product_price([], _TargetId, _NewPrice, Acc) ->
    lists:reverse(Acc);
update_product_price([{product, Id, Name, _OldPrice, Stock} | Rest], TargetId, NewPrice, Acc)
  when Id =:= TargetId ->
    Updated = {product, Id, Name, NewPrice, Stock},
    update_product_price(Rest, TargetId, NewPrice, [Updated | Acc]);
update_product_price([OtherProd | Rest], TargetId, NewPrice, Acc) ->
    update_product_price(Rest, TargetId, NewPrice, [OtherProd | Acc]).

partition_orders(Orders, MinQty) ->
    partition_orders(Orders, MinQty, [], []).

partition_orders([], _MinQty, ValidAcc, RejAcc) ->
    {lists:reverse(ValidAcc), lists:reverse(RejAcc)};
partition_orders([{order, _Id, Qty} = O | Rest], MinQty, ValidAcc, RejAcc)
  when Qty >= MinQty ->
    partition_orders(Rest, MinQty, [O | ValidAcc], RejAcc);
partition_orders([O | Rest], MinQty, ValidAcc, RejAcc) ->
    partition_orders(Rest, MinQty, ValidAcc, [O | RejAcc]).`,
  },

  // ── Lesson 2.8: Chapter 2 Problem Set: Inventory Order Processor ───────────
  {
    id: 'ch02-l08',
    chapterNumber: 2,
    lessonNumber: 8,
    lessonType: 'problem_set',
    title: 'Problem Set: Real-World Inventory Order Processor',
    difficulty: 'Intermediate',
    xpReward: 250,
    conceptMarkdown: `## Why This Matters in Production

In high-concurrency systems (such as high-frequency trading engines, e-commerce checkout backends, and logistics order dispatchers), multiple mutations must happen against complex nested datasets with **zero side effects**, **zero memory leaks**, and **guaranteed determinism**.

In Chapter 2, you have systematically built every piece needed for this capstone:
- **Lesson 2.1**: Deep pattern matching in function heads.
- **Lesson 2.2**: Guard clauses ensuring integers and stock availability.
- **Lesson 2.4**: Recursive lookup helpers (\`find_product/2\`).
- **Lesson 2.5**: Tail-call optimization with integer accumulators (\`sum/2\`).
- **Lesson 2.6**: The list accumulator pattern with \`lists:reverse/1\`.
- **Lesson 2.7**: Updating records in lists while preserving order.

Now, you will synthesize all of these concepts into a production-grade **Inventory Order Processor**.

## Deep Concept Breakdown & Under the Hood

### System Architecture
You will implement the \`inventory\` module managing an e-commerce catalog represented as a list of 5-tuples:
\`\`\`erlang
[{product, Id, Name, Price, Stock}, ...]
\`\`\`

Incoming orders arrive as a list of 2-tuples:
\`\`\`erlang
[{order, ProductId, Quantity}, ...]
\`\`\`

### The Outer-Inner Pipeline Architecture
To process a list of transactions against a state list immutably:
1. The **Outer Loop** steps through the incoming transactions one by one.
2. For each transaction, an **Inner Helper** performs an $O(1)$-stack tail-recursive search and update over the state dataset.
3. The newly transformed dataset is passed as the state argument into the next outer recursive step.

\`\`\`erlang
%% Generic Outer-Inner Batch Processor:
process_batch(StateList, []) ->
    StateList;
process_batch(StateList, [Transaction | Rest]) ->
    NewStateList = apply_transaction(StateList, Transaction),
    process_batch(NewStateList, Rest).
\`\`\`

## Parallel Worked Example

Managing mobile subscriber data quotas and billing in a telecom engine:

\`\`\`erlang
-module(quota_engine).
-export([deduct_usage/2, audit_billable_total/3, top_up_data/2]).

%% Deduct data usage for sessions if account has sufficient remaining MB:
deduct_usage(Accounts, Sessions) ->
    sessions_loop(Accounts, Sessions).

sessions_loop(Accounts, []) ->
    Accounts;
sessions_loop(Accounts, [{session, AccountId, ConsumedMb} | Rest]) ->
    NewAccounts = apply_session_deduction(Accounts, AccountId, ConsumedMb),
    sessions_loop(NewAccounts, Rest).

apply_session_deduction(Accounts, AccountId, ConsumedMb) ->
    case find_account(Accounts, AccountId) of
        {ok, {account, AccountId, _Plan, _Bal, RemMb}} when RemMb >= ConsumedMb ->
            update_data_balance(Accounts, AccountId, -ConsumedMb);
        _ ->
            Accounts
    end.

update_data_balance(Accounts, TargetId, DeltaMb) ->
    update_data_loop(Accounts, TargetId, DeltaMb, []).

update_data_loop([], _TargetId, _Delta, Acc) ->
    lists:reverse(Acc);
update_data_loop([{account, Id, Plan, Bal, RemMb} | Rest], TargetId, Delta, Acc)
  when Id =:= TargetId ->
    Updated = {account, Id, Plan, Bal, RemMb + Delta},
    update_data_loop(Rest, TargetId, Delta, [Updated | Acc]);
update_data_loop([Other | Rest], TargetId, Delta, Acc) ->
    update_data_loop(Rest, TargetId, Delta, [Other | Acc]).

%% Calculate total revenue from valid usage charges:
audit_billable_total(Accounts, Sessions, RatePerMb) ->
    audit_loop(Sessions, Accounts, RatePerMb, 0).

audit_loop([], _Accounts, _Rate, TotalAcc) ->
    TotalAcc;
audit_loop([{session, AccountId, ConsumedMb} | Rest], Accounts, Rate, TotalAcc) ->
    case find_account(Accounts, AccountId) of
        {ok, {account, AccountId, _Plan, _Bal, RemMb}} when RemMb >= ConsumedMb ->
            audit_loop(Rest, Accounts, Rate, TotalAcc + (ConsumedMb * Rate));
        _ ->
            audit_loop(Rest, Accounts, Rate, TotalAcc)
    end.

%% Top up data allowances:
top_up_data(Accounts, TopUps) ->
    top_up_loop(TopUps, Accounts).

top_up_loop([], Accounts) ->
    Accounts;
top_up_loop([{AccountId, AddedMb} | Rest], Accounts) ->
    NewAccounts = update_data_balance(Accounts, AccountId, AddedMb),
    top_up_loop(Rest, NewAccounts).

%% Lookup helper
find_account([], _TargetId) ->
    not_found;
find_account([{account, TargetId, _Plan, _Bal, _RemMb} = Acct | _Rest], TargetId) ->
    {ok, Acct};
find_account([_Other | Rest], TargetId) ->
    find_account(Rest, TargetId).
\`\`\`

## Assignment Specification

Implement the core order fulfillment engine in \`inventory.erl\`:

### \`process_order/2\`
- **Input**:
  - \`Inventory\` — A list of zero or more 5-element tuples: \`{product, Id, Name, Price, Stock}\`, where \`Id\` is an integer, \`Name\` is a string, and \`Price\` and \`Stock\` are non-negative integers.
  - \`Orders\` — A list of zero or more 3-element tuples: \`{order, ProductId, Quantity}\`, where \`ProductId\` and \`Quantity\` are positive integers.
- **Behavior**: Processes each order sequentially against the inventory:
  1. For each order \`{order, ProductId, Quantity}\`, locate the product matching \`ProductId\`.
  2. If the product exists and its available stock is greater than or equal to \`Quantity\`, deduct \`Quantity\` from its \`Stock\`.
  3. If the product does not exist, or if available stock is less than \`Quantity\`, the order cannot be fulfilled; skip it and leave that product's stock unchanged.
  4. Returns the updated inventory list with all products in their exact original relative order. Must be strictly tail-recursive executing in $O(1)$ stack space.
- **Examples**:
  - \`inventory:process_order([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}, {product, 3, "Monitor", 200, 2}], [{order, 1, 2}, {order, 2, 3}, {order, 3, 5}])\` returns \`[{product, 1, "Keyboard", 50, 8}, {product, 2, "Mouse", 25, 2}, {product, 3, "Monitor", 200, 2}]\`.
  - \`inventory:process_order([{product, 1, "Keyboard", 50, 10}], [])\` returns \`[{product, 1, "Keyboard", 50, 10}]\`.

### \`calculate_order_total/2\`
- **Input**:
  - \`Inventory\` — A list of \`{product, Id, Name, Price, Stock}\` tuples.
  - \`Orders\` — A list of \`{order, ProductId, Quantity}\` tuples.
- **Behavior**: Traverses the orders and calculates the total purchase price for all fulfillable orders. An order is fulfillable if the product exists in inventory and its available stock is greater than or equal to \`Quantity\`. Each fulfillable order contributes \`Price * Quantity\` to the total. Unfulfillable orders contribute \`0\`. Returns the accumulated integer sum using a tail-recursive accumulator running in $O(1)$ stack space. Returns \`0\` if orders are empty or no orders can be fulfilled.
- **Examples**:
  - \`inventory:calculate_order_total([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}, {product, 3, "Monitor", 200, 2}], [{order, 1, 2}, {order, 2, 3}, {order, 3, 5}])\` returns \`175\`.
  - \`inventory:calculate_order_total([], [{order, 1, 5}])\` returns \`0\`.

### \`restock/2\`
- **Input**:
  - \`Inventory\` — A list of \`{product, Id, Name, Price, Stock}\` tuples.
  - \`Restocks\` — A list of zero or more 2-element tuples: \`{ProductId, AddQuantity}\`, where \`ProductId\` is an integer and \`AddQuantity\` is a non-negative integer.
- **Behavior**: Iterates through the restock list and increments the stock of each matching product by \`AddQuantity\`. Products not mentioned in \`Restocks\` remain unchanged. Returns the updated inventory list with product order strictly preserved. Must be tail-recursive in $O(1)$ stack space.
- **Examples**:
  - \`inventory:restock([{product, 1, "Keyboard", 50, 8}, {product, 2, "Mouse", 25, 2}, {product, 3, "Monitor", 200, 2}], [{1, 5}, {2, 10}])\` returns \`[{product, 1, "Keyboard", 50, 13}, {product, 2, "Mouse", 25, 12}, {product, 3, "Monitor", 200, 2}]\`.
  - \`inventory:restock([{product, 1, "Keyboard", 50, 8}], [])\` returns \`[{product, 1, "Keyboard", 50, 8}]\`.

## Rules & Verification Constraints

- **Strict Tail Recursion Required**: \`process_order/2\`, \`calculate_order_total/2\`, and \`restock/2\` and all recursive helpers must run in $O(1)$ stack space (enforced by \`bf_ast_verifier\` and \`beam_disasm\`).
- **Forbidden Built-Ins**: Do NOT use \`lists:sum/1\`, \`lists:map/2\`, \`lists:foldl/3\`, \`lists:filter/2\`, or \`lists:foldr/3\`. (Higher-order functions are taught in Chapter 3).
- **Forbidden Constructs**: List comprehensions (\`[X || ...]\`) are forbidden.
- Order of products in \`Inventory\` must be strictly preserved across all operations.`,
    visualScene: 'tco_vs_body_stack',
    otpDocCards: [
      {
        functionName: 'pure_recursion_composition',
        module: 'erlang',
        signature: 'Loop(Data, Acc) -> Result.',
        typesSpec: ['Data = [term()]', 'Acc = term()'],
        description: 'Multi-list tail-recursive state progression.',
        complexityNote: 'Zero-copy garbage collection with bounded O(1) process stack.',
        officialUrl: 'https://www.erlang.org/doc/efficiency_guide/processes.html',
      },
    ],
    mentalModelCheck: {
      question: 'Why does calculate_order_total/2 return 175 for orders [{order, 1, 2}, {order, 2, 3}, {order, 3, 5}] against products P1($50, stock 10), P2($25, stock 5), and P3($200, stock 2)?',
      options: [
        {
          id: 'A',
          label: 'P1 is fulfilled (2 * 50 = 100), P2 is fulfilled (3 * 25 = 75), but P3 requires 5 when stock is only 2, so P3 is unfulfilled (0), giving 100 + 75 + 0 = 175',
          isCorrect: true,
          explanation: 'Unfulfillable orders contribute 0 to the total order value without halting execution.',
        },
        {
          id: 'B',
          label: 'Because the function applies a 10% volume discount across all orders',
          isCorrect: false,
          explanation: 'There are no volume discounts; prices are evaluated directly from inventory.',
        },
        {
          id: 'C',
          label: 'P3 raises a badarith exception that is caught by a supervisor',
          isCorrect: false,
          explanation: 'Stock insufficiency is handled purely with pattern matching and guard clauses.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch02-08-a',
        title: 'Process Multiple Orders with Partial Fulfillment',
        erlangCall: 'inventory:process_order([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}, {product, 3, "Monitor", 200, 2}], [{order, 1, 2}, {order, 2, 3}, {order, 3, 5}])',
        expectedOutput: '[{product, 1, "Keyboard", 50, 8}, {product, 2, "Mouse", 25, 2}, {product, 3, "Monitor", 200, 2}]',
        explanation: 'Deducts 2 from P1 and 3 from P2. P3 requested 5 but only 2 in stock, so P3 remains unchanged.',
      },
      {
        id: 'tc-ch02-08-b',
        title: 'Calculate Order Total with Fulfilled Items',
        erlangCall: 'inventory:calculate_order_total([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}, {product, 3, "Monitor", 200, 2}], [{order, 1, 2}, {order, 2, 3}, {order, 3, 5}])',
        expectedOutput: '175',
        explanation: '(2 * 50) + (3 * 25) = 100 + 75 = 175. P3 is unfulfillable so adds 0.',
      },
      {
        id: 'tc-ch02-08-c',
        title: 'Restock Products in Inventory',
        erlangCall: 'inventory:restock([{product, 1, "Keyboard", 50, 8}, {product, 2, "Mouse", 25, 2}, {product, 3, "Monitor", 200, 2}], [{1, 5}, {2, 10}])',
        expectedOutput: '[{product, 1, "Keyboard", 50, 13}, {product, 2, "Mouse", 25, 12}, {product, 3, "Monitor", 200, 2}]',
        explanation: 'Adds 5 to P1 stock (8 + 5 = 13) and 10 to P2 stock (2 + 10 = 12). P3 remains 2.',
      },
    ],
    astRules: {
      requireTailRecursion: ['process_order/2', 'calculate_order_total/2', 'restock/2'],
      forbiddenCalls: ['lists:sum', 'lists:map', 'lists:foldl', 'lists:filter', 'lists:foldr'],
      forbiddenConstructs: ['list_comprehension'],
    },
    solutionExplanation: 'Implements full multi-list tail-recursive order fulfillment, total price calculation, and inventory restocking with strict TCO and O(1) stack space.',
    files: [
      {
        name: 'inventory.erl',
        path: 'src/inventory.erl',
        content: `-module(inventory).
-export([process_order/2, calculate_order_total/2, restock/2]).

%% @doc Process orders against inventory, deducting stock only when sufficient inventory exists.
process_order(Inventory, Orders) ->
    ok.

%% @doc Calculate total cost of fulfilled orders. Unfulfillable orders contribute 0.
calculate_order_total(Inventory, Orders) ->
    0.

%% @doc Restock inventory items from [{ProductId, RestockQty}, ...].
restock(Inventory, Restocks) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/inventory.erl': `-module(inventory).
-export([process_order/2, calculate_order_total/2, restock/2]).

%% ── process_order/2 ───────────────────────────────────────────────────────
process_order(Inventory, Orders) ->
    process_orders_loop(Inventory, Orders).

process_orders_loop(Inventory, []) ->
    Inventory;
process_orders_loop(Inventory, [{order, ProdId, Qty} | RestOrders]) ->
    NewInv = deduct_stock_if_available(Inventory, ProdId, Qty),
    process_orders_loop(NewInv, RestOrders).

deduct_stock_if_available(Inventory, ProdId, Qty) ->
    case find_product(Inventory, ProdId) of
        {ok, {product, ProdId, _Name, _Price, Stock}} when Stock >= Qty ->
            update_stock(Inventory, ProdId, -Qty);
        _ ->
            Inventory
    end.

update_stock(Inventory, TargetId, DeltaQty) ->
    update_stock_loop(Inventory, TargetId, DeltaQty, []).

update_stock_loop([], _TargetId, _Delta, Acc) ->
    lists:reverse(Acc);
update_stock_loop([{product, Id, Name, Price, Stock} | Rest], TargetId, Delta, Acc)
  when Id =:= TargetId ->
    Updated = {product, Id, Name, Price, Stock + Delta},
    update_stock_loop(Rest, TargetId, Delta, [Updated | Acc]);
update_stock_loop([Other | Rest], TargetId, Delta, Acc) ->
    update_stock_loop(Rest, TargetId, Delta, [Other | Acc]).

%% ── calculate_order_total/2 ───────────────────────────────────────────────
calculate_order_total(Inventory, Orders) ->
    calc_total_loop(Orders, Inventory, 0).

calc_total_loop([], _Inventory, Acc) ->
    Acc;
calc_total_loop([{order, ProdId, Qty} | RestOrders], Inventory, Acc) ->
    case find_product(Inventory, ProdId) of
        {ok, {product, ProdId, _Name, Price, Stock}} when Stock >= Qty ->
            calc_total_loop(RestOrders, Inventory, Acc + (Price * Qty));
        _ ->
            calc_total_loop(RestOrders, Inventory, Acc)
    end.

%% ── restock/2 ─────────────────────────────────────────────────────────────
restock(Inventory, Restocks) ->
    restock_loop(Restocks, Inventory).

restock_loop([], Inventory) ->
    Inventory;
restock_loop([{ProdId, AddQty} | Rest], Inventory) ->
    NewInv = update_stock(Inventory, ProdId, AddQty),
    restock_loop(Rest, NewInv).

%% ── Helper: find_product/2 ────────────────────────────────────────────────
find_product([], _TargetId) ->
    not_found;
find_product([{product, TargetId, _Name, _Price, _Stock} = Prod | _Rest], TargetId) ->
    {ok, Prod};
find_product([_Other | Rest], TargetId) ->
    find_product(Rest, TargetId).`,
    },
    starterCode: `-module(inventory).
-export([process_order/2, calculate_order_total/2, restock/2]).

%% @doc Process orders against inventory, deducting stock only when sufficient inventory exists.
process_order(Inventory, Orders) ->
    ok.

%% @doc Calculate total cost of fulfilled orders. Unfulfillable orders contribute 0.
calculate_order_total(Inventory, Orders) ->
    0.

%% @doc Restock inventory items from [{ProductId, RestockQty}, ...].
restock(Inventory, Restocks) ->
    ok.`,
    solutionCode: `-module(inventory).
-export([process_order/2, calculate_order_total/2, restock/2]).

%% ── process_order/2 ───────────────────────────────────────────────────────
process_order(Inventory, Orders) ->
    process_orders_loop(Inventory, Orders).

process_orders_loop(Inventory, []) ->
    Inventory;
process_orders_loop(Inventory, [{order, ProdId, Qty} | RestOrders]) ->
    NewInv = deduct_stock_if_available(Inventory, ProdId, Qty),
    process_orders_loop(NewInv, RestOrders).

deduct_stock_if_available(Inventory, ProdId, Qty) ->
    case find_product(Inventory, ProdId) of
        {ok, {product, ProdId, _Name, _Price, Stock}} when Stock >= Qty ->
            update_stock(Inventory, ProdId, -Qty);
        _ ->
            Inventory
    end.

update_stock(Inventory, TargetId, DeltaQty) ->
    update_stock_loop(Inventory, TargetId, DeltaQty, []).

update_stock_loop([], _TargetId, _Delta, Acc) ->
    lists:reverse(Acc);
update_stock_loop([{product, Id, Name, Price, Stock} | Rest], TargetId, Delta, Acc)
  when Id =:= TargetId ->
    Updated = {product, Id, Name, Price, Stock + Delta},
    update_stock_loop(Rest, TargetId, Delta, [Updated | Acc]);
update_stock_loop([Other | Rest], TargetId, Delta, Acc) ->
    update_stock_loop(Rest, TargetId, Delta, [Other | Acc]).

%% ── calculate_order_total/2 ───────────────────────────────────────────────
calculate_order_total(Inventory, Orders) ->
    calc_total_loop(Orders, Inventory, 0).

calc_total_loop([], _Inventory, Acc) ->
    Acc;
calc_total_loop([{order, ProdId, Qty} | RestOrders], Inventory, Acc) ->
    case find_product(Inventory, ProdId) of
        {ok, {product, ProdId, _Name, Price, Stock}} when Stock >= Qty ->
            calc_total_loop(RestOrders, Inventory, Acc + (Price * Qty));
        _ ->
            calc_total_loop(RestOrders, Inventory, Acc)
    end.

%% ── restock/2 ─────────────────────────────────────────────────────────────
restock(Inventory, Restocks) ->
    restock_loop(Restocks, Inventory).

restock_loop([], Inventory) ->
    Inventory;
restock_loop([{ProdId, AddQty} | Rest], Inventory) ->
    NewInv = update_stock(Inventory, ProdId, AddQty),
    restock_loop(Rest, NewInv).

%% ── Helper: find_product/2 ────────────────────────────────────────────────
find_product([], _TargetId) ->
    not_found;
find_product([{product, TargetId, _Name, _Price, _Stock} = Prod | _Rest], TargetId) ->
    {ok, Prod};
find_product([_Other | Rest], TargetId) ->
    find_product(Rest, TargetId).`,
  },
];

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
    conceptMarkdown: `## Why This Matters in Production

In distributed systems, telecommunication gateways, and message brokers, network frames arrive as deeply nested structures containing protocol wrappers, routing headers, transaction identifiers, and payload records.

In imperative languages like Go, Java, Python, or C++, unpacking deeply nested packets requires multiple lines of defensive \`if != nil\` pointer checks, object navigation (\`packet.Header.Route.Destination\`), and manual error handling. If a single field is null or of an unexpected type, the program panics or throws a null pointer exception.

In Erlang, the BEAM Virtual Machine deconstructs arbitrary nested data structures directly in the function clause head in a single, atomic operation. If the data structure matches the expected shape, the variables are bound instantly; if not, the clause is skipped and the next clause is evaluated.

## Deep Concept Breakdown & Under the Hood

### 1. Nested Pattern Matching in Function Heads
When an Erlang function is invoked, the BEAM VM uses specialized bytecode instructions (\`test_heap\`, \`get_tuple_element\`, \`is_eq_exact\`) to test the shape and contents of arguments before the function body ever executes:

\`\`\`erlang
%% Unpacking deeply nested tuples directly in the clause head:
handle_packet({packet, {header, 4, {route, From, To}}, Payload}) ->
    {ok, ipv4, From, To, Payload};
handle_packet({packet, {header, 6, {route, From, To}}, Payload}) ->
    {ok, ipv6, From, To, Payload}.
\`\`\`

If an incoming argument does not match any declared pattern, Erlang raises a \`function_clause\` runtime exception immediately. This prevents corrupted state from silently propagating deeper into your application.

### 2. Simultaneous Aliasing (\`Pattern = Variable\`) in Function Heads
Frequently in production, you need to inspect an inner field of a data structure, but you also need to forward or return the **entire original structure** unchanged.

A novice might destructure the fields and then rebuild the entire tuple from scratch in the return expression:

\`\`\`erlang
%% Inefficient: Reconstructs a brand-new tuple on the process heap:
forward_packet({packet, {header, 4, {route, _From, Dst}}, Payload}) ->
    NewPacket = {packet, {header, 4, {route, _From, Dst}}, Payload},
    {forwarded, Dst, NewPacket}.
\`\`\`

Erlang provides a powerful construct called **Pattern Aliasing** using the \`=\` operator directly inside the function signature:

\`\`\`erlang
%% Idiomatic: Binds the whole term to FullPacket with ZERO heap re-allocation!
forward_packet({packet, {header, 4, {route, _From, Dst}}, _Payload} = FullPacket) ->
    {forwarded, Dst, FullPacket}.
\`\`\`

Here, \`FullPacket\` is an alias for the entire outer tuple term, while \`Dst\` is simultaneously bound to the inner destination field.

> [!warning] Common Beginner Syntax Trap: Aliasing Direction
> In function heads, \`Pattern = Variable\` and \`Variable = Pattern\` are both valid syntax in Erlang.
> However, placing the descriptive pattern first (e.g. \`{packet, ...} = FullPacket\`) makes your function signatures significantly easier for teammates to read during code review.
> Remember: never use uppercase names for atom tags (\`Packet\` is a variable; \`packet\` is an atom).

## Parallel Worked Example

Consider a banking gateway inspecting financial transactions:

\`\`\`erlang
-module(tx_router).
-export([route_tx/1, archive_tx/1]).

%% Extract routing details from nested transaction envelope
route_tx({tx, {routing, 900, {account, Src, Dst}}, _Amount}) ->
    {ok, express_settlement, Src, Dst};
route_tx({tx, {routing, 100, {account, Src, Dst}}, _Amount}) ->
    {ok, standard_clearing, Src, Dst};
route_tx({tx, {routing, InvalidCode, _Accts}, _Amount}) ->
    {error, {unsupported_network, InvalidCode}};
route_tx(_) ->
    {error, malformed_transaction}.

%% Simultaneously match priority and retain the complete transaction term
archive_tx({tx, {routing, 900, _}, _} = HighPriorityTx) ->
    {archived_express, HighPriorityTx};
archive_tx(StandardTx) ->
    {archived_standard, StandardTx}.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Function Clause Pattern Syntax
FunctionName(Pattern1, Pattern2, ...) -> Body;
FunctionName(PatternN = FullVar, ...) -> Body.
\`\`\`
> Function clauses are evaluated strictly from top to bottom. Place specific patterns above generic catch-all wildcards (\`_\`).

## Assignment Specification

Implement two routing functions in \`deep_match.erl\`:

1. \`extract_route(Packet)\`:
   - Matches a 3-element tuple: \`{packet, {header, Version, {route, From, To}}, Payload}\`.
   - If \`Version =:= 4\`, returns \`{ok, ipv4, From, To}\`.
   - If \`Version =:= 6\`, returns \`{ok, ipv6, From, To}\`.
   - If \`Version\` is any other value, returns \`{error, {unsupported_version, Version}}\`.
   - If \`Packet\` does not match the packet envelope shape at all, returns \`{error, malformed_envelope}\`.

2. \`repackage_envelope(Packet)\`:
   - Uses function-head aliasing (\`= FullPacket\`) to match IPv4 packets: \`{packet, {header, 4, {route, _From, Dst}}, _Payload} = FullPacket\`.
   - Returns \`{forwarded, Dst, FullPacket}\`.
   - Any other input returns \`{dropped, Packet}\`.

## Rules & Verification Constraints

- Pattern match directly in the function clause parameters.
- Do not use BIFs like \`element/2\` to manually index into tuples.
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
        explanation: 'Deeply matches nested route tuple in header.',
      },
      {
        id: 'tc-ch02-01-b',
        title: 'Reject Unsupported Version',
        erlangCall: 'deep_match:extract_route({packet, {header, 5, {route, "10.0.0.1", "10.0.0.2"}}, []})',
        expectedOutput: '{error, {unsupported_version, 5}}',
        explanation: 'Version 5 triggers the version fallback clause.',
      },
      {
        id: 'tc-ch02-01-c',
        title: 'Forward IPv4 Envelope with Aliasing',
        erlangCall: 'deep_match:repackage_envelope({packet, {header, 4, {route, "src_host", "dst_host"}}, [data, 42]})',
        expectedOutput: '{forwarded, "dst_host", {packet, {header, 4, {route, "src_host", "dst_host"}}, [data, 42]}}',
        explanation: 'Simultaneously extracts destination and returns intact FullPacket.',
      },
    ],
    astRules: {
      forbiddenCalls: ['erlang:element/2'],
    },
    solutionExplanation: 'Uses nested tuple patterns directly in function heads with top-to-bottom clause ordering and pattern aliasing.',
    files: [
      {
        name: 'deep_match.erl',
        path: 'src/deep_match.erl',
        content: `-module(deep_match).
-export([extract_route/1, repackage_envelope/1]).

%% @doc Deconstructs a nested packet envelope into routing endpoints.
%% See lesson guide for the exact envelope tuple shape and return contracts.
extract_route(_Packet) ->
    %% % TODO: Implement multi-clause pattern matching across IPv4, IPv6,
    %% % unsupported versions, and malformed envelope shapes.
    ok.

%% @doc Forwards IPv4 packets using pattern aliasing (= FullPacket) to preserve the original term.
repackage_envelope(_Packet) ->
    %% % TODO: Use pattern aliasing in the function head to extract Dst from IPv4 packets
    %% % while retaining the unmodified envelope, or drop unrecognized packets.
    ok.`,
      },
    ],
    solutionFiles: {
      'src/deep_match.erl': `-module(deep_match).
-export([extract_route/1, repackage_envelope/1]).

extract_route({packet, {header, 4, {route, From, To}}, _Payload}) ->
    {ok, ipv4, From, To};
extract_route({packet, {header, 6, {route, From, To}}, _Payload}) ->
    {ok, ipv6, From, To};
extract_route({packet, {header, OtherVer, {route, _From, _To}}, _Payload}) ->
    {error, {unsupported_version, OtherVer}};
extract_route(_) ->
    {error, malformed_envelope}.

repackage_envelope({packet, {header, 4, {route, _From, Dst}}, _Payload} = FullPacket) ->
    {forwarded, Dst, FullPacket};
repackage_envelope(Packet) ->
    {dropped, Packet}.`,
    },
    starterCode: `-module(deep_match).
-export([extract_route/1, repackage_envelope/1]).

%% @doc Deconstructs a nested packet envelope into routing endpoints.
%% See lesson guide for the exact envelope tuple shape and return contracts.
extract_route(_Packet) ->
    %% % TODO: Implement multi-clause pattern matching across IPv4, IPv6,
    %% % unsupported versions, and malformed envelope shapes.
    ok.

%% @doc Forwards IPv4 packets using pattern aliasing (= FullPacket) to preserve the original term.
repackage_envelope(_Packet) ->
    %% % TODO: Use pattern aliasing in the function head to extract Dst from IPv4 packets
    %% % while retaining the unmodified envelope, or drop unrecognized packets.
    ok.`,
    solutionCode: `-module(deep_match).
-export([extract_route/1, repackage_envelope/1]).

extract_route({packet, {header, 4, {route, From, To}}, _Payload}) ->
    {ok, ipv4, From, To};
extract_route({packet, {header, 6, {route, From, To}}, _Payload}) ->
    {ok, ipv6, From, To};
extract_route({packet, {header, OtherVer, {route, _From, _To}}, _Payload}) ->
    {error, {unsupported_version, OtherVer}};
extract_route(_) ->
    {error, malformed_envelope}.

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
%% If Denom is 0, (Num / Denom) throws badarith, the guard fails silently,
%% and Erlang safely falls through to the next clause!
check_ratio(Num, Denom) when is_number(Num), is_number(Denom), (Num / Denom) >= 2.0 ->
    high_ratio;
check_ratio(_, _) ->
    not_high.
\`\`\`

> [!warning] Common Beginner Syntax Trap: Less-Than-Or-Equal (=<)
> Remember Chapter 1: in Erlang, less-than-or-equal is written as **\`=<\`**, NOT \`<=\`!
> Writing \`Port <= 65535\` will trigger a syntax compiler error. Always write \`Port =< 65535\`.

## Parallel Worked Example

Validating server health metrics and resource utilization:

\`\`\`erlang
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
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Guard Sequence Grammar
Clause(Args) when Guard1, Guard2 -> ...;      %% Comma = AND
Clause(Args) when Guard1; Guard2 -> ... .     %% Semicolon = OR
\`\`\`

## Assignment Specification

Implement three validation functions in \`guard_validator.erl\`:

1. \`validate_port(Port)\`:
   - If \`Port\` is an integer between \`1024\` and \`65535\` (inclusive), return \`{ok, unprivileged_port}\`.
   - If \`Port\` is an integer between \`1\` and \`1023\` (inclusive), return \`{ok, privileged_port}\`.
   - Otherwise, return \`{error, invalid_port}\`.

2. \`classify_temperature(TempC)\`:
   - If \`TempC\` is a number and \`TempC =< 0\`, return atom \`freezing\`.
   - If \`TempC\` is a number and \`TempC > 0\` AND \`TempC =< 25\`, return atom \`temperate\`.
   - If \`TempC\` is a number and \`TempC > 25\`, return atom \`hot\`.
   - For non-numeric input, return \`{error, invalid_temperature}\`.

3. \`safe_ratio(A, B)\`:
   - If \`A\` and \`B\` are numbers, \`B =/= 0\`, and \`(A / B) >= 2.0\`, return atom \`high_ratio\`.
   - If \`A\` and \`B\` are numbers, \`B =/= 0\`, and \`(A / B) < 2.0\`, return atom \`normal_ratio\`.
   - Fallback returns \`{error, invalid_ratio}\`.

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

%% @doc Check whether a port is privileged (1..1023) or unprivileged (1024..65535).
validate_port(_Port) ->
    %% Enforce integer bounds using when is_integer(Port), Port >= ..., Port =< ...
    ok.

%% @doc Classify temperature into freezing (<= 0), temperate (0..25), or hot (> 25).
classify_temperature(_TempC) ->
    %% Enforce numeric bounds using when is_number(TempC), TempC =< ...
    ok.

%% @doc Safely evaluate ratio without division-by-zero crashes.
safe_ratio(_A, _B) ->
    %% Guard against B =/= 0 and test (A / B) >= 2.0, or fall back to {error, invalid_ratio}.
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

%% @doc Check whether a port is privileged (1..1023) or unprivileged (1024..65535).
validate_port(_Port) ->
    %% Enforce integer bounds using when is_integer(Port), Port >= ..., Port =< ...
    ok.

%% @doc Classify temperature into freezing (<= 0), temperate (0..25), or hot (> 25).
classify_temperature(_TempC) ->
    %% Enforce numeric bounds using when is_number(TempC), TempC =< ...
    ok.

%% @doc Safely evaluate ratio without division-by-zero crashes.
safe_ratio(_A, _B) ->
    %% Guard against B =/= 0 and test (A / B) >= 2.0, or fall back to {error, invalid_ratio}.
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
    conceptMarkdown: `## Why This Matters in Production

While multi-clause function heads are the primary dispatch mechanism in Erlang, real-world systems frequently need to branch **in the middle of a function body** based on the result of an intermediate computation (such as calling a database, decoding a JSON envelope, or parsing an HTTP response).

In Erlang, inline branching is handled with \`case...of\` and \`if...end\`. Understanding the operational differences between them will prevent runtime \`if_clause\` crashes in production services.

## Deep Concept Breakdown & Under the Hood

### 1. \`case Expression of\` (The Workhorse of Erlang)
The \`case...of\` construct evaluates an arbitrary expression, and then pattern-matches the resulting value against one or more branches:

\`\`\`erlang
case http_client:get(Url) of
    {ok, 200, Body} ->
        {ok, process_body(Body)};
    {ok, 404, _} ->
        {error, not_found};
    {error, Reason} ->
        {error, {network_failure, Reason}}
end
\`\`\`

Clauses inside \`case...of\` support all features of function heads: nested pattern destructuring, guard clauses (\`when\`), and wildcard matching (\`_\`).

### 2. \`if...end\` (Pure Guard Evaluation)
Unlike \`if\` in languages like C, Java, or JavaScript, **Erlang's \`if\` statement does NOT evaluate truthy/falsy booleans**. It evaluates **Guard Expressions**!

\`\`\`erlang
grade_score(Score) ->
    if
        Score >= 90 -> 'A';
        Score >= 80 -> 'B';
        true -> 'F'   %% Mandatory catch-all!
    end.
\`\`\`

### 3. The Dreaded \`if_clause\` Runtime Crash
In Erlang, if none of the guard conditions in an \`if...end\` block evaluate to \`true\`, the BEAM VM crashes immediately with an \`{if_clause}\` runtime error!

To prevent this, Erlang programs using \`if\` must always include a final **\`true ->\` branch** as the fallback catch-all.

> [!warning] Common Beginner Syntax Trap: Why Erlang Pros Avoid if...end
> Because \`if...end\` can only evaluate guard BIFs (and not pattern matching or arbitrary expressions), and crashes if \`true ->\` is omitted, experienced Erlang engineers use \`case...of\` or multi-clause functions 95% of the time.

## Parallel Worked Example

Managing database transaction states:

\`\`\`erlang
-module(db_status).
-export([audit_response/1, classify_latency/1]).

audit_response(DbResult) ->
    case DbResult of
        {ok, rows, Rows} when length(Rows) > 0 ->
            {ok, {populated, Rows}};
        {ok, rows, []} ->
            {ok, empty_result};
        {error, timeout} ->
            {retry, transient_timeout};
        {error, Reason} ->
            {fatal, Reason};
        _ ->
            {error, invalid_db_response}
    end.

classify_latency(Ms) ->
    if
        Ms < 20 -> fast;
        Ms >= 20, Ms =< 100 -> standard;
        true -> slow
    end.
\`\`\`

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

1. \`handle_http_response(Response)\`:
   - Uses \`case Response of\` to inspect incoming 3-tuples: \`{http_response, StatusCode, Body}\`.
   - If \`StatusCode =:= 200\`, returns \`{ok, Body}\`.
   - If \`StatusCode =:= 401\` or \`StatusCode =:= 403\`, returns \`{error, unauthorized}\`.
   - If \`StatusCode >= 500\` and \`StatusCode =< 599\`, returns \`{error, server_error}\`.
   - Any other status code returns \`{error, {unexpected_status, StatusCode}}\`.
   - Any other malformed input returns \`{error, invalid_response}\`.

2. \`grade_latency(LatencyMs)\`:
   - Uses \`if...end\` to classify integer millisecond latency:
     - \`LatencyMs < 50\` -> returns atom \`optimal\`
     - \`LatencyMs >= 50\` and \`LatencyMs =< 200\` -> returns atom \`acceptable\`
     - \`true\` -> returns atom \`sla_breach\`

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

%% @doc Inspects HTTP response tuples using case...of branching.
%% See lesson guide for expected response codes and normalized return tuples.
handle_http_response(_Response) ->
    %% % TODO: Branch on the incoming HTTP response tuple using case...of.
    %% % Handle success (200), client errors (401/403), server error ranges (500-599),
    %% % unexpected status codes, and malformed responses.
    ok.

%% @doc Classifies network latency using an if...end expression.
%% See lesson guide for latency thresholds and return atoms.
grade_latency(_LatencyMs) ->
    %% % TODO: Evaluate latency thresholds using if...end guard expressions
    %% % with a mandatory true catch-all fallback.
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

%% @doc Inspects HTTP response tuples using case...of branching.
%% See lesson guide for expected response codes and normalized return tuples.
handle_http_response(_Response) ->
    %% % TODO: Branch on the incoming HTTP response tuple using case...of.
    %% % Handle success (200), client errors (401/403), server error ranges (500-599),
    %% % unexpected status codes, and malformed responses.
    ok.

%% @doc Classifies network latency using an if...end expression.
%% See lesson guide for latency thresholds and return atoms.
grade_latency(_LatencyMs) ->
    %% % TODO: Evaluate latency thresholds using if...end guard expressions
    %% % with a mandatory true catch-all fallback.
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
    conceptMarkdown: `## Why This Matters in Production

In imperative programming languages (Python, Go, Java, TypeScript), searching an inventory list is done with a \`for\` or \`while\` loop that mutates an index variable.

In pure functional programming, **there are no for loops or while loops**.
Instead, all iteration over data collections is expressed through **Recursion**: decomposing a list into its **Head (the current item)** and its **Tail (the rest of the list)**, processing the head, and recursively calling the function on the tail.

Before you can build complex systems like the Inventory Order Processor (\`inventory.erl\` in Lesson 2.8), you must master the fundamental building block: **Searching a list of domain tuples for a matching identifier**.

## Deep Concept Breakdown & Under the Hood

### The 3 Rules of Recursive Search
Every recursive search over an Erlang list consists of three distinct cases:

1. **The Base Case (List Exhausted):**
   If the list is empty (\`[]\`), we traversed all items and did not find the target. Return \`not_found\`.
   \`\`\`erlang
   find_item([], _TargetId) ->
       not_found;
   \`\`\`

2. **The Match Case (Target Located):**
   If the head of the list contains the identifier we are searching for, stop immediately and return the item.
   \`\`\`erlang
   find_item([{product, TargetId, _, _, _} = Item | _Rest], TargetId) ->
       {ok, Item};
   \`\`\`

3. **The Recursive Step (Search Deeper):**
   If the head of the list does NOT match the target, discard the head and search the remaining tail!
   \`\`\`erlang
   find_item([_OtherItem | Rest], TargetId) ->
       find_item(Rest, TargetId).
   \`\`\`

### Natural Tail Recursion
Notice what happens in step 3: the recursive call \`find_item(Rest, TargetId)\` is the **very last operation** executed in that clause.
Because nothing remains to be calculated after \`find_item\` returns, the BEAM VM reuses the current stack frame. Searching a list of 100,000 items in Erlang does not allocate 100,000 stack frames—it runs in constant $O(1)$ stack space!

> [!warning] Common Beginner Syntax Trap: The Missing Base Case
> The most frequent beginner bug in recursive Erlang is forgetting the empty list clause (\`find_item([], _) -> not_found.\`).
> If this clause is omitted and an item is not in the list, the function will attempt to match \`[]\` against \`[Head | Tail]\`, immediately crashing with a \`function_clause\` runtime error!

## Parallel Worked Example

Searching an employee directory for a badge record:

\`\`\`erlang
-module(badge_registry).
-export([lookup_badge/2, has_permission/2]).

%% Base case: Empty directory
lookup_badge([], _TargetId) ->
    not_found;
%% Match case: Found target employee ID at head of list
lookup_badge([{badge, TargetId, Name, Clearance} | _Rest], TargetId) ->
    {ok, {badge, TargetId, Name, Clearance}};
%% Recursive step: Discard head and search remainder of list
lookup_badge([_OtherBadge | Rest], TargetId) ->
    lookup_badge(Rest, TargetId).

%% Searching for a simple element in a flat list:
has_permission([], _TargetPerm) ->
    false;
has_permission([TargetPerm | _Rest], TargetPerm) ->
    true;
has_permission([_Other | Rest], TargetPerm) ->
    has_permission(Rest, TargetPerm).
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Recursive List Traversal Pattern:
traverse([]) -> BaseResult;
traverse([MatchItem | _Rest]) when Condition -> MatchResult;
traverse([_Other | Rest]) -> traverse(Rest).
\`\`\`

## Assignment Specification

Implement two recursive search functions in \`recursive_search.erl\`:

1. \`find_product(Inventory, TargetId)\`:
   - \`Inventory\` is a list of 5-tuples: \`[{product, Id, Name, Price, Stock}, ...]\`.
   - If a product with matching \`Id =:= TargetId\` is found, return \`{ok, {product, TargetId, Name, Price, Stock}}\`.
   - If the list is empty or the product does not exist, return atom \`not_found\`.

2. \`contains_item(List, Target)\`:
   - Returns boolean \`true\` if \`Target\` is an element of \`List\` (matched using \`=:==\`).
   - Returns boolean \`false\` if \`List\` is exhausted (\`[]\`).

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

%% @doc Recursively searches the Inventory list for a product tuple with matching ID.
%% See lesson guide for the 3-case recursive pattern and return contract.
find_product(_Inventory, _TargetId) ->
    %% % TODO: Implement multi-clause recursive search over the inventory:
    %% % handle base case (empty list), match case (target found), and recursive step.
    ok.

%% @doc Recursively checks if Target is an element of List.
%% See lesson guide for the base case and match case specifications.
contains_item(_List, _Target) ->
    %% % TODO: Implement recursive membership check without using standard library functions:
    %% % handle base case (empty list), match case (element found), and recursive step.
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

%% @doc Recursively searches the Inventory list for a product tuple with matching ID.
%% See lesson guide for the 3-case recursive pattern and return contract.
find_product(_Inventory, _TargetId) ->
    %% % TODO: Implement multi-clause recursive search over the inventory:
    %% % handle base case (empty list), match case (target found), and recursive step.
    ok.

%% @doc Recursively checks if Target is an element of List.
%% See lesson guide for the base case and match case specifications.
contains_item(_List, _Target) ->
    %% % TODO: Implement recursive membership check without using standard library functions:
    %% % handle base case (empty list), match case (element found), and recursive step.
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
    conceptMarkdown: `## Why This Matters in Production

In production BEAM applications processing millions of network packets, sensor readings, or ledger entries, how you write recursive functions directly determines whether your server runs smoothly or crashes with an **Out Of Memory (OOM)** error.

The BEAM VM allocates a execution stack frame for every active function call. If a recursive function is written poorly, the stack frame cannot be released until the entire list has been traversed. For a list of 1,000,000 items, this consumes gigabytes of RAM.

When a function is **Tail-Call Optimized (TCO)**, the BEAM VM reuses the exact same stack frame indefinitely. A TCO function can process 1,000,000,000 items in constant **$O(1)$ memory** (less than 64 words of stack)!

## Deep Concept Breakdown & Under the Hood

### 1. Body Recursion (The Stack-Hungry Trap)
Consider this common naive approach to summing a list of numbers:

\`\`\`erlang
%% Body-recursive:
sum_naive([]) -> 0;
sum_naive([H | T]) -> H + sum_naive(T).
\`\`\`

Why is this called "Body Recursion"?
Notice the expression \`H + sum_naive(T)\`. Before addition (\`+\`) can occur, the BEAM VM **must wait** for \`sum_naive(T)\` to complete.
Because the addition is suspended waiting for the recursive call to return, the current stack frame cannot be discarded. The BEAM pushes a new stack frame for each element:

\`\`\`
[Frame 1: 10 + (waiting)]
  [Frame 2: 20 + (waiting)]
    [Frame 3: 30 + (waiting)]  <-- Stack grows linearly O(N)!
\`\`\`

### 2. Tail-Call Optimization & The Accumulator Pattern
A function is **Tail-Recursive** if the recursive call is the **absolute last operation** executed in the clause. Nothing is suspended or waiting.

To make an aggregation tail-recursive, we introduce a private helper with an extra parameter called an **Accumulator (\`Acc\`)**:

\`\`\`erlang
%% Public interface initializes accumulator to 0:
sum_tco(List) ->
    sum_tco(List, 0).

%% Private tail-recursive loop:
sum_tco([], Acc) ->
    Acc;
sum_tco([H | T], Acc) ->
    sum_tco(T, Acc + H).   %% Acc + H is evaluated BEFORE the call!
\`\`\`

Notice:
1. \`Acc + H\` is calculated **before** \`sum_tco/2\` is entered.
2. The recursive call \`sum_tco(T, ...)\` is the final instruction.
3. The BEAM compiler detects this pattern and emits the \`call_last\` bytecode opcode. Instead of pushing a new frame, it overwrites the existing stack frame in place. Stack space remains constant $O(1)$!

> [!warning] Common Beginner Syntax Trap: Pseudo-TCO
> Writing \`H + sum_tco(T, Acc)\` is NOT tail-recursive!
> Even though you passed an accumulator, the \`H +\` operation is still outside the call, forcing the BEAM to hold the stack frame open. Always move the calculation inside the function call argument.

## Parallel Worked Example

Counting and aggregating network metric bytes:

\`\`\`erlang
-module(metrics_tco).
-export([total_bytes/1, sample_count/1]).

%% Sum bytes with TCO
total_bytes(ByteList) ->
    total_bytes_loop(ByteList, 0).

total_bytes_loop([], Acc) ->
    Acc;
total_bytes_loop([Bytes | Rest], Acc) ->
    total_bytes_loop(Rest, Acc + Bytes).

%% Count items with TCO
sample_count(List) ->
    sample_count_loop(List, 0).

sample_count_loop([], CountAcc) ->
    CountAcc;
sample_count_loop([_Item | Rest], CountAcc) ->
    sample_count_loop(Rest, CountAcc + 1).
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% The Standard TCO Accumulator Pattern:
ExportedFunc(List) ->
    PrivateHelper(List, InitialAcc).

PrivateHelper([], Acc) ->
    Acc;
PrivateHelper([H | T], Acc) ->
    PrivateHelper(T, UpdateAcc(Acc, H)).
\`\`\`

## Assignment Specification

Implement two tail-recursive accumulator functions in \`tco_counter.erl\`:

1. \`sum_packets(List)\`:
   - Takes a list of integer packet sizes, e.g. \`[10, 20, 30, 40]\`.
   - Delegates to a private helper \`sum_packets(List, 0)\`.
   - Returns the integer sum in $O(1)$ stack space.

2. \`count_packets(List)\`:
   - Takes a list of arbitrary packet items, e.g. \`[a, b, c, d, e]\`.
   - Delegates to a private helper \`count_packets(List, 0)\`.
   - Returns the integer count in $O(1)$ stack space.

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
      question: 'Why does sum([H|T], Acc) -> sum(T, Acc + H) execute in O(1) stack space while sum([H|T]) -> H + sum(T) consumes O(N) stack frames?',
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

%% @doc Sum integer packet sizes using a tail-recursive accumulator loop.
sum_packets(List) ->
    %% Delegate to a private helper sum_packets(List, 0).
    % TODO: Implement sum_packets/1 and sum_packets/2
    ok.

%% @doc Count items in list using a tail-recursive accumulator loop.
count_packets(List) ->
    %% Delegate to a private helper count_packets(List, 0).
    % TODO: Implement count_packets/1 and count_packets/2
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

%% @doc Sum integer packet sizes using a tail-recursive accumulator loop.
sum_packets(List) ->
    %% Delegate to a private helper sum_packets(List, 0).
    % TODO: Implement sum_packets/1 and sum_packets/2
    ok.

%% @doc Count items in list using a tail-recursive accumulator loop.
count_packets(List) ->
    %% Delegate to a private helper count_packets(List, 0).
    % TODO: Implement count_packets/1 and count_packets/2
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
filter_bad([H | T], Acc) ->
    filter_bad(T, Acc ++ [H]).
\`\`\`
In Erlang, \`Acc ++ [H]\` must copy the entire left list \`Acc\` on every single iteration!
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
keep_evens([H | T], Acc) when H rem 2 =:= 0 ->
    keep_evens(T, [H | Acc]);
keep_evens([_ | T], Acc) ->
    keep_evens(T, Acc).
\`\`\`

This guarantees strict $O(N)$ total execution time and minimal memory churn.

> [!warning] Common Beginner Syntax Trap: Forgetting lists:reverse
> If your function passes tests for item presence but fails ordering checks (e.g. returning \`[4, 1]\` instead of \`[1, 4]\`), you forgot to call \`lists:reverse(Acc)\` in the base case clause!

## Parallel Worked Example

Filtering active user IDs from user profile tuples:

\`\`\`erlang
-module(user_filter).
-export([active_user_ids/1]).

active_user_ids(Users) ->
    active_user_ids_loop(Users, []).

active_user_ids_loop([], Acc) ->
    lists:reverse(Acc);
active_user_ids_loop([{user, Id, _Name, active} | Rest], Acc) ->
    active_user_ids_loop(Rest, [Id | Acc]);
active_user_ids_loop([{user, _Id, _Name, _OtherStatus} | Rest], Acc) ->
    active_user_ids_loop(Rest, Acc).
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

Implement order filtering in \`acc_filter.erl\`:

1. \`keep_valid_orders(Orders)\`:
   - Input is a list of 4-tuples: \`[{order, Id, Qty, Status}, ...]\`.
   - An order is valid if \`Qty > 0\` AND \`Status =:= confirmed\`.
   - Extracts only the \`Id\` integers of valid orders.
   - Must preserve the exact relative order of the input.
   - Implemented using a private tail-recursive accumulator helper and \`lists:reverse/1\`.

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
      question: 'Why is prepending with [H | Acc] and reversing once with lists:reverse(Acc) vastly superior to Acc ++ [H]?',
      options: [
        {
          id: 'A',
          label: 'Acc ++ [H] copies the accumulator on every step resulting in O(N^2) time, while prepend + reverse is strictly O(N)',
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

%% @doc Filter confirmed orders with Qty > 0 and extract their IDs in original order.
keep_valid_orders(Orders) ->
    %% 1. Delegate to keep_valid_orders(Orders, []).
    %% 2. In base case [], return lists:reverse(Acc).
    %% 3. When Qty > 0 and Status =:= confirmed, accumulate [Id | Acc].
    %% 4. Otherwise, skip the order.
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

%% @doc Filter confirmed orders with Qty > 0 and extract their IDs in original order.
keep_valid_orders(Orders) ->
    %% 1. Delegate to keep_valid_orders(Orders, []).
    %% 2. In base case [], return lists:reverse(Acc).
    %% 3. When Qty > 0 and Status =:= confirmed, accumulate [Id | Acc].
    %% 4. Otherwise, skip the order.
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
    conceptMarkdown: `## Why This Matters in Production

In real-world backend applications, you rarely just read or filter lists: you need to **update records inside an immutable dataset**.

In the upcoming Chapter 2 Capstone Problem Set (\`inventory.erl\` in Lesson 2.8), an incoming customer order requires you to find a specific product inside an inventory list and **deduct the purchased quantity from that product's stock**, while leaving all other products in their exact relative positions.

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
update_stock([], _TargetId, _DeductQty, Acc) ->
    lists:reverse(Acc);
update_stock([{product, Id, Name, Price, Stock} | Rest], TargetId, DeductQty, Acc)
  when Id =:= TargetId, Stock >= DeductQty ->
    UpdatedProd = {product, Id, Name, Price, Stock - DeductQty},
    update_stock(Rest, TargetId, DeductQty, [UpdatedProd | Acc]);
update_stock([OtherProd | Rest], TargetId, DeductQty, Acc) ->
    update_stock(Rest, TargetId, DeductQty, [OtherProd | Acc]).
\`\`\`

### 2. Dual-Accumulator Partitioning
Sometimes a function needs to produce **two separate lists** from a single stream of inputs (e.g. separating valid orders from invalid orders, or successful payments from failed payments).

Instead of traversing the list twice (which would be $2 \times O(N)$), Erlang functions pass **two accumulators simultaneously**:

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

Updating player levels and partitioning active vs inactive players in a gaming guild:

\`\`\`erlang
-module(guild_manager).
-export([level_up_player/3, partition_by_level/2]).

level_up_player(Players, TargetPlayerId, BonusLevels) ->
    level_up_loop(Players, TargetPlayerId, BonusLevels, []).

level_up_loop([], _TargetId, _Bonus, Acc) ->
    lists:reverse(Acc);
level_up_loop([{player, Id, Name, Lvl} | Rest], TargetId, Bonus, Acc)
  when Id =:= TargetId ->
    Updated = {player, Id, Name, Lvl + Bonus},
    level_up_loop(Rest, TargetId, Bonus, [Updated | Acc]);
level_up_loop([OtherPlayer | Rest], TargetId, Bonus, Acc) ->
    level_up_loop(Rest, TargetId, Bonus, [OtherPlayer | Acc]).

partition_by_level(Players, MinLevel) ->
    partition_loop(Players, MinLevel, [], []).

partition_loop([], _MinLvl, HighAcc, LowAcc) ->
    {lists:reverse(HighAcc), lists:reverse(LowAcc)};
partition_loop([{player, _Id, _Name, Lvl} = P | Rest], MinLvl, HighAcc, LowAcc)
  when Lvl >= MinLvl ->
    partition_loop(Rest, MinLvl, [P | HighAcc], LowAcc);
partition_loop([P | Rest], MinLvl, HighAcc, LowAcc) ->
    partition_loop(Rest, MinLvl, HighAcc, [P | LowAcc]).
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

Implement two list manipulation functions in \`tuple_updater.erl\`:

1. \`update_product_price(Inventory, TargetId, NewPrice)\`:
   - \`Inventory\` is a list of \`[{product, Id, Name, Price, Stock}, ...]\`.
   - Locates the product with \`Id =:= TargetId\` and constructs a new tuple with \`NewPrice\`.
   - All other products remain unchanged, in their exact original order.
   - If \`TargetId\` is not present, returns \`Inventory\` unchanged.

2. \`partition_orders(Orders, MinQty)\`:
   - \`Orders\` is a list of \`[{order, Id, Qty}, ...]\`.
   - Uses dual accumulators to partition into \`{ValidOrders, RejectedOrders}\`.
   - An order is valid if \`Qty >= MinQty\`. Both output lists must preserve original input order.

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
          label: 'To check if the TargetId exists multiple times in the global atom table',
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

%% @doc Update the price of product TargetId in Inventory while preserving list order.
update_product_price(Inventory, TargetId, NewPrice) ->
    %% 1. Delegate to helper with Acc: update_product_price(Inventory, TargetId, NewPrice, []).
    %% 2. In base case [], return lists:reverse(Acc).
    %% 3. When Id =:= TargetId, update Price to NewPrice and accumulate.
    %% 4. For other products, accumulate unchanged.
    ok.

%% @doc Partition orders into {Valid, Rejected} where Valid has Qty >= MinQty.
partition_orders(Orders, MinQty) ->
    %% 1. Delegate to helper with two accumulators: partition_orders(Orders, MinQty, [], []).
    %% 2. In base case [], return {lists:reverse(ValidAcc), lists:reverse(RejAcc)}.
    %% 3. When Qty >= MinQty, add to ValidAcc; otherwise add to RejAcc.
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

%% @doc Update the price of product TargetId in Inventory while preserving list order.
update_product_price(Inventory, TargetId, NewPrice) ->
    %% 1. Delegate to helper with Acc: update_product_price(Inventory, TargetId, NewPrice, []).
    %% 2. In base case [], return lists:reverse(Acc).
    %% 3. When Id =:= TargetId, update Price to NewPrice and accumulate.
    %% 4. For other products, accumulate unchanged.
    ok.

%% @doc Partition orders into {Valid, Rejected} where Valid has Qty >= MinQty.
partition_orders(Orders, MinQty) ->
    %% 1. Delegate to helper with two accumulators: partition_orders(Orders, MinQty, [], []).
    %% 2. In base case [], return {lists:reverse(ValidAcc), lists:reverse(RejAcc)}.
    %% 3. When Qty >= MinQty, add to ValidAcc; otherwise add to RejAcc.
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

You will implement three core business operations:

### 1. Processing Orders (\`process_order/2\`)
An outer tail-recursive loop iterates through each incoming order \`{order, ProdId, Qty}\`.
For each order:
- It checks if the product exists in the current inventory AND has \`Stock >= Qty\`.
- If so, it deducts \`Qty\` from that product's stock using the list update pattern from Lesson 2.7.
- If the product does not exist, or if stock is insufficient (\`Stock < Qty\`), that order is **skipped/rejected**, and the inventory remains unchanged.
- When all orders have been processed, the final updated inventory is returned in its exact original order.

### 2. Calculating Order Total (\`calculate_order_total/2\`)
Calculates the total monetary value of fulfillable orders:
- For each order \`{order, ProdId, Qty}\`:
- If the product exists in inventory and has \`Stock >= Qty\`, it contributes \`Price * Qty\` to the total.
- If the product is missing or stock is insufficient, it contributes \`0\`.
- Computed in a tail-recursive accumulator loop running in $O(1)$ stack space.

### 3. Restocking Inventory (\`restock/2\`)
Restocks items from a supplier delivery list: \`[{ProductId, RestockQty}, ...]\`.
- For each item, increments \`Stock\` by \`RestockQty\`.
- Products not in the restock list remain unchanged.
- Preserves the exact original inventory order.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Pure Tail-Recursive Composition:
%% An outer loop over Orders calls an inner helper over Inventory:
process_orders_loop(Inventory, []) ->
    Inventory;
process_orders_loop(Inventory, [{order, ProdId, Qty} | RestOrders]) ->
    NewInv = deduct_stock_if_available(Inventory, ProdId, Qty),
    process_orders_loop(NewInv, RestOrders).
\`\`\`

## Assignment Specification

Module: \`inventory.erl\`
Exports: \`process_order/2\`, \`calculate_order_total/2\`, \`restock/2\`

Data Definitions:
- \`Product\`: \`{product, Id :: integer(), Name :: string(), Price :: integer(), Stock :: integer()}\`
- \`Order\`: \`{order, ProductId :: integer(), Quantity :: integer()}\`
- \`RestockItem\`: \`{ProductId :: integer(), Quantity :: integer()}\`

Functions to Implement:
1. \`process_order(Inventory, Orders)\`:
   - Returns updated \`Inventory\` with quantities deducted for fulfilled orders.
2. \`calculate_order_total(Inventory, Orders)\`:
   - Returns integer total cost of all fulfilled orders.
3. \`restock(Inventory, Restocks)\`:
   - Returns updated \`Inventory\` with quantities added.

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
    %% Outer loop traverses Orders; inner loop checks and updates Inventory.
    % TODO: Process all orders tail-recursively
    ok.

%% @doc Calculate total cost of fulfilled orders. Unfulfillable orders contribute 0.
calculate_order_total(Inventory, Orders) ->
    %% Tail-recursively sum (Price * Qty) for each order where Stock >= Qty.
    % TODO: Calculate order total tail-recursively
    0.

%% @doc Restock inventory items from [{ProductId, RestockQty}, ...].
restock(Inventory, Restocks) ->
    %% Outer loop traverses Restocks; inner loop increments product stock.
    % TODO: Restock inventory tail-recursively
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
    %% Outer loop traverses Orders; inner loop checks and updates Inventory.
    % TODO: Process all orders tail-recursively
    ok.

%% @doc Calculate total cost of fulfilled orders. Unfulfillable orders contribute 0.
calculate_order_total(Inventory, Orders) ->
    %% Tail-recursively sum (Price * Qty) for each order where Stock >= Qty.
    % TODO: Calculate order total tail-recursively
    0.

%% @doc Restock inventory items from [{ProductId, RestockQty}, ...].
restock(Inventory, Restocks) ->
    %% Outer loop traverses Restocks; inner loop increments product stock.
    % TODO: Restock inventory tail-recursively
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

import { LessonContent } from '../../types/workspace';

export const CHAPTER_2_LESSONS: LessonContent[] = [
  // ── Lesson 2.1: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch02-l01',
    chapterNumber: 2,
    lessonNumber: 1,
    lessonType: 'concept_exercise',
    title: 'Advanced Pattern Matching in Function Heads',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In distributed networks like XMPP (Jabber) or Erlang RPC clusters, network packets arrive as deeply nested tuples containing headers, protocol versions, source/destination routes, and binary payloads. In languages like Python, Java, or Go, unpacking nested fields requires multiple lines of defensive \`if nil\` checks and accessor calls. In Erlang, the BEAM VM deconstructs arbitrary nested data structures directly in the function clause head in a single operation.

## Deep Concept Breakdown & Under the Hood

When a function is called, the BEAM VM uses its pattern matching instruction set (\`test_heap\`, \`get_tuple_element\`, \`is_eq_exact\`) to test the shape and contents of arguments before the function body ever executes:

\`\`\`erlang
%% Unpacking nested structures directly in the head:
handle_packet({packet, {header, 4, {route, From, To}}, Payload}) ->
    {ok, routed, From, To, Payload};
handle_packet({packet, {header, Version, _Route}, _Payload}) ->
    {error, {unsupported_version, Version}}.
\`\`\`

If no clause matches the argument structure, the function crashes immediately with a \`function_clause\` exception, preventing corrupted state from propagating down the call stack.

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Function Clause Pattern Syntax
FunctionName(Pattern1, Pattern2, ...) -> Body;
FunctionName(OtherPattern1, OtherPattern2, ...) -> Body.
\`\`\`
> Function clauses are evaluated strictly in top-to-bottom order. Place specific clauses above generic fallback clauses.

## Assignment Specification

Module: \`deep_match\` · Export: \`extract_route/1\`, \`format_packet/1\`
1. \`extract_route(Packet)\`:
   - Matches \`{packet, {header, Version, {route, From, To}}, Payload}\`
   - If \`Version =:= 4\` or \`Version =:= 6\`, returns \`{ok, From, To}\`.
   - If \`Version\` is any other value, returns \`{error, invalid_version}\`.
   - If \`Packet\` does not match the packet envelope, returns \`{error, malformed_envelope}\`.
2. \`format_packet(Packet)\`:
   - For valid packets with \`Version =:= 4\` or \`6\`, returns formatted string/binary: \`<<"[V", (integer_to_binary(Version))/binary, "] ", From/binary, " -> ", To/binary>>\`.
   - Otherwise, returns \`<<"[INVALID]">> \`.

## Rules & Verification Constraints

- Pattern match directly in function clause arguments.
- Do not extract fields with \`element/2\`.`,
    otpDocCards: [
      {
        functionName: 'pattern_matching_heads',
        module: 'erlang',
        signature: 'Name(Pattern1, Pattern2) -> Body.',
        typesSpec: ['Pattern = term()', 'Body = term()'],
        description: 'Multi-clause pattern matching in function heads.',
        complexityNote: 'Compiled by BEAM into decision trees of jump tables.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/functions.html#pattern-matching',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch02-01-1',
        title: 'Extract Valid IPv4 Route',
        erlangCall: 'deep_match:extract_route({packet, {header, 4, {route, <<"10.0.0.1">>, <<"10.0.0.2">>}}, <<"DATA">>})',
        expectedOutput: '{ok, <<"10.0.0.1">>, <<"10.0.0.2">>}',
        explanation: 'Deeply matches nested route tuple in header.',
      },
      {
        id: 'tc-ch02-01-2',
        title: 'Reject Unsupported Version',
        erlangCall: 'deep_match:extract_route({packet, {header, 5, {route, <<"a">>, <<"b">>}}, <<"DATA">>})',
        expectedOutput: '{error, invalid_version}',
        explanation: 'Version 5 triggers the version fallback clause.',
      },
      {
        id: 'tc-ch02-01-3',
        title: 'Format Packet String',
        erlangCall: 'deep_match:format_packet({packet, {header, 4, {route, <<"alice">>, <<"bob">>}}, <<"HELLO">>})',
        expectedOutput: '<<"[V4] alice -> bob">>',
        explanation: 'Constructs formatted binary route display.',
      },
    ],
    astRules: {
      forbiddenCalls: ['erlang:element'],
    },
    solutionExplanation: 'Uses nested tuple patterns directly in function heads with top-to-bottom clause ordering.',
    starterCode: `-module(deep_match).
-export([extract_route/1, format_packet/1]).

extract_route(Packet) ->
    %% % TODO: match {packet, {header, Version, {route, From, To}}, Payload}
    {error, not_implemented}.

format_packet(Packet) ->
    %% % TODO: return <<"[V", ...>> or <<"[INVALID]">>
    <<"[INVALID]">>.`,
    solutionCode: `-module(deep_match).
-export([extract_route/1, format_packet/1]).

extract_route({packet, {header, 4, {route, From, To}}, _Payload}) ->
    {ok, From, To};
extract_route({packet, {header, 6, {route, From, To}}, _Payload}) ->
    {ok, From, To};
extract_route({packet, {header, _OtherVersion, {route, _From, _To}}, _Payload}) ->
    {error, invalid_version};
extract_route(_) ->
    {error, malformed_envelope}.

format_packet({packet, {header, Version, {route, From, To}}, _Payload})
  when (Version =:= 4 orelse Version =:= 6) andalso is_binary(From) andalso is_binary(To) ->
    VBin = integer_to_binary(Version),
    <<"[V", VBin/binary, "] ", From/binary, " -> ", To/binary>>;
format_packet(_) ->
    <<"[INVALID]">>.`,
    files: [
      {
        path: 'src/deep_match.erl',
        name: 'deep_match.erl',
        content: `-module(deep_match).
-export([extract_route/1, format_packet/1]).

extract_route(Packet) ->
    %% % TODO: match {packet, {header, Version, {route, From, To}}, Payload}
    {error, not_implemented}.

format_packet(Packet) ->
    %% % TODO: return <<"[V", ...>> or <<"[INVALID]">>
    <<"[INVALID]">>.`,
      },
    ],
    solutionFiles: {
      'src/deep_match.erl': `-module(deep_match).
-export([extract_route/1, format_packet/1]).

extract_route({packet, {header, 4, {route, From, To}}, _Payload}) ->
    {ok, From, To};
extract_route({packet, {header, 6, {route, From, To}}, _Payload}) ->
    {ok, From, To};
extract_route({packet, {header, _OtherVersion, {route, _From, _To}}, _Payload}) ->
    {error, invalid_version};
extract_route(_) ->
    {error, malformed_envelope}.

format_packet({packet, {header, Version, {route, From, To}}, _Payload})
  when (Version =:= 4 orelse Version =:= 6) andalso is_binary(From) andalso is_binary(To) ->
    VBin = integer_to_binary(Version),
    <<"[V", VBin/binary, "] ", From/binary, " -> ", To/binary>>;
format_packet(_) ->
    <<"[INVALID]">>.`,
    },
    references: [
      {
        title: 'Erlang Pattern Matching Reference',
        url: 'https://www.erlang.org/doc/reference_manual/functions.html',
        category: 'erlang_docs',
        description: 'Official OTP manual on function head pattern matching and arity rules.',
      },
    ],
  },

  // ── Lesson 2.2: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch02-l02',
    chapterNumber: 2,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'Guard Clauses (when) & Guard BIFs',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In high-concurrency systems, bad inputs (e.g. negative port numbers, malformed temperature telemetry, or division-by-zero attempts) must be caught before any memory is allocated or socket opened. Guard clauses extend pattern matching by applying predicates to function arguments before committing to a clause.

## Deep Concept Breakdown & Under the Hood

Guards begin with the \`when\` keyword:
\`\`\`erlang
connect(Port) when is_integer(Port), Port >= 1024, Port =< 65535 ->
    {ok, binding_port, Port}.
\`\`\`

**Critical BEAM Invariant:** Guards **must be strictly pure and side-effect free**.
- You cannot call user-defined functions inside a guard.
- Only built-in type checks (\`is_integer/1\`, \`is_binary/1\`, \`is_list/1\`) and arithmetic comparisons (\`=:=\`, \`=/=\`, \`<\`, \`>\`, \`=<\`, \`>=\`) are permitted.
- In guard syntax:
  - Comma (\`,\`) denotes logical **AND**.
  - Semicolon (\`;\`) denotes logical **OR**.
- If an exception occurs inside a guard (such as dividing by zero), the guard does *not* crash the program — it simply evaluates to \`false\` and the BEAM tests the next clause.

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Guard Syntax
Function(Args) when GuardExpr1, GuardExpr2 -> Body;
Function(Args) when GuardExpr3; GuardExpr4 -> Body.
\`\`\`
> Guards are compiled to fast conditional branch instructions (\`is_ge\`, \`is_lt\`, \`is_integer\`) in BEAM bytecode.

## Assignment Specification

Module: \`guard_validator\` · Export: \`validate_port/1\`, \`classify_temperature/1\`, \`safe_divide/2\`
1. \`validate_port(Port)\`:
   - If \`Port\` is an integer between \`1024\` and \`65535\` (inclusive), return \`{ok, unprivileged_port}\`.
   - If \`Port\` is an integer between \`1\` and \`1023\` (inclusive), return \`{ok, privileged_port}\`.
   - Otherwise, return \`{error, invalid_port}\`.
2. \`classify_temperature(TempC)\`:
   - If \`TempC =< 0\`, return \`freezing\`.
   - If \`TempC > 0\` and \`TempC =< 25\`, return \`temperate\`.
   - If \`TempC > 25\`, return \`hot\`.
3. \`safe_divide(Numerator, Denominator)\`:
   - If \`Denominator =/= 0\`, return \`{ok, Numerator / Denominator}\`.
   - If \`Denominator =:= 0\`, return \`{error, division_by_zero}\`.

## Rules & Verification Constraints

- Must use guard clauses (\`when\`) on all 3 functions.
- Enforced by AST rule: \`requiredConstructs: ["guards"]\`.`,
    otpDocCards: [
      {
        functionName: 'guards_syntax',
        module: 'erlang',
        signature: 'Clause(X) when Guard1, Guard2 -> Result.',
        typesSpec: ['Guard1 = Guard2 = guard_bif_call() | comparison()'],
        description: 'Pure, side-effect-free predicates executed during clause selection.',
        complexityNote: 'Zero-heap evaluation executed in CPU registers.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/expressions.html#guard-sequences',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch02-02-1',
        title: 'Validate Unprivileged Port',
        erlangCall: 'guard_validator:validate_port(8080)',
        expectedOutput: '{ok, unprivileged_port}',
        explanation: '8080 is an integer between 1024 and 65535.',
      },
      {
        id: 'tc-ch02-02-2',
        title: 'Validate Privileged Port',
        erlangCall: 'guard_validator:validate_port(443)',
        expectedOutput: '{ok, privileged_port}',
        explanation: '443 is an integer between 1 and 1023.',
      },
      {
        id: 'tc-ch02-02-3',
        title: 'Safe Division Guarded Zero Check',
        erlangCall: 'guard_validator:safe_divide(10, 0)',
        expectedOutput: '{error, division_by_zero}',
        explanation: 'Guard Denominator =:= 0 catches division by zero safely.',
      },
    ],
    astRules: {
      requiredConstructs: ['guards'],
    },
    solutionExplanation: 'Uses when is_integer, when Denominator =/= 0 guards across all clauses.',
    starterCode: `-module(guard_validator).
-export([validate_port/1, classify_temperature/1, safe_divide/2]).

validate_port(Port) when is_integer(Port), Port >= 1024, Port =< 65535 ->
    %% % TODO: return {ok, unprivileged_port}
    {error, not_implemented};
validate_port(Port) ->
    {error, invalid_port}.

classify_temperature(TempC) ->
    %% % TODO: use guards for freezing, temperate, hot
    unknown.

safe_divide(Numerator, Denominator) ->
    %% % TODO: use guards to prevent division by zero
    {error, not_implemented}.`,
    solutionCode: `-module(guard_validator).
-export([validate_port/1, classify_temperature/1, safe_divide/2]).

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

safe_divide(Numerator, Denominator)
  when is_number(Numerator), is_number(Denominator), Denominator =/= 0, Denominator =/= 0.0 ->
    {ok, Numerator / Denominator};
safe_divide(Numerator, Denominator)
  when is_number(Numerator), (Denominator =:= 0 orelse Denominator =:= 0.0) ->
    {error, division_by_zero};
safe_divide(_, _) ->
    {error, badarg}.`,
    files: [
      {
        path: 'src/guard_validator.erl',
        name: 'guard_validator.erl',
        content: `-module(guard_validator).
-export([validate_port/1, classify_temperature/1, safe_divide/2]).

validate_port(Port) when is_integer(Port), Port >= 1024, Port =< 65535 ->
    %% % TODO: return {ok, unprivileged_port}
    {error, not_implemented};
validate_port(Port) ->
    {error, invalid_port}.

classify_temperature(TempC) ->
    %% % TODO: use guards for freezing, temperate, hot
    unknown.

safe_divide(Numerator, Denominator) ->
    %% % TODO: use guards to prevent division by zero
    {error, not_implemented}.`,
      },
    ],
    solutionFiles: {
      'src/guard_validator.erl': `-module(guard_validator).
-export([validate_port/1, classify_temperature/1, safe_divide/2]).

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

safe_divide(Numerator, Denominator)
  when is_number(Numerator), is_number(Denominator), Denominator =/= 0, Denominator =/= 0.0 ->
    {ok, Numerator / Denominator};
safe_divide(Numerator, Denominator)
  when is_number(Numerator), (Denominator =:= 0 orelse Denominator =:= 0.0) ->
    {error, division_by_zero};
safe_divide(_, _) ->
    {error, badarg}.`,
    },
    references: [
      {
        title: 'Erlang Guard Sequences Reference',
        url: 'https://www.erlang.org/doc/reference_manual/expressions.html#guard-sequences',
        category: 'erlang_docs',
        description: 'Comprehensive listing of all valid guard BIFs and semantics.',
      },
    ],
  },

  // ── Lesson 2.3: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch02-l03',
    chapterNumber: 2,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Control Expressions: case...of and if...end',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

While function head pattern matching is ideal for dispatching external API calls, branching inside an algorithm often depends on intermediate values (such as decoding a JSON response or inspecting a database transaction result). Erlang provides \`case...of\` for pattern matching internal expressions and \`if...end\` for multi-way boolean branch evaluation.

## Deep Concept Breakdown & Under the Hood

### 1. \`case...of\`
\`case Expr of\` evaluates \`Expr\` once and matches the result against multiple patterns with optional guards:
\`\`\`erlang
case httpc:request(Url) of
    {ok, {{_Ver, 200, _Phrase}, _Headers, Body}} -> {ok, Body};
    {ok, {{_Ver, 404, _Phrase}, _Headers, _}}     -> {error, not_found};
    {error, Reason}                               -> {error, {transport_error, Reason}}
end.
\`\`\`

### 2. \`if...end\`
\`if...end\` evaluates pure guard expressions sequentially until one evaluates to \`true\`. Unlike imperative \`if\`, Erlang's \`if\` has no implicit else: if no condition evaluates to \`true\`, an \`if_clause\` crash occurs. Always provide a final \`true -> ...\` branch if a fallback is needed.

\`\`\`erlang
if
    LatencyMs < 100  -> fast;
    LatencyMs < 500  -> acceptable;
    true             -> degraded
end.
\`\`\`

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% case ... of syntax
case Expression of
    Pattern1 [when Guard1] -> Body1;
    Pattern2 [when Guard2] -> Body2
end
\`\`\`

## Assignment Specification

Module: \`flow_control\` · Export: \`handle_http_response/1\`, \`grade_latency/1\`
1. \`handle_http_response(Response)\`:
   - Matches \`{http_response, StatusCode, Body}\` using \`case...of\`:
     - If \`StatusCode >= 200\` and \`StatusCode < 300\`: return \`{ok, Body}\`
     - If \`StatusCode =:= 401\`: return \`{error, unauthorized}\`
     - If \`StatusCode =:= 404\`: return \`{error, not_found}\`
     - If \`StatusCode >= 500\`: return \`{error, server_error}\`
     - Any other status: return \`{error, {unhandled_status, StatusCode}}\`
2. \`grade_latency(LatencyMs)\`:
   - Using \`if...end\`:
     - If \`LatencyMs =< 50\`: return \`optimal\`
     - If \`LatencyMs =< 200\`: return \`acceptable\`
     - Otherwise (\`true\` branch): return \`sla_breach\`

## Rules & Verification Constraints

- \`handle_http_response/1\` must use \`case...of\`.
- \`grade_latency/1\` must use \`if...end\` with a fallback \`true\` clause.`,
    otpDocCards: [
      {
        functionName: 'case_expression',
        module: 'erlang',
        signature: 'case Expr of Pattern -> Body end',
        typesSpec: ['Expr = term()', 'Pattern = term()'],
        description: 'Pattern matching branch expression evaluating intermediate terms.',
        complexityNote: 'Compiled into jump instructions directly in BEAM.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/expressions.html#case',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch02-03-1',
        title: 'Handle HTTP 200 OK Response',
        erlangCall: 'flow_control:handle_http_response({http_response, 200, <<"{\"status\":\"ok\"}">>})',
        expectedOutput: '{ok, <<"{\"status\":\"ok\"}">>}',
        explanation: 'Status 200 matches the 200..299 success range in case of.',
      },
      {
        id: 'tc-ch02-03-2',
        title: 'Handle HTTP 401 Unauthorized',
        erlangCall: 'flow_control:handle_http_response({http_response, 401, <<>>})',
        expectedOutput: '{error, unauthorized}',
        explanation: 'Explicit 401 clause in case branch.',
      },
      {
        id: 'tc-ch02-03-3',
        title: 'Grade SLA Latency',
        erlangCall: 'flow_control:grade_latency(45)',
        expectedOutput: 'optimal',
        explanation: '45 <= 50 matches optimal in if...end.',
      },
    ],
    astRules: {
      requiredConstructs: ['case_expr', 'if_expr'],
    },
    solutionExplanation: 'Implements case...of with guard bounds and if...end with true fallback.',
    starterCode: `-module(flow_control).
-export([handle_http_response/1, grade_latency/1]).

handle_http_response(Response) ->
    %% % TODO: use case Response of ... end
    {error, not_implemented}.

grade_latency(LatencyMs) ->
    %% % TODO: use if ... end with true -> sla_breach
    unknown.`,
    solutionCode: `-module(flow_control).
-export([handle_http_response/1, grade_latency/1]).

handle_http_response(Response) ->
    case Response of
        {http_response, Status, Body} when is_integer(Status), Status >= 200, Status < 300 ->
            {ok, Body};
        {http_response, 401, _Body} ->
            {error, unauthorized};
        {http_response, 404, _Body} ->
            {error, not_found};
        {http_response, Status, _Body} when is_integer(Status), Status >= 500 ->
            {error, server_error};
        {http_response, Status, _Body} when is_integer(Status) ->
            {error, {unhandled_status, Status}};
        _Other ->
            {error, malformed_response}
    end.

grade_latency(LatencyMs) when is_integer(LatencyMs), LatencyMs >= 0 ->
    if
        LatencyMs =< 50 -> optimal;
        LatencyMs =< 200 -> acceptable;
        true -> sla_breach
    end.`,
    files: [
      {
        path: 'src/flow_control.erl',
        name: 'flow_control.erl',
        content: `-module(flow_control).
-export([handle_http_response/1, grade_latency/1]).

handle_http_response(Response) ->
    %% % TODO: use case Response of ... end
    {error, not_implemented}.

grade_latency(LatencyMs) ->
    %% % TODO: use if ... end with true -> sla_breach
    unknown.`,
      },
    ],
    solutionFiles: {
      'src/flow_control.erl': `-module(flow_control).
-export([handle_http_response/1, grade_latency/1]).

handle_http_response(Response) ->
    case Response of
        {http_response, Status, Body} when is_integer(Status), Status >= 200, Status < 300 ->
            {ok, Body};
        {http_response, 401, _Body} ->
            {error, unauthorized};
        {http_response, 404, _Body} ->
            {error, not_found};
        {http_response, Status, _Body} when is_integer(Status), Status >= 500 ->
            {error, server_error};
        {http_response, Status, _Body} when is_integer(Status) ->
            {error, {unhandled_status, Status}};
        _Other ->
            {error, malformed_response}
    end.

grade_latency(LatencyMs) when is_integer(LatencyMs), LatencyMs >= 0 ->
    if
        LatencyMs =< 50 -> optimal;
        LatencyMs =< 200 -> acceptable;
        true -> sla_breach
    end.`,
    },
    references: [
      {
        title: 'Control Flow Expressions (case and if)',
        url: 'https://www.erlang.org/doc/reference_manual/expressions.html#case',
        category: 'erlang_docs',
        description: 'Official OTP reference on case and if branching constructs.',
      },
    ],
  },

  // ── Lesson 2.4: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch02-l04',
    chapterNumber: 2,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'Body Recursion vs. Tail-Call Optimization (TCO) on the BEAM Stack',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In systems like WhatsApp handling millions of active persistent TCP connections or banking engines processing millions of transactions, processes run infinite loops and iterate over massive lists. If an iteration grows the call stack for every element, a process will quickly exhaust memory and crash the VM. **Tail-Call Optimization (TCO)** ensures that recursive functions execute in constant \`O(1)\` stack space.

## Deep Concept Breakdown & Under the Hood

### 1. Body Recursion (Dangerous on Large Lists — Stack O(N))
\`\`\`erlang
%% Body-recursive: the recursive call is NOT the last operation!
sum([]) -> 0;
sum([H | T]) -> H + sum(T).  %% pending addition '+' waits for sum(T)
\`\`\`
Under the hood, the BEAM compiler emits \`allocate\` bytecode opcodes. Each iteration pushes a new stack frame containing the pending addition. For a list of 1,000,000 items, 1,000,000 stack frames are allocated.

### 2. Tail-Recursive Accumulator (Production-Grade — Stack O(1))
\`\`\`erlang
%% Tail-recursive: the call is in the RETURN position!
sum(List) -> sum(List, 0).

sum([], Acc) -> Acc;
sum([H | T], Acc) ->
    sum(T, Acc + H).  %% BEAM emits 'call_last' / 'call_only'
\`\`\`
Because no computation remains after \`sum(T, Acc + H)\`, the BEAM VM reuses the current stack frame, mutating the argument registers in place and jumping to the head of the function. Stack memory remains strictly \`O(1)\`.

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% BEAM Bytecode Disassembly Inspection
beam_disasm:file("ebin/module.beam")
\`\`\`
> BeamForge's \`bf_ast_verifier\` disassembles your compiled \`.beam\` binary to ensure \`call_last\` / \`call_only\` opcodes are present and that no body-recursive \`call\` opcodes exist.

## Assignment Specification

Module: \`tco_counter\` · Export: \`sum_packets/1\`, \`count_packets/1\`
1. \`sum_packets(List)\`:
   - Converts body-recursive addition into tail-recursive accumulator loop: \`sum_packets(List, 0)\`.
   - Returns the total sum of integers in the list.
2. \`count_packets(List)\`:
   - Implements a tail-recursive count accumulator: \`count_packets(List, 0)\`.
   - Returns the number of elements in the list.

## Rules & Verification Constraints

- **Strict AST Rule:** Must use tail recursion on both functions.
- Verified by bytecode inspector: \`requireTailRecursion: ["sum_packets/1", "count_packets/1"]\`.
- Do not use \`lists:sum/1\` or \`length/1\`.`,
    otpDocCards: [
      {
        functionName: 'tail_call_optimization',
        module: 'erlang',
        signature: 'Fun([H|T], Acc) -> Fun(T, Acc + H).',
        typesSpec: ['Tail call in return position', 'Reuses VM stack frame'],
        description: 'Constant O(1) stack memory recursion on the BEAM.',
        complexityNote: 'O(N) time, O(1) stack space.',
        officialUrl: 'https://www.erlang.org/doc/efficiency_guide/myths.html#tail_recursive',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch02-04-1',
        title: 'Sum 100,000 Packets in Constant Stack',
        erlangCall: 'tco_counter:sum_packets([10, 20, 30, 40])',
        expectedOutput: '100',
        explanation: 'Acc loop yields 100 in O(1) stack.',
      },
      {
        id: 'tc-ch02-04-2',
        title: 'Count Packets via TCO Loop',
        erlangCall: 'tco_counter:count_packets([a, b, c, d, e])',
        expectedOutput: '5',
        explanation: 'Accumulates count to 5.',
      },
    ],
    astRules: {
      requireTailRecursion: ['sum_packets/1', 'count_packets/1'],
      forbiddenCalls: ['lists:sum', 'erlang:length'],
    },
    solutionExplanation: 'Implements helper accumulator loops sum_packets/2 and count_packets/2 with calls in return position.',
    starterCode: `-module(tco_counter).
-export([sum_packets/1, count_packets/1]).

sum_packets(List) ->
    %% % TODO: implement tail-recursive accumulator sum_packets(List, 0)
    0.

count_packets(List) ->
    %% % TODO: implement tail-recursive accumulator count_packets(List, 0)
    0.`,
    solutionCode: `-module(tco_counter).
-export([sum_packets/1, count_packets/1]).

sum_packets(List) ->
    sum_packets_acc(List, 0).

sum_packets_acc([], Acc) ->
    Acc;
sum_packets_acc([H | T], Acc) when is_integer(H) ->
    sum_packets_acc(T, Acc + H).

count_packets(List) ->
    count_packets_acc(List, 0).

count_packets_acc([], Acc) ->
    Acc;
count_packets_acc([_H | T], Acc) ->
    count_packets_acc(T, Acc + 1).`,
    files: [
      {
        path: 'src/tco_counter.erl',
        name: 'tco_counter.erl',
        content: `-module(tco_counter).
-export([sum_packets/1, count_packets/1]).

sum_packets(List) ->
    %% % TODO: implement tail-recursive accumulator sum_packets(List, 0)
    0.

count_packets(List) ->
    %% % TODO: implement tail-recursive accumulator count_packets(List, 0)
    0.`,
      },
    ],
    solutionFiles: {
      'src/tco_counter.erl': `-module(tco_counter).
-export([sum_packets/1, count_packets/1]).

sum_packets(List) ->
    sum_packets_acc(List, 0).

sum_packets_acc([], Acc) ->
    Acc;
sum_packets_acc([H | T], Acc) when is_integer(H) ->
    sum_packets_acc(T, Acc + H).

count_packets(List) ->
    count_packets_acc(List, 0).

count_packets_acc([], Acc) ->
    Acc;
count_packets_acc([_H | T], Acc) ->
    count_packets_acc(T, Acc + 1).`,
    },
    references: [
      {
        title: 'Erlang Efficiency Guide: Myths & Tail Recursion',
        url: 'https://www.erlang.org/doc/efficiency_guide/myths.html#tail_recursive',
        category: 'erlang_docs',
        description: 'Official deep dive on when and why tail recursion prevents stack allocation on BEAM.',
      },
    ],
  },

  // ── Lesson 2.5: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch02-l05',
    chapterNumber: 2,
    lessonNumber: 5,
    lessonType: 'concept_exercise',
    title: 'The Accumulator Pattern & lists:reverse/1',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

When building a filtered or transformed list using a tail-recursive accumulator, prepending elements via \`[Item | Acc]\` produces a reversed list in \`O(1)\` time per step. Calling \`lists:reverse/1\` once at the end restores original order. Understanding why this pattern is universal in OTP is essential: in ERTS, \`lists:reverse/1\` is implemented as an ultra-fast C BIF that runs orders of magnitude faster than naive list appends (\`Acc ++ [Item]\` is \`O(N^2)\`).

## Deep Concept Breakdown & Under the Hood

\`\`\`erlang
%% CANONICAL ACCUMULATOR PATTERN:
filter_active(List) -> filter_active(List, []).

filter_active([], Acc) ->
    lists:reverse(Acc);  %% O(N) C BIF reversal restores original order
filter_active([{user, Id, active} | Rest], Acc) ->
    filter_active(Rest, [Id | Acc]);  %% O(1) prepend
filter_active([_Inactive | Rest], Acc) ->
    filter_active(Rest, Acc).
\`\`\`

**Why not \`Acc ++ [Item]\`?**
Erlang lists are singly linked from head to tail. The append operator \`++\` must copy all elements of the left list to attach the right list. Doing this inside a loop creates an **\`O(N^2)\` accidental complexity disaster** that destroys GC performance.

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (stdlib / lists)
lists:reverse(List1) -> List2
  Types:
    List1 = List2 = [T]
    T = term()
\`\`\`
> \`lists:reverse/1\` is a C Built-in Function (BIF) in the ERTS core emulator.

## Assignment Specification

Module: \`acc_filter\` · Export: \`keep_valid_orders/1\`
1. \`keep_valid_orders(Orders)\`:
   - \`Orders\` is a list of tuples: \`{order, Id, Quantity, Status}\`.
   - Filters out all orders where \`Status =/= confirmed\` or \`Quantity =< 0\`.
   - Returns a list of valid order IDs in their **original input order**.
   - Must use tail recursion with an accumulator and \`lists:reverse/1\` at the base case.

## Rules & Verification Constraints

- Must be tail-recursive.
- Must call \`lists:reverse/1\` once at the base case (\`[]\`).
- Must not use the append operator \`++\` or \`lists:filter/2\`.`,
    otpDocCards: [
      {
        functionName: 'reverse',
        module: 'lists',
        signature: 'lists:reverse(List1) -> List2',
        typesSpec: ['List1 = List2 = [T]', 'T = term()'],
        description: 'Reverses a list in O(N) time using native C memory copying.',
        complexityNote: 'O(N) time, zero Erlang reduction overhead.',
        officialUrl: 'https://www.erlang.org/doc/man/lists.html#reverse-1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/lists.erl',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch02-05-1',
        title: 'Filter Valid Orders in Order',
        erlangCall: 'acc_filter:keep_valid_orders([{order, 1, 5, confirmed}, {order, 2, 0, confirmed}, {order, 3, 10, pending}, {order, 4, 8, confirmed}])',
        expectedOutput: '[1, 4]',
        explanation: 'Keeps orders 1 and 4 in original order; excludes zero qty and pending.',
      },
    ],
    astRules: {
      requireTailRecursion: ['keep_valid_orders/1'],
      requiredCalls: ['lists:reverse/1'],
      forbiddenCalls: ['lists:filter'],
    },
    solutionExplanation: 'Uses accumulator loop with [Id | Acc] and calls lists:reverse(Acc) at base case.',
    starterCode: `-module(acc_filter).
-export([keep_valid_orders/1]).

keep_valid_orders(Orders) ->
    %% % TODO: implement tail-recursive loop with accumulator and lists:reverse
    [].`,
    solutionCode: `-module(acc_filter).
-export([keep_valid_orders/1]).

keep_valid_orders(Orders) ->
    keep_valid_orders(Orders, []).

keep_valid_orders([], Acc) ->
    lists:reverse(Acc);
keep_valid_orders([{order, Id, Qty, confirmed} | Rest], Acc) when is_integer(Qty), Qty > 0 ->
    keep_valid_orders(Rest, [Id | Acc]);
keep_valid_orders([_Invalid | Rest], Acc) ->
    keep_valid_orders(Rest, Acc).`,
    files: [
      {
        path: 'src/acc_filter.erl',
        name: 'acc_filter.erl',
        content: `-module(acc_filter).
-export([keep_valid_orders/1]).

keep_valid_orders(Orders) ->
    %% % TODO: implement tail-recursive loop with accumulator and lists:reverse
    [].`,
      },
    ],
    solutionFiles: {
      'src/acc_filter.erl': `-module(acc_filter).
-export([keep_valid_orders/1]).

keep_valid_orders(Orders) ->
    keep_valid_orders(Orders, []).

keep_valid_orders([], Acc) ->
    lists:reverse(Acc);
keep_valid_orders([{order, Id, Qty, confirmed} | Rest], Acc) when is_integer(Qty), Qty > 0 ->
    keep_valid_orders(Rest, [Id | Acc]);
keep_valid_orders([_Invalid | Rest], Acc) ->
    keep_valid_orders(Rest, Acc).`,
    },
    references: [
      {
        title: 'lists:reverse/1 Documentation',
        url: 'https://www.erlang.org/doc/man/lists.html#reverse-1',
        category: 'erlang_docs',
        description: 'Standard library reference explaining why reverse is a C BIF.',
      },
    ],
  },

  // ── Lesson 2.6: Problem Set (Inventory Order Processor) ──────────────────
  {
    id: 'ch02-l06',
    chapterNumber: 2,
    lessonNumber: 6,
    lessonType: 'problem_set',
    title: 'Assignment: Inventory Order Processor',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

Inventory management is a canonical example of stateful sequential computation. In real systems like Amazon FBA, Zalando, or airline seat reservation engines, stock counters must be modified atomically and correctly under high-throughput order streams.

The Erlang/OTP approach uses **tail-recursive accumulator loops** instead of mutable arrays or \`lists:foldl/3\`. This keeps stack memory constant regardless of order volume — a critical BEAM VM property called **Tail Call Optimization (TCO)**.

## Deep Concept Breakdown & Under the Hood

A **tail-recursive** function makes its recursive call in the **return position** — no pending computation after the call. The BEAM VM converts this into a \`call_last\`/\`call_only\` bytecode opcode, reusing the current stack frame.

\`\`\`erlang
%% WRONG: body-recursive (grows stack O(n))
total([], Acc) -> Acc;
total([{order, _, Qty, Price} | Rest], Acc) ->
    (Qty * Price) + total(Rest, Acc).   %% call NOT in tail position

%% CORRECT: accumulator tail-recursive (O(1) stack)
total([], Acc) -> Acc;
total([{order, _, Qty, Price} | Rest], Acc) ->
    total(Rest, Acc + Qty * Price).     %% call IS in tail position
\`\`\`

> The BEAM's \`beam_disasm:file/1\` reveals \`call_last\` opcodes for tail calls vs \`call\` opcodes for body-recursive calls. BeamForge's AST verifier checks both.

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Reversing accumulator list
lists:reverse(List1) -> List2

%% Clamping stock counters
erlang:max(Term1, Term2) -> Maximum
\`\`\`

## Assignment Specification

Module: \`inventory\` · Export: \`process_order/2\`, \`calculate_order_total/2\`, \`restock/2\`

**Data Types:**
\`\`\`erlang
Inventory = [{product, Id, Name, Price, Stock}]
Orders    = [{order, ProductId, Quantity}]
Restocks  = [{ProductId, AddQty}]
\`\`\`

**Expected Behaviour (sample data):**
\`\`\`erlang
Inv    = [{product, 1, "Keyboard", 50, 10},
          {product, 2, "Mouse",    25,  5},
          {product, 3, "Monitor", 200,  2}],
Orders = [{order, 1, 2}, {order, 2, 3}, {order, 3, 5}].

inventory:process_order(Inv, Orders)
  => [{product,1,"Keyboard",50,8},
      {product,2,"Mouse",25,2},
      {product,3,"Monitor",200,2}]   %% Monitor: capped at 0 → 2 remaining

inventory:calculate_order_total(Inv, Orders) => 175
inventory:restock(ProcessedInv, [{1,5},{2,10}])
  => [{product,1,"Keyboard",50,13},
      {product,2,"Mouse",25,12},
      {product,3,"Monitor",200,2}]
\`\`\`

## Rules & Verification Constraints

- **Must use tail recursion** for \`process_order/2\`, \`calculate_order_total/2\`, \`restock/2\` (and all helper loops). The BEAM bytecode verifier checks for \`call_last\`/\`call_only\` opcodes.
- **Forbidden calls**: \`lists:sum/1\`, \`lists:map/2\`, \`lists:foldl/3\`, \`lists:filter/2\`.
- **Forbidden constructs**: list comprehensions \`[X || X <- List]\`.
- **Required**: Manual accumulator recursion matching the exact data format above.`,
    otpDocCards: [
      {
        functionName: 'reverse',
        module: 'lists',
        signature: 'lists:reverse(List1) -> List2',
        typesSpec: ['List1 = List2 = [T]', 'T = term()'],
        description: 'Reverses a list in O(n) time. Used at the end of accumulator loops.',
        complexityNote: 'O(n) time, O(n) space.',
        officialUrl: 'https://www.erlang.org/doc/man/lists.html#reverse-1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/lists.erl',
      },
      {
        functionName: 'max',
        module: 'erlang',
        signature: 'erlang:max(Term1, Term2) -> Maximum',
        typesSpec: ['Term1 = Term2 = Maximum = term()'],
        description: 'Returns largest of two terms. Use max(0, Stock - Qty) to floor stock at zero.',
        complexityNote: 'O(1) comparison BIF.',
        officialUrl: 'https://www.erlang.org/doc/man/erlang.html#max-2',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch02-06-1',
        title: 'process_order/2 deducts stock correctly',
        erlangCall: 'inventory:process_order(Inventory, Orders)',
        expectedOutput: '[{product,1,"Keyboard",50,8}, {product,2,"Mouse",25,2}, {product,3,"Monitor",200,2}]',
        explanation: 'Orders deduct from stock; Monitor stock floors at 0 (2 remaining since only 2 in stock).',
      },
      {
        id: 'tc-ch02-06-2',
        title: 'calculate_order_total/2 sums order cost',
        erlangCall: 'inventory:calculate_order_total(Inventory, Orders)',
        expectedOutput: '175',
        explanation: 'Keyboard: 2*50=100. Mouse: 3*25=75. Monitor: 0 items fulfilled (0*200=0). Total = 175.',
      },
      {
        id: 'tc-ch02-06-3',
        title: 'restock/2 updates product quantities',
        erlangCall: 'inventory:restock(Inventory, [{1, 5}, {2, 10}])',
        expectedOutput: '[{product,1,"Keyboard",50,15}, {product,2,"Mouse",25,15}, {product,3,"Monitor",200,2}]',
        explanation: 'Adds 5 to Keyboard (10->15) and 10 to Mouse (5->15). Monitor unchanged.',
      },
    ],
    astRules: {
      requireTailRecursion: ['process_order/2', 'calculate_order_total/2', 'restock/2'],
      forbiddenCalls: ['lists:sum', 'lists:map', 'lists:foldl', 'lists:filter', 'lists:foldr'],
      forbiddenConstructs: ['list_comprehension'],
    },
    solutionExplanation: 'Complete tail-recursive solution with helper accumulators and lists:reverse/1.',
    starterCode: `-module(inventory).
-export([process_order/2, calculate_order_total/2, restock/2]).

%% % TODO: Implement process_order/2 using tail recursion
process_order(Inventory, Orders) ->
    Inventory.

%% % TODO: Implement calculate_order_total/2 using tail recursion
calculate_order_total(Inventory, Orders) ->
    0.

%% % TODO: Implement restock/2 using tail recursion
restock(Inventory, Restocks) ->
    Inventory.`,
    solutionCode: `-module(inventory).
-export([process_order/2, calculate_order_total/2, restock/2]).

process_order(Inventory, Orders) ->
    process_orders_loop(Orders, Inventory).

process_orders_loop([], AccInv) ->
    AccInv;
process_orders_loop([{order, ProdId, Qty} | Rest], AccInv) ->
    Updated = deduct_stock(AccInv, ProdId, Qty, []),
    process_orders_loop(Rest, Updated).

deduct_stock([], _ProdId, _Qty, Acc) ->
    lists:reverse(Acc);
deduct_stock([{product, Id, Name, Price, Stock} | Rest], ProdId, Qty, Acc)
  when Id =:= ProdId andalso Stock >= Qty ->
    deduct_stock(Rest, ProdId, Qty, [{product, Id, Name, Price, Stock - Qty} | Acc]);
deduct_stock([{product, Id, Name, Price, Stock} | Rest], ProdId, Qty, Acc)
  when Id =:= ProdId ->
    deduct_stock(Rest, ProdId, Qty, [{product, Id, Name, Price, Stock} | Acc]);
deduct_stock([Prod | Rest], ProdId, Qty, Acc) ->
    deduct_stock(Rest, ProdId, Qty, [Prod | Acc]).

calculate_order_total(Inventory, Orders) ->
    calc_total_loop(Orders, Inventory, 0).

calc_total_loop([], _Inv, Total) ->
    Total;
calc_total_loop([{order, ProdId, Qty} | Rest], Inv, Total) ->
    ItemCost = case find_product(Inv, ProdId) of
        {ok, {product, _, _, Price, Stock}} when Stock >= Qty -> Qty * Price;
        {ok, {product, _, _, Price, Stock}} when Stock > 0     -> Stock * Price;
        _                                                      -> 0
    end,
    calc_total_loop(Rest, Inv, Total + ItemCost).

find_product([], _ProdId) -> not_found;
find_product([{product, Id, _, _, _} = Prod | _], ProdId) when Id =:= ProdId -> {ok, Prod};
find_product([_ | Rest], ProdId) -> find_product(Rest, ProdId).

restock(Inventory, Restocks) ->
    restock_loop(Restocks, Inventory).

restock_loop([], AccInv) ->
    AccInv;
restock_loop([{ProdId, Qty} | Rest], AccInv) ->
    Updated = add_stock(AccInv, ProdId, Qty, []),
    restock_loop(Rest, Updated).

add_stock([], _ProdId, _Qty, Acc) ->
    lists:reverse(Acc);
add_stock([{product, Id, Name, Price, Stock} | Rest], ProdId, Qty, Acc) when Id =:= ProdId ->
    add_stock(Rest, ProdId, Qty, [{product, Id, Name, Price, Stock + Qty} | Acc]);
add_stock([Prod | Rest], ProdId, Qty, Acc) ->
    add_stock(Rest, ProdId, Qty, [Prod | Acc]).`,
    files: [
      {
        path: 'src/inventory.erl',
        name: 'inventory.erl',
        content: `-module(inventory).
-export([process_order/2, calculate_order_total/2, restock/2]).

%% % TODO: Implement process_order/2 using tail recursion
process_order(Inventory, Orders) ->
    Inventory.

%% % TODO: Implement calculate_order_total/2 using tail recursion
calculate_order_total(Inventory, Orders) ->
    0.

%% % TODO: Implement restock/2 using tail recursion
restock(Inventory, Restocks) ->
    Inventory.`,
      },
    ],
    solutionFiles: {
      'src/inventory.erl': `-module(inventory).
-export([process_order/2, calculate_order_total/2, restock/2]).

process_order(Inventory, Orders) ->
    process_orders_loop(Orders, Inventory).

process_orders_loop([], AccInv) ->
    AccInv;
process_orders_loop([{order, ProdId, Qty} | Rest], AccInv) ->
    Updated = deduct_stock(AccInv, ProdId, Qty, []),
    process_orders_loop(Rest, Updated).

deduct_stock([], _ProdId, _Qty, Acc) ->
    lists:reverse(Acc);
deduct_stock([{product, Id, Name, Price, Stock} | Rest], ProdId, Qty, Acc)
  when Id =:= ProdId andalso Stock >= Qty ->
    deduct_stock(Rest, ProdId, Qty, [{product, Id, Name, Price, Stock - Qty} | Acc]);
deduct_stock([{product, Id, Name, Price, Stock} | Rest], ProdId, Qty, Acc)
  when Id =:= ProdId ->
    deduct_stock(Rest, ProdId, Qty, [{product, Id, Name, Price, Stock} | Acc]);
deduct_stock([Prod | Rest], ProdId, Qty, Acc) ->
    deduct_stock(Rest, ProdId, Qty, [Prod | Acc]).

calculate_order_total(Inventory, Orders) ->
    calc_total_loop(Orders, Inventory, 0).

calc_total_loop([], _Inv, Total) ->
    Total;
calc_total_loop([{order, ProdId, Qty} | Rest], Inv, Total) ->
    ItemCost = case find_product(Inv, ProdId) of
        {ok, {product, _, _, Price, Stock}} when Stock >= Qty -> Qty * Price;
        {ok, {product, _, _, Price, Stock}} when Stock > 0     -> Stock * Price;
        _                                                      -> 0
    end,
    calc_total_loop(Rest, Inv, Total + ItemCost).

find_product([], _ProdId) -> not_found;
find_product([{product, Id, _, _, _} = Prod | _], ProdId) when Id =:= ProdId -> {ok, Prod};
find_product([_ | Rest], ProdId) -> find_product(Rest, ProdId).

restock(Inventory, Restocks) ->
    restock_loop(Restocks, Inventory).

restock_loop([], AccInv) ->
    AccInv;
restock_loop([{ProdId, Qty} | Rest], AccInv) ->
    Updated = add_stock(AccInv, ProdId, Qty, []),
    restock_loop(Rest, Updated).

add_stock([], _ProdId, _Qty, Acc) ->
    lists:reverse(Acc);
add_stock([{product, Id, Name, Price, Stock} | Rest], ProdId, Qty, Acc) when Id =:= ProdId ->
    add_stock(Rest, ProdId, Qty, [{product, Id, Name, Price, Stock + Qty} | Acc]);
add_stock([Prod | Rest], ProdId, Qty, Acc) ->
    add_stock(Rest, ProdId, Qty, [Prod | Acc]).`,
    },
    references: [
      {
        title: 'lists:reverse/1 Documentation',
        url: 'https://www.erlang.org/doc/man/lists.html#reverse-1',
        category: 'erlang_docs',
        description: 'Standard library reference explaining why reverse is a C BIF.',
      },
      {
        title: 'erlang:max/2 BIF Reference',
        url: 'https://www.erlang.org/doc/man/erlang.html#max-2',
        category: 'erlang_docs',
        description: 'BIF comparing any two Erlang terms and returning the greater one.',
      },
    ],
  },
];

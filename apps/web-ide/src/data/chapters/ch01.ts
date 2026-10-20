import { LessonContent } from '../../types/workspace';

export const CHAPTER_1_LESSONS: LessonContent[] = [
  // ── Lesson 1.1: Guided Demo ──────────────────────────────────────────────
  {
    id: 'ch01-l01',
    chapterNumber: 1,
    lessonNumber: 1,
    lessonType: 'guided_demo',
    title: 'Introduction to Erlang, The BEAM VM & "Let It Crash"',
    difficulty: 'Beginner',
    conceptMarkdown: `## Why This Matters in Production

In 1986, Ericsson engineers Joe Armstrong, Robert Virding, and Mike Williams designed Erlang to operate telecommunication switches requiring **nine nines (99.9999999%) availability**. Today, the same runtime engine — the Bogdan's Erlang Abstract Machine (BEAM) — powers WhatsApp (processing billions of messages daily on fewer than 100 engineers), Discord's guild infrastructure, Bet365's real-time sports betting ledger, and RabbitMQ messaging brokers.

The cornerstone philosophy of Erlang is **"Let It Crash"**. Rather than defensive programming with thousands of nested null checks or rescue blocks, Erlang isolates faults into lightweight actor processes and relies on supervision trees to clean up and restart failing subsystems in microseconds.

## Deep Concept Breakdown & Under the Hood

Unlike operating system threads that consume 1MB+ stack allocations, a BEAM process begins with only **309 words of memory** (~2.5 KB on 64-bit platforms). A single machine can easily host millions of concurrent processes.

Every BEAM node runs an asynchronous preemptive scheduler per available CPU core. Schedulers count **reductions** (a function call or BIF invocation) — after 4,000 reductions, a process is preempted and yields to the next runnable process in the queue. This prevents any single compute-heavy task from starving network I/O or low-latency messaging.

\`\`\`erlang
%% Inspecting the live virtual machine
Schedulers = erlang:system_info(schedulers_online),
MaxProcs   = erlang:system_info(process_limit),
OtpRel     = erlang:system_info(otp_release).
\`\`\`

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (erts / erlang)
erlang:system_info(Item) -> Info
  Types:
    Item = schedulers_online | process_limit | atom_limit | otp_release | term()
    Info = term()
\`\`\`
> \`erlang:system_info/1\` is a C-implemented Built-In Function (BIF) providing zero-overhead introspection into the host emulator.

## Assignment Specification

This is a **Guided Runnable Demo**. The code below is already complete.
1. Inspect the pre-written module \`beam_intro.erl\`.
2. Notice how it calls \`erlang:system_info/1\` to query live BEAM VM internals.
3. Click **▷ Run** below to run the live BEAM diagnostic probe.

## Rules & Verification Constraints

- No code edits required — run the module to verify that your session is connected to a live Erlang/OTP 29 runtime.
- Verification passes when \`beam_intro:inspect_vm/0\` returns a map containing \`otp_release\`, \`schedulers_online\`, \`process_limit\`, and \`atom_limit\`.`,
    otpDocCards: [
      {
        functionName: 'system_info',
        module: 'erlang',
        signature: 'erlang:system_info(Item) -> Info',
        typesSpec: ['Item = schedulers_online | process_limit | atom_limit | otp_release', 'Info = term()'],
        description: 'Returns information about the current BEAM emulator instance.',
        complexityNote: 'O(1) C BIF lookup directly reading internal ERTS state tables.',
        officialUrl: 'https://www.erlang.org/doc/man/erlang.html#system_info-1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/erts/emulator/beam/bif.c',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch01-01',
        title: 'Query Live BEAM Engine Telemetry',
        erlangCall: 'beam_intro:inspect_vm()',
        expectedOutput: '#{atom_limit => 1048576, otp_release => <<"29">>, ...}',
        explanation: 'Calls erlang:system_info/1 on OTP 29 and formats emulator properties into a diagnostic map.',
      },
    ],
    astRules: {
      requiredCalls: ['erlang:system_info/1'],
    },
    solutionExplanation: 'The module queries the ERTS runtime using erlang:system_info/1 and formats metrics into an immutable map.',
    starterCode: `-module(beam_intro).
-export([inspect_vm/0]).

%% @doc Query the live Erlang runtime for emulator parameters.
inspect_vm() ->
    OtpRel = list_to_binary(erlang:system_info(otp_release)),
    Schedulers = erlang:system_info(schedulers_online),
    ProcLimit = erlang:system_info(process_limit),
    AtomLimit = erlang:system_info(atom_limit),
    io:format("[BEAM Probe] OTP Release: ~s | Schedulers: ~p | Process Limit: ~p~n",
              [OtpRel, Schedulers, ProcLimit]),
    #{
        otp_release => OtpRel,
        schedulers_online => Schedulers,
        process_limit => ProcLimit,
        atom_limit => AtomLimit
    }.`,
    solutionCode: `-module(beam_intro).
-export([inspect_vm/0]).

inspect_vm() ->
    OtpRel = list_to_binary(erlang:system_info(otp_release)),
    Schedulers = erlang:system_info(schedulers_online),
    ProcLimit = erlang:system_info(process_limit),
    AtomLimit = erlang:system_info(atom_limit),
    #{
        otp_release => OtpRel,
        schedulers_online => Schedulers,
        process_limit => ProcLimit,
        atom_limit => AtomLimit
    }.`,
    files: [
      {
        path: 'src/beam_intro.erl',
        name: 'beam_intro.erl',
        content: `-module(beam_intro).
-export([inspect_vm/0]).

inspect_vm() ->
    OtpRel = list_to_binary(erlang:system_info(otp_release)),
    Schedulers = erlang:system_info(schedulers_online),
    ProcLimit = erlang:system_info(process_limit),
    AtomLimit = erlang:system_info(atom_limit),
    io:format("[BEAM Probe] OTP Release: ~s | Schedulers: ~p | Process Limit: ~p~n",
              [OtpRel, Schedulers, ProcLimit]),
    #{
        otp_release => OtpRel,
        schedulers_online => Schedulers,
        process_limit => ProcLimit,
        atom_limit => AtomLimit
    }.`,
      },
    ],
    solutionFiles: {
      'src/beam_intro.erl': `-module(beam_intro).
-export([inspect_vm/0]).

inspect_vm() ->
    OtpRel = list_to_binary(erlang:system_info(otp_release)),
    Schedulers = erlang:system_info(schedulers_online),
    ProcLimit = erlang:system_info(process_limit),
    AtomLimit = erlang:system_info(atom_limit),
    #{
        otp_release => OtpRel,
        schedulers_online => Schedulers,
        process_limit => ProcLimit,
        atom_limit => AtomLimit
    }.`,
    },
    references: [
      {
        title: 'Erlang Runtime System (ERTS) Guide',
        url: 'https://www.erlang.org/doc/system/system_principles.html',
        category: 'erlang_docs',
        description: 'Official OTP principles detailing the BEAM scheduler model and process allocation.',
      },
    ],
  },

  // ── Lesson 1.2: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch01-l02',
    chapterNumber: 1,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'The Erlang Shell, Expressions & Basic Data Types',
    difficulty: 'Beginner',
    conceptMarkdown: `## Why This Matters in Production

In high-volume network backends, calculations for bandwidth allocations, packet chunking, and memory buffer alignment require exact arithmetic semantics. Erlang supports arbitrary-precision integers (bignums) that never overflow, IEEE 754 64-bit floats, and short-circuit boolean operations.

## Deep Concept Breakdown & Under the Hood

In Erlang:
- **Integer Division**: Use \`div\` (e.g. \`10 div 3 => 3\`).
- **Remainder**: Use \`rem\` (e.g. \`10 rem 3 => 1\`).
- **Float Division**: The \`/\` operator *always* returns a float (e.g. \`4 / 2 => 2.0\`).
- **Booleans**: Booleans in Erlang are simply the atoms \`true\` and \`false\`. Use short-circuit operators \`andalso\` and \`orelse\` rather than \`and\` / \`or\` to prevent unnecessary right-hand side evaluation.

\`\`\`erlang
%% Examples
BandwidthKbps = (TotalBytes * 8) div (DurationSec * 1000).
IsAllowed = (UserRole =:= admin) orelse (Credits > 0).
\`\`\`

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Integer division and remainder BIFs
div(X, Y) -> integer()
rem(X, Y) -> integer()
\`\`\`
> Integer arithmetic on the BEAM automatically upgrades small fixnums (stored directly in a machine word with tag bits) to heap-allocated bignums when exceeding platform register size.

## Assignment Specification

Module: \`basic_types\` · Export: \`classify_value/1\`, \`calculate_bandwidth/2\`
1. \`classify_value(Val)\`:
   - If \`Val\` is an integer, return \`{ok, integer}\`.
   - If \`Val\` is a float, return \`{ok, float}\`.
   - If \`Val\` is a boolean (\`true\` or \`false\`), return \`{ok, boolean}\`.
   - Otherwise, return \`{error, unknown}\`.
2. \`calculate_bandwidth(Bytes, Seconds)\`:
   - Returns total whole bits per second using integer division: \`(Bytes * 8) div Seconds\`.

## Rules & Verification Constraints

- Use guard functions \`is_integer/1\`, \`is_float/1\`, \`is_boolean/1\`.
- No floating-point division \`/\` in \`calculate_bandwidth/2\` — must use \`div\`.`,
    otpDocCards: [
      {
        functionName: 'is_integer',
        module: 'erlang',
        signature: 'erlang:is_integer(Term) -> boolean()',
        typesSpec: ['Term = term()', 'Returns true if Term is an integer, else false'],
        description: 'Guard BIF checking whether a term is an integer.',
        complexityNote: 'O(1) bit-tag check in VM register.',
        officialUrl: 'https://www.erlang.org/doc/man/erlang.html#is_integer-1',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch01-02-1',
        title: 'Classify Integer Value',
        erlangCall: 'basic_types:classify_value(42)',
        expectedOutput: '{ok, integer}',
        explanation: '42 is an integer fixnum.',
      },
      {
        id: 'tc-ch01-02-2',
        title: 'Calculate Bandwidth Bits Per Second',
        erlangCall: 'basic_types:calculate_bandwidth(1250, 2)',
        expectedOutput: '5000',
        explanation: '(1250 * 8) div 2 = 5000 bps.',
      },
    ],
    astRules: {
      requiredConstructs: ['guards'],
    },
    solutionExplanation: 'Uses function clause guards (is_integer, is_float, is_boolean) and integer div arithmetic.',
    starterCode: `-module(basic_types).
-export([classify_value/1, calculate_bandwidth/2]).

classify_value(Val) when is_integer(Val) ->
    %% % TODO: return {ok, integer}
    {error, not_implemented};
classify_value(Val) when is_float(Val) ->
    {error, not_implemented};
classify_value(Val) when is_boolean(Val) ->
    {error, not_implemented};
classify_value(_) ->
    {error, unknown}.

calculate_bandwidth(Bytes, Seconds) ->
    %% % TODO: compute (Bytes * 8) div Seconds
    0.`,
    solutionCode: `-module(basic_types).
-export([classify_value/1, calculate_bandwidth/2]).

classify_value(Val) when is_integer(Val) -> {ok, integer};
classify_value(Val) when is_float(Val)   -> {ok, float};
classify_value(Val) when is_boolean(Val) -> {ok, boolean};
classify_value(_)                        -> {error, unknown}.

calculate_bandwidth(Bytes, Seconds) when is_integer(Bytes), is_integer(Seconds), Seconds > 0 ->
    (Bytes * 8) div Seconds.`,
    files: [
      {
        path: 'src/basic_types.erl',
        name: 'basic_types.erl',
        content: `-module(basic_types).
-export([classify_value/1, calculate_bandwidth/2]).

classify_value(Val) when is_integer(Val) ->
    %% % TODO: return {ok, integer}
    {error, not_implemented};
classify_value(Val) when is_float(Val) ->
    {error, not_implemented};
classify_value(Val) when is_boolean(Val) ->
    {error, not_implemented};
classify_value(_) ->
    {error, unknown}.

calculate_bandwidth(Bytes, Seconds) ->
    %% % TODO: compute (Bytes * 8) div Seconds
    0.`,
      },
    ],
    solutionFiles: {
      'src/basic_types.erl': `-module(basic_types).
-export([classify_value/1, calculate_bandwidth/2]).

classify_value(Val) when is_integer(Val) -> {ok, integer};
classify_value(Val) when is_float(Val)   -> {ok, float};
classify_value(Val) when is_boolean(Val) -> {ok, boolean};
classify_value(_)                        -> {error, unknown}.

calculate_bandwidth(Bytes, Seconds) when is_integer(Bytes), is_integer(Seconds), Seconds > 0 ->
    (Bytes * 8) div Seconds.`,
    },
    references: [
      {
        title: 'Erlang Data Types & Operators',
        url: 'https://www.erlang.org/doc/reference_manual/expressions.html#arithmetic-expressions',
        category: 'erlang_docs',
        description: 'Official specification of arithmetic and boolean operators in Erlang expressions.',
      },
    ],
  },

  // ── Lesson 1.3: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch01-l03',
    chapterNumber: 1,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Atoms & Tuples: Representing Structured Telecom Events',
    difficulty: 'Beginner',
    conceptMarkdown: `## Why This Matters in Production

In Ericsson's AXD 301 telecom switches, every telephone call initiation, routing decision, and termination is modeled as an immutable tuple tagged with an atom, such as \`{call_event, CallId, Caller, Callee, DurationSec}\`. Atoms provide constant-time \`O(1)\` equality comparisons, and tuples provide constant-time indexed access on the BEAM heap.

## Deep Concept Breakdown & Under the Hood

An **atom** is a constant whose name is its value. Atoms are stored in a global system-wide **Atom Table** (default limit 1,048,576 atoms). Comparing two atoms in Erlang is a single machine pointer comparison (\`O(1)\`), making tagged tuples the most efficient data structure on the BEAM.

A **tuple** is a fixed-size container of elements:
\`\`\`erlang
Event = {call_event, 1001, <<"alice">>, <<"bob">>, 45}.
%% Extracting elements:
{call_event, Id, Caller, Callee, Duration} = Event.
\`\`\`

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Creating and destructuring tuples
Tuple = {Tag, Elem1, Elem2, ...}
element(N, Tuple) -> term()
setelement(N, Tuple, NewElem) -> NewTuple
\`\`\`
> Pattern matching in function heads is preferred over \`element/2\` because the compiler emits single-instruction deconstruction bytecode (\`get_tuple_element\`).

## Assignment Specification

Module: \`telecom_events\` · Export: \`make_event/3\`, \`extract_caller/1\`, \`swap_endpoints/1\`
1. \`make_event(Id, Caller, Callee)\`:
   - Returns a 5-tuple: \`{call_event, Id, Caller, Callee, 0}\` (initial duration 0).
2. \`extract_caller(Event)\`:
   - Matches \`{call_event, _Id, Caller, _Callee, _Duration}\` and returns \`Caller\`.
3. \`swap_endpoints(Event)\`:
   - Matches \`{call_event, Id, Caller, Callee, Duration}\` and returns a new tuple with \`Caller\` and \`Callee\` swapped: \`{call_event, Id, Callee, Caller, Duration}\`.

## Rules & Verification Constraints

- Pattern match on tuples directly in function clauses.
- Do not use \`element/2\` or \`setelement/3\`.`,
    otpDocCards: [
      {
        functionName: 'element',
        module: 'erlang',
        signature: 'erlang:element(N, Tuple) -> Value',
        typesSpec: ['N = pos_integer()', 'Tuple = tuple()', 'Value = term()'],
        description: 'Returns the N-th element of a tuple (1-indexed).',
        complexityNote: 'O(1) memory lookup.',
        officialUrl: 'https://www.erlang.org/doc/man/erlang.html#element-2',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch01-03-1',
        title: 'Create Call Event Tuple',
        erlangCall: 'telecom_events:make_event(101, <<"alice">>, <<"bob">>)',
        expectedOutput: '{call_event, 101, <<"alice">>, <<"bob">>, 0}',
        explanation: 'Generates tagged 5-tuple with 0 initial duration.',
      },
      {
        id: 'tc-ch01-03-2',
        title: 'Swap Call Endpoints',
        erlangCall: 'telecom_events:swap_endpoints({call_event, 101, <<"alice">>, <<"bob">>, 120})',
        expectedOutput: '{call_event, 101, <<"bob">>, <<"alice">>, 120}',
        explanation: 'Swaps Caller and Callee positions while preserving other fields.',
      },
    ],
    astRules: {
      forbiddenCalls: ['erlang:element', 'erlang:setelement'],
    },
    solutionExplanation: 'Direct pattern matching on {call_event, Id, Caller, Callee, Duration} tuples.',
    starterCode: `-module(telecom_events).
-export([make_event/3, extract_caller/1, swap_endpoints/1]).

make_event(Id, Caller, Callee) ->
    %% % TODO: return {call_event, Id, Caller, Callee, 0}
    {error, not_implemented}.

extract_caller(Event) ->
    %% % TODO: pattern match Event and return Caller
    {error, not_implemented}.

swap_endpoints(Event) ->
    %% % TODO: swap Caller and Callee
    {error, not_implemented}.`,
    solutionCode: `-module(telecom_events).
-export([make_event/3, extract_caller/1, swap_endpoints/1]).

make_event(Id, Caller, Callee) ->
    {call_event, Id, Caller, Callee, 0}.

extract_caller({call_event, _Id, Caller, _Callee, _Duration}) ->
    Caller.

swap_endpoints({call_event, Id, Caller, Callee, Duration}) ->
    {call_event, Id, Callee, Caller, Duration}.`,
    files: [
      {
        path: 'src/telecom_events.erl',
        name: 'telecom_events.erl',
        content: `-module(telecom_events).
-export([make_event/3, extract_caller/1, swap_endpoints/1]).

make_event(Id, Caller, Callee) ->
    %% % TODO: return {call_event, Id, Caller, Callee, 0}
    {error, not_implemented}.

extract_caller(Event) ->
    %% % TODO: pattern match Event and return Caller
    {error, not_implemented}.

swap_endpoints(Event) ->
    %% % TODO: swap Caller and Callee
    {error, not_implemented}.`,
      },
    ],
    solutionFiles: {
      'src/telecom_events.erl': `-module(telecom_events).
-export([make_event/3, extract_caller/1, swap_endpoints/1]).

make_event(Id, Caller, Callee) ->
    {call_event, Id, Caller, Callee, 0}.

extract_caller({call_event, _Id, Caller, _Callee, _Duration}) ->
    Caller.

swap_endpoints({call_event, Id, Caller, Callee, Duration}) ->
    {call_event, Id, Callee, Caller, Duration}.`,
    },
    references: [
      {
        title: 'Erlang Tuples Reference',
        url: 'https://www.erlang.org/doc/reference_manual/data_types.html#tuple',
        category: 'erlang_docs',
        description: 'Official documentation on tuple notation and memory representation.',
      },
    ],
  },

  // ── Lesson 1.4: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch01-l04',
    chapterNumber: 1,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'Lists, Head/Tail [H | T] & Strings vs Binaries',
    difficulty: 'Beginner',
    conceptMarkdown: `## Why This Matters in Production

In Erlang, lists are singly-linked lists built of 2-word **cons cells** \`[Head | Tail]\`. Prepending an element to the front of a list is \`O(1)\` time and requires zero copying. Understanding how lists behave under memory pressure is crucial: double-quoted strings in Erlang (e.g., \`"hello"\`) are actually lists of integers (ASCII/Unicode code points), which consume 16 bytes of memory per character on a 64-bit BEAM. For high-performance payloads, production systems use binaries (\`<<"hello">>\`), but lists remain the primary data structure for sequential collections.

## Deep Concept Breakdown & Under the Hood

A list cell consists of two pointers: one pointing to the element (\`Head\`), and one pointing to the remainder of the list (\`Tail\`).
- Constructing: \`[NewItem | ExistingList]\` -> \`O(1)\` cost.
- Destructuring: \`[First, Second | Rest] = MyList\` matches the first two elements and binds the remaining tail.

\`\`\`erlang
[H | T] = [1, 2, 3].
%% H = 1
%% T = [2, 3]
\`\`\`

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Standard list operations (stdlib / lists)
hd(List) -> Elem
tl(List) -> TailList
\`\`\`
> Prefer pattern matching \`[H | T]\` in function clauses over calling \`hd/1\` and \`tl/1\`, as pattern matching guards against badarg crashes on empty lists.

## Assignment Specification

Module: \`list_ops\` · Export: \`first_two/1\`, \`prepend_header/2\`, \`list_head_or_default/2\`
1. \`first_two(List)\`:
   - If \`List\` has at least 2 elements, return \`{ok, Elem1, Elem2}\`.
   - Otherwise, return \`{error, insufficient_elements}\`.
2. \`prepend_header(Header, Packets)\`:
   - Prepends \`Header\` to \`Packets\` in \`O(1)\` time returning \`[Header | Packets]\`.
3. \`list_head_or_default(List, Default)\`:
   - If \`List\` is non-empty \`[H | _]\`, return \`H\`.
   - If \`List\` is \`[]\`, return \`Default\`.

## Rules & Verification Constraints

- Must use pattern matching with \`[H | T]\` syntax.
- Do not use \`hd/1\` or \`tl/1\`.`,
    otpDocCards: [
      {
        functionName: 'hd',
        module: 'erlang',
        signature: 'hd(List) -> Element',
        typesSpec: ['List = [T, ...]', 'Element = T'],
        description: 'Returns the first element of a non-empty list.',
        complexityNote: 'O(1) pointer dereference.',
        officialUrl: 'https://www.erlang.org/doc/man/erlang.html#hd-1',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch01-04-1',
        title: 'Extract First Two Elements',
        erlangCall: 'list_ops:first_two([10, 20, 30])',
        expectedOutput: '{ok, 10, 20}',
        explanation: 'Destructures first two elements from 3-element list.',
      },
      {
        id: 'tc-ch01-04-2',
        title: 'Head of Empty List Returns Default',
        erlangCall: 'list_ops:list_head_or_default([], 999)',
        expectedOutput: '999',
        explanation: 'Safely falls back to default on empty list.',
      },
    ],
    astRules: {
      forbiddenCalls: ['erlang:hd', 'erlang:tl'],
    },
    solutionExplanation: 'Uses [H1, H2 | _] and [H | _] head/tail pattern matching clauses.',
    starterCode: `-module(list_ops).
-export([first_two/1, prepend_header/2, list_head_or_default/2]).

first_two(List) ->
    %% % TODO: match [E1, E2 | _] -> {ok, E1, E2}; _ -> {error, insufficient_elements}
    {error, not_implemented}.

prepend_header(Header, Packets) ->
    %% % TODO: prepend Header to Packets
    [].

list_head_or_default(List, Default) ->
    %% % TODO: return head or default
    Default.`,
    solutionCode: `-module(list_ops).
-export([first_two/1, prepend_header/2, list_head_or_default/2]).

first_two([E1, E2 | _Rest]) ->
    {ok, E1, E2};
first_two(_) ->
    {error, insufficient_elements}.

prepend_header(Header, Packets) ->
    [Header | Packets].

list_head_or_default([H | _], _Default) ->
    H;
list_head_or_default([], Default) ->
    Default.`,
    files: [
      {
        path: 'src/list_ops.erl',
        name: 'list_ops.erl',
        content: `-module(list_ops).
-export([first_two/1, prepend_header/2, list_head_or_default/2]).

first_two(List) ->
    %% % TODO: match [E1, E2 | _] -> {ok, E1, E2}; _ -> {error, insufficient_elements}
    {error, not_implemented}.

prepend_header(Header, Packets) ->
    %% % TODO: prepend Header to Packets
    [].

list_head_or_default(List, Default) ->
    %% % TODO: return head or default
    Default.`,
      },
    ],
    solutionFiles: {
      'src/list_ops.erl': `-module(list_ops).
-export([first_two/1, prepend_header/2, list_head_or_default/2]).

first_two([E1, E2 | _Rest]) ->
    {ok, E1, E2};
first_two(_) ->
    {error, insufficient_elements}.

prepend_header(Header, Packets) ->
    [Header | Packets].

list_head_or_default([H | _], _Default) ->
    H;
list_head_or_default([], Default) ->
    Default.`,
    },
    references: [
      {
        title: 'Erlang List Processing Manual',
        url: 'https://www.erlang.org/doc/reference_manual/data_types.html#list',
        category: 'erlang_docs',
        description: 'Deep reference on cons cells and list pattern matching.',
      },
    ],
  },

  // ── Lesson 1.5: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch01-l05',
    chapterNumber: 1,
    lessonNumber: 5,
    lessonType: 'concept_exercise',
    title: 'Variables, Single Assignment & The = Pattern Matching Operator',
    difficulty: 'Beginner',
    conceptMarkdown: `## Why This Matters in Production

In imperative languages, mutable variables cause concurrency race conditions, data corruption, and difficult-to-reproduce heisenbugs. Erlang variables are **strictly immutable and single-assignment**. Once a variable is bound, its value cannot change. In the BEAM VM, this invariant guarantees that shared memory between concurrent processes does not require locks — processes have independent heaps, and garbage collection runs per-process without global world-stopping pauses.

## Deep Concept Breakdown & Under the Hood

The \`=\` operator is not an assignment operator; it is an assertion of equality (**Pattern Match**):
- If the left-hand side is an **unbound variable** (starts with an uppercase letter, e.g., \`X\`), the BEAM binds it to the value of the right-hand side.
- If the variable is **already bound**, the BEAM asserts that both sides are identical. If they are not, a \`{badmatch, ...}\` exception is raised.

\`\`\`erlang
%% Single assignment in action:
X = 10,
X = 10,   %% Succeeds: 10 matches 10
%% X = 20 %% Fails: ** exception error: no match of right hand side value 20

%% State progression via versioned identifiers:
State0 = #{balance => 100},
State1 = maps:put(balance, 150, State0).
\`\`\`

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Pattern matching assertions
Pattern = Expression
\`\`\`
> Underscore \`_\` is the anonymous variable (wildcard); it matches anything and discards the value without binding.

## Assignment Specification

Module: \`pattern_vars\` · Export: \`verify_identical_pair/1\`, \`rebind_update/2\`
1. \`verify_identical_pair(Pair)\`:
   - Matches a 2-tuple where both elements are identical: \`{X, X}\` and returns \`{matched, X}\`.
   - If the elements differ (e.g. \`{1, 2}\`), return \`mismatch\`.
2. \`rebind_update(Base, Increment)\`:
   - Demonstrate immutable state shadowing: bind \`V1 = Base\`, \`V2 = V1 + Increment\`, \`V3 = V2 * 2\`, and return \`{V1, V2, V3}\`.

## Rules & Verification Constraints

- In \`verify_identical_pair/1\`, use the exact same variable name in both tuple positions (\`{X, X}\`) to demonstrate repeated variable pattern matching.`,
    otpDocCards: [
      {
        functionName: 'pattern_matching',
        module: 'erlang',
        signature: 'Pattern = Expression',
        typesSpec: ['Pattern = term()', 'Expression = term()'],
        description: 'Single assignment operator and destructuring pattern matcher.',
        complexityNote: 'Single machine comparison instruction when variables are bound.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/expressions.html#pattern-matching',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch01-05-1',
        title: 'Match Identical Pair',
        erlangCall: 'pattern_vars:verify_identical_pair({alpha, alpha})',
        expectedOutput: '{matched, alpha}',
        explanation: 'Repeated variable {X, X} succeeds when both terms are equal.',
      },
      {
        id: 'tc-ch01-05-2',
        title: 'Reject Different Terms',
        erlangCall: 'pattern_vars:verify_identical_pair({alpha, beta})',
        expectedOutput: 'mismatch',
        explanation: 'Fails repeated variable match and falls through to second clause.',
      },
      {
        id: 'tc-ch01-05-3',
        title: 'Shadowed State Progression',
        erlangCall: 'pattern_vars:rebind_update(10, 5)',
        expectedOutput: '{10, 15, 30}',
        explanation: 'V1=10, V2=15, V3=30.',
      },
    ],
    astRules: {
      requiredConstructs: ['pattern_match'],
    },
    solutionExplanation: 'Demonstrates matching identical terms via {X, X} and versioned immutable variables.',
    starterCode: `-module(pattern_vars).
-export([verify_identical_pair/1, rebind_update/2]).

verify_identical_pair(Pair) ->
    %% % TODO: match {X, X} -> {matched, X}; _ -> mismatch
    mismatch.

rebind_update(Base, Increment) ->
    %% % TODO: V1 = Base, V2 = V1 + Increment, V3 = V2 * 2, return {V1, V2, V3}
    {0, 0, 0}.`,
    solutionCode: `-module(pattern_vars).
-export([verify_identical_pair/1, rebind_update/2]).

verify_identical_pair({X, X}) ->
    {matched, X};
verify_identical_pair(_) ->
    mismatch.

rebind_update(Base, Increment) ->
    V1 = Base,
    V2 = V1 + Increment,
    V3 = V2 * 2,
    {V1, V2, V3}.`,
    files: [
      {
        path: 'src/pattern_vars.erl',
        name: 'pattern_vars.erl',
        content: `-module(pattern_vars).
-export([verify_identical_pair/1, rebind_update/2]).

verify_identical_pair(Pair) ->
    %% % TODO: match {X, X} -> {matched, X}; _ -> mismatch
    mismatch.

rebind_update(Base, Increment) ->
    %% % TODO: V1 = Base, V2 = V1 + Increment, V3 = V2 * 2, return {V1, V2, V3}
    {0, 0, 0}.`,
      },
    ],
    solutionFiles: {
      'src/pattern_vars.erl': `-module(pattern_vars).
-export([verify_identical_pair/1, rebind_update/2]).

verify_identical_pair({X, X}) ->
    {matched, X};
verify_identical_pair(_) ->
    mismatch.

rebind_update(Base, Increment) ->
    V1 = Base,
    V2 = V1 + Increment,
    V3 = V2 * 2,
    {V1, V2, V3}.`,
    },
    references: [
      {
        title: 'Single Assignment & Variables Reference',
        url: 'https://www.erlang.org/doc/reference_manual/expressions.html#pattern-matching',
        category: 'erlang_docs',
        description: 'How Erlang handles bound vs unbound variable scopes.',
      },
    ],
  },

  // ── Lesson 1.6: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch01-l06',
    chapterNumber: 1,
    lessonNumber: 6,
    lessonType: 'concept_exercise',
    title: 'Modules (-module), Exporting (-export), and Understanding Arity',
    difficulty: 'Beginner',
    conceptMarkdown: `## Why This Matters in Production

In Erlang/OTP, functions with the same name but different argument counts are **entirely separate functions**. For example, \`connect/1\`, \`connect/2\`, and \`connect/3\` are three distinct entries in the BEAM module export table. Production OTP libraries leverage this property to provide clean default parameters without requiring overloading or optional parameter syntax.

## Deep Concept Breakdown & Under the Hood

The notation \`Name/Arity\` uniquely identifies a function.
- \`-module(Name).\` defines the compilation unit and must match the filename (\`Name.erl\`).
- \`-export([Fun1/Arity1, Fun2/Arity2]).\` publishes public symbols to the module's export table.
Functions not listed in \`-export\` are strictly private to the module.

\`\`\`erlang
-module(network).
-export([connect/1, connect/2, connect/3]).

connect(Host) -> connect(Host, 5000).
connect(Host, Port) -> connect(Host, Port, 3).
connect(Host, Port, Retries) ->
    {ok, connected, Host, Port, Retries}.
\`\`\`

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Module definition and exports
-module(ModuleName).
-export([Function/Arity, ...]).
\`\`\`
> Unexported functions are called with direct local branch instructions (\`call\`), whereas exported functions can be called remotely via \`module:func(...)\` and updated at runtime via hot code reloading.

## Assignment Specification

Module: \`arity_calc\` · Export: \`connect/1\`, \`connect/2\`, \`connect/3\`
1. \`connect(Host)\`: Calls \`connect(Host, 80)\` (default port 80).
2. \`connect(Host, Port)\`: Calls \`connect(Host, Port, 5000)\` (default timeout 5000 ms).
3. \`connect(Host, Port, Timeout)\`: Returns \`{ok, #{host => Host, port => Port, timeout_ms => Timeout}}\`.

## Rules & Verification Constraints

- Must export \`connect/1\`, \`connect/2\`, and \`connect/3\`.
- \`connect/1\` must delegate to \`connect/2\`, which delegates to \`connect/3\`.`,
    otpDocCards: [
      {
        functionName: 'module_syntax',
        module: 'erlang',
        signature: '-module(Name). -export([Fun/Arity]).',
        typesSpec: ['Name = atom()', 'Fun = atom()', 'Arity = non_neg_integer()'],
        description: 'Module declaration and public export interface definition.',
        complexityNote: 'Compiled into the BEAM export atom table.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/modules.html',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch01-06-1',
        title: 'Single Argument Arity connect/1',
        erlangCall: 'arity_calc:connect(<<"api.erlang.org">>)',
        expectedOutput: '{ok, #{host => <<"api.erlang.org">>, port => 80, timeout_ms => 5000}}',
        explanation: 'connect/1 defaults port to 80 and timeout to 5000.',
      },
      {
        id: 'tc-ch01-06-2',
        title: 'Explicit Arity connect/3',
        erlangCall: 'arity_calc:connect(<<"cluster.local">>, 4369, 1000)',
        expectedOutput: '{ok, #{host => <<"cluster.local">>, port => 4369, timeout_ms => 1000}}',
        explanation: 'connect/3 overrides both defaults.',
      },
    ],
    astRules: {
      requiredCalls: ['arity_calc:connect/2', 'arity_calc:connect/3'],
    },
    solutionExplanation: 'Demonstrates cascading arity delegation connect/1 -> connect/2 -> connect/3.',
    starterCode: `-module(arity_calc).
-export([connect/1, connect/2, connect/3]).

connect(Host) ->
    %% % TODO: delegate to connect(Host, 80)
    {error, not_implemented}.

connect(Host, Port) ->
    %% % TODO: delegate to connect(Host, Port, 5000)
    {error, not_implemented}.

connect(Host, Port, Timeout) ->
    %% % TODO: return {ok, #{host => Host, port => Port, timeout_ms => Timeout}}
    {error, not_implemented}.`,
    solutionCode: `-module(arity_calc).
-export([connect/1, connect/2, connect/3]).

connect(Host) ->
    connect(Host, 80).

connect(Host, Port) ->
    connect(Host, Port, 5000).

connect(Host, Port, Timeout) ->
    {ok, #{host => Host, port => Port, timeout_ms => Timeout}}.`,
    files: [
      {
        path: 'src/arity_calc.erl',
        name: 'arity_calc.erl',
        content: `-module(arity_calc).
-export([connect/1, connect/2, connect/3]).

connect(Host) ->
    %% % TODO: delegate to connect(Host, 80)
    {error, not_implemented}.

connect(Host, Port) ->
    %% % TODO: delegate to connect(Host, Port, 5000)
    {error, not_implemented}.

connect(Host, Port, Timeout) ->
    %% % TODO: return {ok, #{host => Host, port => Port, timeout_ms => Timeout}}
    {error, not_implemented}.`,
      },
    ],
    solutionFiles: {
      'src/arity_calc.erl': `-module(arity_calc).
-export([connect/1, connect/2, connect/3]).

connect(Host) ->
    connect(Host, 80).

connect(Host, Port) ->
    connect(Host, Port, 5000).

connect(Host, Port, Timeout) ->
    {ok, #{host => Host, port => Port, timeout_ms => Timeout}}.`,
    },
    references: [
      {
        title: 'Modules & Functions Specification',
        url: 'https://www.erlang.org/doc/reference_manual/modules.html',
        category: 'erlang_docs',
        description: 'How the BEAM manages export tables and function arities.',
      },
    ],
  },

  // ── Lesson 1.7: Problem Set ──────────────────────────────────────────────
  {
    id: 'ch01-l07',
    chapterNumber: 1,
    lessonNumber: 7,
    lessonType: 'problem_set',
    title: 'Problem Set: Telecom Call Rate & Packet Header Classifier',
    difficulty: 'Beginner',
    conceptMarkdown: `## Why This Matters in Production

Real-world telecommunication gateways must process hundreds of thousands of call-detail records (CDRs) and protocol packet headers per second. Engineers build multi-arity interfaces with tuple pattern matching to decode incoming frames and calculate billing charges without allocating extra heap objects.

## Deep Concept Breakdown & Under the Hood

This problem set synthesizes all foundational Erlang skills:
1. **Tuple destructuring**: Unpack header fields directly in function arguments.
2. **Multi-arity functions**: Provide default billing parameters.
3. **List head inspection**: Parse list payloads.

\`\`\`erlang
%% Packet formats:
{ipv4, SrcIp, DstIp, Payload}
{ipv6, SrcIp, DstIp, Payload}
\`\`\`

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% BIFs used for validation
is_integer(Term) -> boolean()
is_binary(Term) -> boolean()
\`\`\`

## Assignment Specification

Module: \`telecom_foundations\`
Exports: \`classify_packet/1\`, \`bill_call/2\`, \`bill_call/3\`

1. \`classify_packet(Packet)\`:
   - \`{ipv4, Src, Dst, Payload}\`: return \`{ok, ipv4, Src, Dst, byte_size(Payload)}\`
   - \`{ipv6, Src, Dst, Payload}\`: return \`{ok, ipv6, Src, Dst, byte_size(Payload)}\`
   - Any other term: return \`{error, invalid_packet}\`
2. \`bill_call(DurationSec, PlanType)\`:
   - Delegates to \`bill_call(DurationSec, PlanType, 10)\` (default flat connection fee 10 cents).
3. \`bill_call(DurationSec, PlanType, ConnectionFeeCents)\`:
   - If \`PlanType =:= standard\`: rate is 5 cents per second -> \`ConnectionFeeCents + (DurationSec * 5)\`
   - If \`PlanType =:= premium\`: rate is 3 cents per second -> \`ConnectionFeeCents + (DurationSec * 3)\`
   - Otherwise, return \`{error, unknown_plan}\`.

## Rules & Verification Constraints

- Must export \`classify_packet/1\`, \`bill_call/2\`, and \`bill_call/3\`.
- \`bill_call/2\` must delegate to \`bill_call/3\`.
- \`classify_packet/1\` must use pattern matching on tuple tags \`ipv4\` and \`ipv6\`.`,
    otpDocCards: [
      {
        functionName: 'byte_size',
        module: 'erlang',
        signature: 'erlang:byte_size(Bitstring) -> non_neg_integer()',
        typesSpec: ['Bitstring = bitstring()', 'Returns number of bytes in binary'],
        description: 'Returns the exact byte length of a binary or bitstring.',
        complexityNote: 'O(1) header field read.',
        officialUrl: 'https://www.erlang.org/doc/man/erlang.html#byte_size-1',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch01-07-1',
        title: 'Classify IPv4 Frame',
        erlangCall: 'telecom_foundations:classify_packet({ipv4, <<"10.0.0.1">>, <<"10.0.0.2">>, <<"PING">>})',
        expectedOutput: '{ok, ipv4, <<"10.0.0.1">>, <<"10.0.0.2">>, 4}',
        explanation: 'Unpacks IPv4 tuple and calculates 4-byte payload size.',
      },
      {
        id: 'tc-ch01-07-2',
        title: 'Bill Standard Call with Default Fee',
        erlangCall: 'telecom_foundations:bill_call(60, standard)',
        expectedOutput: '310',
        explanation: '10 cents connection fee + (60 * 5) = 310 cents.',
      },
      {
        id: 'tc-ch01-07-3',
        title: 'Bill Premium Call with Custom Fee',
        erlangCall: 'telecom_foundations:bill_call(100, premium, 25)',
        expectedOutput: '325',
        explanation: '25 cents fee + (100 * 3) = 325 cents.',
      },
    ],
    astRules: {
      requiredCalls: ['telecom_foundations:bill_call/3'],
    },
    solutionExplanation: 'Demonstrates complete mastery of tuple pattern matching, arity delegation, and BIF byte_size/1.',
    starterCode: `-module(telecom_foundations).
-export([classify_packet/1, bill_call/2, bill_call/3]).

classify_packet(Packet) ->
    %% % TODO: match {ipv4, Src, Dst, Payload} or {ipv6, Src, Dst, Payload}
    {error, not_implemented}.

bill_call(DurationSec, PlanType) ->
    %% % TODO: delegate to bill_call(DurationSec, PlanType, 10)
    0.

bill_call(DurationSec, PlanType, ConnectionFeeCents) ->
    %% % TODO: calculate rate based on PlanType (standard vs premium)
    0.`,
    solutionCode: `-module(telecom_foundations).
-export([classify_packet/1, bill_call/2, bill_call/3]).

classify_packet({ipv4, Src, Dst, Payload}) when is_binary(Payload) ->
    {ok, ipv4, Src, Dst, byte_size(Payload)};
classify_packet({ipv6, Src, Dst, Payload}) when is_binary(Payload) ->
    {ok, ipv6, Src, Dst, byte_size(Payload)};
classify_packet(_) ->
    {error, invalid_packet}.

bill_call(DurationSec, PlanType) ->
    bill_call(DurationSec, PlanType, 10).

bill_call(DurationSec, standard, ConnectionFeeCents)
  when is_integer(DurationSec), DurationSec >= 0, is_integer(ConnectionFeeCents) ->
    ConnectionFeeCents + (DurationSec * 5);
bill_call(DurationSec, premium, ConnectionFeeCents)
  when is_integer(DurationSec), DurationSec >= 0, is_integer(ConnectionFeeCents) ->
    ConnectionFeeCents + (DurationSec * 3);
bill_call(_DurationSec, _UnknownPlan, _ConnectionFeeCents) ->
    {error, unknown_plan}.`,
    files: [
      {
        path: 'src/telecom_foundations.erl',
        name: 'telecom_foundations.erl',
        content: `-module(telecom_foundations).
-export([classify_packet/1, bill_call/2, bill_call/3]).

classify_packet(Packet) ->
    %% % TODO: match {ipv4, Src, Dst, Payload} or {ipv6, Src, Dst, Payload}
    {error, not_implemented}.

bill_call(DurationSec, PlanType) ->
    %% % TODO: delegate to bill_call(DurationSec, PlanType, 10)
    0.

bill_call(DurationSec, PlanType, ConnectionFeeCents) ->
    %% % TODO: calculate rate based on PlanType (standard vs premium)
    0.`,
      },
    ],
    solutionFiles: {
      'src/telecom_foundations.erl': `-module(telecom_foundations).
-export([classify_packet/1, bill_call/2, bill_call/3]).

classify_packet({ipv4, Src, Dst, Payload}) when is_binary(Payload) ->
    {ok, ipv4, Src, Dst, byte_size(Payload)};
classify_packet({ipv6, Src, Dst, Payload}) when is_binary(Payload) ->
    {ok, ipv6, Src, Dst, byte_size(Payload)};
classify_packet(_) ->
    {error, invalid_packet}.

bill_call(DurationSec, PlanType) ->
    bill_call(DurationSec, PlanType, 10).

bill_call(DurationSec, standard, ConnectionFeeCents)
  when is_integer(DurationSec), DurationSec >= 0, is_integer(ConnectionFeeCents) ->
    ConnectionFeeCents + (DurationSec * 5);
bill_call(DurationSec, premium, ConnectionFeeCents)
  when is_integer(DurationSec), DurationSec >= 0, is_integer(ConnectionFeeCents) ->
    ConnectionFeeCents + (DurationSec * 3);
bill_call(_DurationSec, _UnknownPlan, _ConnectionFeeCents) ->
    {error, unknown_plan}.`,
    },
    references: [
      {
        title: 'Telecom System Architecture in Erlang',
        url: 'https://www.erlang.org/doc/system/system_principles.html',
        category: 'erlang_docs',
        description: 'How high-throughput telecom switches structure multi-arity modules.',
      },
    ],
  },
];

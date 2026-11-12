import { LessonContent } from '../../types/workspace';

export const CHAPTER_1_LESSONS: LessonContent[] = [
  // ── Lesson 1.1: Guided Demo ──────────────────────────────────────────────
  {
    id: 'ch01-l01',
    chapterNumber: 1,
    lessonNumber: 1,
    lessonType: 'guided_demo',
    title: 'Welcome to Erlang, The BEAM VM & Expression Syntax',
    difficulty: 'Beginner',
    xpReward: 50,
    conceptMarkdown: `## Why This Matters in Production

In 1986, Ericsson computer scientists Joe Armstrong, Robert Virding, and Mike Williams designed Erlang to power telephone switches that could never go down. Their benchmark was **nine nines (99.9999999%) availability**—less than one second of downtime every 31 years.

Today, that exact runtime—the **BEAM Virtual Machine**—powers the core infrastructure of WhatsApp (handling billions of daily messages with fewer than 100 engineers), Discord's global guild clustering, Bet365's real-time betting engines, and RabbitMQ messaging brokers.

Erlang achieved this not through complex defensive programming, but by rethinking computing from first principles: **isolated lightweight processes**, **immutable data**, and **shared-nothing message passing**.

## Deep Concept Breakdown & Under the Hood

Unlike operating system threads that allocate 1 MB to 8 MB of stack memory upfront, a BEAM process begins with only **309 words of memory** (approximately 2.5 KB on a 64-bit operating system). A standard developer laptop can comfortably run hundreds of thousands of concurrent BEAM processes simultaneously.

Every BEAM node runs an asynchronous preemptive scheduler per available CPU core. Schedulers count **reductions**—roughly one function call or Built-In Function (BIF) invocation. After **4,000 reductions**, the active process is preempted and yields CPU time to the next runnable process in the queue. This reduction-counting mechanism guarantees that no single calculation can monopolize the CPU or cause latency spikes in network I/O.

\`\`\`erlang
%% Inspecting the live virtual machine
Schedulers = erlang:system_info(schedulers_online),
MaxProcs   = erlang:system_info(process_limit),
OtpRel     = erlang:system_info(otp_release).
\`\`\`

> [!WARNING] Common Beginner Syntax Trap: The Period Terminator
> In Erlang, standalone expressions and function definitions **must terminate with a period (\`.\`)**.
> Forgetting the final period or placing it in the middle of a function will result in a compiler error such as \`syntax error before: ...\`.
> Comments in Erlang start with a single percent symbol (\`%\`) and run to the end of the line.

## Parallel Worked Example

Consider a module designed to probe basic operating system environment metrics without using complex data structures:

\`\`\`erlang
-module(os_probe).
-export([check_env/0]).

check_env() ->
    NumSchedulers = erlang:system_info(schedulers_online),
    io:format("Operating with ~p online schedulers.~n", [NumSchedulers]),
    {env_info, NumSchedulers}.
\`\`\`

Notice the anatomy of an Erlang module:
1. \`-module(os_probe).\` declares the module name, which must match the filename \`os_probe.erl\`.
2. \`-export([check_env/0]).\` exports the function \`check_env\` with arity 0 (taking 0 arguments).
3. The function body separates statements with commas (\`,\`) and ends with a period (\`.\`).
4. The return value is the final evaluated expression: a 2-tuple \`{env_info, NumSchedulers}\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (erts / erlang)
erlang:system_info(Item) -> Info
  Types:
    Item = schedulers_online | process_limit | atom_limit | otp_release | term()
    Info = term()
\`\`\`
> **How to Read This Spec**: \`erlang:system_info/1\` is a C-implemented Built-In Function (BIF) taking one \`Item\` selector atom and returning the corresponding emulator property (\`Info\`) in $O(1)$ time. Open the attached **\`erlang:system_info/1\` Reference Card** below for official OTP documentation and ERTS C source links.

## Assignment Specification

This is a **Guided Runnable Demo**. The module \`src/beam_intro.erl\` is pre-written and ready to execute:

1. Inspect \`-module(beam_intro).\` and \`-export([inspect_vm/0]).\` at the top of \`src/beam_intro.erl\`.
2. Trace how each call to \`erlang:system_info/1\` queries live emulator telemetry before logging a diagnostic summary and returning the final tagged tuple.
3. Click **Run** to execute the live probe against the BEAM engine, then click **Submit** to verify AST and runtime contracts.

### \`beam_intro:inspect_vm/0\`
- **Input**: None (0-arity function).
- **Behavior**: Queries the live BEAM emulator for its OTP release string, online scheduler count, process limit, and atom table limit, prints a diagnostic summary to standard output, and returns a 5-element tagged telemetry tuple whose payload fields are a non-empty string (\`OtpRelease\`) followed by three positive integers (\`Schedulers\`, \`ProcessLimit\`, \`AtomLimit\`) in $O(1)$ time.
- **Examples**:
  - \`beam_intro:inspect_vm()\` returns \`{vm_info, OtpRelease, Schedulers, ProcessLimit, AtomLimit}\` (for example, \`{vm_info, "29", 8, 1048576, 1048576}\` depending on host hardware and OTP release).

## Rules & Verification Constraints

- No code edits are required for this guided introductory demo (the pre-written starter module passes 100% out of the box).
- **Exports**: \`beam_intro\` must export \`inspect_vm/0\`.
- **AST Rule**: Must call \`erlang:system_info/1\` directly (hardcoded telemetry tuples are rejected by the AST verifier).
- **Runtime Contract**: \`beam_intro:inspect_vm/0\` must return a 5-tuple tagged with \`vm_info\` where \`OtpRelease\` is a non-empty list/string and \`Schedulers\`, \`ProcessLimit\`, and \`AtomLimit\` are positive integers.`,
    otpDocCards: [
      {
        functionName: 'system_info',
        module: 'erlang',
        signature: 'erlang:system_info(Item) -> Info',
        typesSpec: ['Item = schedulers_online | process_limit | atom_limit | otp_release', 'Info = term()'],
        description: 'Returns information about the current BEAM emulator instance.',
        complexityNote: 'O(1) C BIF lookup directly reading internal ERTS state tables.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#system_info/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/erts/emulator/beam/bif.c',
      },
    ],
    mentalModelCheck: {
      question: 'Why does the BEAM virtual machine preempt processes after 4,000 reductions rather than relying on cooperative multitasking?',
      options: [
        {
          id: 'A',
          label: 'To reduce the total RAM required by operating system thread stacks',
          isCorrect: false,
          explanation: 'Stack size is determined by the BEAM process memory model (~309 words), not the reduction counter.',
        },
        {
          id: 'B',
          label: 'To prevent compute-heavy tasks from starving network I/O and low-latency message passing',
          isCorrect: true,
          explanation: 'Reduction counting guarantees soft real-time responsiveness. Even an infinite compute loop yields after 4,000 reductions.',
        },
        {
          id: 'C',
          label: 'Because the operating system kernel forces Erlang to sleep every 4,000 machine instructions',
          isCorrect: false,
          explanation: 'Reduction counting is handled entirely in user space by BEAM schedulers, not by OS interrupts.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch01-01',
        title: 'Query Live BEAM Engine Telemetry',
        erlangCall: 'beam_intro:inspect_vm()',
        expectedOutput: '{vm_info,...}',
        explanation: 'Calls erlang:system_info/1 on the live OTP runtime and formats emulator properties into a diagnostic 5-tuple: {vm_info, OtpRelease, Schedulers, ProcessLimit, AtomLimit}.',
      },
    ],
    astRules: {
      requiredCalls: ['erlang:system_info/1'],
    },
    solutionExplanation: 'The module queries the ERTS runtime using erlang:system_info/1 and formats metrics into an immutable 5-tuple.',
    files: [
      {
        name: 'beam_intro.erl',
        path: 'src/beam_intro.erl',
        content: `-module(beam_intro).
-export([inspect_vm/0]).

%% @doc Queries the live BEAM emulator for OTP release, online schedulers,
%% process limit, and atom limit, returning a 5-element telemetry tuple.
inspect_vm() ->
    OtpRel = erlang:system_info(otp_release),
    Schedulers = erlang:system_info(schedulers_online),
    ProcLimit = erlang:system_info(process_limit),
    AtomLimit = erlang:system_info(atom_limit),
    io:format("[BEAM Probe] OTP Release: ~s | Schedulers: ~p | Process Limit: ~p~n",
              [OtpRel, Schedulers, ProcLimit]),
    {vm_info, OtpRel, Schedulers, ProcLimit, AtomLimit}.`,
      },
    ],
    solutionFiles: {
      'src/beam_intro.erl': `-module(beam_intro).
-export([inspect_vm/0]).

%% @doc Queries the live BEAM emulator for OTP release, online schedulers,
%% process limit, and atom limit, returning a 5-element telemetry tuple.
inspect_vm() ->
    OtpRel = erlang:system_info(otp_release),
    Schedulers = erlang:system_info(schedulers_online),
    ProcLimit = erlang:system_info(process_limit),
    AtomLimit = erlang:system_info(atom_limit),
    io:format("[BEAM Probe] OTP Release: ~s | Schedulers: ~p | Process Limit: ~p~n",
              [OtpRel, Schedulers, ProcLimit]),
    {vm_info, OtpRel, Schedulers, ProcLimit, AtomLimit}.`,
    },
    starterCode: `-module(beam_intro).
-export([inspect_vm/0]).

%% @doc Queries the live BEAM emulator for OTP release, online schedulers,
%% process limit, and atom limit, returning a 5-element telemetry tuple.
inspect_vm() ->
    OtpRel = erlang:system_info(otp_release),
    Schedulers = erlang:system_info(schedulers_online),
    ProcLimit = erlang:system_info(process_limit),
    AtomLimit = erlang:system_info(atom_limit),
    io:format("[BEAM Probe] OTP Release: ~s | Schedulers: ~p | Process Limit: ~p~n",
              [OtpRel, Schedulers, ProcLimit]),
    {vm_info, OtpRel, Schedulers, ProcLimit, AtomLimit}.`,
    solutionCode: `-module(beam_intro).
-export([inspect_vm/0]).

%% @doc Queries the live BEAM emulator for OTP release, online schedulers,
%% process limit, and atom limit, returning a 5-element telemetry tuple.
inspect_vm() ->
    OtpRel = erlang:system_info(otp_release),
    Schedulers = erlang:system_info(schedulers_online),
    ProcLimit = erlang:system_info(process_limit),
    AtomLimit = erlang:system_info(atom_limit),
    io:format("[BEAM Probe] OTP Release: ~s | Schedulers: ~p | Process Limit: ~p~n",
              [OtpRel, Schedulers, ProcLimit]),
    {vm_info, OtpRel, Schedulers, ProcLimit, AtomLimit}.`,
  },

  // ── Lesson 1.2: Numbers, Booleans & Operators ───────────────────────────
  {
    id: 'ch01-l02',
    chapterNumber: 1,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: "Numbers, Booleans & Erlang's Comparison Operators",
    difficulty: 'Beginner',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

High-throughput backend systems must never crash due to integer overflow, precision loss, or unexpected type coercions. Telecom switches calculate billing in exact micro-cents, and bandwidth shapers throttle network packets based on microsecond quotas.

Erlang provides **arbitrary-precision integers (bignums)** natively: integers seamlessly expand to consume as much memory as needed without ever wrapping around or overflowing into negative numbers.

However, Erlang's operator syntax differs from C, Java, Python, and JavaScript in several subtle ways. Mastering these rules upfront will prevent hours of debugging obscure syntax errors.

## Deep Concept Breakdown & Under the Hood

### Arithmetic Operators
Erlang distinguishes between integer division and floating-point division:
- \`+\`, \`-\`, \`*\`: Standard addition, subtraction, multiplication.
- \`div\`: **Integer division** (e.g., \`14 div 4\` evaluates to \`3\`).
- \`rem\`: **Integer remainder / modulo** (e.g., \`14 rem 4\` evaluates to \`2\`).
- \`/\`: **Floating-point division** (e.g., \`14 / 4\` evaluates to \`3.5\`, and \`4 / 2\` evaluates to \`2.0\`). Even if both operands are integers, \`/\` always returns a float!

### Booleans & Logical Operators
In Erlang, booleans are not special runtime primitives: they are simply the atoms \`true\` and \`false\`.
- \`andalso\`: Short-circuit logical AND (if the left side is \`false\`, the right side is never evaluated).
- \`orelse\`: Short-circuit logical OR (if the left side is \`true\`, the right side is never evaluated).
- \`not\`: Logical negation.
*(Always prefer \`andalso\` and \`orelse\` over the older eager operators \`and\` and \`or\` to prevent unnecessary evaluation).*

### Comparison Operators

In Erlang, comparison operators are written using standard ASCII characters:

| Operator | Meaning | Example | Result | Critical Rule |
| :--- | :--- | :--- | :--- | :--- |
| **\`=:=\`** | Exact Equality | \`42 =:= 42\` | \`true\` | Checks value **and** type (\`42 =:= 42.0\` is \`false\`) |
| **\`=/=\`** | Exact Inequality | \`42 =/= 42.0\` | \`true\` | Negation of \`=:=\` |
| **\`==\`** | Loose Equality | \`42 == 42.0\` | \`true\` | Coerces integer to float |
| **\`/=\`** | Loose Inequality | \`10 /= 20\` | \`true\` | Negation of \`==\` |
| **\`<\`** | Strictly Less Than | \`5 < 10\` | \`true\` | Standard less-than |
| **\`=<\`** | Less Than or Equal | \`5 =< 5\` | \`true\` | **Erlang Syntax:** \`=<\` (Never \`<=\`) |
| **\`>\`** | Strictly Greater Than | \`10 > 5\` | \`true\` | Standard greater-than |
| **\`>=\`** | Greater Than or Equal | \`10 >= 10\` | \`true\` | Standard greater-than-or-equal |

> [!WARNING] Common Beginner Syntax Trap: The =< Comparison Operator
> In nearly every programming language, "less-than-or-equal" is written as \`<=\`.
> **In Erlang, less-than-or-equal is written as \`=<\`!**
> Why? Because \`<=\` is reserved in Erlang for binary comprehension generators. If you type \`X <= 10\`, the compiler will throw a confusing syntax error.
> Remember: \`=<\` (arrow pointing into the equal sign) means less-than-or-equal.

> [!WARNING] Exact Equality (=:=) vs. Loose Numeric Equality (==)
> Erlang has two equality operators:
> - \`=:=\` (**Exact Equality**): Compares both value **and type**. \`42 =:= 42.0\` is \`false\` because an integer is not a float.
> - \`==\` (**Loose Equality**): Coerces numbers. \`42 == 42.0\` is \`true\`.
> In production Erlang, **always use \`=:=\` and \`=/=\`** to avoid subtle numerical type bugs!

## Parallel Worked Example

Consider an industrial sensor-telemetry module that slices sampling durations and flags thermal threshold violations:

\`\`\`erlang
-module(thermal_probe).
-export([split_cycles/2, is_sensor_tripped/3]).

%% Partition elapsed milliseconds into complete cycles and leftover milliseconds
split_cycles(TotalMs, IntervalMs) ->
    FullCycles = TotalMs div IntervalMs,
    LeftoverMs = TotalMs rem IntervalMs,
    {FullCycles, LeftoverMs}.

%% Trigger alert when mode is strictly active, ceiling is non-zero, and reading breaches bounds
is_sensor_tripped(Reading, Ceiling, Mode) ->
    (Mode =:= active) andalso (Ceiling =/= 0) andalso (Ceiling =< Reading orelse Reading < 0).
\`\`\`

Notice how the BEAM evaluates each primitive:
- \`div\` and \`rem\` compute whole integer quotient and remainder cleanly with zero float rounding drift.
- \`=:=\` and \`=/=\` enforce strict value-and-type comparison against atoms and numbers (\`Mode =:= active\`, \`Ceiling =/= 0\`).
- \`=<\` and \`<\` compose inside parenthesized short-circuit \`andalso\` / \`orelse\` guards without intermediate branching.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Operator Precedence Table (Standard Erlang):
%% Highest:  +, - (unary)
%% High:     *, /, div, rem
%% Medium:   +, - (binary)
%% Low:      =:=, =/=, ==, /=, <, =<, >, >=
%% Lowest:   andalso, orelse
\`\`\`
> **How to Read This Spec**: Operators in higher rows bind more tightly than rows below them (for example, \`*\` and \`div\` evaluate before \`=<\`, which evaluates before \`andalso\` / \`orelse\`). Open the attached **\`div_and_rem\` Reference Card** below for official OTP arithmetic documentation and ERTS C emulator source links.

## Assignment Specification

In \`src/basic_types.erl\`, implement and export three calculation and logic functions (\`calculate_bandwidth/2\`, \`is_exact_match/2\`, \`is_within_quota/3\`):

1. \`calculate_bandwidth(Bytes, Seconds)\`:
   - **Input**: Non-negative integer \`Bytes\` transferred over positive integer \`Seconds\`.
   - **Behavior**: Converts bytes to bits (8 bits per byte) and returns the whole integer transmission rate in bits per second in $O(1)$ time, truncating any fractional remainder.
   - **Examples**:
     - \`basic_types:calculate_bandwidth(1250, 2)\` returns \`5000\` (1,250 bytes equals 10,000 bits across 2 seconds, yielding 5,000 bps).
     - \`basic_types:calculate_bandwidth(100, 3)\` returns \`266\`.

2. \`is_exact_match(ValA, ValB)\`:
   - **Input**: Two arbitrary Erlang terms, \`ValA\` and \`ValB\`.
   - **Behavior**: Returns \`true\` if both terms match identically in both value **and** runtime type in $O(1)$ time; returns \`false\` when types differ even if numeric values coerce loosely (such as integer vs float).
   - **Examples**:
     - \`basic_types:is_exact_match(42, 42)\` returns \`true\`.
     - \`basic_types:is_exact_match(42, 42.0)\` returns \`false\` (integer vs float).
     - \`basic_types:is_exact_match(ok, ok)\` returns \`true\`.

3. \`is_within_quota(UsedMb, LimitMb, IsAdmin)\`:
   - **Input**: Integer \`UsedMb\`, integer \`LimitMb\`, and boolean \`IsAdmin\`.
   - **Behavior**: Determines in $O(1)$ time whether resource usage is permitted:
     - Always returns \`true\` when the caller has active administrator privileges (\`IsAdmin\` strictly true).
     - For non-administrators, returns \`true\` only when \`UsedMb\` is non-negative (0 or greater) and does not exceed \`LimitMb\`.
     - Returns \`false\` otherwise.
   - **Examples**:
     - \`basic_types:is_within_quota(450, 500, false)\` returns \`true\`.
     - \`basic_types:is_within_quota(550, 500, false)\` returns \`false\`.
     - \`basic_types:is_within_quota(9999, 500, true)\` returns \`true\` (admin bypass).
     - \`basic_types:is_within_quota(-10, 500, false)\` returns \`false\` (negative usage invalid).

## Rules & Verification Constraints

- **Exports**: \`basic_types\` must export \`calculate_bandwidth/2\`, \`is_exact_match/2\`, and \`is_within_quota/3\`.
- **Expression-Only Style**: Do not use \`when\` guard clauses or \`if\`/\`case\` statements yet—rely on arithmetic and short-circuit boolean expressions.
- **Syntax Trap Check**: Remember Erlang uses \`=<\` (not \`<=\`) for less-than-or-equal comparisons.
- **Runtime Verification**: Verified across truncating integer division, strict type-safe equality, negative usage rejection, and inclusive \`[0, LimitMb]\` boundaries.`,
    otpDocCards: [
      {
        functionName: 'div_and_rem',
        module: 'erlang',
        signature: 'A div B, A rem B -> integer()',
        typesSpec: ['A = integer()', 'B = integer()'],
        description: 'Performs integer division and modulo operations.',
        complexityNote: 'O(1) CPU machine arithmetic instruction.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/expressions.html#arithmetic-expressions',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/erts/emulator/beam/beam_emu.c',
      },
    ],
    mentalModelCheck: {
      question: 'What is the evaluated result of the Erlang expression (10 =:= 10.0) orelse (5 <= 10)?',
      options: [
        {
          id: 'A',
          label: 'true, because 10 equals 10.0 and 5 is less than or equal to 10',
          isCorrect: false,
          explanation: '10 =:= 10.0 evaluates to false because an integer and float are different types, and <= is a compiler syntax error!',
        },
        {
          id: 'B',
          label: 'A compiler syntax error, because less-than-or-equal must be written as =< in Erlang',
          isCorrect: true,
          explanation: '<= is reserved for binary comprehensions. Less-than-or-equal must be written =<.',
        },
        {
          id: 'C',
          label: 'false, because both sides evaluate to false',
          isCorrect: false,
          explanation: 'The code never evaluates to false because <= fails to compile.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch01-02-a',
        title: 'Calculate Integer Bandwidth',
        erlangCall: 'basic_types:calculate_bandwidth(1250, 2)',
        expectedOutput: '5000',
        explanation: '1250 bytes (10,000 bits) over 2 seconds equals 5000 whole integer bits per second.',
      },
      {
        id: 'tc-ch01-02-b',
        title: 'Exact Equality Match Check',
        erlangCall: 'basic_types:is_exact_match(42, 42.0)',
        expectedOutput: 'false',
        explanation: 'Integer 42 differs in runtime type from float 42.0 under strict equality.',
      },
      {
        id: 'tc-ch01-02-c',
        title: 'Bandwidth Quota Within Limit Check',
        erlangCall: 'basic_types:is_within_quota(450, 500, false)',
        expectedOutput: 'true',
        explanation: 'UsedMb (450) falls inclusively between 0 and LimitMb (500).',
      },
    ],
    astRules: {
      requiredCalls: [],
    },
    solutionExplanation: 'Uses integer division after converting bytes to bits, strict equality (=:=) to preserve numeric types, and short-circuit boolean logic with =< for inclusive quota bounds checking.',
    files: [
      {
        name: 'basic_types.erl',
        path: 'src/basic_types.erl',
        content: `-module(basic_types).
-export([calculate_bandwidth/2, is_exact_match/2, is_within_quota/3]).

%% @doc Convert byte count and elapsed seconds into whole integer bits per second.
calculate_bandwidth(_Bytes, _Seconds) ->
    ok.

%% @doc Return true only if ValA and ValB match identically in both value and runtime type.
is_exact_match(_ValA, _ValB) ->
    ok.

%% @doc Return true if IsAdmin is active, or if non-negative UsedMb does not exceed LimitMb.
is_within_quota(_UsedMb, _LimitMb, _IsAdmin) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/basic_types.erl': `-module(basic_types).
-export([calculate_bandwidth/2, is_exact_match/2, is_within_quota/3]).

%% @doc Convert byte count and elapsed seconds into whole integer bits per second.
calculate_bandwidth(Bytes, Seconds) ->
    (Bytes * 8) div Seconds.

%% @doc Return true only if ValA and ValB match identically in both value and runtime type.
is_exact_match(ValA, ValB) ->
    ValA =:= ValB.

%% @doc Return true if IsAdmin is active, or if non-negative UsedMb does not exceed LimitMb.
is_within_quota(UsedMb, LimitMb, IsAdmin) ->
    IsAdmin =:= true orelse (UsedMb >= 0 andalso UsedMb =< LimitMb).`,
    },
    starterCode: `-module(basic_types).
-export([calculate_bandwidth/2, is_exact_match/2, is_within_quota/3]).

%% @doc Convert byte count and elapsed seconds into whole integer bits per second.
calculate_bandwidth(_Bytes, _Seconds) ->
    ok.

%% @doc Return true only if ValA and ValB match identically in both value and runtime type.
is_exact_match(_ValA, _ValB) ->
    ok.

%% @doc Return true if IsAdmin is active, or if non-negative UsedMb does not exceed LimitMb.
is_within_quota(_UsedMb, _LimitMb, _IsAdmin) ->
    ok.`,
    solutionCode: `-module(basic_types).
-export([calculate_bandwidth/2, is_exact_match/2, is_within_quota/3]).

%% @doc Convert byte count and elapsed seconds into whole integer bits per second.
calculate_bandwidth(Bytes, Seconds) ->
    (Bytes * 8) div Seconds.

%% @doc Return true only if ValA and ValB match identically in both value and runtime type.
is_exact_match(ValA, ValB) ->
    ValA =:= ValB.

%% @doc Return true if IsAdmin is active, or if non-negative UsedMb does not exceed LimitMb.
is_within_quota(UsedMb, LimitMb, IsAdmin) ->
    IsAdmin =:= true orelse (UsedMb >= 0 andalso UsedMb =< LimitMb).`,
  },

  // ── Lesson 1.3: Variables & Single Assignment ────────────────────────────
  {
    id: 'ch01-l03',
    chapterNumber: 1,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Variables, Single Assignment & The = Pattern Match Operator',
    difficulty: 'Beginner',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In imperative languages (C++, Java, Go, Python), variables are mutable memory slots that can be modified at any time by any thread. When multiple threads modify the same variable concurrently, race conditions and corrupted states occur.

Erlang eliminates an entire class of concurrency bugs by enforcing **Single Assignment Immutability**:
- Once a variable is bound to a value, **it can never be changed**.
- A variable is not a mutable box; it is an immutable alias for a specific value.
- The \`=\` operator is not an assignment statement—**it is a pattern matching assertion**.

## Deep Concept Breakdown & Under the Hood

### Variable Naming Rule
In Erlang, variable names **must begin with an Uppercase letter** or an underscore (\`_\`):
- \`Count\`, \`TotalAmount\`, \`UserProfile\` are Variables.
- \`count\`, \`total_amount\`, \`user_profile\` are **Atoms** (constants)!
- If you start a variable name with a lowercase letter, the compiler treats it as a constant atom, causing confusion.

### The "=" Operator is a Pattern Matcher

When Erlang evaluates \`Pattern = Expression\`:

1. If the variable on the left is **unbound** (has no value yet), Erlang binds it to the value on the right:

\`\`\`erlang
X = 10.  %% X is now bound to integer 10
\`\`\`

2. If the variable is **already bound**, Erlang does not reassign it. Instead, it asserts that both sides are identical:

\`\`\`erlang
X = 10.  %% Succeeds: 10 matches 10
X = 20.  %% CRASHES with {badmatch, 20}!
\`\`\`

Because \`X\` is already \`10\`, evaluating \`X = 20\` asserts that \`10 = 20\`. Since that is false, the BEAM throws a runtime \`badmatch\` error!

### The Anonymous Wildcard Variable ("_")
If you need to match a value in a pattern but do not intend to use it, use the single underscore \`_\`. The wildcard matches any term without binding a variable name:
\`\`\`erlang
{_, UserStatus} = {101, active}.  %% Discards ID 101, binds UserStatus = active
\`\`\`

> [!WARNING] Common Beginner Syntax Trap: How to "Update" State
> Beginners often wonder: *If variables are immutable, how do I calculate updated values?*
> The answer: **Create a new, descriptively named variable!**
> Instead of modifying \`Price = Price * 1.1\`, write:
> \`\`\`erlang
> BasePrice    = 100,
> TaxedPrice   = BasePrice * 1.1,
> FinalPrice   = TaxedPrice - Discount.
> \`\`\`

## Parallel Worked Example

Consider a financial settlement ledger module that tracks balances across immutable intermediate steps and verifies currency tags via nested pattern matching:

\`\`\`erlang
-module(ledger_step).
-export([net_settlement/3, match_tagged_amount/2]).

%% Progress balances through distinct immutable bindings
net_settlement(GrossCents, FeeCents, BonusCents) ->
    AfterFee   = GrossCents - FeeCents,
    WithBonus  = AfterFee + BonusCents,
    DoublePool = WithBonus + WithBonus,
    {AfterFee, DoublePool}.

%% Match an already-bound Currency atom while discarding outer fields
match_tagged_amount(Currency, Entry) ->
    {_, {Currency, Amount}, _} = Entry,
    Amount.
\`\`\`

Notice how the BEAM evaluates each step:
- \`net_settlement/3\` chains three immutable variables (\`AfterFee\`, \`WithBonus\`, \`DoublePool\`) so earlier bindings remain inspectable rather than overwritten in memory.
- \`match_tagged_amount/2\` combines anonymous wildcards (\`_\`) to ignore unreferenced fields, an already-bound variable (\`Currency\`) to assert equality, and an unbound variable (\`Amount\`) to capture the target value.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Erlang Reference Manual (Pattern Matching)
Pattern = Expression
  Evaluates Expression and matches result against Pattern.
  Unbound variables in Pattern are bound.
  If matching fails, a badmatch run-time error occurs.
\`\`\`
> **How to Read This Spec**: \`=\` is Erlang's pattern-match operator rather than a destructive assignment. It evaluates the right-hand side \`Expression\`, binds any unbound variables in \`Pattern\`, and verifies structural equality against literals or previously bound variables. Open the attached **\`pattern_matching\` Reference Card** below for the official OTP reference manual and emulator implementation links.

## Assignment Specification

In \`src/pattern_vars.erl\`, implement and export \`rebind_update/2\` and \`extract_middle/1\`:

1. \`rebind_update(Base, Increment)\`:
   - **Input**: Integer \`Base\` and integer \`Increment\`.
   - **Behavior**: Progresses the calculation in $O(1)$ time across sequential newly bound immutable variables:
     - First binds an intermediate total equal to \`Base\` increased by \`Increment\`.
     - Next binds a final variable equal to twice that intermediate total, and returns it.
     - Never attempts to reassign an already-bound variable.
   - **Examples**:
     - \`pattern_vars:rebind_update(10, 5)\` returns \`30\` (10 plus 5 yields 15, doubled is 30).
     - \`pattern_vars:rebind_update(100, 50)\` returns \`300\`.

2. \`extract_middle(TripleTuple)\`:
   - **Input**: A 3-element tuple containing arbitrary Erlang terms.
   - **Behavior**: Destructures the 3-element tuple in $O(1)$ time via pattern matching, returns its second (middle) element, rejects tuples whose arity is not 3, and discards the outer two elements cleanly without creating unused named variables.
   - **Examples**:
     - \`pattern_vars:extract_middle({alpha, beta, gamma})\` returns \`beta\`.
     - \`pattern_vars:extract_middle({1, 999, "test"})\` returns \`999\`.

## Rules & Verification Constraints

- **Exports**: \`pattern_vars\` must export \`rebind_update/2\` and \`extract_middle/1\`.
- **Single Assignment**: Do not attempt to mutate or rebind any previously bound variable.
- **Compiler Cleanliness**: Must compile cleanly with zero unused-variable warnings (discard ignored tuple elements properly).`,
    otpDocCards: [
      {
        functionName: 'pattern_matching',
        module: 'erlang',
        signature: 'Pattern = Expression -> term()',
        typesSpec: ['Pattern = term()', 'Expression = term()'],
        description: 'Binds unbound variables or asserts term equivalence.',
        complexityNote: 'O(1) memory pointer binding or structural term comparison.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/expressions.html#pattern-matching',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/erts/emulator/beam/beam_emu.c',
      },
    ],
    mentalModelCheck: {
      question: 'What happens if you execute: X = 5, X = X + 1 in an Erlang shell?',
      options: [
        {
          id: 'A',
          label: 'X becomes 6 because the latest assignment overwrites the previous value',
          isCorrect: false,
          explanation: 'Erlang variables are strictly single-assignment and cannot be overwritten.',
        },
        {
          id: 'B',
          label: 'The runtime throws a {badmatch, 6} exception because 5 cannot match 6',
          isCorrect: true,
          explanation: 'X is already bound to 5. Evaluating X = X + 1 attempts to assert 5 = 6, which fails.',
        },
        {
          id: 'C',
          label: 'The compiler converts X into an integer pointer and increments the memory address',
          isCorrect: false,
          explanation: 'Erlang does not expose memory pointers; terms are immutable values.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch01-03-a',
        title: 'Sequential Variable Progression',
        erlangCall: 'pattern_vars:rebind_update(10, 5)',
        expectedOutput: '30',
        explanation: 'Sequential immutable calculation starting from Base 10 with Increment 5 produces 30.',
      },
      {
        id: 'tc-ch01-03-b',
        title: 'Extract Middle Tuple Element',
        erlangCall: 'pattern_vars:extract_middle({alpha, beta, gamma})',
        expectedOutput: 'beta',
        explanation: 'Pattern-matches the 3-element tuple and returns its second element (beta).',
      },
    ],
    astRules: {
      requiredCalls: [],
    },
    solutionExplanation: 'Demonstrates single-assignment immutability across sequential bindings and 3-element tuple destructuring using anonymous wildcards for ignored positions.',
    files: [
      {
        name: 'pattern_vars.erl',
        path: 'src/pattern_vars.erl',
        content: `-module(pattern_vars).
-export([rebind_update/2, extract_middle/1]).

%% @doc Compute double the sum of Base and Increment across immutable bindings.
rebind_update(_Base, _Increment) ->
    ok.

%% @doc Return the second element of a 3-element tuple, failing if arity is not 3.
extract_middle(_TripleTuple) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/pattern_vars.erl': `-module(pattern_vars).
-export([rebind_update/2, extract_middle/1]).

%% @doc Compute double the sum of Base and Increment across immutable bindings.
rebind_update(Base, Increment) ->
    V1 = Base,
    V2 = V1 + Increment,
    V3 = V2 * 2,
    V3.

%% @doc Return the second element of a 3-element tuple, failing if arity is not 3.
extract_middle(TripleTuple) ->
    {_, Middle, _} = TripleTuple,
    Middle.`,
    },
    starterCode: `-module(pattern_vars).
-export([rebind_update/2, extract_middle/1]).

%% @doc Compute double the sum of Base and Increment across immutable bindings.
rebind_update(_Base, _Increment) ->
    ok.

%% @doc Return the second element of a 3-element tuple, failing if arity is not 3.
extract_middle(_TripleTuple) ->
    ok.`,
    solutionCode: `-module(pattern_vars).
-export([rebind_update/2, extract_middle/1]).

%% @doc Compute double the sum of Base and Increment across immutable bindings.
rebind_update(Base, Increment) ->
    V1 = Base,
    V2 = V1 + Increment,
    V3 = V2 * 2,
    V3.

%% @doc Return the second element of a 3-element tuple, failing if arity is not 3.
extract_middle(TripleTuple) ->
    {_, Middle, _} = TripleTuple,
    Middle.`,
  },

  // ── Lesson 1.4: Atoms & Tuples ───────────────────────────────────────────
  {
    id: 'ch01-l04',
    chapterNumber: 1,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'Atoms & Tuples: Modeling Structured Telecom Events',
    difficulty: 'Beginner',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

Telecommunication switches and payment gateways process millions of discrete events per second: call connection attempts, packet handoffs, credit reservations, and circuit heartbeats.

To achieve maximum throughput with zero garbage collection overhead, Erlang models domain events using two fundamental building blocks:
1. **Atoms**: Ultra-lightweight constants that represent states and identifiers.
2. **Tuples**: Fixed-size contiguous memory blocks used to bundle related values together.

Together, they form the **Tagged Tuple Idiom**—the universal convention used across every Erlang library and OTP behaviour.

## Deep Concept Breakdown & Under the Hood

### Atoms
An **Atom** is a literal constant whose name is its value.
- Lowercase names are automatically atoms: \`ok\`, \`error\`, \`ready\`, \`gateway_a\`, \`core_node\`.
- Atoms are stored once in a global runtime **Atom Table**. An atom reference inside a message or process heap is simply a 1-word integer pointer. Comparing two atoms (\`State =:= ready\`) is an ultra-fast $O(1)$ single-cycle integer pointer comparison.
- **Single-Quoted Atoms**: If an atom must begin with a capital letter, contain spaces, or include punctuation, enclose it in single quotes: \`'Monday'\`, \`'EXIT'\`, \`'user@domain.com'\`.

> [!WARNING] Common Production Trap: The Atom Table is Never Garbage-Collected
> The BEAM VM Atom Table has a fixed limit (default 1,048,576 atoms) and is **never garbage-collected**.
> Never dynamically generate atoms from untrusted user input using \`list_to_atom/1\`, or malicious requests can overflow the atom table and crash the entire node!

### Tuples
A **Tuple** is an ordered, fixed-size container written with curly braces:
\`\`\`erlang
{route_hop, 404, edge_west, core_01, 15}
\`\`\`
Tuples are stored as contiguous words on the process heap: a header word followed by each element's value. Element access is instant ($O(1)$ indexed offset).

### The Tagged Tuple Idiom
Erlang does not have classes or structs. Instead, by convention, the **first element of a tuple is an atom that declares its type or status**:
- Success result: \`{ok, Payload}\`
- Error condition: \`{error, invalid_port}\`
- Domain record: \`{heartbeat, NodeId, NodeRole, CurrentStatus}\`

You destructure a tagged tuple using the \`=\` operator:
\`\`\`erlang
Heartbeat = {heartbeat, 101, primary_node, healthy},
{heartbeat, NodeId, NodeRole, CurrentStatus} = Heartbeat.
%% NodeId is 101, NodeRole is primary_node, CurrentStatus is healthy
\`\`\`

## Parallel Worked Example

Consider a distributed telemetry batching module that tags metric readings and rebuilds nested cluster descriptors immutably:

\`\`\`erlang
-module(metrics_batch).
-export([tag_sample/2, promote_replica/2]).

%% Wrap a metric name and numeric value inside a versioned 4-tuple
tag_sample(MetricName, Value) ->
    {sample, v1, MetricName, Value}.

%% Destructure a nested cluster tuple, replace the leader atom, and preserve other fields
promote_replica(StandbyNode, ClusterInfo) ->
    {cluster, _Leader, ReplicaCount, {zone, PrimaryZone}} = ClusterInfo,
    {cluster, StandbyNode, ReplicaCount + 1, {zone, PrimaryZone}}.
\`\`\`

Notice how the BEAM processes each operation:
- \`tag_sample/2\` prepends the atom \`sample\` and schema tag \`v1\` to form a self-describing fixed-arity tuple.
- \`promote_replica/2\` asserts the outer \`cluster\` tag and nested \`zone\` tag during pattern matching, discards \`_Leader\` without compiler warnings, and allocates a fresh updated tuple in $O(1)$ time without mutating \`ClusterInfo\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Erlang Reference Manual (Data Types - Tuples)
{Element1, Element2, ..., ElementN}
  Compound data type with fixed number of terms.
  Element access via pattern matching or element(N, Tuple) is O(1).
\`\`\`
> **How to Read This Spec**: Tuples pack \`N\` terms into contiguous words on the process heap, so both pattern-match destructuring and \`erlang:tuple_size/1\` header inspection run in $O(1)$ time without traversing elements. Open the attached **\`tuple_size\` Reference Card** below for official ERTS documentation and BIF C source links.

## Assignment Specification

In \`src/telecom_events.erl\`, implement and export \`make_event/3\`, \`extract_caller/1\`, and \`swap_endpoints/1\`:

1. \`make_event(Id, Caller, Callee)\`:
   - **Input**: Integer \`Id\`, atom \`Caller\`, and atom \`Callee\`.
   - **Behavior**: Constructs and returns a 5-element tagged tuple in $O(1)$ time starting with the tag atom \`call_event\`, followed by \`Id\`, \`Caller\`, \`Callee\`, and an initial duration integer of \`0\`.
   - **Examples**:
     - \`telecom_events:make_event(101, alice, bob)\` returns \`{call_event, 101, alice, bob, 0}\`.
     - \`telecom_events:make_event(202, operator, support)\` returns \`{call_event, 202, operator, support, 0}\`.

2. \`extract_caller(Event)\`:
   - **Input**: A 5-element \`call_event\` tagged tuple.
   - **Behavior**: Matches and validates the 5-element tagged tuple in $O(1)$ time (failing on wrong tag or tuple size), returning only the \`Caller\` atom while cleanly discarding the remaining fields without unused-variable warnings.
   - **Examples**:
     - \`telecom_events:extract_caller({call_event, 101, alice, bob, 45})\` returns \`alice\`.
     - \`telecom_events:extract_caller({call_event, 202, carol, dave, 120})\` returns \`carol\`.

3. \`swap_endpoints(Event)\`:
   - **Input**: A 5-element \`call_event\` tuple containing call identifier, caller, callee, and duration.
   - **Behavior**: Validates and destructures the event in $O(1)$ time and returns a newly constructed 5-element \`call_event\` tuple with \`Caller\` and \`Callee\` positions exchanged while keeping \`Id\` and elapsed duration unchanged.
   - **Examples**:
     - \`telecom_events:swap_endpoints({call_event, 101, alice, bob, 45})\` returns \`{call_event, 101, bob, alice, 45}\`.
     - \`telecom_events:swap_endpoints({call_event, 500, gateway_a, gateway_b, 0})\` returns \`{call_event, 500, gateway_b, gateway_a, 0}\`.

## Rules & Verification Constraints

- **Exports**: \`telecom_events\` must export \`make_event/3\`, \`extract_caller/1\`, and \`swap_endpoints/1\`.
- **Tagged Tuple Contract**: Pattern-match on the leading \`call_event\` tag and 5-element structure so mismatched tags or arities fail cleanly rather than succeeding silently.
- **Primitives Only**: Do not use binaries or maps—stick strictly to atoms, integers, and tuples with zero unused-variable warnings.`,
    otpDocCards: [
      {
        functionName: 'tuple_size',
        module: 'erlang',
        signature: 'tuple_size(Tuple) -> integer() >= 0',
        typesSpec: ['Tuple = tuple()'],
        description: 'Returns the number of elements in a tuple in O(1) time.',
        complexityNote: 'O(1) BIF reading the tuple header arity word directly.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#tuple_size/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/erts/emulator/beam/bif.c',
      },
    ],
    mentalModelCheck: {
      question: 'Why is comparing two atoms like (Status =:= active) faster than comparing two strings like ("active" =:= "active")?',
      options: [
        {
          id: 'A',
          label: 'Because strings are compiled to regular expressions in Erlang',
          isCorrect: false,
          explanation: 'Strings in Erlang are lists of integer codepoints, not regexes.',
        },
        {
          id: 'B',
          label: 'Because atoms are interned in a global table, reducing comparison to a single-cycle integer pointer check',
          isCorrect: true,
          explanation: 'Atoms exist once in the Atom Table. Comparing them is an O(1) pointer comparison; comparing strings requires traversing list nodes.',
        },
        {
          id: 'C',
          label: 'Because atoms are stored directly in CPU registers rather than on the heap',
          isCorrect: false,
          explanation: 'Atoms are represented as tagged pointer words referencing the Atom Table.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch01-04-a',
        title: 'Create Tagged Telecom Event',
        erlangCall: 'telecom_events:make_event(101, alice, bob)',
        expectedOutput: '{call_event, 101, alice, bob, 0}',
        explanation: 'Constructs tagged 5-tuple with 0 initial duration.',
      },
      {
        id: 'tc-ch01-04-b',
        title: 'Extract Caller from Event Tuple',
        erlangCall: 'telecom_events:extract_caller({call_event, 101, alice, bob, 45})',
        expectedOutput: 'alice',
        explanation: 'Extracts caller atom alice via pattern matching.',
      },
      {
        id: 'tc-ch01-04-c',
        title: 'Swap Caller and Callee Endpoints',
        erlangCall: 'telecom_events:swap_endpoints({call_event, 101, alice, bob, 45})',
        expectedOutput: '{call_event, 101, bob, alice, 45}',
        explanation: 'Swaps alice and bob positions while preserving Id and Duration.',
      },
    ],
    astRules: {
      requiredCalls: [],
    },
    solutionExplanation: 'Demonstrates tagged 5-tuple construction, strict tag-validated field extraction, and immutable element swapping via pattern matching.',
    files: [
      {
        name: 'telecom_events.erl',
        path: 'src/telecom_events.erl',
        content: `-module(telecom_events).
-export([make_event/3, extract_caller/1, swap_endpoints/1]).

%% @doc Construct a tagged 5-element call event combining Id, Caller, Callee, and zero initial duration.
make_event(_Id, _Caller, _Callee) ->
    ok.

%% @doc Extract and return the caller endpoint atom from a tagged 5-element call event.
extract_caller(_Event) ->
    ok.

%% @doc Return an updated 5-element call event with Caller and Callee swapped while keeping Id and duration intact.
swap_endpoints(_Event) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/telecom_events.erl': `-module(telecom_events).
-export([make_event/3, extract_caller/1, swap_endpoints/1]).

%% @doc Construct a tagged 5-element call event combining Id, Caller, Callee, and zero initial duration.
make_event(Id, Caller, Callee) ->
    {call_event, Id, Caller, Callee, 0}.

%% @doc Extract and return the caller endpoint atom from a tagged 5-element call event.
extract_caller(Event) ->
    {call_event, _Id, Caller, _Callee, _Duration} = Event,
    Caller.

%% @doc Return an updated 5-element call event with Caller and Callee swapped while keeping Id and duration intact.
swap_endpoints(Event) ->
    {call_event, Id, Caller, Callee, Duration} = Event,
    {call_event, Id, Callee, Caller, Duration}.`,
    },
    starterCode: `-module(telecom_events).
-export([make_event/3, extract_caller/1, swap_endpoints/1]).

%% @doc Construct a tagged 5-element call event combining Id, Caller, Callee, and zero initial duration.
make_event(_Id, _Caller, _Callee) ->
    ok.

%% @doc Extract and return the caller endpoint atom from a tagged 5-element call event.
extract_caller(_Event) ->
    ok.

%% @doc Return an updated 5-element call event with Caller and Callee swapped while keeping Id and duration intact.
swap_endpoints(_Event) ->
    ok.`,
    solutionCode: `-module(telecom_events).
-export([make_event/3, extract_caller/1, swap_endpoints/1]).

%% @doc Construct a tagged 5-element call event combining Id, Caller, Callee, and zero initial duration.
make_event(Id, Caller, Callee) ->
    {call_event, Id, Caller, Callee, 0}.

%% @doc Extract and return the caller endpoint atom from a tagged 5-element call event.
extract_caller(Event) ->
    {call_event, _Id, Caller, _Callee, _Duration} = Event,
    Caller.

%% @doc Return an updated 5-element call event with Caller and Callee swapped while keeping Id and duration intact.
swap_endpoints(Event) ->
    {call_event, Id, Caller, Callee, Duration} = Event,
    {call_event, Id, Callee, Caller, Duration}.`,
  },

  // ── Lesson 1.5: Lists & Character Strings ────────────────────────────────
  {
    id: 'ch01-l05',
    chapterNumber: 1,
    lessonNumber: 5,
    lessonType: 'concept_exercise',
    title: 'Lists, Cons Cells [H | T] & The Character List Mystery',
    difficulty: 'Beginner',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In distributed systems, streams of incoming network packets, database query rows, and log records are processed as **dynamically sized linked lists**.

Unlike tuples (which have a fixed size allocated upfront), Erlang **Lists** can grow and shrink dynamically. Understanding how the BEAM lays out lists in memory is the single most critical performance concept in sequential Erlang: it is the difference between an $O(1)$ instant operation and an $O(N)$ CPU freeze.

## Deep Concept Breakdown & Under the Hood

### Cons Cells: The Anatomy of a List
An Erlang list is a **singly-linked chain of 2-word Cons Cells**.
Each cons cell contains:
1. **Head**: A pointer to the current element.
2. **Tail**: A pointer to the rest of the list (or the empty list \`[]\`).

The syntax \`[Head | Tail]\` represents a cons cell:
\`\`\`erlang
[1, 2, 3]  %% Sugar for: [1 | [2 | [3 | []]]]
\`\`\`

### The Golden Performance Rule: Prepend, Never Append!
- **Prepending (\`[NewItem | ExistingList]\`) is $O(1)$ Zero-Copy**:
  Erlang simply allocates a single new 2-word cons cell whose tail points to the existing list. The existing list is untouched and shared in memory.
- **Appending (\`List ++ [NewItem]\`) is $O(N)$ Memory Copy**:
  To add to the end of a singly-linked list, the BEAM must walk every single node in \`List\` from left to right, re-allocating new cons cells for the entire list!

### Destructuring Multiple Front Elements
You can extract multiple elements from the head of a list using pattern matching:
\`\`\`erlang
[A, B | Tail] = [10, 20, 30, 40].
%% A is 10, B is 20, Tail is [30, 40]
\`\`\`

> [!WARNING] The Character List Mystery: Why [97, 98, 99] Prints as "abc"
> Every beginner in Erlang encounters this baffling phenomenon in the shell:
> \`\`\`erlang
> 1> [97, 98, 99].
> "abc"
> \`\`\`
> **Why?** In classical Erlang, **strings are literally linked lists of integer ASCII/Unicode codepoints**!
> When the shell prints a list, if every number in the list happens to be a printable ASCII character, the shell renders it as a double-quoted string (\`"abc"\`).
> To get the integer codepoint of any character, use the \`$Char\` syntax:
> \`$a\` evaluates to \`97\`, \`$A\` evaluates to \`65\`, and \`$\\s\` evaluates to \`32\` (space).

## Parallel Worked Example

Consider a framing buffer utility that atomically pushes pairs of priority tags onto a queue and computes 0-based alphabet offsets from ASCII packet headers:

\`\`\`erlang
-module(packet_ring).
-export([push_batch/3, inspect_ascii_offset/1]).

%% Prepend two framed tags in O(1) cons steps without traversing Backlog
push_batch(PrimaryTag, SecondaryTag, Backlog) ->
    WithSecond = [SecondaryTag | Backlog],
    [PrimaryTag | WithSecond].

%% Extract the head byte from an ASCII frame string and compute its offset from $A (65)
inspect_ascii_offset(FrameChars) ->
    [LeadCode | Remainder] = FrameChars,
    {LeadCode - $A, Remainder}.
\`\`\`

Notice how the BEAM evaluates each operation:
- \`push_batch/3\` builds two cons cells (\`[SecondaryTag | Backlog]\`, then \`[PrimaryTag | WithSecond]\`) in $O(1)$ time while sharing \`Backlog\` in memory.
- \`inspect_ascii_offset/1\` pattern-matches the head integer codepoint \`LeadCode\` and tail list \`Remainder\` directly from a character string, performing arithmetic with character literal \`$A\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Erlang Reference Manual (Lists)
[Element1, Element2, ..., ElementN]
  Cons cell chain terminated by [].
  Prepend: [New | List] -> O(1) time and memory.
  Concat:  List1 ++ List2 -> O(length(List1)) time and memory.
\`\`\`
> **How to Read This Spec**: Erlang lists are linked chains of 2-word cons cells, so pattern matching \`[H | T]\` and built-ins like \`erlang:hd/1\` / \`erlang:tl/1\` read the front cell pointers in $O(1)$ time. Open the attached **\`hd_and_tl\` Reference Card** below for official ERTS documentation and BIF source links.

## Assignment Specification

In \`src/list_ops.erl\`, implement and export \`prepend_item/2\`, \`swap_first_two/1\`, and \`ascii_initial/1\` using pure list pattern matching and cons construction:

1. \`prepend_item(Item, List)\`:
   - **Input**: An arbitrary term \`Item\` and an existing list \`List\` (empty or populated).
   - **Behavior**: Returns a new list with \`Item\` at the front in $O(1)$ constant time, sharing \`List\` cleanly without copying elements.
   - **Examples**:
     - \`list_ops:prepend_item(10, [20, 30])\` returns \`[10, 20, 30]\`.
     - \`list_ops:prepend_item(first, [])\` returns \`[first]\`.

2. \`swap_first_two(List)\`:
   - **Input**: A proper list containing at least two elements.
   - **Behavior**: Destructures the first two elements and returns a new list with their positions reversed in $O(1)$ time while preserving the remaining tail order unchanged; fails cleanly when given fewer than two elements.
   - **Examples**:
     - \`list_ops:swap_first_two([alpha, beta, gamma, delta])\` returns \`[beta, alpha, gamma, delta]\`.
     - \`list_ops:swap_first_two([1, 2])\` returns \`[2, 1]\`.

3. \`ascii_initial(NameString)\`:
   - **Input**: A non-empty double-quoted character string (codepoint list).
   - **Behavior**: Extracts the integer codepoint of the string's leading character in $O(1)$ time and returns it as a 2-tuple tagged with the atom \`char_code\`, failing cleanly on an empty string.
   - **Examples**:
     - \`list_ops:ascii_initial("Erlang")\` returns \`{char_code, 69}\` (uppercase ASCII E has codepoint 69).
     - \`list_ops:ascii_initial("BEAM")\` returns \`{char_code, 66}\` (uppercase ASCII B has codepoint 66).

## Rules & Verification Constraints

- **Exports**: \`list_ops\` must export \`prepend_item/2\`, \`swap_first_two/1\`, and \`ascii_initial/1\`.
- **No \`lists\` Library Helpers**: Do not call \`lists:append/2\`, \`lists:nth/2\`, \`lists:reverse/1\`, or \`lists:concat/1\` (enforced by AST verification)—use direct cons cells and pattern matching.
- **Boundary & Compiler Cleanliness**: Compile with zero unused-variable warnings and reject under-length inputs (\`swap_first_two([one])\`, \`ascii_initial("")\`).`,
    otpDocCards: [
      {
        functionName: 'hd_and_tl',
        module: 'erlang',
        signature: 'hd(List) -> term(), tl(List) -> list()',
        typesSpec: ['List = [term(), ...]'],
        description: 'Returns the head and tail of a non-empty list.',
        complexityNote: 'O(1) BIF reading cons cell pointers directly.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#hd/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/erts/emulator/beam/bif.c',
      },
    ],
    mentalModelCheck: {
      question: 'Why does appending an item with (List ++ [Item]) perform significantly worse than prepending with [Item | List]?',
      options: [
        {
          id: 'A',
          label: 'Because the BEAM must scan and re-allocate every cons cell in the left list from beginning to end to point to the new item',
          isCorrect: true,
          explanation: 'Lists are singly-linked. Adding to the end requires traversing and copying all N previous nodes.',
        },
        {
          id: 'B',
          label: 'Because the ++ operator triggers an operating system system call to allocate virtual memory',
          isCorrect: false,
          explanation: 'List concatenation is handled by the emulator allocator on the process heap, not an OS syscall.',
        },
        {
          id: 'C',
          label: 'Because Erlang locks the entire node whenever ++ is evaluated to prevent race conditions',
          isCorrect: false,
          explanation: 'Erlang processes have independent private heaps; no locks are involved in list concatenation.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch01-05-a',
        title: 'Prepend Element to List',
        erlangCall: 'list_ops:prepend_item(10, [20, 30])',
        expectedOutput: '[10, 20, 30]',
        explanation: 'Prepends 10 to the front of the list in O(1) constant time.',
      },
      {
        id: 'tc-ch01-05-b',
        title: 'Swap First Two List Elements',
        erlangCall: 'list_ops:swap_first_two([alpha, beta, gamma, delta])',
        expectedOutput: '[beta, alpha, gamma, delta]',
        explanation: 'Exchanges the leading two list elements while preserving the remaining tail order.',
      },
      {
        id: 'tc-ch01-05-c',
        title: 'Extract Integer ASCII Codepoint',
        erlangCall: 'list_ops:ascii_initial("Erlang")',
        expectedOutput: '{char_code, 69}',
        explanation: 'Reads the integer codepoint of the leading character in "Erlang" (69) into a tagged 2-tuple.',
      },
    ],
    astRules: {
      requiredCalls: [],
      forbiddenCalls: ['lists:append/2', 'lists:nth/2', 'lists:reverse/1', 'lists:concat/1'],
    },
    solutionExplanation: 'Uses cons cell construction for O(1) prepending, front-element pattern matching for element swapping, and head codepoint destructuring on Erlang character lists.',
    files: [
      {
        name: 'list_ops.erl',
        path: 'src/list_ops.erl',
        content: `-module(list_ops).
-export([prepend_item/2, swap_first_two/1, ascii_initial/1]).

%% @doc Prepend Item onto the front of List in O(1) constant time without copying List.
prepend_item(_Item, _List) ->
    ok.

%% @doc Return a list with the first two elements swapped while keeping the remaining tail unchanged; fail cleanly if fewer than two elements exist.
swap_first_two(_List) ->
    ok.

%% @doc Extract the integer codepoint of the first character in non-empty NameString as a tagged character-code 2-tuple; fail cleanly on empty input.
ascii_initial(_NameString) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/list_ops.erl': `-module(list_ops).
-export([prepend_item/2, swap_first_two/1, ascii_initial/1]).

%% @doc Prepend Item onto the front of List in O(1) constant time without copying List.
prepend_item(Item, List) ->
    [Item | List].

%% @doc Return a list with the first two elements swapped while keeping the remaining tail unchanged; fail cleanly if fewer than two elements exist.
swap_first_two(List) ->
    [First, Second | Rest] = List,
    [Second, First | Rest].

%% @doc Extract the integer codepoint of the first character in non-empty NameString as a tagged character-code 2-tuple; fail cleanly on empty input.
ascii_initial(NameString) ->
    [FirstCharCode | _Rest] = NameString,
    {char_code, FirstCharCode}.`,
    },
    starterCode: `-module(list_ops).
-export([prepend_item/2, swap_first_two/1, ascii_initial/1]).

%% @doc Prepend Item onto the front of List in O(1) constant time without copying List.
prepend_item(_Item, _List) ->
    ok.

%% @doc Return a list with the first two elements swapped while keeping the remaining tail unchanged; fail cleanly if fewer than two elements exist.
swap_first_two(_List) ->
    ok.

%% @doc Extract the integer codepoint of the first character in non-empty NameString as a tagged character-code 2-tuple; fail cleanly on empty input.
ascii_initial(_NameString) ->
    ok.`,
    solutionCode: `-module(list_ops).
-export([prepend_item/2, swap_first_two/1, ascii_initial/1]).

%% @doc Prepend Item onto the front of List in O(1) constant time without copying List.
prepend_item(Item, List) ->
    [Item | List].

%% @doc Return a list with the first two elements swapped while keeping the remaining tail unchanged; fail cleanly if fewer than two elements exist.
swap_first_two(List) ->
    [First, Second | Rest] = List,
    [Second, First | Rest].

%% @doc Extract the integer codepoint of the first character in non-empty NameString as a tagged character-code 2-tuple; fail cleanly on empty input.
ascii_initial(NameString) ->
    [FirstCharCode | _Rest] = NameString,
    {char_code, FirstCharCode}.`,
  },

  // ── Lesson 1.6: Modules, Arity & Compile-Time Macros ─────────────────────
  {
    id: 'ch01-l06',
    chapterNumber: 1,
    lessonNumber: 6,
    lessonType: 'concept_exercise',
    title: 'Modules, Exports, Function Arity & Compile-Time Macros',
    difficulty: 'Beginner',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

Large software systems fail when interfaces are ambiguous. In Erlang, every unit of code belongs to a **Module**, and every function is strictly identified by both its name and its **Arity** (the number of arguments it accepts), written as \`Function/Arity\`.

Furthermore, production systems rely on **Compile-Time Macros (\`-define\`)** to configure system-wide timeouts, buffer sizes, and default ports without magic numbers scattered throughout the code.

## Deep Concept Breakdown & Under the Hood

### Modules and Exports
- \`-module(cache_client).\`: Declares the module name. The file must be named \`cache_client.erl\`.
- \`-export([query_cache/1, query_cache/2, query_cache/3]).\`: Declares which functions are public. Any function not in the export list is private to the module and cannot be called from outside.

### Arity: Functions with the Same Name are Completely Distinct
In languages like Python or JavaScript, defining \`def query_cache(key)\` followed by \`def query_cache(key, ttl)\` overwrites the first definition.
**In Erlang, \`query_cache/1\`, \`query_cache/2\`, and \`query_cache/3\` are three completely distinct functions!**
They can have different logic, different return types, and different implementations.

In idiomatic Erlang, functions with lower arity are used to provide **Default Arguments** by calling higher-arity versions:
\`\`\`erlang
query_cache(Key) ->
    query_cache(Key, ?DEFAULT_TTL).

query_cache(Key, TtlSeconds) ->
    query_cache(Key, TtlSeconds, ?DEFAULT_REGION).

query_cache(Key, TtlSeconds, Region) ->
    {cache_query, Key, TtlSeconds, Region}.
\`\`\`

### Compile-Time Macros (\`-define\`)
Macros allow defining compile-time constants:
\`\`\`erlang
-define(DEFAULT_TTL, 60).
-define(DEFAULT_REGION, us_east).
\`\`\`
To invoke a macro in code, prepend a question mark (\`?\`):
\`\`\`erlang
?DEFAULT_TTL     %% Expands to 60 at compile time
?MODULE          %% Built-in macro: expands to the current module atom (cache_client)
\`\`\`

> [!WARNING] Common Beginner Syntax Trap: The ? Symbol on Macros
> Forgetting the \`?\` symbol when using a macro is a frequent beginner mistake.
> Writing \`query_cache(Key, DEFAULT_TTL)\` treats \`DEFAULT_TTL\` as an unbound variable, throwing an \`unbound variable\` error!
> Always prefix macro names with \`?\`: \`?DEFAULT_TTL\`.

## Parallel Worked Example

Consider a distributed backoff scheduler that delegates from a 1-argument convenience entry point to a 2-argument implementation tagged with \`?MODULE\`:

\`\`\`erlang
-module(retry_policy).
-export([schedule_retry/1, schedule_retry/2]).

-define(DEFAULT_DELAY_MS, 250).

%% Delegate single-argument retry scheduling using the compile-time delay constant
schedule_retry(Attempt) ->
    schedule_retry(Attempt, ?DEFAULT_DELAY_MS).

%% Construct a tagged retry directive embedding the enclosing ?MODULE atom
schedule_retry(Attempt, DelayMs) ->
    {retry_plan, ?MODULE, Attempt, DelayMs * Attempt}.
\`\`\`

Notice how the BEAM compiles and executes each piece:
- \`schedule_retry/1\` delegates to \`schedule_retry/2\` by substituting \`?DEFAULT_DELAY_MS\` (\`250\`) before AST compilation completes.
- \`?MODULE\` expands automatically to the enclosing atom \`retry_policy\`, keeping module identity accurate if the file is ever renamed.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Erlang Reference Manual (Preprocessor Macros)
-define(Const, Replacement).
?Const
  Expands Const to Replacement before compiler syntax analysis.
  ?MODULE expands to the atom name of the enclosing module.
\`\`\`
> **How to Read This Spec**: Macros perform preprocessor text replacement before parsing, while exported arities like \`Fun/1\` and \`Fun/2\` are compiled as independent function table entries inspectable via \`Module:module_info/0\`. Open the attached **\`module_info\` Reference Card** below for official OTP module metadata documentation and ERTS source links.

## Assignment Specification

In \`src/arity_calc.erl\`, define compile-time constants and implement/export \`connect/1\`, \`connect/2\`, and \`connect/3\`:

1. **Compile-Time Macros**:
   - Define \`DEFAULT_PORT\` with integer value \`80\`.
   - Define \`DEFAULT_TIMEOUT\` with integer value \`5000\` (milliseconds).

2. **Cascading Functions**:
   - \`connect(Host)\`:
     - **Input**: A host identifier \`Host\` (atom or string, e.g., \`localhost\`).
     - **Behavior**: Supplies the default port macro and delegates in $O(1)$ time to \`connect/2\`.
     - **Examples**:
       - \`arity_calc:connect(localhost)\` returns \`{connection, arity_calc, localhost, 80, 5000}\`.
   - \`connect(Host, Port)\`:
     - **Input**: A host identifier \`Host\` and integer \`Port\`.
     - **Behavior**: Supplies the default timeout macro and delegates in $O(1)$ time to \`connect/3\`.
     - **Examples**:
       - \`arity_calc:connect(localhost, 8080)\` returns \`{connection, arity_calc, localhost, 8080, 5000}\`.
   - \`connect(Host, Port, Timeout)\`:
     - **Input**: A host identifier \`Host\`, integer \`Port\`, and integer \`Timeout\`.
     - **Behavior**: Constructs and returns a 5-element tagged tuple in $O(1)$ time starting with the tag atom \`connection\`, followed by the current module atom (using \`?MODULE\`), \`Host\`, \`Port\`, and \`Timeout\`.
     - **Examples**:
       - \`arity_calc:connect(localhost, 8080, 2500)\` returns \`{connection, arity_calc, localhost, 8080, 2500}\`.

## Rules & Verification Constraints

- **Exports**: \`arity_calc\` must export \`connect/1\`, \`connect/2\`, and \`connect/3\`.
- **Cascading Delegation & Macros**: Reference \`?DEFAULT_PORT\`, \`?DEFAULT_TIMEOUT\`, and \`?MODULE\` inside the function bodies, and delegate from \`connect/1\` -> \`connect/2\` -> \`connect/3\` rather than hardcoding literals (verified by AST and source checks).
- **Primitives Only**: Do not use Maps or Binaries—pass host names as atoms or strings (e.g., \`localhost\` or \`"api.erlang.org"\`) with zero compiler warnings.`,
    otpDocCards: [
      {
        functionName: 'module_info',
        module: 'erlang',
        signature: 'Module:module_info() -> proplist()',
        typesSpec: ['Module = atom()'],
        description: 'Returns compilation metadata and exported functions of a module.',
        complexityNote: 'O(1) table lookup in the code server.',
        officialUrl: 'https://www.erlang.org/doc/system/modules.html#module_info/0',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/erts/emulator/beam/beam_emu.c',
      },
    ],
    mentalModelCheck: {
      question: 'In Erlang, how does the compiler treat two functions named fetch/1 and fetch/2 declared in the same module?',
      options: [
        {
          id: 'A',
          label: 'As two completely distinct functions that happen to share a name prefix',
          isCorrect: true,
          explanation: 'Function identity in Erlang is strictly the pair Name/Arity. fetch/1 and fetch/2 are separate functions.',
        },
        {
          id: 'B',
          label: 'As a single overloaded function where arity 1 provides an optional second parameter defaulted to undefined',
          isCorrect: false,
          explanation: 'Erlang has no automatic optional parameter mechanism; default parameters must be implemented explicitly via delegation.',
        },
        {
          id: 'C',
          label: 'The compiler issues a duplicate_function warning and ignores fetch/1',
          isCorrect: false,
          explanation: 'They have different arities, so there is no duplicate name collision.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch01-06-a',
        title: 'Connect with Default Port and Timeout (Arity 1)',
        erlangCall: 'arity_calc:connect(localhost)',
        expectedOutput: '{connection, arity_calc, localhost, 80, 5000}',
        explanation: 'Applies both compile-time defaults (port 80 and timeout 5000ms) through arity delegation.',
      },
      {
        id: 'tc-ch01-06-b',
        title: 'Connect with Explicit Port (Arity 2)',
        erlangCall: 'arity_calc:connect(localhost, 8080)',
        expectedOutput: '{connection, arity_calc, localhost, 8080, 5000}',
        explanation: 'Preserves explicit port 8080 and applies the default 5000ms timeout.',
      },
      {
        id: 'tc-ch01-06-c',
        title: 'Connect with Full Parameters (Arity 3)',
        erlangCall: 'arity_calc:connect(localhost, 8080, 2500)',
        expectedOutput: '{connection, arity_calc, localhost, 8080, 2500}',
        explanation: 'Directly returns the 5-element tagged tuple with explicit port and timeout.',
      },
    ],
    astRules: {
      requiredCalls: ['arity_calc:connect/2', 'arity_calc:connect/3'],
    },
    solutionExplanation: 'Demonstrates cascading default-argument delegation across arities using compile-time macros ?DEFAULT_PORT, ?DEFAULT_TIMEOUT, and ?MODULE.',
    files: [
      {
        name: 'arity_calc.erl',
        path: 'src/arity_calc.erl',
        content: `-module(arity_calc).
-export([connect/1, connect/2, connect/3]).

-define(DEFAULT_PORT, 80).
-define(DEFAULT_TIMEOUT, 5000).

%% @doc Connect using default port and timeout macros by delegating to connect/2.
connect(_Host) ->
    ok.

%% @doc Connect using explicit Port and default timeout macro by delegating to connect/3.
connect(_Host, _Port) ->
    ok.

%% @doc Construct a 5-element tagged connection tuple embedding the current module identifier.
connect(_Host, _Port, _Timeout) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/arity_calc.erl': `-module(arity_calc).
-export([connect/1, connect/2, connect/3]).

-define(DEFAULT_PORT, 80).
-define(DEFAULT_TIMEOUT, 5000).

%% @doc Connect using default port and timeout macros by delegating to connect/2.
connect(Host) ->
    connect(Host, ?DEFAULT_PORT).

%% @doc Connect using explicit Port and default timeout macro by delegating to connect/3.
connect(Host, Port) ->
    connect(Host, Port, ?DEFAULT_TIMEOUT).

%% @doc Construct a 5-element tagged connection tuple embedding the current module identifier.
connect(Host, Port, Timeout) ->
    {connection, ?MODULE, Host, Port, Timeout}.`,
    },
    starterCode: `-module(arity_calc).
-export([connect/1, connect/2, connect/3]).

-define(DEFAULT_PORT, 80).
-define(DEFAULT_TIMEOUT, 5000).

%% @doc Connect using default port and timeout macros by delegating to connect/2.
connect(_Host) ->
    ok.

%% @doc Connect using explicit Port and default timeout macro by delegating to connect/3.
connect(_Host, _Port) ->
    ok.

%% @doc Construct a 5-element tagged connection tuple embedding the current module identifier.
connect(_Host, _Port, _Timeout) ->
    ok.`,
    solutionCode: `-module(arity_calc).
-export([connect/1, connect/2, connect/3]).

-define(DEFAULT_PORT, 80).
-define(DEFAULT_TIMEOUT, 5000).

%% @doc Connect using default port and timeout macros by delegating to connect/2.
connect(Host) ->
    connect(Host, ?DEFAULT_PORT).

%% @doc Connect using explicit Port and default timeout macro by delegating to connect/3.
connect(Host, Port) ->
    connect(Host, Port, ?DEFAULT_TIMEOUT).

%% @doc Construct a 5-element tagged connection tuple embedding the current module identifier.
connect(Host, Port, Timeout) ->
    {connection, ?MODULE, Host, Port, Timeout}.`,
  },

  // ── Lesson 1.7: Multi-Clause Functions & Punctuation Triad ───────────────
  {
    id: 'ch01-l07',
    chapterNumber: 1,
    lessonNumber: 7,
    lessonType: 'concept_exercise',
    title: 'Multi-Clause Functions & The Punctuation Triad (, ; .)',
    difficulty: 'Beginner',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In mainstream programming languages, decision-making is expressed using nested \`if / else if / else\` branches or \`switch / case\` statements. In Erlang, branching is elevated to the function signature itself through **Multi-Clause Functions**.

When a function is called, the BEAM VM matches the arguments against each clause from top to bottom. The first clause whose pattern matches the arguments executes.

However, writing multi-clause functions requires understanding Erlang's most famous punctuation convention: **The Punctuation Triad**.

## Deep Concept Breakdown & Under the Hood

### The Punctuation Triad Explained
Erlang's punctuation is based on the logic of formal written English:

1. **, (Comma) — "AND THEN"**:
   Separates expressions inside the body of a clause.
   \`\`\`erlang
   Step1 = calculate_tax(),
   Step2 = apply_discount(Step1)  %% comma tells compiler: "continue to next line"
   \`\`\`

2. **; (Semicolon) — "OR ELSE"**:
   Separates alternative clauses of the **same function and arity**.
   \`\`\`erlang
   grade(1) -> gold;              %% semicolon tells compiler: "or try next clause"
   grade(2) -> silver             %% no semicolon on the final clause
   \`\`\`

3. **. (Period) — "FULL STOP"**:
   Placed **only at the very end of the entire function definition**.
   \`\`\`erlang
   grade(3) -> bronze.            %% period tells compiler: "function definition complete"
   \`\`\`

> [!WARNING] The Most Common Beginner Compiler Error
> Putting a period (\`.\`) instead of a semicolon (\`;\`) between function clauses immediately terminates the function!
> If you write:
> \`\`\`erlang
> handle(ok) -> success.
> handle(error) -> failure.
> \`\`\`
> The compiler will scream: \`defining already defined function handle/1\` or \`syntax error before: '->'\`!
> **Rule:** Use \`;\` between clauses; use \`.\` only after the last clause.

### Matching Repeated Variables in Patterns
Erlang allows the **same variable to appear multiple times in a single pattern**.
When a variable name appears twice within the same pattern head, Erlang asserts that both occurrences must be identical for the clause to match:
\`\`\`erlang
is_loopback({Endpoint, Endpoint}) -> {loopback, Endpoint};
is_loopback({_Source, _Dest})      -> external_route.
\`\`\`
If called with \`{node_a, node_a}\`, \`Endpoint\` binds to \`node_a\` on the left and asserts equality with \`node_a\` on the right. The clause matches!
If called with \`{node_a, node_b}\`, the first clause fails to match, falling through to the second clause.

## Parallel Worked Example

Consider a deterministic signal dispatcher demonstrating semicolon-separated multi-clause heads, list vs atom matching, and repeated variable binding across arguments:

\`\`\`erlang
-module(gate_dispatch).
-export([classify_signal/1, confirm_dual_reading/2]).

%% Dispatch empty lists, non-empty queues, named atoms, and fallback inputs via ';' and '.'
classify_signal([]) ->
    {empty, halt};
classify_signal([Priority | _Queue]) ->
    {queued, Priority};
classify_signal(reset) ->
    cleared;
classify_signal(_Other) ->
    {ignored, unknown_signal}.

%% Repeated variable ExpectedTag asserts arg 1 equals the tag inside arg 2's sensor tuple
confirm_dual_reading(ExpectedTag, {sensor, ExpectedTag, Value}) ->
    {verified, ExpectedTag, Value};
confirm_dual_reading(_ExpectedTag, _Sample) ->
    rejected.
\`\`\`

Notice how the BEAM evaluates each feature:
- Each clause of \`classify_signal/1\` separates alternative heads with \`;\`, ending only the final \`_Other\` fallback clause with a period \`.\`.
- Non-empty list pattern \`[Priority | _Queue]\` matches the front signal in $O(1)$ time and skips earlier clauses cleanly on \`[]\`.
- \`confirm_dual_reading/2\` reuses \`ExpectedTag\` twice in the first clause head to assert structural equality without writing an explicit \`if\` branch.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Erlang Reference Manual (Function Definition Syntax)
Name(Patterns1) -> Body1;
Name(Patterns2) -> Body2;
...
Name(PatternsN) -> BodyN.
  Clauses are evaluated sequentially from top to bottom.
  First matching pattern executes.
  If no pattern matches, a function_clause run-time exception occurs.
\`\`\`
> **How to Read This Spec**: Erlang evaluates clauses sequentially from top to bottom until the first clause pattern unifies with the supplied arguments; reaching past the final clause without matching raises a \`function_clause\` exception. Open the attached **\`function_clause\` Reference Card** below for official OTP error-handling documentation and ERTS source links.

## Assignment Specification

In \`src/clause_router.erl\`, implement and export \`describe_status/1\`, \`head_or_default/2\`, and \`verify_identical_pair/1\`:

1. \`describe_status(Code)\`:
   - **Input**: An integer HTTP-style status code \`Code\`.
   - **Behavior**: Routes known status codes in $O(1)$ time across function clauses and falls back cleanly for any unrecognized code:
     - \`200\` returns \`{ok, success}\`.
     - \`404\` returns \`{error, not_found}\`.
     - \`500\` returns \`{error, server_crash}\`.
     - Any other input returns \`{error, unknown_code}\`.
   - **Examples**:
     - \`clause_router:describe_status(200)\` returns \`{ok, success}\`.
     - \`clause_router:describe_status(404)\` returns \`{error, not_found}\`.
     - \`clause_router:describe_status(418)\` returns \`{error, unknown_code}\`.

2. \`head_or_default(List, Default)\`:
   - **Input**: A proper list \`List\` and fallback term \`Default\`.
   - **Behavior**: Returns the first element in $O(1)$ time when \`List\` is non-empty, or returns \`Default\` when \`List\` is empty.
   - **Examples**:
     - \`clause_router:head_or_default([packet, ping], fallback)\` returns \`packet\`.
     - \`clause_router:head_or_default([], 999)\` returns \`999\`.
     - \`clause_router:head_or_default([], default_val)\` returns \`default_val\`.

3. \`verify_identical_pair(PairTuple)\`:
   - **Input**: A 2-element tuple (or non-matching fallback term).
   - **Behavior**: Checks whether \`PairTuple\` is a 2-element tuple whose two elements match strictly in both value and runtime type in $O(1)$ time using clause-head pattern matching:
     - When both elements are strictly identical (\`Value\`), returns \`{matched, Value}\`.
     - Otherwise (mismatched elements or wrong tuple size), returns \`mismatch\`.
   - **Examples**:
     - \`clause_router:verify_identical_pair({alpha, alpha})\` returns \`{matched, alpha}\`.
     - \`clause_router:verify_identical_pair({omega, omega})\` returns \`{matched, omega}\`.
     - \`clause_router:verify_identical_pair({alpha, beta})\` returns \`mismatch\`.

## Rules & Verification Constraints

- **Exports**: \`clause_router\` must export \`describe_status/1\`, \`head_or_default/2\`, and \`verify_identical_pair/1\`.
- **No \`if\` Expressions**: Enforced via AST verification (\`if_expr\` is forbidden)—rely on multi-clause function heads separated by \`;\` and ending in \`.\`.
- **Strict Type Matching & Clean Compilation**: Must distinguish numeric types (\`{42, 42.0}\` -> \`mismatch\`), reject non-pairs cleanly, and compile with zero unused-variable warnings.`,
    otpDocCards: [
      {
        functionName: 'function_clause',
        module: 'erlang',
        signature: 'function_clause exception',
        typesSpec: ['Exception = {function_clause, [{Mod, Fun, Args, Loc}]}'],
        description: 'Exception raised when no clause pattern in a function matches the supplied arguments.',
        complexityNote: 'Standard runtime error reporting top-to-bottom clause exhaustion.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/errors.html#exceptions',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/erts/emulator/beam/beam_emu.c',
      },
    ],
    mentalModelCheck: {
      question: 'In an Erlang multi-clause function, what happens if you end the first clause with a period (.) instead of a semicolon (;)?',
      options: [
        {
          id: 'A',
          label: 'The compiler terminates the function definition prematurely and throws a syntax error on the next clause',
          isCorrect: true,
          explanation: 'A period marks the full stop of the entire function. Semicolons must separate individual clauses.',
        },
        {
          id: 'B',
          label: 'The compiler treats the period as an automatic fallback return statement',
          isCorrect: false,
          explanation: 'Erlang has no return keyword or fallback punctuation; the period only terminates definitions.',
        },
        {
          id: 'C',
          label: 'The BEAM VM executes both clauses concurrently on separate schedulers',
          isCorrect: false,
          explanation: 'Punctuation controls sequential syntax compilation, not concurrent execution.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch01-07-a',
        title: 'Route Status Code 200',
        erlangCall: 'clause_router:describe_status(200)',
        expectedOutput: '{ok, success}',
        explanation: 'Matches first clause for 200.',
      },
      {
        id: 'tc-ch01-07-b',
        title: 'Empty List Head or Default',
        erlangCall: 'clause_router:head_or_default([], 999)',
        expectedOutput: '999',
        explanation: 'Matches second clause for empty list and returns default.',
      },
      {
        id: 'tc-ch01-07-c',
        title: 'Match Identical Pair Tuple',
        erlangCall: 'clause_router:verify_identical_pair({omega, omega})',
        expectedOutput: '{matched, omega}',
        explanation: 'Matches a 2-tuple whose first and second elements are identical and returns the matched tuple.',
      },
    ],
    astRules: {
      requiredConstructs: [],
      forbiddenConstructs: ['if_expr'],
    },
    solutionExplanation: 'Demonstrates multi-clause function dispatch separated by semicolons, strict pair equality in clause heads, and trailing full-stop punctuation.',
    files: [
      {
        name: 'clause_router.erl',
        path: 'src/clause_router.erl',
        content: `-module(clause_router).
-export([describe_status/1, head_or_default/2, verify_identical_pair/1]).

%% @doc Map HTTP status codes 200, 404, 500 to ok/error tuples, defaulting other inputs to unknown_code.
describe_status(_Code) ->
    ok.

%% @doc Return the first element of a non-empty list, or Default when the list is empty.
head_or_default(_List, _Default) ->
    ok.

%% @doc Return a matched 2-tuple if both elements of a 2-tuple match strictly, or mismatch otherwise.
verify_identical_pair(_Pair) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/clause_router.erl': `-module(clause_router).
-export([describe_status/1, head_or_default/2, verify_identical_pair/1]).

%% @doc Map HTTP status codes 200, 404, 500 to ok/error tuples, defaulting other inputs to unknown_code.
describe_status(200) ->
    {ok, success};
describe_status(404) ->
    {error, not_found};
describe_status(500) ->
    {error, server_crash};
describe_status(_) ->
    {error, unknown_code}.

%% @doc Return the first element of a non-empty list, or Default when the list is empty.
head_or_default([H | _], _Default) ->
    H;
head_or_default([], Default) ->
    Default.

%% @doc Return a matched 2-tuple if both elements of a 2-tuple match strictly, or mismatch otherwise.
verify_identical_pair({X, X}) ->
    {matched, X};
verify_identical_pair(_) ->
    mismatch.`,
    },
    starterCode: `-module(clause_router).
-export([describe_status/1, head_or_default/2, verify_identical_pair/1]).

%% @doc Map HTTP status codes 200, 404, 500 to ok/error tuples, defaulting other inputs to unknown_code.
describe_status(_Code) ->
    ok.

%% @doc Return the first element of a non-empty list, or Default when the list is empty.
head_or_default(_List, _Default) ->
    ok.

%% @doc Return a matched 2-tuple if both elements of a 2-tuple match strictly, or mismatch otherwise.
verify_identical_pair(_Pair) ->
    ok.`,
    solutionCode: `-module(clause_router).
-export([describe_status/1, head_or_default/2, verify_identical_pair/1]).

%% @doc Map HTTP status codes 200, 404, 500 to ok/error tuples, defaulting other inputs to unknown_code.
describe_status(200) ->
    {ok, success};
describe_status(404) ->
    {error, not_found};
describe_status(500) ->
    {error, server_crash};
describe_status(_) ->
    {error, unknown_code}.

%% @doc Return the first element of a non-empty list, or Default when the list is empty.
head_or_default([H | _], _Default) ->
    H;
head_or_default([], Default) ->
    Default.

%% @doc Return a matched 2-tuple if both elements of a 2-tuple match strictly, or mismatch otherwise.
verify_identical_pair({X, X}) ->
    {matched, X};
verify_identical_pair(_) ->
    mismatch.`,
  },

  // ── Lesson 1.8: Chapter 1 Problem Set ────────────────────────────────────
  {
    id: 'ch01-l08',
    chapterNumber: 1,
    lessonNumber: 8,
    lessonType: 'problem_set',
    title: 'Problem Set: Telecom CDR Packet Classifier & Billing Engine',
    difficulty: 'Beginner',
    xpReward: 250,
    conceptMarkdown: `## Why This Matters in Production

In real-world telecommunication gateways and message brokers, incoming Call Detail Records (CDRs) and protocol packets must be inspected, validated, categorized, and priced across millions of subscribers.

A single malformed packet or invalid plan type must never crash the router. Instead, the system must cleanly categorize protocol types, reject empty payloads, cascade default connection parameters, and compute billing totals using exact sequential pattern matching.

This problem set unifies everything you have mastered in Chapter 1:
- Modules, exports, and function arities
- Atoms, tuples, and singly-linked lists
- Multi-clause function dispatch
- Default parameter delegation
- Integer billing arithmetic with zero floating-point imprecision

## Deep Concept Breakdown & Under the Hood

A Chapter Problem Set combines the individual primitives you practiced earlier into a cohesive multi-function module:

1. **Clause Order Determines Dispatch Precedence**:
   When a single function uses multiple pattern clauses separated by \`;\`, the BEAM evaluates heads strictly from top to bottom. More specific structural patterns (for example, matching a non-empty list head \`[Lead | Tail]\` vs an empty list \`[]\`, and explicit tag atoms vs a final wildcard \`_\`) must be ordered deliberately so general fallback clauses never shadow valid cases.
2. **Arity Cascading for Configuration Defaults**:
   Rather than duplicating tier calculations across two functions, idiomatic Erlang defines a lower-arity entry point that injects a constant default and delegates directly to the higher-arity clause engine.
3. **Exact Integer Arithmetic for Financial Totals**:
   Calculating rates in whole integer cents avoids binary floating-point rounding drift across millions of billing events.

## Parallel Worked Example

Consider a freight-manifest inspection and shipping tariff module demonstrating clause precedence, list-head extraction, arity delegation, and integer cent multiplication:

\`\`\`erlang
-module(parcel_tariffs).
-export([inspect_manifest/1, quote_dispatch/1, quote_dispatch/2]).

%% Check explicit empty batch BEFORE fallback catch-all; extract leading parcel ID cleanly
inspect_manifest({manifest, _BatchId, []}) ->
    {hold, no_parcels};
inspect_manifest({manifest, BatchId, [LeadCode | Remainder]}) ->
    {ready, BatchId, LeadCode, Remainder};
inspect_manifest(_) ->
    {reject, bad_envelope}.

%% Delegate 1-arg shortcut to quote_dispatch/2 using a 250-cent default handling surcharge
quote_dispatch(TierSpec) ->
    quote_dispatch(TierSpec, 250).

%% Dispatch tagged tier tuples using exact integer cents (no floats, no 'if' or guards)
quote_dispatch({express, WeightKg}, SurchargeCents) ->
    {quote, SurchargeCents + WeightKg * 120};
quote_dispatch({freight, _WeightKg}, _SurchargeCents) ->
    {quote, 0};
quote_dispatch(_, _SurchargeCents) ->
    {error, invalid_tier}.
\`\`\`

Notice how every BEAM invariant works together:
- \`inspect_manifest/1\` places \`{manifest, _BatchId, []}\` and \`[LeadCode | Remainder]\` ahead of the catch-all \`_\` clause so empty batches return \`{hold, no_parcels}\` while non-tuples return \`{reject, bad_envelope}\`.
- \`quote_dispatch/1\` injects the default surcharge by calling \`quote_dispatch/2\`, avoiding duplicated tariff clauses.
- \`quote_dispatch/2\` computes all totals in exact integers (\`SurchargeCents + WeightKg * 120\`) and matches literal tier tags directly in function heads without \`when\` guards or \`if\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Erlang Reference Manual (Function Definition Syntax)
Name(Patterns1) -> Body1;
Name(Patterns2) -> Body2;
...
Name(PatternsN) -> BodyN.
  Clauses are evaluated sequentially from top to bottom.
  First matching pattern executes.
  If no pattern matches, a function_clause run-time exception occurs.
\`\`\`
> **How to Read This Spec**: Multi-clause functions compile into sequential pattern-matching jump tables, jumping directly to the first matching clause body or raising \`function_clause\` if none match. Open the attached **\`pattern_matching_clauses\` Reference Card** below for official OTP function syntax and emulator jump-table links.

## Assignment Specification

Implement and export \`classify_packet/1\`, \`bill_call/2\`, and \`bill_call/3\` in \`src/telecom_foundations.erl\` (\`-module(telecom_foundations).\`, \`-export([classify_packet/1, bill_call/2, bill_call/3]).\`):

### 1. \`classify_packet(Packet)\`
- **Input**: An arbitrary term \`Packet\`. Valid packets are 4-element tuples whose elements are a supported protocol atom (\`ipv4\` or \`ipv6\`), a source host string, a destination host string, and a payload list.
- **Behavior**: Evaluates in $O(1)$ constant time:
  - When \`Packet\` is a 4-element tuple with protocol \`ipv4\` or \`ipv6\` and a non-empty payload list, returns \`{ok, Protocol, SourceHost, DestinationHost, FirstPayloadItem}\`.
  - When \`Packet\` matches the 4-element envelope structure with an empty payload list, returns \`{error, empty_payload}\`.
  - When \`Packet\` is malformed or carries an unsupported protocol tag, returns \`{error, invalid_packet}\`.
- **Examples**:
  - \`telecom_foundations:classify_packet({ipv4, "10.0.0.1", "10.0.0.2", [ping, 100]})\` returns \`{ok, ipv4, "10.0.0.1", "10.0.0.2", ping}\`.
  - \`telecom_foundations:classify_packet({ipv6, "fe80::1", "fe80::2", [data]})\` returns \`{ok, ipv6, "fe80::1", "fe80::2", data}\`.
  - \`telecom_foundations:classify_packet({ipv4, "10.0.0.1", "10.0.0.2", []})\` returns \`{error, empty_payload}\`.
  - \`telecom_foundations:classify_packet(bad_packet)\` returns \`{error, invalid_packet}\`.

### 2. \`bill_call(DurationSec, PlanType)\`
- **Input**: Integer \`DurationSec\` (seconds) and subscription plan atom \`PlanType\`.
- **Behavior**: Delegates to \`bill_call/3\` in $O(1)$ time with a default connection fee of 10 cents.
- **Examples**:
  - \`telecom_foundations:bill_call(60, standard)\` returns \`{ok, 310}\`.
  - \`telecom_foundations:bill_call(3600, internal)\` returns \`{ok, 0}\`.

### 3. \`bill_call(DurationSec, PlanType, ConnectionFeeCents)\`
- **Input**: Integer \`DurationSec\`, plan atom \`PlanType\`, and integer \`ConnectionFeeCents\`.
- **Behavior**: Calculates the exact whole-cent charge in $O(1)$ time via multi-clause pattern matching on \`PlanType\`:
  - \`standard\`: Returns \`{ok, Total}\` equal to \`ConnectionFeeCents\` plus 5 cents per second of \`DurationSec\`.
  - \`premium\`: Returns \`{ok, Total}\` equal to \`ConnectionFeeCents\` plus 3 cents per second of \`DurationSec\`.
  - \`internal\`: Returns \`{ok, 0}\` (free company traffic regardless of duration or connection fee).
  - Any other plan: Returns \`{error, unknown_plan}\`.
- **Examples**:
  - \`telecom_foundations:bill_call(60, standard, 10)\` returns \`{ok, 310}\`.
  - \`telecom_foundations:bill_call(100, premium, 25)\` returns \`{ok, 325}\`.
  - \`telecom_foundations:bill_call(3600, internal, 10)\` returns \`{ok, 0}\`.
  - \`telecom_foundations:bill_call(60, custom_plan, 10)\` returns \`{error, unknown_plan}\`.

## Rules & Verification Constraints

- **Exports & Arity Delegation**: \`telecom_foundations\` must export \`classify_packet/1\`, \`bill_call/2\`, and \`bill_call/3\`, and \`bill_call/2\` must delegate to \`bill_call/3\` (enforced via AST verification).
- **ZERO FORWARD REFERENCES**: Do not use Maps (\`#{}\`), Binaries (\`<<...>>\`), \`if\` expressions, or \`when\` guard clauses (enforced via AST inspection).
- **Clause Precedence & Clean Compilation**: Separate clauses with \`;\`, end each function with \`.\`, reject unsupported protocol tags cleanly, and compile with zero unused-variable warnings.`,
    otpDocCards: [
      {
        functionName: 'pattern_matching_clauses',
        module: 'erlang',
        signature: 'Fun(Pattern1) -> Body1; Fun(Pattern2) -> Body2.',
        typesSpec: ['Pattern = term()', 'Body = term()'],
        description: 'Multi-clause function definition with sequential pattern dispatch.',
        complexityNote: 'O(1) compiled BEAM jump table for literal atom/integer tags.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/functions.html',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/erts/emulator/beam/beam_emu.c',
      },
    ],
    mentalModelCheck: {
      question: 'Why does bill_call(100, internal, 10) return {ok, 0} rather than calculating a connection fee?',
      options: [
        {
          id: 'A',
          label: 'Because the clause matching plan type "internal" specifies {ok, 0} regardless of duration or connection fee',
          isCorrect: true,
          explanation: 'The internal plan clause ignores duration and fees, returning {ok, 0} for free company communications.',
        },
        {
          id: 'B',
          label: 'Because Erlang integer division automatically rounds negative fees down to zero',
          isCorrect: false,
          explanation: 'No division is performed in bill_call; the clause directly returns the constant literal 0.',
        },
        {
          id: 'C',
          label: 'Because the connection fee is subtracted from the duration in a post-processing filter',
          isCorrect: false,
          explanation: 'There is no post-processing filter; clauses return their evaluated body directly.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch01-08-a',
        title: 'Classify Valid IPv4 Packet with Payload',
        erlangCall: 'telecom_foundations:classify_packet({ipv4, "10.0.0.1", "10.0.0.2", [ping, 100]})',
        expectedOutput: '{ok, ipv4, "10.0.0.1", "10.0.0.2", ping}',
        explanation: 'Extracts protocol tag, hosts, and head of payload list.',
      },
      {
        id: 'tc-ch01-08-b',
        title: 'Classify Packet with Empty Payload',
        erlangCall: 'telecom_foundations:classify_packet({ipv4, "10.0.0.1", "10.0.0.2", []})',
        expectedOutput: '{error, empty_payload}',
        explanation: 'Matches empty list clause and returns {error, empty_payload}.',
      },
      {
        id: 'tc-ch01-08-c',
        title: 'Bill Standard Call with Default Connection Fee',
        erlangCall: 'telecom_foundations:bill_call(60, standard)',
        expectedOutput: '{ok, 310}',
        explanation: 'Bills a 60-second standard call using the default 10-cent connection fee.',
      },
      {
        id: 'tc-ch01-08-d',
        title: 'Bill Free Internal Call',
        erlangCall: 'telecom_foundations:bill_call(3600, internal)',
        expectedOutput: '{ok, 0}',
        explanation: 'Internal company calls are free {ok, 0}.',
      },
    ],
    astRules: {
      requiredCalls: ['telecom_foundations:bill_call/3'],
      forbiddenConstructs: ['if_expr'],
    },
    solutionExplanation: 'Unifies multi-clause packet routing, empty payload validation, and arity delegation for standard/premium/internal CDR billing with zero forward-reference constructs.',
    files: [
      {
        name: 'telecom_foundations.erl',
        path: 'src/telecom_foundations.erl',
        content: `-module(telecom_foundations).
-export([classify_packet/1, bill_call/2, bill_call/3]).

%% @doc Validate a 4-element network packet and extract protocol, hosts, and leading payload item, or return empty_payload or invalid_packet errors.
classify_packet(_Packet) ->
    ok.

%% @doc Delegate billing calculation for DurationSec and PlanType using the default 10-cent connection fee.
bill_call(_DurationSec, _PlanType) ->
    ok.

%% @doc Compute total call cost in cents for DurationSec, PlanType, and ConnectionFeeCents, or return unknown_plan error for unsupported tiers.
bill_call(_DurationSec, _PlanType, _ConnectionFeeCents) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/telecom_foundations.erl': `-module(telecom_foundations).
-export([classify_packet/1, bill_call/2, bill_call/3]).

%% @doc Validate a 4-element network packet and extract protocol, hosts, and leading payload item, or return empty_payload or invalid_packet errors.
classify_packet({ipv4, SrcHost, DstHost, [FirstItem | _Rest]}) ->
    {ok, ipv4, SrcHost, DstHost, FirstItem};
classify_packet({ipv6, SrcHost, DstHost, [FirstItem | _Rest]}) ->
    {ok, ipv6, SrcHost, DstHost, FirstItem};
classify_packet({_Tag, _Src, _Dst, []}) ->
    {error, empty_payload};
classify_packet(_) ->
    {error, invalid_packet}.

%% @doc Delegate billing calculation for DurationSec and PlanType using the default 10-cent connection fee.
bill_call(DurationSec, PlanType) ->
    bill_call(DurationSec, PlanType, 10).

%% @doc Compute total call cost in cents for DurationSec, PlanType, and ConnectionFeeCents, or return unknown_plan error for unsupported tiers.
bill_call(DurationSec, standard, ConnectionFeeCents) ->
    {ok, ConnectionFeeCents + (DurationSec * 5)};
bill_call(DurationSec, premium, ConnectionFeeCents) ->
    {ok, ConnectionFeeCents + (DurationSec * 3)};
bill_call(_DurationSec, internal, _ConnectionFeeCents) ->
    {ok, 0};
bill_call(_DurationSec, _OtherPlan, _ConnectionFeeCents) ->
    {error, unknown_plan}.`,
    },
    starterCode: `-module(telecom_foundations).
-export([classify_packet/1, bill_call/2, bill_call/3]).

%% @doc Validate a 4-element network packet and extract protocol, hosts, and leading payload item, or return empty_payload or invalid_packet errors.
classify_packet(_Packet) ->
    ok.

%% @doc Delegate billing calculation for DurationSec and PlanType using the default 10-cent connection fee.
bill_call(_DurationSec, _PlanType) ->
    ok.

%% @doc Compute total call cost in cents for DurationSec, PlanType, and ConnectionFeeCents, or return unknown_plan error for unsupported tiers.
bill_call(_DurationSec, _PlanType, _ConnectionFeeCents) ->
    ok.`,
    solutionCode: `-module(telecom_foundations).
-export([classify_packet/1, bill_call/2, bill_call/3]).

%% @doc Validate a 4-element network packet and extract protocol, hosts, and leading payload item, or return empty_payload or invalid_packet errors.
classify_packet({ipv4, SrcHost, DstHost, [FirstItem | _Rest]}) ->
    {ok, ipv4, SrcHost, DstHost, FirstItem};
classify_packet({ipv6, SrcHost, DstHost, [FirstItem | _Rest]}) ->
    {ok, ipv6, SrcHost, DstHost, FirstItem};
classify_packet({_Tag, _Src, _Dst, []}) ->
    {error, empty_payload};
classify_packet(_) ->
    {error, invalid_packet}.

%% @doc Delegate billing calculation for DurationSec and PlanType using the default 10-cent connection fee.
bill_call(DurationSec, PlanType) ->
    bill_call(DurationSec, PlanType, 10).

%% @doc Compute total call cost in cents for DurationSec, PlanType, and ConnectionFeeCents, or return unknown_plan error for unsupported tiers.
bill_call(DurationSec, standard, ConnectionFeeCents) ->
    {ok, ConnectionFeeCents + (DurationSec * 5)};
bill_call(DurationSec, premium, ConnectionFeeCents) ->
    {ok, ConnectionFeeCents + (DurationSec * 3)};
bill_call(_DurationSec, internal, _ConnectionFeeCents) ->
    {ok, 0};
bill_call(_DurationSec, _OtherPlan, _ConnectionFeeCents) ->
    {error, unknown_plan}.`,
  },
];

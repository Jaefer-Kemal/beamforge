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

> [!warning] Common Beginner Syntax Trap: The Period Terminator
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
> \`erlang:system_info/1\` is a C-implemented Built-In Function (BIF) providing zero-overhead introspection into the host emulator.

## Assignment Specification

This is a **Guided Runnable Demo**. The code in the editor is pre-written and functional.
1. Inspect the module \`beam_intro.erl\`.
2. Observe how \`-module(beam_intro).\` and \`-export([inspect_vm/0]).\` declare the module interface.
3. Observe how \`erlang:system_info/1\` queries live emulator telemetry.
4. Notice how the return value is structured as a clean 5-element tagged tuple: \`{vm_info, OtpRel, Schedulers, ProcLimit, AtomLimit}\`.
5. Click **Run** to execute the live probe against the BEAM OTP 29 engine.

## Rules & Verification Constraints

- No code edits are required for this guided introductory demo.
- Verification passes when \`beam_intro:inspect_vm/0\` returns a 5-tuple starting with the atom \`vm_info\`.`,
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

%% @doc Query the live Erlang runtime for emulator parameters.
%% Returns a clean 5-tuple: {vm_info, OtpRel, Schedulers, ProcLimit, AtomLimit}
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

%% @doc Query the live Erlang runtime for emulator parameters.
%% Returns a clean 5-tuple: {vm_info, OtpRel, Schedulers, ProcLimit, AtomLimit}
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
| **\`\/=\`** | Loose Inequality | \`10 /= 20\` | \`true\` | Negation of \`==\` |
| **\`<\`** | Strictly Less Than | \`5 < 10\` | \`true\` | Standard less-than |
| **\`=<\`** | Less Than or Equal | \`5 =< 5\` | \`true\` | **Erlang Syntax:** \`=<\` (Never \`<=\`) |
| **\`>\`** | Strictly Greater Than | \`10 > 5\` | \`true\` | Standard greater-than |
| **\`>=\`** | Greater Than or Equal | \`10 >= 10\` | \`true\` | Standard greater-than-or-equal |

> [!warning] Common Beginner Syntax Trap: The =< Comparison Operator
> In nearly every programming language, "less-than-or-equal" is written as \`<=\`.
> **In Erlang, less-than-or-equal is written as \`=<\`!**
> Why? Because \`<=\` is reserved in Erlang for binary comprehension generators. If you type \`X <= 10\`, the compiler will throw a confusing syntax error.
> Remember: \`=<\` (arrow pointing into the equal sign) means less-than-or-equal.

> [!warning] Exact Equality (=:=) vs. Loose Numeric Equality (==)
> Erlang has two equality operators:
> - \`=:=\` (**Exact Equality**): Compares both value **and type**. \`42 =:= 42.0\` is \`false\` because an integer is not a float.
> - \`==\` (**Loose Equality**): Coerces numbers. \`42 == 42.0\` is \`true\`.
> In production Erlang, **always use \`=:=\` and \`=/=\`** to avoid subtle numerical type bugs!

## Parallel Worked Example

Consider a player account and resource metering module:

\`\`\`erlang
-module(player_meter).
-export([split_elapsed_time/1, is_same_tier/2, is_reward_eligible/3]).

%% Calculate whole minutes and remaining seconds from a total duration
split_elapsed_time(TotalSeconds) ->
    Minutes   = TotalSeconds div 60,
    Remaining = TotalSeconds rem 60,
    {Minutes, Remaining}.

%% Verify whether two tier identifiers match strictly in type and value
is_same_tier(TierA, TierB) ->
    TierA =:= TierB.

%% Determine if an account qualifies for a bonus reward:
%% Must have VIP status, OR have non-negative score that meets minimum threshold
is_reward_eligible(Score, MinScore, IsVip) ->
    IsVip =:= true orelse (Score >= 0 andalso Score >= MinScore).
\`\`\`

Notice:
- \`div\` and \`rem\` compute integer division and modulo respectively.
- \`=:=\` enforces strict equality without numeric type coercion.
- \`orelse\` and \`andalso\` evaluate boolean conditions with short-circuit behavior.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Operator Precedence Table (Standard Erlang):
%% Highest:  +, - (unary)
%% High:     *, /, div, rem
%% Medium:   +, - (binary)
%% Low:      =:=, =/=, ==, /=, <, =<, >, >=
%% Lowest:   andalso, orelse
\`\`\`

## Assignment Specification

In \`basic_types.erl\`, implement three fundamental calculation and logic functions:

1. \`calculate_bandwidth(Bytes, Seconds)\`:
   - **Input**: Integer \`Bytes\` transferred over integer \`Seconds\`.
   - **Behavior**: Convert the total bytes to bits (1 byte = 8 bits), and return the whole integer transmission rate in bits per second. Must use integer division so the result is always an integer.
   - **Examples**:
     - \`basic_types:calculate_bandwidth(1250, 2)\` returns \`5000\` (since \`(1250 * 8) div 2 = 5000\`).
     - \`basic_types:calculate_bandwidth(100, 3)\` returns \`266\`.

2. \`is_exact_match(ValA, ValB)\`:
   - **Input**: Two arbitrary Erlang terms, \`ValA\` and \`ValB\`.
   - **Behavior**: Return \`true\` if both values are identical in both value **and** type. Return \`false\` if types differ, even if their numeric values appear loose-equal (e.g., integer vs float).
   - **Examples**:
     - \`basic_types:is_exact_match(42, 42)\` returns \`true\`.
     - \`basic_types:is_exact_match(42, 42.0)\` returns \`false\` (integer vs float).
     - \`basic_types:is_exact_match(ok, ok)\` returns \`true\`.

3. \`is_within_quota(UsedMb, LimitMb, IsAdmin)\`:
   - **Input**: Integer \`UsedMb\`, integer \`LimitMb\`, and boolean \`IsAdmin\`.
   - **Behavior**: Determine whether resource usage is permitted:
     - Always returns \`true\` if the caller has administrator privileges (\`IsAdmin\`).
     - For non-administrators, returns \`true\` only if \`UsedMb\` is non-negative ($0$ or greater) and does not exceed \`LimitMb\`.
     - Returns \`false\` otherwise.
   - **Examples**:
     - \`basic_types:is_within_quota(450, 500, false)\` returns \`true\`.
     - \`basic_types:is_within_quota(550, 500, false)\` returns \`false\`.
     - \`basic_types:is_within_quota(9999, 500, true)\` returns \`true\` (admin bypass).
     - \`basic_types:is_within_quota(-10, 500, false)\` returns \`false\` (negative usage invalid).

## Rules & Verification Constraints

- Do not use \`when\` guard clauses or \`if\`/\`case\` statements yet—rely entirely on boolean expressions.
- Remember to use \`=<\` for less-than-or-equal to avoid syntax errors.`,
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
        explanation: '(1250 * 8) div 2 = 5000 bps.',
      },
      {
        id: 'tc-ch01-02-b',
        title: 'Exact Equality Match Check',
        erlangCall: 'basic_types:is_exact_match(42, 42.0)',
        expectedOutput: 'false',
        explanation: 'Integer 42 is not identical in type to Float 42.0 under =:=.',
      },
      {
        id: 'tc-ch01-02-c',
        title: 'Bandwidth Quota Within Limit Check',
        erlangCall: 'basic_types:is_within_quota(450, 500, false)',
        expectedOutput: 'true',
        explanation: 'UsedMb (450) is >= 0 and =< LimitMb (500).',
      },
    ],
    astRules: {
      requiredCalls: [],
    },
    solutionExplanation: 'Uses div for integer arithmetic, =:= for exact type-safe equality, and =< with andalso/orelse for quota bounds checking.',
    files: [
      {
        name: 'basic_types.erl',
        path: 'src/basic_types.erl',
        content: `-module(basic_types).
-export([calculate_bandwidth/2, is_exact_match/2, is_within_quota/3]).

%% @doc Return whole integer bits per second given byte count and elapsed seconds.
calculate_bandwidth(Bytes, Seconds) ->
    ok.

%% @doc Return true only if ValA and ValB match strictly in both value and type.
is_exact_match(ValA, ValB) ->
    ok.

%% @doc Return true if usage is within [0, LimitMb], or if IsAdmin is active.
is_within_quota(UsedMb, LimitMb, IsAdmin) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/basic_types.erl': `-module(basic_types).
-export([calculate_bandwidth/2, is_exact_match/2, is_within_quota/3]).

calculate_bandwidth(Bytes, Seconds) ->
    (Bytes * 8) div Seconds.

is_exact_match(ValA, ValB) ->
    ValA =:= ValB.

is_within_quota(UsedMb, LimitMb, IsAdmin) ->
    IsAdmin =:= true orelse (UsedMb >= 0 andalso UsedMb =< LimitMb).`,
    },
    starterCode: `-module(basic_types).
-export([calculate_bandwidth/2, is_exact_match/2, is_within_quota/3]).

%% @doc Return whole integer bits per second given byte count and elapsed seconds.
calculate_bandwidth(Bytes, Seconds) ->
    ok.

%% @doc Return true only if ValA and ValB match strictly in both value and type.
is_exact_match(ValA, ValB) ->
    ok.

%% @doc Return true if usage is within [0, LimitMb], or if IsAdmin is active.
is_within_quota(UsedMb, LimitMb, IsAdmin) ->
    ok.`,
    solutionCode: `-module(basic_types).
-export([calculate_bandwidth/2, is_exact_match/2, is_within_quota/3]).

calculate_bandwidth(Bytes, Seconds) ->
    (Bytes * 8) div Seconds.

is_exact_match(ValA, ValB) ->
    ValA =:= ValB.

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

> [!warning] Common Beginner Syntax Trap: How to "Update" State
> Beginners often wonder: *If variables are immutable, how do I calculate updated values?*
> The answer: **Create a new, descriptively named variable!**
> Instead of modifying \`Price = Price * 1.1\`, write:
> \`\`\`erlang
> BasePrice    = 100,
> TaxedPrice   = BasePrice * 1.1,
> FinalPrice   = TaxedPrice - Discount.
> \`\`\`

## Parallel Worked Example

Here is a module demonstrating how sequential calculations progress state through new variable names, and how pattern matching with wildcards extracts specific fields from multi-element compound terms:

\`\`\`erlang
-module(auth_session).
-export([calculate_extended_ttl/2, extract_user_id/1]).

%% Progress expiration calculations sequentially through distinct immutable variables
calculate_extended_ttl(BaseTtl, GracePeriod) ->
    InitialTtl  = BaseTtl,
    BufferedTtl = InitialTtl + GracePeriod,
    MaxTtl      = BufferedTtl * 3,
    MaxTtl.

%% Extract the user ID from a 4-element session record: {session, SessionId, UserId, CreatedAt}
extract_user_id(SessionRecord) ->
    %% The wildcard '_' matches and discards elements without binding a variable name
    {_, _, TargetUser, _} = SessionRecord,
    TargetUser.
\`\`\`

Notice:
- In \`calculate_extended_ttl\`, variables \`InitialTtl\`, \`BufferedTtl\`, and \`MaxTtl\` progress the calculation sequentially without mutating any memory.
- In \`extract_user_id\`, \`{_, _, TargetUser, _} = SessionRecord\` discards the first, second, and fourth elements using the wildcard \`_\`, binding only \`TargetUser\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Erlang Reference Manual (Pattern Matching)
Pattern = Expression
  Evaluates Expression and matches result against Pattern.
  Unbound variables in Pattern are bound.
  If matching fails, a badmatch run-time error occurs.
\`\`\`

## Assignment Specification

In \`pattern_vars.erl\`, implement two functions demonstrating immutable variable progression and pattern matching:

1. \`rebind_update(Base, Increment)\`:
   - **Input**: Integer \`Base\` and integer \`Increment\`.
   - **Behavior**: Progress the calculation across multiple sequential, newly bound immutable variables:
     - Bind an initial variable to \`Base\`.
     - Bind a second variable to the sum of the first variable and \`Increment\`.
     - Bind a third variable to double the second variable (multiplied by 2), and return it.
     - Never mutate or re-assign an existing variable.
   - **Examples**:
     - \`pattern_vars:rebind_update(10, 5)\` returns \`30\` (\`(10 + 5) * 2 = 30\`).
     - \`pattern_vars:rebind_update(100, 50)\` returns \`300\`.

2. \`extract_middle(TripleTuple)\`:
   - **Input**: A 3-element tuple containing arbitrary terms (e.g., \`{alpha, beta, gamma}\` or \`{1, 999, "test"}\`).
   - **Behavior**: Using pattern matching with the \`=\` operator, destructure the tuple and extract only the middle (second) element while discarding the first and third elements with the wildcard \`_\`.
   - **Examples**:
     - \`pattern_vars:extract_middle({alpha, beta, gamma})\` returns \`beta\`.
     - \`pattern_vars:extract_middle({1, 999, "test"})\` returns \`999\`.

## Rules & Verification Constraints

- Do not attempt to mutate or rebind any variable already bound.
- Ensure all variable names start with an Uppercase letter.`,
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
        explanation: 'V1 = 10, V2 = 15, V3 = 15 * 2 = 30.',
      },
      {
        id: 'tc-ch01-03-b',
        title: 'Extract Middle Tuple Element',
        erlangCall: 'pattern_vars:extract_middle({alpha, beta, gamma})',
        expectedOutput: 'beta',
        explanation: 'Destructures {_, Middle, _} and extracts beta.',
      },
    ],
    astRules: {
      requiredCalls: [],
    },
    solutionExplanation: 'Demonstrates single assignment immutability using sequential variables and tuple pattern extraction.',
    files: [
      {
        name: 'pattern_vars.erl',
        path: 'src/pattern_vars.erl',
        content: `-module(pattern_vars).
-export([rebind_update/2, extract_middle/1]).

%% @doc Progress calculation across sequential immutable variable bindings:
%% adds Increment to Base, doubles the result, and returns the final value.
rebind_update(Base, Increment) ->
    ok.

%% @doc Return the middle (second) element of a 3-element tuple using pattern matching.
extract_middle(TripleTuple) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/pattern_vars.erl': `-module(pattern_vars).
-export([rebind_update/2, extract_middle/1]).

rebind_update(Base, Increment) ->
    V1 = Base,
    V2 = V1 + Increment,
    V3 = V2 * 2,
    V3.

extract_middle(TripleTuple) ->
    {_, Middle, _} = TripleTuple,
    Middle.`,
    },
    starterCode: `-module(pattern_vars).
-export([rebind_update/2, extract_middle/1]).

%% @doc Progress calculation across sequential immutable variable bindings:
%% adds Increment to Base, doubles the result, and returns the final value.
rebind_update(Base, Increment) ->
    ok.

%% @doc Return the middle (second) element of a 3-element tuple using pattern matching.
extract_middle(TripleTuple) ->
    ok.`,
    solutionCode: `-module(pattern_vars).
-export([rebind_update/2, extract_middle/1]).

rebind_update(Base, Increment) ->
    V1 = Base,
    V2 = V1 + Increment,
    V3 = V2 * 2,
    V3.

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
- Lowercase names are automatically atoms: \`ok\`, \`error\`, \`call_event\`, \`alice\`, \`bob\`.
- Atoms are stored once in a global runtime **Atom Table**. An atom reference inside a message or process heap is simply a 1-word integer pointer. Comparing two atoms (\`State =:= ready\`) is an ultra-fast $O(1)$ single-cycle integer pointer comparison.
- **Single-Quoted Atoms**: If an atom must begin with a capital letter, contain spaces, or include punctuation, enclose it in single quotes: \`'Monday'\`, \`'EXIT'\`, \`'user@domain.com'\`.

> [!warning] The Atom Table is Never Garbage-Collected
> The BEAM VM Atom Table has a fixed limit (default 1,048,576 atoms) and is **never garbage-collected**.
> Never dynamically generate atoms from untrusted user input using \`list_to_atom/1\`, or malicious requests can overflow the atom table and crash the entire node!

### Tuples
A **Tuple** is an ordered, fixed-size container written with curly braces:
\`\`\`erlang
{call_event, 101, alice, bob, 120}
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

Consider a distributed file storage chunk ledger:

\`\`\`erlang
-module(storage_ledger).
-export([allocate_chunk/3, get_chunk_status/1, update_chunk_checksum/2]).

%% Create a 4-element tagged record tracking partition state:
%% {chunk, ChunkId, Partition, Status}
allocate_chunk(ChunkId, Partition, Status) ->
    {chunk, ChunkId, Partition, Status}.

%% Extract the status atom from a chunk tuple using pattern matching
get_chunk_status(ChunkRecord) ->
    {chunk, _Id, _Partition, Status} = ChunkRecord,
    Status.

%% Update the checksum in a 5-element file descriptor:
%% replaces OldChecksum with NewChecksum while preserving other metadata
update_chunk_checksum(FileDescriptor, NewChecksum) ->
    {file_entry, Path, SizeBytes, _OldChecksum, ModifiedAt} = FileDescriptor,
    {file_entry, Path, SizeBytes, NewChecksum, ModifiedAt}.
\`\`\`

Notice:
- \`allocate_chunk/3\` tags the tuple with \`chunk\` and groups related partition attributes.
- \`get_chunk_status/1\` pattern matches the 4-element tuple, discarding unused fields with \`_\`.
- \`update_chunk_checksum/2\` unpacks the 5-element \`file_entry\` tuple and constructs a new tuple with updated checksum while preserving remaining fields.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Erlang Reference Manual (Data Types - Tuples)
{Element1, Element2, ..., ElementN}
  Compound data type with fixed number of terms.
  Element access via pattern matching or element(N, Tuple) is O(1).
\`\`\`

## Assignment Specification

In \`telecom_events.erl\`, implement three functions that model and manipulate structured telecom switch records:

1. \`make_event(Id, Caller, Callee)\`:
   - **Input**: Integer \`Id\`, atom \`Caller\`, and atom \`Callee\`.
   - **Behavior**: Construct and return a 5-element tagged tuple. The tuple must start with the tag atom \`call_event\`, followed by the call identifier, caller, callee, and an initial duration integer of \`0\`.
   - **Examples**:
     - \`telecom_events:make_event(101, alice, bob)\` returns \`{call_event, 101, alice, bob, 0}\`.
     - \`telecom_events:make_event(202, operator, support)\` returns \`{call_event, 202, operator, support, 0}\`.

2. \`extract_caller(Event)\`:
   - **Input**: A 5-element \`call_event\` tuple.
   - **Behavior**: Using pattern matching with the \`=\` operator, extract and return the \`Caller\` atom. Discard all other fields using wildcards.
   - **Examples**:
     - \`telecom_events:extract_caller({call_event, 101, alice, bob, 45})\` returns \`alice\`.
     - \`telecom_events:extract_caller({call_event, 202, carol, dave, 120})\` returns \`carol\`.

3. \`swap_endpoints(Event)\`:
   - **Input**: A 5-element \`call_event\` tuple containing call identifier, endpoints, and duration.
   - **Behavior**: Destructure the event and return a newly constructed \`call_event\` tuple where the positions of \`Caller\` and \`Callee\` are reversed, while keeping the call ID and elapsed duration unchanged.
   - **Examples**:
     - \`telecom_events:swap_endpoints({call_event, 101, alice, bob, 45})\` returns \`{call_event, 101, bob, alice, 45}\`.
     - \`telecom_events:swap_endpoints({call_event, 500, gateway_a, gateway_b, 0})\` returns \`{call_event, 500, gateway_b, gateway_a, 0}\`.

## Rules & Verification Constraints

- Test cases will use atoms like \`alice\` and \`bob\` as caller/callee names.
- Do not use binaries or maps—stick strictly to atoms, integers, and tuples.`,
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
    solutionExplanation: 'Demonstrates tagged tuple construction, element extraction, and field swapping using pattern matching.',
    files: [
      {
        name: 'telecom_events.erl',
        path: 'src/telecom_events.erl',
        content: `-module(telecom_events).
-export([make_event/3, extract_caller/1, swap_endpoints/1]).

%% @doc Return a 5-element call_event tuple with initial duration 0.
make_event(Id, Caller, Callee) ->
    ok.

%% @doc Extract and return the Caller atom from a call_event tuple.
extract_caller(Event) ->
    ok.

%% @doc Return a new call_event tuple with Caller and Callee positions swapped.
swap_endpoints(Event) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/telecom_events.erl': `-module(telecom_events).
-export([make_event/3, extract_caller/1, swap_endpoints/1]).

make_event(Id, Caller, Callee) ->
    {call_event, Id, Caller, Callee, 0}.

extract_caller(Event) ->
    {call_event, _Id, Caller, _Callee, _Duration} = Event,
    Caller.

swap_endpoints(Event) ->
    {call_event, Id, Caller, Callee, Duration} = Event,
    {call_event, Id, Callee, Caller, Duration}.`,
    },
    starterCode: `-module(telecom_events).
-export([make_event/3, extract_caller/1, swap_endpoints/1]).

%% @doc Return a 5-element call_event tuple with initial duration 0.
make_event(Id, Caller, Callee) ->
    ok.

%% @doc Extract and return the Caller atom from a call_event tuple.
extract_caller(Event) ->
    ok.

%% @doc Return a new call_event tuple with Caller and Callee positions swapped.
swap_endpoints(Event) ->
    ok.`,
    solutionCode: `-module(telecom_events).
-export([make_event/3, extract_caller/1, swap_endpoints/1]).

make_event(Id, Caller, Callee) ->
    {call_event, Id, Caller, Callee, 0}.

extract_caller(Event) ->
    {call_event, _Id, Caller, _Callee, _Duration} = Event,
    Caller.

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

> [!warning] The Character List Mystery: Why [97, 98, 99] Prints as "abc"
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

Consider a sensor telemetry ingestion pipeline that records events, inspects the leading pair of readings, and validates ASCII packet identifiers:

\`\`\`erlang
-module(telemetry_stream).
-export([record_reading/2, extract_lead_window/1, has_valid_prefix/1]).

%% Prepend a timestamped reading to the front of a historical sensor stream in O(1) time
record_reading(Reading, History) ->
    [Reading | History].

%% Destructure the two most recent samples and pack them into an inspection tuple
extract_lead_window(Stream) ->
    [Latest, Previous | OlderReadings] = Stream,
    {window, Latest, Previous, OlderReadings}.

%% Verify that a packet starts with ASCII byte $P (80)
has_valid_prefix(PacketString) ->
    [FirstByte | _Payload] = PacketString,
    FirstByte =:= $P.
\`\`\`

Notice:
- \`record_reading/2\` prepends in $O(1)$ zero-copy time using \`[Reading | History]\`.
- \`extract_lead_window/1\` pattern matches multiple front elements \`[Latest, Previous | OlderReadings]\` without altering their order.
- \`has_valid_prefix/1\` demonstrates that strings are lists of integer codepoints, comparing the leading byte against the character literal \`$P\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Erlang Reference Manual (Lists)
[Element1, Element2, ..., ElementN]
  Cons cell chain terminated by [].
  Prepend: [New | List] -> O(1) time and memory.
  Concat:  List1 ++ List2 -> O(length(List1)) time and memory.
\`\`\`

## Assignment Specification

In \`list_ops.erl\`, implement three fundamental list operations using pure pattern matching:

1. \`prepend_item(Item, List)\`:
   - **Input**: An arbitrary term \`Item\` and an existing list \`List\` (which may be empty \`[]\` or populated).
   - **Behavior**: Return a newly constructed list with \`Item\` positioned as the first element in $O(1)$ constant time. Do not traverse or copy the tail list.
   - **Examples**:
     - \`list_ops:prepend_item(10, [20, 30])\` returns \`[10, 20, 30]\`.
     - \`list_ops:prepend_item(first, [])\` returns \`[first]\`.

2. \`swap_first_two(List)\`:
   - **Input**: A list containing at least two elements.
   - **Behavior**: Extract the first two elements and return a newly constructed list where their positions are reversed, while preserving the exact order of all subsequent elements in the tail.
   - **Examples**:
     - \`list_ops:swap_first_two([alpha, beta, gamma, delta])\` returns \`[beta, alpha, gamma, delta]\`.
     - \`list_ops:swap_first_two([1, 2])\` returns \`[2, 1]\`.

3. \`ascii_initial(NameString)\`:
   - **Input**: A non-empty double-quoted character string such as \`"Erlang"\` or \`"BEAM"\`.
   - **Behavior**: Extract the integer codepoint of the string's first character and return it wrapped in a 2-element tuple tagged with the atom \`char_code\`.
   - **Examples**:
     - \`list_ops:ascii_initial("Erlang")\` returns \`{char_code, 69}\` (since \`$E\` evaluates to 69).
     - \`list_ops:ascii_initial("BEAM")\` returns \`{char_code, 66}\` (since \`$B\` evaluates to 66).

## Rules & Verification Constraints

- Do not use functions from the \`lists\` standard library—use pure pattern matching and the cons operator \`[H | T]\`.
- Ensure all functions handle input lists without using mutable operations.`,
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
        explanation: 'Prepends 10 to front of list in O(1) time.',
      },
      {
        id: 'tc-ch01-05-b',
        title: 'Swap First Two List Elements',
        erlangCall: 'list_ops:swap_first_two([alpha, beta, gamma, delta])',
        expectedOutput: '[beta, alpha, gamma, delta]',
        explanation: 'Destructures [A, B | Rest] and reconstructs [B, A | Rest].',
      },
      {
        id: 'tc-ch01-05-c',
        title: 'Extract Integer ASCII Codepoint',
        erlangCall: 'list_ops:ascii_initial("Erlang")',
        expectedOutput: '{char_code, 69}',
        explanation: 'Destructures string head codepoint $E = 69.',
      },
    ],
    astRules: {
      requiredCalls: [],
    },
    solutionExplanation: 'Utilizes cons operator [H | T] for O(1) prepending, front-element pattern destructuring, and string codepoint extraction.',
    files: [
      {
        name: 'list_ops.erl',
        path: 'src/list_ops.erl',
        content: `-module(list_ops).
-export([prepend_item/2, swap_first_two/1, ascii_initial/1]).

%% @doc Return a new list with Item placed at the front of List.
%% Must execute in O(1) constant time without copying the tail list.
prepend_item(Item, List) ->
    ok.

%% @doc Return a list where the first two elements are swapped.
%% Assumes List contains at least 2 elements; preserves remaining tail order.
swap_first_two(List) ->
    ok.

%% @doc Return {char_code, Codepoint} for the first character in NameString.
%% Leverages Erlang's representation of strings as lists of integer codepoints.
ascii_initial(NameString) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/list_ops.erl': `-module(list_ops).
-export([prepend_item/2, swap_first_two/1, ascii_initial/1]).

prepend_item(Item, List) ->
    [Item | List].

swap_first_two(List) ->
    [First, Second | Rest] = List,
    [Second, First | Rest].

ascii_initial(NameString) ->
    [FirstCharCode | _Rest] = NameString,
    {char_code, FirstCharCode}.`,
    },
    starterCode: `-module(list_ops).
-export([prepend_item/2, swap_first_two/1, ascii_initial/1]).

%% @doc Return a new list with Item placed at the front of List.
%% Must execute in O(1) constant time without copying the tail list.
prepend_item(Item, List) ->
    ok.

%% @doc Return a list where the first two elements are swapped.
%% Assumes List contains at least 2 elements; preserves remaining tail order.
swap_first_two(List) ->
    ok.

%% @doc Return {char_code, Codepoint} for the first character in NameString.
%% Leverages Erlang's representation of strings as lists of integer codepoints.
ascii_initial(NameString) ->
    ok.`,
    solutionCode: `-module(list_ops).
-export([prepend_item/2, swap_first_two/1, ascii_initial/1]).

prepend_item(Item, List) ->
    [Item | List].

swap_first_two(List) ->
    [First, Second | Rest] = List,
    [Second, First | Rest].

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
- \`-module(arity_calc).\`: Declares the module name. The file must be named \`arity_calc.erl\`.
- \`-export([connect/1, connect/2, connect/3]).\`: Declares which functions are public. Any function not in the export list is private to the module and cannot be called from outside.

### Arity: Functions with the Same Name are Completely Distinct
In languages like Python or JavaScript, defining \`def connect(host)\` followed by \`def connect(host, port)\` overwrites the first definition.
**In Erlang, \`connect/1\`, \`connect/2\`, and \`connect/3\` are three completely distinct functions!**
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
-define(DEFAULT_PORT, 80).
-define(DEFAULT_TIMEOUT, 5000).
\`\`\`
To invoke a macro in code, prepend a question mark (\`?\`):
\`\`\`erlang
?DEFAULT_PORT     %% Expands to 80 at compile time
?MODULE           %% Built-in macro: expands to the current module atom (arity_calc)
\`\`\`

> [!warning] Common Beginner Syntax Trap: The ? Symbol on Macros
> Forgetting the \`?\` symbol when using a macro is a frequent beginner mistake.
> Writing \`connect(Host, DEFAULT_PORT)\` treats \`DEFAULT_PORT\` as an unbound variable, throwing an \`unbound variable\` error!
> Always prefix macro names with \`?\`: \`?DEFAULT_PORT\`.

## Parallel Worked Example

Consider a distributed telemetry metrics emitter:

\`\`\`erlang
-module(metrics_emitter).
-export([emit/1, emit/2, emit/3]).

-define(DEFAULT_SEVERITY, info).
-define(BUFFER_CAPACITY, 100).

%% Emit an event metric using the default severity level
emit(MetricName) ->
    emit(MetricName, ?DEFAULT_SEVERITY).

%% Emit an event metric with custom severity, cascading to full payload configuration
emit(MetricName, Severity) ->
    emit(MetricName, Severity, ?BUFFER_CAPACITY).

%% Construct a 5-element telemetry packet embedding the origin module via ?MODULE
emit(MetricName, Severity, BufferLimit) ->
    {metric_packet, ?MODULE, MetricName, Severity, BufferLimit}.
\`\`\`

Notice:
- \`emit/1\` delegates to \`emit/2\`, which in turn delegates to \`emit/3\`, demonstrating idiomatic arity cascading.
- Compile-time constants (\`?DEFAULT_SEVERITY\` and \`?BUFFER_CAPACITY\`) supply default arguments cleanly.
- The built-in macro \`?MODULE\` automatically embeds the current module's atom name into the returned record tuple.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Erlang Reference Manual (Preprocessor Macros)
-define(Const, Replacement).
?Const
  Expands Const to Replacement before compiler syntax analysis.
  ?MODULE expands to the atom name of the enclosing module.
\`\`\`

## Assignment Specification

In \`arity_calc.erl\`, implement compile-time constants and a cascading network connection interface:

1. **Compile-Time Macros**:
   - Define a macro \`DEFAULT_PORT\` with the integer value \`80\`.
   - Define a macro \`DEFAULT_TIMEOUT\` with the integer value \`5000\` (milliseconds).

2. **Cascading Functions**:
   - \`connect(Host)\`:
     - **Input**: A host identifier \`Host\` (atom or string, e.g., \`localhost\`).
     - **Behavior**: Delegate to the arity-2 version of \`connect\`, supplying the default port defined by your \`DEFAULT_PORT\` macro.
     - **Example**: \`arity_calc:connect(localhost)\` delegates to \`connect(localhost, 80)\`.
   - \`connect(Host, Port)\`:
     - **Input**: A host identifier \`Host\` and integer \`Port\`.
     - **Behavior**: Delegate to the arity-3 version of \`connect\`, supplying the default timeout defined by your \`DEFAULT_TIMEOUT\` macro.
     - **Example**: \`arity_calc:connect(localhost, 8080)\` delegates to \`connect(localhost, 8080, 5000)\`.
   - \`connect(Host, Port, Timeout)\`:
     - **Input**: A host identifier \`Host\`, integer \`Port\`, and integer \`Timeout\`.
     - **Behavior**: Construct and return a 5-element tagged tuple. The tuple must start with the tag atom \`connection\`, followed by the current module name (using the built-in \`?MODULE\` macro), \`Host\`, \`Port\`, and \`Timeout\`.
     - **Examples**:
       - \`arity_calc:connect(localhost)\` returns \`{connection, arity_calc, localhost, 80, 5000}\`.
       - \`arity_calc:connect(localhost, 8080)\` returns \`{connection, arity_calc, localhost, 8080, 5000}\`.
       - \`arity_calc:connect(localhost, 8080, 2500)\` returns \`{connection, arity_calc, localhost, 8080, 2500}\`.

## Rules & Verification Constraints

- Use the \`?DEFAULT_PORT\` and \`?DEFAULT_TIMEOUT\` macros rather than hardcoding \`80\` and \`5000\` inside the function bodies.
- Use the built-in \`?MODULE\` macro for the second element of the returned tuple.
- Do not use Maps or Binaries—pass host names as atoms or strings (e.g., \`localhost\` or \`"api.erlang.org"\`).`,
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
        explanation: 'Cascades connect(localhost) -> connect(localhost, 80) -> connect(localhost, 80, 5000).',
      },
      {
        id: 'tc-ch01-06-b',
        title: 'Connect with Explicit Port (Arity 2)',
        erlangCall: 'arity_calc:connect(localhost, 8080)',
        expectedOutput: '{connection, arity_calc, localhost, 8080, 5000}',
        explanation: 'Cascades connect(localhost, 8080) -> connect(localhost, 8080, 5000).',
      },
      {
        id: 'tc-ch01-06-c',
        title: 'Connect with Full Parameters (Arity 3)',
        erlangCall: 'arity_calc:connect(localhost, 8080, 2500)',
        expectedOutput: '{connection, arity_calc, localhost, 8080, 2500}',
        explanation: 'Directly returns 5-tuple with explicit timeout.',
      },
    ],
    astRules: {
      requiredCalls: ['arity_calc:connect/2', 'arity_calc:connect/3'],
    },
    solutionExplanation: 'Demonstrates cascading default argument delegation across arities using compile-time macros ?DEFAULT_PORT, ?DEFAULT_TIMEOUT, and ?MODULE.',
    files: [
      {
        name: 'arity_calc.erl',
        path: 'src/arity_calc.erl',
        content: `-module(arity_calc).
-export([connect/1, connect/2, connect/3]).

-define(DEFAULT_PORT, 80).
-define(DEFAULT_TIMEOUT, 5000).

%% @doc Connect using default port (80) and default timeout (5000ms).
connect(Host) ->
    ok.

%% @doc Connect with explicit port and default timeout (5000ms).
connect(Host, Port) ->
    ok.

%% @doc Connect with explicit port and timeout. Returns a 5-element tagged connection tuple.
connect(Host, Port, Timeout) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/arity_calc.erl': `-module(arity_calc).
-export([connect/1, connect/2, connect/3]).

-define(DEFAULT_PORT, 80).
-define(DEFAULT_TIMEOUT, 5000).

connect(Host) ->
    connect(Host, ?DEFAULT_PORT).

connect(Host, Port) ->
    connect(Host, Port, ?DEFAULT_TIMEOUT).

connect(Host, Port, Timeout) ->
    {connection, ?MODULE, Host, Port, Timeout}.`,
    },
    starterCode: `-module(arity_calc).
-export([connect/1, connect/2, connect/3]).

-define(DEFAULT_PORT, 80).
-define(DEFAULT_TIMEOUT, 5000).

%% @doc Connect using default port (80) and default timeout (5000ms).
connect(Host) ->
    ok.

%% @doc Connect with explicit port and default timeout (5000ms).
connect(Host, Port) ->
    ok.

%% @doc Connect with explicit port and timeout. Returns a 5-element tagged connection tuple.
connect(Host, Port, Timeout) ->
    ok.`,
    solutionCode: `-module(arity_calc).
-export([connect/1, connect/2, connect/3]).

-define(DEFAULT_PORT, 80).
-define(DEFAULT_TIMEOUT, 5000).

connect(Host) ->
    connect(Host, ?DEFAULT_PORT).

connect(Host, Port) ->
    connect(Host, Port, ?DEFAULT_TIMEOUT).

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
   status(200) -> ok;             %% semicolon tells compiler: "or try next clause"
   status(404) -> not_found       %% no semicolon on the final clause
   \`\`\`

3. **. (Period) — "FULL STOP"**:
   Placed **only at the very end of the entire function definition**.
   \`\`\`erlang
   status(500) -> error.          %% period tells compiler: "function definition complete"
   \`\`\`

> [!warning] The Most Common Beginner Compiler Error
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

Consider an industrial actuator controller demonstrating multi-clause dispatch, list head extraction, and repeated pattern variable matching:

\`\`\`erlang
-module(actuator_controller).
-export([mode_profile/1, lead_telemetry_or_default/2, verify_symmetric_pins/1]).

%% Evaluate actuator state atom and return operational power budget
mode_profile(idle) ->
    {power_watts, 5};
mode_profile(calibrating) ->
    {power_watts, 25};
mode_profile(active_load) ->
    {power_watts, 120};
mode_profile(_) ->
    {error, unsupported_mode}.

%% Retrieve the most recent measurement from a queue, falling back to calibration baseline
lead_telemetry_or_default([LatestReading | _OlderReadings], _Baseline) ->
    LatestReading;
lead_telemetry_or_default([], Baseline) ->
    Baseline.

%% Verify that dual redundant sensor pins report identical voltage levels
verify_symmetric_pins({PinVoltage, PinVoltage}) ->
    {synced, PinVoltage};
verify_symmetric_pins({_Primary, _Secondary}) ->
    unsynced.
\`\`\`

Notice:
- Each clause of \`mode_profile/1\` ends with a semicolon \`;\`, while the final clause ends with a period \`.\`.
- \`lead_telemetry_or_default/2\` separates the non-empty list pattern clause from the empty list fallback clause with \`;\`.
- \`verify_symmetric_pins/1\` asserts identical pin values in the tuple using the repeated variable \`PinVoltage\`.

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

## Assignment Specification

In \`clause_router.erl\`, implement three multi-clause functions using pattern matching in function heads and the Erlang punctuation triad:

1. \`describe_status(Code)\`:
   - **Input**: An integer HTTP-style status code \`Code\`.
   - **Behavior**: Use pattern matching across function clauses to map known status codes to status tuples. If the code is not one of the explicitly handled status values, fall back via a wildcard clause.
     - Code \`200\`: Returns \`{ok, success}\`.
     - Code \`404\`: Returns \`{error, not_found}\`.
     - Code \`500\`: Returns \`{error, server_crash}\`.
     - Any other code: Returns \`{error, unknown_code}\`.
   - **Examples**:
     - \`clause_router:describe_status(200)\` returns \`{ok, success}\`.
     - \`clause_router:describe_status(404)\` returns \`{error, not_found}\`.
     - \`clause_router:describe_status(418)\` returns \`{error, unknown_code}\`.

2. \`head_or_default(List, Default)\`:
   - **Input**: A list \`List\` and a fallback value \`Default\` of any term type.
   - **Behavior**: Extract the first element if the list is non-empty; if the list is empty, return the fallback value. Must be implemented as two distinct function clauses separated by a semicolon.
   - **Examples**:
     - \`clause_router:head_or_default([packet, ping], fallback)\` returns \`packet\`.
     - \`clause_router:head_or_default([], 999)\` returns \`999\`.
     - \`clause_router:head_or_default([], default_val)\` returns \`default_val\`.

3. \`verify_identical_pair(PairTuple)\`:
   - **Input**: A 2-element tuple \`PairTuple\`.
   - **Behavior**: Check whether both elements in the pair are identical using repeated pattern variable binding in the clause head (without \`if\`, \`case\`, or boolean equality operators).
     - If both elements match: Returns \`{matched, Value}\` where \`Value\` is the shared element.
     - If elements differ or input does not match: Returns the atom \`mismatch\`.
   - **Examples**:
     - \`clause_router:verify_identical_pair({alpha, alpha})\` returns \`{matched, alpha}\`.
     - \`clause_router:verify_identical_pair({omega, omega})\` returns \`{matched, omega}\`.
     - \`clause_router:verify_identical_pair({alpha, beta})\` returns \`mismatch\`.

## Rules & Verification Constraints

- Follow the punctuation triad strictly: separate clauses of the same function with \`;\` and terminate each function with \`.\`.
- Do not use \`case\` or \`if\` expressions—rely entirely on multi-clause function head pattern matching.`,
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
        explanation: 'Matches {X, X} repeated pattern variable clause.',
      },
    ],
    astRules: {
      requiredConstructs: [],
    },
    solutionExplanation: 'Demonstrates multi-clause function dispatch, the punctuation triad (; vs .), and repeated pattern variable matching.',
    files: [
      {
        name: 'clause_router.erl',
        path: 'src/clause_router.erl',
        content: `-module(clause_router).
-export([describe_status/1, head_or_default/2, verify_identical_pair/1]).

%% @doc Classify status codes 200, 404, 500, or return unknown_code error.
describe_status(Code) ->
    ok.

%% @doc Return first element of a non-empty list, or Default when list is empty.
head_or_default(List, Default) ->
    ok.

%% @doc Return {matched, Value} if both tuple elements are identical, otherwise mismatch.
verify_identical_pair(Pair) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/clause_router.erl': `-module(clause_router).
-export([describe_status/1, head_or_default/2, verify_identical_pair/1]).

describe_status(200) ->
    {ok, success};
describe_status(404) ->
    {error, not_found};
describe_status(500) ->
    {error, server_crash};
describe_status(_) ->
    {error, unknown_code}.

head_or_default([H | _], _Default) ->
    H;
head_or_default([], Default) ->
    Default.

verify_identical_pair({X, X}) ->
    {matched, X};
verify_identical_pair(_) ->
    mismatch.`,
    },
    starterCode: `-module(clause_router).
-export([describe_status/1, head_or_default/2, verify_identical_pair/1]).

%% @doc Classify status codes 200, 404, 500, or return unknown_code error.
describe_status(Code) ->
    ok.

%% @doc Return first element of a non-empty list, or Default when list is empty.
head_or_default(List, Default) ->
    ok.

%% @doc Return {matched, Value} if both tuple elements are identical, otherwise mismatch.
verify_identical_pair(Pair) ->
    ok.`,
    solutionCode: `-module(clause_router).
-export([describe_status/1, head_or_default/2, verify_identical_pair/1]).

describe_status(200) ->
    {ok, success};
describe_status(404) ->
    {error, not_found};
describe_status(500) ->
    {error, server_crash};
describe_status(_) ->
    {error, unknown_code}.

head_or_default([H | _], _Default) ->
    H;
head_or_default([], Default) ->
    Default.

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

You will implement the \`telecom_foundations\` module with two core subsystems:

### 1. Packet Classification (\`classify_packet/1\`)
Packets arrive as 4-element tagged tuples containing a network protocol tag (\`ipv4\` or \`ipv6\`), source host, destination host, and a list of payload items:
\`\`\`erlang
{ipv4, "10.0.0.1", "10.0.0.2", [packet_data, 100, ok]}
\`\`\`
Your classifier must:
- Extract the protocol tag, source host, destination host, and the leading payload element from valid packets that contain at least one payload item.
- Return a tagged success 5-tuple: \`{ok, Protocol, SourceHost, DestinationHost, FirstItem}\`.
- If the payload list is empty (\`[]\`), return \`{error, empty_payload}\`.
- If the input does not conform to the expected packet structure, catch-all return \`{error, invalid_packet}\`.

### 2. Cascading Billing Engine (\`bill_call/2\` and \`bill_call/3\`)
Telecom subscribers are billed based on their call duration in seconds and their subscription plan (\`standard\`, \`premium\`, or \`internal\`):
- Lower-arity \`bill_call/2\` provides default argument cascading by delegating to \`bill_call/3\` with a standard connection fee of 10 cents.
- \`bill_call/3\` determines call charges using multi-clause pattern matching on the plan atom:
  - \`standard\`: Base connection fee + 5 cents per second of duration.
  - \`premium\`: Base connection fee + 3 cents per second of duration.
  - \`internal\`: Internal company traffic—completely free (0 cents).
  - Any unknown plan: Returns \`{error, unknown_plan}\`.

## Parallel Worked Example

Consider a cloud streaming media ingestion and rate-limiting router:

\`\`\`erlang
-module(media_router).
-export([route_stream/1, compute_reservation/2, compute_reservation/3]).

%% Multi-clause packet router inspecting streaming container tuples
route_stream({audio_frame, ChannelId, [LeadSample | _History]}) ->
    {ingest, audio, ChannelId, LeadSample};
route_stream({video_frame, ChannelId, [LeadSample | _History]}) ->
    {ingest, video, ChannelId, LeadSample};
route_stream({_FrameType, _ChannelId, []}) ->
    {drop, empty_sample_buffer};
route_stream(_) ->
    {drop, malformed_stream_packet}.

%% Cascading arity providing default memory reservation (default 64MB buffer)
compute_reservation(MegaBytes, ServiceTier) ->
    compute_reservation(MegaBytes, ServiceTier, 64).

%% Multi-clause tier calculation
compute_reservation(MegaBytes, enterprise, BaseReserveMb) ->
    {ok, BaseReserveMb + (MegaBytes * 4)};
compute_reservation(MegaBytes, developer, BaseReserveMb) ->
    {ok, BaseReserveMb + (MegaBytes * 2)};
compute_reservation(_MegaBytes, diagnostic_probe, _BaseReserveMb) ->
    {ok, 0};
compute_reservation(_MegaBytes, _UnknownTier, _BaseReserveMb) ->
    {error, unsupported_tier}.
\`\`\`

Notice:
- \`route_stream/1\` handles 3-element stream tuples, destructuring the lead sample from non-empty buffers, handling empty buffers with \`{drop, empty_sample_buffer}\`, and catching malformed input.
- \`compute_reservation/2\` cascades to \`compute_reservation/3\` with a default constant parameter.
- \`compute_reservation/3\` matches on plan atoms (\`enterprise\`, \`developer\`, \`diagnostic_probe\`) to perform integer calculations or return errors without \`if\` or \`case\`.

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

## Assignment Specification

Implement \`src/telecom_foundations.erl\` with the following exports:

\`\`\`erlang
-module(telecom_foundations).
-export([classify_packet/1, bill_call/2, bill_call/3]).
\`\`\`

### 1. \`classify_packet(Packet)\`
- **Input**: A term \`Packet\`. Valid packets are 4-element tuples consisting of a protocol atom (\`ipv4\` or \`ipv6\`), a source host string, a destination host string, and a payload list.
- **Behavior**:
  - Valid packets with non-empty payloads: Extract the protocol, source host, destination host, and the first payload element. Return \`{ok, Protocol, SourceHost, DestinationHost, FirstPayloadItem}\`.
  - Valid packet structure with empty payload list (\`[]\`): Return \`{error, empty_payload}\`.
  - Any other term or malformed tuple: Return \`{error, invalid_packet}\`.
- **Examples**:
  - \`telecom_foundations:classify_packet({ipv4, "10.0.0.1", "10.0.0.2", [ping, 100]})\` returns \`{ok, ipv4, "10.0.0.1", "10.0.0.2", ping}\`.
  - \`telecom_foundations:classify_packet({ipv6, "fe80::1", "fe80::2", [data]})\` returns \`{ok, ipv6, "fe80::1", "fe80::2", data}\`.
  - \`telecom_foundations:classify_packet({ipv4, "10.0.0.1", "10.0.0.2", []})\` returns \`{error, empty_payload}\`.
  - \`telecom_foundations:classify_packet(bad_packet)\` returns \`{error, invalid_packet}\`.

### 2. \`bill_call(DurationSec, PlanType)\`
- **Input**: An integer call duration \`DurationSec\` in seconds and a subscription plan atom \`PlanType\`.
- **Behavior**: Delegate to \`bill_call/3\` supplying a default connection fee of \`10\` cents.
- **Example**:
  - \`telecom_foundations:bill_call(60, standard)\` delegates to \`bill_call(60, standard, 10)\`.

### 3. \`bill_call(DurationSec, PlanType, ConnectionFeeCents)\`
- **Input**: Integer \`DurationSec\`, plan atom \`PlanType\`, and integer \`ConnectionFeeCents\`.
- **Behavior**: Calculate the total call cost in cents using multi-clause pattern matching on \`PlanType\`:
  - \`standard\`: Returns \`{ok, Total}\` where total is \`ConnectionFeeCents + (DurationSec * 5)\`.
  - \`premium\`: Returns \`{ok, Total}\` where total is \`ConnectionFeeCents + (DurationSec * 3)\`.
  - \`internal\`: Internal company calls are free. Returns \`{ok, 0}\` regardless of duration or fee.
  - Any other plan: Returns \`{error, unknown_plan}\`.
- **Examples**:
  - \`telecom_foundations:bill_call(60, standard, 10)\` returns \`{ok, 310}\`.
  - \`telecom_foundations:bill_call(100, premium, 25)\` returns \`{ok, 325}\`.
  - \`telecom_foundations:bill_call(3600, internal, 10)\` returns \`{ok, 0}\`.
  - \`telecom_foundations:bill_call(60, custom_plan, 10)\` returns \`{error, unknown_plan}\`.

## Rules & Verification Constraints

- **ZERO FORWARD REFERENCES**: Do not use Maps (\`#{}\`), Binaries (\`<<...>>\`), or \`when\` guard clauses!
- Rely strictly on multi-clause pattern matching and integer arithmetic.
- Remember the punctuation triad: clauses are separated by semicolons (\`;\`), and the function ends with a period (\`.\`).`,
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
        explanation: 'Default fee 10 + (60 * 5) = 310 cents.',
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
    },
    solutionExplanation: 'Implements full multi-clause packet routing, empty payload guarding, and arity delegation for standard/premium/internal CDR billing.',
    files: [
      {
        name: 'telecom_foundations.erl',
        path: 'src/telecom_foundations.erl',
        content: `-module(telecom_foundations).
-export([classify_packet/1, bill_call/2, bill_call/3]).

%% @doc Classify network packet tuple and extract protocol, endpoints, and lead payload.
classify_packet(Packet) ->
    ok.

%% @doc Calculate call charge using the default connection fee of 10 cents.
bill_call(DurationSec, PlanType) ->
    ok.

%% @doc Calculate total call charge in cents given duration, plan tier, and connection fee.
bill_call(DurationSec, PlanType, ConnectionFeeCents) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/telecom_foundations.erl': `-module(telecom_foundations).
-export([classify_packet/1, bill_call/2, bill_call/3]).

classify_packet({ipv4, SrcHost, DstHost, [FirstItem | _Rest]}) ->
    {ok, ipv4, SrcHost, DstHost, FirstItem};
classify_packet({ipv6, SrcHost, DstHost, [FirstItem | _Rest]}) ->
    {ok, ipv6, SrcHost, DstHost, FirstItem};
classify_packet({_Tag, _Src, _Dst, []}) ->
    {error, empty_payload};
classify_packet(_) ->
    {error, invalid_packet}.

bill_call(DurationSec, PlanType) ->
    bill_call(DurationSec, PlanType, 10).

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

%% @doc Classify network packet tuple and extract protocol, endpoints, and lead payload.
classify_packet(Packet) ->
    ok.

%% @doc Calculate call charge using the default connection fee of 10 cents.
bill_call(DurationSec, PlanType) ->
    ok.

%% @doc Calculate total call charge in cents given duration, plan tier, and connection fee.
bill_call(DurationSec, PlanType, ConnectionFeeCents) ->
    ok.`,
    solutionCode: `-module(telecom_foundations).
-export([classify_packet/1, bill_call/2, bill_call/3]).

classify_packet({ipv4, SrcHost, DstHost, [FirstItem | _Rest]}) ->
    {ok, ipv4, SrcHost, DstHost, FirstItem};
classify_packet({ipv6, SrcHost, DstHost, [FirstItem | _Rest]}) ->
    {ok, ipv6, SrcHost, DstHost, FirstItem};
classify_packet({_Tag, _Src, _Dst, []}) ->
    {error, empty_payload};
classify_packet(_) ->
    {error, invalid_packet}.

bill_call(DurationSec, PlanType) ->
    bill_call(DurationSec, PlanType, 10).

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

import { LessonContent } from '../../types/workspace';

export const CHAPTER_3_LESSONS: LessonContent[] = [
  // ── Lesson 3.1: First-Class Functions & Closures ─────────────────────────
  {
    id: 'ch03-l01',
    chapterNumber: 3,
    lessonNumber: 1,
    lessonType: 'concept_exercise',
    title: 'First-Class Functions: Anonymous fun Closures & fun Mod:Fun/Arity Captures',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In distributed systems, microservices, and asynchronous event-driven pipelines, hardcoding business logic inside rigid control flow leads to brittle, repetitive code. For example, a logistics billing engine needs swappable rate calculators across priority, contract, and standard freight shipments; a payment gateway needs configurable validation hooks before authorizing a charge.

In imperative languages, passing functions around often involves verbose interface declarations, function pointers, or anonymous delegates.

In Erlang, functions are **First-Class Citizens** (of primitive data type \`fun()\`). A function is a value just like an integer, an atom, or a tuple:
1. You can bind a function to a variable.
2. You can pass a function as an argument to another function.
3. You can return a function from another function (a function factory).
4. You can store functions inside tuples and lists.

## Deep Concept Breakdown & Under the Hood

### 1. Anonymous Functions (\`fun (...) -> ... end\`) & Lexical Closures
An anonymous function (or *lambda*) is declared using the \`fun\` keyword:

\`\`\`erlang
Double = fun(X) -> X * 2 end,
Double(5).  %% => 10
\`\`\`

When an anonymous function references a variable defined outside its own argument list, it **closes over** that variable. This construct is called a **Lexical Closure**:

\`\`\`erlang
make_offset(Offset) ->
    %% Offset is captured from the enclosing scope:
    fun(Val) -> Val + Offset end.
\`\`\`

Under the hood, the BEAM VM allocates a special closure header on the process heap containing:
- An entry pointer to the compiled bytecode for the lambda.
- An **environment vector** holding pointers to all captured immutable variables (\`Offset\`).
Because Erlang data terms are strictly immutable, closures are 100% thread-safe and free from race conditions!

### 2. Multi-Clause Anonymous Functions
Just like top-level named functions, anonymous \`fun\` expressions can have multiple pattern-matching clauses separated by semicolons (\`;\`):

\`\`\`erlang
SafeUnwrap = fun
    ({ok, Value}) -> Value;
    ({error, _Reason}) -> default_value
end.
\`\`\`

> [!warning] Common Beginner Syntax Trap: The Punctuation of fun Clauses
> In a multi-clause \`fun\`, you do NOT repeat the \`fun\` keyword for subsequent clauses.
> Separate clauses with semicolons (\`;\`), and terminate the entire construct with \`end\`.
> Note that in anonymous functions, all clauses must have the exact same arity!

### 3. Function Captures (\`fun Local/Arity\` and \`fun Mod:Fun/Arity\`)
Frequently, you want to pass an existing named function as an argument. Instead of wrapping it in a redundant closure like \`fun(X) -> erlang:round(X) end\`, Erlang provides the **Function Capture Operator**:

\`\`\`erlang
%% Local function capture:
LocalRef = fun my_helper/1,

%% Remote function capture:
RoundRef = fun erlang:round/1,
RoundRef(4.7).  %% => 5
\`\`\`

**Why Remote Captures Matter for Hot Code Reloading:**
When you capture a remote function using \`fun Module:Function/Arity\`, the BEAM VM does not resolve the bytecode to a static address. Instead, it performs dynamic dispatch through the BEAM export table. If \`Module\` is recompiled and reloaded in a live production node, future invocations of that capture automatically execute the **newest code version** without restarting the process!

### 4. Guard Checking with \`is_function/2\`
When accepting functions as arguments in production, always guard your function heads using the \`is_function/2\` BIF to verify both that the argument is a function and that it expects the correct number of arguments:

\`\`\`erlang
execute_unary_operation(F, Arg) when is_function(F, 1) ->
    F(Arg);
execute_unary_operation(_Invalid, _Arg) ->
    {error, bad_function}.
\`\`\`

## Parallel Worked Example

Consider an industrial telemetry sensor pipeline calibrating raw readings and applying either a built-in rounding hook or a caller-supplied unary filter:

\`\`\`erlang
-module(sensor_pipeline).
-export([build_calibrator/2, apply_stage/2]).

%% ── Phase 1: Lexical Closure Factory & Mode Dispatch ───────────────────────
%% Captures Bias on custom offsets or returns mode-specific transformation closures.
build_calibrator(custom, Bias) when is_integer(Bias) ->
    fun(RawReading) -> RawReading + Bias end;
build_calibrator(kilo, _Unused) ->
    fun(MilliUnits) -> MilliUnits div 1000 end;
build_calibrator(_Default, _Unused) ->
    fun(RawReading) -> RawReading end.

%% ── Phase 2: Guarded HOF Dispatch & Hot-Reload-Safe Remote Capture ─────────
%% Applies a standard library capture directly or verifies custom unary hooks via guard.
apply_stage(Sample, normalize) ->
    RoundFun = fun erlang:round/1,
    RoundFun(Sample);
apply_stage(Sample, CustomHook) when is_function(CustomHook, 1) ->
    CustomHook(Sample).
\`\`\`

How the BEAM executes both stages:
- **Phase 1 (\`build_calibrator/2\`)**: Pattern matching on the first argument selects a transformation closure; for \`custom\`, \`Bias\` is stored in the closure's immutable heap environment vector so the returned function remains self-contained.
- **Phase 2 (\`apply_stage/2\`)**: The \`normalize\` branch captures \`fun erlang:round/1\` through the export table (no extra wrapper frame), while the second clause checks the argument's closure header with \`is_function(CustomHook, 1)\` in $O(1)$ before invoking \`CustomHook(Sample)\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Anonymous Closure Syntax
fun (Arg1, Arg2) -> Body end

%% Function Capture Syntax
fun FunctionName/Arity
fun ModuleName:FunctionName/Arity

%% Guard BIFs
is_function(Term) -> boolean()
is_function(Term, Arity) -> boolean()
\`\`\`

> How to read these signatures: \`fun((...) -> term())\` denotes a callable function value accepting fixed arity arguments, and \`arity()\` is a non-negative integer checked in $O(1)$ against the closure header. Open the attached **Reference Cards** for full \`fun_expression\` and \`is_function/2\` documentation.

## Assignment Specification

Implement four foundational higher-order functions in \`src/hof_basics.erl\`:

### 1. \`make_multiplier(Factor)\`
- **Input**: \`Factor\` — An integer multiplier.
- **Behavior**: Returns a single-argument anonymous function that captures \`Factor\` from lexical scope. When the returned function is called with an integer argument \`X\`, it returns \`X\` multiplied by \`Factor\`.
- **Examples**:
  - \`Mul3 = hof_basics:make_multiplier(3), Mul3(15)\` returns \`45\`.
  - \`Mul0 = hof_basics:make_multiplier(0), Mul0(10)\` returns \`0\`.

### 2. \`apply_twice(F, X)\`
- **Input**:
  - \`F\` — A unary function expecting 1 argument.
  - \`X\` — An initial value of any type compatible with \`F\`.
- **Behavior**: Protects execution with a function-head guard verifying that \`F\` is a 1-argument function so non-function terms or functions of any other arity fail immediately with a clause error instead of attempting invocation. For valid unary functions, evaluates \`F\` on \`X\` and applies \`F\` once more to the intermediate result.
- **Examples**:
  - \`hof_basics:apply_twice(fun(N) -> N + 10 end, 5)\` returns \`25\`.
  - \`hof_basics:apply_twice(fun(N) -> N * 3 end, 2)\` returns \`18\`.

### 3. \`math_capture()\`
- **Input**: None (0 arguments).
- **Behavior**: Returns a direct external function capture referencing the standard library integer absolute value function (\`abs/1\` in the \`erlang\` module) without wrapping it inside a custom anonymous closure.
- **Examples**:
  - \`AbsRef = hof_basics:math_capture(), AbsRef(-99)\` returns \`99\`.
  - \`AbsRef = hof_basics:math_capture(), AbsRef(42)\` returns \`42\`.

### 4. \`choose_pricing_strategy(Tier)\`
- **Input**: \`Tier\` — A term representing the customer tier (handling atoms \`vip\`, \`wholesale\`, or any fallback term).
- **Behavior**: Selects and returns a single-argument pricing function accepting an integer \`Price\` based on \`Tier\`:
  - If \`Tier\` is \`vip\`: returns a function applying a 20% discount (computing 80% of \`Price\` via truncating integer division rounding toward zero).
  - If \`Tier\` is \`wholesale\`: returns a function applying a 30% discount (computing 70% of \`Price\` via truncating integer division rounding toward zero).
  - For any other tier: returns an identity function returning \`Price\` unchanged.
- **Examples**:
  - \`Vip = hof_basics:choose_pricing_strategy(vip), Vip(100)\` returns \`80\`.
  - \`Wholesale = hof_basics:choose_pricing_strategy(wholesale), Wholesale(100)\` returns \`70\`.
  - \`Regular = hof_basics:choose_pricing_strategy(retail), Regular(100)\` returns \`100\`.

## Rules & Verification Constraints

- \`bf_ast_verifier\` enforces anonymous closures (\`fun_expr\`), a genuine remote function capture referencing \`erlang:abs/1\` (\`remote_fun_capture\`), and function-head guard protection (\`guards\`) on \`apply_twice/2\`.
- All arithmetic must use integer operators (\`*\`, \`div\`).
- Strictly no Maps (\`#{}\`) or Bit-Syntax Binaries (\`<<...>>\`). Use integers, atoms, tuples, and functions only.`,
    otpDocCards: [
      {
        functionName: 'fun_expression',
        module: 'erlang',
        signature: 'fun(Arg1, ...) -> Body end',
        typesSpec: ['Arg = term()', 'Returns fun((...) -> term())'],
        description: 'First-class lexical closure capturing enclosing scope variables into process heap environment.',
        complexityNote: 'O(1) allocation of environment vector on process heap.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/expressions.html#fun-expressions',
      },
      {
        functionName: 'is_function/2',
        module: 'erlang',
        signature: 'is_function(Term, Arity) -> boolean()',
        typesSpec: ['Term = term()', 'Arity = arity()', 'Returns boolean()'],
        description: 'Guard BIF returning true if Term is a function expecting exactly Arity arguments.',
        complexityNote: 'O(1) BIF header tag and arity check.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#is_function/2',
      },
    ],
    mentalModelCheck: {
      question: 'What is the primary operational difference between fun(X) -> erlang:abs(X) end and fun erlang:abs/1?',
      options: [
        {
          id: 'A',
          label: 'The remote capture fun erlang:abs/1 resolves dynamically through the module export table, supporting hot code reloading and avoiding an extra function call frame',
          isCorrect: true,
          explanation: 'Remote captures dynamically dispatch to the latest version of the module and avoid redundant lambda wrapper allocations.',
        },
        {
          id: 'B',
          label: 'The capture fun erlang:abs/1 runs synchronously in C while the lambda runs in Erlang bytecode',
          isCorrect: false,
          explanation: 'Both execute the underlying BIF; the difference lies in dispatch mechanism and closure environment allocation.',
        },
        {
          id: 'C',
          label: 'Only the lambda can accept negative integers',
          isCorrect: false,
          explanation: 'Both accept all numeric terms valid for erlang:abs/1.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch03-01-a',
        title: 'Generate and Invoke Multiplier Closure',
        erlangCall: 'begin Mul3 = hof_basics:make_multiplier(3), Mul3(15) end',
        expectedOutput: '45',
        explanation: 'make_multiplier(3) captures Factor=3 and multiplies 15 * 3 = 45.',
      },
      {
        id: 'tc-ch03-01-b',
        title: 'Apply Function Twice to Value',
        erlangCall: 'hof_basics:apply_twice(fun(X) -> X + 10 end, 5)',
        expectedOutput: '25',
        explanation: '5 + 10 = 15; 15 + 10 = 25.',
      },
      {
        id: 'tc-ch03-01-c',
        title: 'Invoke Captured fun erlang:abs/1',
        erlangCall: 'begin AbsRef = hof_basics:math_capture(), AbsRef(-99) end',
        expectedOutput: '99',
        explanation: 'Invokes captured BIF erlang:abs/1 directly.',
      },
      {
        id: 'tc-ch03-01-d',
        title: 'Execute VIP Pricing Strategy',
        erlangCall: 'begin Strategy = hof_basics:choose_pricing_strategy(vip), Strategy(100) end',
        expectedOutput: '80',
        explanation: '(100 * 80) div 100 = 80.',
      },
    ],
    astRules: {
      requiredConstructs: ['fun_expr', 'remote_fun_capture', 'guards'],
      requiredCalls: ['erlang:abs/1'],
      forbiddenConstructs: ['map_syntax', 'bit_syntax'],
    },
    solutionExplanation: 'Demonstrates anonymous closures capturing lexical variables, unary function guards enforcing 1-arity callable arguments, direct remote export-table function capture, and strategy factory patterns.',
    files: [
      {
        name: 'hof_basics.erl',
        path: 'src/hof_basics.erl',
        content: `-module(hof_basics).
-export([make_multiplier/1, apply_twice/2, math_capture/0, choose_pricing_strategy/1]).

%% @doc Return a 1-argument closure multiplying its integer input by the caller-supplied Factor.
make_multiplier(_Factor) ->
    ok.

%% @doc Guard that the caller-supplied F expects exactly 1 argument (failing with a clause error otherwise) and apply F twice to X.
apply_twice(_F, _X) ->
    ok.

%% @doc Return a direct external function capture referencing the standard integer absolute value BIF without an anonymous wrapper.
math_capture() ->
    ok.

%% @doc Return a 1-argument integer pricing closure implementing VIP (20% discount), wholesale (30% discount), or identity pricing for any other Tier.
choose_pricing_strategy(_Tier) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/hof_basics.erl': `-module(hof_basics).
-export([make_multiplier/1, apply_twice/2, math_capture/0, choose_pricing_strategy/1]).

%% @doc Return a 1-argument closure multiplying its integer input by the caller-supplied Factor.
make_multiplier(Factor) ->
    fun(X) -> X * Factor end.

%% @doc Guard that the caller-supplied F expects exactly 1 argument (failing with a clause error otherwise) and apply F twice to X.
apply_twice(F, X) when is_function(F, 1) ->
    F(F(X)).

%% @doc Return a direct external function capture referencing the standard integer absolute value BIF without an anonymous wrapper.
math_capture() ->
    fun erlang:abs/1.

%% @doc Return a 1-argument integer pricing closure implementing VIP (20% discount), wholesale (30% discount), or identity pricing for any other Tier.
choose_pricing_strategy(vip) ->
    fun(Price) -> (Price * 80) div 100 end;
choose_pricing_strategy(wholesale) ->
    fun(Price) -> (Price * 70) div 100 end;
choose_pricing_strategy(_) ->
    fun(Price) -> Price end.`,
    },
    starterCode: `-module(hof_basics).
-export([make_multiplier/1, apply_twice/2, math_capture/0, choose_pricing_strategy/1]).

%% @doc Return a 1-argument closure multiplying its integer input by the caller-supplied Factor.
make_multiplier(_Factor) ->
    ok.

%% @doc Guard that the caller-supplied F expects exactly 1 argument (failing with a clause error otherwise) and apply F twice to X.
apply_twice(_F, _X) ->
    ok.

%% @doc Return a direct external function capture referencing the standard integer absolute value BIF without an anonymous wrapper.
math_capture() ->
    ok.

%% @doc Return a 1-argument integer pricing closure implementing VIP (20% discount), wholesale (30% discount), or identity pricing for any other Tier.
choose_pricing_strategy(_Tier) ->
    ok.`,
    solutionCode: `-module(hof_basics).
-export([make_multiplier/1, apply_twice/2, math_capture/0, choose_pricing_strategy/1]).

%% @doc Return a 1-argument closure multiplying its integer input by the caller-supplied Factor.
make_multiplier(Factor) ->
    fun(X) -> X * Factor end.

%% @doc Guard that the caller-supplied F expects exactly 1 argument (failing with a clause error otherwise) and apply F twice to X.
apply_twice(F, X) when is_function(F, 1) ->
    F(F(X)).

%% @doc Return a direct external function capture referencing the standard integer absolute value BIF without an anonymous wrapper.
math_capture() ->
    fun erlang:abs/1.

%% @doc Return a 1-argument integer pricing closure implementing VIP (20% discount), wholesale (30% discount), or identity pricing for any other Tier.
choose_pricing_strategy(vip) ->
    fun(Price) -> (Price * 80) div 100 end;
choose_pricing_strategy(wholesale) ->
    fun(Price) -> (Price * 70) div 100 end;
choose_pricing_strategy(_) ->
    fun(Price) -> Price end.`,
  },

  // ── Lesson 3.2: lists:map, filter, filtermap ──────────────────────────────
  {
    id: 'ch03-l02',
    chapterNumber: 3,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'Transforming & Filtering Collections (lists:map/2, lists:filter/2, lists:filtermap/2)',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In Chapter 2, you wrote manual tail-recursive loops with accumulators to search, filter, and transform lists. While writing recursion by hand is essential for understanding the BEAM VM stack, writing 12 lines of recursive boilerplate for every collection operation in production is slow, tedious, and error-prone.

The Erlang standard library's \`lists\` module provides battle-tested, high-performance Higher-Order Functions that compress common collection patterns into concise, expressive, one-line operations.

## Deep Concept Breakdown & Under the Hood

### 1. 1-to-1 Transformation with \`lists:map/2\`
When you need to transform every element of a list into a new element without changing the list's length or order:

\`\`\`erlang
lists:map(fun((A) -> B), [A]) -> [B]
\`\`\`

\`\`\`erlang
Numbers = [1, 2, 3, 4],
Doubled = lists:map(fun(X) -> X * 2 end, Numbers).  %% => [2, 4, 6, 8]
\`\`\`

\`lists:map/2\` applies the transformation to each element and guarantees that the resulting list has the exact same number of elements in the exact same sequential order.

### 2. Predicate Filtering with \`lists:filter/2\`
When you need to prune a collection, keeping only elements that satisfy a condition:

\`\`\`erlang
lists:filter(fun((A) -> boolean()), [A]) -> [A]
\`\`\`

\`\`\`erlang
Temps = [15, -4, 22, -1],
PositiveTemps = lists:filter(fun(T) -> T > 0 end, Temps).
%% => [15, 22]
\`\`\`

> [!warning] Common Beginner Syntax Trap: Boolean Predicate Requirement
> The callback fun passed to \`lists:filter/2\` MUST return the literal boolean atom \`true\` or \`false\`.
> If your function returns an integer or an arbitrary atom like \`ok\` or \`undefined\`, the BEAM VM immediately crashes with a \`{bad_filter, ReturnedValue}\` runtime exception!

### 3. The Single-Pass Optimization: \`lists:filtermap/2\`
Frequently in production, you need to filter a list AND transform the retained elements.
A novice writes two sequential pipeline stages:

\`\`\`erlang
%% Inefficient: Traverses the list twice and allocates an intermediate list in memory!
Filtered = lists:filter(fun(Elem) -> is_valid(Elem) end, RawList),
Transformed = lists:map(fun(Elem) -> transform(Elem) end, Filtered).
\`\`\`

Erlang provides **\`lists:filtermap/2\`**, which performs both operations in a **single pass**:

\`\`\`erlang
lists:filtermap(fun((A) -> boolean() | {true, B}), [A]) -> [B]
\`\`\`

The callback fun returns:
- \`true\`: Keep the element unchanged.
- \`false\`: Discard the element.
- \`{true, NewElement}\`: Keep the element and replace it with \`NewElement\`.

\`\`\`erlang
Configs = [{web, 8080}, {debug, disabled}, {api, 3000}],
ActivePorts = lists:filtermap(fun
    ({Name, Port}) when is_integer(Port) ->
        {true, {active_service, Name, Port}};
    ({_Name, _Disabled}) ->
        false
end, Configs).
%% => [{active_service, web, 8080}, {active_service, api, 3000}]  -- Single traversal!
\`\`\`

## Parallel Worked Example

Consider a rail infrastructure telemetry controller classifying track relays and normalizing live Celsius sensor probes into Kelvin in a single pass:

\`\`\`erlang
-module(rail_telemetry).
-export([tag_clear_signals/1, scale_celsius_probes/2]).

%% ── Phase 1: Boolean Filtering & Projection Pipeline (lists:filter/2 + lists:map/2) ──
%% Retains only clear relays and projects bare signal IDs tagged with track mode.
tag_clear_signals(Relays) ->
    ClearRelays = lists:filter(fun({relay, _SignalId, State}) ->
        State =:= clear
    end, Relays),
    lists:map(fun({relay, SignalId, _State}) ->
        {cleared_signal, SignalId}
    end, ClearRelays).

%% ── Phase 2: Single-Pass Filter-and-Transform (lists:filtermap/2) ──────────────────
%% Discards offline probes and offsets active Celsius readings into scaled Kelvin in one traversal.
scale_celsius_probes(Probes, OffsetK) ->
    lists:filtermap(fun
        ({probe, ProbeId, Celsius}) when is_integer(Celsius) ->
            {true, {kelvin, ProbeId, Celsius + OffsetK}};
        ({probe, _ProbeId, offline}) ->
            false
    end, Probes).
\`\`\`

How the BEAM executes these collection helpers:
- **Phase 1 (\`tag_clear_signals/1\`)**: Uses \`lists:filter/2\` (boolean check \`State =:= clear\`) followed by \`lists:map/2\` to illustrate when separating two independent operations costs an extra list traversal and temporary cons cells on the process heap.
- **Phase 2 (\`scale_celsius_probes/2\`)**: Replaces the two-pass filter-plus-map with a single \`lists:filtermap/2\` call; returning \`{true, Transformed}\` swaps elements in one pass while returning \`false\` drops offline entries cleanly with zero throwaway intermediate list allocation.

## Official Erlang Docs & Function Reference

\`\`\`erlang
lists:map(Fun, List) -> [term()]
lists:filter(Pred, List) -> [term()]
lists:filtermap(Fun, List) -> [term()]
\`\`\`

> How to read these signatures: \`Fun\` and \`Pred\` are first-class 1-argument functions (\`fun((A) -> B)\` or \`fun((A) -> boolean())\`), and all three stdlib traversal helpers guarantee exact left-to-right output ordering matching \`List\`. Open the attached **Reference Cards** for \`lists:map/2\` and \`lists:filtermap/2\` documentation.

## Assignment Specification

Implement three collection transformation functions in \`src/hof_transform.erl\` utilizing the Erlang \`lists\` standard library:

### 1. \`discount_prices(Products, DiscountPercent)\`
- **Input**:
  - \`Products\` — A list of zero or more 4-element \`product\` tuples (carrying an integer \`Id\`, a string \`Name\`, and an integer \`Price\`).
  - \`DiscountPercent\` — An integer percentage discount (e.g., \`10\` for 10%).
- **Behavior**: Transforms every product tuple across \`Products\` into a discounted product tuple preserving \`Id\`, \`Name\`, and exact input list ordering. Compute each reduced price by deducting \`DiscountPercent\` percent of \`Price\` using truncating whole-number integer division (rounding down the deducted discount amount toward zero before subtracting from \`Price\`).
- **Examples**:
  - \`hof_transform:discount_prices([{product, 1, "Keyboard", 100}, {product, 2, "Mouse", 50}], 10)\` returns \`[{product, 1, "Keyboard", 90}, {product, 2, "Mouse", 45}]\`.
  - \`hof_transform:discount_prices([], 20)\` returns \`[]\`.

### 2. \`active_sessions(Sessions)\`
- **Input**: \`Sessions\` — A list of zero or more 3-element \`session\` tuples (carrying an integer or string \`SessionId\` and a \`Status\` atom).
- **Behavior**: Filters \`Sessions\` with a strict boolean predicate keeping only session tuples whose status atom equals \`active\`, preserving original list ordering.
- **Examples**:
  - \`hof_transform:active_sessions([{session, 101, active}, {session, 102, expired}, {session, 103, active}])\` returns \`[{session, 101, active}, {session, 103, active}]\`.
  - \`hof_transform:active_sessions([{session, 1, expired}])\` returns \`[]\`.

### 3. \`sanitize_metrics(RawMetrics)\`
- **Input**: \`RawMetrics\` — A list of zero or more 2-element telemetry pairs (pairing a metric atom \`MetricName\` with an integer or float \`Value\`).
- **Behavior**: Filters and transforms \`RawMetrics\` in a single traversal:
  - Discard measurements where \`Value\` is strictly less than zero.
  - Retain measurements where \`Value\` is zero or positive with \`Value\` converted to the nearest integer via the standard rounding function.
- **Examples**:
  - \`hof_transform:sanitize_metrics([{cpu_load, 14.8}, {fan_speed, -10}, {memory_usage, 65.2}])\` returns \`[{cpu_load, 15}, {memory_usage, 65}]\`.
  - \`hof_transform:sanitize_metrics([{voltage, -5.0}])\` returns \`[]\`.

## Rules & Verification Constraints

- \`bf_ast_verifier\` enforces required remote calls to \`lists:map/2\`, \`lists:filter/2\`, and \`lists:filtermap/2\`, and forbids list comprehensions (\`[Expr || ...]\`), maps (\`#{}\`), and bit-syntax binaries (\`<<...>>\`).
- Use tuples, atoms, numbers (integers/floats), and lists only.`,
    otpDocCards: [
      {
        functionName: 'lists:map/2',
        module: 'lists',
        signature: 'map(Fun, List1) -> List2',
        typesSpec: ['Fun = fun((A) -> B)', 'List1 = [A]', 'List2 = [B]'],
        description: 'Transforms every element in List1 by applying Fun, preserving length and order.',
        complexityNote: 'O(N) time, O(N) memory allocation.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#map/2',
      },
      {
        functionName: 'lists:filtermap/2',
        module: 'lists',
        signature: 'filtermap(Fun, List1) -> List2',
        typesSpec: ['Fun = fun((A) -> boolean() | {true, B})', 'List1 = [A]', 'List2 = [B]'],
        description: 'Calls Fun on elements of List1; returns List2 containing elements where Fun returned true or {true, Val}.',
        complexityNote: 'Single-pass O(N) filtering and transformation avoiding intermediate lists.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#filtermap/2',
      },
    ],
    mentalModelCheck: {
      question: 'Why is lists:filtermap/2 preferred over lists:map(F, lists:filter(P, List)) in high-throughput Erlang servers?',
      options: [
        {
          id: 'A',
          label: 'It traverses the list exactly once and avoids allocating a throwaway intermediate list on the process heap',
          isCorrect: true,
          explanation: 'Chaining filter then map creates an intermediate list that immediately triggers garbage collection; filtermap builds the final result in a single pass.',
        },
        {
          id: 'B',
          label: 'lists:filtermap/2 executes concurrently across multiple BEAM schedulers',
          isCorrect: false,
          explanation: 'lists module functions are sequential and execute inside the calling process.',
        },
        {
          id: 'C',
          label: 'lists:map cannot operate on tuples',
          isCorrect: false,
          explanation: 'lists:map accepts any Erlang term, including tuples.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch03-02-a',
        title: 'Apply 10% Discount with lists:map',
        erlangCall: 'hof_transform:discount_prices([{product, 1, "Keyboard", 100}, {product, 2, "Mouse", 50}], 10)',
        expectedOutput: '[{product, 1, "Keyboard", 90}, {product, 2, "Mouse", 45}]',
        explanation: '100 - 10 = 90; 50 - 5 = 45.',
      },
      {
        id: 'tc-ch03-02-b',
        title: 'Filter Active Sessions with lists:filter',
        erlangCall: 'hof_transform:active_sessions([{session, 101, active}, {session, 102, expired}, {session, 103, active}])',
        expectedOutput: '[{session, 101, active}, {session, 103, active}]',
        explanation: 'Discards expired session 102.',
      },
      {
        id: 'tc-ch03-02-c',
        title: 'Sanitize Metrics in Single Pass with lists:filtermap',
        erlangCall: 'hof_transform:sanitize_metrics([{cpu_load, 14.8}, {fan_speed, -10}, {memory_usage, 65.2}])',
        expectedOutput: '[{cpu_load, 15}, {memory_usage, 65}]',
        explanation: 'Discards negative fan_speed and rounds 14.8 to 15 and 65.2 to 65.',
      },
    ],
    astRules: {
      requiredCalls: ['lists:map/2', 'lists:filter/2', 'lists:filtermap/2'],
      forbiddenConstructs: ['list_comprehension', 'map_syntax', 'bit_syntax'],
    },
    solutionExplanation: 'Utilizes lists:map/2 for 1-to-1 integer-discounted price transformations, lists:filter/2 for active session filtering, and lists:filtermap/2 for single-pass non-negative metric sanitization.',
    files: [
      {
        name: 'hof_transform.erl',
        path: 'src/hof_transform.erl',
        content: `-module(hof_transform).
-export([discount_prices/2, active_sessions/1, sanitize_metrics/1]).

%% @doc Return a list of product tuples with each price reduced by the caller-supplied DiscountPercent using truncating integer division while preserving order.
discount_prices(_Products, _DiscountPercent) ->
    ok.

%% @doc Retain only session tuples in the active state from Sessions while preserving original order.
active_sessions(_Sessions) ->
    ok.

%% @doc Discard negative readings and round zero-or-positive telemetry values in RawMetrics to whole integers in a single pass.
sanitize_metrics(_RawMetrics) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/hof_transform.erl': `-module(hof_transform).
-export([discount_prices/2, active_sessions/1, sanitize_metrics/1]).

%% @doc Return a list of product tuples with each price reduced by the caller-supplied DiscountPercent using truncating integer division while preserving order.
discount_prices(Products, DiscountPercent) ->
    lists:map(fun({product, Id, Name, Price}) ->
        NewPrice = Price - ((Price * DiscountPercent) div 100),
        {product, Id, Name, NewPrice}
    end, Products).

%% @doc Retain only session tuples in the active state from Sessions while preserving original order.
active_sessions(Sessions) ->
    lists:filter(fun({session, _Id, Status}) ->
        Status =:= active
    end, Sessions).

%% @doc Discard negative readings and round zero-or-positive telemetry values in RawMetrics to whole integers in a single pass.
sanitize_metrics(RawMetrics) ->
    lists:filtermap(fun
        ({Metric, Value}) when Value >= 0 ->
            {true, {Metric, round(Value)}};
        ({_Metric, _Negative}) ->
            false
    end, RawMetrics).`,
    },
    starterCode: `-module(hof_transform).
-export([discount_prices/2, active_sessions/1, sanitize_metrics/1]).

%% @doc Return a list of product tuples with each price reduced by the caller-supplied DiscountPercent using truncating integer division while preserving order.
discount_prices(_Products, _DiscountPercent) ->
    ok.

%% @doc Retain only session tuples in the active state from Sessions while preserving original order.
active_sessions(_Sessions) ->
    ok.

%% @doc Discard negative readings and round zero-or-positive telemetry values in RawMetrics to whole integers in a single pass.
sanitize_metrics(_RawMetrics) ->
    ok.`,
    solutionCode: `-module(hof_transform).
-export([discount_prices/2, active_sessions/1, sanitize_metrics/1]).

%% @doc Return a list of product tuples with each price reduced by the caller-supplied DiscountPercent using truncating integer division while preserving order.
discount_prices(Products, DiscountPercent) ->
    lists:map(fun({product, Id, Name, Price}) ->
        NewPrice = Price - ((Price * DiscountPercent) div 100),
        {product, Id, Name, NewPrice}
    end, Products).

%% @doc Retain only session tuples in the active state from Sessions while preserving original order.
active_sessions(Sessions) ->
    lists:filter(fun({session, _Id, Status}) ->
        Status =:= active
    end, Sessions).

%% @doc Discard negative readings and round zero-or-positive telemetry values in RawMetrics to whole integers in a single pass.
sanitize_metrics(RawMetrics) ->
    lists:filtermap(fun
        ({Metric, Value}) when Value >= 0 ->
            {true, {Metric, round(Value)}};
        ({_Metric, _Negative}) ->
            false
    end, RawMetrics).`,
  },

  // ── Lesson 3.3: Boolean Predicates & Partitioning ─────────────────────────
  {
    id: 'ch03-l03',
    chapterNumber: 3,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Boolean Predicates & Single-Pass Partitioning (lists:all/2, lists:any/2, lists:partition/2)',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

Before committing high-impact operations—such as initiating a multi-node cluster failover, dispatching batched background jobs, or applying configuration changes—production BEAM systems verify global invariants across collections:
- *Are all dependent worker processes responding and healthy?*
- *Has any node recorded an out-of-memory or high-severity alarm?*
- *Can we bifurcate incoming workloads into standard versus priority queues without multiple expensive scans?*

In imperative languages, evaluating these conditions requires manual loops with mutable boolean flags (\`bool allValid = true; for (...) { if (!cond) { allValid = false; break; } }\`).

In Erlang, the standard library provides optimized, short-circuiting boolean predicates (\`lists:all/2\`, \`lists:any/2\`) and a single-pass partitioner (\`lists:partition/2\`).

## Deep Concept Breakdown & Under the Hood

### 1. Universal Invariants with \`lists:all/2\`

\`lists:all(Pred, List) -> boolean()\` checks whether **every single element** in \`List\` satisfies the predicate function \`Pred\`:

\`\`\`erlang
AllPositive = lists:all(fun(X) -> X > 0 end, [10, 20, 30]).  %% => true
HasZero     = lists:all(fun(X) -> X > 0 end, [10, 0, 30]).   %% => false
\`\`\`

**Short-Circuit Optimization:**
\`lists:all/2\` evaluates elements lazily from head to tail. The instant \`Pred(Elem)\` returns \`false\`, traversal terminates immediately without evaluating the remainder of the list. On large collections, this short-circuit behavior avoids unnecessary CPU consumption and memory allocations.

> [!important] Vacuous Truth on Empty Collections
> In formal predicate logic, universal quantification over an empty set evaluates to \`true\`.
> Consequently, \`lists:all(Pred, [])\` **always returns \`true\`** regardless of what \`Pred\` does. Because no element exists to violate the rule, the condition holds vacuously.

### 2. Existential Invariants with \`lists:any/2\`

\`lists:any(Pred, List) -> boolean()\` verifies whether **at least one element** satisfies \`Pred\`:

\`\`\`erlang
HasNegative = lists:any(fun(X) -> X < 0 end, [15, -3, 42]).  %% => true
AllClean    = lists:any(fun(X) -> X < 0 end, [15, 20, 42]).  %% => false
\`\`\`

Like \`lists:all/2\`, \`lists:any/2\` short-circuits: the moment any element yields \`true\`, evaluation halts immediately and returns \`true\`.
For an empty collection \`[]\`, \`lists:any(Pred, [])\` **always returns \`false\`** because no matching element can be found.

### 3. Single-Pass Partitioning with \`lists:partition/2\`

When processing batches, you frequently need to divide items into two mutually exclusive sets—such as valid vs. invalid payloads or lightweight vs. heavy workloads.

A naive approach runs two separate \`lists:filter/2\` passes with inverted predicates, traversing the list twice. \`lists:partition/2\` performs this segregation in a **single pass** using dual internal accumulators:

\`\`\`erlang
lists:partition(Pred, List) -> {Satisfying, NonSatisfying}
\`\`\`

\`\`\`erlang
Packets = [{pkt, 1, 64}, {pkt, 2, 1500}, {pkt, 3, 128}],
{Jumbo, Standard} = lists:partition(fun({pkt, _, Bytes}) -> Bytes > 1000 end, Packets).
%% Jumbo    => [{pkt, 2, 1500}]
%% Standard => [{pkt, 1, 64}, {pkt, 3, 128}]
\`\`\`

Both resulting lists preserve the relative ordering of the original collection while scanning each element exactly once.

## Parallel Worked Example

Consider a freight dispatch system checking fleet readiness (combining universal and existential checks) and separating manifest items requiring hazmat handling:

\`\`\`erlang
-module(freight_manifest).
-export([dispatch_cleared/2, split_hazmat_parcels/1]).

%% ── Phase 1: Combined Universal & Existential Invariants (lists:all/2 + lists:any/2) ──
%% Fleet clears only if every truck passed inspection and no route carries an active block.
dispatch_cleared(Trucks, Routes) ->
    AllInspected = lists:all(fun({truck, _Plate, Inspected}) ->
        Inspected =:= true
    end, Trucks),
    AnyBlocked = lists:any(fun({route, _Code, HazardState}) ->
        HazardState =:= blocked
    end, Routes),
    AllInspected andalso (not AnyBlocked).

%% ── Phase 2: Single-Pass Class Partitioning (lists:partition/2) ──────────────────────
%% Segregates parcels matching hazmat/cold_chain handling rules in one traversal.
split_hazmat_parcels(Parcels) ->
    lists:partition(fun({parcel, _TrackId, Class}) ->
        Class =:= hazmat orelse Class =:= cold_chain
    end, Parcels).
\`\`\`

How the BEAM executes these collection helpers:
- **Phase 1 (\`dispatch_cleared/2\`)**: \`lists:all/2\` stops on the first non-inspected truck (returning \`true\` vacuously if \`Trucks\` is \`[]\`), and \`lists:any/2\` stops on the first \`blocked\` route (returning \`false\` if \`Routes\` is \`[]\`).
- **Phase 2 (\`split_hazmat_parcels/1\`)**: Evaluates the predicate once per parcel, routing matches to the left bucket and non-matches to the right bucket while preserving original relative order in both output lists.

## Official Erlang Docs & Function Reference

\`\`\`erlang
lists:all(Pred, List) -> boolean()
lists:any(Pred, List) -> boolean()
lists:partition(Pred, List) -> {Satisfying, NotSatisfying}
\`\`\`

> How to read these signatures: \`Pred\` returns strictly \`true\` or \`false\`. \`all/2\` and \`any/2\` return a single \`boolean()\` with short-circuit termination, whereas \`partition/2\` traverses the full list once and returns a 2-tuple of lists in original relative order. Open the attached **Reference Cards** for \`lists:all/2\` and \`lists:partition/2\` documentation.

## Assignment Specification

Implement three collection validation and segregation functions in \`src/hof_predicates.erl\`:

### 1. \`all_in_stock(Inventory)\`
- **Input**: \`Inventory\` — A list of zero or more 5-element \`product\` tuples (carrying \`Id\`, \`Name\`, \`Price\`, and integer \`Stock\`).
- **Behavior**: Evaluate all entries universally to determine whether every product has strictly positive stock (greater than zero). Return false if any product has zero or negative stock, and return true when \`Inventory\` is empty.
- **Examples**:
  - \`hof_predicates:all_in_stock([{product, 1, "A", 10, 5}, {product, 2, "B", 20, 1}])\` returns \`true\`.
  - \`hof_predicates:all_in_stock([{product, 1, "A", 10, 5}, {product, 2, "B", 20, 0}])\` returns \`false\`.
  - \`hof_predicates:all_in_stock([])\` returns \`true\`.

### 2. \`has_critical_error(Logs)\`
- **Input**: \`Logs\` — A list of zero or more 3-element \`log\` tuples (carrying severity atom \`Level\` and string \`Message\`).
- **Behavior**: Check existentially whether at least one entry records severity equal to the atom \`critical\`. Return false if no entry matches or when \`Logs\` is empty.
- **Examples**:
  - \`hof_predicates:has_critical_error([{log, info, "boot"}, {log, critical, "disk full"}])\` returns \`true\`.
  - \`hof_predicates:has_critical_error([{log, info, "boot"}, {log, warn, "high load"}])\` returns \`false\`.
  - \`hof_predicates:has_critical_error([])\` returns \`false\`.

### 3. \`split_orders_by_stock(Orders, MaxSingleOrderQty)\`
- **Input**:
  - \`Orders\` — A list of zero or more 3-element \`order\` tuples (carrying \`Id\` and integer \`Quantity\`).
  - \`MaxSingleOrderQty\` — An integer upper bound for standard single orders.
- **Behavior**: Divide \`Orders\` in a single traversal into a 2-tuple pairing standard orders first and bulk orders second:
  - Standard orders contain entries whose requested \`Quantity\` is strictly positive and does not exceed \`MaxSingleOrderQty\` (inclusive).
  - Bulk orders contain all remaining entries (both quantities strictly above \`MaxSingleOrderQty\` and zero or negative quantities).
  - Both output lists preserve original relative element order.
- **Examples**:
  - \`hof_predicates:split_orders_by_stock([{order, 1, 5}, {order, 2, 20}, {order, 3, 2}], 10)\` returns \`{[{order, 1, 5}, {order, 3, 2}], [{order, 2, 20}]}\`.

## Rules & Verification Constraints

- \`bf_ast_verifier\` enforces required remote calls to \`lists:all/2\`, \`lists:any/2\`, and \`lists:partition/2\`, and forbids list comprehensions (\`[Expr || ...]\`), maps (\`#{}\`), and bit-syntax binaries (\`<<...>>\`).
- Use tuples, atoms, strings, integers, booleans, and lists only.`,
    otpDocCards: [
      {
        functionName: 'lists:all/2',
        module: 'lists',
        signature: 'all(Pred, List) -> boolean()',
        typesSpec: ['Pred = fun((T) -> boolean())', 'List = [T]', 'Returns boolean()'],
        description: 'Returns true if Pred returns true for all elements in List. Short-circuits on first false. Returns true for [].',
        complexityNote: 'O(N) worst-case time, short-circuit O(1) best-case.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#all/2',
      },
      {
        functionName: 'lists:partition/2',
        module: 'lists',
        signature: 'partition(Pred, List) -> {Satisfying, NotSatisfying}',
        typesSpec: ['Pred = fun((T) -> boolean())', 'List = [T]', 'Returns {[T], [T]}'],
        description: 'Partitions List into two lists based on whether Pred evaluates to true or false in a single pass.',
        complexityNote: 'Single-pass O(N) tail-recursive dual accumulation.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#partition/2',
      },
    ],
    mentalModelCheck: {
      question: 'What is the return value of lists:all(fun(X) -> X > 10 end, []) and why?',
      options: [
        {
          id: 'A',
          label: 'true, because of the mathematical principle of vacuous truth: no element exists that violates the predicate',
          isCorrect: true,
          explanation: 'In formal predicate calculus, the universal quantification over an empty set evaluates to true.',
        },
        {
          id: 'B',
          label: 'false, because there are no elements to satisfy the condition',
          isCorrect: false,
          explanation: 'lists:any returns false on empty lists; lists:all returns true.',
        },
        {
          id: 'C',
          label: 'It raises a badarg exception because empty lists are invalid inputs for predicates',
          isCorrect: false,
          explanation: 'Empty lists are standard valid inputs for all collection predicates in stdlib.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch03-03-a',
        title: 'Check All In Stock - Positive',
        erlangCall: 'hof_predicates:all_in_stock([{product, 1, "A", 10, 5}, {product, 2, "B", 20, 1}])',
        expectedOutput: 'true',
        explanation: 'Both products have Stock > 0.',
      },
      {
        id: 'tc-ch03-03-b',
        title: 'Check All In Stock - Out of Stock Detected',
        erlangCall: 'hof_predicates:all_in_stock([{product, 1, "A", 10, 5}, {product, 2, "B", 20, 0}])',
        expectedOutput: 'false',
        explanation: 'Product 2 has Stock = 0, causing lists:all to short-circuit and return false.',
      },
      {
        id: 'tc-ch03-03-c',
        title: 'Detect Critical Error in Logs',
        erlangCall: 'hof_predicates:has_critical_error([{log, info, "boot"}, {log, critical, "disk full"}, {log, warn, "high mem"}])',
        expectedOutput: 'true',
        explanation: 'Finds log with level critical.',
      },
      {
        id: 'tc-ch03-03-d',
        title: 'Split Orders into Standard and Bulk',
        erlangCall: 'hof_predicates:split_orders_by_stock([{order, 1, 5}, {order, 2, 20}, {order, 3, 2}], 10)',
        expectedOutput: '{[{order, 1, 5}, {order, 3, 2}], [{order, 2, 20}]}',
        explanation: 'Partitions into Standard (Qty <= 10) and Bulk (Qty > 10).',
      },
    ],
    astRules: {
      requiredCalls: ['lists:all/2', 'lists:any/2', 'lists:partition/2'],
      forbiddenConstructs: ['list_comprehension', 'map_syntax', 'bit_syntax'],
    },
    solutionExplanation: 'Implements collection validation using lists:all/2 and lists:any/2 with short-circuiting, and single-pass order splitting via lists:partition/2.',
    files: [
      {
        name: 'hof_predicates.erl',
        path: 'src/hof_predicates.erl',
        content: `-module(hof_predicates).
-export([all_in_stock/1, has_critical_error/1, split_orders_by_stock/2]).

%% @doc Return true if every product tuple in Inventory has strictly positive stock (and true for an empty inventory), or false if any item is zero or negative.
all_in_stock(_Inventory) ->
    ok.

%% @doc Return true if any log entry in Logs carries a critical severity atom, returning false otherwise or on an empty list.
has_critical_error(_Logs) ->
    ok.

%% @doc Partition Orders in a single relative-order-preserving pass into a pair separating positive quantities up to the caller-supplied MaxSingleOrderQty limit from all remaining orders.
split_orders_by_stock(_Orders, _MaxSingleOrderQty) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/hof_predicates.erl': `-module(hof_predicates).
-export([all_in_stock/1, has_critical_error/1, split_orders_by_stock/2]).

%% @doc Return true if every product tuple in Inventory has strictly positive stock (and true for an empty inventory), or false if any item is zero or negative.
all_in_stock(Inventory) ->
    lists:all(fun({product, _Id, _Name, _Price, Stock}) ->
        Stock > 0
    end, Inventory).

%% @doc Return true if any log entry in Logs carries a critical severity atom, returning false otherwise or on an empty list.
has_critical_error(Logs) ->
    lists:any(fun({log, Level, _Msg}) ->
        Level =:= critical
    end, Logs).

%% @doc Partition Orders in a single relative-order-preserving pass into a pair separating positive quantities up to the caller-supplied MaxSingleOrderQty limit from all remaining orders.
split_orders_by_stock(Orders, MaxSingleOrderQty) ->
    lists:partition(fun({order, _Id, Qty}) ->
        Qty > 0 andalso Qty =< MaxSingleOrderQty
    end, Orders).`,
    },
    starterCode: `-module(hof_predicates).
-export([all_in_stock/1, has_critical_error/1, split_orders_by_stock/2]).

%% @doc Return true if every product tuple in Inventory has strictly positive stock (and true for an empty inventory), or false if any item is zero or negative.
all_in_stock(_Inventory) ->
    ok.

%% @doc Return true if any log entry in Logs carries a critical severity atom, returning false otherwise or on an empty list.
has_critical_error(_Logs) ->
    ok.

%% @doc Partition Orders in a single relative-order-preserving pass into a pair separating positive quantities up to the caller-supplied MaxSingleOrderQty limit from all remaining orders.
split_orders_by_stock(_Orders, _MaxSingleOrderQty) ->
    ok.`,
    solutionCode: `-module(hof_predicates).
-export([all_in_stock/1, has_critical_error/1, split_orders_by_stock/2]).

%% @doc Return true if every product tuple in Inventory has strictly positive stock (and true for an empty inventory), or false if any item is zero or negative.
all_in_stock(Inventory) ->
    lists:all(fun({product, _Id, _Name, _Price, Stock}) ->
        Stock > 0
    end, Inventory).

%% @doc Return true if any log entry in Logs carries a critical severity atom, returning false otherwise or on an empty list.
has_critical_error(Logs) ->
    lists:any(fun({log, Level, _Msg}) ->
        Level =:= critical
    end, Logs).

%% @doc Partition Orders in a single relative-order-preserving pass into a pair separating positive quantities up to the caller-supplied MaxSingleOrderQty limit from all remaining orders.
split_orders_by_stock(Orders, MaxSingleOrderQty) ->
    lists:partition(fun({order, _Id, Qty}) ->
        Qty > 0 andalso Qty =< MaxSingleOrderQty
    end, Orders).`,
  },

  // ── Lesson 3.4: Folding & State Aggregation ──────────────────────────────
  {
    id: 'ch03-l04',
    chapterNumber: 3,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'Folding & State Aggregation (lists:foldl/3 vs. lists:foldr/3)',
    difficulty: 'Intermediate',
    xpReward: 100,
    visualScene: 'tco_vs_body_stack',
    conceptMarkdown: `## Why This Matters in Production

In Chapter 2, you learned that calculating totals, tracking statistical boundaries, and computing balances requires iterating over collections while passing an updated accumulator to the next recursive call.

While \`lists:map/2\` produces a list of identical length and \`lists:filter/2\` yields a filtered subset, **\`lists:foldl/3\`** (*fold left*) is functional programming's universal reduction operator. It can reduce any collection into a single accumulated value: an aggregate sum, a multi-dimensional telemetry summary, or an entirely new data structure.

In fact, almost all collection operations—including \`map\`, \`filter\`, \`partition\`, and \`reverse\`—can be implemented directly on top of \`foldl\`!

## Deep Concept Breakdown & Under the Hood

### 1. Anatomy of \`lists:foldl/3\`

Here is the exact definition of \`lists:foldl/3\` from the Erlang/OTP standard library source code:

\`\`\`erlang
foldl(F, Accu, [Hd | Tail]) ->
    foldl(F, F(Hd, Accu), Tail);
foldl(F, Accu, []) when is_function(F, 2) ->
    Accu.
\`\`\`

Notice that \`foldl/3\` is **strictly tail-recursive**! The recursive step \`foldl(F, F(Hd, Accu), Tail)\` resides in the tail position, allowing the BEAM compiler to emit the \`call_last\` opcode, reusing the current stack frame and executing in **$O(1)$ constant stack space**.

### 2. CRITICAL TRAP — The Callback Argument Order!

In JavaScript (\`Array.reduce((acc, elem) => ...)\`) and Python (\`functools.reduce(fun, seq)\`), the accumulator is passed as the first parameter.

In Erlang \`lists:foldl/3\`, **the Element is FIRST and the Accumulator is SECOND**:

\`\`\`erlang
lists:foldl(fun(Elem, AccIn) -> AccOut end, InitialAcc, List)
\`\`\`

> [!warning] Common Beginner Syntax Trap: Inverted foldl Arguments
> If you write \`fun(Acc, Elem) -> Acc + Elem end\`, your code will fail with arithmetic exceptions the moment you aggregate complex data structures like tuples or lists!
> Always remember: **\`fun(Elem, Acc) -> ... end\`**.

### 3. Multi-Value Tuple Accumulators

Your accumulator does not need to be a scalar number. In production telecom, telemetry, and transactional systems, you frequently aggregate multiple running metrics inside a **Tagged Tuple Accumulator**:

\`\`\`erlang
MatchEvents = [{scored, 10}, {penalized, 4}, {scored, 25}],
InitialAcc = {0, 0, 0},  %% {TotalScored, TotalPenalties, EventCount}

{TotalScored, TotalPenalties, EventCount} = lists:foldl(fun
    ({scored, Points}, {ScoreAcc, PenAcc, CountAcc}) ->
        {ScoreAcc + Points, PenAcc, CountAcc + 1};
    ({penalized, Points}, {ScoreAcc, PenAcc, CountAcc}) ->
        {ScoreAcc, PenAcc + Points, CountAcc + 1}
end, InitialAcc, MatchEvents).
%% => {35, 4, 3}
\`\`\`

### 4. \`lists:foldl/3\` (Tail-Recursive) vs. \`lists:foldr/3\` (Body-Recursive)

- **\`lists:foldl/3\`** processes elements from left-to-right (\`Head\` to \`Tail\`). It updates the accumulator eagerly and runs in **$O(1)$ stack space**.
- **\`lists:foldr/3\`** processes elements from right-to-left (\`Tail\` to \`Head\`). To reach the rightmost element first, \`foldr\` pushes $N$ activation frames onto the call stack before evaluating the first callback! On a list of 1,000,000 elements, \`lists:foldr/3\` will crash your BEAM process with an out-of-memory stack exhaustion error, whereas \`lists:foldl/3\` executes smoothly with zero memory expansion.

99% of production Erlang code strictly uses \`lists:foldl/3\`.

## Parallel Worked Example

Consider a network telemetry collector counting threshold breaches alongside a rolling index annotator. Notice how \`lists:foldl/3\` threads multi-field state or builds an indexed list in a single stackless pass:

\`\`\`erlang
-module(telemetry_digest).
-export([count_thresholds/2, annotate_events/1]).

%% ── Phase 1: Multi-Counter Tuple Reduction (lists:foldl/3) ─────────────────
%% Tracks how many numeric readings stay below vs. reach/exceed Ceiling.
count_thresholds(Readings, Ceiling) ->
    lists:foldl(fun
        (Val, {BelowAcc, BreachAcc}) when Val < Ceiling ->
            {BelowAcc + 1, BreachAcc};
        (_Val, {BelowAcc, BreachAcc}) ->
            {BelowAcc, BreachAcc + 1}
    end, {0, 0}, Readings).

%% ── Phase 2: Sequential Accumulator State + LIFO Prepending ────────────────
%% Labels incoming atoms with 1-based positions, storing newest-first in Acc.
annotate_events(Tags) ->
    {_FinalSeq, IndexedRev} = lists:foldl(fun(Tag, {Seq, Acc}) ->
        {Seq + 1, [{Seq, Tag} | Acc]}
    end, {1, []}, Tags),
    IndexedRev.
\`\`\`

How the BEAM executes both folds:
- **Phase 1 (\`count_thresholds/2\`)**: Passes each element first and the running 2-tuple \`{BelowAcc, BreachAcc}\` second into \`fun/2\`; because \`lists:foldl/3\` recurses in tail position, counting arbitrarily long streams uses $O(1)$ stack frames.
- **Phase 2 (\`annotate_events/1\`)**: Bundles both the sequence counter and a growing list inside \`{Seq, Acc}\`, demonstrating why prepending with \`[Item | Acc]\` inside \`foldl\` naturally yields elements in reversed arrival order unless explicitly reversed afterward.

## Official Erlang Docs & Function Reference

\`\`\`erlang
lists:foldl(Fun, Acc0, List) -> Acc1
  types: Fun = fun((Elem :: term(), AccIn :: term()) -> AccOut :: term())
\`\`\`

> How to read this signature: Notice the parameter ordering in \`Fun\` — \`Elem\` comes **first** and \`AccIn\` comes **second**, returning the updated accumulator \`AccOut\` for the next iteration (or \`Acc0\` immediately if \`List\` is \`[]\`). Open the attached **Reference Cards** for full \`lists:foldl/3\` documentation.

## Assignment Specification

Implement three folding aggregators in \`src/hof_fold.erl\`:

### 1. \`sum_ledger(Entries)\`
- **Input**: \`Entries\` — A list of zero or more 3-element \`entry\` tuples (carrying an integer amount and a direction atom, either \`credit\` or \`debit\`).
- **Behavior**: Traverse \`Entries\` once from left to right using \`lists:foldl/3\` while tracking running totals for credits, debits, and net balance (credits add to total credits and net balance; debits add to total debits and subtract from net balance). Return a 4-element \`ledger_summary\` tuple containing total credits, total debits, and net balance (all zeros when \`Entries\` is empty).
- **Examples**:
  - \`hof_fold:sum_ledger([{entry, 100, credit}, {entry, 40, debit}, {entry, 50, credit}])\` returns \`{ledger_summary, 150, 40, 110}\`.
  - \`hof_fold:sum_ledger([])\` returns \`{ledger_summary, 0, 0, 0}\`.

### 2. \`min_max_latency(Latencies)\`
- **Input**: \`Latencies\` — A non-empty list of integer latency measurements (may include zero or negative values).
- **Behavior**: Find the smallest and largest latency values in a single left-to-right fold over the list without assuming all numbers are positive or using built-in min/max list helpers. Seed the running bounds from the initial list element so negative-only lists work accurately, returning a 2-tuple pairing minimum latency first and maximum latency second.
- **Examples**:
  - \`hof_fold:min_max_latency([45, 12, 88, 30, 95, 20])\` returns \`{12, 95}\`.
  - \`hof_fold:min_max_latency([-50, -10, -90, -5])\` returns \`{-90, -5}\`.

### 3. \`reverse_with_fold(List)\`
- **Input**: \`List\` — A list of zero or more arbitrary Erlang terms.
- **Behavior**: Reverse the order of \`List\` in linear time and constant stack space using \`lists:foldl/3\` without calling \`lists:reverse/1\` or \`lists:foldr/3\`.
- **Examples**:
  - \`hof_fold:reverse_with_fold([alpha, beta, gamma])\` returns \`[gamma, beta, alpha]\`.
  - \`hof_fold:reverse_with_fold([])\` returns \`[]\`.

## Rules & Verification Constraints

- \`bf_ast_verifier\` enforces \`lists:foldl/3\` in all three functions, and forbids \`lists:foldr/3\`, \`lists:reverse/1\`, \`lists:min/1\`, \`lists:max/1\`, list comprehensions (\`[Expr || ...]\`), maps (\`#{}\`), and bit-syntax binaries (\`<<...>>\`).
- Tuples, lists, atoms, and numbers only.`,
    otpDocCards: [
      {
        functionName: 'lists:foldl/3',
        module: 'lists',
        signature: 'foldl(Fun, Acc0, List) -> Acc1',
        typesSpec: ['Fun = fun((Elem, AccIn) -> AccOut)', 'Acc0 = term()', 'List = [term()]'],
        description: 'Calls Fun(Elem, AccIn) on successive elements of List, left to right. Strictly tail-recursive.',
        complexityNote: 'O(N) time, O(1) stack memory.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#foldl/3',
      },
    ],
    mentalModelCheck: {
      question: 'Why does lists:foldl(fun(X, Acc) -> [X * 10 | Acc] end, [], [1, 2, 3]) return [30, 20, 10] instead of [10, 20, 30]?',
      options: [
        {
          id: 'A',
          label: 'Because foldl visits elements from left to right, prepending each transformed value onto the head of the accumulator list (LIFO stack behavior)',
          isCorrect: true,
          explanation: '10 is prepended -> [10]; then 20 is prepended -> [20, 10]; then 30 is prepended -> [30, 20, 10].',
        },
        {
          id: 'B',
          label: 'Because the BEAM VM reverses lists internally before evaluating foldl',
          isCorrect: false,
          explanation: 'foldl processes the input list in its original forward order; prepending to the head of a singly linked list is what reverses the order.',
        },
        {
          id: 'C',
          label: 'Because foldl is body-recursive and unwinds the stack backwards',
          isCorrect: false,
          explanation: 'foldl is strictly tail-recursive, not body-recursive.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch03-04-a',
        title: 'Calculate Ledger Summary with Multi-Value Accumulator',
        erlangCall: 'hof_fold:sum_ledger([{entry, 100, credit}, {entry, 40, debit}, {entry, 50, credit}])',
        expectedOutput: '{ledger_summary, 150, 40, 110}',
        explanation: 'TotalCredit = 150, TotalDebit = 40, NetBalance = 150 - 40 = 110.',
      },
      {
        id: 'tc-ch03-04-b',
        title: 'Find Min and Max Latencies in Stream',
        erlangCall: 'hof_fold:min_max_latency([45, 12, 88, 30, 95, 20])',
        expectedOutput: '{12, 95}',
        explanation: 'Lowest latency is 12 ms, peak latency is 95 ms.',
      },
      {
        id: 'tc-ch03-04-c',
        title: 'Reverse List Using foldl',
        erlangCall: 'hof_fold:reverse_with_fold([alpha, beta, gamma])',
        expectedOutput: '[gamma, beta, alpha]',
        explanation: 'Prepends elements in order: alpha, then beta, then gamma.',
      },
    ],
    astRules: {
      requiredCalls: ['lists:foldl/3'],
      forbiddenCalls: ['lists:foldr', 'lists:reverse', 'lists:min', 'lists:max'],
      forbiddenConstructs: ['list_comprehension', 'map_syntax', 'bit_syntax'],
    },
    solutionExplanation: 'Demonstrates tail-recursive state aggregation using lists:foldl/3 with multi-accumulator tuples, head-seeded numeric bounds, and O(N) list inversion.',
    files: [
      {
        name: 'hof_fold.erl',
        path: 'src/hof_fold.erl',
        content: `-module(hof_fold).
-export([sum_ledger/1, min_max_latency/1, reverse_with_fold/1]).

%% @doc Aggregate credit, debit, and net balance totals from Entries in one left fold, returning a zeroed ledger summary tuple on empty input.
sum_ledger(_Entries) ->
    ok.

%% @doc Return a pair containing the minimum and maximum integer values in the non-empty Latencies list using a left fold.
min_max_latency(_Latencies) ->
    ok.

%% @doc Reverse element order of List in linear time via a left fold without calling standard library reversal helpers.
reverse_with_fold(_List) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/hof_fold.erl': `-module(hof_fold).
-export([sum_ledger/1, min_max_latency/1, reverse_with_fold/1]).

%% @doc Aggregate credit, debit, and net balance totals from Entries in one left fold, returning a zeroed ledger summary tuple on empty input.
sum_ledger(Entries) ->
    {TotalCred, TotalDeb, Net} = lists:foldl(fun
        ({entry, Amount, credit}, {CredAcc, DebAcc, NetAcc}) ->
            {CredAcc + Amount, DebAcc, NetAcc + Amount};
        ({entry, Amount, debit}, {CredAcc, DebAcc, NetAcc}) ->
            {CredAcc, DebAcc + Amount, NetAcc - Amount}
    end, {0, 0, 0}, Entries),
    {ledger_summary, TotalCred, TotalDeb, Net}.

%% @doc Return a pair containing the minimum and maximum integer values in the non-empty Latencies list using a left fold.
min_max_latency([First | Rest]) ->
    lists:foldl(fun(Ms, {MinSoFar, MaxSoFar}) ->
        NewMin = case Ms < MinSoFar of true -> Ms; false -> MinSoFar end,
        NewMax = case Ms > MaxSoFar of true -> Ms; false -> MaxSoFar end,
        {NewMin, NewMax}
    end, {First, First}, Rest).

%% @doc Reverse element order of List in linear time via a left fold without calling standard library reversal helpers.
reverse_with_fold(List) ->
    lists:foldl(fun(Elem, Acc) -> [Elem | Acc] end, [], List).`,
    },
    starterCode: `-module(hof_fold).
-export([sum_ledger/1, min_max_latency/1, reverse_with_fold/1]).

%% @doc Aggregate credit, debit, and net balance totals from Entries in one left fold, returning a zeroed ledger summary tuple on empty input.
sum_ledger(_Entries) ->
    ok.

%% @doc Return a pair containing the minimum and maximum integer values in the non-empty Latencies list using a left fold.
min_max_latency(_Latencies) ->
    ok.

%% @doc Reverse element order of List in linear time via a left fold without calling standard library reversal helpers.
reverse_with_fold(_List) ->
    ok.`,
    solutionCode: `-module(hof_fold).
-export([sum_ledger/1, min_max_latency/1, reverse_with_fold/1]).

%% @doc Aggregate credit, debit, and net balance totals from Entries in one left fold, returning a zeroed ledger summary tuple on empty input.
sum_ledger(Entries) ->
    {TotalCred, TotalDeb, Net} = lists:foldl(fun
        ({entry, Amount, credit}, {CredAcc, DebAcc, NetAcc}) ->
            {CredAcc + Amount, DebAcc, NetAcc + Amount};
        ({entry, Amount, debit}, {CredAcc, DebAcc, NetAcc}) ->
            {CredAcc, DebAcc + Amount, NetAcc - Amount}
    end, {0, 0, 0}, Entries),
    {ledger_summary, TotalCred, TotalDeb, Net}.

%% @doc Return a pair containing the minimum and maximum integer values in the non-empty Latencies list using a left fold.
min_max_latency([First | Rest]) ->
    lists:foldl(fun(Ms, {MinSoFar, MaxSoFar}) ->
        NewMin = case Ms < MinSoFar of true -> Ms; false -> MinSoFar end,
        NewMax = case Ms > MaxSoFar of true -> Ms; false -> MaxSoFar end,
        {NewMin, NewMax}
    end, {First, First}, Rest).

%% @doc Reverse element order of List in linear time via a left fold without calling standard library reversal helpers.
reverse_with_fold(List) ->
    lists:foldl(fun(Elem, Acc) -> [Elem | Acc] end, [], List).`,
  },

  // ── Lesson 3.5: Keyed Tuple Lists & Proplists ─────────────────────────────
  {
    id: 'ch03-l05',
    chapterNumber: 3,
    lessonNumber: 5,
    lessonType: 'concept_exercise',
    title: 'Keyed Tuple Lists (lists:keyfind/3, keystore/4) & proplists',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In Chapter 2, you wrote recursive loops to locate and update structured tuples within lists.

Because collections of structured tuples are so ubiquitous across BEAM architectures, the Erlang Run-Time System (ERTS) implements built-in functions (BIFs) written directly in **C** specifically for list-of-tuple operations. These BIFs execute at native C speeds without incurring BEAM bytecode dispatch overhead.

Furthermore, virtually every OTP subsystem—including \`gen_tcp:listen/2\` network sockets, supervisor child specs, TLS connection parameters, and database drivers—accepts configuration options as **Property Lists (\`proplists\`)**. Mastering both primitives is required for idiomatic OTP systems programming.

## Deep Concept Breakdown & Under the Hood

### 1. Keyed Tuple Functions (\`lists:keyfind\`, \`lists:keystore\`)

A "Keyed List" (or keylist) is a list of tuples where one specific element position serves as the primary lookup key.

In Erlang, element positions inside tuples are **1-indexed**:
For a tuple \`{emp, Id, Name, Role}\`, Position 1 is the tag \`emp\`, Position 2 is \`Id\`, Position 3 is \`Name\`, etc.

#### \`lists:keyfind(Key, N, TupleList) -> Tuple | false\`
Searches \`TupleList\` via native C execution for the first tuple whose \`N\`-th element equals \`Key\`:

\`\`\`erlang
Employees = [{emp, 401, "Elena", engineering}, {emp, 402, "Marcus", design}],
Found = lists:keyfind(402, 2, Employees).
%% => {emp, 402, "Marcus", design}

Missing = lists:keyfind(999, 2, Employees).
%% => false
\`\`\`

#### \`lists:keystore(Key, N, TupleList, NewTuple) -> UpdatedList\`
If a tuple with \`Key\` at position \`N\` exists in \`TupleList\`, replaces it with \`NewTuple\` in-place. If no match is found, appends \`NewTuple\` to the end of the list:

\`\`\`erlang
Updated = lists:keystore(402, 2, Employees, {emp, 402, "Marcus", product}).
%% Replaces employee 402 in-place while keeping all other records intact!
\`\`\`

### 2. Property Lists (\`proplists\`)

A property list is a flexible list of configuration options where each item is either:
- A 2-tuple \`{Key, Value}\`, OR
- A standalone boolean atom \`Key\` (shorthand notation for \`{Key, true}\`).

Example database pool options list:
\`\`\`erlang
DbOpts = [ssl, {timeout, 5000}, {pool_size, 20}].
\`\`\`

#### \`proplists:get_value(Key, PropList, Default) -> Value\`
Extracts the value associated with \`Key\`. If the option is omitted from \`PropList\`, returns \`Default\`:
\`\`\`erlang
PoolSize = proplists:get_value(pool_size, DbOpts, 10).   %% => 20
Host     = proplists:get_value(host, DbOpts, "localhost"). %% => "localhost" (default)
\`\`\`

#### \`proplists:get_bool(Key, PropList) -> boolean()\`
Returns \`true\` if \`Key\` or \`{Key, true}\` is present in the list; returns \`false\` if \`{Key, false}\` or if \`Key\` is absent entirely:
\`\`\`erlang
UseSsl = proplists:get_bool(ssl, DbOpts).                 %% => true
IsDev  = proplists:get_bool(development, DbOpts).         %% => false
\`\`\`

## Parallel Worked Example

Consider an edge DNS zone registry indexed by zone name (at tuple position 3) alongside a resolver configuration parser using property lists:

\`\`\`erlang
-module(dns_zone_loader).
-export([register_zone/2, parse_resolver_flags/1]).

%% ── Phase 1: Native C Keyed Tuple Manipulation at Arbitrary Tuple Position ──
%% Looks up or updates {zone, Region, ZoneName, PrimaryIp} keyed at 1-based position 3.
register_zone(Zones, {zone, _Region, ZoneName, _Ip} = NewZone) ->
    Existed = case lists:keyfind(ZoneName, 3, Zones) of
        false -> false;
        _ExistingTuple -> true
    end,
    UpdatedZones = lists:keystore(ZoneName, 3, Zones, NewZone),
    {Existed, UpdatedZones}.

%% ── Phase 2: Flexible Option Extraction via proplists ───────────────────────
%% Supports bare flag atoms (such as recursive) alongside key-value pairs.
parse_resolver_flags(Flags) ->
    TtlSeconds = proplists:get_value(ttl, Flags, 300),
    UseRecursive = proplists:get_bool(recursive, Flags),
    {resolver_plan, TtlSeconds, UseRecursive}.
\`\`\`

How the BEAM executes these two stdlib modules:
- **Phase 1 (\`register_zone/2\`)**: Passes 1-based position \`3\` (the \`ZoneName\` field after \`zone\` at 1 and \`Region\` at 2) to the ERTS C BIFs \`lists:keyfind/3\` and \`lists:keystore/4\`; \`keystore/4\` replaces the matching tuple in-place when present or appends it at the tail when missing.
- **Phase 2 (\`parse_resolver_flags/1\`)**: \`proplists:get_bool/2\` treats a bare atom \`recursive\` identically to \`{recursive, true}\` and handles \`{recursive, false}\` accurately, whereas \`proplists:get_value/3\` returns caller values or defaults in one pass.

## Official Erlang Docs & Function Reference

\`\`\`erlang
lists:keyfind(Key, Pos, List) -> Tuple | false
lists:keystore(Key, Pos, List, NewTuple) -> [Tuple]
proplists:get_value(Key, List, Default) -> term()
proplists:get_bool(Key, List) -> boolean()
\`\`\`

> How to read these signatures: \`Pos\` is strictly 1-based (\`pos_integer() >= 1\`) counting from the tuple tag atom at position \`1\`, while \`proplists\` helpers normalize mixed option lists containing both bare flag atoms and 2-tuples. Open the attached **Reference Cards** for \`lists:keyfind/3\` and \`proplists:get_value/3\` documentation.

## Assignment Specification

Implement three keylist and proplist functions in \`src/keylist_config.erl\`:

### 1. \`find_product_by_id(Inventory, ProductId)\`
- **Input**:
  - \`Inventory\` — A list of zero or more 5-element \`product\` tuples (carrying \`Id\`, \`Name\`, \`Price\`, and \`Stock\`).
  - \`ProductId\` — An integer primary key to match against each product's identifier field.
- **Behavior**: Search \`Inventory\` using C-backed keylist lookup matching \`ProductId\` at the product identifier tuple position (keeping Erlang's 1-based tuple indexing in mind). Wrap a matched tuple in an ok pair, or return a not-found error pair when absent.
- **Examples**:
  - \`keylist_config:find_product_by_id([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 4}], 2)\` returns \`{ok, {product, 2, "Mouse", 25, 4}}\`.
  - \`keylist_config:find_product_by_id([{product, 1, "Keyboard", 50, 10}], 999)\` returns \`{error, not_found}\`.

### 2. \`upsert_product(Inventory, NewProduct)\`
- **Input**:
  - \`Inventory\` — A list of zero or more 5-element \`product\` tuples.
  - \`NewProduct\` — A 5-element \`product\` tuple representing a replacement or newly added catalog entry.
- **Behavior**: Perform an order-preserving keylist upsert: if an existing product shares \`NewProduct\`'s product identifier at key position 2, replace it in-place with \`NewProduct\`; otherwise append \`NewProduct\` to the end of \`Inventory\`. Return the updated list.
- **Examples**:
  - \`keylist_config:upsert_product([{product, 1, "Keyboard", 50, 10}], {product, 1, "Keyboard", 45, 12})\` returns \`[{product, 1, "Keyboard", 45, 12}]\`.

### 3. \`read_socket_options(OptsList)\`
- **Input**: \`OptsList\` — A mixed property list of network socket options containing bare flag atoms and/or key-value pairs.
- **Behavior**: Normalize \`OptsList\` into a 4-element \`socket_cfg\` tuple containing \`Port\`, \`ActiveMode\`, and \`IsBinary\` in that order:
  - \`Port\` resolves from the \`port\` option defaulting to \`8080\`.
  - \`ActiveMode\` resolves from the \`active\` option defaulting to \`false\`.
  - \`IsBinary\` resolves as a boolean flag from the \`binary\` option (supporting bare \`binary\` as true, \`{binary, true}\`, \`{binary, false}\`, or absent as \`false\`).
- **Examples**:
  - \`keylist_config:read_socket_options([binary, {port, 9090}, {active, once}])\` returns \`{socket_cfg, 9090, once, true}\`.
  - \`keylist_config:read_socket_options([])\` returns \`{socket_cfg, 8080, false, false}\`.

## Rules & Verification Constraints

- \`bf_ast_verifier\` enforces required remote calls to \`lists:keyfind/3\`, \`lists:keystore/4\`, \`proplists:get_value/3\`, and \`proplists:get_bool/2\`, and forbids list comprehensions (\`[Expr || ...]\`), maps (\`#{}\`), and bit-syntax binaries (\`<<...>>\`).
- Use tuples, lists, atoms, strings, booleans, and integers only.`,
    otpDocCards: [
      {
        functionName: 'lists:keyfind/3',
        module: 'lists',
        signature: 'keyfind(Key, N, TupleList) -> Tuple | false',
        typesSpec: ['Key = term()', 'N = pos_integer()', 'TupleList = [tuple()]'],
        description: 'Searches the list of tuples for the first tuple whose Nth element matches Key. Implemented as a C BIF in ERTS.',
        complexityNote: 'O(N) linear search, optimized in C.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#keyfind/3',
      },
      {
        functionName: 'proplists:get_value/3',
        module: 'proplists',
        signature: 'get_value(Key, List, Default) -> term()',
        typesSpec: ['Key = term()', 'List = [term()]', 'Default = term()'],
        description: 'Returns the value of a key in a proplist, or Default if missing.',
        complexityNote: 'O(N) search.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/proplists.html#get_value/3',
      },
    ],
    mentalModelCheck: {
      question: 'In the tuple {product, 42, "Laptop", 1200, 5}, what position integer N must be passed to lists:keyfind to match against product ID 42?',
      options: [
        {
          id: 'A',
          label: '2, because Erlang tuple positions are strictly 1-indexed, so position 1 is the atom product and position 2 is 42',
          isCorrect: true,
          explanation: 'In Erlang, element(1, Tuple) is the first element, so ID 42 is at position 2.',
        },
        {
          id: 'B',
          label: '1, because arrays and tuples in computer science are 0-indexed',
          isCorrect: false,
          explanation: 'Erlang tuples are 1-indexed in all BIFs (element/2, setelement/3, lists:keyfind/3).',
        },
        {
          id: 'C',
          label: '0, to specify the key offset relative to the tag',
          isCorrect: false,
          explanation: 'Position must be a positive integer >= 1.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch03-05-a',
        title: 'Find Product By ID in Keylist',
        erlangCall: 'keylist_config:find_product_by_id([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 4}], 2)',
        expectedOutput: '{ok, {product, 2, "Mouse", 25, 4}}',
        explanation: 'Matches key 2 at index 2.',
      },
      {
        id: 'tc-ch03-05-b',
        title: 'Find Product By ID - Missing Product',
        erlangCall: 'keylist_config:find_product_by_id([{product, 1, "Keyboard", 50, 10}], 999)',
        expectedOutput: '{error, not_found}',
        explanation: 'Returns {error, not_found} when keyfind returns false.',
      },
      {
        id: 'tc-ch03-05-c',
        title: 'Upsert Product in Keylist',
        erlangCall: 'keylist_config:upsert_product([{product, 1, "Keyboard", 50, 10}], {product, 1, "Keyboard", 45, 12})',
        expectedOutput: '[{product, 1, "Keyboard", 45, 12}]',
        explanation: 'Replaces product 1 in-place with new price and stock.',
      },
      {
        id: 'tc-ch03-05-d',
        title: 'Read Socket Options Proplist',
        erlangCall: 'keylist_config:read_socket_options([binary, {port, 9090}, {active, once}])',
        expectedOutput: '{socket_cfg, 9090, once, true}',
        explanation: 'Port is 9090, active mode is once, and binary is true.',
      },
    ],
    astRules: {
      requiredCalls: ['lists:keyfind/3', 'lists:keystore/4', 'proplists:get_value/3', 'proplists:get_bool/2'],
      forbiddenConstructs: ['list_comprehension', 'map_syntax', 'bit_syntax'],
    },
    solutionExplanation: 'Demonstrates C BIF keylist search/update with lists:keyfind/3 and lists:keystore/4 alongside proplists option extraction and boolean flag normalization.',
    files: [
      {
        name: 'keylist_config.erl',
        path: 'src/keylist_config.erl',
        content: `-module(keylist_config).
-export([find_product_by_id/2, upsert_product/2, read_socket_options/1]).

%% @doc Search Inventory by ProductId at product identifier position, returning an ok pair wrapping the matching product tuple or a not-found error pair when absent.
find_product_by_id(_Inventory, _ProductId) ->
    ok.

%% @doc Replace an existing product tuple matching NewProduct's identifier in place, or append NewProduct to the end of Inventory when not present.
upsert_product(_Inventory, _NewProduct) ->
    ok.

%% @doc Extract caller-supplied socket configuration options from OptsList (defaulting port to 8080, active mode to false, and binary flag to false) into a normalized socket_cfg tuple.
read_socket_options(_OptsList) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/keylist_config.erl': `-module(keylist_config).
-export([find_product_by_id/2, upsert_product/2, read_socket_options/1]).

%% @doc Search Inventory by ProductId at product identifier position, returning an ok pair wrapping the matching product tuple or a not-found error pair when absent.
find_product_by_id(Inventory, ProductId) ->
    case lists:keyfind(ProductId, 2, Inventory) of
        {product, ProductId, _, _, _} = Prod ->
            {ok, Prod};
        false ->
            {error, not_found}
    end.

%% @doc Replace an existing product tuple matching NewProduct's identifier in place, or append NewProduct to the end of Inventory when not present.
upsert_product(Inventory, {product, ProdId, _, _, _} = NewProduct) ->
    lists:keystore(ProdId, 2, Inventory, NewProduct).

%% @doc Extract caller-supplied socket configuration options from OptsList (defaulting port to 8080, active mode to false, and binary flag to false) into a normalized socket_cfg tuple.
read_socket_options(OptsList) ->
    Port = proplists:get_value(port, OptsList, 8080),
    Active = proplists:get_value(active, OptsList, false),
    IsBinary = proplists:get_bool(binary, OptsList),
    {socket_cfg, Port, Active, IsBinary}.`,
    },
    starterCode: `-module(keylist_config).
-export([find_product_by_id/2, upsert_product/2, read_socket_options/1]).

%% @doc Search Inventory by ProductId at product identifier position, returning an ok pair wrapping the matching product tuple or a not-found error pair when absent.
find_product_by_id(_Inventory, _ProductId) ->
    ok.

%% @doc Replace an existing product tuple matching NewProduct's identifier in place, or append NewProduct to the end of Inventory when not present.
upsert_product(_Inventory, _NewProduct) ->
    ok.

%% @doc Extract caller-supplied socket configuration options from OptsList (defaulting port to 8080, active mode to false, and binary flag to false) into a normalized socket_cfg tuple.
read_socket_options(_OptsList) ->
    ok.`,
    solutionCode: `-module(keylist_config).
-export([find_product_by_id/2, upsert_product/2, read_socket_options/1]).

%% @doc Search Inventory by ProductId at product identifier position, returning an ok pair wrapping the matching product tuple or a not-found error pair when absent.
find_product_by_id(Inventory, ProductId) ->
    case lists:keyfind(ProductId, 2, Inventory) of
        {product, ProductId, _, _, _} = Prod ->
            {ok, Prod};
        false ->
            {error, not_found}
    end.

%% @doc Replace an existing product tuple matching NewProduct's identifier in place, or append NewProduct to the end of Inventory when not present.
upsert_product(Inventory, {product, ProdId, _, _, _} = NewProduct) ->
    lists:keystore(ProdId, 2, Inventory, NewProduct).

%% @doc Extract caller-supplied socket configuration options from OptsList (defaulting port to 8080, active mode to false, and binary flag to false) into a normalized socket_cfg tuple.
read_socket_options(OptsList) ->
    Port = proplists:get_value(port, OptsList, 8080),
    Active = proplists:get_value(active, OptsList, false),
    IsBinary = proplists:get_bool(binary, OptsList),
    {socket_cfg, Port, Active, IsBinary}.`,
  },

  // ── Lesson 3.6: List Comprehensions & Joins ──────────────────────────────
  {
    id: 'ch03-l06',
    chapterNumber: 3,
    lessonNumber: 6,
    lessonType: 'concept_exercise',
    title: 'List Comprehensions ([Expr || Generator, Filter]), Pattern Filtering & Joins',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In database systems (like SQL) and query languages, you routinely express data transformations as declarative queries:
\`SELECT name FROM users WHERE status = 'active'\`.

In Erlang, writing such transformations using \`lists:map/2\` and \`lists:filter/2\` often requires chaining multiple higher-order functions and intermediate allocations.

To provide clean, mathematical, declarative data query ergonomics, Erlang incorporates **List Comprehensions** (derived directly from mathematical set-builder notation: $\{ f(x) \mid x \in S \land p(x) \}$). The BEAM compiler transforms list comprehensions into highly optimized, tail-recursive accumulator loops.

## Deep Concept Breakdown & Under the Hood

### 1. Anatomy of a List Comprehension

A list comprehension is bounded by square brackets \`[\` and \`]\`, with an output expression separated from qualifiers by the double vertical bar \`||\`:

\`\`\`erlang
[ OutputExpression || Qualifier1, Qualifier2, ... ]
\`\`\`

Qualifiers can be either:
- **Generators (\`Pattern <- List\`)**: Extracts and pattern-matches elements from a collection.
- **Filters (Boolean Predicates)**: Conditions that must evaluate to \`true\` for an element to be retained.

\`\`\`erlang
Numbers = [1, 2, 3, 4, 5, 6],
EvenSquares = [X * X || X <- Numbers, X rem 2 =:= 0].
%% => [4, 16, 36]
\`\`\`

### 2. Generator Pattern Matching (The Silent Skip Rule)

Here is a profound operational difference between \`lists:map/2\` and a List Comprehension generator:

If you use \`lists:map/2\` with a single pattern:
\`\`\`erlang
Nodes = [{node, s1, online, 80}, {node, s2, offline, 0}],
%% CRASH! s2 fails to match the online pattern -> function_clause exception!
lists:map(fun({node, Id, online, Load}) -> Id end, Nodes).
\`\`\`

In a List Comprehension, **non-matching elements are silently skipped**:
\`\`\`erlang
OnlineNodeIds = [Id || {node, Id, online, _Load} <- Nodes].
%% => [s1]  -- s2 is silently skipped with ZERO runtime exceptions!
\`\`\`

The generator \`Pattern <- List\` combines extraction, pattern matching, and filtering into a single declarative expression.

### 3. Multiple Generators & Relational Joins

You can include multiple generators in a single comprehension. The rightmost generator advances fastest (mirroring nested loops):

\`\`\`erlang
Bands = [low, high],
Channels = [1, 2],
Frequencies = [{B, C} || B <- Bands, C <- Channels].
%% => [{low, 1}, {low, 2}, {high, 1}, {high, 2}]
\`\`\`

You can combine multiple generators with filter predicates to execute relational **inner joins**:

\`\`\`erlang
Projects = [{proj, 101, "Compiler", 4}, {proj, 102, "Kernel", 2}],
Members  = [{member, 501, 101}, {member, 502, 999}],

Assignments = [
    {assigned, MemberId, ProjName}
 || {member, MemberId, TargetProjId} <- Members,
    {proj, ProjId, ProjName, _Seats} <- Projects,
    TargetProjId =:= ProjId
].
%% => [{assigned, 501, "Compiler"}]
%% Member 502 is skipped automatically because project 999 does not exist!
\`\`\`

## Parallel Worked Example

Consider a compute job scheduler selecting ready worker shards and matching queued batch tasks against eligible cluster nodes:

\`\`\`erlang
-module(build_scheduler).
-export([eligible_shard_ids/2, schedule_jobs/2]).

%% ── Phase 1: Pattern-Filtered Generator Extraction ─────────────────────────
%% Unmatching statuses (draining, offline) and non-shard tuples skip silently without crashing.
eligible_shard_ids(Shards, MinCores) ->
    [ShardId || {shard, ShardId, ready, Cores} <- Shards, Cores >= MinCores].

%% ── Phase 2: Multi-Generator Relational Join with Guard Predicates ─────────
%% Pairs each queued task with workers offering matching architecture and sufficient RAM.
schedule_jobs(Workers, Tasks) ->
    [
        {run, JobTag, HostAtom, MemMb}
     || {task, JobTag, ReqArch, MemMb} <- Tasks,
        {worker, HostAtom, Arch, FreeMemMb} <- Workers,
        Arch =:= ReqArch,
        FreeMemMb >= MemMb,
        MemMb > 0
    ].
\`\`\`

How the BEAM executes these comprehensions:
- **Phase 1 (\`eligible_shard_ids/2\`)**: The generator \`{shard, ShardId, ready, Cores} <- Shards\` destructures each element and binds \`ShardId\` only when tag \`shard\` and status \`ready\` match; failed pattern matches are discarded with zero exceptions, and \`Cores >= MinCores\` acts as a boolean filter.
- **Phase 2 (\`schedule_jobs/2\`)**: Iterates \`Tasks\` in the outer loop and \`Workers\` in the inner loop (rightmost generator cycling fastest), compiling down to tail-recursive accumulator loops in BEAM bytecode.

## Official Erlang Docs & Function Reference

\`\`\`erlang
[ Expr || Pattern <- List, GuardOrFilter ]
\`\`\`

> How to read this syntax: Qualifiers separated by commas execute strictly left-to-right. Each \`Pattern <- List\` generator filters by structural pattern match before later boolean filter expressions evaluate against bound variables. Open the attached **Reference Card** for \`list_comprehensions\` documentation.

## Assignment Specification

Implement three query functions using list comprehensions in \`src/comprehension_queries.erl\`:

### 1. \`active_user_names(Users)\`
- **Input**: \`Users\` — A list of zero or more 4-element \`user\` tuples (carrying \`Id\`, string \`Name\`, and atom \`Status\`), potentially mixed with unrelated tuples.
- **Behavior**: Extract \`Name\` strings for every user whose status equals \`active\` using generator pattern matching so suspended, inactive, or unrelated tuples are silently omitted without raising an exception.
- **Examples**:
  - \`comprehension_queries:active_user_names([{user, 1, "Alice", active}, {user, 2, "Bob", suspended}, {user, 3, "Charlie", active}])\` returns \`["Alice", "Charlie"]\`.
  - \`comprehension_queries:active_user_names([{user, 2, "Bob", suspended}])\` returns \`[]\`.

### 2. \`matrix_cartesian(Xs, Ys)\`
- **Input**: \`Xs\` and \`Ys\` — Two lists containing arbitrary Erlang terms.
- **Behavior**: Build the full Cartesian product of 2-element pairs combining every element of \`Xs\` with every element of \`Ys\`, arranged so \`Ys\` cycles fastest for each element of \`Xs\` (returning an empty list if either input is empty).
- **Examples**:
  - \`comprehension_queries:matrix_cartesian([1, 2], [x, y])\` returns \`[{1, x}, {1, y}, {2, x}, {2, y}]\`.
  - \`comprehension_queries:matrix_cartesian([1, 2], [])\` returns \`[]\`.

### 3. \`fulfilled_order_receipts(Inventory, Orders)\`
- **Input**:
  - \`Inventory\` — A list of zero or more 5-element \`product\` tuples (carrying \`Id\`, \`Name\`, \`Price\`, and \`Stock\`).
  - \`Orders\` — A list of zero or more 3-element \`order\` tuples (carrying target product identifier and requested integer \`Qty\`).
- **Behavior**: Join \`Orders\` (outer traversal) against \`Inventory\` (inner lookup) using a multi-generator comprehension to emit 4-element \`receipt\` tuples (\`Id\`, \`Name\`, and computed \`TotalCost\`) for fulfilled orders:
  - Include an order only when its target identifier matches a product's \`Id\`, requested \`Qty\` is strictly positive, and available \`Stock\` is at least \`Qty\` (inclusive boundary).
  - Compute \`TotalCost\` as integer quantity multiplied by product price.
- **Examples**:
  - \`comprehension_queries:fulfilled_order_receipts([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 1}], [{order, 1, 2}, {order, 2, 5}])\` returns \`[{receipt, 1, "Keyboard", 100}]\`.

## Rules & Verification Constraints

- \`bf_ast_verifier\` and per-function AST inspection enforce list comprehensions (\`[Expr || ...]\`) in all three exported functions, and forbid maps (\`#{}\`) and bit-syntax binaries (\`<<...>>\`).
- Use tuples, lists, atoms, strings, and numbers only.`,
    otpDocCards: [
      {
        functionName: 'list_comprehensions',
        module: 'erlang',
        signature: '[Expr || Qualifier1, ...]',
        typesSpec: ['Qualifier = Pattern <- List | boolean()'],
        description: 'Syntactic sugar for map and filter combinations with automatic pattern-matching filtering and nested generator looping.',
        complexityNote: 'Compiled by BEAM into optimized tail-recursive accumulator loops.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/expressions.html#list-comprehensions',
      },
    ],
    mentalModelCheck: {
      question: 'What happens in [Port || {svc, Port, enabled} <- Services] if Services contains {svc, 9000, disabled}?',
      options: [
        {
          id: 'A',
          label: 'The element is silently skipped by the generator pattern match without raising any exceptions',
          isCorrect: true,
          explanation: 'Comprehension generators silently discard elements that fail the left-hand pattern match.',
        },
        {
          id: 'B',
          label: 'The BEAM VM raises a function_clause or badmatch exception',
          isCorrect: false,
          explanation: 'Generators filter out non-matching elements rather than crashing.',
        },
        {
          id: 'C',
          label: '9000 is emitted as undefined in the output list',
          isCorrect: false,
          explanation: 'Non-matching elements are completely omitted from the resulting list.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch03-06-a',
        title: 'Filter Active User Names via Pattern Matching',
        erlangCall: 'comprehension_queries:active_user_names([{user, 1, "Alice", active}, {user, 2, "Bob", suspended}, {user, 3, "Charlie", active}])',
        expectedOutput: '["Alice", "Charlie"]',
        explanation: 'Silently ignores suspended Bob and extracts Alice and Charlie.',
      },
      {
        id: 'tc-ch03-06-b',
        title: 'Generate Cartesian Pairs',
        erlangCall: 'comprehension_queries:matrix_cartesian([1, 2], [x, y])',
        expectedOutput: '[{1, x}, {1, y}, {2, x}, {2, y}]',
        explanation: 'Generates all combinations of Xs and Ys.',
      },
      {
        id: 'tc-ch03-06-c',
        title: 'Generate Fulfilled Order Receipts with Relational Join',
        erlangCall: 'comprehension_queries:fulfilled_order_receipts([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 1}], [{order, 1, 2}, {order, 2, 5}])',
        expectedOutput: '[{receipt, 1, "Keyboard", 100}]',
        explanation: 'Order 1 is fulfilled (2 * 50 = 100). Order 2 requests 5 but only 1 is in stock, so it is filtered out.',
      },
    ],
    astRules: {
      requiredConstructs: ['list_comprehension'],
      forbiddenConstructs: ['map_syntax', 'bit_syntax'],
    },
    solutionExplanation: 'Implements declarative list comprehensions with pattern-matching generators, ordered multi-generators, and multi-generator relational joins.',
    files: [
      {
        name: 'comprehension_queries.erl',
        path: 'src/comprehension_queries.erl',
        content: `-module(comprehension_queries).
-export([active_user_names/1, matrix_cartesian/2, fulfilled_order_receipts/2]).

%% @doc Extract name strings from active user tuples in Users while silently omitting inactive or unrelated entries without raising exceptions.
active_user_names(_Users) ->
    ok.

%% @doc Return the Cartesian product list of 2-element pairs combining every element of Xs and Ys with Ys cycling fastest, or an empty list if either input is empty.
matrix_cartesian(_Xs, _Ys) ->
    ok.

%% @doc Join Orders in caller sequence against Inventory by product identifier, keeping only positive quantities within available stock and emitting receipt tuples with total cost.
fulfilled_order_receipts(_Inventory, _Orders) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/comprehension_queries.erl': `-module(comprehension_queries).
-export([active_user_names/1, matrix_cartesian/2, fulfilled_order_receipts/2]).

%% @doc Extract name strings from active user tuples in Users while silently omitting inactive or unrelated entries without raising exceptions.
active_user_names(Users) ->
    [Name || {user, _Id, Name, active} <- Users].

%% @doc Return the Cartesian product list of 2-element pairs combining every element of Xs and Ys with Ys cycling fastest, or an empty list if either input is empty.
matrix_cartesian(Xs, Ys) ->
    [{X, Y} || X <- Xs, Y <- Ys].

%% @doc Join Orders in caller sequence against Inventory by product identifier, keeping only positive quantities within available stock and emitting receipt tuples with total cost.
fulfilled_order_receipts(Inventory, Orders) ->
    [
        {receipt, Id, Name, Qty * Price}
     || {order, ProdId, Qty} <- Orders,
        {product, Id, Name, Price, Stock} <- Inventory,
        ProdId =:= Id,
        Stock >= Qty,
        Qty > 0
    ].`,
    },
    starterCode: `-module(comprehension_queries).
-export([active_user_names/1, matrix_cartesian/2, fulfilled_order_receipts/2]).

%% @doc Extract name strings from active user tuples in Users while silently omitting inactive or unrelated entries without raising exceptions.
active_user_names(_Users) ->
    ok.

%% @doc Return the Cartesian product list of 2-element pairs combining every element of Xs and Ys with Ys cycling fastest, or an empty list if either input is empty.
matrix_cartesian(_Xs, _Ys) ->
    ok.

%% @doc Join Orders in caller sequence against Inventory by product identifier, keeping only positive quantities within available stock and emitting receipt tuples with total cost.
fulfilled_order_receipts(_Inventory, _Orders) ->
    ok.`,
    solutionCode: `-module(comprehension_queries).
-export([active_user_names/1, matrix_cartesian/2, fulfilled_order_receipts/2]).

%% @doc Extract name strings from active user tuples in Users while silently omitting inactive or unrelated entries without raising exceptions.
active_user_names(Users) ->
    [Name || {user, _Id, Name, active} <- Users].

%% @doc Return the Cartesian product list of 2-element pairs combining every element of Xs and Ys with Ys cycling fastest, or an empty list if either input is empty.
matrix_cartesian(Xs, Ys) ->
    [{X, Y} || X <- Xs, Y <- Ys].

%% @doc Join Orders in caller sequence against Inventory by product identifier, keeping only positive quantities within available stock and emitting receipt tuples with total cost.
fulfilled_order_receipts(Inventory, Orders) ->
    [
        {receipt, Id, Name, Qty * Price}
     || {order, ProdId, Qty} <- Orders,
        {product, Id, Name, Price, Stock} <- Inventory,
        ProdId =:= Id,
        Stock >= Qty,
        Qty > 0
    ].`,
  },

  // ── Lesson 3.7: Chapter 3 Problem Set: Inventory & SLA Pipeline ─────────
  {
    id: 'ch03-l07',
    chapterNumber: 3,
    lessonNumber: 7,
    lessonType: 'problem_set',
    title: 'Chapter 3 Problem Set: Refactoring Inventory Analytics & SLA Log Aggregator (inventory_hof.erl)',
    difficulty: 'Intermediate',
    xpReward: 250,
    visualScene: 'tco_vs_body_stack',
    conceptMarkdown: `## Why This Matters in Production

In Chapter 2, you built an inventory processing engine using manual tail recursion. While effective, that design required writing separate private helper loops, managing reverse accumulators, and hand-coding tuple scans across multiple functions.

Now that you have mastered:
1. **\`lists:foldl/3\`** for tail-recursive state aggregation in constant $O(1)$ stack space,
2. **\`lists:filtermap/2\`** for single-pass selection and record transformation without intermediate lists,
3. **\`lists:keyfind/3\` & \`lists:keystore/4\`** for native C-speed tuple lookups and in-place key replacement,

you can synthesize these OTP primitives into an idiomatic, high-throughput analytics and order fulfillment pipeline.

## Deep Concept Breakdown & Under the Hood

### 1. Threading Evolving State in a Single Left Fold

When a sequence of transactions can mutate the availability checked by later transactions, each step must inspect the state produced by the previous step rather than the initial snapshot. Passing the collection itself as the accumulator in \`lists:foldl/3\` threads updated state strictly left-to-right across the batch in constant $O(1)$ call-stack space.

Similarly, rather than scanning an event stream three times for counts, anomalies, and sums, folding into a compound accumulator tuple computes multiple metrics in one linear pass:
\`\`\`erlang
%% Accumulate sample count and running maximum in a single left-fold pass
measure_peak(Samples) ->
    lists:foldl(fun(Reading, {Seen, High}) ->
        {Seen + 1, erlang:max(Reading, High)}
    end, {0, 0}, Samples).
\`\`\`

### 2. Fused Filtering & Native C Keyed Lookups

Chaining \`lists:filter/2\` followed by \`lists:map/2\` allocates an intermediate list on the process heap solely to discard it a microsecond later. \`lists:filtermap/2\` combines both predicates and tuple reshaping into one traversal. Meanwhile, pairing \`lists:keyfind/3\` with \`lists:keystore/4\` delegates tuple field comparisons (by 1-based tuple index) to fast ERTS C loops while preserving the relative positions of updated tuples in place.

## Parallel Worked Example

The module below implements a healthcare clinic triage filter and shift-roster nurse dispatcher using the same standard-library primitives on distinct data shapes and a different key position:

\`\`\`erlang
-module(clinic_triage).
-export([priority_triage_cards/2, dispatch_nurse_batches/2]).

%% ── Phase 1: Single-Pass Predicate Filtering & Shape Projection ───────────
%% Emits triage cards with boosted priority only for patients strictly above CutoffScore.
priority_triage_cards(Patients, CutoffScore) ->
    lists:filtermap(fun
        ({patient, Ward, Score}) when Score > CutoffScore ->
            {true, {triage_card, Ward, Score + 10}};
        (_) ->
            false
    end, Patients).

%% ── Phase 2: Folding Compound State with 1-Based Position-3 Lookups ───────
%% Threads {RosterAcc, SkippedAcc} across dispatches, matching BadgeId at index 3.
dispatch_nurse_batches(Nurses, Shifts) ->
    lists:foldl(fun({dispatch, TargetDept, BadgeId}, {RosterAcc, SkippedAcc}) ->
        case lists:keyfind(BadgeId, 3, RosterAcc) of
            {nurse, TargetDept, BadgeId, SlotsLeft} when SlotsLeft > 0 ->
                UpdatedNurse = {nurse, TargetDept, BadgeId, SlotsLeft - 1},
                {lists:keystore(BadgeId, 3, RosterAcc, UpdatedNurse), SkippedAcc};
            _ ->
                {RosterAcc, SkippedAcc + 1}
        end
    end, {Nurses, 0}, Shifts).
\`\`\`

How the BEAM executes these pipelines:
- **Phase 1 (\`priority_triage_cards/2\`)**: Pattern matches each tuple inside \`lists:filtermap/2\` and drops non-matching patients without building an intermediate filtered list.
- **Phase 2 (\`dispatch_nurse_batches/2\`)**: Threads a compound \`{RosterAcc, SkippedAcc}\` accumulator through \`lists:foldl/3\`, indexing into 4-element \`nurse\` tuples at 1-based position \`3\` so subsequent dispatches observe decremented slot counts immediately.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / lists)
lists:foldl(Fun, Acc0, List1) -> Acc1
lists:filtermap(Fun, List1) -> List2
lists:keyfind(Key, N, TupleList) -> Tuple | false
lists:keystore(Key, N, TupleList1, NewTuple) -> TupleList2
  Types:
    Fun = fun((Elem, AccIn) -> AccOut) | fun((Elem) -> boolean() | {true, Value})
    Acc0 = Acc1 = term()
    Key = term()
    N = pos_integer()
    TupleList = TupleList1 = TupleList2 = [tuple()]
    NewTuple = Tuple = tuple()
\`\`\`

> How to read these specs: Tuple positions \`N\` in \`keyfind/3\` and \`keystore/4\` are strictly **1-based** (\`pos_integer()\`), and \`Acc0\` establishes the accumulator structure threaded through every step of \`foldl/3\`. Open the attached **Reference Cards** for \`lists:foldl/3\`, \`lists:filtermap/2\`, \`lists:keyfind/3\`, and \`lists:keystore/4\` documentation.

## Assignment Specification

Implement four pipeline functions in \`src/inventory_hof.erl\`:

### 1. \`total_inventory_valuation(Inventory)\`
- **Input**: \`Inventory\` — A list of zero or more 5-element \`product\` tuples carrying \`Id\`, string \`Name\`, non-negative integer unit \`Price\`, and non-negative integer \`Stock\`.
- **Behavior**: Compute the combined monetary valuation (\`Price\` multiplied by \`Stock\`) across all items in a single left-fold pass using \`lists:foldl/3\`, returning \`0\` for an empty catalog.
- **Examples**:
  - \`inventory_hof:total_inventory_valuation([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 4}])\` returns \`600\`.
  - \`inventory_hof:total_inventory_valuation([])\` returns \`0\`.

### 2. \`critical_stock_alerts(Inventory, Threshold)\`
- **Input**:
  - \`Inventory\` — A list of 5-element \`product\` tuples.
  - \`Threshold\` — An integer low-stock alarm ceiling.
- **Behavior**: Scan \`Inventory\` in a single pass with \`lists:filtermap/2\` to emit a 4-element \`alert\` tuple (carrying \`Id\`, \`Name\`, and \`Stock\`) for each entry whose available \`Stock\` is less than or equal to \`Threshold\` (inclusive), omitting entries strictly above \`Threshold\` while preserving original order.
- **Examples**:
  - \`inventory_hof:critical_stock_alerts([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 2}], 5)\` returns \`[{alert, 2, "Mouse", 2}]\`.
  - \`inventory_hof:critical_stock_alerts([{product, 2, "Mouse", 25, 5}], 5)\` returns \`[{alert, 2, "Mouse", 5}]\`.

### 3. \`apply_orders_with_keylists(Inventory, Orders)\`
- **Input**:
  - \`Inventory\` — A list of 5-element \`product\` tuples.
  - \`Orders\` — A list of zero or more 3-element \`order\` tuples carrying a target product identifier and requested integer \`Qty\`.
- **Behavior**: Process \`Orders\` sequentially from left to right against \`Inventory\` using \`lists:foldl/3\`, looking up and updating matched product tuples in place via \`lists:keyfind/3\` and \`lists:keystore/4\` without altering original catalog sequence. Deduct \`Qty\` from \`Stock\` only when the product identifier exists in the current state, \`Qty\` is strictly positive, and available \`Stock\` is at least \`Qty\` (inclusive); otherwise keep the inventory unchanged for that order.
- **Examples**:
  - \`inventory_hof:apply_orders_with_keylists([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}], [{order, 1, 3}, {order, 2, 10}])\` returns \`[{product, 1, "Keyboard", 50, 7}, {product, 2, "Mouse", 25, 5}]\`.

### 4. \`aggregate_sla_logs(Logs)\`
- **Input**: \`Logs\` — A list of zero or more 4-element \`log\` tuples carrying an endpoint atom, integer \`LatencyMs\`, and status atom (\`ok\`, \`error\`, or another atom).
- **Behavior**: Reduce \`Logs\` in a single \`lists:foldl/3\` pass into a 4-element \`sla_summary\` tuple recording total log count, count of events whose status equals \`error\`, and summed \`LatencyMs\` across all events (returning all-zero counters when \`Logs\` is empty).
- **Examples**:
  - \`inventory_hof:aggregate_sla_logs([{log, api_auth, 40, ok}, {log, api_pay, 120, error}, {log, api_auth, 60, ok}])\` returns \`{sla_summary, 3, 1, 220}\`.
  - \`inventory_hof:aggregate_sla_logs([])\` returns \`{sla_summary, 0, 0, 0}\`.

## Rules & Verification Constraints

- \`bf_ast_verifier\` enforces calls to \`lists:foldl/3\`, \`lists:filtermap/2\`, \`lists:keyfind/3\`, and \`lists:keystore/4\`, and forbids maps (\`#{}\`) and bit-syntax binaries (\`<<...>>\`).
- Use tagged tuples, lists, strings, atoms, and integers only.`,
    otpDocCards: [
      {
        functionName: 'lists:foldl/3',
        module: 'lists',
        signature: 'foldl(Fun, Acc0, List) -> Acc1',
        typesSpec: ['Fun = fun((Elem, AccIn) -> AccOut)', 'Acc0 = term()', 'List = [term()]'],
        description: 'Tail-recursive collection fold operator.',
        complexityNote: 'O(N) time, O(1) stack words.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#foldl/3',
      },
      {
        functionName: 'lists:filtermap/2',
        module: 'lists',
        signature: 'filtermap(Fun, List1) -> List2',
        typesSpec: ['Fun = fun((Elem) -> boolean() | {true, Value})', 'List1 = [Elem]'],
        description: 'Single-pass filter and transform without intermediate list allocation.',
        complexityNote: 'O(N) time, O(1) stack overhead.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#filtermap/2',
      },
      {
        functionName: 'lists:keyfind/3',
        module: 'lists',
        signature: 'keyfind(Key, N, TupleList) -> Tuple | false',
        typesSpec: ['Key = term()', 'N = pos_integer()', 'TupleList = [tuple()]'],
        description: 'C BIF searching for tuple by key at 1-based position N.',
        complexityNote: 'O(N) fast C traversal.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#keyfind/3',
      },
      {
        functionName: 'lists:keystore/4',
        module: 'lists',
        signature: 'keystore(Key, N, TupleList1, NewTuple) -> TupleList2',
        typesSpec: ['Key = term()', 'N = pos_integer()', 'NewTuple = tuple()'],
        description: 'Replace first tuple matching Key at 1-based position N in place, or append NewTuple.',
        complexityNote: 'O(N) C-assisted list copy preserving existing element order.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#keystore/4',
      },
    ],
    mentalModelCheck: {
      question: 'How does apply_orders_with_keylists maintain list order when updating products?',
      options: [
        {
          id: 'A',
          label: 'lists:keystore replaces the matching tuple in its exact existing index position within the list',
          isCorrect: true,
          explanation: 'lists:keystore preserves the original positions of all existing tuples in the list.',
        },
        {
          id: 'B',
          label: 'It moves the modified tuple to the end of the list automatically',
          isCorrect: false,
          explanation: 'It only appends if the key did not previously exist.',
        },
        {
          id: 'C',
          label: 'It sorts the list numerically by product ID after every replacement',
          isCorrect: false,
          explanation: 'lists:keystore does not sort elements; it maintains existing sequence.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch03-07-a',
        title: 'Calculate Total Inventory Valuation',
        erlangCall: 'inventory_hof:total_inventory_valuation([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 4}])',
        expectedOutput: '600',
        explanation: '(50 * 10) + (25 * 4) = 500 + 100 = 600.',
      },
      {
        id: 'tc-ch03-07-b',
        title: 'Emit Critical Stock Alerts with filtermap',
        erlangCall: 'inventory_hof:critical_stock_alerts([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 2}], 5)',
        expectedOutput: '[{alert, 2, "Mouse", 2}]',
        explanation: 'Only Mouse has Stock <= 5.',
      },
      {
        id: 'tc-ch03-07-c',
        title: 'Apply Orders with Keylists',
        erlangCall: 'inventory_hof:apply_orders_with_keylists([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}], [{order, 1, 3}, {order, 2, 10}])',
        expectedOutput: '[{product, 1, "Keyboard", 50, 7}, {product, 2, "Mouse", 25, 5}]',
        explanation: 'Deducts 3 from P1. P2 requested 10 but only 5 in stock, so P2 remains unchanged.',
      },
      {
        id: 'tc-ch03-07-d',
        title: 'Aggregate SLA Logs into Summary Tuple',
        erlangCall: 'inventory_hof:aggregate_sla_logs([{log, api_auth, 40, ok}, {log, api_pay, 120, error}, {log, api_auth, 60, ok}])',
        expectedOutput: '{sla_summary, 3, 1, 220}',
        explanation: 'Total requests = 3, error count = 1, total latency = 40 + 120 + 60 = 220 ms.',
      },
    ],
    astRules: {
      requiredCalls: ['lists:foldl/3', 'lists:filtermap/2', 'lists:keyfind/3', 'lists:keystore/4'],
      forbiddenConstructs: ['map_syntax', 'bit_syntax'],
    },
    solutionExplanation: 'Synthesizes foldl reductions, single-pass filtermap alerts, keyfind/keystore order updates, and SLA log aggregation cleanly.',
    files: [
      {
        name: 'inventory_hof.erl',
        path: 'src/inventory_hof.erl',
        content: `-module(inventory_hof).
-export([total_inventory_valuation/1, critical_stock_alerts/2, apply_orders_with_keylists/2, aggregate_sla_logs/1]).

%% @doc Compute the combined monetary value of all stock in Inventory in a single pass, returning zero for an empty catalog.
total_inventory_valuation(_Inventory) ->
    ok.

%% @doc Filter and project Inventory items whose stock is at or below the caller-supplied Threshold into alert notifications while preserving order.
critical_stock_alerts(_Inventory, _Threshold) ->
    ok.

%% @doc Apply sequential customer Orders left-to-right against Inventory, deducting valid positive quantities with sufficient stock in place without altering catalog ordering.
apply_orders_with_keylists(_Inventory, _Orders) ->
    ok.

%% @doc Reduce service Logs into an SLA summary tuple tracking total request count, error-status count, and cumulative latency in milliseconds.
aggregate_sla_logs(_Logs) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/inventory_hof.erl': `-module(inventory_hof).
-export([total_inventory_valuation/1, critical_stock_alerts/2, apply_orders_with_keylists/2, aggregate_sla_logs/1]).

%% @doc Compute the combined monetary value of all stock in Inventory in a single pass, returning zero for an empty catalog.
total_inventory_valuation(Inventory) ->
    lists:foldl(fun({product, _Id, _Name, Price, Stock}, TotalAcc) ->
        TotalAcc + (Price * Stock)
    end, 0, Inventory).

%% @doc Filter and project Inventory items whose stock is at or below the caller-supplied Threshold into alert notifications while preserving order.
critical_stock_alerts(Inventory, Threshold) ->
    lists:filtermap(fun
        ({product, Id, Name, _Price, Stock}) when Stock =< Threshold ->
            {true, {alert, Id, Name, Stock}};
        (_) ->
            false
    end, Inventory).

%% @doc Apply sequential customer Orders left-to-right against Inventory, deducting valid positive quantities with sufficient stock in place without altering catalog ordering.
apply_orders_with_keylists(Inventory, Orders) ->
    lists:foldl(fun({order, ProdId, Qty}, AccInv) ->
        case lists:keyfind(ProdId, 2, AccInv) of
            {product, ProdId, Name, Price, Stock} when Stock >= Qty, Qty > 0 ->
                UpdatedProd = {product, ProdId, Name, Price, Stock - Qty},
                lists:keystore(ProdId, 2, AccInv, UpdatedProd);
            _ ->
                AccInv
        end
    end, Inventory, Orders).

%% @doc Reduce service Logs into an SLA summary tuple tracking total request count, error-status count, and cumulative latency in milliseconds.
aggregate_sla_logs(Logs) ->
    lists:foldl(fun
        ({log, _Endpoint, Latency, error}, {sla_summary, TotalReqs, Errors, TotalLatency}) ->
            {sla_summary, TotalReqs + 1, Errors + 1, TotalLatency + Latency};
        ({log, _Endpoint, Latency, _OkStatus}, {sla_summary, TotalReqs, Errors, TotalLatency}) ->
            {sla_summary, TotalReqs + 1, Errors, TotalLatency + Latency}
    end, {sla_summary, 0, 0, 0}, Logs).`,
    },
    starterCode: `-module(inventory_hof).
-export([total_inventory_valuation/1, critical_stock_alerts/2, apply_orders_with_keylists/2, aggregate_sla_logs/1]).

%% @doc Compute the combined monetary value of all stock in Inventory in a single pass, returning zero for an empty catalog.
total_inventory_valuation(_Inventory) ->
    ok.

%% @doc Filter and project Inventory items whose stock is at or below the caller-supplied Threshold into alert notifications while preserving order.
critical_stock_alerts(_Inventory, _Threshold) ->
    ok.

%% @doc Apply sequential customer Orders left-to-right against Inventory, deducting valid positive quantities with sufficient stock in place without altering catalog ordering.
apply_orders_with_keylists(_Inventory, _Orders) ->
    ok.

%% @doc Reduce service Logs into an SLA summary tuple tracking total request count, error-status count, and cumulative latency in milliseconds.
aggregate_sla_logs(_Logs) ->
    ok.`,
    solutionCode: `-module(inventory_hof).
-export([total_inventory_valuation/1, critical_stock_alerts/2, apply_orders_with_keylists/2, aggregate_sla_logs/1]).

%% @doc Compute the combined monetary value of all stock in Inventory in a single pass, returning zero for an empty catalog.
total_inventory_valuation(Inventory) ->
    lists:foldl(fun({product, _Id, _Name, Price, Stock}, TotalAcc) ->
        TotalAcc + (Price * Stock)
    end, 0, Inventory).

%% @doc Filter and project Inventory items whose stock is at or below the caller-supplied Threshold into alert notifications while preserving order.
critical_stock_alerts(Inventory, Threshold) ->
    lists:filtermap(fun
        ({product, Id, Name, _Price, Stock}) when Stock =< Threshold ->
            {true, {alert, Id, Name, Stock}};
        (_) ->
            false
    end, Inventory).

%% @doc Apply sequential customer Orders left-to-right against Inventory, deducting valid positive quantities with sufficient stock in place without altering catalog ordering.
apply_orders_with_keylists(Inventory, Orders) ->
    lists:foldl(fun({order, ProdId, Qty}, AccInv) ->
        case lists:keyfind(ProdId, 2, AccInv) of
            {product, ProdId, Name, Price, Stock} when Stock >= Qty, Qty > 0 ->
                UpdatedProd = {product, ProdId, Name, Price, Stock - Qty},
                lists:keystore(ProdId, 2, AccInv, UpdatedProd);
            _ ->
                AccInv
        end
    end, Inventory, Orders).

%% @doc Reduce service Logs into an SLA summary tuple tracking total request count, error-status count, and cumulative latency in milliseconds.
aggregate_sla_logs(Logs) ->
    lists:foldl(fun
        ({log, _Endpoint, Latency, error}, {sla_summary, TotalReqs, Errors, TotalLatency}) ->
            {sla_summary, TotalReqs + 1, Errors + 1, TotalLatency + Latency};
        ({log, _Endpoint, Latency, _OkStatus}, {sla_summary, TotalReqs, Errors, TotalLatency}) ->
            {sla_summary, TotalReqs + 1, Errors, TotalLatency + Latency}
    end, {sla_summary, 0, 0, 0}, Logs).`,
  },
];

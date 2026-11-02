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
    conceptMarkdown: `## Why This Matters in Production

In distributed systems, microservices, and asynchronous event-driven pipelines, hardcoding business logic inside rigid control flow leads to brittle, repetitive code. For example, an e-commerce platform needs different calculation engines for VIP users, wholesale bulk buyers, and retail customers; a payment processor needs configurable validation hooks before authorizing a charge.

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
make_scaler(Factor) ->
    %% Factor is captured from the enclosing scope:
    fun(Value) -> Value * Factor end.
\`\`\`

Under the hood, the BEAM VM allocates a special closure header on the process heap containing:
- An entry pointer to the compiled bytecode for the lambda.
- An **environment vector** holding pointers to all captured immutable variables (\`Factor\`).
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
Frequently, you want to pass an existing named function as an argument. Instead of wrapping it in a redundant closure like \`fun(X) -> erlang:abs(X) end\`, Erlang provides the **Function Capture Operator**:

\`\`\`erlang
%% Local function capture:
LocalRef = fun my_helper/1,

%% Remote function capture:
AbsRef = fun erlang:abs/1,
AbsRef(-42).  %% => 42
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

Consider a message filtering factory in a telecom switch:

\`\`\`erlang
-module(rule_engine).
-export([make_threshold_checker/1, execute_check/2, get_standard_abs/0, select_routing_strategy/1]).

%% Factory returning a closure capturing Threshold:
make_threshold_checker(Threshold) ->
    fun(MetricValue) -> MetricValue > Threshold end.

%% Verifying unary function via guard before calling:
execute_check(CheckFun, Value) when is_function(CheckFun, 1) ->
    CheckFun(Value).

%% Returning remote capture:
get_standard_abs() ->
    fun erlang:abs/1.

%% Choosing strategy closure based on plan atom:
select_routing_strategy(express) ->
    fun(Latency) -> Latency div 2 end;
select_routing_strategy(bulk) ->
    fun(Latency) -> Latency * 2 end;
select_routing_strategy(_) ->
    fun(Latency) -> Latency end.
\`\`\`

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

## Assignment Specification

Implement four higher-order functions in \`src/hof_basics.erl\`:

1. \`make_multiplier(Factor)\`:
   - Takes a number \`Factor\` and returns an anonymous closure \`fun(X) -> X * Factor end\`.
2. \`apply_twice(F, X)\`:
   - Guards with \`when is_function(F, 1)\`.
   - Applies \`F\` to \`X\`, and then applies \`F\` to that result: returns \`F(F(X))\`.
3. \`math_capture()\`:
   - Returns a function capture reference to \`erlang:abs/1\`: \`fun erlang:abs/1\`.
4. \`choose_pricing_strategy(Tier)\`:
   - If \`Tier =:= vip\`, returns a closure \`fun(Price) -> (Price * 80) div 100 end\` (20% discount).
   - If \`Tier =:= wholesale\`, returns a closure \`fun(Price) -> (Price * 70) div 100 end\` (30% discount).
   - Any other tier returns an identity closure \`fun(Price) -> Price end\`.

## Rules & Verification Constraints

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
      requiredConstructs: ['fun_expr'],
    },
    solutionExplanation: 'Demonstrates anonymous closures capturing lexical variables, unary function guards with is_function/2, remote function capture, and strategy factory patterns.',
    files: [
      {
        name: 'hof_basics.erl',
        path: 'src/hof_basics.erl',
        content: `-module(hof_basics).
-export([make_multiplier/1, apply_twice/2, math_capture/0, choose_pricing_strategy/1]).

%% @doc Return a closure that multiplies its input by Factor.
make_multiplier(_Factor) ->
    %% % TODO: Return an anonymous closure fun(X) that multiplies X by captured Factor
    ok.

%% @doc Apply unary function F twice to initial value X.
apply_twice(F, X) when is_function(F, 1) ->
    %% % TODO: Evaluate F(F(X))
    ok.

%% @doc Return a remote capture reference to erlang:abs/1.
math_capture() ->
    %% % TODO: Return a first-class function capture of erlang:abs/1 using fun Module:Function/Arity
    ok.

%% @doc Return pricing strategy closure based on customer tier atom.
choose_pricing_strategy(Tier) ->
    %% vip -> 20% discount: (Price * 80) div 100
    %% wholesale -> 30% discount: (Price * 70) div 100
    %% other -> Price
    ok.`,
      },
    ],
    solutionFiles: {
      'src/hof_basics.erl': `-module(hof_basics).
-export([make_multiplier/1, apply_twice/2, math_capture/0, choose_pricing_strategy/1]).

make_multiplier(Factor) ->
    fun(X) -> X * Factor end.

apply_twice(F, X) when is_function(F, 1) ->
    F(F(X)).

math_capture() ->
    fun erlang:abs/1.

choose_pricing_strategy(vip) ->
    fun(Price) -> (Price * 80) div 100 end;
choose_pricing_strategy(wholesale) ->
    fun(Price) -> (Price * 70) div 100 end;
choose_pricing_strategy(_) ->
    fun(Price) -> Price end.`,
    },
    starterCode: `-module(hof_basics).
-export([make_multiplier/1, apply_twice/2, math_capture/0, choose_pricing_strategy/1]).

%% @doc Return a closure that multiplies its input by Factor.
make_multiplier(_Factor) ->
    %% % TODO: Return an anonymous closure fun(X) that multiplies X by captured Factor
    ok.

%% @doc Apply unary function F twice to initial value X.
apply_twice(F, X) when is_function(F, 1) ->
    %% % TODO: Evaluate F(F(X))
    ok.

%% @doc Return a remote capture reference to erlang:abs/1.
math_capture() ->
    %% % TODO: Return a first-class function capture of erlang:abs/1 using fun Module:Function/Arity
    ok.

%% @doc Return pricing strategy closure based on customer tier atom.
choose_pricing_strategy(Tier) ->
    %% vip -> 20% discount: (Price * 80) div 100
    %% wholesale -> 30% discount: (Price * 70) div 100
    %% other -> Price
    ok.`,
    solutionCode: `-module(hof_basics).
-export([make_multiplier/1, apply_twice/2, math_capture/0, choose_pricing_strategy/1]).

make_multiplier(Factor) ->
    fun(X) -> X * Factor end.

apply_twice(F, X) when is_function(F, 1) ->
    F(F(X)).

math_capture() ->
    fun erlang:abs/1.

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
Sessions = [{session, 101, active}, {session, 102, expired}, {session, 103, active}],
ActiveOnly = lists:filter(fun({session, _, Status}) -> Status =:= active end, Sessions).
%% => [{session, 101, active}, {session, 103, active}]
\`\`\`

> [!warning] Common Beginner Syntax Trap: Boolean Predicate Requirement
> The callback fun passed to \`lists:filter/2\` MUST return the literal boolean atom \`true\` or \`false\`.
> If your function returns an integer, an atom like \`ok\`, or \`undefined\`, the BEAM VM immediately crashes with a \`{badarg, lists:filter}\` runtime exception!

### 3. The Single-Pass Optimization: \`lists:filtermap/2\`
Frequently in production, you need to filter a list AND transform the retained elements.
A novice writes two sequential pipeline stages:

\`\`\`erlang
%% Inefficient: Traverses the list twice and allocates an intermediate list in memory!
Filtered = lists:filter(fun({_, Val}) -> Val >= 0 end, RawMetrics),
Transformed = lists:map(fun({Metric, Val}) -> {Metric, round(Val)} end, Filtered).
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
RawMetrics = [{cpu, 12.8}, {temp, -1.0}, {disk, 44.2}],
Sanitized = lists:filtermap(fun
    ({Metric, Val}) when Val >= 0 ->
        {true, {Metric, round(Val)}};
    ({_, _Negative}) ->
        false
end, RawMetrics).
%% => [{cpu, 13}, {disk, 44}]  -- Completed in a SINGLE traversal!
\`\`\`

## Parallel Worked Example

Consider processing orders in a logistics gateway:

\`\`\`erlang
-module(logistics_pipeline).
-export([apply_tax/2, pending_deliveries/1, process_valid_shipments/1]).

%% 1. lists:map to add 15% VAT
apply_tax(Items, TaxPercent) ->
    lists:map(fun({item, Sku, Cost}) ->
        TaxedCost = Cost + ((Cost * TaxPercent) div 100),
        {item, Sku, TaxedCost}
    end, Items).

%% 2. lists:filter to retain only pending shipments
pending_deliveries(Shipments) ->
    lists:filter(fun({shipment, _Id, Status}) ->
        Status =:= pending
    end, Shipments).

%% 3. lists:filtermap in a single pass: reject zero-weight parcels, round parcel weights
process_valid_shipments(Parcels) ->
    lists:filtermap(fun
        ({parcel, TrackingId, Weight}) when Weight > 0 ->
            {true, {parcel, TrackingId, round(Weight)}};
        ({parcel, _TrackingId, _ZeroWeight}) ->
            false
    end, Parcels).
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
lists:map(Fun, List) -> [term()]
lists:filter(Pred, List) -> [term()]
lists:filtermap(Fun, List) -> [term()]
\`\`\`

## Assignment Specification

Implement three collection transformers in \`src/hof_transform.erl\`:

1. \`discount_prices(Products, DiscountPercent)\`:
   - Input: \`[{product, Id, Name, Price}, ...]\` (where \`Price\` is an integer, e.g. in cents).
   - Uses \`lists:map/2\` to return each product with its price discounted:
     \`NewPrice = Price - ((Price * DiscountPercent) div 100)\`.
2. \`active_sessions(Sessions)\`:
   - Input: \`[{session, SessionId, Status}, ...]\`.
   - Uses \`lists:filter/2\` to retain only tuples where \`Status =:= active\`.
3. \`sanitize_metrics(RawMetrics)\`:
   - Input: \`[{MetricAtom, Value}, ...]\` (where \`Value\` is a float or integer).
   - Uses \`lists:filtermap/2\` in a single pass:
     - Discard any tuple where \`Value < 0\` (return \`false\`).
     - For \`Value >= 0\`, return \`{true, {MetricAtom, round(Value)}}\`.

## Rules & Verification Constraints

- Must use \`lists:map/2\`, \`lists:filter/2\`, and \`lists:filtermap/2\`.
- Strictly no Maps (\`#{}\`) or Bit-Syntax Binaries (\`<<...>>\`). Use tuples, atoms, and integers only.`,
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
    },
    solutionExplanation: 'Utilizes lists:map/2 for 1-to-1 price transformations, lists:filter/2 for status filtering, and lists:filtermap/2 for single-pass metric sanitization.',
    files: [
      {
        name: 'hof_transform.erl',
        path: 'src/hof_transform.erl',
        content: `-module(hof_transform).
-export([discount_prices/2, active_sessions/1, sanitize_metrics/1]).

%% @doc Apply DiscountPercent (e.g. 10 for 10%) to each product price using lists:map/2.
discount_prices(_Products, _DiscountPercent) ->
    %% Map over Products: NewPrice = Price - ((Price * DiscountPercent) div 100)
    ok.

%% @doc Retain only sessions with Status =:= active using lists:filter/2.
active_sessions(_Sessions) ->
    %% Filter Sessions where Status =:= active
    ok.

%% @doc Discard negative metrics and round non-negative metrics in a single pass using lists:filtermap/2.
sanitize_metrics(_RawMetrics) ->
    %% If Value < 0 -> false; If Value >= 0 -> {true, {Metric, round(Value)}}
    ok.`,
      },
    ],
    solutionFiles: {
      'src/hof_transform.erl': `-module(hof_transform).
-export([discount_prices/2, active_sessions/1, sanitize_metrics/1]).

discount_prices(Products, DiscountPercent) ->
    lists:map(fun({product, Id, Name, Price}) ->
        NewPrice = Price - ((Price * DiscountPercent) div 100),
        {product, Id, Name, NewPrice}
    end, Products).

active_sessions(Sessions) ->
    lists:filter(fun({session, _Id, Status}) ->
        Status =:= active
    end, Sessions).

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

%% @doc Apply DiscountPercent (e.g. 10 for 10%) to each product price using lists:map/2.
discount_prices(_Products, _DiscountPercent) ->
    %% Map over Products: NewPrice = Price - ((Price * DiscountPercent) div 100)
    ok.

%% @doc Retain only sessions with Status =:= active using lists:filter/2.
active_sessions(_Sessions) ->
    %% Filter Sessions where Status =:= active
    ok.

%% @doc Discard negative metrics and round non-negative metrics in a single pass using lists:filtermap/2.
sanitize_metrics(_RawMetrics) ->
    %% If Value < 0 -> false; If Value >= 0 -> {true, {Metric, round(Value)}}
    ok.`,
    solutionCode: `-module(hof_transform).
-export([discount_prices/2, active_sessions/1, sanitize_metrics/1]).

discount_prices(Products, DiscountPercent) ->
    lists:map(fun({product, Id, Name, Price}) ->
        NewPrice = Price - ((Price * DiscountPercent) div 100),
        {product, Id, Name, NewPrice}
    end, Products).

active_sessions(Sessions) ->
    lists:filter(fun({session, _Id, Status}) ->
        Status =:= active
    end, Sessions).

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
    conceptMarkdown: `## Why This Matters in Production

Before performing a critical transaction—such as placing a batch order, executing a database migration, or taking a node offline for maintenance—systems need to evaluate collection-wide invariants:
- *Are all items currently in stock?*
- *Has any worker thread logged a critical fatal error?*
- *Can we separate high-priority traffic from standard traffic in a single scan?*

In imperative languages, developers write nested loops with boolean flags (\`bool allValid = true; for (...) { if (!v) { allValid = false; break; } }\`).

In Erlang, the standard library provides optimized, short-circuiting predicate functions (\`lists:all/2\`, \`lists:any/2\`) and single-pass collection splitters (\`lists:partition/2\`).

## Deep Concept Breakdown & Under the Hood

### 1. Universal Validation with \`lists:all/2\`
\`lists:all(Pred, List) -> boolean()\` checks whether **every element** in a list satisfies the predicate function:

\`\`\`erlang
AllPositive = lists:all(fun(X) -> X > 0 end, [10, 20, 30]).  %% => true
HasZero = lists:all(fun(X) -> X > 0 end, [10, 0, 30]).       %% => false
\`\`\`

**Short-Circuit Evaluation:**
\`lists:all/2\` does not blindly scan the entire list. The moment \`Pred(Elem)\` returns \`false\`, \`lists:all/2\` immediately terminates its traversal and returns \`false\`, saving millions of CPU cycles on large datasets.

> [!important] Vacuous Truth on Empty Lists
> In accordance with formal logic, \`lists:all(Pred, [])\` **always returns \`true\`** regardless of \`Pred\`!
> If there are zero elements, no element violates the condition. Keep this edge case in mind when validating user input!

### 2. Existential Validation with \`lists:any/2\`
\`lists:any(Pred, List) -> boolean()\` checks whether **at least one element** satisfies the predicate:

\`\`\`erlang
HasCritical = lists:any(fun({log, Lvl, _}) -> Lvl =:= critical end, Logs).
\`\`\`

Just like \`all/2\`, \`lists:any/2\` short-circuits: the moment \`Pred(Elem)\` evaluates to \`true\`, scanning stops immediately and \`true\` is returned.
For an empty list \`[]\`, \`lists:any(Pred, [])\` **always returns \`false\`**.

### 3. Single-Pass Partitioning with \`lists:partition/2\`
In Chapter 2 Lesson 2.7, you implemented a custom dual-accumulator loop (\`partition_orders/2\`) to split orders into valid and rejected buckets.

In production Erlang, you use **\`lists:partition/2\`**:

\`\`\`erlang
lists:partition(Pred, List) -> {SatisfyingList, NonSatisfyingList}
\`\`\`

\`\`\`erlang
Orders = [{order, 1, 10}, {order, 2, 2}, {order, 3, 50}],
{Bulk, Standard} = lists:partition(fun({order, _, Qty}) -> Qty >= 10 end, Orders).
%% Bulk     => [{order, 1, 10}, {order, 3, 50}]
%% Standard => [{order, 2, 2}]
\`\`\`

\`lists:partition/2\` evaluates the predicate on each element in a single tail-recursive pass, appending matching items into one accumulator and non-matching items into another, returning both in their original relative order.

## Parallel Worked Example

Consider a telecommunication gateway auditing active channel metrics:

\`\`\`erlang
-module(channel_auditor).
-export([channels_healthy/1, alert_present/1, segregate_channels/2]).

%% Verify all channels have positive signal-to-noise ratio:
channels_healthy(Channels) ->
    lists:all(fun({channel, _Id, Snr}) -> Snr > 15 end, Channels).

%% Check if any channel has dropped below critical threshold:
alert_present(Channels) ->
    lists:any(fun({channel, _Id, Snr}) -> Snr =< 0 end, Channels).

%% Segregate into high-bandwidth vs standard channels:
segregate_channels(Channels, MinBandwidth) ->
    lists:partition(fun({channel, _Id, _Snr, Bw}) ->
        Bw >= MinBandwidth
    end, Channels).
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
lists:all(Pred, List) -> boolean()
lists:any(Pred, List) -> boolean()
lists:partition(Pred, List) -> {Satisfying, NotSatisfying}
\`\`\`

## Assignment Specification

Implement three validation and segregation functions in \`src/hof_predicates.erl\`:

1. \`all_in_stock(Inventory)\`:
   - Input: \`[{product, Id, Name, Price, Stock}, ...]\`.
   - Uses \`lists:all/2\` to return \`true\` if every product has \`Stock > 0\`, else \`false\`.
2. \`has_critical_error(Logs)\`:
   - Input: \`[{log, Level, Msg}, ...]\`.
   - Uses \`lists:any/2\` to return \`true\` if at least one log entry has \`Level =:= critical\`, else \`false\`.
3. \`split_orders_by_stock(Orders, MaxSingleOrderQty)\`:
   - Input: \`[{order, Id, Qty}, ...]\`.
   - Uses \`lists:partition/2\` to return a 2-tuple \`{StandardOrders, BulkOrders}\`.
   - \`StandardOrders\` are those where \`Qty > 0 andalso Qty =< MaxSingleOrderQty\`.
   - All other orders belong in \`BulkOrders\`.

## Rules & Verification Constraints

- Must use \`lists:all/2\`, \`lists:any/2\`, and \`lists:partition/2\`.
- Strictly no Maps (\`#{}\`) or Bit-Syntax Binaries (\`<<...>>\`). Use tuples, atoms, and integers only.`,
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
    },
    solutionExplanation: 'Implements collection validation using lists:all/2 and lists:any/2 with short-circuiting, and single-pass order splitting via lists:partition/2.',
    files: [
      {
        name: 'hof_predicates.erl',
        path: 'src/hof_predicates.erl',
        content: `-module(hof_predicates).
-export([all_in_stock/1, has_critical_error/1, split_orders_by_stock/2]).

%% @doc Return true if every product in Inventory has Stock > 0, else false.
all_in_stock(_Inventory) ->
    %% Verify all items satisfy the stock condition
    ok.

%% @doc Return true if any log in Logs has Level =:= critical, else false.
has_critical_error(_Logs) ->
    %% Check if any log entry matches critical severity
    ok.

%% @doc Partition Orders into {StandardOrders, BulkOrders} where Standard has Qty > 0 andalso Qty =< MaxQty.
split_orders_by_stock(_Orders, _MaxSingleOrderQty) ->
    %% Split orders into standard and bulk buckets
    ok.`,
      },
    ],
    solutionFiles: {
      'src/hof_predicates.erl': `-module(hof_predicates).
-export([all_in_stock/1, has_critical_error/1, split_orders_by_stock/2]).

all_in_stock(Inventory) ->
    lists:all(fun({product, _Id, _Name, _Price, Stock}) ->
        Stock > 0
    end, Inventory).

has_critical_error(Logs) ->
    lists:any(fun({log, Level, _Msg}) ->
        Level =:= critical
    end, Logs).

split_orders_by_stock(Orders, MaxSingleOrderQty) ->
    lists:partition(fun({order, _Id, Qty}) ->
        Qty > 0 andalso Qty =< MaxSingleOrderQty
    end, Orders).`,
    },
    starterCode: `-module(hof_predicates).
-export([all_in_stock/1, has_critical_error/1, split_orders_by_stock/2]).

%% @doc Return true if every product in Inventory has Stock > 0, else false.
all_in_stock(_Inventory) ->
    %% Verify all items satisfy the stock condition
    ok.

%% @doc Return true if any log in Logs has Level =:= critical, else false.
has_critical_error(_Logs) ->
    %% Check if any log entry matches critical severity
    ok.

%% @doc Partition Orders into {StandardOrders, BulkOrders} where Standard has Qty > 0 andalso Qty =< MaxQty.
split_orders_by_stock(_Orders, _MaxSingleOrderQty) ->
    %% Split orders into standard and bulk buckets
    ok.`,
    solutionCode: `-module(hof_predicates).
-export([all_in_stock/1, has_critical_error/1, split_orders_by_stock/2]).

all_in_stock(Inventory) ->
    lists:all(fun({product, _Id, _Name, _Price, Stock}) ->
        Stock > 0
    end, Inventory).

has_critical_error(Logs) ->
    lists:any(fun({log, Level, _Msg}) ->
        Level =:= critical
    end, Logs).

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
    visualScene: 'tco_vs_body_stack',
    conceptMarkdown: `## Why This Matters in Production

In Chapter 2, you learned that calculating totals, tracking min/max bounds, and computing financial ledger balances requires iterating over a list while passing an updated accumulator to the next recursive call.

While \`lists:map\` produces a new list of the same length and \`lists:filter\` produces a smaller subset, **\`lists:foldl/3\`** (*fold left*) is the universal reduction operator. It can reduce any list into a single accumulated value: an integer sum, a statistical summary tuple, or an entirely new transformed data structure.

In fact, almost all collection operations—including \`map\`, \`filter\`, \`reverse\`, and \`partition\`—can be implemented using \`foldl\`!

## Deep Concept Breakdown & Under the Hood

### 1. Anatomy of \`lists:foldl/3\`
Here is the exact implementation of \`lists:foldl/3\` from the Erlang/OTP standard library source code:

\`\`\`erlang
foldl(F, Accu, [Hd | Tail]) ->
    foldl(F, F(Hd, Accu), Tail);
foldl(F, Accu, []) when is_function(F, 2) ->
    Accu.
\`\`\`

Notice that \`foldl/3\` is **strictly tail-recursive**! The recursive call \`foldl(F, F(Hd, Accu), Tail)\` is in the tail position, meaning the BEAM compiler emits the \`call_last\` opcode, reusing the current stack frame and running in **$O(1)$ constant stack space**.

### 2. CRITICAL TRAP — The Callback Argument Order!
In JavaScript (\`Array.reduce((acc, elem) => ...)\`) and Python (\`functools.reduce(fun, seq)\`), the accumulator is typically the first argument.

In Erlang \`lists:foldl/3\`, **the Element is FIRST and the Accumulator is SECOND**:

\`\`\`erlang
lists:foldl(fun(Elem, AccIn) -> AccOut end, InitialAcc, List)
\`\`\`

> [!warning] Common Beginner Syntax Trap: Inverted foldl Arguments
> If you write \`fun(Acc, Elem) -> Acc + Elem end\`, your code will fail with arithmetic exceptions the moment you aggregate non-numeric data structures like tuples or lists!
> Always remember: **\`fun(Elem, Acc) -> ... end\`**.

### 3. Multi-Value Tuple Accumulators
Your accumulator does not have to be a single number. In production telecom and financial systems, you frequently aggregate multiple running metrics inside a **Tagged Tuple Accumulator**:

\`\`\`erlang
%% Tallying Credits, Debits, and Total Transactions in a single pass:
Entries = [{credit, 100}, {debit, 40}, {credit, 50}],
InitialAcc = {0, 0, 0},  %% {Credits, Debits, Count}

Summary = lists:foldl(fun
    ({credit, Amount}, {CredAcc, DebAcc, CountAcc}) ->
        {CredAcc + Amount, DebAcc, CountAcc + 1};
    ({debit, Amount}, {CredAcc, DebAcc, CountAcc}) ->
        {CredAcc, DebAcc + Amount, CountAcc + 1}
end, InitialAcc, Entries).
%% => {150, 40, 3}
\`\`\`

### 4. \`lists:foldl/3\` (Tail-Recursive) vs. \`lists:foldr/3\` (Body-Recursive)
- **\`lists:foldl/3\`** processes elements from left-to-right (\`Head\` to \`Tail\`). It updates the accumulator eagerly and runs in **$O(1)$ stack space**.
- **\`lists:foldr/3\`** processes elements from right-to-left (\`Tail\` to \`Head\`). To reach the rightmost element first, \`foldr\` pushes $N$ activation frames onto the call stack before evaluating the first callback! On a list of 1,000,000 elements, \`lists:foldr/3\` will crash your BEAM process with a stack exhaustion crash, whereas \`lists:foldl/3\` executes smoothly with zero memory expansion.

99% of production Erlang code strictly uses \`lists:foldl/3\`.

## Parallel Worked Example

Consider tracking packet latency statistics:

\`\`\`erlang
-module(latency_aggregator).
-export([analyze_latencies/1]).

%% Single-pass calculation of Count, TotalMs, MinMs, MaxMs:
analyze_latencies([First | Rest]) ->
    InitialAcc = {1, First, First, First},  %% {Count, Total, Min, Max}
    {Count, Total, Min, Max} = lists:foldl(fun(Ms, {Cnt, Sum, MinSoFar, MaxSoFar}) ->
        NewMin = case Ms < MinSoFar of true -> Ms; false -> MinSoFar end,
        NewMax = case Ms > MaxSoFar of true -> Ms; false -> MaxSoFar end,
        {Cnt + 1, Sum + Ms, NewMin, NewMax}
    end, InitialAcc, Rest),
    {latency_report, Count, Total div Count, Min, Max}.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
lists:foldl(Fun, Acc0, List) -> Acc1
  types: Fun = fun((Elem :: term(), AccIn :: term()) -> AccOut :: term())
\`\`\`

## Assignment Specification

Implement three folding aggregators in \`src/hof_fold.erl\`:

1. \`sum_ledger(Entries)\`:
   - Input: \`[{entry, Amount, Type}, ...]\` where \`Type\` is \`credit\` or \`debit\`.
   - Uses \`lists:foldl/3\` with initial tuple accumulator \`{0, 0, 0}\` (\`{TotalCredit, TotalDebit, NetBalance}\`).
   - For \`credit\`, add \`Amount\` to \`TotalCredit\` and \`NetBalance\`.
   - For \`debit\`, add \`Amount\` to \`TotalDebit\` and subtract \`Amount\` from \`NetBalance\`.
   - Returns \`{ledger_summary, TotalCredit, TotalDebit, NetBalance}\`.
2. \`min_max_latency([First | Rest])\`:
   - Input: non-empty list of integer millisecond latencies.
   - Uses \`lists:foldl/3\` with initial accumulator \`{First, First}\` (\`{Min, Max}\`) to traverse \`Rest\`.
   - Returns a 2-tuple \`{MinLatency, MaxLatency}\`.
3. \`reverse_with_fold(List)\`:
   - Uses \`lists:foldl/3\` with initial accumulator \`[]\` and prepends each element (\`[Elem | Acc]\`) to reverse \`List\`.

## Rules & Verification Constraints

- Must use \`lists:foldl/3\`.
- Strictly no Maps (\`#{}\`) or Bit-Syntax Binaries (\`<<...>>\`). Use tuples, lists, and integers only.`,
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
      question: 'Why does lists:foldl(fun(Elem, Acc) -> [Elem | Acc] end, [], [1, 2, 3]) return [3, 2, 1] instead of [1, 2, 3]?',
      options: [
        {
          id: 'A',
          label: 'Because foldl visits elements from left to right, prepending each new element onto the head of the accumulator list (LIFO stack behavior)',
          isCorrect: true,
          explanation: '1 is prepended -> [1]; then 2 is prepended -> [2, 1]; then 3 is prepended -> [3, 2, 1].',
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
    },
    solutionExplanation: 'Demonstrates tail-recursive state aggregation using lists:foldl/3 with multi-accumulator tuples and list inversion patterns.',
    files: [
      {
        name: 'hof_fold.erl',
        path: 'src/hof_fold.erl',
        content: `-module(hof_fold).
-export([sum_ledger/1, min_max_latency/1, reverse_with_fold/1]).

%% @doc Aggregate ledger entries using lists:foldl/3 into {ledger_summary, TotalCredit, TotalDebit, NetBalance}.
sum_ledger(_Entries) ->
    %% Fold with initial accumulator {0, 0, 0}
    ok.

%% @doc Find {Min, Max} latency across non-empty list using lists:foldl/3.
min_max_latency([_First | _Rest]) ->
    %% Fold over Rest with initial accumulator {First, First}
    ok.

%% @doc Reverse a list using lists:foldl/3 and prepend [Elem | Acc].
reverse_with_fold(_List) ->
    %% Fold with initial accumulator []
    ok.`,
      },
    ],
    solutionFiles: {
      'src/hof_fold.erl': `-module(hof_fold).
-export([sum_ledger/1, min_max_latency/1, reverse_with_fold/1]).

sum_ledger(Entries) ->
    {TotalCred, TotalDeb, Net} = lists:foldl(fun
        ({entry, Amount, credit}, {CredAcc, DebAcc, NetAcc}) ->
            {CredAcc + Amount, DebAcc, NetAcc + Amount};
        ({entry, Amount, debit}, {CredAcc, DebAcc, NetAcc}) ->
            {CredAcc, DebAcc + Amount, NetAcc - Amount}
    end, {0, 0, 0}, Entries),
    {ledger_summary, TotalCred, TotalDeb, Net}.

min_max_latency([First | Rest]) ->
    lists:foldl(fun(Ms, {MinSoFar, MaxSoFar}) ->
        NewMin = case Ms < MinSoFar of true -> Ms; false -> MinSoFar end,
        NewMax = case Ms > MaxSoFar of true -> Ms; false -> MaxSoFar end,
        {NewMin, NewMax}
    end, {First, First}, Rest).

reverse_with_fold(List) ->
    lists:foldl(fun(Elem, Acc) -> [Elem | Acc] end, [], List).`,
    },
    starterCode: `-module(hof_fold).
-export([sum_ledger/1, min_max_latency/1, reverse_with_fold/1]).

%% @doc Aggregate ledger entries using lists:foldl/3 into {ledger_summary, TotalCredit, TotalDebit, NetBalance}.
sum_ledger(_Entries) ->
    %% Fold with initial accumulator {0, 0, 0}
    ok.

%% @doc Find {Min, Max} latency across non-empty list using lists:foldl/3.
min_max_latency([_First | _Rest]) ->
    %% Fold over Rest with initial accumulator {First, First}
    ok.

%% @doc Reverse a list using lists:foldl/3 and prepend [Elem | Acc].
reverse_with_fold(_List) ->
    %% Fold with initial accumulator []
    ok.`,
    solutionCode: `-module(hof_fold).
-export([sum_ledger/1, min_max_latency/1, reverse_with_fold/1]).

sum_ledger(Entries) ->
    {TotalCred, TotalDeb, Net} = lists:foldl(fun
        ({entry, Amount, credit}, {CredAcc, DebAcc, NetAcc}) ->
            {CredAcc + Amount, DebAcc, NetAcc + Amount};
        ({entry, Amount, debit}, {CredAcc, DebAcc, NetAcc}) ->
            {CredAcc, DebAcc + Amount, NetAcc - Amount}
    end, {0, 0, 0}, Entries),
    {ledger_summary, TotalCred, TotalDeb, Net}.

min_max_latency([First | Rest]) ->
    lists:foldl(fun(Ms, {MinSoFar, MaxSoFar}) ->
        NewMin = case Ms < MinSoFar of true -> Ms; false -> MinSoFar end,
        NewMax = case Ms > MaxSoFar of true -> Ms; false -> MaxSoFar end,
        {NewMin, NewMax}
    end, {First, First}, Rest).

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
    conceptMarkdown: `## Why This Matters in Production

In Chapter 2 (\`inventory.erl\`), you wrote recursive lookup and update functions to find and modify tuples in a list like \`[{product, Id, Name, Price, Stock}, ...]\`.

Because managing collections of structured tuples is so fundamental to Erlang architectures, the Erlang Run-Time System (ERTS) includes built-in functions implemented in **highly optimized C** specifically for lists of tuples.

Furthermore, almost every OTP behaviour—from \`gen_tcp:listen/2\` network sockets to supervisor child specifications and \`eunit\` configs—accepts configuration parameters as **Property Lists (\`proplists\`)**.

## Deep Concept Breakdown & Under the Hood

### 1. Keyed Tuple Functions (\`lists:keyfind\`, \`lists:keystore\`)
A "Keyed List" (or keylist) is a list of tuples where one specific element position acts as the primary key.

In Erlang, element positions inside tuples are **1-indexed**:
\`{product, Id, Name, Price, Stock}\` $\rightarrow$ Position 1 is \`product\`, Position 2 is \`Id\`, Position 3 is \`Name\`, etc.

#### \`lists:keyfind(Key, N, TupleList) -> Tuple | false\`
Searches \`TupleList\` in C-speed for the first tuple whose \`N\`-th element equals \`Key\`:
\`\`\`erlang
Inv = [{product, 101, "Keyboard", 50, 10}, {product, 102, "Mouse", 25, 4}],
Found = lists:keyfind(102, 2, Inv).
%% => {product, 102, "Mouse", 25, 4}

Missing = lists:keyfind(999, 2, Inv).
%% => false
\`\`\`

#### \`lists:keystore(Key, N, TupleList, NewTuple) -> UpdatedList\`
If a tuple with \`Key\` at position \`N\` exists, replaces it with \`NewTuple\`. If not found, appends \`NewTuple\` to the end of the list:
\`\`\`erlang
Updated = lists:keystore(102, 2, Inv, {product, 102, "Mouse", 30, 4}).
%% Replaces product 102 in-place while keeping all other products intact!
\`\`\`

### 2. Property Lists (\`proplists\`)
A property list is a flexible list of options where each item is either:
- A 2-tuple \`{Key, Value}\`, OR
- A standalone boolean atom \`Key\` (shorthand for \`{Key, true}\`).

Example socket options list:
\`\`\`erlang
Opts = [binary, {packet, 4}, {active, once}, {reuseaddr, true}].
\`\`\`

#### \`proplists:get_value(Key, PropList, Default) -> Value\`
Extracts the value associated with \`Key\`. If the option is missing, returns \`Default\`:
\`\`\`erlang
PacketMode = proplists:get_value(packet, Opts, raw).      %% => 4
Port = proplists:get_value(port, Opts, 8080).             %% => 8080 (default)
\`\`\`

#### \`proplists:get_bool(Key, PropList) -> boolean()\`
Returns \`true\` if \`Key\` or \`{Key, true}\` is present; returns \`false\` if \`{Key, false}\` or if \`Key\` is absent:
\`\`\`erlang
IsBinary = proplists:get_bool(binary, Opts).              %% => true
IsKeepAlive = proplists:get_bool(keepalive, Opts).        %% => false
\`\`\`

## Parallel Worked Example

Consider a server configuring worker pool settings:

\`\`\`erlang
-module(worker_pool_cfg).
-export([lookup_worker/2, update_worker_status/3, parse_pool_options/1]).

%% Keylist lookup where WorkerId is at index 2:
lookup_worker(Workers, WorkerId) ->
    case lists:keyfind(WorkerId, 2, Workers) of
        {worker, WorkerId, Pid, Status} -> {ok, Pid, Status};
        false -> {error, not_found}
    end.

%% Replace worker tuple in-place:
update_worker_status(Workers, WorkerId, NewStatus) ->
    case lists:keyfind(WorkerId, 2, Workers) of
        {worker, WorkerId, Pid, _OldStatus} ->
            lists:keystore(WorkerId, 2, Workers, {worker, WorkerId, Pid, NewStatus});
        false ->
            Workers
    end.

%% Extract options with proplists:
parse_pool_options(Options) ->
    Size = proplists:get_value(size, Options, 10),
    MaxOverflow = proplists:get_value(max_overflow, Options, 5),
    IsAsync = proplists:get_bool(async, Options),
    {pool_config, Size, MaxOverflow, IsAsync}.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
lists:keyfind(Key, Pos, List) -> Tuple | false
lists:keystore(Key, Pos, List, NewTuple) -> [Tuple]
proplists:get_value(Key, List, Default) -> term()
proplists:get_bool(Key, List) -> boolean()
\`\`\`

## Assignment Specification

Implement three keylist and proplist functions in \`src/keylist_config.erl\`:

1. \`find_product_by_id(Inventory, ProductId)\`:
   - \`Inventory\` is \`[{product, Id, Name, Price, Stock}, ...]\`.
   - Uses \`lists:keyfind(ProductId, 2, Inventory)\`.
   - Returns \`{ok, ProductTuple}\` if found, or \`{error, not_found}\` if \`false\`.
2. \`upsert_product(Inventory, {product, ProdId, _, _, _} = NewProduct)\`:
   - Uses \`lists:keystore(ProdId, 2, Inventory, NewProduct)\` to replace the product if present or append it if absent.
   - Returns the updated inventory list.
3. \`read_socket_options(OptsList)\`:
   - \`OptsList\` is a proplist like \`[binary, {port, 9000}, {active, once}]\`.
   - Uses \`proplists:get_value/3\` to retrieve \`port\` (default \`8080\`) and \`active\` (default \`false\`).
   - Uses \`proplists:get_bool/2\` to retrieve \`binary\`.
   - Returns \`{socket_cfg, Port, ActiveMode, IsBinary}\`.

## Rules & Verification Constraints

- Must use \`lists:keyfind/3\`, \`lists:keystore/4\`, and \`proplists:get_value/3\`.
- Strictly no Maps (\`#{}\`) or Bit-Syntax Binaries (\`<<...>>\`). Use tuples, atoms, and integers only.`,
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
          label: '0, to specify the key offset relative to the tuple tag',
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
      requiredCalls: ['lists:keyfind/3', 'lists:keystore/4', 'proplists:get_value/3'],
    },
    solutionExplanation: 'Demonstrates C BIF keylist search/update with lists:keyfind/3 and lists:keystore/4 alongside proplist option parsing.',
    files: [
      {
        name: 'keylist_config.erl',
        path: 'src/keylist_config.erl',
        content: `-module(keylist_config).
-export([find_product_by_id/2, upsert_product/2, read_socket_options/1]).

%% @doc Find product tuple by Id at position 2 using lists:keyfind/3.
find_product_by_id(_Inventory, _ProductId) ->
    %% Return {ok, Tuple} or {error, not_found}
    ok.

%% @doc Update or insert NewProduct by Id at position 2 using lists:keystore/4.
upsert_product(_Inventory, _NewProduct) ->
    %% Return updated list
    ok.

%% @doc Extract {socket_cfg, Port, ActiveMode, IsBinary} using proplists.
read_socket_options(_OptsList) ->
    %% Port default: 8080
    %% ActiveMode default: false
    %% IsBinary: proplists:get_bool(binary, OptsList)
    ok.`,
      },
    ],
    solutionFiles: {
      'src/keylist_config.erl': `-module(keylist_config).
-export([find_product_by_id/2, upsert_product/2, read_socket_options/1]).

find_product_by_id(Inventory, ProductId) ->
    case lists:keyfind(ProductId, 2, Inventory) of
        {product, ProductId, _, _, _} = Prod ->
            {ok, Prod};
        false ->
            {error, not_found}
    end.

upsert_product(Inventory, {product, ProdId, _, _, _} = NewProduct) ->
    lists:keystore(ProdId, 2, Inventory, NewProduct).

read_socket_options(OptsList) ->
    Port = proplists:get_value(port, OptsList, 8080),
    Active = proplists:get_value(active, OptsList, false),
    IsBinary = proplists:get_bool(binary, OptsList),
    {socket_cfg, Port, Active, IsBinary}.`,
    },
    starterCode: `-module(keylist_config).
-export([find_product_by_id/2, upsert_product/2, read_socket_options/1]).

%% @doc Find product tuple by Id at position 2 using lists:keyfind/3.
find_product_by_id(_Inventory, _ProductId) ->
    %% Return {ok, Tuple} or {error, not_found}
    ok.

%% @doc Update or insert NewProduct by Id at position 2 using lists:keystore/4.
upsert_product(_Inventory, _NewProduct) ->
    %% Return updated list
    ok.

%% @doc Extract {socket_cfg, Port, ActiveMode, IsBinary} using proplists.
read_socket_options(_OptsList) ->
    %% Port default: 8080
    %% ActiveMode default: false
    %% IsBinary: proplists:get_bool(binary, OptsList)
    ok.`,
    solutionCode: `-module(keylist_config).
-export([find_product_by_id/2, upsert_product/2, read_socket_options/1]).

find_product_by_id(Inventory, ProductId) ->
    case lists:keyfind(ProductId, 2, Inventory) of
        {product, ProductId, _, _, _} = Prod ->
            {ok, Prod};
        false ->
            {error, not_found}
    end.

upsert_product(Inventory, {product, ProdId, _, _, _} = NewProduct) ->
    lists:keystore(ProdId, 2, Inventory, NewProduct).

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
    conceptMarkdown: `## Why This Matters in Production

In database systems (like SQL) and query languages, you routinely express transformations as declarative queries:
\`SELECT name FROM users WHERE status = 'active'\`.

In Erlang, writing such transformations using \`lists:map\` and \`lists:filter\` requires chaining multiple higher-order functions.

To provide clean, mathematical, declarative data query ergonomics, Erlang incorporates **List Comprehensions** (derived directly from mathematical set-builder notation: $\{ f(x) \mid x \in S \land p(x) \}$).

## Deep Concept Breakdown & Under the Hood

### 1. Anatomy of a List Comprehension
A list comprehension is bounded by square brackets \`[\` and \`]\`, with an output expression separated from qualifiers by the double vertical pipe \`||\`:

\`\`\`erlang
[ OutputExpression || Qualifier1, Qualifier2, ... ]
\`\`\`

Qualifiers can be either:
- **Generators (\`Pattern <- List\`)**: Extracts elements from a list.
- **Filters (Boolean Predicates)**: Conditions that must evaluate to \`true\`.

\`\`\`erlang
Numbers = [1, 2, 3, 4, 5, 6],
EvenSquares = [X * X || X <- Numbers, X rem 2 =:= 0].
%% => [4, 16, 36]
\`\`\`

### 2. Generator Pattern Matching (The Silent Skip Rule)
Here is a profound operational difference between \`lists:map/2\` and a List Comprehension generator:

If you use \`lists:map\` with a pattern:
\`\`\`erlang
Users = [{user, 1, "Alice", active}, {user, 2, "Bob", suspended}],
%% CRASH! Bob does not match the active pattern -> function_clause exception!
lists:map(fun({user, Id, Name, active}) -> Name end, Users).
\`\`\`

In a List Comprehension, **non-matching elements are silently skipped**:
\`\`\`erlang
ActiveNames = [Name || {user, _Id, Name, active} <- Users].
%% => ["Alice"]  -- Bob is silently filtered out with ZERO exceptions!
\`\`\`

The generator \`Pattern <- List\` combines pattern matching and filtering into a single, bulletproof construct.

### 3. Multiple Generators & Relational Joins
You can include multiple generators in a single comprehension. The rightmost generator loops fastest (like nested \`for\` loops):

\`\`\`erlang
Xs = [1, 2],
Ys = [a, b],
Pairs = [{X, Y} || X <- Xs, Y <- Ys].
%% => [{1, a}, {1, b}, {2, a}, {2, b}]
\`\`\`

You can combine multiple generators with filter predicates to execute relational **inner joins**:

\`\`\`erlang
Inv = [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}],
Orders = [{order, 1, 2}, {order, 2, 3}, {order, 999, 1}],

Receipts = [
    {receipt, Id, Name, Qty * Price}
 || {order, OrderId, Qty} <- Orders,
    {product, Id, Name, Price, Stock} <- Inv,
    OrderId =:= Id,
    Stock >= Qty
].
%% => [{receipt, 1, "Keyboard", 100}, {receipt, 2, "Mouse", 75}]
%% Order 999 is skipped automatically because no matching product exists!
\`\`\`

## Parallel Worked Example

Consider building an event-ticketing engine:

\`\`\`erlang
-module(ticket_queries).
-export([confirmed_buyer_names/1, seat_grid/2, issue_valid_tickets/2]).

%% 1. Extract buyer names for confirmed tickets:
confirmed_buyer_names(Reservations) ->
    [Name || {res, _Id, Name, confirmed} <- Reservations].

%% 2. Generate Cartesian seat matrix:
seat_grid(Rows, Seats) ->
    [{Row, Seat} || Row <- Rows, Seat <- Seats].

%% 3. Relational join between concert passes and customer accounts:
issue_valid_tickets(Passes, Customers) ->
    [
        {ticket, CustId, CustName, Event, Price}
     || {pass, PassId, Event, Price} <- Passes,
        {customer, CustId, CustName, PassId} <- Customers,
        Price > 0
    ].
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
[ Expr || Pattern <- List, GuardOrFilter ]
\`\`\`

## Assignment Specification

Implement three query functions using list comprehensions in \`src/comprehension_queries.erl\`:

1. \`active_user_names(Users)\`:
   - Input: \`[{user, Id, Name, Status}, ...]\`.
   - Uses a list comprehension with generator pattern matching to return a list of \`Name\` strings for users whose \`Status =:= active\`.
2. \`matrix_cartesian(Xs, Ys)\`:
   - Uses two generators in a list comprehension to return all pairs \`[{X, Y} || X <- Xs, Y <- Ys]\`.
3. \`fulfilled_order_receipts(Inventory, Orders)\`:
   - \`Inventory = [{product, Id, Name, Price, Stock}, ...]\`.
   - \`Orders = [{order, ProdId, Qty}, ...]\`.
   - Uses a list comprehension with two generators and filter conditions (\`ProdId =:= Id\`, \`Stock >= Qty\`, \`Qty > 0\`) to return:
     \`[{receipt, Id, Name, Qty * Price} || ...]\`.

## Rules & Verification Constraints

- Must use list comprehensions (\`[... || ...]\`).
- Strictly no Maps (\`#{}\`) or Bit-Syntax Binaries (\`<<...>>\`). Use tuples, strings, and integers only.`,
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
      question: 'What happens in [Name || {user, Id, Name, active} <- Users] if Users contains {user, 2, "Bob", suspended}?',
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
          label: 'Bob is emitted as undefined in the output list',
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
    },
    solutionExplanation: 'Implements declarative list comprehensions with pattern-matching generators and multi-generator relational joins.',
    files: [
      {
        name: 'comprehension_queries.erl',
        path: 'src/comprehension_queries.erl',
        content: `-module(comprehension_queries).
-export([active_user_names/1, matrix_cartesian/2, fulfilled_order_receipts/2]).

%% @doc Return [Name] for active users using list comprehension generator pattern matching.
active_user_names(_Users) ->
    %% % TODO: Filter Users with a list comprehension pattern-matching on active user tuples and return [Name]
    ok.

%% @doc Return [{X, Y}] Cartesian product using two generators.
matrix_cartesian(_Xs, _Ys) ->
    %% % TODO: Combine two generator qualifiers across Xs and Ys to produce all {X, Y} Cartesian pairs
    ok.

%% @doc Join Orders and Inventory to return [{receipt, Id, Name, Qty * Price}] for fulfilled orders.
fulfilled_order_receipts(_Inventory, _Orders) ->
    %% Join {order, ProdId, Qty} and {product, Id, Name, Price, Stock} where ProdId =:= Id, Stock >= Qty, Qty > 0
    ok.`,
      },
    ],
    solutionFiles: {
      'src/comprehension_queries.erl': `-module(comprehension_queries).
-export([active_user_names/1, matrix_cartesian/2, fulfilled_order_receipts/2]).

active_user_names(Users) ->
    [Name || {user, _Id, Name, active} <- Users].

matrix_cartesian(Xs, Ys) ->
    [{X, Y} || X <- Xs, Y <- Ys].

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

%% @doc Return [Name] for active users using list comprehension generator pattern matching.
active_user_names(_Users) ->
    %% % TODO: Filter Users with a list comprehension pattern-matching on active user tuples and return [Name]
    ok.

%% @doc Return [{X, Y}] Cartesian product using two generators.
matrix_cartesian(_Xs, _Ys) ->
    %% % TODO: Combine two generator qualifiers across Xs and Ys to produce all {X, Y} Cartesian pairs
    ok.

%% @doc Join Orders and Inventory to return [{receipt, Id, Name, Qty * Price}] for fulfilled orders.
fulfilled_order_receipts(_Inventory, _Orders) ->
    %% Join {order, ProdId, Qty} and {product, Id, Name, Price, Stock} where ProdId =:= Id, Stock >= Qty, Qty > 0
    ok.`,
    solutionCode: `-module(comprehension_queries).
-export([active_user_names/1, matrix_cartesian/2, fulfilled_order_receipts/2]).

active_user_names(Users) ->
    [Name || {user, _Id, Name, active} <- Users].

matrix_cartesian(Xs, Ys) ->
    [{X, Y} || X <- Xs, Y <- Ys].

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
    visualScene: 'tco_vs_body_stack',
    conceptMarkdown: `## Why This Matters in Production

In Chapter 2, you built the foundation of an inventory processing engine using manual tail-recursion. While functional, that engine required dozens of lines of helper loops and manual list traversals.

Now that you have mastered:
1. **\`lists:foldl/3\`** for tail-recursive accumulation,
2. **\`lists:filtermap/2\`** for single-pass filtering and transformation,
3. **\`lists:keyfind/3\` & \`lists:keystore/4\`** for C-speed tuple lookups and replacements,

you are ready to synthesize these tools into a clean, idiomatic, high-throughput analytics and order fulfillment engine.

## Deep Concept Breakdown & Under the Hood

### 1. Refactoring Manual Recursion with \`lists:foldl/3\`
In Chapter 2, calculating total inventory valuation required writing private \`total/2\` loop helpers.
With \`lists:foldl/3\`, it becomes a clear, 3-line reduction:

\`\`\`erlang
total_inventory_valuation(Inventory) ->
    lists:foldl(fun({product, _Id, _Name, Price, Stock}, TotalAcc) ->
        TotalAcc + (Price * Stock)
    end, 0, Inventory).
\`\`\`

### 2. Streamlining Order Application with \`lists:keyfind\` and \`keystore\`
In Chapter 2's \`inventory:process_order/2\`, you had an outer loop over orders and an inner loop updating inventory tuples.
Look how elegant this becomes when you fold over orders and use ERTS BIFs:

\`\`\`erlang
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
\`\`\`

The accumulator \`AccInv\` starts as the initial \`Inventory\`. For each order, \`lists:keyfind/3\` locates the product in C speed. If stock is sufficient, \`lists:keystore/4\` replaces the tuple in-place. If insufficient or missing, \`AccInv\` is returned unchanged!

### 3. Service Level Agreement (SLA) Telemetry Aggregation
In backend telemetry, web gateways and message routers stream millions of endpoint request logs.
Each log event is a tuple: \`{log, EndpointAtom, LatencyMs, StatusAtom}\`.

Using \`lists:foldl/3\`, you can compute:
- Total requests processed,
- Number of failed requests (\`StatusAtom =:= error\`),
- Total latency in milliseconds,

all in a single pass into a tagged summary tuple:
\`{sla_summary, TotalRequests, ErrorCount, TotalLatencyMs}\`.

## Parallel Worked Example

\`\`\`erlang
-module(telemetry_engine).
-export([audit_events/1]).

%% Aggregates event stream into {telemetry_summary, Total, WarnCount, TotalBytes}
audit_events(Events) ->
    lists:foldl(fun
        ({event, _Type, Bytes, warning}, {Total, Warns, SumBytes}) ->
            {Total + 1, Warns + 1, SumBytes + Bytes};
        ({event, _Type, Bytes, _Status}, {Total, Warns, SumBytes}) ->
            {Total + 1, Warns, SumBytes + Bytes}
    end, {telemetry_summary, 0, 0, 0}, Events).
\`\`\`

## Assignment Specification

Implement four pipeline functions in \`src/inventory_hof.erl\`:

1. \`total_inventory_valuation(Inventory)\`:
   - \`Inventory = [{product, Id, Name, Price, Stock}, ...]\`.
   - Uses \`lists:foldl/3\` with initial accumulator \`0\` to return the total integer value \`Sum(Price * Stock)\`.
2. \`critical_stock_alerts(Inventory, Threshold)\`:
   - Uses \`lists:filtermap/2\` in a single pass:
     - If \`Stock =< Threshold\`, emits \`{true, {alert, Id, Name, Stock}}\`.
     - Otherwise emits \`false\`.
3. \`apply_orders_with_keylists(Inventory, Orders)\`:
   - Folds over \`Orders = [{order, ProdId, Qty}, ...]\` using \`lists:foldl/3\`.
   - Initial accumulator is \`Inventory\`.
   - For each order, looks up \`ProdId\` using \`lists:keyfind(ProdId, 2, AccInv)\`.
   - If found with \`Stock >= Qty\` and \`Qty > 0\`, updates the product using \`lists:keystore(ProdId, 2, AccInv, {product, ProdId, Name, Price, Stock - Qty})\`.
   - If stock is insufficient or product is not found, leaves \`AccInv\` unchanged.
4. \`aggregate_sla_logs(Logs)\`:
   - \`Logs = [{log, EndpointAtom, LatencyMs, StatusAtom}, ...]\`.
   - Uses \`lists:foldl/3\` with initial accumulator \`{sla_summary, 0, 0, 0}\` (\`{sla_summary, TotalReqs, ErrorCount, TotalLatency}\`).
   - Increments \`TotalReqs\` on every entry.
   - If \`StatusAtom =:= error\`, increments \`ErrorCount\`.
   - Adds \`LatencyMs\` to \`TotalLatency\`.
   - Returns \`{sla_summary, TotalReqs, ErrorCount, TotalLatency}\`.

## Rules & Verification Constraints

- Must use \`lists:foldl/3\`, \`lists:filtermap/2\`, \`lists:keyfind/3\`, and \`lists:keystore/4\`.
- Strictly no Maps (\`#{}\`) or Bit-Syntax Binaries (\`<<...>>\`). Use tagged tuples, atoms, and integers only.`,
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
        functionName: 'lists:keyfind/3',
        module: 'lists',
        signature: 'keyfind(Key, N, TupleList) -> Tuple | false',
        typesSpec: ['Key = term()', 'N = pos_integer()', 'TupleList = [tuple()]'],
        description: 'C BIF searching for tuple by key at position N.',
        complexityNote: 'O(N) fast C traversal.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#keyfind/3',
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
    },
    solutionExplanation: 'Synthesizes foldl reductions, single-pass filtermap alerts, keyfind/keystore order updates, and SLA log aggregation without forward references.',
    files: [
      {
        name: 'inventory_hof.erl',
        path: 'src/inventory_hof.erl',
        content: `-module(inventory_hof).
-export([total_inventory_valuation/1, critical_stock_alerts/2, apply_orders_with_keylists/2, aggregate_sla_logs/1]).

%% @doc Calculate total value of all stock using lists:foldl/3.
total_inventory_valuation(_Inventory) ->
    %% Fold over Inventory: Acc + (Price * Stock)
    ok.

%% @doc Single-pass filtermap returning [{alert, Id, Name, Stock}] for items where Stock =< Threshold.
critical_stock_alerts(_Inventory, _Threshold) ->
    %% Perform single-pass filtering and mapping
    ok.

%% @doc Apply orders to inventory using lists:foldl/3 with lists:keyfind/3 and lists:keystore/4.
apply_orders_with_keylists(Inventory, _Orders) ->
    %% For each order, if found with Stock >= Qty and Qty > 0, deduct stock via keystore; else leave AccInv unchanged
    Inventory.

%% @doc Aggregate SLA logs into {sla_summary, TotalReqs, ErrorCount, TotalLatency} using lists:foldl/3.
aggregate_sla_logs(_Logs) ->
    %% Initial accumulator: {sla_summary, 0, 0, 0}
    ok.`,
      },
    ],
    solutionFiles: {
      'src/inventory_hof.erl': `-module(inventory_hof).
-export([total_inventory_valuation/1, critical_stock_alerts/2, apply_orders_with_keylists/2, aggregate_sla_logs/1]).

total_inventory_valuation(Inventory) ->
    lists:foldl(fun({product, _Id, _Name, Price, Stock}, TotalAcc) ->
        TotalAcc + (Price * Stock)
    end, 0, Inventory).

critical_stock_alerts(Inventory, Threshold) ->
    lists:filtermap(fun
        ({product, Id, Name, _Price, Stock}) when Stock =< Threshold ->
            {true, {alert, Id, Name, Stock}};
        (_) ->
            false
    end, Inventory).

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

%% @doc Calculate total value of all stock using lists:foldl/3.
total_inventory_valuation(_Inventory) ->
    %% Fold over Inventory: Acc + (Price * Stock)
    ok.

%% @doc Single-pass filtermap returning [{alert, Id, Name, Stock}] for items where Stock =< Threshold.
critical_stock_alerts(_Inventory, _Threshold) ->
    %% Perform single-pass filtering and mapping
    ok.

%% @doc Apply orders to inventory using lists:foldl/3 with lists:keyfind/3 and lists:keystore/4.
apply_orders_with_keylists(Inventory, _Orders) ->
    %% For each order, if found with Stock >= Qty and Qty > 0, deduct stock via keystore; else leave AccInv unchanged
    Inventory.

%% @doc Aggregate SLA logs into {sla_summary, TotalReqs, ErrorCount, TotalLatency} using lists:foldl/3.
aggregate_sla_logs(_Logs) ->
    %% Initial accumulator: {sla_summary, 0, 0, 0}
    ok.`,
    solutionCode: `-module(inventory_hof).
-export([total_inventory_valuation/1, critical_stock_alerts/2, apply_orders_with_keylists/2, aggregate_sla_logs/1]).

total_inventory_valuation(Inventory) ->
    lists:foldl(fun({product, _Id, _Name, Price, Stock}, TotalAcc) ->
        TotalAcc + (Price * Stock)
    end, 0, Inventory).

critical_stock_alerts(Inventory, Threshold) ->
    lists:filtermap(fun
        ({product, Id, Name, _Price, Stock}) when Stock =< Threshold ->
            {true, {alert, Id, Name, Stock}};
        (_) ->
            false
    end, Inventory).

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

aggregate_sla_logs(Logs) ->
    lists:foldl(fun
        ({log, _Endpoint, Latency, error}, {sla_summary, TotalReqs, Errors, TotalLatency}) ->
            {sla_summary, TotalReqs + 1, Errors + 1, TotalLatency + Latency};
        ({log, _Endpoint, Latency, _OkStatus}, {sla_summary, TotalReqs, Errors, TotalLatency}) ->
            {sla_summary, TotalReqs + 1, Errors, TotalLatency + Latency}
    end, {sla_summary, 0, 0, 0}, Logs).`,
  },
];

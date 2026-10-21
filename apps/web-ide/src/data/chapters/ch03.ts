import { LessonContent } from '../../types/workspace';

export const CHAPTER_3_LESSONS: LessonContent[] = [
  // ── Lesson 3.1: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch03-l01',
    chapterNumber: 3,
    lessonNumber: 1,
    lessonType: 'concept_exercise',
    title: 'Anonymous Functions (fun) & Function Captures',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In event-driven backends, asynchronous network handlers and middleware pipelines depend heavily on first-class functions (**closures**). In Erlang, functions are first-class values that can be passed as arguments, returned from other functions, bound to variables, and sent across process boundaries in messages.

## Deep Concept Breakdown & Under the Hood

### 1. Anonymous Functions (\`fun (...) -> ... end\`)
Anonymous functions capture variables from their enclosing lexical scope:
\`\`\`erlang
BasePrice = 100,
ApplyDiscount = fun(Percent) -> BasePrice * (1.0 - Percent / 100) end,
Final = ApplyDiscount(20).  %% => 80.0
\`\`\`
On the BEAM, a closure is allocated on the process heap with an environment vector storing references to all captured variables.

### 2. Function Captures (\`fun Module:Function/Arity\`)
Instead of wrapping existing named functions in anonymous lambdas, capture them directly:
\`\`\`erlang
SquareRoot = fun math:sqrt/1,
Result = SquareRoot(16.0).  %% => 4.0
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Closure creation syntax
fun (Arg1, Arg2) -> Body end
fun Module:FunctionName/Arity
\`\`\`
> Function references are validated at call time. Capturing \`fun mod:fun/arity\` ensures that if \`mod\` is hot-reloaded, future calls to the capture dynamically resolve to the newest code version.

## Assignment Specification

Module: \`hof_basics\` · Export: \`make_adder/1\`, \`apply_twice/2\`, \`math_capture/0\`
1. \`make_adder(N)\`:
   - Returns a closure \`fun(X) -> X + N end\` capturing \`N\`.
2. \`apply_twice(F, X)\`:
   - Takes a unary function \`F\` and initial value \`X\`, returning \`F(F(X))\`.
3. \`math_capture()\`:
   - Returns a function capture reference to \`erlang:abs/1\`: \`fun erlang:abs/1\`.

## Rules & Verification Constraints

- \`make_adder/1\` must return an anonymous \`fun\` closure.
- \`math_capture/0\` must use the \`fun erlang:abs/1\` syntax.`,
    otpDocCards: [
      {
        functionName: 'fun_expression',
        module: 'erlang',
        signature: 'fun(Arg1) -> Body end',
        typesSpec: ['Arg1 = term()', 'Returns fun((term()) -> term())'],
        description: 'First-class lexical closure capturing environment variables.',
        complexityNote: 'O(1) allocation of environment vector on process heap.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/expressions.html#fun-expressions',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch03-01-1',
        title: 'Create and Invoke Adder Closure',
        erlangCall: 'begin Add10 = hof_basics:make_adder(10), Add10(25) end',
        expectedOutput: '35',
        explanation: 'Closure captures N=10 and evaluates 25 + 10 = 35.',
      },
      {
        id: 'tc-ch03-01-2',
        title: 'Apply Function Twice',
        erlangCall: 'hof_basics:apply_twice(fun(X) -> X * 2 end, 3)',
        expectedOutput: '12',
        explanation: '3 * 2 = 6; 6 * 2 = 12.',
      },
      {
        id: 'tc-ch03-01-3',
        title: 'Invoke Captured fun erlang:abs/1',
        erlangCall: 'begin AbsFun = hof_basics:math_capture(), AbsFun(-42) end',
        expectedOutput: '42',
        explanation: 'Calls captured erlang:abs/1.',
      },
    ],
    astRules: {
      requiredConstructs: ['fun_expr'],
    },
    solutionExplanation: 'Implements higher-order closure generation and function capture syntax.',
    starterCode: `-module(hof_basics).
-export([make_adder/1, apply_twice/2, math_capture/0]).

make_adder(N) ->
    %% % TODO: return fun(X) -> X + N end
    fun(X) -> X end.

apply_twice(F, X) ->
    %% % TODO: return F(F(X))
    X.

math_capture() ->
    %% % TODO: return fun erlang:abs/1
    fun erlang:abs/1.`,
    solutionCode: `-module(hof_basics).
-export([make_adder/1, apply_twice/2, math_capture/0]).

make_adder(N) ->
    fun(X) -> X + N end.

apply_twice(F, X) when is_function(F, 1) ->
    F(F(X)).

math_capture() ->
    fun erlang:abs/1.`,
    files: [
      {
        path: 'src/hof_basics.erl',
        name: 'hof_basics.erl',
        content: `-module(hof_basics).
-export([make_adder/1, apply_twice/2, math_capture/0]).

make_adder(N) ->
    %% % TODO: return fun(X) -> X + N end
    fun(X) -> X end.

apply_twice(F, X) ->
    %% % TODO: return F(F(X))
    X.

math_capture() ->
    %% % TODO: return fun erlang:abs/1
    fun erlang:abs/1.`,
      },
    ],
    solutionFiles: {
      'src/hof_basics.erl': `-module(hof_basics).
-export([make_adder/1, apply_twice/2, math_capture/0]).

make_adder(N) ->
    fun(X) -> X + N end.

apply_twice(F, X) when is_function(F, 1) ->
    F(F(X)).

math_capture() ->
    fun erlang:abs/1.`,
    },
    references: [
      {
        title: 'Fun Expressions in Erlang',
        url: 'https://www.erlang.org/doc/reference_manual/expressions.html#fun-expressions',
        category: 'erlang_docs',
        description: 'Official specification of anonymous functions, closures, and captures.',
      },
    ],
  },

  // ── Lesson 3.2: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch03-l02',
    chapterNumber: 3,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'Transforming & Filtering Collections (lists:map, filter, filtermap)',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

While manual recursion was necessary in Chapter 2 to understand the BEAM stack, in production Erlang code you use the standard library module \`lists\`. Functions like \`lists:map/2\`, \`lists:filter/2\`, and \`lists:filtermap/2\` provide readable, battle-tested abstractions for processing telemetry streams, modifying customer balances, and stripping invalid frames.

## Deep Concept Breakdown & Under the Hood

### 1. \`lists:map(Fun, List)\`
Applies \`Fun\` to each element and preserves length:
\`\`\`erlang
lists:map(fun(X) -> X * 2 end, [1, 2, 3])  %% => [2, 4, 6]
\`\`\`

### 2. \`lists:filter(Pred, List)\`
Keeps elements where \`Pred(Item)\` returns \`true\`:
\`\`\`erlang
lists:filter(fun(X) -> X rem 2 =:= 0 end, [1, 2, 3, 4])  %% => [2, 4]
\`\`\`

### 3. \`lists:filtermap(Fun, List)\`
Combines filter and map into a **single pass**, eliminating an intermediate list allocation on the process heap:
- If \`Fun(X)\` returns \`{true, NewVal}\`, \`NewVal\` is kept.
- If \`Fun(X)\` returns \`false\`, \`X\` is discarded.
\`\`\`erlang
lists:filtermap(fun({user, Id, active}) -> {true, Id};
                   (_)                  -> false
                end, Users).
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / lists)
lists:map(Fun, List1) -> List2
lists:filter(Pred, List1) -> List2
lists:filtermap(Fun, List1) -> List2
\`\`\`
> Prefer \`lists:filtermap/2\` over chained \`lists:map(lists:filter(...))\` to prevent allocating throwaway heap memory.

## Assignment Specification

Module: \`hof_transform\` · Export: \`discount_prices/2\`, \`active_sessions/1\`, \`sanitize_metrics/1\`
1. \`discount_prices(Products, DiscountPercent)\`:
   - \`Products\`: list of \`{product, Id, Name, Price}\`.
   - Uses \`lists:map/2\` to return \`{product, Id, Name, Price * (1.0 - DiscountPercent / 100)}\`.
2. \`active_sessions(Sessions)\`:
   - \`Sessions\`: list of \`{session, SessionId, Status}\`.
   - Uses \`lists:filter/2\` to retain only sessions where \`Status =:= active\`.
3. \`sanitize_metrics(RawMetrics)\`:
   - \`RawMetrics\`: list of \`{MetricName, Val}\`.
   - Uses \`lists:filtermap/2\` in a single pass:
     - Discard any metric where \`Val < 0\`.
     - For non-negative metrics, return \`{true, {MetricName, round(Val)}}\`.

## Rules & Verification Constraints

- Must call \`lists:map/2\` in \`discount_prices/2\`.
- Must call \`lists:filter/2\` in \`active_sessions/1\`.
- Must call \`lists:filtermap/2\` in \`sanitize_metrics/1\`.`,
    otpDocCards: [
      {
        functionName: 'map',
        module: 'lists',
        signature: 'lists:map(Fun, List1) -> List2',
        typesSpec: ['Fun = fun((A) -> B)', 'List1 = [A]', 'List2 = [B]'],
        description: 'Transforms every element in List1 using Fun.',
        complexityNote: 'O(N) time and memory.',
        officialUrl: 'https://www.erlang.org/doc/man/lists.html#map-2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/lists.erl',
      },
      {
        functionName: 'filtermap',
        module: 'lists',
        signature: 'lists:filtermap(Fun, List1) -> List2',
        typesSpec: ['Fun = fun((A) -> boolean() | {true, B})', 'List1 = [A]', 'List2 = [B]'],
        description: 'Filters and maps a list in a single traversal.',
        complexityNote: 'O(N) time, avoids intermediate list allocation.',
        officialUrl: 'https://www.erlang.org/doc/man/lists.html#filtermap-2',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch03-02-1',
        title: 'Discount Prices via lists:map',
        erlangCall: 'hof_transform:discount_prices([{product, 1, "Desk", 100.0}], 10)',
        expectedOutput: '[{product, 1, "Desk", 90.0}]',
        explanation: '10% discount on 100.0 yields 90.0.',
      },
      {
        id: 'tc-ch03-02-2',
        title: 'Filter Active Sessions via lists:filter',
        erlangCall: 'hof_transform:active_sessions([{session, "s1", active}, {session, "s2", expired}])',
        expectedOutput: '[{session, "s1", active}]',
        explanation: 'Filters out expired session.',
      },
      {
        id: 'tc-ch03-02-3',
        title: 'Single-Pass Sanitize Metrics via lists:filtermap',
        erlangCall: 'hof_transform:sanitize_metrics([{"cpu", 42.6}, {"ram", -1.0}, {"disk", 85.2}])',
        expectedOutput: '[{"cpu", 43}, {"disk", 85}]',
        explanation: 'Discards negative metric and rounds valid metrics in one pass.',
      },
    ],
    astRules: {
      requiredCalls: ['lists:map/2', 'lists:filter/2', 'lists:filtermap/2'],
    },
    solutionExplanation: 'Employs standard library lists:map, lists:filter, and lists:filtermap functions.',
    starterCode: `-module(hof_transform).
-export([discount_prices/2, active_sessions/1, sanitize_metrics/1]).

discount_prices(Products, DiscountPercent) ->
    %% % TODO: call lists:map/2
    [].

active_sessions(Sessions) ->
    %% % TODO: call lists:filter/2
    [].

sanitize_metrics(RawMetrics) ->
    %% % TODO: call lists:filtermap/2
    [].`,
    solutionCode: `-module(hof_transform).
-export([discount_prices/2, active_sessions/1, sanitize_metrics/1]).

discount_prices(Products, DiscountPercent) ->
    Factor = 1.0 - (DiscountPercent / 100),
    lists:map(fun({product, Id, Name, Price}) ->
        {product, Id, Name, Price * Factor}
    end, Products).

active_sessions(Sessions) ->
    lists:filter(fun({session, _Id, Status}) ->
        Status =:= active
    end, Sessions).

sanitize_metrics(RawMetrics) ->
    lists:filtermap(fun({Name, Val}) when Val >= 0 ->
        {true, {Name, round(Val)}};
    (_) ->
        false
    end, RawMetrics).`,
    files: [
      {
        path: 'src/hof_transform.erl',
        name: 'hof_transform.erl',
        content: `-module(hof_transform).
-export([discount_prices/2, active_sessions/1, sanitize_metrics/1]).

discount_prices(Products, DiscountPercent) ->
    %% % TODO: call lists:map/2
    [].

active_sessions(Sessions) ->
    %% % TODO: call lists:filter/2
    [].

sanitize_metrics(RawMetrics) ->
    %% % TODO: call lists:filtermap/2
    [].`,
      },
    ],
    solutionFiles: {
      'src/hof_transform.erl': `-module(hof_transform).
-export([discount_prices/2, active_sessions/1, sanitize_metrics/1]).

discount_prices(Products, DiscountPercent) ->
    Factor = 1.0 - (DiscountPercent / 100),
    lists:map(fun({product, Id, Name, Price}) ->
        {product, Id, Name, Price * Factor}
    end, Products).

active_sessions(Sessions) ->
    lists:filter(fun({session, _Id, Status}) ->
        Status =:= active
    end, Sessions).

sanitize_metrics(RawMetrics) ->
    lists:filtermap(fun({Name, Val}) when Val >= 0 ->
        {true, {Name, round(Val)}};
    (_) ->
        false
    end, RawMetrics).`,
    },
    references: [
      {
        title: 'Erlang STDLIB lists Module',
        url: 'https://www.erlang.org/doc/man/lists.html',
        category: 'erlang_docs',
        description: 'Complete documentation for lists:map, lists:filter, and lists:filtermap.',
      },
    ],
  },

  // ── Lesson 3.3: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch03-l03',
    chapterNumber: 3,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Folding & Aggregating State (lists:foldl vs lists:foldr)',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In distributed state machines, financial ledgers, and metrics collection engines, folding a stream of events into an aggregated state record is the fundamental design pattern. In Erlang, **\`lists:foldl/3\`** is the workhorse of state aggregation.

## Deep Concept Breakdown & Under the Hood

### \`lists:foldl/3\` (Tail-Recursive, Stack O(1))
Looking at the actual OTP source code in \`lib/stdlib/src/lists.erl\`:
\`\`\`erlang
%% Actual Erlang/OTP stdlib source:
foldl(F, Accu, [Hd | Tail]) ->
    foldl(F, F(Hd, Accu), Tail);
foldl(F, Accu, []) when is_function(F, 2) ->
    Accu.
\`\`\`
Notice that \`foldl\` is **tail-recursive**: the call to \`foldl/3\` is in the return position. The accumulator is updated immediately on each step, consuming \`O(1)\` stack space.

### \`lists:foldr/3\` (Body-Recursive, Stack O(N))
By contrast, \`foldr\` processes elements from right to left, requiring the entire list to be walked onto the BEAM stack before the folding function begins. **Always prefer \`lists:foldl/3\` in production**.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (stdlib / lists)
lists:foldl(Fun, Acc0, List1) -> Acc1
  Types:
    Fun = fun((Elem :: T, AccIn :: Acc) -> AccOut :: Acc)
    Acc0 = Acc1 = Acc = term()
    List1 = [T]
\`\`\`
> Notice the argument order in Erlang's \`Fun\`: \`fun(Elem, AccIn) -> AccOut end\`. \`Elem\` is first, \`Acc\` is second!

## Assignment Specification

Module: \`hof_fold\` · Export: \`sum_ledger/1\`, \`build_index/1\`, \`count_frequencies/1\`
1. \`sum_ledger(Entries)\`:
   - \`Entries\`: list of \`{entry, Amount, Type}\` where \`Type\` is \`credit\` (add) or \`debit\` (subtract).
   - Use \`lists:foldl/3\` starting with \`Acc = 0\` to calculate net balance.
2. \`build_index(Items)\`:
   - \`Items\`: list of \`{Id, Value}\`.
   - Use \`lists:foldl/3\` to build a map: \`maps:put(Id, Value, AccMap)\` starting with \`#{}\`.
3. \`count_frequencies(List)\`:
   - Use \`lists:foldl/3\` to count element frequencies in a map \`#{Elem => Count}\` starting with \`#{}\`.

## Rules & Verification Constraints

- Must use \`lists:foldl/3\` for all 3 functions.
- Enforced by AST rule: \`requiredCalls: ["lists:foldl/3"]\`.`,
    otpDocCards: [
      {
        functionName: 'foldl',
        module: 'lists',
        signature: 'lists:foldl(Fun, Acc0, List1) -> Acc1',
        typesSpec: ['Fun = fun((T, Acc) -> Acc)', 'Acc0 = Acc1 = Acc = term()', 'List1 = [T]'],
        description: 'Folds a function over a list from left to right tail-recursively.',
        complexityNote: 'O(N) time, O(1) stack memory.',
        officialUrl: 'https://www.erlang.org/doc/man/lists.html#foldl-3',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/lists.erl#L1250',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch03-03-1',
        title: 'Sum Ledger with Credits and Debits',
        erlangCall: 'hof_fold:sum_ledger([{entry, 100, credit}, {entry, 30, debit}, {entry, 50, credit}])',
        expectedOutput: '120',
        explanation: '0 + 100 - 30 + 50 = 120.',
      },
      {
        id: 'tc-ch03-03-2',
        title: 'Build Index Map via foldl',
        erlangCall: 'hof_fold:build_index([{101, "Alice"}, {102, "Bob"}])',
        expectedOutput: '#{101 => "Alice", 102 => "Bob"}',
        explanation: 'Folds list of pairs into an immutable map.',
      },
    ],
    astRules: {
      requiredCalls: ['lists:foldl/3'],
    },
    solutionExplanation: 'Applies lists:foldl/3 with fun(Elem, Acc) accumulator updates.',
    starterCode: `-module(hof_fold).
-export([sum_ledger/1, build_index/1, count_frequencies/1]).

sum_ledger(Entries) ->
    %% % TODO: lists:foldl(fun(...) -> ... end, 0, Entries)
    0.

build_index(Items) ->
    %% % TODO: lists:foldl(fun(...) -> ... end, #{}, Items)
    #{}.

count_frequencies(List) ->
    %% % TODO: lists:foldl(fun(...) -> ... end, #{}, List)
    #{}.`,
    solutionCode: `-module(hof_fold).
-export([sum_ledger/1, build_index/1, count_frequencies/1]).

sum_ledger(Entries) ->
    lists:foldl(fun({entry, Amount, credit}, Acc) ->
        Acc + Amount;
    ({entry, Amount, debit}, Acc) ->
        Acc - Amount
    end, 0, Entries).

build_index(Items) ->
    lists:foldl(fun({Id, Value}, AccMap) ->
        maps:put(Id, Value, AccMap)
    end, #{}, Items).

count_frequencies(List) ->
    lists:foldl(fun(Elem, AccMap) ->
        Current = maps:get(Elem, AccMap, 0),
        maps:put(Elem, Current + 1, AccMap)
    end, #{}, List).`,
    files: [
      {
        path: 'src/hof_fold.erl',
        name: 'hof_fold.erl',
        content: `-module(hof_fold).
-export([sum_ledger/1, build_index/1, count_frequencies/1]).

sum_ledger(Entries) ->
    %% % TODO: lists:foldl(fun(...) -> ... end, 0, Entries)
    0.

build_index(Items) ->
    %% % TODO: lists:foldl(fun(...) -> ... end, #{}, Items)
    #{}.

count_frequencies(List) ->
    %% % TODO: lists:foldl(fun(...) -> ... end, #{}, List)
    #{}.`,
      },
    ],
    solutionFiles: {
      'src/hof_fold.erl': `-module(hof_fold).
-export([sum_ledger/1, build_index/1, count_frequencies/1]).

sum_ledger(Entries) ->
    lists:foldl(fun({entry, Amount, credit}, Acc) ->
        Acc + Amount;
    ({entry, Amount, debit}, Acc) ->
        Acc - Amount
    end, 0, Entries).

build_index(Items) ->
    lists:foldl(fun({Id, Value}, AccMap) ->
        maps:put(Id, Value, AccMap)
    end, #{}, Items).

count_frequencies(List) ->
    lists:foldl(fun(Elem, AccMap) ->
        Current = maps:get(Elem, AccMap, 0),
        maps:put(Elem, Current + 1, AccMap)
    end, #{}, List).`,
    },
    references: [
      {
        title: 'lists:foldl/3 Implementation in OTP source',
        url: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/lists.erl',
        category: 'github_otp',
        description: 'Read the exact 4-line tail-recursive definition of foldl in the official OTP repository.',
      },
    ],
  },

  // ── Lesson 3.4: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch03-l04',
    chapterNumber: 3,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'List Comprehensions ([Expr || Generator, Filter])',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

List comprehensions offer a concise, mathematical syntax for querying, filtering, and joining collections without nested loops or verbose lambda functions. In network routing, SQL/ETS query preparation, and matrix coordinate mapping, list comprehensions produce clean, declarative code that the BEAM compiler optimizes into fast local loops.

## Deep Concept Breakdown & Under the Hood

A list comprehension consists of an output expression followed by \`||\`, one or more **generators** (\`Pattern <- List\`), and optional **filter predicates**:
\`\`\`erlang
[Expr || Pattern <- GeneratorList, FilterPredicate]
\`\`\`

### Multiple Generators (Cartesian Products)
When multiple generators are specified, the rightmost generator iterates fastest:
\`\`\`erlang
[{X, Y} || X <- [1, 2], Y <- [a, b]]
%% => [{1, a}, {1, b}, {2, a}, {2, b}]
\`\`\`

### Pattern Filters in Generators
If an element does not match the generator's pattern, it is silently skipped:
\`\`\`erlang
Users = [{user, 1, active}, {guest, 2}, {user, 3, suspended}],
[Id || {user, Id, active} <- Users]
%% => [1]
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% List comprehension syntax
[Expression || Qualifier1, Qualifier2, ...]
\`\`\`
> The BEAM compiler expands list comprehensions into efficient tail-recursive local functions with accumulator lists.

## Assignment Specification

Module: \`comprehension_queries\` · Export: \`active_user_emails/1\`, \`matrix_cartesian/2\`, \`filter_even_squares/1\`
1. \`active_user_emails(Users)\`:
   - \`Users\`: list of \`{user, Id, Email, Status}\`.
   - Uses list comprehension to extract \`Email\` for all users where \`Status =:= active\`.
2. \`matrix_cartesian(Xs, Ys)\`:
   - Uses list comprehension with two generators to return all pairs \`{X, Y}\`.
3. \`filter_even_squares(Numbers)\`:
   - Uses list comprehension to calculate \`N * N\` for all numbers in \`Numbers\` where \`N rem 2 =:= 0\`.

## Rules & Verification Constraints

- Must use list comprehension syntax \`[... || ...]\` across all 3 functions.
- Enforced by AST rule: \`requiredConstructs: ["list_comprehension"]\`.`,
    otpDocCards: [
      {
        functionName: 'list_comprehensions',
        module: 'erlang',
        signature: '[Output || Pattern <- List, Predicate]',
        typesSpec: ['Pattern <- List denotes generator', 'Predicate denotes boolean guard'],
        description: 'Syntactic sugar for declarative map/filter/cross-join operations.',
        complexityNote: 'Compiled into optimized tail-recursive loops in BEAM bytecode.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/expressions.html#list-comprehensions',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch03-04-1',
        title: 'Extract Active User Emails',
        erlangCall: 'comprehension_queries:active_user_emails([{user, 1, <<"alice@otp.org">>, active}, {user, 2, <<"bob@erl.org">>, suspended}])',
        expectedOutput: '[<<"alice@otp.org">>]',
        explanation: 'Filters matching active status and extracts email string.',
      },
      {
        id: 'tc-ch03-04-2',
        title: 'Matrix Cartesian Cross Join',
        erlangCall: 'comprehension_queries:matrix_cartesian([1, 2], [x, y])',
        expectedOutput: '[{1, x}, {1, y}, {2, x}, {2, y}]',
        explanation: 'Generates all combinations of X and Y.',
      },
      {
        id: 'tc-ch03-04-3',
        title: 'Squares of Even Numbers',
        erlangCall: 'comprehension_queries:filter_even_squares([1, 2, 3, 4, 5, 6])',
        expectedOutput: '[4, 16, 36]',
        explanation: 'Filters evens [2, 4, 6] and returns squares.',
      },
    ],
    astRules: {
      requiredConstructs: ['list_comprehension'],
    },
    solutionExplanation: 'Uses [Email || {user, _, Email, active} <- Users] and related comprehension forms.',
    starterCode: `-module(comprehension_queries).
-export([active_user_emails/1, matrix_cartesian/2, filter_even_squares/1]).

active_user_emails(Users) ->
    %% % TODO: [Email || {user, _, Email, active} <- Users]
    [].

matrix_cartesian(Xs, Ys) ->
    %% % TODO: [{X, Y} || X <- Xs, Y <- Ys]
    [].

filter_even_squares(Numbers) ->
    %% % TODO: [X * X || X <- Numbers, X rem 2 =:= 0]
    [].`,
    solutionCode: `-module(comprehension_queries).
-export([active_user_emails/1, matrix_cartesian/2, filter_even_squares/1]).

active_user_emails(Users) ->
    [Email || {user, _Id, Email, active} <- Users].

matrix_cartesian(Xs, Ys) ->
    [{X, Y} || X <- Xs, Y <- Ys].

filter_even_squares(Numbers) ->
    [X * X || X <- Numbers, is_integer(X), X rem 2 =:= 0].`,
    files: [
      {
        path: 'src/comprehension_queries.erl',
        name: 'comprehension_queries.erl',
        content: `-module(comprehension_queries).
-export([active_user_emails/1, matrix_cartesian/2, filter_even_squares/1]).

active_user_emails(Users) ->
    %% % TODO: [Email || {user, _, Email, active} <- Users]
    [].

matrix_cartesian(Xs, Ys) ->
    %% % TODO: [{X, Y} || X <- Xs, Y <- Ys]
    [].

filter_even_squares(Numbers) ->
    %% % TODO: [X * X || X <- Numbers, X rem 2 =:= 0]
    [].`,
      },
    ],
    solutionFiles: {
      'src/comprehension_queries.erl': `-module(comprehension_queries).
-export([active_user_emails/1, matrix_cartesian/2, filter_even_squares/1]).

active_user_emails(Users) ->
    [Email || {user, _Id, Email, active} <- Users].

matrix_cartesian(Xs, Ys) ->
    [{X, Y} || X <- Xs, Y <- Ys].

filter_even_squares(Numbers) ->
    [X * X || X <- Numbers, is_integer(X), X rem 2 =:= 0].`,
    },
    references: [
      {
        title: 'List Comprehensions Reference',
        url: 'https://www.erlang.org/doc/reference_manual/expressions.html#list-comprehensions',
        category: 'erlang_docs',
        description: 'Specification of list comprehension semantics and multiple generator iteration.',
      },
    ],
  },

  // ── Lesson 3.5: Problem Set ──────────────────────────────────────────────
  {
    id: 'ch03-l05',
    chapterNumber: 3,
    lessonNumber: 5,
    lessonType: 'problem_set',
    title: 'Problem Set: Refactoring Inventory Analytics & SLA Log Aggregator',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In Chapter 2, you wrote \`inventory.erl\` using manual accumulator loops to understand BEAM TCO. In this problem set, you will refactor real-world inventory analytics and network SLA log aggregators into clean, expressive pipelines using \`lists:foldl/3\` and \`lists:filtermap/2\`.

## Deep Concept Breakdown & Under the Hood

Standard higher-order functions allow expressing complex business rules in a fraction of the code while retaining full \`O(N)\` runtime efficiency and constant stack guarantees.

\`\`\`erlang
%% Aggregating metrics with foldl:
Total = lists:foldl(fun({product, _, _, Price, Stock}, Acc) ->
    Acc + (Price * Stock)
end, 0, Inventory).
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Standard library higher-order functions
lists:foldl(Fun, Acc0, List1) -> Acc1
lists:filtermap(Fun, List1) -> List2
\`\`\`

## Assignment Specification

Module: \`inventory_hof\`
Exports: \`total_inventory_valuation/1\`, \`critical_stock_alerts/2\`, \`aggregate_sla_logs/1\`

1. \`total_inventory_valuation(Inventory)\`:
   - \`Inventory\`: list of \`{product, Id, Name, Price, Stock}\`.
   - Uses \`lists:foldl/3\` to calculate the sum total value of all stock: \`Sum(Price * Stock)\`.
2. \`critical_stock_alerts(Inventory, Threshold)\`:
   - Uses \`lists:filtermap/2\` in a single pass:
     - For products where \`Stock =< Threshold\`, emit \`{true, {alert, Id, Name, Stock}}\`.
     - For products above \`Threshold\`, return \`false\`.
3. \`aggregate_sla_logs(Logs)\`:
   - \`Logs\`: list of \`{log, Endpoint, LatencyMs, Status}\`.
   - Uses \`lists:foldl/3\` to return a summary map:
     \`\`\`erlang
     #{total_requests => Count,
       error_count    => ErrorCount,
       total_latency  => SumLatency}
     \`\`\`
     where \`Status =:= error\` increments \`error_count\`.

## Rules & Verification Constraints

- Must use \`lists:foldl/3\` for \`total_inventory_valuation/1\` and \`aggregate_sla_logs/1\`.
- Must use \`lists:filtermap/2\` for \`critical_stock_alerts/2\`.
- Enforced by AST rule: \`requiredCalls: ["lists:foldl/3", "lists:filtermap/2"]\`.`,
    otpDocCards: [
      {
        functionName: 'foldl',
        module: 'lists',
        signature: 'lists:foldl(Fun, Acc0, List1) -> Acc1',
        typesSpec: ['Fun = fun((T, Acc) -> Acc)', 'Acc0 = Acc1 = Acc = term()'],
        description: 'Tail-recursive collection reduction and state accumulation.',
        complexityNote: 'O(N) time, O(1) stack space.',
        officialUrl: 'https://www.erlang.org/doc/man/lists.html#foldl-3',
      },
      {
        functionName: 'filtermap',
        module: 'lists',
        signature: 'lists:filtermap(Fun, List1) -> List2',
        typesSpec: ['Fun = fun((T) -> boolean() | {true, Out})', 'List1 = [T]', 'List2 = [Out]'],
        description: 'Single-pass filter and transform.',
        complexityNote: 'O(N) time, half the allocations of map(filter()).',
        officialUrl: 'https://www.erlang.org/doc/man/lists.html#filtermap-2',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch03-05-1',
        title: 'Calculate Total Inventory Valuation via foldl',
        erlangCall: 'inventory_hof:total_inventory_valuation([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 4}])',
        expectedOutput: '600',
        explanation: '(50 * 10) + (25 * 4) = 500 + 100 = 600.',
      },
      {
        id: 'tc-ch03-05-2',
        title: 'Detect Critical Stock Alerts via filtermap',
        erlangCall: 'inventory_hof:critical_stock_alerts([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 2}], 3)',
        expectedOutput: '[{alert, 2, "Mouse", 2}]',
        explanation: 'Mouse has stock 2 <= threshold 3.',
      },
      {
        id: 'tc-ch03-05-3',
        title: 'Aggregate SLA Logs via foldl',
        erlangCall: 'inventory_hof:aggregate_sla_logs([{log, <<"/api">>, 40, ok}, {log, <<"/api">>, 120, error}])',
        expectedOutput: '#{error_count => 1, total_latency => 160, total_requests => 2}',
        explanation: 'Folds requests into summary metric map.',
      },
    ],
    astRules: {
      requiredCalls: ['lists:foldl/3', 'lists:filtermap/2'],
    },
    solutionExplanation: 'Concise, idiomatic higher-order refactoring leveraging foldl and filtermap.',
    starterCode: `-module(inventory_hof).
-export([total_inventory_valuation/1, critical_stock_alerts/2, aggregate_sla_logs/1]).

total_inventory_valuation(Inventory) ->
    %% % TODO: use lists:foldl/3
    0.

critical_stock_alerts(Inventory, Threshold) ->
    %% % TODO: use lists:filtermap/2
    [].

aggregate_sla_logs(Logs) ->
    %% % TODO: use lists:foldl/3 returning #{total_requests => N, error_count => E, total_latency => L}
    #{total_requests => 0, error_count => 0, total_latency => 0}.`,
    solutionCode: `-module(inventory_hof).
-export([total_inventory_valuation/1, critical_stock_alerts/2, aggregate_sla_logs/1]).

total_inventory_valuation(Inventory) ->
    lists:foldl(fun({product, _Id, _Name, Price, Stock}, Acc) ->
        Acc + (Price * Stock)
    end, 0, Inventory).

critical_stock_alerts(Inventory, Threshold) ->
    lists:filtermap(fun({product, Id, Name, _Price, Stock}) when Stock =< Threshold ->
        {true, {alert, Id, Name, Stock}};
    (_) ->
        false
    end, Inventory).

aggregate_sla_logs(Logs) ->
    Initial = #{total_requests => 0, error_count => 0, total_latency => 0},
    lists:foldl(fun({log, _Endpoint, Latency, Status}, Acc) ->
        ErrInc = if Status =:= error -> 1; true -> 0 end,
        Acc#{
            total_requests => maps:get(total_requests, Acc) + 1,
            error_count    => maps:get(error_count, Acc) + ErrInc,
            total_latency  => maps:get(total_latency, Acc) + Latency
        }
    end, Initial, Logs).`,
    files: [
      {
        path: 'src/inventory_hof.erl',
        name: 'inventory_hof.erl',
        content: `-module(inventory_hof).
-export([total_inventory_valuation/1, critical_stock_alerts/2, aggregate_sla_logs/1]).

total_inventory_valuation(Inventory) ->
    %% % TODO: use lists:foldl/3
    0.

critical_stock_alerts(Inventory, Threshold) ->
    %% % TODO: use lists:filtermap/2
    [].

aggregate_sla_logs(Logs) ->
    %% % TODO: use lists:foldl/3 returning #{total_requests => N, error_count => E, total_latency => L}
    #{total_requests => 0, error_count => 0, total_latency => 0}.`,
      },
    ],
    solutionFiles: {
      'src/inventory_hof.erl': `-module(inventory_hof).
-export([total_inventory_valuation/1, critical_stock_alerts/2, aggregate_sla_logs/1]).

total_inventory_valuation(Inventory) ->
    lists:foldl(fun({product, _Id, _Name, Price, Stock}, Acc) ->
        Acc + (Price * Stock)
    end, 0, Inventory).

critical_stock_alerts(Inventory, Threshold) ->
    lists:filtermap(fun({product, Id, Name, _Price, Stock}) when Stock =< Threshold ->
        {true, {alert, Id, Name, Stock}};
    (_) ->
        false
    end, Inventory).

aggregate_sla_logs(Logs) ->
    Initial = #{total_requests => 0, error_count => 0, total_latency => 0},
    lists:foldl(fun({log, _Endpoint, Latency, Status}, Acc) ->
        ErrInc = if Status =:= error -> 1; true -> 0 end,
        Acc#{
            total_requests => maps:get(total_requests, Acc) + 1,
            error_count    => maps:get(error_count, Acc) + ErrInc,
            total_latency  => maps:get(total_latency, Acc) + Latency
        }
    end, Initial, Logs).`,
    },
    references: [
      {
        title: 'OTP Design Patterns with Higher-Order Functions',
        url: 'https://www.erlang.org/doc/efficiency_guide/list_handling.html',
        category: 'erlang_docs',
        description: 'How Erlang standard library lists operations optimize memory allocation.',
      },
    ],
  },
];

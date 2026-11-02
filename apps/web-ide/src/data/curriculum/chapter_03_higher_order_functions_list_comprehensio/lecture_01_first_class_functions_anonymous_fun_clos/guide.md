## Why This Matters in Production

In distributed systems, microservices, and asynchronous event-driven pipelines, hardcoding business logic inside rigid control flow leads to brittle, repetitive code. For example, an e-commerce platform needs different calculation engines for VIP users, wholesale bulk buyers, and retail customers; a payment processor needs configurable validation hooks before authorizing a charge.

In imperative languages, passing functions around often involves verbose interface declarations, function pointers, or anonymous delegates.

In Erlang, functions are **First-Class Citizens** (of primitive data type `fun()`). A function is a value just like an integer, an atom, or a tuple:
1. You can bind a function to a variable.
2. You can pass a function as an argument to another function.
3. You can return a function from another function (a function factory).
4. You can store functions inside tuples and lists.

## Deep Concept Breakdown & Under the Hood

### 1. Anonymous Functions (`fun (...) -> ... end`) & Lexical Closures
An anonymous function (or *lambda*) is declared using the `fun` keyword:

```erlang
Double = fun(X) -> X * 2 end,
Double(5).  %% => 10
```

When an anonymous function references a variable defined outside its own argument list, it **closes over** that variable. This construct is called a **Lexical Closure**:

```erlang
make_scaler(Factor) ->
    %% Factor is captured from the enclosing scope:
    fun(Value) -> Value * Factor end.
```

Under the hood, the BEAM VM allocates a special closure header on the process heap containing:
- An entry pointer to the compiled bytecode for the lambda.
- An **environment vector** holding pointers to all captured immutable variables (`Factor`).
Because Erlang data terms are strictly immutable, closures are 100% thread-safe and free from race conditions!

### 2. Multi-Clause Anonymous Functions
Just like top-level named functions, anonymous `fun` expressions can have multiple pattern-matching clauses separated by semicolons (`;`):

```erlang
SafeUnwrap = fun
    ({ok, Value}) -> Value;
    ({error, _Reason}) -> default_value
end.
```

> [!warning] Common Beginner Syntax Trap: The Punctuation of fun Clauses
> In a multi-clause `fun`, you do NOT repeat the `fun` keyword for subsequent clauses.
> Separate clauses with semicolons (`;`), and terminate the entire construct with `end`.
> Note that in anonymous functions, all clauses must have the exact same arity!

### 3. Function Captures (`fun Local/Arity` and `fun Mod:Fun/Arity`)
Frequently, you want to pass an existing named function as an argument. Instead of wrapping it in a redundant closure like `fun(X) -> erlang:abs(X) end`, Erlang provides the **Function Capture Operator**:

```erlang
%% Local function capture:
LocalRef = fun my_helper/1,

%% Remote function capture:
AbsRef = fun erlang:abs/1,
AbsRef(-42).  %% => 42
```

**Why Remote Captures Matter for Hot Code Reloading:**
When you capture a remote function using `fun Module:Function/Arity`, the BEAM VM does not resolve the bytecode to a static address. Instead, it performs dynamic dispatch through the BEAM export table. If `Module` is recompiled and reloaded in a live production node, future invocations of that capture automatically execute the **newest code version** without restarting the process!

### 4. Guard Checking with `is_function/2`
When accepting functions as arguments in production, always guard your function heads using the `is_function/2` BIF to verify both that the argument is a function and that it expects the correct number of arguments:

```erlang
execute_unary_operation(F, Arg) when is_function(F, 1) ->
    F(Arg);
execute_unary_operation(_Invalid, _Arg) ->
    {error, bad_function}.
```

## Parallel Worked Example

Consider a message filtering factory in a telecom switch:

```erlang
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
```

## Official Erlang Docs & Function Reference

```erlang
%% Anonymous Closure Syntax
fun (Arg1, Arg2) -> Body end

%% Function Capture Syntax
fun FunctionName/Arity
fun ModuleName:FunctionName/Arity

%% Guard BIFs
is_function(Term) -> boolean()
is_function(Term, Arity) -> boolean()
```

## Assignment Specification

Implement four higher-order functions in `src/hof_basics.erl`:

1. `make_multiplier(Factor)`:
   - Takes a number `Factor` and returns an anonymous closure `fun(X) -> X * Factor end`.
2. `apply_twice(F, X)`:
   - Guards with `when is_function(F, 1)`.
   - Applies `F` to `X`, and then applies `F` to that result: returns `F(F(X))`.
3. `math_capture()`:
   - Returns a function capture reference to `erlang:abs/1`: `fun erlang:abs/1`.
4. `choose_pricing_strategy(Tier)`:
   - If `Tier =:= vip`, returns a closure `fun(Price) -> (Price * 80) div 100 end` (20% discount).
   - If `Tier =:= wholesale`, returns a closure `fun(Price) -> (Price * 70) div 100 end` (30% discount).
   - Any other tier returns an identity closure `fun(Price) -> Price end`.

## Rules & Verification Constraints

- All arithmetic must use integer operators (`*`, `div`).
- Strictly no Maps (`#{}`) or Bit-Syntax Binaries (`<<...>>`). Use integers, atoms, tuples, and functions only.
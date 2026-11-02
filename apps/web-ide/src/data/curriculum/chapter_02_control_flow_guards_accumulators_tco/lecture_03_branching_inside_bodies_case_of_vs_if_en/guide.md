## Why This Matters in Production

While multi-clause function heads are the primary dispatch mechanism in Erlang, real-world systems frequently need to branch **in the middle of a function body** based on the result of an intermediate computation (such as calling a database, decoding a JSON envelope, or parsing an HTTP response).

In Erlang, inline branching is handled with `case...of` and `if...end`. Understanding the operational differences between them will prevent runtime `if_clause` crashes in production services.

## Deep Concept Breakdown & Under the Hood

### 1. `case Expression of` (The Workhorse of Erlang)
The `case...of` construct evaluates an arbitrary expression, and then pattern-matches the resulting value against one or more branches:

```erlang
case http_client:get(Url) of
    {ok, 200, Body} ->
        {ok, process_body(Body)};
    {ok, 404, _} ->
        {error, not_found};
    {error, Reason} ->
        {error, {network_failure, Reason}}
end
```

Clauses inside `case...of` support all features of function heads: nested pattern destructuring, guard clauses (`when`), and wildcard matching (`_`).

### 2. `if...end` (Pure Guard Evaluation)
Unlike `if` in languages like C, Java, or JavaScript, **Erlang's `if` statement does NOT evaluate truthy/falsy booleans**. It evaluates **Guard Expressions**!

```erlang
grade_score(Score) ->
    if
        Score >= 90 -> 'A';
        Score >= 80 -> 'B';
        true -> 'F'   %% Mandatory catch-all!
    end.
```

### 3. The Dreaded `if_clause` Runtime Crash
In Erlang, if none of the guard conditions in an `if...end` block evaluate to `true`, the BEAM VM crashes immediately with an `{if_clause}` runtime error!

To prevent this, Erlang programs using `if` must always include a final **`true ->` branch** as the fallback catch-all.

> [!warning] Common Beginner Syntax Trap: Why Erlang Pros Avoid if...end
> Because `if...end` can only evaluate guard BIFs (and not pattern matching or arbitrary expressions), and crashes if `true ->` is omitted, experienced Erlang engineers use `case...of` or multi-clause functions 95% of the time.

## Parallel Worked Example

Managing database transaction states:

```erlang
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
```

## Official Erlang Docs & Function Reference

```erlang
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
```

## Assignment Specification

Implement two flow control functions in `flow_control.erl`:

1. `handle_http_response(Response)`:
   - Uses `case Response of` to inspect incoming 3-tuples: `{http_response, StatusCode, Body}`.
   - If `StatusCode =:= 200`, returns `{ok, Body}`.
   - If `StatusCode =:= 401` or `StatusCode =:= 403`, returns `{error, unauthorized}`.
   - If `StatusCode >= 500` and `StatusCode =< 599`, returns `{error, server_error}`.
   - Any other status code returns `{error, {unexpected_status, StatusCode}}`.
   - Any other malformed input returns `{error, invalid_response}`.

2. `grade_latency(LatencyMs)`:
   - Uses `if...end` to classify integer millisecond latency:
     - `LatencyMs < 50` -> returns atom `optimal`
     - `LatencyMs >= 50` and `LatencyMs =< 200` -> returns atom `acceptable`
     - `true` -> returns atom `sla_breach`

## Rules & Verification Constraints

- `handle_http_response/1` must use a `case...of` expression.
- `grade_latency/1` must use an `if...end` expression with a `true ->` catch-all.
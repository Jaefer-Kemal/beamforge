## Why This Matters in Production

In systems languages like C++ or Rust, resource cleanup is automated using RAII (Resource Acquisition Is Initialization) or smart pointers. In Python, it is handled by `with` statement context managers.

Erlang does **not** have RAII destructors. Operating system resources—such as open file descriptors (`file:open/2`), network sockets (`gen_tcp`), or database handles—are tied to the lifetime of the process holding them. If a long-running process encounters an exception while streaming records from a file or socket without closing the descriptor, that file handle remains locked in the OS table until the process eventually exits. Over thousands of requests, this leads to **descriptor exhaustion** (`EMFILE: too many open files`).

To guarantee deterministic cleanup, Erlang provides the full **4-part `try ... of ... catch ... after`** expression.

## Deep Concept Breakdown & Under the Hood

### 1. The Full `try ... of ... catch ... after` Syntax

```erlang
try AcquireOrComputeExpr of
    SuccessfulPattern ->
        ResultBody
catch
    Class:Reason:Stacktrace ->
        ErrorHandlerBody
after
    %% GUARANTEED TO RUN 100% OF THE TIME!
    ReleaseResourceFun(Handle)
end
```

1. **Why the `of` Clause is Structurally Crucial:**
   - The expression between `try` and `of` (`AcquireOrComputeExpr`) is the protected operation.
   - If you place `ResultBody` inside the `try` head itself, any accidental exception raised inside your result processing logic will get swallowed by the `catch` block!
   - Putting `SuccessfulPattern -> ResultBody` inside `of` ensures that exceptions raised inside `ResultBody` are **NOT caught** by this `catch` block unless intended.
2. **The `after` Invariant:**
   - The code inside `after` is **guaranteed to execute**, whether the `try` block finishes normally, catches a throw, or unwinds from an unhandled error or exit.
   - The return value of the `after` block is **silently discarded**; the entire expression evaluates to the result of the `of` branch or `catch` branch!

### 2. Boundary Deserialization with `erlang:binary_to_term(Bin, [safe])`
When receiving serialized Erlang terms from network clients, calling raw `binary_to_term(Bin)` is an extreme security risk. A malicious client could stream arbitrary binary payloads that create millions of new atoms. Because atoms are stored in an un-garbage-collected global atom table with a default limit of 1,048,576 atoms, the node will crash with an out-of-memory error.

Passing **`[safe]`** instructs ERTS to only decode atoms that **already exist** on the node. If the binary references an unknown atom, it raises `error:badarg`, which we cleanly intercept inside `try ... catch`:

```erlang
safe_parse(Bin) ->
    try erlang:binary_to_term(Bin, [safe]) of
        Term -> {ok, Term}
    catch
        error:badarg -> {error, invalid_or_unsafe_term}
    end.
```

## Parallel Worked Example

The following module wraps transaction file processing with an assured close notification:

```erlang
-module(secure_blob_reader).
-export([read_blob_safe/1, with_lease/3]).

read_blob_safe(Bin) when is_binary(Bin) ->
    try erlang:binary_to_term(Bin, [safe]) of
        Term -> {ok, Term}
    catch
        Class:Reason -> {error, {Class, Reason}}
    end.

with_lease(AcquireFun, ActionFun, ReleaseFun) ->
    Resource = AcquireFun(),
    try ActionFun(Resource) of
        Success -> {ok, Success}
    catch
        Class:Reason -> {error, {Class, Reason}}
    after
        ReleaseFun(Resource)
    end.
```

## Official Erlang Docs & Function Reference

```erlang
%% BIF: erlang (erts)
erlang:binary_to_term(Binary, Options) -> Term
  Types:
    Binary = binary()
    Options = [safe | used]
    Term = term()
```

## Assignment Specification

Implement `src/boundary_parser.erl` exporting `safe_parse_payload/1`, `with_resource_cleanup/3`, and `process_transaction_log/2`:

1. `safe_parse_payload(Binary)`:
   - Uses `try erlang:binary_to_term(Binary, [safe]) of Term -> {ok, Term} catch Class:Reason -> {error, {Class, Reason}} end`.
2. `with_resource_cleanup(AcquireFun, ActionFun, ReleaseFun)`:
   - Acquires `Resource = AcquireFun()`.
   - Runs `ActionFun(Resource)` inside `try ... of ... catch ... after`.
   - Guarantees `ReleaseFun(Resource)` executes in the `after` block regardless of outcome.
   - Returns `{ok, Result}` on success, or `{error, {Class, Reason}}` on failure.
3. `process_transaction_log(LinesList, CloseNotifyPid)`:
   - Processes lines in `LinesList`. If any line equals `<<"CORRUPT_LINE">>`, raises `erlang:error(transaction_processing_failed)`.
   - In all cases, the `after` block **must** send `CloseNotifyPid ! file_handle_closed`.
   - Returns `{ok, length(LinesList)}` on success or `{error, {error, transaction_processing_failed}}` on failure.

## Rules & Verification Constraints

- Must export `safe_parse_payload/1`, `with_resource_cleanup/3`, `process_transaction_log/2`.
- Enforced AST rules: `requiredConstructs: ["try_catch"]`, `requiredCalls: ["erlang:binary_to_term/2"]`.

## Why This Matters in Production

While maps provide dynamic key flexibility, **records** provide named field access with **zero runtime lookup overhead**.

In Erlang, records are not a runtime data type! The BEAM compiler translates records directly into standard tagged tuples:
`#frame{seq = 1, type = ack, payload = ok}` literally becomes `{frame, 1, ack, ok}` in `.beam` bytecode.
In ultra-low-latency protocol engines (such as telecommunication packet switches and financial matching engines), records eliminate hash lookups and key dictionaries entirely.

## Deep Concept Breakdown & Under the Hood

### 1. Record Declaration & Compilation
A record is declared at module level using the `-record` directive:

```erlang
-record(frame, {
    seq = 0       :: non_neg_integer(),
    type = data   :: atom(),
    payload       :: term()
}).
```

When compiled:
- Construction: `#frame{seq = 10, type = syn, payload = ping}` compiles into `{frame, 10, syn, ping}`.
- Field Extraction: `Frame#frame.seq` compiles directly to the `element(2, Frame)` BIF.
- Field Update: `Frame#frame{seq = 11}` compiles to `setelement(2, Frame, 11)`.

### 2. The Secret Superpower: `#RecordName.FieldName` Index
Notice the difference between accessing a field on a variable vs writing the record name directly:
- `MyVar#frame.seq` extracts the value of `seq` from the record stored in `MyVar`.
- **`#frame.seq`** (without a variable prefix) is a **compile-time macro** that evaluates to the **integer index position** of `seq` inside the underlying tuple!

In `-record(frame, {seq = 0, type = data, payload})`:
- Position 1 is the tag: `frame`
- Position 2 is `seq` $ightarrow$ `#frame.seq` evaluates to `2`!
- Position 3 is `type` $ightarrow$ `#frame.type` evaluates to `3`!
- Position 4 is `payload` $ightarrow$ `#frame.payload` evaluates to `4`!

#### Why Does This Matter for OTP?
In Chapter 3 Lesson 3.5, you used `lists:keyfind(Id, 2, List)` where the magic number `2` had to be hardcoded.
With records, you write:
```erlang
lists:keyfind(TargetSeq, #frame.seq, FrameList)
```
If you ever add a new field to `#frame` in the future, the compiler automatically recalculates the position integer everywhere! You never suffer from off-by-one magic number bugs.

> [!warning] Common Beginner Trap: The Dot on Record Updates
> - **Extraction:** `Var#rec.field` (dot before field name).
> - **Update:** `Var#rec{field = NewVal}` (**NO dot** before the curly brace!).
> Writing `Var.#rec{...}` is an immediate compile syntax error.

## Parallel Worked Example

Consider a message broker routing queue tasks:

```erlang
-module(task_queue).
-export([make_task/3, bump_priority/1, get_priority_keypos/0, find_task/2]).

-record(task, {id, priority = 1, payload}).

%% 1. Record instantiation
make_task(Id, Priority, Payload) ->
    #task{id = Id, priority = Priority, payload = Payload}.

%% 2. Record immutable update
bump_priority(#task{priority = P} = Task) ->
    Task#task{priority = P + 1}.

%% 3. Tuple position inspection (#task.id evaluates to 2)
get_priority_keypos() ->
    #task.priority.

%% 4. Using compile-time index with lists:keyfind
find_task(TaskList, TargetId) ->
    case lists:keyfind(TargetId, #task.id, TaskList) of
        {task, TargetId, _, _} = T -> {ok, T};
        false -> not_found
    end.
```

## Official Erlang Docs & Function Reference

```erlang
%% Record definition
-record(Name, {Field1 = Default1, Field2, ...}).

%% Record operations
#Name{Field1 = Value1}
Var#Name.Field1
Var#Name{Field1 = NewValue}
#Name.Field1  %% Evaluates to integer tuple position
```

## Assignment Specification

Implement record framing in `src/record_frames.erl`:

1. Define record: `-record(frame, {seq = 0, type = data, payload}).`
2. `new_frame(Seq, Type, Payload)`:
   - Returns `#frame{seq = Seq, type = Type, payload = Payload}`.
3. `advance_seq(Frame)`:
   - Matches `#frame{seq = S} = Frame` and returns `Frame#frame{seq = S + 1}`.
4. `frame_seq_index()`:
   - Returns the compile-time position integer `#frame.seq` (which evaluates to `2`).
5. `find_frame_by_seq(FrameList, TargetSeq)`:
   - Uses `lists:keyfind(TargetSeq, #frame.seq, FrameList)`.
   - Returns `{ok, Frame}` if found, or `not_found` if `false`.

## Rules & Verification Constraints

- Must define `-record(frame, {...})`.
- Must use `lists:keyfind/3` with `#frame.seq` integer index.
- Payload can be any atom, integer, or tuple. (Binaries are formally introduced in Lesson 4.4!).
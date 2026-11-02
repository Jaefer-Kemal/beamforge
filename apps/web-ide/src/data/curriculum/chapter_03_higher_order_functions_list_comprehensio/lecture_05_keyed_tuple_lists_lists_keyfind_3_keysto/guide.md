## Why This Matters in Production

In Chapter 2 (`inventory.erl`), you wrote recursive lookup and update functions to find and modify tuples in a list like `[{product, Id, Name, Price, Stock}, ...]`.

Because managing collections of structured tuples is so fundamental to Erlang architectures, the Erlang Run-Time System (ERTS) includes built-in functions implemented in **highly optimized C** specifically for lists of tuples.

Furthermore, almost every OTP behaviour—from `gen_tcp:listen/2` network sockets to supervisor child specifications and `eunit` configs—accepts configuration parameters as **Property Lists (`proplists`)**.

## Deep Concept Breakdown & Under the Hood

### 1. Keyed Tuple Functions (`lists:keyfind`, `lists:keystore`)
A "Keyed List" (or keylist) is a list of tuples where one specific element position acts as the primary key.

In Erlang, element positions inside tuples are **1-indexed**:
`{product, Id, Name, Price, Stock}` $ightarrow$ Position 1 is `product`, Position 2 is `Id`, Position 3 is `Name`, etc.

#### `lists:keyfind(Key, N, TupleList) -> Tuple | false`
Searches `TupleList` in C-speed for the first tuple whose `N`-th element equals `Key`:
```erlang
Inv = [{product, 101, "Keyboard", 50, 10}, {product, 102, "Mouse", 25, 4}],
Found = lists:keyfind(102, 2, Inv).
%% => {product, 102, "Mouse", 25, 4}

Missing = lists:keyfind(999, 2, Inv).
%% => false
```

#### `lists:keystore(Key, N, TupleList, NewTuple) -> UpdatedList`
If a tuple with `Key` at position `N` exists, replaces it with `NewTuple`. If not found, appends `NewTuple` to the end of the list:
```erlang
Updated = lists:keystore(102, 2, Inv, {product, 102, "Mouse", 30, 4}).
%% Replaces product 102 in-place while keeping all other products intact!
```

### 2. Property Lists (`proplists`)
A property list is a flexible list of options where each item is either:
- A 2-tuple `{Key, Value}`, OR
- A standalone boolean atom `Key` (shorthand for `{Key, true}`).

Example socket options list:
```erlang
Opts = [binary, {packet, 4}, {active, once}, {reuseaddr, true}].
```

#### `proplists:get_value(Key, PropList, Default) -> Value`
Extracts the value associated with `Key`. If the option is missing, returns `Default`:
```erlang
PacketMode = proplists:get_value(packet, Opts, raw).      %% => 4
Port = proplists:get_value(port, Opts, 8080).             %% => 8080 (default)
```

#### `proplists:get_bool(Key, PropList) -> boolean()`
Returns `true` if `Key` or `{Key, true}` is present; returns `false` if `{Key, false}` or if `Key` is absent:
```erlang
IsBinary = proplists:get_bool(binary, Opts).              %% => true
IsKeepAlive = proplists:get_bool(keepalive, Opts).        %% => false
```

## Parallel Worked Example

Consider a server configuring worker pool settings:

```erlang
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
```

## Official Erlang Docs & Function Reference

```erlang
lists:keyfind(Key, Pos, List) -> Tuple | false
lists:keystore(Key, Pos, List, NewTuple) -> [Tuple]
proplists:get_value(Key, List, Default) -> term()
proplists:get_bool(Key, List) -> boolean()
```

## Assignment Specification

Implement three keylist and proplist functions in `src/keylist_config.erl`:

1. `find_product_by_id(Inventory, ProductId)`:
   - `Inventory` is `[{product, Id, Name, Price, Stock}, ...]`.
   - Uses `lists:keyfind(ProductId, 2, Inventory)`.
   - Returns `{ok, ProductTuple}` if found, or `{error, not_found}` if `false`.
2. `upsert_product(Inventory, {product, ProdId, _, _, _} = NewProduct)`:
   - Uses `lists:keystore(ProdId, 2, Inventory, NewProduct)` to replace the product if present or append it if absent.
   - Returns the updated inventory list.
3. `read_socket_options(OptsList)`:
   - `OptsList` is a proplist like `[binary, {port, 9000}, {active, once}]`.
   - Uses `proplists:get_value/3` to retrieve `port` (default `8080`) and `active` (default `false`).
   - Uses `proplists:get_bool/2` to retrieve `binary`.
   - Returns `{socket_cfg, Port, ActiveMode, IsBinary}`.

## Rules & Verification Constraints

- Must use `lists:keyfind/3`, `lists:keystore/4`, and `proplists:get_value/3`.
- Strictly no Maps (`#{}`) or Bit-Syntax Binaries (`<<...>>`). Use tuples, atoms, and integers only.
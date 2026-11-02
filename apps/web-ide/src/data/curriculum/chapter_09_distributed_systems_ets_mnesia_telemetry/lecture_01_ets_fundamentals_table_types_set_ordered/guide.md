## Why This Matters in Production

In mainstream backend languages such as Node.js, Python, Go, and Ruby, scaling high-throughput APIs requires deploying an external **Redis** or **Memcached** cluster over the network. Every single cache read incurs network TCP roundtrips (1–3ms), OS socket serialization, connection pooling overhead, and JSON or Protobuf parsing costs.

In Erlang and the BEAM VM, you do not need Redis for in-process memory caching. Erlang includes **ETS (Erlang Term Storage)** directly built into the BEAM virtual machine in optimized C:
1. **Zero Network Latency**: Reads and writes execute in nanoseconds directly in memory via C pointers, bypassing network stacks completely.
2. **Outside Garbage Collection (Off-Heap)**: ETS tables are allocated completely outside Erlang process heaps. An ETS table holding 10,000,000 active sessions will **never trigger garbage collection pauses** on worker processes!
3. **Hardware Lock-Free Concurrency**: By configuring `{read_concurrency, true}` and `{write_concurrency, true}`, the BEAM VM utilizes decentralized cache-line locking and lock-free read paths across all CPU cores.
4. **Hardware Atomic Operations**: Functions like `ets:update_counter/4` perform lock-free atomic increments, allowing thousands of concurrent workers to increment rate-limiters or telemetry metrics with zero race conditions.

> [!NOTE]
> **BEAM ETS vs External Cache (Redis):**
> - **External Cache (Redis):** Network hop overhead (1-2ms), JSON serialization, TCP connection pool management.
> - **BEAM ETS (In-Process Off-Heap):** Direct memory lookup via C pointers (nanosecond latency), zero garbage collection pause on process heaps, hardware lock-free atomic counters.

## Deep Concept Breakdown & Under the Hood

### The 4 ETS Table Types

When calling `ets:new(Name, Options)`, you select one of four table archetypes:
1. **`set` (Default)**: Unique keys. Exactly one tuple per key. Implemented as an $O(1)$ hash table. If you insert a tuple with an existing key, it overwrites the old tuple.
2. **`ordered_set`**: Unique keys. Keys are ordered according to Erlang term precedence (`number < atom < reference < fun < port < pid < tuple < map < list < bitstring`). Implemented as an $O(\log N)$ AVL balanced binary tree. Supports range scans and iteration via `ets:first/1`, `ets:last/1`, `ets:next/2`, and `ets:prev/2`.
3. **`bag`**: Multiple tuples can have the identical key, provided the tuples themselves are not completely identical.
4. **`duplicate_bag`**: Allows multiple identical tuples with identical keys.

### Key Position (`keypos`)

By default, Erlang uses element 1 of the stored tuple as the primary key (`{keypos, 1}`). If your tuples are tagged records like `{user_profile, UserId, Name, Role}`, you specify `{keypos, 2}` so `UserId` is the lookup index!

### Atomic Counter Modification (`ets:update_counter/4`)

```erlang
ets:update_counter(TableName, Key, {Pos, Increment}, DefaultTuple) -> NewValue
```

If `Key` exists, element `Pos` is atomically incremented by `Increment`. If `Key` does NOT exist, `DefaultTuple` is inserted atomically and then modified!

### Parallel Worked Example: In-Memory Rate Limiter

Here is how a real-world API rate limiter initializes an ETS table and records hits:

```erlang
-module(api_rate_limiter).
-export([init_limiter/0, record_request/2, check_limit/2]).

init_limiter() ->
    case ets:whereis(rate_limit_tab) of
        undefined ->
            ets:new(rate_limit_tab, [
                set,
                public,
                named_table,
                {read_concurrency, true},
                {write_concurrency, true}
            ]),
            ok;
        _ ->
            ok
    end.

record_request(ClientIpBin, Cost) ->
    %% Atomically increment hit count at tuple pos 2, defaulting to {ClientIpBin, 0}
    ets:update_counter(rate_limit_tab, ClientIpBin, {2, Cost}, {ClientIpBin, 0}).

check_limit(ClientIpBin, MaxAllowed) ->
    case ets:lookup(rate_limit_tab, ClientIpBin) of
        [{ClientIpBin, Hits}] when Hits > MaxAllowed ->
            {error, rate_limited};
        [{ClientIpBin, Hits}] ->
            {ok, Hits};
        [] ->
            {ok, 0}
    end.
```

## 📖 Official Erlang Docs & Function Reference

```erlang
%% Official ETS Calls (stdlib / ets)
ets:new(Name, Options) -> tid() | atom()
  Options = [Type | Access | named_table | {keypos, Pos} | {read_concurrency, boolean()} | {write_concurrency, boolean()}]
  Type = set | ordered_set | bag | duplicate_bag
  Access = public | protected | private

ets:insert(Tab, TupleOrList) -> true
ets:lookup(Tab, Key) -> [tuple()]
ets:update_counter(Tab, Key, {Pos, Incr}, DefaultTuple) -> integer()
```

## Assignment Specification

Implement module `ets_telemetry` exporting:
1. `init_table/0 -> ok`:
   - Creates a `named_table` named `telemetry_store` with `set`, `public`, `{read_concurrency, true}`, and `{write_concurrency, true}`.
   - If the table already exists, returns `ok`.
2. `record_endpoint_hit(EndpointBin, Incr) -> integer()`:
   - Uses `ets:update_counter/4` to increment the hit count at position 2 for key `EndpointBin` by `Incr`.
   - Default tuple if absent: `{EndpointBin, 0}`.
   - Returns the new integer hit count.
3. `get_endpoint_hits(EndpointBin) -> integer()`:
   - Returns the hit count for `EndpointBin` from `telemetry_store`.
   - If not found, returns `0`.
4. `put_user_profile(UserId, Name, Role) -> ok`:
   - Inserts `{{user, UserId}, Name, Role}` into `telemetry_store`.
5. `get_user_profile(UserId) -> {ok, #{name => Name, role => Role}} | {error, not_found}`:
   - Looks up `{user, UserId}`. Returns map if found, or `{error, not_found}`.

## Rules & Verification Constraints
- Table `telemetry_store` must be a named, public set.
- All counter operations must use `ets:update_counter/4`.
- All operations must succeed concurrently with zero process bottlenecking.

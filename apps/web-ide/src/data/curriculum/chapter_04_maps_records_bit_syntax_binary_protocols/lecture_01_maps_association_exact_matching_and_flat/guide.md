## Why This Matters in Production

In distributed systems, REST APIs, and actor process state stores, data structures need to evolve rapidly. While tuples require knowing exact numerical offsets and records require compile-time headers, **Maps (`#{}`)** provide arbitrary key-value associations where keys can be added, updated, or removed dynamically at runtime.

Maps are the foundation of modern Erlang architectures: they represent JSON payloads, database rows, telemetry metadata, and dynamic process state in high-throughput OTP clusters.

## Deep Concept Breakdown & Under the Hood

### 1. Two Engine Architectures: FlatMap vs. HAMT
Under the hood, the BEAM Run-Time System (ERTS) does not implement a one-size-fits-all hash table. Instead, it dynamically transitions between two distinct data representations based on key count:

1. **FlatMap (=< 32 keys):**
   - Implemented as two contiguous arrays: a sorted tuple of keys (`{K1, K2, ...}`) and an array of values (`{V1, V2, ...}`).
   - Key lookups execute via binary search in $O(log N)$ or fast linear CPU cache scans.
   - **Massive Memory Optimization:** When you update a field in a 20-key map (`Map#{status := active}`), the new map version shares the exact same key tuple pointer with the original! Only a new value tuple is allocated, drastically reducing process heap memory churn.
2. **HAMT Map (> 32 keys):**
   - Automatically promoted into a **Hash Array Mapped Trie** with 32-way branching trees.
   - Lookups and updates execute in $O(log_{32} N)$—near-constant time—with optimal structural sharing across nodes.

### 2. The Two Map Arrows: Association (`=>`) vs. Exact Matching (`:=`)
Erlang distinguishes sharply between creating/inserting a key and asserting its prior existence:

#### Association (`Key => Value`)
- Used when constructing a map or inserting/overwriting a key regardless of whether it exists.
- **Strictly Illegal in Pattern Matching!** Writing `#{user_id => UId} = Map` causes an immediate compile error.

```erlang
%% Construction:
Session0 = #{user_id => alice, role => admin, presence => offline, login_count => 0}.
```

#### Exact Match / Update (`Key := Value`)
1. **In Pattern Matching:** Matches existing keys and extracts their values. Since OTP 18, the key can even be a **previously bound variable**:
   ```erlang
   %% Matches only if Session has user_id equal to the bound variable ExpectedId:
   update_presence(#{user_id := ExpectedId, login_count := Count} = Session, ExpectedId, NewPresence)
   ```
2. **In Map Updates:** `Map#{presence := NewPresence}` asserts that `presence` already exists.
   If you make a typo like `Map#{presense := online}`, the BEAM VM **fails fast** with an immediate `{badkey, presense}` crash instead of silently corrupting your state!

> [!warning] Common Beginner Trap: The Map Arrow Inversion
> Always remember:
> - **In map pattern matching:** ALWAYS use `:=` (`#{role := admin} = Map`).
> - **When creating new maps:** Use `=>` (`#{user_id => alice}`).
> - **When updating existing fields:** Use `:=` (`Map#{presence := online}`) to catch field name typos at runtime.

### 3. Multi-Clause Matching on Map Keys
You can match specific key values directly in function heads:

```erlang
is_authorized(#{role := admin, presence := online}) -> true;
is_authorized(_) -> false.
```

## Parallel Worked Example

Consider a device registration engine in an IoT telemetry router:

```erlang
-module(device_registry).
-export([register_device/2, update_ping/3, is_active_gateway/1]).

%% 1. Construct map using =>
register_device(DeviceId, Type) ->
    #{device_id => DeviceId, type => Type, status => idle, heartbeat_count => 0}.

%% 2. Exact match on bound variable DeviceId and update using :=
update_ping(#{device_id := ExpectedId, heartbeat_count := Cnt} = Device, ExpectedId, NewStatus) ->
    Device#{status := NewStatus, heartbeat_count := Cnt + 1};
update_ping(_MismatchedDevice, _ExpectedId, _NewStatus) ->
    {error, device_mismatch}.

%% 3. Head matching on specific atom values
is_active_gateway(#{type := gateway, status := active}) -> true;
is_active_gateway(_) -> false.
```

## Official Erlang Docs & Function Reference

```erlang
%% Map construction
#{Key => Value, ...}

%% Exact pattern matching and update
#{Key := Value} = Map
Map#{Key := NewValue}
```

## Assignment Specification

Implement session state management in `src/map_registry.erl`:

1. `create_session(UserId, Role)`:
   - Returns a map with 4 fields:
     `user_id => UserId`, `role => Role`, `presence => offline`, `login_count => 0`.
2. `update_presence(Session, ExpectedUserId, NewPresence)`:
   - Matches `#{user_id := ExpectedUserId, login_count := Count} = Session`.
   - Returns the updated session map with `presence` set to `NewPresence` and `login_count` incremented by 1 using `:=`.
   - If `Session` belongs to a different user, returns `{error, session_mismatch}`.
3. `is_admin_session(Session)`:
   - Returns `true` if `Session` has `role =:= admin` and `presence =:= online`.
   - Any other map, missing field, or non-map returns `false`.

## Rules & Verification Constraints

- Must use map pattern matching with exact key matching (`:=`).
- All IDs and roles must use atoms or integers. (Binaries are formally taught in Lesson 4.4!).
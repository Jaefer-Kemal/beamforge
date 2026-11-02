## Why This Matters in Production

While pattern matching (`#{key := Val}`) is ideal when keys are guaranteed to exist, production applications constantly deal with optional configurations, dynamic metric counters, and security sanitization where keys must be inspected dynamically.

Calling `maps:get/2` on a missing key immediately raises a `{badkey, Key}` runtime exception. The OTP `maps` standard library provides safe, functional primitives to look up fallback defaults, merge configuration layers, and iterate over collections without allocating throwaway intermediate lists.

## Deep Concept Breakdown & Under the Hood

### 1. Safe Lookups: `maps:get/3` vs. `maps:find/2`
- **`maps:get(Key, Map, Default) -> Value | Default`:**
  Returns `Value` if `Key` exists; otherwise returns `Default` with zero exceptions.
- **`maps:find(Key, Map) -> {ok, Value} | error`:**
  Essential when a key might legitimately hold the value `undefined` or `false`. It unequivocally distinguishes between a missing key (`error`) and a present key with a falsy value (`{ok, false}`).

### 2. High-Performance Counters: `maps:update_with/4`
In statistics collectors and rate limiters, you often need to increment a counter for a key that may or may not exist yet.
Without `update_with`, developers write verbose 7-line `case maps:find/2 of` blocks.
With **`maps:update_with/4`**, it becomes an atomic, single-pass operation:

```erlang
maps:update_with(Key, fun(Old) -> Old + 1 end, InitialValueIfMissing, Map)
```

If `Key` exists, the fun transforms the old value. If absent, `InitialValueIfMissing` is inserted directly without evaluating the fun!

### 3. Layered Configuration Merging: `maps:merge/2` & `maps:without/2`
Production microservices merge default base settings with environment overrides:

```erlang
DefaultCfg = #{port => 8080, workers => 10, timeout => 5000},
EnvOverrides = #{workers => 50, secret_key => top_secret},
ActiveCfg = maps:merge(DefaultCfg, EnvOverrides).
%% => #{port => 8080, workers => 50, timeout => 5000, secret_key => top_secret}
```

> [!important] Rule of Precedence in maps:merge/2
> In `maps:merge(Map1, Map2)`, if a key exists in both maps, **the value from `Map2` (the second argument) ALWAYS wins!**

To strip sensitive credentials or internal debugging flags before exposing configuration to telemetry:
```erlang
Sanitized = maps:without([secret_key, debug_token], ActiveCfg).
```

### 4. Zero-List Folding: `maps:fold/3`
To aggregate all values or keys across a map, novices often write `lists:foldl(Fun, 0, maps:to_list(Map))`. This allocates an intermediate list of 2-tuples on the process heap!
**`maps:fold(fun(Key, Val, AccIn) -> AccOut end, Acc0, Map)`** iterates directly across the internal FlatMap or HAMT structures in $O(1)$ stack space without intermediate list allocations.

## Parallel Worked Example

Consider a cache coordinator managing cluster statistics:

```erlang
-module(cache_stats).
-export([fetch_stat/3, record_hit/2, combine_nodes/2, total_hits/1]).

%% Safe fallback lookup
fetch_stat(StatsMap, Metric, DefaultVal) ->
    maps:get(Metric, StatsMap, DefaultVal).

%% Atomic metric counter
record_hit(StatsMap, CacheName) ->
    maps:update_with(CacheName, fun(Count) -> Count + 1 end, 1, StatsMap).

%% Merge node metrics and strip ephemeral tokens
combine_nodes(LocalNodeMap, RemoteNodeMap) ->
    Merged = maps:merge(LocalNodeMap, RemoteNodeMap),
    maps:without([sync_token, temp_id], Merged).

%% Direct fold summation
total_hits(StatsMap) ->
    maps:fold(fun(_Name, Hits, Total) -> Total + Hits end, 0, StatsMap).
```

## Official Erlang Docs & Function Reference

```erlang
maps:get(Key, Map, Default) -> Value | Default
maps:find(Key, Map) -> {ok, Value} | error
maps:update_with(Key, Fun, Init, Map) -> Map
maps:merge(Map1, Map2) -> Map
maps:without(Ks, Map) -> Map
maps:fold(Fun, Acc0, Map) -> Acc
```

## Assignment Specification

Implement four map utility functions in `src/map_stdlib.erl`:

1. `safe_get_load(NodeMetricsMap, NodeAtom)`:
   - Uses `maps:get/3` to return the load integer for `NodeAtom`, or `0` if missing.
2. `increment_tag_counts(TagList, InitialCountsMap)`:
   - Folds over `TagList` using `lists:foldl/3`.
   - Uses `maps:update_with(Tag, fun(C) -> C + 1 end, 1, AccMap)` to count occurrences of each tag atom.
3. `merge_configs(DefaultCfgMap, UserCfgMap)`:
   - Merges `DefaultCfgMap` with `UserCfgMap` using `maps:merge/2` (user overrides win).
   - Uses `maps:without/2` to strip sensitive keys `secret_key` and `debug_token`.
4. `sum_map_values(NumericMap)`:
   - Uses `maps:fold/3` to calculate the sum of all integer values in `NumericMap`.

## Rules & Verification Constraints

- Must use `maps:get/3`, `maps:update_with/4`, `maps:merge/2`, and `maps:fold/3`.
- All keys must be atoms; values must be numbers or atoms.
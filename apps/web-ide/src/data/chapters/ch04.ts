import { LessonContent } from '../../types/workspace';

export const CHAPTER_4_LESSONS: LessonContent[] = [
  // ── Lesson 4.1: Maps Basics & Exact Matching ─────────────────────────────
  {
    id: 'ch04-l01',
    chapterNumber: 4,
    lessonNumber: 1,
    lessonType: 'concept_exercise',
    title: 'Maps (#{}): Association (=>), Exact Matching (:=), and FlatMap vs. HAMT Internals',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In distributed systems, REST APIs, and actor process state stores, data structures need to evolve dynamically. While tuples require knowing fixed numerical offsets and records require compile-time headers, **Maps (\`#{}\`)** provide arbitrary key-value associations where keys can be added, updated, or removed dynamically at runtime.

Maps are the foundation of modern Erlang architectures: they represent JSON payloads, database rows, telemetry metadata, and dynamic process state in high-throughput OTP clusters.

## Deep Concept Breakdown & Under the Hood

### 1. Two Engine Architectures: FlatMap vs. HAMT

Under the hood, the BEAM Run-Time System (ERTS) does not implement a one-size-fits-all hash table. Instead, it dynamically transitions between two distinct data representations based on key count:

1. **FlatMap (=< 32 keys):**
   - Implemented as two contiguous arrays: a sorted tuple of keys (\`{K1, K2, ...}\`) and an array of values (\`{V1, V2, ...}\`).
   - Key lookups execute via binary search in $O(\log N)$ or fast linear CPU cache scans.
   - **Massive Memory Optimization:** When you update a field in a 20-key map (\`Map#{status := active}\`), the new map version shares the exact same key tuple pointer with the original! Only a new value tuple is allocated, drastically reducing process heap memory churn.
2. **HAMT Map (> 32 keys):**
   - Automatically promoted into a **Hash Array Mapped Trie** with 32-way branching trees.
   - Lookups and updates execute in $O(\log_{32} N)$—near-constant time—with optimal structural sharing across nodes.

### 2. The Two Map Arrows: Association (\`=>\`) vs. Exact Matching (\`:=\`)

Erlang distinguishes sharply between creating/inserting a key and asserting its prior existence:

#### Association (\`Key => Value\`)
- Used when constructing a map or inserting/overwriting a key regardless of whether it exists.
- **Strictly Illegal in Pattern Matching!** Writing \`#{player_id => PId} = Map\` causes an immediate compile error.

\`\`\`erlang
%% Construction:
Profile0 = #{player_id => hero_1, class => warrior, health => 100, mana => 50}.
\`\`\`

#### Exact Match / Update (\`Key := Value\`)
1. **In Pattern Matching:** Matches existing keys and extracts their values. Since OTP 18, the key can even be a **previously bound variable**:
   \`\`\`erlang
   %% Matches only if Task has id equal to the bound variable TargetId:
   update_task_status(#{id := TargetId, retries := RetryCount} = Task, TargetId, NewStatus) ->
       Task#{status := NewStatus, retries := RetryCount + 1}.
   \`\`\`
2. **In Map Updates:** \`Map#{status := NewStatus}\` asserts that \`status\` already exists.
   If you make a typo like \`Map#{statuss := active}\`, the BEAM VM **fails fast** with an immediate \`{badkey, statuss}\` crash instead of silently corrupting your state!

> [!warning] Common Beginner Trap: The Map Arrow Inversion
> Always remember:
> - **In map pattern matching:** ALWAYS use \`:=\` (\`#{role := admin} = Map\`).
> - **When creating new maps:** Use \`=>\` (\`#{user_id => alice}\`).
> - **When updating existing fields:** Use \`:=\` (\`Map#{presence := online}\`) to catch field name typos at runtime.

### 3. Multi-Clause Matching on Map Keys

You can match specific key values directly in function heads:

\`\`\`erlang
is_primary_coordinator(#{role := coordinator, health := healthy}) -> true;
is_primary_coordinator(_) -> false.
\`\`\`

## Parallel Worked Example: IoT Device Telemetry Registry

The following module manages connected IoT devices. Notice how \`register_device/2\` constructs a map with \`=>\`, \`update_ping/3\` asserts matching identity and updates existing fields with \`:=\`, and \`is_active_gateway/1\` uses multi-clause head pattern matching:

\`\`\`erlang
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
\`\`\`

## Standard Library Function Reference

\`\`\`erlang
%% Map construction
#{Key => Value, ...}

%% Exact pattern matching and update
#{Key := Value} = Map
Map#{Key := NewValue}
\`\`\`

## Assignment Specification

Implement user session tracking functions in \`src/map_registry.erl\`:

### 1. \`create_session/2\`
- **Input**:
  - \`UserId\`: An atom or integer identifier for the user.
  - \`Role\`: An atom designating permissions (e.g., \`admin\`, \`member\`, \`guest\`).
- **Behavior**: Construct and return a map using the association operator (\`=>\`) with four initial fields:
  - \`user_id => UserId\`
  - \`role => Role\`
  - \`presence => offline\`
  - \`login_count => 0\`
- **Examples**:
  \`\`\`erlang
  map_registry:create_session(alice, admin)
  %% => #{login_count => 0, presence => offline, role => admin, user_id => alice}
  \`\`\`

### 2. \`update_presence/3\`
- **Input**:
  - \`Session\`: An existing session map.
  - \`ExpectedUserId\`: The expected user identifier atom or integer.
  - \`NewPresence\`: The updated presence atom (e.g., \`online\`, \`busy\`, \`away\`).
- **Behavior**: Update the session using exact pattern matching (\`:=\`):
  - If \`Session\` contains a \`user_id\` matching the bound argument \`ExpectedUserId\`, update the map by setting \`presence\` to \`NewPresence\` and incrementing \`login_count\` by \`1\` using the exact update operator (\`:=\`).
  - If the session belongs to a different user (the user ID does not match \`ExpectedUserId\`), return the error tuple: \`{error, session_mismatch}\`.
- **Examples**:
  \`\`\`erlang
  S0 = map_registry:create_session(alice, admin),
  map_registry:update_presence(S0, alice, online)
  %% => #{login_count => 1, presence => online, role => admin, user_id => alice}

  map_registry:update_presence(S0, bob, online)
  %% => {error, session_mismatch}
  \`\`\`

### 3. \`is_admin_session/1\`
- **Input**: Any term or map \`Session\`.
- **Behavior**: Determine whether \`Session\` corresponds to an active administrator:
  - Return \`true\` if \`Session\` is a map where \`role\` matches the atom \`admin\` and \`presence\` matches the atom \`online\`.
  - Return \`false\` for any other map, non-admin role, offline/busy state, or non-map terms.
- **Examples**:
  \`\`\`erlang
  map_registry:is_admin_session(#{role => admin, presence => online}) -> true
  map_registry:is_admin_session(#{role => admin, presence => offline}) -> false
  map_registry:is_admin_session(#{role => member, presence => online}) -> false
  \`\`\`

## Verification Constraints

- Must use map exact matching (\`:=\`) in pattern matching and state updates.
- All IDs, roles, and status fields must use atoms or integers.`,
    otpDocCards: [
      {
        functionName: 'map_expressions',
        module: 'erlang',
        signature: '#{Key => Val} / #{Key := Val}',
        typesSpec: ['Key = term()', 'Val = term()'],
        description: 'Construct, pattern match, and update associative key-value maps.',
        complexityNote: 'FlatMap for <=32 keys (shared key tuple), HAMT for >32 keys (O(log32 N)).',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/expressions.html#map-expressions',
      },
    ],
    mentalModelCheck: {
      question: 'What is the primary operational safeguard of using Map#{key := Val} over Map#{key => Val} when updating existing state?',
      options: [
        {
          id: 'A',
          label: 'Map#{key := Val} asserts that key exists, immediately raising a {badkey, key} error on typos instead of silently inserting a duplicate corrupt key',
          isCorrect: true,
          explanation: 'Using := asserts prior existence and catches typos immediately at runtime, preventing silent schema corruption.',
        },
        {
          id: 'B',
          label: 'Map#{key := Val} runs in O(1) time while => runs in O(N) time',
          isCorrect: false,
          explanation: 'Both operators use the exact same underlying FlatMap or HAMT update mechanisms.',
        },
        {
          id: 'C',
          label: 'Map#{key := Val} writes the key directly into ETS memory',
          isCorrect: false,
          explanation: 'All map updates take place on the local process heap.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch04-01-a',
        title: 'Create Session Map',
        erlangCall: 'map_registry:create_session(alice, admin)',
        expectedOutput: '#{login_count => 0, presence => offline, role => admin, user_id => alice}',
        explanation: 'Initializes map with offline presence and 0 logins.',
      },
      {
        id: 'tc-ch04-01-b',
        title: 'Update Presence with Exact Matching',
        erlangCall: 'begin S = map_registry:create_session(alice, admin), map_registry:update_presence(S, alice, online) end',
        expectedOutput: '#{login_count => 1, presence => online, role => admin, user_id => alice}',
        explanation: 'Matches alice and increments login_count to 1.',
      },
      {
        id: 'tc-ch04-01-c',
        title: 'Reject Mismatched User Update',
        erlangCall: 'begin S = map_registry:create_session(alice, admin), map_registry:update_presence(S, bob, online) end',
        expectedOutput: '{error, session_mismatch}',
        explanation: 'Returns error when session belongs to a different user.',
      },
      {
        id: 'tc-ch04-01-d',
        title: 'Verify Admin Online Session',
        erlangCall: 'begin S = map_registry:create_session(alice, admin), S2 = map_registry:update_presence(S, alice, online), map_registry:is_admin_session(S2) end',
        expectedOutput: 'true',
        explanation: 'Returns true for active online admin.',
      },
    ],
    astRules: {
      requiredConstructs: ['map_exact_match'],
    },
    solutionExplanation: 'Demonstrates map construction with =>, exact pattern matching and updates with :=, and multi-clause role verification.',
    files: [
      {
        name: 'map_registry.erl',
        path: 'src/map_registry.erl',
        content: `-module(map_registry).
-export([create_session/2, update_presence/3, is_admin_session/1]).

%% @doc Initializes a new session state map with default offline presence.
create_session(_UserId, _Role) ->
    #{}.

%% @doc Verifies user identity and updates presence while incrementing login count.
update_presence(_Session, _ExpectedUserId, _NewPresence) ->
    {error, session_mismatch}.

%% @doc Verifies whether a session possesses active online administrator privileges.
is_admin_session(_Session) ->
    false.`,
      },
    ],
    solutionFiles: {
      'src/map_registry.erl': `-module(map_registry).
-export([create_session/2, update_presence/3, is_admin_session/1]).

create_session(UserId, Role) ->
    #{
        user_id => UserId,
        role => Role,
        presence => offline,
        login_count => 0
    }.

update_presence(#{user_id := ExpectedUserId, login_count := Count} = Session, ExpectedUserId, NewPresence) ->
    Session#{
        presence := NewPresence,
        login_count := Count + 1
    };
update_presence(_Session, _ExpectedUserId, _NewPresence) ->
    {error, session_mismatch}.

is_admin_session(#{role := admin, presence := online}) ->
    true;
is_admin_session(_) ->
    false.`,
    },
    starterCode: `-module(map_registry).
-export([create_session/2, update_presence/3, is_admin_session/1]).

%% @doc Initializes a new session state map with default offline presence.
create_session(_UserId, _Role) ->
    #{}.

%% @doc Verifies user identity and updates presence while incrementing login count.
update_presence(_Session, _ExpectedUserId, _NewPresence) ->
    {error, session_mismatch}.

%% @doc Verifies whether a session possesses active online administrator privileges.
is_admin_session(_Session) ->
    false.`,
    solutionCode: `-module(map_registry).
-export([create_session/2, update_presence/3, is_admin_session/1]).

create_session(UserId, Role) ->
    #{
        user_id => UserId,
        role => Role,
        presence => offline,
        login_count => 0
    }.

update_presence(#{user_id := ExpectedUserId, login_count := Count} = Session, ExpectedUserId, NewPresence) ->
    Session#{
        presence := NewPresence,
        login_count := Count + 1
    };
update_presence(_Session, _ExpectedUserId, _NewPresence) ->
    {error, session_mismatch}.

is_admin_session(#{role := admin, presence := online}) ->
    true;
is_admin_session(_) ->
    false.`,
  },

  // ── Lesson 4.2: The maps Standard Library ─────────────────────────────────
  {
    id: 'ch04-l02',
    chapterNumber: 4,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'The maps Standard Library: get/3, find/2, update_with/4, merge/2 & fold/3',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

While pattern matching (\`#{key := Val}\`) is ideal when keys are guaranteed to exist, production applications constantly deal with optional configurations, dynamic metric counters, and security sanitization where keys must be inspected dynamically.

Calling \`maps:get/2\` on a missing key immediately raises a \`{badkey, Key}\` runtime exception. The OTP \`maps\` standard library provides safe, functional primitives to look up fallback defaults, merge configuration layers, and iterate over collections without allocating throwaway intermediate lists.

## Deep Concept Breakdown & Under the Hood

### 1. Safe Lookups: \`maps:get/3\` vs. \`maps:find/2\`
- **\`maps:get(Key, Map, Default) -> Value | Default\`:**
  Returns \`Value\` if \`Key\` exists; otherwise returns \`Default\` with zero exceptions.
- **\`maps:find(Key, Map) -> {ok, Value} | error\`:**
  Essential when a key might legitimately hold the value \`undefined\` or \`false\`. It unequivocally distinguishes between a missing key (\`error\`) and a present key with a falsy value (\`{ok, false}\`).

### 2. High-Performance Counters: \`maps:update_with/4\`
In statistics collectors and rate limiters, you often need to increment a counter for a key that may or may not exist yet.
Without \`update_with\`, developers write verbose 7-line \`case maps:find/2 of\` blocks.
With **\`maps:update_with/4\`**, it becomes an atomic, single-pass operation:

\`\`\`erlang
maps:update_with(Key, fun(Old) -> Old + 1 end, InitialValueIfMissing, Map)
\`\`\`

If \`Key\` exists, the fun transforms the old value. If absent, \`InitialValueIfMissing\` is inserted directly without evaluating the fun!

### 3. Layered Configuration Merging: \`maps:merge/2\` & \`maps:without/2\`
Production microservices merge default base settings with environment overrides:

\`\`\`erlang
DefaultCfg = #{port => 8080, workers => 10, timeout => 5000},
EnvOverrides = #{workers => 50, secret_key => top_secret},
ActiveCfg = maps:merge(DefaultCfg, EnvOverrides).
%% => #{port => 8080, workers => 50, timeout => 5000, secret_key => top_secret}
\`\`\`

> [!important] Rule of Precedence in maps:merge/2
> In \`maps:merge(Map1, Map2)\`, if a key exists in both maps, **the value from \`Map2\` (the second argument) ALWAYS wins!**

To strip sensitive credentials or internal debugging flags before exposing configuration to telemetry:
\`\`\`erlang
Sanitized = maps:without([secret_key, debug_token], ActiveCfg).
\`\`\`

### 4. Zero-List Folding: \`maps:fold/3\`
To aggregate all values or keys across a map, novices often write \`lists:foldl(Fun, 0, maps:to_list(Map))\`. This allocates an intermediate list of 2-tuples on the process heap!
**\`maps:fold(fun(Key, Val, AccIn) -> AccOut end, Acc0, Map)\`** iterates directly across the internal FlatMap or HAMT structures in $O(1)$ stack space without intermediate list allocations.

## Parallel Worked Example

Consider a cache coordinator managing cluster statistics:

\`\`\`erlang
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
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
maps:get(Key, Map, Default) -> Value | Default
maps:find(Key, Map) -> {ok, Value} | error
maps:update_with(Key, Fun, Init, Map) -> Map
maps:merge(Map1, Map2) -> Map
maps:without(Ks, Map) -> Map
maps:fold(Fun, Acc0, Map) -> Acc
\`\`\`

## Assignment Specification

Implement four map utility functions in \`src/map_stdlib.erl\`:

1. \`safe_get_load(NodeMetricsMap, NodeAtom)\`:
   - Uses \`maps:get/3\` to return the load integer for \`NodeAtom\`, or \`0\` if missing.
2. \`increment_tag_counts(TagList, InitialCountsMap)\`:
   - Folds over \`TagList\` using \`lists:foldl/3\`.
   - Uses \`maps:update_with(Tag, fun(C) -> C + 1 end, 1, AccMap)\` to count occurrences of each tag atom.
3. \`merge_configs(DefaultCfgMap, UserCfgMap)\`:
   - Merges \`DefaultCfgMap\` with \`UserCfgMap\` using \`maps:merge/2\` (user overrides win).
   - Uses \`maps:without/2\` to strip sensitive keys \`secret_key\` and \`debug_token\`.
4. \`sum_map_values(NumericMap)\`:
   - Uses \`maps:fold/3\` to calculate the sum of all integer values in \`NumericMap\`.

## Rules & Verification Constraints

- Must use \`maps:get/3\`, \`maps:update_with/4\`, \`maps:merge/2\`, and \`maps:fold/3\`.
- All keys must be atoms; values must be numbers or atoms.`,
    otpDocCards: [
      {
        functionName: 'maps:update_with/4',
        module: 'maps',
        signature: 'update_with(Key, Fun, Init, Map1) -> Map2',
        typesSpec: ['Key = term()', 'Fun = fun((Val) -> Val)', 'Init = Val = term()'],
        description: 'Updates value for Key with Fun, or initializes with Init if Key is absent.',
        complexityNote: 'Single-pass O(log N) lookup and update.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/maps.html#update_with/4',
      },
      {
        functionName: 'maps:fold/3',
        module: 'maps',
        signature: 'fold(Fun, Init, Map) -> Acc',
        typesSpec: ['Fun = fun((Key, Value, AccIn) -> AccOut)', 'Acc = term()'],
        description: 'Folds over key-value pairs without intermediate list allocations.',
        complexityNote: 'O(N) direct traversal of FlatMap arrays or HAMT trie.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/maps.html#fold/3',
      },
    ],
    mentalModelCheck: {
      question: 'In maps:merge(Defaults, Overrides), what happens if a key exists in both maps?',
      options: [
        {
          id: 'A',
          label: 'The value from Overrides (the second map argument) overwrites the value from Defaults',
          isCorrect: true,
          explanation: 'In maps:merge/2, the second map always takes precedence when duplicate keys are present.',
        },
        {
          id: 'B',
          label: 'The BEAM VM raises a {badkey, conflict} exception',
          isCorrect: false,
          explanation: 'maps:merge/2 does not crash on conflicts; it resolves them in favor of the second argument.',
        },
        {
          id: 'C',
          label: 'The value from Defaults is preserved unless Overrides is non-empty',
          isCorrect: false,
          explanation: 'The second map argument always wins on duplicate keys.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch04-02-a',
        title: 'Safe Load Lookup with Default',
        erlangCall: 'map_stdlib:safe_get_load(#{node_a => 42}, node_b)',
        expectedOutput: '0',
        explanation: 'Returns 0 when node_b is absent.',
      },
      {
        id: 'tc-ch04-02-b',
        title: 'Increment Tag Counts via update_with',
        erlangCall: 'map_stdlib:increment_tag_counts([api, web, api, db, api], #{})',
        expectedOutput: '#{api => 3, db => 1, web => 1}',
        explanation: 'Tallies occurrences of each tag.',
      },
      {
        id: 'tc-ch04-02-c',
        title: 'Merge Configs and Strip Sensitive Keys',
        erlangCall: 'map_stdlib:merge_configs(#{port => 8080, timeout => 5000}, #{port => 9000, secret_key => bad_secret, debug_token => 1234})',
        expectedOutput: '#{port => 9000, timeout => 5000}',
        explanation: 'Port 9000 overrides 8080, while secret_key and debug_token are stripped.',
      },
      {
        id: 'tc-ch04-02-d',
        title: 'Sum Map Values with maps:fold',
        erlangCall: 'map_stdlib:sum_map_values(#{cpu => 25, mem => 45, io => 10})',
        expectedOutput: '80',
        explanation: '25 + 45 + 10 = 80.',
      },
    ],
    astRules: {
      requiredCalls: ['maps:get/3', 'maps:update_with/4', 'maps:merge/2', 'maps:fold/3'],
    },
    solutionExplanation: 'Demonstrates maps:get/3 fallback defaults, atomic histogram counting via maps:update_with/4, config sanitization via maps:merge/2 and maps:without/2, and maps:fold/3 aggregation.',
    files: [
      {
        name: 'map_stdlib.erl',
        path: 'src/map_stdlib.erl',
        content: `-module(map_stdlib).
-export([safe_get_load/2, increment_tag_counts/2, merge_configs/2, sum_map_values/1]).

%% @doc Return load for NodeAtom from NodeMetricsMap or default 0 using maps:get/3.
safe_get_load(_NodeMetricsMap, _NodeAtom) ->
    %% % TODO: Retrieve load metric for the target node, returning 0 if key is absent.
    0.

%% @doc Count tag occurrences by folding TagList into InitialCountsMap with maps:update_with/4.
increment_tag_counts(_TagList, InitialCountsMap) ->
    %% % TODO: Tally occurrences of each tag symbol into the accumulator map.
    InitialCountsMap.

%% @doc Merge DefaultCfgMap with UserCfgMap (User wins), then strip secret_key and debug_token.
merge_configs(DefaultCfgMap, _UserCfgMap) ->
    %% % TODO: Combine configuration maps (user settings take precedence) and strip sensitive keys.
    DefaultCfgMap.

%% @doc Sum all integer values in NumericMap using maps:fold/3.
sum_map_values(_NumericMap) ->
    %% % TODO: Aggregate all values across the map into a total sum.
    0.`,
      },
    ],
    solutionFiles: {
      'src/map_stdlib.erl': `-module(map_stdlib).
-export([safe_get_load/2, increment_tag_counts/2, merge_configs/2, sum_map_values/1]).

safe_get_load(NodeMetricsMap, NodeAtom) ->
    maps:get(NodeAtom, NodeMetricsMap, 0).

increment_tag_counts(TagList, InitialCountsMap) ->
    lists:foldl(fun(Tag, AccMap) ->
        maps:update_with(Tag, fun(Count) -> Count + 1 end, 1, AccMap)
    end, InitialCountsMap, TagList).

merge_configs(DefaultCfgMap, UserCfgMap) ->
    Merged = maps:merge(DefaultCfgMap, UserCfgMap),
    maps:without([secret_key, debug_token], Merged).

sum_map_values(NumericMap) ->
    maps:fold(fun(_Key, Val, Acc) ->
        Acc + Val
    end, 0, NumericMap).`,
    },
    starterCode: `-module(map_stdlib).
-export([safe_get_load/2, increment_tag_counts/2, merge_configs/2, sum_map_values/1]).

%% @doc Return load for NodeAtom from NodeMetricsMap or default 0 using maps:get/3.
safe_get_load(_NodeMetricsMap, _NodeAtom) ->
    %% % TODO: Retrieve load metric for the target node, returning 0 if key is absent.
    0.

%% @doc Count tag occurrences by folding TagList into InitialCountsMap with maps:update_with/4.
increment_tag_counts(_TagList, InitialCountsMap) ->
    %% % TODO: Tally occurrences of each tag symbol into the accumulator map.
    InitialCountsMap.

%% @doc Merge DefaultCfgMap with UserCfgMap (User wins), then strip secret_key and debug_token.
merge_configs(DefaultCfgMap, _UserCfgMap) ->
    %% % TODO: Combine configuration maps (user settings take precedence) and strip sensitive keys.
    DefaultCfgMap.

%% @doc Sum all integer values in NumericMap using maps:fold/3.
sum_map_values(_NumericMap) ->
    %% % TODO: Aggregate all values across the map into a total sum.
    0.`,
    solutionCode: `-module(map_stdlib).
-export([safe_get_load/2, increment_tag_counts/2, merge_configs/2, sum_map_values/1]).

safe_get_load(NodeMetricsMap, NodeAtom) ->
    maps:get(NodeAtom, NodeMetricsMap, 0).

increment_tag_counts(TagList, InitialCountsMap) ->
    lists:foldl(fun(Tag, AccMap) ->
        maps:update_with(Tag, fun(Count) -> Count + 1 end, 1, AccMap)
    end, InitialCountsMap, TagList).

merge_configs(DefaultCfgMap, UserCfgMap) ->
    Merged = maps:merge(DefaultCfgMap, UserCfgMap),
    maps:without([secret_key, debug_token], Merged).

sum_map_values(NumericMap) ->
    maps:fold(fun(_Key, Val, Acc) ->
        Acc + Val
    end, 0, NumericMap).`,
  },

  // ── Lesson 4.3: Records & Compile-Time Sugar ──────────────────────────────
  {
    id: 'ch04-l03',
    chapterNumber: 4,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Records (-record): Compile-Time Tuple Sugar, #rec.field Indices & Header Files',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

While maps provide dynamic key flexibility, **records** provide named field access with **zero runtime lookup overhead**.

In Erlang, records are not a runtime data type! The BEAM compiler translates records directly into standard tagged tuples:
\`#frame{seq = 1, type = ack, payload = ok}\` literally becomes \`{frame, 1, ack, ok}\` in \`.beam\` bytecode.
In ultra-low-latency protocol engines (such as telecommunication packet switches and financial matching engines), records eliminate hash lookups and key dictionaries entirely.

## Deep Concept Breakdown & Under the Hood

### 1. Record Declaration & Compilation
A record is declared at module level using the \`-record\` directive:

\`\`\`erlang
-record(frame, {
    seq = 0       :: non_neg_integer(),
    type = data   :: atom(),
    payload       :: term()
}).
\`\`\`

When compiled:
- Construction: \`#frame{seq = 10, type = syn, payload = ping}\` compiles into \`{frame, 10, syn, ping}\`.
- Field Extraction: \`Frame#frame.seq\` compiles directly to the \`element(2, Frame)\` BIF.
- Field Update: \`Frame#frame{seq = 11}\` compiles to \`setelement(2, Frame, 11)\`.

### 2. The Secret Superpower: \`#RecordName.FieldName\` Index
Notice the difference between accessing a field on a variable vs writing the record name directly:
- \`MyVar#frame.seq\` extracts the value of \`seq\` from the record stored in \`MyVar\`.
- **\`#frame.seq\`** (without a variable prefix) is a **compile-time macro** that evaluates to the **integer index position** of \`seq\` inside the underlying tuple!

In \`-record(frame, {seq = 0, type = data, payload})\`:
- Position 1 is the tag: \`frame\`
- Position 2 is \`seq\` $\rightarrow$ \`#frame.seq\` evaluates to \`2\`!
- Position 3 is \`type\` $\rightarrow$ \`#frame.type\` evaluates to \`3\`!
- Position 4 is \`payload\` $\rightarrow$ \`#frame.payload\` evaluates to \`4\`!

#### Why Does This Matter for OTP?
In Chapter 3 Lesson 3.5, you used \`lists:keyfind(Id, 2, List)\` where the magic number \`2\` had to be hardcoded.
With records, you write:
\`\`\`erlang
lists:keyfind(TargetSeq, #frame.seq, FrameList)
\`\`\`
If you ever add a new field to \`#frame\` in the future, the compiler automatically recalculates the position integer everywhere! You never suffer from off-by-one magic number bugs.

> [!warning] Common Beginner Trap: The Dot on Record Updates
> - **Extraction:** \`Var#rec.field\` (dot before field name).
> - **Update:** \`Var#rec{field = NewVal}\` (**NO dot** before the curly brace!).
> Writing \`Var.#rec{...}\` is an immediate compile syntax error.

## Parallel Worked Example

Consider a message broker routing queue tasks:

\`\`\`erlang
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
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Record definition
-record(Name, {Field1 = Default1, Field2, ...}).

%% Record operations
#Name{Field1 = Value1}
Var#Name.Field1
Var#Name{Field1 = NewValue}
#Name.Field1  %% Evaluates to integer tuple position
\`\`\`

## Assignment Specification

Implement record framing in \`src/record_frames.erl\`:

1. Define record: \`-record(frame, {seq = 0, type = data, payload}).\`
2. \`new_frame(Seq, Type, Payload)\`:
   - Returns \`#frame{seq = Seq, type = Type, payload = Payload}\`.
3. \`advance_seq(Frame)\`:
   - Matches \`#frame{seq = S} = Frame\` and returns \`Frame#frame{seq = S + 1}\`.
4. \`frame_seq_index()\`:
   - Returns the compile-time position integer \`#frame.seq\` (which evaluates to \`2\`).
5. \`find_frame_by_seq(FrameList, TargetSeq)\`:
   - Uses \`lists:keyfind(TargetSeq, #frame.seq, FrameList)\`.
   - Returns \`{ok, Frame}\` if found, or \`not_found\` if \`false\`.

## Rules & Verification Constraints

- Must define \`-record(frame, {...})\`.
- Must use \`lists:keyfind/3\` with \`#frame.seq\` integer index.
- Payload can be any atom, integer, or tuple. (Binaries are formally introduced in Lesson 4.4!).`,
    otpDocCards: [
      {
        functionName: 'record_syntax',
        module: 'erlang',
        signature: '#record_name{field = Val}',
        typesSpec: ['Compile-time tuple abstraction', 'Zero runtime key dictionary'],
        description: 'Tagged tuple wrapper providing named field access with O(1) tuple speed.',
        complexityNote: 'Exact same speed and memory footprint as raw tagged tuples.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/records.html',
      },
    ],
    mentalModelCheck: {
      question: 'What does the expression #frame.seq evaluate to at compile time for -record(frame, {seq = 0, type = data, payload}).?',
      options: [
        {
          id: 'A',
          label: 'The integer 2, representing the 1-indexed tuple position of seq within the underlying {frame, Seq, Type, Payload} tuple',
          isCorrect: true,
          explanation: 'In Erlang tuples, element 1 is the record tag frame, so seq is at index 2.',
        },
        {
          id: 'B',
          label: 'The default value 0 defined in the record specification',
          isCorrect: false,
          explanation: 'Default values are only used when instantiating new records without explicit values; #record.field is an index offset.',
        },
        {
          id: 'C',
          label: 'The atom seq',
          isCorrect: false,
          explanation: '#record.field evaluates to an integer index, not an atom.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch04-03-a',
        title: 'Create Frame Record',
        erlangCall: 'record_frames:new_frame(1, ack, ok)',
        expectedOutput: '{frame, 1, ack, ok}',
        explanation: 'Record compiles into tagged 4-tuple {frame, seq, type, payload}.',
      },
      {
        id: 'tc-ch04-03-b',
        title: 'Advance Sequence Number',
        erlangCall: 'begin F = record_frames:new_frame(10, data, ping), record_frames:advance_seq(F) end',
        expectedOutput: '{frame, 11, data, ping}',
        explanation: 'Increments seq from 10 to 11.',
      },
      {
        id: 'tc-ch04-03-c',
        title: 'Inspect #frame.seq Index Position',
        erlangCall: 'record_frames:frame_seq_index()',
        expectedOutput: '2',
        explanation: 'Tuple position of seq in {frame, seq, type, payload} is 2.',
      },
      {
        id: 'tc-ch04-03-d',
        title: 'Find Frame by Sequence Number in List',
        erlangCall: 'record_frames:find_frame_by_seq([{frame, 1, data, hello}, {frame, 2, ack, world}], 2)',
        expectedOutput: '{ok, {frame, 2, ack, world}}',
        explanation: 'Locates frame 2 using lists:keyfind and #frame.seq.',
      },
    ],
    astRules: {
      requiredConstructs: ['record_def'],
      requiredCalls: ['lists:keyfind/3'],
    },
    solutionExplanation: 'Declares -record(frame, {...}) and demonstrates record instantiation, update, #frame.seq tuple offset extraction, and lists:keyfind integration.',
    files: [
      {
        name: 'record_frames.erl',
        path: 'src/record_frames.erl',
        content: `-module(record_frames).
-export([new_frame/3, advance_seq/1, frame_seq_index/0, find_frame_by_seq/2]).

%% % TODO: Declare -record(frame, {seq = 0, type = data, payload}).

%% @doc Return new #frame record.
new_frame(Seq, Type, Payload) ->
    %% % TODO: Instantiate and return the frame record with given fields.
    {frame, Seq, Type, Payload}.

%% @doc Increment seq field by 1.
advance_seq(Frame) ->
    %% % TODO: Return the record with an incremented sequence number.
    Frame.

%% @doc Return compile-time index integer for seq.
frame_seq_index() ->
    %% % TODO: Return the compile-time field offset for sequence number.
    0.

%% @doc Find frame matching TargetSeq using lists:keyfind/3 with record index.
find_frame_by_seq(_FrameList, _TargetSeq) ->
    %% % TODO: Search the list for the frame matching TargetSeq.
    not_found.`,
      },
    ],
    solutionFiles: {
      'src/record_frames.erl': `-module(record_frames).
-export([new_frame/3, advance_seq/1, frame_seq_index/0, find_frame_by_seq/2]).

-record(frame, {
    seq = 0 :: non_neg_integer(),
    type = data :: atom(),
    payload :: term()
}).

new_frame(Seq, Type, Payload) ->
    #frame{seq = Seq, type = Type, payload = Payload}.

advance_seq(#frame{seq = S} = Frame) ->
    Frame#frame{seq = S + 1}.

frame_seq_index() ->
    #frame.seq.

find_frame_by_seq(FrameList, TargetSeq) ->
    case lists:keyfind(TargetSeq, #frame.seq, FrameList) of
        {frame, TargetSeq, _, _} = Frame ->
            {ok, Frame};
        false ->
            not_found
    end.`,
    },
    starterCode: `-module(record_frames).
-export([new_frame/3, advance_seq/1, frame_seq_index/0, find_frame_by_seq/2]).

%% % TODO: Declare -record(frame, {seq = 0, type = data, payload}).

%% @doc Return new #frame record.
new_frame(Seq, Type, Payload) ->
    %% % TODO: Instantiate and return the frame record with given fields.
    {frame, Seq, Type, Payload}.

%% @doc Increment seq field by 1.
advance_seq(Frame) ->
    %% % TODO: Return the record with an incremented sequence number.
    Frame.

%% @doc Return compile-time index integer for seq.
frame_seq_index() ->
    %% % TODO: Return the compile-time field offset for sequence number.
    0.

%% @doc Find frame matching TargetSeq using lists:keyfind/3 with record index.
find_frame_by_seq(_FrameList, _TargetSeq) ->
    %% % TODO: Search the list for the frame matching TargetSeq.
    not_found.`,
    solutionCode: `-module(record_frames).
-export([new_frame/3, advance_seq/1, frame_seq_index/0, find_frame_by_seq/2]).

-record(frame, {
    seq = 0 :: non_neg_integer(),
    type = data :: atom(),
    payload :: term()
}).

new_frame(Seq, Type, Payload) ->
    #frame{seq = Seq, type = Type, payload = Payload}.

advance_seq(#frame{seq = S} = Frame) ->
    Frame#frame{seq = S + 1}.

frame_seq_index() ->
    #frame.seq.

find_frame_by_seq(FrameList, TargetSeq) ->
    case lists:keyfind(TargetSeq, #frame.seq, FrameList) of
        {frame, TargetSeq, _, _} = Frame ->
            {ok, Frame};
        false ->
            not_found
    end.`,
  },

  // ── Lesson 4.4: Binaries & Zero-Copy IOLists ─────────────────────────────
  {
    id: 'ch04-l04',
    chapterNumber: 4,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'Binaries (<<...>>) vs. Character Lists, UTF-8 & Zero-Copy IOLists',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In Chapter 1 Lesson 1.5, you learned that string literals like \`"hello"\` are actually singly linked lists of integer Unicode codepoints (\`[104, 101, 108, 108, 111]\`). On a 64-bit BEAM VM, each linked list cons cell requires two machine words (16 bytes). A simple 5-character string \`"hello"\` takes **80 bytes of RAM**!

In high-throughput network applications (HTTP/2, WebSocket, XMPP, and distributed telemetry), transferring gigabytes of textual payloads using character lists causes extreme memory bloat and garbage collection pressure.

Erlang solves this with **Binaries (\`<<"...">>\`)** and **IOLists (\`iolist()\`)**—the backbone of telecom-grade network efficiency.

## Deep Concept Breakdown & Under the Hood

### 1. Binaries: 16x Memory Reduction
A binary is a contiguous chunk of raw 8-bit bytes bounded by \`<<\` and \`>>\`:

\`\`\`erlang
TextBin = <<"hello">>.  %% Equivalent to <<104, 101, 108, 108, 111>>
\`\`\`

- \`"hello"\` (Character List) = $5 \\times 16 = \\mathbf{80\\text{ bytes}}$ on the process heap.
- \`<<"hello">>\` (Binary) = $\\mathbf{5\\text{ bytes}}$ of contiguous payload!
That is a **16x reduction in memory consumption** for all network text, JSON payloads, and XML stanzas!

Essential BIFs for binary handling:
- \`byte_size(Bin) -> integer()\`: Returns number of bytes.
- \`is_binary(Term) -> boolean()\`: Guard BIF checking if term is a binary.
- \`list_to_binary(CharList) -> binary()\`: Converts character list to binary.
- \`binary_to_list(Bin) -> list()\`: Converts binary to integer codepoint list.
- \`integer_to_binary(Int) -> binary()\`: Formats integer as ASCII digits binary (e.g. \`123\` $\\rightarrow$ \`<<"123">>\`).

### 2. The Zero-Copy IOList Pattern (\`iolist()\` / \`iodata()\`)
In typical languages (Node.js, Python, Java), assembling an HTTP response requires allocating a new buffer and concatenating strings:
\`Header + Body + Footer\` $\\rightarrow$ **Buffer Copying Penalty**.

In Erlang, the network socket drivers (\`gen_tcp:send/2\`) and file writers (\`file:write/2\`) do not require a flat binary! They accept an **IOList**—a deeply nested list of binaries, character lists, and single byte integers:

\`\`\`erlang
ResponseIoList = [
    <<"HTTP/1.1 200 OK\r\n">>,
    <<"Content-Length: ">>, integer_to_binary(byte_size(BodyBin)), <<"\r\n\r\n">>,
    BodyBin
].
\`\`\`

#### How the BEAM Kernel Driver Sends IOLists with Zero Copies:
When \`gen_tcp:send(Socket, ResponseIoList)\` is called, the BEAM VM does NOT flatten the list in RAM.
Instead, ERTS traverses the nested list and converts the pointers directly into an array of \`iovec\` structs passed to the operating system's scatter-gather **\`writev()\` system call**!
The OS network stack gathers the disjoint memory segments directly from the process heap and streams them onto the network wire with **ZERO intermediate memory copies**.

If you ever need to flatten an IOList into a single binary for testing or hashing, the standard library provides:
- \`iolist_to_binary(IoList) -> binary()\` (flattens in C speed).
- \`iolist_size(IoList) -> integer()\` (calculates total byte count without flattening!).

## Parallel Worked Example

Consider building an XMPP presence broadcast frame:

\`\`\`erlang
-module(xmpp_frame_builder).
-export([make_presence_frame/2, render_wire_binary/1]).

%% Assembles nested IOList without copying BodyBin
make_presence_frame(FromJid, StatusTextBin) ->
    [
        <<"<presence from='">>, FromJid, <<"'>">>,
        <<"<status>">>, StatusTextBin, <<"</status>">>,
        <<"</presence>">>
    ].

%% Flattens to binary and computes wire size
render_wire_binary(IoList) ->
    TotalBytes = iolist_size(IoList),
    FlatBin = iolist_to_binary(IoList),
    {TotalBytes, FlatBin}.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
list_to_binary(IoList) -> binary()
iolist_to_binary(IoList) -> binary()
iolist_size(Item) -> non_neg_integer()
byte_size(Bitstring) -> non_neg_integer()
integer_to_binary(Integer) -> binary()
\`\`\`

## Assignment Specification

Implement binary memory comparisons and HTTP framing in \`src/iolist_builder.erl\`:

1. \`string_vs_binary_bytes(CharList)\`:
   - Takes a character list (e.g. \`"hello"\`).
   - Converts it to a binary \`Bin = list_to_binary(CharList)\`.
   - Returns a 4-tuple: \`{size_comparison, length(CharList) * 16, byte_size(Bin), Bin}\`.
2. \`build_http_response_iolist(StatusCodeInt, BodyBin)\`:
   - Returns a nested IOList matching the exact HTTP response wire format:
     \`[<<"HTTP/1.1 ">>, integer_to_binary(StatusCodeInt), <<" OK\r\nContent-Length: ">>, integer_to_binary(byte_size(BodyBin)), <<"\r\n\r\n">>, BodyBin]\`.
3. \`flatten_iolist(IoList)\`:
   - Uses \`iolist_size/1\` and \`iolist_to_binary/1\` to return a 2-tuple:
     \`{iolist_size(IoList), iolist_to_binary(IoList)}\`.

## Rules & Verification Constraints

- Must use \`erlang:list_to_binary/1\`, \`erlang:iolist_to_binary/1\`, and \`erlang:iolist_size/1\`.
- \`build_http_response_iolist/2\` must return a nested IOList structure.`,
    otpDocCards: [
      {
        functionName: 'iolist_to_binary/1',
        module: 'erlang',
        signature: 'iolist_to_binary(IoListOrBinary) -> binary()',
        typesSpec: ['IoListOrBinary = iolist()', 'Returns binary()'],
        description: 'Flattens an iolist into a single binary using optimized C buffer copies.',
        complexityNote: 'O(N) single-pass allocation and copy.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#iolist_to_binary/1',
      },
      {
        functionName: 'iolist_size/1',
        module: 'erlang',
        signature: 'iolist_size(Item) -> non_neg_integer()',
        typesSpec: ['Item = iolist() | binary()', 'Returns integer()'],
        description: 'Calculates the size of an iolist in bytes without allocating or flattening.',
        complexityNote: 'O(N) traversal without memory allocations.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#iolist_size/1',
      },
    ],
    mentalModelCheck: {
      question: 'Why does gen_tcp:send(Socket, [HeaderBin, BodyBin]) outperform concatenating <<HeaderBin/binary, BodyBin/binary>> before sending?',
      options: [
        {
          id: 'A',
          label: 'The BEAM passes the IOList pointers directly to the OS kernel writev() system call, streaming the disjoint buffers onto the network wire without allocating a copy in RAM',
          isCorrect: true,
          explanation: 'Scatter-gather I/O bypasses user-space buffer concatenation completely.',
        },
        {
          id: 'B',
          label: 'The IOList is automatically compressed by the Erlang compiler before transmission',
          isCorrect: false,
          explanation: 'IOLists are not compressed; they are emitted as disjoint memory vectors.',
        },
        {
          id: 'C',
          label: 'Because Erlang sockets only support linked lists, not binaries',
          isCorrect: false,
          explanation: 'Erlang sockets support raw binaries, iolists, and iodata.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch04-04-a',
        title: 'Compare String vs Binary Memory Footprint',
        erlangCall: 'iolist_builder:string_vs_binary_bytes("hello")',
        expectedOutput: '{size_comparison, 80, 5, <<"hello">>}',
        explanation: '5 cons cells take 80 bytes; binary takes 5 bytes.',
      },
      {
        id: 'tc-ch04-04-b',
        title: 'Build HTTP Response IOList',
        erlangCall: `iolist_builder:build_http_response_iolist(200, <<"{\"status\":\"ok\"}">>)`,
        expectedOutput: `[<<"HTTP/1.1 ">>, <<"200">>, <<" OK\r\nContent-Length: ">>, <<"15">>, <<"\r\n\r\n">>, <<"{\"status\":\"ok\"}">>]`,
        explanation: 'Assembles nested zero-copy IOList with Content-Length 15.',
      },
      {
        id: 'tc-ch04-04-c',
        title: 'Measure and Flatten IOList',
        erlangCall: 'iolist_builder:flatten_iolist([<<"PING">>, [<<"-">>, <<"PONG">>]])',
        expectedOutput: '{9, <<"PING-PONG">>}',
        explanation: 'Size is 9 bytes and flat binary is <<"PING-PONG">>.',
      },
    ],
    astRules: {
      requiredCalls: ['erlang:list_to_binary/1', 'erlang:iolist_to_binary/1', 'erlang:iolist_size/1'],
    },
    solutionExplanation: 'Demonstrates 16x memory savings of binaries over character lists, nested zero-copy IOList construction for HTTP, and iolist_size/iolist_to_binary handling.',
    files: [
      {
        name: 'iolist_builder.erl',
        path: 'src/iolist_builder.erl',
        content: `-module(iolist_builder).
-export([string_vs_binary_bytes/1, build_http_response_iolist/2, flatten_iolist/1]).

%% @doc Return {size_comparison, EstimatedListBytes, BinaryBytes, Binary}
%% comparing 64-bit list overhead (16 bytes per character) against compact binary size.
string_vs_binary_bytes(_CharList) ->
    %% Convert CharList to binary, calculate word overhead (length * 16), and binary byte size
    {size_comparison, 0, 0, <<>>}.

%% @doc Return nested IOList for an HTTP/1.1 response without flattening.
build_http_response_iolist(_StatusCodeInt, _BodyBin) ->
    %% Construct nested IOList with status code and Content-Length header
    [].

%% @doc Measure the total size of IoList in O(1) and flatten it into a continuous binary.
%% Return {TotalBytes, FlatBinary}.
flatten_iolist(_IoList) ->
    %% Return {Size, FlatBinary}
    {0, <<>>}.`,
      },
    ],
    solutionFiles: {
      'src/iolist_builder.erl': `-module(iolist_builder).
-export([string_vs_binary_bytes/1, build_http_response_iolist/2, flatten_iolist/1]).

string_vs_binary_bytes(CharList) ->
    Bin = list_to_binary(CharList),
    {size_comparison, length(CharList) * 16, byte_size(Bin), Bin}.

build_http_response_iolist(StatusCodeInt, BodyBin) ->
    LenBin = integer_to_binary(byte_size(BodyBin)),
    CodeBin = integer_to_binary(StatusCodeInt),
    [
        <<"HTTP/1.1 ">>, CodeBin, <<" OK\r\nContent-Length: ">>,
        LenBin, <<"\r\n\r\n">>, BodyBin
    ].

flatten_iolist(IoList) ->
    {iolist_size(IoList), iolist_to_binary(IoList)}.`,
    },
    starterCode: `-module(iolist_builder).
-export([string_vs_binary_bytes/1, build_http_response_iolist/2, flatten_iolist/1]).

%% @doc Return {size_comparison, EstimatedListBytes, BinaryBytes, Binary}
%% comparing 64-bit list overhead (16 bytes per character) against compact binary size.
string_vs_binary_bytes(_CharList) ->
    %% Convert CharList to binary, calculate word overhead (length * 16), and binary byte size
    {size_comparison, 0, 0, <<>>}.

%% @doc Return nested IOList for an HTTP/1.1 response without flattening.
build_http_response_iolist(_StatusCodeInt, _BodyBin) ->
    %% Construct nested IOList with status code and Content-Length header
    [].

%% @doc Measure the total size of IoList in O(1) and flatten it into a continuous binary.
%% Return {TotalBytes, FlatBinary}.
flatten_iolist(_IoList) ->
    %% Return {Size, FlatBinary}
    {0, <<>>}.`,
    solutionCode: `-module(iolist_builder).
-export([string_vs_binary_bytes/1, build_http_response_iolist/2, flatten_iolist/1]).

string_vs_binary_bytes(CharList) ->
    Bin = list_to_binary(CharList),
    {size_comparison, length(CharList) * 16, byte_size(Bin), Bin}.

build_http_response_iolist(StatusCodeInt, BodyBin) ->
    LenBin = integer_to_binary(byte_size(BodyBin)),
    CodeBin = integer_to_binary(StatusCodeInt),
    [
        <<"HTTP/1.1 ">>, CodeBin, <<" OK\r\nContent-Length: ">>,
        LenBin, <<"\r\n\r\n">>, BodyBin
    ].

flatten_iolist(IoList) ->
    {iolist_size(IoList), iolist_to_binary(IoList)}.`,
  },

  // ── Lesson 4.5: Bit Syntax & Wire Packing ─────────────────────────────────
  {
    id: 'ch04-l05',
    chapterNumber: 4,
    lessonNumber: 5,
    lessonType: 'concept_exercise',
    title: 'Erlang Bit Syntax (<<Val:Size/TypeSpecifiers>>): Bit-Level Protocol Packing & Endianness',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

Erlang's **Bit Syntax (\`<<...>>\`)** is widely celebrated as one of the greatest inventions in programming language history.

In C, Go, or Rust, parsing binary network protocols (TCP/IP packets, TLS frames, DNS queries, or WebSocket frames) requires writing fragile, error-prone bit-shifting and masking operations (\`(byte >> 4) & 0x0F\`).
In Erlang, you declare the binary wire format with exact bit widths, signedness, and endianness directly in pattern matching expressions!

## Deep Concept Breakdown & Under the Hood

### 1. Anatomy of a Bit Segment
A bit syntax expression contains comma-separated segments:
\`\`\`erlang
<<Value:Size/TypeSpecifiers, ...>>
\`\`\`

The specifier components (\`Type-Signedness-Endianness-Unit\`) include:
- **Type:**
  - \`integer\` (default)
  - \`binary\` / \`bytes\` (byte-aligned chunk)
  - \`bitstring\` / \`bits\` (arbitrary bit count)
  - \`float\` (32 or 64-bit IEEE float)
  - \`utf8\` (Unicode UTF-8 codepoint)
- **Signedness:**
  - \`unsigned\` (default, \`0..255\` for 8 bits)
  - \`signed\` (two's complement, \`-128..127\` for 8 bits)
- **Endianness:**
  - \`big\` (Network Byte Order, default): Most significant byte first (\`<<1024:16/big>> == <<4, 0>>\`).
  - \`little\` (x86 architecture order): Least significant byte first (\`<<1024:16/little>> == <<0, 4>>\`).

### 2. Packing Bit-Level Fields
Consider an IPv4-style header with a 4-bit Version, a 4-bit Header Flags, and a 16-bit Total Length:

\`\`\`erlang
%% Version: 4 (0100), Flags: 2 (0010) => 01000010 = 0x42 (decimal 66)
%% Length: 1024 => 0x0400 (decimal 4, 0)
Header = <<4:4, 2:4, 1024:16/big>>.
%% Result is a 3-byte binary: <<66, 4, 0>>!
\`\`\`

The BEAM compiler emits hardware vector instructions (\`bs_put_integer\`, \`bs_put_binary\`) directly into machine code for near-zero CPU overhead.

### 3. Dynamic Length Pattern Matching
In Erlang, you can bind a variable in the first segment of a binary pattern and **immediately use that variable as the size specifier** of a subsequent segment in the very same pattern!

\`\`\`erlang
%% Len is bound first, then exactly Len bytes are extracted into Payload:
<<Len:16/big, Payload:Len/binary, Rest/binary>> = Packet.
\`\`\`

If \`Packet\` contains fewer than \`Len\` bytes, the pattern simply fails to match.

## Parallel Worked Example

Consider packing a DNS question header:

\`\`\`erlang
-module(dns_header).
-export([encode_query_header/3, decode_query_header/1]).

%% Encodes 16-bit ID, 1-bit QR, 4-bit Opcode, and 16-bit QuestionCount:
encode_query_header(TxId, Opcode, QCount) ->
    <<TxId:16/big, 0:1, Opcode:4, 0:11, QCount:16/big>>.

%% Matches header fields:
decode_query_header(<<TxId:16/big, QR:1, Opcode:4, _Flags:11, QCount:16/big, Rest/binary>>) ->
    {ok, TxId, QR, Opcode, QCount, Rest};
decode_query_header(_) ->
    {error, malformed_dns_header}.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
<<Segment1, Segment2, ...>>
Segment = Value[:Size][/TypeSpecifierList]
TypeSpecifiers = Type-Signedness-Endianness-Unit
\`\`\`

## Assignment Specification

Implement binary wire packing in \`src/bit_packer.erl\`:

1. \`pack_header(Version, Flags, Length)\`:
   - \`Version\`: 4 bits unsigned integer.
   - \`Flags\`: 4 bits unsigned integer.
   - \`Length\`: 16 bits big-endian unsigned integer.
   - Returns a 3-byte binary: \`<<Version:4, Flags:4, Length:16/big-unsigned-integer>>\`.
2. \`unpack_header(Binary)\`:
   - Matches \`<<Version:4, Flags:4, Length:16/big-unsigned-integer, Payload/binary>>\`.
   - Returns \`{ok, Version, Flags, Length, Payload}\`.
   - If \`Binary\` has fewer than 3 bytes, returns \`{error, insufficient_bytes}\`.
3. \`encode_utf8_tagged(TextBinary)\`:
   - Prepends a single byte \`16#01\` tag followed by a 16-bit big-endian length prefix and \`TextBinary\`:
     \`<<16#01:8, (byte_size(TextBinary)):16/big, TextBinary/binary>>\`.

## Rules & Verification Constraints

- Must use Bit Syntax \`<<...>>\`.
- Endianness for 16-bit integers must be big-endian (\`big\`).`,
    otpDocCards: [
      {
        functionName: 'bit_syntax',
        module: 'erlang',
        signature: '<<Val:Size/TypeSpecifiers>>',
        typesSpec: ['Size = integer()', 'TypeSpecifiers = integer | binary | big | little | utf8'],
        description: 'Declarative bit-level data packing and destructuring.',
        complexityNote: 'Executed using hardware vector instructions in ERTS.',
        officialUrl: 'https://www.erlang.org/doc/programming_examples/bit_syntax.html',
      },
    ],
    mentalModelCheck: {
      question: 'What is the binary representation of <<4:4, 2:4, 1024:16/big>>?',
      options: [
        {
          id: 'A',
          label: '<<66, 4, 0>> (0x42 = 0100 0010 = 66, and 1024 in 16-bit big-endian is 0x0400 = 4, 0)',
          isCorrect: true,
          explanation: '4 (0100) and 2 (0010) pack into the first byte (01000010 = 66); 1024 is high byte 4 and low byte 0.',
        },
        {
          id: 'B',
          label: '<<4, 2, 10, 24>>',
          isCorrect: false,
          explanation: '4 and 2 are 4-bit nibbles that pack together into a single 8-bit byte.',
        },
        {
          id: 'C',
          label: '<<66, 0, 4>>',
          isCorrect: false,
          explanation: '<<66, 0, 4>> would be little-endian; big-endian places the high byte 4 first.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch04-05-a',
        title: 'Pack 3-Byte Network Header',
        erlangCall: 'bit_packer:pack_header(4, 2, 1024)',
        expectedOutput: '<<66, 4, 0>>',
        explanation: 'Version 4 (4 bits) + Flags 2 (4 bits) = 66; 1024 in 16 bits = <<4, 0>>.',
      },
      {
        id: 'tc-ch04-05-b',
        title: 'Unpack Header and Extract Payload',
        erlangCall: 'bit_packer:unpack_header(<<66, 4, 0, "PAYLOAD">>)',
        expectedOutput: '{ok, 4, 2, 1024, <<"PAYLOAD">>}',
        explanation: 'Unpacks 4, 2, 1024 and extracts trailing binary payload.',
      },
      {
        id: 'tc-ch04-05-c',
        title: 'Reject Truncated Binary',
        erlangCall: 'bit_packer:unpack_header(<<66, 4>>)',
        expectedOutput: '{error, insufficient_bytes}',
        explanation: 'Header requires at least 3 bytes.',
      },
      {
        id: 'tc-ch04-05-d',
        title: 'Encode Tagged UTF8 Payload',
        erlangCall: 'bit_packer:encode_utf8_tagged(<<"HELLO">>)',
        expectedOutput: '<<1, 0, 5, "HELLO">>',
        explanation: 'Tag 1 (1 byte) + Length 5 (2 bytes) + <<"HELLO">> (5 bytes).',
      },
    ],
    astRules: {
      requiredConstructs: ['bit_syntax'],
    },
    solutionExplanation: 'Demonstrates <<V:4, F:4, L:16/big>> packing, pattern matching with trailing binary capture, and length-prefixed encoding.',
    files: [
      {
        name: 'bit_packer.erl',
        path: 'src/bit_packer.erl',
        content: `-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

%% @doc Pack Version (4 bits), Flags (4 bits), Length (16 bits big).
pack_header(_Version, _Flags, _Length) ->
    %% % TODO: Pack Version, Flags, and Length into a 3-byte binary.
    <<>>.

%% @doc Unpack 3-byte header and extract trailing payload binary.
unpack_header(_Binary) ->
    %% % TODO: Extract Version, Flags, Length, and remaining payload.
    {error, insufficient_bytes}.

%% @doc Encode length-prefixed tagged text binary.
encode_utf8_tagged(TextBinary) when is_binary(TextBinary) ->
    %% % TODO: Prepend 1-byte tag (16#01) and 16-bit big-endian length prefix to TextBinary.
    <<>>.`,
      },
    ],
    solutionFiles: {
      'src/bit_packer.erl': `-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

pack_header(Version, Flags, Length) ->
    <<Version:4, Flags:4, Length:16/big-unsigned-integer>>.

unpack_header(<<Version:4, Flags:4, Length:16/big-unsigned-integer, Payload/binary>>) ->
    {ok, Version, Flags, Length, Payload};
unpack_header(_) ->
    {error, insufficient_bytes}.

encode_utf8_tagged(TextBinary) when is_binary(TextBinary) ->
    Len = byte_size(TextBinary),
    <<16#01:8, Len:16/big-unsigned-integer, TextBinary/binary>>.`,
    },
    starterCode: `-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

%% @doc Pack Version (4 bits), Flags (4 bits), Length (16 bits big).
pack_header(_Version, _Flags, _Length) ->
    %% % TODO: Pack Version, Flags, and Length into a 3-byte binary.
    <<>>.

%% @doc Unpack 3-byte header and extract trailing payload binary.
unpack_header(_Binary) ->
    %% % TODO: Extract Version, Flags, Length, and remaining payload.
    {error, insufficient_bytes}.

%% @doc Encode length-prefixed tagged text binary.
encode_utf8_tagged(TextBinary) when is_binary(TextBinary) ->
    %% % TODO: Prepend 1-byte tag (16#01) and 16-bit big-endian length prefix to TextBinary.
    <<>>.`,
    solutionCode: `-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

pack_header(Version, Flags, Length) ->
    <<Version:4, Flags:4, Length:16/big-unsigned-integer>>.

unpack_header(<<Version:4, Flags:4, Length:16/big-unsigned-integer, Payload/binary>>) ->
    {ok, Version, Flags, Length, Payload};
unpack_header(_) ->
    {error, insufficient_bytes}.

encode_utf8_tagged(TextBinary) when is_binary(TextBinary) ->
    Len = byte_size(TextBinary),
    <<16#01:8, Len:16/big-unsigned-integer, TextBinary/binary>>.`,
  },

  // ── Lesson 4.6: Binary Scanning & Comprehensions ─────────────────────────
  {
    id: 'ch04-l06',
    chapterNumber: 4,
    lessonNumber: 6,
    lessonType: 'concept_exercise',
    title: 'Binary Scanning (binary:split/2,3, binary:match/2) & Binary Comprehensions',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

When parsing HTTP headers, MIME multipart streams, or raw TCP line protocols, developers in other languages often convert raw bytes into character strings before splitting on \`\\r\\n\`.
In Erlang, converting a 10 MB binary into a character list allocates **160 MB of RAM** just to perform string splits!

The Erlang standard library includes the **\`binary\`** module, which executes compiled **Boyer-Moore and Aho-Corasick algorithms in optimized C** directly on binary memory buffers.

Furthermore, Erlang includes **Binary Comprehensions** for lightning-fast byte transformation (e.g. WebSocket masking, XOR ciphering, and pixel manipulation).

## Deep Concept Breakdown & Under the Hood

### 1. High-Speed Splitting: \`binary:split/2\` vs \`binary:split/3\`
- **\`binary:split(Subject, Pattern) -> [Part1, Remainder]\`:**
  Splits \`Subject\` on the **first occurrence** of \`Pattern\`. This is ideal for parsing HTTP headers (\`Key: Value\`), where the value itself might contain colons:
  \`\`\`erlang
  binary:split(<<"Authorization: Bearer abc:123">>, <<": ">>)
  %% => [<<"Authorization">>, <<"Bearer abc:123">>]
  \`\`\`
- **\`binary:split(Subject, Pattern, [global, trim_all]) -> [binary()]\`:**
  - \`global\`: Splits on **all occurrences** across the entire buffer.
  - \`trim_all\`: Automatically discards empty binaries resulting from consecutive delimiters or trailing newlines.

### 2. Searching: \`binary:match/2\`
Searches \`Subject\` for \`Pattern\` and returns \`{ByteOffset, PatternLength}\` or \`nomatch\`:
\`\`\`erlang
binary:match(<<"GET /api/v1/health HTTP/1.1">>, <<"HTTP">>)
%% => {18, 4}  -- Found at zero-indexed byte offset 18 with length 4
\`\`\`

### 3. Binary Comprehensions and the \`<=\` Generator
In Chapter 1 Lesson 1.2, you learned that the less-than-or-equal comparison operator in Erlang is \`=<\` (not \`<=\`).
Here is what **\`<=\`** actually is in Erlang: the **Binary Comprehension Generator Arrow**!

A binary comprehension creates a new binary by streaming bytes or bit-groups out of an input binary:
\`\`\`erlang
<< <<OutExpression>> || <<Pattern>> <= InputBinary, FilterPredicate >>
\`\`\`

#### Example: WebSocket XOR Masking
The RFC 6455 WebSocket protocol specifies that all client-to-server frames must have their payload masked by XOR-ing every byte with a mask byte:
\`\`\`erlang
Masked = << <<(Byte bxor 16#FF):8>> || <<Byte:8>> <= OriginalPayload >>.
\`\`\`
The BEAM VM compiles this comprehension into an ultra-tight, non-allocating C loop that executes in hardware registers!

## Parallel Worked Example

Consider a line-oriented protocol parser for an SMTP/IMAP mail gateway:

\`\`\`erlang
-module(mail_stream).
-export([parse_command/1, split_mail_lines/1, rot13_cipher/1]).

%% 1. Split first command word
parse_command(InputBin) ->
    case binary:split(InputBin, <<" ">>) of
        [Cmd, Arg] -> {ok, Cmd, Arg};
        [Cmd] -> {ok, Cmd, <<>>}
    end.

%% 2. Split all non-empty lines on CRLF
split_mail_lines(RawMessageBin) ->
    binary:split(RawMessageBin, <<"\r\n">>, [global, trim_all]).

%% 3. Byte transformation using binary comprehension
rot13_cipher(Bin) ->
    << <<(case B of
        Char when Char >= $A andalso Char =< $Z -> ((Char - $A + 13) rem 26) + $A;
        Char when Char >= $a andalso Char =< $z -> ((Char - $a + 13) rem 26) + $a;
        Other -> Other
    end):8>> || <<B:8>> <= Bin >>.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
binary:split(Subject, Pattern) -> [binary()]
binary:split(Subject, Pattern, Options) -> [binary()]
binary:match(Subject, Pattern) -> {byte_offset(), length()} | nomatch
<< <<Out:8>> || <<In:8>> <= InBinary >>
\`\`\`

## Assignment Specification

Implement binary scanning and masking in \`src/binary_scanner.erl\`:

1. \`split_key_value(HeaderBin)\`:
   - Uses \`binary:split(HeaderBin, <<": ">>)\`.
   - If \`<<": ">>\` is found, returns \`{ok, KeyBin, ValueBin}\`.
   - If absent, returns \`{error, malformed_header}\`.
2. \`extract_lines(MultiLineBin)\`:
   - Uses \`binary:split(MultiLineBin, <<"\r\n">>, [global, trim_all])\`.
   - Returns a list of all non-empty line binaries.
3. \`xor_mask_payload(PayloadBin, MaskByte)\`:
   - Uses a binary comprehension \`<< <<(B bxor MaskByte):8>> || <<B:8>> <= PayloadBin >>\`.
   - Returns the masked binary.

## Rules & Verification Constraints

- Must use \`binary:split/2\` and \`binary:split/3\`.
- Must use binary comprehension with \`<=\`.`,
    otpDocCards: [
      {
        functionName: 'binary:split/3',
        module: 'binary',
        signature: 'split(Subject, Pattern, Options) -> [binary()]',
        typesSpec: ['Subject = binary()', 'Pattern = binary()', 'Options = [global | trim_all]'],
        description: 'Splits Subject on Pattern using Boyer-Moore C algorithm.',
        complexityNote: 'Sub-linear O(N / M) average search time in C.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#split/3',
      },
    ],
    mentalModelCheck: {
      question: 'What is the role of <= in Erlang expressions like << <<B:8>> || <<B:8>> <= Bin >>?',
      options: [
        {
          id: 'A',
          label: 'It is the binary generator operator in binary comprehensions, streaming bit patterns out of Bin',
          isCorrect: true,
          explanation: '<= extracts binary segments in comprehensions, whereas =< is the numeric less-than-or-equal comparison operator.',
        },
        {
          id: 'B',
          label: 'It compares whether the left binary is less than or equal to the right binary',
          isCorrect: false,
          explanation: 'Numeric less-than-or-equal is =< in Erlang.',
        },
        {
          id: 'C',
          label: 'It copies the binary into off-heap memory',
          isCorrect: false,
          explanation: 'It is a syntactic generator operator.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch04-06-a',
        title: 'Split HTTP Header into Key and Value',
        erlangCall: 'binary_scanner:split_key_value(<<"Authorization: Bearer_token_123">>)',
        expectedOutput: '{ok, <<"Authorization">>, <<"Bearer_token_123">>}',
        explanation: 'Splits on the first <<": ">>.',
      },
      {
        id: 'tc-ch04-06-b',
        title: 'Reject Header Without Delimiter',
        erlangCall: 'binary_scanner:split_key_value(<<"InvalidHeaderContent">>)',
        expectedOutput: '{error, malformed_header}',
        explanation: 'Returns error when delimiter is missing.',
      },
      {
        id: 'tc-ch04-06-c',
        title: 'Extract Non-Empty Lines with trim_all',
        erlangCall: `binary_scanner:extract_lines(<<"line1\r\n\r\nline2\r\nline3\r\n">>)`,
        expectedOutput: '[<<"line1">>, <<"line2">>, <<"line3">>]',
        explanation: 'Splits on CRLF and trims empty lines.',
      },
      {
        id: 'tc-ch04-06-d',
        title: 'XOR Mask Payload via Binary Comprehension',
        erlangCall: 'binary_scanner:xor_mask_payload(<<16#AA, 16#55>>, 16#FF)',
        expectedOutput: '<<85, 170>>',
        explanation: '0xAA xor 0xFF = 0x55 (85); 0x55 xor 0xFF = 0xAA (170).',
      },
    ],
    astRules: {
      requiredCalls: ['binary:split/2', 'binary:split/3'],
      requiredConstructs: ['bit_syntax'],
    },
    solutionExplanation: 'Demonstrates C-speed binary:split/2 header parsing, multi-line global CRLF splitting with trim_all, and binary comprehension XOR byte transformation.',
    files: [
      {
        name: 'binary_scanner.erl',
        path: 'src/binary_scanner.erl',
        content: `-module(binary_scanner).
-export([split_key_value/1, extract_lines/1, xor_mask_payload/2]).

%% @doc Split on first separator <<": ">> into {ok, Key, Value} or {error, malformed_header}.
split_key_value(_HeaderBin) ->
    %% Split binary on header delimiter and return {ok, Key, Value} or error
    {error, malformed_header}.

%% @doc Split MultiLineBin on <<"\r\n">> discarding empty tokens.
extract_lines(_MultiLineBin) ->
    %% Split into lines using binary:split/3 and trim empty items
    [].

%% @doc XOR every byte in PayloadBin with MaskByte using a binary comprehension.
xor_mask_payload(_PayloadBin, _MaskByte) ->
    %% Transform each byte with MaskByte using binary comprehension syntax
    <<>>.`,
      },
    ],
    solutionFiles: {
      'src/binary_scanner.erl': `-module(binary_scanner).
-export([split_key_value/1, extract_lines/1, xor_mask_payload/2]).

split_key_value(HeaderBin) ->
    case binary:split(HeaderBin, <<": ">>) of
        [Key, Value] ->
            {ok, Key, Value};
        _ ->
            {error, malformed_header}
    end.

extract_lines(MultiLineBin) ->
    binary:split(MultiLineBin, <<"\r\n">>, [global, trim_all]).

xor_mask_payload(PayloadBin, MaskByte) ->
    << <<(B bxor MaskByte):8>> || <<B:8>> <= PayloadBin >>.`,
    },
    starterCode: `-module(binary_scanner).
-export([split_key_value/1, extract_lines/1, xor_mask_payload/2]).

%% @doc Split on first separator <<": ">> into {ok, Key, Value} or {error, malformed_header}.
split_key_value(_HeaderBin) ->
    %% Split binary on header delimiter and return {ok, Key, Value} or error
    {error, malformed_header}.

%% @doc Split MultiLineBin on <<"\r\n">> discarding empty tokens.
extract_lines(_MultiLineBin) ->
    %% Split into lines using binary:split/3 and trim empty items
    [].

%% @doc XOR every byte in PayloadBin with MaskByte using a binary comprehension.
xor_mask_payload(_PayloadBin, _MaskByte) ->
    %% Transform each byte with MaskByte using binary comprehension syntax
    <<>>.`,
    solutionCode: `-module(binary_scanner).
-export([split_key_value/1, extract_lines/1, xor_mask_payload/2]).

split_key_value(HeaderBin) ->
    case binary:split(HeaderBin, <<": ">>) of
        [Key, Value] ->
            {ok, Key, Value};
        _ ->
            {error, malformed_header}
    end.

extract_lines(MultiLineBin) ->
    binary:split(MultiLineBin, <<"\r\n">>, [global, trim_all]).

xor_mask_payload(PayloadBin, MaskByte) ->
    << <<(B bxor MaskByte):8>> || <<B:8>> <= PayloadBin >>.`,
  },

  // ── Lesson 4.7: ProcBin & Memory Safety ──────────────────────────────────
  {
    id: 'ch04-l07',
    chapterNumber: 4,
    lessonNumber: 7,
    lessonType: 'concept_exercise',
    title: 'Under the Hood: Off-Heap ProcBin Refc Binaries & Avoiding Sub-Binary Leaks (binary:copy/1)',
    difficulty: 'Advanced',
    xpReward: 100,
    visualScene: 'sub_binary_procbin_refc',
    conceptMarkdown: `## Why This Matters in Production

This is one of the most infamous production bugs in Erlang and Elixir engineering: **The Sub-Binary Memory Retention Leak**.

In high-concurrency systems, developers often see the BEAM VM process consuming gigabytes of system RAM even though application metrics show only a few small 16-byte session tokens stored in memory. The VM crashes with an Out-Of-Memory (OOM) kernel panic, but heap profilers report nearly empty process heaps!

Understanding how the BEAM allocates binaries and how to sever sub-binary pointers with **\`binary:copy/1\`** is essential for any production engineer.

## Deep Concept Breakdown & Under the Hood

### 1. The 64-Byte Binary Threshold
The BEAM manages binaries under two radically different memory strategies based on size:

1. **Heap Binaries (=< 64 bytes):**
   - Stored directly on the local process heap.
   - When passed between processes, their payload bytes are copied into the recipient's heap.
   - When the process performs garbage collection, heap binaries are reclaimed immediately.
2. **Refc Binaries / \`ProcBin\` (> 64 bytes):**
   - Allocated once in a global **off-heap shared binary memory pool**.
   - The process heap holds only a tiny 24-byte descriptor struct called a **\`ProcBin\`**, containing a pointer to the global buffer and an atomic reference count.
   - Passing a \`ProcBin\` between processes sends only the 24-byte descriptor and increments the atomic reference counter by 1—**zero payload copying across processes!**

### 2. The Sub-Binary Leak Pitfall
When you slice a binary:

\`\`\`erlang
<<Token:16/binary, _Rest/binary>> = Large64MBPacket.
\`\`\`

The BEAM does NOT allocate a new 16-byte binary. Instead, it creates a **Sub-Binary descriptor** that points directly into the original **64 MB buffer** with an offset and length!

Now consider what happens if you store \`Token\` inside a long-lived \`gen_server\` state or an ETS table:
- Even though your application only needs 16 bytes, the sub-binary holds a reference to the **entire 64 MB buffer**!
- The reference count on the 64 MB buffer cannot reach zero.
- **The entire 64 MB buffer remains pinned in RAM indefinitely!**
If you slice 1,000 such tokens from consecutive network packets, your node pins **64 Gigabytes of RAM** for just 16 Kilobytes of actual data!

### 3. The Production Fix: \`binary:copy/1\`
\`\`\`erlang
SafeToken = binary:copy(Token).
\`\`\`
\`binary:copy/1\` forces the BEAM to allocate a fresh, independent **Heap Binary** on the process heap containing only those 16 bytes.
The pointer to the massive 64 MB off-heap buffer is completely severed! The reference count drops to 0, and the BEAM's binary garbage collector immediately frees the 64 MB buffer.

### 4. Inspecting Pinned Buffers: \`binary:referenced_byte_size/1\`
OTP provides a diagnostic BIF:
- \`byte_size(SubBin)\`: Returns the logical size of the slice (e.g. \`16\` bytes).
- \`binary:referenced_byte_size(SubBin)\`: Returns the size of the underlying off-heap buffer pinned by this reference (e.g. \`65536\` bytes)!

## Parallel Worked Example

Consider a packet ingestion gateway:

\`\`\`erlang
-module(auth_unpinner).
-export([harvest_session_token/1]).

harvest_session_token(RawTlsPacket) ->
    case RawTlsPacket of
        <<Token:16/binary, _Rest/binary>> ->
            %% Unpin Token to release the multi-megabyte TLS buffer!
            SafeToken = binary:copy(Token),
            {ok, SafeToken};
        _ ->
            {error, truncated_packet}
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
binary:copy(Subject) -> binary()
binary:referenced_byte_size(Subject) -> non_neg_integer()
byte_size(Bitstring) -> non_neg_integer()
\`\`\`

## Assignment Specification

Implement safe memory slicing in \`src/binary_unpinner.erl\`:

1. \`extract_token_safe(LargePacket)\`:
   - Matches \`<<Token:16/binary, _Rest/binary>> = LargePacket\`.
   - Calls \`binary:copy/1\` on \`Token\` and returns \`{ok, SafeToken}\`.
   - If \`LargePacket\` is less than 16 bytes, returns \`{error, insufficient_data}\`.
2. \`slice_packet_safe(Packet, Length)\`:
   - Guards \`when is_binary(Packet), is_integer(Length), byte_size(Packet) >= Length\`.
   - Extracts \`Length\` bytes: \`<<Slice:Length/binary, _Rest/binary>>\`.
   - Returns \`binary:copy(Slice)\`.
3. \`inspect_refc_ratio(Bin)\`:
   - Returns a 2-tuple \`{byte_size(Bin), binary:referenced_byte_size(Bin)}\`.

## Rules & Verification Constraints

- Must call \`binary:copy/1\` on extracted slices.
- Must use \`binary:referenced_byte_size/1\`.`,
    otpDocCards: [
      {
        functionName: 'binary:copy/1',
        module: 'binary',
        signature: 'copy(Subject) -> binary()',
        typesSpec: ['Subject = binary()', 'Returns independent standalone copy of Subject'],
        description: 'Creates a standalone heap copy of a binary or sub-binary, severing off-heap buffer references.',
        complexityNote: 'O(N) copy, frees large pinned refc binary buffers.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#copy/1',
      },
      {
        functionName: 'binary:referenced_byte_size/1',
        module: 'binary',
        signature: 'referenced_byte_size(Subject) -> non_neg_integer()',
        typesSpec: ['Subject = binary()', 'Returns bytes pinned by Subject'],
        description: 'Returns the size in bytes of the underlying off-heap binary buffer referenced by Subject.',
        complexityNote: 'O(1) header inspection.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#referenced_byte_size/1',
      },
    ],
    mentalModelCheck: {
      question: 'When pattern matching <<Header:16/binary, _Rest/binary>> from a 64 MB video packet, why does calling binary:copy(Header) resolve the memory leak?',
      options: [
        {
          id: 'A',
          label: 'binary:copy/1 forces the 16 bytes into a fresh Heap Binary (< 64 bytes), allowing the 64 MB ProcBin reference count to drop to 0 and get freed',
          isCorrect: true,
          explanation: 'By copying the 16-byte slice, you allocate a private heap binary. The original 64 MB off-heap ProcBin no longer has any references pinning it, allowing immediate GC reclamation.',
        },
        {
          id: 'B',
          label: 'binary:copy/1 compresses the binary using gzip',
          isCorrect: false,
          explanation: 'binary:copy/1 performs term cloning to unpin off-heap buffers, not compression.',
        },
        {
          id: 'C',
          label: 'binary:copy/1 moves the binary to an ETS table',
          isCorrect: false,
          explanation: 'binary:copy/1 produces a normal Erlang binary on the calling process heap.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch04-07-a',
        title: 'Extract Safe 16-Byte Token Unpinned',
        erlangCall: 'binary_unpinner:extract_token_safe(<<1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16, "REMAINDER_OF_LARGE_PACKET">>)',
        expectedOutput: '{ok, <<1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16>>}',
        explanation: 'Extracts 16 bytes and unpins from parent buffer.',
      },
      {
        id: 'tc-ch04-07-b',
        title: 'Reject Truncated Token Packet',
        erlangCall: 'binary_unpinner:extract_token_safe(<<1,2,3>>)',
        expectedOutput: '{error, insufficient_data}',
        explanation: 'Fails when packet has fewer than 16 bytes.',
      },
      {
        id: 'tc-ch04-07-c',
        title: 'Slice Packet Safely with Copy',
        erlangCall: 'binary_unpinner:slice_packet_safe(<<"ABCDEFGHIJ">>, 4)',
        expectedOutput: '<<"ABCD">>',
        explanation: 'Slices exactly 4 bytes unpinned.',
      },
      {
        id: 'tc-ch04-07-d',
        title: 'Inspect Refc Ratio of Copied Binary',
        erlangCall: 'binary_unpinner:inspect_refc_ratio(binary:copy(<<"SMALL_HEAP_BIN">>))',
        expectedOutput: '{14, 14}',
        explanation: 'Small binaries <= 64 bytes copied to heap have identical byte_size and referenced_byte_size.',
      },
    ],
    astRules: {
      requiredCalls: ['binary:copy/1', 'binary:referenced_byte_size/1'],
    },
    solutionExplanation: 'Demonstrates sub-binary unpinning via binary:copy/1 and memory diagnostic inspection using binary:referenced_byte_size/1.',
    files: [
      {
        name: 'binary_unpinner.erl',
        path: 'src/binary_unpinner.erl',
        content: `-module(binary_unpinner).
-export([extract_token_safe/1, slice_packet_safe/2, inspect_refc_ratio/1]).

%% @doc Safely extract the first 16 bytes of LargePacket without holding the refc binary pinned in memory.
%% Return {ok, SafeToken} on success or {error, insufficient_data} if shorter than 16 bytes.
extract_token_safe(_LargePacket) ->
    %% Match the 16-byte token, unpin it to decouple from parent buffer, and return {ok, Token}
    {error, insufficient_data}.

%% @doc Extract a prefix slice of Length bytes and detach it from the parent refc binary.
slice_packet_safe(_Packet, _Length) ->
    %% Extract Length bytes and create an independent unpinned binary
    <<>>.

%% @doc Return {LogicalSize, ReferencedBufferSize} comparing byte_size to its underlying refc allocation.
inspect_refc_ratio(_Bin) ->
    %% Query byte size and underlying referenced allocation size
    {0, 0}.`,
      },
    ],
    solutionFiles: {
      'src/binary_unpinner.erl': `-module(binary_unpinner).
-export([extract_token_safe/1, slice_packet_safe/2, inspect_refc_ratio/1]).

extract_token_safe(<<Token:16/binary, _Rest/binary>>) ->
    {ok, binary:copy(Token)};
extract_token_safe(_) ->
    {error, insufficient_data}.

slice_packet_safe(Packet, Length) when is_binary(Packet), is_integer(Length), byte_size(Packet) >= Length ->
    <<Slice:Length/binary, _Rest/binary>> = Packet,
    binary:copy(Slice).

inspect_refc_ratio(Bin) ->
    {byte_size(Bin), binary:referenced_byte_size(Bin)}.`,
    },
    starterCode: `-module(binary_unpinner).
-export([extract_token_safe/1, slice_packet_safe/2, inspect_refc_ratio/1]).

%% @doc Safely extract the first 16 bytes of LargePacket without holding the refc binary pinned in memory.
%% Return {ok, SafeToken} on success or {error, insufficient_data} if shorter than 16 bytes.
extract_token_safe(_LargePacket) ->
    %% Match the 16-byte token, unpin it to decouple from parent buffer, and return {ok, Token}
    {error, insufficient_data}.

%% @doc Extract a prefix slice of Length bytes and detach it from the parent refc binary.
slice_packet_safe(_Packet, _Length) ->
    %% Extract Length bytes and create an independent unpinned binary
    <<>>.

%% @doc Return {LogicalSize, ReferencedBufferSize} comparing byte_size to its underlying refc allocation.
inspect_refc_ratio(_Bin) ->
    %% Query byte size and underlying referenced allocation size
    {0, 0}.`,
    solutionCode: `-module(binary_unpinner).
-export([extract_token_safe/1, slice_packet_safe/2, inspect_refc_ratio/1]).

extract_token_safe(<<Token:16/binary, _Rest/binary>>) ->
    {ok, binary:copy(Token)};
extract_token_safe(_) ->
    {error, insufficient_data}.

slice_packet_safe(Packet, Length) when is_binary(Packet), is_integer(Length), byte_size(Packet) >= Length ->
    <<Slice:Length/binary, _Rest/binary>> = Packet,
    binary:copy(Slice).

inspect_refc_ratio(Bin) ->
    {byte_size(Bin), binary:referenced_byte_size(Bin)}.`,
  },

  // ── Lesson 4.8: Chapter 4 Problem Set: TLV Packet Stream Parser ───────────
  {
    id: 'ch04-l08',
    chapterNumber: 4,
    lessonNumber: 8,
    lessonType: 'problem_set',
    title: 'Chapter 4 Problem Set: Binary Network Packet & Multi-Frame TLV Stream Parser (packet_parser.erl)',
    difficulty: 'Advanced',
    xpReward: 250,
    visualScene: 'sub_binary_procbin_refc',
    conceptMarkdown: `## Why This Matters in Production

Type-Length-Value (TLV) encoding is the foundational binary serialization protocol for telecommunications (Diameter, SMPP, GTP), financial protocols (ISO 8583, FIX binary), and IoT sensors.

In production Erlang services, network data arrives in chunks over TCP sockets. A single TCP packet may contain multiple concatenated frames, or a frame may be truncated across packet boundaries.
To build a resilient parser, you must combine:
1. **Bit Syntax (\`<<...>>\`)** for precise wire deserialization.
2. **Records (\`-record\`)** for high-speed tuple framing.
3. **Tail Recursion with Accumulators** to process streams in $O(1)$ stack space.
4. **\`binary:copy/1\`** to prevent sub-binary memory leaks across long-lived message queues!

## Deep Concept Breakdown & Under the Hood

### Wire Format Specification
Every frame on the wire begins with a 3-byte header followed by a variable-length payload:

\`\`\`
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version| Type  |         Length (16 bits, big-endian)          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                     Payload (Length bytes)                    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
\`\`\`

- **Version (4 bits, unsigned integer):** Protocol version (e.g. 1).
- **Type (4 bits, unsigned integer):** Message type code (e.g. 2 for PING, 3 for PONG).
- **Length (16 bits, big-endian unsigned integer):** Byte length of the following payload.
- **Payload (\`Length\` bytes, binary):** Raw data bytes.

### Multi-Frame Stream Processing
When multiple frames arrive in a single binary stream:
\`\`\`
<<Frame1, Frame2, Frame3, PartialTrailingFragment>>
\`\`\`
The stream processor must iteratively call \`parse_frame/1\` in a tail-recursive accumulator loop:
- If all bytes are cleanly consumed (\`<<>>\`), return \`{ok, [Frame1, Frame2, ...]}\` in their original order.
- If a trailing fragment remains that is too small to complete a header or payload, return \`{partial, ParsedFrames, binary:copy(TrailingBytes)}\` so the socket handler can buffer it until more bytes arrive!

## Parallel Worked Example

Consider a binary sensor telemetry parser:

\`\`\`erlang
-module(sensor_tlv).
-export([parse_sensor_frame/1, parse_sensor_stream/1]).

-record(sensor_event, {device_id, metric_code, val_len, data}).

parse_sensor_frame(<<DevId:8, Code:8, Len:16/big, Data:Len/binary, Rest/binary>>) ->
    Event = #sensor_event{
        device_id = DevId,
        metric_code = Code,
        val_len = Len,
        data = binary:copy(Data)
    },
    {ok, Event, Rest};
parse_sensor_frame(_) ->
    {error, incomplete}.

parse_sensor_stream(Stream) ->
    sensor_stream_loop(Stream, []).

sensor_stream_loop(<<>>, Acc) ->
    {ok, lists:reverse(Acc)};
sensor_stream_loop(Bytes, Acc) ->
    case parse_sensor_frame(Bytes) of
        {ok, Event, Rest} ->
            sensor_stream_loop(Rest, [Event | Acc]);
        {error, incomplete} ->
            {partial, lists:reverse(Acc), binary:copy(Bytes)}
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
-record(tlv_frame, {version, type, length, payload}).
<<Version:4, Type:4, Length:16/big-unsigned-integer, Payload:Length/binary, Rest/binary>>
binary:copy(Payload)
\`\`\`

## Assignment Specification

Implement the complete TLV protocol engine in \`src/packet_parser.erl\`:

1. Define record:
   \`-record(tlv_frame, {version, type, length, payload}).\`
2. \`parse_frame(Binary)\`:
   - Matches \`<<Version:4, Type:4, Length:16/big-unsigned-integer, Payload:Length/binary, Rest/binary>>\`.
   - Returns \`{ok, #tlv_frame{version = Version, type = Type, length = Length, payload = binary:copy(Payload)}, Rest}\`.
   - If \`Binary\` has fewer than 3 bytes or payload is truncated, returns \`{error, incomplete_frame}\`.
3. \`parse_tlv_stream(StreamBinary)\`:
   - Processes \`StreamBinary\` using a tail-recursive accumulator loop calling \`parse_frame/1\`.
   - If all bytes are consumed cleanly (\`<<>>\`), returns \`{ok, ParsedFramesList}\` in original sequence order.
   - If incomplete trailing bytes remain, returns \`{partial, ParsedFramesList, binary:copy(TrailingBytes)}\`.
4. \`encode_frame(#tlv_frame{version = V, type = T, payload = P})\`:
   - Computes payload size \`byte_size(P)\`.
   - Packs and returns the wire binary: \`<<V:4, T:4, (byte_size(P)):16/big-unsigned-integer, P/binary>>\`.

## Rules & Verification Constraints

- Must define \`-record(tlv_frame, {...})\`.
- Must use Bit Syntax \`<<...>>\`.
- Must call \`binary:copy/1\` on extracted payloads and partial stream remnants.
- \`parse_tlv_stream/1\` must be strictly tail-recursive.`,
    otpDocCards: [
      {
        functionName: 'bit_syntax_pattern',
        module: 'erlang',
        signature: '<<Version:4, Type:4, Len:16/big, Payload:Len/binary, Rest/binary>>',
        typesSpec: ['Arbitrary bit segment destructuring', 'Variable-length binary segment matching'],
        description: 'Single-instruction matching of network protocol frame headers and payloads.',
        complexityNote: 'Executed directly in BEAM parser loop with zero buffer copies.',
        officialUrl: 'https://www.erlang.org/doc/programming_examples/bit_syntax.html',
      },
    ],
    mentalModelCheck: {
      question: 'Why does parse_tlv_stream return {partial, ParsedFrames, TrailingBytes} when the last frame is incomplete?',
      options: [
        {
          id: 'A',
          label: 'Because TCP is a stream protocol where packets can be fragmented; the socket worker must buffer the trailing bytes and prepend them to the next incoming packet',
          isCorrect: true,
          explanation: 'TCP delivers an unbroken stream of bytes with no guarantee of packet frame boundaries. Partial frames must be saved until subsequent TCP packets arrive.',
        },
        {
          id: 'B',
          label: 'Because the BEAM VM garbage collector requires all trailing bytes to be saved in an ETS table',
          isCorrect: false,
          explanation: 'It is a network stream framing pattern, not related to ETS or garbage collection.',
        },
        {
          id: 'C',
          label: 'Because Erlang cannot parse binaries with an odd number of bytes',
          isCorrect: false,
          explanation: 'Erlang parses binaries of any byte count or bit count without restriction.',
        },
      ],
    },
    visibleTestCases: [
      {
        id: 'tc-ch04-08-a',
        title: 'Parse Single TLV Frame with Rest',
        erlangCall: 'packet_parser:parse_frame(<<1:4, 2:4, 4:16/big, "PING", "REST">>)',
        expectedOutput: '{ok, {tlv_frame, 1, 2, 4, <<"PING">>}, <<"REST">>}',
        explanation: 'Parses Version 1, Type 2, Length 4, unpins <<"PING">>, leaves <<"REST">>.',
      },
      {
        id: 'tc-ch04-08-b',
        title: 'Parse Full Stream of Consecutive TLV Frames',
        erlangCall: 'packet_parser:parse_tlv_stream(<<1:4, 2:4, 4:16/big, "PING", 1:4, 3:4, 4:16/big, "PONG">>)',
        expectedOutput: '{ok, [{tlv_frame, 1, 2, 4, <<"PING">>}, {tlv_frame, 1, 3, 4, <<"PONG">>}]}',
        explanation: 'Extracts both frames in order using tail-recursive stream processor.',
      },
      {
        id: 'tc-ch04-08-c',
        title: 'Handle Partial Trailing Fragment in Stream',
        erlangCall: 'packet_parser:parse_tlv_stream(<<1:4, 2:4, 4:16/big, "PING", 1:4, 3:4>>)',
        expectedOutput: '{partial, [{tlv_frame, 1, 2, 4, <<"PING">>}], <<19>>}',
        explanation: 'Returns parsed first frame and preserves partial 1-byte fragment <<19>> (0x13).',
      },
      {
        id: 'tc-ch04-08-d',
        title: 'Encode TLV Frame to Wire Binary',
        erlangCall: 'packet_parser:encode_frame({tlv_frame, 1, 2, 4, <<"TEST">>})',
        expectedOutput: '<<18, 0, 4, "TEST">>',
        explanation: 'Version 1 (0001) + Type 2 (0010) = 18; Length 4 = <<0, 4>>.',
      },
    ],
    astRules: {
      requiredConstructs: ['record_def', 'bit_syntax'],
      requiredCalls: ['binary:copy/1'],
      requireTailRecursion: ['parse_tlv_stream/1'],
    },
    solutionExplanation: 'Complete TLV binary protocol engine with bit syntax parsing, record construction, tail-recursive stream aggregation with fragment preservation, and encode_frame packing.',
    files: [
      {
        name: 'packet_parser.erl',
        path: 'src/packet_parser.erl',
        content: `-module(packet_parser).
-export([parse_frame/1, parse_tlv_stream/1, encode_frame/1]).

%% Define -record(tlv_frame, {version, type, length, payload}).

%% @doc Parse single frame: <<Version:4, Type:4, Length:16/big, Payload:Length/binary, Rest/binary>>.
parse_frame(_Binary) ->
    %% Return {ok, #tlv_frame{...}, Rest} or {error, incomplete_frame}
    {error, incomplete_frame}.

%% @doc Tail-recursive loop returning {ok, Frames} or {partial, Frames, TrailingBytes}.
parse_tlv_stream(_StreamBinary) ->
    %% Call parse_tlv_loop(StreamBinary, [])
    {ok, []}.

%% @doc Encode #tlv_frame into <<Version:4, Type:4, Length:16/big, Payload/binary>>.
encode_frame(_Frame) ->
    %% Pack and return wire binary
    <<>>.`,
      },
    ],
    solutionFiles: {
      'src/packet_parser.erl': `-module(packet_parser).
-export([parse_frame/1, parse_tlv_stream/1, encode_frame/1]).

-record(tlv_frame, {
    version :: non_neg_integer(),
    type :: non_neg_integer(),
    length :: non_neg_integer(),
    payload :: binary()
}).

parse_frame(<<Version:4, Type:4, Length:16/big-unsigned-integer, Payload:Length/binary, Rest/binary>>) ->
    Frame = #tlv_frame{
        version = Version,
        type = Type,
        length = Length,
        payload = binary:copy(Payload)
    },
    {ok, Frame, Rest};
parse_frame(_) ->
    {error, incomplete_frame}.

parse_tlv_stream(StreamBinary) ->
    parse_tlv_loop(StreamBinary, []).

parse_tlv_loop(<<>>, Acc) ->
    {ok, lists:reverse(Acc)};
parse_tlv_loop(Binary, Acc) ->
    case parse_frame(Binary) of
        {ok, Frame, Rest} ->
            parse_tlv_loop(Rest, [Frame | Acc]);
        {error, incomplete_frame} ->
            {partial, lists:reverse(Acc), binary:copy(Binary)}
    end.

encode_frame(#tlv_frame{version = Version, type = Type, payload = Payload}) ->
    Len = byte_size(Payload),
    <<Version:4, Type:4, Len:16/big-unsigned-integer, Payload/binary>>.`,
    },
    starterCode: `-module(packet_parser).
-export([parse_frame/1, parse_tlv_stream/1, encode_frame/1]).

%% Define -record(tlv_frame, {version, type, length, payload}).

%% @doc Parse single frame: <<Version:4, Type:4, Length:16/big, Payload:Length/binary, Rest/binary>>.
parse_frame(_Binary) ->
    %% Return {ok, #tlv_frame{...}, Rest} or {error, incomplete_frame}
    {error, incomplete_frame}.

%% @doc Tail-recursive loop returning {ok, Frames} or {partial, Frames, TrailingBytes}.
parse_tlv_stream(_StreamBinary) ->
    %% Call parse_tlv_loop(StreamBinary, [])
    {ok, []}.

%% @doc Encode #tlv_frame into <<Version:4, Type:4, Length:16/big, Payload/binary>>.
encode_frame(_Frame) ->
    %% Pack and return wire binary
    <<>>.`,
    solutionCode: `-module(packet_parser).
-export([parse_frame/1, parse_tlv_stream/1, encode_frame/1]).

-record(tlv_frame, {
    version :: non_neg_integer(),
    type :: non_neg_integer(),
    length :: non_neg_integer(),
    payload :: binary()
}).

parse_frame(<<Version:4, Type:4, Length:16/big-unsigned-integer, Payload:Length/binary, Rest/binary>>) ->
    Frame = #tlv_frame{
        version = Version,
        type = Type,
        length = Length,
        payload = binary:copy(Payload)
    },
    {ok, Frame, Rest};
parse_frame(_) ->
    {error, incomplete_frame}.

parse_tlv_stream(StreamBinary) ->
    parse_tlv_loop(StreamBinary, []).

parse_tlv_loop(<<>>, Acc) ->
    {ok, lists:reverse(Acc)};
parse_tlv_loop(Binary, Acc) ->
    case parse_frame(Binary) of
        {ok, Frame, Rest} ->
            parse_tlv_loop(Rest, [Frame | Acc]);
        {error, incomplete_frame} ->
            {partial, lists:reverse(Acc), binary:copy(Binary)}
    end.

encode_frame(#tlv_frame{version = Version, type = Type, payload = Payload}) ->
    Len = byte_size(Payload),
    <<Version:4, Type:4, Len:16/big-unsigned-integer, Payload/binary>>.`,
  },
];
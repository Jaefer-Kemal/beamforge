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
BaseDbConfig = #{host => "localhost", pool_size => 5, timeout_ms => 3000},
ProdDbConfig = #{host => "db.prod.internal", pool_size => 25, internal_token => abc123xyz},
ResolvedConfig = maps:merge(BaseDbConfig, ProdDbConfig).
%% => #{host => "db.prod.internal", pool_size => 25, timeout_ms => 3000, internal_token => abc123xyz}
\`\`\`

> [!important] Rule of Precedence in maps:merge/2
> In \`maps:merge(Map1, Map2)\`, if a key exists in both maps, **the value from \`Map2\` (the second argument) ALWAYS wins!**

To strip internal debugging tokens or sensitive keys before logging or exporting:
\`\`\`erlang
ExposedConfig = maps:without([internal_token], ResolvedConfig).
\`\`\`

### 4. Zero-List Folding: \`maps:fold/3\`

To aggregate values across a map, novices often write \`lists:foldl(Fun, 0, maps:to_list(Map))\`. This allocates an intermediate list of 2-tuples on the process heap!
**\`maps:fold(fun(Key, Val, AccIn) -> AccOut end, Acc0, Map)\`** iterates directly across the internal FlatMap or HAMT structures in $O(1)$ stack space without intermediate list allocations.

## Parallel Worked Example: Player Profile & Inventory Management

The following module manages player RPG profiles and equipment. Notice how \`maps:get/3\` supplies fallback stats, \`maps:update_with/4\` tracks skill increments, \`maps:merge/2\` and \`maps:without/2\` handle gear updates, and \`maps:fold/3\` computes total inventory capacity:

\`\`\`erlang
-module(player_profile).
-export([get_stat_or_default/3, record_skill_advancement/2, merge_character_gear/2, total_inventory_slots_used/1]).

%% 1. Safe fallback lookup
get_stat_or_default(Profile, StatKey, DefaultScore) ->
    maps:get(StatKey, Profile, DefaultScore).

%% 2. Atomic skill counter increment
record_skill_advancement(SkillsMap, SkillName) ->
    maps:update_with(SkillName, fun(Count) -> Count + 1 end, 1, SkillsMap).

%% 3. Merge gear rewards and strip temporary quest markers
merge_character_gear(DefaultGear, QuestRewards) ->
    Merged = maps:merge(DefaultGear, QuestRewards),
    maps:without([quest_marker, debug_seed], Merged).

%% 4. Direct fold summation across backpack items
total_inventory_slots_used(BackpackMap) ->
    maps:fold(fun(_Item, Qty, Total) -> Total + Qty end, 0, BackpackMap).
\`\`\`

## Standard Library Function Reference

\`\`\`erlang
maps:get(Key, Map, Default) -> Value | Default
maps:find(Key, Map) -> {ok, Value} | error
maps:update_with(Key, Fun, Init, Map) -> Map
maps:merge(Map1, Map2) -> Map
maps:without(Ks, Map) -> Map
maps:fold(Fun, Acc0, Map) -> Acc
\`\`\`

## Assignment Specification

Implement four map processing functions in \`src/map_stdlib.erl\`:

### 1. \`safe_get_load/2\`
- **Input**:
  - \`NodeMetricsMap\`: A map associating node atoms with integer load values.
  - \`NodeAtom\`: The target node atom to inspect.
- **Behavior**: Retrieve the load value associated with \`NodeAtom\` using \`maps:get/3\`. If \`NodeAtom\` is present, return its integer load value. If \`NodeAtom\` is missing, return \`0\` with zero exceptions.
- **Examples**:
  \`\`\`erlang
  map_stdlib:safe_get_load(#{node_a => 42}, node_a) -> 42
  map_stdlib:safe_get_load(#{node_a => 42}, node_b) -> 0
  \`\`\`

### 2. \`increment_tag_counts/2\`
- **Input**:
  - \`TagList\`: A list of tag atoms (e.g., \`[api, web, api, db, api]\`).
  - \`InitialCountsMap\`: A map containing baseline tag counts.
- **Behavior**: Tally the frequency of each tag in \`TagList\` by folding across the list and updating the accumulator map using \`maps:update_with/4\`.
  - For each tag encountered, if it already exists in the map, increment its existing count by \`1\`.
  - If the tag is not yet present, initialize its count to \`1\`.
  - Returns the updated frequency map.
- **Examples**:
  \`\`\`erlang
  map_stdlib:increment_tag_counts([api, web, api, db, api], #{})
  %% => #{api => 3, db => 1, web => 1}
  \`\`\`

### 3. \`merge_configs/2\`
- **Input**:
  - \`DefaultCfgMap\`: A baseline configuration map.
  - \`UserCfgMap\`: A map containing user-specified override settings.
- **Behavior**: Combine both configuration layers and sanitize the result:
  - Merge the two maps using \`maps:merge/2\`, ensuring user-specified settings take precedence on duplicate keys.
  - Remove sensitive keys \`secret_key\` and \`debug_token\` from the merged result using \`maps:without/2\`.
  - Returns the sanitized configuration map.
- **Examples**:
  \`\`\`erlang
  map_stdlib:merge_configs(
      #{port => 8080, timeout => 5000},
      #{port => 9000, secret_key => bad_secret, debug_token => 1234}
  )
  %% => #{port => 9000, timeout => 5000}
  \`\`\`

### 4. \`sum_map_values/1\`
- **Input**: A map \`NumericMap\` whose values are numbers.
- **Behavior**: Aggregate all values across \`NumericMap\` into a single sum using \`maps:fold/3\` without allocating intermediate lists on the heap. An empty map returns \`0\`.
- **Examples**:
  \`\`\`erlang
  map_stdlib:sum_map_values(#{cpu => 25, mem => 45, io => 10})
  %% => 80
  \`\`\`

## Verification Constraints

- You must employ \`maps:get/3\`, \`maps:update_with/4\`, \`maps:merge/2\`, and \`maps:fold/3\`.
- Do not convert the map to an intermediate list with \`maps:to_list/1\`.`,
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

%% @doc Retrieves node load metric with a safe zero fallback default.
safe_get_load(_NodeMetricsMap, _NodeAtom) ->
    0.

%% @doc Tallies tag symbol frequencies into an accumulator map.
increment_tag_counts(_TagList, InitialCountsMap) ->
    InitialCountsMap.

%% @doc Merges override settings onto defaults and strips sensitive keys.
merge_configs(DefaultCfgMap, _UserCfgMap) ->
    DefaultCfgMap.

%% @doc Aggregates all values across a numeric map into a total sum.
sum_map_values(_NumericMap) ->
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

%% @doc Retrieves node load metric with a safe zero fallback default.
safe_get_load(_NodeMetricsMap, _NodeAtom) ->
    0.

%% @doc Tallies tag symbol frequencies into an accumulator map.
increment_tag_counts(_TagList, InitialCountsMap) ->
    InitialCountsMap.

%% @doc Merges override settings onto defaults and strips sensitive keys.
merge_configs(DefaultCfgMap, _UserCfgMap) ->
    DefaultCfgMap.

%% @doc Aggregates all values across a numeric map into a total sum.
sum_map_values(_NumericMap) ->
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

In Erlang, records are not an independent runtime data type. The BEAM compiler translates records directly into standard tagged tuples at compile time:
\`#sensor_reading{sensor_id = 101, timestamp = 160000, value = 42.5, status = ok}\` literally compiles to \`{sensor_reading, 101, 160000, 42.5, ok}\` in \`.beam\` bytecode.

In ultra-low-latency protocol engines (such as telecommunication packet switches and high-frequency financial order books), records eliminate hash lookups and key dictionaries entirely while preserving readable field names for developers.

## Deep Concept Breakdown & Under the Hood

### 1. Record Declaration & Compilation
A record is declared at module level using the \`-record\` directive:

\`\`\`erlang
-record(sensor_reading, {
    sensor_id              :: non_neg_integer(),
    timestamp = 0          :: non_neg_integer(),
    value                  :: float() | integer(),
    status = ok            :: atom()
}).
\`\`\`

When compiled into BEAM bytecode:
- **Construction:** \`#sensor_reading{sensor_id = 42, value = 98.6}\` compiles into \`{sensor_reading, 42, 0, 98.6, ok}\` (substituting defaults for unspecified fields).
- **Field Extraction:** \`Reading#sensor_reading.value\` compiles directly to the BIF call \`element(4, Reading)\`.
- **Field Update:** \`Reading#sensor_reading{value = 99.1}\` compiles directly to the BIF call \`setelement(4, Reading, 99.1)\`.

### 2. The Compile-Time Tuple Index: \`#RecordName.FieldName\`
Notice the crucial difference between accessing a field on an existing variable vs writing the record name directly:
- \`Var#sensor_reading.value\` extracts the value of \`value\` from the record stored in \`Var\`.
- **\`#sensor_reading.value\`** (without a variable prefix) is a **compile-time macro** that evaluates to the **1-based integer index position** of \`value\` inside the underlying tuple!

In \`-record(sensor_reading, {sensor_id, timestamp = 0, value, status = ok})\`:
- Position 1 is the tuple tag: \`sensor_reading\`
- Position 2 is \`sensor_id\` $\\rightarrow$ \`#sensor_reading.sensor_id\` evaluates to \`2\`
- Position 3 is \`timestamp\` $\\rightarrow$ \`#sensor_reading.timestamp\` evaluates to \`3\`
- Position 4 is \`value\` $\\rightarrow$ \`#sensor_reading.value\` evaluates to \`4\`
- Position 5 is \`status\` $\\rightarrow$ \`#sensor_reading.status\` evaluates to \`5\`

### 3. Keypos Integration with Standard Libraries
In functions like \`lists:keyfind/3\` or ETS table lookups, standard OTP libraries require a key position integer (\`KeyPos\`). Without records, developers hardcode magic numbers like \`2\` or \`3\`. If a new field is ever added or reordered in the tuple, hardcoded offsets silently corrupt data!

With records, writing:
\`\`\`erlang
lists:keyfind(TargetId, #sensor_reading.sensor_id, ReadingList)
\`\`\`
instructs the compiler to emit the exact integer index. If the record definition changes in the future, the compiler automatically updates the index across every call site without off-by-one errors.

> [!warning] Syntax Watch: The Dot on Record Updates
> - **Extraction:** \`Var#rec.field\` (dot before field name).
> - **Update:** \`Var#rec{field = NewVal}\` (**NO dot** before the curly brace!).
> Writing \`Var.#rec{...}\` or \`Var#rec.{...}\` is an immediate compile syntax error.

## Parallel Worked Example: Audit Event Logging

The following module demonstrates record construction, immutable field updating, compile-time tuple index extraction, and keyed list searching in an audit logging domain:

\`\`\`erlang
-module(audit_logger).
-export([create_event/3, escalate_severity/1, severity_keypos/0, find_by_tenant/2]).

-record(audit_event, {
    tenant_id             :: non_neg_integer(),
    action                :: atom(),
    severity = low        :: atom(),
    timestamp = 0         :: non_neg_integer()
}).

%% 1. Record instantiation with field defaults
create_event(TenantId, Action, Severity) ->
    #audit_event{tenant_id = TenantId, action = Action, severity = Severity}.

%% 2. Record immutable update
escalate_severity(#audit_event{severity = _Current} = Event) ->
    Event#audit_event{severity = critical}.

%% 3. Compile-time tuple index (#audit_event.severity evaluates to 4)
severity_keypos() ->
    #audit_event.severity.

%% 4. Keyed search using compile-time record index
find_by_tenant(EventList, TargetTenantId) ->
    case lists:keyfind(TargetTenantId, #audit_event.tenant_id, EventList) of
        {audit_event, TargetTenantId, _, _, _} = Event ->
            {ok, Event};
        false ->
            not_found
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Record definition at module scope
-record(RecordName, {Field1 = Default1, Field2, ...}).

%% Record operations
#RecordName{Field1 = Value1}   %% Instantiation
Var#RecordName.Field1          %% Field extraction
Var#RecordName{Field1 = NewVal} %% Non-destructive copy with updated field
#RecordName.Field1             %% Compile-time 1-based integer index
\`\`\`

## Assignment Specification

Implement protocol framing records and lookup helpers in \`src/record_frames.erl\`.

### Record Schema: \`frame\`
Declare a module-level record named \`frame\` with three fields in exact order:
- \`seq\` with default value \`0\`
- \`type\` with default value \`data\`
- \`payload\` with no default value (defaults to \`undefined\`)

### Functions to Implement

#### \`new_frame/3\`
- **Input**:
  - \`Seq\`: non-negative integer sequence number
  - \`Type\`: atom indicating the frame type
  - \`Payload\`: arbitrary term payload
- **Behavior**: Instantiates and returns a new \`#frame\` record populated with the given fields.
- **Examples**:
  - \`new_frame(1, ack, ok)\` $\\rightarrow$ \`{frame, 1, ack, ok}\`
  - \`new_frame(3, data, ping)\` $\\rightarrow$ \`{frame, 3, data, ping}\`

#### \`advance_seq/1\`
- **Input**:
  - \`Frame\`: a \`frame\` record instance
- **Behavior**: Extracts the current sequence number from \`Frame\` and returns an updated copy of the record with its sequence number incremented by \`1\`.
- **Examples**:
  - \`advance_seq({frame, 1, ack, ok})\` $\\rightarrow$ \`{frame, 2, ack, ok}\`
  - \`advance_seq({frame, 10, data, ping})\` $\\rightarrow$ \`{frame, 11, data, ping}\`

#### \`frame_seq_index/0\`
- **Input**: None (\`()\`).
- **Behavior**: Returns the compile-time 1-based integer tuple index of the \`seq\` field in the \`frame\` record using record index syntax.
- **Examples**:
  - \`frame_seq_index()\` $\\rightarrow$ \`2\`

#### \`find_frame_by_seq/2\`
- **Input**:
  - \`FrameList\`: a list of \`frame\` records
  - \`TargetSeq\`: an integer target sequence number
- **Behavior**: Searches \`FrameList\` for the first frame whose sequence number matches \`TargetSeq\`, using \`lists:keyfind/3\` parameterized with the compile-time sequence field index. Returns \`{ok, Frame}\` when found, or \`not_found\` if absent.
- **Examples**:
  - \`find_frame_by_seq([{frame, 1, data, hello}, {frame, 2, ack, world}], 2)\` $\\rightarrow$ \`{ok, {frame, 2, ack, world}}\`
  - \`find_frame_by_seq([{frame, 1, data, hello}], 99)\` $\\rightarrow$ \`not_found\`

## Rules & Verification Constraints

- Declare \`-record(frame, {seq = 0, type = data, payload}).\` at module scope.
- Use \`lists:keyfind/3\` in combination with the compile-time field offset for sequence lookups.
- Do not hardcode magic numbers for tuple positions.`,
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
      question: 'What does the expression #sensor_reading.timestamp evaluate to at compile time for -record(sensor_reading, {sensor_id, timestamp = 0, value, status = ok}).?',
      options: [
        {
          id: 'A',
          label: 'The integer 3, representing the 1-based tuple position of timestamp within the underlying {sensor_reading, SensorId, Timestamp, Value, Status} tuple',
          isCorrect: true,
          explanation: 'In Erlang tuples, element 1 is the record tag sensor_reading, element 2 is sensor_id, so timestamp is at index 3.',
        },
        {
          id: 'B',
          label: 'The default value 0 defined in the record specification',
          isCorrect: false,
          explanation: 'Default values are only used when instantiating new records without explicit values; #record.field is a compile-time field index offset.',
        },
        {
          id: 'C',
          label: 'The atom timestamp',
          isCorrect: false,
          explanation: '#record.field evaluates to a 1-based integer index, not an atom.',
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

%% @doc Return a new frame record with the given sequence number, type, and payload.
new_frame(_Seq, _Type, _Payload) ->
    undefined.

%% @doc Return an updated frame record with its sequence number incremented by 1.
advance_seq(Frame) ->
    Frame.

%% @doc Return the compile-time 1-based tuple index of the seq field.
frame_seq_index() ->
    0.

%% @doc Search a list of frame records for the frame matching TargetSeq.
find_frame_by_seq(_FrameList, _TargetSeq) ->
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

%% @doc Return a new frame record with the given sequence number, type, and payload.
new_frame(_Seq, _Type, _Payload) ->
    undefined.

%% @doc Return an updated frame record with its sequence number incremented by 1.
advance_seq(Frame) ->
    Frame.

%% @doc Return the compile-time 1-based tuple index of the seq field.
frame_seq_index() ->
    0.

%% @doc Search a list of frame records for the frame matching TargetSeq.
find_frame_by_seq(_FrameList, _TargetSeq) ->
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

In Chapter 1 Lesson 1.5, you learned that string literals like \`"hello"\` are singly linked lists of integer Unicode codepoints (\`[104, 101, 108, 108, 111]\`). On a 64-bit BEAM VM, each linked list cons cell requires two machine words (16 bytes). A simple 5-character string \`"hello"\` consumes **80 bytes of RAM**!

In high-throughput network applications (HTTP/2, WebSocket, XMPP, and distributed telemetry), transferring gigabytes of textual payloads using character lists creates severe memory bloat and relentless garbage collection pressure.

Erlang solves this with **Binaries (\`<<"...">>\`)** and **IOLists (\`iolist()\`)**—the foundation of telecom-grade network throughput and low latency.

## Deep Concept Breakdown & Under the Hood

### 1. Binaries: 16x Memory Reduction
A binary is a contiguous array of raw 8-bit bytes bounded by \`<<\` and \`>>\`:

\`\`\`erlang
TextBin = <<"hello">>.  %% Equivalent to <<104, 101, 108, 108, 111>>
\`\`\`

- \`"hello"\` (Character List) = $5 \\times 16 = \\mathbf{80\\text{ bytes}}$ on the process heap.
- \`<<"hello">>\` (Binary) = $\\mathbf{5\\text{ bytes}}$ of contiguous payload!

That represents a **16x reduction in memory consumption** for all network text, JSON payloads, and XML stanzas.

Essential BIFs for binary handling:
- \`byte_size(Bin) -> integer()\`: Returns the byte count of a binary in O(1).
- \`is_binary(Term) -> boolean()\`: Guard BIF checking whether a term is a binary.
- \`list_to_binary(CharList) -> binary()\`: Converts a character list to a binary.
- \`binary_to_list(Bin) -> list()\`: Converts a binary back to an integer codepoint list.
- \`integer_to_binary(Int) -> binary()\`: Formats an integer as ASCII decimal digits (e.g. \`123\` $\\rightarrow$ \`<<"123">>\`).

### 2. The Zero-Copy IOList Pattern (\`iolist()\` / \`iodata()\`)
In typical language runtimes (Node.js, Python, Java), assembling a network packet requires allocating a new buffer and concatenating strings:
\`Header + Body + Footer\` $\\rightarrow$ **Buffer Copying Penalty**.

In Erlang, the network socket drivers (\`gen_tcp:send/2\`) and file writers (\`file:write/2\`) do not require a flat contiguous buffer! They natively accept an **IOList**—a deeply nested list of binaries, character lists, and single-byte integers:

\`\`\`erlang
CommandIoList = [
    <<"*3\\r\\n">>,
    <<"$3\\r\\nSET\\r\n">>,
    <<"$4\\r\\nuser\\r\n">>,
    <<"$">>, integer_to_binary(byte_size(PayloadBin)), <<"\\r\\n">>,
    PayloadBin, <<"\\r\\n">>
].
\`\`\`

#### How the BEAM Kernel Driver Streams IOLists with Zero Copies
When \`gen_tcp:send(Socket, CommandIoList)\` is called, the BEAM VM does **not** flatten the list in RAM.

Instead, ERTS traverses the nested list and translates the pointers directly into an array of \`iovec\` descriptors passed to the operating system's scatter-gather **\`writev()\` system call**.

The OS network stack gathers the disjoint memory segments directly from the BEAM process heap and streams them onto the network wire with **zero intermediate memory copies**.

If you need to measure or flatten an IOList for debugging or hashing, the standard library provides:
- \`iolist_to_binary(IoList) -> binary()\` (flattens in C speed).
- \`iolist_size(IoList) -> integer()\` (calculates total byte count in O(N) traversal without allocating a new buffer!).

## Parallel Worked Example: XMPP Presence Wire Framer

The following module demonstrates nested IOList construction, byte sizing, and flattening for an XMPP presence broadcast packet:

\`\`\`erlang
-module(xmpp_frame_builder).
-export([make_presence_frame/2, render_wire_binary/1]).

%% Assembles nested IOList without copying StatusTextBin
make_presence_frame(FromJid, StatusTextBin) ->
    [
        <<"<presence from='">>, FromJid, <<"'>">>,
        <<"<status>">>, StatusTextBin, <<"</status>">>,
        <<"</presence>">>
    ].

%% Computes total wire size and flattens to binary
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

Implement binary memory comparisons and HTTP framing in \`src/iolist_builder.erl\`.

### Functions to Implement

#### \`string_vs_binary_bytes/1\`
- **Input**:
  - \`CharList\`: a character list / string (e.g. \`"hello"\`)
- **Behavior**: Converts the character list into a compact binary representation, then returns a 4-element tagged tuple:
  \`{size_comparison, EstimatedListBytes, BinaryBytes, Binary}\`
  where:
  - \`EstimatedListBytes\` is the estimated 64-bit BEAM heap footprint of the linked list (each character cell occupies 16 bytes: \`length(CharList) * 16\`).
  - \`BinaryBytes\` is the exact byte count of the converted binary.
  - \`Binary\` is the resulting binary value.
- **Examples**:
  - \`string_vs_binary_bytes("hello")\` $\\rightarrow$ \`{size_comparison, 80, 5, <<"hello">>}\`
  - \`string_vs_binary_bytes("beamforge")\` $\\rightarrow$ \`{size_comparison, 144, 9, <<"beamforge">>}\`

#### \`build_http_response_iolist/2\`
- **Input**:
  - \`StatusCodeInt\`: integer HTTP status code (e.g. \`200\`)
  - \`BodyBin\`: binary payload body
- **Behavior**: Constructs and returns a nested IOList representing an HTTP/1.1 response without copying or flattening the body. The response begins with the HTTP status line (\`HTTP/1.1 <StatusCode> OK\\r\\n\`), followed by the \`Content-Length: <ByteLength>\\r\\n\\r\\n\` header matching the byte length of \`BodyBin\`, followed by \`BodyBin\`.
- **Examples**:
  - \`build_http_response_iolist(200, <<"{\\"status\\":\\"ok\\"}">>)\` $\\rightarrow$
    \`[<<"HTTP/1.1 ">>, <<"200">>, <<" OK\\r\\nContent-Length: ">>, <<"15">>, <<"\\r\\n\\r\\n">>, <<"{\\"status\\":\\"ok\\"}">>]\`

#### \`flatten_iolist/1\`
- **Input**:
  - \`IoList\`: an IOList or nested list of binaries
- **Behavior**: Calculates the total byte size of \`IoList\` and flattens it into a contiguous binary, returning a 2-tuple \`{TotalBytes, FlatBinary}\`.
- **Examples**:
  - \`flatten_iolist([<<"PING">>, [<<"-">>, <<"PONG">>]])\` $\\rightarrow$ \`{9, <<"PING-PONG">>}\`

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
    {size_comparison, 0, 0, <<>>}.

%% @doc Return nested IOList for an HTTP/1.1 response without flattening.
build_http_response_iolist(_StatusCodeInt, _BodyBin) ->
    [].

%% @doc Measure the total size of IoList in O(1) and flatten it into a continuous binary.
%% Return {TotalBytes, FlatBinary}.
flatten_iolist(_IoList) ->
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
    {size_comparison, 0, 0, <<>>}.

%% @doc Return nested IOList for an HTTP/1.1 response without flattening.
build_http_response_iolist(_StatusCodeInt, _BodyBin) ->
    [].

%% @doc Measure the total size of IoList in O(1) and flatten it into a continuous binary.
%% Return {TotalBytes, FlatBinary}.
flatten_iolist(_IoList) ->
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

Erlang's **Bit Syntax (\`<<...>>\`)** is widely celebrated as one of the most powerful declarative binary features in programming language history.

In C, Go, or Rust, parsing and emitting binary network protocols (TCP/IP packets, TLS records, DNS queries, or WebSocket frames) requires writing fragile, error-prone bit-shifting and bit-masking arithmetic (\`(byte >> 4) & 0x0F\`).

In Erlang, you declare the binary wire format with exact bit widths, signedness, and endianness directly in pattern matching expressions! The BEAM compiler maps these declarations into low-level CPU vector operations with near-zero overhead.

## Deep Concept Breakdown & Under the Hood

### 1. Anatomy of a Bit Segment
A bit syntax expression contains comma-separated segments:
\`\`\`erlang
<<Value:Size/TypeSpecifiers, ...>>
\`\`\`

The specifier components (\`Type-Signedness-Endianness-Unit\`) include:
- **Type:**
  - \`integer\` (default)
  - \`binary\` / \`bytes\` (byte-aligned binary chunk)
  - \`bitstring\` / \`bits\` (arbitrary bit count)
  - \`float\` (32 or 64-bit IEEE float)
  - \`utf8\` (Unicode UTF-8 codepoint)
- **Signedness:**
  - \`unsigned\` (default, \`0..255\` for 8 bits)
  - \`signed\` (two's complement, \`-128..127\` for 8 bits)
- **Endianness:**
  - \`big\` (Network Byte Order, default): Most significant byte first (\`<<512:16/big>> == <<2, 0>>\`).
  - \`little\` (x86 architecture order): Least significant byte first (\`<<512:16/little>> == <<0, 2>>\`).

### 2. Packing Bit-Level Fields
Consider an IoT sensor header packing a 4-bit Device Type, a 4-bit Alert Priority, and a 16-bit Metric Reading:

\`\`\`erlang
%% Device Type: 3 (0011), Priority: 1 (0001) => 00110001 = 0x31 (decimal 49)
%% Metric Reading: 512 => 0x0200 (decimal 2, 0)
TelemetryHeader = <<3:4, 1:4, 512:16/big>>.
%% Result is a 3-byte binary: <<49, 2, 0>>!
\`\`\`

The BEAM compiler emits hardware vector instructions (\`bs_put_integer\`, \`bs_put_binary\`) directly into machine code for maximum throughput.

### 3. Dynamic Length Pattern Matching
In Erlang, you can bind a variable in an earlier segment of a binary pattern and **immediately use that variable as the size specifier** of a subsequent segment in the very same pattern!

\`\`\`erlang
%% Len is bound first, then exactly Len bytes are extracted into Payload:
<<Len:16/big, Payload:Len/binary, Rest/binary>> = Packet.
\`\`\`

If \`Packet\` contains fewer than \`Len\` bytes, the pattern match fails cleanly without memory overrun exceptions.

## Parallel Worked Example: DNS Query Header Wire Formatter

The following module demonstrates packing and pattern-matching bit fields in a DNS question header domain:

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

Implement binary wire packing and header unpacking in \`src/bit_packer.erl\`.

### Functions to Implement

#### \`pack_header/3\`
- **Input**:
  - \`Version\`: non-negative integer (4-bit unsigned)
  - \`Flags\`: non-negative integer (4-bit unsigned)
  - \`Length\`: non-negative integer (16-bit unsigned)
- **Behavior**: Packs the 4-bit version, 4-bit flags, and 16-bit big-endian unsigned length into a compact 3-byte binary header.
- **Examples**:
  - \`pack_header(4, 2, 1024)\` $\\rightarrow$ \`<<66, 4, 0>>\`
  - \`pack_header(1, 15, 65535)\` $\\rightarrow$ \`<<31, 255, 255>>\`

#### \`unpack_header/1\`
- **Input**:
  - \`Binary\`: a binary stream
- **Behavior**: Inspects \`Binary\` for a 3-byte header. If at least 3 bytes are available, extracts the 4-bit \`Version\`, 4-bit \`Flags\`, and 16-bit big-endian \`Length\`, and captures all remaining trailing bytes as \`Payload\`, returning \`{ok, Version, Flags, Length, Payload}\`. If fewer than 3 bytes are provided, returns \`{error, insufficient_bytes}\`.
- **Examples**:
  - \`unpack_header(<<66, 4, 0, "PAYLOAD">>)\` $\\rightarrow$ \`{ok, 4, 2, 1024, <<"PAYLOAD">>}\`
  - \`unpack_header(<<66, 4>>)\` $\\rightarrow$ \`{error, insufficient_bytes}\`

#### \`encode_utf8_tagged/1\`
- **Input**:
  - \`TextBinary\`: a binary text string
- **Behavior**: Constructs a length-prefixed tagged binary message by packing:
  1. An 8-bit tag byte with hexadecimal value \`16#01\` (decimal \`1\`),
  2. A 16-bit big-endian unsigned integer representing the byte length of \`TextBinary\`,
  3. The raw \`TextBinary\` payload bytes.
- **Examples**:
  - \`encode_utf8_tagged(<<"HELLO">>)\` $\\rightarrow$ \`<<1, 0, 5, "HELLO">>\`
  - \`encode_utf8_tagged(<<"HELLO_OTP">>)\` $\\rightarrow$ \`<<1, 0, 9, "HELLO_OTP">>\`

## Rules & Verification Constraints

- Must use Bit Syntax \`<<...>>\`.
- All multi-byte numeric fields must use big-endian (\`big\`) network byte ordering.
- Guard \`encode_utf8_tagged/1\` with \`is_binary/1\`.`,
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
      question: 'What is the binary representation of <<3:4, 1:4, 512:16/big>>?',
      options: [
        {
          id: 'A',
          label: '<<49, 2, 0>> (0x31 = 0011 0001 = 49, and 512 in 16-bit big-endian is 0x0200 = 2, 0)',
          isCorrect: true,
          explanation: '3 (0011) and 1 (0001) pack into the first byte (00110001 = 49); 512 in 16 bits big-endian is high byte 2 and low byte 0.',
        },
        {
          id: 'B',
          label: '<<3, 1, 5, 12>>',
          isCorrect: false,
          explanation: '3 and 1 are 4-bit nibbles that pack together into a single 8-bit byte.',
        },
        {
          id: 'C',
          label: '<<49, 0, 2>>',
          isCorrect: false,
          explanation: '<<49, 0, 2>> represents little-endian byte ordering; big-endian places the high byte 2 first.',
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

%% @doc Pack 4-bit Version, 4-bit Flags, and 16-bit big-endian Length into a 3-byte binary.
pack_header(_Version, _Flags, _Length) ->
    <<>>.

%% @doc Unpack 3-byte header and extract trailing payload binary.
unpack_header(_Binary) ->
    {error, insufficient_bytes}.

%% @doc Encode length-prefixed tagged text binary.
encode_utf8_tagged(_TextBinary) ->
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

%% @doc Pack 4-bit Version, 4-bit Flags, and 16-bit big-endian Length into a 3-byte binary.
pack_header(_Version, _Flags, _Length) ->
    <<>>.

%% @doc Unpack 3-byte header and extract trailing payload binary.
unpack_header(_Binary) ->
    {error, insufficient_bytes}.

%% @doc Encode length-prefixed tagged text binary.
encode_utf8_tagged(_TextBinary) ->
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

Furthermore, Erlang includes **Binary Comprehensions** for lightning-fast byte transformation (such as WebSocket masking, XOR ciphering, and protocol checksums) without creating intermediate linked lists.

## Deep Concept Breakdown & Under the Hood

### 1. High-Speed Splitting: \`binary:split/2\` vs \`binary:split/3\`
- **\`binary:split(Subject, Pattern) -> [Part1, Remainder]\`:**
  Splits \`Subject\` on the **first occurrence** of \`Pattern\`. This is ideal for parsing key-value pairs (such as config options or headers), where the value itself might contain additional delimiters:
  \`\`\`erlang
  binary:split(<<"cache_ttl=3600">>, <<"=">>)
  %% => [<<"cache_ttl">>, <<"3600">>]
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
In Chapter 1 Lesson 1.2, you learned that the numeric less-than-or-equal comparison operator in Erlang is \`=<\` (not \`<=\`).
Here is what **\`<=\`** actually is in Erlang: the **Binary Comprehension Generator Arrow**!

A binary comprehension creates a new binary by streaming bytes or bit-groups out of an input binary:
\`\`\`erlang
<< <<OutExpression>> || <<Pattern>> <= InputBinary, FilterPredicate >>
\`\`\`

#### Example: Byte Inversion
\`\`\`erlang
Inverted = << <<(bnot Byte):8>> || <<Byte:8>> <= OriginalData >>.
\`\`\`
The BEAM VM compiles this comprehension into an ultra-tight, non-allocating C loop that executes in hardware CPU registers.

## Parallel Worked Example: Pipe-Delimited Log Processor

The following module demonstrates binary splitting and byte transformation on pipe-delimited log records:

\`\`\`erlang
-module(pipe_parser).
-export([split_entry/1, extract_csv_fields/1, invert_bytes/1]).

%% 1. Split first entry delimiter
split_entry(RecordBin) ->
    case binary:split(RecordBin, <<"|">>) of
        [Prefix, Remainder] -> {ok, Prefix, Remainder};
        [Prefix] -> {ok, Prefix, <<>>}
    end.

%% 2. Split all non-empty fields on comma
extract_csv_fields(CsvRowBin) ->
    binary:split(CsvRowBin, <<",">>, [global, trim_all]).

%% 3. Byte transformation using binary comprehension
invert_bytes(Bin) ->
    << <<(bnot B):8>> || <<B:8>> <= Bin >>.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
binary:split(Subject, Pattern) -> [binary()]
binary:split(Subject, Pattern, Options) -> [binary()]
binary:match(Subject, Pattern) -> {byte_offset(), length()} | nomatch
<< <<Out:8>> || <<In:8>> <= InBinary >>
\`\`\`

## Assignment Specification

Implement binary scanning and masking in \`src/binary_scanner.erl\`.

### Functions to Implement

#### \`split_key_value/1\`
- **Input**:
  - \`HeaderBin\`: a binary HTTP header line (e.g. \`<<"Content-Type: application/json">>\`)
- **Behavior**: Splits the header on the first occurrence of the separator \`<<": ">>\`. If the separator is found, returns \`{ok, KeyBin, ValueBin}\`. If the separator is absent, returns \`{error, malformed_header}\`.
- **Examples**:
  - \`split_key_value(<<"Content-Type: application/json">>)\` $\\rightarrow$ \`{ok, <<"Content-Type">>, <<"application/json">>}\`
  - \`split_key_value(<<"BadHeaderWithoutSeparator">>)\` $\\rightarrow$ \`{error, malformed_header}\`

#### \`extract_lines/1\`
- **Input**:
  - \`MultiLineBin\`: a binary containing multiple CRLF-delimited lines
- **Behavior**: Splits the binary across all CRLF (\`<<"\\r\\n">>\`) boundaries and discards any empty tokens or trailing blanks, returning a list of all non-empty line binaries.
- **Examples**:
  - \`extract_lines(<<"line1\\r\\n\\r\\nline2\\r\\nline3\\r\\n">>)\` $\\rightarrow$ \`[<<"line1">>, <<"line2">>, <<"line3">>]\`

#### \`xor_mask_payload/2\`
- **Input**:
  - \`PayloadBin\`: binary payload bytes
  - \`MaskByte\`: an 8-bit integer mask (\`0..255\`)
- **Behavior**: Transforms each byte of \`PayloadBin\` by applying bitwise XOR (\`bxor\`) with \`MaskByte\` using a binary comprehension, returning the resulting masked binary.
- **Examples**:
  - \`xor_mask_payload(<<16#AA, 16#55>>, 16#FF)\` $\\rightarrow$ \`<<85, 170>>\`
  - \`xor_mask_payload(<<"super_secret">>, 16#AA)\` $\\rightarrow$ masked binary

## Rules & Verification Constraints

- Must use \`binary:split/2\` and \`binary:split/3\`.
- Must use binary comprehension with the \`<=\` generator arrow.`,
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

%% @doc Split binary header on first separator into {ok, Key, Value} or error.
split_key_value(_HeaderBin) ->
    {error, malformed_header}.

%% @doc Split multi-line binary on CRLF, trimming empty tokens.
extract_lines(_MultiLineBin) ->
    [].

%% @doc Apply bitwise XOR mask to each byte in payload using binary comprehension.
xor_mask_payload(_PayloadBin, _MaskByte) ->
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

%% @doc Split binary header on first separator into {ok, Key, Value} or error.
split_key_value(_HeaderBin) ->
    {error, malformed_header}.

%% @doc Split multi-line binary on CRLF, trimming empty tokens.
extract_lines(_MultiLineBin) ->
    [].

%% @doc Apply bitwise XOR mask to each byte in payload using binary comprehension.
xor_mask_payload(_PayloadBin, _MaskByte) ->
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

Understanding how the BEAM allocates binaries and how to sever sub-binary pointers with **\`binary:copy/1\`** is essential for any production backend engineer.

## Deep Concept Breakdown & Under the Hood

### 1. The 64-Byte Binary Threshold
The BEAM manages binaries under two radically different memory strategies based on size:

1. **Heap Binaries (=< 64 bytes):**
   - Stored directly on the local process heap.
   - When passed between processes, their payload bytes are copied into the recipient's heap.
   - Reclaimed immediately during ordinary process garbage collection.
2. **Refc Binaries / \`ProcBin\` (> 64 bytes):**
   - Allocated once in a global **off-heap shared binary memory pool**.
   - The process heap holds only a tiny 24-byte descriptor struct called a **\`ProcBin\`**, containing a pointer to the global buffer and an atomic reference count.
   - Passing a \`ProcBin\` between processes sends only the 24-byte descriptor and increments the atomic reference counter by 1—**zero payload copying across processes!**

### 2. The Sub-Binary Leak Pitfall
When you slice a binary:

\`\`\`erlang
<<HeaderId:8/binary, _Rest/binary>> = Large48MBBuffer.
\`\`\`

The BEAM does NOT allocate a new 8-byte binary. Instead, it creates a **Sub-Binary descriptor** that points directly into the original **48 MB buffer** with an offset and length!

Now consider what happens if you store \`HeaderId\` inside a long-lived \`gen_server\` state or an ETS table:
- Even though your application only needs 8 bytes, the sub-binary holds a reference to the **entire 48 MB buffer**!
- The reference count on the 48 MB buffer cannot reach zero.
- **The entire 48 MB buffer remains pinned in RAM indefinitely!**
If you slice 1,000 such IDs from consecutive network packets, your node pins **48 Gigabytes of RAM** for just 8 Kilobytes of actual data!

### 3. The Production Fix: \`binary:copy/1\`
\`\`\`erlang
SafeHeaderId = binary:copy(HeaderId).
\`\`\`
\`binary:copy/1\` forces the BEAM to allocate a fresh, independent **Heap Binary** on the process heap containing only those 8 bytes.

The pointer to the massive 48 MB off-heap buffer is completely severed! The reference count drops to 0, and the BEAM's binary garbage collector immediately frees the 48 MB buffer.

### 4. Inspecting Pinned Buffers: \`binary:referenced_byte_size/1\`
OTP provides a diagnostic BIF:
- \`byte_size(SubBin)\`: Returns the logical size of the slice (e.g. \`8\` bytes).
- \`binary:referenced_byte_size(SubBin)\`: Returns the size of the underlying off-heap buffer pinned by this reference (e.g. \`50331648\` bytes)!

## Parallel Worked Example: WAV Audio Chunk Extractor

The following module demonstrates safely extracting a 4-byte chunk identifier from a multi-megabyte audio file without pinning the parent recording:

\`\`\`erlang
-module(wav_header_parser).
-export([extract_format_chunk/1, inspect_memory_footprint/1]).

%% Extracts 4-byte chunk identifier from a multi-megabyte audio recording
extract_format_chunk(RawWavBinary) ->
    case RawWavBinary of
        <<ChunkId:4/binary, _RemainingAudio/binary>> ->
            %% Sever the sub-binary reference to free the parent recording buffer
            SafeChunk = binary:copy(ChunkId),
            {ok, SafeChunk};
        _ ->
            {error, invalid_wav_header}
    end.

%% Returns logical size and pinned off-heap buffer size
inspect_memory_footprint(Bin) ->
    {byte_size(Bin), binary:referenced_byte_size(Bin)}.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
binary:copy(Subject) -> binary()
binary:referenced_byte_size(Subject) -> non_neg_integer()
byte_size(Bitstring) -> non_neg_integer()
\`\`\`

## Assignment Specification

Implement safe memory slicing in \`src/binary_unpinner.erl\`.

### Functions to Implement

#### \`extract_token_safe/1\`
- **Input**:
  - \`LargePacket\`: a binary network buffer
- **Behavior**: Extracts the first 16 bytes as a token and decouples it from the underlying off-heap refc binary using \`binary:copy/1\`, returning \`{ok, SafeToken}\`. If \`LargePacket\` contains fewer than 16 bytes, returns \`{error, insufficient_data}\`.
- **Examples**:
  - \`extract_token_safe(<<1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16, "REST">>)\` $\\rightarrow$
    \`{ok, <<1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16>>}\`
  - \`extract_token_safe(<<1, 2, 3>>)\` $\\rightarrow$ \`{error, insufficient_data}\`

#### \`slice_packet_safe/2\`
- **Input**:
  - \`Packet\`: binary buffer
  - \`Length\`: non-negative integer byte count
- **Behavior**: Extracts a prefix of \`Length\` bytes from \`Packet\` and returns a standalone, unpinned binary decoupled from any parent off-heap buffer. Guarded to ensure \`Packet\` is a binary, \`Length\` is an integer, and \`Packet\` contains at least \`Length\` bytes.
- **Examples**:
  - \`slice_packet_safe(<<"ABCDEFGHIJ">>, 4)\` $\\rightarrow$ \`<<"ABCD">>\`

#### \`inspect_refc_ratio/1\`
- **Input**:
  - \`Bin\`: a binary
- **Behavior**: Queries and returns a 2-tuple \`{LogicalSize, ReferencedBufferSize}\` containing the logical byte size of \`Bin\` and the size of the underlying off-heap binary buffer pinned by its reference.
- **Examples**:
  - \`inspect_refc_ratio(binary:copy(<<"TEST">>))\` $\\rightarrow$ \`{4, 4}\`

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
      question: 'When extracting an 8-byte session identifier <<SessionId:8/binary, _Rest/binary>> from a 32 MB inbound network stream, why does calling binary:copy(SessionId) resolve the memory retention leak?',
      options: [
        {
          id: 'A',
          label: 'binary:copy/1 forces the 8 bytes into a fresh independent Heap Binary (<= 64 bytes), allowing the 32 MB ProcBin reference count to drop to 0 and get reclaimed by GC',
          isCorrect: true,
          explanation: 'By copying the 8-byte slice, you allocate a private heap binary. The original 32 MB off-heap ProcBin no longer has any references pinning it, allowing immediate GC reclamation.',
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
extract_token_safe(_LargePacket) ->
    {error, insufficient_data}.

%% @doc Extract a prefix slice of Length bytes and detach it from the parent refc binary.
slice_packet_safe(_Packet, _Length) ->
    <<>>.

%% @doc Return {LogicalSize, ReferencedBufferSize} comparing byte_size to its underlying refc allocation.
inspect_refc_ratio(_Bin) ->
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
extract_token_safe(_LargePacket) ->
    {error, insufficient_data}.

%% @doc Extract a prefix slice of Length bytes and detach it from the parent refc binary.
slice_packet_safe(_Packet, _Length) ->
    <<>>.

%% @doc Return {LogicalSize, ReferencedBufferSize} comparing byte_size to its underlying refc allocation.
inspect_refc_ratio(_Bin) ->
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

Type-Length-Value (TLV) encoding is the foundational binary serialization protocol for telecommunications (Diameter, SMPP, GTP), financial protocols (ISO 8583, FIX binary), and IoT sensor gateways.

In production Erlang services, network data arrives in chunks over raw TCP sockets. A single TCP packet may contain multiple concatenated frames, or a frame may be truncated across packet boundaries.

To build a resilient parser, you must combine:
1. **Bit Syntax (\`<<...>>\`)** for precise wire deserialization.
2. **Records (\`-record\`)** for high-speed tuple framing.
3. **Tail Recursion with Accumulators** to process streams in O(1) stack space.
4. **\`binary:copy/1\`** to prevent sub-binary memory leaks across long-lived message queues!

## Deep Concept Breakdown & Under the Hood

### Wire Format Specification
Every frame on the wire begins with a 3-byte (24-bit) header followed by a variable-length payload:

| Field | Bit Width | Type | Description |
| :--- | :--- | :--- | :--- |
| **Version** | 4 bits | Unsigned integer | Protocol version number (e.g. 1) |
| **Type** | 4 bits | Unsigned integer | Message opcode identifier (e.g. 2 for PING, 3 for PONG) |
| **Length** | 16 bits | Big-endian unsigned integer | Byte length of the subsequent payload |
| **Payload** | Variable (\`Length\` bytes) | Binary | Raw message payload bytes |

### Multi-Frame Stream Processing
When multiple frames arrive in a single binary stream:
\`\`\`
<<Frame1, Frame2, Frame3, PartialTrailingFragment>>
\`\`\`

The stream processor must iteratively call \`parse_frame/1\` in a tail-recursive accumulator loop:
- If all bytes are cleanly consumed (\`<<>>\`), return \`{ok, [Frame1, Frame2, ...]}\` in their original sequence order.
- If a trailing fragment remains that is too small to complete a header or payload, return \`{partial, ParsedFrames, binary:copy(TrailingBytes)}\` so the socket handler can buffer the fragment until subsequent network packets arrive!

## Parallel Worked Example: Telemetry Metric Stream Parser

The following module demonstrates multi-frame stream parsing with fragment preservation and payload unpinning in an industrial telemetry domain:

\`\`\`erlang
-module(telemetry_stream).
-export([parse_metric_item/1, parse_metric_stream/1]).

-record(metric_item, {
    channel_id   :: non_neg_integer(),
    status_flag  :: non_neg_integer(),
    data_len     :: non_neg_integer(),
    readings     :: binary()
}).

parse_metric_item(<<Chan:8, Stat:8, DLen:16/big, Readings:DLen/binary, Rest/binary>>) ->
    Item = #metric_item{
        channel_id = Chan,
        status_flag = Stat,
        data_len = DLen,
        readings = binary:copy(Readings)
    },
    {ok, Item, Rest};
parse_metric_item(_) ->
    {error, incomplete_metric}.

parse_metric_stream(Stream) ->
    metric_stream_loop(Stream, []).

metric_stream_loop(<<>>, Acc) ->
    {ok, lists:reverse(Acc)};
metric_stream_loop(Bytes, Acc) ->
    case parse_metric_item(Bytes) of
        {ok, Item, Rest} ->
            metric_stream_loop(Rest, [Item | Acc]);
        {error, incomplete_metric} ->
            {partial, lists:reverse(Acc), binary:copy(Bytes)}
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Record definition
-record(RecordName, {Field1, Field2, ...}).

%% Bit syntax segment matching
<<Val:Size/TypeSpecifiers, Rest/binary>>

%% Decoupling off-heap binaries
binary:copy(BinarySlice)
\`\`\`

## Assignment Specification

Implement the complete TLV protocol engine in \`src/packet_parser.erl\`.

### Record Schema: \`tlv_frame\`
Declare a module-level record named \`tlv_frame\` with four fields in exact order:
- \`version\`
- \`type\`
- \`length\`
- \`payload\`

### Functions to Implement

#### \`parse_frame/1\`
- **Input**:
  - \`Binary\`: a binary stream
- **Behavior**: Inspects \`Binary\` for a TLV frame containing a 4-bit unsigned version, 4-bit unsigned type, 16-bit big-endian unsigned length, followed by \`Length\` bytes of payload. If a complete frame is matched, returns \`{ok, Frame, Rest}\` where:
  - \`Frame\` is a \`#tlv_frame\` record containing the extracted fields with \`payload\` decoupled using \`binary:copy/1\`.
  - \`Rest\` is the remaining unparsed binary bytes.
  If the binary contains fewer than 3 bytes or the payload is incomplete, returns \`{error, incomplete_frame}\`.
- **Examples**:
  - \`parse_frame(<<1:4, 2:4, 4:16/big, "PING", "REST">>)\` $\\rightarrow$
    \`{ok, {tlv_frame, 1, 2, 4, <<"PING">>}, <<"REST">>}\`
  - \`parse_frame(<<1:4, 2:4>>)\` $\\rightarrow$ \`{error, incomplete_frame}\`

#### \`parse_tlv_stream/1\`
- **Input**:
  - \`StreamBinary\`: a binary stream containing zero or more concatenated TLV frames
- **Behavior**: Processes \`StreamBinary\` in a strictly tail-recursive loop by iteratively calling \`parse_frame/1\` and accumulating parsed frames.
  - When the stream is completely consumed without trailing fragments (\`<<>>\`), returns \`{ok, ParsedFrames}\` in their original arrival order.
  - When the stream ends with an incomplete frame fragment, returns \`{partial, ParsedFrames, TrailingBytes}\` where \`TrailingBytes\` are unpinned using \`binary:copy/1\`.
- **Examples**:
  - \`parse_tlv_stream(<<1:4, 2:4, 4:16/big, "PING", 1:4, 3:4, 4:16/big, "PONG">>)\` $\\rightarrow$
    \`{ok, [{tlv_frame, 1, 2, 4, <<"PING">>}, {tlv_frame, 1, 3, 4, <<"PONG">>}]}\`
  - \`parse_tlv_stream(<<1:4, 2:4, 4:16/big, "PING", 1:4, 3:4>>)\` $\\rightarrow$
    \`{partial, [{tlv_frame, 1, 2, 4, <<"PING">>}], <<19>>}\`

#### \`encode_frame/1\`
- **Input**:
  - \`Frame\`: a \`#tlv_frame\` record
- **Behavior**: Calculates the byte length of \`payload\` and serializes the record into its binary wire representation: 4-bit version, 4-bit type, 16-bit big-endian unsigned length, followed by the raw payload bytes.
- **Examples**:
  - \`encode_frame({tlv_frame, 1, 2, 4, <<"TEST">>})\` $\\rightarrow$ \`<<18, 0, 4, "TEST">>\`

## Rules & Verification Constraints

- Must define \`-record(tlv_frame, {version, type, length, payload}).\` at module scope.
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

%% @doc Parse a single TLV frame from binary input.
parse_frame(_Binary) ->
    {error, incomplete_frame}.

%% @doc Parse a stream of concatenated TLV frames in tail-recursive loop.
parse_tlv_stream(_StreamBinary) ->
    {ok, []}.

%% @doc Encode a tlv_frame record into its binary wire representation.
encode_frame(_Frame) ->
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

%% @doc Parse a single TLV frame from binary input.
parse_frame(_Binary) ->
    {error, incomplete_frame}.

%% @doc Parse a stream of concatenated TLV frames in tail-recursive loop.
parse_tlv_stream(_StreamBinary) ->
    {ok, []}.

%% @doc Encode a tlv_frame record into its binary wire representation.
encode_frame(_Frame) ->
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
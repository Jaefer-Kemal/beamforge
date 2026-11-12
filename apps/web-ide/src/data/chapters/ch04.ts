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

In distributed systems, REST APIs, and actor process state stores, data structures need to evolve cleanly as schemas grow. While tuples depend on fixed positional offsets and records require compile-time header macros, **Maps (\`#{}\`)** provide associative key-value collections indexed directly by key name.

Maps are the backbone of modern Erlang architectures: they represent decoded JSON payloads, database rows, telemetry tags, and actor state records across high-throughput OTP clusters.

## Deep Concept Breakdown & Under the Hood

### 1. Two Engine Architectures: FlatMap vs. HAMT

Under the hood, the BEAM Run-Time System (ERTS) switches dynamically between two internal representations based on map size:

1. **FlatMap (=< 32 keys):**
   - Stored as two contiguous tuples: a sorted tuple of keys (\`{K1, K2, ...}\`) paired with a tuple of values (\`{V1, V2, ...}\`).
   - Updates like \`Map#{Key := NewVal}\` share the exact existing keys tuple pointer with the prior version on the process heap—allocating only a new values array and minimizing GC pressure.
2. **HAMT Map (> 32 keys):**
   - Automatically promoted to a 32-way **Hash Array Mapped Trie**, providing $O(\log_{32} N)$ lookups and updates with structural path sharing across trie nodes.

### 2. The Two Map Arrows: Association (\`=>\`) vs. Exact Matching (\`:=\`)

Erlang separates inserting keys from asserting prior key existence:

#### Association (\`Key => Value\`)
- Used when building a new map literal or inserting/overwriting a key regardless of whether it existed before.
- **Strictly illegal in pattern matching!** Writing \`#{k => V} = Map\` fails to compile.

\`\`\`erlang
%% Construction of a fresh FlatMap:
Config0 = #{region => us_east, retries => 3, tls => true}.
\`\`\`

#### Exact Match / Update (\`Key := Value\`)
1. **In Pattern Matching:** Matches only when the named key already exists in the map and extracts or compares its value. Keys or matched values can even reference **previously bound variables**:
   \`\`\`erlang
   %% Succeeds only when the route's bound TargetPort matches the parameter TargetPort:
   rebind_port(#{port := TargetPort} = Endpoint, TargetPort, NewProto) ->
       Endpoint#{protocol := NewProto}.
   \`\`\`
2. **In Map Updates:** \`Map#{key := Val}\` asserts that \`key\` already exists before creating the updated map. If a key name is misspelled, ERTS raises an immediate \`{badkey, Key}\` runtime error rather than silently adding a stray bogus key.

> [!warning] Common Beginner Trap: The Map Arrow Inversion
> - **Pattern matching keys:** ALWAYS use \`:=\` (\`#{role := admin} = Map\`).
> - **Constructing new maps:** Use \`=>\` (\`#{node_id => n1, weight => 10}\`).
> - **Updating existing keys:** Prefer \`:=\` (\`Map#{health := degraded}\`) so typos fail fast instead of mutating schema shape silently.

### 3. Multi-Clause Matching on Map Shapes

Function heads can match multiple exact map keys simultaneously and fall through safely when given partial maps or non-map terms:

\`\`\`erlang
is_primary_coordinator(#{role := coordinator, health := healthy}) -> true;
is_primary_coordinator(_) -> false.
\`\`\`

## Parallel Worked Example

The module below manages cryptographic vault leases. Notice how \`open_lease/3\` initializes a fresh map with \`=>\`, while \`extend_or_seal/3\` uses multi-clause pattern matching with \`:=\`, bound-variable equality, and exact key updates:

\`\`\`erlang
-module(vault_lease).
-export([open_lease/3, extend_or_seal/3]).

%% ── Phase 1: Map Construction with => ─────────────────────────────────────
%% Creates a 4-field lease map initialized in unsealed state.
open_lease(ScopeTag, TenantKey, TtlSeconds) ->
    #{
        scope => ScopeTag,
        owner => TenantKey,
        ttl => TtlSeconds,
        sealed => false
    }.

%% ── Phase 2: Bound Exact Matching & Stateful Updating with := ─────────────
%% Only unsealed leases matching ExpectedScope can be extended or sealed.
extend_or_seal(#{scope := ExpectedScope, sealed := false, ttl := Ttl} = Lease, ExpectedScope, {extend, ExtraSec})
  when is_integer(ExtraSec), ExtraSec > 0 ->
    Lease#{ttl := Ttl + ExtraSec};
extend_or_seal(#{scope := ExpectedScope, sealed := false} = Lease, ExpectedScope, seal) ->
    Lease#{sealed := true};
extend_or_seal(_LeaseOrBadTerm, _ExpectedScope, _Action) ->
    {error, scope_locked}.
\`\`\`

How the BEAM executes these clauses:
- **Phase 1 (\`open_lease/3\`)**: Allocates a 4-key FlatMap sharing a static sorted key tuple across leases with identical field names.
- **Phase 2 (\`extend_or_seal/3\`)**: Matches \`scope\` against the bound argument \`ExpectedScope\` and asserts \`sealed := false\` directly in the VM head instruction before allocating an updated value tuple sharing the original keys tuple; mismatched scopes, already-sealed leases, or non-map terms fall safely to clause 3.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Map construction & key insertion (expressions)
#{Key => Value} -> map()
Map#{Key => Value} -> NewMap

%% Exact key pattern matching & exact key update (expressions)
#{Key := Pattern} = Map
Map#{Key := NewValue} -> NewMap
  Types:
    Key = term()
    Value = Pattern = NewValue = term()
    Map = NewMap = map()
\`\`\`

> How to read these expressions: A map literal matching \`Map\` on the left-hand side MUST use \`:=\` for every matched key (and non-matching clauses fall through cleanly without raising \`badmatch\` in multi-clause functions). On the right-hand side, \`=>\` inserts or overwrites whereas \`:=\` requires the key to already exist. Open the attached **Reference Card** for \`map_expressions\` documentation.

## Assignment Specification

Implement user session tracking functions in \`src/map_registry.erl\`:

### 1. \`create_session(UserId, Role)\`
- **Input**:
  - \`UserId\` — An atom or integer identifier for the user.
  - \`Role\` — An atom designating permissions (such as \`admin\`, \`member\`, or \`guest\`).
- **Behavior**: Construct and return a 4-key session map storing \`user_id\` set to \`UserId\`, \`role\` set to \`Role\`, initial \`presence\` set to \`offline\`, and initial \`login_count\` set to \`0\`.
- **Examples**:
  - \`map_registry:create_session(alice, admin)\` returns \`#{login_count => 0, presence => offline, role => admin, user_id => alice}\`.

### 2. \`update_presence(Session, ExpectedUserId, NewPresence)\`
- **Input**:
  - \`Session\` — An existing session map (or arbitrary term if invalid).
  - \`ExpectedUserId\` — The expected user identifier atom or integer.
  - \`NewPresence\` — The updated presence atom (such as \`online\`, \`busy\`, or \`away\`).
- **Behavior**: Verify identity via exact map pattern matching against the bound \`ExpectedUserId\`:
  - If \`Session\` is a map containing a \`user_id\` equal to \`ExpectedUserId\`, update \`presence\` to \`NewPresence\` and increment \`login_count\` by \`1\` using exact key update semantics.
  - Otherwise (wrong user, missing required keys, or non-map term), return \`{error, session_mismatch}\`.
- **Examples**:
  - Calling \`update_presence(S0, alice, online)\` on \`S0 = map_registry:create_session(alice, admin)\` returns \`#{login_count => 1, presence => online, role => admin, user_id => alice}\`.
  - Calling \`update_presence(S0, bob, online)\` on that same \`S0\` returns \`{error, session_mismatch}\`.

### 3. \`is_admin_session(Session)\`
- **Input**: \`Session\` — An arbitrary Erlang term or map.
- **Behavior**: Return \`true\` if and only if \`Session\` is a map whose \`role\` equals \`admin\` and \`presence\` equals \`online\`; return \`false\` for any other map (including offline/busy admins, incomplete maps lacking either key, non-admin roles) or any non-map term without crashing.
- **Examples**:
  - \`map_registry:is_admin_session(#{role => admin, presence => online})\` returns \`true\`.
  - \`map_registry:is_admin_session(#{role => admin, presence => offline})\` returns \`false\`.
  - \`map_registry:is_admin_session(#{role => member, presence => online})\` returns \`false\`.

## Rules & Verification Constraints

- \`bf_ast_verifier\` and per-function AST inspection enforce exact map matching/updating (\`:=\`) inside \`update_presence/3\` and \`is_admin_session/1\` (avoiding \`maps:get\`/\`maps:put\` workarounds).
- All IDs, roles, and presence values in test cases use atoms or integers.`,
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

%% @doc Construct a new session map initialized for UserId and Role with offline presence and zero logins.
create_session(_UserId, _Role) ->
    ok.

%% @doc Update Session presence and increment login count when user identity matches ExpectedUserId, otherwise returning a session mismatch error tuple.
update_presence(_Session, _ExpectedUserId, _NewPresence) ->
    ok.

%% @doc Return true when Session is a map representing an active online administrator, and false for any other map or non-map input.
is_admin_session(_Session) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/map_registry.erl': `-module(map_registry).
-export([create_session/2, update_presence/3, is_admin_session/1]).

%% @doc Construct a new session map initialized for UserId and Role with offline presence and zero logins.
create_session(UserId, Role) ->
    #{
        user_id => UserId,
        role => Role,
        presence => offline,
        login_count => 0
    }.

%% @doc Update Session presence and increment login count when user identity matches ExpectedUserId, otherwise returning a session mismatch error tuple.
update_presence(#{user_id := ExpectedUserId, login_count := Count} = Session, ExpectedUserId, NewPresence) ->
    Session#{
        presence := NewPresence,
        login_count := Count + 1
    };
update_presence(_Session, _ExpectedUserId, _NewPresence) ->
    {error, session_mismatch}.

%% @doc Return true when Session is a map representing an active online administrator, and false for any other map or non-map input.
is_admin_session(#{role := admin, presence := online}) ->
    true;
is_admin_session(_) ->
    false.`,
    },
    starterCode: `-module(map_registry).
-export([create_session/2, update_presence/3, is_admin_session/1]).

%% @doc Construct a new session map initialized for UserId and Role with offline presence and zero logins.
create_session(_UserId, _Role) ->
    ok.

%% @doc Update Session presence and increment login count when user identity matches ExpectedUserId, otherwise returning a session mismatch error tuple.
update_presence(_Session, _ExpectedUserId, _NewPresence) ->
    ok.

%% @doc Return true when Session is a map representing an active online administrator, and false for any other map or non-map input.
is_admin_session(_Session) ->
    ok.`,
    solutionCode: `-module(map_registry).
-export([create_session/2, update_presence/3, is_admin_session/1]).

%% @doc Construct a new session map initialized for UserId and Role with offline presence and zero logins.
create_session(UserId, Role) ->
    #{
        user_id => UserId,
        role => Role,
        presence => offline,
        login_count => 0
    }.

%% @doc Update Session presence and increment login count when user identity matches ExpectedUserId, otherwise returning a session mismatch error tuple.
update_presence(#{user_id := ExpectedUserId, login_count := Count} = Session, ExpectedUserId, NewPresence) ->
    Session#{
        presence := NewPresence,
        login_count := Count + 1
    };
update_presence(_Session, _ExpectedUserId, _NewPresence) ->
    {error, session_mismatch}.

%% @doc Return true when Session is a map representing an active online administrator, and false for any other map or non-map input.
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

While pattern matching (\`#{key := Val}\`) excels when keys are guaranteed to exist, production services constantly inspect optional settings, tally dynamic event counters, and redact internal metadata before exporting state across process boundaries.

Calling \`maps:get/2\` on an absent key raises a \`{badkey, Key}\` runtime error. The OTP \`maps\` module provides safe default lookups, single-pass key initializers/updaters, precedence-aware map merging, allow/deny key filtering, and direct heap traversal with zero intermediate lists.

## Deep Concept Breakdown & Under the Hood

### 1. Safe Lookups: \`maps:get/3\` vs. \`maps:find/2\`

- **\`maps:get(Key, Map, Default) -> Value | Default\`:** Returns the mapped value when \`Key\` exists, or \`Default\` without raising an error when absent.
- **\`maps:find(Key, Map) -> {ok, Value} | error\`:** Distinguishes between a missing key (\`error\`) and a key whose stored value literally happens to be \`undefined\` or \`false\` (\`{ok, false}\`).

### 2. Atomic Upsert Transformations: \`maps:update_with/4\`

Instead of branching manually on whether a key is present before computing its next value, **\`maps:update_with/4\`** runs a single-pass update-or-initialize operation:

\`\`\`erlang
maps:update_with(Key, fun(PrevVal) -> PrevVal + Delta end, InitialVal, Map)
\`\`\`

When \`Key\` already exists, ERTS invokes the transformation \`fun\` on the current value (without evaluating \`InitialVal\` conceptually for reuse). When \`Key\` is absent, \`InitialVal\` is stored directly and the \`fun\` is skipped.

### 3. Layering Maps & Stripping Keys: \`maps:merge/2\` & \`maps:without/2\`

When combining configuration or policy layers:
- **\`maps:merge(BaseMap, OverrideMap)\`**: Produces a map containing all keys from both inputs; whenever a key appears in both, **the value from the second map (\`OverrideMap\`) wins**.
- **\`maps:without(DenyKeys, Map)\`**: Returns a copy of \`Map\` omitting any keys listed in \`DenyKeys\`, ignoring keys from \`DenyKeys\` that were not present.

### 4. Zero-List Folding: \`maps:fold/3\`

Writing \`lists:foldl(Fun, Acc0, maps:to_list(Map))\` materializes a temporary list of \`{Key, Val}\` 2-tuples on the process heap solely to discard it right after. Calling **\`maps:fold(fun(Key, Val, AccIn) -> AccOut end, Acc0, Map)\`** traverses the underlying FlatMap arrays or HAMT trie nodes directly in $O(1)$ stack overhead with zero intermediate tuple-list allocation.

## Parallel Worked Example

The module below manages cloud quota policies and tier reconciliation using \`maps\` stdlib primitives without allocating throwaway key-value lists:

\`\`\`erlang
-module(quota_ledger).
-export([reserve_feature_quota/4, reconcile_and_audit/2]).

%% ── Phase 1: Fallback Defaults & Delta-Based Upsert ───────────────────────
%% Looks up baseline quota with maps:get/3, then increments or seeds via update_with/4.
reserve_feature_quota(PolicyMap, FeatureKey, FallbackCap, BoostDelta) ->
    Baseline = maps:get(FeatureKey, PolicyMap, FallbackCap),
    maps:update_with(
        FeatureKey,
        fun(CurrentCap) -> CurrentCap + BoostDelta end,
        Baseline + BoostDelta,
        PolicyMap
    ).

%% ── Phase 2: Precedence Merge, Key Redaction & Compound Fold ──────────────
%% Applies OverrideTiers over BaseTiers, strips internal keys, and audits positive capacity.
reconcile_and_audit(BaseTiers, OverrideTiers) ->
    Sanitized = maps:without(
        [staging_flag, internal_note],
        maps:merge(BaseTiers, OverrideTiers)
    ),
    maps:fold(
        fun(_Tier, Cap, {SumAcc, ActiveCount}) when is_integer(Cap), Cap > 0 ->
            {SumAcc + Cap, ActiveCount + 1};
           (_Tier, _InactiveCap, Acc) ->
            Acc
        end,
        {0, 0},
        Sanitized
    ).
\`\`\`

How the BEAM executes these primitives:
- **Phase 1 (\`reserve_feature_quota/4\`)**: Avoids exceptions when \`FeatureKey\` is missing via \`maps:get/3\`, then updates or inserts the quota ceiling in a single lookup step via \`maps:update_with/4\`.
- **Phase 2 (\`reconcile_and_audit/2\`)**: Overlays \`OverrideTiers\` over \`BaseTiers\` with \`maps:merge/2\`, drops audit-excluded keys with \`maps:without/2\`, and walks the sanitized map directly via \`maps:fold/3\` using a compound \`{SumAcc, ActiveCount}\` accumulator.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / maps)
maps:get(Key, Map, Default) -> Value | Default
maps:find(Key, Map) -> {ok, Value} | error
maps:update_with(Key, Fun, Init, Map1) -> Map2
maps:merge(Map1, Map2) -> Map3
maps:without(Ks, Map1) -> Map2
maps:fold(Fun, Init, Map) -> Acc
  Types:
    Key = term()
    Ks = [Key]
    Fun = fun((ValueIn) -> ValueOut) | fun((Key, Value, AccIn) -> AccOut)
    Init = Acc = Default = term()
    Map = Map1 = Map2 = Map3 = map()
\`\`\`

> How to read these specs: Notice that \`maps:merge/2\` resolves collisions strictly in favor of \`Map2\` (second argument), while \`maps:fold/3\` receives a **3-argument** fun taking \`(Key, Value, AccIn)\`. Open the attached **Reference Cards** for \`maps:get/3\`, \`maps:update_with/4\`, \`maps:merge/2\`, \`maps:without/2\`, and \`maps:fold/3\` documentation.

## Assignment Specification

Implement four map processing functions in \`src/map_stdlib.erl\`:

### 1. \`safe_get_load(NodeMetricsMap, NodeAtom)\`
- **Input**:
  - \`NodeMetricsMap\` — A map associating node atoms with integer load readings.
  - \`NodeAtom\` — The target node atom to query.
- **Behavior**: Look up \`NodeAtom\` using \`maps:get/3\`, returning its stored load when present or \`0\` safely when absent.
- **Examples**:
  - \`map_stdlib:safe_get_load(#{node_a => 42}, node_a)\` returns \`42\`.
  - \`map_stdlib:safe_get_load(#{node_a => 42}, node_b)\` returns \`0\`.

### 2. \`increment_tag_counts(TagList, InitialCountsMap)\`
- **Input**:
  - \`TagList\` — A list of zero or more tag atoms.
  - \`InitialCountsMap\` — A map holding baseline integer tag counts.
- **Behavior**: Tally every occurrence in \`TagList\` into \`InitialCountsMap\` using \`lists:foldl/3\` paired with \`maps:update_with/4\`, incrementing existing counts by \`1\` and initializing newly seen tags at \`1\`.
- **Examples**:
  - \`map_stdlib:increment_tag_counts([api, web, api, db, api], #{})\` returns \`#{api => 3, db => 1, web => 1}\`.
  - \`map_stdlib:increment_tag_counts([db], #{db => 4})\` returns \`#{db => 5}\`.

### 3. \`merge_configs(DefaultCfgMap, UserCfgMap)\`
- **Input**:
  - \`DefaultCfgMap\` — Baseline configuration map.
  - \`UserCfgMap\` — User override configuration map.
- **Behavior**: Overlay \`UserCfgMap\` on top of \`DefaultCfgMap\` via \`maps:merge/2\` so user overrides take precedence on duplicate keys, then remove both \`secret_key\` and \`debug_token\` from the merged map via \`maps:without/2\`.
- **Examples**:
  - \`map_stdlib:merge_configs(#{port => 8080, timeout => 5000}, #{port => 9000, secret_key => bad_secret, debug_token => 1234})\` returns \`#{port => 9000, timeout => 5000}\`.

### 4. \`sum_map_values(NumericMap)\`
- **Input**: \`NumericMap\` — A map whose stored values are numbers (or an empty map).
- **Behavior**: Sum all values across \`NumericMap\` in a single traversal using \`maps:fold/3\` without converting the map to an intermediate list, returning \`0\` for an empty map.
- **Examples**:
  - \`map_stdlib:sum_map_values(#{cpu => 25, mem => 45, io => 10})\` returns \`80\`.
  - \`map_stdlib:sum_map_values(#{})\` returns \`0\`.

## Rules & Verification Constraints

- \`bf_ast_verifier\` enforces calls to \`maps:get/3\`, \`maps:update_with/4\`, \`maps:merge/2\`, \`maps:without/2\`, and \`maps:fold/3\`.
- Converting maps with \`maps:to_list/1\` is strictly forbidden by AST audit.`,
    otpDocCards: [
      {
        functionName: 'maps:get/3',
        module: 'maps',
        signature: 'get(Key, Map, Default) -> Value | Default',
        typesSpec: ['Key = term()', 'Map = map()', 'Default = Value = term()'],
        description: 'Returns the value associated with Key in Map, or Default if Key is absent.',
        complexityNote: 'O(log N) lookup with zero badkey exception risk.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/maps.html#get/3',
      },
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
        functionName: 'maps:merge/2',
        module: 'maps',
        signature: 'merge(Map1, Map2) -> Map3',
        typesSpec: ['Map1 = Map2 = Map3 = map()'],
        description: 'Merges two maps with keys in Map2 overriding duplicate keys in Map1.',
        complexityNote: 'O(N + M) sorted/trie merge.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/maps.html#merge/2',
      },
      {
        functionName: 'maps:without/2',
        module: 'maps',
        signature: 'without(Ks, Map1) -> Map2',
        typesSpec: ['Ks = [term()]', 'Map1 = Map2 = map()'],
        description: 'Returns Map1 with every key present in list Ks removed.',
        complexityNote: 'O(|Ks| * log N) structural copy.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/maps.html#without/2',
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
      requiredCalls: ['maps:get/3', 'maps:update_with/4', 'maps:merge/2', 'maps:without/2', 'maps:fold/3'],
      forbiddenCalls: ['maps:to_list/1'],
    },
    solutionExplanation: 'Demonstrates maps:get/3 fallback defaults, atomic histogram counting via maps:update_with/4, config sanitization via maps:merge/2 and maps:without/2, and maps:fold/3 aggregation.',
    files: [
      {
        name: 'map_stdlib.erl',
        path: 'src/map_stdlib.erl',
        content: `-module(map_stdlib).
-export([safe_get_load/2, increment_tag_counts/2, merge_configs/2, sum_map_values/1]).

%% @doc Return the integer load recorded for NodeAtom in NodeMetricsMap, or zero when NodeAtom is absent.
safe_get_load(_NodeMetricsMap, _NodeAtom) ->
    ok.

%% @doc Fold across TagList and update InitialCountsMap so existing tags increment by one and unseen tags initialize to one.
increment_tag_counts(_TagList, _InitialCountsMap) ->
    ok.

%% @doc Merge UserCfgMap overrides over DefaultCfgMap and remove secret_key and debug_token entries from the resulting map.
merge_configs(_DefaultCfgMap, _UserCfgMap) ->
    ok.

%% @doc Sum all numeric values stored in NumericMap using direct map folding without intermediate list allocation, returning zero for an empty map.
sum_map_values(_NumericMap) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/map_stdlib.erl': `-module(map_stdlib).
-export([safe_get_load/2, increment_tag_counts/2, merge_configs/2, sum_map_values/1]).

%% @doc Return the integer load recorded for NodeAtom in NodeMetricsMap, or zero when NodeAtom is absent.
safe_get_load(NodeMetricsMap, NodeAtom) ->
    maps:get(NodeAtom, NodeMetricsMap, 0).

%% @doc Fold across TagList and update InitialCountsMap so existing tags increment by one and unseen tags initialize to one.
increment_tag_counts(TagList, InitialCountsMap) ->
    lists:foldl(fun(Tag, AccMap) ->
        maps:update_with(Tag, fun(Count) -> Count + 1 end, 1, AccMap)
    end, InitialCountsMap, TagList).

%% @doc Merge UserCfgMap overrides over DefaultCfgMap and remove secret_key and debug_token entries from the resulting map.
merge_configs(DefaultCfgMap, UserCfgMap) ->
    Merged = maps:merge(DefaultCfgMap, UserCfgMap),
    maps:without([secret_key, debug_token], Merged).

%% @doc Sum all numeric values stored in NumericMap using direct map folding without intermediate list allocation, returning zero for an empty map.
sum_map_values(NumericMap) ->
    maps:fold(fun(_Key, Val, Acc) ->
        Acc + Val
    end, 0, NumericMap).`,
    },
    starterCode: `-module(map_stdlib).
-export([safe_get_load/2, increment_tag_counts/2, merge_configs/2, sum_map_values/1]).

%% @doc Return the integer load recorded for NodeAtom in NodeMetricsMap, or zero when NodeAtom is absent.
safe_get_load(_NodeMetricsMap, _NodeAtom) ->
    ok.

%% @doc Fold across TagList and update InitialCountsMap so existing tags increment by one and unseen tags initialize to one.
increment_tag_counts(_TagList, _InitialCountsMap) ->
    ok.

%% @doc Merge UserCfgMap overrides over DefaultCfgMap and remove secret_key and debug_token entries from the resulting map.
merge_configs(_DefaultCfgMap, _UserCfgMap) ->
    ok.

%% @doc Sum all numeric values stored in NumericMap using direct map folding without intermediate list allocation, returning zero for an empty map.
sum_map_values(_NumericMap) ->
    ok.`,
    solutionCode: `-module(map_stdlib).
-export([safe_get_load/2, increment_tag_counts/2, merge_configs/2, sum_map_values/1]).

%% @doc Return the integer load recorded for NodeAtom in NodeMetricsMap, or zero when NodeAtom is absent.
safe_get_load(NodeMetricsMap, NodeAtom) ->
    maps:get(NodeAtom, NodeMetricsMap, 0).

%% @doc Fold across TagList and update InitialCountsMap so existing tags increment by one and unseen tags initialize to one.
increment_tag_counts(TagList, InitialCountsMap) ->
    lists:foldl(fun(Tag, AccMap) ->
        maps:update_with(Tag, fun(Count) -> Count + 1 end, 1, AccMap)
    end, InitialCountsMap, TagList).

%% @doc Merge UserCfgMap overrides over DefaultCfgMap and remove secret_key and debug_token entries from the resulting map.
merge_configs(DefaultCfgMap, UserCfgMap) ->
    Merged = maps:merge(DefaultCfgMap, UserCfgMap),
    maps:without([secret_key, debug_token], Merged).

%% @doc Sum all numeric values stored in NumericMap using direct map folding without intermediate list allocation, returning zero for an empty map.
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

In Erlang, records are not a separate runtime type—the compiler translates every record expression directly into a standard **tagged tuple** at compile time:
\`#sensor_reading{sensor_id = 101, timestamp = 160000, value = 42.5, status = ok}\` compiles into \`{sensor_reading, 101, 160000, 42.5, ok}\` in \`.beam\` bytecode.

In low-latency protocol parsers, packet framers, and trading order books, records eliminate hash/trie lookups while keeping field references immune to tuple-offset bugs when schemas evolve.

## Deep Concept Breakdown & Under the Hood

### 1. Record Declaration & Compile-Time Expansion

A record is declared at module scope with the \`-record\` attribute:

\`\`\`erlang
-record(sensor_reading, {
    sensor_id              :: non_neg_integer(),
    timestamp = 0          :: non_neg_integer(),
    value                  :: float() | integer(),
    status = ok            :: atom()
}).
\`\`\`

At compile time, the BEAM transforms record operations directly into tuple instructions:
- **Construction:** Unspecified fields receive their configured default (or the atom \`undefined\` when no default is given).
- **Field Extraction:** Reading \`Reading#sensor_reading.value\` compiles directly to an $O(1)$ \`element(4, Reading)\` tuple lookup.
- **Immutable Update:** \`Reading#sensor_reading{value = 99.1}\` compiles directly to \`setelement(4, Reading, 99.1)\`.

### 2. Compile-Time Field Offset: \`#RecordName.FieldName\`

Distinguish between prefixing with a variable vs. prefixing directly with \`#\`:
- \`Var#sensor_reading.value\` extracts the stored \`value\` field from \`Var\`.
- **\`#sensor_reading.value\`** (with no variable prefix) evaluates at **compile time** to the **1-based integer tuple position** of that field!

For \`-record(sensor_reading, {sensor_id, timestamp = 0, value, status = ok})\`:
- Element 1 is the record tag atom (\`sensor_reading\`).
- \`#sensor_reading.sensor_id\` evaluates to \`2\`, \`#sensor_reading.timestamp\` evaluates to \`3\`, \`#sensor_reading.value\` evaluates to \`4\`, and \`#sensor_reading.status\` evaluates to \`5\`.

### 3. Offset Safety with \`lists:keyfind/3\` & ETS

Passing hardcoded integer positions like \`lists:keyfind(Id, 2, Items)\` silently breaks if someone prepends a new field to the tuple later. Passing \`#sensor_reading.sensor_id\` instructs the compiler to emit the exact 1-based offset automatically across all call sites.

> [!warning] Common Beginner Trap: Dot Placement on Record Updates
> - **Field Extraction:** \`Var#rec.field\` (**dot** before field name).
> - **Field Update:** \`Var#rec{field = NewVal}\` (**NO dot** before \`{\`!). Writing \`Var#rec.{...}\` fails to compile.

## Parallel Worked Example

The module below manages cached proxy routes. Notice how \`register_default_edge/2\` uses default field fallbacks, while \`promote_matching_edge/3\` searches by \`#edge_entry.node_key\` (1-based tuple position \`3\`), extracts an existing field via dot syntax, and returns an updated record copy:

\`\`\`erlang
-module(route_cache).
-export([register_default_edge/2, promote_matching_edge/3]).

-record(edge_entry, {
    region = global :: atom(),
    node_key        :: atom() | integer(),
    weight = 10     :: non_neg_integer(),
    healthy = true  :: boolean()
}).

%% ── Phase 1: Instantiation Relying on Record Field Defaults ────────────────
%% Initializes an edge_entry with weight=10 and healthy=true defaults.
register_default_edge(Region, NodeKey) ->
    #edge_entry{region = Region, node_key = NodeKey}.

%% ── Phase 2: Compile-Time Offset Keyfind & Dot/Brace Field Update ──────────
%% Looks up TargetKey at compile-time offset #edge_entry.node_key (index 3),
%% reads weight via dot syntax, and returns an immutably updated record.
promote_matching_edge(Edges, TargetKey, BonusWeight) ->
    case lists:keyfind(TargetKey, #edge_entry.node_key, Edges) of
        #edge_entry{} = Found ->
            CurrentW = Found#edge_entry.weight,
            {updated, Found#edge_entry{weight = CurrentW + BonusWeight, region = primary}};
        false ->
            {error, missing_edge}
    end.
\`\`\`

How the BEAM executes this pipeline:
- **Phase 1 (\`register_default_edge/2\`)**: Expands at compile time to a 5-element tuple \`{edge_entry, Region, NodeKey, 10, true}\` with zero runtime map overhead.
- **Phase 2 (\`promote_matching_edge/3\`)**: Compiles \`#edge_entry.node_key\` directly to index \`3\` inside \`lists:keyfind/3\`, matches the record tag cleanly via \`#edge_entry{} = Found\`, reads \`weight\` via \`element/2\`, and allocates a single updated tuple via \`setelement\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Compile-time record declaration & operations
-record(RecordName, {Field1 = Default1, Field2}).
#RecordName{Field1 = Val1}         %% Construct record
Var#RecordName.Field1              %% Extract field (O(1) element/2)
Var#RecordName{Field1 = NewVal}    %% Immutable field update (setelement/3)
#RecordName.Field1                 %% Compile-time 1-based integer index

%% Integration with keyed C BIF lookup
lists:keyfind(Key, N, TupleList) -> Tuple | false
  Types:
    Key = term()
    N = pos_integer()              %% e.g. #RecordName.Field1
    TupleList = [tuple()]
\`\`\`

> How to read these forms: Every record compiles down to a tuple whose first element is \`RecordName\`, shifting user fields to 1-based indices starting at \`2\`. Open the attached **Reference Cards** for \`record_syntax\` and \`lists:keyfind/3\` documentation.

## Assignment Specification

Implement protocol framing records and lookup helpers in \`src/record_frames.erl\` using a module-level \`frame\` record whose three ordered fields are \`seq\` (default \`0\`), \`type\` (default \`data\`), and \`payload\` (no default):

### 1. \`new_frame(Seq, Type, Payload)\`
- **Input**:
  - \`Seq\` — Non-negative integer sequence number.
  - \`Type\` — Atom designating frame kind.
  - \`Payload\` — Arbitrary Erlang term payload.
- **Behavior**: Construct and return a \`frame\` record instance populated with \`Seq\`, \`Type\`, and \`Payload\`.
- **Examples**:
  - \`record_frames:new_frame(1, ack, ok)\` returns \`{frame, 1, ack, ok}\`.
  - \`record_frames:new_frame(3, data, ping)\` returns \`{frame, 3, data, ping}\`.

### 2. \`advance_seq(Frame)\`
- **Input**: \`Frame\` — A valid \`frame\` record tuple.
- **Behavior**: Read the current sequence number from \`Frame\` and return an immutably updated \`frame\` copy with \`seq\` incremented by \`1\`, preserving \`type\` and \`payload\`.
- **Examples**:
  - \`record_frames:advance_seq({frame, 1, ack, ok})\` returns \`{frame, 2, ack, ok}\`.
  - \`record_frames:advance_seq({frame, 10, data, ping})\` returns \`{frame, 11, data, ping}\`.

### 3. \`frame_seq_index()\`
- **Input**: None (\`()\`).
- **Behavior**: Return the compile-time 1-based tuple index position of the \`seq\` field inside the \`frame\` record using record-index syntax (not a literal integer).
- **Examples**:
  - \`record_frames:frame_seq_index()\` returns \`2\`.

### 4. \`find_frame_by_seq(FrameList, TargetSeq)\`
- **Input**:
  - \`FrameList\` — A list of zero or more \`frame\` records.
  - \`TargetSeq\` — Integer sequence number to locate.
- **Behavior**: Search \`FrameList\` with \`lists:keyfind/3\` parameterized by the compile-time \`seq\` field index (avoiding hardcoded offset literals). Return an \`ok\` pair carrying the first matching frame if found, or \`not_found\` if absent.
- **Examples**:
  - \`record_frames:find_frame_by_seq([{frame, 1, data, hello}, {frame, 2, ack, world}], 2)\` returns \`{ok, {frame, 2, ack, world}}\`.
  - \`record_frames:find_frame_by_seq([{frame, 1, data, hello}], 99)\` returns \`not_found\`.

## Rules & Verification Constraints

- Declare the module-level \`frame\` record with exact field ordering (\`seq = 0\`, \`type = data\`, \`payload\`).
- \`bf_ast_verifier\` and AST inspection enforce record usage (\`-record(frame, ...)\`, record syntax construction, \`#frame.seq\` offset extraction without hardcoded position numbers) and \`lists:keyfind/3\`.`,
    otpDocCards: [
      {
        functionName: 'record_syntax',
        module: 'erlang',
        signature: '#record_name{field = Val}',
        typesSpec: ['Compile-time tuple abstraction', 'Zero runtime key dictionary'],
        description: 'Tagged tuple wrapper providing named field access and compile-time #rec.field offsets at O(1) tuple speed.',
        complexityNote: 'Exact same speed and memory footprint as raw tagged tuples.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/records.html',
      },
      {
        functionName: 'lists:keyfind/3',
        module: 'lists',
        signature: 'keyfind(Key, N, TupleList) -> Tuple | false',
        typesSpec: ['Key = term()', 'N = pos_integer()', 'TupleList = [tuple()]'],
        description: 'Fast ERTS C BIF searching a list of records/tuples at 1-based element offset N.',
        complexityNote: 'O(N) native C scan; pairs with #rec.field offsets.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/lists.html#keyfind/3',
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

%% @doc Construct and return a frame record populated with Seq, Type, and Payload.
new_frame(_Seq, _Type, _Payload) ->
    ok.

%% @doc Return a copy of Frame with its sequence number incremented by one while keeping type and payload unchanged.
advance_seq(_Frame) ->
    ok.

%% @doc Return the compile-time 1-based tuple position index of the seq field inside the frame record.
frame_seq_index() ->
    ok.

%% @doc Search FrameList for the first frame matching TargetSeq by sequence field index, returning an ok pair if found or not_found otherwise.
find_frame_by_seq(_FrameList, _TargetSeq) ->
    ok.`,
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

%% @doc Construct and return a frame record populated with Seq, Type, and Payload.
new_frame(Seq, Type, Payload) ->
    #frame{seq = Seq, type = Type, payload = Payload}.

%% @doc Return a copy of Frame with its sequence number incremented by one while keeping type and payload unchanged.
advance_seq(#frame{seq = S} = Frame) ->
    Frame#frame{seq = S + 1}.

%% @doc Return the compile-time 1-based tuple position index of the seq field inside the frame record.
frame_seq_index() ->
    #frame.seq.

%% @doc Search FrameList for the first frame matching TargetSeq by sequence field index, returning an ok pair if found or not_found otherwise.
find_frame_by_seq(FrameList, TargetSeq) ->
    case lists:keyfind(TargetSeq, #frame.seq, FrameList) of
        #frame{} = Frame ->
            {ok, Frame};
        false ->
            not_found
    end.`,
    },
    starterCode: `-module(record_frames).
-export([new_frame/3, advance_seq/1, frame_seq_index/0, find_frame_by_seq/2]).

%% @doc Construct and return a frame record populated with Seq, Type, and Payload.
new_frame(_Seq, _Type, _Payload) ->
    ok.

%% @doc Return a copy of Frame with its sequence number incremented by one while keeping type and payload unchanged.
advance_seq(_Frame) ->
    ok.

%% @doc Return the compile-time 1-based tuple position index of the seq field inside the frame record.
frame_seq_index() ->
    ok.

%% @doc Search FrameList for the first frame matching TargetSeq by sequence field index, returning an ok pair if found or not_found otherwise.
find_frame_by_seq(_FrameList, _TargetSeq) ->
    ok.`,
    solutionCode: `-module(record_frames).
-export([new_frame/3, advance_seq/1, frame_seq_index/0, find_frame_by_seq/2]).

-record(frame, {
    seq = 0 :: non_neg_integer(),
    type = data :: atom(),
    payload :: term()
}).

%% @doc Construct and return a frame record populated with Seq, Type, and Payload.
new_frame(Seq, Type, Payload) ->
    #frame{seq = Seq, type = Type, payload = Payload}.

%% @doc Return a copy of Frame with its sequence number incremented by one while keeping type and payload unchanged.
advance_seq(#frame{seq = S} = Frame) ->
    Frame#frame{seq = S + 1}.

%% @doc Return the compile-time 1-based tuple position index of the seq field inside the frame record.
frame_seq_index() ->
    #frame.seq.

%% @doc Search FrameList for the first frame matching TargetSeq by sequence field index, returning an ok pair if found or not_found otherwise.
find_frame_by_seq(FrameList, TargetSeq) ->
    case lists:keyfind(TargetSeq, #frame.seq, FrameList) of
        #frame{} = Frame ->
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

In Chapter 1, you saw that string literals like \`"hello"\` are singly linked lists of Unicode integer codepoints (\`[104, 101, 108, 108, 111]\`). On a 64-bit BEAM VM, every cons cell consumes two machine words (16 bytes), meaning a 5-character string \`"hello"\` occupies **80 bytes of RAM**!

Across high-throughput network servers (HTTP/2, WebSocket, XMPP, and telemetry pipelines), encoding gigabytes of text as linked lists triggers massive heap bloat and GC pauses. Erlang solves this with **Binaries (\`<<"...">>\`)** and **IOLists (\`iolist()\`)**.

## Deep Concept Breakdown & Under the Hood

### 1. Binaries: 16x Memory Compaction

A binary stores contiguous raw bytes bounded by \`<<\` and \`>>\`:

\`\`\`erlang
TextBin = <<"hello">>.  %% 5 contiguous bytes: <<104, 101, 108, 108, 111>>
\`\`\`

On a 64-bit BEAM process heap:
- \`"hello"\` (Character List) = $5 \\times 16 = \\mathbf{80\\text{ bytes}}$.
- \`<<"hello">>\` (Binary) = $\\mathbf{5\\text{ bytes}}$ (a **16x** heap reduction).

Core BIFs for measuring and converting binaries:
- \`byte_size(Bin) -> non_neg_integer()\` — Returns exact byte length in $O(1)$.
- \`list_to_binary(IoList) -> binary()\` — Compacts a character list or IOList into a contiguous binary.
- \`integer_to_binary(Int) -> binary()\` — Formats an integer directly into ASCII decimal bytes (e.g. \`123\` $\\rightarrow$ \`<<"123">>\`).

### 2. Zero-Copy IOLists (\`iolist()\` / \`iodata()\`)

In many runtimes, assembling a framed message forces allocating a brand-new buffer and copying every segment into it before sending. On the BEAM, socket and file drivers (\`gen_tcp:send/2\`, \`file:write/2\`) accept an **IOList** directly—an arbitrarily nested list of binaries, byte integers (\`0..255\`), and strings:

\`\`\`erlang
CommandIoList = [
    <<"*3\\r\\n">>,
    <<"$3\\r\\nSET\\r\\n">>,
    <<"$4\\r\\nuser\\r\\n">>,
    <<"$">>, integer_to_binary(byte_size(PayloadBin)), <<"\\r\\n">>,
    PayloadBin, <<"\\r\\n">>
].
\`\`\`

#### Scatter-Gather Kernel Streaming (\`writev\`)
When streaming an IOList to a socket, ERTS walks the nested list pointers and maps each leaf buffer straight into OS \`iovec\` scatter-gather descriptors for the **\`writev()\` syscall**—emitting disjoint heap fragments onto the wire with **zero intermediate concatenation copies**.

When you need byte length ahead of transmission or must coalesce fragments into a single binary on demand:
- \`iolist_size(IoList) -> non_neg_integer()\` calculates total byte length via linear traversal **without** copying bytes into a new binary buffer.
- \`iolist_to_binary(IoList) -> binary()\` flattens an arbitrary nested IOList in a single C allocation pass.

## Parallel Worked Example

The module below formats structured syslog records as nested zero-copy IOLists and flattens packets only when they fit inside an explicit size ceiling:

\`\`\`erlang
-module(syslog_packet).
-export([encode_entry/3, materialize_within_limit/2]).

%% ── Phase 1: Nested IOList Construction with Zero Payload Copy ────────────
%% Converts FacilityStr once via list_to_binary/1 and formats SeverityInt
%% plus PayloadBin length with integer_to_binary/1 + byte_size/1.
encode_entry(FacilityStr, SeverityInt, PayloadBin) ->
    FacilityBin = list_to_binary(FacilityStr),
    PayloadLenBin = integer_to_binary(byte_size(PayloadBin)),
    [
        <<"<">>, integer_to_binary(SeverityInt), <<":">>,
        FacilityBin, <<":">>, PayloadLenBin, <<"> ">>,
        PayloadBin
    ].

%% ── Phase 2: Allocation-Free Sizing & Conditional Flattening ──────────────
%% Computes total byte length with iolist_size/1 before flattening, avoiding
%% heap copies when the packet exceeds MaxBytes.
materialize_within_limit(IoList, MaxBytes) ->
    TotalBytes = iolist_size(IoList),
    if
        TotalBytes =< MaxBytes -> {ok, iolist_to_binary(IoList)};
        true -> {too_large, TotalBytes}
    end.
\`\`\`

How the BEAM executes these primitives:
- **Phase 1 (\`encode_entry/3\`)**: References \`PayloadBin\` intact inside the returned list—whether \`PayloadBin\` is 10 bytes or 10 MB, no byte copy of the payload takes place.
- **Phase 2 (\`materialize_within_limit/2\`)**: Calls \`iolist_size/1\` to walk list nodes without allocating a contiguous buffer first, then calls \`iolist_to_binary/1\` only when the payload satisfies \`MaxBytes\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (erts / erlang BIFs)
list_to_binary(IoList) -> binary()
byte_size(Bitstring) -> non_neg_integer()
integer_to_binary(Integer) -> binary()
iolist_size(Item) -> non_neg_integer()
iolist_to_binary(IoListOrBinary) -> binary()
  Types:
    IoList = iodata() = [byte() | binary() | iolist()]
    Item = iolist() | bitstring()
    Integer = integer()
\`\`\`

> How to read these specs: Notice that \`byte_size/1\` executes in $O(1)$ on a binary or bitstring, whereas \`iolist_size/1\` accepts nested lists (\`iolist()\`) and sums leaf byte counts in $O(N)$ traversal without allocating memory. Open the attached **Reference Cards** for \`erlang:list_to_binary/1\`, \`erlang:byte_size/1\`, \`erlang:integer_to_binary/1\`, \`erlang:iolist_size/1\`, and \`erlang:iolist_to_binary/1\` documentation.

## Assignment Specification

Implement binary size accounting and zero-copy HTTP response IOList framing in \`src/iolist_builder.erl\`:

### 1. \`string_vs_binary_bytes(CharList)\`
- **Input**: \`CharList\` — A character list / Erlang string (zero or more characters).
- **Behavior**: Convert \`CharList\` into a compact binary and return a 4-element \`size_comparison\` tuple containing:
  1. The estimated 64-bit linked-list heap footprint (16 bytes per character element),
  2. The exact byte length of the converted binary, and
  3. The converted binary itself.
- **Examples**:
  - \`iolist_builder:string_vs_binary_bytes("hello")\` returns \`{size_comparison, 80, 5, <<"hello">>}\`.
  - \`iolist_builder:string_vs_binary_bytes("beamforge")\` returns \`{size_comparison, 144, 9, <<"beamforge">>}\`.

### 2. \`build_http_response_iolist(StatusCodeInt, BodyBin)\`
- **Input**:
  - \`StatusCodeInt\` — Integer HTTP status code (such as \`200\`).
  - \`BodyBin\` — Binary response body.
- **Behavior**: Assemble and return an **unflattened IOList** (must remain a list, not a concatenated binary) representing an HTTP/1.1 \`OK\` response containing the ASCII status code, \`Content-Length\` header equal to the exact byte size of \`BodyBin\`, CRLF header separator, and \`BodyBin\` itself without copying \`BodyBin\`.
- **Examples**:
  - \`iolist_builder:build_http_response_iolist(200, <<"{\\"status\\":\\"ok\\"}">>)\` returns \`[<<"HTTP/1.1 ">>, <<"200">>, <<" OK\\r\\nContent-Length: ">>, <<"15">>, <<"\\r\\n\\r\\n">>, <<"{\\"status\\":\\"ok\\"}">>]\`.

### 3. \`flatten_iolist(IoList)\`
- **Input**: \`IoList\` — A nested IOList of binary fragments (possibly empty).
- **Behavior**: Measure the total byte size of \`IoList\` and flatten it into one contiguous binary, returning a 2-tuple carrying total byte count followed by the flattened binary.
- **Examples**:
  - \`iolist_builder:flatten_iolist([<<"PING">>, [<<"-">>, <<"PONG">>]])\` returns \`{9, <<"PING-PONG">>}\`.
  - \`iolist_builder:flatten_iolist([])\` returns \`{0, <<>>}\`.

## Rules & Verification Constraints

- \`bf_ast_verifier\` enforces calls to \`list_to_binary/1\`, \`byte_size/1\`, \`integer_to_binary/1\`, \`iolist_size/1\`, and \`iolist_to_binary/1\`.
- \`build_http_response_iolist/2\` must return an IOList (\`is_list\`), not an eagerly flattened binary.`,
    otpDocCards: [
      {
        functionName: 'erlang:list_to_binary/1',
        module: 'erlang',
        signature: 'list_to_binary(IoList) -> binary()',
        typesSpec: ['IoList = iolist()'],
        description: 'Converts a character list or iolist of bytes into a compact contiguous binary.',
        complexityNote: 'O(N) byte copy in native C.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#list_to_binary/1',
      },
      {
        functionName: 'erlang:byte_size/1',
        module: 'erlang',
        signature: 'byte_size(Bitstring) -> non_neg_integer()',
        typesSpec: ['Bitstring = bitstring()'],
        description: 'Returns the exact number of whole bytes (rounded up if partial byte) in O(1) time.',
        complexityNote: 'O(1) constant-time header read.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#byte_size/1',
      },
      {
        functionName: 'erlang:integer_to_binary/1',
        module: 'erlang',
        signature: 'integer_to_binary(Integer) -> binary()',
        typesSpec: ['Integer = integer()'],
        description: 'Formats an integer as base-10 ASCII characters inside a binary.',
        complexityNote: 'Fast C BIF formatting without linked-list allocation.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#integer_to_binary/1',
      },
      {
        functionName: 'iolist_to_binary/1',
        module: 'erlang',
        signature: 'iolist_to_binary(IoListOrBinary) -> binary()',
        typesSpec: ['IoListOrBinary = iolist() | binary()', 'Returns binary()'],
        description: 'Flattens an iolist into a single binary using optimized C buffer copies.',
        complexityNote: 'O(N) single-pass allocation and copy.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#iolist_to_binary/1',
      },
      {
        functionName: 'iolist_size/1',
        module: 'erlang',
        signature: 'iolist_size(Item) -> non_neg_integer()',
        typesSpec: ['Item = iolist() | binary()', 'Returns non_neg_integer()'],
        description: 'Calculates total byte size of an iolist without allocating or flattening.',
        complexityNote: 'O(N) traversal with zero intermediate binary allocation.',
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
        erlangCall: 'iolist_builder:build_http_response_iolist(200, <<"{\\"status\\":\\"ok\\"}">>)',
        expectedOutput: '[<<"HTTP/1.1 ">>, <<"200">>, <<" OK\\r\\nContent-Length: ">>, <<"15">>, <<"\\r\\n\\r\\n">>, <<"{\\"status\\":\\"ok\\"}">>]',
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
      requiredCalls: [
        'erlang:list_to_binary/1',
        'erlang:byte_size/1',
        'erlang:integer_to_binary/1',
        'erlang:iolist_size/1',
        'erlang:iolist_to_binary/1',
      ],
    },
    solutionExplanation: 'Demonstrates 16x memory savings of binaries over character lists, nested zero-copy IOList construction for HTTP, and iolist_size/iolist_to_binary handling.',
    files: [
      {
        name: 'iolist_builder.erl',
        path: 'src/iolist_builder.erl',
        content: `-module(iolist_builder).
-export([string_vs_binary_bytes/1, build_http_response_iolist/2, flatten_iolist/1]).

%% @doc Convert CharList into a binary and return a size comparison tuple recording linked-list heap bytes, binary byte size, and the binary itself.
string_vs_binary_bytes(_CharList) ->
    ok.

%% @doc Build and return an unflattened HTTP response IOList embedding StatusCodeInt, computed content length, and BodyBin without copying the payload.
build_http_response_iolist(_StatusCodeInt, _BodyBin) ->
    ok.

%% @doc Measure total byte length across IoList without extra copying during sizing, flatten it into one contiguous binary, and return the size-and-binary pair.
flatten_iolist(_IoList) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/iolist_builder.erl': `-module(iolist_builder).
-export([string_vs_binary_bytes/1, build_http_response_iolist/2, flatten_iolist/1]).

%% @doc Convert CharList into a binary and return a size comparison tuple recording linked-list heap bytes, binary byte size, and the binary itself.
string_vs_binary_bytes(CharList) ->
    Bin = list_to_binary(CharList),
    {size_comparison, length(CharList) * 16, byte_size(Bin), Bin}.

%% @doc Build and return an unflattened HTTP response IOList embedding StatusCodeInt, computed content length, and BodyBin without copying the payload.
build_http_response_iolist(StatusCodeInt, BodyBin) ->
    LenBin = integer_to_binary(byte_size(BodyBin)),
    CodeBin = integer_to_binary(StatusCodeInt),
    [
        <<"HTTP/1.1 ">>, CodeBin, <<" OK\r\nContent-Length: ">>,
        LenBin, <<"\r\n\r\n">>, BodyBin
    ].

%% @doc Measure total byte length across IoList without extra copying during sizing, flatten it into one contiguous binary, and return the size-and-binary pair.
flatten_iolist(IoList) ->
    {iolist_size(IoList), iolist_to_binary(IoList)}.`,
    },
    starterCode: `-module(iolist_builder).
-export([string_vs_binary_bytes/1, build_http_response_iolist/2, flatten_iolist/1]).

%% @doc Convert CharList into a binary and return a size comparison tuple recording linked-list heap bytes, binary byte size, and the binary itself.
string_vs_binary_bytes(_CharList) ->
    ok.

%% @doc Build and return an unflattened HTTP response IOList embedding StatusCodeInt, computed content length, and BodyBin without copying the payload.
build_http_response_iolist(_StatusCodeInt, _BodyBin) ->
    ok.

%% @doc Measure total byte length across IoList without extra copying during sizing, flatten it into one contiguous binary, and return the size-and-binary pair.
flatten_iolist(_IoList) ->
    ok.`,
    solutionCode: `-module(iolist_builder).
-export([string_vs_binary_bytes/1, build_http_response_iolist/2, flatten_iolist/1]).

%% @doc Convert CharList into a binary and return a size comparison tuple recording linked-list heap bytes, binary byte size, and the binary itself.
string_vs_binary_bytes(CharList) ->
    Bin = list_to_binary(CharList),
    {size_comparison, length(CharList) * 16, byte_size(Bin), Bin}.

%% @doc Build and return an unflattened HTTP response IOList embedding StatusCodeInt, computed content length, and BodyBin without copying the payload.
build_http_response_iolist(StatusCodeInt, BodyBin) ->
    LenBin = integer_to_binary(byte_size(BodyBin)),
    CodeBin = integer_to_binary(StatusCodeInt),
    [
        <<"HTTP/1.1 ">>, CodeBin, <<" OK\r\nContent-Length: ">>,
        LenBin, <<"\r\n\r\n">>, BodyBin
    ].

%% @doc Measure total byte length across IoList without extra copying during sizing, flatten it into one contiguous binary, and return the size-and-binary pair.
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
Consider an IoT sensor header packing a 5-bit Sensor Class, a 3-bit Alert Priority, and a 16-bit Metric Reading:

\`\`\`erlang
%% Sensor Class: 6 (00110), Priority: 1 (001) => 00110001 = 0x31 (decimal 49)
%% Metric Reading: 512 => 0x0200 (decimal 2, 0)
TelemetryHeader = <<6:5, 1:3, 512:16/big>>.
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

## Parallel Worked Example: Cold-Chain Sensor Wire Codec

The following module packs and decodes industrial cold-chain telemetry frames using little-endian signed temperature deltas and dynamic-length site labels:

\`\`\`erlang
-module(sensor_frame).
-export([seal_reading/3, open_reading/1]).

%% Phase 1: Pack a 5-bit protocol marker (3), 3-bit flags, signed 16-bit little-endian delta,
%% and an 8-bit label length prefix before the raw binary site label.
seal_reading(SiteLabel, Flags, TempDelta) when is_binary(SiteLabel) ->
    LabelBytes = byte_size(SiteLabel),
    <<3:5, Flags:3, TempDelta:16/little-signed-integer, LabelBytes:8, SiteLabel/binary>>.

%% Phase 2: Destructure header bits, match dynamic LabelBytes binary slice, and capture Rest.
open_reading(<<3:5, Flags:3, TempDelta:16/little-signed-integer, LabelBytes:8, SiteLabel:LabelBytes/binary, Rest/binary>>) ->
    {ok, #{flags => Flags, temp_delta => TempDelta, site => SiteLabel}, Rest};
open_reading(_) ->
    {error, invalid_sensor_frame}.
\`\`\`

**What the BEAM is doing in each phase:**
- **Phase 1 (Bit Packing & Guarded Sizing):** The \`is_binary/1\` guard rejects non-binary site labels before computing \`byte_size(SiteLabel)\` in $O(1)$ time. At runtime, \`3:5\` and \`Flags:3\` pack into the first byte without bitwise shifting in Erlang code, while \`TempDelta:16/little-signed-integer\` writes two's-complement bytes low-byte-first.
- **Phase 2 (Single-Pass Pattern Slicing):** Incoming packets only match the first clause if the top 5 bits equal \`3\` and the remaining buffer holds at least \`LabelBytes\` bytes; \`Rest/binary\` becomes a zero-copy sub-binary view pointing directly into the caller's trailing buffer.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Bit Syntax Grammar (Erlang Reference Manual)
<<Segment1, Segment2, ...>>
Segment = Value[:Size][/TypeSpecifierList]
TypeSpecifiers = Type-Signedness-Endianness-Unit

%% Official OTP Signature (stdlib / erlang)
erlang:byte_size(Bitstring) -> integer() >= 0
  Types:
    Bitstring = bitstring()

erlang:is_binary(Term) -> boolean()
  Types:
    Term = term()
\`\`\`

In OTP type specs, \`bitstring()\` accepts both bitstrings and byte-aligned binaries in $O(1)$ time, while \`is_binary/1\` returns \`true\` only for byte-aligned binaries and is guard-safe. See the attached **OTP Docs** reference cards for bit syntax specifiers and binary BIF contracts.

## Assignment Specification

Implement binary wire packing and header unpacking in module \`bit_packer\` (\`src/bit_packer.erl\`), exporting \`pack_header/3\`, \`unpack_header/1\`, and \`encode_utf8_tagged/1\`.

### Functions to Implement

#### \`pack_header/3\`
- **Input**:
  - \`Version\`: non-negative 4-bit unsigned integer
  - \`Flags\`: non-negative 4-bit unsigned integer
  - \`Length\`: non-negative 16-bit unsigned integer
- **Behavior**: Packs the 4-bit version, 4-bit flags, and 16-bit big-endian unsigned length into a compact 3-byte binary header.
- **Examples**:
  - \`bit_packer:pack_header(4, 2, 1024)\` returns \`<<66, 4, 0>>\`.
  - \`bit_packer:pack_header(1, 15, 65535)\` returns \`<<31, 255, 255>>\`.

#### \`unpack_header/1\`
- **Input**:
  - \`Binary\`: a binary stream
- **Behavior**: Inspects \`Binary\` for a 3-byte big-endian header. If at least 3 bytes are available, extracts the 4-bit \`Version\`, 4-bit \`Flags\`, and 16-bit big-endian \`Length\`, and captures all remaining trailing bytes as \`Payload\`, returning \`{ok, Version, Flags, Length, Payload}\`. If fewer than 3 bytes are provided, returns \`{error, insufficient_bytes}\`.
- **Examples**:
  - \`bit_packer:unpack_header(<<66, 4, 0, "PAYLOAD">>)\` returns \`{ok, 4, 2, 1024, <<"PAYLOAD">>}\`.
  - \`bit_packer:unpack_header(<<66, 4>>)\` returns \`{error, insufficient_bytes}\`.

#### \`encode_utf8_tagged/1\`
- **Input**:
  - \`TextBinary\`: a binary text string
- **Behavior**: Rejects non-binary inputs via a guard clause, and otherwise constructs a length-prefixed tagged binary message by packing:
  1. An 8-bit unsigned version tag byte with decimal value 1 (hexadecimal 0x01),
  2. A 16-bit big-endian unsigned integer representing the byte length of \`TextBinary\`,
  3. The raw \`TextBinary\` payload bytes.
- **Examples**:
  - \`bit_packer:encode_utf8_tagged(<<"HELLO">>)\` returns \`<<1, 0, 5, "HELLO">>\`.
  - \`bit_packer:encode_utf8_tagged(<<"HELLO_OTP">>)\` returns \`<<1, 0, 9, "HELLO_OTP">>\`.

## Rules & Verification Constraints

- Must construct and destructure headers using Erlang bit syntax rather than manual bitwise shifts.
- All multi-byte numeric fields must use big-endian network byte ordering.
- Guard \`encode_utf8_tagged/1\` with \`is_binary/1\` so non-binary arguments fail with \`function_clause\`, and compute byte length using \`byte_size/1\`.`,
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
      {
        functionName: 'byte_size/1',
        module: 'erlang',
        signature: 'byte_size(Bitstring) -> integer() >= 0',
        typesSpec: ['Bitstring = bitstring()'],
        description: 'Returns the integer number of bytes that contain Bitstring.',
        complexityNote: 'O(1) constant-time header read.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#byte_size/1',
      },
      {
        functionName: 'is_binary/1',
        module: 'erlang',
        signature: 'is_binary(Term) -> boolean()',
        typesSpec: ['Term = term()'],
        description: 'Guard-safe BIF returning true if Term is a byte-aligned binary.',
        complexityNote: 'O(1) BEAM tag test permitted inside function guards.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#is_binary/1',
      },
    ],
    mentalModelCheck: {
      question: 'What is the binary representation of <<6:5, 1:3, 512:16/big>>?',
      options: [
        {
          id: 'A',
          label: '<<49, 2, 0>> (0x31 = 00110 001 = 49, and 512 in 16-bit big-endian is 0x0200 = 2, 0)',
          isCorrect: true,
          explanation: '6 (00110 in 5 bits) and 1 (001 in 3 bits) pack into the first byte (00110001 = 49); 512 in 16 bits big-endian is high byte 2 and low byte 0.',
        },
        {
          id: 'B',
          label: '<<6, 1, 5, 12>>',
          isCorrect: false,
          explanation: '6 and 1 occupy 5-bit and 3-bit segments that pack together into a single 8-bit byte.',
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
      requiredConstructs: ['bit_syntax', 'guards'],
      requiredCalls: ['erlang:byte_size/1', 'erlang:is_binary/1'],
    },
    solutionExplanation: 'Demonstrates <<V:4, F:4, L:16/big>> packing, pattern matching with trailing binary capture, and guarded length-prefixed encoding.',
    files: [
      {
        name: 'bit_packer.erl',
        path: 'src/bit_packer.erl',
        content: `-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

%% @doc Pack caller-supplied 4-bit Version, 4-bit Flags, and 16-bit big-endian Length into a compact 3-byte binary header.
pack_header(_Version, _Flags, _Length) ->
    ok.

%% @doc Decode a 3-byte big-endian header and remaining payload binary from Binary, or return an insufficient-bytes error tuple when shorter than 3 bytes.
unpack_header(_Binary) ->
    ok.

%% @doc Reject non-binary inputs via guard validation and return TextBinary prefixed with a 1-byte version tag of value 1 and a 16-bit big-endian byte length.
encode_utf8_tagged(_TextBinary) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/bit_packer.erl': `-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

%% @doc Pack caller-supplied 4-bit Version, 4-bit Flags, and 16-bit big-endian Length into a compact 3-byte binary header.
pack_header(Version, Flags, Length) ->
    <<Version:4, Flags:4, Length:16/big-unsigned-integer>>.

%% @doc Decode a 3-byte big-endian header and remaining payload binary from Binary, or return an insufficient-bytes error tuple when shorter than 3 bytes.
unpack_header(<<Version:4, Flags:4, Length:16/big-unsigned-integer, Payload/binary>>) ->
    {ok, Version, Flags, Length, Payload};
unpack_header(_) ->
    {error, insufficient_bytes}.

%% @doc Reject non-binary inputs via guard validation and return TextBinary prefixed with a 1-byte version tag of value 1 and a 16-bit big-endian byte length.
encode_utf8_tagged(TextBinary) when is_binary(TextBinary) ->
    Len = byte_size(TextBinary),
    <<16#01:8, Len:16/big-unsigned-integer, TextBinary/binary>>.`,
    },
    starterCode: `-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

%% @doc Pack caller-supplied 4-bit Version, 4-bit Flags, and 16-bit big-endian Length into a compact 3-byte binary header.
pack_header(_Version, _Flags, _Length) ->
    ok.

%% @doc Decode a 3-byte big-endian header and remaining payload binary from Binary, or return an insufficient-bytes error tuple when shorter than 3 bytes.
unpack_header(_Binary) ->
    ok.

%% @doc Reject non-binary inputs via guard validation and return TextBinary prefixed with a 1-byte version tag of value 1 and a 16-bit big-endian byte length.
encode_utf8_tagged(_TextBinary) ->
    ok.`,
    solutionCode: `-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

%% @doc Pack caller-supplied 4-bit Version, 4-bit Flags, and 16-bit big-endian Length into a compact 3-byte binary header.
pack_header(Version, Flags, Length) ->
    <<Version:4, Flags:4, Length:16/big-unsigned-integer>>.

%% @doc Decode a 3-byte big-endian header and remaining payload binary from Binary, or return an insufficient-bytes error tuple when shorter than 3 bytes.
unpack_header(<<Version:4, Flags:4, Length:16/big-unsigned-integer, Payload/binary>>) ->
    {ok, Version, Flags, Length, Payload};
unpack_header(_) ->
    {error, insufficient_bytes}.

%% @doc Reject non-binary inputs via guard validation and return TextBinary prefixed with a 1-byte version tag of value 1 and a 16-bit big-endian byte length.
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

## Parallel Worked Example: Telemetry ASCII Scrubber & Marker Chunking

The following module sanitizes incoming binary telemetry frames using filtered binary comprehensions, C-accelerated substring offset matching, and delimiter chunking:

\`\`\`erlang
-module(telemetry_scrubber).
-export([scrub_ascii_stream/1, locate_and_chunk/2]).

%% Phase 1: Stream 8-bit bytes out of RawBytes, keep uppercase ASCII letters, and lowercase them inline.
scrub_ascii_stream(RawBytes) ->
    << <<(Byte bor 16#20):8>> || <<Byte:8>> <= RawBytes, Byte >= $A, Byte =< $Z >>.

%% Phase 2: Probe for Delim byte offset with binary:match/2 before slicing chunks via binary:split/3.
locate_and_chunk(PacketBin, Delim) ->
    case binary:match(PacketBin, Delim) of
        nomatch ->
            {empty_batch, 0, []};
        {Offset, _Len} ->
            Chunks = binary:split(PacketBin, Delim, [global, trim_all]),
            {located_at, Offset, Chunks}
    end.
\`\`\`

**What the BEAM is doing in each phase:**
- **Phase 1 (Filtered Byte Streaming):** The \`<=\` generator steps byte-by-byte across \`RawBytes\` in compiled bytecode/CPU registers, evaluates the comma-separated guards (\`Byte >= $A, Byte =< $Z\`), and packs matching transformed bytes directly into a contiguous binary without allocating any linked-list cons cells.
- **Phase 2 (Zero-Copy C Scanning & Sub-Binary Slicing):** \`binary:match/2\` runs an optimized C scan returning \`{Offset, Len}\` without copying memory; when present, \`binary:split/3\` slices the buffer into sub-binary references while discarding blank segments via \`trim_all\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / binary & Bit String Comprehensions)
binary:split(Subject, Pattern) -> Parts
  Types:
    Subject = binary()
    Pattern = binary() | [binary()] | cp()
    Parts = [binary()]

binary:split(Subject, Pattern, Options) -> Parts
  Types:
    Options = [global | trim | trim_all | {scope, part()}]

binary:match(Subject, Pattern) -> Found | nomatch
  Types:
    Found = {Pos :: integer() >= 0, Length :: integer() >= 0}

<< <<Out:8>> || <<In:8>> <= InBinary, FilterPredicate >>
\`\`\`

In OTP docs, \`binary:split/2\` stops after the first delimiter match, whereas \`[global, trim_all]\` splits every occurrence across the entire buffer and omits zero-byte fragments (including leading, consecutive, and trailing blanks). See the attached **OTP Docs** reference cards for split, match, and binary comprehension behavior.

## Assignment Specification

Implement binary scanning and byte masking in module \`binary_scanner\` (\`src/binary_scanner.erl\`), exporting \`split_key_value/1\`, \`extract_lines/1\`, and \`xor_mask_payload/2\`.

### Functions to Implement

#### \`split_key_value/1\`
- **Input**:
  - \`HeaderBin\`: a binary HTTP header line (e.g. \`<<"Content-Type: application/json">>\`)
- **Behavior**: Splits \`HeaderBin\` on the **first** occurrence of the two-byte colon-space separator only (preserving any subsequent colons inside the value). Returns \`{ok, KeyBin, ValueBin}\` when found, or \`{error, malformed_header}\` if the separator is absent.
- **Examples**:
  - \`binary_scanner:split_key_value(<<"Content-Type: application/json">>)\` returns \`{ok, <<"Content-Type">>, <<"application/json">>}\`.
  - \`binary_scanner:split_key_value(<<"X-Meta: foo: bar">>)\` returns \`{ok, <<"X-Meta">>, <<"foo: bar">>}\`.
  - \`binary_scanner:split_key_value(<<"BadHeaderWithoutSeparator">>)\` returns \`{error, malformed_header}\`.

#### \`extract_lines/1\`
- **Input**:
  - \`MultiLineBin\`: a binary containing CRLF-delimited lines
- **Behavior**: Splits \`MultiLineBin\` across all CRLF line boundaries and discards any leading, consecutive, or trailing empty tokens, returning a list of all non-empty line binaries (or \`[]\` if no non-empty content exists).
- **Examples**:
  - \`binary_scanner:extract_lines(<<"line1\\r\\n\\r\\nline2\\r\\nline3\\r\\n">>)\` returns \`[<<"line1">>, <<"line2">>, <<"line3">>]\`.
  - \`binary_scanner:extract_lines(<<>>)\` returns \`[]\`.

#### \`xor_mask_payload/2\`
- **Input**:
  - \`PayloadBin\`: binary payload bytes
  - \`MaskByte\`: an 8-bit integer mask (\`0..255\`)
- **Behavior**: Streams each 8-bit byte of \`PayloadBin\` through a binary comprehension that bitwise-XORs it with \`MaskByte\`, returning the masked binary directly with zero intermediate list allocation.
- **Examples**:
  - \`binary_scanner:xor_mask_payload(<<16#AA, 16#55>>, 16#FF)\` returns \`<<85, 170>>\`.
  - \`binary_scanner:xor_mask_payload(<<"ABC">>, 16#20)\` returns \`<<"abc">>\`.

## Rules & Verification Constraints

- Must split lines and headers via \`binary:split/2\` and \`binary:split/3\`.
- Must mask payload bytes using a binary comprehension generator rather than building an intermediate list comprehension or converting binaries to lists.`,
    otpDocCards: [
      {
        functionName: 'binary:split/2',
        module: 'binary',
        signature: 'split(Subject, Pattern) -> [binary()]',
        typesSpec: ['Subject = binary()', 'Pattern = binary() | [binary()]'],
        description: 'Splits Subject at the first occurrence of Pattern.',
        complexityNote: 'Executes C-level Boyer-Moore search with zero-copy sub-binary slices.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#split/2',
      },
      {
        functionName: 'binary:split/3',
        module: 'binary',
        signature: 'split(Subject, Pattern, Options) -> [binary()]',
        typesSpec: ['Subject = binary()', 'Pattern = binary()', 'Options = [global | trim_all]'],
        description: 'Splits Subject on Pattern using Boyer-Moore C algorithm.',
        complexityNote: 'Sub-linear O(N / M) average search time in C.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/binary.html#split/3',
      },
      {
        functionName: 'binary_comprehension',
        module: 'erlang',
        signature: '<< <<Out:Size>> || <<In:Size>> <= Bin >>',
        typesSpec: ['Bin = binary()'],
        description: 'Streams bit segments directly from Bin into a newly constructed binary.',
        complexityNote: 'Compiles into an in-place register loop with zero cons-cell list overhead.',
        officialUrl: 'https://www.erlang.org/doc/system/expressions.html#bit-string-comprehensions',
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
      forbiddenConstructs: ['list_comprehension'],
    },
    solutionExplanation: 'Demonstrates C-speed binary:split/2 header parsing, multi-line global CRLF splitting with trim_all, and binary comprehension XOR byte transformation.',
    files: [
      {
        name: 'binary_scanner.erl',
        path: 'src/binary_scanner.erl',
        content: `-module(binary_scanner).
-export([split_key_value/1, extract_lines/1, xor_mask_payload/2]).

%% @doc Split HeaderBin on the first colon-space separator and return an ok tuple holding key and value binaries, or a malformed-header error tuple when the separator is missing.
split_key_value(_HeaderBin) ->
    ok.

%% @doc Split MultiLineBin on every CRLF sequence while discarding empty tokens and return the list of non-empty line binaries.
extract_lines(_MultiLineBin) ->
    ok.

%% @doc Transform each 8-bit byte of PayloadBin via bitwise XOR against caller-supplied MaskByte using a binary comprehension and return the masked binary.
xor_mask_payload(_PayloadBin, _MaskByte) ->
    ok.`,
      },
    ],
    solutionFiles: {
      'src/binary_scanner.erl': `-module(binary_scanner).
-export([split_key_value/1, extract_lines/1, xor_mask_payload/2]).

%% @doc Split HeaderBin on the first colon-space separator and return an ok tuple holding key and value binaries, or a malformed-header error tuple when the separator is missing.
split_key_value(HeaderBin) ->
    case binary:split(HeaderBin, <<": ">>) of
        [Key, Value] ->
            {ok, Key, Value};
        _ ->
            {error, malformed_header}
    end.

%% @doc Split MultiLineBin on every CRLF sequence while discarding empty tokens and return the list of non-empty line binaries.
extract_lines(MultiLineBin) ->
    binary:split(MultiLineBin, <<"\r\n">>, [global, trim_all]).

%% @doc Transform each 8-bit byte of PayloadBin via bitwise XOR against caller-supplied MaskByte using a binary comprehension and return the masked binary.
xor_mask_payload(PayloadBin, MaskByte) ->
    << <<(B bxor MaskByte):8>> || <<B:8>> <= PayloadBin >>.`,
    },
    starterCode: `-module(binary_scanner).
-export([split_key_value/1, extract_lines/1, xor_mask_payload/2]).

%% @doc Split HeaderBin on the first colon-space separator and return an ok tuple holding key and value binaries, or a malformed-header error tuple when the separator is missing.
split_key_value(_HeaderBin) ->
    ok.

%% @doc Split MultiLineBin on every CRLF sequence while discarding empty tokens and return the list of non-empty line binaries.
extract_lines(_MultiLineBin) ->
    ok.

%% @doc Transform each 8-bit byte of PayloadBin via bitwise XOR against caller-supplied MaskByte using a binary comprehension and return the masked binary.
xor_mask_payload(_PayloadBin, _MaskByte) ->
    ok.`,
    solutionCode: `-module(binary_scanner).
-export([split_key_value/1, extract_lines/1, xor_mask_payload/2]).

%% @doc Split HeaderBin on the first colon-space separator and return an ok tuple holding key and value binaries, or a malformed-header error tuple when the separator is missing.
split_key_value(HeaderBin) ->
    case binary:split(HeaderBin, <<": ">>) of
        [Key, Value] ->
            {ok, Key, Value};
        _ ->
            {error, malformed_header}
    end.

%% @doc Split MultiLineBin on every CRLF sequence while discarding empty tokens and return the list of non-empty line binaries.
extract_lines(MultiLineBin) ->
    binary:split(MultiLineBin, <<"\r\n">>, [global, trim_all]).

%% @doc Transform each 8-bit byte of PayloadBin via bitwise XOR against caller-supplied MaskByte using a binary comprehension and return the masked binary.
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
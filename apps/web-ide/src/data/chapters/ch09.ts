import { LessonContent } from '../../types/workspace';

export const CHAPTER_9_LESSONS: LessonContent[] = [
  // ── Lesson 9.1: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch09-l01',
    chapterNumber: 9,
    lessonNumber: 1,
    lessonType: 'concept_exercise',
    title: 'ETS Fundamentals: Table Types (set, ordered_set, bag), keypos & Atomic Counters',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In mainstream backend stacks (Node.js, Python, Go, Ruby), high-throughput caches and rate limiters usually require an external **Redis** or **Memcached** process over TCP. Every read pays socket serialization, connection-pool contention, and loopback or network latency.

In the BEAM VM, **ETS (Erlang Term Storage)** is compiled directly into ERTS in C as off-heap mutable tables:
1. **Sub-Microsecond In-Process Lookups**: Reads and writes copy terms straight between process heaps and ERTS C memory—no network stack, sockets, or JSON marshaling.
2. **Zero Garbage Collection Overhead**: ETS tables live completely outside individual Erlang process heaps, so millions of cached sessions never trigger GC scans on worker processes.
3. **Hardware Concurrency & Atomic Counters**: Enabling \`read_concurrency\` and \`write_concurrency\` distributes internal locks across scheduler cores, while \`ets:update_counter/4\` executes lock-free integer updates without serializing writers through a single \`gen_server\` mailbox.

> [!NOTE]
> **Lifetime Ownership Invariant:** Every ETS table is owned by the BEAM process that creates it. If that owner process terminates cleanly or crashes without an heir, ERTS immediately deletes the table and frees its off-heap memory.

## Deep Concept Breakdown & Under the Hood

### The 4 ETS Table Types

When allocating a table with \`ets:new/2\`, you pick one of four underlying data structures:
1. **\`set\` (Default)**: Unique keys stored in an $O(1)$ hash table. Inserting a tuple whose key matches an existing entry overwrites the previous tuple.
2. **\`ordered_set\`**: Unique keys stored in an $O(\\log N)$ AVL balanced binary tree ordered by BEAM term precedence (\`number < atom < reference < fun < port < pid < tuple < map < list < bitstring\`), supporting ordered traversal via \`ets:first/1\` and \`ets:next/2\`.
3. **\`bag\`**: Allows multiple tuples per key as long as the complete tuples differ.
4. **\`duplicate_bag\`**: Allows exact duplicate tuples under the same key.

### Key Position (\`keypos\`) & Named vs. Unnamed Tables

By default, ETS extracts the lookup key from element \`1\` of every tuple (\`{keypos, 1}\`). If you store tagged tuples such as \`{quota, TenantAtom, Units}\`, passing \`{keypos, 2}\` tells ETS to index element \`2\` (\`TenantAtom\`). Passing \`named_table\` binds the atom passed as argument 1 so any process with table permissions can reference the table by atom instead of threading a numeric \`tid()\` reference.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / ets)
ets:new(Name, Options) -> tid() | atom()
  Types:
    Name = atom()
    Options = [Type | Access | named_table | {keypos, Pos :: pos_integer()} |
               {read_concurrency, boolean()} | {write_concurrency, boolean()}]
    Type = set | ordered_set | bag | duplicate_bag
    Access = public | protected | private

ets:insert(Tab, ObjectOrObjects) -> true
  Types:
    Tab = tid() | atom()
    ObjectOrObjects = tuple() | [tuple()]

ets:lookup(Tab, Key) -> [Object :: tuple()]
  Types:
    Tab = tid() | atom()
    Key = term()

ets:update_counter(Tab, Key, UpdateOp, Default) -> Result :: integer()
  Types:
    Tab = tid() | atom()
    Key = term()
    UpdateOp = {Pos :: pos_integer(), Incr :: integer()}
    Default = tuple()
\`\`\`

Consult the attached reference cards below for table access modes (\`public\` lets any process read and write, whereas \`protected\` restricts writes to the owner) and atomicity guarantees.

## Parallel Worked Example: GPU Quota & Tier Ledger

Consider a separate domain: a multi-tenant GPU compute scheduler storing both atomic usage counters and tier capacity rules inside a single named off-heap table (\`gpu_quotas\`) indexed by tuple element \`2\`:

\`\`\`erlang
-module(gpu_quota_tab).
-export([boot/0, add_usage/2, set_tier_cap/3, fetch_tier_cap/1]).

%% @doc Create the named off-heap quota table if it is not yet initialized.
boot() ->
    case ets:info(gpu_quotas) of
        undefined ->
            ets:new(gpu_quotas, [
                set,
                public,
                named_table,
                {keypos, 2},
                {read_concurrency, true},
                {write_concurrency, true}
            ]),
            ok;
        _Info ->
            ok
    end.

%% @doc Atomically accumulate consumed GPU units at tuple element 3.
add_usage(TenantAtom, Delta) ->
    ets:update_counter(gpu_quotas, TenantAtom, {3, Delta}, {usage, TenantAtom, 0}).

%% @doc Store a tenant tier and maximum unit cap under a composite tag key.
set_tier_cap(TenantAtom, TierName, MaxUnits) ->
    ets:insert(gpu_quotas, {tier_cfg, {cfg, TenantAtom}, TierName, MaxUnits}),
    ok.

%% @doc Read the configured tier name and limit for a tenant from ETS.
fetch_tier_cap(TenantAtom) ->
    case ets:lookup(gpu_quotas, {cfg, TenantAtom}) of
        [{tier_cfg, {cfg, TenantAtom}, TierName, MaxUnits}] ->
            {ok, {TierName, MaxUnits}};
        [] ->
            {error, unconfigured}
    end.
\`\`\`

### What ERTS Does at Runtime

- **Idempotent Table Allocation (\`ets:info/1\`)**: \`boot/0\` inspects whether \`gpu_quotas\` already exists before calling \`ets:new/2\`, avoiding \`badarg\` crashes if multiple workers invoke setup safely.
- **Custom \`keypos\` & Atomic Position Updates**: Because \`{keypos, 2}\` selects element \`2\` as the lookup key inside \`{usage, TenantAtom, Units}\`, \`ets:update_counter/4\` targets element \`3\` (\`{3, Delta}\`), atomically inserting \`{usage, TenantAtom, 0}\` on a tenant's first call before adding \`Delta\`.
- **Key Namespacing Inside a Single Table**: \`set_tier_cap/3\` namespaces tier rules using composite tuple key \`{cfg, TenantAtom}\` so tier configurations never collide with bare \`TenantAtom\` usage keys in the same \`set\`.

## Assignment Specification

Implement module \`src/ets_telemetry.erl\` exporting \`init_table/0\`, \`record_endpoint_hit/2\`, \`get_endpoint_hits/1\`, \`put_user_profile/3\`, and \`get_user_profile/1\`, storing all records inside the named table \`telemetry_store\`.

### \`init_table/0\`
- **Input**: None.
- **Behavior**: Idempotently ensures the named table \`telemetry_store\` exists as a public \`set\` using default key position \`1\` with concurrent read and write optimizations enabled. Returns \`ok\` whether creating a fresh table or reusing an already active table.
- **Examples**:
  - \`ets_telemetry:init_table()\` returns \`ok\`.

### \`record_endpoint_hit/2\`
- **Input**: Binary endpoint identifier \`EndpointBin\`, integer increment \`Incr\`.
- **Behavior**: Atomically increments the counter in element \`2\` of the entry keyed by \`EndpointBin\` inside \`telemetry_store\`, initializing a missing entry with zero before applying \`Incr\`. Returns the updated integer hit total.
- **Examples**:
  - \`ets_telemetry:record_endpoint_hit(<<"/auth">>, 1)\` returns \`1\`.
  - Calling \`ets_telemetry:record_endpoint_hit(<<"/auth">>, 9)\` immediately after returns \`10\`.

### \`get_endpoint_hits/1\`
- **Input**: Binary endpoint identifier \`EndpointBin\`.
- **Behavior**: Looks up \`EndpointBin\` in \`telemetry_store\` and returns its integer hit count, or \`0\` if no counter has been recorded yet.
- **Examples**:
  - \`ets_telemetry:get_endpoint_hits(<<"/unknown">>)\` returns \`0\`.

### \`put_user_profile/3\`
- **Input**: User identifier \`UserId\`, display name \`Name\`, role term \`Role\`.
- **Behavior**: Stores a 3-element tuple in \`telemetry_store\` whose primary key at element \`1\` is a composite 2-tuple pairing atom \`user\` with \`UserId\`, overwriting any previous profile for that user and returning \`ok\`.
- **Examples**:
  - \`ets_telemetry:put_user_profile(101, <<"Alice">>, admin)\` returns \`ok\`.

### \`get_user_profile/1\`
- **Input**: User identifier \`UserId\`.
- **Behavior**: Looks up the composite \`user\`-tagged key in \`telemetry_store\`. If found, returns an \`ok\`-tagged map containing keys \`name\` and \`role\`; otherwise returns \`{error, not_found}\`.
- **Examples**:
  - \`ets_telemetry:get_user_profile(101)\` returns \`{ok, #{name => <<"Alice">>, role => admin}}\`.
  - \`ets_telemetry:get_user_profile(9999)\` returns \`{error, not_found}\`.

## Rules & Verification Constraints

- **Required ETS Primitives**: \`bf_ast_verifier\` enforces calls to \`ets:new/2\`, \`ets:update_counter/4\`, \`ets:insert/2\`, and \`ets:lookup/2\`.
- **Table Properties**: \`telemetry_store\` must be a named, \`public\` \`set\` (with \`read_concurrency\` and \`write_concurrency\` enabled).
- **Concurrency Safety**: Counter increments must execute atomically via ETS rather than read-modify-write sequences.
`,
    otpDocCards: [
      {
        functionName: 'new',
        module: 'ets',
        signature: 'ets:new(Name, Options) -> tid() | atom()',
        typesSpec: [
          'Name = atom()',
          'Options = [set | ordered_set | bag | duplicate_bag | public | protected | private | named_table | {keypos, integer()} | {read_concurrency, boolean()} | {write_concurrency, boolean()}]'
        ],
        description: 'Creates a new off-heap ETS table with the specified concurrency, type, and access properties.',
        complexityNote: 'O(1) table allocation in C runtime memory.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#new/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      },
      {
        functionName: 'update_counter',
        module: 'ets',
        signature: 'ets:update_counter(Tab, Key, {Pos, Incr}, Default) -> integer()',
        typesSpec: [
          'Tab = tab()',
          'Key = term()',
          'Pos = Incr = integer()',
          'Default = tuple()'
        ],
        description: 'Performs a hardware atomic update of an integer field in an ETS table without locking the entire table.',
        complexityNote: 'Lock-free hardware atomic operation.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#update_counter/4',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      },
      {
        functionName: 'insert',
        module: 'ets',
        signature: 'ets:insert(Tab, ObjectOrObjects) -> true',
        typesSpec: [
          'Tab = tab()',
          'ObjectOrObjects = tuple() | [tuple()]'
        ],
        description: 'Inserts one or more objects into table Tab. For set tables, existing entries with the same key are overwritten.',
        complexityNote: 'O(1) for set; O(log N) for ordered_set.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#insert/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      },
      {
        functionName: 'lookup',
        module: 'ets',
        signature: 'ets:lookup(Tab, Key) -> [tuple()]',
        typesSpec: [
          'Tab = tab()',
          'Key = term()'
        ],
        description: 'Returns a list of all objects with key Key in table Tab. For set tables, returns [] or a single element list.',
        complexityNote: 'O(1) hash lookup in off-heap C memory.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#lookup/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      }
    ],
    mentalModelCheck: {
      question: 'Why does storing 10,000,000 active user sessions in an ETS table not cause Garbage Collection pauses on worker processes?',
      options: [
        {
          id: 'A',
          label: 'ETS tables compress terms into gzip binaries on the worker heap before saving them.',
          isCorrect: false,
          explanation: 'ETS does not gzip terms; it stores native Erlang terms directly in off-heap C memory.'
        },
        {
          id: 'B',
          label: 'ETS memory is managed in off-heap C memory by the ERTS runtime, outside any process garbage collection heap.',
          isCorrect: true,
          explanation: 'ETS tables are allocated outside process heaps in ERTS off-heap C memory. Because individual worker heaps do not contain the ETS table data, the garbage collector never scans them during process execution.'
        },
        {
          id: 'C',
          label: 'Worker processes automatically spawn hidden threads that sweep ETS tables in the background.',
          isCorrect: false,
          explanation: 'Worker processes do not manage ETS memory; the ERTS C allocator manages table memory.'
        },
        {
          id: 'D',
          label: 'The BEAM VM disables garbage collection completely when a module calls ets:new/2.',
          isCorrect: false,
          explanation: 'Garbage collection continues running normally on process heaps for local variables.'
        }
      ]
    },
    starterCode: `-module(ets_telemetry).
-export([init_table/0, record_endpoint_hit/2, get_endpoint_hits/1, put_user_profile/3, get_user_profile/1]).

-define(TAB, telemetry_store).

%% @doc Create the named public ETS telemetry table idempotently if absent.
init_table() ->
    ok.

%% @doc Atomically add Incr to the hit count for EndpointBin and return the total.
record_endpoint_hit(_EndpointBin, _Incr) ->
    ok.

%% @doc Return the stored integer hit count for EndpointBin, or zero if absent.
get_endpoint_hits(_EndpointBin) ->
    ok.

%% @doc Store Name and Role in telemetry_store keyed by UserId.
put_user_profile(_UserId, _Name, _Role) ->
    ok.

%% @doc Look up the profile map for UserId, or return a not-found error value.
get_user_profile(_UserId) ->
    ok.
`,
    solutionCode: `-module(ets_telemetry).
-export([init_table/0, record_endpoint_hit/2, get_endpoint_hits/1, put_user_profile/3, get_user_profile/1]).

-define(TAB, telemetry_store).

%% @doc Create the named public ETS telemetry table idempotently if absent.
init_table() ->
    case ets:whereis(?TAB) of
        undefined ->
            ets:new(?TAB, [
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

%% @doc Atomically add Incr to the hit count for EndpointBin and return the total.
record_endpoint_hit(EndpointBin, Incr) ->
    ets:update_counter(?TAB, EndpointBin, {2, Incr}, {EndpointBin, 0}).

%% @doc Return the stored integer hit count for EndpointBin, or zero if absent.
get_endpoint_hits(EndpointBin) ->
    case ets:lookup(?TAB, EndpointBin) of
        [{EndpointBin, Hits}] -> Hits;
        [] -> 0
    end.

%% @doc Store Name and Role in telemetry_store keyed by UserId.
put_user_profile(UserId, Name, Role) ->
    ets:insert(?TAB, {{user, UserId}, Name, Role}),
    ok.

%% @doc Look up the profile map for UserId, or return a not-found error value.
get_user_profile(UserId) ->
    case ets:lookup(?TAB, {user, UserId}) of
        [{{user, UserId}, Name, Role}] ->
            {ok, #{name => Name, role => Role}};
        [] ->
            {error, not_found}
    end.
`,
    files: [
      {
        name: 'ets_telemetry.erl',
        path: 'src/ets_telemetry.erl',
        content: `-module(ets_telemetry).
-export([init_table/0, record_endpoint_hit/2, get_endpoint_hits/1, put_user_profile/3, get_user_profile/1]).

-define(TAB, telemetry_store).

%% @doc Create the named public ETS telemetry table idempotently if absent.
init_table() ->
    ok.

%% @doc Atomically add Incr to the hit count for EndpointBin and return the total.
record_endpoint_hit(_EndpointBin, _Incr) ->
    ok.

%% @doc Return the stored integer hit count for EndpointBin, or zero if absent.
get_endpoint_hits(_EndpointBin) ->
    ok.

%% @doc Store Name and Role in telemetry_store keyed by UserId.
put_user_profile(_UserId, _Name, _Role) ->
    ok.

%% @doc Look up the profile map for UserId, or return a not-found error value.
get_user_profile(_UserId) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/ets_telemetry.erl': `-module(ets_telemetry).
-export([init_table/0, record_endpoint_hit/2, get_endpoint_hits/1, put_user_profile/3, get_user_profile/1]).

-define(TAB, telemetry_store).

%% @doc Create the named public ETS telemetry table idempotently if absent.
init_table() ->
    case ets:whereis(?TAB) of
        undefined ->
            ets:new(?TAB, [
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

%% @doc Atomically add Incr to the hit count for EndpointBin and return the total.
record_endpoint_hit(EndpointBin, Incr) ->
    ets:update_counter(?TAB, EndpointBin, {2, Incr}, {EndpointBin, 0}).

%% @doc Return the stored integer hit count for EndpointBin, or zero if absent.
get_endpoint_hits(EndpointBin) ->
    case ets:lookup(?TAB, EndpointBin) of
        [{EndpointBin, Hits}] -> Hits;
        [] -> 0
    end.

%% @doc Store Name and Role in telemetry_store keyed by UserId.
put_user_profile(UserId, Name, Role) ->
    ets:insert(?TAB, {{user, UserId}, Name, Role}),
    ok.

%% @doc Look up the profile map for UserId, or return a not-found error value.
get_user_profile(UserId) ->
    case ets:lookup(?TAB, {user, UserId}) of
        [{{user, UserId}, Name, Role}] ->
            {ok, #{name => Name, role => Role}};
        [] ->
            {error, not_found}
    end.
`,
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Atomic Endpoint Counter Updates',
        erlangCall: 'begin catch ets:delete(telemetry_store), ok = ets_telemetry:init_table(), 1 = ets_telemetry:record_endpoint_hit(<<"/api/v1/checkout">>, 1), 5 = ets_telemetry:record_endpoint_hit(<<"/api/v1/checkout">>, 4), ets_telemetry:get_endpoint_hits(<<"/api/v1/checkout">>) end',
        expectedOutput: '5',
        explanation: 'Verifies table creation and atomic update_counter increments.'
      },
      {
        id: 'tc2',
        title: 'Store and Lookup User Profile',
        erlangCall: 'begin catch ets:delete(telemetry_store), ok = ets_telemetry:init_table(), ok = ets_telemetry:put_user_profile(101, <<"Alice">>, admin), {ok, P} = ets_telemetry:get_user_profile(101), {maps:get(name, P), maps:get(role, P)} end',
        expectedOutput: '{<<"Alice">>, admin}',
        explanation: 'Verifies structured key indexing and map decoding.'
      }
    ],
    astRules: {
      requiredCalls: ['ets:new/2', 'ets:update_counter/4', 'ets:insert/2', 'ets:lookup/2']
    },
    solutionExplanation: 'Configures a named ETS table with concurrent read/write flags and uses atomic update_counter and off-heap lookups.',
  },

  // ── Lesson 9.2: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch09-l02',
    chapterNumber: 9,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'ETS Pattern Matching, Match Specs (select, select_delete) & protected Reads',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In a high-throughput API gateway, tens of thousands of incoming requests per second need to validate bearer tokens and enforce roles concurrently. Routing every lookup through a single \`gen_server\` mailbox forces requests into a FIFO queue, causing severe tail-latency spikes under traffic bursts.

OTP systems eliminate that bottleneck with the **Protected ETS Architecture**:
1. One coordinator process owns a **\`protected\`** (or \`public\`) ETS table and serializes mutations safely.
2. Worker processes bypass the owner mailbox completely and query ETS directly from ERTS off-heap memory in parallel.
3. Filtering and TTL sweeps run directly in C via match specifications rather than copying whole tables onto worker heaps.

> [!NOTE]
> **ETS Access Protections:**
> - **\`public\`**: Any process on the node can read and write.
> - **\`protected\` (Default)**: Any process can read; only the owner process can write.
> - **\`private\`**: Only the owner process can read or write.

## Deep Concept Breakdown & Under the Hood

### Pattern Matching with \`ets:match_object/2\`

For structural matching without inequality comparisons, \`ets:match_object/2\` matches full tuples where any wildcard slot uses the atom \`'_'\`:

\`\`\`erlang
ets:match_object(Tab, {entry, '_', target_group, '_'})
\`\`\`

Every matched tuple is copied in full onto the caller's heap.

### Match Specifications (\`ets:select/2\` & \`ets:select_delete/2\`)

When you need numeric comparisons (\`<\`, \`>=\`), boolean combinations (\`andalso\`), or column projection so only specific fields cross from C memory into Erlang, use a **Match Specification**: a list of 3-element clauses \`[{MatchHead, GuardList, ReturnBody}]\`:

1. **\`MatchHead\`**: Tuple pattern binding positional placeholders \`'$1'\`, \`'$2'\`, ... or \`'_'\` to ignore slots.
2. **\`GuardList\`**: Prefix-notation boolean expressions such as \`[{'>=', '$2', Cutoff}]\` or \`[{'andalso', {'=:=', '$1', Tag}, {'<', '$2', Limit}}]\`.
3. **\`ReturnBody\`**: Projection expression for \`ets:select/2\` (e.g., \`['$1']\` to extract only the matched field) or \`[true]\` for \`ets:select_delete/2\` to instruct ERTS to unlink and free the tuple directly in C memory without allocating anything on the Erlang heap.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / ets)
ets:match_object(Tab, Pattern) -> [Object :: tuple()]
  Types:
    Tab = tid() | atom()
    Pattern = match_pattern()

ets:select(Tab, MatchSpec) -> [Match :: term()]
  Types:
    Tab = tid() | atom()
    MatchSpec = match_spec()

ets:select_delete(Tab, MatchSpec) -> NumDeleted :: non_neg_integer()
  Types:
    Tab = tid() | atom()
    MatchSpec = match_spec()
\`\`\`

Refer to the attached documentation cards below for exact complexity notes and standard library links.

## Parallel Worked Example: DNS Resolver Cache

Consider a separate domain: an internal DNS record cache \`dns_cache\` storing entries shaped \`{record, HostBin, RegionAtom, ExpiryEpoch}\`, protected so only its coordinator writes while callers run pattern queries and compound regional TTL sweeps:

\`\`\`erlang
-module(dns_cache_tab).
-export([init_cache/0, cache_host/3, hosts_in_region/1, active_hosts_after/1, purge_region_before/2]).

%% @doc Create the protected named DNS cache table indexed by host binary.
init_cache() ->
    case ets:info(dns_cache) of
        undefined ->
            ets:new(dns_cache, [set, protected, named_table, {keypos, 2}]),
            ok;
        _Info ->
            ok
    end.

%% @doc Insert or refresh a DNS host record keyed at tuple element 2.
cache_host(HostBin, RegionAtom, ExpiryEpoch) ->
    ets:insert(dns_cache, {record, HostBin, RegionAtom, ExpiryEpoch}),
    ok.

%% @doc Extract all host binaries assigned to RegionAtom using match_object/2.
hosts_in_region(RegionAtom) ->
    Matches = ets:match_object(dns_cache, {record, '_', RegionAtom, '_'}),
    [Host || {record, Host, _, _} <- Matches].

%% @doc Project only host binaries whose expiry timestamp is at least NowSec.
active_hosts_after(NowSec) ->
    MatchSpec = [
        {{record, '$1', '_', '$2'},
         [{'>=', '$2', NowSec}],
         ['$1']}
    ],
    ets:select(dns_cache, MatchSpec).

%% @doc Atomically purge stale entries for one specific region before CutoffSec.
purge_region_before(RegionAtom, CutoffSec) ->
    MatchSpec = [
        {{record, '_', '$1', '$2'},
         [{'andalso', {'=:=', '$1', RegionAtom}, {'<', '$2', CutoffSec}}],
         [true]}
    ],
    ets:select_delete(dns_cache, MatchSpec).
\`\`\`

### What ERTS Does at Runtime

- **Protected Single-Writer Ownership**: \`init_cache/0\` uses \`protected\` access mode paired with \`{keypos, 2}\` so \`HostBin\` acts as the primary key and external processes cannot corrupt cache rows.
- **Full-Tuple Matching vs. Zero-Copy Projection**: \`hosts_in_region/1\` fetches full tuples via \`ets:match_object/2\`, whereas \`active_hosts_after/1\` pushes the \`>=\` guard and \`'$1'\` projection into C memory via \`ets:select/2\` so expired rows and extra columns never touch the caller's heap.
- **Atomic Compound Eviction**: \`purge_region_before/2\` uses a compound \`andalso\` guard inside \`ets:select_delete/2\` and returns \`[true]\` to reclaim matching records in a single off-heap pass, returning the integer count deleted.

## Assignment Specification

Implement module \`src/ets_query_engine.erl\` exporting \`init_auth_table/0\`, \`store_token/4\`, \`find_users_by_role/1\`, and \`delete_expired_tokens/1\`, backed by the named table \`auth_token_table\`.

### \`init_auth_table/0\`
- **Input**: None.
- **Behavior**: Idempotently initializes the named ETS table \`auth_token_table\` as a public \`set\` indexed on element \`2\` of each stored tuple. Returns \`ok\` whether newly allocated or already present.
- **Examples**:
  - \`ets_query_engine:init_auth_table()\` returns \`ok\`.

### \`store_token/4\`
- **Input**: Binary token \`TokenBin\`, integer \`UserId\`, atom \`Role\`, integer timestamp \`ExpiresAt\`.
- **Behavior**: Inserts a 5-element tuple tagged \`token\` at position \`1\`, followed by \`TokenBin\`, \`UserId\`, \`Role\`, and \`ExpiresAt\` into \`auth_token_table\`, overwriting any existing entry for \`TokenBin\` and returning \`ok\`.
- **Examples**:
  - \`ets_query_engine:store_token(<<"tok_1">>, 101, admin, 9999)\` returns \`ok\`.

### \`find_users_by_role/1\`
- **Input**: Atom \`Role\`.
- **Behavior**: Queries \`auth_token_table\` for all stored token records whose role equals \`Role\`, extracts each record's \`UserId\`, and returns a sorted list of unique user IDs via \`lists:usort/1\`.
- **Examples**:
  - After storing \`admin\` tokens for users \`10\`, \`30\`, and \`10\`, \`ets_query_engine:find_users_by_role(admin)\` returns \`[10, 30]\`.
  - Querying a role with no matching tokens returns \`[]\`.

### \`delete_expired_tokens/1\`
- **Input**: Integer \`CurrentTimestamp\`.
- **Behavior**: Uses \`ets:select_delete/2\` to atomically delete all token entries in \`auth_token_table\` whose \`ExpiresAt\` timestamp is strictly less than \`CurrentTimestamp\`, preserving tokens equal to or greater than \`CurrentTimestamp\`. Returns the integer count of deleted records.
- **Examples**:
  - With token expiries \`100\`, \`200\`, and \`500\`, \`ets_query_engine:delete_expired_tokens(300)\` returns \`2\` and leaves only the \`500\` token in \`auth_token_table\`.

## Rules & Verification Constraints

- **Required Calls**: \`bf_ast_verifier\` enforces \`ets:new/2\`, \`ets:select_delete/2\`, and \`lists:usort/1\`.
- **Key Indexing**: \`auth_token_table\` must configure element \`2\` (\`keypos\`) so \`TokenBin\` is the lookup key.
- **C-Level Eviction**: Expired token cleanup must execute inside ERTS via \`ets:select_delete/2\` rather than manual \`tab2list\` loops.
`,
    otpDocCards: [
      {
        functionName: 'select_delete',
        module: 'ets',
        signature: 'ets:select_delete(Tab, MatchSpec) -> NumDeleted',
        typesSpec: [
          'Tab = tab()',
          'MatchSpec = match_spec()',
          'NumDeleted = integer()'
        ],
        description: 'Atomically deletes all records matching the match specification from table Tab inside ERTS C memory.',
        complexityNote: 'O(N) table scan executing entirely in off-heap C memory.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#select_delete/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      },
      {
        functionName: 'select',
        module: 'ets',
        signature: 'ets:select(Tab, MatchSpec) -> [Match]',
        typesSpec: [
          'Tab = tab()',
          'MatchSpec = match_spec()',
          'Match = term()'
        ],
        description: 'Searches the table Tab using a match specification, returning only matching rows transformed to the result format.',
        complexityNote: 'O(N) scan without copying non-matching terms to process heap.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#select/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      },
      {
        functionName: 'match_object',
        module: 'ets',
        signature: 'ets:match_object(Tab, Pattern) -> [tuple()]',
        typesSpec: [
          'Tab = tab()',
          'Pattern = tuple()'
        ],
        description: 'Returns all objects in table Tab that match the specified tuple pattern containing _ wildcards.',
        complexityNote: 'O(N) scan for set; O(log N) if key is fixed.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#match_object/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      }
    ],
    mentalModelCheck: {
      question: 'Why is using ets:select_delete/2 superior to fetching records with ets:tab2list/1, filtering in Erlang, and calling ets:delete/2 in a loop?',
      options: [
        {
          id: 'A',
          label: 'tab2list/1 encrypts the data before returning it to the Erlang process.',
          isCorrect: false,
          explanation: 'tab2list/1 returns unencrypted raw terms.'
        },
        {
          id: 'B',
          label: 'ets:select_delete/2 evaluates filters and frees rows directly in the C runtime without copying millions of terms to the process heap.',
          isCorrect: true,
          explanation: 'tab2list/1 copies every single tuple out of off-heap C memory and onto the calling process heap, generating massive garbage collection pressure. ets:select_delete/2 filters and deletes rows directly in C memory.'
        },
        {
          id: 'C',
          label: 'ets:delete/2 does not work on named tables.',
          isCorrect: false,
          explanation: 'ets:delete/2 works fine on named tables.'
        },
        {
          id: 'D',
          label: 'tab2list/1 automatically deletes the ETS table after being called.',
          isCorrect: false,
          explanation: 'tab2list/1 is a read-only operation.'
        }
      ]
    },
    starterCode: `-module(ets_query_engine).
-export([init_auth_table/0, store_token/4, find_users_by_role/1, delete_expired_tokens/1]).

-define(TAB, auth_token_table).

%% @doc Create the named public ETS auth token table keyed on element 2 idempotently.
init_auth_table() ->
    ok.

%% @doc Insert or overwrite a token entry keyed by TokenBin in auth_token_table.
store_token(_TokenBin, _UserId, _Role, _ExpiresAt) ->
    ok.

%% @doc Return a sorted list of unique user IDs whose stored tokens match Role.
find_users_by_role(_Role) ->
    ok.

%% @doc Atomically purge all tokens expired strictly before CurrentTimestamp and return the count.
delete_expired_tokens(_CurrentTimestamp) ->
    ok.
`,
    solutionCode: `-module(ets_query_engine).
-export([init_auth_table/0, store_token/4, find_users_by_role/1, delete_expired_tokens/1]).

-define(TAB, auth_token_table).

%% @doc Create the named public ETS auth token table keyed on element 2 idempotently.
init_auth_table() ->
    case ets:whereis(?TAB) of
        undefined ->
            ets:new(?TAB, [
                set,
                public,
                named_table,
                {keypos, 2}
            ]),
            ok;
        _ ->
            ok
    end.

%% @doc Insert or overwrite a token entry keyed by TokenBin in auth_token_table.
store_token(TokenBin, UserId, Role, ExpiresAt) ->
    ets:insert(?TAB, {token, TokenBin, UserId, Role, ExpiresAt}),
    ok.

%% @doc Return a sorted list of unique user IDs whose stored tokens match Role.
find_users_by_role(Role) ->
    MatchSpec = [
        {{token, '_', '$1', Role, '_'}, [], ['$1']}
    ],
    lists:usort(ets:select(?TAB, MatchSpec)).

%% @doc Atomically purge all tokens expired strictly before CurrentTimestamp and return the count.
delete_expired_tokens(CurrentTimestamp) ->
    MatchSpec = [
        {{token, '_', '_', '_', '$1'},
         [{'<', '$1', CurrentTimestamp}],
         [true]}
    ],
    ets:select_delete(?TAB, MatchSpec).
`,
    files: [
      {
        name: 'ets_query_engine.erl',
        path: 'src/ets_query_engine.erl',
        content: `-module(ets_query_engine).
-export([init_auth_table/0, store_token/4, find_users_by_role/1, delete_expired_tokens/1]).

-define(TAB, auth_token_table).

%% @doc Create the named public ETS auth token table keyed on element 2 idempotently.
init_auth_table() ->
    ok.

%% @doc Insert or overwrite a token entry keyed by TokenBin in auth_token_table.
store_token(_TokenBin, _UserId, _Role, _ExpiresAt) ->
    ok.

%% @doc Return a sorted list of unique user IDs whose stored tokens match Role.
find_users_by_role(_Role) ->
    ok.

%% @doc Atomically purge all tokens expired strictly before CurrentTimestamp and return the count.
delete_expired_tokens(_CurrentTimestamp) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/ets_query_engine.erl': `-module(ets_query_engine).
-export([init_auth_table/0, store_token/4, find_users_by_role/1, delete_expired_tokens/1]).

-define(TAB, auth_token_table).

%% @doc Create the named public ETS auth token table keyed on element 2 idempotently.
init_auth_table() ->
    case ets:whereis(?TAB) of
        undefined ->
            ets:new(?TAB, [
                set,
                public,
                named_table,
                {keypos, 2}
            ]),
            ok;
        _ ->
            ok
    end.

%% @doc Insert or overwrite a token entry keyed by TokenBin in auth_token_table.
store_token(TokenBin, UserId, Role, ExpiresAt) ->
    ets:insert(?TAB, {token, TokenBin, UserId, Role, ExpiresAt}),
    ok.

%% @doc Return a sorted list of unique user IDs whose stored tokens match Role.
find_users_by_role(Role) ->
    MatchSpec = [
        {{token, '_', '$1', Role, '_'}, [], ['$1']}
    ],
    lists:usort(ets:select(?TAB, MatchSpec)).

%% @doc Atomically purge all tokens expired strictly before CurrentTimestamp and return the count.
delete_expired_tokens(CurrentTimestamp) ->
    MatchSpec = [
        {{token, '_', '_', '_', '$1'},
         [{'<', '$1', CurrentTimestamp}],
         [true]}
    ],
    ets:select_delete(?TAB, MatchSpec).
`,
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Query Users by Role',
        erlangCall: 'begin catch ets:delete(auth_token_table), ok = ets_query_engine:init_auth_table(), ok = ets_query_engine:store_token(<<"tok_1">>, 101, admin, 9999), ok = ets_query_engine:store_token(<<"tok_2">>, 102, member, 9999), ok = ets_query_engine:store_token(<<"tok_3">>, 101, admin, 9999), ets_query_engine:find_users_by_role(admin) end',
        expectedOutput: '[101]',
        explanation: 'Finds user IDs matching admin role and deduplicates results.'
      },
      {
        id: 'tc2',
        title: 'Delete Expired Tokens',
        erlangCall: 'begin catch ets:delete(auth_token_table), ok = ets_query_engine:init_auth_table(), ok = ets_query_engine:store_token(<<"exp_1">>, 201, guest, 100), ok = ets_query_engine:store_token(<<"exp_2">>, 202, guest, 200), ok = ets_query_engine:store_token(<<"valid">>, 203, guest, 500), DelCount = ets_query_engine:delete_expired_tokens(300), ValidFound = (ets:lookup(auth_token_table, <<"valid">>) =/= []), {DelCount, ValidFound} end',
        expectedOutput: '{2, true}',
        explanation: 'Deletes expired tokens while preserving unexpired tokens.'
      }
    ],
    astRules: {
      requiredCalls: ['ets:new/2', 'ets:select_delete/2', 'lists:usort/1']
    },
    solutionExplanation: 'Uses {keypos, 2} to index records by token and compiles match specifications for select and atomic select_delete.',
  },

  // ── Lesson 9.3: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch09-l03',
    chapterNumber: 9,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Surviving Worker Crashes: The ETS Heir Handshake & ets:give_away/3',
    difficulty: 'Advanced',
    xpReward: 100,
    visualScene: 'supervision_rest_for_one_ets_heir',
    conceptMarkdown: `## Why This Matters in Production

Here is the single most dangerous architectural trap in Erlang caching: **an ETS table is bound to the lifetime of the process that created it**.

If worker process \`A\` creates an in-memory cache via \`ets:new/2\` and crashes ten minutes later due to an unhandled exception, ERTS **immediately destroys the entire ETS table** and frees its off-heap memory. When the supervisor spawns replacement worker \`A'\`, it boots into an empty cache, triggering a thundering-herd **cache stampede** against your backend database.

OTP solves this cleanly with the **ETS Heir Handshake**: designating a stable backup process at creation time (or via \`ets:setopts/2\`) to catch ownership on crashes and handing ownership back to the restarted worker via \`ets:give_away/3\`. Trace the 4-step handover flow in the interactive scene below.

## Deep Concept Breakdown & Under the Hood

### 1. Registering an Heir on Creation or Dynamically

You bind an heir either directly inside the options list of \`ets:new/2\`:

\`\`\`erlang
ets:new(my_cache, [set, public, named_table, {heir, BackupPid, keep_alive}])
\`\`\`

or later on an active table using \`ets:setopts(Tab, {heir, BackupPid, HeirData})\`. If the designated heir terminates before the table owner, ERTS resets the table's heir setting to \`none\`.

### 2. Zero-Copy Failover (\`'ETS-TRANSFER'\`)

When the owning process dies for any reason, ERTS intercepts table teardown, atomically flips the C-level table owner pointer to \`BackupPid\`, keeps all rows untouched in off-heap memory, and delivers an asynchronous message to \`BackupPid\`'s mailbox:

\`\`\`erlang
{'ETS-TRANSFER', TableRef, DeadOwnerPid, HeirData}
\`\`\`

### 3. Restituting Ownership (\`ets:give_away/3\`)

Once the supervisor restarts the cache worker, the worker notifies the guardian/heir, which calls \`ets:give_away(Tab, NewWorkerPid, GiftData)\`. That operation swaps ownership in $O(1)$ time with zero data copying and delivers \`{'ETS-TRANSFER', Tab, BackupPid, GiftData}\` to \`NewWorkerPid\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official ETS Ownership & Heir Calls (stdlib / ets)
ets:setopts(Tab, Opts) -> true
  Types:
    Tab = tid() | atom()
    Opts = Opt | [Opt]
    Opt = {heir, pid() | none, HeirData :: term()}

ets:give_away(Tab, Pid, GiftData) -> true
  Types:
    Tab = tid() | atom()
    Pid = pid()
    GiftData = term()
\`\`\`

Consult the attached documentation cards below for exact complexity notes and type details.

## Parallel Worked Example: Dynamic Shard Backup Controller

Consider a separate domain: a sharded memory store where a worker creates an *unnamed* ETS table handle (\`ShardTid\`) and dynamically attaches an heir via \`ets:setopts/2\`, allowing a backup controller to catch crashes, record recovery telemetry, and transfer ownership back upon a \`make_ref()\`-tagged takeover request:

\`\`\`erlang
-module(shard_backup_heir).
-export([spawn_backup/0, attach_backup/2, return_shard/2, backup_loop/0]).

%% @doc Spawn and link a stateless backup process that catches orphaned shards.
spawn_backup() ->
    spawn_link(?MODULE, backup_loop, []).

%% @doc Dynamically register BackupPid as the heir for an existing shard table.
attach_backup(ShardTid, BackupPid) ->
    ets:setopts(ShardTid, {heir, BackupPid, shard_backup}),
    ok.

%% @doc Receive orphaned table transfers and hand shards back on takeover requests.
backup_loop() ->
    receive
        {'ETS-TRANSFER', ShardTid, _OldOwner, shard_backup} ->
            ets:insert(ShardTid, {recovered_at, erlang:monotonic_time()}),
            backup_loop();
        {takeover, ShardTid, NewOwner, Ref} ->
            ets:give_away(ShardTid, NewOwner, ShardTid),
            NewOwner ! {handoff_done, Ref},
            backup_loop();
        shutdown ->
            ok
    end.

%% @doc Ask BackupPid to return ShardTid ownership to the caller and await receipt.
return_shard(BackupPid, ShardTid) ->
    Ref = make_ref(),
    BackupPid ! {takeover, ShardTid, self(), Ref},
    receive
        {handoff_done, Ref} ->
            receive
                {'ETS-TRANSFER', ShardTid, BackupPid, ShardTid} -> ok
            after 100 -> ok
            end
    after 1000 ->
        {error, timeout}
    end.
\`\`\`

### What ERTS Does at Runtime

- **Dynamic Heir Binding (\`ets:setopts/2\`)**: \`attach_backup/2\` configures \`{heir, BackupPid, shard_backup}\` on an already allocated unnamed \`ShardTid\` handle without needing to pass the option at \`ets:new/2\` time.
- **Orphan Capture (\`'ETS-TRANSFER'\`)**: If the shard worker crashes, \`backup_loop/0\` receives \`{'ETS-TRANSFER', ShardTid, _OldOwner, shard_backup}\` and can immediately mutate the still-intact table (writing \`recovered_at\`).
- **Two-Step Confirmed Handover**: \`return_shard/2\` uses a unique \`make_ref()\` token to synchronize the \`ets:give_away/3\` call with \`backup_loop/0\`, then drains the resulting \`'ETS-TRANSFER'\` delivery before returning \`ok\`.

## Assignment Specification

Implement module \`src/ets_heir_handshake.erl\` exporting \`create_resilient_table/2\`, \`start_guardian/0\`, \`reclaim_table/2\`, \`guardian_loop/1\`, and \`verify_heir_survival_demo/0\`.

### \`create_resilient_table/2\`
- **Input**: Table name atom \`TableNameAtom\`, guardian process identifier \`HeirPid\`.
- **Behavior**: Creates a named public \`set\` ETS table bound to \`TableNameAtom\` with \`HeirPid\` registered as heir under heirloom tag \`keep_alive\`. Returns \`TableNameAtom\`.
- **Examples**:
  - \`ets_heir_handshake:create_resilient_table(resilient_cache, GuardianPid)\` returns \`resilient_cache\`.

### \`start_guardian/0\`
- **Input**: None.
- **Behavior**: Spawns and links a dedicated guardian process running \`guardian_loop/1\` initialized with an empty tracking map. Returns \`{ok, Pid}\`.
- **Examples**:
  - \`ets_heir_handshake:start_guardian()\` returns \`{ok, GuardianPid}\`.

### \`guardian_loop/1\`
- **Input**: Map \`HeldTables\` tracking tables currently under guardian custody.
- **Behavior**: Receives ETS failover transfers and records the transferred table atom in Custody state; handles synchronous reclaim requests from a worker by invoking \`ets:give_away/3\` with heirloom data \`reclaimed\`, confirming reclamation back to the caller, and removing the table from custody; exits cleanly on \`stop\`.

### \`reclaim_table/2\`
- **Input**: Two clauses distinguished by argument guards:
  1. \`GuardianPid\` (PID), \`Tab\` (table atom): sends a reclaim request to \`GuardianPid\` for \`Tab\`, waits up to 1000 ms for confirmation plus the \`'ETS-TRANSFER'\` delivery, and returns \`ok\` (or \`{error, timeout}\`).
  2. \`Tab\` (table atom), \`NewOwnerPid\` (PID): immediately hands over ownership of \`Tab\` to \`NewOwnerPid\` with heirloom tag \`reclaimed\` and returns \`ok\`.
- **Examples**:
  - \`ets_heir_handshake:reclaim_table(GuardianPid, resilient_cache)\` returns \`ok\`.

### \`verify_heir_survival_demo/0\`
- **Input**: None.
- **Behavior**: Demonstrates end-to-end table survival across an intentional worker crash using table \`demo_heir_tab\`: spawns an heir waiter and a worker that creates the resilient table, inserts \`{session_1, active}\`, and crashes via \`exit(kill)\`. Once the heir receives \`keep_alive\` table transfer, queries \`session_1\`, cleans up \`demo_heir_tab\`, and returns the lookup result list.
- **Examples**:
  - \`ets_heir_handshake:verify_heir_survival_demo()\` returns \`[{session_1, active}]\`.

## Rules & Verification Constraints

- **Required Calls**: \`bf_ast_verifier\` enforces \`ets:new/2\` and \`ets:give_away/3\`.
- **Heir Registration**: \`create_resilient_table/2\` must register \`{heir, HeirPid, keep_alive}\`.
- **Zero Data Loss**: All entries written by a crashing creator process must remain intact in guardian custody and after reclamation.
`,
    otpDocCards: [
      {
        functionName: 'give_away',
        module: 'ets',
        signature: 'ets:give_away(Tab, Pid, GiftData) -> true',
        typesSpec: [
          'Tab = tab()',
          'Pid = pid()',
          'GiftData = term()'
        ],
        description: 'Transfers ownership of an ETS table to another process without table destruction or data copying.',
        complexityNote: 'O(1) ownership pointer swap in C runtime.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#give_away/3',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      },
      {
        functionName: 'setopts',
        module: 'ets',
        signature: 'ets:setopts(Tab, Opts) -> true',
        typesSpec: [
          'Tab = tab()',
          'Opts = {heir, pid() | none, term()}'
        ],
        description: 'Dynamically updates table options such as the designated heir process.',
        complexityNote: 'O(1) configuration update.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#setopts/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      }
    ],
    mentalModelCheck: {
      question: 'What happens to a public named ETS table if the creating process terminates and NO heir was configured?',
      options: [
        {
          id: 'A',
          label: 'The table is adopted by the supervisor process of the deceased worker.',
          isCorrect: false,
          explanation: 'Supervisors do not automatically adopt orphaned ETS tables unless explicitly configured as heir.'
        },
        {
          id: 'B',
          label: 'The table remains in RAM indefinitely until the BEAM node halts.',
          isCorrect: false,
          explanation: 'ETS table lifetimes are strictly bound to their creator; without an heir, the table is deleted immediately.'
        },
        {
          id: 'C',
          label: 'The BEAM runtime immediately deletes the table and frees all allocated memory.',
          isCorrect: true,
          explanation: 'In Erlang, an ETS table lifetime is bound to its owner. If the owner process dies without an active heir, the BEAM VM wipes the table immediately.'
        },
        {
          id: 'D',
          label: 'The table is converted to a DETS disk file automatically.',
          isCorrect: false,
          explanation: 'BEAM never writes ETS tables to disk automatically.'
        }
      ]
    },
    starterCode: `-module(ets_heir_handshake).
-export([create_resilient_table/2, reclaim_table/2, verify_heir_survival_demo/0]).
-export([start_guardian/0, guardian_loop/1]).

%% @doc Create a named public ETS set table with HeirPid configured as heir and return its name.
create_resilient_table(_TableNameAtom, _HeirPid) ->
    ok.

%% @doc Spawn and link a guardian process executing guardian_loop/1.
start_guardian() ->
    ok.

%% @doc Reclaim ownership of Tab from GuardianPid or hand Tab off directly to NewOwnerPid.
reclaim_table(_GuardianPid, _Tab) when is_pid(_GuardianPid) ->
    ok;
reclaim_table(_Tab, _NewOwnerPid) when is_pid(_NewOwnerPid) ->
    ok.

%% @doc Hold orphaned ETS tables upon transfer and give them away when workers reclaim them.
guardian_loop(_HeldTables) ->
    ok.

%% @doc Simulate a worker crash after writing demo_heir_tab and return the surviving entries.
verify_heir_survival_demo() ->
    ok.
`,
    solutionCode: `-module(ets_heir_handshake).
-export([create_resilient_table/2, reclaim_table/2, verify_heir_survival_demo/0]).
-export([start_guardian/0, guardian_loop/1]).

%% @doc Create a named public ETS set table with HeirPid configured as heir and return its name.
create_resilient_table(TableNameAtom, HeirPid) ->
    ets:new(TableNameAtom, [
        set,
        public,
        named_table,
        {heir, HeirPid, keep_alive}
    ]),
    TableNameAtom.

%% @doc Spawn and link a guardian process executing guardian_loop/1.
start_guardian() ->
    Pid = spawn_link(?MODULE, guardian_loop, [#{}]),
    {ok, Pid}.

%% @doc Reclaim ownership of Tab from GuardianPid or hand Tab off directly to NewOwnerPid.
reclaim_table(GuardianPid, Tab) when is_pid(GuardianPid) ->
    GuardianPid ! {reclaim, Tab, self()},
    receive
        {reclaimed, Tab} ->
            receive
                {'ETS-TRANSFER', Tab, GuardianPid, reclaimed} -> ok
            after 100 -> ok
            end
    after 1000 ->
        {error, timeout}
    end;
reclaim_table(Tab, NewOwnerPid) when is_pid(NewOwnerPid) ->
    ets:give_away(Tab, NewOwnerPid, reclaimed),
    ok.

%% @doc Hold orphaned ETS tables upon transfer and give them away when workers reclaim them.
guardian_loop(HeldTables) ->
    receive
        {'ETS-TRANSFER', Tab, _DeadOwner, _Data} ->
            guardian_loop(HeldTables#{Tab => true});
        {reclaim, Tab, WorkerPid} ->
            ets:give_away(Tab, WorkerPid, reclaimed),
            WorkerPid ! {reclaimed, Tab},
            guardian_loop(maps:remove(Tab, HeldTables));
        stop ->
            ok
    end.

%% @doc Simulate a worker crash after writing demo_heir_tab and return the surviving entries.
verify_heir_survival_demo() ->
    try ets:delete(demo_heir_tab) catch _:_ -> ok end,
    Parent = self(),
    Heir = spawn(fun() ->
        receive
            {'ETS-TRANSFER', demo_heir_tab, _DeadWorker, keep_alive} ->
                Res = ets:lookup(demo_heir_tab, session_1),
                Parent ! {heir_result, Res}
        after 1000 ->
            Parent ! {heir_result, []}
        end
    end),
    _Worker = spawn(fun() ->
        create_resilient_table(demo_heir_tab, Heir),
        ets:insert(demo_heir_tab, {session_1, active}),
        exit(kill)
    end),
    receive
        {heir_result, Res} ->
            try ets:delete(demo_heir_tab) catch _:_ -> ok end,
            Res
    after 1000 ->
        []
    end.
`,
    files: [
      {
        name: 'ets_heir_handshake.erl',
        path: 'src/ets_heir_handshake.erl',
        content: `-module(ets_heir_handshake).
-export([create_resilient_table/2, reclaim_table/2, verify_heir_survival_demo/0]).
-export([start_guardian/0, guardian_loop/1]).

%% @doc Create a named public ETS set table with HeirPid configured as heir and return its name.
create_resilient_table(_TableNameAtom, _HeirPid) ->
    ok.

%% @doc Spawn and link a guardian process executing guardian_loop/1.
start_guardian() ->
    ok.

%% @doc Reclaim ownership of Tab from GuardianPid or hand Tab off directly to NewOwnerPid.
reclaim_table(_GuardianPid, _Tab) when is_pid(_GuardianPid) ->
    ok;
reclaim_table(_Tab, _NewOwnerPid) when is_pid(_NewOwnerPid) ->
    ok.

%% @doc Hold orphaned ETS tables upon transfer and give them away when workers reclaim them.
guardian_loop(_HeldTables) ->
    ok.

%% @doc Simulate a worker crash after writing demo_heir_tab and return the surviving entries.
verify_heir_survival_demo() ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/ets_heir_handshake.erl': `-module(ets_heir_handshake).
-export([create_resilient_table/2, reclaim_table/2, verify_heir_survival_demo/0]).
-export([start_guardian/0, guardian_loop/1]).

%% @doc Create a named public ETS set table with HeirPid configured as heir and return its name.
create_resilient_table(TableNameAtom, HeirPid) ->
    ets:new(TableNameAtom, [
        set,
        public,
        named_table,
        {heir, HeirPid, keep_alive}
    ]),
    TableNameAtom.

%% @doc Spawn and link a guardian process executing guardian_loop/1.
start_guardian() ->
    Pid = spawn_link(?MODULE, guardian_loop, [#{}]),
    {ok, Pid}.

%% @doc Reclaim ownership of Tab from GuardianPid or hand Tab off directly to NewOwnerPid.
reclaim_table(GuardianPid, Tab) when is_pid(GuardianPid) ->
    GuardianPid ! {reclaim, Tab, self()},
    receive
        {reclaimed, Tab} ->
            receive
                {'ETS-TRANSFER', Tab, GuardianPid, reclaimed} -> ok
            after 100 -> ok
            end
    after 1000 ->
        {error, timeout}
    end;
reclaim_table(Tab, NewOwnerPid) when is_pid(NewOwnerPid) ->
    ets:give_away(Tab, NewOwnerPid, reclaimed),
    ok.

%% @doc Hold orphaned ETS tables upon transfer and give them away when workers reclaim them.
guardian_loop(HeldTables) ->
    receive
        {'ETS-TRANSFER', Tab, _DeadOwner, _Data} ->
            guardian_loop(HeldTables#{Tab => true});
        {reclaim, Tab, WorkerPid} ->
            ets:give_away(Tab, WorkerPid, reclaimed),
            WorkerPid ! {reclaimed, Tab},
            guardian_loop(maps:remove(Tab, HeldTables));
        stop ->
            ok
    end.

%% @doc Simulate a worker crash after writing demo_heir_tab and return the surviving entries.
verify_heir_survival_demo() ->
    try ets:delete(demo_heir_tab) catch _:_ -> ok end,
    Parent = self(),
    Heir = spawn(fun() ->
        receive
            {'ETS-TRANSFER', demo_heir_tab, _DeadWorker, keep_alive} ->
                Res = ets:lookup(demo_heir_tab, session_1),
                Parent ! {heir_result, Res}
        after 1000 ->
            Parent ! {heir_result, []}
        end
    end),
    _Worker = spawn(fun() ->
        create_resilient_table(demo_heir_tab, Heir),
        ets:insert(demo_heir_tab, {session_1, active}),
        exit(kill)
    end),
    receive
        {heir_result, Res} ->
            try ets:delete(demo_heir_tab) catch _:_ -> ok end,
            Res
    after 1000 ->
        []
    end.
`,
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Heir Transfer Survival and Reclaim',
        erlangCall: 'begin catch ets:delete(resilient_cache), {ok, Guardian} = ets_heir_handshake:start_guardian(), _Creator = spawn(fun() -> Tab = ets_heir_handshake:create_resilient_table(resilient_cache, Guardian), ets:insert(Tab, {k1, <<"persistent_value">>}), timer:sleep(10), exit(intentional_crash) end), timer:sleep(50), Info = ets:info(resilient_cache), OwnerIsGuardian = (proplists:get_value(owner, Info) =:= Guardian), ok = ets_heir_handshake:reclaim_table(Guardian, resilient_cache), [{k1, Val}] = ets:lookup(resilient_cache, k1), Guardian ! stop, catch ets:delete(resilient_cache), {OwnerIsGuardian, Val} end',
        expectedOutput: '{true, <<"persistent_value">>}',
        explanation: 'Verifies table ownership moves to guardian on crash and data is fully reclaimed.'
      },
      {
        id: 'tc2',
        title: 'Verify Heir Survival Demo',
        erlangCall: 'ets_heir_handshake:verify_heir_survival_demo()',
        expectedOutput: '[{session_1, active}]',
        explanation: 'Demonstrates end-to-end crash survival with ETS lookup validation.'
      }
    ],
    astRules: {
      requiredCalls: ['ets:new/2', 'ets:give_away/3']
    },
    solutionExplanation: 'Implements the ETS heir failover handshake pattern ensuring zero data loss during process crashes.',
  },

  // ── Lesson 9.4: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch09-l04',
    chapterNumber: 9,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'Distributed Erlang Core: Nodes, Magic Cookies, rpc:call & pg Groups',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

Erlang's actor model was designed from day one for distributed systems: sending a message to a process PID on another machine uses the exact same \`Pid ! Msg\` primitive as messaging a local worker. Large BEAM clusters (chat servers, telecom switches, multiplayer rooms) rely on three built-in primitives:

1. **Cluster Membership & Cookies**: Distributed BEAM nodes authenticate over EPMD/TCP/TLS using a shared secret magic cookie before forming a mesh network (\`node/0\`, \`nodes/0\`, \`is_alive/0\`).
2. **Bounded Remote Calls (\`rpc:call/5\`)**: Executes an \`M:F(Args)\` call synchronously on a target node with a hard millisecond deadline, converting unreachable nodes or timeouts into explicit \`{badrpc, Reason}\` error values instead of hanging callers forever.
3. **Decentralized Pub/Sub with \`pg\` (OTP 23+)**: Replaced legacy \`pg2\` to remove its single central bottleneck. \`pg\` runs monitor-backed process groups synced across every node in the cluster and automatically evicts crashed subscriber PIDs.

> [!NOTE]
> **Standalone vs. Distributed VM Mode:** When a BEAM instance boots without \`-sname\` or \`-name\` (such as unit test sandboxes), \`is_alive()\` returns \`false\` and \`node()\` returns \`nonode@nohost\`. Both \`rpc:call/5\` and \`pg\` continue working transparently on the local node!

## Deep Concept Breakdown & Under the Hood

### 1. Node Identity & Distributed Safety

- **\`node/0\`**: Returns the local node atom (e.g. \`'api@10.0.1.4'\` or \`'nonode@nohost'\`).
- **\`nodes/0\`**: Returns a list of currently connected remote peer node atoms (excluding \`node()\`).
- **\`is_alive/0\`**: Returns \`true\` if Erlang distribution is active, \`false\` otherwise.

### 2. Defensive RPC Normalization

Calling \`rpc:call(TargetNode, Mod, Fun, Args, TimeoutMs)\` returns either the remote function's return term directly or \`{badrpc, Reason}\` (e.g., \`nodedown\` or \`timeout\`). Never match only on expected domain atoms like \`true\`—what if the remote function itself legitimately returns \`false\`? Pattern-matching \`{badrpc, Reason}\` first and wrapping everything else in \`{ok, Result}\` safely handles any valid return term.

### 3. Scopes & Groups in \`pg\`

\`pg\` supports both the default scope process (registered as \`pg\`, started via \`pg:start_link/0\`) and isolated custom scopes started via \`pg:start_link(ScopeAtom)\`. If a \`pg\` scope is already running, \`pg:start_link/0\` returns \`{error, {already_started, Pid}}\` rather than \`{ok, Pid}\`, so idempotent helpers must accept both shapes cleanly.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official Distributed Calls (kernel / rpc & pg)
rpc:call(Node, Module, Function, Args, Timeout) -> Res | {badrpc, Reason}
  Types:
    Node = node()
    Module = Function = atom()
    Args = [term()]
    Timeout = timeout()
    Res = Reason = term()

pg:start_link() -> {ok, pid()} | {error, {already_started, pid()} | term()}
pg:join(Group, PidOrPids) -> ok
pg:leave(Group, PidOrPids) -> ok
pg:get_members(Group) -> [pid()]
  Types:
    Group = term()
    PidOrPids = pid() | [pid()]
\`\`\`

Refer to the attached documentation cards below for module links and complexity notes on group membership operations.

## Parallel Worked Example: Scoped Run-Queue Mesh Telemetry

Consider a separate domain: a node-scheduler monitor (\`mesh_telemetry\`) using an isolated named \`pg\` scope (\`telemetry_scope\`) and \`rpc:call/5\` to sample scheduler run-queue depth safely across both distributed and standalone nodes:

\`\`\`erlang
-module(mesh_telemetry).
-export([ensure_scope/0, register_collector/1, unregister_collector/1, sample_peer_queue/1, dispatch_sample/1]).

%% @doc Idempotently ensure the dedicated telemetry_scope pg process is running.
ensure_scope() ->
    case pg:start_link(telemetry_scope) of
        {ok, _Pid} -> ok;
        {error, {already_started, _Pid}} -> ok
    end.

%% @doc Subscribe CollectorPid to scheduler sample broadcasts under telemetry_scope.
register_collector(CollectorPid) ->
    ensure_scope(),
    pg:join(telemetry_scope, collectors, CollectorPid).

%% @doc Unsubscribe CollectorPid from telemetry_scope broadcasts.
unregister_collector(CollectorPid) ->
    ensure_scope(),
    pg:leave(telemetry_scope, collectors, CollectorPid).

%% @doc Query run-queue depth on PeerNode with a 1500 ms RPC deadline.
sample_peer_queue(PeerNode) ->
    case rpc:call(PeerNode, erlang, statistics, [run_queue], 1500) of
        {badrpc, Reason} ->
            {error, {unreachable, Reason}};
        QueueDepth ->
            {ok, QueueDepth}
    end.

%% @doc Forward a telemetry reading to all active collectors and return count.
dispatch_sample(Value) ->
    ensure_scope(),
    Targets = pg:get_members(telemetry_scope, collectors),
    lists:foreach(fun(Pid) -> Pid ! {telemetry_sample, Value} end, Targets),
    {delivered, length(Targets)}.
\`\`\`

### What ERTS Does at Runtime

- **Race-Safe Idempotent Boot (\`ensure_scope/0\`)**: Calling \`pg:start_link(telemetry_scope)\` directly and matching both \`{ok, _Pid}\` and \`{error, {already_started, _Pid}}\` avoids check-then-act races between \`whereis/1\` and process registration.
- **Total Return Discrimination (\`sample_peer_queue/1\`)**: By matching \`{badrpc, Reason}\` explicitly before a catch-all \`QueueDepth\` branch, any valid Erlang value—even \`0\` or \`false\`—passes through wrapped as \`{ok, Value}\`.
- **Isolated Scoped Fanout (\`dispatch_sample/1\`)**: \`pg:get_members(telemetry_scope, collectors)\` reads the lock-free ETS table owned by the \`telemetry_scope\` coordinator and fans out via \`lists:foreach/2\` without leaking into the default \`pg\` scope.

## Assignment Specification

Implement module \`src/cluster_pubsub_pg.erl\` exporting \`cluster_node_info/0\`, \`safe_remote_call/4\`, \`init_pubsub/0\`, \`join_topic/2\`, \`publish_to_topic/2\`, \`leave_topic/2\`, \`broadcast/2\`, and \`get_subscribers/1\`.

### \`cluster_node_info/0\`
- **Input**: None.
- **Behavior**: Inspects the running BEAM node and returns a map with keys \`self_node\` (local node atom), \`connected_peers\` (list of connected peer nodes), and \`alive\` (boolean indicating whether distribution is active).
- **Examples**:
  - On a non-distributed test node, \`maps:get(alive, cluster_pubsub_pg:cluster_node_info())\` returns \`false\`.

### \`safe_remote_call/4\`
- **Input**: Node atom \`TargetNode\`, module \`Mod\`, function atom \`Fun\`, argument list \`Args\`.
- **Behavior**: Executes the RPC synchronously against \`TargetNode\` with a \`2000\` ms timeout. Normalizes RPC failures into \`{error, {rpc_failed, Reason}}\`, and wraps any other result (including booleans) in \`{ok, Result}\`.
- **Examples**:
  - \`cluster_pubsub_pg:safe_remote_call(node(), erlang, is_alive, [])\` returns \`{ok, false}\` on an undistributed VM.
  - Calling an unreachable node returns \`{error, {rpc_failed, nodedown}}\`.

### \`init_pubsub/0\`
- **Input**: None.
- **Behavior**: Ensures the default OTP \`pg\` server process is running on the node (handling an already-started process cleanly) and returns \`ok\`.

### \`join_topic/2\` and \`leave_topic/2\`
- **Input**: Topic term \`Topic\`, subscriber \`Pid\`.
- **Behavior**: Ensures \`pg\` is active, then adds (\`join_topic/2\`) or removes (\`leave_topic/2\`) \`Pid\` for group \`Topic\` in the default \`pg\` scope and returns \`ok\`.

### \`publish_to_topic/2\` and \`broadcast/2\`
- **Input**: Topic term \`Topic\`, arbitrary term \`Message\`.
- **Behavior**: Ensures \`pg\` is active, queries current members of \`Topic\`, delivers a 3-element tuple tagged \`pubsub\` containing \`Topic\` and \`Message\` to every member PID, and returns \`{published, Count}\` from \`publish_to_topic/2\` (or \`{ok, Count}\` from \`broadcast/2\`).
- **Examples**:
  - With one subscribed process, \`cluster_pubsub_pg:publish_to_topic(<<"alerts">>, <<"cluster_overload">>)\` delivers \`{pubsub, <<"alerts">>, <<"cluster_overload">>}\` and returns \`{published, 1}\`.

### \`get_subscribers/1\`
- **Input**: Topic term \`Topic\`.
- **Behavior**: Ensures \`pg\` is active and returns the list of live subscriber PIDs currently registered in \`Topic\`.

## Rules & Verification Constraints

- **Required Remote Calls**: \`bf_ast_verifier\` enforces \`rpc:call/5\`, \`pg:join/2\`, \`pg:leave/2\`, and \`pg:get_members/1\`.
- **Timeout Safety**: \`safe_remote_call/4\` must enforce a \`2000\` ms timeout via \`rpc:call/5\` and never crash on falsy return values.
`,
    otpDocCards: [
      {
        functionName: 'call',
        module: 'rpc',
        signature: 'rpc:call(Node, Module, Function, Args, Timeout) -> Res | {badrpc, Reason}',
        typesSpec: [
          'Node = node()',
          'Module = Function = atom()',
          'Args = [term()]',
          'Timeout = timeout()',
          'Res = Reason = term()'
        ],
        description: 'Evaluates apply(Module, Function, Args) on Node and returns the corresponding value, or {badrpc, Reason} if the call fails.',
        complexityNote: 'Synchronous network message roundtrip with timeout.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/rpc.html#call/5',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/rpc.erl'
      },
      {
        functionName: 'join',
        module: 'pg',
        signature: 'pg:join(Group, PidOrPids) -> ok',
        typesSpec: [
          'Group = term()',
          'PidOrPids = pid() | [pid()]'
        ],
        description: 'Subscribes one or more processes to a distributed process group across the cluster.',
        complexityNote: 'O(1) monitored process registration.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/pg.html#join/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/pg.erl'
      },
      {
        functionName: 'get_members',
        module: 'pg',
        signature: 'pg:get_members(Group) -> [pid()]',
        typesSpec: [
          'Group = term()'
        ],
        description: 'Returns all live process identifiers currently joined to the specified group.',
        complexityNote: 'O(N) membership lookup.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/pg.html#get_members/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/pg.erl'
      },
      {
        functionName: 'leave',
        module: 'pg',
        signature: 'pg:leave(Group, PidOrPids) -> ok',
        typesSpec: [
          'Group = term()',
          'PidOrPids = pid() | [pid()]'
        ],
        description: 'Unsubscribes one or more processes from the group.',
        complexityNote: 'O(1) unregistration.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/pg.html#leave/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/pg.erl'
      }
    ],
    mentalModelCheck: {
      question: 'Why was pg introduced in OTP 23 to replace the legacy pg2 module?',
      options: [
        {
          id: 'A',
          label: 'pg uses raw UDP packets instead of TCP for cluster routing.',
          isCorrect: false,
          explanation: 'pg uses standard BEAM distributed node distribution channels over TCP/TLS.'
        },
        {
          id: 'B',
          label: 'pg2 had a single central coordinator process per node, creating a bottleneck; pg uses a decentralized, lock-free architecture.',
          isCorrect: true,
          explanation: 'pg was designed to replace pg2 because pg2 suffered from a single centralized coordinator process that created message bottlenecks at scale. pg is fully decentralized and lock-free.'
        },
        {
          id: 'C',
          label: 'pg2 required nodes to share a physical hard drive to coordinate subscriptions.',
          isCorrect: false,
          explanation: 'Neither pg nor pg2 requires shared disk storage.'
        },
        {
          id: 'D',
          label: 'pg encrypts all message payloads with AES-256 by default.',
          isCorrect: false,
          explanation: 'Distribution encryption is handled at the Erlang distribution layer, not by pg.'
        }
      ]
    },
    starterCode: `-module(cluster_pubsub_pg).
-export([cluster_node_info/0, safe_remote_call/4, join_topic/2, publish_to_topic/2, leave_topic/2]).
-export([init_pubsub/0, broadcast/2, get_subscribers/1]).

%% @doc Return a map summarizing local node identity, peer nodes, and distribution status.
cluster_node_info() ->
    ok.

%% @doc Execute an RPC against TargetNode with a 2000 ms timeout and normalized result tuple.
safe_remote_call(_TargetNode, _Mod, _Fun, _Args) ->
    ok.

%% @doc Ensure the default pg process group server is started idempotently.
init_pubsub() ->
    ok.

%% @doc Subscribe Pid to Topic in the default pg group.
join_topic(_Topic, _Pid) ->
    ok.

%% @doc Deliver a pubsub tuple with Message to every subscriber of Topic and return count.
publish_to_topic(_Topic, _Message) ->
    ok.

%% @doc Publish Message to Topic subscribers and return an ok-tagged delivery count.
broadcast(_Topic, _Message) ->
    ok.

%% @doc Unsubscribe Pid from Topic in the default pg group.
leave_topic(_Topic, _Pid) ->
    ok.

%% @doc Return the list of active subscriber PIDs currently registered on Topic.
get_subscribers(_Topic) ->
    ok.
`,
    solutionCode: `-module(cluster_pubsub_pg).
-export([cluster_node_info/0, safe_remote_call/4, join_topic/2, publish_to_topic/2, leave_topic/2]).
-export([init_pubsub/0, broadcast/2, get_subscribers/1]).

%% @doc Return a map summarizing local node identity, peer nodes, and distribution status.
cluster_node_info() ->
    #{
        self_node => node(),
        connected_peers => nodes(),
        alive => is_alive()
    }.

%% @doc Execute an RPC against TargetNode with a 2000 ms timeout and normalized result tuple.
safe_remote_call(TargetNode, Mod, Fun, Args) ->
    case rpc:call(TargetNode, Mod, Fun, Args, 2000) of
        {badrpc, Reason} ->
            {error, {rpc_failed, Reason}};
        Result ->
            {ok, Result}
    end.

%% @doc Ensure the default pg process group server is started idempotently.
init_pubsub() ->
    case whereis(pg) of
        undefined ->
            case pg:start_link() of
                {ok, _Pid} -> ok;
                {error, {already_started, _Pid}} -> ok
            end;
        _ ->
            ok
    end.

%% @doc Subscribe Pid to Topic in the default pg group.
join_topic(Topic, Pid) ->
    init_pubsub(),
    pg:join(Topic, Pid).

%% @doc Deliver a pubsub tuple with Message to every subscriber of Topic and return count.
publish_to_topic(Topic, Message) ->
    init_pubsub(),
    Members = pg:get_members(Topic),
    [P ! {pubsub, Topic, Message} || P <- Members],
    {published, length(Members)}.

%% @doc Publish Message to Topic subscribers and return an ok-tagged delivery count.
broadcast(Topic, Message) ->
    {published, Count} = publish_to_topic(Topic, Message),
    {ok, Count}.

%% @doc Unsubscribe Pid from Topic in the default pg group.
leave_topic(Topic, Pid) ->
    init_pubsub(),
    pg:leave(Topic, Pid).

%% @doc Return the list of active subscriber PIDs currently registered on Topic.
get_subscribers(Topic) ->
    init_pubsub(),
    pg:get_members(Topic).
`,
    files: [
      {
        name: 'cluster_pubsub_pg.erl',
        path: 'src/cluster_pubsub_pg.erl',
        content: `-module(cluster_pubsub_pg).
-export([cluster_node_info/0, safe_remote_call/4, join_topic/2, publish_to_topic/2, leave_topic/2]).
-export([init_pubsub/0, broadcast/2, get_subscribers/1]).

%% @doc Return a map summarizing local node identity, peer nodes, and distribution status.
cluster_node_info() ->
    ok.

%% @doc Execute an RPC against TargetNode with a 2000 ms timeout and normalized result tuple.
safe_remote_call(_TargetNode, _Mod, _Fun, _Args) ->
    ok.

%% @doc Ensure the default pg process group server is started idempotently.
init_pubsub() ->
    ok.

%% @doc Subscribe Pid to Topic in the default pg group.
join_topic(_Topic, _Pid) ->
    ok.

%% @doc Deliver a pubsub tuple with Message to every subscriber of Topic and return count.
publish_to_topic(_Topic, _Message) ->
    ok.

%% @doc Publish Message to Topic subscribers and return an ok-tagged delivery count.
broadcast(_Topic, _Message) ->
    ok.

%% @doc Unsubscribe Pid from Topic in the default pg group.
leave_topic(_Topic, _Pid) ->
    ok.

%% @doc Return the list of active subscriber PIDs currently registered on Topic.
get_subscribers(_Topic) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/cluster_pubsub_pg.erl': `-module(cluster_pubsub_pg).
-export([cluster_node_info/0, safe_remote_call/4, join_topic/2, publish_to_topic/2, leave_topic/2]).
-export([init_pubsub/0, broadcast/2, get_subscribers/1]).

%% @doc Return a map summarizing local node identity, peer nodes, and distribution status.
cluster_node_info() ->
    #{
        self_node => node(),
        connected_peers => nodes(),
        alive => is_alive()
    }.

%% @doc Execute an RPC against TargetNode with a 2000 ms timeout and normalized result tuple.
safe_remote_call(TargetNode, Mod, Fun, Args) ->
    case rpc:call(TargetNode, Mod, Fun, Args, 2000) of
        {badrpc, Reason} ->
            {error, {rpc_failed, Reason}};
        Result ->
            {ok, Result}
    end.

%% @doc Ensure the default pg process group server is started idempotently.
init_pubsub() ->
    case whereis(pg) of
        undefined ->
            case pg:start_link() of
                {ok, _Pid} -> ok;
                {error, {already_started, _Pid}} -> ok
            end;
        _ ->
            ok
    end.

%% @doc Subscribe Pid to Topic in the default pg group.
join_topic(Topic, Pid) ->
    init_pubsub(),
    pg:join(Topic, Pid).

%% @doc Deliver a pubsub tuple with Message to every subscriber of Topic and return count.
publish_to_topic(Topic, Message) ->
    init_pubsub(),
    Members = pg:get_members(Topic),
    [P ! {pubsub, Topic, Message} || P <- Members],
    {published, length(Members)}.

%% @doc Publish Message to Topic subscribers and return an ok-tagged delivery count.
broadcast(Topic, Message) ->
    {published, Count} = publish_to_topic(Topic, Message),
    {ok, Count}.

%% @doc Unsubscribe Pid from Topic in the default pg group.
leave_topic(Topic, Pid) ->
    init_pubsub(),
    pg:leave(Topic, Pid).

%% @doc Return the list of active subscriber PIDs currently registered on Topic.
get_subscribers(Topic) ->
    init_pubsub(),
    pg:get_members(Topic).
`,
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Cluster Node Info and Self RPC',
        erlangCall: 'begin Info = cluster_pubsub_pg:cluster_node_info(), {ok, Alive} = cluster_pubsub_pg:safe_remote_call(node(), erlang, is_alive, []), {maps:get(alive, Info), Alive} end',
        expectedOutput: '{false, false}',
        explanation: 'Verifies node introspection and local RPC execution.'
      },
      {
        id: 'tc2',
        title: 'Decentralized pg Topic Join and Publish',
        erlangCall: 'begin Self = self(), ok = cluster_pubsub_pg:join_topic(<<"alerts">>, Self), {published, 1} = cluster_pubsub_pg:publish_to_topic(<<"alerts">>, <<"cluster_overload">>), Msg = receive {pubsub, <<"alerts">>, M} -> M after 100 -> timeout end, ok = cluster_pubsub_pg:leave_topic(<<"alerts">>, Self), Msg end',
        expectedOutput: '<<"cluster_overload">>',
        explanation: 'Tests joining a topic, publishing, receiving the message, and leaving.'
      }
    ],
    astRules: {
      requiredCalls: ['rpc:call/5', 'pg:join/2', 'pg:get_members/1', 'pg:leave/2']
    },
    solutionExplanation: 'Integrates distributed Erlang RPC with OTP 23+ decentralized pg process groups.',
  },

  // ── Lesson 9.5: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch09-l05',
    chapterNumber: 9,
    lessonNumber: 5,
    lessonType: 'concept_exercise',
    title: 'Mnesia Distributed DBMS: Tables, ACID Transactions & Rollback',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

ETS gives you nanosecond-speed single-operation off-heap lookups, **but ETS provides no multi-row ACID transactions**.

If you debit Account A in one ETS operation and the worker crashes before crediting Account B in a second ETS operation, money vanishes permanently. Financial ledgers, quota systems, and replicated cluster configuration require all-or-nothing **ACID transactions** across multiple records. Erlang ships **Mnesia** directly inside OTP to deliver embedded ACID transactions with replication and optional disk persistence.

> [!NOTE]
> **Mnesia Storage Modes:**
> - **\`ram_copies\`**: Pure off-heap RAM (fastest; volatile on full cluster stop).
> - **\`disc_copies\`**: RAM + disk write-ahead log (fast reads, crash-durable).
> - **\`disc_only_copies\`**: DETS disk storage without RAM caching.

## Deep Concept Breakdown & Under the Hood

### 1. Defining Record Schemas & Creating Tables

Every Mnesia table maps an Erlang \`-record(TabName, {KeyField, ...})\` whose first field is the primary key. Calling \`mnesia:start/0\` starts the local Mnesia application, \`mnesia:create_table/2\` registers the schema using \`record_info(fields, TabName)\` plus storage placement (\`{ram_copies, [node()]}\`), and \`mnesia:wait_for_tables/2\` blocks until tables are loaded and writable. If a table already exists from an earlier call, \`mnesia:create_table/2\` returns \`{aborted, {already_exists, TabName}}\`.

### 2. Inside \`mnesia:transaction/1\`: Locks & Transaction Journals

When you pass a zero-arity fun \`fun() -> ... end\` to \`mnesia:transaction/1\`:
- Reads (\`mnesia:read/2\`) acquire shared read locks across the transaction.
- Writes (\`mnesia:write/1\`) acquire exclusive write locks and buffer changes in a per-transaction memory log rather than mutating tables immediately.
- On normal completion, Mnesia commits every buffered write atomically and returns \`{atomic, Value}\`.

### 3. Instant Rollback via \`mnesia:abort/1\`

If validation fails mid-transaction (for instance, missing records or failed balance checks) or an exception is raised, calling \`mnesia:abort(Reason)\` immediately unwinds the transaction, discards 100% of buffered writes, releases all held locks, and returns \`{aborted, Reason}\` to the caller—leaving existing table rows untouched.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official Mnesia Signatures (mnesia)
mnesia:start() -> ok | {error, Reason}
mnesia:create_table(Name, TabDef) -> {atomic, ok} | {aborted, Reason}
  Types:
    Name = atom()
    TabDef = [{attributes, [atom()]} | {ram_copies, [node()]} | {disc_copies, [node()]}]

mnesia:wait_for_tables(TabList, Timeout) -> ok | {timeout, BadTabList} | {error, Reason}
mnesia:transaction(Fun) -> {atomic, Result} | {aborted, Reason}
mnesia:read(Tab, Key) -> [Record :: tuple()]
mnesia:write(Record) -> ok
mnesia:abort(Reason) -> no_return()
\`\`\`

Consult the attached documentation cards below for lock behavior and return-type contracts.

## Parallel Worked Example: Org Seat Quota Registry

Consider a separate domain: an organization seat allocation registry (\`quota_registry\`) tracking active seats against a maximum seat limit using record \`#seat_pool{org, allocated, limit}\`:

\`\`\`erlang
-module(quota_registry).
-export([boot_registry/0, set_pool/3, grant_seat/1, read_pool/1]).

-record(seat_pool, {org, allocated, limit}).

%% @doc Start Mnesia and ensure the ram_copies seat_pool table is ready.
boot_registry() ->
    ok = mnesia:start(),
    case mnesia:create_table(seat_pool, [
        {attributes, record_info(fields, seat_pool)},
        {ram_copies, [node()]}
    ]) of
        {atomic, ok} -> ok;
        {aborted, {already_exists, seat_pool}} -> ok
    end,
    mnesia:wait_for_tables([seat_pool], 2000).

%% @doc Store or overwrite an organization seat pool atomically.
set_pool(OrgId, Allocated, Limit) ->
    Txn = fun() ->
        mnesia:write(#seat_pool{org = OrgId, allocated = Allocated, limit = Limit})
    end,
    case mnesia:transaction(Txn) of
        {atomic, ok} -> ok;
        {aborted, Reason} -> {error, Reason}
    end.

%% @doc Attempt to increment allocated seats by 1 if capacity allows.
grant_seat(OrgId) ->
    Txn = fun() ->
        case mnesia:read(seat_pool, OrgId) of
            [] ->
                mnesia:abort(unknown_org);
            [#seat_pool{allocated = Used, limit = Cap}] when Used + 1 > Cap ->
                mnesia:abort(quota_exceeded);
            [#seat_pool{allocated = Used} = Pool] ->
                NewUsed = Used + 1,
                mnesia:write(Pool#seat_pool{allocated = NewUsed}),
                NewUsed
        end
    end,
    case mnesia:transaction(Txn) of
        {atomic, NewUsed} -> {ok, NewUsed};
        {aborted, Reason} -> {error, Reason}
    end.

%% @doc Read the current allocated and limit counts inside a transaction.
read_pool(OrgId) ->
    Txn = fun() ->
        case mnesia:read(seat_pool, OrgId) of
            [#seat_pool{allocated = Used, limit = Cap}] -> {ok, Used, Cap};
            [] -> {error, unknown_org}
        end
    end,
    case mnesia:transaction(Txn) of
        {atomic, Reply} -> Reply;
        {aborted, Reason} -> {error, Reason}
    end.
\`\`\`

### What Mnesia Does at Runtime

- **Idempotent Table Initialization (\`boot_registry/0\`)**: Matches both \`{atomic, ok}\` and \`{aborted, {already_exists, seat_pool}}\` before invoking \`mnesia:wait_for_tables/2\`, making repeated boot calls safe across tests and supervisor restarts.
- **Record Mutation Syntax**: \`Pool#seat_pool{allocated = NewUsed}\` clones the record while preserving untouched fields (\`org\`, \`limit\`) before passing it to \`mnesia:write/1\`.
- **Clean Abort Mapping**: When \`grant_seat/1\` detects missing organizations or exceeded limits, \`mnesia:abort/1\` rolls back the transaction and outer pattern matching converts \`{aborted, Reason}\` into a standard Erlang \`{error, Reason}\` tuple.

## Assignment Specification

Implement module \`src/mnesia_ledger.erl\` defining a \`wallet\` record with fields \`owner\` and \`balance\`, and exporting \`setup_mnesia_table/0\`, \`upsert_wallet/2\`, \`atomic_transfer/3\`, and \`get_wallet_balance/1\`.

### \`setup_mnesia_table/0\`
- **Input**: None.
- **Behavior**: Starts Mnesia, idempotently creates the \`wallet\` table backed by \`ram_copies\` on \`node()\` with attributes derived from the \`wallet\` record definition, waits up to \`2000\` ms for table availability, and returns \`ok\`.
- **Examples**:
  - \`mnesia_ledger:setup_mnesia_table()\` returns \`ok\`.

### \`upsert_wallet/2\`
- **Input**: Account identifier \`Owner\`, integer balance \`Balance\`.
- **Behavior**: Executes a Mnesia transaction writing a \`wallet\` record for \`Owner\` with \`Balance\`, returning \`ok\` upon commit (or \`{error, Reason}\` if aborted).
- **Examples**:
  - \`mnesia_ledger:upsert_wallet(alice, 100)\` returns \`ok\`.

### \`atomic_transfer/3\`
- **Input**: Source account \`FromOwner\`, destination account \`ToOwner\`, strictly positive transfer integer \`Amount\`.
- **Behavior**: Inside a single Mnesia transaction, reads both accounts; aborts with \`account_not_found\` if either wallet is missing, or \`insufficient_funds\` if \`FromOwner\` has less than \`Amount\`. Otherwise updates both records atomically by subtracting \`Amount\` from \`FromOwner\` and adding \`Amount\` to \`ToOwner\`, returning \`{ok, NewFromBalance, NewToBalance}\` on commit or \`{error, Reason}\` on abort with zero balance modifications.
- **Examples**:
  - After seeding \`alice\` with \`100\` and \`bob\` with \`50\`, \`mnesia_ledger:atomic_transfer(alice, bob, 40)\` returns \`{ok, 60, 90}\`.
  - Attempting \`mnesia_ledger:atomic_transfer(alice, bob, 500)\` returns \`{error, insufficient_funds}\` and leaves both balances unchanged.

### \`get_wallet_balance/1\`
- **Input**: Account identifier \`Owner\`.
- **Behavior**: Reads \`Owner\`'s wallet inside a transaction and returns \`{ok, Balance}\` when present, or \`{error, not_found}\` when absent.
- **Examples**:
  - \`mnesia_ledger:get_wallet_balance(alice)\` returns \`{ok, 60}\`.

## Rules & Verification Constraints

- **Required Constructs**: \`bf_ast_verifier\` enforces a \`-record(...)\` definition (\`record_def\`) alongside remote calls \`mnesia:transaction/1\`, \`mnesia:read/2\`, \`mnesia:write/1\`, and \`mnesia:abort/1\`.
- **Atomicity Guarantee**: Failed transfers (\`insufficient_funds\` or \`account_not_found\`) must abort cleanly and leave all wallet balances unaltered.
`,
    otpDocCards: [
      {
        functionName: 'transaction',
        module: 'mnesia',
        signature: 'mnesia:transaction(Fun) -> {atomic, Result} | {aborted, Reason}',
        typesSpec: [
          'Fun = fun(() -> Result)',
          'Result = Reason = term()'
        ],
        description: 'Executes the functional closure Fun within an atomic, isolated Mnesia transaction with automatic rollback.',
        complexityNote: 'Acquires row/table locks and buffers writes in transaction journal.',
        officialUrl: 'https://www.erlang.org/doc/apps/mnesia/mnesia.html#transaction/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/mnesia/src/mnesia.erl'
      },
      {
        functionName: 'read',
        module: 'mnesia',
        signature: 'mnesia:read(Tab, Key) -> [Record]',
        typesSpec: [
          'Tab = atom()',
          'Key = term()',
          'Record = tuple()'
        ],
        description: 'Reads all records with Key from table Tab within the current transaction, acquiring read locks.',
        complexityNote: 'O(1) hash lookup with lock acquisition.',
        officialUrl: 'https://www.erlang.org/doc/apps/mnesia/mnesia.html#read/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/mnesia/src/mnesia.erl'
      },
      {
        functionName: 'write',
        module: 'mnesia',
        signature: 'mnesia:write(Record) -> ok',
        typesSpec: [
          'Record = tuple()'
        ],
        description: 'Writes Record into the table specified by element 1 of the record within the current transaction.',
        complexityNote: 'Buffers modification in the local transaction store.',
        officialUrl: 'https://www.erlang.org/doc/apps/mnesia/mnesia.html#write/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/mnesia/src/mnesia.erl'
      },
      {
        functionName: 'abort',
        module: 'mnesia',
        signature: 'mnesia:abort(Reason) -> no_return()',
        typesSpec: [
          'Reason = term()'
        ],
        description: 'Terminates the current transaction immediately, rolling back all buffered modifications and releasing locks.',
        complexityNote: 'O(1) instant rollback.',
        officialUrl: 'https://www.erlang.org/doc/apps/mnesia/mnesia.html#abort/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/mnesia/src/mnesia.erl'
      }
    ],
    mentalModelCheck: {
      question: 'What occurs when a fun passed to mnesia:transaction/1 calls mnesia:abort(insufficient_funds) after having already written to another table?',
      options: [
        {
          id: 'A',
          label: 'The writes already completed remain committed, while subsequent writes are cancelled.',
          isCorrect: false,
          explanation: 'Mnesia transactions are atomic; partial commits are never allowed.'
        },
        {
          id: 'B',
          label: 'Mnesia pauses the node and writes the error to crash.dump.',
          isCorrect: false,
          explanation: 'Aborting a transaction is a normal operational event and does not crash the BEAM node.'
        },
        {
          id: 'C',
          label: '100% of writes inside that transaction are discarded and rolled back; no table changes are committed.',
          isCorrect: true,
          explanation: 'Mnesia transactions provide full ACID atomicity. If mnesia:abort/1 is called or an unhandled exception occurs, all writes buffered during that transaction are discarded and rolled back.'
        },
        {
          id: 'D',
          label: 'The transaction retries indefinitely until sufficient funds are deposited.',
          isCorrect: false,
          explanation: 'Transactions only retry on transient lock conflicts, not on explicit mnesia:abort/1.'
        }
      ]
    },
    starterCode: `-module(mnesia_ledger).
-export([setup_mnesia_table/0, upsert_wallet/2, atomic_transfer/3, get_wallet_balance/1]).

-record(wallet, {owner, balance}).

%% @doc Start Mnesia and ensure the ram_copies wallet table exists and is ready.
setup_mnesia_table() ->
    _ = #wallet{},
    ok.

%% @doc Write or update Owner's wallet Balance inside a Mnesia transaction.
upsert_wallet(_Owner, _Balance) ->
    ok.

%% @doc Atomically transfer positive Amount from FromOwner to ToOwner with abort rollback.
atomic_transfer(_FromOwner, _ToOwner, _Amount) ->
    ok.

%% @doc Look up Owner's balance in Mnesia, returning {ok, Balance} or {error, not_found}.
get_wallet_balance(_Owner) ->
    ok.
`,
    solutionCode: `-module(mnesia_ledger).
-export([setup_mnesia_table/0, upsert_wallet/2, atomic_transfer/3, get_wallet_balance/1]).

-record(wallet, {owner, balance}).

%% @doc Start Mnesia and ensure the ram_copies wallet table exists and is ready.
setup_mnesia_table() ->
    mnesia:start(),
    case mnesia:create_table(wallet, [
        {attributes, record_info(fields, wallet)},
        {ram_copies, [node()]}
    ]) of
        {atomic, ok} -> ok;
        {aborted, {already_exists, wallet}} -> ok
    end,
    ok = mnesia:wait_for_tables([wallet], 2000),
    ok.

%% @doc Write or update Owner's wallet Balance inside a Mnesia transaction.
upsert_wallet(Owner, Balance) ->
    Tx = fun() ->
        mnesia:write(#wallet{owner = Owner, balance = Balance})
    end,
    case mnesia:transaction(Tx) of
        {atomic, ok} -> ok;
        {aborted, Reason} -> {error, Reason}
    end.

%% @doc Atomically transfer positive Amount from FromOwner to ToOwner with abort rollback.
atomic_transfer(FromOwner, ToOwner, Amount) when Amount > 0 ->
    Tx = fun() ->
        FromBal = case mnesia:read(wallet, FromOwner) of
            [#wallet{balance = FB}] -> FB;
            [] -> mnesia:abort(account_not_found)
        end,
        ToBal = case mnesia:read(wallet, ToOwner) of
            [#wallet{balance = TB}] -> TB;
            [] -> mnesia:abort(account_not_found)
        end,
        case FromBal >= Amount of
            true ->
                mnesia:write(#wallet{owner = FromOwner, balance = FromBal - Amount}),
                mnesia:write(#wallet{owner = ToOwner, balance = ToBal + Amount}),
                {FromBal - Amount, ToBal + Amount};
            false ->
                mnesia:abort(insufficient_funds)
        end
    end,
    case mnesia:transaction(Tx) of
        {atomic, {NewFrom, NewTo}} -> {ok, NewFrom, NewTo};
        {aborted, Reason} -> {error, Reason}
    end.

%% @doc Look up Owner's balance in Mnesia, returning {ok, Balance} or {error, not_found}.
get_wallet_balance(Owner) ->
    Tx = fun() ->
        case mnesia:read(wallet, Owner) of
            [#wallet{balance = Bal}] -> {ok, Bal};
            [] -> {error, not_found}
        end
    end,
    case mnesia:transaction(Tx) of
        {atomic, Result} -> Result;
        {aborted, Reason} -> {error, Reason}
    end.
`,
    files: [
      {
        name: 'mnesia_ledger.erl',
        path: 'src/mnesia_ledger.erl',
        content: `-module(mnesia_ledger).
-export([setup_mnesia_table/0, upsert_wallet/2, atomic_transfer/3, get_wallet_balance/1]).

-record(wallet, {owner, balance}).

%% @doc Start Mnesia and ensure the ram_copies wallet table exists and is ready.
setup_mnesia_table() ->
    _ = #wallet{},
    ok.

%% @doc Write or update Owner's wallet Balance inside a Mnesia transaction.
upsert_wallet(_Owner, _Balance) ->
    ok.

%% @doc Atomically transfer positive Amount from FromOwner to ToOwner with abort rollback.
atomic_transfer(_FromOwner, _ToOwner, _Amount) ->
    ok.

%% @doc Look up Owner's balance in Mnesia, returning {ok, Balance} or {error, not_found}.
get_wallet_balance(_Owner) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/mnesia_ledger.erl': `-module(mnesia_ledger).
-export([setup_mnesia_table/0, upsert_wallet/2, atomic_transfer/3, get_wallet_balance/1]).

-record(wallet, {owner, balance}).

%% @doc Start Mnesia and ensure the ram_copies wallet table exists and is ready.
setup_mnesia_table() ->
    mnesia:start(),
    case mnesia:create_table(wallet, [
        {attributes, record_info(fields, wallet)},
        {ram_copies, [node()]}
    ]) of
        {atomic, ok} -> ok;
        {aborted, {already_exists, wallet}} -> ok
    end,
    ok = mnesia:wait_for_tables([wallet], 2000),
    ok.

%% @doc Write or update Owner's wallet Balance inside a Mnesia transaction.
upsert_wallet(Owner, Balance) ->
    Tx = fun() ->
        mnesia:write(#wallet{owner = Owner, balance = Balance})
    end,
    case mnesia:transaction(Tx) of
        {atomic, ok} -> ok;
        {aborted, Reason} -> {error, Reason}
    end.

%% @doc Atomically transfer positive Amount from FromOwner to ToOwner with abort rollback.
atomic_transfer(FromOwner, ToOwner, Amount) when Amount > 0 ->
    Tx = fun() ->
        FromBal = case mnesia:read(wallet, FromOwner) of
            [#wallet{balance = FB}] -> FB;
            [] -> mnesia:abort(account_not_found)
        end,
        ToBal = case mnesia:read(wallet, ToOwner) of
            [#wallet{balance = TB}] -> TB;
            [] -> mnesia:abort(account_not_found)
        end,
        case FromBal >= Amount of
            true ->
                mnesia:write(#wallet{owner = FromOwner, balance = FromBal - Amount}),
                mnesia:write(#wallet{owner = ToOwner, balance = ToBal + Amount}),
                {FromBal - Amount, ToBal + Amount};
            false ->
                mnesia:abort(insufficient_funds)
        end
    end,
    case mnesia:transaction(Tx) of
        {atomic, {NewFrom, NewTo}} -> {ok, NewFrom, NewTo};
        {aborted, Reason} -> {error, Reason}
    end.

%% @doc Look up Owner's balance in Mnesia, returning {ok, Balance} or {error, not_found}.
get_wallet_balance(Owner) ->
    Tx = fun() ->
        case mnesia:read(wallet, Owner) of
            [#wallet{balance = Bal}] -> {ok, Bal};
            [] -> {error, not_found}
        end
    end,
    case mnesia:transaction(Tx) of
        {atomic, Result} -> Result;
        {aborted, Reason} -> {error, Reason}
    end.
`,
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Atomic Transfer Between Wallets',
        erlangCall: 'begin ok = mnesia_ledger:setup_mnesia_table(), ok = mnesia_ledger:upsert_wallet(alice, 100), ok = mnesia_ledger:upsert_wallet(bob, 50), {ok, 60, 90} = mnesia_ledger:atomic_transfer(alice, bob, 40), mnesia_ledger:get_wallet_balance(alice) end',
        expectedOutput: '{ok, 60}',
        explanation: 'Tests setting up accounts, atomic debit/credit, and balance retrieval.'
      },
      {
        id: 'tc2',
        title: 'Overdraft Rollback Invariant',
        erlangCall: 'begin ok = mnesia_ledger:setup_mnesia_table(), ok = mnesia_ledger:upsert_wallet(alice, 60), ok = mnesia_ledger:upsert_wallet(bob, 90), {error, insufficient_funds} = mnesia_ledger:atomic_transfer(alice, bob, 500), {mnesia_ledger:get_wallet_balance(alice), mnesia_ledger:get_wallet_balance(bob)} end',
        expectedOutput: '{{ok, 60}, {ok, 90}}',
        explanation: 'Verifies that aborting on insufficient funds rolls back all changes completely.'
      }
    ],
    astRules: {
      requiredConstructs: ['record_def'],
      requiredCalls: ['mnesia:transaction/1', 'mnesia:read/2', 'mnesia:write/1', 'mnesia:abort/1']
    },
    solutionExplanation: 'Implements an atomic wallet ledger using Mnesia transactions with strict abort rollback semantics.',
  },

  // ── Lesson 9.6: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch09-l06',
    chapterNumber: 9,
    lessonNumber: 6,
    lessonType: 'concept_exercise',
    title: 'Production QA: EUnit Test Generators (?_assertEqual) & Dialyzer Specs',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In mission-critical BEAM architectures, dynamic typing gives rapid iteration and hot-code loading, yet payment engines and telecom switches still require hard guarantees that invalid inputs cannot slip into production unnoticed.

The Erlang/OTP toolchain enforces correctness with a two-layer QA pipeline:
1. **Dialyzer (\`-type\` & \`-spec\`)**: Static **Success Typing** analyzer that inspects BEAM Core Erlang bytecode without executing code. Whenever it can prove a call or return path breaches a declared contract, Dialyzer rejects the build at CI time.
2. **EUnit (\`-include_lib("eunit/include/eunit.hrl").\`)**: OTP's built-in unit testing framework supporting eager assertions (\`?assertEqual\`, \`?assertMatch\`, \`?assertError\`) and lazy test generators (\`*_test_()\`) driven programmatically via \`eunit:test/2\`.

> [!NOTE]
> **Static vs. Runtime Assurance:** Dialyzer catches structural type mismatches and unreachable clauses statically across all call graphs, while EUnit verifies concrete arithmetic and domain business rules at runtime.

## Deep Concept Breakdown & Under the Hood

### 1. Defining Custom Union Types & \`-spec\` Contracts

You declare domain unions with \`-type\` and document function signatures above function heads with \`-spec\`:

\`\`\`erlang
-type priority() :: low | normal | high.

-spec sla_minutes(pos_integer(), priority()) -> pos_integer().
sla_minutes(Base, low)    -> Base * 4;
sla_minutes(Base, normal) -> Base * 2;
sla_minutes(Base, high)   -> Base.
\`\`\`

Notice that \`priority()\` restricts the allowed atoms statically: if another module calls \`sla_minutes(15, urgent)\`, Dialyzer immediately reports that \`urgent\` violates the contract even if that branch hasn't executed in tests yet.

### 2. Immediate Macros vs. Test Generators in EUnit

Including \`-include_lib("eunit/include/eunit.hrl").\` provides two styles of checks:
- **Immediate Assertion (\`?assertEqual(Expect, Expr)\`)**: Evaluates \`Expr\` immediately and checks exact Erlang identity (\`=:=\`).
- **Test Generator (\`*_test_()\`)**: Any zero-arity function whose name ends in \`_test_\` returns a list of delayed test objects built with underscore-prefixed macros (\`?_assertEqual(Expect, Expr)\`, \`?_assertMatch(Pattern, Expr)\`). EUnit wraps each generator item in an isolated execution context and reports failures line-by-line when invoked via \`eunit:test(?MODULE, [quiet])\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official EUnit Functions & Macros (stdlib / eunit)
eunit:test(Tests, Options) -> ok | error
  Types:
    Tests = module() | [module()] | test_representation()
    Options = [quiet | verbose]

%% EUnit Header Macros (-include_lib("eunit/include/eunit.hrl").)
?assertEqual(Expect, Expr)   %% Eager exact-match (=:=) assertion
?assertMatch(Pattern, Expr)  %% Eager pattern assertion
?assertError(Reason, Expr)   %% Eager error exception assertion
?_assertEqual(Expect, Expr)  %% Lazy generator test object (=:=)
?_assertMatch(Pattern, Expr) %% Lazy generator pattern object
\`\`\`

Refer to the attached documentation cards below for macro identity semantics and runner options.

## Parallel Worked Example: Network QoS Burst Contract

Consider a separate domain: a traffic-shaper module (\`bandwidth_tier_qa\`) validating QoS tier reservations with Dialyzer union types, multi-clause guards, an EUnit generator \`flow_suite_test_()\`, and a quiet runner \`verify_suite/0\`:

\`\`\`erlang
-module(bandwidth_tier_qa).
-include_lib("eunit/include/eunit.hrl").

-export([reserve_mbps/2, admit_flow/3, verify_suite/0]).

-type link_tier() :: bronze | silver | gold.

%% @doc Return burst headroom Mbps granted for BaseMbps at a given QoS link tier.
-spec reserve_mbps(pos_integer(), link_tier()) -> non_neg_integer().
reserve_mbps(BaseMbps, bronze) when BaseMbps > 0 -> BaseMbps div 10;
reserve_mbps(BaseMbps, silver) when BaseMbps > 0 -> BaseMbps div 4;
reserve_mbps(BaseMbps, gold)   when BaseMbps > 0 -> BaseMbps div 2.

%% @doc Validate Requested Mbps plus burst reservation against AvailableMbps capacity.
-spec admit_flow(non_neg_integer(), integer(), link_tier()) ->
    {ok, non_neg_integer()} | {error, bad_rate | capacity_full}.
admit_flow(_AvailableMbps, Requested, _Tier) when Requested =< 0 ->
    {error, bad_rate};
admit_flow(AvailableMbps, Requested, Tier) when AvailableMbps >= 0, Requested > 0 ->
    Reserved = Requested + reserve_mbps(Requested, Tier),
    case AvailableMbps >= Reserved of
        true  -> {ok, AvailableMbps - Reserved};
        false -> {error, capacity_full}
    end.

flow_suite_test_() ->
    [
        ?_assertEqual(10, reserve_mbps(100, bronze)),
        ?_assertEqual(25, reserve_mbps(100, silver)),
        ?_assertEqual(50, reserve_mbps(100, gold)),
        ?_assertEqual({ok, 390}, admit_flow(500, 100, bronze)),
        ?_assertEqual({error, capacity_full}, admit_flow(50, 100, gold)),
        ?_assertEqual({error, bad_rate}, admit_flow(500, 0, silver))
    ].

%% @doc Execute the embedded EUnit generator suite and normalize status.
verify_suite() ->
    case eunit:test(?MODULE, [quiet]) of
        ok -> ok;
        error -> {error, suite_failed}
    end.
\`\`\`

### What OTP Does at Compilation & Test Time

- **Success-Typing Guard Contracts**: Both \`reserve_mbps/2\` and \`admit_flow/3\` declare explicit \`-spec\` annotations referencing the closed union \`link_tier()\`, letting Dialyzer verify callers statically while \`when\` guards enforce runtime numeric bounds.
- **Lazy Test Generators (\`?_assertEqual\`)**: Prefixing \`?\` with an underscore wraps each assertion inside a zero-arity fun; EUnit collects all 6 tests returned by \`flow_suite_test_()\` automatically when \`eunit:test(?MODULE, [quiet])\` runs—even though \`flow_suite_test_/0\` does not need to be manually listed in user API docs beyond EUnit's header export rule.

## Assignment Specification

Implement module \`src/ledger_specs_and_tests.erl\` including EUnit's standard header, declaring a custom \`currency()\` union type covering \`usd\`, \`eur\`, and \`etb\` with Dialyzer \`-spec\` annotations, and exporting \`calculate_fee/2\`, \`validate_transfer_spec/3\`, \`run_unit_checks/0\`, and \`run_unit_tests/0\`.

### \`calculate_fee/2\`
- **Input**: Positive integer \`Amount\`, \`currency()\` atom (\`usd\`, \`eur\`, or \`etb\`).
- **Behavior**: Declared with a Dialyzer spec accepting a positive integer and \`currency()\` and returning a non-negative integer. Computes integer division fees using \`div 1000\`: \`1.5%\` (factor \`15\`) for \`usd\`, \`2.0%\` (factor \`20\`) for \`eur\`, and \`1.0%\` (factor \`10\`) for \`etb\`.
- **Examples**:
  - \`ledger_specs_and_tests:calculate_fee(1000, usd)\` returns \`15\`.
  - \`ledger_specs_and_tests:calculate_fee(1000, eur)\` returns \`20\`.
  - \`ledger_specs_and_tests:calculate_fee(1000, etb)\` returns \`10\`.

### \`validate_transfer_spec/3\`
- **Input**: Non-negative integer \`Balance\`, integer \`Amount\`, \`currency()\` atom.
- **Behavior**: Declared with a Dialyzer spec returning either an \`ok\`-tagged non-negative remaining balance or an \`error\` tuple tagged \`invalid_amount\` or \`insufficient_funds\`. Rejects non-positive \`Amount\` with \`{error, invalid_amount}\`; otherwise sums \`Amount\` plus \`calculate_fee(Amount, Currency)\`, returning \`{error, insufficient_funds}\` if \`Balance\` is smaller or \`{ok, Remaining}\` with the fee-adjusted remainder.
- **Examples**:
  - \`ledger_specs_and_tests:validate_transfer_spec(1000, 500, usd)\` returns \`{ok, 493}\` (500 + 7 fee deducted).
  - \`ledger_specs_and_tests:validate_transfer_spec(100, 200, usd)\` returns \`{error, insufficient_funds}\`.
  - \`ledger_specs_and_tests:validate_transfer_spec(100, -5, usd)\` returns \`{error, invalid_amount}\`.

### \`run_unit_checks/0\` and \`run_unit_tests/0\`
- **Input**: None.
- **Behavior**: Executes embedded EUnit generator tests (\`*_test_()\`) verifying fee math, successful transfer deductions, insufficient-funds rejections, and invalid-amount rejections quietly via \`eunit:test/2\`, returning \`ok\` when all unit checks pass. \`run_unit_tests/0\` delegates cleanly to \`run_unit_checks/0\`.
- **Examples**:
  - \`ledger_specs_and_tests:run_unit_checks()\` returns \`ok\`.

## Rules & Verification Constraints

- **Required Header & Specs**: Must include \`-include_lib("eunit/include/eunit.hrl").\` and declare \`-type\` and \`-spec\` contracts for \`calculate_fee/2\` and \`validate_transfer_spec/3\`.
- **Required Remote Call**: \`astRules\` checks \`eunit:test/2\` execution inside the module's test runner.
`,
    otpDocCards: [
      {
        functionName: 'test',
        module: 'eunit',
        signature: 'eunit:test(Tests, Options) -> ok | error',
        typesSpec: [
          'Tests = module() | test_representation()',
          'Options = [quiet | verbose]'
        ],
        description: 'Executes all EUnit tests and test generators found in the target module with the specified output options.',
        complexityNote: 'Runs each test/generator sequentially in isolated test processes.',
        officialUrl: 'https://www.erlang.org/doc/apps/eunit/eunit.html#test/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/eunit/src/eunit.erl'
      },
      {
        functionName: 'assert',
        module: 'eunit',
        signature: '?assertEqual(Expect, Expr)',
        typesSpec: [
          'Expect = term()',
          'Expr = term()'
        ],
        description: 'EUnit assertion macro checking that Expr evaluates to Expect using exact term identity (=:=).',
        complexityNote: 'Compile-time macro expansion.',
        officialUrl: 'https://www.erlang.org/doc/apps/eunit/index.html',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/eunit/src/eunit.erl'
      }
    ],
    mentalModelCheck: {
      question: 'How does Dialyzer success typing differ from traditional static type checkers (like Rust or TypeScript)?',
      options: [
        {
          id: 'A',
          label: 'Dialyzer requires 100% of variables to have explicit type annotations before compilation.',
          isCorrect: false,
          explanation: 'Dialyzer infers success types automatically even with zero annotations.'
        },
        {
          id: 'B',
          label: 'Dialyzer assumes all code is correct by default and only complains when it can mathematically prove that a function call will always fail.',
          isCorrect: true,
          explanation: 'Success typing works under the assumption that code is correct unless proven otherwise. Dialyzer only flags an error when it has mathematical certainty that a branch or call will always crash.'
        },
        {
          id: 'C',
          label: 'Dialyzer converts Erlang code into C++ before analyzing memory pointers.',
          isCorrect: false,
          explanation: 'Dialyzer analyzes BEAM Core Erlang bytecode directly.'
        },
        {
          id: 'D',
          label: 'Dialyzer runs tests with random mock inputs to observe crashes at runtime.',
          isCorrect: false,
          explanation: 'Dialyzer is a purely static analyzer; it never executes code.'
        }
      ]
    },
    starterCode: `-module(ledger_specs_and_tests).
-include_lib("eunit/include/eunit.hrl").

-export([calculate_fee/2, validate_transfer_spec/3, run_unit_checks/0, run_unit_tests/0]).

%% @doc Calculate the integer transaction fee for Amount and supported Currency atom.
calculate_fee(_Amount, _Currency) ->
    ok.

%% @doc Validate Amount bounds, deduct Amount plus fee from Balance, and return the remainder or error.
validate_transfer_spec(_Balance, _Amount, _Currency) ->
    ok.

%% @doc Execute all embedded EUnit generator tests for the ledger module and return ok on pass.
run_unit_checks() ->
    ok.

%% @doc Alias executing the embedded EUnit suite via run_unit_checks/0.
run_unit_tests() ->
    ok.
`,
    solutionCode: `-module(ledger_specs_and_tests).
-include_lib("eunit/include/eunit.hrl").

-export([calculate_fee/2, validate_transfer_spec/3, run_unit_checks/0, run_unit_tests/0]).

-type currency() :: usd | eur | etb.

%% @doc Calculate the integer transaction fee for Amount and supported Currency atom.
-spec calculate_fee(pos_integer(), currency()) -> non_neg_integer().
calculate_fee(Amount, usd) when Amount > 0 -> (Amount * 15) div 1000;
calculate_fee(Amount, eur) when Amount > 0 -> (Amount * 20) div 1000;
calculate_fee(Amount, etb) when Amount > 0 -> (Amount * 10) div 1000.

%% @doc Validate Amount bounds, deduct Amount plus fee from Balance, and return the remainder or error.
-spec validate_transfer_spec(non_neg_integer(), integer(), currency()) ->
    {ok, non_neg_integer()} | {error, insufficient_funds | invalid_amount}.
validate_transfer_spec(_Balance, Amount, _Currency) when Amount =< 0 ->
    {error, invalid_amount};
validate_transfer_spec(Balance, Amount, Currency) when Balance >= 0, Amount > 0 ->
    Fee = calculate_fee(Amount, Currency),
    Total = Amount + Fee,
    case Balance >= Total of
        true -> {ok, Balance - Total};
        false -> {error, insufficient_funds}
    end.

fee_test_() ->
    [
        ?_assertEqual(15, calculate_fee(1000, usd)),
        ?_assertEqual(20, calculate_fee(1000, eur)),
        ?_assertEqual(10, calculate_fee(1000, etb))
    ].

transfer_test_() ->
    [
        ?_assertEqual({ok, 493}, validate_transfer_spec(1000, 500, usd)),
        ?_assertEqual({error, insufficient_funds}, validate_transfer_spec(100, 200, usd)),
        ?_assertEqual({error, invalid_amount}, validate_transfer_spec(100, -10, usd))
    ].

%% @doc Execute all embedded EUnit generator tests for the ledger module and return ok on pass.
run_unit_checks() ->
    case eunit:test(?MODULE, [quiet]) of
        ok -> ok;
        _ -> {error, tests_failed}
    end.

%% @doc Alias executing the embedded EUnit suite via run_unit_checks/0.
run_unit_tests() ->
    run_unit_checks().
`,
    files: [
      {
        name: 'ledger_specs_and_tests.erl',
        path: 'src/ledger_specs_and_tests.erl',
        content: `-module(ledger_specs_and_tests).
-include_lib("eunit/include/eunit.hrl").

-export([calculate_fee/2, validate_transfer_spec/3, run_unit_checks/0, run_unit_tests/0]).

%% @doc Calculate the integer transaction fee for Amount and supported Currency atom.
calculate_fee(_Amount, _Currency) ->
    ok.

%% @doc Validate Amount bounds, deduct Amount plus fee from Balance, and return the remainder or error.
validate_transfer_spec(_Balance, _Amount, _Currency) ->
    ok.

%% @doc Execute all embedded EUnit generator tests for the ledger module and return ok on pass.
run_unit_checks() ->
    ok.

%% @doc Alias executing the embedded EUnit suite via run_unit_checks/0.
run_unit_tests() ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/ledger_specs_and_tests.erl': `-module(ledger_specs_and_tests).
-include_lib("eunit/include/eunit.hrl").

-export([calculate_fee/2, validate_transfer_spec/3, run_unit_checks/0, run_unit_tests/0]).

-type currency() :: usd | eur | etb.

%% @doc Calculate the integer transaction fee for Amount and supported Currency atom.
-spec calculate_fee(pos_integer(), currency()) -> non_neg_integer().
calculate_fee(Amount, usd) when Amount > 0 -> (Amount * 15) div 1000;
calculate_fee(Amount, eur) when Amount > 0 -> (Amount * 20) div 1000;
calculate_fee(Amount, etb) when Amount > 0 -> (Amount * 10) div 1000.

%% @doc Validate Amount bounds, deduct Amount plus fee from Balance, and return the remainder or error.
-spec validate_transfer_spec(non_neg_integer(), integer(), currency()) ->
    {ok, non_neg_integer()} | {error, insufficient_funds | invalid_amount}.
validate_transfer_spec(_Balance, Amount, _Currency) when Amount =< 0 ->
    {error, invalid_amount};
validate_transfer_spec(Balance, Amount, Currency) when Balance >= 0, Amount > 0 ->
    Fee = calculate_fee(Amount, Currency),
    Total = Amount + Fee,
    case Balance >= Total of
        true -> {ok, Balance - Total};
        false -> {error, insufficient_funds}
    end.

fee_test_() ->
    [
        ?_assertEqual(15, calculate_fee(1000, usd)),
        ?_assertEqual(20, calculate_fee(1000, eur)),
        ?_assertEqual(10, calculate_fee(1000, etb))
    ].

transfer_test_() ->
    [
        ?_assertEqual({ok, 493}, validate_transfer_spec(1000, 500, usd)),
        ?_assertEqual({error, insufficient_funds}, validate_transfer_spec(100, 200, usd)),
        ?_assertEqual({error, invalid_amount}, validate_transfer_spec(100, -10, usd))
    ].

%% @doc Execute all embedded EUnit generator tests for the ledger module and return ok on pass.
run_unit_checks() ->
    case eunit:test(?MODULE, [quiet]) of
        ok -> ok;
        _ -> {error, tests_failed}
    end.

%% @doc Alias executing the embedded EUnit suite via run_unit_checks/0.
run_unit_tests() ->
    run_unit_checks().
`,
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Fee Calculation and Transfer Validation',
        erlangCall: 'begin Fee = ledger_specs_and_tests:calculate_fee(1000, usd), {ok, Rem} = ledger_specs_and_tests:validate_transfer_spec(1000, 500, usd), {Fee, Rem} end',
        expectedOutput: '{15, 493}',
        explanation: 'Tests fee calculation (1.5%) and balance deduction.'
      },
      {
        id: 'tc2',
        title: 'Run Built-in EUnit Test Suite',
        erlangCall: 'ledger_specs_and_tests:run_unit_checks()',
        expectedOutput: 'ok',
        explanation: 'Executes EUnit test generator suites and confirms all assertions pass.'
      }
    ],
    astRules: {
      requiredCalls: ['eunit:test/2']
    },
    solutionExplanation: 'Combines Dialyzer type specs with EUnit assertions and test generators to provide static and runtime quality assurance.',
  },

  // ── Lesson 9.7: Production Incident Triage #105 ───────────────────────────
  {
    id: 'ch09-l07',
    chapterNumber: 9,
    lessonNumber: 7,
    lessonType: 'incident_triage',
    title: 'Incident #105: ETS Session Wipeout When Cache Worker Crashes',
    difficulty: 'Production',
    xpReward: 175,
    visualScene: 'supervision_rest_for_one_ets_heir',
    incidentAlert: {
      incidentId: 'INC-105',
      severity: 'CRITICAL',
      serviceName: 'ets-session-cache',
      symptom: 'Whenever a malformed request crashes the session cache worker, all 250,000 active sessions vanish simultaneously and every user is forced to re-authenticate.',
      rootCauseHint: 'src/incident_ets_wipeout.erl allocates the session table without designating an heir guardian process, and its table-transfer helper returns ok without transferring table ownership.',
      fixObjective: 'Configure the session table created in create_session_table/1 to transfer ownership with tag keep_alive to HeirPid on owner exit, and complete ownership restitution inside transfer_to_restarted_worker/3.'
    },
    conceptMarkdown: `## Why This Matters in Production

At 14:22 UTC, an unhandled binary parsing exception crashed our authentication session cache worker. Although the OTP supervisor restarted a replacement worker in **1.8 milliseconds**, all **250,000 active user sessions vanished from RAM**, triggering an instant global logout storm.

In the BEAM VM, an ETS table is **strictly tied to the lifetime of its owner process**—not its supervisor or node. Unless a table designates a living heir process before the owner exits, ERTS destroys the table and reclaims its off-heap memory the microsecond the worker dies. Trace the recovery handshake in the visual scene below.

## Deep Concept Breakdown & Under the Hood

### 1. Owner Termination vs. Designated Heir Survival

When a process calls \`ets:new(Name, Options)\`, ERTS records that PID as the table owner:
- Without an heir option, any normal or abnormal exit of the owner immediately deletes the table.
- With an heir option pairing a guardian \`HeirPid\` and an arbitrary term tag \`HeirData\`, ERTS atomically swaps ownership in off-heap C memory to \`HeirPid\` upon owner death and enqueues \`{'ETS-TRANSFER', Tab, FormerOwnerPid, HeirData}\` in \`HeirPid\`'s mailbox.

### 2. Returning Ownership to a Restarted Worker

After the supervisor spawns a fresh worker process, the heir hands custody back in $O(1)$ time with zero row copying by calling \`ets:give_away/3\`. ERTS transfers ownership to \`NewWorkerPid\` and delivers \`{'ETS-TRANSFER', Tab, HeirPid, GiftData}\` to the new owner's mailbox so it owns the table going forward.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official ETS Ownership & Failover Calls (stdlib / ets)
ets:new(Name, Options) -> tid() | atom()
  Types:
    Name = atom()
    Options = [set | public | {read_concurrency, boolean()} | {heir, pid() | none, HeirData :: term()}]

ets:give_away(Tab, Pid, GiftData) -> true
  Types:
    Tab = tid() | atom()
    Pid = pid()
    GiftData = term()
\`\`\`

Consult the attached documentation card below for \`ets:give_away/3\` transfer semantics and complexity.

## Parallel Worked Example: Resilient Ring-Buffer Metrics Cache

Consider a separate domain: an \`ordered_set\` metrics ring-buffer cache (\`metrics_ring_heir\`) whose worker registers a collector process as heir with tag \`ring_backup\` and hands ownership to a replacement collector upon restart:

\`\`\`erlang
-module(metrics_ring_heir).
-export([open_ring/1, handoff_ring/3, run_collector/0]).

%% @doc Create a public ordered_set ring table backed by CollectorHeir.
open_ring(CollectorHeir) ->
    ets:new(metrics_ring, [
        ordered_set,
        public,
        {write_concurrency, true},
        {heir, CollectorHeir, ring_backup}
    ]).

%% @doc Transfer ownership of RingTab to NextWorkerPid with a handoff tag.
handoff_ring(RingTab, NextWorkerPid, Tag) ->
    ets:give_away(RingTab, NextWorkerPid, Tag),
    ok.

%% @doc Minimal heir actor receiving failover ownership and executing handoff.
run_collector() ->
    receive
        {'ETS-TRANSFER', RingTab, _CrashedPid, ring_backup} ->
            receive
                {handover_to, NewPid, AckPid} ->
                    ok = handoff_ring(RingTab, NewPid, handoff_ok),
                    AckPid ! ring_restored
            end;
        stop ->
            ok
    end.
\`\`\`

### What ERTS Does at Runtime

- **Heir Protection at Creation**: \`open_ring/1\` passes \`{heir, CollectorHeir, ring_backup}\` inside \`ets:new/2\`; if the creating worker dies after inserting metrics, ERTS skips table deletion and sends \`{'ETS-TRANSFER', RingTab, CrashedPid, ring_backup}\` to \`CollectorHeir\`.
- **Zero-Copy Handover**: \`handoff_ring/3\` calls \`ets:give_away(RingTab, NextWorkerPid, Tag)\`, flipping ownership directly inside ERTS so \`NextWorkerPid\` inherits all accumulated metrics without rebuilding or copying rows.

## Assignment Specification

Repair the two production defects inside \`src/incident_ets_wipeout.erl\` without modifying the pre-wired session helpers or test harness functions (\`store_session/3\`, \`put_session/3\`, \`fetch_session/2\`, \`get_session/2\`, \`transfer_to_restarted_worker/2\`, \`audit_table_heir/0\`, \`test_heir_handover/0\`).

### \`create_session_table/1\`
- **Input**: Guardian process identifier \`HeirPid\`.
- **Behavior**: Allocates the public \`set\` ETS table \`incident_sessions_tab\` with concurrent reads enabled, and binds \`HeirPid\` as the table's heir using heirloom tag \`keep_alive\`. Returns the allocated table identifier.
- **Examples**:
  - \`incident_ets_wipeout:audit_table_heir()\` confirms the table's registered heir equals the spawned guardian PID and returns \`{ok, heir_configured}\`.

### \`transfer_to_restarted_worker/3\`
- **Input**: Table identifier \`Tab\`, restarted worker PID \`NewWorkerPid\`, transfer tag term \`GiftData\`.
- **Behavior**: Transfers legal ownership of \`Tab\` from the current owner (the heir) to \`NewWorkerPid\` with \`GiftData\` using OTP's zero-copy table giveaway primitive, returning \`ok\`. Notice that \`transfer_to_restarted_worker/2\` delegates directly to this 3-arity function with default tag \`keep_alive\`.
- **Examples**:
  - \`incident_ets_wipeout:test_heir_handover()\` inserts 3 sessions, crashes the creator worker, catches the failover transfer in the heir, transfers custody via \`transfer_to_restarted_worker/3\`, verifies all 3 sessions remain readable by the new worker, and returns \`{ok, 3, survived}\`.

## Rules & Verification Constraints

- **Required Primitives**: \`ets:new/2\` must register \`{heir, HeirPid, keep_alive}\` and \`transfer_to_restarted_worker/3\` must call \`ets:give_away/3\`.
- **Zero-Loss Failover**: Crashing the table creator mid-session must preserve 100% of stored entries across heir capture and worker restitution.
`,
    otpDocCards: [
      {
        functionName: 'new',
        module: 'ets',
        signature: 'ets:new(Name, Options) -> tid() | atom()',
        typesSpec: [
          'Name = atom()',
          'Options = [set | public | {read_concurrency, boolean()} | {heir, pid() | none, term()}]'
        ],
        description: 'Creates a new ETS table owned by the calling process, optionally designating an heir process to adopt the table if the owner terminates.',
        complexityNote: 'O(1) table allocation in ERTS off-heap memory.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#new/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      },
      {
        functionName: 'give_away',
        module: 'ets',
        signature: 'ets:give_away(Tab, Pid, GiftData) -> true',
        typesSpec: ['Tab = tab()', 'Pid = pid()', 'GiftData = term()'],
        description: 'Changes the owner of table Tab to Pid. The new owner receives an {\'ETS-TRANSFER\', Tab, FromPid, GiftData} message.',
        complexityNote: 'O(1) pointer transfer in the ETS registry.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#give_away/3',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      }
    ],
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Table Options Heir Audit',
        erlangCall: 'incident_ets_wipeout:audit_table_heir()',
        expectedOutput: '{ok, heir_configured}',
        explanation: 'Audits ets:info(Tab, heir) verifying that HeirPid is registered with keep_alive.'
      },
      {
        id: 'tc2',
        title: 'Heir Transfer Survival & Restitution',
        erlangCall: 'incident_ets_wipeout:test_heir_handover()',
        expectedOutput: '{ok, 3, survived}',
        explanation: 'Stores 3 sessions, crashes worker; heir receives table, gives away to new worker, and confirms all 3 sessions survived.'
      }
    ],
    astRules: {
      requiredCalls: ['ets:new/2', 'ets:give_away/3']
    },
    mentalModelCheck: {
      question: 'When an owning worker crashes, what message does the designated heir process receive in its mailbox from ERTS?',
      options: [
        {
          id: 'A',
          label: "{\'EXIT\', WorkerPid, killed}",
          isCorrect: false,
          explanation: 'Exit signals are sent to linked processes when trapping exits, not the ETS transfer message.'
        },
        {
          id: 'B',
          label: "{\'ETS-TRANSFER\', TableId, DeadOwnerPid, HeirData}",
          isCorrect: true,
          explanation: 'ERTS automatically delivers {\'ETS-TRANSFER\', TableId, DeadOwnerPid, HeirData} to the heir process mailbox, transferring legal ownership without deleting table rows.'
        },
        {
          id: 'C',
          label: '{reclaim_cache, TableId}',
          isCorrect: false,
          explanation: 'This is not an ERTS system message.'
        },
        {
          id: 'D',
          label: "{\'DOWN\', Ref, process, WorkerPid, crash}",
          isCorrect: false,
          explanation: 'DOWN messages are sent by process monitors, not the ETS heir mechanism.'
        }
      ]
    },
    starterCode: `-module(incident_ets_wipeout).
-export([create_session_table/1, store_session/3, put_session/3, fetch_session/2, get_session/2]).
-export([transfer_to_restarted_worker/2, transfer_to_restarted_worker/3]).
-export([audit_table_heir/0, test_heir_handover/0]).

%% @doc Create the public ETS session cache table and designate HeirPid as its failover heir.
create_session_table(_HeirPid) ->
    ets:new(incident_sessions_tab, [set, public, {read_concurrency, true}]).

%% @doc Insert or update a timestamped user session record in Tab.
store_session(Tab, SessionId, UserId) ->
    ets:insert(Tab, {SessionId, UserId, os:system_time(millisecond)}),
    ok.

%% @doc Alias delegating session insertion to store_session/3.
put_session(Tab, SessionId, UserId) ->
    store_session(Tab, SessionId, UserId).

%% @doc Look up UserId for SessionId in Tab, returning {ok, UserId} or {error, not_found}.
fetch_session(Tab, SessionId) ->
    case ets:lookup(Tab, SessionId) of
        [{SessionId, UserId, _Time}] -> {ok, UserId};
        [] -> {error, not_found}
    end.

%% @doc Alias delegating session lookup to fetch_session/2.
get_session(Tab, SessionId) ->
    fetch_session(Tab, SessionId).

%% @doc Transfer ownership of Tab to NewWorkerPid with default keep_alive gift data.
transfer_to_restarted_worker(Tab, NewWorkerPid) ->
    transfer_to_restarted_worker(Tab, NewWorkerPid, keep_alive).

%% @doc Transfer ownership of Tab to NewWorkerPid attaching GiftData and return ok.
transfer_to_restarted_worker(_Tab, _NewWorkerPid, _GiftData) ->
    ok.

%% @doc Verify that create_session_table/1 attaches the supplied guardian PID as heir.
audit_table_heir() ->
    HeirPid = spawn(fun() -> receive stop -> ok end end),
    Tab = create_session_table(HeirPid),
    HeirInfo = ets:info(Tab, heir),
    HeirPid ! stop,
    ets:delete(Tab),
    case HeirInfo of
        HeirPid -> {ok, heir_configured};
        _ -> {error, {bad_heir, HeirInfo}}
    end.

%% @doc Run an end-to-end crash simulation verifying session survival across heir handover.
test_heir_handover() ->
    Parent = self(),
    Heir = spawn(fun() ->
        receive
            {'ETS-TRANSFER', Tab, _OldOwner, keep_alive} ->
                Parent ! {heir_got_table, Tab},
                receive
                    {give_to, NewWorker} ->
                        transfer_to_restarted_worker(Tab, NewWorker, restored),
                        Parent ! giveaway_done
                after 500 ->
                    ets:delete(Tab)
                end
        after 300 ->
            Parent ! {error, heir_timeout}
        end
    end),
    Worker = spawn(fun() ->
        Tab = create_session_table(Heir),
        store_session(Tab, <<"sess_1">>, 101),
        store_session(Tab, <<"sess_2">>, 102),
        store_session(Tab, <<"sess_3">>, 103),
        Parent ! {worker_ready, Tab},
        receive die -> exit(simulated_crash) end
    end),
    Tab = receive {worker_ready, RecvTab} -> RecvTab end,
    Worker ! die,
    receive
        {heir_got_table, Tab} ->
            NewWorker = spawn(fun() ->
                receive
                    {'ETS-TRANSFER', NTab, _Heir, restored} ->
                        {ok, U1} = fetch_session(NTab, <<"sess_1">>),
                        {ok, U2} = fetch_session(NTab, <<"sess_2">>),
                        {ok, U3} = fetch_session(NTab, <<"sess_3">>),
                        Parent ! {new_worker_verified, [U1, U2, U3]},
                        ets:delete(NTab)
                after 500 ->
                    ok
                end
            end),
            Heir ! {give_to, NewWorker},
            receive
                giveaway_done ->
                    receive
                        {new_worker_verified, [101, 102, 103]} -> {ok, 3, survived}
                    after 500 ->
                        {error, survival_test_failed}
                    end
            after 500 ->
                {error, survival_test_failed}
            end;
        {error, heir_timeout} ->
            {error, heir_timeout}
    after 500 ->
        {error, heir_timeout}
    end.
`,
    solutionCode: `-module(incident_ets_wipeout).
-export([create_session_table/1, store_session/3, put_session/3, fetch_session/2, get_session/2]).
-export([transfer_to_restarted_worker/2, transfer_to_restarted_worker/3]).
-export([audit_table_heir/0, test_heir_handover/0]).

%% @doc Create the public ETS session cache table and designate HeirPid as its failover heir.
create_session_table(HeirPid) ->
    ets:new(incident_sessions_tab, [
        set,
        public,
        {read_concurrency, true},
        {heir, HeirPid, keep_alive}
    ]).

%% @doc Insert or update a timestamped user session record in Tab.
store_session(Tab, SessionId, UserId) ->
    ets:insert(Tab, {SessionId, UserId, os:system_time(millisecond)}),
    ok.

%% @doc Alias delegating session insertion to store_session/3.
put_session(Tab, SessionId, UserId) ->
    store_session(Tab, SessionId, UserId).

%% @doc Look up UserId for SessionId in Tab, returning {ok, UserId} or {error, not_found}.
fetch_session(Tab, SessionId) ->
    case ets:lookup(Tab, SessionId) of
        [{SessionId, UserId, _Time}] -> {ok, UserId};
        [] -> {error, not_found}
    end.

%% @doc Alias delegating session lookup to fetch_session/2.
get_session(Tab, SessionId) ->
    fetch_session(Tab, SessionId).

%% @doc Transfer ownership of Tab to NewWorkerPid with default keep_alive gift data.
transfer_to_restarted_worker(Tab, NewWorkerPid) ->
    transfer_to_restarted_worker(Tab, NewWorkerPid, keep_alive).

%% @doc Transfer ownership of Tab to NewWorkerPid attaching GiftData and return ok.
transfer_to_restarted_worker(Tab, NewWorkerPid, GiftData) ->
    ets:give_away(Tab, NewWorkerPid, GiftData),
    ok.

%% @doc Verify that create_session_table/1 attaches the supplied guardian PID as heir.
audit_table_heir() ->
    HeirPid = spawn(fun() -> receive stop -> ok end end),
    Tab = create_session_table(HeirPid),
    HeirInfo = ets:info(Tab, heir),
    HeirPid ! stop,
    ets:delete(Tab),
    case HeirInfo of
        HeirPid -> {ok, heir_configured};
        _ -> {error, {bad_heir, HeirInfo}}
    end.

%% @doc Run an end-to-end crash simulation verifying session survival across heir handover.
test_heir_handover() ->
    Parent = self(),
    Heir = spawn(fun() ->
        receive
            {'ETS-TRANSFER', Tab, _OldOwner, keep_alive} ->
                Parent ! {heir_got_table, Tab},
                receive
                    {give_to, NewWorker} ->
                        transfer_to_restarted_worker(Tab, NewWorker, restored),
                        Parent ! giveaway_done
                after 500 ->
                    ets:delete(Tab)
                end
        after 300 ->
            Parent ! {error, heir_timeout}
        end
    end),
    Worker = spawn(fun() ->
        Tab = create_session_table(Heir),
        store_session(Tab, <<"sess_1">>, 101),
        store_session(Tab, <<"sess_2">>, 102),
        store_session(Tab, <<"sess_3">>, 103),
        Parent ! {worker_ready, Tab},
        receive die -> exit(simulated_crash) end
    end),
    Tab = receive {worker_ready, RecvTab} -> RecvTab end,
    Worker ! die,
    receive
        {heir_got_table, Tab} ->
            NewWorker = spawn(fun() ->
                receive
                    {'ETS-TRANSFER', NTab, _Heir, restored} ->
                        {ok, U1} = fetch_session(NTab, <<"sess_1">>),
                        {ok, U2} = fetch_session(NTab, <<"sess_2">>),
                        {ok, U3} = fetch_session(NTab, <<"sess_3">>),
                        Parent ! {new_worker_verified, [U1, U2, U3]},
                        ets:delete(NTab)
                after 500 ->
                    ok
                end
            end),
            Heir ! {give_to, NewWorker},
            receive
                giveaway_done ->
                    receive
                        {new_worker_verified, [101, 102, 103]} -> {ok, 3, survived}
                    after 500 ->
                        {error, survival_test_failed}
                    end
            after 500 ->
                {error, survival_test_failed}
            end;
        {error, heir_timeout} ->
            {error, heir_timeout}
    after 500 ->
        {error, heir_timeout}
    end.
`,
    files: [
      {
        name: 'incident_ets_wipeout.erl',
        path: 'src/incident_ets_wipeout.erl',
        content: `-module(incident_ets_wipeout).
-export([create_session_table/1, store_session/3, put_session/3, fetch_session/2, get_session/2]).
-export([transfer_to_restarted_worker/2, transfer_to_restarted_worker/3]).
-export([audit_table_heir/0, test_heir_handover/0]).

%% @doc Create the public ETS session cache table and designate HeirPid as its failover heir.
create_session_table(_HeirPid) ->
    ets:new(incident_sessions_tab, [set, public, {read_concurrency, true}]).

%% @doc Insert or update a timestamped user session record in Tab.
store_session(Tab, SessionId, UserId) ->
    ets:insert(Tab, {SessionId, UserId, os:system_time(millisecond)}),
    ok.

%% @doc Alias delegating session insertion to store_session/3.
put_session(Tab, SessionId, UserId) ->
    store_session(Tab, SessionId, UserId).

%% @doc Look up UserId for SessionId in Tab, returning {ok, UserId} or {error, not_found}.
fetch_session(Tab, SessionId) ->
    case ets:lookup(Tab, SessionId) of
        [{SessionId, UserId, _Time}] -> {ok, UserId};
        [] -> {error, not_found}
    end.

%% @doc Alias delegating session lookup to fetch_session/2.
get_session(Tab, SessionId) ->
    fetch_session(Tab, SessionId).

%% @doc Transfer ownership of Tab to NewWorkerPid with default keep_alive gift data.
transfer_to_restarted_worker(Tab, NewWorkerPid) ->
    transfer_to_restarted_worker(Tab, NewWorkerPid, keep_alive).

%% @doc Transfer ownership of Tab to NewWorkerPid attaching GiftData and return ok.
transfer_to_restarted_worker(_Tab, _NewWorkerPid, _GiftData) ->
    ok.

%% @doc Verify that create_session_table/1 attaches the supplied guardian PID as heir.
audit_table_heir() ->
    HeirPid = spawn(fun() -> receive stop -> ok end end),
    Tab = create_session_table(HeirPid),
    HeirInfo = ets:info(Tab, heir),
    HeirPid ! stop,
    ets:delete(Tab),
    case HeirInfo of
        HeirPid -> {ok, heir_configured};
        _ -> {error, {bad_heir, HeirInfo}}
    end.

%% @doc Run an end-to-end crash simulation verifying session survival across heir handover.
test_heir_handover() ->
    Parent = self(),
    Heir = spawn(fun() ->
        receive
            {'ETS-TRANSFER', Tab, _OldOwner, keep_alive} ->
                Parent ! {heir_got_table, Tab},
                receive
                    {give_to, NewWorker} ->
                        transfer_to_restarted_worker(Tab, NewWorker, restored),
                        Parent ! giveaway_done
                after 500 ->
                    ets:delete(Tab)
                end
        after 300 ->
            Parent ! {error, heir_timeout}
        end
    end),
    Worker = spawn(fun() ->
        Tab = create_session_table(Heir),
        store_session(Tab, <<"sess_1">>, 101),
        store_session(Tab, <<"sess_2">>, 102),
        store_session(Tab, <<"sess_3">>, 103),
        Parent ! {worker_ready, Tab},
        receive die -> exit(simulated_crash) end
    end),
    Tab = receive {worker_ready, RecvTab} -> RecvTab end,
    Worker ! die,
    receive
        {heir_got_table, Tab} ->
            NewWorker = spawn(fun() ->
                receive
                    {'ETS-TRANSFER', NTab, _Heir, restored} ->
                        {ok, U1} = fetch_session(NTab, <<"sess_1">>),
                        {ok, U2} = fetch_session(NTab, <<"sess_2">>),
                        {ok, U3} = fetch_session(NTab, <<"sess_3">>),
                        Parent ! {new_worker_verified, [U1, U2, U3]},
                        ets:delete(NTab)
                after 500 ->
                    ok
                end
            end),
            Heir ! {give_to, NewWorker},
            receive
                giveaway_done ->
                    receive
                        {new_worker_verified, [101, 102, 103]} -> {ok, 3, survived}
                    after 500 ->
                        {error, survival_test_failed}
                    end
            after 500 ->
                {error, survival_test_failed}
            end;
        {error, heir_timeout} ->
            {error, heir_timeout}
    after 500 ->
        {error, heir_timeout}
    end.
`,
      },
    ],
    solutionFiles: {
      'src/incident_ets_wipeout.erl': `-module(incident_ets_wipeout).
-export([create_session_table/1, store_session/3, put_session/3, fetch_session/2, get_session/2]).
-export([transfer_to_restarted_worker/2, transfer_to_restarted_worker/3]).
-export([audit_table_heir/0, test_heir_handover/0]).

%% @doc Create the public ETS session cache table and designate HeirPid as its failover heir.
create_session_table(HeirPid) ->
    ets:new(incident_sessions_tab, [
        set,
        public,
        {read_concurrency, true},
        {heir, HeirPid, keep_alive}
    ]).

%% @doc Insert or update a timestamped user session record in Tab.
store_session(Tab, SessionId, UserId) ->
    ets:insert(Tab, {SessionId, UserId, os:system_time(millisecond)}),
    ok.

%% @doc Alias delegating session insertion to store_session/3.
put_session(Tab, SessionId, UserId) ->
    store_session(Tab, SessionId, UserId).

%% @doc Look up UserId for SessionId in Tab, returning {ok, UserId} or {error, not_found}.
fetch_session(Tab, SessionId) ->
    case ets:lookup(Tab, SessionId) of
        [{SessionId, UserId, _Time}] -> {ok, UserId};
        [] -> {error, not_found}
    end.

%% @doc Alias delegating session lookup to fetch_session/2.
get_session(Tab, SessionId) ->
    fetch_session(Tab, SessionId).

%% @doc Transfer ownership of Tab to NewWorkerPid with default keep_alive gift data.
transfer_to_restarted_worker(Tab, NewWorkerPid) ->
    transfer_to_restarted_worker(Tab, NewWorkerPid, keep_alive).

%% @doc Transfer ownership of Tab to NewWorkerPid attaching GiftData and return ok.
transfer_to_restarted_worker(Tab, NewWorkerPid, GiftData) ->
    ets:give_away(Tab, NewWorkerPid, GiftData),
    ok.

%% @doc Verify that create_session_table/1 attaches the supplied guardian PID as heir.
audit_table_heir() ->
    HeirPid = spawn(fun() -> receive stop -> ok end end),
    Tab = create_session_table(HeirPid),
    HeirInfo = ets:info(Tab, heir),
    HeirPid ! stop,
    ets:delete(Tab),
    case HeirInfo of
        HeirPid -> {ok, heir_configured};
        _ -> {error, {bad_heir, HeirInfo}}
    end.

%% @doc Run an end-to-end crash simulation verifying session survival across heir handover.
test_heir_handover() ->
    Parent = self(),
    Heir = spawn(fun() ->
        receive
            {'ETS-TRANSFER', Tab, _OldOwner, keep_alive} ->
                Parent ! {heir_got_table, Tab},
                receive
                    {give_to, NewWorker} ->
                        transfer_to_restarted_worker(Tab, NewWorker, restored),
                        Parent ! giveaway_done
                after 500 ->
                    ets:delete(Tab)
                end
        after 300 ->
            Parent ! {error, heir_timeout}
        end
    end),
    Worker = spawn(fun() ->
        Tab = create_session_table(Heir),
        store_session(Tab, <<"sess_1">>, 101),
        store_session(Tab, <<"sess_2">>, 102),
        store_session(Tab, <<"sess_3">>, 103),
        Parent ! {worker_ready, Tab},
        receive die -> exit(simulated_crash) end
    end),
    Tab = receive {worker_ready, RecvTab} -> RecvTab end,
    Worker ! die,
    receive
        {heir_got_table, Tab} ->
            NewWorker = spawn(fun() ->
                receive
                    {'ETS-TRANSFER', NTab, _Heir, restored} ->
                        {ok, U1} = fetch_session(NTab, <<"sess_1">>),
                        {ok, U2} = fetch_session(NTab, <<"sess_2">>),
                        {ok, U3} = fetch_session(NTab, <<"sess_3">>),
                        Parent ! {new_worker_verified, [U1, U2, U3]},
                        ets:delete(NTab)
                after 500 ->
                    ok
                end
            end),
            Heir ! {give_to, NewWorker},
            receive
                giveaway_done ->
                    receive
                        {new_worker_verified, [101, 102, 103]} -> {ok, 3, survived}
                    after 500 ->
                        {error, survival_test_failed}
                    end
            after 500 ->
                {error, survival_test_failed}
            end;
        {error, heir_timeout} ->
            {error, heir_timeout}
    after 500 ->
        {error, heir_timeout}
    end.
`,
    },
    solutionExplanation: 'Adds {heir, HeirPid, keep_alive} to ets:new/2 options and implements ets:give_away/3 in transfer_to_restarted_worker to safely preserve session tables across worker crashes.',
  },

// ── Lesson 9.8: Problem Set ───────────────────────────────────────────────
  {
    id: 'ch09-l08',
    chapterNumber: 9,
    lessonNumber: 8,
    lessonType: 'problem_set',
    title: 'Chapter 9 Problem Set: Fault-Tolerant ETS Session Store with Heir Failover',
    difficulty: 'Advanced',
    xpReward: 250,
    visualScene: 'supervision_rest_for_one_ets_heir',
    conceptMarkdown: `## Why This Matters in Production

In a high-scale production backend, authentication tokens and session payloads are checked on every single inbound HTTP or WebSocket request. Routing every read through a single \`gen_server\` mailbox quickly creates a single-process bottleneck.

By pairing a public **ETS** table with a dedicated **Heir Custodian** under OTP supervision, your service achieves both lock-free concurrent reads and crash-resilient state:
1. **Direct Concurrent Access**: Reader processes query ETS directly in ERTS C memory without queuing behind a worker mailbox.
2. **Crash Survival**: Because an ETS table dies with its owner unless guarded, attaching a living heir guarantees the VM hands table custody to the custodian on worker exit.
3. **Transparent Failover Recovery**: When the supervisor restarts the crashed worker, the replacement process reclaims ownership in $O(1)$ time with zero row copying or session loss.

## Deep Concept Breakdown & Under the Hood

### 1. Supervisor Ordering & Guardian Separation
Why place a lightweight heir custodian ahead of the worker under a \`one_for_one\` supervisor?
- **Boot Dependency**: Supervisors start children strictly in list order. Booting the guardian worker first guarantees its registered name already resolves to a live PID before the table-owning worker enters \`init/1\`.
- **Failure Isolation**: Under \`one_for_one\`, killing the table-owning worker leaves the custodian undisturbed, preserving the in-flight \`{'ETS-TRANSFER', Tab, OldOwner, Tag}\` mailbox event and off-heap ETS memory across the restart boundary.

### 2. Cold Boot vs. Warm Reclaim in \`init/1\`
Because OTP invokes the exact same \`init/1\` callback on both initial launch and post-crash restart, a persistent ETS worker cannot unconditionally allocate a fresh named table on every start:
- Checking table presence via \`ets:info/1\` cleanly separates **first boot** (\`undefined\`, allocate table with concurrent read/write flags and register the custodian as heir) from **supervisor recovery** (table already exists in RAM owned by the custodian, reclaim ownership immediately).

### 3. Atomic Counter Fields & Missing Keys
ETS tables store tuples indexed at 1-based positions. Mutating a nested counter via \`ets:update_counter/3\` executes atomically inside ERTS without fetching or re-inserting the whole tuple, avoiding lost increments under concurrent traffic. However, updating a key that does not exist raises \`badarg\`, so boundary handlers wrap updates cleanly rather than crashing callers.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP ETS Table, Ownership & Counter Signatures (stdlib / ets)
ets:new(Name, Options) -> tid() | atom()
  Types:
    Name = atom()
    Options = [set | ordered_set | public | named_table |
               {read_concurrency, boolean()} | {write_concurrency, boolean()} |
               {heir, pid() | none, HeirData :: term()}]

ets:give_away(Tab, Pid, GiftData) -> true
  Types:
    Tab = tid() | atom()
    Pid = pid()
    GiftData = term()

ets:update_counter(Tab, Key, UpdateOp) -> Result
  Types:
    Tab = tid() | atom()
    Key = term()
    UpdateOp = {Pos :: pos_integer(), Incr :: integer()}
    Result = integer()
\`\`\`

Consult the attached OTP documentation cards below for transfer complexity, concurrency flags, and \`update_counter/3\` error semantics.

## Parallel Worked Example: Custodian-Backed Edge Quota Store

Consider a separate domain: an \`ordered_set\` tenant API quota store (\`telemetry_quota_demo\`) tracked with 3-tuples \`{TenantBin, RemainingInt, UpdatedMs}\` and guarded by an independent custodian process. Study how its 3 phases compose cleanly:

### Phase 1: Custodian Actor & Table Handover
\`\`\`erlang
-module(telemetry_quota_demo).
-behaviour(gen_server).

-export([start_custodian/0, start_worker/1, open_bucket/2, consume_quota/2, inspect_bucket/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-define(QUOTA_TAB, telemetry_quota_buckets).

%% @doc Spawn a standalone custodian process that guards transferred tables and hands them back on request.
start_custodian() ->
    spawn(fun() -> custodian_loop(#{}) end).

custodian_loop(Held) ->
    receive
        {'ETS-TRANSFER', Tab, _DeadOwner, quota_snapshot} ->
            custodian_loop(Held#{Tab => true});
        {reclaim, Tab, NewOwnerPid, From} ->
            case maps:is_key(Tab, Held) of
                true ->
                    ets:give_away(Tab, NewOwnerPid, restored_custody),
                    From ! {reclaimed, ok},
                    custodian_loop(maps:remove(Tab, Held));
                false ->
                    From ! {reclaimed, not_held},
                    custodian_loop(Held)
            end;
        stop ->
            ok
    end.
\`\`\`

### Phase 2: Worker Startup (Create vs. Reclaim) & Atomic Counter Updates
\`\`\`erlang
%% @doc Start the quota worker linked to CustodianPid.
start_worker(CustodianPid) ->
    gen_server:start_link(?MODULE, [CustodianPid], []).

%% @doc Allocate the ordered_set quota table on cold boot, or reclaim it from CustodianPid on restart.
init([CustodianPid]) ->
    case ets:info(?QUOTA_TAB) of
        undefined ->
            ets:new(?QUOTA_TAB, [
                ordered_set,
                public,
                named_table,
                {read_concurrency, true},
                {heir, CustodianPid, quota_snapshot}
            ]);
        _ ->
            CustodianPid ! {reclaim, ?QUOTA_TAB, self(), self()},
            receive {reclaimed, ok} -> ok after 1000 -> ok end
    end,
    {ok, #{custodian => CustodianPid}}.

%% @doc Open a tenant allowance bucket with Remaining tokens.
open_bucket(TenantBin, InitialBudget) ->
    ets:insert(?QUOTA_TAB, {TenantBin, InitialBudget, erlang:system_time(millisecond)}),
    ok.

%% @doc Atomically deduct Units from position 2 of a tenant bucket, returning empty error on missing key.
consume_quota(TenantBin, Units) ->
    try
        Remaining = ets:update_counter(?QUOTA_TAB, TenantBin, {2, -Units}),
        {remaining, Remaining}
    catch
        error:badarg ->
            unknown_tenant
    end.

%% @doc Inspect a tenant quota tuple directly from public ETS memory.
inspect_bucket(TenantBin) ->
    case ets:lookup(?QUOTA_TAB, TenantBin) of
        [{TenantBin, Remaining, UpdatedMs}] -> {tenant, TenantBin, Remaining, UpdatedMs};
        [] -> unknown_tenant
    end.

handle_call(_Req, _From, State) -> {reply, ok, State}.
handle_cast(_Msg, State) -> {noreply, State}.
handle_info({'ETS-TRANSFER', _Tab, _From, _Data}, State) -> {noreply, State};
handle_info(_Msg, State) -> {noreply, State}.
terminate(_Reason, _State) -> ok.
\`\`\`

### What the BEAM Does Across Phases
- **Custody Continuity**: Notice how \`init/1\` branches on \`ets:info(?QUOTA_TAB)\` before touching any rows—creating the \`ordered_set\` with \`{heir, CustodianPid, quota_snapshot}\` when absent, or negotiating restitution with the custodian when already alive.
- **Direct Positional Counter**: \`consume_quota/2\` targets slot \`2\` of the 3-tuple atomically with \`{2, -Units}\` and catches \`error:badarg\` cleanly if the tenant was never registered.

## Assignment Specification

Notice that two infrastructure modules are already wired in your multi-file editor:
- **\`src/session_sup.erl\`**: Boots a registered \`one_for_one\` supervisor starting \`table_manager\` first and \`session_cache\` second (intensity 10, period 5).
- **\`src/table_manager.erl\`**: Pre-wired heir guardian \`gen_server\` that captures \`'ETS-TRANSFER'\` notifications and transfers ownership back to callers via \`claim_table/1\`.

Complete the worker module **\`src/session_cache.erl\`** (\`-module(session_cache).\`, keeping all exported pipeline and \`gen_server\` signatures intact):

### \`init/1\`
- **Input**: Empty initialization argument list \`[]\`.
- **Behavior**: Resolves the live heir custodian PID via process registration lookup for \`table_manager\` and inspects whether named table \`session_cache_tab\` already exists. On fresh boot, creates the named public \`set\` table with read and write concurrency enabled and attaches the custodian as heir using tag \`session_backup\`. If the table already exists from before a crash, safely reclaims custody from \`table_manager\` via its exported claim API when available, then returns an \`ok\` state tuple tracking the table.
- **Examples**:
  - Booting \`session_cache:start_pipeline()\` allocates \`session_cache_tab\` and leaves both \`table_manager\` and \`session_cache\` registered.
  - Killing \`session_cache\` causes \`session_sup\` to restart it while preserving existing table contents via \`table_manager\`.

### \`put_session/3\`
- **Input**: Binary session ID \`SessionId\`, integer or term user ID \`UserId\`, map metadata \`MetaMap\`.
- **Behavior**: Inserts a 4-field session record into \`session_cache_tab\` storing the session identifier, user identifier, metadata map, and an initial hit count of \`0\` in $O(1)$ time, returning \`ok\`.
- **Examples**:
  - \`session_cache:put_session(<<"s1">>, 101, #{ip => <<"127.0.0.1">>})\` returns \`ok\`.

### \`get_session/1\`
- **Input**: Binary session ID \`SessionId\`.
- **Behavior**: Performs a direct $O(1)$ lookup for \`SessionId\` in \`session_cache_tab\`. When found, unpacks the 4-field entry into an \`ok\` tuple wrapping a map with keys for user ID, metadata, and hit count; when missing, returns a structured not-found error tuple.
- **Examples**:
  - \`session_cache:get_session(<<"s1">>)\` returns \`{ok, #{user_id => 101, meta => #{ip => <<"127.0.0.1">>}, hit_count => 0}}\` immediately after insertion.
  - \`session_cache:get_session(<<"missing">>)\` returns \`{error, not_found}\`.

### \`increment_hits/1\`
- **Input**: Binary session ID \`SessionId\`.
- **Behavior**: Atomically increments the 4th tuple slot (hit counter) by \`1\` in place inside \`session_cache_tab\`. Returns an \`ok\` tuple containing the updated counter integer, or returns a structured not-found error tuple if no matching session exists.
- **Examples**:
  - Two consecutive calls to \`session_cache:increment_hits(<<"s1">>)\` return \`{ok, 1}\` and \`{ok, 2}\`.
  - \`session_cache:increment_hits(<<"unknown">>)\` returns \`{error, not_found}\`.

### \`delete_session/1\`
- **Input**: Binary session ID \`SessionId\`.
- **Behavior**: Removes any session entry keyed by \`SessionId\` from \`session_cache_tab\` and returns \`ok\`.
- **Examples**:
  - \`session_cache:delete_session(<<"s1">>)\` removes the entry and returns \`ok\`.

### \`count_sessions/0\`
- **Input**: Zero arguments.
- **Behavior**: Queries table metadata for the current number of stored rows in \`session_cache_tab\`, returning \`0\` safely if the table does not currently exist.
- **Examples**:
  - Returns \`2\` when two sessions are active, or \`0\` when the table is empty or uninitialized.

## Rules & Verification Constraints
- **Table & Heir Contract**: The ETS table must remain named \`session_cache_tab\` and register \`table_manager\` as its failover heir.
- **Required ETS Operations**: \`bf_ast_verifier\` enforces usage of \`ets:new/2\`, \`ets:insert/2\`, \`ets:lookup/2\`, and \`ets:update_counter/3\` inside \`session_cache.erl\`.
- **Chaos Failover Invariant**: Must survive \`exit(whereis(session_cache), kill)\` with supervisor restart, custody restitution from \`table_manager\`, and 100% preservation of all sessions and hit counters.
`,
    otpDocCards: [
      {
        functionName: 'new',
        module: 'ets',
        signature: 'ets:new(Name, Options) -> tid() | atom()',
        typesSpec: [
          'Name = atom()',
          'Options = [set | public | named_table | {read_concurrency, boolean()} | {write_concurrency, boolean()} | {heir, pid() | none, term()}]'
        ],
        description: 'Creates a new ETS table owned by the calling process, optionally registering it under a global atom name and designating an heir guardian PID.',
        complexityNote: 'O(1) off-heap table allocation in ERTS.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#new/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      },
      {
        functionName: 'give_away',
        module: 'ets',
        signature: 'ets:give_away(Tab, Pid, GiftData) -> true',
        typesSpec: [
          'Tab = tab()',
          'Pid = pid()',
          'GiftData = term()'
        ],
        description: 'Transfers ownership of an ETS table to another process without table destruction.',
        complexityNote: 'O(1) pointer transfer.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#give_away/3',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      },
      {
        functionName: 'update_counter',
        module: 'ets',
        signature: 'ets:update_counter(Tab, Key, UpdateOp) -> Result',
        typesSpec: [
          'Tab = tab()',
          'Key = term()',
          'UpdateOp = {Pos :: pos_integer(), Incr :: integer()}',
          'Result = integer()'
        ],
        description: 'Atomically updates an integer tuple slot inside an ETS table in place; raises badarg if Key is absent.',
        complexityNote: 'O(1) atomic update on set tables.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#update_counter/3',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      }
    ],
    mentalModelCheck: {
      question: 'Why should table_manager be started BEFORE session_cache in the supervision child specification list?',
      options: [
        {
          id: 'A',
          label: 'Supervisors fail compilation if workers are not alphabetical.',
          isCorrect: false,
          explanation: 'Supervisor child specifications can be listed in any arbitrary order.'
        },
        {
          id: 'B',
          label: 'session_cache needs whereis(table_manager) to return a live PID when it specifies the {heir, HeirPid, Data} option in ets:new/2.',
          isCorrect: true,
          explanation: 'Because session_cache configures {heir, whereis(table_manager), Tag} upon creating the ETS table, table_manager must already be registered and running.'
        },
        {
          id: 'C',
          label: 'table_manager creates the ETS table and inserts mock data.',
          isCorrect: false,
          explanation: 'session_cache creates the active ETS table and uses table_manager solely as heir guardian.'
        },
        {
          id: 'D',
          label: 'table_manager is a supervisor, so it must start before workers.',
          isCorrect: false,
          explanation: 'table_manager is a worker gen_server, not a supervisor.'
        }
      ]
    },
    starterCode: `-module(session_cache).
-behaviour(gen_server).

-export([start_link/0, put_session/3, get_session/1, increment_hits/1, delete_session/1, count_sessions/0]).
-export([start_pipeline/0, stop_pipeline/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-define(TAB, session_cache_tab).

%% @doc Start and register the session_cache gen_server worker under the supervisor.
start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% @doc Start the session_sup supervision tree and both managed workers.
start_pipeline() ->
    session_sup:start_link().

%% @doc Stop the session_sup supervision tree and clean up any lingering registered processes.
stop_pipeline() ->
    case whereis(session_sup) of
        undefined -> ok;
        SupPid ->
            unlink(SupPid),
            try supervisor:stop(SupPid) catch _:_ -> ok end
    end,
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]],
    ok.

%% @doc Create the public concurrent ETS session table with table_manager as heir on cold boot, or reclaim custody on worker restart.
init([]) ->
    {ok, #{}}.

%% @doc Store a 4-field session tuple initialized at zero hits into session_cache_tab and return ok.
put_session(_SessionId, _UserId, _MetaMap) ->
    ok.

%% @doc Look up SessionId in session_cache_tab and return {ok, SessionMap} with user_id, meta, and hit_count, or a not_found error tuple.
get_session(_SessionId) ->
    ok.

%% @doc Atomically increment the hit counter field for SessionId by 1, returning {ok, NewCount} or a not_found error tuple if absent.
increment_hits(_SessionId) ->
    ok.

%% @doc Remove any stored session entry matching SessionId from session_cache_tab and return ok.
delete_session(_SessionId) ->
    ok.

%% @doc Return the current entry count stored in session_cache_tab, or 0 if the table does not exist.
count_sessions() ->
    0.

%% @doc Handle synchronous gen_server call requests.
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Handle asynchronous gen_server cast messages.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle out-of-band messages including ETS custody handover notifications.
handle_info({'ETS-TRANSFER', _Tab, _OldOwner, _GiftData}, State) ->
    {noreply, State};
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up worker state prior to termination.
terminate(_Reason, _State) ->
    ok.`,
    solutionCode: `-module(session_cache).
-behaviour(gen_server).

-export([start_link/0, put_session/3, get_session/1, increment_hits/1, delete_session/1, count_sessions/0]).
-export([start_pipeline/0, stop_pipeline/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-define(TAB, session_cache_tab).

%% @doc Start and register the session_cache gen_server worker under the supervisor.
start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% @doc Start the session_sup supervision tree and both managed workers.
start_pipeline() ->
    session_sup:start_link().

%% @doc Stop the session_sup supervision tree and clean up any lingering registered processes.
stop_pipeline() ->
    case whereis(session_sup) of
        undefined -> ok;
        SupPid ->
            unlink(SupPid),
            try supervisor:stop(SupPid) catch _:_ -> ok end
    end,
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]],
    ok.

%% @doc Create the public concurrent ETS session table with table_manager as heir on cold boot, or reclaim custody on worker restart.
init([]) ->
    HeirPid = whereis(table_manager),
    case ets:info(?TAB) of
        undefined ->
            ets:new(?TAB, [
                set,
                public,
                named_table,
                {read_concurrency, true},
                {write_concurrency, true},
                {heir, HeirPid, session_backup}
            ]);
        _ ->
            case HeirPid of
                undefined -> ok;
                _ -> try table_manager:claim_table(?TAB) catch _:_ -> ok end
            end
    end,
    {ok, #{table => ?TAB}}.

%% @doc Store a 4-field session tuple initialized at zero hits into session_cache_tab and return ok.
put_session(SessionId, UserId, MetaMap) ->
    ets:insert(?TAB, {SessionId, UserId, MetaMap, 0}),
    ok.

%% @doc Look up SessionId in session_cache_tab and return {ok, SessionMap} with user_id, meta, and hit_count, or a not_found error tuple.
get_session(SessionId) ->
    case ets:lookup(?TAB, SessionId) of
        [{SessionId, UserId, MetaMap, HitCount}] ->
            {ok, #{
                user_id => UserId,
                meta => MetaMap,
                hit_count => HitCount
            }};
        [] ->
            {error, not_found}
    end.

%% @doc Atomically increment the hit counter field for SessionId by 1, returning {ok, NewCount} or a not_found error tuple if absent.
increment_hits(SessionId) ->
    try
        NewCount = ets:update_counter(?TAB, SessionId, {4, 1}),
        {ok, NewCount}
    catch
        _:_ ->
            {error, not_found}
    end.

%% @doc Remove any stored session entry matching SessionId from session_cache_tab and return ok.
delete_session(SessionId) ->
    ets:delete(?TAB, SessionId),
    ok.

%% @doc Return the current entry count stored in session_cache_tab, or 0 if the table does not exist.
count_sessions() ->
    case ets:info(?TAB, size) of
        undefined -> 0;
        Count -> Count
    end.

%% @doc Handle synchronous gen_server call requests.
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Handle asynchronous gen_server cast messages.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle out-of-band messages including ETS custody handover notifications.
handle_info({'ETS-TRANSFER', _Tab, _OldOwner, _GiftData}, State) ->
    {noreply, State};
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up worker state prior to termination.
terminate(_Reason, _State) ->
    ok.
`,
    files: [
      {
        name: 'session_cache.erl',
        path: 'src/session_cache.erl',
        behaviour: 'gen_server',
        content: `-module(session_cache).
-behaviour(gen_server).

-export([start_link/0, put_session/3, get_session/1, increment_hits/1, delete_session/1, count_sessions/0]).
-export([start_pipeline/0, stop_pipeline/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-define(TAB, session_cache_tab).

%% @doc Start and register the session_cache gen_server worker under the supervisor.
start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% @doc Start the session_sup supervision tree and both managed workers.
start_pipeline() ->
    session_sup:start_link().

%% @doc Stop the session_sup supervision tree and clean up any lingering registered processes.
stop_pipeline() ->
    case whereis(session_sup) of
        undefined -> ok;
        SupPid ->
            unlink(SupPid),
            try supervisor:stop(SupPid) catch _:_ -> ok end
    end,
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]],
    ok.

%% @doc Create the public concurrent ETS session table with table_manager as heir on cold boot, or reclaim custody on worker restart.
init([]) ->
    {ok, #{}}.

%% @doc Store a 4-field session tuple initialized at zero hits into session_cache_tab and return ok.
put_session(_SessionId, _UserId, _MetaMap) ->
    ok.

%% @doc Look up SessionId in session_cache_tab and return {ok, SessionMap} with user_id, meta, and hit_count, or a not_found error tuple.
get_session(_SessionId) ->
    ok.

%% @doc Atomically increment the hit counter field for SessionId by 1, returning {ok, NewCount} or a not_found error tuple if absent.
increment_hits(_SessionId) ->
    ok.

%% @doc Remove any stored session entry matching SessionId from session_cache_tab and return ok.
delete_session(_SessionId) ->
    ok.

%% @doc Return the current entry count stored in session_cache_tab, or 0 if the table does not exist.
count_sessions() ->
    0.

%% @doc Handle synchronous gen_server call requests.
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Handle asynchronous gen_server cast messages.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle out-of-band messages including ETS custody handover notifications.
handle_info({'ETS-TRANSFER', _Tab, _OldOwner, _GiftData}, State) ->
    {noreply, State};
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up worker state prior to termination.
terminate(_Reason, _State) ->
    ok.`
      },
      {
        name: 'session_sup.erl',
        path: 'src/session_sup.erl',
        behaviour: 'supervisor',
        content: `-module(session_sup).
-behaviour(supervisor).

-export([start_link/0, init/1]).

%% @doc Start the registered one_for_one session supervision tree.
start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

%% @doc Configure supervisor flags and start table_manager before session_cache.
init([]) ->
    SupFlags = #{
        strategy => one_for_one,
        intensity => 10,
        period => 5
    },
    ChildSpecs = [
        #{
            id => table_manager,
            start => {table_manager, start_link, []},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [table_manager]
        },
        #{
            id => session_cache,
            start => {session_cache, start_link, []},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [session_cache]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.
`
      },
      {
        name: 'table_manager.erl',
        path: 'src/table_manager.erl',
        behaviour: 'gen_server',
        content: `-module(table_manager).
-behaviour(gen_server).

-export([start_link/0, claim_table/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

%% @doc Start and register the table_manager ETS heir custodian worker.
start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% @doc Request zero-copy ownership transfer of Tab back to the calling worker process.
claim_table(Tab) ->
    gen_server:call(?MODULE, {claim_table, Tab}, 5000).

%% @doc Initialize empty custody registry state for the heir guardian.
init([]) ->
    {ok, #{tables => #{}}}.

%% @doc Transfer custody of held table Tab back to CallerPid or ignore unknown call requests.
handle_call({claim_table, Tab}, {CallerPid, _Tag}, State = #{tables := Tables}) ->
    case maps:is_key(Tab, Tables) of
        true ->
            ets:give_away(Tab, CallerPid, restored),
            {reply, ok, State#{tables => maps:remove(Tab, Tables)}};
        false ->
            case ets:info(Tab, owner) of
                Self when Self =:= self() ->
                    ets:give_away(Tab, CallerPid, restored),
                    {reply, ok, State};
                _ ->
                    {reply, {error, not_held}, State}
            end
    end;
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Handle asynchronous cast messages.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Record ETS tables inherited from terminated owner processes or ignore unknown info messages.
handle_info({'ETS-TRANSFER', Tab, _OldOwner, _GiftData}, State = #{tables := Tables}) ->
    {noreply, State#{tables := Tables#{Tab => true}}};
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up guardian process state on termination.
terminate(_Reason, _State) ->
    ok.
`
      }
    ],
    solutionFiles: {
      'src/session_sup.erl': `-module(session_sup).
-behaviour(supervisor).

-export([start_link/0, init/1]).

%% @doc Start the registered one_for_one session supervision tree.
start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

%% @doc Configure supervisor flags and start table_manager before session_cache.
init([]) ->
    SupFlags = #{
        strategy => one_for_one,
        intensity => 10,
        period => 5
    },
    ChildSpecs = [
        #{
            id => table_manager,
            start => {table_manager, start_link, []},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [table_manager]
        },
        #{
            id => session_cache,
            start => {session_cache, start_link, []},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [session_cache]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.
`,
      'src/table_manager.erl': `-module(table_manager).
-behaviour(gen_server).

-export([start_link/0, claim_table/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

%% @doc Start and register the table_manager ETS heir custodian worker.
start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% @doc Request zero-copy ownership transfer of Tab back to the calling worker process.
claim_table(Tab) ->
    gen_server:call(?MODULE, {claim_table, Tab}, 5000).

%% @doc Initialize empty custody registry state for the heir guardian.
init([]) ->
    {ok, #{tables => #{}}}.

%% @doc Transfer custody of held table Tab back to CallerPid or ignore unknown call requests.
handle_call({claim_table, Tab}, {CallerPid, _Tag}, State = #{tables := Tables}) ->
    case maps:is_key(Tab, Tables) of
        true ->
            ets:give_away(Tab, CallerPid, restored),
            {reply, ok, State#{tables => maps:remove(Tab, Tables)}};
        false ->
            case ets:info(Tab, owner) of
                Self when Self =:= self() ->
                    ets:give_away(Tab, CallerPid, restored),
                    {reply, ok, State};
                _ ->
                    {reply, {error, not_held}, State}
            end
    end;
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Handle asynchronous cast messages.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Record ETS tables inherited from terminated owner processes or ignore unknown info messages.
handle_info({'ETS-TRANSFER', Tab, _OldOwner, _GiftData}, State = #{tables := Tables}) ->
    {noreply, State#{tables := Tables#{Tab => true}}};
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up guardian process state on termination.
terminate(_Reason, _State) ->
    ok.
`,
      'src/session_cache.erl': `-module(session_cache).
-behaviour(gen_server).

-export([start_link/0, put_session/3, get_session/1, increment_hits/1, delete_session/1, count_sessions/0]).
-export([start_pipeline/0, stop_pipeline/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-define(TAB, session_cache_tab).

%% @doc Start and register the session_cache gen_server worker under the supervisor.
start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

%% @doc Start the session_sup supervision tree and both managed workers.
start_pipeline() ->
    session_sup:start_link().

%% @doc Stop the session_sup supervision tree and clean up any lingering registered processes.
stop_pipeline() ->
    case whereis(session_sup) of
        undefined -> ok;
        SupPid ->
            unlink(SupPid),
            try supervisor:stop(SupPid) catch _:_ -> ok end
    end,
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]],
    ok.

%% @doc Create the public concurrent ETS session table with table_manager as heir on cold boot, or reclaim custody on worker restart.
init([]) ->
    HeirPid = whereis(table_manager),
    case ets:info(?TAB) of
        undefined ->
            ets:new(?TAB, [
                set,
                public,
                named_table,
                {read_concurrency, true},
                {write_concurrency, true},
                {heir, HeirPid, session_backup}
            ]);
        _ ->
            case HeirPid of
                undefined -> ok;
                _ -> try table_manager:claim_table(?TAB) catch _:_ -> ok end
            end
    end,
    {ok, #{table => ?TAB}}.

%% @doc Store a 4-field session tuple initialized at zero hits into session_cache_tab and return ok.
put_session(SessionId, UserId, MetaMap) ->
    ets:insert(?TAB, {SessionId, UserId, MetaMap, 0}),
    ok.

%% @doc Look up SessionId in session_cache_tab and return {ok, SessionMap} with user_id, meta, and hit_count, or a not_found error tuple.
get_session(SessionId) ->
    case ets:lookup(?TAB, SessionId) of
        [{SessionId, UserId, MetaMap, HitCount}] ->
            {ok, #{
                user_id => UserId,
                meta => MetaMap,
                hit_count => HitCount
            }};
        [] ->
            {error, not_found}
    end.

%% @doc Atomically increment the hit counter field for SessionId by 1, returning {ok, NewCount} or a not_found error tuple if absent.
increment_hits(SessionId) ->
    try
        NewCount = ets:update_counter(?TAB, SessionId, {4, 1}),
        {ok, NewCount}
    catch
        _:_ ->
            {error, not_found}
    end.

%% @doc Remove any stored session entry matching SessionId from session_cache_tab and return ok.
delete_session(SessionId) ->
    ets:delete(?TAB, SessionId),
    ok.

%% @doc Return the current entry count stored in session_cache_tab, or 0 if the table does not exist.
count_sessions() ->
    case ets:info(?TAB, size) of
        undefined -> 0;
        Count -> Count
    end.

%% @doc Handle synchronous gen_server call requests.
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Handle asynchronous gen_server cast messages.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle out-of-band messages including ETS custody handover notifications.
handle_info({'ETS-TRANSFER', _Tab, _OldOwner, _GiftData}, State) ->
    {noreply, State};
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up worker state prior to termination.
terminate(_Reason, _State) ->
    ok.
`
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Session Operations and Atomic Hit Counter',
        erlangCall: 'begin [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]], timer:sleep(20), {ok, _} = session_cache:start_pipeline(), ok = session_cache:put_session(<<"s1">>, 101, #{ip => <<"127.0.0.1">>}), {ok, 1} = session_cache:increment_hits(<<"s1">>), {ok, 2} = session_cache:increment_hits(<<"s1">>), {ok, Sess} = session_cache:get_session(<<"s1">>), Hits = maps:get(hit_count, Sess), session_cache:stop_pipeline(), Hits end',
        expectedOutput: '2',
        explanation: 'Verifies pipeline boot, insertion, and atomic counter updates.'
      },
      {
        id: 'tc2',
        title: 'Chaos Test: Kill Worker -> Zero-Data-Loss Failover',
        erlangCall: 'begin [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]], timer:sleep(20), {ok, _} = session_cache:start_pipeline(), ok = session_cache:put_session(<<"sess_a">>, 999, #{role => admin}), {ok, 1} = session_cache:increment_hits(<<"sess_a">>), OldPid = whereis(session_cache), exit(OldPid, kill), timer:sleep(60), NewPid = whereis(session_cache), {ok, SessA} = session_cache:get_session(<<"sess_a">>), session_cache:stop_pipeline(), {OldPid =/= NewPid, maps:get(hit_count, SessA)} end',
        expectedOutput: '{true, 1}',
        explanation: 'Kills worker with kill signal, verifies new PID from supervisor, and confirms 100% data preservation.'
      }
    ],
    astRules: {
      requiredCalls: ['ets:new/2', 'ets:insert/2', 'ets:lookup/2', 'ets:update_counter/3']
    },
    solutionExplanation: 'Implements a fault-tolerant session cache architecture using a supervisor, an heir table manager, and a gen_server worker with atomic hit tracking.'
  }
];

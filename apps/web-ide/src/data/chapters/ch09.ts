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

In mainstream backend languages such as Node.js, Python, Go, and Ruby, scaling high-throughput APIs requires deploying an external **Redis** or **Memcached** cluster over the network. Every single cache read incurs network TCP roundtrips (1–3ms), OS socket serialization, connection pooling overhead, and JSON or Protobuf parsing costs.

In Erlang and the BEAM VM, you do not need Redis for in-process memory caching. Erlang includes **ETS (Erlang Term Storage)** directly built into the BEAM virtual machine in optimized C:
1. **Zero Network Latency**: Reads and writes execute in nanoseconds directly in memory via C pointers, bypassing network stacks completely.
2. **Outside Garbage Collection (Off-Heap)**: ETS tables are allocated completely outside Erlang process heaps. An ETS table holding 10,000,000 active sessions will **never trigger garbage collection pauses** on worker processes!
3. **Hardware Lock-Free Concurrency**: By configuring \`{read_concurrency, true}\` and \`{write_concurrency, true}\`, the BEAM VM utilizes decentralized cache-line locking and lock-free read paths across all CPU cores.
4. **Hardware Atomic Operations**: Functions like \`ets:update_counter/4\` perform lock-free atomic increments, allowing thousands of concurrent workers to increment rate-limiters or telemetry metrics with zero race conditions.

> [!NOTE]
> **BEAM ETS vs External Cache (Redis):**
> - **External Cache (Redis):** Network hop overhead (1-2ms), JSON serialization, TCP connection pool management.
> - **BEAM ETS (In-Process Off-Heap):** Direct memory lookup via C pointers (nanosecond latency), zero garbage collection pause on process heaps, hardware lock-free atomic counters.

## Deep Concept Breakdown & Under the Hood

### The 4 ETS Table Types

When calling \`ets:new(Name, Options)\`, you select one of four table archetypes:
1. **\`set\` (Default)**: Unique keys. Exactly one tuple per key. Implemented as an $O(1)$ hash table. If you insert a tuple with an existing key, it overwrites the old tuple.
2. **\`ordered_set\`**: Unique keys. Keys are ordered according to Erlang term precedence (\`number < atom < reference < fun < port < pid < tuple < map < list < bitstring\`). Implemented as an $O(\\log N)$ AVL balanced binary tree. Supports range scans and iteration via \`ets:first/1\`, \`ets:last/1\`, \`ets:next/2\`, and \`ets:prev/2\`.
3. **\`bag\`**: Multiple tuples can have the identical key, provided the tuples themselves are not completely identical.
4. **\`duplicate_bag\`**: Allows multiple identical tuples with identical keys.

### Key Position (\`keypos\`)

By default, Erlang uses element 1 of the stored tuple as the primary key (\`{keypos, 1}\`). If your tuples are tagged records like \`{user_profile, UserId, Name, Role}\`, you specify \`{keypos, 2}\` so \`UserId\` is the lookup index!

### Atomic Counter Modification (\`ets:update_counter/4\`)

\`\`\`erlang
ets:update_counter(TableName, Key, {Pos, Increment}, DefaultTuple) -> NewValue
\`\`\`

If \`Key\` exists, element \`Pos\` is atomically incremented by \`Increment\`. If \`Key\` does NOT exist, \`DefaultTuple\` is inserted atomically and then modified!

### Parallel Worked Example: In-Memory Rate Limiter

Here is how a real-world API rate limiter initializes an ETS table and records hits:

\`\`\`erlang
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
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official ETS Calls (stdlib / ets)
ets:new(Name, Options) -> tid() | atom()
  Options = [Type | Access | named_table | {keypos, Pos} | {read_concurrency, boolean()} | {write_concurrency, boolean()}]
  Type = set | ordered_set | bag | duplicate_bag
  Access = public | protected | private

ets:insert(Tab, TupleOrList) -> true
ets:lookup(Tab, Key) -> [tuple()]
ets:update_counter(Tab, Key, {Pos, Incr}, DefaultTuple) -> integer()
\`\`\`

## Assignment Specification

Implement module \`ets_telemetry\` exporting:
1. \`init_table/0 -> ok\`:
   - Creates a \`named_table\` named \`telemetry_store\` with \`set\`, \`public\`, \`{read_concurrency, true}\`, and \`{write_concurrency, true}\`.
   - If the table already exists, returns \`ok\`.
2. \`record_endpoint_hit(EndpointBin, Incr) -> integer()\`:
   - Uses \`ets:update_counter/4\` to increment the hit count at position 2 for key \`EndpointBin\` by \`Incr\`.
   - Default tuple if absent: \`{EndpointBin, 0}\`.
   - Returns the new integer hit count.
3. \`get_endpoint_hits(EndpointBin) -> integer()\`:
   - Returns the hit count for \`EndpointBin\` from \`telemetry_store\`.
   - If not found, returns \`0\`.
4. \`put_user_profile(UserId, Name, Role) -> ok\`:
   - Inserts \`{{user, UserId}, Name, Role}\` into \`telemetry_store\`.
5. \`get_user_profile(UserId) -> {ok, #{name => Name, role => Role}} | {error, not_found}\`:
   - Looks up \`{user, UserId}\`. Returns map if found, or \`{error, not_found}\`.

## Rules & Verification Constraints
- Table \`telemetry_store\` must be a named, public set.
- All counter operations must use \`ets:update_counter/4\`.
- All operations must succeed concurrently with zero process bottlenecking.
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

init_table() ->
    ok.

record_endpoint_hit(EndpointBin, Incr) ->
    0.

get_endpoint_hits(EndpointBin) ->
    0.

put_user_profile(UserId, Name, Role) ->
    ok.

get_user_profile(UserId) ->
    {error, not_found}.
`,
    solutionCode: `-module(ets_telemetry).
-export([init_table/0, record_endpoint_hit/2, get_endpoint_hits/1, put_user_profile/3, get_user_profile/1]).

-define(TAB, telemetry_store).

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

record_endpoint_hit(EndpointBin, Incr) ->
    ets:update_counter(?TAB, EndpointBin, {2, Incr}, {EndpointBin, 0}).

get_endpoint_hits(EndpointBin) ->
    case ets:lookup(?TAB, EndpointBin) of
        [{EndpointBin, Hits}] -> Hits;
        [] -> 0
    end.

put_user_profile(UserId, Name, Role) ->
    ets:insert(?TAB, {{user, UserId}, Name, Role}),
    ok.

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

init_table() ->
    ok.

record_endpoint_hit(EndpointBin, Incr) ->
    0.

get_endpoint_hits(EndpointBin) ->
    0.

put_user_profile(UserId, Name, Role) ->
    ok.

get_user_profile(UserId) ->
    {error, not_found}.
`,
      },
    ],
    solutionFiles: {
      'src/ets_telemetry.erl': `-module(ets_telemetry).
-export([init_table/0, record_endpoint_hit/2, get_endpoint_hits/1, put_user_profile/3, get_user_profile/1]).

-define(TAB, telemetry_store).

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

record_endpoint_hit(EndpointBin, Incr) ->
    ets:update_counter(?TAB, EndpointBin, {2, Incr}, {EndpointBin, 0}).

get_endpoint_hits(EndpointBin) ->
    case ets:lookup(?TAB, EndpointBin) of
        [{EndpointBin, Hits}] -> Hits;
        [] -> 0
    end.

put_user_profile(UserId, Name, Role) ->
    ets:insert(?TAB, {{user, UserId}, Name, Role}),
    ok.

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
        erlangCall: 'begin ok = ets_telemetry:init_table(), ok = ets_telemetry:put_user_profile(101, <<"Alice">>, admin), {ok, P} = ets_telemetry:get_user_profile(101), {maps:get(name, P), maps:get(role, P)} end',
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

In a high-throughput API gateway, thousands of concurrent requests need to validate auth tokens on every HTTP request. If token verification is handled by sending a message to a \`gen_server\`, that server's mailbox becomes a severe single-threaded bottleneck: 50,000 requests/sec will queue up, causing latency spikes and timeouts.

The standard OTP architectural solution is the **Protected ETS Architecture**:
1. A single \`gen_server\` owns a **\`protected\`** ETS table.
2. Only the owner process is permitted to write (inserting new tokens, refreshing leases). This eliminates write-write race conditions.
3. Any process across the entire BEAM VM can read directly from the ETS table with **lock-free concurrency** via \`ets:lookup/2\` or \`ets:select/2\`.
4. Over 100,000 concurrent client requests read auth data directly from C memory with **zero message passing and zero mailbox serialization**!

> [!NOTE]
> **ETS Access Protections:**
> - **\`public\`**: Any process can read and write.
> - **\`protected\` (Default)**: Any process can read; only the owner process can write.
> - **\`private\`**: Only the owner process can read or write.

## Deep Concept Breakdown & Under the Hood

### Pattern Matching with \`ets:match_object/2\`

For simple tuple pattern queries, \`ets:match_object/2\` uses the atom \`'_'\` as a wildcard:

\`\`\`erlang
%% Matches any session for user 101 regardless of Token or CreatedAt
ets:match_object(Table, {session, '_', 101, '_'})
\`\`\`

### Match Specifications (\`ets:select/2\` & \`ets:select_delete/2\`)

When you need conditional filtering (e.g., *"Find all tokens expired before Timestamp X"* or *"Delete all expired tokens in one atomic scan"*), \`match_object\` is not enough. You must use **Match Specifications**:

A match spec is a list of three-element tuples:
\`\`\`erlang
[{HeadPattern, [GuardConditions], [ResultFormat]}]
\`\`\`

1. **Head Pattern**: Tuple structure using match variables (\`'$1'\`, \`'$2'\`, \`'$3'\`, \`'$4'\`).
2. **Guard Conditions**: Boolean test expressions using prefix notation: \`[{'<', '$4', CurrentTimestamp}]\`.
3. **Result Format**: What to return: \`['$2']\` (returns UserId), or \`[true]\` for \`select_delete\`.

### Why Match Specs are Dramatically Faster

When you call \`ets:select_delete(Tab, MatchSpec)\`:
- The entire scan and deletion happens **inside the ERTS C runtime**.
- Non-matching records are never copied onto the Erlang process heap.
- Memory from expired rows is freed immediately without generating garbage collection overhead!

### Parallel Worked Example: Expired Job Eviction

\`\`\`erlang
-module(job_cleaner).
-export([init_table/0, store_job/3, purge_completed/1]).

init_table() ->
    ets:new(jobs_tab, [set, public, named_table, {keypos, 2}]).

store_job(JobId, Status, CreatedAt) ->
    ets:insert(jobs_tab, {job, JobId, Status, CreatedAt}),
    ok.

purge_completed(CutoffTime) ->
    %% MatchSpec: delete all {job, JobId, completed, CreatedAt} where CreatedAt < CutoffTime
    MatchSpec = [
        {{job, '$1', completed, '$2'},
         [{'<', '$2', CutoffTime}],
         [true]}
    ],
    ets:select_delete(jobs_tab, MatchSpec).
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official ETS Match Calls (stdlib / ets)
ets:match_object(Tab, Pattern) -> [tuple()]
ets:select(Tab, MatchSpec) -> [term()]
ets:select_delete(Tab, MatchSpec) -> NumDeleted :: integer()
\`\`\`

## Assignment Specification

Implement module \`ets_query_engine\` exporting:
1. \`init_auth_table/0 -> ok\`:
   - Creates a \`named_table\` named \`auth_token_table\` with options \`[set, public, named_table, {keypos, 2}]\`.
   - If the table already exists, returns \`ok\`.
2. \`store_token(TokenBin, UserId, Role, ExpiresAt) -> ok\`:
   - Inserts \`{token, TokenBin, UserId, Role, ExpiresAt}\` into \`auth_token_table\`.
3. \`find_users_by_role(Role) -> [UserId]\`:
   - Uses match specs or \`ets:match_object/2\` to return a list of unique \`UserId\` integers possessing that \`Role\`.
4. \`delete_expired_tokens(CurrentTimestamp) -> integer()\`:
   - Uses \`ets:select_delete/2\` to atomically purge all records where \`ExpiresAt < CurrentTimestamp\`.
   - Returns the integer count of purged records.

## Rules & Verification Constraints
- Table must use \`{keypos, 2}\` so \`TokenBin\` is the primary key.
- \`delete_expired_tokens/1\` must use \`ets:select_delete/2\`.
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

init_auth_table() ->
    ok.

store_token(TokenBin, UserId, Role, ExpiresAt) ->
    ok.

find_users_by_role(Role) ->
    [].

delete_expired_tokens(CurrentTimestamp) ->
    0.
`,
    solutionCode: `-module(ets_query_engine).
-export([init_auth_table/0, store_token/4, find_users_by_role/1, delete_expired_tokens/1]).

-define(TAB, auth_token_table).

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

store_token(TokenBin, UserId, Role, ExpiresAt) ->
    ets:insert(?TAB, {token, TokenBin, UserId, Role, ExpiresAt}),
    ok.

find_users_by_role(Role) ->
    MatchSpec = [
        {{token, '_', '$1', Role, '_'}, [], ['$1']}
    ],
    lists:usort(ets:select(?TAB, MatchSpec)).

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

init_auth_table() ->
    ok.

store_token(TokenBin, UserId, Role, ExpiresAt) ->
    ok.

find_users_by_role(Role) ->
    [].

delete_expired_tokens(CurrentTimestamp) ->
    0.
`,
      },
    ],
    solutionFiles: {
      'src/ets_query_engine.erl': `-module(ets_query_engine).
-export([init_auth_table/0, store_token/4, find_users_by_role/1, delete_expired_tokens/1]).

-define(TAB, auth_token_table).

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

store_token(TokenBin, UserId, Role, ExpiresAt) ->
    ets:insert(?TAB, {token, TokenBin, UserId, Role, ExpiresAt}),
    ok.

find_users_by_role(Role) ->
    MatchSpec = [
        {{token, '_', '$1', Role, '_'}, [], ['$1']}
    ],
    lists:usort(ets:select(?TAB, MatchSpec)).

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
      requiredCalls: ['ets:new/2', 'ets:select_delete/2']
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

Here is the single most dangerous architectural trap in Erlang caching:
**An ETS table is bound to the lifetime of the process that created it.**

If process \`A\` calls \`ets:new(cache_tab, [named_table])\`, and process \`A\` crashes 10 minutes later due to an unhandled exception or memory spike, the BEAM VM **instantly wipes \`cache_tab\` from off-heap RAM**! All cached database records, session states, and rate-limit counters vanish in zero milliseconds.

Even worse: when your supervisor restarts process \`A\` as process \`A'\`, process \`A'\` starts with an empty cache, causing a catastrophic **Cache Stampede (Thundering Herd)** on your database!

To prevent this, OTP provides the **ETS Heir Protocol** (\`{heir, HeirPid, HeirData}\` and \`ets:give_away/3\`).

> [!IMPORTANT]
> **The ETS Heir Failover Handshake:**
> 1. **Worker boots:** Creates table with \`{heir, HeirPid, HeirData}\`.
> 2. **Worker crashes:** BEAM VM intercepts crash and atomically transfers ownership to Heir.
> 3. **Heir receives:** \`{'ETS-TRANSFER', Tab, DeadPid, HeirData}\`. Table is completely preserved.
> 4. **Supervisor restarts Worker:** Worker asks Heir for table. Heir calls \`ets:give_away(Tab, NewWorker, Data)\`.
> 5. **NewWorker receives:** \`{'ETS-TRANSFER', Tab, HeirPid, Data}\`. Zero lost cached data!

## Deep Concept Breakdown & Under the Hood

### Step 1: Declaring the Heir on Creation

\`\`\`erlang
ets:new(my_cache, [set, public, named_table, {heir, HeirPid, keep_alive}])
\`\`\`

If \`HeirPid\` terminates before the table owner, the heir setting is automatically reset to \`none\`. You can dynamically update the heir using:

\`\`\`erlang
ets:setopts(Tab, {heir, NewHeirPid, NewHeirData})
\`\`\`

### Step 2: The Heir Transfer Message

When the owning process dies, BEAM preserves the table in off-heap memory and delivers to the heir's mailbox:

\`\`\`erlang
{'ETS-TRANSFER', TableId, DeadOwnerPid, HeirData}
\`\`\`

### Step 3: Giving Away the Table (\`ets:give_away/3\`)

When the restarted worker process is ready to resume ownership, the heir calls:

\`\`\`erlang
ets:give_away(Tab, NewOwnerPid, GiftData)
\`\`\`

The new owner process receives \`{'ETS-TRANSFER', Tab, HeirPid, GiftData}\` and immediately becomes the full legal owner of the table!

### Parallel Worked Example: Resilient Session Vault

\`\`\`erlang
-module(resilient_vault).
-export([create_vault/2, handover_vault/3]).

create_vault(TableName, GuardianPid) ->
    ets:new(TableName, [
        set,
        public,
        named_table,
        {heir, GuardianPid, vault_heir_tag}
    ]).

handover_vault(TableName, NewWorkerPid, Tag) ->
    ets:give_away(TableName, NewWorkerPid, Tag).
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official ETS Heir Calls (stdlib / ets)
ets:setopts(Tab, Opts) -> true
  Opts = {heir, pid() | none, term()}

ets:give_away(Tab, Pid, GiftData) -> true
  Types:
    Tab = tab()
    Pid = pid()
    GiftData = term()
\`\`\`

## Assignment Specification

Implement module \`ets_heir_handshake\` exporting:
1. \`create_resilient_table(TableNameAtom, HeirPid) -> TableNameAtom\`:
   - Creates a named \`set\` table with \`[set, public, named_table, {heir, HeirPid, keep_alive}]\` and returns \`TableNameAtom\`.
2. \`start_guardian() -> {ok, pid()}\`:
   - Spawns a dedicated guardian process that runs \`guardian_loop/1\`.
3. \`reclaim_table(GuardianPid, Tab) -> ok\` OR \`reclaim_table(Tab, NewOwnerPid) -> ok\`:
   - If called with Guardian PID first: requests transfer and waits for \`{'ETS-TRANSFER', ...}\`.
   - If called with Table first: calls \`ets:give_away(Tab, NewOwnerPid, reclaimed)\`.
4. \`verify_heir_survival_demo() -> [tuple()]\`:
   - Spawns an heir process and a temporary worker that calls \`create_resilient_table(demo_heir_tab, HeirPid)\`, inserts \`{session_1, active}\`, kills the worker with \`exit(kill)\`, waits for \`{'ETS-TRANSFER', demo_heir_tab, _, keep_alive}\` in the heir, and returns \`ets:lookup(demo_heir_tab, session_1)\` (\`[{session_1, active}]\`).

## Rules & Verification Constraints
- Table must be created with \`{heir, HeirPid, keep_alive}\`.
- Must call \`ets:give_away/3\` during table restitution.
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

create_resilient_table(TableNameAtom, HeirPid) ->
    TableNameAtom.

start_guardian() ->
    {ok, self()}.

reclaim_table(GuardianPid, Tab) when is_pid(GuardianPid) ->
    ok;
reclaim_table(Tab, NewOwnerPid) when is_pid(NewOwnerPid) ->
    ok.

guardian_loop(State) ->
    ok.

verify_heir_survival_demo() ->
    [].
`,
    solutionCode: `-module(ets_heir_handshake).
-export([create_resilient_table/2, reclaim_table/2, verify_heir_survival_demo/0]).
-export([start_guardian/0, guardian_loop/1]).

create_resilient_table(TableNameAtom, HeirPid) ->
    ets:new(TableNameAtom, [
        set,
        public,
        named_table,
        {heir, HeirPid, keep_alive}
    ]),
    TableNameAtom.

start_guardian() ->
    Pid = spawn_link(?MODULE, guardian_loop, [#{}]),
    {ok, Pid}.

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

create_resilient_table(TableNameAtom, HeirPid) ->
    TableNameAtom.

start_guardian() ->
    {ok, self()}.

reclaim_table(GuardianPid, Tab) when is_pid(GuardianPid) ->
    ok;
reclaim_table(Tab, NewOwnerPid) when is_pid(NewOwnerPid) ->
    ok.

guardian_loop(State) ->
    ok.

verify_heir_survival_demo() ->
    [].
`,
      },
    ],
    solutionFiles: {
      'src/ets_heir_handshake.erl': `-module(ets_heir_handshake).
-export([create_resilient_table/2, reclaim_table/2, verify_heir_survival_demo/0]).
-export([start_guardian/0, guardian_loop/1]).

create_resilient_table(TableNameAtom, HeirPid) ->
    ets:new(TableNameAtom, [
        set,
        public,
        named_table,
        {heir, HeirPid, keep_alive}
    ]),
    TableNameAtom.

start_guardian() ->
    Pid = spawn_link(?MODULE, guardian_loop, [#{}]),
    {ok, Pid}.

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
        erlangCall: 'begin catch ets:delete(resilient_cache), {ok, Guardian} = ets_heir_handshake:start_guardian(), Creator = spawn(fun() -> Tab = ets_heir_handshake:create_resilient_table(resilient_cache, Guardian), ets:insert(Tab, {k1, <<"persistent_value">>}), timer:sleep(10), exit(intentional_crash) end), timer:sleep(50), Info = ets:info(resilient_cache), OwnerIsGuardian = (proplists:get_value(owner, Info) =:= Guardian), ok = ets_heir_handshake:reclaim_table(Guardian, resilient_cache), [{k1, Val}] = ets:lookup(resilient_cache, k1), Guardian ! stop, {OwnerIsGuardian, Val} end',
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

Erlang's actor model was designed from day one for distributed computing. In Erlang, sending a message to a process on the same machine (\`Pid ! Message\`) uses the exact same syntax and semantics as sending a message to a process on a machine 5,000 miles away!

When building real-time global systems like WhatsApp, Discord, or multiplayer game servers:
1. **Mesh Clustering**: Multiple BEAM instances automatically discover and connect to each other.
2. **Magic Cookies**: Clusters enforce cryptographic authentication so unauthorized nodes cannot connect to the mesh.
3. **Decentralized Pub/Sub with \`pg\`**: In OTP 23+, the \`pg\` module replaced legacy \`pg2\`. It maintains distributed topic groups across all connected nodes without a single point of failure or centralized master process!

> [!NOTE]
> **Distributed Erlang Primitives:**
> - **\`node/0\`**: Returns the name of the current BEAM node (e.g. \`app@node1.lan\`).
> - **\`nodes/0\`**: Returns a list of all currently connected peer nodes in the cluster.
> - **\`erlang:get_cookie/0\`**: Returns the secret cookie token securing the cluster.
> - **\`rpc:call/5\`**: Executes a function on a remote node synchronously with a timeout.

## Deep Concept Breakdown & Under the Hood

### Node Naming and Magic Cookies

To enable distributed clustering, a BEAM node is started with either a short name or a fully qualified domain name:
- Short name: \`erl -sname node_a -setcookie secret_cluster_key\`
- Long name: \`erl -name app@10.0.0.1 -setcookie secret_cluster_key\`

When \`node_a\` connects to \`node_b\` (e.g. via \`net_adm:ping('node_b@host')\`), the Erlang Port Mapper Daemon (EPMD) negotiates a TLS or TCP handshake. The nodes exchange MD5 challenge digests derived from the magic cookie. If the cookies match, the nodes merge into a fully connected mesh!

### Location-Transparent Remote Procedure Calls (\`rpc:call/4,5\`)

\`\`\`erlang
rpc:call(TargetNode, Module, Function, Args, TimeoutMs) -> Result | {badrpc, Reason}
\`\`\`

If \`TargetNode\` is unreachable or execution exceeds \`TimeoutMs\`, \`rpc:call\` returns \`{badrpc, nodedown}\` or \`{badrpc, timeout}\`. In production, always normalize \`{badrpc, Reason}\` to clean \`{error, {rpc_failed, Reason}}\` tuples.

### Decentralized Process Groups with \`pg\` (OTP 23+)

The \`pg\` module manages distributed process groups:
- **\`pg:start_link/0\`**: Boots the default scope process.
- **\`pg:join(Topic, Pid)\`**: Adds \`Pid\` to the group \`Topic\`. This membership is broadcast to all nodes.
- **\`pg:get_members(Topic)\`**: Returns all live PIDs across the entire cluster subscribed to \`Topic\`.
- **\`pg:leave(Topic, Pid)\`**: Unsubscribes \`Pid\` from \`Topic\`.
- **Automatic Monitor Cleanup**: If any subscribed process crashes, \`pg\` automatically detects its demise via monitors and removes it from the group across all nodes!

### Parallel Worked Example: Cluster Health Monitor

\`\`\`erlang
-module(cluster_health).
-export([ping_peer/1, broadcast_heartbeat/2]).

ping_peer(Node) ->
    case rpc:call(Node, erlang, is_alive, [], 1000) of
        true ->
            {ok, alive};
        {badrpc, Reason} ->
            {error, {peer_down, Reason}}
    end.

broadcast_heartbeat(Topic, Payload) ->
    case whereis(pg) of
        undefined -> pg:start_link();
        _ -> ok
    end,
    Members = pg:get_members(Topic),
    [P ! {heartbeat, Topic, Payload} || P <- Members],
    {sent, length(Members)}.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official Distributed Calls (kernel / rpc & pg)
rpc:call(Node, Module, Function, Args, Timeout) -> Res | {badrpc, Reason}
pg:start_link() -> {ok, pid()} | {error, term()}
pg:join(Group, PidOrPids) -> ok
pg:leave(Group, PidOrPids) -> ok
pg:get_members(Group) -> [pid()]
\`\`\`

## Assignment Specification

Implement module \`cluster_pubsub_pg\` exporting:
1. \`cluster_node_info/0 -> map()\`:
   - Returns \`#{self_node => node(), connected_peers => nodes(), alive => is_alive()}\`.
2. \`safe_remote_call(TargetNode, Mod, Fun, Args) -> {ok, Result} | {error, {rpc_failed, Reason}}\`:
   - Calls \`rpc:call(TargetNode, Mod, Fun, Args, 2000)\`.
   - Normalizes \`{badrpc, Reason}\` into \`{error, {rpc_failed, Reason}}\`.
   - Returns \`{ok, Result}\` on success.
3. \`join_topic(Topic, Pid) -> ok\`:
   - Ensures \`pg\` is started (\`case whereis(pg) of undefined -> pg:start_link(); _ -> ok end\`).
   - Calls \`pg:join(Topic, Pid)\` and returns \`ok\`.
4. \`publish_to_topic(Topic, Message) -> {published, integer()}\`:
   - Fetches \`Members = pg:get_members(Topic)\`.
   - Sends \`P ! {pubsub, Topic, Message}\` and \`P ! {pubsub_msg, Topic, Message}\` to each member.
   - Returns \`{published, length(Members)}\`.
5. \`leave_topic(Topic, Pid) -> ok\`:
   - Calls \`pg:leave(Topic, Pid)\` and returns \`ok\`.
6. Companion helpers:
   - \`broadcast(Topic, Message)\`: Alias for \`publish_to_topic\` returning \`{ok, Count}\`.
   - \`get_subscribers(Topic)\`: Returns \`pg:get_members(Topic)\`.
   - \`init_pubsub()\`: Boots \`pg\` if not already running.

## Rules & Verification Constraints
- Must use OTP 23+ \`pg\` primitives.
- Must handle RPC failures cleanly with 2000ms timeout.
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

cluster_node_info() ->
    #{}.

safe_remote_call(TargetNode, Mod, Fun, Args) ->
    {ok, ok}.

join_topic(Topic, Pid) ->
    ok.

publish_to_topic(Topic, Message) ->
    {published, 0}.

leave_topic(Topic, Pid) ->
    ok.

init_pubsub() ->
    ok.

broadcast(Topic, Message) ->
    {ok, 0}.

get_subscribers(Topic) ->
    [].
`,
    solutionCode: `-module(cluster_pubsub_pg).
-export([cluster_node_info/0, safe_remote_call/4, join_topic/2, publish_to_topic/2, leave_topic/2]).
-export([init_pubsub/0, broadcast/2, get_subscribers/1]).

cluster_node_info() ->
    #{
        self_node => node(),
        connected_peers => nodes(),
        alive => is_alive()
    }.

safe_remote_call(TargetNode, Mod, Fun, Args) ->
    case rpc:call(TargetNode, Mod, Fun, Args, 2000) of
        {badrpc, Reason} ->
            {error, {rpc_failed, Reason}};
        Result ->
            {ok, Result}
    end.

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

join_topic(Topic, Pid) ->
    init_pubsub(),
    pg:join(Topic, Pid).

publish_to_topic(Topic, Message) ->
    init_pubsub(),
    Members = pg:get_members(Topic),
    [begin
        P ! {pubsub, Topic, Message},
        P ! {pubsub_msg, Topic, Message}
     end || P <- Members],
    {published, length(Members)}.

broadcast(Topic, Message) ->
    {published, Count} = publish_to_topic(Topic, Message),
    {ok, Count}.

leave_topic(Topic, Pid) ->
    init_pubsub(),
    pg:leave(Topic, Pid).

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

cluster_node_info() ->
    #{}.

safe_remote_call(TargetNode, Mod, Fun, Args) ->
    {ok, ok}.

join_topic(Topic, Pid) ->
    ok.

publish_to_topic(Topic, Message) ->
    {published, 0}.

leave_topic(Topic, Pid) ->
    ok.

init_pubsub() ->
    ok.

broadcast(Topic, Message) ->
    {ok, 0}.

get_subscribers(Topic) ->
    [].
`,
      },
    ],
    solutionFiles: {
      'src/cluster_pubsub_pg.erl': `-module(cluster_pubsub_pg).
-export([cluster_node_info/0, safe_remote_call/4, join_topic/2, publish_to_topic/2, leave_topic/2]).
-export([init_pubsub/0, broadcast/2, get_subscribers/1]).

cluster_node_info() ->
    #{
        self_node => node(),
        connected_peers => nodes(),
        alive => is_alive()
    }.

safe_remote_call(TargetNode, Mod, Fun, Args) ->
    case rpc:call(TargetNode, Mod, Fun, Args, 2000) of
        {badrpc, Reason} ->
            {error, {rpc_failed, Reason}};
        Result ->
            {ok, Result}
    end.

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

join_topic(Topic, Pid) ->
    init_pubsub(),
    pg:join(Topic, Pid).

publish_to_topic(Topic, Message) ->
    init_pubsub(),
    Members = pg:get_members(Topic),
    [begin
        P ! {pubsub, Topic, Message},
        P ! {pubsub_msg, Topic, Message}
     end || P <- Members],
    {published, length(Members)}.

broadcast(Topic, Message) ->
    {published, Count} = publish_to_topic(Topic, Message),
    {ok, Count}.

leave_topic(Topic, Pid) ->
    init_pubsub(),
    pg:leave(Topic, Pid).

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

ETS gives you nanosecond-speed single-operation in-memory lookups. **However, ETS has no multi-row ACID transactions.**

Consider transferring $50 from Alice's wallet to Bob's wallet:
1. In ETS, you call \`ets:update_counter\` to subtract $50 from Alice.
2. The server crashes due to power outage, OOM, or hardware failure before step 2 executes.
3. Bob never receives the $50, and Alice's money has permanently vanished!

For financial ledgers, inventory balances, and replicated state machines, you need **multi-operation ACID transactions**. Erlang includes **Mnesia**, an ACID-compliant distributed DBMS embedded directly in the BEAM VM.

> [!NOTE]
> **Key Capabilities of Mnesia:**
> - **Embedded in BEAM**: Zero network socket roundtrip; queries execute directly in VM memory.
> - **Multi-Row ACID Transactions**: All operations inside \`mnesia:transaction(Fun)\` commit together or roll back completely on failure.
> - **Hybrid Storage Modes**: Tables can be stored in RAM (\`ram_copies\`), on disk using DETS (\`disc_copies\`), or logged to disk (\`disc_only_copies\`).
> - **Cluster Replication**: Tables replicate seamlessly across connected BEAM nodes.

## Deep Concept Breakdown & Under the Hood

### Record-Based Table Definitions

Mnesia tables are defined from Erlang records:

\`\`\`erlang
-record(wallet, {owner, balance}).

setup_tables() ->
    mnesia:start(),
    mnesia:create_table(wallet, [
        {attributes, record_info(fields, wallet)},
        {ram_copies, [node()]}
    ]),
    mnesia:wait_for_tables([wallet], 2000).
\`\`\`

### Atomic Transactions (\`mnesia:transaction/1\`)

All reads and writes inside a transactional fun acquire row-level locks and buffer modifications in an in-memory transaction store:

\`\`\`erlang
TransferFun = fun() ->
    case mnesia:read(wallet, FromOwner) of
        [] -> mnesia:abort(account_not_found);
        [#wallet{balance = FromBal}] when FromBal < Amount ->
            mnesia:abort(insufficient_funds);
        [#wallet{balance = FromBal}] ->
            case mnesia:read(wallet, ToOwner) of
                [] -> mnesia:abort(account_not_found);
                [#wallet{balance = ToBal}] ->
                    mnesia:write(#wallet{owner = FromOwner, balance = FromBal - Amount}),
                    mnesia:write(#wallet{owner = ToOwner, balance = ToBal + Amount}),
                    {FromBal - Amount, ToBal + Amount}
            end
    end
end,
case mnesia:transaction(TransferFun) of
    {atomic, Result} -> {ok, Result};
    {aborted, Reason} -> {error, Reason}
end.
\`\`\`

### The Guarantee of \`mnesia:abort/1\`

When \`mnesia:abort(Reason)\` is called (or if the transaction fun crashes with an exception):
- **100% of writes performed in that transaction are discarded.**
- No partial writes ever touch the underlying table!
- All acquired locks are released immediately.

### Parallel Worked Example: Inventory Reservation Store

\`\`\`erlang
-module(inventory_txn_store).
-record(item, {sku, quantity}).
-export([init_store/0, reserve_item/2]).

init_store() ->
    mnesia:start(),
    mnesia:create_table(item, [{attributes, record_info(fields, item)}]),
    mnesia:wait_for_tables([item], 2000).

reserve_item(Sku, Qty) ->
    Txn = fun() ->
        case mnesia:read(item, Sku) of
            [] -> mnesia:abort(item_not_found);
            [#item{quantity = Stock}] when Stock < Qty ->
                mnesia:abort(out_of_stock);
            [#item{quantity = Stock}] ->
                mnesia:write(#item{sku = Sku, quantity = Stock - Qty}),
                Stock - Qty
        end
    end,
    case mnesia:transaction(Txn) of
        {atomic, Remaining} -> {ok, Remaining};
        {aborted, Reason} -> {error, Reason}
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official Mnesia Calls (mnesia)
mnesia:start() -> ok | {error, Reason}
mnesia:create_table(Name, TabDef) -> {atomic, ok} | {aborted, Reason}
mnesia:transaction(Fun) -> {atomic, Result} | {aborted, Reason}
mnesia:read(Tab, Key) -> [record()]
mnesia:write(Record) -> ok
mnesia:abort(Reason) -> no_return()
\`\`\`

## Assignment Specification

Implement module \`mnesia_ledger\` exporting:
- Define record: \`-record(wallet, {owner, balance}).\`
1. \`setup_mnesia_table/0 -> ok\`:
   - Calls \`mnesia:start()\`.
   - Creates table \`wallet\` with \`[{attributes, record_info(fields, wallet)}, {ram_copies, [node()]}]\` (handling \`{already_exists, wallet}\`).
   - Waits for the table via \`mnesia:wait_for_tables([wallet], 2000)\` and returns \`ok\`.
2. \`upsert_wallet(Owner, Balance) -> ok\`:
   - Runs a transaction that calls \`mnesia:write(#wallet{owner = Owner, balance = Balance})\`.
   - Returns \`ok\`.
3. \`atomic_transfer(FromOwner, ToOwner, Amount) -> {ok, NewFrom, NewTo} | {error, Reason}\`:
   - Enforces \`Amount > 0\`.
   - Reads \`FromOwner\` and \`ToOwner\`. If either is missing, calls \`mnesia:abort(account_not_found)\`.
   - If \`FromBal < Amount\`, calls \`mnesia:abort(insufficient_funds)\`.
   - Writes updated balances for both accounts and returns \`{FromBal - Amount, ToBal + Amount}\`.
   - Returns \`{ok, NewFrom, NewTo}\` on commit, or \`{error, Reason}\` on abort.
4. \`get_wallet_balance(Owner) -> {ok, integer()} | {error, not_found}\`:
   - Reads the record in a transaction and returns \`{ok, Balance}\` or \`{error, not_found}\`.

## Rules & Verification Constraints
- Must define \`-record(wallet, {owner, balance}).\`
- Must use \`mnesia:transaction/1\`, \`mnesia:read/2\`, \`mnesia:write/1\`, and \`mnesia:abort/1\`.
- Overdraft attempts must abort and leave both account balances completely unchanged.
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

setup_mnesia_table() ->
    ok.

upsert_wallet(Owner, Balance) ->
    ok.

atomic_transfer(FromOwner, ToOwner, Amount) when Amount > 0 ->
    {error, not_implemented}.

get_wallet_balance(Owner) ->
    {error, not_found}.
`,
    solutionCode: `-module(mnesia_ledger).
-export([setup_mnesia_table/0, upsert_wallet/2, atomic_transfer/3, get_wallet_balance/1]).

-record(wallet, {owner, balance}).

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

upsert_wallet(Owner, Balance) ->
    Tx = fun() ->
        mnesia:write(#wallet{owner = Owner, balance = Balance})
    end,
    case mnesia:transaction(Tx) of
        {atomic, ok} -> ok;
        {aborted, Reason} -> {error, Reason}
    end.

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

setup_mnesia_table() ->
    ok.

upsert_wallet(Owner, Balance) ->
    ok.

atomic_transfer(FromOwner, ToOwner, Amount) when Amount > 0 ->
    {error, not_implemented}.

get_wallet_balance(Owner) ->
    {error, not_found}.
`,
      },
    ],
    solutionFiles: {
      'src/mnesia_ledger.erl': `-module(mnesia_ledger).
-export([setup_mnesia_table/0, upsert_wallet/2, atomic_transfer/3, get_wallet_balance/1]).

-record(wallet, {owner, balance}).

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

upsert_wallet(Owner, Balance) ->
    Tx = fun() ->
        mnesia:write(#wallet{owner = Owner, balance = Balance})
    end,
    case mnesia:transaction(Tx) of
        {atomic, ok} -> ok;
        {aborted, Reason} -> {error, Reason}
    end.

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
        erlangCall: 'begin {error, insufficient_funds} = mnesia_ledger:atomic_transfer(alice, bob, 500), {mnesia_ledger:get_wallet_balance(alice), mnesia_ledger:get_wallet_balance(bob)} end',
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

In mission-critical BEAM architectures, dynamic typing gives incredible development velocity and runtime hot-code loading. But how do telecom switches, banking ledgers, and payment platforms guarantee that a function never crashes with a \`function_clause\` or \`badarith\` error in production?

The Erlang ecosystem solves this with a two-tiered Quality Assurance pipeline:
1. **Dialyzer (Discrepancy Analyzer for Erlang)**: Uses **Success Typing** to statically analyze your code without running it. It verifies that function arguments and return types strictly obey your \`-spec\` and \`-type\` declarations, catching type errors, dead code, and broken contracts at compile time!
2. **EUnit**: The standard unit testing framework built into OTP. EUnit allows developers to write unit tests directly alongside code, supporting assert macros (\`?assertEqual\`), test generators (\`?_assertEqual\`), and fixture setup/teardown pipelines.

> [!NOTE]
> **Static Checking vs Unit Testing:**
> - **Dialyzer (\`-spec\`):** Proves mathematically that no inputs will violate the declared types across all execution branches.
> - **EUnit (\`eunit.hrl\`):** Proves behaviorally that concrete execution produces the expected business logic results.

## Deep Concept Breakdown & Under the Hood

### Dialyzer Type Specifications (\`-type\` and \`-spec\`)

\`\`\`erlang
-type currency() :: usd | eur | etb.
-type balance() :: non_neg_integer().

-spec calculate_fee(pos_integer(), currency()) -> non_neg_integer().
calculate_fee(Amount, usd) -> (Amount * 15) div 1000;
calculate_fee(Amount, eur) -> (Amount * 20) div 1000;
calculate_fee(Amount, etb) -> (Amount * 10) div 1000.
\`\`\`

If you pass an atom \`gbp\` to \`calculate_fee/2\`, Dialyzer detects that the contract is breached before your code ever deploys to production!

### EUnit Test Assertions and Test Generators

When you include \`-include_lib("eunit/include/eunit.hrl").\`:
1. **Immediate Assertions**:
   - \`?assertEqual(Expected, Expression)\`: Evaluates \`Expression\` immediately and raises an exception if not identical (\`=: = \`).
   - \`?assertMatch(Pattern, Expression)\`: Matches result against a pattern.
   - \`?assertError(Reason, Expression)\`: Asserts that \`Expression\` crashes with error \`Reason\`.
2. **Test Generators (\`_test_()\` Functions)**:
   Functions ending in \`_test_()\` return a test representation (or list of tests) to be executed by EUnit. They use underscore-prefixed macros:
   - \`?_assertEqual(Expected, Expression)\`: Returns an executable fun test object.

### Parallel Worked Example: Pricing Contract with EUnit

\`\`\`erlang
-module(pricing_contract).
-include_lib("eunit/include/eunit.hrl").

-type plan() :: free | pro | enterprise.
-spec discount(pos_integer(), plan()) -> non_neg_integer().
discount(Amount, free) -> 0;
discount(Amount, pro) -> (Amount * 10) div 100;
discount(Amount, enterprise) -> (Amount * 25) div 100.

pricing_test_() ->
    [
        ?_assertEqual(0, discount(100, free)),
        ?_assertEqual(10, discount(100, pro)),
        ?_assertEqual(25, discount(100, enterprise))
    ].
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official EUnit Macros (eunit/include/eunit.hrl)
?assertEqual(Expected, Expr)
?assertMatch(Pattern, Expr)
?assertError(Reason, Expr)

?_assertEqual(Expected, Expr)
?_assertMatch(Pattern, Expr)
\`\`\`

## Assignment Specification

Implement module \`ledger_specs_and_tests\` exporting:
1. \`calculate_fee(Amount, Currency) -> non_neg_integer()\`:
   - \`-type currency() :: usd | eur | etb.\`
   - \`-spec calculate_fee(pos_integer(), currency()) -> non_neg_integer().\`
   - Returns fee: \`usd\` -> \`(Amount * 15) div 1000\`, \`eur\` -> \`(Amount * 20) div 1000\`, \`etb\` -> \`(Amount * 10) div 1000\`.
2. \`validate_transfer_spec(Balance, Amount, Currency) -> {ok, Remaining} | {error, Reason}\`:
   - \`-spec validate_transfer_spec(non_neg_integer(), integer(), currency()) -> {ok, non_neg_integer()} | {error, insufficient_funds | invalid_amount}.\`
   - Rejects \`Amount =< 0\` with \`{error, invalid_amount}\`.
   - Computes \`TotalDeduction = Amount + calculate_fee(Amount, Currency)\`.
   - If \`Balance < TotalDeduction\`, returns \`{error, insufficient_funds}\`.
   - Otherwise returns \`{ok, Balance - TotalDeduction}\`.
3. \`run_unit_checks/0 -> ok\` AND \`run_unit_tests/0 -> ok\`:
   - Runs built-in EUnit tests for the functions and returns \`ok\`.

## Rules & Verification Constraints
- Must define type specs using \`-spec\` and \`-type\`.
- Must include \`-include_lib("eunit/include/eunit.hrl").\`
`,
    otpDocCards: [
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

-type currency() :: usd | eur | etb.

calculate_fee(Amount, Currency) ->
    0.

validate_transfer_spec(Balance, Amount, Currency) ->
    {error, not_implemented}.

run_unit_checks() ->
    ok.

run_unit_tests() ->
    ok.
`,
    solutionCode: `-module(ledger_specs_and_tests).
-include_lib("eunit/include/eunit.hrl").

-export([calculate_fee/2, validate_transfer_spec/3, run_unit_checks/0, run_unit_tests/0]).

-type currency() :: usd | eur | etb.

-spec calculate_fee(pos_integer(), currency()) -> non_neg_integer().
calculate_fee(Amount, usd) when Amount > 0 -> (Amount * 15) div 1000;
calculate_fee(Amount, eur) when Amount > 0 -> (Amount * 20) div 1000;
calculate_fee(Amount, etb) when Amount > 0 -> (Amount * 10) div 1000.

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

run_unit_checks() ->
    case eunit:test(?MODULE, [quiet]) of
        ok -> ok;
        _ -> {error, tests_failed}
    end.

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

-type currency() :: usd | eur | etb.

calculate_fee(Amount, Currency) ->
    0.

validate_transfer_spec(Balance, Amount, Currency) ->
    {error, not_implemented}.

run_unit_checks() ->
    ok.

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

-spec calculate_fee(pos_integer(), currency()) -> non_neg_integer().
calculate_fee(Amount, usd) when Amount > 0 -> (Amount * 15) div 1000;
calculate_fee(Amount, eur) when Amount > 0 -> (Amount * 20) div 1000;
calculate_fee(Amount, etb) when Amount > 0 -> (Amount * 10) div 1000.

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

run_unit_checks() ->
    case eunit:test(?MODULE, [quiet]) of
        ok -> ok;
        _ -> {error, tests_failed}
    end.

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
      requiredCalls: ['ledger_specs_and_tests:calculate_fee/2']
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
      symptom: 'Every time a malformed request crashes the session_cache worker, all 250,000 logged-in users are simultaneously logged out and forced to re-authenticate!',
      rootCauseHint: 'create_session_table/1 calls ets:new(incident_sessions_tab, [set, public, named_table]) without a {heir, HeirPid, keep_alive} option, and transfer_to_restarted_worker/2 fails to call ets:give_away/3.',
      fixObjective: 'Add {heir, HeirPid, keep_alive} to ets:new/2 in create_session_table/1 and implement ets:give_away(Tab, NewWorkerPid, keep_alive) in transfer_to_restarted_worker/2.'
    },
    conceptMarkdown: `## Production Incident Post-Mortem

At 14:22 UTC, an unhandled binary parsing exception crashed our authentication cache worker (\`session_manager\`). Although the OTP supervisor instantly restarted the worker in **1.8 milliseconds**, over **250,000 active sessions vanished from memory**. Customers worldwide were logged out mid-checkout, generating an avalanche of customer support tickets!

## Under the Hood: ETS Table Ownership Semantics

In the BEAM VM, an ETS table does NOT belong to the node or the supervisor — it is strictly owned by the **creating process**:

1. When a process calls \`ets:new(Name, Options)\`, that process becomes the sole **owner**.
2. If the owner process dies, the BEAM VM automatically deletes the table from off-heap RAM and frees all allocated memory.
3. If an OTP supervisor restarts the worker, the new worker receives a completely **empty** brand-new ETS table!

\`\`\`erlang
%% BUGGY CODE: No heir specified!
create_session_table(HeirPid) ->
    %% Missing {heir, HeirPid, keep_alive}!
    %% When caller dies, this table is destroyed instantly!
    ets:new(incident_sessions_tab, [set, public, named_table]).
\`\`\`

## The Production Pattern: The ETS Heir Handshake

To achieve zero-downtime, zero-loss crash resilience for in-memory state:

1. **Designate an Heir**: An upstream guardian process is designated as the table's heir via **\`{heir, HeirPid, keep_alive}\`**:
   \`\`\`erlang
   ets:new(incident_sessions_tab, [
       set,
       public,
       named_table,
       {read_concurrency, true},
       {heir, HeirPid, keep_alive}
   ]).
   \`\`\`
2. **Automatic Handover on Crash**: When the cache worker terminates, the BEAM runtime preserves the ETS table in off-heap RAM and reassigns ownership to \`HeirPid\`. The heir receives a special message in its mailbox:
   \`\`\`erlang
   {'ETS-TRANSFER', TableId, FormerOwnerPid, keep_alive}
   \`\`\`
3. **Restitution via \`ets:give_away/3\`**: When the supervisor restarts the cache worker, the heir transfers the preserved ETS table back to the new worker PID:
   \`\`\`erlang
   transfer_to_restarted_worker(TableId, NewWorkerPid, GiftData) ->
       ets:give_away(TableId, NewWorkerPid, GiftData).
   \`\`\`
All 250,000 user sessions survive the crash with zero data loss!
`,
    otpDocCards: [
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

create_session_table(_HeirPid) ->
    ets:new(incident_sessions_tab, [set, public, {read_concurrency, true}]).

store_session(Tab, SessionId, UserId) ->
    ets:insert(Tab, {SessionId, UserId, os:system_time(millisecond)}),
    ok.

put_session(Tab, SessionId, UserId) ->
    store_session(Tab, SessionId, UserId).

fetch_session(Tab, SessionId) ->
    case ets:lookup(Tab, SessionId) of
        [{SessionId, UserId, _Time}] -> {ok, UserId};
        [] -> {error, not_found}
    end.

get_session(Tab, SessionId) ->
    fetch_session(Tab, SessionId).

transfer_to_restarted_worker(Tab, NewWorkerPid) ->
    transfer_to_restarted_worker(Tab, NewWorkerPid, keep_alive).

transfer_to_restarted_worker(_Tab, _NewWorkerPid, _GiftData) ->
    ok.

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
                end
        after 1000 ->
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
    receive {heir_got_table, Tab} -> ok end,
    NewWorker = spawn(fun() ->
        receive
            {'ETS-TRANSFER', NTab, _Heir, restored} ->
                {ok, U1} = fetch_session(NTab, <<"sess_1">>),
                {ok, U2} = fetch_session(NTab, <<"sess_2">>),
                {ok, U3} = fetch_session(NTab, <<"sess_3">>),
                Parent ! {new_worker_verified, [U1, U2, U3]},
                ets:delete(NTab)
        end
    end),
    Heir ! {give_to, NewWorker},
    receive giveaway_done -> ok end,
    receive
        {new_worker_verified, [101, 102, 103]} -> {ok, 3, survived}
    after 1000 ->
        {error, survival_test_failed}
    end.
`,
    solutionCode: `-module(incident_ets_wipeout).
-export([create_session_table/1, store_session/3, put_session/3, fetch_session/2, get_session/2]).
-export([transfer_to_restarted_worker/2, transfer_to_restarted_worker/3]).
-export([audit_table_heir/0, test_heir_handover/0]).

create_session_table(HeirPid) ->
    ets:new(incident_sessions_tab, [
        set,
        public,
        {read_concurrency, true},
        {heir, HeirPid, keep_alive}
    ]).

store_session(Tab, SessionId, UserId) ->
    ets:insert(Tab, {SessionId, UserId, os:system_time(millisecond)}),
    ok.

put_session(Tab, SessionId, UserId) ->
    store_session(Tab, SessionId, UserId).

fetch_session(Tab, SessionId) ->
    case ets:lookup(Tab, SessionId) of
        [{SessionId, UserId, _Time}] -> {ok, UserId};
        [] -> {error, not_found}
    end.

get_session(Tab, SessionId) ->
    fetch_session(Tab, SessionId).

transfer_to_restarted_worker(Tab, NewWorkerPid) ->
    transfer_to_restarted_worker(Tab, NewWorkerPid, keep_alive).

transfer_to_restarted_worker(Tab, NewWorkerPid, GiftData) ->
    ets:give_away(Tab, NewWorkerPid, GiftData),
    ok.

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
                end
        after 1000 ->
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
    receive {heir_got_table, Tab} -> ok end,
    NewWorker = spawn(fun() ->
        receive
            {'ETS-TRANSFER', NTab, _Heir, restored} ->
                {ok, U1} = fetch_session(NTab, <<"sess_1">>),
                {ok, U2} = fetch_session(NTab, <<"sess_2">>),
                {ok, U3} = fetch_session(NTab, <<"sess_3">>),
                Parent ! {new_worker_verified, [U1, U2, U3]},
                ets:delete(NTab)
        end
    end),
    Heir ! {give_to, NewWorker},
    receive giveaway_done -> ok end,
    receive
        {new_worker_verified, [101, 102, 103]} -> {ok, 3, survived}
    after 1000 ->
        {error, survival_test_failed}
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

create_session_table(_HeirPid) ->
    ets:new(incident_sessions_tab, [set, public, {read_concurrency, true}]).

store_session(Tab, SessionId, UserId) ->
    ets:insert(Tab, {SessionId, UserId, os:system_time(millisecond)}),
    ok.

put_session(Tab, SessionId, UserId) ->
    store_session(Tab, SessionId, UserId).

fetch_session(Tab, SessionId) ->
    case ets:lookup(Tab, SessionId) of
        [{SessionId, UserId, _Time}] -> {ok, UserId};
        [] -> {error, not_found}
    end.

get_session(Tab, SessionId) ->
    fetch_session(Tab, SessionId).

transfer_to_restarted_worker(Tab, NewWorkerPid) ->
    transfer_to_restarted_worker(Tab, NewWorkerPid, keep_alive).

transfer_to_restarted_worker(_Tab, _NewWorkerPid, _GiftData) ->
    ok.

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
                end
        after 1000 ->
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
    receive {heir_got_table, Tab} -> ok end,
    NewWorker = spawn(fun() ->
        receive
            {'ETS-TRANSFER', NTab, _Heir, restored} ->
                {ok, U1} = fetch_session(NTab, <<"sess_1">>),
                {ok, U2} = fetch_session(NTab, <<"sess_2">>),
                {ok, U3} = fetch_session(NTab, <<"sess_3">>),
                Parent ! {new_worker_verified, [U1, U2, U3]},
                ets:delete(NTab)
        end
    end),
    Heir ! {give_to, NewWorker},
    receive giveaway_done -> ok end,
    receive
        {new_worker_verified, [101, 102, 103]} -> {ok, 3, survived}
    after 1000 ->
        {error, survival_test_failed}
    end.
`,
      },
    ],
    solutionFiles: {
      'src/incident_ets_wipeout.erl': `-module(incident_ets_wipeout).
-export([create_session_table/1, store_session/3, put_session/3, fetch_session/2, get_session/2]).
-export([transfer_to_restarted_worker/2, transfer_to_restarted_worker/3]).
-export([audit_table_heir/0, test_heir_handover/0]).

create_session_table(HeirPid) ->
    ets:new(incident_sessions_tab, [
        set,
        public,
        {read_concurrency, true},
        {heir, HeirPid, keep_alive}
    ]).

store_session(Tab, SessionId, UserId) ->
    ets:insert(Tab, {SessionId, UserId, os:system_time(millisecond)}),
    ok.

put_session(Tab, SessionId, UserId) ->
    store_session(Tab, SessionId, UserId).

fetch_session(Tab, SessionId) ->
    case ets:lookup(Tab, SessionId) of
        [{SessionId, UserId, _Time}] -> {ok, UserId};
        [] -> {error, not_found}
    end.

get_session(Tab, SessionId) ->
    fetch_session(Tab, SessionId).

transfer_to_restarted_worker(Tab, NewWorkerPid) ->
    transfer_to_restarted_worker(Tab, NewWorkerPid, keep_alive).

transfer_to_restarted_worker(Tab, NewWorkerPid, GiftData) ->
    ets:give_away(Tab, NewWorkerPid, GiftData),
    ok.

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
                end
        after 1000 ->
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
    receive {heir_got_table, Tab} -> ok end,
    NewWorker = spawn(fun() ->
        receive
            {'ETS-TRANSFER', NTab, _Heir, restored} ->
                {ok, U1} = fetch_session(NTab, <<"sess_1">>),
                {ok, U2} = fetch_session(NTab, <<"sess_2">>),
                {ok, U3} = fetch_session(NTab, <<"sess_3">>),
                Parent ! {new_worker_verified, [U1, U2, U3]},
                ets:delete(NTab)
        end
    end),
    Heir ! {give_to, NewWorker},
    receive giveaway_done -> ok end,
    receive
        {new_worker_verified, [101, 102, 103]} -> {ok, 3, survived}
    after 1000 ->
        {error, survival_test_failed}
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

In a high-scale production backend, authentication tokens and session payloads are checked on every single inbound HTTP or WebSocket request. If your session store lives in an ordinary \`gen_server\`, that process becomes a single-threaded bottleneck for thousands of concurrent requests.

By combining **ETS** with the **Heir Failover Handshake**, you achieve the holy grail of distributed backend architecture:
1. **Unbounded Read Concurrency**: Reads query the ETS table directly in memory in C without messaging the server.
2. **Zero Data Loss on Crash**: If the worker process crashes (e.g. unhandled payload or OOM crash), a dedicated **Heir Guardian** process catches the table via \`{'ETS-TRANSFER', ...}\`.
3. **Transparent Recovery**: When the supervisor restarts the worker, the new worker reclaims the existing ETS table from the guardian via \`ets:give_away/3\`, preserving 100% of user sessions and rate-limit counters!

> [!IMPORTANT]
> **Supervision Topology:**
> - \`session_sup\` (\`one_for_one\`) boots \`table_manager\` (heir guardian) first, then \`session_cache\` (worker).
> - If \`session_cache\` crashes, BEAM immediately delivers \`{'ETS-TRANSFER', Tab, ...}\` to \`table_manager\`.
> - Supervisor restarts \`session_cache\`, and \`table_manager\` transfers the table back via \`ets:give_away/3\` with 0% data loss!

## Deep Concept Breakdown & Under the Hood

### Multi-File Workspace Separation
This problem set is organized into three clean production modules:
1. **\`src/session_sup.erl\`**: A \`one_for_one\` supervisor starting \`table_manager\` first, followed by \`session_cache\`.
2. **\`src/table_manager.erl\`**: A dedicated guardian \`gen_server\` registered as \`table_manager\`.
   - Traps or receives \`{'ETS-TRANSFER', Tab, _OldOwner, _Data}\` and tracks held tables.
   - Handles \`handle_call({claim_table, Tab}, {CallerPid, _}, State)\` by calling \`ets:give_away(Tab, CallerPid, restored)\`.
3. **\`src/session_cache.erl\`**: The active session worker \`gen_server\` registered as \`session_cache\`.
   - On \`init([])\`: Checks if \`session_cache_tab\` exists. If not, creates it with \`{heir, whereis(table_manager), session_backup}\`. If it exists, calls \`table_manager:claim_table(session_cache_tab)\`.
   - Reads directly from ETS via \`ets:lookup/2\`.
   - Atomic increments via \`ets:update_counter/3\`.

## Assignment Specification

Implement the 3 modules:

### 1. \`src/session_sup.erl\`
- \`start_link/0\`: Starts supervisor registered as \`session_sup\`.
- \`init/1\`: Defines \`one_for_one\` supervisor with intensity 10, period 5, starting \`table_manager\` then \`session_cache\`.

### 2. \`src/table_manager.erl\`
- \`start_link/0\`: Starts gen_server registered as \`table_manager\`.
- \`claim_table(Tab)\`: Calls \`gen_server:call(table_manager, {claim_table, Tab})\`.
- \`handle_info({'ETS-TRANSFER', Tab, _From, _Data}, State)\`: Keeps track of the held table.
- \`handle_call({claim_table, Tab}, {Caller, _}, State)\`: Calls \`ets:give_away(Tab, Caller, restored)\`.

### 3. \`src/session_cache.erl\`
- \`start_link/0\`: Starts gen_server registered as \`session_cache\`.
- \`start_pipeline/0\`: Boots \`session_sup:start_link()\`.
- \`stop_pipeline/0\`: Stops \`session_sup\` and all children.
- \`put_session(SessionId, UserId, MetaMap) -> ok\`: Inserts \`{SessionId, UserId, MetaMap, 0}\` into \`session_cache_tab\`.
- \`get_session(SessionId) -> {ok, #{user_id => UserId, meta => MetaMap, hit_count => HitCount}} | {error, not_found}\`.
- \`increment_hits(SessionId) -> {ok, integer()} | {error, not_found}\`: Uses \`ets:update_counter/3\` at position 4.
- \`delete_session(SessionId) -> ok\`.
- \`count_sessions() -> integer()\`: Returns total row count.

## Rules & Verification Constraints
- Table name must be \`session_cache_tab\`.
- Must survive \`exit(whereis(session_cache), kill)\` with supervisor restart, table restitution, and 100% data preservation!
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
        description: 'Transfers ownership of an ETS table to another process without table destruction.',
        complexityNote: 'O(1) pointer transfer.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#give_away/3',
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

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

start_pipeline() ->
    session_sup:start_link().

stop_pipeline() ->
    case whereis(session_sup) of
        undefined -> ok;
        SupPid ->
            unlink(SupPid),
            try supervisor:stop(SupPid) catch _:_ -> ok end
    end,
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]],
    ok.

init([]) ->
    %% % TODO [Heir Failover Handshake]:
    %% % 1. Check if ?TAB already exists using ets:info(?TAB).
    %% % 2. If undefined (fresh boot):
    %% %    - Look up HeirPid via whereis(table_manager).
    %% %    - Create named table ?TAB with opts: [set, public, named_table,
    %% %      {read_concurrency, true}, {write_concurrency, true},
    %% %      {heir, HeirPid, session_backup}].
    %% % 3. If table already exists (worker restarted by supervisor after crash):
    %% %    - Reclaim table ownership from table_manager via table_manager:claim_table(?TAB).
    %% % 4. Return {ok, #{table => ?TAB}}.
    ok.

put_session(_SessionId, _UserId, _MetaMap) ->
    %% % TODO: Insert 4-tuple {SessionId, UserId, MetaMap, 0} into ?TAB and return ok.
    ok.

get_session(_SessionId) ->
    %% % TODO: Look up SessionId in ?TAB:
    %% % If found [{SessionId, UserId, MetaMap, HitCount}], return:
    %% %   {ok, #{user_id => UserId, meta => MetaMap, hit_count => HitCount}}
    %% % If not found [], return {error, not_found}.
    ok.

increment_hits(_SessionId) ->
    %% % TODO: Atomically increment 4th element (hit_count) by 1 via ets:update_counter/3:
    %% % On success, return {ok, NewCount}.
    %% % If SessionId does not exist, return {error, not_found}.
    ok.

delete_session(_SessionId) ->
    %% % TODO: Delete SessionId from ?TAB via ets:delete/2 and return ok.
    ok.

count_sessions() ->
    %% % TODO: Return number of items in ?TAB via ets:info(?TAB, size). Return 0 if undefined.
    0.

handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'ETS-TRANSFER', _Tab, _OldOwner, _GiftData}, State) ->
    {noreply, State};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.`,
    solutionCode: `-module(session_cache).
-behaviour(gen_server).

-export([start_link/0, put_session/3, get_session/1, increment_hits/1, delete_session/1, count_sessions/0]).
-export([start_pipeline/0, stop_pipeline/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-define(TAB, session_cache_tab).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

start_pipeline() ->
    session_sup:start_link().

stop_pipeline() ->
    case whereis(session_sup) of
        undefined -> ok;
        SupPid ->
            unlink(SupPid),
            try supervisor:stop(SupPid) catch _:_ -> ok end
    end,
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]],
    ok.

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

put_session(SessionId, UserId, MetaMap) ->
    ets:insert(?TAB, {SessionId, UserId, MetaMap, 0}),
    ok.

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

increment_hits(SessionId) ->
    try
        NewCount = ets:update_counter(?TAB, SessionId, {4, 1}),
        {ok, NewCount}
    catch
        _:_ ->
            {error, not_found}
    end.

delete_session(SessionId) ->
    ets:delete(?TAB, SessionId),
    ok.

count_sessions() ->
    case ets:info(?TAB, size) of
        undefined -> 0;
        Count -> Count
    end.

handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'ETS-TRANSFER', _Tab, _OldOwner, _GiftData}, State) ->
    {noreply, State};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`,
    files: [
      {
        name: 'session_sup.erl',
        path: 'src/session_sup.erl',
        behaviour: 'supervisor',
        content: `-module(session_sup).
-behaviour(supervisor).

-export([start_link/0, init/1]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

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

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

claim_table(Tab) ->
    gen_server:call(?MODULE, {claim_table, Tab}, 5000).

init([]) ->
    {ok, #{tables => #{}}}.

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

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'ETS-TRANSFER', Tab, _OldOwner, _GiftData}, State = #{tables := Tables}) ->
    {noreply, State#{tables := Tables#{Tab => true}}};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`
      },
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

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

start_pipeline() ->
    session_sup:start_link().

stop_pipeline() ->
    case whereis(session_sup) of
        undefined -> ok;
        SupPid ->
            unlink(SupPid),
            try supervisor:stop(SupPid) catch _:_ -> ok end
    end,
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]],
    ok.

init([]) ->
    %% % TODO [Heir Failover Handshake]:
    %% % 1. Check if ?TAB already exists using ets:info(?TAB).
    %% % 2. If undefined (fresh boot):
    %% %    - Look up HeirPid via whereis(table_manager).
    %% %    - Create named table ?TAB with opts: [set, public, named_table,
    %% %      {read_concurrency, true}, {write_concurrency, true},
    %% %      {heir, HeirPid, session_backup}].
    %% % 3. If table already exists (worker restarted by supervisor after crash):
    %% %    - Reclaim table ownership from table_manager via table_manager:claim_table(?TAB).
    %% % 4. Return {ok, #{table => ?TAB}}.
    ok.

put_session(_SessionId, _UserId, _MetaMap) ->
    %% % TODO: Insert 4-tuple {SessionId, UserId, MetaMap, 0} into ?TAB and return ok.
    ok.

get_session(_SessionId) ->
    %% % TODO: Look up SessionId in ?TAB:
    %% % If found [{SessionId, UserId, MetaMap, HitCount}], return:
    %% %   {ok, #{user_id => UserId, meta => MetaMap, hit_count => HitCount}}
    %% % If not found [], return {error, not_found}.
    ok.

increment_hits(_SessionId) ->
    %% % TODO: Atomically increment 4th element (hit_count) by 1 via ets:update_counter/3:
    %% % On success, return {ok, NewCount}.
    %% % If SessionId does not exist, return {error, not_found}.
    ok.

delete_session(_SessionId) ->
    %% % TODO: Delete SessionId from ?TAB via ets:delete/2 and return ok.
    ok.

count_sessions() ->
    %% % TODO: Return number of items in ?TAB via ets:info(?TAB, size). Return 0 if undefined.
    0.

handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'ETS-TRANSFER', _Tab, _OldOwner, _GiftData}, State) ->
    {noreply, State};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.`
      }
    ],
    solutionFiles: {
      'src/session_sup.erl': `-module(session_sup).
-behaviour(supervisor).

-export([start_link/0, init/1]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

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

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

claim_table(Tab) ->
    gen_server:call(?MODULE, {claim_table, Tab}, 5000).

init([]) ->
    {ok, #{tables => #{}}}.

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

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'ETS-TRANSFER', Tab, _OldOwner, _GiftData}, State = #{tables := Tables}) ->
    {noreply, State#{tables := Tables#{Tab => true}}};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`,
      'src/session_cache.erl': `-module(session_cache).
-behaviour(gen_server).

-export([start_link/0, put_session/3, get_session/1, increment_hits/1, delete_session/1, count_sessions/0]).
-export([start_pipeline/0, stop_pipeline/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-define(TAB, session_cache_tab).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

start_pipeline() ->
    session_sup:start_link().

stop_pipeline() ->
    case whereis(session_sup) of
        undefined -> ok;
        SupPid ->
            unlink(SupPid),
            try supervisor:stop(SupPid) catch _:_ -> ok end
    end,
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]],
    ok.

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

put_session(SessionId, UserId, MetaMap) ->
    ets:insert(?TAB, {SessionId, UserId, MetaMap, 0}),
    ok.

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

increment_hits(SessionId) ->
    try
        NewCount = ets:update_counter(?TAB, SessionId, {4, 1}),
        {ok, NewCount}
    catch
        _:_ ->
            {error, not_found}
    end.

delete_session(SessionId) ->
    ets:delete(?TAB, SessionId),
    ok.

count_sessions() ->
    case ets:info(?TAB, size) of
        undefined -> 0;
        Count -> Count
    end.

handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'ETS-TRANSFER', _Tab, _OldOwner, _GiftData}, State) ->
    {noreply, State};
handle_info(_Info, State) ->
    {noreply, State}.

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
      requiredCalls: ['ets:new/2', 'ets:insert/2', 'ets:lookup/2', 'ets:give_away/3']
    },
    solutionExplanation: 'Implements a fault-tolerant session cache architecture using a supervisor, an heir table manager, and a gen_server worker with atomic hit tracking.'
  }
];

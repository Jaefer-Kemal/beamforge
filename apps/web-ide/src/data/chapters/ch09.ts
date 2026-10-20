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
    conceptMarkdown: `## Why This Matters in Production

In mainstream backend languages (Node.js, Python, Go, Ruby), scaling high-throughput APIs requires deploying an external **Redis** or **Memcached** server over the local network. Every single cache read requires socket serialization, network TCP roundtrips, and connection pooling overhead.

In Erlang and the BEAM VM, you do not need Redis for in-process memory caching. Erlang includes **ETS (Erlang Term Storage)** directly built into the BEAM virtual machine in optimized C:
1. **Zero Network Latency**: Reads and writes execute in nanoseconds directly in memory via C pointers.
2. **Outside Garbage Collection (Off-Heap)**: ETS tables are stored completely outside process heaps. An ETS table holding 10,000,000 active sessions will **never trigger garbage collection pauses** on worker processes!
3. **Lock-Free Read/Write Concurrency**: By configuring \`{read_concurrency, true}\` and \`{write_concurrency, true}\`, the BEAM VM utilizes decentralized cache-line locking and lock-free read paths across all CPU cores.
4. **Hardware Atomic Operations**: Functions like \`ets:update_counter/4\` perform lock-free atomic increments, allowing thousands of concurrent workers to increment rate-limiters or telemetry metrics with zero race conditions.

\`\`\`
+-------------------------------------------------------------------------+
|                  BEAM ETS vs External Cache (Redis)                     |
+-------------------------------------------------------------------------+
  External Cache (Node.js / Python / Go -> Redis):
  [App Worker] --(JSON/Resp)--> [TCP Socket] --(Network 1-2ms)--> [Redis Server]
                                                                        |
  BEAM VM with ETS:                                                     v
  [Worker 1] ---> [ ETS Table (Off-Heap C Structs) ] <--- [Worker 2] (Nanoseconds)
                  - Zero GC pressure on process heaps
                  - Atomic lock-free counters
+-------------------------------------------------------------------------+
\`\`\`

## Deep Concept Breakdown & Under the Hood

### The 4 ETS Table Types

When calling \`ets:new(Name, Options)\`, you select one of four table archetypes:
1. **\`set\` (Default)**: Unique keys. Exactly one tuple per key. Implemented as an O(1) hash table. If you insert a tuple with an existing key, it overwrites the old tuple.
2. **\`ordered_set\`**: Unique keys. Keys are ordered according to Erlang term precedence (\`number < atom < reference < fun < port < pid < tuple < map < list < bitstring\`). Implemented as an O(log N) AVL balanced tree. Supports \`ets:first/1\`, \`ets:last/1\`, \`ets:next/2\`, and \`ets:prev/2\`.
3. **\`bag\`**: Multiple tuples can have the identical key, provided the tuples themselves are not completely identical.
4. **\`duplicate_bag\`**: Allows multiple identical tuples with identical keys.

### Key Position (\`keypos\`)

By default, Erlang uses element 1 of the stored tuple as the primary key (\`{keypos, 1}\`). If your tuples are tagged records like \`{user_profile, UserId, Name, Role}\`, you specify \`{keypos, 2}\` so \`UserId\` is the lookup index!

### Atomic Counter Modification (\`ets:update_counter/4\`)

\`\`\`erlang
ets:update_counter(TableName, Key, {Pos, Increment}, DefaultTuple) -> NewValue
\`\`\`

If \`Key\` exists, element \`Pos\` is atomically incremented by \`Increment\`. If \`Key\` does NOT exist, \`DefaultTuple\` is inserted atomically and then modified!

## 📖 Official Erlang Docs & Function Reference

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
   - Lookups \`{user, UserId}\`. Returns map if found, or \`{error, not_found}\`.

## Rules & Verification Constraints
- Table \`telemetry_store\` must be a named, public set.
- All counter operations must use \`ets:update_counter/4\`.
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
        signature: 'ets:update_counter(Tab, Key, UpdateOp, Default) -> Result',
        typesSpec: [
          'Tab = tab()',
          'Key = term()',
          'UpdateOp = {Pos, Incr}',
          'Default = tuple()'
        ],
        description: 'Atomically updates one or more counter fields in an ETS table without process serialization.',
        complexityNote: 'O(1) lock-free atomic CPU operation.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#update_counter/4',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      }
    ],
    starterCode: `-module(ets_telemetry).
-export([init_table/0, record_endpoint_hit/2, get_endpoint_hits/1, put_user_profile/3, get_user_profile/1]).

init_table() ->
    %% % TODO: Create named public set telemetry_store with read/write concurrency
    ok.

record_endpoint_hit(Endpoint, Incr) ->
    %% % TODO: Call ets:update_counter/4
    0.

get_endpoint_hits(Endpoint) ->
    %% % TODO: Lookup endpoint hits or return 0
    0.

put_user_profile(UserId, Name, Role) ->
    %% % TODO: Insert {{user, UserId}, Name, Role}
    ok.

get_user_profile(UserId) ->
    %% % TODO: Lookup and return {ok, #{name => Name, role => Role}} or {error, not_found}
    {error, not_found}.
`,
    solutionCode: `-module(ets_telemetry).
-export([init_table/0, record_endpoint_hit/2, get_endpoint_hits/1, put_user_profile/3, get_user_profile/1]).

init_table() ->
    case ets:info(telemetry_store) of
        undefined ->
            ets:new(telemetry_store, [
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

record_endpoint_hit(Endpoint, Incr) ->
    ets:update_counter(telemetry_store, Endpoint, {2, Incr}, {Endpoint, 0}).

get_endpoint_hits(Endpoint) ->
    case ets:lookup(telemetry_store, Endpoint) of
        [{Endpoint, Hits}] -> Hits;
        [] -> 0
    end.

put_user_profile(UserId, Name, Role) ->
    ets:insert(telemetry_store, {{user, UserId}, Name, Role}),
    ok.

get_user_profile(UserId) ->
    case ets:lookup(telemetry_store, {user, UserId}) of
        [{{user, UserId}, Name, Role}] ->
            {ok, #{name => Name, role => Role}};
        [] ->
            {error, not_found}
    end.
`,
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Initialize Telemetry Store & Atomic Hit Counter',
        erlangCall: 'begin ok = ets_telemetry:init_table(), 1 = ets_telemetry:record_endpoint_hit(<<"/api/v1/checkout">>, 1), 5 = ets_telemetry:record_endpoint_hit(<<"/api/v1/checkout">>, 4), ets_telemetry:get_endpoint_hits(<<"/api/v1/checkout">>) end',
        expectedOutput: '5',
        explanation: 'Initializes ETS telemetry table and verifies atomic counter increments.'
      },
      {
        id: 'tc2',
        title: 'Insert and Lookup Composite User Profile',
        erlangCall: 'begin ok = ets_telemetry:put_user_profile(101, <<"Alice">>, admin), {ok, Profile} = ets_telemetry:get_user_profile(101), {maps:get(name, Profile), maps:get(role, Profile)} end',
        expectedOutput: '{<<"Alice">>, admin}',
        explanation: 'Stores and retrieves user profile map from off-heap ETS table.'
      }
    ],
    astRules: {
      requiredCalls: ['ets:new/2', 'ets:update_counter/4', 'ets:insert/2', 'ets:lookup/2']
    },
    solutionExplanation: 'Implements an off-heap ETS telemetry and user storage module with lock-free atomic counter updates.'
  },

  // ── Lesson 9.2: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch09-l02',
    chapterNumber: 9,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'ETS Pattern Matching, Match Specs & Concurrency Control (public vs protected)',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In high-concurrency systems, process message mailboxes can become catastrophic bottlenecks. If 50,000 requests per second all send \`gen_server:call(SessionServer, {get_token, Token})\`, the single-threaded \`SessionServer\` process will back up with tens of thousands of queued messages, latency will spike to seconds, and timeout crashes will cascade through your backend.

Erlang solves this with the **\`protected\` ETS Pattern**:
- An ETS table can have access mode \`public\`, \`protected\`, or \`private\`.
- Under **\`protected\` mode**: Only the owner process (the \`gen_server\`) can write or delete records.
- **BUT ANY PROCESS** can perform \`ets:lookup/2\` or \`ets:select/2\` directly in C memory at hardware bus speed without sending a single message to the \`gen_server\`!
- Result: 50,000 clients read directly in parallel without blocking each other or the server!

\`\`\`
+-------------------------------------------------------------------------+
|                  Protected ETS Concurrency Architecture                 |
+-------------------------------------------------------------------------+
  Client 1 (Read)  --------+
  Client 2 (Read)  --------+---> [ protected ETS Table ] (Nanosecond C Reads)
  Client 3 (Read)  --------+     ^
                                 | Writes only
                    [ Token Manager gen_server ]
+-------------------------------------------------------------------------+
\`\`\`

## Deep Concept Breakdown & Under the Hood

### Pattern Matching: \`ets:match_object/2\`

\`ets:match_object(Tab, Pattern)\` returns all tuples matching a pattern containing bound values and wildcards (\`'_'\`):

\`\`\`erlang
%% Find all auth tokens for user 42 regardless of role or expiration
ets:match_object(auth_token_table, {token, '_', 42, '_', '_'})
\`\`\`

### Match Specifications: \`ets:select/2\` & \`ets:select_delete/2\`

Match specifications allow you to run SQL-like filter expressions directly inside the BEAM C engine:

\`\`\`erlang
%% Pattern: {token, '$1', '$2', '$3', '$4'}
%% Guard:   ['<', '$4', CurrentTime]
%% Return:  ['$1']
MatchSpec = [{{token, '$1', '$2', '$3', '$4'}, [{'<', '$4', Now}], ['$1']}],
ExpiredTokens = ets:select(auth_token_table, MatchSpec).
\`\`\`

To purge all matching expired entries in a single atomic pass, use **\`ets:select_delete(Tab, MatchSpec)\`**, which returns the exact integer count of deleted records!

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official ETS Query Calls (stdlib / ets)
ets:match_object(Tab, Pattern) -> [tuple()]
ets:select(Tab, MatchSpec) -> [term()]
ets:select_delete(Tab, MatchSpec) -> integer()
\`\`\`

## Assignment Specification

Implement module \`ets_query_engine\` exporting:
1. \`init_auth_table/0 -> ok\`:
   - Creates a \`named_table\` named \`auth_token_table\` with \`set\`, \`public\`, and \`{keypos, 2}\` (so \`TokenBin\` is the primary key).
   - Record format: \`{token, TokenBin, UserId, Role, ExpiresAt}\`.
2. \`store_token(TokenBin, UserId, Role, ExpiresAt) -> ok\`:
   - Inserts \`{token, TokenBin, UserId, Role, ExpiresAt}\`.
3. \`find_users_by_role(Role) -> [UserId]\`:
   - Queries \`auth_token_table\` for all tuples matching \`Role\`.
   - Returns a sorted list of unique \`UserId\`s (using \`lists:usort/1\`).
4. \`delete_expired_tokens(CurrentTimestamp) -> integer()\`:
   - Uses \`ets:select_delete/2\` to atomically remove all tokens where \`ExpiresAt < CurrentTimestamp\`.
   - Returns the integer count of deleted records.

## Rules & Verification Constraints
- Token table must use \`{keypos, 2}\`.
- Deletions must use \`ets:select_delete/2\`.
`,
    otpDocCards: [
      {
        functionName: 'select',
        module: 'ets',
        signature: 'ets:select(Tab, MatchSpec) -> [Match]',
        typesSpec: [
          'Tab = tab()',
          'MatchSpec = [{Pattern, Guards, ReturnExpressions}]'
        ],
        description: 'Performs complex filtered queries on an ETS table directly within the BEAM C engine.',
        complexityNote: 'O(N) table scan or O(log N) on ordered_set prefix matches.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#select/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      },
      {
        functionName: 'select_delete',
        module: 'ets',
        signature: 'ets:select_delete(Tab, MatchSpec) -> NumDeleted',
        typesSpec: [
          'Tab = tab()',
          'MatchSpec = [{Pattern, Guards, [true]}]',
          'NumDeleted = integer()'
        ],
        description: 'Atomically deletes all records satisfying the match specification, returning the total deleted count.',
        complexityNote: 'O(N) atomic scan and purge.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/ets.html#select_delete/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/ets.erl'
      }
    ],
    starterCode: `-module(ets_query_engine).
-export([init_auth_table/0, store_token/4, find_users_by_role/1, delete_expired_tokens/1]).

init_auth_table() ->
    %% % TODO: Create auth_token_table with {keypos, 2}
    ok.

store_token(TokenBin, UserId, Role, ExpiresAt) ->
    %% % TODO: Insert {token, TokenBin, UserId, Role, ExpiresAt}
    ok.

find_users_by_role(Role) ->
    %% % TODO: Find matching tokens and return lists:usort(UserIds)
    [].

delete_expired_tokens(Now) ->
    %% % TODO: Use ets:select_delete/2 to remove tokens where ExpiresAt < Now
    0.
`,
    solutionCode: `-module(ets_query_engine).
-export([init_auth_table/0, store_token/4, find_users_by_role/1, delete_expired_tokens/1]).

init_auth_table() ->
    case ets:info(auth_token_table) of
        undefined ->
            ets:new(auth_token_table, [
                set,
                public,
                named_table,
                {keypos, 2},
                {read_concurrency, true}
            ]),
            ok;
        _ ->
            ok
    end.

store_token(TokenBin, UserId, Role, ExpiresAt) ->
    ets:insert(auth_token_table, {token, TokenBin, UserId, Role, ExpiresAt}),
    ok.

find_users_by_role(Role) ->
    Matches = ets:match_object(auth_token_table, {token, '_', '_', Role, '_'}),
    UserIds = [UserId || {token, _Token, UserId, _Role, _Exp} <- Matches],
    lists:usort(UserIds).

delete_expired_tokens(Now) ->
    MatchSpec = [
        {{token, '_', '_', '_', '$1'}, [{'<', '$1', Now}], [true]}
    ],
    ets:select_delete(auth_token_table, MatchSpec).
`,
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Filter Users by Role Using Pattern Matching',
        erlangCall: 'begin ok = ets_query_engine:init_auth_table(), ok = ets_query_engine:store_token(<<"tok_1">>, 101, admin, 9999), ok = ets_query_engine:store_token(<<"tok_2">>, 102, member, 9999), ok = ets_query_engine:store_token(<<"tok_3">>, 101, admin, 9999), ets_query_engine:find_users_by_role(admin) end',
        expectedOutput: '[101]',
        explanation: 'Finds all users with the admin role and de-duplicates the result.'
      },
      {
        id: 'tc2',
        title: 'Atomic TTL Eviction with ets:select_delete',
        erlangCall: 'begin ok = ets_query_engine:store_token(<<"exp_1">>, 201, guest, 100), ok = ets_query_engine:store_token(<<"exp_2">>, 202, guest, 200), ok = ets_query_engine:store_token(<<"valid">>, 203, guest, 500), Deleted = ets_query_engine:delete_expired_tokens(300), {Deleted, ets:lookup(auth_token_table, <<"valid">>)} end',
        expectedOutput: '{2, [{token, <<"valid">>, 203, guest, 500}]}',
        explanation: 'Deletes tokens with timestamp < 300 and verifies the valid token remains intact.'
      }
    ],
    astRules: {
      requiredCalls: ['ets:new/2', 'ets:insert/2', 'ets:select_delete/2', 'lists:usort/1']
    },
    solutionExplanation: 'Implements an ETS querying and cleanup engine using pattern matching and select_delete match specifications.'
  },

  // ── Lesson 9.3: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch09-l03',
    chapterNumber: 9,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Surviving Crashes: The ETS Heir Handshake & ets:give_away/3',
    difficulty: 'Advanced',
    conceptMarkdown: `## Why This Matters in Production

Here is the most dangerous pitfall in Erlang caching:
**An ETS table is bound to the lifetime of the process that created it.**

If process \`A\` calls \`ets:new(cache_tab, [named_table])\`, and process \`A\` crashes 10 minutes later due to an unhandled exception or memory spike, the BEAM VM **instantly deletes \`cache_tab\` from RAM**! All cached database records, session states, and rate-limit counters vanish in zero milliseconds.

Even worse: when your supervisor restarts process \`A\` as process \`A'\`, process \`A'\` starts with an empty cache, causing a catastrophic **Cache Stampede (Thundering Herd)** on your database!

To prevent this, OTP provides the **ETS Heir Protocol** (\`{heir, HeirPid, HeirData}\` and \`ets:give_away/3\`).

\`\`\`
+-------------------------------------------------------------------------+
|                  The ETS Heir Failover Handshake                        |
+-------------------------------------------------------------------------+
  1. Worker boots and creates table with {heir, HeirPid, HeirData}.
  2. Worker crashes!
  3. BEAM VM intercepts crash and transfers ownership to Heir:
     Heir receives: {'ETS-TRANSFER', Tab, DeadPid, HeirData}
  4. Supervisor restarts Worker -> Worker boots as NewWorker.
  5. NewWorker asks Heir for table -> Heir calls ets:give_away(Tab, NewWorker, Data).
  6. NewWorker receives: {'ETS-TRANSFER', Tab, HeirPid, Data}.
  7. ZERO LOST DATA!
+-------------------------------------------------------------------------+
\`\`\`

## Deep Concept Breakdown & Under the Hood

### Step 1: Declaring the Heir on Creation

\`\`\`erlang
ets:new(my_cache, [set, public, named_table, {heir, HeirPid, cache_backup}])
\`\`\`

If \`HeirPid\` terminates before the table owner, the heir setting is automatically reset to \`none\`. You can dynamically update the heir using:

\`\`\`erlang
ets:setopts(Tab, {heir, NewHeirPid, NewHeirData})
\`\`\`

### Step 2: The Heir Transfer Message

When the owning process dies, BEAM preserves the table and sends the heir:

\`\`\`erlang
{'ETS-TRANSFER', TableId, DeadOwnerPid, HeirData}
\`\`\`

### Step 3: Giving Away the Table (\`ets:give_away/3\`)

When the restarted worker process is ready to resume ownership, the heir calls:

\`\`\`erlang
ets:give_away(Tab, NewOwnerPid, GiftData)
\`\`\`

The new owner process receives \`{'ETS-TRANSFER', Tab, HeirPid, GiftData}\` and immediately becomes the full legal owner of the table!

## 📖 Official Erlang Docs & Function Reference

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
1. \`create_resilient_table(TabName, HeirPid) -> Tab\`:
   - Creates a \`set\`, \`public\`, \`named_table\` named \`TabName\` with \`{heir, HeirPid, resilient_store}\`.
2. \`start_guardian() -> {ok, pid()}\`:
   - Spawns a dedicated guardian process that traps exits and runs a recursive loop:
     - When it receives \`{'ETS-TRANSFER', Tab, _OldOwner, HeirData}\`, stores \`Tab\` in its state map.
     - When it receives \`{reclaim, Tab, WorkerPid}\`, calls \`ets:give_away(Tab, WorkerPid, reclaimed)\` and replies \`WorkerPid ! {reclaimed, Tab}\`.
     - When it receives \`stop\`, exits cleanly with \`ok\`.
3. \`reclaim_table(GuardianPid, Tab) -> ok\`:
   - Sends \`{reclaim, Tab, self()}\` to \`GuardianPid\`, waits for \`{reclaimed, Tab}\`, and flushes the \`{'ETS-TRANSFER', Tab, GuardianPid, reclaimed}\` message.

## Rules & Verification Constraints
- Guardian must handle \`{'ETS-TRANSFER', ...}\` and \`ets:give_away/3\`.
- Table must survive the intentional crash of its creator.
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
      }
    ],
    starterCode: `-module(ets_heir_handshake).
-export([create_resilient_table/2, start_guardian/0, reclaim_table/2]).
-export([guardian_loop/1]).

create_resilient_table(TabName, HeirPid) ->
    %% % TODO: Create table with {heir, HeirPid, resilient_store}
    ok.

start_guardian() ->
    %% % TODO: Spawn guardian process running guardian_loop
    {ok, self()}.

reclaim_table(GuardianPid, Tab) ->
    %% % TODO: Request transfer and receive {'ETS-TRANSFER', ...}
    ok.

guardian_loop(State) ->
    %% % TODO: Handle 'ETS-TRANSFER' and {reclaim, Tab, WorkerPid}
    ok.
`,
    solutionCode: `-module(ets_heir_handshake).
-export([create_resilient_table/2, start_guardian/0, reclaim_table/2]).
-export([guardian_loop/1]).

create_resilient_table(TabName, HeirPid) ->
    ets:new(TabName, [
        set,
        public,
        named_table,
        {heir, HeirPid, resilient_store}
    ]).

start_guardian() ->
    Pid = spawn_link(?MODULE, guardian_loop, [#{}]),
    {ok, Pid}.

reclaim_table(GuardianPid, Tab) ->
    GuardianPid ! {reclaim, Tab, self()},
    receive
        {reclaimed, Tab} ->
            receive
                {'ETS-TRANSFER', Tab, GuardianPid, reclaimed} -> ok
            after 100 -> ok
            end
    after 1000 ->
        {error, timeout}
    end.

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
`,
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Heir Table Ownership Transfer Across Creator Crash',
        erlangCall: 'begin {ok, Guardian} = ets_heir_handshake:start_guardian(), Creator = spawn(fun() -> Tab = ets_heir_handshake:create_resilient_table(resilient_cache, Guardian), ets:insert(Tab, {k1, <<"persistent_value">>}), timer:sleep(10), exit(intentional_crash) end), timer:sleep(50), Info = ets:info(resilient_cache), ets_heir_handshake:reclaim_table(Guardian, resilient_cache), [Val] = ets:lookup(resilient_cache, k1), Guardian ! stop, {proplists:get_value(owner, Info) =:= Guardian, Val} end',
        expectedOutput: '{true, {k1, <<"persistent_value">>}}',
        explanation: 'Verifies creator crash transfers table to guardian and data survives intact.'
      }
    ],
    astRules: {
      requiredCalls: ['ets:new/2', 'ets:give_away/3', 'ets:lookup/2']
    },
    solutionExplanation: 'Implements the ETS heir failover handshake pattern ensuring zero data loss during process crashes.'
  },

  // ── Lesson 9.4: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch09-l04',
    chapterNumber: 9,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'Mnesia ACID Transactions & Distributed Process Groups (pg)',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

While ETS provides blazing-fast off-heap key-value storage on a single machine, real-world backends face two distributed challenges:
1. **Multi-Table Atomicity**: What if transferring money requires debiting Account A and crediting Account B? If the server crashes between step 1 and step 2, raw ETS leaves money destroyed!
2. **Cluster-Wide Coordination**: How do 50 chat nodes publish real-time messages to 100,000 distributed WebSockets?

Erlang provides two built-in standard library solutions:
- **Mnesia**: An ACID-compliant distributed DBMS embedded directly in BEAM. It supports tables replicated across multiple nodes in RAM or disk, and runs all mutations inside transactional closures (\`mnesia:transaction(Fun)\`) that roll back automatically on crashes!
- **\`pg\` (Distributed Process Groups)**: Introduced in OTP 23 to replace the older single-process \`pg2\`. \`pg\` allows any process on any node to join topic groups with zero centralized bottlenecks.

\`\`\`
+-------------------------------------------------------------------------+
|                  Mnesia vs ETS vs pg Architectural Role                 |
+-------------------------------------------------------------------------+
  1. ETS: Single-Node, High-Throughput In-Memory Caching (No Transactions)
  2. Mnesia: Multi-Node Replicated, ACID Transactions with Rollback
  3. pg: Distributed Pub/Sub Messaging across Cluster Nodes
+-------------------------------------------------------------------------+
\`\`\`

## Deep Concept Breakdown & Under the Hood

### Mnesia ACID Transactions

All Mnesia write operations execute inside a functional closure passed to \`mnesia:transaction/1\`:

\`\`\`erlang
TransferFun = fun() ->
    [Sender] = mnesia:read(accounts, SenderId, write),
    [Receiver] = mnesia:read(accounts, ReceiverId, write),
    case Sender#account.balance >= Amount of
        true ->
            mnesia:write(Sender#account{balance = Sender#account.balance - Amount}),
            mnesia:write(Receiver#account{balance = Receiver#account.balance + Amount}),
            ok;
        false ->
            mnesia:abort(insufficient_funds)
    end
end,
{atomic, Result} = mnesia:transaction(TransferFun).
\`\`\`

If any node fails, or if \`mnesia:abort/1\` is called, all changes roll back to the exact initial state!

### Decentralized Pub/Sub with \`pg\`

In modern Erlang/OTP, \`pg\` provides process group routing:
- \`pg:start_link(Scope)\`: Boots the scope manager.
- \`pg:join(Scope, GroupName, Pid)\`: Subscribes \`Pid\` to topic \`GroupName\`.
- \`pg:get_members(Scope, GroupName)\`: Fetches all live pids subscribed to \`GroupName\`. If a subscribed process crashes, \`pg\` detects its termination via monitors and unregisters it automatically!

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official Mnesia & pg Calls (stdlib / pg & mnesia)
mnesia:transaction(Fun) -> {atomic, Result} | {aborted, Reason}
mnesia:abort(Reason) -> no_return()

pg:start_link() -> {ok, pid()} | {error, term()}
pg:join(Scope, Group, PidOrPids) -> ok
pg:leave(Scope, Group, PidOrPids) -> ok
pg:get_members(Scope, Group) -> [pid()]
\`\`\`

## Assignment Specification

Implement module \`cluster_pubsub_pg\` exporting:
1. \`init_pubsub/0 -> ok\`:
   - Starts default \`pg\` process group server (\`pg:start_link()\`). Returns \`ok\` if already started.
2. \`join_topic(Topic, Pid) -> ok\`:
   - Calls \`pg:join(Topic, Pid)\` (using default scope \`pg\`).
3. \`leave_topic(Topic, Pid) -> ok\`:
   - Calls \`pg:leave(Topic, Pid)\`.
4. \`get_subscribers(Topic) -> [pid()]\`:
   - Returns all active members from \`pg:get_members(Topic)\`.
5. \`broadcast(Topic, Message) -> {ok, integer()}\`:
   - Fetches all subscribers of \`Topic\`.
   - Sends \`{pubsub_msg, Topic, Message}\` to every subscriber.
   - Returns \`{ok, Count}\` where \`Count\` is the number of recipients.

## Rules & Verification Constraints
- Must use OTP's built-in \`pg\` module.
- Dead processes must be cleanly handled.
`,
    otpDocCards: [
      {
        functionName: 'join',
        module: 'pg',
        signature: 'pg:join(Scope, Group, Pids) -> ok',
        typesSpec: [
          'Scope = atom()',
          'Group = term()',
          'Pids = pid() | [pid()]'
        ],
        description: 'Joins one or more processes to a distributed process group across the cluster.',
        complexityNote: 'O(1) monitored process registration.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/pg.html#join/3',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/pg.erl'
      },
      {
        functionName: 'get_members',
        module: 'pg',
        signature: 'pg:get_members(Scope, Group) -> [pid()]',
        typesSpec: [
          'Scope = atom()',
          'Group = term()'
        ],
        description: 'Returns all live process identifiers currently joined to the specified group.',
        complexityNote: 'O(N) membership lookup.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/pg.html#get_members/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/pg.erl'
      }
    ],
    starterCode: `-module(cluster_pubsub_pg).
-export([init_pubsub/0, join_topic/2, leave_topic/2, get_subscribers/1, broadcast/2]).

init_pubsub() ->
    %% % TODO: Start pg server if not already running
    ok.

join_topic(Topic, Pid) ->
    %% % TODO: Call pg:join
    ok.

leave_topic(Topic, Pid) ->
    %% % TODO: Call pg:leave
    ok.

get_subscribers(Topic) ->
    %% % TODO: Return pg:get_members
    [].

broadcast(Topic, Message) ->
    %% % TODO: Send {pubsub_msg, Topic, Message} to all members and return {ok, Count}
    {ok, 0}.
`,
    solutionCode: `-module(cluster_pubsub_pg).
-export([init_pubsub/0, join_topic/2, leave_topic/2, get_subscribers/1, broadcast/2]).

init_pubsub() ->
    case pg:start_link() of
        {ok, _Pid} -> ok;
        {error, {already_started, _Pid}} -> ok
    end.

join_topic(Topic, Pid) ->
    pg:join(Topic, Pid).

leave_topic(Topic, Pid) ->
    pg:leave(Topic, Pid).

get_subscribers(Topic) ->
    pg:get_members(Topic).

broadcast(Topic, Message) ->
    Members = pg:get_members(Topic),
    [P ! {pubsub_msg, Topic, Message} || P <- Members],
    {ok, length(Members)}.
`,
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Join Topic and Broadcast Message via pg',
        erlangCall: 'begin ok = cluster_pubsub_pg:init_pubsub(), Self = self(), ok = cluster_pubsub_pg:join_topic(<<"alerts">>, Self), {ok, 1} = cluster_pubsub_pg:broadcast(<<"alerts">>, <<"cluster_overload">>), Msg = receive {pubsub_msg, <<"alerts">>, M} -> M after 100 -> error end, ok = cluster_pubsub_pg:leave_topic(<<"alerts">>, Self), Msg end',
        expectedOutput: '<<"cluster_overload">>',
        explanation: 'Verifies joining a process group and receiving a broadcast message.'
      }
    ],
    astRules: {
      requiredCalls: ['pg:start_link/0', 'pg:join/2', 'pg:leave/2', 'pg:get_members/1']
    },
    solutionExplanation: 'Implements a distributed pub/sub routing module using OTP 23+ decentralized process groups.'
  },

  // ── Lesson 9.5: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch09-l05',
    chapterNumber: 9,
    lessonNumber: 5,
    lessonType: 'concept_exercise',
    title: 'Production Quality Assurance: EUnit Fixtures & Dialyzer Type Contracts',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In dynamic languages, subtle type mismatches (e.g. passing \`undefined\` instead of a \`binary()\`, or an integer where a float was expected) cause runtime crashes that take down production services.

Erlang approaches software quality through two industry-standard tools:
1. **Dialyzer (DIscrepancy AnaLYZer for ERlang)**: A static analysis tool based on **Success Typings**. Unlike compilers that reject valid code due to rigid type hierarchies, Dialyzer only reports bugs that are **mathematically proven to fail at runtime**!
2. **EUnit**: OTP's standard unit-testing framework, featuring assertion macros, test generators, and lifecycle fixtures (\`setup\`, \`cleanup\`).

\`\`\`
+-------------------------------------------------------------------------+
|                    Erlang Quality Assurance Pipeline                    |
+-------------------------------------------------------------------------+
  [Source Code with -spec annotations]
                 |
                 +---> Dialyzer (Static Success Typing & Discrepancy Audit)
                 |
                 +---> EUnit (Automated Unit Testing & Fixture Execution)
                 |
                 v
  [Production-Ready Zero-Defect BEAM Releases]
+-------------------------------------------------------------------------+
\`\`\`

## Deep Concept Breakdown & Under the Hood

### Dialyzer Type Contracts (\`-spec\` and \`-type\`)

Type specifications document the contractual inputs and outputs of functions:

\`\`\`erlang
-type account_id() :: binary().
-type balance() :: non_neg_integer().
-type ledger() :: #{account_id() => balance()}.

-spec deposit(ledger(), account_id(), pos_integer()) -> {ok, ledger()}.
-spec withdraw(ledger(), account_id(), pos_integer()) ->
    {ok, ledger()} | {error, insufficient_funds | invalid_amount}.
\`\`\`

If you attempt to write \`withdraw(Ledger, Acc, -50)\`, Dialyzer flags the contract breach before your code ever deploys to staging!

### EUnit Test Fixtures

EUnit tests are declared with \`-include_lib("eunit/include/eunit.hrl").\`:

\`\`\`erlang
deposit_test() ->
    Ledger = #{<<"acc_1">> => 100},
    {ok, Updated} = deposit(Ledger, <<"acc_1">>, 50),
    ?assertEqual(150, maps:get(<<"acc_1">>, Updated)).
\`\`\`

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official EUnit Assertions (eunit/include/eunit.hrl)
?assertEqual(Expected, Expr)
?assertMatch(Pattern, Expr)
?assertError(ErrorPattern, Expr)
?assert(BooleanExpr)
\`\`\`

## Assignment Specification

Implement module \`ledger_specs_and_tests\` exporting:
1. Type declarations:
   - \`-type account_id() :: binary().\`
   - \`-type balance() :: non_neg_integer().\`
   - \`-type ledger_state() :: #{account_id() => balance()}.\`
2. Functions with strict \`-spec\` annotations:
   - \`new_ledger() -> ledger_state()\`: Returns \`#{}\`.
   - \`deposit(ledger_state(), account_id(), pos_integer()) -> {ok, ledger_state()}\`:
     - Adds positive amount to account (default 0).
   - \`withdraw(ledger_state(), account_id(), pos_integer()) -> {ok, ledger_state()} | {error, insufficient_funds | invalid_amount}\`:
     - Returns \`{error, invalid_amount}\` if \`Amount =< 0\`.
     - Returns \`{error, insufficient_funds}\` if \`CurrentBalance < Amount\`.
     - Otherwise debits balance and returns \`{ok, NewLedger}\`.
   - \`get_balance(ledger_state(), account_id()) -> balance()\`: Returns balance or \`0\`.
3. \`run_unit_tests() -> ok\`:
   - Runs EUnit assertion checks verifying valid deposits, normal withdrawals, and boundary rejections (insufficient funds and negative withdrawals).

## Rules & Verification Constraints
- Guard conditions must enforce positive deposit amounts.
- Complete type specs required on all exports.
`,
    otpDocCards: [
      {
        functionName: 'assertEqual',
        module: 'eunit',
        signature: '?assertEqual(Expected, Expression)',
        typesSpec: [
          'Expected = term()',
          'Expression = term()'
        ],
        description: 'EUnit assertion macro verifying that Expression evaluates to Expected, failing with discrepancy diffs otherwise.',
        complexityNote: 'Compile-time macro expansion.',
        officialUrl: 'https://www.erlang.org/doc/apps/eunit/chapter.html',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/eunit/src/eunit.erl'
      }
    ],
    starterCode: `-module(ledger_specs_and_tests).
-export([new_ledger/0, deposit/3, withdraw/3, get_balance/2, run_unit_tests/0]).

-type account_id() :: binary().
-type balance() :: non_neg_integer().
-type ledger_state() :: #{account_id() => balance()}.

-spec new_ledger() -> ledger_state().
new_ledger() ->
    #{}.

-spec deposit(ledger_state(), account_id(), pos_integer()) -> {ok, ledger_state()}.
deposit(Ledger, AccountId, Amount) ->
    %% % TODO: Enforce Amount > 0 and update balance
    {ok, Ledger}.

-spec withdraw(ledger_state(), account_id(), pos_integer()) ->
    {ok, ledger_state()} | {error, insufficient_funds | invalid_amount}.
withdraw(Ledger, AccountId, Amount) ->
    %% % TODO: Validate amount and current balance
    {ok, Ledger}.

-spec get_balance(ledger_state(), account_id()) -> balance().
get_balance(Ledger, AccountId) ->
    %% % TODO: Return balance or 0
    0.

run_unit_tests() ->
    %% % TODO: Run assertions
    ok.
`,
    solutionCode: `-module(ledger_specs_and_tests).
-export([new_ledger/0, deposit/3, withdraw/3, get_balance/2, run_unit_tests/0]).

-type account_id() :: binary().
-type balance() :: non_neg_integer().
-type ledger_state() :: #{account_id() => balance()}.

-spec new_ledger() -> ledger_state().
new_ledger() ->
    #{}.

-spec deposit(ledger_state(), account_id(), pos_integer()) -> {ok, ledger_state()}.
deposit(Ledger, AccountId, Amount) when is_binary(AccountId), is_integer(Amount), Amount > 0 ->
    Cur = maps:get(AccountId, Ledger, 0),
    {ok, Ledger#{AccountId => Cur + Amount}}.

-spec withdraw(ledger_state(), account_id(), pos_integer()) ->
    {ok, ledger_state()} | {error, insufficient_funds | invalid_amount}.
withdraw(_Ledger, _AccountId, Amount) when not is_integer(Amount); Amount =< 0 ->
    {error, invalid_amount};
withdraw(Ledger, AccountId, Amount) when is_binary(AccountId), is_integer(Amount), Amount > 0 ->
    Cur = maps:get(AccountId, Ledger, 0),
    case Cur >= Amount of
        true ->
            {ok, Ledger#{AccountId => Cur - Amount}};
        false ->
            {error, insufficient_funds}
    end.

-spec get_balance(ledger_state(), account_id()) -> balance().
get_balance(Ledger, AccountId) ->
    maps:get(AccountId, Ledger, 0).

run_unit_tests() ->
    L0 = new_ledger(),
    {ok, L1} = deposit(L0, <<"acc_1">>, 100),
    100 = get_balance(L1, <<"acc_1">>),
    {ok, L2} = withdraw(L1, <<"acc_1">>, 40),
    60 = get_balance(L2, <<"acc_1">>),
    {error, insufficient_funds} = withdraw(L2, <<"acc_1">>, 1000),
    {error, invalid_amount} = withdraw(L2, <<"acc_1">>, -5),
    ok.
`,
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Ledger Deposits and Withdrawals',
        erlangCall: 'begin L0 = ledger_specs_and_tests:new_ledger(), {ok, L1} = ledger_specs_and_tests:deposit(L0, <<"user_1">>, 250), {ok, L2} = ledger_specs_and_tests:withdraw(L1, <<"user_1">>, 75), ledger_specs_and_tests:get_balance(L2, <<"user_1">>) end',
        expectedOutput: '175',
        explanation: 'Executes valid deposit and withdrawal operations, verifying final balance.'
      },
      {
        id: 'tc2',
        title: 'Run Built-in Unit Tests',
        erlangCall: 'ledger_specs_and_tests:run_unit_tests()',
        expectedOutput: 'ok',
        explanation: 'Runs assertions validating boundary conditions and error rejections.'
      }
    ],
    astRules: {
      requiredConstructs: ['guards']
    },
    solutionExplanation: 'Implements a typed ledger module with Dialyzer specifications and boundary assertions.'
  },

  // ── Lesson 9.6: Problem Set ───────────────────────────────────────────────
  {
    id: 'ch09-l06',
    chapterNumber: 9,
    lessonNumber: 6,
    lessonType: 'problem_set',
    title: 'Assignment: Fault-Tolerant ETS Session Cache with Heir Failover (session_ets_store.erl)',
    difficulty: 'Advanced',
    conceptMarkdown: `## Why This Matters in Production

In a high-scale production backend, authentication tokens and session payloads are checked on every single inbound HTTP/WebSocket request. If your session store lives in an ordinary \`gen_server\`, that process becomes a single-threaded bottleneck for thousands of concurrent requests.

By combining **ETS** with the **Heir Failover Handshake**, you achieve the holy grail of distributed backend architecture:
1. **Unbounded Read Concurrency**: Reads query the ETS table directly in memory in C without messaging the server.
2. **Zero Data Loss on Crash**: If the worker process crashes (e.g. unhandled payload or OOM crash), a dedicated **Heir Guardian** process catches the table via \`{'ETS-TRANSFER', ...}\`.
3. **Transparent Recovery**: When the supervisor restarts the worker, the new worker reclaims the existing ETS table from the guardian via \`ets:give_away/3\`, preserving 100% of user sessions and rate-limit counters!

\`\`\`
+-------------------------------------------------------------------------+
|                  Fault-Tolerant Session Cache Architecture              |
+-------------------------------------------------------------------------+
                          [ session_sup ]
                                 | (one_for_one)
                 +---------------+---------------+
                 |                               |
        [ table_manager ]              [ session_cache ]
        (Long-Lived Heir)              (Worker gen_server)
                 |                               |
                 +==== {'ETS-TRANSFER'} <========+ (Crash!)
                 |
                 +==== ets:give_away/3 =========> [ session_cache' ] (Restarted)
+-------------------------------------------------------------------------+
\`\`\`

## Deep Concept Breakdown & Under the Hood

### The Architecture Components
1. **\`session_sup\`**: A \`one_for_one\` supervisor starting \`table_manager\` first, then \`session_cache\`.
2. **\`table_manager\`**: A guardian \`gen_server\` registered as \`table_manager\`. It handles:
   - \`{'ETS-TRANSFER', Tab, _OldOwner, _Data}\`: Stores \`Tab\` in its state map.
   - \`handle_call({claim_table, Tab}, {CallerPid, _}, State)\`: Calls \`ets:give_away(Tab, CallerPid, claimed)\` and returns \`ok\`.
3. **\`session_cache\`**: The active session worker registered as \`session_cache\`.
   - On \`init([])\`: Checks if \`session_cache_tab\` exists. If not, creates it with \`{heir, whereis(table_manager), session_backup}\`. If it exists (held by \`table_manager\`), requests ownership via \`gen_server:call(table_manager, {claim_table, session_cache_tab})\`.

## Assignment Specification

Implement module \`session_cache\` (with companion supervisor and table manager) exporting:
1. \`start_link/0\`: Boots \`session_cache\`.
2. \`put_session(SessionId, UserId, MetaMap) -> ok\`:
   - Inserts \`{SessionId, UserId, MetaMap, 0}\` into \`session_cache_tab\`.
3. \`get_session(SessionId) -> {ok, #{user_id => UserId, meta => MetaMap, hit_count => HitCount}} | {error, not_found}\`:
   - Reads directly from \`session_cache_tab\`.
4. \`increment_hits(SessionId) -> {ok, integer()} | {error, not_found}\`:
   - Calls \`ets:update_counter/3\` to increment \`HitCount\` (position 4) by 1.
5. \`delete_session(SessionId) -> ok\`:
   - Removes \`SessionId\` from \`session_cache_tab\`.
6. \`count_sessions() -> integer()\`:
   - Returns total session count from \`ets:info(session_cache_tab, size)\`.
7. Companion exports:
   - \`start_pipeline/0\`: Boots \`session_sup\`, which starts \`table_manager\` and \`session_cache\`.
   - \`stop_pipeline/0\`: Cleanly shuts down \`session_sup\` and all workers.

## Rules & Verification Constraints
- Table must be named \`session_cache_tab\` and use \`{keypos, 1}\`.
- Must survive \`exit(whereis(session_cache), kill)\` with 100% session preservation.
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
    starterCode: `-module(session_cache).
-behaviour(gen_server).

-export([start_link/0, put_session/3, get_session/1, increment_hits/1, delete_session/1, count_sessions/0]).
-export([start_pipeline/0, stop_pipeline/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

start_link() ->
    %% % TODO: Start gen_server registered as session_cache
    ok.

put_session(SessionId, UserId, MetaMap) ->
    %% % TODO: Insert session record
    ok.

get_session(SessionId) ->
    %% % TODO: Read session record from ETS
    {error, not_found}.

increment_hits(SessionId) ->
    %% % TODO: Atomically update hit count in ETS
    {error, not_found}.

delete_session(SessionId) ->
    %% % TODO: Delete session
    ok.

count_sessions() ->
    %% % TODO: Return session count
    0.

start_pipeline() ->
    ok.

stop_pipeline() ->
    ok.

init([]) ->
    {ok, #{}}.

handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`,
    solutionCode: `-module(session_cache).
-behaviour(gen_server).

-export([start_link/0, put_session/3, get_session/1, increment_hits/1, delete_session/1, count_sessions/0]).
-export([start_pipeline/0, stop_pipeline/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

%% Companion Worker & Supervisor exports
-export([start_table_manager/0, tm_init/1, tm_handle_call/3, tm_handle_cast/2, tm_handle_info/2, tm_terminate/2]).
-export([start_sup/0, sup_init/1]).

-define(TAB, session_cache_tab).

start_pipeline() ->
    start_sup().

stop_pipeline() ->
    case whereis(session_sup) of
        undefined -> ok;
        SupPid ->
            unlink(SupPid),
            catch supervisor:stop(SupPid)
    end,
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]],
    ok.

start_sup() ->
    supervisor:start_link({local, session_sup}, ?MODULE, sup).

sup_init(sup) ->
    SupFlags = #{strategy => one_for_one, intensity => 10, period => 5},
    ChildSpecs = [
        #{
            id => table_manager,
            start => {?MODULE, start_table_manager, []},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [?MODULE]
        },
        #{
            id => session_cache,
            start => {?MODULE, start_link, []},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [?MODULE]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.

start_table_manager() ->
    gen_server:start_link({local, table_manager}, ?MODULE, table_manager, []).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, cache, []).

init(sup) ->
    sup_init(sup);
init(table_manager) ->
    tm_init([]);
init(cache) ->
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
                _ -> catch gen_server:call(table_manager, {claim_table, ?TAB}, 1000)
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
        _:_ -> {error, not_found}
    end.

delete_session(SessionId) ->
    ets:delete(?TAB, SessionId),
    ok.

count_sessions() ->
    case ets:info(?TAB, size) of
        undefined -> 0;
        Count -> Count
    end.

handle_call({claim_table, Tab}, {CallerPid, _}, State) ->
    case ets:info(Tab) of
        undefined -> {reply, {error, not_found}, State};
        _ ->
            catch ets:give_away(Tab, CallerPid, reclaimed),
            {reply, ok, State}
    end;
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'ETS-TRANSFER', _Tab, _OldOwner, _Data}, State) ->
    {noreply, State};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

%% Table Manager Callbacks
tm_init([]) ->
    {ok, #{held_tables => #{}}}.

tm_handle_call({claim_table, Tab}, {CallerPid, _}, #{held_tables := Held} = State) ->
    case ets:info(Tab) of
        undefined ->
            {reply, {error, not_found}, State};
        _ ->
            ets:give_away(Tab, CallerPid, reclaimed),
            {reply, ok, State#{held_tables => maps:remove(Tab, Held)}}
    end;
tm_handle_call(_Req, _From, State) ->
    {reply, ok, State}.

tm_handle_cast(_Msg, State) ->
    {noreply, State}.

tm_handle_info({'ETS-TRANSFER', Tab, _OldOwner, _Data}, #{held_tables := Held} = State) ->
    {noreply, State#{held_tables => Held#{Tab => true}}};
tm_handle_info(_Info, State) ->
    {noreply, State}.

tm_terminate(_Reason, _State) ->
    ok.
`,
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Start Pipeline, Store Sessions and Increment Hits',
        erlangCall: 'begin {ok, _} = session_cache:start_pipeline(), ok = session_cache:put_session(<<"s1">>, 101, #{ip => <<"127.0.0.1">>}), {ok, 1} = session_cache:increment_hits(<<"s1">>), {ok, 2} = session_cache:increment_hits(<<"s1">>), {ok, Sess} = session_cache:get_session(<<"s1">>), session_cache:stop_pipeline(), maps:get(hit_count, Sess) end',
        expectedOutput: '2',
        explanation: 'Initializes session pipeline, stores a session, and verifies atomic hit counter updates.'
      },
      {
        id: 'tc2',
        title: 'Heir Failover Across Worker Crash',
        erlangCall: 'begin {ok, _} = session_cache:start_pipeline(), ok = session_cache:put_session(<<"sess_a">>, 999, #{role => admin}), OldPid = whereis(session_cache), exit(OldPid, kill), timer:sleep(50), NewPid = whereis(session_cache), {ok, Sess} = session_cache:get_session(<<"sess_a">>), session_cache:stop_pipeline(), {OldPid =/= NewPid, is_pid(NewPid), maps:get(user_id, Sess)} end',
        expectedOutput: '{true, true, 999}',
        explanation: 'Kills session_cache worker; supervisor restarts it with a new PID and verifies sessions survive via heir failover.'
      }
    ],
    astRules: {
      requiredCalls: ['ets:new/2', 'ets:insert/2', 'ets:lookup/2', 'ets:update_counter/3', 'ets:give_away/3']
    },
    solutionExplanation: 'Implements a fault-tolerant session cache with ETS heir ownership failover and atomic hit tracking.'
  }
];

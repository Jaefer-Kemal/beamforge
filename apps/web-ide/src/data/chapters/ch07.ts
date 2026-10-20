import { LessonContent } from '../../types/workspace';

export const CHAPTER_7_LESSONS: LessonContent[] = [
  // ── Lesson 7.1: Guided Demo ───────────────────────────────────────────────
  {
    id: 'ch07-l01',
    chapterNumber: 7,
    lessonNumber: 1,
    lessonType: 'guided_demo',
    title: 'From Raw Actors to gen_server & Live sys:get_state/1 Introspection',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In Chapters 5 and 6, we implemented custom actor loops using \`spawn\`, \`receive\`, \`make_ref()\`, and \`monitor\`. While writing raw actor loops teaches the foundational mechanics of the BEAM, **writing raw process loops in production is considered an anti-pattern**.

Why? Because a production backend process must handle dozens of complex system concerns beyond its core business logic:
1. **Supervisor Integration**: Graceful shutdown signals (\`{'EXIT', Sup, shutdown}\`) and child spec lifecycles.
2. **Hot Code Upgrades**: Migrating internal state without restarting the VM via \`code_change/3\`.
3. **Live System Introspection**: Debugging live production systems using \`sys:get_state/1\` and \`sys:get_status/1\` without freezing or killing the process.
4. **Preemption & Debug Tracing**: Enabling event tracing via \`sys:trace(Pid, true)\`.

Erlang solves this with **OTP Behaviours**. An OTP Behaviour (like \`gen_server\`, \`gen_statem\`, or \`supervisor\`) uses the **Inversion of Control** pattern: the OTP runtime provides the battle-hardened generic engine that handles concurrency, timeouts, and system messages, while you write a clean, pure callback module.

## Deep Concept Breakdown & Under the Hood

\`\`\`
+-------------------------------------------------------------------------+
|                  The OTP gen_server Architecture                        |
+-------------------------------------------------------------------------+
    Client Call: gen_server:call(Pid, {deposit, 100})
         |
         v
+-------------------------------------------------------------------------+
|                       Generic Engine (gen_server.erl)                   |
|   - Sets up MRef = monitor(process, Pid)                                |
|   - Formats message: {'$gen_call', {From, MRef}, Request}               |
|   - Handles sys messages (sys:get_state, sys:suspend, etc.)             |
+-------------------------------------------------------------------------+
         |
         v Invokes your specific callback!
+-------------------------------------------------------------------------+
|                    Your Callback Module (my_bank.erl)                   |
|   -init(Args)                   -> {ok, State}                          |
|   -handle_call(Request, From, S) -> {reply, Reply, NewState}            |
|   -handle_cast(Request, S)      -> {noreply, NewState}                  |
|   -handle_info(Info, S)         -> {noreply, NewState}                  |
+-------------------------------------------------------------------------+
\`\`\`

### Inspecting Live State with \`sys:get_state/1\`

One of the greatest superpowers of the BEAM VM is live introspection. In Java or Go, inspecting the private heap of a running thread requires attaching a heavy debugger that halts the process. In Erlang, because every \`gen_server\` understands system protocol messages, you can run:

\`\`\`erlang
State = sys:get_state(ServerPid)
\`\`\`

The \`gen_server\` engine intercepts the system query, extracts its current internal \`State\` term, and replies to the caller **without dropping requests or disrupting normal traffic**!

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Module: gen_server (stdlib)
-behaviour(gen_server).

%% Mandatory Callbacks:
init(Args) -> {ok, State} | {ok, State, {continue, Term}} | {stop, Reason}
handle_call(Request, From, State) -> {reply, Reply, NewState} | {noreply, NewState}
handle_cast(Request, State) -> {noreply, NewState}
handle_info(Info, State) -> {noreply, NewState}
terminate(Reason, State) -> ok
code_change(OldVsn, State, Extra) -> {ok, NewState}
\`\`\`

\`\`\`erlang
%% Module: sys (stdlib)
sys:get_state(NameOrPid) -> State
sys:get_status(NameOrPid) -> Status
\`\`\`

## Assignment Specification

This is a **Guided Runnable Demo**. No code changes are required!
1. Inspect the pre-written \`otp_intro_demo\` module in the editor.
2. Click **\`▷ Run\`** below to execute the demo.
3. Observe how the server initializes with state \`#{counter => 0, ops => 0}\`, executes synchronous calls and asynchronous casts, and uses \`sys:get_state/1\` to query the live internal map!

## Rules & Verification Constraints

- Runnable demo verifying \`-behaviour(gen_server)\`.
- Live inspection via \`sys:get_state/1\`.
`,
    otpDocCards: [
      {
        functionName: 'start_link',
        module: 'gen_server',
        signature: 'gen_server:start_link(Mod, Args, Opts) -> {ok, Pid} | {error, Reason}',
        typesSpec: ['Mod = module()', 'Args = term()', 'Opts = list()'],
        description: 'Spawns a gen_server linked to the caller, synchronously invoking Mod:init(Args).',
        complexityNote: 'O(1) process creation with atomic link.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html#start_link/3',
      },
      {
        functionName: 'get_state',
        module: 'sys',
        signature: 'sys:get_state(Pid) -> State',
        typesSpec: ['Pid = pid() | atom()', 'State = term()'],
        description: 'Synchronously queries the internal state of a process implementing OTP system messages.',
        complexityNote: 'O(1) system message round-trip.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/sys.html#get_state/1',
      },
    ],
    starterCode: `-module(otp_intro_demo).
-behaviour(gen_server).

-export([start_link/0, increment/2, get_count/1, stop/1, run_demo/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

%% Client API
start_link() ->
    gen_server:start_link(?MODULE, [], []).

increment(Pid, Amount) ->
    gen_server:cast(Pid, {increment, Amount}).

get_count(Pid) ->
    gen_server:call(Pid, get_count).

stop(Pid) ->
    gen_server:stop(Pid).

%% Server Callbacks
init([]) ->
    {ok, #{counter => 0, ops => 0}}.

handle_call(get_count, _From, #{counter := Count, ops := Ops} = State) ->
    {reply, Count, State#{ops => Ops + 1}};
handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast({increment, Amount}, #{counter := Count, ops := Ops} = State) ->
    {noreply, State#{counter => Count + Amount, ops => Ops + 1}};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.

%% Guided Demo Runner
run_demo() ->
    {ok, Pid} = start_link(),
    increment(Pid, 10),
    increment(Pid, 25),
    timer:sleep(10),
    Count = get_count(Pid),
    LiveState = sys:get_state(Pid),
    stop(Pid),
    #{
        final_count => Count,
        live_state => LiveState
    }.
`,
    solutionCode: `-module(otp_intro_demo).
-behaviour(gen_server).

-export([start_link/0, increment/2, get_count/1, stop/1, run_demo/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

start_link() ->
    gen_server:start_link(?MODULE, [], []).

increment(Pid, Amount) ->
    gen_server:cast(Pid, {increment, Amount}).

get_count(Pid) ->
    gen_server:call(Pid, get_count).

stop(Pid) ->
    gen_server:stop(Pid).

init([]) ->
    {ok, #{counter => 0, ops => 0}}.

handle_call(get_count, _From, #{counter := Count, ops := Ops} = State) ->
    {reply, Count, State#{ops => Ops + 1}};
handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast({increment, Amount}, #{counter := Count, ops := Ops} = State) ->
    {noreply, State#{counter => Count + Amount, ops => Ops + 1}};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.

run_demo() ->
    {ok, Pid} = start_link(),
    increment(Pid, 10),
    increment(Pid, 25),
    timer:sleep(10),
    Count = get_count(Pid),
    LiveState = sys:get_state(Pid),
    stop(Pid),
    #{
        final_count => Count,
        live_state => LiveState
    }.
`,
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Run OTP Intro Demo & Inspect Live State',
        erlangCall: 'otp_intro_demo:run_demo()',
        expectedOutput: '#{final_count => 35, live_state => #{counter => 35, ops => 3}}',
        explanation: 'Demo ran calls and casts, inspected internal process state via sys:get_state/1, and shut down cleanly.',
      },
    ],
    astRules: {
      requiredCalls: ['gen_server:start_link/3', 'sys:get_state/1'],
    },
    solutionExplanation: 'Demonstrates a production gen_server implementation with client wrappers, OTP callbacks, and live system state inspection via sys:get_state/1.',
  },

  // ── Lesson 7.2: Concept Exercise ───────────────────────────────────────────
  {
    id: 'ch07-l02',
    chapterNumber: 7,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'gen_server Essentials: start_link, handle_call & handle_cast',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

The fundamental architectural choice when building any \`gen_server\` endpoint is deciding between **synchronous calls (\`gen_server:call/2,3\`)** and **asynchronous casts (\`gen_server:cast/2\`)**.

Understanding the trade-offs is essential to preventing production outages:

\`\`\`
+-----------------------+-----------------------------+-----------------------------+
| Feature               | Synchronous call (handle_call)| Asynchronous cast (handle_cast)|
+-----------------------+-----------------------------+-----------------------------+
| Return Value          | Returns Reply term to caller| Returns 'ok' immediately    |
| Caller Blocking       | Blocks until server replies | Never blocks the caller     |
| System Backpressure   | Built-in backpressure! Caller| ZERO backpressure! Can flood|
|                       | rate is limited by server.  | server mailbox to OOM.      |
| Error Visibility      | Catches server crashes / err| Failures are silent!        |
+-----------------------+-----------------------------+-----------------------------+
\`\`\`

> **Production Golden Rule:** Default to \`gen_server:call/2\` for 90% of your backend APIs. Use \`gen_server:cast/2\` only when high throughput is mandatory, order is non-critical, and upstream rate-limiting prevents mailbox flooding!

## Deep Concept Breakdown & Under the Hood

### The Callback Signatures

1. **\`init(Args)\`**: Executed synchronously during \`start_link\`. Returns \`{ok, State}\`.
2. **\`handle_call(Request, From, State)\`**:
   - Return tuple: \`{reply, ReplyTerm, NewState}\`
   - \`From\` is an opaque tuple \`{ClientPid, Tag}\` managed by OTP.
3. **\`handle_cast(Request, State)\`**:
   - Return tuple: \`{noreply, NewState}\`
4. **\`stop(Pid)\`**: Cleanly terminates the server using \`gen_server:stop(Pid)\`.

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Module: gen_server
gen_server:call(ServerRef, Request) -> Reply
gen_server:call(ServerRef, Request, Timeout) -> Reply
gen_server:cast(ServerRef, Request) -> ok
gen_server:stop(ServerRef) -> ok
\`\`\`

## Assignment Specification

Implement module \`wallet_server\` with \`-behaviour(gen_server)\`:

1. **State Representation**:
   - Store balances in a map: \`#{balances => #{Currency => NonNegNumber}}\`.
2. **Client API Functions**:
   - \`start_link(InitialBalances) -> {ok, Pid}\`: \`InitialBalances\` is a map of \`#{Currency => InitialAmount}\`.
   - \`credit(Pid, Currency, Amount) -> ok\`: **Asynchronous cast** that adds \`Amount\` (\`Amount > 0\`) to \`Currency\`. If \`Currency\` does not exist, initializes it at \`Amount\`.
   - \`debit(Pid, Currency, Amount) -> {ok, NewBalance} | {error, insufficient_funds} | {error, invalid_amount}\`: **Synchronous call**. If balance exists and \`>= Amount\`, deducts and replies \`{ok, NewBalance}\`. If balance is insufficient, leaves balance unchanged and replies \`{error, insufficient_funds}\`.
   - \`get_balances(Pid) -> #{Currency => Amount}\`: **Synchronous call** returning the map of all currency balances.
   - \`stop(Pid) -> ok\`: Stops the server cleanly.

## Rules & Verification Constraints

- Must declare \`-behaviour(gen_server).\`
- Must export all required client APIs and \`gen_server\` callbacks (\`init/1\`, \`handle_call/3\`, \`handle_cast/2\`, \`handle_info/2\`, \`terminate/2\`, \`code_change/3\`).
- \`credit/3\` **must** use \`gen_server:cast/2\`.
- \`debit/3\` and \`get_balances/1\` **must** use \`gen_server:call/2\`.
`,
    otpDocCards: [
      {
        functionName: 'call',
        module: 'gen_server',
        signature: 'gen_server:call(ServerRef, Request) -> Reply',
        typesSpec: ['ServerRef = pid() | atom()', 'Request = term()', 'Reply = term()'],
        description: 'Sends a synchronous request to ServerRef and waits up to 5,000ms for a reply.',
        complexityNote: 'O(1) message send and monitor setup.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html#call/2',
      },
      {
        functionName: 'cast',
        module: 'gen_server',
        signature: 'gen_server:cast(ServerRef, Request) -> ok',
        typesSpec: ['ServerRef = pid() | atom()', 'Request = term()'],
        description: 'Sends an asynchronous request to ServerRef and returns immediately.',
        complexityNote: 'O(1) lock-free message send.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html#cast/2',
      },
    ],
    starterCode: `-module(wallet_server).
-behaviour(gen_server).

-export([start_link/1, credit/3, debit/3, get_balances/1, stop/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

%% Client API
start_link(InitialBalances) ->
    %% % TODO: Start gen_server
    ok.

credit(Pid, Currency, Amount) ->
    %% % TODO: gen_server:cast
    ok.

debit(Pid, Currency, Amount) ->
    %% % TODO: gen_server:call
    ok.

get_balances(Pid) ->
    %% % TODO: gen_server:call
    ok.

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init(InitialBalances) ->
    %% % TODO: Return {ok, #{balances => InitialBalances}}
    ok.

handle_call(_Request, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    solutionCode: `-module(wallet_server).
-behaviour(gen_server).

-export([start_link/1, credit/3, debit/3, get_balances/1, stop/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

start_link(InitialBalances) when is_map(InitialBalances) ->
    gen_server:start_link(?MODULE, InitialBalances, []).

credit(Pid, Currency, Amount) when Amount > 0 ->
    gen_server:cast(Pid, {credit, Currency, Amount}).

debit(Pid, Currency, Amount) when Amount > 0 ->
    gen_server:call(Pid, {debit, Currency, Amount});
debit(_Pid, _Currency, _Amount) ->
    {error, invalid_amount}.

get_balances(Pid) ->
    gen_server:call(Pid, get_balances).

stop(Pid) ->
    gen_server:stop(Pid).

init(InitialBalances) ->
    {ok, #{balances => InitialBalances}}.

handle_call({debit, Currency, Amount}, _From, #{balances := Balances} = State) ->
    CurrentBal = maps:get(Currency, Balances, 0),
    if
        CurrentBal >= Amount ->
            NewBal = CurrentBal - Amount,
            NewBalances = maps:put(Currency, NewBal, Balances),
            {reply, {ok, NewBal}, State#{balances => NewBalances}};
        true ->
            {reply, {error, insufficient_funds}, State}
    end;

handle_call(get_balances, _From, #{balances := Balances} = State) ->
    {reply, Balances, State};

handle_call(_Request, _From, State) ->
    {reply, {error, unknown_request}, State}.

handle_cast({credit, Currency, Amount}, #{balances := Balances} = State) ->
    CurrentBal = maps:get(Currency, Balances, 0),
    NewBalances = maps:put(Currency, CurrentBal + Amount, Balances),
    {noreply, State#{balances => NewBalances}};

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Credit and Balance Retrieval',
        erlangCall: 'begin {ok, W} = wallet_server:start_link(#{<<"USD">> => 100}), wallet_server:credit(W, <<"EUR">>, 50), timer:sleep(20), Bals = wallet_server:get_balances(W), wallet_server:stop(W), Bals end',
        expectedOutput: '#{<<"EUR">> => 50, <<"USD">> => 100}',
        explanation: 'Initial USD balance preserved; asynchronous credit of EUR processed cleanly.',
      },
      {
        id: 'tc2',
        title: 'Debit with Insufficient Funds Protection',
        erlangCall: 'begin {ok, W} = wallet_server:start_link(#{<<"USD">> => 100}), {ok, 60} = wallet_server:debit(W, <<"USD">>, 40), Err = wallet_server:debit(W, <<"USD">>, 1000), wallet_server:stop(W), Err end',
        expectedOutput: '{error, insufficient_funds}',
        explanation: 'Valid debit reduced balance to 60; over-withdrawal rejected without corrupting state.',
      },
    ],
    astRules: {
      requiredCalls: ['gen_server:start_link/3', 'gen_server:call/2', 'gen_server:cast/2'],
    },
    solutionExplanation: 'Implements a multi-currency wallet gen_server with synchronous calls for debit/balances and asynchronous casts for credit.',
  },

  // ── Lesson 7.3: Concept Exercise ───────────────────────────────────────────
  {
    id: 'ch07-l03',
    chapterNumber: 7,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Non-Blocking Init with handle_continue & Periodic handle_info Timers',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

A common beginner mistake in OTP architecture is performing heavy, blocking work inside \`init/1\`:
\`\`\`erlang
%% HAZARDOUS in production!
init([]) ->
    DbPool = connect_to_remote_db_cluster(), %% Blocks for 3,000ms!
    {ok, #{db => DbPool}}.
\`\`\`
Because \`gen_server:start_link\` blocks the caller until \`init/1\` returns, **blocking inside \`init/1\` freezes the parent supervisor**! If your database is slow or down during system boot, the entire application crashes due to startup timeout.

To fix this, modern OTP introduced **\`handle_continue/2\`**:
\`\`\`erlang
init([]) ->
    {ok, #{db => undefined}, {continue, connect_db}}.

handle_continue(connect_db, State) ->
    Db = connect_to_remote_db_cluster(),
    {noreply, State#{db => Db}}.
\`\`\`
1. \`init/1\` returns in **microseconds**, unblocking the supervisor immediately.
2. The BEAM runtime executes \`handle_continue/2\` **before processing any client call or cast from the mailbox**!

### Periodic Timers with \`erlang:send_after/3\` & \`handle_info/2\`

Processes frequently need periodic maintenance: expiring session tokens, flushing write buffers, and sending heartbeat pings. The standard OTP pattern uses \`erlang:send_after/3\`:
\`\`\`erlang
schedule_tick(IntervalMs) ->
    erlang:send_after(IntervalMs, self(), cleanup_tick).
\`\`\`
Messages sent directly to \`self()\` (not via \`call\` or \`cast\`) arrive as out-of-band events in **\`handle_info/2\`**!

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Callback: handle_continue/2 (OTP 21+)
handle_continue(ContinueTerm, State) -> {noreply, NewState} | {stop, Reason, NewState}

%% BIF: erlang:send_after/3
erlang:send_after(TimeMs, DestPid, Message) -> TimerRef
\`\`\`

## Assignment Specification

Implement module \`session_ttl_server\` with \`-behaviour(gen_server)\`:

1. **Initialization**:
   - \`start_link(TtlSeconds) -> {ok, Pid}\`:
   - \`init(TtlSeconds)\` **must** return \`{ok, #{ttl => TtlSeconds, sessions => #{}}, {continue, hydrate_defaults}}\`.
2. **Post-Init Continuation**:
   - \`handle_continue(hydrate_defaults, State)\`: Seeds the session store with a default session:
     \`<<"guest">> => erlang:system_time(second)\`.
   - Starts the periodic cleanup timer: \`erlang:send_after(1000, self(), cleanup_tick)\`.
   - Returns \`{noreply, NewState}\`.
3. **Client API Functions**:
   - \`create_session(Pid, SessionId) -> ok\`: Synchronous call storing \`SessionId => erlang:system_time(second)\`.
   - \`is_valid(Pid, SessionId) -> boolean()\`: Synchronous call checking if \`SessionId\` exists and \`CurrentTime - CreatedAt =< Ttl\`.
   - \`get_active_count(Pid) -> non_neg_integer()\`: Returns count of active sessions.
   - \`stop(Pid) -> ok\`: Stops the server.
4. **Periodic Cleanup in \`handle_info/2\`**:
   - When receiving \`cleanup_tick\`: filters out expired sessions where \`Now - CreatedAt > Ttl\`. Reschedules \`erlang:send_after(1000, self(), cleanup_tick)\` and returns \`{noreply, CleanedState}\`.

## Rules & Verification Constraints

- Must return \`{ok, State, {continue, hydrate_defaults}}\` from \`init/1\`.
- Must implement \`handle_continue/2\`.
- Must handle \`cleanup_tick\` in \`handle_info/2\`.
`,
    otpDocCards: [
      {
        functionName: 'send_after',
        module: 'erlang',
        signature: 'erlang:send_after(TimeMs, Pid, Msg) -> TimerRef',
        typesSpec: ['TimeMs = integer()', 'Pid = pid()', 'Msg = term()'],
        description: 'Delivers Msg to Pid after TimeMs milliseconds. Arrives in handle_info/2.',
        complexityNote: 'O(log N) in ERTS timer wheel.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#send_after/3',
      },
    ],
    starterCode: `-module(session_ttl_server).
-behaviour(gen_server).

-export([start_link/1, create_session/2, is_valid/2, get_active_count/1, stop/1]).
-export([init/1, handle_continue/2, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

start_link(TtlSeconds) ->
    gen_server:start_link(?MODULE, TtlSeconds, []).

create_session(Pid, SessionId) ->
    gen_server:call(Pid, {create_session, SessionId}).

is_valid(Pid, SessionId) ->
    gen_server:call(Pid, {is_valid, SessionId}).

get_active_count(Pid) ->
    gen_server:call(Pid, get_active_count).

stop(Pid) ->
    gen_server:stop(Pid).

init(TtlSeconds) ->
    %% % TODO: Return {ok, InitialState, {continue, hydrate_defaults}}
    ok.

handle_continue(hydrate_defaults, State) ->
    %% % TODO: Seed <<"guest">> and schedule timer
    {noreply, State}.

handle_call(_Request, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(cleanup_tick, State) ->
    %% % TODO: Sweep expired sessions and reschedule timer
    {noreply, State};
handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    solutionCode: `-module(session_ttl_server).
-behaviour(gen_server).

-export([start_link/1, create_session/2, is_valid/2, get_active_count/1, stop/1]).
-export([init/1, handle_continue/2, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

start_link(TtlSeconds) when is_integer(TtlSeconds), TtlSeconds >= 0 ->
    gen_server:start_link(?MODULE, TtlSeconds, []).

create_session(Pid, SessionId) ->
    gen_server:call(Pid, {create_session, SessionId}).

is_valid(Pid, SessionId) ->
    gen_server:call(Pid, {is_valid, SessionId}).

get_active_count(Pid) ->
    gen_server:call(Pid, get_active_count).

stop(Pid) ->
    gen_server:stop(Pid).

init(TtlSeconds) ->
    {ok, #{ttl => TtlSeconds, sessions => #{}}, {continue, hydrate_defaults}}.

handle_continue(hydrate_defaults, #{sessions := Sessions} = State) ->
    Now = erlang:system_time(second),
    NewSessions = maps:put(<<"guest">>, Now, Sessions),
    erlang:send_after(1000, self(), cleanup_tick),
    {noreply, State#{sessions => NewSessions}}.

handle_call({create_session, SessionId}, _From, #{sessions := Sessions} = State) ->
    Now = erlang:system_time(second),
    NewSessions = maps:put(SessionId, Now, Sessions),
    {reply, ok, State#{sessions => NewSessions}};

handle_call({is_valid, SessionId}, _From, #{ttl := Ttl, sessions := Sessions} = State) ->
    Now = erlang:system_time(second),
    Valid = case maps:find(SessionId, Sessions) of
        {ok, CreatedAt} when (Now - CreatedAt) =< Ttl -> true;
        _ -> false
    end,
    {reply, Valid, State};

handle_call(get_active_count, _From, #{sessions := Sessions} = State) ->
    {reply, maps:size(Sessions), State};

handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(cleanup_tick, #{ttl := Ttl, sessions := Sessions} = State) ->
    Now = erlang:system_time(second),
    CleanedSessions = maps:filter(fun(_Id, CreatedAt) -> (Now - CreatedAt) =< Ttl end, Sessions),
    erlang:send_after(1000, self(), cleanup_tick),
    {noreply, State#{sessions => CleanedSessions}};

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Hydrate Defaults via handle_continue',
        erlangCall: 'begin {ok, S} = session_ttl_server:start_link(60), Valid = session_ttl_server:is_valid(S, <<"guest">>), session_ttl_server:stop(S), Valid end',
        expectedOutput: 'true',
        explanation: 'Session <<"guest">> was populated during handle_continue before client queries were served.',
      },
      {
        id: 'tc2',
        title: 'Session Creation and Active Count',
        erlangCall: 'begin {ok, S} = session_ttl_server:start_link(60), ok = session_ttl_server:create_session(S, <<"user_101">>), Count = session_ttl_server:get_active_count(S), session_ttl_server:stop(S), Count end',
        expectedOutput: '2',
        explanation: 'Active count reflects 1 guest session plus 1 created user session.',
      },
    ],
    astRules: {
      requiredCalls: ['erlang:send_after/3'],
    },
    solutionExplanation: 'Uses handle_continue for non-blocking initialization and handle_info with erlang:send_after for background session expiry.',
  },

  // ── Lesson 7.4: Concept Exercise ───────────────────────────────────────────
  {
    id: 'ch07-l04',
    chapterNumber: 7,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'gen_statem: Protocol & Circuit Breaker State Machines',
    difficulty: 'Advanced',
    conceptMarkdown: `## Why This Matters in Production

While \`gen_server\` is ideal for managing resource pools or key-value caches, many enterprise systems are **State Machines**:
- **Connection Handshakes**: A TCP socket moves through \`unconnected -> handshaking -> authenticated -> active\`.
- **Payment Processing**: An escrow transaction moves through \`pending -> authorized -> captured | refunded\`.
- **Circuit Breakers**: A microservice proxy monitors downstream health across \`closed -> open -> half_open\`.

Attempting to model complex state transitions inside a standard \`gen_server\` results in fragile \`case State#state.mode of ...\` branching where bugs frequently allow invalid actions (e.g. capturing a payment before authorization).

Erlang provides **\`gen_statem\`** (State Machine Behaviour) to enforce strict, verified state transitions.

## Deep Concept Breakdown & Under the Hood

\`\`\`
+-------------------------------------------------------------------------+
|                  Circuit Breaker State Machine Transitions              |
+-------------------------------------------------------------------------+
                      [closed] (Healthy - Requests Flow)
                         |
           Failures >= Threshold hit!
                         |
                         v
                       [open] (Downstream Dead - Fast Fail {error, circuit_open})
                         |
               After OpenTimeoutMs...
                         |
                         v
                    [half_open] (Trial Request)
                    /          \\
           Trial Fails!       Trial Succeeds!
                 /                \\
                v                  v
             [open]             [closed]
\`\`\`

### The \`state_functions\` Callback Mode

In \`callback_mode() -> state_functions\`, **each state is represented by an exported function** sharing that state's exact name:

\`\`\`erlang
closed({call, From}, {execute, ActionFun}, Data) ->
    case ActionFun() of
        {ok, Result} ->
            {keep_state, Data#{failures => 0}, [{reply, From, {ok, Result}}]};
        {error, Reason} ->
            %% Increment failure count and check threshold...
    end.
\`\`\`

Common return actions:
- \`{keep_state, NewData, [{reply, From, Reply}]}\`: Stays in the current state and replies to caller.
- \`{next_state, NextState, NewData, [{reply, From, Reply}]}\`: Transitions to \`NextState\` and replies.
- \`{next_state, open, NewData, [{state_timeout, TimeoutMs, retry_half_open}]}\`: Automatically triggers an event when the state timer expires!

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Module: gen_statem
-behaviour(gen_statem).

callback_mode() -> state_functions.
init(Args) -> {ok, InitialStateName, InitialData}.
\`\`\`

## Assignment Specification

Implement module \`circuit_breaker_statem\` with \`-behaviour(gen_statem)\`:

1. **State Machine Modes & States**:
   - \`callback_mode() -> state_functions\`.
   - States: \`closed\`, \`open\`, \`half_open\`.
   - Data map: \`#{threshold => Int, failures => Int, timeout_ms => Int}\`.
2. **Client API Functions**:
   - \`start_link(FailureThreshold, OpenTimeoutMs) -> {ok, Pid}\`: Initializes in state \`closed\` with \`failures => 0\`.
   - \`execute(Pid, ActionFun) -> {ok, Result} | {error, circuit_open} | {error, Reason}\`:
     - Synchronous call executed against the state machine.
   - \`get_state_name(Pid) -> closed | open | half_open\`: Returns current state atom.
   - \`stop(Pid) -> ok\`: Stops the state machine.
3. **State Behaviors**:
   - **\`closed\`**:
     - Executes \`ActionFun()\`. If \`{ok, Res}\`, resets \`failures => 0\` and replies \`{ok, Res}\`.
     - If \`{error, Reason}\`, increments \`failures\`. If new \`failures >= threshold\`, transitions to state \`open\`, sets state timeout for \`OpenTimeoutMs\`, and replies \`{error, Reason}\`.
   - **\`open\`**:
     - Immediately fast-fails calls with \`{error, circuit_open}\` without invoking \`ActionFun\`!
     - When state timeout fires (\`state_timeout, _\`), transitions to \`half_open\`.
   - **\`half_open\`**:
     - Attempts trial request \`ActionFun()\`.
     - If \`{ok, Res}\`, transitions back to \`closed\`, resets \`failures => 0\`, and replies \`{ok, Res}\`.
     - If \`{error, Reason}\`, transitions back to \`open\` with timeout and replies \`{error, Reason}\`.

## Rules & Verification Constraints

- Must implement \`-behaviour(gen_statem).\` with \`callback_mode() -> state_functions\`.
- In state \`open\`, \`ActionFun\` must **never** be executed!
`,
    otpDocCards: [
      {
        functionName: 'start_link',
        module: 'gen_statem',
        signature: 'gen_statem:start_link(Mod, Args, Opts) -> {ok, Pid} | {error, Reason}',
        typesSpec: ['Mod = module()', 'Args = term()'],
        description: 'Starts a gen_statem state machine process linked to caller.',
        complexityNote: 'O(1) state machine allocation.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_statem.html#start_link/3',
      },
    ],
    starterCode: `-module(circuit_breaker_statem).
-behaviour(gen_statem).

-export([start_link/2, execute/2, get_state_name/1, stop/1]).
-export([callback_mode/0, init/1, terminate/3, code_change/4]).
-export([closed/3, open/3, half_open/3]).

start_link(Threshold, OpenTimeoutMs) ->
    gen_statem:start_link(?MODULE, {Threshold, OpenTimeoutMs}, []).

execute(Pid, ActionFun) ->
    gen_statem:call(Pid, {execute, ActionFun}).

get_state_name(Pid) ->
    gen_statem:call(Pid, get_state_name).

stop(Pid) ->
    gen_statem:stop(Pid).

callback_mode() ->
    state_functions.

init({Threshold, OpenTimeoutMs}) ->
    %% % TODO: Return {ok, closed, Data}
    ok.

closed(_EventType, _EventContent, _Data) ->
    %% % TODO: Handle calls and failures
    keep_state_and_data.

open(_EventType, _EventContent, _Data) ->
    %% % TODO: Fast-fail and transition on state_timeout
    keep_state_and_data.

half_open(_EventType, _EventContent, _Data) ->
    %% % TODO: Trial request handling
    keep_state_and_data.

terminate(_Reason, _State, _Data) ->
    ok.

code_change(_OldVsn, State, Data, _Extra) ->
    {ok, State, Data}.
`,
    solutionCode: `-module(circuit_breaker_statem).
-behaviour(gen_statem).

-export([start_link/2, execute/2, get_state_name/1, stop/1]).
-export([callback_mode/0, init/1, terminate/3, code_change/4]).
-export([closed/3, open/3, half_open/3]).

start_link(Threshold, OpenTimeoutMs) when is_integer(Threshold), is_integer(OpenTimeoutMs) ->
    gen_statem:start_link(?MODULE, {Threshold, OpenTimeoutMs}, []).

execute(Pid, ActionFun) when is_function(ActionFun, 0) ->
    gen_statem:call(Pid, {execute, ActionFun}).

get_state_name(Pid) ->
    gen_statem:call(Pid, get_state_name).

stop(Pid) ->
    gen_statem:stop(Pid).

callback_mode() ->
    state_functions.

init({Threshold, OpenTimeoutMs}) ->
    Data = #{
        threshold => Threshold,
        failures => 0,
        timeout_ms => OpenTimeoutMs
    },
    {ok, closed, Data}.

closed({call, From}, get_state_name, _Data) ->
    {keep_state_and_data, [{reply, From, closed}]};
closed({call, From}, {execute, ActionFun}, #{threshold := Threshold, failures := Failures, timeout_ms := TimeoutMs} = Data) ->
    case ActionFun() of
        {ok, Result} ->
            {keep_state, Data#{failures => 0}, [{reply, From, {ok, Result}}]};
        {error, Reason} ->
            NewFailures = Failures + 1,
            if
                NewFailures >= Threshold ->
                    NewData = Data#{failures => NewFailures},
                    {next_state, open, NewData, [{reply, From, {error, Reason}}, {state_timeout, TimeoutMs, transition_half_open}]};
                true ->
                    {keep_state, Data#{failures => NewFailures}, [{reply, From, {error, Reason}}]}
            end
    end;
closed(_EventType, _EventContent, _Data) ->
    keep_state_and_data.

open({call, From}, get_state_name, _Data) ->
    {keep_state_and_data, [{reply, From, open}]};
open({call, From}, {execute, _ActionFun}, _Data) ->
    {keep_state_and_data, [{reply, From, {error, circuit_open}}]};
open(state_timeout, transition_half_open, Data) ->
    {next_state, half_open, Data};
open(_EventType, _EventContent, _Data) ->
    keep_state_and_data.

half_open({call, From}, get_state_name, _Data) ->
    {keep_state_and_data, [{reply, From, half_open}]};
half_open({call, From}, {execute, ActionFun}, #{timeout_ms := TimeoutMs} = Data) ->
    case ActionFun() of
        {ok, Result} ->
            {next_state, closed, Data#{failures => 0}, [{reply, From, {ok, Result}}]};
        {error, Reason} ->
            {next_state, open, Data, [{reply, From, {error, Reason}}, {state_timeout, TimeoutMs, transition_half_open}]}
    end;
half_open(_EventType, _EventContent, _Data) ->
    keep_state_and_data.

terminate(_Reason, _State, _Data) ->
    ok.

code_change(_OldVsn, State, Data, _Extra) ->
    {ok, State, Data}.
`,
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Circuit Closed Normal Execution',
        erlangCall: 'begin {ok, CB} = circuit_breaker_statem:start_link(2, 500), Res = circuit_breaker_statem:execute(CB, fun() -> {ok, data_loaded} end), circuit_breaker_statem:stop(CB), Res end',
        expectedOutput: '{ok, data_loaded}',
        explanation: 'In closed state, healthy requests execute cleanly.',
      },
      {
        id: 'tc2',
        title: 'Threshold Breach to Open State & Fast Fail',
        erlangCall: 'begin {ok, CB} = circuit_breaker_statem:start_link(2, 500), circuit_breaker_statem:execute(CB, fun() -> {error, timeout} end), circuit_breaker_statem:execute(CB, fun() -> {error, timeout} end), State = circuit_breaker_statem:get_state_name(CB), Blocked = circuit_breaker_statem:execute(CB, fun() -> {ok, should_not_run} end), circuit_breaker_statem:stop(CB), {State, Blocked} end',
        expectedOutput: '{open, {error, circuit_open}}',
        explanation: 'After 2 failures hit the threshold, circuit opened and fast-failed the subsequent request.',
      },
    ],
    astRules: {
      requiredCalls: ['gen_statem:start_link/3', 'gen_statem:call/2'],
    },
    solutionExplanation: 'Implements a 3-state Circuit Breaker using gen_statem state_functions callback mode with automated timeout-based recovery.',
  },

  // ── Lesson 7.5: Concept Exercise ───────────────────────────────────────────
  {
    id: 'ch07-l05',
    chapterNumber: 7,
    lessonNumber: 5,
    lessonType: 'concept_exercise',
    title: 'gen_event: Decoupled Event Buses & Security Audit Loggers',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In microservice and backend architectures, a single action often requires multiple decoupled side-effects:
- When a user logs in: write an audit log, update the last-login timestamp in ETS, send a metrics counter to Datadog, and evaluate fraud risk.
- If we put all four side effects inside the authentication \`gen_server\`, our auth service becomes tightly coupled, slow, and fragile.

Erlang solves this with **\`gen_event\`** (The Event Manager Behaviour). Unlike \`gen_server\` which runs a single callback module, a \`gen_event\` manager process acts as a **publish-subscribe event bus**. Pluggable handler modules can be attached, inspected, and detached dynamically at runtime without restarting the application!

## Deep Concept Breakdown & Under the Hood

\`\`\`
+-------------------------------------------------------------------------+
|                  gen_event Manager & Dynamic Handlers                   |
+-------------------------------------------------------------------------+
                          gen_event:notify(Mgr, Event)
                                      |
                                      v
                        +---------------------------+
                        |     gen_event Manager     |
                        +---------------------------+
                               /      |      \\
                             /        |        \\
                           v          v          v
                  [Audit Logger]  [StatsD]  [Fraud Detector]
\`\`\`

### The \`gen_event\` Callback Invariants

A handler module exports:
1. \`init(Args) -> {ok, InitialState}\`
2. \`handle_event(Event, State) -> {ok, NewState}\`
3. \`handle_call(Request, State) -> {ok, Reply, NewState}\`
4. \`terminate(Reason, State) -> ok\`

## 📖 Official Erlang Docs & Function Reference

\`\`\`erlang
%% Module: gen_event
gen_event:start_link() -> {ok, MgrPid}
gen_event:add_handler(MgrPid, HandlerMod, Args) -> ok | {'EXIT', Reason}
gen_event:notify(MgrPid, Event) -> ok
gen_event:call(MgrPid, HandlerMod, Request) -> Reply
\`\`\`

## Assignment Specification

Implement module \`security_audit_handler\` with \`-behaviour(gen_event)\`:

1. **Handler State**:
   - Store failure counts per IP address: \`#{failures => #{IpBinary => Count}, alert_threshold => Int}\`.
2. **Callbacks**:
   - \`init(AlertThreshold) -> {ok, State}\`: Initializes state with empty failure map and \`alert_threshold => AlertThreshold\`.
   - \`handle_event({login_failed, IpAddress}, State)\`: Increments failure count for \`IpAddress\`. If count reaches or exceeds \`alert_threshold\`, sets a flag in the state indicating an active alert for that IP.
   - \`handle_event({login_success, IpAddress}, State)\`: Clears failed attempt history for \`IpAddress\`.
   - \`handle_call({get_status, IpAddress}, State)\`: Replies with \`{ok, #{attempts => Count, alert => Boolean}}\`.
   - \`handle_call(get_all_alerts, State)\`: Replies with list of IP binaries that have breached the alert threshold.
3. Helper functions:
   - Provide client helpers \`add_to_manager(MgrPid, AlertThreshold)\` and \`get_ip_status(MgrPid, IpAddress)\`.

## Rules & Verification Constraints

- Must implement \`-behaviour(gen_event).\`
- Must handle both \`login_failed\` and \`login_success\` in \`handle_event/2\`.
`,
    otpDocCards: [
      {
        functionName: 'add_handler',
        module: 'gen_event',
        signature: 'gen_event:add_handler(Mgr, Handler, Args) -> ok | {error, term()}',
        typesSpec: ['Mgr = pid() | atom()', 'Handler = module()', 'Args = term()'],
        description: 'Dynamically attaches an event handler callback to the event manager.',
        complexityNote: 'O(1) handler registration.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_event.html#add_handler/3',
      },
    ],
    starterCode: `-module(security_audit_handler).
-behaviour(gen_event).

-export([add_to_manager/2, get_ip_status/2]).
-export([init/1, handle_event/2, handle_call/2, handle_info/2, terminate/2, code_change/3]).

add_to_manager(MgrPid, AlertThreshold) ->
    gen_event:add_handler(MgrPid, ?MODULE, AlertThreshold).

get_ip_status(MgrPid, IpAddress) ->
    gen_event:call(MgrPid, ?MODULE, {get_status, IpAddress}).

init(AlertThreshold) ->
    %% % TODO: Return {ok, #{failures => #{}, threshold => AlertThreshold}}
    ok.

handle_event(_Event, State) ->
    {ok, State}.

handle_call(_Request, State) ->
    {ok, ok, State}.

handle_info(_Info, State) ->
    {ok, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    solutionCode: `-module(security_audit_handler).
-behaviour(gen_event).

-export([add_to_manager/2, get_ip_status/2]).
-export([init/1, handle_event/2, handle_call/2, handle_info/2, terminate/2, code_change/3]).

add_to_manager(MgrPid, AlertThreshold) ->
    gen_event:add_handler(MgrPid, ?MODULE, AlertThreshold).

get_ip_status(MgrPid, IpAddress) ->
    gen_event:call(MgrPid, ?MODULE, {get_status, IpAddress}).

init(AlertThreshold) when is_integer(AlertThreshold) ->
    {ok, #{failures => #{}, threshold => AlertThreshold}}.

handle_event({login_failed, IpAddress}, #{failures := Failures, threshold := Threshold} = State) ->
    Current = maps:get(IpAddress, Failures, 0),
    NewFailures = maps:put(IpAddress, Current + 1, Failures),
    {ok, State#{failures => NewFailures, alert => (Current + 1 >= Threshold)}};

handle_event({login_success, IpAddress}, #{failures := Failures} = State) ->
    NewFailures = maps:remove(IpAddress, Failures),
    {ok, State#{failures => NewFailures}};

handle_event(_OtherEvent, State) ->
    {ok, State}.

handle_call({get_status, IpAddress}, #{failures := Failures, threshold := Threshold} = State) ->
    Count = maps:get(IpAddress, Failures, 0),
    Reply = {ok, #{attempts => Count, alert => (Count >= Threshold)}},
    {ok, Reply, State};

handle_call(get_all_alerts, #{failures := Failures, threshold := Threshold} = State) ->
    AlertIps = [Ip || {Ip, Count} <- maps:to_list(Failures), Count >= Threshold],
    {ok, AlertIps, State};

handle_call(_Request, State) ->
    {ok, {error, unknown_call}, State}.

handle_info(_Info, State) ->
    {ok, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Event Bus Notification and Threshold Alert',
        erlangCall: 'begin {ok, Mgr} = gen_event:start_link(), ok = security_audit_handler:add_to_manager(Mgr, 3), gen_event:notify(Mgr, {login_failed, <<"192.168.1.5">>}), gen_event:notify(Mgr, {login_failed, <<"192.168.1.5">>}), gen_event:notify(Mgr, {login_failed, <<"192.168.1.5">>}), Status = security_audit_handler:get_ip_status(Mgr, <<"192.168.1.5">>), gen_event:stop(Mgr), Status end',
        expectedOutput: '{ok, #{alert => true, attempts => 3}}',
        explanation: 'Three consecutive failed logins triggered the alert threshold on the IP address.',
      },
    ],
    astRules: {
      requiredCalls: ['gen_event:add_handler/3', 'gen_event:call/3'],
    },
    solutionExplanation: 'Implements an event-driven security audit handler tracking IP failures on a gen_event bus with threshold-based alerting.',
  },

  // ── Lesson 7.6: Problem Set ────────────────────────────────────────────────
  {
    id: 'ch07-l06',
    chapterNumber: 7,
    lessonNumber: 6,
    lessonType: 'problem_set',
    title: 'Assignment: API Gateway Token-Bucket Rate Limiter (rate_limiter_srv.erl)',
    difficulty: 'Production',
    conceptMarkdown: `## Why This Matters in Production

In microservice backends, API Gateways (like Kong, Envoy, or Cloudflare) protect upstream database services against traffic spikes and denial-of-service attacks using the **Token-Bucket Algorithm**:
1. Each client (identified by an API key or IP address) has an independent bucket holding up to \`MaxTokens\` tokens.
2. Every request consumes a specified cost (e.g. 1 token for GET, 5 tokens for heavy report generation).
3. If enough tokens exist: request is **allowed** (\`{allow, RemainingTokens}\`).
4. If tokens are insufficient: request is **denied** immediately with HTTP 429 (\`{deny, CurrentTokens}\`).
5. A recurring background ticker periodically refills all buckets with \`RefillAmount\` tokens up to \`MaxTokens\`.

Implementing this as an OTP \`gen_server\` gives us:
- **Lock-free atomicity**: State is modified strictly inside the single-threaded server loop, eliminating race conditions.
- **Microsecond response latency**: In-memory hash maps on the process heap execute in $O(1)$ time.
- **Live telemetry introspection**: Operators can inspect \`sys:get_state(Pid)\` to audit active clients and reject metrics in real time!

## Deep Concept Breakdown & Under the Hood

\`\`\`
+-------------------------------------------------------------------------+
|                  Token-Bucket Algorithm State Map                       |
+-------------------------------------------------------------------------+
#{
    max_tokens    => 10,
    refill_amount => 3,
    clients       => #{
        <<"client_alice">> => 7,
        <<"client_bob">>   => 0   <-- Denied on next check!
    },
    total_allowed  => 142,
    total_rejected => 18
}
\`\`\`

## 📖 Official Erlang Docs & Function Reference

- [\`erlang.org/doc/apps/stdlib/gen_server.html\`](https://www.erlang.org/doc/apps/stdlib/gen_server.html)
- [\`erlang.org/doc/apps/stdlib/sys.html#get_state/1\`](https://www.erlang.org/doc/apps/stdlib/sys.html#get_state/1)

## Assignment Specification

Implement module \`rate_limiter_srv\` with \`-behaviour(gen_server)\`:

### 1. Data Representation
State is a map:
\`\`\`erlang
#{
    max_tokens     => pos_integer(),
    refill_amount  => pos_integer(),
    clients        => #{binary() | atom() => non_neg_integer()},
    total_allowed  => non_neg_integer(),
    total_rejected => non_neg_integer()
}
\`\`\`

### 2. Client API Exports
\`\`\`erlang
-module(rate_limiter_srv).
-behaviour(gen_server).

-export([
    start_link/2,
    check_request/3,
    refill_all/1,
    reset_client/2,
    get_stats/1,
    stop/1
]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).
\`\`\`

### 3. Function Specifications

1. \`start_link(MaxTokens, RefillAmount) -> {ok, Pid}\`:
   - Starts the \`gen_server\` with initial state:
     \`clients => #{}\`, \`total_allowed => 0\`, \`total_rejected => 0\`.
2. \`check_request(Pid, ClientId, CostTokens) -> {allow, RemainingTokens} | {deny, CurrentTokens}\`:
   - Synchronous call (\`gen_server:call/2\`).
   - If \`ClientId\` is not yet in \`clients\`, initialize their bucket at \`MaxTokens\` before checking.
   - If available tokens \`>= CostTokens\`: deduct \`CostTokens\`, increment \`total_allowed\`, update client bucket, and reply \`{allow, RemainingTokens}\`.
   - If available tokens \`< CostTokens\`: leave client bucket unchanged, increment \`total_rejected\`, and reply \`{deny, CurrentTokens}\`.
3. \`refill_all(Pid) -> ok\`:
   - Synchronous call that refills every existing client in \`clients\` by adding \`RefillAmount\`, capped at \`MaxTokens\` (\`min(MaxTokens, Current + RefillAmount)\`).
4. \`reset_client(Pid, ClientId) -> ok\`:
   - Asynchronous cast (\`gen_server:cast/2\`) that resets \`ClientId\`'s bucket back to \`MaxTokens\`.
5. \`get_stats(Pid) -> #{total_allowed := Int, total_rejected := Int, active_clients := Int}\`:
   - Synchronous call returning metrics map.
6. \`stop(Pid) -> ok\`:
   - Stops the server cleanly via \`gen_server:stop(Pid)\`.

## Rules & Verification Constraints

- Must implement \`-behaviour(gen_server).\`
- Verified live by \`bf_grader\` using \`sys:get_state(Pid)\` to validate the internal state map structure!
`,
    otpDocCards: [
      {
        functionName: 'behaviour',
        module: 'gen_server',
        signature: '-behaviour(gen_server).',
        typesSpec: ['Callback compliance verified by compiler and Dialyzer.'],
        description: 'Declares that this module implements the standard OTP gen_server contract.',
        complexityNote: 'Zero runtime overhead.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/gen_server.html',
      },
    ],
    starterCode: `-module(rate_limiter_srv).
-behaviour(gen_server).

-export([
    start_link/2,
    check_request/3,
    refill_all/1,
    reset_client/2,
    get_stats/1,
    stop/1
]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

%% Client API
start_link(MaxTokens, RefillAmount) ->
    %% % TODO: Start gen_server
    ok.

check_request(Pid, ClientId, CostTokens) ->
    %% % TODO: Synchronous call
    ok.

refill_all(Pid) ->
    %% % TODO: Synchronous refill
    ok.

reset_client(Pid, ClientId) ->
    %% % TODO: Asynchronous cast
    ok.

get_stats(Pid) ->
    %% % TODO: Return stats map
    ok.

stop(Pid) ->
    gen_server:stop(Pid).

%% Server Callbacks
init({MaxTokens, RefillAmount}) ->
    %% % TODO: Initialize state map
    ok.

handle_call(_Request, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    solutionCode: `-module(rate_limiter_srv).
-behaviour(gen_server).

-export([
    start_link/2,
    check_request/3,
    refill_all/1,
    reset_client/2,
    get_stats/1,
    stop/1
]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

start_link(MaxTokens, RefillAmount) when is_integer(MaxTokens), is_integer(RefillAmount), MaxTokens > 0, RefillAmount > 0 ->
    gen_server:start_link(?MODULE, {MaxTokens, RefillAmount}, []).

check_request(Pid, ClientId, CostTokens) when is_integer(CostTokens), CostTokens > 0 ->
    gen_server:call(Pid, {check_request, ClientId, CostTokens}).

refill_all(Pid) ->
    gen_server:call(Pid, refill_all).

reset_client(Pid, ClientId) ->
    gen_server:cast(Pid, {reset_client, ClientId}).

get_stats(Pid) ->
    gen_server:call(Pid, get_stats).

stop(Pid) ->
    gen_server:stop(Pid).

init({MaxTokens, RefillAmount}) ->
    State = #{
        max_tokens => MaxTokens,
        refill_amount => RefillAmount,
        clients => #{},
        total_allowed => 0,
        total_rejected => 0
    },
    {ok, State}.

handle_call({check_request, ClientId, Cost}, _From, #{max_tokens := Max, clients := Clients, total_allowed := Allowed, total_rejected := Rejected} = State) ->
    CurrentTokens = maps:get(ClientId, Clients, Max),
    if
        CurrentTokens >= Cost ->
            Remaining = CurrentTokens - Cost,
            NewClients = maps:put(ClientId, Remaining, Clients),
            {reply, {allow, Remaining}, State#{clients => NewClients, total_allowed => Allowed + 1}};
        true ->
            NewClients = maps:put(ClientId, CurrentTokens, Clients),
            {reply, {deny, CurrentTokens}, State#{clients => NewClients, total_rejected => Rejected + 1}}
    end;

handle_call(refill_all, _From, #{max_tokens := Max, refill_amount := Refill, clients := Clients} = State) ->
    RefilledClients = maps:map(fun(_Id, Tokens) -> min(Max, Tokens + Refill) end, Clients),
    {reply, ok, State#{clients => RefilledClients}};

handle_call(get_stats, _From, #{clients := Clients, total_allowed := Allowed, total_rejected := Rejected} = State) ->
    Stats = #{
        total_allowed => Allowed,
        total_rejected => Rejected,
        active_clients => maps:size(Clients)
    },
    {reply, Stats, State};

handle_call(_Request, _From, State) ->
    {reply, {error, unknown_request}, State}.

handle_cast({reset_client, ClientId}, #{max_tokens := Max, clients := Clients} = State) ->
    NewClients = maps:put(ClientId, Max, Clients),
    {noreply, State#{clients => NewClients}};

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Allow Initial Requests up to Capacity',
        erlangCall: 'begin {ok, S} = rate_limiter_srv:start_link(10, 3), {allow, 7} = rate_limiter_srv:check_request(S, <<"client_a">>, 3), {allow, 2} = rate_limiter_srv:check_request(S, <<"client_a">>, 5), rate_limiter_srv:stop(S), ok end',
        expectedOutput: 'ok',
        explanation: 'Initial bucket initialized at 10; requests for 3 and 5 deducted cleanly leaving 2 tokens.',
      },
      {
        id: 'tc2',
        title: 'Denial on Insufficient Tokens',
        erlangCall: 'begin {ok, S} = rate_limiter_srv:start_link(10, 3), {allow, 2} = rate_limiter_srv:check_request(S, <<"client_b">>, 8), Deny = rate_limiter_srv:check_request(S, <<"client_b">>, 5), rate_limiter_srv:stop(S), Deny end',
        expectedOutput: '{deny, 2}',
        explanation: 'Request exceeding available tokens (5 > 2) was denied while preserving 2 remaining tokens.',
      },
      {
        id: 'tc3',
        title: 'Batch Token Refill Capped at MaxTokens',
        erlangCall: 'begin {ok, S} = rate_limiter_srv:start_link(10, 3), rate_limiter_srv:check_request(S, <<"client_c">>, 9), ok = rate_limiter_srv:refill_all(S), {allow, 1} = rate_limiter_srv:check_request(S, <<"client_c">>, 3), rate_limiter_srv:stop(S), ok end',
        expectedOutput: 'ok',
        explanation: 'Tokens refilled by 3 (from 1 to 4), allowing subsequent 3-token request.',
      },
    ],
    astRules: {
      requiredCalls: ['gen_server:start_link/3', 'gen_server:call/2', 'gen_server:cast/2'],
    },
    solutionExplanation: 'Implements an API gateway token-bucket rate limiter gen_server with dynamic client initialization, token consumption, refill sweeps, and metrics auditing.',
  },
];

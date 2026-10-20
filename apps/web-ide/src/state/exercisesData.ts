import { ExerciseManifest } from '../types/workspace';

export const EXERCISES: Record<string, ExerciseManifest> = {
  'otp-04-ets-heir-resilience': {
    id: 'otp-04-ets-heir-resilience',
    title: 'Fault-Tolerant Session Cache with ETS Heir Transfer',
    track: '03-production-otp-and-ets',
    description: 'Protect volatile ETS memory across worker crashes using OTP heir inheritance patterns.',
    lessonMarkdown: `## Fault-Tolerant Session Cache with ETS Heir Transfer

In production distributed systems, killing or restarting a \`gen_server\` worker must **never** drop active user sessions or in-memory routing tables.

> [!abstract] Under the Hood: BEAM Heap & ETS Ownership
> In the BEAM runtime, an **ETS table is tied to its creating process**. When that process dies, the BEAM's internal memory manager immediately frees the table's underlying allocator pages—instantly dropping thousands of cached sessions.
> To prevent this, OTP allows designating an **heir process**:
> \`\`\`erlang
> ets:new(session_tab, [named_table, public, {heir, HeirPid, HeirData}])
> \`\`\`
> When the owner process dies, the BEAM transfers ownership to \`HeirPid\` instead of deallocating the table, delivering the message \`{'ETS-TRANSFER', TableId, FromPid, HeirData}\`.

> [!warning] Production Failure Trap
> If your supervisor uses \`one_for_one\` and restarts \`session_cache\`, the new worker will fail with \`badarg\` if it attempts to call \`ets:new/2\` with the same table name! It must instead detect the surviving table or request handover from \`table_manager\`.

> [!check] Chaos Verification Steps
> 1. \`session_cache\` creates \`session_tab\` with \`table_manager\` as heir.
> 2. Seed active session: \`{put_session, <<"user_42">>, #{status => online}}\`.
> 3. Inject fatal signal: \`exit(whereis(session_cache), kill)\`.
> 4. \`table_manager\` receives \`'ETS-TRANSFER'\` and holds table during restart.
> 5. \`session_sup\` spawns new \`session_cache\` PID within 200ms.
> 6. New \`session_cache\` reclaims ownership and verifies \`user_42\` data survived!`,
    files: [
      {
        path: 'src/session_cache.erl',
        name: 'session_cache.erl',
        behaviour: 'gen_server',
        content: `-module(session_cache).
-behaviour(gen_server).

-export([start_link/0, put_session/2, get_session/1, reclaim_table/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-include("include/session.hrl").

-record(state, {
    tab :: ets:tid() | atom(),
    table_mgr :: pid()
}).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

put_session(UserId, SessionData) ->
    gen_server:call(?MODULE, {put, UserId, SessionData}).

get_session(UserId) ->
    gen_server:call(?MODULE, {get, UserId}).

reclaim_table(TableId) ->
    gen_server:call(?MODULE, {reclaim_table, TableId}).

init([]) ->
    TableMgrPid = whereis(table_manager),
    %% CRITICAL: Create named ETS table with heir transfer configured
    Tab = case ets:whereis(?SESSION_TAB) of
        undefined ->
            ets:new(?SESSION_TAB, [
                set,
                public,
                named_table,
                {read_concurrency, true},
                {write_concurrency, true},
                {heir, TableMgrPid, {reclaimed_from, self()}}
            ]);
        ExistingTab ->
            ExistingTab
    end,
    {ok, #state{tab = Tab, table_mgr = TableMgrPid}}.

handle_call({put, UserId, SessionData}, _From, #state{tab = Tab} = State) ->
    ets:insert(Tab, {UserId, SessionData, erlang:system_time(millisecond)}),
    {reply, ok, State};

handle_call({get, UserId}, _From, #state{tab = Tab} = State) ->
    Reply = case ets:lookup(Tab, UserId) of
        [{UserId, Data, _Ts}] -> {ok, Data};
        [] -> {error, not_found}
    end,
    {reply, Reply, State};

handle_call({reclaim_table, TableId}, _From, State) ->
    {reply, ok, State#state{tab = TableId}};

handle_call(_Request, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'ETS-TRANSFER', Tab, _FromPid, _HeirData}, State) ->
    {noreply, State#state{tab = Tab}};

handle_info(_Info, State) ->
    {noreply, State}.

terminate(Reason, _State) ->
    error_logger:info_msg("session_cache terminating: ~p~n", [Reason]),
    ok.
`,
      },
      {
        path: 'src/table_manager.erl',
        name: 'table_manager.erl',
        behaviour: 'gen_server',
        content: `-module(table_manager).
-behaviour(gen_server).

-export([start_link/0, give_back_table/2]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-include("include/session.hrl").

-record(state, {
    held_tables = #{} :: #{atom() | ets:tid() => pid()}
}).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

give_back_table(TableId, TargetPid) ->
    gen_server:call(?MODULE, {give_back, TableId, TargetPid}).

init([]) ->
    process_flag(trap_exit, true),
    {ok, #state{}}.

handle_call({give_back, TableId, TargetPid}, _From, #state{held_tables = Held} = State) ->
    case maps:is_key(TableId, Held) of
        true ->
            ets:give_away(TableId, TargetPid, {handover_repaired, self()}),
            {reply, ok, State#state{held_tables = maps:remove(TableId, Held)}};
        false ->
            {reply, {error, table_not_held}, State}
    end;

handle_call(_Request, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

%% The BEAM runtime fires this callback when session_cache crashes!
handle_info({'ETS-TRANSFER', TableId, DeadOwnerPid, Data}, #state{held_tables = Held} = State) ->
    error_logger:warning_msg(
        "==> [table_manager] Received ETS heir transfer for ~p from dead worker ~p (data: ~p)~n",
        [TableId, DeadOwnerPid, Data]
    ),
    {noreply, State#state{held_tables = Held#{TableId => DeadOwnerPid}}};

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`,
      },
      {
        path: 'src/session_sup.erl',
        name: 'session_sup.erl',
        behaviour: 'supervisor',
        content: `-module(session_sup).
-behaviour(supervisor).

-export([start_link/0, init/1]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

init([]) ->
    SupFlags = #{
        strategy => one_for_one,
        intensity => 5,
        period => 10
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
      },
      {
        path: 'include/session.hrl',
        name: 'session.hrl',
        behaviour: 'header',
        content: `-define(SESSION_TAB, session_tab).
-define(HEIR_TRANSFER_TIMEOUT, 2000).

-record(session_entry, {
    user_id    :: binary(),
    data       :: map(),
    created_at :: integer()
}).
`,
      },
      {
        path: 'rebar.config',
        name: 'rebar.config',
        behaviour: 'config',
        isReadOnly: true,
        content: `{erl_opts, [debug_info, {parse_transform, eqwalizer}]}.
{deps, []}.
{profiles, [
    {test, [{deps, [proper]}]}
]}.
`,
      },
    ],
    initialNodes: [
      {
        id: '<0.140.0>',
        name: 'session_sup',
        kind: 'supervisor',
        status: 'running',
        mailboxLen: 0,
        heapBytes: 2584,
        reductions: 1248,
        stateTerm: '{state, session_sup, one_for_one, 5, 10, [#Child<table_mgr>, #Child<cache>]}',
        x: 220,
        y: 80,
        details: {
          restartIntensity: '5 / 10s',
          behaviour: 'supervisor: one_for_one',
        },
      },
      {
        id: '<0.141.0>',
        name: 'table_manager',
        kind: 'gen_server',
        status: 'running',
        mailboxLen: 0,
        heapBytes: 3120,
        reductions: 4892,
        stateTerm: '{state, #{}}',
        x: 100,
        y: 220,
        details: {
          behaviour: 'gen_server (ETS Heir Guardian)',
          heirPid: 'self()',
        },
      },
      {
        id: '<0.142.0>',
        name: 'session_cache',
        kind: 'gen_server',
        status: 'running',
        mailboxLen: 0,
        heapBytes: 4216,
        reductions: 14820,
        stateTerm: '{state, session_tab, <0.141.0>}',
        x: 340,
        y: 220,
        details: {
          behaviour: 'gen_server (Active Worker)',
        },
      },
      {
        id: '#Ref<0.42.1>',
        name: 'ets:session_tab',
        kind: 'ets_table',
        status: 'running',
        mailboxLen: 0,
        heapBytes: 16384,
        reductions: 24510,
        stateTerm: '#{type => set, access => public, heir => <0.141.0>, size => 124}',
        x: 340,
        y: 360,
        details: {
          tableType: 'set | public | named_table',
          heirPid: '<0.141.0>',
        },
      },
    ],
    initialEdges: [
      { id: 'e1', source: '<0.140.0>', target: '<0.141.0>', relation: 'link' },
      { id: 'e2', source: '<0.140.0>', target: '<0.142.0>', relation: 'link' },
      { id: 'e3', source: '<0.142.0>', target: '#Ref<0.42.1>', relation: 'ets_owner' },
      { id: 'e4', source: '<0.141.0>', target: '#Ref<0.42.1>', relation: 'ets_heir' },
    ],
  },

  'xmpp-03-c2s-statem-handshake': {
    id: 'xmpp-03-c2s-statem-handshake',
    title: 'XMPP C2S Stream Negotiation & {active, once} Backpressure',
    track: '05-xmpp-distributed-engine',
    description: 'Build a production XMPP C2S gen_statem handling XML stream handshakes and socket flow control.',
    lessonMarkdown: `## XMPP C2S Stream Negotiation & {active, once} Backpressure

Production XMPP servers (like **MongooseIM** and **ejabberd**) must process thousands of concurrent client TCP streams without running out of memory.

> [!abstract] Under the Hood: gen_statem & TCP Socket Modes
> If an Erlang socket is opened with \`{active, true}\`, the Erlang VM automatically converts every raw incoming TCP chunk into an Erlang message \`{tcp, Socket, Data}\` and puts it into the receiver's process mailbox.
> A fast sender sending 50,000 stanzas will cause the process heap to balloon into gigabytes, triggering the BEAM Out-Of-Memory killer!
> In production, you must use **\`{active, once}\`** or **\`{active, N}\`**:
> \`\`\`erlang
> inet:setopts(Socket, [{active, once}])
> \`\`\`
> You only enable the socket for the next packet *after* parsing and handling the previous one.

> [!warning] Production Failure Trap
> Incoming XML packets from TCP can be fragmented across packet boundaries (e.g. \`<stream:st\` followed 10ms later by \`ream to='localhost'>\`). Never assume one TCP packet equals one valid XML stanza!

> [!check] Chaos Verification Steps
> 1. Start C2S state machine: initial state \`wait_for_stream\`.
> 2. Grader sends fragmented XML header \`<stream:stream to='localhost' ...>\`.
> 3. State machine transitions to \`wait_for_features\` and responds with stream header + SASL features.
> 4. Grader blasts 5,000 rapid stanzas—verifies \`message_queue_len\` never exceeds 10!`,
    files: [
      {
        path: 'src/xmpp_c2s_statem.erl',
        name: 'xmpp_c2s_statem.erl',
        behaviour: 'gen_statem',
        content: `-module(xmpp_c2s_statem).
-behaviour(gen_statem).

-export([start_link/2]).
-export([init/1, callback_mode/0, terminate/3]).
-export([wait_for_stream/3, wait_for_features/3, wait_for_sasl/3, authenticated/3, session_established/3]).

-record(data, {
    socket :: gen_tcp:socket(),
    parser_state :: term(),
    jid :: binary() | undefined,
    authenticated = false :: boolean()
}).

start_link(Socket, Opts) ->
    gen_statem:start_link(?MODULE, [Socket, Opts], []).

callback_mode() ->
    [state_functions, state_enter].

init([Socket, _Opts]) ->
    %% CRITICAL: Enable {active, once} flow control immediately
    inet:setopts(Socket, [{active, once}, {mode, binary}]),
    {ok, wait_for_stream, #data{socket = Socket}}.

wait_for_stream(enter, _OldState, _Data) ->
    keep_state_and_data;

wait_for_stream(info, {tcp, Socket, Chunk}, #data{socket = Socket} = Data) ->
    case xmpp_xml_stream:parse(Chunk) of
        {stream_open, ToHost, Rest} ->
            Header = <<"<?xml version='1.0'?><stream:stream xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' id='beam-session-1' from='", ToHost/binary, "'>">>,
            gen_tcp:send(Socket, Header),
            inet:setopts(Socket, [{active, once}]),
            {next_state, wait_for_features, Data};
        {more, _NeedMore} ->
            inet:setopts(Socket, [{active, once}]),
            keep_state_and_data
    end;

wait_for_stream(info, {tcp_closed, Socket}, _Data) ->
    {stop, normal}.

wait_for_features(enter, _OldState, #data{socket = Socket}) ->
    Features = <<"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>,
    gen_tcp:send(Socket, Features),
    inet:setopts(Socket, [{active, once}]),
    {next_state, wait_for_sasl, keep_state_and_data};

wait_for_features(info, {tcp, Socket, _Data}, _StateData) ->
    inet:setopts(Socket, [{active, once}]),
    keep_state_and_data.

wait_for_sasl(info, {tcp, Socket, Stanza}, #data{socket = Socket} = Data) ->
    %% Parse SASL auth request and authenticate
    Success = <<"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>,
    gen_tcp:send(Socket, Success),
    inet:setopts(Socket, [{active, once}]),
    {next_state, authenticated, Data#data{authenticated = true}};

wait_for_sasl(_Type, _Event, _Data) ->
    keep_state_and_data.

authenticated(info, {tcp, Socket, Stanza}, #data{socket = Socket} = Data) ->
    %% Resource binding
    Bound = <<"<iq type='result' id='bind_1'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>user@localhost/beamforge</jid></bind></iq>">>,
    gen_tcp:send(Socket, Bound),
    inet:setopts(Socket, [{active, once}]),
    {next_state, session_established, Data#data{jid = <<"user@localhost/beamforge">>}};

authenticated(_Type, _Event, _Data) ->
    keep_state_and_data.

session_established(info, {tcp, Socket, Stanza}, #data{socket = Socket} = Data) ->
    %% Echo or route stanzas with {active, once} backpressure
    inet:setopts(Socket, [{active, once}]),
    keep_state_and_data;

session_established(_Type, _Event, _Data) ->
    keep_state_and_data.

terminate(_Reason, _State, #data{socket = Socket}) ->
    gen_tcp:close(Socket),
    ok.
`,
      },
      {
        path: 'src/xmpp_xml_stream.erl',
        name: 'xmpp_xml_stream.erl',
        behaviour: 'gen_server',
        content: `-module(xmpp_xml_stream).
-export([parse/1]).

-spec parse(binary()) -> {stream_open, binary(), binary()} | {more, integer()} | {error, term()}.
parse(Binary) ->
    case binary:match(Binary, [<<"<stream:stream">>, <<"to='">>]) of
        nomatch when byte_size(Binary) < 16 ->
            {more, 16};
        _ ->
            {stream_open, <<"localhost">>, <<>>}
    end.
`,
      },
      {
        path: 'src/xmpp_c2s_sup.erl',
        name: 'xmpp_c2s_sup.erl',
        behaviour: 'supervisor',
        content: `-module(xmpp_c2s_sup).
-behaviour(supervisor).

-export([start_link/0, init/1]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

init([]) ->
    SupFlags = #{
        strategy => simple_one_for_one,
        intensity => 10,
        period => 5
    },
    ChildSpecs = [
        #{
            id => xmpp_c2s_statem,
            start => {xmpp_c2s_statem, start_link, []},
            restart => temporary,
            shutdown => 3000,
            type => worker,
            modules => [xmpp_c2s_statem]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.
`,
      },
      {
        path: 'rebar.config',
        name: 'rebar.config',
        behaviour: 'config',
        isReadOnly: true,
        content: `{erl_opts, [debug_info]}.
{deps, [
    {ranch, "2.1.0"}
]}.
`,
      },
    ],
    initialNodes: [
      {
        id: '<0.210.0>',
        name: 'xmpp_c2s_sup',
        kind: 'supervisor',
        status: 'running',
        mailboxLen: 0,
        heapBytes: 2584,
        reductions: 950,
        stateTerm: '{state, xmpp_c2s_sup, simple_one_for_one, 10, 5, []}',
        x: 220,
        y: 80,
        details: {
          restartIntensity: '10 / 5s',
          behaviour: 'supervisor: simple_one_for_one',
        },
      },
      {
        id: '<0.211.0>',
        name: 'ranch_acceptor',
        kind: 'gen_server',
        status: 'running',
        mailboxLen: 0,
        heapBytes: 3840,
        reductions: 8410,
        stateTerm: '{state, port_5222, [{active, once}]}',
        x: 100,
        y: 220,
        details: {
          behaviour: 'gen_server (TCP Acceptor Pool)',
          socketMode: '{active, once}',
        },
      },
      {
        id: '<0.212.0>',
        name: 'xmpp_c2s_statem',
        kind: 'gen_statem',
        status: 'running',
        mailboxLen: 0,
        heapBytes: 6184,
        reductions: 19430,
        stateTerm: '{data, #Port<0.741>, wait_for_stream, undefined, false}',
        x: 340,
        y: 220,
        details: {
          behaviour: 'gen_statem (C2S Session)',
          socketMode: '{active, once}',
        },
      },
      {
        id: '#Port<0.741>',
        name: 'tcp_socket_port',
        kind: 'gen_server',
        status: 'running',
        mailboxLen: 0,
        heapBytes: 1024,
        reductions: 3240,
        stateTerm: '#Port<0.741> (127.0.0.1:5222 <-> 127.0.0.1:49152)',
        x: 340,
        y: 360,
        details: {
          socketMode: '{active, once}',
        },
      },
    ],
    initialEdges: [
      { id: 'e1', source: '<0.210.0>', target: '<0.211.0>', relation: 'link' },
      { id: 'e2', source: '<0.210.0>', target: '<0.212.0>', relation: 'link' },
      { id: 'e3', source: '<0.212.0>', target: '#Port<0.741>', relation: 'monitor' },
    ],
    initialXmppState: 'wait_for_stream',
  },
};

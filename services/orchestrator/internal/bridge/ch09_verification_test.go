package bridge_test

import (
	"context"
	"testing"
	"time"
)

func TestChapter9Verification(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	tests := []struct {
		name       string
		exerciseID string
		files      map[string]string
	}{
		{
			name:       "ch09-l01 ETS Telemetry & Atomic Counters",
			exerciseID: "ch09-l01",
			files: map[string]string{
				"src/ets_telemetry.erl": `-module(ets_telemetry).
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
		},
		{
			name:       "ch09-l02 ETS Pattern Matching & Match Specs",
			exerciseID: "ch09-l02",
			files: map[string]string{
				"src/ets_query_engine.erl": `-module(ets_query_engine).
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
		},
		{
			name:       "ch09-l03 ETS Heir Handshake & ets:give_away",
			exerciseID: "ch09-l03",
			files: map[string]string{
				"src/ets_heir_handshake.erl": `-module(ets_heir_handshake).
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
    Parent = self(),
    Heir = spawn(fun() ->
        receive
            {'ETS-TRANSFER', demo_heir_tab, _DeadWorker, keep_alive} ->
                Parent ! heir_captured
        after 1000 ->
            Parent ! timeout
        end
    end),
    _Worker = spawn(fun() ->
        create_resilient_table(demo_heir_tab, Heir),
        ets:insert(demo_heir_tab, {session_1, active}),
        exit(kill)
    end),
    receive
        heir_captured ->
            Res = ets:lookup(demo_heir_tab, session_1),
            try ets:delete(demo_heir_tab) catch _:_ -> ok end,
            Res
    after 1000 ->
        []
    end.
`,
			},
		},
		{
			name:       "ch09-l04 Distributed Erlang & pg Groups",
			exerciseID: "ch09-l04",
			files: map[string]string{
				"src/cluster_pubsub_pg.erl": `-module(cluster_pubsub_pg).
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
		},
		{
			name:       "ch09-l05 Mnesia ACID Transactions & Rollback",
			exerciseID: "ch09-l05",
			files: map[string]string{
				"src/mnesia_ledger.erl": `-module(mnesia_ledger).
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
		},
		{
			name:       "ch09-l06 EUnit & Dialyzer Contracts",
			exerciseID: "ch09-l06",
			files: map[string]string{
				"src/ledger_specs_and_tests.erl": `-module(ledger_specs_and_tests).
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
		},
		{
			name:       "ch09-l07 Incident #105: ETS Session Wipeout",
			exerciseID: "ch09-l07",
			files: map[string]string{
				"src/incident_ets_wipeout.erl": `-module(incident_ets_wipeout).
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
		},
		{
			name:       "ch09-l08 Problem Set: Multi-File Session Store with Heir Handover",
			exerciseID: "ch09-l08",
			files: map[string]string{
				"src/session_sup.erl": `-module(session_sup).
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
				"src/table_manager.erl": `-module(table_manager).
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
				"src/session_cache.erl": `-module(session_cache).
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
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			sessionID := "test-" + tc.exerciseID
			session, err := poolMgr.ClaimSession(sessionID)
			if err != nil {
				t.Fatalf("Failed to claim session: %v", err)
			}
			defer poolMgr.ReleaseSession(sessionID)

			ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
			defer cancel()

			report, err := runner.RunVerification(ctx, session, tc.exerciseID, tc.files)
			if err != nil {
				t.Fatalf("RunVerification failed with error: %v", err)
			}

			if report.Verdict != "PASSED" {
				t.Errorf("[%s] Expected verdict PASSED, got %s", tc.exerciseID, report.Verdict)
				for _, st := range report.Stages {
					t.Logf("  Stage %s (%s): status=%s, details=%s", st.ID, st.Title, st.Status, st.Details)
				}
			} else {
				t.Logf("[%s] VERIFIED 100%% PASSED (score=%d, %d stages)", tc.exerciseID, report.Score, len(report.Stages))
				for _, st := range report.Stages {
					t.Logf("  + Stage %s: %s", st.ID, st.Status)
				}
			}
		})
	}
}

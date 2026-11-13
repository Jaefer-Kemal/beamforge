package bridge_test

import (
	"context"
	"testing"
	"time"
)

func TestChapter8Verification(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	const strategyPlannerSolution = `-module(strategy_planner).

-export([
    build_sup_flags/3,
    select_strategy_for_topology/1,
    calculate_restart_budget/2
]).

%% @doc Build a supervisor flags map from a valid restart strategy atom, non-negative crash intensity, and positive period; rejects invalid bounds.
build_sup_flags(Strategy, Intensity, Period)
  when (Strategy =:= one_for_one orelse Strategy =:= rest_for_one orelse
        Strategy =:= one_for_all orelse Strategy =:= simple_one_for_one),
       is_integer(Intensity), Intensity >= 0,
       is_integer(Period), Period > 0 ->
    #{
        strategy => Strategy,
        intensity => Intensity,
        period => Period
    }.

%% @doc Map a recognized architecture topology atom to its OTP restart strategy, or return an error tuple for unknown inputs.
select_strategy_for_topology(independent_workers) -> one_for_one;
select_strategy_for_topology(dependent_pipeline)  -> rest_for_one;
select_strategy_for_topology(coupled_cluster)     -> one_for_all;
select_strategy_for_topology(dynamic_pool)        -> simple_one_for_one;
select_strategy_for_topology(_)                   -> {error, unknown_topology}.

%% @doc Compute per-second crash rate telemetry from a crash limit and positive time window in seconds; rejects invalid numeric bounds.
calculate_restart_budget(MaxCrashes, WindowSeconds)
  when is_integer(MaxCrashes), is_integer(WindowSeconds), MaxCrashes >= 0, WindowSeconds > 0 ->
    Rate = MaxCrashes / WindowSeconds,
    #{
        intensity => MaxCrashes,
        period => WindowSeconds,
        max_rate_per_sec => Rate,
        tolerated_downtime => ok
    }.
`
	const childSpecFactorySolution = `-module(child_spec_factory).

-export([
    worker_spec/4,
    supervisor_spec/2,
    classify_restart/2
]).

%% @doc Build a worker child specification map from an ID, module atom, start argument list, and restart policy atom; rejects invalid argument types or restart strategies.
worker_spec(Id, Module, Args, RestartType)
  when is_atom(Module), is_list(Args),
       (RestartType =:= permanent orelse RestartType =:= transient orelse RestartType =:= temporary) ->
    #{
        id => Id,
        start => {Module, start_link, Args},
        restart => RestartType,
        shutdown => 5000,
        type => worker,
        modules => [Module]
    }.

%% @doc Build a nested supervisor child specification map enforcing hierarchical shutdown safety; rejects non-atom supervisor module names.
supervisor_spec(Id, SupModule) when is_atom(SupModule) ->
    #{
        id => Id,
        start => {SupModule, start_link, []},
        restart => permanent,
        shutdown => infinity,
        type => supervisor,
        modules => [SupModule]
    }.

%% @doc Classify whether OTP restarts a child given its restart type and exit reason, distinguishing normal or clean shutdown exits from crashes.
classify_restart(permanent, _Reason) ->
    restart;
classify_restart(temporary, _Reason) ->
    do_not_restart;
classify_restart(transient, normal) ->
    do_not_restart;
classify_restart(transient, shutdown) ->
    do_not_restart;
classify_restart(transient, {shutdown, _}) ->
    do_not_restart;
classify_restart(transient, _AbnormalReason) ->
    restart.
`


	tests := []struct {
		name         string
		exerciseID   string
		files        map[string]string
		wantScore    int
		wantStages   int
		visibleCount int
	}{
		{
			name:         "ch08-l01 Strategy Planner",
			exerciseID:   "ch08-l01",
			files: map[string]string{
				"src/strategy_planner.erl": strategyPlannerSolution,
			},
			wantScore:    100,
			wantStages:   5,
			visibleCount: 3,
		},
		{
			name:         "ch08-l02 Child Spec Factory",
			exerciseID:   "ch08-l02",
			files: map[string]string{
				"src/child_spec_factory.erl": childSpecFactorySolution,
			},
			wantScore:    100,
			wantStages:   5,
			visibleCount: 3,
		},
		{
			name:       "ch08-l03 Escalation Analyzer",
			exerciseID: "ch08-l03",
			files: map[string]string{
				"src/escalation_analyzer.erl": `-module(escalation_analyzer).

-export([
    evaluate_crash_burst/3,
    plan_escalation_action/2,
    reverse_shutdown_order/1
]).

evaluate_crash_burst([], MaxR, _MaxT) ->
    {within_budget, 0, MaxR};
evaluate_crash_burst(CrashTimestampsSecList, MaxR, MaxT)
  when is_list(CrashTimestampsSecList), is_integer(MaxR), MaxR >= 0, is_integer(MaxT), MaxT > 0 ->
    Latest = lists:max(CrashTimestampsSecList),
    Threshold = Latest - MaxT,
    InWindow = [Ts || Ts <- CrashTimestampsSecList, Ts >= Threshold, Ts =< Latest],
    Count = length(InWindow),
    if
        Count > MaxR -> {escalate_to_parent, Count, MaxR};
        true         -> {within_budget, Count, MaxR}
    end.

plan_escalation_action(ChildOrderList, CrashedChildId) when is_list(ChildOrderList) ->
    case lists:splitwith(fun(Id) -> Id =/= CrashedChildId end, ChildOrderList) of
        {_Prefix, []} ->
            {error, child_not_found};
        {_Prefix, Affected} ->
            ToStop = lists:reverse(Affected),
            ToRestart = Affected,
            {stop_in_reverse_order, ToStop, restart_in_order, ToRestart}
    end.

reverse_shutdown_order(StartupChildIdsList) when is_list(StartupChildIdsList) ->
    lists:reverse(StartupChildIdsList).
`,
			},
		},
		{
			name:       "ch08-l04 Dynamic Session Supervisor",
			exerciseID: "ch08-l04",
			files: map[string]string{
				"src/dynamic_session_sup.erl": `-module(dynamic_session_sup).
-behaviour(supervisor).

-export([
    start_link/0,
    start_session/3,
    count_sessions/1,
    terminate_session/2,
    init/1
]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

init([]) ->
    SupFlags = #{
        strategy => simple_one_for_one,
        intensity => 10,
        period => 5
    },
    ChildTemplate = #{
        id => session_worker,
        start => {session_worker, start_link, []},
        restart => temporary,
        shutdown => 2000,
        type => worker,
        modules => [session_worker]
    },
    {ok, {SupFlags, [ChildTemplate]}}.

start_session(SupRef, SessionId, UserId) ->
    supervisor:start_child(SupRef, [SessionId, UserId]).

count_sessions(SupRef) ->
    Counts = supervisor:count_children(SupRef),
    case is_map(Counts) of
        true  -> maps:get(active, Counts, 0);
        false ->
            case lists:keyfind(active, 1, Counts) of
                {active, N} -> N;
                false -> 0
            end
    end.

terminate_session(SupRef, ChildPid) ->
    supervisor:terminate_child(SupRef, ChildPid).
`,
				"src/session_worker.erl": `-module(session_worker).
-behaviour(gen_server).

-export([
    start_link/2,
    get_info/1
]).

-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

start_link(SessionId, UserId) ->
    gen_server:start_link(?MODULE, {SessionId, UserId}, []).

init({SessionId, UserId}) ->
    {ok, #{session_id => SessionId, user_id => UserId, active => true}}.

get_info(Pid) ->
    gen_server:call(Pid, get_info).

handle_call(get_info, _From, State) ->
    {reply, {ok, State}, State};
handle_call(_Req, _From, State) ->
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
			},
		},
		{
			name:       "ch08-l05 Commerce App",
			exerciseID: "ch08-l05",
			files: map[string]string{
				"src/commerce_app.erl": `-module(commerce_app).
-behaviour(application).
-behaviour(supervisor).

-export([
    start/2,
    stop/1,
    get_app_config/2,
    set_app_config/2,
    init/1
]).

start(_StartType, _StartArgs) ->
    case supervisor:start_link({local, ?MODULE}, ?MODULE, []) of
        {ok, SupPid} -> {ok, SupPid};
        {error, {already_started, SupPid}} -> {ok, SupPid};
        {error, Reason} -> {error, Reason}
    end.

stop(_State) ->
    ok.

get_app_config(Key, Default) ->
    application:get_env(commerce_app, Key, Default).

set_app_config(Key, Value) ->
    application:set_env(commerce_app, Key, Value).

init([]) ->
    SupFlags = #{
        strategy => one_for_one,
        intensity => 3,
        period => 5
    },
    ChildSpecs = [],
    {ok, {SupFlags, ChildSpecs}}.
`,
			},
		},
		{
			name:       "ch08-l06 Incident #104 Wrong Strategy",
			exerciseID: "ch08-l06",
			files: map[string]string{
				"src/incident_wrong_strategy.erl": `-module(incident_wrong_strategy).
-behaviour(supervisor).

-export([
    start_link/0,
    init/1,
    build_pipeline_specs/0,
    audit_flags/0,
    test_chaos_cascade/0
]).
-export([worker_loop/1]).

start_link() ->
    supervisor:start_link(?MODULE, []).

init([]) ->
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 5,
        period => 10
    },
    ChildSpecs = [
        #{
            id => worker_db,
            start => {incident_wrong_strategy, worker_loop, [db]},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        },
        #{
            id => worker_cache,
            start => {incident_wrong_strategy, worker_loop, [cache]},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        },
        #{
            id => worker_http,
            start => {incident_wrong_strategy, worker_loop, [http]},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.

build_pipeline_specs() ->
    {ok, {_SupFlags, ChildSpecs}} = init([]),
    ChildSpecs.

worker_loop(Role) ->
    Pid = spawn_link(fun() -> run_worker(Role) end),
    {ok, Pid}.

run_worker(Role) ->
    receive
        stop -> ok;
        _ -> run_worker(Role)
    end.

audit_flags() ->
    {ok, {SupFlags, ChildSpecs}} = init([]),
    Strategy = maps:get(strategy, SupFlags),
    Restarts = [maps:get(restart, Spec) || Spec <- ChildSpecs],
    {ok, Strategy, Restarts}.

%% @doc Kill the cache worker and verify upstream survival with downstream recovery.
test_chaos_cascade() ->
    {ok, Sup} = start_link(),
    unlink(Sup),
    Children1 = supervisor:which_children(Sup),
    {_, Db1, _, _} = lists:keyfind(worker_db, 1, Children1),
    {_, Cache1, _, _} = lists:keyfind(worker_cache, 1, Children1),
    {_, Http1, _, _} = lists:keyfind(worker_http, 1, Children1),
    exit(Cache1, kill),
    timer:sleep(50),
    Result = case is_process_alive(Sup) of
        true ->
            Children2 = supervisor:which_children(Sup),
            Db2 = case lists:keyfind(worker_db, 1, Children2) of
                {_, P1, _, _} -> P1;
                false -> undefined
            end,
            Cache2 = case lists:keyfind(worker_cache, 1, Children2) of
                {_, P2, _, _} -> P2;
                false -> undefined
            end,
            Http2 = case lists:keyfind(worker_http, 1, Children2) of
                {_, P3, _, _} -> P3;
                false -> undefined
            end,
            case is_pid(Db2) andalso is_pid(Cache2) andalso is_pid(Http2)
                 andalso Db1 =:= Db2 andalso Cache1 =/= Cache2 andalso Http1 =/= Http2 of
                true -> {ok, db_unaffected, downstream_restarted};
                false -> {error, cascade_failed}
            end;
        false ->
            {error, cascade_failed}
    end,
    Ref = monitor(process, Sup),
    exit(Sup, shutdown),
    receive
        {'DOWN', Ref, process, Sup, _} -> ok
    after 1000 ->
        ok
    end,
    Result.
`,
			},
		},
		{
			name:       "ch08-l07 Problem Set: Checkout Sup Pipeline",
			exerciseID: "ch08-l07",
			files: map[string]string{
				"src/checkout_sup.erl": `-module(checkout_sup).
-behaviour(supervisor).

-export([
    start_link/0,
    get_pipeline_pids/0,
    init/1
]).

%% @doc Start and locally register the checkout supervisor linked to the caller.
start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

%% @doc Return rest_for_one supervisor flags and permanent checkout worker specs.
init([]) ->
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 5,
        period => 10
    },
    ChildSpecs = [
        #{
            id => db_pool,
            start => {checkout_worker, start_link, [db_pool_worker, db]},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [checkout_worker]
        },
        #{
            id => pricing_cache,
            start => {checkout_worker, start_link, [pricing_cache_worker, cache]},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [checkout_worker]
        },
        #{
            id => order_gateway,
            start => {checkout_worker, start_link, [order_gateway_worker, gateway]},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [checkout_worker]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.

%% @doc Query the live PIDs of the db_pool, pricing_cache, and order_gateway workers.
get_pipeline_pids() ->
    Children = supervisor:which_children(?MODULE),
    DbPid = case lists:keyfind(db_pool, 1, Children) of
        {db_pool, P1, _, _} -> P1;
        _ -> whereis(db_pool_worker)
    end,
    CachePid = case lists:keyfind(pricing_cache, 1, Children) of
        {pricing_cache, P2, _, _} -> P2;
        _ -> whereis(pricing_cache_worker)
    end,
    GatewayPid = case lists:keyfind(order_gateway, 1, Children) of
        {order_gateway, P3, _, _} -> P3;
        _ -> whereis(order_gateway_worker)
    end,
    {ok, #{db_pid => DbPid, cache_pid => CachePid, gateway_pid => GatewayPid}}.
`,
				"src/checkout_worker.erl": `-module(checkout_worker).
-behaviour(gen_server).

-export([
    start_link/2,
    get_role/1
]).

-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

start_link(RegName, Role) ->
    gen_server:start_link({local, RegName}, ?MODULE, Role, []).

init(Role) ->
    {ok, #{role => Role, restarts => 0}}.

get_role(Pid) ->
    gen_server:call(Pid, get_role).

handle_call(get_role, _From, #{role := Role} = State) ->
    {reply, {ok, Role}, State};
handle_call(_Req, _From, State) ->
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

			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
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
				if tc.wantScore > 0 && report.Score != tc.wantScore {
					t.Errorf("[%s] Score mismatch: got %d, want %d", tc.exerciseID, report.Score, tc.wantScore)
				}
				if tc.wantStages > 0 && len(report.Stages) != tc.wantStages {
					t.Errorf("[%s] Stages count mismatch: got %d, want %d", tc.exerciseID, len(report.Stages), tc.wantStages)
				}
				t.Logf("[%s] VERIFIED 100%% PASSED (score=%d, %d stages)", tc.exerciseID, report.Score, len(report.Stages))
				for _, st := range report.Stages {
					t.Logf("  + Stage %s: %s", st.ID, st.Status)
				}
			}

			if tc.visibleCount > 0 {
				runRes, errRun := runner.RunCode(ctx, session, tc.exerciseID, tc.files, nil)
				if errRun != nil {
					t.Fatalf("[%s] RunCode failed: %v", tc.exerciseID, errRun)
				}
				if !runRes.CompileOk {
					t.Fatalf("[%s] RunCode compilation failed:\n%s", tc.exerciseID, runRes.Stdout)
				}
				if len(runRes.VisibleTests) != tc.visibleCount {
					t.Logf("[%s] RunCode Stdout:\n%s", tc.exerciseID, runRes.Stdout)
					t.Errorf("[%s] Visible test count mismatch: got %d, want %d", tc.exerciseID, len(runRes.VisibleTests), tc.visibleCount)
				}
				for idx, vt := range runRes.VisibleTests {
					if !vt.Passed {
						t.Errorf("[%s] Visible test #%d failed:\n  Call:     %s\n  Expected: %s\n  Actual:   %s",
							tc.exerciseID, idx+1, vt.CallStr, vt.Expected, vt.Actual)
					}
				}
			}
		})
	}

	// ── Negative Regression Subtests for ch08-l01 ──────────────────────────────
	t.Run("ch08-l01 Negative Missing Guards AST Violation", func(t *testing.T) {
		sessionID := "test-neg-ast-ch08-l01"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/strategy_planner.erl": `-module(strategy_planner).
-export([build_sup_flags/3, select_strategy_for_topology/1, calculate_restart_budget/2]).

%% BUG: Missing when guards
build_sup_flags(Strategy, Intensity, Period) ->
    #{strategy => Strategy, intensity => Intensity, period => Period}.

select_strategy_for_topology(independent_workers) -> one_for_one;
select_strategy_for_topology(dependent_pipeline)  -> rest_for_one;
select_strategy_for_topology(coupled_cluster)     -> one_for_all;
select_strategy_for_topology(dynamic_pool)        -> simple_one_for_one;
select_strategy_for_topology(_)                   -> {error, unknown_topology}.

calculate_restart_budget(MaxCrashes, WindowSeconds) ->
    #{intensity => MaxCrashes, period => WindowSeconds, max_rate_per_sec => MaxCrashes / WindowSeconds, tolerated_downtime => ok}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch08-l01", badFiles)
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure for missing guards AST violation, but got PASSED")
		}
	})

	t.Run("ch08-l01 Negative Missing Export Failure", func(t *testing.T) {
		sessionID := "test-neg-export-ch08-l01"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/strategy_planner.erl": `-module(strategy_planner).
-export([build_sup_flags/3, select_strategy_for_topology/1]).

build_sup_flags(Strategy, Intensity, Period)
  when (Strategy =:= one_for_one orelse Strategy =:= rest_for_one orelse
        Strategy =:= one_for_all orelse Strategy =:= simple_one_for_one),
       is_integer(Intensity), Intensity >= 0,
       is_integer(Period), Period > 0 ->
    #{strategy => Strategy, intensity => Intensity, period => Period}.

select_strategy_for_topology(independent_workers) -> one_for_one;
select_strategy_for_topology(dependent_pipeline)  -> rest_for_one;
select_strategy_for_topology(coupled_cluster)     -> one_for_all;
select_strategy_for_topology(dynamic_pool)        -> simple_one_for_one;
select_strategy_for_topology(_)                   -> {error, unknown_topology}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch08-l01", badFiles)
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure for missing export calculate_restart_budget/2, but got PASSED")
		}
	})

	t.Run("ch08-l01 Negative Invalid Bounds Guard Rejection", func(t *testing.T) {
		sessionID := "test-neg-bounds-ch08-l01"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/strategy_planner.erl": `-module(strategy_planner).
-export([build_sup_flags/3, select_strategy_for_topology/1, calculate_restart_budget/2]).

%% BUG: Allows invalid strategy and negative period
build_sup_flags(Strategy, Intensity, Period)
  when is_atom(Strategy), is_integer(Intensity), is_integer(Period) ->
    #{strategy => Strategy, intensity => Intensity, period => Period}.

select_strategy_for_topology(independent_workers) -> one_for_one;
select_strategy_for_topology(dependent_pipeline)  -> rest_for_one;
select_strategy_for_topology(coupled_cluster)     -> one_for_all;
select_strategy_for_topology(dynamic_pool)        -> simple_one_for_one;
select_strategy_for_topology(_)                   -> {error, unknown_topology}.

calculate_restart_budget(MaxCrashes, WindowSeconds)
  when is_integer(MaxCrashes), is_integer(WindowSeconds), MaxCrashes >= 0, WindowSeconds > 0 ->
    #{intensity => MaxCrashes, period => WindowSeconds, max_rate_per_sec => MaxCrashes / WindowSeconds, tolerated_downtime => ok}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch08-l01", badFiles)
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure when build_sup_flags accepts invalid strategy / negative bounds, but got PASSED")
		}
	})

	// ── Negative Regression Subtests for ch08-l02 ──────────────────────────────
	t.Run("ch08-l02 Negative Missing Guards AST Violation", func(t *testing.T) {
		sessionID := "test-neg-ast-ch08-l02"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/child_spec_factory.erl": `-module(child_spec_factory).
-export([worker_spec/4, supervisor_spec/2, classify_restart/2]).

%% BUG: Missing when guards on worker_spec
worker_spec(Id, Module, Args, RestartType) ->
    #{id => Id, start => {Module, start_link, Args}, restart => RestartType, shutdown => 5000, type => worker, modules => [Module]}.

supervisor_spec(Id, SupModule) when is_atom(SupModule) ->
    #{id => Id, start => {SupModule, start_link, []}, restart => permanent, shutdown => infinity, type => supervisor, modules => [SupModule]}.

classify_restart(permanent, _Reason) -> restart;
classify_restart(temporary, _Reason) -> do_not_restart;
classify_restart(transient, normal) -> do_not_restart;
classify_restart(transient, shutdown) -> do_not_restart;
classify_restart(transient, {shutdown, _}) -> do_not_restart;
classify_restart(transient, _AbnormalReason) -> restart.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch08-l02", badFiles)
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure for missing guards AST violation, but got PASSED")
		}
	})

	t.Run("ch08-l02 Negative Missing Export Failure", func(t *testing.T) {
		sessionID := "test-neg-export-ch08-l02"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/child_spec_factory.erl": `-module(child_spec_factory).
-export([worker_spec/4, supervisor_spec/2]).

worker_spec(Id, Module, Args, RestartType)
  when is_atom(Module), is_list(Args),
       (RestartType =:= permanent orelse RestartType =:= transient orelse RestartType =:= temporary) ->
    #{id => Id, start => {Module, start_link, Args}, restart => RestartType, shutdown => 5000, type => worker, modules => [Module]}.

supervisor_spec(Id, SupModule) when is_atom(SupModule) ->
    #{id => Id, start => {SupModule, start_link, []}, restart => permanent, shutdown => infinity, type => supervisor, modules => [SupModule]}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch08-l02", badFiles)
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure for missing export classify_restart/2, but got PASSED")
		}
	})

	t.Run("ch08-l02 Negative Supervisor Shutdown Infinity Violation", func(t *testing.T) {
		sessionID := "test-neg-sup-shutdown-ch08-l02"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/child_spec_factory.erl": `-module(child_spec_factory).
-export([worker_spec/4, supervisor_spec/2, classify_restart/2]).

worker_spec(Id, Module, Args, RestartType)
  when is_atom(Module), is_list(Args),
       (RestartType =:= permanent orelse RestartType =:= transient orelse RestartType =:= temporary) ->
    #{id => Id, start => {Module, start_link, Args}, restart => RestartType, shutdown => 5000, type => worker, modules => [Module]}.

%% BUG: Sets shutdown to 5000ms instead of infinity!
supervisor_spec(Id, SupModule) when is_atom(SupModule) ->
    #{id => Id, start => {SupModule, start_link, []}, restart => permanent, shutdown => 5000, type => supervisor, modules => [SupModule]}.

classify_restart(permanent, _Reason) -> restart;
classify_restart(temporary, _Reason) -> do_not_restart;
classify_restart(transient, normal) -> do_not_restart;
classify_restart(transient, shutdown) -> do_not_restart;
classify_restart(transient, {shutdown, _}) -> do_not_restart;
classify_restart(transient, _AbnormalReason) -> restart.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch08-l02", badFiles)
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure when supervisor_spec uses shutdown => 5000, but got PASSED")
		}
	})
}

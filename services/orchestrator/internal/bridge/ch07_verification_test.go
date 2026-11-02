package bridge_test

import (
	"context"
	"testing"
	"time"
)

func TestChapter7Verification(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	tests := []struct {
		name       string
		exerciseID string
		files      map[string]string
	}{
		{
			name:       "ch07-l01 OTP Intro Demo",
			exerciseID: "ch07-l01",
			files: map[string]string{
				"src/otp_intro_demo.erl": `-module(otp_intro_demo).
-behaviour(gen_server).

-export([
    start_link/0,
    increment/2,
    get_count/1,
    stop/1,
    run_demo/0
]).

-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

start_link() ->
    gen_server:start_link(?MODULE, [], []).

increment(Pid, Amount) when is_integer(Amount) ->
    gen_server:cast(Pid, {increment, Amount}).

get_count(Pid) ->
    gen_server:call(Pid, get_count).

stop(Pid) ->
    gen_server:stop(Pid).

run_demo() ->
    {ok, Pid} = start_link(),
    ok = increment(Pid, 10),
    ok = increment(Pid, 25),
    timer:sleep(20),
    FinalCount = get_count(Pid),
    LiveState = sys:get_state(Pid),
    ok = stop(Pid),
    #{final_count => FinalCount, live_state => LiveState}.

init([]) ->
    {ok, #{counter => 0, ops => 0}}.

handle_call(get_count, _From, State = #{counter := Count, ops := Ops}) ->
    {reply, Count, State#{ops := Ops + 1}};
handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast({increment, Amount}, State = #{counter := Count, ops := Ops}) ->
    {noreply, State#{counter := Count + Amount, ops := Ops + 1}};
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
			name:       "ch07-l02 Wallet Server",
			exerciseID: "ch07-l02",
			files: map[string]string{
				"src/wallet_server.erl": `-module(wallet_server).
-behaviour(gen_server).

-export([
    start_link/1,
    credit/3,
    debit/3,
    get_balances/1,
    stop/1
]).

-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

start_link(InitialBalances) when is_map(InitialBalances) ->
    gen_server:start_link(?MODULE, InitialBalances, []).

credit(Pid, Currency, Amount) when Amount > 0 ->
    gen_server:cast(Pid, {credit, Currency, Amount}).

debit(Pid, Currency, Amount) ->
    gen_server:call(Pid, {debit, Currency, Amount}).

get_balances(Pid) ->
    gen_server:call(Pid, get_balances).

stop(Pid) ->
    gen_server:stop(Pid).

init(InitialBalances) ->
    {ok, #{balances => InitialBalances}}.

handle_call({debit, _Currency, Amount}, _From, State) when Amount =< 0 ->
    {reply, {error, invalid_amount}, State};
handle_call({debit, Currency, Amount}, _From, State = #{balances := Balances}) ->
    CurrentBal = maps:get(Currency, Balances, 0),
    if
        CurrentBal >= Amount ->
            NewBal = CurrentBal - Amount,
            NewBalances = maps:put(Currency, NewBal, Balances),
            {reply, {ok, NewBal}, State#{balances := NewBalances}};
        true ->
            {reply, {error, insufficient_funds}, State}
    end;
handle_call(get_balances, _From, State = #{balances := Balances}) ->
    {reply, Balances, State};
handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast({credit, Currency, Amount}, State = #{balances := Balances}) ->
    CurrentBal = maps:get(Currency, Balances, 0),
    NewBalances = maps:put(Currency, CurrentBal + Amount, Balances),
    {noreply, State#{balances := NewBalances}};
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
			name:       "ch07-l03 Session TTL Server",
			exerciseID: "ch07-l03",
			files: map[string]string{
				"src/session_ttl_server.erl": `-module(session_ttl_server).
-behaviour(gen_server).

-export([
    start_link/1,
    create_session/2,
    is_valid/2,
    get_active_count/1,
    stop/1
]).

-export([
    init/1,
    handle_continue/2,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

start_link(TtlSeconds) when is_integer(TtlSeconds), TtlSeconds > 0 ->
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

handle_continue(hydrate_defaults, State = #{sessions := Sessions}) ->
    Now = erlang:system_time(second),
    NewSessions = maps:put(<<"guest">>, Now, Sessions),
    erlang:send_after(1000, self(), cleanup_tick),
    {noreply, State#{sessions := NewSessions}}.

handle_call({create_session, SessionId}, _From, State = #{sessions := Sessions}) ->
    Now = erlang:system_time(second),
    NewSessions = maps:put(SessionId, Now, Sessions),
    {reply, ok, State#{sessions := NewSessions}};

handle_call({is_valid, SessionId}, _From, State = #{ttl := Ttl, sessions := Sessions}) ->
    Now = erlang:system_time(second),
    Valid = case maps:find(SessionId, Sessions) of
        {ok, CreatedAt} -> (Now - CreatedAt) =< Ttl;
        error -> false
    end,
    {reply, Valid, State};

handle_call(get_active_count, _From, State = #{sessions := Sessions}) ->
    {reply, maps:size(Sessions), State};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(cleanup_tick, State = #{ttl := Ttl, sessions := Sessions}) ->
    Now = erlang:system_time(second),
    ActiveSessions = maps:filter(fun(_Id, CreatedAt) -> (Now - CreatedAt) =< Ttl end, Sessions),
    erlang:send_after(1000, self(), cleanup_tick),
    {noreply, State#{sessions := ActiveSessions}};
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
			name:       "ch07-l04 Async Report Server",
			exerciseID: "ch07-l04",
			files: map[string]string{
				"src/async_report_server.erl": `-module(async_report_server).
-behaviour(gen_server).

-export([
    start_link/0,
    generate_report/3,
    get_completed_count/1,
    hibernate_idle/1,
    stop/1
]).

-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

start_link() ->
    gen_server:start_link(?MODULE, [], []).

generate_report(Pid, JobId, ComputeFun) ->
    gen_server:call(Pid, {generate_report, JobId, ComputeFun}, 3000).

get_completed_count(Pid) ->
    gen_server:call(Pid, get_completed_count).

hibernate_idle(Pid) ->
    gen_server:call(Pid, hibernate_now).

stop(Pid) ->
    gen_server:stop(Pid).

init([]) ->
    {ok, #{in_flight => 0, completed => 0}}.

handle_call({generate_report, JobId, ComputeFun}, From, State = #{in_flight := InFlight}) ->
    ServerSelf = self(),
    spawn(fun() ->
        Result = ComputeFun(),
        gen_server:reply(From, {ok, JobId, Result}),
        ServerSelf ! {job_finished, JobId}
    end),
    {noreply, State#{in_flight := InFlight + 1}};

handle_call(get_completed_count, _From, State = #{in_flight := InFlight, completed := Completed}) ->
    {reply, {ok, #{in_flight => InFlight, completed => Completed}}, State};

handle_call(hibernate_now, _From, State) ->
    {reply, hibernated, State, hibernate};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({job_finished, _JobId}, State = #{in_flight := InFlight, completed := Completed}) ->
    {noreply, State#{in_flight := InFlight - 1, completed := Completed + 1}};
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
			name:       "ch07-l05 Circuit Breaker Statem",
			exerciseID: "ch07-l05",
			files: map[string]string{
				"src/circuit_breaker_statem.erl": `-module(circuit_breaker_statem).
-behaviour(gen_statem).

-export([
    start_link/2,
    execute/2,
    get_state_name/1,
    stop/1
]).

-export([
    callback_mode/0,
    init/1,
    closed/3,
    open/3,
    half_open/3,
    terminate/3,
    code_change/4
]).

start_link(FailureThreshold, OpenTimeoutMs) ->
    gen_statem:start_link(?MODULE, {FailureThreshold, OpenTimeoutMs}, []).

execute(Pid, ActionFun) when is_function(ActionFun, 0) ->
    gen_statem:call(Pid, {execute, ActionFun}).

get_state_name(Pid) ->
    gen_statem:call(Pid, get_state_name).

stop(Pid) ->
    gen_statem:stop(Pid).

callback_mode() ->
    state_functions.

init({Threshold, TimeoutMs}) ->
    Data = #{threshold => Threshold, timeout => TimeoutMs, failures => 0},
    {ok, closed, Data}.

closed({call, From}, get_state_name, Data) ->
    {keep_state, Data, [{reply, From, closed}]};
closed({call, From}, {execute, ActionFun}, Data = #{threshold := Threshold, timeout := TimeoutMs, failures := Failures}) ->
    case (try ActionFun() catch _:Crash -> {error, Crash} end) of
        {ok, Res} ->
            {keep_state, Data#{failures := 0}, [{reply, From, {ok, Res}}]};
        Err ->
            NewFailures = Failures + 1,
            if
                NewFailures >= Threshold ->
                    {next_state, open, Data#{failures := NewFailures}, [{state_timeout, TimeoutMs, try_half_open}, {reply, From, Err}]};
                true ->
                    {keep_state, Data#{failures := NewFailures}, [{reply, From, Err}]}
            end
    end.

open({call, From}, get_state_name, Data) ->
    {keep_state, Data, [{reply, From, open}]};
open({call, From}, {execute, _ActionFun}, Data) ->
    {keep_state, Data, [{reply, From, {error, circuit_open}}]};
open(state_timeout, try_half_open, Data) ->
    {next_state, half_open, Data}.

half_open({call, From}, get_state_name, Data) ->
    {keep_state, Data, [{reply, From, half_open}]};
half_open({call, From}, {execute, ActionFun}, Data = #{timeout := TimeoutMs}) ->
    case (try ActionFun() catch _:Crash -> {error, Crash} end) of
        {ok, Res} ->
            {next_state, closed, Data#{failures := 0}, [{reply, From, {ok, Res}}]};
        Err ->
            {next_state, open, Data, [{state_timeout, TimeoutMs, try_half_open}, {reply, From, Err}]}
    end.

terminate(_Reason, _State, _Data) ->
    ok.

code_change(_OldVsn, State, Data, _Extra) ->
    {ok, State, Data}.
`,
			},
		},
		{
			name:       "ch07-l06 Security Audit Handler",
			exerciseID: "ch07-l06",
			files: map[string]string{
				"src/security_audit_handler.erl": `-module(security_audit_handler).
-behaviour(gen_event).

-export([
    add_to_manager/2,
    get_ip_status/2
]).

-export([
    init/1,
    handle_event/2,
    handle_call/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

add_to_manager(ManagerPid, MaxAttempts) ->
    gen_event:add_handler(ManagerPid, ?MODULE, MaxAttempts).

get_ip_status(ManagerPid, IpBinary) ->
    gen_event:call(ManagerPid, ?MODULE, {get_status, IpBinary}).

init(MaxAttempts) ->
    {ok, #{max => MaxAttempts, tracker => #{}}}.

handle_event({login_failed, Ip}, State = #{max := Max, tracker := Tracker}) ->
    Current = maps:get(Ip, Tracker, #{attempts => 0, alert => false}),
    NewAttempts = maps:get(attempts, Current) + 1,
    Alert = NewAttempts >= Max,
    NewTracker = maps:put(Ip, #{attempts => NewAttempts, alert => Alert}, Tracker),
    {ok, State#{tracker := NewTracker}};

handle_event({login_success, Ip}, State = #{tracker := Tracker}) ->
    NewTracker = maps:put(Ip, #{attempts => 0, alert => false}, Tracker),
    {ok, State#{tracker := NewTracker}};

handle_event(_OtherEvent, State) ->
    {ok, State}.

handle_call({get_status, Ip}, State = #{tracker := Tracker}) ->
    Status = maps:get(Ip, Tracker, #{attempts => 0, alert => false}),
    {ok, {ok, Status}, State};
handle_call(_Req, State) ->
    {ok, {error, unknown_call}, State}.

handle_info(_Info, State) ->
    {ok, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
			},
		},
		{
			name:       "ch07-l07 Incident #103",
			exerciseID: "ch07-l07",
			files: map[string]string{
				"src/incident_blocking_init.erl": `-module(incident_blocking_init).
-behaviour(gen_server).

-export([
    start_link/1,
    lookup_rule/2,
    get_item/2,
    get_status/1,
    stop/1
]).

-export([
    init/1,
    handle_continue/2,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

start_link(SeedRules) ->
    gen_server:start_link(?MODULE, SeedRules, []).

lookup_rule(Pid, Port) ->
    gen_server:call(Pid, {lookup_rule, Port}).

get_item(Pid, Key) ->
    gen_server:call(Pid, {get_item, Key}).

get_status(Pid) ->
    gen_server:call(Pid, get_status).

stop(Pid) ->
    gen_server:stop(Pid).

init(SeedRules) ->
    {ok, #{status => booting, raw => SeedRules, rules => #{}, items => #{}}, {continue, {hydrate, SeedRules}}}.

handle_continue({hydrate, SeedRules}, State) ->
    Compiled = maps:from_list(SeedRules),
    {noreply, State#{status := ready, rules := Compiled, items := Compiled}}.

handle_call({lookup_rule, _Port}, _From, #{status := booting} = State) ->
    {reply, {error, still_booting}, State};
handle_call({lookup_rule, Port}, _From, #{status := ready, rules := Rules} = State) ->
    case maps:find(Port, Rules) of
        {ok, Action} -> {reply, {ok, Action}, State};
        error        -> {reply, {error, not_found}, State}
    end;
handle_call({get_item, _Key}, _From, #{status := booting} = State) ->
    {reply, {error, still_booting}, State};
handle_call({get_item, Key}, _From, #{status := ready, rules := Rules} = State) ->
    case maps:find(Key, Rules) of
        {ok, Val} -> {reply, {ok, Val}, State};
        error     -> {reply, {error, not_found}, State}
    end;
handle_call(get_status, _From, #{status := Status} = State) ->
    {reply, Status, State};
handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

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
			name:       "ch07-l08 Rate Limiter Server",
			exerciseID: "ch07-l08",
			files: map[string]string{
				"src/rate_limiter_srv.erl": `-module(rate_limiter_srv).
-behaviour(gen_server).

-export([
    start_link/2,
    check_request/3,
    refill_all/1,
    reset_client/2,
    get_stats/1,
    stop/1
]).

-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

start_link(MaxTokens, RefillAmount) when is_integer(MaxTokens), is_integer(RefillAmount) ->
    gen_server:start_link(?MODULE, {MaxTokens, RefillAmount}, []).

check_request(Pid, ClientId, Cost) when is_integer(Cost), Cost > 0 ->
    gen_server:call(Pid, {check_request, ClientId, Cost}).

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

handle_call({check_request, ClientId, Cost}, _From, State = #{max_tokens := Max, clients := Clients, total_allowed := Allowed, total_rejected := Rejected}) ->
    CurrentTokens = maps:get(ClientId, Clients, Max),
    if
        CurrentTokens >= Cost ->
            Remaining = CurrentTokens - Cost,
            NewClients = maps:put(ClientId, Remaining, Clients),
            {reply, {allow, Remaining}, State#{clients := NewClients, total_allowed := Allowed + 1}};
        true ->
            {reply, {deny, CurrentTokens}, State#{total_rejected := Rejected + 1}}
    end;

handle_call(refill_all, _From, State = #{max_tokens := Max, refill_amount := Refill, clients := Clients}) ->
    RefilledClients = maps:map(fun(_Id, Tokens) ->
        min(Tokens + Refill, Max)
    end, Clients),
    {reply, ok, State#{clients := RefilledClients}};

handle_call(get_stats, _From, State = #{clients := Clients, total_allowed := Allowed, total_rejected := Rejected}) ->
    Stats = #{
        total_allowed => Allowed,
        total_rejected => Rejected,
        active_clients => maps:size(Clients)
    },
    {reply, Stats, State};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_call}, State}.

handle_cast({reset_client, ClientId}, State = #{max_tokens := Max, clients := Clients}) ->
    NewClients = maps:put(ClientId, Max, Clients),
    {noreply, State#{clients := NewClients}};
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

			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
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

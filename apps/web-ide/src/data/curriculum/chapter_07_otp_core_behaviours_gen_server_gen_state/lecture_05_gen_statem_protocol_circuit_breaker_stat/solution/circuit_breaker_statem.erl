-module(circuit_breaker_statem).
-behaviour(gen_statem).

-export([
    start_link/2,
    execute/2,
    get_state_name/1,
    stop/1
]).

%% gen_statem Callbacks
-export([
    callback_mode/0,
    init/1,
    closed/3,
    open/3,
    half_open/3,
    terminate/3,
    code_change/4
]).

%% Client API
start_link(FailureThreshold, OpenTimeoutMs) ->
    gen_statem:start_link(?MODULE, {FailureThreshold, OpenTimeoutMs}, []).

execute(Pid, ActionFun) when is_function(ActionFun, 0) ->
    gen_statem:call(Pid, {execute, ActionFun}).

get_state_name(Pid) ->
    gen_statem:call(Pid, get_state_name).

stop(Pid) ->
    gen_statem:stop(Pid).

%% gen_statem Callbacks
callback_mode() ->
    state_functions.

init({Threshold, TimeoutMs}) ->
    Data = #{threshold => Threshold, timeout => TimeoutMs, failures => 0},
    {ok, closed, Data}.

%% ── Closed State ───────────────────────────────────────────────────────────
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

%% ── Open State ─────────────────────────────────────────────────────────────
open({call, From}, get_state_name, Data) ->
    {keep_state, Data, [{reply, From, open}]};
open({call, From}, {execute, _ActionFun}, Data) ->
    {keep_state, Data, [{reply, From, {error, circuit_open}}]};
open(state_timeout, try_half_open, Data) ->
    {next_state, half_open, Data}.

%% ── Half-Open State ────────────────────────────────────────────────────────
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

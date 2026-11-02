-module(security_audit_handler).
-behaviour(gen_event).

-export([
    add_to_manager/2,
    get_ip_status/2
]).

%% gen_event Callbacks
-export([
    init/1,
    handle_event/2,
    handle_call/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% Client API
add_to_manager(ManagerPid, MaxAttempts) ->
    gen_event:add_handler(ManagerPid, ?MODULE, MaxAttempts).

get_ip_status(ManagerPid, IpBinary) ->
    gen_event:call(ManagerPid, ?MODULE, {get_status, IpBinary}).

%% gen_event Callbacks
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

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
    ok.

get_ip_status(ManagerPid, IpBinary) ->
    ok.

%% gen_event Callbacks
init(MaxAttempts) ->
    {ok, #{max => MaxAttempts, tracker => #{}}}.

handle_event(_Event, State) ->
    {ok, State}.

handle_call(_Req, State) ->
    {ok, ok, State}.

handle_info(_Info, State) ->
    {ok, State}.

terminate(_Reason, _State) ->
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.

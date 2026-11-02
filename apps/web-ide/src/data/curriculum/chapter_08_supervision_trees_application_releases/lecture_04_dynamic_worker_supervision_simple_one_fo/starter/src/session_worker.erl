-module(session_worker).
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

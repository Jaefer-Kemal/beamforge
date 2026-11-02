-module(checkout_worker).
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

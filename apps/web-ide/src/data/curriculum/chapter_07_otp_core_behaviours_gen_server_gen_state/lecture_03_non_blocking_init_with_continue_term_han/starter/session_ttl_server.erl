-module(session_ttl_server).
-behaviour(gen_server).

-export([
    start_link/1,
    create_session/2,
    is_valid/2,
    get_active_count/1,
    stop/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_continue/2,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% Client API
start_link(TtlSeconds) when is_integer(TtlSeconds), TtlSeconds > 0 ->
    gen_server:start_link(?MODULE, TtlSeconds, []).

create_session(Pid, SessionId) ->
    ok.

is_valid(Pid, SessionId) ->
    false.

get_active_count(Pid) ->
    0.

stop(Pid) ->
    gen_server:stop(Pid).

%% gen_server Callbacks
init(TtlSeconds) ->
    %% Return 3-element tuple with continue
    {ok, #{ttl => TtlSeconds, sessions => #{}}, {continue, hydrate_defaults}}.

handle_continue(hydrate_defaults, State) ->
    {noreply, State}.

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

-module(xmpp_session_registry).
-behaviour(gen_server).

-export([
    start_link/0,
    stop/0,
    register_session/3,
    unregister_session/1,
    lookup_by_jid/1,
    list_all_sessions/0,
    parse_jid/1
]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-define(TAB, xmpp_sessions_tab).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

stop() ->
    case whereis(?MODULE) of
        undefined -> ok;
        Pid -> gen_server:stop(Pid)
    end.

register_session(FullJid, Priority, C2sPid)
  when is_binary(FullJid), is_integer(Priority), is_pid(C2sPid) ->
    gen_server:call(?MODULE, {register_session, FullJid, Priority, C2sPid}).

unregister_session(FullJid) when is_binary(FullJid) ->
    gen_server:call(?MODULE, {unregister_session, FullJid}).

lookup_by_jid(TargetJid) when is_binary(TargetJid) ->
    ensure_table(),
    case binary:match(TargetJid, <<"/">>) of
        {_, _} ->
            case ets:lookup(?TAB, TargetJid) of
                [{TargetJid, _Bare, _Res, _Prio, Pid, _MRef}] -> [Pid];
                [] -> []
            end;
        nomatch ->
            All = ets:tab2list(?TAB),
            Matching = [Item || Item = {_Full, Bare, _Res, _Prio, _Pid, _MRef} <- All, Bare =:= TargetJid],
            Sorted = lists:sort(fun({_, _, _, P1, _, _}, {_, _, _, P2, _, _}) -> P1 >= P2 end, Matching),
            case Sorted of
                [{_F, _B, _R, _P, TopPid, _Ref} | _] -> [TopPid];
                [] -> []
            end
    end.

list_all_sessions() ->
    ensure_table(),
    ets:tab2list(?TAB).

parse_jid(JidBin) when is_binary(JidBin) ->
    case binary:split(JidBin, <<"/">>) of
        [Bare, Res] -> {Bare, Res};
        [Bare] -> {Bare, <<>>}
    end.

init([]) ->
    ensure_table(),
    {ok, #{monitors => #{}}}.

handle_call({register_session, FullJidBin, Priority, C2sPid}, _From, State) ->
    ensure_table(),
    {BareJid, Resource} = parse_jid(FullJidBin),
    MRef = erlang:monitor(process, C2sPid),
    ets:insert(?TAB, {FullJidBin, BareJid, Resource, Priority, C2sPid, MRef}),
    Monitors = maps:get(monitors, State, #{}),
    NewMonitors = Monitors#{MRef => FullJidBin},
    {reply, ok, State#{monitors => NewMonitors}};

handle_call({unregister_session, FullJidBin}, _From, State) ->
    ensure_table(),
    case ets:lookup(?TAB, FullJidBin) of
        [{FullJidBin, _Bare, _Res, _Prio, _Pid, MRef}] ->
            erlang:demonitor(MRef, [flush]),
            ets:delete(?TAB, FullJidBin);
        [] ->
            ok
    end,
    {reply, ok, State};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_request}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({'DOWN', MRef, process, DeadPid, _Reason}, State) ->
    ensure_table(),
    Monitors = maps:get(monitors, State, #{}),
    case maps:get(MRef, Monitors, undefined) of
        undefined ->
            lists:foreach(fun({FullJid, _B, _R, _P, Pid, _Ref}) ->
                if Pid =:= DeadPid -> ets:delete(?TAB, FullJid); true -> ok end
            end, ets:tab2list(?TAB)),
            {noreply, State};
        FullJidBin ->
            ets:delete(?TAB, FullJidBin),
            {noreply, State#{monitors => maps:remove(MRef, Monitors)}}
    end;

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

ensure_table() ->
    case ets:whereis(?TAB) of
        undefined ->
            ets:new(?TAB, [set, named_table, public, {read_concurrency, true}]);
        _Tid ->
            ?TAB
    end.

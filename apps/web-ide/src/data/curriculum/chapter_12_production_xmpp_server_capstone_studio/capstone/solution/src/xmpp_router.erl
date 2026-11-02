-module(xmpp_router).
-behaviour(gen_server).

-export([
    start_link/0,
    stop/0,
    route_stanza/3,
    pop_offline_messages/1,
    get_offline_count/1
]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

stop() ->
    case whereis(?MODULE) of
        undefined -> ok;
        Pid -> gen_server:stop(Pid)
    end.

route_stanza(FromFullJid, ToJid, XmlBin)
  when is_binary(FromFullJid), is_binary(ToJid), is_binary(XmlBin) ->
    gen_server:call(?MODULE, {route_stanza, FromFullJid, ToJid, XmlBin}).

pop_offline_messages(TargetJid) when is_binary(TargetJid) ->
    gen_server:call(?MODULE, {pop_offline, TargetJid}).

get_offline_count(TargetJid) when is_binary(TargetJid) ->
    gen_server:call(?MODULE, {get_offline_count, TargetJid}).

init([]) ->
    {ok, #{offline_store => #{}, total_routed => 0}}.

handle_call({route_stanza, _FromFullJid, ToJid, XmlBin}, _From, State) ->
    TargetPids = xmpp_session_registry:lookup_by_jid(ToJid),
    case TargetPids of
        [_ | _] ->
            lists:foreach(fun(Pid) ->
                Pid ! {deliver_stanza, binary:copy(XmlBin)}
            end, TargetPids),
            Count = length(TargetPids),
            Total = maps:get(total_routed, State, 0) + Count,
            {reply, {routed, Count}, State#{total_routed => Total}};
        [] ->
            {BareJid, _Res} = xmpp_session_registry:parse_jid(ToJid),
            OfflineStore = maps:get(offline_store, State, #{}),
            Existing = maps:get(BareJid, OfflineStore, []),
            UpdatedStore = OfflineStore#{BareJid => Existing ++ [binary:copy(XmlBin)]},
            {reply, {queued_offline, BareJid}, State#{offline_store => UpdatedStore}}
    end;

handle_call({pop_offline, TargetJid}, _From, State) ->
    {BareJid, _Res} = xmpp_session_registry:parse_jid(TargetJid),
    OfflineStore = maps:get(offline_store, State, #{}),
    Msgs = maps:get(BareJid, OfflineStore, []),
    UpdatedStore = maps:remove(BareJid, OfflineStore),
    {reply, {ok, Msgs}, State#{offline_store => UpdatedStore}};

handle_call({get_offline_count, TargetJid}, _From, State) ->
    {BareJid, _Res} = xmpp_session_registry:parse_jid(TargetJid),
    OfflineStore = maps:get(offline_store, State, #{}),
    Msgs = maps:get(BareJid, OfflineStore, []),
    {reply, length(Msgs), State};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_request}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

%% % TODO [Milestone 5 - Step 1]: Online Routing vs Offline Fallback Spooling
%% 1. Query target recipients with xmpp_session_registry:lookup_by_jid(ToJid).
%% 2. If target PIDs exist ([_ | _]):
%%    - For each Pid, send: Pid ! {deliver_stanza, binary:copy(XmlBin)}
%%    - Increment total_routed counter
%%    - Return {reply, {routed, length(TargetPids)}, UpdatedState}
%% 3. If no target PIDs exist (recipient is offline: []):
%%    - Parse BareJid with xmpp_session_registry:parse_jid(ToJid)
%%    - Append binary:copy(XmlBin) to list for BareJid in State.offline_store
%%    - Return {reply, {queued_offline, BareJid}, UpdatedState}
handle_call({route_stanza, _FromFullJid, ToJid, XmlBin}, _From, State) ->
    %% Implement online delivery vs offline queueing here:
    {reply, {queued_offline, ToJid}, State};

%% % TODO [Milestone 5 - Step 2]: Pop Offline Messages for Target JID
%% 1. Parse BareJid with xmpp_session_registry:parse_jid(TargetJid).
%% 2. Get list of queued messages from State.offline_store (default []).
%% 3. Remove BareJid from State.offline_store map.
%% 4. Return {reply, {ok, Messages}, UpdatedState}.
handle_call({pop_offline, TargetJid}, _From, State) ->
    %% Implement offline message retrieval here:
    {reply, {ok, []}, State};

%% % TODO [Milestone 5 - Step 3]: Get Count of Offline Messages
%% 1. Parse BareJid with xmpp_session_registry:parse_jid(TargetJid).
%% 2. Return {reply, length(Messages), State}.
handle_call({get_offline_count, TargetJid}, _From, State) ->
    %% Implement offline count query here:
    {reply, 0, State};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_request}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

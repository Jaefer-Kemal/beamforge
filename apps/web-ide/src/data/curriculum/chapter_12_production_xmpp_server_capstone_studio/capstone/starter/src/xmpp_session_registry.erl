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

%% % TODO [Milestone 3 - Step 1]: Direct Concurrent ETS Lookup
%% 1. Ensure table exists with ensure_table().
%% 2. Check if TargetJid contains <<"/">>:
%%    - If YES (Full JID): Use ets:lookup(?TAB, TargetJid).
%%      If found, return [Pid]. If not found, return [].
%%    - If NO (Bare JID): Find all sessions in ?TAB matching BareJid.
%%      Sort matching sessions by Priority descending.
%%      Return the list containing the single highest-priority PID: [TopPid], or [] if none.
lookup_by_jid(TargetJid) when is_binary(TargetJid) ->
    ensure_table(),
    %% Implement lookup logic here:
    [].

list_all_sessions() ->
    ensure_table(),
    ets:tab2list(?TAB).

parse_jid(JidBin) when is_binary(JidBin) ->
    case binary:split(JidBin, <<"/">>) of
        [Bare, Res] -> {Bare, Res};
        [Bare] -> {Bare, <<>>}
    end.

ensure_table() ->
    case ets:info(?TAB) of
        undefined ->
            ets:new(?TAB, [named_table, public, set, {read_concurrency, true}]);
        _ ->
            ?TAB
    end.

init([]) ->
    ensure_table(),
    {ok, #{monitors => #{}}}.

%% % TODO [Milestone 3 - Step 2]: Implement Session Registration & Monitoring
%% 1. Call parse_jid(FullJidBin) to get {BareJid, Resource}.
%% 2. Call MRef = erlang:monitor(process, C2sPid).
%% 3. Insert record into ?TAB: {FullJidBin, BareJid, Resource, Priority, C2sPid, MRef}.
%% 4. Save MRef => FullJidBin in State.monitors map.
%% 5. Return {reply, ok, NewState}.
handle_call({register_session, FullJidBin, Priority, C2sPid}, _From, State) ->
    ensure_table(),
    %% Implement registration here:
    {reply, ok, State};

%% % TODO [Milestone 3 - Step 3]: Implement Session Unregistration
%% 1. Look up FullJidBin in ?TAB to find MRef.
%% 2. Demonitor with erlang:demonitor(MRef, [flush]).
%% 3. Delete from ?TAB with ets:delete(?TAB, FullJidBin).
%% 4. Return {reply, ok, State}.
handle_call({unregister_session, FullJidBin}, _From, State) ->
    ensure_table(),
    %% Implement unregistration here:
    {reply, ok, State};

handle_call(_Req, _From, State) ->
    {reply, {error, unknown_request}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

%% % TODO [Milestone 3 - Step 4]: Process Monitor Termination Handler
%% When a monitored C2S process terminates, the BEAM delivers:
%% {'DOWN', MRef, process, DeadPid, Reason}
%% 1. Find FullJid mapped to MRef in State.monitors.
%% 2. Delete entry from ?TAB with ets:delete(?TAB, FullJid).
%% 3. Remove MRef from the monitors map.
%% 4. Return {noreply, NewState}.
handle_info({'DOWN', MRef, process, _DeadPid, _Reason}, State) ->
    ensure_table(),
    %% Implement monitor cleanup here:
    {noreply, State};

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

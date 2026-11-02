-module(xmpp_presence_router).
-export([
    upsert_session/5,
    remove_session_by_pid/2,
    resolve_message_targets/2,
    broadcast_presence/4
]).

-type session() :: {session, FullJid :: binary(), BareJid :: binary(), Resource :: binary(), Priority :: integer(), Pid :: pid()}.
-type roster_map() :: #{binary() => [binary()]}.

%% @doc Adds or updates a connected user session.
-spec upsert_session([session()], binary(), integer(), pid(), roster_map()) -> [session()].
upsert_session(Sessions, FullJid, Priority, Pid, _RosterMap) ->
    %% % TODO: Extract BareJid and Resource, replace matching FullJid or insert
    [].

%% @doc Removes all sessions owned by DeadPid using tail recursion.
-spec remove_session_by_pid([session()], pid()) -> [session()].
remove_session_by_pid(Sessions, DeadPid) ->
    %% % TODO: Tail-recursive session pruning
    [].

%% @doc Resolves message targets according to RFC 6121 priority rules.
-spec resolve_message_targets([session()], binary()) ->
    {route_online, [pid()]} | {store_offline, binary()}.
resolve_message_targets(Sessions, TargetJid) ->
    %% % TODO: Check Full JID match; fallback to highest non-negative priority
    {store_offline, TargetJid}.

%% @doc Broadcasts presence updates to roster subscribers and own other resources.
-spec broadcast_presence([session()], roster_map(), binary(), binary()) -> non_neg_integer().
broadcast_presence(Sessions, RosterMap, SenderFullJid, PresenceStanza) ->
    %% % TODO: Fan out {xmpp_presence, SenderFullJid, PresenceStanza} to contacts
    0.

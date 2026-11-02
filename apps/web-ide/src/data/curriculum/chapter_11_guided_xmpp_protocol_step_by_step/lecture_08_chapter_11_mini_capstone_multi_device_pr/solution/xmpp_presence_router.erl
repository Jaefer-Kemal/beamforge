-module(xmpp_presence_router).
-export([
    upsert_session/5,
    remove_session_by_pid/2,
    resolve_message_targets/2,
    broadcast_presence/4
]).

-type session() :: {session, FullJid :: binary(), BareJid :: binary(), Resource :: binary(), Priority :: integer(), Pid :: pid()}.
-type roster_map() :: #{binary() => [binary()]}.

-spec upsert_session([session()], binary(), integer(), pid(), roster_map()) -> [session()].
upsert_session(Sessions, FullJid, Priority, Pid, _RosterMap) ->
    {BareJid, Resource} = split_jid(FullJid),
    ClampedPriority = clamp_priority(Priority),
    NewSession = {session, FullJid, BareJid, Resource, ClampedPriority, Pid},
    Filtered = [S || S = {session, F, _, _, _, _} <- Sessions, F =/= FullJid],
    [NewSession | Filtered].

-spec remove_session_by_pid([session()], pid()) -> [session()].
remove_session_by_pid(Sessions, DeadPid) ->
    remove_pid_loop(Sessions, DeadPid, []).

remove_pid_loop([], _DeadPid, Acc) ->
    lists:reverse(Acc);
remove_pid_loop([{session, _, _, _, _, Pid} | Rest], DeadPid, Acc) when Pid =:= DeadPid ->
    remove_pid_loop(Rest, DeadPid, Acc);
remove_pid_loop([Session | Rest], DeadPid, Acc) ->
    remove_pid_loop(Rest, DeadPid, [Session | Acc]).

-spec resolve_message_targets([session()], binary()) ->
    {route_online, [pid()]} | {store_offline, binary()}.
resolve_message_targets(Sessions, TargetJid) ->
    case binary:match(TargetJid, <<"/">>) of
        {_, _} ->
            %% Target is Full JID: check exact resource first
            case [Pid || {session, F, _, _, _, Pid} <- Sessions, F =:= TargetJid] of
                [ExactPid | _] ->
                    {route_online, [ExactPid]};
                [] ->
                    %% Specific resource is offline; fall back to Bare JID routing rules
                    {Bare, _} = split_jid(TargetJid),
                    route_bare(Sessions, Bare)
            end;
        nomatch ->
            route_bare(Sessions, TargetJid)
    end.

route_bare(Sessions, BareJid) ->
    Matching = [{P, Pid} || {session, _, B, _, P, Pid} <- Sessions, B =:= BareJid, P >= 0],
    case Matching of
        [] ->
            {store_offline, BareJid};
        _ ->
            MaxPriority = lists:max([P || {P, _} <- Matching]),
            BestPids = [Pid || {P, Pid} <- Matching, P =:= MaxPriority],
            {route_online, BestPids}
    end.

-spec broadcast_presence([session()], roster_map(), binary(), binary()) -> non_neg_integer().
broadcast_presence(Sessions, RosterMap, SenderFullJid, PresenceStanza) ->
    {SenderBare, _} = split_jid(SenderFullJid),
    Subscribers = maps:get(SenderBare, RosterMap, []),
    TargetBares = [SenderBare | Subscribers],
    
    TargetSessions = [
        Pid || {session, Full, Bare, _, _, Pid} <- Sessions,
        Full =/= SenderFullJid,
        lists:member(Bare, TargetBares)
    ],
    
    UniquePids = lists:usort(TargetSessions),
    lists:foreach(fun(Pid) ->
        Pid ! {xmpp_presence, SenderFullJid, PresenceStanza}
    end, UniquePids),
    length(UniquePids).

split_jid(FullJid) ->
    case binary:split(FullJid, <<"/">>) of
        [Bare, Res] -> {binary:copy(Bare), binary:copy(Res)};
        [Bare]      -> {binary:copy(Bare), <<>>}
    end.

clamp_priority(P) when is_integer(P) ->
    if
        P < -128 -> -128;
        P > 127  -> 127;
        true     -> P
    end;
clamp_priority(_) ->
    0.

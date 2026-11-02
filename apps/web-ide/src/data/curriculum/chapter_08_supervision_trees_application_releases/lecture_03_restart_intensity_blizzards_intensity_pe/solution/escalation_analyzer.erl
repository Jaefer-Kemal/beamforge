-module(escalation_analyzer).

-export([
    evaluate_crash_burst/3,
    plan_escalation_action/2,
    reverse_shutdown_order/1
]).

evaluate_crash_burst([], MaxR, _MaxT) ->
    {within_budget, 0, MaxR};
evaluate_crash_burst(CrashTimestampsSecList, MaxR, MaxT)
  when is_list(CrashTimestampsSecList), is_integer(MaxR), MaxR >= 0, is_integer(MaxT), MaxT > 0 ->
    Latest = lists:max(CrashTimestampsSecList),
    Threshold = Latest - MaxT,
    InWindow = [Ts || Ts <- CrashTimestampsSecList, Ts >= Threshold, Ts =< Latest],
    Count = length(InWindow),
    if
        Count > MaxR -> {escalate_to_parent, Count, MaxR};
        true         -> {within_budget, Count, MaxR}
    end.

plan_escalation_action(ChildOrderList, CrashedChildId) when is_list(ChildOrderList) ->
    case lists:splitwith(fun(Id) -> Id =/= CrashedChildId end, ChildOrderList) of
        {_Prefix, []} ->
            {error, child_not_found};
        {_Prefix, Affected} ->
            ToStop = lists:reverse(Affected),
            ToRestart = Affected,
            {stop_in_reverse_order, ToStop, restart_in_order, ToRestart}
    end.

reverse_shutdown_order(StartupChildIdsList) when is_list(StartupChildIdsList) ->
    lists:reverse(StartupChildIdsList).

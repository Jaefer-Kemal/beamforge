-module(hof_fold).
-export([sum_ledger/1, min_max_latency/1, reverse_with_fold/1]).

sum_ledger(Entries) ->
    {TotalCred, TotalDeb, Net} = lists:foldl(fun
        ({entry, Amount, credit}, {CredAcc, DebAcc, NetAcc}) ->
            {CredAcc + Amount, DebAcc, NetAcc + Amount};
        ({entry, Amount, debit}, {CredAcc, DebAcc, NetAcc}) ->
            {CredAcc, DebAcc + Amount, NetAcc - Amount}
    end, {0, 0, 0}, Entries),
    {ledger_summary, TotalCred, TotalDeb, Net}.

min_max_latency([First | Rest]) ->
    lists:foldl(fun(Ms, {MinSoFar, MaxSoFar}) ->
        NewMin = case Ms < MinSoFar of true -> Ms; false -> MinSoFar end,
        NewMax = case Ms > MaxSoFar of true -> Ms; false -> MaxSoFar end,
        {NewMin, NewMax}
    end, {First, First}, Rest).

reverse_with_fold(List) ->
    lists:foldl(fun(Elem, Acc) -> [Elem | Acc] end, [], List).
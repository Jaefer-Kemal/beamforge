-module(hof_fold).
-export([sum_ledger/1, min_max_latency/1, reverse_with_fold/1]).

%% @doc Aggregate ledger entries using lists:foldl/3 into {ledger_summary, TotalCredit, TotalDebit, NetBalance}.
sum_ledger(_Entries) ->
    %% Fold with initial accumulator {0, 0, 0}
    ok.

%% @doc Find {Min, Max} latency across non-empty list using lists:foldl/3.
min_max_latency([_First | _Rest]) ->
    %% Fold over Rest with initial accumulator {First, First}
    ok.

%% @doc Reverse a list using lists:foldl/3 and prepend [Elem | Acc].
reverse_with_fold(_List) ->
    %% Fold with initial accumulator []
    ok.
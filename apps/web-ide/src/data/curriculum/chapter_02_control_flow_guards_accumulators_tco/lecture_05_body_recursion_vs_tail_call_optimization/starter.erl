-module(tco_counter).
-export([sum_packets/1, count_packets/1]).

%% @doc Sum integer packet sizes using a tail-recursive accumulator loop.
sum_packets(List) ->
    %% Delegate to a private helper sum_packets(List, 0).
    % TODO: Implement sum_packets/1 and sum_packets/2
    ok.

%% @doc Count items in list using a tail-recursive accumulator loop.
count_packets(List) ->
    %% Delegate to a private helper count_packets(List, 0).
    % TODO: Implement count_packets/1 and count_packets/2
    ok.
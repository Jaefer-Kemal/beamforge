-module(tco_counter).
-export([sum_packets/1, count_packets/1]).

sum_packets(List) ->
    sum_packets(List, 0).

sum_packets([], Acc) ->
    Acc;
sum_packets([H | T], Acc) ->
    sum_packets(T, Acc + H).

count_packets(List) ->
    count_packets(List, 0).

count_packets([], Acc) ->
    Acc;
count_packets([_ | T], Acc) ->
    count_packets(T, Acc + 1).
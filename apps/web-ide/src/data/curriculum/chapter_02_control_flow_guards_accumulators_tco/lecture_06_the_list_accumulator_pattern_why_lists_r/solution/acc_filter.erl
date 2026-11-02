-module(acc_filter).
-export([keep_valid_orders/1]).

keep_valid_orders(Orders) ->
    keep_valid_orders(Orders, []).

keep_valid_orders([], Acc) ->
    lists:reverse(Acc);
keep_valid_orders([{order, Id, Qty, confirmed} | Rest], Acc) when Qty > 0 ->
    keep_valid_orders(Rest, [Id | Acc]);
keep_valid_orders([_InvalidOrder | Rest], Acc) ->
    keep_valid_orders(Rest, Acc).
-module(hof_predicates).
-export([all_in_stock/1, has_critical_error/1, split_orders_by_stock/2]).

all_in_stock(Inventory) ->
    lists:all(fun({product, _Id, _Name, _Price, Stock}) ->
        Stock > 0
    end, Inventory).

has_critical_error(Logs) ->
    lists:any(fun({log, Level, _Msg}) ->
        Level =:= critical
    end, Logs).

split_orders_by_stock(Orders, MaxSingleOrderQty) ->
    lists:partition(fun({order, _Id, Qty}) ->
        Qty > 0 andalso Qty =< MaxSingleOrderQty
    end, Orders).
-module(hof_transform).
-export([discount_prices/2, active_sessions/1, sanitize_metrics/1]).

discount_prices(Products, DiscountPercent) ->
    lists:map(fun({product, Id, Name, Price}) ->
        NewPrice = Price - ((Price * DiscountPercent) div 100),
        {product, Id, Name, NewPrice}
    end, Products).

active_sessions(Sessions) ->
    lists:filter(fun({session, _Id, Status}) ->
        Status =:= active
    end, Sessions).

sanitize_metrics(RawMetrics) ->
    lists:filtermap(fun
        ({Metric, Value}) when Value >= 0 ->
            {true, {Metric, round(Value)}};
        ({_Metric, _Negative}) ->
            false
    end, RawMetrics).
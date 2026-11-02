-module(hof_transform).
-export([discount_prices/2, active_sessions/1, sanitize_metrics/1]).

%% @doc Apply DiscountPercent (e.g. 10 for 10%) to each product price using lists:map/2.
discount_prices(_Products, _DiscountPercent) ->
    %% Map over Products: NewPrice = Price - ((Price * DiscountPercent) div 100)
    ok.

%% @doc Retain only sessions with Status =:= active using lists:filter/2.
active_sessions(_Sessions) ->
    %% Filter Sessions where Status =:= active
    ok.

%% @doc Discard negative metrics and round non-negative metrics in a single pass using lists:filtermap/2.
sanitize_metrics(_RawMetrics) ->
    %% If Value < 0 -> false; If Value >= 0 -> {true, {Metric, round(Value)}}
    ok.
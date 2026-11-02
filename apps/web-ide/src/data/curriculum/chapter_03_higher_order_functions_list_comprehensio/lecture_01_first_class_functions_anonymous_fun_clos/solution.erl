-module(hof_basics).
-export([make_multiplier/1, apply_twice/2, math_capture/0, choose_pricing_strategy/1]).

make_multiplier(Factor) ->
    fun(X) -> X * Factor end.

apply_twice(F, X) when is_function(F, 1) ->
    F(F(X)).

math_capture() ->
    fun erlang:abs/1.

choose_pricing_strategy(vip) ->
    fun(Price) -> (Price * 80) div 100 end;
choose_pricing_strategy(wholesale) ->
    fun(Price) -> (Price * 70) div 100 end;
choose_pricing_strategy(_) ->
    fun(Price) -> Price end.
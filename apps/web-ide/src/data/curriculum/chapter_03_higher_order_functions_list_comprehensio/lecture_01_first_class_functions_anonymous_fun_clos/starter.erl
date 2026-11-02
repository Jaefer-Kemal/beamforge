-module(hof_basics).
-export([make_multiplier/1, apply_twice/2, math_capture/0, choose_pricing_strategy/1]).

%% @doc Return a closure that multiplies its input by Factor.
make_multiplier(_Factor) ->
    %% % TODO: Return an anonymous closure fun(X) that multiplies X by captured Factor
    ok.

%% @doc Apply unary function F twice to initial value X.
apply_twice(F, X) when is_function(F, 1) ->
    %% % TODO: Evaluate F(F(X))
    ok.

%% @doc Return a remote capture reference to erlang:abs/1.
math_capture() ->
    %% % TODO: Return a first-class function capture of erlang:abs/1 using fun Module:Function/Arity
    ok.

%% @doc Return pricing strategy closure based on customer tier atom.
choose_pricing_strategy(Tier) ->
    %% vip -> 20% discount: (Price * 80) div 100
    %% wholesale -> 30% discount: (Price * 70) div 100
    %% other -> Price
    ok.
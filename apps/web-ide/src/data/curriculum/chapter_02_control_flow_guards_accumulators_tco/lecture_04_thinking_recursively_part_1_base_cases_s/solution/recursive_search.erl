-module(recursive_search).
-export([find_product/2, contains_item/2]).

find_product([], _TargetId) ->
    not_found;
find_product([{product, TargetId, _Name, _Price, _Stock} = Prod | _Rest], TargetId) ->
    {ok, Prod};
find_product([_OtherProd | Rest], TargetId) ->
    find_product(Rest, TargetId).

contains_item([], _Target) ->
    false;
contains_item([Target | _Rest], Target) ->
    true;
contains_item([_Other | Rest], Target) ->
    contains_item(Rest, Target).
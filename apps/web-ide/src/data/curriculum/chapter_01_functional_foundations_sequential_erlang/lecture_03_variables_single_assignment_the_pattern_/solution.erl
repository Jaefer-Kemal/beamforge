-module(pattern_vars).
-export([rebind_update/2, extract_middle/1]).

rebind_update(Base, Increment) ->
    V1 = Base,
    V2 = V1 + Increment,
    V3 = V2 * 2,
    V3.

extract_middle(TripleTuple) ->
    {_, Middle, _} = TripleTuple,
    Middle.
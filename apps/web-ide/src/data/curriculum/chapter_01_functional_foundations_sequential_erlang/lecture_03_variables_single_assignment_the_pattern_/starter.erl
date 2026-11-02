-module(pattern_vars).
-export([rebind_update/2, extract_middle/1]).

%% @doc Progress state using sequential variables V1, V2, and V3.
rebind_update(Base, Increment) ->
    %% Progress state across sequential immutable variables:
    %% 1. Bind V1 to Base.
    %% 2. Bind V2 to V1 plus Increment.
    %% 3. Bind V3 to V2 multiplied by 2.
    %% 4. Return V3.
    ok.

%% @doc Extract the second element from a 3-element tuple using pattern matching.
extract_middle(TripleTuple) ->
    %% Destructure the 3-element tuple using the match operator = and wildcard _ to extract the middle value.
    ok.
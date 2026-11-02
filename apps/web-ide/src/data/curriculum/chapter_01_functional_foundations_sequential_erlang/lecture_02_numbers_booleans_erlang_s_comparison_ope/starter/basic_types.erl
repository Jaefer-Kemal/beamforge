-module(basic_types).
-export([calculate_bandwidth/2, is_exact_match/2, is_within_quota/3]).

%% @doc Calculate bits per second: (Bytes * 8) div Seconds
calculate_bandwidth(Bytes, Seconds) ->
    %% Convert Bytes to bits and compute whole integer bits per second using div.
    ok.

%% @doc Return true if ValA and ValB are strictly identical in value and type.
is_exact_match(ValA, ValB) ->
    %% Compare ValA and ValB using Erlang's exact type-and-value equality operator =:=.
    ok.

%% @doc Check if UsedMb is within limit [0, LimitMb] or user IsAdmin.
is_within_quota(UsedMb, LimitMb, IsAdmin) ->
    %% Check if user is an admin or usage falls within bounds [0, LimitMb].
    %% Remember: less-than-or-equal in Erlang is =<, and use short-circuit boolean operators!
    ok.
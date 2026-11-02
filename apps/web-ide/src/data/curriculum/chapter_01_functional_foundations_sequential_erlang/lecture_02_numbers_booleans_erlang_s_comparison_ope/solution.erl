-module(basic_types).
-export([calculate_bandwidth/2, is_exact_match/2, is_within_quota/3]).

calculate_bandwidth(Bytes, Seconds) ->
    (Bytes * 8) div Seconds.

is_exact_match(ValA, ValB) ->
    ValA =:= ValB.

is_within_quota(UsedMb, LimitMb, IsAdmin) ->
    IsAdmin =:= true orelse (UsedMb >= 0 andalso UsedMb =< LimitMb).
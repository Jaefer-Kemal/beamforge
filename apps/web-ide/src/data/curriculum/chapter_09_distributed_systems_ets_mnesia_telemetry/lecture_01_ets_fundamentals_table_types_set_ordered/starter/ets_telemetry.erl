-module(ets_telemetry).
-export([init_table/0, record_endpoint_hit/2, get_endpoint_hits/1, put_user_profile/3, get_user_profile/1]).

-define(TAB, telemetry_store).

init_table() ->
    ok.

record_endpoint_hit(EndpointBin, Incr) ->
    0.

get_endpoint_hits(EndpointBin) ->
    0.

put_user_profile(UserId, Name, Role) ->
    ok.

get_user_profile(UserId) ->
    {error, not_found}.

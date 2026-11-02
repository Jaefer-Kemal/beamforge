-module(telecom_foundations).
-export([classify_packet/1, bill_call/2, bill_call/3]).

classify_packet({ipv4, SrcHost, DstHost, [FirstItem | _Rest]}) ->
    {ok, ipv4, SrcHost, DstHost, FirstItem};
classify_packet({ipv6, SrcHost, DstHost, [FirstItem | _Rest]}) ->
    {ok, ipv6, SrcHost, DstHost, FirstItem};
classify_packet({_Tag, _Src, _Dst, []}) ->
    {error, empty_payload};
classify_packet(_) ->
    {error, invalid_packet}.

bill_call(DurationSec, PlanType) ->
    bill_call(DurationSec, PlanType, 10).

bill_call(DurationSec, standard, ConnectionFeeCents) ->
    {ok, ConnectionFeeCents + (DurationSec * 5)};
bill_call(DurationSec, premium, ConnectionFeeCents) ->
    {ok, ConnectionFeeCents + (DurationSec * 3)};
bill_call(_DurationSec, internal, _ConnectionFeeCents) ->
    {ok, 0};
bill_call(_DurationSec, _OtherPlan, _ConnectionFeeCents) ->
    {error, unknown_plan}.
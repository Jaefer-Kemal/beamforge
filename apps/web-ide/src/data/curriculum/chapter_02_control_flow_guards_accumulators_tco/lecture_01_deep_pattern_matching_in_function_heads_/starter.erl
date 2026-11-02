-module(deep_match).
-export([extract_route/1, repackage_envelope/1]).

%% @doc Deconstructs a nested packet envelope into routing endpoints.
%% See lesson guide for the exact envelope tuple shape and return contracts.
extract_route(_Packet) ->
    %% % TODO: Implement multi-clause pattern matching across IPv4, IPv6,
    %% % unsupported versions, and malformed envelope shapes.
    ok.

%% @doc Forwards IPv4 packets using pattern aliasing (= FullPacket) to preserve the original term.
repackage_envelope(_Packet) ->
    %% % TODO: Use pattern aliasing in the function head to extract Dst from IPv4 packets
    %% % while retaining the unmodified envelope, or drop unrecognized packets.
    ok.
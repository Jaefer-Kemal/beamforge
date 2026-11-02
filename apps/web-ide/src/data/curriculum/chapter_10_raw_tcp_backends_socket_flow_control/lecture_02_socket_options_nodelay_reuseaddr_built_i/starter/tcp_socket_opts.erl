-module(tcp_socket_opts).

-export([
    build_low_latency_opts/1,
    classify_socket_event/1,
    encode_length_prefixed/1
]).

%% @doc Constructs a low-latency socket options list with verified packet mode.
%% Valid PacketModes: raw, line, 1, 2, 4.
%% Returns [binary, {packet, PacketMode}, {active, once}, {nodelay, true}, {reuseaddr, true}]
%% or {error, invalid_packet_mode}.
-spec build_low_latency_opts(term()) -> [term()] | {error, invalid_packet_mode}.
build_low_latency_opts(_PacketMode) ->
    %% % TODO: Validate PacketMode (raw, line, 1, 2, or 4).
    %% % Return the canonical low-latency options list specified in the lesson guide,
    %% % or {error, invalid_packet_mode} if unsupported.
    ignore.

%% @doc Classifies incoming socket events into standardized internal tuples.
-spec classify_socket_event(term()) ->
    {data, non_neg_integer(), binary()} |
    {disconnected, normal_eof | {socket_error, term()}} |
    {error, unknown_event}.
classify_socket_event(_EventTuple) ->
    %% % TODO: Pattern match on the active socket lifecycle events
    %% % ({tcp, ...}, {tcp_closed, ...}, {tcp_error, ...}) and normalize them
    %% % into the tagged result tuples defined in the lesson guide.
    ignore.

%% @doc Manually encodes a 4-byte big-endian length prefix onto PayloadBin.
-spec encode_length_prefixed(binary()) -> binary().
encode_length_prefixed(_PayloadBin) ->
    %% % TODO: Using bit syntax, construct a frame containing PayloadBin
    %% % preceded by its byte size encoded as a 4-byte big-endian integer.
    ignore.
    
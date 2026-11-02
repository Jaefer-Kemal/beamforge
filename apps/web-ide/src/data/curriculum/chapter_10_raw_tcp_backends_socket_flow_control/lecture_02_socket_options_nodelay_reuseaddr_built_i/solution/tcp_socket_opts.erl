-module(tcp_socket_opts).

-export([
    build_low_latency_opts/1,
    classify_socket_event/1,
    encode_length_prefixed/1
]).

-spec build_low_latency_opts(term()) -> [term()] | {error, invalid_packet_mode}.
build_low_latency_opts(PacketMode) when PacketMode =:= raw;
                                        PacketMode =:= line;
                                        PacketMode =:= 1;
                                        PacketMode =:= 2;
                                        PacketMode =:= 4 ->
    [binary, {packet, PacketMode}, {active, once}, {nodelay, true}, {reuseaddr, true}];
build_low_latency_opts(_Other) ->
    {error, invalid_packet_mode}.

-spec classify_socket_event(term()) ->
    {data, non_neg_integer(), binary()} |
    {disconnected, normal_eof | {socket_error, term()}} |
    {error, unknown_event}.
classify_socket_event({tcp, _Socket, DataBin}) when is_binary(DataBin) ->
    {data, byte_size(DataBin), DataBin};
classify_socket_event({tcp_closed, _Socket}) ->
    {disconnected, normal_eof};
classify_socket_event({tcp_error, _Socket, Reason}) ->
    {disconnected, {socket_error, Reason}};
classify_socket_event(_Other) ->
    {error, unknown_event}.

-spec encode_length_prefixed(binary()) -> binary().
encode_length_prefixed(PayloadBin) when is_binary(PayloadBin) ->
    <<(byte_size(PayloadBin)):32/big-unsigned-integer, PayloadBin/binary>>.
    
-module(packet_parser).
-export([parse_frame/1, parse_tlv_stream/1, encode_frame/1]).

-record(tlv_frame, {
    version :: non_neg_integer(),
    type :: non_neg_integer(),
    length :: non_neg_integer(),
    payload :: binary()
}).

parse_frame(<<Version:4, Type:4, Length:16/big-unsigned-integer, Payload:Length/binary, Rest/binary>>) ->
    Frame = #tlv_frame{
        version = Version,
        type = Type,
        length = Length,
        payload = binary:copy(Payload)
    },
    {ok, Frame, Rest};
parse_frame(_) ->
    {error, incomplete_frame}.

parse_tlv_stream(StreamBinary) ->
    parse_tlv_loop(StreamBinary, []).

parse_tlv_loop(<<>>, Acc) ->
    {ok, lists:reverse(Acc)};
parse_tlv_loop(Binary, Acc) ->
    case parse_frame(Binary) of
        {ok, Frame, Rest} ->
            parse_tlv_loop(Rest, [Frame | Acc]);
        {error, incomplete_frame} ->
            {partial, lists:reverse(Acc), binary:copy(Binary)}
    end.

encode_frame(#tlv_frame{version = Version, type = Type, payload = Payload}) ->
    Len = byte_size(Payload),
    <<Version:4, Type:4, Len:16/big-unsigned-integer, Payload/binary>>.
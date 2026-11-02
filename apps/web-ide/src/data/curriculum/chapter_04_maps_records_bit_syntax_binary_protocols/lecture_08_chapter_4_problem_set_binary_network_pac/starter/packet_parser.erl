-module(packet_parser).
-export([parse_frame/1, parse_tlv_stream/1, encode_frame/1]).

%% Define -record(tlv_frame, {version, type, length, payload}).

%% @doc Parse single frame: <<Version:4, Type:4, Length:16/big, Payload:Length/binary, Rest/binary>>.
parse_frame(_Binary) ->
    %% Return {ok, #tlv_frame{...}, Rest} or {error, incomplete_frame}
    {error, incomplete_frame}.

%% @doc Tail-recursive loop returning {ok, Frames} or {partial, Frames, TrailingBytes}.
parse_tlv_stream(_StreamBinary) ->
    %% Call parse_tlv_loop(StreamBinary, [])
    {ok, []}.

%% @doc Encode #tlv_frame into <<Version:4, Type:4, Length:16/big, Payload/binary>>.
encode_frame(_Frame) ->
    %% Pack and return wire binary
    <<>>.
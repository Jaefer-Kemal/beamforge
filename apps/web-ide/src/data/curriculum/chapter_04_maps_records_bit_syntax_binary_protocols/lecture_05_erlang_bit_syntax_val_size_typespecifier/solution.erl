-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

pack_header(Version, Flags, Length) ->
    <<Version:4, Flags:4, Length:16/big-unsigned-integer>>.

unpack_header(<<Version:4, Flags:4, Length:16/big-unsigned-integer, Payload/binary>>) ->
    {ok, Version, Flags, Length, Payload};
unpack_header(_) ->
    {error, insufficient_bytes}.

encode_utf8_tagged(TextBinary) when is_binary(TextBinary) ->
    Len = byte_size(TextBinary),
    <<16#01:8, Len:16/big-unsigned-integer, TextBinary/binary>>.
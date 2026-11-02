-module(bit_packer).
-export([pack_header/3, unpack_header/1, encode_utf8_tagged/1]).

%% @doc Pack Version (4 bits), Flags (4 bits), Length (16 bits big).
pack_header(_Version, _Flags, _Length) ->
    %% % TODO: Pack Version, Flags, and Length into a 3-byte binary.
    <<>>.

%% @doc Unpack 3-byte header and extract trailing payload binary.
unpack_header(_Binary) ->
    %% % TODO: Extract Version, Flags, Length, and remaining payload.
    {error, insufficient_bytes}.

%% @doc Encode length-prefixed tagged text binary.
encode_utf8_tagged(TextBinary) when is_binary(TextBinary) ->
    %% % TODO: Prepend 1-byte tag (16#01) and 16-bit big-endian length prefix to TextBinary.
    <<>>.
-module(binary_unpinner).
-export([extract_token_safe/1, slice_packet_safe/2, inspect_refc_ratio/1]).

extract_token_safe(<<Token:16/binary, _Rest/binary>>) ->
    {ok, binary:copy(Token)};
extract_token_safe(_) ->
    {error, insufficient_data}.

slice_packet_safe(Packet, Length) when is_binary(Packet), is_integer(Length), byte_size(Packet) >= Length ->
    <<Slice:Length/binary, _Rest/binary>> = Packet,
    binary:copy(Slice).

inspect_refc_ratio(Bin) ->
    {byte_size(Bin), binary:referenced_byte_size(Bin)}.
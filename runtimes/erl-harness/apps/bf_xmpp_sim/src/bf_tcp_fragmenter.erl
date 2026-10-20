-module(bf_tcp_fragmenter).

-export([
    send_fragmented/4,
    send_coalesced/2
]).

-spec send_fragmented(gen_tcp:socket(), binary(), pos_integer(), non_neg_integer()) ->
    ok | {error, term()}.
send_fragmented(Socket, BinaryPayload, ChunkSizeBytes, DelayMs)
  when is_port(Socket) orelse is_tuple(Socket), is_binary(BinaryPayload), ChunkSizeBytes > 0 ->
    do_send_fragmented(Socket, BinaryPayload, ChunkSizeBytes, DelayMs).

do_send_fragmented(_Socket, <<>>, _ChunkSize, _DelayMs) ->
    ok;
do_send_fragmented(Socket, Payload, ChunkSize, DelayMs) ->
    case byte_size(Payload) of
        Size when Size =< ChunkSize ->
            gen_tcp:send(Socket, Payload);
        _ ->
            <<Chunk:ChunkSize/binary, Rest/binary>> = Payload,
            case gen_tcp:send(Socket, Chunk) of
                ok ->
                    if DelayMs > 0 -> timer:sleep(DelayMs); true -> ok end,
                    do_send_fragmented(Socket, Rest, ChunkSize, DelayMs);
                {error, Reason} ->
                    {error, Reason}
            end
    end.

-spec send_coalesced(gen_tcp:socket(), [binary() | iolist()]) -> ok | {error, term()}.
send_coalesced(Socket, ListOfPayloads) when is_list(ListOfPayloads) ->
    Combined = iolist_to_binary(ListOfPayloads),
    gen_tcp:send(Socket, Combined).

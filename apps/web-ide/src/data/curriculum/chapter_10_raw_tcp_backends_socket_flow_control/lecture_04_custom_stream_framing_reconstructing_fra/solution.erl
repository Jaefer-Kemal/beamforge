-module(tcp_frame_buffer).

-export([
    new_buffer/0,
    append_and_extract_lines/2
]).

-spec new_buffer() -> binary().
new_buffer() ->
    <<>>.

-spec append_and_extract_lines(binary(), binary()) -> {[binary()], binary()}.
append_and_extract_lines(OldBufferBin, IncomingChunkBin) ->
    Combined = <<OldBufferBin/binary, IncomingChunkBin/binary>>,
    extract_lines(Combined, []).

extract_lines(Buffer, Acc) ->
    case binary:split(Buffer, <<"
">>) of
        [Line, Rest] ->
            extract_lines(Rest, [binary:copy(Line) | Acc]);
        [Incomplete] ->
            {lists:reverse(Acc), binary:copy(Incomplete)}
    end.
    
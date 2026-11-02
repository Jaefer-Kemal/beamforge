-module(tcp_frame_buffer).

-export([
    new_buffer/0,
    append_and_extract_lines/2
]).

%% @doc Returns an empty binary buffer.
-spec new_buffer() -> binary().
new_buffer() ->
    <<>>.

%% @doc Concatenates OldBuffer with IncomingChunk, extracts all complete \r\n lines,
%% and returns {CompleteLinesList, RemainingBufferBin} with binary:copy/1 unpinning.
-spec append_and_extract_lines(binary(), binary()) -> {[binary()], binary()}.
append_and_extract_lines(_OldBufferBin, _IncomingChunkBin) ->
    %% % TODO:
    %% % 1. Stitch OldBufferBin and IncomingChunkBin together using binary concatenation (<<...>>).
    %% % 2. Recursively split the combined buffer on delimiter <<"\r\n">> using binary:split/2.
    %% % 3. Call binary:copy/1 on each extracted complete line to unpin it from the socket ProcBin buffer.
    %% % 4. Call binary:copy/1 on the remaining trailing partial buffer.
    %% % 5. Return {CompleteLinesList, RemainingBufferBin}.
    ignore.
    
-module(xmpp_xml_framer).
-export([extract_frames/2]).

%% @doc Extracts complete XML stanzas from a continuous TCP byte buffer.
%% Returns {ExtractedFramesList, RemainingBufferBin}.
-spec extract_frames(binary(), binary()) -> {[binary()], binary()}.
extract_frames(BufferBin, NewChunkBin) ->
    %% % TODO: Implement incremental XML stream framer
    %% 1. Combined = <<BufferBin/binary, NewChunkBin/binary>>
    %% 2. Check for <stream:stream ...>
    %% 3. Check for complete child stanzas (<iq>...</iq>, <presence/>, etc.)
    %% 4. Use binary:copy/1 on remaining unparsed buffer
    {[], <<>>}.

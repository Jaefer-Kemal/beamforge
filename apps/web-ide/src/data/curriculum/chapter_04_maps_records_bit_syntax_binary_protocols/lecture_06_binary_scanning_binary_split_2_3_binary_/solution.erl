-module(binary_scanner).
-export([split_key_value/1, extract_lines/1, xor_mask_payload/2]).

split_key_value(HeaderBin) ->
    case binary:split(HeaderBin, <<": ">>) of
        [Key, Value] ->
            {ok, Key, Value};
        _ ->
            {error, malformed_header}
    end.

extract_lines(MultiLineBin) ->
    binary:split(MultiLineBin, <<"
">>, [global, trim_all]).

xor_mask_payload(PayloadBin, MaskByte) ->
    << <<(B bxor MaskByte):8>> || <<B:8>> <= PayloadBin >>.
-module(xmpp_xml_framer).
-export([extract_frames/2]).

-spec extract_frames(binary(), binary()) -> {[binary()], binary()}.
extract_frames(BufferBin, NewChunkBin) ->
    Combined = <<BufferBin/binary, NewChunkBin/binary>>,
    extract_loop(Combined, []).

extract_loop(Bin, Acc) ->
    Trimmed = trim_leading(Bin),
    case byte_size(Trimmed) of
        0 ->
            {lists:reverse(Acc), <<>>};
        _ ->
            case try_extract_frame(Trimmed) of
                {ok, Frame, Rest} ->
                    extract_loop(Rest, [Frame | Acc]);
                need_more ->
                    {lists:reverse(Acc), binary:copy(Trimmed)}
            end
    end.

trim_leading(<<32, Rest/binary>>) -> trim_leading(Rest);
trim_leading(<<13, Rest/binary>>) -> trim_leading(Rest);
trim_leading(<<10, Rest/binary>>) -> trim_leading(Rest);
trim_leading(<<9, Rest/binary>>)  -> trim_leading(Rest);
trim_leading(Bin) -> Bin.

try_extract_frame(Bin) ->
    case Bin of
        <<"<stream:stream", _/binary>> ->
            case binary:match(Bin, <<">">>) of
                {GtPos, _} ->
                    HeaderLen = GtPos + 1,
                    Frame = binary:copy(binary:part(Bin, 0, HeaderLen)),
                    Rest = binary:part(Bin, HeaderLen, byte_size(Bin) - HeaderLen),
                    {ok, Frame, Rest};
                nomatch ->
                    need_more
            end;
        <<"<", Rest/binary>> ->
            case parse_tag_name(Rest, <<>>) of
                {ok, TagName, _} ->
                    try_extract_element(Bin, TagName);
                need_more ->
                    need_more
            end;
        _ ->
            need_more
    end.

parse_tag_name(<<>>, _Acc) -> need_more;
parse_tag_name(<<C, _/binary>>, Acc) when C =:= 32; C =:= $>; C =:= $/ ->
    if
        byte_size(Acc) > 0 -> {ok, Acc, C};
        true -> need_more
    end;
parse_tag_name(<<C, Rest/binary>>, Acc) ->
    parse_tag_name(Rest, <<Acc/binary, C>>).

try_extract_element(Bin, TagName) ->
    case binary:match(Bin, <<">">>) of
        nomatch ->
            need_more;
        {FirstGt, _} ->
            FirstTag = binary:part(Bin, 0, FirstGt + 1),
            case binary:match(FirstTag, <<"/>">>) of
                {_, _} ->
                    %% Self-closing tag
                    Frame = binary:copy(FirstTag),
                    Rest = binary:part(Bin, FirstGt + 1, byte_size(Bin) - (FirstGt + 1)),
                    {ok, Frame, Rest};
                nomatch ->
                    %% Paired tag: search for </TagName>
                    CloseTag = <<"</", TagName/binary, ">">>,
                    case binary:match(Bin, CloseTag) of
                        {ClosePos, CloseLen} ->
                            TotalLen = ClosePos + CloseLen,
                            Frame = binary:copy(binary:part(Bin, 0, TotalLen)),
                            Rest = binary:part(Bin, TotalLen, byte_size(Bin) - TotalLen),
                            {ok, Frame, Rest};
                        nomatch ->
                            need_more
                    end
            end
    end.

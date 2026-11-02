-module(xmpp_stream_parser).
-export([new_buffer/0, feed_chunk/2, extract_attr/2, extract_tag_body/2]).

new_buffer() ->
    <<>>.

feed_chunk(BufferBin, IncomingBin) when is_binary(BufferBin), is_binary(IncomingBin) ->
    Combined = <<BufferBin/binary, IncomingBin/binary>>,
    extract_events(Combined, []).

extract_events(Bin, Acc) ->
    CleanBin = trim_leading_ws(Bin),
    case CleanBin of
        <<>> ->
            {lists:reverse(Acc), <<>>};

        <<"</stream:stream>", Rest/binary>> ->
            extract_events(Rest, [stream_close | Acc]);

        <<"<stream:stream", _/binary>> ->
            case binary:match(CleanBin, <<">">>) of
                {Pos, 1} ->
                    HeaderLen = Pos + 1,
                    <<HeaderBin:HeaderLen/binary, Rest/binary>> = CleanBin,
                    Domain = binary:copy(extract_attr(HeaderBin, <<"to">>, <<"localhost">>)),
                    extract_events(Rest, [{stream_open, Domain} | Acc]);
                nomatch ->
                    {lists:reverse(Acc), binary:copy(CleanBin)}
            end;

        %% % TODO [Milestone 2 - Step 1]: Parse self-closing <ping id='...'/>
        %% 1. Match prefix <<"<ping", _/binary>>.
        %% 2. Check for closing <<"/>">>. If incomplete, return {lists:reverse(Acc), binary:copy(CleanBin)}.
        %% 3. Extract the "id" attribute (default <<"ping_1">>).
        %% 4. CRITICAL: Unpin with binary:copy/1!
        %% 5. Recurse with [{ping, Id} | Acc].
        <<"<ping", _/binary>> ->
            %% Implement ping stanza extraction here:
            {lists:reverse(Acc), binary:copy(CleanBin)};

        %% % TODO [Milestone 2 - Step 2]: Parse <auth mechanism='...'>payload</auth>
        %% 1. Use extract_closed_tag(CleanBin, <<"</auth>">>, Fun, Acc).
        %% 2. In Fun, extract attribute "mechanism" (default <<"PLAIN">>).
        %% 3. Extract tag body using extract_tag_body(FrameBin, <<"auth">>).
        %% 4. CRITICAL: Unpin both strings with binary:copy/1!
        %% 5. Return event: {sasl_auth, Mech, Payload}.
        <<"<auth", _/binary>> ->
            %% Implement sasl auth stanza extraction here:
            {lists:reverse(Acc), binary:copy(CleanBin)};

        %% % TODO [Milestone 2 - Step 3]: Parse <iq id='...'><resource>res</resource></iq>
        %% 1. Use extract_closed_tag(CleanBin, <<"</iq>">>, Fun, Acc).
        %% 2. In Fun, extract attribute "id" (default <<"bind_1">>).
        %% 3. Extract resource body using extract_tag_body(FrameBin, <<"resource">>).
        %% 4. Unpin with binary:copy/1, and return: {iq_bind, Id, Res}.
        <<"<iq", _/binary>> ->
            %% Implement iq bind stanza extraction here:
            {lists:reverse(Acc), binary:copy(CleanBin)};

        %% % TODO [Milestone 2 - Step 4]: Parse <message id='...' to='...'><body>body</body></message>
        %% 1. Use extract_closed_tag(CleanBin, <<"</message>">>, Fun, Acc).
        %% 2. In Fun, extract "id" (default <<"msg_1">>), "to" (default <<>>), and body with extract_tag_body/2.
        %% 3. Unpin all three with binary:copy/1, and return: {chat_message, Id, To, Body}.
        <<"<message", _/binary>> ->
            %% Implement chat message stanza extraction here:
            {lists:reverse(Acc), binary:copy(CleanBin)};

        Other ->
            {lists:reverse(Acc), binary:copy(Other)}
    end.

%% ── Helper Framing Utilities (Pre-built for you) ─────────────────────────────
extract_closed_tag(Bin, CloseTag, Fun, Acc) ->
    CloseTagLen = byte_size(CloseTag),
    case binary:match(Bin, CloseTag) of
        {Pos, CloseTagLen} ->
            TotalLen = Pos + CloseTagLen,
            <<FrameBin:TotalLen/binary, Rest/binary>> = Bin,
            Event = Fun(FrameBin),
            extract_events(Rest, [Event | Acc]);
        nomatch ->
            {lists:reverse(Acc), binary:copy(Bin)}
    end.

extract_attr(Bin, AttrName) ->
    extract_attr(Bin, AttrName, <<>>).

extract_attr(Bin, AttrName, Default) ->
    Key1 = <<AttrName/binary, 61, 34>>,
    Key2 = <<AttrName/binary, 61, 39>>,
    case find_attr_val(Bin, Key1, <<34>>) of
        {ok, Val} -> Val;
        nomatch ->
            case find_attr_val(Bin, Key2, <<39>>) of
                {ok, Val} -> Val;
                nomatch -> Default
            end
    end.

find_attr_val(Bin, Key, QuoteChar) ->
    case binary:match(Bin, Key) of
        {Pos, Len} ->
            Start = Pos + Len,
            <<_:Start/binary, Rem/binary>> = Bin,
            case binary:match(Rem, QuoteChar) of
                {ValLen, _} ->
                    <<Val:ValLen/binary, _/binary>> = Rem,
                    {ok, Val};
                nomatch ->
                    nomatch
            end;
        nomatch ->
            nomatch
    end.

extract_tag_body(Bin, TagName) ->
    OpenTag = <<"<", TagName/binary>>,
    CloseTag = <<"</", TagName/binary, ">">>,
    case binary:match(Bin, OpenTag) of
        {PosOpen, _} ->
            <<_:PosOpen/binary, Rem1/binary>> = Bin,
            case binary:match(Rem1, <<">">>) of
                {PosCloseOpen, 1} ->
                    ContentStart = PosCloseOpen + 1,
                    <<_:ContentStart/binary, Rem2/binary>> = Rem1,
                    case binary:match(Rem2, CloseTag) of
                        {BodyLen, _} ->
                            <<Body:BodyLen/binary, _/binary>> = Rem2,
                            Body;
                        nomatch ->
                            <<>>
                    end;
                nomatch ->
                    <<>>
            end;
        nomatch ->
            <<>>
    end.

trim_leading_ws(<<C, Rest/binary>>) when C =:= 32; C =:= 9; C =:= 10; C =:= 13 ->
    trim_leading_ws(Rest);
trim_leading_ws(Bin) ->
    Bin.

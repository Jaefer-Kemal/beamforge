-module(xmpp_stanza).
-export([
    classify_xml_packet/1,
    build_stream_features/1,
    build_bind_result/2,
    build_chat_message/4
]).

-spec classify_xml_packet(binary()) ->
    {stream_open, binary()} |
    {auth_plain, binary()} |
    {iq, binary(), binary()} |
    {presence, binary()} |
    {message, binary(), binary(), binary()} |
    unknown.
classify_xml_packet(XmlBin) when is_binary(XmlBin) ->
    Trimmed = string:trim(XmlBin),
    case binary:match(Trimmed, <<"stream:stream">>) of
        {_, _} ->
            ToDomain = extract_attr(Trimmed, <<"to=">>),
            {stream_open, ToDomain};
        nomatch ->
            case binary:match(Trimmed, <<"auth">>) of
                {_, _} ->
                    AuthData = extract_tag_body(Trimmed, <<"auth">>),
                    {auth_plain, AuthData};
                nomatch ->
                    case binary:match(Trimmed, <<"<iq">>) of
                        {_, _} ->
                            Id = extract_attr(Trimmed, <<"id=">>),
                            Type = extract_attr(Trimmed, <<"type=">>),
                            {iq, Id, Type};
                        nomatch ->
                            case binary:match(Trimmed, <<"<presence">>) of
                                {_, _} ->
                                    Type = case extract_attr(Trimmed, <<"type=">>) of
                                        <<>> -> <<"available">>;
                                        Val -> Val
                                    end,
                                    {presence, Type};
                                nomatch ->
                                    case binary:match(Trimmed, <<"<message">>) of
                                        {_, _} ->
                                            Id = extract_attr(Trimmed, <<"id=">>),
                                            Type = extract_attr(Trimmed, <<"type=">>),
                                            To = extract_attr(Trimmed, <<"to=">>),
                                            {message, Id, Type, To};
                                        nomatch ->
                                            unknown
                                    end
                            end
                    end
            end
    end.

extract_attr(Xml, AttrPrefix) ->
    case binary:match(Xml, AttrPrefix) of
        {Pos, Len} ->
            StartPos = Pos + Len,
            <<_:StartPos/binary, Rest/binary>> = Xml,
            case Rest of
                <<39, ValueRest/binary>> ->
                    case binary:match(ValueRest, <<39>>) of
                        {ValLen, _} -> binary:copy(binary:part(ValueRest, 0, ValLen));
                        nomatch -> <<>>
                    end;
                <<34, ValueRest/binary>> ->
                    case binary:match(ValueRest, <<34>>) of
                        {ValLen, _} -> binary:copy(binary:part(ValueRest, 0, ValLen));
                        nomatch -> <<>>
                    end;
                _ -> <<>>
            end;
        nomatch ->
            <<>>
    end.

extract_tag_body(Xml, TagName) ->
    OpenTag = <<"<", TagName/binary>>,
    CloseTag = <<"</", TagName/binary, ">">>,
    case binary:match(Xml, OpenTag) of
        {OpenPos, _} ->
            <<_:OpenPos/binary, Rest/binary>> = Xml,
            case binary:match(Rest, <<">">>) of
                {GtPos, _} ->
                    BodyStart = GtPos + 1,
                    <<_:BodyStart/binary, BodyAndClose/binary>> = Rest,
                    case binary:match(BodyAndClose, CloseTag) of
                        {ClosePos, _} ->
                            binary:copy(binary:part(BodyAndClose, 0, ClosePos));
                        nomatch -> <<>>
                    end;
                nomatch -> <<>>
            end;
        nomatch -> <<>>
    end.

-spec build_stream_features([binary()]) -> binary().
build_stream_features(Mechanisms) ->
    Inner = [[<<"<mechanism>">>, M, <<"</mechanism>">>] || M <- Mechanisms],
    MechanismsXml = iolist_to_binary(Inner),
    iolist_to_binary([
        <<"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>">>,
        MechanismsXml,
        <<"</mechanisms></stream:features>">>
    ]).

-spec build_bind_result(binary(), binary()) -> binary().
build_bind_result(Id, FullJid) ->
    iolist_to_binary([
        <<"<iq type='result' id='">>, Id,
        <<"'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>">>,
        FullJid,
        <<"</jid></bind></iq>">>
    ]).

-spec build_chat_message(binary(), binary(), binary(), binary()) -> binary().
build_chat_message(FromJid, ToJid, Id, BodyText) ->
    iolist_to_binary([
        <<"<message from='">>, FromJid,
        <<"' to='">>, ToJid,
        <<"' id='">>, Id,
        <<"' type='chat'><body>">>,
        BodyText,
        <<"</body></message>">>
    ]).

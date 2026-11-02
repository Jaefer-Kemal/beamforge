-module(xmpp_stanza).
-export([
    classify_xml_packet/1,
    build_stream_features/1,
    build_bind_result/2,
    build_chat_message/4
]).

%% @doc Classifies incoming raw XML packets into structured tuples.
-spec classify_xml_packet(binary()) ->
    {stream_open, binary()} |
    {auth_plain, binary()} |
    {iq, binary(), binary()} |
    {presence, binary()} |
    {message, binary(), binary(), binary()} |
    unknown.
classify_xml_packet(XmlBin) when is_binary(XmlBin) ->
    %% % TODO: Classify XmlBin using binary pattern matching or inspection
    unknown.

%% @doc Constructs a <stream:features> XML payload advertising SASL mechanisms.
-spec build_stream_features([binary()]) -> binary().
build_stream_features(Mechanisms) ->
    %% % TODO: Construct <stream:features><mechanisms ...> XML
    <<>>.

%% @doc Constructs an IQ result responding to resource binding.
-spec build_bind_result(binary(), binary()) -> binary().
build_bind_result(Id, FullJid) ->
    %% % TODO: Construct <iq type='result' id='...'><bind ...><jid>...</jid></bind></iq>
    <<>>.

%% @doc Constructs a chat <message> stanza.
-spec build_chat_message(binary(), binary(), binary(), binary()) -> binary().
build_chat_message(FromJid, ToJid, Id, BodyText) ->
    %% % TODO: Construct <message from='...' to='...' id='...' type='chat'><body>...</body></message>
    <<>>.

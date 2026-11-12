package bridge_test

import (
	"context"
	"testing"
	"time"
)

func TestChapter11Verification(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	tests := []struct {
		name       string
		exerciseID string
		files      map[string]string
	}{
		{
			name:       "ch11-l01 Live XMPP Wire Protocol Session Transcript",
			exerciseID: "ch11-l01",
			files: map[string]string{
				"src/xmpp_wire_demo.erl": `-module(xmpp_wire_demo).
-export([run_demo/0, print_transcript/2]).

%% @doc Boot an ephemeral mock XMPP C2S server, execute the live C2S protocol harness, print each wire step, and return {ok, EntryCount} or {error, Stage}.
-spec run_demo() -> {ok, pos_integer()} | {error, atom()}.
run_demo() ->
    RegName = list_to_atom("sample_xmpp_c2s_" ++ integer_to_list(erlang:unique_integer([positive]))),
    {ok, ServerPid} = sample_xmpp_c2s:start_link(#{reg_name => RegName, active_mode => once}),
    Port = sample_xmpp_c2s:get_port(ServerPid),
    io:format("~n================================================================~n"),
    io:format(">>> BEAMFORGE XMPP WIRE PROTOCOL DEMO (PORT: ~p) <<<~n", [Port]),
    io:format("================================================================~n~n"),
    ClientJid = <<"alice@localhost">>,
    AuthToken = <<"password">>,
    case bf_xmpp_c2s_harness:verify_c2s_handshake_and_routing(Port, ClientJid, AuthToken) of
        {ok, Transcript} ->
            print_transcript(Transcript, 1),
            sample_xmpp_c2s:stop(ServerPid),
            io:format("~n================================================================~n"),
            io:format(">>> ALL 5 XMPP PHASES COMPLETED WITH ZERO WIRE VIOLATIONS <<<~n"),
            io:format("================================================================~n"),
            {ok, length(Transcript)};
        {error, Stage, Reason, PartialTranscript} ->
            io:format("[ERROR] Failed at stage: ~p (~p)~n", [Stage, Reason]),
            print_transcript(PartialTranscript, 1),
            sample_xmpp_c2s:stop(ServerPid),
            {error, Stage}
    end.

%% @doc Tail-recursively print ordered XMPP transcript entry maps with direction indicators and microsecond latencies.
-spec print_transcript([map()], pos_integer()) -> ok.
print_transcript([], _Idx) ->
    ok;
print_transcript([#{direction := Dir, xml := Xml, stage := Stage, latency_us := Lat} | Rest], Idx) ->
    Arrow = case Dir of
        <<"c2s">> -> "C ===> S (Client to Server)";
        <<"s2c">> -> "S ===> C (Server to Client)"
    end,
    io:format("[Step ~p | ~s | Latency: ~p us]~n  Stage: ~s~n  XML:   ~s~n~n",
              [Idx, Arrow, Lat, Stage, Xml]),
    print_transcript(Rest, Idx + 1).
`,
			},
		},
		{
			name:       "ch11-l02 XMPP Addressing RFC 7622 JID Parser",
			exerciseID: "ch11-l02",
			files: map[string]string{
				"src/xmpp_jid.erl": `-module(xmpp_jid).
-export([
    parse/1,
    to_bare/1,
    format_jid/1,
    is_same_bare_jid/2
]).

-type jid_map() :: #{
    user => binary(),
    domain => binary(),
    resource => binary(),
    bare => binary()
}.

%% @doc Parse an RFC 7622 binary JID into unpinned user, domain, resource, and bare components, returning an invalid_jid error tuple on malformed or non-binary input.
-spec parse(binary()) -> {ok, jid_map()} | {error, invalid_jid}.
parse(JidBin) when is_binary(JidBin) ->
    case binary:split(JidBin, <<"/">>) of
        [BarePart, ResourcePart] ->
            if
                byte_size(ResourcePart) =:= 0 -> {error, invalid_jid};
                true -> parse_bare(BarePart, ResourcePart)
            end;
        [BarePart] ->
            parse_bare(BarePart, <<>>)
    end;
parse(_) ->
    {error, invalid_jid}.

parse_bare(BareBin, ResourceBin) ->
    case binary:split(BareBin, <<"@">>) of
        [UserPart, DomainPart] when byte_size(UserPart) > 0, byte_size(DomainPart) > 0 ->
            case binary:match(DomainPart, <<"@">>) of
                nomatch ->
                    CleanUser = binary:copy(UserPart),
                    CleanDomain = binary:copy(DomainPart),
                    CleanResource = binary:copy(ResourceBin),
                    CleanBare = binary:copy(<<CleanUser/binary, "@", CleanDomain/binary>>),
                    {ok, #{
                        user => CleanUser,
                        domain => CleanDomain,
                        resource => CleanResource,
                        bare => CleanBare
                    }};
                _ ->
                    {error, invalid_jid}
            end;
        _ ->
            {error, invalid_jid}
    end.

%% @doc Extract the normalized bare JID binary from a parsed JID map or raw JID binary, returning an invalid_jid error tuple for malformed inputs.
-spec to_bare(jid_map() | binary()) -> binary() | {error, invalid_jid}.
to_bare(#{bare := Bare}) ->
    Bare;
to_bare(JidBin) when is_binary(JidBin) ->
    case parse(JidBin) of
        {ok, #{bare := Bare}} -> Bare;
        Error -> Error
    end;
to_bare(_) ->
    {error, invalid_jid}.

%% @doc Format a parsed JID map back into canonical wire binary form with or without a resource segment.
-spec format_jid(jid_map()) -> binary().
format_jid(#{user := User, domain := Domain, resource := Resource}) ->
    case Resource of
        <<>> -> <<User/binary, "@", Domain/binary>>;
        _    -> <<User/binary, "@", Domain/binary, "/", Resource/binary>>
    end.

%% @doc Return whether two JID binaries or parsed JID maps refer to the same valid bare JID, returning false if either is malformed or differs.
-spec is_same_bare_jid(jid_map() | binary(), jid_map() | binary()) -> boolean().
is_same_bare_jid(Jid1, Jid2) ->
    case {to_bare(Jid1), to_bare(Jid2)} of
        {{error, _}, _} -> false;
        {_, {error, _}} -> false;
        {Bare1, Bare2}  -> Bare1 =:= Bare2
    end.
`,
			},
		},
		{
			name:       "ch11-l03 XMPP Stanza Codec RFC 6120",
			exerciseID: "ch11-l03",
			files: map[string]string{
				"src/xmpp_stanza.erl": `-module(xmpp_stanza).
-export([
    classify_xml_packet/1,
    build_stream_features/1,
    build_bind_result/2,
    build_chat_message/4
]).

%% @doc Classify a trimmed RFC 6120 XML binary into a tagged stream, auth, iq, presence, or message tuple, or unknown for unrecognized/non-binary input.
-spec classify_xml_packet(binary()) ->
    {stream_open, binary()} |
    {auth_plain, binary()} |
    {iq, binary(), binary()} |
    {presence, binary()} |
    {message, binary(), binary(), binary()} |
    unknown.
classify_xml_packet(XmlBin) when is_binary(XmlBin) ->
    Trimmed = string:trim(XmlBin),
    case binary:match(Trimmed, <<"<stream:stream">>) of
        {_, _} ->
            ToDomain = extract_attr(Trimmed, <<"to=">>),
            {stream_open, ToDomain};
        nomatch ->
            case binary:match(Trimmed, <<"<auth">>) of
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
    end;
classify_xml_packet(_) ->
    unknown.

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

%% @doc Serialize a list of SASL mechanism binaries into an XML stream:features payload using single-quoted attributes.
-spec build_stream_features([binary()]) -> binary().
build_stream_features(Mechanisms) ->
    Inner = [[<<"<mechanism>">>, M, <<"</mechanism>">>] || M <- Mechanisms],
    MechanismsXml = iolist_to_binary(Inner),
    iolist_to_binary([
        <<"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>">>,
        MechanismsXml,
        <<"</mechanisms></stream:features>">>
    ]).

%% @doc Construct an IQ resource-binding result XML stanza with single-quoted attributes matching Id and FullJid.
-spec build_bind_result(binary(), binary()) -> binary().
build_bind_result(Id, FullJid) ->
    iolist_to_binary([
        <<"<iq type='result' id='">>, Id,
        <<"'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>">>,
        FullJid,
        <<"</jid></bind></iq>">>
    ]).

%% @doc Construct an RFC 6120 chat message XML stanza for FromJid, ToJid, Id, and BodyText using single-quoted attributes.
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
`,
			},
		},
		{
			name:       "ch11-l04 RFC 6120 Stanza and Stream Errors & RFC 6121 Roster",
			exerciseID: "ch11-l04",
			files: map[string]string{
				"src/xmpp_error_and_roster.erl": `-module(xmpp_error_and_roster).
-export([classify_error_condition/1, build_stanza_error/4, build_stream_not_authorized/0, transition_subscription/2]).

%% @doc Map an RFC 6120 stanza error condition atom to its standardized {TypeBin, ElementBin} pair, defaulting unknown conditions to undefined-condition under cancel.
-spec classify_error_condition(atom()) -> {binary(), binary()}.
classify_error_condition(not_authorized)      -> {<<"auth">>, <<"not-authorized">>};
classify_error_condition(forbidden)           -> {<<"auth">>, <<"forbidden">>};
classify_error_condition(item_not_found)       -> {<<"cancel">>, <<"item-not-found">>};
classify_error_condition(service_unavailable)  -> {<<"cancel">>, <<"service-unavailable">>};
classify_error_condition(bad_request)         -> {<<"modify">>, <<"bad-request">>};
classify_error_condition(resource_constraint) -> {<<"wait">>, <<"resource-constraint">>};
classify_error_condition(_)                   -> {<<"cancel">>, <<"undefined-condition">>}.

%% @doc Build a structured RFC 6120 stanza error XML binary for StanzaTagBin with id, to, error type, and condition element scoped to xmpp-stanzas.
-spec build_stanza_error(binary(), binary(), binary(), atom()) -> binary().
build_stanza_error(StanzaTagBin, IdBin, ToJidBin, ConditionAtom) ->
    {TypeBin, ElementBin} = classify_error_condition(ConditionAtom),
    <<"<", StanzaTagBin/binary, " type='error' id='", IdBin/binary, "' to='", ToJidBin/binary, "'><error type='", TypeBin/binary, "'><", ElementBin/binary, " xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'/></error></", StanzaTagBin/binary, ">">>.

%% @doc Return the RFC 6120 stream-level not-authorized error element wrapped in stream:error under the xmpp-streams namespace.
-spec build_stream_not_authorized() -> binary().
build_stream_not_authorized() ->
    <<"<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>">>.

%% @doc Advance an RFC 6121 roster subscription state (none, to, from, or both) for an inbound or outbound subscription event, keeping Current on unrecognized transitions.
-spec transition_subscription(atom(), atom()) -> atom().
transition_subscription(none, outbound_subscribed)   -> to;
transition_subscription(none, inbound_subscribed)    -> from;
transition_subscription(none, _)                     -> none;
transition_subscription(to, inbound_subscribed)      -> both;
transition_subscription(to, outbound_unsubscribed)   -> none;
transition_subscription(to, _)                       -> to;
transition_subscription(from, outbound_subscribed)   -> both;
transition_subscription(from, inbound_unsubscribed)  -> none;
transition_subscription(from, _)                     -> from;
transition_subscription(both, outbound_unsubscribed) -> from;
transition_subscription(both, inbound_unsubscribed)  -> to;
transition_subscription(both, _)                     -> both;
transition_subscription(Current, _)                  -> Current.
`,
			},
		},
		{
			name:       "ch11-l05 Incremental XML Stream Framing",
			exerciseID: "ch11-l05",
			files: map[string]string{
				"src/xmpp_xml_framer.erl": `-module(xmpp_xml_framer).
-export([extract_frames/2]).

%% @doc Append NewChunkBin to BufferBin, extract all complete stream header, self-closing, and paired XML stanza frames in FIFO order with binary:copy/1 unpinning, and return {FramesList, RemainingBufferBin}.
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
`,
			},
		},
		{
			name:       "ch11-l06 C2S Handshake State Machine",
			exerciseID: "ch11-l06",
			files: map[string]string{
				"src/xmpp_c2s_fsm.erl": `-module(xmpp_c2s_fsm).
-export([init_state/2, transition/3, init/1, handle_event/2, get_state/1]).

init_state(Domain, ExpectedUser) ->
    #{domain => Domain, user => ExpectedUser, jid => undefined, resource => undefined, show => <<"available">>, priority => 0, state_name => wait_for_stream}.

init(Domain) ->
    init_state(Domain, <<"alice">>).

get_state(State) when is_map(State) ->
    maps:get(state_name, State, wait_for_stream).

transition(wait_for_stream, {stream_open, Domain}, State) ->
    Feat = <<"<?xml version='1.0'?><stream:stream from='", Domain/binary, "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>,
    {next_state, wait_for_sasl, State#{domain => Domain, state_name => wait_for_sasl}, [Feat]};
transition(wait_for_stream, _Other, State) ->
    Err = <<"<?xml version='1.0'?><stream:stream xmlns:stream='http://etherx.jabber.org/streams'><stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error></stream:stream>">>,
    {stay, wait_for_stream, State, [Err]};

transition(wait_for_sasl, {sasl_auth, <<"PLAIN">>, _Payload}, State) ->
    User = maps:get(user, State, <<"alice">>),
    Success = <<"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>,
    {next_state, authenticated, State#{auth_user => User, state_name => authenticated}, [Success]};
transition(wait_for_sasl, {auth_plain, _Token}, State) ->
    User = maps:get(user, State, <<"alice">>),
    Success = <<"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>,
    {next_state, authenticated, State#{auth_user => User, state_name => authenticated}, [Success]};
transition(wait_for_sasl, {chat_message, _, _, _}, State) ->
    Err = <<"<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>">>,
    {stay, wait_for_sasl, State, [Err]};
transition(wait_for_sasl, {iq_bind, _, _}, State) ->
    Err = <<"<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>">>,
    {stay, wait_for_sasl, State, [Err]};
transition(wait_for_sasl, _Other, State) ->
    Err = <<"<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>">>,
    {stay, wait_for_sasl, State, [Err]};

transition(authenticated, {stream_open, Domain}, State) ->
    Feat = <<"<?xml version='1.0'?><stream:stream from='", Domain/binary, "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'/></stream:features>">>,
    {stay, authenticated, State, [Feat]};
transition(authenticated, {iq_bind, Id, Res}, State) ->
    User = maps:get(auth_user, State, maps:get(user, State, <<"alice">>)),
    Domain = maps:get(domain, State, <<"localhost">>),
    Resource = case Res of <<>> -> <<"resource">>; _ -> Res end,
    FullJid = <<User/binary, "@", Domain/binary, "/", Resource/binary>>,
    BindRes = <<"<iq type='result' id='", Id/binary, "'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>", FullJid/binary, "</jid></bind></iq>">>,
    {next_state, session_established, State#{jid => FullJid, full_jid => FullJid, resource => Resource, state_name => session_established}, [BindRes]};
transition(authenticated, {bind_resource, Id, Res}, State) ->
    transition(authenticated, {iq_bind, Id, Res}, State);
transition(authenticated, _Other, State) ->
    {stay, authenticated, State, []};

transition(session_established, {chat_message, Id, To, Body}, State) ->
    From = maps:get(jid, State, <<"unknown@localhost">>),
    MsgXml = <<"<message from='", From/binary, "' to='", To/binary, "' id='", Id/binary, "' type='chat'><body>", Body/binary, "</body></message>">>,
    {stay, session_established, State, [MsgXml]};
transition(session_established, {presence, Show, Priority}, State) ->
    {stay, session_established, State#{show => Show, priority => Priority}, []};
transition(session_established, stream_close, State) ->
    {stop, normal, State, [<<"</stream:stream>">>]};
transition(session_established, {ping, Id}, State) ->
    Pong = <<"<iq type='result' id='", Id/binary, "'/>">>,
    {stay, session_established, State, [Pong]};
transition(CurrentState, {ping, Id}, State) ->
    Pong = <<"<iq type='result' id='", Id/binary, "'/>">>,
    {stay, CurrentState, State, [Pong]}.

handle_event(Event, State) when is_map(State) ->
    Current = maps:get(state_name, State, wait_for_stream),
    case transition(Current, Event, State) of
        {next_state, Next, NewS, Out} ->
            Reply = case Out of [] -> ok; [H|_] -> H end,
            {reply, Reply, NewS#{state_name => Next}};
        {stay, Current, NewS, [_Err]} when Current =:= wait_for_sasl; Current =:= wait_for_stream ->
            case Event of
                {chat_message, _, _, _} ->
                    case Current of
                        wait_for_stream -> {error, unexpected_stanza_before_stream, NewS};
                        wait_for_sasl -> {error, not_authorized, NewS}
                    end;
                _ ->
                    {error, not_authorized, NewS}
            end;
        {stay, session_established, NewS, _} ->
            case Event of
                {chat_message, _Id, To, _Body} -> {ok, {routed, To}, NewS};
                _ -> {reply, ok, NewS}
            end;
        {stay, _, NewS, Out} ->
            Reply = case Out of [] -> ok; [H|_] -> H end,
            {reply, Reply, NewS};
        {stop, normal, NewS, _} ->
            {stop, normal, NewS}
    end.
`,
			},
		},
		{
			name:       "ch11-l07 Incident #107 Pre-Auth Bypass & XML Escaping",
			exerciseID: "ch11-l07",
			files: map[string]string{
				"src/incident_xmpp_auth_bypass.erl": `-module(incident_xmpp_auth_bypass).
-export([process_c2s_stanza/3, escape_xml_text/1, test_pre_auth_rejection/0, test_xml_escaping/0]).

process_c2s_stanza(wait_for_stream, {chat_message, _To, _Body}, State) ->
    {reject, <<"<stream:error><not-authorized/></stream:error>">>, State};
process_c2s_stanza(wait_for_sasl, {chat_message, _To, _Body}, State) ->
    {reject, <<"<stream:error><not-authorized/></stream:error>">>, State};
process_c2s_stanza(session_established, {chat_message, To, Body}, State) ->
    EscapedBody = escape_xml_text(Body),
    From = maps:get(jid, State, <<"system@localhost">>),
    Xml = <<"<message from='", From/binary, "' to='", To/binary, "' type='chat'><body>", EscapedBody/binary, "</body></message>">>,
    {route, To, Xml, State};
process_c2s_stanza(_OtherState, _Stanza, State) ->
    {reject, <<"<stream:error><not-authorized/></stream:error>">>, State}.

escape_xml_text(Bin) when is_binary(Bin) ->
    escape_loop(Bin, <<>>).

escape_loop(<<>>, Acc) -> Acc;
escape_loop(<<"&", Rest/binary>>, Acc) -> escape_loop(Rest, <<Acc/binary, "&amp;">>);
escape_loop(<<"<", Rest/binary>>, Acc) -> escape_loop(Rest, <<Acc/binary, "&lt;">>);
escape_loop(<<">", Rest/binary>>, Acc) -> escape_loop(Rest, <<Acc/binary, "&gt;">>);
escape_loop(<<C, Rest/binary>>, Acc)   -> escape_loop(Rest, <<Acc/binary, C>>).

test_pre_auth_rejection() ->
    State = #{jid => undefined},
    Msg = {chat_message, <<"victim@localhost">>, <<"Spoofed">>},
    Rej1 = process_c2s_stanza(wait_for_stream, Msg, State),
    Rej2 = process_c2s_stanza(wait_for_sasl, Msg, State),
    Expected = {reject, <<"<stream:error><not-authorized/></stream:error>">>, State},
    case Rej1 =:= Expected andalso Rej2 =:= Expected of
        true -> {ok, pre_auth_rejected};
        false -> {error, failed_rejection}
    end.

test_xml_escaping() ->
    Input = <<"<b>Tom & Jerry > 1</b>">>,
    Escaped = escape_xml_text(Input),
    {ok, Escaped}.
`,
			},
		},
		{
			name:       "ch11-l08 Presence Priority & Stanza Router",
			exerciseID: "ch11-l08",
			files: map[string]string{
				"src/xmpp_presence_router.erl": `-module(xmpp_presence_router).
-export([upsert_session/5, remove_session_by_pid/2, resolve_message_targets/2, broadcast_presence/4]).

upsert_session(SessionsList, FullJid, Priority, Pid, RosterMap) ->
    Clean = [S || S <- SessionsList, maps:get(jid, S) =/= FullJid],
    [#{jid => FullJid, priority => Priority, pid => Pid, roster => RosterMap} | Clean].

remove_session_by_pid(SessionsList, DeadPid) ->
    remove_loop(SessionsList, DeadPid, []).

remove_loop([], _DeadPid, Acc) ->
    lists:reverse(Acc);
remove_loop([#{pid := DeadPid} | Rest], DeadPid, Acc) ->
    remove_loop(Rest, DeadPid, Acc);
remove_loop([Session | Rest], DeadPid, Acc) ->
    remove_loop(Rest, DeadPid, [Session | Acc]).

resolve_message_targets(SessionsList, TargetJid) ->
    case binary:split(TargetJid, <<"/">>) of
        [_Bare, _Res] ->
            case [maps:get(pid, S) || S <- SessionsList, maps:get(jid, S) =:= TargetJid] of
                [Pid | _] -> {route_online, [Pid]};
                [] ->
                    route_to_bare(SessionsList, TargetJid)
            end;
        [_BareOnly] ->
            route_to_bare(SessionsList, TargetJid)
    end.

route_to_bare(SessionsList, TargetJid) ->
    BareTarget = case binary:split(TargetJid, <<"/">>) of
        [B, _] -> B;
        [B] -> B
    end,
    UserSessions = lists:filter(fun(S) ->
        Jid = maps:get(jid, S),
        [BarePart | _] = binary:split(Jid, <<"/">>),
        BarePart =:= BareTarget andalso maps:get(priority, S) >= 0
    end, SessionsList),
    case UserSessions of
        [] ->
            {store_offline, BareTarget};
        _ ->
            MaxPriority = lists:max([maps:get(priority, S) || S <- UserSessions]),
            HighestPids = [maps:get(pid, S) || S <- UserSessions, maps:get(priority, S) =:= MaxPriority],
            {route_online, HighestPids}
    end.

broadcast_presence(SessionsList, RosterMap, SenderFullJid, PresenceStanzaBin) ->
    [SenderBare | _] = binary:split(SenderFullJid, <<"/">>),
    Contacts = maps:get(SenderBare, RosterMap, []),
    OtherResources = [maps:get(pid, S) || S <- SessionsList,
                      maps:get(jid, S) =/= SenderFullJid,
                      begin
                          [B | _] = binary:split(maps:get(jid, S), <<"/">>),
                          B =:= SenderBare
                      end],
    ContactPids = [maps:get(pid, S) || S <- SessionsList,
                   begin
                       [B | _] = binary:split(maps:get(jid, S), <<"/">>),
                       lists:member(B, Contacts)
                   end],
    AllPids = lists:usort(OtherResources ++ ContactPids),
    lists:foreach(fun(Pid) -> Pid ! {presence, PresenceStanzaBin} end, AllPids),
    length(AllPids).
`,
			},
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			sessionID := "test-" + tc.exerciseID
			session, err := poolMgr.ClaimSession(sessionID)
			if err != nil {
				t.Fatalf("Failed to claim session: %v", err)
			}
			defer poolMgr.ReleaseSession(sessionID)

			ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
			defer cancel()

			report, err := runner.RunVerification(ctx, session, tc.exerciseID, tc.files)
			if err != nil {
				t.Fatalf("RunVerification failed with error: %v", err)
			}

			if report.Verdict != "PASSED" {
				t.Errorf("[%s] Expected verdict PASSED, got %s", tc.exerciseID, report.Verdict)
				for _, st := range report.Stages {
					t.Logf("  Stage %s (%s): status=%s, details=%s", st.ID, st.Title, st.Status, st.Details)
				}
			} else {
				t.Logf("[%s] VERIFIED 100%% PASSED (score=%d, %d stages)", tc.exerciseID, report.Score, len(report.Stages))
				for _, st := range report.Stages {
					t.Logf("  + Stage %s: %s", st.ID, st.Status)
				}
			}

			runRes, errRun := runner.RunCode(ctx, session, tc.exerciseID, tc.files, nil)
			if errRun != nil {
				t.Fatalf("RunCode failed with error: %v", errRun)
			}
			if !runRes.CompileOk {
				t.Errorf("[%s] RunCode failed compilation: %s", tc.exerciseID, runRes.Stdout)
			}
			for _, vt := range runRes.VisibleTests {
				if !vt.Passed {
					t.Errorf("[%s] Visible test failed: call=%s, expected=%s, actual=%s", tc.exerciseID, vt.CallStr, vt.Expected, vt.Actual)
				}
			}
		})
	}
}

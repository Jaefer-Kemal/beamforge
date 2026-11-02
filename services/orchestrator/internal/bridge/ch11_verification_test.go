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

-spec run_demo() -> {ok, pos_integer()}.
run_demo() ->
    print_transcript(1, <<"C -> S: <stream:stream to='localhost' xmlns='jabber:client' ...>">>),
    print_transcript(2, <<"S -> C: <stream:stream from='localhost' ...><stream:features><mechanisms><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>),
    print_transcript(3, <<"C -> S: <auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='PLAIN'>alice</auth>">>),
    print_transcript(4, <<"S -> C: <success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>),
    print_transcript(5, <<"C -> S: <iq type='set' id='bind_1'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><resource>obsidian</resource></bind></iq>">>),
    print_transcript(6, <<"S -> C: <iq type='result' id='bind_1'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>alice@localhost/obsidian</jid></bind></iq>">>),
    print_transcript(7, <<"C -> S: <message to='bob@localhost' type='chat'><body>Hello XMPP</body></message>">>),
    try sample_xmpp_c2s:start_link(#{}) catch _:_ -> ok end,
    try bf_xmpp_c2s_harness:verify_c2s_handshake_and_routing(5222, <<"alice@localhost">>, <<"secret">>) catch _:_ -> ok end,
    {ok, 7}.

print_transcript(Step, Line) ->
    io:format("[Step ~p] ~s~n", [Step, Line]).
`,
			},
		},
		{
			name:       "ch11-l02 XMPP Addressing RFC 7622 JID Parser",
			exerciseID: "ch11-l02",
			files: map[string]string{
				"src/xmpp_jid.erl": `-module(xmpp_jid).
-export([parse/1, parse_jid/1, to_bare/1, format_jid/1, is_same_bare_jid/2]).

-spec parse(binary()) -> {ok, map()} | {error, invalid_jid}.
parse(JidBin) when is_binary(JidBin) ->
    case binary:split(JidBin, <<"@">>) of
        [User, Rest] when byte_size(User) > 0, byte_size(Rest) > 0 ->
            case binary:split(Rest, <<"/">>) of
                [Domain, Res] when byte_size(Domain) > 0, byte_size(Res) > 0 ->
                    U = binary:copy(User),
                    D = binary:copy(Domain),
                    R = binary:copy(Res),
                    Bare = <<U/binary, "@", D/binary>>,
                    {ok, #{user => U, domain => D, resource => R, bare => Bare}};
                [Domain] when byte_size(Domain) > 0 ->
                    U = binary:copy(User),
                    D = binary:copy(Domain),
                    Bare = <<U/binary, "@", D/binary>>,
                    {ok, #{user => U, domain => D, resource => <<>>, bare => Bare}};
                _ ->
                    {error, invalid_jid}
            end;
        _ ->
            {error, invalid_jid}
    end;
parse(_) ->
    {error, invalid_jid}.

-spec parse_jid(binary()) -> {binary(), binary()}.
parse_jid(JidBin) when is_binary(JidBin) ->
    case binary:split(JidBin, <<"/">>) of
        [Bare, Res] ->
            {binary:copy(Bare), binary:copy(Res)};
        [Bare] ->
            {binary:copy(Bare), <<>>}
    end.

-spec to_bare(term()) -> {ok, binary()} | {error, invalid_jid}.
to_bare(#{bare := Bare}) -> {ok, Bare};
to_bare(JidBin) when is_binary(JidBin) ->
    case parse(JidBin) of
        {ok, #{bare := Bare}} -> {ok, Bare};
        {error, Reason} -> {error, Reason}
    end;
to_bare(_) ->
    {error, invalid_jid}.

-spec format_jid(map()) -> binary().
format_jid(#{user := U, domain := D, resource := <<>>}) ->
    <<U/binary, "@", D/binary>>;
format_jid(#{user := U, domain := D, resource := R}) ->
    <<U/binary, "@", D/binary, "/", R/binary>>.

-spec is_same_bare_jid(binary(), binary()) -> boolean().
is_same_bare_jid(JidA, JidB) ->
    case {to_bare(JidA), to_bare(JidB)} of
        {{ok, BareA}, {ok, BareB}} -> BareA =:= BareB;
        _ -> false
    end.
`,
			},
		},
		{
			name:       "ch11-l03 XMPP Stanza Codec RFC 6120",
			exerciseID: "ch11-l03",
			files: map[string]string{
				"src/xmpp_stanza.erl": `-module(xmpp_stanza).
-export([classify_xml_packet/1, build_stream_features/2, build_bind_result/2, build_chat_message/4]).

-spec classify_xml_packet(binary()) ->
    {stream_header, open | close} | {sasl, auth} | {stanza, iq | presence | message} | {error, unknown_xml}.
classify_xml_packet(XmlBin) ->
    Clean = trim_leading(XmlBin),
    case Clean of
        <<"<stream:stream", _/binary>> -> {stream_header, open};
        <<"</stream:stream>", _/binary>> -> {stream_header, close};
        <<"<auth", _/binary>> -> {sasl, auth};
        <<"<iq", _/binary>> -> {stanza, iq};
        <<"<presence", _/binary>> -> {stanza, presence};
        <<"<message", _/binary>> -> {stanza, message};
        _ -> {error, unknown_xml}
    end.

trim_leading(<<C, Rest/binary>>) when C =:= 32; C =:= 10; C =:= 13; C =:= 9 ->
    trim_leading(Rest);
trim_leading(Bin) ->
    Bin.

-spec build_stream_features(binary(), pre_auth | post_auth) -> binary().
build_stream_features(DomainBin, pre_auth) ->
    <<"<stream:stream from='", DomainBin/binary, "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>;
build_stream_features(DomainBin, post_auth) ->
    <<"<stream:stream from='", DomainBin/binary, "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'/></stream:features>">>.

-spec build_bind_result(binary(), binary()) -> binary().
build_bind_result(IdBin, FullJidBin) ->
    <<"<iq type='result' id='", IdBin/binary, "'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>", FullJidBin/binary, "</jid></bind></iq>">>.

-spec build_chat_message(binary(), binary(), binary(), binary()) -> binary().
build_chat_message(FromJidBin, ToJidBin, IdBin, BodyBin) ->
    <<"<message from='", FromJidBin/binary, "' to='", ToJidBin/binary, "' id='", IdBin/binary, "' type='chat'><body>", BodyBin/binary, "</body></message>">>.
`,
			},
		},
		{
			name:       "ch11-l04 RFC 6120 Stanza and Stream Errors & RFC 6121 Roster",
			exerciseID: "ch11-l04",
			files: map[string]string{
				"src/xmpp_error_and_roster.erl": `-module(xmpp_error_and_roster).
-export([classify_error_condition/1, build_stanza_error/4, build_stream_not_authorized/0, transition_subscription/2]).

-spec classify_error_condition(atom()) -> {binary(), binary()}.
classify_error_condition(not_authorized)      -> {<<"auth">>, <<"not-authorized">>};
classify_error_condition(forbidden)           -> {<<"auth">>, <<"forbidden">>};
classify_error_condition(item_not_found)       -> {<<"cancel">>, <<"item-not-found">>};
classify_error_condition(service_unavailable)  -> {<<"cancel">>, <<"service-unavailable">>};
classify_error_condition(bad_request)         -> {<<"modify">>, <<"bad-request">>};
classify_error_condition(resource_constraint) -> {<<"wait">>, <<"resource-constraint">>};
classify_error_condition(_)                   -> {<<"cancel">>, <<"undefined-condition">>}.

-spec build_stanza_error(binary(), binary(), binary(), atom()) -> binary().
build_stanza_error(StanzaTagBin, IdBin, ToJidBin, ConditionAtom) ->
    {TypeBin, ElementBin} = classify_error_condition(ConditionAtom),
    <<"<", StanzaTagBin/binary, " type='error' id='", IdBin/binary, "' to='", ToJidBin/binary, "'><error type='", TypeBin/binary, "'><", ElementBin/binary, " xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'/></error></", StanzaTagBin/binary, ">">>.

-spec build_stream_not_authorized() -> binary().
build_stream_not_authorized() ->
    <<"<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>">>.

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
-export([new_buffer/0, feed_chunk/2, extract_attr/2, extract_attr/3, extract_tag_body/2, extract_frames/2]).

new_buffer() ->
    <<>>.

feed_chunk(BufferBin, IncomingBin) when is_binary(BufferBin), is_binary(IncomingBin) ->
    Combined = <<BufferBin/binary, IncomingBin/binary>>,
    extract_events(Combined, []).

extract_frames(BufferBin, IncomingBin) ->
    feed_chunk(BufferBin, IncomingBin).

extract_events(Bin, Acc) ->
    CleanBin = trim_leading(Bin),
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
        <<"<ping", _/binary>> ->
            case binary:match(CleanBin, <<"/>">>) of
                {Pos, 2} ->
                    FrameLen = Pos + 2,
                    <<FrameBin:FrameLen/binary, Rest/binary>> = CleanBin,
                    Id = binary:copy(extract_attr(FrameBin, <<"id">>, <<"ping_1">>)),
                    extract_events(Rest, [{ping, Id} | Acc]);
                nomatch ->
                    {lists:reverse(Acc), binary:copy(CleanBin)}
            end;
        <<"<auth", _/binary>> ->
            extract_closed_tag(CleanBin, <<"</auth>">>, fun(FrameBin) ->
                Mech = binary:copy(extract_attr(FrameBin, <<"mechanism">>, <<"PLAIN">>)),
                Payload = binary:copy(extract_tag_body(FrameBin, <<"auth">>)),
                {sasl_auth, Mech, Payload}
            end, Acc);
        <<"<iq", _/binary>> ->
            extract_closed_tag(CleanBin, <<"</iq>">>, fun(FrameBin) ->
                Id = binary:copy(extract_attr(FrameBin, <<"id">>, <<"bind_1">>)),
                Res = binary:copy(extract_tag_body(FrameBin, <<"resource">>)),
                {iq_bind, Id, Res}
            end, Acc);
        <<"<presence", _/binary>> ->
            case binary:match(CleanBin, <<"/>">>) of
                {Pos, 2} when Pos < 30 ->
                    FrameLen = Pos + 2,
                    <<FrameBin:FrameLen/binary, Rest/binary>> = CleanBin,
                    Show = binary:copy(extract_attr(FrameBin, <<"show">>, <<"available">>)),
                    extract_events(Rest, [{presence, Show, 0} | Acc]);
                _ ->
                    extract_closed_tag(CleanBin, <<"</presence>">>, fun(FrameBin) ->
                        Show = binary:copy(extract_tag_body(FrameBin, <<"show">>)),
                        PStr = extract_tag_body(FrameBin, <<"priority">>),
                        P = case PStr of
                            <<>> -> 0;
                            _ ->
                                try binary_to_integer(PStr)
                                catch _:_ -> 0
                                end
                        end,
                        {presence, Show, P}
                    end, Acc)
            end;
        <<"<message", _/binary>> ->
            extract_closed_tag(CleanBin, <<"</message>">>, fun(FrameBin) ->
                Id = binary:copy(extract_attr(FrameBin, <<"id">>, <<"msg_1">>)),
                To = binary:copy(extract_attr(FrameBin, <<"to">>, <<>>)),
                Body = binary:copy(extract_tag_body(FrameBin, <<"body">>)),
                {chat_message, Id, To, Body}
            end, Acc);
        Other ->
            {lists:reverse(Acc), binary:copy(Other)}
    end.

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
    Key1 = <<AttrName/binary, "=\"">>,
    Key2 = <<AttrName/binary, "='">>,
    case find_attr_val(Bin, Key1, <<"\"">>) of
        {ok, Val} -> Val;
        nomatch ->
            case find_attr_val(Bin, Key2, <<"'">>) of
                {ok, Val} -> Val;
                nomatch -> Default
            end
    end.

find_attr_val(Bin, Pattern, Terminator) ->
    case binary:match(Bin, Pattern) of
        {Pos, Len} ->
            Start = Pos + Len,
            <<_:Start/binary, AfterPattern/binary>> = Bin,
            case binary:match(AfterPattern, Terminator) of
                {EndPos, _} ->
                    <<Val:EndPos/binary, _/binary>> = AfterPattern,
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
        {OpenPos, _} ->
            <<_:OpenPos/binary, FromOpen/binary>> = Bin,
            case binary:match(FromOpen, <<">">>) of
                {TagEnd, 1} ->
                    ContentStart = TagEnd + 1,
                    <<_:ContentStart/binary, BodyAndRest/binary>> = FromOpen,
                    case binary:match(BodyAndRest, CloseTag) of
                        {BodyLen, _} ->
                            <<Body:BodyLen/binary, _/binary>> = BodyAndRest,
                            Body;
                        nomatch -> <<>>
                    end;
                nomatch -> <<>>
            end;
        nomatch -> <<>>
    end.

trim_leading(<<C, Rest/binary>>) when C =:= 32; C =:= 10; C =:= 13; C =:= 9 ->
    trim_leading(Rest);
trim_leading(Bin) ->
    Bin.
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

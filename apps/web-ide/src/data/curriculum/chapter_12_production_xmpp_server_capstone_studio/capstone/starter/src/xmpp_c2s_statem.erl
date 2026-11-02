-module(xmpp_c2s_statem).
-behaviour(gen_statem).

-export([
    start_link/1,
    feed_xml/2,
    get_session_info/1,
    stop/1
]).
-export([
    callback_mode/0,
    init/1,
    wait_for_stream/3,
    wait_for_sasl/3,
    authenticated/3,
    session_established/3,
    terminate/3
]).

start_link(Opts) when is_map(Opts) ->
    gen_statem:start_link(?MODULE, Opts, []).

feed_xml(Pid, XmlChunkBin) when is_pid(Pid), is_binary(XmlChunkBin) ->
    gen_statem:call(Pid, {xml_chunk, XmlChunkBin}).

get_session_info(Pid) when is_pid(Pid) ->
    gen_statem:call(Pid, get_session_info).

stop(Pid) when is_pid(Pid) ->
    gen_statem:stop(Pid).

callback_mode() ->
    state_functions.

init(Opts) ->
    Socket = maps:get(socket, Opts, undefined),
    if Socket =/= undefined ->
        _ = inet:setopts(Socket, [{active, once}]);
       true ->
        ok
    end,
    Data = #{
        socket => Socket,
        buffer => xmpp_stream_parser:new_buffer(),
        domain => maps:get(domain, Opts, <<"localhost">>),
        username => maps:get(username, Opts, <<"alice">>),
        resource => <<>>,
        full_jid => <<>>,
        priority => 10,
        delivered_inbox => []
    },
    {ok, wait_for_stream, Data}.

wait_for_stream({call, From}, {xml_chunk, Chunk}, Data) ->
    handle_incoming_chunk(Chunk, wait_for_stream, Data, From);
wait_for_stream(info, {tcp, Socket, Chunk}, Data) ->
    _ = inet:setopts(Socket, [{active, once}]),
    handle_incoming_chunk(Chunk, wait_for_stream, Data, undefined);
wait_for_stream({call, From}, get_session_info, Data) ->
    {keep_state_and_data, [{reply, From, {ok, wait_for_stream, Data}}]};
wait_for_stream(_EventType, _Event, _Data) ->
    keep_state_and_data.

wait_for_sasl({call, From}, {xml_chunk, Chunk}, Data) ->
    handle_incoming_chunk(Chunk, wait_for_sasl, Data, From);
wait_for_sasl(info, {tcp, Socket, Chunk}, Data) ->
    _ = inet:setopts(Socket, [{active, once}]),
    handle_incoming_chunk(Chunk, wait_for_sasl, Data, undefined);
wait_for_sasl({call, From}, get_session_info, Data) ->
    {keep_state_and_data, [{reply, From, {ok, wait_for_sasl, Data}}]};
wait_for_sasl(_EventType, _Event, _Data) ->
    keep_state_and_data.

authenticated({call, From}, {xml_chunk, Chunk}, Data) ->
    handle_incoming_chunk(Chunk, authenticated, Data, From);
authenticated(info, {tcp, Socket, Chunk}, Data) ->
    _ = inet:setopts(Socket, [{active, once}]),
    handle_incoming_chunk(Chunk, authenticated, Data, undefined);
authenticated({call, From}, get_session_info, Data) ->
    {keep_state_and_data, [{reply, From, {ok, authenticated, Data}}]};
authenticated(_EventType, _Event, _Data) ->
    keep_state_and_data.

session_established({call, From}, {xml_chunk, Chunk}, Data) ->
    handle_incoming_chunk(Chunk, session_established, Data, From);
session_established(info, {tcp, Socket, Chunk}, Data) ->
    _ = inet:setopts(Socket, [{active, once}]),
    handle_incoming_chunk(Chunk, session_established, Data, undefined);
session_established(info, {deliver_stanza, XmlBin}, Data) ->
    send_to_socket(maps:get(socket, Data, undefined), XmlBin),
    Inbox = maps:get(delivered_inbox, Data, []),
    {keep_state, Data#{delivered_inbox => Inbox ++ [XmlBin]}};
session_established({call, From}, get_session_info, Data) ->
    {keep_state_and_data, [{reply, From, {ok, session_established, Data}}]};
session_established(_EventType, _Event, _Data) ->
    keep_state_and_data.

terminate(_Reason, _State, Data) ->
    case maps:get(full_jid, Data, <<>>) of
        <<>> -> ok;
        FullJid ->
            try xmpp_session_registry:unregister_session(FullJid) catch _:_ -> ok end,
            ok
    end.

handle_incoming_chunk(Chunk, CurrentState, Data, ReplyFrom) ->
    OldBuf = maps:get(buffer, Data, <<>>),
    {Events, NewBuf} = xmpp_stream_parser:feed_chunk(OldBuf, Chunk),
    {NextState, UpdatedData, OutXmlList} =
        process_events(Events, CurrentState, Data#{buffer => NewBuf}, []),
    lists:foreach(fun(Xml) ->
        send_to_socket(maps:get(socket, UpdatedData, undefined), Xml)
    end, OutXmlList),
    case ReplyFrom of
        undefined ->
            {next_state, NextState, UpdatedData};
        From ->
            {next_state, NextState, UpdatedData, [{reply, From, {ok, NextState, OutXmlList}}]}
    end.

%% % TODO [Milestone 4 - Event Processing Engine]:
%% process_events(Events, CurrentState, Data, OutXmlAcc) -> {NextState, UpdatedData, OutXmlList}

process_events([], State, Data, OutAcc) ->
    {State, Data, lists:reverse(OutAcc)};

%% % TODO [Milestone 4 - Step 1]: Handle {stream_open, Domain} in wait_for_stream
%% Reply with stream header advertising SASL PLAIN mechanism:
%%   Reply = <<"<stream:stream from='", Domain/binary, "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>
%% Advance state to 'wait_for_sasl', store domain in Data, append Reply to OutAcc.
process_events([{stream_open, Domain} | Rest], wait_for_stream, Data, OutAcc) ->
    %% Implement stream_open transition here:
    process_events(Rest, wait_for_stream, Data, OutAcc);

%% % TODO [Milestone 4 - Step 2]: Handle {sasl_auth, Mech, Payload} in wait_for_sasl
%% Extract username with extract_user_from_sasl(Payload, maps:get(username, Data, <<"alice">>))
%% Reply with success stanza: <<"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>
%% Advance state to 'authenticated', store username in Data, append Reply to OutAcc.
process_events([{sasl_auth, _Mech, Payload} | Rest], wait_for_sasl, Data, OutAcc) ->
    %% Implement sasl_auth transition here:
    process_events(Rest, wait_for_sasl, Data, OutAcc);

%% % TODO [Milestone 4 - Step 3]: Pre-Auth Security Rejection in wait_for_sasl
%% Any unauthenticated stanza received before SASL authentication completes MUST be rejected!
%% Reply with: <<"<stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>">>
%% Remain in wait_for_sasl state.
process_events([_PreAuthStanza | Rest], wait_for_sasl, Data, OutAcc) ->
    %% Implement pre-auth stanza rejection here:
    process_events(Rest, wait_for_sasl, Data, OutAcc);

%% % TODO [Milestone 4 - Step 4]: Handle {stream_open, Domain} in authenticated
%% After SASL success, client re-opens stream. Reply advertising bind feature:
%%   Reply = <<"<stream:stream from='", Domain/binary, "' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'><stream:features><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'/></stream:features>">>
%% Remain in 'authenticated' state.
process_events([{stream_open, Domain} | Rest], authenticated, Data, OutAcc) ->
    %% Implement second stream_open response here:
    process_events(Rest, authenticated, Data, OutAcc);

%% % TODO [Milestone 4 - Step 5]: Handle {iq_bind, Id, ResourceBin} in authenticated
%% 1. Res = if ResourceBin == <<>> -> <<"obsidian">>; true -> ResourceBin end.
%% 2. FullJid = <<User/binary, "@", Domain/binary, "/", Res/binary>>.
%% 3. Register session: try xmpp_session_registry:register_session(FullJid, maps:get(priority, Data, 10), self()) catch _:_ -> ok end.
%% 4. Reply = <<"<iq type='result' id='", Id/binary, "'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>", FullJid/binary, "</jid></bind></iq>">>.
%% 5. Advance state to 'session_established', update Data with resource and full_jid.
process_events([{iq_bind, Id, ResourceBin} | Rest], authenticated, Data, OutAcc) ->
    %% Implement resource binding and session registration here:
    process_events(Rest, authenticated, Data, OutAcc);

process_events([{chat_message, Id, ToJid, Body} | Rest], session_established, Data, OutAcc) ->
    FromJid = maps:get(full_jid, Data, <<"alice@localhost/obsidian">>),
    TargetJid = case ToJid of <<>> -> FromJid; T -> T end,
    StanzaXml = <<"<message from='", FromJid/binary, "' to='", TargetJid/binary, "' id='", Id/binary, "' type='chat'><body>", Body/binary, "</body></message>">>,
    _ = try xmpp_router:route_stanza(FromJid, TargetJid, StanzaXml) catch _:_ -> ok end,
    process_events(Rest, session_established, Data, OutAcc);

process_events([{ping, Id} | Rest], State, Data, OutAcc) ->
    Reply = <<"<iq type='result' id='", Id/binary, "'/>">>,
    process_events(Rest, State, Data, [Reply | OutAcc]);

process_events([stream_close | Rest], _State, Data, OutAcc) ->
    Reply = <<"</stream:stream>">>,
    process_events(Rest, wait_for_stream, Data, [Reply | OutAcc]);

process_events([_Other | Rest], State, Data, OutAcc) ->
    process_events(Rest, State, Data, OutAcc).

extract_user_from_sasl(<<>>, Default) -> Default;
extract_user_from_sasl(Payload, Default) ->
    case binary:split(Payload, <<0>>, [global]) of
        [_Authzid, Authcid, _Pass | _] when Authcid =/= <<>> -> Authcid;
        [Single | _] when Single =/= <<>> -> Single;
        _ -> Default
    end.

send_to_socket(undefined, _Data) -> ok;
send_to_socket(Socket, Data) ->
    try gen_tcp:send(Socket, Data) catch _:_ -> ok end,
    ok.

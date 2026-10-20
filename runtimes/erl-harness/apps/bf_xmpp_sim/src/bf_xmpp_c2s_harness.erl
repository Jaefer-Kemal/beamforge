-module(bf_xmpp_c2s_harness).

-export([
    verify_c2s_handshake_and_routing/3
]).

-type transcript_entry() :: #{
    direction => binary(),
    xml => binary(),
    stage => binary(),
    latency_us => non_neg_integer()
}.

-spec verify_c2s_handshake_and_routing(inet:port_number(), binary(), binary()) ->
    {ok, [transcript_entry()]} | {error, atom(), term(), [transcript_entry()]}.
verify_c2s_handshake_and_routing(ServerPort, _ClientJid, _AuthToken) ->
    case gen_tcp:connect("127.0.0.1", ServerPort, [binary, {active, false}, {nodelay, true}], 3000) of
        {ok, Socket} ->
            Transcript0 = [],
            try
                %% -------------------------------------------------------------
                %% STAGE 1: Fragmented Stream Opening
                %% -------------------------------------------------------------
                T0 = erlang:monotonic_time(microsecond),
                StreamHeader = <<"<stream:stream to='localhost' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' version='1.0'>">>,
                ChunkSize = max(10, byte_size(StreamHeader) div 3),
                ok = bf_tcp_fragmenter:send_fragmented(Socket, StreamHeader, ChunkSize, 15),
                T1 = erlang:monotonic_time(microsecond),
                Entry1 = #{
                    direction => <<"c2s">>,
                    xml => StreamHeader,
                    stage => <<"stream_init">>,
                    latency_us => T1 - T0
                },
                Transcript1 = [Entry1 | Transcript0],

                %% Receive Server Stream & Features
                {ok, FeaturesResp} = gen_tcp:recv(Socket, 0, 3000),
                T2 = erlang:monotonic_time(microsecond),
                Entry2 = #{
                    direction => <<"s2c">>,
                    xml => FeaturesResp,
                    stage => <<"stream_features">>,
                    latency_us => T2 - T1
                },
                Transcript2 = [Entry2 | Transcript1],
                case binary:match(FeaturesResp, [<<"<stream:features">>, <<"PLAIN">>]) of
                    nomatch -> throw({error, stream_features_missing, Transcript2});
                    _ -> ok
                end,

                %% -------------------------------------------------------------
                %% STAGE 2: SASL PLAIN Authentication
                %% -------------------------------------------------------------
                AuthStanza = <<"<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='PLAIN'>AGFsaWNlAHBhc3N3b3Jk</auth>">>,
                ok = gen_tcp:send(Socket, AuthStanza),
                T3 = erlang:monotonic_time(microsecond),
                Entry3 = #{
                    direction => <<"c2s">>,
                    xml => AuthStanza,
                    stage => <<"sasl_auth">>,
                    latency_us => T3 - T2
                },
                Transcript3 = [Entry3 | Transcript2],

                {ok, SaslResp} = gen_tcp:recv(Socket, 0, 3000),
                T4 = erlang:monotonic_time(microsecond),
                Entry4 = #{
                    direction => <<"s2c">>,
                    xml => SaslResp,
                    stage => <<"sasl_success">>,
                    latency_us => T4 - T3
                },
                Transcript4 = [Entry4 | Transcript3],
                case binary:match(SaslResp, <<"success">>) of
                    nomatch -> throw({error, sasl_authentication_failed, Transcript4});
                    _ -> ok
                end,

                %% -------------------------------------------------------------
                %% STAGE 3: Post-SASL Restart & Resource Binding
                %% -------------------------------------------------------------
                BindStanza = <<"<iq type='set' id='bind_1'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><resource>obsidian</resource></bind></iq>">>,
                ok = gen_tcp:send(Socket, BindStanza),
                T5 = erlang:monotonic_time(microsecond),
                Entry5 = #{
                    direction => <<"c2s">>,
                    xml => BindStanza,
                    stage => <<"resource_binding">>,
                    latency_us => T5 - T4
                },
                Transcript5 = [Entry5 | Transcript4],

                {ok, BindResp} = gen_tcp:recv(Socket, 0, 3000),
                T6 = erlang:monotonic_time(microsecond),
                Entry6 = #{
                    direction => <<"s2c">>,
                    xml => BindResp,
                    stage => <<"bind_result">>,
                    latency_us => T6 - T5
                },
                Transcript6 = [Entry6 | Transcript5],
                case binary:match(BindResp, [<<"result">>, <<"jid">>]) of
                    nomatch -> throw({error, resource_binding_failed, Transcript6});
                    _ -> ok
                end,

                %% -------------------------------------------------------------
                %% STAGE 4: Coalesced Message Routing (Two stanzas in one TCP packet)
                %% -------------------------------------------------------------
                Msg1 = <<"<message to='bob@localhost' id='msg_01' type='chat'><body>Hello from Obsidian IDE</body></message>">>,
                Msg2 = <<"<message to='bob@localhost' id='msg_02' type='chat'><body>Stream backpressure test ok</body></message>">>,
                ok = bf_tcp_fragmenter:send_coalesced(Socket, [Msg1, Msg2]),
                T7 = erlang:monotonic_time(microsecond),
                Entry7 = #{
                    direction => <<"c2s">>,
                    xml => <<Msg1/binary, Msg2/binary>>,
                    stage => <<"coalesced_messages">>,
                    latency_us => T7 - T6
                },
                Transcript7 = [Entry7 | Transcript6],

                {ok, RoutingResp} = gen_tcp:recv(Socket, 0, 3000),
                T8 = erlang:monotonic_time(microsecond),
                Entry8 = #{
                    direction => <<"s2c">>,
                    xml => RoutingResp,
                    stage => <<"routing_ack">>,
                    latency_us => T8 - T7
                },
                Transcript8 = [Entry8 | Transcript7],

                gen_tcp:close(Socket),
                {ok, lists:reverse(Transcript8)}
            catch
                throw:{error, Reason, CurrentTranscript} ->
                    gen_tcp:close(Socket),
                    {error, validation_failed, Reason, lists:reverse(CurrentTranscript)};
                Class:Err:Stack ->
                    gen_tcp:close(Socket),
                    {error, exception, {Class, Err, Stack}, lists:reverse(Transcript0)}
            end;
        {error, ConnectErr} ->
            {error, tcp_connect, ConnectErr, []}
    end.

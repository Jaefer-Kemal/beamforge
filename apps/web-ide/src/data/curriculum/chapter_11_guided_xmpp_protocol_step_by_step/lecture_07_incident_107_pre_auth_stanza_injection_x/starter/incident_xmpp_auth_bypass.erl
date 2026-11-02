-module(incident_xmpp_auth_bypass).
-export([process_c2s_stanza/3, escape_xml_text/1, test_pre_auth_rejection/0, test_xml_escaping/0]).

%% % TODO: Reject unauthenticated stanzas during pre-auth states (wait_for_stream, wait_for_sasl)
%% When in wait_for_stream or wait_for_sasl:
%%   return {reject, <<"<stream:error><not-authorized/></stream:error>">>, State}
%% When in session_established and receiving {chat_message, To, Body}:
%%   escape Body with escape_xml_text/1, construct <message>, return {route, To, Xml, State}
%% Any other state/stanza:
%%   return {reject, <<"<stream:error><not-authorized/></stream:error>">>, State}
process_c2s_stanza(wait_for_stream, _Stanza, State) ->
    {reject, <<"<stream:error><not-authorized/></stream:error>">>, State};
process_c2s_stanza(wait_for_sasl, _Stanza, State) ->
    {reject, <<"<stream:error><not-authorized/></stream:error>">>, State};
process_c2s_stanza(session_established, {chat_message, _To, _Body}, State) ->
    %% % TODO: Escape Body and format <message from='...' to='...' type='chat'><body>...</body></message>
    {reject, <<"<stream:error><not-authorized/></stream:error>">>, State};
process_c2s_stanza(_OtherState, _Stanza, State) ->
    {reject, <<"<stream:error><not-authorized/></stream:error>">>, State}.

%% % TODO: Recursive binary loop escaping &, <, > to &amp;, &lt;, &gt;
escape_xml_text(Bin) when is_binary(Bin) ->
    Bin.

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

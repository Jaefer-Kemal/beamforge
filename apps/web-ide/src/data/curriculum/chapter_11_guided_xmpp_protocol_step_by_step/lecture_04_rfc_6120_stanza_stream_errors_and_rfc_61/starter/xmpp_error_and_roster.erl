-module(xmpp_error_and_roster).
-export([classify_error_condition/1, build_stanza_error/4, build_stream_not_authorized/0, transition_subscription/2]).

%% % TODO: Classify RFC 6120 Stanza Error Condition
%% Map condition atom to {TypeBin, ConditionBin}:
%%   not_authorized      -> {<<"auth">>, <<"not-authorized">>}
%%   forbidden           -> {<<"auth">>, <<"forbidden">>}
%%   item_not_found      -> {<<"cancel">>, <<"item-not-found">>}
%%   service_unavailable -> {<<"cancel">>, <<"service-unavailable">>}
%%   bad_request         -> {<<"modify">>, <<"bad-request">>}
%%   resource_constraint -> {<<"wait">>, <<"resource-constraint">>}
%%   _                   -> {<<"cancel">>, <<"undefined-condition">>}
-spec classify_error_condition(atom()) -> {binary(), binary()}.
classify_error_condition(_ConditionAtom) ->
    {<<"cancel">>, <<"undefined-condition">>}.

%% % TODO: Synthesize RFC 6120 Structured Stanza Error XML
%% Return binary formatted as:
%%   <StanzaTag type='error' id='Id' to='ToJid'><error type='Type'><Condition xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'/></error></StanzaTag>
-spec build_stanza_error(binary(), binary(), binary(), atom()) -> binary().
build_stanza_error(_StanzaTagBin, _IdBin, _ToJidBin, _ConditionAtom) ->
    <<>>.

%% % TODO: Synthesize RFC 6120 Stream Error <not-authorized/>
%% Return <<" <stream:error><not-authorized xmlns='urn:ietf:params:xml:ns:xmpp-streams'/></stream:error>">>
-spec build_stream_not_authorized() -> binary().
build_stream_not_authorized() ->
    <<>>.

%% % TODO: RFC 6121 Roster Subscription State Machine
%% Handle outbound and inbound events:
%%   none + outbound_subscribed   -> to
%%   none + inbound_subscribed    -> from
%%   to   + inbound_subscribed    -> both
%%   to   + outbound_unsubscribed -> none
%%   from + outbound_subscribed   -> both
%%   from + inbound_unsubscribed  -> none
%%   both + outbound_unsubscribed -> from
%%   both + inbound_unsubscribed  -> to
%%   Any other combination       -> Current
-spec transition_subscription(atom(), atom()) -> atom().
transition_subscription(Current, _Event) ->
    Current.

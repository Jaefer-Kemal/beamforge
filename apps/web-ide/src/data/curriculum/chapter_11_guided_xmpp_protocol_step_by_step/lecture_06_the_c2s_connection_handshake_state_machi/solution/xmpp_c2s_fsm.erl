-module(xmpp_c2s_fsm).
-export([
    init/1,
    handle_event/2,
    get_state/1
]).

-type fsm_state() :: #{
    state := atom(),
    domain := binary(),
    user := binary(),
    full_jid := binary()
}.

-spec init(binary()) -> fsm_state().
init(Domain) ->
    #{state => wait_for_stream, domain => Domain, user => <<>>, full_jid => <<>>}.

-spec handle_event(term(), fsm_state()) ->
    {reply, binary() | [binary()], fsm_state()} |
    {ok, term(), fsm_state()} |
    {error, atom(), fsm_state()}.
handle_event(Event, #{state := wait_for_stream, domain := Domain} = State) ->
    case Event of
        {stream_open, Domain} ->
            Reply = <<"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>,
            {reply, Reply, State#{state => wait_for_sasl}};
        _ ->
            {error, unexpected_stanza_before_stream, State}
    end;

handle_event(Event, #{state := wait_for_sasl} = State) ->
    case Event of
        {auth_plain, Base64Token} ->
            case decode_sasl_plain(Base64Token) of
                {ok, User, _Pass} ->
                    Success = <<"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>,
                    {reply, Success, State#{state => authenticated, user => User}};
                error ->
                    {error, invalid_credentials, State}
            end;
        _ ->
            {error, not_authorized, State}
    end;

handle_event(Event, #{state := authenticated, domain := Domain, user := User} = State) ->
    case Event of
        {bind_resource, Id, Resource} ->
            FullJid = <<User/binary, "@", Domain/binary, "/", Resource/binary>>,
            Result = <<"<iq type='result' id='", Id/binary, "'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>", FullJid/binary, "</jid></bind></iq>">>,
            {reply, Result, State#{state => session_established, full_jid => FullJid}};
        _ ->
            {error, expected_bind, State}
    end;

handle_event(Event, #{state := session_established} = State) ->
    case Event of
        {chat_message, To, _Id, _Body} ->
            {ok, {routed, To}, State};
        {presence, Type} ->
            {ok, {presence_updated, Type}, State};
        _ ->
            {error, unknown_event, State}
    end.

-spec get_state(fsm_state()) -> atom().
get_state(#{state := StateName}) -> StateName.

decode_sasl_plain(Base64Token) ->
    try
        Decoded = base64:decode(Base64Token),
        case Decoded of
            <<0, Rest/binary>> ->
                case binary:split(Rest, <<0>>) of
                    [User, Pass] -> {ok, binary:copy(User), binary:copy(Pass)};
                    _ -> error
                end;
            _ ->
                case binary:split(Decoded, <<0>>, [global]) of
                    [User, Pass] -> {ok, binary:copy(User), binary:copy(Pass)};
                    _ -> error
                end
        end
    catch
        _:_ -> error
    end.

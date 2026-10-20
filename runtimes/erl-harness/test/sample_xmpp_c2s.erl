-module(sample_xmpp_c2s).
-behaviour(gen_statem).

-export([
    start_link/1,
    get_port/1,
    stop/1
]).

-export([
    init/1,
    callback_mode/0,
    terminate/3,
    wait_for_connection/3,
    wait_for_stream/3,
    wait_for_sasl/3,
    authenticated/3,
    session_established/3
]).

-record(data, {
    listen_socket :: gen_tcp:socket() | undefined,
    port :: inet:port_number(),
    client_socket :: gen_tcp:socket() | undefined,
    active_mode = once :: once | true,
    buffer = <<>> :: binary(),
    bound_jid = <<>> :: binary()
}).

start_link(Opts) ->
    RegName = maps:get(reg_name, Opts, ?MODULE),
    gen_statem:start_link({local, RegName}, ?MODULE, Opts, []).

get_port(Pid) ->
    gen_statem:call(Pid, get_port).

stop(Pid) ->
    case is_process_alive(Pid) of
        true ->
            try gen_statem:stop(Pid, normal, 2000) catch _:_ -> ok end,
            ok;
        false ->
            ok
    end.

callback_mode() ->
    [state_functions, state_enter].

init(Opts) ->
    ActiveMode = maps:get(active_mode, Opts, once),
    {ok, ListenSocket} = gen_tcp:listen(0, [
        binary,
        {active, false},
        {reuseaddr, true},
        {nodelay, true}
    ]),
    {ok, Port} = inet:port(ListenSocket),
    
    Data = #data{
        listen_socket = ListenSocket,
        port = Port,
        active_mode = ActiveMode
    },
    {ok, wait_for_connection, Data, [{next_event, internal, start_accept}]}.

%% --------------------------------------------------------------------
%% State 0: Wait for Client TCP Connection
%% --------------------------------------------------------------------
wait_for_connection(enter, _OldState, _Data) ->
    keep_state_and_data;

wait_for_connection(internal, start_accept, #data{listen_socket = ListenSocket}) ->
    Self = self(),
    spawn_link(fun() ->
        case gen_tcp:accept(ListenSocket, 5000) of
            {ok, ClientSocket} ->
                ok = gen_tcp:controlling_process(ClientSocket, Self),
                Self ! {client_connected, ClientSocket};
            {error, Reason} ->
                Self ! {accept_error, Reason}
        end
    end),
    keep_state_and_data;

wait_for_connection(info, {client_connected, ClientSocket}, #data{active_mode = Mode} = Data) ->
    case Mode of
        once ->
            inet:setopts(ClientSocket, [{active, once}, {mode, binary}]);
        true ->
            inet:setopts(ClientSocket, [{active, true}, {mode, binary}])
    end,
    {next_state, wait_for_stream, Data#data{client_socket = ClientSocket}};

wait_for_connection({call, From}, get_port, #data{port = Port}) ->
    {keep_state_and_data, [{reply, From, Port}]};

wait_for_connection(_EventType, _EventContent, _Data) ->
    keep_state_and_data.

%% --------------------------------------------------------------------
%% State 1: Wait for Stream Opening Header
%% --------------------------------------------------------------------
wait_for_stream(enter, _OldState, _Data) ->
    keep_state_and_data;

wait_for_stream(info, {tcp, Socket, Chunk}, #data{buffer = Buf, active_mode = Mode} = Data) ->
    if Mode =:= true -> timer:sleep(3); true -> ok end,
    NewBuf = <<Buf/binary, Chunk/binary>>,
    case binary:match(NewBuf, [<<"<stream:stream">>, <<"to='localhost'">>]) of
        nomatch ->
            rearm_socket(Socket, Mode),
            {keep_state, Data#data{buffer = NewBuf}};
        _ ->
            Features = <<"<stream:stream from='localhost' version='1.0' xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams'><stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>,
            gen_tcp:send(Socket, Features),
            rearm_socket(Socket, Mode),
            {next_state, wait_for_sasl, Data#data{buffer = <<>>}}
    end;

wait_for_stream({call, From}, get_port, #data{port = Port}) ->
    {keep_state_and_data, [{reply, From, Port}]};

wait_for_stream(info, {tcp_closed, _Socket}, _Data) ->
    {stop, normal}.

%% --------------------------------------------------------------------
%% State 2: Wait for SASL PLAIN Authentication
%% --------------------------------------------------------------------
wait_for_sasl(enter, _OldState, _Data) ->
    keep_state_and_data;

wait_for_sasl(info, {tcp, Socket, Chunk}, #data{buffer = Buf, active_mode = Mode} = Data) ->
    NewBuf = <<Buf/binary, Chunk/binary>>,
    case binary:match(NewBuf, <<"mechanism='PLAIN'">>) of
        nomatch ->
            rearm_socket(Socket, Mode),
            {keep_state, Data#data{buffer = NewBuf}};
        _ ->
            Success = <<"<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>">>,
            gen_tcp:send(Socket, Success),
            rearm_socket(Socket, Mode),
            {next_state, authenticated, Data#data{buffer = <<>>}}
    end;

wait_for_sasl({call, From}, get_port, #data{port = Port}) ->
    {keep_state_and_data, [{reply, From, Port}]};

wait_for_sasl(info, {tcp_closed, _Socket}, _Data) ->
    {stop, normal}.

%% --------------------------------------------------------------------
%% State 3: Authenticated -> Resource Binding
%% --------------------------------------------------------------------
authenticated(enter, _OldState, _Data) ->
    keep_state_and_data;

authenticated(info, {tcp, Socket, Chunk}, #data{buffer = Buf, active_mode = Mode} = Data) ->
    NewBuf = <<Buf/binary, Chunk/binary>>,
    case binary:match(NewBuf, <<"urn:ietf:params:xml:ns:xmpp-bind">>) of
        nomatch ->
            rearm_socket(Socket, Mode),
            {keep_state, Data#data{buffer = NewBuf}};
        _ ->
            BoundJid = <<"alice@localhost/obsidian">>,
            Result = <<"<iq type='result' id='bind_1'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>", BoundJid/binary, "</jid></bind></iq>">>,
            gen_tcp:send(Socket, Result),
            rearm_socket(Socket, Mode),
            {next_state, session_established, Data#data{buffer = <<>>, bound_jid = BoundJid}}
    end;

authenticated({call, From}, get_port, #data{port = Port}) ->
    {keep_state_and_data, [{reply, From, Port}]};

authenticated(info, {tcp_closed, _Socket}, _Data) ->
    {stop, normal}.

%% --------------------------------------------------------------------
%% State 4: Session Established -> Message & Stanza Routing
%% --------------------------------------------------------------------
session_established(enter, _OldState, _Data) ->
    keep_state_and_data;

session_established(info, {tcp, Socket, Chunk}, #data{active_mode = Mode}) ->
    case Mode of
        true ->
            %% Artificial processing delay in {active, true} mode to allow mailbox
            %% queue accumulation during socket blast testing
            timer:sleep(2);
        once ->
            ok
    end,

    case binary:match(Chunk, <<"<body>">>) of
        nomatch ->
            %% Ping or other stanza
            rearm_socket(Socket, Mode),
            keep_state_and_data;
        _ ->
            %% Echo back message route acknowledgement
            Ack = <<"<message from='bob@localhost' type='chat'><ack status='delivered'/></message>">>,
            gen_tcp:send(Socket, Ack),
            rearm_socket(Socket, Mode),
            keep_state_and_data
    end;

session_established({call, From}, get_port, #data{port = Port}) ->
    {keep_state_and_data, [{reply, From, Port}]};

session_established(info, {tcp_closed, _Socket}, _Data) ->
    {stop, normal}.

terminate(_Reason, _State, #data{client_socket = Client, listen_socket = Listen}) ->
    if is_port(Client) -> gen_tcp:close(Client); true -> ok end,
    if is_port(Listen) -> gen_tcp:close(Listen); true -> ok end,
    ok.

rearm_socket(Socket, once) when is_port(Socket) ->
    inet:setopts(Socket, [{active, once}]);
rearm_socket(_Socket, true) ->
    ok.

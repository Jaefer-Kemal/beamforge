-module(tcp_live_demo).

-export([run_demo/0]).

%% @doc Runs a full end-to-end TCP socket lifecycle demo on an ephemeral port.
-spec run_demo() -> map().
run_demo() ->
    io:format("~n=== [STEP 1] Opening Listen Socket on Ephemeral Port 0 ===~n"),
    ListenOpts = [
        binary,
        {packet, raw},
        {active, false},
        {reuseaddr, true}
    ],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    io:format("  -> Successfully bound ListenSocket to Port ~p~n", [Port]),

    io:format("~n=== [STEP 2] Spawning Background Acceptor Process ===~n"),
    Parent = self(),
    AcceptorPid = spawn(fun() ->
        io:format("  [Acceptor] Waiting for incoming client handshake...~n"),
        case gen_tcp:accept(ListenSocket, 3000) of
            {ok, ClientSocket} ->
                io:format("  [Acceptor] Client connected! Starting echo loop.~n"),
                Parent ! {acceptor_ready, self()},
                echo_loop(ClientSocket, 0, Parent);
            {error, Reason} ->
                Parent ! {acceptor_error, Reason}
        end
    end),

    io:format("~n=== [STEP 3] Connecting Client to 127.0.0.1:~p ===~n", [Port]),
    ClientOpts = [binary, {packet, raw}, {active, false}],
    {ok, ClientSock} = gen_tcp:connect("127.0.0.1", Port, ClientOpts, 2000),
    io:format("  -> Client connection established!~n"),

    receive
        {acceptor_ready, AcceptorPid} -> ok
    after 2000 ->
        error(acceptor_timeout)
    end,

    io:format("~n=== [STEP 4] Exchanging 3 Request/Response Frames ===~n"),
    Messages = [
        <<"SYN_FRAME\r\n">>,
        <<"DATA_FRAME\r\n">>,
        <<"FIN_FRAME\r\n">>
    ],
    lists:foreach(fun(Msg) ->
        io:format("  [Client Send] -> ~s", [binary_to_list(Msg)]),
        ok = gen_tcp:send(ClientSock, Msg),
        {ok, Reply} = gen_tcp:recv(ClientSock, 0, 2000),
        io:format("  [Client Recv] <- ~s", [binary_to_list(Reply)])
    end, Messages),

    io:format("~n=== [STEP 5] Inspecting Socket Telemetry Statistics ===~n"),
    {ok, Stats} = inet:getstat(ClientSock, [recv_oct, send_oct, recv_cnt, send_cnt]),
    io:format("  -> Client Telemetry Stats: ~p~n", [Stats]),
    RecvBytes = proplists:get_value(recv_oct, Stats, 0),

    %% Clean up resources cleanly
    gen_tcp:close(ClientSock),
    gen_tcp:close(ListenSocket),

    receive
        {acceptor_done, TotalProcessed} ->
            io:format("~n=== [COMPLETE] Closed Sockets. Total Packets: ~p ===~n~n", [TotalProcessed]),
            #{port => Port, frames_exchanged => TotalProcessed, bytes_received => RecvBytes}
    after 1000 ->
        #{port => Port, frames_exchanged => 3, bytes_received => RecvBytes}
    end.

echo_loop(Socket, Count, Parent) ->
    case gen_tcp:recv(Socket, 0, 2000) of
        {ok, <<"FIN_FRAME\r\n">>} ->
            _ = gen_tcp:send(Socket, <<"+ACK: FIN_FRAME\r\n">>),
            gen_tcp:close(Socket),
            Parent ! {acceptor_done, Count + 1};
        {ok, Data} ->
            Reply = <<"+ACK: ", Data/binary>>,
            ok = gen_tcp:send(Socket, Reply),
            echo_loop(Socket, Count + 1, Parent);
        {error, closed} ->
            Parent ! {acceptor_done, Count};
        {error, _Reason} ->
            gen_tcp:close(Socket),
            Parent ! {acceptor_done, Count}
    end.
    
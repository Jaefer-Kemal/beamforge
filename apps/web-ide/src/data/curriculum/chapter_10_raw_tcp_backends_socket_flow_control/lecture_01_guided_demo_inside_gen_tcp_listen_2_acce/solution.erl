-module(tcp_live_demo).

-export([run_demo/0]).

-spec run_demo() -> map().
run_demo() ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    Parent = self(),
    spawn(fun() ->
        case gen_tcp:accept(ListenSocket, 3000) of
            {ok, ClientSocket} ->
                Parent ! {acceptor_ready, self()},
                echo_loop(ClientSocket, 0, Parent);
            {error, Reason} ->
                Parent ! {acceptor_error, Reason}
        end
    end),
    ClientOpts = [binary, {packet, raw}, {active, false}],
    {ok, ClientSock} = gen_tcp:connect("127.0.0.1", Port, ClientOpts, 2000),
    receive {acceptor_ready, _} -> ok after 2000 -> error(acceptor_timeout) end,
    Messages = [<<"SYN_FRAME\r\n">>, <<"DATA_FRAME\r\n">>, <<"FIN_FRAME\r\n">>],
    lists:foreach(fun(Msg) ->
        ok = gen_tcp:send(ClientSock, Msg),
        {ok, _Reply} = gen_tcp:recv(ClientSock, 0, 2000)
    end, Messages),
    {ok, Stats} = inet:getstat(ClientSock, [recv_oct, send_oct]),
    RecvBytes = proplists:get_value(recv_oct, Stats, 0),
    gen_tcp:close(ClientSock),
    gen_tcp:close(ListenSocket),
    receive
        {acceptor_done, TotalProcessed} ->
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
        {error, _} ->
            gen_tcp:close(Socket),
            Parent ! {acceptor_done, Count}
    end.
    
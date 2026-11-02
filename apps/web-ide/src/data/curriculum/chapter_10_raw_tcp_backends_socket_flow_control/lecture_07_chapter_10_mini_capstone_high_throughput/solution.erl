-module(tcp_kv_backend).

-export([
    start_server/0,
    stop_server/1,
    parse_command/1,
    execute_command/2
]).

-spec parse_command(binary()) -> {ok, term()} | {error, unknown_command}.
parse_command(<<"PING">>) ->
    {ok, ping};
parse_command(<<"SET ", Rest/binary>>) ->
    case binary:split(Rest, <<" ">>) of
        [Key, Value] -> {ok, {set, Key, Value}};
        _ -> {error, unknown_command}
    end;
parse_command(<<"GET ", Key/binary>>) ->
    {ok, {get, Key}};
parse_command(<<"DEL ", Key/binary>>) ->
    {ok, {del, Key}};
parse_command(_Other) ->
    {error, unknown_command}.

-spec execute_command(term(), atom() | ets:tid()) -> binary().
execute_command({ok, Cmd}, Tab) ->
    execute_command(Cmd, Tab);
execute_command(ping, _Tab) ->
    <<"+PONG
">>;
execute_command({set, Key, Value}, Tab) ->
    ets:insert(Tab, {Key, Value}),
    <<"+OK
">>;
execute_command({get, Key}, Tab) ->
    case ets:lookup(Tab, Key) of
        [{Key, Value}] ->
            <<"$", Value/binary, "
">>;
        [] ->
            <<"$-1
">>
    end;
execute_command({del, Key}, Tab) ->
    case ets:member(Tab, Key) of
        true ->
            ets:delete(Tab, Key),
            <<":1
">>;
        false ->
            <<":0
">>
    end;
execute_command({error, unknown_command}, _Tab) ->
    <<"-ERR unknown command
">>;
execute_command(_Other, _Tab) ->
    <<"-ERR unknown command
">>.

-spec start_server() -> {ok, pid(), inet:port_number()}.
start_server() ->
    Tab = case ets:info(tcp_kv_table) of
        undefined ->
            ets:new(tcp_kv_table, [set, public, named_table, {read_concurrency, true}, {write_concurrency, true}]);
        _ ->
            tcp_kv_table
    end,
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    ServerPid = spawn_link(fun() ->
        accept_loop(ListenSocket, Tab)
    end),
    {ok, ServerPid, Port}.

-spec stop_server(pid()) -> ok.
stop_server(ServerPid) ->
    exit(ServerPid, kill),
    try ets:delete(tcp_kv_table) catch _:_ -> ok end,
    ok.

accept_loop(ListenSocket, Tab) ->
    case gen_tcp:accept(ListenSocket) of
        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() ->
                try register(tcp_kv_worker, self()) catch _:_ -> ok end,
                worker_init(ClientSocket, Tab)
            end),
            ok = gen_tcp:controlling_process(ClientSocket, WorkerPid),
            WorkerPid ! {socket_assigned, ClientSocket},
            accept_loop(ListenSocket, Tab);
        {error, _} ->
            ok
    end.

worker_init(ClientSocket, Tab) ->
    receive
        {socket_assigned, ClientSocket} ->
            ok = inet:setopts(ClientSocket, [{active, once}]),
            worker_loop(ClientSocket, Tab, <<>>)
    after 3000 ->
        gen_tcp:close(ClientSocket)
    end.

worker_loop(Socket, Tab, Buffer) ->
    receive
        {tcp, Socket, IncomingData} ->
            Combined = <<Buffer/binary, IncomingData/binary>>,
            {Lines, Remaining} = extract_lines(Combined, []),
            lists:foreach(fun(Line) ->
                Cmd = parse_command(Line),
                Reply = execute_command(Cmd, Tab),
                _ = gen_tcp:send(Socket, Reply)
            end, Lines),
            ok = inet:setopts(Socket, [{active, once}]),
            worker_loop(Socket, Tab, Remaining);
        {tcp_closed, _Socket} ->
            ok;
        {tcp_error, _Socket, _Reason} ->
            ok
    end.

extract_lines(Buffer, Acc) ->
    case binary:split(Buffer, <<"
">>) of
        [Line, Rest] ->
            extract_lines(Rest, [binary:copy(Line) | Acc]);
        [Incomplete] ->
            {lists:reverse(Acc), binary:copy(Incomplete)}
    end.
    
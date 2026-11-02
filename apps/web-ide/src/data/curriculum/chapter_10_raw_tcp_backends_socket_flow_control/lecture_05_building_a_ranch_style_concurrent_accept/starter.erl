-module(tcp_acceptor_pool).

-export([
    handoff_socket/2,
    start_pooled_server/2,
    stop_pooled_server/1,
    start_pool/2,
    get_active_workers/1,
    stop_pool/1
]).

%% @doc Transfers socket ownership to WorkerPid and sends {socket_ready, ClientSocket}.
%% If controlling_process fails, closes ClientSocket and returns {error, Reason}.
-spec handoff_socket(gen_tcp:socket(), pid()) -> ok | {error, term()}.
handoff_socket(_ClientSocket, _WorkerPid) ->
    %% % TODO: Transfer socket ownership to WorkerPid via gen_tcp:controlling_process/2.
    %% % On success, signal the worker process that the socket is ready and return ok.
    %% % On failure, safely close the socket and return {error, Reason}.
    ignore.

%% @doc Boots a pooled TCP server with AcceptorCount concurrent acceptors.
-spec start_pooled_server(pos_integer(), fun((gen_tcp:socket()) -> any())) ->
    {ok, gen_tcp:socket(), inet:port_number(), [pid()]}.
start_pooled_server(_AcceptorCount, _WorkerFun) ->
    %% % TODO:
    %% % 1. Bind an ephemeral listening socket on port 0 in passive raw binary mode.
    %% % 2. Query the assigned kernel port number.
    %% % 3. Spawn AcceptorCount concurrent acceptor loops that accept connections,
    %% %    spawn handlers for WorkerFun, and transfer socket ownership via handoff_socket/2.
    %% % 4. Return {ok, ListenSocket, Port, AcceptorPidsList}.
    ignore.

%% @doc Stops the pooled server by closing ListenSocket.
-spec stop_pooled_server(gen_tcp:socket()) -> ok.
stop_pooled_server(ListenSocket) ->
    gen_tcp:close(ListenSocket).

%% Backward compatibility helpers for pool testing:
start_pool(Port, PoolSize) ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(Port, ListenOpts),
    {ok, ActualPort} = inet:port(ListenSocket),
    ManagerPid = spawn_link(fun() -> manager_init(ListenSocket, PoolSize) end),
    {ok, ManagerPid, ActualPort}.

stop_pool(ManagerPid) ->
    ManagerPid ! stop,
    ok.

get_active_workers(ManagerPid) ->
    Ref = make_ref(),
    ManagerPid ! {get_worker_count, self(), Ref},
    receive {worker_count, Ref, Count} -> Count after 2000 -> 0 end.

manager_init(ListenSocket, PoolSize) ->
    ManagerPid = self(),
    Acceptors = [spawn_link(fun() -> pool_acceptor(ListenSocket, ManagerPid) end) || _ <- lists:seq(1, PoolSize)],
    manager_loop(ListenSocket, Acceptors, []).

manager_loop(ListenSocket, Acceptors, Workers) ->
    receive
        {worker_spawned, WorkerPid} -> manager_loop(ListenSocket, Acceptors, [WorkerPid | Workers]);
        {client_disconnected, WorkerPid} -> manager_loop(ListenSocket, Acceptors, lists:delete(WorkerPid, Workers));
        {get_worker_count, From, Ref} -> From ! {worker_count, Ref, length(Workers)}, manager_loop(ListenSocket, Acceptors, Workers);
        stop -> gen_tcp:close(ListenSocket), [exit(A, kill) || A <- Acceptors], [exit(W, kill) || W <- Workers], ok
    end.

pool_acceptor(ListenSocket, ManagerPid) ->
    case gen_tcp:accept(ListenSocket) of
        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() -> pool_worker_init(ClientSocket, ManagerPid) end),
            ok = handoff_socket(ClientSocket, WorkerPid),
            ManagerPid ! {worker_spawned, WorkerPid},
            pool_acceptor(ListenSocket, ManagerPid);
        {error, _} -> ok
    end.

pool_worker_init(ClientSocket, ManagerPid) ->
    receive
        {socket_assigned, ClientSocket} ->
            ok = inet:setopts(ClientSocket, [{active, once}]),
            pool_worker_loop(ClientSocket, ManagerPid)
    after 2000 -> gen_tcp:close(ClientSocket)
    end.

pool_worker_loop(Socket, ManagerPid) ->
    receive
        {tcp, Socket, Data} ->
            ok = gen_tcp:send(Socket, <<"+REPLY: ", Data/binary>>),
            ok = inet:setopts(Socket, [{active, once}]),
            pool_worker_loop(Socket, ManagerPid);
        {tcp_closed, Socket} -> ManagerPid ! {client_disconnected, self()}, ok;
        {tcp_error, Socket, _Reason} -> ManagerPid ! {client_disconnected, self()}, ok
    end.
    
-module(tcp_flow_worker).
-behaviour(gen_server).

-export([start_link/1, get_stats/1, get_processed_count/1, stop/1, start_server/0, stop_server/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

-record(state, {
    socket :: gen_tcp:socket() | undefined,
    packets_processed = 0 :: non_neg_integer(),
    bytes_processed = 0 :: non_neg_integer(),
    closed = false :: boolean()
}).

-spec start_link(gen_tcp:socket()) -> {ok, pid()} | {error, term()}.
start_link(Socket) ->
    gen_server:start_link(?MODULE, [Socket], []).

-spec get_stats(pid() | atom()) -> map().
get_stats(Server) ->
    gen_server:call(Server, get_stats).

-spec get_processed_count(pid() | atom()) -> non_neg_integer().
get_processed_count(Server) ->
    gen_server:call(Server, get_processed_count).

-spec stop(pid() | atom()) -> ok.
stop(Server) ->
    gen_server:stop(Server).

start_server() ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    Parent = self(),
    ListenPid = spawn_link(fun() ->
        case gen_tcp:accept(ListenSocket) of
            {ok, ClientSocket} ->
                {ok, WorkerPid} = start_link(ClientSocket),
                try register(tcp_flow_worker, WorkerPid) catch _:_ -> ok end,
                ok = gen_tcp:controlling_process(ClientSocket, WorkerPid),
                WorkerPid ! {socket_assigned, ClientSocket},
                Parent ! {worker_ready, WorkerPid};
            _ -> ok
        end
    end),
    {ok, ListenPid, Port}.

stop_server(ListenPid) ->
    case whereis(tcp_flow_worker) of
        undefined -> ok;
        Pid -> try gen_server:stop(Pid) catch _:_ -> ok end
    end,
    exit(ListenPid, kill),
    ok.

init([Socket]) ->
    %% % TODO: Arm the socket for its initial packet using inet:setopts/2 with binary and {active, once}.
    %% % Initialize the state record with the socket, 0 packets_processed, 0 bytes_processed, and closed = false.
    {ok, #state{socket = Socket}};
init(Socket) ->
    init([Socket]).

handle_call(get_stats, _From, State) ->
    Reply = #{
        packets_processed => State#state.packets_processed,
        bytes_processed => State#state.bytes_processed,
        closed => State#state.closed
    },
    {reply, Reply, State};
handle_call(get_processed_count, _From, State) ->
    {reply, State#state.packets_processed, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(stop, State) ->
    {stop, normal, State};
handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info({socket_assigned, Socket}, State) ->
    %% % TODO: Arm the socket with {active, once} now that this process is the controlling process.
    {noreply, State#state{socket = Socket}};
handle_info({tcp, _Socket, _DataBin}, State) ->
    %% % TODO:
    %% % 1. Echo the received binary back to the client prefixed with "+ACK: " via gen_tcp:send/2.
    %% % 2. Crucial: Re-arm the socket with {active, once} via inet:setopts/2 so the next packet can be delivered.
    %% % 3. Increment packets_processed by 1 and bytes_processed by byte_size(DataBin).
    %% % 4. Return {noreply, UpdatedState}.
    {noreply, State};
handle_info({tcp_closed, _Socket}, State) ->
    %% % TODO: Handle client disconnect by updating state with closed = true.
    {noreply, State#state{closed = true}};
handle_info({tcp_error, _Socket, _Reason}, State) ->
    {noreply, State#state{closed = true}};
handle_info(_Other, State) ->
    {noreply, State}.

terminate(_Reason, State) ->
    case State#state.socket of
        undefined -> ok;
        Sock -> try gen_tcp:close(Sock) catch _:_ -> ok end
    end,
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
    
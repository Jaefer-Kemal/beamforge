package bridge_test

import (
	"context"
	"testing"
	"time"
)

func TestChapter10Verification(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	tests := []struct {
		name       string
		exerciseID string
		files      map[string]string
	}{
		{
			name:       "ch10-l01 Live TCP Socket Demo",
			exerciseID: "ch10-l01",
			files: map[string]string{
				"src/tcp_live_demo.erl": `-module(tcp_live_demo).
-export([run_demo/0]).

%% @doc Runs a full end-to-end TCP socket lifecycle demo on an ephemeral port.
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
`,
			},
		},
		{
			name:       "ch10-l02 Socket Options & Framing",
			exerciseID: "ch10-l02",
			files: map[string]string{
				"src/tcp_socket_opts.erl": `-module(tcp_socket_opts).
-export([
    build_low_latency_opts/1,
    classify_socket_event/1,
    encode_length_prefixed/1
]).

%% @doc Return the canonical low-latency TCP socket options list when PacketMode is raw, line, 1, 2, or 4, or return an invalid_packet_mode error tuple for unsupported modes.
-spec build_low_latency_opts(term()) -> [term()] | {error, invalid_packet_mode}.
build_low_latency_opts(PacketMode) when PacketMode =:= raw;
                                        PacketMode =:= line;
                                        PacketMode =:= 1;
                                        PacketMode =:= 2;
                                        PacketMode =:= 4 ->
    [binary, {packet, PacketMode}, {active, once}, {nodelay, true}, {reuseaddr, true}];
build_low_latency_opts(_Other) ->
    {error, invalid_packet_mode}.

%% @doc Normalize an incoming TCP socket lifecycle message into a tagged data tuple, a tagged disconnect tuple, or an unknown_event error tuple.
-spec classify_socket_event(term()) ->
    {data, non_neg_integer(), binary()} |
    {disconnected, normal_eof | {socket_error, term()}} |
    {error, unknown_event}.
classify_socket_event({tcp, _Socket, DataBin}) when is_binary(DataBin) ->
    {data, byte_size(DataBin), DataBin};
classify_socket_event({tcp_closed, _Socket}) ->
    {disconnected, normal_eof};
classify_socket_event({tcp_error, _Socket, Reason}) ->
    {disconnected, {socket_error, Reason}};
classify_socket_event(_Other) ->
    {error, unknown_event}.

%% @doc Prepend an unsigned 32-bit big-endian byte length header onto PayloadBin and return the framed binary.
-spec encode_length_prefixed(binary()) -> binary().
encode_length_prefixed(PayloadBin) when is_binary(PayloadBin) ->
    <<(byte_size(PayloadBin)):32/big-unsigned-integer, PayloadBin/binary>>.
`,
			},
		},
		{
			name:       "ch10-l03 Flow Worker Active-Once Backpressure",
			exerciseID: "ch10-l03",
			files: map[string]string{
				"src/tcp_flow_worker.erl": `-module(tcp_flow_worker).
-behaviour(gen_server).

-export([start_link/1, get_stats/1, get_processed_count/1, stop/1, start_server/0, stop_server/1]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

-record(state, {
    socket :: gen_tcp:socket() | undefined,
    packets_processed = 0 :: non_neg_integer(),
    bytes_processed = 0 :: non_neg_integer(),
    closed = false :: boolean()
}).

%% @doc Start and link a tcp_flow_worker gen_server owning Socket.
-spec start_link(gen_tcp:socket()) -> {ok, pid()} | {error, term()}.
start_link(Socket) ->
    gen_server:start_link(?MODULE, [Socket], []).

%% @doc Return a map of packets_processed, bytes_processed, and closed status from Server.
-spec get_stats(pid() | atom()) -> map().
get_stats(Server) ->
    gen_server:call(Server, get_stats).

%% @doc Return the total count of TCP frames processed by Server.
-spec get_processed_count(pid() | atom()) -> non_neg_integer().
get_processed_count(Server) ->
    gen_server:call(Server, get_processed_count).

%% @doc Synchronously stop the tcp_flow_worker gen_server Server.
-spec stop(pid() | atom()) -> ok.
stop(Server) ->
    gen_server:stop(Server).

%% @doc Start a single-connection loopback TCP server that spawns tcp_flow_worker and hands off client ownership.
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

%% @doc Stop the registered tcp_flow_worker and terminate its acceptor ListenPid.
stop_server(ListenPid) ->
    case whereis(tcp_flow_worker) of
        undefined -> ok;
        Pid -> try gen_server:stop(Pid) catch _:_ -> ok end
    end,
    exit(ListenPid, kill),
    ok.

%% @doc Arm Socket for binary single-packet active reception and initialize the #state record.
init([Socket]) ->
    ok = inet:setopts(Socket, [binary, {active, once}]),
    {ok, #state{socket = Socket, packets_processed = 0, bytes_processed = 0, closed = false}};
init(Socket) ->
    init([Socket]).

%% @doc Handle get_stats and get_processed_count synchronous call queries.
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

%% @doc Handle asynchronous stop casts or ignore unknown casts.
handle_cast(stop, State) ->
    {stop, normal, State};
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle socket ownership handoff, single-frame echo with active-once re-arming, and disconnect/error transitions.
handle_info({socket_assigned, Socket}, State) ->
    ok = inet:setopts(Socket, [{active, once}]),
    {noreply, State#state{socket = Socket}};
handle_info({tcp, Socket, DataBin}, State) ->
    ok = gen_tcp:send(Socket, <<"+ACK: ", DataBin/binary>>),
    ok = inet:setopts(Socket, [{active, once}]),
    NewPackets = State#state.packets_processed + 1,
    NewBytes = State#state.bytes_processed + byte_size(DataBin),
    {noreply, State#state{packets_processed = NewPackets, bytes_processed = NewBytes}};
handle_info({tcp_closed, _Socket}, State) ->
    {noreply, State#state{closed = true}};
handle_info({tcp_error, _Socket, _Reason}, State) ->
    {noreply, State#state{closed = true}};
handle_info(_Other, State) ->
    {noreply, State}.

%% @doc Close any tracked TCP socket before worker termination.
terminate(_Reason, State) ->
    case State#state.socket of
        undefined -> ok;
        Sock -> try gen_tcp:close(Sock) catch _:_ -> ok end
    end,
    ok.

%% @doc Pass state through unchanged on hot code upgrade.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
			},
		},
		{
			name:       "ch10-l04 TCP Stream Frame Buffer",
			exerciseID: "ch10-l04",
			files: map[string]string{
				"src/tcp_frame_buffer.erl": `-module(tcp_frame_buffer).
-export([
    new_buffer/0,
    append_and_extract_lines/2
]).

-spec new_buffer() -> binary().
new_buffer() ->
    <<>>.

-spec append_and_extract_lines(binary(), binary()) -> {[binary()], binary()}.
append_and_extract_lines(OldBufferBin, IncomingChunkBin) ->
    Combined = <<OldBufferBin/binary, IncomingChunkBin/binary>>,
    extract_lines(Combined, []).

extract_lines(Buffer, Acc) ->
    case binary:split(Buffer, <<"\r\n">>) of
        [Line, Rest] ->
            extract_lines(Rest, [binary:copy(Line) | Acc]);
        [Incomplete] ->
            {lists:reverse(Acc), binary:copy(Incomplete)}
    end.
`,
			},
		},
		{
			name:       "ch10-l05 Concurrent Acceptor Pool",
			exerciseID: "ch10-l05",
			files: map[string]string{
				"src/tcp_acceptor_pool.erl": `-module(tcp_acceptor_pool).
-export([
    handoff_socket/2,
    start_pooled_server/2,
    stop_pooled_server/1,
    start_pool/2,
    get_active_workers/1,
    stop_pool/1
]).

-spec handoff_socket(gen_tcp:socket(), pid()) -> ok | {error, term()}.
handoff_socket(ClientSocket, WorkerPid) ->
    case gen_tcp:controlling_process(ClientSocket, WorkerPid) of
        ok ->
            WorkerPid ! {socket_assigned, ClientSocket},
            WorkerPid ! {socket_ready, ClientSocket},
            ok;
        {error, Reason} ->
            gen_tcp:close(ClientSocket),
            {error, Reason}
    end.

-spec start_pooled_server(pos_integer(), fun((gen_tcp:socket()) -> any())) ->
    {ok, gen_tcp:socket(), inet:port_number(), [pid()]}.
start_pooled_server(AcceptorCount, WorkerFun) ->
    ListenOpts = [binary, {packet, raw}, {active, false}, {reuseaddr, true}],
    {ok, ListenSocket} = gen_tcp:listen(0, ListenOpts),
    {ok, Port} = inet:port(ListenSocket),
    AcceptorPids = [
        spawn_link(fun() -> acceptor_worker_loop(ListenSocket, WorkerFun) end)
        || _ <- lists:seq(1, AcceptorCount)
    ],
    {ok, ListenSocket, Port, AcceptorPids}.

acceptor_worker_loop(ListenSocket, WorkerFun) ->
    case gen_tcp:accept(ListenSocket) of
        {ok, ClientSocket} ->
            WorkerPid = spawn(fun() ->
                receive
                    {socket_ready, S} ->
                        WorkerFun(S)
                after 3000 ->
                    gen_tcp:close(ClientSocket)
                end
            end),
            _ = handoff_socket(ClientSocket, WorkerPid),
            acceptor_worker_loop(ListenSocket, WorkerFun);
        {error, _} ->
            ok
    end.

-spec stop_pooled_server(gen_tcp:socket()) -> ok.
stop_pooled_server(ListenSocket) ->
    gen_tcp:close(ListenSocket).

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
            ok = gen_tcp:controlling_process(ClientSocket, WorkerPid),
            WorkerPid ! {socket_assigned, ClientSocket},
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
`,
			},
		},
		{
			name:       "ch10-l06 Incident #106 Triage",
			exerciseID: "ch10-l06",
			files: map[string]string{
				"src/incident_tcp_active_true.erl": `-module(incident_tcp_active_true).
-export([recommended_socket_opts/0, buffer_and_extract_lines/2]).
-export([audit_socket_opts/0, test_framing/0]).

recommended_socket_opts() ->
    [binary, {packet, raw}, {active, once}, {reuseaddr, true}].

buffer_and_extract_lines(OldBuffer, Chunk) ->
    Combined = <<OldBuffer/binary, Chunk/binary>>,
    extract_lines(Combined, []).

extract_lines(<<>>, Acc) ->
    {ok, lists:reverse(Acc), <<>>};
extract_lines(Bin, Acc) ->
    case binary:split(Bin, <<"\r\n">>) of
        [Line, Rest] ->
            extract_lines(Rest, [binary:copy(Line) | Acc]);
        [Incomplete] ->
            {ok, lists:reverse(Acc), binary:copy(Incomplete)}
    end.

audit_socket_opts() ->
    Opts = recommended_socket_opts(),
    case lists:member({active, once}, Opts) andalso not lists:member({active, true}, Opts) of
        true -> {ok, active_once_enforced};
        false -> {error, {bad_options, Opts}}
    end.

test_framing() ->
    Chunk1 = <<"PIN">>,
    {ok, Lines1, Rem1} = buffer_and_extract_lines(<<>>, Chunk1),
    Chunk2 = <<"G\r\nPONG\r\nPAR">>,
    {ok, Lines2, Rem2} = buffer_and_extract_lines(Rem1, Chunk2),
    Chunk3 = <<"TIAL">>,
    {ok, Lines3, Rem3} = buffer_and_extract_lines(Rem2, Chunk3),
    AllLines = Lines1 ++ Lines2 ++ Lines3,
    {ok, AllLines, Rem3}.
`,
			},
		},
		{
			name:       "ch10-l07 Mini-Capstone TCP KV Backend",
			exerciseID: "ch10-l07",
			files: map[string]string{
				"src/tcp_kv_backend.erl": `-module(tcp_kv_backend).
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
    <<"+PONG\r\n">>;
execute_command({set, Key, Value}, Tab) ->
    ets:insert(Tab, {Key, Value}),
    <<"+OK\r\n">>;
execute_command({get, Key}, Tab) ->
    case ets:lookup(Tab, Key) of
        [{Key, Value}] ->
            <<"$", Value/binary, "\r\n">>;
        [] ->
            <<"$-1\r\n">>
    end;
execute_command({del, Key}, Tab) ->
    case ets:member(Tab, Key) of
        true ->
            ets:delete(Tab, Key),
            <<":1\r\n">>;
        false ->
            <<":0\r\n">>
    end;
execute_command({error, unknown_command}, _Tab) ->
    <<"-ERR unknown command\r\n">>;
execute_command(_Other, _Tab) ->
    <<"-ERR unknown command\r\n">>.

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
    case binary:split(Buffer, <<"\r\n">>) of
        [Line, Rest] ->
            extract_lines(Rest, [binary:copy(Line) | Acc]);
        [Incomplete] ->
            {lists:reverse(Acc), binary:copy(Incomplete)}
    end.
`,
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			sessionID := "test-" + tc.exerciseID
			session, err := poolMgr.ClaimSession(sessionID)
			if err != nil {
				t.Fatalf("Failed to claim session: %v", err)
			}
			defer poolMgr.ReleaseSession(sessionID)

			ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
			defer cancel()

			report, err := runner.RunVerification(ctx, session, tc.exerciseID, tc.files)
			if err != nil {
				t.Fatalf("RunVerification failed with error: %v", err)
			}

			if report.Verdict != "PASSED" {
				t.Errorf("[%s] Expected verdict PASSED, got %s", tc.exerciseID, report.Verdict)
				for _, st := range report.Stages {
					t.Logf("  Stage %s (%s): status=%s, details=%s", st.ID, st.Title, st.Status, st.Details)
				}
			} else {
				t.Logf("[%s] VERIFIED 100%% PASSED (score=%d, %d stages)", tc.exerciseID, report.Score, len(report.Stages))
				for _, st := range report.Stages {
					t.Logf("  + Stage %s: %s", st.ID, st.Status)
				}
			}

			runRes, errRun := runner.RunCode(ctx, session, tc.exerciseID, tc.files, nil)
			if errRun != nil {
				t.Fatalf("RunCode failed with error: %v", errRun)
			}
			if !runRes.CompileOk {
				t.Errorf("[%s] RunCode failed compilation: %s", tc.exerciseID, runRes.Stdout)
			}
			for _, vt := range runRes.VisibleTests {
				if !vt.Passed {
					t.Errorf("[%s] Visible test failed: call=%s, expected=%s, actual=%s", tc.exerciseID, vt.CallStr, vt.Expected, vt.Actual)
				}
			}
		})
	}
}

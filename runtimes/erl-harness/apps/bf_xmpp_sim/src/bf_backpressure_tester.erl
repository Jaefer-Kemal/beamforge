-module(bf_backpressure_tester).

-export([
    verify_active_once_backpressure/5
]).

-type report_map() :: #{
    target_pid => pid() | undefined,
    burst_count => pos_integer(),
    observed_queue_len => non_neg_integer(),
    max_allowed_queue_len => non_neg_integer(),
    memory_bytes => non_neg_integer(),
    verdict => binary(),
    hint => binary()
}.

-spec verify_active_once_backpressure(
    node(),
    inet:port_number(),
    pid() | atom(),
    pos_integer(),
    non_neg_integer()
) -> {ok, report_map()} | {error, term(), report_map()}.
verify_active_once_backpressure(Node, ServerPort, Target, BurstCount, MaxAllowedQueueLen) ->
    %% 1. Connect raw TCP client socket first
    ConnectOpts = [binary, {active, false}, {nodelay, true}],
    case gen_tcp:connect("127.0.0.1", ServerPort, ConnectOpts, 3000) of
        {ok, Socket} ->
            %% Allow server acceptor to spawn worker, set controlling process and socket mode
            timer:sleep(50),
            TargetPid = resolve_target_pid(Node, Target),
            case TargetPid of
                undefined ->
                    gen_tcp:close(Socket),
                    Report = #{
                        target_pid => undefined,
                        burst_count => BurstCount,
                        observed_queue_len => 0,
                        max_allowed_queue_len => MaxAllowedQueueLen,
                        memory_bytes => 0,
                        verdict => <<"FAILED">>,
                        hint => <<"Target process not found or not registered on target node.">>
                    },
                    {error, target_process_not_found, Report};
                Pid when is_pid(Pid) ->
                    %% 2. Blast BurstCount frames without reading replies
                    send_ping_burst(Socket, BurstCount),

                    %% Small sleep to let OS socket buffer deliver packets to BEAM port
                    timer:sleep(30),

                    %% 3. Immediately inspect TargetPid message_queue_len & memory
                    {QueueLen, MemBytes} = inspect_process_queue_and_mem(Node, Pid),

                    gen_tcp:close(Socket),

                    Report = #{
                        target_pid => Pid,
                        burst_count => BurstCount,
                        observed_queue_len => QueueLen,
                        max_allowed_queue_len => MaxAllowedQueueLen,
                        memory_bytes => MemBytes,
                        verdict => case QueueLen =< MaxAllowedQueueLen of true -> <<"PASSED">>; false -> <<"FAILED">> end,
                        hint => case QueueLen =< MaxAllowedQueueLen of
                            true ->
                                <<"Socket flow control verified. Process mailbox remained bounded under blast load.">>;
                            false ->
                                <<"Process mailbox flooded with raw TCP packets! Socket was running in {active, true} mode. "
                                  "Switch socket options to {active, once} or {active, N} after reading each frame to enforce TCP backpressure.">>
                        end
                    },

                    case QueueLen =< MaxAllowedQueueLen of
                        true ->
                            {ok, Report};
                        false ->
                            {error, active_true_mailbox_flood, Report}
                    end
            end;
        {error, ConnectErr} ->
            Report = #{
                target_pid => undefined,
                burst_count => BurstCount,
                observed_queue_len => 0,
                max_allowed_queue_len => MaxAllowedQueueLen,
                memory_bytes => 0,
                verdict => <<"FAILED">>,
                hint => list_to_binary(io_lib:format("TCP connection failed to port ~p: ~p", [ServerPort, ConnectErr]))
            },
            {error, {tcp_connect_failed, ConnectErr}, Report}
    end.

send_ping_burst(_Socket, 0) ->
    ok;
send_ping_burst(Socket, N) when N > 0 ->
    Stanza = [
        <<"<iq type='get' id='ping_">>, integer_to_binary(N),
        <<"'><ping xmlns='urn:xmpp:ping'/></iq>\n">>
    ],
    _ = gen_tcp:send(Socket, Stanza),
    send_ping_burst(Socket, N - 1).

resolve_target_pid(Node, Pid) when is_pid(Pid) ->
    case Node =:= node() of
        true ->
            case is_process_alive(Pid) of true -> Pid; false -> undefined end;
        false ->
            case rpc:call(Node, erlang, is_process_alive, [Pid], 2000) of
                true -> Pid;
                _ -> undefined
            end
    end;
resolve_target_pid(Node, RegName) when is_atom(RegName) ->
    case Node =:= node() of
        true ->
            whereis(RegName);
        false ->
            rpc:call(Node, erlang, whereis, [RegName], 2000)
    end.

inspect_process_queue_and_mem(Node, Pid) ->
    InfoFun = fun() ->
        case process_info(Pid, [message_queue_len, memory]) of
            [{message_queue_len, QLen}, {memory, Mem}] -> {QLen, Mem};
            _ -> {0, 0}
        end
    end,
    case Node =:= node() of
        true -> InfoFun();
        false -> rpc:call(Node, erlang, apply, [InfoFun, []], 2000)
    end.

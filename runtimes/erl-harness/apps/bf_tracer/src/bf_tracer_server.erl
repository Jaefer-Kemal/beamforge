-module(bf_tracer_server).
-behaviour(gen_server).

-export([
    start_link/0,
    attach_trace/1,
    detach_trace/0,
    get_topology_snapshot/0
]).

-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

-define(TICK_INTERVAL_MS, 100).
-define(CIRCUIT_BREAKER_MAX_RATE, 500).

-record(state, {
    target_root :: pid() | undefined,
    is_tracing = false :: boolean(),
    throttled = false :: boolean(),
    event_count_window = 0 :: non_neg_integer(),
    last_window_time :: integer(),
    latest_topology = #{} :: map(),
    culprit_pid :: pid() | undefined
}).

start_link() ->
    gen_server:start_link({local, ?MODULE}, ?MODULE, [], []).

attach_trace(TargetPid) when is_pid(TargetPid) ->
    gen_server:call(?MODULE, {attach, TargetPid});
attach_trace(TargetRegName) when is_atom(TargetRegName) ->
    case whereis(TargetRegName) of
        undefined -> {error, process_not_found};
        Pid -> attach_trace(Pid)
    end.

detach_trace() ->
    gen_server:call(?MODULE, detach).

get_topology_snapshot() ->
    gen_server:call(?MODULE, get_topology).

init([]) ->
    Now = erlang:system_time(millisecond),
    erlang:send_after(?TICK_INTERVAL_MS, self(), tick_topology),
    {ok, #state{last_window_time = Now}}.

handle_call({attach, TargetPid}, _From, State) ->
    case is_process_alive(TargetPid) of
        true ->
            %% Attach Erlang trace flags scoped to the target tree
            erlang:trace(TargetPid, true, [procs, send, 'receive', set_on_spawn, timestamp]),
            {reply, ok, State#state{target_root = TargetPid, is_tracing = true, throttled = false, event_count_window = 0}};
        false ->
            {reply, {error, process_not_alive}, State}
    end;

handle_call(detach, _From, State) ->
    erlang:trace(all, false, [all]),
    {reply, ok, State#state{target_root = undefined, is_tracing = false, throttled = false}};

handle_call(get_topology, _From, #state{latest_topology = Topo} = State) ->
    {reply, Topo, State};

handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(tick_topology, #state{target_root = TargetRoot} = State) ->
    NewTopology = case TargetRoot of
        Pid when is_pid(Pid) ->
            case is_process_alive(Pid) of
                true -> collect_tree_topology(Pid);
                false -> #{}
            end;
        _ ->
            #{}
    end,

    %% Check circuit breaker rate window (1000ms rolling)
    Now = erlang:system_time(millisecond),
    WindowDuration = Now - State#state.last_window_time,
    {NextCount, NextThrottled, Culprit} = case WindowDuration >= 1000 of
        true ->
            Rate = State#state.event_count_window,
            case (Rate > ?CIRCUIT_BREAKER_MAX_RATE) andalso (not State#state.throttled) of
                true ->
                    error_logger:warning_msg(
                        "** [bf_tracer] Circuit breaker triggered! Trace rate (~p ev/s) exceeded 500 ev/s limit.~n",
                        [Rate]
                    ),
                    erlang:trace(all, false, [send, 'receive']),
                    {0, true, State#state.culprit_pid};
                false ->
                    {0, State#state.throttled, State#state.culprit_pid}
            end;
        false ->
            {State#state.event_count_window, State#state.throttled, State#state.culprit_pid}
    end,

    NextWindowTime = case WindowDuration >= 1000 of
        true -> Now;
        false -> State#state.last_window_time
    end,

    erlang:send_after(?TICK_INTERVAL_MS, self(), tick_topology),
    {noreply, State#state{
        latest_topology = NewTopology,
        event_count_window = NextCount,
        last_window_time = NextWindowTime,
        throttled = NextThrottled,
        culprit_pid = Culprit
    }};

%% Real-time BEAM trace events
handle_info({trace, FromPid, send, _Msg, _To}, State) ->
    {noreply, State#state{
        event_count_window = State#state.event_count_window + 1,
        culprit_pid = FromPid
    }};

handle_info({trace, Pid, 'receive', _Msg}, State) ->
    {noreply, State#state{
        event_count_window = State#state.event_count_window + 1,
        culprit_pid = Pid
    }};

handle_info({trace, _Pid, spawn, _NewPid, _Mfa}, State) ->
    {noreply, State#state{
        event_count_window = State#state.event_count_window + 1
    }};

handle_info({trace, _Pid, exit, _Reason}, State) ->
    {noreply, State#state{
        event_count_window = State#state.event_count_window + 1
    }};

handle_info(_Other, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    erlang:trace(all, false, [all]),
    ok.

code_change(_OldVsn, State, _Extra) ->
    {ok, State}.

collect_tree_topology(RootPid) ->
    collect_node_info(RootPid, []).

collect_node_info(Pid, Visited) ->
    case lists:member(Pid, Visited) of
        true -> #{};
        false ->
            case process_info(Pid, [registered_name, message_queue_len, memory, reductions, links]) of
                undefined -> #{};
                InfoList ->
                    RegName = proplists:get_value(registered_name, InfoList, undefined),
                    MQLen = proplists:get_value(message_queue_len, InfoList, 0),
                    Mem = proplists:get_value(memory, InfoList, 0),
                    Reds = proplists:get_value(reductions, InfoList, 0),
                    Links = [L || L <- proplists:get_value(links, InfoList, []), is_pid(L)],

                    ChildrenMap = case is_supervisor(Pid) of
                        true ->
                            try supervisor:which_children(Pid) of
                                Children ->
                                    [collect_node_info(CPid, [Pid | Visited]) || {_, CPid, _, _} <- Children, is_pid(CPid)]
                            catch
                                _:_ -> []
                            end;
                        false ->
                            []
                    end,

                    #{
                        pid => atom_to_binary(list_to_atom(pid_to_list(Pid)), utf8),
                        name => case RegName of undefined -> null; Atom -> atom_to_binary(Atom, utf8) end,
                        mailbox_len => MQLen,
                        heap_bytes => Mem,
                        reductions => Reds,
                        links => [atom_to_binary(list_to_atom(pid_to_list(L)), utf8) || L <- Links],
                        children => ChildrenMap
                    }
            end
    end.

is_supervisor(Pid) ->
    case process_info(Pid, dictionary) of
        {dictionary, Dict} ->
            proplists:get_value('$initial_call', Dict) =:= {supervisor, init, 1};
        _ ->
            false
    end.

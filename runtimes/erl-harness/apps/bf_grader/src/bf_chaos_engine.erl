-module(bf_chaos_engine).

-export([
    verify_worker_restart_and_ets_survival/6,
    snapshot_children/2,
    snapshot_ets/2,
    kill_worker/3
]).

-type sup_ref() :: atom() | pid().
-type report_map() :: #{
    old_pid => pid(),
    new_pid => pid(),
    restarted => boolean(),
    sibling_pids_preserved => boolean(),
    ets_survived => boolean(),
    ets_owner_before => pid(),
    ets_owner_after => pid(),
    initial_rows => integer(),
    final_rows => integer(),
    time_taken_ms => integer()
}.

-spec verify_worker_restart_and_ets_survival(
    node(), sup_ref(), term(), atom() | ets:tid(), term(), pos_integer()
) -> {ok, report_map()} | {error, term(), report_map()}.
verify_worker_restart_and_ets_survival(Node, SupRef, ChildId, EtsTable, CrashReason, TimeoutMs) ->
    StartTime = erlang:system_time(millisecond),

    %% 1. Snapshot initial supervisor children
    InitialChildren = snapshot_children(Node, SupRef),
    OldPid = case lists:keyfind(ChildId, 1, InitialChildren) of
        {ChildId, P, _Type, _Modules} when is_pid(P) -> P;
        _ -> undefined
    end,

    InitialSiblings = [{Id, P} || {Id, P, _, _} <- InitialChildren, Id =/= ChildId],

    %% 2. Snapshot initial ETS table properties
    {InitialOwner, InitialSize} = snapshot_ets(Node, EtsTable),

    case is_pid(OldPid) andalso is_process_alive(OldPid) of
        false ->
            Report0 = #{
                old_pid => OldPid,
                new_pid => undefined,
                restarted => false,
                sibling_pids_preserved => false,
                ets_survived => false,
                ets_owner_before => InitialOwner,
                ets_owner_after => undefined,
                initial_rows => InitialSize,
                final_rows => 0,
                time_taken_ms => 0
            },
            {error, target_child_not_running, Report0};
        true ->
            %% 3. Inject chaos fault
            kill_worker(Node, OldPid, CrashReason),

            %% 4. Await supervisor restart of ChildId
            PollRes = await_child_restart(Node, SupRef, ChildId, OldPid, TimeoutMs, 0),
            EndTime = erlang:system_time(millisecond),
            DurationMs = EndTime - StartTime,

            case PollRes of
                {ok, NewPid} ->
                    %% 5. Verify sibling PIDs were preserved (one_for_one invariant)
                    CurrentChildren = snapshot_children(Node, SupRef),
                    CurrentSiblings = [{Id, P} || {Id, P, _, _} <- CurrentChildren, Id =/= ChildId],
                    SiblingsPreserved = lists:sort(InitialSiblings) =:= lists:sort(CurrentSiblings),

                    %% 6. Verify ETS table survived and ownership was restored or held
                    {FinalOwner, FinalSize} = snapshot_ets(Node, EtsTable),
                    EtsSurvived = (FinalOwner =/= undefined) andalso (FinalSize >= InitialSize),

                    Report = #{
                        old_pid => OldPid,
                        new_pid => NewPid,
                        restarted => true,
                        sibling_pids_preserved => SiblingsPreserved,
                        ets_survived => EtsSurvived,
                        ets_owner_before => InitialOwner,
                        ets_owner_after => FinalOwner,
                        initial_rows => InitialSize,
                        final_rows => FinalSize,
                        time_taken_ms => DurationMs
                    },

                    case SiblingsPreserved andalso EtsSurvived of
                        true ->
                            {ok, Report};
                        false ->
                            Reason = case SiblingsPreserved of
                                false -> supervisor_strategy_violated;
                                true -> ets_table_lost_or_corrupted
                            end,
                            {error, Reason, Report}
                    end;
                {error, timeout} ->
                    ReportTimeout = #{
                        old_pid => OldPid,
                        new_pid => undefined,
                        restarted => false,
                        sibling_pids_preserved => false,
                        ets_survived => false,
                        ets_owner_before => InitialOwner,
                        ets_owner_after => undefined,
                        initial_rows => InitialSize,
                        final_rows => 0,
                        time_taken_ms => DurationMs
                    },
                    {error, supervisor_restart_timeout, ReportTimeout}
            end
    end.

snapshot_children(Node, SupRef) ->
    case Node =:= node() of
        true ->
            supervisor:which_children(SupRef);
        false ->
            rpc:call(Node, supervisor, which_children, [SupRef], 3000)
    end.

snapshot_ets(Node, EtsTable) ->
    InfoFun = fun() ->
        case ets:info(EtsTable) of
            undefined -> {undefined, 0};
            InfoList ->
                Owner = proplists:get_value(owner, InfoList),
                Size = proplists:get_value(size, InfoList, 0),
                {Owner, Size}
        end
    end,
    case Node =:= node() of
        true -> InfoFun();
        false -> rpc:call(Node, erlang, apply, [InfoFun, []], 3000)
    end.

kill_worker(Node, Pid, Reason) ->
    case Node =:= node() of
        true ->
            exit(Pid, Reason);
        false ->
            rpc:call(Node, erlang, exit, [Pid, Reason])
    end.

await_child_restart(Node, SupRef, ChildId, OldPid, MaxWaitMs, ElapsedMs) ->
    case ElapsedMs >= MaxWaitMs of
        true ->
            {error, timeout};
        false ->
            Children = snapshot_children(Node, SupRef),
            case lists:keyfind(ChildId, 1, Children) of
                {ChildId, NewPid, _Type, _Mods} when is_pid(NewPid), NewPid =/= OldPid ->
                    case is_process_alive_safe(Node, NewPid) of
                        true -> {ok, NewPid};
                        false ->
                            timer:sleep(10),
                            await_child_restart(Node, SupRef, ChildId, OldPid, MaxWaitMs, ElapsedMs + 10)
                    end;
                _ ->
                    timer:sleep(10),
                    await_child_restart(Node, SupRef, ChildId, OldPid, MaxWaitMs, ElapsedMs + 10)
            end
    end.

is_process_alive_safe(Node, Pid) ->
    case Node =:= node() of
        true -> is_process_alive(Pid);
        false -> rpc:call(Node, erlang, is_process_alive, [Pid])
    end.

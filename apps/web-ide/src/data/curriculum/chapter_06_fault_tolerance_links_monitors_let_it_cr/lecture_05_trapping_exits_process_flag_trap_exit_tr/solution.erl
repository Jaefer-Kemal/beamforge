-module(exit_trapper).
-export([
    start_supervised/1,
    get_worker_pid/1,
    kill_worker/2,
    simulate_exit_truth_table/2,
    supervisor_loop/2
]).

start_supervised(WorkerFun) when is_function(WorkerFun, 0) ->
    InitRef = make_ref(),
    Parent = self(),
    SupPid = spawn(fun() ->
        process_flag(trap_exit, true),
        WorkerPid = spawn_link(WorkerFun),
        Parent ! {InitRef, WorkerPid},
        supervisor_loop(WorkerFun, WorkerPid)
    end),
    receive
        {InitRef, InitialWorker} -> {ok, SupPid, InitialWorker}
    after 1000 ->
        {error, timeout}
    end.

get_worker_pid(SupPid) ->
    Ref = make_ref(),
    SupPid ! {get_worker, self(), Ref},
    receive
        {Ref, WorkerPid} -> {ok, WorkerPid}
    after 1000 ->
        {error, timeout}
    end.

kill_worker(SupPid, Reason) ->
    SupPid ! {kill_worker, Reason},
    ok.

supervisor_loop(WorkerFun, CurrentWorker) ->
    receive
        {get_worker, From, Ref} ->
            From ! {Ref, CurrentWorker},
            supervisor_loop(WorkerFun, CurrentWorker);

        {kill_worker, Reason} ->
            exit(CurrentWorker, Reason),
            supervisor_loop(WorkerFun, CurrentWorker);

        {'EXIT', CurrentWorker, normal} ->
            ok;

        {'EXIT', CurrentWorker, _AbnormalReason} ->
            NewWorker = spawn_link(WorkerFun),
            supervisor_loop(WorkerFun, NewWorker);

        stop ->
            exit(CurrentWorker, shutdown),
            ok
    end.

simulate_exit_truth_table(TrappingBool, SignalReason) ->
    Parent = self(),
    Ref = make_ref(),
    ProbePid = spawn(fun() ->
        process_flag(trap_exit, TrappingBool),
        Parent ! {ready, Ref},
        receive
            Msg -> Parent ! {survived, Ref, Msg}
        after 50 ->
            Parent ! {survived, Ref, none}
        end
    end),
    receive {ready, Ref} -> ok end,
    MonitorRef = erlang:monitor(process, ProbePid),
    exit(ProbePid, SignalReason),
    receive
        {'DOWN', MonitorRef, process, ProbePid, DownReason} ->
            erlang:demonitor(MonitorRef, [flush]),
            {died, DownReason};
        {survived, Ref, Msg} ->
            erlang:demonitor(MonitorRef, [flush]),
            {survived, Msg}
    after 200 ->
        erlang:demonitor(MonitorRef, [flush]),
        {error, timeout}
    end.

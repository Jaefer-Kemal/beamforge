-module(worker_watcher).
-export([
    run_monitored_task/2,
    probe_pid_status/1
]).

run_monitored_task(TaskFun, TimeoutMs) when is_function(TaskFun, 0), is_integer(TimeoutMs) ->
    Caller = self(),
    {WorkerPid, MRef} = spawn_monitor(fun() ->
        Result = TaskFun(),
        Caller ! {task_result, self(), Result}
    end),
    receive
        {task_result, WorkerPid, Result} ->
            erlang:demonitor(MRef, [flush]),
            {ok, Result};
        {'DOWN', MRef, process, WorkerPid, Reason} ->
            Normalized = case Reason of
                {R, _} -> R;
                R      -> R
            end,
            {error, {crashed, Normalized}}
    after TimeoutMs ->
        exit(WorkerPid, kill),
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

probe_pid_status(TargetPid) when is_pid(TargetPid) ->
    MRef = erlang:monitor(process, TargetPid),
    receive
        {'DOWN', MRef, process, TargetPid, Reason} ->
            {dead, Reason}
    after 20 ->
        erlang:demonitor(MRef, [flush]),
        alive
    end.

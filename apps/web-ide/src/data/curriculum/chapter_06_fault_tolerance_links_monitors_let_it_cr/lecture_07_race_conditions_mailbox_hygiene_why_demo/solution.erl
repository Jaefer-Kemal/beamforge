-module(monitor_hygiene).
-export([
    call_with_clean_mailbox/2,
    count_lingering_downs/0
]).

call_with_clean_mailbox(WorkerFun, Input) when is_function(WorkerFun, 1) ->
    Caller = self(),
    {WorkerPid, MRef} = spawn_monitor(fun() ->
        Res = WorkerFun(Input),
        Caller ! {done, self(), Res},
        exit(worker_completed)
    end),
    %% Sleep to allow both reply and exit signals to arrive in mailbox
    timer:sleep(10),
    receive
        {done, WorkerPid, Result} ->
            erlang:demonitor(MRef, [flush]),
            Lingering = count_lingering_downs(),
            {ok, Result, Lingering}
    after 1000 ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

count_lingering_downs() ->
    drain_downs(0).

drain_downs(Count) ->
    receive
        {'DOWN', _Ref, process, _Pid, _Reason} ->
            drain_downs(Count + 1)
    after 0 ->
        Count
    end.

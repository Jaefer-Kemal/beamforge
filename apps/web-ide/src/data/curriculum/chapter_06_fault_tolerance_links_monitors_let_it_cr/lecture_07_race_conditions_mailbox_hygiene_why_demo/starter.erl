-module(monitor_hygiene).
-export([
    call_with_clean_mailbox/2,
    count_lingering_downs/0
]).

%% Architectural Requirement:
%% 1. Spawn monitored worker: {WorkerPid, MRef} = spawn_monitor(...).
%% 2. Worker computes WorkerFun(Input), sends {done, self(), Result} to Caller, exits with worker_completed.
%% 3. Caller sleeps 10ms (timer:sleep(10)), receives {done, WorkerPid, Result},
%%    calls erlang:demonitor(MRef, [flush]), and returns {ok, Result, count_lingering_downs()}.
%% 4. Timeout after 1000ms: demonitor(MRef, [flush]), return {error, timeout}.
call_with_clean_mailbox(WorkerFun, Input) ->
    ok.

%% Architectural Requirement:
%% Drain all lingering {'DOWN', _, process, _, _} messages non-blockingly using 'after 0' and return count.
count_lingering_downs() ->
    ok.

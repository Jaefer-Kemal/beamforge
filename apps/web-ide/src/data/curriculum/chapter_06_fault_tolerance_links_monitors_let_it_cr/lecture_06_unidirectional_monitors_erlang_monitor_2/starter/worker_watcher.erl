-module(worker_watcher).
-export([
    run_monitored_task/2,
    probe_pid_status/1
]).

%% Architectural Requirement:
%% Atomically spawn and monitor TaskFun via spawn_monitor/1.
%% - Success: receive {task_result, WorkerPid, Result} -> demonitor(MRef, [flush]), return {ok, Result}.
%% - Crash: receive {'DOWN', MRef, process, WorkerPid, Reason} -> return {error, {crashed, NormalizedReason}}.
%% - Timeout: after TimeoutMs -> exit(WorkerPid, kill), demonitor(MRef, [flush]), return {error, timeout}.
run_monitored_task(TaskFun, TimeoutMs) ->
    ok.

%% Architectural Requirement:
%% Attach temporary monitor to TargetPid (erlang:monitor(process, TargetPid)).
%% - If {'DOWN', MRef, process, TargetPid, noproc} is immediately received -> return {dead, noproc}.
%% - If no message arrives after 20ms -> demonitor(MRef, [flush]), return alive.
probe_pid_status(TargetPid) ->
    ok.

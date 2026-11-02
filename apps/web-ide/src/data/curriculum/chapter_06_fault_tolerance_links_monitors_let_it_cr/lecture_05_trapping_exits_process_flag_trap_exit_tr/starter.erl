-module(exit_trapper).
-export([
    start_supervised/1,
    get_worker_pid/1,
    kill_worker/2,
    simulate_exit_truth_table/2,
    supervisor_loop/2
]).

%% Architectural Requirement:
%% Spawn supervisor with process_flag(trap_exit, true), spawn_link(WorkerFun), return {ok, SupPid, InitialWorker}.
start_supervised(WorkerFun) ->
    ok.

%% Architectural Requirement:
%% Synchronously query active worker PID via {get_worker, self(), Ref} with 1000ms timeout.
get_worker_pid(SupPid) ->
    ok.

%% Architectural Requirement:
%% Asynchronously forward {kill_worker, Reason} to SupPid.
kill_worker(SupPid, Reason) ->
    ok.

%% Architectural Requirement:
%% Spawn monitored probe with TrappingBool trap_exit, send exit(Probe, SignalReason),
%% and return {survived, ok} or {died, Reason}.
simulate_exit_truth_table(TrappingBool, SignalReason) ->
    ok.

%% Architectural Requirement:
%% Match {get_worker, From, Ref} -> reply {Ref, CurrentWorker} and recurse.
%% Match {kill_worker, Reason} -> exit(CurrentWorker, Reason) and recurse.
%% Match {'EXIT', CurrentWorker, normal} -> do not restart; set CurrentWorker to dead and recurse.
%% Match {'EXIT', CurrentWorker, Reason} -> restart fresh WorkerPid = spawn_link(WorkerFun) and recurse.
supervisor_loop(WorkerFun, CurrentWorker) ->
    ok.

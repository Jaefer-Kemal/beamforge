-module(linked_pipeline).
-export([
    start_linked_pipeline/0,
    compute/2,
    stop_stage1_normal/1,
    crash_stage1/2,
    worker1_loop/1,
    worker2_loop/0
]).

%% Architectural Requirement:
%% Spawn Worker2, spawn_link Worker1 (linked to Worker2), and return {ok, Worker1, Worker2}.
start_linked_pipeline() ->
    ok.

%% Architectural Requirement:
%% Send {transform, self(), Ref, Number} to Worker1, receive {Ref, Result} with 1000ms timeout.
compute(Worker1Pid, Number) ->
    ok.

%% Architectural Requirement:
%% Send {stop_normal, self(), Ref} to Worker1, receive {Ref, ok} with 1000ms timeout.
stop_stage1_normal(Worker1Pid) ->
    ok.

%% Architectural Requirement:
%% Send {crash, Reason} to Worker1, triggering unhandled exit signal across link.
crash_stage1(Worker1Pid, Reason) ->
    ok.

%% Architectural Requirement:
%% Match {transform, Caller, Ref, Value} -> forward {transform_stage2, Caller, Ref, Value * 2} to Worker2 and recurse.
%% Match {stop_normal, From, Ref} -> reply {Ref, ok} and exit(normal).
%% Match {crash, Reason} -> exit(Reason).
worker1_loop(Worker2) ->
    ok.

%% Architectural Requirement:
%% Match {transform_stage2, Caller, Ref, Doubled} -> reply {Ref, Doubled * Doubled} to Caller and recurse.
worker2_loop() ->
    ok.

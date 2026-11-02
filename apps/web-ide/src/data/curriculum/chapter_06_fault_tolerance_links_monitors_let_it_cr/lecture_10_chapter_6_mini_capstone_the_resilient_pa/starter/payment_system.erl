-module(payment_system).
-export([
    start_system/1,
    charge/4,
    trigger_crash_test/1,
    get_active_worker/1,
    get_processed_txs/1,
    stop_system/1,
    watcher_loop/1,
    worker_loop/0
]).

%% Architectural Requirement:
%% Spawn coordinator Watcher with initial state:
%% #{worker_pid => W, worker_mref => MRef, restarts_left => MaxRestarts, restart_count => 0, tx_store => #{}}.
%% Parent receives {InitRef, ok, self()} -> return {ok, WatcherPid}.
start_system(MaxRestarts) ->
    ok.

%% Architectural Requirement:
%% Synchronously request charge from Watcher via {charge, self(), Ref, RequestId, Amount, Currency} (2000ms timeout).
charge(WatcherPid, RequestId, Amount, Currency) ->
    ok.

%% Architectural Requirement:
%% Synchronously command Watcher to crash current worker via {trigger_crash_test, self(), Ref} (2000ms timeout).
trigger_crash_test(WatcherPid) ->
    ok.

%% Architectural Requirement:
%% Synchronously query active worker: {get_active_worker, self(), Ref} -> {ok, WorkerPid, RestartCount}.
get_active_worker(WatcherPid) ->
    ok.

%% Architectural Requirement:
%% Synchronously query committed transaction map: {get_processed_txs, self(), Ref} -> TxStore.
get_processed_txs(WatcherPid) ->
    ok.

%% Architectural Requirement:
%% Synchronously stop Watcher and terminate active worker cleanly via {stop, self(), Ref}.
stop_system(WatcherPid) ->
    ok.

%% Architectural Requirement:
%% Coordinator actor loop managing tx_store idempotency and worker crash recovery:
%% - {charge, From, Ref, RequestId, Amount, Currency}: check maps:find(RequestId, TxStore).
%%   If present, reply {ok, {already_processed, Receipt}}.
%%   If new and worker alive, forward {validate_and_charge, self(), Ref, ...} to WorkerPid.
%%   On {worker_reply, Ref, {ok, Receipt}}: commit to tx_store, reply to From, recurse.
%%   On {worker_reply, Ref, {error, Reason}}: reply error to From, recurse.
%% - {trigger_crash_test, From, Ref}: send crash_test to WorkerPid, wait for {'DOWN', ...}.
%%   If restarts_left > 0: spawn replacement, decrement restarts_left, increment restart_count, reply {ok, Old, New}.
%%   If restarts_left == 0: set worker_pid => undefined, reply {error, max_restarts_exceeded}.
%% - {get_active_worker, From, Ref}: reply {ok, WorkerPid, RestartCount} or {error, no_active_worker}.
%% - {get_processed_txs, From, Ref}: reply TxStore.
%% - {stop, From, Ref}: exit(WorkerPid, shutdown) and reply ok.
watcher_loop(State) ->
    ok.

%% Architectural Requirement:
%% Disposable payment worker:
%% - {validate_and_charge, From, Ref, RequestId, Amount, Currency}:
%%   If Amount =< 0 orelse not is_integer(Amount) -> reply {error, invalid_amount}.
%%   If Currency not in [usd, eur, etb] -> reply {error, unsupported_currency}.
%%   Else -> reply {ok, #{tx_id => RequestId, amount => Amount, currency => Currency, status => settled}}.
%% - crash_test -> exit(simulated_payment_worker_crash).
%% - stop -> ok.
worker_loop() ->
    ok.

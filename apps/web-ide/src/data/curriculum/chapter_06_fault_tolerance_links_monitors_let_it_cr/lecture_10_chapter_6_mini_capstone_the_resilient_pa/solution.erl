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

start_system(MaxRestarts) when is_integer(MaxRestarts), MaxRestarts >= 0 ->
    InitRef = make_ref(),
    Parent = self(),
    WatcherPid = spawn(fun() ->
        {WorkerPid, MRef} = spawn_monitor(fun() -> worker_loop() end),
        State = #{
            worker_pid => WorkerPid,
            worker_mref => MRef,
            restarts_left => MaxRestarts,
            restart_count => 0,
            tx_store => #{}
        },
        Parent ! {InitRef, ok, self()},
        watcher_loop(State)
    end),
    receive
        {InitRef, ok, Pid} -> {ok, Pid}
    after 1000 ->
        {error, timeout}
    end.

charge(WatcherPid, RequestId, Amount, Currency) ->
    Ref = make_ref(),
    WatcherPid ! {charge, self(), Ref, RequestId, Amount, Currency},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

trigger_crash_test(WatcherPid) ->
    Ref = make_ref(),
    WatcherPid ! {trigger_crash_test, self(), Ref},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

get_active_worker(WatcherPid) ->
    Ref = make_ref(),
    WatcherPid ! {get_active_worker, self(), Ref},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

get_processed_txs(WatcherPid) ->
    Ref = make_ref(),
    WatcherPid ! {get_processed_txs, self(), Ref},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        #{}
    end.

stop_system(WatcherPid) ->
    Ref = make_ref(),
    WatcherPid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        ok
    end.

watcher_loop(State = #{worker_pid := WorkerPid,
                       worker_mref := WorkerMRef,
                       restarts_left := RestartsLeft,
                       restart_count := RestartCount,
                       tx_store := TxStore}) ->
    receive
        {charge, From, Ref, RequestId, Amount, Currency} ->
            case maps:find(RequestId, TxStore) of
                {ok, SavedReceipt} ->
                    From ! {reply, Ref, {ok, {already_processed, SavedReceipt}}},
                    watcher_loop(State);
                error when is_pid(WorkerPid) ->
                    WorkerPid ! {validate_and_charge, self(), Ref, RequestId, Amount, Currency},
                    receive
                        {worker_reply, Ref, {ok, Receipt}} ->
                            NewTxStore = maps:put(RequestId, Receipt, TxStore),
                            From ! {reply, Ref, {ok, Receipt}},
                            watcher_loop(State#{tx_store => NewTxStore});
                        {worker_reply, Ref, {error, Reason}} ->
                            From ! {reply, Ref, {error, Reason}},
                            watcher_loop(State)
                    after 1000 ->
                        From ! {reply, Ref, {error, worker_timeout}},
                        watcher_loop(State)
                    end;
                error ->
                    From ! {reply, Ref, {error, no_active_worker}},
                    watcher_loop(State)
            end;

        {trigger_crash_test, From, Ref} ->
            if
                is_pid(WorkerPid) andalso RestartsLeft > 0 ->
                    OldPid = WorkerPid,
                    WorkerPid ! crash_test,
                    receive
                        {'DOWN', WorkerMRef, process, OldPid, _Reason} ->
                            {NewPid, NewMRef} = spawn_monitor(fun() -> worker_loop() end),
                            NewState = State#{
                                worker_pid => NewPid,
                                worker_mref => NewMRef,
                                restarts_left => RestartsLeft - 1,
                                restart_count => RestartCount + 1
                            },
                            From ! {reply, Ref, {ok, OldPid, NewPid}},
                            watcher_loop(NewState)
                    after 1000 ->
                        From ! {reply, Ref, {error, crash_timeout}},
                        watcher_loop(State)
                    end;
                is_pid(WorkerPid) ->
                    OldPid = WorkerPid,
                    WorkerPid ! crash_test,
                    receive
                        {'DOWN', WorkerMRef, process, OldPid, _Reason} ->
                            NewState = State#{
                                worker_pid => undefined,
                                worker_mref => undefined,
                                restarts_left => 0,
                                restart_count => RestartCount + 1
                            },
                            From ! {reply, Ref, {error, max_restarts_exceeded}},
                            watcher_loop(NewState)
                    after 1000 ->
                        From ! {reply, Ref, {error, crash_timeout}},
                        watcher_loop(State)
                    end;
                true ->
                    From ! {reply, Ref, {error, no_active_worker}},
                    watcher_loop(State)
            end;

        {'DOWN', WorkerMRef, process, WorkerPid, _CrashReason} ->
            if
                RestartsLeft > 0 ->
                    {NewPid, NewMRef} = spawn_monitor(fun() -> worker_loop() end),
                    watcher_loop(State#{
                        worker_pid => NewPid,
                        worker_mref => NewMRef,
                        restarts_left => RestartsLeft - 1,
                        restart_count => RestartCount + 1
                    });
                true ->
                    watcher_loop(State#{
                        worker_pid => undefined,
                        worker_mref => undefined,
                        restarts_left => 0
                    })
            end;

        {get_active_worker, From, Ref} ->
            if
                is_pid(WorkerPid) ->
                    From ! {reply, Ref, {ok, WorkerPid, RestartCount}};
                true ->
                    From ! {reply, Ref, {error, no_active_worker}}
            end,
            watcher_loop(State);

        {get_processed_txs, From, Ref} ->
            From ! {reply, Ref, TxStore},
            watcher_loop(State);

        {stop, From, Ref} ->
            if
                is_pid(WorkerPid) ->
                    exit(WorkerPid, shutdown);
                true ->
                    ok
            end,
            From ! {reply, Ref, ok},
            ok
    end.

worker_loop() ->
    receive
        {validate_and_charge, From, Ref, RequestId, Amount, Currency} ->
            if
                not is_integer(Amount) orelse Amount =< 0 ->
                    From ! {worker_reply, Ref, {error, invalid_amount}},
                    worker_loop();
                Currency =/= usd andalso Currency =/= eur andalso Currency =/= etb ->
                    From ! {worker_reply, Ref, {error, unsupported_currency}},
                    worker_loop();
                true ->
                    Receipt = #{
                        tx_id => RequestId,
                        amount => Amount,
                        currency => Currency,
                        status => settled
                    },
                    From ! {worker_reply, Ref, {ok, Receipt}},
                    worker_loop()
            end;

        crash_test ->
            exit(simulated_payment_worker_crash);

        stop ->
            ok
    end.

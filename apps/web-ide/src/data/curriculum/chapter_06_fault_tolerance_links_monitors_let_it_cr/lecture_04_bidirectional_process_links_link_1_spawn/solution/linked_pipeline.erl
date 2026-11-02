-module(linked_pipeline).
-export([
    start_linked_pipeline/0,
    compute/2,
    stop_stage1_normal/1,
    crash_stage1/2,
    worker1_loop/1,
    worker2_loop/0
]).

start_linked_pipeline() ->
    Worker2 = spawn(fun() -> worker2_loop() end),
    Worker1 = spawn_link(fun() ->
        link(Worker2),
        worker1_loop(Worker2)
    end),
    {ok, Worker1, Worker2}.

compute(Worker1Pid, Number) ->
    Ref = make_ref(),
    Worker1Pid ! {transform, self(), Ref, Number},
    receive
        {Ref, Result} -> {ok, Result}
    after 1000 ->
        {error, timeout}
    end.

stop_stage1_normal(Worker1Pid) ->
    Ref = make_ref(),
    Worker1Pid ! {stop_normal, self(), Ref},
    receive
        {Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

crash_stage1(Worker1Pid, Reason) ->
    Worker1Pid ! {crash, Reason},
    ok.

worker1_loop(Worker2) ->
    receive
        {transform, Caller, Ref, Value} when is_number(Value) ->
            Doubled = Value * 2,
            Worker2 ! {transform_stage2, Caller, Ref, Doubled},
            worker1_loop(Worker2);
        {stop_normal, From, Ref} ->
            From ! {Ref, ok},
            exit(normal);
        {crash, Reason} ->
            exit(Reason)
    end.

worker2_loop() ->
    receive
        {transform_stage2, Caller, Ref, Doubled} ->
            Squared = Doubled * Doubled,
            Caller ! {Ref, Squared},
            worker2_loop()
    end.

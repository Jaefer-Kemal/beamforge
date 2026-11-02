-module(incident_hanging_call).
-export([
    start_pricing_worker/0,
    start_worker/0,
    call_pricing_worker/2,
    worker_loop/0
]).

start_pricing_worker() ->
    Pid = spawn(fun() -> worker_loop() end),
    {ok, Pid}.

start_worker() ->
    start_pricing_worker().

call_pricing_worker(WorkerPid, Item) ->
    MRef = erlang:monitor(process, WorkerPid),
    WorkerPid ! {get_price, self(), MRef, Item},
    receive
        {price, MRef, Price} ->
            erlang:demonitor(MRef, [flush]),
            {ok, Price};
        {'DOWN', MRef, process, WorkerPid, Reason} ->
            NormReason = case Reason of
                {R, _} -> R;
                R      -> R
            end,
            {error, {worker_down, NormReason}}
    after 5000 ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

worker_loop() ->
    receive
        {get_price, From, Ref, widget_a} ->
            From ! {price, Ref, 49.99},
            worker_loop();
        {get_price, From, Ref, widget_b} ->
            From ! {price, Ref, 19.99},
            worker_loop();
        {get_price, _From, _Ref, poison_item} ->
            1 / 0;
        stop ->
            ok
    end.

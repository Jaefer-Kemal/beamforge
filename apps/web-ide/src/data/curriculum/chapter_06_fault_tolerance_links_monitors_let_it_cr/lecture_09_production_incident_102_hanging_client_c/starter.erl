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

%% Backward-compatible alias
start_worker() ->
    start_pricing_worker().

%% % TODO [INC-102 Triage]:
%% The caller hangs for 5,000ms when the worker process crashes mid-request.
%% Eliminate blind timeouts by attaching a process monitor before sending,
%% handling instant 'DOWN' notifications, and demonitoring on success.
call_pricing_worker(WorkerPid, Item) ->
    Ref = make_ref(),
    WorkerPid ! {get_price, self(), Ref, Item},
    receive
        {price, Ref, Price} ->
            {ok, Price}
    after 5000 ->
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
            %% Deliberate production crash simulation!
            1 / 0;
        stop ->
            ok
    end.

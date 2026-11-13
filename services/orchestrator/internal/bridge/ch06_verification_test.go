package bridge_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/beamforge/orchestrator/internal/bridge"
	"github.com/beamforge/orchestrator/internal/pool"
)

func setupTestRunner(t *testing.T) (*bridge.Runner, *pool.Manager) {
	cwd, _ := os.Getwd()
	dir := cwd
	for {
		if _, err := os.Stat(filepath.Join(dir, "runtimes", "erl-harness", "ebin")); err == nil {
			break
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatalf("Failed to locate project root from %s", cwd)
		}
		dir = parent
	}
	projectRoot := dir

	poolMgr, err := pool.NewManager(projectRoot)
	if err != nil {
		t.Fatalf("Failed to initialize pool manager: %v", err)
	}

	runner := bridge.NewRunner(poolMgr)
	return runner, poolMgr
}

func TestChapter6Verification(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	exceptionClassifierSolution := `-module(exception_classifier).
-export([
    check_payment/1,
    safe_check/1,
    trigger_class/2
]).

%% @doc Validates payment parameters against transaction rules, raising throw, error, or exit on anomalies.
check_payment({payment, Amount, Currency}) ->
    if
        not is_integer(Amount) ->
            erlang:error(bad_amount_type);
        Amount < 0 ->
            throw(negative_amount);
        Amount =:= 0 ->
            exit(zero_payment_abort);
        Currency =/= usd andalso Currency =/= eur andalso Currency =/= etb ->
            throw({unsupported_currency, Currency});
        true ->
            {approved, Amount, Currency}
    end;
check_payment(_InvalidTuple) ->
    erlang:error(invalid_payment_tuple).

%% @doc Evaluates payment validation inside a protected try-catch block, normalizing exceptions into tagged tuples.
safe_check(PaymentTuple) ->
    try check_payment(PaymentTuple) of
        {approved, Amount, Currency} ->
            {approved, Amount, Currency}
    catch
        throw:Reason ->
            {rejected, Reason};
        error:Reason ->
            {bug_detected, Reason};
        exit:Reason ->
            {process_aborted, Reason}
    end.

%% @doc Directly invokes the specified Erlang exception primitive with the provided reason term.
trigger_class(throw, Reason) ->
    throw(Reason);
trigger_class(error, Reason) ->
    erlang:error(Reason);
trigger_class(exit, Reason) ->
    exit(Reason).
`

	domainValidatorSolution := `-module(domain_validator).
-export([
    safe_divide/2,
    check_amount/1,
    validate_email/1,
    process_checkout_input/3
]).

%% @doc Safely divides Numerator by Denominator, returning {ok, Quotient} or tagged error.
safe_divide(Num, Den) when is_number(Num), is_number(Den) ->
    if
        Den == 0 -> {error, division_by_zero};
        true     -> {ok, Num / Den}
    end;
safe_divide(_Num, _Den) ->
    {error, non_numeric}.

%% @doc Validates that an amount is a strictly positive integer, returning {ok, Amount} or tagged error.
check_amount(Amount) when is_integer(Amount) ->
    if
        Amount > 0 -> {ok, Amount};
        true       -> {error, non_positive_amount}
    end;
check_amount(_Other) ->
    {error, invalid_type}.

%% @doc Validates email binary format, returning {ok, EmailBin} or tagged error.
validate_email(EmailBin) when is_binary(EmailBin) ->
    case binary:split(EmailBin, <<"@">>) of
        [User, Domain] when byte_size(User) > 0, byte_size(Domain) > 0 ->
            case binary:match(Domain, <<".">>) of
                nomatch -> {error, invalid_email};
                _       -> {ok, EmailBin}
            end;
        _ ->
            {error, invalid_email}
    end;
validate_email(_Other) ->
    {error, invalid_email}.

%% @doc Coordinates checkout input validation pipeline, returning map or first failing error.
process_checkout_input(EmailBin, TotalAmount, SplitCount) ->
    case validate_email(EmailBin) of
        {ok, ValidEmail} ->
            case check_amount(TotalAmount) of
                {ok, ValidTotal} ->
                    case safe_divide(ValidTotal, SplitCount) of
                        {ok, Share} ->
                            {ok, #{email => ValidEmail, per_person => Share}};
                        {error, DivErr} ->
                            {error, DivErr}
                    end;
                {error, AmtErr} ->
                    {error, AmtErr}
            end;
        {error, EmailErr} ->
            {error, EmailErr}
    end.
`

	boundaryParserSolution := `-module(boundary_parser).
-export([
    safe_parse_payload/1,
    with_resource_cleanup/3,
    process_transaction_log/2
]).

%% @doc Safely decodes an external binary term using [safe] atom protection.
safe_parse_payload(Binary) when is_binary(Binary) ->
    try erlang:binary_to_term(Binary, [safe]) of
        Term ->
            {ok, Term}
    catch
        Class:Reason ->
            {error, {Class, Reason}}
    end;
safe_parse_payload(_Other) ->
    {error, {error, badarg}}.

%% @doc Executes ActionFun with an acquired resource, guaranteeing ReleaseFun in after.
with_resource_cleanup(AcquireFun, ActionFun, ReleaseFun)
  when is_function(AcquireFun, 0), is_function(ActionFun, 1), is_function(ReleaseFun, 1) ->
    Resource = AcquireFun(),
    try ActionFun(Resource) of
        Result ->
            {ok, Result}
    catch
        Class:Reason ->
            {error, {Class, Reason}}
    after
        ReleaseFun(Resource)
    end.

%% @doc Iterates through transaction lines, ensuring file close notification on exit.
process_transaction_log(LinesList, CloseNotifyPid)
  when is_list(LinesList), is_pid(CloseNotifyPid) ->
    try
        lists:foreach(fun(Line) ->
            case Line of
                <<"CORRUPT_LINE">> -> erlang:error(transaction_processing_failed);
                _ValidLine         -> ok
            end
        end, LinesList),
        ok
    after
        CloseNotifyPid ! file_handle_closed
    end.
`

	linkedPipelineSolution := `-module(linked_pipeline).
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

compute(Worker1Pid, Number) when is_pid(Worker1Pid), is_number(Number) ->
    Ref = make_ref(),
    Worker1Pid ! {transform, self(), Ref, Number},
    receive
        {Ref, Result} -> {ok, Result}
    after 1000 ->
        {error, timeout}
    end.

stop_stage1_normal(Worker1Pid) when is_pid(Worker1Pid) ->
    Ref = make_ref(),
    Worker1Pid ! {stop_normal, self(), Ref},
    receive
        {Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

crash_stage1(Worker1Pid, Reason) when is_pid(Worker1Pid) ->
    Worker1Pid ! {crash, Reason},
    ok.

worker1_loop(Worker2) when is_pid(Worker2) ->
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
        {transform_stage2, Caller, Ref, Doubled} when is_number(Doubled) ->
            Squared = Doubled * Doubled,
            Caller ! {Ref, Squared},
            worker2_loop()
    end.
`

	exitTrapperSolution := `-module(exit_trapper).
-export([
    start_supervised/1,
    get_worker_pid/1,
    kill_worker/2,
    simulate_exit_truth_table/2,
    supervisor_loop/2
]).

%% @doc Spawns a supervisor process that traps exit signals and links to an initial worker.
start_supervised(WorkerFun) when is_function(WorkerFun, 0) ->
    InitRef = make_ref(),
    Parent = self(),
    SupPid = spawn(fun() ->
        process_flag(trap_exit, true),
        WorkerPid = spawn_link(WorkerFun),
        Parent ! {InitRef, WorkerPid},
        supervisor_loop(WorkerFun, WorkerPid)
    end),
    receive
        {InitRef, InitialWorker} -> {ok, SupPid, InitialWorker}
    after 1000 ->
        {error, timeout}
    end.

%% @doc Queries the supervisor for the process identifier of the currently active worker.
get_worker_pid(SupPid) when is_pid(SupPid) ->
    Ref = make_ref(),
    SupPid ! {get_worker, self(), Ref},
    receive
        {Ref, WorkerPid} -> {ok, WorkerPid}
    after 1000 ->
        {error, timeout}
    end.

%% @doc Requests the supervisor to asynchronously terminate its active worker with an exit signal.
kill_worker(SupPid, Reason) when is_pid(SupPid) ->
    SupPid ! {kill_worker, Reason},
    ok.

%% @doc Tail-recursive supervisor loop managing worker lifecycle, exit trapping, and restarts.
supervisor_loop(WorkerFun, CurrentWorker) ->
    receive
        {get_worker, From, Ref} ->
            From ! {Ref, CurrentWorker},
            supervisor_loop(WorkerFun, CurrentWorker);

        {kill_worker, Reason} ->
            exit(CurrentWorker, Reason),
            supervisor_loop(WorkerFun, CurrentWorker);

        {'EXIT', CurrentWorker, normal} ->
            ok;

        {'EXIT', CurrentWorker, _AbnormalReason} ->
            NewWorker = spawn_link(WorkerFun),
            supervisor_loop(WorkerFun, NewWorker);

        stop ->
            exit(CurrentWorker, shutdown),
            ok
    end.

%% @doc Simulates exit signal dispatch semantics across process trapping flags and signal reasons.
simulate_exit_truth_table(TrappingBool, SignalReason) when is_boolean(TrappingBool) ->
    Parent = self(),
    Ref = make_ref(),
    ProbePid = spawn(fun() ->
        process_flag(trap_exit, TrappingBool),
        Parent ! {ready, Ref},
        receive
            Msg -> Parent ! {survived, Ref, Msg}
        after 50 ->
            Parent ! {survived, Ref, none}
        end
    end),
    receive {ready, Ref} -> ok end,
    MonitorRef = erlang:monitor(process, ProbePid),
    exit(ProbePid, SignalReason),
    receive
        {'DOWN', MonitorRef, process, ProbePid, DownReason} ->
            erlang:demonitor(MonitorRef, [flush]),
            {died, DownReason};
        {survived, Ref, Msg} ->
            erlang:demonitor(MonitorRef, [flush]),
            {survived, Msg}
    after 200 ->
        erlang:demonitor(MonitorRef, [flush]),
        {error, timeout}
    end.
`

	workerWatcherSolution := `-module(worker_watcher).
-export([
    run_monitored_task/2,
    probe_pid_status/1
]).

%% @doc Executes a computation under an atomic monitor with crash isolation and timeout protection.
run_monitored_task(TaskFun, TimeoutMs) when is_function(TaskFun, 0), is_integer(TimeoutMs) ->
    Caller = self(),
    {WorkerPid, MRef} = spawn_monitor(fun() ->
        Result = TaskFun(),
        Caller ! {task_result, self(), Result}
    end),
    receive
        {task_result, WorkerPid, Result} ->
            erlang:demonitor(MRef, [flush]),
            {ok, Result};
        {'DOWN', MRef, process, WorkerPid, Reason} ->
            Normalized = case Reason of
                {R, _} -> R;
                R      -> R
            end,
            {error, {crashed, Normalized}}
    after TimeoutMs ->
        exit(WorkerPid, kill),
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

%% @doc Probes whether a process is alive or dead, demonstrating the race-free noproc invariant.
probe_pid_status(TargetPid) when is_pid(TargetPid) ->
    MRef = erlang:monitor(process, TargetPid),
    receive
        {'DOWN', MRef, process, TargetPid, Reason} ->
            {dead, Reason}
    after 20 ->
        erlang:demonitor(MRef, [flush]),
        alive
    end.
`

	const monitorHygieneSolution = `-module(monitor_hygiene).
-export([
    call_with_clean_mailbox/2,
    count_lingering_downs/0
]).

%% @doc Executes an ephemeral worker task with monitor mailbox hygiene, returning the task result and count of any unpurged monitor exit messages.
call_with_clean_mailbox(WorkerFun, Input) when is_function(WorkerFun, 1) ->
    Caller = self(),
    {WorkerPid, MRef} = spawn_monitor(fun() ->
        Res = WorkerFun(Input),
        Caller ! {done, self(), Res},
        exit(worker_completed)
    end),
    %% Allow momentary convergence for reply and termination signal
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

%% @doc Non-blockingly drains and counts unhandled process monitor exit notifications from the calling process mailbox.
count_lingering_downs() ->
    drain_downs(0).

drain_downs(Count) ->
    receive
        {'DOWN', _Ref, process, _Pid, _Reason} ->
            drain_downs(Count + 1)
    after 0 ->
        Count
    end.
`

	const myGenServerSolution = `-module(my_gen_server).
-export([
    start/2,
    call/3,
    cast/2,
    stop/1,
    choose_primitive/1,
    loop/2
]).

%% @doc Evaluate an architectural scenario atom and return the recommended failure isolation primitive atom.
choose_primitive(tightly_coupled_peers)    -> use_link;
choose_primitive(supervisor_to_worker)     -> use_link_with_trap_exit;
choose_primitive(client_to_server_request) -> use_monitor;
choose_primitive(independent_watcher)      -> use_monitor.

%% @doc Spawn and initialize a generic server process executing the callback module lifecycle.
start(CallbackMod, InitArg) ->
    InitRef = make_ref(),
    Parent = self(),
    _Pid = spawn(fun() ->
        case CallbackMod:init(InitArg) of
            {ok, InitialState} ->
                Parent ! {InitRef, ok, self()},
                loop(CallbackMod, InitialState);
            {error, Reason} ->
                Parent ! {InitRef, error, Reason}
        end
    end),
    receive
        {InitRef, ok, ServerPid} -> {ok, ServerPid};
        {InitRef, error, Reason} -> {error, Reason}
    after 1000 ->
        {error, init_timeout}
    end.

%% @doc Issue a monitor-backed synchronous call to the server process with immediate crash detection.
call(ServerPid, Request, Timeout) ->
    MRef = erlang:monitor(process, ServerPid),
    ServerPid ! {'$gen_call', {self(), MRef}, Request},
    receive
        {MRef, Reply} ->
            erlang:demonitor(MRef, [flush]),
            Reply;
        {'DOWN', MRef, process, ServerPid, Reason} ->
            {error, {server_crashed, Reason}}
    after Timeout ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

%% @doc Dispatch an asynchronous fire-and-forget message to the target server process.
cast(ServerPid, Request) ->
    ServerPid ! {'$gen_cast', Request},
    ok.

%% @doc Synchronously request the server process to terminate cleanly and await completion.
stop(ServerPid) ->
    call(ServerPid, stop, 1000).

%% @doc Recursive server message loop processing synchronous calls and asynchronous casts.
loop(CallbackMod, State) ->
    receive
        {'$gen_call', {From, MRef}, stop} ->
            From ! {MRef, ok},
            ok;

        {'$gen_call', {From, MRef}, Request} ->
            case CallbackMod:handle_call(Request, From, State) of
                {reply, Reply, NewState} ->
                    From ! {MRef, Reply},
                    loop(CallbackMod, NewState);
                {stop, Reason, Reply, _FinalState} ->
                    From ! {MRef, Reply},
                    exit(Reason)
            end;

        {'$gen_cast', Request} ->
            case CallbackMod:handle_cast(Request, State) of
                {noreply, NewState} ->
                    loop(CallbackMod, NewState);
                {stop, Reason, _FinalState} ->
                    exit(Reason)
            end
    end.
`

	tests := []struct {
		name         string
		exerciseID   string
		files        map[string]string
		wantScore    int
		wantStages   int
		visibleCount int
	}{
		{
			name:       "ch06-l01 Sequential Exceptions",
			exerciseID: "ch06-l01",
			files: map[string]string{
				"src/exception_classifier.erl": exceptionClassifierSolution,
			},
			wantScore:    100,
			wantStages:   4,
			visibleCount: 4,
		},
		{
			name:         "ch06-l02 Safe Operations & Return Values",
			exerciseID:   "ch06-l02",
			files:        map[string]string{"src/domain_validator.erl": domainValidatorSolution},
			wantScore:    100,
			wantStages:   5,
			visibleCount: 3,
		},
		{
			name:         "ch06-l03 Guaranteed Resource Cleanup",
			exerciseID:   "ch06-l03",
			files:        map[string]string{"src/boundary_parser.erl": boundaryParserSolution},
			wantScore:    100,
			wantStages:   5,
			visibleCount: 3,
		},
		{
			name:         "ch06-l04 Bidirectional Process Links",
			exerciseID:   "ch06-l04",
			files:        map[string]string{"src/linked_pipeline.erl": linkedPipelineSolution},
			wantScore:    100,
			wantStages:   5,
			visibleCount: 3,
		},
		{
			name:         "ch06-l05 Trapping Exits & Truth Table",
			exerciseID:   "ch06-l05",
			files:        map[string]string{"src/exit_trapper.erl": exitTrapperSolution},
			wantScore:    100,
			wantStages:   5,
			visibleCount: 3,
		},
		{
			name:         "ch06-l06 Unidirectional Monitors & noproc",
			exerciseID:   "ch06-l06",
			files:        map[string]string{"src/worker_watcher.erl": workerWatcherSolution},
			wantScore:    100,
			wantStages:   6,
			visibleCount: 3,
		},
		{
			name:         "ch06-l07 Monitor Mailbox Hygiene",
			exerciseID:   "ch06-l07",
			files:        map[string]string{"src/monitor_hygiene.erl": monitorHygieneSolution},
			wantScore:    100,
			wantStages:   4,
			visibleCount: 2,
		},
		{
			name:         "ch06-l08 Building my_gen_server:call/3",
			exerciseID:   "ch06-l08",
			files:        map[string]string{"src/my_gen_server.erl": myGenServerSolution},
			wantScore:    100,
			wantStages:   5,
			visibleCount: 2,
		},
		{
			name:       "ch06-l09 Production Incident #102",
			exerciseID: "ch06-l09",
			files: map[string]string{
				"src/incident_hanging_call.erl": `-module(incident_hanging_call).
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

call_pricing_worker(WorkerPid, Sku) ->
    MRef = erlang:monitor(process, WorkerPid),
    WorkerPid ! {quote_request, self(), MRef, Sku},
    receive
        {quote_reply, MRef, Price} ->
            erlang:demonitor(MRef, [flush]),
            {ok, Price};
        {'DOWN', MRef, process, WorkerPid, Reason} ->
            {error, {worker_down, Reason}}
    after 5000 ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

worker_loop() ->
    receive
        {quote_request, From, Ref, widget_a} ->
            From ! {quote_reply, Ref, 49.99},
            worker_loop();
        {quote_request, From, Ref, widget_b} ->
            From ! {quote_reply, Ref, 19.50},
            worker_loop();
        {quote_request, _From, _Ref, poison_item} ->
            _Bug = 1 / 0,
            worker_loop();
        stop ->
            ok
    end.
`,
			},
		},
		{
			name:       "ch06-l10 Payment System Mini-Capstone",
			exerciseID: "ch06-l10",
			files: map[string]string{
				"src/payment_system.erl": `-module(payment_system).
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

start_system(MaxRestarts) ->
    WatcherPid = spawn(fun() ->
        {WorkerPid, MRef} = spawn_monitor(fun() -> worker_loop() end),
        watcher_loop(#{
            worker_pid => WorkerPid,
            worker_mref => MRef,
            restarts_left => MaxRestarts,
            restart_count => 0,
            tx_store => #{}
        })
    end),
    {ok, WatcherPid}.

charge(WatcherPid, RequestId, Amount, Currency) ->
    Ref = make_ref(),
    WatcherPid ! {charge, self(), Ref, RequestId, Amount, Currency},
    receive
        {reply, Ref, Result} -> Result
    after 2000 -> {error, timeout}
    end.

trigger_crash_test(WatcherPid) ->
    Ref = make_ref(),
    WatcherPid ! {trigger_crash, self(), Ref},
    receive
        {reply, Ref, Result} -> Result
    after 2000 -> {error, timeout}
    end.

get_active_worker(WatcherPid) ->
    Ref = make_ref(),
    WatcherPid ! {get_active_worker, self(), Ref},
    receive
        {reply, Ref, Result} -> Result
    after 1000 -> {error, timeout}
    end.

get_processed_txs(WatcherPid) ->
    Ref = make_ref(),
    WatcherPid ! {get_processed_txs, self(), Ref},
    receive
        {reply, Ref, Result} -> Result
    after 1000 -> #{}
    end.

stop_system(WatcherPid) ->
    Ref = make_ref(),
    WatcherPid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 -> ok
    end.

watcher_loop(State = #{
    worker_pid := WorkerPid,
    worker_mref := WorkerMRef,
    restarts_left := RestartsLeft,
    restart_count := RestartCount,
    tx_store := TxStore
}) ->
    receive
        {charge, From, Ref, RequestId, Amount, Currency} ->
            case maps:find(RequestId, TxStore) of
                {ok, ExistingReceipt} ->
                    From ! {reply, Ref, {ok, {already_processed, ExistingReceipt}}},
                    watcher_loop(State);
                error ->
                    if
                        is_pid(WorkerPid) ->
                            WorkerReqRef = make_ref(),
                            WorkerPid ! {validate_and_charge, self(), WorkerReqRef, RequestId, Amount, Currency},
                            receive
                                {worker_reply, WorkerReqRef, {ok, Receipt}} ->
                                    NewTxStore = maps:put(RequestId, Receipt, TxStore),
                                    From ! {reply, Ref, {ok, Receipt}},
                                    watcher_loop(State#{tx_store => NewTxStore});
                                {worker_reply, WorkerReqRef, {error, Reason}} ->
                                    From ! {reply, Ref, {error, Reason}},
                                    watcher_loop(State)
                            after 1000 ->
                                From ! {reply, Ref, {error, worker_timeout}},
                                watcher_loop(State)
                            end;
                        true ->
                            From ! {reply, Ref, {error, no_active_worker}},
                            watcher_loop(State)
                    end
            end;

        {trigger_crash, From, Ref} ->
            if
                is_pid(WorkerPid) ->
                    OldWorker = WorkerPid,
                    WorkerPid ! crash_test,
                    receive
                        {'DOWN', WorkerMRef, process, OldWorker, _CrashReason} ->
                            if
                                RestartsLeft > 0 ->
                                    {NewPid, NewMRef} = spawn_monitor(fun() -> worker_loop() end),
                                    From ! {reply, Ref, {ok, OldWorker, NewPid}},
                                    NewState = State#{
                                        worker_pid => NewPid,
                                        worker_mref => NewMRef,
                                        restarts_left => RestartsLeft - 1,
                                        restart_count => RestartCount + 1
                                    },
                                    watcher_loop(NewState);
                                true ->
                                    From ! {reply, Ref, {error, max_restarts_exceeded}},
                                    NewState = State#{
                                        worker_pid => undefined,
                                        worker_mref => undefined,
                                        restarts_left => 0
                                    },
                                    watcher_loop(NewState)
                            end
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
`,
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			sessionID := "test-" + tc.exerciseID
			session, err := poolMgr.ClaimSession(sessionID)
			if err != nil {
				t.Fatalf("Failed to claim session: %v", err)
			}
			defer poolMgr.ReleaseSession(sessionID)

			ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
			defer cancel()

			report, err := runner.RunVerification(ctx, session, tc.exerciseID, tc.files)
			if err != nil {
				t.Fatalf("RunVerification failed with error: %v", err)
			}

			if report.Verdict != "PASSED" {
				t.Errorf("[%s] Expected verdict PASSED, got %s", tc.exerciseID, report.Verdict)
				for _, st := range report.Stages {
					t.Logf("  Stage %s (%s): status=%s, details=%s", st.ID, st.Title, st.Status, st.Details)
				}
			} else {
				if tc.wantScore > 0 && report.Score != tc.wantScore {
					t.Errorf("[%s] Score mismatch: got %d, want %d", tc.exerciseID, report.Score, tc.wantScore)
				}
				if tc.wantStages > 0 && len(report.Stages) != tc.wantStages {
					t.Errorf("[%s] Stages count mismatch: got %d, want %d", tc.exerciseID, len(report.Stages), tc.wantStages)
				}
				t.Logf("[%s] VERIFIED 100%% PASSED (score=%d, %d stages)", tc.exerciseID, report.Score, len(report.Stages))
				for _, st := range report.Stages {
					t.Logf("  + Stage %s: %s", st.ID, st.Status)
				}
			}

			if tc.visibleCount > 0 {
				runRes, errRun := runner.RunCode(ctx, session, tc.exerciseID, tc.files, nil)
				if errRun != nil {
					t.Fatalf("[%s] RunCode failed: %v", tc.exerciseID, errRun)
				}
				if !runRes.CompileOk {
					t.Fatalf("[%s] RunCode compilation failed:\n%s", tc.exerciseID, runRes.Stdout)
				}
				if len(runRes.VisibleTests) != tc.visibleCount {
					t.Errorf("[%s] VisibleTests count mismatch: got %d, want %d\nStdout:\n%s", tc.exerciseID, len(runRes.VisibleTests), tc.visibleCount, runRes.Stdout)
				}
				for i, vt := range runRes.VisibleTests {
					if !vt.Passed {
						t.Errorf("[%s] Visible test #%d (%s) failed: expected %s, got %s", tc.exerciseID, i+1, vt.CallStr, vt.Expected, vt.Actual)
					}
				}
				t.Logf("[%s] Verified %d/%d visible tests passed cleanly", tc.exerciseID, len(runRes.VisibleTests), tc.visibleCount)
			}
		})
	}

	// ── Negative Regression Subtests for ch06-l01 ──────────────────────────────
	t.Run("ch06-l01 Negative Missing try_catch", func(t *testing.T) {
		sessionID := "test-neg-ast-ch06-l01"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/exception_classifier.erl": `-module(exception_classifier).
-export([check_payment/1, safe_check/1, trigger_class/2]).

check_payment({payment, Amount, Currency}) ->
    if
        not is_integer(Amount) -> erlang:error(bad_amount_type);
        Amount < 0 -> throw(negative_amount);
        Amount =:= 0 -> exit(zero_payment_abort);
        Currency =/= usd andalso Currency =/= eur andalso Currency =/= etb -> throw({unsupported_currency, Currency});
        true -> {approved, Amount, Currency}
    end;
check_payment(_Invalid) -> erlang:error(invalid_payment_tuple).

safe_check(P) ->
    check_payment(P).

trigger_class(throw, R) -> throw(R);
trigger_class(error, R) -> erlang:error(R);
trigger_class(exit, R) -> exit(R).
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l01", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on missing try_catch, but got PASSED")
		}
		var astFailed bool
		for _, st := range report.Stages {
			if st.ID == "ast_try_catch_audit" && st.Status == "failed" {
				astFailed = true
				break
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_try_catch_audit stage to fail, stages: %+v", report.Stages)
		}
	})

	t.Run("ch06-l01 Negative Missing Export", func(t *testing.T) {
		sessionID := "test-neg-export-ch06-l01"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/exception_classifier.erl": `-module(exception_classifier).
-export([check_payment/1, safe_check/1]).

check_payment({payment, Amount, Currency}) ->
    if
        not is_integer(Amount) -> erlang:error(bad_amount_type);
        Amount < 0 -> throw(negative_amount);
        Amount =:= 0 -> exit(zero_payment_abort);
        Currency =/= usd andalso Currency =/= eur andalso Currency =/= etb -> throw({unsupported_currency, Currency});
        true -> {approved, Amount, Currency}
    end;
check_payment(_Invalid) -> erlang:error(invalid_payment_tuple).

safe_check(P) ->
    try check_payment(P) of
        {approved, A, C} -> {approved, A, C}
    catch
        throw:R -> {rejected, R};
        error:R -> {bug_detected, R};
        exit:R -> {process_aborted, R}
    end.

trigger_class(throw, R) -> throw(R);
trigger_class(error, R) -> erlang:error(R);
trigger_class(exit, R) -> exit(R).
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l01", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on missing trigger_class export, but got PASSED")
		}
		var exportFailed bool
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				exportFailed = true
				break
			}
		}
		if !exportFailed {
			t.Errorf("Expected compile_and_export_audit to fail, stages: %+v", report.Stages)
		}
	})

	t.Run("ch06-l01 Negative Bare Catch Class Prefix Trap", func(t *testing.T) {
		sessionID := "test-neg-bare-catch-ch06-l01"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/exception_classifier.erl": `-module(exception_classifier).
-export([check_payment/1, safe_check/1, trigger_class/2]).

check_payment({payment, Amount, Currency}) ->
    if
        not is_integer(Amount) -> erlang:error(bad_amount_type);
        Amount < 0 -> throw(negative_amount);
        Amount =:= 0 -> exit(zero_payment_abort);
        Currency =/= usd andalso Currency =/= eur andalso Currency =/= etb -> throw({unsupported_currency, Currency});
        true -> {approved, Amount, Currency}
    end;
check_payment(_Invalid) -> erlang:error(invalid_payment_tuple).

%% BARE CATCH TRAP: Only catches throws, causing error:bad_amount_type to crash!
safe_check(P) ->
    try check_payment(P) of
        {approved, A, C} -> {approved, A, C}
    catch
        Reason -> {rejected, Reason}
    end.

trigger_class(throw, R) -> throw(R);
trigger_class(error, R) -> erlang:error(R);
trigger_class(exit, R) -> exit(R).
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l01", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on bare catch class trap, but got PASSED")
		}
		var domainFailed bool
		for _, st := range report.Stages {
			if st.ID == "domain_exception_classification" && st.Status == "failed" {
				domainFailed = true
				break
			}
		}
		if !domainFailed {
			t.Errorf("Expected domain_exception_classification to fail, stages: %+v", report.Stages)
		}
	})

	// ── Negative Regression Subtests for ch06-l02 ──────────────────────────────
	t.Run("ch06-l02 Negative Missing Export", func(t *testing.T) {
		sessionID := "test-neg-export-ch06-l02"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/domain_validator.erl": `-module(domain_validator).
-export([
    safe_divide/2,
    check_amount/1,
    validate_email/1
]).

safe_divide(Num, Den) when is_number(Num), is_number(Den), Den =/= 0 -> {ok, Num / Den};
safe_divide(_Num, 0) -> {error, division_by_zero};
safe_divide(_Num, _Den) -> {error, non_numeric}.

check_amount(Amount) when is_integer(Amount), Amount > 0 -> {ok, Amount};
check_amount(Amount) when is_integer(Amount) -> {error, non_positive_amount};
check_amount(_) -> {error, invalid_type}.

validate_email(EmailBin) when is_binary(EmailBin) -> {ok, EmailBin};
validate_email(_) -> {error, invalid_email}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l02", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on missing process_checkout_input export, but got PASSED")
		}
		var exportFailed bool
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				exportFailed = true
				break
			}
		}
		if !exportFailed {
			t.Errorf("Expected compile_and_export_audit to fail, stages: %+v", report.Stages)
		}
	})

	t.Run("ch06-l02 Negative try_catch AST Violation", func(t *testing.T) {
		sessionID := "test-neg-ast-ch06-l02"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/domain_validator.erl": `-module(domain_validator).
-export([
    safe_divide/2,
    check_amount/1,
    validate_email/1,
    process_checkout_input/3
]).

safe_divide(Num, Den) when is_number(Num), is_number(Den), Den =/= 0 -> {ok, Num / Den};
safe_divide(_Num, 0) -> {error, division_by_zero};
safe_divide(_Num, _Den) -> {error, non_numeric}.

check_amount(Amount) when is_integer(Amount), Amount > 0 -> {ok, Amount};
check_amount(Amount) when is_integer(Amount) -> {error, non_positive_amount};
check_amount(_) -> {error, invalid_type}.

validate_email(EmailBin) when is_binary(EmailBin) -> {ok, EmailBin};
validate_email(_) -> {error, invalid_email}.

process_checkout_input(EmailBin, TotalAmount, SplitCount) ->
    try
        {ok, ValidEmail} = validate_email(EmailBin),
        {ok, ValidTotal} = check_amount(TotalAmount),
        {ok, Share} = safe_divide(ValidTotal, SplitCount),
        {ok, #{email => ValidEmail, per_person => Share}}
    catch
        _:_ -> {error, invalid_input}
    end.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l02", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on try_catch AST violation, but got PASSED")
		}
		var astFailed bool
		for _, st := range report.Stages {
			if st.ID == "ast_safe_return_audit" && st.Status == "failed" {
				astFailed = true
				break
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_safe_return_audit to fail, stages: %+v", report.Stages)
		}
	})

	t.Run("ch06-l02 Negative Broken Short Circuit", func(t *testing.T) {
		sessionID := "test-neg-shortcircuit-ch06-l02"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/domain_validator.erl": `-module(domain_validator).
-export([
    safe_divide/2,
    check_amount/1,
    validate_email/1,
    process_checkout_input/3
]).

safe_divide(Num, Den) when is_number(Num), is_number(Den) ->
    if
        Den == 0 -> {error, division_by_zero};
        true     -> {ok, Num / Den}
    end;
safe_divide(_Num, _Den) ->
    {error, non_numeric}.

check_amount(Amount) when is_integer(Amount) ->
    if
        Amount > 0 -> {ok, Amount};
        true       -> {error, non_positive_amount}
    end;
check_amount(_Other) ->
    {error, invalid_type}.

validate_email(EmailBin) when is_binary(EmailBin) ->
    case binary:split(EmailBin, <<"@">>) of
        [User, Domain] when byte_size(User) > 0, byte_size(Domain) > 0 ->
            case binary:match(Domain, <<".">>) of
                nomatch -> {error, invalid_email};
                _       -> {ok, EmailBin}
            end;
        _ ->
            {error, invalid_email}
    end;
validate_email(_Other) ->
    {error, invalid_email}.

%% BUG: Fails to short-circuit on bad email or amount; returns dummy ok!
process_checkout_input(EmailBin, _TotalAmount, _SplitCount) ->
    {ok, #{email => EmailBin, per_person => 100.0}}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l02", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on broken short-circuit pipeline, but got PASSED")
		}
		var pipelineFailed bool
		for _, st := range report.Stages {
			if st.ID == "checkout_pipeline" && st.Status == "failed" {
				pipelineFailed = true
				break
			}
		}
		if !pipelineFailed {
			t.Errorf("Expected checkout_pipeline to fail, stages: %+v", report.Stages)
		}
	})

	// ── Negative Regression Subtests for ch06-l03 ──────────────────────────────
	t.Run("ch06-l03 Negative Missing try_catch AST Violation", func(t *testing.T) {
		sessionID := "test-neg-ast-ch06-l03"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/boundary_parser.erl": `-module(boundary_parser).
-export([
    safe_parse_payload/1,
    with_resource_cleanup/3,
    process_transaction_log/2
]).

%% VIOLATION: Does not use try...catch!
safe_parse_payload(Binary) when is_binary(Binary) ->
    {ok, erlang:binary_to_term(Binary, [safe])};
safe_parse_payload(_) ->
    {error, {error, badarg}}.

with_resource_cleanup(AcquireFun, ActionFun, ReleaseFun) ->
    Res = AcquireFun(),
    Out = ActionFun(Res),
    ReleaseFun(Res),
    {ok, Out}.

process_transaction_log(_Lines, CloseNotifyPid) ->
    CloseNotifyPid ! file_handle_closed,
    ok.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l03", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on missing try_catch AST violation, but got PASSED")
		}
		var astFailed bool
		for _, st := range report.Stages {
			if st.ID == "ast_try_catch_audit" && st.Status == "failed" {
				astFailed = true
				break
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_try_catch_audit to fail, stages: %+v", report.Stages)
		}
	})

	t.Run("ch06-l03 Negative Missing Export", func(t *testing.T) {
		sessionID := "test-neg-export-ch06-l03"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/boundary_parser.erl": `-module(boundary_parser).
-export([
    safe_parse_payload/1,
    process_transaction_log/2
]).

safe_parse_payload(Binary) when is_binary(Binary) ->
    try erlang:binary_to_term(Binary, [safe]) of
        Term -> {ok, Term}
    catch
        Class:Reason -> {error, {Class, Reason}}
    end;
safe_parse_payload(_) ->
    {error, {error, badarg}}.

process_transaction_log(_Lines, CloseNotifyPid) ->
    CloseNotifyPid ! file_handle_closed,
    ok.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l03", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on missing with_resource_cleanup export, but got PASSED")
		}
		var exportFailed bool
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				exportFailed = true
				break
			}
		}
		if !exportFailed {
			t.Errorf("Expected compile_and_export_audit to fail, stages: %+v", report.Stages)
		}
	})

	t.Run("ch06-l03 Negative Missing after Cleanup", func(t *testing.T) {
		sessionID := "test-neg-cleanup-ch06-l03"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/boundary_parser.erl": `-module(boundary_parser).
-export([
    safe_parse_payload/1,
    with_resource_cleanup/3,
    process_transaction_log/2
]).

safe_parse_payload(Binary) when is_binary(Binary) ->
    try erlang:binary_to_term(Binary, [safe]) of
        Term -> {ok, Term}
    catch
        Class:Reason -> {error, {Class, Reason}}
    end;
safe_parse_payload(_) ->
    {error, {error, badarg}}.

%% BUG: ReleaseFun is called only on success, NOT in an after block!
with_resource_cleanup(AcquireFun, ActionFun, ReleaseFun) ->
    Resource = AcquireFun(),
    try ActionFun(Resource) of
        Result ->
            ReleaseFun(Resource),
            {ok, Result}
    catch
        Class:Reason ->
            {error, {Class, Reason}}
    end.

process_transaction_log(LinesList, CloseNotifyPid) when is_list(LinesList), is_pid(CloseNotifyPid) ->
    try
        lists:foreach(fun(Line) ->
            case Line of
                <<"CORRUPT_LINE">> -> erlang:error(transaction_processing_failed);
                _ValidLine         -> ok
            end
        end, LinesList),
        ok
    after
        CloseNotifyPid ! file_handle_closed
    end.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l03", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on missing after cleanup, but got PASSED")
		}
		var cleanupFailed bool
		for _, st := range report.Stages {
			if st.ID == "guaranteed_resource_cleanup" && st.Status == "failed" {
				cleanupFailed = true
				break
			}
		}
		if !cleanupFailed {
			t.Errorf("Expected guaranteed_resource_cleanup to fail, stages: %+v", report.Stages)
		}
	})

	// ── Negative Regression Subtests for ch06-l04 ──────────────────────────────
	t.Run("ch06-l04 Negative Missing link or spawn_link AST Violation", func(t *testing.T) {
		sessionID := "test-neg-ast-ch06-l04"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/linked_pipeline.erl": `-module(linked_pipeline).
-export([
    start_linked_pipeline/0,
    compute/2,
    stop_stage1_normal/1,
    crash_stage1/2,
    worker1_loop/1,
    worker2_loop/0
]).

%% VIOLATION: Uses raw spawn, never calls link/1 or spawn_link/1
start_linked_pipeline() ->
    Worker2 = spawn(fun() -> worker2_loop() end),
    Worker1 = spawn(fun() -> worker1_loop(Worker2) end),
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
        {transform, Caller, Ref, Value} ->
            Worker2 ! {transform_stage2, Caller, Ref, Value * 2},
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
            Caller ! {Ref, Doubled * Doubled},
            worker2_loop()
    end.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l04", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on missing link AST violation, but got PASSED")
		}
		var astFailed bool
		for _, st := range report.Stages {
			if st.ID == "ast_link_invariants" && st.Status == "failed" {
				astFailed = true
				break
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_link_invariants to fail, stages: %+v", report.Stages)
		}
	})

	t.Run("ch06-l04 Negative Missing Export", func(t *testing.T) {
		sessionID := "test-neg-export-ch06-l04"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/linked_pipeline.erl": `-module(linked_pipeline).
-export([
    start_linked_pipeline/0,
    compute/2,
    stop_stage1_normal/1,
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
    receive {Ref, Result} -> {ok, Result} after 1000 -> {error, timeout} end.

stop_stage1_normal(Worker1Pid) ->
    Ref = make_ref(),
    Worker1Pid ! {stop_normal, self(), Ref},
    receive {Ref, ok} -> ok after 1000 -> {error, timeout} end.

%% MISSING: crash_stage1/2 is not exported!
crash_stage1(Worker1Pid, Reason) ->
    Worker1Pid ! {crash, Reason},
    ok.

worker1_loop(Worker2) ->
    receive
        {transform, Caller, Ref, Value} ->
            Worker2 ! {transform_stage2, Caller, Ref, Value * 2},
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
            Caller ! {Ref, Doubled * Doubled},
            worker2_loop()
    end.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l04", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on missing export, but got PASSED")
		}
		var exportFailed bool
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				exportFailed = true
				break
			}
		}
		if !exportFailed {
			t.Errorf("Expected compile_and_export_audit to fail, stages: %+v", report.Stages)
		}
	})

	t.Run("ch06-l04 Negative Broken Link Peer Survives Crash", func(t *testing.T) {
		sessionID := "test-neg-link-ch06-l04"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/linked_pipeline.erl": `-module(linked_pipeline).
-export([
    start_linked_pipeline/0,
    compute/2,
    stop_stage1_normal/1,
    crash_stage1/2,
    worker1_loop/1,
    worker2_loop/0
]).

%% BUG: Dummy link to self, NOT to Worker2! Worker2 will survive abnormal crash!
start_linked_pipeline() ->
    Worker2 = spawn(fun() -> worker2_loop() end),
    Worker1 = spawn_link(fun() ->
        link(self()),
        worker1_loop(Worker2)
    end),
    {ok, Worker1, Worker2}.

compute(Worker1Pid, Number) ->
    Ref = make_ref(),
    Worker1Pid ! {transform, self(), Ref, Number},
    receive {Ref, Result} -> {ok, Result} after 1000 -> {error, timeout} end.

stop_stage1_normal(Worker1Pid) ->
    Ref = make_ref(),
    Worker1Pid ! {stop_normal, self(), Ref},
    receive {Ref, ok} -> ok after 1000 -> {error, timeout} end.

crash_stage1(Worker1Pid, Reason) ->
    Worker1Pid ! {crash, Reason},
    ok.

worker1_loop(Worker2) ->
    receive
        {transform, Caller, Ref, Value} ->
            Worker2 ! {transform_stage2, Caller, Ref, Value * 2},
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
            Caller ! {Ref, Doubled * Doubled},
            worker2_loop()
    end.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l04", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on broken link peer survival, but got PASSED")
		}
		var cascadeFailed bool
		for _, st := range report.Stages {
			if st.ID == "cascading_exit_propagation" && st.Status == "failed" {
				cascadeFailed = true
				break
			}
		}
		if !cascadeFailed {
			t.Errorf("Expected cascading_exit_propagation to fail, stages: %+v", report.Stages)
		}
	})

	// ── Negative Regression Subtests for ch06-l05 ──────────────────────────────
	t.Run("ch06-l05 Negative Missing trap_exit AST Violation", func(t *testing.T) {
		sessionID := "test-neg-ast-ch06-l05"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/exit_trapper.erl": `-module(exit_trapper).
-export([
    start_supervised/1,
    get_worker_pid/1,
    kill_worker/2,
    simulate_exit_truth_table/2,
    supervisor_loop/2
]).

%% BUG: Missing process_flag(trap_exit, true) call!
start_supervised(WorkerFun) when is_function(WorkerFun, 0) ->
    InitRef = make_ref(),
    Parent = self(),
    SupPid = spawn(fun() ->
        WorkerPid = spawn_link(WorkerFun),
        Parent ! {InitRef, WorkerPid},
        supervisor_loop(WorkerFun, WorkerPid)
    end),
    receive
        {InitRef, InitialWorker} -> {ok, SupPid, InitialWorker}
    after 1000 ->
        {error, timeout}
    end.

get_worker_pid(SupPid) ->
    Ref = make_ref(),
    SupPid ! {get_worker, self(), Ref},
    receive {Ref, WorkerPid} -> {ok, WorkerPid} after 1000 -> {error, timeout} end.

kill_worker(SupPid, Reason) ->
    SupPid ! {kill_worker, Reason},
    ok.

supervisor_loop(WorkerFun, CurrentWorker) ->
    receive
        {get_worker, From, Ref} ->
            From ! {Ref, CurrentWorker},
            supervisor_loop(WorkerFun, CurrentWorker);
        {kill_worker, Reason} ->
            exit(CurrentWorker, Reason),
            supervisor_loop(WorkerFun, CurrentWorker);
        {'EXIT', CurrentWorker, normal} ->
            ok;
        {'EXIT', CurrentWorker, _AbnormalReason} ->
            NewWorker = spawn_link(WorkerFun),
            supervisor_loop(WorkerFun, NewWorker);
        stop ->
            exit(CurrentWorker, shutdown),
            ok
    end.

simulate_exit_truth_table(TrappingBool, SignalReason) ->
    Parent = self(),
    Ref = make_ref(),
    ProbePid = spawn(fun() ->
        Parent ! {ready, Ref},
        receive Msg -> Parent ! {survived, Ref, Msg} after 50 -> Parent ! {survived, Ref, none} end
    end),
    receive {ready, Ref} -> ok end,
    MonitorRef = erlang:monitor(process, ProbePid),
    exit(ProbePid, SignalReason),
    receive
        {'DOWN', MonitorRef, process, ProbePid, DownReason} ->
            erlang:demonitor(MonitorRef, [flush]),
            {died, DownReason};
        {survived, Ref, Msg} ->
            erlang:demonitor(MonitorRef, [flush]),
            {survived, Msg}
    after 200 ->
        erlang:demonitor(MonitorRef, [flush]),
        {error, timeout}
    end.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l05", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on missing trap_exit AST rule, but got PASSED")
		}
		var astFailed bool
		for _, st := range report.Stages {
			if st.ID == "ast_trap_exit_invariants" && st.Status == "failed" {
				astFailed = true
				break
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_trap_exit_invariants to fail, stages: %+v", report.Stages)
		}
	})

	t.Run("ch06-l05 Negative Missing Export", func(t *testing.T) {
		sessionID := "test-neg-exp-ch06-l05"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/exit_trapper.erl": `-module(exit_trapper).
%% BUG: simulate_exit_truth_table/2 intentionally omitted from export!
-export([
    start_supervised/1,
    get_worker_pid/1,
    kill_worker/2,
    supervisor_loop/2
]).

start_supervised(WorkerFun) when is_function(WorkerFun, 0) ->
    InitRef = make_ref(),
    Parent = self(),
    SupPid = spawn(fun() ->
        process_flag(trap_exit, true),
        WorkerPid = spawn_link(WorkerFun),
        Parent ! {InitRef, WorkerPid},
        supervisor_loop(WorkerFun, WorkerPid)
    end),
    receive
        {InitRef, InitialWorker} -> {ok, SupPid, InitialWorker}
    after 1000 ->
        {error, timeout}
    end.

get_worker_pid(SupPid) ->
    Ref = make_ref(),
    SupPid ! {get_worker, self(), Ref},
    receive {Ref, WorkerPid} -> {ok, WorkerPid} after 1000 -> {error, timeout} end.

kill_worker(SupPid, Reason) ->
    SupPid ! {kill_worker, Reason},
    ok.

supervisor_loop(WorkerFun, CurrentWorker) ->
    receive
        {get_worker, From, Ref} ->
            From ! {Ref, CurrentWorker},
            supervisor_loop(WorkerFun, CurrentWorker);
        {kill_worker, Reason} ->
            exit(CurrentWorker, Reason),
            supervisor_loop(WorkerFun, CurrentWorker);
        {'EXIT', CurrentWorker, normal} ->
            ok;
        {'EXIT', CurrentWorker, _AbnormalReason} ->
            NewWorker = spawn_link(WorkerFun),
            supervisor_loop(WorkerFun, NewWorker);
        stop ->
            exit(CurrentWorker, shutdown),
            ok
    end.

simulate_exit_truth_table(_TrappingBool, _SignalReason) ->
    ok.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l05", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on missing export, but got PASSED")
		}
		var exportFailed bool
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				exportFailed = true
				break
			}
		}
		if !exportFailed {
			t.Errorf("Expected compile_and_export_audit to fail, stages: %+v", report.Stages)
		}
	})

	t.Run("ch06-l05 Negative Non-Trapping Supervisor Dies on Crash", func(t *testing.T) {
		sessionID := "test-neg-nontrap-ch06-l05"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/exit_trapper.erl": `-module(exit_trapper).
-export([
    start_supervised/1,
    get_worker_pid/1,
    kill_worker/2,
    simulate_exit_truth_table/2,
    supervisor_loop/2
]).

%% BUG: Supervisor explicitly sets trap_exit to false! It will die when worker crashes.
start_supervised(WorkerFun) when is_function(WorkerFun, 0) ->
    InitRef = make_ref(),
    Parent = self(),
    SupPid = spawn(fun() ->
        process_flag(trap_exit, false),
        WorkerPid = spawn_link(WorkerFun),
        Parent ! {InitRef, WorkerPid},
        supervisor_loop(WorkerFun, WorkerPid)
    end),
    receive
        {InitRef, InitialWorker} -> {ok, SupPid, InitialWorker}
    after 1000 ->
        {error, timeout}
    end.

get_worker_pid(SupPid) ->
    Ref = make_ref(),
    SupPid ! {get_worker, self(), Ref},
    receive {Ref, WorkerPid} -> {ok, WorkerPid} after 1000 -> {error, timeout} end.

kill_worker(SupPid, Reason) ->
    SupPid ! {kill_worker, Reason},
    ok.

supervisor_loop(WorkerFun, CurrentWorker) ->
    receive
        {get_worker, From, Ref} ->
            From ! {Ref, CurrentWorker},
            supervisor_loop(WorkerFun, CurrentWorker);
        {kill_worker, Reason} ->
            exit(CurrentWorker, Reason),
            supervisor_loop(WorkerFun, CurrentWorker);
        {'EXIT', CurrentWorker, normal} ->
            ok;
        {'EXIT', CurrentWorker, _AbnormalReason} ->
            NewWorker = spawn_link(WorkerFun),
            supervisor_loop(WorkerFun, NewWorker);
        stop ->
            exit(CurrentWorker, shutdown),
            ok
    end.

simulate_exit_truth_table(TrappingBool, SignalReason) ->
    Parent = self(),
    Ref = make_ref(),
    ProbePid = spawn(fun() ->
        process_flag(trap_exit, TrappingBool),
        Parent ! {ready, Ref},
        receive Msg -> Parent ! {survived, Ref, Msg} after 50 -> Parent ! {survived, Ref, none} end
    end),
    receive {ready, Ref} -> ok end,
    MonitorRef = erlang:monitor(process, ProbePid),
    exit(ProbePid, SignalReason),
    receive
        {'DOWN', MonitorRef, process, ProbePid, DownReason} ->
            erlang:demonitor(MonitorRef, [flush]),
            {died, DownReason};
        {survived, Ref, Msg} ->
            erlang:demonitor(MonitorRef, [flush]),
            {survived, Msg}
    after 200 ->
        erlang:demonitor(MonitorRef, [flush]),
        {error, timeout}
    end.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l05", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on non-trapping supervisor, but got PASSED")
		}
		var respawnFailed bool
		for _, st := range report.Stages {
			if st.ID == "self_healing_respawn" && st.Status == "failed" {
				respawnFailed = true
				break
			}
		}
		if !respawnFailed {
			t.Errorf("Expected self_healing_respawn to fail, stages: %+v", report.Stages)
		}
	})

	// ── Negative Regression Subtests for ch06-l06 ──────────────────────────────
	t.Run("ch06-l06 Negative Missing spawn_monitor AST Violation", func(t *testing.T) {
		sessionID := "test-neg-ast-ch06-l06"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/worker_watcher.erl": `-module(worker_watcher).
-export([
    run_monitored_task/2,
    probe_pid_status/1
]).

%% BUG: Uses bare spawn instead of spawn_monitor! Violates AST invariants.
run_monitored_task(TaskFun, TimeoutMs) ->
    Caller = self(),
    WorkerPid = spawn(fun() ->
        Result = TaskFun(),
        Caller ! {task_result, self(), Result}
    end),
    receive
        {task_result, WorkerPid, Result} ->
            {ok, Result}
    after TimeoutMs ->
        exit(WorkerPid, kill),
        {error, timeout}
    end.

probe_pid_status(TargetPid) ->
    MRef = erlang:monitor(process, TargetPid),
    receive
        {'DOWN', MRef, process, TargetPid, Reason} ->
            {dead, Reason}
    after 20 ->
        erlang:demonitor(MRef, [flush]),
        alive
    end.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l06", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on missing spawn_monitor AST rule, but got PASSED")
		}
		var astFailed bool
		for _, st := range report.Stages {
			if st.ID == "ast_monitor_invariants" && st.Status == "failed" {
				astFailed = true
				break
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_monitor_invariants to fail, stages: %+v", report.Stages)
		}
	})

	t.Run("ch06-l06 Negative Missing Export", func(t *testing.T) {
		sessionID := "test-neg-exp-ch06-l06"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/worker_watcher.erl": `-module(worker_watcher).
%% BUG: probe_pid_status/1 intentionally omitted from exports!
-export([
    run_monitored_task/2
]).

run_monitored_task(TaskFun, TimeoutMs) ->
    Caller = self(),
    {WorkerPid, MRef} = spawn_monitor(fun() ->
        Result = TaskFun(),
        Caller ! {task_result, self(), Result}
    end),
    receive
        {task_result, WorkerPid, Result} ->
            erlang:demonitor(MRef, [flush]),
            {ok, Result};
        {'DOWN', MRef, process, WorkerPid, Reason} ->
            {error, {crashed, Reason}}
    after TimeoutMs ->
        exit(WorkerPid, kill),
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

probe_pid_status(_TargetPid) ->
    ok.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l06", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on missing export, but got PASSED")
		}
		var exportFailed bool
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				exportFailed = true
				break
			}
		}
		if !exportFailed {
			t.Errorf("Expected compile_and_export_audit to fail, stages: %+v", report.Stages)
		}
	})

	t.Run("ch06-l06 Negative Broken Crash Isolation", func(t *testing.T) {
		sessionID := "test-neg-crash-ch06-l06"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/worker_watcher.erl": `-module(worker_watcher).
-export([
    run_monitored_task/2,
    probe_pid_status/1
]).

%% BUG: Links to worker, so when worker crashes, calling process dies with it!
run_monitored_task(TaskFun, TimeoutMs) ->
    Caller = self(),
    {WorkerPid, MRef} = spawn_monitor(fun() ->
        link(Caller),
        Result = TaskFun(),
        Caller ! {task_result, self(), Result}
    end),
    receive
        {task_result, WorkerPid, Result} ->
            erlang:demonitor(MRef, [flush]),
            {ok, Result};
        {'DOWN', MRef, process, WorkerPid, Reason} ->
            {error, {crashed, Reason}}
    after TimeoutMs ->
        exit(WorkerPid, kill),
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

probe_pid_status(TargetPid) ->
    MRef = erlang:monitor(process, TargetPid),
    receive
        {'DOWN', MRef, process, TargetPid, Reason} ->
            {dead, Reason}
    after 20 ->
        erlang:demonitor(MRef, [flush]),
        alive
    end.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l06", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on broken crash isolation, but got PASSED")
		}
		var crashFailed bool
		for _, st := range report.Stages {
			if st.ID == "crash_isolation" && st.Status == "failed" {
				crashFailed = true
				break
			}
		}
		if !crashFailed {
			t.Errorf("Expected crash_isolation to fail, stages: %+v", report.Stages)
		}
	})

	// ── Negative Regression Subtests for ch06-l07 ──────────────────────────────
	t.Run("ch06-l07 Negative Missing demonitor AST Violation", func(t *testing.T) {
		sessionID := "test-neg-ast-ch06-l07"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/monitor_hygiene.erl": `-module(monitor_hygiene).
-export([
    call_with_clean_mailbox/2,
    count_lingering_downs/0
]).

%% BUG: Missing erlang:demonitor/2 call entirely!
call_with_clean_mailbox(WorkerFun, Input) ->
    Caller = self(),
    {WorkerPid, _MRef} = spawn_monitor(fun() ->
        Res = WorkerFun(Input),
        Caller ! {done, self(), Res},
        exit(worker_completed)
    end),
    receive
        {done, WorkerPid, Result} ->
            Lingering = count_lingering_downs(),
            {ok, Result, Lingering}
    after 1000 ->
        {error, timeout}
    end.

count_lingering_downs() ->
    0.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l07", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on missing demonitor AST, but got PASSED")
		}
		var astFailed bool
		for _, st := range report.Stages {
			if st.ID == "ast_hygiene_invariants" && st.Status == "failed" {
				astFailed = true
				break
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_hygiene_invariants to fail, stages: %+v", report.Stages)
		}
	})

	t.Run("ch06-l07 Negative Missing Export", func(t *testing.T) {
		sessionID := "test-neg-exp-ch06-l07"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/monitor_hygiene.erl": `-module(monitor_hygiene).
-export([
    call_with_clean_mailbox/2
    %% BUG: Missing count_lingering_downs/0
]).

call_with_clean_mailbox(_WorkerFun, _Input) ->
    {ok, 42, 0}.

count_lingering_downs() ->
    0.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l07", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on missing export, but got PASSED")
		}
		var exportFailed bool
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				exportFailed = true
				break
			}
		}
		if !exportFailed {
			t.Errorf("Expected compile_and_export_audit to fail, stages: %+v", report.Stages)
		}
	})

	t.Run("ch06-l07 Negative Missing [flush] Option Causes Lingering Message Leak", func(t *testing.T) {
		sessionID := "test-neg-flush-ch06-l07"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/monitor_hygiene.erl": `-module(monitor_hygiene).
-export([
    call_with_clean_mailbox/2,
    count_lingering_downs/0
]).

%% BUG: Calls plain demonitor(MRef) without [flush], leaving the worker's DOWN message in the mailbox!
call_with_clean_mailbox(WorkerFun, Input) when is_function(WorkerFun, 1) ->
    Caller = self(),
    {WorkerPid, MRef} = spawn_monitor(fun() ->
        Res = WorkerFun(Input),
        Caller ! {done, self(), Res},
        exit(worker_completed)
    end),
    timer:sleep(10),
    receive
        {done, WorkerPid, Result} ->
            erlang:demonitor(MRef), %% BUG: Omitted [flush]!
            Lingering = count_lingering_downs(),
            {ok, Result, Lingering}
    after 1000 ->
        erlang:demonitor(MRef),
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
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l07", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on missing [flush] option, but got PASSED")
		}
		var raceFailed bool
		for _, st := range report.Stages {
			if st.ID == "monitor_race_and_flush" && st.Status == "failed" {
				raceFailed = true
				break
			}
		}
		if !raceFailed {
			t.Errorf("Expected monitor_race_and_flush to fail, stages: %+v", report.Stages)
		}
	})

	// ── Negative Regression Subtests for ch06-l08 ──────────────────────────────
	t.Run("ch06-l08 Negative Missing monitor/demonitor AST Violation", func(t *testing.T) {
		sessionID := "test-neg-ast-ch06-l08"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/my_gen_server.erl": `-module(my_gen_server).
-export([
    start/2,
    call/3,
    cast/2,
    stop/1,
    choose_primitive/1,
    loop/2
]).

choose_primitive(tightly_coupled_peers)    -> use_link;
choose_primitive(supervisor_to_worker)     -> use_link_with_trap_exit;
choose_primitive(client_to_server_request) -> use_monitor;
choose_primitive(independent_watcher)      -> use_monitor.

start(CallbackMod, InitArg) ->
    InitRef = make_ref(),
    Parent = self(),
    _Pid = spawn(fun() ->
        case CallbackMod:init(InitArg) of
            {ok, InitialState} ->
                Parent ! {InitRef, ok, self()},
                loop(CallbackMod, InitialState);
            {error, Reason} ->
                Parent ! {InitRef, error, Reason}
        end
    end),
    receive
        {InitRef, ok, ServerPid} -> {ok, ServerPid};
        {InitRef, error, Reason} -> {error, Reason}
    after 1000 ->
        {error, init_timeout}
    end.

%% AST VIOLATION: Naive call omitting erlang:monitor/2 and erlang:demonitor/2
call(ServerPid, Request, Timeout) ->
    Ref = make_ref(),
    ServerPid ! {'$gen_call', {self(), Ref}, Request},
    receive
        {Ref, Reply} -> Reply
    after Timeout ->
        {error, timeout}
    end.

cast(ServerPid, Request) ->
    ServerPid ! {'$gen_cast', Request},
    ok.

stop(ServerPid) ->
    call(ServerPid, stop, 1000).

loop(CallbackMod, State) ->
    receive
        {'$gen_call', {From, MRef}, stop} ->
            From ! {MRef, ok},
            ok;
        {'$gen_call', {From, MRef}, Request} ->
            case CallbackMod:handle_call(Request, From, State) of
                {reply, Reply, NewState} ->
                    From ! {MRef, Reply},
                    loop(CallbackMod, NewState);
                {stop, Reason, Reply, _FinalState} ->
                    From ! {MRef, Reply},
                    exit(Reason)
            end;
        {'$gen_cast', Request} ->
            case CallbackMod:handle_cast(Request, State) of
                {noreply, NewState} ->
                    loop(CallbackMod, NewState);
                {stop, Reason, _FinalState} ->
                    exit(Reason)
            end
    end.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l08", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on AST violation (missing monitor/demonitor), but got PASSED")
		}
		var astFailed bool
		for _, st := range report.Stages {
			if st.ID == "ast_otp_gen_invariants" && st.Status == "failed" {
				astFailed = true
				break
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_otp_gen_invariants to fail, stages: %+v", report.Stages)
		}
	})

	t.Run("ch06-l08 Negative Missing Export", func(t *testing.T) {
		sessionID := "test-neg-exp-ch06-l08"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/my_gen_server.erl": `-module(my_gen_server).
%% Missing choose_primitive/1 export
-export([
    start/2,
    call/3,
    cast/2,
    stop/1,
    loop/2
]).

choose_primitive(tightly_coupled_peers)    -> use_link;
choose_primitive(supervisor_to_worker)     -> use_link_with_trap_exit;
choose_primitive(client_to_server_request) -> use_monitor;
choose_primitive(independent_watcher)      -> use_monitor.

start(CallbackMod, InitArg) ->
    InitRef = make_ref(),
    Parent = self(),
    _Pid = spawn(fun() ->
        case CallbackMod:init(InitArg) of
            {ok, InitialState} ->
                Parent ! {InitRef, ok, self()},
                loop(CallbackMod, InitialState);
            {error, Reason} ->
                Parent ! {InitRef, error, Reason}
        end
    end),
    receive
        {InitRef, ok, ServerPid} -> {ok, ServerPid};
        {InitRef, error, Reason} -> {error, Reason}
    after 1000 ->
        {error, init_timeout}
    end.

call(ServerPid, Request, Timeout) ->
    MRef = erlang:monitor(process, ServerPid),
    ServerPid ! {'$gen_call', {self(), MRef}, Request},
    receive
        {MRef, Reply} ->
            erlang:demonitor(MRef, [flush]),
            Reply;
        {'DOWN', MRef, process, ServerPid, Reason} ->
            {error, {server_crashed, Reason}}
    after Timeout ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

cast(ServerPid, Request) ->
    ServerPid ! {'$gen_cast', Request},
    ok.

stop(ServerPid) ->
    call(ServerPid, stop, 1000).

loop(CallbackMod, State) ->
    receive
        {'$gen_call', {From, MRef}, stop} ->
            From ! {MRef, ok},
            ok;
        {'$gen_call', {From, MRef}, Request} ->
            case CallbackMod:handle_call(Request, From, State) of
                {reply, Reply, NewState} ->
                    From ! {MRef, Reply},
                    loop(CallbackMod, NewState);
                {stop, Reason, Reply, _FinalState} ->
                    From ! {MRef, Reply},
                    exit(Reason)
            end;
        {'$gen_cast', Request} ->
            case CallbackMod:handle_cast(Request, State) of
                {noreply, NewState} ->
                    loop(CallbackMod, NewState);
                {stop, Reason, _FinalState} ->
                    exit(Reason)
            end
    end.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l08", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on missing export choose_primitive/1, but got PASSED")
		}
		var expFailed bool
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				expFailed = true
				break
			}
		}
		if !expFailed {
			t.Errorf("Expected compile_and_export_audit to fail, stages: %+v", report.Stages)
		}
	})

	t.Run("ch06-l08 Negative Naive Call Lacks Monitor Crash Detection", func(t *testing.T) {
		sessionID := "test-neg-naive-ch06-l08"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badFiles := map[string]string{
			"src/my_gen_server.erl": `-module(my_gen_server).
-export([
    start/2,
    call/3,
    cast/2,
    stop/1,
    choose_primitive/1,
    loop/2
]).

choose_primitive(tightly_coupled_peers)    -> use_link;
choose_primitive(supervisor_to_worker)     -> use_link_with_trap_exit;
choose_primitive(client_to_server_request) -> use_monitor;
choose_primitive(independent_watcher)      -> use_monitor.

start(CallbackMod, InitArg) ->
    InitRef = make_ref(),
    Parent = self(),
    _Pid = spawn(fun() ->
        case CallbackMod:init(InitArg) of
            {ok, InitialState} ->
                Parent ! {InitRef, ok, self()},
                loop(CallbackMod, InitialState);
            {error, Reason} ->
                Parent ! {InitRef, error, Reason}
        end
    end),
    receive
        {InitRef, ok, ServerPid} -> {ok, ServerPid};
        {InitRef, error, Reason} -> {error, Reason}
    after 1000 ->
        {error, init_timeout}
    end.

%% BUG: Satisfies AST by having monitor/demonitor calls, but call/3 fails to monitor ServerPid!
call(ServerPid, Request, Timeout) ->
    _Dummy = erlang:monitor(process, self()),
    erlang:demonitor(_Dummy, [flush]),
    Ref = make_ref(),
    ServerPid ! {'$gen_call', {self(), Ref}, Request},
    receive
        {Ref, Reply} -> Reply
    after Timeout ->
        {error, timeout}
    end.

cast(ServerPid, Request) ->
    ServerPid ! {'$gen_cast', Request},
    ok.

stop(ServerPid) ->
    call(ServerPid, stop, 1000).

loop(CallbackMod, State) ->
    receive
        {'$gen_call', {From, MRef}, stop} ->
            From ! {MRef, ok},
            ok;
        {'$gen_call', {From, MRef}, Request} ->
            case CallbackMod:handle_call(Request, From, State) of
                {reply, Reply, NewState} ->
                    From ! {MRef, Reply},
                    loop(CallbackMod, NewState);
                {stop, Reason, Reply, _FinalState} ->
                    From ! {MRef, Reply},
                    exit(Reason)
            end;
        {'$gen_cast', Request} ->
            case CallbackMod:handle_cast(Request, State) of
                {noreply, NewState} ->
                    loop(CallbackMod, NewState);
                {stop, Reason, _FinalState} ->
                    exit(Reason)
            end
    end.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch06-l08", badFiles)
		if err != nil {
			t.Fatalf("RunVerification returned unexpected error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Errorf("Expected failure on naive call without server crash detection, but got PASSED")
		}
		var crashDetectFailed bool
		for _, st := range report.Stages {
			if st.ID == "zero_latency_crash_detection" && st.Status == "failed" {
				crashDetectFailed = true
				break
			}
		}
		if !crashDetectFailed {
			t.Errorf("Expected zero_latency_crash_detection to fail, stages: %+v", report.Stages)
		}
	})
}

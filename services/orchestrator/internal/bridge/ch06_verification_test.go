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
			name:       "ch06-l02 Safe Operations & Return Values",
			exerciseID: "ch06-l02",
			files: map[string]string{
				"src/domain_validator.erl": `-module(domain_validator).
-export([
    safe_divide/2,
    check_amount/1,
    validate_email/1,
    process_checkout_input/3
]).

safe_divide(_Numerator, 0) ->
    {error, division_by_zero};
safe_divide(Numerator, Denominator) when is_number(Numerator), is_number(Denominator) ->
    {ok, Numerator / Denominator};
safe_divide(_Numerator, _Denominator) ->
    {error, non_numeric}.

check_amount(Amount) when is_integer(Amount), Amount > 0 ->
    {ok, Amount};
check_amount(Amount) when is_integer(Amount), Amount =< 0 ->
    {error, non_positive_amount};
check_amount(_Amount) ->
    {error, invalid_type}.

validate_email(EmailBin) when is_binary(EmailBin) ->
    case binary:split(EmailBin, <<"@">>) of
        [Username, Domain] when byte_size(Username) > 0, byte_size(Domain) > 0 ->
            case binary:match(Domain, <<".">>) of
                nomatch ->
                    {error, invalid_email};
                _ ->
                    {ok, EmailBin}
            end;
        _ ->
            {error, invalid_email}
    end;
validate_email(_Invalid) ->
    {error, invalid_email}.

process_checkout_input(EmailBin, TotalAmount, SplitCount) ->
    try
        ValidEmail = case validate_email(EmailBin) of
            {ok, E} -> E;
            {error, ReasonE} -> throw({validation_error, ReasonE})
        end,
        ValidAmount = case check_amount(TotalAmount) of
            {ok, A} -> A;
            {error, ReasonA} -> throw({validation_error, ReasonA})
        end,
        PerPerson = case safe_divide(ValidAmount, SplitCount) of
            {ok, Share} -> Share;
            {error, ReasonD} -> throw({validation_error, ReasonD})
        end,
        {ok, #{email => ValidEmail, per_person => PerPerson}}
    catch
        throw:{validation_error, Reason} ->
            {error, Reason}
    end.
`,
			},
		},
		{
			name:       "ch06-l06 Unidirectional Monitors & noproc",
			exerciseID: "ch06-l06",
			files: map[string]string{
				"src/worker_watcher.erl": `-module(worker_watcher).
-export([
    run_monitored_task/2,
    probe_pid_status/1
]).

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
			},
		},
		{
			name:       "ch06-l07 Monitor Mailbox Hygiene",
			exerciseID: "ch06-l07",
			files: map[string]string{
				"src/monitor_hygiene.erl": `-module(monitor_hygiene).
-export([
    call_with_clean_mailbox/2,
    count_lingering_downs/0
]).

call_with_clean_mailbox(WorkerFun, Input) ->
    Caller = self(),
    MRef = erlang:make_ref(),
    WorkerPid = spawn(fun() ->
        Res = WorkerFun(Input),
        Caller ! {done, MRef, Res},
        exit(worker_finished)
    end),
    ActualMRef = erlang:monitor(process, WorkerPid),
    timer:sleep(5),
    receive
        {done, MRef, Res} ->
            erlang:demonitor(ActualMRef, [flush]),
            Lingering = count_lingering_downs(),
            {ok, Res, Lingering}
    after 1000 ->
        erlang:demonitor(ActualMRef, [flush]),
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
			},
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
}

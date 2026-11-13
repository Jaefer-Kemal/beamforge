package bridge_test

import (
	"context"
	"fmt"
	"testing"
	"time"
)

func TestChapter5Verification(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	processBenchSolution := `-module(process_bench).
-export([run/0, run_bench/1, inspect_process/1]).

%% @doc Execute the default 2,000 process benchmark and format timing and memory metrics to standard output.
run() ->
    Summary = run_bench(2000),
    #{spawned := N, avg_memory_bytes := AvgMem, elapsed_us := ElapsedUs} = Summary,
    io:format("==================================================~n"),
    io:format("BEAM Process Benchmark: ~p processes~n", [N]),
    io:format("Total Spawn Time: ~p us (~.2f us per process)~n", [ElapsedUs, ElapsedUs / N]),
    io:format("Average Memory per Process: ~p bytes (~.2f KB)~n", [AvgMem, AvgMem / 1024]),
    io:format("==================================================~n"),
    ok.

%% @doc Spawn N concurrent worker processes, measure spawn duration in microseconds, compute average memory footprint across the first 50 workers, cleanly terminate all spawned workers, and return a telemetry summary map.
run_bench(N) when is_integer(N), N > 0 ->
    StartUs = erlang:monotonic_time(microsecond),
    Pids = [spawn(fun() -> receive stop -> ok end end) || _ <- lists:seq(1, N)],
    EndUs = erlang:monotonic_time(microsecond),
    ElapsedUs = EndUs - StartUs,

    SamplePids = lists:sublist(Pids, 50),
    TotalMem = lists:sum([inspect_process(P) || P <- SamplePids]),
    AvgMem = TotalMem div length(SamplePids),

    [P ! stop || P <- Pids],

    #{
        spawned => N,
        avg_memory_bytes => AvgMem,
        elapsed_us => ElapsedUs
    }.

%% @doc Return the memory footprint in bytes allocated to Pid, or a default baseline size if the target process has already terminated.
inspect_process(Pid) ->
    case erlang:process_info(Pid, memory) of
        {memory, Bytes} -> Bytes;
        undefined -> 2688
    end.
`

	pingActorSolution := `-module(ping_actor).
-export([start_responder/0, ping/2, broadcast/2, responder_loop/0]).

%% @doc Spawn a new concurrent process executing responder_loop/0 and return its process identifier.
start_responder() ->
    spawn(fun() -> responder_loop() end).

%% @doc Receive loop handling ping request tuples by sending pong replies with responder PID, or terminating cleanly on stop.
responder_loop() ->
    receive
        {ping, CallerPid, Payload} ->
            CallerPid ! {pong, self(), Payload},
            responder_loop();
        stop ->
            ok
    end.

%% @doc Asynchronously send a ping request tuple to ResponderPid with caller PID and Payload, returning {ok, Payload} on matching pong response or {error, timeout} after one second.
ping(ResponderPid, Payload) ->
    ResponderPid ! {ping, self(), Payload},
    receive
        {pong, ResponderPid, Payload} ->
            {ok, Payload}
    after 1000 ->
        {error, timeout}
    end.

%% @doc Asynchronously send Msg to each process identifier in PidsList and return a tagged tuple with the total count dispatched.
broadcast(PidsList, Msg) ->
    [P ! Msg || P <- PidsList],
    {sent, length(PidsList)}.
`

	priorityMailboxSolution := `-module(priority_mailbox).
-export([receive_urgent_first/1, request_with_timeout/3, flush_mailbox/0]).

%% @doc Extract up to ExpectedCount messages from the caller mailbox, prioritizing urgent tagged tuples over normal tagged tuples.
receive_urgent_first(ExpectedCount) ->
    receive_urgent_loop(ExpectedCount, []).

receive_urgent_loop(0, Acc) ->
    lists:reverse(Acc);
receive_urgent_loop(N, Acc) ->
    receive
        {urgent, Payload} ->
            receive_urgent_loop(N - 1, [Payload | Acc])
    after 0 ->
        receive
            {normal, Payload} ->
                receive_urgent_loop(N - 1, [Payload | Acc])
        after 0 ->
            lists:reverse(Acc)
        end
    end.

%% @doc Dispatch an asynchronous request tuple containing caller PID and RequestMsg to TargetPid, returning the worker result on reply or a timeout error if TimeoutMs elapses.
request_with_timeout(TargetPid, RequestMsg, TimeoutMs) ->
    TargetPid ! {request, self(), RequestMsg},
    receive
        {reply, RequestMsg, Result} ->
            {ok, Result}
    after TimeoutMs ->
        {error, timeout}
    end.

%% @doc Drain all pending messages currently queued in the caller process mailbox in a single non-blocking pass and return them in FIFO arrival order.
flush_mailbox() ->
    flush_loop([]).

flush_loop(Acc) ->
    receive
        Msg -> flush_loop([Msg | Acc])
    after 0 ->
        lists:reverse(Acc)
    end.
`

	counterActorSolution := `-module(counter_actor).
-export([start/1, increment/2, decrement/2, get_value/1, stop/1, loop/1]).

%% @doc Spawn a concurrent stateful counter actor initialized with InitialValue and return its process identifier.
start(InitialValue) ->
    spawn(fun() -> loop(InitialValue) end).

%% @doc Asynchronously dispatch an increment delta to the counter actor process.
increment(Pid, Delta) ->
    Pid ! {increment, Delta},
    ok.

%% @doc Asynchronously dispatch a decrement delta to the counter actor process.
decrement(Pid, Delta) ->
    Pid ! {decrement, Delta},
    ok.

%% @doc Synchronously query the counter actor value with caller PID return address, awaiting reply up to one second.
get_value(Pid) ->
    Pid ! {get, self()},
    receive
        {value, Val} ->
            {ok, Val}
    after 1000 ->
        {error, timeout}
    end.

%% @doc Asynchronously dispatch a stop command to terminate the counter actor process.
stop(Pid) ->
    Pid ! stop,
    ok.

%% @doc Tail-recursive state loop handling increment, decrement, query, and termination messages in constant stack space.
loop(CurrentVal) ->
    receive
        {increment, Delta} ->
            loop(CurrentVal + Delta);
        {decrement, Delta} ->
            loop(CurrentVal - Delta);
        {get, Caller} ->
            Caller ! {value, CurrentVal},
            loop(CurrentVal);
        stop ->
            ok
    end.
`

	namedKvActorSolution := `-module(named_kv_actor).
-export([start_registered/0, put/2, get/1, stop/0, loop/1]).

%% @doc Spawn and register the actor under atom named_kv_actor if not already registered, returning {ok, Pid} or {error, already_started}.
start_registered() ->
    case whereis(named_kv_actor) of
        undefined ->
            Pid = spawn(fun() -> loop(#{}) end),
            register(named_kv_actor, Pid),
            {ok, Pid};
        _Pid ->
            {error, already_started}
    end.

%% @doc Associate Key with Value in the registered actor map state, awaiting correlated acknowledgement up to one second.
put(Key, Value) ->
    case whereis(named_kv_actor) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {put, Ref, self(), Key, Value},
            receive
                {reply, Ref, ok} -> ok
            after 1000 -> {error, timeout}
            end
    end.

%% @doc Retrieve Value associated with Key from the registered actor map state, awaiting correlated reply up to one second.
get(Key) ->
    case whereis(named_kv_actor) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {get, Ref, self(), Key},
            receive
                {reply, Ref, Result} -> Result
            after 1000 -> {error, timeout}
            end
    end.

%% @doc Request the registered actor to unregister its atom name and cleanly terminate, awaiting correlated acknowledgement up to one second.
stop() ->
    case whereis(named_kv_actor) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {stop, Ref, self()},
            receive
                {reply, Ref, ok} -> ok
            after 1000 -> {error, timeout}
            end
    end.

%% @doc Tail-recursive state loop storing key-value pairs in an immutable map and answering correlated client requests.
loop(Map) ->
    receive
        {put, Ref, From, K, V} ->
            From ! {reply, Ref, ok},
            loop(maps:put(K, V, Map));
        {get, Ref, From, K} ->
            Result = case maps:find(K, Map) of
                {ok, Val} -> {ok, Val};
                error -> {error, not_found}
            end,
            From ! {reply, Ref, Result},
            loop(Map);
        {stop, Ref, From} ->
            unregister(named_kv_actor),
            From ! {reply, Ref, ok},
            ok
    end.
`

	doorLockFsmSolution := `-module(door_lock_fsm).
-export([
    start/1,
    enter_code/2,
    lock/1,
    get_state/1,
    stop/1,
    locked/2,
    unlocked/1
]).

%% @doc Spawn a concurrent door lock actor starting in locked state with zero failed attempts and return its process identifier.
start(SecretCode) ->
    spawn(fun() -> locked(SecretCode, 0) end).

%% @doc Submit a passcode attempt to the door lock actor, returning unlock status or error with failed attempt count.
enter_code(Pid, AttemptCode) ->
    Ref = make_ref(),
    Pid ! {enter_code, self(), Ref, AttemptCode},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

%% @doc Command the door lock actor to transition into locked state and reset failed attempt count to zero.
lock(Pid) ->
    Ref = make_ref(),
    Pid ! {lock, self(), Ref},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

%% @doc Query the current state of the door lock actor, returning locked with failure count or unlocked.
get_state(Pid) ->
    Ref = make_ref(),
    Pid ! {get_state, self(), Ref},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

%% @doc Command the door lock actor to terminate execution cleanly.
stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

%% @doc Mutual tail-recursive state loop handling messages while the door is locked.
locked(SecretCode, FailedAttempts) ->
    receive
        {enter_code, From, Ref, SecretCode} ->
            From ! {reply, Ref, {ok, unlocked}},
            unlocked(SecretCode);
        {enter_code, From, Ref, _Wrong} ->
            NextFailed = FailedAttempts + 1,
            From ! {reply, Ref, {error, {wrong_code, NextFailed}}},
            locked(SecretCode, NextFailed);
        {lock, From, Ref} ->
            From ! {reply, Ref, ok},
            locked(SecretCode, FailedAttempts);
        {get_state, From, Ref} ->
            From ! {reply, Ref, {locked, FailedAttempts}},
            locked(SecretCode, FailedAttempts);
        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.

%% @doc Mutual tail-recursive state loop handling messages while the door is unlocked.
unlocked(SecretCode) ->
    receive
        {enter_code, From, Ref, _Any} ->
            From ! {reply, Ref, {ok, already_unlocked}},
            unlocked(SecretCode);
        {lock, From, Ref} ->
            From ! {reply, Ref, ok},
            locked(SecretCode, 0);
        {get_state, From, Ref} ->
            From ! {reply, Ref, unlocked},
            unlocked(SecretCode);
        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.
`

	incidentMailboxLeakSolution := `-module(incident_mailbox_leak).
-export([
    start/0,
    record_metric/2,
    get_summary/1,
    inspect_queue_len/1,
    get_mailbox_len/1,
    stop/1,
    loop/1
]).

%% @doc Spawn a concurrent telemetry aggregator actor initialized with count 0 and total 0, returning {ok, Pid}.
start() ->
    Pid = spawn(fun() -> loop(#{count => 0, total => 0}) end),
    {ok, Pid}.

%% @doc Asynchronously send a numeric measurement to the telemetry aggregator actor.
record_metric(Pid, Val) ->
    Pid ! {record_metric, Val},
    ok.

%% @doc Query aggregated summary metrics from the telemetry actor with a 1,000ms timeout guard.
get_summary(Pid) ->
    Ref = erlang:make_ref(),
    Pid ! {get_summary, self(), Ref},
    receive
        {summary, Ref, Summary} ->
            {ok, Summary}
    after 1000 ->
        {error, timeout}
    end.

%% @doc Query the BEAM runtime for the current message queue length of Pid, returning 0 if dead.
inspect_queue_len(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

%% @doc Query the BEAM runtime for the current message queue length of Pid, returning 0 if dead.
get_mailbox_len(Pid) ->
    inspect_queue_len(Pid).

%% @doc Asynchronously command the telemetry aggregator actor to terminate cleanly.
stop(Pid) ->
    Pid ! stop,
    ok.

%% @doc Tail-recursive state loop accumulating metric measurements and discarding unhandled messages.
loop(State = #{count := Count, total := Total}) ->
    receive
        {record_metric, Val} ->
            loop(State#{count => Count + 1, total => Total + Val});
        {get_summary, From, Ref} ->
            From ! {summary, Ref, State},
            loop(State);
        stop ->
            ok;
        _Unknown ->
            loop(State)
    end.
`

	ledgerActorSolution := `-module(ledger_actor).
-export([
    start/1,
    get_balance/2,
    process_transaction/2,
    process_batch/2,
    stop/1,
    loop/1
]).

%% @doc Spawns the concurrent ledger actor process initialized with a list of account tuples.
%% Returns the process identifier (PID) of the spawned actor.
start(InitialAccounts) ->
    spawn(fun() -> loop(InitialAccounts) end).

%% @doc Queries the current balance for an account identified by AccountId with a 1,000ms timeout guard.
%% Returns {ok, Balance} if the account exists, {error, not_found} if missing, or {error, timeout} on deadline expiration.
get_balance(Pid, AccountId) ->
    Ref = make_ref(),
    Pid ! {get_balance, self(), Ref, AccountId},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

%% @doc Atomically executes a single deposit, withdrawal, or transfer transaction with a 1,000ms timeout guard.
%% Validates account existence and sufficiency of funds, returning updated balances or structured error tuples.
process_transaction(Pid, TxTuple) ->
    Ref = make_ref(),
    Pid ! {transaction, self(), Ref, TxTuple},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

%% @doc Sequentially processes a list of transaction tuples against the ledger with a 2,000ms timeout guard.
%% Applies valid operations while skipping invalid ones, returning {ok, AppliedCount, RejectedCount}.
process_batch(Pid, TransactionsList) ->
    Ref = make_ref(),
    Pid ! {process_batch, self(), Ref, TransactionsList},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

%% @doc Requests clean termination of the ledger actor process with a 1,000ms timeout guard.
%% Returns ok upon confirmed shutdown, or {error, timeout} if the actor fails to respond.
stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

%% @doc Tail-recursive actor message loop serializing incoming financial requests through its mailbox.
%% Dispatches replies using caller correlation tokens and recurses with updated account state.
loop(Accounts) ->
    receive
        {get_balance, From, Ref, AccountId} ->
            Result = case find_account(AccountId, Accounts) of
                {ok, {account, _, _, Balance}} -> {ok, Balance};
                error -> {error, not_found}
            end,
            From ! {reply, Ref, Result},
            loop(Accounts);

        {transaction, From, Ref, Tx} ->
            case apply_tx(Tx, Accounts) of
                {ok, ReplyVal, NewAccounts} ->
                    From ! {reply, Ref, {ok, ReplyVal}},
                    loop(NewAccounts);
                {error, Reason} ->
                    From ! {reply, Ref, {error, Reason}},
                    loop(Accounts)
            end;

        {process_batch, From, Ref, TxList} ->
            {AppliedCount, RejectedCount, NewAccounts} = run_batch(TxList, Accounts, 0, 0),
            From ! {reply, Ref, {ok, AppliedCount, RejectedCount}},
            loop(NewAccounts);

        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.

find_account(_Id, []) -> error;
find_account(Id, [{account, Id, Name, Bal} | _]) -> {ok, {account, Id, Name, Bal}};
find_account(Id, [_ | Rest]) -> find_account(Id, Rest).

apply_tx({deposit, AccountId, Amount}, Accounts) when Amount > 0 ->
    case find_account(AccountId, Accounts) of
        {ok, {account, Id, Name, Bal}} ->
            NewBal = Bal + Amount,
            NewAccounts = update_account({account, Id, Name, NewBal}, Accounts),
            {ok, NewBal, NewAccounts};
        error ->
            {error, not_found}
    end;
apply_tx({withdraw, AccountId, Amount}, Accounts) when Amount > 0 ->
    case find_account(AccountId, Accounts) of
        {ok, {account, Id, Name, Bal}} when Bal >= Amount ->
            NewBal = Bal - Amount,
            NewAccounts = update_account({account, Id, Name, NewBal}, Accounts),
            {ok, NewBal, NewAccounts};
        {ok, _} ->
            {error, insufficient_funds};
        error ->
            {error, not_found}
    end;
apply_tx({transfer, FromId, ToId, Amount}, Accounts) when Amount > 0 ->
    case {find_account(FromId, Accounts), find_account(ToId, Accounts)} of
        {{ok, {account, FromId, FromName, FromBal}}, {ok, {account, ToId, ToName, ToBal}}} ->
            if
                FromBal >= Amount ->
                    NewFromBal = FromBal - Amount,
                    NewToBal = ToBal + Amount,
                    Acc1 = update_account({account, FromId, FromName, NewFromBal}, Accounts),
                    Acc2 = update_account({account, ToId, ToName, NewToBal}, Acc1),
                    {ok, NewFromBal, Acc2};
                true ->
                    {error, insufficient_funds}
            end;
        _ ->
            {error, not_found}
    end;
apply_tx(_Invalid, _Accounts) ->
    {error, invalid_transaction}.

update_account(NewAcc, Accounts) ->
    update_account_tail(NewAcc, Accounts, []).

update_account_tail({account, Id, _, _} = NewAcc, [{account, Id, _, _} | Rest], Acc) ->
    reverse_append(Acc, [NewAcc | Rest]);
update_account_tail(NewAcc, [Head | Rest], Acc) ->
    update_account_tail(NewAcc, Rest, [Head | Acc]);
update_account_tail(_NewAcc, [], Acc) ->
    reverse_append(Acc, []).

reverse_append([], Acc) -> Acc;
reverse_append([H | T], Acc) -> reverse_append(T, [H | Acc]).

run_batch([], Accounts, Applied, Rejected) ->
    {Applied, Rejected, Accounts};
run_batch([Tx | Rest], Accounts, Applied, Rejected) ->
    case apply_tx(Tx, Accounts) of
        {ok, _ReplyVal, NewAccounts} ->
            run_batch(Rest, NewAccounts, Applied + 1, Rejected);
        {error, _Reason} ->
            run_batch(Rest, Accounts, Applied, Rejected + 1)
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
			name:       "ch05-l01 Guided Demo: Process Benchmark & Telemetry",
			exerciseID: "ch05-l01",
			files: map[string]string{
				"src/process_bench.erl": processBenchSolution,
			},
			wantScore:    100,
			wantStages:   4,
			visibleCount: 3,
		},
		{
			name:       "ch05-l02 Asynchronous Ping Actor & Broadcast",
			exerciseID: "ch05-l02",
			files: map[string]string{
				"src/ping_actor.erl": pingActorSolution,
			},
			wantScore:    100,
			wantStages:   4,
			visibleCount: 3,
		},
		{
			name:       "ch05-l03 Selective Receive, Timeouts & Mailbox Flush",
			exerciseID: "ch05-l03",
			files: map[string]string{
				"src/priority_mailbox.erl": priorityMailboxSolution,
			},
			wantScore:    100,
			wantStages:   5,
			visibleCount: 3,
		},
		{
			name:       "ch05-l04 Client-Server Barrier & Tail-Recursive State Loops",
			exerciseID: "ch05-l04",
			files: map[string]string{
				"src/counter_actor.erl": counterActorSolution,
			},
			wantScore:    100,
			wantStages:   4,
			visibleCount: 3,
		},
		{
			name:       "ch05-l05 Process Registry, Dead-PID vs. Unregistered-Atom Semantics & make_ref() Correlation",
			exerciseID: "ch05-l05",
			files: map[string]string{
				"src/named_kv_actor.erl": namedKvActorSolution,
			},
			wantScore:    100,
			wantStages:   5,
			visibleCount: 3,
		},
		{
			name:       "ch05-l06 Finite State Machine (FSM) Actors via Mutual Tail Recursion",
			exerciseID: "ch05-l06",
			files: map[string]string{
				"src/door_lock_fsm.erl": doorLockFsmSolution,
			},
			wantScore:    100,
			wantStages:   4,
			visibleCount: 3,
		},
		{
			name:       "ch05-l07 Production Incident #101: Unbounded Mailbox Memory Leak in Telemetry Actor",
			exerciseID: "ch05-l07",
			files: map[string]string{
				"src/incident_mailbox_leak.erl": incidentMailboxLeakSolution,
			},
			wantScore:    100,
			wantStages:   4,
			visibleCount: 3,
		},
		{
			name:       "ch05-l08 Chapter 5 Problem Set: Concurrent Bank Ledger & Order Actor",
			exerciseID: "ch05-l08",
			files: map[string]string{
				"src/ledger_actor.erl": ledgerActorSolution,
			},
			wantScore:    100,
			wantStages:   6,
			visibleCount: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sessID := fmt.Sprintf("test-sess-%s", tt.exerciseID)
			session, err := poolMgr.ClaimSession(sessID)
			if err != nil {
				t.Fatalf("Failed to claim session: %v", err)
			}
			defer poolMgr.ReleaseSession(sessID)

			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
			defer cancel()

			report, err := runner.RunVerification(ctx, session, tt.exerciseID, tt.files)
			if err != nil {
				t.Fatalf("RunVerification failed: %v", err)
			}

			if report.Score != tt.wantScore {
				t.Errorf("Score mismatch: got %d, want %d", report.Score, tt.wantScore)
				for _, st := range report.Stages {
					t.Logf("  Stage [%s]: %s (status: %s) -> %s", st.ID, st.Title, st.Status, st.Details)
				}
			}

			if len(report.Stages) != tt.wantStages {
				t.Errorf("Stages count mismatch: got %d, want %d", len(report.Stages), tt.wantStages)
			}

			for _, st := range report.Stages {
				if st.Status != "passed" {
					t.Errorf("Stage failed [%s]: %s -> %s", st.ID, st.Title, st.Details)
				}
			}

			// Test RunCode visible tests
			runRes, err := runner.RunCode(ctx, session, tt.exerciseID, tt.files, nil)
			if err != nil {
				t.Fatalf("RunCode failed: %v", err)
			}
			if !runRes.CompileOk {
				t.Fatalf("RunCode compilation failed:\n%s", runRes.Stdout)
			}
			if len(runRes.VisibleTests) != tt.visibleCount {
				t.Logf("[%s] RunCode Stdout:\n%s", tt.exerciseID, runRes.Stdout)
				t.Errorf("VisibleTests count mismatch: got %d, want %d", len(runRes.VisibleTests), tt.visibleCount)
			}
			for i, vt := range runRes.VisibleTests {
				if !vt.Passed {
					t.Errorf("Visible test #%d (%s) failed: expected %s, got %s", i+1, vt.CallStr, vt.Expected, vt.Actual)
				}
			}
		})
	}

	// Negative test: missing export inspect_process/1
	t.Run("ch05-l01 Negative Missing Export", func(t *testing.T) {
		sessID := "test-sess-ch05-l01-neg-export"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		badExportCode := `-module(process_bench).
-export([run/0, run_bench/1]).

run() -> ok.
run_bench(N) when is_integer(N), N > 0 ->
    StartUs = erlang:monotonic_time(microsecond),
    Pids = [spawn(fun() -> receive stop -> ok end end) || _ <- lists:seq(1, N)],
    [P ! stop || P <- Pids],
    #{spawned => N, avg_memory_bytes => 2688, elapsed_us => StartUs}.
inspect_process(_Pid) -> 2688.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l01", map[string]string{
			"src/process_bench.erl": badExportCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for missing export, got %d", report.Score)
		}

		foundFailedCompile := false
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				foundFailedCompile = true
			}
		}
		if !foundFailedCompile {
			t.Errorf("Expected compile_and_export_audit to fail on missing export")
		}
	})

	// Negative test: bloated memory footprint exceeding 4096 bytes
	t.Run("ch05-l01 Negative Bloated Memory", func(t *testing.T) {
		sessID := "test-sess-ch05-l01-neg-mem"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		bloatedMemCode := `-module(process_bench).
-export([run/0, run_bench/1, inspect_process/1]).

run() -> ok.
run_bench(N) when is_integer(N), N > 0 ->
    StartUs = erlang:monotonic_time(microsecond),
    Pids = [spawn(fun() -> receive stop -> ok end end) || _ <- lists:seq(1, N)],
    [P ! stop || P <- Pids],
    #{spawned => N, avg_memory_bytes => 99999, elapsed_us => StartUs}.
inspect_process(_Pid) -> 2688.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l01", map[string]string{
			"src/process_bench.erl": bloatedMemCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for bloated memory, got %d", report.Score)
		}

		foundFailedBench := false
		for _, st := range report.Stages {
			if st.ID == "process_spawn_benchmark" && st.Status == "failed" {
				foundFailedBench = true
			}
		}
		if !foundFailedBench {
			t.Errorf("Expected process_spawn_benchmark to fail for bloated memory")
		}
	})

	// Negative test: body recursion in responder_loop/0 rejected by AST verifier
	t.Run("ch05-l02 Negative Body Recursion", func(t *testing.T) {
		sessID := "test-sess-ch05-l02-neg-rec"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		bodyRecCode := `-module(ping_actor).
-export([start_responder/0, ping/2, broadcast/2, responder_loop/0]).

start_responder() ->
    spawn(fun() -> responder_loop() end).

responder_loop() ->
    receive
        {ping, CallerPid, Payload} ->
            CallerPid ! {pong, self(), Payload},
            responder_loop(),
            ok;
        stop ->
            ok
    end.

ping(ResponderPid, Payload) ->
    ResponderPid ! {ping, self(), Payload},
    receive
        {pong, ResponderPid, Payload} ->
            {ok, Payload}
    after 1000 ->
        {error, timeout}
    end.

broadcast(PidsList, Msg) ->
    [P ! Msg || P <- PidsList],
    {sent, length(PidsList)}.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l02", map[string]string{
			"src/ping_actor.erl": bodyRecCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for body recursion, got %d", report.Score)
		}

		foundFailedAst := false
		for _, st := range report.Stages {
			if st.ID == "ast_self_and_spawn_audit" && st.Status == "failed" {
				foundFailedAst = true
			}
		}
		if !foundFailedAst {
			t.Errorf("Expected ast_self_and_spawn_audit to fail on body recursion")
		}
	})

	// Negative test: missing export broadcast/2
	t.Run("ch05-l02 Negative Missing Export", func(t *testing.T) {
		sessID := "test-sess-ch05-l02-neg-export"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		badExportCode := `-module(ping_actor).
-export([start_responder/0, ping/2, responder_loop/0]).

start_responder() ->
    spawn(fun() -> responder_loop() end).

responder_loop() ->
    receive
        {ping, CallerPid, Payload} ->
            CallerPid ! {pong, self(), Payload},
            responder_loop();
        stop ->
            ok
    end.

ping(ResponderPid, Payload) ->
    ResponderPid ! {ping, self(), Payload},
    receive
        {pong, ResponderPid, Payload} ->
            {ok, Payload}
    after 1000 ->
        {error, timeout}
    end.

broadcast(PidsList, Msg) ->
    [P ! Msg || P <- PidsList],
    {sent, length(PidsList)}.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l02", map[string]string{
			"src/ping_actor.erl": badExportCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for missing export, got %d", report.Score)
		}

		foundFailedCompile := false
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				foundFailedCompile = true
			}
		}
		if !foundFailedCompile {
			t.Errorf("Expected compile_and_export_audit to fail on missing export")
		}
	})

	// Negative test: missing export flush_mailbox/0
	t.Run("ch05-l03 Negative Missing Export", func(t *testing.T) {
		sessID := "test-sess-ch05-l03-neg-export"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		badExportCode := `-module(priority_mailbox).
-export([receive_urgent_first/1, request_with_timeout/3]).

receive_urgent_first(_ExpectedCount) -> [].
request_with_timeout(_TargetPid, _RequestMsg, _TimeoutMs) -> {error, timeout}.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l03", map[string]string{
			"src/priority_mailbox.erl": badExportCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for missing export, got %d", report.Score)
		}

		foundFailedCompile := false
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				foundFailedCompile = true
			}
		}
		if !foundFailedCompile {
			t.Errorf("Expected compile_and_export_audit to fail on missing export")
		}
	})

	// Negative test: missing receive_after construct
	t.Run("ch05-l03 Negative Missing Receive After", func(t *testing.T) {
		sessID := "test-sess-ch05-l03-neg-ast"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		noAfterCode := `-module(priority_mailbox).
-export([receive_urgent_first/1, request_with_timeout/3, flush_mailbox/0]).

receive_urgent_first(_ExpectedCount) -> [].
request_with_timeout(TargetPid, RequestMsg, _TimeoutMs) ->
    TargetPid ! {request, self(), RequestMsg},
    receive
        {reply, RequestMsg, Result} -> {ok, Result}
    end.
flush_mailbox() -> [].
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l03", map[string]string{
			"src/priority_mailbox.erl": noAfterCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for missing receive_after, got %d", report.Score)
		}

		foundFailedAst := false
		for _, st := range report.Stages {
			if st.ID == "ast_receive_after_audit" && st.Status == "failed" {
				foundFailedAst = true
			}
		}
		if !foundFailedAst {
			t.Errorf("Expected ast_receive_after_audit to fail on missing receive_after")
		}
	})

	// Negative test: inverted priority (normal ahead of urgent)
	t.Run("ch05-l03 Negative Inverted Priority", func(t *testing.T) {
		sessID := "test-sess-ch05-l03-neg-priority"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		invertedPriorityCode := `-module(priority_mailbox).
-export([receive_urgent_first/1, request_with_timeout/3, flush_mailbox/0]).

receive_urgent_first(ExpectedCount) ->
    receive_loop(ExpectedCount, []).

receive_loop(0, Acc) -> lists:reverse(Acc);
receive_loop(N, Acc) ->
    receive
        {normal, Payload} ->
            receive_loop(N - 1, [Payload | Acc])
    after 0 ->
        receive
            {urgent, Payload} ->
                receive_loop(N - 1, [Payload | Acc])
        after 0 ->
            lists:reverse(Acc)
        end
    end.

request_with_timeout(TargetPid, RequestMsg, TimeoutMs) ->
    TargetPid ! {request, self(), RequestMsg},
    receive
        {reply, RequestMsg, Result} -> {ok, Result}
    after TimeoutMs ->
        {error, timeout}
    end.

flush_mailbox() ->
    flush_loop([]).

flush_loop(Acc) ->
    receive
        Msg -> flush_loop([Msg | Acc])
    after 0 ->
        lists:reverse(Acc)
    end.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l03", map[string]string{
			"src/priority_mailbox.erl": invertedPriorityCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for inverted priority, got %d", report.Score)
		}

		foundFailedPriority := false
		for _, st := range report.Stages {
			if st.ID == "selective_receive_priority" && st.Status == "failed" {
				foundFailedPriority = true
			}
		}
		if !foundFailedPriority {
			t.Errorf("Expected selective_receive_priority to fail on inverted priority")
		}
	})

	// Negative test: body recursion in loop/1 rejected by AST verifier
	t.Run("ch05-l04 Negative Body Recursion", func(t *testing.T) {
		sessID := "test-sess-ch05-l04-neg-rec"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		bodyRecCode := `-module(counter_actor).
-export([start/1, increment/2, decrement/2, get_value/1, stop/1, loop/1]).

start(InitialValue) -> spawn(fun() -> loop(InitialValue) end).
increment(Pid, Delta) -> Pid ! {increment, Delta}, ok.
decrement(Pid, Delta) -> Pid ! {decrement, Delta}, ok.
get_value(Pid) ->
    Pid ! {get, self()},
    receive {value, Val} -> {ok, Val} after 1000 -> {error, timeout} end.
stop(Pid) -> Pid ! stop, ok.

loop(CurrentVal) ->
    receive
        {increment, Delta} ->
            loop(CurrentVal + Delta),
            ok;
        {decrement, Delta} ->
            loop(CurrentVal - Delta);
        {get, Caller} ->
            Caller ! {value, CurrentVal},
            loop(CurrentVal);
        stop ->
            ok
    end.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l04", map[string]string{
			"src/counter_actor.erl": bodyRecCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for body recursion, got %d", report.Score)
		}

		foundFailedAst := false
		for _, st := range report.Stages {
			if st.ID == "ast_tco_loop_audit" && st.Status == "failed" {
				foundFailedAst = true
			}
		}
		if !foundFailedAst {
			t.Errorf("Expected ast_tco_loop_audit to fail on body recursion")
		}
	})

	// Negative test: missing export loop/1
	t.Run("ch05-l04 Negative Missing Export", func(t *testing.T) {
		sessID := "test-sess-ch05-l04-neg-export"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		badExportCode := `-module(counter_actor).
-export([start/1, increment/2, decrement/2, get_value/1, stop/1]).

start(InitialValue) -> spawn(fun() -> loop(InitialValue) end).
increment(Pid, Delta) -> Pid ! {increment, Delta}, ok.
decrement(Pid, Delta) -> Pid ! {decrement, Delta}, ok.
get_value(Pid) ->
    Pid ! {get, self()},
    receive {value, Val} -> {ok, Val} after 1000 -> {error, timeout} end.
stop(Pid) -> Pid ! stop, ok.

loop(CurrentVal) ->
    receive
        {increment, Delta} -> loop(CurrentVal + Delta);
        {decrement, Delta} -> loop(CurrentVal - Delta);
        {get, Caller} ->
            Caller ! {value, CurrentVal},
            loop(CurrentVal);
        stop -> ok
    end.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l04", map[string]string{
			"src/counter_actor.erl": badExportCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for missing export, got %d", report.Score)
		}

		foundFailedCompile := false
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				foundFailedCompile = true
			}
		}
		if !foundFailedCompile {
			t.Errorf("Expected compile_and_export_audit to fail on missing export")
		}
	})

	// Negative test: arithmetic logic bug in state accumulation
	t.Run("ch05-l04 Negative Calculation Mismatch", func(t *testing.T) {
		sessID := "test-sess-ch05-l04-neg-calc"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		buggyCalcCode := `-module(counter_actor).
-export([start/1, increment/2, decrement/2, get_value/1, stop/1, loop/1]).

start(InitialValue) -> spawn(fun() -> loop(InitialValue) end).
increment(Pid, Delta) -> Pid ! {increment, Delta}, ok.
decrement(Pid, Delta) -> Pid ! {decrement, Delta}, ok.
get_value(Pid) ->
    Pid ! {get, self()},
    receive {value, Val} -> {ok, Val} after 1000 -> {error, timeout} end.
stop(Pid) -> Pid ! stop, ok.

loop(CurrentVal) ->
    receive
        {increment, Delta} -> loop(CurrentVal + Delta);
        {decrement, Delta} -> loop(CurrentVal + Delta); %% BUG: adds instead of subtracting
        {get, Caller} ->
            Caller ! {value, CurrentVal},
            loop(CurrentVal);
        stop -> ok
    end.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l04", map[string]string{
			"src/counter_actor.erl": buggyCalcCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for calculation bug, got %d", report.Score)
		}

		foundFailedCalc := false
		for _, st := range report.Stages {
			if st.ID == "actor_state_accumulation" && st.Status == "failed" {
				foundFailedCalc = true
			}
		}
		if !foundFailedCalc {
			t.Errorf("Expected actor_state_accumulation to fail on calculation bug")
		}
	})

	// ch05-l05 Negative test 1: missing required AST call whereis/1
	t.Run("ch05-l05 Negative Missing whereis/1 AST Rule Violation", func(t *testing.T) {
		sessID := "test-sess-ch05-l05-neg-ast"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		// Directly sends to atom without whereis/1 lookup
		buggyAstCode := `-module(named_kv_actor).
-export([start_registered/0, put/2, get/1, stop/0, loop/1]).

start_registered() ->
    Pid = spawn(fun() -> loop(#{}) end),
    register(named_kv_actor, Pid),
    {ok, Pid}.

put(Key, Value) ->
    Ref = make_ref(),
    named_kv_actor ! {put, Ref, self(), Key, Value},
    receive {reply, Ref, ok} -> ok after 1000 -> {error, timeout} end.

get(Key) ->
    Ref = make_ref(),
    named_kv_actor ! {get, Ref, self(), Key},
    receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end.

stop() ->
    Ref = make_ref(),
    named_kv_actor ! {stop, Ref, self()},
    receive {reply, Ref, ok} -> ok after 1000 -> {error, timeout} end.

loop(Map) ->
    receive
        {put, Ref, From, K, V} -> From ! {reply, Ref, ok}, loop(maps:put(K, V, Map));
        {get, Ref, From, K} ->
            Res = case maps:find(K, Map) of {ok, Val} -> {ok, Val}; error -> {error, not_found} end,
            From ! {reply, Ref, Res}, loop(Map);
        {stop, Ref, From} -> unregister(named_kv_actor), From ! {reply, Ref, ok}, ok
    end.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l05", map[string]string{
			"src/named_kv_actor.erl": buggyAstCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for missing whereis/1 call, got %d", report.Score)
		}

		foundFailedAst := false
		for _, st := range report.Stages {
			if st.ID == "ast_registry_and_ref_audit" && st.Status == "failed" {
				foundFailedAst = true
			}
		}
		if !foundFailedAst {
			t.Errorf("Expected ast_registry_and_ref_audit to fail on missing whereis/1")
		}
	})

	// ch05-l05 Negative test 2: missing required export stop/0
	t.Run("ch05-l05 Negative Missing Export", func(t *testing.T) {
		sessID := "test-sess-ch05-l05-neg-export"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		missingExportCode := `-module(named_kv_actor).
-export([start_registered/0, put/2, get/1, loop/1]). %% Missing stop/0

start_registered() ->
    case whereis(named_kv_actor) of
        undefined ->
            Pid = spawn(fun() -> loop(#{}) end),
            register(named_kv_actor, Pid),
            {ok, Pid};
        _Pid -> {error, already_started}
    end.

put(Key, Value) ->
    case whereis(named_kv_actor) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {put, Ref, self(), Key, Value},
            receive {reply, Ref, ok} -> ok after 1000 -> {error, timeout} end
    end.

get(Key) ->
    case whereis(named_kv_actor) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {get, Ref, self(), Key},
            receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end
    end.

stop() -> ok.

loop(Map) ->
    receive
        {put, Ref, From, K, V} -> From ! {reply, Ref, ok}, loop(maps:put(K, V, Map));
        {get, Ref, From, K} ->
            Res = case maps:find(K, Map) of {ok, Val} -> {ok, Val}; error -> {error, not_found} end,
            From ! {reply, Ref, Res}, loop(Map);
        {stop, Ref, From} -> unregister(named_kv_actor), From ! {reply, Ref, ok}, ok
    end.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l05", map[string]string{
			"src/named_kv_actor.erl": missingExportCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for missing export, got %d", report.Score)
		}

		foundFailedCompile := false
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				foundFailedCompile = true
			}
		}
		if !foundFailedCompile {
			t.Errorf("Expected compile_and_export_audit to fail on missing export")
		}
	})

	// ch05-l05 Negative test 3: non-tail recursion on loop/1
	t.Run("ch05-l05 Negative Body Recursion on loop/1", func(t *testing.T) {
		sessID := "test-sess-ch05-l05-neg-rec"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		bodyRecCode := `-module(named_kv_actor).
-export([start_registered/0, put/2, get/1, stop/0, loop/1]).

start_registered() ->
    case whereis(named_kv_actor) of
        undefined ->
            Pid = spawn(fun() -> loop(#{}) end),
            register(named_kv_actor, Pid),
            {ok, Pid};
        _Pid -> {error, already_started}
    end.

put(Key, Value) ->
    case whereis(named_kv_actor) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {put, Ref, self(), Key, Value},
            receive {reply, Ref, ok} -> ok after 1000 -> {error, timeout} end
    end.

get(Key) ->
    case whereis(named_kv_actor) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {get, Ref, self(), Key},
            receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end
    end.

stop() ->
    case whereis(named_kv_actor) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {stop, Ref, self()},
            receive {reply, Ref, ok} -> ok after 1000 -> {error, timeout} end
    end.

loop(Map) ->
    receive
        {put, Ref, From, K, V} ->
            From ! {reply, Ref, ok},
            loop(maps:put(K, V, Map)) + 1; %% VIOLATION: Body recursion
        {get, Ref, From, K} ->
            Res = case maps:find(K, Map) of {ok, Val} -> {ok, Val}; error -> {error, not_found} end,
            From ! {reply, Ref, Res},
            loop(Map);
        {stop, Ref, From} -> unregister(named_kv_actor), From ! {reply, Ref, ok}, ok
    end.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l05", map[string]string{
			"src/named_kv_actor.erl": bodyRecCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for body recursion, got %d", report.Score)
		}

		foundFailedAst := false
		for _, st := range report.Stages {
			if st.ID == "ast_registry_and_ref_audit" && st.Status == "failed" {
				foundFailedAst = true
			}
		}
		if !foundFailedAst {
			t.Errorf("Expected ast_registry_and_ref_audit to fail on body recursion")
		}
	})

	// ch05-l06 Negative test 1: non-tail recursion on locked/2
	t.Run("ch05-l06 Negative Body Recursion on locked/2", func(t *testing.T) {
		sessID := "test-sess-ch05-l06-neg-rec"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		bodyRecCode := `-module(door_lock_fsm).
-export([start/1, enter_code/2, lock/1, get_state/1, stop/1, locked/2, unlocked/1]).

start(SecretCode) -> spawn(fun() -> locked(SecretCode, 0) end).

enter_code(Pid, AttemptCode) ->
    Ref = make_ref(),
    Pid ! {enter_code, self(), Ref, AttemptCode},
    receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end.

lock(Pid) ->
    Ref = make_ref(),
    Pid ! {lock, self(), Ref},
    receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end.

get_state(Pid) ->
    Ref = make_ref(),
    Pid ! {get_state, self(), Ref},
    receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end.

stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive {reply, Ref, ok} -> ok after 1000 -> {error, timeout} end.

locked(SecretCode, FailedAttempts) ->
    receive
        {enter_code, From, Ref, SecretCode} ->
            From ! {reply, Ref, {ok, unlocked}},
            unlocked(SecretCode);
        {enter_code, From, Ref, _Wrong} ->
            NextFailed = FailedAttempts + 1,
            From ! {reply, Ref, {error, {wrong_code, NextFailed}}},
            locked(SecretCode, NextFailed) + 1; %% VIOLATION: Body recursion on locked/2
        {lock, From, Ref} ->
            From ! {reply, Ref, ok},
            locked(SecretCode, FailedAttempts);
        {get_state, From, Ref} ->
            From ! {reply, Ref, {locked, FailedAttempts}},
            locked(SecretCode, FailedAttempts);
        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.

unlocked(SecretCode) ->
    receive
        {enter_code, From, Ref, _Any} ->
            From ! {reply, Ref, {ok, already_unlocked}},
            unlocked(SecretCode);
        {lock, From, Ref} ->
            From ! {reply, Ref, ok},
            locked(SecretCode, 0);
        {get_state, From, Ref} ->
            From ! {reply, Ref, unlocked},
            unlocked(SecretCode);
        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l06", map[string]string{
			"src/door_lock_fsm.erl": bodyRecCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for body recursion, got %d", report.Score)
		}

		foundFailedAst := false
		for _, st := range report.Stages {
			if st.ID == "ast_mutual_tail_recursion" && st.Status == "failed" {
				foundFailedAst = true
			}
		}
		if !foundFailedAst {
			t.Errorf("Expected ast_mutual_tail_recursion to fail on body recursion")
		}
	})

	// ch05-l06 Negative test 2: missing export unlocked/1
	t.Run("ch05-l06 Negative Missing Export", func(t *testing.T) {
		sessID := "test-sess-ch05-l06-neg-exp"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		missingExpCode := `-module(door_lock_fsm).
-export([start/1, enter_code/2, lock/1, get_state/1, stop/1, locked/2]). %% VIOLATION: missing unlocked/1

start(SecretCode) -> spawn(fun() -> locked(SecretCode, 0) end).

enter_code(Pid, AttemptCode) ->
    Ref = make_ref(),
    Pid ! {enter_code, self(), Ref, AttemptCode},
    receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end.

lock(Pid) ->
    Ref = make_ref(),
    Pid ! {lock, self(), Ref},
    receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end.

get_state(Pid) ->
    Ref = make_ref(),
    Pid ! {get_state, self(), Ref},
    receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end.

stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive {reply, Ref, ok} -> ok after 1000 -> {error, timeout} end.

locked(SecretCode, FailedAttempts) ->
    receive
        {enter_code, From, Ref, SecretCode} ->
            From ! {reply, Ref, {ok, unlocked}},
            unlocked(SecretCode);
        {enter_code, From, Ref, _Wrong} ->
            NextFailed = FailedAttempts + 1,
            From ! {reply, Ref, {error, {wrong_code, NextFailed}}},
            locked(SecretCode, NextFailed);
        {lock, From, Ref} ->
            From ! {reply, Ref, ok},
            locked(SecretCode, FailedAttempts);
        {get_state, From, Ref} ->
            From ! {reply, Ref, {locked, FailedAttempts}},
            locked(SecretCode, FailedAttempts);
        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.

unlocked(SecretCode) ->
    receive
        {enter_code, From, Ref, _Any} ->
            From ! {reply, Ref, {ok, already_unlocked}},
            unlocked(SecretCode);
        {lock, From, Ref} ->
            From ! {reply, Ref, ok},
            locked(SecretCode, 0);
        {get_state, From, Ref} ->
            From ! {reply, Ref, unlocked},
            unlocked(SecretCode);
        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l06", map[string]string{
			"src/door_lock_fsm.erl": missingExpCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for missing export, got %d", report.Score)
		}

		foundFailedCompile := false
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				foundFailedCompile = true
			}
		}
		if !foundFailedCompile {
			t.Errorf("Expected compile_and_export_audit to fail on missing export")
		}
	})

	// ch05-l06 Negative test 3: failure counter not incremented on bad code
	t.Run("ch05-l06 Negative Failure Counter Bug", func(t *testing.T) {
		sessID := "test-sess-ch05-l06-neg-count"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		counterBugCode := `-module(door_lock_fsm).
-export([start/1, enter_code/2, lock/1, get_state/1, stop/1, locked/2, unlocked/1]).

start(SecretCode) -> spawn(fun() -> locked(SecretCode, 0) end).

enter_code(Pid, AttemptCode) ->
    Ref = make_ref(),
    Pid ! {enter_code, self(), Ref, AttemptCode},
    receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end.

lock(Pid) ->
    Ref = make_ref(),
    Pid ! {lock, self(), Ref},
    receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end.

get_state(Pid) ->
    Ref = make_ref(),
    Pid ! {get_state, self(), Ref},
    receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end.

stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive {reply, Ref, ok} -> ok after 1000 -> {error, timeout} end.

locked(SecretCode, FailedAttempts) ->
    receive
        {enter_code, From, Ref, SecretCode} ->
            From ! {reply, Ref, {ok, unlocked}},
            unlocked(SecretCode);
        {enter_code, From, Ref, _Wrong} ->
            %% BUG: Returns wrong_code 0 instead of incrementing counter
            From ! {reply, Ref, {error, {wrong_code, 0}}},
            locked(SecretCode, FailedAttempts);
        {lock, From, Ref} ->
            From ! {reply, Ref, ok},
            locked(SecretCode, FailedAttempts);
        {get_state, From, Ref} ->
            From ! {reply, Ref, {locked, FailedAttempts}},
            locked(SecretCode, FailedAttempts);
        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.

unlocked(SecretCode) ->
    receive
        {enter_code, From, Ref, _Any} ->
            From ! {reply, Ref, {ok, already_unlocked}},
            unlocked(SecretCode);
        {lock, From, Ref} ->
            From ! {reply, Ref, ok},
            locked(SecretCode, 0);
        {get_state, From, Ref} ->
            From ! {reply, Ref, unlocked},
            unlocked(SecretCode);
        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l06", map[string]string{
			"src/door_lock_fsm.erl": counterBugCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for counter bug, got %d", report.Score)
		}

		foundFailedFsm := false
		for _, st := range report.Stages {
			if st.ID == "fsm_state_transitions" && st.Status == "failed" {
				foundFailedFsm = true
			}
		}
		if !foundFailedFsm {
			t.Errorf("Expected fsm_state_transitions to fail on counter bug")
		}
	})

	// ch05-l07 Negative test 1: missing catch-all in loop/1 causes unhandled messages to leak in mailbox
	t.Run("ch05-l07 Negative Missing Catch All (Mailbox Leak)", func(t *testing.T) {
		sessID := "test-sess-ch05-l07-neg-leak"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		leakBugCode := `-module(incident_mailbox_leak).
-export([start/0, record_metric/2, get_summary/1, inspect_queue_len/1, get_mailbox_len/1, stop/1, loop/1]).

start() ->
    Pid = spawn(fun() -> loop(#{count => 0, total => 0}) end),
    {ok, Pid}.

record_metric(Pid, Val) ->
    Pid ! {record_metric, Val},
    ok.

get_summary(Pid) ->
    Ref = erlang:make_ref(),
    Pid ! {get_summary, self(), Ref},
    receive
        {summary, Ref, Summary} -> {ok, Summary}
    after 1000 ->
        {error, timeout}
    end.

inspect_queue_len(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

get_mailbox_len(Pid) -> inspect_queue_len(Pid).

stop(Pid) ->
    Pid ! stop,
    ok.

loop(State = #{count := Count, total := Total}) ->
    receive
        {record_metric, Val} ->
            loop(State#{count => Count + 1, total => Total + Val});
        {get_summary, From, Ref} ->
            From ! {summary, Ref, State},
            loop(State);
        stop ->
            ok
        %% BUG: Missing _Unknown -> loop(State) clause!
    end.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l07", map[string]string{
			"src/incident_mailbox_leak.erl": leakBugCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for mailbox leak bug, got %d", report.Score)
		}

		foundFailedLeak := false
		for _, st := range report.Stages {
			if st.ID == "unbounded_mailbox_leak_triage" && st.Status == "failed" {
				foundFailedLeak = true
			}
		}
		if !foundFailedLeak {
			t.Errorf("Expected unbounded_mailbox_leak_triage to fail on missing catch-all")
		}
	})

	// ch05-l07 Negative test 2: missing receive...after timeout in get_summary/1
	t.Run("ch05-l07 Negative Missing Timeout Guard", func(t *testing.T) {
		sessID := "test-sess-ch05-l07-neg-notimeout"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		noTimeoutCode := `-module(incident_mailbox_leak).
-export([start/0, record_metric/2, get_summary/1, inspect_queue_len/1, get_mailbox_len/1, stop/1, loop/1]).

start() ->
    Pid = spawn(fun() -> loop(#{count => 0, total => 0}) end),
    {ok, Pid}.

record_metric(Pid, Val) ->
    Pid ! {record_metric, Val},
    ok.

get_summary(Pid) ->
    Ref = erlang:make_ref(),
    Pid ! {get_summary, self(), Ref},
    receive
        {summary, Ref, Summary} -> {ok, Summary}
        %% BUG: Missing receive...after 1000 timeout!
    end.

inspect_queue_len(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

get_mailbox_len(Pid) -> inspect_queue_len(Pid).

stop(Pid) ->
    Pid ! stop,
    ok.

loop(State = #{count := Count, total := Total}) ->
    receive
        {record_metric, Val} ->
            loop(State#{count => Count + 1, total => Total + Val});
        {get_summary, From, Ref} ->
            From ! {summary, Ref, State},
            loop(State);
        stop ->
            ok;
        _Unknown ->
            loop(State)
    end.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l07", map[string]string{
			"src/incident_mailbox_leak.erl": noTimeoutCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for missing timeout guard, got %d", report.Score)
		}

		foundFailedAst := false
		for _, st := range report.Stages {
			if st.ID == "ast_and_tco_invariants" && st.Status == "failed" {
				foundFailedAst = true
			}
		}
		if !foundFailedAst {
			t.Errorf("Expected ast_and_tco_invariants to fail on missing receive_after")
		}
	})

	// ch05-l07 Negative test 3: missing get_mailbox_len/1 export
	t.Run("ch05-l07 Negative Missing Export", func(t *testing.T) {
		sessID := "test-sess-ch05-l07-neg-export"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		missingExportCode := `-module(incident_mailbox_leak).
-export([start/0, record_metric/2, get_summary/1, inspect_queue_len/1, stop/1, loop/1]).
%% BUG: get_mailbox_len/1 is not exported!

start() ->
    Pid = spawn(fun() -> loop(#{count => 0, total => 0}) end),
    {ok, Pid}.

record_metric(Pid, Val) ->
    Pid ! {record_metric, Val},
    ok.

get_summary(Pid) ->
    Ref = erlang:make_ref(),
    Pid ! {get_summary, self(), Ref},
    receive
        {summary, Ref, Summary} -> {ok, Summary}
    after 1000 ->
        {error, timeout}
    end.

inspect_queue_len(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

get_mailbox_len(Pid) -> inspect_queue_len(Pid).

stop(Pid) ->
    Pid ! stop,
    ok.

loop(State = #{count := Count, total := Total}) ->
    receive
        {record_metric, Val} ->
            loop(State#{count => Count + 1, total => Total + Val});
        {get_summary, From, Ref} ->
            From ! {summary, Ref, State},
            loop(State);
        stop ->
            ok;
        _Unknown ->
            loop(State)
    end.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l07", map[string]string{
			"src/incident_mailbox_leak.erl": missingExportCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for missing export, got %d", report.Score)
		}

		foundFailedCompile := false
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				foundFailedCompile = true
			}
		}
		if !foundFailedCompile {
			t.Errorf("Expected compile_and_export_audit to fail on missing export")
		}
	})

	// ch05-l08 Negative test 1: body recursion on loop/1 violates AST tail-recursion requirement
	t.Run("ch05-l08 Negative Body Recursion on loop/1", func(t *testing.T) {
		sessID := "test-sess-ch05-l08-neg-body"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		bodyRecursiveCode := `-module(ledger_actor).
-export([
    start/1,
    get_balance/2,
    process_transaction/2,
    process_batch/2,
    stop/1,
    loop/1
]).

start(InitialAccounts) ->
    spawn(fun() -> loop(InitialAccounts) end).

get_balance(Pid, AccountId) ->
    Ref = make_ref(),
    Pid ! {get_balance, self(), Ref, AccountId},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

process_transaction(Pid, TxTuple) ->
    Ref = make_ref(),
    Pid ! {transaction, self(), Ref, TxTuple},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

process_batch(Pid, TransactionsList) ->
    Ref = make_ref(),
    Pid ! {process_batch, self(), Ref, TransactionsList},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

loop(Accounts) ->
    receive
        {get_balance, From, Ref, AccountId} ->
            Result = case find_account(AccountId, Accounts) of
                {ok, {account, _, _, Balance}} -> {ok, Balance};
                error -> {error, not_found}
            end,
            From ! {reply, Ref, Result},
            [not_tail_call | loop(Accounts)];

        {transaction, From, Ref, Tx} ->
            case apply_tx(Tx, Accounts) of
                {ok, ReplyVal, NewAccounts} ->
                    From ! {reply, Ref, {ok, ReplyVal}},
                    loop(NewAccounts);
                {error, Reason} ->
                    From ! {reply, Ref, {error, Reason}},
                    loop(Accounts)
            end;

        {process_batch, From, Ref, TxList} ->
            {AppliedCount, RejectedCount, NewAccounts} = run_batch(TxList, Accounts, 0, 0),
            From ! {reply, Ref, {ok, AppliedCount, RejectedCount}},
            loop(NewAccounts);

        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.

find_account(_Id, []) -> error;
find_account(Id, [{account, Id, Name, Bal} | _]) -> {ok, {account, Id, Name, Bal}};
find_account(Id, [_ | Rest]) -> find_account(Id, Rest).

apply_tx({deposit, AccountId, Amount}, Accounts) when Amount > 0 ->
    case find_account(AccountId, Accounts) of
        {ok, {account, Id, Name, Bal}} ->
            NewBal = Bal + Amount,
            NewAccounts = update_account({account, Id, Name, NewBal}, Accounts),
            {ok, NewBal, NewAccounts};
        error ->
            {error, not_found}
    end;
apply_tx({withdraw, AccountId, Amount}, Accounts) when Amount > 0 ->
    case find_account(AccountId, Accounts) of
        {ok, {account, Id, Name, Bal}} when Bal >= Amount ->
            NewBal = Bal - Amount,
            NewAccounts = update_account({account, Id, Name, NewBal}, Accounts),
            {ok, NewBal, NewAccounts};
        {ok, _} ->
            {error, insufficient_funds};
        error ->
            {error, not_found}
    end;
apply_tx({transfer, FromId, ToId, Amount}, Accounts) when Amount > 0 ->
    case {find_account(FromId, Accounts), find_account(ToId, Accounts)} of
        {{ok, {account, FromId, FromName, FromBal}}, {ok, {account, ToId, ToName, ToBal}}} ->
            if
                FromBal >= Amount ->
                    NewFromBal = FromBal - Amount,
                    NewToBal = ToBal + Amount,
                    Acc1 = update_account({account, FromId, FromName, NewFromBal}, Accounts),
                    Acc2 = update_account({account, ToId, ToName, NewToBal}, Acc1),
                    {ok, NewFromBal, Acc2};
                true ->
                    {error, insufficient_funds}
            end;
        _ ->
            {error, not_found}
    end;
apply_tx(_Invalid, _Accounts) ->
    {error, invalid_transaction}.

update_account(NewAcc, Accounts) ->
    update_account_tail(NewAcc, Accounts, []).

update_account_tail({account, Id, _, _} = NewAcc, [{account, Id, _, _} | Rest], Acc) ->
    reverse_append(Acc, [NewAcc | Rest]);
update_account_tail(NewAcc, [Head | Rest], Acc) ->
    update_account_tail(NewAcc, Rest, [Head | Acc]);
update_account_tail(_NewAcc, [], Acc) ->
    reverse_append(Acc, []).

reverse_append([], Acc) -> Acc;
reverse_append([H | T], Acc) -> reverse_append(T, [H | Acc]).

run_batch([], Accounts, Applied, Rejected) ->
    {Applied, Rejected, Accounts};
run_batch([Tx | Rest], Accounts, Applied, Rejected) ->
    case apply_tx(Tx, Accounts) of
        {ok, _ReplyVal, NewAccounts} ->
            run_batch(Rest, NewAccounts, Applied + 1, Rejected);
        {error, _Reason} ->
            run_batch(Rest, Accounts, Applied, Rejected + 1)
    end.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l08", map[string]string{
			"src/ledger_actor.erl": bodyRecursiveCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for body recursion on loop/1, got %d", report.Score)
		}

		foundFailedAst := false
		for _, st := range report.Stages {
			if st.ID == "ast_and_tco_invariants" && st.Status == "failed" {
				foundFailedAst = true
			}
		}
		if !foundFailedAst {
			t.Errorf("Expected ast_and_tco_invariants stage to fail on body recursion")
		}
	})

	// ch05-l08 Negative test 2: missing process_batch/2 export violates compile_and_export_audit
	t.Run("ch05-l08 Negative Missing Export", func(t *testing.T) {
		sessID := "test-sess-ch05-l08-neg-export"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		missingExportCode := `-module(ledger_actor).
-export([
    start/1,
    get_balance/2,
    process_transaction/2,
    stop/1,
    loop/1
]).

start(InitialAccounts) ->
    spawn(fun() -> loop(InitialAccounts) end).

get_balance(Pid, AccountId) ->
    Ref = make_ref(),
    Pid ! {get_balance, self(), Ref, AccountId},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

process_transaction(Pid, TxTuple) ->
    Ref = make_ref(),
    Pid ! {transaction, self(), Ref, TxTuple},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

process_batch(Pid, TransactionsList) ->
    Ref = make_ref(),
    Pid ! {process_batch, self(), Ref, TransactionsList},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

loop(Accounts) ->
    receive
        {get_balance, From, Ref, AccountId} ->
            Result = case find_account(AccountId, Accounts) of
                {ok, {account, _, _, Balance}} -> {ok, Balance};
                error -> {error, not_found}
            end,
            From ! {reply, Ref, Result},
            loop(Accounts);

        {transaction, From, Ref, Tx} ->
            case apply_tx(Tx, Accounts) of
                {ok, ReplyVal, NewAccounts} ->
                    From ! {reply, Ref, {ok, ReplyVal}},
                    loop(NewAccounts);
                {error, Reason} ->
                    From ! {reply, Ref, {error, Reason}},
                    loop(Accounts)
            end;

        {process_batch, From, Ref, TxList} ->
            {AppliedCount, RejectedCount, NewAccounts} = run_batch(TxList, Accounts, 0, 0),
            From ! {reply, Ref, {ok, AppliedCount, RejectedCount}},
            loop(NewAccounts);

        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.

find_account(_Id, []) -> error;
find_account(Id, [{account, Id, Name, Bal} | _]) -> {ok, {account, Id, Name, Bal}};
find_account(Id, [_ | Rest]) -> find_account(Id, Rest).

apply_tx({deposit, AccountId, Amount}, Accounts) when Amount > 0 ->
    case find_account(AccountId, Accounts) of
        {ok, {account, Id, Name, Bal}} ->
            NewBal = Bal + Amount,
            NewAccounts = update_account({account, Id, Name, NewBal}, Accounts),
            {ok, NewBal, NewAccounts};
        error ->
            {error, not_found}
    end;
apply_tx({withdraw, AccountId, Amount}, Accounts) when Amount > 0 ->
    case find_account(AccountId, Accounts) of
        {ok, {account, Id, Name, Bal}} when Bal >= Amount ->
            NewBal = Bal - Amount,
            NewAccounts = update_account({account, Id, Name, NewBal}, Accounts),
            {ok, NewBal, NewAccounts};
        {ok, _} ->
            {error, insufficient_funds};
        error ->
            {error, not_found}
    end;
apply_tx({transfer, FromId, ToId, Amount}, Accounts) when Amount > 0 ->
    case {find_account(FromId, Accounts), find_account(ToId, Accounts)} of
        {{ok, {account, FromId, FromName, FromBal}}, {ok, {account, ToId, ToName, ToBal}}} ->
            if
                FromBal >= Amount ->
                    NewFromBal = FromBal - Amount,
                    NewToBal = ToBal + Amount,
                    Acc1 = update_account({account, FromId, FromName, NewFromBal}, Accounts),
                    Acc2 = update_account({account, ToId, ToName, NewToBal}, Acc1),
                    {ok, NewFromBal, Acc2};
                true ->
                    {error, insufficient_funds}
            end;
        _ ->
            {error, not_found}
    end;
apply_tx(_Invalid, _Accounts) ->
    {error, invalid_transaction}.

update_account(NewAcc, Accounts) ->
    update_account_tail(NewAcc, Accounts, []).

update_account_tail({account, Id, _, _} = NewAcc, [{account, Id, _, _} | Rest], Acc) ->
    reverse_append(Acc, [NewAcc | Rest]);
update_account_tail(NewAcc, [Head | Rest], Acc) ->
    update_account_tail(NewAcc, Rest, [Head | Acc]);
update_account_tail(_NewAcc, [], Acc) ->
    reverse_append(Acc, []).

reverse_append([], Acc) -> Acc;
reverse_append([H | T], Acc) -> reverse_append(T, [H | Acc]).

run_batch([], Accounts, Applied, Rejected) ->
    {Applied, Rejected, Accounts};
run_batch([Tx | Rest], Accounts, Applied, Rejected) ->
    case apply_tx(Tx, Accounts) of
        {ok, _ReplyVal, NewAccounts} ->
            run_batch(Rest, NewAccounts, Applied + 1, Rejected);
        {error, _Reason} ->
            run_batch(Rest, Accounts, Applied, Rejected + 1)
    end.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l08", map[string]string{
			"src/ledger_actor.erl": missingExportCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for missing export, got %d", report.Score)
		}

		foundFailedCompile := false
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				foundFailedCompile = true
			}
		}
		if !foundFailedCompile {
			t.Errorf("Expected compile_and_export_audit to fail on missing export")
		}
	})

	// ch05-l08 Negative test 3: double spend flaw permits negative balances & fails race condition audit
	t.Run("ch05-l08 Negative Double Spend Flaw", func(t *testing.T) {
		sessID := "test-sess-ch05-l08-neg-race"
		session, err := poolMgr.ClaimSession(sessID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessID)

		flawedCode := `-module(ledger_actor).
-export([
    start/1,
    get_balance/2,
    process_transaction/2,
    process_batch/2,
    stop/1,
    loop/1
]).

start(InitialAccounts) ->
    spawn(fun() -> loop(InitialAccounts) end).

get_balance(Pid, AccountId) ->
    Ref = make_ref(),
    Pid ! {get_balance, self(), Ref, AccountId},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

process_transaction(Pid, TxTuple) ->
    Ref = make_ref(),
    Pid ! {transaction, self(), Ref, TxTuple},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

process_batch(Pid, TransactionsList) ->
    Ref = make_ref(),
    Pid ! {process_batch, self(), Ref, TransactionsList},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

loop(Accounts) ->
    receive
        {get_balance, From, Ref, AccountId} ->
            Result = case find_account(AccountId, Accounts) of
                {ok, {account, _, _, Balance}} -> {ok, Balance};
                error -> {error, not_found}
            end,
            From ! {reply, Ref, Result},
            loop(Accounts);

        {transaction, From, Ref, Tx} ->
            case apply_tx(Tx, Accounts) of
                {ok, ReplyVal, NewAccounts} ->
                    From ! {reply, Ref, {ok, ReplyVal}},
                    loop(NewAccounts);
                {error, Reason} ->
                    From ! {reply, Ref, {error, Reason}},
                    loop(Accounts)
            end;

        {process_batch, From, Ref, TxList} ->
            {AppliedCount, RejectedCount, NewAccounts} = run_batch(TxList, Accounts, 0, 0),
            From ! {reply, Ref, {ok, AppliedCount, RejectedCount}},
            loop(NewAccounts);

        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.

find_account(_Id, []) -> error;
find_account(Id, [{account, Id, Name, Bal} | _]) -> {ok, {account, Id, Name, Bal}};
find_account(Id, [_ | Rest]) -> find_account(Id, Rest).

apply_tx({deposit, AccountId, Amount}, Accounts) when Amount > 0 ->
    case find_account(AccountId, Accounts) of
        {ok, {account, Id, Name, Bal}} ->
            NewBal = Bal + Amount,
            NewAccounts = update_account({account, Id, Name, NewBal}, Accounts),
            {ok, NewBal, NewAccounts};
        error ->
            {error, not_found}
    end;
apply_tx({withdraw, AccountId, Amount}, Accounts) when Amount > 0 ->
    case find_account(AccountId, Accounts) of
        {ok, {account, Id, Name, Bal}} ->
            % FLAW: Blindly deducts balance without checking Bal >= Amount!
            NewBal = Bal - Amount,
            NewAccounts = update_account({account, Id, Name, NewBal}, Accounts),
            {ok, NewBal, NewAccounts};
        error ->
            {error, not_found}
    end;
apply_tx({transfer, FromId, ToId, Amount}, Accounts) when Amount > 0 ->
    case {find_account(FromId, Accounts), find_account(ToId, Accounts)} of
        {{ok, {account, FromId, FromName, FromBal}}, {ok, {account, ToId, ToName, ToBal}}} ->
            if
                FromBal >= Amount ->
                    NewFromBal = FromBal - Amount,
                    NewToBal = ToBal + Amount,
                    Acc1 = update_account({account, FromId, FromName, NewFromBal}, Accounts),
                    Acc2 = update_account({account, ToId, ToName, NewToBal}, Acc1),
                    {ok, NewFromBal, Acc2};
                true ->
                    {error, insufficient_funds}
            end;
        _ ->
            {error, not_found}
    end;
apply_tx(_Invalid, _Accounts) ->
    {error, invalid_transaction}.

update_account(NewAcc, Accounts) ->
    update_account_tail(NewAcc, Accounts, []).

update_account_tail({account, Id, _, _} = NewAcc, [{account, Id, _, _} | Rest], Acc) ->
    reverse_append(Acc, [NewAcc | Rest]);
update_account_tail(NewAcc, [Head | Rest], Acc) ->
    update_account_tail(NewAcc, Rest, [Head | Acc]);
update_account_tail(_NewAcc, [], Acc) ->
    reverse_append(Acc, []).

reverse_append([], Acc) -> Acc;
reverse_append([H | T], Acc) -> reverse_append(T, [H | Acc]).

run_batch([], Accounts, Applied, Rejected) ->
    {Applied, Rejected, Accounts};
run_batch([Tx | Rest], Accounts, Applied, Rejected) ->
    case apply_tx(Tx, Accounts) of
        {ok, _ReplyVal, NewAccounts} ->
            run_batch(Rest, NewAccounts, Applied + 1, Rejected);
        {error, _Reason} ->
            run_batch(Rest, Accounts, Applied, Rejected + 1)
    end.
`
		ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
		defer cancel()

		report, err := runner.RunVerification(ctx, session, "ch05-l08", map[string]string{
			"src/ledger_actor.erl": flawedCode,
		})
		if err != nil {
			t.Fatalf("RunVerification failed: %v", err)
		}

		if report.Score >= 100 {
			t.Errorf("Expected negative score < 100 for double spend flaw, got %d", report.Score)
		}

		foundFailedStage := false
		for _, st := range report.Stages {
			if (st.ID == "concurrency_race_audit" || st.ID == "atomic_deposit_withdraw") && st.Status == "failed" {
				foundFailedStage = true
			}
		}
		if !foundFailedStage {
			t.Errorf("Expected concurrency_race_audit or atomic_deposit_withdraw to fail on double spend flaw")
		}
	})
}

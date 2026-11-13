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
}

package bridge_test

import (
	"context"
	"testing"
	"time"
)

func TestChapter1Verification(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	beamIntroSolution := `-module(beam_intro).
-export([inspect_vm/0]).

%% @doc Queries the live BEAM emulator for OTP release, online schedulers,
%% process limit, and atom limit, returning a 5-element telemetry tuple.
inspect_vm() ->
    OtpRel = erlang:system_info(otp_release),
    Schedulers = erlang:system_info(schedulers_online),
    ProcLimit = erlang:system_info(process_limit),
    AtomLimit = erlang:system_info(atom_limit),
    io:format("[BEAM Probe] OTP Release: ~s | Schedulers: ~p | Process Limit: ~p~n",
              [OtpRel, Schedulers, ProcLimit]),
    {vm_info, OtpRel, Schedulers, ProcLimit, AtomLimit}.
`

	basicTypesSolution := `-module(basic_types).
-export([calculate_bandwidth/2, is_exact_match/2, is_within_quota/3]).

%% @doc Convert byte count and elapsed seconds into whole integer bits per second.
calculate_bandwidth(Bytes, Seconds) ->
    (Bytes * 8) div Seconds.

%% @doc Return true only if ValA and ValB match identically in both value and runtime type.
is_exact_match(ValA, ValB) ->
    ValA =:= ValB.

%% @doc Return true if IsAdmin is active, or if non-negative UsedMb does not exceed LimitMb.
is_within_quota(UsedMb, LimitMb, IsAdmin) ->
    IsAdmin =:= true orelse (UsedMb >= 0 andalso UsedMb =< LimitMb).
`

	patternVarsSolution := `-module(pattern_vars).
-export([rebind_update/2, extract_middle/1]).

%% @doc Compute double the sum of Base and Increment across immutable bindings.
rebind_update(Base, Increment) ->
    V1 = Base,
    V2 = V1 + Increment,
    V3 = V2 * 2,
    V3.

%% @doc Return the second element of a 3-element tuple, failing if arity is not 3.
extract_middle(TripleTuple) ->
    {_, Middle, _} = TripleTuple,
    Middle.
`

	telecomEventsSolution := `-module(telecom_events).
-export([make_event/3, extract_caller/1, swap_endpoints/1]).

%% @doc Construct a tagged 5-element call event combining Id, Caller, Callee, and zero initial duration.
make_event(Id, Caller, Callee) ->
    {call_event, Id, Caller, Callee, 0}.

%% @doc Extract and return the caller endpoint atom from a tagged 5-element call event.
extract_caller(Event) ->
    {call_event, _Id, Caller, _Callee, _Duration} = Event,
    Caller.

%% @doc Return an updated 5-element call event with Caller and Callee swapped while keeping Id and duration intact.
swap_endpoints(Event) ->
    {call_event, Id, Caller, Callee, Duration} = Event,
    {call_event, Id, Callee, Caller, Duration}.
`

	tests := []struct {
		name          string
		exerciseID    string
		files         map[string]string
		visibleCount  int
	}{
		{
			name:       "ch01-l01 BEAM VM Introspection Guided Demo",
			exerciseID: "ch01-l01",
			files: map[string]string{
				"src/beam_intro.erl": beamIntroSolution,
			},
			visibleCount: 1,
		},
		{
			name:       "ch01-l02 Numbers, Booleans & Comparison Operators",
			exerciseID: "ch01-l02",
			files: map[string]string{
				"src/basic_types.erl": basicTypesSolution,
			},
			visibleCount: 3,
		},
		{
			name:       "ch01-l03 Variables & Single Assignment",
			exerciseID: "ch01-l03",
			files: map[string]string{
				"src/pattern_vars.erl": patternVarsSolution,
			},
			visibleCount: 2,
		},
		{
			name:       "ch01-l04 Atoms & Tuples",
			exerciseID: "ch01-l04",
			files: map[string]string{
				"src/telecom_events.erl": telecomEventsSolution,
			},
			visibleCount: 3,
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
				t.Logf("[%s] VERIFIED 100%% PASSED (score=%d, %d stages)", tc.exerciseID, report.Score, len(report.Stages))
				for _, st := range report.Stages {
					t.Logf("  + Stage %s: %s", st.ID, st.Status)
				}
			}

			runRes, err := runner.RunCode(ctx, session, tc.exerciseID, tc.files, nil)
			if err != nil {
				t.Fatalf("RunCode failed with error: %v", err)
			}
			if !runRes.CompileOk || len(runRes.VisibleTests) != tc.visibleCount {
				t.Fatalf("[%s] Expected CompileOk=true and %d visible tests, got CompileOk=%v count=%d", tc.exerciseID, tc.visibleCount, runRes.CompileOk, len(runRes.VisibleTests))
			}
			for _, vt := range runRes.VisibleTests {
				if !vt.Passed {
					t.Errorf("[%s] Visible test failed: %+v", tc.exerciseID, vt)
				}
			}
		})
	}

	t.Run("ch01-l01 rejects hardcoded tuple without erlang:system_info/1", func(t *testing.T) {
		sessionID := "test-ch01-l01-ast-neg"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		hardcoded := map[string]string{
			"src/beam_intro.erl": `-module(beam_intro).
-export([inspect_vm/0]).

inspect_vm() ->
    {vm_info, "29", 8, 1048576, 1048576}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch01-l01", hardcoded)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected hardcoded beam_intro without erlang:system_info/1 to fail verification, but got PASSED")
		}

		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_rule_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_rule_audit stage to fail for missing erlang:system_info/1, stages=%+v", report.Stages)
		}
	})

	t.Run("ch01-l02 rejects negative quota acceptance bug", func(t *testing.T) {
		sessionID := "test-ch01-l02-neg-quota"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		buggy := map[string]string{
			"src/basic_types.erl": `-module(basic_types).
-export([calculate_bandwidth/2, is_exact_match/2, is_within_quota/3]).

calculate_bandwidth(Bytes, Seconds) ->
    (Bytes * 8) div Seconds.

is_exact_match(ValA, ValB) ->
    ValA =:= ValB.

is_within_quota(UsedMb, LimitMb, IsAdmin) ->
    IsAdmin =:= true orelse UsedMb =< LimitMb.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch01-l02", buggy)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected buggy is_within_quota accepting negative UsedMb to fail verification, but got PASSED")
		}

		compFailed := false
		for _, st := range report.Stages {
			if st.ID == "comparison_and_logic" && st.Status == "failed" {
				compFailed = true
			}
		}
		if !compFailed {
			t.Errorf("Expected comparison_and_logic stage to fail for negative quota bug, stages=%+v", report.Stages)
		}
	})

	t.Run("ch01-l03 rejects non-triple tuple cheat via element/2", func(t *testing.T) {
		sessionID := "test-ch01-l03-neg-triple"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/pattern_vars.erl": `-module(pattern_vars).
-export([rebind_update/2, extract_middle/1]).

rebind_update(Base, Increment) ->
    (Base + Increment) * 2.

extract_middle(Tuple) ->
    element(2, Tuple).
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch01-l03", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected extract_middle accepting non-3-tuple via element(2, Tuple) to fail verification, but got PASSED")
		}
	})

	t.Run("ch01-l04 rejects untagged or wildcard-tag tuple bypass", func(t *testing.T) {
		sessionID := "test-ch01-l04-neg-tag"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/telecom_events.erl": `-module(telecom_events).
-export([make_event/3, extract_caller/1, swap_endpoints/1]).

make_event(Id, Caller, Callee) ->
    {call_event, Id, Caller, Callee, 0}.

extract_caller(Event) ->
    {_Tag, _Id, Caller, _Callee, _Duration} = Event,
    Caller.

swap_endpoints(Event) ->
    {call_event, Id, Caller, Callee, Duration} = Event,
    {call_event, Id, Callee, Caller, Duration}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch01-l04", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected wildcard-tag extract_caller to fail verification, but got PASSED")
		}
	})
}


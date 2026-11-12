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

	tests := []struct {
		name       string
		exerciseID string
		files      map[string]string
	}{
		{
			name:       "ch01-l01 BEAM VM Introspection Guided Demo",
			exerciseID: "ch01-l01",
			files: map[string]string{
				"src/beam_intro.erl": beamIntroSolution,
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
				t.Logf("[%s] VERIFIED 100%% PASSED (score=%d, %d stages)", tc.exerciseID, report.Score, len(report.Stages))
				for _, st := range report.Stages {
					t.Logf("  + Stage %s: %s", st.ID, st.Status)
				}
			}

			runRes, err := runner.RunCode(ctx, session, tc.exerciseID, tc.files, nil)
			if err != nil {
				t.Fatalf("RunCode failed with error: %v", err)
			}
			if !runRes.CompileOk || len(runRes.VisibleTests) == 0 || !runRes.VisibleTests[0].Passed {
				t.Errorf("[%s] Expected RunCode visible tests to pass, got CompileOk=%v VisibleTests=%+v", tc.exerciseID, runRes.CompileOk, runRes.VisibleTests)
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
}


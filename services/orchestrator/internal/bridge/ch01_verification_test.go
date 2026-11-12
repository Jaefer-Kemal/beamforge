package bridge_test

import (
	"context"
	"testing"
	"time"
)

func TestChapter1Verification(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	beamIntroSol := `-module(beam_intro).
-export([inspect_vm/0]).

%% @doc Queries the live Erlang runtime emulator for OTP release, scheduler count,
%% process limit, and atom limit, returning a 5-element vm_info diagnostic tuple.
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
		wantStages int
	}{
		{
			name:       "ch01-l01 Guided Demo (beam_intro)",
			exerciseID: "ch01-l01",
			files:      map[string]string{"src/beam_intro.erl": beamIntroSol},
			wantStages: 3,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			sessionID := "test-" + tc.exerciseID
			session, err := poolMgr.ClaimSession(sessionID)
			if err != nil {
				t.Fatalf("ClaimSession: %v", err)
			}
			defer poolMgr.ReleaseSession(sessionID)

			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
			defer cancel()

			report, err := runner.RunVerification(ctx, session, tc.exerciseID, tc.files)
			if err != nil {
				t.Fatalf("RunVerification: %v", err)
			}
			if report.Verdict != "PASSED" || report.Score != 100 || len(report.Stages) != tc.wantStages {
				t.Fatalf("[%s] Expected PASSED (score=100, %d stages), got verdict=%s score=%d stages=%+v",
					tc.exerciseID, tc.wantStages, report.Verdict, report.Score, report.Stages)
			}

			runRes, err := runner.RunCode(ctx, session, tc.exerciseID, tc.files, nil)
			if err != nil {
				t.Fatalf("RunCode: %v", err)
			}
			if !runRes.CompileOk || len(runRes.VisibleTests) == 0 || !runRes.VisibleTests[0].Passed {
				t.Fatalf("[%s] Expected RunCode visible tests pass, got %+v", tc.exerciseID, runRes)
			}
		})
	}

	// Negative AST test: hardcoding {vm_info, ...} without erlang:system_info/1 must fail vm_ast_rules
	t.Run("ch01-l01 AST rejects hardcoded tuple without system_info/1", func(t *testing.T) {
		session, err := poolMgr.ClaimSession("test-ch01-l01-neg")
		if err != nil {
			t.Fatalf("ClaimSession: %v", err)
		}
		defer poolMgr.ReleaseSession("test-ch01-l01-neg")

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		hardcoded := `-module(beam_intro).
-export([inspect_vm/0]).
inspect_vm() -> {vm_info, "29", 4, 262144, 1048576}.
`
		report, err := runner.RunVerification(ctx, session, "ch01-l01", map[string]string{"src/beam_intro.erl": hardcoded})
		if err != nil {
			t.Fatalf("RunVerification: %v", err)
		}
		if report.Verdict != "FAILED" {
			t.Fatalf("Expected FAILED when omitting erlang:system_info/1, got %s", report.Verdict)
		}
	})
}

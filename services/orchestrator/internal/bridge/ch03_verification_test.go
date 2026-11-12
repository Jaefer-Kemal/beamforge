package bridge_test

import (
	"context"
	"fmt"
	"testing"
	"time"
)

func TestChapter3Verification(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	hofBasicsSolution := `-module(hof_basics).
-export([make_multiplier/1, apply_twice/2, math_capture/0, choose_pricing_strategy/1]).

%% @doc Return a 1-argument closure multiplying its integer input by the caller-supplied Factor.
make_multiplier(Factor) ->
    fun(X) -> X * Factor end.

%% @doc Guard that the caller-supplied F expects exactly 1 argument (failing with a clause error otherwise) and apply F twice to X.
apply_twice(F, X) when is_function(F, 1) ->
    F(F(X)).

%% @doc Return a direct external function capture referencing the standard integer absolute value BIF without an anonymous wrapper.
math_capture() ->
    fun erlang:abs/1.

%% @doc Return a 1-argument integer pricing closure implementing VIP (20% discount), wholesale (30% discount), or identity pricing for any other Tier.
choose_pricing_strategy(vip) ->
    fun(Price) -> (Price * 80) div 100 end;
choose_pricing_strategy(wholesale) ->
    fun(Price) -> (Price * 70) div 100 end;
choose_pricing_strategy(_) ->
    fun(Price) -> Price end.
`

	tests := []struct {
		exerciseID   string
		visibleCount int
		files        map[string]string
	}{
		{
			exerciseID:   "ch03-l01",
			visibleCount: 4,
			files:        map[string]string{"src/hof_basics.erl": hofBasicsSolution},
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.exerciseID, func(t *testing.T) {
			sessionID := fmt.Sprintf("test-%s", tc.exerciseID)
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

	t.Run("ch03-l01 rejects lambda wrapper around abs/1 and forbidden map syntax via AST & runtime audit", func(t *testing.T) {
		sessionID := "test-ch03-l01-neg-capture-map"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/hof_basics.erl": `-module(hof_basics).
-export([make_multiplier/1, apply_twice/2, math_capture/0, choose_pricing_strategy/1]).

make_multiplier(Factor) ->
    fun(X) -> X * Factor end.

apply_twice(F, X) when is_function(F, 1) ->
    F(F(X)).

math_capture() ->
    %% Cheat: local lambda wrapper instead of external capture fun erlang:abs/1
    fun(X) -> erlang:abs(X) end.

choose_pricing_strategy(Tier) ->
    Rates = #{vip => 80, wholesale => 70},
    Pct = maps:get(Tier, Rates, 100),
    fun(Price) -> (Price * Pct) div 100 end.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch03-l01", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected wrapper lambda + map literal to fail ch03-l01, got PASSED")
		}
		astFailed := false
		closureFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_hof_basics_audit" && st.Status == "failed" {
				astFailed = true
			}
			if st.ID == "closures_and_captures" && st.Status == "failed" {
				closureFailed = true
			}
		}
		if !astFailed || !closureFailed {
			t.Errorf("Expected both ast_hof_basics_audit and closures_and_captures to fail, stages=%+v", report.Stages)
		}
	})

	t.Run("ch03-l01 rejects unguarded apply_twice/2 bypassing is_function/2 guard", func(t *testing.T) {
		sessionID := "test-ch03-l01-neg-guard"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		unguarded := map[string]string{
			"src/hof_basics.erl": `-module(hof_basics).
-export([make_multiplier/1, apply_twice/2, math_capture/0, choose_pricing_strategy/1]).

make_multiplier(Factor) ->
    fun(X) -> X * Factor end.

%% Missing ` + "`when is_function(F, 1)`" + ` guard: crashes inside body with badfun/badarity instead of function_clause.
apply_twice(F, X) ->
    F(F(X)).

math_capture() ->
    fun erlang:abs/1.

choose_pricing_strategy(vip) ->
    fun(Price) -> (Price * 80) div 100 end;
choose_pricing_strategy(wholesale) ->
    fun(Price) -> (Price * 70) div 100 end;
choose_pricing_strategy(_) ->
    fun(Price) -> Price end.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch03-l01", unguarded)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected unguarded apply_twice/2 to fail ch03-l01, got PASSED")
		}
		astFailed := false
		guardFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_hof_basics_audit" && st.Status == "failed" {
				astFailed = true
			}
			if st.ID == "is_function_guard" && st.Status == "failed" {
				guardFailed = true
			}
		}
		if !astFailed || !guardFailed {
			t.Errorf("Expected both ast_hof_basics_audit and is_function_guard to fail, stages=%+v", report.Stages)
		}
	})
}

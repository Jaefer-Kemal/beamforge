package bridge_test

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/beamforge/orchestrator/internal/bridge"
)

func TestDualStrictness_UnusedVariableWarningOnRun(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	sessionID := "test-warn-run-01"
	sess, err := poolMgr.ClaimSession(sessionID)
	if err != nil {
		t.Fatalf("Failed to claim session: %v", err)
	}
	defer poolMgr.ReleaseSession(sessionID)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Code containing an un-prefixed unused variable (UnusedVal)
	codeWithWarning := `-module(pattern_vars).
-export([rebind_update/2, extract_middle/1]).

rebind_update(Base, Increment) ->
    UnusedVal = 999,
    V1 = Base,
    V2 = V1 + Increment,
    V3 = V2 * 2,
    V3.

extract_middle({_A, Middle, _C}) ->
    Middle.
`
	files := map[string]string{
		"src/pattern_vars.erl": codeWithWarning,
	}

	visibleTests := []bridge.VisibleTestCaseInput{
		{
			ID:             "v1",
			ErlangCall:     "pattern_vars:rebind_update(10, 5).",
			ExpectedOutput: "30",
		},
	}

	// 1. Dual Strictness Mode A: Run Code allows execution, returns CompileOk: true,
	// but preserves yellow warning diagnostics for Monaco editor and terminal notification.
	runRes, err := runner.RunCode(ctx, sess, "ch01-l03", files, nil, visibleTests...)
	if err != nil {
		t.Fatalf("RunCode failed with unexpected error: %v", err)
	}

	if !runRes.CompileOk {
		t.Errorf("Expected CompileOk=true on Run mode with warning, got false. Stdout: %s", runRes.Stdout)
	}

	foundWarning := false
	for _, d := range runRes.Diagnostics {
		if d.Severity == "warning" && strings.Contains(strings.ToLower(d.Message), "unused") {
			foundWarning = true
			t.Logf("Verified Run mode captured compiler warning: Line %d Col %d: %s", d.Line, d.Col, d.Message)
			break
		}
	}

	if !foundWarning {
		t.Errorf("Expected RunCode to capture unused variable warning diagnostic, got: %+v", runRes.Diagnostics)
	}

	if len(runRes.VisibleTests) == 0 || !runRes.VisibleTests[0].Passed {
		t.Errorf("Expected visible test to execute and pass on Run mode despite warning, got: %+v", runRes.VisibleTests)
	}
}

func TestDualStrictness_UnusedVariableRejectionOnSubmit(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	sessionID := "test-warn-submit-01"
	sess, err := poolMgr.ClaimSession(sessionID)
	if err != nil {
		t.Fatalf("Failed to claim session: %v", err)
	}
	defer poolMgr.ReleaseSession(sessionID)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Code containing an un-prefixed unused variable (UnusedVal)
	codeWithWarning := `-module(pattern_vars).
-export([rebind_update/2, extract_middle/1]).

rebind_update(Base, Increment) ->
    UnusedVal = 999,
    V1 = Base,
    V2 = V1 + Increment,
    V3 = V2 * 2,
    V3.

extract_middle({_A, Middle, _C}) ->
    Middle.
`
	files := map[string]string{
		"src/pattern_vars.erl": codeWithWarning,
	}

	visibleTests := []bridge.VisibleTestCaseInput{
		{
			ID:             "v1",
			ErlangCall:     "pattern_vars:rebind_update(10, 5).",
			ExpectedOutput: "30",
		},
	}

	// 2. Dual Strictness Mode B: Submit Code treats warnings as errors (-Werror),
	// rejecting the submission with Score: 0 and pedagogical guidance.
	report, err := runner.RunVerification(ctx, sess, "ch01-l03", files, visibleTests...)
	if err != nil {
		t.Fatalf("RunVerification failed with unexpected error: %v", err)
	}

	if report.Verdict != "FAILED" {
		t.Errorf("Expected Verdict=FAILED on Submit with warning, got: %s", report.Verdict)
	}

	if report.Score != 0 {
		t.Errorf("Expected Score=0 on Submit with warning, got: %d", report.Score)
	}

	if len(report.Stages) == 0 {
		t.Fatalf("Expected at least 1 stage in verification report, got 0")
	}

	compileStage := report.Stages[0]
	if compileStage.Status != "failed" {
		t.Errorf("Expected compile stage status=failed, got: %s", compileStage.Status)
	}

	if !strings.Contains(compileStage.Details, "Compiler warning detected on Submit") {
		t.Errorf("Expected compile stage details to mention compiler warning detected on submit, got: %s", compileStage.Details)
	}

	if !strings.Contains(compileStage.Details, "unused") {
		t.Errorf("Expected compile stage details to mention unused variable, got: %s", compileStage.Details)
	}

	t.Logf("Verified Submit mode correctly rejected submission with compiler warning details:\n%s", compileStage.Details)
}

func TestDualStrictness_CleanCodePassesSubmit(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	sessionID := "test-clean-submit-01"
	sess, err := poolMgr.ClaimSession(sessionID)
	if err != nil {
		t.Fatalf("Failed to claim session: %v", err)
	}
	defer poolMgr.ReleaseSession(sessionID)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Clean code using _Prefix for unused variable
	cleanCode := `-module(pattern_vars).
-export([rebind_update/2, extract_middle/1]).

rebind_update(Base, Increment) ->
    _UnusedVal = 999,
    V1 = Base,
    V2 = V1 + Increment,
    V3 = V2 * 2,
    V3.

extract_middle({_A, Middle, _C}) ->
    Middle.
`
	files := map[string]string{
		"src/pattern_vars.erl": cleanCode,
	}

	visibleTests := []bridge.VisibleTestCaseInput{
		{
			ID:             "v1",
			ErlangCall:     "pattern_vars:rebind_update(10, 5).",
			ExpectedOutput: "30",
		},
	}

	// 3. Clean code with _Prefix compiles cleanly under -Wall and passes verification
	report, err := runner.RunVerification(ctx, sess, "ch01-l03", files, visibleTests...)
	if err != nil {
		t.Fatalf("RunVerification failed with unexpected error: %v", err)
	}

	if report.Verdict != "PASSED" {
		t.Errorf("Expected Verdict=PASSED for clean code with _Prefix, got: %s (Details: %+v)", report.Verdict, report.Stages)
	}

	if report.Score != 100 {
		t.Errorf("Expected Score=100 for clean code with _Prefix, got: %d", report.Score)
	}

	t.Logf("Verified clean code with _Prefix passed verification with score 100")
}

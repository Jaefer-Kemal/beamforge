const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'scratch', 'test_erl_compile_ch08');
const readFile = (name) => fs.readFileSync(path.join(srcDir, name), 'utf8');

const testCases = [
  {
    name: 'ch08-l01 Strategy Planner',
    exerciseID: 'ch08-l01',
    files: { 'src/strategy_planner.erl': readFile('strategy_planner.erl') }
  },
  {
    name: 'ch08-l02 Child Spec Factory',
    exerciseID: 'ch08-l02',
    files: { 'src/child_spec_factory.erl': readFile('child_spec_factory.erl') }
  },
  {
    name: 'ch08-l03 Escalation Analyzer',
    exerciseID: 'ch08-l03',
    files: { 'src/escalation_analyzer.erl': readFile('escalation_analyzer.erl') }
  },
  {
    name: 'ch08-l04 Dynamic Session Supervisor',
    exerciseID: 'ch08-l04',
    files: {
      'src/dynamic_session_sup.erl': readFile('dynamic_session_sup.erl'),
      'src/session_worker.erl': readFile('session_worker.erl')
    }
  },
  {
    name: 'ch08-l05 Commerce App',
    exerciseID: 'ch08-l05',
    files: { 'src/commerce_app.erl': readFile('commerce_app.erl') }
  },
  {
    name: 'ch08-l06 Incident #104 Wrong Strategy',
    exerciseID: 'ch08-l06',
    files: { 'src/incident_wrong_strategy.erl': readFile('incident_wrong_strategy.erl') }
  },
  {
    name: 'ch08-l07 Problem Set: Checkout Sup Pipeline',
    exerciseID: 'ch08-l07',
    files: {
      'src/checkout_sup.erl': readFile('checkout_sup.erl'),
      'src/checkout_worker.erl': readFile('checkout_worker.erl')
    }
  }
];

let goCode = `package bridge_test

import (
	"context"
	"testing"
	"time"
)

func TestChapter8Verification(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	tests := []struct {
		name       string
		exerciseID string
		files      map[string]string
	}{
`;

for (const tc of testCases) {
  goCode += `\t\t{\n\t\t\tname:       ${JSON.stringify(tc.name)},\n\t\t\texerciseID: ${JSON.stringify(tc.exerciseID)},\n\t\t\tfiles: map[string]string{\n`;
  for (const [fName, fContent] of Object.entries(tc.files)) {
    goCode += `\t\t\t\t${JSON.stringify(fName)}: \`` + fContent.replace(/`/g, '` + "`" + `') + '`,\n';
  }
  goCode += `\t\t\t},\n\t\t},\n`;
}

goCode += `\t}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			sessionID := "test-" + tc.exerciseID
			session, err := poolMgr.ClaimSession(sessionID)
			if err != nil {
				t.Fatalf("Failed to claim session: %v", err)
			}
			defer poolMgr.ReleaseSession(sessionID)

			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
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
		})
	}
}
`;

const targetPath = path.join(__dirname, '..', 'services', 'orchestrator', 'internal', 'bridge', 'ch08_verification_test.go');
fs.writeFileSync(targetPath, goCode, 'utf8');
console.log('Successfully generated ch08_verification_test.go');

package bridge_test

import (
	"context"
	"fmt"
	"testing"
	"time"
)

func TestChapter2Verification(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	deepMatchSolution := `-module(deep_match).
-export([extract_route/1, repackage_envelope/1]).

%% @doc Unpack the IP version protocol tag and source/destination endpoint strings from a nested packet envelope, returning an unsupported-version error for other versions or a malformed-envelope error when structure does not match.
extract_route({packet, {header, 4, {route, From, To}}, _Payload}) ->
    {ok, ipv4, From, To};
extract_route({packet, {header, 6, {route, From, To}}, _Payload}) ->
    {ok, ipv6, From, To};
extract_route({packet, {header, OtherVer, {route, _From, _To}}, _Payload}) ->
    {error, {unsupported_version, OtherVer}};
extract_route(_) ->
    {error, malformed_envelope}.

%% @doc Forward an IPv4 packet envelope intact alongside its destination host string via function-head aliasing, or drop any non-matching term unchanged.
repackage_envelope({packet, {header, 4, {route, _From, Dst}}, _Payload} = FullPacket) ->
    {forwarded, Dst, FullPacket};
repackage_envelope(Packet) ->
    {dropped, Packet}.
`

	tests := []struct {
		exerciseID   string
		visibleCount int
		files        map[string]string
	}{
		{
			exerciseID:   "ch02-l01",
			visibleCount: 4,
			files:        map[string]string{"src/deep_match.erl": deepMatchSolution},
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

	t.Run("ch02-l01 rejects element/2 manual indexing via AST audit", func(t *testing.T) {
		sessionID := "test-ch02-l01-neg-element"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/deep_match.erl": `-module(deep_match).
-export([extract_route/1, repackage_envelope/1]).

extract_route(Packet) when is_tuple(Packet), tuple_size(Packet) =:= 3 ->
    Header = element(2, Packet),
    case Header of
        {header, 4, {route, From, To}} -> {ok, ipv4, From, To};
        {header, 6, {route, From, To}} -> {ok, ipv6, From, To};
        {header, V, {route, _, _}} -> {error, {unsupported_version, V}};
        _ -> {error, malformed_envelope}
    end;
extract_route(_) ->
    {error, malformed_envelope}.

repackage_envelope({packet, {header, 4, {route, _From, Dst}}, _Payload} = FullPacket) ->
    {forwarded, Dst, FullPacket};
repackage_envelope(Packet) ->
    {dropped, Packet}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch02-l01", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected deep_match using element/2 to fail verification, but got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_deep_match_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_deep_match_audit stage to fail for element/2, stages=%+v", report.Stages)
		}
	})

	t.Run("ch02-l01 rejects forbidden map/binary syntax and if_expr", func(t *testing.T) {
		sessionID := "test-ch02-l01-neg-map-if"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/deep_match.erl": `-module(deep_match).
-export([extract_route/1, repackage_envelope/1]).

extract_route({packet, {header, V, {route, From, To}}, _Payload}) ->
    _Unused = #{ver => V},
    if
        V =:= 4 -> {ok, ipv4, From, To};
        V =:= 6 -> {ok, ipv6, From, To};
        true -> {error, {unsupported_version, V}}
    end;
extract_route(_) ->
    {error, malformed_envelope}.

repackage_envelope({packet, {header, 4, {route, _From, Dst}}, _Payload} = FullPacket) ->
    {forwarded, Dst, FullPacket};
repackage_envelope(Packet) ->
    {dropped, Packet}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch02-l01", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected deep_match using map and if_expr to fail verification, but got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_deep_match_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_deep_match_audit stage to fail for map/if_expr, stages=%+v", report.Stages)
		}
	})

	t.Run("ch02-l01 rejects missing repackage_envelope/1 export", func(t *testing.T) {
		sessionID := "test-ch02-l01-neg-export"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		incomplete := map[string]string{
			"src/deep_match.erl": `-module(deep_match).
-export([extract_route/1]).

extract_route({packet, {header, 4, {route, From, To}}, _Payload}) ->
    {ok, ipv4, From, To};
extract_route(_) ->
    {error, malformed_envelope}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch02-l01", incomplete)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected deep_match missing repackage_envelope/1 export to fail, but got PASSED")
		}
		exportFailed := false
		for _, st := range report.Stages {
			if st.ID == "compile_and_export_audit" && st.Status == "failed" {
				exportFailed = true
			}
		}
		if !exportFailed {
			t.Errorf("Expected compile_and_export_audit stage to fail for missing export, stages=%+v", report.Stages)
		}
	})
}

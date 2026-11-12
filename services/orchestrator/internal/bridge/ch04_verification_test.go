package bridge_test

import (
	"context"
	"fmt"
	"testing"
	"time"
)

func TestChapter4Verification(t *testing.T) {
	runner, poolMgr := setupTestRunner(t)

	mapRegistrySolution := `-module(map_registry).
-export([create_session/2, update_presence/3, is_admin_session/1]).

%% @doc Construct a new session map initialized for UserId and Role with offline presence and zero logins.
create_session(UserId, Role) ->
    #{
        user_id => UserId,
        role => Role,
        presence => offline,
        login_count => 0
    }.

%% @doc Update Session presence and increment login count when user identity matches ExpectedUserId, otherwise returning a session mismatch error tuple.
update_presence(#{user_id := ExpectedUserId, login_count := Count} = Session, ExpectedUserId, NewPresence) ->
    Session#{
        presence := NewPresence,
        login_count := Count + 1
    };
update_presence(_Session, _ExpectedUserId, _NewPresence) ->
    {error, session_mismatch}.

%% @doc Return true when Session is a map representing an active online administrator, and false for any other map or non-map input.
is_admin_session(#{role := admin, presence := online}) ->
    true;
is_admin_session(_) ->
    false.
`

	tests := []struct {
		exerciseID   string
		visibleCount int
		files        map[string]string
	}{
		{
			exerciseID:   "ch04-l01",
			visibleCount: 4,
			files:        map[string]string{"src/map_registry.erl": mapRegistrySolution},
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
					t.Logf("  Stage %-32s status=%s details=%s", st.ID, st.Status, st.Details)
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
				t.Fatalf("[%s] Expected CompileOk=true and %d visible test results, got CompileOk=%v count=%d", tc.exerciseID, tc.visibleCount, runRes.CompileOk, len(runRes.VisibleTests))
			}
			for _, vt := range runRes.VisibleTests {
				if !vt.Passed {
					t.Errorf("[%s] Visible test failed: %s -> expected %s, got %s", tc.exerciseID, vt.CallStr, vt.Expected, vt.Actual)
				}
			}
		})
	}

	t.Run("ch04-l01 rejects maps:get/maps:put bypass missing exact := matching via AST audit", func(t *testing.T) {
		sessionID := "test-ch04-l01-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		mapsApiBypass := map[string]string{
			"src/map_registry.erl": `-module(map_registry).
-export([create_session/2, update_presence/3, is_admin_session/1]).

create_session(UserId, Role) ->
    maps:from_list([{user_id, UserId}, {role, Role}, {presence, offline}, {login_count, 0}]).

update_presence(Session, ExpectedUserId, NewPresence) when is_map(Session) ->
    case maps:find(user_id, Session) of
        {ok, ExpectedUserId} ->
            Cnt = maps:get(login_count, Session, 0),
            maps:put(login_count, Cnt + 1, maps:put(presence, NewPresence, Session));
        _ ->
            {error, session_mismatch}
    end;
update_presence(_, _, _) ->
    {error, session_mismatch}.

is_admin_session(Session) when is_map(Session) ->
    maps:get(role, Session, undefined) =:= admin andalso maps:get(presence, Session, undefined) =:= online;
is_admin_session(_) ->
    false.
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l01", mapsApiBypass)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict when := exact matching/updating is bypassed with maps module calls, got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_map_registry_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_map_registry_audit stage to fail when map_exact_match (:=) is bypassed, stages=%+v", report.Stages)
		}
	})

	t.Run("ch04-l01 rejects stale login_count and crashing non-map is_admin_session", func(t *testing.T) {
		sessionID := "test-ch04-l01-neg-edge"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		buggy := map[string]string{
			"src/map_registry.erl": `-module(map_registry).
-export([create_session/2, update_presence/3, is_admin_session/1]).

create_session(UserId, Role) ->
    #{user_id => UserId, role => Role, presence => offline, login_count => 0}.

%% Bug: hardcodes login_count := 1 instead of incrementing Count + 1.
update_presence(#{user_id := ExpectedUserId} = Session, ExpectedUserId, NewPresence) ->
    Session#{presence := NewPresence, login_count := 1};
update_presence(_, _, _) ->
    {error, session_mismatch}.

%% Bug: matches role without presence, returns true on offline admin.
is_admin_session(#{role := admin}) ->
    true;
is_admin_session(_) ->
    false.
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l01", buggy)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict for hardcoded login_count and offline-admin bug, got PASSED")
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "maps_operations" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected maps_operations stage to fail for hardcoded login_count and role-only check, stages=%+v", report.Stages)
		}
	})
}

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

	mapStdlibSolution := `-module(map_stdlib).
-export([safe_get_load/2, increment_tag_counts/2, merge_configs/2, sum_map_values/1]).

%% @doc Return the integer load recorded for NodeAtom in NodeMetricsMap, or zero when NodeAtom is absent.
safe_get_load(NodeMetricsMap, NodeAtom) ->
    maps:get(NodeAtom, NodeMetricsMap, 0).

%% @doc Fold across TagList and update InitialCountsMap so existing tags increment by one and unseen tags initialize to one.
increment_tag_counts(TagList, InitialCountsMap) ->
    lists:foldl(fun(Tag, AccMap) ->
        maps:update_with(Tag, fun(Count) -> Count + 1 end, 1, AccMap)
    end, InitialCountsMap, TagList).

%% @doc Merge UserCfgMap overrides over DefaultCfgMap and remove secret_key and debug_token entries from the resulting map.
merge_configs(DefaultCfgMap, UserCfgMap) ->
    Merged = maps:merge(DefaultCfgMap, UserCfgMap),
    maps:without([secret_key, debug_token], Merged).

%% @doc Sum all numeric values stored in NumericMap using direct map folding without intermediate list allocation, returning zero for an empty map.
sum_map_values(NumericMap) ->
    maps:fold(fun(_Key, Val, Acc) ->
        Acc + Val
    end, 0, NumericMap).
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
		{
			exerciseID:   "ch04-l02",
			visibleCount: 4,
			files:        map[string]string{"src/map_stdlib.erl": mapStdlibSolution},
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

	t.Run("ch04-l02 rejects maps:to_list/1 bypass and missing required maps stdlib calls via AST audit", func(t *testing.T) {
		sessionID := "test-ch04-l02-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		toListBypass := map[string]string{
			"src/map_stdlib.erl": `-module(map_stdlib).
-export([safe_get_load/2, increment_tag_counts/2, merge_configs/2, sum_map_values/1]).

safe_get_load(NodeMetricsMap, NodeAtom) ->
    maps:get(NodeAtom, NodeMetricsMap, 0).

increment_tag_counts(TagList, InitialCountsMap) ->
    lists:foldl(fun(Tag, Acc) -> maps:update_with(Tag, fun(C) -> C + 1 end, 1, Acc) end, InitialCountsMap, TagList).

merge_configs(DefaultCfgMap, UserCfgMap) ->
    maps:without([secret_key, debug_token], maps:merge(DefaultCfgMap, UserCfgMap)).

%% Bypass: allocates intermediate tuple list with maps:to_list/1 instead of maps:fold/3.
sum_map_values(NumericMap) ->
    lists:foldl(fun({_K, V}, Acc) -> Acc + V end, 0, maps:to_list(NumericMap)).
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l02", toListBypass)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict when maps:to_list/1 is used instead of maps:fold/3, got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_map_stdlib_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_map_stdlib_audit stage to fail on forbidden maps:to_list/1 and missing maps:fold/3, stages=%+v", report.Stages)
		}
	})

	t.Run("ch04-l02 rejects inverted merge precedence and non-additive update_with bug", func(t *testing.T) {
		sessionID := "test-ch04-l02-neg-edge"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		buggy := map[string]string{
			"src/map_stdlib.erl": `-module(map_stdlib).
-export([safe_get_load/2, increment_tag_counts/2, merge_configs/2, sum_map_values/1]).

safe_get_load(NodeMetricsMap, NodeAtom) ->
    maps:get(NodeAtom, NodeMetricsMap, 0).

%% Bug: overwrites existing count back to 1 instead of C + 1.
increment_tag_counts(TagList, InitialCountsMap) ->
    lists:foldl(fun(Tag, Acc) -> maps:update_with(Tag, fun(_C) -> 1 end, 1, Acc) end, InitialCountsMap, TagList).

%% Bug: inverted merge order lets DefaultCfgMap overwrite UserCfgMap overrides.
merge_configs(DefaultCfgMap, UserCfgMap) ->
    maps:without([secret_key, debug_token], maps:merge(UserCfgMap, DefaultCfgMap)).

sum_map_values(NumericMap) ->
    maps:fold(fun(_K, V, Acc) -> Acc + V end, 0, NumericMap).
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch04-l02", buggy)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict for inverted merge precedence and reset counter bug, got PASSED")
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "maps_stdlib_functions" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected maps_stdlib_functions stage to fail for merge precedence and update_with bugs, stages=%+v", report.Stages)
		}
	})
}

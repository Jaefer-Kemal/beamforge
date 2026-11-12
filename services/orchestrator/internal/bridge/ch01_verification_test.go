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

	listOpsSolution := `-module(list_ops).
-export([prepend_item/2, swap_first_two/1, ascii_initial/1]).

%% @doc Prepend Item onto the front of List in O(1) constant time without copying List.
prepend_item(Item, List) ->
    [Item | List].

%% @doc Return a list with the first two elements swapped while keeping the remaining tail unchanged; fail cleanly if fewer than two elements exist.
swap_first_two(List) ->
    [First, Second | Rest] = List,
    [Second, First | Rest].

%% @doc Extract the integer codepoint of the first character in non-empty NameString as a tagged character-code 2-tuple; fail cleanly on empty input.
ascii_initial(NameString) ->
    [FirstCharCode | _Rest] = NameString,
    {char_code, FirstCharCode}.
`

	arityCalcSolution := `-module(arity_calc).
-export([connect/1, connect/2, connect/3]).

-define(DEFAULT_PORT, 80).
-define(DEFAULT_TIMEOUT, 5000).

%% @doc Connect using default port and timeout macros by delegating to connect/2.
connect(Host) ->
    connect(Host, ?DEFAULT_PORT).

%% @doc Connect using explicit Port and default timeout macro by delegating to connect/3.
connect(Host, Port) ->
    connect(Host, Port, ?DEFAULT_TIMEOUT).

%% @doc Construct a 5-element tagged connection tuple embedding the current module identifier.
connect(Host, Port, Timeout) ->
    {connection, ?MODULE, Host, Port, Timeout}.
`

	clauseRouterSolution := `-module(clause_router).
-export([describe_status/1, head_or_default/2, verify_identical_pair/1]).

%% @doc Map HTTP status codes 200, 404, 500 to ok/error tuples, defaulting other inputs to unknown_code.
describe_status(200) ->
    {ok, success};
describe_status(404) ->
    {error, not_found};
describe_status(500) ->
    {error, server_crash};
describe_status(_) ->
    {error, unknown_code}.

%% @doc Return the first element of a non-empty list, or Default when the list is empty.
head_or_default([H | _], _Default) ->
    H;
head_or_default([], Default) ->
    Default.

%% @doc Return a matched 2-tuple if both elements of a 2-tuple match strictly, or mismatch otherwise.
verify_identical_pair({X, X}) ->
    {matched, X};
verify_identical_pair(_) ->
    mismatch.
`

	telecomFoundationsSolution := `-module(telecom_foundations).
-export([classify_packet/1, bill_call/2, bill_call/3]).

%% @doc Validate a 4-element network packet and extract protocol, hosts, and leading payload item, or return empty_payload or invalid_packet errors.
classify_packet({ipv4, SrcHost, DstHost, [FirstItem | _Rest]}) ->
    {ok, ipv4, SrcHost, DstHost, FirstItem};
classify_packet({ipv6, SrcHost, DstHost, [FirstItem | _Rest]}) ->
    {ok, ipv6, SrcHost, DstHost, FirstItem};
classify_packet({_Tag, _Src, _Dst, []}) ->
    {error, empty_payload};
classify_packet(_) ->
    {error, invalid_packet}.

%% @doc Delegate billing calculation for DurationSec and PlanType using the default 10-cent connection fee.
bill_call(DurationSec, PlanType) ->
    bill_call(DurationSec, PlanType, 10).

%% @doc Compute total call cost in cents for DurationSec, PlanType, and ConnectionFeeCents, or return unknown_plan error for unsupported tiers.
bill_call(DurationSec, standard, ConnectionFeeCents) ->
    {ok, ConnectionFeeCents + (DurationSec * 5)};
bill_call(DurationSec, premium, ConnectionFeeCents) ->
    {ok, ConnectionFeeCents + (DurationSec * 3)};
bill_call(_DurationSec, internal, _ConnectionFeeCents) ->
    {ok, 0};
bill_call(_DurationSec, _OtherPlan, _ConnectionFeeCents) ->
    {error, unknown_plan}.
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
		{
			name:       "ch01-l05 Lists & Cons Cells",
			exerciseID: "ch01-l05",
			files: map[string]string{
				"src/list_ops.erl": listOpsSolution,
			},
			visibleCount: 3,
		},
		{
			name:       "ch01-l06 Modules, Arity & Macros",
			exerciseID: "ch01-l06",
			files: map[string]string{
				"src/arity_calc.erl": arityCalcSolution,
			},
			visibleCount: 3,
		},
		{
			name:       "ch01-l07 Multi-Clause Functions & Punctuation Triad",
			exerciseID: "ch01-l07",
			files: map[string]string{
				"src/clause_router.erl": clauseRouterSolution,
			},
			visibleCount: 3,
		},
		{
			name:       "ch01-l08 Telecom Foundations Problem Set",
			exerciseID: "ch01-l08",
			files: map[string]string{
				"src/telecom_foundations.erl": telecomFoundationsSolution,
			},
			visibleCount: 4,
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

	t.Run("ch01-l05 rejects forbidden lists:append/2 shortcut", func(t *testing.T) {
		sessionID := "test-ch01-l05-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/list_ops.erl": `-module(list_ops).
-export([prepend_item/2, swap_first_two/1, ascii_initial/1]).

prepend_item(Item, List) ->
    lists:append([Item], List).

swap_first_two([First, Second | Rest]) ->
    [Second, First | Rest].

ascii_initial([FirstCharCode | _Rest]) ->
    {char_code, FirstCharCode}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch01-l05", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected list_ops calling lists:append/2 to fail AST verification, but got PASSED")
		}

		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_cons_pattern_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_cons_pattern_audit stage to fail for lists:append/2, stages=%+v", report.Stages)
		}
	})

	t.Run("ch01-l06 rejects hardcoded literals without delegation or macros", func(t *testing.T) {
		sessionID := "test-ch01-l06-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/arity_calc.erl": `-module(arity_calc).
-export([connect/1, connect/2, connect/3]).

connect(Host) ->
    {connection, arity_calc, Host, 80, 5000}.

connect(Host, Port) ->
    {connection, arity_calc, Host, Port, 5000}.

connect(Host, Port, Timeout) ->
    {connection, arity_calc, Host, Port, Timeout}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch01-l06", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected non-cascading hardcoded arity_calc to fail AST verification, but got PASSED")
		}

		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_arity_and_macros_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_arity_and_macros_audit stage to fail for hardcoded connect/1..3, stages=%+v", report.Stages)
		}
	})

	t.Run("ch01-l07 rejects if_expr branching and loose numeric equality", func(t *testing.T) {
		sessionID := "test-ch01-l07-neg-if"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/clause_router.erl": `-module(clause_router).
-export([describe_status/1, head_or_default/2, verify_identical_pair/1]).

describe_status(Code) ->
    if
        Code =:= 200 -> {ok, success};
        Code =:= 404 -> {error, not_found};
        Code =:= 500 -> {error, server_crash};
        true -> {error, unknown_code}
    end.

head_or_default([H | _], _Default) ->
    H;
head_or_default([], Default) ->
    Default.

verify_identical_pair({A, B}) ->
    if
        A == B -> {matched, A};
        true -> mismatch
    end;
verify_identical_pair(_) ->
    mismatch.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch01-l07", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected clause_router using forbidden if_expr and loose == to fail verification, but got PASSED")
		}

		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_clause_style_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_clause_style_audit stage to fail for if_expr, stages=%+v", report.Stages)
		}
	})

	t.Run("ch01-l08 rejects non-delegating bill_call/2 and forward-ref when guard", func(t *testing.T) {
		sessionID := "test-ch01-l08-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/telecom_foundations.erl": `-module(telecom_foundations).
-export([classify_packet/1, bill_call/2, bill_call/3]).

classify_packet({Proto, Src, Dst, [H | _]}) when Proto =:= ipv4; Proto =:= ipv6 ->
    {ok, Proto, Src, Dst, H};
classify_packet({_, _, _, []}) ->
    {error, empty_payload};
classify_packet(_) ->
    {error, invalid_packet}.

bill_call(DurationSec, standard) ->
    {ok, 10 + DurationSec * 5};
bill_call(DurationSec, PlanType) ->
    bill_call(DurationSec, PlanType, 10).

bill_call(DurationSec, standard, Fee) ->
    {ok, Fee + DurationSec * 5};
bill_call(DurationSec, premium, Fee) ->
    {ok, Fee + DurationSec * 3};
bill_call(_, internal, _) ->
    {ok, 0};
bill_call(_, _, _) ->
    {error, unknown_plan}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch01-l08", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected telecom_foundations with forbidden when guard to fail AST verification, but got PASSED")
		}

		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_delegation_and_forward_refs_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_delegation_and_forward_refs_audit stage to fail for when guard, stages=%+v", report.Stages)
		}
	})
}


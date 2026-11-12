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

	guardValidatorSolution := `-module(guard_validator).
-export([validate_port/1, classify_temperature/1, safe_ratio/2]).

%% @doc Classify an integer TCP or UDP port into an ok pair tagged as privileged (1 through 1023) or unprivileged (1024 through 65535) via guards, or return an error pair for out-of-range or non-integer inputs.
validate_port(Port) when is_integer(Port), Port >= 1024, Port =< 65535 ->
    {ok, unprivileged_port};
validate_port(Port) when is_integer(Port), Port >= 1, Port =< 1023 ->
    {ok, privileged_port};
validate_port(_) ->
    {error, invalid_port}.

%% @doc Classify an integer or float Celsius temperature into a freezing (at or below 0), temperate (above 0 up to 25), or hot (above 25) status atom via guards, returning an error pair for non-numeric inputs.
classify_temperature(TempC) when is_number(TempC), TempC =< 0 ->
    freezing;
classify_temperature(TempC) when is_number(TempC), TempC > 0, TempC =< 25 ->
    temperate;
classify_temperature(TempC) when is_number(TempC), TempC > 25 ->
    hot;
classify_temperature(_) ->
    {error, invalid_temperature}.

%% @doc Evaluate the quotient of two numbers using guards to classify quotients at or above 2.0 versus below 2.0, returning an error pair when either input is non-numeric or the divisor is zero.
safe_ratio(A, B) when is_number(A), is_number(B), B =/= 0, (A / B) >= 2.0 ->
    high_ratio;
safe_ratio(A, B) when is_number(A), is_number(B), B =/= 0 ->
    normal_ratio;
safe_ratio(_, _) ->
    {error, invalid_ratio}.
`

	flowControlSolution := `-module(flow_control).
-export([handle_http_response/1, grade_latency/1]).

%% @doc Dispatch on a 3-element HTTP response tuple via a case expression, returning an ok payload pair for status 200 or classifying 401/403, 500-599, unexpected integer statuses, and malformed terms into error pairs.
handle_http_response(Response) ->
    case Response of
        {http_response, 200, Body} ->
            {ok, Body};
        {http_response, Code, _Body} when Code =:= 401; Code =:= 403 ->
            {error, unauthorized};
        {http_response, Code, _Body} when is_integer(Code), Code >= 500, Code =< 599 ->
            {error, server_error};
        {http_response, Code, _Body} when is_integer(Code) ->
            {error, {unexpected_status, Code}};
        _ ->
            {error, invalid_response}
    end.

%% @doc Classify an integer round-trip latency in milliseconds via an if expression into optimal (under 50 ms), acceptable (50 through 200 ms inclusive), or SLA-breach status atoms.
grade_latency(LatencyMs) ->
    if
        LatencyMs < 50 -> optimal;
        LatencyMs >= 50, LatencyMs =< 200 -> acceptable;
        true -> sla_breach
    end.
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
		{
			exerciseID:   "ch02-l02",
			visibleCount: 4,
			files:        map[string]string{"src/guard_validator.erl": guardValidatorSolution},
		},
		{
			exerciseID:   "ch02-l03",
			visibleCount: 4,
			files:        map[string]string{"src/flow_control.erl": flowControlSolution},
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

	t.Run("ch02-l02 rejects if_expr branching and missing guard clauses via AST audit", func(t *testing.T) {
		sessionID := "test-ch02-l02-neg-if"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/guard_validator.erl": `-module(guard_validator).
-export([validate_port/1, classify_temperature/1, safe_ratio/2]).

validate_port(Port) ->
    if
        is_integer(Port), Port >= 1024, Port =< 65535 -> {ok, unprivileged_port};
        is_integer(Port), Port >= 1, Port =< 1023 -> {ok, privileged_port};
        true -> {error, invalid_port}
    end.

classify_temperature(TempC) ->
    if
        is_number(TempC), TempC =< 0 -> freezing;
        is_number(TempC), TempC > 0, TempC =< 25 -> temperate;
        is_number(TempC), TempC > 25 -> hot;
        true -> {error, invalid_temperature}
    end.

safe_ratio(A, B) ->
    if
        is_number(A), is_number(B), B =/= 0, (A / B) >= 2.0 -> high_ratio;
        is_number(A), is_number(B), B =/= 0 -> normal_ratio;
        true -> {error, invalid_ratio}
    end.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch02-l02", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected guard_validator using if_expr to fail AST verification, but got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_guard_clauses_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_guard_clauses_audit stage to fail for if_expr, stages=%+v", report.Stages)
		}
	})

	t.Run("ch02-l02 rejects float port bypass and off-by-one boundary error", func(t *testing.T) {
		sessionID := "test-ch02-l02-neg-bounds"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		buggy := map[string]string{
			"src/guard_validator.erl": `-module(guard_validator).
-export([validate_port/1, classify_temperature/1, safe_ratio/2]).

validate_port(Port) when is_number(Port), Port >= 1024, Port =< 65535 ->
    {ok, unprivileged_port};
validate_port(Port) when is_number(Port), Port >= 1, Port =< 1023 ->
    {ok, privileged_port};
validate_port(_) ->
    {error, invalid_port}.

classify_temperature(TempC) when is_number(TempC), TempC =< 0 ->
    freezing;
classify_temperature(TempC) when is_number(TempC), TempC > 0, TempC =< 25 ->
    temperate;
classify_temperature(TempC) when is_number(TempC), TempC > 25 ->
    hot;
classify_temperature(_) ->
    {error, invalid_temperature}.

safe_ratio(A, B) when is_number(A), is_number(B), B =/= 0, (A / B) >= 2.0 ->
    high_ratio;
safe_ratio(A, B) when is_number(A), is_number(B), B =/= 0 ->
    normal_ratio;
safe_ratio(_, _) ->
    {error, invalid_ratio}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch02-l02", buggy)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected guard_validator using is_number instead of is_integer on validate_port to fail, but got PASSED")
		}
		guardFailed := false
		for _, st := range report.Stages {
			if st.ID == "guard_clause_validation" && st.Status == "failed" {
				guardFailed = true
			}
		}
		if !guardFailed {
			t.Errorf("Expected guard_clause_validation stage to fail for float port 80.0, stages=%+v", report.Stages)
		}
	})

	t.Run("ch02-l03 rejects head-only multi-clause bypass missing case...of and if...end", func(t *testing.T) {
		sessionID := "test-ch02-l03-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/flow_control.erl": `-module(flow_control).
-export([handle_http_response/1, grade_latency/1]).

handle_http_response({http_response, 200, Body}) ->
    {ok, Body};
handle_http_response({http_response, Code, _}) when Code =:= 401; Code =:= 403 ->
    {error, unauthorized};
handle_http_response({http_response, Code, _}) when is_integer(Code), Code >= 500, Code =< 599 ->
    {error, server_error};
handle_http_response({http_response, Code, _}) when is_integer(Code) ->
    {error, {unexpected_status, Code}};
handle_http_response(_) ->
    {error, invalid_response}.

grade_latency(LatencyMs) when LatencyMs < 50 -> optimal;
grade_latency(LatencyMs) when LatencyMs =< 200 -> acceptable;
grade_latency(_) -> sla_breach.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch02-l03", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected flow_control without case...of and if...end to fail AST verification, but got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_control_flow_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_control_flow_audit stage to fail when case...of / if...end are missing, stages=%+v", report.Stages)
		}
	})

	t.Run("ch02-l03 rejects missing is_integer(Code) guard on status code", func(t *testing.T) {
		sessionID := "test-ch02-l03-neg-term-order"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		buggy := map[string]string{
			"src/flow_control.erl": `-module(flow_control).
-export([handle_http_response/1, grade_latency/1]).

handle_http_response(Response) ->
    case Response of
        {http_response, 200, Body} ->
            {ok, Body};
        {http_response, Code, _Body} when Code =:= 401; Code =:= 403 ->
            {error, unauthorized};
        {http_response, Code, _Body} when Code >= 500, Code =< 599 ->
            {error, server_error};
        {http_response, Code, _Body} ->
            {error, {unexpected_status, Code}};
        _ ->
            {error, invalid_response}
    end.

grade_latency(LatencyMs) ->
    if
        LatencyMs < 50 -> optimal;
        LatencyMs >= 50, LatencyMs =< 200 -> acceptable;
        true -> sla_breach
    end.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch02-l03", buggy)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected flow_control missing is_integer(Code) to fail on non-integer status, but got PASSED")
		}
		flowFailed := false
		for _, st := range report.Stages {
			if st.ID == "case_and_if_expressions" && st.Status == "failed" {
				flowFailed = true
			}
		}
		if !flowFailed {
			t.Errorf("Expected case_and_if_expressions stage to fail for non-integer status code, stages=%+v", report.Stages)
		}
	})
}

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

	recursiveSearchSolution := `-module(recursive_search).
-export([find_product/2, contains_item/2]).

%% @doc Recursively traverse an inventory list of 5-element product tuples to return an ok pair wrapping the entry matching TargetId, or report not-found when absent or empty.
find_product([], _TargetId) ->
    not_found;
find_product([{product, TargetId, _Name, _Price, _Stock} = Prod | _Rest], TargetId) ->
    {ok, Prod};
find_product([_OtherProd | Rest], TargetId) ->
    find_product(Rest, TargetId).

%% @doc Recursively determine whether Target matches any element in List via head-to-tail pattern matching, returning a boolean.
contains_item([], _Target) ->
    false;
contains_item([Target | _Rest], Target) ->
    true;
contains_item([_Other | Rest], Target) ->
    contains_item(Rest, Target).
`

	tcoCounterSolution := `-module(tco_counter).
-export([sum_packets/1, count_packets/1]).

%% @doc Compute the integer sum of all packet byte sizes in List via a strictly tail-recursive accumulator helper in constant O(1) stack space, returning 0 when empty.
sum_packets(List) ->
    sum_packets(List, 0).

sum_packets([], Acc) ->
    Acc;
sum_packets([H | T], Acc) ->
    sum_packets(T, Acc + H).

%% @doc Count the total number of packet descriptor elements in List via a strictly tail-recursive accumulator helper in constant O(1) stack space, returning 0 when empty.
count_packets(List) ->
    count_packets(List, 0).

count_packets([], Acc) ->
    Acc;
count_packets([_ | T], Acc) ->
    count_packets(T, Acc + 1).
`

	accFilterSolution := `-module(acc_filter).
-export([keep_valid_orders/1]).

%% @doc Traverse Orders with a tail-recursive accumulator and lists:reverse/1 to extract in original relative order the integer IDs of confirmed orders whose quantity exceeds zero, returning an empty list when none qualify or empty.
keep_valid_orders(Orders) ->
    keep_valid_orders(Orders, []).

keep_valid_orders([], Acc) ->
    lists:reverse(Acc);
keep_valid_orders([{order, Id, Qty, confirmed} | Rest], Acc) when Qty > 0 ->
    keep_valid_orders(Rest, [Id | Acc]);
keep_valid_orders([_InvalidOrder | Rest], Acc) ->
    keep_valid_orders(Rest, Acc).
`

	tupleUpdaterSolution := `-module(tuple_updater).
-export([update_product_price/3, partition_orders/2]).

%% @doc Traverse Inventory with a tail-recursive accumulator and lists:reverse/1 to replace the price of the product tuple matching TargetId while preserving every other field and exact element order, returning Inventory unchanged if absent.
update_product_price(Inventory, TargetId, NewPrice) ->
    update_product_price(Inventory, TargetId, NewPrice, []).

update_product_price([], _TargetId, _NewPrice, Acc) ->
    lists:reverse(Acc);
update_product_price([{product, Id, Name, _OldPrice, Stock} | Rest], TargetId, NewPrice, Acc)
  when Id =:= TargetId ->
    Updated = {product, Id, Name, NewPrice, Stock},
    update_product_price(Rest, TargetId, NewPrice, [Updated | Acc]);
update_product_price([OtherProd | Rest], TargetId, NewPrice, Acc) ->
    update_product_price(Rest, TargetId, NewPrice, [OtherProd | Acc]).

%% @doc Partition Orders in a single tail-recursive pass with dual accumulators and lists:reverse/1 into a 2-tuple containing orders meeting at least MinQty followed by all remaining orders in original relative order.
partition_orders(Orders, MinQty) ->
    partition_orders(Orders, MinQty, [], []).

partition_orders([], _MinQty, ValidAcc, RejAcc) ->
    {lists:reverse(ValidAcc), lists:reverse(RejAcc)};
partition_orders([{order, _Id, Qty} = O | Rest], MinQty, ValidAcc, RejAcc)
  when Qty >= MinQty ->
    partition_orders(Rest, MinQty, [O | ValidAcc], RejAcc);
partition_orders([O | Rest], MinQty, ValidAcc, RejAcc) ->
    partition_orders(Rest, MinQty, ValidAcc, [O | RejAcc]).
`

	inventorySolution := `-module(inventory).
-export([process_order/2, calculate_order_total/2, restock/2]).

%% @doc Sequentially process incoming order tuples against Inventory in constant O(1) stack space, deducting ordered quantities from matching products with sufficient stock while skipping unfulfillable orders and strictly preserving product order.
process_order(Inventory, Orders) ->
    process_orders_loop(Inventory, Orders).

process_orders_loop(Inventory, []) ->
    Inventory;
process_orders_loop(Inventory, [{order, ProdId, Qty} | RestOrders]) ->
    NewInv = deduct_stock_if_available(Inventory, ProdId, Qty),
    process_orders_loop(NewInv, RestOrders).

deduct_stock_if_available(Inventory, ProdId, Qty) ->
    case find_product(Inventory, ProdId) of
        {ok, {product, ProdId, _Name, _Price, Stock}} when Stock >= Qty ->
            update_stock(Inventory, ProdId, -Qty);
        _ ->
            Inventory
    end.

update_stock(Inventory, TargetId, DeltaQty) ->
    update_stock_loop(Inventory, TargetId, DeltaQty, []).

update_stock_loop([], _TargetId, _Delta, Acc) ->
    lists:reverse(Acc);
update_stock_loop([{product, Id, Name, Price, Stock} | Rest], TargetId, Delta, Acc)
  when Id =:= TargetId ->
    Updated = {product, Id, Name, Price, Stock + Delta},
    update_stock_loop(Rest, TargetId, Delta, [Updated | Acc]);
update_stock_loop([Other | Rest], TargetId, Delta, Acc) ->
    update_stock_loop(Rest, TargetId, Delta, [Other | Acc]).

%% @doc Accumulate in constant O(1) stack space the integer revenue total of fulfillable order tuples whose matching product exists in Inventory with sufficient stock, contributing zero for unfulfillable orders.
calculate_order_total(Inventory, Orders) ->
    calc_total_loop(Orders, Inventory, 0).

calc_total_loop([], _Inventory, Acc) ->
    Acc;
calc_total_loop([{order, ProdId, Qty} | RestOrders], Inventory, Acc) ->
    case find_product(Inventory, ProdId) of
        {ok, {product, ProdId, _Name, Price, Stock}} when Stock >= Qty ->
            calc_total_loop(RestOrders, Inventory, Acc + (Price * Qty));
        _ ->
            calc_total_loop(RestOrders, Inventory, Acc)
    end.

%% @doc Sequentially apply restock quantity pairs to matching products in Inventory in constant O(1) stack space while preserving exact product order and ignoring unrecognized product identifiers.
restock(Inventory, Restocks) ->
    restock_loop(Restocks, Inventory).

restock_loop([], Inventory) ->
    Inventory;
restock_loop([{ProdId, AddQty} | Rest], Inventory) ->
    NewInv = update_stock(Inventory, ProdId, AddQty),
    restock_loop(Rest, NewInv).

find_product([], _TargetId) ->
    not_found;
find_product([{product, TargetId, _Name, _Price, _Stock} = Prod | _Rest], TargetId) ->
    {ok, Prod};
find_product([_Other | Rest], TargetId) ->
    find_product(Rest, TargetId).
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
		{
			exerciseID:   "ch02-l04",
			visibleCount: 4,
			files:        map[string]string{"src/recursive_search.erl": recursiveSearchSolution},
		},
		{
			exerciseID:   "ch02-l05",
			visibleCount: 2,
			files:        map[string]string{"src/tco_counter.erl": tcoCounterSolution},
		},
		{
			exerciseID:   "ch02-l06",
			visibleCount: 2,
			files:        map[string]string{"src/acc_filter.erl": accFilterSolution},
		},
		{
			exerciseID:   "ch02-l07",
			visibleCount: 3,
			files:        map[string]string{"src/tuple_updater.erl": tupleUpdaterSolution},
		},
		{
			exerciseID:   "ch02-l08",
			visibleCount: 3,
			files:        map[string]string{"src/inventory.erl": inventorySolution},
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

	t.Run("ch02-l04 rejects lists module calls via AST audit", func(t *testing.T) {
		sessionID := "test-ch02-l04-neg-lists"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/recursive_search.erl": `-module(recursive_search).
-export([find_product/2, contains_item/2]).

find_product(Inventory, TargetId) ->
    case lists:keyfind(TargetId, 2, Inventory) of
        {product, _, _, _, _} = Prod -> {ok, Prod};
        false -> not_found
    end.

contains_item(List, Target) ->
    lists:member(Target, List).
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch02-l04", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected recursive_search using lists:keyfind/lists:member to fail AST verification, but got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_pure_recursion_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_pure_recursion_audit stage to fail for lists:* calls, stages=%+v", report.Stages)
		}
	})

	t.Run("ch02-l04 rejects list comprehension bypass via AST audit", func(t *testing.T) {
		sessionID := "test-ch02-l04-neg-lc"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/recursive_search.erl": `-module(recursive_search).
-export([find_product/2, contains_item/2]).

find_product(Inventory, TargetId) ->
    case [P || {product, Id, _, _, _} = P <- Inventory, Id =:= TargetId] of
        [First | _] -> {ok, First};
        [] -> not_found
    end.

contains_item([], _Target) -> false;
contains_item([Target | _], Target) -> true;
contains_item([_ | T], Target) -> contains_item(T, Target).
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch02-l04", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected recursive_search using list comprehension to fail AST verification, but got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_pure_recursion_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_pure_recursion_audit stage to fail for list comprehension, stages=%+v", report.Stages)
		}
	})

	t.Run("ch02-l05 rejects body recursion (non-TCO) via AST audit", func(t *testing.T) {
		sessionID := "test-ch02-l05-neg-body-rec"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		bodyRec := map[string]string{
			"src/tco_counter.erl": `-module(tco_counter).
-export([sum_packets/1, count_packets/1]).

sum_packets([]) -> 0;
sum_packets([H | T]) -> H + sum_packets(T).

count_packets([]) -> 0;
count_packets([_ | T]) -> 1 + count_packets(T).
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch02-l05", bodyRec)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected body-recursive tco_counter to fail TCO AST audit, but got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "tail_recursion_ast_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected tail_recursion_ast_audit stage to fail for body recursion, stages=%+v", report.Stages)
		}
	})

	t.Run("ch02-l05 rejects auto-imported length/1 and lists:sum/1 shortcuts via AST audit", func(t *testing.T) {
		sessionID := "test-ch02-l05-neg-bif"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/tco_counter.erl": `-module(tco_counter).
-export([sum_packets/1, count_packets/1]).

sum_packets(List) -> lists:sum(List).
count_packets(List) -> length(List).
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch02-l05", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected tco_counter using lists:sum/1 and length/1 to fail AST audit, but got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "tail_recursion_ast_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected tail_recursion_ast_audit stage to fail for lists:sum/length, stages=%+v", report.Stages)
		}
	})

	t.Run("ch02-l06 rejects quadratic ++ list append and missing lists:reverse/1", func(t *testing.T) {
		sessionID := "test-ch02-l06-neg-append"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/acc_filter.erl": `-module(acc_filter).
-export([keep_valid_orders/1]).

keep_valid_orders(Orders) ->
    keep_valid_orders(Orders, []).

keep_valid_orders([], Acc) ->
    Acc;
keep_valid_orders([{order, Id, Qty, confirmed} | Rest], Acc) when Qty > 0 ->
    keep_valid_orders(Rest, Acc ++ [Id]);
keep_valid_orders([_Other | Rest], Acc) ->
    keep_valid_orders(Rest, Acc).
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch02-l06", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected acc_filter using ++ without lists:reverse/1 to fail AST verification, but got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_list_accumulator_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_list_accumulator_audit stage to fail for ++/missing reverse, stages=%+v", report.Stages)
		}
	})

	t.Run("ch02-l06 rejects list comprehension bypass via AST audit", func(t *testing.T) {
		sessionID := "test-ch02-l06-neg-lc"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/acc_filter.erl": `-module(acc_filter).
-export([keep_valid_orders/1]).

keep_valid_orders(Orders) ->
    [Id || {order, Id, Qty, confirmed} <- Orders, Qty > 0].
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch02-l06", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected acc_filter using list comprehension to fail AST audit, but got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_list_accumulator_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_list_accumulator_audit stage to fail for list comprehension, stages=%+v", report.Stages)
		}
	})

	t.Run("ch02-l07 rejects lists:keyreplace/4 and lists:partition/2 BIF shortcuts", func(t *testing.T) {
		sessionID := "test-ch02-l07-neg-bif"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/tuple_updater.erl": `-module(tuple_updater).
-export([update_product_price/3, partition_orders/2]).

update_product_price(Inventory, TargetId, NewPrice) ->
    case lists:keyfind(TargetId, 2, Inventory) of
        {product, Id, Name, _Old, Stock} ->
            lists:keyreplace(TargetId, 2, Inventory, {product, Id, Name, NewPrice, Stock});
        false ->
            Inventory
    end.

partition_orders(Orders, MinQty) ->
    lists:partition(fun({order, _Id, Qty}) -> Qty >= MinQty end, Orders).
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch02-l07", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected tuple_updater using lists:keyreplace/lists:partition to fail AST verification, but got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_tuple_updater_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_tuple_updater_audit stage to fail for lists:keyreplace/partition, stages=%+v", report.Stages)
		}
	})

	t.Run("ch02-l07 rejects early-halt update dropping trailing or leading elements", func(t *testing.T) {
		sessionID := "test-ch02-l07-neg-halt"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		buggy := map[string]string{
			"src/tuple_updater.erl": `-module(tuple_updater).
-export([update_product_price/3, partition_orders/2]).

update_product_price(Inventory, TargetId, NewPrice) ->
    update_product_price(Inventory, TargetId, NewPrice, []).

update_product_price([], _TargetId, _NewPrice, Acc) ->
    lists:reverse(Acc);
update_product_price([{product, Id, Name, _OldPrice, Stock} | Rest], TargetId, NewPrice, _Acc)
  when Id =:= TargetId ->
    [{product, Id, Name, NewPrice, Stock} | Rest];
update_product_price([OtherProd | Rest], TargetId, NewPrice, Acc) ->
    update_product_price(Rest, TargetId, NewPrice, [OtherProd | Acc]).

partition_orders(Orders, MinQty) ->
    partition_orders(Orders, MinQty, [], []).

partition_orders([], _MinQty, ValidAcc, RejAcc) ->
    {lists:reverse(ValidAcc), lists:reverse(RejAcc)};
partition_orders([{order, _Id, Qty} = O | Rest], MinQty, ValidAcc, RejAcc)
  when Qty >= MinQty ->
    partition_orders(Rest, MinQty, [O | ValidAcc], RejAcc);
partition_orders([O | Rest], MinQty, ValidAcc, RejAcc) ->
    partition_orders(Rest, MinQty, ValidAcc, [O | RejAcc]).
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch02-l07", buggy)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected early-halt tuple_updater dropping prefix items to fail verification, but got PASSED")
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "tuple_update_and_partition" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected tuple_update_and_partition stage to fail for dropped prefix items, stages=%+v", report.Stages)
		}
	})

	t.Run("ch02-l08 rejects quadratic ++ append and body recursion via AST/TCO audit", func(t *testing.T) {
		sessionID := "test-ch02-l08-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badCode := map[string]string{
			"src/inventory.erl": `-module(inventory).
-export([process_order/2, calculate_order_total/2, restock/2]).

process_order(Inv, []) -> Inv;
process_order(Inv, [{order, Id, Qty} | Rest]) ->
    process_order(deduct_one(Id, Qty, Inv, []), Rest).

deduct_one(_Id, _Qty, [], Acc) -> lists:reverse(Acc);
deduct_one(Id, Qty, [{product, Id, Name, Price, Stock} | Rest], Acc) when Stock >= Qty ->
    lists:reverse(Acc) ++ [{product, Id, Name, Price, Stock - Qty} | Rest];
deduct_one(Id, Qty, [H | T], Acc) ->
    deduct_one(Id, Qty, T, [H | Acc]).

calculate_order_total(_Inv, []) -> 0;
calculate_order_total(Inv, [{order, Id, Qty} | Rest]) ->
    LineVal = case find_prod(Inv, Id) of
        {ok, {product, Id, _Name, Price, Stock}} when Stock >= Qty -> Price * Qty;
        _ -> 0
    end,
    LineVal + calculate_order_total(Inv, Rest).

restock(Inv, []) -> Inv;
restock(Inv, [{Id, Add} | Rest]) ->
    restock(restock_one(Id, Add, Inv, []), Rest).

restock_one(_Id, _Add, [], Acc) -> lists:reverse(Acc);
restock_one(Id, Add, [{product, Id, Name, Price, Stock} | Rest], Acc) ->
    lists:reverse(Acc) ++ [{product, Id, Name, Price, Stock + Add} | Rest];
restock_one(Id, Add, [H | T], Acc) ->
    restock_one(Id, Add, T, [H | Acc]).

find_prod([], _Id) -> not_found;
find_prod([{product, Id, _Name, _Price, _Stock} = P | _], Id) -> {ok, P};
find_prod([_ | T], Id) -> find_prod(T, Id).
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch02-l08", badCode)
		if err != nil {
			t.Fatalf("RunVerification error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected quadratic ++ / body recursion to fail ch02-l08, got PASSED (score=%d)", report.Score)
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_and_tco_invariants" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_and_tco_invariants stage to fail for ++ append / body recursion, stages=%+v", report.Stages)
		}
	})

	t.Run("ch02-l08 rejects stale-inventory sequential order bug", func(t *testing.T) {
		sessionID := "test-ch02-l08-neg-stale"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		staleCode := map[string]string{
			"src/inventory.erl": `-module(inventory).
-export([process_order/2, calculate_order_total/2, restock/2]).

%% Deliberate bug: ignores Stock >= Qty on deduction so sequential [{order, 1, 6}, {order, 1, 6}]
%% against initial stock 10 leaves negative stock (-2) instead of 4.
process_order(Inv, []) -> Inv;
process_order(Inv, [{order, Id, Qty} | Rest]) ->
    process_order(update_stock(Inv, Id, -Qty), Rest).

update_stock(Inv, Id, Delta) ->
    update_stock_loop(Inv, Id, Delta, []).

update_stock_loop([], _Id, _Delta, Acc) -> lists:reverse(Acc);
update_stock_loop([{product, Id, Name, Price, Stock} | Rest], Id, Delta, Acc) ->
    update_stock_loop(Rest, Id, Delta, [{product, Id, Name, Price, Stock + Delta} | Acc]);
update_stock_loop([H | T], Id, Delta, Acc) ->
    update_stock_loop(T, Id, Delta, [H | Acc]).

calculate_order_total(Inv, Orders) ->
    calc_total_loop(Orders, Inv, 0).

calc_total_loop([], _Inv, Acc) -> Acc;
calc_total_loop([{order, Id, Qty} | Rest], Inv, Acc) ->
    case find_product(Inv, Id) of
        {ok, {product, Id, _Name, Price, Stock}} when Stock >= Qty ->
            calc_total_loop(Rest, Inv, Acc + (Price * Qty));
        _ ->
            calc_total_loop(Rest, Inv, Acc)
    end.

restock(Inv, []) -> Inv;
restock(Inv, [{Id, Add} | Rest]) ->
    restock(update_stock(Inv, Id, Add), Rest).

find_product([], _Id) -> not_found;
find_product([{product, Id, _Name, _Price, _Stock} = P | _], Id) -> {ok, P};
find_product([_ | T], Id) -> find_product(T, Id).
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch02-l08", staleCode)
		if err != nil {
			t.Fatalf("RunVerification error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected stale/unbounded order deduction to fail ch02-l08, got PASSED (score=%d)", report.Score)
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "visible_and_hidden_test_suite" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected visible_and_hidden_test_suite stage to fail for stale sequential order bug, stages=%+v", report.Stages)
		}
	})
}

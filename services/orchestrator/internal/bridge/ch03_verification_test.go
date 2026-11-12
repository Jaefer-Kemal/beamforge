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

	hofTransformSolution := `-module(hof_transform).
-export([discount_prices/2, active_sessions/1, sanitize_metrics/1]).

%% @doc Return a list of product tuples with each price reduced by the caller-supplied DiscountPercent using truncating integer division while preserving order.
discount_prices(Products, DiscountPercent) ->
    lists:map(fun({product, Id, Name, Price}) ->
        NewPrice = Price - ((Price * DiscountPercent) div 100),
        {product, Id, Name, NewPrice}
    end, Products).

%% @doc Retain only session tuples in the active state from Sessions while preserving original order.
active_sessions(Sessions) ->
    lists:filter(fun({session, _Id, Status}) ->
        Status =:= active
    end, Sessions).

%% @doc Discard negative readings and round zero-or-positive telemetry values in RawMetrics to whole integers in a single pass.
sanitize_metrics(RawMetrics) ->
    lists:filtermap(fun
        ({Metric, Value}) when Value >= 0 ->
            {true, {Metric, round(Value)}};
        ({_Metric, _Negative}) ->
            false
    end, RawMetrics).
`

	hofPredicatesSolution := `-module(hof_predicates).
-export([all_in_stock/1, has_critical_error/1, split_orders_by_stock/2]).

%% @doc Return true if every product tuple in Inventory has strictly positive stock (and true for an empty inventory), or false if any item is zero or negative.
all_in_stock(Inventory) ->
    lists:all(fun({product, _Id, _Name, _Price, Stock}) ->
        Stock > 0
    end, Inventory).

%% @doc Return true if any log entry in Logs carries a critical severity atom, returning false otherwise or on an empty list.
has_critical_error(Logs) ->
    lists:any(fun({log, Level, _Msg}) ->
        Level =:= critical
    end, Logs).

%% @doc Partition Orders in a single relative-order-preserving pass into a pair separating positive quantities up to the caller-supplied MaxSingleOrderQty limit from all remaining orders.
split_orders_by_stock(Orders, MaxSingleOrderQty) ->
    lists:partition(fun({order, _Id, Qty}) ->
        Qty > 0 andalso Qty =< MaxSingleOrderQty
    end, Orders).
`

	hofFoldSolution := `-module(hof_fold).
-export([sum_ledger/1, min_max_latency/1, reverse_with_fold/1]).

%% @doc Aggregate credit, debit, and net balance totals from Entries in one left fold, returning a zeroed ledger summary tuple on empty input.
sum_ledger(Entries) ->
    {TotalCred, TotalDeb, Net} = lists:foldl(fun
        ({entry, Amount, credit}, {CredAcc, DebAcc, NetAcc}) ->
            {CredAcc + Amount, DebAcc, NetAcc + Amount};
        ({entry, Amount, debit}, {CredAcc, DebAcc, NetAcc}) ->
            {CredAcc, DebAcc + Amount, NetAcc - Amount}
    end, {0, 0, 0}, Entries),
    {ledger_summary, TotalCred, TotalDeb, Net}.

%% @doc Return a pair containing the minimum and maximum integer values in the non-empty Latencies list using a left fold.
min_max_latency([First | Rest]) ->
    lists:foldl(fun(Ms, {MinSoFar, MaxSoFar}) ->
        NewMin = case Ms < MinSoFar of true -> Ms; false -> MinSoFar end,
        NewMax = case Ms > MaxSoFar of true -> Ms; false -> MaxSoFar end,
        {NewMin, NewMax}
    end, {First, First}, Rest).

%% @doc Reverse element order of List in linear time via a left fold without calling standard library reversal helpers.
reverse_with_fold(List) ->
    lists:foldl(fun(Elem, Acc) -> [Elem | Acc] end, [], List).
`

	keylistConfigSolution := `-module(keylist_config).
-export([find_product_by_id/2, upsert_product/2, read_socket_options/1]).

%% @doc Search Inventory by ProductId at product identifier position, returning an ok pair wrapping the matching product tuple or a not-found error pair when absent.
find_product_by_id(Inventory, ProductId) ->
    case lists:keyfind(ProductId, 2, Inventory) of
        {product, ProductId, _, _, _} = Prod ->
            {ok, Prod};
        false ->
            {error, not_found}
    end.

%% @doc Replace an existing product tuple matching NewProduct's identifier in place, or append NewProduct to the end of Inventory when not present.
upsert_product(Inventory, {product, ProdId, _, _, _} = NewProduct) ->
    lists:keystore(ProdId, 2, Inventory, NewProduct).

%% @doc Extract caller-supplied socket configuration options from OptsList (defaulting port to 8080, active mode to false, and binary flag to false) into a normalized socket_cfg tuple.
read_socket_options(OptsList) ->
    Port = proplists:get_value(port, OptsList, 8080),
    Active = proplists:get_value(active, OptsList, false),
    IsBinary = proplists:get_bool(binary, OptsList),
    {socket_cfg, Port, Active, IsBinary}.
`

	comprehensionQueriesSolution := `-module(comprehension_queries).
-export([active_user_names/1, matrix_cartesian/2, fulfilled_order_receipts/2]).

%% @doc Extract name strings from active user tuples in Users while silently omitting inactive or unrelated entries without raising exceptions.
active_user_names(Users) ->
    [Name || {user, _Id, Name, active} <- Users].

%% @doc Return the Cartesian product list of 2-element pairs combining every element of Xs and Ys with Ys cycling fastest, or an empty list if either input is empty.
matrix_cartesian(Xs, Ys) ->
    [{X, Y} || X <- Xs, Y <- Ys].

%% @doc Join Orders in caller sequence against Inventory by product identifier, keeping only positive quantities within available stock and emitting receipt tuples with total cost.
fulfilled_order_receipts(Inventory, Orders) ->
    [
        {receipt, Id, Name, Qty * Price}
     || {order, ProdId, Qty} <- Orders,
        {product, Id, Name, Price, Stock} <- Inventory,
        ProdId =:= Id,
        Stock >= Qty,
        Qty > 0
    ].
`

	inventoryHofSolution := `-module(inventory_hof).
-export([total_inventory_valuation/1, critical_stock_alerts/2, apply_orders_with_keylists/2, aggregate_sla_logs/1]).

%% @doc Compute the combined monetary value of all stock in Inventory in a single pass, returning zero for an empty catalog.
total_inventory_valuation(Inventory) ->
    lists:foldl(fun({product, _Id, _Name, Price, Stock}, TotalAcc) ->
        TotalAcc + (Price * Stock)
    end, 0, Inventory).

%% @doc Filter and project Inventory items whose stock is at or below the caller-supplied Threshold into alert notifications while preserving order.
critical_stock_alerts(Inventory, Threshold) ->
    lists:filtermap(fun
        ({product, Id, Name, _Price, Stock}) when Stock =< Threshold ->
            {true, {alert, Id, Name, Stock}};
        (_) ->
            false
    end, Inventory).

%% @doc Apply sequential customer Orders left-to-right against Inventory, deducting valid positive quantities with sufficient stock in place without altering catalog ordering.
apply_orders_with_keylists(Inventory, Orders) ->
    lists:foldl(fun({order, ProdId, Qty}, AccInv) ->
        case lists:keyfind(ProdId, 2, AccInv) of
            {product, ProdId, Name, Price, Stock} when Stock >= Qty, Qty > 0 ->
                UpdatedProd = {product, ProdId, Name, Price, Stock - Qty},
                lists:keystore(ProdId, 2, AccInv, UpdatedProd);
            _ ->
                AccInv
        end
    end, Inventory, Orders).

%% @doc Reduce service Logs into an SLA summary tuple tracking total request count, error-status count, and cumulative latency in milliseconds.
aggregate_sla_logs(Logs) ->
    lists:foldl(fun
        ({log, _Endpoint, Latency, error}, {sla_summary, TotalReqs, Errors, TotalLatency}) ->
            {sla_summary, TotalReqs + 1, Errors + 1, TotalLatency + Latency};
        ({log, _Endpoint, Latency, _OkStatus}, {sla_summary, TotalReqs, Errors, TotalLatency}) ->
            {sla_summary, TotalReqs + 1, Errors, TotalLatency + Latency}
    end, {sla_summary, 0, 0, 0}, Logs).
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
		{
			exerciseID:   "ch03-l02",
			visibleCount: 3,
			files:        map[string]string{"src/hof_transform.erl": hofTransformSolution},
		},
		{
			exerciseID:   "ch03-l03",
			visibleCount: 4,
			files:        map[string]string{"src/hof_predicates.erl": hofPredicatesSolution},
		},
		{
			exerciseID:   "ch03-l04",
			visibleCount: 3,
			files:        map[string]string{"src/hof_fold.erl": hofFoldSolution},
		},
		{
			exerciseID:   "ch03-l05",
			visibleCount: 4,
			files:        map[string]string{"src/keylist_config.erl": keylistConfigSolution},
		},
		{
			exerciseID:   "ch03-l06",
			visibleCount: 3,
			files:        map[string]string{"src/comprehension_queries.erl": comprehensionQueriesSolution},
		},
		{
			exerciseID:   "ch03-l07",
			visibleCount: 4,
			files:        map[string]string{"src/inventory_hof.erl": inventoryHofSolution},
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

	t.Run("ch03-l02 rejects list comprehension bypass and missing lists HOF calls via AST audit", func(t *testing.T) {
		sessionID := "test-ch03-l02-neg-lc"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/hof_transform.erl": `-module(hof_transform).
-export([discount_prices/2, active_sessions/1, sanitize_metrics/1]).

discount_prices(Products, DiscountPercent) ->
    [{product, Id, Name, Price - ((Price * DiscountPercent) div 100)} || {product, Id, Name, Price} <- Products].

active_sessions(Sessions) ->
    [{session, Id, Status} || {session, Id, Status} <- Sessions, Status =:= active].

sanitize_metrics(RawMetrics) ->
    [{Metric, round(Value)} || {Metric, Value} <- RawMetrics, Value >= 0].
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch03-l02", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected list-comprehension bypass in ch03-l02 to fail AST audit, got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_hof_transform_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_hof_transform_audit stage to fail for list comprehension bypass, stages=%+v", report.Stages)
		}
	})

	t.Run("ch03-l02 rejects off-by-zero Value > 0 boundary error in sanitize_metrics", func(t *testing.T) {
		sessionID := "test-ch03-l02-neg-zero"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		buggy := map[string]string{
			"src/hof_transform.erl": `-module(hof_transform).
-export([discount_prices/2, active_sessions/1, sanitize_metrics/1]).

discount_prices(Products, DiscountPercent) ->
    lists:map(fun({product, Id, Name, Price}) ->
        {product, Id, Name, Price - ((Price * DiscountPercent) div 100)}
    end, Products).

active_sessions(Sessions) ->
    lists:filter(fun({session, _Id, Status}) -> Status =:= active end, Sessions).

%% Bug: strict > 0 drops valid 0.0 / 0 readings.
sanitize_metrics(RawMetrics) ->
    lists:filtermap(fun
        ({Metric, Value}) when Value > 0 ->
            {true, {Metric, round(Value)}};
        (_) ->
            false
    end, RawMetrics).
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch03-l02", buggy)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected strict Value > 0 bug in sanitize_metrics to fail ch03-l02, got PASSED")
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "map_filter_filtermap" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected map_filter_filtermap stage to fail for strict Value > 0 zero-dropping bug, stages=%+v", report.Stages)
		}
	})

	t.Run("ch03-l03 rejects list comprehension and manual recursion bypassing lists:all/any/partition via AST audit", func(t *testing.T) {
		sessionID := "test-ch03-l03-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/hof_predicates.erl": `-module(hof_predicates).
-export([all_in_stock/1, has_critical_error/1, split_orders_by_stock/2]).

all_in_stock(Inventory) ->
    [P || {product, _, _, _, Stock} = P <- Inventory, Stock =< 0] =:= [].

has_critical_error(Logs) ->
    [L || {log, critical, _} = L <- Logs] =/= [].

split_orders_by_stock(Orders, MaxSingleOrderQty) ->
    {[{order, Id, Qty} || {order, Id, Qty} <- Orders, Qty > 0, Qty =< MaxSingleOrderQty],
     [{order, Id, Qty} || {order, Id, Qty} <- Orders, Qty =< 0 orelse Qty > MaxSingleOrderQty]}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch03-l03", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected list-comprehension bypass in ch03-l03 to fail AST audit, got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_hof_predicates_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_hof_predicates_audit stage to fail for list comprehension bypass, stages=%+v", report.Stages)
		}
	})

	t.Run("ch03-l03 rejects non-positive order quantity leaking into StandardOrders", func(t *testing.T) {
		sessionID := "test-ch03-l03-neg-nonpos"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		buggy := map[string]string{
			"src/hof_predicates.erl": `-module(hof_predicates).
-export([all_in_stock/1, has_critical_error/1, split_orders_by_stock/2]).

all_in_stock(Inventory) ->
    lists:all(fun({product, _Id, _Name, _Price, Stock}) -> Stock > 0 end, Inventory).

has_critical_error(Logs) ->
    lists:any(fun({log, Level, _Msg}) -> Level =:= critical end, Logs).

%% Bug: omits Qty > 0 check so Qty = 0 and Qty = -3 land in StandardOrders.
split_orders_by_stock(Orders, MaxSingleOrderQty) ->
    lists:partition(fun({order, _Id, Qty}) ->
        Qty =< MaxSingleOrderQty
    end, Orders).
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch03-l03", buggy)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected non-positive order leak in split_orders_by_stock to fail ch03-l03, got PASSED")
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "boolean_predicates" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected boolean_predicates stage to fail for non-positive quantity leak, stages=%+v", report.Stages)
		}
	})

	t.Run("ch03-l04 rejects lists:reverse/1 and lists:min/max shortcuts bypassing lists:foldl/3", func(t *testing.T) {
		sessionID := "test-ch03-l04-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/hof_fold.erl": `-module(hof_fold).
-export([sum_ledger/1, min_max_latency/1, reverse_with_fold/1]).

sum_ledger(Entries) ->
    {TotalCred, TotalDeb, Net} = lists:foldl(fun
        ({entry, Amount, credit}, {C, D, N}) -> {C + Amount, D, N + Amount};
        ({entry, Amount, debit}, {C, D, N}) -> {C, D + Amount, N - Amount}
    end, {0, 0, 0}, Entries),
    {ledger_summary, TotalCred, TotalDeb, Net}.

min_max_latency(Latencies) ->
    {lists:min(Latencies), lists:max(Latencies)}.

reverse_with_fold(List) ->
    lists:reverse(List).
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch03-l04", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected lists:reverse/lists:min/lists:max shortcuts in ch03-l04 to fail AST audit, got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_hof_fold_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_hof_fold_audit stage to fail for lists:reverse/min/max shortcut, stages=%+v", report.Stages)
		}
	})

	t.Run("ch03-l04 rejects zero-seeded min_max_latency failing negative latencies", func(t *testing.T) {
		sessionID := "test-ch03-l04-neg-seed"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		buggy := map[string]string{
			"src/hof_fold.erl": `-module(hof_fold).
-export([sum_ledger/1, min_max_latency/1, reverse_with_fold/1]).

sum_ledger(Entries) ->
    {TotalCred, TotalDeb, Net} = lists:foldl(fun
        ({entry, Amount, credit}, {C, D, N}) -> {C + Amount, D, N + Amount};
        ({entry, Amount, debit}, {C, D, N}) -> {C, D + Amount, N - Amount}
    end, {0, 0, 0}, Entries),
    {ledger_summary, TotalCred, TotalDeb, Net}.

%% Bug: initializes {0, 0} instead of seeding from head element, breaking negative lists.
min_max_latency(Latencies) ->
    lists:foldl(fun(Ms, {MinSoFar, MaxSoFar}) ->
        {min(Ms, MinSoFar), max(Ms, MaxSoFar)}
    end, {0, 0}, Latencies).

reverse_with_fold(List) ->
    lists:foldl(fun(Elem, Acc) -> [Elem | Acc] end, [], List).
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch03-l04", buggy)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected zero-seeded min_max_latency to fail ch03-l04, got PASSED")
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "foldl_state_reduction" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected foldl_state_reduction stage to fail for zero-seeded min/max bug, stages=%+v", report.Stages)
		}
	})

	t.Run("ch03-l05 rejects manual recursion bypassing keyfind/keystore/proplists via AST audit", func(t *testing.T) {
		sessionID := "test-ch03-l05-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		cheat := map[string]string{
			"src/keylist_config.erl": `-module(keylist_config).
-export([find_product_by_id/2, upsert_product/2, read_socket_options/1]).

find_product_by_id([], _Id) -> {error, not_found};
find_product_by_id([{product, Id, _, _, _} = P | _], Id) -> {ok, P};
find_product_by_id([_ | T], Id) -> find_product_by_id(T, Id).

upsert_product(Inv, NewProd) -> [NewProd | Inv].

read_socket_options(Opts) ->
    {socket_cfg, proplists:get_value(port, Opts, 8080), proplists:get_value(active, Opts, false), lists:member(binary, Opts)}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch03-l05", cheat)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected manual bypass of lists:keyfind/keystore/proplists:get_bool to fail ch03-l05, got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_keylist_config_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_keylist_config_audit stage to fail for missing C/proplist BIF calls, stages=%+v", report.Stages)
		}
	})

	t.Run("ch03-l05 rejects {binary, true} failure and prepended insert order bug", func(t *testing.T) {
		sessionID := "test-ch03-l05-neg-edge"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		buggy := map[string]string{
			"src/keylist_config.erl": `-module(keylist_config).
-export([find_product_by_id/2, upsert_product/2, read_socket_options/1]).

find_product_by_id(Inventory, ProductId) ->
    case lists:keyfind(ProductId, 2, Inventory) of
        {product, ProductId, _, _, _} = Prod -> {ok, Prod};
        false -> {error, not_found}
    end.

%% Bug: prepends NewProduct on miss instead of lists:keystore appending at end; still calls keystore on hit path.
upsert_product(Inventory, {product, ProdId, _, _, _} = NewProduct) ->
    case lists:keyfind(ProdId, 2, Inventory) of
        false -> [NewProduct | Inventory];
        _ -> lists:keystore(ProdId, 2, Inventory, NewProduct)
    end.

%% Bug: uses proplists:get_value(binary, Opts, false) which returns false even when {binary, false} or bare binary atom is tested alongside get_bool.
read_socket_options(OptsList) ->
    Port = proplists:get_value(port, OptsList, 8080),
    Active = proplists:get_value(active, OptsList, false),
    IsBinary = lists:member(binary, OptsList) andalso proplists:get_bool(binary, OptsList),
    {socket_cfg, Port, Active, IsBinary}.
`,
		}

		report, err := runner.RunVerification(ctx, session, "ch03-l05", buggy)
		if err != nil {
			t.Fatalf("RunVerification failed with error: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected prepended insert + {binary, true} bug in ch03-l05 to fail, got PASSED")
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "keylist_and_proplist" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected keylist_and_proplist stage to fail for order/proplist bug, stages=%+v", report.Stages)
		}
	})

	t.Run("ch03-l06 rejects lists:filtermap bypass missing list comprehensions via AST audit", func(t *testing.T) {
		sessionID := "test-ch03-l06-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		noLCBypass := map[string]string{
			"src/comprehension_queries.erl": `-module(comprehension_queries).
-export([active_user_names/1, matrix_cartesian/2, fulfilled_order_receipts/2]).

active_user_names(Users) ->
    lists:filtermap(fun({user, _Id, Name, active}) -> {true, Name}; (_) -> false end, Users).

matrix_cartesian(Xs, Ys) ->
    lists:flatmap(fun(X) -> lists:map(fun(Y) -> {X, Y} end, Ys) end, Xs).

fulfilled_order_receipts(Inventory, Orders) ->
    lists:filtermap(
        fun({order, ProdId, Qty}) when Qty > 0 ->
            case lists:keyfind(ProdId, 2, Inventory) of
                {product, ProdId, Name, Price, Stock} when Stock >= Qty ->
                    {true, {receipt, ProdId, Name, Qty * Price}};
                _ -> false
            end;
           (_) -> false
        end, Orders).
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch03-l06", noLCBypass)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict when list comprehensions are bypassed, got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_comprehension_queries_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_comprehension_queries_audit stage to fail when list comprehensions are missing, stages=%+v", report.Stages)
		}
	})

	t.Run("ch03-l06 rejects swapped generator order and boundary bugs in list_comprehensions", func(t *testing.T) {
		sessionID := "test-ch03-l06-neg-edge"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		badOrderAndBoundary := map[string]string{
			"src/comprehension_queries.erl": `-module(comprehension_queries).
-export([active_user_names/1, matrix_cartesian/2, fulfilled_order_receipts/2]).

active_user_names(Users) ->
    [Name || {user, _Id, Name, active} <- Users].

matrix_cartesian(Xs, Ys) ->
    [{X, Y} || Y <- Ys, X <- Xs].

fulfilled_order_receipts(Inventory, Orders) ->
    [{receipt, Id, Name, Qty * Price} ||
        {order, ProdId, Qty} <- Orders,
        Qty >= 0,
        {product, Id, Name, Price, Stock} <- Inventory,
        ProdId =:= Id,
        Stock > Qty].
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch03-l06", badOrderAndBoundary)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict for swapped generator order and boundary bugs, got PASSED")
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "list_comprehensions" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected list_comprehensions stage to fail for generator order and stock/qty boundary bugs, stages=%+v", report.Stages)
		}
	})

	t.Run("ch03-l07 rejects manual recursion and list comprehension bypasses missing required BIFs via AST audit", func(t *testing.T) {
		sessionID := "test-ch03-l07-neg-ast"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		manualBypass := map[string]string{
			"src/inventory_hof.erl": `-module(inventory_hof).
-export([total_inventory_valuation/1, critical_stock_alerts/2, apply_orders_with_keylists/2, aggregate_sla_logs/1]).

total_inventory_valuation(Inventory) ->
    lists:sum([Price * Stock || {product, _Id, _Name, Price, Stock} <- Inventory]).

critical_stock_alerts(Inventory, Threshold) ->
    [{alert, Id, Name, Stock} || {product, Id, Name, _Price, Stock} <- Inventory, Stock =< Threshold].

apply_orders_with_keylists(Inventory, []) ->
    Inventory;
apply_orders_with_keylists(Inventory, [{order, ProdId, Qty} | Rest]) ->
    Updated = [case Id =:= ProdId andalso Stock >= Qty andalso Qty > 0 of
        true -> {product, Id, Name, Price, Stock - Qty};
        false -> {product, Id, Name, Price, Stock}
    end || {product, Id, Name, Price, Stock} <- Inventory],
    apply_orders_with_keylists(Updated, Rest).

aggregate_sla_logs(Logs) ->
    agg(Logs, {sla_summary, 0, 0, 0}).

agg([], Acc) ->
    Acc;
agg([{log, _, Lat, error} | T], {sla_summary, C, E, S}) ->
    agg(T, {sla_summary, C + 1, E + 1, S + Lat});
agg([{log, _, Lat, _} | T], {sla_summary, C, E, S}) ->
    agg(T, {sla_summary, C + 1, E, S + Lat}).
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch03-l07", manualBypass)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict when lists:foldl/filtermap/keyfind/keystore are bypassed, got PASSED")
		}
		astFailed := false
		for _, st := range report.Stages {
			if st.ID == "ast_inventory_hof_audit" && st.Status == "failed" {
				astFailed = true
			}
		}
		if !astFailed {
			t.Errorf("Expected ast_inventory_hof_audit stage to fail when required BIF calls are missing, stages=%+v", report.Stages)
		}
	})

	t.Run("ch03-l07 rejects inclusive boundary and non-threaded sequential depletion bugs", func(t *testing.T) {
		sessionID := "test-ch03-l07-neg-edge"
		session, err := poolMgr.ClaimSession(sessionID)
		if err != nil {
			t.Fatalf("Failed to claim session: %v", err)
		}
		defer poolMgr.ReleaseSession(sessionID)

		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		edgeBugs := map[string]string{
			"src/inventory_hof.erl": `-module(inventory_hof).
-export([total_inventory_valuation/1, critical_stock_alerts/2, apply_orders_with_keylists/2, aggregate_sla_logs/1]).

total_inventory_valuation(Inventory) ->
    lists:foldl(fun({product, _Id, _Name, Price, Stock}, Acc) -> Acc + (Price * Stock) end, 0, Inventory).

%% Bug: strict < Threshold instead of =< misses exact boundary Stock =:= Threshold.
critical_stock_alerts(Inventory, Threshold) ->
    lists:filtermap(fun
        ({product, Id, Name, _Price, Stock}) when Stock < Threshold -> {true, {alert, Id, Name, Stock}};
        (_) -> false
    end, Inventory).

%% Bug: allows strict Stock > Qty instead of >= Qty and ignores AccInv lookup by re-querying original Inventory.
apply_orders_with_keylists(Inventory, Orders) ->
    lists:foldl(fun({order, ProdId, Qty}, AccInv) ->
        case lists:keyfind(ProdId, 2, Inventory) of
            {product, ProdId, Name, Price, Stock} when Stock > Qty, Qty > 0 ->
                lists:keystore(ProdId, 2, AccInv, {product, ProdId, Name, Price, Stock - Qty});
            _ ->
                AccInv
        end
    end, Inventory, Orders).

aggregate_sla_logs(Logs) ->
    lists:foldl(fun
        ({log, _, Latency, error}, {sla_summary, C, E, L}) -> {sla_summary, C + 1, E + 1, L + Latency};
        ({log, _, Latency, _}, {sla_summary, C, E, L}) -> {sla_summary, C + 1, E, L + Latency}
    end, {sla_summary, 0, 0, 0}, Logs).
`,
		}
		report, err := runner.RunVerification(ctx, session, "ch03-l07", edgeBugs)
		if err != nil {
			t.Fatalf("RunVerification failed unexpectedly: %v", err)
		}
		if report.Verdict == "PASSED" {
			t.Fatalf("Expected FAILED verdict for Stock < Threshold and non-threaded order depletion bugs, got PASSED")
		}
		funcFailed := false
		for _, st := range report.Stages {
			if st.ID == "hof_inventory_suite" && st.Status == "failed" {
				funcFailed = true
			}
		}
		if !funcFailed {
			t.Errorf("Expected hof_inventory_suite stage to fail for threshold boundary and sequential state bugs, stages=%+v", report.Stages)
		}
	})
}

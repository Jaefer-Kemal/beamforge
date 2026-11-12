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
}

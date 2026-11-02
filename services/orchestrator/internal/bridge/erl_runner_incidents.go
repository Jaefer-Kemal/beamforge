package bridge

import (
	"github.com/beamforge/orchestrator/internal/pool"
)

// buildIncidentRunScript provides execution scripts for the 7 Production Incident Triage labs
func (r *Runner) buildIncidentRunScript(session *pool.Session, exerciseID string) (string, bool) {
	switch exerciseID {

	// ── Incident #101 (Ch. 5): Unbounded Mailbox Memory Leak ─────────────────
	case "ch05-l07":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {ok, P} = incident_mailbox_leak:start(),
    [P ! {legacy_heartbeat, os:system_time()} || _ <- lists:seq(1, 50)],
    ok = incident_mailbox_leak:record_metric(P, 10),
    ok = incident_mailbox_leak:record_metric(P, 20),
    [P ! {legacy_heartbeat, os:system_time()} || _ <- lists:seq(1, 50)],
    timer:sleep(30),
    Len = case erlang:function_exported(incident_mailbox_leak, inspect_queue_len, 1) of
        true -> incident_mailbox_leak:inspect_queue_len(P);
        false -> incident_mailbox_leak:get_mailbox_len(P)
    end,
    {ok, Summary} = incident_mailbox_leak:get_summary(P),
    catch incident_mailbox_leak:stop(P),
    exit(P, kill),
    Passed = (Len =:= 0) andalso (Summary =:= #{count => 2, total => 30}),
    #{call_str => <<"incident_mailbox_leak:inspect_queue_len(P) & get_summary(P)">>,
      expected => <<"{len => 0, count => 2, total => 30}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("len: ~p, summary: ~p", [Len, Summary]))),
      passed => Passed,
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"incident_mailbox_leak test">>, expected => <<"{len => 0}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── Incident #102 (Ch. 6): Hanging Client Calls on Worker Crash ──────────
	case "ch06-l09", "incident_hanging_call":
		return `
StartWorker = fun() ->
    Exports = incident_hanging_call:module_info(exports),
    case lists:member({start_pricing_worker, 0}, Exports) of
        true -> incident_hanging_call:start_pricing_worker();
        false -> incident_hanging_call:start_worker()
    end
end,
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {ok, W} = StartWorker(),
    {ok, 49.99} = incident_hanging_call:call_pricing_worker(W, widget_a),
    T_CrashStart = erlang:system_time(millisecond),
    CrashRes = incident_hanging_call:call_pricing_worker(W, poison_item),
    Elapsed = erlang:system_time(millisecond) - T_CrashStart,
    Passed = case CrashRes of
        {error, {worker_down, _}} -> Elapsed < 500;
        _ -> false
    end,
    #{call_str => <<"incident_hanging_call:call_pricing_worker(W, poison_item)">>,
      expected => <<"{error, {worker_down, badarith}} in < 500ms">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p in ~p ms", [CrashRes, Elapsed]))),
      passed => Passed,
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"incident_hanging_call test">>, expected => <<"{error, {worker_down, ...}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── Incident #103 (Ch. 7): Slow gen_server:init/1 Blocking Supervisor ─────
	case "ch07-l07", "incident_blocking_init":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    InitRes = incident_blocking_init:init([{"item1", 100}]),
    PassedInit = case InitRes of
        {ok, #{status := booting}, {continue, {hydrate, [{"item1", 100}]}}} -> true;
        _ -> false
    end,
    {ok, S} = incident_blocking_init:start_link([{"alpha", 99}]),
    Status = incident_blocking_init:get_status(S),
    ItemRes = case erlang:function_exported(incident_blocking_init, lookup_rule, 2) of
        true -> incident_blocking_init:lookup_rule(S, "alpha");
        false -> incident_blocking_init:get_item(S, "alpha")
    end,
    gen_server:stop(S),
    Passed = PassedInit andalso (Status =:= ready) andalso (ItemRes =:= {ok, 99}),
    #{call_str => <<"incident_blocking_init:init/1 & start_link/1">>,
      expected => <<"{continue, {hydrate, ...}} & status => ready">>,
      actual => list_to_binary(lists:flatten(io_lib:format("init: ~p, status: ~p, item: ~p", [InitRes, Status, ItemRes]))),
      passed => Passed,
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"incident_blocking_init test">>, expected => <<"{ok, ..., {continue, ...}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── Incident #104 (Ch. 8): Broken Supervision Strategy ───────────────────
	case "ch08-l06":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {ok, {SupFlags, ChildSpecs}} = incident_wrong_strategy:init([]),
    Strat = maps:get(strategy, SupFlags, undefined),
    Restarts = [maps:get(restart, S, undefined) || S <- ChildSpecs],
    PassedAudit = (Strat =:= rest_for_one) andalso (Restarts =:= [permanent, permanent, permanent]),
    CascadeRes = incident_wrong_strategy:test_chaos_cascade(),
    Passed = PassedAudit andalso (CascadeRes =:= {ok, db_unaffected, downstream_restarted}),
    #{call_str => <<"incident_wrong_strategy:test_chaos_cascade()">>,
      expected => <<"{ok, db_unaffected, downstream_restarted}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("Strat: ~p, Cascade: ~p", [Strat, CascadeRes]))),
      passed => Passed,
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"incident_wrong_strategy test">>, expected => <<"{ok, db_unaffected, downstream_restarted}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── Incident #105 (Ch. 9): ETS Session Wipeout on Worker Crash ───────────
	case "ch09-l07":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    AuditRes = incident_ets_wipeout:audit_table_heir(),
    HandoverRes = incident_ets_wipeout:test_heir_handover(),
    Passed = (AuditRes =:= {ok, heir_configured}) andalso (HandoverRes =:= {ok, 3, survived}),
    #{call_str => <<"incident_ets_wipeout:test_heir_handover()">>,
      expected => <<"{ok, 3, survived}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("Audit: ~p, Handover: ~p", [AuditRes, HandoverRes]))),
      passed => Passed,
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"incident_ets_wipeout test">>, expected => <<"{ok, 3, survived}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── Incident #106 (Ch. 10): TCP Server OOM Flood & Dropped Lines ─────────
	case "ch10-l06":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    AuditRes = incident_tcp_active_true:audit_socket_opts(),
    FramingRes = incident_tcp_active_true:test_framing(),
    Passed = (AuditRes =:= {ok, active_once_enforced}) andalso (FramingRes =:= {ok, [<<"PING">>, <<"PONG">>], <<"PARTIAL">>}),
    #{call_str => <<"incident_tcp_active_true:test_framing()">>,
      expected => <<"{ok, [<<\"PING\">>, <<\"PONG\">>], <<\"PARTIAL\">>}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("Opts: ~p, Framing: ~p", [AuditRes, FramingRes]))),
      passed => Passed,
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"incident_tcp_active_true test">>, expected => <<"{ok, ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── Incident #107 (Ch. 11): XMPP Pre-Auth Injection & XML Escape ─────────
	case "ch11-l07":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    RejectionRes = incident_xmpp_auth_bypass:test_pre_auth_rejection(),
    {ok, Escaped} = incident_xmpp_auth_bypass:test_xml_escaping(),
    ExpectedXml = <<"&lt;b&gt;Tom &amp; Jerry &gt; 1&lt;/b&gt;">>,
    Passed = (RejectionRes =:= {ok, pre_auth_rejected}) andalso (Escaped =:= ExpectedXml),
    #{call_str => <<"incident_xmpp_auth_bypass:test_xml_escaping()">>,
      expected => ExpectedXml,
      actual => Escaped,
      passed => Passed,
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"incident_xmpp_auth_bypass test">>, expected => <<"XML escaped & pre-auth rejected">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	default:
		return "", false
	}
}

// buildIncidentVerificationScript provides multi-stage verification for the 7 Production Incident Triage labs
func (r *Runner) buildIncidentVerificationScript(session *pool.Session, exerciseID string) (string, bool) {
	switch exerciseID {

	// ── Incident #101 (Ch. 5): Unbounded Mailbox Memory Leak ─────────────────
	case "ch05-l07":
		return `
CompileStage = case code:ensure_loaded(incident_mailbox_leak) of
    {module, incident_mailbox_leak} ->
        Exports = incident_mailbox_leak:module_info(exports),
        HasQueueFn = lists:member({inspect_queue_len, 1}, Exports) orelse lists:member({get_mailbox_len, 1}, Exports),
        Req = [{start, 0}, {record_metric, 2}, {get_summary, 1}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] when HasQueueFn ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 10, details => <<"incident_mailbox_leak.erl compiled cleanly; all required functions exported.">>};
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 10, details => <<"Missing export: inspect_queue_len/1 or get_mailbox_len/1">>};
            Missing ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_NoiseDrain = try
    {ok, P} = incident_mailbox_leak:start(),
    [P ! {legacy_heartbeat, os:system_time()} || _ <- lists:seq(1, 150)],
    ok = incident_mailbox_leak:record_metric(P, 100),
    [P ! {legacy_heartbeat, os:system_time()} || _ <- lists:seq(1, 150)],
    ok = incident_mailbox_leak:record_metric(P, 50),
    timer:sleep(40),
    Len = case erlang:function_exported(incident_mailbox_leak, inspect_queue_len, 1) of
        true -> incident_mailbox_leak:inspect_queue_len(P);
        false -> incident_mailbox_leak:get_mailbox_len(P)
    end,
    {ok, Sum} = incident_mailbox_leak:get_summary(P),
    catch incident_mailbox_leak:stop(P),
    exit(P, kill),
    if
        Len =:= 0 andalso Sum =:= #{count => 2, total => 150} ->
            #{id => <<"mailbox_save_queue_drain">>, title => <<"Mailbox Noise Drain & Save Queue Leak Audit">>, status => <<"passed">>, time_ms => 45, details => <<"300 unhandled heartbeat messages drained cleanly. Message queue length = 0.">>};
        true ->
            #{id => <<"mailbox_save_queue_drain">>, title => <<"Mailbox Noise Drain & Save Queue Leak Audit">>, status => <<"failed">>, time_ms => 45, details => list_to_binary(io_lib:format("Mailbox leaked unmatched messages: len=~p, sum=~p", [Len, Sum]))}
    end
catch C1:R1 ->
    #{id => <<"mailbox_save_queue_drain">>, title => <<"Mailbox Noise Drain & Save Queue Leak Audit">>, status => <<"failed">>, time_ms => 45, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
S2_TimeoutContract = try
    DeadPid = spawn(fun() -> ok end),
    timer:sleep(10),
    T_Start = erlang:system_time(millisecond),
    TimeoutRes = incident_mailbox_leak:get_summary(DeadPid),
    Elapsed = erlang:system_time(millisecond) - T_Start,
    case TimeoutRes of
        {error, timeout} when Elapsed >= 950, Elapsed =< 1400 ->
            #{id => <<"client_timeout_contract">>, title => <<"Client-Side 1000ms Timeout Defense Contract">>, status => <<"passed">>, time_ms => Elapsed, details => list_to_binary(io_lib:format("Caller returned {error, timeout} after ~p ms", [Elapsed]))};
        Other ->
            #{id => <<"client_timeout_contract">>, title => <<"Client-Side 1000ms Timeout Defense Contract">>, status => <<"failed">>, time_ms => Elapsed, details => list_to_binary(io_lib:format("Expected {error, timeout} within 1000ms, got: ~p in ~p ms", [Other, Elapsed]))}
    end
catch C2:R2 ->
    #{id => <<"client_timeout_contract">>, title => <<"Client-Side 1000ms Timeout Defense Contract">>, status => <<"failed">>, time_ms => 0, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_NoiseDrain, S2_TimeoutContract]
`, true

	// ── Incident #102 (Ch. 6): Hanging Client Calls on Worker Crash ──────────
	case "ch06-l09", "incident_hanging_call":
		return `
StartWorker = fun() ->
    Exports = incident_hanging_call:module_info(exports),
    case lists:member({start_pricing_worker, 0}, Exports) of
        true -> incident_hanging_call:start_pricing_worker();
        false -> incident_hanging_call:start_worker()
    end
end,
CompileStage = case code:ensure_loaded(incident_hanging_call) of
    {module, incident_hanging_call} ->
        Exports = incident_hanging_call:module_info(exports),
        case lists:member({call_pricing_worker, 2}, Exports) andalso (lists:member({start_worker, 0}, Exports) orelse lists:member({start_pricing_worker, 0}, Exports)) of
            true -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 10, details => <<"incident_hanging_call.erl compiled cleanly.">>};
            false -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 10, details => <<"Missing exports: start_pricing_worker/0 or call_pricing_worker/2">>}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_SuccessCall = try
    {ok, W} = StartWorker(),
    Res = incident_hanging_call:call_pricing_worker(W, widget_a),
    W ! stop,
    case Res of
        {ok, 49.99} -> #{id => <<"valid_quote_call">>, title => <<"Normal Quote Request-Reply Delivery">>, status => <<"passed">>, time_ms => 8, details => <<"Worker quoted widget_a cleanly: {ok, 49.99}">>};
        Other1 -> #{id => <<"valid_quote_call">>, title => <<"Normal Quote Request-Reply Delivery">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Expected {ok, 49.99}, got: ~p", [Other1]))}
    end
catch C1:R1 ->
    #{id => <<"valid_quote_call">>, title => <<"Normal Quote Request-Reply Delivery">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
S2_FastFail = try
    {ok, W2} = StartWorker(),
    T0 = erlang:system_time(millisecond),
    CrashRes = incident_hanging_call:call_pricing_worker(W2, poison_item),
    Elapsed = erlang:system_time(millisecond) - T0,
    case CrashRes of
        {error, {worker_down, badarith}} when Elapsed < 100 ->
            #{id => <<"monitor_fast_fail_audit">>, title => <<"Worker Crash Fast-Fail Detection (< 100ms)">>, status => <<"passed">>, time_ms => Elapsed, details => list_to_binary(io_lib:format("Crash detected via monitor in ~p ms (well under 5,000ms timeout)", [Elapsed]))};
        {error, {worker_down, _Reason}} when Elapsed < 100 ->
            #{id => <<"monitor_fast_fail_audit">>, title => <<"Worker Crash Fast-Fail Detection (< 100ms)">>, status => <<"passed">>, time_ms => Elapsed, details => list_to_binary(io_lib:format("Crash detected in ~p ms", [Elapsed]))};
        Got ->
            #{id => <<"monitor_fast_fail_audit">>, title => <<"Worker Crash Fast-Fail Detection (< 100ms)">>, status => <<"failed">>, time_ms => Elapsed, details => list_to_binary(io_lib:format("Call hung or returned invalid result: ~p (Elapsed: ~p ms)", [Got, Elapsed]))}
    end
catch C2:R2 ->
    #{id => <<"monitor_fast_fail_audit">>, title => <<"Worker Crash Fast-Fail Detection (< 100ms)">>, status => <<"failed">>, time_ms => 0, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_SuccessCall, S2_FastFail]
`, true

	// ── Incident #103 (Ch. 7): Slow gen_server:init/1 Blocking Supervisor ─────
	case "ch07-l07", "incident_blocking_init":
		return `
CompileStage = case code:ensure_loaded(incident_blocking_init) of
    {module, incident_blocking_init} ->
        Exports = incident_blocking_init:module_info(exports),
        case lists:member({handle_continue, 2}, Exports) of
            true -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & handle_continue/2 Export">>, status => <<"passed">>, time_ms => 10, details => <<"incident_blocking_init compiled cleanly with handle_continue/2 exported.">>};
            false -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & handle_continue/2 Export">>, status => <<"failed">>, time_ms => 10, details => <<"Missing handle_continue/2 export for non-blocking OTP continue">>}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & handle_continue/2 Export">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_InitContract = try
    InitReturn = incident_blocking_init:init([{"k1", 100}, {"k2", 200}]),
    case InitReturn of
        {ok, #{status := booting}, {continue, {hydrate, [{"k1", 100}, {"k2", 200}]}}} ->
            #{id => <<"non_blocking_init_contract">>, title => <<"Non-Blocking init/1 3-Tuple Return Contract">>, status => <<"passed">>, time_ms => 8, details => <<"init/1 returned immediately with status => booting and {continue, {hydrate, ...}}">>};
        OtherInit ->
            #{id => <<"non_blocking_init_contract">>, title => <<"Non-Blocking init/1 3-Tuple Return Contract">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Expected {ok, #{status => booting, ...}, {continue, {hydrate, ...}}}, got: ~p", [OtherInit]))}
    end
catch C1:R1 ->
    #{id => <<"non_blocking_init_contract">>, title => <<"Non-Blocking init/1 3-Tuple Return Contract">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
S2_ServerHydration = try
    Catalog = [{"product_a", 29.99}, {"product_b", 49.99}, {"product_c", 99.99}],
    {ok, Srv} = incident_blocking_init:start_link(Catalog),
    State = sys:get_state(Srv),
    Status = incident_blocking_init:get_status(Srv),
    GetFn = case erlang:function_exported(incident_blocking_init, lookup_rule, 2) of
        true -> fun(P, K) -> incident_blocking_init:lookup_rule(P, K) end;
        false -> fun(P, K) -> incident_blocking_init:get_item(P, K) end
    end,
    {ok, PriceA} = GetFn(Srv, "product_a"),
    {ok, PriceC} = GetFn(Srv, "product_c"),
    {error, not_found} = GetFn(Srv, "nonexistent"),
    gen_server:stop(Srv),
    case Status =:= ready andalso PriceA =:= 29.99 andalso PriceC =:= 99.99 of
        true -> #{id => <<"async_hydration_verification">>, title => <<"Asynchronous Hydration & sys:get_state Verification">>, status => <<"passed">>, time_ms => 15, details => <<"handle_continue successfully populated all items; status transitioned to ready.">>};
        false -> #{id => <<"async_hydration_verification">>, title => <<"Asynchronous Hydration & sys:get_state Verification">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("State invalid: ~p", [State]))}
    end
catch C2:R2 ->
    #{id => <<"async_hydration_verification">>, title => <<"Asynchronous Hydration & sys:get_state Verification">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_InitContract, S2_ServerHydration]
`, true

	// ── Incident #104 (Ch. 8): Broken Supervision Strategy ───────────────────
	case "ch08-l06":
		return `
CompileStage = case code:ensure_loaded(incident_wrong_strategy) of
    {module, incident_wrong_strategy} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation Audit">>, status => <<"passed">>, time_ms => 10, details => <<"incident_wrong_strategy compiled cleanly.">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_SupFlags = try
    {ok, {SupFlags, ChildSpecs}} = incident_wrong_strategy:init([]),
    Strategy = maps:get(strategy, SupFlags, undefined),
    Restarts = [maps:get(restart, Spec, undefined) || Spec <- ChildSpecs],
    AllPermanent = lists:all(fun(R) -> R =:= permanent end, Restarts),
    case Strategy =:= rest_for_one andalso AllPermanent andalso length(ChildSpecs) =:= 3 of
        true -> #{id => <<"supervision_flags_audit">>, title => <<"rest_for_one Strategy & Permanent Restarts Audit">>, status => <<"passed">>, time_ms => 8, details => <<"Supervisor configured with strategy => rest_for_one and restart => permanent.">>};
        false -> #{id => <<"supervision_flags_audit">>, title => <<"rest_for_one Strategy & Permanent Restarts Audit">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Expected rest_for_one and all permanent, got strategy: ~p, restarts: ~p", [Strategy, Restarts]))}
    end
catch C1:R1 ->
    #{id => <<"supervision_flags_audit">>, title => <<"rest_for_one Strategy & Permanent Restarts Audit">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
S2_ChaosTest = try
    case incident_wrong_strategy:test_chaos_cascade() of
        {ok, db_unaffected, downstream_restarted} ->
            #{id => <<"chaos_cascade_resilience">>, title => <<"Downstream Worker Automatic Restart Cascade">>, status => <<"passed">>, time_ms => 65, details => <<"Crashing worker_cache restarted both worker_cache and downstream worker_http, leaving upstream worker_db unharmed.">>};
        OtherChaos ->
            #{id => <<"chaos_cascade_resilience">>, title => <<"Downstream Worker Automatic Restart Cascade">>, status => <<"failed">>, time_ms => 65, details => list_to_binary(io_lib:format("Cascade failed: ~p", [OtherChaos]))}
    end
catch C2:R2 ->
    #{id => <<"chaos_cascade_resilience">>, title => <<"Downstream Worker Automatic Restart Cascade">>, status => <<"failed">>, time_ms => 65, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_SupFlags, S2_ChaosTest]
`, true

	// ── Incident #105 (Ch. 9): ETS Session Wipeout on Worker Crash ───────────
	case "ch09-l07":
		return `
CompileStage = case code:ensure_loaded(incident_ets_wipeout) of
    {module, incident_ets_wipeout} ->
        Exports = incident_ets_wipeout:module_info(exports),
        Req = [{create_session_table, 1}, {store_session, 3}, {fetch_session, 2}, {transfer_to_restarted_worker, 3}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 10, details => <<"incident_ets_wipeout.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_HeirAudit = try
    MockHeir = spawn(fun() -> receive stop -> ok end end),
    Tab = incident_ets_wipeout:create_session_table(MockHeir),
    HeirInfo = ets:info(Tab, heir),
    MockHeir ! stop,
    ets:delete(Tab),
    case HeirInfo of
        MockHeir -> #{id => <<"ets_heir_registration_audit">>, title => <<"ETS Heir Option & Ownership Transfer Registration">>, status => <<"passed">>, time_ms => 10, details => <<"Table created with {heir, HeirPid, keep_alive} cleanly.">>};
        _ -> #{id => <<"ets_heir_registration_audit">>, title => <<"ETS Heir Option & Ownership Transfer Registration">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Table heir not configured: ~p", [HeirInfo]))}
    end
catch C1:R1 ->
    #{id => <<"ets_heir_registration_audit">>, title => <<"ETS Heir Option & Ownership Transfer Registration">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
S2_SurvivalTest = try
    case incident_ets_wipeout:test_heir_handover() of
        {ok, 3, survived} ->
            #{id => <<"zero_data_loss_crash_survival">>, title => <<"Worker Crash Survival & ets:give_away/3 Restitution">>, status => <<"passed">>, time_ms => 35, details => <<"Worker killed mid-session; heir safely captured ETS table and gave away to new worker. 100 percent data preserved.">>};
        OtherSurvival ->
            #{id => <<"zero_data_loss_crash_survival">>, title => <<"Worker Crash Survival & ets:give_away/3 Restitution">>, status => <<"failed">>, time_ms => 35, details => list_to_binary(io_lib:format("Handover test failed: ~p", [OtherSurvival]))}
    end
catch C2:R2 ->
    #{id => <<"zero_data_loss_crash_survival">>, title => <<"Worker Crash Survival & ets:give_away/3 Restitution">>, status => <<"failed">>, time_ms => 35, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_HeirAudit, S2_SurvivalTest]
`, true

	// ── Incident #106 (Ch. 10): TCP Server OOM Flood & Dropped Lines ─────────
	case "ch10-l06":
		return `
CompileStage = case code:ensure_loaded(incident_tcp_active_true) of
    {module, incident_tcp_active_true} ->
        Exports = incident_tcp_active_true:module_info(exports),
        case lists:member({recommended_socket_opts, 0}, Exports) andalso lists:member({buffer_and_extract_lines, 2}, Exports) of
            true -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 10, details => <<"incident_tcp_active_true.erl compiled cleanly.">>};
            false -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 10, details => <<"Missing exports: recommended_socket_opts/0 or buffer_and_extract_lines/2">>}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_SocketOpts = try
    Opts = incident_tcp_active_true:recommended_socket_opts(),
    case lists:member({active, once}, Opts) andalso not lists:member({active, true}, Opts) of
        true -> #{id => <<"socket_backpressure_audit">>, title => <<"Socket Option Backpressure Audit ({active, once})">>, status => <<"passed">>, time_ms => 6, details => <<"Enforces {active, once} backpressure; rejected hazardous {active, true}.">>};
        false -> #{id => <<"socket_backpressure_audit">>, title => <<"Socket Option Backpressure Audit ({active, once})">>, status => <<"failed">>, time_ms => 6, details => list_to_binary(io_lib:format("Socket options lack {active, once}: ~p", [Opts]))}
    end
catch C_Opt:Err_Opt ->
    #{id => <<"socket_backpressure_audit">>, title => <<"Socket Option Backpressure Audit ({active, once})">>, status => <<"failed">>, time_ms => 6, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C_Opt, Err_Opt]))}
end,
S2_FramingAndUnpinning = try
    {ok, L1, Rem1} = incident_tcp_active_true:buffer_and_extract_lines(<<>>, <<"SET foo ">>),
    {ok, L2, Rem2} = incident_tcp_active_true:buffer_and_extract_lines(Rem1, <<"bar\r\nGET foo\r\nDE">>),
    {ok, L3, Rem3} = incident_tcp_active_true:buffer_and_extract_lines(Rem2, <<"L foo\r\n">>),
    AllLines = L1 ++ L2 ++ L3,
    ExpectedLines = [<<"SET foo bar">>, <<"GET foo">>, <<"DEL foo">>],
    case AllLines =:= ExpectedLines andalso Rem3 =:= <<>> of
        true -> #{id => <<"tcp_stream_framing_and_unpinning">>, title => <<"Fragmented TCP Stream Framing & Memory Unpinning">>, status => <<"passed">>, time_ms => 12, details => <<"Extracted 3 complete lines across fragmented TCP packets with unpinned remainder.">>};
        false -> #{id => <<"tcp_stream_framing_and_unpinning">>, title => <<"Fragmented TCP Stream Framing & Memory Unpinning">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Framing failed: Lines=~p, Rem=~p", [AllLines, Rem3]))}
    end
catch C_Frame:Err_Frame ->
    #{id => <<"tcp_stream_framing_and_unpinning">>, title => <<"Fragmented TCP Stream Framing & Memory Unpinning">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C_Frame, Err_Frame]))}
end,
Stages = [CompileStage, S1_SocketOpts, S2_FramingAndUnpinning]
`, true

	// ── Incident #107 (Ch. 11): XMPP Pre-Auth Injection & XML Escape ─────────
	case "ch11-l07":
		return `
CompileStage = case code:ensure_loaded(incident_xmpp_auth_bypass) of
    {module, incident_xmpp_auth_bypass} ->
        Exports = incident_xmpp_auth_bypass:module_info(exports),
        case lists:member({process_c2s_stanza, 3}, Exports) andalso lists:member({escape_xml_text, 1}, Exports) of
            true -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 10, details => <<"incident_xmpp_auth_bypass compiled cleanly.">>};
            false -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 10, details => <<"Missing exports: process_c2s_stanza/3 or escape_xml_text/1">>}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_PreAuthRejection = try
    State = #{jid => undefined},
    Msg = {chat_message, <<"victim@localhost">>, <<"Spoofed">>},
    Rej1 = incident_xmpp_auth_bypass:process_c2s_stanza(wait_for_stream, Msg, State),
    Rej2 = incident_xmpp_auth_bypass:process_c2s_stanza(wait_for_sasl, Msg, State),
    ExpectedRej = {reject, <<"<stream:error><not-authorized/></stream:error>">>, State},
    case Rej1 =:= ExpectedRej andalso Rej2 =:= ExpectedRej of
        true -> #{id => <<"pre_auth_rejection_boundary">>, title => <<"RFC 6120 Pre-Auth Stanza Rejection Boundary">>, status => <<"passed">>, time_ms => 8, details => <<"Pre-auth chat stanzas strictly rejected with <not-authorized/>. Zero auth bypass.">>};
        false -> #{id => <<"pre_auth_rejection_boundary">>, title => <<"RFC 6120 Pre-Auth Stanza Rejection Boundary">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Expected strict rejection, got: ~p, ~p", [Rej1, Rej2]))}
    end
catch C1:R1 ->
    #{id => <<"pre_auth_rejection_boundary">>, title => <<"RFC 6120 Pre-Auth Stanza Rejection Boundary">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
S2_XmlEscaping = try
    Dangerous = <<"Hello <script>alert('xss')</script> & 1 > 2">>,
    Escaped = incident_xmpp_auth_bypass:escape_xml_text(Dangerous),
    Expected = <<"Hello &lt;script&gt;alert('xss')&lt;/script&gt; &amp; 1 &gt; 2">>,
    StateAuth = #{jid => <<"alice@localhost">>},
    {route, <<"bob@localhost">>, StanzaXml, _} = incident_xmpp_auth_bypass:process_c2s_stanza(
        session_established,
        {chat_message, <<"bob@localhost">>, Dangerous},
        StateAuth
    ),
    case Escaped =:= Expected andalso binary:match(StanzaXml, Expected) =/= nomatch of
        true -> #{id => <<"xml_entity_sanitization">>, title => <<"XML Entity Sanitization & Tag Injection Protection">>, status => <<"passed">>, time_ms => 10, details => <<"All &, <, and > characters safely escaped. Zero raw XML tag injection.">>};
        false -> #{id => <<"xml_entity_sanitization">>, title => <<"XML Entity Sanitization & Tag Injection Protection">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Escaped output mismatch: ~s", [Escaped]))}
    end
catch C2:R2 ->
    #{id => <<"xml_entity_sanitization">>, title => <<"XML Entity Sanitization & Tag Injection Protection">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_PreAuthRejection, S2_XmlEscaping]
`, true

	default:
		return "", false
	}
}

package bridge

import (
	"fmt"
	"path/filepath"

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
    {ok, P1} = incident_mailbox_leak:start(),
    [P1 ! {legacy_heartbeat, os:system_time()} || _ <- lists:seq(1, 50)],
    ok = incident_mailbox_leak:record_metric(P1, 10),
    ok = incident_mailbox_leak:record_metric(P1, 20),
    [P1 ! {legacy_heartbeat, os:system_time()} || _ <- lists:seq(1, 50)],
    timer:sleep(30),
    Len1 = incident_mailbox_leak:inspect_queue_len(P1),
    {ok, Summary1} = incident_mailbox_leak:get_summary(P1),
    incident_mailbox_leak:stop(P1),
    Pair1 = {Len1, Summary1},
    Expected1 = {0, #{count => 2, total => 30}},
    #{call_str => <<"incident_mailbox_leak:start() + 100 heartbeats + metrics">>,
      expected => list_to_binary(lists:flatten(io_lib:format("~p", [Expected1]))),
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Pair1]))),
      passed => Pair1 =:= Expected1,
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"incident_mailbox_leak:start() + 100 heartbeats + metrics">>, expected => <<"{0, #{count => 2, total => 30}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    DeadPid = spawn(fun() -> ok end),
    timer:sleep(10),
    Res2 = incident_mailbox_leak:get_summary(DeadPid),
    #{call_str => <<"incident_mailbox_leak:get_summary(DeadPid)">>,
      expected => <<"{error, timeout}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Res2]))),
      passed => Res2 =:= {error, timeout},
      time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"incident_mailbox_leak:get_summary(DeadPid)">>, expected => <<"{error, timeout}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    {ok, P3} = incident_mailbox_leak:start(),
    ok = incident_mailbox_leak:record_metric(P3, 100),
    ok = incident_mailbox_leak:record_metric(P3, 250),
    {ok, Summary3} = incident_mailbox_leak:get_summary(P3),
    0 = incident_mailbox_leak:get_mailbox_len(P3),
    incident_mailbox_leak:stop(P3),
    Expected3 = #{count => 2, total => 350},
    #{call_str => <<"incident_mailbox_leak:get_mailbox_len(P) & metrics aggregation">>,
      expected => list_to_binary(lists:flatten(io_lib:format("~p", [Expected3]))),
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Summary3]))),
      passed => Summary3 =:= Expected3,
      time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"incident_mailbox_leak:get_mailbox_len(P) & metrics aggregation">>, expected => <<"#{count => 2, total => 350}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
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
    {ok, W1} = StartWorker(),
    Res1 = incident_hanging_call:call_pricing_worker(W1, widget_a),
    W1 ! stop,
    Passed1 = Res1 =:= {ok, 49.99},
    #{call_str => <<"incident_hanging_call:call_pricing_worker(W, widget_a)">>,
      expected => <<"{ok, 49.99}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Res1]))),
      passed => Passed1,
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"incident_hanging_call:call_pricing_worker(W, widget_a)">>, expected => <<"{ok, 49.99}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    {ok, W2} = StartWorker(),
    T_CrashStart = erlang:system_time(millisecond),
    CrashRes = incident_hanging_call:call_pricing_worker(W2, poison_item),
    Elapsed = erlang:system_time(millisecond) - T_CrashStart,
    Passed2 = case CrashRes of
        {error, {worker_down, badarith}} when Elapsed < 150 -> true;
        {error, {worker_down, _}} when Elapsed < 150 -> true;
        _ -> false
    end,
    #{call_str => <<"incident_hanging_call:call_pricing_worker(W, poison_item)">>,
      expected => <<"{error, {worker_down, badarith}}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [CrashRes]))),
      passed => Passed2,
      time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"incident_hanging_call:call_pricing_worker(W, poison_item)">>, expected => <<"{error, {worker_down, badarith}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
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
    AuditRes = incident_wrong_strategy:audit_flags(),
    Passed1 = (AuditRes =:= {ok, rest_for_one, [permanent, permanent, permanent]}),
    #{call_str => <<"incident_wrong_strategy:audit_flags()">>,
      expected => <<"{ok, rest_for_one, [permanent, permanent, permanent]}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [AuditRes]))),
      passed => Passed1,
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"incident_wrong_strategy:audit_flags()">>, expected => <<"{ok, rest_for_one, [permanent, permanent, permanent]}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    CascadeRes = incident_wrong_strategy:test_chaos_cascade(),
    Passed2 = (CascadeRes =:= {ok, db_unaffected, downstream_restarted}),
    #{call_str => <<"incident_wrong_strategy:test_chaos_cascade()">>,
      expected => <<"{ok, db_unaffected, downstream_restarted}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [CascadeRes]))),
      passed => Passed2,
      time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"incident_wrong_strategy:test_chaos_cascade()">>, expected => <<"{ok, db_unaffected, downstream_restarted}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── Incident #105 (Ch. 9): ETS Session Wipeout on Worker Crash ───────────
	case "ch09-l07":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    AuditRes = incident_ets_wipeout:audit_table_heir(),
    #{call_str => <<"incident_ets_wipeout:audit_table_heir()">>,
      expected => <<"{ok, heir_configured}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [AuditRes]))),
      passed => (AuditRes =:= {ok, heir_configured}),
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"incident_ets_wipeout:audit_table_heir()">>, expected => <<"{ok, heir_configured}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    HandoverRes = incident_ets_wipeout:test_heir_handover(),
    #{call_str => <<"incident_ets_wipeout:test_heir_handover()">>,
      expected => <<"{ok, 3, survived}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [HandoverRes]))),
      passed => (HandoverRes =:= {ok, 3, survived}),
      time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"incident_ets_wipeout:test_heir_handover()">>, expected => <<"{ok, 3, survived}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── Incident #106 (Ch. 10): TCP Server OOM Flood & Dropped Lines ─────────
	case "ch10-l06":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    AuditRes = incident_tcp_active_true:audit_socket_opts(),
    #{call_str => <<"incident_tcp_active_true:audit_socket_opts()">>,
      expected => <<"{ok, active_once_enforced}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [AuditRes]))),
      passed => (AuditRes =:= {ok, active_once_enforced}),
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"incident_tcp_active_true:audit_socket_opts()">>, expected => <<"{ok, active_once_enforced}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    FramingRes = incident_tcp_active_true:test_framing(),
    ExpFraming = {ok, [<<"PING">>, <<"PONG">>], <<"PARTIAL">>},
    #{call_str => <<"incident_tcp_active_true:test_framing()">>,
      expected => <<"{ok, [<<\"PING\">>, <<\"PONG\">>], <<\"PARTIAL\">>}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [FramingRes]))),
      passed => (FramingRes =:= ExpFraming),
      time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"incident_tcp_active_true:test_framing()">>, expected => <<"{ok, [<<\"PING\">>, <<\"PONG\">>], <<\"PARTIAL\">>}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── Incident #107 (Ch. 11): XMPP Pre-Auth Injection & XML Escape ─────────
	case "ch11-l07":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    RejectionRes = incident_xmpp_auth_bypass:test_pre_auth_rejection(),
    #{call_str => <<"incident_xmpp_auth_bypass:test_pre_auth_rejection()">>,
      expected => <<"{ok, pre_auth_rejected}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [RejectionRes]))),
      passed => (RejectionRes =:= {ok, pre_auth_rejected}),
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"incident_xmpp_auth_bypass:test_pre_auth_rejection()">>,
      expected => <<"{ok, pre_auth_rejected}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])),
      passed => false,
      time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    XmlRes = incident_xmpp_auth_bypass:test_xml_escaping(),
    ExpectedXml = {ok, <<"&lt;b&gt;Tom &amp; Jerry &gt; 1&lt;/b&gt;">>},
    #{call_str => <<"incident_xmpp_auth_bypass:test_xml_escaping()">>,
      expected => <<"{ok, <<\"&lt;b&gt;Tom &amp; Jerry &gt; 1&lt;/b&gt;\">>}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [XmlRes]))),
      passed => (XmlRes =:= ExpectedXml),
      time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"incident_xmpp_auth_bypass:test_xml_escaping()">>,
      expected => <<"{ok, <<\"&lt;b&gt;Tom &amp; Jerry &gt; 1&lt;/b&gt;\">>}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])),
      passed => false,
      time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
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
		wsDir := filepath.ToSlash(session.WorkspaceDir)
		return fmt.Sprintf(`
CompileStage_Leak = case code:ensure_loaded(incident_mailbox_leak) of
    {module, incident_mailbox_leak} ->
        Exports = incident_mailbox_leak:module_info(exports),
        Req = [{start, 0}, {record_metric, 2}, {get_summary, 1}, {inspect_queue_len, 1}, {get_mailbox_len, 1}, {stop, 1}, {loop, 1}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"incident_mailbox_leak.erl compiled cleanly; all telemetry and inspection functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E_L} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_L]))}
end,
S1_Ast_Leak = try
    SrcPath = filename:join(["%s", "src", "incident_mailbox_leak.erl"]),
    BeamPath = filename:join(["%s", "ebin", "incident_mailbox_leak.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        require_tail_recursion => [{loop, 1}],
        required_constructs => [receive_after],
        required_calls => [{erlang, process_info, 2}, {erlang, make_ref, 0}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_and_tco_invariants">>, title => <<"AST Analysis: Tail-Recursive loop/1, Correlation Ref & receive...after Guard">>, status => <<"passed">>, time_ms => 15, details => <<"Verified tail call optimization on loop/1, selective receive with make_ref/0, and receive...after 1000 timeout.">>};
        {error, Violations} ->
            #{id => <<"ast_and_tco_invariants">>, title => <<"AST Analysis: Tail-Recursive loop/1, Correlation Ref & receive...after Guard">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch CAst:RAst ->
    #{id => <<"ast_and_tco_invariants">>, title => <<"AST Analysis: Tail-Recursive loop/1, Correlation Ref & receive...after Guard">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [CAst, RAst]))}
end,
S2_Drain_Leak = try
    {ok, P} = incident_mailbox_leak:start(),
    [P ! {legacy_spam, I} || I <- lists:seq(1, 250)],
    ok = incident_mailbox_leak:record_metric(P, 10),
    ok = incident_mailbox_leak:record_metric(P, 20),
    ok = incident_mailbox_leak:record_metric(P, 30),
    ok = incident_mailbox_leak:record_metric(P, 40),
    ok = incident_mailbox_leak:record_metric(P, 50),
    [P ! {unhandled_event, I} || I <- lists:seq(1, 250)],
    timer:sleep(50),
    QLen1 = incident_mailbox_leak:inspect_queue_len(P),
    QLen2 = incident_mailbox_leak:get_mailbox_len(P),
    {ok, Summary} = incident_mailbox_leak:get_summary(P),
    incident_mailbox_leak:stop(P),
    ExpectedSummary = #{count => 5, total => 150},
    case {QLen1, QLen2, Summary} of
        {0, 0, ExpectedSummary} ->
            #{id => <<"unbounded_mailbox_leak_triage">>, title => <<"Unbounded Mailbox Leak Triage (500 Noise Messages Drained)">>, status => <<"passed">>, time_ms => 65, details => <<"Verified 500 unhandled messages were purged from Save Queue; mailbox length is 0; metrics aggregated accurately.">>};
        {L1, L2, _} when L1 > 0 orelse L2 > 0 ->
            #{id => <<"unbounded_mailbox_leak_triage">>, title => <<"Unbounded Mailbox Leak Triage (500 Noise Messages Drained)">>, status => <<"failed">>, time_ms => 65, details => list_to_binary(io_lib:format("Mailbox leak detected! inspect_queue_len=~p, get_mailbox_len=~p (expected 0). Missing catch-all clause in loop/1.", [L1, L2]))};
        {_, _, BadSummary} ->
            #{id => <<"unbounded_mailbox_leak_triage">>, title => <<"Unbounded Mailbox Leak Triage (500 Noise Messages Drained)">>, status => <<"failed">>, time_ms => 65, details => list_to_binary(io_lib:format("Metrics summary mismatch: got ~p, expected ~p", [BadSummary, ExpectedSummary]))}
    end
catch CDrain:RDrain ->
    #{id => <<"unbounded_mailbox_leak_triage">>, title => <<"Unbounded Mailbox Leak Triage (500 Noise Messages Drained)">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Triage Crash: ~p:~p", [CDrain, RDrain]))}
end,
S3_Timeout_Leak = begin
    ParentL = self(),
    DeadP = spawn(fun() -> ok end),
    timer:sleep(10),
    TesterDead = spawn(fun() ->
        ResDead = try incident_mailbox_leak:get_summary(DeadP) catch CDead:RDead -> {crash, CDead, RDead} end,
        ParentL ! {dead_test_res, ResDead}
    end),
    DeadRes = receive
        {dead_test_res, ValDead} -> ValDead
    after 1400 ->
        exit(TesterDead, kill),
        timeout_blocked
    end,
    HangP = spawn(fun() -> receive after 10000 -> ok end end),
    TesterHang = spawn(fun() ->
        ResHang = try incident_mailbox_leak:get_summary(HangP) catch CHang:RHang -> {crash, CHang, RHang} end,
        ParentL ! {hang_test_res, ResHang}
    end),
    HangRes = receive
        {hang_test_res, ValHang} -> ValHang
    after 1400 ->
        exit(TesterHang, kill),
        timeout_blocked
    end,
    exit(HangP, kill),
    case {DeadRes, HangRes} of
        {{error, timeout}, {error, timeout}} ->
            #{id => <<"client_call_timeout_guard">>, title => <<"Client Call Timeout Guard (Unresponsive/Dead Target)">>, status => <<"passed">>, time_ms => 1020, details => <<"Verified receive...after 1000 returned {error, timeout} cleanly against dead and unresponsive actors without hanging.">>};
        {timeout_blocked, _} ->
            #{id => <<"client_call_timeout_guard">>, title => <<"Client Call Timeout Guard (Unresponsive/Dead Target)">>, status => <<"failed">>, time_ms => 1400, details => <<"Client call to dead PID blocked indefinitely (>1400ms). Missing receive...after 1000 guard.">>};
        {_, timeout_blocked} ->
            #{id => <<"client_call_timeout_guard">>, title => <<"Client Call Timeout Guard (Unresponsive/Dead Target)">>, status => <<"failed">>, time_ms => 1400, details => <<"Client call to unresponsive PID blocked indefinitely (>1400ms). Missing receive...after 1000 guard.">>};
        {Other1, Other2} ->
            #{id => <<"client_call_timeout_guard">>, title => <<"Client Call Timeout Guard (Unresponsive/Dead Target)">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Expected {{error, timeout}, {error, timeout}}, got: {~p, ~p}", [Other1, Other2]))}
    end
end,
Stages = [CompileStage_Leak, S1_Ast_Leak, S2_Drain_Leak, S3_Timeout_Leak]
`, wsDir, wsDir), true

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
    Intensity = maps:get(intensity, SupFlags, 0),
    Period = maps:get(period, SupFlags, 0),
    Restarts = [maps:get(restart, Spec, undefined) || Spec <- ChildSpecs],
    AllPermanent = lists:all(fun(R) -> R =:= permanent end, Restarts),
    case Strategy =:= rest_for_one andalso Intensity >= 5 andalso Period =:= 10 andalso AllPermanent andalso length(ChildSpecs) =:= 3 of
        true -> #{id => <<"supervision_flags_audit">>, title => <<"rest_for_one Strategy & Permanent Restarts Audit">>, status => <<"passed">>, time_ms => 8, details => <<"Supervisor configured with strategy => rest_for_one, intensity >= 5, period => 10, and restart => permanent.">>};
        false -> #{id => <<"supervision_flags_audit">>, title => <<"rest_for_one Strategy & Permanent Restarts Audit">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Expected rest_for_one, intensity >= 5, period 10, and all permanent, got strategy: ~p, intensity: ~p, period: ~p, restarts: ~p", [Strategy, Intensity, Period, Restarts]))}
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
S1_Ast = try
    BeamPath = code:which(incident_tcp_active_true),
    WsRoot = filename:dirname(filename:dirname(BeamPath)),
    SrcPath = filename:join([WsRoot, "src", "incident_tcp_active_true.erl"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        require_tail_recursion => [{extract_lines, 2}],
        required_remote_calls => [{binary, split, 2}, {binary, copy, 1}],
        required_constructs => [bit_syntax]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} -> #{id => <<"ast_unpinning_tco">>, title => <<"AST & TCO Audit: binary:split/2, binary:copy/1 & extract_lines/2">>, status => <<"passed">>, time_ms => 10, details => <<"Verified binary:split/2, binary:copy/1, bit_syntax, and tail-recursive extract_lines/2.">>};
        {error, AstViol} -> #{id => <<"ast_unpinning_tco">>, title => <<"AST & TCO Audit: binary:split/2, binary:copy/1 & extract_lines/2">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Violations: ~p", [AstViol]))}
    end
catch C_Ast:R_Ast ->
    #{id => <<"ast_unpinning_tco">>, title => <<"AST & TCO Audit: binary:split/2, binary:copy/1 & extract_lines/2">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C_Ast, R_Ast]))}
end,
S2_SocketOpts = try
    Opts = incident_tcp_active_true:recommended_socket_opts(),
    case lists:member({active, once}, Opts) andalso not lists:member({active, true}, Opts) of
        true -> #{id => <<"socket_backpressure_audit">>, title => <<"Socket Option Backpressure Audit ({active, once})">>, status => <<"passed">>, time_ms => 6, details => <<"Enforces {active, once} backpressure; rejected hazardous {active, true}.">>};
        false -> #{id => <<"socket_backpressure_audit">>, title => <<"Socket Option Backpressure Audit ({active, once})">>, status => <<"failed">>, time_ms => 6, details => list_to_binary(io_lib:format("Socket options lack {active, once}: ~p", [Opts]))}
    end
catch C_Opt:Err_Opt ->
    #{id => <<"socket_backpressure_audit">>, title => <<"Socket Option Backpressure Audit ({active, once})">>, status => <<"failed">>, time_ms => 6, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C_Opt, Err_Opt]))}
end,
S3_FramingAndUnpinning = try
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
Stages = [CompileStage, S1_Ast, S2_SocketOpts, S3_FramingAndUnpinning]
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
S1_Ast = try
    BeamPath = code:which(incident_xmpp_auth_bypass),
    WsRoot = filename:dirname(filename:dirname(BeamPath)),
    SrcPath = filename:join([WsRoot, "src", "incident_xmpp_auth_bypass.erl"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_constructs => [bit_syntax]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} -> #{id => <<"ast_bit_syntax_audit">>, title => <<"AST Audit: Bit-Syntax Binary Scanning & XML Framing">>, status => <<"passed">>, time_ms => 10, details => <<"Verified bit_syntax binary scanning/construction in incident_xmpp_auth_bypass.erl.">>};
        {error, AstViol} -> #{id => <<"ast_bit_syntax_audit">>, title => <<"AST Audit: Bit-Syntax Binary Scanning & XML Framing">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Violations: ~p", [AstViol]))}
    end
catch C_Ast:R_Ast ->
    #{id => <<"ast_bit_syntax_audit">>, title => <<"AST Audit: Bit-Syntax Binary Scanning & XML Framing">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C_Ast, R_Ast]))}
end,
S2_PreAuthRejection = try
    State = #{jid => undefined},
    Msg = {chat_message, <<"victim@localhost">>, <<"Spoofed">>},
    Rej1 = incident_xmpp_auth_bypass:process_c2s_stanza(wait_for_stream, Msg, State),
    Rej2 = incident_xmpp_auth_bypass:process_c2s_stanza(wait_for_sasl, Msg, State),
    Rej3 = incident_xmpp_auth_bypass:process_c2s_stanza(resource_bind, Msg, State),
    ExpectedRej = {reject, <<"<stream:error><not-authorized/></stream:error>">>, State},
    case Rej1 =:= ExpectedRej andalso Rej2 =:= ExpectedRej andalso Rej3 =:= ExpectedRej of
        true -> #{id => <<"pre_auth_rejection_boundary">>, title => <<"RFC 6120 Pre-Auth Stanza Rejection Boundary">>, status => <<"passed">>, time_ms => 8, details => <<"Pre-auth and non-established chat stanzas strictly rejected fail-closed with <not-authorized/>.">>};
        false -> #{id => <<"pre_auth_rejection_boundary">>, title => <<"RFC 6120 Pre-Auth Stanza Rejection Boundary">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Expected strict rejection, got: ~p, ~p, ~p", [Rej1, Rej2, Rej3]))}
    end
catch C1:R1 ->
    #{id => <<"pre_auth_rejection_boundary">>, title => <<"RFC 6120 Pre-Auth Stanza Rejection Boundary">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
S3_XmlEscaping = try
    Dangerous = <<"Hello <script>alert('xss')</script> & 1 > 2">>,
    Escaped = incident_xmpp_auth_bypass:escape_xml_text(Dangerous),
    Expected = <<"Hello &lt;script&gt;alert('xss')&lt;/script&gt; &amp; 1 &gt; 2">>,
    StateAuth = #{jid => <<"alice@localhost">>},
    {route, <<"bob@localhost">>, StanzaXml, _} = incident_xmpp_auth_bypass:process_c2s_stanza(
        session_established,
        {chat_message, <<"bob@localhost">>, Dangerous},
        StateAuth
    ),
    {route, <<"bob@localhost">>, FallbackXml, _} = incident_xmpp_auth_bypass:process_c2s_stanza(
        session_established,
        {chat_message, <<"bob@localhost">>, <<"ok & fine">>},
        #{}
    ),
    HasDefaultFrom = binary:match(FallbackXml, <<"from='system@localhost'">>) =/= nomatch,
    HasEscapedFallback = binary:match(FallbackXml, <<"<body>ok &amp; fine</body>">>) =/= nomatch,
    case Escaped =:= Expected andalso binary:match(StanzaXml, Expected) =/= nomatch andalso HasDefaultFrom andalso HasEscapedFallback of
        true -> #{id => <<"xml_entity_sanitization">>, title => <<"XML Entity Sanitization & Tag Injection Protection">>, status => <<"passed">>, time_ms => 10, details => <<"All &, <, and > characters safely escaped in single pass. Zero raw XML tag injection.">>};
        false -> #{id => <<"xml_entity_sanitization">>, title => <<"XML Entity Sanitization & Tag Injection Protection">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Escaped output mismatch: ~s | ~s", [Escaped, FallbackXml]))}
    end
catch C2:R2 ->
    #{id => <<"xml_entity_sanitization">>, title => <<"XML Entity Sanitization & Tag Injection Protection">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_Ast, S2_PreAuthRejection, S3_XmlEscaping]
`, true

	default:
		return "", false
	}
}

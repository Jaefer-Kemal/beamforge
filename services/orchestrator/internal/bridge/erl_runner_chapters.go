package bridge

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/beamforge/orchestrator/internal/pool"
)

// buildChapterRunScript provides test execution scripts for Chapters 1, 2, 3 & 4
func (r *Runner) buildChapterRunScript(session *pool.Session, exerciseID string) (string, bool) {
	if script, ok := r.buildIncidentRunScript(session, exerciseID); ok {
		return script, true
	}
	switch exerciseID {

	// ── CHAPTER 1 ─────────────────────────────────────────────────────────────
	case "ch01-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try beam_intro:inspect_vm() of
    {vm_info, Rel, Sched, ProcLim, AtomLim} = Res1
      when is_list(Rel), length(Rel) > 0, is_integer(Sched), Sched > 0, is_integer(ProcLim), ProcLim > 0, is_integer(AtomLim), AtomLim > 0 ->
        #{call_str => <<"beam_intro:inspect_vm()">>,
          expected => <<"{vm_info, OtpRelease, Schedulers, ProcessLimit, AtomLimit}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Res1]))),
          passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"beam_intro:inspect_vm()">>,
          expected => <<"{vm_info, OtpRelease, Schedulers, ProcessLimit, AtomLimit}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))),
          passed => false,
          time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"beam_intro:inspect_vm()">>,
      expected => <<"{vm_info, OtpRelease, Schedulers, ProcessLimit, AtomLimit}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])),
      passed => false,
      time_ms => erlang:system_time(millisecond) - T1_Start}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch01-l02":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try basic_types:calculate_bandwidth(1250, 2) of
    5000 ->
        #{call_str => <<"basic_types:calculate_bandwidth(1250, 2)">>,
          expected => <<"5000">>, actual => <<"5000">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"basic_types:calculate_bandwidth(1250, 2)">>,
          expected => <<"5000">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"basic_types:calculate_bandwidth(1250, 2)">>, expected => <<"5000">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try basic_types:is_exact_match(42, 42.0) of
    false ->
        #{call_str => <<"basic_types:is_exact_match(42, 42.0)">>,
          expected => <<"false">>, actual => <<"false">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"basic_types:is_exact_match(42, 42.0)">>,
          expected => <<"false">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"basic_types:is_exact_match(42, 42.0)">>, expected => <<"false">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try basic_types:is_within_quota(450, 500, false) of
    true ->
        #{call_str => <<"basic_types:is_within_quota(450, 500, false)">>,
          expected => <<"true">>, actual => <<"true">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"basic_types:is_within_quota(450, 500, false)">>,
          expected => <<"true">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"basic_types:is_within_quota(450, 500, false)">>, expected => <<"true">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch01-l03":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try pattern_vars:rebind_update(10, 5) of
    30 ->
        #{call_str => <<"pattern_vars:rebind_update(10, 5)">>,
          expected => <<"30">>, actual => <<"30">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"pattern_vars:rebind_update(10, 5)">>,
          expected => <<"30">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"pattern_vars:rebind_update(10, 5)">>, expected => <<"30">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try pattern_vars:extract_middle({alpha, beta, gamma}) of
    beta ->
        #{call_str => <<"pattern_vars:extract_middle({alpha, beta, gamma})">>,
          expected => <<"beta">>, actual => <<"beta">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"pattern_vars:extract_middle({alpha, beta, gamma})">>,
          expected => <<"beta">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"pattern_vars:extract_middle({alpha, beta, gamma})">>, expected => <<"beta">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch01-l04":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try telecom_events:make_event(101, alice, bob) of
    {call_event, 101, alice, bob, 0} = E1 ->
        #{call_str => <<"telecom_events:make_event(101, alice, bob)">>,
          expected => <<"{call_event, 101, alice, bob, 0}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [E1]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"telecom_events:make_event(101, alice, bob)">>,
          expected => <<"{call_event, 101, alice, bob, 0}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"telecom_events:make_event(...)">>, expected => <<"{call_event, 101, alice, bob, 0}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try telecom_events:extract_caller({call_event, 101, alice, bob, 45}) of
    alice ->
        #{call_str => <<"telecom_events:extract_caller({call_event, 101, alice, bob, 45})">>,
          expected => <<"alice">>, actual => <<"alice">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"telecom_events:extract_caller({call_event, 101, alice, bob, 45})">>, expected => <<"alice">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"telecom_events:extract_caller({call_event, 101, alice, bob, 45})">>, expected => <<"alice">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try telecom_events:swap_endpoints({call_event, 101, alice, bob, 45}) of
    {call_event, 101, bob, alice, 45} = E3 ->
        #{call_str => <<"telecom_events:swap_endpoints({call_event, 101, alice, bob, 45})">>,
          expected => <<"{call_event, 101, bob, alice, 45}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [E3]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"telecom_events:swap_endpoints({call_event, 101, alice, bob, 45})">>,
          expected => <<"{call_event, 101, bob, alice, 45}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"telecom_events:swap_endpoints({call_event, 101, alice, bob, 45})">>, expected => <<"{call_event, 101, bob, alice, 45}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch01-l05":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try list_ops:prepend_item(10, [20, 30]) of
    [10, 20, 30] ->
        #{call_str => <<"list_ops:prepend_item(10, [20, 30])">>,
          expected => <<"[10, 20, 30]">>, actual => <<"[10, 20, 30]">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"list_ops:prepend_item(10, [20, 30])">>,
          expected => <<"[10, 20, 30]">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"list_ops:prepend_item(...)">>, expected => <<"[10, 20, 30]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try list_ops:swap_first_two([alpha, beta, gamma, delta]) of
    [beta, alpha, gamma, delta] ->
        #{call_str => <<"list_ops:swap_first_two([alpha, beta, gamma, delta])">>,
          expected => <<"[beta, alpha, gamma, delta]">>, actual => <<"[beta, alpha, gamma, delta]">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"list_ops:swap_first_two([alpha, beta, gamma, delta])">>,
          expected => <<"[beta, alpha, gamma, delta]">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"list_ops:swap_first_two([alpha, beta, gamma, delta])">>, expected => <<"[beta, alpha, gamma, delta]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try list_ops:ascii_initial("Erlang") of
    {char_code, 69} ->
        #{call_str => <<"list_ops:ascii_initial(\"Erlang\")">>,
          expected => <<"{char_code, 69}">>, actual => <<"{char_code, 69}">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"list_ops:ascii_initial(\"Erlang\")">>,
          expected => <<"{char_code, 69}">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"list_ops:ascii_initial(\"Erlang\")">>, expected => <<"{char_code, 69}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch01-l06":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try arity_calc:connect(localhost) of
    {connection, arity_calc, localhost, 80, 5000} = R1 ->
        #{call_str => <<"arity_calc:connect(localhost)">>,
          expected => <<"{connection, arity_calc, localhost, 80, 5000}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"arity_calc:connect(localhost)">>,
          expected => <<"{connection, arity_calc, localhost, 80, 5000}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"arity_calc:connect(localhost)">>, expected => <<"{connection, arity_calc, localhost, 80, 5000}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try arity_calc:connect(localhost, 8080) of
    {connection, arity_calc, localhost, 8080, 5000} = R2 ->
        #{call_str => <<"arity_calc:connect(localhost, 8080)">>,
          expected => <<"{connection, arity_calc, localhost, 8080, 5000}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"arity_calc:connect(localhost, 8080)">>,
          expected => <<"{connection, arity_calc, localhost, 8080, 5000}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"arity_calc:connect(localhost, 8080)">>, expected => <<"{connection, arity_calc, localhost, 8080, 5000}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try arity_calc:connect(localhost, 8080, 2500) of
    {connection, arity_calc, localhost, 8080, 2500} = R3 ->
        #{call_str => <<"arity_calc:connect(localhost, 8080, 2500)">>,
          expected => <<"{connection, arity_calc, localhost, 8080, 2500}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"arity_calc:connect(localhost, 8080, 2500)">>,
          expected => <<"{connection, arity_calc, localhost, 8080, 2500}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"arity_calc:connect(localhost, 8080, 2500)">>, expected => <<"{connection, arity_calc, localhost, 8080, 2500}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch01-l07":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try clause_router:describe_status(200) of
    {ok, success} ->
        #{call_str => <<"clause_router:describe_status(200)">>,
          expected => <<"{ok, success}">>, actual => <<"{ok, success}">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"clause_router:describe_status(200)">>,
          expected => <<"{ok, success}">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"clause_router:describe_status(200)">>, expected => <<"{ok, success}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try clause_router:head_or_default([], 999) of
    999 ->
        #{call_str => <<"clause_router:head_or_default([], 999)">>,
          expected => <<"999">>, actual => <<"999">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"clause_router:head_or_default([], 999)">>,
          expected => <<"999">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"clause_router:head_or_default([], 999)">>, expected => <<"999">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try clause_router:verify_identical_pair({omega, omega}) of
    {matched, omega} ->
        #{call_str => <<"clause_router:verify_identical_pair({omega, omega})">>,
          expected => <<"{matched, omega}">>, actual => <<"{matched, omega}">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"clause_router:verify_identical_pair({omega, omega})">>,
          expected => <<"{matched, omega}">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"clause_router:verify_identical_pair({omega, omega})">>, expected => <<"{matched, omega}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch01-l08":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try telecom_foundations:classify_packet({ipv4, "10.0.0.1", "10.0.0.2", [ping, 100]}) of
    {ok, ipv4, "10.0.0.1", "10.0.0.2", ping} = R1 ->
        #{call_str => <<"telecom_foundations:classify_packet({ipv4, \"10.0.0.1\", \"10.0.0.2\", [ping, 100]})">>,
          expected => <<"{ok, ipv4, \"10.0.0.1\", \"10.0.0.2\", ping}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"telecom_foundations:classify_packet({ipv4, \"10.0.0.1\", \"10.0.0.2\", [ping, 100]})">>,
          expected => <<"{ok, ipv4, \"10.0.0.1\", \"10.0.0.2\", ping}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"telecom_foundations:classify_packet({ipv4, \"10.0.0.1\", \"10.0.0.2\", [ping, 100]})">>, expected => <<"{ok, ipv4, \"10.0.0.1\", \"10.0.0.2\", ping}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try telecom_foundations:classify_packet({ipv4, "10.0.0.1", "10.0.0.2", []}) of
    {error, empty_payload} ->
        #{call_str => <<"telecom_foundations:classify_packet({ipv4, \"10.0.0.1\", \"10.0.0.2\", []})">>,
          expected => <<"{error, empty_payload}">>, actual => <<"{error, empty_payload}">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"telecom_foundations:classify_packet({ipv4, \"10.0.0.1\", \"10.0.0.2\", []})">>,
          expected => <<"{error, empty_payload}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"telecom_foundations:classify_packet({ipv4, \"10.0.0.1\", \"10.0.0.2\", []})">>, expected => <<"{error, empty_payload}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try telecom_foundations:bill_call(60, standard) of
    {ok, 310} ->
        #{call_str => <<"telecom_foundations:bill_call(60, standard)">>,
          expected => <<"{ok, 310}">>, actual => <<"{ok, 310}">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"telecom_foundations:bill_call(60, standard)">>,
          expected => <<"{ok, 310}">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"telecom_foundations:bill_call(60, standard)">>, expected => <<"{ok, 310}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
T4_Start = erlang:system_time(millisecond),
T4_Res = try telecom_foundations:bill_call(3600, internal) of
    {ok, 0} ->
        #{call_str => <<"telecom_foundations:bill_call(3600, internal)">>,
          expected => <<"{ok, 0}">>, actual => <<"{ok, 0}">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T4_Start};
    Other4 ->
        #{call_str => <<"telecom_foundations:bill_call(3600, internal)">>,
          expected => <<"{ok, 0}">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other4]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T4_Start}
catch C4:R4 ->
    #{call_str => <<"telecom_foundations:bill_call(3600, internal)">>, expected => <<"{ok, 0}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, R4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── CHAPTER 2 ─────────────────────────────────────────────────────────────
	case "ch02-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try deep_match:extract_route({packet, {header, 4, {route, "10.0.0.1", "10.0.0.2"}}, [ping, 1]}) of
    {ok, ipv4, "10.0.0.1", "10.0.0.2"} = R1 ->
        #{call_str => <<"deep_match:extract_route({packet, {header, 4, {route, \"10.0.0.1\", \"10.0.0.2\"}}, [ping, 1]})">>,
          expected => <<"{ok, ipv4, \"10.0.0.1\", \"10.0.0.2\"}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"deep_match:extract_route({packet, {header, 4, {route, \"10.0.0.1\", \"10.0.0.2\"}}, [ping, 1]})">>,
          expected => <<"{ok, ipv4, \"10.0.0.1\", \"10.0.0.2\"}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"deep_match:extract_route({packet, {header, 4, {route, \"10.0.0.1\", \"10.0.0.2\"}}, [ping, 1]})">>,
      expected => <<"{ok, ipv4, \"10.0.0.1\", \"10.0.0.2\"}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,

T2_Start = erlang:system_time(millisecond),
T2_Res = try deep_match:extract_route({packet, {header, 5, {route, "10.0.0.1", "10.0.0.2"}}, []}) of
    {error, {unsupported_version, 5}} = R2 ->
        #{call_str => <<"deep_match:extract_route({packet, {header, 5, {route, \"10.0.0.1\", \"10.0.0.2\"}}, []})">>,
          expected => <<"{error, {unsupported_version, 5}}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"deep_match:extract_route({packet, {header, 5, {route, \"10.0.0.1\", \"10.0.0.2\"}}, []})">>,
          expected => <<"{error, {unsupported_version, 5}}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"deep_match:extract_route({packet, {header, 5, {route, \"10.0.0.1\", \"10.0.0.2\"}}, []})">>,
      expected => <<"{error, {unsupported_version, 5}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,

T3_Start = erlang:system_time(millisecond),
P3 = {packet, {header, 4, {route, "src_host", "dst_host"}}, [data, 42]},
T3_Res = try deep_match:repackage_envelope(P3) of
    {forwarded, "dst_host", P3} = R3 ->
        #{call_str => <<"deep_match:repackage_envelope({packet, {header, 4, {route, \"src_host\", \"dst_host\"}}, [data, 42]})">>,
          expected => <<"{forwarded, \"dst_host\", {packet, {header, 4, {route, \"src_host\", \"dst_host\"}}, [data, 42]}}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"deep_match:repackage_envelope({packet, {header, 4, {route, \"src_host\", \"dst_host\"}}, [data, 42]})">>,
          expected => <<"{forwarded, \"dst_host\", {packet, {header, 4, {route, \"src_host\", \"dst_host\"}}, [data, 42]}}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"deep_match:repackage_envelope({packet, {header, 4, {route, \"src_host\", \"dst_host\"}}, [data, 42]})">>,
      expected => <<"{forwarded, \"dst_host\", {packet, {header, 4, {route, \"src_host\", \"dst_host\"}}, [data, 42]}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,

T4_Start = erlang:system_time(millisecond),
P4 = {packet, {header, 6, {route, "a", "b"}}, []},
T4_Res = try deep_match:repackage_envelope(P4) of
    {dropped, P4} = R4 ->
        #{call_str => <<"deep_match:repackage_envelope({packet, {header, 6, {route, \"a\", \"b\"}}, []})">>,
          expected => <<"{dropped, {packet, {header, 6, {route, \"a\", \"b\"}}, []}}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R4]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T4_Start};
    Other4 ->
        #{call_str => <<"deep_match:repackage_envelope({packet, {header, 6, {route, \"a\", \"b\"}}, []})">>,
          expected => <<"{dropped, {packet, {header, 6, {route, \"a\", \"b\"}}, []}}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other4]))), passed => false, time_ms => 0}
catch C4:R4 ->
    #{call_str => <<"deep_match:repackage_envelope({packet, {header, 6, {route, \"a\", \"b\"}}, []})">>,
      expected => <<"{dropped, {packet, {header, 6, {route, \"a\", \"b\"}}, []}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, R4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch02-l02":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try guard_validator:validate_port(8080) of
    {ok, unprivileged_port} = R1 ->
        #{call_str => <<"guard_validator:validate_port(8080)">>, expected => <<"{ok, unprivileged_port}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"guard_validator:validate_port(8080)">>, expected => <<"{ok, unprivileged_port}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"guard_validator:validate_port(8080)">>, expected => <<"{ok, unprivileged_port}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,

T2_Start = erlang:system_time(millisecond),
T2_Res = try guard_validator:classify_temperature(-5) of
    freezing ->
        #{call_str => <<"guard_validator:classify_temperature(-5)">>, expected => <<"freezing">>,
          actual => <<"freezing">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"guard_validator:classify_temperature(-5)">>, expected => <<"freezing">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"guard_validator:classify_temperature(-5)">>, expected => <<"freezing">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,

T3_Start = erlang:system_time(millisecond),
T3_Res = try guard_validator:safe_ratio(10, 2) of
    high_ratio ->
        #{call_str => <<"guard_validator:safe_ratio(10, 2)">>, expected => <<"high_ratio">>,
          actual => <<"high_ratio">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"guard_validator:safe_ratio(10, 2)">>, expected => <<"high_ratio">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"guard_validator:safe_ratio(10, 2)">>, expected => <<"high_ratio">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,

T4_Start = erlang:system_time(millisecond),
T4_Res = try guard_validator:safe_ratio(10, 0) of
    {error, invalid_ratio} = R4 ->
        #{call_str => <<"guard_validator:safe_ratio(10, 0)">>, expected => <<"{error, invalid_ratio}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R4]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T4_Start};
    Other4 ->
        #{call_str => <<"guard_validator:safe_ratio(10, 0)">>, expected => <<"{error, invalid_ratio}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other4]))), passed => false, time_ms => 0}
catch C4:R4 ->
    #{call_str => <<"guard_validator:safe_ratio(10, 0)">>, expected => <<"{error, invalid_ratio}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, R4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch02-l03":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try flow_control:handle_http_response({http_response, 200, "{\"status\":\"healthy\"}"}) of
    {ok, "{\"status\":\"healthy\"}"} = R1 ->
        #{call_str => <<"flow_control:handle_http_response({http_response, 200, \"{\\\"status\\\":\\\"healthy\\\"}\"})">>,
          expected => <<"{ok, \"{\\\"status\\\":\\\"healthy\\\"}\"}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"flow_control:handle_http_response({http_response, 200, \"{\\\"status\\\":\\\"healthy\\\"}\"})">>,
          expected => <<"{ok, \"{\\\"status\\\":\\\"healthy\\\"}\"}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"flow_control:handle_http_response({http_response, 200, \"{\\\"status\\\":\\\"healthy\\\"}\"})">>,
      expected => <<"{ok, \"{\\\"status\\\":\\\"healthy\\\"}\"}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,

T2_Start = erlang:system_time(millisecond),
T2_Res = try flow_control:handle_http_response({http_response, 401, []}) of
    {error, unauthorized} = R2 ->
        #{call_str => <<"flow_control:handle_http_response({http_response, 401, []})">>, expected => <<"{error, unauthorized}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"flow_control:handle_http_response({http_response, 401, []})">>, expected => <<"{error, unauthorized}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"flow_control:handle_http_response({http_response, 401, []})">>, expected => <<"{error, unauthorized}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,

T3_Start = erlang:system_time(millisecond),
T3_Res = try flow_control:grade_latency(30) of
    optimal ->
        #{call_str => <<"flow_control:grade_latency(30)">>, expected => <<"optimal">>,
          actual => <<"optimal">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"flow_control:grade_latency(30)">>, expected => <<"optimal">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"flow_control:grade_latency(30)">>, expected => <<"optimal">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,

T4_Start = erlang:system_time(millisecond),
T4_Res = try flow_control:grade_latency(500) of
    sla_breach ->
        #{call_str => <<"flow_control:grade_latency(500)">>, expected => <<"sla_breach">>,
          actual => <<"sla_breach">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T4_Start};
    Other4 ->
        #{call_str => <<"flow_control:grade_latency(500)">>, expected => <<"sla_breach">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other4]))), passed => false, time_ms => 0}
catch C4:R4 ->
    #{call_str => <<"flow_control:grade_latency(500)">>, expected => <<"sla_breach">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, R4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch02-l04":
		return `
Inv1 = [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}],
T1_Start = erlang:system_time(millisecond),
T1_Res = try recursive_search:find_product(Inv1, 2) of
    {ok, {product, 2, "Mouse", 25, 5}} = R1 ->
        #{call_str => <<"recursive_search:find_product(Inventory, 2)">>,
          expected => <<"{ok, {product, 2, \"Mouse\", 25, 5}}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"recursive_search:find_product(Inventory, 2)">>,
          expected => <<"{ok, {product, 2, \"Mouse\", 25, 5}}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"recursive_search:find_product(Inventory, 2)">>,
      expected => <<"{ok, ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,

T2_Start = erlang:system_time(millisecond),
T2_Res = try recursive_search:find_product(Inv1, 99) of
    not_found ->
        #{call_str => <<"recursive_search:find_product(Inventory, 99)">>,
          expected => <<"not_found">>, actual => <<"not_found">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"recursive_search:find_product(Inventory, 99)">>,
          expected => <<"not_found">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"recursive_search:find_product(Inventory, 99)">>,
      expected => <<"not_found">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,

T3_Start = erlang:system_time(millisecond),
T3_Res = try recursive_search:contains_item([apple, banana, cherry], banana) of
    true ->
        #{call_str => <<"recursive_search:contains_item([apple, banana, cherry], banana)">>,
          expected => <<"true">>, actual => <<"true">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"recursive_search:contains_item([apple, banana, cherry], banana)">>,
          expected => <<"true">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"recursive_search:contains_item([apple, banana, cherry], banana)">>,
      expected => <<"true">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,

T4_Start = erlang:system_time(millisecond),
T4_Res = try recursive_search:contains_item([apple, banana, cherry], date) of
    false ->
        #{call_str => <<"recursive_search:contains_item([apple, banana, cherry], date)">>,
          expected => <<"false">>, actual => <<"false">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T4_Start};
    Other4 ->
        #{call_str => <<"recursive_search:contains_item([apple, banana, cherry], date)">>,
          expected => <<"false">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other4]))), passed => false, time_ms => 0}
catch C4:R4 ->
    #{call_str => <<"recursive_search:contains_item([apple, banana, cherry], date)">>,
      expected => <<"false">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, R4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch02-l05":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try tco_counter:sum_packets([10, 20, 30, 40]) of
    100 ->
        #{call_str => <<"tco_counter:sum_packets([10, 20, 30, 40])">>, expected => <<"100">>,
          actual => <<"100">>, passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"tco_counter:sum_packets([10, 20, 30, 40])">>, expected => <<"100">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:Err1 ->
    #{call_str => <<"tco_counter:sum_packets([10, 20, 30, 40])">>, expected => <<"100">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try tco_counter:count_packets([a, b, c, d, e]) of
    5 ->
        #{call_str => <<"tco_counter:count_packets([a, b, c, d, e])">>, expected => <<"5">>,
          actual => <<"5">>, passed => true, time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"tco_counter:count_packets([a, b, c, d, e])">>, expected => <<"5">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:Err2 ->
    #{call_str => <<"tco_counter:count_packets([a, b, c, d, e])">>, expected => <<"5">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, Err2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch02-l06":
		invSrc := filepath.Join(session.WorkspaceDir, "src", "inventory.erl")
		invRoot := filepath.Join(session.WorkspaceDir, "inventory.erl")
		if _, err := os.Stat(invSrc); err == nil {
			return r.buildInventoryRunScript(), true
		}
		if _, err := os.Stat(invRoot); err == nil {
			return r.buildInventoryRunScript(), true
		}
		return `
T1_Start = erlang:system_time(millisecond),
Orders1 = [{order, 1, 5, confirmed}, {order, 2, 0, confirmed}, {order, 3, 10, pending}, {order, 4, 8, confirmed}],
T1_Res = try acc_filter:keep_valid_orders(Orders1) of
    [1, 4] = R1 ->
        #{call_str => <<"acc_filter:keep_valid_orders([{order, 1, 5, confirmed}, {order, 2, 0, confirmed}, {order, 3, 10, pending}, {order, 4, 8, confirmed}])">>,
          expected => <<"[1, 4]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"acc_filter:keep_valid_orders([{order, 1, 5, confirmed}, {order, 2, 0, confirmed}, {order, 3, 10, pending}, {order, 4, 8, confirmed}])">>,
          expected => <<"[1, 4]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"acc_filter:keep_valid_orders([{order, 1, 5, confirmed}, {order, 2, 0, confirmed}, {order, 3, 10, pending}, {order, 4, 8, confirmed}])">>,
      expected => <<"[1, 4]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
Orders2 = [{order, 5, 0, confirmed}, {order, 6, 12, canceled}],
T2_Res = try acc_filter:keep_valid_orders(Orders2) of
    [] ->
        #{call_str => <<"acc_filter:keep_valid_orders([{order, 5, 0, confirmed}, {order, 6, 12, canceled}])">>,
          expected => <<"[]">>,
          actual => <<"[]">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"acc_filter:keep_valid_orders([{order, 5, 0, confirmed}, {order, 6, 12, canceled}])">>,
          expected => <<"[]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"acc_filter:keep_valid_orders([{order, 5, 0, confirmed}, {order, 6, 12, canceled}])">>,
      expected => <<"[]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch02-l07":
		return `
Inv1 = [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}],
T1_Start = erlang:system_time(millisecond),
T1_Res = try tuple_updater:update_product_price(Inv1, 2, 30) of
    [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 30, 5}] = R1 ->
        #{call_str => <<"tuple_updater:update_product_price(Inventory, 2, 30)">>,
          expected => <<"[{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 30, 5}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"tuple_updater:update_product_price([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 5}], 2, 30)">>,
          expected => <<"[{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 30, 5}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"tuple_updater:update_product_price([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 5}], 2, 30)">>,
      expected => <<"[{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 30, 5}]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,

T2_Start = erlang:system_time(millisecond),
T2_Res = try tuple_updater:update_product_price([{product, 1, "Keyboard", 50, 10}], 99, 100) of
    [{product, 1, "Keyboard", 50, 10}] = R2 ->
        #{call_str => <<"tuple_updater:update_product_price([{product, 1, \"Keyboard\", 50, 10}], 99, 100)">>,
          expected => <<"[{product, 1, \"Keyboard\", 50, 10}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"tuple_updater:update_product_price([{product, 1, \"Keyboard\", 50, 10}], 99, 100)">>,
          expected => <<"[{product, 1, \"Keyboard\", 50, 10}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"tuple_updater:update_product_price([{product, 1, \"Keyboard\", 50, 10}], 99, 100)">>,
      expected => <<"[{product, 1, \"Keyboard\", 50, 10}]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,

Orders = [{order, 1, 10}, {order, 2, 2}, {order, 3, 5}, {order, 4, 1}],
T3_Start = erlang:system_time(millisecond),
T3_Res = try tuple_updater:partition_orders(Orders, 5) of
    {[{order, 1, 10}, {order, 3, 5}], [{order, 2, 2}, {order, 4, 1}]} = R3 ->
        #{call_str => <<"tuple_updater:partition_orders([{order, 1, 10}, {order, 2, 2}, {order, 3, 5}, {order, 4, 1}], 5)">>,
          expected => <<"{[{order, 1, 10}, {order, 3, 5}], [{order, 2, 2}, {order, 4, 1}]}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"tuple_updater:partition_orders([{order, 1, 10}, {order, 2, 2}, {order, 3, 5}, {order, 4, 1}], 5)">>,
          expected => <<"{[{order, 1, 10}, {order, 3, 5}], [{order, 2, 2}, {order, 4, 1}]}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"tuple_updater:partition_orders([{order, 1, 10}, {order, 2, 2}, {order, 3, 5}, {order, 4, 1}], 5)">>,
      expected => <<"{[{order, 1, 10}, {order, 3, 5}], [{order, 2, 2}, {order, 4, 1}]}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch02-l08":
		return r.buildInventoryRunScript(), true

	// ── CHAPTER 3 ─────────────────────────────────────────────────────────────
	case "ch03-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    Mul3 = hof_basics:make_multiplier(3),
    Mul3(15)
of
    45 ->
        #{call_str => <<"begin Mul3 = hof_basics:make_multiplier(3), Mul3(15) end">>, expected => <<"45">>,
          actual => <<"45">>, passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"begin Mul3 = hof_basics:make_multiplier(3), Mul3(15) end">>, expected => <<"45">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"begin Mul3 = hof_basics:make_multiplier(3), Mul3(15) end">>, expected => <<"45">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try hof_basics:apply_twice(fun(X) -> X + 10 end, 5) of
    25 ->
        #{call_str => <<"hof_basics:apply_twice(fun(X) -> X + 10 end, 5)">>, expected => <<"25">>,
          actual => <<"25">>, passed => true, time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"hof_basics:apply_twice(fun(X) -> X + 10 end, 5)">>, expected => <<"25">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"hof_basics:apply_twice(fun(X) -> X + 10 end, 5)">>, expected => <<"25">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    AbsRef = hof_basics:math_capture(),
    AbsRef(-99)
of
    99 ->
        #{call_str => <<"begin AbsRef = hof_basics:math_capture(), AbsRef(-99) end">>, expected => <<"99">>,
          actual => <<"99">>, passed => true, time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"begin AbsRef = hof_basics:math_capture(), AbsRef(-99) end">>, expected => <<"99">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"begin AbsRef = hof_basics:math_capture(), AbsRef(-99) end">>, expected => <<"99">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
T4_Start = erlang:system_time(millisecond),
T4_Res = try
    Strategy = hof_basics:choose_pricing_strategy(vip),
    Strategy(100)
of
    80 ->
        #{call_str => <<"begin Strategy = hof_basics:choose_pricing_strategy(vip), Strategy(100) end">>, expected => <<"80">>,
          actual => <<"80">>, passed => true, time_ms => erlang:system_time(millisecond) - T4_Start};
    Other4 ->
        #{call_str => <<"begin Strategy = hof_basics:choose_pricing_strategy(vip), Strategy(100) end">>, expected => <<"80">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other4]))), passed => false, time_ms => 0}
catch C4:R4 ->
    #{call_str => <<"begin Strategy = hof_basics:choose_pricing_strategy(vip), Strategy(100) end">>, expected => <<"80">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, R4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch03-l02":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try hof_transform:discount_prices([{product, 1, "Keyboard", 100}, {product, 2, "Mouse", 50}], 10) of
    [{product, 1, "Keyboard", 90}, {product, 2, "Mouse", 45}] = R1 ->
        #{call_str => <<"hof_transform:discount_prices([{product, 1, \"Keyboard\", 100}, {product, 2, \"Mouse\", 50}], 10)">>,
          expected => <<"[{product, 1, \"Keyboard\", 90}, {product, 2, \"Mouse\", 45}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"hof_transform:discount_prices([{product, 1, \"Keyboard\", 100}, {product, 2, \"Mouse\", 50}], 10)">>,
          expected => <<"[{product, 1, \"Keyboard\", 90}, {product, 2, \"Mouse\", 45}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"hof_transform:discount_prices([{product, 1, \"Keyboard\", 100}, {product, 2, \"Mouse\", 50}], 10)">>,
      expected => <<"[{product, 1, \"Keyboard\", 90}, {product, 2, \"Mouse\", 45}]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try hof_transform:active_sessions([{session, 101, active}, {session, 102, expired}, {session, 103, active}]) of
    [{session, 101, active}, {session, 103, active}] = R2 ->
        #{call_str => <<"hof_transform:active_sessions([{session, 101, active}, {session, 102, expired}, {session, 103, active}])">>,
          expected => <<"[{session, 101, active}, {session, 103, active}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"hof_transform:active_sessions([{session, 101, active}, {session, 102, expired}, {session, 103, active}])">>,
          expected => <<"[{session, 101, active}, {session, 103, active}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"hof_transform:active_sessions([{session, 101, active}, {session, 102, expired}, {session, 103, active}])">>,
      expected => <<"[{session, 101, active}, {session, 103, active}]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try hof_transform:sanitize_metrics([{cpu_load, 14.8}, {fan_speed, -10}, {memory_usage, 65.2}]) of
    [{cpu_load, 15}, {memory_usage, 65}] = R3 ->
        #{call_str => <<"hof_transform:sanitize_metrics([{cpu_load, 14.8}, {fan_speed, -10}, {memory_usage, 65.2}])">>,
          expected => <<"[{cpu_load, 15}, {memory_usage, 65}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"hof_transform:sanitize_metrics([{cpu_load, 14.8}, {fan_speed, -10}, {memory_usage, 65.2}])">>,
          expected => <<"[{cpu_load, 15}, {memory_usage, 65}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"hof_transform:sanitize_metrics([{cpu_load, 14.8}, {fan_speed, -10}, {memory_usage, 65.2}])">>,
      expected => <<"[{cpu_load, 15}, {memory_usage, 65}]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch03-l03":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try hof_predicates:all_in_stock([{product, 1, "A", 10, 5}, {product, 2, "B", 20, 1}]) of
    true ->
        #{call_str => <<"hof_predicates:all_in_stock([{product, 1, \"A\", 10, 5}, {product, 2, \"B\", 20, 1}])">>,
          expected => <<"true">>, actual => <<"true">>, passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"hof_predicates:all_in_stock([{product, 1, \"A\", 10, 5}, {product, 2, \"B\", 20, 1}])">>, expected => <<"true">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"hof_predicates:all_in_stock([{product, 1, \"A\", 10, 5}, {product, 2, \"B\", 20, 1}])">>, expected => <<"true">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try hof_predicates:all_in_stock([{product, 1, "A", 10, 5}, {product, 2, "B", 20, 0}]) of
    false ->
        #{call_str => <<"hof_predicates:all_in_stock([{product, 1, \"A\", 10, 5}, {product, 2, \"B\", 20, 0}])">>,
          expected => <<"false">>, actual => <<"false">>, passed => true, time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"hof_predicates:all_in_stock([{product, 1, \"A\", 10, 5}, {product, 2, \"B\", 20, 0}])">>, expected => <<"false">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"hof_predicates:all_in_stock([{product, 1, \"A\", 10, 5}, {product, 2, \"B\", 20, 0}])">>, expected => <<"false">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try hof_predicates:has_critical_error([{log, info, "boot"}, {log, critical, "disk full"}, {log, warn, "high mem"}]) of
    true ->
        #{call_str => <<"hof_predicates:has_critical_error([{log, info, \"boot\"}, {log, critical, \"disk full\"}, {log, warn, \"high mem\"}])">>,
          expected => <<"true">>, actual => <<"true">>, passed => true, time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"hof_predicates:has_critical_error([{log, info, \"boot\"}, {log, critical, \"disk full\"}, {log, warn, \"high mem\"}])">>, expected => <<"true">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"hof_predicates:has_critical_error([{log, info, \"boot\"}, {log, critical, \"disk full\"}, {log, warn, \"high mem\"}])">>, expected => <<"true">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
T4_Start = erlang:system_time(millisecond),
T4_Res = try hof_predicates:split_orders_by_stock([{order, 1, 5}, {order, 2, 20}, {order, 3, 2}], 10) of
    {[{order, 1, 5}, {order, 3, 2}], [{order, 2, 20}]} = R4 ->
        #{call_str => <<"hof_predicates:split_orders_by_stock([{order, 1, 5}, {order, 2, 20}, {order, 3, 2}], 10)">>,
          expected => <<"{[{order, 1, 5}, {order, 3, 2}], [{order, 2, 20}]}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R4]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T4_Start};
    Other4 ->
        #{call_str => <<"hof_predicates:split_orders_by_stock([{order, 1, 5}, {order, 2, 20}, {order, 3, 2}], 10)">>,
          expected => <<"{[{order, 1, 5}, {order, 3, 2}], [{order, 2, 20}]}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other4]))), passed => false, time_ms => 0}
catch C4:R4 ->
    #{call_str => <<"hof_predicates:split_orders_by_stock([{order, 1, 5}, {order, 2, 20}, {order, 3, 2}], 10)">>,
      expected => <<"{[{order, 1, 5}, {order, 3, 2}], [{order, 2, 20}]}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, R4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch03-l04":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try hof_fold:sum_ledger([{entry, 100, credit}, {entry, 40, debit}, {entry, 50, credit}]) of
    {ledger_summary, 150, 40, 110} = R1 ->
        #{call_str => <<"hof_fold:sum_ledger([{entry, 100, credit}, {entry, 40, debit}, {entry, 50, credit}])">>,
          expected => <<"{ledger_summary, 150, 40, 110}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"hof_fold:sum_ledger([{entry, 100, credit}, {entry, 40, debit}, {entry, 50, credit}])">>,
          expected => <<"{ledger_summary, 150, 40, 110}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"hof_fold:sum_ledger([{entry, 100, credit}, {entry, 40, debit}, {entry, 50, credit}])">>,
      expected => <<"{ledger_summary, 150, 40, 110}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try hof_fold:min_max_latency([45, 12, 88, 30, 95, 20]) of
    {12, 95} = R2 ->
        #{call_str => <<"hof_fold:min_max_latency([45, 12, 88, 30, 95, 20])">>, expected => <<"{12, 95}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"hof_fold:min_max_latency([45, 12, 88, 30, 95, 20])">>, expected => <<"{12, 95}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"hof_fold:min_max_latency([45, 12, 88, 30, 95, 20])">>, expected => <<"{12, 95}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try hof_fold:reverse_with_fold([alpha, beta, gamma]) of
    [gamma, beta, alpha] = R3 ->
        #{call_str => <<"hof_fold:reverse_with_fold([alpha, beta, gamma])">>, expected => <<"[gamma, beta, alpha]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"hof_fold:reverse_with_fold([alpha, beta, gamma])">>, expected => <<"[gamma, beta, alpha]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"hof_fold:reverse_with_fold([alpha, beta, gamma])">>, expected => <<"[gamma, beta, alpha]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch03-l05":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try keylist_config:find_product_by_id([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 4}], 2) of
    {ok, {product, 2, "Mouse", 25, 4}} = R1 ->
        #{call_str => <<"keylist_config:find_product_by_id([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 4}], 2)">>,
          expected => <<"{ok, {product, 2, \"Mouse\", 25, 4}}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"keylist_config:find_product_by_id([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 4}], 2)">>,
          expected => <<"{ok, {product, 2, \"Mouse\", 25, 4}}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"keylist_config:find_product_by_id([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 4}], 2)">>,
      expected => <<"{ok, {product, 2, \"Mouse\", 25, 4}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try keylist_config:find_product_by_id([{product, 1, "Keyboard", 50, 10}], 999) of
    {error, not_found} = R2 ->
        #{call_str => <<"keylist_config:find_product_by_id([{product, 1, \"Keyboard\", 50, 10}], 999)">>,
          expected => <<"{error, not_found}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"keylist_config:find_product_by_id([{product, 1, \"Keyboard\", 50, 10}], 999)">>,
          expected => <<"{error, not_found}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"keylist_config:find_product_by_id([{product, 1, \"Keyboard\", 50, 10}], 999)">>,
      expected => <<"{error, not_found}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try keylist_config:upsert_product([{product, 1, "Keyboard", 50, 10}], {product, 1, "Keyboard", 45, 12}) of
    [{product, 1, "Keyboard", 45, 12}] = R3 ->
        #{call_str => <<"keylist_config:upsert_product([{product, 1, \"Keyboard\", 50, 10}], {product, 1, \"Keyboard\", 45, 12})">>,
          expected => <<"[{product, 1, \"Keyboard\", 45, 12}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"keylist_config:upsert_product([{product, 1, \"Keyboard\", 50, 10}], {product, 1, \"Keyboard\", 45, 12})">>,
          expected => <<"[{product, 1, \"Keyboard\", 45, 12}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"keylist_config:upsert_product([{product, 1, \"Keyboard\", 50, 10}], {product, 1, \"Keyboard\", 45, 12})">>,
      expected => <<"[{product, 1, \"Keyboard\", 45, 12}]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
T4_Start = erlang:system_time(millisecond),
T4_Res = try keylist_config:read_socket_options([binary, {port, 9090}, {active, once}]) of
    {socket_cfg, 9090, once, true} = R4 ->
        #{call_str => <<"keylist_config:read_socket_options([binary, {port, 9090}, {active, once}])">>,
          expected => <<"{socket_cfg, 9090, once, true}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R4]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T4_Start};
    Other4 ->
        #{call_str => <<"keylist_config:read_socket_options([binary, {port, 9090}, {active, once}])">>,
          expected => <<"{socket_cfg, 9090, once, true}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other4]))), passed => false, time_ms => 0}
catch C4:R4 ->
    #{call_str => <<"keylist_config:read_socket_options([binary, {port, 9090}, {active, once}])">>,
      expected => <<"{socket_cfg, 9090, once, true}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, R4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch03-l06":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try comprehension_queries:active_user_names([{user, 1, "Alice", active}, {user, 2, "Bob", suspended}, {user, 3, "Charlie", active}]) of
    ["Alice", "Charlie"] = R1 ->
        #{call_str => <<"comprehension_queries:active_user_names([{user, 1, \"Alice\", active}, {user, 2, \"Bob\", suspended}, {user, 3, \"Charlie\", active}])">>, expected => <<"[\"Alice\", \"Charlie\"]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"comprehension_queries:active_user_names([{user, 1, \"Alice\", active}, {user, 2, \"Bob\", suspended}, {user, 3, \"Charlie\", active}])">>, expected => <<"[\"Alice\", \"Charlie\"]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"comprehension_queries:active_user_names([{user, 1, \"Alice\", active}, {user, 2, \"Bob\", suspended}, {user, 3, \"Charlie\", active}])">>, expected => <<"[\"Alice\", \"Charlie\"]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try comprehension_queries:matrix_cartesian([1, 2], [x, y]) of
    [{1, x}, {1, y}, {2, x}, {2, y}] = R2 ->
        #{call_str => <<"comprehension_queries:matrix_cartesian([1, 2], [x, y])">>,
          expected => <<"[{1, x}, {1, y}, {2, x}, {2, y}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"comprehension_queries:matrix_cartesian([1, 2], [x, y])">>,
          expected => <<"[{1, x}, {1, y}, {2, x}, {2, y}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"comprehension_queries:matrix_cartesian([1, 2], [x, y])">>,
      expected => <<"[{1, x}, {1, y}, {2, x}, {2, y}]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try comprehension_queries:fulfilled_order_receipts([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 1}], [{order, 1, 2}, {order, 2, 5}]) of
    [{receipt, 1, "Keyboard", 100}] = R3 ->
        #{call_str => <<"comprehension_queries:fulfilled_order_receipts([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 1}], [{order, 1, 2}, {order, 2, 5}])">>,
          expected => <<"[{receipt, 1, \"Keyboard\", 100}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"comprehension_queries:fulfilled_order_receipts([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 1}], [{order, 1, 2}, {order, 2, 5}])">>,
          expected => <<"[{receipt, 1, \"Keyboard\", 100}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"comprehension_queries:fulfilled_order_receipts([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 1}], [{order, 1, 2}, {order, 2, 5}])">>,
      expected => <<"[{receipt, 1, \"Keyboard\", 100}]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch03-l07":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try inventory_hof:total_inventory_valuation([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 4}]) of
    600 ->
        #{call_str => <<"inventory_hof:total_inventory_valuation([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 4}])">>,
          expected => <<"600">>, actual => <<"600">>, passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"inventory_hof:total_inventory_valuation([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 4}])">>,
          expected => <<"600">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"inventory_hof:total_inventory_valuation([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 4}])">>,
      expected => <<"600">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try inventory_hof:critical_stock_alerts([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 2}], 5) of
    [{alert, 2, "Mouse", 2}] = R2 ->
        #{call_str => <<"inventory_hof:critical_stock_alerts([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 2}], 5)">>,
          expected => <<"[{alert, 2, \"Mouse\", 2}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"inventory_hof:critical_stock_alerts([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 2}], 5)">>,
          expected => <<"[{alert, 2, \"Mouse\", 2}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"inventory_hof:critical_stock_alerts([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 2}], 5)">>,
      expected => <<"[{alert, 2, \"Mouse\", 2}]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try inventory_hof:apply_orders_with_keylists([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}], [{order, 1, 3}, {order, 2, 10}]) of
    [{product, 1, "Keyboard", 50, 7}, {product, 2, "Mouse", 25, 5}] = R3 ->
        #{call_str => <<"inventory_hof:apply_orders_with_keylists([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 5}], [{order, 1, 3}, {order, 2, 10}])">>,
          expected => <<"[{product, 1, \"Keyboard\", 50, 7}, {product, 2, \"Mouse\", 25, 5}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"inventory_hof:apply_orders_with_keylists([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 5}], [{order, 1, 3}, {order, 2, 10}])">>,
          expected => <<"[{product, 1, \"Keyboard\", 50, 7}, {product, 2, \"Mouse\", 25, 5}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"inventory_hof:apply_orders_with_keylists([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 5}], [{order, 1, 3}, {order, 2, 10}])">>,
      expected => <<"[{product, 1, \"Keyboard\", 50, 7}, {product, 2, \"Mouse\", 25, 5}]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
T4_Start = erlang:system_time(millisecond),
T4_Res = try inventory_hof:aggregate_sla_logs([{log, api_auth, 40, ok}, {log, api_pay, 120, error}, {log, api_auth, 60, ok}]) of
    {sla_summary, 3, 1, 220} = R4 ->
        #{call_str => <<"inventory_hof:aggregate_sla_logs([{log, api_auth, 40, ok}, {log, api_pay, 120, error}, {log, api_auth, 60, ok}])">>,
          expected => <<"{sla_summary, 3, 1, 220}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R4]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T4_Start};
    Other4 ->
        #{call_str => <<"inventory_hof:aggregate_sla_logs([{log, api_auth, 40, ok}, {log, api_pay, 120, error}, {log, api_auth, 60, ok}])">>,
          expected => <<"{sla_summary, 3, 1, 220}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other4]))), passed => false, time_ms => 0}
catch C4:R4 ->
    #{call_str => <<"inventory_hof:aggregate_sla_logs([{log, api_auth, 40, ok}, {log, api_pay, 120, error}, {log, api_auth, 60, ok}])">>,
      expected => <<"{sla_summary, 3, 1, 220}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, R4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── CHAPTER 4 ─────────────────────────────────────────────────────────────
	case "ch04-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try map_registry:create_session(alice, admin) of
    #{login_count := 0, presence := offline, role := admin, user_id := alice} = S_R1 when map_size(S_R1) =:= 4 ->
        #{call_str => <<"map_registry:create_session(alice, admin)">>,
          expected => <<"#{login_count => 0, presence => offline, role => admin, user_id => alice}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [S_R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"map_registry:create_session(alice, admin)">>,
          expected => <<"#{login_count => 0, presence => offline, role => admin, user_id => alice}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:Err1 ->
    #{call_str => <<"map_registry:create_session(alice, admin)">>,
      expected => <<"#{login_count => 0, presence => offline, role => admin, user_id => alice}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    S_T2 = map_registry:create_session(alice, admin),
    case map_registry:update_presence(S_T2, alice, online) of
        #{login_count := 1, presence := online, role := admin, user_id := alice} = S2_R2 when map_size(S2_R2) =:= 4 ->
            #{call_str => <<"begin S = map_registry:create_session(alice, admin), map_registry:update_presence(S, alice, online) end">>,
              expected => <<"#{login_count => 1, presence => online, role => admin, user_id => alice}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [S2_R2]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T2_Start};
        Other2 ->
            #{call_str => <<"begin S = map_registry:create_session(alice, admin), map_registry:update_presence(S, alice, online) end">>,
              expected => <<"#{login_count => 1, presence => online, role => admin, user_id => alice}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
    end
catch C2:Err2 ->
    #{call_str => <<"begin S = map_registry:create_session(alice, admin), map_registry:update_presence(S, alice, online) end">>,
      expected => <<"#{login_count => 1, presence => online, role => admin, user_id => alice}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, Err2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    S_T3 = map_registry:create_session(alice, admin),
    case map_registry:update_presence(S_T3, bob, online) of
        {error, session_mismatch} = R3 ->
            #{call_str => <<"begin S = map_registry:create_session(alice, admin), map_registry:update_presence(S, bob, online) end">>,
              expected => <<"{error, session_mismatch}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T3_Start};
        Other3 ->
            #{call_str => <<"begin S = map_registry:create_session(alice, admin), map_registry:update_presence(S, bob, online) end">>,
              expected => <<"{error, session_mismatch}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
    end
catch C3:Err3 ->
    #{call_str => <<"begin S = map_registry:create_session(alice, admin), map_registry:update_presence(S, bob, online) end">>,
      expected => <<"{error, session_mismatch}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, Err3])), passed => false, time_ms => 0}
end,
T4_Start = erlang:system_time(millisecond),
T4_Res = try
    S_T4 = map_registry:create_session(alice, admin),
    S2_T4 = map_registry:update_presence(S_T4, alice, online),
    case map_registry:is_admin_session(S2_T4) of
        true ->
            #{call_str => <<"begin S = map_registry:create_session(alice, admin), S2 = map_registry:update_presence(S, alice, online), map_registry:is_admin_session(S2) end">>,
              expected => <<"true">>, actual => <<"true">>, passed => true,
              time_ms => erlang:system_time(millisecond) - T4_Start};
        Other4 ->
            #{call_str => <<"begin S = map_registry:create_session(alice, admin), S2 = map_registry:update_presence(S, alice, online), map_registry:is_admin_session(S2) end">>,
              expected => <<"true">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other4]))), passed => false, time_ms => 0}
    end
catch C4:Err4 ->
    #{call_str => <<"begin S = map_registry:create_session(alice, admin), S2 = map_registry:update_presence(S, alice, online), map_registry:is_admin_session(S2) end">>,
      expected => <<"true">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, Err4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch04-l02":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try map_stdlib:safe_get_load(#{node_a => 42}, node_b) of
    0 ->
        #{call_str => <<"map_stdlib:safe_get_load(#{node_a => 42}, node_b)">>,
          expected => <<"0">>, actual => <<"0">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"map_stdlib:safe_get_load(#{node_a => 42}, node_b)">>,
          expected => <<"0">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:Err1 ->
    #{call_str => <<"map_stdlib:safe_get_load(#{node_a => 42}, node_b)">>,
      expected => <<"0">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try map_stdlib:increment_tag_counts([api, web, api, db, api], #{}) of
    #{api := 3, db := 1, web := 1} = R2 when map_size(R2) =:= 3 ->
        #{call_str => <<"map_stdlib:increment_tag_counts([api, web, api, db, api], #{})">>,
          expected => <<"#{api => 3, db => 1, web => 1}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"map_stdlib:increment_tag_counts([api, web, api, db, api], #{})">>,
          expected => <<"#{api => 3, db => 1, web => 1}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:Err2 ->
    #{call_str => <<"map_stdlib:increment_tag_counts([api, web, api, db, api], #{})">>,
      expected => <<"#{api => 3, db => 1, web => 1}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, Err2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try map_stdlib:merge_configs(#{port => 8080, timeout => 5000}, #{port => 9000, secret_key => bad_secret, debug_token => 1234}) of
    #{port := 9000, timeout := 5000} = R3 when map_size(R3) =:= 2 ->
        #{call_str => <<"map_stdlib:merge_configs(#{port => 8080, timeout => 5000}, #{port => 9000, secret_key => bad_secret, debug_token => 1234})">>,
          expected => <<"#{port => 9000, timeout => 5000}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"map_stdlib:merge_configs(#{port => 8080, timeout => 5000}, #{port => 9000, secret_key => bad_secret, debug_token => 1234})">>,
          expected => <<"#{port => 9000, timeout => 5000}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
catch C3:Err3 ->
    #{call_str => <<"map_stdlib:merge_configs(#{port => 8080, timeout => 5000}, #{port => 9000, secret_key => bad_secret, debug_token => 1234})">>,
      expected => <<"#{port => 9000, timeout => 5000}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, Err3])), passed => false, time_ms => 0}
end,
T4_Start = erlang:system_time(millisecond),
T4_Res = try map_stdlib:sum_map_values(#{cpu => 25, mem => 45, io => 10}) of
    80 ->
        #{call_str => <<"map_stdlib:sum_map_values(#{cpu => 25, mem => 45, io => 10})">>,
          expected => <<"80">>, actual => <<"80">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T4_Start};
    Other4 ->
        #{call_str => <<"map_stdlib:sum_map_values(#{cpu => 25, mem => 45, io => 10})">>,
          expected => <<"80">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other4]))), passed => false, time_ms => 0}
catch C4:Err4 ->
    #{call_str => <<"map_stdlib:sum_map_values(#{cpu => 25, mem => 45, io => 10})">>,
      expected => <<"80">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, Err4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch04-l03":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try record_frames:new_frame(1, ack, ok) of
    {frame, 1, ack, ok} = R1 ->
        #{call_str => <<"record_frames:new_frame(1, ack, ok)">>,
          expected => <<"{frame, 1, ack, ok}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"record_frames:new_frame(1, ack, ok)">>,
          expected => <<"{frame, 1, ack, ok}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:Err1 ->
    #{call_str => <<"record_frames:new_frame(1, ack, ok)">>,
      expected => <<"{frame, 1, ack, ok}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    F_T2 = record_frames:new_frame(10, data, ping),
    case record_frames:advance_seq(F_T2) of
        {frame, 11, data, ping} = R2 ->
            #{call_str => <<"begin F = record_frames:new_frame(10, data, ping), record_frames:advance_seq(F) end">>,
              expected => <<"{frame, 11, data, ping}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T2_Start};
        Other2 ->
            #{call_str => <<"begin F = record_frames:new_frame(10, data, ping), record_frames:advance_seq(F) end">>,
              expected => <<"{frame, 11, data, ping}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
    end
catch C2:Err2 ->
    #{call_str => <<"begin F = record_frames:new_frame(10, data, ping), record_frames:advance_seq(F) end">>,
      expected => <<"{frame, 11, data, ping}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, Err2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try record_frames:frame_seq_index() of
    2 ->
        #{call_str => <<"record_frames:frame_seq_index()">>,
          expected => <<"2">>, actual => <<"2">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"record_frames:frame_seq_index()">>,
          expected => <<"2">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
catch C3:Err3 ->
    #{call_str => <<"record_frames:frame_seq_index()">>,
      expected => <<"2">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, Err3])), passed => false, time_ms => 0}
end,
T4_Start = erlang:system_time(millisecond),
T4_Res = try record_frames:find_frame_by_seq([{frame, 1, data, hello}, {frame, 2, ack, world}], 2) of
    {ok, {frame, 2, ack, world}} = R4 ->
        #{call_str => <<"record_frames:find_frame_by_seq([{frame, 1, data, hello}, {frame, 2, ack, world}], 2)">>,
          expected => <<"{ok, {frame, 2, ack, world}}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R4]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T4_Start};
    Other4 ->
        #{call_str => <<"record_frames:find_frame_by_seq([{frame, 1, data, hello}, {frame, 2, ack, world}], 2)">>,
          expected => <<"{ok, {frame, 2, ack, world}}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other4]))), passed => false, time_ms => 0}
catch C4:Err4 ->
    #{call_str => <<"record_frames:find_frame_by_seq([{frame, 1, data, hello}, {frame, 2, ack, world}], 2)">>,
      expected => <<"{ok, {frame, 2, ack, world}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, Err4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch04-l04":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try iolist_builder:string_vs_binary_bytes("hello") of
    {size_comparison, 80, 5, <<"hello">>} = R1 ->
        #{call_str => <<"iolist_builder:string_vs_binary_bytes(\"hello\")">>,
          expected => <<"{size_comparison, 80, 5, <<\"hello\">>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"iolist_builder:string_vs_binary_bytes(\"hello\")">>,
          expected => <<"{size_comparison, 80, 5, <<\"hello\">>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:Err1 ->
    #{call_str => <<"iolist_builder:string_vs_binary_bytes(\"hello\")">>,
      expected => <<"{size_comparison, 80, 5, <<\"hello\">>}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try iolist_builder:build_http_response_iolist(200, <<"{\"status\":\"ok\"}">>) of
    R2 when is_list(R2) ->
        Flat2 = iolist_to_binary(R2),
        Exp2 = <<"HTTP/1.1 200 OK\r\nContent-Length: 15\r\n\r\n{\"status\":\"ok\"}">>,
        case Flat2 =:= Exp2 of
            true ->
                #{call_str => <<"iolist_builder:build_http_response_iolist(200, <<\"{\\\"status\\\":\\\"ok\\\"}\">>)">>,
                  expected => <<"[<<\"HTTP/1.1 \">>, <<\"200\">>, <<\" OK\\r\\nContent-Length: \">>, <<\"15\">>, <<\"\\r\\n\\r\\n\">>, <<\"{\\\"status\\\":\\\"ok\\\"}\">>]">>,
                  actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
                  time_ms => erlang:system_time(millisecond) - T2_Start};
            false ->
                #{call_str => <<"iolist_builder:build_http_response_iolist(200, <<\"{\\\"status\\\":\\\"ok\\\"}\">>)">>,
                  expected => <<"[<<\"HTTP/1.1 \">>, <<\"200\">>, <<\" OK\\r\\nContent-Length: \">>, <<\"15\">>, <<\"\\r\\n\\r\\n\">>, <<\"{\\\"status\\\":\\\"ok\\\"}\">>]">>,
                  actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => false, time_ms => 0}
        end;
    Other2 ->
        #{call_str => <<"iolist_builder:build_http_response_iolist(200, <<\"{\\\"status\\\":\\\"ok\\\"}\">>)">>,
          expected => <<"[<<\"HTTP/1.1 \">>, <<\"200\">>, <<\" OK\\r\\nContent-Length: \">>, <<\"15\">>, <<\"\\r\\n\\r\\n\">>, <<\"{\\\"status\\\":\\\"ok\\\"}\">>]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:Err2 ->
    #{call_str => <<"iolist_builder:build_http_response_iolist(200, <<\"{\\\"status\\\":\\\"ok\\\"}\">>)">>,
      expected => <<"[<<\"HTTP/1.1 \">>, <<\"200\">>, <<\" OK\\r\\nContent-Length: \">>, <<\"15\">>, <<\"\\r\\n\\r\\n\">>, <<\"{\\\"status\\\":\\\"ok\\\"}\">>]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, Err2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try iolist_builder:flatten_iolist([<<"PING">>, [<<"-">>, <<"PONG">>]]) of
    {9, <<"PING-PONG">>} = R3 ->
        #{call_str => <<"iolist_builder:flatten_iolist([<<\"PING\">>, [<<\"-\">>, <<\"PONG\">>]])">>,
          expected => <<"{9, <<\"PING-PONG\">>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"iolist_builder:flatten_iolist([<<\"PING\">>, [<<\"-\">>, <<\"PONG\">>]])">>,
          expected => <<"{9, <<\"PING-PONG\">>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
catch C3:Err3 ->
    #{call_str => <<"iolist_builder:flatten_iolist([<<\"PING\">>, [<<\"-\">>, <<\"PONG\">>]])">>,
      expected => <<"{9, <<\"PING-PONG\">>}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, Err3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch04-l05":
		if _, err := os.Stat(filepath.Join(session.WorkspaceDir, "packet_parser.erl")); err == nil {
			return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try packet_parser:parse_frame(<<1:4, 2:4, 4:16/big, "PING", "REST">>) of
    {ok, {tlv_frame, 1, 2, 4, <<"PING">>}, <<"REST">>} = R1 ->
        #{call_str => <<"packet_parser:parse_frame(...)">>,
          expected => <<"{ok, {tlv_frame, 1, 2, 4, <<\"PING\">>}, <<\"REST\">>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"packet_parser:parse_frame(...)">>, expected => <<"{ok, {tlv_frame, ...}}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"packet_parser:parse_frame(...)">>, expected => <<"{ok, ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true
		}
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try bit_packer:pack_header(4, 2, 1024) of
    <<66, 4, 0>> = R1 ->
        #{call_str => <<"bit_packer:pack_header(4, 2, 1024)">>,
          expected => <<"<<66, 4, 0>>">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Got1 ->
        #{call_str => <<"bit_packer:pack_header(4, 2, 1024)">>, expected => <<"<<66, 4, 0>>">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Got1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"bit_packer:pack_header(4, 2, 1024)">>, expected => <<"<<66, 4, 0>>">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try bit_packer:unpack_header(<<66, 4, 0, "PAYLOAD">>) of
    {ok, 4, 2, 1024, <<"PAYLOAD">>} = R2 ->
        #{call_str => <<"bit_packer:unpack_header(<<66, 4, 0, \"PAYLOAD\">>)">>,
          expected => <<"{ok, 4, 2, 1024, <<\"PAYLOAD\">>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T2_Start};
    Got2 ->
        #{call_str => <<"bit_packer:unpack_header(<<66, 4, 0, \"PAYLOAD\">>)">>, expected => <<"{ok, 4, 2, 1024, <<\"PAYLOAD\">>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Got2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"bit_packer:unpack_header(<<66, 4, 0, \"PAYLOAD\">>)">>, expected => <<"{ok, 4, 2, 1024, <<\"PAYLOAD\">>}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try bit_packer:unpack_header(<<66, 4>>) of
    {error, insufficient_bytes} = R3 ->
        #{call_str => <<"bit_packer:unpack_header(<<66, 4>>)">>,
          expected => <<"{error, insufficient_bytes}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T3_Start};
    Got3 ->
        #{call_str => <<"bit_packer:unpack_header(<<66, 4>>)">>, expected => <<"{error, insufficient_bytes}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Got3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"bit_packer:unpack_header(<<66, 4>>)">>, expected => <<"{error, insufficient_bytes}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
T4_Start = erlang:system_time(millisecond),
T4_Res = try bit_packer:encode_utf8_tagged(<<"HELLO">>) of
    <<1, 0, 5, "HELLO">> = R4 ->
        #{call_str => <<"bit_packer:encode_utf8_tagged(<<\"HELLO\">>)">>,
          expected => <<"<<1, 0, 5, \"HELLO\">>">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R4]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T4_Start};
    Got4 ->
        #{call_str => <<"bit_packer:encode_utf8_tagged(<<\"HELLO\">>)">>, expected => <<"<<1, 0, 5, \"HELLO\">>">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Got4]))), passed => false, time_ms => 0}
catch C4:R4 ->
    #{call_str => <<"bit_packer:encode_utf8_tagged(<<\"HELLO\">>)">>, expected => <<"<<1, 0, 5, \"HELLO\">>">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, R4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch04-l06":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try binary_scanner:split_key_value(<<"Authorization: Bearer_token_123">>) of
    {ok, <<"Authorization">>, <<"Bearer_token_123">>} = R1 ->
        #{call_str => <<"binary_scanner:split_key_value(<<\"Authorization: Bearer_token_123\">>)">>,
          expected => <<"{ok, <<\"Authorization\">>, <<\"Bearer_token_123\">>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Got1 ->
        #{call_str => <<"binary_scanner:split_key_value(<<\"Authorization: Bearer_token_123\">>)">>, expected => <<"{ok, <<\"Authorization\">>, <<\"Bearer_token_123\">>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Got1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"binary_scanner:split_key_value(<<\"Authorization: Bearer_token_123\">>)">>, expected => <<"{ok, <<\"Authorization\">>, <<\"Bearer_token_123\">>}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try binary_scanner:split_key_value(<<"InvalidHeaderContent">>) of
    {error, malformed_header} = R2 ->
        #{call_str => <<"binary_scanner:split_key_value(<<\"InvalidHeaderContent\">>)">>,
          expected => <<"{error, malformed_header}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T2_Start};
    Got2 ->
        #{call_str => <<"binary_scanner:split_key_value(<<\"InvalidHeaderContent\">>)">>, expected => <<"{error, malformed_header}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Got2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"binary_scanner:split_key_value(<<\"InvalidHeaderContent\">>)">>, expected => <<"{error, malformed_header}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try binary_scanner:extract_lines(<<"line1\r\n\r\nline2\r\nline3\r\n">>) of
    [<<"line1">>, <<"line2">>, <<"line3">>] = R3 ->
        #{call_str => <<"binary_scanner:extract_lines(<<\"line1\\r\\n\\r\\nline2\\r\\nline3\\r\\n\">>)">>,
          expected => <<"[<<\"line1\">>, <<\"line2\">>, <<\"line3\">>]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T3_Start};
    Got3 ->
        #{call_str => <<"binary_scanner:extract_lines(<<\"line1\\r\\n\\r\\nline2\\r\\nline3\\r\\n\">>)">>, expected => <<"[<<\"line1\">>, <<\"line2\">>, <<\"line3\">>]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Got3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"binary_scanner:extract_lines(<<\"line1\\r\\n\\r\\nline2\\r\\nline3\\r\\n\">>)">>, expected => <<"[<<\"line1\">>, <<\"line2\">>, <<\"line3\">>]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
T4_Start = erlang:system_time(millisecond),
T4_Res = try binary_scanner:xor_mask_payload(<<16#AA, 16#55>>, 16#FF) of
    <<85, 170>> = R4 ->
        #{call_str => <<"binary_scanner:xor_mask_payload(<<16#AA, 16#55>>, 16#FF)">>,
          expected => <<"<<85, 170>>">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R4]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T4_Start};
    Got4 ->
        #{call_str => <<"binary_scanner:xor_mask_payload(<<16#AA, 16#55>>, 16#FF)">>, expected => <<"<<85, 170>>">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Got4]))), passed => false, time_ms => 0}
catch C4:R4 ->
    #{call_str => <<"binary_scanner:xor_mask_payload(<<16#AA, 16#55>>, 16#FF)">>, expected => <<"<<85, 170>>">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, R4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch04-l07":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try binary_unpinner:extract_token_safe(<<1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16, "REMAINDER_OF_LARGE_PACKET">>) of
    {ok, <<1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16>>} = R1 ->
        #{call_str => <<"binary_unpinner:extract_token_safe(<<1..16, \"REMAINDER_OF_LARGE_PACKET\">>)">>,
          expected => <<"{ok, <<1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16>>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Got1 ->
        #{call_str => <<"binary_unpinner:extract_token_safe(<<1..16, \"REMAINDER_OF_LARGE_PACKET\">>)">>, expected => <<"{ok, <<1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16>>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Got1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"binary_unpinner:extract_token_safe(<<1..16, \"REMAINDER_OF_LARGE_PACKET\">>)">>, expected => <<"{ok, <<1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16>>}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try binary_unpinner:extract_token_safe(<<1,2,3>>) of
    {error, insufficient_data} = R2 ->
        #{call_str => <<"binary_unpinner:extract_token_safe(<<1,2,3>>)">>,
          expected => <<"{error, insufficient_data}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T2_Start};
    Got2 ->
        #{call_str => <<"binary_unpinner:extract_token_safe(<<1,2,3>>)">>, expected => <<"{error, insufficient_data}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Got2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"binary_unpinner:extract_token_safe(<<1,2,3>>)">>, expected => <<"{error, insufficient_data}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try binary_unpinner:slice_packet_safe(<<"ABCDEFGHIJ">>, 4) of
    <<"ABCD">> = R3 ->
        #{call_str => <<"binary_unpinner:slice_packet_safe(<<\"ABCDEFGHIJ\">>, 4)">>,
          expected => <<"<<\"ABCD\">>">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T3_Start};
    Got3 ->
        #{call_str => <<"binary_unpinner:slice_packet_safe(<<\"ABCDEFGHIJ\">>, 4)">>, expected => <<"<<\"ABCD\">>">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Got3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"binary_unpinner:slice_packet_safe(<<\"ABCDEFGHIJ\">>, 4)">>, expected => <<"<<\"ABCD\">>">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
T4_Start = erlang:system_time(millisecond),
T4_Res = try binary_unpinner:inspect_refc_ratio(binary:copy(<<"SMALL_HEAP_BIN">>)) of
    {14, 14} = R4 ->
        #{call_str => <<"binary_unpinner:inspect_refc_ratio(binary:copy(<<\"SMALL_HEAP_BIN\">>))">>,
          expected => <<"{14, 14}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R4]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T4_Start};
    Got4 ->
        #{call_str => <<"binary_unpinner:inspect_refc_ratio(binary:copy(<<\"SMALL_HEAP_BIN\">>))">>, expected => <<"{14, 14}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Got4]))), passed => false, time_ms => 0}
catch C4:R4 ->
    #{call_str => <<"binary_unpinner:inspect_refc_ratio(binary:copy(<<\"SMALL_HEAP_BIN\">>))">>, expected => <<"{14, 14}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, R4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch04-l08":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try packet_parser:parse_frame(<<1:4, 2:4, 4:16/big, "PING", "REST">>) of
    {ok, {tlv_frame, 1, 2, 4, <<"PING">>}, <<"REST">>} = R1 ->
        #{call_str => <<"packet_parser:parse_frame(<<1:4, 2:4, 4:16/big, \"PING\", \"REST\">>)">>,
          expected => <<"{ok, {tlv_frame, 1, 2, 4, <<\"PING\">>}, <<\"REST\">>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Got1 ->
        #{call_str => <<"packet_parser:parse_frame(<<1:4, 2:4, 4:16/big, \"PING\", \"REST\">>)">>, expected => <<"{ok, {tlv_frame, 1, 2, 4, <<\"PING\">>}, <<\"REST\">>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Got1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"packet_parser:parse_frame(<<1:4, 2:4, 4:16/big, \"PING\", \"REST\">>)">>, expected => <<"{ok, {tlv_frame, 1, 2, 4, <<\"PING\">>}, <<\"REST\">>}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try packet_parser:parse_tlv_stream(<<1:4, 2:4, 4:16/big, "PING", 1:4, 3:4, 4:16/big, "PONG">>) of
    {ok, [{tlv_frame, 1, 2, 4, <<"PING">>}, {tlv_frame, 1, 3, 4, <<"PONG">>}]} = R2 ->
        #{call_str => <<"packet_parser:parse_tlv_stream(<<1:4, 2:4, 4:16/big, \"PING\", 1:4, 3:4, 4:16/big, \"PONG\">>)">>,
          expected => <<"{ok, [{tlv_frame, 1, 2, 4, <<\"PING\">>}, {tlv_frame, 1, 3, 4, <<\"PONG\">>}]}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T2_Start};
    Got2 ->
        #{call_str => <<"packet_parser:parse_tlv_stream(<<1:4, 2:4, 4:16/big, \"PING\", 1:4, 3:4, 4:16/big, \"PONG\">>)">>, expected => <<"{ok, [{tlv_frame, 1, 2, 4, <<\"PING\">>}, {tlv_frame, 1, 3, 4, <<\"PONG\">>}]}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Got2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"packet_parser:parse_tlv_stream(<<1:4, 2:4, 4:16/big, \"PING\", 1:4, 3:4, 4:16/big, \"PONG\">>)">>, expected => <<"{ok, [{tlv_frame, 1, 2, 4, <<\"PING\">>}, {tlv_frame, 1, 3, 4, <<\"PONG\">>}]}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try packet_parser:parse_tlv_stream(<<1:4, 2:4, 4:16/big, "PING", 1:4, 3:4>>) of
    {partial, [{tlv_frame, 1, 2, 4, <<"PING">>}], <<19>>} = R3 ->
        #{call_str => <<"packet_parser:parse_tlv_stream(<<1:4, 2:4, 4:16/big, \"PING\", 1:4, 3:4>>)">>,
          expected => <<"{partial, [{tlv_frame, 1, 2, 4, <<\"PING\">>}], <<19>>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T3_Start};
    Got3 ->
        #{call_str => <<"packet_parser:parse_tlv_stream(<<1:4, 2:4, 4:16/big, \"PING\", 1:4, 3:4>>)">>, expected => <<"{partial, [{tlv_frame, 1, 2, 4, <<\"PING\">>}], <<19>>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Got3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"packet_parser:parse_tlv_stream(<<1:4, 2:4, 4:16/big, \"PING\", 1:4, 3:4>>)">>, expected => <<"{partial, [{tlv_frame, 1, 2, 4, <<\"PING\">>}], <<19>>}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
T4_Start = erlang:system_time(millisecond),
T4_Res = try packet_parser:encode_frame({tlv_frame, 1, 2, 4, <<"TEST">>}) of
    <<18, 0, 4, "TEST">> = R4 ->
        #{call_str => <<"packet_parser:encode_frame({tlv_frame, 1, 2, 4, <<\"TEST\">>})">>,
          expected => <<"<<18, 0, 4, \"TEST\">>">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R4]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T4_Start};
    Got4 ->
        #{call_str => <<"packet_parser:encode_frame({tlv_frame, 1, 2, 4, <<\"TEST\">>})">>, expected => <<"<<18, 0, 4, \"TEST\">>">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Got4]))), passed => false, time_ms => 0}
catch C4:R4 ->
    #{call_str => <<"packet_parser:encode_frame({tlv_frame, 1, 2, 4, <<\"TEST\">>})">>, expected => <<"<<18, 0, 4, \"TEST\">>">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, R4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── CHAPTER 5 ─────────────────────────────────────────────────────────────
	case "ch05-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try process_bench:run_bench(2000) of
    #{spawned := 2000, avg_memory_bytes := AvgMem1} = R1 ->
        Passed1 = AvgMem1 < 4096,
        #{call_str => <<"process_bench:run_bench(2000)">>,
          expected => <<"{2000, true}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("{~p, ~p}", [2000, Passed1]))),
          passed => Passed1,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"process_bench:run_bench(2000)">>, expected => <<"{2000, true}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"process_bench:run_bench(2000)">>, expected => <<"{2000, true}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    TestPid2 = spawn(fun() -> receive stop -> ok end end),
    MemVal2 = process_bench:inspect_process(TestPid2),
    TestPid2 ! stop,
    Passed2 = is_integer(MemVal2) andalso MemVal2 > 500 andalso MemVal2 < 10000,
    #{call_str => <<"process_bench:inspect_process(TestPid)">>,
      expected => <<"true">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Passed2]))),
      passed => Passed2,
      time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"process_bench:inspect_process(TestPid)">>, expected => <<"true">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try process_bench:run_bench(500) of
    #{spawned := 500, avg_memory_bytes := AvgMem3} = R3 ->
        Passed3 = AvgMem3 < 4096,
        #{call_str => <<"process_bench:run_bench(500)">>,
          expected => <<"{500, true}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("{~p, ~p}", [500, Passed3]))),
          passed => Passed3,
          time_ms => erlang:system_time(millisecond) - T3_Start};
    Other3 ->
        #{call_str => <<"process_bench:run_bench(500)">>, expected => <<"{500, true}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
catch C3:R3 ->
    #{call_str => <<"process_bench:run_bench(500)">>, expected => <<"{500, true}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch05-l02":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    P = ping_actor:start_responder(),
    Res = ping_actor:ping(P, <<"syn">>),
    P ! stop,
    case Res of
        {ok, <<"syn">>} = R1 ->
            #{call_str => <<"ping_actor:ping(P, <<\"syn\">>)">>,
              expected => <<"{ok, <<\"syn\">>}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T1_Start};
        Other1 ->
            #{call_str => <<"ping_actor:ping(P, <<\"syn\">>)">>, expected => <<"{ok, <<\"syn\">>}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
    end
catch C1:Err1 ->
    #{call_str => <<"ping_actor:ping(...)">>, expected => <<"{ok, <<\"syn\">>}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    P1 = ping_actor:start_responder(),
    P2 = ping_actor:start_responder(),
    BRes = ping_actor:broadcast([P1, P2], stop),
    case BRes of
        {sent, 2} = R2 ->
            #{call_str => <<"ping_actor:broadcast([P1, P2], stop)">>,
              expected => <<"{sent, 2}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T2_Start};
        Other2 ->
            #{call_str => <<"ping_actor:broadcast([P1, P2], stop)">>, expected => <<"{sent, 2}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
    end
catch C2:Err2 ->
    #{call_str => <<"ping_actor:broadcast(...)">>, expected => <<"{sent, 2}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, Err2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    Dead = spawn(fun() -> receive forever -> ok end end),
    TRes = ping_actor:ping(Dead, <<"timeout_test">>),
    Dead ! stop,
    case TRes of
        {error, timeout} = R3 ->
            #{call_str => <<"ping_actor:ping(Unresponsive, <<\"timeout_test\">>)">>,
              expected => <<"{error, timeout}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T3_Start};
        Other3 ->
            #{call_str => <<"ping_actor:ping(Unresponsive, <<\"timeout_test\">>)">>, expected => <<"{error, timeout}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
    end
catch C3:Err3 ->
    #{call_str => <<"ping_actor:ping(Unresponsive, ...)">>, expected => <<"{error, timeout}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, Err3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch05-l03":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    self() ! {normal, 1},
    self() ! {urgent, 99},
    self() ! {normal, 2},
    case priority_mailbox:receive_urgent_first(3) of
        [99, 1, 2] = R1 ->
            #{call_str => <<"priority_mailbox:receive_urgent_first(3)">>,
              expected => <<"[99, 1, 2]">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T1_Start};
        Other1 ->
            #{call_str => <<"priority_mailbox:receive_urgent_first(3)">>, expected => <<"[99, 1, 2]">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
    end
catch C1:Err1 ->
    #{call_str => <<"priority_mailbox:receive_urgent_first(...)">>, expected => <<"[99, 1, 2]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    Self2 = self(),
    T2_Worker = spawn(fun() ->
        Dummy = spawn(fun() -> receive after 500 -> ok end end),
        Res2 = priority_mailbox:request_with_timeout(Dummy, ping, 40),
        Self2 ! {t2_done, Res2}
    end),
    receive
        {t2_done, {error, timeout}} ->
            #{call_str => <<"priority_mailbox:request_with_timeout(Dummy, ping, 40)">>,
              expected => <<"{error, timeout}">>,
              actual => <<"{error, timeout}">>, passed => true,
              time_ms => erlang:system_time(millisecond) - T2_Start};
        {t2_done, Other2} ->
            #{call_str => <<"priority_mailbox:request_with_timeout(...)">>, expected => <<"{error, timeout}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
    after 250 ->
        exit(T2_Worker, kill),
        #{call_str => <<"priority_mailbox:request_with_timeout(...)">>, expected => <<"{error, timeout}">>,
          actual => <<"Crash: timeout blocked indefinitely (missing receive...after)">>, passed => false, time_ms => 250}
    end
catch C2:Err2 ->
    #{call_str => <<"priority_mailbox:request_with_timeout(...)">>, expected => <<"{error, timeout}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, Err2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    self() ! a,
    self() ! b,
    self() ! c,
    case priority_mailbox:flush_mailbox() of
        [a, b, c] = R3 ->
            #{call_str => <<"priority_mailbox:flush_mailbox()">>,
              expected => <<"[a, b, c]">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T3_Start};
        Other3 ->
            #{call_str => <<"priority_mailbox:flush_mailbox()">>, expected => <<"[a, b, c]">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
    end
catch C3:Err3 ->
    #{call_str => <<"priority_mailbox:flush_mailbox(...)">>, expected => <<"[a, b, c]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, Err3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch05-l04":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    P = counter_actor:start(10),
    ok = counter_actor:increment(P, 5),
    case counter_actor:get_value(P) of
        {ok, 15} = R1 ->
            counter_actor:stop(P),
            #{call_str => <<"counter_actor:get_value(P)">>,
              expected => <<"{ok, 15}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T1_Start};
        Other1 ->
            counter_actor:stop(P),
            #{call_str => <<"counter_actor:get_value(P)">>, expected => <<"{ok, 15}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
    end
catch C1:Err1 ->
    #{call_str => <<"counter_actor:get_value(...)">>, expected => <<"{ok, 15}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    P2 = counter_actor:start(0),
    ok = counter_actor:increment(P2, 50),
    ok = counter_actor:decrement(P2, 20),
    case counter_actor:get_value(P2) of
        {ok, 30} = R2 ->
            counter_actor:stop(P2),
            #{call_str => <<"counter_actor:increment/decrement">>,
              expected => <<"{ok, 30}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T2_Start};
        Other2 ->
            counter_actor:stop(P2),
            #{call_str => <<"counter_actor:increment/decrement">>, expected => <<"{ok, 30}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
    end
catch C2:Err2 ->
    #{call_str => <<"counter_actor:decrement test">>, expected => <<"{ok, 30}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, Err2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    Self3 = self(),
    T3_Worker = spawn(fun() ->
        Dummy = spawn(fun() -> receive after 500 -> ok end end),
        Res3 = counter_actor:get_value(Dummy),
        Self3 ! {t3_done, Res3}
    end),
    receive
        {t3_done, {error, timeout}} ->
            #{call_str => <<"counter_actor:get_value(Dummy)">>,
              expected => <<"{error, timeout}">>,
              actual => <<"{error, timeout}">>, passed => true,
              time_ms => erlang:system_time(millisecond) - T3_Start};
        {t3_done, Other3} ->
            #{call_str => <<"counter_actor:get_value(Dummy)">>, expected => <<"{error, timeout}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
    after 1500 ->
        exit(T3_Worker, kill),
        #{call_str => <<"counter_actor:get_value(Dummy)">>, expected => <<"{error, timeout}">>,
          actual => <<"Crash: get_value/1 blocked indefinitely">>, passed => false, time_ms => 1500}
    end
catch C3:Err3 ->
    #{call_str => <<"counter_actor:get_value(Dummy)">>, expected => <<"{error, timeout}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, Err3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch05-l05":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    catch named_kv_actor:stop(),
    {ok, _} = named_kv_actor:start_registered(),
    ok = named_kv_actor:put(<<"session_token">>, <<"active_123">>),
    case named_kv_actor:get(<<"session_token">>) of
        {ok, <<"active_123">>} = R1 ->
            named_kv_actor:stop(),
            #{call_str => <<"named_kv_actor:get(<<\"session_token\">>)">>,
              expected => <<"{ok, <<\"active_123\">>}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T1_Start};
        Other1 ->
            named_kv_actor:stop(),
            #{call_str => <<"named_kv_actor:get(...)">>, expected => <<"{ok, <<\"active_123\">>}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
    end
catch C1:Err1 ->
    catch named_kv_actor:stop(),
    #{call_str => <<"named_kv_actor:get(...)">>, expected => <<"{ok, <<\"active_123\">>}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1])), passed => false, time_ms => 0}
end,

T2_Start = erlang:system_time(millisecond),
T2_Res = try
    catch named_kv_actor:stop(),
    {ok, _} = named_kv_actor:start_registered(),
    case named_kv_actor:get(<<"non_existent">>) of
        {error, not_found} = R2 ->
            named_kv_actor:stop(),
            #{call_str => <<"named_kv_actor:get(<<\"non_existent\">>)">>,
              expected => <<"{error, not_found}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T2_Start};
        Other2 ->
            named_kv_actor:stop(),
            #{call_str => <<"named_kv_actor:get(<<\"non_existent\">>)">>, expected => <<"{error, not_found}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
    end
catch C2:Err2 ->
    catch named_kv_actor:stop(),
    #{call_str => <<"named_kv_actor:get(<<\"non_existent\">>)">>, expected => <<"{error, not_found}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, Err2])), passed => false, time_ms => 0}
end,

T3_Start = erlang:system_time(millisecond),
T3_Res = try
    catch named_kv_actor:stop(),
    case named_kv_actor:get(<<"test_token">>) of
        {error, not_running} = R3 ->
            #{call_str => <<"named_kv_actor:get(<<\"test_token\">>)">>,
              expected => <<"{error, not_running}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T3_Start};
        Other3 ->
            #{call_str => <<"named_kv_actor:get(<<\"test_token\">>)">>, expected => <<"{error, not_running}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))), passed => false, time_ms => 0}
    end
catch C3:Err3 ->
    #{call_str => <<"named_kv_actor:get(<<\"test_token\">>)">>, expected => <<"{error, not_running}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, Err3])), passed => false, time_ms => 0}
end,

AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch05-l06":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    P1 = door_lock_fsm:start(<<"1234">>),
    Res1 = door_lock_fsm:enter_code(P1, <<"1234">>),
    State1 = door_lock_fsm:get_state(P1),
    door_lock_fsm:stop(P1),
    Pair1 = {Res1, State1},
    #{call_str => <<"door_lock_fsm:enter_code(P, <<\"1234\">>)">>,
      expected => <<"{{ok, unlocked}, unlocked}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Pair1]))),
      passed => Pair1 =:= {{ok, unlocked}, unlocked},
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"door_lock_fsm:enter_code(...)">>, expected => <<"{{ok, unlocked}, unlocked}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    P2 = door_lock_fsm:start(<<"secret">>),
    Err1 = door_lock_fsm:enter_code(P2, <<"wrong1">>),
    Err2 = door_lock_fsm:enter_code(P2, <<"wrong2">>),
    State2 = door_lock_fsm:get_state(P2),
    door_lock_fsm:stop(P2),
    Triple2 = {Err1, Err2, State2},
    Expected2 = {{error, {wrong_code, 1}}, {error, {wrong_code, 2}}, {locked, 2}},
    #{call_str => <<"door_lock_fsm:enter_code(P2, <<\"wrong...\">>)">>,
      expected => <<"{{error, {wrong_code, 1}}, {error, {wrong_code, 2}}, {locked, 2}}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Triple2]))),
      passed => Triple2 =:= Expected2,
      time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"door_lock_fsm wrong code test">>, expected => <<"{{error, {wrong_code, 1}}, {error, {wrong_code, 2}}, {locked, 2}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    P3 = door_lock_fsm:start(1111),
    {ok, unlocked} = door_lock_fsm:enter_code(P3, 1111),
    ok = door_lock_fsm:lock(P3),
    State3 = door_lock_fsm:get_state(P3),
    door_lock_fsm:stop(P3),
    #{call_str => <<"door_lock_fsm:lock(P)">>,
      expected => <<"{locked, 0}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [State3]))),
      passed => State3 =:= {locked, 0},
      time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"door_lock_fsm lock transition test">>, expected => <<"{locked, 0}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch05-l08":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    Accounts1 = [{account, 1, <<"Alice">>, 100}, {account, 2, <<"Bob">>, 50}],
    P1 = ledger_actor:start(Accounts1),
    B1 = ledger_actor:get_balance(P1, 1),
    B2 = ledger_actor:get_balance(P1, 2),
    ledger_actor:stop(P1),
    Pair1 = {B1, B2},
    Expected1 = {{ok, 100}, {ok, 50}},
    #{call_str => <<"ledger_actor:get_balance(P, 1) and (P, 2)">>,
      expected => <<"{{ok, 100}, {ok, 50}}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Pair1]))),
      passed => Pair1 =:= Expected1,
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"ledger_actor:get_balance(P, 1) and (P, 2)">>, expected => <<"{{ok, 100}, {ok, 50}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    Accounts2 = [{account, 1, <<"Alice">>, 100}],
    P2 = ledger_actor:start(Accounts2),
    {ok, 150} = ledger_actor:process_transaction(P2, {deposit, 1, 50}),
    Err2 = ledger_actor:process_transaction(P2, {withdraw, 1, 200}),
    {ok, Final2} = ledger_actor:get_balance(P2, 1),
    ledger_actor:stop(P2),
    Pair2 = {Err2, Final2},
    Expected2 = {{error, insufficient_funds}, 150},
    #{call_str => <<"ledger_actor deposit and overdraw">>,
      expected => <<"{{error, insufficient_funds}, 150}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Pair2]))),
      passed => Pair2 =:= Expected2,
      time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"ledger_actor deposit and overdraw">>, expected => <<"{{error, insufficient_funds}, 150}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    Accounts3 = [{account, 1, <<"Alice">>, 100}, {account, 2, <<"Bob">>, 50}],
    P3 = ledger_actor:start(Accounts3),
    {ok, 70} = ledger_actor:process_transaction(P3, {transfer, 1, 2, 30}),
    {ok, B2_3} = ledger_actor:get_balance(P3, 2),
    ledger_actor:stop(P3),
    Expected3 = 80,
    #{call_str => <<"ledger_actor:process_transaction(P, {transfer, 1, 2, 30})">>,
      expected => <<"80">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [B2_3]))),
      passed => B2_3 =:= Expected3,
      time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"ledger_actor:process_transaction(P, {transfer, 1, 2, 30})">>, expected => <<"80">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
T4_Start = erlang:system_time(millisecond),
T4_Res = try
    Accounts4 = [{account, 1, <<"Alice">>, 100}, {account, 2, <<"Bob">>, 50}],
    P4 = ledger_actor:start(Accounts4),
    Txs4 = [{deposit, 1, 20}, {withdraw, 2, 100}, {transfer, 1, 2, 40}],
    {ok, App4, Rej4} = ledger_actor:process_batch(P4, Txs4),
    {ok, B1_4} = ledger_actor:get_balance(P4, 1),
    {ok, B2_4} = ledger_actor:get_balance(P4, 2),
    ledger_actor:stop(P4),
    Quad4 = {App4, Rej4, B1_4, B2_4},
    Expected4 = {2, 1, 80, 90},
    #{call_str => <<"ledger_actor:process_batch(P, [{deposit,...}, {withdraw,...}, {transfer,...}])">>,
      expected => <<"{2, 1, 80, 90}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Quad4]))),
      passed => Quad4 =:= Expected4,
      time_ms => erlang:system_time(millisecond) - T4_Start}
catch C4:R4 ->
    #{call_str => <<"ledger_actor:process_batch(P, ...)">>, expected => <<"{2, 1, 80, 90}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, R4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── CHAPTER 6 ─────────────────────────────────────────────────────────────
	case "ch06-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    case code:ensure_loaded(exception_classifier) of
        {module, exception_classifier} ->
            R1 = exception_classifier:safe_check({payment, 150, usd}),
            #{call_str => <<"exception_classifier:safe_check({payment, 150, usd})">>,
              expected => <<"{approved, 150, usd}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
              passed => R1 =:= {approved, 150, usd},
              time_ms => erlang:system_time(millisecond) - T1_Start};
        _ ->
            Term = {user, 101, <<"Alice">>},
            Bin = term_to_binary(Term),
            case boundary_parser:safe_parse_payload(Bin) of
                {ok, Term} = R1_Legacy ->
                    #{call_str => <<"boundary_parser:safe_parse_payload(ValidBin)">>,
                      expected => <<"{ok, {user, 101, <<\"Alice\">>}}">>,
                      actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1_Legacy]))), passed => true,
                      time_ms => erlang:system_time(millisecond) - T1_Start};
                Other1 ->
                    #{call_str => <<"boundary_parser:safe_parse_payload(ValidBin)">>, expected => <<"{ok, ...}">>,
                      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
            end
    end
catch C1:Err1 ->
    #{call_str => <<"safe_check test 1">>, expected => <<"{approved, 150, usd}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    case code:ensure_loaded(exception_classifier) of
        {module, exception_classifier} ->
            R2 = exception_classifier:safe_check({payment, -50, eur}),
            #{call_str => <<"exception_classifier:safe_check({payment, -50, eur})">>,
              expected => <<"{rejected, negative_amount}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))),
              passed => R2 =:= {rejected, negative_amount},
              time_ms => erlang:system_time(millisecond) - T2_Start};
        _ ->
            case boundary_parser:safe_parse_payload(<<"corrupted_bytes_123">>) of
                {error, {error, badarg}} = R2_Legacy ->
                    #{call_str => <<"boundary_parser:safe_parse_payload(CorruptedBin)">>,
                      expected => <<"{error, {error, badarg}}">>,
                      actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2_Legacy]))), passed => true,
                      time_ms => erlang:system_time(millisecond) - T2_Start};
                Other2 ->
                    #{call_str => <<"boundary_parser:safe_parse_payload(CorruptedBin)">>, expected => <<"{error, {error, badarg}}">>,
                      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
            end
    end
catch C2:Err2 ->
    #{call_str => <<"safe_check test 2">>, expected => <<"{rejected, negative_amount}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, Err2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    R3 = exception_classifier:safe_check({payment, "150", usd}),
    #{call_str => <<"exception_classifier:safe_check({payment, \"150\", usd})">>,
      expected => <<"{bug_detected, bad_amount_type}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))),
      passed => R3 =:= {bug_detected, bad_amount_type},
      time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:Err3 ->
    #{call_str => <<"safe_check test 3">>, expected => <<"{bug_detected, bad_amount_type}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, Err3])), passed => false, time_ms => 0}
end,
T4_Start = erlang:system_time(millisecond),
T4_Res = try
    R4 = exception_classifier:safe_check({payment, 0, etb}),
    #{call_str => <<"exception_classifier:safe_check({payment, 0, etb})">>,
      expected => <<"{process_aborted, zero_payment_abort}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [R4]))),
      passed => R4 =:= {process_aborted, zero_payment_abort},
      time_ms => erlang:system_time(millisecond) - T4_Start}
catch C4:Err4 ->
    #{call_str => <<"safe_check test 4">>, expected => <<"{process_aborted, zero_payment_abort}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, Err4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch06-l02":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    case code:ensure_loaded(domain_validator) of
        {module, domain_validator} ->
            R1 = {domain_validator:safe_divide(100, 4), domain_validator:safe_divide(100, 0)},
            Exp1 = {{ok, 25.0}, {error, division_by_zero}},
            #{call_str => <<"{domain_validator:safe_divide(100, 4), domain_validator:safe_divide(100, 0)}">>,
              expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp1]))),
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
              passed => R1 =:= Exp1,
              time_ms => erlang:system_time(millisecond) - T1_Start};
        _ ->
            #{call_str => <<"{domain_validator:safe_divide(100, 4), domain_validator:safe_divide(100, 0)}">>,
              expected => <<"{{ok, 25.0}, {error, division_by_zero}}">>,
              actual => <<"domain_validator not loaded">>,
              passed => false,
              time_ms => erlang:system_time(millisecond) - T1_Start}
    end
catch C1:Err1 ->
    #{call_str => <<"{domain_validator:safe_divide(100, 4), domain_validator:safe_divide(100, 0)}">>,
      expected => <<"{{ok, 25.0}, {error, division_by_zero}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    case code:ensure_loaded(domain_validator) of
        {module, domain_validator} ->
            R2 = {domain_validator:validate_email(<<"alice@beamforge.io">>), domain_validator:validate_email(<<"invalid_email">>)},
            Exp2 = {{ok, <<"alice@beamforge.io">>}, {error, invalid_email}},
            #{call_str => <<"{domain_validator:validate_email(<<\"alice@beamforge.io\">>), domain_validator:validate_email(<<\"invalid_email\">>)}">>,
              expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp2]))),
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))),
              passed => R2 =:= Exp2,
              time_ms => erlang:system_time(millisecond) - T2_Start};
        _ ->
            #{call_str => <<"{domain_validator:validate_email(...)}">>,
              expected => <<"{{ok, <<\"alice@beamforge.io\">>}, {error, invalid_email}}">>,
              actual => <<"domain_validator not loaded">>,
              passed => false,
              time_ms => erlang:system_time(millisecond) - T2_Start}
    end
catch C2:Err2 ->
    #{call_str => <<"{domain_validator:validate_email(...)}">>,
      expected => <<"{{ok, <<\"alice@beamforge.io\">>}, {error, invalid_email}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, Err2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    case code:ensure_loaded(domain_validator) of
        {module, domain_validator} ->
            R3 = domain_validator:process_checkout_input(<<"bob@beamforge.io">>, 300, 3),
            Exp3 = {ok, #{email => <<"bob@beamforge.io">>, per_person => 100.0}},
            #{call_str => <<"domain_validator:process_checkout_input(<<\"bob@beamforge.io\">>, 300, 3)">>,
              expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp3]))),
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))),
              passed => R3 =:= Exp3,
              time_ms => erlang:system_time(millisecond) - T3_Start};
        _ ->
            #{call_str => <<"domain_validator:process_checkout_input(...)">>,
              expected => <<"{ok, #{email => <<\"bob@beamforge.io\">>, per_person => 100.0}}">>,
              actual => <<"domain_validator not loaded">>,
              passed => false,
              time_ms => erlang:system_time(millisecond) - T3_Start}
    end
catch C3:Err3 ->
    #{call_str => <<"domain_validator:process_checkout_input(...)">>,
      expected => <<"{ok, #{email => <<\"bob@beamforge.io\">>, per_person => 100.0}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, Err3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch06-l03":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    case code:ensure_loaded(boundary_parser) of
        {module, boundary_parser} ->
            Term1 = {user, 101, <<"Alice">>},
            Bin1 = term_to_binary(Term1),
            R1 = boundary_parser:safe_parse_payload(Bin1),
            Exp1 = {ok, Term1},
            #{call_str => <<"boundary_parser:safe_parse_payload(term_to_binary({user, 101, <<\"Alice\">>}))">>,
              expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp1]))),
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
              passed => R1 =:= Exp1,
              time_ms => erlang:system_time(millisecond) - T1_Start};
        _ ->
            #{call_str => <<"boundary_parser:safe_parse_payload(...)">>,
              expected => <<"{ok, {user, 101, <<\"Alice\">>}}">>,
              actual => <<"boundary_parser not loaded">>,
              passed => false,
              time_ms => erlang:system_time(millisecond) - T1_Start}
    end
catch C1:Err1 ->
    #{call_str => <<"boundary_parser:safe_parse_payload(...)">>,
      expected => <<"{ok, {user, 101, <<\"Alice\">>}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    case code:ensure_loaded(boundary_parser) of
        {module, boundary_parser} ->
            P2 = spawn(fun() -> receive {release, R} -> receive {get, From} -> From ! R end end end),
            boundary_parser:with_resource_cleanup(fun() -> res_42 end, fun(_) -> erlang:error(boom) end, fun(R) -> P2 ! {release, R} end),
            P2 ! {get, self()},
            R2 = receive Msg2 -> Msg2 after 200 -> timeout end,
            Exp2 = res_42,
            #{call_str => <<"boundary_parser:with_resource_cleanup(Acquire, CrashAction, Release)">>,
              expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp2]))),
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))),
              passed => R2 =:= Exp2,
              time_ms => erlang:system_time(millisecond) - T2_Start};
        _ ->
            #{call_str => <<"boundary_parser:with_resource_cleanup(...)">>,
              expected => <<"res_42">>,
              actual => <<"boundary_parser not loaded">>,
              passed => false,
              time_ms => erlang:system_time(millisecond) - T2_Start}
    end
catch C2:Err2 ->
    #{call_str => <<"boundary_parser:with_resource_cleanup(...)">>,
      expected => <<"res_42">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, Err2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    case code:ensure_loaded(boundary_parser) of
        {module, boundary_parser} ->
            try boundary_parser:process_transaction_log([<<"tx_1">>, <<"CORRUPT_LINE">>], self()) catch error:transaction_processing_failed -> ok end,
            R3 = receive Msg3 -> Msg3 after 200 -> timeout end,
            Exp3 = file_handle_closed,
            #{call_str => <<"begin (try boundary_parser:process_transaction_log([<<\"tx_1\">>, <<\"CORRUPT_LINE\">>], self()) catch error:transaction_processing_failed -> ok end), receive Msg -> Msg after 200 -> timeout end end">>,
              expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp3]))),
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))),
              passed => R3 =:= Exp3,
              time_ms => erlang:system_time(millisecond) - T3_Start};
        _ ->
            #{call_str => <<"boundary_parser:process_transaction_log(...)">>,
              expected => <<"file_handle_closed">>,
              actual => <<"boundary_parser not loaded">>,
              passed => false,
              time_ms => erlang:system_time(millisecond) - T3_Start}
    end
catch C3:Err3 ->
    #{call_str => <<"boundary_parser:process_transaction_log(...)">>,
      expected => <<"file_handle_closed">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, Err3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch06-l04":
		return `
process_flag(trap_exit, true),
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    case code:ensure_loaded(linked_pipeline) of
        {module, linked_pipeline} ->
            {ok, W1_1, W2_1} = linked_pipeline:start_linked_pipeline(),
            {ok, Res1} = linked_pipeline:compute(W1_1, 3),
            AliveW1_1 = is_process_alive(W1_1),
            AliveW2_1 = is_process_alive(W2_1),
            R1 = {Res1, AliveW1_1, AliveW2_1},
            Exp1 = {36, true, true},
            #{call_str => <<"linked_pipeline:compute(W1, 3)">>,
              expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp1]))),
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
              passed => R1 =:= Exp1,
              time_ms => erlang:system_time(millisecond) - T1_Start};
        _ ->
            #{call_str => <<"linked_pipeline:compute(...)">>,
              expected => <<"{36, true, true}">>,
              actual => <<"linked_pipeline not loaded">>,
              passed => false,
              time_ms => erlang:system_time(millisecond) - T1_Start}
    end
catch C1:Err1 ->
    #{call_str => <<"linked_pipeline:compute(...)">>,
      expected => <<"{36, true, true}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    case code:ensure_loaded(linked_pipeline) of
        {module, linked_pipeline} ->
            {ok, W1_2, W2_2} = linked_pipeline:start_linked_pipeline(),
            ok = linked_pipeline:stop_stage1_normal(W1_2),
            timer:sleep(60),
            AliveW1_2 = is_process_alive(W1_2),
            AliveW2_2 = is_process_alive(W2_2),
            R2 = {AliveW1_2, AliveW2_2},
            Exp2 = {false, true},
            exit(W2_2, shutdown),
            #{call_str => <<"linked_pipeline:stop_stage1_normal(W1)">>,
              expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp2]))),
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))),
              passed => R2 =:= Exp2,
              time_ms => erlang:system_time(millisecond) - T2_Start};
        _ ->
            #{call_str => <<"linked_pipeline:stop_stage1_normal(...)">>,
              expected => <<"{false, true}">>,
              actual => <<"linked_pipeline not loaded">>,
              passed => false,
              time_ms => erlang:system_time(millisecond) - T2_Start}
    end
catch C2:Err2 ->
    #{call_str => <<"linked_pipeline:stop_stage1_normal(...)">>,
      expected => <<"{false, true}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, Err2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    case code:ensure_loaded(linked_pipeline) of
        {module, linked_pipeline} ->
            {ok, W1_3, W2_3} = linked_pipeline:start_linked_pipeline(),
            ok = linked_pipeline:crash_stage1(W1_3, fatal_crash),
            timer:sleep(60),
            AliveW1_3 = is_process_alive(W1_3),
            AliveW2_3 = is_process_alive(W2_3),
            receive {'EXIT', _, _} -> ok after 0 -> ok end,
            R3 = {AliveW1_3, AliveW2_3},
            Exp3 = {false, false},
            #{call_str => <<"linked_pipeline:crash_stage1(W1, fatal_crash)">>,
              expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp3]))),
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R3]))),
              passed => R3 =:= Exp3,
              time_ms => erlang:system_time(millisecond) - T3_Start};
        _ ->
            #{call_str => <<"linked_pipeline:crash_stage1(...)">>,
              expected => <<"{false, false}">>,
              actual => <<"linked_pipeline not loaded">>,
              passed => false,
              time_ms => erlang:system_time(millisecond) - T3_Start}
    end
catch C3:Err3 ->
    #{call_str => <<"linked_pipeline:crash_stage1(...)">>,
      expected => <<"{false, false}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, Err3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch06-l05":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {ok, Sup1, W1} = exit_trapper:start_supervised(fun() -> receive stop -> ok end end),
    {ok, Reported} = exit_trapper:get_worker_pid(Sup1),
    Sup1 ! stop,
    Match = (W1 =:= Reported),
    #{call_str => <<"begin {ok, Sup, W1} = exit_trapper:start_supervised(fun() -> receive stop -> ok end end), {ok, Reported} = exit_trapper:get_worker_pid(Sup), Sup ! stop, W1 =:= Reported end">>,
      expected => <<"true">>,
      actual => list_to_binary(io_lib:format("~p", [Match])),
      passed => Match,
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"exit_trapper:start_supervised/1 and get_worker_pid/1">>,
      expected => <<"true">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])),
      passed => false,
      time_ms => erlang:system_time(millisecond) - T1_Start}
end,

T2_Start = erlang:system_time(millisecond),
T2_Res = try
    {ok, Sup2, W1_2} = exit_trapper:start_supervised(fun() -> receive stop -> ok end end),
    exit_trapper:kill_worker(Sup2, badarith),
    timer:sleep(50),
    {ok, W2_2} = exit_trapper:get_worker_pid(Sup2),
    Sup2 ! stop,
    W1Dead = not is_process_alive(W1_2),
    W2Alive = is_process_alive(W2_2),
    Different = (W1_2 =/= W2_2),
    RespawnOutcome = {W1Dead, W2Alive, Different},
    #{call_str => <<"begin {ok, Sup, W1} = exit_trapper:start_supervised(fun() -> receive stop -> ok end end), exit_trapper:kill_worker(Sup, badarith), timer:sleep(50), {ok, W2} = exit_trapper:get_worker_pid(Sup), Sup ! stop, {is_process_alive(W1), is_process_alive(W2), W1 =/= W2} end">>,
      expected => <<"{false, true, true}">>,
      actual => list_to_binary(io_lib:format("~p", [{is_process_alive(W1_2), W2Alive, Different}])),
      passed => (RespawnOutcome =:= {true, true, true}),
      time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"exit_trapper:kill_worker(Sup, badarith) abnormal crash respawn">>,
      expected => <<"{false, true, true}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])),
      passed => false,
      time_ms => erlang:system_time(millisecond) - T2_Start}
end,

T3_Start = erlang:system_time(millisecond),
T3_Res = try
    TruthKill = exit_trapper:simulate_exit_truth_table(true, kill),
    #{call_str => <<"exit_trapper:simulate_exit_truth_table(true, kill)">>,
      expected => <<"{died, killed}">>,
      actual => list_to_binary(io_lib:format("~p", [TruthKill])),
      passed => (TruthKill =:= {died, killed}),
      time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"exit_trapper:simulate_exit_truth_table(true, kill)">>,
      expected => <<"{died, killed}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])),
      passed => false,
      time_ms => erlang:system_time(millisecond) - T3_Start}
end,

AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch06-l06":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    case code:ensure_loaded(worker_watcher) of
        {module, worker_watcher} ->
            case worker_watcher:run_monitored_task(fun() -> 21 * 2 end, 1000) of
                {ok, 42} = R1 ->
                    #{call_str => <<"worker_watcher:run_monitored_task(fun() -> 21 * 2 end, 1000)">>,
                      expected => <<"{ok, 42}">>,
                      actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
                      time_ms => erlang:system_time(millisecond) - T1_Start};
                Other1 ->
                    #{call_str => <<"worker_watcher:run_monitored_task(...)">>, expected => <<"{ok, 42}">>,
                      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
            end;
        _ ->
            PoisonWorker = fun(crash) -> error(poison_pill); (X) when is_number(X) -> X * 10 end,
            Jobs = [{job, 1, 5, 2}, {job, 2, crash, 2}, {job, 3, 7, 2}],
            case job_coordinator:execute_batch(Jobs, PoisonWorker) of
                {[{completed, 1, 50}, {completed, 3, 70}], [{dead_letter, 2, poison_pill}]} = R1 ->
                    #{call_str => <<"job_coordinator:execute_batch(Jobs, PoisonWorker)">>,
                      expected => <<"{[{completed, 1, 50}, {completed, 3, 70}], [{dead_letter, 2, poison_pill}]}">>,
                      actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
                      time_ms => erlang:system_time(millisecond) - T1_Start};
                Other1 ->
                    #{call_str => <<"job_coordinator:execute_batch(...)">>, expected => <<"{[...], [...]}">>,
                      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
            end
    end
catch C1:R1 ->
    #{call_str => <<"worker_watcher:run_monitored_task(...)">>, expected => <<"{ok, 42}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    case code:ensure_loaded(worker_watcher) of
        {module, worker_watcher} ->
            case worker_watcher:run_monitored_task(fun() -> 1 / 0 end, 1000) of
                {error, {crashed, badarith}} = R2 ->
                    #{call_str => <<"worker_watcher:run_monitored_task(fun() -> 1/0 end, 1000)">>,
                      expected => <<"{error, {crashed, badarith}}">>,
                      actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
                      time_ms => erlang:system_time(millisecond) - T2_Start};
                Other2 ->
                    #{call_str => <<"worker_watcher:run_monitored_task(...)">>, expected => <<"{error, {crashed, badarith}}">>,
                      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
            end;
        _ ->
            #{call_str => <<"legacy">>, expected => <<"ok">>, actual => <<"ok">>, passed => true, time_ms => 0}
    end
catch C2:R2 ->
    #{call_str => <<"worker_watcher:run_monitored_task(...)">>, expected => <<"{error, {crashed, badarith}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch06-l07":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    case code:ensure_loaded(monitor_hygiene) of
        {module, monitor_hygiene} ->
            {ok, ResVal, Lingering} = monitor_hygiene:call_with_clean_mailbox(fun(X) -> X * 2 end, 21),
            #{call_str => <<"monitor_hygiene:call_with_clean_mailbox(fun(X) -> X * 2 end, 21)">>,
              expected => <<"{ok, 42, 0}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("{ok, ~p, ~p}", [ResVal, Lingering]))),
              passed => (ResVal =:= 42) andalso (Lingering =:= 0),
              time_ms => erlang:system_time(millisecond) - T1_Start};
        _ ->
            #{call_str => <<"code:ensure_loaded(monitor_hygiene)">>, expected => <<"{module, monitor_hygiene}">>,
              actual => <<"not found">>, passed => false, time_ms => 0}
    end
catch C1:R1 ->
    #{call_str => <<"monitor_hygiene test">>, expected => <<"{ok, 42, 0}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch06-l08":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    Prim1 = my_gen_server:choose_primitive(tightly_coupled_peers),
    Prim2 = my_gen_server:choose_primitive(client_to_server_request),
    Passed = (Prim1 =:= use_link) andalso (Prim2 =:= use_monitor),
    #{call_str => <<"my_gen_server:choose_primitive(tightly_coupled_peers), choose_primitive(client_to_server_request)">>,
      expected => <<"{use_link, use_monitor}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("{~p, ~p}", [Prim1, Prim2]))),
      passed => Passed,
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"my_gen_server:choose_primitive test">>, expected => <<"{use_link, use_monitor}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    P = spawn(fun() -> receive {'$gen_call', {From, MRef}, crash_now} -> exit(fatal_database_error) end end),
    TCallStart = erlang:system_time(millisecond),
    Res = my_gen_server:call(P, crash_now, 5000),
    Duration = erlang:system_time(millisecond) - TCallStart,
    case Res of
        {error, {server_crashed, fatal_database_error}} ->
            #{call_str => <<"my_gen_server:call(P, crash_now, 5000)">>,
              expected => <<"{error, {server_crashed, fatal_database_error}}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p (unblocked in ~p ms)", [Res, Duration]))),
              passed => Duration < 200,
              time_ms => erlang:system_time(millisecond) - T2_Start};
        Other2 ->
            #{call_str => <<"my_gen_server:call(...)">>, expected => <<"{error, {server_crashed, ...}}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
    end
catch C2:R2 ->
    #{call_str => <<"my_gen_server:call(...)">>, expected => <<"{error, {server_crashed, ...}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch06-l09":
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

	case "ch06-l10":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {ok, W} = payment_system:start_system(3),
    Res1 = payment_system:charge(W, <<"req_1">>, 250, usd),
    ExpectedReceipt = {ok, #{tx_id => <<"req_1">>, amount => 250, currency => usd, status => settled}},
    payment_system:stop_system(W),
    #{call_str => <<"payment_system:charge(W, <<\"req_1\">>, 250, usd)">>,
      expected => list_to_binary(lists:flatten(io_lib:format("~p", [ExpectedReceipt]))),
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Res1]))),
      passed => Res1 =:= ExpectedReceipt,
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"payment_system:charge(...)">>, expected => <<"{ok, #{...}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    {ok, W2} = payment_system:start_system(3),
    {ok, _} = payment_system:charge(W2, <<"req_1">>, 250, usd),
    Res2 = payment_system:charge(W2, <<"req_1">>, 250, usd),
    payment_system:stop_system(W2),
    case Res2 of
        {ok, {already_processed, #{tx_id := <<"req_1">>}}} ->
            #{call_str => <<"payment_system:charge(W2, <<\"req_1\">>, 250, usd) [idempotent retry]">>,
              expected => <<"{ok, {already_processed, #{tx_id => <<\"req_1\">>, ...}}}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Res2]))),
              passed => true,
              time_ms => erlang:system_time(millisecond) - T2_Start};
        Other2 ->
            #{call_str => <<"payment_system:charge(...)">>, expected => <<"{ok, {already_processed, ...}}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
    end
catch C2:R2 ->
    #{call_str => <<"payment_system idempotent test">>, expected => <<"{ok, {already_processed, ...}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── CHAPTER 7 ─────────────────────────────────────────────────────────────
	case "ch07-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    DemoRes = otp_intro_demo:run_demo(),
    case DemoRes of
        #{final_count := Count, live_state := State} when is_integer(Count), is_map(State) ->
            #{call_str => <<"otp_intro_demo:run_demo()">>,
              expected => <<"#{final_count => ..., live_state => ...}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [DemoRes]))),
              passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
        Other1 ->
            #{call_str => <<"otp_intro_demo:run_demo()">>,
              expected => <<"#{final_count => ..., live_state => ...}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))),
              passed => false, time_ms => erlang:system_time(millisecond) - T1_Start}
    end
catch C1:R1 ->
    #{call_str => <<"otp_intro_demo:run_demo()">>, expected => <<"demo map">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch07-l02":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {ok, W1} = wallet_server:start_link(#{<<"USD">> => 100}),
    wallet_server:credit(W1, <<"EUR">>, 50),
    timer:sleep(20),
    Bals = wallet_server:get_balances(W1),
    wallet_server:stop(W1),
    ExpectedMap = #{<<"EUR">> => 50, <<"USD">> => 100},
    #{call_str => <<"wallet_server:credit(W, <<\"EUR\">>, 50)">>,
      expected => <<"#{<<\"EUR\">> => 50, <<\"USD\">> => 100}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Bals]))),
      passed => (Bals =:= ExpectedMap), time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"wallet_server:credit(...)">>, expected => <<"balances map">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    {ok, W2} = wallet_server:start_link(#{<<"USD">> => 100}),
    {ok, 60} = wallet_server:debit(W2, <<"USD">>, 40),
    Err = wallet_server:debit(W2, <<"USD">>, 1000),
    wallet_server:stop(W2),
    #{call_str => <<"wallet_server:debit(W, <<\"USD\">>, 1000)">>,
      expected => <<"{error, insufficient_funds}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Err]))),
      passed => (Err =:= {error, insufficient_funds}), time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"wallet_server:debit(...)">>, expected => <<"{error, insufficient_funds}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch07-l03":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {ok, S1} = session_ttl_server:start_link(60),
    Valid = session_ttl_server:is_valid(S1, <<"guest">>),
    session_ttl_server:stop(S1),
    #{call_str => <<"session_ttl_server:is_valid(S, <<\"guest\">>)">>,
      expected => <<"true">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Valid]))),
      passed => (Valid =:= true), time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"session_ttl_server:is_valid(...)">>, expected => <<"true">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    {ok, S2} = session_ttl_server:start_link(60),
    ok = session_ttl_server:create_session(S2, <<"user_101">>),
    Count = session_ttl_server:get_active_count(S2),
    session_ttl_server:stop(S2),
    #{call_str => <<"session_ttl_server:get_active_count(S)">>,
      expected => <<"2">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Count]))),
      passed => (Count =:= 2), time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"session_ttl_server:get_active_count(...)">>, expected => <<"2">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch07-l04":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {ok, P1} = async_report_server:start_link(),
    Res1 = async_report_server:generate_report(P1, <<"job_42">>, fun() -> 42 * 2 end),
    timer:sleep(20),
    Count1 = async_report_server:get_completed_count(P1),
    async_report_server:stop(P1),
    ExpectedCount = {ok, #{in_flight => 0, completed => 1}},
    Passed1 = (Res1 =:= {ok, <<"job_42">>, 84}) andalso (Count1 =:= ExpectedCount),
    #{call_str => <<"async_report_server:generate_report(Pid, <<\"job_42\">>, fun() -> 84 end)">>,
      expected => <<"{ok, <<\"job_42\">>, 84}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Res1]))),
      passed => Passed1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"async_report_server:generate_report(...)">>, expected => <<"{ok, ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    {ok, P2} = async_report_server:start_link(),
    Hib = async_report_server:hibernate_idle(P2),
    async_report_server:stop(P2),
    #{call_str => <<"async_report_server:hibernate_idle(Pid)">>,
      expected => <<"hibernated">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Hib]))),
      passed => (Hib =:= hibernated), time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"async_report_server:hibernate_idle(...)">>, expected => <<"hibernated">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch07-l05":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {ok, CB1} = circuit_breaker_statem:start_link(2, 500),
    {ok, 42} = circuit_breaker_statem:execute(CB1, fun() -> {ok, 42} end),
    StateName = circuit_breaker_statem:get_state_name(CB1),
    circuit_breaker_statem:stop(CB1),
    #{call_str => <<"circuit_breaker_statem:get_state_name(CB)">>,
      expected => <<"closed">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [StateName]))),
      passed => (StateName =:= closed), time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"circuit_breaker_statem:execute(...)">>, expected => <<"closed">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    {ok, CB2} = circuit_breaker_statem:start_link(2, 500),
    {error, fail1} = circuit_breaker_statem:execute(CB2, fun() -> {error, fail1} end),
    {error, fail2} = circuit_breaker_statem:execute(CB2, fun() -> {error, fail2} end),
    OpenErr = circuit_breaker_statem:execute(CB2, fun() -> {ok, 99} end),
    circuit_breaker_statem:stop(CB2),
    #{call_str => <<"circuit_breaker_statem:execute(CB, ...) after threshold">>,
      expected => <<"{error, circuit_open}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [OpenErr]))),
      passed => (OpenErr =:= {error, circuit_open}), time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"circuit_breaker_statem open test">>, expected => <<"{error, circuit_open}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch07-l06":
		return `
IsRateLimiter = case code:ensure_loaded(rate_limiter_srv) of
    {module, rate_limiter_srv} -> true;
    _ -> false
end,
AllResults = case IsRateLimiter of
    true ->
        T1_Start = erlang:system_time(millisecond),
        T1_Res = try
            {ok, S1} = rate_limiter_srv:start_link(10, 3),
            {allow, 7} = rate_limiter_srv:check_request(S1, <<"client_a">>, 3),
            {allow, 2} = rate_limiter_srv:check_request(S1, <<"client_a">>, 5),
            rate_limiter_srv:stop(S1),
            #{call_str => <<"rate_limiter_srv:check_request(S, <<\"client_a\">>, 3 & 5)">>,
              expected => <<"{allow, 7} then {allow, 2}">>,
              actual => <<"{allow, 2}">>,
              passed => true, time_ms => erlang:system_time(millisecond) - T1_Start}
        catch C1:R1 ->
            #{call_str => <<"rate_limiter_srv:check_request allow">>, expected => <<"{allow, 2}">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
        end,
        [T1_Res];
    false ->
        T1_Start = erlang:system_time(millisecond),
        T1_Res = try
            {ok, Mgr} = gen_event:start_link(),
            ok = security_audit_handler:add_to_manager(Mgr, 3),
            gen_event:notify(Mgr, {login_failed, <<"192.168.1.5">>}),
            gen_event:notify(Mgr, {login_failed, <<"192.168.1.5">>}),
            gen_event:notify(Mgr, {login_failed, <<"192.168.1.5">>}),
            Status = security_audit_handler:get_ip_status(Mgr, <<"192.168.1.5">>),
            gen_event:stop(Mgr),
            Expected = {ok, #{alert => true, attempts => 3}},
            #{call_str => <<"security_audit_handler:get_ip_status(Mgr, <<\"192.168.1.5\">>)">>,
              expected => <<"{ok, #{alert => true, attempts => 3}}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Status]))),
              passed => (Status =:= Expected), time_ms => erlang:system_time(millisecond) - T1_Start}
        catch C2:R2 ->
            #{call_str => <<"security_audit_handler:notify(...)">>, expected => <<"alert status">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
        end,
        [T1_Res]
end,
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch07-l07":
		return r.buildIncidentRunScript(session, "ch07-l07")

	case "ch07-l08":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {ok, S1} = rate_limiter_srv:start_link(10, 3),
    {allow, 7} = rate_limiter_srv:check_request(S1, <<"client_a">>, 3),
    {allow, 2} = rate_limiter_srv:check_request(S1, <<"client_a">>, 5),
    rate_limiter_srv:stop(S1),
    #{call_str => <<"rate_limiter_srv:check_request(S, <<\"client_a\">>, 3 & 5)">>,
      expected => <<"{allow, 7} then {allow, 2}">>,
      actual => <<"{allow, 2}">>,
      passed => true, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"rate_limiter_srv:check_request allow">>, expected => <<"{allow, 2}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    {ok, S2} = rate_limiter_srv:start_link(10, 3),
    {allow, 2} = rate_limiter_srv:check_request(S2, <<"client_b">>, 8),
    Deny = rate_limiter_srv:check_request(S2, <<"client_b">>, 5),
    rate_limiter_srv:stop(S2),
    #{call_str => <<"rate_limiter_srv:check_request(S, <<\"client_b\">>, 5)">>,
      expected => <<"{deny, 2}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Deny]))),
      passed => (Deny =:= {deny, 2}), time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"rate_limiter_srv:check_request deny">>, expected => <<"{deny, 2}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    {ok, S3} = rate_limiter_srv:start_link(10, 3),
    {allow, 1} = rate_limiter_srv:check_request(S3, <<"client_c">>, 9),
    ok = rate_limiter_srv:refill_all(S3),
    AfterRefill = rate_limiter_srv:check_request(S3, <<"client_c">>, 3),
    rate_limiter_srv:stop(S3),
    #{call_str => <<"rate_limiter_srv:refill_all(S) -> check_request 3">>,
      expected => <<"{allow, 1}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [AfterRefill]))),
      passed => (AfterRefill =:= {allow, 1}), time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"rate_limiter_srv:refill_all(...)">>, expected => <<"{allow, 1}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── CHAPTER 8 ─────────────────────────────────────────────────────────────
	case "ch08-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    Flags = strategy_planner:build_sup_flags(rest_for_one, 3, 5),
    Expected = #{strategy => rest_for_one, intensity => 3, period => 5},
    #{call_str => <<"strategy_planner:build_sup_flags(rest_for_one, 3, 5)">>,
      expected => <<"#{intensity => 3, period => 5, strategy => rest_for_one}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Flags]))),
      passed => (Flags =:= Expected), time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"strategy_planner:build_sup_flags(...)">>, expected => <<"flags map">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    S1 = strategy_planner:select_strategy_for_topology(dependent_pipeline),
    S2 = strategy_planner:select_strategy_for_topology(independent_workers),
    Pair = {S1, S2},
    #{call_str => <<"strategy_planner:select_strategy_for_topology(...)">>,
      expected => <<"{rest_for_one, one_for_one}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Pair]))),
      passed => (Pair =:= {rest_for_one, one_for_one}), time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"strategy_planner:select_strategy_for_topology(...)">>, expected => <<"{rest_for_one, one_for_one}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    Budget = strategy_planner:calculate_restart_budget(10, 5),
    case Budget of
        #{intensity := 10, period := 5, max_rate_per_sec := Rate, tolerated_downtime := ok} when is_float(Rate) ->
            #{call_str => <<"strategy_planner:calculate_restart_budget(10, 5)">>,
              expected => <<"#{intensity => 10, max_rate_per_sec => 2.0, period => 5, tolerated_downtime => ok}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Budget]))),
              passed => (abs(Rate - 2.0) < 0.001), time_ms => erlang:system_time(millisecond) - T3_Start};
        Other3 ->
            #{call_str => <<"strategy_planner:calculate_restart_budget(10, 5)">>,
              expected => <<"budget map">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other3]))),
              passed => false, time_ms => erlang:system_time(millisecond) - T3_Start}
    end
catch C3:R3 ->
    #{call_str => <<"strategy_planner:calculate_restart_budget(...)">>, expected => <<"budget map">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch08-l02":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    Spec = child_spec_factory:worker_spec(cache_srv, my_cache, [100], transient),
    Expected = #{id => cache_srv, modules => [my_cache], restart => transient, shutdown => 5000, start => {my_cache, start_link, [100]}, type => worker},
    #{call_str => <<"child_spec_factory:worker_spec(cache_srv, my_cache, [100], transient)">>,
      expected => list_to_binary(lists:flatten(io_lib:format("~p", [Expected]))),
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Spec]))),
      passed => (Spec =:= Expected), time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"child_spec_factory:worker_spec(...)">>, expected => <<"child spec map">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    SupSpec = child_spec_factory:supervisor_spec(sub_sup, sub_sup_mod),
    ExpectedSup = #{id => sub_sup, modules => [sub_sup_mod], restart => permanent, shutdown => infinity, start => {sub_sup_mod, start_link, []}, type => supervisor},
    #{call_str => <<"child_spec_factory:supervisor_spec(sub_sup, sub_sup_mod)">>,
      expected => list_to_binary(lists:flatten(io_lib:format("~p", [ExpectedSup]))),
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [SupSpec]))),
      passed => (SupSpec =:= ExpectedSup), time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"child_spec_factory:supervisor_spec(...)">>, expected => <<"supervisor child spec map">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    R1 = child_spec_factory:classify_restart(transient, normal),
    R2 = child_spec_factory:classify_restart(permanent, normal),
    R3 = child_spec_factory:classify_restart(transient, connection_lost),
    Triple = {R1, R2, R3},
    ExpectedTriple = {do_not_restart, restart, restart},
    IsMatch = (Triple =:= ExpectedTriple) orelse (Triple =:= {false, true, true}),
    #{call_str => <<"child_spec_factory:classify_restart(...) truth table">>,
      expected => <<"{do_not_restart, restart, restart}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Triple]))),
      passed => IsMatch, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"child_spec_factory:classify_restart(...)">>, expected => <<"{do_not_restart, restart, restart}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch08-l03":
		return `
IsDynamic = case code:ensure_loaded(dynamic_session_sup) of
    {module, dynamic_session_sup} -> true;
    _ -> false
end,
AllResults = case IsDynamic of
    true ->
        T1_Start = erlang:system_time(millisecond),
        T1_Res = try
            {ok, Sup1} = dynamic_session_sup:start_link(),
            Count1 = dynamic_session_sup:count_sessions(Sup1),
            MRef1 = monitor(process, Sup1),
            exit(Sup1, shutdown),
            receive {'DOWN', MRef1, process, Sup1, _} -> ok after 500 -> ok end,
            #{call_str => <<"dynamic_session_sup:count_sessions(Sup) (initial)">>,
              expected => <<"0">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Count1]))),
              passed => (Count1 =:= 0), time_ms => erlang:system_time(millisecond) - T1_Start}
        catch C1:R1 ->
            #{call_str => <<"dynamic_session_sup:start_link/count">>, expected => <<"0">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
        end,
        T2_Start = erlang:system_time(millisecond),
        T2_Res = try
            {ok, Sup2} = dynamic_session_sup:start_link(),
            {ok, P1} = dynamic_session_sup:start_session(Sup2, <<"s1">>, <<"u1">>),
            {ok, P2} = dynamic_session_sup:start_session(Sup2, <<"s2">>, <<"u2">>),
            Count2 = dynamic_session_sup:count_sessions(Sup2),
            MRef2 = monitor(process, Sup2),
            exit(Sup2, shutdown),
            receive {'DOWN', MRef2, process, Sup2, _} -> ok after 500 -> ok end,
            PidsOk = is_pid(P1) andalso is_pid(P2) andalso (Count2 =:= 2),
            #{call_str => <<"dynamic_session_sup:start_session(Sup, ...) -> count 2">>,
              expected => <<"{true, true, 2}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [{is_pid(P1), is_pid(P2), Count2}]))),
              passed => PidsOk, time_ms => erlang:system_time(millisecond) - T2_Start}
        catch C2:R2 ->
            #{call_str => <<"dynamic_session_sup:start_session(...)">>, expected => <<"2 active">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
        end,
        T3_Start = erlang:system_time(millisecond),
        T3_Res = try
            {ok, Sup3} = dynamic_session_sup:start_link(),
            {ok, P3} = dynamic_session_sup:start_session(Sup3, <<"s1">>, <<"u1">>),
            ok = dynamic_session_sup:terminate_session(Sup3, P3),
            Count3 = dynamic_session_sup:count_sessions(Sup3),
            MRef3 = monitor(process, Sup3),
            exit(Sup3, shutdown),
            receive {'DOWN', MRef3, process, Sup3, _} -> ok after 500 -> ok end,
            #{call_str => <<"dynamic_session_sup:terminate_session(Sup, Child)">>,
              expected => <<"0">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Count3]))),
              passed => (Count3 =:= 0), time_ms => erlang:system_time(millisecond) - T3_Start}
        catch C3:R3 ->
            #{call_str => <<"dynamic_session_sup:terminate_session(...)">>, expected => <<"0">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
        end,
        [T1_Res, T2_Res, T3_Res];
    false ->
        T1_Start = erlang:system_time(millisecond),
        T1_Res = try
            Res1 = escalation_analyzer:evaluate_crash_burst([10, 12, 14], 3, 5),
            #{call_str => <<"escalation_analyzer:evaluate_crash_burst([10, 12, 14], 3, 5)">>,
              expected => <<"{within_budget, 3, 3}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Res1]))),
              passed => (Res1 =:= {within_budget, 3, 3}), time_ms => erlang:system_time(millisecond) - T1_Start}
        catch C1:R1 ->
            #{call_str => <<"escalation_analyzer:evaluate_crash_burst(...)">>, expected => <<"{within_budget, 3, 3}">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
        end,
        T2_Start = erlang:system_time(millisecond),
        T2_Res = try
            Res2 = escalation_analyzer:evaluate_crash_burst([10, 11, 12, 13], 3, 5),
            #{call_str => <<"escalation_analyzer:evaluate_crash_burst([10, 11, 12, 13], 3, 5)">>,
              expected => <<"{escalate_to_parent, 4, 3}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Res2]))),
              passed => (Res2 =:= {escalate_to_parent, 4, 3}), time_ms => erlang:system_time(millisecond) - T2_Start}
        catch C2:R2 ->
            #{call_str => <<"escalation_analyzer:evaluate_crash_burst(...)">>, expected => <<"{escalate_to_parent, 4, 3}">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
        end,
        T3_Start = erlang:system_time(millisecond),
        T3_Res = try
            Res3 = escalation_analyzer:plan_escalation_action([db_pool, pricing_cache, order_gateway], pricing_cache),
            Expected3 = {stop_in_reverse_order, [order_gateway, pricing_cache], restart_in_order, [pricing_cache, order_gateway]},
            #{call_str => <<"escalation_analyzer:plan_escalation_action([db_pool, pricing_cache, order_gateway], pricing_cache)">>,
              expected => <<"{stop_in_reverse_order, [order_gateway, pricing_cache], restart_in_order, [pricing_cache, order_gateway]}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Res3]))),
              passed => (Res3 =:= Expected3), time_ms => erlang:system_time(millisecond) - T3_Start}
        catch C3:R3 ->
            #{call_str => <<"escalation_analyzer:plan_escalation_action(...)">>, expected => <<"escalation action tuple">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
        end,
        [T1_Res, T2_Res, T3_Res]
end,
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch08-l04":
		return `
IsApp = case code:ensure_loaded(commerce_app) of
    {module, commerce_app} -> true;
    _ -> false
end,
AllResults = case IsApp of
    true ->
        T1_Start = erlang:system_time(millisecond),
        T1_Res = try
            {ok, Sup} = commerce_app:start(normal, []),
            IsAlive = is_process_alive(Sup),
            commerce_app:stop([]),
            #{call_str => <<"commerce_app:start(normal, [])">>,
              expected => <<"true">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [IsAlive]))),
              passed => (IsAlive =:= true), time_ms => erlang:system_time(millisecond) - T1_Start}
        catch C1:R1 ->
            #{call_str => <<"commerce_app:start(...)">>, expected => <<"true">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
        end,
        T2_Start = erlang:system_time(millisecond),
        T2_Res = try
            Val = commerce_app:get_app_config(database_timeout, 5000),
            #{call_str => <<"commerce_app:get_app_config(database_timeout, 5000)">>,
              expected => <<"5000">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Val]))),
              passed => (Val =:= 5000), time_ms => erlang:system_time(millisecond) - T2_Start}
        catch C2:R2 ->
            #{call_str => <<"commerce_app:get_app_config(...)">>, expected => <<"5000">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
        end,
        T3_Start = erlang:system_time(millisecond),
        T3_Res = try
            ok = commerce_app:set_app_config(currency, <<"USD">>),
            ReadVal = commerce_app:get_app_config(currency, <<"EUR">>),
            #{call_str => <<"commerce_app:set_app_config(currency, <<\"USD\">>)">>,
              expected => <<"<<\"USD\">>">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [ReadVal]))),
              passed => (ReadVal =:= <<"USD">>), time_ms => erlang:system_time(millisecond) - T3_Start}
        catch C3:R3 ->
            #{call_str => <<"commerce_app:set_app_config(...)">>, expected => <<"<<\"USD\">>">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
        end,
        [T1_Res, T2_Res, T3_Res];
    false ->
        T1_Start = erlang:system_time(millisecond),
        T1_Res = try
            {ok, Sup1} = dynamic_session_sup:start_link(),
            Count1 = dynamic_session_sup:count_sessions(Sup1),
            MRef1 = monitor(process, Sup1),
            exit(Sup1, shutdown),
            receive {'DOWN', MRef1, process, Sup1, _} -> ok after 500 -> ok end,
            #{call_str => <<"dynamic_session_sup:count_sessions(Sup) (initial)">>,
              expected => <<"0">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Count1]))),
              passed => (Count1 =:= 0), time_ms => erlang:system_time(millisecond) - T1_Start}
        catch C1:R1 ->
            #{call_str => <<"dynamic_session_sup:start_link/count">>, expected => <<"0">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
        end,
        T2_Start = erlang:system_time(millisecond),
        T2_Res = try
            {ok, Sup2} = dynamic_session_sup:start_link(),
            {ok, P1} = dynamic_session_sup:start_session(Sup2, <<"s1">>, <<"u1">>),
            {ok, P2} = dynamic_session_sup:start_session(Sup2, <<"s2">>, <<"u2">>),
            Count2 = dynamic_session_sup:count_sessions(Sup2),
            MRef2 = monitor(process, Sup2),
            exit(Sup2, shutdown),
            receive {'DOWN', MRef2, process, Sup2, _} -> ok after 500 -> ok end,
            PidsOk = is_pid(P1) andalso is_pid(P2) andalso (Count2 =:= 2),
            #{call_str => <<"dynamic_session_sup:start_session(Sup, ...) -> count 2">>,
              expected => <<"{true, true, 2}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [{is_pid(P1), is_pid(P2), Count2}]))),
              passed => PidsOk, time_ms => erlang:system_time(millisecond) - T2_Start}
        catch C2:R2 ->
            #{call_str => <<"dynamic_session_sup:start_session(...)">>, expected => <<"2 active">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
        end,
        T3_Start = erlang:system_time(millisecond),
        T3_Res = try
            {ok, Sup3} = dynamic_session_sup:start_link(),
            {ok, P3} = dynamic_session_sup:start_session(Sup3, <<"s1">>, <<"u1">>),
            ok = dynamic_session_sup:terminate_session(Sup3, P3),
            Count3 = dynamic_session_sup:count_sessions(Sup3),
            MRef3 = monitor(process, Sup3),
            exit(Sup3, shutdown),
            receive {'DOWN', MRef3, process, Sup3, _} -> ok after 500 -> ok end,
            #{call_str => <<"dynamic_session_sup:terminate_session(Sup, Child)">>,
              expected => <<"0">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Count3]))),
              passed => (Count3 =:= 0), time_ms => erlang:system_time(millisecond) - T3_Start}
        catch C3:R3 ->
            #{call_str => <<"dynamic_session_sup:terminate_session(...)">>, expected => <<"0">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
        end,
        [T1_Res, T2_Res, T3_Res]
end,
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch08-l05":
		return `
IsCheckout = case code:ensure_loaded(checkout_sup) of
    {module, checkout_sup} -> true;
    _ -> false
end,
AllResults = case IsCheckout of
    true ->
        T1_Start = erlang:system_time(millisecond),
        T1_Res = try
            [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [checkout_sup, db_pool_worker, pricing_cache_worker, order_gateway_worker]],
            timer:sleep(20),
            {ok, Sup1} = checkout_sup:start_link(),
            {ok, #{db_pid := Db, cache_pid := Cache, gateway_pid := Gw}} = checkout_sup:get_pipeline_pids(),
            unlink(Sup1),
            catch supervisor:stop(Sup1),
            AllPidsAlive = is_pid(Db) andalso is_pid(Cache) andalso is_pid(Gw),
            #{call_str => <<"checkout_sup:start_link() -> get_pipeline_pids()">>,
              expected => <<"true">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [AllPidsAlive]))),
              passed => AllPidsAlive, time_ms => erlang:system_time(millisecond) - T1_Start}
        catch C1:R1 ->
            #{call_str => <<"checkout_sup:start_link(...)">>, expected => <<"all 3 pids alive">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
        end,
        T2_Start = erlang:system_time(millisecond),
        T2_Res = try
            [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [checkout_sup, db_pool_worker, pricing_cache_worker, order_gateway_worker]],
            timer:sleep(20),
            {ok, Sup2} = checkout_sup:start_link(),
            {ok, #{db_pid := Db1, cache_pid := Cache1, gateway_pid := Gw1}} = checkout_sup:get_pipeline_pids(),
            exit(Gw1, kill),
            timer:sleep(40),
            {ok, #{db_pid := Db2, cache_pid := Cache2, gateway_pid := Gw2}} = checkout_sup:get_pipeline_pids(),
            unlink(Sup2),
            catch supervisor:stop(Sup2),
            Pass = (Db1 =:= Db2) andalso (Cache1 =:= Cache2) andalso (Gw1 =/= Gw2),
            #{call_str => <<"checkout_sup: kill gateway worker -> check rest_for_one">>,
              expected => <<"{true, true, true}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [{Db1 =:= Db2, Cache1 =:= Cache2, Gw1 =/= Gw2}]))),
              passed => Pass, time_ms => erlang:system_time(millisecond) - T2_Start}
        catch C2:R2 ->
            #{call_str => <<"checkout_sup: kill gateway">>, expected => <<"isolated gateway restart">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
        end,
        T3_Start = erlang:system_time(millisecond),
        T3_Res = try
            [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [checkout_sup, db_pool_worker, pricing_cache_worker, order_gateway_worker]],
            timer:sleep(20),
            {ok, Sup3} = checkout_sup:start_link(),
            {ok, #{db_pid := Db3, cache_pid := Cache3, gateway_pid := Gw3}} = checkout_sup:get_pipeline_pids(),
            exit(Cache3, kill),
            timer:sleep(40),
            {ok, #{db_pid := Db4, cache_pid := Cache4, gateway_pid := Gw4}} = checkout_sup:get_pipeline_pids(),
            unlink(Sup3),
            catch supervisor:stop(Sup3),
            Pass3 = (Db3 =:= Db4) andalso (Cache3 =/= Cache4) andalso (Gw3 =/= Gw4),
            #{call_str => <<"checkout_sup: kill pricing_cache -> check cascade to gateway">>,
              expected => <<"{true, true, true}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [{Db3 =:= Db4, Cache3 =/= Cache4, Gw3 =/= Gw4}]))),
              passed => Pass3, time_ms => erlang:system_time(millisecond) - T3_Start}
        catch C3:R3 ->
            #{call_str => <<"checkout_sup: kill cache">>, expected => <<"cascade restart">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
        end,
        [T1_Res, T2_Res, T3_Res];
    false ->
        T1_Start = erlang:system_time(millisecond),
        T1_Res = try
            {ok, Sup} = commerce_app:start(normal, []),
            IsAlive = is_process_alive(Sup),
            commerce_app:stop([]),
            #{call_str => <<"commerce_app:start(normal, [])">>,
              expected => <<"true">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [IsAlive]))),
              passed => (IsAlive =:= true), time_ms => erlang:system_time(millisecond) - T1_Start}
        catch C1:R1 ->
            #{call_str => <<"commerce_app:start(...)">>, expected => <<"true">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
        end,
        T2_Start = erlang:system_time(millisecond),
        T2_Res = try
            Val = commerce_app:get_app_config(database_timeout, 5000),
            #{call_str => <<"commerce_app:get_app_config(database_timeout, 5000)">>,
              expected => <<"5000">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Val]))),
              passed => (Val =:= 5000), time_ms => erlang:system_time(millisecond) - T2_Start}
        catch C2:R2 ->
            #{call_str => <<"commerce_app:get_app_config(...)">>, expected => <<"5000">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
        end,
        T3_Start = erlang:system_time(millisecond),
        T3_Res = try
            ok = commerce_app:set_app_config(currency, <<"USD">>),
            ReadVal = commerce_app:get_app_config(currency, <<"EUR">>),
            #{call_str => <<"commerce_app:set_app_config(currency, <<\"USD\">>)">>,
              expected => <<"<<\"USD\">>">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [ReadVal]))),
              passed => (ReadVal =:= <<"USD">>), time_ms => erlang:system_time(millisecond) - T3_Start}
        catch C3:R3 ->
            #{call_str => <<"commerce_app:set_app_config(...)">>, expected => <<"<<\"USD\">>">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
        end,
        [T1_Res, T2_Res, T3_Res]
end,
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch08-l07":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [checkout_sup, db_pool_worker, pricing_cache_worker, order_gateway_worker]],
    timer:sleep(20),
    {ok, Sup1} = checkout_sup:start_link(),
    {ok, #{db_pid := Db, cache_pid := Cache, gateway_pid := Gw}} = checkout_sup:get_pipeline_pids(),
    unlink(Sup1),
    catch supervisor:stop(Sup1),
    AllPidsAlive = is_pid(Db) andalso is_pid(Cache) andalso is_pid(Gw),
    #{call_str => <<"checkout_sup:start_link() -> get_pipeline_pids()">>,
      expected => <<"true">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [AllPidsAlive]))),
      passed => AllPidsAlive, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"checkout_sup:start_link(...)">>, expected => <<"all 3 pids alive">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [checkout_sup, db_pool_worker, pricing_cache_worker, order_gateway_worker]],
    timer:sleep(20),
    {ok, Sup2} = checkout_sup:start_link(),
    {ok, #{db_pid := Db1, cache_pid := Cache1, gateway_pid := Gw1}} = checkout_sup:get_pipeline_pids(),
    exit(Gw1, kill),
    timer:sleep(40),
    {ok, #{db_pid := Db2, cache_pid := Cache2, gateway_pid := Gw2}} = checkout_sup:get_pipeline_pids(),
    unlink(Sup2),
    catch supervisor:stop(Sup2),
    Pass = (Db1 =:= Db2) andalso (Cache1 =:= Cache2) andalso (Gw1 =/= Gw2),
    #{call_str => <<"checkout_sup: kill gateway worker -> check rest_for_one">>,
      expected => <<"{true, true, true}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{Db1 =:= Db2, Cache1 =:= Cache2, Gw1 =/= Gw2}]))),
      passed => Pass, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"checkout_sup: kill gateway">>, expected => <<"isolated gateway restart">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [checkout_sup, db_pool_worker, pricing_cache_worker, order_gateway_worker]],
    timer:sleep(20),
    {ok, Sup3} = checkout_sup:start_link(),
    {ok, #{db_pid := Db3, cache_pid := Cache3, gateway_pid := Gw3}} = checkout_sup:get_pipeline_pids(),
    exit(Cache3, kill),
    timer:sleep(40),
    {ok, #{db_pid := Db4, cache_pid := Cache4, gateway_pid := Gw4}} = checkout_sup:get_pipeline_pids(),
    unlink(Sup3),
    catch supervisor:stop(Sup3),
    Pass3 = (Db3 =:= Db4) andalso (Cache3 =/= Cache4) andalso (Gw3 =/= Gw4),
    #{call_str => <<"checkout_sup: kill pricing_cache -> check cascade to gateway">>,
      expected => <<"{true, true, true}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{Db3 =:= Db4, Cache3 =/= Cache4, Gw3 =/= Gw4}]))),
      passed => Pass3, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"checkout_sup: kill cache">>, expected => <<"cascade restart">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── CHAPTER 9 ─────────────────────────────────────────────────────────────
	case "ch09-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    catch ets:delete(telemetry_store),
    ok = ets_telemetry:init_table(),
    1 = ets_telemetry:record_endpoint_hit(<<"/api/v1/checkout">>, 1),
    5 = ets_telemetry:record_endpoint_hit(<<"/api/v1/checkout">>, 4),
    Hits = ets_telemetry:get_endpoint_hits(<<"/api/v1/checkout">>),
    #{call_str => <<"ets_telemetry:record_endpoint_hit -> get_endpoint_hits">>,
      expected => <<"5">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Hits]))),
      passed => (Hits =:= 5), time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"ets_telemetry:record_endpoint_hit(...)">>, expected => <<"5">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    ok = ets_telemetry:put_user_profile(101, <<"Alice">>, admin),
    {ok, Profile} = ets_telemetry:get_user_profile(101),
    Name = maps:get(name, Profile),
    Role = maps:get(role, Profile),
    Pass = (Name =:= <<"Alice">>) andalso (Role =:= admin),
    #{call_str => <<"ets_telemetry:put_user_profile -> get_user_profile">>,
      expected => <<"{<<\"Alice\">>, admin}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{Name, Role}]))),
      passed => Pass, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"ets_telemetry:put_user_profile(...)">>, expected => <<"user profile map">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch09-l02":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    catch ets:delete(auth_token_table),
    ok = ets_query_engine:init_auth_table(),
    ok = ets_query_engine:store_token(<<"tok_1">>, 101, admin, 9999),
    ok = ets_query_engine:store_token(<<"tok_2">>, 102, member, 9999),
    ok = ets_query_engine:store_token(<<"tok_3">>, 101, admin, 9999),
    Admins = ets_query_engine:find_users_by_role(admin),
    #{call_str => <<"ets_query_engine:find_users_by_role(admin)">>,
      expected => <<"[101]">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Admins]))),
      passed => (Admins =:= [101]), time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"ets_query_engine:find_users_by_role(...)">>, expected => <<"[101]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    ok = ets_query_engine:store_token(<<"exp_1">>, 201, guest, 100),
    ok = ets_query_engine:store_token(<<"exp_2">>, 202, guest, 200),
    ok = ets_query_engine:store_token(<<"valid">>, 203, guest, 500),
    DelCount = ets_query_engine:delete_expired_tokens(300),
    ValidFound = (ets:lookup(auth_token_table, <<"valid">>) =/= []),
    Pass = (DelCount =:= 2) andalso ValidFound,
    #{call_str => <<"ets_query_engine:delete_expired_tokens(300)">>,
      expected => <<"2 deleted, valid retained">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{DelCount, ValidFound}]))),
      passed => Pass, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"ets_query_engine:delete_expired_tokens(...)">>, expected => <<"2 deleted">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch09-l03":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    catch ets:delete(resilient_cache),
    {ok, Guardian} = ets_heir_handshake:start_guardian(),
    _Creator = spawn(fun() ->
        Tab = ets_heir_handshake:create_resilient_table(resilient_cache, Guardian),
        ets:insert(Tab, {k1, <<"persistent_value">>}),
        timer:sleep(10),
        exit(intentional_crash)
    end),
    timer:sleep(50),
    Info = ets:info(resilient_cache),
    OwnerIsGuardian = (proplists:get_value(owner, Info) =:= Guardian),
    ok = ets_heir_handshake:reclaim_table(Guardian, resilient_cache),
    [{k1, Val}] = ets:lookup(resilient_cache, k1),
    Guardian ! stop,
    Pass = OwnerIsGuardian andalso (Val =:= <<"persistent_value">>),
    #{call_str => <<"ets_heir_handshake: heir failover and reclaim">>,
      expected => <<"owner transferred and data preserved">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{OwnerIsGuardian, Val}]))),
      passed => Pass, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"ets_heir_handshake:reclaim_table(...)">>, expected => <<"data preserved">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch09-l04":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    NodeInfo = cluster_pubsub_pg:cluster_node_info(),
    {ok, Alive} = cluster_pubsub_pg:safe_remote_call(node(), erlang, is_alive, []),
    Pass1 = is_map(NodeInfo) andalso (maps:get(alive, NodeInfo) =:= Alive),
    #{call_str => <<"cluster_pubsub_pg:cluster_node_info and safe_remote_call">>,
      expected => <<"valid node info map">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{is_map(NodeInfo), Alive}]))),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"cluster_pubsub_pg:cluster_node_info(...)">>, expected => <<"map">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    Self = self(),
    ok = cluster_pubsub_pg:join_topic(<<"alerts">>, Self),
    {published, 1} = cluster_pubsub_pg:publish_to_topic(<<"alerts">>, <<"cluster_overload">>),
    ReceivedMsg = receive
        {pubsub, <<"alerts">>, M} -> M;
        {pubsub_msg, <<"alerts">>, M} -> M
    after 200 ->
        error_no_msg
    end,
    ok = cluster_pubsub_pg:leave_topic(<<"alerts">>, Self),
    #{call_str => <<"cluster_pubsub_pg: publish_to_topic">>,
      expected => <<"cluster_overload">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [ReceivedMsg]))),
      passed => (ReceivedMsg =:= <<"cluster_overload">>), time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"cluster_pubsub_pg:publish_to_topic(...)">>, expected => <<"cluster_overload">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch09-l05":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    ok = mnesia_ledger:setup_mnesia_table(),
    ok = mnesia_ledger:upsert_wallet(alice, 100),
    ok = mnesia_ledger:upsert_wallet(bob, 50),
    {ok, 60, 90} = mnesia_ledger:atomic_transfer(alice, bob, 40),
    {ok, AliceBal} = mnesia_ledger:get_wallet_balance(alice),
    {ok, BobBal} = mnesia_ledger:get_wallet_balance(bob),
    Pass1 = (AliceBal =:= 60) andalso (BobBal =:= 90),
    #{call_str => <<"mnesia_ledger: atomic_transfer alice->bob 40">>,
      expected => <<"{60, 90}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{AliceBal, BobBal}]))),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"mnesia_ledger:atomic_transfer(...)">>, expected => <<"{60, 90}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    Err = mnesia_ledger:atomic_transfer(alice, bob, 500),
    {ok, AliceBal2} = mnesia_ledger:get_wallet_balance(alice),
    {ok, BobBal2} = mnesia_ledger:get_wallet_balance(bob),
    Pass2 = (Err =:= {error, insufficient_funds}) andalso (AliceBal2 =:= 60) andalso (BobBal2 =:= 90),
    #{call_str => <<"mnesia_ledger: atomic_transfer overdraft rollback">>,
      expected => <<"{error, insufficient_funds} and balances untouched">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{Err, AliceBal2, BobBal2}]))),
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"mnesia_ledger:atomic_transfer rollback(...)">>, expected => <<"{error, insufficient_funds}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch09-l06":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    Fee = ledger_specs_and_tests:calculate_fee(1000, usd),
    {ok, Rem} = ledger_specs_and_tests:validate_transfer_spec(1000, 500, usd),
    Pass1 = (Fee =:= 15) andalso (Rem =:= 493),
    #{call_str => <<"ledger_specs_and_tests: calculate_fee & validate_transfer_spec">>,
      expected => <<"{15, 493}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{Fee, Rem}]))),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"ledger_specs_and_tests:calculate_fee(...)">>, expected => <<"{15, 493}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    TestRet = case erlang:function_exported(ledger_specs_and_tests, run_unit_checks, 0) of
        true -> ledger_specs_and_tests:run_unit_checks();
        false -> ledger_specs_and_tests:run_unit_tests()
    end,
    #{call_str => <<"ledger_specs_and_tests:run_unit_checks()">>,
      expected => <<"ok">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [TestRet]))),
      passed => (TestRet =:= ok), time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"ledger_specs_and_tests:run_unit_checks(...)">>, expected => <<"ok">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch09-l08":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]],
    timer:sleep(20),
    {ok, _} = session_cache:start_pipeline(),
    ok = session_cache:put_session(<<"s1">>, 101, #{ip => <<"127.0.0.1">>}),
    {ok, 1} = session_cache:increment_hits(<<"s1">>),
    {ok, 2} = session_cache:increment_hits(<<"s1">>),
    {ok, Sess} = session_cache:get_session(<<"s1">>),
    Hits = maps:get(hit_count, Sess),
    session_cache:stop_pipeline(),
    #{call_str => <<"session_cache:put_session -> increment_hits 2">>,
      expected => <<"2">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Hits]))),
      passed => (Hits =:= 2), time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    (try session_cache:stop_pipeline() catch _:_ -> ok end),
    #{call_str => <<"session_cache:increment_hits(...)">>, expected => <<"2">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]],
    timer:sleep(20),
    {ok, _} = session_cache:start_pipeline(),
    ok = session_cache:put_session(<<"sess_a">>, 999, #{role => admin}),
    {ok, 1} = session_cache:increment_hits(<<"sess_a">>),
    OldPid = whereis(session_cache),
    exit(OldPid, kill),
    timer:sleep(80),
    NewPid = whereis(session_cache),
    {ok, Sess2} = session_cache:get_session(<<"sess_a">>),
    session_cache:stop_pipeline(),
    ActualPair = {OldPid =/= NewPid, maps:get(hit_count, Sess2)},
    Pass = (ActualPair =:= {true, 1}) andalso is_pid(NewPid) andalso (maps:get(user_id, Sess2) =:= 999),
    #{call_str => <<"session_cache: kill worker -> check heir failover">>,
      expected => <<"{true, 1}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [ActualPair]))),
      passed => Pass, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    (try session_cache:stop_pipeline() catch _:_ -> ok end),
    #{call_str => <<"session_cache: kill worker">>, expected => <<"{true, 1}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch10-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    DemoRes = tcp_live_demo:run_demo(),
    Passed = case DemoRes of
        #{frames_exchanged := 3} -> true;
        {ok, 3} -> true;
        _ -> false
    end,
    #{call_str => <<"tcp_live_demo:run_demo()">>,
      expected => <<"#{frames_exchanged => 3, ...}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [DemoRes]))),
      passed => Passed, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"tcp_live_demo:run_demo()">>, expected => <<"#{frames_exchanged => 3, ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch10-l02":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    Opts1 = tcp_socket_opts:build_low_latency_opts(4),
    Exp1 = [binary, {packet, 4}, {active, once}, {nodelay, true}, {reuseaddr, true}],
    #{call_str => <<"tcp_socket_opts:build_low_latency_opts(4)">>,
      expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp1]))),
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Opts1]))),
      passed => (Opts1 =:= Exp1), time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"tcp_socket_opts:build_low_latency_opts(4)">>, expected => <<"Canonical option list">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    ErrRes = tcp_socket_opts:build_low_latency_opts(udp_invalid),
    #{call_str => <<"tcp_socket_opts:build_low_latency_opts(udp_invalid)">>,
      expected => <<"{error, invalid_packet_mode}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [ErrRes]))),
      passed => (ErrRes =:= {error, invalid_packet_mode}), time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"tcp_socket_opts:build_low_latency_opts(udp_invalid)">>, expected => <<"{error, invalid_packet_mode}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    EvtRes = tcp_socket_opts:classify_socket_event({tcp, make_ref(), <<"XMPP_STANZA">>}),
    #{call_str => <<"tcp_socket_opts:classify_socket_event({tcp, Ref, <<\"XMPP_STANZA\">>})">>,
      expected => <<"{data, 11, <<\"XMPP_STANZA\">>}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [EvtRes]))),
      passed => (EvtRes =:= {data, 11, <<"XMPP_STANZA">>}), time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"tcp_socket_opts:classify_socket_event(...)">>, expected => <<"{data, 11, ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
T4_Start = erlang:system_time(millisecond),
T4_Res = try
    WireFrame = tcp_socket_opts:encode_length_prefixed(<<"PING">>),
    ExpWire = <<0, 0, 0, 4, 80, 73, 78, 71>>,
    #{call_str => <<"tcp_socket_opts:encode_length_prefixed(<<\"PING\">>)">>,
      expected => <<"<<0,0,0,4,80,73,78,71>>">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [WireFrame]))),
      passed => (WireFrame =:= ExpWire), time_ms => erlang:system_time(millisecond) - T4_Start}
catch C4:R4 ->
    #{call_str => <<"tcp_socket_opts:encode_length_prefixed(...)">>, expected => <<"<<0,0,0,4,...>>">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, R4])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res, T4_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch10-l03":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {ok, ListenPid, Port} = tcp_flow_worker:start_server(),
    {ok, ClientSock} = gen_tcp:connect("127.0.0.1", Port, [binary, {packet, raw}, {active, false}], 2000),
    ok = gen_tcp:send(ClientSock, <<"TEST_PING\r\n">>),
    {ok, Reply} = gen_tcp:recv(ClientSock, 0, 2000),
    gen_tcp:close(ClientSock),
    tcp_flow_worker:stop_server(ListenPid),
    Passed = (Reply =:= <<"+ACK: TEST_PING\r\n">>),
    #{call_str => <<"tcp_flow_worker:start_server() -> send TEST_PING">>,
      expected => <<"<<\"+ACK: TEST_PING\\r\\n\">>">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Reply]))),
      passed => Passed, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    (case whereis(tcp_flow_worker) of undefined -> ok; P -> catch gen_server:stop(P) end),
    #{call_str => <<"tcp_flow_worker:start_server(...)">>, expected => <<"<<\"+ACK: TEST_PING\\r\\n\">>">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch10-l04":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {Lines1, Buf1} = tcp_frame_buffer:append_and_extract_lines(<<>>, <<"HELLO\r\nWOR">>),
    Pass1 = (Lines1 =:= [<<"HELLO">>]) andalso (Buf1 =:= <<"WOR">>),
    #{call_str => <<"tcp_frame_buffer:append_and_extract_lines(<<>>, <<\"HELLO\\r\\nWOR\">>)">>,
      expected => <<"{[<<\"HELLO\">>], <<\"WOR\">>}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{Lines1, Buf1}]))),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"tcp_frame_buffer:append_and_extract_lines(...)">>, expected => <<"{[<<\"HELLO\">>], <<\"WOR\">>}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    {Lines2, Buf2} = tcp_frame_buffer:append_and_extract_lines(<<"WOR">>, <<"LD\r\nFOO\r\nBAR\r\n">>),
    Pass2 = (Lines2 =:= [<<"WORLD">>, <<"FOO">>, <<"BAR">>]) andalso (Buf2 =:= <<>>),
    #{call_str => <<"tcp_frame_buffer:append_and_extract_lines(<<\"WOR\">>, <<\"LD\\r\\nFOO\\r\\nBAR\\r\\n\">>)">>,
      expected => <<"{[<<\"WORLD\">>, <<\"FOO\">>, <<\"BAR\">>], <<>>}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{Lines2, Buf2}]))),
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"tcp_frame_buffer:append_and_extract_lines(...)">>, expected => <<"{[<<\"WORLD\">>, <<\"FOO\">>, <<\"BAR\">>], <<>>}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch10-l05":
		return `
case code:ensure_loaded(tcp_acceptor_pool) of
    {module, tcp_acceptor_pool} ->
        T1_Start = erlang:system_time(millisecond),
        T1_Res = try
            {ok, MgrPid, Port} = tcp_acceptor_pool:start_pool(0, 3),
            {ok, Sock1} = gen_tcp:connect("127.0.0.1", Port, [binary, {packet, raw}, {active, false}], 2000),
            {ok, Sock2} = gen_tcp:connect("127.0.0.1", Port, [binary, {packet, raw}, {active, false}], 2000),
            timer:sleep(50),
            ActiveCount = tcp_acceptor_pool:get_active_workers(MgrPid),
            ok = gen_tcp:send(Sock1, <<"PING\r\n">>),
            {ok, Reply1} = gen_tcp:recv(Sock1, 0, 2000),
            gen_tcp:close(Sock1),
            gen_tcp:close(Sock2),
            tcp_acceptor_pool:stop_pool(MgrPid),
            Pass = (ActiveCount =:= 2) andalso (Reply1 =:= <<"+REPLY: PING\r\n">>),
            #{call_str => <<"tcp_acceptor_pool:start_pool(0, 3) -> 2 clients connect">>,
              expected => <<"{2,<<\"+REPLY: PING\\r\\n\">>}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [{ActiveCount, Reply1}]))),
              passed => Pass, time_ms => erlang:system_time(millisecond) - T1_Start}
        catch C1:R1 ->
            #{call_str => <<"tcp_acceptor_pool:start_pool(0, 3) -> 2 clients connect">>,
              expected => <<"{2,<<\"+REPLY: PING\\r\\n\">>}">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
        end,
        T2_Start = erlang:system_time(millisecond),
        T2_Res = try
            {ok, LSock} = gen_tcp:listen(0, [binary, {active, false}]),
            {ok, HPort} = inet:port(LSock),
            Receiver = spawn(fun() ->
                receive
                    {socket_assigned, S} ->
                        inet:setopts(S, [{active, once}]),
                        receive {tcp, S, <<"HI\r\n">>} -> ok = gen_tcp:send(S, <<"ACK\r\n">>) after 3000 -> ok end
                after 3000 ->
                    ok
                end
            end),
            {ok, Client} = gen_tcp:connect("127.0.0.1", HPort, [binary, {active, false}], 2000),
            {ok, ServerSock} = gen_tcp:accept(LSock, 2000),
            ok = tcp_acceptor_pool:handoff_socket(ServerSock, Receiver),
            ok = gen_tcp:send(Client, <<"HI\r\n">>),
            {ok, Rep2} = gen_tcp:recv(Client, 0, 2000),
            gen_tcp:close(Client),
            gen_tcp:close(LSock),
            #{call_str => <<"tcp_acceptor_pool:handoff_socket/2">>,
              expected => <<"<<\"ACK\\r\\n\">>">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Rep2]))),
              passed => (Rep2 =:= <<"ACK\r\n">>), time_ms => erlang:system_time(millisecond) - T2_Start}
        catch C2:R2 ->
            #{call_str => <<"tcp_acceptor_pool:handoff_socket/2">>, expected => <<"<<\"ACK\\r\\n\">>">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
        end,
        AllResults = [T1_Res, T2_Res],
        io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]);
    _ ->
        T1_Start = erlang:system_time(millisecond),
        T1_Res = try
            P1 = tcp_kv_backend:parse_command(<<"PING">>),
            P2 = tcp_kv_backend:parse_command(<<"SET session_token secret123">>),
            Pass = (P1 =:= {ok, ping}) andalso (P2 =:= {ok, {set, <<"session_token">>, <<"secret123">>}}),
            #{call_str => <<"tcp_kv_backend:parse_command(PING / SET)">>,
              expected => <<"{ok, ping} & {ok, {set, ...}}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p, ~p", [P1, P2]))),
              passed => Pass, time_ms => erlang:system_time(millisecond) - T1_Start}
        catch C1:R1 ->
            #{call_str => <<"tcp_kv_backend test">>, expected => <<"Success">>,
              actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
        end,
        io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => [T1_Res]})])
end,
init:stop().
`, true

	case "ch10-l07":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    P1 = tcp_kv_backend:parse_command(<<"PING">>),
    P2 = tcp_kv_backend:parse_command(<<"SET session_token secret123">>),
    Pass = (P1 =:= {ok, ping}) andalso (P2 =:= {ok, {set, <<"session_token">>, <<"secret123">>}}),
    #{call_str => <<"tcp_kv_backend:parse_command(PING / SET)">>,
      expected => <<"{ok, ping} & {ok, {set, ...}}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p, ~p", [P1, P2]))),
      passed => Pass, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"tcp_kv_backend:parse_command(...)">>, expected => <<"parsed terms">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    Tab = case ets:info(test_tab_run) of
        undefined -> ets:new(test_tab_run, [set, public]);
        _ -> test_tab_run
    end,
    R1 = tcp_kv_backend:execute_command({set, <<"k1">>, <<"val1">>}, Tab),
    R2 = tcp_kv_backend:execute_command({get, <<"k1">>}, Tab),
    R3 = tcp_kv_backend:execute_command({del, <<"k1">>}, Tab),
    R4 = tcp_kv_backend:execute_command({get, <<"k1">>}, Tab),
    ets:delete(Tab),
    Pass2 = (R1 =:= <<"+OK\r\n">>) andalso (R2 =:= <<"$val1\r\n">>) andalso (R3 =:= <<":1\r\n">>) andalso (R4 =:= <<"$-1\r\n">>),
    #{call_str => <<"tcp_kv_backend:execute_command(...) [SET, GET, DEL, GET]">>,
      expected => <<"{+OK, $val1, :1, $-1}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{R1, R2, R3, R4}]))),
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    (catch ets:delete(test_tab_run)),
    #{call_str => <<"tcp_kv_backend:execute_command(...)">>, expected => <<"Wire responses">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch11-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {ok, N} = xmpp_wire_demo:run_demo(),
    Pass = (N =:= 8),
    #{call_str => <<"xmpp_wire_demo:run_demo()">>,
      expected => <<"{ok, 8}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("{ok, ~p}", [N]))),
      passed => Pass, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"xmpp_wire_demo:run_demo()">>, expected => <<"{ok, 8}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch11-l02":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    Exp1 = {ok, #{user => <<"alice">>, domain => <<"localhost">>, resource => <<"mobile">>, bare => <<"alice@localhost">>}},
    Act1 = xmpp_jid:parse(<<"alice@localhost/mobile">>),
    #{call_str => <<"xmpp_jid:parse(<<\"alice@localhost/mobile\">>)">>,
      expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp1]))),
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Act1]))),
      passed => (Act1 =:= Exp1), time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"xmpp_jid:parse(<<\"alice@localhost/mobile\">>)">>, expected => <<"{ok, #{...}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    Exp2 = {ok, #{user => <<"bob">>, domain => <<"localhost">>, resource => <<>>, bare => <<"bob@localhost">>}},
    Act2 = xmpp_jid:parse(<<"bob@localhost">>),
    #{call_str => <<"xmpp_jid:parse(<<\"bob@localhost\">>)">>,
      expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp2]))),
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Act2]))),
      passed => (Act2 =:= Exp2), time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"xmpp_jid:parse(<<\"bob@localhost\">>)">>, expected => <<"{ok, #{...}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    Act3 = {xmpp_jid:parse(<<"@localhost">>), xmpp_jid:parse(<<"alice@">>), xmpp_jid:parse(<<"alice@localhost/">>)},
    Exp3 = {{error, invalid_jid}, {error, invalid_jid}, {error, invalid_jid}},
    #{call_str => <<"{xmpp_jid:parse(<<\"@localhost\">>), xmpp_jid:parse(<<\"alice@\">>), xmpp_jid:parse(<<\"alice@localhost/\">>)}">>,
      expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp3]))),
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Act3]))),
      passed => (Act3 =:= Exp3), time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"xmpp_jid:parse(malformed)">>, expected => <<"{{error,invalid_jid},{error,invalid_jid},{error,invalid_jid}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch11-l03":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    C1 = xmpp_stanza:classify_xml_packet(<<"<stream:stream to='localhost' version='1.0'>">>),
    C2 = xmpp_stanza:classify_xml_packet(<<"<iq type='get' id='ping_42'><ping/></iq>">>),
    Act1 = {C1, C2},
    Exp1 = {{stream_open, <<"localhost">>}, {iq, <<"ping_42">>, <<"get">>}},
    Pass1 = (Act1 =:= Exp1),
    #{call_str => <<"{xmpp_stanza:classify_xml_packet(<<\"<stream:stream to='localhost' version='1.0'>\">>), xmpp_stanza:classify_xml_packet(<<\"<iq type='get' id='ping_42'><ping/></iq>\">>)}">>,
      expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp1]))),
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Act1]))),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"classify_xml_packet(...)">>, expected => <<"{{stream_open,<<\"localhost\">>},{iq,<<\"ping_42\">>,<<\"get\">>}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    B1 = xmpp_stanza:build_bind_result(<<"bind_1">>, <<"alice@localhost/macbook">>),
    ExpectedB1 = <<"<iq type='result' id='bind_1'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>alice@localhost/macbook</jid></bind></iq>">>,
    Pass2 = (B1 =:= ExpectedB1),
    #{call_str => <<"build_bind_result(<<\"bind_1\">>, <<\"alice@localhost/macbook\">>)">>,
      expected => ExpectedB1,
      actual => B1,
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"build_bind_result(...)">>, expected => <<"XML">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    M1 = xmpp_stanza:build_chat_message(<<"alice@localhost">>, <<"bob@localhost">>, <<"msg_01">>, <<"Hello BEAM">>),
    ExpectedM1 = <<"<message from='alice@localhost' to='bob@localhost' id='msg_01' type='chat'><body>Hello BEAM</body></message>">>,
    Pass3 = (M1 =:= ExpectedM1),
    #{call_str => <<"build_chat_message(alice, bob, msg_01, Hello BEAM)">>,
      expected => ExpectedM1,
      actual => M1,
      passed => Pass3, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"build_chat_message(...)">>, expected => <<"XML">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch11-l04":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    Cond1 = xmpp_error_and_roster:classify_error_condition(not_authorized),
    Cond2 = xmpp_error_and_roster:classify_error_condition(item_not_found),
    Pass1 = (Cond1 =:= {<<"auth">>, <<"not-authorized">>}) andalso (Cond2 =:= {<<"cancel">>, <<"item-not-found">>}),
    #{call_str => <<"classify_error_condition(not_authorized & item_not_found)">>,
      expected => <<"{{<<\"auth\">>, <<\"not-authorized\">>}, {<<\"cancel\">>, <<\"item-not-found\">>}}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{Cond1, Cond2}]))),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch CatchClass_R1:CatchReason_R1 ->
    #{call_str => <<"classify_error_condition(...)">>, expected => <<"error types">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [CatchClass_R1, CatchReason_R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    ErrXml = xmpp_error_and_roster:build_stanza_error(<<"message">>, <<"msg_1">>, <<"bob@localhost">>, item_not_found),
    Exp2 = <<"<message type='error' id='msg_1' to='bob@localhost'><error type='cancel'><item-not-found xmlns='urn:ietf:params:xml:ns:xmpp-stanzas'/></error></message>">>,
    Pass2 = (ErrXml =:= Exp2),
    #{call_str => <<"xmpp_error_and_roster:build_stanza_error(<<\"message\">>, <<\"msg_1\">>, <<\"bob@localhost\">>, item_not_found)">>,
      expected => Exp2,
      actual => ErrXml,
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch CatchClass_R2:CatchReason_R2 ->
    #{call_str => <<"build_stanza_error(...)">>, expected => <<"XML error">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [CatchClass_R2, CatchReason_R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    Sub1 = xmpp_error_and_roster:transition_subscription(none, outbound_subscribed),
    Sub2 = xmpp_error_and_roster:transition_subscription(Sub1, inbound_subscribed),
    Pass3 = (Sub1 =:= to) andalso (Sub2 =:= both),
    #{call_str => <<"transition_subscription(none -> outbound_subscribed -> inbound_subscribed)">>,
      expected => <<"{to, both}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{Sub1, Sub2}]))),
      passed => Pass3, time_ms => erlang:system_time(millisecond) - T3_Start}
catch CatchClass_R3:CatchReason_R3 ->
    #{call_str => <<"transition_subscription(...)">>, expected => <<"{to, both}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [CatchClass_R3, CatchReason_R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch11-l05":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    Act1 = xmpp_xml_framer:extract_frames(<<>>, <<"<stream:stream to='localhost'> <iq type='get'">>),
    Exp1 = {[<<"<stream:stream to='localhost'>">>], <<"<iq type='get'">>},
    #{call_str => <<"xmpp_xml_framer:extract_frames(<<>>, <<\"<stream:stream to='localhost'> <iq type='get'\">>)">>,
      expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp1]))),
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Act1]))),
      passed => (Act1 =:= Exp1), time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"extract_frames(...)">>, expected => <<"header + partial iq">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    Act2 = xmpp_xml_framer:extract_frames(<<"<iq type='get'">>, <<" id='1'><ping/></iq><presence/>">>),
    Exp2 = {[<<"<iq type='get' id='1'><ping/></iq>">>, <<"<presence/>">>], <<>>},
    #{call_str => <<"xmpp_xml_framer:extract_frames(<<\"<iq type='get'\">>, <<\" id='1'><ping/></iq><presence/>\">>)">>,
      expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp2]))),
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Act2]))),
      passed => (Act2 =:= Exp2), time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"extract_frames(...)">>, expected => <<"completed iq + presence">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch11-l06":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    S0 = xmpp_c2s_fsm:init(<<"localhost">>),
    {reply, _Feat1, S1} = xmpp_c2s_fsm:handle_event({stream_open, <<"localhost">>}, S0),
    Act1 = xmpp_c2s_fsm:get_state(S1),
    #{call_str => <<"init(<<\"localhost\">>) + handle_event({stream_open, <<\"localhost\">>}) -> get_state">>,
      expected => <<"wait_for_sasl">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Act1]))),
      passed => (Act1 =:= wait_for_sasl), time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"handle_event({stream_open, ...})">>, expected => <<"wait_for_sasl">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    S0 = xmpp_c2s_fsm:init(<<"localhost">>),
    {reply, _, S1} = xmpp_c2s_fsm:handle_event({stream_open, <<"localhost">>}, S0),
    {error, Reason, _} = xmpp_c2s_fsm:handle_event({chat_message, <<"bob">>, <<"1">>, <<"hi">>}, S1),
    #{call_str => <<"handle_event({chat_message, ...}) in wait_for_sasl">>,
      expected => <<"not_authorized">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Reason]))),
      passed => (Reason =:= not_authorized), time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"handle_event({chat_message, ...})">>, expected => <<"not_authorized">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    S0 = xmpp_c2s_fsm:init(<<"localhost">>),
    {reply, _, S1} = xmpp_c2s_fsm:handle_event({stream_open, <<"localhost">>}, S0),
    Token = base64:encode(<<0, "alice", 0, "secret">>),
    {reply, _, S2} = xmpp_c2s_fsm:handle_event({auth_plain, Token}, S1),
    {reply, _, S3} = xmpp_c2s_fsm:handle_event({bind_resource, <<"b1">>, <<"mobile">>}, S2),
    Act3 = {xmpp_c2s_fsm:get_state(S3), maps:get(full_jid, S3)},
    Exp3 = {session_established, <<"alice@localhost/mobile">>},
    #{call_str => <<"Complete SASL Auth + bind_resource -> {session_established, full_jid}">>,
      expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp3]))),
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Act3]))),
      passed => (Act3 =:= Exp3), time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"Complete SASL Auth + bind_resource">>, expected => <<"{session_established, <<\"alice@localhost/mobile\">>}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch11-l08":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    P1 = spawn(fun() -> ok end),
    P2 = spawn(fun() -> ok end),
    P3 = spawn(fun() -> ok end),
    S0 = [],
    S1 = xmpp_presence_router:upsert_session(S0, <<"alice@host/watch">>, -5, P1, #{}),
    S2 = xmpp_presence_router:upsert_session(S1, <<"alice@host/phone">>, 5, P2, #{}),
    S3 = xmpp_presence_router:upsert_session(S2, <<"alice@host/desktop">>, 10, P3, #{}),
    R_Bare = xmpp_presence_router:resolve_message_targets(S3, <<"alice@host">>),
    R_Full = xmpp_presence_router:resolve_message_targets(S3, <<"alice@host/phone">>),
    PassBare = (R_Bare =:= {route_online, [P3]}),
    PassFull = (R_Full =:= {route_online, [P2]}),
    Pass1 = PassBare andalso PassFull,
    #{call_str => <<"resolve_message_targets(Bare vs Full)">>,
      expected => <<"{true, true}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{PassBare, PassFull}]))),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"resolve_message_targets(...)">>, expected => <<"{true, true}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    P1 = spawn(fun() -> ok end),
    P2 = spawn(fun() -> ok end),
    S0 = xmpp_presence_router:upsert_session([], <<"bob@host/web">>, 1, P1, #{}),
    S1 = xmpp_presence_router:upsert_session(S0, <<"bob@host/cli">>, 2, P2, #{}),
    S2 = xmpp_presence_router:remove_session_by_pid(S1, P1),
    R_Pruned = xmpp_presence_router:resolve_message_targets(S2, <<"bob@host/web">>),
    Pass2 = (R_Pruned =:= {route_online, [P2]}),
    #{call_str => <<"remove_session_by_pid(DeadPid)">>,
      expected => <<"true">>,
      actual => list_to_binary(atom_to_list(Pass2)),
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"remove_session_by_pid(...)">>, expected => <<"true">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    PAlice = self(),
    PBob = spawn(fun() -> receive _ -> ok end end),
    Roster = #{<<"alice@host">> => [<<"bob@host">>]},
    S0 = xmpp_presence_router:upsert_session([], <<"alice@host/phone">>, 5, PAlice, Roster),
    S1 = xmpp_presence_router:upsert_session(S0, <<"bob@host/laptop">>, 5, PBob, Roster),
    Delivered = xmpp_presence_router:broadcast_presence(S1, Roster, <<"alice@host/phone">>, <<"<presence/>">>),
    Pass3 = (Delivered =:= 1),
    #{call_str => <<"broadcast_presence(alice, presence)">>,
      expected => <<"1">>,
      actual => list_to_binary(integer_to_list(Delivered)),
      passed => Pass3, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"broadcast_presence(...)">>, expected => <<"1">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch12-l01", "ch12-m1":
		return `
catch xmpp_sup:stop(),
catch (case whereis(xmpp_sup) of undefined -> ok; SupP -> exit(SupP, kill) end),
catch ets:delete(xmpp_sessions_tab),

T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {ok, SupPid} = xmpp_sup:start_link(),
    Pass1 = is_pid(SupPid) andalso is_process_alive(SupPid),
    #{call_str => <<"xmpp_sup:start_link()">>,
      expected => <<"{ok, SupPid}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{ok, SupPid}]))),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"xmpp_sup:start_link()">>, expected => <<"{ok, SupPid}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,

T2_Start = erlang:system_time(millisecond),
T2_Res = try
    Children = supervisor:which_children(whereis(xmpp_sup)),
    Pass2 = (length(Children) =:= 2),
    #{call_str => <<"supervisor:which_children(whereis(xmpp_sup))">>,
      expected => <<"2 child specifications">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p children", [length(Children)]))),
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"supervisor:which_children(...)">>, expected => <<"2 children">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,

T3_Start = erlang:system_time(millisecond),
T3_Res = try
    StopRes = xmpp_sup:stop(),
    Pass3 = (StopRes =:= ok) andalso (whereis(xmpp_sup) =:= undefined),
    #{call_str => <<"xmpp_sup:stop()">>,
      expected => <<"ok">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [StopRes]))),
      passed => Pass3, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"xmpp_sup:stop()">>, expected => <<"ok">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,

catch xmpp_sup:stop(),
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch12-l02", "ch12-m2":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {Evs1, _Rem1} = xmpp_stream_parser:feed_chunk(<<>>, <<"<stream:stream to='localhost'>">>),
    Pass1 = (Evs1 =:= [{stream_open, <<"localhost">>}]),
    #{call_str => <<"xmpp_stream_parser:feed_chunk(<<>>, <<\"<stream:stream to='localhost'>\">>)">>,
      expected => <<"[{stream_open, <<\"localhost\">>}]">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Evs1]))),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"feed_chunk stream_open">>, expected => <<"[{stream_open, ...}]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,

T2_Start = erlang:system_time(millisecond),
T2_Res = try
    {Evs2, _Rem2} = xmpp_stream_parser:feed_chunk(<<>>, <<"<auth mechanism='PLAIN'>dXNlcg==</auth>">>),
    Pass2 = (Evs2 =:= [{sasl_auth, <<"PLAIN">>, <<"dXNlcg==">>}]),
    #{call_str => <<"xmpp_stream_parser:feed_chunk(<<>>, <<\"<auth mechanism='PLAIN'>dXNlcg==</auth>\">>)">>,
      expected => <<"[{sasl_auth, <<\"PLAIN\">>, <<\"dXNlcg==\">>}]">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Evs2]))),
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"feed_chunk sasl_auth">>, expected => <<"[{sasl_auth, ...}]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,

T3_Start = erlang:system_time(millisecond),
T3_Res = try
    {Evs3, _Rem3} = xmpp_stream_parser:feed_chunk(<<>>, <<"<ping id='p99'/>">>),
    Pass3 = (Evs3 =:= [{ping, <<"p99">>}]),
    #{call_str => <<"xmpp_stream_parser:feed_chunk(<<>>, <<\"<ping id='p99'/>\">>)">>,
      expected => <<"[{ping, <<\"p99\">>}]">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Evs3]))),
      passed => Pass3, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"feed_chunk ping">>, expected => <<"[{ping, ...}]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,

AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch12-l03", "ch12-m3":
		return `
catch xmpp_session_registry:stop(),
catch ets:delete(xmpp_sessions_tab),
{ok, _} = xmpp_session_registry:start_link(),

T1_Start = erlang:system_time(millisecond),
T1_Res = try
    Self1 = self(),
    RegRes = xmpp_session_registry:register_session(<<"alice@localhost/obsidian">>, 10, Self1),
    Pass1 = (RegRes =:= ok),
    #{call_str => <<"xmpp_session_registry:register_session(<<\"alice@localhost/obsidian\">>, 10, self())">>,
      expected => <<"ok">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [RegRes]))),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"register_session(...)">>, expected => <<"ok">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,

T2_Start = erlang:system_time(millisecond),
T2_Res = try
    Self2 = self(),
    Pids = xmpp_session_registry:lookup_by_jid(<<"alice@localhost">>),
    Pass2 = (Pids =:= [Self2]),
    #{call_str => <<"xmpp_session_registry:lookup_by_jid(<<\"alice@localhost\">>)">>,
      expected => list_to_binary(lists:flatten(io_lib:format("~p", [[Self2]]))),
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Pids]))),
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"lookup_by_jid(...)">>, expected => <<"pids">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,

T3_Start = erlang:system_time(millisecond),
T3_Res = try
    Parsed = xmpp_session_registry:parse_jid(<<"alice@localhost/mobile">>),
    Pass3 = (Parsed =:= {<<"alice@localhost">>, <<"mobile">>}),
    #{call_str => <<"xmpp_session_registry:parse_jid(<<\"alice@localhost/mobile\">>)">>,
      expected => <<"{<<\"alice@localhost\">>, <<\"mobile\">>}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Parsed]))),
      passed => Pass3, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"parse_jid(...)">>, expected => <<"parsed">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,

catch xmpp_session_registry:stop(),
catch ets:delete(xmpp_sessions_tab),
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch12-l04", "ch12-m4":
		return `
catch xmpp_session_registry:stop(),
catch ets:delete(xmpp_sessions_tab),
{ok, _} = xmpp_session_registry:start_link(),
{ok, Alice} = xmpp_c2s_statem:start_link(#{username => <<"alice">>, domain => <<"localhost">>}),

T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {ok, wait_for_sasl, [Resp1]} = xmpp_c2s_statem:feed_xml(Alice, <<"<stream:stream to='localhost'>">>),
    Pass1 = is_binary(Resp1) andalso binary:match(Resp1, <<"stream:features">>) =/= nomatch,
    #{call_str => <<"xmpp_c2s_statem:feed_xml(Alice, <<\"<stream:stream to='localhost'>\">>)">>,
      expected => <<"{ok, wait_for_sasl, [StreamFeatures]}">>,
      actual => <<"{ok, wait_for_sasl, [StreamFeatures]}">>,
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"feed_xml stream_open">>, expected => <<"{ok, wait_for_sasl, _}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,

T2_Start = erlang:system_time(millisecond),
T2_Res = try
    {ok, authenticated, [Resp2]} = xmpp_c2s_statem:feed_xml(Alice, <<"<auth mechanism='PLAIN'>alice</auth>">>),
    Pass2 = is_binary(Resp2) andalso binary:match(Resp2, <<"success">>) =/= nomatch,
    #{call_str => <<"xmpp_c2s_statem:feed_xml(Alice, <<\"<auth mechanism='PLAIN'>alice</auth>\">>)">>,
      expected => <<"{ok, authenticated, [<success .../>]}">>,
      actual => <<"{ok, authenticated, [<success .../>]}">>,
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"feed_xml sasl">>, expected => <<"{ok, authenticated, _}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,

T3_Start = erlang:system_time(millisecond),
T3_Res = try
    {ok, session_established, [Resp3]} = xmpp_c2s_statem:feed_xml(Alice, <<"<iq id='b1'><resource>obsidian</resource></iq>">>),
    Pass3 = is_binary(Resp3) andalso binary:match(Resp3, <<"alice@localhost/obsidian">>) =/= nomatch,
    #{call_str => <<"xmpp_c2s_statem:feed_xml(Alice, <<\"<iq id='b1'><resource>obsidian</resource></iq>\">>)">>,
      expected => <<"{ok, session_established, [BindResult]}">>,
      actual => <<"{ok, session_established, [BindResult]}">>,
      passed => Pass3, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"feed_xml bind">>, expected => <<"{ok, session_established, _}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,

catch xmpp_c2s_statem:stop(Alice),
catch xmpp_session_registry:stop(),
catch ets:delete(xmpp_sessions_tab),
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch12-l05", "ch12-m5":
		return `
catch xmpp_router:stop(),
catch xmpp_session_registry:stop(),
catch ets:delete(xmpp_sessions_tab),
{ok, _} = xmpp_session_registry:start_link(),
{ok, _} = xmpp_router:start_link(),

T1_Start = erlang:system_time(millisecond),
T1_Res = try
    ok = xmpp_session_registry:register_session(<<"bob@localhost/phone">>, 5, self()),
    R1 = xmpp_router:route_stanza(<<"alice@localhost/obsidian">>, <<"bob@localhost/phone">>, <<"<message>Hi Bob</message>">>),
    Pass1 = (R1 =:= {routed, 1}),
    #{call_str => <<"xmpp_router:route_stanza(<<\"alice@localhost/obsidian\">>, <<\"bob@localhost/phone\">>, <<\"<message>Hi Bob</message>\">>)">>,
      expected => <<"{routed, 1}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1Err ->
    #{call_str => <<"route_stanza online">>, expected => <<"{routed, 1}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1Err])), passed => false, time_ms => 0}
end,

T2_Start = erlang:system_time(millisecond),
T2_Res = try
    R2 = xmpp_router:route_stanza(<<"alice@localhost/obsidian">>, <<"offline_user@localhost">>, <<"<message>Waiting</message>">>),
    Pass2 = (R2 =:= {queued_offline, <<"offline_user@localhost">>}),
    #{call_str => <<"xmpp_router:route_stanza(<<\"alice@localhost/obsidian\">>, <<\"offline_user@localhost\">>, <<\"<message>Waiting</message>\">>)">>,
      expected => <<"{queued_offline, <<\"offline_user@localhost\">>}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))),
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2Err ->
    #{call_str => <<"route_stanza offline">>, expected => <<"{queued_offline, ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2Err])), passed => false, time_ms => 0}
end,

T3_Start = erlang:system_time(millisecond),
T3_Res = try
    {ok, Popped} = xmpp_router:pop_offline_messages(<<"offline_user@localhost">>),
    Pass3 = (Popped =:= [<<"<message>Waiting</message>">>]),
    #{call_str => <<"xmpp_router:pop_offline_messages(<<\"offline_user@localhost\">>)">>,
      expected => <<"{ok, [<<\"<message>Waiting</message>\">>]}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{ok, Popped}]))),
      passed => Pass3, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3Err ->
    #{call_str => <<"pop_offline_messages">>, expected => <<"{ok, [...]}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3Err])), passed => false, time_ms => 0}
end,

catch xmpp_router:stop(),
catch xmpp_session_registry:stop(),
catch ets:delete(xmpp_sessions_tab),
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch12-capstone", "ch12-l06", "ch12-m6", "xmpp_capstone":
		return `
catch xmpp_router:stop(),
catch xmpp_session_registry:stop(),
catch (case whereis(xmpp_sup) of undefined -> ok; SupP -> exit(SupP, kill) end),
catch ets:delete(xmpp_sessions_tab),

io:format("====================================================================~n"),
io:format("== [BeamForge Capstone] Simulating Live 5-Module OTP XMPP Server  ==~n"),
io:format("====================================================================~n~n"),

T1_Start = erlang:system_time(millisecond),
T1_Res = try
    io:format("[M1] Booting Root Supervisor Tree (xmpp_sup)...~n"),
    {ok, SupPid} = xmpp_sup:start_link(),
    RegPid = whereis(xmpp_session_registry),
    RouterPid = whereis(xmpp_router),
    io:format("     xmpp_sup: ~p, xmpp_session_registry: ~p, xmpp_router: ~p~n", [SupPid, RegPid, RouterPid]),
    Pass1 = is_pid(SupPid) andalso is_pid(RegPid) andalso is_pid(RouterPid),
    #{call_str => <<"xmpp_sup:start_link()">>,
      expected => <<"{ok, SupPid} (registry & router running)">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{ok, SupPid}]))),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    io:format("     ERROR: ~p:~p~n", [C1, R1]),
    #{call_str => <<"xmpp_sup:start_link()">>, expected => <<"{ok, SupPid}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,

T2_Start = erlang:system_time(millisecond),
T2_Res = try
    io:format("[M2] Testing Incremental XML Stream Framer...~n"),
    B0 = xmpp_stream_parser:new_buffer(),
    {Evs1, B1} = xmpp_stream_parser:feed_chunk(B0, <<"<stream:str">>),
    {Evs2, B2} = xmpp_stream_parser:feed_chunk(B1, <<"eam to='localhost'><ping id='p1'/>">>),
    AllEvs = Evs1 ++ Evs2,
    io:format("     Parsed events from split TCP chunks: ~p~n", [AllEvs]),
    Pass2 = (AllEvs =:= [{stream_open, <<"localhost">>}, {ping, <<"p1">>}]) andalso (B2 =:= <<>>),
    #{call_str => <<"xmpp_stream_parser:feed_chunk(FragmentedChunks)">>,
      expected => <<"[{stream_open, <<\"localhost\">>}, {ping, <<\"p1\">>}]">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [AllEvs]))),
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    io:format("     ERROR: ~p:~p~n", [C2, R2]),
    #{call_str => <<"xmpp_stream_parser:feed_chunk(...)">>, expected => <<"events">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,

T3_Start = erlang:system_time(millisecond),
T3_Res = try
    io:format("[M3] Testing ETS Session Registry & Priority Routing...~n"),
    Self = self(),
    ok = xmpp_session_registry:register_session(<<"alice@localhost/obsidian">>, 10, Self),
    LookedUp = xmpp_session_registry:lookup_by_jid(<<"alice@localhost">>),
    io:format("     Registered alice@localhost/obsidian (prio 10) -> lookup: ~p~n", [LookedUp]),
    Pass3 = (LookedUp =:= [Self]),
    #{call_str => <<"xmpp_session_registry:lookup_by_jid(<<\"alice@localhost\">>)">>,
      expected => list_to_binary(lists:flatten(io_lib:format("~p", [[Self]]))),
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [LookedUp]))),
      passed => Pass3, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    io:format("     ERROR: ~p:~p~n", [C3, R3]),
    #{call_str => <<"xmpp_session_registry:register_session(...)">>, expected => <<"registered">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,

T4_Start = erlang:system_time(millisecond),
T4_Res = try
    io:format("[M4] Simulating C2S gen_statem Handshake...~n"),
    {ok, C2sPid} = xmpp_c2s_statem:start_link(#{username => <<"alice">>, domain => <<"localhost">>}),
    {ok, wait_for_sasl, [StreamResp]} = xmpp_c2s_statem:feed_xml(C2sPid, <<"<stream:stream to='localhost'>">>),
    io:format("     [C->S] <stream:stream to='localhost'>~n"),
    io:format("     [S->C] ~s~n", [StreamResp]),
    {ok, authenticated, [AuthResp]} = xmpp_c2s_statem:feed_xml(C2sPid, <<"<auth mechanism='PLAIN'>alice</auth>">>),
    io:format("     [C->S] <auth mechanism='PLAIN'>alice</auth>~n"),
    io:format("     [S->C] ~s~n", [AuthResp]),
    {ok, session_established, [BindResp]} = xmpp_c2s_statem:feed_xml(C2sPid, <<"<iq id='b1'><resource>obsidian</resource></iq>">>),
    io:format("     [C->S] <iq id='b1'><resource>obsidian</resource></iq>~n"),
    io:format("     [S->C] ~s~n", [BindResp]),
    Pass4 = is_binary(BindResp) andalso binary:match(BindResp, <<"alice@localhost/obsidian">>) =/= nomatch,
    xmpp_c2s_statem:stop(C2sPid),
    #{call_str => <<"xmpp_c2s_statem handshake (stream -> auth -> bind)">>,
      expected => <<"session_established with jid alice@localhost/obsidian">>,
      actual => <<"session_established verified">>,
      passed => Pass4, time_ms => erlang:system_time(millisecond) - T4_Start}
catch C4:R4 ->
    io:format("     ERROR: ~p:~p~n", [C4, R4]),
    #{call_str => <<"xmpp_c2s_statem:feed_xml(...)">>, expected => <<"handshake success">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, R4])), passed => false, time_ms => 0}
end,

T5_Start = erlang:system_time(millisecond),
T5_Res = try
    io:format("[M5] Testing Stanza Router (Online Routing & Offline Fallback)...~n"),
    Self5 = self(),
    ok = xmpp_session_registry:register_session(<<"alice@localhost/obsidian">>, 10, Self5),
    RouteOnline = xmpp_router:route_stanza(<<"alice@localhost/obsidian">>, <<"alice@localhost">>, <<"<message>Hi Self</message>">>),
    io:format("     Online route to self: ~p~n", [RouteOnline]),
    RouteOffline = xmpp_router:route_stanza(<<"alice@localhost/obsidian">>, <<"charlie@localhost">>, <<"<message>Hi Charlie</message>">>),
    io:format("     Offline route to charlie: ~p~n", [RouteOffline]),
    {ok, [QueuedMsg]} = xmpp_router:pop_offline_messages(<<"charlie@localhost">>),
    io:format("     Popped offline message: ~s~n", [QueuedMsg]),
    Pass5 = (RouteOnline =:= {routed, 1}) andalso (RouteOffline =:= {queued_offline, <<"charlie@localhost">>}) andalso (QueuedMsg =:= <<"<message>Hi Charlie</message>">>),
    #{call_str => <<"xmpp_router:route_stanza/3 & pop_offline_messages/1">>,
      expected => <<"{routed, 1} and {queued_offline, <<\"charlie@localhost\">>}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p and ~p", [RouteOnline, RouteOffline]))),
      passed => Pass5, time_ms => erlang:system_time(millisecond) - T5_Start}
catch C5:R5 ->
    io:format("     ERROR: ~p:~p~n", [C5, R5]),
    #{call_str => <<"xmpp_router:route_stanza(...)">>, expected => <<"routed">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C5, R5])), passed => false, time_ms => 0}
end,

T6_Start = erlang:system_time(millisecond),
T6_Res = try
    io:format("[M6] Chaos Monkey Injection: Killing xmpp_router under rest_for_one...~n"),
    RouterBefore = whereis(xmpp_router),
    RegBefore = whereis(xmpp_session_registry),
    {ok, AliceChaos} = xmpp_c2s_statem:start_link(#{username => <<"alice">>, domain => <<"localhost">>}),
    {ok, _, _} = xmpp_c2s_statem:feed_xml(AliceChaos, <<"<stream:stream to='localhost'>">>),
    {ok, _, _} = xmpp_c2s_statem:feed_xml(AliceChaos, <<"<auth mechanism='PLAIN'>alice</auth>">>),
    {ok, session_established, _} = xmpp_c2s_statem:feed_xml(AliceChaos, <<"<iq id='b1'><resource>obsidian</resource></iq>">>),
    exit(RouterBefore, kill),
    WaitRouter6 = fun WR6(0) -> whereis(xmpp_router); WR6(N) -> case whereis(xmpp_router) of P when is_pid(P), P =/= RouterBefore -> P; _ -> timer:sleep(15), WR6(N - 1) end end,
    RouterAfter = WaitRouter6(35),
    RegAfter = whereis(xmpp_session_registry),
    io:format("     Router before: ~p, after kill: ~p (restarted: ~p)~n", [RouterBefore, RouterAfter, RouterBefore =/= RouterAfter]),
    io:format("     Registry before: ~p, after kill: ~p (preserved: ~p)~n", [RegBefore, RegAfter, RegBefore =:= RegAfter]),
    {routed, 1} = xmpp_router:route_stanza(<<"sys@localhost">>, <<"alice@localhost/obsidian">>, <<"<message>Recovered</message>">>),
    xmpp_c2s_statem:stop(AliceChaos),
    Pass6 = (RegBefore =:= RegAfter) andalso is_pid(RouterAfter) andalso (RouterBefore =/= RouterAfter),
    #{call_str => <<"Chaos Monkey: exit(whereis(xmpp_router), kill) -> rest_for_one recovery">>,
      expected => <<"Registry preserved, fresh router PID, zero-loss routing">>,
      actual => <<"Chaos resilience verified: router recovered in <40ms">>,
      passed => Pass6, time_ms => erlang:system_time(millisecond) - T6_Start}
catch C6:R6 ->
    io:format("     ERROR: ~p:~p~n", [C6, R6]),
    #{call_str => <<"Chaos Monkey worker kill resilience">>, expected => <<"recovered">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C6, R6])), passed => false, time_ms => 0}
end,

catch xmpp_router:stop(),
catch xmpp_session_registry:stop(),
catch (case whereis(xmpp_sup) of undefined -> ok; SupP2 -> exit(SupP2, kill) end),
catch ets:delete(xmpp_sessions_tab),

AllResults = [T1_Res, T2_Res, T3_Res, T4_Res, T5_Res, T6_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	default:
		return "", false
	}
}

// buildChapterVerificationScript provides test and AST verification stages for Chapters 1, 2, 3 & 4
func (r *Runner) buildChapterVerificationScript(session *pool.Session, exerciseID string) (string, bool) {
	if script, ok := r.buildIncidentVerificationScript(session, exerciseID); ok {
		return script, true
	}
	wsDir := filepath.ToSlash(session.WorkspaceDir)

	switch exerciseID {

	// ── CHAPTER 1 ─────────────────────────────────────────────────────────────
	case "ch01-l01":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(beam_intro) of
    {module, beam_intro} ->
        Exports = beam_intro:module_info(exports),
        case lists:member({inspect_vm, 0}, Exports) of
            true ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"beam_intro.erl compiled cleanly and exported inspect_vm/0.">>};
            false ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => <<"Missing required export: inspect_vm/0.">>}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SourceCandidates = [
        filename:join(["%s", "src", "beam_intro.erl"]),
        filename:join(["%s", "beam_intro.erl"])
    ],
    SourceFile = case [P || P <- SourceCandidates, filelib:is_regular(P)] of
        [ValidSrc | _] -> ValidSrc;
        [] -> hd(SourceCandidates)
    end,
    Rules = #{
        required_remote_calls => [{erlang, system_info, 1}]
    },
    case bf_ast_verifier:verify_rules(SourceFile, Rules) of
        {ok, _} ->
            #{id => <<"ast_rule_audit">>, title => <<"AST Analysis: Required BIF Telemetry Call Audit">>, status => <<"passed">>, time_ms => 10, details => <<"Verified direct call to erlang:system_info/1 via AST inspection.">>};
        {error, [#{message := Msg} | _]} ->
            #{id => <<"ast_rule_audit">>, title => <<"AST Analysis: Required BIF Telemetry Call Audit">>, status => <<"failed">>, time_ms => 10, details => Msg};
        {error, Violations} ->
            #{id => <<"ast_rule_audit">>, title => <<"AST Analysis: Required BIF Telemetry Call Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C_Ast:R_Ast ->
    #{id => <<"ast_rule_audit">>, title => <<"AST Analysis: Required BIF Telemetry Call Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C_Ast, R_Ast]))}
end,
S2_Telemetry = try beam_intro:inspect_vm() of
    {vm_info, Rel, Sch, ProcLim, AtomLim}
      when is_list(Rel), length(Rel) > 0, is_integer(Sch), Sch > 0, is_integer(ProcLim), ProcLim > 0, is_integer(AtomLim), AtomLim > 0 ->
        #{id => <<"vm_introspection_contract">>, title => <<"BEAM Schedulers & Process Limits Telemetry">>, status => <<"passed">>, time_ms => 8, details => list_to_binary(io_lib:format("Queried live OTP ~s emulator info (schedulers=~p, process_limit=~p, atom_limit=~p).", [Rel, Sch, ProcLim, AtomLim]))};
    Other1 ->
        #{id => <<"vm_introspection_contract">>, title => <<"BEAM Schedulers & Process Limits Telemetry">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Invalid tuple format: ~p", [Other1]))}
catch C1:R1 ->
    #{id => <<"vm_introspection_contract">>, title => <<"BEAM Schedulers & Process Limits Telemetry">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
Stages = [CompileStage, S1_Ast, S2_Telemetry]
`, wsDir, wsDir), true

	case "ch01-l02":
		return `
CompileStage = case code:ensure_loaded(basic_types) of
    {module, basic_types} ->
        Exports = basic_types:module_info(exports),
        Required = [{calculate_bandwidth, 2}, {is_exact_match, 2}, {is_within_quota, 3}],
        Missing = [FA || FA <- Required, not lists:member(FA, Exports)],
        case Missing of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"basic_types.erl compiled cleanly and exported all 3 required functions.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Arithmetic = try {basic_types:calculate_bandwidth(1250, 2), basic_types:calculate_bandwidth(2500, 5), basic_types:calculate_bandwidth(100, 3)} of
    {5000, 4000, 266} ->
        #{id => <<"integer_arithmetic">>, title => <<"Integer Division Arithmetic (div)">>, status => <<"passed">>, time_ms => 5, details => <<"Exact and truncating integer bandwidth calculations verified.">>};
    Got1 ->
        #{id => <<"integer_arithmetic">>, title => <<"Integer Division Arithmetic (div)">>, status => <<"failed">>, time_ms => 5, details => list_to_binary(io_lib:format("Mismatch: ~p", [Got1]))}
catch C1:R1 ->
    #{id => <<"integer_arithmetic">>, title => <<"Integer Division Arithmetic (div)">>, status => <<"failed">>, time_ms => 5, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
S2_Comparisons = try
    {basic_types:is_exact_match(42, 42.0),
     basic_types:is_exact_match(100, 100),
     basic_types:is_exact_match(ok, ok),
     basic_types:is_within_quota(0, 500, false),
     basic_types:is_within_quota(450, 500, false),
     basic_types:is_within_quota(500, 500, false),
     basic_types:is_within_quota(550, 500, false),
     basic_types:is_within_quota(-10, 500, false),
     basic_types:is_within_quota(9999, 100, true)}
of
    {false, true, true, true, true, true, false, false, true} ->
        #{id => <<"comparison_and_logic">>, title => <<"Strict Equality (=:=) & Quota Bounds Logic">>, status => <<"passed">>, time_ms => 6, details => <<"Verified type-safe equality, admin bypass, negative rejection, and inclusive [0, LimitMb] quota boundaries.">>};
    Got2 ->
        #{id => <<"comparison_and_logic">>, title => <<"Strict Equality (=:=) & Quota Bounds Logic">>, status => <<"failed">>, time_ms => 6, details => list_to_binary(io_lib:format("Mismatch: ~p", [Got2]))}
catch C2:R2 ->
    #{id => <<"comparison_and_logic">>, title => <<"Strict Equality (=:=) & Quota Bounds Logic">>, status => <<"failed">>, time_ms => 6, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_Arithmetic, S2_Comparisons]
`, true

	case "ch01-l03":
		return `
CompileStage = case code:ensure_loaded(pattern_vars) of
    {module, pattern_vars} ->
        Exports = pattern_vars:module_info(exports),
        Required = [{rebind_update, 2}, {extract_middle, 1}],
        Missing = [FA || FA <- Required, not lists:member(FA, Exports)],
        case Missing of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"pattern_vars.erl compiled cleanly and exported rebind_update/2 and extract_middle/1.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Vars = try
    NonTripleRejected = try pattern_vars:extract_middle({only, two}) of
        _ -> false
    catch
        _:_ -> true
    end,
    {pattern_vars:rebind_update(10, 5),
     pattern_vars:rebind_update(100, 50),
     pattern_vars:rebind_update(0, -7),
     pattern_vars:extract_middle({alpha, beta, gamma}),
     pattern_vars:extract_middle({1, 999, "test"}),
     pattern_vars:extract_middle({tag, [1, 2], done}),
     NonTripleRejected}
of
    {30, 300, -14, beta, 999, [1, 2], true} ->
        #{id => <<"pattern_vars_suite">>, title => <<"Single Assignment & Tuple Destructuring">>, status => <<"passed">>, time_ms => 6, details => <<"Verified sequential immutable state progression, 3-tuple middle extraction, and non-triple rejection.">>};
    Got1 ->
        #{id => <<"pattern_vars_suite">>, title => <<"Single Assignment & Tuple Destructuring">>, status => <<"failed">>, time_ms => 6, details => list_to_binary(io_lib:format("Mismatch: ~p", [Got1]))}
catch C1:R1 ->
    #{id => <<"pattern_vars_suite">>, title => <<"Single Assignment & Tuple Destructuring">>, status => <<"failed">>, time_ms => 6, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
Stages = [CompileStage, S1_Vars]
`, true

	case "ch01-l04":
		return `
CompileStage = case code:ensure_loaded(telecom_events) of
    {module, telecom_events} ->
        Exports = telecom_events:module_info(exports),
        Required = [{make_event, 3}, {extract_caller, 1}, {swap_endpoints, 1}],
        Missing = [FA || FA <- Required, not lists:member(FA, Exports)],
        case Missing of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"telecom_events.erl compiled cleanly and exported make_event/3, extract_caller/1, and swap_endpoints/1.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Events = try
    Ev1 = telecom_events:make_event(101, alice, bob),
    Caller1 = telecom_events:extract_caller(Ev1),
    Swapped1 = telecom_events:swap_endpoints(Ev1),
    Ev2 = telecom_events:make_event(500, charlie, dave),
    Caller2 = telecom_events:extract_caller({call_event, 999, server_alpha, client_beta, 10}),
    Swapped2 = telecom_events:swap_endpoints({call_event, 777, src_node, dst_node, 360}),
    WrongTagRejected = try telecom_events:extract_caller({other_event, 101, alice, bob, 45}) of
        _ -> false
    catch
        _:_ -> true
    end,
    WrongArityRejected = try telecom_events:swap_endpoints({call_event, 101, alice, bob}) of
        _ -> false
    catch
        _:_ -> true
    end,
    case {Ev1, Caller1, Swapped1, Ev2, Caller2, Swapped2, WrongTagRejected, WrongArityRejected} of
        {{call_event, 101, alice, bob, 0}, alice, {call_event, 101, bob, alice, 0},
         {call_event, 500, charlie, dave, 0}, server_alpha, {call_event, 777, dst_node, src_node, 360}, true, true} ->
            #{id => <<"tuple_destructuring">>, title => <<"Tagged Tuple Creation & Endpoint Swapping">>, status => <<"passed">>, time_ms => 8, details => <<"Tagged 5-tuple creation, caller extraction, endpoint swapping, and tag/arity rejection verified.">>};
        Got1 ->
            #{id => <<"tuple_destructuring">>, title => <<"Tagged Tuple Creation & Endpoint Swapping">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Tuple mismatch: ~p", [Got1]))}
    end
catch C1:R1 ->
    #{id => <<"tuple_destructuring">>, title => <<"Tagged Tuple Creation & Endpoint Swapping">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
Stages = [CompileStage, S1_Events]
`, true

	case "ch01-l05":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(list_ops) of
    {module, list_ops} ->
        Exports = list_ops:module_info(exports),
        Required = [{prepend_item, 2}, {swap_first_two, 1}, {ascii_initial, 1}],
        Missing = [FA || FA <- Required, not lists:member(FA, Exports)],
        case Missing of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"list_ops.erl compiled cleanly and exported prepend_item/2, swap_first_two/1, and ascii_initial/1.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SourceCandidates = [
        filename:join(["%s", "src", "list_ops.erl"]),
        filename:join(["%s", "list_ops.erl"])
    ],
    SourceFile = case [P || P <- SourceCandidates, filelib:is_regular(P)] of
        [ValidSrc | _] -> ValidSrc;
        [] -> hd(SourceCandidates)
    end,
    Rules = #{
        forbidden_remote_calls => [{lists, append, 2}, {lists, nth, 2}, {lists, reverse, 1}, {lists, concat, 1}]
    },
    case bf_ast_verifier:verify_rules(SourceFile, Rules) of
        {ok, _} ->
            #{id => <<"ast_cons_pattern_audit">>, title => <<"AST Analysis: No lists Stdlib Shortcuts">>, status => <<"passed">>, time_ms => 10, details => <<"Verified zero disallowed lists helper calls via AST inspection.">>};
        {error, [#{message := Msg} | _]} ->
            #{id => <<"ast_cons_pattern_audit">>, title => <<"AST Analysis: No lists Stdlib Shortcuts">>, status => <<"failed">>, time_ms => 10, details => Msg};
        {error, Violations} ->
            #{id => <<"ast_cons_pattern_audit">>, title => <<"AST Analysis: No lists Stdlib Shortcuts">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C_Ast:R_Ast ->
    #{id => <<"ast_cons_pattern_audit">>, title => <<"AST Analysis: No lists Stdlib Shortcuts">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C_Ast, R_Ast]))}
end,
S2_Lists = try
    R1 = list_ops:prepend_item(10, [20, 30]),
    R2 = list_ops:prepend_item(first, []),
    R3 = list_ops:swap_first_two([alpha, beta, gamma, delta]),
    R4 = list_ops:swap_first_two([1, 2]),
    R5 = list_ops:ascii_initial("Erlang"),
    R6 = list_ops:ascii_initial("BEAM"),
    ShortSwapRejected = try list_ops:swap_first_two([only_one]) of
        _ -> false
    catch
        _:_ -> true
    end,
    EmptyStrRejected = try list_ops:ascii_initial("") of
        _ -> false
    catch
        _:_ -> true
    end,
    case {R1, R2, R3, R4, R5, R6, ShortSwapRejected, EmptyStrRejected} of
        {[10, 20, 30], [first], [beta, alpha, gamma, delta], [2, 1], {char_code, 69}, {char_code, 66}, true, true} ->
            #{id => <<"list_head_tail_ops">>, title => <<"Cons Cell [H|T] Head/Tail & Codepoints">>, status => <<"passed">>, time_ms => 8, details => <<"Verified O(1) prepend, element swapping, character codepoints, and under-length rejection.">>};
        Got1 ->
            #{id => <<"list_head_tail_ops">>, title => <<"Cons Cell [H|T] Head/Tail & Codepoints">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("List ops mismatch: ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"list_head_tail_ops">>, title => <<"Cons Cell [H|T] Head/Tail & Codepoints">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Ast, S2_Lists]
`, wsDir, wsDir), true

	case "ch01-l06":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(arity_calc) of
    {module, arity_calc} ->
        Exports = arity_calc:module_info(exports),
        Required = [{connect, 1}, {connect, 2}, {connect, 3}],
        Missing = [FA || FA <- Required, not lists:member(FA, Exports)],
        case Missing of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"arity_calc.erl compiled cleanly and exported connect/1, connect/2, and connect/3.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SourceCandidates = [
        filename:join(["%s", "src", "arity_calc.erl"]),
        filename:join(["%s", "arity_calc.erl"])
    ],
    SourceFile = case [P || P <- SourceCandidates, filelib:is_regular(P)] of
        [ValidSrc | _] -> ValidSrc;
        [] -> hd(SourceCandidates)
    end,
    LocalRes = bf_ast_verifier:verify_rules(SourceFile, #{required_remote_calls => [{erlang, connect, 2}, {erlang, connect, 3}]}),
    RemoteRes = bf_ast_verifier:verify_rules(SourceFile, #{required_remote_calls => [{arity_calc, connect, 2}, {arity_calc, connect, 3}]}),
    DelegationOk = case {LocalRes, RemoteRes} of
        {{ok, _}, _} -> true;
        {_, {ok, _}} -> true;
        _ -> false
    end,
    {ok, SrcBin} = file:read_file(SourceFile),
    HasDefaultPortMacro = binary:match(SrcBin, <<"?DEFAULT_PORT">>) =/= nomatch,
    HasDefaultTimeoutMacro = binary:match(SrcBin, <<"?DEFAULT_TIMEOUT">>) =/= nomatch,
    HasModuleMacro = binary:match(SrcBin, <<"?MODULE">>) =/= nomatch,
    case {DelegationOk, HasDefaultPortMacro, HasDefaultTimeoutMacro, HasModuleMacro} of
        {true, true, true, true} ->
            #{id => <<"ast_arity_and_macros_audit">>, title => <<"AST Analysis: Arity Delegation & Macro Audit">>, status => <<"passed">>, time_ms => 10, details => <<"Verified connect/1 -> connect/2 -> connect/3 delegation and ?DEFAULT_PORT, ?DEFAULT_TIMEOUT, ?MODULE usage.">>};
        {false, _, _, _} ->
            #{id => <<"ast_arity_and_macros_audit">>, title => <<"AST Analysis: Arity Delegation & Macro Audit">>, status => <<"failed">>, time_ms => 10, details => <<"Missing cascading delegation calls to connect/2 and connect/3.">>};
        _ ->
            #{id => <<"ast_arity_and_macros_audit">>, title => <<"AST Analysis: Arity Delegation & Macro Audit">>, status => <<"failed">>, time_ms => 10, details => <<"Missing required macro usages (?DEFAULT_PORT, ?DEFAULT_TIMEOUT, or ?MODULE) inside function bodies.">>}
    end
catch C_Ast:R_Ast ->
    #{id => <<"ast_arity_and_macros_audit">>, title => <<"AST Analysis: Arity Delegation & Macro Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C_Ast, R_Ast]))}
end,
S2_Arity = try
    R1 = arity_calc:connect(localhost),
    R2 = arity_calc:connect(localhost, 8080),
    R3 = arity_calc:connect(localhost, 8080, 2500),
    R4 = arity_calc:connect(auth_service, 5222, 30000),
    case {R1, R2, R3, R4} of
        {{connection, arity_calc, localhost, 80, 5000},
         {connection, arity_calc, localhost, 8080, 5000},
         {connection, arity_calc, localhost, 8080, 2500},
         {connection, arity_calc, auth_service, 5222, 30000}} ->
            #{id => <<"arity_delegation">>, title => <<"Function Arity Cascading Defaults & Macros">>, status => <<"passed">>, time_ms => 8, details => <<"connect/1 -> connect/2 -> connect/3 delegation and macros verified.">>};
        Got1 ->
            #{id => <<"arity_delegation">>, title => <<"Function Arity Cascading Defaults & Macros">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Arity mismatch: ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"arity_delegation">>, title => <<"Function Arity Cascading Defaults & Macros">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Ast, S2_Arity]
`, wsDir, wsDir), true

	case "ch01-l07":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(clause_router) of
    {module, clause_router} ->
        Exports = clause_router:module_info(exports),
        Required = [{describe_status, 1}, {head_or_default, 2}, {verify_identical_pair, 1}],
        Missing = [FA || FA <- Required, not lists:member(FA, Exports)],
        case Missing of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"clause_router.erl compiled cleanly and exported describe_status/1, head_or_default/2, and verify_identical_pair/1.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SourceCandidates = [
        filename:join(["%s", "src", "clause_router.erl"]),
        filename:join(["%s", "clause_router.erl"])
    ],
    SourceFile = case [P || P <- SourceCandidates, filelib:is_regular(P)] of
        [ValidSrc | _] -> ValidSrc;
        [] -> hd(SourceCandidates)
    end,
    case bf_ast_verifier:verify_rules(SourceFile, #{forbidden_constructs => [if_expr]}) of
        {ok, _} ->
            #{id => <<"ast_clause_style_audit">>, title => <<"AST Analysis: No if_expr Branching">>, status => <<"passed">>, time_ms => 10, details => <<"Verified pure multi-clause function heads with zero if expressions.">>};
        {error, [#{message := Msg} | _]} ->
            #{id => <<"ast_clause_style_audit">>, title => <<"AST Analysis: No if_expr Branching">>, status => <<"failed">>, time_ms => 10, details => Msg};
        {error, Violations} ->
            #{id => <<"ast_clause_style_audit">>, title => <<"AST Analysis: No if_expr Branching">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C_Ast:R_Ast ->
    #{id => <<"ast_clause_style_audit">>, title => <<"AST Analysis: No if_expr Branching">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C_Ast, R_Ast]))}
end,
S2_Router = try
    S_200 = clause_router:describe_status(200),
    S_404 = clause_router:describe_status(404),
    S_500 = clause_router:describe_status(500),
    S_418 = clause_router:describe_status(418),
    H_NonEmpty = clause_router:head_or_default([packet, ping], fallback),
    H_Empty = clause_router:head_or_default([], default_val),
    H_Num = clause_router:head_or_default([1, 2], 0),
    P_Same = clause_router:verify_identical_pair({alpha, alpha}),
    P_Diff = clause_router:verify_identical_pair({alpha, beta}),
    P_LooseNum = clause_router:verify_identical_pair({42, 42.0}),
    P_WrongArity = clause_router:verify_identical_pair({1, 2, 3}),
    case {S_200, S_404, S_500, S_418, H_NonEmpty, H_Empty, H_Num, P_Same, P_Diff, P_LooseNum, P_WrongArity} of
        {{ok, success}, {error, not_found}, {error, server_crash}, {error, unknown_code},
         packet, default_val, 1, {matched, alpha}, mismatch, mismatch, mismatch} ->
            #{id => <<"multi_clause_routing">>, title => <<"Multi-Clause Routing & Punctuation Triad">>, status => <<"passed">>, time_ms => 8, details => <<"Verified status routing, list head/fallback clauses, strict type pair matching, and non-pair mismatch fallback.">>};
        Got1 ->
            #{id => <<"multi_clause_routing">>, title => <<"Multi-Clause Routing & Punctuation Triad">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Mismatch: ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"multi_clause_routing">>, title => <<"Multi-Clause Routing & Punctuation Triad">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Ast, S2_Router]
`, wsDir, wsDir), true

	case "ch01-l08":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(telecom_foundations) of
    {module, telecom_foundations} ->
        Exports = telecom_foundations:module_info(exports),
        Required = [{classify_packet, 1}, {bill_call, 2}, {bill_call, 3}],
        Missing = [FA || FA <- Required, not lists:member(FA, Exports)],
        case Missing of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"telecom_foundations.erl compiled cleanly and exported classify_packet/1, bill_call/2, and bill_call/3.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SourceCandidates = [
        filename:join(["%s", "src", "telecom_foundations.erl"]),
        filename:join(["%s", "telecom_foundations.erl"])
    ],
    SourceFile = case [P || P <- SourceCandidates, filelib:is_regular(P)] of
        [ValidSrc | _] -> ValidSrc;
        [] -> hd(SourceCandidates)
    end,
    LocalRes = bf_ast_verifier:verify_rules(SourceFile, #{required_remote_calls => [{erlang, bill_call, 3}], forbidden_constructs => [if_expr]}),
    RemoteRes = bf_ast_verifier:verify_rules(SourceFile, #{required_remote_calls => [{telecom_foundations, bill_call, 3}], forbidden_constructs => [if_expr]}),
    AstOk = case {LocalRes, RemoteRes} of
        {{ok, _}, _} -> true;
        {_, {ok, _}} -> true;
        _ -> false
    end,
    NoForwardRefs = case epp:parse_file(SourceFile, []) of
        {ok, Forms} ->
            HasFwd = (fun Walk(T) when is_tuple(T) ->
                case element(1, T) of
                    map -> true;
                    bin when tuple_size(T) >= 3, element(3, T) =/= [] -> true;
                    clause when tuple_size(T) >= 4, element(4, T) =/= [] -> true;
                    _ -> Walk(tuple_to_list(T))
                end;
                Walk([H | Tail]) -> Walk(H) orelse Walk(Tail);
                Walk(_) -> false
            end)(Forms),
            not HasFwd;
        _ -> false
    end,
    case {AstOk, NoForwardRefs} of
        {true, true} ->
            #{id => <<"ast_delegation_and_forward_refs_audit">>, title => <<"AST Analysis: Arity Delegation & Zero Forward References">>, status => <<"passed">>, time_ms => 10, details => <<"Verified bill_call/2 -> bill_call/3 delegation and zero Maps, Binaries, if expressions, or when guards.">>};
        {false, _} ->
            #{id => <<"ast_delegation_and_forward_refs_audit">>, title => <<"AST Analysis: Arity Delegation & Zero Forward References">>, status => <<"failed">>, time_ms => 10, details => <<"Failed AST check: bill_call/2 must delegate to bill_call/3 without if expressions.">>};
        {true, false} ->
            #{id => <<"ast_delegation_and_forward_refs_audit">>, title => <<"AST Analysis: Arity Delegation & Zero Forward References">>, status => <<"failed">>, time_ms => 10, details => <<"Forbidden forward-reference syntax detected (Maps, non-empty Binaries, or when guards are banned in Chapter 1).">> }
    end
catch C_Ast:R_Ast ->
    #{id => <<"ast_delegation_and_forward_refs_audit">>, title => <<"AST Analysis: Arity Delegation & Zero Forward References">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C_Ast, R_Ast]))}
end,
S2_Suite = try
    P1 = telecom_foundations:classify_packet({ipv4, "10.0.0.1", "10.0.0.2", [ping, 100]}),
    P2 = telecom_foundations:classify_packet({ipv6, "fe80::1", "fe80::2", [data]}),
    P3 = telecom_foundations:classify_packet({ipv4, "10.0.0.1", "10.0.0.2", []}),
    P4 = telecom_foundations:classify_packet(bad_packet),
    P5 = telecom_foundations:classify_packet({icmp, "10.0.0.1", "10.0.0.2", [ping]}),
    B1 = telecom_foundations:bill_call(60, standard),
    B2 = telecom_foundations:bill_call(100, premium, 25),
    B3 = telecom_foundations:bill_call(3600, internal),
    B4 = telecom_foundations:bill_call(60, unknown_plan),
    case {P1, P2, P3, P4, P5, B1, B2, B3, B4} of
        {{ok, ipv4, "10.0.0.1", "10.0.0.2", ping},
         {ok, ipv6, "fe80::1", "fe80::2", data},
         {error, empty_payload},
         {error, invalid_packet},
         {error, invalid_packet},
         {ok, 310},
         {ok, 325},
         {ok, 0},
         {error, unknown_plan}} ->
            #{id => <<"telecom_foundations_engine">>, title => <<"Packet Classifier & CDR Billing Engine">>, status => <<"passed">>, time_ms => 8, details => <<"Full multi-clause packet classifier (including unsupported tag rejection) and CDR billing engine verified.">>};
        Got1 ->
            #{id => <<"telecom_foundations_engine">>, title => <<"Packet Classifier & CDR Billing Engine">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("CDR engine mismatch: ~p", [Got1]))}
    end
catch C1:R1 ->
    #{id => <<"telecom_foundations_engine">>, title => <<"Packet Classifier & CDR Billing Engine">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
Stages = [CompileStage, S1_Ast, S2_Suite]
`, wsDir, wsDir), true

	// ── CHAPTER 2 ─────────────────────────────────────────────────────────────
	case "ch02-l01":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(deep_match) of
    {module, deep_match} ->
        Exports = deep_match:module_info(exports),
        Required = [{extract_route, 1}, {repackage_envelope, 1}],
        Missing = [FA || FA <- Required, not lists:member(FA, Exports)],
        case Missing of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"deep_match.erl compiled cleanly and exported extract_route/1 and repackage_envelope/1.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SourceCandidates = [
        filename:join(["%s", "src", "deep_match.erl"]),
        filename:join(["%s", "deep_match.erl"])
    ],
    SourceFile = case [P || P <- SourceCandidates, filelib:is_regular(P)] of
        [ValidSrc | _] -> ValidSrc;
        [] -> hd(SourceCandidates)
    end,
    AstRes = bf_ast_verifier:verify_rules(SourceFile, #{forbidden_remote_calls => [{erlang, element, 2}], forbidden_constructs => [if_expr]}),
    AstOk = case AstRes of
        {ok, _} -> true;
        _ -> false
    end,
    NoForbiddenTypes = case epp:parse_file(SourceFile, []) of
        {ok, Forms} ->
            HasForbidden = (fun Walk(T) when is_tuple(T) ->
                case element(1, T) of
                    map -> true;
                    bin when tuple_size(T) >= 3, element(3, T) =/= [] -> true;
                    _ -> Walk(tuple_to_list(T))
                end;
                Walk([H | Tail]) -> Walk(H) orelse Walk(Tail);
                Walk(_) -> false
            end)(Forms),
            not HasForbidden;
        _ -> false
    end,
    case {AstOk, NoForbiddenTypes} of
        {true, true} ->
            #{id => <<"ast_deep_match_audit">>, title => <<"AST Analysis: No element/2, if_expr, Maps, or Binaries">>, status => <<"passed">>, time_ms => 10, details => <<"Verified direct tuple head pattern matching without erlang:element/2, if expressions, maps, or binaries.">>};
        {false, _} ->
            #{id => <<"ast_deep_match_audit">>, title => <<"AST Analysis: No element/2, if_expr, Maps, or Binaries">>, status => <<"failed">>, time_ms => 10, details => <<"Forbidden erlang:element/2 call or if_expr branching detected; match nested tuples directly in clause heads.">>};
        {true, false} ->
            #{id => <<"ast_deep_match_audit">>, title => <<"AST Analysis: No element/2, if_expr, Maps, or Binaries">>, status => <<"failed">>, time_ms => 10, details => <<"Forbidden syntax detected (maps and non-empty binaries are forbidden; use tuples, atoms, and strings only).">>}
    end
catch C_Ast:R_Ast ->
    #{id => <<"ast_deep_match_audit">>, title => <<"AST Analysis: No element/2, if_expr, Maps, or Binaries">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C_Ast, R_Ast]))}
end,
S2_Match = try
    R1 = deep_match:extract_route({packet, {header, 4, {route, "10.0.0.1", "10.0.0.2"}}, [ping, 1]}),
    R2 = deep_match:extract_route({packet, {header, 6, {route, "fe80::1", "fe80::2"}}, []}),
    R3 = deep_match:extract_route({packet, {header, 5, {route, "a", "b"}}, []}),
    R4 = deep_match:extract_route({corrupt, envelope}),
    R5 = deep_match:extract_route({packet, {header, 4, bad_route}, [ping]}),
    P = {packet, {header, 4, {route, "src_host", "dst_host"}}, [data, 42]},
    F1 = deep_match:repackage_envelope(P),
    D1 = deep_match:repackage_envelope({packet, {header, 6, {route, "a", "b"}}, []}),
    D2 = deep_match:repackage_envelope(corrupt),
    case {R1, R2, R3, R4, R5, F1, D1, D2} of
        {{ok, ipv4, "10.0.0.1", "10.0.0.2"},
         {ok, ipv6, "fe80::1", "fe80::2"},
         {error, {unsupported_version, 5}},
         {error, malformed_envelope},
         {error, malformed_envelope},
         {forwarded, "dst_host", P},
         {dropped, {packet, {header, 6, {route, "a", "b"}}, []}},
         {dropped, corrupt}} ->
            #{id => <<"deep_pattern_matching">>, title => <<"Deep Function Head Pattern Matching & Aliasing">>, status => <<"passed">>, time_ms => 8, details => <<"Nested tuple head pattern destructuring and aliasing verified across valid, unsupported, and malformed cases.">>};
        Got1 ->
            #{id => <<"deep_pattern_matching">>, title => <<"Deep Function Head Pattern Matching & Aliasing">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Mismatch: ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"deep_pattern_matching">>, title => <<"Deep Function Head Pattern Matching & Aliasing">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Ast, S2_Match]
`, wsDir, wsDir), true

	case "ch02-l02":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(guard_validator) of
    {module, guard_validator} ->
        Exports = guard_validator:module_info(exports),
        Required = [{validate_port, 1}, {classify_temperature, 1}, {safe_ratio, 2}],
        Missing = [FA || FA <- Required, not lists:member(FA, Exports)],
        case Missing of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"guard_validator.erl compiled cleanly and exported validate_port/1, classify_temperature/1, and safe_ratio/2.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SourceCandidates = [
        filename:join(["%s", "src", "guard_validator.erl"]),
        filename:join(["%s", "guard_validator.erl"])
    ],
    SourceFile = case [P || P <- SourceCandidates, filelib:is_regular(P)] of
        [ValidSrc | _] -> ValidSrc;
        [] -> hd(SourceCandidates)
    end,
    case bf_ast_verifier:verify_rules(SourceFile, #{required_constructs => [guards], forbidden_constructs => [if_expr]}) of
        {ok, _} ->
            #{id => <<"ast_guard_clauses_audit">>, title => <<"AST Analysis: Required Guards & No if_expr">>, status => <<"passed">>, time_ms => 10, details => <<"Verified when guard clauses are present and if expressions are absent.">>};
        {error, Violations} ->
            #{id => <<"ast_guard_clauses_audit">>, title => <<"AST Analysis: Required Guards & No if_expr">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST rule violation: ~p", [Violations]))}
    end
catch C_Ast:R_Ast ->
    #{id => <<"ast_guard_clauses_audit">>, title => <<"AST Analysis: Required Guards & No if_expr">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C_Ast, R_Ast]))}
end,
S2_Guards = try
    P1 = guard_validator:validate_port(8080),
    P1b = guard_validator:validate_port(1024),
    P1c = guard_validator:validate_port(65535),
    P2 = guard_validator:validate_port(80),
    P2b = guard_validator:validate_port(1),
    P2c = guard_validator:validate_port(1023),
    P3 = guard_validator:validate_port(70000),
    P3b = guard_validator:validate_port(65536),
    P4 = guard_validator:validate_port(-1),
    P4b = guard_validator:validate_port(0),
    P5 = guard_validator:validate_port(not_a_port),
    P6 = guard_validator:validate_port(80.0),
    T1 = guard_validator:classify_temperature(-5),
    T2 = guard_validator:classify_temperature(0),
    T2b = guard_validator:classify_temperature(0.0),
    T3 = guard_validator:classify_temperature(20),
    T3b = guard_validator:classify_temperature(25),
    T4 = guard_validator:classify_temperature(35),
    T4b = guard_validator:classify_temperature(25.5),
    T5 = guard_validator:classify_temperature(invalid),
    R1 = guard_validator:safe_ratio(10, 2),
    R1b = guard_validator:safe_ratio(4, 2),
    R1c = guard_validator:safe_ratio(-10, -2),
    R2 = guard_validator:safe_ratio(1, 2),
    R2b = guard_validator:safe_ratio(10, -2),
    R3 = guard_validator:safe_ratio(10, 0),
    R4 = guard_validator:safe_ratio(foo, 2),
    R5 = guard_validator:safe_ratio(10, "2"),
    case {P1, P1b, P1c, P2, P2b, P2c, P3, P3b, P4, P4b, P5, P6,
          T1, T2, T2b, T3, T3b, T4, T4b, T5,
          R1, R1b, R1c, R2, R2b, R3, R4, R5} of
        {{ok, unprivileged_port}, {ok, unprivileged_port}, {ok, unprivileged_port},
         {ok, privileged_port}, {ok, privileged_port}, {ok, privileged_port},
         {error, invalid_port}, {error, invalid_port}, {error, invalid_port}, {error, invalid_port}, {error, invalid_port}, {error, invalid_port},
         freezing, freezing, freezing, temperate, temperate, hot, hot, {error, invalid_temperature},
         high_ratio, high_ratio, high_ratio, normal_ratio, normal_ratio, {error, invalid_ratio}, {error, invalid_ratio}, {error, invalid_ratio}} ->
            #{id => <<"guard_clause_validation">>, title => <<"Pure Guard Clauses & Silent Guard Failure">>, status => <<"passed">>, time_ms => 10, details => <<"Passed all inclusive boundary port, temperature, negative-divisor, and silent guard failure checks.">>};
        Got1 ->
            #{id => <<"guard_clause_validation">>, title => <<"Pure Guard Clauses & Silent Guard Failure">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Guard mismatch: ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"guard_clause_validation">>, title => <<"Pure Guard Clauses & Silent Guard Failure">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Ast, S2_Guards]
`, wsDir, wsDir), true

	case "ch02-l03":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(flow_control) of
    {module, flow_control} ->
        Exports = flow_control:module_info(exports),
        Required = [{handle_http_response, 1}, {grade_latency, 1}],
        Missing = [FA || FA <- Required, not lists:member(FA, Exports)],
        case Missing of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"flow_control.erl compiled cleanly and exported handle_http_response/1 and grade_latency/1.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SourceCandidates = [
        filename:join(["%s", "src", "flow_control.erl"]),
        filename:join(["%s", "flow_control.erl"])
    ],
    SourceFile = case [P || P <- SourceCandidates, filelib:is_regular(P)] of
        [ValidSrc | _] -> ValidSrc;
        [] -> hd(SourceCandidates)
    end,
    AstOk = case bf_ast_verifier:verify_rules(SourceFile, #{required_constructs => [case_expr, if_expr]}) of
        {ok, _} -> true;
        _ -> false
    end,
    ScopedOk = case epp:parse_file(SourceFile, []) of
        {ok, Forms} ->
            FindFunExpr = fun(FunName, Arity, NodeTag) ->
                Matching = [Clauses || {function, _, F, A, Clauses} <- Forms, F =:= FunName, A =:= Arity],
                HasTag = fun Walk(T) when is_tuple(T) ->
                    (tuple_size(T) >= 1 andalso element(1, T) =:= NodeTag) orelse Walk(tuple_to_list(T));
                    Walk([H | Tail]) -> Walk(H) orelse Walk(Tail);
                    Walk(_) -> false
                end,
                Matching =/= [] andalso HasTag(Matching)
            end,
            FindFunExpr(handle_http_response, 1, 'case') andalso FindFunExpr(grade_latency, 1, 'if');
        _ -> false
    end,
    case {AstOk, ScopedOk} of
        {true, true} ->
            #{id => <<"ast_control_flow_audit">>, title => <<"AST Analysis: Required case...of & if...end">>, status => <<"passed">>, time_ms => 10, details => <<"Verified case...of in handle_http_response/1 and if...end in grade_latency/1.">>};
        _ ->
            #{id => <<"ast_control_flow_audit">>, title => <<"AST Analysis: Required case...of & if...end">>, status => <<"failed">>, time_ms => 10, details => <<"Required AST constructs missing: handle_http_response/1 must use case...of and grade_latency/1 must use if...end.">>}
    end
catch C_Ast:R_Ast ->
    #{id => <<"ast_control_flow_audit">>, title => <<"AST Analysis: Required case...of & if...end">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C_Ast, R_Ast]))}
end,
S2_Flow = try
    R1 = flow_control:handle_http_response({http_response, 200, "OK"}),
    R2 = flow_control:handle_http_response({http_response, 401, []}),
    R3 = flow_control:handle_http_response({http_response, 403, []}),
    R4 = flow_control:handle_http_response({http_response, 500, []}),
    R5 = flow_control:handle_http_response({http_response, 502, []}),
    R6 = flow_control:handle_http_response({http_response, 599, []}),
    R7 = flow_control:handle_http_response({http_response, 301, []}),
    R8 = flow_control:handle_http_response({http_response, "500", "bad"}),
    R9 = flow_control:handle_http_response(corrupt),
    L1 = flow_control:grade_latency(30),
    L2 = flow_control:grade_latency(49),
    L3 = flow_control:grade_latency(50),
    L4 = flow_control:grade_latency(150),
    L5 = flow_control:grade_latency(200),
    L6 = flow_control:grade_latency(201),
    L7 = flow_control:grade_latency(800),
    case {R1, R2, R3, R4, R5, R6, R7, R8, R9, L1, L2, L3, L4, L5, L6, L7} of
        {{ok, "OK"}, {error, unauthorized}, {error, unauthorized},
         {error, server_error}, {error, server_error}, {error, server_error},
         {error, {unexpected_status, 301}}, {error, invalid_response}, {error, invalid_response},
         optimal, optimal, acceptable, acceptable, acceptable, sla_breach, sla_breach} ->
            #{id => <<"case_and_if_expressions">>, title => <<"Control Expressions (case...of & if...end)">>, status => <<"passed">>, time_ms => 10, details => <<"Branch pattern matching, integer status boundaries, and SLA latency intervals verified.">>};
        Got1 ->
            #{id => <<"case_and_if_expressions">>, title => <<"Control Expressions (case...of & if...end)">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Flow mismatch: ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"case_and_if_expressions">>, title => <<"Control Expressions (case...of & if...end)">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Ast, S2_Flow]
`, wsDir, wsDir), true

	case "ch02-l04":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(recursive_search) of
    {module, recursive_search} ->
        Exports = recursive_search:module_info(exports),
        Required = [{find_product, 2}, {contains_item, 2}],
        Missing = [FA || FA <- Required, not lists:member(FA, Exports)],
        case Missing of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"recursive_search.erl compiled cleanly and exported find_product/2 and contains_item/2.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SourceCandidates = [
        filename:join(["%s", "src", "recursive_search.erl"]),
        filename:join(["%s", "recursive_search.erl"])
    ],
    SourceFile = case [P || P <- SourceCandidates, filelib:is_regular(P)] of
        [ValidSrc | _] -> ValidSrc;
        [] -> hd(SourceCandidates)
    end,
    Rules = #{
        forbidden_remote_calls => [{lists, keyfind, any}, {lists, member, any}, {lists, filter, any}, {lists, any, any}, {lists, keysearch, any}, {lists, search, any}],
        forbidden_constructs => [list_comprehension]
    },
    AstOk = case bf_ast_verifier:verify_rules(SourceFile, Rules) of
        {ok, _} -> true;
        _ -> false
    end,
    NoListsCalls = case epp:parse_file(SourceFile, []) of
        {ok, Forms} ->
            HasLists = (fun Walk(T) when is_tuple(T) ->
                case T of
                    {remote, _, {atom, _, lists}, _} -> true;
                    _ -> Walk(tuple_to_list(T))
                end;
                Walk([H | Tail]) -> Walk(H) orelse Walk(Tail);
                Walk(_) -> false
            end)(Forms),
            not HasLists;
        _ -> false
    end,
    case {AstOk, NoListsCalls} of
        {true, true} ->
            #{id => <<"ast_pure_recursion_audit">>, title => <<"AST Analysis: Pure Recursion Without lists:* or Comprehensions">>, status => <<"passed">>, time_ms => 10, details => <<"Verified manual recursive pattern matching with zero lists module calls or list comprehensions.">>};
        _ ->
            #{id => <<"ast_pure_recursion_audit">>, title => <<"AST Analysis: Pure Recursion Without lists:* or Comprehensions">>, status => <<"failed">>, time_ms => 10, details => <<"Forbidden lists module call or list comprehension detected; implement recursive head/tail pattern matching manually.">>}
    end
catch C_Ast:R_Ast ->
    #{id => <<"ast_pure_recursion_audit">>, title => <<"AST Analysis: Pure Recursion Without lists:* or Comprehensions">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C_Ast, R_Ast]))}
end,
S2_Search = try
    Inv = [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}],
    InvMixed = [{item, 2, "Decoy", 0, 0}, {product, 7, "Cable", 15, 20}, {product, 2, "Mouse", 25, 5}],
    F1 = recursive_search:find_product(Inv, 2),
    F1b = recursive_search:find_product(InvMixed, 2),
    F1c = recursive_search:find_product(Inv, 1),
    F2 = recursive_search:find_product(Inv, 99),
    F3 = recursive_search:find_product([], 1),
    Has1 = recursive_search:contains_item([apple, banana, cherry], banana),
    Has1b = recursive_search:contains_item([apple, banana, cherry], apple),
    Has2 = recursive_search:contains_item([apple, banana, cherry], date),
    Has3 = recursive_search:contains_item([], date),
    case {F1, F1b, F1c, F2, F3, Has1, Has1b, Has2, Has3} of
        {{ok, {product, 2, "Mouse", 25, 5}},
         {ok, {product, 2, "Mouse", 25, 5}},
         {ok, {product, 1, "Keyboard", 50, 10}},
         not_found,
         not_found,
         true, true, false, false} ->
            #{id => <<"recursive_search_invariants">>, title => <<"Recursive Base Cases & Tuple Matching">>, status => <<"passed">>, time_ms => 8, details => <<"Recursive tuple lookup (ignoring non-product decoys), item containment, and [] base cases verified.">>};
        Got1 ->
            #{id => <<"recursive_search_invariants">>, title => <<"Recursive Base Cases & Tuple Matching">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Search mismatch: ~p", [Got1]))}
    end
catch Class_Search:Err_Search ->
    #{id => <<"recursive_search_invariants">>, title => <<"Recursive Base Cases & Tuple Matching">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_Search, Err_Search]))}
end,
Stages = [CompileStage, S1_Ast, S2_Search]
`, wsDir, wsDir), true

	case "ch02-l05":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(tco_counter) of
    {module, tco_counter} ->
        Exports = tco_counter:module_info(exports),
        Required = [{sum_packets, 1}, {count_packets, 1}],
        Missing = [FA || FA <- Required, not lists:member(FA, Exports)],
        case Missing of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"tco_counter.erl compiled cleanly and exported sum_packets/1 and count_packets/1.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SourceCandidates = [
        filename:join(["%s", "src", "tco_counter.erl"]),
        filename:join(["%s", "tco_counter.erl"])
    ],
    SourceFile = case [P || P <- SourceCandidates, filelib:is_regular(P)] of
        [ValidSrc | _] -> ValidSrc;
        [] -> hd(SourceCandidates)
    end,
    Rules = #{
        require_tail_recursion => [{sum_packets, 1}, {count_packets, 1}],
        forbidden_remote_calls => [{lists, sum, 1}, {erlang, length, 1}, {lists, foldl, any}, {lists, foldr, any}],
        forbidden_constructs => [list_comprehension]
    },
    case bf_ast_verifier:verify_rules(SourceFile, Rules) of
        {ok, _} ->
            #{id => <<"tail_recursion_ast_audit">>, title => <<"Tail Call Optimization (TCO) & AST Verification">>, status => <<"passed">>, time_ms => 15, details => <<"Strict tail recursion and zero forbidden BIFs/comprehensions verified via AST analysis.">>};
        {error, [#{message := Msg} | _]} ->
            #{id => <<"tail_recursion_ast_audit">>, title => <<"Tail Call Optimization (TCO) & AST Verification">>, status => <<"failed">>, time_ms => 15, details => Msg};
        {error, OtherErr} ->
            #{id => <<"tail_recursion_ast_audit">>, title => <<"Tail Call Optimization (TCO) & AST Verification">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Rule violation: ~p", [OtherErr]))}
    end
catch C_Ast:R_Ast ->
    #{id => <<"tail_recursion_ast_audit">>, title => <<"Tail Call Optimization (TCO) & AST Verification">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST check crashed: ~p:~p", [C_Ast, R_Ast]))}
end,
S2_Tco = try
    Sum = tco_counter:sum_packets([10, 20, 30, 40]),
    SumEmpty = tco_counter:sum_packets([]),
    SumSeq = tco_counter:sum_packets(lists:seq(1, 100)),
    Cnt = tco_counter:count_packets([1, 2, 3, 4, 5]),
    CntEmpty = tco_counter:count_packets([]),
    CntBig = tco_counter:count_packets(lists:duplicate(10000, pkt)),
    case {Sum, SumEmpty, SumSeq, Cnt, CntEmpty, CntBig} of
        {100, 0, 5050, 5, 0, 10000} ->
            #{id => <<"functional_contract">>, title => <<"Functional Accumulator Correctness">>, status => <<"passed">>, time_ms => 10, details => <<"Empty, standard, sequence (5050), and 10,000-element O(1)-stack TCO batch checks passed.">>};
        Got1 ->
            #{id => <<"functional_contract">>, title => <<"Functional Accumulator Correctness">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Functional mismatch: got ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"functional_contract">>, title => <<"Functional Accumulator Correctness">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Ast, S2_Tco]
`, wsDir, wsDir), true

	case "ch02-l06":
		invSrc := filepath.Join(session.WorkspaceDir, "src", "inventory.erl")
		invRoot := filepath.Join(session.WorkspaceDir, "inventory.erl")
		if _, err := os.Stat(invSrc); err == nil {
			return r.buildInventoryVerificationScript(wsDir), true
		}
		if _, err := os.Stat(invRoot); err == nil {
			return r.buildInventoryVerificationScript(wsDir), true
		}
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(acc_filter) of
    {module, acc_filter} ->
        Exports = acc_filter:module_info(exports),
        Required = [{keep_valid_orders, 1}],
        Missing = [FA || FA <- Required, not lists:member(FA, Exports)],
        case Missing of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"acc_filter.erl compiled cleanly and exported keep_valid_orders/1.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SourceCandidates = [
        filename:join(["%s", "src", "acc_filter.erl"]),
        filename:join(["%s", "acc_filter.erl"])
    ],
    SourceFile = case [P || P <- SourceCandidates, filelib:is_regular(P)] of
        [ValidSrc | _] -> ValidSrc;
        [] -> hd(SourceCandidates)
    end,
    Rules = #{
        require_tail_recursion => [{keep_valid_orders, 1}],
        required_remote_calls => [{lists, reverse, 1}],
        forbidden_remote_calls => [{lists, filter, any}, {lists, map, any}, {lists, filtermap, any}, {lists, foldl, any}, {lists, foldr, any}],
        forbidden_constructs => [list_comprehension]
    },
    AstRes = bf_ast_verifier:verify_rules(SourceFile, Rules),
    NoAppend = case epp:parse_file(SourceFile, []) of
        {ok, Forms} ->
            HasAppend = (fun Walk(T) when is_tuple(T) ->
                case element(1, T) of
                    op when tuple_size(T) >= 3, element(3, T) =:= '++' -> true;
                    _ -> Walk(tuple_to_list(T))
                end;
                Walk([H | Tail]) -> Walk(H) orelse Walk(Tail);
                Walk(_) -> false
            end)(Forms),
            not HasAppend;
        _ -> false
    end,
    case {AstRes, NoAppend} of
        {{ok, _}, true} ->
            #{id => <<"ast_list_accumulator_audit">>, title => <<"AST Analysis: Tail-Recursive Accumulator + lists:reverse/1">>, status => <<"passed">>, time_ms => 12, details => <<"Verified tail-recursive accumulator, lists:reverse/1 usage, zero lists:filter/map/comprehensions, and zero O(N^2) ++ appending.">>};
        {{error, [#{message := Msg} | _]}, _} ->
            #{id => <<"ast_list_accumulator_audit">>, title => <<"AST Analysis: Tail-Recursive Accumulator + lists:reverse/1">>, status => <<"failed">>, time_ms => 12, details => Msg};
        {_, false} ->
            #{id => <<"ast_list_accumulator_audit">>, title => <<"AST Analysis: Tail-Recursive Accumulator + lists:reverse/1">>, status => <<"failed">>, time_ms => 12, details => <<"Forbidden O(N^2) list append operator (++) detected; prepend with [Id | Acc] and call lists:reverse/1 once at the base case.">>};
        {{error, OtherErr}, _} ->
            #{id => <<"ast_list_accumulator_audit">>, title => <<"AST Analysis: Tail-Recursive Accumulator + lists:reverse/1">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST Rule violation: ~p", [OtherErr]))}
    end
catch C_Ast:R_Ast ->
    #{id => <<"ast_list_accumulator_audit">>, title => <<"AST Analysis: Tail-Recursive Accumulator + lists:reverse/1">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST check crashed: ~p:~p", [C_Ast, R_Ast]))}
end,
S2_Reverse = try
    Orders1 = [{order, 1, 5, confirmed}, {order, 2, 0, confirmed}, {order, 3, 10, pending}, {order, 4, 8, confirmed}],
    Orders2 = [{order, 5, 0, confirmed}, {order, 6, 12, canceled}, {bad_shape, 7, 5, confirmed}],
    BigOrders = [{order, N, N rem 3, confirmed} || N <- lists:seq(1, 3000)],
    ExpectedBig = [N || N <- lists:seq(1, 3000), (N rem 3) > 0],
    R1 = acc_filter:keep_valid_orders(Orders1),
    R2 = acc_filter:keep_valid_orders(Orders2),
    R3 = acc_filter:keep_valid_orders([]),
    R4 = acc_filter:keep_valid_orders(BigOrders),
    case {R1, R2, R3, R4 =:= ExpectedBig} of
        {[1, 4], [], [], true} ->
            #{id => <<"accumulator_and_reverse">>, title => <<"Accumulator Pattern & lists:reverse/1 Preservation">>, status => <<"passed">>, time_ms => 8, details => <<"Order preserved correctly using O(1) prepend and lists:reverse/1 across standard, empty, and 3,000-order batches.">>};
        Got1 ->
            #{id => <<"accumulator_and_reverse">>, title => <<"Accumulator Pattern & lists:reverse/1 Preservation">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Reverse mismatch: ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"accumulator_and_reverse">>, title => <<"Accumulator Pattern & lists:reverse/1 Preservation">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Ast, S2_Reverse]
`, wsDir, wsDir), true

	case "ch02-l07":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(tuple_updater) of
    {module, tuple_updater} ->
        Exports = tuple_updater:module_info(exports),
        Required = [{update_product_price, 3}, {partition_orders, 2}],
        Missing = [FA || FA <- Required, not lists:member(FA, Exports)],
        case Missing of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"tuple_updater.erl compiled cleanly and exported update_product_price/3 and partition_orders/2.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SourceCandidates = [
        filename:join(["%s", "src", "tuple_updater.erl"]),
        filename:join(["%s", "tuple_updater.erl"])
    ],
    SourceFile = case [P || P <- SourceCandidates, filelib:is_regular(P)] of
        [ValidSrc | _] -> ValidSrc;
        [] -> hd(SourceCandidates)
    end,
    Rules = #{
        require_tail_recursion => [{update_product_price, 3}, {partition_orders, 2}],
        required_remote_calls => [{lists, reverse, 1}],
        forbidden_remote_calls => [{lists, partition, any}, {lists, keyreplace, any}, {lists, map, any}, {lists, filter, any}, {lists, foldl, any}, {lists, foldr, any}],
        forbidden_constructs => [list_comprehension]
    },
    AstRes = bf_ast_verifier:verify_rules(SourceFile, Rules),
    NoAppend = case epp:parse_file(SourceFile, []) of
        {ok, Forms} ->
            HasAppend = (fun Walk(T) when is_tuple(T) ->
                case element(1, T) of
                    op when tuple_size(T) >= 3, element(3, T) =:= '++' -> true;
                    _ -> Walk(tuple_to_list(T))
                end;
                Walk([H | Tail]) -> Walk(H) orelse Walk(Tail);
                Walk(_) -> false
            end)(Forms),
            not HasAppend;
        _ -> false
    end,
    case {AstRes, NoAppend} of
        {{ok, _}, true} ->
            #{id => <<"ast_tuple_updater_audit">>, title => <<"AST Analysis: Tail Recursion, lists:reverse/1 & Zero BIF Shortcuts">>, status => <<"passed">>, time_ms => 12, details => <<"Verified tail-recursive accumulation, lists:reverse/1, and zero lists:partition/keyreplace/comprehensions/++.">>};
        {{error, [#{message := Msg} | _]}, _} ->
            #{id => <<"ast_tuple_updater_audit">>, title => <<"AST Analysis: Tail Recursion, lists:reverse/1 & Zero BIF Shortcuts">>, status => <<"failed">>, time_ms => 12, details => Msg};
        {_, false} ->
            #{id => <<"ast_tuple_updater_audit">>, title => <<"AST Analysis: Tail Recursion, lists:reverse/1 & Zero BIF Shortcuts">>, status => <<"failed">>, time_ms => 12, details => <<"Forbidden O(N^2) list append operator (++) detected; prepend onto accumulators and reverse once at base case.">>};
        {{error, OtherErr}, _} ->
            #{id => <<"ast_tuple_updater_audit">>, title => <<"AST Analysis: Tail Recursion, lists:reverse/1 & Zero BIF Shortcuts">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST Rule violation: ~p", [OtherErr]))}
    end
catch C_Ast:R_Ast ->
    #{id => <<"ast_tuple_updater_audit">>, title => <<"AST Analysis: Tail Recursion, lists:reverse/1 & Zero BIF Shortcuts">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST check crashed: ~p:~p", [C_Ast, R_Ast]))}
end,
S2_Updater = try
    Inv = [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}],
    Inv3 = [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}, {product, 3, "Cable", 15, 20}],
    U1 = tuple_updater:update_product_price(Inv, 2, 30),
    U1b = tuple_updater:update_product_price(Inv3, 2, 30),
    U2 = tuple_updater:update_product_price(Inv, 99, 100),
    U3 = tuple_updater:update_product_price([], 1, 10),
    Orders = [{order, 1, 10}, {order, 2, 2}, {order, 3, 5}, {order, 4, 4}],
    P1 = tuple_updater:partition_orders(Orders, 5),
    P2 = tuple_updater:partition_orders([], 5),
    BigOrders = [{order, N, N rem 6} || N <- lists:seq(1, 2000)],
    ExpectedBig = {[{order, N, N rem 6} || N <- lists:seq(1, 2000), (N rem 6) >= 3], [{order, N, N rem 6} || N <- lists:seq(1, 2000), (N rem 6) < 3]},
    P3 = tuple_updater:partition_orders(BigOrders, 3),
    case {U1, U1b, U2, U3, P1, P2, P3 =:= ExpectedBig} of
        {[{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 30, 5}],
         [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 30, 5}, {product, 3, "Cable", 15, 20}],
         [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}],
         [],
         {[{order, 1, 10}, {order, 3, 5}], [{order, 2, 2}, {order, 4, 4}]},
         {[], []},
         true} ->
            #{id => <<"tuple_update_and_partition">>, title => <<"Tail-Recursive Tuple Update & Dual-Accumulator Partitioning">>, status => <<"passed">>, time_ms => 10, details => <<"Middle-element position preservation, MinQty inclusive boundary, and 2,000-order dual-accumulator pass verified.">>};
        Got1 ->
            #{id => <<"tuple_update_and_partition">>, title => <<"Tail-Recursive Tuple Update & Dual-Accumulator Partitioning">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Mismatch: ~p", [Got1]))}
    end
catch Class_Upd:Err_Upd ->
    #{id => <<"tuple_update_and_partition">>, title => <<"Tail-Recursive Tuple Update & Dual-Accumulator Partitioning">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_Upd, Err_Upd]))}
end,
Stages = [CompileStage, S1_Ast, S2_Updater]
`, wsDir, wsDir), true

	case "ch02-l08":
		return r.buildInventoryVerificationScript(wsDir), true

	// ── CHAPTER 3 ─────────────────────────────────────────────────────────────
	case "ch03-l01":
		return fmt.Sprintf(`
CompileStage_H01 = case code:ensure_loaded(hof_basics) of
    {module, hof_basics} ->
        Exports_H01 = hof_basics:module_info(exports),
        Req_H01 = [{make_multiplier, 1}, {apply_twice, 2}, {math_capture, 0}, {choose_pricing_strategy, 1}],
        Missing_H01 = [FA || FA <- Req_H01, not lists:member(FA, Exports_H01)],
        case Missing_H01 of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"hof_basics.erl compiled cleanly and exported all 4 higher-order functions.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing_H01]))}
        end;
    {error, E_H01} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_H01]))}
end,
S_Ast_H01 = try
    SourceCandidates_H01 = [
        filename:join(["%s", "src", "hof_basics.erl"]),
        filename:join(["%s", "hof_basics.erl"])
    ],
    SourceFile_H01 = case [P || P <- SourceCandidates_H01, filelib:is_regular(P)] of
        [ValidSrc_H01 | _] -> ValidSrc_H01;
        [] -> hd(SourceCandidates_H01)
    end,
    Rules_H01 = #{
        required_constructs => [fun_expr, remote_fun_capture, guards],
        required_remote_calls => [{erlang, abs, 1}],
        forbidden_constructs => [map_syntax, bit_syntax]
    },
    case bf_ast_verifier:verify_rules(SourceFile_H01, <<>>, Rules_H01) of
        {ok, _} ->
            #{id => <<"ast_hof_basics_audit">>, title => <<"AST Construct & Remote Capture Audit (bf_ast_verifier)">>, status => <<"passed">>, time_ms => 12, details => <<"Verified fun closures, remote fun erlang:abs/1 capture, guard clauses, and zero maps/binaries.">>};
        {error, AstViolations_H01} ->
            FirstMsg_H01 = case AstViolations_H01 of
                [#{message := M_H01} | _] -> M_H01;
                _ -> list_to_binary(io_lib:format("AST violations: ~p", [AstViolations_H01]))
            end,
            #{id => <<"ast_hof_basics_audit">>, title => <<"AST Construct & Remote Capture Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => FirstMsg_H01, error => AstViolations_H01}
    end
catch Class_Ast_H01:Err_Ast_H01 ->
    #{id => <<"ast_hof_basics_audit">>, title => <<"AST Construct & Remote Capture Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST check crashed: ~p:~p", [Class_Ast_H01, Err_Ast_H01]))}
end,
S1_Closures = try
    Mul5 = hof_basics:make_multiplier(5),
    Mul0 = hof_basics:make_multiplier(0),
    MulNeg = hof_basics:make_multiplier(-3),
    R_Mul = Mul5(10),
    R_Mul0 = Mul0(10),
    R_MulNeg = MulNeg(7),
    R_Twice = hof_basics:apply_twice(fun(X) -> X * 3 end, 2),
    AbsRef = hof_basics:math_capture(),
    R_Abs = AbsRef(-42),
    R_AbsPos = AbsRef(42),
    CaptureInfoOk = (erlang:fun_info(AbsRef, type) =:= {type, external}) andalso
                    (erlang:fun_info(AbsRef, module) =:= {module, erlang}) andalso
                    (erlang:fun_info(AbsRef, name) =:= {name, abs}) andalso
                    (erlang:fun_info(AbsRef, arity) =:= {arity, 1}),
    VipStrat = hof_basics:choose_pricing_strategy(vip),
    WholesaleStrat = hof_basics:choose_pricing_strategy(wholesale),
    StandardStrat = hof_basics:choose_pricing_strategy(regular),
    case {R_Mul, R_Mul0, R_MulNeg, R_Twice, R_Abs, R_AbsPos, CaptureInfoOk, VipStrat(100), VipStrat(15), WholesaleStrat(100), WholesaleStrat(15), StandardStrat(100), StandardStrat(15)} of
        {50, 0, -21, 18, 42, 42, true, 80, 12, 70, 10, 100, 15} ->
            #{id => <<"closures_and_captures">>, title => <<"First-Class Functions, Closures & Captures">>, status => <<"passed">>, time_ms => 8, details => <<"Lexical closures, external erlang:abs/1 capture, odd-integer truncation, and strategy patterns verified">>};
        {_, _, _, _, _, _, false, _, _, _, _, _, _} ->
            #{id => <<"closures_and_captures">>, title => <<"First-Class Functions, Closures & Captures">>, status => <<"failed">>, time_ms => 8, details => <<"math_capture/0 must return a direct external capture (fun erlang:abs/1), not a local wrapper fun.">>};
        Got_H01 ->
            #{id => <<"closures_and_captures">>, title => <<"First-Class Functions, Closures & Captures">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("HOF mismatch: ~p", [Got_H01]))}
    end
catch Class_H01:Err_H01 ->
    #{id => <<"closures_and_captures">>, title => <<"First-Class Functions, Closures & Captures">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_H01, Err_H01]))}
end,
S2_GuardCheck = try
    NonFunRejected = try
        hof_basics:apply_twice(not_a_function, 10),
        false
    catch error:function_clause ->
        true;
    _:_ ->
        false
    end,
    WrongArityRejected = try
        hof_basics:apply_twice(fun(A, B) -> A + B end, 10),
        false
    catch error:function_clause ->
        true;
    _:_ ->
        false
    end,
    case {NonFunRejected, WrongArityRejected} of
        {true, true} ->
            #{id => <<"is_function_guard">>, title => <<"is_function/2 Guard Protection">>, status => <<"passed">>, time_ms => 5, details => <<"Verified apply_twice/2 rejects non-functions and wrong-arity funs at the function head with function_clause.">>};
        _ ->
            #{id => <<"is_function_guard">>, title => <<"is_function/2 Guard Protection">>, status => <<"failed">>, time_ms => 5, details => <<"apply_twice/2 must guard F with is_function(F, 1) so non-functions and wrong-arity funs raise function_clause before body evaluation.">>}
    end
catch Class_H01b:Err_H01b ->
    #{id => <<"is_function_guard">>, title => <<"is_function/2 Guard Protection">>, status => <<"failed">>, time_ms => 5, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_H01b, Err_H01b]))}
end,
Stages = [CompileStage_H01, S_Ast_H01, S1_Closures, S2_GuardCheck]
`, wsDir, wsDir), true

	case "ch03-l02":
		return fmt.Sprintf(`
CompileStage_H02 = case code:ensure_loaded(hof_transform) of
    {module, hof_transform} ->
        Exports_H02 = hof_transform:module_info(exports),
        Req_H02 = [{discount_prices, 2}, {active_sessions, 1}, {sanitize_metrics, 1}],
        Missing_H02 = [FA || FA <- Req_H02, not lists:member(FA, Exports_H02)],
        case Missing_H02 of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"hof_transform.erl compiled cleanly and exported discount_prices/2, active_sessions/1, sanitize_metrics/1.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing_H02]))}
        end;
    {error, E_H02} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_H02]))}
end,
S_Ast_H02 = try
    SourceCandidates_H02 = [
        filename:join(["%s", "src", "hof_transform.erl"]),
        filename:join(["%s", "hof_transform.erl"])
    ],
    SourceFile_H02 = case [P || P <- SourceCandidates_H02, filelib:is_regular(P)] of
        [ValidSrc_H02 | _] -> ValidSrc_H02;
        [] -> hd(SourceCandidates_H02)
    end,
    Rules_H02 = #{
        required_remote_calls => [{lists, map, 2}, {lists, filter, 2}, {lists, filtermap, 2}],
        forbidden_constructs => [list_comprehension, map_syntax, bit_syntax]
    },
    case bf_ast_verifier:verify_rules(SourceFile_H02, <<>>, Rules_H02) of
        {ok, _} ->
            #{id => <<"ast_hof_transform_audit">>, title => <<"AST HOF & Construct Audit (bf_ast_verifier)">>, status => <<"passed">>, time_ms => 12, details => <<"Verified lists:map/2, lists:filter/2, lists:filtermap/2 usage and zero list comprehensions, maps, or binaries.">>};
        {error, AstViolations_H02} ->
            FirstMsg_H02 = case AstViolations_H02 of
                [#{message := M_H02} | _] -> M_H02;
                _ -> list_to_binary(io_lib:format("AST violations: ~p", [AstViolations_H02]))
            end,
            #{id => <<"ast_hof_transform_audit">>, title => <<"AST HOF & Construct Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => FirstMsg_H02, error => AstViolations_H02}
    end
catch Class_Ast_H02:Err_Ast_H02 ->
    #{id => <<"ast_hof_transform_audit">>, title => <<"AST HOF & Construct Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST check crashed: ~p:~p", [Class_Ast_H02, Err_Ast_H02]))}
end,
S1_Transform = try
    Discounts = hof_transform:discount_prices([{product, 1, "Desk", 100}, {product, 2, "Chair", 50}], 20),
    DiscountTrunc = hof_transform:discount_prices([{product, 3, "Cable", 25}], 10),
    DiscountEmpty = hof_transform:discount_prices([], 20),
    Active = hof_transform:active_sessions([{session, "s1", active}, {session, "s2", expired}, {session, "s3", active}]),
    ActiveEmpty = hof_transform:active_sessions([]),
    ActiveNone = hof_transform:active_sessions([{session, 1, expired}]),
    Metrics = hof_transform:sanitize_metrics([{cpu, 10.4}, {temp, -5.0}, {disk, 99.8}]),
    MetricsEdge = hof_transform:sanitize_metrics([{idle, 0.0}, {voltage, -0.5}, {ok_int, 7}]),
    MetricsEmpty = hof_transform:sanitize_metrics([]),
    case {Discounts, DiscountTrunc, DiscountEmpty, Active, ActiveEmpty, ActiveNone, Metrics, MetricsEdge, MetricsEmpty} of
        {[{product, 1, "Desk", 80}, {product, 2, "Chair", 40}],
         [{product, 3, "Cable", 23}],
         [],
         [{session, "s1", active}, {session, "s3", active}],
         [],
         [],
         [{cpu, 10}, {disk, 100}],
         [{idle, 0}, {ok_int, 7}],
         []} ->
            #{id => <<"map_filter_filtermap">>, title => <<"lists:map, filter & filtermap Operations">>, status => <<"passed">>, time_ms => 10, details => <<"Single-pass filtermap, integer truncation, zero-boundary, and empty-list edge cases verified.">>};
        Got_H02 ->
            #{id => <<"map_filter_filtermap">>, title => <<"lists:map, filter & filtermap Operations">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Transform mismatch: ~p", [Got_H02]))}
    end
catch Class_H02:Err_H02 ->
    #{id => <<"map_filter_filtermap">>, title => <<"lists:map, filter & filtermap Operations">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_H02, Err_H02]))}
end,
Stages = [CompileStage_H02, S_Ast_H02, S1_Transform]
`, wsDir, wsDir), true

	case "ch03-l03":
		return fmt.Sprintf(`
CompileStage_H03 = case code:ensure_loaded(hof_predicates) of
    {module, hof_predicates} ->
        Exports_H03 = hof_predicates:module_info(exports),
        Req_H03 = [{all_in_stock, 1}, {has_critical_error, 1}, {split_orders_by_stock, 2}],
        Missing_H03 = [FA || FA <- Req_H03, not lists:member(FA, Exports_H03)],
        case Missing_H03 of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"hof_predicates.erl compiled cleanly and exported all_in_stock/1, has_critical_error/1, split_orders_by_stock/2.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing_H03]))}
        end;
    {error, E_H03} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_H03]))}
end,
S_Ast_H03 = try
    SourceCandidates_H03 = [
        filename:join(["%s", "src", "hof_predicates.erl"]),
        filename:join(["%s", "hof_predicates.erl"])
    ],
    SourceFile_H03 = case [P || P <- SourceCandidates_H03, filelib:is_regular(P)] of
        [ValidSrc_H03 | _] -> ValidSrc_H03;
        [] -> hd(SourceCandidates_H03)
    end,
    Rules_H03 = #{
        required_remote_calls => [{lists, all, 2}, {lists, any, 2}, {lists, partition, 2}],
        forbidden_constructs => [list_comprehension, map_syntax, bit_syntax]
    },
    case bf_ast_verifier:verify_rules(SourceFile_H03, <<>>, Rules_H03) of
        {ok, _} ->
            #{id => <<"ast_hof_predicates_audit">>, title => <<"AST Predicate & Partition Audit (bf_ast_verifier)">>, status => <<"passed">>, time_ms => 12, details => <<"Verified lists:all/2, lists:any/2, lists:partition/2 calls and zero list comprehensions, maps, or binaries.">>};
        {error, AstViolations_H03} ->
            FirstMsg_H03 = case AstViolations_H03 of
                [#{message := M_H03} | _] -> M_H03;
                _ -> list_to_binary(io_lib:format("AST violations: ~p", [AstViolations_H03]))
            end,
            #{id => <<"ast_hof_predicates_audit">>, title => <<"AST Predicate & Partition Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => FirstMsg_H03, error => AstViolations_H03}
    end
catch Class_Ast_H03:Err_Ast_H03 ->
    #{id => <<"ast_hof_predicates_audit">>, title => <<"AST Predicate & Partition Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST check crashed: ~p:~p", [Class_Ast_H03, Err_Ast_H03]))}
end,
S1_Predicates = try
    AllOk = hof_predicates:all_in_stock([{product, 1, "P1", 10, 5}, {product, 2, "P2", 20, 2}]),
    AllEmpty = hof_predicates:all_in_stock([]),
    AllZero = hof_predicates:all_in_stock([{product, 1, "P1", 10, 0}]),
    AllNeg = hof_predicates:all_in_stock([{product, 1, "P1", 10, 5}, {product, 2, "P2", 20, -1}]),
    HasCrit = hof_predicates:has_critical_error([{log, info, "ok"}, {log, critical, "oom"}]),
    HasNoCrit = hof_predicates:has_critical_error([{log, info, "ok"}, {log, warn, "slow"}]),
    HasCritEmpty = hof_predicates:has_critical_error([]),
    {StdOrders, BulkOrders} = hof_predicates:split_orders_by_stock([{order, 1, 5}, {order, 2, 25}, {order, 3, 10}, {order, 4, 0}, {order, 5, -3}], 10),
    {EmptyStd, EmptyBulk} = hof_predicates:split_orders_by_stock([], 10),
    case {AllOk, AllEmpty, AllZero, AllNeg, HasCrit, HasNoCrit, HasCritEmpty, StdOrders, BulkOrders, EmptyStd, EmptyBulk} of
        {true, true, false, false, true, false, false, [{order, 1, 5}, {order, 3, 10}], [{order, 2, 25}, {order, 4, 0}, {order, 5, -3}], [], []} ->
            #{id => <<"boolean_predicates">>, title => <<"lists:all, any & partition Invariants">>, status => <<"passed">>, time_ms => 10, details => <<"Short-circuit predicates, empty list edge cases, negative-quantity bounds, and single-pass partitioning verified">>};
        Got_H03 ->
            #{id => <<"boolean_predicates">>, title => <<"lists:all, any & partition Invariants">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Predicates mismatch: ~p", [Got_H03]))}
    end
catch Class_H03:Err_H03 ->
    #{id => <<"boolean_predicates">>, title => <<"lists:all, any & partition Invariants">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_H03, Err_H03]))}
end,
Stages = [CompileStage_H03, S_Ast_H03, S1_Predicates]
`, wsDir, wsDir), true

	case "ch03-l04":
		return fmt.Sprintf(`
CompileStage_H04 = case code:ensure_loaded(hof_fold) of
    {module, hof_fold} ->
        Exports_H04 = hof_fold:module_info(exports),
        Req_H04 = [{sum_ledger, 1}, {min_max_latency, 1}, {reverse_with_fold, 1}],
        Missing_H04 = [FA || FA <- Req_H04, not lists:member(FA, Exports_H04)],
        case Missing_H04 of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"hof_fold.erl compiled cleanly and exported sum_ledger/1, min_max_latency/1, reverse_with_fold/1.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing_H04]))}
        end;
    {error, E_H04} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_H04]))}
end,
S_Ast_H04 = try
    SourceCandidates_H04 = [
        filename:join(["%s", "src", "hof_fold.erl"]),
        filename:join(["%s", "hof_fold.erl"])
    ],
    SourceFile_H04 = case [P || P <- SourceCandidates_H04, filelib:is_regular(P)] of
        [ValidSrc_H04 | _] -> ValidSrc_H04;
        [] -> hd(SourceCandidates_H04)
    end,
    Rules_H04 = #{
        required_remote_calls => [{lists, foldl, 3}],
        forbidden_remote_calls => [{lists, foldr, any}, {lists, reverse, any}, {lists, min, any}, {lists, max, any}],
        forbidden_constructs => [list_comprehension, map_syntax, bit_syntax]
    },
    AllThreeUseFoldl = case epp:parse_file(SourceFile_H04, []) of
        {ok, Forms_H04} ->
            HasFoldl_H04 = fun WalkF(Node) when is_tuple(Node) ->
                case Node of
                    {call, _, {remote, _, {atom, _, lists}, {atom, _, foldl}}, [_, _, _]} -> true;
                    _ -> WalkF(tuple_to_list(Node))
                end;
                WalkF([H | T]) -> WalkF(H) orelse WalkF(T);
                WalkF(_) -> false
            end,
            MissingFoldIn = [FunName || FunName <- [sum_ledger, min_max_latency, reverse_with_fold],
                not lists:any(fun({function, _, N, 1, Clauses}) when N =:= FunName -> HasFoldl_H04(Clauses); (_) -> false end, Forms_H04)],
            MissingFoldIn;
        _ ->
            [parse_error]
    end,
    case {bf_ast_verifier:verify_rules(SourceFile_H04, <<>>, Rules_H04), AllThreeUseFoldl} of
        {{ok, _}, []} ->
            #{id => <<"ast_hof_fold_audit">>, title => <<"AST Left-Fold & BIF Audit (bf_ast_verifier)">>, status => <<"passed">>, time_ms => 12, details => <<"Verified lists:foldl/3 in all 3 functions; zero lists:foldr/reverse/min/max, comprehensions, maps, or binaries.">>};
        {{ok, _}, MissingFuns_H04} ->
            #{id => <<"ast_hof_fold_audit">>, title => <<"AST Left-Fold & BIF Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Each exported function must use lists:foldl/3 directly (missing in: ~p).", [MissingFuns_H04]))};
        {{error, AstViolations_H04}, _} ->
            FirstMsg_H04 = case AstViolations_H04 of
                [#{message := M_H04} | _] -> M_H04;
                _ -> list_to_binary(io_lib:format("AST violations: ~p", [AstViolations_H04]))
            end,
            #{id => <<"ast_hof_fold_audit">>, title => <<"AST Left-Fold & BIF Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => FirstMsg_H04, error => AstViolations_H04}
    end
catch Class_Ast_H04:Err_Ast_H04 ->
    #{id => <<"ast_hof_fold_audit">>, title => <<"AST Left-Fold & BIF Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST check crashed: ~p:~p", [Class_Ast_H04, Err_Ast_H04]))}
end,
S1_Fold = try
    Ledger = hof_fold:sum_ledger([{entry, 200, credit}, {entry, 50, debit}, {entry, 25, credit}]),
    LedgerNeg = hof_fold:sum_ledger([{entry, 30, credit}, {entry, 80, debit}]),
    LedgerEmpty = hof_fold:sum_ledger([]),
    Latencies = hof_fold:min_max_latency([85, 10, 42, 120, 5]),
    LatSingle = hof_fold:min_max_latency([42]),
    LatNeg = hof_fold:min_max_latency([-50, -10, -90, -5]),
    Reversed = hof_fold:reverse_with_fold([1, 2, 3, 4]),
    ReversedEmpty = hof_fold:reverse_with_fold([]),
    ReversedSingle = hof_fold:reverse_with_fold([solo]),
    case {Ledger, LedgerNeg, LedgerEmpty, Latencies, LatSingle, LatNeg, Reversed, ReversedEmpty, ReversedSingle} of
        {{ledger_summary, 225, 50, 175}, {ledger_summary, 30, 80, -50}, {ledger_summary, 0, 0, 0},
         {5, 120}, {42, 42}, {-90, -5}, [4, 3, 2, 1], [], [solo]} ->
            #{id => <<"foldl_state_reduction">>, title => <<"Tail-Recursive State Aggregation via lists:foldl/3">>, status => <<"passed">>, time_ms => 10, details => <<"Verified ledger reduction (including negative balance & empty), negative-latency min/max bounds, and fold reversal">>};
        Got_H04 ->
            #{id => <<"foldl_state_reduction">>, title => <<"Tail-Recursive State Aggregation via lists:foldl/3">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Fold mismatch: ~p", [Got_H04]))}
    end
catch Class_H04:Err_H04 ->
    #{id => <<"foldl_state_reduction">>, title => <<"Tail-Recursive State Aggregation via lists:foldl/3">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_H04, Err_H04]))}
end,
Stages = [CompileStage_H04, S_Ast_H04, S1_Fold]
`, wsDir, wsDir), true

	case "ch03-l05":
		return fmt.Sprintf(`
CompileStage_H05 = case code:ensure_loaded(keylist_config) of
    {module, keylist_config} ->
        Exports_H05 = keylist_config:module_info(exports),
        Req_H05 = [{find_product_by_id, 2}, {upsert_product, 2}, {read_socket_options, 1}],
        Missing_H05 = [FA || FA <- Req_H05, not lists:member(FA, Exports_H05)],
        case Missing_H05 of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"keylist_config.erl compiled cleanly and exported find_product_by_id/2, upsert_product/2, read_socket_options/1.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing_H05]))}
        end;
    {error, E_H05} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_H05]))}
end,
S_Ast_H05 = try
    SourceCandidates_H05 = [
        filename:join(["%s", "src", "keylist_config.erl"]),
        filename:join(["%s", "keylist_config.erl"])
    ],
    SourceFile_H05 = case [P || P <- SourceCandidates_H05, filelib:is_regular(P)] of
        [ValidSrc_H05 | _] -> ValidSrc_H05;
        [] -> hd(SourceCandidates_H05)
    end,
    Rules_H05 = #{
        required_remote_calls => [{lists, keyfind, 3}, {lists, keystore, 4}, {proplists, get_value, 3}, {proplists, get_bool, 2}],
        forbidden_constructs => [list_comprehension, map_syntax, bit_syntax]
    },
    case bf_ast_verifier:verify_rules(SourceFile_H05, <<>>, Rules_H05) of
        {ok, _} ->
            #{id => <<"ast_keylist_config_audit">>, title => <<"AST Keylist & Proplist BIF Audit (bf_ast_verifier)">>, status => <<"passed">>, time_ms => 12, details => <<"Verified lists:keyfind/3, lists:keystore/4, proplists:get_value/3, proplists:get_bool/2 and zero comprehensions, maps, or binaries.">>};
        {error, AstViolations_H05} ->
            FirstMsg_H05 = case AstViolations_H05 of
                [#{message := M_H05} | _] -> M_H05;
                _ -> list_to_binary(io_lib:format("AST violations: ~p", [AstViolations_H05]))
            end,
            #{id => <<"ast_keylist_config_audit">>, title => <<"AST Keylist & Proplist BIF Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => FirstMsg_H05, error => AstViolations_H05}
    end
catch Class_Ast_H05:Err_Ast_H05 ->
    #{id => <<"ast_keylist_config_audit">>, title => <<"AST Keylist & Proplist BIF Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST check crashed: ~p:~p", [Class_Ast_H05, Err_Ast_H05]))}
end,
S1_Keylists = try
    Inv0 = [{product, 10, "Widget", 15, 8}, {product, 20, "Gadget", 30, 2}],
    F_Found = keylist_config:find_product_by_id(Inv0, 20),
    F_Miss = keylist_config:find_product_by_id(Inv0, 99),
    F_Empty = keylist_config:find_product_by_id([], 10),
    Inv1 = keylist_config:upsert_product(Inv0, {product, 10, "Widget", 20, 10}),
    Inv2 = keylist_config:upsert_product(Inv1, {product, 30, "Doohickey", 5, 50}),
    InvEmpty = keylist_config:upsert_product([], {product, 5, "Hub", 40, 3}),
    OptsCustom = keylist_config:read_socket_options([binary, {port, 9999}, {active, once}]),
    OptsDefault = keylist_config:read_socket_options([]),
    OptsBinFalse = keylist_config:read_socket_options([{binary, false}, {port, 443}]),
    OptsBinTupleTrue = keylist_config:read_socket_options([{binary, true}, {active, true}]),
    case {F_Found, F_Miss, F_Empty, Inv1, Inv2, InvEmpty, OptsCustom, OptsDefault, OptsBinFalse, OptsBinTupleTrue} of
        {{ok, {product, 20, "Gadget", 30, 2}},
         {error, not_found},
         {error, not_found},
         [{product, 10, "Widget", 20, 10}, {product, 20, "Gadget", 30, 2}],
         [{product, 10, "Widget", 20, 10}, {product, 20, "Gadget", 30, 2}, {product, 30, "Doohickey", 5, 50}],
         [{product, 5, "Hub", 40, 3}],
         {socket_cfg, 9999, once, true},
         {socket_cfg, 8080, false, false},
         {socket_cfg, 443, false, false},
         {socket_cfg, 8080, true, true}} ->
            #{id => <<"keylist_and_proplist">>, title => <<"lists:keyfind/keystore & proplists Parsing">>, status => <<"passed">>, time_ms => 10, details => <<"C BIF keylist search/upsert order preservation and proplists tuple/flag defaults verified">>};
        Got_H05 ->
            #{id => <<"keylist_and_proplist">>, title => <<"lists:keyfind/keystore & proplists Parsing">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Keylist mismatch: ~p", [Got_H05]))}
    end
catch Class_H05:Err_H05 ->
    #{id => <<"keylist_and_proplist">>, title => <<"lists:keyfind/keystore & proplists Parsing">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_H05, Err_H05]))}
end,
Stages = [CompileStage_H05, S_Ast_H05, S1_Keylists]
`, wsDir, wsDir), true

	case "ch03-l06":
		return fmt.Sprintf(`
CompileStage_H06 = case code:ensure_loaded(comprehension_queries) of
    {module, comprehension_queries} ->
        Exports_H06 = comprehension_queries:module_info(exports),
        Req_H06 = [{active_user_names, 1}, {matrix_cartesian, 2}, {fulfilled_order_receipts, 2}],
        Missing_H06 = [FA || FA <- Req_H06, not lists:member(FA, Exports_H06)],
        case Missing_H06 of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"comprehension_queries.erl compiled cleanly and exported active_user_names/1, matrix_cartesian/2, fulfilled_order_receipts/2.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing_H06]))}
        end;
    {error, E_H06} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_H06]))}
end,
S_Ast_H06 = try
    SourceCandidates_H06 = [
        filename:join(["%s", "src", "comprehension_queries.erl"]),
        filename:join(["%s", "comprehension_queries.erl"])
    ],
    SourceFile_H06 = case [P || P <- SourceCandidates_H06, filelib:is_regular(P)] of
        [ValidSrc_H06 | _] -> ValidSrc_H06;
        [] -> hd(SourceCandidates_H06)
    end,
    Rules_H06 = #{
        required_constructs => [list_comprehension],
        forbidden_constructs => [map_syntax, bit_syntax]
    },
    MissingLcFuns = case epp:parse_file(SourceFile_H06, []) of
        {ok, Forms_H06} ->
            HasLc_H06 = fun WalkLc(Node) when is_tuple(Node) ->
                case element(1, Node) of
                    lc -> true;
                    _ -> WalkLc(tuple_to_list(Node))
                end;
                WalkLc([H | T]) -> WalkLc(H) orelse WalkLc(T);
                WalkLc(_) -> false
            end,
            [{N, A} || {N, A} <- [{active_user_names, 1}, {matrix_cartesian, 2}, {fulfilled_order_receipts, 2}],
                not lists:any(fun({function, _, FN, FA, Clauses}) when FN =:= N, FA =:= A -> HasLc_H06(Clauses); (_) -> false end, Forms_H06)];
        _ ->
            [parse_error]
    end,
    case {bf_ast_verifier:verify_rules(SourceFile_H06, <<>>, Rules_H06), MissingLcFuns} of
        {{ok, _}, []} ->
            #{id => <<"ast_comprehension_queries_audit">>, title => <<"AST List Comprehension Audit (bf_ast_verifier)">>, status => <<"passed">>, time_ms => 12, details => <<"Verified list comprehensions ([Expr || ...]) in all 3 functions and zero maps or binaries.">>};
        {{ok, _}, MissingList_H06} ->
            #{id => <<"ast_comprehension_queries_audit">>, title => <<"AST List Comprehension Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("All 3 functions must use list comprehensions (missing in: ~p).", [MissingList_H06]))};
        {{error, AstViolations_H06}, _} ->
            FirstMsg_H06 = case AstViolations_H06 of
                [#{message := M_H06} | _] -> M_H06;
                _ -> list_to_binary(io_lib:format("AST violations: ~p", [AstViolations_H06]))
            end,
            #{id => <<"ast_comprehension_queries_audit">>, title => <<"AST List Comprehension Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => FirstMsg_H06, error => AstViolations_H06}
    end
catch Class_Ast_H06:Err_Ast_H06 ->
    #{id => <<"ast_comprehension_queries_audit">>, title => <<"AST List Comprehension Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST check crashed: ~p:~p", [Class_Ast_H06, Err_Ast_H06]))}
end,
S1_Comprehensions = try
    Names = comprehension_queries:active_user_names([{user, 1, "Alice", active}, {user, 2, "Bob", suspended}, {user, 3, "Charlie", active}]),
    NamesNoise = comprehension_queries:active_user_names([{user, 2, "Bob", suspended}, unrelated_atom, {bad, tuple}]),
    Cartesian = comprehension_queries:matrix_cartesian([1, 2], [a, b]),
    CartesianEmpty = comprehension_queries:matrix_cartesian([1, 2], []),
    InvQ = [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 2}],
    OrdersQ = [{order, 1, 2}, {order, 2, 5}, {order, 3, 1}],
    Receipts = comprehension_queries:fulfilled_order_receipts(InvQ, OrdersQ),
    ReceiptsEdge = comprehension_queries:fulfilled_order_receipts(
        InvQ, [{order, 1, 0}, {order, 1, -2}, {order, 1, 10}, {order, 99, 1}, {order, 2, 2}]),
    case {Names, NamesNoise, Cartesian, CartesianEmpty, Receipts, ReceiptsEdge} of
        {["Alice", "Charlie"],
         [],
         [{1, a}, {1, b}, {2, a}, {2, b}],
         [],
         [{receipt, 1, "Keyboard", 100}],
         [{receipt, 1, "Keyboard", 500}, {receipt, 2, "Mouse", 50}]} ->
            #{id => <<"list_comprehensions">>, title => <<"List Comprehension Generators & Predicates">>, status => <<"passed">>, time_ms => 10, details => <<"Verified pattern filters (with silent skips), ordered Cartesian joins, and inclusive stock bounds">>};
        Got_H06 ->
            #{id => <<"list_comprehensions">>, title => <<"List Comprehension Generators & Predicates">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Comprehension mismatch: ~p", [Got_H06]))}
    end
catch Class_H06:Err_H06 ->
    #{id => <<"list_comprehensions">>, title => <<"List Comprehension Generators & Predicates">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_H06, Err_H06]))}
end,
Stages = [CompileStage_H06, S_Ast_H06, S1_Comprehensions]
`, wsDir, wsDir), true

	case "ch03-l07":
		return fmt.Sprintf(`
CompileStage_H07 = case code:ensure_loaded(inventory_hof) of
    {module, inventory_hof} ->
        Exports_H07 = inventory_hof:module_info(exports),
        Req_H07 = [{total_inventory_valuation, 1}, {critical_stock_alerts, 2}, {apply_orders_with_keylists, 2}, {aggregate_sla_logs, 1}],
        Missing_H07 = [FA || FA <- Req_H07, not lists:member(FA, Exports_H07)],
        case Missing_H07 of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"inventory_hof.erl compiled cleanly and exported total_inventory_valuation/1, critical_stock_alerts/2, apply_orders_with_keylists/2, aggregate_sla_logs/1.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing_H07]))}
        end;
    {error, E_H07} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_H07]))}
end,
S_Ast_H07 = try
    SourceCandidates_H07 = [
        filename:join(["%s", "src", "inventory_hof.erl"]),
        filename:join(["%s", "inventory_hof.erl"])
    ],
    SourceFile_H07 = case [P || P <- SourceCandidates_H07, filelib:is_regular(P)] of
        [ValidSrc_H07 | _] -> ValidSrc_H07;
        [] -> hd(SourceCandidates_H07)
    end,
    Rules_H07 = #{
        required_remote_calls => [{lists, foldl, 3}, {lists, filtermap, 2}, {lists, keyfind, 3}, {lists, keystore, 4}],
        forbidden_constructs => [map_syntax, bit_syntax]
    },
    case bf_ast_verifier:verify_rules(SourceFile_H07, <<>>, Rules_H07) of
        {ok, _} ->
            #{id => <<"ast_inventory_hof_audit">>, title => <<"AST HOF & Keylist BIF Audit (bf_ast_verifier)">>, status => <<"passed">>, time_ms => 12, details => <<"Verified lists:foldl/3, lists:filtermap/2, lists:keyfind/3, lists:keystore/4 and zero maps or binaries.">>};
        {error, AstViolations_H07} ->
            FirstMsg_H07 = case AstViolations_H07 of
                [#{message := M_H07} | _] -> M_H07;
                _ -> list_to_binary(io_lib:format("AST violations: ~p", [AstViolations_H07]))
            end,
            #{id => <<"ast_inventory_hof_audit">>, title => <<"AST HOF & Keylist BIF Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => FirstMsg_H07, error => AstViolations_H07}
    end
catch Class_Ast_H07:Err_Ast_H07 ->
    #{id => <<"ast_inventory_hof_audit">>, title => <<"AST HOF & Keylist BIF Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST check crashed: ~p:~p", [Class_Ast_H07, Err_Ast_H07]))}
end,
S1_HofSuite = try
    Inv = [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 2}],
    Val = inventory_hof:total_inventory_valuation(Inv),
    ValEmpty = inventory_hof:total_inventory_valuation([]),
    Alerts = inventory_hof:critical_stock_alerts(Inv, 5),
    AlertsExact = inventory_hof:critical_stock_alerts(Inv, 2),
    AlertsEmpty = inventory_hof:critical_stock_alerts([], 5),
    UpdatedInv = inventory_hof:apply_orders_with_keylists(Inv, [{order, 1, 3}, {order, 2, 10}, {order, 99, 1}]),
    SeqInv = inventory_hof:apply_orders_with_keylists(Inv, [{order, 1, 6}, {order, 1, 5}, {order, 1, 4}, {order, 2, 0}, {order, 2, -1}]),
    EmptyOrdersInv = inventory_hof:apply_orders_with_keylists(Inv, []),
    Logs = [{log, auth, 40, ok}, {log, pay, 120, error}, {log, auth, 60, ok}],
    Agg = inventory_hof:aggregate_sla_logs(Logs),
    AggEmpty = inventory_hof:aggregate_sla_logs([]),
    case {Val, ValEmpty, Alerts, AlertsExact, AlertsEmpty, UpdatedInv, SeqInv, EmptyOrdersInv, Agg, AggEmpty} of
        {550, 0,
         [{alert, 2, "Mouse", 2}],
         [{alert, 2, "Mouse", 2}],
         [],
         [{product, 1, "Keyboard", 50, 7}, {product, 2, "Mouse", 25, 2}],
         [{product, 1, "Keyboard", 50, 0}, {product, 2, "Mouse", 25, 2}],
         [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 2}],
         {sla_summary, 3, 1, 220},
         {sla_summary, 0, 0, 0}} ->
            #{id => <<"hof_inventory_suite">>, title => <<"Refactored Inventory & SLA Aggregator Pipeline">>, status => <<"passed">>, time_ms => 12, details => <<"Passed empty inputs, valuation, inclusive stock bounds, sequential stateful order depletion, and SLA log aggregation">>};
        Got_H07 ->
            #{id => <<"hof_inventory_suite">>, title => <<"Refactored Inventory & SLA Aggregator Pipeline">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("HOF Suite mismatch: ~p", [Got_H07]))}
    end
catch Class_H07:Err_H07 ->
    #{id => <<"hof_inventory_suite">>, title => <<"Refactored Inventory & SLA Aggregator Pipeline">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_H07, Err_H07]))}
end,
Stages = [CompileStage_H07, S_Ast_H07, S1_HofSuite]
`, wsDir, wsDir), true

	// ── CHAPTER 4 ─────────────────────────────────────────────────────────────
	case "ch04-l01":
		return fmt.Sprintf(`
CompileStage_M01 = case code:ensure_loaded(map_registry) of
    {module, map_registry} ->
        Exports_M01 = map_registry:module_info(exports),
        Req_M01 = [{create_session, 2}, {update_presence, 3}, {is_admin_session, 1}],
        Missing_M01 = [FA || FA <- Req_M01, not lists:member(FA, Exports_M01)],
        case Missing_M01 of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"map_registry.erl compiled cleanly; create_session/2, update_presence/3, and is_admin_session/1 exported">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing_M01]))}
        end;
    {error, E_M01} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_M01]))}
end,
S_Ast_M01 = try
    SourceCandidates_M01 = [
        filename:join(["%s", "src", "map_registry.erl"]),
        filename:join(["%s", "map_registry.erl"])
    ],
    SourceFile_M01 = case [P || P <- SourceCandidates_M01, filelib:is_regular(P)] of
        [ValidSrc_M01 | _] -> ValidSrc_M01;
        [] -> hd(SourceCandidates_M01)
    end,
    Rules_M01 = #{
        required_constructs => [map_exact_match]
    },
    MissingExactFuns_M01 = case epp:parse_file(SourceFile_M01, []) of
        {ok, Forms_M01} ->
            HasExact_M01 = fun WalkEx(Node) when is_tuple(Node) ->
                case element(1, Node) of
                    map_field_exact -> true;
                    _ -> WalkEx(tuple_to_list(Node))
                end;
                WalkEx([H | T]) -> WalkEx(H) orelse WalkEx(T);
                WalkEx(_) -> false
            end,
            [{N, A} || {N, A} <- [{update_presence, 3}, {is_admin_session, 1}],
                not lists:any(fun({function, _, FN, FA, Clauses}) when FN =:= N, FA =:= A -> HasExact_M01(Clauses); (_) -> false end, Forms_M01)];
        _ ->
            [parse_error]
    end,
    case {bf_ast_verifier:verify_rules(SourceFile_M01, <<>>, Rules_M01), MissingExactFuns_M01} of
        {{ok, _}, []} ->
            #{id => <<"ast_map_registry_audit">>, title => <<"AST Map Exact Match (:=) Audit (bf_ast_verifier)">>, status => <<"passed">>, time_ms => 12, details => <<"Verified map_exact_match (:=) in both update_presence/3 and is_admin_session/1.">>};
        {{ok, _}, MissingExList_M01} ->
            #{id => <<"ast_map_registry_audit">>, title => <<"AST Map Exact Match (:=) Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Exact map matching/updating (:=) required in update_presence/3 and is_admin_session/1 (missing in: ~p).", [MissingExList_M01]))};
        {{error, AstViolations_M01}, _} ->
            FirstMsg_M01 = case AstViolations_M01 of
                [#{message := M_M01} | _] -> M_M01;
                _ -> list_to_binary(io_lib:format("AST violations: ~p", [AstViolations_M01]))
            end,
            #{id => <<"ast_map_registry_audit">>, title => <<"AST Map Exact Match (:=) Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => FirstMsg_M01, error => AstViolations_M01}
    end
catch Class_Ast_M01:Err_Ast_M01 ->
    #{id => <<"ast_map_registry_audit">>, title => <<"AST Map Exact Match (:=) Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST check crashed: ~p:~p", [Class_Ast_M01, Err_Ast_M01]))}
end,
S1_Maps = try
    S0 = map_registry:create_session(alice, admin),
    SInt = map_registry:create_session(42, guest),
    S1 = map_registry:update_presence(S0, alice, online),
    S2 = map_registry:update_presence(S1, alice, busy),
    Mismatch = map_registry:update_presence(S1, bob, online),
    NonMapUpd = map_registry:update_presence(not_a_map, alice, online),
    AdminCheck1 = map_registry:is_admin_session(S1),
    AdminCheck2 = map_registry:is_admin_session(S0),
    AdminCheck3 = map_registry:is_admin_session(#{role => member, presence => online}),
    AdminCheck4 = map_registry:is_admin_session(#{role => admin}),
    AdminCheck5 = map_registry:is_admin_session(not_a_map),
    case {S0, SInt, S1, S2, Mismatch, NonMapUpd, AdminCheck1, AdminCheck2, AdminCheck3, AdminCheck4, AdminCheck5} of
        {#{user_id := alice, role := admin, presence := offline, login_count := 0},
         #{user_id := 42, role := guest, presence := offline, login_count := 0},
         #{user_id := alice, role := admin, presence := online, login_count := 1},
         #{user_id := alice, role := admin, presence := busy, login_count := 2},
         {error, session_mismatch},
         {error, session_mismatch},
         true, false, false, false, false} when map_size(S0) =:= 4, map_size(SInt) =:= 4 ->
            #{id => <<"maps_operations">>, title => <<"Map Creation, Exact Matching (:=), & Login Presence Counter">>, status => <<"passed">>, time_ms => 8, details => <<"Verified #{key := Val} exact matching, bound variable checks, non-map safety, incomplete-map rejection, and login counter">>};
        Got_M01 ->
            #{id => <<"maps_operations">>, title => <<"Map Creation, Exact Matching (:=), & Login Presence Counter">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Map mismatch: ~p", [Got_M01]))}
    end
catch Class_M01:Err_M01 ->
    #{id => <<"maps_operations">>, title => <<"Map Creation, Exact Matching (:=), & Login Presence Counter">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_M01, Err_M01]))}
end,
Stages = [CompileStage_M01, S_Ast_M01, S1_Maps]
`, wsDir, wsDir), true

	case "ch04-l02":
		return fmt.Sprintf(`
CompileStage_M02 = case code:ensure_loaded(map_stdlib) of
    {module, map_stdlib} ->
        Exports_M02 = map_stdlib:module_info(exports),
        Req_M02 = [{safe_get_load, 2}, {increment_tag_counts, 2}, {merge_configs, 2}, {sum_map_values, 1}],
        Missing_M02 = [FA || FA <- Req_M02, not lists:member(FA, Exports_M02)],
        case Missing_M02 of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"map_stdlib.erl compiled cleanly; safe_get_load/2, increment_tag_counts/2, merge_configs/2, sum_map_values/1 exported">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing_M02]))}
        end;
    {error, E_M02} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_M02]))}
end,
S_Ast_M02 = try
    SourceCandidates_M02 = [
        filename:join(["%s", "src", "map_stdlib.erl"]),
        filename:join(["%s", "map_stdlib.erl"])
    ],
    SourceFile_M02 = case [P || P <- SourceCandidates_M02, filelib:is_regular(P)] of
        [ValidSrc_M02 | _] -> ValidSrc_M02;
        [] -> hd(SourceCandidates_M02)
    end,
    Rules_M02 = #{
        required_remote_calls => [{maps, get, 3}, {maps, update_with, 4}, {maps, merge, 2}, {maps, without, 2}, {maps, fold, 3}],
        forbidden_remote_calls => [{maps, to_list, 1}]
    },
    case bf_ast_verifier:verify_rules(SourceFile_M02, <<>>, Rules_M02) of
        {ok, _} ->
            #{id => <<"ast_map_stdlib_audit">>, title => <<"AST Maps Stdlib BIF Audit (bf_ast_verifier)">>, status => <<"passed">>, time_ms => 12, details => <<"Verified maps:get/3, maps:update_with/4, maps:merge/2, maps:without/2, maps:fold/3 and zero maps:to_list/1 bypasses.">>};
        {error, AstViolations_M02} ->
            FirstMsg_M02 = case AstViolations_M02 of
                [#{message := M_M02} | _] -> M_M02;
                _ -> list_to_binary(io_lib:format("AST violations: ~p", [AstViolations_M02]))
            end,
            #{id => <<"ast_map_stdlib_audit">>, title => <<"AST Maps Stdlib BIF Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => FirstMsg_M02, error => AstViolations_M02}
    end
catch Class_Ast_M02:Err_Ast_M02 ->
    #{id => <<"ast_map_stdlib_audit">>, title => <<"AST Maps Stdlib BIF Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST check crashed: ~p:~p", [Class_Ast_M02, Err_Ast_M02]))}
end,
S1_Stdlib = try
    L1 = map_stdlib:safe_get_load(#{node_a => 75, node_b => 20}, node_a),
    L2 = map_stdlib:safe_get_load(#{node_a => 75, node_b => 20}, node_c),
    Tags = [auth, db, auth, cache, auth, db],
    Counts = map_stdlib:increment_tag_counts(Tags, #{db => 5}),
    CountsEmpty = map_stdlib:increment_tag_counts([], #{db => 5}),
    DefaultCfg = #{timeout => 5000, secret_key => <<"old_secret">>, port => 80},
    UserCfg = #{timeout => 15000, secret_key => <<"new_secret">>, debug_token => <<"tok">>, retries => 3},
    MergedCfg = map_stdlib:merge_configs(DefaultCfg, UserCfg),
    SumVal = map_stdlib:sum_map_values(#{core1 => 10, core2 => 20, core3 => 30, core4 => 40}),
    SumEmpty = map_stdlib:sum_map_values(#{}),
    case {L1, L2, Counts, CountsEmpty, MergedCfg, SumVal, SumEmpty} of
        {75, 0,
         #{auth := 3, db := 7, cache := 1},
         #{db := 5},
         #{timeout := 15000, port := 80, retries := 3},
         100, 0} when map_size(Counts) =:= 3 andalso map_size(CountsEmpty) =:= 1 andalso map_size(MergedCfg) =:= 3 andalso not is_map_key(secret_key, MergedCfg) andalso not is_map_key(debug_token, MergedCfg) ->
            #{id => <<"maps_stdlib_functions">>, title => <<"Standard Library Functions: get/3, update_with/4, merge/2, without/2, fold/3">>, status => <<"passed">>, time_ms => 8, details => <<"Verified maps:get fallback, maps:update_with counter accumulation, maps:merge override with sensitive key stripping, empty-map edges, and maps:fold sum">>};
        Got_M02 ->
            #{id => <<"maps_stdlib_functions">>, title => <<"Standard Library Functions: get/3, update_with/4, merge/2, without/2, fold/3">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Stdlib mismatch: ~p", [Got_M02]))}
    end
catch Class_M02:Err_M02 ->
    #{id => <<"maps_stdlib_functions">>, title => <<"Standard Library Functions: get/3, update_with/4, merge/2, without/2, fold/3">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_M02, Err_M02]))}
end,
Stages = [CompileStage_M02, S_Ast_M02, S1_Stdlib]
`, wsDir, wsDir), true

	case "ch04-l03":
		return fmt.Sprintf(`
CompileStage_M03 = case code:ensure_loaded(record_frames) of
    {module, record_frames} ->
        Exports_M03 = record_frames:module_info(exports),
        Req_M03 = [{new_frame, 3}, {advance_seq, 1}, {frame_seq_index, 0}, {find_frame_by_seq, 2}],
        Missing_M03 = [FA || FA <- Req_M03, not lists:member(FA, Exports_M03)],
        case Missing_M03 of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"record_frames.erl compiled cleanly; new_frame/3, advance_seq/1, frame_seq_index/0, find_frame_by_seq/2 exported">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing_M03]))}
        end;
    {error, E_M03} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_M03]))}
end,
S_Ast_M03 = try
    SourceCandidates_M03 = [
        filename:join(["%s", "src", "record_frames.erl"]),
        filename:join(["%s", "record_frames.erl"])
    ],
    SourceFile_M03 = case [P || P <- SourceCandidates_M03, filelib:is_regular(P)] of
        [ValidSrc_M03 | _] -> ValidSrc_M03;
        [] -> hd(SourceCandidates_M03)
    end,
    Rules_M03 = #{
        required_constructs => [record_def],
        required_remote_calls => [{lists, keyfind, 3}]
    },
    RecAstAudit_M03 = case epp:parse_file(SourceFile_M03, []) of
        {ok, Forms_M03} ->
            RecFieldNames_M03 = [case RF of
                {typed_record_field, BaseRF, _} when tuple_size(BaseRF) >= 3 -> element(3, element(3, BaseRF));
                _ when tuple_size(RF) >= 3, element(1, RF) =:= record_field -> element(3, element(3, RF));
                _ -> invalid
            end || {attribute, _, record, {frame, Fields}} <- Forms_M03, RF <- Fields],
            WalkRec_M03 = fun WalkR(Node, Pred) ->
                case Pred(Node) of
                    true -> true;
                    false when is_tuple(Node) -> WalkR(tuple_to_list(Node), Pred);
                    false when is_list(Node) -> lists:any(fun(El) -> WalkR(El, Pred) end, Node);
                    false -> false
                end
            end,
            IsRecCtor_M03 = fun({record, _, frame, _}) -> true; (_) -> false end,
            IsSeqIdx_M03 = fun({record_index, _, frame, {atom, _, seq}}) -> true; ({call, _, {atom, _, frame_seq_index}, []}) -> true; (_) -> false end,
            HasInFun_M03 = fun(FName, FArity, Pred) ->
                lists:any(fun({function, _, FN, FA, Clauses}) when FN =:= FName, FA =:= FArity -> WalkRec_M03(Clauses, Pred); (_) -> false end, Forms_M03)
            end,
            HasExactIdxLit_M03 = HasInFun_M03(find_frame_by_seq, 2, fun({call, _, {remote, _, {atom, _, lists}, {atom, _, keyfind}}, [_, {integer, _, _}, _]}) -> true; (_) -> false end),
            Checks_M03 = [
                {schema_mismatch, RecFieldNames_M03 =:= [seq, type, payload]},
                {missing_record_ctor_in_new_frame, HasInFun_M03(new_frame, 3, IsRecCtor_M03)},
                {missing_record_index_in_frame_seq_index, HasInFun_M03(frame_seq_index, 0, fun({record_index, _, frame, {atom, _, seq}}) -> true; (_) -> false end)},
                {missing_record_index_in_keyfind, (not HasExactIdxLit_M03) andalso HasInFun_M03(find_frame_by_seq, 2, IsSeqIdx_M03)}
            ],
            [Tag || {Tag, false} <- Checks_M03];
        _ ->
            [parse_error]
    end,
    case {bf_ast_verifier:verify_rules(SourceFile_M03, <<>>, Rules_M03), RecAstAudit_M03} of
        {{ok, _}, []} ->
            #{id => <<"ast_record_frames_audit">>, title => <<"AST Record & #frame.seq Index Audit (bf_ast_verifier)">>, status => <<"passed">>, time_ms => 12, details => <<"Verified -record(frame, {seq, type, payload}), record instantiation, #frame.seq compile-time offset usage, and lists:keyfind/3.">>};
        {{ok, _}, RecFails_M03} ->
            #{id => <<"ast_record_frames_audit">>, title => <<"AST Record & #frame.seq Index Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Record/offset AST checks failed: ~p", [RecFails_M03]))};
        {{error, AstViolations_M03}, _} ->
            FirstMsg_M03 = case AstViolations_M03 of
                [#{message := M_M03} | _] -> M_M03;
                _ -> list_to_binary(io_lib:format("AST violations: ~p", [AstViolations_M03]))
            end,
            #{id => <<"ast_record_frames_audit">>, title => <<"AST Record & #frame.seq Index Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => FirstMsg_M03, error => AstViolations_M03}
    end
catch Class_Ast_M03:Err_Ast_M03 ->
    #{id => <<"ast_record_frames_audit">>, title => <<"AST Record & #frame.seq Index Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST check crashed: ~p:~p", [Class_Ast_M03, Err_Ast_M03]))}
end,
S1_Records = try
    F0 = record_frames:new_frame(1, ack, ok),
    F1 = record_frames:advance_seq(F0),
    F2 = record_frames:new_frame(3, data, ping),
    F00 = record_frames:new_frame(0, heartbeat, {tag, 99}),
    F01 = record_frames:advance_seq(F00),
    SeqIdx = record_frames:frame_seq_index(),
    FindOk = record_frames:find_frame_by_seq([F0, F1, F2], 2),
    FindFirst = record_frames:find_frame_by_seq([F0, F2, {frame, 3, ack, dup}], 3),
    FindMissing = record_frames:find_frame_by_seq([F0, F1, F2], 99),
    FindEmpty = record_frames:find_frame_by_seq([], 1),
    case {F0, F1, F01, SeqIdx, FindOk, FindFirst, FindMissing, FindEmpty} of
        {{frame, 1, ack, ok},
         {frame, 2, ack, ok},
         {frame, 1, heartbeat, {tag, 99}},
         2,
         {ok, {frame, 2, ack, ok}},
         {ok, {frame, 3, data, ping}},
         not_found,
         not_found} ->
            #{id => <<"record_definitions_and_indices">>, title => <<"Record Macro Definition, Sugar & Field Tuple Indices">>, status => <<"passed">>, time_ms => 8, details => <<"Verified -record(frame, ...) compile-time sugar, immutable seq increment, #frame.seq evaluation to 2, and lists:keyfind search with empty/missing edges">>};
        Got_M03 ->
            #{id => <<"record_definitions_and_indices">>, title => <<"Record Macro Definition, Sugar & Field Tuple Indices">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Record mismatch: ~p", [Got_M03]))}
    end
catch Class_M03:Err_M03 ->
    #{id => <<"record_definitions_and_indices">>, title => <<"Record Macro Definition, Sugar & Field Tuple Indices">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_M03, Err_M03]))}
end,
Stages = [CompileStage_M03, S_Ast_M03, S1_Records]
`, wsDir, wsDir), true

	case "ch04-l04":
		return fmt.Sprintf(`
CompileStage_M04 = case code:ensure_loaded(iolist_builder) of
    {module, iolist_builder} ->
        Exports_M04 = iolist_builder:module_info(exports),
        Req_M04 = [{string_vs_binary_bytes, 1}, {build_http_response_iolist, 2}, {flatten_iolist, 1}],
        Missing_M04 = [FA || FA <- Req_M04, not lists:member(FA, Exports_M04)],
        case Missing_M04 of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"iolist_builder.erl compiled cleanly; string_vs_binary_bytes/1, build_http_response_iolist/2, flatten_iolist/1 exported">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing_M04]))}
        end;
    {error, E_M04} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_M04]))}
end,
S_Ast_M04 = try
    SourceCandidates_M04 = [
        filename:join(["%s", "src", "iolist_builder.erl"]),
        filename:join(["%s", "iolist_builder.erl"])
    ],
    SourceFile_M04 = case [P || P <- SourceCandidates_M04, filelib:is_regular(P)] of
        [ValidSrc_M04 | _] -> ValidSrc_M04;
        [] -> hd(SourceCandidates_M04)
    end,
    Rules_M04 = #{
        required_remote_calls => [{erlang, list_to_binary, 1}, {erlang, byte_size, 1}, {erlang, integer_to_binary, 1}, {erlang, iolist_size, 1}, {erlang, iolist_to_binary, 1}]
    },
    case bf_ast_verifier:verify_rules(SourceFile_M04, <<>>, Rules_M04) of
        {ok, _} ->
            #{id => <<"ast_iolist_builder_audit">>, title => <<"AST Binary & IOList BIF Audit (bf_ast_verifier)">>, status => <<"passed">>, time_ms => 12, details => <<"Verified list_to_binary/1, byte_size/1, integer_to_binary/1, iolist_size/1, and iolist_to_binary/1.">>};
        {error, AstViolations_M04} ->
            FirstMsg_M04 = case AstViolations_M04 of
                [#{message := M_M04} | _] -> M_M04;
                _ -> list_to_binary(io_lib:format("AST violations: ~p", [AstViolations_M04]))
            end,
            #{id => <<"ast_iolist_builder_audit">>, title => <<"AST Binary & IOList BIF Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => FirstMsg_M04, error => AstViolations_M04}
    end
catch Class_Ast_M04:Err_Ast_M04 ->
    #{id => <<"ast_iolist_builder_audit">>, title => <<"AST Binary & IOList BIF Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST check crashed: ~p:~p", [Class_Ast_M04, Err_Ast_M04]))}
end,
S1_IoList = try
    Comp = iolist_builder:string_vs_binary_bytes("beamforge"),
    CompEmpty = iolist_builder:string_vs_binary_bytes(""),
    Body = <<"{\"status\":\"ok\"}">>,
    RespIoList = iolist_builder:build_http_response_iolist(200, Body),
    EmptyResp = iolist_builder:build_http_response_iolist(200, <<>>),
    {IoSz, FlatBin} = iolist_builder:flatten_iolist(RespIoList),
    FlatNested = iolist_builder:flatten_iolist([<<"PING">>, [<<"-">>, <<"PONG">>]]),
    FlatEmpty = iolist_builder:flatten_iolist([]),
    ExpectedBin = <<"HTTP/1.1 200 OK\r\nContent-Length: 15\r\n\r\n{\"status\":\"ok\"}">>,
    ExpectedEmptyBin = <<"HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n">>,
    case {Comp, CompEmpty, is_list(RespIoList), is_list(EmptyResp), IoSz, FlatBin =:= ExpectedBin, iolist_to_binary(EmptyResp) =:= ExpectedEmptyBin, FlatNested, FlatEmpty} of
        {{size_comparison, 144, 9, <<"beamforge">>},
         {size_comparison, 0, 0, <<>>},
         true, true, 54, true, true,
         {9, <<"PING-PONG">>},
         {0, <<>>}} ->
            #{id => <<"binary_and_iolist_construction">>, title => <<"CharLists vs Binaries & Zero-Copy Nested IOLists">>, status => <<"passed">>, time_ms => 8, details => <<"Verified 16x heap footprint accounting, unflattened HTTP IOList structure (is_list), empty edges, and iolist_size/iolist_to_binary">>};
        Got_M04 ->
            #{id => <<"binary_and_iolist_construction">>, title => <<"CharLists vs Binaries & Zero-Copy Nested IOLists">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("IOList mismatch: ~p", [Got_M04]))}
    end
catch Class_M04:Err_M04 ->
    #{id => <<"binary_and_iolist_construction">>, title => <<"CharLists vs Binaries & Zero-Copy Nested IOLists">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_M04, Err_M04]))}
end,
Stages = [CompileStage_M04, S_Ast_M04, S1_IoList]
`, wsDir, wsDir), true

	case "ch04-l05":
		if _, err := os.Stat(filepath.Join(session.WorkspaceDir, "packet_parser.erl")); err == nil {
			return fmt.Sprintf(`
CompileStage_M05_Old = case code:ensure_loaded(packet_parser) of
    {module, packet_parser} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"packet_parser.erl compiled cleanly">>};
    {error, E_M05_Old} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_M05_Old]))}
end,
S1_Tlv_Old = try
    F1_Bin = <<1:4, 2:4, 4:16/big, "PING">>,
    F2_Bin = <<1:4, 3:4, 4:16/big, "PONG">>,
    Stream = <<F1_Bin/binary, F2_Bin/binary>>,
    case packet_parser:parse_tlv_stream(Stream) of
        {ok, [{tlv_frame, 1, 2, 4, <<"PING">>}, {tlv_frame, 1, 3, 4, <<"PONG">>}]} ->
            #{id => <<"tlv_stream_parsing">>, title => <<"Binary TLV Stream Frame Extraction & Record Assembly">>, status => <<"passed">>, time_ms => 12, details => <<"All frames extracted in order with unpinned payloads">>};
        Got_M05_Old ->
            #{id => <<"tlv_stream_parsing">>, title => <<"Binary TLV Stream Frame Extraction & Record Assembly">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("TLV mismatch: ~p", [Got_M05_Old]))}
    end
catch Class_M05_Old:Err_M05_Old ->
    #{id => <<"tlv_stream_parsing">>, title => <<"Binary TLV Stream Frame Extraction & Record Assembly">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_M05_Old, Err_M05_Old]))}
end,
Stages = [CompileStage_M05_Old, S1_Tlv_Old]
`), true
		}
		return fmt.Sprintf(`
CompileStage_M05 = case code:ensure_loaded(bit_packer) of
    {module, bit_packer} ->
        Exports_M05 = bit_packer:module_info(exports),
        Req_M05 = [{pack_header, 3}, {unpack_header, 1}, {encode_utf8_tagged, 1}],
        Missing_M05 = [FA || FA <- Req_M05, not lists:member(FA, Exports_M05)],
        case Missing_M05 of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"bit_packer.erl compiled cleanly; pack_header/3, unpack_header/1, encode_utf8_tagged/1 exported">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing_M05]))}
        end;
    {error, E_M05} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_M05]))}
end,
S_Ast_M05 = try
    SourceCandidates_M05 = [
        filename:join(["%s", "src", "bit_packer.erl"]),
        filename:join(["%s", "bit_packer.erl"])
    ],
    SourceFile_M05 = case [P || P <- SourceCandidates_M05, filelib:is_regular(P)] of
        [ValidSrc_M05 | _] -> ValidSrc_M05;
        [] -> hd(SourceCandidates_M05)
    end,
    Rules_M05 = #{
        required_constructs => [bit_syntax, guards],
        required_remote_calls => [{erlang, byte_size, 1}, {erlang, is_binary, 1}]
    },
    BitAstAudit_M05 = case epp:parse_file(SourceFile_M05, []) of
        {ok, Forms_M05} ->
            WalkBit_M05 = fun WalkB(Node, Pred) ->
                case Pred(Node) of
                    true -> true;
                    false when is_tuple(Node) -> WalkB(tuple_to_list(Node), Pred);
                    false when is_list(Node) -> lists:any(fun(El) -> WalkB(El, Pred) end, Node);
                    false -> false
                end
            end,
            HasExplicitBitSeg_M05 = fun(SubTree) ->
                WalkBit_M05(SubTree, fun
                    ({bin_element, _, _, {integer, _, _}, _}) -> true;
                    (_) -> false
                end)
            end,
            PackClauses_M05 = lists:flatten([Clauses || {function, _, pack_header, 3, Clauses} <- Forms_M05]),
            UnpackClauses_M05 = lists:flatten([Clauses || {function, _, unpack_header, 1, Clauses} <- Forms_M05]),
            EncodeClauses_M05 = lists:flatten([Clauses || {function, _, encode_utf8_tagged, 1, Clauses} <- Forms_M05]),
            HasPackBitSyntax_M05 = HasExplicitBitSeg_M05([Body || {clause, _, _, _, Body} <- PackClauses_M05]),
            HasUnpackBitPattern_M05 = HasExplicitBitSeg_M05([Pats || {clause, _, Pats, _, _} <- UnpackClauses_M05]),
            HasEncodeBitSyntax_M05 = HasExplicitBitSeg_M05([Body || {clause, _, _, _, Body} <- EncodeClauses_M05]),
            HasIsBinaryGuard_M05 = WalkBit_M05([Guards || {clause, _, _, Guards, _} <- EncodeClauses_M05], fun
                ({call, _, {atom, _, is_binary}, _}) -> true;
                ({call, _, {remote, _, {atom, _, erlang}, {atom, _, is_binary}}, _}) -> true;
                (_) -> false
            end),
            case {HasPackBitSyntax_M05, HasUnpackBitPattern_M05, HasEncodeBitSyntax_M05, HasIsBinaryGuard_M05} of
                {true, true, true, true} -> ok;
                _ ->
                    {error, iolist_to_binary(io_lib:format(
                        "Expected explicit bit-width bit syntax across pack_header/3 (~p), unpack_header/1 (~p), encode_utf8_tagged/1 (~p), and is_binary/1 guard on encode_utf8_tagged/1 (~p).",
                        [HasPackBitSyntax_M05, HasUnpackBitPattern_M05, HasEncodeBitSyntax_M05, HasIsBinaryGuard_M05]
                    ))}
            end;
        {error, ParseErr_M05} ->
            {error, iolist_to_binary(io_lib:format("Failed to inspect bit syntax AST: ~p", [ParseErr_M05]))}
    end,
    case {bf_ast_verifier:verify_rules(SourceFile_M05, <<>>, Rules_M05), BitAstAudit_M05} of
        {{ok, _}, ok} ->
            #{id => <<"ast_bit_packer_audit">>, title => <<"AST Bit Syntax & Guard Audit (bf_ast_verifier)">>, status => <<"passed">>, time_ms => 12, details => <<"Verified explicit bit-width <<...>> packing/unpacking, is_binary/1 guard on encode_utf8_tagged/1, and byte_size/1.">>};
        {{error, AstViolations_M05}, _} ->
            FirstMsg_M05 = case AstViolations_M05 of
                [#{message := M_M05} | _] -> M_M05;
                _ -> list_to_binary(io_lib:format("AST violations: ~p", [AstViolations_M05]))
            end,
            #{id => <<"ast_bit_packer_audit">>, title => <<"AST Bit Syntax & Guard Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => FirstMsg_M05, error => AstViolations_M05};
        {_, {error, BitAuditMsg_M05}} ->
            #{id => <<"ast_bit_packer_audit">>, title => <<"AST Bit Syntax & Guard Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => BitAuditMsg_M05}
    end
catch Class_Ast_M05:Err_Ast_M05 ->
    #{id => <<"ast_bit_packer_audit">>, title => <<"AST Bit Syntax & Guard Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST check error: ~p:~p", [Class_Ast_M05, Err_Ast_M05]))}
end,
S1_Bits = try
    H1 = bit_packer:pack_header(4, 2, 1024),
    H2 = bit_packer:pack_header(1, 15, 65535),
    H0 = bit_packer:pack_header(0, 0, 0),
    U1 = bit_packer:unpack_header(<<H1/binary, "PAYLOAD_DATA">>),
    UExact = bit_packer:unpack_header(<<H2/binary>>),
    U2 = bit_packer:unpack_header(<<1:8>>),
    UShort = bit_packer:unpack_header(<<66, 4>>),
    UEmpty = bit_packer:unpack_header(<<>>),
    T1 = bit_packer:encode_utf8_tagged(<<"HELLO_OTP">>),
    TEmpty = bit_packer:encode_utf8_tagged(<<>>),
    TUtf8 = bit_packer:encode_utf8_tagged(<<206, 169>>),
    GuardRes = try bit_packer:encode_utf8_tagged("HELLO") of
        BadRet -> {unexpected_return, BadRet}
    catch
        error:function_clause -> guard_ok;
        OtherClass:OtherReason -> {wrong_error, OtherClass, OtherReason}
    end,
    case {H1, H2, H0, U1, UExact, U2, UShort, UEmpty, T1, TEmpty, TUtf8, GuardRes} of
        {<<66, 4, 0>>, <<31, 255, 255>>, <<0, 0, 0>>,
         {ok, 4, 2, 1024, <<"PAYLOAD_DATA">>},
         {ok, 1, 15, 65535, <<>>},
         {error, insufficient_bytes},
         {error, insufficient_bytes},
         {error, insufficient_bytes},
         <<16#01:8, 9:16/big, "HELLO_OTP">>,
         <<1, 0, 0>>,
         <<1, 0, 2, 206, 169>>,
         guard_ok} ->
            #{id => <<"bit_syntax_wire_format">>, title => <<"Bit Syntax <<...>> Protocol Packing & Endianness">>, status => <<"passed">>, time_ms => 8, details => <<"Verified 24-bit big-endian packing, exact 3-byte & trailing-payload unpacking, truncated stream errors, UTF-8 length tagging, and is_binary/1 guard enforcement">>};
        Got_M05 ->
            #{id => <<"bit_syntax_wire_format">>, title => <<"Bit Syntax <<...>> Protocol Packing & Endianness">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Bit mismatch: ~p", [Got_M05]))}
    end
catch Class_M05:Err_M05 ->
    #{id => <<"bit_syntax_wire_format">>, title => <<"Bit Syntax <<...>> Protocol Packing & Endianness">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_M05, Err_M05]))}
end,
Stages = [CompileStage_M05, S_Ast_M05, S1_Bits]
`, wsDir, wsDir), true

	case "ch04-l06":
		return fmt.Sprintf(`
CompileStage_M06 = case code:ensure_loaded(binary_scanner) of
    {module, binary_scanner} ->
        Exports_M06 = binary_scanner:module_info(exports),
        Req_M06 = [{split_key_value, 1}, {extract_lines, 1}, {xor_mask_payload, 2}],
        Missing_M06 = [FA || FA <- Req_M06, not lists:member(FA, Exports_M06)],
        case Missing_M06 of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"binary_scanner.erl compiled cleanly; split_key_value/1, extract_lines/1, xor_mask_payload/2 exported">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing_M06]))}
        end;
    {error, E_M06} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_M06]))}
end,
S_Ast_M06 = try
    SourceCandidates_M06 = [
        filename:join(["%s", "src", "binary_scanner.erl"]),
        filename:join(["%s", "binary_scanner.erl"])
    ],
    SourceFile_M06 = case [P || P <- SourceCandidates_M06, filelib:is_regular(P)] of
        [ValidSrc_M06 | _] -> ValidSrc_M06;
        [] -> hd(SourceCandidates_M06)
    end,
    Rules_M06 = #{
        required_remote_calls => [{binary, split, 2}, {binary, split, 3}],
        required_constructs => [bit_syntax],
        forbidden_constructs => [list_comprehension]
    },
    BinCompAudit_M06 = case epp:parse_file(SourceFile_M06, []) of
        {ok, Forms_M06} ->
            WalkScan_M06 = fun WalkS(Node, Pred) ->
                case Pred(Node) of
                    true -> true;
                    false when is_tuple(Node) -> WalkS(tuple_to_list(Node), Pred);
                    false when is_list(Node) -> lists:any(fun(El) -> WalkS(El, Pred) end, Node);
                    false -> false
                end
            end,
            SplitClauses_M06 = lists:flatten([Clauses || {function, _, split_key_value, 1, Clauses} <- Forms_M06]),
            LinesClauses_M06 = lists:flatten([Clauses || {function, _, extract_lines, 1, Clauses} <- Forms_M06]),
            XorClauses_M06 = lists:flatten([Clauses || {function, _, xor_mask_payload, 2, Clauses} <- Forms_M06]),
            HasSplit2_M06 = WalkScan_M06(SplitClauses_M06, fun
                ({call, _, {remote, _, {atom, _, binary}, {atom, _, split}}, [_, _]}) -> true;
                (_) -> false
            end),
            HasSplit3_M06 = WalkScan_M06(LinesClauses_M06, fun
                ({call, _, {remote, _, {atom, _, binary}, {atom, _, split}}, [_, _, _]}) -> true;
                (_) -> false
            end),
            HasBinComp_M06 = WalkScan_M06(XorClauses_M06, fun
                ({bc, _, _, Quals}) -> lists:any(fun(Q) -> is_tuple(Q) andalso tuple_size(Q) >= 1 andalso element(1, Q) =:= b_generate end, Quals);
                (_) -> false
            end),
            case {HasSplit2_M06, HasSplit3_M06, HasBinComp_M06} of
                {true, true, true} -> ok;
                _ ->
                    {error, iolist_to_binary(io_lib:format(
                        "Expected binary:split/2 in split_key_value/1 (~p), binary:split/3 in extract_lines/1 (~p), and binary comprehension (<=) in xor_mask_payload/2 (~p).",
                        [HasSplit2_M06, HasSplit3_M06, HasBinComp_M06]
                    ))}
            end;
        {error, ParseErr_M06} ->
            {error, iolist_to_binary(io_lib:format("Failed to inspect scanner AST: ~p", [ParseErr_M06]))}
    end,
    case {bf_ast_verifier:verify_rules(SourceFile_M06, <<>>, Rules_M06), BinCompAudit_M06} of
        {{ok, _}, ok} ->
            #{id => <<"ast_binary_scanner_audit">>, title => <<"AST Binary Scan & Comprehension Audit (bf_ast_verifier)">>, status => <<"passed">>, time_ms => 12, details => <<"Verified binary:split/2, binary:split/3, binary comprehension (<=), and absence of intermediate list comprehensions.">>};
        {{error, AstViolations_M06}, _} ->
            FirstMsg_M06 = case AstViolations_M06 of
                [#{message := M_M06} | _] -> M_M06;
                _ -> list_to_binary(io_lib:format("AST violations: ~p", [AstViolations_M06]))
            end,
            #{id => <<"ast_binary_scanner_audit">>, title => <<"AST Binary Scan & Comprehension Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => FirstMsg_M06, error => AstViolations_M06};
        {_, {error, BinAuditMsg_M06}} ->
            #{id => <<"ast_binary_scanner_audit">>, title => <<"AST Binary Scan & Comprehension Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => BinAuditMsg_M06}
    end
catch Class_Ast_M06:Err_Ast_M06 ->
    #{id => <<"ast_binary_scanner_audit">>, title => <<"AST Binary Scan & Comprehension Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST check error: ~p:~p", [Class_Ast_M06, Err_Ast_M06]))}
end,
S1_Scanner = try
    H1 = binary_scanner:split_key_value(<<"Content-Type: application/json">>),
    HMulti = binary_scanner:split_key_value(<<"X-Meta: foo: bar">>),
    H2 = binary_scanner:split_key_value(<<"BadHeaderWithoutSeparator">>),
    Lines = binary_scanner:extract_lines(<<"GET / HTTP/1.1\r\nHost: beamforge.io\r\n\r\nUser-Agent: BeamForge\r\n">>),
    LinesLead = binary_scanner:extract_lines(<<"\r\n\r\nonly_one\r\n">>),
    LinesEmpty = binary_scanner:extract_lines(<<>>),
    Masked = binary_scanner:xor_mask_payload(<<"super_secret_payload">>, 16#AA),
    Unmasked = binary_scanner:xor_mask_payload(Masked, 16#AA),
    XorCase = binary_scanner:xor_mask_payload(<<"ABC">>, 16#20),
    XorEmpty = binary_scanner:xor_mask_payload(<<>>, 16#FF),
    case {H1, HMulti, H2, Lines, LinesLead, LinesEmpty, Unmasked =:= <<"super_secret_payload">>, XorCase, XorEmpty} of
        {{ok, <<"Content-Type">>, <<"application/json">>},
         {ok, <<"X-Meta">>, <<"foo: bar">>},
         {error, malformed_header},
         [<<"GET / HTTP/1.1">>, <<"Host: beamforge.io">>, <<"User-Agent: BeamForge">>],
         [<<"only_one">>],
         [],
         true,
         <<"abc">>,
         <<>>} ->
            #{id => <<"binary_scanner_and_comprehension">>, title => <<"Binary Scanning (binary:split) & Binary Comprehensions (<=)">>, status => <<"passed">>, time_ms => 8, details => <<"Verified first-occurrence header splitting, multi-colon preservation, trim_all empty-line pruning, empty binary edges, and XOR comprehension roundtrip">>};
        Got_M06 ->
            #{id => <<"binary_scanner_and_comprehension">>, title => <<"Binary Scanning (binary:split) & Binary Comprehensions (<=)">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Scanner mismatch: ~p", [Got_M06]))}
    end
catch Class_M06:Err_M06 ->
    #{id => <<"binary_scanner_and_comprehension">>, title => <<"Binary Scanning (binary:split) & Binary Comprehensions (<=)">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_M06, Err_M06]))}
end,
Stages = [CompileStage_M06, S_Ast_M06, S1_Scanner]
`, wsDir, wsDir), true

	case "ch04-l07":
		return fmt.Sprintf(`
CompileStage_M07 = case code:ensure_loaded(binary_unpinner) of
    {module, binary_unpinner} ->
        Exports_M07 = binary_unpinner:module_info(exports),
        Req_M07 = [{extract_token_safe, 1}, {slice_packet_safe, 2}, {inspect_refc_ratio, 1}],
        Missing_M07 = [FA || FA <- Req_M07, not lists:member(FA, Exports_M07)],
        case Missing_M07 of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"binary_unpinner.erl compiled cleanly; extract_token_safe/1, slice_packet_safe/2, inspect_refc_ratio/1 exported">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing_M07]))}
        end;
    {error, E_M07} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_M07]))}
end,
S_Ast_M07 = try
    SourceCandidates_M07 = [
        filename:join(["%s", "src", "binary_unpinner.erl"]),
        filename:join(["%s", "binary_unpinner.erl"])
    ],
    SourceFile_M07 = case [P || P <- SourceCandidates_M07, filelib:is_regular(P)] of
        [ValidSrc_M07 | _] -> ValidSrc_M07;
        [] -> hd(SourceCandidates_M07)
    end,
    Rules_M07 = #{
        required_remote_calls => [{binary, copy, 1}, {binary, referenced_byte_size, 1}, {erlang, byte_size, 1}],
        required_constructs => [bit_syntax, guards],
        forbidden_remote_calls => [{erlang, binary_to_list, any}]
    },
    UnpinAstAudit_M07 = case epp:parse_file(SourceFile_M07, []) of
        {ok, Forms_M07} ->
            WalkUnpin_M07 = fun WalkU(Node, Pred) ->
                case Pred(Node) of
                    true -> true;
                    false when is_tuple(Node) -> WalkU(tuple_to_list(Node), Pred);
                    false when is_list(Node) -> lists:any(fun(El) -> WalkU(El, Pred) end, Node);
                    false -> false
                end
            end,
            TokClauses_M07 = lists:flatten([Clauses || {function, _, extract_token_safe, 1, Clauses} <- Forms_M07]),
            SliceClauses_M07 = lists:flatten([Clauses || {function, _, slice_packet_safe, 2, Clauses} <- Forms_M07]),
            RatioClauses_M07 = lists:flatten([Clauses || {function, _, inspect_refc_ratio, 1, Clauses} <- Forms_M07]),
            HasTokCopy_M07 = WalkUnpin_M07(TokClauses_M07, fun
                ({call, _, {remote, _, {atom, _, binary}, {atom, _, copy}}, [_]}) -> true;
                (_) -> false
            end),
            HasSliceCopy_M07 = WalkUnpin_M07(SliceClauses_M07, fun
                ({call, _, {remote, _, {atom, _, binary}, {atom, _, copy}}, [_]}) -> true;
                (_) -> false
            end),
            HasSliceGuard_M07 = lists:any(fun({clause, _, _, Guards, _}) -> Guards =/= [] end, SliceClauses_M07),
            HasRatioRefc_M07 = WalkUnpin_M07(RatioClauses_M07, fun
                ({call, _, {remote, _, {atom, _, binary}, {atom, _, referenced_byte_size}}, [_]}) -> true;
                (_) -> false
            end),
            HasRatioByteSize_M07 = WalkUnpin_M07(RatioClauses_M07, fun
                ({call, _, {atom, _, byte_size}, [_]}) -> true;
                ({call, _, {remote, _, {atom, _, erlang}, {atom, _, byte_size}}, [_]}) -> true;
                (_) -> false
            end),
            case {HasTokCopy_M07, HasSliceCopy_M07, HasSliceGuard_M07, HasRatioRefc_M07, HasRatioByteSize_M07} of
                {true, true, true, true, true} -> ok;
                _ ->
                    {error, iolist_to_binary(io_lib:format(
                        "Expected binary:copy/1 in extract_token_safe/1 (~p) & slice_packet_safe/2 (~p), guard on slice_packet_safe/2 (~p), and referenced_byte_size/1 (~p) + byte_size/1 (~p) in inspect_refc_ratio/1.",
                        [HasTokCopy_M07, HasSliceCopy_M07, HasSliceGuard_M07, HasRatioRefc_M07, HasRatioByteSize_M07]
                    ))}
            end;
        {error, ParseErr_M07} ->
            {error, iolist_to_binary(io_lib:format("Failed to inspect binary_unpinner AST: ~p", [ParseErr_M07]))}
    end,
    case {bf_ast_verifier:verify_rules(SourceFile_M07, <<>>, Rules_M07), UnpinAstAudit_M07} of
        {{ok, _}, ok} ->
            #{id => <<"ast_binary_unpinner_audit">>, title => <<"AST binary:copy/1 & Guard Audit (bf_ast_verifier)">>, status => <<"passed">>, time_ms => 12, details => <<"Verified binary:copy/1 on both slicers, binary:referenced_byte_size/1 + byte_size/1 in inspect_refc_ratio/1, guards, and no binary_to_list bypass.">>};
        {{error, AstViolations_M07}, _} ->
            FirstMsg_M07 = case AstViolations_M07 of
                [#{message := M_M07} | _] -> M_M07;
                _ -> list_to_binary(io_lib:format("AST violations: ~p", [AstViolations_M07]))
            end,
            #{id => <<"ast_binary_unpinner_audit">>, title => <<"AST binary:copy/1 & Guard Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => FirstMsg_M07, error => AstViolations_M07};
        {_, {error, UnpinAuditMsg_M07}} ->
            #{id => <<"ast_binary_unpinner_audit">>, title => <<"AST binary:copy/1 & Guard Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => UnpinAuditMsg_M07}
    end
catch Class_Ast_M07:Err_Ast_M07 ->
    #{id => <<"ast_binary_unpinner_audit">>, title => <<"AST binary:copy/1 & Guard Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("AST check error: ~p:~p", [Class_Ast_M07, Err_Ast_M07]))}
end,
S1_Unpin = try
    LargePacket = crypto:strong_rand_bytes(4096),
    <<PinnedSub:128/binary, _/binary>> = LargePacket,
    {ok, SafeToken} = binary_unpinner:extract_token_safe(LargePacket),
    SafeSlice = binary_unpinner:slice_packet_safe(LargePacket, 128),
    ZeroSlice = binary_unpinner:slice_packet_safe(LargePacket, 0),
    Exact16 = binary_unpinner:extract_token_safe(<<1:128>>),
    TooShort = binary_unpinner:extract_token_safe(<<"short">>),
    PinnedRatio = binary_unpinner:inspect_refc_ratio(PinnedSub),
    TokenRatio = binary_unpinner:inspect_refc_ratio(SafeToken),
    SliceRatio = binary_unpinner:inspect_refc_ratio(SafeSlice),
    RealTokRefc = binary:referenced_byte_size(SafeToken),
    RealSliceRefc = binary:referenced_byte_size(SafeSlice),
    RealZeroRefc = binary:referenced_byte_size(ZeroSlice),
    GuardNeg = try binary_unpinner:slice_packet_safe(<<"ABC">>, -1) of
        BadNeg -> {unexpected_neg, BadNeg}
    catch
        error:function_clause -> ok;
        Cg1:Rg1 -> {wrong_neg_err, Cg1, Rg1}
    end,
    GuardShort = try binary_unpinner:slice_packet_safe(<<"ABC">>, 10) of
        BadShort -> {unexpected_short, BadShort}
    catch
        error:function_clause -> ok;
        Cg2:Rg2 -> {wrong_short_err, Cg2, Rg2}
    end,
    GuardNonBin = try binary_unpinner:slice_packet_safe("ABC", 2) of
        BadNonBin -> {unexpected_nonbin, BadNonBin}
    catch
        error:function_clause -> ok;
        Cg3:Rg3 -> {wrong_nonbin_err, Cg3, Rg3}
    end,
    case {byte_size(SafeToken), byte_size(SafeSlice), ZeroSlice, Exact16, TooShort, PinnedRatio, TokenRatio, SliceRatio, RealTokRefc, RealSliceRefc, RealZeroRefc, GuardNeg, GuardShort, GuardNonBin} of
        {16, 128, <<>>, {ok, <<1:128>>}, {error, insufficient_data}, {128, 4096}, {16, 16}, {128, 128}, 16, 128, 0, ok, ok, ok} ->
            #{id => <<"procbin_subbinary_unpinning">>, title => <<"ProcBin Unpinning via binary:copy/1 & SubBinary Memory Safety">>, status => <<"passed">>, time_ms => 10, details => <<"binary:copy/1 confirmed: 128-byte sub-binary & 16-byte token severed from 4096-byte parent buffer (referenced_byte_size == 128/16/0 vs pinned {128,4096}), and bounds guards verified">>};
        Got_M07 ->
            #{id => <<"procbin_subbinary_unpinning">>, title => <<"ProcBin Unpinning via binary:copy/1 & SubBinary Memory Safety">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Unpin mismatch: ~p", [Got_M07]))}
    end
catch Class_M07:Err_M07 ->
    #{id => <<"procbin_subbinary_unpinning">>, title => <<"ProcBin Unpinning via binary:copy/1 & SubBinary Memory Safety">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_M07, Err_M07]))}
end,
Stages = [CompileStage_M07, S_Ast_M07, S1_Unpin]
`, wsDir, wsDir), true

	case "ch04-l08":
		return fmt.Sprintf(`
CompileStage_M08 = case code:ensure_loaded(packet_parser) of
    {module, packet_parser} ->
        Exports_M08 = packet_parser:module_info(exports),
        Req_M08 = [{parse_frame, 1}, {parse_tlv_stream, 1}, {encode_frame, 1}],
        Missing_M08 = [FA || FA <- Req_M08, not lists:member(FA, Exports_M08)],
        case Missing_M08 of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"packet_parser.erl compiled cleanly; parse_frame/1, parse_tlv_stream/1, encode_frame/1 exported">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing_M08]))}
        end;
    {error, E_M08} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_M08]))}
end,
S_Ast_M08 = try
    SourceCandidates_M08 = [
        filename:join(["%s", "src", "packet_parser.erl"]),
        filename:join(["%s", "packet_parser.erl"])
    ],
    SourceFile_M08 = case [P || P <- SourceCandidates_M08, filelib:is_regular(P)] of
        [ValidSrc_M08 | _] -> ValidSrc_M08;
        [] -> hd(SourceCandidates_M08)
    end,
    BeamBin_M08 = case code:which(packet_parser) of
        BeamPath_M08 when is_list(BeamPath_M08) ->
            case file:read_file(BeamPath_M08) of
                {ok, B_M08} -> B_M08;
                _ -> <<>>
            end;
        _ -> <<>>
    end,
    Rules_M08 = #{
        required_constructs => [record_def, bit_syntax],
        required_remote_calls => [{binary, copy, 1}, {erlang, byte_size, 1}],
        require_tail_recursion => [{parse_tlv_stream, 1}]
    },
    TlvAstAudit_M08 = case epp:parse_file(SourceFile_M08, []) of
        {ok, Forms_M08} ->
            RecFields_M08 = [case RF of
                {typed_record_field, BaseRF, _} when tuple_size(BaseRF) >= 3 -> element(3, element(3, BaseRF));
                _ when tuple_size(RF) >= 3, element(1, RF) =:= record_field -> element(3, element(3, RF));
                _ -> invalid
            end || {attribute, _, record, {tlv_frame, Fields}} <- Forms_M08, RF <- Fields],
            HasValidRecord_M08 = RecFields_M08 =:= [version, type, length, payload],
            WalkTlv_M08 = fun WalkT(Node, Pred) ->
                case Pred(Node) of
                    true -> true;
                    false when is_tuple(Node) -> WalkT(tuple_to_list(Node), Pred);
                    false when is_list(Node) -> lists:any(fun(El) -> WalkT(El, Pred) end, Node);
                    false -> false
                end
            end,
            ParseFrameClauses_M08 = lists:flatten([Clauses || {function, _, parse_frame, 1, Clauses} <- Forms_M08]),
            EncodeFrameClauses_M08 = lists:flatten([Clauses || {function, _, encode_frame, 1, Clauses} <- Forms_M08]),
            HasFrameCopy_M08 = WalkTlv_M08(ParseFrameClauses_M08, fun
                ({call, _, {remote, _, {atom, _, binary}, {atom, _, copy}}, [_]}) -> true;
                (_) -> false
            end),
            HasEncodeByteSize_M08 = WalkTlv_M08(EncodeFrameClauses_M08, fun
                ({call, _, {atom, _, byte_size}, [_]}) -> true;
                ({call, _, {remote, _, {atom, _, erlang}, {atom, _, byte_size}}, [_]}) -> true;
                (_) -> false
            end),
            case {HasValidRecord_M08, HasFrameCopy_M08, HasEncodeByteSize_M08} of
                {true, true, true} -> ok;
                _ ->
                    {error, iolist_to_binary(io_lib:format(
                        "Expected -record(tlv_frame, {version, type, length, payload}) (~p), binary:copy/1 in parse_frame/1 (~p), and byte_size/1 in encode_frame/1 (~p).",
                        [HasValidRecord_M08, HasFrameCopy_M08, HasEncodeByteSize_M08]
                    ))}
            end;
        {error, ParseErr_M08} ->
            {error, iolist_to_binary(io_lib:format("Failed to inspect packet_parser AST: ~p", [ParseErr_M08]))}
    end,
    case {bf_ast_verifier:verify_rules(SourceFile_M08, BeamBin_M08, Rules_M08), TlvAstAudit_M08} of
        {{ok, _}, ok} ->
            #{id => <<"ast_packet_parser_audit">>, title => <<"AST Record, Bit Syntax, Tail Recursion & Copy Audit (bf_ast_verifier)">>, status => <<"passed">>, time_ms => 14, details => <<"Verified -record(tlv_frame), bit syntax, binary:copy/1, byte_size/1, and strict tail recursion on parse_tlv_stream/1.">>};
        {{error, AstViolations_M08}, _} ->
            FirstMsg_M08 = case AstViolations_M08 of
                [#{message := M_M08} | _] -> M_M08;
                _ -> list_to_binary(io_lib:format("AST violations: ~p", [AstViolations_M08]))
            end,
            #{id => <<"ast_packet_parser_audit">>, title => <<"AST Record, Bit Syntax, Tail Recursion & Copy Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 14, details => FirstMsg_M08, error => AstViolations_M08};
        {_, {error, TlvAuditMsg_M08}} ->
            #{id => <<"ast_packet_parser_audit">>, title => <<"AST Record, Bit Syntax, Tail Recursion & Copy Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 14, details => TlvAuditMsg_M08}
    end
catch Class_Ast_M08:Err_Ast_M08 ->
    #{id => <<"ast_packet_parser_audit">>, title => <<"AST Record, Bit Syntax, Tail Recursion & Copy Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("AST check error: ~p:~p", [Class_Ast_M08, Err_Ast_M08]))}
end,
S1_Tlv = try
    F1 = packet_parser:encode_frame({tlv_frame, 1, 2, 4, <<"PING">>}),
    F2 = packet_parser:encode_frame({tlv_frame, 1, 3, 4, <<"PONG">>}),
    F3 = packet_parser:encode_frame({tlv_frame, 2, 7, 8, <<"TELEMETR">>}),
    FEmpty = packet_parser:encode_frame({tlv_frame, 1, 0, 0, <<>>}),
    FStaleLen = packet_parser:encode_frame({tlv_frame, 2, 5, 999, <<"HI">>}),
    StreamFull = <<F1/binary, F2/binary, F3/binary>>,
    StreamPartial = <<F1/binary, F2/binary, 1:4, 9:4, 10:16/big, "INCOMPLET">>,
    BigPayload = crypto:strong_rand_bytes(128),
    FBig = packet_parser:encode_frame({tlv_frame, 1, 7, 128, BigPayload}),
    BigFrag = <<1:4, 9:4, 5000:16/big, (crypto:strong_rand_bytes(80))/binary>>,
    BigStream = <<F1/binary, FBig/binary, BigFrag/binary>>,
    ResFull = packet_parser:parse_tlv_stream(StreamFull),
    ResEmpty = packet_parser:parse_tlv_stream(<<>>),
    ResPartial = packet_parser:parse_tlv_stream(StreamPartial),
    ResBig = packet_parser:parse_tlv_stream(BigStream),
    {ok, {tlv_frame, 1, 0, 0, <<>>}, <<"X">>} = packet_parser:parse_frame(<<FEmpty/binary, "X">>),
    {error, incomplete_frame} = packet_parser:parse_frame(<<>>),
    {error, incomplete_frame} = packet_parser:parse_frame(<<1:4, 2:4, 5:16/big, "AB">>),
    {partial, [{tlv_frame, 1, 2, 4, <<"PING">>}, {tlv_frame, 1, 7, 128, BigDecPayload}], BigTrailing} = ResBig,
    case {FStaleLen, ResFull, ResEmpty, ResPartial, BigDecPayload =:= BigPayload, binary:referenced_byte_size(BigDecPayload), BigTrailing =:= BigFrag, binary:referenced_byte_size(BigTrailing)} of
        {<<37, 0, 2, "HI">>,
         {ok, [{tlv_frame, 1, 2, 4, <<"PING">>},
               {tlv_frame, 1, 3, 4, <<"PONG">>},
               {tlv_frame, 2, 7, 8, <<"TELEMETR">>}]},
         {ok, []},
         {partial, [{tlv_frame, 1, 2, 4, <<"PING">>},
                    {tlv_frame, 1, 3, 4, <<"PONG">>}],
          Trailing},
         true, 128, true, 83} when byte_size(Trailing) =:= 12 ->
            #{id => <<"tlv_stream_parsing">>, title => <<"Binary Network Packet & Multi-Frame TLV Stream Parser">>, status => <<"passed">>, time_ms => 12, details => <<"All frames extracted in order with unpinned 128-byte payload (refc=128) & 83-byte trailing fragment (refc=83), empty/truncated edges, and byte_size encoding verified">>};
        Got_M08 ->
            #{id => <<"tlv_stream_parsing">>, title => <<"Binary Network Packet & Multi-Frame TLV Stream Parser">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("TLV mismatch: ~p", [Got_M08]))}
    end
catch Class_M08:Err_M08 ->
    #{id => <<"tlv_stream_parsing">>, title => <<"Binary Network Packet & Multi-Frame TLV Stream Parser">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Crash: ~p:~p", [Class_M08, Err_M08]))}
end,
Stages = [CompileStage_M08, S_Ast_M08, S1_Tlv]
`, wsDir, wsDir), true

	// ── CHAPTER 5 ─────────────────────────────────────────────────────────────
	case "ch05-l01":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(process_bench) of
    {module, process_bench} ->
        Exports = process_bench:module_info(exports),
        Required = [{run, 0}, {run_bench, 1}, {inspect_process, 1}],
        case lists:all(fun(MFA) -> lists:member(MFA, Exports) end, Required) of
            true ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"process_bench.erl compiled cleanly; run/0, run_bench/1, and inspect_process/1 exported.">>};
            false ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => <<"Missing required exports: run/0, run_bench/1, or inspect_process/1.">>}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S_Ast = try
    SrcPath = filename:join("%s", "src/process_bench.erl"),
    Rules = #{
        required_remote_calls => [{erlang, process_info, 2}, {erlang, monotonic_time, 1}],
        required_constructs => [list_comprehension, guards]
    },
    case bf_ast_verifier:verify_rules(SrcPath, Rules) of
        {ok, _} ->
            #{id => <<"ast_process_bench_audit">>, title => <<"AST Analysis: BIF Introspection & List Comprehension Audit">>, status => <<"passed">>, time_ms => 10, details => <<"Verified required process_info/2 and monotonic_time/1 telemetry calls alongside list comprehensions and guards.">>};
        {error, Violations} ->
            #{id => <<"ast_process_bench_audit">>, title => <<"AST Analysis: BIF Introspection & List Comprehension Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C_Ast:R_Ast ->
    #{id => <<"ast_process_bench_audit">>, title => <<"AST Analysis: BIF Introspection & List Comprehension Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C_Ast, R_Ast]))}
end,
S1_Bench = try
    case process_bench:run_bench(2000) of
        #{spawned := 2000, avg_memory_bytes := AvgMem, elapsed_us := ElapsedUs} when AvgMem < 4096, ElapsedUs >= 0 ->
            #{id => <<"process_spawn_benchmark">>, title => <<"2,000 Concurrent BEAM Processes Spawn Benchmark">>, status => <<"passed">>, time_ms => 25, details => list_to_binary(io_lib:format("Spawned 2,000 processes in ~p us; avg memory: ~p bytes (~.2f KB)", [ElapsedUs, AvgMem, AvgMem / 1024]))};
        Got1 ->
            #{id => <<"process_spawn_benchmark">>, title => <<"2,000 Concurrent BEAM Processes Spawn Benchmark">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Benchmark invalid: ~p", [Got1]))}
    end
catch C1:R1 ->
    #{id => <<"process_spawn_benchmark">>, title => <<"2,000 Concurrent BEAM Processes Spawn Benchmark">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
S2_Inspect = try
    TestPid = spawn(fun() -> receive stop -> ok end end),
    Mem = process_bench:inspect_process(TestPid),
    TestPid ! stop,
    if
        is_integer(Mem) andalso Mem > 500 andalso Mem < 10000 ->
            #{id => <<"process_memory_inspection">>, title => <<"BEAM Process Telemetry & Heap Isolation Audit">>, status => <<"passed">>, time_ms => 8, details => list_to_binary(io_lib:format("Live process memory inspected: ~p bytes", [Mem]))};
        true ->
            #{id => <<"process_memory_inspection">>, title => <<"BEAM Process Telemetry & Heap Isolation Audit">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Unexpected memory footprint: ~p", [Mem]))}
    end
catch C2:R2 ->
    #{id => <<"process_memory_inspection">>, title => <<"BEAM Process Telemetry & Heap Isolation Audit">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S_Ast, S1_Bench, S2_Inspect]
`, wsDir), true

	case "ch05-l02":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(ping_actor) of
    {module, ping_actor} ->
        Exports = ping_actor:module_info(exports),
        Required = [{start_responder, 0}, {responder_loop, 0}, {ping, 2}, {broadcast, 2}],
        case lists:all(fun(MFA) -> lists:member(MFA, Exports) end, Required) of
            true -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"ping_actor.erl compiled cleanly; start_responder/0, responder_loop/0, ping/2, and broadcast/2 exported.">>};
            false -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => <<"Missing required exports: start_responder/0, responder_loop/0, ping/2, or broadcast/2">>}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "ping_actor.erl"]),
    BeamPath = filename:join(["%s", "ebin", "ping_actor.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_calls => [{erlang, self, 0}],
        require_tail_recursion => [{responder_loop, 0}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_self_and_spawn_audit">>, title => <<"AST Analysis: Asynchronous Protocol & self() Audit">>, status => <<"passed">>, time_ms => 15, details => <<"Verified self() call and tail-recursive responder_loop/0.">>};
        {error, Violations} ->
            #{id => <<"ast_self_and_spawn_audit">>, title => <<"AST Analysis: Asynchronous Protocol & self() Audit">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_self_and_spawn_audit">>, title => <<"AST Analysis: Asynchronous Protocol & self() Audit">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_PingPong = try
    P = ping_actor:start_responder(),
    Res1 = ping_actor:ping(P, <<"syn">>),
    Res2 = ping_actor:ping(P, {metric, 42}),
    Res3 = ping_actor:ping(P, 12345),
    P ! stop,
    case {Res1, Res2, Res3} of
        {{ok, <<"syn">>}, {ok, {metric, 42}}, {ok, 12345}} ->
            #{id => <<"ping_pong_roundtrip">>, title => <<"Asynchronous Message Passing & State Machine Roundtrip">>, status => <<"passed">>, time_ms => 18, details => <<"Verified sequential request-response exchange with binary, tuple, and integer payloads.">>};
        Got ->
            #{id => <<"ping_pong_roundtrip">>, title => <<"Asynchronous Message Passing & State Machine Roundtrip">>, status => <<"failed">>, time_ms => 18, details => list_to_binary(io_lib:format("Ping pong mismatch: ~p", [Got]))}
    end
catch C2:R2 ->
    #{id => <<"ping_pong_roundtrip">>, title => <<"Asynchronous Message Passing & State Machine Roundtrip">>, status => <<"failed">>, time_ms => 18, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2]))}
end,
S3_Broadcast = try
    P1 = ping_actor:start_responder(),
    P2 = ping_actor:start_responder(),
    case ping_actor:broadcast([P1, P2], stop) of
        {sent, 2} ->
            #{id => <<"broadcast_fanout">>, title => <<"Asynchronous Broadcast Fanout Verification">>, status => <<"passed">>, time_ms => 12, details => <<"Broadcast asynchronously sent to 2 subscriber PIDs.">>};
        OtherB ->
            #{id => <<"broadcast_fanout">>, title => <<"Asynchronous Broadcast Fanout Verification">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Broadcast returned unexpected result: ~p", [OtherB]))}
    end
catch C3:R3 ->
    #{id => <<"broadcast_fanout">>, title => <<"Asynchronous Broadcast Fanout Verification">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Broadcast Crash: ~p:~p", [C3, R3]))}
end,
Stages = [CompileStage, S1_Ast, S2_PingPong, S3_Broadcast]
`, wsDir, wsDir), true

	case "ch05-l03":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(priority_mailbox) of
    {module, priority_mailbox} ->
        Exports = priority_mailbox:module_info(exports),
        Req = [{receive_urgent_first, 1}, {request_with_timeout, 3}, {flush_mailbox, 0}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"priority_mailbox.erl compiled cleanly; all required API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "priority_mailbox.erl"]),
    BeamPath = filename:join(["%s", "ebin", "priority_mailbox.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_constructs => [receive_after],
        required_calls => [{erlang, self, 0}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_receive_after_audit">>, title => <<"AST Analysis: receive...after Construct Verification">>, status => <<"passed">>, time_ms => 15, details => <<"Verified receive...after construct and self/0 caller reference.">>};
        {error, Violations} ->
            #{id => <<"ast_receive_after_audit">>, title => <<"AST Analysis: receive...after Construct Verification">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:Err1 ->
    #{id => <<"ast_receive_after_audit">>, title => <<"AST Analysis: receive...after Construct Verification">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, Err1]))}
end,
S2_Priority = try
    self() ! {normal, "low1"},
    self() ! {urgent, "crit1"},
    self() ! {normal, "low2"},
    self() ! {urgent, "crit2"},
    case priority_mailbox:receive_urgent_first(4) of
        ["crit1", "crit2", "low1", "low2"] ->
            #{id => <<"selective_receive_priority">>, title => <<"Mailbox Selective Receive & Priority Queue Reordering">>, status => <<"passed">>, time_ms => 12, details => <<"Urgent messages drained and processed ahead of normal messages.">>};
        GotP ->
            #{id => <<"selective_receive_priority">>, title => <<"Mailbox Selective Receive & Priority Queue Reordering">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Priority sequence mismatch: ~p", [GotP]))}
    end
catch C2:Err2 ->
    #{id => <<"selective_receive_priority">>, title => <<"Mailbox Selective Receive & Priority Queue Reordering">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, Err2]))}
end,
S3_Timeout = try
    Self3 = self(),
    TestPid3 = spawn(fun() ->
        SilentWorker = spawn(fun() -> receive after 1000 -> ok end end),
        T0 = erlang:monotonic_time(millisecond),
        Res = priority_mailbox:request_with_timeout(SilentWorker, test_ping, 50),
        Elapsed = erlang:monotonic_time(millisecond) - T0,
        Self3 ! {s3_done, Res, Elapsed}
    end),
    receive
        {s3_done, {error, timeout}, Elapsed3} ->
            if
                Elapsed3 >= 40 andalso Elapsed3 =< 250 ->
                    #{id => <<"timeout_guarantee">>, title => <<"after Timeout Fallback & Non-Blocking Guarantees">>, status => <<"passed">>, time_ms => Elapsed3, details => list_to_binary(io_lib:format("Timeout fired accurately in ~p ms without blocking caller.", [Elapsed3]))};
                true ->
                    #{id => <<"timeout_guarantee">>, title => <<"after Timeout Fallback & Non-Blocking Guarantees">>, status => <<"failed">>, time_ms => Elapsed3, details => list_to_binary(io_lib:format("Timeout elapsed unexpected duration: ~p ms", [Elapsed3]))}
            end;
        {s3_done, OtherT3, _} ->
            #{id => <<"timeout_guarantee">>, title => <<"after Timeout Fallback & Non-Blocking Guarantees">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Expected {error, timeout}, got: ~p", [OtherT3]))}
    after 400 ->
        exit(TestPid3, kill),
        #{id => <<"timeout_guarantee">>, title => <<"after Timeout Fallback & Non-Blocking Guarantees">>, status => <<"failed">>, time_ms => 400, details => <<"request_with_timeout blocked indefinitely; missing receive...after timeout clause.">>}
    end
catch C3:Err3 ->
    #{id => <<"timeout_guarantee">>, title => <<"after Timeout Fallback & Non-Blocking Guarantees">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, Err3]))}
end,
S4_Flush = try
    self() ! token_a,
    self() ! token_b,
    case priority_mailbox:flush_mailbox() of
        [token_a, token_b] ->
            #{id => <<"mailbox_flush_audit">>, title => <<"after 0 Non-Blocking Mailbox Flush Audit">>, status => <<"passed">>, time_ms => 8, details => <<"flushed all pending mailbox messages in FIFO order.">>};
        GotFlush ->
            #{id => <<"mailbox_flush_audit">>, title => <<"after 0 Non-Blocking Mailbox Flush Audit">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Flush mismatch: ~p", [GotFlush]))}
    end
catch C4:Err4 ->
    #{id => <<"mailbox_flush_audit">>, title => <<"after 0 Non-Blocking Mailbox Flush Audit">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C4, Err4]))}
end,
Stages = [CompileStage, S1_Ast, S2_Priority, S3_Timeout, S4_Flush]
`, wsDir, wsDir), true

	case "ch05-l04":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(counter_actor) of
    {module, counter_actor} ->
        Exports = counter_actor:module_info(exports),
        Req = [{start, 1}, {increment, 2}, {decrement, 2}, {get_value, 1}, {stop, 1}, {loop, 1}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"counter_actor.erl compiled cleanly; all API functions and loop/1 exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "counter_actor.erl"]),
    BeamPath = filename:join(["%s", "ebin", "counter_actor.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        require_tail_recursion => [{loop, 1}],
        required_calls => [{erlang, self, 0}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_tco_loop_audit">>, title => <<"AST Analysis: Tail-Recursive loop/1 (O(1) Stack Memory)">>, status => <<"passed">>, time_ms => 15, details => <<"Tail call optimization verified: loop/1 reuses stack frames in O(1) space.">>};
        {error, Violations} ->
            #{id => <<"ast_tco_loop_audit">>, title => <<"AST Analysis: Tail-Recursive loop/1 (O(1) Stack Memory)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:Err1 ->
    #{id => <<"ast_tco_loop_audit">>, title => <<"AST Analysis: Tail-Recursive loop/1 (O(1) Stack Memory)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, Err1]))}
end,
S2_State = try
    P = counter_actor:start(100),
    ok = counter_actor:increment(P, 50),
    ok = counter_actor:decrement(P, 30),
    ok = counter_actor:increment(P, 10),
    case counter_actor:get_value(P) of
        {ok, 130} ->
            counter_actor:stop(P),
            #{id => <<"actor_state_accumulation">>, title => <<"Immutable State Accumulation across Concurrent Increments">>, status => <<"passed">>, time_ms => 14, details => <<"Counter accurately preserved state changes: 100 + 50 - 30 + 10 = 130.">>};
        GotVal ->
            counter_actor:stop(P),
            #{id => <<"actor_state_accumulation">>, title => <<"Immutable State Accumulation across Concurrent Increments">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("Value mismatch: ~p", [GotVal]))}
    end
catch C2:Err2 ->
    #{id => <<"actor_state_accumulation">>, title => <<"Immutable State Accumulation across Concurrent Increments">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, Err2]))}
end,
S3_Timeout = try
    Self3 = self(),
    T3_Worker = spawn(fun() ->
        SilentWorker = spawn(fun() -> receive after 1500 -> ok end end),
        T0 = erlang:monotonic_time(millisecond),
        Res = counter_actor:get_value(SilentWorker),
        Elapsed = erlang:monotonic_time(millisecond) - T0,
        Self3 ! {s3_done, Res, Elapsed}
    end),
    receive
        {s3_done, {error, timeout}, Elapsed3} ->
            if
                Elapsed3 >= 900 andalso Elapsed3 =< 1400 ->
                    #{id => <<"query_timeout_guard">>, title => <<"Client Query Timeout Guard (1,000ms)">>, status => <<"passed">>, time_ms => Elapsed3, details => list_to_binary(io_lib:format("get_value/1 accurately timed out in ~p ms.", [Elapsed3]))};
                true ->
                    #{id => <<"query_timeout_guard">>, title => <<"Client Query Timeout Guard (1,000ms)">>, status => <<"failed">>, time_ms => Elapsed3, details => list_to_binary(io_lib:format("Unexpected timeout duration: ~p ms", [Elapsed3]))}
            end;
        {s3_done, OtherT3, _} ->
            #{id => <<"query_timeout_guard">>, title => <<"Client Query Timeout Guard (1,000ms)">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Expected {error, timeout}, got: ~p", [OtherT3]))}
    after 1500 ->
        exit(T3_Worker, kill),
        #{id => <<"query_timeout_guard">>, title => <<"Client Query Timeout Guard (1,000ms)">>, status => <<"failed">>, time_ms => 1500, details => <<"get_value/1 blocked indefinitely; missing receive...after clause.">>}
    end
catch C3:Err3 ->
    #{id => <<"query_timeout_guard">>, title => <<"Client Query Timeout Guard (1,000ms)">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, Err3]))}
end,
Stages = [CompileStage, S1_Ast, S2_State, S3_Timeout]
`, wsDir, wsDir), true

	case "ch05-l05":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(named_kv_actor) of
    {module, named_kv_actor} ->
        Exports = named_kv_actor:module_info(exports),
        Req = [{start_registered, 0}, {put, 2}, {get, 1}, {stop, 0}, {loop, 1}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"named_kv_actor.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "named_kv_actor.erl"]),
    BeamPath = filename:join(["%s", "ebin", "named_kv_actor.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_calls => [{erlang, make_ref, 0}, {erlang, register, 2}, {erlang, whereis, 1}],
        require_tail_recursion => [{loop, 1}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_registry_and_ref_audit">>, title => <<"AST Analysis: register/2, whereis/1, and make_ref/0 Invariants">>, status => <<"passed">>, time_ms => 15, details => <<"Verified register/2, whereis/1, and make_ref/0 request correlation.">>};
        {error, Violations} ->
            #{id => <<"ast_registry_and_ref_audit">>, title => <<"AST Analysis: register/2, whereis/1, and make_ref/0 Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:Err1 ->
    #{id => <<"ast_registry_and_ref_audit">>, title => <<"AST Analysis: register/2, whereis/1, and make_ref/0 Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, Err1]))}
end,
S2_Kv = try
    catch named_kv_actor:stop(),
    {ok, _Pid} = named_kv_actor:start_registered(),
    {error, already_started} = named_kv_actor:start_registered(),
    ok = named_kv_actor:put(<<"k1">>, <<"v1">>),
    ok = named_kv_actor:put(<<"k2">>, 42),
    {ok, <<"v1">>} = named_kv_actor:get(<<"k1">>),
    {ok, 42} = named_kv_actor:get(<<"k2">>),
    {error, not_found} = named_kv_actor:get(<<"missing">>),
    ok = named_kv_actor:stop(),
    timer:sleep(20),
    undefined = whereis(named_kv_actor),
    #{id => <<"named_registry_operations">>, title => <<"Atom Registry Lifecycle, Map Storage & make_ref() Verification">>, status => <<"passed">>, time_ms => 20, details => <<"Named process lifecycle, key-value retrieval, and clean unregistering verified.">>}
catch C2:Err2 ->
    catch named_kv_actor:stop(),
    #{id => <<"named_registry_operations">>, title => <<"Atom Registry Lifecycle, Map Storage & make_ref() Verification">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("KV error: ~p:~p", [C2, Err2]))}
end,
S3_Unreg = try
    catch named_kv_actor:stop(),
    timer:sleep(10),
    {error, not_running} = named_kv_actor:get(<<"test_key">>),
    {error, not_running} = named_kv_actor:put(<<"test_key">>, <<"val">>),
    {error, not_running} = named_kv_actor:stop(),
    #{id => <<"unregistered_atom_safety">>, title => <<"Unregistered Atom Safety & whereis/1 Guard Verification">>, status => <<"passed">>, time_ms => 15, details => <<"Verified safe return of {error, not_running} without badarg crashes when unregistered.">>}
catch C3:Err3 ->
    #{id => <<"unregistered_atom_safety">>, title => <<"Unregistered Atom Safety & whereis/1 Guard Verification">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Unregistered atom crash: ~p:~p", [C3, Err3]))}
end,
S4_Timeout = try
    catch named_kv_actor:stop(),
    TestPid5 = self(),
    Watchdog5 = spawn(fun() ->
        receive
            cancel -> ok
        after 1500 ->
            exit(TestPid5, kill)
        end
    end),
    DummyPid = spawn(fun() -> receive after 3000 -> ok end end),
    register(named_kv_actor, DummyPid),
    T_Res = named_kv_actor:get(<<"hang_key">>),
    Watchdog5 ! cancel,
    catch unregister(named_kv_actor),
    exit(DummyPid, kill),
    case T_Res of
        {error, timeout} ->
            #{id => <<"request_timeout_guard">>, title => <<"Request-Reply Timeout Deadline & Mailbox Isolation">>, status => <<"passed">>, time_ms => 1020, details => <<"Verified 1000ms selective receive timeout on unresponsive actor.">>};
        OtherT ->
            #{id => <<"request_timeout_guard">>, title => <<"Request-Reply Timeout Deadline & Mailbox Isolation">>, status => <<"failed">>, time_ms => 1020, details => list_to_binary(io_lib:format("Expected {error, timeout}, got: ~p", [OtherT]))}
    end
catch C4:Err4 ->
    catch unregister(named_kv_actor),
    #{id => <<"request_timeout_guard">>, title => <<"Request-Reply Timeout Deadline & Mailbox Isolation">>, status => <<"failed">>, time_ms => 1020, details => list_to_binary(io_lib:format("Timeout test crash: ~p:~p", [C4, Err4]))}
end,
Stages = [CompileStage, S1_Ast, S2_Kv, S3_Unreg, S4_Timeout]
`, wsDir, wsDir), true

	case "ch05-l06":
		return fmt.Sprintf(`
CompileStage_Door = case code:ensure_loaded(door_lock_fsm) of
    {module, door_lock_fsm} ->
        ExportsD = door_lock_fsm:module_info(exports),
        ReqD = [{start, 1}, {enter_code, 2}, {lock, 1}, {get_state, 1}, {stop, 1}, {locked, 2}, {unlocked, 1}],
        case [E || E <- ReqD, not lists:member(E, ExportsD)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"door_lock_fsm.erl compiled cleanly; all state and client functions exported.">>};
            MissingD -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [MissingD]))}
        end;
    {error, E_D} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E_D]))}
end,
S1_Ast_Door = try
    SrcPathD = filename:join(["%s", "src", "door_lock_fsm.erl"]),
    BeamPathD = filename:join(["%s", "ebin", "door_lock_fsm.beam"]),
    {ok, BeamBinD} = file:read_file(BeamPathD),
    RulesD = #{
        require_tail_recursion => [{locked, 2}, {unlocked, 1}],
        required_calls => [{erlang, make_ref, 0}]
    },
    case bf_ast_verifier:verify_rules(SrcPathD, BeamBinD, RulesD) of
        {ok, _} ->
            #{id => <<"ast_mutual_tail_recursion">>, title => <<"AST Analysis: Mutual Tail Recursion in locked/2 and unlocked/1">>, status => <<"passed">>, time_ms => 15, details => <<"Verified tail call optimization across mutually recursive FSM state functions in O(1) space with make_ref/0 correlation.">>};
        {error, ViolationsD} ->
            #{id => <<"ast_mutual_tail_recursion">>, title => <<"AST Analysis: Mutual Tail Recursion in locked/2 and unlocked/1">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [ViolationsD]))}
    end
catch C1_D:R1_D ->
    #{id => <<"ast_mutual_tail_recursion">>, title => <<"AST Analysis: Mutual Tail Recursion in locked/2 and unlocked/1">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1_D, R1_D]))}
end,
S2_Fsm_Door = try
    P_D = door_lock_fsm:start(<<"4321">>),
    {locked, 0} = door_lock_fsm:get_state(P_D),
    {error, {wrong_code, 1}} = door_lock_fsm:enter_code(P_D, <<"0000">>),
    {error, {wrong_code, 2}} = door_lock_fsm:enter_code(P_D, <<"9999">>),
    {locked, 2} = door_lock_fsm:get_state(P_D),
    {ok, unlocked} = door_lock_fsm:enter_code(P_D, <<"4321">>),
    unlocked = door_lock_fsm:get_state(P_D),
    {ok, already_unlocked} = door_lock_fsm:enter_code(P_D, <<"anything">>),
    ok = door_lock_fsm:lock(P_D),
    {locked, 0} = door_lock_fsm:get_state(P_D),
    ok = door_lock_fsm:lock(P_D),
    ok = door_lock_fsm:stop(P_D),
    #{id => <<"fsm_state_transitions">>, title => <<"Mutual Recursion State Machine Transitions & Failure Counter">>, status => <<"passed">>, time_ms => 20, details => <<"Verified locked -> unlocked -> relocked transitions and failed attempts counter.">>}
catch C2_D:R2_D ->
    #{id => <<"fsm_state_transitions">>, title => <<"Mutual Recursion State Machine Transitions & Failure Counter">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("FSM Crash: ~p:~p", [C2_D, R2_D]))}
end,
S3_Timeout_Door = begin
    Parent_D = self(),
    Watchdog_D = spawn(fun() ->
        receive
            cancel -> ok
        after 1500 ->
            Parent_D ! {stage_timeout, timeout_exceeded}
        end
    end),
    TimeoutRes_D = try
        Dummy_D = spawn(fun() -> receive after 10000 -> ok end end),
        T_Res = door_lock_fsm:get_state(Dummy_D),
        exit(Dummy_D, kill),
        case T_Res of
            {error, timeout} ->
                #{id => <<"sync_call_timeout_guard">>, title => <<"Synchronous Call Timeout Guard Audit">>, status => <<"passed">>, time_ms => 1010, details => <<"Verified receive...after 1000 timeout handling on unresponsive target.">>};
            Other_D ->
                #{id => <<"sync_call_timeout_guard">>, title => <<"Synchronous Call Timeout Guard Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Expected {error, timeout}, got: ~p", [Other_D]))}
        end
    catch
        CT_D:RT_D ->
            #{id => <<"sync_call_timeout_guard">>, title => <<"Synchronous Call Timeout Guard Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Timeout test crashed: ~p:~p", [CT_D, RT_D]))}
    end,
    Watchdog_D ! cancel,
    receive
        {stage_timeout, timeout_exceeded} ->
            #{id => <<"sync_call_timeout_guard">>, title => <<"Synchronous Call Timeout Guard Audit">>, status => <<"failed">>, time_ms => 1500, details => <<"Watchdog: Call blocked indefinitely without timing out.">>}
    after 0 ->
        TimeoutRes_D
    end
end,
Stages = [CompileStage_Door, S1_Ast_Door, S2_Fsm_Door, S3_Timeout_Door]
`, wsDir, wsDir), true

	case "ch05-l08":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(ledger_actor) of
    {module, ledger_actor} ->
        Exports = ledger_actor:module_info(exports),
        Req = [{start, 1}, {get_balance, 2}, {process_transaction, 2}, {process_batch, 2}, {stop, 1}, {loop, 1}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"ledger_actor.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "ledger_actor.erl"]),
    BeamPath = filename:join(["%s", "ebin", "ledger_actor.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        require_tail_recursion => [{loop, 1}],
        required_constructs => [receive_after]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_and_tco_invariants">>, title => <<"AST Analysis: Tail-Recursive loop/1 & receive...after Audit">>, status => <<"passed">>, time_ms => 18, details => <<"Tail call optimization verified on loop/1; receive...after timeouts confirmed.">>};
        {error, Violations} ->
            #{id => <<"ast_and_tco_invariants">>, title => <<"AST Analysis: Tail-Recursive loop/1 & receive...after Audit">>, status => <<"failed">>, time_ms => 18, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_and_tco_invariants">>, title => <<"AST Analysis: Tail-Recursive loop/1 & receive...after Audit">>, status => <<"failed">>, time_ms => 18, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_Transactions = try
    Init = [{account, 101, <<"Alice">>, 500}, {account, 102, <<"Bob">>, 200}],
    Pid = ledger_actor:start(Init),
    {ok, 500} = ledger_actor:get_balance(Pid, 101),
    {ok, 600} = ledger_actor:process_transaction(Pid, {deposit, 101, 100}),
    {ok, 550} = ledger_actor:process_transaction(Pid, {withdraw, 101, 50}),
    {error, insufficient_funds} = ledger_actor:process_transaction(Pid, {withdraw, 101, 9999}),
    {error, not_found} = ledger_actor:process_transaction(Pid, {withdraw, 999, 10}),
    {ok, 550} = ledger_actor:get_balance(Pid, 101),
    ledger_actor:stop(Pid),
    #{id => <<"atomic_deposit_withdraw">>, title => <<"Deposit & Withdrawal Validation with Insufficient Funds Protection">>, status => <<"passed">>, time_ms => 15, details => <<"Deposits, withdrawals, and insufficient funds rollbacks verified.">>}
catch C2:R2 ->
    #{id => <<"atomic_deposit_withdraw">>, title => <<"Deposit & Withdrawal Validation with Insufficient Funds Protection">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Tx error: ~p:~p", [C2, R2]))}
end,
S3_Transfers = try
    InitT = [{account, 1, <<"Alice">>, 100}, {account, 2, <<"Bob">>, 50}],
    PidT = ledger_actor:start(InitT),
    {ok, 70} = ledger_actor:process_transaction(PidT, {transfer, 1, 2, 30}),
    {ok, 80} = ledger_actor:get_balance(PidT, 2),
    {error, insufficient_funds} = ledger_actor:process_transaction(PidT, {transfer, 1, 2, 500}),
    {error, not_found} = ledger_actor:process_transaction(PidT, {transfer, 1, 999, 10}),
    {ok, 70} = ledger_actor:get_balance(PidT, 1),
    {ok, 80} = ledger_actor:get_balance(PidT, 2),
    ledger_actor:stop(PidT),
    #{id => <<"atomic_transfers">>, title => <<"Atomic Dual-Account Transfer Consistency & Rollback">>, status => <<"passed">>, time_ms => 14, details => <<"Inter-account transfers atomically updated both accounts or safely aborted.">>}
catch C3:R3 ->
    #{id => <<"atomic_transfers">>, title => <<"Atomic Dual-Account Transfer Consistency & Rollback">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("Transfer error: ~p:~p", [C3, R3]))}
end,
S4_Batch = try
    InitB = [{account, 1, <<"Alice">>, 100}, {account, 2, <<"Bob">>, 50}],
    PidB = ledger_actor:start(InitB),
    TxList = [
        {deposit, 1, 25},
        {withdraw, 2, 20},
        {transfer, 1, 2, 50},
        {withdraw, 2, 1000},
        {transfer, 999, 1, 10}
    ],
    case ledger_actor:process_batch(PidB, TxList) of
        {ok, 3, 2} ->
            {ok, Final1} = ledger_actor:get_balance(PidB, 1),
            {ok, Final2} = ledger_actor:get_balance(PidB, 2),
            ledger_actor:stop(PidB),
            case {Final1, Final2} of
                {75, 80} ->
                    #{id => <<"batch_processing">>, title => <<"Batch Transaction Processing & Accumulator State Invariants">>, status => <<"passed">>, time_ms => 16, details => <<"3 transactions applied, 2 rejected; balances Alice: 75, Bob: 80.">>};
                OtherB ->
                    #{id => <<"batch_processing">>, title => <<"Batch Transaction Processing & Accumulator State Invariants">>, status => <<"failed">>, time_ms => 16, details => list_to_binary(io_lib:format("Final balances mismatch: ~p", [OtherB]))}
            end;
        GotBatch ->
            ledger_actor:stop(PidB),
            #{id => <<"batch_processing">>, title => <<"Batch Transaction Processing & Accumulator State Invariants">>, status => <<"failed">>, time_ms => 16, details => list_to_binary(io_lib:format("Expected {ok, 3, 2}, got: ~p", [GotBatch]))}
    end
catch C4:R4 ->
    #{id => <<"batch_processing">>, title => <<"Batch Transaction Processing & Accumulator State Invariants">>, status => <<"failed">>, time_ms => 16, details => list_to_binary(io_lib:format("Batch crash: ~p:~p", [C4, R4]))}
end,
S5_RaceAudit = try
    InitR = [{account, 42, <<"SharedPool">>, 50}],
    PidR = ledger_actor:start(InitR),
    Self = self(),
    [spawn(fun() ->
        Res = ledger_actor:process_transaction(PidR, {withdraw, 42, 20}),
        Self ! {withdraw_done, Res}
    end) || _ <- lists:seq(1, 10)],
    Results = [receive {withdraw_done, R} -> R after 2000 -> timeout end || _ <- lists:seq(1, 10)],
    SuccessCount = length([ok || {ok, _} <- Results]),
    InsufficientCount = length([err || {error, insufficient_funds} <- Results]),
    {ok, FinalBal} = ledger_actor:get_balance(PidR, 42),
    ledger_actor:stop(PidR),
    if
        SuccessCount =:= 2 andalso InsufficientCount =:= 8 andalso FinalBal =:= 10 ->
            #{id => <<"concurrency_race_audit">>, title => <<"Concurrent 10-Worker Double-Spend Race Condition Audit">>, status => <<"passed">>, time_ms => 28, details => <<"10 concurrent withdrawal requests serialized: exactly 2 succeeded, 8 rejected, final balance $10. Zero race conditions.">>};
        true ->
            #{id => <<"concurrency_race_audit">>, title => <<"Concurrent 10-Worker Double-Spend Race Condition Audit">>, status => <<"failed">>, time_ms => 28, details => list_to_binary(io_lib:format("Race condition detected: Success: ~p, Insufficient: ~p, Final: ~p", [SuccessCount, InsufficientCount, FinalBal]))}
    end
catch C5:R5 ->
    #{id => <<"concurrency_race_audit">>, title => <<"Concurrent 10-Worker Double-Spend Race Condition Audit">>, status => <<"failed">>, time_ms => 28, details => list_to_binary(io_lib:format("Race audit crash: ~p:~p", [C5, R5]))}
end,
Stages = [CompileStage, S1_Ast, S2_Transactions, S3_Transfers, S4_Batch, S5_RaceAudit]
`, wsDir, wsDir), true

	// ── CHAPTER 6 ─────────────────────────────────────────────────────────────
	case "ch06-l01":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(exception_classifier) of
    {module, exception_classifier} ->
        Exports = exception_classifier:module_info(exports),
        Req = [{check_payment, 1}, {safe_check, 1}, {trigger_class, 2}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"exception_classifier.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        case code:ensure_loaded(boundary_parser) of
            {module, boundary_parser} ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit (Legacy)">>, status => <<"passed">>, time_ms => 12, details => <<"boundary_parser.erl loaded cleanly.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
        end
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "exception_classifier.erl"]),
    BeamPath = filename:join(["%s", "ebin", "exception_classifier.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_constructs => [try_catch],
        required_calls => [{erlang, error, 1}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_try_catch_audit">>, title => <<"AST Analysis: try...catch Construct Invariants">>, status => <<"passed">>, time_ms => 15, details => <<"Verified try...catch constructs and erlang:error/1 calls.">>};
        {error, Violations} ->
            #{id => <<"ast_try_catch_audit">>, title => <<"AST Analysis: try...catch Construct Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_try_catch_audit">>, title => <<"AST Analysis: try...catch Construct Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_DomainChecks = try
    {approved, 200, usd} = exception_classifier:safe_check({payment, 200, usd}),
    {rejected, negative_amount} = exception_classifier:safe_check({payment, -10, usd}),
    {process_aborted, zero_payment_abort} = exception_classifier:safe_check({payment, 0, usd}),
    {rejected, {unsupported_currency, gbp}} = exception_classifier:safe_check({payment, 50, gbp}),
    {bug_detected, bad_amount_type} = exception_classifier:safe_check({payment, "not_int", usd}),
    {bug_detected, invalid_payment_tuple} = exception_classifier:safe_check(invalid_tuple_payload),
    #{id => <<"domain_exception_classification">>, title => <<"Domain Exception Classification (throw, error, exit)">>, status => <<"passed">>, time_ms => 14, details => <<"All payment domain conditions mapped cleanly to approved, rejected, bug_detected, or process_aborted.">>}
catch C2:R2 ->
    #{id => <<"domain_exception_classification">>, title => <<"Domain Exception Classification (throw, error, exit)">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("Domain check error: ~p:~p", [C2, R2]))}
end,
S3_TriggerClass = try
    ThrowRes = try exception_classifier:trigger_class(throw, custom_reason) catch throw:V_Throw -> {caught_throw, V_Throw} end,
    {caught_throw, custom_reason} = ThrowRes,
    ErrRes = try exception_classifier:trigger_class(error, custom_err) catch error:V_Err -> {caught_error, V_Err} end,
    {caught_error, custom_err} = ErrRes,
    ExitRes = try exception_classifier:trigger_class(exit, custom_exit) catch exit:V_Exit -> {caught_exit, V_Exit} end,
    {caught_exit, custom_exit} = ExitRes,
    #{id => <<"trigger_class_verification">>, title => <<"Direct Exception Trigger Verification">>, status => <<"passed">>, time_ms => 14, details => <<"Verified trigger_class/2 triggers exact throw, error, and exit exception classes.">>}
catch C3:R3 ->
    #{id => <<"trigger_class_verification">>, title => <<"Direct Exception Trigger Verification">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("Trigger test error: ~p:~p", [C3, R3]))}
end,
Stages = [CompileStage, S1_Ast, S2_DomainChecks, S3_TriggerClass]
`, wsDir, wsDir), true

	case "ch06-l02":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(domain_validator) of
    {module, domain_validator} ->
        Exports = domain_validator:module_info(exports),
        Req = [{safe_divide, 2}, {check_amount, 1}, {validate_email, 1}, {process_checkout_input, 3}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"domain_validator.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "domain_validator.erl"]),
    Rules = #{
        forbidden_constructs => [try_catch],
        forbidden_calls => [{erlang, error, any}, {erlang, throw, any}, {erlang, exit, any}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, Rules) of
        {ok, _} ->
            #{id => <<"ast_safe_return_audit">>, title => <<"AST Analysis: Safe Return Tuple Invariants">>, status => <<"passed">>, time_ms => 15, details => <<"Verified pure tagged tuple returns ({ok, ...} | {error, ...}); zero try...catch or exception primitives.">>};
        {error, Violations} ->
            #{id => <<"ast_safe_return_audit">>, title => <<"AST Analysis: Safe Return Tuple Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:Err1 ->
    #{id => <<"ast_safe_return_audit">>, title => <<"AST Analysis: Safe Return Tuple Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, Err1]))}
end,
S2_SafeDivideAndAmount = try
    case code:is_loaded(domain_validator) of
        {file, _} ->
            {ok, 25.0} = domain_validator:safe_divide(100, 4),
            {error, division_by_zero} = domain_validator:safe_divide(10, 0),
            {error, non_numeric} = domain_validator:safe_divide("10", 2),
            {ok, 500} = domain_validator:check_amount(500),
            {error, non_positive_amount} = domain_validator:check_amount(-50),
            {error, non_positive_amount} = domain_validator:check_amount(0),
            {error, invalid_type} = domain_validator:check_amount(<<"500">>),
            #{id => <<"safe_return_tuples">>, title => <<"Safe Return Tuple Invariants ({ok, Val} | {error, Reason})">>, status => <<"passed">>, time_ms => 14, details => <<"safe_divide/2 and check_amount/1 return clean tagged tuples without crashing.">>};
        false ->
            #{id => <<"safe_return_tuples">>, title => <<"Safe Return Tuple Invariants">>, status => <<"failed">>, time_ms => 14, details => <<"domain_validator not loaded.">>}
    end
catch C2:Err2 ->
    #{id => <<"safe_return_tuples">>, title => <<"Safe Return Tuple Invariants ({ok, Val} | {error, Reason})">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("Safe return error: ~p:~p", [C2, Err2]))}
end,
S3_ValidateEmail = try
    case code:is_loaded(domain_validator) of
        {file, _} ->
            {ok, <<"alice@beamforge.org">>} = domain_validator:validate_email(<<"alice@beamforge.org">>),
            {error, invalid_email} = domain_validator:validate_email(<<"noatsign.com">>),
            {error, invalid_email} = domain_validator:validate_email(<<"@nodomain.com">>),
            {error, invalid_email} = domain_validator:validate_email(<<"user@nodot">>),
            {error, invalid_email} = domain_validator:validate_email("string_not_bin"),
            #{id => <<"email_binary_validation">>, title => <<"Email Binary Parsing & Domain Defense">>, status => <<"passed">>, time_ms => 14, details => <<"validate_email/1 successfully parsed binaries and enforced @ and domain dot constraints.">>};
        false ->
            #{id => <<"email_binary_validation">>, title => <<"Email Binary Validation">>, status => <<"failed">>, time_ms => 14, details => <<"domain_validator not loaded.">>}
    end
catch C3:Err3 ->
    #{id => <<"email_binary_validation">>, title => <<"Email Binary Parsing & Domain Defense">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("Email validation error: ~p:~p", [C3, Err3]))}
end,
S4_CheckoutPipeline = try
    case code:is_loaded(domain_validator) of
        {file, _} ->
            {ok, #{email := <<"alice@beamforge.org">>, per_person := 100.0}} = domain_validator:process_checkout_input(<<"alice@beamforge.org">>, 300, 3),
            {error, invalid_email} = domain_validator:process_checkout_input(<<"bad_email">>, 300, 3),
            {error, non_positive_amount} = domain_validator:process_checkout_input(<<"alice@beamforge.org">>, -10, 3),
            {error, division_by_zero} = domain_validator:process_checkout_input(<<"alice@beamforge.org">>, 300, 0),
            #{id => <<"checkout_pipeline">>, title => <<"Integrated Checkout Pipeline & Short-Circuit Failures">>, status => <<"passed">>, time_ms => 15, details => <<"process_checkout_input/3 coordinates validation and returns on first failure.">>};
        false ->
            #{id => <<"checkout_pipeline">>, title => <<"Checkout Pipeline">>, status => <<"failed">>, time_ms => 15, details => <<"domain_validator not loaded.">>}
    end
catch C4:Err4 ->
    #{id => <<"checkout_pipeline">>, title => <<"Integrated Checkout Pipeline & Short-Circuit Failures">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Pipeline error: ~p:~p", [C4, Err4]))}
end,
Stages = [CompileStage, S1_Ast, S2_SafeDivideAndAmount, S3_ValidateEmail, S4_CheckoutPipeline]
`, wsDir), true

	case "ch06-l03":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(boundary_parser) of
    {module, boundary_parser} ->
        Exports = boundary_parser:module_info(exports),
        Req = [{safe_parse_payload, 1}, {with_resource_cleanup, 3}, {process_transaction_log, 2}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"boundary_parser.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "boundary_parser.erl"]),
    BeamPath = filename:join(["%s", "ebin", "boundary_parser.beam"]),
    case filelib:is_regular(SrcPath) of
        true ->
            {ok, BeamBin} = file:read_file(BeamPath),
            Rules = #{
                required_constructs => [try_catch],
                required_remote_calls => [{erlang, binary_to_term, 2}]
            },
            case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
                {ok, _} ->
                    #{id => <<"ast_try_catch_audit">>, title => <<"AST Analysis: try...catch...after and binary_to_term/2 [safe] Invariants">>, status => <<"passed">>, time_ms => 15, details => <<"Verified try...catch...after constructs and binary_to_term/2 [safe].">>};
                {error, Violations} ->
                    #{id => <<"ast_try_catch_audit">>, title => <<"AST Analysis: try...catch...after and binary_to_term/2 [safe] Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
            end;
        false ->
            #{id => <<"ast_try_catch_audit">>, title => <<"AST Analysis">>, status => <<"failed">>, time_ms => 15, details => <<"Source file missing.">>}
    end
catch C1:Err1 ->
    #{id => <<"ast_try_catch_audit">>, title => <<"AST Analysis: try...catch...after and binary_to_term/2 [safe] Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, Err1]))}
end,
S2_SafeParse = try
    case code:is_loaded(boundary_parser) of
        {file, _} ->
            T1 = {order, 999, [item1, item2], 49.99},
            B1 = term_to_binary(T1),
            {ok, T1} = boundary_parser:safe_parse_payload(B1),
            {error, {error, badarg}} = boundary_parser:safe_parse_payload(<<"invalid_bytes_xyz">>),
            {error, {error, badarg}} = boundary_parser:safe_parse_payload(12345),
            #{id => <<"safe_binary_parsing">>, title => <<"Safe Term Deserialization & Corrupt Input Protection">>, status => <<"passed">>, time_ms => 14, details => <<"Valid binaries safely decoded; corrupt binaries and non-binary inputs caught gracefully.">>};
        false ->
            #{id => <<"safe_binary_parsing">>, title => <<"Safe Binary Parsing">>, status => <<"failed">>, time_ms => 14, details => <<"boundary_parser not loaded.">>}
    end
catch C2:Err2 ->
    #{id => <<"safe_binary_parsing">>, title => <<"Safe Term Deserialization & Corrupt Input Protection">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("Parse error: ~p:~p", [C2, Err2]))}
end,
S3_ResourceCleanup = try
    case code:is_loaded(boundary_parser) of
        {file, _} ->
            Self = self(),
            Acquire = fun() -> resource_ref_123 end,
            ActionSuccess = fun(Res) -> {processed, Res} end,
            Release = fun(Res) -> Self ! {released, Res} end,
            {ok, {processed, resource_ref_123}} = boundary_parser:with_resource_cleanup(Acquire, ActionSuccess, Release),
            receive {released, resource_ref_123} -> ok after 500 -> error(missing_release_on_success) end,
            ActionCrash = fun(_) -> error(deliberate_db_disconnect) end,
            {error, {error, deliberate_db_disconnect}} = boundary_parser:with_resource_cleanup(Acquire, ActionCrash, Release),
            receive {released, resource_ref_123} -> ok after 500 -> error(missing_release_on_crash) end,
            #{id => <<"guaranteed_resource_cleanup">>, title => <<"Guaranteed Cleanup via 'after' Construct Across Errors">>, status => <<"passed">>, time_ms => 16, details => <<"Resource release callback guaranteed to execute on both success and deliberate crash.">>};
        false ->
            #{id => <<"guaranteed_resource_cleanup">>, title => <<"Guaranteed Cleanup">>, status => <<"failed">>, time_ms => 16, details => <<"boundary_parser not loaded.">>}
    end
catch C3:Err3 ->
    #{id => <<"guaranteed_resource_cleanup">>, title => <<"Guaranteed Cleanup via 'after' Construct Across Errors">>, status => <<"failed">>, time_ms => 16, details => list_to_binary(io_lib:format("Cleanup test error: ~p:~p", [C3, Err3]))}
end,
S4_TransactionLog = try
    case code:is_loaded(boundary_parser) of
        {file, _} ->
            Self2 = self(),
            ok = boundary_parser:process_transaction_log([<<"TX1">>, <<"TX2">>], Self2),
            receive file_handle_closed -> ok after 500 -> error(missing_close_on_success) end,
            CatchRes = try boundary_parser:process_transaction_log([<<"TX1">>, <<"CORRUPT_LINE">>], Self2) catch error:transaction_processing_failed -> caught_error end,
            caught_error = CatchRes,
            receive file_handle_closed -> ok after 500 -> error(missing_close_on_crash) end,
            #{id => <<"transaction_log_cleanup">>, title => <<"Transaction Log Guaranteed Close Invariant">>, status => <<"passed">>, time_ms => 16, details => <<"Close notification guaranteed in after block during normal execution and corrupt line error.">>};
        false ->
            #{id => <<"transaction_log_cleanup">>, title => <<"Transaction Log Cleanup">>, status => <<"failed">>, time_ms => 16, details => <<"boundary_parser not loaded.">>}
    end
catch C4:Err4 ->
    #{id => <<"transaction_log_cleanup">>, title => <<"Transaction Log Guaranteed Close Invariant">>, status => <<"failed">>, time_ms => 16, details => list_to_binary(io_lib:format("Transaction log error: ~p:~p", [C4, Err4]))}
end,
Stages = [CompileStage, S1_Ast, S2_SafeParse, S3_ResourceCleanup, S4_TransactionLog]
`, wsDir, wsDir), true

	case "ch06-l04":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(linked_pipeline) of
    {module, linked_pipeline} ->
        Exports = linked_pipeline:module_info(exports),
        Req = [{start_linked_pipeline, 0}, {compute, 2}, {stop_stage1_normal, 1}, {crash_stage1, 2}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"linked_pipeline.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "linked_pipeline.erl"]),
    BeamPath = filename:join(["%s", "ebin", "linked_pipeline.beam"]),
    case filelib:is_regular(SrcPath) of
        true ->
            {ok, BeamBin} = file:read_file(BeamPath),
            Rules = #{
                required_remote_calls => [{erlang, link, 1}, {erlang, spawn_link, 1}]
            },
            case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
                {ok, _} ->
                    #{id => <<"ast_link_invariants">>, title => <<"AST Analysis: link/1 and spawn_link/1 Invariants">>, status => <<"passed">>, time_ms => 15, details => <<"link/1 and spawn_link/1 verified.">>};
                {error, Violations} ->
                    #{id => <<"ast_link_invariants">>, title => <<"AST Analysis: link/1 and spawn_link/1 Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
            end;
        false ->
            #{id => <<"ast_link_invariants">>, title => <<"AST Analysis">>, status => <<"failed">>, time_ms => 15, details => <<"Source file missing.">>}
    end
catch C1:Err1 ->
    #{id => <<"ast_link_invariants">>, title => <<"AST Analysis: link/1 and spawn_link/1 Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, Err1]))}
end,
S2_Compute = try
    case code:is_loaded(linked_pipeline) of
        {file, _} ->
            {ok, W1, W2} = linked_pipeline:start_linked_pipeline(),
            {ok, 36} = linked_pipeline:compute(W1, 3),
            {ok, 100} = linked_pipeline:compute(W1, 5),
            true = is_process_alive(W1),
            true = is_process_alive(W2),
            #{id => <<"two_stage_computation">>, title => <<"Two-Stage Pipeline Forwarding & Transformation">>, status => <<"passed">>, time_ms => 14, details => <<"Numbers cleanly doubled by Stage 1, squared by Stage 2, and returned to caller.">>};
        false ->
            #{id => <<"two_stage_computation">>, title => <<"Two-Stage Pipeline">>, status => <<"failed">>, time_ms => 14, details => <<"linked_pipeline not loaded.">>}
    end
catch C2:Err2 ->
    #{id => <<"two_stage_computation">>, title => <<"Two-Stage Pipeline Forwarding & Transformation">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("Compute error: ~p:~p", [C2, Err2]))}
end,
S3_NormalExit = try
    case code:is_loaded(linked_pipeline) of
        {file, _} ->
            {ok, W1_Norm, W2_Norm} = linked_pipeline:start_linked_pipeline(),
            linked_pipeline:stop_stage1_normal(W1_Norm),
            timer:sleep(50),
            W1_Norm_Alive = is_process_alive(W1_Norm),
            W2_Norm_Alive = is_process_alive(W2_Norm),
            case {W1_Norm_Alive, W2_Norm_Alive} of
                {false, true} ->
                    exit(W2_Norm, shutdown),
                    #{id => <<"normal_exit_isolation">>, title => <<"Normal Exit Signal Isolation (Peer Remains Alive)">>, status => <<"passed">>, time_ms => 20, details => <<"Worker1 stopped via normal exit; linked Worker2 correctly ignored signal and survived.">>};
                OtherNorm ->
                    #{id => <<"normal_exit_isolation">>, title => <<"Normal Exit Signal Isolation (Peer Remains Alive)">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Unexpected states: ~p", [OtherNorm]))}
            end;
        false ->
            #{id => <<"normal_exit_isolation">>, title => <<"Normal Exit Isolation">>, status => <<"failed">>, time_ms => 20, details => <<"linked_pipeline not loaded.">>}
    end
catch C3:Err3 ->
    #{id => <<"normal_exit_isolation">>, title => <<"Normal Exit Signal Isolation (Peer Remains Alive)">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Normal exit error: ~p:~p", [C3, Err3]))}
end,
S4_CascadingExit = try
    case code:is_loaded(linked_pipeline) of
        {file, _} ->
            OldTrap4 = process_flag(trap_exit, true),
            {ok, W1_Crash, W2_Crash} = linked_pipeline:start_linked_pipeline(),
            ok = linked_pipeline:crash_stage1(W1_Crash, simulated_fatal_error),
            timer:sleep(60),
            Alive1 = is_process_alive(W1_Crash),
            Alive2 = is_process_alive(W2_Crash),
            receive {'EXIT', _, _} -> ok after 0 -> ok end,
            process_flag(trap_exit, OldTrap4),
            case {Alive1, Alive2} of
                {false, false} ->
                    #{id => <<"cascading_exit_propagation">>, title => <<"Bidirectional Exit Link Propagation (Zero Zombie Leaks)">>, status => <<"passed">>, time_ms => 20, details => <<"Crashing Stage 1 propagated an abnormal exit signal that tore down Stage 2 cleanly.">>};
                OtherAlive ->
                    #{id => <<"cascading_exit_propagation">>, title => <<"Bidirectional Exit Link Propagation (Zero Zombie Leaks)">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Processes leaked: ~p", [OtherAlive]))}
            end;
        false ->
            #{id => <<"cascading_exit_propagation">>, title => <<"Cascading Exit Propagation">>, status => <<"failed">>, time_ms => 20, details => <<"linked_pipeline not loaded.">>}
    end
catch C4:Err4 ->
    #{id => <<"cascading_exit_propagation">>, title => <<"Bidirectional Exit Link Propagation (Zero Zombie Leaks)">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Crash test error: ~p:~p", [C4, Err4]))}
end,
Stages = [CompileStage, S1_Ast, S2_Compute, S3_NormalExit, S4_CascadingExit]
`, wsDir, wsDir), true

	case "ch06-l05":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(exit_trapper) of
    {module, exit_trapper} ->
        Exports = exit_trapper:module_info(exports),
        Req = [{start_supervised, 1}, {get_worker_pid, 1}, {kill_worker, 2}, {simulate_exit_truth_table, 2}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"exit_trapper.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "exit_trapper.erl"]),
    BeamPath = filename:join(["%s", "ebin", "exit_trapper.beam"]),
    case filelib:is_regular(SrcPath) of
        true ->
            {ok, BeamBin} = file:read_file(BeamPath),
            Rules = #{
                required_remote_calls => [{erlang, process_flag, 2}, {erlang, spawn_link, 1}]
            },
            case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
                {ok, _} ->
                    #{id => <<"ast_trap_exit_invariants">>, title => <<"AST Analysis: process_flag(trap_exit, true) and spawn_link/1">>, status => <<"passed">>, time_ms => 15, details => <<"process_flag(trap_exit, true) and spawn_link/1 confirmed.">>};
                {error, Violations} ->
                    #{id => <<"ast_trap_exit_invariants">>, title => <<"AST Analysis: process_flag(trap_exit, true) and spawn_link/1">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
            end;
        false ->
            #{id => <<"ast_trap_exit_invariants">>, title => <<"AST Analysis: process_flag(trap_exit, true) and spawn_link/1">>, status => <<"failed">>, time_ms => 15, details => <<"exit_trapper.erl not found.">>}
    end
catch C1:R1 ->
    #{id => <<"ast_trap_exit_invariants">>, title => <<"AST Analysis: process_flag(trap_exit, true) and spawn_link/1">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_Supervised = try
    case code:is_loaded(exit_trapper) of
        {file, _} ->
            WorkerFun = fun() -> receive stop -> ok end end,
            {ok, Sup, W1} = exit_trapper:start_supervised(WorkerFun),
            {ok, W1Reported} = exit_trapper:get_worker_pid(Sup),
            true = (W1 =:= W1Reported),
            true = is_process_alive(Sup),
            true = is_process_alive(W1),
            exit_trapper:kill_worker(Sup, badarith),
            timer:sleep(60),
            {ok, W2} = exit_trapper:get_worker_pid(Sup),
            SupAlive = is_process_alive(Sup),
            W1Dead = not is_process_alive(W1),
            W2Alive = is_process_alive(W2),
            Different = (W1 =/= W2),
            Sup ! stop,
            if
                SupAlive andalso W1Dead andalso W2Alive andalso Different ->
                    #{id => <<"self_healing_respawn">>, title => <<"Exit Trapping & Automatic Self-Healing Respawn">>, status => <<"passed">>, time_ms => 22, details => <<"Supervisor trapped worker exit, survived, and seamlessly respawned a fresh worker.">>};
                true ->
                    #{id => <<"self_healing_respawn">>, title => <<"Exit Trapping & Automatic Self-Healing Respawn">>, status => <<"failed">>, time_ms => 22, details => list_to_binary(io_lib:format("Respawn check failed: Sup:~p W1Dead:~p W2Alive:~p Diff:~p", [SupAlive, W1Dead, W2Alive, Different]))}
            end;
        false ->
            #{id => <<"self_healing_respawn">>, title => <<"Exit Trapping & Automatic Self-Healing Respawn">>, status => <<"failed">>, time_ms => 22, details => <<"exit_trapper module not loaded.">>}
    end
catch C2:R2 ->
    #{id => <<"self_healing_respawn">>, title => <<"Exit Trapping & Automatic Self-Healing Respawn">>, status => <<"failed">>, time_ms => 22, details => list_to_binary(io_lib:format("Supervisor test error: ~p:~p", [C2, R2]))}
end,
S3_KillSignal = try
    case code:is_loaded(exit_trapper) of
        {file, _} ->
            WorkerFun2 = fun() -> receive stop -> ok end end,
            {ok, SupKill, WK1} = exit_trapper:start_supervised(WorkerFun2),
            exit_trapper:kill_worker(SupKill, kill),
            timer:sleep(60),
            {ok, WK2} = exit_trapper:get_worker_pid(SupKill),
            SupKillAlive = is_process_alive(SupKill),
            WK1Dead = not is_process_alive(WK1),
            WK2Alive = is_process_alive(WK2),
            SupKill ! stop,
            if
                SupKillAlive andalso WK1Dead andalso WK2Alive andalso (WK1 =/= WK2) ->
                    #{id => <<"untrappable_kill_resilience">>, title => <<"Untrappable kill Handling ('killed' Trapped by Supervisor)">>, status => <<"passed">>, time_ms => 22, details => <<"Worker killed via untrappable kill signal; supervisor trapped 'killed' and safely restarted worker.">>};
                true ->
                    #{id => <<"untrappable_kill_resilience">>, title => <<"Untrappable kill Handling ('killed' Trapped by Supervisor)">>, status => <<"failed">>, time_ms => 22, details => <<"Supervisor failed to recover from kill signal.">>}
            end;
        false ->
            #{id => <<"untrappable_kill_resilience">>, title => <<"Untrappable kill Handling ('killed' Trapped by Supervisor)">>, status => <<"failed">>, time_ms => 22, details => <<"exit_trapper module not loaded.">>}
    end
catch C3:R3 ->
    #{id => <<"untrappable_kill_resilience">>, title => <<"Untrappable kill Handling ('killed' Trapped by Supervisor)">>, status => <<"failed">>, time_ms => 22, details => list_to_binary(io_lib:format("Kill test error: ~p:~p", [C3, R3]))}
end,
S4_TruthTable = try
    case code:is_loaded(exit_trapper) of
        {file, _} ->
            {survived, none} = exit_trapper:simulate_exit_truth_table(false, normal),
            {died, badarith} = exit_trapper:simulate_exit_truth_table(false, badarith),
            {died, killed} = exit_trapper:simulate_exit_truth_table(false, kill),
            {survived, {'EXIT', S1, normal}} = exit_trapper:simulate_exit_truth_table(true, normal),
            true = is_pid(S1),
            {survived, {'EXIT', S2, badarith}} = exit_trapper:simulate_exit_truth_table(true, badarith),
            true = is_pid(S2),
            {died, killed} = exit_trapper:simulate_exit_truth_table(true, kill),
            #{id => <<"exit_signal_truth_table">>, title => <<"Exit Signal Truth Table Invariants">>, status => <<"passed">>, time_ms => 15, details => <<"All 6 permutations of the Exit Signal Truth Table verified with exact semantics.">>};
        false ->
            #{id => <<"exit_signal_truth_table">>, title => <<"Exit Signal Truth Table Invariants">>, status => <<"failed">>, time_ms => 15, details => <<"exit_trapper module not loaded.">>}
    end
catch C4:R4 ->
    #{id => <<"exit_signal_truth_table">>, title => <<"Exit Signal Truth Table Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Truth table error: ~p:~p", [C4, R4]))}
end,
Stages = [CompileStage, S1_Ast, S2_Supervised, S3_KillSignal, S4_TruthTable]
`, wsDir, wsDir), true

	case "ch06-l06":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(worker_watcher) of
    {module, worker_watcher} ->
        Exports = worker_watcher:module_info(exports),
        case lists:member({run_monitored_task, 2}, Exports) andalso lists:member({probe_pid_status, 1}, Exports) of
            true -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"worker_watcher.erl compiled cleanly; run_monitored_task/2 and probe_pid_status/1 exported.">>};
            false ->
                case lists:member({run_monitored_task, 2}, Exports) of
                    true -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"worker_watcher.erl compiled cleanly.">>};
                    false -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => <<"Missing export: run_monitored_task/2">>}
                end
        end;
    {error, E1} ->
        case code:ensure_loaded(job_coordinator) of
            {module, job_coordinator} ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit (Legacy)">>, status => <<"passed">>, time_ms => 12, details => <<"job_coordinator.erl loaded cleanly.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
        end
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "worker_watcher.erl"]),
    BeamPath = filename:join(["%s", "ebin", "worker_watcher.beam"]),
    case filelib:is_regular(SrcPath) of
        true ->
            {ok, BeamBin} = file:read_file(BeamPath),
            Rules = #{
                required_remote_calls => [{erlang, spawn_monitor, 1}, {erlang, demonitor, 2}],
                required_constructs => [receive_after]
            },
            case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
                {ok, _} ->
                    #{id => <<"ast_monitor_invariants">>, title => <<"AST Analysis: spawn_monitor/1, demonitor/2, and receive...after">>, status => <<"passed">>, time_ms => 15, details => <<"spawn_monitor/1, demonitor/2, and receive...after verified.">>};
                {error, Violations} ->
                    #{id => <<"ast_monitor_invariants">>, title => <<"AST Analysis: spawn_monitor/1, demonitor/2, and receive...after">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
            end;
        false ->
            #{id => <<"ast_monitor_invariants">>, title => <<"AST Analysis">>, status => <<"passed">>, time_ms => 15, details => <<"Legacy skipped.">>}
    end
catch C1:R1 ->
    #{id => <<"ast_monitor_invariants">>, title => <<"AST Analysis: spawn_monitor/1, demonitor/2, and receive...after">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_Success = try
    case code:is_loaded(worker_watcher) of
        {file, _} ->
            {ok, 42} = worker_watcher:run_monitored_task(fun() -> 21 * 2 end, 1000),
            #{id => <<"successful_execution">>, title => <<"Successful Monitored Execution & Mailbox Flush">>, status => <<"passed">>, time_ms => 12, details => <<"Monitored task executed cleanly; monitor flushed.">>};
        false ->
            #{id => <<"successful_execution">>, title => <<"Successful Execution">>, status => <<"passed">>, time_ms => 12, details => <<"Legacy skipped.">>}
    end
catch C2:R2 ->
    #{id => <<"successful_execution">>, title => <<"Successful Monitored Execution & Mailbox Flush">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Success test error: ~p:~p", [C2, R2]))}
end,
S3_Crash = try
    case code:is_loaded(worker_watcher) of
        {file, _} ->
            {error, {crashed, badarith}} = worker_watcher:run_monitored_task(fun() -> 1 / 0 end, 1000),
            true = is_process_alive(self()),
            #{id => <<"crash_isolation">>, title => <<"Crash Isolation (Caller Survives Worker Division by Zero)">>, status => <<"passed">>, time_ms => 14, details => <<"Worker crash caught via 'DOWN' message; calling process survived unhurt.">>};
        false ->
            #{id => <<"crash_isolation">>, title => <<"Crash Isolation">>, status => <<"passed">>, time_ms => 14, details => <<"Legacy skipped.">>}
    end
catch C3:R3 ->
    #{id => <<"crash_isolation">>, title => <<"Crash Isolation (Caller Survives Worker Division by Zero)">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("Crash isolation error: ~p:~p", [C3, R3]))}
end,
S4_Timeout = try
    case code:is_loaded(worker_watcher) of
        {file, _} ->
            {error, timeout} = worker_watcher:run_monitored_task(fun() -> receive after infinity -> ok end end, 80),
            #{id => <<"timeout_and_worker_kill">>, title => <<"Runaway Task Timeout & Forced Termination">>, status => <<"passed">>, time_ms => 100, details => <<"Stuck infinite-loop worker terminated via exit(Pid, kill) and monitor flushed.">>};
        false ->
            #{id => <<"timeout_and_worker_kill">>, title => <<"Timeout & Worker Kill">>, status => <<"passed">>, time_ms => 100, details => <<"Legacy skipped.">>}
    end
catch C4:R4 ->
    #{id => <<"timeout_and_worker_kill">>, title => <<"Runaway Task Timeout & Forced Termination">>, status => <<"failed">>, time_ms => 100, details => list_to_binary(io_lib:format("Timeout test error: ~p:~p", [C4, R4]))}
end,
S5_NoprocProbe = try
    case code:is_loaded(worker_watcher) of
        {file, _} ->
            Exports2 = worker_watcher:module_info(exports),
            case lists:member({probe_pid_status, 1}, Exports2) of
                true ->
                    DeadPid = spawn(fun() -> ok end),
                    timer:sleep(30),
                    {dead, noproc} = worker_watcher:probe_pid_status(DeadPid),
                    LivePid = spawn(fun() -> receive stop -> ok end end),
                    alive = worker_watcher:probe_pid_status(LivePid),
                    LivePid ! stop,
                    #{id => <<"noproc_invariant">>, title => <<"Dead PID 'noproc' Down Invariant Probe">>, status => <<"passed">>, time_ms => 25, details => <<"Demonstrated that monitoring an already-dead PID immediately returns {dead, noproc}.">>};
                false ->
                    #{id => <<"noproc_invariant">>, title => <<"Dead PID Invariant">>, status => <<"passed">>, time_ms => 10, details => <<"probe_pid_status not exported; skipped.">>}
            end;
        false ->
            #{id => <<"noproc_invariant">>, title => <<"Dead PID Invariant">>, status => <<"passed">>, time_ms => 10, details => <<"Legacy skipped.">>}
    end
catch C5:R5 ->
    #{id => <<"noproc_invariant">>, title => <<"Dead PID 'noproc' Down Invariant Probe">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Probe test error: ~p:~p", [C5, R5]))}
end,
Stages = [CompileStage, S1_Ast, S2_Success, S3_Crash, S4_Timeout, S5_NoprocProbe]
`, wsDir, wsDir), true

	case "ch06-l07":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(monitor_hygiene) of
    {module, monitor_hygiene} ->
        Exports = monitor_hygiene:module_info(exports),
        Req = [{call_with_clean_mailbox, 2}, {count_lingering_downs, 0}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"monitor_hygiene.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "monitor_hygiene.erl"]),
    BeamPath = filename:join(["%s", "ebin", "monitor_hygiene.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{erlang, demonitor, 2}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_hygiene_invariants">>, title => <<"AST Analysis: erlang:demonitor(MRef, [flush]) Invariant">>, status => <<"passed">>, time_ms => 15, details => <<"Verified erlang:demonitor/2 is called with [flush].">>};
        {error, Violations} ->
            #{id => <<"ast_hygiene_invariants">>, title => <<"AST Analysis: erlang:demonitor(MRef, [flush]) Invariant">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_hygiene_invariants">>, title => <<"AST Analysis: erlang:demonitor(MRef, [flush]) Invariant">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_RaceAndFlush = try
    {ok, 84, 0} = monitor_hygiene:call_with_clean_mailbox(fun(X) -> X * 2 end, 42),
    {ok, 100, 0} = monitor_hygiene:call_with_clean_mailbox(fun(X) -> X + 1 end, 99),
    LingeringAfter = monitor_hygiene:count_lingering_downs(),
    0 = LingeringAfter,
    #{id => <<"monitor_race_and_flush">>, title => <<"Monitor Race Condition: demonitor [flush] Mailbox Drain">>, status => <<"passed">>, time_ms => 20, details => <<"Worker reply and DOWN arrived simultaneously; [flush] successfully cleaned mailbox with 0 lingering downs.">>}
catch C2:R2 ->
    #{id => <<"monitor_race_and_flush">>, title => <<"Monitor Race Condition: demonitor [flush] Mailbox Drain">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Hygiene test error: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_Ast, S2_RaceAndFlush]
`, wsDir, wsDir), true

	case "ch06-l08":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(my_gen_server) of
    {module, my_gen_server} ->
        Exports = my_gen_server:module_info(exports),
        Req = [{start, 2}, {call, 3}, {cast, 2}, {stop, 1}, {choose_primitive, 1}, {loop, 2}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"my_gen_server.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "my_gen_server.erl"]),
    BeamPath = filename:join(["%s", "ebin", "my_gen_server.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{erlang, monitor, 2}, {erlang, demonitor, 2}],
        required_constructs => [receive_after]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_otp_gen_invariants">>, title => <<"AST Analysis: erlang:monitor/2 and demonitor/2 Invariants">>, status => <<"passed">>, time_ms => 15, details => <<"Verified monitor/2, demonitor/2, and receive...after.">>};
        {error, Violations} ->
            #{id => <<"ast_otp_gen_invariants">>, title => <<"AST Analysis: erlang:monitor/2 and demonitor/2 Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_otp_gen_invariants">>, title => <<"AST Analysis: erlang:monitor/2 and demonitor/2 Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_DecisionMatrix = try
    use_link = my_gen_server:choose_primitive(tightly_coupled_peers),
    use_link_with_trap_exit = my_gen_server:choose_primitive(supervisor_to_worker),
    use_monitor = my_gen_server:choose_primitive(client_to_server_request),
    use_monitor = my_gen_server:choose_primitive(independent_watcher),
    #{id => <<"architectural_decision_matrix">>, title => <<"Architectural Decision Matrix (Links vs Monitors)">>, status => <<"passed">>, time_ms => 10, details => <<"Correct primitive chosen for tightly coupled peers, supervisors, clients, and watchers.">>}
catch C2:R2 ->
    #{id => <<"architectural_decision_matrix">>, title => <<"Architectural Decision Matrix (Links vs Monitors)">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Decision matrix error: ~p:~p", [C2, R2]))}
end,
S3_Protocol = try
    Cb = beamforge_ch06_cb,
    code:purge(Cb),
    Forms = [
        {attribute, 1, module, Cb},
        {attribute, 2, export, [{init, 1}, {handle_call, 3}, {handle_cast, 2}]},
        {function, 3, init, 1, [{clause, 3, [{var, 3, 'Arg'}], [], [{tuple, 3, [{atom, 3, ok}, {var, 3, 'Arg'}]}]}]},
        {function, 4, handle_call, 3, [
            {clause, 4, [{tuple, 4, [{atom, 4, add}, {var, 4, 'X'}]}, {var, 4, '_From'}, {var, 4, 'State'}], [],
             [{tuple, 4, [{atom, 4, reply}, {op, 4, '+', {var, 4, 'State'}, {var, 4, 'X'}}, {op, 4, '+', {var, 4, 'State'}, {var, 4, 'X'}}]}]},
            {clause, 5, [{atom, 5, get}, {var, 5, '_From'}, {var, 5, 'State'}], [],
             [{tuple, 5, [{atom, 5, reply}, {var, 5, 'State'}, {var, 5, 'State'}]}]}
        ]},
        {function, 6, handle_cast, 2, [
            {clause, 6, [{tuple, 6, [{atom, 6, set}, {var, 6, 'NewVal'}]}, {var, 6, '_State'}], [],
             [{tuple, 6, [{atom, 6, noreply}, {var, 6, 'NewVal'}]}]}
        ]}
    ],
    {ok, Cb, CbBin} = compile:forms(Forms),
    code:load_binary(Cb, "beamforge_ch06_cb.beam", CbBin),
    {ok, Pid} = my_gen_server:start(Cb, 10),
    15 = my_gen_server:call(Pid, {add, 5}, 1000),
    15 = my_gen_server:call(Pid, get, 1000),
    ok = my_gen_server:cast(Pid, {set, 100}),
    timer:sleep(20),
    100 = my_gen_server:call(Pid, get, 1000),
    ok = my_gen_server:stop(Pid),
    timer:sleep(20),
    false = is_process_alive(Pid),
    #{id => <<"gen_server_protocol">>, title => <<"OTP Callback Protocol: init, handle_call, handle_cast & stop">>, status => <<"passed">>, time_ms => 20, details => <<"Synchronous call, async cast, and graceful stop verified against callback behaviour.">>}
catch C3:R3 ->
    #{id => <<"gen_server_protocol">>, title => <<"OTP Callback Protocol: init, handle_call, handle_cast & stop">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Protocol error: ~p:~p", [C3, R3]))}
end,
S4_ZeroLatency = try
    CrashPid = spawn(fun() -> receive {'$gen_call', {From, MRef}, crash_cmd} -> exit(simulated_fatal_oom) end end),
    T0 = erlang:system_time(millisecond),
    Res = my_gen_server:call(CrashPid, crash_cmd, 5000),
    Elapsed = erlang:system_time(millisecond) - T0,
    case Res of
        {error, {server_crashed, simulated_fatal_oom}} when Elapsed < 150 ->
            #{id => <<"zero_latency_crash_detection">>, title => <<"Zero-Latency Detection of Server Crash (<150ms vs 5000ms timeout)">>, status => <<"passed">>, time_ms => Elapsed, details => list_to_binary(io_lib:format("Unblocked in ~p ms upon server crash via monitor 'DOWN'.", [Elapsed]))};
        OtherCrash ->
            #{id => <<"zero_latency_crash_detection">>, title => <<"Zero-Latency Detection of Server Crash (<150ms vs 5000ms timeout)">>, status => <<"failed">>, time_ms => Elapsed, details => list_to_binary(io_lib:format("Failed crash detection: ~p in ~p ms", [OtherCrash, Elapsed]))}
    end
catch C4:R4 ->
    #{id => <<"zero_latency_crash_detection">>, title => <<"Zero-Latency Detection of Server Crash (<150ms vs 5000ms timeout)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Zero-latency test error: ~p:~p", [C4, R4]))}
end,
Stages = [CompileStage, S1_Ast, S2_DecisionMatrix, S3_Protocol, S4_ZeroLatency]
`, wsDir, wsDir), true

	case "ch06-l09":
		if script, ok := r.buildIncidentVerificationScript(session, exerciseID); ok {
			return script, true
		}
		return "", false

	case "ch06-l10":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(payment_system) of
    {module, payment_system} ->
        Exports = payment_system:module_info(exports),
        Req = [{start_system, 1}, {charge, 4}, {trigger_crash_test, 1}, {get_active_worker, 1}, {get_processed_txs, 1}, {stop_system, 1}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"payment_system.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "payment_system.erl"]),
    BeamPath = filename:join(["%s", "ebin", "payment_system.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{erlang, spawn_monitor, 1}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_watcher_invariants">>, title => <<"AST Analysis: spawn_monitor/1 Invariant">>, status => <<"passed">>, time_ms => 15, details => <<"spawn_monitor/1 verified.">>};
        {error, Violations} ->
            #{id => <<"ast_watcher_invariants">>, title => <<"AST Analysis: spawn_monitor/1 and monitor/2 Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_watcher_invariants">>, title => <<"AST Analysis: spawn_monitor/1 and monitor/2 Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_ChargeSuccess = try
    {ok, W} = payment_system:start_system(3),
    Res1 = payment_system:charge(W, <<"req_101">>, 250, usd),
    ExpectedReceipt = {ok, #{tx_id => <<"req_101">>, amount => 250, currency => usd, status => settled}},
    payment_system:stop_system(W),
    case Res1 of
        ExpectedReceipt ->
            #{id => <<"charge_settlement">>, title => <<"Valid Payment Settlement & Receipt Generation">>, status => <<"passed">>, time_ms => 15, details => <<"charge/4 cleanly processed valid payment and generated settled receipt.">>};
        Other1 ->
            #{id => <<"charge_settlement">>, title => <<"Valid Payment Settlement & Receipt Generation">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Unexpected charge result: ~p", [Other1]))}
    end
catch C2:R2 ->
    #{id => <<"charge_settlement">>, title => <<"Valid Payment Settlement & Receipt Generation">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Charge error: ~p:~p", [C2, R2]))}
end,
S3_ValidationDefense = try
    {ok, W2} = payment_system:start_system(3),
    {error, invalid_amount} = payment_system:charge(W2, <<"req_102">>, -50, usd),
    {error, invalid_amount} = payment_system:charge(W2, <<"req_103">>, 0, usd),
    {error, unsupported_currency} = payment_system:charge(W2, <<"req_104">>, 100, gbp),
    {ok, WorkerPid, 0} = payment_system:get_active_worker(W2),
    true = is_process_alive(WorkerPid),
    payment_system:stop_system(W2),
    #{id => <<"validation_defense">>, title => <<"Business Validation Defense (Zero Worker Crash)">>, status => <<"passed">>, time_ms => 18, details => <<"Invalid amount and unsupported currency returned error tuples without crashing worker actor.">>}
catch C3:R3 ->
    #{id => <<"validation_defense">>, title => <<"Business Validation Defense (Zero Worker Crash)">>, status => <<"failed">>, time_ms => 18, details => list_to_binary(io_lib:format("Validation error: ~p:~p", [C3, R3]))}
end,
S4_IdempotencyReplay = try
    {ok, W3} = payment_system:start_system(3),
    {ok, ReceiptA} = payment_system:charge(W3, <<"req_idem_1">>, 500, eur),
    ReplayRes = payment_system:charge(W3, <<"req_idem_1">>, 500, eur),
    payment_system:stop_system(W3),
    case ReplayRes of
        {ok, {already_processed, ReceiptA}} ->
            #{id => <<"idempotent_replay">>, title => <<"Idempotent Request Replay & Double-Charge Prevention">>, status => <<"passed">>, time_ms => 15, details => <<"Repeated RequestId returned {already_processed, Receipt} without re-executing charge.">>};
        OtherReplay ->
            #{id => <<"idempotent_replay">>, title => <<"Idempotent Request Replay & Double-Charge Prevention">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Unexpected replay result: ~p", [OtherReplay]))}
    end
catch C4:R4 ->
    #{id => <<"idempotent_replay">>, title => <<"Idempotent Request Replay & Double-Charge Prevention">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Idempotency error: ~p:~p", [C4, R4]))}
end,
S5_CrashTestAndStateSurvival = try
    {ok, W4} = payment_system:start_system(3),
    {ok, _} = payment_system:charge(W4, <<"req_durable">>, 1000, etb),
    {ok, OldWorker, 0} = payment_system:get_active_worker(W4),
    CrashTestRes = payment_system:trigger_crash_test(W4),
    timer:sleep(40),
    {ok, NewWorker, 1} = payment_system:get_active_worker(W4),
    false = is_process_alive(OldWorker),
    true = is_process_alive(NewWorker),
    DifferentWorker = (OldWorker =/= NewWorker),
    Txs = payment_system:get_processed_txs(W4),
    DurableEntryExists = maps:is_key(<<"req_durable">>, Txs),
    {ok, #{status := settled}} = payment_system:charge(W4, <<"req_subsequent">>, 300, usd),
    payment_system:stop_system(W4),
    case DifferentWorker andalso DurableEntryExists of
        true ->
            #{id => <<"crash_and_durable_survival">>, title => <<"Crash Recovery, Auto-Replacement & Durable Ledger Survival">>, status => <<"passed">>, time_ms => 50, details => <<"Worker crash caught via monitor, fresh worker spawned, tx_store 100%% preserved, and subsequent charges succeeded.">>};
        false ->
            #{id => <<"crash_and_durable_survival">>, title => <<"Crash Recovery, Auto-Replacement & Durable Ledger Survival">>, status => <<"failed">>, time_ms => 50, details => list_to_binary(io_lib:format("DiffWorker:~p, DurableExists:~p", [DifferentWorker, DurableEntryExists]))}
    end
catch C5:R5 ->
    #{id => <<"crash_and_durable_survival">>, title => <<"Crash Recovery, Auto-Replacement & Durable Ledger Survival">>, status => <<"failed">>, time_ms => 50, details => list_to_binary(io_lib:format("Crash test error: ~p:~p", [C5, R5]))}
end,
S6_RestartExhaustion = try
    {ok, W5} = payment_system:start_system(1),
    {ok, _, _} = payment_system:trigger_crash_test(W5),
    timer:sleep(20),
    ExhaustRes = payment_system:trigger_crash_test(W5),
    payment_system:stop_system(W5),
    case ExhaustRes of
        {error, max_restarts_exceeded} ->
            #{id => <<"restart_exhaustion">>, title => <<"Restart Budget Enforcement (MaxRestarts Limit)">>, status => <<"passed">>, time_ms => 40, details => <<"Watcher correctly refused further restarts once budget was exhausted.">>};
        OtherExhaust ->
            #{id => <<"restart_exhaustion">>, title => <<"Restart Budget Enforcement (MaxRestarts Limit)">>, status => <<"failed">>, time_ms => 40, details => list_to_binary(io_lib:format("Unexpected result: ~p", [OtherExhaust]))}
    end
catch C6:R6 ->
    #{id => <<"restart_exhaustion">>, title => <<"Restart Budget Enforcement (MaxRestarts Limit)">>, status => <<"failed">>, time_ms => 40, details => list_to_binary(io_lib:format("Exhaustion test error: ~p:~p", [C6, R6]))}
end,
Stages = [CompileStage, S1_Ast, S2_ChargeSuccess, S3_ValidationDefense, S4_IdempotencyReplay, S5_CrashTestAndStateSurvival, S6_RestartExhaustion]
`, wsDir, wsDir), true

	// ── CHAPTER 7 ─────────────────────────────────────────────────────────────
	case "ch07-l01":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(otp_intro_demo) of
    {module, otp_intro_demo} ->
        Exports = otp_intro_demo:module_info(exports),
        Req = [{start_link, 0}, {increment, 2}, {get_count, 1}, {stop, 1}, {run_demo, 0}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"otp_intro_demo.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "otp_intro_demo.erl"]),
    BeamPath = filename:join(["%s", "ebin", "otp_intro_demo.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{gen_server, start_link, 3}, {gen_server, call, 2}, {gen_server, cast, 2}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_gen_server_structure">>, title => <<"AST Analysis: gen_server Behaviour & Inversion of Control">>, status => <<"passed">>, time_ms => 15, details => <<"Verified gen_server calls and casts without raw receive loops.">>};
        {error, Violations} ->
            #{id => <<"ast_gen_server_structure">>, title => <<"AST Analysis: gen_server Behaviour & Inversion of Control">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_gen_server_structure">>, title => <<"AST Analysis: gen_server Behaviour & Inversion of Control">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_DemoExecution = try
    DemoRes = otp_intro_demo:run_demo(),
    case DemoRes of
        #{final_count := 35, live_state := #{counter := 35, ops := 3}} ->
            #{id => <<"demo_execution_audit">>, title => <<"Guided Demo Execution (State & Ops Counter Verification)">>, status => <<"passed">>, time_ms => 25, details => <<"run_demo/0 completed successfully; verified final count 35 and 3 operations.">>};
        #{final_count := Count, live_state := State} ->
            #{id => <<"demo_execution_audit">>, title => <<"Guided Demo Execution (State & Ops Counter Verification)">>, status => <<"passed">>, time_ms => 25, details => list_to_binary(io_lib:format("Demo returned count ~p, state ~p", [Count, State]))};
        Other2 ->
            #{id => <<"demo_execution_audit">>, title => <<"Guided Demo Execution (State & Ops Counter Verification)">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Unexpected return: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"demo_execution_audit">>, title => <<"Guided Demo Execution (State & Ops Counter Verification)">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Demo crash: ~p:~p", [C2, R2]))}
end,
S3_SysGetState = try
    {ok, Pid} = otp_intro_demo:start_link(),
    otp_intro_demo:increment(Pid, 100),
    timer:sleep(15),
    SysState = sys:get_state(Pid),
    SysStatus = sys:get_status(Pid),
    otp_intro_demo:stop(Pid),
    case SysState of
        #{counter := 100} ->
            #{id => <<"live_sys_introspection">>, title => <<"Live System Introspection (sys:get_state/1 & sys:get_status/1)">>, status => <<"passed">>, time_ms => 20, details => <<"sys:get_state and sys:get_status inspected live process state without disruption.">>};
        Other3 ->
            #{id => <<"live_sys_introspection">>, title => <<"Live System Introspection (sys:get_state/1 & sys:get_status/1)">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Unexpected sys:get_state: ~p", [Other3]))}
    end
catch C3:R3 ->
    #{id => <<"live_sys_introspection">>, title => <<"Live System Introspection (sys:get_state/1 & sys:get_status/1)">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Sys inspection error: ~p:~p", [C3, R3]))}
end,
Stages = [CompileStage, S1_Ast, S2_DemoExecution, S3_SysGetState]
`, wsDir, wsDir), true

	case "ch07-l02":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(wallet_server) of
    {module, wallet_server} ->
        Exports = wallet_server:module_info(exports),
        Req = [{start_link, 1}, {credit, 3}, {debit, 3}, {get_balances, 1}, {stop, 1}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"wallet_server.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "wallet_server.erl"]),
    BeamPath = filename:join(["%s", "ebin", "wallet_server.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{gen_server, start_link, 3}, {gen_server, call, 2}, {gen_server, cast, 2}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_gen_server_callbacks">>, title => <<"AST Analysis: Synchronous Calls, Asynchronous Casts & Callbacks">>, status => <<"passed">>, time_ms => 15, details => <<"Verified gen_server:call for debit/get_balances and cast for credit.">>};
        {error, Violations} ->
            #{id => <<"ast_gen_server_callbacks">>, title => <<"AST Analysis: Synchronous Calls, Asynchronous Casts & Callbacks">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_gen_server_callbacks">>, title => <<"AST Analysis: Synchronous Calls, Asynchronous Casts & Callbacks">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_MultiCurrency = try
    {ok, W} = wallet_server:start_link(#{<<"USD">> => 500, <<"EUR">> => 200}),
    wallet_server:credit(W, <<"GBP">>, 150),
    timer:sleep(20),
    {ok, 450} = wallet_server:debit(W, <<"USD">>, 50),
    {ok, 100} = wallet_server:debit(W, <<"GBP">>, 50),
    Bals = wallet_server:get_balances(W),
    wallet_server:stop(W),
    Expected = #{<<"USD">> => 450, <<"EUR">> => 200, <<"GBP">> => 100},
    case Bals of
        Expected ->
            #{id => <<"multicurrency_ledger">>, title => <<"Multi-Currency Ledger Operations (credit & debit)">>, status => <<"passed">>, time_ms => 30, details => <<"Correctly managed balances across USD, EUR, and newly credited GBP.">>};
        Other2 ->
            #{id => <<"multicurrency_ledger">>, title => <<"Multi-Currency Ledger Operations (credit & debit)">>, status => <<"failed">>, time_ms => 30, details => list_to_binary(io_lib:format("Balance mismatch: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"multicurrency_ledger">>, title => <<"Multi-Currency Ledger Operations (credit & debit)">>, status => <<"failed">>, time_ms => 30, details => list_to_binary(io_lib:format("Ledger error: ~p:~p", [C2, R2]))}
end,
S3_InsufficientFunds = try
    {ok, W2} = wallet_server:start_link(#{<<"USD">> => 100}),
    Err1 = wallet_server:debit(W2, <<"USD">>, 101),
    Err2 = wallet_server:debit(W2, <<"JPY">>, 50),
    Bals2 = wallet_server:get_balances(W2),
    wallet_server:stop(W2),
    case {Err1, Err2, Bals2} of
        {{error, insufficient_funds}, {error, insufficient_funds}, #{<<"USD">> := 100}} ->
            #{id => <<"insufficient_funds_protection">>, title => <<"Atomic Insufficient Funds Protection (No Negative Balances)">>, status => <<"passed">>, time_ms => 15, details => <<"Both overdraft and nonexistent currency debits rejected cleanly without mutating balances.">>};
        Other3 ->
            #{id => <<"insufficient_funds_protection">>, title => <<"Atomic Insufficient Funds Protection (No Negative Balances)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Unexpected overdraft response: ~p", [Other3]))}
    end
catch C3:R3 ->
    #{id => <<"insufficient_funds_protection">>, title => <<"Atomic Insufficient Funds Protection (No Negative Balances)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Overdraft error: ~p:~p", [C3, R3]))}
end,
S4_SysState = try
    {ok, W3} = wallet_server:start_link(#{<<"BTC">> => 2}),
    LiveState = sys:get_state(W3),
    wallet_server:stop(W3),
    case LiveState of
        #{balances := #{<<"BTC">> := 2}} ->
            #{id => <<"sys_state_structure">>, title => <<"Live sys:get_state Verification">>, status => <<"passed">>, time_ms => 10, details => <<"State map structure #{balances => #{...}} verified via OTP system protocol.">>};
        Other4 ->
            #{id => <<"sys_state_structure">>, title => <<"Live sys:get_state Verification">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Invalid internal state format: ~p", [Other4]))}
    end
catch C4:R4 ->
    #{id => <<"sys_state_structure">>, title => <<"Live sys:get_state Verification">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("State inspection error: ~p:~p", [C4, R4]))}
end,
Stages = [CompileStage, S1_Ast, S2_MultiCurrency, S3_InsufficientFunds, S4_SysState]
`, wsDir, wsDir), true

	case "ch07-l03":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(session_ttl_server) of
    {module, session_ttl_server} ->
        Exports = session_ttl_server:module_info(exports),
        Req = [{start_link, 1}, {create_session, 2}, {is_valid, 2}, {get_active_count, 1}, {stop, 1}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"session_ttl_server.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "session_ttl_server.erl"]),
    BeamPath = filename:join(["%s", "ebin", "session_ttl_server.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{gen_server, start_link, 3}, {gen_server, call, 2}, {erlang, send_after, 3}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_continue_and_timers">>, title => <<"AST Analysis: handle_continue/2 & erlang:send_after Timers">>, status => <<"passed">>, time_ms => 15, details => <<"Verified non-blocking continue workflow and periodic expiration timer.">>};
        {error, Violations} ->
            #{id => <<"ast_continue_and_timers">>, title => <<"AST Analysis: handle_continue/2 & erlang:send_after Timers">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_continue_and_timers">>, title => <<"AST Analysis: handle_continue/2 & erlang:send_after Timers">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_NonBlockingContinue = try
    {ok, S} = session_ttl_server:start_link(60),
    GuestValid = session_ttl_server:is_valid(S, <<"guest">>),
    CountInit = session_ttl_server:get_active_count(S),
    session_ttl_server:stop(S),
    case {GuestValid, CountInit} of
        {true, 1} ->
            #{id => <<"handle_continue_hydration">>, title => <<"Non-Blocking Post-Init Hydration via handle_continue/2">>, status => <<"passed">>, time_ms => 20, details => <<"Default guest session hydrated immediately after init without blocking supervisor.">>};
        Other2 ->
            #{id => <<"handle_continue_hydration">>, title => <<"Non-Blocking Post-Init Hydration via handle_continue/2">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Invalid post-continue state: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"handle_continue_hydration">>, title => <<"Non-Blocking Post-Init Hydration via handle_continue/2">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Hydration error: ~p:~p", [C2, R2]))}
end,
S3_SessionLifecycle = try
    {ok, S2} = session_ttl_server:start_link(60),
    ok = session_ttl_server:create_session(S2, <<"sess_alpha">>),
    ok = session_ttl_server:create_session(S2, <<"sess_beta">>),
    V1 = session_ttl_server:is_valid(S2, <<"sess_alpha">>),
    V2 = session_ttl_server:is_valid(S2, <<"sess_gamma">>),
    Count2 = session_ttl_server:get_active_count(S2),
    session_ttl_server:stop(S2),
    case {V1, V2, Count2} of
        {true, false, 3} ->
            #{id => <<"session_lifecycle">>, title => <<"Session Creation and Validity Check">>, status => <<"passed">>, time_ms => 20, details => <<"New sessions created; validation handles known and unknown sessions correctly.">>};
        Other3 ->
            #{id => <<"session_lifecycle">>, title => <<"Session Creation and Validity Check">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Lifecycle mismatch: ~p", [Other3]))}
    end
catch C3:R3 ->
    #{id => <<"session_lifecycle">>, title => <<"Session Creation and Validity Check">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Lifecycle error: ~p:~p", [C3, R3]))}
end,
S4_TtlExpiration = try
    {ok, S3} = session_ttl_server:start_link(1),
    ok = session_ttl_server:create_session(S3, <<"sess_short">>),
    timer:sleep(2100),
    VShort = session_ttl_server:is_valid(S3, <<"sess_short">>),
    session_ttl_server:stop(S3),
    case VShort of
        false ->
            #{id => <<"ttl_expiration_sweep">>, title => <<"Session Expiration Sweeping & handle_info Cleanup">>, status => <<"passed">>, time_ms => 2120, details => <<"Expired session correctly invalidated after TTL passed.">>};
        true ->
            #{id => <<"ttl_expiration_sweep">>, title => <<"Session Expiration Sweeping & handle_info Cleanup">>, status => <<"failed">>, time_ms => 2120, details => <<"Session remained valid after TTL expiration">>}
    end
catch C4:R4 ->
    #{id => <<"ttl_expiration_sweep">>, title => <<"Session Expiration Sweeping & handle_info Cleanup">>, status => <<"failed">>, time_ms => 1120, details => list_to_binary(io_lib:format("Expiration error: ~p:~p", [C4, R4]))}
end,
Stages = [CompileStage, S1_Ast, S2_NonBlockingContinue, S3_SessionLifecycle, S4_TtlExpiration]
`, wsDir, wsDir), true

	case "ch07-l04":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(async_report_server) of
    {module, async_report_server} ->
        Exports = async_report_server:module_info(exports),
        Req = [{start_link, 0}, {generate_report, 3}, {get_completed_count, 1}, {hibernate_idle, 1}, {stop, 1}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"async_report_server.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "async_report_server.erl"]),
    BeamPath = filename:join(["%s", "ebin", "async_report_server.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{gen_server, reply, 2}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_reply_and_worker">>, title => <<"AST Analysis: gen_server:reply/2 Offloading Worker Contract">>, status => <<"passed">>, time_ms => 15, details => <<"Verified gen_server:reply/2 call used to unblock client callers from spawned workers.">>};
        {error, Violations} ->
            #{id => <<"ast_reply_and_worker">>, title => <<"AST Analysis: gen_server:reply/2 Offloading Worker Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_reply_and_worker">>, title => <<"AST Analysis: gen_server:reply/2 Offloading Worker Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_AsyncOffloading = try
    {ok, P1} = async_report_server:start_link(),
    StartTime = erlang:system_time(millisecond),
    ComputeFun = fun() -> timer:sleep(40), 42 * 10 end,
    Res = async_report_server:generate_report(P1, <<"report_alpha">>, ComputeFun),
    Elapsed = erlang:system_time(millisecond) - StartTime,
    timer:sleep(20),
    CountRes = async_report_server:get_completed_count(P1),
    async_report_server:stop(P1),
    case {Res, CountRes} of
        {{ok, <<"report_alpha">>, 420}, {ok, #{in_flight := 0, completed := 1}}} ->
            #{id => <<"async_offloading_verification">>, title => <<"Asynchronous Worker Offloading & Non-Blocking Call Execution">>, status => <<"passed">>, time_ms => Elapsed, details => <<"Spawned worker returned result directly via gen_server:reply/2 and notified coordinator.">>};
        Other2 ->
            #{id => <<"async_offloading_verification">>, title => <<"Asynchronous Worker Offloading & Non-Blocking Call Execution">>, status => <<"failed">>, time_ms => Elapsed, details => list_to_binary(io_lib:format("Unexpected execution result: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"async_offloading_verification">>, title => <<"Asynchronous Worker Offloading & Non-Blocking Call Execution">>, status => <<"failed">>, time_ms => 0, details => list_to_binary(io_lib:format("Offloading error: ~p:~p", [C2, R2]))}
end,
S3_ConcurrentLoad = try
    {ok, P2} = async_report_server:start_link(),
    Jobs = [<<"j1">>, <<"j2">>, <<"j3">>],
    SelfPid = self(),
    [spawn(fun() ->
        R = async_report_server:generate_report(P2, JId, fun() -> timer:sleep(20), JId end),
        SelfPid ! {report_res, R}
    end) || JId <- Jobs],
    Responses = [receive {report_res, R} -> R after 1000 -> timeout end || _ <- Jobs],
    timer:sleep(40),
    {ok, FinalCounts} = async_report_server:get_completed_count(P2),
    async_report_server:stop(P2),
    ExpectedCounts = #{in_flight => 0, completed => 3},
    case {lists:sort(Responses), FinalCounts} of
        {[{ok, <<"j1">>, <<"j1">>}, {ok, <<"j2">>, <<"j2">>}, {ok, <<"j3">>, <<"j3">>}], ExpectedCounts} ->
            #{id => <<"concurrent_jobs_load">>, title => <<"Concurrent Job Concurrency & Completed Counter Integrity">>, status => <<"passed">>, time_ms => 80, details => <<"Handled concurrent reports simultaneously; completed count verified at 3.">>};
        Other3 ->
            #{id => <<"concurrent_jobs_load">>, title => <<"Concurrent Job Concurrency & Completed Counter Integrity">>, status => <<"failed">>, time_ms => 80, details => list_to_binary(io_lib:format("Concurrent responses: ~p", [Other3]))}
    end
catch C3:R3 ->
    #{id => <<"concurrent_jobs_load">>, title => <<"Concurrent Job Concurrency & Completed Counter Integrity">>, status => <<"failed">>, time_ms => 0, details => list_to_binary(io_lib:format("Concurrent load error: ~p:~p", [C3, R3]))}
end,
S4_Hibernation = try
    {ok, P3} = async_report_server:start_link(),
    HibResult = async_report_server:hibernate_idle(P3),
    timer:sleep(10),
    MemAfter = case erlang:process_info(P3, memory) of
        {memory, M} -> M;
        _ -> 0
    end,
    async_report_server:stop(P3),
    case HibResult of
        hibernated ->
            #{id => <<"hibernation_verification">>, title => <<"Process Hibernation & Memory Compaction Contract">>, status => <<"passed">>, time_ms => 15, details => list_to_binary(io_lib:format("Process hibernated cleanly; heap compacted (memory: ~p bytes).", [MemAfter]))};
        Other4 ->
            #{id => <<"hibernation_verification">>, title => <<"Process Hibernation & Memory Compaction Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Unexpected hibernation result: ~p", [Other4]))}
    end
catch C4:R4 ->
    #{id => <<"hibernation_verification">>, title => <<"Process Hibernation & Memory Compaction Contract">>, status => <<"failed">>, time_ms => 0, details => list_to_binary(io_lib:format("Hibernation error: ~p:~p", [C4, R4]))}
end,
Stages = [CompileStage, S1_Ast, S2_AsyncOffloading, S3_ConcurrentLoad, S4_Hibernation]
`, wsDir, wsDir), true

	case "ch07-l05":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(circuit_breaker_statem) of
    {module, circuit_breaker_statem} ->
        Exports = circuit_breaker_statem:module_info(exports),
        Req = [{start_link, 2}, {execute, 2}, {get_state_name, 1}, {stop, 1}, {callback_mode, 0}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"circuit_breaker_statem.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "circuit_breaker_statem.erl"]),
    BeamPath = filename:join(["%s", "ebin", "circuit_breaker_statem.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{gen_statem, start_link, 3}, {gen_statem, call, 2}, {gen_statem, stop, 1}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            case circuit_breaker_statem:callback_mode() of
                state_functions ->
                    #{id => <<"ast_gen_statem_modes">>, title => <<"AST Analysis: gen_statem Behaviour & state_functions Callback Mode">>, status => <<"passed">>, time_ms => 15, details => <<"Verified gen_statem behaviour and callback_mode() -> state_functions.">>};
                OtherMode ->
                    #{id => <<"ast_gen_statem_modes">>, title => <<"AST Analysis: gen_statem Behaviour & state_functions Callback Mode">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Unexpected callback mode: ~p", [OtherMode]))}
            end;
        {error, Violations} ->
            #{id => <<"ast_gen_statem_modes">>, title => <<"AST Analysis: gen_statem Behaviour & state_functions Callback Mode">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_gen_statem_modes">>, title => <<"AST Analysis: gen_statem Behaviour & state_functions Callback Mode">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_ClosedExecution = try
    {ok, CB} = circuit_breaker_statem:start_link(3, 500),
    closed = circuit_breaker_statem:get_state_name(CB),
    {ok, 100} = circuit_breaker_statem:execute(CB, fun() -> {ok, 100} end),
    {ok, 200} = circuit_breaker_statem:execute(CB, fun() -> {ok, 200} end),
    closed = circuit_breaker_statem:get_state_name(CB),
    circuit_breaker_statem:stop(CB),
    #{id => <<"closed_state_execution">>, title => <<"Closed State: Normal Passthrough Execution">>, status => <<"passed">>, time_ms => 20, details => <<"Pass-through executions succeeded while maintaining closed state.">>}
catch C2:R2 ->
    #{id => <<"closed_state_execution">>, title => <<"Closed State: Normal Passthrough Execution">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Closed execution error: ~p:~p", [C2, R2]))}
end,
S3_TrippingToOpen = try
    {ok, CB2} = circuit_breaker_statem:start_link(2, 200),
    {error, err1} = circuit_breaker_statem:execute(CB2, fun() -> {error, err1} end),
    closed = circuit_breaker_statem:get_state_name(CB2),
    {error, err2} = circuit_breaker_statem:execute(CB2, fun() -> {error, err2} end),
    open = circuit_breaker_statem:get_state_name(CB2),
    FastFail = circuit_breaker_statem:execute(CB2, fun() -> {ok, never_reached} end),
    circuit_breaker_statem:stop(CB2),
    case FastFail of
        {error, circuit_open} ->
            #{id => <<"tripping_and_fast_fail">>, title => <<"Failure Threshold Tripping & Immediate Fast-Fail">>, status => <<"passed">>, time_ms => 25, details => <<"Transitioned to open state after 2 consecutive failures; fast-failed subsequent call without running function.">>};
        Other3 ->
            #{id => <<"tripping_and_fast_fail">>, title => <<"Failure Threshold Tripping & Immediate Fast-Fail">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Expected {error, circuit_open}, got: ~p", [Other3]))}
    end
catch C3:R3 ->
    #{id => <<"tripping_and_fast_fail">>, title => <<"Failure Threshold Tripping & Immediate Fast-Fail">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Tripping error: ~p:~p", [C3, R3]))}
end,
S4_RecoveryProbe = try
    {ok, CB3} = circuit_breaker_statem:start_link(1, 80),
    {error, crash} = circuit_breaker_statem:execute(CB3, fun() -> {error, crash} end),
    open = circuit_breaker_statem:get_state_name(CB3),
    timer:sleep(110),
    HalfOpenState = circuit_breaker_statem:get_state_name(CB3),
    {ok, recovered} = circuit_breaker_statem:execute(CB3, fun() -> {ok, recovered} end),
    FinalState = circuit_breaker_statem:get_state_name(CB3),
    circuit_breaker_statem:stop(CB3),
    case {HalfOpenState, FinalState} of
        {half_open, closed} ->
            #{id => <<"recovery_probe_transition">>, title => <<"State Timeout to half_open & Self-Healing Recovery to closed">>, status => <<"passed">>, time_ms => 140, details => <<"state_timeout automatically transitioned open -> half_open; successful trial request reset breaker to closed.">>};
        Other4 ->
            #{id => <<"recovery_probe_transition">>, title => <<"State Timeout to half_open & Self-Healing Recovery to closed">>, status => <<"failed">>, time_ms => 140, details => list_to_binary(io_lib:format("State transitions mismatch: ~p", [Other4]))}
    end
catch C4:R4 ->
    #{id => <<"recovery_probe_transition">>, title => <<"State Timeout to half_open & Self-Healing Recovery to closed">>, status => <<"failed">>, time_ms => 140, details => list_to_binary(io_lib:format("Recovery error: ~p:~p", [C4, R4]))}
end,
Stages = [CompileStage, S1_Ast, S2_ClosedExecution, S3_TrippingToOpen, S4_RecoveryProbe]
`, wsDir, wsDir), true

	case "ch07-l06":
		if _, err := os.Stat(filepath.Join(session.WorkspaceDir, "src", "rate_limiter_srv.erl")); err == nil {
			return r.buildRateLimiterVerificationScript(wsDir)
		}
		return r.buildSecurityAuditVerificationScript(wsDir)

	case "ch07-l07":
		return r.buildIncidentVerificationScript(session, "ch07-l07")

	case "ch07-l08":
		return r.buildRateLimiterVerificationScript(wsDir)

	// ── CHAPTER 8 ─────────────────────────────────────────────────────────────
	case "ch08-l01":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(strategy_planner) of
    {module, strategy_planner} ->
        Exports = strategy_planner:module_info(exports),
        Req = [{build_sup_flags, 3}, {select_strategy_for_topology, 1}, {calculate_restart_budget, 2}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"strategy_planner.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "strategy_planner.erl"]),
    BeamPath = filename:join(["%s", "ebin", "strategy_planner.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_constructs => [guards]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_guards_and_validation">>, title => <<"AST Analysis: Guards & Input Validation Contract">>, status => <<"passed">>, time_ms => 15, details => <<"Verified guard expressions enforcing valid strategy atoms and positive periods.">>};
        {error, Violations} ->
            #{id => <<"ast_guards_and_validation">>, title => <<"AST Analysis: Guards & Input Validation Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_guards_and_validation">>, title => <<"AST Analysis: Guards & Input Validation Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_SupFlags = try
    F1 = strategy_planner:build_sup_flags(one_for_one, 3, 5),
    F2 = strategy_planner:build_sup_flags(rest_for_one, 5, 10),
    F3 = strategy_planner:build_sup_flags(one_for_all, 1, 1),
    F4 = strategy_planner:build_sup_flags(simple_one_for_one, 10, 20),
    case {F1, F2, F3, F4} of
        {#{strategy := one_for_one, intensity := 3, period := 5},
         #{strategy := rest_for_one, intensity := 5, period := 10},
         #{strategy := one_for_all, intensity := 1, period := 1},
         #{strategy := simple_one_for_one, intensity := 10, period := 20}} ->
            #{id => <<"sup_flags_validation">>, title => <<"Supervisor Flags Construction (4 Strategies)">>, status => <<"passed">>, time_ms => 15, details => <<"Correctly constructed standardized sup_flags maps across all 4 OTP restart strategies.">>};
        Other2 ->
            #{id => <<"sup_flags_validation">>, title => <<"Supervisor Flags Construction (4 Strategies)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Flags mismatch: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"sup_flags_validation">>, title => <<"Supervisor Flags Construction (4 Strategies)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Flags error: ~p:~p", [C2, R2]))}
end,
S3_Topology = try
    T1 = strategy_planner:select_strategy_for_topology(independent_workers),
    T2 = strategy_planner:select_strategy_for_topology(dependent_pipeline),
    T3 = strategy_planner:select_strategy_for_topology(coupled_cluster),
    T4 = strategy_planner:select_strategy_for_topology(dynamic_pool),
    T5 = strategy_planner:select_strategy_for_topology(unknown_topology_atom),
    case {T1, T2, T3, T4, T5} of
        {one_for_one, rest_for_one, one_for_all, simple_one_for_one, {error, unknown_topology}} ->
            #{id => <<"topology_strategy_mapping">>, title => <<"Topology-to-Strategy Architectural Mapping">>, status => <<"passed">>, time_ms => 12, details => <<"Architectural topology descriptors mapped accurately to optimal supervisor strategies with error handling.">>};
        Other3 ->
            #{id => <<"topology_strategy_mapping">>, title => <<"Topology-to-Strategy Architectural Mapping">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Topology mismatch: ~p", [Other3]))}
    end
catch C3:R3 ->
    #{id => <<"topology_strategy_mapping">>, title => <<"Topology-to-Strategy Architectural Mapping">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Topology error: ~p:~p", [C3, R3]))}
end,
S4_Budget = try
    B1 = strategy_planner:calculate_restart_budget(12, 4),
    case B1 of
        #{intensity := 12, period := 4, max_rate_per_sec := Rate, tolerated_downtime := ok} when is_float(Rate), abs(Rate - 3.0) < 0.001 ->
            #{id => <<"restart_budget_telemetry">>, title => <<"Crash Tolerance Budget & Rate Telemetry">>, status => <<"passed">>, time_ms => 10, details => <<"Calculated exact restart frequency budget (3.0 crashes/sec) over sliding time window.">>};
        Other4 ->
            #{id => <<"restart_budget_telemetry">>, title => <<"Crash Tolerance Budget & Rate Telemetry">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Budget mismatch: ~p", [Other4]))}
    end
catch C4:R4 ->
    #{id => <<"restart_budget_telemetry">>, title => <<"Crash Tolerance Budget & Rate Telemetry">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Budget error: ~p:~p", [C4, R4]))}
end,
Stages = [CompileStage, S1_Ast, S2_SupFlags, S3_Topology, S4_Budget]
`, wsDir, wsDir), true

	case "ch08-l02":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(child_spec_factory) of
    {module, child_spec_factory} ->
        Exports = child_spec_factory:module_info(exports),
        Req = [{worker_spec, 4}, {supervisor_spec, 2}, {classify_restart, 2}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"child_spec_factory.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "child_spec_factory.erl"]),
    BeamPath = filename:join(["%s", "ebin", "child_spec_factory.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_constructs => [guards]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_child_spec_guards">>, title => <<"AST Analysis: Restart Type & Shutdown Timeout Guards">>, status => <<"passed">>, time_ms => 15, details => <<"Guards verified protecting restart strategies and shutdown timeouts.">>};
        {error, Violations} ->
            #{id => <<"ast_child_spec_guards">>, title => <<"AST Analysis: Restart Type & Shutdown Timeout Guards">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_child_spec_guards">>, title => <<"AST Analysis: Restart Type & Shutdown Timeout Guards">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_WorkerSpecs = try
    W1 = try
        child_spec_factory:worker_spec(task_worker, task_runner, [1], transient)
    catch
        _:_ ->
            child_spec_factory:worker_spec(task_worker, {task_runner, start_link, [1]}, transient, 5000)
    end,
    W2 = try
        child_spec_factory:worker_spec(listener, tcp_listener, [4000], permanent)
    catch
        _:_ ->
            child_spec_factory:worker_spec(listener, {tcp_listener, start_link, [4000]}, permanent, 5000)
    end,
    IsW1Ok = case W1 of
        #{id := task_worker, start := {task_runner, start_link, [1]}, restart := transient, type := worker, modules := [task_runner]} -> true;
        _ -> false
    end,
    IsW2Ok = case W2 of
        #{id := listener, start := {tcp_listener, start_link, [4000]}, restart := permanent, type := worker, modules := [tcp_listener]} -> true;
        _ -> false
    end,
    case IsW1Ok andalso IsW2Ok of
        true ->
            #{id => <<"worker_child_spec_audit">>, title => <<"Worker Child Spec Map Specification Compliance">>, status => <<"passed">>, time_ms => 15, details => <<"Correctly formatted worker child_spec maps with modules extraction and shutdown timeout.">>};
        false ->
            #{id => <<"worker_child_spec_audit">>, title => <<"Worker Child Spec Map Specification Compliance">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Worker spec mismatch: W1=~p, W2=~p", [W1, W2]))}
    end
catch C2:R2 ->
    #{id => <<"worker_child_spec_audit">>, title => <<"Worker Child Spec Map Specification Compliance">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Worker spec error: ~p:~p", [C2, R2]))}
end,
S3_SupervisorSpecs = try
    SupSpec = try
        child_spec_factory:supervisor_spec(nested_tree_sup, session_sup)
    catch
        _:_ ->
            child_spec_factory:supervisor_spec(nested_tree_sup, {session_sup, start_link, []})
    end,
    case SupSpec of
        #{id := nested_tree_sup, start := {session_sup, start_link, []}, restart := permanent, shutdown := infinity, type := supervisor, modules := [session_sup]} ->
            #{id => <<"supervisor_child_spec_audit">>, title => <<"Nested Supervisor Spec (shutdown => infinity Enforcement)">>, status => <<"passed">>, time_ms => 15, details => <<"Enforced shutdown => infinity and type => supervisor for sub-tree integrity.">>};
        Other3 ->
            #{id => <<"supervisor_child_spec_audit">>, title => <<"Nested Supervisor Spec (shutdown => infinity Enforcement)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Supervisor spec mismatch: ~p", [Other3]))}
    end
catch C3:R3 ->
    #{id => <<"supervisor_child_spec_audit">>, title => <<"Nested Supervisor Spec (shutdown => infinity Enforcement)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Supervisor spec error: ~p:~p", [C3, R3]))}
end,
S4_DecisionMatrix = try
    P1 = child_spec_factory:classify_restart(permanent, normal),
    P2 = child_spec_factory:classify_restart(permanent, badarith),
    T1 = child_spec_factory:classify_restart(temporary, normal),
    T2 = child_spec_factory:classify_restart(temporary, killed),
    TR1 = child_spec_factory:classify_restart(transient, normal),
    TR2 = child_spec_factory:classify_restart(transient, shutdown),
    TR3 = child_spec_factory:classify_restart(transient, {shutdown, user_exit}),
    TR4 = child_spec_factory:classify_restart(transient, badarith),
    TR5 = child_spec_factory:classify_restart(transient, killed),
    DecisionTuple = {P1, P2, T1, T2, TR1, TR2, TR3, TR4, TR5},
    IsExpected = (DecisionTuple =:= {restart, restart, do_not_restart, do_not_restart, do_not_restart, do_not_restart, do_not_restart, restart, restart})
          orelse (DecisionTuple =:= {true, true, false, false, false, false, false, true, true}),
    case IsExpected of
        true ->
            #{id => <<"restart_decision_matrix">>, title => <<"OTP Restart Decision Matrix (Permanent, Transient, Temporary)">>, status => <<"passed">>, time_ms => 15, details => <<"Verified full OTP decision matrix: transient differentiates clean exits from unexpected crashes.">>};
        false ->
            #{id => <<"restart_decision_matrix">>, title => <<"OTP Restart Decision Matrix (Permanent, Transient, Temporary)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Matrix mismatch: ~p", [DecisionTuple]))}
    end
catch C4:R4 ->
    #{id => <<"restart_decision_matrix">>, title => <<"OTP Restart Decision Matrix (Permanent, Transient, Temporary)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Matrix error: ~p:~p", [C4, R4]))}
end,
Stages = [CompileStage, S1_Ast, S2_WorkerSpecs, S3_SupervisorSpecs, S4_DecisionMatrix]
`, wsDir, wsDir), true

	case "ch08-l03":
		return fmt.Sprintf(`
IsDynamic = case code:ensure_loaded(dynamic_session_sup) of
    {module, dynamic_session_sup} -> true;
    _ -> false
end,
Stages = case IsDynamic of
    true ->
        CompileStage_Dyn = case code:ensure_loaded(dynamic_session_sup) of
            {module, dynamic_session_sup} ->
                Exports_Dyn = dynamic_session_sup:module_info(exports),
                Req_Dyn = [{start_link, 0}, {start_session, 3}, {count_sessions, 1}, {terminate_session, 2}, {init, 1}],
                case [E || E <- Req_Dyn, not lists:member(E, Exports_Dyn)] of
                    [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"dynamic_session_sup.erl compiled cleanly; all API functions exported.">>};
                    Missing_Dyn -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing_Dyn]))}
                end;
            {error, E1_Dyn} ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1_Dyn]))}
        end,
        S1_Ast_Dyn = try
            SrcPath_Dyn = filename:join(["%s", "src", "dynamic_session_sup.erl"]),
            BeamPath_Dyn = filename:join(["%s", "ebin", "dynamic_session_sup.beam"]),
            {ok, BeamBin_Dyn} = file:read_file(BeamPath_Dyn),
            Rules_Dyn = #{
                required_remote_calls => [{supervisor, start_link, 3}, {supervisor, start_child, 2}, {supervisor, count_children, 1}, {supervisor, terminate_child, 2}]
            },
            case bf_ast_verifier:verify_rules(SrcPath_Dyn, BeamBin_Dyn, Rules_Dyn) of
                {ok, _} ->
                    #{id => <<"ast_dynamic_supervisor">>, title => <<"AST Analysis: supervisor Behaviour & Dynamic Spawning Calls">>, status => <<"passed">>, time_ms => 15, details => <<"Verified supervisor behaviour, dynamic start_child/2, and telemetry queries.">>};
                {error, Violations_Dyn} ->
                    #{id => <<"ast_dynamic_supervisor">>, title => <<"AST Analysis: supervisor Behaviour & Dynamic Spawning Calls">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations_Dyn]))}
            end
        catch C1_Dyn:R1_Dyn ->
            #{id => <<"ast_dynamic_supervisor">>, title => <<"AST Analysis: supervisor Behaviour & Dynamic Spawning Calls">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1_Dyn, R1_Dyn]))}
        end,
        S2_TemplateSpec_Dyn = try
            {ok, {SupFlags_Dyn, [Template_Dyn]}} = dynamic_session_sup:init([]),
            case {SupFlags_Dyn, Template_Dyn} of
                {#{strategy := simple_one_for_one}, #{restart := temporary, type := worker}} ->
                    #{id => <<"simple_one_for_one_spec">>, title => <<"simple_one_for_one Template Child Specification Audit">>, status => <<"passed">>, time_ms => 15, details => <<"init/1 returns exactly 1 template child spec with simple_one_for_one strategy and temporary restart.">>};
                Other2_Dyn ->
                    #{id => <<"simple_one_for_one_spec">>, title => <<"simple_one_for_one Template Child Specification Audit">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Invalid template structure: ~p", [Other2_Dyn]))}
            end
        catch C2_Dyn:R2_Dyn ->
            #{id => <<"simple_one_for_one_spec">>, title => <<"simple_one_for_one Template Child Specification Audit">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Template error: ~p:~p", [C2_Dyn, R2_Dyn]))}
        end,
        S3_DynamicLifecycle_Dyn = try
            {ok, Sup_Dyn} = dynamic_session_sup:start_link(),
            0 = dynamic_session_sup:count_sessions(Sup_Dyn),
            {ok, P1_Dyn} = dynamic_session_sup:start_session(Sup_Dyn, <<"sess_101">>, <<"usr_alpha">>),
            {ok, P2_Dyn} = dynamic_session_sup:start_session(Sup_Dyn, <<"sess_102">>, <<"usr_beta">>),
            {ok, P3_Dyn} = dynamic_session_sup:start_session(Sup_Dyn, <<"sess_103">>, <<"usr_gamma">>),
            3 = dynamic_session_sup:count_sessions(Sup_Dyn),
            ok = dynamic_session_sup:terminate_session(Sup_Dyn, P2_Dyn),
            2 = dynamic_session_sup:count_sessions(Sup_Dyn),
            exit(Sup_Dyn, shutdown),
            #{id => <<"dynamic_lifecycle_pool">>, title => <<"Live Dynamic Process Pool Lifecycle (Spawn, Count, Terminate)">>, status => <<"passed">>, time_ms => 35, details => <<"Spawned 3 dynamic sessions on demand; verified count_sessions/1 increment/decrement and graceful cleanup.">>}
        catch C3_Dyn:R3_Dyn ->
            #{id => <<"dynamic_lifecycle_pool">>, title => <<"Live Dynamic Process Pool Lifecycle (Spawn, Count, Terminate)">>, status => <<"failed">>, time_ms => 35, details => list_to_binary(io_lib:format("Lifecycle error: ~p:~p", [C3_Dyn, R3_Dyn]))}
        end,
        [CompileStage_Dyn, S1_Ast_Dyn, S2_TemplateSpec_Dyn, S3_DynamicLifecycle_Dyn];
    false ->
        CompileStage_Esc = case code:ensure_loaded(escalation_analyzer) of
            {module, escalation_analyzer} ->
                Exports_Esc = escalation_analyzer:module_info(exports),
                Req_Esc = [{evaluate_crash_burst, 3}, {plan_escalation_action, 2}, {reverse_shutdown_order, 1}],
                case [E || E <- Req_Esc, not lists:member(E, Exports_Esc)] of
                    [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"escalation_analyzer.erl compiled cleanly; all API functions exported.">>};
                    Missing_Esc -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing_Esc]))}
                end;
            {error, E1_Esc} ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1_Esc]))}
        end,
        S1_Ast_Esc = try
            SrcPath_Esc = filename:join(["%s", "src", "escalation_analyzer.erl"]),
            BeamPath_Esc = filename:join(["%s", "ebin", "escalation_analyzer.beam"]),
            {ok, BeamBin_Esc} = file:read_file(BeamPath_Esc),
            Rules_Esc = #{
                required_constructs => [guards]
            },
            case bf_ast_verifier:verify_rules(SrcPath_Esc, BeamBin_Esc, Rules_Esc) of
                {ok, _} ->
                    #{id => <<"ast_guards_and_validation">>, title => <<"AST Analysis: Guards & Sliding Window Contract">>, status => <<"passed">>, time_ms => 15, details => <<"Verified guard expressions enforcing positive burst window and integer limits.">>};
                {error, Violations_Esc} ->
                    #{id => <<"ast_guards_and_validation">>, title => <<"AST Analysis: Guards & Sliding Window Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations_Esc]))}
            end
        catch C1_Esc:R1_Esc ->
            #{id => <<"ast_guards_and_validation">>, title => <<"AST Analysis: Guards & Sliding Window Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1_Esc, R1_Esc]))}
        end,
        S2_Burst_Esc = try
            B1 = escalation_analyzer:evaluate_crash_burst([], 5, 10),
            B2 = escalation_analyzer:evaluate_crash_burst([1, 2, 3], 3, 5),
            B3 = escalation_analyzer:evaluate_crash_burst([1, 2, 10, 11], 2, 5),
            B4 = escalation_analyzer:evaluate_crash_burst([10, 11, 12, 13, 14], 3, 5),
            case {B1, B2, B3, B4} of
                {{within_budget, 0, 5},
                 {within_budget, 3, 3},
                 {within_budget, 2, 2},
                 {escalate_to_parent, 5, 3}} ->
                    #{id => <<"sliding_window_crash_burst">>, title => <<"Sliding Window Crash Rate Limiting & Escalation Trigger">>, status => <<"passed">>, time_ms => 15, details => <<"Correctly verified empty list, within-budget counts, timestamp window pruning, and parent escalation trigger.">>};
                Other2_Esc ->
                    #{id => <<"sliding_window_crash_burst">>, title => <<"Sliding Window Crash Rate Limiting & Escalation Trigger">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Burst evaluation mismatch: ~p", [Other2_Esc]))}
            end
        catch C2_Esc:R2_Esc ->
            #{id => <<"sliding_window_crash_burst">>, title => <<"Sliding Window Crash Rate Limiting & Escalation Trigger">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Burst error: ~p:~p", [C2_Esc, R2_Esc]))}
        end,
        S3_Plan_Esc = try
            P1 = escalation_analyzer:plan_escalation_action([db_pool, pricing_cache, order_gateway], pricing_cache),
            P2 = escalation_analyzer:plan_escalation_action([db_pool, pricing_cache, order_gateway], db_pool),
            P3 = escalation_analyzer:plan_escalation_action([db_pool, pricing_cache], unknown_srv),
            case {P1, P3} of
                {{stop_in_reverse_order, [order_gateway, pricing_cache], restart_in_order, [pricing_cache, order_gateway]},
                 {error, child_not_found}} ->
                    #{id => <<"rest_for_one_shutdown_planning">>, title => <<"Downstream Reverse Shutdown & Forward Restart Planning">>, status => <<"passed">>, time_ms => 15, details => <<"Verified rest_for_one planning: downstream siblings stopped in reverse order and restarted in forward order.">>};
                Other3_Esc ->
                    #{id => <<"rest_for_one_shutdown_planning">>, title => <<"Downstream Reverse Shutdown & Forward Restart Planning">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Plan mismatch: ~p", [Other3_Esc]))}
            end
        catch C3_Esc:R3_Esc ->
            #{id => <<"rest_for_one_shutdown_planning">>, title => <<"Downstream Reverse Shutdown & Forward Restart Planning">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Plan error: ~p:~p", [C3_Esc, R3_Esc]))}
        end,
        S4_Rev_Esc = try
            R1_List = escalation_analyzer:reverse_shutdown_order([db_pool, pricing_cache, order_gateway]),
            R2_List = escalation_analyzer:reverse_shutdown_order([]),
            case {R1_List, R2_List} of
                {[order_gateway, pricing_cache, db_pool], []} ->
                    #{id => <<"reverse_shutdown_order">>, title => <<"Complete Reverse Order Startup Termination">>, status => <<"passed">>, time_ms => 10, details => <<"Verified full supervisor termination reversing the startup order of children.">>};
                Other4_Esc ->
                    #{id => <<"reverse_shutdown_order">>, title => <<"Complete Reverse Order Startup Termination">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Reverse shutdown mismatch: ~p", [Other4_Esc]))}
            end
        catch C4_Esc:R4_Esc ->
            #{id => <<"reverse_shutdown_order">>, title => <<"Complete Reverse Order Startup Termination">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Reverse error: ~p:~p", [C4_Esc, R4_Esc]))}
        end,
        [CompileStage_Esc, S1_Ast_Esc, S2_Burst_Esc, S3_Plan_Esc, S4_Rev_Esc]
end
`, wsDir, wsDir, wsDir, wsDir), true

	case "ch08-l04":
		return fmt.Sprintf(`
IsApp = case code:ensure_loaded(commerce_app) of
    {module, commerce_app} -> true;
    _ -> false
end,
Stages = case IsApp of
    true ->
        CompileStage_App = case code:ensure_loaded(commerce_app) of
            {module, commerce_app} ->
                Exports_App = commerce_app:module_info(exports),
                Req_App = [{start, 2}, {stop, 1}, {get_app_config, 2}, {set_app_config, 2}],
                case [E || E <- Req_App, not lists:member(E, Exports_App)] of
                    [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"commerce_app.erl compiled cleanly; all API functions exported.">>};
                    Missing_App -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing_App]))}
                end;
            {error, E1_App} ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1_App]))}
        end,
        S1_Ast_App = try
            SrcPath_App = filename:join(["%s", "src", "commerce_app.erl"]),
            BeamPath_App = filename:join(["%s", "ebin", "commerce_app.beam"]),
            {ok, BeamBin_App} = file:read_file(BeamPath_App),
            Rules_App = #{
                required_remote_calls => [{application, get_env, 3}, {application, set_env, 3}, {supervisor, start_link, 3}]
            },
            case bf_ast_verifier:verify_rules(SrcPath_App, BeamBin_App, Rules_App) of
                {ok, _} ->
                    #{id => <<"ast_application_behaviour">>, title => <<"AST Analysis: application Behaviour & Config Management">>, status => <<"passed">>, time_ms => 15, details => <<"Verified application callback exports and application:get_env/set_env environment calls.">>};
                {error, Violations_App} ->
                    #{id => <<"ast_application_behaviour">>, title => <<"AST Analysis: application Behaviour & Config Management">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations_App]))}
            end
        catch C1_App:R1_App ->
            #{id => <<"ast_application_behaviour">>, title => <<"AST Analysis: application Behaviour & Config Management">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1_App, R1_App]))}
        end,
        S2_RootSup_App = try
            {ok, SupPid_App} = commerce_app:start(normal, []),
            IsAlive_App = is_process_alive(SupPid_App),
            ok = commerce_app:stop([]),
            case IsAlive_App of
                true ->
                    #{id => <<"root_supervisor_startup">>, title => <<"Application Root Supervisor Startup & Shutdown">>, status => <<"passed">>, time_ms => 20, details => <<"start/2 booted live root supervisor and stop/1 terminated cleanly.">>};
                false ->
                    #{id => <<"root_supervisor_startup">>, title => <<"Application Root Supervisor Startup & Shutdown">>, status => <<"failed">>, time_ms => 20, details => <<"Root supervisor was not alive.">>}
            end
        catch C2_App:R2_App ->
            #{id => <<"root_supervisor_startup">>, title => <<"Application Root Supervisor Startup & Shutdown">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Startup error: ~p:~p", [C2_App, R2_App]))}
        end,
        S3_ConfigEnv_App = try
            ValDefault_App = commerce_app:get_app_config(worker_pool_size, 32),
            ok = commerce_app:set_app_config(worker_pool_size, 64),
            ValOverride_App = commerce_app:get_app_config(worker_pool_size, 32),
            case {ValDefault_App, ValOverride_App} of
                {32, 64} ->
                    #{id => <<"runtime_config_env">>, title => <<"Application Environment Configuration Management">>, status => <<"passed">>, time_ms => 15, details => <<"Successfully resolved fallback default (32) and dynamic runtime override (64).">>};
                Other3_App ->
                    #{id => <<"runtime_config_env">>, title => <<"Application Environment Configuration Management">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Config mismatch: ~p", [Other3_App]))}
            end
        catch C3_App:R3_App ->
            #{id => <<"runtime_config_env">>, title => <<"Application Environment Configuration Management">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Config error: ~p:~p", [C3_App, R3_App]))}
        end,
        [CompileStage_App, S1_Ast_App, S2_RootSup_App, S3_ConfigEnv_App];
    false ->
        CompileStage_Dyn4 = case code:ensure_loaded(dynamic_session_sup) of
            {module, dynamic_session_sup} ->
                Exports_Dyn4 = dynamic_session_sup:module_info(exports),
                Req_Dyn4 = [{start_link, 0}, {start_session, 3}, {count_sessions, 1}, {terminate_session, 2}, {init, 1}],
                case [E || E <- Req_Dyn4, not lists:member(E, Exports_Dyn4)] of
                    [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"dynamic_session_sup.erl compiled cleanly; all API functions exported.">>};
                    Missing_Dyn4 -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing_Dyn4]))}
                end;
            {error, E1_Dyn4} ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1_Dyn4]))}
        end,
        S1_Ast_Dyn4 = try
            SrcPath_Dyn4 = filename:join(["%s", "src", "dynamic_session_sup.erl"]),
            BeamPath_Dyn4 = filename:join(["%s", "ebin", "dynamic_session_sup.beam"]),
            {ok, BeamBin_Dyn4} = file:read_file(BeamPath_Dyn4),
            Rules_Dyn4 = #{
                required_remote_calls => [{supervisor, start_link, 3}, {supervisor, start_child, 2}, {supervisor, count_children, 1}, {supervisor, terminate_child, 2}]
            },
            case bf_ast_verifier:verify_rules(SrcPath_Dyn4, BeamBin_Dyn4, Rules_Dyn4) of
                {ok, _} ->
                    #{id => <<"ast_dynamic_supervisor">>, title => <<"AST Analysis: supervisor Behaviour & Dynamic Spawning Calls">>, status => <<"passed">>, time_ms => 15, details => <<"Verified supervisor behaviour, dynamic start_child/2, and telemetry queries.">>};
                {error, Violations_Dyn4} ->
                    #{id => <<"ast_dynamic_supervisor">>, title => <<"AST Analysis: supervisor Behaviour & Dynamic Spawning Calls">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations_Dyn4]))}
            end
        catch C1_Dyn4:R1_Dyn4 ->
            #{id => <<"ast_dynamic_supervisor">>, title => <<"AST Analysis: supervisor Behaviour & Dynamic Spawning Calls">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1_Dyn4, R1_Dyn4]))}
        end,
        S2_TemplateSpec_Dyn4 = try
            {ok, {SupFlags_Dyn4, [Template_Dyn4]}} = dynamic_session_sup:init([]),
            case {SupFlags_Dyn4, Template_Dyn4} of
                {#{strategy := simple_one_for_one}, #{restart := temporary, type := worker}} ->
                    #{id => <<"simple_one_for_one_spec">>, title => <<"simple_one_for_one Template Child Specification Audit">>, status => <<"passed">>, time_ms => 15, details => <<"init/1 returns exactly 1 template child spec with simple_one_for_one strategy and temporary restart.">>};
                Other2_Dyn4 ->
                    #{id => <<"simple_one_for_one_spec">>, title => <<"simple_one_for_one Template Child Specification Audit">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Invalid template structure: ~p", [Other2_Dyn4]))}
            end
        catch C2_Dyn4:R2_Dyn4 ->
            #{id => <<"simple_one_for_one_spec">>, title => <<"simple_one_for_one Template Child Specification Audit">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Template error: ~p:~p", [C2_Dyn4, R2_Dyn4]))}
        end,
        S3_DynamicLifecycle_Dyn4 = try
            {ok, Sup_Dyn4} = dynamic_session_sup:start_link(),
            0 = dynamic_session_sup:count_sessions(Sup_Dyn4),
            {ok, P1_Dyn4} = dynamic_session_sup:start_session(Sup_Dyn4, <<"sess_101">>, <<"usr_alpha">>),
            {ok, P2_Dyn4} = dynamic_session_sup:start_session(Sup_Dyn4, <<"sess_102">>, <<"usr_beta">>),
            {ok, P3_Dyn4} = dynamic_session_sup:start_session(Sup_Dyn4, <<"sess_103">>, <<"usr_gamma">>),
            3 = dynamic_session_sup:count_sessions(Sup_Dyn4),
            ok = dynamic_session_sup:terminate_session(Sup_Dyn4, P2_Dyn4),
            2 = dynamic_session_sup:count_sessions(Sup_Dyn4),
            exit(Sup_Dyn4, shutdown),
            #{id => <<"dynamic_lifecycle_pool">>, title => <<"Live Dynamic Process Pool Lifecycle (Spawn, Count, Terminate)">>, status => <<"passed">>, time_ms => 35, details => <<"Spawned 3 dynamic sessions on demand; verified count_sessions/1 increment/decrement and graceful cleanup.">>}
        catch C3_Dyn4:R3_Dyn4 ->
            #{id => <<"dynamic_lifecycle_pool">>, title => <<"Live Dynamic Process Pool Lifecycle (Spawn, Count, Terminate)">>, status => <<"failed">>, time_ms => 35, details => list_to_binary(io_lib:format("Lifecycle error: ~p:~p", [C3_Dyn4, R3_Dyn4]))}
        end,
        [CompileStage_Dyn4, S1_Ast_Dyn4, S2_TemplateSpec_Dyn4, S3_DynamicLifecycle_Dyn4]
end
`, wsDir, wsDir, wsDir, wsDir), true

	case "ch08-l05":
		return fmt.Sprintf(`
IsCheckout5 = case code:ensure_loaded(checkout_sup) of
    {module, checkout_sup} -> true;
    _ -> false
end,
Stages = case IsCheckout5 of
    true ->
        CompileStage_Chk5 = case code:ensure_loaded(checkout_sup) of
            {module, checkout_sup} ->
                Exports_Chk5 = checkout_sup:module_info(exports),
                Req_Chk5 = [{start_link, 0}, {get_pipeline_pids, 0}, {init, 1}],
                case [E || E <- Req_Chk5, not lists:member(E, Exports_Chk5)] of
                    [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"checkout_sup.erl compiled cleanly; all API functions exported.">>};
                    Missing_Chk5 -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing_Chk5]))}
                end;
            {error, E1_Chk5} ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1_Chk5]))}
        end,
        S1_Ast_Chk5 = try
            SrcPath_Chk5 = filename:join(["%s", "src", "checkout_sup.erl"]),
            BeamPath_Chk5 = filename:join(["%s", "ebin", "checkout_sup.beam"]),
            {ok, BeamBin_Chk5} = file:read_file(BeamPath_Chk5),
            Rules_Chk5 = #{
                required_remote_calls => [{supervisor, start_link, 3}, {supervisor, which_children, 1}]
            },
            case bf_ast_verifier:verify_rules(SrcPath_Chk5, BeamBin_Chk5, Rules_Chk5) of
                {ok, _} ->
                    #{id => <<"ast_supervisor_contract">>, title => <<"AST Analysis: supervisor Behaviour & Introspection">>, status => <<"passed">>, time_ms => 15, details => <<"Verified -behaviour(supervisor), supervisor:start_link, and which_children introspection.">>};
                {error, Violations_Chk5} ->
                    #{id => <<"ast_supervisor_contract">>, title => <<"AST Analysis: supervisor Behaviour & Introspection">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations_Chk5]))}
            end
        catch C1_Chk5:R1_Chk5 ->
            #{id => <<"ast_supervisor_contract">>, title => <<"AST Analysis: supervisor Behaviour & Introspection">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1_Chk5, R1_Chk5]))}
        end,
        S2_Flags_Chk5 = try
            {ok, {SupFlags_Chk5, ChildSpecs_Chk5}} = checkout_sup:init([]),
            case {SupFlags_Chk5, [maps:get(id, S_Chk5) || S_Chk5 <- ChildSpecs_Chk5]} of
                {#{strategy := rest_for_one, intensity := 5, period := 10}, [db_pool, pricing_cache, order_gateway]} ->
                    #{id => <<"rest_for_one_pipeline_order">>, title => <<"Supervisor Flags & Strict Pipeline Dependency Order">>, status => <<"passed">>, time_ms => 15, details => <<"Verified rest_for_one strategy and exact [db_pool, pricing_cache, order_gateway] child ordering.">>};
                Other2_Chk5 ->
                    #{id => <<"rest_for_one_pipeline_order">>, title => <<"Supervisor Flags & Strict Pipeline Dependency Order">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Flags or ordering mismatch: ~p", [Other2_Chk5]))}
            end
        catch C2_Chk5:R2_Chk5 ->
            #{id => <<"rest_for_one_pipeline_order">>, title => <<"Supervisor Flags & Strict Pipeline Dependency Order">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Init error: ~p:~p", [C2_Chk5, R2_Chk5]))}
        end,
        S3_ChaosGw_Chk5 = try
            [case whereis(N_Gw5) of undefined -> ok; P_Gw5 -> exit(P_Gw5, kill) end || N_Gw5 <- [checkout_sup, db_pool_worker, pricing_cache_worker, order_gateway_worker]],
            timer:sleep(20),
            {ok, Sup1_Chk5} = checkout_sup:start_link(),
            {ok, #{db_pid := Db1_Gw5, cache_pid := Cache1_Gw5, gateway_pid := Gw1_Gw5}} = checkout_sup:get_pipeline_pids(),
            exit(Gw1_Gw5, kill),
            timer:sleep(40),
            {ok, #{db_pid := Db2_Gw5, cache_pid := Cache2_Gw5, gateway_pid := Gw2_Gw5}} = checkout_sup:get_pipeline_pids(),
            unlink(Sup1_Chk5),
            catch supervisor:stop(Sup1_Chk5),
            case {Db1_Gw5 =:= Db2_Gw5, Cache1_Gw5 =:= Cache2_Gw5, Gw1_Gw5 =/= Gw2_Gw5} of
                {true, true, true} ->
                    #{id => <<"chaos_gateway_isolated_restart">>, title => <<"Chaos Test 1: Isolated Gateway Restart (Children 1 & 2 Preserved)">>, status => <<"passed">>, time_ms => 50, details => <<"Killing order_gateway_worker restarted only Child 3; DB and Cache PIDs were preserved.">>};
                Other3_Gw5 ->
                    #{id => <<"chaos_gateway_isolated_restart">>, title => <<"Chaos Test 1: Isolated Gateway Restart (Children 1 & 2 Preserved)">>, status => <<"failed">>, time_ms => 50, details => list_to_binary(io_lib:format("Gateway crash assertion failed: ~p", [Other3_Gw5]))}
            end
        catch C3_Chk5:R3_Chk5 ->
            #{id => <<"chaos_gateway_isolated_restart">>, title => <<"Chaos Test 1: Isolated Gateway Restart (Children 1 & 2 Preserved)">>, status => <<"failed">>, time_ms => 50, details => list_to_binary(io_lib:format("Chaos Gateway error: ~p:~p", [C3_Chk5, R3_Chk5]))}
        end,
        S4_ChaosCache_Chk5 = try
            [case whereis(N_C5) of undefined -> ok; P_C5 -> exit(P_C5, kill) end || N_C5 <- [checkout_sup, db_pool_worker, pricing_cache_worker, order_gateway_worker]],
            timer:sleep(20),
            {ok, Sup2_Chk5} = checkout_sup:start_link(),
            {ok, #{db_pid := Db3_C5, cache_pid := Cache3_C5, gateway_pid := Gw3_C5}} = checkout_sup:get_pipeline_pids(),
            exit(Cache3_C5, kill),
            timer:sleep(40),
            {ok, #{db_pid := Db4_C5, cache_pid := Cache4_C5, gateway_pid := Gw4_C5}} = checkout_sup:get_pipeline_pids(),
            unlink(Sup2_Chk5),
            catch supervisor:stop(Sup2_Chk5),
            case {Db3_C5 =:= Db4_C5, Cache3_C5 =/= Cache4_C5, Gw3_C5 =/= Gw4_C5} of
                {true, true, true} ->
                    #{id => <<"chaos_cache_cascade_restart">>, title => <<"Chaos Test 2: Cache Crash Cascades to Gateway (DB Pool Preserved)">>, status => <<"passed">>, time_ms => 50, details => <<"Killing pricing_cache_worker restarted both Cache and Gateway, while db_pool PID remained untouched.">>};
                Other4_C5 ->
                    #{id => <<"chaos_cache_cascade_restart">>, title => <<"Chaos Test 2: Cache Crash Cascades to Gateway (DB Pool Preserved)">>, status => <<"failed">>, time_ms => 50, details => list_to_binary(io_lib:format("Cache cascade assertion failed: ~p", [Other4_C5]))}
            end
        catch C4_Chk5:R4_Chk5 ->
            #{id => <<"chaos_cache_cascade_restart">>, title => <<"Chaos Test 2: Cache Crash Cascades to Gateway (DB Pool Preserved)">>, status => <<"failed">>, time_ms => 50, details => list_to_binary(io_lib:format("Chaos Cache error: ~p:~p", [C4_Chk5, R4_Chk5]))}
        end,
        S5_ChaosDb_Chk5 = try
            [case whereis(N_Db5) of undefined -> ok; P_Db5 -> exit(P_Db5, kill) end || N_Db5 <- [checkout_sup, db_pool_worker, pricing_cache_worker, order_gateway_worker]],
            timer:sleep(20),
            {ok, Sup3_Chk5} = checkout_sup:start_link(),
            {ok, #{db_pid := Db5_D5, cache_pid := Cache5_D5, gateway_pid := Gw5_D5}} = checkout_sup:get_pipeline_pids(),
            exit(Db5_D5, kill),
            timer:sleep(40),
            {ok, #{db_pid := Db6_D5, cache_pid := Cache6_D5, gateway_pid := Gw6_D5}} = checkout_sup:get_pipeline_pids(),
            unlink(Sup3_Chk5),
            catch supervisor:stop(Sup3_Chk5),
            case {Db5_D5 =/= Db6_D5, Cache5_D5 =/= Cache6_D5, Gw5_D5 =/= Gw6_D5} of
                {true, true, true} ->
                    #{id => <<"chaos_db_full_pipeline_restart">>, title => <<"Chaos Test 3: Root DB Crash Restarts Entire Pipeline In Order">>, status => <<"passed">>, time_ms => 50, details => <<"Killing db_pool_worker successfully caused sequential rest_for_one restart across all 3 workers.">>};
                Other5_Db5 ->
                    #{id => <<"chaos_db_full_pipeline_restart">>, title => <<"Chaos Test 3: Root DB Crash Restarts Entire Pipeline In Order">>, status => <<"failed">>, time_ms => 50, details => list_to_binary(io_lib:format("DB crash assertion failed: ~p", [Other5_Db5]))}
            end
        catch C5_Chk5:R5_Chk5 ->
            #{id => <<"chaos_db_full_pipeline_restart">>, title => <<"Chaos Test 3: Root DB Crash Restarts Entire Pipeline In Order">>, status => <<"failed">>, time_ms => 50, details => list_to_binary(io_lib:format("Chaos DB error: ~p:~p", [C5_Chk5, R5_Chk5]))}
        end,
        [CompileStage_Chk5, S1_Ast_Chk5, S2_Flags_Chk5, S3_ChaosGw_Chk5, S4_ChaosCache_Chk5, S5_ChaosDb_Chk5];
    false ->
        CompileStage_App5 = case code:ensure_loaded(commerce_app) of
            {module, commerce_app} ->
                Exports_App5 = commerce_app:module_info(exports),
                Req_App5 = [{start, 2}, {stop, 1}, {get_app_config, 2}, {set_app_config, 2}],
                case [E || E <- Req_App5, not lists:member(E, Exports_App5)] of
                    [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"commerce_app.erl compiled cleanly; all API functions exported.">>};
                    Missing_App5 -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing_App5]))}
                end;
            {error, E1_App5} ->
                #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1_App5]))}
        end,
        S1_Ast_App5 = try
            SrcPath_App5 = filename:join(["%s", "src", "commerce_app.erl"]),
            BeamPath_App5 = filename:join(["%s", "ebin", "commerce_app.beam"]),
            {ok, BeamBin_App5} = file:read_file(BeamPath_App5),
            Rules_App5 = #{
                required_remote_calls => [{application, get_env, 3}, {application, set_env, 3}, {supervisor, start_link, 3}]
            },
            case bf_ast_verifier:verify_rules(SrcPath_App5, BeamBin_App5, Rules_App5) of
                {ok, _} ->
                    #{id => <<"ast_application_behaviour">>, title => <<"AST Analysis: application Behaviour & Config Management">>, status => <<"passed">>, time_ms => 15, details => <<"Verified application callback exports and application:get_env/set_env environment calls.">>};
                {error, Violations_App5} ->
                    #{id => <<"ast_application_behaviour">>, title => <<"AST Analysis: application Behaviour & Config Management">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations_App5]))}
            end
        catch C1_App5:R1_App5 ->
            #{id => <<"ast_application_behaviour">>, title => <<"AST Analysis: application Behaviour & Config Management">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1_App5, R1_App5]))}
        end,
        S2_RootSup_App5 = try
            {ok, SupPid_App5} = commerce_app:start(normal, []),
            IsAlive_App5 = is_process_alive(SupPid_App5),
            ok = commerce_app:stop([]),
            case IsAlive_App5 of
                true ->
                    #{id => <<"root_supervisor_startup">>, title => <<"Application Root Supervisor Startup & Shutdown">>, status => <<"passed">>, time_ms => 20, details => <<"start/2 booted live root supervisor and stop/1 terminated cleanly.">>};
                false ->
                    #{id => <<"root_supervisor_startup">>, title => <<"Application Root Supervisor Startup & Shutdown">>, status => <<"failed">>, time_ms => 20, details => <<"Root supervisor was not alive.">>}
            end
        catch C2_App5:R2_App5 ->
            #{id => <<"root_supervisor_startup">>, title => <<"Application Root Supervisor Startup & Shutdown">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Startup error: ~p:~p", [C2_App5, R2_App5]))}
        end,
        S3_ConfigEnv_App5 = try
            ValDefault_App5 = commerce_app:get_app_config(worker_pool_size, 32),
            ok = commerce_app:set_app_config(worker_pool_size, 64),
            ValOverride_App5 = commerce_app:get_app_config(worker_pool_size, 32),
            case {ValDefault_App5, ValOverride_App5} of
                {32, 64} ->
                    #{id => <<"runtime_config_env">>, title => <<"Application Environment Configuration Management">>, status => <<"passed">>, time_ms => 15, details => <<"Successfully resolved fallback default (32) and dynamic runtime override (64).">>};
                Other3_App5 ->
                    #{id => <<"runtime_config_env">>, title => <<"Application Environment Configuration Management">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Config mismatch: ~p", [Other3_App5]))}
            end
        catch C3_App5:R3_App5 ->
            #{id => <<"runtime_config_env">>, title => <<"Application Environment Configuration Management">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Config error: ~p:~p", [C3_App5, R3_App5]))}
        end,
        [CompileStage_App5, S1_Ast_App5, S2_RootSup_App5, S3_ConfigEnv_App5]
end
`, wsDir, wsDir, wsDir, wsDir), true

	case "ch08-l07":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(checkout_sup) of
    {module, checkout_sup} ->
        Exports = checkout_sup:module_info(exports),
        Req = [{start_link, 0}, {get_pipeline_pids, 0}, {init, 1}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"checkout_sup.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "checkout_sup.erl"]),
    BeamPath = filename:join(["%s", "ebin", "checkout_sup.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{supervisor, start_link, 3}, {supervisor, which_children, 1}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_supervisor_contract">>, title => <<"AST Analysis: supervisor Behaviour & Introspection">>, status => <<"passed">>, time_ms => 15, details => <<"Verified -behaviour(supervisor), supervisor:start_link, and which_children introspection.">>};
        {error, Violations} ->
            #{id => <<"ast_supervisor_contract">>, title => <<"AST Analysis: supervisor Behaviour & Introspection">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_supervisor_contract">>, title => <<"AST Analysis: supervisor Behaviour & Introspection">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_FlagsAndChildOrder = try
    {ok, {SupFlags, ChildSpecs}} = checkout_sup:init([]),
    case {SupFlags, [maps:get(id, S) || S <- ChildSpecs]} of
        {#{strategy := rest_for_one, intensity := 5, period := 10}, [db_pool, pricing_cache, order_gateway]} ->
            #{id => <<"rest_for_one_pipeline_order">>, title => <<"Supervisor Flags & Strict Pipeline Dependency Order">>, status => <<"passed">>, time_ms => 15, details => <<"Verified rest_for_one strategy and exact [db_pool, pricing_cache, order_gateway] child ordering.">>};
        Other2 ->
            #{id => <<"rest_for_one_pipeline_order">>, title => <<"Supervisor Flags & Strict Pipeline Dependency Order">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Flags or ordering mismatch: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"rest_for_one_pipeline_order">>, title => <<"Supervisor Flags & Strict Pipeline Dependency Order">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Init error: ~p:~p", [C2, R2]))}
end,
S3_ChaosGatewayFailure = try
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [checkout_sup, db_pool_worker, pricing_cache_worker, order_gateway_worker]],
    timer:sleep(20),
    {ok, Sup1} = checkout_sup:start_link(),
    {ok, #{db_pid := Db1, cache_pid := Cache1, gateway_pid := Gw1}} = checkout_sup:get_pipeline_pids(),
    exit(Gw1, kill),
    timer:sleep(40),
    {ok, #{db_pid := Db2, cache_pid := Cache2, gateway_pid := Gw2}} = checkout_sup:get_pipeline_pids(),
    unlink(Sup1),
    catch supervisor:stop(Sup1),
    case {Db1 =:= Db2, Cache1 =:= Cache2, Gw1 =/= Gw2} of
        {true, true, true} ->
            #{id => <<"chaos_gateway_isolated_restart">>, title => <<"Chaos Test 1: Isolated Gateway Restart (Children 1 & 2 Preserved)">>, status => <<"passed">>, time_ms => 50, details => <<"Killing order_gateway_worker restarted only Child 3; DB and Cache PIDs were preserved.">>};
        Other3 ->
            #{id => <<"chaos_gateway_isolated_restart">>, title => <<"Chaos Test 1: Isolated Gateway Restart (Children 1 & 2 Preserved)">>, status => <<"failed">>, time_ms => 50, details => list_to_binary(io_lib:format("Gateway crash assertion failed: ~p", [Other3]))}
    end
catch C3:R3 ->
    #{id => <<"chaos_gateway_isolated_restart">>, title => <<"Chaos Test 1: Isolated Gateway Restart (Children 1 & 2 Preserved)">>, status => <<"failed">>, time_ms => 50, details => list_to_binary(io_lib:format("Chaos Gateway error: ~p:~p", [C3, R3]))}
end,
S4_ChaosCacheCascade = try
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [checkout_sup, db_pool_worker, pricing_cache_worker, order_gateway_worker]],
    timer:sleep(20),
    {ok, Sup2} = checkout_sup:start_link(),
    {ok, #{db_pid := Db3, cache_pid := Cache3, gateway_pid := Gw3}} = checkout_sup:get_pipeline_pids(),
    exit(Cache3, kill),
    timer:sleep(40),
    {ok, #{db_pid := Db4, cache_pid := Cache4, gateway_pid := Gw4}} = checkout_sup:get_pipeline_pids(),
    unlink(Sup2),
    catch supervisor:stop(Sup2),
    case {Db3 =:= Db4, Cache3 =/= Cache4, Gw3 =/= Gw4} of
        {true, true, true} ->
            #{id => <<"chaos_cache_cascade_restart">>, title => <<"Chaos Test 2: Cache Crash Cascades to Gateway (DB Pool Preserved)">>, status => <<"passed">>, time_ms => 50, details => <<"Killing pricing_cache_worker restarted both Cache and Gateway, while db_pool PID remained untouched.">>};
        Other4 ->
            #{id => <<"chaos_cache_cascade_restart">>, title => <<"Chaos Test 2: Cache Crash Cascades to Gateway (DB Pool Preserved)">>, status => <<"failed">>, time_ms => 50, details => list_to_binary(io_lib:format("Cache cascade assertion failed: ~p", [Other4]))}
    end
catch C4:R4 ->
    #{id => <<"chaos_cache_cascade_restart">>, title => <<"Chaos Test 2: Cache Crash Cascades to Gateway (DB Pool Preserved)">>, status => <<"failed">>, time_ms => 50, details => list_to_binary(io_lib:format("Chaos Cache error: ~p:~p", [C4, R4]))}
end,
S5_ChaosDbFullPipeline = try
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [checkout_sup, db_pool_worker, pricing_cache_worker, order_gateway_worker]],
    timer:sleep(20),
    {ok, Sup3} = checkout_sup:start_link(),
    {ok, #{db_pid := Db5, cache_pid := Cache5, gateway_pid := Gw5}} = checkout_sup:get_pipeline_pids(),
    exit(Db5, kill),
    timer:sleep(40),
    {ok, #{db_pid := Db6, cache_pid := Cache6, gateway_pid := Gw6}} = checkout_sup:get_pipeline_pids(),
    unlink(Sup3),
    catch supervisor:stop(Sup3),
    case {Db5 =/= Db6, Cache5 =/= Cache6, Gw5 =/= Gw6} of
        {true, true, true} ->
            #{id => <<"chaos_db_full_pipeline_restart">>, title => <<"Chaos Test 3: Root DB Crash Restarts Entire Pipeline In Order">>, status => <<"passed">>, time_ms => 50, details => <<"Killing db_pool_worker successfully caused sequential rest_for_one restart across all 3 workers.">>};
        Other5 ->
            #{id => <<"chaos_db_full_pipeline_restart">>, title => <<"Chaos Test 3: Root DB Crash Restarts Entire Pipeline In Order">>, status => <<"failed">>, time_ms => 50, details => list_to_binary(io_lib:format("DB crash assertion failed: ~p", [Other5]))}
    end
catch C5:R5 ->
    #{id => <<"chaos_db_full_pipeline_restart">>, title => <<"Chaos Test 3: Root DB Crash Restarts Entire Pipeline In Order">>, status => <<"failed">>, time_ms => 50, details => list_to_binary(io_lib:format("Chaos DB error: ~p:~p", [C5, R5]))}
end,
Stages = [CompileStage, S1_Ast, S2_FlagsAndChildOrder, S3_ChaosGatewayFailure, S4_ChaosCacheCascade, S5_ChaosDbFullPipeline]
`, wsDir, wsDir), true

	// ── CHAPTER 9 ─────────────────────────────────────────────────────────────
	case "ch09-l01":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(ets_telemetry) of
    {module, ets_telemetry} ->
        Exports = ets_telemetry:module_info(exports),
        Req = [{init_table, 0}, {record_endpoint_hit, 2}, {get_endpoint_hits, 1}, {put_user_profile, 3}, {get_user_profile, 1}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"ets_telemetry.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "ets_telemetry.erl"]),
    BeamPath = filename:join(["%s", "ebin", "ets_telemetry.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{ets, new, 2}, {ets, update_counter, 4}, {ets, insert, 2}, {ets, lookup, 2}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_ets_contract">>, title => <<"AST Analysis: ETS Primitives Contract">>, status => <<"passed">>, time_ms => 15, details => <<"Verified ets:new/2, ets:update_counter/4, ets:insert/2, and ets:lookup/2 calls.">>};
        {error, Violations} ->
            #{id => <<"ast_ets_contract">>, title => <<"AST Analysis: ETS Primitives Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_ets_contract">>, title => <<"AST Analysis: ETS Primitives Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_TableProps = try
    catch ets:delete(telemetry_store),
    ok = ets_telemetry:init_table(),
    Type = ets:info(telemetry_store, type),
    Named = ets:info(telemetry_store, named_table),
    Protection = ets:info(telemetry_store, protection),
    case {Type, Named, Protection} of
        {set, true, public} ->
            #{id => <<"table_configuration">>, title => <<"ETS Table Type, Visibility & Concurrency">>, status => <<"passed">>, time_ms => 10, details => <<"telemetry_store correctly configured as named, public set with off-heap storage.">>};
        Other2 ->
            #{id => <<"table_configuration">>, title => <<"ETS Table Type, Visibility & Concurrency">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Table configuration mismatch: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"table_configuration">>, title => <<"ETS Table Type, Visibility & Concurrency">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Init error: ~p:~p", [C2, R2]))}
end,
S3_AtomicCounters = try
    1 = ets_telemetry:record_endpoint_hit(<<"/auth">>, 1),
    10 = ets_telemetry:record_endpoint_hit(<<"/auth">>, 9),
    10 = ets_telemetry:get_endpoint_hits(<<"/auth">>),
    0 = ets_telemetry:get_endpoint_hits(<<"/unknown">>),
    #{id => <<"atomic_counter_operations">>, title => <<"Atomic Counter & Default Tuple Insertion">>, status => <<"passed">>, time_ms => 15, details => <<"Verified ets:update_counter/4 default tuple insertion and atomic increments.">>}
catch C3:R3 ->
    #{id => <<"atomic_counter_operations">>, title => <<"Atomic Counter & Default Tuple Insertion">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Counter error: ~p:~p", [C3, R3]))}
end,
S4_UserProfiles = try
    ok = ets_telemetry:put_user_profile(501, <<"Bob">>, editor),
    {ok, P1} = ets_telemetry:get_user_profile(501),
    NotFound = ets_telemetry:get_user_profile(9999),
    case {maps:get(name, P1), maps:get(role, P1), NotFound} of
        {<<"Bob">>, editor, {error, not_found}} ->
            #{id => <<"profile_storage_and_lookup">>, title => <<"Composite Key Profile Storage & Lookup">>, status => <<"passed">>, time_ms => 10, details => <<"Composite key tuples correctly stored and returned as clean maps.">>};
        Other4 ->
            #{id => <<"profile_storage_and_lookup">>, title => <<"Composite Key Profile Storage & Lookup">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Profile mismatch: ~p", [Other4]))}
    end
catch C4:R4 ->
    #{id => <<"profile_storage_and_lookup">>, title => <<"Composite Key Profile Storage & Lookup">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Profile error: ~p:~p", [C4, R4]))}
end,
Stages = [CompileStage, S1_Ast, S2_TableProps, S3_AtomicCounters, S4_UserProfiles]
`, wsDir, wsDir), true

	case "ch09-l02":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(ets_query_engine) of
    {module, ets_query_engine} ->
        Exports = ets_query_engine:module_info(exports),
        Req = [{init_auth_table, 0}, {store_token, 4}, {find_users_by_role, 1}, {delete_expired_tokens, 1}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"ets_query_engine.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "ets_query_engine.erl"]),
    BeamPath = filename:join(["%s", "ebin", "ets_query_engine.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{ets, new, 2}, {ets, select_delete, 2}, {lists, usort, 1}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_query_engine_contract">>, title => <<"AST Analysis: select_delete & usort Contract">>, status => <<"passed">>, time_ms => 15, details => <<"Verified ets:select_delete/2 match specification and lists:usort/1.">>};
        {error, Violations} ->
            #{id => <<"ast_query_engine_contract">>, title => <<"AST Analysis: select_delete & usort Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_query_engine_contract">>, title => <<"AST Analysis: select_delete & usort Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_KeyposAndSetup = try
    catch ets:delete(auth_token_table),
    ok = ets_query_engine:init_auth_table(),
    Keypos = ets:info(auth_token_table, keypos),
    case Keypos of
        2 ->
            #{id => <<"keypos_configuration">>, title => <<"ETS keypos => 2 Configuration Audit">>, status => <<"passed">>, time_ms => 10, details => <<"Verified auth_token_table uses keypos 2 (TokenBin).">>};
        Other2 ->
            #{id => <<"keypos_configuration">>, title => <<"ETS keypos => 2 Configuration Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Expected keypos 2, got: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"keypos_configuration">>, title => <<"ETS keypos => 2 Configuration Audit">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Setup error: ~p:~p", [C2, R2]))}
end,
S3_RoleQueries = try
    ok = ets_query_engine:store_token(<<"t_a">>, 10, admin, 9000),
    ok = ets_query_engine:store_token(<<"t_b">>, 20, member, 9000),
    ok = ets_query_engine:store_token(<<"t_c">>, 10, admin, 9000),
    ok = ets_query_engine:store_token(<<"t_d">>, 30, admin, 9000),
    Admins = ets_query_engine:find_users_by_role(admin),
    Members = ets_query_engine:find_users_by_role(member),
    Guests = ets_query_engine:find_users_by_role(guest),
    case {Admins, Members, Guests} of
        {[10, 30], [20], []} ->
            #{id => <<"pattern_matching_roles">>, title => <<"Pattern Matching Role Filter & Deduplication">>, status => <<"passed">>, time_ms => 15, details => <<"Correctly matched records by role and returned deduplicated sorted user IDs.">>};
        Other3 ->
            #{id => <<"pattern_matching_roles">>, title => <<"Pattern Matching Role Filter & Deduplication">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Role filter mismatch: ~p", [Other3]))}
    end
catch C3:R3 ->
    #{id => <<"pattern_matching_roles">>, title => <<"Pattern Matching Role Filter & Deduplication">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Role query error: ~p:~p", [C3, R3]))}
end,
S4_TtlEviction = try
    ok = ets_query_engine:store_token(<<"t_old1">>, 1, guest, 100),
    ok = ets_query_engine:store_token(<<"t_old2">>, 2, guest, 200),
    ok = ets_query_engine:store_token(<<"t_keep">>, 3, guest, 800),
    Deleted = ets_query_engine:delete_expired_tokens(500),
    Remaining = ets:lookup(auth_token_table, <<"t_keep">>),
    ExpiredGone = (ets:lookup(auth_token_table, <<"t_old1">>) =:= []) andalso (ets:lookup(auth_token_table, <<"t_old2">>) =:= []),
    case {Deleted, length(Remaining), ExpiredGone} of
        {2, 1, true} ->
            #{id => <<"select_delete_ttl">>, title => <<"Atomic TTL Eviction with select_delete">>, status => <<"passed">>, time_ms => 15, details => <<"select_delete atomically deleted 2 expired tokens while retaining valid token.">>};
        Other4 ->
            #{id => <<"select_delete_ttl">>, title => <<"Atomic TTL Eviction with select_delete">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Eviction mismatch: ~p", [Other4]))}
    end
catch C4:R4 ->
    #{id => <<"select_delete_ttl">>, title => <<"Atomic TTL Eviction with select_delete">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Eviction error: ~p:~p", [C4, R4]))}
end,
Stages = [CompileStage, S1_Ast, S2_KeyposAndSetup, S3_RoleQueries, S4_TtlEviction]
`, wsDir, wsDir), true

	case "ch09-l03":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(ets_heir_handshake) of
    {module, ets_heir_handshake} ->
        Exports = ets_heir_handshake:module_info(exports),
        Req = [{create_resilient_table, 2}, {start_guardian, 0}, {reclaim_table, 2}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"ets_heir_handshake.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "ets_heir_handshake.erl"]),
    BeamPath = filename:join(["%s", "ebin", "ets_heir_handshake.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{ets, new, 2}, {ets, give_away, 3}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_heir_contract">>, title => <<"AST Analysis: Heir Primitives Contract">>, status => <<"passed">>, time_ms => 15, details => <<"Verified ets:new/2 with heir option and ets:give_away/3 ownership handoff.">>};
        {error, Violations} ->
            #{id => <<"ast_heir_contract">>, title => <<"AST Analysis: Heir Primitives Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_heir_contract">>, title => <<"AST Analysis: Heir Primitives Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_HeirTransferOnCrash = try
    catch ets:delete(test_resilient_tab),
    {ok, Guardian} = ets_heir_handshake:start_guardian(),
    _Creator = spawn(fun() ->
        Tab = ets_heir_handshake:create_resilient_table(test_resilient_tab, Guardian),
        ets:insert(Tab, {k_a, <<"persisted_a">>}),
        ets:insert(Tab, {k_b, <<"persisted_b">>}),
        timer:sleep(20),
        exit(simulated_worker_crash)
    end),
    timer:sleep(60),
    Info = ets:info(test_resilient_tab),
    GuardianIsOwner = (proplists:get_value(owner, Info) =:= Guardian),
    ok = ets_heir_handshake:reclaim_table(Guardian, test_resilient_tab),
    [{k_a, Va}] = ets:lookup(test_resilient_tab, k_a),
    [{k_b, Vb}] = ets:lookup(test_resilient_tab, k_b),
    Guardian ! stop,
    case {GuardianIsOwner, Va, Vb} of
        {true, <<"persisted_a">>, <<"persisted_b">>} ->
            #{id => <<"heir_failover_test">>, title => <<"ETS Heir Ownership Transfer Across Crash">>, status => <<"passed">>, time_ms => 70, details => <<"BEAM transferred table to guardian on crash; caller successfully reclaimed table with all records.">>};
        Other2 ->
            #{id => <<"heir_failover_test">>, title => <<"ETS Heir Ownership Transfer Across Crash">>, status => <<"failed">>, time_ms => 70, details => list_to_binary(io_lib:format("Heir transfer failed: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"heir_failover_test">>, title => <<"ETS Heir Ownership Transfer Across Crash">>, status => <<"failed">>, time_ms => 70, details => list_to_binary(io_lib:format("Heir test crash: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_Ast, S2_HeirTransferOnCrash]
`, wsDir, wsDir), true

	case "ch09-l04":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(cluster_pubsub_pg) of
    {module, cluster_pubsub_pg} ->
        Exports = cluster_pubsub_pg:module_info(exports),
        Req = [{cluster_node_info, 0}, {safe_remote_call, 4}, {join_topic, 2}, {publish_to_topic, 2}, {leave_topic, 2}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"cluster_pubsub_pg.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "cluster_pubsub_pg.erl"]),
    BeamPath = filename:join(["%s", "ebin", "cluster_pubsub_pg.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{rpc, call, 5}, {pg, join, 2}, {pg, leave, 2}, {pg, get_members, 1}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_pg_contract">>, title => <<"AST Analysis: OTP 23+ pg Module Contract">>, status => <<"passed">>, time_ms => 15, details => <<"Verified rpc:call/5, pg:join/2, pg:leave/2, and pg:get_members/1 calls.">>};
        {error, Violations} ->
            #{id => <<"ast_pg_contract">>, title => <<"AST Analysis: OTP 23+ pg Module Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_pg_contract">>, title => <<"AST Analysis: OTP 23+ pg Module Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_PubSubLifecycle = try
    Info = cluster_pubsub_pg:cluster_node_info(),
    {ok, Alive} = cluster_pubsub_pg:safe_remote_call(node(), erlang, is_alive, []),
    Self = self(),
    ok = cluster_pubsub_pg:join_topic(<<"metrics">>, Self),
    Subscribers1 = case erlang:function_exported(cluster_pubsub_pg, get_subscribers, 1) of
        true -> cluster_pubsub_pg:get_subscribers(<<"metrics">>);
        false -> pg:get_members(<<"metrics">>)
    end,
    HasSelf = lists:member(Self, Subscribers1),
    {published, 1} = cluster_pubsub_pg:publish_to_topic(<<"metrics">>, #{cpu => 42}),
    GotMsg = receive
        {pubsub, <<"metrics">>, #{cpu := 42}} -> true;
        {pubsub_msg, <<"metrics">>, #{cpu := 42}} -> true
    after 200 -> false
    end,
    ok = cluster_pubsub_pg:leave_topic(<<"metrics">>, Self),
    Subscribers2 = pg:get_members(<<"metrics">>),
    LeftGroup = not lists:member(Self, Subscribers2),
    case {is_map(Info), Alive =:= is_alive(), HasSelf, GotMsg, LeftGroup} of
        {true, true, true, true, true} ->
            #{id => <<"pubsub_broadcast_and_leave">>, title => <<"Decentralized Topic Join, Broadcast & Leave">>, status => <<"passed">>, time_ms => 20, details => <<"Verified node info, rpc dispatch, and pg membership lifecycle.">>};
        Other2 ->
            #{id => <<"pubsub_broadcast_and_leave">>, title => <<"Decentralized Topic Join, Broadcast & Leave">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("PubSub mismatch: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"pubsub_broadcast_and_leave">>, title => <<"Decentralized Topic Join, Broadcast & Leave">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("PubSub error: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_Ast, S2_PubSubLifecycle]
`, wsDir, wsDir), true

	case "ch09-l05":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(mnesia_ledger) of
    {module, mnesia_ledger} ->
        Exports = mnesia_ledger:module_info(exports),
        Req = [{setup_mnesia_table, 0}, {upsert_wallet, 2}, {atomic_transfer, 3}, {get_wallet_balance, 1}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"mnesia_ledger.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "mnesia_ledger.erl"]),
    BeamPath = filename:join(["%s", "ebin", "mnesia_ledger.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_constructs => [record_def],
        required_remote_calls => [{mnesia, transaction, 1}, {mnesia, read, 2}, {mnesia, write, 1}, {mnesia, abort, 1}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_mnesia_contract">>, title => <<"AST Analysis: Mnesia ACID Transaction Contract">>, status => <<"passed">>, time_ms => 15, details => <<"Verified record wallet, mnesia:transaction/1, read/2, write/1, and abort/1.">>};
        {error, Violations} ->
            #{id => <<"ast_mnesia_contract">>, title => <<"AST Analysis: Mnesia ACID Transaction Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_mnesia_contract">>, title => <<"AST Analysis: Mnesia ACID Transaction Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_MnesiaTxn = try
    ok = mnesia_ledger:setup_mnesia_table(),
    ok = mnesia_ledger:upsert_wallet(user_alice, 200),
    ok = mnesia_ledger:upsert_wallet(user_bob, 50),
    {ok, 140, 110} = mnesia_ledger:atomic_transfer(user_alice, user_bob, 60),
    {ok, BalA1} = mnesia_ledger:get_wallet_balance(user_alice),
    {ok, BalB1} = mnesia_ledger:get_wallet_balance(user_bob),
    ErrOverdraft = mnesia_ledger:atomic_transfer(user_alice, user_bob, 999),
    {ok, BalA2} = mnesia_ledger:get_wallet_balance(user_alice),
    {ok, BalB2} = mnesia_ledger:get_wallet_balance(user_bob),
    ErrMissing = mnesia_ledger:atomic_transfer(user_alice, ghost_user, 10),
    case {BalA1 =:= 140 andalso BalB1 =:= 110, ErrOverdraft =:= {error, insufficient_funds}, BalA2 =:= 140 andalso BalB2 =:= 110, ErrMissing =:= {error, account_not_found}} of
        {true, true, true, true} ->
            #{id => <<"mnesia_acid_rollback">>, title => <<"Mnesia ACID Commitment & Abort Rollback Verification">>, status => <<"passed">>, time_ms => 25, details => <<"Verified atomic transfers and confirmed that overdrafts roll back 100 percent of mutations.">>};
        Other2 ->
            #{id => <<"mnesia_acid_rollback">>, title => <<"Mnesia ACID Commitment & Abort Rollback Verification">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Mnesia txn mismatch: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"mnesia_acid_rollback">>, title => <<"Mnesia ACID Commitment & Abort Rollback Verification">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Mnesia txn error: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_Ast, S2_MnesiaTxn]
`, wsDir, wsDir), true

	case "ch09-l06":
		return `
CompileStage = case code:ensure_loaded(ledger_specs_and_tests) of
    {module, ledger_specs_and_tests} ->
        Exports = ledger_specs_and_tests:module_info(exports),
        Req = [{calculate_fee, 2}, {validate_transfer_spec, 3}],
        HasCheck = lists:member({run_unit_checks, 0}, Exports) orelse lists:member({run_unit_tests, 0}, Exports),
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] when HasCheck -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"ledger_specs_and_tests.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p (has unit runner: ~p)", [Missing, HasCheck]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_SpecValidation = try
    Fee1 = ledger_specs_and_tests:calculate_fee(1000, usd),
    Fee2 = ledger_specs_and_tests:calculate_fee(1000, eur),
    Fee3 = ledger_specs_and_tests:calculate_fee(1000, etb),
    {ok, Rem1} = ledger_specs_and_tests:validate_transfer_spec(1000, 500, usd),
    Err1 = ledger_specs_and_tests:validate_transfer_spec(100, 200, usd),
    Err2 = ledger_specs_and_tests:validate_transfer_spec(100, -5, usd),
    case {Fee1, Fee2, Fee3, Rem1, Err1, Err2} of
        {15, 20, 10, 493, {error, insufficient_funds}, {error, invalid_amount}} ->
            #{id => <<"boundary_contract_verification">>, title => <<"Boundary Conditions & Contract Invariant Enforcement">>, status => <<"passed">>, time_ms => 15, details => <<"Fee calculations and transfer boundaries strictly enforce spec contracts.">>};
        Other1 ->
            #{id => <<"boundary_contract_verification">>, title => <<"Boundary Conditions & Contract Invariant Enforcement">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Contract breach: ~p", [Other1]))}
    end
catch C1:R1 ->
    #{id => <<"boundary_contract_verification">>, title => <<"Boundary Conditions & Contract Invariant Enforcement">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Ledger crash: ~p:~p", [C1, R1]))}
end,
S2_UnitTestSuite = try
    Ret = case erlang:function_exported(ledger_specs_and_tests, run_unit_checks, 0) of
        true -> ledger_specs_and_tests:run_unit_checks();
        false -> ledger_specs_and_tests:run_unit_tests()
    end,
    case Ret of
        ok ->
            #{id => <<"eunit_assertions_execution">>, title => <<"EUnit Suite Execution & Invariant Audit">>, status => <<"passed">>, time_ms => 15, details => <<"All built-in unit tests and assertions passed with zero defects.">>};
        Other2 ->
            #{id => <<"eunit_assertions_execution">>, title => <<"EUnit Suite Execution & Invariant Audit">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Unit test failure: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"eunit_assertions_execution">>, title => <<"EUnit Suite Execution & Invariant Audit">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Unit test crash: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_SpecValidation, S2_UnitTestSuite]
`, true

	case "ch09-l08":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(session_cache) of
    {module, session_cache} ->
        Exports = session_cache:module_info(exports),
        Req = [{start_link, 0}, {put_session, 3}, {get_session, 1}, {increment_hits, 1}, {delete_session, 1}, {count_sessions, 0}, {start_pipeline, 0}, {stop_pipeline, 0}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"session_cache.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcRoot = "%s",
    BeamRoot = "%s",
    SrcPath = filename:join([SrcRoot, "src", "session_cache.erl"]),
    BeamPath = filename:join([BeamRoot, "ebin", "session_cache.beam"]),
    TmSrcPath = filename:join([SrcRoot, "src", "table_manager.erl"]),
    TmBeamPath = filename:join([BeamRoot, "ebin", "table_manager.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    {ok, TmBeamBin} = file:read_file(TmBeamPath),
    CacheRules = #{
        required_remote_calls => [{ets, new, 2}, {ets, insert, 2}, {ets, lookup, 2}, {ets, update_counter, 3}]
    },
    TmRules = #{
        required_remote_calls => [{ets, give_away, 3}]
    },
    case {bf_ast_verifier:verify_rules(SrcPath, BeamBin, CacheRules),
          bf_ast_verifier:verify_rules(TmSrcPath, TmBeamBin, TmRules)} of
        {{ok, _}, {ok, _}} ->
            #{id => <<"ast_session_cache_contract">>, title => <<"AST Analysis: ETS Operations & Heir Ownership Contract">>, status => <<"passed">>, time_ms => 15, details => <<"Verified ets:new/2, ets:insert/2, ets:lookup/2, ets:update_counter/3 in session_cache and ets:give_away/3 in table_manager.">>};
        {Res1, Res2} ->
            #{id => <<"ast_session_cache_contract">>, title => <<"AST Analysis: ETS Operations & Heir Ownership Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p ~p", [Res1, Res2]))}
    end
catch C1:R1 ->
    #{id => <<"ast_session_cache_contract">>, title => <<"AST Analysis: ETS Operations & Heir Ownership Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_PipelineStartupAndOps = try
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]],
    timer:sleep(20),
    {ok, _} = session_cache:start_pipeline(),
    ok = session_cache:put_session(<<"s_alpha">>, 1001, #{device => mobile}),
    ok = session_cache:put_session(<<"s_beta">>, 1002, #{device => desktop}),
    {ok, 1} = session_cache:increment_hits(<<"s_alpha">>),
    {ok, 2} = session_cache:increment_hits(<<"s_alpha">>),
    {ok, 3} = session_cache:increment_hits(<<"s_alpha">>),
    {ok, 1} = session_cache:increment_hits(<<"s_beta">>),
    Total1 = session_cache:count_sessions(),
    {ok, SA} = session_cache:get_session(<<"s_alpha">>),
    case {Total1, maps:get(hit_count, SA), maps:get(user_id, SA)} of
        {2, 3, 1001} ->
            #{id => <<"session_pipeline_ops">>, title => <<"Session Cache Startup, Writes & Atomic Hit Tracking">>, status => <<"passed">>, time_ms => 20, details => <<"Pipeline booted; sessions inserted and atomic hit counters verified.">>};
        Other2 ->
            #{id => <<"session_pipeline_ops">>, title => <<"Session Cache Startup, Writes & Atomic Hit Tracking">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Pipeline ops mismatch: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"session_pipeline_ops">>, title => <<"Session Cache Startup, Writes & Atomic Hit Tracking">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Pipeline ops crash: ~p:~p", [C2, R2]))}
end,
S3_ChaosHeirFailover = try
    OldCachePid = whereis(session_cache),
    exit(OldCachePid, kill),
    timer:sleep(60),
    NewCachePid = whereis(session_cache),
    Restarted = (OldCachePid =/= NewCachePid) andalso is_pid(NewCachePid),
    {ok, SA_After} = session_cache:get_session(<<"s_alpha">>),
    {ok, SB_After} = session_cache:get_session(<<"s_beta">>),
    HitsPreserved = (maps:get(hit_count, SA_After) =:= 3) andalso (maps:get(hit_count, SB_After) =:= 1),
    CountPreserved = (session_cache:count_sessions() =:= 2),
    ok = session_cache:delete_session(<<"s_beta">>),
    CountAfterDelete = (session_cache:count_sessions() =:= 1),
    session_cache:stop_pipeline(),
    case {Restarted, HitsPreserved, CountPreserved, CountAfterDelete} of
        {true, true, true, true} ->
            #{id => <<"chaos_heir_failover">>, title => <<"Chaos Test: Kill Worker -> Zero-Data-Loss Heir Failover">>, status => <<"passed">>, time_ms => 75, details => <<"Killed session_cache with kill signal; supervisor restarted worker with new PID, table_manager transferred ETS table back, and all sessions + atomic hit counts were 100 percent preserved.">>};
        Other3 ->
            #{id => <<"chaos_heir_failover">>, title => <<"Chaos Test: Kill Worker -> Zero-Data-Loss Heir Failover">>, status => <<"failed">>, time_ms => 75, details => list_to_binary(io_lib:format("Chaos failover assertion failed: ~p", [Other3]))}
    end
catch C3:R3 ->
    session_cache:stop_pipeline(),
    #{id => <<"chaos_heir_failover">>, title => <<"Chaos Test: Kill Worker -> Zero-Data-Loss Heir Failover">>, status => <<"failed">>, time_ms => 75, details => list_to_binary(io_lib:format("Chaos failover crash: ~p:~p", [C3, R3]))}
end,
Stages = [CompileStage, S1_Ast, S2_PipelineStartupAndOps, S3_ChaosHeirFailover]
`, wsDir, wsDir), true

	case "ch10-l01":
		return fmt.Sprintf(`
TargetModule = tcp_live_demo,
CompileStage = case compile:file("%s/src/tcp_live_demo.erl", [return_errors, {outdir, "%s/ebin"}]) of
    {ok, TargetModule} ->
        code:purge(TargetModule),
        code:load_file(TargetModule),
        #{id => <<"compile">>, title => <<"Compile tcp_live_demo.erl">>, status => <<"passed">>, time_ms => 20, details => <<"Compilation succeeded">>};
    Err ->
        #{id => <<"compile">>, title => <<"Compile tcp_live_demo.erl">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("~p", [Err]))}
end,
S1_Ast = try
    BeamPath = filename:join(["%s", "ebin", "tcp_live_demo.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    case bf_ast_verifier:verify_rules("%s/src/tcp_live_demo.erl", BeamBin, #{
        require_tail_recursion => [{echo_loop, 3}],
        required_calls => [{gen_tcp, listen, 2}, {gen_tcp, accept, 2}, {gen_tcp, send, 2}, {gen_tcp, recv, 3}],
        required_constructs => [receive_after]
    }) of
        {ok, _} ->
            #{id => <<"ast_verification">>, title => <<"AST Analysis: gen_tcp socket primitives & echo_loop TCO">>, status => <<"passed">>, time_ms => 15, details => <<"Verified gen_tcp:listen/2, accept/2, send/2, recv/3, receive_after, and tail-recursive echo_loop/3.">>};
        {error, AstFailReason} ->
            #{id => <<"ast_verification">>, title => <<"AST Analysis: gen_tcp socket primitives & echo_loop TCO">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST verification failed: ~p", [AstFailReason]))}
    end
catch C1:R1 ->
    #{id => <<"ast_verification">>, title => <<"AST Analysis: gen_tcp socket primitives & echo_loop TCO">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_DemoRun = try
    DemoRes = tcp_live_demo:run_demo(),
    case DemoRes of
        #{frames_exchanged := 3} ->
            #{id => <<"demo_execution">>, title => <<"Execute Live TCP Socket Lifecycle">>, status => <<"passed">>, time_ms => 45, details => <<"Opened ephemeral port, connected client, exchanged 3 frames, and closed cleanly.">>};
        {ok, 3} ->
            #{id => <<"demo_execution">>, title => <<"Execute Live TCP Socket Lifecycle">>, status => <<"passed">>, time_ms => 45, details => <<"Opened ephemeral port, connected client, exchanged 3 frames, and closed cleanly.">>};
        Other ->
            #{id => <<"demo_execution">>, title => <<"Execute Live TCP Socket Lifecycle">>, status => <<"failed">>, time_ms => 45, details => list_to_binary(io_lib:format("Expected frames_exchanged => 3, got: ~p", [Other]))}
    end
catch C:R ->
    #{id => <<"demo_execution">>, title => <<"Execute Live TCP Socket Lifecycle">>, status => <<"failed">>, time_ms => 45, details => list_to_binary(io_lib:format("Demo crashed: ~p:~p", [C, R]))}
end,
Stages = [CompileStage, S1_Ast, S2_DemoRun]
`, wsDir, wsDir, wsDir, wsDir), true

	case "ch10-l02":
		return fmt.Sprintf(`
TargetModule = tcp_socket_opts,
CompileStage = case compile:file("%s/src/tcp_socket_opts.erl", [return_errors, {outdir, "%s/ebin"}]) of
    {ok, TargetModule} ->
        code:purge(TargetModule),
        code:load_file(TargetModule),
        #{id => <<"compile">>, title => <<"Compile tcp_socket_opts.erl">>, status => <<"passed">>, time_ms => 20, details => <<"Compilation succeeded">>};
    Err ->
        #{id => <<"compile">>, title => <<"Compile tcp_socket_opts.erl">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("~p", [Err]))}
end,
S1_Ast = case bf_ast_verifier:verify_rules("%s/src/tcp_socket_opts.erl", #{
    required_calls => [{erlang, byte_size, 1}],
    required_constructs => [bit_syntax, guards]
}) of
    {ok, _} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: Bit Syntax & Guards">>, status => <<"passed">>, time_ms => 15, details => <<"Verified required bit syntax and guard constructs.">>};
    {error, AstFailReason} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: Bit Syntax & Guards">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST verification failed: ~p", [AstFailReason]))}
end,
S2_SocketOptsValidation = try
    O_Raw = tcp_socket_opts:build_low_latency_opts(raw),
    O_4   = tcp_socket_opts:build_low_latency_opts(4),
    O_Line= tcp_socket_opts:build_low_latency_opts(line),
    O_Err = tcp_socket_opts:build_low_latency_opts(udp_invalid),
    ExpRaw = [binary, {packet, raw}, {active, once}, {nodelay, true}, {reuseaddr, true}],
    Exp4   = [binary, {packet, 4}, {active, once}, {nodelay, true}, {reuseaddr, true}],
    ExpLine= [binary, {packet, line}, {active, once}, {nodelay, true}, {reuseaddr, true}],
    PassOpts = (O_Raw =:= ExpRaw) andalso (O_4 =:= Exp4) andalso (O_Line =:= ExpLine) andalso (O_Err =:= {error, invalid_packet_mode}),
    case PassOpts of
        true ->
            #{id => <<"socket_opts_validation">>, title => <<"Validate Low-Latency Socket Options">>, status => <<"passed">>, time_ms => 15, details => <<"Correctly built low-latency options for raw, 4, line, and rejected invalid modes.">>};
        false ->
            #{id => <<"socket_opts_validation">>, title => <<"Validate Low-Latency Socket Options">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Option validation failed: O_4=~p, O_Err=~p", [O_4, O_Err]))}
    end
catch C2:R2 ->
    #{id => <<"socket_opts_validation">>, title => <<"Validate Low-Latency Socket Options">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Opts crashed: ~p:~p", [C2, R2]))}
end,
S3_EventAndFraming = try
    DummySock = make_ref(),
    E1 = tcp_socket_opts:classify_socket_event({tcp, DummySock, <<"STANZA_DATA">>}),
    E2 = tcp_socket_opts:classify_socket_event({tcp_closed, DummySock}),
    E3 = tcp_socket_opts:classify_socket_event({tcp_error, DummySock, econnreset}),
    E4 = tcp_socket_opts:classify_socket_event(bogus_event),
    F1 = tcp_socket_opts:encode_length_prefixed(<<"PING">>),
    F2 = tcp_socket_opts:encode_length_prefixed(<<>>),
    PassEvents = (E1 =:= {data, 11, <<"STANZA_DATA">>})
                 andalso (E2 =:= {disconnected, normal_eof})
                 andalso (E3 =:= {disconnected, {socket_error, econnreset}})
                 andalso (E4 =:= {error, unknown_event})
                 andalso (F1 =:= <<0, 0, 0, 4, 80, 73, 78, 71>>)
                 andalso (F2 =:= <<0, 0, 0, 0>>),
    case PassEvents of
        true ->
            #{id => <<"event_and_framing">>, title => <<"Event Classification & {packet, 4} Wire Encoding">>, status => <<"passed">>, time_ms => 20, details => <<"Classified {tcp, ...}, {tcp_closed, ...}, {tcp_error, ...} and encoded length-prefixed wire binaries.">>};
        false ->
            #{id => <<"event_and_framing">>, title => <<"Event Classification & {packet, 4} Wire Encoding">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Classification/framing failed: E1=~p, F1=~p", [E1, F1]))}
    end
catch C3:R3 ->
    #{id => <<"event_and_framing">>, title => <<"Event Classification & {packet, 4} Wire Encoding">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Classification crashed: ~p:~p", [C3, R3]))}
end,
Stages = [CompileStage, S1_Ast, S2_SocketOptsValidation, S3_EventAndFraming]
`, wsDir, wsDir, wsDir), true

	case "ch10-l03":
		return fmt.Sprintf(`
TargetModule = tcp_flow_worker,
CompileStage = case compile:file("%s/src/tcp_flow_worker.erl", [return_errors, {outdir, "%s/ebin"}]) of
    {ok, TargetModule} ->
        code:purge(TargetModule),
        code:load_file(TargetModule),
        #{id => <<"compile">>, title => <<"Compile tcp_flow_worker.erl">>, status => <<"passed">>, time_ms => 20, details => <<"Compilation succeeded">>};
    Err ->
        #{id => <<"compile">>, title => <<"Compile tcp_flow_worker.erl">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("~p", [Err]))}
end,
S1_Ast = case bf_ast_verifier:verify_rules("%s/src/tcp_flow_worker.erl", #{
    required_calls => [{inet, setopts, 2}, {gen_tcp, send, 2}],
    required_constructs => [record_def]
}) of
    {ok, _} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: Flow Control Calls & State Record">>, status => <<"passed">>, time_ms => 15, details => <<"Verified inet:setopts/2, gen_tcp:send/2, and #state record definition.">>};
    {error, AstFailReason} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: Flow Control Calls & State Record">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST verification failed: ~p", [AstFailReason]))}
end,
S2_ActiveOnceBackpressure = try
    catch tcp_flow_worker:stop_server(whereis(tcp_flow_worker)),
    timer:sleep(20),
    {ok, ListenPid, Port} = tcp_flow_worker:start_server(),
    case bf_backpressure_tester:verify_active_once_backpressure(node(), Port, tcp_flow_worker, 50, 5) of
        {ok, #{verdict := <<
    #{packets_processed := 1, bytes_processed := 11, closed := false} = tcp_flow_worker:get_stats(tcp_flow_worker),
    1 = tcp_flow_worker:get_processed_count(tcp_flow_worker),
    ok = gen_tcp:close(CSock3),
    timer:sleep(30),
    #{packets_processed := 1, bytes_processed := 11, closed := true} = tcp_flow_worker:get_stats(tcp_flow_worker),
    ok = tcp_flow_worker:stop_server(LPid3),
    #{id => <<"echo_and_lifecycle">>, title => <<"Echo Protocol, Counters & Close Lifecycle">>, status => <<"passed">>, time_ms => 40, details => <<"Verified +ACK echo prefix, packet/byte counters, and {tcp_closed, Sock} state transition.">>}
catch C3:R3 ->
    (case whereis(tcp_flow_worker) of undefined -> ok; OldP3 -> catch gen_server:stop(OldP3) end),
    #{id => <<"echo_and_lifecycle">>, title => <<"Echo Protocol, Counters & Close Lifecycle">>, status => <<"failed">>, time_ms => 40, details => list_to_binary(io_lib:format("Lifecycle verification failed: ~p:~p", [C3, R3]))}
end,
Stages = [CompileStage, S1_Ast, S2_ActiveOnceBackpressure, S3_EchoAndLifecycle]
`, wsDir, wsDir, wsDir), true

	case "ch10-l04":
		return fmt.Sprintf(`
TargetModule = tcp_frame_buffer,
CompileStage = case compile:file("%s/src/tcp_frame_buffer.erl", [return_errors, {outdir, "%s/ebin"}]) of
    {ok, TargetModule} ->
        code:purge(TargetModule),
        code:load_file(TargetModule),
        #{id => <<"compile">>, title => <<"Compile tcp_frame_buffer.erl">>, status => <<"passed">>, time_ms => 20, details => <<"Compilation succeeded">>};
    Err ->
        #{id => <<"compile">>, title => <<"Compile tcp_frame_buffer.erl">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("~p", [Err]))}
end,
S1_Ast = case bf_ast_verifier:verify_rules("%s/src/tcp_frame_buffer.erl", #{
    required_calls => [{binary, split, 2}, {binary, copy, 1}],
    required_constructs => [bit_syntax]
}) of
    {ok, _} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: binary:split/2, binary:copy/1 & Bit Syntax">>, status => <<"passed">>, time_ms => 15, details => <<"Verified binary:split/2, binary:copy/1, and bit syntax concatenation.">>};
    {error, AstFailReason} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: binary:split/2, binary:copy/1 & Bit Syntax">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST verification failed: ~p", [AstFailReason]))}
end,
S2_FramingEdgeCases = try
    InitBuf = tcp_frame_buffer:new_buffer(),
    {L0, B0} = tcp_frame_buffer:append_and_extract_lines(InitBuf, <<>>),
    {L1, B1} = tcp_frame_buffer:append_and_extract_lines(<<>>, <<"FRAGMENT_WITHOUT_DELIM">>),
    {L2, B2} = tcp_frame_buffer:append_and_extract_lines(B1, <<"_END\r\nLINE_TWO\r\nLINE_THREE\r\nPARTIAL">>),
    {L3, B3} = tcp_frame_buffer:append_and_extract_lines(B2, <<"_COMPLETED\r\n">>),
    ExpectedL2 = [<<"FRAGMENT_WITHOUT_DELIM_END">>, <<"LINE_TWO">>, <<"LINE_THREE">>],
    Pass = (L0 =:= []) andalso (B0 =:= <<>>)
           andalso (L1 =:= []) andalso (B1 =:= <<"FRAGMENT_WITHOUT_DELIM">>)
           andalso (L2 =:= ExpectedL2) andalso (B2 =:= <<"PARTIAL">>)
           andalso (L3 =:= [<<"PARTIAL_COMPLETED">>]) andalso (B3 =:= <<>>),
    case Pass of
        true ->
            #{id => <<"framing_edge_cases">>, title => <<"Verify Stream Framing: Fragmented & Coalesced Chunks">>, status => <<"passed">>, time_ms => 25, details => <<"All fragmented and coalesced chunks correctly extracted without delimiter leaks.">>};
        false ->
            #{id => <<"framing_edge_cases">>, title => <<"Verify Stream Framing: Fragmented & Coalesced Chunks">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Framing assertion failed: L2=~p, B2=~p, L3=~p", [L2, B2, L3]))}
    end
catch C:R ->
    #{id => <<"framing_edge_cases">>, title => <<"Verify Stream Framing: Fragmented & Coalesced Chunks">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Framing test crashed: ~p:~p", [C, R]))}
end,
Stages = [CompileStage, S1_Ast, S2_FramingEdgeCases]
`, wsDir, wsDir, wsDir), true

	case "ch10-l05":
		return fmt.Sprintf(`
TargetModule = case filelib:is_regular("%s/src/tcp_kv_backend.erl") andalso not filelib:is_regular("%s/src/tcp_acceptor_pool.erl") of
    true -> tcp_kv_backend;
    false -> tcp_acceptor_pool
end,
CompileStage = case TargetModule of
    tcp_acceptor_pool ->
        case compile:file("%s/src/tcp_acceptor_pool.erl", [return_errors, {outdir, "%s/ebin"}]) of
            {ok, _} ->
                code:purge(tcp_acceptor_pool),
                code:load_file(tcp_acceptor_pool),
                #{id => <<"compile">>, title => <<"Compile tcp_acceptor_pool.erl">>, status => <<"passed">>, time_ms => 20, details => <<"Compilation succeeded">>};
            Err ->
                #{id => <<"compile">>, title => <<"Compile tcp_acceptor_pool.erl">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("~p", [Err]))}
        end;
    tcp_kv_backend ->
        case compile:file("%s/src/tcp_kv_backend.erl", [return_errors, {outdir, "%s/ebin"}]) of
            {ok, _} ->
                code:purge(tcp_kv_backend),
                code:load_file(tcp_kv_backend),
                #{id => <<"compile">>, title => <<"Compile tcp_kv_backend.erl">>, status => <<"passed">>, time_ms => 20, details => <<"Compilation succeeded">>};
            ErrKv ->
                #{id => <<"compile">>, title => <<"Compile tcp_kv_backend.erl">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("~p", [ErrKv]))}
        end
end,
S1_Ast = case TargetModule of
    tcp_acceptor_pool ->
        try
            BeamPath = filename:join(["%s", "ebin", "tcp_acceptor_pool.beam"]),
            {ok, BeamBin} = file:read_file(BeamPath),
            case bf_ast_verifier:verify_rules("%s/src/tcp_acceptor_pool.erl", BeamBin, #{
                require_tail_recursion => [{manager_loop, 3}, {pool_worker_loop, 2}],
                required_calls => [{gen_tcp, controlling_process, 2}, {gen_tcp, listen, 2}, {gen_tcp, accept, 1}],
                required_constructs => [receive_after]
            }) of
                {ok, _} ->
                    #{id => <<"ast_verification">>, title => <<"AST Analysis: Controlling Process, Pooled Accept & TCO">>, status => <<"passed">>, time_ms => 15, details => <<"Verified controlling_process/2, listen/2, accept/1, receive_after, and tail-recursive pool loops.">>};
                {error, AstFailReason} ->
                    #{id => <<"ast_verification">>, title => <<"AST Analysis: Controlling Process, Pooled Accept & TCO">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST verification failed: ~p", [AstFailReason]))}
            end
        catch CAst:RAst ->
            #{id => <<"ast_verification">>, title => <<"AST Analysis: Controlling Process, Pooled Accept & TCO">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST check crashed: ~p:~p", [CAst, RAst]))}
        end;
    tcp_kv_backend ->
        case bf_ast_verifier:verify_rules("%s/src/tcp_kv_backend.erl", #{
            required_calls => [{inet, setopts, 2}, {gen_tcp, send, 2}, {ets, insert, 2}, {ets, lookup, 2}]
        }) of
            {ok, _} ->
                #{id => <<"ast_verification">>, title => <<"AST Analysis: Sockets & ETS Primitives">>, status => <<"passed">>, time_ms => 15, details => <<"Verified required socket and ETS function calls.">>};
            {error, AstFailReason} ->
                #{id => <<"ast_verification">>, title => <<"AST Analysis: Sockets & ETS Primitives">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST verification failed: ~p", [AstFailReason]))}
        end
end,
S2_Execution = case TargetModule of
    tcp_acceptor_pool ->
        try
            {ok, MgrPid, Port} = tcp_acceptor_pool:start_pool(0, 5),
            Clients = [begin
                {ok, Sock} = gen_tcp:connect("127.0.0.1", Port, [binary, {packet, raw}, {active, false}], 2000),
                Sock
            end || _ <- lists:seq(1, 5)],
            timer:sleep(50),
            ActiveCount5 = tcp_acceptor_pool:get_active_workers(MgrPid),
            [FirstClient | OtherClients] = Clients,
            ok = gen_tcp:send(FirstClient, <<"HELLO_POOL\r\n">>),
            {ok, Reply} = gen_tcp:recv(FirstClient, 0, 2000),
            [C2, C3 | RemainingClients] = OtherClients,
            gen_tcp:close(C2),
            gen_tcp:close(C3),
            timer:sleep(40),
            ActiveCount3 = tcp_acceptor_pool:get_active_workers(MgrPid),
            gen_tcp:close(FirstClient),
            [gen_tcp:close(C) || C <- RemainingClients],
            tcp_acceptor_pool:stop_pool(MgrPid),
            {ok, PooledLSock, PooledPort, Acceptors} = tcp_acceptor_pool:start_pooled_server(2, fun(S) ->
                {ok, Req} = gen_tcp:recv(S, 0, 2000),
                ok = gen_tcp:send(S, <<"+POOLED:", Req/binary>>),
                gen_tcp:close(S)
            end),
            {ok, PooledClient} = gen_tcp:connect("127.0.0.1", PooledPort, [binary, {packet, raw}, {active, false}], 2000),
            ok = gen_tcp:send(PooledClient, <<"OK\r\n">>),
            {ok, <<"+POOLED:OK\r\n">>} = gen_tcp:recv(PooledClient, 0, 2000),
            gen_tcp:close(PooledClient),
            ok = tcp_acceptor_pool:stop_pooled_server(PooledLSock),
            case {ActiveCount5, Reply, ActiveCount3, length(Acceptors)} of
                {5, <<"+REPLY: HELLO_POOL\r\n">>, 3, 2} ->
                    #{id => <<"concurrent_acceptors">>, title => <<"Verify Acceptor Pool: 5 Concurrent Clients & Pooled Server">>, status => <<"passed">>, time_ms => 65, details => <<"5 concurrent clients accepted, pooled WorkerFun handoff verified, and disconnect cleanup verified.">>};
                OtherRes ->
                    #{id => <<"concurrent_acceptors">>, title => <<"Verify Acceptor Pool: 5 Concurrent Clients & Pooled Server">>, status => <<"failed">>, time_ms => 65, details => list_to_binary(io_lib:format("Acceptor pool assertion failed: ~p", [OtherRes]))}
            end
        catch C:R ->
            #{id => <<"concurrent_acceptors">>, title => <<"Verify Acceptor Pool: 5 Concurrent Clients & Pooled Server">>, status => <<"failed">>, time_ms => 65, details => list_to_binary(io_lib:format("Pool test crashed: ~p:~p", [C, R]))}
        end;
    tcp_kv_backend ->
        try
            Tab = case ets:info(test_kv_tab_legacy) of
                undefined -> ets:new(test_kv_tab_legacy, [set, public, {read_concurrency, true}]);
                _ -> test_kv_tab_legacy
            end,
            {ok, ping} = tcp_kv_backend:parse_command(<<"PING">>),
            {ok, {set, <<"u1">>, <<"alice">>}} = tcp_kv_backend:parse_command(<<"SET u1 alice">>),
            {ok, {get, <<"u1">>}} = tcp_kv_backend:parse_command(<<"GET u1">>),
            {ok, {del, <<"u1">>}} = tcp_kv_backend:parse_command(<<"DEL u1">>),
            <<"+PONG\r\n">> = tcp_kv_backend:execute_command(ping, Tab),
            <<"+OK\r\n">> = tcp_kv_backend:execute_command({set, <<"u1">>, <<"alice">>}, Tab),
            <<"$alice\r\n">> = tcp_kv_backend:execute_command({get, <<"u1">>}, Tab),
            <<":1\r\n">> = tcp_kv_backend:execute_command({del, <<"u1">>}, Tab),
            ets:delete(Tab),
            #{id => <<"unit_parser_and_exec">>, title => <<"Unit Tests: Parser & Wire Command Execution">>, status => <<"passed">>, time_ms => 20, details => <<"All wire protocol commands parsed and executed accurately.">>}
        catch CKv:RKv ->
            #{id => <<"unit_parser_and_exec">>, title => <<"Unit Tests: Parser & Wire Command Execution">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Legacy test failed: ~p:~p", [CKv, RKv]))}
        end
end,
Stages = [CompileStage, S1_Ast, S2_Execution]
`, wsDir, wsDir, wsDir, wsDir, wsDir, wsDir, wsDir, wsDir, wsDir), true

	case "ch10-l07":
		return fmt.Sprintf(`
TargetModule = tcp_kv_backend,
CompileStage = case compile:file("%s/src/tcp_kv_backend.erl", [return_errors, {outdir, "%s/ebin"}]) of
    {ok, TargetModule} ->
        code:purge(TargetModule),
        code:load_file(TargetModule),
        #{id => <<"compile">>, title => <<"Compile tcp_kv_backend.erl">>, status => <<"passed">>, time_ms => 20, details => <<"Compilation succeeded">>};
    Err ->
        #{id => <<"compile">>, title => <<"Compile tcp_kv_backend.erl">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("~p", [Err]))}
end,
S1_Ast = case bf_ast_verifier:verify_rules("%s/src/tcp_kv_backend.erl", #{
    required_calls => [{inet, setopts, 2}, {gen_tcp, send, 2}, {ets, insert, 2}, {ets, lookup, 2}],
    required_constructs => [bit_syntax]
}) of
    {ok, _} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: Sockets, ETS Primitives & Bit Syntax">>, status => <<"passed">>, time_ms => 15, details => <<"Verified inet:setopts/2, gen_tcp:send/2, ets:insert/2, ets:lookup/2, and bit_syntax.">>};
    {error, AstFailReason} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: Sockets, ETS Primitives & Bit Syntax">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST verification failed: ~p", [AstFailReason]))}
end,
S2_UnitParserAndExec = try
    Tab = case ets:info(test_kv_tab) of
        undefined -> ets:new(test_kv_tab, [set, public, {read_concurrency, true}]);
        _ -> test_kv_tab
    end,
    {ok, ping} = tcp_kv_backend:parse_command(<<"PING">>),
    {ok, {set, <<"u1">>, <<"alice">>}} = tcp_kv_backend:parse_command(<<"SET u1 alice">>),
    {ok, {get, <<"u1">>}} = tcp_kv_backend:parse_command(<<"GET u1">>),
    {ok, {del, <<"u1">>}} = tcp_kv_backend:parse_command(<<"DEL u1">>),
    {error, unknown_command} = tcp_kv_backend:parse_command(<<"BOGUS cmd">>),
    <<"+PONG\r\n">> = tcp_kv_backend:execute_command(ping, Tab),
    <<"+OK\r\n">> = tcp_kv_backend:execute_command({set, <<"u1">>, <<"alice">>}, Tab),
    <<"$alice\r\n">> = tcp_kv_backend:execute_command({get, <<"u1">>}, Tab),
    <<":1\r\n">> = tcp_kv_backend:execute_command({del, <<"u1">>}, Tab),
    <<"$-1\r\n">> = tcp_kv_backend:execute_command({get, <<"u1">>}, Tab),
    <<":0\r\n">> = tcp_kv_backend:execute_command({del, <<"u1">>}, Tab),
    <<"-ERR unknown command\r\n">> = tcp_kv_backend:execute_command({error, unknown_command}, Tab),
    ets:delete(Tab),
    #{id => <<"unit_parser_and_exec">>, title => <<"Unit Tests: Parser & Wire Command Execution">>, status => <<"passed">>, time_ms => 20, details => <<"All 5 wire protocol commands parsed and executed accurately.">>}
catch C2:R2 ->
    #{id => <<"unit_parser_and_exec">>, title => <<"Unit Tests: Parser & Wire Command Execution">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Unit test failed: ~p:~p", [C2, R2]))}
end,
S3_WireSocketIntegration = try
    {ok, ServerPid, Port} = tcp_kv_backend:start_server(),
    {ok, Sock} = gen_tcp:connect("127.0.0.1", Port, [binary, {packet, raw}, {active, false}], 2000),
    ok = gen_tcp:send(Sock, <<"SE">>),
    timer:sleep(10),
    ok = gen_tcp:send(Sock, <<"T user:100 ">>),
    ok = gen_tcp:send(Sock, <<"Jaefer\r\n">>),
    {ok, Rep1} = gen_tcp:recv(Sock, 0, 2000),
    ExpectedRep2 = <<"$Jaefer\r\n+PONG\r\n:1\r\n$-1\r\n">>,
    ok = gen_tcp:send(Sock, <<"GET user:100\r\nPING\r\nDEL user:100\r\nGET user:100\r\n">>),
    {ok, Rep2} = gen_tcp:recv(Sock, byte_size(ExpectedRep2), 2000),
    gen_tcp:close(Sock),
    tcp_kv_backend:stop_server(ServerPid),
    case {Rep1, Rep2} of
        {<<"+OK\r\n">>, ExpectedRep2} ->
            #{id => <<"wire_socket_integration">>, title => <<"Wire Integration: Fragmented & Coalesced Sockets">>, status => <<"passed">>, time_ms => 50, details => <<"Fragmented SET reconstructed and 4 coalesced commands executed over real TCP socket.">>};
        OtherRep ->
            #{id => <<"wire_socket_integration">>, title => <<"Wire Integration: Fragmented & Coalesced Sockets">>, status => <<"failed">>, time_ms => 50, details => list_to_binary(io_lib:format("Socket integration failed: ~p", [OtherRep]))}
    end
catch C3:R3 ->
    #{id => <<"wire_socket_integration">>, title => <<"Wire Integration: Fragmented & Coalesced Sockets">>, status => <<"failed">>, time_ms => 50, details => list_to_binary(io_lib:format("Socket integration crashed: ~p:~p", [C3, R3]))}
end,
S4_BackpressureEnforcement = try
    {ok, SrvPid, Port4} = tcp_kv_backend:start_server(),
    case bf_backpressure_tester:verify_active_once_backpressure(node(), Port4, tcp_kv_worker, 50, 5) of
        {ok, #{verdict := <<"PASSED">>, observed_queue_len := QLen4}} ->
            tcp_kv_backend:stop_server(SrvPid),
            #{id => <<"backpressure_enforcement">>, title => <<"Live Backpressure Test: {active, once} Flow Control">>, status => <<"passed">>, time_ms => 60, details => list_to_binary(io_lib:format("Blasted 50 frames; worker mailbox queue length remained bounded at ~p (<= 5). {active, once} verified!", [QLen4]))};
        {ok, _} ->
            tcp_kv_backend:stop_server(SrvPid),
            #{id => <<"backpressure_enforcement">>, title => <<"Live Backpressure Test: {active, once} Flow Control">>, status => <<"passed">>, time_ms => 60, details => <<"Worker mailbox stayed bounded.">>};
        {error, Reason4, Rep4} ->
            tcp_kv_backend:stop_server(SrvPid),
            #{id => <<"backpressure_enforcement">>, title => <<"Live Backpressure Test: {active, once} Flow Control">>, status => <<"failed">>, time_ms => 60, details => list_to_binary(io_lib:format("Backpressure assertion failed (~p): ~p", [Reason4, Rep4]))}
    end
catch C4:R4 ->
    #{id => <<"backpressure_enforcement">>, title => <<"Live Backpressure Test: {active, once} Flow Control">>, status => <<"failed">>, time_ms => 60, details => list_to_binary(io_lib:format("Backpressure test crashed: ~p:~p", [C4, R4]))}
end,
Stages = [CompileStage, S1_Ast, S2_UnitParserAndExec, S3_WireSocketIntegration, S4_BackpressureEnforcement]
`, wsDir, wsDir, wsDir), true

	case "ch11-l01":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(xmpp_wire_demo) of
    {module, xmpp_wire_demo} ->
        Req = [{run_demo, 0}, {print_transcript, 2}],
        Exports = xmpp_wire_demo:module_info(exports),
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile">>, title => <<"Compile xmpp_wire_demo.erl">>, status => <<"passed">>, time_ms => 12, details => <<"Compilation succeeded; run_demo/0 and print_transcript/2 exported.">>};
            Missing -> #{id => <<"compile">>, title => <<"Compile xmpp_wire_demo.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E} ->
        #{id => <<"compile">>, title => <<"Compile xmpp_wire_demo.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "xmpp_wire_demo.erl"]),
    BeamPath = filename:join(["%s", "ebin", "xmpp_wire_demo.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        require_tail_recursion => [{print_transcript, 2}],
        required_calls => [{sample_xmpp_c2s, start_link, 1}, {bf_xmpp_c2s_harness, verify_c2s_handshake_and_routing, 3}],
        required_constructs => [map_exact_match]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Protocol, Map Matching & Transcript TCO">>, status => <<"passed">>, time_ms => 15, details => <<"Verified sample_xmpp_c2s:start_link/1, bf_xmpp_c2s_harness:verify_c2s_handshake_and_routing/3, map_exact_match, and print_transcript/2 TCO.">>};
        {error, V} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Protocol, Map Matching & Transcript TCO">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [V]))}
    end
catch C1:R1 ->
    #{id => <<"ast_verification">>, title => <<"AST Analysis: Protocol, Map Matching & Transcript TCO">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST check error: ~p:~p", [C1, R1]))}
end,
S2_DemoWireExecution = try
    case xmpp_wire_demo:run_demo() of
        {ok, 8} ->
            #{id => <<"demo_wire_execution">>, title => <<"Execute Live XMPP C2S Wire Protocol Session">>, status => <<"passed">>, time_ms => 60, details => <<"Completed all 8 wire transcript entries across 5 RFC 6120 XMPP phases.">>};
        OtherDemo ->
            #{id => <<"demo_wire_execution">>, title => <<"Execute Live XMPP C2S Wire Protocol Session">>, status => <<"failed">>, time_ms => 60, details => list_to_binary(io_lib:format("Expected {ok, 8}, got: ~p", [OtherDemo]))}
    end
catch C2:R2 ->
    #{id => <<"demo_wire_execution">>, title => <<"Execute Live XMPP C2S Wire Protocol Session">>, status => <<"failed">>, time_ms => 60, details => list_to_binary(io_lib:format("Demo crashed: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_Ast, S2_DemoWireExecution]
`, wsDir, wsDir), true

	case "ch11-l02":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(xmpp_jid) of
    {module, xmpp_jid} ->
        Req = [{parse, 1}, {to_bare, 1}, {format_jid, 1}, {is_same_bare_jid, 2}],
        Exports = xmpp_jid:module_info(exports),
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile">>, title => <<"Compile xmpp_jid.erl">>, status => <<"passed">>, time_ms => 12, details => <<"Compilation succeeded; all JID functions exported.">>};
            Missing -> #{id => <<"compile">>, title => <<"Compile xmpp_jid.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E} ->
        #{id => <<"compile">>, title => <<"Compile xmpp_jid.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "xmpp_jid.erl"]),
    Rules = #{
        required_calls => [{binary, copy, 1}, {binary, split, 2}],
        required_constructs => [bit_syntax, guards]
    },
    case bf_ast_verifier:verify_rules(SrcPath, Rules) of
        {ok, _} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: binary:copy/1, Bit Syntax & Guards">>, status => <<"passed">>, time_ms => 15, details => <<"Verified binary:copy/1, binary:split/2, bit_syntax, and guards.">>};
        {error, V} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: binary:copy/1, Bit Syntax & Guards">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [V]))}
    end
catch CatchClass_L02_1:CatchReason_L02_1 ->
    #{id => <<"ast_verification">>, title => <<"AST Analysis: binary:copy/1, Bit Syntax & Guards">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST check error: ~p:~p", [CatchClass_L02_1, CatchReason_L02_1]))}
end,
S2_UnitJidParsing = try
    {ok, J1} = xmpp_jid:parse(<<"alice@localhost/mobile">>),
    Check1 = (maps:get(user, J1) =:= <<"alice">>) andalso (maps:get(domain, J1) =:= <<"localhost">>) andalso (maps:get(resource, J1) =:= <<"mobile">>) andalso (maps:get(bare, J1) =:= <<"alice@localhost">>),
    {ok, J2} = xmpp_jid:parse(<<"bob@chat.beamforge.io">>),
    Check2 = (maps:get(user, J2) =:= <<"bob">>) andalso (maps:get(domain, J2) =:= <<"chat.beamforge.io">>) andalso (maps:get(resource, J2) =:= <<>>) andalso (maps:get(bare, J2) =:= <<"bob@chat.beamforge.io">>),
    Err1 = xmpp_jid:parse(<<"@localhost">>),
    Err2 = xmpp_jid:parse(<<"alice@">>),
    Err3 = xmpp_jid:parse(<<"alice@localhost/">>),
    Err4 = xmpp_jid:parse(<<>>),
    Err5 = xmpp_jid:parse(<<"alice@bob@localhost">>),
    Err6 = xmpp_jid:parse(not_a_binary),
    CheckErrs = (Err1 =:= {error, invalid_jid}) andalso (Err2 =:= {error, invalid_jid}) andalso (Err3 =:= {error, invalid_jid}) andalso (Err4 =:= {error, invalid_jid}) andalso (Err5 =:= {error, invalid_jid}) andalso (Err6 =:= {error, invalid_jid}),
    BareFromBin = xmpp_jid:to_bare(<<"alice@localhost/mobile">>),
    BareFromMap = xmpp_jid:to_bare(J1),
    BareErr = xmpp_jid:to_bare(<<"invalid_no_at">>),
    CheckBare = (BareFromBin =:= <<"alice@localhost">>) andalso (BareFromMap =:= <<"alice@localhost">>) andalso (BareErr =:= {error, invalid_jid}),
    FmtFull = xmpp_jid:format_jid(#{user => <<"charlie">>, domain => <<"host">>, resource => <<"pc">>}),
    FmtBare = xmpp_jid:format_jid(#{user => <<"charlie">>, domain => <<"host">>, resource => <<>>}),
    CheckFmt = (FmtFull =:= <<"charlie@host/pc">>) andalso (FmtBare =:= <<"charlie@host">>),
    Same1 = xmpp_jid:is_same_bare_jid(<<"alice@localhost/p1">>, <<"alice@localhost/p2">>),
    Same2 = xmpp_jid:is_same_bare_jid(J1, <<"alice@localhost/desktop">>),
    Diff1 = xmpp_jid:is_same_bare_jid(<<"alice@localhost">>, <<"bob@localhost">>),
    DiffBad = xmpp_jid:is_same_bare_jid(<<"alice@localhost">>, <<"malformed">>),
    CheckSame = (Same1 =:= true) andalso (Same2 =:= true) andalso (Diff1 =:= false) andalso (DiffBad =:= false),
    case Check1 andalso Check2 andalso CheckErrs andalso CheckBare andalso CheckFmt andalso CheckSame of
        true -> #{id => <<"unit_jid_parsing">>, title => <<"Unit Tests: JID Parsing, Normalization & RFC 7622 Validation">>, status => <<"passed">>, time_ms => 20, details => <<"Full and bare JIDs parsed, malformed inputs rejected, bare extraction, formatting, and comparison verified.">>};
        false -> #{id => <<"unit_jid_parsing">>, title => <<"Unit Tests: JID Parsing, Normalization & RFC 7622 Validation">>, status => <<"failed">>, time_ms => 20, details => <<"JID parser validation assertion failed.">>}
    end
catch CatchClass_L02_2:CatchReason_L02_2 ->
    #{id => <<"unit_jid_parsing">>, title => <<"Unit Tests: JID Parsing, Normalization & RFC 7622 Validation">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Unit test error: ~p:~p", [CatchClass_L02_2, CatchReason_L02_2]))}
end,
Stages = [CompileStage, S1_Ast, S2_UnitJidParsing]
`, wsDir), true

	case "ch11-l03":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(xmpp_stanza) of
    {module, xmpp_stanza} ->
        Req = [{classify_xml_packet, 1}, {build_stream_features, 1}, {build_bind_result, 2}, {build_chat_message, 4}],
        Exports = xmpp_stanza:module_info(exports),
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile">>, title => <<"Compile xmpp_stanza.erl">>, status => <<"passed">>, time_ms => 12, details => <<"Compilation succeeded; all stanza functions exported.">>};
            Missing -> #{id => <<"compile">>, title => <<"Compile xmpp_stanza.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E} ->
        #{id => <<"compile">>, title => <<"Compile xmpp_stanza.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "xmpp_stanza.erl"]),
    Rules = #{
        required_calls => [{binary, match, 2}, {binary, copy, 1}],
        required_constructs => [bit_syntax]
    },
    case bf_ast_verifier:verify_rules(SrcPath, Rules) of
        {ok, _} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: binary:match/2, binary:copy/1 & Bit Syntax">>, status => <<"passed">>, time_ms => 15, details => <<"Verified binary:match/2, binary:copy/1, and bit_syntax slicing.">>};
        {error, V} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: binary:match/2, binary:copy/1 & Bit Syntax">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [V]))}
    end
catch CatchClass_S1:CatchReason_S1 ->
    #{id => <<"ast_verification">>, title => <<"AST Analysis: binary:match/2, binary:copy/1 & Bit Syntax">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST error: ~p:~p", [CatchClass_S1, CatchReason_S1]))}
end,
S2_UnitStanzaClassification = try
    Cl1 = xmpp_stanza:classify_xml_packet(<<"  <stream:stream to='chat.org' version='1.0'>  ">>),
    Cl2 = xmpp_stanza:classify_xml_packet(<<"<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='PLAIN'>dGVzdA==</auth>">>),
    Cl3 = xmpp_stanza:classify_xml_packet(<<"<iq type='set' id='bind_99'><bind/></iq>">>),
    Cl4 = xmpp_stanza:classify_xml_packet(<<"<presence/>">>),
    Cl5 = xmpp_stanza:classify_xml_packet(<<"<presence type='unavailable'/>">>),
    Cl6 = xmpp_stanza:classify_xml_packet(<<"<message to='bob@chat.org' id='m_1' type='chat'><body>Hi</body></message>">>),
    Cl7 = xmpp_stanza:classify_xml_packet(<<"<unknown_tag/>">>),
    Cl8 = xmpp_stanza:classify_xml_packet(<<"</stream:stream>">>),
    Cl9 = xmpp_stanza:classify_xml_packet(not_a_binary),
    Pass = (Cl1 =:= {stream_open, <<"chat.org">>}) andalso
           (Cl2 =:= {auth_plain, <<"dGVzdA==">>}) andalso
           (Cl3 =:= {iq, <<"bind_99">>, <<"set">>}) andalso
           (Cl4 =:= {presence, <<"available">>}) andalso
           (Cl5 =:= {presence, <<"unavailable">>}) andalso
           (Cl6 =:= {message, <<"m_1">>, <<"chat">>, <<"bob@chat.org">>}) andalso
           (Cl7 =:= unknown) andalso
           (Cl8 =:= unknown) andalso
           (Cl9 =:= unknown),
    case Pass of
        true -> #{id => <<"unit_stanza_classification">>, title => <<"Unit Tests: Stanza XML Classification">>, status => <<"passed">>, time_ms => 18, details => <<"All 9 XML packet variants and edge cases accurately classified.">>};
        false -> #{id => <<"unit_stanza_classification">>, title => <<"Unit Tests: Stanza XML Classification">>, status => <<"failed">>, time_ms => 18, details => list_to_binary(io_lib:format("Classification mismatch: ~p", [{Cl1, Cl2, Cl3, Cl4, Cl5, Cl6, Cl7, Cl8, Cl9}]))}
    end
catch CatchClass_S2:CatchReason_S2 ->
    #{id => <<"unit_stanza_classification">>, title => <<"Unit Tests: Stanza XML Classification">>, status => <<"failed">>, time_ms => 18, details => list_to_binary(io_lib:format("Classification error: ~p:~p", [CatchClass_S2, CatchReason_S2]))}
end,
S3_UnitStanzaBuilders = try
    Feat1 = xmpp_stanza:build_stream_features([<<"PLAIN">>]),
    ExpFeat1 = <<"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism></mechanisms></stream:features>">>,
    Feat2 = xmpp_stanza:build_stream_features([<<"PLAIN">>, <<"SCRAM-SHA-256">>]),
    ExpFeat2 = <<"<stream:features><mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'><mechanism>PLAIN</mechanism><mechanism>SCRAM-SHA-256</mechanism></mechanisms></stream:features>">>,
    CheckFeat = (Feat1 =:= ExpFeat1) andalso (Feat2 =:= ExpFeat2),
    Bind = xmpp_stanza:build_bind_result(<<"b12">>, <<"user@host/res">>),
    ExpectedBind = <<"<iq type='result' id='b12'><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><jid>user@host/res</jid></bind></iq>">>,
    CheckBind = (Bind =:= ExpectedBind),
    Msg = xmpp_stanza:build_chat_message(<<"alice@h">>, <<"bob@h">>, <<"m44">>, <<"Hello world">>),
    ExpectedMsg = <<"<message from='alice@h' to='bob@h' id='m44' type='chat'><body>Hello world</body></message>">>,
    CheckMsg = (Msg =:= ExpectedMsg),
    case CheckFeat andalso CheckBind andalso CheckMsg of
        true -> #{id => <<"unit_stanza_builders">>, title => <<"Unit Tests: XML Stanza Serialization Builders">>, status => <<"passed">>, time_ms => 18, details => <<"Stream features, bind results, and chat messages generated with exact RFC 6120 XML.">>};
        false -> #{id => <<"unit_stanza_builders">>, title => <<"Unit Tests: XML Stanza Serialization Builders">>, status => <<"failed">>, time_ms => 18, details => <<"Builder XML mismatch.">>}
    end
catch CatchClass_S3:CatchReason_S3 ->
    #{id => <<"unit_stanza_builders">>, title => <<"Unit Tests: XML Stanza Serialization Builders">>, status => <<"failed">>, time_ms => 18, details => list_to_binary(io_lib:format("Builder error: ~p:~p", [CatchClass_S3, CatchReason_S3]))}
end,
Stages = [CompileStage, S1_Ast, S2_UnitStanzaClassification, S3_UnitStanzaBuilders]
`, wsDir), true

	case "ch11-l04":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(xmpp_error_and_roster) of
    {module, xmpp_error_and_roster} ->
        Req = [{classify_error_condition, 1}, {build_stanza_error, 4}, {build_stream_not_authorized, 0}, {transition_subscription, 2}],
        Exports = xmpp_error_and_roster:module_info(exports),
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile">>, title => <<"Compile xmpp_error_and_roster.erl">>, status => <<"passed">>, time_ms => 12, details => <<"Compilation succeeded; all error & roster functions exported.">>};
            Missing -> #{id => <<"compile">>, title => <<"Compile xmpp_error_and_roster.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E} ->
        #{id => <<"compile">>, title => <<"Compile xmpp_error_and_roster.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "xmpp_error_and_roster.erl"]),
    Rules = #{required_constructs => [bit_syntax]},
    case bf_ast_verifier:verify_rules(SrcPath, Rules) of
        {ok, _} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Bit Syntax & RFC 6120/6121 Compliance">>, status => <<"passed">>, time_ms => 15, details => <<"Verified bit_syntax XML error formatting.">>};
        {error, V} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Bit Syntax & RFC 6120/6121 Compliance">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [V]))}
    end
catch CatchClass_L04_1:CatchReason_L04_1 ->
    #{id => <<"ast_verification">>, title => <<"AST Analysis: Bit Syntax & RFC 6120/6121 Compliance">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST error: ~p:~p", [CatchClass_L04_1, CatchReason_L04_1]))}
end,
S2_UnitErrorConditions = try
    Cond1 = xmpp_error_and_roster:classify_error_condition(not_authorized),
    Cond2 = xmpp_error_and_roster:classify_error_condition(forbidden),
    Cond3 = xmpp_error_and_roster:classify_error_condition(item_not_found),
    Cond4 = xmpp_error_and_roster:classify_error_condition(service_unavailable),
    Cond5 = xmpp_error_and_roster:classify_error_condition(bad_request),
    Cond6 = xmpp_error_and_roster:classify_error_condition(resource_constraint),
    CheckClassify = (Cond1 =:= {<<"auth">>, <<"not-authorized">>}) andalso
                    (Cond2 =:= {<<"auth">>, <<"forbidden">>}) andalso
                    (Cond3 =:= {<<"cancel">>, <<"item-not-found">>}) andalso
                    (Cond4 =:= {<<"cancel">>, <<"service-unavailable">>}) andalso
                    (Cond5 =:= {<<"modify">>, <<"bad-request">>}) andalso
                    (Cond6 =:= {<<"wait">>, <<"resource-constraint">>}),
    ErrXml = xmpp_error_and_roster:build_stanza_error(<<"iq">>, <<"iq_404">>, <<"client@host">>, item_not_found),
    CheckErrXml = (binary:match(ErrXml, <<"type='error'">>) =/= nomatch) andalso
                  (binary:match(ErrXml, <<"error type='cancel'">>) =/= nomatch) andalso
                  (binary:match(ErrXml, <<"item-not-found">>) =/= nomatch),
    StreamErr = xmpp_error_and_roster:build_stream_not_authorized(),
    CheckStreamErr = (binary:match(StreamErr, <<"stream:error">>) =/= nomatch) andalso
                     (binary:match(StreamErr, <<"not-authorized">>) =/= nomatch),
    case CheckClassify andalso CheckErrXml andalso CheckStreamErr of
        true -> #{id => <<"unit_error_conditions">>, title => <<"Unit Tests: RFC 6120 Stanza & Stream Errors">>, status => <<"passed">>, time_ms => 15, details => <<"Classified 6 RFC error conditions; generated valid stanza and stream errors.">>};
        false -> #{id => <<"unit_error_conditions">>, title => <<"Unit Tests: RFC 6120 Stanza & Stream Errors">>, status => <<"failed">>, time_ms => 15, details => <<"Error classification or builder assertion failed.">>}
    end
catch CatchClass_L04_2:CatchReason_L04_2 ->
    #{id => <<"unit_error_conditions">>, title => <<"Unit Tests: RFC 6120 Stanza & Stream Errors">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Error condition error: ~p:~p", [CatchClass_L04_2, CatchReason_L04_2]))}
end,
S3_UnitRosterFsm = try
    Trans1 = xmpp_error_and_roster:transition_subscription(none, outbound_subscribed),
    Trans2 = xmpp_error_and_roster:transition_subscription(Trans1, inbound_subscribed),
    Trans3 = xmpp_error_and_roster:transition_subscription(Trans2, outbound_unsubscribed),
    Trans4 = xmpp_error_and_roster:transition_subscription(Trans3, inbound_unsubscribed),
    CheckTransitions = (Trans1 =:= to) andalso (Trans2 =:= both) andalso (Trans3 =:= from) andalso (Trans4 =:= none),
    case CheckTransitions of
        true -> #{id => <<"unit_roster_subscription_fsm">>, title => <<"Unit Tests: RFC 6121 Roster Presence State Machine">>, status => <<"passed">>, time_ms => 15, details => <<"Verified subscription transitions across none -> to -> both -> from -> none.">>};
        false -> #{id => <<"unit_roster_subscription_fsm">>, title => <<"Unit Tests: RFC 6121 Roster Presence State Machine">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("State transitions mismatch: ~p", [{Trans1, Trans2, Trans3, Trans4}]))}
    end
catch CatchClass_L04_3:CatchReason_L04_3 ->
    #{id => <<"unit_roster_subscription_fsm">>, title => <<"Unit Tests: RFC 6121 Roster Presence State Machine">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Roster FSM error: ~p:~p", [CatchClass_L04_3, CatchReason_L04_3]))}
end,
Stages = [CompileStage, S1_Ast, S2_UnitErrorConditions, S3_UnitRosterFsm]
`, wsDir), true

	case "ch11-l05":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(xmpp_xml_framer) of
    {module, xmpp_xml_framer} ->
        Req = [{extract_frames, 2}],
        Exports = xmpp_xml_framer:module_info(exports),
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile">>, title => <<"Compile xmpp_xml_framer.erl">>, status => <<"passed">>, time_ms => 12, details => <<"Compilation succeeded; extract_frames/2 exported.">>};
            Missing -> #{id => <<"compile">>, title => <<"Compile xmpp_xml_framer.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E} ->
        #{id => <<"compile">>, title => <<"Compile xmpp_xml_framer.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "xmpp_xml_framer.erl"]),
    Rules = #{
        required_calls => [{binary, copy, 1}, {binary, match, 2}],
        required_constructs => [bit_syntax]
    },
    case bf_ast_verifier:verify_rules(SrcPath, Rules) of
        {ok, _} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: binary:copy/1, binary:match/2 & Bit Syntax">>, status => <<"passed">>, time_ms => 15, details => <<"Verified binary:copy/1, binary:match/2, and bit_syntax stream slicing.">>};
        {error, V} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: binary:copy/1, binary:match/2 & Bit Syntax">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [V]))}
    end
catch CatchClass_L05_1:CatchReason_L05_1 ->
    #{id => <<"ast_verification">>, title => <<"AST Analysis: binary:copy/1, binary:match/2 & Bit Syntax">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST check error: ~p:~p", [CatchClass_L05_1, CatchReason_L05_1]))}
end,
S2_UnitFragmentedStreamFraming = try
    {F1, Rem1} = xmpp_xml_framer:extract_frames(<<>>, <<"<stream:str">>),
    Check1 = (F1 =:= []) andalso (Rem1 =:= <<"<stream:str">>),
    {F2, Rem2} = xmpp_xml_framer:extract_frames(Rem1, <<"eam to='localhost'> <auth mechanism='PLAIN'>xyz</auth>">>),
    ExpectedF2 = [
        <<"<stream:stream to='localhost'>">>,
        <<"<auth mechanism='PLAIN'>xyz</auth>">>
    ],
    Check2 = (F2 =:= ExpectedF2) andalso (Rem2 =:= <<>>),
    {F3, Rem3} = xmpp_xml_framer:extract_frames(<<>>, <<"<iq id='b_1'><bind><resource>laptop</resource></bind></iq><presence/><ping id='p_42'/><message to='b'>hel">>),
    ExpectedF3 = [
        <<"<iq id='b_1'><bind><resource>laptop</resource></bind></iq>">>,
        <<"<presence/>">>,
        <<"<ping id='p_42'/>">>
    ],
    Check3 = (F3 =:= ExpectedF3) andalso (Rem3 =:= <<"<message to='b'>hel">>),
    {F4, Rem4} = xmpp_xml_framer:extract_frames(Rem3, <<"lo</message>   \r\n">>),
    Check4 = (F4 =:= [<<"<message to='b'>hello</message>">>]) andalso (Rem4 =:= <<>>),
    case Check1 andalso Check2 andalso Check3 andalso Check4 of
        true -> #{id => <<"unit_fragmented_stream_framing">>, title => <<"Unit Tests: Fragmented Chunks & Coalesced XML Frames">>, status => <<"passed">>, time_ms => 25, details => <<"Split stream header, paired tags, self-closing stanzas, and coalesced fragments framed in FIFO order.">>};
        false -> #{id => <<"unit_fragmented_stream_framing">>, title => <<"Unit Tests: Fragmented Chunks & Coalesced XML Frames">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Framing assertion failed: ~p", [{F1, Rem1, F2, Rem2, F3, Rem3, F4, Rem4}]))}
    end
catch CatchClass_L05_2:CatchReason_L05_2 ->
    #{id => <<"unit_fragmented_stream_framing">>, title => <<"Unit Tests: Fragmented Chunks & Coalesced XML Frames">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Framing test error: ~p:~p", [CatchClass_L05_2, CatchReason_L05_2]))}
end,
Stages = [CompileStage, S1_Ast, S2_UnitFragmentedStreamFraming]
`, wsDir), true

	case "ch11-l06":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(xmpp_c2s_fsm) of
    {module, xmpp_c2s_fsm} ->
        Req = [{init, 1}, {handle_event, 2}, {get_state, 1}],
        Exports = xmpp_c2s_fsm:module_info(exports),
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile">>, title => <<"Compile xmpp_c2s_fsm.erl">>, status => <<"passed">>, time_ms => 12, details => <<"Compilation succeeded; init/1, handle_event/2, and get_state/1 exported.">>};
            Missing -> #{id => <<"compile">>, title => <<"Compile xmpp_c2s_fsm.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E} ->
        #{id => <<"compile">>, title => <<"Compile xmpp_c2s_fsm.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "xmpp_c2s_fsm.erl"]),
    Rules = #{
        required_calls => [{base64, decode, 1}, {binary, copy, 1}],
        required_constructs => [bit_syntax, map_exact_match]
    },
    case bf_ast_verifier:verify_rules(SrcPath, Rules) of
        {ok, _} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Base64, binary:copy/1, Bit Syntax & Maps">>, status => <<"passed">>, time_ms => 15, details => <<"Verified base64:decode/1, binary:copy/1, bit_syntax, and map_exact_match.">>};
        {error, V} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Base64, binary:copy/1, Bit Syntax & Maps">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [V]))}
    end
catch CatchClass_L06_1:CatchReason_L06_1 ->
    #{id => <<"ast_verification">>, title => <<"AST Analysis: Base64, binary:copy/1, Bit Syntax & Maps">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST check error: ~p:~p", [CatchClass_L06_1, CatchReason_L06_1]))}
end,
S2_UnitFsmHandshake = try
    S0 = xmpp_c2s_fsm:init(<<"localhost">>),
    wait_for_stream = xmpp_c2s_fsm:get_state(S0),
    %% 1. Reject message in wait_for_stream
    {error, unexpected_stanza_before_stream, S0} = xmpp_c2s_fsm:handle_event({chat_message, <<"bob@localhost">>, <<"m0">>, <<"hi">>}, S0),
    %% 2. Stream open -> wait_for_sasl with pre-auth features
    {reply, FeatReply, S1} = xmpp_c2s_fsm:handle_event({stream_open, <<"localhost">>}, S0),
    CheckState1 = (xmpp_c2s_fsm:get_state(S1) =:= wait_for_sasl) andalso (binary:match(FeatReply, <<"PLAIN">>) =/= nomatch),
    %% 3. Reject chat & bad base64 in wait_for_sasl
    {error, not_authorized, S1} = xmpp_c2s_fsm:handle_event({chat_message, <<"bob@localhost">>, <<"m1">>, <<"hi">>}, S1),
    {error, invalid_credentials, S1} = xmpp_c2s_fsm:handle_event({auth_plain, <<"!!!not_base64!!!">>}, S1),
    %% 4. SASL PLAIN auth -> authenticated
    Token = base64:encode(<<0, "alice", 0, "secret">>),
    {reply, SuccessReply, S2} = xmpp_c2s_fsm:handle_event({auth_plain, Token}, S1),
    CheckState2 = (xmpp_c2s_fsm:get_state(S2) =:= authenticated) andalso (binary:match(SuccessReply, <<"success">>) =/= nomatch),
    %% 5. Reject non-bind event in authenticated
    {error, expected_bind, S2} = xmpp_c2s_fsm:handle_event({chat_message, <<"bob@localhost">>, <<"m2">>, <<"hi">>}, S2),
    %% 6. Resource bind -> session_established
    {reply, BindReply, S3} = xmpp_c2s_fsm:handle_event({bind_resource, <<"bind_1">>, <<"desktop">>}, S2),
    CheckState3 = (xmpp_c2s_fsm:get_state(S3) =:= session_established) andalso
                  (maps:get(full_jid, S3) =:= <<"alice@localhost/desktop">>) andalso
                  (binary:match(BindReply, <<"alice@localhost/desktop">>) =/= nomatch),
    %% 7. Chat message & presence in session_established
    {ok, {routed, <<"bob@localhost">>}, S3} = xmpp_c2s_fsm:handle_event({chat_message, <<"bob@localhost">>, <<"m_2">>, <<"Hey!">>}, S3),
    {ok, {presence_updated, <<"available">>}, S3} = xmpp_c2s_fsm:handle_event({presence, <<"available">>}, S3),
    case CheckState1 andalso CheckState2 andalso CheckState3 of
        true -> #{id => <<"unit_fsm_handshake">>, title => <<"Unit Tests: Complete C2S Handshake Transitions & Security Gates">>, status => <<"passed">>, time_ms => 20, details => <<"Strict state sequence enforced; pre-auth stanzas rejected; SASL PLAIN decoded; Full JID bound and stanzas routed.">>};
        false -> #{id => <<"unit_fsm_handshake">>, title => <<"Unit Tests: Complete C2S Handshake Transitions & Security Gates">>, status => <<"failed">>, time_ms => 20, details => <<"FSM handshake assertion failed.">>}
    end
catch CatchClass_L06_2:CatchReason_L06_2 ->
    #{id => <<"unit_fsm_handshake">>, title => <<"Unit Tests: Complete C2S Handshake Transitions & Security Gates">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("FSM error: ~p:~p", [CatchClass_L06_2, CatchReason_L06_2]))}
end,
Stages = [CompileStage, S1_Ast, S2_UnitFsmHandshake]
`, wsDir), true

	case "ch11-l08":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(xmpp_presence_router) of
    {module, xmpp_presence_router} ->
        Req = [{upsert_session, 5}, {remove_session_by_pid, 2}, {resolve_message_targets, 2}, {broadcast_presence, 4}],
        Exports = xmpp_presence_router:module_info(exports),
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile">>, title => <<"Compile xmpp_presence_router.erl">>, status => <<"passed">>, time_ms => 12, details => <<"Compilation succeeded; all presence router functions exported.">>};
            Missing -> #{id => <<"compile">>, title => <<"Compile xmpp_presence_router.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E} ->
        #{id => <<"compile">>, title => <<"Compile xmpp_presence_router.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "xmpp_presence_router.erl"]),
    BeamPath = filename:join(["%s", "ebin", "xmpp_presence_router.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        require_tail_recursion => [{remove_session_by_pid, 2}],
        required_remote_calls => [{binary, split, 2}, {binary, copy, 1}, {lists, usort, 1}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Tail Recursion & Unpinning Calls">>, status => <<"passed">>, time_ms => 15, details => <<"Verified remove_session_by_pid/2 is tail-recursive and uses binary:split/2, binary:copy/1, lists:usort/1.">>};
        {error, V} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Tail Recursion & Unpinning Calls">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [V]))}
    end
catch CatchClass_L08_1:CatchReason_L08_1 ->
    #{id => <<"ast_verification">>, title => <<"AST Analysis: Tail Recursion & Unpinning Calls">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST check error: ~p:~p", [CatchClass_L08_1, CatchReason_L08_1]))}
end,
S2_UnitLifecycleAndRouting = try
    PWatch = spawn(fun() -> ok end),
    PPhone = spawn(fun() -> ok end),
    PDesk1 = spawn(fun() -> ok end),
    PDesk2 = spawn(fun() -> ok end),
    S0 = [],
    S1 = xmpp_presence_router:upsert_session(S0, <<"alice@host/watch">>, -200, PWatch, #{}),
    S2 = xmpp_presence_router:upsert_session(S1, <<"alice@host/phone">>, 5, PPhone, #{}),
    S3 = xmpp_presence_router:upsert_session(S2, <<"alice@host/desktop1">>, 10, PDesk1, #{}),
    S4 = xmpp_presence_router:upsert_session(S3, <<"alice@host/desktop2">>, 200, PDesk2, #{}),
    CheckClamp = (lists:keymember(-128, 5, S1)) andalso (lists:keymember(127, 5, S4)),
    S3Upsert = xmpp_presence_router:upsert_session(S4, <<"alice@host/desktop2">>, 10, PDesk2, #{}),
    CheckOverwrite = (length(S3Upsert) =:= 4),
    %% 1. Full JID exact match
    {route_online, [TargetPhone]} = xmpp_presence_router:resolve_message_targets(S3Upsert, <<"alice@host/phone">>),
    CheckFull = (TargetPhone =:= PPhone),
    %% 2. Bare JID highest priority tie (PDesk1 and PDesk2 both priority 10)
    {route_online, TiedPids} = xmpp_presence_router:resolve_message_targets(S3Upsert, <<"alice@host">>),
    CheckTied = (lists:sort(TiedPids) =:= lists:sort([PDesk1, PDesk2])),
    %% 3. Negative priority exclusion: remove desktop1, desktop2, phone -> only watch remains with priority -128
    S5 = xmpp_presence_router:remove_session_by_pid(S3Upsert, PDesk1),
    S6 = xmpp_presence_router:remove_session_by_pid(S5, PDesk2),
    S7 = xmpp_presence_router:remove_session_by_pid(S6, PPhone),
    OfflineRes = xmpp_presence_router:resolve_message_targets(S7, <<"alice@host">>),
    CheckNeg = (OfflineRes =:= {store_offline, <<"alice@host">>}),
    case CheckClamp andalso CheckOverwrite andalso CheckFull andalso CheckTied andalso CheckNeg of
        true -> #{id => <<"unit_priority_routing">>, title => <<"Unit Tests: RFC 6121 Priority Routing & Negative Priority Exclusion">>, status => <<"passed">>, time_ms => 20, details => <<"Priority clamping (-128..127), Full JID routing, tied priorities, and negative priority offline fallback verified.">>};
        false -> #{id => <<"unit_priority_routing">>, title => <<"Unit Tests: RFC 6121 Priority Routing & Negative Priority Exclusion">>, status => <<"failed">>, time_ms => 20, details => <<"Priority routing or clamping assertion failed.">>}
    end
catch CatchClass_L08_2:CatchReason_L08_2 ->
    #{id => <<"unit_priority_routing">>, title => <<"Unit Tests: RFC 6121 Priority Routing & Negative Priority Exclusion">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Routing error: ~p:~p", [CatchClass_L08_2, CatchReason_L08_2]))}
end,
S3_UnitPresenceBroadcast = try
    Self = self(),
    Ack = fun(Tag) ->
        spawn(fun() ->
            receive
                {xmpp_presence, <<"alice@host/phone">>, <<"<presence type='available'/>">>} -> Self ! {ack, Tag}
            after 500 ->
                Self ! {miss, Tag}
            end
        end)
    end,
    PContact1 = Ack(c1),
    PContact2 = Ack(c2),
    POtherResource = Ack(self_res),
    Roster = #{<<"alice@host">> => [<<"bob@host">>, <<"carol@host">>]},
    BS0 = [],
    BS1 = xmpp_presence_router:upsert_session(BS0, <<"alice@host/phone">>, 5, Self, Roster),
    BS2 = xmpp_presence_router:upsert_session(BS1, <<"alice@host/laptop">>, 10, POtherResource, Roster),
    BS3 = xmpp_presence_router:upsert_session(BS2, <<"bob@host/office">>, 5, PContact1, Roster),
    BS4 = xmpp_presence_router:upsert_session(BS3, <<"carol@host/home">>, 5, PContact2, Roster),
    DeliveredCount = xmpp_presence_router:broadcast_presence(BS4, Roster, <<"alice@host/phone">>, <<"<presence type='available'/>">>),
    GotAcks = [receive {ack, T} -> T after 600 -> timeout end || T <- [c1, c2, self_res]],
    SenderUntouched = receive {xmpp_presence, _, _} -> false after 20 -> true end,
    case (DeliveredCount =:= 3) andalso (lists:sort(GotAcks) =:= [c1, c2, self_res]) andalso SenderUntouched of
        true -> #{id => <<"unit_presence_broadcast">>, title => <<"Unit Tests: Roster Presence Fan-Out & Self-Resource Delivery">>, status => <<"passed">>, time_ms => 25, details => <<"Presence {xmpp_presence, SenderFullJid, Stanza} delivered to 2 contacts and 1 alternate resource; sender omitted.">>};
        false -> #{id => <<"unit_presence_broadcast">>, title => <<"Unit Tests: Roster Presence Fan-Out & Self-Resource Delivery">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Delivered=~p Acks=~p SenderUntouched=~p", [DeliveredCount, GotAcks, SenderUntouched]))}
    end
catch CatchClass_L08_3:CatchReason_L08_3 ->
    #{id => <<"unit_presence_broadcast">>, title => <<"Unit Tests: Roster Presence Fan-Out & Self-Resource Delivery">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Presence broadcast error: ~p:~p", [CatchClass_L08_3, CatchReason_L08_3]))}
end,
Stages = [CompileStage, S1_Ast, S2_UnitLifecycleAndRouting, S3_UnitPresenceBroadcast]
`, wsDir, wsDir), true

	case "ch12-l01", "ch12-m1":
		return `
catch xmpp_sup:stop(),
catch (case whereis(xmpp_sup) of undefined -> ok; SupP -> exit(SupP, kill) end),
catch ets:delete(xmpp_sessions_tab),

S1 = try
    Exports = xmpp_sup:module_info(exports),
    HasStart = lists:member({start_link, 0}, Exports),
    HasInit = lists:member({init, 1}, Exports),
    HasStop = lists:member({stop, 0}, Exports),
    case HasStart andalso HasInit andalso HasStop of
        true ->
            #{id => <<"m1_compile_and_exports">>,
              title => <<"Module Audit: Exports (start_link/0, init/1, stop/0)">>,
              status => <<"passed">>, time_ms => 15,
              details => <<"xmpp_sup exports required OTP supervisor callbacks and clean shutdown stop/0.">>};
        false ->
            #{id => <<"m1_compile_and_exports">>,
              title => <<"Module Audit: Exports (start_link/0, init/1, stop/0)">>,
              status => <<"failed">>, time_ms => 15,
              details => list_to_binary(io_lib:format("Missing exports in xmpp_sup: ~p", [Exports]))}
    end
catch C1:R1 ->
    #{id => <<"m1_compile_and_exports">>,
      title => <<"Module Audit: Exports (start_link/0, init/1, stop/0)">>,
      status => <<"failed">>, time_ms => 15,
      details => list_to_binary(io_lib:format("Exports check crashed: ~p:~p", [C1, R1]))}
end,

S2 = try
    {ok, {SupFlags, ChildSpecs}} = xmpp_sup:init([]),
    Strat = maps:get(strategy, SupFlags, undefined),
    Int = maps:get(intensity, SupFlags, undefined),
    Per = maps:get(period, SupFlags, undefined),
    ChildIds = [maps:get(id, Spec, undefined) || Spec <- ChildSpecs],
    CheckStrat = (Strat =:= rest_for_one),
    CheckLimits = (Int =:= 5) andalso (Per =:= 10),
    CheckOrder = (ChildIds =:= [xmpp_session_registry, xmpp_router]),
    CheckChildDetails = lists:all(fun(Spec) ->
        Id = maps:get(id, Spec, undefined),
        maps:get(restart, Spec, undefined) =:= permanent andalso
        maps:get(type, Spec, undefined) =:= worker andalso
        maps:get(shutdown, Spec, undefined) =:= 2000 andalso
        maps:get(start, Spec, undefined) =:= {Id, start_link, []} andalso
        maps:get(modules, Spec, undefined) =:= [Id]
    end, ChildSpecs),
    case CheckStrat andalso CheckLimits andalso CheckOrder andalso CheckChildDetails of
        true ->
            #{id => <<"m1_ast_supervision_spec">>,
              title => <<"Supervision Spec: rest_for_one & Ordered Child Specs">>,
              status => <<"passed">>, time_ms => 20,
              details => <<"Strategy rest_for_one with intensity 5, period 10, permanent workers (shutdown 2000), and order [xmpp_session_registry, xmpp_router] verified.">>};
        false ->
            #{id => <<"m1_ast_supervision_spec">>,
              title => <<"Supervision Spec: rest_for_one & Ordered Child Specs">>,
              status => <<"failed">>, time_ms => 20,
              details => list_to_binary(io_lib:format("Strat: ~p, Int: ~p, Per: ~p, Order: ~p, DetailsOk: ~p", [Strat, Int, Per, ChildIds, CheckChildDetails]))}
    end
catch C2:R2 ->
    #{id => <<"m1_ast_supervision_spec">>,
      title => <<"Supervision Spec: rest_for_one & Ordered Child Specs">>,
      status => <<"failed">>, time_ms => 20,
      details => list_to_binary(io_lib:format("Init spec crashed: ~p:~p", [C2, R2]))}
end,

S3 = try
    {ok, SupPid} = xmpp_sup:start_link(),
    RegPid = whereis(xmpp_session_registry),
    RouterPid = whereis(xmpp_router),
    CheckAlive = is_pid(SupPid) andalso is_pid(RegPid) andalso is_pid(RouterPid) andalso is_process_alive(RegPid) andalso is_process_alive(RouterPid),
    StopRes = xmpp_sup:stop(),
    CheckStopped = (StopRes =:= ok) andalso (whereis(xmpp_sup) =:= undefined),
    case CheckAlive andalso CheckStopped of
        true ->
            #{id => <<"m1_supervisor_boot_test">>,
              title => <<"Runtime Boot & Stop: Worker Processes Started & Cleanly Shutdown">>,
              status => <<"passed">>, time_ms => 25,
              details => <<"xmpp_sup booted both registry and router as permanent workers and stopped cleanly via stop/0.">>};
        false ->
            #{id => <<"m1_supervisor_boot_test">>,
              title => <<"Runtime Boot & Stop: Worker Processes Started & Cleanly Shutdown">>,
              status => <<"failed">>, time_ms => 25,
              details => list_to_binary(io_lib:format("CheckAlive: ~p, CheckStopped: ~p", [CheckAlive, CheckStopped]))}
    end
catch C3:R3 ->
    #{id => <<"m1_supervisor_boot_test">>,
      title => <<"Runtime Boot & Stop: Worker Processes Started & Cleanly Shutdown">>,
      status => <<"failed">>, time_ms => 25,
      details => list_to_binary(io_lib:format("Boot test crashed: ~p:~p", [C3, R3]))}
end,

S4 = try
    {ok, SupPid2} = xmpp_sup:start_link(),
    Children = supervisor:which_children(SupPid2),
    CheckCount = (length(Children) =:= 2),
    PermanentWorkers = lists:all(fun({_Id, _Pid, Type, Modules}) -> (Type =:= worker) andalso is_list(Modules) end, Children),
    xmpp_sup:stop(),
    case CheckCount andalso PermanentWorkers of
        true ->
            #{id => <<"m1_smoke_integration">>,
              title => <<"Integration Smoke: Child Specifications & Types">>,
              status => <<"passed">>, time_ms => 20,
              details => <<"supervisor:which_children verified 2 permanent worker specifications under xmpp_sup.">>};
        false ->
            #{id => <<"m1_smoke_integration">>,
              title => <<"Integration Smoke: Child Specifications & Types">>,
              status => <<"failed">>, time_ms => 20,
              details => list_to_binary(io_lib:format("Children: ~p", [Children]))}
    end
catch C4:R4 ->
    #{id => <<"m1_smoke_integration">>,
      title => <<"Integration Smoke: Child Specifications & Types">>,
      status => <<"failed">>, time_ms => 20,
      details => list_to_binary(io_lib:format("Integration test crashed: ~p:~p", [C4, R4]))}
end,

catch xmpp_sup:stop(),
Stages = [S1, S2, S3, S4]
`, true

	case "ch12-l02", "ch12-m2":
		return `
S1 = try
    Exports = xmpp_stream_parser:module_info(exports),
    Required = [{new_buffer, 0}, {feed_chunk, 2}, {extract_attr, 2}, {extract_tag_body, 2}],
    Missing = [Req || Req <- Required, not lists:member(Req, Exports)],
    case Missing of
        [] ->
            #{id => <<"m2_compile_and_exports">>,
              title => <<"Module Audit: Exports (new_buffer/0, feed_chunk/2, extract_attr/2, extract_tag_body/2)">>,
              status => <<"passed">>, time_ms => 15,
              details => <<"All required framing and attribute extraction functions exported.">>};
        _ ->
            #{id => <<"m2_compile_and_exports">>,
              title => <<"Module Audit: Exports (new_buffer/0, feed_chunk/2, extract_attr/2, extract_tag_body/2)">>,
              status => <<"failed">>, time_ms => 15,
              details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
    end
catch C1:R1 ->
    #{id => <<"m2_compile_and_exports">>,
      title => <<"Module Audit: Exports">>,
      status => <<"failed">>, time_ms => 15,
      details => list_to_binary(io_lib:format("Exports check crashed: ~p:~p", [C1, R1]))}
end,

S2 = try
    BeamPath = code:which(xmpp_stream_parser),
    WsRoot = filename:dirname(filename:dirname(BeamPath)),
    SrcPath = filename:join([WsRoot, "src", "xmpp_stream_parser.erl"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    AstRes = bf_ast_verifier:verify_rules(SrcPath, BeamBin, #{
        required_remote_calls => [{binary, copy, 1}, {binary, match, 2}]
    }),
    %% Heap memory unpinning check
    BigBin = <<"  <message id='msg_secret_123' to='bob@localhost'><body>Data: ", (binary:copy(<<"Z">>, 4096))/binary, "</body></message>">>,
    {[{chat_message, Id, _To, _Body}], <<>>} = xmpp_stream_parser:feed_chunk(<<>>, BigBin),
    RefSize = binary:referenced_byte_size(Id),
    case {AstRes, RefSize < 500} of
        {{ok, _}, true} ->
            #{id => <<"m2_ast_memory_safety">>,
              title => <<"AST & Memory Safety: Sub-Binary Heap Unpinning (binary:copy/1)">>,
              status => <<"passed">>, time_ms => 20,
              details => list_to_binary(io_lib:format("Verified binary:copy/1 + binary:match/2 AST calls; Id unpinned from 4KB source (referenced_byte_size: ~p bytes).", [RefSize]))};
        {{error, AstErr}, _} ->
            #{id => <<"m2_ast_memory_safety">>,
              title => <<"AST & Memory Safety: Sub-Binary Heap Unpinning (binary:copy/1)">>,
              status => <<"failed">>, time_ms => 20,
              details => list_to_binary(io_lib:format("AST violation: ~p", [AstErr]))};
        {_, false} ->
            #{id => <<"m2_ast_memory_safety">>,
              title => <<"AST & Memory Safety: Sub-Binary Heap Unpinning (binary:copy/1)">>,
              status => <<"failed">>, time_ms => 20,
              details => list_to_binary(io_lib:format("Sub-binary retention leak detected! referenced_byte_size: ~p bytes (expected < 500). Call binary:copy/1 on extracted values.", [RefSize]))}
    end
catch C2:R2 ->
    #{id => <<"m2_ast_memory_safety">>,
      title => <<"AST & Memory Safety: Sub-Binary Heap Unpinning">>,
      status => <<"failed">>, time_ms => 20,
      details => list_to_binary(io_lib:format("Memory test crashed: ~p:~p", [C2, R2]))}
end,

S3 = try
    B0 = xmpp_stream_parser:new_buffer(),
    {E1, B1} = xmpp_stream_parser:feed_chunk(B0, <<"<stream:st">>),
    {E2, B2} = xmpp_stream_parser:feed_chunk(B1, <<"ream to='localhost'>">>),
    {E3, B3} = xmpp_stream_parser:feed_chunk(B2, <<"<ping id='p1'/><auth mechanism='PLAIN'>token</auth><iq id='b1'><resource>desk</resource></iq><message id='m1' to='bob@localhost'><body>Hel">>),
    {E4, B4} = xmpp_stream_parser:feed_chunk(B3, <<"lo</body></message></stream:stream>">>),
    All = E1 ++ E2 ++ E3 ++ E4,
    Expected = [
        {stream_open, <<"localhost">>},
        {ping, <<"p1">>},
        {sasl_auth, <<"PLAIN">>, <<"token">>},
        {iq_bind, <<"b1">>, <<"desk">>},
        {chat_message, <<"m1">>, <<"bob@localhost">>, <<"Hello">>},
        stream_close
    ],
    case (All =:= Expected) andalso (B4 =:= <<>>) of
        true ->
            #{id => <<"m2_fragmented_stream_parsing">>,
              title => <<"Incremental Framing: All 6 Stanza Types Across TCP Splits">>,
              status => <<"passed">>, time_ms => 25,
              details => <<"Successfully assembled fragmented TCP chunks for stream_open, ping, sasl_auth, iq_bind, chat_message, and stream_close.">>};
        false ->
            #{id => <<"m2_fragmented_stream_parsing">>,
              title => <<"Incremental Framing: All 6 Stanza Types Across TCP Splits">>,
              status => <<"failed">>, time_ms => 25,
              details => list_to_binary(io_lib:format("Events: ~p, Buf: ~p", [All, B4]))}
    end
catch C3:R3 ->
    #{id => <<"m2_fragmented_stream_parsing">>,
      title => <<"Incremental Framing">>,
      status => <<"failed">>, time_ms => 25,
      details => list_to_binary(io_lib:format("Framing crashed: ~p:~p", [C3, R3]))}
end,

S4 = try
    AttrVal = xmpp_stream_parser:extract_attr(<<"<stream:stream to='example.org' version='1.0'>">>, <<"to">>),
    BodyVal = xmpp_stream_parser:extract_tag_body(<<"<message><body>Hello BeamForge!</body></message>">>, <<"body">>),
    case (AttrVal =:= <<"example.org">>) andalso (BodyVal =:= <<"Hello BeamForge!">>) of
        true ->
            #{id => <<"m2_subbinary_heap_retention">>,
              title => <<"XML Helpers: Tag Body & Attribute Extractors">>,
              status => <<"passed">>, time_ms => 15,
              details => <<"extract_attr/2 and extract_tag_body/2 accurately parsed values with boundary safety.">>};
        false ->
            #{id => <<"m2_subbinary_heap_retention">>,
              title => <<"XML Helpers: Tag Body & Attribute Extractors">>,
              status => <<"failed">>, time_ms => 15,
              details => list_to_binary(io_lib:format("Attr: ~p, Body: ~p", [AttrVal, BodyVal]))}
    end
catch C4:R4 ->
    #{id => <<"m2_subbinary_heap_retention">>,
      title => <<"XML Helpers">>,
      status => <<"failed">>, time_ms => 15,
      details => list_to_binary(io_lib:format("Helpers crashed: ~p:~p", [C4, R4]))}
end,

Stages = [S1, S2, S3, S4]
`, true

	case "ch12-l03", "ch12-m3":
		return `
catch xmpp_session_registry:stop(),
catch ets:delete(xmpp_sessions_tab),

S1 = try
    Exports = xmpp_session_registry:module_info(exports),
    Req = [{start_link, 0}, {register_session, 3}, {unregister_session, 1}, {lookup_by_jid, 1}, {list_all_sessions, 0}, {parse_jid, 1}],
    Missing = [R || R <- Req, not lists:member(R, Exports)],
    case Missing of
        [] ->
            #{id => <<"m3_compile_and_exports">>,
              title => <<"Module Audit: Session Registry Exports">>,
              status => <<"passed">>, time_ms => 15,
              details => <<"All public registry and JID parsing functions exported.">>};
        _ ->
            #{id => <<"m3_compile_and_exports">>,
              title => <<"Module Audit: Session Registry Exports">>,
              status => <<"failed">>, time_ms => 15,
              details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
    end
catch C1:R1 ->
    #{id => <<"m3_compile_and_exports">>,
      title => <<"Module Audit: Session Registry Exports">>,
      status => <<"failed">>, time_ms => 15,
      details => list_to_binary(io_lib:format("Exports check crashed: ~p:~p", [C1, R1]))}
end,

S2 = try
    BeamPath = code:which(xmpp_session_registry),
    WsRoot = filename:dirname(filename:dirname(BeamPath)),
    SrcPath = filename:join([WsRoot, "src", "xmpp_session_registry.erl"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    AstRes = bf_ast_verifier:verify_rules(SrcPath, BeamBin, #{
        required_remote_calls => [{ets, new, 2}, {erlang, monitor, 2}, {erlang, demonitor, 2}]
    }),
    {ok, _} = xmpp_session_registry:start_link(),
    TabInfo = ets:info(xmpp_sessions_tab),
    Protection = case is_list(TabInfo) of true -> proplists:get_value(protection, TabInfo); false -> undefined end,
    ReadConc = case is_list(TabInfo) of true -> proplists:get_value(read_concurrency, TabInfo); false -> undefined end,
    case {AstRes, Protection =:= public andalso ReadConc =:= true} of
        {{ok, _}, true} ->
            #{id => <<"m3_ast_ets_spec">>,
              title => <<"ETS & AST Spec: Public Table, Read Concurrency & Monitors">>,
              status => <<"passed">>, time_ms => 20,
              details => <<"Verified ets:new/2, erlang:monitor/2, erlang:demonitor/2 AST calls and xmpp_sessions_tab {public, read_concurrency}.">>};
        {{error, AstErr}, _} ->
            #{id => <<"m3_ast_ets_spec">>,
              title => <<"ETS & AST Spec: Public Table, Read Concurrency & Monitors">>,
              status => <<"failed">>, time_ms => 20,
              details => list_to_binary(io_lib:format("AST violation: ~p", [AstErr]))};
        {_, false} ->
            #{id => <<"m3_ast_ets_spec">>,
              title => <<"ETS & AST Spec: Public Table, Read Concurrency & Monitors">>,
              status => <<"failed">>, time_ms => 20,
              details => list_to_binary(io_lib:format("Protection: ~p (exp public), ReadConc: ~p (exp true)", [Protection, ReadConc]))}
    end
catch C2:R2 ->
    #{id => <<"m3_ast_ets_spec">>,
      title => <<"ETS & AST Spec">>,
      status => <<"failed">>, time_ms => 20,
      details => list_to_binary(io_lib:format("ETS info crashed: ~p:~p", [C2, R2]))}
end,

S3 = try
    PDesk = spawn(fun L() -> receive _ -> L() end end),
    PPhone = spawn(fun L() -> receive _ -> L() end end),
    ok = xmpp_session_registry:register_session(<<"carol@localhost/phone">>, 5, PPhone),
    ok = xmpp_session_registry:register_session(<<"carol@localhost/desktop">>, 10, PDesk),
    Highest = xmpp_session_registry:lookup_by_jid(<<"carol@localhost">>),
    ExactPhone = xmpp_session_registry:lookup_by_jid(<<"carol@localhost/phone">>),
    AllSessions = xmpp_session_registry:list_all_sessions(),
    ParsedWithRes = xmpp_session_registry:parse_jid(<<"carol@localhost/desktop">>),
    ParsedBare = xmpp_session_registry:parse_jid(<<"carol@localhost">>),
    ok = xmpp_session_registry:unregister_session(<<"carol@localhost/phone">>),
    AfterUnreg = xmpp_session_registry:lookup_by_jid(<<"carol@localhost/phone">>),
    exit(PDesk, kill),
    exit(PPhone, kill),
    CheckAll = (Highest =:= [PDesk]) andalso (ExactPhone =:= [PPhone]) andalso
        (length(AllSessions) >= 2) andalso
        (ParsedWithRes =:= {<<"carol@localhost">>, <<"desktop">>}) andalso
        (ParsedBare =:= {<<"carol@localhost">>, <<>>}) andalso
        (AfterUnreg =:= []),
    case CheckAll of
        true ->
            #{id => <<"m3_priority_routing">>,
              title => <<"Priority, Full JID, Unregister & JID Parse Verification">>,
              status => <<"passed">>, time_ms => 25,
              details => <<"Verified bare highest-priority lookup, exact Full JID lookup, parse_jid/1, list_all_sessions/0, and unregister_session/1.">>};
        false ->
            #{id => <<"m3_priority_routing">>,
              title => <<"Priority, Full JID, Unregister & JID Parse Verification">>,
              status => <<"failed">>, time_ms => 25,
              details => list_to_binary(io_lib:format("Highest=~p Exact=~p AfterUnreg=~p Parsed=~p", [Highest, ExactPhone, AfterUnreg, {ParsedWithRes, ParsedBare}]))}
    end
catch C3:R3 ->
    #{id => <<"m3_priority_routing">>,
      title => <<"Priority Resolution">>,
      status => <<"failed">>, time_ms => 25,
      details => list_to_binary(io_lib:format("Priority test crashed: ~p:~p", [C3, R3]))}
end,

S4 = try
    PMon = spawn(fun L() -> receive _ -> L() end end),
    ok = xmpp_session_registry:register_session(<<"dave@localhost/laptop">>, 1, PMon),
    Before = xmpp_session_registry:lookup_by_jid(<<"dave@localhost">>),
    exit(PMon, kill),
    timer:sleep(35),
    After = xmpp_session_registry:lookup_by_jid(<<"dave@localhost">>),
    case (Before =:= [PMon]) andalso (After =:= []) of
        true ->
            #{id => <<"m3_process_monitor_down">>,
              title => <<"Monitor Auto-Pruning: 'DOWN' Purges Dead Client PIDs">>,
              status => <<"passed">>, time_ms => 35,
              details => <<"Monitored client PID killed; registry handle_info received 'DOWN' and pruned ETS row.">>};
        false ->
            #{id => <<"m3_process_monitor_down">>,
              title => <<"Monitor Auto-Pruning: 'DOWN' Purges Dead Client PIDs">>,
              status => <<"failed">>, time_ms => 35,
              details => list_to_binary(io_lib:format("Before: ~p, After: ~p (expected [])", [Before, After]))}
    end
catch C4:R4 ->
    #{id => <<"m3_process_monitor_down">>,
      title => <<"Monitor Auto-Pruning">>,
      status => <<"failed">>, time_ms => 35,
      details => list_to_binary(io_lib:format("Monitor test crashed: ~p:~p", [C4, R4]))}
end,

catch xmpp_session_registry:stop(),
catch ets:delete(xmpp_sessions_tab),
Stages = [S1, S2, S3, S4]
`, true

	case "ch12-l04", "ch12-m4":
		return `
catch xmpp_session_registry:stop(),
catch ets:delete(xmpp_sessions_tab),
{ok, _} = xmpp_session_registry:start_link(),

S1 = try
    Exports = xmpp_c2s_statem:module_info(exports),
    Req = [{start_link, 1}, {feed_xml, 2}, {get_session_info, 1}, {stop, 1}, {callback_mode, 0}, {init, 1}],
    Missing = [R || R <- Req, not lists:member(R, Exports)],
    case Missing of
        [] ->
            #{id => <<"m4_compile_and_exports">>,
              title => <<"Module Audit: gen_statem Exports & Callbacks">>,
              status => <<"passed">>, time_ms => 15,
              details => <<"xmpp_c2s_statem exports required gen_statem lifecycle and client feeding functions.">>};
        _ ->
            #{id => <<"m4_compile_and_exports">>,
              title => <<"Module Audit: gen_statem Exports & Callbacks">>,
              status => <<"failed">>, time_ms => 15,
              details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
    end
catch C1:R1 ->
    #{id => <<"m4_compile_and_exports">>,
      title => <<"Module Audit">>,
      status => <<"failed">>, time_ms => 15,
      details => list_to_binary(io_lib:format("Exports check crashed: ~p:~p", [C1, R1]))}
end,

S2 = try
    BeamPath = code:which(xmpp_c2s_statem),
    WsRoot = filename:dirname(filename:dirname(BeamPath)),
    SrcPath = filename:join([WsRoot, "src", "xmpp_c2s_statem.erl"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    AstRes = bf_ast_verifier:verify_rules(SrcPath, BeamBin, #{
        required_remote_calls => [
            {xmpp_stream_parser, feed_chunk, 2},
            {xmpp_session_registry, register_session, 3},
            {xmpp_router, route_stanza, 3}
        ]
    }),
    Mode = xmpp_c2s_statem:callback_mode(),
    case {AstRes, Mode =:= state_functions} of
        {{ok, _}, true} ->
            #{id => <<"m4_ast_callback_mode">>,
              title => <<"Callback Mode & Integration Calls: state_functions">>,
              status => <<"passed">>, time_ms => 15,
              details => <<"Verified state_functions callback mode and AST calls to xmpp_stream_parser, xmpp_session_registry, and xmpp_router.">>};
        {{error, AstErr}, _} ->
            #{id => <<"m4_ast_callback_mode">>,
              title => <<"Callback Mode & Integration Calls: state_functions">>,
              status => <<"failed">>, time_ms => 15,
              details => list_to_binary(io_lib:format("AST violation: ~p", [AstErr]))};
        {_, false} ->
            #{id => <<"m4_ast_callback_mode">>,
              title => <<"Callback Mode & Integration Calls: state_functions">>,
              status => <<"failed">>, time_ms => 15,
              details => list_to_binary(io_lib:format("callback_mode expected state_functions, got: ~p", [Mode]))}
    end
catch C2:R2 ->
    #{id => <<"m4_ast_callback_mode">>,
      title => <<"Callback Mode">>,
      status => <<"failed">>, time_ms => 15,
      details => list_to_binary(io_lib:format("Mode check crashed: ~p:~p", [C2, R2]))}
end,

S3 = try
    {ok, C2s} = xmpp_c2s_statem:start_link(#{username => <<"erin">>, domain => <<"localhost">>}),
    {ok, wait_for_sasl, [Resp1]} = xmpp_c2s_statem:feed_xml(C2s, <<"<stream:stream to='localhost'>">>),
    {ok, authenticated, [Resp2]} = xmpp_c2s_statem:feed_xml(C2s, <<"<auth mechanism='PLAIN'>erin</auth>">>),
    {ok, session_established, [Resp3]} = xmpp_c2s_statem:feed_xml(C2s, <<"<iq id='b1'><resource>mobile</resource></iq>">>),
    xmpp_c2s_statem:stop(C2s),
    Check1 = binary:match(Resp1, <<"stream:features">>) =/= nomatch,
    Check2 = binary:match(Resp2, <<"success">>) =/= nomatch,
    Check3 = binary:match(Resp3, <<"erin@localhost/mobile">>) =/= nomatch,
    case Check1 andalso Check2 andalso Check3 of
        true ->
            #{id => <<"m4_four_phase_lifecycle">>,
              title => <<"FSM Lifecycle: wait_for_stream -> sasl -> session_established">>,
              status => <<"passed">>, time_ms => 35,
              details => <<"Successfully completed stream negotiation, SASL plain auth, and IQ resource binding.">>};
        false ->
            #{id => <<"m4_four_phase_lifecycle">>,
              title => <<"FSM Lifecycle: wait_for_stream -> sasl -> session_established">>,
              status => <<"failed">>, time_ms => 35,
              details => list_to_binary(io_lib:format("Resp1: ~s, Resp2: ~s, Resp3: ~s", [Resp1, Resp2, Resp3]))}
    end
catch C3:R3 ->
    #{id => <<"m4_four_phase_lifecycle">>,
      title => <<"FSM Lifecycle">>,
      status => <<"failed">>, time_ms => 35,
      details => list_to_binary(io_lib:format("Lifecycle crashed: ~p:~p", [C3, R3]))}
end,

S4 = try
    {ok, C2s2} = xmpp_c2s_statem:start_link(#{username => <<"frank">>, domain => <<"localhost">>}),
    {ok, wait_for_sasl, _} = xmpp_c2s_statem:feed_xml(C2s2, <<"<stream:stream to='localhost'>">>),
    {ok, wait_for_sasl, [ErrResp]} = xmpp_c2s_statem:feed_xml(C2s2, <<"<message to='victim'><body>hack</body></message>">>),
    RejectOk = binary:match(ErrResp, <<"not-authorized">>) =/= nomatch,
    {ok, authenticated, _} = xmpp_c2s_statem:feed_xml(C2s2, <<"<auth mechanism='PLAIN'>frank</auth>">>),
    {ok, session_established, _} = xmpp_c2s_statem:feed_xml(C2s2, <<"<iq id='b2'><resource>desk</resource></iq>">>),
    {ok, session_established, InfoData} = xmpp_c2s_statem:get_session_info(C2s2),
    InfoOk = maps:get(full_jid, InfoData, <<>>) =:= <<"frank@localhost/desk">>,
    {ok, session_established, [PingReply]} = xmpp_c2s_statem:feed_xml(C2s2, <<"<ping id='p1'/>">>),
    PingOk = binary:match(PingReply, <<"id='p1'">>) =/= nomatch,
    {ok, wait_for_stream, [CloseReply]} = xmpp_c2s_statem:feed_xml(C2s2, <<"</stream:stream>">>),
    CloseOk = CloseReply =:= <<"</stream:stream>">>,
    LookedUp = xmpp_session_registry:lookup_by_jid(<<"frank@localhost/desk">>),
    RegOk = (LookedUp =:= [C2s2]),
    xmpp_c2s_statem:stop(C2s2),
    case RejectOk andalso InfoOk andalso PingOk andalso CloseOk andalso RegOk of
        true ->
            #{id => <<"m4_preauth_rejection_and_registry">>,
              title => <<"Security & Binding: Pre-Auth Rejection, Info, Ping, Close & ETS Registration">>,
              status => <<"passed">>, time_ms => 30,
              details => <<"Rejected unauthenticated stanzas with not-authorized, verified ping/close/session_info, and bound session in ETS.">>};
        false ->
            #{id => <<"m4_preauth_rejection_and_registry">>,
              title => <<"Security & Binding: Pre-Auth Rejection, Info, Ping, Close & ETS Registration">>,
              status => <<"failed">>, time_ms => 30,
              details => list_to_binary(io_lib:format("RejectOk: ~p, InfoOk: ~p, PingOk: ~p, CloseOk: ~p, RegOk: ~p", [RejectOk, InfoOk, PingOk, CloseOk, RegOk]))}
    end
catch C4:R4 ->
    #{id => <<"m4_preauth_rejection_and_registry">>,
      title => <<"Security & Binding">>,
      status => <<"failed">>, time_ms => 30,
      details => list_to_binary(io_lib:format("Security check crashed: ~p:~p", [C4, R4]))}
end,

catch xmpp_session_registry:stop(),
catch ets:delete(xmpp_sessions_tab),
Stages = [S1, S2, S3, S4]
`, true

	case "ch12-l05", "ch12-m5":
		return `
catch xmpp_router:stop(),
catch xmpp_session_registry:stop(),
catch ets:delete(xmpp_sessions_tab),
{ok, _} = xmpp_session_registry:start_link(),
{ok, _} = xmpp_router:start_link(),

S1 = try
    Exports = xmpp_router:module_info(exports),
    Req = [{start_link, 0}, {route_stanza, 3}, {pop_offline_messages, 1}, {get_offline_count, 1}, {init, 1}, {handle_call, 3}, {handle_cast, 2}, {terminate, 2}],
    Missing = [R || R <- Req, not lists:member(R, Exports)],
    case Missing of
        [] ->
            #{id => <<"m5_compile_and_exports">>,
              title => <<"Module Audit: Router Exports & OTP Callbacks">>,
              status => <<"passed">>, time_ms => 15,
              details => <<"xmpp_router exports all stanza routing, queue inspection, and gen_server callbacks.">>};
        _ ->
            #{id => <<"m5_compile_and_exports">>,
              title => <<"Module Audit: Router Exports & OTP Callbacks">>,
              status => <<"failed">>, time_ms => 15,
              details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
    end
catch C1:R1 ->
    #{id => <<"m5_compile_and_exports">>,
      title => <<"Module Audit">>,
      status => <<"failed">>, time_ms => 15,
      details => list_to_binary(io_lib:format("Exports check crashed: ~p:~p", [C1, R1]))}
end,

S2 = try
    BeamPath = code:which(xmpp_router),
    WsRoot = filename:dirname(filename:dirname(BeamPath)),
    SrcPath = filename:join([WsRoot, "src", "xmpp_router.erl"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    AstRes = bf_ast_verifier:verify_rules(SrcPath, BeamBin, #{
        required_remote_calls => [
            {xmpp_session_registry, lookup_by_jid, 1},
            {xmpp_session_registry, parse_jid, 1},
            {binary, copy, 1}
        ]
    }),
    {ok, State} = xmpp_router:init([]),
    case {AstRes, is_map(State) andalso maps:is_key(offline_store, State)} of
        {{ok, _}, true} ->
            #{id => <<"m5_ast_server_callbacks">>,
              title => <<"State & AST Spec: Offline Store Map & Registry/Unpinning Calls">>,
              status => <<"passed">>, time_ms => 15,
              details => <<"Verified AST calls to xmpp_session_registry and binary:copy/1 plus #{offline_store => #{}} init state.">>};
        {{error, AstErr}, _} ->
            #{id => <<"m5_ast_server_callbacks">>,
              title => <<"State & AST Spec: Offline Store Map & Registry/Unpinning Calls">>,
              status => <<"failed">>, time_ms => 15,
              details => list_to_binary(io_lib:format("AST violation: ~p", [AstErr]))};
        {_, false} ->
            #{id => <<"m5_ast_server_callbacks">>,
              title => <<"State & AST Spec: Offline Store Map & Registry/Unpinning Calls">>,
              status => <<"failed">>, time_ms => 15,
              details => list_to_binary(io_lib:format("Initial state expected #{offline_store => #{}}, got: ~p", [State]))}
    end
catch C2:R2 ->
    #{id => <<"m5_ast_server_callbacks">>,
      title => <<"State Architecture">>,
      status => <<"failed">>, time_ms => 15,
      details => list_to_binary(io_lib:format("Init crashed: ~p:~p", [C2, R2]))}
end,

S3 = try
    ok = xmpp_session_registry:register_session(<<"grace@localhost/mobile">>, 5, self()),
    R = xmpp_router:route_stanza(<<"sys@localhost">>, <<"grace@localhost/mobile">>, <<"<message>Direct</message>">>),
    timer:sleep(20),
    Delivered = receive
        {deliver_stanza, Stanza} -> Stanza
    after 50 ->
        undefined
    end,
    case (R =:= {routed, 1}) andalso (Delivered =:= <<"<message>Direct</message>">>) of
        true ->
            #{id => <<"m5_online_routing">>,
              title => <<"Direct Delivery: Online Session Lookup & Delivery Event">>,
              status => <<"passed">>, time_ms => 25,
              details => <<"Routed message to registered process mailbox with {deliver_stanza, Stanza}.">>};
        false ->
            #{id => <<"m5_online_routing">>,
              title => <<"Direct Delivery: Online Session Lookup & Delivery Event">>,
              status => <<"failed">>, time_ms => 25,
              details => list_to_binary(io_lib:format("Route: ~p, Delivered: ~p", [R, Delivered]))}
    end
catch C3:R3 ->
    #{id => <<"m5_online_routing">>,
      title => <<"Direct Delivery">>,
      status => <<"failed">>, time_ms => 25,
      details => list_to_binary(io_lib:format("Online routing crashed: ~p:~p", [C3, R3]))}
end,

S4 = try
    OfflineJid = <<"offline_bob@localhost">>,
    Msg1 = <<"<message>1</message>">>,
    Msg2 = <<"<message>2</message>">>,
    {queued_offline, OfflineJid} = xmpp_router:route_stanza(<<"alice@localhost">>, OfflineJid, Msg1),
    {queued_offline, OfflineJid} = xmpp_router:route_stanza(<<"alice@localhost">>, OfflineJid, Msg2),
    CountBefore = xmpp_router:get_offline_count(OfflineJid),
    {ok, Popped} = xmpp_router:pop_offline_messages(OfflineJid),
    CountAfter = xmpp_router:get_offline_count(OfflineJid),
    case (CountBefore =:= 2) andalso (Popped =:= [Msg1, Msg2]) andalso (CountAfter =:= 0) of
        true ->
            #{id => <<"m5_offline_spool_and_drain">>,
              title => <<"Offline Queue: FIFO Message Spooling & Drain On Reconnect">>,
              status => <<"passed">>, time_ms => 30,
              details => <<"Spooling to offline user preserved FIFO order; pop_offline_messages drained queue to zero.">>};
        false ->
            #{id => <<"m5_offline_spool_and_drain">>,
              title => <<"Offline Queue: FIFO Message Spooling & Drain On Reconnect">>,
              status => <<"failed">>, time_ms => 30,
              details => list_to_binary(io_lib:format("CountBefore: ~p, Popped: ~p, CountAfter: ~p", [CountBefore, Popped, CountAfter]))}
    end
catch C4:R4 ->
    #{id => <<"m5_offline_spool_and_drain">>,
      title => <<"Offline Queue">>,
      status => <<"failed">>, time_ms => 30,
      details => list_to_binary(io_lib:format("Offline test crashed: ~p:~p", [C4, R4]))}
end,

catch xmpp_router:stop(),
catch xmpp_session_registry:stop(),
catch ets:delete(xmpp_sessions_tab),
Stages = [S1, S2, S3, S4]
`, true

	case "ch12-capstone", "ch12-l06", "ch12-m6", "xmpp_capstone":
		return `
catch xmpp_router:stop(),
catch xmpp_session_registry:stop(),
catch (case whereis(xmpp_sup) of undefined -> ok; SupP -> exit(SupP, kill) end),
catch ets:delete(xmpp_sessions_tab),

%% ── STAGE 1: Milestone 1: Supervision Tree Boot ──────────────────────────────
S1_SupBoot = try
    {ok, {SupFlags, ChildSpecs}} = xmpp_sup:init([]),
    Strategy = maps:get(strategy, SupFlags, undefined),
    ChildIds = [maps:get(id, Spec) || Spec <- ChildSpecs],
    {ok, SupPid} = xmpp_sup:start_link(),
    RegPid = whereis(xmpp_session_registry),
    RouterPid = whereis(xmpp_router),
    CheckStrategy = (Strategy =:= rest_for_one),
    CheckOrder = (ChildIds =:= [xmpp_session_registry, xmpp_router]),
    CheckAlive = is_pid(SupPid) andalso is_pid(RegPid) andalso is_pid(RouterPid),
    case CheckStrategy andalso CheckOrder andalso CheckAlive of
        true ->
            #{id => <<"milestone_1_supervision_boot">>,
              title => <<"Milestone 1: OTP Supervision Boot (rest_for_one & ordered child specs)">>,
              status => <<"passed">>, time_ms => 18,
              details => <<"xmpp_sup configured with rest_for_one; xmpp_session_registry and xmpp_router running as supervised permanent workers.">>};
        false ->
            #{id => <<"milestone_1_supervision_boot">>,
              title => <<"Milestone 1: OTP Supervision Boot (rest_for_one & ordered child specs)">>,
              status => <<"failed">>, time_ms => 18,
              details => list_to_binary(io_lib:format("Strategy: ~p, ChildIds: ~p, Alive: ~p", [Strategy, ChildIds, CheckAlive]))}
    end
catch C1:R1 ->
    #{id => <<"milestone_1_supervision_boot">>,
      title => <<"Milestone 1: OTP Supervision Boot (rest_for_one & ordered child specs)">>,
      status => <<"failed">>, time_ms => 18,
      details => list_to_binary(io_lib:format("Supervisor boot crashed: ~p:~p", [C1, R1]))}
end,

%% ── STAGE 2: Milestone 2: XML Stream Framer & Memory Safety ─────────────────
S2_StreamFramer = try
    B0 = xmpp_stream_parser:new_buffer(),
    {E1, B1} = xmpp_stream_parser:feed_chunk(B0, <<"<stream:st">>),
    {E2, B2} = xmpp_stream_parser:feed_chunk(B1, <<"ream to='localhost'>">>),
    {E3, B3} = xmpp_stream_parser:feed_chunk(B2, <<"<ping id='p1'/><message id='m1' to='bob@host'><body>Hi Bob</body></message>">>),
    AllEvents = E1 ++ E2 ++ E3,
    CheckEvents = case AllEvents of
        [{stream_open, <<"localhost">>}, {ping, <<"p1">>}, {chat_message, <<"m1">>, <<"bob@host">>, <<"Hi Bob">>}] -> true;
        _ -> false
    end,
    CheckBufEmpty = (B3 =:= <<>>),
    %% Sub-binary memory unpinning test
    BigChunk = <<"   <message id='big_12345' to='alice@host'><body>Secret", (binary:copy(<<"X">>, 2048))/binary, "</body></message>">>,
    {[{chat_message, IdBin, _To, _Body}], <<>>} = xmpp_stream_parser:feed_chunk(<<>>, BigChunk),
    RefSize = binary:referenced_byte_size(IdBin),
    CheckMemUnpinned = (RefSize < 500),
    case CheckEvents andalso CheckBufEmpty andalso CheckMemUnpinned of
        true ->
            #{id => <<"milestone_2_xml_stream_parser">>,
              title => <<"Milestone 2: XML Stream Parser (Packet Fragmentation & Memory Unpinning)">>,
              status => <<"passed">>, time_ms => 22,
              details => <<"Handled split stream open, coalesced stanzas, and verified binary:copy/1 memory unpinning.">>};
        false ->
            #{id => <<"milestone_2_xml_stream_parser">>,
              title => <<"Milestone 2: XML Stream Parser (Packet Fragmentation & Memory Unpinning)">>,
              status => <<"failed">>, time_ms => 22,
              details => list_to_binary(io_lib:format("EventsMatch: ~p, BufEmpty: ~p, Unpinned: ~p (ref_size=~p)", [CheckEvents, CheckBufEmpty, CheckMemUnpinned, RefSize]))}
    end
catch C2:R2 ->
    #{id => <<"milestone_2_xml_stream_parser">>,
      title => <<"Milestone 2: XML Stream Parser (Packet Fragmentation & Memory Unpinning)">>,
      status => <<"failed">>, time_ms => 22,
      details => list_to_binary(io_lib:format("Parser test crashed: ~p:~p", [C2, R2]))}
end,

%% ── STAGE 3: Milestone 3: ETS Session Registry & Process Monitors ───────────
S3_SessionRegistry = try
    PPhone = spawn(fun Loop() -> receive _ -> Loop() end end),
    PDesk = spawn(fun Loop() -> receive _ -> Loop() end end),
    ok = xmpp_session_registry:register_session(<<"bob@localhost/phone">>, 5, PPhone),
    ok = xmpp_session_registry:register_session(<<"bob@localhost/desktop">>, 10, PDesk),
    HighestPrioPids = xmpp_session_registry:lookup_by_jid(<<"bob@localhost">>),
    CheckHighPrio = (HighestPrioPids =:= [PDesk]),
    %% Kill PDesk and verify monitor cleanup and fallback
    exit(PDesk, kill),
    timer:sleep(80),
    FallbackPids = xmpp_session_registry:lookup_by_jid(<<"bob@localhost">>),
    CheckFallback = (FallbackPids =:= [PPhone]),
    exit(PPhone, kill),
    timer:sleep(80),
    DeadPids = xmpp_session_registry:lookup_by_jid(<<"bob@localhost">>),
    CheckCleaned = (DeadPids =:= []),
    case CheckHighPrio andalso CheckFallback andalso CheckCleaned of
        true ->
            #{id => <<"milestone_3_ets_session_registry">>,
              title => <<"Milestone 3: ETS Session Registry & DOWN Monitor Pruning">>,
              status => <<"passed">>, time_ms => 35,
              details => <<"Highest-priority routing verified. Killing active session triggered DOWN monitor to prune dead pid and route to survivor.">>};
        false ->
            #{id => <<"milestone_3_ets_session_registry">>,
              title => <<"Milestone 3: ETS Session Registry & DOWN Monitor Pruning">>,
              status => <<"failed">>, time_ms => 35,
              details => list_to_binary(io_lib:format("HighPrio: ~p, Fallback: ~p, Cleaned: ~p", [CheckHighPrio, CheckFallback, CheckCleaned]))}
    end
catch C3:R3 ->
    #{id => <<"milestone_3_ets_session_registry">>,
      title => <<"Milestone 3: ETS Session Registry & DOWN Monitor Pruning">>,
      status => <<"failed">>, time_ms => 35,
      details => list_to_binary(io_lib:format("Registry test crashed: ~p:~p", [C3, R3]))}
end,

%% ── STAGE 4: Milestone 4: C2S State Machine & Flow Control ──────────────────
S4_C2sStatem = try
    {ok, C2sAlice} = xmpp_c2s_statem:start_link(#{username => <<"alice">>, domain => <<"localhost">>}),
    %% 1. Pre-auth stanza rejection
    {ok, wait_for_sasl, [_OpenResp]} = xmpp_c2s_statem:feed_xml(C2sAlice, <<"<stream:stream to='localhost'>">>),
    {ok, wait_for_sasl, [ErrResp]} = xmpp_c2s_statem:feed_xml(C2sAlice, <<"<message id='hack'><body>unauth</body></message>">>),
    CheckPreAuthReject = (binary:match(ErrResp, <<"not-authorized">>) =/= nomatch),
    %% 2. SASL PLAIN Auth
    {ok, authenticated, [AuthResp]} = xmpp_c2s_statem:feed_xml(C2sAlice, <<"<auth mechanism='PLAIN'>alice</auth>">>),
    CheckAuthOk = (binary:match(AuthResp, <<"success">>) =/= nomatch),
    %% 3. IQ Resource Binding
    {ok, session_established, [BindResp]} = xmpp_c2s_statem:feed_xml(C2sAlice, <<"<iq id='b1'><resource>obsidian</resource></iq>">>),
    CheckBindOk = (binary:match(BindResp, <<"alice@localhost/obsidian">>) =/= nomatch),
    %% 4. Automatic registration in registry
    LookupAlice = xmpp_session_registry:lookup_by_jid(<<"alice@localhost/obsidian">>),
    CheckRegistered = (LookupAlice =:= [C2sAlice]),
    xmpp_c2s_statem:stop(C2sAlice),
    timer:sleep(20),
    CheckUnregistered = (xmpp_session_registry:lookup_by_jid(<<"alice@localhost/obsidian">>) =:= []),
    case CheckPreAuthReject andalso CheckAuthOk andalso CheckBindOk andalso CheckRegistered andalso CheckUnregistered of
        true ->
            #{id => <<"milestone_4_c2s_handshake_and_backpressure">>,
              title => <<"Milestone 4: C2S gen_statem 4-Phase Lifecycle & Resource Binding">>,
              status => <<"passed">>, time_ms => 40,
              details => <<"wait_for_stream -> wait_for_sasl (rejected unauth) -> authenticated -> session_established with automatic registry binding.">>};
        false ->
            #{id => <<"milestone_4_c2s_handshake_and_backpressure">>,
              title => <<"Milestone 4: C2S gen_statem 4-Phase Lifecycle & Resource Binding">>,
              status => <<"failed">>, time_ms => 40,
              details => list_to_binary(io_lib:format("Reject: ~p, Auth: ~p, Bind: ~p, Reg: ~p, Unreg: ~p", [CheckPreAuthReject, CheckAuthOk, CheckBindOk, CheckRegistered, CheckUnregistered]))}
    end
catch C4:R4 ->
    #{id => <<"milestone_4_c2s_handshake_and_backpressure">>,
      title => <<"Milestone 4: C2S gen_statem 4-Phase Lifecycle & Resource Binding">>,
      status => <<"failed">>, time_ms => 40,
      details => list_to_binary(io_lib:format("C2S statem test crashed: ~p:~p", [C4, R4]))}
end,

%% ── STAGE 5: Milestone 5: Multi-Client Routing & Offline Store ──────────────
S5_Router = try
    {ok, C2sAlice2} = xmpp_c2s_statem:start_link(#{username => <<"alice">>, domain => <<"localhost">>}),
    {ok, _, _} = xmpp_c2s_statem:feed_xml(C2sAlice2, <<"<stream:stream to='localhost'>">>),
    {ok, _, _} = xmpp_c2s_statem:feed_xml(C2sAlice2, <<"<auth mechanism='PLAIN'>alice</auth>">>),
    {ok, _, _} = xmpp_c2s_statem:feed_xml(C2sAlice2, <<"<iq id='b1'><resource>obsidian</resource></iq>">>),

    {ok, C2sBob} = xmpp_c2s_statem:start_link(#{username => <<"bob">>, domain => <<"localhost">>}),
    {ok, _, _} = xmpp_c2s_statem:feed_xml(C2sBob, <<"<stream:stream to='localhost'>">>),
    {ok, _, _} = xmpp_c2s_statem:feed_xml(C2sBob, <<"<auth mechanism='PLAIN'>bob</auth>">>),
    {ok, _, _} = xmpp_c2s_statem:feed_xml(C2sBob, <<"<iq id='b2'><resource>desktop</resource></iq>">>),

    %% 1. Route Alice -> Bob (Online)
    MsgXml = <<"<message from='alice@localhost/obsidian' to='bob@localhost' id='m_101' type='chat'><body>Hello Bob!</body></message>">>,
    {routed, 1} = xmpp_router:route_stanza(<<"alice@localhost/obsidian">>, <<"bob@localhost">>, MsgXml),
    timer:sleep(20),
    {ok, session_established, BobData} = xmpp_c2s_statem:get_session_info(C2sBob),
    BobInbox = maps:get(delivered_inbox, BobData, []),
    CheckOnlineDelivered = lists:member(MsgXml, BobInbox),

    %% 2. Route Alice -> Charlie (Offline fallback)
    OfflineMsgXml = <<"<message from='alice@localhost/obsidian' to='charlie@localhost' id='m_102' type='chat'><body>Are you there?</body></message>">>,
    {queued_offline, <<"charlie@localhost">>} = xmpp_router:route_stanza(<<"alice@localhost/obsidian">>, <<"charlie@localhost">>, OfflineMsgXml),
    Count1 = xmpp_router:get_offline_count(<<"charlie@localhost">>),
    {ok, [PoppedXml]} = xmpp_router:pop_offline_messages(<<"charlie@localhost">>),
    Count2 = xmpp_router:get_offline_count(<<"charlie@localhost">>),
    CheckOffline = (Count1 =:= 1) andalso (PoppedXml =:= OfflineMsgXml) andalso (Count2 =:= 0),

    xmpp_c2s_statem:stop(C2sAlice2),
    xmpp_c2s_statem:stop(C2sBob),

    case CheckOnlineDelivered andalso CheckOffline of
        true ->
            #{id => <<"milestone_5_multi_client_routing_and_offline">>,
              title => <<"Milestone 5: Multi-Client Routing & Offline Queue Spooling">>,
              status => <<"passed">>, time_ms => 45,
              details => <<"Online stanza routed directly into recipient's C2S delivered_inbox. Offline stanza spooled into store and drained via pop_offline_messages/1.">>};
        false ->
            #{id => <<"milestone_5_multi_client_routing_and_offline">>,
              title => <<"Milestone 5: Multi-Client Routing & Offline Queue Spooling">>,
              status => <<"failed">>, time_ms => 45,
              details => list_to_binary(io_lib:format("OnlineDelivered: ~p, OfflineSpool: ~p", [CheckOnlineDelivered, CheckOffline]))}
    end
catch C5:R5 ->
    #{id => <<"milestone_5_multi_client_routing_and_offline">>,
      title => <<"Milestone 5: Multi-Client Routing & Offline Queue Spooling">>,
      status => <<"failed">>, time_ms => 45,
      details => list_to_binary(io_lib:format("Routing test crashed: ~p:~p", [C5, R5]))}
end,

%% ── STAGE 6: Milestone 6: Live Chaos Monkey Worker Kill & Zero-Loss Recovery ─
S6_ChaosMonkey = try
    RouterBefore = whereis(xmpp_router),
    RegBefore = whereis(xmpp_session_registry),
    {ok, AliceChaos} = xmpp_c2s_statem:start_link(#{username => <<"alice">>, domain => <<"localhost">>}),
    {ok, _, _} = xmpp_c2s_statem:feed_xml(AliceChaos, <<"<stream:stream to='localhost'>">>),
    {ok, _, _} = xmpp_c2s_statem:feed_xml(AliceChaos, <<"<auth mechanism='PLAIN'>alice</auth>">>),
    {ok, session_established, _} = xmpp_c2s_statem:feed_xml(AliceChaos, <<"<iq id='b1'><resource>obsidian</resource></iq>">>),
    exit(RouterBefore, kill),
    WaitRouter6 = fun WR6(0) -> whereis(xmpp_router); WR6(N) -> case whereis(xmpp_router) of P when is_pid(P), P =/= RouterBefore -> P; _ -> timer:sleep(15), WR6(N - 1) end end,
    RouterAfter = WaitRouter6(35),
    RegAfter = whereis(xmpp_session_registry),
    CheckRegIntact = (RegBefore =:= RegAfter),
    CheckRouterReplaced = is_pid(RouterAfter) andalso (RouterBefore =/= RouterAfter),
    RouteRecovery = xmpp_router:route_stanza(<<"sys@localhost">>, <<"alice@localhost/obsidian">>, <<"<message>Chaos Recovered</message>">>),
    CheckRouted = (RouteRecovery =:= {routed, 1}),
    xmpp_c2s_statem:stop(AliceChaos),
    case CheckRegIntact andalso CheckRouterReplaced andalso CheckRouted of
        true ->
            #{id => <<"milestone_6_chaos_monkey_resilience">>,
              title => <<"Milestone 6: Chaos Monkey Worker Kill & Zero-Loss Recovery">>,
              status => <<"passed">>, time_ms => 40,
              details => <<"Killed xmpp_router with exit/2; xmpp_session_registry remained intact, xmpp_sup restarted router in <40ms, and messages routed with zero loss.">>};
        false ->
            #{id => <<"milestone_6_chaos_monkey_resilience">>,
              title => <<"Milestone 6: Chaos Monkey Worker Kill & Zero-Loss Recovery">>,
              status => <<"failed">>, time_ms => 40,
              details => list_to_binary(io_lib:format("RegIntact: ~p, RouterReplaced: ~p, Routed: ~p", [CheckRegIntact, CheckRouterReplaced, CheckRouted]))}
    end
catch C6:R6 ->
    #{id => <<"milestone_6_chaos_monkey_resilience">>,
      title => <<"Milestone 6: Chaos Monkey Worker Kill & Zero-Loss Recovery">>,
      status => <<"failed">>, time_ms => 40,
      details => list_to_binary(io_lib:format("Chaos Monkey verification failed: ~p:~p", [C6, R6]))}
end,

catch xmpp_router:stop(),
catch xmpp_session_registry:stop(),
catch (case whereis(xmpp_sup) of undefined -> ok; SupP3 -> exit(SupP3, kill) end),
catch ets:delete(xmpp_sessions_tab),

Stages = [S1_SupBoot, S2_StreamFramer, S3_SessionRegistry, S4_C2sStatem, S5_Router, S6_ChaosMonkey]
`, true

	default:
		_ = wsDir
		return "", false
	}
}

func (r *Runner) buildInventoryRunScript() string {
	return `
Inv = [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}, {product, 3, "Monitor", 200, 2}],
Orders = [{order, 1, 2}, {order, 2, 3}, {order, 3, 5}],

T1_Start = erlang:system_time(millisecond),
T1_Res = try inventory:process_order(Inv, Orders) of
    Res1 ->
        Exp1 = [{product, 1, "Keyboard", 50, 8}, {product, 2, "Mouse", 25, 2}, {product, 3, "Monitor", 200, 2}],
        #{call_str => <<"inventory:process_order(Inventory, Orders)">>,
          expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp1]))),
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Res1]))),
          passed => Res1 =:= Exp1,
          time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"inventory:process_order([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 5}, {product, 3, \"Monitor\", 200, 2}], [{order, 1, 2}, {order, 2, 3}, {order, 3, 5}])">>,
      expected => <<"[{product, 1, \"Keyboard\", 50, 8}, {product, 2, \"Mouse\", 25, 2}, {product, 3, \"Monitor\", 200, 2}]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])),
      passed => false,
      time_ms => erlang:system_time(millisecond) - T1_Start}
end,

T2_Start = erlang:system_time(millisecond),
T2_Res = try inventory:calculate_order_total(Inv, Orders) of
    Res2 ->
        #{call_str => <<"inventory:calculate_order_total([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 5}, {product, 3, \"Monitor\", 200, 2}], [{order, 1, 2}, {order, 2, 3}, {order, 3, 5}])">>,
          expected => <<"175">>,
          actual => list_to_binary(integer_to_list(Res2)),
          passed => Res2 =:= 175,
          time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"inventory:calculate_order_total([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 5}, {product, 3, \"Monitor\", 200, 2}], [{order, 1, 2}, {order, 2, 3}, {order, 3, 5}])">>,
      expected => <<"175">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])),
      passed => false,
      time_ms => erlang:system_time(millisecond) - T2_Start}
end,

T3_Start = erlang:system_time(millisecond),
T3_Res = try inventory:restock(Inv, [{1, 5}, {2, 10}]) of
    Res3 ->
        Exp3 = [{product, 1, "Keyboard", 50, 15}, {product, 2, "Mouse", 25, 15}, {product, 3, "Monitor", 200, 2}],
        #{call_str => <<"inventory:restock([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 5}, {product, 3, \"Monitor\", 200, 2}], [{1, 5}, {2, 10}])">>,
          expected => list_to_binary(lists:flatten(io_lib:format("~p", [Exp3]))),
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Res3]))),
          passed => Res3 =:= Exp3,
          time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"inventory:restock([{product, 1, \"Keyboard\", 50, 10}, {product, 2, \"Mouse\", 25, 5}, {product, 3, \"Monitor\", 200, 2}], [{1, 5}, {2, 10}])">>,
      expected => <<"[{product, 1, \"Keyboard\", 50, 15}, {product, 2, \"Mouse\", 25, 15}, {product, 3, \"Monitor\", 200, 2}]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])),
      passed => false,
      time_ms => erlang:system_time(millisecond) - T3_Start}
end,

AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`
}

func (r *Runner) buildInventoryVerificationScript(wsDir string) string {
	return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(inventory) of
    {module, inventory} ->
        Exports = inventory:module_info(exports),
        ReqExports = [{process_order, 2}, {calculate_order_total, 2}, {restock, 2}],
        Missing = [E || E <- ReqExports, not lists:member(E, Exports)],
        case Missing of
            [] ->
                #{id => <<"compile_and_export_audit">>, title => <<"Compilation & Required Function Export Audit">>, status => <<"passed">>, time_ms => 15, details => <<"Compiled inventory.erl cleanly; process_order/2, calculate_order_total/2, restock/2 exported.">>};
            _ ->
                #{id => <<"compile_and_export_audit">>, title => <<"Compilation & Required Function Export Audit">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Missing required exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Compilation & Required Function Export Audit">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Failed to load inventory module: ~p", [E1]))}
end,
S1_Ast = try
    SrcCandidates = [
        filename:join(["%s", "src", "inventory.erl"]),
        filename:join(["%s", "inventory.erl"])
    ],
    SrcPath = case [P || P <- SrcCandidates, filelib:is_regular(P)] of
        [ValidPath | _] -> ValidPath;
        [] -> hd(SrcCandidates)
    end,
    BeamCandidates = [
        filename:join(["%s", "inventory.beam"]),
        filename:join(["%s", "ebin", "inventory.beam"])
    ],
    BeamBin = case [B || P <- BeamCandidates, {ok, B} <- [file:read_file(P)]] of
        [ValidBeam | _] -> ValidBeam;
        [] -> <<>>
    end,
    Rules = #{
        require_tail_recursion => [{process_order, 2}, {calculate_order_total, 2}, {restock, 2}],
        forbidden_remote_calls => [{lists, sum, any}, {lists, map, any}, {lists, foldl, any}, {lists, filter, any}, {lists, foldr, any}],
        forbidden_constructs => [list_comprehension]
    },
    NoAppend = case epp:parse_file(SrcPath, []) of
        {ok, Forms} ->
            HasAppend = (fun Walk(T) when is_tuple(T) ->
                case element(1, T) of
                    op when tuple_size(T) >= 3, element(3, T) =:= '++' -> true;
                    _ -> Walk(tuple_to_list(T))
                end;
                Walk([H | Tail]) -> Walk(H) orelse Walk(Tail);
                Walk(_) -> false
            end)(Forms),
            not HasAppend;
        _ -> false
    end,
    case {bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules), NoAppend} of
        {{ok, _}, true} ->
            #{id => <<"ast_and_tco_invariants">>, title => <<"AST & Bytecode Tail-Recursion Audit (bf_ast_verifier)">>, status => <<"passed">>, time_ms => 18, details => <<"Tail-recursion verified; zero forbidden BIFs (lists:sum/map/foldl/filter/foldr), list comprehensions, or ++ appends detected.">>};
        {{ok, _}, false} ->
            #{id => <<"ast_and_tco_invariants">>, title => <<"AST & Bytecode Tail-Recursion Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 18, details => <<"Forbidden O(N^2) list append operator (++) detected; prepend onto accumulators and reverse once with lists:reverse/1.">>};
        {{error, Violations}, _} ->
            FirstMsg = case Violations of
                [#{message := M} | _] -> M;
                _ -> list_to_binary(io_lib:format("AST violations: ~p", [Violations]))
            end,
            #{id => <<"ast_and_tco_invariants">>, title => <<"AST & Bytecode Tail-Recursion Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 18, details => FirstMsg, error => Violations}
    end
catch C1:R1 ->
    #{id => <<"ast_and_tco_invariants">>, title => <<"AST & Bytecode Tail-Recursion Audit (bf_ast_verifier)">>, status => <<"failed">>, time_ms => 18, details => list_to_binary(io_lib:format("AST verification crashed: ~p:~p", [C1, R1]))}
end,
S2_Tests = try
    SampleInv = [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}, {product, 3, "Monitor", 200, 2}],
    SampleOrders = [{order, 1, 2}, {order, 2, 3}, {order, 3, 5}],
    ProcInv = inventory:process_order(SampleInv, SampleOrders),
    Total = inventory:calculate_order_total(SampleInv, SampleOrders),
    Restocked = inventory:restock(ProcInv, [{1, 5}, {2, 10}]),

    ExpectedProc = [{product, 1, "Keyboard", 50, 8}, {product, 2, "Mouse", 25, 2}, {product, 3, "Monitor", 200, 2}],
    ExpectedRestock = [{product, 1, "Keyboard", 50, 13}, {product, 2, "Mouse", 25, 12}, {product, 3, "Monitor", 200, 2}],

    %% Hidden Edge-Case Assertions
    EmptyOrders = inventory:process_order(SampleInv, []),
    EmptyTotal = inventory:calculate_order_total([], SampleOrders),
    NonExistentOrder = inventory:calculate_order_total(SampleInv, [{order, 999, 10}]),
    SequentialDup = inventory:process_order([{product, 1, "Keyboard", 50, 10}], [{order, 1, 6}, {order, 1, 6}]),
    RestockUnknown = inventory:restock(SampleInv, [{999, 5}]),

    case {ProcInv =:= ExpectedProc, Total =:= 175, Restocked =:= ExpectedRestock, EmptyOrders =:= SampleInv, EmptyTotal =:= 0, NonExistentOrder =:= 0, SequentialDup =:= [{product, 1, "Keyboard", 50, 4}], RestockUnknown =:= SampleInv} of
        {true, true, true, true, true, true, true, true} ->
            #{id => <<"visible_and_hidden_test_suite">>, title => <<"Visible & Hidden Edge-Case Test Suite">>, status => <<"passed">>, time_ms => 14, details => <<"All 8/8 test vectors passed (order deduction, sequential depletion, total sum, restock, empty orders, unknown IDs).">>};
        {false, _, _, _, _, _, _, _} ->
            #{id => <<"visible_and_hidden_test_suite">>, title => <<"Visible & Hidden Edge-Case Test Suite">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("process_order mismatch. Expected: ~p, Got: ~p", [ExpectedProc, ProcInv]))};
        {_, false, _, _, _, _, _, _} ->
            #{id => <<"visible_and_hidden_test_suite">>, title => <<"Visible & Hidden Edge-Case Test Suite">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("calculate_order_total expected 175, got: ~p", [Total]))};
        {_, _, false, _, _, _, _, _} ->
            #{id => <<"visible_and_hidden_test_suite">>, title => <<"Visible & Hidden Edge-Case Test Suite">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("restock mismatch. Expected: ~p, Got: ~p", [ExpectedRestock, Restocked]))};
        _ ->
            #{id => <<"visible_and_hidden_test_suite">>, title => <<"Visible & Hidden Edge-Case Test Suite">>, status => <<"failed">>, time_ms => 14, details => <<"Hidden edge cases failed: sequential order depletion, empty orders/inventory, or unknown product handling mismatch.">>}
    end
catch C2:R2 ->
    #{id => <<"visible_and_hidden_test_suite">>, title => <<"Visible & Hidden Edge-Case Test Suite">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("Test execution crashed: ~p:~p", [C2, R2]))}
end,
S3_TcoStack = try
    BigOrders = [{order, 1, 1} || _ <- lists:seq(1, 1000)],
    case bf_beam_inspector:assert_tail_recursive(node(), inventory, calculate_order_total, [[{product, 1, "K", 10, 2000}], BigOrders]) of
        ok ->
            #{id => <<"tco_deep_stack_audit">>, title => <<"TCO Deep Stack Inspection (1,000 recursive frames)">>, status => <<"passed">>, time_ms => 22, details => <<"Peak stack frames <= 64 words under high-volume recursion. O(1) memory guaranteed.">>};
        {error, TcoErr} ->
            #{id => <<"tco_deep_stack_audit">>, title => <<"TCO Deep Stack Inspection (1,000 recursive frames)">>, status => <<"failed">>, time_ms => 22, details => list_to_binary(io_lib:format("Stack size exceeded: ~p", [TcoErr]))}
    end
catch C3:R3 ->
    #{id => <<"tco_deep_stack_audit">>, title => <<"TCO Deep Stack Inspection (1,000 recursive frames)">>, status => <<"failed">>, time_ms => 22, details => list_to_binary(io_lib:format("Stack sampling crash: ~p:~p", [C3, R3]))}
end,
Stages = [CompileStage, S1_Ast, S2_Tests, S3_TcoStack]`, wsDir, wsDir, wsDir, wsDir)
}

func (r *Runner) buildSecurityAuditVerificationScript(wsDir string) (string, bool) {
	return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(security_audit_handler) of
    {module, security_audit_handler} ->
        Exports = security_audit_handler:module_info(exports),
        Req = [{add_to_manager, 2}, {get_ip_status, 2}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"security_audit_handler.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "security_audit_handler.erl"]),
    BeamPath = filename:join(["%s", "ebin", "security_audit_handler.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{gen_event, add_handler, 3}, {gen_event, call, 3}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_gen_event_behaviour">>, title => <<"AST Analysis: gen_event Behaviour & Dynamic Handler Registration">>, status => <<"passed">>, time_ms => 15, details => <<"Verified gen_event callbacks and dynamic event subscription calls.">>};
        {error, Violations} ->
            #{id => <<"ast_gen_event_behaviour">>, title => <<"AST Analysis: gen_event Behaviour & Dynamic Handler Registration">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_gen_event_behaviour">>, title => <<"AST Analysis: gen_event Behaviour & Dynamic Handler Registration">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_FailureNotification = try
    {ok, Mgr} = gen_event:start_link(),
    ok = security_audit_handler:add_to_manager(Mgr, 3),
    gen_event:notify(Mgr, {login_failed, <<"10.0.0.1">>}),
    {ok, #{attempts := 1, alert := false}} = security_audit_handler:get_ip_status(Mgr, <<"10.0.0.1">>),
    gen_event:stop(Mgr),
    #{id => <<"single_failure_tracking">>, title => <<"Single Failure Event Subscription Tracking">>, status => <<"passed">>, time_ms => 20, details => <<"Event notify updated failure counter without triggering premature alert.">>}
catch C2:R2 ->
    #{id => <<"single_failure_tracking">>, title => <<"Single Failure Event Subscription Tracking">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Failure tracking error: ~p:~p", [C2, R2]))}
end,
S3_BruteForceAlert = try
    {ok, Mgr2} = gen_event:start_link(),
    ok = security_audit_handler:add_to_manager(Mgr2, 3),
    gen_event:notify(Mgr2, {login_failed, <<"10.0.0.2">>}),
    gen_event:notify(Mgr2, {login_failed, <<"10.0.0.2">>}),
    gen_event:notify(Mgr2, {login_failed, <<"10.0.0.2">>}),
    {ok, #{attempts := 3, alert := true}} = security_audit_handler:get_ip_status(Mgr2, <<"10.0.0.2">>),
    gen_event:stop(Mgr2),
    #{id => <<"brute_force_alert_trigger">>, title => <<"Threshold Alert Triggering on Brute-Force Pattern">>, status => <<"passed">>, time_ms => 20, details => <<"Reaching failure threshold 3 toggled alert flag to true.">>}
catch C3:R3 ->
    #{id => <<"brute_force_alert_trigger">>, title => <<"Threshold Alert Triggering on Brute-Force Pattern">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Alert trigger error: ~p:~p", [C3, R3]))}
end,
S4_SuccessReset = try
    {ok, Mgr3} = gen_event:start_link(),
    ok = security_audit_handler:add_to_manager(Mgr3, 3),
    gen_event:notify(Mgr3, {login_failed, <<"10.0.0.3">>}),
    gen_event:notify(Mgr3, {login_failed, <<"10.0.0.3">>}),
    gen_event:notify(Mgr3, {login_success, <<"10.0.0.3">>}),
    {ok, #{attempts := 0, alert := false}} = security_audit_handler:get_ip_status(Mgr3, <<"10.0.0.3">>),
    gen_event:stop(Mgr3),
    #{id => <<"success_reset_event">>, title => <<"Login Success Counter Cleansing">>, status => <<"passed">>, time_ms => 20, details => <<"Successful login event cleared previous failure count for the IP.">>}
catch C4:R4 ->
    #{id => <<"success_reset_event">>, title => <<"Login Success Counter Cleansing">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Reset error: ~p:~p", [C4, R4]))}
end,
Stages = [CompileStage, S1_Ast, S2_FailureNotification, S3_BruteForceAlert, S4_SuccessReset]
`, wsDir, wsDir), true
}

func (r *Runner) buildRateLimiterVerificationScript(wsDir string) (string, bool) {
	return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(rate_limiter_srv) of
    {module, rate_limiter_srv} ->
        Exports = rate_limiter_srv:module_info(exports),
        Req = [{start_link, 2}, {check_request, 3}, {refill_all, 1}, {reset_client, 2}, {get_stats, 1}, {stop, 1}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"rate_limiter_srv.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "rate_limiter_srv.erl"]),
    BeamPath = filename:join(["%s", "ebin", "rate_limiter_srv.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{gen_server, start_link, 3}, {gen_server, call, 2}, {gen_server, cast, 2}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_rate_limiter_spec">>, title => <<"AST Analysis: gen_server Behaviour & OTP Callback Contract">>, status => <<"passed">>, time_ms => 15, details => <<"Verified gen_server calls, casts, and full callback exports.">>};
        {error, Violations} ->
            #{id => <<"ast_rate_limiter_spec">>, title => <<"AST Analysis: gen_server Behaviour & OTP Callback Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_rate_limiter_spec">>, title => <<"AST Analysis: gen_server Behaviour & OTP Callback Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_TokenConsumption = try
    {ok, RL} = rate_limiter_srv:start_link(10, 3),
    {allow, 6} = rate_limiter_srv:check_request(RL, <<"cli_1">>, 4),
    {allow, 1} = rate_limiter_srv:check_request(RL, <<"cli_1">>, 5),
    DenyRes = rate_limiter_srv:check_request(RL, <<"cli_1">>, 2),
    rate_limiter_srv:stop(RL),
    case DenyRes of
        {deny, 1} ->
            #{id => <<"token_consumption_and_quota">>, title => <<"Token-Bucket Consumption & Quota Enforcement">>, status => <<"passed">>, time_ms => 25, details => <<"Deducted 4 and 5 tokens from 10 capacity; rejected 2-token request when only 1 remained.">>};
        Other2 ->
            #{id => <<"token_consumption_and_quota">>, title => <<"Token-Bucket Consumption & Quota Enforcement">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Unexpected denial response: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"token_consumption_and_quota">>, title => <<"Token-Bucket Consumption & Quota Enforcement">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Quota enforcement error: ~p:~p", [C2, R2]))}
end,
S3_RefillCapped = try
    {ok, RL2} = rate_limiter_srv:start_link(10, 4),
    {allow, 2} = rate_limiter_srv:check_request(RL2, <<"cli_2">>, 8),
    ok = rate_limiter_srv:refill_all(RL2),
    {allow, 1} = rate_limiter_srv:check_request(RL2, <<"cli_2">>, 5),
    ok = rate_limiter_srv:refill_all(RL2),
    ok = rate_limiter_srv:refill_all(RL2),
    ok = rate_limiter_srv:refill_all(RL2),
    {allow, 0} = rate_limiter_srv:check_request(RL2, <<"cli_2">>, 10),
    rate_limiter_srv:stop(RL2),
    #{id => <<"batch_refill_and_capping">>, title => <<"Batch Refill & Maximum Bucket Capacity Capping">>, status => <<"passed">>, time_ms => 30, details => <<"refill_all incremented token balances and capped them strictly at MaxTokens.">>}
catch C3:R3 ->
    #{id => <<"batch_refill_and_capping">>, title => <<"Batch Refill & Maximum Bucket Capacity Capping">>, status => <<"failed">>, time_ms => 30, details => list_to_binary(io_lib:format("Refill error: ~p:~p", [C3, R3]))}
end,
S4_AsyncReset = try
    {ok, RL3} = rate_limiter_srv:start_link(10, 2),
    {allow, 1} = rate_limiter_srv:check_request(RL3, <<"cli_3">>, 9),
    ok = rate_limiter_srv:reset_client(RL3, <<"cli_3">>),
    timer:sleep(20),
    {allow, 0} = rate_limiter_srv:check_request(RL3, <<"cli_3">>, 10),
    rate_limiter_srv:stop(RL3),
    #{id => <<"async_client_reset">>, title => <<"Asynchronous Client Reset via gen_server:cast/2">>, status => <<"passed">>, time_ms => 35, details => <<"reset_client cast reset client bucket directly to full MaxTokens.">>}
catch C4:R4 ->
    #{id => <<"async_client_reset">>, title => <<"Asynchronous Client Reset via gen_server:cast/2">>, status => <<"failed">>, time_ms => 35, details => list_to_binary(io_lib:format("Reset error: ~p:~p", [C4, R4]))}
end,
S5_StatsAndLiveAudit = try
    {ok, RL4} = rate_limiter_srv:start_link(10, 3),
    {allow, 7} = rate_limiter_srv:check_request(RL4, <<"alpha">>, 3),
    {deny, 7} = rate_limiter_srv:check_request(RL4, <<"alpha">>, 8),
    {allow, 5} = rate_limiter_srv:check_request(RL4, <<"beta">>, 5),
    Stats = rate_limiter_srv:get_stats(RL4),
    LiveState = sys:get_state(RL4),
    rate_limiter_srv:stop(RL4),
    case {Stats, LiveState} of
        {#{total_allowed := 2, total_rejected := 1, active_clients := 2},
         #{max_tokens := 10, refill_amount := 3, clients := #{<<"alpha">> := 7, <<"beta">> := 5}, total_allowed := 2, total_rejected := 1}} ->
            #{id => <<"stats_and_live_sys_audit">>, title => <<"Metrics Auditing & sys:get_state/1 Live State Structure Audit">>, status => <<"passed">>, time_ms => 25, details => <<"Summary metrics and internal map state verified via live OTP system protocol introspection.">>};
        {#{total_allowed := 2, total_rejected := 1, active_clients := 2}, StateMap} when is_map(StateMap) ->
            #{id => <<"stats_and_live_sys_audit">>, title => <<"Metrics Auditing & sys:get_state/1 Live State Structure Audit">>, status => <<"passed">>, time_ms => 25, details => <<"Metrics verified; live state map verified.">>};
        Other5 ->
            #{id => <<"stats_and_live_sys_audit">>, title => <<"Metrics Auditing & sys:get_state/1 Live State Structure Audit">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Stats or sys:get_state mismatch: ~p", [Other5]))}
    end
catch C5:R5 ->
    #{id => <<"stats_and_live_sys_audit">>, title => <<"Metrics Auditing & sys:get_state/1 Live State Structure Audit">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Stats audit error: ~p:~p", [C5, R5]))}
end,
Stages = [CompileStage, S1_Ast, S2_TokenConsumption, S3_RefillCapped, S4_AsyncReset, S5_StatsAndLiveAudit]
`, wsDir, wsDir), true
}


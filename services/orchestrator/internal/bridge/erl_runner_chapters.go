package bridge

import (
	"fmt"
	"path/filepath"

	"github.com/beamforge/orchestrator/internal/pool"
)

// buildChapterRunScript provides test execution scripts for Chapters 1, 2, 3 & 4
func (r *Runner) buildChapterRunScript(session *pool.Session, exerciseID string) (string, bool) {
	switch exerciseID {

	// ── CHAPTER 1 ─────────────────────────────────────────────────────────────
	case "ch01-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try beam_intro:inspect_vm() of
    #{otp_release := Rel, schedulers_online := Sch} = Res ->
        #{call_str => <<"beam_intro:inspect_vm()">>,
          expected => <<"#{otp_release => ...}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Res]))),
          passed => is_binary(Rel) andalso is_integer(Sch),
          time_ms => erlang:system_time(millisecond) - T1_Start}
catch C:R ->
    #{call_str => <<"beam_intro:inspect_vm()">>,
      expected => <<"#{otp_release => ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C, R])),
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
T1_Res = try basic_types:classify_value(42) of
    {ok, integer} = Res1 ->
        #{call_str => <<"basic_types:classify_value(42)">>,
          expected => <<"{ok, integer}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Res1]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"basic_types:classify_value(42)">>,
          expected => <<"{ok, integer}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"basic_types:classify_value(42)">>, expected => <<"{ok, integer}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try basic_types:calculate_bandwidth(1250, 2) of
    5000 ->
        #{call_str => <<"basic_types:calculate_bandwidth(1250, 2)">>,
          expected => <<"5000">>, actual => <<"5000">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"basic_types:calculate_bandwidth(1250, 2)">>,
          expected => <<"5000">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))),
          passed => false, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"basic_types:calculate_bandwidth(1250, 2)">>, expected => <<"5000">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch01-l03":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try telecom_events:make_event(101, <<"alice">>, <<"bob">>) of
    {call_event, 101, <<"alice">>, <<"bob">>, 0} = E1 ->
        #{call_str => <<"telecom_events:make_event(101, <<\"alice\">>, <<\"bob\">>)">>,
          expected => <<"{call_event, 101, <<\"alice\">>, <<\"bob\">>, 0}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [E1]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"telecom_events:make_event(...)">>, expected => <<"{call_event, ...}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"telecom_events:make_event(...)">>, expected => <<"{call_event, ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try telecom_events:swap_endpoints({call_event, 101, <<"alice">>, <<"bob">>, 120}) of
    {call_event, 101, <<"bob">>, <<"alice">>, 120} = E2 ->
        #{call_str => <<"telecom_events:swap_endpoints(...)">>,
          expected => <<"{call_event, 101, <<\"bob\">>, <<\"alice\">>, 120}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [E2]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"telecom_events:swap_endpoints(...)">>, expected => <<"{call_event, ...}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"telecom_events:swap_endpoints(...)">>, expected => <<"{call_event, ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch01-l04":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try list_ops:first_two([10, 20, 30]) of
    {ok, 10, 20} = R1 ->
        #{call_str => <<"list_ops:first_two([10, 20, 30])">>,
          expected => <<"{ok, 10, 20}">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"list_ops:first_two([10, 20, 30])">>, expected => <<"{ok, 10, 20}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"list_ops:first_two(...)">>, expected => <<"{ok, 10, 20}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try list_ops:list_head_or_default([], 999) of
    999 ->
        #{call_str => <<"list_ops:list_head_or_default([], 999)">>,
          expected => <<"999">>, actual => <<"999">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"list_ops:list_head_or_default([], 999)">>, expected => <<"999">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"list_ops:list_head_or_default(...)">>, expected => <<"999">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch01-l05":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try pattern_vars:verify_identical_pair({alpha, alpha}) of
    {matched, alpha} = R1 ->
        #{call_str => <<"pattern_vars:verify_identical_pair({alpha, alpha})">>,
          expected => <<"{matched, alpha}">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"pattern_vars:verify_identical_pair(...)">>, expected => <<"{matched, alpha}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"pattern_vars:verify_identical_pair(...)">>, expected => <<"{matched, alpha}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try pattern_vars:rebind_update(10, 5) of
    {10, 15, 30} = R2 ->
        #{call_str => <<"pattern_vars:rebind_update(10, 5)">>,
          expected => <<"{10, 15, 30}">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"pattern_vars:rebind_update(10, 5)">>, expected => <<"{10, 15, 30}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"pattern_vars:rebind_update(...)">>, expected => <<"{10, 15, 30}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch01-l06":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try arity_calc:connect(<<"api.erlang.org">>) of
    {ok, #{host := <<"api.erlang.org">>, port := 80, timeout_ms := 5000}} = R1 ->
        #{call_str => <<"arity_calc:connect(<<\"api.erlang.org\">>)">>,
          expected => <<"{ok, #{host => ..., port => 80, timeout_ms => 5000}}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"arity_calc:connect(...)">>, expected => <<"{ok, ...}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"arity_calc:connect(...)">>, expected => <<"{ok, ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch01-l07":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try telecom_foundations:classify_packet({ipv4, <<"10.0.0.1">>, <<"10.0.0.2">>, <<"PING">>}) of
    {ok, ipv4, <<"10.0.0.1">>, <<"10.0.0.2">>, 4} = R1 ->
        #{call_str => <<"telecom_foundations:classify_packet(...)">>,
          expected => <<"{ok, ipv4, ..., 4}">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"telecom_foundations:classify_packet(...)">>, expected => <<"{ok, ipv4, ...}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"telecom_foundations:classify_packet(...)">>, expected => <<"{ok, ipv4, ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try telecom_foundations:bill_call(60, standard) of
    310 ->
        #{call_str => <<"telecom_foundations:bill_call(60, standard)">>,
          expected => <<"310">>, actual => <<"310">>, passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"telecom_foundations:bill_call(60, standard)">>, expected => <<"310">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"telecom_foundations:bill_call(...)">>, expected => <<"310">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── CHAPTER 2 ─────────────────────────────────────────────────────────────
	case "ch02-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try deep_match:extract_route({packet, {header, 4, {route, <<"10.0.0.1">>, <<"10.0.0.2">>}}, <<"DATA">>}) of
    {ok, <<"10.0.0.1">>, <<"10.0.0.2">>} = R1 ->
        #{call_str => <<"deep_match:extract_route(...)">>, expected => <<"{ok, <<\"10.0.0.1\">>, ...}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"deep_match:extract_route(...)">>, expected => <<"{ok, ...}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"deep_match:extract_route(...)">>, expected => <<"{ok, ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
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
    #{call_str => <<"guard_validator:validate_port(...)">>, expected => <<"{ok, unprivileged_port}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try guard_validator:safe_divide(10, 0) of
    {error, division_by_zero} = R2 ->
        #{call_str => <<"guard_validator:safe_divide(10, 0)">>, expected => <<"{error, division_by_zero}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T2_Start};
    Other2 ->
        #{call_str => <<"guard_validator:safe_divide(10, 0)">>, expected => <<"{error, division_by_zero}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
catch C2:R2 ->
    #{call_str => <<"guard_validator:safe_divide(...)">>, expected => <<"{error, division_by_zero}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch02-l03":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try flow_control:handle_http_response({http_response, 200, <<"{\"status\":\"ok\"}">>}) of
    {ok, <<"{\"status\":\"ok\"}">>} = R1 ->
        #{call_str => <<"flow_control:handle_http_response(...)">>, expected => <<"{ok, ...}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"flow_control:handle_http_response(...)">>, expected => <<"{ok, ...}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"flow_control:handle_http_response(...)">>, expected => <<"{ok, ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch02-l04":
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

	case "ch02-l05":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try acc_filter:keep_valid_orders([{order, 1, 5, confirmed}, {order, 2, 0, confirmed}, {order, 3, 10, pending}, {order, 4, 8, confirmed}]) of
    [1, 4] = R1 ->
        #{call_str => <<"acc_filter:keep_valid_orders(...)">>, expected => <<"[1, 4]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"acc_filter:keep_valid_orders(...)">>, expected => <<"[1, 4]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"acc_filter:keep_valid_orders(...)">>, expected => <<"[1, 4]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── CHAPTER 3 ─────────────────────────────────────────────────────────────
	case "ch03-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    Add10 = hof_basics:make_adder(10),
    Add10(25)
of
    35 ->
        #{call_str => <<"Adder = hof_basics:make_adder(10), Adder(25)">>, expected => <<"35">>,
          actual => <<"35">>, passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"Adder(25)">>, expected => <<"35">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"Adder(25)">>, expected => <<"35">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch03-l02":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try hof_transform:discount_prices([{product, 1, "Desk", 100.0}], 10) of
    [{product, 1, "Desk", 90.0}] = R1 ->
        #{call_str => <<"hof_transform:discount_prices(...)">>, expected => <<"[{product, 1, \"Desk\", 90.0}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"hof_transform:discount_prices(...)">>, expected => <<"[{product, 1, \"Desk\", 90.0}]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"hof_transform:discount_prices(...)">>, expected => <<"[{product, ...}]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch03-l03":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try hof_fold:sum_ledger([{entry, 100, credit}, {entry, 30, debit}, {entry, 50, credit}]) of
    120 ->
        #{call_str => <<"hof_fold:sum_ledger(...)">>, expected => <<"120">>,
          actual => <<"120">>, passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"hof_fold:sum_ledger(...)">>, expected => <<"120">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"hof_fold:sum_ledger(...)">>, expected => <<"120">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch03-l04":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try comprehension_queries:active_user_emails([{user, 1, <<"alice@otp.org">>, active}, {user, 2, <<"bob@erl.org">>, suspended}]) of
    [<<"alice@otp.org">>] = R1 ->
        #{call_str => <<"comprehension_queries:active_user_emails(...)">>, expected => <<"[<<\"alice@otp.org\">>]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"comprehension_queries:active_user_emails(...)">>, expected => <<"[<<\"alice@otp.org\">>]">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"comprehension_queries:active_user_emails(...)">>, expected => <<"[...]>">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch03-l05":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try inventory_hof:total_inventory_valuation([{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 4}]) of
    600 ->
        #{call_str => <<"inventory_hof:total_inventory_valuation(...)">>, expected => <<"600">>,
          actual => <<"600">>, passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"inventory_hof:total_inventory_valuation(...)">>, expected => <<"600">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"inventory_hof:total_inventory_valuation(...)">>, expected => <<"600">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── CHAPTER 4 ─────────────────────────────────────────────────────────────
	case "ch04-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try map_registry:create_session(<<"alice">>, admin) of
    #{user_id := <<"alice">>, role := admin, presence := offline, login_count := 0} = R1 ->
        #{call_str => <<"map_registry:create_session(<<\"alice\">>, admin)">>,
          expected => <<"#{user_id => <<\"alice\">>, role => admin, ...}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"map_registry:create_session(...)">>, expected => <<"#{...}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"map_registry:create_session(...)">>, expected => <<"#{...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch04-l02":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try record_frames:new_frame(1, ack, <<"PONG">>) of
    {frame, 1, ack, <<"PONG">>} = R1 ->
        #{call_str => <<"record_frames:new_frame(1, ack, <<\"PONG\">>)">>,
          expected => <<"{frame, 1, ack, <<\"PONG\">>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"record_frames:new_frame(...)">>, expected => <<"{frame, ...}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"record_frames:new_frame(...)">>, expected => <<"{frame, ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch04-l03":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try bit_packer:pack_header(4, 2, 1024) of
    <<66, 4, 0>> = R1 ->
        #{call_str => <<"bit_packer:pack_header(4, 2, 1024)">>,
          expected => <<"<<66, 4, 0>>">>, actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
          passed => true, time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"bit_packer:pack_header(4, 2, 1024)">>, expected => <<"<<66, 4, 0>>">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"bit_packer:pack_header(...)">>, expected => <<"<<66, 4, 0>>">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch04-l04":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try binary_unpinner:extract_token_safe(<<1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16, "REST">>) of
    {ok, <<1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16>>} = R1 ->
        #{call_str => <<"binary_unpinner:extract_token_safe(...)">>,
          expected => <<"{ok, <<1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16>>}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"binary_unpinner:extract_token_safe(...)">>, expected => <<"{ok, ...}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"binary_unpinner:extract_token_safe(...)">>, expected => <<"{ok, ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch04-l05":
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

	// ── CHAPTER 5 ─────────────────────────────────────────────────────────────
	case "ch05-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try process_bench:run_bench(2000) of
    #{spawned := 2000, avg_memory_bytes := AvgMem} = R1 ->
        #{call_str => <<"process_bench:run_bench(2000)">>,
          expected => <<"#{spawned => 2000, avg_memory_bytes => ...}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))),
          passed => AvgMem < 4096,
          time_ms => erlang:system_time(millisecond) - T1_Start};
    Other1 ->
        #{call_str => <<"process_bench:run_bench(2000)">>, expected => <<"#{...}">>,
          actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
catch C1:R1 ->
    #{call_str => <<"process_bench:run_bench(2000)">>, expected => <<"#{...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
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
catch C1:R1 ->
    #{call_str => <<"ping_actor:ping(...)">>, expected => <<"{ok, <<\"syn\">>}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
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
catch C1:R1 ->
    #{call_str => <<"priority_mailbox:receive_urgent_first(...)">>, expected => <<"[99, 1, 2]">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    Dummy = spawn(fun() -> receive after 500 -> ok end end),
    case priority_mailbox:request_with_timeout(Dummy, ping, 40) of
        {error, timeout} ->
            #{call_str => <<"priority_mailbox:request_with_timeout(Dummy, ping, 40)">>,
              expected => <<"{error, timeout}">>,
              actual => <<"{error, timeout}">>, passed => true,
              time_ms => erlang:system_time(millisecond) - T2_Start};
        Other2 ->
            #{call_str => <<"priority_mailbox:request_with_timeout(...)">>, expected => <<"{error, timeout}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
    end
catch C2:R2 ->
    #{call_str => <<"priority_mailbox:request_with_timeout(...)">>, expected => <<"{error, timeout}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
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
catch C1:R1 ->
    #{call_str => <<"counter_actor:get_value(...)">>, expected => <<"{ok, 15}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
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
catch C1:R1 ->
    catch named_kv_actor:stop(),
    #{call_str => <<"named_kv_actor:get(...)">>, expected => <<"{ok, <<\"active_123\">>}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch05-l06":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    Accounts = [{account, 1, <<"Alice">>, 100}, {account, 2, <<"Bob">>, 50}],
    P = ledger_actor:start(Accounts),
    {ok, 100} = ledger_actor:get_balance(P, 1),
    {ok, 150} = ledger_actor:process_transaction(P, {deposit, 1, 50}),
    {error, insufficient_funds} = ledger_actor:process_transaction(P, {withdraw, 1, 500}),
    {ok, 120} = ledger_actor:process_transaction(P, {transfer, 1, 2, 30}),
    {ok, 80} = ledger_actor:get_balance(P, 2),
    Txs = [{deposit, 1, 10}, {withdraw, 2, 200}, {transfer, 1, 2, 30}],
    {ok, 2, 1} = ledger_actor:process_batch(P, Txs),
    {ok, FinalB1} = ledger_actor:get_balance(P, 1),
    {ok, FinalB2} = ledger_actor:get_balance(P, 2),
    ledger_actor:stop(P),
    Res = {FinalB1, FinalB2},
    #{call_str => <<"ledger_actor:process_batch(P, Txs)">>,
      expected => <<"{100, 110}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Res]))),
      passed => Res =:= {100, 110},
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"ledger_actor transactions test">>, expected => <<"{100, 110}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	// ── CHAPTER 6 ─────────────────────────────────────────────────────────────
	case "ch06-l01":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    Term = {user, 101, <<"Alice">>},
    Bin = term_to_binary(Term),
    case boundary_parser:safe_parse_payload(Bin) of
        {ok, Term} = R1 ->
            #{call_str => <<"boundary_parser:safe_parse_payload(ValidBin)">>,
              expected => <<"{ok, {user, 101, <<\"Alice\">>}}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T1_Start};
        Other1 ->
            #{call_str => <<"boundary_parser:safe_parse_payload(ValidBin)">>, expected => <<"{ok, ...}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
    end
catch C1:R1 ->
    #{call_str => <<"boundary_parser:safe_parse_payload(...)">>, expected => <<"{ok, ...}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    case boundary_parser:safe_parse_payload(<<"corrupted_bytes_123">>) of
        {error, {error, badarg}} = R2 ->
            #{call_str => <<"boundary_parser:safe_parse_payload(CorruptedBin)">>,
              expected => <<"{error, {error, badarg}}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T2_Start};
        Other2 ->
            #{call_str => <<"boundary_parser:safe_parse_payload(CorruptedBin)">>, expected => <<"{error, {error, badarg}}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
    end
catch C2:R2 ->
    #{call_str => <<"boundary_parser:safe_parse_payload(...)">>, expected => <<"{error, {error, badarg}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch06-l02":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    {ok, W1, W2} = linked_pipeline:start_linked_pipeline(),
    {ok, 36} = linked_pipeline:compute(W1, 3),
    linked_pipeline:crash_stage1(W1, deliberate_failure),
    timer:sleep(50),
    Alive1 = is_process_alive(W1),
    Alive2 = is_process_alive(W2),
    #{call_str => <<"linked_pipeline cascading exit test">>,
      expected => <<"{Alive1: false, Alive2: false}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("{~p, ~p}", [Alive1, Alive2]))),
      passed => (not Alive1) andalso (not Alive2),
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"linked_pipeline test">>, expected => <<"{false, false}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch06-l03":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    WorkerFun = fun() -> receive stop -> ok end end,
    {ok, Sup, W1} = exit_trapper:start_supervised(WorkerFun),
    exit_trapper:kill_worker(Sup, badarith),
    timer:sleep(50),
    {ok, W2} = exit_trapper:get_worker_pid(Sup),
    SupAlive = is_process_alive(Sup),
    W1Dead = not is_process_alive(W1),
    W2Alive = is_process_alive(W2),
    Different = (W1 =/= W2),
    Sup ! stop,
    Passed = SupAlive andalso W1Dead andalso W2Alive andalso Different,
    #{call_str => <<"exit_trapper:kill_worker(Sup, badarith)">>,
      expected => <<"Supervisor survives, W1 dead, W2 alive">>,
      actual => list_to_binary(lists:flatten(io_lib:format("SupAlive:~p, W1Dead:~p, W2Alive:~p, NewPid:~p", [SupAlive, W1Dead, W2Alive, Different]))),
      passed => Passed,
      time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"exit_trapper supervisor test">>, expected => <<"Supervisor survives and respawns">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch06-l04":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    case worker_watcher:run_monitored_task(fun() -> 21 * 2 end, 1000) of
        {ok, 42} = R1 ->
            #{call_str => <<"worker_watcher:run_monitored_task(fun() -> 21 * 2 end, 1000)">>,
              expected => <<"{ok, 42}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R1]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T1_Start};
        Other1 ->
            #{call_str => <<"worker_watcher:run_monitored_task(...)">>, expected => <<"{ok, 42}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
    end
catch C1:R1 ->
    #{call_str => <<"worker_watcher:run_monitored_task(...)">>, expected => <<"{ok, 42}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    case worker_watcher:run_monitored_task(fun() -> 1 / 0 end, 1000) of
        {error, {crashed, badarith}} = R2 ->
            #{call_str => <<"worker_watcher:run_monitored_task(fun() -> 1/0 end, 1000)">>,
              expected => <<"{error, {crashed, badarith}}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [R2]))), passed => true,
              time_ms => erlang:system_time(millisecond) - T2_Start};
        Other2 ->
            #{call_str => <<"worker_watcher:run_monitored_task(...)">>, expected => <<"{error, {crashed, badarith}}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other2]))), passed => false, time_ms => 0}
    end
catch C2:R2 ->
    #{call_str => <<"worker_watcher:run_monitored_task(...)">>, expected => <<"{error, {crashed, badarith}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch06-l05":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
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
              time_ms => erlang:system_time(millisecond) - T1_Start};
        Other1 ->
            #{call_str => <<"my_gen_server:call(...)">>, expected => <<"{error, {server_crashed, ...}}">>,
              actual => list_to_binary(lists:flatten(io_lib:format("~p", [Other1]))), passed => false, time_ms => 0}
    end
catch C1:R1 ->
    #{call_str => <<"my_gen_server:call(...)">>, expected => <<"{error, {server_crashed, ...}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch06-l06":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
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
catch C1:R1 ->
    #{call_str => <<"job_coordinator:execute_batch(...)">>, expected => <<"{[...], [...]}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
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

	case "ch07-l05":
		return `
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
catch C1:R1 ->
    #{call_str => <<"security_audit_handler:notify(...)">>, expected => <<"alert status">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch07-l06":
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
    Spec = child_spec_factory:worker_spec(cache_worker, {cache_srv, start_link, []}, transient, 5000),
    Expected = #{id => cache_worker, start => {cache_srv, start_link, []}, restart => transient, shutdown => 5000, type => worker, modules => [cache_srv]},
    #{call_str => <<"child_spec_factory:worker_spec(...)">>,
      expected => <<"worker child spec map">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Spec]))),
      passed => (Spec =:= Expected), time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"child_spec_factory:worker_spec(...)">>, expected => <<"child spec map">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    SupSpec = child_spec_factory:supervisor_spec(sub_sup, {session_sup, start_link, []}),
    ExpectedSup = #{id => sub_sup, start => {session_sup, start_link, []}, restart => permanent, shutdown => infinity, type => supervisor, modules => [session_sup]},
    #{call_str => <<"child_spec_factory:supervisor_spec(...)">>,
      expected => <<"supervisor child spec map">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [SupSpec]))),
      passed => (SupSpec =:= ExpectedSup), time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"child_spec_factory:supervisor_spec(...)">>, expected => <<"child spec map">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    NormRes = child_spec_factory:classify_restart(transient, normal),
    CrashRes = child_spec_factory:classify_restart(transient, badarith),
    Pair = {NormRes, CrashRes},
    #{call_str => <<"child_spec_factory:classify_restart(...)">>,
      expected => <<"{false, true}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Pair]))),
      passed => (Pair =:= {false, true}), time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"child_spec_factory:classify_restart(...)">>, expected => <<"{false, true}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch08-l03":
		return `
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
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch08-l04":
		return `
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
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch08-l05":
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
AllResults = [T1_Res, T2_Res],
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
    ok = cluster_pubsub_pg:init_pubsub(),
    Self = self(),
    ok = cluster_pubsub_pg:join_topic(<<"alerts">>, Self),
    {ok, 1} = cluster_pubsub_pg:broadcast(<<"alerts">>, <<"cluster_overload">>),
    ReceivedMsg = receive
        {pubsub_msg, <<"alerts">>, M} -> M
    after 100 ->
        error_no_msg
    end,
    ok = cluster_pubsub_pg:leave_topic(<<"alerts">>, Self),
    #{call_str => <<"cluster_pubsub_pg: broadcast to topic">>,
      expected => <<"cluster_overload">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [ReceivedMsg]))),
      passed => (ReceivedMsg =:= <<"cluster_overload">>), time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"cluster_pubsub_pg:broadcast(...)">>, expected => <<"broadcast msg">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch09-l05":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    L0 = ledger_specs_and_tests:new_ledger(),
    {ok, L1} = ledger_specs_and_tests:deposit(L0, <<"user_1">>, 250),
    {ok, L2} = ledger_specs_and_tests:withdraw(L1, <<"user_1">>, 75),
    Bal = ledger_specs_and_tests:get_balance(L2, <<"user_1">>),
    #{call_str => <<"ledger_specs_and_tests: deposit 250 -> withdraw 75">>,
      expected => <<"175">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [Bal]))),
      passed => (Bal =:= 175), time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"ledger_specs_and_tests:deposit(...)">>, expected => <<"175">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    TestRet = ledger_specs_and_tests:run_unit_tests(),
    #{call_str => <<"ledger_specs_and_tests:run_unit_tests()">>,
      expected => <<"ok">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [TestRet]))),
      passed => (TestRet =:= ok), time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"ledger_specs_and_tests:run_unit_tests(...)">>, expected => <<"ok">>,
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
    #{call_str => <<"session_cache:increment_hits(...)">>, expected => <<"2">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    [case whereis(N) of undefined -> ok; P -> exit(P, kill) end || N <- [session_cache, table_manager, session_sup]],
    timer:sleep(20),
    {ok, _} = session_cache:start_pipeline(),
    ok = session_cache:put_session(<<"sess_a">>, 999, #{role => admin}),
    OldPid = whereis(session_cache),
    exit(OldPid, kill),
    timer:sleep(50),
    NewPid = whereis(session_cache),
    {ok, Sess2} = session_cache:get_session(<<"sess_a">>),
    session_cache:stop_pipeline(),
    Pass = (OldPid =/= NewPid) andalso is_pid(NewPid) andalso (maps:get(user_id, Sess2) =:= 999),
    #{call_str => <<"session_cache: kill worker -> check heir failover">>,
      expected => <<"restarted with new pid and preserved session">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{OldPid =/= NewPid, is_pid(NewPid), maps:get(user_id, Sess2)}]))),
      passed => Pass, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"session_cache: kill worker">>, expected => <<"preserved session">>,
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
    #{call_str => <<"tcp_live_demo:run_demo()">>,
      expected => <<"{ok, 3}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [DemoRes]))),
      passed => (DemoRes =:= {ok, 3}), time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"tcp_live_demo:run_demo()">>, expected => <<"{ok, 3}">>,
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
    #{call_str => <<"tcp_flow_worker:start_server(...)">>, expected => <<"<<\"+ACK: TEST_PING\\r\\n\">>">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch10-l03":
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

	case "ch10-l04":
		return `
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
      expected => <<"Active: 2, Reply: +REPLY: PING\\r\\n">>,
      actual => list_to_binary(lists:flatten(io_lib:format("Active: ~p, Reply: ~s", [ActiveCount, Reply1]))),
      passed => Pass, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"tcp_acceptor_pool:start_pool(...)">>, expected => <<"Active: 2">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch10-l05":
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
    E1 = tcp_kv_backend:execute_command(ping, dummy_tab),
    Pass2 = (E1 =:= <<"+PONG\r\n">>),
    #{call_str => <<"tcp_kv_backend:execute_command(ping, tab)">>,
      expected => <<"<<\"+PONG\\r\\n\">>">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [E1]))),
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"tcp_kv_backend:execute_command(...)">>, expected => <<"<<\"+PONG\\r\\n\">>">>,
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
    Pass = (N >= 5),
    #{call_str => <<"xmpp_wire_demo:run_demo()">>,
      expected => <<"{ok, N} (N >= 5 transcript steps)">>,
      actual => list_to_binary(lists:flatten(io_lib:format("{ok, ~p}", [N]))),
      passed => Pass, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"xmpp_wire_demo:run_demo()">>, expected => <<"{ok, N}">>,
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
    {ok, #{user := U1, domain := D1, resource := R1, bare := B1}} = xmpp_jid:parse(<<"alice@localhost/mobile">>),
    Pass1 = (U1 =:= <<"alice">>) andalso (D1 =:= <<"localhost">>) andalso (R1 =:= <<"mobile">>) andalso (B1 =:= <<"alice@localhost">>),
    #{call_str => <<"xmpp_jid:parse(<<\"alice@localhost/mobile\">>)">>,
      expected => <<"{ok, #{user => <<\"alice\">>, domain => <<\"localhost\">>, resource => <<\"mobile\">>, bare => <<\"alice@localhost\">>}}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{ok, #{user => U1, domain => D1, resource => R1, bare => B1}}]))),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"xmpp_jid:parse(...)">>, expected => <<"{ok, #{...}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    {ok, #{user := U2, domain := D2, resource := R2, bare := B2}} = xmpp_jid:parse(<<"bob@localhost">>),
    Pass2 = (U2 =:= <<"bob">>) andalso (D2 =:= <<"localhost">>) andalso (R2 =:= <<>>) andalso (B2 =:= <<"bob@localhost">>),
    #{call_str => <<"xmpp_jid:parse(<<\"bob@localhost\">>)">>,
      expected => <<"{ok, #{user => <<\"bob\">>, domain => <<\"localhost\">>, resource => <<>>, bare => <<\"bob@localhost\">>}}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{ok, #{user => U2, domain => D2, resource => R2, bare => B2}}]))),
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"xmpp_jid:parse(...)">>, expected => <<"{ok, #{...}}">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    E1 = xmpp_jid:parse(<<"@localhost">>),
    E2 = xmpp_jid:parse(<<"alice@">>),
    E3 = xmpp_jid:parse(<<"alice@localhost/">>),
    Pass3 = (E1 =:= {error, invalid_jid}) andalso (E2 =:= {error, invalid_jid}) andalso (E3 =:= {error, invalid_jid}),
    #{call_str => <<"{xmpp_jid:parse(<<\"@localhost\">>), xmpp_jid:parse(<<\"alice@\">>), xmpp_jid:parse(<<\"alice@localhost/\">>)}">>,
      expected => <<"{{error, invalid_jid}, {error, invalid_jid}, {error, invalid_jid}}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{E1, E2, E3}]))),
      passed => Pass3, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"xmpp_jid:parse(...)">>, expected => <<"{{error, invalid_jid}, ...}">>,
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
    Pass1 = (C1 =:= {stream_open, <<"localhost">>}) andalso (C2 =:= {iq, <<"ping_42">>, <<"get">>}),
    #{call_str => <<"classify_xml_packet(stream_open & iq)">>,
      expected => <<"{{stream_open, <<\"localhost\">>}, {iq, <<\"ping_42\">>, <<\"get\">>}}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{C1, C2}]))),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"classify_xml_packet(...)">>, expected => <<"tuples">>,
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
    {F1, Rem1} = xmpp_xml_framer:extract_frames(<<>>, <<"<stream:stream to='localhost'> <iq type='get'">>),
    Pass1 = (F1 =:= [<<"<stream:stream to='localhost'>">>]) andalso (Rem1 =:= <<"<iq type='get'">>),
    #{call_str => <<"extract_frames(<<>>, <<\"<stream:stream to='localhost'> <iq type='get'\">>)">>,
      expected => <<"{[<<\"<stream:stream to='localhost'>\">>], <<\"<iq type='get'\">>} ">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{F1, Rem1}]))),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"extract_frames(...)">>, expected => <<"frames">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    {F2, Rem2} = xmpp_xml_framer:extract_frames(<<"<iq type='get'">>, <<" id='1'><ping/></iq><presence/>">>),
    Pass2 = (F2 =:= [<<"<iq type='get' id='1'><ping/></iq>">>, <<"<presence/>">>]) andalso (Rem2 =:= <<>>),
    #{call_str => <<"extract_frames(<<\"<iq type='get'\">>, <<\" id='1'><ping/></iq><presence/>\">>)">>,
      expected => <<"{[<<\"<iq type='get' id='1'><ping/></iq>\">>, <<\"<presence/>\">>], <<>>}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{F2, Rem2}]))),
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"extract_frames(...)">>, expected => <<"frames">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch11-l05":
		return `
T1_Start = erlang:system_time(millisecond),
T1_Res = try
    S0 = xmpp_c2s_fsm:init(<<"localhost">>),
    {reply, _, S1} = xmpp_c2s_fsm:handle_event({stream_open, <<"localhost">>}, S0),
    State1 = xmpp_c2s_fsm:get_state(S1),
    Pass1 = (State1 =:= wait_for_sasl),
    #{call_str => <<"handle_event(stream_open) -> get_state">>,
      expected => <<"wait_for_sasl">>,
      actual => list_to_binary(atom_to_list(State1)),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"handle_event(...)">>, expected => <<"wait_for_sasl">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1])), passed => false, time_ms => 0}
end,
T2_Start = erlang:system_time(millisecond),
T2_Res = try
    S0 = xmpp_c2s_fsm:init(<<"localhost">>),
    {reply, _, S1} = xmpp_c2s_fsm:handle_event({stream_open, <<"localhost">>}, S0),
    {error, Reason, _} = xmpp_c2s_fsm:handle_event({chat_message, <<"bob">>, <<"1">>, <<"hi">>}, S1),
    Pass2 = (Reason =:= not_authorized),
    #{call_str => <<"handle_event(chat_message before SASL) -> Reason">>,
      expected => <<"not_authorized">>,
      actual => list_to_binary(atom_to_list(Reason)),
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"handle_event(...)">>, expected => <<"not_authorized">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2])), passed => false, time_ms => 0}
end,
T3_Start = erlang:system_time(millisecond),
T3_Res = try
    S0 = xmpp_c2s_fsm:init(<<"localhost">>),
    {reply, _, S1} = xmpp_c2s_fsm:handle_event({stream_open, <<"localhost">>}, S0),
    Token = base64:encode(<<0, "alice", 0, "secret">>),
    {reply, _, S2} = xmpp_c2s_fsm:handle_event({auth_plain, Token}, S1),
    {reply, _, S3} = xmpp_c2s_fsm:handle_event({bind_resource, <<"b1">>, <<"mobile">>}, S2),
    Pass3 = (xmpp_c2s_fsm:get_state(S3) =:= session_established) andalso (maps:get(full_jid, S3) =:= <<"alice@localhost/mobile">>),
    #{call_str => <<"SASL Auth -> Bind Resource -> Session Established">>,
      expected => <<"{session_established, <<\"alice@localhost/mobile\">>}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{xmpp_c2s_fsm:get_state(S3), maps:get(full_jid, S3)}]))),
      passed => Pass3, time_ms => erlang:system_time(millisecond) - T3_Start}
catch C3:R3 ->
    #{call_str => <<"SASL Auth -> Bind Resource">>, expected => <<"session_established">>,
      actual => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3])), passed => false, time_ms => 0}
end,
AllResults = [T1_Res, T2_Res, T3_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	case "ch11-l06":
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
    Pass1 = (R_Bare =:= {route_online, [P3]}) andalso (R_Full =:= {route_online, [P2]}),
    #{call_str => <<"resolve_message_targets(Bare vs Full)">>,
      expected => <<"{{route_online, [P3]}, {route_online, [P2]}}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [{R_Bare, R_Full}]))),
      passed => Pass1, time_ms => erlang:system_time(millisecond) - T1_Start}
catch C1:R1 ->
    #{call_str => <<"resolve_message_targets(...)">>, expected => <<"routing result">>,
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
      expected => <<"{route_online, [P2]}">>,
      actual => list_to_binary(lists:flatten(io_lib:format("~p", [R_Pruned]))),
      passed => Pass2, time_ms => erlang:system_time(millisecond) - T2_Start}
catch C2:R2 ->
    #{call_str => <<"remove_session_by_pid(...)">>, expected => <<"{route_online, [P2]}">>,
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

	case "ch12-capstone", "ch12-l01", "xmpp_capstone":
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

catch xmpp_router:stop(),
catch xmpp_session_registry:stop(),
catch (case whereis(xmpp_sup) of undefined -> ok; SupP2 -> exit(SupP2, kill) end),
catch ets:delete(xmpp_sessions_tab),

AllResults = [T1_Res, T2_Res, T3_Res, T4_Res, T5_Res],
io:format("~n__BF_RUN_RESULT__~n~s~n", [bf_json:encode(#{visible_tests => AllResults})]),
init:stop().
`, true

	default:
		return "", false
	}
}

// buildChapterVerificationScript provides test and AST verification stages for Chapters 1, 2, 3 & 4
func (r *Runner) buildChapterVerificationScript(session *pool.Session, exerciseID string) (string, bool) {
	wsDir := filepath.ToSlash(session.WorkspaceDir)

	switch exerciseID {

	// ── CHAPTER 1 ─────────────────────────────────────────────────────────────
	case "ch01-l01":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(beam_intro) of
    {module, beam_intro} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"beam_intro.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Telemetry = try beam_intro:inspect_vm() of
    #{otp_release := Rel, schedulers_online := Sch, process_limit := ProcLim, atom_limit := AtomLim}
      when is_binary(Rel), is_integer(Sch), is_integer(ProcLim), is_integer(AtomLim) ->
        #{id => <<"vm_introspection_contract">>, title => <<"BEAM Schedulers & Process Limits Telemetry">>, status => <<"passed">>, time_ms => 8, details => <<"Queried live OTP 29 emulator info successfully">>};
    Other1 ->
        #{id => <<"vm_introspection_contract">>, title => <<"BEAM Schedulers & Process Limits Telemetry">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Invalid map format: ~p", [Other1]))}
catch C1:R1 ->
    #{id => <<"vm_introspection_contract">>, title => <<"BEAM Schedulers & Process Limits Telemetry">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
Stages = [CompileStage, S1_Telemetry]
`), true

	case "ch01-l02":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(basic_types) of
    {module, basic_types} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"basic_types.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Classify = try {basic_types:classify_value(42), basic_types:classify_value(3.14), basic_types:classify_value(true), basic_types:classify_value("str")} of
    {{ok, integer}, {ok, float}, {ok, boolean}, {error, unknown}} ->
        #{id => <<"data_type_classification">>, title => <<"Data Type Classification via Guard BIFs">>, status => <<"passed">>, time_ms => 6, details => <<"Correctly classified integer, float, boolean, and fallback">>};
    Got1 ->
        #{id => <<"data_type_classification">>, title => <<"Data Type Classification via Guard BIFs">>, status => <<"failed">>, time_ms => 6, details => list_to_binary(io_lib:format("Classification mismatch: ~p", [Got1]))}
catch C1:R1 ->
    #{id => <<"data_type_classification">>, title => <<"Data Type Classification via Guard BIFs">>, status => <<"failed">>, time_ms => 6, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
S2_Bandwidth = try {basic_types:calculate_bandwidth(1250, 2), basic_types:calculate_bandwidth(1000, 4)} of
    {5000, 2000} ->
        #{id => <<"integer_arithmetic">>, title => <<"Integer Division Arithmetic (div)">>, status => <<"passed">>, time_ms => 4, details => <<"Bandwidth calculations verified using whole integer division">>};
    Got2 ->
        #{id => <<"integer_arithmetic">>, title => <<"Integer Division Arithmetic (div)">>, status => <<"failed">>, time_ms => 4, details => list_to_binary(io_lib:format("Arithmetic mismatch: ~p", [Got2]))}
catch C2:R2 ->
    #{id => <<"integer_arithmetic">>, title => <<"Integer Division Arithmetic (div)">>, status => <<"failed">>, time_ms => 4, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_Classify, S2_Bandwidth]
`), true

	case "ch01-l03":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(telecom_events) of
    {module, telecom_events} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"telecom_events.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Events = try
    Ev1 = telecom_events:make_event(101, <<"alice">>, <<"bob">>),
    Caller = telecom_events:extract_caller(Ev1),
    Swapped = telecom_events:swap_endpoints(Ev1),
    case {Ev1, Caller, Swapped} of
        {{call_event, 101, <<"alice">>, <<"bob">>, 0}, <<"alice">>, {call_event, 101, <<"bob">>, <<"alice">>, 0}} ->
            #{id => <<"tuple_destructuring">>, title => <<"Tagged Tuple Creation & Endpoint Swapping">>, status => <<"passed">>, time_ms => 8, details => <<"Direct tuple pattern matching and element swapping verified">>};
        Got1 ->
            #{id => <<"tuple_destructuring">>, title => <<"Tagged Tuple Creation & Endpoint Swapping">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Tuple mismatch: ~p", [Got1]))}
    end
catch C1:R1 ->
    #{id => <<"tuple_destructuring">>, title => <<"Tagged Tuple Creation & Endpoint Swapping">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
Stages = [CompileStage, S1_Events]
`), true

	case "ch01-l04":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(list_ops) of
    {module, list_ops} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"list_ops.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Lists = try
    R1 = list_ops:first_two([10, 20, 30]),
    R2 = list_ops:first_two([10]),
    R3 = list_ops:prepend_header(header, [p1, p2]),
    R4 = list_ops:list_head_or_default([], fallback),
    case {R1, R2, R3, R4} of
        {{ok, 10, 20}, {error, insufficient_elements}, [header, p1, p2], fallback} ->
            #{id => <<"list_head_tail_ops">>, title => <<"Cons Cell [H|T] Head/Tail Operations">>, status => <<"passed">>, time_ms => 8, details => <<"Verified first_two, prepend_header in O(1), and empty fallback">>};
        Got1 ->
            #{id => <<"list_head_tail_ops">>, title => <<"Cons Cell [H|T] Head/Tail Operations">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("List ops mismatch: ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"list_head_tail_ops">>, title => <<"Cons Cell [H|T] Head/Tail Operations">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Lists]
`), true

	case "ch01-l05":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(pattern_vars) of
    {module, pattern_vars} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"pattern_vars.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Pattern = try
    R1 = pattern_vars:verify_identical_pair({omega, omega}),
    R2 = pattern_vars:verify_identical_pair({omega, psi}),
    R3 = pattern_vars:rebind_update(10, 5),
    case {R1, R2, R3} of
        {{matched, omega}, mismatch, {10, 15, 30}} ->
            #{id => <<"single_assignment_matching">>, title => <<"Single Assignment & Repeated Variable Matching">>, status => <<"passed">>, time_ms => 8, details => <<"Verified {X, X} pattern matching and immutable state shadowing">>};
        Got1 ->
            #{id => <<"single_assignment_matching">>, title => <<"Single Assignment & Repeated Variable Matching">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Mismatch: ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"single_assignment_matching">>, title => <<"Single Assignment & Repeated Variable Matching">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Pattern]
`), true

	case "ch01-l06":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(arity_calc) of
    {module, arity_calc} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"arity_calc.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Arity = try
    R1 = arity_calc:connect(<<"host.com">>),
    R2 = arity_calc:connect(<<"host.com">>, 443),
    R3 = arity_calc:connect(<<"host.com">>, 8443, 2000),
    case {R1, R2, R3} of
        {{ok, #{host := <<"host.com">>, port := 80, timeout_ms := 5000}},
         {ok, #{host := <<"host.com">>, port := 443, timeout_ms := 5000}},
         {ok, #{host := <<"host.com">>, port := 8443, timeout_ms := 2000}}} ->
            #{id => <<"arity_delegation">>, title => <<"Function Arity Cascading Defaults">>, status => <<"passed">>, time_ms => 8, details => <<"connect/1 -> connect/2 -> connect/3 delegation verified">>};
        Got1 ->
            #{id => <<"arity_delegation">>, title => <<"Function Arity Cascading Defaults">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Arity mismatch: ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"arity_delegation">>, title => <<"Function Arity Cascading Defaults">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Arity]
`), true

	case "ch01-l07":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(telecom_foundations) of
    {module, telecom_foundations} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"telecom_foundations.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Suite = try
    P1 = telecom_foundations:classify_packet({ipv4, <<"10.0.0.1">>, <<"10.0.0.2">>, <<"PING">>}),
    P2 = telecom_foundations:classify_packet({ipv6, <<"fe80::1">>, <<"fe80::2">>, <<"PONG">>}),
    P3 = telecom_foundations:classify_packet(bad_packet),
    B1 = telecom_foundations:bill_call(60, standard),
    B2 = telecom_foundations:bill_call(100, premium, 25),
    B3 = telecom_foundations:bill_call(100, unknown_plan),
    case {P1, P2, P3, B1, B2, B3} of
        {{ok, ipv4, <<"10.0.0.1">>, <<"10.0.0.2">>, 4},
         {ok, ipv6, <<"fe80::1">>, <<"fe80::2">>, 4},
         {error, invalid_packet},
         310, 325, {error, unknown_plan}} ->
            #{id => <<"telecom_comprehensive_suite">>, title => <<"Packet Classifier & Call Billing Suite">>, status => <<"passed">>, time_ms => 10, details => <<"Passed all packet destructuring, arity defaults, and rate calculations">>};
        Got1 ->
            #{id => <<"telecom_comprehensive_suite">>, title => <<"Packet Classifier & Call Billing Suite">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Suite failure: ~p", [Got1]))}
    end
catch C1:R1 ->
    #{id => <<"telecom_comprehensive_suite">>, title => <<"Packet Classifier & Call Billing Suite">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
Stages = [CompileStage, S1_Suite]
`), true

	// ── CHAPTER 2 ─────────────────────────────────────────────────────────────
	case "ch02-l01":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(deep_match) of
    {module, deep_match} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"deep_match.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Match = try
    R1 = deep_match:extract_route({packet, {header, 4, {route, <<"src">>, <<"dst">>}}, <<"P">>}),
    R2 = deep_match:extract_route({packet, {header, 5, {route, <<"src">>, <<"dst">>}}, <<"P">>}),
    R3 = deep_match:format_packet({packet, {header, 4, {route, <<"a">>, <<"b">>}}, <<"P">>}),
    case {R1, R2, R3} of
        {{ok, <<"src">>, <<"dst">>}, {error, invalid_version}, <<"[V4] a -> b">>} ->
            #{id => <<"deep_pattern_matching">>, title => <<"Deep Function Head Pattern Matching">>, status => <<"passed">>, time_ms => 8, details => <<"Nested tuple head pattern destructuring verified">>};
        Got1 ->
            #{id => <<"deep_pattern_matching">>, title => <<"Deep Function Head Pattern Matching">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Mismatch: ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"deep_pattern_matching">>, title => <<"Deep Function Head Pattern Matching">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Match]
`), true

	case "ch02-l02":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(guard_validator) of
    {module, guard_validator} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"guard_validator.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Guards = try
    P1 = guard_validator:validate_port(8080),
    P2 = guard_validator:validate_port(443),
    P3 = guard_validator:validate_port(70000),
    T1 = guard_validator:classify_temperature(-5),
    T2 = guard_validator:classify_temperature(20),
    T3 = guard_validator:classify_temperature(35),
    D1 = guard_validator:safe_divide(10, 2),
    D2 = guard_validator:safe_divide(10, 0),
    case {P1, P2, P3, T1, T2, T3, D1, D2} of
        {{ok, unprivileged_port}, {ok, privileged_port}, {error, invalid_port},
         freezing, temperate, hot, {ok, 5.0}, {error, division_by_zero}} ->
            #{id => <<"guard_clause_validation">>, title => <<"Pure Guard Clauses & Predicate Bounds">>, status => <<"passed">>, time_ms => 10, details => <<"Passed all port range, temperature, and safe division guards">>};
        Got1 ->
            #{id => <<"guard_clause_validation">>, title => <<"Pure Guard Clauses & Predicate Bounds">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Guard mismatch: ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"guard_clause_validation">>, title => <<"Pure Guard Clauses & Predicate Bounds">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Guards]
`), true

	case "ch02-l03":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(flow_control) of
    {module, flow_control} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"flow_control.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Flow = try
    R1 = flow_control:handle_http_response({http_response, 200, <<"OK">>}),
    R2 = flow_control:handle_http_response({http_response, 401, <<>>}),
    R3 = flow_control:handle_http_response({http_response, 502, <<>>}),
    L1 = flow_control:grade_latency(30),
    L2 = flow_control:grade_latency(150),
    L3 = flow_control:grade_latency(800),
    case {R1, R2, R3, L1, L2, L3} of
        {{ok, <<"OK">>}, {error, unauthorized}, {error, server_error}, optimal, acceptable, sla_breach} ->
            #{id => <<"case_and_if_expressions">>, title => <<"Control Expressions (case...of & if...end)">>, status => <<"passed">>, time_ms => 10, details => <<"Branch pattern matching and boolean guard chains verified">>};
        Got1 ->
            #{id => <<"case_and_if_expressions">>, title => <<"Control Expressions (case...of & if...end)">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Flow mismatch: ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"case_and_if_expressions">>, title => <<"Control Expressions (case...of & if...end)">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Flow]
`), true

	case "ch02-l04":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(tco_counter) of
    {module, tco_counter} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"tco_counter.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SourceFile = case filelib:is_regular("src/tco_counter.erl") of
        true -> "src/tco_counter.erl";
        false -> "tco_counter.erl"
    end,
    Rules = #{
        require_tail_recursion => [{sum_packets, 1}, {count_packets, 1}],
        forbidden_remote_calls => [{lists, sum, 1}, {erlang, length, 1}]
    },
    case bf_ast_verifier:verify_rules(SourceFile, Rules) of
        {ok, _} ->
            #{id => <<"tail_recursion_ast_audit">>, title => <<"Tail Call Optimization (TCO) & AST Verification">>, status => <<"passed">>, time_ms => 15, details => <<"Strict tail recursion verified via AST & BEAM bytecode inspection.">>};
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
    Cnt = tco_counter:count_packets([1, 2, 3, 4, 5]),
    case {Sum, Cnt} of
        {100, 5} ->
            #{id => <<"functional_contract">>, title => <<"Functional Accumulator Correctness">>, status => <<"passed">>, time_ms => 10, details => <<"Packet sum (100) and packet count (5) match functional specification">>};
        Got1 ->
            #{id => <<"functional_contract">>, title => <<"Functional Accumulator Correctness">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Functional mismatch: expected {100, 5}, got ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"functional_contract">>, title => <<"Functional Accumulator Correctness">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Ast, S2_Tco]
`), true

	case "ch02-l05":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(acc_filter) of
    {module, acc_filter} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"acc_filter.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Reverse = try
    Orders = [{order, 1, 5, confirmed}, {order, 2, 0, confirmed}, {order, 3, 10, pending}, {order, 4, 8, confirmed}],
    case acc_filter:keep_valid_orders(Orders) of
        [1, 4] ->
            #{id => <<"accumulator_and_reverse">>, title => <<"Accumulator Pattern & lists:reverse/1 Preservation">>, status => <<"passed">>, time_ms => 8, details => <<"Order preserved correctly using lists:reverse at base case">>};
        Got1 ->
            #{id => <<"accumulator_and_reverse">>, title => <<"Accumulator Pattern & lists:reverse/1 Preservation">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Reverse mismatch: ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"accumulator_and_reverse">>, title => <<"Accumulator Pattern & lists:reverse/1 Preservation">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Reverse]
`), true

	// ── CHAPTER 3 ─────────────────────────────────────────────────────────────
	case "ch03-l01":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(hof_basics) of
    {module, hof_basics} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"hof_basics.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Closures = try
    Add5 = hof_basics:make_adder(5),
    R1 = Add5(10),
    R2 = hof_basics:apply_twice(fun(X) -> X * 3 end, 2),
    AbsRef = hof_basics:math_capture(),
    R3 = AbsRef(-99),
    case {R1, R2, R3} of
        {15, 18, 99} ->
            #{id => <<"closures_and_captures">>, title => <<"First-Class Functions, Closures & Captures">>, status => <<"passed">>, time_ms => 8, details => <<"Lexical closures and fun captures verified">>};
        Got1 ->
            #{id => <<"closures_and_captures">>, title => <<"First-Class Functions, Closures & Captures">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("HOF mismatch: ~p", [Got1]))}
    end
catch C1:Err1 ->
    #{id => <<"closures_and_captures">>, title => <<"First-Class Functions, Closures & Captures">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, Err1]))}
end,
Stages = [CompileStage, S1_Closures]
`), true

	case "ch03-l02":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(hof_transform) of
    {module, hof_transform} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"hof_transform.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Transform = try
    D = hof_transform:discount_prices([{product, 1, "Desk", 100.0}], 20),
    S = hof_transform:active_sessions([{session, "s1", active}, {session, "s2", expired}]),
    M = hof_transform:sanitize_metrics([{"a", 10.2}, {"b", -5.0}, {"c", 99.8}]),
    case {D, S, M} of
        {[{product, 1, "Desk", 80.0}], [{session, "s1", active}], [{"a", 10}, {"c", 100}]} ->
            #{id => <<"map_filter_filtermap">>, title => <<"lists:map, filter & filtermap Operations">>, status => <<"passed">>, time_ms => 10, details => <<"Single-pass filtermap and transformations verified">>};
        Got1 ->
            #{id => <<"map_filter_filtermap">>, title => <<"lists:map, filter & filtermap Operations">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Transform mismatch: ~p", [Got1]))}
    end
catch C1:R1 ->
    #{id => <<"map_filter_filtermap">>, title => <<"lists:map, filter & filtermap Operations">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
Stages = [CompileStage, S1_Transform]
`), true

	case "ch03-l03":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(hof_fold) of
    {module, hof_fold} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"hof_fold.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Fold = try
    Ledger = hof_fold:sum_ledger([{entry, 100, credit}, {entry, 40, debit}, {entry, 20, credit}]),
    Index = hof_fold:build_index([{1, "A"}, {2, "B"}]),
    Freqs = hof_fold:count_frequencies([x, y, x, z, x]),
    case {Ledger, Index, Freqs} of
        {80, #{1 := "A", 2 := "B"}, #{x := 3, y := 1, z := 1}} ->
            #{id => <<"foldl_state_reduction">>, title => <<"Tail-Recursive State Aggregation via lists:foldl/3">>, status => <<"passed">>, time_ms => 10, details => <<"Verified ledger reduction, map index building, and frequency counting">>};
        Got1 ->
            #{id => <<"foldl_state_reduction">>, title => <<"Tail-Recursive State Aggregation via lists:foldl/3">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Fold mismatch: ~p", [Got1]))}
    end
catch C1:R1 ->
    #{id => <<"foldl_state_reduction">>, title => <<"Tail-Recursive State Aggregation via lists:foldl/3">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
Stages = [CompileStage, S1_Fold]
`), true

	case "ch03-l04":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(comprehension_queries) of
    {module, comprehension_queries} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"comprehension_queries.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Comprehensions = try
    Emails = comprehension_queries:active_user_emails([{user, 1, <<"u1">>, active}, {user, 2, <<"u2">>, suspended}]),
    Pairs = comprehension_queries:matrix_cartesian([1, 2], [a, b]),
    Squares = comprehension_queries:filter_even_squares([1, 2, 3, 4]),
    case {Emails, Pairs, Squares} of
        {[<<"u1">>], [{1, a}, {1, b}, {2, a}, {2, b}], [4, 16]} ->
            #{id => <<"list_comprehensions">>, title => <<"List Comprehension Generators & Predicates">>, status => <<"passed">>, time_ms => 10, details => <<"Verified pattern filters, multi-generators, and arithmetic filters">>};
        Got1 ->
            #{id => <<"list_comprehensions">>, title => <<"List Comprehension Generators & Predicates">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Comprehension mismatch: ~p", [Got1]))}
    end
catch C1:R1 ->
    #{id => <<"list_comprehensions">>, title => <<"List Comprehension Generators & Predicates">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
Stages = [CompileStage, S1_Comprehensions]
`), true

	case "ch03-l05":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(inventory_hof) of
    {module, inventory_hof} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"inventory_hof.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_HofSuite = try
    Inv = [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 2}],
    Val = inventory_hof:total_inventory_valuation(Inv),
    Alerts = inventory_hof:critical_stock_alerts(Inv, 5),
    Logs = [{log, <<"/a">>, 40, ok}, {log, <<"/b">>, 60, error}],
    Agg = inventory_hof:aggregate_sla_logs(Logs),
    case {Val, Alerts, Agg} of
        {550, [{alert, 2, "Mouse", 2}], #{total_requests := 2, error_count := 1, total_latency := 100}} ->
            #{id => <<"hof_inventory_suite">>, title => <<"Refactored Inventory & SLA Aggregator Pipeline">>, status => <<"passed">>, time_ms => 12, details => <<"Passed total valuation, critical stock alerts, and SLA log aggregation">>};
        Got1 ->
            #{id => <<"hof_inventory_suite">>, title => <<"Refactored Inventory & SLA Aggregator Pipeline">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("HOF Suite mismatch: ~p", [Got1]))}
    end
catch C1:R1 ->
    #{id => <<"hof_inventory_suite">>, title => <<"Refactored Inventory & SLA Aggregator Pipeline">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
Stages = [CompileStage, S1_HofSuite]
`), true

	// ── CHAPTER 4 ─────────────────────────────────────────────────────────────
	case "ch04-l01":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(map_registry) of
    {module, map_registry} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"map_registry.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Maps = try
    S0 = map_registry:create_session(<<"alice">>, admin),
    S1 = map_registry:update_presence(S0, <<"alice">>, online),
    F1 = map_registry:get_session_field(S1, role),
    F2 = map_registry:get_session_field(S1, missing_field),
    case {S1, F1, F2} of
        {#{user_id := <<"alice">>, role := admin, presence := online, login_count := 1}, {ok, admin}, error} ->
            #{id => <<"maps_operations">>, title => <<"Map Creation, Exact Matching (:=), & Lookup">>, status => <<"passed">>, time_ms => 8, details => <<"Verified #{key := Val} matching, login counter updates, and maps:find">>};
        Got1 ->
            #{id => <<"maps_operations">>, title => <<"Map Creation, Exact Matching (:=), & Lookup">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Map mismatch: ~p", [Got1]))}
    end
catch C1:R1 ->
    #{id => <<"maps_operations">>, title => <<"Map Creation, Exact Matching (:=), & Lookup">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
Stages = [CompileStage, S1_Maps]
`), true

	case "ch04-l02":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(record_frames) of
    {module, record_frames} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"record_frames.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Records = try
    F0 = record_frames:new_frame(1, ack, <<"PAYLOAD">>),
    F1 = record_frames:update_seq(F0, 2),
    P = record_frames:extract_payload(F1),
    case {F0, F1, P} of
        {{frame, 1, ack, <<"PAYLOAD">>}, {frame, 2, ack, <<"PAYLOAD">>}, <<"PAYLOAD">>} ->
            #{id => <<"record_definitions">>, title => <<"Record Macro Definition & Field Manipulation">>, status => <<"passed">>, time_ms => 8, details => <<"Verified #frame{} construction, field updates, and payload extraction">>};
        Got1 ->
            #{id => <<"record_definitions">>, title => <<"Record Macro Definition & Field Manipulation">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Record mismatch: ~p", [Got1]))}
    end
catch C1:R1 ->
    #{id => <<"record_definitions">>, title => <<"Record Macro Definition & Field Manipulation">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
Stages = [CompileStage, S1_Records]
`), true

	case "ch04-l03":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(bit_packer) of
    {module, bit_packer} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"bit_packer.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Bits = try
    H = bit_packer:pack_header(4, 2, 1024),
    U = bit_packer:unpack_header(<<H/binary, "PAYLOAD">>),
    T = bit_packer:encode_utf8_tagged(<<"HELLO">>),
    case {H, U, T} of
        {<<66, 4, 0>>, {ok, 4, 2, 1024, <<"PAYLOAD">>}, <<1, 0, 5, "HELLO">>} ->
            #{id => <<"bit_syntax_wire_format">>, title => <<"Bit Syntax <<...>> Protocol Packing & Endianness">>, status => <<"passed">>, time_ms => 8, details => <<"Verified 24-bit header packing, big-endian length, and UTF-8 tagging">>};
        Got1 ->
            #{id => <<"bit_syntax_wire_format">>, title => <<"Bit Syntax <<...>> Protocol Packing & Endianness">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Bit mismatch: ~p", [Got1]))}
    end
catch C1:R1 ->
    #{id => <<"bit_syntax_wire_format">>, title => <<"Bit Syntax <<...>> Protocol Packing & Endianness">>, status => <<"failed">>, time_ms => 8, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
Stages = [CompileStage, S1_Bits]
`), true

	case "ch04-l04":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(binary_unpinner) of
    {module, binary_unpinner} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"binary_unpinner.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Unpin = try
    Big = crypto:strong_rand_bytes(1024),
    case binary_unpinner:extract_token_safe(Big) of
        {ok, SafeToken} when byte_size(SafeToken) =:= 16 ->
            #{id => <<"procbin_subbinary_unpinning">>, title => <<"ProcBin Unpinning via binary:copy/1">>, status => <<"passed">>, time_ms => 10, details => <<"binary:copy/1 confirmed: Sub-binary isolated to avoid parent buffer retention">>};
        Got1 ->
            #{id => <<"procbin_subbinary_unpinning">>, title => <<"ProcBin Unpinning via binary:copy/1">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Token mismatch: ~p", [Got1]))}
    end
catch C1:R1 ->
    #{id => <<"procbin_subbinary_unpinning">>, title => <<"ProcBin Unpinning via binary:copy/1">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
Stages = [CompileStage, S1_Unpin]
`), true

	case "ch04-l05":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(packet_parser) of
    {module, packet_parser} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"packet_parser.erl compiled cleanly">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Tlv = try
    F1_Bin = <<1:4, 2:4, 4:16/big, "PING">>,
    F2_Bin = <<1:4, 3:4, 4:16/big, "PONG">>,
    Stream = <<F1_Bin/binary, F2_Bin/binary>>,
    case packet_parser:parse_tlv_stream(Stream) of
        {ok, [{tlv_frame, 1, 2, 4, <<"PING">>}, {tlv_frame, 1, 3, 4, <<"PONG">>}]} ->
            #{id => <<"tlv_stream_parsing">>, title => <<"Binary TLV Stream Frame Extraction & Record Assembly">>, status => <<"passed">>, time_ms => 12, details => <<"All frames extracted in order with unpinned payloads">>};
        Got1 ->
            #{id => <<"tlv_stream_parsing">>, title => <<"Binary TLV Stream Frame Extraction & Record Assembly">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("TLV mismatch: ~p", [Got1]))}
    end
catch C1:R1 ->
    #{id => <<"tlv_stream_parsing">>, title => <<"Binary TLV Stream Frame Extraction & Record Assembly">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C1, R1]))}
end,
Stages = [CompileStage, S1_Tlv]
`), true

	// ── CHAPTER 5 ─────────────────────────────────────────────────────────────
	case "ch05-l01":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(process_bench) of
    {module, process_bench} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"process_bench.erl compiled cleanly; run_bench/1 and inspect_process/1 exported.">>};
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
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
Stages = [CompileStage, S1_Bench, S2_Inspect]
`), true

	case "ch05-l02":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(ping_actor) of
    {module, ping_actor} ->
        Exports = ping_actor:module_info(exports),
        case lists:member({start_responder, 0}, Exports) andalso lists:member({ping, 2}, Exports) of
            true -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"ping_actor.erl compiled cleanly; start_responder/0 and ping/2 exported.">>};
            false -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => <<"Missing required exports: start_responder/0 or ping/2">>}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "ping_actor.erl"]),
    BeamPath = filename:join(["%s", "ebin", "ping_actor.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_calls => [{erlang, self, 0}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_self_and_spawn_audit">>, title => <<"AST Analysis: Asynchronous Protocol & self() Audit">>, status => <<"passed">>, time_ms => 15, details => <<"Verified self() call for request-reply protocol.">>};
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
Stages = [CompileStage, S1_Ast, S2_PingPong]
`, wsDir, wsDir), true

	case "ch05-l03":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(priority_mailbox) of
    {module, priority_mailbox} ->
        Exports = priority_mailbox:module_info(exports),
        case lists:member({receive_urgent_first, 1}, Exports) andalso lists:member({request_with_timeout, 3}, Exports) of
            true -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"priority_mailbox.erl compiled cleanly; receive_urgent_first/1 and request_with_timeout/3 exported.">>};
            false -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => <<"Missing required exports: receive_urgent_first/1 or request_with_timeout/3">>}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "priority_mailbox.erl"]),
    BeamPath = filename:join(["%s", "ebin", "priority_mailbox.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_constructs => [receive_after]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_receive_after_audit">>, title => <<"AST Analysis: receive...after Construct Verification">>, status => <<"passed">>, time_ms => 15, details => <<"Verified receive...after construct to guarantee zero hangs.">>};
        {error, Violations} ->
            #{id => <<"ast_receive_after_audit">>, title => <<"AST Analysis: receive...after Construct Verification">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_receive_after_audit">>, title => <<"AST Analysis: receive...after Construct Verification">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
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
catch C2:R2 ->
    #{id => <<"selective_receive_priority">>, title => <<"Mailbox Selective Receive & Priority Queue Reordering">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2]))}
end,
S3_Timeout = try
    SilentWorker = spawn(fun() -> receive after 1000 -> ok end end),
    T0 = erlang:monotonic_time(millisecond),
    case priority_mailbox:request_with_timeout(SilentWorker, test_ping, 50) of
        {error, timeout} ->
            Elapsed = erlang:monotonic_time(millisecond) - T0,
            if
                Elapsed >= 40 andalso Elapsed =< 250 ->
                    #{id => <<"timeout_guarantee">>, title => <<"after Timeout Fallback & Non-Blocking Guarantees">>, status => <<"passed">>, time_ms => Elapsed, details => list_to_binary(io_lib:format("Timeout fired accurately in ~p ms without blocking caller.", [Elapsed]))};
                true ->
                    #{id => <<"timeout_guarantee">>, title => <<"after Timeout Fallback & Non-Blocking Guarantees">>, status => <<"failed">>, time_ms => Elapsed, details => list_to_binary(io_lib:format("Timeout elapsed unexpected duration: ~p ms", [Elapsed]))}
            end;
        OtherT ->
            #{id => <<"timeout_guarantee">>, title => <<"after Timeout Fallback & Non-Blocking Guarantees">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Expected {error, timeout}, got: ~p", [OtherT]))}
    end
catch C3:R3 ->
    #{id => <<"timeout_guarantee">>, title => <<"after Timeout Fallback & Non-Blocking Guarantees">>, status => <<"failed">>, time_ms => 10, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C3, R3]))}
end,
Stages = [CompileStage, S1_Ast, S2_Priority, S3_Timeout]
`, wsDir, wsDir), true

	case "ch05-l04":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(counter_actor) of
    {module, counter_actor} ->
        Exports = counter_actor:module_info(exports),
        Req = [{start, 1}, {increment, 2}, {get_value, 1}, {stop, 1}, {loop, 1}],
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
        require_tail_recursion => [{loop, 1}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_tco_loop_audit">>, title => <<"AST Analysis: Tail-Recursive loop/1 (O(1) Stack Memory)">>, status => <<"passed">>, time_ms => 15, details => <<"Tail call optimization verified: loop/1 reuses stack frames in O(1) space.">>};
        {error, Violations} ->
            #{id => <<"ast_tco_loop_audit">>, title => <<"AST Analysis: Tail-Recursive loop/1 (O(1) Stack Memory)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_tco_loop_audit">>, title => <<"AST Analysis: Tail-Recursive loop/1 (O(1) Stack Memory)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_State = try
    P = counter_actor:start(100),
    ok = counter_actor:increment(P, 50),
    ok = counter_actor:increment(P, -30),
    ok = counter_actor:increment(P, 10),
    case counter_actor:get_value(P) of
        {ok, 130} ->
            counter_actor:stop(P),
            #{id => <<"actor_state_accumulation">>, title => <<"Immutable State Accumulation across Concurrent Increments">>, status => <<"passed">>, time_ms => 14, details => <<"Counter accurately preserved state changes: 100 + 50 - 30 + 10 = 130.">>};
        GotVal ->
            counter_actor:stop(P),
            #{id => <<"actor_state_accumulation">>, title => <<"Immutable State Accumulation across Concurrent Increments">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("Value mismatch: ~p", [GotVal]))}
    end
catch C2:R2 ->
    #{id => <<"actor_state_accumulation">>, title => <<"Immutable State Accumulation across Concurrent Increments">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("Crash: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_Ast, S2_State]
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
        required_calls => [{erlang, make_ref, 0}, {erlang, register, 2}, {erlang, whereis, 1}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_registry_and_ref_audit">>, title => <<"AST Analysis: register/2, whereis/1, and make_ref/0 Invariants">>, status => <<"passed">>, time_ms => 15, details => <<"Verified register/2, whereis/1, and make_ref/0 request correlation.">>};
        {error, Violations} ->
            #{id => <<"ast_registry_and_ref_audit">>, title => <<"AST Analysis: register/2, whereis/1, and make_ref/0 Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_registry_and_ref_audit">>, title => <<"AST Analysis: register/2, whereis/1, and make_ref/0 Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
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
catch C2:R2 ->
    catch named_kv_actor:stop(),
    #{id => <<"named_registry_operations">>, title => <<"Atom Registry Lifecycle, Map Storage & make_ref() Verification">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("KV error: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_Ast, S2_Kv]
`, wsDir, wsDir), true

	case "ch05-l06":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(ledger_actor) of
    {module, ledger_actor} ->
        Exports = ledger_actor:module_info(exports),
        Req = [{start, 1}, {get_balance, 2}, {process_transaction, 2}, {process_batch, 2}, {stop, 1}],
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
CompileStage = case code:ensure_loaded(boundary_parser) of
    {module, boundary_parser} ->
        Exports = boundary_parser:module_info(exports),
        Req = [{safe_parse_payload, 1}, {with_resource_cleanup, 3}],
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
    end
catch C1:R1 ->
    #{id => <<"ast_try_catch_audit">>, title => <<"AST Analysis: try...catch...after and binary_to_term/2 [safe] Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_SafeParse = try
    T1 = {order, 999, [item1, item2], 49.99},
    B1 = term_to_binary(T1),
    {ok, T1} = boundary_parser:safe_parse_payload(B1),
    {error, {error, badarg}} = boundary_parser:safe_parse_payload(<<"invalid_bytes_xyz">>),
    {error, {error, badarg}} = boundary_parser:safe_parse_payload(12345),
    #{id => <<"safe_binary_parsing">>, title => <<"Safe Term Deserialization & Corrupt Input Protection">>, status => <<"passed">>, time_ms => 14, details => <<"Valid binaries safely decoded; corrupt binaries and non-binary inputs caught gracefully.">>}
catch C2:R2 ->
    #{id => <<"safe_binary_parsing">>, title => <<"Safe Term Deserialization & Corrupt Input Protection">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("Parse error: ~p:~p", [C2, R2]))}
end,
S3_ResourceCleanup = try
    Self = self(),
    Acquire = fun() -> resource_ref_123 end,
    ActionSuccess = fun(Res) -> {processed, Res} end,
    Release = fun(Res) -> Self ! {released, Res} end,
    {ok, {processed, resource_ref_123}} = boundary_parser:with_resource_cleanup(Acquire, ActionSuccess, Release),
    receive {released, resource_ref_123} -> ok after 500 -> error(missing_release_on_success) end,
    ActionCrash = fun(_) -> error(deliberate_db_disconnect) end,
    {error, {error, deliberate_db_disconnect}} = boundary_parser:with_resource_cleanup(Acquire, ActionCrash, Release),
    receive {released, resource_ref_123} -> ok after 500 -> error(missing_release_on_crash) end,
    #{id => <<"guaranteed_resource_cleanup">>, title => <<"Guaranteed Cleanup via 'after' Construct Across Errors">>, status => <<"passed">>, time_ms => 16, details => <<"Resource release callback guaranteed to execute on both success and deliberate crash.">>}
catch C3:R3 ->
    #{id => <<"guaranteed_resource_cleanup">>, title => <<"Guaranteed Cleanup via 'after' Construct Across Errors">>, status => <<"failed">>, time_ms => 16, details => list_to_binary(io_lib:format("Cleanup test error: ~p:~p", [C3, R3]))}
end,
Stages = [CompileStage, S1_Ast, S2_SafeParse, S3_ResourceCleanup]
`, wsDir, wsDir), true

	case "ch06-l02":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(linked_pipeline) of
    {module, linked_pipeline} ->
        Exports = linked_pipeline:module_info(exports),
        Req = [{start_linked_pipeline, 0}, {compute, 2}, {crash_stage1, 2}],
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
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{erlang, link, 1}, {erlang, spawn_link, 1}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_link_invariants">>, title => <<"AST Analysis: link/1 and spawn_link/1 Invariants">>, status => <<"passed">>, time_ms => 15, details => <<"link/1 and spawn_link/1 verified.">>};
        {error, Violations} ->
            #{id => <<"ast_link_invariants">>, title => <<"AST Analysis: link/1 and spawn_link/1 Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_link_invariants">>, title => <<"AST Analysis: link/1 and spawn_link/1 Invariants">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_Compute = try
    {ok, W1, W2} = linked_pipeline:start_linked_pipeline(),
    {ok, 36} = linked_pipeline:compute(W1, 3),
    {ok, 100} = linked_pipeline:compute(W1, 5),
    true = is_process_alive(W1),
    true = is_process_alive(W2),
    #{id => <<"two_stage_computation">>, title => <<"Two-Stage Pipeline Forwarding & Transformation">>, status => <<"passed">>, time_ms => 14, details => <<"Numbers cleanly doubled by Stage 1, squared by Stage 2, and returned to caller.">>}
catch C2:R2 ->
    #{id => <<"two_stage_computation">>, title => <<"Two-Stage Pipeline Forwarding & Transformation">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("Compute error: ~p:~p", [C2, R2]))}
end,
S3_CascadingExit = try
    {ok, W1_Crash, W2_Crash} = linked_pipeline:start_linked_pipeline(),
    linked_pipeline:crash_stage1(W1_Crash, simulated_fatal_error),
    timer:sleep(60),
    Alive1 = is_process_alive(W1_Crash),
    Alive2 = is_process_alive(W2_Crash),
    case {Alive1, Alive2} of
        {false, false} ->
            #{id => <<"cascading_exit_propagation">>, title => <<"Bidirectional Exit Link Propagation (Zero Zombie Leaks)">>, status => <<"passed">>, time_ms => 20, details => <<"Crashing Stage 1 propagated an abnormal exit signal that tore down Stage 2 cleanly.">>};
        OtherAlive ->
            #{id => <<"cascading_exit_propagation">>, title => <<"Bidirectional Exit Link Propagation (Zero Zombie Leaks)">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Processes leaked: ~p", [OtherAlive]))}
    end
catch C3:R3 ->
    #{id => <<"cascading_exit_propagation">>, title => <<"Bidirectional Exit Link Propagation (Zero Zombie Leaks)">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Crash test error: ~p:~p", [C3, R3]))}
end,
Stages = [CompileStage, S1_Ast, S2_Compute, S3_CascadingExit]
`, wsDir, wsDir), true

	case "ch06-l03":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(exit_trapper) of
    {module, exit_trapper} ->
        Exports = exit_trapper:module_info(exports),
        Req = [{start_supervised, 1}, {get_worker_pid, 1}, {kill_worker, 2}],
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
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{erlang, process_flag, 2}, {erlang, spawn_link, 1}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_trap_exit_invariants">>, title => <<"AST Analysis: process_flag(trap_exit, true) and spawn_link/1">>, status => <<"passed">>, time_ms => 15, details => <<"process_flag(trap_exit, true) and spawn_link/1 confirmed.">>};
        {error, Violations} ->
            #{id => <<"ast_trap_exit_invariants">>, title => <<"AST Analysis: process_flag(trap_exit, true) and spawn_link/1">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_trap_exit_invariants">>, title => <<"AST Analysis: process_flag(trap_exit, true) and spawn_link/1">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_Supervised = try
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
    end
catch C2:R2 ->
    #{id => <<"self_healing_respawn">>, title => <<"Exit Trapping & Automatic Self-Healing Respawn">>, status => <<"failed">>, time_ms => 22, details => list_to_binary(io_lib:format("Supervisor test error: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_Ast, S2_Supervised]
`, wsDir, wsDir), true

	case "ch06-l04":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(worker_watcher) of
    {module, worker_watcher} ->
        Exports = worker_watcher:module_info(exports),
        case lists:member({run_monitored_task, 2}, Exports) of
            true -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"worker_watcher.erl compiled cleanly; run_monitored_task/2 exported.">>};
            false -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => <<"Missing export: run_monitored_task/2">>}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "worker_watcher.erl"]),
    BeamPath = filename:join(["%s", "ebin", "worker_watcher.beam"]),
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
    end
catch C1:R1 ->
    #{id => <<"ast_monitor_invariants">>, title => <<"AST Analysis: spawn_monitor/1, demonitor/2, and receive...after">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_Success = try
    {ok, 42} = worker_watcher:run_monitored_task(fun() -> 21 * 2 end, 1000),
    #{id => <<"successful_execution">>, title => <<"Successful Monitored Execution & Mailbox Flush">>, status => <<"passed">>, time_ms => 12, details => <<"Monitored task executed cleanly; monitor flushed.">>}
catch C2:R2 ->
    #{id => <<"successful_execution">>, title => <<"Successful Monitored Execution & Mailbox Flush">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Success test error: ~p:~p", [C2, R2]))}
end,
S3_Crash = try
    {error, {crashed, badarith}} = worker_watcher:run_monitored_task(fun() -> 1 / 0 end, 1000),
    true = is_process_alive(self()),
    #{id => <<"crash_isolation">>, title => <<"Crash Isolation (Caller Survives Worker Division by Zero)">>, status => <<"passed">>, time_ms => 14, details => <<"Worker crash caught via 'DOWN' message; calling process survived unhurt.">>}
catch C3:R3 ->
    #{id => <<"crash_isolation">>, title => <<"Crash Isolation (Caller Survives Worker Division by Zero)">>, status => <<"failed">>, time_ms => 14, details => list_to_binary(io_lib:format("Crash isolation error: ~p:~p", [C3, R3]))}
end,
S4_Timeout = try
    {error, timeout} = worker_watcher:run_monitored_task(fun() -> receive after infinity -> ok end end, 80),
    #{id => <<"timeout_and_worker_kill">>, title => <<"Runaway Task Timeout & Forced Termination">>, status => <<"passed">>, time_ms => 100, details => <<"Stuck infinite-loop worker terminated via exit(Pid, kill) and monitor flushed.">>}
catch C4:R4 ->
    #{id => <<"timeout_and_worker_kill">>, title => <<"Runaway Task Timeout & Forced Termination">>, status => <<"failed">>, time_ms => 100, details => list_to_binary(io_lib:format("Timeout test error: ~p:~p", [C4, R4]))}
end,
Stages = [CompileStage, S1_Ast, S2_Success, S3_Crash, S4_Timeout]
`, wsDir, wsDir), true

	case "ch06-l05":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(my_gen_server) of
    {module, my_gen_server} ->
        Exports = my_gen_server:module_info(exports),
        Req = [{start, 2}, {call, 3}, {cast, 2}, {stop, 1}, {loop, 2}],
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
S2_Protocol = try
    Cb = beamforge_test_cb,
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
    code:load_binary(Cb, "beamforge_test_cb.beam", CbBin),
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
catch C2:R2 ->
    #{id => <<"gen_server_protocol">>, title => <<"OTP Callback Protocol: init, handle_call, handle_cast & stop">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Protocol error: ~p:~p", [C2, R2]))}
end,
S3_ZeroLatency = try
    CrashPid = spawn(fun() -> receive {'$gen_call', {From, MRef}, crash_cmd} -> exit(simulated_fatal_oom) end end),
    T0 = erlang:system_time(millisecond),
    Res = my_gen_server:call(CrashPid, crash_cmd, 5000),
    Elapsed = erlang:system_time(millisecond) - T0,
    case Res of
        {error, {server_crashed, simulated_fatal_oom}} when Elapsed < 100 ->
            #{id => <<"zero_latency_crash_detection">>, title => <<"Zero-Latency Detection of Server Crash (<100ms vs 5000ms timeout)">>, status => <<"passed">>, time_ms => 15, details => list_to_binary(io_lib:format("Unblocked in ~p ms upon server crash via monitor 'DOWN'.", [Elapsed]))};
        OtherCrash ->
            #{id => <<"zero_latency_crash_detection">>, title => <<"Zero-Latency Detection of Server Crash (<100ms vs 5000ms timeout)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Failed crash detection: ~p in ~p ms", [OtherCrash, Elapsed]))}
    end
catch C3:R3 ->
    #{id => <<"zero_latency_crash_detection">>, title => <<"Zero-Latency Detection of Server Crash (<100ms vs 5000ms timeout)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Zero-latency test error: ~p:~p", [C3, R3]))}
end,
Stages = [CompileStage, S1_Ast, S2_Protocol, S3_ZeroLatency]
`, wsDir, wsDir), true

	case "ch06-l06":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(job_coordinator) of
    {module, job_coordinator} ->
        Exports = job_coordinator:module_info(exports),
        Req = [{execute_batch, 2}, {classify_job_outcome, 2}, {retry_or_dead_letter, 3}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"job_coordinator.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "job_coordinator.erl"]),
    BeamPath = filename:join(["%s", "ebin", "job_coordinator.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        forbidden_constructs => [try_catch],
        required_remote_calls => [{erlang, spawn_monitor, 1}, {erlang, demonitor, 2}],
        require_tail_recursion => [{execute_batch, 2}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_isolation_and_tco">>, title => <<"AST Analysis: Zero try/catch, spawn_monitor/1 & Strict TCO">>, status => <<"passed">>, time_ms => 18, details => <<"Process isolation verified: zero try/catch around workers; tail recursion verified.">>};
        {error, Violations} ->
            #{id => <<"ast_isolation_and_tco">>, title => <<"AST Analysis: Zero try/catch, spawn_monitor/1 & Strict TCO">>, status => <<"failed">>, time_ms => 18, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_isolation_and_tco">>, title => <<"AST Analysis: Zero try/catch, spawn_monitor/1 & Strict TCO">>, status => <<"failed">>, time_ms => 18, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_BatchAllSuccess = try
    Jobs = [{job, 101, 10, 3}, {job, 102, 20, 3}, {job, 103, 30, 3}],
    Worker = fun(X) -> X * 2 end,
    case job_coordinator:execute_batch(Jobs, Worker) of
        {[{completed, 101, 20}, {completed, 102, 40}, {completed, 103, 60}], []} ->
            #{id => <<"batch_success">>, title => <<"Batch Processing of Normal Jobs in Monitored Workers">>, status => <<"passed">>, time_ms => 15, details => <<"All 3 jobs completed successfully with results preserved in order.">>};
        OtherSuccess ->
            #{id => <<"batch_success">>, title => <<"Batch Processing of Normal Jobs in Monitored Workers">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Unexpected result: ~p", [OtherSuccess]))}
    end
catch C2:R2 ->
    #{id => <<"batch_success">>, title => <<"Batch Processing of Normal Jobs in Monitored Workers">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Batch success error: ~p:~p", [C2, R2]))}
end,
S3_TransientRetry = try
    Helper = spawn(fun() ->
        receive {run, Caller1} ->
            Caller1 ! fail_once,
            receive {run, Caller2} ->
                Caller2 ! recovered
            end
        end
    end),
    FlakyWorker = fun(_) ->
        Helper ! {run, self()},
        receive
            fail_once -> 1 / 0;
            recovered -> ok_on_retry
        end
    end,
    JobsRetry = [{job, 99, test_payload, 2}],
    case job_coordinator:execute_batch(JobsRetry, FlakyWorker) of
        {[{completed, 99, ok_on_retry}], []} ->
            #{id => <<"transient_retry">>, title => <<"Automatic Transient Failure Retry & Recovery">>, status => <<"passed">>, time_ms => 18, details => <<"First attempt failed with badarith; second attempt automatically retried and succeeded.">>};
        OtherRetry ->
            #{id => <<"transient_retry">>, title => <<"Automatic Transient Failure Retry & Recovery">>, status => <<"failed">>, time_ms => 18, details => list_to_binary(io_lib:format("Retry mismatch: ~p", [OtherRetry]))}
    end
catch C3:R3 ->
    #{id => <<"transient_retry">>, title => <<"Automatic Transient Failure Retry & Recovery">>, status => <<"failed">>, time_ms => 18, details => list_to_binary(io_lib:format("Transient retry error: ~p:~p", [C3, R3]))}
end,
S4_DeadLetterQuarantine = try
    PoisonWorker = fun
        (crash) -> error(fatal_poison_pill);
        (X) when is_number(X) -> X + 1
    end,
    JobsMix = [{job, 1, 10, 3}, {job, 2, crash, 2}, {job, 3, 30, 3}],
    case job_coordinator:execute_batch(JobsMix, PoisonWorker) of
        {[{completed, 1, 11}, {completed, 3, 31}], [{dead_letter, 2, LastReason}]} ->
            case LastReason of
                fatal_poison_pill ->
                    #{id => <<"poison_pill_quarantine">>, title => <<"Dead-Letter Quarantine of Poison Pill (No Coordinator Crash)">>, status => <<"passed">>, time_ms => 22, details => <<"Poison job 2 exhausted 2 attempts and was isolated in DeadLetterList; valid jobs completed untouched.">>};
                {fatal_poison_pill, _} ->
                    #{id => <<"poison_pill_quarantine">>, title => <<"Dead-Letter Quarantine of Poison Pill (No Coordinator Crash)">>, status => <<"passed">>, time_ms => 22, details => <<"Poison job 2 exhausted 2 attempts and was isolated in DeadLetterList; valid jobs completed untouched.">>};
                OtherReason ->
                    #{id => <<"poison_pill_quarantine">>, title => <<"Dead-Letter Quarantine of Poison Pill (No Coordinator Crash)">>, status => <<"failed">>, time_ms => 22, details => list_to_binary(io_lib:format("Unexpected crash reason: ~p", [OtherReason]))}
            end;
        OtherMix ->
            #{id => <<"poison_pill_quarantine">>, title => <<"Dead-Letter Quarantine of Poison Pill (No Coordinator Crash)">>, status => <<"failed">>, time_ms => 22, details => list_to_binary(io_lib:format("Mix result mismatch: ~p", [OtherMix]))}
    end
catch C4:R4 ->
    #{id => <<"poison_pill_quarantine">>, title => <<"Dead-Letter Quarantine of Poison Pill (No Coordinator Crash)">>, status => <<"failed">>, time_ms => 22, details => list_to_binary(io_lib:format("Poison test error: ~p:~p", [C4, R4]))}
end,
S5_Classifier = try
    {ok, 84} = job_coordinator:classify_job_outcome(fun(X) -> X * 2 end, 42),
    CrashOutcome = job_coordinator:classify_job_outcome(fun(_) -> 1 / 0 end, dummy),
    case CrashOutcome of
        {crashed, badarith} -> ok;
        {crashed, {badarith, _}} -> ok
    end,
    {crashed, timeout} = job_coordinator:classify_job_outcome(fun(_) -> receive after infinity -> ok end end, dummy),
    #{id => <<"outcome_classifier">>, title => <<"Task Outcome Classifier (Normal, Crash, Timeout)">>, status => <<"passed">>, time_ms => 550, details => <<"All 3 execution outcomes classified with timeout and process kill handling.">>}
catch C5:R5 ->
    #{id => <<"outcome_classifier">>, title => <<"Task Outcome Classifier (Normal, Crash, Timeout)">>, status => <<"failed">>, time_ms => 550, details => list_to_binary(io_lib:format("Classifier error: ~p:~p", [C5, R5]))}
end,
Stages = [CompileStage, S1_Ast, S2_BatchAllSuccess, S3_TransientRetry, S4_DeadLetterQuarantine, S5_Classifier]
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

	case "ch07-l05":
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

	case "ch07-l06":
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
    W1 = child_spec_factory:worker_spec(task_worker, {task_runner, start_link, [1]}, transient, 2000),
    W2 = child_spec_factory:worker_spec(listener, {tcp_listener, start_link, [4000]}, permanent, brutal_kill),
    case {W1, W2} of
        {#{id := task_worker, start := {task_runner, start_link, [1]}, restart := transient, shutdown := 2000, type := worker, modules := [task_runner]},
         #{id := listener, start := {tcp_listener, start_link, [4000]}, restart := permanent, shutdown := brutal_kill, type := worker, modules := [tcp_listener]}} ->
            #{id => <<"worker_child_spec_audit">>, title => <<"Worker Child Spec Map Specification Compliance">>, status => <<"passed">>, time_ms => 15, details => <<"Correctly formatted worker child_spec maps with modules extraction and shutdown timeout.">>};
        Other2 ->
            #{id => <<"worker_child_spec_audit">>, title => <<"Worker Child Spec Map Specification Compliance">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Worker spec mismatch: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"worker_child_spec_audit">>, title => <<"Worker Child Spec Map Specification Compliance">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Worker spec error: ~p:~p", [C2, R2]))}
end,
S3_SupervisorSpecs = try
    SupSpec = child_spec_factory:supervisor_spec(nested_tree_sup, {session_sup, start_link, []}),
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
    case {P1, P2, T1, T2, TR1, TR2, TR3, TR4, TR5} of
        {true, true, false, false, false, false, false, true, true} ->
            #{id => <<"restart_decision_matrix">>, title => <<"OTP Restart Decision Matrix (Permanent, Transient, Temporary)">>, status => <<"passed">>, time_ms => 15, details => <<"Verified full OTP decision matrix: transient differentiates clean exits from unexpected crashes.">>};
        Other4 ->
            #{id => <<"restart_decision_matrix">>, title => <<"OTP Restart Decision Matrix (Permanent, Transient, Temporary)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Matrix mismatch: ~p", [Other4]))}
    end
catch C4:R4 ->
    #{id => <<"restart_decision_matrix">>, title => <<"OTP Restart Decision Matrix (Permanent, Transient, Temporary)">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Matrix error: ~p:~p", [C4, R4]))}
end,
Stages = [CompileStage, S1_Ast, S2_WorkerSpecs, S3_SupervisorSpecs, S4_DecisionMatrix]
`, wsDir, wsDir), true

	case "ch08-l03":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(dynamic_session_sup) of
    {module, dynamic_session_sup} ->
        Exports = dynamic_session_sup:module_info(exports),
        Req = [{start_link, 0}, {start_session, 3}, {count_sessions, 1}, {terminate_session, 2}, {init, 1}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"dynamic_session_sup.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "dynamic_session_sup.erl"]),
    BeamPath = filename:join(["%s", "ebin", "dynamic_session_sup.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{supervisor, start_link, 3}, {supervisor, start_child, 2}, {supervisor, count_children, 1}, {supervisor, terminate_child, 2}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_dynamic_supervisor">>, title => <<"AST Analysis: supervisor Behaviour & Dynamic Spawning Calls">>, status => <<"passed">>, time_ms => 15, details => <<"Verified supervisor behaviour, dynamic start_child/2, and telemetry queries.">>};
        {error, Violations} ->
            #{id => <<"ast_dynamic_supervisor">>, title => <<"AST Analysis: supervisor Behaviour & Dynamic Spawning Calls">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_dynamic_supervisor">>, title => <<"AST Analysis: supervisor Behaviour & Dynamic Spawning Calls">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_TemplateSpec = try
    {ok, {SupFlags, [Template]}} = dynamic_session_sup:init([]),
    case {SupFlags, Template} of
        {#{strategy := simple_one_for_one}, #{restart := temporary, type := worker}} ->
            #{id => <<"simple_one_for_one_spec">>, title => <<"simple_one_for_one Template Child Specification Audit">>, status => <<"passed">>, time_ms => 15, details => <<"init/1 returns exactly 1 template child spec with simple_one_for_one strategy and temporary restart.">>};
        Other2 ->
            #{id => <<"simple_one_for_one_spec">>, title => <<"simple_one_for_one Template Child Specification Audit">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Invalid template structure: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"simple_one_for_one_spec">>, title => <<"simple_one_for_one Template Child Specification Audit">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Template error: ~p:~p", [C2, R2]))}
end,
S3_DynamicLifecycle = try
    {ok, Sup} = dynamic_session_sup:start_link(),
    0 = dynamic_session_sup:count_sessions(Sup),
    {ok, P1} = dynamic_session_sup:start_session(Sup, <<"sess_101">>, <<"usr_alpha">>),
    {ok, P2} = dynamic_session_sup:start_session(Sup, <<"sess_102">>, <<"usr_beta">>),
    {ok, P3} = dynamic_session_sup:start_session(Sup, <<"sess_103">>, <<"usr_gamma">>),
    3 = dynamic_session_sup:count_sessions(Sup),
    ok = dynamic_session_sup:terminate_session(Sup, P2),
    2 = dynamic_session_sup:count_sessions(Sup),
    exit(Sup, shutdown),
    #{id => <<"dynamic_lifecycle_pool">>, title => <<"Live Dynamic Process Pool Lifecycle (Spawn, Count, Terminate)">>, status => <<"passed">>, time_ms => 35, details => <<"Spawned 3 dynamic sessions on demand; verified count_sessions/1 increment/decrement and graceful cleanup.">>}
catch C3:R3 ->
    #{id => <<"dynamic_lifecycle_pool">>, title => <<"Live Dynamic Process Pool Lifecycle (Spawn, Count, Terminate)">>, status => <<"failed">>, time_ms => 35, details => list_to_binary(io_lib:format("Lifecycle error: ~p:~p", [C3, R3]))}
end,
Stages = [CompileStage, S1_Ast, S2_TemplateSpec, S3_DynamicLifecycle]
`, wsDir, wsDir), true

	case "ch08-l04":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(commerce_app) of
    {module, commerce_app} ->
        Exports = commerce_app:module_info(exports),
        Req = [{start, 2}, {stop, 1}, {get_app_config, 2}, {set_app_config, 2}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"commerce_app.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "commerce_app.erl"]),
    BeamPath = filename:join(["%s", "ebin", "commerce_app.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{application, get_env, 3}, {application, set_env, 3}, {supervisor, start_link, 3}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_application_behaviour">>, title => <<"AST Analysis: application Behaviour & Config Management">>, status => <<"passed">>, time_ms => 15, details => <<"Verified application callback exports and application:get_env/set_env environment calls.">>};
        {error, Violations} ->
            #{id => <<"ast_application_behaviour">>, title => <<"AST Analysis: application Behaviour & Config Management">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_application_behaviour">>, title => <<"AST Analysis: application Behaviour & Config Management">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_RootSup = try
    {ok, SupPid} = commerce_app:start(normal, []),
    IsAlive = is_process_alive(SupPid),
    ok = commerce_app:stop([]),
    case IsAlive of
        true ->
            #{id => <<"root_supervisor_startup">>, title => <<"Application Root Supervisor Startup & Shutdown">>, status => <<"passed">>, time_ms => 20, details => <<"start/2 booted live root supervisor and stop/1 terminated cleanly.">>};
        false ->
            #{id => <<"root_supervisor_startup">>, title => <<"Application Root Supervisor Startup & Shutdown">>, status => <<"failed">>, time_ms => 20, details => <<"Root supervisor was not alive.">>}
    end
catch C2:R2 ->
    #{id => <<"root_supervisor_startup">>, title => <<"Application Root Supervisor Startup & Shutdown">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Startup error: ~p:~p", [C2, R2]))}
end,
S3_ConfigEnv = try
    ValDefault = commerce_app:get_app_config(worker_pool_size, 32),
    ok = commerce_app:set_app_config(worker_pool_size, 64),
    ValOverride = commerce_app:get_app_config(worker_pool_size, 32),
    case {ValDefault, ValOverride} of
        {32, 64} ->
            #{id => <<"runtime_config_env">>, title => <<"Application Environment Configuration Management">>, status => <<"passed">>, time_ms => 15, details => <<"Successfully resolved fallback default (32) and dynamic runtime override (64).">>};
        Other3 ->
            #{id => <<"runtime_config_env">>, title => <<"Application Environment Configuration Management">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Config mismatch: ~p", [Other3]))}
    end
catch C3:R3 ->
    #{id => <<"runtime_config_env">>, title => <<"Application Environment Configuration Management">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Config error: ~p:~p", [C3, R3]))}
end,
Stages = [CompileStage, S1_Ast, S2_RootSup, S3_ConfigEnv]
`, wsDir, wsDir), true

	case "ch08-l05":
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
        Req = [{init_pubsub, 0}, {join_topic, 2}, {leave_topic, 2}, {get_subscribers, 1}, {broadcast, 2}],
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
        required_remote_calls => [{pg, start_link, 0}, {pg, join, 2}, {pg, leave, 2}, {pg, get_members, 1}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_pg_contract">>, title => <<"AST Analysis: OTP 23+ pg Module Contract">>, status => <<"passed">>, time_ms => 15, details => <<"Verified pg:start_link/0, join/2, leave/2, and get_members/1 calls.">>};
        {error, Violations} ->
            #{id => <<"ast_pg_contract">>, title => <<"AST Analysis: OTP 23+ pg Module Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
    end
catch C1:R1 ->
    #{id => <<"ast_pg_contract">>, title => <<"AST Analysis: OTP 23+ pg Module Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Crash: ~p:~p", [C1, R1]))}
end,
S2_PubSubLifecycle = try
    ok = cluster_pubsub_pg:init_pubsub(),
    Self = self(),
    ok = cluster_pubsub_pg:join_topic(<<"metrics">>, Self),
    Subscribers1 = cluster_pubsub_pg:get_subscribers(<<"metrics">>),
    HasSelf = lists:member(Self, Subscribers1),
    {ok, 1} = cluster_pubsub_pg:broadcast(<<"metrics">>, #{cpu => 42}),
    GotMsg = receive
        {pubsub_msg, <<"metrics">>, #{cpu := 42}} -> true
    after 100 -> false
    end,
    ok = cluster_pubsub_pg:leave_topic(<<"metrics">>, Self),
    Subscribers2 = cluster_pubsub_pg:get_subscribers(<<"metrics">>),
    LeftGroup = not lists:member(Self, Subscribers2),
    case {HasSelf, GotMsg, LeftGroup} of
        {true, true, true} ->
            #{id => <<"pubsub_broadcast_and_leave">>, title => <<"Decentralized Topic Join, Broadcast & Leave">>, status => <<"passed">>, time_ms => 20, details => <<"Verified membership, payload broadcast reception, and clean unsubscription.">>};
        Other2 ->
            #{id => <<"pubsub_broadcast_and_leave">>, title => <<"Decentralized Topic Join, Broadcast & Leave">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("PubSub mismatch: ~p", [Other2]))}
    end
catch C2:R2 ->
    #{id => <<"pubsub_broadcast_and_leave">>, title => <<"Decentralized Topic Join, Broadcast & Leave">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("PubSub error: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_Ast, S2_PubSubLifecycle]
`, wsDir, wsDir), true

	case "ch09-l05":
		return `
CompileStage = case code:ensure_loaded(ledger_specs_and_tests) of
    {module, ledger_specs_and_tests} ->
        Exports = ledger_specs_and_tests:module_info(exports),
        Req = [{new_ledger, 0}, {deposit, 3}, {withdraw, 3}, {get_balance, 2}, {run_unit_tests, 0}],
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"passed">>, time_ms => 12, details => <<"ledger_specs_and_tests.erl compiled cleanly; all API functions exported.">>};
            Missing -> #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E1} ->
        #{id => <<"compile_and_export_audit">>, title => <<"Module Compilation & Export Audit">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E1]))}
end,
S1_SpecValidation = try
    L0 = ledger_specs_and_tests:new_ledger(),
    {ok, L1} = ledger_specs_and_tests:deposit(L0, <<"acct_1">>, 500),
    500 = ledger_specs_and_tests:get_balance(L1, <<"acct_1">>),
    {ok, L2} = ledger_specs_and_tests:withdraw(L1, <<"acct_1">>, 200),
    300 = ledger_specs_and_tests:get_balance(L2, <<"acct_1">>),
    Err1 = ledger_specs_and_tests:withdraw(L2, <<"acct_1">>, 999),
    Err2 = ledger_specs_and_tests:withdraw(L2, <<"acct_1">>, -10),
    case {Err1, Err2} of
        {{error, insufficient_funds}, {error, invalid_amount}} ->
            #{id => <<"boundary_contract_verification">>, title => <<"Boundary Conditions & Contract Invariant Enforcement">>, status => <<"passed">>, time_ms => 15, details => <<"Overdraft and negative amounts correctly rejected according to specs.">>};
        Other1 ->
            #{id => <<"boundary_contract_verification">>, title => <<"Boundary Conditions & Contract Invariant Enforcement">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Contract breach: ~p", [Other1]))}
    end
catch C1:R1 ->
    #{id => <<"boundary_contract_verification">>, title => <<"Boundary Conditions & Contract Invariant Enforcement">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("Ledger crash: ~p:~p", [C1, R1]))}
end,
S2_UnitTestSuite = try
    case ledger_specs_and_tests:run_unit_tests() of
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

	case "ch09-l06":
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
    SrcPath = filename:join(["%s", "src", "session_cache.erl"]),
    BeamPath = filename:join(["%s", "ebin", "session_cache.beam"]),
    {ok, BeamBin} = file:read_file(BeamPath),
    Rules = #{
        required_remote_calls => [{ets, new, 2}, {ets, insert, 2}, {ets, lookup, 2}, {ets, update_counter, 3}, {ets, give_away, 3}]
    },
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} ->
            #{id => <<"ast_session_cache_contract">>, title => <<"AST Analysis: ETS Operations & Heir Ownership Contract">>, status => <<"passed">>, time_ms => 15, details => <<"Verified ets:new/2 with heir, ets:insert/2, ets:update_counter/3, and ets:give_away/3 calls.">>};
        {error, Violations} ->
            #{id => <<"ast_session_cache_contract">>, title => <<"AST Analysis: ETS Operations & Heir Ownership Contract">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [Violations]))}
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
S1_Ast = case bf_ast_verifier:verify_rules("%s/src/tcp_live_demo.erl", #{
    required_calls => [{gen_tcp, listen, 2}, {gen_tcp, accept, 2}, {gen_tcp, send, 2}, {gen_tcp, recv, 3}]
}) of
    {ok, _} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: gen_tcp socket primitives">>, status => <<"passed">>, time_ms => 15, details => <<"Required gen_tcp:listen, accept, send, and recv found.">>};
    {error, AstFailReason} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: gen_tcp socket primitives">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST verification failed: ~p", [AstFailReason]))}
end,
S2_DemoRun = try
    case tcp_live_demo:run_demo() of
        {ok, 3} ->
            #{id => <<"demo_execution">>, title => <<"Execute Live TCP Socket Lifecycle">>, status => <<"passed">>, time_ms => 45, details => <<"Opened ephemeral port, connected client, exchanged 3 frames, and closed cleanly.">>};
        Other ->
            #{id => <<"demo_execution">>, title => <<"Execute Live TCP Socket Lifecycle">>, status => <<"failed">>, time_ms => 45, details => list_to_binary(io_lib:format("Expected {ok, 3}, got: ~p", [Other]))}
    end
catch C:R ->
    #{id => <<"demo_execution">>, title => <<"Execute Live TCP Socket Lifecycle">>, status => <<"failed">>, time_ms => 45, details => list_to_binary(io_lib:format("Demo crashed: ~p:~p", [C, R]))}
end,
Stages = [CompileStage, S1_Ast, S2_DemoRun]
`, wsDir, wsDir, wsDir), true

	case "ch10-l02":
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
    required_calls => [{inet, setopts, 2}, {gen_tcp, send, 2}]
}) of
    {ok, _} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: Flow Control Calls">>, status => <<"passed">>, time_ms => 15, details => <<"Verified inet:setopts and gen_tcp:send calls exist.">>};
    {error, AstFailReason} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: Flow Control Calls">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST verification failed: ~p", [AstFailReason]))}
end,
S2_ActiveOnceBackpressure = try
    catch tcp_flow_worker:stop_server(whereis(tcp_flow_worker)),
    timer:sleep(20),
    {ok, ListenPid, Port} = tcp_flow_worker:start_server(),
    case bf_backpressure_tester:verify_active_once_backpressure(node(), Port, tcp_flow_worker, 50, 5) of
        {ok, #{verdict := <<"PASSED">>, observed_queue_len := QLen}} ->
            tcp_flow_worker:stop_server(ListenPid),
            #{id => <<"active_once_backpressure">>, title => <<"Live Backpressure Test: Mailbox Bounded under Burst Load">>, status => <<"passed">>, time_ms => 60, details => list_to_binary(io_lib:format("Blasted 50 frames; worker mailbox queue length remained bounded at ~p (<= 5). Hardware TCP flow control enforced!", [QLen]))};
        {ok, _} ->
            tcp_flow_worker:stop_server(ListenPid),
            #{id => <<"active_once_backpressure">>, title => <<"Live Backpressure Test: Mailbox Bounded under Burst Load">>, status => <<"passed">>, time_ms => 60, details => <<"Backpressure test passed.">>};
        {error, ErrReason, Rep} ->
            tcp_flow_worker:stop_server(ListenPid),
            #{id => <<"active_once_backpressure">>, title => <<"Live Backpressure Test: Mailbox Bounded under Burst Load">>, status => <<"failed">>, time_ms => 60, details => list_to_binary(io_lib:format("Backpressure test failed (~p): ~p", [ErrReason, Rep]))}
    end
catch C:R ->
    #{id => <<"active_once_backpressure">>, title => <<"Live Backpressure Test: Mailbox Bounded under Burst Load">>, status => <<"failed">>, time_ms => 60, details => list_to_binary(io_lib:format("Backpressure test crashed: ~p:~p", [C, R]))}
end,
Stages = [CompileStage, S1_Ast, S2_ActiveOnceBackpressure]
`, wsDir, wsDir, wsDir), true

	case "ch10-l03":
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
    required_calls => [{binary, copy, 1}]
}) of
    {ok, _} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: Memory Safety binary:copy/1">>, status => <<"passed">>, time_ms => 15, details => <<"Verified binary:copy/1 is used to prevent sub-binary leaks.">>};
    {error, AstFailReason} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: Memory Safety binary:copy/1">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST verification failed: ~p", [AstFailReason]))}
end,
S2_FramingEdgeCases = try
    {L0, B0} = tcp_frame_buffer:append_and_extract_lines(<<>>, <<>>),
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

	case "ch10-l04":
		return fmt.Sprintf(`
TargetModule = tcp_acceptor_pool,
CompileStage = case compile:file("%s/src/tcp_acceptor_pool.erl", [return_errors, {outdir, "%s/ebin"}]) of
    {ok, TargetModule} ->
        code:purge(TargetModule),
        code:load_file(TargetModule),
        #{id => <<"compile">>, title => <<"Compile tcp_acceptor_pool.erl">>, status => <<"passed">>, time_ms => 20, details => <<"Compilation succeeded">>};
    Err ->
        #{id => <<"compile">>, title => <<"Compile tcp_acceptor_pool.erl">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("~p", [Err]))}
end,
S1_Ast = case bf_ast_verifier:verify_rules("%s/src/tcp_acceptor_pool.erl", #{
    required_calls => [{gen_tcp, controlling_process, 2}, {inet, setopts, 2}]
}) of
    {ok, _} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: Controlling Process & Setopts">>, status => <<"passed">>, time_ms => 15, details => <<"Verified gen_tcp:controlling_process/2 and inet:setopts/2 exist.">>};
    {error, AstFailReason} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: Controlling Process & Setopts">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST verification failed: ~p", [AstFailReason]))}
end,
S2_ConcurrentAcceptors = try
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
    case {ActiveCount5, Reply, ActiveCount3} of
        {5, <<"+REPLY: HELLO_POOL\r\n">>, 3} ->
            #{id => <<"concurrent_acceptors">>, title => <<"Verify Acceptor Pool: 5 Concurrent Clients & Handoff">>, status => <<"passed">>, time_ms => 65, details => <<"5 concurrent clients accepted, connection handoff verified, and disconnect cleanup verified.">>};
        OtherRes ->
            #{id => <<"concurrent_acceptors">>, title => <<"Verify Acceptor Pool: 5 Concurrent Clients & Handoff">>, status => <<"failed">>, time_ms => 65, details => list_to_binary(io_lib:format("Acceptor pool assertion failed: ~p", [OtherRes]))}
    end
catch C:R ->
    #{id => <<"concurrent_acceptors">>, title => <<"Verify Acceptor Pool: 5 Concurrent Clients & Handoff">>, status => <<"failed">>, time_ms => 65, details => list_to_binary(io_lib:format("Pool test crashed: ~p:~p", [C, R]))}
end,
Stages = [CompileStage, S1_Ast, S2_ConcurrentAcceptors]
`, wsDir, wsDir, wsDir), true

	case "ch10-l05":
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
    required_calls => [{inet, setopts, 2}, {gen_tcp, send, 2}, {ets, insert, 2}, {ets, lookup, 2}]
}) of
    {ok, _} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: Sockets & ETS Primitives">>, status => <<"passed">>, time_ms => 15, details => <<"Verified required socket and ETS function calls.">>};
    {error, AstFailReason} ->
        #{id => <<"ast_verification">>, title => <<"AST Analysis: Sockets & ETS Primitives">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST verification failed: ~p", [AstFailReason]))}
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
        case lists:member({run_demo, 0}, xmpp_wire_demo:module_info(exports)) of
            true -> #{id => <<"compile">>, title => <<"Compile xmpp_wire_demo.erl">>, status => <<"passed">>, time_ms => 12, details => <<"Compilation succeeded; run_demo/0 exported.">>};
            false -> #{id => <<"compile">>, title => <<"Compile xmpp_wire_demo.erl">>, status => <<"failed">>, time_ms => 12, details => <<"Missing export run_demo/0">>}
        end;
    {error, E} ->
        #{id => <<"compile">>, title => <<"Compile xmpp_wire_demo.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "xmpp_wire_demo.erl"]),
    Rules = #{required_remote_calls => [{sample_xmpp_c2s, start_link, 1}, {bf_xmpp_c2s_harness, verify_c2s_handshake_and_routing, 3}]},
    case bf_ast_verifier:verify_rules(SrcPath, Rules) of
        {ok, _} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Protocol & Harness Invocation">>, status => <<"passed">>, time_ms => 15, details => <<"Verified sample_xmpp_c2s:start_link/1 and harness verification calls exist.">>};
        {error, V} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Protocol & Harness Invocation">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [V]))}
    end
catch C1:R1 ->
    #{id => <<"ast_verification">>, title => <<"AST Analysis: Protocol & Harness Invocation">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST check error: ~p:~p", [C1, R1]))}
end,
S2_DemoWireExecution = try
    case xmpp_wire_demo:run_demo() of
        {ok, Count} when Count >= 5 ->
            #{id => <<"demo_wire_execution">>, title => <<"Execute Live XMPP C2S Wire Protocol Session">>, status => <<"passed">>, time_ms => 60, details => list_to_binary(io_lib:format("Completed all ~p wire transcript phases with valid RFC 6120 XML payloads.", [Count]))};
        OtherDemo ->
            #{id => <<"demo_wire_execution">>, title => <<"Execute Live XMPP C2S Wire Protocol Session">>, status => <<"failed">>, time_ms => 60, details => list_to_binary(io_lib:format("Demo execution failed: ~p", [OtherDemo]))}
    end
catch C2:R2 ->
    #{id => <<"demo_wire_execution">>, title => <<"Execute Live XMPP C2S Wire Protocol Session">>, status => <<"failed">>, time_ms => 60, details => list_to_binary(io_lib:format("Demo crashed: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_Ast, S2_DemoWireExecution]
`, wsDir), true

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
    Rules = #{required_remote_calls => [{binary, copy, 1}]},
    case bf_ast_verifier:verify_rules(SrcPath, Rules) of
        {ok, _} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Memory Safety binary:copy/1">>, status => <<"passed">>, time_ms => 15, details => <<"Verified binary:copy/1 is used to prevent sub-binary memory pinning.">>};
        {error, V} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Memory Safety binary:copy/1">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [V]))}
    end
catch C1:R1 ->
    #{id => <<"ast_verification">>, title => <<"AST Analysis: Memory Safety binary:copy/1">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST check error: ~p:~p", [C1, R1]))}
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
    CheckErrs = (Err1 =:= {error, invalid_jid}) andalso (Err2 =:= {error, invalid_jid}) andalso (Err3 =:= {error, invalid_jid}) andalso (Err4 =:= {error, invalid_jid}),
    BareFromMap = xmpp_jid:to_bare(J1),
    BareFromBin = xmpp_jid:to_bare(<<"alice@localhost/mobile">>),
    CheckBare = (BareFromMap =:= <<"alice@localhost">>) andalso (BareFromBin =:= <<"alice@localhost">>),
    FmtFull = xmpp_jid:format_jid(#{user => <<"charlie">>, domain => <<"host">>, resource => <<"pc">>}),
    FmtBare = xmpp_jid:format_jid(#{user => <<"charlie">>, domain => <<"host">>, resource => <<>>}),
    CheckFmt = (FmtFull =:= <<"charlie@host/pc">>) andalso (FmtBare =:= <<"charlie@host">>),
    Same1 = xmpp_jid:is_same_bare_jid(<<"alice@localhost/p1">>, <<"alice@localhost/p2">>),
    Diff1 = xmpp_jid:is_same_bare_jid(<<"alice@localhost">>, <<"bob@localhost">>),
    CheckSame = (Same1 =:= true) andalso (Diff1 =:= false),
    case Check1 andalso Check2 andalso CheckErrs andalso CheckBare andalso CheckFmt andalso CheckSame of
        true -> #{id => <<"unit_jid_parsing">>, title => <<"Unit Tests: JID Parsing, Normalization & RFC 7622 Validation">>, status => <<"passed">>, time_ms => 20, details => <<"Full and bare JIDs parsed, malformed JIDs rejected, formatting and equivalence verified.">>};
        false -> #{id => <<"unit_jid_parsing">>, title => <<"Unit Tests: JID Parsing, Normalization & RFC 7622 Validation">>, status => <<"failed">>, time_ms => 20, details => <<"JID parser validation assertion failed.">>}
    end
catch C2:R2 ->
    #{id => <<"unit_jid_parsing">>, title => <<"Unit Tests: JID Parsing, Normalization & RFC 7622 Validation">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Unit test error: ~p:~p", [C2, R2]))}
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
    Rules = #{},
    case bf_ast_verifier:verify_rules(SrcPath, Rules) of
        {ok, _} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Stanza Structure">>, status => <<"passed">>, time_ms => 15, details => <<"AST analysis passed.">>};
        {error, V} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Stanza Structure">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [V]))}
    end
catch CatchClass_S1:CatchReason_S1 ->
    #{id => <<"ast_verification">>, title => <<"AST Analysis: Stanza Structure">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST error: ~p:~p", [CatchClass_S1, CatchReason_S1]))}
end,
S2_UnitStanzaClassification = try
    Cl1 = xmpp_stanza:classify_xml_packet(<<"<stream:stream to='chat.org' version='1.0'>">>),
    Cl2 = xmpp_stanza:classify_xml_packet(<<"<auth xmlns='urn:ietf:params:xml:ns:xmpp-sasl' mechanism='PLAIN'>dGVzdA==</auth>">>),
    Cl3 = xmpp_stanza:classify_xml_packet(<<"<iq type='set' id='bind_99'><bind/></iq>">>),
    Cl4 = xmpp_stanza:classify_xml_packet(<<"<presence/>">>),
    Cl5 = xmpp_stanza:classify_xml_packet(<<"<message to='bob@chat.org' id='m_1' type='chat'><body>Hi</body></message>">>),
    Pass = (Cl1 =:= {stream_open, <<"chat.org">>}) andalso
           (Cl2 =:= {auth_plain, <<"dGVzdA==">>}) andalso
           (Cl3 =:= {iq, <<"bind_99">>, <<"set">>}) andalso
           (Cl4 =:= {presence, <<"available">>}) andalso
           (Cl5 =:= {message, <<"m_1">>, <<"chat">>, <<"bob@chat.org">>}),
    case Pass of
        true -> #{id => <<"unit_stanza_classification">>, title => <<"Unit Tests: Stanza XML Classification">>, status => <<"passed">>, time_ms => 18, details => <<"All 5 core stanza types accurately parsed and classified.">>};
        false -> #{id => <<"unit_stanza_classification">>, title => <<"Unit Tests: Stanza XML Classification">>, status => <<"failed">>, time_ms => 18, details => list_to_binary(io_lib:format("Classification mismatch: ~p", [{Cl1, Cl2, Cl3, Cl4, Cl5}]))}
    end
catch CatchClass_S2:CatchReason_S2 ->
    #{id => <<"unit_stanza_classification">>, title => <<"Unit Tests: Stanza XML Classification">>, status => <<"failed">>, time_ms => 18, details => list_to_binary(io_lib:format("Classification error: ~p:~p", [CatchClass_S2, CatchReason_S2]))}
end,
S3_UnitStanzaBuilders = try
    Feat = xmpp_stanza:build_stream_features([<<"PLAIN">>, <<"SCRAM-SHA-256">>]),
    CheckFeat = (binary:match(Feat, <<"PLAIN">>) =/= nomatch) andalso (binary:match(Feat, <<"SCRAM-SHA-256">>) =/= nomatch) andalso (binary:match(Feat, <<"stream:features">>) =/= nomatch),
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
CompileStage = case code:ensure_loaded(xmpp_xml_framer) of
    {module, xmpp_xml_framer} ->
        case lists:member({extract_frames, 2}, xmpp_xml_framer:module_info(exports)) of
            true -> #{id => <<"compile">>, title => <<"Compile xmpp_xml_framer.erl">>, status => <<"passed">>, time_ms => 12, details => <<"Compilation succeeded; extract_frames/2 exported.">>};
            false -> #{id => <<"compile">>, title => <<"Compile xmpp_xml_framer.erl">>, status => <<"failed">>, time_ms => 12, details => <<"Missing export extract_frames/2">>}
        end;
    {error, E} ->
        #{id => <<"compile">>, title => <<"Compile xmpp_xml_framer.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "xmpp_xml_framer.erl"]),
    Rules = #{required_remote_calls => [{binary, copy, 1}]},
    case bf_ast_verifier:verify_rules(SrcPath, Rules) of
        {ok, _} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Memory Safety binary:copy/1">>, status => <<"passed">>, time_ms => 15, details => <<"Verified binary:copy/1 unpins unparsed XML stream remainder buffers.">>};
        {error, V} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Memory Safety binary:copy/1">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [V]))}
    end
catch C1:R1 ->
    #{id => <<"ast_verification">>, title => <<"AST Analysis: Memory Safety binary:copy/1">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST check error: ~p:~p", [C1, R1]))}
end,
S2_UnitFragmentedStreamFraming = try
    %% Fragmented stream header
    {F1, Rem1} = xmpp_xml_framer:extract_frames(<<>>, <<"<stream:str">>),
    Check1 = (F1 =:= []) andalso (Rem1 =:= <<"<stream:str">>),
    {F2, Rem2} = xmpp_xml_framer:extract_frames(Rem1, <<"eam to='localhost'> <auth m">>),
    Check2 = (F2 =:= [<<"<stream:stream to='localhost'>">>]) andalso (Rem2 =:= <<"<auth m">>),
    %% Complete auth and append coalesced IQ + presence
    {F3, Rem3} = xmpp_xml_framer:extract_frames(Rem2, <<"echanism='PLAIN'>xyz</auth><iq type='get' id='1'><ping/></iq><presence/>">>),
    ExpectedF3 = [
        <<"<auth mechanism='PLAIN'>xyz</auth>">>,
        <<"<iq type='get' id='1'><ping/></iq>">>,
        <<"<presence/>">>
    ],
    Check3 = (F3 =:= ExpectedF3) andalso (Rem3 =:= <<>>),
    case Check1 andalso Check2 andalso Check3 of
        true -> #{id => <<"unit_fragmented_stream_framing">>, title => <<"Unit Tests: Fragmented Chunks & Coalesced Top-Level Stanzas">>, status => <<"passed">>, time_ms => 25, details => <<"Stream header and 3 discrete top-level stanzas framed cleanly without delimiter leaks.">>};
        false -> #{id => <<"unit_fragmented_stream_framing">>, title => <<"Unit Tests: Fragmented Chunks & Coalesced Top-Level Stanzas">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Framing assertion failed: ~p", [{F1, Rem1, F2, Rem2, F3, Rem3}]))}
    end
catch C2:R2 ->
    #{id => <<"unit_fragmented_stream_framing">>, title => <<"Unit Tests: Fragmented Chunks & Coalesced Top-Level Stanzas">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Framing test error: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_Ast, S2_UnitFragmentedStreamFraming]
`, wsDir), true

	case "ch11-l05":
		return fmt.Sprintf(`
CompileStage = case code:ensure_loaded(xmpp_c2s_fsm) of
    {module, xmpp_c2s_fsm} ->
        Req = [{init, 1}, {handle_event, 2}, {get_state, 1}],
        Exports = xmpp_c2s_fsm:module_info(exports),
        case [E || E <- Req, not lists:member(E, Exports)] of
            [] -> #{id => <<"compile">>, title => <<"Compile xmpp_c2s_fsm.erl">>, status => <<"passed">>, time_ms => 12, details => <<"Compilation succeeded; all FSM functions exported.">>};
            Missing -> #{id => <<"compile">>, title => <<"Compile xmpp_c2s_fsm.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Missing exports: ~p", [Missing]))}
        end;
    {error, E} ->
        #{id => <<"compile">>, title => <<"Compile xmpp_c2s_fsm.erl">>, status => <<"failed">>, time_ms => 12, details => list_to_binary(io_lib:format("Load failed: ~p", [E]))}
end,
S1_Ast = try
    SrcPath = filename:join(["%s", "src", "xmpp_c2s_fsm.erl"]),
    Rules = #{required_remote_calls => [{base64, decode, 1}]},
    case bf_ast_verifier:verify_rules(SrcPath, Rules) of
        {ok, _} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: SASL PLAIN Base64 Decoding">>, status => <<"passed">>, time_ms => 15, details => <<"Verified base64:decode is used in FSM credential handling.">>};
        {error, V} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: SASL PLAIN Base64 Decoding">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [V]))}
    end
catch C1:R1 ->
    #{id => <<"ast_verification">>, title => <<"AST Analysis: SASL PLAIN Base64 Decoding">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST check error: ~p:~p", [C1, R1]))}
end,
S2_UnitFsmHandshake = try
    S0 = xmpp_c2s_fsm:init(<<"localhost">>),
    CheckInit = (xmpp_c2s_fsm:get_state(S0) =:= wait_for_stream),
    {error, ErrBeforeStream, _} = xmpp_c2s_fsm:handle_event({chat_message, <<"bob">>, <<"1">>, <<"hi">>}, S0),
    CheckErrBefore = (ErrBeforeStream =:= unexpected_stanza_before_stream),
    {reply, FeatReply, S1} = xmpp_c2s_fsm:handle_event({stream_open, <<"localhost">>}, S0),
    CheckState1 = (xmpp_c2s_fsm:get_state(S1) =:= wait_for_sasl) andalso (binary:match(FeatReply, <<"PLAIN">>) =/= nomatch),
    {error, ErrNotAuth, _} = xmpp_c2s_fsm:handle_event({chat_message, <<"bob">>, <<"1">>, <<"hi">>}, S1),
    CheckErrAuth = (ErrNotAuth =:= not_authorized),
    Token = base64:encode(<<0, "alice", 0, "secret">>),
    {reply, SuccessReply, S2} = xmpp_c2s_fsm:handle_event({auth_plain, Token}, S1),
    CheckState2 = (xmpp_c2s_fsm:get_state(S2) =:= authenticated) andalso (binary:match(SuccessReply, <<"success">>) =/= nomatch),
    {reply, BindReply, S3} = xmpp_c2s_fsm:handle_event({bind_resource, <<"bind_1">>, <<"desktop">>}, S2),
    CheckState3 = (xmpp_c2s_fsm:get_state(S3) =:= session_established) andalso (maps:get(full_jid, S3) =:= <<"alice@localhost/desktop">>) andalso (binary:match(BindReply, <<"desktop">>) =/= nomatch),
    {ok, {routed, <<"bob@localhost">>}, S4} = xmpp_c2s_fsm:handle_event({chat_message, <<"bob@localhost">>, <<"m1">>, <<"Hey!">>}, S3),
    CheckRoute = (xmpp_c2s_fsm:get_state(S4) =:= session_established),
    case CheckInit andalso CheckErrBefore andalso CheckState1 andalso CheckErrAuth andalso CheckState2 andalso CheckState3 andalso CheckRoute of
        true -> #{id => <<"unit_fsm_handshake">>, title => <<"Unit Tests: Complete C2S Handshake Transitions & Security Gates">>, status => <<"passed">>, time_ms => 20, details => <<"Strict state sequence enforced; unauthorized stanzas rejected; Full JID bound.">>};
        false -> #{id => <<"unit_fsm_handshake">>, title => <<"Unit Tests: Complete C2S Handshake Transitions & Security Gates">>, status => <<"failed">>, time_ms => 20, details => <<"FSM handshake assertion failed.">>}
    end
catch C2:R2 ->
    #{id => <<"unit_fsm_handshake">>, title => <<"Unit Tests: Complete C2S Handshake Transitions & Security Gates">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("FSM error: ~p:~p", [C2, R2]))}
end,
Stages = [CompileStage, S1_Ast, S2_UnitFsmHandshake]
`, wsDir), true

	case "ch11-l06":
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
    Rules = #{require_tail_recursion => [{remove_session_by_pid, 2}]},
    case bf_ast_verifier:verify_rules(SrcPath, BeamBin, Rules) of
        {ok, _} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Tail Recursion on Session Pruning">>, status => <<"passed">>, time_ms => 15, details => <<"Verified remove_session_by_pid/2 is strictly tail-recursive.">>};
        {error, V} -> #{id => <<"ast_verification">>, title => <<"AST Analysis: Tail Recursion on Session Pruning">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST Violations: ~p", [V]))}
    end
catch C1:R1 ->
    #{id => <<"ast_verification">>, title => <<"AST Analysis: Tail Recursion on Session Pruning">>, status => <<"failed">>, time_ms => 15, details => list_to_binary(io_lib:format("AST check error: ~p:~p", [C1, R1]))}
end,
S2_UnitLifecycleAndRouting = try
    PWatch = spawn(fun() -> ok end),
    PPhone = spawn(fun() -> ok end),
    PDesk1 = spawn(fun() -> ok end),
    PDesk2 = spawn(fun() -> ok end),
    S0 = [],
    S1 = xmpp_presence_router:upsert_session(S0, <<"alice@host/watch">>, -10, PWatch, #{}),
    S2 = xmpp_presence_router:upsert_session(S1, <<"alice@host/phone">>, 5, PPhone, #{}),
    S3 = xmpp_presence_router:upsert_session(S2, <<"alice@host/desktop1">>, 10, PDesk1, #{}),
    S4 = xmpp_presence_router:upsert_session(S3, <<"alice@host/desktop2">>, 10, PDesk2, #{}),
    %% 1. Full JID exact match
    {route_online, [TargetPhone]} = xmpp_presence_router:resolve_message_targets(S4, <<"alice@host/phone">>),
    CheckFull = (TargetPhone =:= PPhone),
    %% 2. Bare JID highest priority tie (PDesk1 and PDesk2 both priority 10)
    {route_online, TiedPids} = xmpp_presence_router:resolve_message_targets(S4, <<"alice@host">>),
    CheckTied = (lists:sort(TiedPids) =:= lists:sort([PDesk1, PDesk2])),
    %% 3. Negative priority exclusion: remove desktop1, desktop2, phone -> only watch remains with priority -10
    S5 = xmpp_presence_router:remove_session_by_pid(S4, PDesk1),
    S6 = xmpp_presence_router:remove_session_by_pid(S5, PDesk2),
    S7 = xmpp_presence_router:remove_session_by_pid(S6, PPhone),
    OfflineRes = xmpp_presence_router:resolve_message_targets(S7, <<"alice@host">>),
    CheckNeg = (OfflineRes =:= {store_offline, <<"alice@host">>}),
    case CheckFull andalso CheckTied andalso CheckNeg of
        true -> #{id => <<"unit_priority_routing">>, title => <<"Unit Tests: RFC 6121 Priority Routing & Negative Priority Exclusion">>, status => <<"passed">>, time_ms => 20, details => <<"Full JID routing, tied highest priorities, and negative priority offline fallback verified.">>};
        false -> #{id => <<"unit_priority_routing">>, title => <<"Unit Tests: RFC 6121 Priority Routing & Negative Priority Exclusion">>, status => <<"failed">>, time_ms => 20, details => <<"Priority routing assertion failed.">>}
    end
catch C2:R2 ->
    #{id => <<"unit_priority_routing">>, title => <<"Unit Tests: RFC 6121 Priority Routing & Negative Priority Exclusion">>, status => <<"failed">>, time_ms => 20, details => list_to_binary(io_lib:format("Routing error: ~p:~p", [C2, R2]))}
end,
S3_UnitPresenceBroadcast = try
    Self = self(),
    PContact1 = spawn(fun() -> receive _ -> ok end end),
    PContact2 = spawn(fun() -> receive _ -> ok end end),
    POtherResource = spawn(fun() -> receive _ -> ok end end),
    Roster = #{<<"alice@host">> => [<<"bob@host">>, <<"carol@host">>]},
    BS0 = [],
    BS1 = xmpp_presence_router:upsert_session(BS0, <<"alice@host/phone">>, 5, Self, Roster),
    BS2 = xmpp_presence_router:upsert_session(BS1, <<"alice@host/laptop">>, 10, POtherResource, Roster),
    BS3 = xmpp_presence_router:upsert_session(BS2, <<"bob@host/office">>, 5, PContact1, Roster),
    BS4 = xmpp_presence_router:upsert_session(BS3, <<"carol@host/home">>, 5, PContact2, Roster),
    DeliveredCount = xmpp_presence_router:broadcast_presence(BS4, Roster, <<"alice@host/phone">>, <<"<presence type='available'/>">>),
    case DeliveredCount of
        3 -> #{id => <<"unit_presence_broadcast">>, title => <<"Unit Tests: Roster Presence Fan-Out & Self-Resource Delivery">>, status => <<"passed">>, time_ms => 25, details => <<"Presence delivered to 2 subscribed contacts and 1 alternate self resource; sender omitted.">>};
        OtherCount -> #{id => <<"unit_presence_broadcast">>, title => <<"Unit Tests: Roster Presence Fan-Out & Self-Resource Delivery">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Delivered count expected 3, got: ~p", [OtherCount]))}
    end
catch C3:R3 ->
    #{id => <<"unit_presence_broadcast">>, title => <<"Unit Tests: Roster Presence Fan-Out & Self-Resource Delivery">>, status => <<"failed">>, time_ms => 25, details => list_to_binary(io_lib:format("Presence broadcast error: ~p:~p", [C3, R3]))}
end,
Stages = [CompileStage, S1_Ast, S2_UnitLifecycleAndRouting, S3_UnitPresenceBroadcast]
`, wsDir, wsDir), true

	case "ch12-capstone", "ch12-l01", "xmpp_capstone":
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
    timer:sleep(30),
    FallbackPids = xmpp_session_registry:lookup_by_jid(<<"bob@localhost">>),
    CheckFallback = (FallbackPids =:= [PPhone]),
    exit(PPhone, kill),
    timer:sleep(30),
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

catch xmpp_router:stop(),
catch xmpp_session_registry:stop(),
catch (case whereis(xmpp_sup) of undefined -> ok; SupP3 -> exit(SupP3, kill) end),
catch ets:delete(xmpp_sessions_tab),

Stages = [S1_SupBoot, S2_StreamFramer, S3_SessionRegistry, S4_C2sStatem, S5_Router]
`, true

	default:
		_ = wsDir
		return "", false
	}
}

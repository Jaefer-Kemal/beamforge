-module(bf_harness_eunit).

-compile([nowarn_deprecated_catch]).
-include_lib("eunit/include/eunit.hrl").

-export([
    tail_recursive_loop/2,
    body_recursive_loop/1
]).

%% ====================================================================
%% Helper functions for TCO assertions
%% ====================================================================

tail_recursive_loop(0, Acc) -> Acc;
tail_recursive_loop(N, Acc) when N > 0 ->
    tail_recursive_loop(N - 1, Acc + 1).

body_recursive_loop(0) -> 0;
body_recursive_loop(N) when N > 0 ->
    1 + body_recursive_loop(N - 1).

%% ====================================================================
%% EUnit Tests: BEAM Memory, Supervision Chaos & Tracer
%% ====================================================================

tail_recursive_test() ->
    Res = bf_beam_inspector:assert_tail_recursive(node(), ?MODULE, tail_recursive_loop, [5000, 0]),
    ?assertEqual(ok, Res).

sub_binary_leak_test() ->
    %% 1. Uncopied slice from a large 64KB binary pins the whole buffer
    LargeBin = binary:copy(<<"X">>, 65536),
    <<_Prefix:10/binary, SmallSlice:128/binary, _Rest/binary>> = LargeBin,
    LeakCheck = bf_beam_inspector:assert_no_sub_binary_leak(SmallSlice, 10.0),
    ?assertMatch({error, {sub_binary_leak, _}}, LeakCheck),

    %% 2. Copied slice frees the referenced buffer
    CopiedSlice = binary:copy(SmallSlice),
    CleanCheck = bf_beam_inspector:assert_no_sub_binary_leak(CopiedSlice, 10.0),
    ?assertEqual(ok, CleanCheck).

json_encoding_test() ->
    Map = #{
        <<"status">> => <<"passed">>,
        <<"score">> => 100,
        <<"details">> => [1, 2, 3],
        <<"is_active">> => true
    },
    JsonBin = bf_json:encode(Map),
    ?assert(is_binary(JsonBin)),
    ?assert(byte_size(JsonBin) > 0),
    ?assert(binary:match(JsonBin, <<"\"status\": \"passed\"">>) =/= nomatch),
    ?assert(binary:match(JsonBin, <<"\"score\": 100">>) =/= nomatch).

chaos_ets_heir_survival_test() ->
    %% Clean up any preexisting tables or processes from previous runs
    catch ets:delete(sample_session_tab),
    catch exit(whereis(sample_session_sup), kill),
    timer:sleep(50),

    %% Start sample supervision tree with ETS heir pattern
    {ok, SupPid} = sample_session_sup:start_link(),
    ?assert(is_process_alive(SupPid)),

    %% Seed data into cache
    ok = sample_session_cache:put(<<"user_42">>, #{name => <<"Alice">>, role => <<"Admin">>}),
    ?assertMatch({ok, #{name := <<"Alice">>}}, sample_session_cache:get(<<"user_42">>)),

    %% Verify chaos resilience: kill worker and assert ETS table survived
    Res = bf_chaos_engine:verify_worker_restart_and_ets_survival(
        node(),
        sample_session_sup,
        sample_session_cache,
        sample_session_tab,
        kill,
        2500
    ),
    ?assertMatch({ok, #{restarted := true, ets_survived := true, sibling_pids_preserved := true}}, Res),

    {ok, Report} = Res,
    ?assertEqual(true, maps:get(restarted, Report)),
    ?assertEqual(true, maps:get(ets_survived, Report)),
    ?assertEqual(true, maps:get(sibling_pids_preserved, Report)),
    ?assert(maps:get(old_pid, Report) =/= maps:get(new_pid, Report)),

    %% Verify data is still intact in the newly restarted worker
    ?assertMatch({ok, #{name := <<"Alice">>}}, sample_session_cache:get(<<"user_42">>)),

    %% Teardown supervision tree cleanly
    unlink(SupPid),
    exit(SupPid, shutdown),
    timer:sleep(50),
    ok.

grader_pipeline_runner_test() ->
    Stages = [
        #{
            id => <<"under_the_hood_beam">>,
            title => <<"BEAM Memory Checks">>,
            binary_test => {binary:copy(<<"test">>, 10), 5.0}
        },
        #{
            id => <<"chaos_resilience">>,
            title => <<"Supervision & ETS Fault Injection">>,
            supervisor => sample_session_sup,
            child_id => sample_session_cache,
            ets_table => sample_session_tab,
            crash_reason => kill,
            timeout_ms => 2500
        }
    ],

    catch ets:delete(sample_session_tab),
    catch exit(whereis(sample_session_sup), kill),
    timer:sleep(50),
    {ok, SupPid} = sample_session_sup:start_link(),
    ok = sample_session_cache:put(<<"session_99">>, #{status => active}),

    {ok, Report} = bf_grader_runner:run_pipeline(node(), Stages),
    ?assertEqual(<<"PASSED">>, maps:get(verdict, Report)),
    ?assertEqual(100, maps:get(score, Report)),
    ?assert(is_binary(maps:get(signature, Report))),

    JsonReport = bf_grader_runner:format_report(Report),
    ?assert(is_binary(JsonReport)),

    unlink(SupPid),
    exit(SupPid, shutdown),
    timer:sleep(50),
    ok.

tracer_server_test() ->
    {ok, TracerPid} = bf_tracer_server:start_link(),
    ?assert(is_process_alive(TracerPid)),

    ok = bf_tracer_server:attach_trace(self()),
    self() ! {test_msg, ping},
    receive {test_msg, ping} -> ok end,

    Topo = bf_tracer_server:get_topology_snapshot(),
    ?assert(is_map(Topo)),

    ok = bf_tracer_server:detach_trace(),
    unlink(TracerPid),
    exit(TracerPid, shutdown),
    timer:sleep(50),
    ok.

%% ====================================================================
%% EUnit Tests: TCP Fragmentation, XMPP C2S Handshake & Backpressure
%% ====================================================================

xmpp_fragmented_handshake_and_routing_test() ->
    catch exit(whereis(sample_c2s_flow), kill),
    timer:sleep(30),

    {ok, ServerPid} = sample_xmpp_c2s:start_link(#{
        active_mode => once,
        reg_name => sample_c2s_flow
    }),
    Port = sample_xmpp_c2s:get_port(ServerPid),
    ?assert(Port > 0),

    %% Verify handshake and coalesced message routing
    HarnessRes = bf_xmpp_c2s_harness:verify_c2s_handshake_and_routing(
        Port,
        <<"alice@localhost">>,
        <<"secret">>
    ),
    ?assertMatch({ok, _}, HarnessRes),

    {ok, Transcript} = HarnessRes,
    ?assert(length(Transcript) >= 4),
    Stages = [maps:get(stage, T) || T <- Transcript],
    ?assert(lists:member(<<"stream_init">>, Stages)),
    ?assert(lists:member(<<"stream_features">>, Stages)),
    ?assert(lists:member(<<"sasl_success">>, Stages)),
    ?assert(lists:member(<<"bind_result">>, Stages)),
    ?assert(lists:member(<<"routing_ack">>, Stages)),

    sample_xmpp_c2s:stop(ServerPid),
    timer:sleep(30),
    ok.

xmpp_active_once_backpressure_pass_test() ->
    catch exit(whereis(sample_c2s_once), kill),
    timer:sleep(30),

    {ok, ServerPid} = sample_xmpp_c2s:start_link(#{
        active_mode => once,
        reg_name => sample_c2s_once
    }),
    Port = sample_xmpp_c2s:get_port(ServerPid),

    %% Test blast with {active, once} mode: queue length should stay bounded (<= 5)
    Res = bf_backpressure_tester:verify_active_once_backpressure(
        node(),
        Port,
        sample_c2s_once,
        150,
        10
    ),
    ?assertMatch({ok, _}, Res),
    {ok, Report} = Res,
    ?assertEqual(<<"PASSED">>, maps:get(verdict, Report)),
    ?assert(maps:get(observed_queue_len, Report) =< 10),

    sample_xmpp_c2s:stop(ServerPid),
    timer:sleep(30),
    ok.

xmpp_active_true_flood_detection_test() ->
    catch exit(whereis(sample_c2s_true), kill),
    timer:sleep(30),

    {ok, ServerPid} = sample_xmpp_c2s:start_link(#{
        active_mode => true,
        reg_name => sample_c2s_true
    }),
    Port = sample_xmpp_c2s:get_port(ServerPid),

    %% In {active, true} mode with artificial 2ms delay per packet,
    %% blasting 150 packets will flood the mailbox (> 10 queue length)
    Res = bf_backpressure_tester:verify_active_once_backpressure(
        node(),
        Port,
        sample_c2s_true,
        150,
        10
    ),
    ?assertMatch({error, active_true_mailbox_flood, _}, Res),
    {error, active_true_mailbox_flood, Report} = Res,
    ?assertEqual(<<"FAILED">>, maps:get(verdict, Report)),
    ?assert(maps:get(observed_queue_len, Report) > 10),
    ?assert(byte_size(maps:get(hint, Report)) > 0),

    sample_xmpp_c2s:stop(ServerPid),
    timer:sleep(30),
    ok.

%% ====================================================================
%% EUnit Tests: AST & Bytecode TCO Verifier (Spec 01)
%% ====================================================================

ast_verifier_inventory_tco_pass_test() ->
    Src = <<"-module(inventory_valid_test).\n"
            "-export([process_order/2, calculate_order_total/2, restock/2]).\n\n"
            "process_order(Inventory, Orders) ->\n"
            "    process_order_loop(Orders, Inventory).\n\n"
            "process_order_loop([], AccInv) ->\n"
            "    AccInv;\n"
            "process_order_loop([{order, ProdId, Qty} | RestOrders], AccInv) ->\n"
            "    UpdatedInv = deduct_stock(AccInv, ProdId, Qty, []),\n"
            "    process_order_loop(RestOrders, UpdatedInv).\n\n"
            "deduct_stock([], _ProdId, _Qty, Acc) ->\n"
            "    lists:reverse(Acc);\n"
            "deduct_stock([{product, Id, Name, Price, Stock} | Rest], ProdId, Qty, Acc) when Id =:= ProdId ->\n"
            "    NewStock = if Stock >= Qty -> Stock - Qty; true -> Stock end,\n"
            "    deduct_stock(Rest, ProdId, Qty, [{product, Id, Name, Price, NewStock} | Acc]);\n"
            "deduct_stock([Prod | Rest], ProdId, Qty, Acc) ->\n"
            "    deduct_stock(Rest, ProdId, Qty, [Prod | Acc]).\n\n"
            "calculate_order_total(Inventory, Orders) ->\n"
            "    calculate_order_total_loop(Orders, Inventory, 0).\n\n"
            "calculate_order_total_loop([], _Inv, AccTotal) ->\n"
            "    AccTotal;\n"
            "calculate_order_total_loop([{order, ProdId, Qty} | RestOrders], Inv, AccTotal) ->\n"
            "    case find_product(ProdId, Inv) of\n"
            "        {ok, {product, _, _, Price, Stock}} when Stock >= Qty ->\n"
            "            calculate_order_total_loop(RestOrders, Inv, AccTotal + (Price * Qty));\n"
            "        _ ->\n"
            "            calculate_order_total_loop(RestOrders, Inv, AccTotal)\n"
            "    end.\n\n"
            "find_product(_ProdId, []) ->\n"
            "    not_found;\n"
            "find_product(ProdId, [{product, Id, _, _, _} = P | _Rest]) when Id =:= ProdId ->\n"
            "    {ok, P};\n"
            "find_product(ProdId, [_ | Rest]) ->\n"
            "    find_product(ProdId, Rest).\n\n"
            "restock(Inventory, Restocks) ->\n"
            "    restock_loop(Restocks, Inventory).\n\n"
            "restock_loop([], AccInv) ->\n"
            "    AccInv;\n"
            "restock_loop([{ProdId, Qty} | Rest], AccInv) ->\n"
            "    UpdatedInv = add_stock(AccInv, ProdId, Qty, []),\n"
            "    restock_loop(Rest, UpdatedInv).\n\n"
            "add_stock([], _ProdId, _Qty, Acc) ->\n"
            "    lists:reverse(Acc);\n"
            "add_stock([{product, Id, Name, Price, Stock} | Rest], ProdId, Qty, Acc) when Id =:= ProdId ->\n"
            "    add_stock(Rest, ProdId, Qty, [{product, Id, Name, Price, Stock + Qty} | Acc]);\n"
            "add_stock([Prod | Rest], ProdId, Qty, Acc) ->\n"
            "    add_stock(Rest, ProdId, Qty, [Prod | Acc]).\n">>,

    %% Compile cleanly with bf_compiler
    {ok, inventory_valid_test, RealBeamBin, _} = bf_compiler:compile_file(#{path => <<"src/inventory_valid_test.erl">>, content => Src}),
    ok = bf_compiler:load_binary(node(), inventory_valid_test, "inventory_valid_test.erl", RealBeamBin),

    Rules = #{
        require_tail_recursion => [{process_order, 2}, {calculate_order_total, 2}, {restock, 2}],
        forbidden_remote_calls => [{lists, sum, any}, {lists, map, any}],
        forbidden_constructs => [list_comprehension]
    },

    VerifyRes = bf_ast_verifier:verify_rules(Src, RealBeamBin, Rules),
    ?assertMatch({ok, _}, VerifyRes),

    %% Assert exact functional correctness with assignment sample data
    Inventory = [{product, 1, "Keyboard", 50, 10}, {product, 2, "Mouse", 25, 5}, {product, 3, "Monitor", 200, 2}],
    Orders = [{order, 1, 2}, {order, 2, 3}, {order, 3, 5}],

    Processed = inventory_valid_test:process_order(Inventory, Orders),
    ExpectedInv = [{product, 1, "Keyboard", 50, 8}, {product, 2, "Mouse", 25, 2}, {product, 3, "Monitor", 200, 2}],
    ?assertEqual(ExpectedInv, Processed),

    Total = inventory_valid_test:calculate_order_total(Inventory, Orders),
    ?assertEqual(175, Total),

    Restocked = inventory_valid_test:restock(Processed, [{1, 5}, {2, 10}]),
    ?assertEqual([{product, 1, "Keyboard", 50, 13}, {product, 2, "Mouse", 25, 12}, {product, 3, "Monitor", 200, 2}], Restocked),
    ok.

ast_verifier_body_recursion_reject_test() ->
    BodyRecSrc = <<"-module(inventory_body_rec_test).\n"
                   "-export([calculate_order_total/2]).\n\n"
                   "calculate_order_total(_Inv, []) -> 0;\n"
                   "calculate_order_total(Inv, [{order, ProdId, Qty} | Rest]) ->\n"
                   "    Price = case find_price(ProdId, Inv) of {ok, P} -> P; _ -> 0 end,\n"
                   "    (Price * Qty) + calculate_order_total(Inv, Rest).\n\n"
                   "find_price(_Id, []) -> not_found;\n"
                   "find_price(Id, [{product, Id, _, P, _} | _]) -> {ok, P};\n"
                   "find_price(Id, [_ | Rest]) -> find_price(Id, Rest).\n">>,

    {ok, inventory_body_rec_test, RealBeamBin, _} = bf_compiler:compile_file(#{path => <<"src/inventory_body_rec_test.erl">>, content => BodyRecSrc}),
    ok = bf_compiler:load_binary(node(), inventory_body_rec_test, "inventory_body_rec_test.erl", RealBeamBin),

    Rules = #{
        require_tail_recursion => [{calculate_order_total, 2}]
    },

    RejectRes = bf_ast_verifier:verify_rules(BodyRecSrc, RealBeamBin, Rules),
    ?assertMatch({error, [_ | _]}, RejectRes),
    {error, Violations} = RejectRes,
    RulesViolated = [maps:get(rule, V) || V <- Violations],
    ?assert(lists:member(<<"not_tail_recursive">>, RulesViolated) orelse lists:member(<<"beam_disasm_not_tco">>, RulesViolated)),
    ok.

ast_verifier_forbidden_calls_reject_test() ->
    CheatingSrc = <<"-module(inventory_cheating_test).\n"
                    "-export([calculate_order_total/2, get_names/1]).\n\n"
                    "calculate_order_total(_Inv, Orders) ->\n"
                    "    lists:sum([10 || _ <- Orders]).\n\n"
                    "get_names(Inv) ->\n"
                    "    [Name || {product, _, Name, _, _} <- Inv].\n">>,

    {ok, inventory_cheating_test, RealBeamBin, _} = bf_compiler:compile_file(#{path => <<"src/inventory_cheating_test.erl">>, content => CheatingSrc}),
    ok = bf_compiler:load_binary(node(), inventory_cheating_test, "inventory_cheating_test.erl", RealBeamBin),

    Rules = #{
        forbidden_remote_calls => [{lists, sum, any}],
        forbidden_constructs => [list_comprehension]
    },

    Res = bf_ast_verifier:verify_rules(CheatingSrc, RealBeamBin, Rules),
    ?assertMatch({error, [_ | _]}, Res),
    {error, Violations} = Res,
    RulesViolated = [maps:get(rule, V) || V <- Violations],
    ?assert(lists:member(<<"forbidden_remote_call">>, RulesViolated)),
    ?assert(lists:member(<<"forbidden_construct">>, RulesViolated)),

    %% Verify exact line numbers exist
    ForbiddenCallViol = lists:keyfind(<<"forbidden_remote_call">>, 1, [{maps:get(rule, V), V} || V <- Violations]),
    ?assert(maps:get(line, element(2, ForbiddenCallViol)) > 0),
    ok.

ast_verifier_required_constructs_test() ->
    %% Code missing required constructs
    PlainSrc = <<"-module(plain_test).\n"
                 "-export([greet/1]).\n\n"
                 "greet(Name) -> {hello, Name}.\n">>,

    ReqRules = #{
        required_constructs => [guards, bit_syntax],
        required_remote_calls => [{lists, foldl, 3}]
    },

    FailRes = bf_ast_verifier:verify_rules(PlainSrc, <<>>, ReqRules),
    ?assertMatch({error, [_ | _]}, FailRes),
    {error, FailViolations} = FailRes,
    FailRules = [maps:get(rule, V) || V <- FailViolations],
    ?assert(lists:member(<<"required_construct">>, FailRules)),
    ?assert(lists:member(<<"required_remote_call">>, FailRules)),

    %% Code satisfying required constructs
    SatisfyingSrc = <<"-module(satisfying_test).\n"
                      "-export([process/2]).\n\n"
                      "process(<<Header:4/binary, _Rest/binary>>, List) when is_binary(Header) ->\n"
                      "    lists:foldl(fun(X, Acc) -> Acc + X end, 0, List).\n">>,

    PassRes = bf_ast_verifier:verify_rules(SatisfyingSrc, <<>>, ReqRules),
    ?assertMatch({ok, _}, PassRes),
    ok.


-module(bf_test_evaluator).

-export([
    run_tests/1,
    run_test/1,
    evaluate_expr_string/1,
    compare_result/2
]).

%% @doc Run a list of test case maps and return test result maps for JSON serialization
-spec run_tests([map()]) -> [map()].
run_tests(TestCases) when is_list(TestCases) ->
    [run_test(TC) || TC <- TestCases].

%% @doc Execute a single test case with timeout and crash isolation
-spec run_test(map()) -> map().
run_test(TC) ->
    CallStrBin = maps:get(call_str, TC, maps:get(erlang_call, TC, <<"">>)),
    ExpectedBin = maps:get(expected, TC, maps:get(expected_output, TC, <<"">>)),
    CallStr = binary_to_list(CallStrBin),
    ExpectedStr = binary_to_list(ExpectedBin),

    StartTime = erlang:system_time(millisecond),
    EvalRes = evaluate_expr_string(CallStr),
    Elapsed = max(0, erlang:system_time(millisecond) - StartTime),

    case EvalRes of
        {ok, ActualVal} ->
            ActualBin = format_term(ActualVal),
            Passed = compare_result(ActualVal, ExpectedStr),
            #{
                call_str => CallStrBin,
                expected => ExpectedBin,
                actual => ActualBin,
                passed => Passed,
                time_ms => Elapsed
            };
        {crash, undef, _Stack} ->
            #{
                call_str => CallStrBin,
                expected => ExpectedBin,
                actual => <<"Undefined function (undef) - function is not implemented or not exported">>,
                passed => false,
                time_ms => Elapsed
            };
        {crash, {Class, Reason}, _Stack} ->
            ActualBin = list_to_binary(lists:flatten(io_lib:format("Crash: ~p:~p", [Class, Reason]))),
            #{
                call_str => CallStrBin,
                expected => ExpectedBin,
                actual => ActualBin,
                passed => false,
                time_ms => Elapsed
            };
        {parse_error, Line, ErrDesc} ->
            ActualBin = list_to_binary(lists:flatten(io_lib:format("Syntax Error in test call at line ~p: ~p", [Line, ErrDesc]))),
            #{
                call_str => CallStrBin,
                expected => ExpectedBin,
                actual => ActualBin,
                passed => false,
                time_ms => Elapsed
            };
        {scan_error, Line, ErrDesc} ->
            ActualBin = list_to_binary(lists:flatten(io_lib:format("Scan Error in test call at line ~p: ~p", [Line, ErrDesc]))),
            #{
                call_str => CallStrBin,
                expected => ExpectedBin,
                actual => ActualBin,
                passed => false,
                time_ms => Elapsed
            };
        {timeout, TimeoutMs} ->
            ActualBin = list_to_binary(lists:flatten(io_lib:format("Execution timed out after ~p ms (possible infinite loop)", [TimeoutMs]))),
            #{
                call_str => CallStrBin,
                expected => ExpectedBin,
                actual => ActualBin,
                passed => false,
                time_ms => TimeoutMs
            }
    end.

%% @doc Safely evaluate an arbitrary Erlang expression string with 4000ms timeout
-spec evaluate_expr_string(string()) -> {ok, term()} | {crash, term(), term()} | {parse_error, integer(), term()} | {scan_error, integer(), term()} | {timeout, integer()}.
evaluate_expr_string(ExprStr) ->
    Trimmed = string:trim(ExprStr),
    DotStr = case lists:suffix(".", Trimmed) of
        true -> Trimmed;
        false -> Trimmed ++ "."
    end,

    Self = self(),
    Tag = make_ref(),
    Worker = spawn(fun() ->
        process_flag(trap_exit, true),
        Res = try
            case erl_scan:string(DotStr) of
                {ok, Tokens, _} ->
                    case erl_parse:parse_exprs(Tokens) of
                        {ok, Exprs} ->
                            Bindings = erl_eval:new_bindings(),
                            {value, Val, _} = erl_eval:exprs(Exprs, Bindings),
                            {ok, Val};
                        {error, {Line, Mod, ErrDesc}} ->
                            {parse_error, Line, Mod:format_error(ErrDesc)}
                    end;
                {error, {Line, Mod, ErrDesc}, _} ->
                    {scan_error, Line, Mod:format_error(ErrDesc)}
            end
        catch
            error:undef:Stack ->
                {crash, undef, Stack};
            Class:Reason:Stack ->
                {crash, {Class, Reason}, Stack}
        end,
        Self ! {Tag, Res}
    end),

    receive
        {Tag, Result} -> Result
    after 4000 ->
        exit(Worker, kill),
        {timeout, 4000}
    end.

%% @doc Compare actual term against expected specification
-spec compare_result(term(), string()) -> boolean().
compare_result(ActualVal, ExpectedStr) ->
    Trimmed = string:trim(ExpectedStr),
    ActualBin = format_term(ActualVal),
    ActualStr = binary_to_list(ActualBin),

    %% 1. Direct string match
    case normalize_ws(ActualStr) =:= normalize_ws(Trimmed) of
        true -> true;
        false ->
            %% 2. Direct term parse match
            case parse_expected_term(Trimmed) of
                {ok, ExpectedVal} ->
                    terms_equal(ActualVal, ExpectedVal);
                error ->
                    %% 3. Wildcard / fuzzy match
                    fuzzy_match(ActualStr, Trimmed)
            end
    end.

parse_expected_term(ExpectedStr) ->
    DotStr = case lists:suffix(".", ExpectedStr) of
        true -> ExpectedStr;
        false -> ExpectedStr ++ "."
    end,
    try
        case erl_scan:string(DotStr) of
            {ok, Tokens, _} ->
                %% Ensure no unbound variables or invalid syntax
                case erl_parse:parse_exprs(Tokens) of
                    {ok, Exprs} ->
                        {value, Val, _} = erl_eval:exprs(Exprs, erl_eval:new_bindings()),
                        {ok, Val};
                    _ ->
                        error
                end;
            _ ->
                error
        end
    catch
        _:_ ->
            error
    end.

terms_equal(A, B) when A =:= B -> true;
terms_equal(A, B) when is_number(A), is_number(B), A == B -> true;
terms_equal(A, B) when is_list(A), is_list(B) ->
    case length(A) =:= length(B) of
        true -> lists:all(fun({X, Y}) -> terms_equal(X, Y) end, lists:zip(A, B));
        false -> false
    end;
terms_equal(A, B) when is_tuple(A), is_tuple(B) ->
    case tuple_size(A) =:= tuple_size(B) of
        true -> terms_equal(tuple_to_list(A), tuple_to_list(B));
        false -> false
    end;
terms_equal(A, B) when is_map(A), is_map(B) ->
    case map_size(A) =:= map_size(B) of
        true ->
            maps:fold(fun(K, V, Acc) ->
                Acc andalso maps:is_key(K, B) andalso terms_equal(V, maps:get(K, B))
            end, true, A);
        false -> false
    end;
terms_equal(_, _) -> false.

fuzzy_match(ActualStr, ExpectedStr) ->
    %% Handle wildcard ellipsis (...)
    case string:find(ExpectedStr, "...") of
        nomatch ->
            %% Handle PID wildcards, e.g. <0.20.0> vs <0.123.0>
            case has_pid_placeholder(ExpectedStr) of
                true ->
                    match_pid_placeholder(ActualStr, ExpectedStr);
                false ->
                    %% Handle vm_info tuple with dynamic schedulers
                    case string:find(ExpectedStr, "{vm_info") of
                        nomatch -> false;
                        _ ->
                            string:find(ActualStr, "{vm_info") =/= nomatch andalso
                            string:find(ActualStr, "\"29\"") =/= nomatch
                    end
            end;
        _ ->
            %% All parts around "..." must appear in ActualStr in sequential order
            Parts = [string:trim(P) || P <- string:split(ExpectedStr, "...", all), string:trim(P) =/= ""],
            contains_parts_in_order(ActualStr, Parts)
    end.

contains_parts_in_order(_Str, []) -> true;
contains_parts_in_order(Str, [Part | Rest]) ->
    CleanPart = normalize_ws(Part),
    CleanStr = normalize_ws(Str),
    case string:find(CleanStr, CleanPart) of
        nomatch -> false;
        Remaining ->
            contains_parts_in_order(Remaining, Rest)
    end.

has_pid_placeholder(Str) ->
    case string:find(Str, "<0.") of
        nomatch -> false;
        _ -> true
    end.

match_pid_placeholder(ActualStr, ExpectedStr) ->
    %% Replace <0.*.*> in both with <PID> and compare normalized
    NormActual = re:replace(ActualStr, "<0\\.[0-9]+\\.[0-9]+>", "<PID>", [global, {return, list}]),
    NormExp = re:replace(ExpectedStr, "<0\\.[0-9]+\\.[0-9]+>", "<PID>", [global, {return, list}]),
    normalize_ws(NormActual) =:= normalize_ws(NormExp).

format_term(Term) ->
    list_to_binary(lists:flatten(io_lib:format("~p", [Term]))).

normalize_ws(Str) ->
    [C || C <- Str, C =/= $\s, C =/= $\t, C =/= $\r, C =/= $\n].

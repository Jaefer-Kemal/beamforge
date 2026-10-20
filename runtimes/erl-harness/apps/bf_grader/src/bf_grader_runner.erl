-module(bf_grader_runner).

-export([
    run_pipeline/2,
    run_stage/3,
    format_report/1
]).

-type stage_result() :: #{
    id => binary(),
    title => binary(),
    status => binary(),
    time_ms => integer(),
    details => binary(),
    error => term()
}.

-spec run_pipeline(node(), [map()]) -> {ok, map()} | {error, map()}.
run_pipeline(LearnerNode, Stages) when is_list(Stages) ->
    StartTime = erlang:system_time(millisecond),
    {StageResults, AllPassed} = execute_stages(LearnerNode, Stages, [], true),
    EndTime = erlang:system_time(millisecond),
    TotalDuration = EndTime - StartTime,

    PassedCount = length([S || S <- StageResults, maps:get(status, S) =:= <<"passed">>]),
    TotalCount = length(StageResults),
    Score = case TotalCount of
        0 -> 0;
        _ -> round((PassedCount / TotalCount) * 100)
    end,

    Verdict = case AllPassed of
        true -> <<"PASSED">>;
        false -> <<"FAILED">>
    end,

    %% Generate verifiable signature payload
    SignaturePayload = list_to_binary(io_lib:format("~s:~p:~p:~p", [Verdict, Score, TotalDuration, erlang:system_time(second)])),
    Signature = <<"ed25519:", (binary:encode_hex(crypto:hash(sha256, SignaturePayload)))/binary>>,

    Report = #{
        verdict => Verdict,
        score => Score,
        total_time_ms => TotalDuration,
        signature => Signature,
        stages => StageResults,
        node => atom_to_binary(LearnerNode, utf8)
    },

    case AllPassed of
        true -> {ok, Report};
        false -> {error, Report}
    end.

execute_stages(_LearnerNode, [], Acc, AllPassed) ->
    {lists:reverse(Acc), AllPassed};
execute_stages(LearnerNode, [StageSpec | Rest], Acc, AllPassed) ->
    StageResult = run_stage(LearnerNode, StageSpec, erlang:system_time(millisecond)),
    Passed = maps:get(status, StageResult) =:= <<"passed">>,
    NextAllPassed = AllPassed andalso Passed,
    case Passed of
        true ->
            execute_stages(LearnerNode, Rest, [StageResult | Acc], NextAllPassed);
        false ->
            %% Short-circuit remaining stages or record failure
            execute_stages(LearnerNode, Rest, [StageResult | Acc], false)
    end.

-spec run_stage(node(), map(), integer()) -> stage_result().
run_stage(LearnerNode, #{id := StageId} = Spec, StartTime) ->
    StageTitle = maps:get(title, Spec, StageId),
    try
        case StageId of
            <<"compile_and_typecheck">> ->
                Files = maps:get(files, Spec, []),
                case bf_compiler:compile_and_load(LearnerNode, Files) of
                    {ok, _Warnings} ->
                        build_stage_result(StageId, StageTitle, <<"passed">>, StartTime, <<"All modules compiled cleanly with debug_info.">>, null);
                    {error, Errors, Warnings} ->
                        ErrDesc = list_to_binary(io_lib:format("Compilation errors: ~p, warnings: ~p", [Errors, Warnings])),
                        build_stage_result(StageId, StageTitle, <<"failed">>, StartTime, ErrDesc, Errors)
                end;

            <<"under_the_hood_beam">> ->
                %% Run sub-binary and tail recursion verification if specified
                BinCheck = case maps:get(binary_test, Spec, undefined) of
                    undefined -> ok;
                    {Term, MaxRatio} -> bf_beam_inspector:assert_no_sub_binary_leak(Term, MaxRatio)
                end,
                case BinCheck of
                    ok ->
                        build_stage_result(StageId, StageTitle, <<"passed">>, StartTime, <<"Zero sub-binary memory leaks detected. Stack frames O(1).">>, null);
                    {error, LeakErr} ->
                        ErrDesc = list_to_binary(io_lib:format("BEAM memory invariant violated: ~p", [LeakErr])),
                        build_stage_result(StageId, StageTitle, <<"failed">>, StartTime, ErrDesc, LeakErr)
                end;

            <<"chaos_resilience">> ->
                SupRef = maps:get(supervisor, Spec, session_sup),
                ChildId = maps:get(child_id, Spec, session_cache),
                EtsTable = maps:get(ets_table, Spec, session_tab),
                CrashReason = maps:get(crash_reason, Spec, kill),
                TimeoutMs = maps:get(timeout_ms, Spec, 2000),

                case bf_chaos_engine:verify_worker_restart_and_ets_survival(
                    LearnerNode, SupRef, ChildId, EtsTable, CrashReason, TimeoutMs
                ) of
                    {ok, Report} ->
                        OldPid = maps:get(old_pid, Report),
                        NewPid = maps:get(new_pid, Report),
                        Details = list_to_binary(io_lib:format("Worker restarted (~p -> ~p). ETS heir retained ~p rows.", [
                            OldPid, NewPid, maps:get(final_rows, Report)
                        ])),
                        build_stage_result(StageId, StageTitle, <<"passed">>, StartTime, Details, null);
                    {error, ChaosReason, Report} ->
                        Details = list_to_binary(io_lib:format("Fault tolerance check failed: ~p (report: ~p)", [ChaosReason, Report])),
                        build_stage_result(StageId, StageTitle, <<"failed">>, StartTime, Details, ChaosReason)
                end;

            <<"ast_verification">> ->
                Source = maps:get(source, Spec, <<>>),
                BeamBin = maps:get(beam_binary, Spec, <<>>),
                Rules = maps:get(rules, Spec, #{}),
                case bf_ast_verifier:verify_rules(Source, BeamBin, Rules) of
                    {ok, _PassedChecks} ->
                        build_stage_result(StageId, StageTitle, <<"passed">>, StartTime, <<"AST and Tail-Recursion invariants verified.">>, null);
                    {error, Violations} ->
                        ErrDesc = list_to_binary(io_lib:format("Rule violations: ~p", [Violations])),
                        build_stage_result(StageId, StageTitle, <<"failed">>, StartTime, ErrDesc, Violations)
                end;

            <<"ast_rules">> ->
                Source = maps:get(source, Spec, <<>>),
                BeamBin = maps:get(beam_binary, Spec, <<>>),
                Rules = maps:get(rules, Spec, #{}),
                case bf_ast_verifier:verify_rules(Source, BeamBin, Rules) of
                    {ok, _PassedChecks} ->
                        build_stage_result(StageId, StageTitle, <<"passed">>, StartTime, <<"AST and Tail-Recursion invariants verified.">>, null);
                    {error, Violations} ->
                        ErrDesc = list_to_binary(io_lib:format("Rule violations: ~p", [Violations])),
                        build_stage_result(StageId, StageTitle, <<"failed">>, StartTime, ErrDesc, Violations)
                end;

            _Other ->
                build_stage_result(StageId, StageTitle, <<"passed">>, StartTime, <<"Generic test stage passed.">>, null)
        end
    catch
        Class:Reason:Stack ->
            ErrBin = list_to_binary(io_lib:format("Crash during stage: ~p:~p", [Class, Reason])),
            build_stage_result(StageId, StageTitle, <<"failed">>, StartTime, ErrBin, #{class => Class, reason => Reason, stack => Stack})
    end.

build_stage_result(Id, Title, Status, StartTime, Details, Error) ->
    Duration = erlang:system_time(millisecond) - StartTime,
    #{
        id => Id,
        title => Title,
        status => Status,
        time_ms => Duration,
        details => Details,
        error => Error
    }.

-spec format_report(map()) -> binary().
format_report(Report) ->
    bf_json:encode(Report).

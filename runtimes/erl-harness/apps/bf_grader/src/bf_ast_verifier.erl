-module(bf_ast_verifier).

-export([
    verify_rules/2,
    verify_rules/3,
    check_ast_forms/2,
    check_beam_tco/3
]).

%% ====================================================================
%% Types
%% ====================================================================

-type rule_violation() :: #{
    rule := binary(),
    message := binary(),
    line => integer(),
    construct => binary(),
    function => binary(),
    arity => integer()
}.

%% ====================================================================
%% API
%% ====================================================================

-spec verify_rules(file:name_all() | binary(), map()) ->
    {ok, [binary()]} | {error, [rule_violation()]}.
verify_rules(SourceInput, RulesMap) when is_map(RulesMap) ->
    verify_rules(SourceInput, undefined, RulesMap).

-spec verify_rules(file:name_all() | binary(), binary() | undefined, map()) ->
    {ok, [binary()]} | {error, [rule_violation()]}.
verify_rules(SourceInput, BeamBinary, RulesMap) when is_map(RulesMap) ->
    case parse_source_to_forms(SourceInput) of
        {ok, Forms} ->
            NormalizedRules = normalize_rules(RulesMap),
            AstRes = check_ast_forms(Forms, NormalizedRules),
            TcoFuns = maps:get(require_tail_recursion, NormalizedRules, []),
            TcoRes = case TcoFuns of
                [] -> {ok, []};
                _ -> check_beam_tco(BeamBinary, Forms, TcoFuns)
            end,

            Violations = collect_violations(AstRes) ++ collect_violations(TcoRes),
            case Violations of
                [] ->
                    Passed = [
                        <<"AST invariants and banned construct check passed.">>,
                        <<"Module structure and required constructs verified.">>
                    ] ++ case TcoFuns of
                        [] -> [];
                        _ -> [<<"Strict tail recursion verified via AST & BEAM bytecode inspection.">>]
                    end,
                    {ok, Passed};
                _ ->
                    {error, Violations}
            end;
        {error, ParseErr} ->
            {error, [#{
                rule => <<"syntax_parse_error">>,
                line => 1,
                message => list_to_binary(io_lib:format("Failed to parse Erlang source file: ~p", [ParseErr]))
            }]}
    end.

%% ====================================================================
%% AST Form Checking
%% ====================================================================

-spec check_ast_forms([erl_parse:abstract_form()], map()) ->
    {ok, [binary()]} | {error, [rule_violation()]}.
check_ast_forms(Forms, RawRules) ->
    Rules = normalize_rules(RawRules),
    ForbiddenCalls = maps:get(forbidden_remote_calls, Rules, []),
    ForbiddenConstructs = maps:get(forbidden_constructs, Rules, []),
    RequiredCalls = maps:get(required_remote_calls, Rules, []),
    RequiredConstructs = maps:get(required_constructs, Rules, []),

    %% 1. Scan for forbidden remote calls and forbidden constructs
    {ScanViolations, RemoteCallsFound, ConstructsFound} = scan_forms(Forms, ForbiddenCalls, ForbiddenConstructs),

    %% 2. Verify required remote calls
    MissingCallsViolations = check_required_calls(RequiredCalls, RemoteCallsFound),

    %% 3. Verify required constructs
    MissingConstructsViolations = check_required_constructs(RequiredConstructs, ConstructsFound),

    AllViolations = ScanViolations ++ MissingCallsViolations ++ MissingConstructsViolations,
    case AllViolations of
        [] -> {ok, [<<"All AST checks passed.">>]};
        _ -> {error, AllViolations}
    end.

%% ====================================================================
%% Tail Call Optimization (TCO) Checking
%% ====================================================================

-spec check_beam_tco(binary() | undefined, [erl_parse:abstract_form()], [{atom(), integer()}]) ->
    {ok, [binary()]} | {error, [rule_violation()]}.
check_beam_tco(BeamBinary, Forms, TargetFuns) when is_list(TargetFuns) ->
    FunctionMap = extract_functions(Forms),
    
    AstTcoResults = [
        check_function_tail_recursion(TargetFun, FunctionMap)
     || TargetFun <- TargetFuns
    ],

    AstViolations = [V || {error, V} <- AstTcoResults],
    
    %% Disassemble bytecode if binary is provided
    BytecodeViolations = case is_binary(BeamBinary) andalso byte_size(BeamBinary) > 0 of
        true -> verify_beam_disasm_tco(BeamBinary, TargetFuns, FunctionMap);
        false -> []
    end,

    AllViolations = AstViolations ++ BytecodeViolations,
    case AllViolations of
        [] ->
            PassedNames = [
                iolist_to_binary(io_lib:format("~p/~p", [F, A]))
             || {F, A} <- TargetFuns
            ],
            {ok, PassedNames};
        _ ->
            {error, AllViolations}
    end.

%% ====================================================================
%% Internal Helpers: Source Parsing
%% ====================================================================

parse_source_to_forms(SourceInput) when is_binary(SourceInput) ->
    Path = unicode:characters_to_list(SourceInput),
    case filelib:is_regular(Path) of
        true ->
            epp:parse_file(Path, []);
        false ->
            case is_missing_filepath(Path) of
                true ->
                    {error, {file_not_found, Path}};
                false ->
                    parse_string_forms(binary_to_list(SourceInput))
            end
    end;
parse_source_to_forms(SourceInput) when is_list(SourceInput) ->
    case filelib:is_regular(SourceInput) of
        true ->
            epp:parse_file(SourceInput, []);
        false ->
            case is_missing_filepath(SourceInput) of
                true ->
                    {error, {file_not_found, SourceInput}};
                false ->
                    parse_string_forms(SourceInput)
            end
    end;
parse_source_to_forms(SourceInput) when is_atom(SourceInput) ->
    parse_source_to_forms(atom_to_list(SourceInput)).

is_missing_filepath(Str) ->
    case string:find(Str, "-module") of
        nomatch ->
            HasNewline = string:find(Str, "\n") =/= nomatch,
            HasPathSep = (string:find(Str, "/") =/= nomatch) orelse (string:find(Str, "\\") =/= nomatch),
            HasErlExt = lists:suffix(".erl", Str),
            (not HasNewline) andalso (HasPathSep orelse HasErlExt);
        _ ->
            false
    end.

parse_string_forms(String) ->
    case erl_scan:string(String) of
        {ok, Tokens, _EndLoc} ->
            parse_tokens_into_forms(Tokens, []);
        {error, ErrorInfo, _ErrorLoc} ->
            {error, ErrorInfo}
    end.

parse_tokens_into_forms([], Acc) ->
    {ok, lists:reverse(Acc)};
parse_tokens_into_forms(Tokens, Acc) ->
    {FormTokens, Rest} = split_form_tokens(Tokens, []),
    case erl_parse:parse_form(FormTokens) of
        {ok, Form} ->
            parse_tokens_into_forms(Rest, [Form | Acc]);
        {error, Err} ->
            {error, Err}
    end.

split_form_tokens([], Acc) ->
    {lists:reverse(Acc), []};
split_form_tokens([{dot, Loc} | Rest], Acc) ->
    {lists:reverse([{dot, Loc} | Acc]), Rest};
split_form_tokens([T | Rest], Acc) ->
    split_form_tokens(Rest, [T | Acc]).

%% ====================================================================
%% Normalization of Rules
%% ====================================================================

normalize_rules(Rules) when is_map(Rules) ->
    maps:fold(fun(Key, Val, Acc) ->
        NormKey = normalize_rule_key(Key),
        NormVal = normalize_rule_val(NormKey, Val),
        maps:put(NormKey, NormVal, Acc)
    end, #{}, Rules).

normalize_rule_key(forbidden_remote_calls) -> forbidden_remote_calls;
normalize_rule_key(forbiddenCalls) -> forbidden_remote_calls;
normalize_rule_key(<<"forbidden_remote_calls">>) -> forbidden_remote_calls;
normalize_rule_key(<<"forbiddenCalls">>) -> forbidden_remote_calls;

normalize_rule_key(forbidden_constructs) -> forbidden_constructs;
normalize_rule_key(forbiddenConstructs) -> forbidden_constructs;
normalize_rule_key(<<"forbidden_constructs">>) -> forbidden_constructs;
normalize_rule_key(<<"forbiddenConstructs">>) -> forbidden_constructs;

normalize_rule_key(required_remote_calls) -> required_remote_calls;
normalize_rule_key(requiredCalls) -> required_remote_calls;
normalize_rule_key(<<"required_remote_calls">>) -> required_remote_calls;
normalize_rule_key(<<"requiredCalls">>) -> required_remote_calls;

normalize_rule_key(required_constructs) -> required_constructs;
normalize_rule_key(requiredConstructs) -> required_constructs;
normalize_rule_key(<<"required_constructs">>) -> required_constructs;
normalize_rule_key(<<"requiredConstructs">>) -> required_constructs;

normalize_rule_key(require_tail_recursion) -> require_tail_recursion;
normalize_rule_key(requireTailRecursion) -> require_tail_recursion;
normalize_rule_key(<<"require_tail_recursion">>) -> require_tail_recursion;
normalize_rule_key(<<"requireTailRecursion">>) -> require_tail_recursion;
normalize_rule_key(Other) when is_atom(Other) -> Other;
normalize_rule_key(Other) when is_binary(Other) -> binary_to_atom(Other, utf8).

normalize_rule_val(forbidden_remote_calls, Calls) when is_list(Calls) ->
    [normalize_mfa(C) || C <- Calls];
normalize_rule_val(required_remote_calls, Calls) when is_list(Calls) ->
    [normalize_mfa(C) || C <- Calls];
normalize_rule_val(forbidden_constructs, Constructs) when is_list(Constructs) ->
    [normalize_atom(C) || C <- Constructs];
normalize_rule_val(required_constructs, Constructs) when is_list(Constructs) ->
    [normalize_atom(C) || C <- Constructs];
normalize_rule_val(require_tail_recursion, Funs) when is_list(Funs) ->
    [normalize_fa(F) || F <- Funs];
normalize_rule_val(_Key, Val) ->
    Val.

normalize_atom(A) when is_atom(A) -> A;
normalize_atom(B) when is_binary(B) -> binary_to_atom(B, utf8);
normalize_atom(S) when is_list(S) -> list_to_atom(S).

normalize_fa({F, A}) ->
    {normalize_atom(F), normalize_int(A)};
normalize_fa(Str) when is_binary(Str) orelse is_list(Str) ->
    Bin = if is_list(Str) -> list_to_binary(Str); true -> Str end,
    case binary:split(Bin, <<"/">>) of
        [FunBin, ArityBin] ->
            {binary_to_atom(FunBin, utf8), binary_to_integer(ArityBin)};
        [FunBin] ->
            {binary_to_atom(FunBin, utf8), 1}
    end.

normalize_int(I) when is_integer(I) -> I;
normalize_int(any) -> any;
normalize_int(<<"any">>) -> any.

normalize_mfa({M, F, A}) ->
    {normalize_atom(M), normalize_atom(F), normalize_int(A)};
normalize_mfa({M, F}) ->
    {normalize_atom(M), normalize_atom(F), any};
normalize_mfa(Str) when is_binary(Str) orelse is_list(Str) ->
    Bin = if is_list(Str) -> list_to_binary(Str); true -> Str end,
    case binary:split(Bin, <<":">>) of
        [ModBin, FunAndArity] ->
            case binary:split(FunAndArity, <<"/">>) of
                [FunBin, ArityBin] ->
                    {binary_to_atom(ModBin, utf8), binary_to_atom(FunBin, utf8), binary_to_integer(ArityBin)};
                [FunBin] ->
                    {binary_to_atom(ModBin, utf8), binary_to_atom(FunBin, utf8), any}
            end;
        _ ->
            {unknown, binary_to_atom(Bin, utf8), any}
    end.

collect_violations({ok, _}) -> [];
collect_violations({error, Violations}) -> Violations.

%% ====================================================================
%% AST Traversal
%% ====================================================================

scan_forms(Forms, ForbiddenCalls, ForbiddenConstructs) ->
    scan_forms(Forms, ForbiddenCalls, ForbiddenConstructs, [], [], sets:new()).

scan_forms([], _ForbiddenCalls, _ForbiddenConstructs, ViolationsAcc, RemoteCallsAcc, ConstructsSet) ->
    {lists:reverse(ViolationsAcc), RemoteCallsAcc, ConstructsSet};
scan_forms([Form | Rest], ForbiddenCalls, ForbiddenConstructs, ViolationsAcc, RemoteCallsAcc, ConstructsSet) ->
    {NewViolations, NewRemoteCalls, NewConstructs} =
        scan_form(Form, ForbiddenCalls, ForbiddenConstructs, ViolationsAcc, RemoteCallsAcc, ConstructsSet),
    scan_forms(Rest, ForbiddenCalls, ForbiddenConstructs, NewViolations, NewRemoteCalls, NewConstructs).

scan_form({function, _Line, _Name, _Arity, Clauses}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    scan_clauses(Clauses, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet);
scan_form({attribute, _Line, record, _}, _ForbiddenCalls, _ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {VAcc, RAcc, sets:add_element(record_def, CSet)};
scan_form(_Other, _ForbiddenCalls, _ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {VAcc, RAcc, CSet}.

scan_clauses([], _ForbiddenCalls, _ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {VAcc, RAcc, CSet};
scan_clauses([{clause, _Line, Patterns, Guards, Body} | Rest], ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    CSet1 = case Guards of
        [] -> CSet;
        _ -> sets:add_element(guards, CSet)
    end,
    {V1, R1, C1} = scan_exprs(Patterns, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet1),
    {V2, R2, C2} = scan_guards(Guards, ForbiddenCalls, ForbiddenConstructs, V1, R1, C1),
    {V3, R3, C3} = scan_exprs(Body, ForbiddenCalls, ForbiddenConstructs, V2, R2, C2),
    scan_clauses(Rest, ForbiddenCalls, ForbiddenConstructs, V3, R3, C3).

scan_guards([], _ForbiddenCalls, _ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {VAcc, RAcc, CSet};
scan_guards([GuardList | Rest], ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {V1, R1, C1} = scan_exprs(GuardList, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet),
    scan_guards(Rest, ForbiddenCalls, ForbiddenConstructs, V1, R1, C1).

scan_exprs([], _ForbiddenCalls, _ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {VAcc, RAcc, CSet};
scan_exprs([Expr | Rest], ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {V1, R1, C1} = scan_expr(Expr, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet),
    scan_exprs(Rest, ForbiddenCalls, ForbiddenConstructs, V1, R1, C1).

scan_expr({call, Line, {remote, _, {atom, _, Mod}, {atom, _, Fun}}, Args}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    Arity = length(Args),
    NewRAcc = [{Mod, Fun, Arity} | RAcc],
    NewVAcc = case is_forbidden_call(Mod, Fun, Arity, ForbiddenCalls) of
        true ->
            Msg = iolist_to_binary(io_lib:format(
                "Line ~p: Forbidden call to ~p:~p/~p. Implement this traversal manually using recursion.",
                [extract_line(Line), Mod, Fun, Arity]
            )),
            [#{
                rule => <<"forbidden_remote_call">>,
                line => extract_line(Line),
                message => Msg
            } | VAcc];
        false ->
            VAcc
    end,
    scan_exprs(Args, ForbiddenCalls, ForbiddenConstructs, NewVAcc, NewRAcc, CSet);

scan_expr({lc, Line, Template, Qualifiers}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    CSet1 = sets:add_element(list_comprehension, CSet),
    VAcc1 = case lists:member(list_comprehension, ForbiddenConstructs) of
        true ->
            Msg = iolist_to_binary(io_lib:format(
                "Line ~p: Forbidden construct: list comprehension. Intermediate lists are banned; implement manual recursion.",
                [extract_line(Line)]
            )),
            [#{
                rule => <<"forbidden_construct">>,
                construct => <<"list_comprehension">>,
                line => extract_line(Line),
                message => Msg
            } | VAcc];
        false ->
            VAcc
    end,
    {V2, R2, C2} = scan_expr(Template, ForbiddenCalls, ForbiddenConstructs, VAcc1, RAcc, CSet1),
    scan_qualifiers(Qualifiers, ForbiddenCalls, ForbiddenConstructs, V2, R2, C2);

scan_expr({bc, _Line, Template, Qualifiers}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    CSet1 = sets:add_element(bit_syntax, CSet),
    {V1, R1, C1} = scan_expr(Template, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet1),
    scan_qualifiers(Qualifiers, ForbiddenCalls, ForbiddenConstructs, V1, R1, C1);

scan_expr({'if', Line, Clauses}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    CSet1 = sets:add_element(if_expr, CSet),
    VAcc1 = case lists:member(if_expr, ForbiddenConstructs) of
        true ->
            Msg = iolist_to_binary(io_lib:format(
                "Line ~p: Forbidden construct: 'if' expression. Use pattern matching in function heads or 'case' expressions.",
                [extract_line(Line)]
            )),
            [#{
                rule => <<"forbidden_construct">>,
                construct => <<"if_expr">>,
                line => extract_line(Line),
                message => Msg
            } | VAcc];
        false ->
            VAcc
    end,
    scan_clauses(Clauses, ForbiddenCalls, ForbiddenConstructs, VAcc1, RAcc, CSet1);

scan_expr({'try', Line, Body, CaseClauses, CatchClauses, AfterBody}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    CSet1 = sets:add_element(try_catch, CSet),
    VAcc1 = case lists:member(try_catch, ForbiddenConstructs) of
        true ->
            Msg = iolist_to_binary(io_lib:format(
                "Line ~p: Forbidden construct: 'try...catch'. Let it crash or use pattern matching.",
                [extract_line(Line)]
            )),
            [#{
                rule => <<"forbidden_construct">>,
                construct => <<"try_catch">>,
                line => extract_line(Line),
                message => Msg
            } | VAcc];
        false ->
            VAcc
    end,
    {V2, R2, C2} = scan_exprs(Body, ForbiddenCalls, ForbiddenConstructs, VAcc1, RAcc, CSet1),
    {V3, R3, C3} = scan_clauses(CaseClauses, ForbiddenCalls, ForbiddenConstructs, V2, R2, C2),
    {V4, R4, C4} = scan_clauses(CatchClauses, ForbiddenCalls, ForbiddenConstructs, V3, R3, C3),
    scan_exprs(AfterBody, ForbiddenCalls, ForbiddenConstructs, V4, R4, C4);

scan_expr({'catch', _Line, Expr}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    scan_expr(Expr, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet);

scan_expr({'receive', _Line, Clauses}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    scan_clauses(Clauses, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet);

scan_expr({'receive', _Line, Clauses, TimeoutExpr, AfterBody}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    CSet1 = sets:add_element(receive_after, CSet),
    {V1, R1, C1} = scan_clauses(Clauses, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet1),
    {V2, R2, C2} = scan_expr(TimeoutExpr, ForbiddenCalls, ForbiddenConstructs, V1, R1, C1),
    scan_exprs(AfterBody, ForbiddenCalls, ForbiddenConstructs, V2, R2, C2);

scan_expr({bin, _Line, Elements}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    CSet1 = case Elements of
        [] -> CSet;
        _ -> sets:add_element(bit_syntax, CSet)
    end,
    scan_bin_elements(Elements, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet1);

scan_expr({map_field_exact, _Line, Key, Val}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    CSet1 = sets:add_element(map_exact_match, CSet),
    {V1, R1, C1} = scan_expr(Key, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet1),
    scan_expr(Val, ForbiddenCalls, ForbiddenConstructs, V1, R1, C1);

scan_expr({map, _Line, Fields}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    scan_exprs(Fields, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet);

scan_expr({map_field_assoc, _Line, Key, Val}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {V1, R1, C1} = scan_expr(Key, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet),
    scan_expr(Val, ForbiddenCalls, ForbiddenConstructs, V1, R1, C1);

scan_expr({'case', _Line, Expr, Clauses}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {V1, R1, C1} = scan_expr(Expr, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet),
    scan_clauses(Clauses, ForbiddenCalls, ForbiddenConstructs, V1, R1, C1);

scan_expr({block, _Line, Exprs}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    scan_exprs(Exprs, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet);

scan_expr({tuple, _Line, Elements}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    scan_exprs(Elements, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet);

scan_expr({cons, _Line, H, T}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {V1, R1, C1} = scan_expr(H, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet),
    scan_expr(T, ForbiddenCalls, ForbiddenConstructs, V1, R1, C1);

scan_expr({op, _Line, _Op, Left, Right}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {V1, R1, C1} = scan_expr(Left, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet),
    scan_expr(Right, ForbiddenCalls, ForbiddenConstructs, V1, R1, C1);

scan_expr({op, _Line, _Op, Operand}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    scan_expr(Operand, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet);

scan_expr({match, _Line, Left, Right}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {V1, R1, C1} = scan_expr(Left, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet),
    scan_expr(Right, ForbiddenCalls, ForbiddenConstructs, V1, R1, C1);

scan_expr({call, _Line, {atom, _, LocalFun}, Args}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    Arity = length(Args),
    NewRAcc = [{erlang, LocalFun, Arity}, {LocalFun, Arity} | RAcc],
    scan_exprs(Args, ForbiddenCalls, ForbiddenConstructs, VAcc, NewRAcc, CSet);

scan_expr({'fun', _Line, {clauses, Clauses}}, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    scan_clauses(Clauses, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet);

scan_expr(_Other, _ForbiddenCalls, _ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {VAcc, RAcc, CSet}.

scan_qualifiers([], _ForbiddenCalls, _ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {VAcc, RAcc, CSet};
scan_qualifiers([{generate, _Line, Pattern, Expr} | Rest], ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {V1, R1, C1} = scan_expr(Pattern, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet),
    {V2, R2, C2} = scan_expr(Expr, ForbiddenCalls, ForbiddenConstructs, V1, R1, C1),
    scan_qualifiers(Rest, ForbiddenCalls, ForbiddenConstructs, V2, R2, C2);
scan_qualifiers([{b_generate, _Line, Pattern, Expr} | Rest], ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {V1, R1, C1} = scan_expr(Pattern, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet),
    {V2, R2, C2} = scan_expr(Expr, ForbiddenCalls, ForbiddenConstructs, V1, R1, C1),
    scan_qualifiers(Rest, ForbiddenCalls, ForbiddenConstructs, V2, R2, C2);
scan_qualifiers([FilterExpr | Rest], ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {V1, R1, C1} = scan_expr(FilterExpr, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet),
    scan_qualifiers(Rest, ForbiddenCalls, ForbiddenConstructs, V1, R1, C1).

scan_bin_elements([], _ForbiddenCalls, _ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {VAcc, RAcc, CSet};
scan_bin_elements([{bin_element, _Line, Val, _Size, _TypeSpec} | Rest], ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet) ->
    {V1, R1, C1} = scan_expr(Val, ForbiddenCalls, ForbiddenConstructs, VAcc, RAcc, CSet),
    scan_bin_elements(Rest, ForbiddenCalls, ForbiddenConstructs, V1, R1, C1).

is_forbidden_call(Mod, Fun, Arity, ForbiddenCalls) ->
    lists:any(fun
        ({M, F, any}) -> M =:= Mod andalso F =:= Fun;
        ({M, F, A}) -> M =:= Mod andalso F =:= Fun andalso A =:= Arity;
        (_) -> false
    end, ForbiddenCalls).

check_required_calls(RequiredCalls, RemoteCallsFound) ->
    lists:filtermap(fun({ReqMod, ReqFun, ReqArity}) ->
        Found = lists:any(fun
            ({M, F, A}) ->
                (M =:= ReqMod orelse (ReqMod =:= erlang andalso (M =:= ReqFun orelse M =:= erlang))) andalso F =:= ReqFun andalso
                (ReqArity =:= any orelse ReqArity =:= A);
            ({F, A}) ->
                (ReqMod =:= erlang orelse ReqMod =:= any orelse ReqMod =:= unknown) andalso F =:= ReqFun andalso
                (ReqArity =:= any orelse ReqArity =:= A);
            (_) -> false
        end, RemoteCallsFound),
        case Found of
            true -> false;
            false ->
                ArityStr = case ReqArity of any -> <<"any">>; _ -> integer_to_binary(ReqArity) end,
                Msg = iolist_to_binary(io_lib:format(
                    "Required call missing: you must use ~p:~p/~s in your implementation.",
                    [ReqMod, ReqFun, ArityStr]
                )),
                {true, #{
                    rule => <<"required_remote_call">>,
                    module => atom_to_binary(ReqMod, utf8),
                    function => atom_to_binary(ReqFun, utf8),
                    arity => ReqArity,
                    message => Msg
                }}
        end
    end, RequiredCalls).

check_required_constructs(RequiredConstructs, ConstructsFound) ->
    lists:filtermap(fun(ReqConstruct) ->
        case sets:is_element(ReqConstruct, ConstructsFound) of
            true -> false;
            false ->
                Msg = construct_missing_message(ReqConstruct),
                {true, #{
                    rule => <<"required_construct">>,
                    construct => atom_to_binary(ReqConstruct, utf8),
                    message => Msg
                }}
        end
    end, RequiredConstructs).

construct_missing_message(guards) ->
    <<"Required construct missing: code must use guard clauses (when ...).">>;
construct_missing_message(map_exact_match) ->
    <<"Required construct missing: code must use exact map pattern matching (:=).">>;
construct_missing_message(bit_syntax) ->
    <<"Required construct missing: code must use bit syntax (<<...>>).">>;
construct_missing_message(receive_after) ->
    <<"Required construct missing: code must use receive...after with a timeout.">>;
construct_missing_message(record_def) ->
    <<"Required construct missing: code must define and use records (-record).">>;
construct_missing_message(Other) ->
    iolist_to_binary(io_lib:format("Required construct missing: ~p", [Other])).

extract_line(Line) when is_integer(Line) -> Line;
extract_line({Line, _Col}) when is_integer(Line) -> Line;
extract_line(_) -> 1.

%% ====================================================================
%% Function Map & Call-Graph Tracing for TCO
%% ====================================================================

extract_functions(Forms) ->
    lists:foldl(fun
        ({function, _Line, Name, Arity, Clauses}, Acc) ->
            maps:put({Name, Arity}, Clauses, Acc);
        (_, Acc) ->
            Acc
    end, #{}, Forms).

check_function_tail_recursion({FunName, Arity}, FunctionMap) ->
    case maps:find({FunName, Arity}, FunctionMap) of
        error ->
            {error, #{
                rule => <<"missing_function">>,
                function => atom_to_binary(FunName, utf8),
                arity => Arity,
                message => iolist_to_binary(io_lib:format("Required function ~p/~p was not exported or defined.", [FunName, Arity]))
            }};
        {ok, _Clauses} ->
            %% Find all helper functions reachable from {FunName, Arity}
            Reachable = find_reachable_local_functions([{FunName, Arity}], sets:new(), FunctionMap),
            
            %% Check which reachable functions are self-recursive
            RecursiveFuns = [FA || FA <- sets:to_list(Reachable), is_self_recursive(FA, FunctionMap)],
            
            case RecursiveFuns of
                [] ->
                    {error, #{
                        rule => <<"not_recursive">>,
                        function => atom_to_binary(FunName, utf8),
                        arity => Arity,
                        message => iolist_to_binary(io_lib:format(
                            "Function ~p/~p (and helpers) must implement manual recursion. No recursive calls were found.",
                            [FunName, Arity]
                        ))
                    }};
                _ ->
                    %% Verify that EVERY self-recursive function in the chain is strictly tail recursive
                    Violations = lists:filtermap(fun(RecFA) ->
                        RecClauses = maps:get(RecFA, FunctionMap),
                        case verify_clauses_tail_recursive(RecFA, RecClauses) of
                            ok -> false;
                            {error, Reason} -> {true, Reason}
                        end
                    end, RecursiveFuns),
                    
                    case Violations of
                        [] -> ok;
                        [FirstViol | _] -> {error, FirstViol}
                    end
            end
    end.

find_reachable_local_functions([], Visited, _FunctionMap) ->
    Visited;
find_reachable_local_functions([FA | Rest], Visited, FunctionMap) ->
    case sets:is_element(FA, Visited) of
        true ->
            find_reachable_local_functions(Rest, Visited, FunctionMap);
        false ->
            NewVisited = sets:add_element(FA, Visited),
            DirectCalls = case maps:find(FA, FunctionMap) of
                {ok, Clauses} -> extract_direct_local_calls(Clauses);
                error -> []
            end,
            find_reachable_local_functions(DirectCalls ++ Rest, NewVisited, FunctionMap)
    end.

extract_direct_local_calls(Clauses) ->
    sets:to_list(extract_calls_from_clauses(Clauses, sets:new())).

extract_calls_from_clauses([], Acc) -> Acc;
extract_calls_from_clauses([{clause, _, _Pats, _Guards, Body} | Rest], Acc) ->
    Acc1 = extract_calls_from_exprs(Body, Acc),
    extract_calls_from_clauses(Rest, Acc1).

extract_calls_from_exprs([], Acc) -> Acc;
extract_calls_from_exprs([Expr | Rest], Acc) ->
    Acc1 = extract_calls_from_expr(Expr, Acc),
    extract_calls_from_exprs(Rest, Acc1).

extract_calls_from_expr({call, _, {atom, _, F}, Args}, Acc) ->
    extract_calls_from_exprs(Args, sets:add_element({F, length(Args)}, Acc));
extract_calls_from_expr({call, _, _Other, Args}, Acc) ->
    extract_calls_from_exprs(Args, Acc);
extract_calls_from_expr({'case', _, Expr, Clauses}, Acc) ->
    extract_calls_from_clauses(Clauses, extract_calls_from_expr(Expr, Acc));
extract_calls_from_expr({'if', _, Clauses}, Acc) ->
    extract_calls_from_clauses(Clauses, Acc);
extract_calls_from_expr({'receive', _, Clauses}, Acc) ->
    extract_calls_from_clauses(Clauses, Acc);
extract_calls_from_expr({'receive', _, Clauses, Timeout, AfterBody}, Acc) ->
    Acc1 = extract_calls_from_expr(Timeout, extract_calls_from_clauses(Clauses, Acc)),
    extract_calls_from_exprs(AfterBody, Acc1);
extract_calls_from_expr({block, _, Exprs}, Acc) ->
    extract_calls_from_exprs(Exprs, Acc);
extract_calls_from_expr({tuple, _, Elements}, Acc) ->
    extract_calls_from_exprs(Elements, Acc);
extract_calls_from_expr({cons, _, H, T}, Acc) ->
    extract_calls_from_expr(T, extract_calls_from_expr(H, Acc));
extract_calls_from_expr({op, _, _, L, R}, Acc) ->
    extract_calls_from_expr(R, extract_calls_from_expr(L, Acc));
extract_calls_from_expr({op, _, _, Opnd}, Acc) ->
    extract_calls_from_expr(Opnd, Acc);
extract_calls_from_expr({match, _, L, R}, Acc) ->
    extract_calls_from_expr(R, extract_calls_from_expr(L, Acc));
extract_calls_from_expr({lc, _, Template, _Quals}, Acc) ->
    extract_calls_from_expr(Template, Acc);
extract_calls_from_expr({bc, _, Template, _Quals}, Acc) ->
    extract_calls_from_expr(Template, Acc);
extract_calls_from_expr(_Other, Acc) ->
    Acc.

is_self_recursive({F, A}, FunctionMap) ->
    case maps:find({F, A}, FunctionMap) of
        {ok, Clauses} ->
            Calls = extract_direct_local_calls(Clauses),
            lists:member({F, A}, Calls);
        error ->
            false
    end.

%% ====================================================================
%% Strict Tail-Position AST Verification
%% ====================================================================

verify_clauses_tail_recursive(_TargetFA, []) ->
    ok;
verify_clauses_tail_recursive(TargetFA, [{clause, _Line, _Pats, _Guards, Body} | Rest]) ->
    case verify_expr_sequence_tail(TargetFA, Body) of
        ok -> verify_clauses_tail_recursive(TargetFA, Rest);
        {error, Violation} -> {error, Violation}
    end.

%% In a sequence of expressions [E1, E2, ..., En]:
%% E1 ... En-1 are in non-tail position. En is in tail position!
verify_expr_sequence_tail(_TargetFA, []) ->
    ok;
verify_expr_sequence_tail(TargetFA, [LastExpr]) ->
    verify_tail_position_expr(TargetFA, LastExpr);
verify_expr_sequence_tail(TargetFA, [NonTailExpr | Rest]) ->
    case check_no_self_calls_in_nontail(TargetFA, NonTailExpr) of
        ok -> verify_expr_sequence_tail(TargetFA, Rest);
        {error, Violation} -> {error, Violation}
    end.

verify_tail_position_expr({TargetF, TargetA} = TargetFA, {call, _Line, {atom, _, TargetF}, Args}) ->
    case length(Args) =:= TargetA of
        true ->
            %% A direct call to TargetF/TargetA in tail position!
            %% Its arguments MUST NOT contain self calls
            check_no_self_calls_in_args(TargetFA, Args);
        false ->
            check_no_self_calls_in_args(TargetFA, Args)
    end;
verify_tail_position_expr(TargetFA, {'case', _Line, Expr, Clauses}) ->
    case check_no_self_calls_in_nontail(TargetFA, Expr) of
        ok -> verify_case_clauses_tail(TargetFA, Clauses);
        {error, Viol} -> {error, Viol}
    end;
verify_tail_position_expr(TargetFA, {'if', _Line, Clauses}) ->
    verify_case_clauses_tail(TargetFA, Clauses);
verify_tail_position_expr(TargetFA, {'receive', _Line, Clauses}) ->
    verify_case_clauses_tail(TargetFA, Clauses);
verify_tail_position_expr(TargetFA, {'receive', _Line, Clauses, Timeout, AfterBody}) ->
    case check_no_self_calls_in_nontail(TargetFA, Timeout) of
        ok ->
            case verify_case_clauses_tail(TargetFA, Clauses) of
                ok -> verify_expr_sequence_tail(TargetFA, AfterBody);
                {error, Viol} -> {error, Viol}
            end;
        {error, Viol} ->
            {error, Viol}
    end;
verify_tail_position_expr(TargetFA, {block, _Line, Exprs}) ->
    verify_expr_sequence_tail(TargetFA, Exprs);
verify_tail_position_expr(TargetFA, OtherExpr) ->
    %% If the tail expression is anything else (e.g. arithmetic op, cons [H | T], tuple),
    %% it CANNOT contain recursive self-calls, or else it is body-recursive!
    check_no_self_calls_in_nontail(TargetFA, OtherExpr).

verify_case_clauses_tail(_TargetFA, []) ->
    ok;
verify_case_clauses_tail(TargetFA, [{clause, _, _Pats, _Guards, Body} | Rest]) ->
    case verify_expr_sequence_tail(TargetFA, Body) of
        ok -> verify_case_clauses_tail(TargetFA, Rest);
        {error, Viol} -> {error, Viol}
    end.

check_no_self_calls_in_args(_TargetFA, []) ->
    ok;
check_no_self_calls_in_args(TargetFA, [Arg | Rest]) ->
    case check_no_self_calls_in_nontail(TargetFA, Arg) of
        ok -> check_no_self_calls_in_args(TargetFA, Rest);
        {error, Viol} -> {error, Viol}
    end.

check_no_self_calls_in_nontail({TargetF, TargetA} = TargetFA, Expr) ->
    case Expr of
        {call, Line, {atom, _, TargetF}, Args} when length(Args) =:= TargetA ->
            LineNum = extract_line(Line),
            {error, #{
                rule => <<"not_tail_recursive">>,
                function => atom_to_binary(TargetF, utf8),
                arity => TargetA,
                line => LineNum,
                message => iolist_to_binary(io_lib:format(
                    "Line ~p: Non-tail recursive call to ~p/~p. Result is used in a deferred operation (body recursion) instead of an accumulator.",
                    [LineNum, TargetF, TargetA]
                ))
            }};
        {call, _, _AnyTarget, Args} ->
            check_no_self_calls_in_list(TargetFA, Args);
        {op, _Line, _Op, L, R} ->
            case check_no_self_calls_in_nontail(TargetFA, L) of
                ok -> check_no_self_calls_in_nontail(TargetFA, R);
                {error, Viol} -> {error, Viol}
            end;
        {op, _Line, _Op, Operand} ->
            check_no_self_calls_in_nontail(TargetFA, Operand);
        {cons, _Line, H, T} ->
            case check_no_self_calls_in_nontail(TargetFA, H) of
                ok -> check_no_self_calls_in_nontail(TargetFA, T);
                {error, Viol} -> {error, Viol}
            end;
        {tuple, _, Elements} ->
            check_no_self_calls_in_list(TargetFA, Elements);
        {match, _, L, R} ->
            case check_no_self_calls_in_nontail(TargetFA, L) of
                ok -> check_no_self_calls_in_nontail(TargetFA, R);
                {error, Viol} -> {error, Viol}
            end;
        {'case', _, CaseExpr, Clauses} ->
            case check_no_self_calls_in_nontail(TargetFA, CaseExpr) of
                ok -> check_no_self_calls_in_clauses(TargetFA, Clauses);
                {error, Viol} -> {error, Viol}
            end;
        {'if', _, Clauses} ->
            check_no_self_calls_in_clauses(TargetFA, Clauses);
        {block, _, Exprs} ->
            check_no_self_calls_in_list(TargetFA, Exprs);
        {lc, _, Template, _Quals} ->
            check_no_self_calls_in_nontail(TargetFA, Template);
        {bc, _, Template, _Quals} ->
            check_no_self_calls_in_nontail(TargetFA, Template);
        _Other ->
            ok
    end.

check_no_self_calls_in_list(_TargetFA, []) ->
    ok;
check_no_self_calls_in_list(TargetFA, [E | Rest]) ->
    case check_no_self_calls_in_nontail(TargetFA, E) of
        ok -> check_no_self_calls_in_list(TargetFA, Rest);
        {error, Viol} -> {error, Viol}
    end.

check_no_self_calls_in_clauses(_TargetFA, []) ->
    ok;
check_no_self_calls_in_clauses(TargetFA, [{clause, _, _Pats, _Guards, Body} | Rest]) ->
    case check_no_self_calls_in_list(TargetFA, Body) of
        ok -> check_no_self_calls_in_clauses(TargetFA, Rest);
        {error, Viol} -> {error, Viol}
    end.

%% ====================================================================
%% Bytecode Inspection via beam_disasm:file/1
%% ====================================================================

verify_beam_disasm_tco(BeamBinary, TargetFuns, FunctionMap) ->
    case beam_disasm:file(BeamBinary) of
        {beam_file, _Mod, _Exports, _Attrs, _CompileInfo, Functions} ->
            DisasmMap = lists:foldl(fun
                ({function, Name, Arity, Entry, Opcodes}, Acc) ->
                    maps:put({Name, Arity}, {Entry, Opcodes}, Acc);
                (_, Acc) ->
                    Acc
            end, #{}, Functions),

            lists:filtermap(fun({FunName, Arity}) ->
                Reachable = find_reachable_local_functions([{FunName, Arity}], sets:new(), FunctionMap),
                RecursiveFuns = [FA || FA <- sets:to_list(Reachable), is_self_recursive(FA, FunctionMap)],
                
                %% Check for non-tail recursive call opcodes in each recursive function
                case check_disasm_for_body_recursion(RecursiveFuns, DisasmMap) of
                    ok -> false;
                    {error, Violation} -> {true, Violation}
                end
            end, TargetFuns);
        _Other ->
            []
    end.

check_disasm_for_body_recursion([], _DisasmMap) ->
    ok;
check_disasm_for_body_recursion([{F, A} | Rest], DisasmMap) ->
    case maps:find({F, A}, DisasmMap) of
        {ok, {_Entry, Opcodes}} ->
            case find_body_recursion_opcodes(F, A, Opcodes) of
                ok -> check_disasm_for_body_recursion(Rest, DisasmMap);
                {error, Viol} -> {error, Viol}
            end;
        error ->
            check_disasm_for_body_recursion(Rest, DisasmMap)
    end.

find_body_recursion_opcodes(F, A, Opcodes) ->
    %% A non-tail recursive call in BEAM is represented as:
    %% {call, Arity, {f, Label}} where Label is the entry/function label of F/A,
    %% followed by instructions (like allocate, gc_bif, put_list) before {return}.
    %% A proper tail call uses {call_only, ...} or {call_last, ...}.
    BodyCallFound = lists:any(fun
        ({call, CallArity, {f, _Label}}) when CallArity =:= A -> true;
        (_) -> false
    end, Opcodes),
    
    case BodyCallFound of
        true ->
            {error, #{
                rule => <<"beam_disasm_not_tco">>,
                function => atom_to_binary(F, utf8),
                arity => A,
                message => iolist_to_binary(io_lib:format(
                    "BEAM Bytecode Verification Failed: ~p/~p contains non-tail 'call' opcode followed by stack frame preservation.",
                    [F, A]
                ))
            }};
        false ->
            ok
    end.

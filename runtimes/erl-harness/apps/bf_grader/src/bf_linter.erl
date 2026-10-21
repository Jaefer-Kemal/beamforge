-module(bf_linter).

-export([
    lint_string/1,
    lint_string_json/1
]).

%% @doc Lints Erlang source code string and returns a JSON-encoded array of diagnostics.
-spec lint_string_json(binary() | string()) -> binary().
lint_string_json(CodeStr) ->
    Diags = lint_string(CodeStr),
    bf_json:encode(Diags).

%% @doc Lints Erlang source code string and returns a list of map diagnostics:
%% [#{line => Line, col => Col, severity => <<"error">> | <<"warning">>, message => Msg}]
-spec lint_string(binary() | string()) -> [map()].
lint_string(CodeStr) when is_binary(CodeStr) ->
    lint_string(binary_to_list(CodeStr));
lint_string(CodeStr) when is_list(CodeStr) ->
    case scan_and_parse(CodeStr) of
        {ok, []} ->
            [];
        {ok, Forms} ->
            case erl_lint:module(Forms) of
                {ok, Warnings} ->
                    format_warnings(Warnings);
                {error, Errors, Warnings} ->
                    format_errors(Errors) ++ format_warnings(Warnings)
            end;
        {error, Line, Col, Msg} ->
            [#{
                line => Line,
                col => Col,
                severity => <<"error">>,
                message => unicode:characters_to_binary(Msg)
            }]
    end.

scan_and_parse(Str) ->
    case erl_scan:string(Str, {1, 1}) of
        {ok, Tokens, _EndLoc} ->
            parse_all_forms(Tokens, []);
        {error, {Loc, Mod, Desc}, _} ->
            {L, C} = loc(Loc),
            {error, L, C, Mod:format_error(Desc)}
    end.

parse_all_forms([], Acc) ->
    {ok, lists:reverse(Acc)};
parse_all_forms(Tokens, Acc) ->
    case split_form(Tokens, []) of
        {FormTokens, RestTokens} ->
            case erl_parse:parse_form(FormTokens) of
                {ok, Form} ->
                    parse_all_forms(RestTokens, [Form | Acc]);
                {error, {Loc, Mod, Desc}} ->
                    {L, C} = loc(Loc),
                    {error, L, C, Mod:format_error(Desc)}
            end;
        incomplete ->
            {ok, lists:reverse(Acc)}
    end.

split_form([], _Acc) ->
    incomplete;
split_form([{dot, Loc} | Rest], Acc) ->
    {lists:reverse([{dot, Loc} | Acc]), Rest};
split_form([T | Rest], Acc) ->
    split_form(Rest, [T | Acc]).

loc({L, C}) -> {L, C};
loc(L) when is_integer(L) -> {L, 1}.

format_errors(Errors) ->
    lists:flatmap(fun({_File, DiagList}) ->
        [format_diag(<<"error">>, D) || D <- DiagList]
    end, Errors).

format_warnings(Warnings) ->
    lists:flatmap(fun({_File, DiagList}) ->
        [format_diag(<<"warning">>, D) || D <- DiagList]
    end, Warnings).

format_diag(Severity, {Loc, Mod, Desc}) ->
    {L, C} = loc(Loc),
    #{
        line => L,
        col => C,
        severity => Severity,
        message => unicode:characters_to_binary(Mod:format_error(Desc))
    }.

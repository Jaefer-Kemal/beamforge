-module(bf_compiler).

-export([compile_and_load/2, compile_file/1, load_binary/4]).

-type compile_error() :: {file:filename(), [{integer(), module(), term()}]}.
-type compile_warning() :: {file:filename(), [{integer(), module(), term()}]}.

-spec compile_and_load(node(), [file:filename()]) ->
    {ok, [compile_warning()]} | {error, [compile_error()], [compile_warning()]}.
compile_and_load(LearnerNode, FilePaths) when is_list(FilePaths) ->
    compile_and_load_files(LearnerNode, FilePaths, [], []).

compile_and_load_files(_LearnerNode, [], AccErrors, AccWarnings) ->
    case AccErrors of
        [] ->
            {ok, lists:reverse(AccWarnings)};
        _ ->
            {error, lists:reverse(AccErrors), lists:reverse(AccWarnings)}
    end;
compile_and_load_files(LearnerNode, [FilePath | Rest], AccErrors, AccWarnings) ->
    case compile_file(FilePath) of
        {ok, Module, Binary, Warnings} ->
            case load_binary(LearnerNode, Module, FilePath, Binary) of
                ok ->
                    compile_and_load_files(LearnerNode, Rest, AccErrors, Warnings ++ AccWarnings);
                {error, LoadErr} ->
                    ErrEntry = {FilePath, [{0, code, LoadErr}]},
                    compile_and_load_files(LearnerNode, Rest, [ErrEntry | AccErrors], Warnings ++ AccWarnings)
            end;
        {error, Errors, Warnings} ->
            compile_and_load_files(LearnerNode, Rest, Errors ++ AccErrors, Warnings ++ AccWarnings)
    end.

-spec compile_file(file:filename() | #{path := file:filename(), content := binary() | string()}) ->
    {ok, module(), binary(), [compile_warning()]} |
    {error, [compile_error()], [compile_warning()]}.
compile_file(#{path := RawPath, content := Content}) ->
    Path = if is_binary(RawPath) -> binary_to_list(RawPath); true -> RawPath end,
    Base = filename:basename(Path),
    TmpDir = case os:getenv("TEMP") of
        false -> filename:join(["runtimes", "erl-harness", "ebin"]);
        TempDir -> TempDir
    end,
    TmpPath = filename:join(TmpDir, Base),
    _ = filelib:ensure_dir(TmpPath),
    ok = file:write_file(TmpPath, Content),
    compile_file(TmpPath);
compile_file(FilePath) ->
    Opts = [binary, return_errors, return_warnings, debug_info],
    case compile:file(FilePath, Opts) of
        {ok, Module, Binary} ->
            save_beam_to_ebin(Module, Binary),
            {ok, Module, Binary, []};
        {ok, Module, Binary, Warnings} ->
            save_beam_to_ebin(Module, Binary),
            {ok, Module, Binary, Warnings};
        {error, Errors, Warnings} ->
            {error, Errors, Warnings}
    end.

save_beam_to_ebin(Module, Binary) ->
    EbinDir = filename:join(["runtimes", "erl-harness", "ebin"]),
    _ = filelib:ensure_dir(filename:join(EbinDir, "dummy")),
    BeamPath = filename:join(EbinDir, atom_to_list(Module) ++ ".beam"),
    _ = file:write_file(BeamPath, Binary),
    ok.

-spec load_binary(node(), module(), file:filename() | map(), binary()) -> ok | {error, term()}.
load_binary(Node, Module, FilePath, Binary) ->
    FileName = case FilePath of
        #{path := RawP} -> filename:basename(if is_binary(RawP) -> binary_to_list(RawP); true -> RawP end);
        _ -> filename:basename(FilePath)
    end,
    case Node =:= node() of
        true ->
            case code:load_binary(Module, FileName, Binary) of
                {module, Module} -> ok;
                {error, What} -> {error, What}
            end;
        false ->
            case rpc:call(Node, code, load_binary, [Module, FileName, Binary], 5000) of
                {module, Module} -> ok;
                {error, What} -> {error, What};
                {badrpc, Reason} -> {error, {badrpc, Reason}}
            end
    end.

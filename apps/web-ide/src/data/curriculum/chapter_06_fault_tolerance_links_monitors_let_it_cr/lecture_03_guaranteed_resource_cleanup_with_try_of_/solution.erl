-module(boundary_parser).
-export([
    safe_parse_payload/1,
    with_resource_cleanup/3,
    process_transaction_log/2
]).

safe_parse_payload(Binary) when is_binary(Binary) ->
    try erlang:binary_to_term(Binary, [safe]) of
        Term -> {ok, Term}
    catch
        Class:Reason ->
            {error, {Class, Reason}}
    end;
safe_parse_payload(_Other) ->
    {error, {error, badarg}}.

with_resource_cleanup(AcquireFun, ActionFun, ReleaseFun) when is_function(AcquireFun, 0),
                                                             is_function(ActionFun, 1),
                                                             is_function(ReleaseFun, 1) ->
    Resource = AcquireFun(),
    try ActionFun(Resource) of
        Result -> {ok, Result}
    catch
        Class:Reason ->
            {error, {Class, Reason}}
    after
        ReleaseFun(Resource)
    end.

process_transaction_log(LinesList, CloseNotifyPid) when is_list(LinesList), is_pid(CloseNotifyPid) ->
    try
        lists:foreach(fun(Line) ->
            case Line of
                <<"CORRUPT_LINE">> -> erlang:error(transaction_processing_failed);
                _ValidLine         -> ok
            end
        end, LinesList),
        {ok, length(LinesList)}
    catch
        Class:Reason ->
            {error, {Class, Reason}}
    after
        CloseNotifyPid ! file_handle_closed
    end.

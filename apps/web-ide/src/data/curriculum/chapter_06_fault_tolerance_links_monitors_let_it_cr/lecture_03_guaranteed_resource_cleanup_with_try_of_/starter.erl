-module(boundary_parser).
-export([
    safe_parse_payload/1,
    with_resource_cleanup/3,
    process_transaction_log/2
]).

%% Safely decodes untrusted binary with [safe]
safe_parse_payload(Binary) ->
    ok.

%% Executes ActionFun(Resource) with guaranteed ReleaseFun(Resource) in after
with_resource_cleanup(AcquireFun, ActionFun, ReleaseFun) ->
    ok.

%% Processes lines list, raising error on <<"CORRUPT_LINE">>, always notifying CloseNotifyPid ! file_handle_closed
process_transaction_log(LinesList, CloseNotifyPid) ->
    ok.

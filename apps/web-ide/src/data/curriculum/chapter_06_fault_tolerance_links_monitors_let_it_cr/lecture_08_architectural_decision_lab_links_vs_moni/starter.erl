-module(my_gen_server).
-export([
    start/2,
    call/3,
    cast/2,
    stop/1,
    choose_primitive/1,
    loop/2
]).

%% Architectural Requirement:
%% Return appropriate OTP primitive: tightly_coupled_peers -> use_link;
%% supervisor_to_worker -> use_link_with_trap_exit;
%% client_to_server_request -> use_monitor; independent_watcher -> use_monitor.
choose_primitive(Scenario) ->
    ok.

%% Architectural Requirement:
%% Spawn server running loop(CallbackMod, State) with CallbackMod:init(InitArg).
%% Parent receives {InitRef, ok, Pid} -> {ok, Pid} or {InitRef, error, Reason} -> {error, Reason}.
start(CallbackMod, InitArg) ->
    ok.

%% Architectural Requirement:
%% Reconstruct OTP gen:do_call/4:
%% 1. Attach MRef = erlang:monitor(process, ServerPid).
%% 2. Send {'$gen_call', {self(), MRef}, Request} to ServerPid.
%% 3. Match {MRef, Reply} -> demonitor(MRef, [flush]), return Reply.
%% 4. Match {'DOWN', MRef, process, ServerPid, Reason} -> return {error, {server_crashed, Reason}} immediately.
%% 5. After Timeout -> demonitor(MRef, [flush]), return {error, timeout}.
call(ServerPid, Request, Timeout) ->
    ok.

%% Architectural Requirement:
%% Send asynchronous {'$gen_cast', Request} to ServerPid and return ok.
cast(ServerPid, Request) ->
    ok.

%% Architectural Requirement:
%% Synchronously stop server via call(ServerPid, stop, 1000).
stop(ServerPid) ->
    ok.

%% Architectural Requirement:
%% Match {'$gen_call', {From, MRef}, stop} -> reply {MRef, ok} and terminate.
%% Match {'$gen_call', {From, MRef}, Request} -> CallbackMod:handle_call, reply to From, recurse with NewState.
%% Match {'$gen_cast', Request} -> CallbackMod:handle_cast and recurse with NewState.
loop(CallbackMod, State) ->
    ok.

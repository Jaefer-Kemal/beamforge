-module(my_gen_server).
-export([
    start/2,
    call/3,
    cast/2,
    stop/1,
    choose_primitive/1,
    loop/2
]).

choose_primitive(tightly_coupled_peers)    -> use_link;
choose_primitive(supervisor_to_worker)     -> use_link_with_trap_exit;
choose_primitive(client_to_server_request) -> use_monitor;
choose_primitive(independent_watcher)      -> use_monitor.

start(CallbackMod, InitArg) ->
    InitRef = make_ref(),
    Parent = self(),
    Pid = spawn(fun() ->
        case CallbackMod:init(InitArg) of
            {ok, InitialState} ->
                Parent ! {InitRef, ok, self()},
                loop(CallbackMod, InitialState);
            {error, Reason} ->
                Parent ! {InitRef, error, Reason}
        end
    end),
    receive
        {InitRef, ok, ServerPid} -> {ok, ServerPid};
        {InitRef, error, Reason} -> {error, Reason}
    after 1000 ->
        {error, init_timeout}
    end.

call(ServerPid, Request, Timeout) ->
    MRef = erlang:monitor(process, ServerPid),
    ServerPid ! {'$gen_call', {self(), MRef}, Request},
    receive
        {MRef, Reply} ->
            erlang:demonitor(MRef, [flush]),
            Reply;
        {'DOWN', MRef, process, ServerPid, Reason} ->
            {error, {server_crashed, Reason}}
    after Timeout ->
        erlang:demonitor(MRef, [flush]),
        {error, timeout}
    end.

cast(ServerPid, Request) ->
    ServerPid ! {'$gen_cast', Request},
    ok.

stop(ServerPid) ->
    call(ServerPid, stop, 1000).

loop(CallbackMod, State) ->
    receive
        {'$gen_call', {From, MRef}, stop} ->
            From ! {MRef, ok},
            ok;

        {'$gen_call', {From, MRef}, Request} ->
            case CallbackMod:handle_call(Request, From, State) of
                {reply, Reply, NewState} ->
                    From ! {MRef, Reply},
                    loop(CallbackMod, NewState);
                {stop, Reason, Reply, _FinalState} ->
                    From ! {MRef, Reply},
                    exit(Reason)
            end;

        {'$gen_cast', Request} ->
            case CallbackMod:handle_cast(Request, State) of
                {noreply, NewState} ->
                    loop(CallbackMod, NewState);
                {stop, Reason, _FinalState} ->
                    exit(Reason)
            end
    end.

-module(counter_actor).
-export([start/1, increment/2, decrement/2, get_value/1, stop/1, loop/1]).

%% Spawns the counter actor with InitialValue
start(InitialValue) ->
    %% Architectural Requirement: Spawn loop(InitialValue) and return PID
    ok.

%% Client API: sends {increment, Delta} asynchronously
increment(Pid, Delta) ->
    %% Architectural Requirement: Send {increment, Delta} asynchronously, return ok
    ok.

%% Client API: sends {decrement, Delta} asynchronously
decrement(Pid, Delta) ->
    %% Architectural Requirement: Send {decrement, Delta} asynchronously, return ok
    ok.

%% Client API: sends {get, self()} and waits up to 1000ms for {value, Val}
get_value(Pid) ->
    %% Architectural Requirement: Send {get, self()}, receive {value, Val} with 1000ms timeout
    ok.

%% Client API: sends stop to the actor
stop(Pid) ->
    %% Architectural Requirement: Send stop, return ok
    ok.

%% Internal Actor Loop: tail-recursive message handler
loop(CurrentVal) ->
    %% Architectural Requirement:
    %% Handle {increment, Delta} -> recurse with CurrentVal + Delta
    %% Handle {decrement, Delta} -> recurse with CurrentVal - Delta
    %% Handle {get, Caller} -> send {value, CurrentVal} to Caller, recurse with CurrentVal
    %% Handle stop -> return ok
    ok.

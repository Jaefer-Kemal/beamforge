-module(ping_actor).
-export([start_responder/0, ping/2, broadcast/2, responder_loop/0]).

%% Spawns a responder process executing responder_loop/0
start_responder() ->
    %% Architectural Requirement: Spawn responder_loop/0 and return the PID
    ok.

%% Tail-recursive receive loop handling {ping, CallerPid, Payload} and stop
responder_loop() ->
    %% Architectural Requirement:
    %% Match {ping, CallerPid, Payload} -> send {pong, self(), Payload} to CallerPid and recurse
    %% Match stop -> return ok
    ok.

%% Client API: sends {ping, self(), Payload} and waits up to 1000ms for {pong, ResponderPid, Payload}
ping(ResponderPid, Payload) ->
    %% Architectural Requirement: Send ping with self(), selectively receive pong with 1000ms timeout
    ok.

%% Client API: asynchronously sends Msg to every PID in PidsList
broadcast(PidsList, Msg) ->
    %% Architectural Requirement: Send Msg to each PID, return {sent, length(PidsList)}
    ok.

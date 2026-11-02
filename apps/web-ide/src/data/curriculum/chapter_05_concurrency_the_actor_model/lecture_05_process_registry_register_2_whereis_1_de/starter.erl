-module(named_kv_actor).
-export([start_registered/0, put/2, get/1, stop/0, loop/1]).

%% Registers actor under atom named_kv_actor if not already registered
start_registered() ->
    %% Architectural Requirement: Check whereis, spawn loop(#{}) and register if undefined
    ok.

%% Client API: writes Key -> Value via registered name with make_ref() correlation
put(Key, Value) ->
    %% Architectural Requirement: Check whereis, generate Ref, send request, wait for reply
    ok.

%% Client API: reads Key via registered name with make_ref() correlation
get(Key) ->
    %% Architectural Requirement: Check whereis, generate Ref, send request, wait for reply
    ok.

%% Client API: stops actor and unregisters name
stop() ->
    %% Architectural Requirement: Check whereis, send stop, unregister name
    ok.

%% Internal Actor Loop holding Map state
loop(Map) ->
    %% Architectural Requirement: Handle put, get, and stop messages using Ref matching
    ok.

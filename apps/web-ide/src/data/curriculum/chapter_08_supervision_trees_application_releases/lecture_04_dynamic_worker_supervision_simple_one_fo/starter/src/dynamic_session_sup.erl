-module(dynamic_session_sup).
-behaviour(supervisor).

-export([
    start_link/0,
    start_session/3,
    count_sessions/1,
    terminate_session/2,
    init/1
]).

start_link() ->
    ok.

init([]) ->
    ok.

start_session(SupRef, SessionId, UserId) ->
    ok.

count_sessions(SupRef) ->
    ok.

terminate_session(SupRef, ChildPid) ->
    ok.

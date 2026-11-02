-module(checkout_sup).
-behaviour(supervisor).

-export([
    start_link/0,
    get_pipeline_pids/0,
    init/1
]).

start_link() ->
    ok.

init([]) ->
    ok.

get_pipeline_pids() ->
    ok.

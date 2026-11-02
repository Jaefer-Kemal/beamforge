-module(commerce_app).
-behaviour(application).
-behaviour(supervisor).

-export([
    start/2,
    stop/1,
    get_app_config/2,
    set_app_config/2,
    init/1
]).

start(_StartType, _StartArgs) ->
    ok.

stop(_State) ->
    ok.

get_app_config(Key, Default) ->
    ok.

set_app_config(Key, Value) ->
    ok.

init([]) ->
    ok.

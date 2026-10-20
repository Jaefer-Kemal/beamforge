-module(bf_tracer_app).
-behaviour(application).

-export([start/2, stop/1]).

start(_StartType, _StartArgs) ->
    bf_tracer_sup:start_link().

stop(_State) ->
    ok.

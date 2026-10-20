-module(bf_xmpp_sim_app).
-behaviour(application).

-export([start/2, stop/1]).

start(_StartType, _StartArgs) ->
    bf_xmpp_sim_sup:start_link().

stop(_State) ->
    ok.

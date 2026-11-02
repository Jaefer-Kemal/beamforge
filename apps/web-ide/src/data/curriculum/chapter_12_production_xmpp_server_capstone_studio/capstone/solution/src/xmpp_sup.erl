-module(xmpp_sup).
-behaviour(supervisor).

-export([start_link/0, stop/0, init/1]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

stop() ->
    case whereis(?MODULE) of
        undefined -> ok;
        Pid -> supervisor:stop(Pid)
    end.

init([]) ->
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 5,
        period => 10
    },
    ChildSpecs = [
        #{
            id => xmpp_session_registry,
            start => {xmpp_session_registry, start_link, []},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [xmpp_session_registry]
        },
        #{
            id => xmpp_router,
            start => {xmpp_router, start_link, []},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [xmpp_router]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.

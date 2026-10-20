-module(sample_session_sup).
-behaviour(supervisor).

-export([start_link/0, init/1]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

init([]) ->
    SupFlags = #{
        strategy => one_for_one,
        intensity => 5,
        period => 10
    },
    ChildSpecs = [
        #{
            id => sample_table_mgr,
            start => {sample_table_mgr, start_link, []},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [sample_table_mgr]
        },
        #{
            id => sample_session_cache,
            start => {sample_session_cache, start_link, []},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [sample_session_cache]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.

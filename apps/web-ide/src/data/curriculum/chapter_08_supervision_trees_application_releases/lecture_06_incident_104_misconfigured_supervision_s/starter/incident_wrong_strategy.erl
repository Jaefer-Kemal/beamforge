-module(incident_wrong_strategy).
-behaviour(supervisor).

-export([
    start_link/0,
    init/1,
    build_pipeline_specs/0,
    audit_flags/0,
    test_chaos_cascade/0
]).
-export([worker_loop/1]).

start_link() ->
    supervisor:start_link(?MODULE, []).

init([]) ->
    %% BUGGY IMPLEMENTATION (INCIDENT #104):
    SupFlags = #{
        strategy => one_for_one,
        intensity => 0,
        period => 1
    },
    ChildSpecs = [
        #{
            id => worker_db,
            start => {incident_wrong_strategy, worker_loop, [db]},
            restart => temporary,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        },
        #{
            id => worker_cache,
            start => {incident_wrong_strategy, worker_loop, [cache]},
            restart => temporary,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        },
        #{
            id => worker_http,
            start => {incident_wrong_strategy, worker_loop, [http]},
            restart => temporary,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.

build_pipeline_specs() ->
    {ok, {_SupFlags, ChildSpecs}} = init([]),
    ChildSpecs.

worker_loop(Role) ->
    Pid = spawn_link(fun() -> run_worker(Role) end),
    {ok, Pid}.

run_worker(Role) ->
    receive
        stop -> ok;
        _ -> run_worker(Role)
    end.

audit_flags() ->
    {ok, {SupFlags, ChildSpecs}} = init([]),
    Strategy = maps:get(strategy, SupFlags),
    Restarts = [maps:get(restart, Spec) || Spec <- ChildSpecs],
    {ok, Strategy, Restarts}.

test_chaos_cascade() ->
    {ok, Sup} = start_link(),
    Children1 = supervisor:which_children(Sup),
    {_, Db1, _, _} = lists:keyfind(worker_db, 1, Children1),
    {_, Cache1, _, _} = lists:keyfind(worker_cache, 1, Children1),
    {_, Http1, _, _} = lists:keyfind(worker_http, 1, Children1),
    exit(Cache1, kill),
    timer:sleep(50),
    Children2 = supervisor:which_children(Sup),
    {_, Db2, _, _} = lists:keyfind(worker_db, 1, Children2),
    {_, Cache2, _, _} = lists:keyfind(worker_cache, 1, Children2),
    {_, Http2, _, _} = lists:keyfind(worker_http, 1, Children2),
    exit(Sup, shutdown),
    case Db1 =:= Db2 andalso Cache1 =/= Cache2 andalso Http1 =/= Http2 of
        true -> {ok, db_unaffected, downstream_restarted};
        false -> {error, cascade_failed}
    end.

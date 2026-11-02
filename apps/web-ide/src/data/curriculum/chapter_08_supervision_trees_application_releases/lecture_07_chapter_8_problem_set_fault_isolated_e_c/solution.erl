-module(checkout_sup).
-behaviour(supervisor).

-export([
    start_link/0,
    get_pipeline_pids/0,
    init/1
]).

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

init([]) ->
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 5,
        period => 10
    },
    ChildSpecs = [
        #{
            id => db_pool,
            start => {checkout_worker, start_link, [db_pool_worker, db]},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [checkout_worker]
        },
        #{
            id => pricing_cache,
            start => {checkout_worker, start_link, [pricing_cache_worker, cache]},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [checkout_worker]
        },
        #{
            id => order_gateway,
            start => {checkout_worker, start_link, [order_gateway_worker, gateway]},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [checkout_worker]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.

get_pipeline_pids() ->
    Children = supervisor:which_children(?MODULE),
    DbPid = case lists:keyfind(db_pool, 1, Children) of
        {db_pool, P1, _, _} -> P1;
        _ -> whereis(db_pool_worker)
    end,
    CachePid = case lists:keyfind(pricing_cache, 1, Children) of
        {pricing_cache, P2, _, _} -> P2;
        _ -> whereis(pricing_cache_worker)
    end,
    GatewayPid = case lists:keyfind(order_gateway, 1, Children) of
        {order_gateway, P3, _, _} -> P3;
        _ -> whereis(order_gateway_worker)
    end,
    {ok, #{db_pid => DbPid, cache_pid => CachePid, gateway_pid => GatewayPid}}.

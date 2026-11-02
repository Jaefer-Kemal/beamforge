-module(arity_calc).
-export([connect/1, connect/2, connect/3]).

-define(DEFAULT_PORT, 80).
-define(DEFAULT_TIMEOUT, 5000).

connect(Host) ->
    connect(Host, ?DEFAULT_PORT).

connect(Host, Port) ->
    connect(Host, Port, ?DEFAULT_TIMEOUT).

connect(Host, Port, Timeout) ->
    {connection, ?MODULE, Host, Port, Timeout}.
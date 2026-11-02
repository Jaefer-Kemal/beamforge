-module(keylist_config).
-export([find_product_by_id/2, upsert_product/2, read_socket_options/1]).

%% @doc Find product tuple by Id at position 2 using lists:keyfind/3.
find_product_by_id(_Inventory, _ProductId) ->
    %% Return {ok, Tuple} or {error, not_found}
    ok.

%% @doc Update or insert NewProduct by Id at position 2 using lists:keystore/4.
upsert_product(_Inventory, _NewProduct) ->
    %% Return updated list
    ok.

%% @doc Extract {socket_cfg, Port, ActiveMode, IsBinary} using proplists.
read_socket_options(_OptsList) ->
    %% Port default: 8080
    %% ActiveMode default: false
    %% IsBinary: proplists:get_bool(binary, OptsList)
    ok.
-module(keylist_config).
-export([find_product_by_id/2, upsert_product/2, read_socket_options/1]).

find_product_by_id(Inventory, ProductId) ->
    case lists:keyfind(ProductId, 2, Inventory) of
        {product, ProductId, _, _, _} = Prod ->
            {ok, Prod};
        false ->
            {error, not_found}
    end.

upsert_product(Inventory, {product, ProdId, _, _, _} = NewProduct) ->
    lists:keystore(ProdId, 2, Inventory, NewProduct).

read_socket_options(OptsList) ->
    Port = proplists:get_value(port, OptsList, 8080),
    Active = proplists:get_value(active, OptsList, false),
    IsBinary = proplists:get_bool(binary, OptsList),
    {socket_cfg, Port, Active, IsBinary}.
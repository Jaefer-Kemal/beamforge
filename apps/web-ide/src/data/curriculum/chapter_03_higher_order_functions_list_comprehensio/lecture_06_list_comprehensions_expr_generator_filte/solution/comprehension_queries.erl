-module(comprehension_queries).
-export([active_user_names/1, matrix_cartesian/2, fulfilled_order_receipts/2]).

active_user_names(Users) ->
    [Name || {user, _Id, Name, active} <- Users].

matrix_cartesian(Xs, Ys) ->
    [{X, Y} || X <- Xs, Y <- Ys].

fulfilled_order_receipts(Inventory, Orders) ->
    [
        {receipt, Id, Name, Qty * Price}
     || {order, ProdId, Qty} <- Orders,
        {product, Id, Name, Price, Stock} <- Inventory,
        ProdId =:= Id,
        Stock >= Qty,
        Qty > 0
    ].
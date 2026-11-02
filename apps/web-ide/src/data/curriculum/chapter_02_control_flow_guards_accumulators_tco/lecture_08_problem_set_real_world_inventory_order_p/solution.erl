-module(inventory).
-export([process_order/2, calculate_order_total/2, restock/2]).

%% ── process_order/2 ───────────────────────────────────────────────────────
process_order(Inventory, Orders) ->
    process_orders_loop(Inventory, Orders).

process_orders_loop(Inventory, []) ->
    Inventory;
process_orders_loop(Inventory, [{order, ProdId, Qty} | RestOrders]) ->
    NewInv = deduct_stock_if_available(Inventory, ProdId, Qty),
    process_orders_loop(NewInv, RestOrders).

deduct_stock_if_available(Inventory, ProdId, Qty) ->
    case find_product(Inventory, ProdId) of
        {ok, {product, ProdId, _Name, _Price, Stock}} when Stock >= Qty ->
            update_stock(Inventory, ProdId, -Qty);
        _ ->
            Inventory
    end.

update_stock(Inventory, TargetId, DeltaQty) ->
    update_stock_loop(Inventory, TargetId, DeltaQty, []).

update_stock_loop([], _TargetId, _Delta, Acc) ->
    lists:reverse(Acc);
update_stock_loop([{product, Id, Name, Price, Stock} | Rest], TargetId, Delta, Acc)
  when Id =:= TargetId ->
    Updated = {product, Id, Name, Price, Stock + Delta},
    update_stock_loop(Rest, TargetId, Delta, [Updated | Acc]);
update_stock_loop([Other | Rest], TargetId, Delta, Acc) ->
    update_stock_loop(Rest, TargetId, Delta, [Other | Acc]).

%% ── calculate_order_total/2 ───────────────────────────────────────────────
calculate_order_total(Inventory, Orders) ->
    calc_total_loop(Orders, Inventory, 0).

calc_total_loop([], _Inventory, Acc) ->
    Acc;
calc_total_loop([{order, ProdId, Qty} | RestOrders], Inventory, Acc) ->
    case find_product(Inventory, ProdId) of
        {ok, {product, ProdId, _Name, Price, Stock}} when Stock >= Qty ->
            calc_total_loop(RestOrders, Inventory, Acc + (Price * Qty));
        _ ->
            calc_total_loop(RestOrders, Inventory, Acc)
    end.

%% ── restock/2 ─────────────────────────────────────────────────────────────
restock(Inventory, Restocks) ->
    restock_loop(Restocks, Inventory).

restock_loop([], Inventory) ->
    Inventory;
restock_loop([{ProdId, AddQty} | Rest], Inventory) ->
    NewInv = update_stock(Inventory, ProdId, AddQty),
    restock_loop(Rest, NewInv).

%% ── Helper: find_product/2 ────────────────────────────────────────────────
find_product([], _TargetId) ->
    not_found;
find_product([{product, TargetId, _Name, _Price, _Stock} = Prod | _Rest], TargetId) ->
    {ok, Prod};
find_product([_Other | Rest], TargetId) ->
    find_product(Rest, TargetId).
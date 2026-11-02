-module(inventory).
-export([process_order/2, calculate_order_total/2, restock/2]).

%% @doc Process orders against inventory, deducting stock only when sufficient inventory exists.
process_order(Inventory, Orders) ->
    %% Outer loop traverses Orders; inner loop checks and updates Inventory.
    % TODO: Process all orders tail-recursively
    ok.

%% @doc Calculate total cost of fulfilled orders. Unfulfillable orders contribute 0.
calculate_order_total(Inventory, Orders) ->
    %% Tail-recursively sum (Price * Qty) for each order where Stock >= Qty.
    % TODO: Calculate order total tail-recursively
    0.

%% @doc Restock inventory items from [{ProductId, RestockQty}, ...].
restock(Inventory, Restocks) ->
    %% Outer loop traverses Restocks; inner loop increments product stock.
    % TODO: Restock inventory tail-recursively
    ok.
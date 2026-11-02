-module(tuple_updater).
-export([update_product_price/3, partition_orders/2]).

%% @doc Update the price of product TargetId in Inventory while preserving list order.
update_product_price(Inventory, TargetId, NewPrice) ->
    %% 1. Delegate to helper with Acc: update_product_price(Inventory, TargetId, NewPrice, []).
    %% 2. In base case [], return lists:reverse(Acc).
    %% 3. When Id =:= TargetId, update Price to NewPrice and accumulate.
    %% 4. For other products, accumulate unchanged.
    ok.

%% @doc Partition orders into {Valid, Rejected} where Valid has Qty >= MinQty.
partition_orders(Orders, MinQty) ->
    %% 1. Delegate to helper with two accumulators: partition_orders(Orders, MinQty, [], []).
    %% 2. In base case [], return {lists:reverse(ValidAcc), lists:reverse(RejAcc)}.
    %% 3. When Qty >= MinQty, add to ValidAcc; otherwise add to RejAcc.
    ok.
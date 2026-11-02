-module(tuple_updater).
-export([update_product_price/3, partition_orders/2]).

update_product_price(Inventory, TargetId, NewPrice) ->
    update_product_price(Inventory, TargetId, NewPrice, []).

update_product_price([], _TargetId, _NewPrice, Acc) ->
    lists:reverse(Acc);
update_product_price([{product, Id, Name, _OldPrice, Stock} | Rest], TargetId, NewPrice, Acc)
  when Id =:= TargetId ->
    Updated = {product, Id, Name, NewPrice, Stock},
    update_product_price(Rest, TargetId, NewPrice, [Updated | Acc]);
update_product_price([OtherProd | Rest], TargetId, NewPrice, Acc) ->
    update_product_price(Rest, TargetId, NewPrice, [OtherProd | Acc]).

partition_orders(Orders, MinQty) ->
    partition_orders(Orders, MinQty, [], []).

partition_orders([], _MinQty, ValidAcc, RejAcc) ->
    {lists:reverse(ValidAcc), lists:reverse(RejAcc)};
partition_orders([{order, _Id, Qty} = O | Rest], MinQty, ValidAcc, RejAcc)
  when Qty >= MinQty ->
    partition_orders(Rest, MinQty, [O | ValidAcc], RejAcc);
partition_orders([O | Rest], MinQty, ValidAcc, RejAcc) ->
    partition_orders(Rest, MinQty, ValidAcc, [O | RejAcc]).
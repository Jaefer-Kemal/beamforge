-module(inventory_hof).
-export([total_inventory_valuation/1, critical_stock_alerts/2, apply_orders_with_keylists/2, aggregate_sla_logs/1]).

total_inventory_valuation(Inventory) ->
    lists:foldl(fun({product, _Id, _Name, Price, Stock}, TotalAcc) ->
        TotalAcc + (Price * Stock)
    end, 0, Inventory).

critical_stock_alerts(Inventory, Threshold) ->
    lists:filtermap(fun
        ({product, Id, Name, _Price, Stock}) when Stock =< Threshold ->
            {true, {alert, Id, Name, Stock}};
        (_) ->
            false
    end, Inventory).

apply_orders_with_keylists(Inventory, Orders) ->
    lists:foldl(fun({order, ProdId, Qty}, AccInv) ->
        case lists:keyfind(ProdId, 2, AccInv) of
            {product, ProdId, Name, Price, Stock} when Stock >= Qty, Qty > 0 ->
                UpdatedProd = {product, ProdId, Name, Price, Stock - Qty},
                lists:keystore(ProdId, 2, AccInv, UpdatedProd);
            _ ->
                AccInv
        end
    end, Inventory, Orders).

aggregate_sla_logs(Logs) ->
    lists:foldl(fun
        ({log, _Endpoint, Latency, error}, {sla_summary, TotalReqs, Errors, TotalLatency}) ->
            {sla_summary, TotalReqs + 1, Errors + 1, TotalLatency + Latency};
        ({log, _Endpoint, Latency, _OkStatus}, {sla_summary, TotalReqs, Errors, TotalLatency}) ->
            {sla_summary, TotalReqs + 1, Errors, TotalLatency + Latency}
    end, {sla_summary, 0, 0, 0}, Logs).
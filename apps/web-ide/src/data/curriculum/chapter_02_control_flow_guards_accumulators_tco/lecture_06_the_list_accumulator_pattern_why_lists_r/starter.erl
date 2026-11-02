-module(acc_filter).
-export([keep_valid_orders/1]).

%% @doc Filter confirmed orders with Qty > 0 and extract their IDs in original order.
keep_valid_orders(Orders) ->
    %% 1. Delegate to keep_valid_orders(Orders, []).
    %% 2. In base case [], return lists:reverse(Acc).
    %% 3. When Qty > 0 and Status =:= confirmed, accumulate [Id | Acc].
    %% 4. Otherwise, skip the order.
    ok.
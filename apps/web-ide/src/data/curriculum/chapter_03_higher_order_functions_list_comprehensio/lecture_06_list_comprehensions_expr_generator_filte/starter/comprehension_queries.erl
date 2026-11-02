-module(comprehension_queries).
-export([active_user_names/1, matrix_cartesian/2, fulfilled_order_receipts/2]).

%% @doc Return [Name] for active users using list comprehension generator pattern matching.
active_user_names(_Users) ->
    %% % TODO: Filter Users with a list comprehension pattern-matching on active user tuples and return [Name]
    ok.

%% @doc Return [{X, Y}] Cartesian product using two generators.
matrix_cartesian(_Xs, _Ys) ->
    %% % TODO: Combine two generator qualifiers across Xs and Ys to produce all {X, Y} Cartesian pairs
    ok.

%% @doc Join Orders and Inventory to return [{receipt, Id, Name, Qty * Price}] for fulfilled orders.
fulfilled_order_receipts(_Inventory, _Orders) ->
    %% Join {order, ProdId, Qty} and {product, Id, Name, Price, Stock} where ProdId =:= Id, Stock >= Qty, Qty > 0
    ok.
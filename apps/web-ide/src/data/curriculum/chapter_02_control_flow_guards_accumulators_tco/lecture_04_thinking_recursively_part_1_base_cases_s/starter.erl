-module(recursive_search).
-export([find_product/2, contains_item/2]).

%% @doc Recursively searches the Inventory list for a product tuple with matching ID.
%% See lesson guide for the 3-case recursive pattern and return contract.
find_product(_Inventory, _TargetId) ->
    %% % TODO: Implement multi-clause recursive search over the inventory:
    %% % handle base case (empty list), match case (target found), and recursive step.
    ok.

%% @doc Recursively checks if Target is an element of List.
%% See lesson guide for the base case and match case specifications.
contains_item(_List, _Target) ->
    %% % TODO: Implement recursive membership check without using standard library functions:
    %% % handle base case (empty list), match case (element found), and recursive step.
    ok.
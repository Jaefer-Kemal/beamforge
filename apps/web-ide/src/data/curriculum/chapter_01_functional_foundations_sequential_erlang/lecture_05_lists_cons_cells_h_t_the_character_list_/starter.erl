-module(list_ops).
-export([prepend_item/2, swap_first_two/1, ascii_initial/1]).

%% @doc Prepend Item to the front of List using the cons operator.
prepend_item(Item, List) ->
    %% Prepend Item to the head of List using cons syntax [Head | Tail].
    ok.

%% @doc Swap the first two elements of a list of at least 2 items.
swap_first_two(List) ->
    %% Destructure the first two elements and the remaining tail,
    %% then return a new list with the first two elements swapped.
    ok.

%% @doc Extract the ASCII codepoint integer of the first character in a string.
ascii_initial(NameString) ->
    %% Destructure the string into its head character code and tail,
    %% and return a 2-tuple tagged with 'char_code'.
    ok.
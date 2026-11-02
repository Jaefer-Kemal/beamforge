-module(list_ops).
-export([prepend_item/2, swap_first_two/1, ascii_initial/1]).

prepend_item(Item, List) ->
    [Item | List].

swap_first_two(List) ->
    [First, Second | Rest] = List,
    [Second, First | Rest].

ascii_initial(NameString) ->
    [FirstCharCode | _Rest] = NameString,
    {char_code, FirstCharCode}.
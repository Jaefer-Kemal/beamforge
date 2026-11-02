-module(counter_actor).
-export([start/1, increment/2, decrement/2, get_value/1, stop/1, loop/1]).

start(InitialValue) ->
    spawn(fun() -> loop(InitialValue) end).

increment(Pid, Delta) ->
    Pid ! {increment, Delta},
    ok.

decrement(Pid, Delta) ->
    Pid ! {decrement, Delta},
    ok.

get_value(Pid) ->
    Pid ! {get, self()},
    receive
        {value, Val} ->
            {ok, Val}
    after 1000 ->
        {error, timeout}
    end.

stop(Pid) ->
    Pid ! stop,
    ok.

loop(CurrentVal) ->
    receive
        {increment, Delta} ->
            loop(CurrentVal + Delta);
        {decrement, Delta} ->
            loop(CurrentVal - Delta);
        {get, Caller} ->
            Caller ! {value, CurrentVal},
            loop(CurrentVal);
        stop ->
            ok
    end.

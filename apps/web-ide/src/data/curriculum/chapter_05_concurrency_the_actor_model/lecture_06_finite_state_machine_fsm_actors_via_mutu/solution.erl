-module(door_lock_fsm).
-export([
    start/1,
    enter_code/2,
    lock/1,
    get_state/1,
    stop/1,
    locked/2,
    unlocked/1
]).

start(SecretCode) ->
    spawn(fun() -> locked(SecretCode, 0) end).

enter_code(Pid, AttemptCode) ->
    Ref = make_ref(),
    Pid ! {enter_code, self(), Ref, AttemptCode},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

lock(Pid) ->
    Ref = make_ref(),
    Pid ! {lock, self(), Ref},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

get_state(Pid) ->
    Ref = make_ref(),
    Pid ! {get_state, self(), Ref},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

locked(SecretCode, FailedAttempts) ->
    receive
        {enter_code, From, Ref, SecretCode} ->
            From ! {reply, Ref, {ok, unlocked}},
            unlocked(SecretCode);
        {enter_code, From, Ref, _Wrong} ->
            NextFailed = FailedAttempts + 1,
            From ! {reply, Ref, {error, {wrong_code, NextFailed}}},
            locked(SecretCode, NextFailed);
        {lock, From, Ref} ->
            From ! {reply, Ref, ok},
            locked(SecretCode, FailedAttempts);
        {get_state, From, Ref} ->
            From ! {reply, Ref, {locked, FailedAttempts}},
            locked(SecretCode, FailedAttempts);
        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.

unlocked(SecretCode) ->
    receive
        {enter_code, From, Ref, _Any} ->
            From ! {reply, Ref, {ok, already_unlocked}},
            unlocked(SecretCode);
        {lock, From, Ref} ->
            From ! {reply, Ref, ok},
            locked(SecretCode, 0);
        {get_state, From, Ref} ->
            From ! {reply, Ref, unlocked},
            unlocked(SecretCode);
        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.

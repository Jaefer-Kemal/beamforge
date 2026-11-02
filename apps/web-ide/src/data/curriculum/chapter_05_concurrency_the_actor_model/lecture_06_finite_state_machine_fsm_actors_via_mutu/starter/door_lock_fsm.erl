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

%% Spawns the actor starting in locked(SecretCode, 0)
start(SecretCode) ->
    %% Architectural Requirement: Spawn actor into locked(SecretCode, 0) and return PID
    ok.

%% Client API: sends code attempt to door actor
enter_code(Pid, AttemptCode) ->
    %% Architectural Requirement: make_ref(), send request, wait for reply with 1000ms timeout
    ok.

%% Client API: commands door actor to lock
lock(Pid) ->
    %% Architectural Requirement: make_ref(), send lock request, wait for reply with 1000ms timeout
    ok.

%% Client API: queries current door state
get_state(Pid) ->
    %% Architectural Requirement: make_ref(), send get_state request, wait for reply
    ok.

%% Client API: stops door actor cleanly
stop(Pid) ->
    %% Architectural Requirement: make_ref(), send stop, wait for ok
    ok.

%% ── FSM State 1: LOCKED ───────────────────────────────────────────────────────
locked(SecretCode, FailedAttempts) ->
    %% Architectural Requirement:
    %% If enter_code matches SecretCode -> reply {ok, unlocked}, tail-call unlocked(SecretCode)
    %% If enter_code fails -> reply {error, {wrong_code, FailedAttempts + 1}}, tail-call locked(SecretCode, FailedAttempts + 1)
    %% If lock -> reply ok, tail-call locked(SecretCode, FailedAttempts)
    %% If get_state -> reply {locked, FailedAttempts}, tail-call locked(SecretCode, FailedAttempts)
    %% If stop -> reply ok, return ok
    ok.

%% ── FSM State 2: UNLOCKED ─────────────────────────────────────────────────────
unlocked(SecretCode) ->
    %% Architectural Requirement:
    %% If enter_code -> reply {ok, already_unlocked}, tail-call unlocked(SecretCode)
    %% If lock -> reply ok, tail-call locked(SecretCode, 0) (reset counter)
    %% If get_state -> reply unlocked, tail-call unlocked(SecretCode)
    %% If stop -> reply ok, return ok
    ok.

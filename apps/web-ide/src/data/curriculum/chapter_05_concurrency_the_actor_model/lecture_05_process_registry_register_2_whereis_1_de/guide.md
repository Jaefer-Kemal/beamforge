## Why This Matters in Production

In production distributed systems, two critical architectural challenges arise:
1. **Service Discovery Without Threading PIDs Through 20 Modules:** In a large backend with hundreds of modules, passing a raw PID like `<0.142.0>` down through every function call creates brittle tight-coupling. If that process crashes and its supervisor restarts it, its PID changes (e.g. to `<0.288.0>`), leaving all callers holding a dead reference.
2. **The "Stale Reply" Race Condition:** Suppose a client sends a request to a database actor. The database is temporarily congested, so the client's `after 100` timeout expires. The client gives up and sends a *second* request. Right at that microsecond, the late reply from the *first* request finally lands in the client's mailbox! Without a correlation identifier, the client's `receive` block consumes the old response and misattributes it to the second request, silently corrupting application state!

## Deep Concept Breakdown & Under the Hood

### 1. The Local Process Registry
Erlang allows registering any live process under a unique atom name:
```erlang
register(session_manager, Pid).
```
- Once registered, any process on the node can send messages directly by name: `session_manager ! {login, User}`.
- `whereis(AtomName) -> pid() | undefined`: Resolves the atom to its current live PID, or returns `undefined` if not running.
- `unregister(AtomName) -> true`: Removes the name mapping.
- `registered() -> [atom()]`: Returns a list of all currently registered names on the BEAM node.

### 2. CRITICAL PRODUCTION TRAP: Dead-PID vs. Unregistered-Atom Semantics
There is a massive, asymmetrical difference between sending to a dead PID versus sending to an unregistered atom:
- **Case A: Sending to a Dead PID (`DeadPid ! Msg`):**
  If `DeadPid` has already terminated, the BEAM runtime **silently drops the message and does NOT crash**. The expression evaluates to `Msg`. The sender continues running unaffected.
- **Case B: Sending to an Unregistered Atom (`unregistered_service ! Msg`):**
  If `whereis(unregistered_service)` returns `undefined`, the BEAM raises an immediate **`badarg` runtime exception** in the sender process!

> [!warning] Production Concurrency Trap: Blind Sends to Atoms Crash Callers
> Never write `my_service ! Request` directly in production client libraries. If `my_service` crashes and has not yet been restarted by its supervisor, your caller will crash with `badarg`. Always resolve the name safely:
> ```erlang
> case whereis(my_service) of
>     undefined -> {error, not_running};
>     Pid -> ...
> end
> ```

### 3. Request Correlation with `make_ref/0`
To eliminate the stale reply hazard, every synchronous request must generate an opaque 128-bit reference token: **`Ref = make_ref()`**:
1. Caller creates `Ref = make_ref()`.
2. Caller sends `{get, Ref, self(), Key}` to the actor.
3. Actor replies `{reply, Ref, Result}`.
4. Caller matches **specifically on that reference**:
   ```erlang
   receive
       {reply, Ref, Result} -> Result
   after 1000 ->
       {error, timeout}
   end.
   ```
If a delayed reply from an earlier timed-out request arrives with an older reference, the `receive` pattern `{reply, Ref, ...}` **rejects it**, safely ignoring the stale reply!

## Parallel Worked Example

Consider a registered configuration store:

```erlang
-module(config_store).
-export([start/0, set/2, get/1, stop/0, loop/1]).

start() ->
    case whereis(?MODULE) of
        undefined ->
            Pid = spawn(fun() -> loop(#{}) end),
            register(?MODULE, Pid),
            {ok, Pid};
        _Pid ->
            {error, already_started}
    end.

set(Key, Val) ->
    case whereis(?MODULE) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {set, Ref, self(), Key, Val},
            receive
                {reply, Ref, ok} -> ok
            after 1000 -> {error, timeout}
            end
    end.

get(Key) ->
    case whereis(?MODULE) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {get, Ref, self(), Key},
            receive
                {reply, Ref, Res} -> Res
            after 1000 -> {error, timeout}
            end
    end.

stop() ->
    case whereis(?MODULE) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {stop, Ref, self()},
            receive
                {reply, Ref, ok} -> ok
            after 1000 -> {error, timeout}
            end
    end.

loop(StateMap) ->
    receive
        {set, Ref, From, Key, Val} ->
            From ! {reply, Ref, ok},
            loop(maps:put(Key, Val, StateMap));
        {get, Ref, From, Key} ->
            Result = case maps:find(Key, StateMap) of
                {ok, Value} -> {ok, Value};
                error -> {error, not_found}
            end,
            From ! {reply, Ref, Result},
            loop(StateMap);
        {stop, Ref, From} ->
            unregister(?MODULE),
            From ! {reply, Ref, ok},
            ok
    end.
```

## Official Erlang Docs & Function Reference

```erlang
%% Official OTP Signatures (erts / erlang)
register(RegName, Pid) -> true
whereis(RegName) -> pid() | undefined
unregister(RegName) -> true
make_ref() -> reference()
  Types:
    RegName = atom()
    Pid = pid()
    reference() = 128-bit unique token
```

## Assignment Specification

Implement `src/named_kv_actor.erl` registered under atom `named_kv_actor`:

1. `start_registered() -> {ok, pid()} | {error, already_started}`:
   - Checks if `named_kv_actor` is already registered via `whereis/1`. If so, returns `{error, already_started}`.
   - If `undefined`, spawns `loop(#{}) `, registers it under `named_kv_actor`, and returns `{ok, Pid}`.
2. `put(Key, Value) -> ok | {error, not_running} | {error, timeout}`:
   - Safely checks `whereis(named_kv_actor)`. If `undefined`, returns `{error, not_running}`.
   - Generates `Ref = make_ref()`, sends `{put, Ref, self(), Key, Value}`, and receives `{reply, Ref, ok}` with a 1,000ms timeout.
3. `get(Key) -> {ok, Value} | {error, not_found} | {error, not_running} | {error, timeout}`:
   - Safely checks `whereis(named_kv_actor)`. If `undefined`, returns `{error, not_running}`.
   - Generates `Ref = make_ref()`, sends `{get, Ref, self(), Key}`, and receives `{reply, Ref, Result}` with a 1,000ms timeout.
4. `stop() -> ok | {error, not_running} | {error, timeout}`:
   - Safely checks `whereis(named_kv_actor)`. If `undefined`, returns `{error, not_running}`.
   - Generates `Ref = make_ref()`, sends `{stop, Ref, self()}`, and receives `{reply, Ref, ok}`.
5. `loop(Map) -> ok`:
   - Handles `put`, `get`, and `stop` (unregistering the name before exiting).

## Rules & Verification Constraints

- Must call `erlang:make_ref/0`, `erlang:register/2`, and `erlang:whereis/1`.
- Enforced by AST rule: `requiredCalls: ["erlang:make_ref/0", "erlang:register/2", "erlang:whereis/1"]`.
- `loop/1` must be tail-recursive.
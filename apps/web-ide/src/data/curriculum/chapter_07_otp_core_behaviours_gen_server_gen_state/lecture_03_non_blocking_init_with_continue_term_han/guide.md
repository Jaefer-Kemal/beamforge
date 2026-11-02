## Why This Matters in Production

In production backend clusters, slow startup times can bring down an entire system during a rolling deployment.
When a supervisor starts a child process via `gen_server:start_link`, **the supervisor process freezes and blocks until the child's `init/1` callback returns**!

If `init/1` executes slow operations (such as loading 10,000 cached records from disk or waiting for a network handshake), the parent supervisor is held hostage. If the supervisor takes longer than its startup timeout (typically 5,000ms), it crashes, triggering a catastrophic cascading failure up the supervision tree.

To eliminate this architectural risk, OTP 21 introduced **`{continue, Term}`** and **`handle_continue/2`**.

## Deep Concept Breakdown & Under the Hood

### The Non-Blocking `{continue, Term}` Protocol

Instead of performing expensive initialization inside `init/1`, your `init/1` callback returns a 3-element tuple:

```erlang
init(Args) ->
    InitialState = #{status => booting, items => #{}},
    {ok, InitialState, {continue, hydrate_defaults}}.
```

Here is what happens inside the BEAM:
1. `gen_server:start_link` immediately returns `{ok, Pid}` to the supervisor in less than 5 microseconds.
2. Before the `gen_server` engine processes **any** incoming `call` or `cast` message in its mailbox, it guarantees that **`handle_continue(hydrate_defaults, State)` is executed first**!
3. The process state transitions safely to `ready` without blocking parent supervisors during node boots.

### Why Periodic Timers Arrive in `handle_info/2`

A production `gen_server` frequently needs to run background maintenance tasks (such as purging expired TTL sessions, sweeping caches, or emitting telemetry).

In Erlang, you schedule a timer using the built-in function `erlang:send_after(TimeMs, self(), Message)`.

Why does this message arrive in `handle_info/2` instead of `handle_cast/2`?
- `gen_server:cast/2` wraps your term in an internal tuple: `{'$gen_cast', Message}`. The OTP engine checks for this prefix.
- Messages sent via `erlang:send_after/3`, raw `!`, socket events (`{tcp, Sock, Data}`), or monitor signals (`{'DOWN', ...}`) lack the `'$gen_cast'` wrapper.
- Therefore, the OTP engine routes all unwrapped messages directly to your **`handle_info(Info, State)`** callback!

```erlang
%% Scheduling a self-tick every 1,000 milliseconds
handle_continue(start_timer, State) ->
    erlang:send_after(1000, self(), cleanup_tick),
    {noreply, State}.

handle_info(cleanup_tick, State) ->
    NewState = purge_expired(State),
    erlang:send_after(1000, self(), cleanup_tick), %% Reschedule
    {noreply, NewState}.
```

> [!warning] Production OTP Trap: Swallowing Unknown Messages in handle_info
> Always include a defensive catch-all clause at the bottom of your `handle_info/2` implementation:
> `handle_info(_Unknown, State) -> {noreply, State}.`
> If an unexpected message (such as a delayed monitor `'DOWN'` or an OS signal) arrives and no clause matches, your `gen_server` will immediately crash with a `function_clause` runtime error!

## Parallel Worked Example

The following cache module hydrates default items after startup and purges expired entries using `handle_info`:

```erlang
-module(temp_cache).
-behaviour(gen_server).
-export([start_link/0, put/2, get/1]).
-export([init/1, handle_continue/2, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

start_link() -> gen_server:start_link(?MODULE, [], []).
put(Pid, Key) -> gen_server:cast(Pid, {put, Key, erlang:system_time(second)}).
get(Pid) -> gen_server:call(Pid, get_all).

init([]) ->
    {ok, #{items => #{}}, {continue, seed_cache}}.

handle_continue(seed_cache, State) ->
    erlang:send_after(500, self(), tick),
    {noreply, State#{items => #{default => erlang:system_time(second)}}}.

handle_call(get_all, _From, State = #{items := Items}) ->
    {reply, Items, State}.

handle_cast({put, K, V}, State = #{items := Items}) ->
    {noreply, State#{items := maps:put(K, V, Items)}}.

handle_info(tick, State) ->
    erlang:send_after(500, self(), tick),
    {noreply, State}.

terminate(_R, _S) -> ok.
code_change(_Old, S, _E) -> {ok, S}.
```

## Assignment Specification

Implement `src/session_ttl_server.erl` managing in-memory user sessions with automated TTL expiration:
1. `start_link(TtlSeconds) -> {ok, Pid}`:
   - Returns immediately with `{ok, #{ttl => TtlSeconds, sessions => #{}}, {continue, hydrate_defaults}}`.
2. `handle_continue(hydrate_defaults, State)`:
   - Seeds a default guest session: `<<"guest">> => erlang:system_time(second)`.
   - Schedules the first expiration tick: `erlang:send_after(1000, self(), cleanup_tick)`.
   - Returns `{noreply, StateWithGuest}`.
3. `create_session(Pid, SessionId)`:
   - Synchronously associates `SessionId => erlang:system_time(second)` in the sessions map. Returns `ok`.
4. `is_valid(Pid, SessionId) -> boolean()`:
   - Checks if `SessionId` exists and `(Now - CreatedAt) =< TtlSeconds`.
5. `get_active_count(Pid) -> non_neg_integer()`:
   - Returns the count of currently stored sessions in the map.
6. `handle_info(cleanup_tick, State)`:
   - Purges all sessions where `Now - CreatedAt > TtlSeconds`.
   - Re-arms the timer via `erlang:send_after(1000, self(), cleanup_tick)`.
   - Returns `{noreply, PurgedState}`.
7. `stop(Pid) -> ok`.

## Rules & Verification Constraints

- Must export `handle_continue/2` and return `{continue, hydrate_defaults}` from `init/1`.
- Must use `erlang:send_after/3` to schedule `cleanup_tick`.
- All timestamps must be generated using `erlang:system_time(second)`.

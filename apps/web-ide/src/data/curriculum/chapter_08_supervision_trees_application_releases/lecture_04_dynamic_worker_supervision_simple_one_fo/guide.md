## Why This Matters in Production

Standard supervisors (`one_for_one`, `rest_for_one`) supervise a **static list of known children** declared at boot time.

However, modern systems frequently require **dynamic process pools**:
- A TCP server spawning a new worker process for every incoming connection.
- An XMPP server creating a dedicated state machine for every logged-in user session.
- A background job queue spawning workers on demand.

For this pattern, OTP provides the **`simple_one_for_one`** supervisor strategy.

### How `simple_one_for_one` Works

1. **Zero Children at Boot:** When `dynamic_session_sup:start_link()` runs, the supervisor starts with **zero** active children.
2. **Single Child Spec Template:** The `init/1` callback returns a list containing **exactly one** child specification template.
3. **Dynamic Spawning via `supervisor:start_child/2`:**
   - The template defines the starting MFA: `start => {session_worker, start_link, []}`.
   - When a caller invokes `supervisor:start_child(SupRef, [SessionId, UserId])`, the supervisor **appends** the arguments in the second parameter to the template's start MFA list!
   - This dynamically executes: `session_worker:start_link(SessionId, UserId)`.

### Eliminating the Mixed Supervisor/Worker Anti-Pattern

> [!warning] Production Supervision Trap: Overloading Supervisor init/1
> A common beginner mistake is cramming both `-behaviour(supervisor).` and `-behaviour(gen_server).` into the same file by overloading `init/1`:
> ```erlang
> %% ANTI-PATTERN: DO NOT DO THIS!
> init([]) -> {ok, {SupFlags, [Template]}};  %% Supervisor callback
> init({worker, SessionId}) -> {ok, State}.   %% Worker callback!
> ```
> This causes severe cognitive friction, mixes lifecycle management with business state, and breaks OTP tooling.
> **The Idiomatic OTP Architecture:**
> - File 1: `src/dynamic_session_sup.erl` (`-behaviour(supervisor).`)
> - File 2: `src/session_worker.erl` (`-behaviour(gen_server).`)

Look at the second tab in your editor: `session_worker.erl` is already written as a clean, separate `gen_server` worker. Your job is to implement the supervisor `dynamic_session_sup.erl`!

### Parallel Worked Example

```erlang
-module(dynamic_pool_sup).
-behaviour(supervisor).
-export([start_link/0, add_worker/2, count_active/1, remove_worker/2, init/1]).

start_link() ->
    supervisor:start_link(?MODULE, []).

init([]) ->
    SupFlags = #{
        strategy => simple_one_for_one,
        intensity => 10,
        period => 5
    },
    ChildTemplate = #{
        id => pool_worker,
        start => {pool_worker, start_link, []},
        restart => temporary,
        shutdown => 2000,
        type => worker,
        modules => [pool_worker]
    },
    {ok, {SupFlags, [ChildTemplate]}}.

add_worker(SupRef, TaskId, Priority) ->
    supervisor:start_child(SupRef, [TaskId, Priority]).

count_active(SupRef) ->
    Counts = supervisor:count_children(SupRef),
    case is_map(Counts) of
        true  -> maps:get(active, Counts, 0);
        false -> proplists:get_value(active, Counts, 0)
    end.

remove_worker(SupRef, ChildPid) ->
    supervisor:terminate_child(SupRef, ChildPid).
```

### Your Mission

Implement module `dynamic_session_sup` with `-behaviour(supervisor).` exporting:
1. `start_link/0 -> {ok, pid()}`:
   - Calls `supervisor:start_link({local, ?MODULE}, ?MODULE, [])`.
2. `init([]) -> {ok, {SupFlags, [ChildTemplate]}}`:
   - Returns `SupFlags = #{strategy => simple_one_for_one, intensity => 10, period => 5}`.
   - Returns a single `ChildTemplate` with `id => session_worker`, `start => {session_worker, start_link, []}`, `restart => temporary`, `shutdown => 2000`, `type => worker`, `modules => [session_worker]`.
3. `start_session(SupRef, SessionId, UserId) -> {ok, pid()}`:
   - Invokes `supervisor:start_child(SupRef, [SessionId, UserId])`.
4. `count_sessions(SupRef) -> integer()`:
   - Invokes `supervisor:count_children(SupRef)` and extracts the active child count.
5. `terminate_session(SupRef, ChildPid) -> ok`:
   - Invokes `supervisor:terminate_child(SupRef, ChildPid)`.

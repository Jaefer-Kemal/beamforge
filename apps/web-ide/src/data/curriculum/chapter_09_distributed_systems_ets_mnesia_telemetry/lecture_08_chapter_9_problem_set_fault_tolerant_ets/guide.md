## Why This Matters in Production

In a high-scale production backend, authentication tokens and session payloads are checked on every single inbound HTTP or WebSocket request. If your session store lives in an ordinary `gen_server`, that process becomes a single-threaded bottleneck for thousands of concurrent requests.

By combining **ETS** with the **Heir Failover Handshake**, you achieve the holy grail of distributed backend architecture:
1. **Unbounded Read Concurrency**: Reads query the ETS table directly in memory in C without messaging the server.
2. **Zero Data Loss on Crash**: If the worker process crashes (e.g. unhandled payload or OOM crash), a dedicated **Heir Guardian** process catches the table via `{'ETS-TRANSFER', ...}`.
3. **Transparent Recovery**: When the supervisor restarts the worker, the new worker reclaims the existing ETS table from the guardian via `ets:give_away/3`, preserving 100% of user sessions and rate-limit counters!

> [!IMPORTANT]
> **Supervision Topology:**
> - `session_sup` (`one_for_one`) boots `table_manager` (heir guardian) first, then `session_cache` (worker).
> - If `session_cache` crashes, BEAM immediately delivers `{'ETS-TRANSFER', Tab, ...}` to `table_manager`.
> - Supervisor restarts `session_cache`, and `table_manager` transfers the table back via `ets:give_away/3` with 0% data loss!

## Deep Concept Breakdown & Under the Hood

### Multi-File Workspace Separation
This problem set is organized into three clean production modules:
1. **`src/session_sup.erl`**: A `one_for_one` supervisor starting `table_manager` first, followed by `session_cache`.
2. **`src/table_manager.erl`**: A dedicated guardian `gen_server` registered as `table_manager`.
   - Traps or receives `{'ETS-TRANSFER', Tab, _OldOwner, _Data}` and tracks held tables.
   - Handles `handle_call({claim_table, Tab}, {CallerPid, _}, State)` by calling `ets:give_away(Tab, CallerPid, restored)`.
3. **`src/session_cache.erl`**: The active session worker `gen_server` registered as `session_cache`.
   - On `init([])`: Checks if `session_cache_tab` exists. If not, creates it with `{heir, whereis(table_manager), session_backup}`. If it exists, calls `table_manager:claim_table(session_cache_tab)`.
   - Reads directly from ETS via `ets:lookup/2`.
   - Atomic increments via `ets:update_counter/3`.

## Assignment Specification

Implement the 3 modules:

### 1. `src/session_sup.erl`
- `start_link/0`: Starts supervisor registered as `session_sup`.
- `init/1`: Defines `one_for_one` supervisor with intensity 10, period 5, starting `table_manager` then `session_cache`.

### 2. `src/table_manager.erl`
- `start_link/0`: Starts gen_server registered as `table_manager`.
- `claim_table(Tab)`: Calls `gen_server:call(table_manager, {claim_table, Tab})`.
- `handle_info({'ETS-TRANSFER', Tab, _From, _Data}, State)`: Keeps track of the held table.
- `handle_call({claim_table, Tab}, {Caller, _}, State)`: Calls `ets:give_away(Tab, Caller, restored)`.

### 3. `src/session_cache.erl`
- `start_link/0`: Starts gen_server registered as `session_cache`.
- `start_pipeline/0`: Boots `session_sup:start_link()`.
- `stop_pipeline/0`: Stops `session_sup` and all children.
- `put_session(SessionId, UserId, MetaMap) -> ok`: Inserts `{SessionId, UserId, MetaMap, 0}` into `session_cache_tab`.
- `get_session(SessionId) -> {ok, #{user_id => UserId, meta => MetaMap, hit_count => HitCount}} | {error, not_found}`.
- `increment_hits(SessionId) -> {ok, integer()} | {error, not_found}`: Uses `ets:update_counter/3` at position 4.
- `delete_session(SessionId) -> ok`.
- `count_sessions() -> integer()`: Returns total row count.

## Rules & Verification Constraints
- Table name must be `session_cache_tab`.
- Must survive `exit(whereis(session_cache), kill)` with supervisor restart, table restitution, and 100% data preservation!

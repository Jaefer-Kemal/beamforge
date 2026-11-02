## Why This Matters in Production

In a high-throughput API gateway, thousands of concurrent requests need to validate auth tokens on every HTTP request. If token verification is handled by sending a message to a `gen_server`, that server's mailbox becomes a severe single-threaded bottleneck: 50,000 requests/sec will queue up, causing latency spikes and timeouts.

The standard OTP architectural solution is the **Protected ETS Architecture**:
1. A single `gen_server` owns a **`protected`** ETS table.
2. Only the owner process is permitted to write (inserting new tokens, refreshing leases). This eliminates write-write race conditions.
3. Any process across the entire BEAM VM can read directly from the ETS table with **lock-free concurrency** via `ets:lookup/2` or `ets:select/2`.
4. Over 100,000 concurrent client requests read auth data directly from C memory with **zero message passing and zero mailbox serialization**!

> [!NOTE]
> **ETS Access Protections:**
> - **`public`**: Any process can read and write.
> - **`protected` (Default)**: Any process can read; only the owner process can write.
> - **`private`**: Only the owner process can read or write.

## Deep Concept Breakdown & Under the Hood

### Pattern Matching with `ets:match_object/2`

For simple tuple pattern queries, `ets:match_object/2` uses the atom `'_'` as a wildcard:

```erlang
%% Matches any session for user 101 regardless of Token or CreatedAt
ets:match_object(Table, {session, '_', 101, '_'})
```

### Match Specifications (`ets:select/2` & `ets:select_delete/2`)

When you need conditional filtering (e.g., *"Find all tokens expired before Timestamp X"* or *"Delete all expired tokens in one atomic scan"*), `match_object` is not enough. You must use **Match Specifications**:

A match spec is a list of three-element tuples:
```erlang
[{HeadPattern, [GuardConditions], [ResultFormat]}]
```

1. **Head Pattern**: Tuple structure using match variables (`'$1'`, `'$2'`, `'$3'`, `'$4'`).
2. **Guard Conditions**: Boolean test expressions using prefix notation: `[{'<', '$4', CurrentTimestamp}]`.
3. **Result Format**: What to return: `['$2']` (returns UserId), or `[true]` for `select_delete`.

### Why Match Specs are Dramatically Faster

When you call `ets:select_delete(Tab, MatchSpec)`:
- The entire scan and deletion happens **inside the ERTS C runtime**.
- Non-matching records are never copied onto the Erlang process heap.
- Memory from expired rows is freed immediately without generating garbage collection overhead!

### Parallel Worked Example: Expired Job Eviction

```erlang
-module(job_cleaner).
-export([init_table/0, store_job/3, purge_completed/1]).

init_table() ->
    ets:new(jobs_tab, [set, public, named_table, {keypos, 2}]).

store_job(JobId, Status, CreatedAt) ->
    ets:insert(jobs_tab, {job, JobId, Status, CreatedAt}),
    ok.

purge_completed(CutoffTime) ->
    %% MatchSpec: delete all {job, JobId, completed, CreatedAt} where CreatedAt < CutoffTime
    MatchSpec = [
        {{job, '$1', completed, '$2'},
         [{'<', '$2', CutoffTime}],
         [true]}
    ],
    ets:select_delete(jobs_tab, MatchSpec).
```

## 📖 Official Erlang Docs & Function Reference

```erlang
%% Official ETS Match Calls (stdlib / ets)
ets:match_object(Tab, Pattern) -> [tuple()]
ets:select(Tab, MatchSpec) -> [term()]
ets:select_delete(Tab, MatchSpec) -> NumDeleted :: integer()
```

## Assignment Specification

Implement module `ets_query_engine` exporting:
1. `init_auth_table/0 -> ok`:
   - Creates a `named_table` named `auth_token_table` with options `[set, public, named_table, {keypos, 2}]`.
   - If the table already exists, returns `ok`.
2. `store_token(TokenBin, UserId, Role, ExpiresAt) -> ok`:
   - Inserts `{token, TokenBin, UserId, Role, ExpiresAt}` into `auth_token_table`.
3. `find_users_by_role(Role) -> [UserId]`:
   - Uses match specs or `ets:match_object/2` to return a list of unique `UserId` integers possessing that `Role`.
4. `delete_expired_tokens(CurrentTimestamp) -> integer()`:
   - Uses `ets:select_delete/2` to atomically purge all records where `ExpiresAt < CurrentTimestamp`.
   - Returns the integer count of purged records.

## Rules & Verification Constraints
- Table must use `{keypos, 2}` so `TokenBin` is the primary key.
- `delete_expired_tokens/1` must use `ets:select_delete/2`.

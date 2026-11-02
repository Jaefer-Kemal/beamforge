## Why This Matters in Production

Here is the single most dangerous architectural trap in Erlang caching:
**An ETS table is bound to the lifetime of the process that created it.**

If process `A` calls `ets:new(cache_tab, [named_table])`, and process `A` crashes 10 minutes later due to an unhandled exception or memory spike, the BEAM VM **instantly wipes `cache_tab` from off-heap RAM**! All cached database records, session states, and rate-limit counters vanish in zero milliseconds.

Even worse: when your supervisor restarts process `A` as process `A'`, process `A'` starts with an empty cache, causing a catastrophic **Cache Stampede (Thundering Herd)** on your database!

To prevent this, OTP provides the **ETS Heir Protocol** (`{heir, HeirPid, HeirData}` and `ets:give_away/3`).

> [!IMPORTANT]
> **The ETS Heir Failover Handshake:**
> 1. **Worker boots:** Creates table with `{heir, HeirPid, HeirData}`.
> 2. **Worker crashes:** BEAM VM intercepts crash and atomically transfers ownership to Heir.
> 3. **Heir receives:** `{'ETS-TRANSFER', Tab, DeadPid, HeirData}`. Table is completely preserved.
> 4. **Supervisor restarts Worker:** Worker asks Heir for table. Heir calls `ets:give_away(Tab, NewWorker, Data)`.
> 5. **NewWorker receives:** `{'ETS-TRANSFER', Tab, HeirPid, Data}`. Zero lost cached data!

## Deep Concept Breakdown & Under the Hood

### Step 1: Declaring the Heir on Creation

```erlang
ets:new(my_cache, [set, public, named_table, {heir, HeirPid, keep_alive}])
```

If `HeirPid` terminates before the table owner, the heir setting is automatically reset to `none`. You can dynamically update the heir using:

```erlang
ets:setopts(Tab, {heir, NewHeirPid, NewHeirData})
```

### Step 2: The Heir Transfer Message

When the owning process dies, BEAM preserves the table in off-heap memory and delivers to the heir's mailbox:

```erlang
{'ETS-TRANSFER', TableId, DeadOwnerPid, HeirData}
```

### Step 3: Giving Away the Table (`ets:give_away/3`)

When the restarted worker process is ready to resume ownership, the heir calls:

```erlang
ets:give_away(Tab, NewOwnerPid, GiftData)
```

The new owner process receives `{'ETS-TRANSFER', Tab, HeirPid, GiftData}` and immediately becomes the full legal owner of the table!

### Parallel Worked Example: Resilient Session Vault

```erlang
-module(resilient_vault).
-export([create_vault/2, handover_vault/3]).

create_vault(TableName, GuardianPid) ->
    ets:new(TableName, [
        set,
        public,
        named_table,
        {heir, GuardianPid, vault_heir_tag}
    ]).

handover_vault(TableName, NewWorkerPid, Tag) ->
    ets:give_away(TableName, NewWorkerPid, Tag).
```

## 📖 Official Erlang Docs & Function Reference

```erlang
%% Official ETS Heir Calls (stdlib / ets)
ets:setopts(Tab, Opts) -> true
  Opts = {heir, pid() | none, term()}

ets:give_away(Tab, Pid, GiftData) -> true
  Types:
    Tab = tab()
    Pid = pid()
    GiftData = term()
```

## Assignment Specification

Implement module `ets_heir_handshake` exporting:
1. `create_resilient_table(TableNameAtom, HeirPid) -> TableNameAtom`:
   - Creates a named `set` table with `[set, public, named_table, {heir, HeirPid, keep_alive}]` and returns `TableNameAtom`.
2. `start_guardian() -> {ok, pid()}`:
   - Spawns a dedicated guardian process that runs `guardian_loop/1`.
3. `reclaim_table(GuardianPid, Tab) -> ok` OR `reclaim_table(Tab, NewOwnerPid) -> ok`:
   - If called with Guardian PID first: requests transfer and waits for `{'ETS-TRANSFER', ...}`.
   - If called with Table first: calls `ets:give_away(Tab, NewOwnerPid, reclaimed)`.
4. `verify_heir_survival_demo() -> [tuple()]`:
   - Spawns an heir process and a temporary worker that calls `create_resilient_table(demo_heir_tab, HeirPid)`, inserts `{session_1, active}`, kills the worker with `exit(kill)`, waits for `{'ETS-TRANSFER', demo_heir_tab, _, keep_alive}` in the heir, and returns `ets:lookup(demo_heir_tab, session_1)` (`[{session_1, active}]`).

## Rules & Verification Constraints
- Table must be created with `{heir, HeirPid, keep_alive}`.
- Must call `ets:give_away/3` during table restitution.

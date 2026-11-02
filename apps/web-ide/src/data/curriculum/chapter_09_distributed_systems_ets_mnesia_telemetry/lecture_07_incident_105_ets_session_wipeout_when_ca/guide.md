## Production Incident Post-Mortem

At 14:22 UTC, an unhandled binary parsing exception crashed our authentication cache worker (`session_manager`). Although the OTP supervisor instantly restarted the worker in **1.8 milliseconds**, over **250,000 active sessions vanished from memory**. Customers worldwide were logged out mid-checkout, generating an avalanche of customer support tickets!

## Under the Hood: ETS Table Ownership Semantics

In the BEAM VM, an ETS table does NOT belong to the node or the supervisor — it is strictly owned by the **creating process**:

1. When a process calls `ets:new(Name, Options)`, that process becomes the sole **owner**.
2. If the owner process dies, the BEAM VM automatically deletes the table from off-heap RAM and frees all allocated memory.
3. If an OTP supervisor restarts the worker, the new worker receives a completely **empty** brand-new ETS table!

```erlang
%% BUGGY CODE: No heir specified!
create_session_table(HeirPid) ->
    %% Missing {heir, HeirPid, keep_alive}!
    %% When caller dies, this table is destroyed instantly!
    ets:new(incident_sessions_tab, [set, public, named_table]).
```

## The Production Pattern: The ETS Heir Handshake

To achieve zero-downtime, zero-loss crash resilience for in-memory state:

1. **Designate an Heir**: An upstream guardian process is designated as the table's heir via **`{heir, HeirPid, keep_alive}`**:
   ```erlang
   ets:new(incident_sessions_tab, [
       set,
       public,
       named_table,
       {read_concurrency, true},
       {heir, HeirPid, keep_alive}
   ]).
   ```
2. **Automatic Handover on Crash**: When the cache worker terminates, the BEAM runtime preserves the ETS table in off-heap RAM and reassigns ownership to `HeirPid`. The heir receives a special message in its mailbox:
   ```erlang
   {'ETS-TRANSFER', TableId, FormerOwnerPid, keep_alive}
   ```
3. **Restitution via `ets:give_away/3`**: When the supervisor restarts the cache worker, the heir transfers the preserved ETS table back to the new worker PID:
   ```erlang
   transfer_to_restarted_worker(TableId, NewWorkerPid, GiftData) ->
       ets:give_away(TableId, NewWorkerPid, GiftData).
   ```
All 250,000 user sessions survive the crash with zero data loss!

## Milestone 3: High-Concurrency ETS Tables & Process Monitors

### Why This Matters in Production
In an enterprise messaging backend, hundreds of thousands of users are concurrently online, sending stanzas and presence updates. If every routing lookup had to be processed synchronously through a single coordinator actor's message queue, that actor's mailbox would quickly become a massive CPU bottleneck.

To achieve maximum throughput, BeamForge uses a **hybrid Actor + ETS architecture**:
- **State Writes (Registration / Teardown)**: Handled by the `xmpp_session_registry` gen_server to establish process monitors and maintain consistency.
- **State Reads (Message Routing Lookups)**: Any routing worker executes direct, concurrent, lock-free reads from the public ETS table using `{read_concurrency, true}`.

> **ETS Registration Pipeline:** Client C2S processes register via `xmpp_session_registry:register_session/3`, which creates a unidirectional monitor (`erlang:monitor/2`) and inserts a record into the public ETS table `xmpp_sessions_tab` (`{read_concurrency, true}`).

### Deep Concept Breakdown: Process Monitors vs Links
Why does the registry use `erlang:monitor(process, C2sPid)` instead of `link(C2sPid)`?
- **Process Links (`link/1`)**: Links are **bidirectional**. If process A links to process B, and process B crashes with reason `killed` or `badmatch`, an exit signal is sent to process A. Unless process A explicitly traps exits with `process_flag(trap_exit, true)`, process A crashes too! In a registry tracking 50,000 client sockets, a bug in a client parser could bring down the entire registry.
- **Process Monitors (`monitor/2`)**: Monitors are **unidirectional**. The registry monitors `C2sPid`, receiving a unique reference (`MonitorRef`). If `C2sPid` crashes or its TCP socket drops, the BEAM VM automatically delivers an asynchronous message to the registry's mailbox:
  ```erlang
  {'DOWN', MonitorRef, process, DeadPid, Reason}
  ```
  The registry handles this message inside `handle_info/2`, purges the dead process from the ETS table, and cleans up without disturbing any other connection!

### Full JIDs vs Bare JIDs & Priority Dispatch (RFC 6121)
In the XMPP protocol:
- **Full JID**: `alice@localhost/desktop` (identifies a specific client socket connection).
- **Bare JID**: `alice@localhost` (identifies the account).

A user may be logged in simultaneously from multiple devices (e.g. iPhone with priority `5`, Desktop workstation with priority `10`). When another user sends a message to the bare JID `alice@localhost`:
1. The registry scans the ETS table for all sessions matching that bare JID.
2. It sorts the matching sessions in descending order of `Priority`.
3. It returns the PID of the session with the **highest numerical priority** (`[TopPid]`).

### Step-by-Step Assignment Task
1. Open `src/xmpp_session_registry.erl`.
2. In `ensure_table/0`, create a named public table `xmpp_sessions_tab` with `[named_table, public, set, {read_concurrency, true}]`.
3. In `handle_call({register_session, FullJidBin, Priority, C2sPid}, ...)`:
   - Parse `{BareJid, Resource}` with `parse_jid/1`.
   - Monitor the PID: `MRef = erlang:monitor(process, C2sPid)`.
   - Insert into ETS: `ets:insert(?TAB, {FullJidBin, BareJid, Resource, Priority, C2sPid, MRef})`.
   - Store `MRef => FullJidBin` in the `monitors` map in state.
4. In `lookup_by_jid/1`:
   - If `TargetJid` contains `<<"/">>` (Full JID): return `[Pid]` from `ets:lookup(?TAB, TargetJid)` or `[]`.
   - If `TargetJid` is a Bare JID: query all records matching `BareJid`, sort by priority descending, and return `[TopPid]` (or `[]` if none online).
5. In `handle_info({'DOWN', MRef, process, _DeadPid, _Reason}, State)`:
   - Find the registered `FullJid` mapped to `MRef` in `State.monitors`.
   - Delete the entry from the ETS table with `ets:delete(?TAB, FullJid)`.
   - Remove `MRef` from the monitors map.
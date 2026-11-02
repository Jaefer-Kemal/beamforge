## Milestone 5: Stanza Routing Engine & Offline Message Queue

### Why This Matters in Production
The final piece of our production XMPP architecture is the **Stanza Router**. The router acts as the central messaging switchboard: it decouples client connection processes from each other. Individual C2S connection actors do not need to know where recipient sockets are hosted; they simply pass outgoing stanzas to `xmpp_router:route_stanza/3`.

Furthermore, in mobile networks, users are frequently disconnected due to dead zones, subway tunnels, or app backgrounding. If a message arrives for an offline user, the router must safely spool the stanza in an offline message store so it can be delivered immediately upon the user's next login.

> **Routing Dispatch Semantics:** Incoming stanzas query `xmpp_session_registry:lookup_by_jid/1`. If target PIDs are online, the stanza is dispatched directly (`Pid ! {deliver_stanza, Xml}`); if offline, it is spooled into the router's in-memory `offline_store` map.

### Deep Concept Breakdown: Dispatch Semantics
When `route_stanza(FromFullJid, ToJid, XmlBin)` is called:
1. It queries `xmpp_session_registry:lookup_by_jid(ToJid)`.
2. **If PIDs are found (User is Online)**:
   It dispatches the raw XML directly to each target process's mailbox:
   ```erlang
   lists:foreach(fun(Pid) ->
       Pid ! {deliver_stanza, binary:copy(XmlBin)}
   end, TargetPids)
   ```
   And increments the internal `total_routed` telemetry counter.
3. **If no PIDs are found (User is Offline)**:
   It extracts the bare JID with `xmpp_session_registry:parse_jid(ToJid)`, retrieves the user's existing queue from the `offline_store` map (defaulting to `[]`), appends `binary:copy(XmlBin)`, and updates the map.

### Offline Message Retrieval
When a previously offline user finishes connecting and authenticating, their client requests unread messages:
- `pop_offline_messages(TargetJid)`: Extracts all pending stanzas for that user's bare JID, deletes them from the `offline_store` map, and returns `{ok, StanzaList}`.
- `get_offline_count(TargetJid)`: Returns an integer count of queued messages for monitoring.

### Step-by-Step Assignment Task
1. Open `src/xmpp_router.erl`.
2. In `init/1`, initialize the state map with `offline_store => #{}` and `total_routed => 0`.
3. In `handle_call({route_stanza, FromFullJid, ToJid, XmlBin}, ...)`:
   - Query `xmpp_session_registry:lookup_by_jid(ToJid)`.
   - If `TargetPids` is non-empty, deliver `{deliver_stanza, binary:copy(XmlBin)}` to each PID and return `{reply, {routed, length(TargetPids)}, NewState}`.
   - If empty, append `binary:copy(XmlBin)` to `offline_store[BareJid]` and return `{reply, {queued_offline, BareJid}, NewState}`.
4. In `handle_call({pop_offline, TargetJid}, ...)`:
   - Extract messages for `BareJid`, remove key from `offline_store`, and return `{reply, {ok, Messages}, NewState}`.
5. In `handle_call({get_offline_count, TargetJid}, ...)`:
   - Return `{reply, length(Messages), State}`.
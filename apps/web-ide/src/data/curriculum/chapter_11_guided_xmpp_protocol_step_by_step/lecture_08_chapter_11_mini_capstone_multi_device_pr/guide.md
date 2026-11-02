## Why This Matters in Production

In real-world chat networks, every active user is logged into multiple devices simultaneously: phone, smartwatch, desktop app, and web browser. 

When Bob sends a message to `alice@chat.beamforge.io` (a Bare JID), how does the server decide which of Alice's devices should ring? 

The answer is **RFC 6121 Section 8 (Priority-Based Message Routing & Presence Broadcast)**. This algorithm is the heartbeat of enterprise XMPP servers like ejabberd and MongooseIM.

> **RFC 6121 Multi-Device Priority Routing Rules:**
> 1. **Negative Priority Exclusion:** Sessions with negative priority (e.g. `Priority: -5` DND) are strictly excluded from message delivery.
> 2. **Highest Numerical Priority:** Messages delivered to a Bare JID are routed exclusively to the session with the highest positive priority.
> 3. **Tied Priority Fan-Out:** If multiple sessions share the identical highest priority, stanzas fan out to all tied sessions.
> 4. **Offline Fallback:** If all sessions are offline or negative priority, the stanza is stored in the offline message spool.

## Deep Concept Breakdown & Under the Hood

### 1. Data Representation
To represent active user sessions cleanly in Erlang memory without external database overhead:
- A session is represented as a 6-element tuple:
  ```erlang
  {session, FullJidBin, BareJidBin, ResourceBin, PriorityInt, WorkerPid}
  ```
- `PriorityInt` is an integer between `-128` and `127` (standard XMPP priority range).
- The user's roster subscriptions map stores mutual contacts:
  ```erlang
  RosterMap = #{BareJidBin => [ContactBareJid1, ContactBareJid2, ...]}
  ```

### 2. The 4 Core Operations
1. **`upsert_session/5`**: Adds or updates a session for a given Full JID. If the user reconnects from the same device (same Full JID), the old session entry is replaced with the new PID and priority.
2. **`remove_session_by_pid/2`**: When an Erlang C2S worker crashes or closes its TCP socket, the supervisor or monitor notifies the router. It must prune all sessions belonging to that dead PID using tail recursion.
3. **`resolve_message_targets/2`**:
   - If `TargetJid` is a **Full JID** (`user@host/res`) and that exact session is online: deliver to that specific PID.
   - If `TargetJid` is a **Bare JID** (or the target Full JID is offline): find all sessions for `BareJid` with `Priority >= 0`. Select the session(s) tied for the **highest priority** and return `{route_online, [HighestPids]}`.
   - If no online sessions with `Priority >= 0` exist: return `{store_offline, BareJid}`.
4. **`broadcast_presence/4`**:
   - When Alice's phone changes presence (e.g. goes online or sets away status), the server looks up Alice's contacts in `RosterMap`.
   - Sends `Pid ! {xmpp_presence, SenderFullJid, PresenceStanzaBin}` to all online sessions belonging to those contacts, **plus** Alice's own other connected devices!
   - Returns the count of distinct worker PIDs notified.

## Official Erlang Docs & Function Reference

```erlang
%% IETF RFC 6121 Section 8.3: Inbound Message Routing
%% Priority Rules:
%% - Sessions with negative priority MUST NOT receive bare-JID messages.
%% - Messages sent to bare JIDs MUST be delivered to the resource with
%%   the highest non-negative priority.
```

## Assignment Specification

Implement `src/xmpp_presence_router.erl` with the following exports:

```erlang
-module(xmpp_presence_router).
-export([
    upsert_session/5,
    remove_session_by_pid/2,
    resolve_message_targets/2,
    broadcast_presence/4
]).
```

### Function Details:
1. **`upsert_session(SessionsList, FullJid, Priority, Pid, RosterMap) -> UpdatedSessionsList`**:
   - Extracts `BareJid` and `Resource` from `FullJid`.
   - Replaces any existing entry with matching `FullJid` or adds `{session, FullJid, BareJid, Resource, Priority, Pid}`.
2. **`remove_session_by_pid(SessionsList, DeadPid) -> UpdatedSessionsList`**:
   - Must be implemented with **tail recursion**. Removes any session whose PID equals `DeadPid`.
3. **`resolve_message_targets(SessionsList, TargetJid) -> {route_online, [pid()]} | {store_offline, binary()}`**:
   - Applies RFC 6121 routing rules as specified above.
4. **`broadcast_presence(SessionsList, RosterMap, SenderFullJid, PresenceStanzaBin) -> integer()`**:
   - Finds all PIDs belonging to `SenderBareJid`'s roster contacts plus `SenderBareJid`'s other resources (excluding the sender PID itself).
   - Sends `Pid ! {xmpp_presence, SenderFullJid, PresenceStanzaBin}` to each.
   - Returns the integer count of delivered messages.

## Rules & Verification Constraints

- `remove_session_by_pid/2` must be strictly tail-recursive.
- Must honor negative priority exclusion (`Priority < 0`).
- Must correctly resolve tied highest-priority sessions by returning all tied PIDs.
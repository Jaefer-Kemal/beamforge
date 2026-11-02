## Milestone 1: The Root OTP Supervisor Hierarchy

### Why This Matters in Production
In production telecom backends, distributed message brokers, and mission-critical chat platforms (like WhatsApp, Discord, or ejabberd), software failure is not an unexpected anomaly—it is a guaranteed certainty. Hardware degrades, network sockets terminate abruptly, out-of-spec client frames trigger badmatch exceptions, and memory spikes occur under load.

The Erlang/OTP philosophy does not attempt to wrap every single line of code in defensive try/catch blocks. Instead, it embraces the **"Let It Crash"** design pattern. By structuring processes into a strict, hierarchical **Supervision Tree**, crashes are localized to small worker processes, while supervisor actors immediately restore deterministic state through automated, ordered restarts.

> **Supervision Hierarchy:** `xmpp_sup` (`rest_for_one`) supervises `xmpp_session_registry` (Child 1: ETS Shared Table Owner) and `xmpp_router` (Child 2: Message Dispatcher & Offline Spooler).

### Deep Concept Breakdown: Choosing the Supervisor Strategy
The core architectural decision in any supervisor is selecting the correct restart strategy from the 4 OTP strategies:

1. **`one_for_one`**: If a child terminates, only that child is restarted.
   - *Why it is DANGEROUS here:* The message router (`xmpp_router`) directly queries the in-memory ETS table owned by the session registry (`xmpp_session_registry`). If the registry crashes and restarts under `one_for_one`, its in-memory ETS table is deleted and recreated. If `xmpp_router` were left running, any concurrent lookup against the old table identifier causes silent routing dropouts or crashes!

2. **`one_for_all`**: If any child terminates, all other children are terminated and restarted.
   - *Why it is UNNECESSARILY DISRUPTIVE here:* If `xmpp_router` crashes due to a malformed XML stanza, there is zero reason to kill `xmpp_session_registry` and disconnect thousands of active client sessions!

3. **`rest_for_one`**: If a child process terminates, any child process started **after** it in the specification list is terminated and restarted in order.
   - *Why it is PERFECT here:* `xmpp_session_registry` is child #1, and `xmpp_router` is child #2. If the registry terminates, the router (started *after* it) is automatically terminated and cleanly restarted against the newly initialized registry. But if the router crashes, the registry is left untouched!

```
Process Startup Order:     1. xmpp_session_registry  -->  2. xmpp_router
Shutdown on Crash of #1:   1. Terminate xmpp_router  -->  2. Restart xmpp_session_registry  -->  3. Restart xmpp_router
Shutdown on Crash of #2:   1. Restart xmpp_router only (Registry untouched!)
```

### Supervisor Specification Anatomy
A supervisor callback module implements `init/1` and returns `{ok, {SupFlags, ChildSpecs}}`.

```erlang
SupFlags = #{
    strategy  => rest_for_one, %% Restart subsequent siblings on crash
    intensity => 5,            %% Maximum 5 restarts...
    period    => 10            %% ...within a 10-second sliding time window
}.
```

Each child specification in `ChildSpecs` is defined as a map:
- **`id`**: Unique atom identifier (`xmpp_session_registry`, `xmpp_router`).
- **`start`**: The MFA tuple `{Module, Function, Args}` invoked by the supervisor to spawn the process (e.g., `{xmpp_session_registry, start_link, []}`).
- **`restart`**: `permanent` specifies that the child worker must always be restarted if it terminates.
- **`shutdown`**: Grace period in milliseconds (`2000`) allowing the process to execute its `terminate/2` callback before the supervisor issues a brutal kill.
- **`type`**: `worker` (designating an actor performing business logic, as opposed to a nested `supervisor`).
- **`modules`**: `[Module]` containing callback modules for BEAM code hot-reloading.

### Step-by-Step Assignment Task
1. Open `src/xmpp_sup.erl`.
2. In `start_link/0`, register and boot the root supervisor locally under `?MODULE`:
   `supervisor:start_link({local, ?MODULE}, ?MODULE, []).`
3. In `init/1`, configure `SupFlags` with:
   - `strategy => rest_for_one`
   - `intensity => 5`
   - `period => 10`
4. In `ChildSpecs`, declare:
   - Child 1: `xmpp_session_registry` (permanent worker, 2000ms shutdown, start MFA `{xmpp_session_registry, start_link, []}`)
   - Child 2: `xmpp_router` (permanent worker, 2000ms shutdown, start MFA `{xmpp_router, start_link, []}`)
5. Return `{ok, {SupFlags, ChildSpecs}}`.

### Verification & Testing
When you click **Submit Milestone**, the test runner boots `xmpp_sup:start_link()`, calls `supervisor:which_children(xmpp_sup)`, verifies that both worker PIDs are alive, and validates that the restart strategy is strictly `rest_for_one`.
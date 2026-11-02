## Why This Matters in Production

Erlang's actor model was designed from day one for distributed computing. In Erlang, sending a message to a process on the same machine (`Pid ! Message`) uses the exact same syntax and semantics as sending a message to a process on a machine 5,000 miles away!

When building real-time global systems like WhatsApp, Discord, or multiplayer game servers:
1. **Mesh Clustering**: Multiple BEAM instances automatically discover and connect to each other.
2. **Magic Cookies**: Clusters enforce cryptographic authentication so unauthorized nodes cannot connect to the mesh.
3. **Decentralized Pub/Sub with `pg`**: In OTP 23+, the `pg` module replaced legacy `pg2`. It maintains distributed topic groups across all connected nodes without a single point of failure or centralized master process!

> [!NOTE]
> **Distributed Erlang Primitives:**
> - **`node/0`**: Returns the name of the current BEAM node (e.g. `app@node1.lan`).
> - **`nodes/0`**: Returns a list of all currently connected peer nodes in the cluster.
> - **`erlang:get_cookie/0`**: Returns the secret cookie token securing the cluster.
> - **`rpc:call/5`**: Executes a function on a remote node synchronously with a timeout.

## Deep Concept Breakdown & Under the Hood

### Node Naming and Magic Cookies

To enable distributed clustering, a BEAM node is started with either a short name or a fully qualified domain name:
- Short name: `erl -sname node_a -setcookie secret_cluster_key`
- Long name: `erl -name app@10.0.0.1 -setcookie secret_cluster_key`

When `node_a` connects to `node_b` (e.g. via `net_adm:ping('node_b@host')`), the Erlang Port Mapper Daemon (EPMD) negotiates a TLS or TCP handshake. The nodes exchange MD5 challenge digests derived from the magic cookie. If the cookies match, the nodes merge into a fully connected mesh!

### Location-Transparent Remote Procedure Calls (`rpc:call/4,5`)

```erlang
rpc:call(TargetNode, Module, Function, Args, TimeoutMs) -> Result | {badrpc, Reason}
```

If `TargetNode` is unreachable or execution exceeds `TimeoutMs`, `rpc:call` returns `{badrpc, nodedown}` or `{badrpc, timeout}`. In production, always normalize `{badrpc, Reason}` to clean `{error, {rpc_failed, Reason}}` tuples.

### Decentralized Process Groups with `pg` (OTP 23+)

The `pg` module manages distributed process groups:
- **`pg:start_link/0`**: Boots the default scope process.
- **`pg:join(Topic, Pid)`**: Adds `Pid` to the group `Topic`. This membership is broadcast to all nodes.
- **`pg:get_members(Topic)`**: Returns all live PIDs across the entire cluster subscribed to `Topic`.
- **`pg:leave(Topic, Pid)`**: Unsubscribes `Pid` from `Topic`.
- **Automatic Monitor Cleanup**: If any subscribed process crashes, `pg` automatically detects its demise via monitors and removes it from the group across all nodes!

### Parallel Worked Example: Cluster Health Monitor

```erlang
-module(cluster_health).
-export([ping_peer/1, broadcast_heartbeat/2]).

ping_peer(Node) ->
    case rpc:call(Node, erlang, is_alive, [], 1000) of
        true ->
            {ok, alive};
        {badrpc, Reason} ->
            {error, {peer_down, Reason}}
    end.

broadcast_heartbeat(Topic, Payload) ->
    case whereis(pg) of
        undefined -> pg:start_link();
        _ -> ok
    end,
    Members = pg:get_members(Topic),
    [P ! {heartbeat, Topic, Payload} || P <- Members],
    {sent, length(Members)}.
```

## 📖 Official Erlang Docs & Function Reference

```erlang
%% Official Distributed Calls (kernel / rpc & pg)
rpc:call(Node, Module, Function, Args, Timeout) -> Res | {badrpc, Reason}
pg:start_link() -> {ok, pid()} | {error, term()}
pg:join(Group, PidOrPids) -> ok
pg:leave(Group, PidOrPids) -> ok
pg:get_members(Group) -> [pid()]
```

## Assignment Specification

Implement module `cluster_pubsub_pg` exporting:
1. `cluster_node_info/0 -> map()`:
   - Returns `#{self_node => node(), connected_peers => nodes(), alive => is_alive()}`.
2. `safe_remote_call(TargetNode, Mod, Fun, Args) -> {ok, Result} | {error, {rpc_failed, Reason}}`:
   - Calls `rpc:call(TargetNode, Mod, Fun, Args, 2000)`.
   - Normalizes `{badrpc, Reason}` into `{error, {rpc_failed, Reason}}`.
   - Returns `{ok, Result}` on success.
3. `join_topic(Topic, Pid) -> ok`:
   - Ensures `pg` is started (`case whereis(pg) of undefined -> pg:start_link(); _ -> ok end`).
   - Calls `pg:join(Topic, Pid)` and returns `ok`.
4. `publish_to_topic(Topic, Message) -> {published, integer()}`:
   - Fetches `Members = pg:get_members(Topic)`.
   - Sends `P ! {pubsub, Topic, Message}` and `P ! {pubsub_msg, Topic, Message}` to each member.
   - Returns `{published, length(Members)}`.
5. `leave_topic(Topic, Pid) -> ok`:
   - Calls `pg:leave(Topic, Pid)` and returns `ok`.
6. Companion helpers:
   - `broadcast(Topic, Message)`: Alias for `publish_to_topic` returning `{ok, Count}`.
   - `get_subscribers(Topic)`: Returns `pg:get_members(Topic)`.
   - `init_pubsub()`: Boots `pg` if not already running.

## Rules & Verification Constraints
- Must use OTP 23+ `pg` primitives.
- Must handle RPC failures cleanly with 2000ms timeout.

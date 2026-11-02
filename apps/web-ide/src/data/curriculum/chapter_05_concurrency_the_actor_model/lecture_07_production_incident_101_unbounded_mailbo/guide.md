## Why This Matters in Production

At 03:14 UTC, a primary edge node running an IoT telemetry aggregator was killed by the Linux Out-Of-Memory (OOM) killer. Post-mortem crash analysis revealed that a single Erlang process—`telemetry_actor`—had ballooned to **14 GB of RAM**, holding over **1,200,000 unmatched messages** in its internal Save Queue!

Furthermore, client queries to `get_summary/1` had degraded from **0.2 milliseconds to 4,800 milliseconds** before timing out. The server was on the verge of a catastrophic cascading failure across all connected gateways.

## Deep Concept Breakdown & Under the Hood

### 1. Root Cause Analysis: The Leaky Save Queue
In Erlang, process mailboxes are **unbounded**. When an actor executes a `receive` block:
```erlang
%% BUGGY IMPLEMENTATION:
loop(State = #{count := Count, total := Total}) ->
    receive
        {record_metric, Val} ->
            loop(State#{count => Count + 1, total => Total + Val});
        {get_summary, From, Ref} ->
            From ! {summary, Ref, State},
            loop(State)
        %% DANGER: Missing catch-all clause!
    end.
```
1. Legacy hardware sensors and network monitors broadcast diagnostic tuples like `{legacy_heartbeat, Node, Timestamp}` and `{debug_trace, Bin}`.
2. When the telemetry actor runs `receive`, neither `{record_metric, ...}` nor `{get_summary, ...}` matches `{legacy_heartbeat, ...}`.
3. The BEAM places the heartbeat message into the actor's internal **Save Queue**.
4. Because the actor never matches these messages, **they are never removed**.
5. With 500 heartbeats arriving every second, the Save Queue grows by 1.8 million terms per hour.
6. When a valid `{get_summary, ...}` request finally arrives at the tail of the mailbox, the BEAM must scan past **all 1.8 million unmatched terms in memory**, turning an $O(1)$ receive into a CPU-crushing $O(N)$ linear pointer traversal!

### 2. The Solution: Defensive Mailbox Hygiene
To eliminate mailbox leaks in production actors:
1. **The Catch-All Wildcard Clause:** Always include a final wildcard clause in the `receive` block to discard unexpected messages and recurse with unchanged state:
   ```erlang
   _UnknownNoise ->
       loop(State)
   ```
2. **Client-Side Timeout Guards:** Client API functions that await a response should **never block indefinitely**. Always add `after 1000 -> {error, timeout}` to protect the caller from freezing if the actor is slow or restarted.

> [!warning] Production Concurrency Trap: Selective Receive Without Catch-All
> In long-lived singleton actors (registries, routers, telemetry pools), omitting a catch-all clause is the #1 cause of silent memory leaks in Erlang systems. Even if your current modules only send valid messages, third-party libraries, exit signals, or legacy nodes will eventually send unexpected messages to your PID.

## Parallel Worked Example

Consider a connection heartbeat auditor:

```erlang
-module(connection_auditor).
-export([start/0, log_ping/1, get_stats/1, loop/1]).

start() ->
    spawn(fun() -> loop(#{pings => 0}) end).

log_ping(Pid) ->
    Pid ! ping,
    ok.

get_stats(Pid) ->
    Ref = make_ref(),
    Pid ! {get_stats, self(), Ref},
    receive
        {stats, Ref, Stats} -> {ok, Stats}
    after 1000 ->
        {error, timeout}
    end.

loop(Stats = #{pings := Cnt}) ->
    receive
        ping ->
            loop(Stats#{pings := Cnt + 1});
        {get_stats, From, Ref} ->
            From ! {stats, Ref, Stats},
            loop(Stats);
        %% Mailbox Hygiene: Discard unexpected socket noise
        _IgnoredNoise ->
            loop(Stats)
    end.
```

## Official Erlang Docs & Function Reference

```erlang
%% Official OTP Signature (erts / erlang)
erlang:process_info(Pid, message_queue_len) -> {message_queue_len, integer()} | undefined
```

## Assignment Specification

Triage and fix `src/incident_mailbox_leak.erl`:
1. Inspect the pre-loaded starter code. Notice that `loop/1` lacks a catch-all clause and `get_summary/1` lacks a timeout guard.
2. In `loop/1`, add a catch-all clause:
   ```erlang
   _Unknown ->
       loop(State)
   ```
3. In `get_summary/1`, add an `after 1000 -> {error, timeout}` fallback to prevent hanging callers when the target process is dead or slow.
4. Export `inspect_queue_len/1` (and alias `get_mailbox_len/1`) using `erlang:process_info(Pid, message_queue_len)`.
5. Export `stop/1` so the actor terminates cleanly on `stop`.

## Rules & Verification Constraints

- Mailbox length must remain strictly `0` even after blasting 300 unhandled heartbeat messages at the process.
- `get_summary/1` must return `{error, timeout}` within 1,000ms when invoked against a dead PID.
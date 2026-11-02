## Why This Matters in Production

In production backends, individual worker processes will inevitably encounter hardware timeouts, unexpected corrupt payloads, or database connection drops. The foundational architectural superpower of Erlang and the BEAM VM is **Supervision Trees** (`-behaviour(supervisor).`).

Instead of writing defensive `try/catch` blocks around every statement, Erlang systems embrace the **"Let It Crash"** philosophy:
1. **Workers** execute risky business logic. When unexpected corruption occurs, the worker crashes immediately, destroying its tainted heap.
2. **Supervisors** execute zero business logic. They exist solely to monitor workers and restore them to a known-clean state.

However, restoring workers requires choosing the correct **Restart Strategy**. If an independent caching worker crashes, you must not take down the entire system. Conversely, if a shared database connection crashes, downstream workers that depend on it must be cleanly restarted so they do not operate on dead handles.

### The 4 OTP Restart Strategies

1. **`one_for_one` (Independent Workers):**
   - If a child process terminates, only that single child is restarted.
   - Siblings are completely unaffected.
   - *Ideal for:* Independent web request handlers, stateless calculators, isolated worker pools.

2. **`rest_for_one` (Sequential Dependency Pipeline):**
   - If a child process terminates, any child process started **after** it in the specification list is terminated in reverse order and restarted in forward order.
   - Preceding upstream children are completely untouched!
   - *Ideal for:* Pipeline architectures like `[db_pool -> pricing_cache -> order_gateway]`. If `pricing_cache` crashes, `order_gateway` restarts, but `db_pool` remains online.

3. **`one_for_all` (Tightly Coupled Cluster):**
   - If any child process terminates, **all** other child processes are immediately terminated and restarted together.
   - *Ideal for:* Mutually dependent peers, such as a protocol worker and its companion active state monitor where neither can function without the other.

4. **`simple_one_for_one` (Dynamic Worker Factory):**
   - A supervisor that manages a dynamic pool of identical workers spawned on demand (e.g. active TCP sockets or incoming chat sessions).
   - Holds a single template child spec and starts with zero children at boot.

### The Modern Map-Based `sup_flags()` Format

In modern Erlang/OTP, the supervisor callback `init/1` returns:

```erlang
{ok, {SupFlagsMap, [ChildSpecMap1, ChildSpecMap2, ...]}}
```

The `SupFlagsMap` specifies how the supervisor handles child failures:

```erlang
#{
    strategy => Strategy,    %% one_for_one | rest_for_one | one_for_all | simple_one_for_one
    intensity => Intensity,  %% Max allowable crashes (e.g., 3)
    period => Period         %% Sliding time window in seconds (e.g., 5)
}
```

> [!warning] Production Supervision Trap: Infinite Crash Loops
> If a child process has a fatal initialization bug (e.g., invalid database credentials), the supervisor could blindly restart it billions of times, consuming 100% CPU and filling disk logs in seconds.
> The `intensity` (MaxRestarts) and `period` (MaxSeconds) parameters define a restart rate limit:
> - If more than `Intensity` crashes occur within `Period` seconds, the supervisor concludes that the subsystem is unrecoverable.
> - It terminates all surviving children in reverse startup order and terminates itself with `shutdown`!
> - This escalates the failure up to the parent supervisor in the tree.

### Parallel Worked Example

Here is how a telecom supervisor configures its strategies and calculates its restart budget:

```erlang
-module(telecom_sup_planner).
-export([make_flags/3, route_strategy/1, eval_budget/2]).

make_flags(Strategy, MaxR, MaxT)
  when (Strategy =:= one_for_one orelse Strategy =:= rest_for_one orelse
        Strategy =:= one_for_all orelse Strategy =:= simple_one_for_one),
       is_integer(MaxR), MaxR >= 0,
       is_integer(MaxT), MaxT > 0 ->
    #{
        strategy => Strategy,
        intensity => MaxR,
        period => MaxT
    }.

route_strategy(independent_radios) -> one_for_one;
route_strategy(signal_pipeline)    -> rest_for_one;
route_strategy(dual_transceivers)  -> one_for_all;
route_strategy(dynamic_calls)      -> simple_one_for_one;
route_strategy(_)                  -> {error, unknown_topology}.

eval_budget(Crashes, Seconds)
  when is_integer(Crashes), is_integer(Seconds), Crashes >= 0, Seconds > 0 ->
    Rate = Crashes / Seconds,
    #{
        intensity => Crashes,
        period => Seconds,
        max_rate_per_sec => Rate,
        tolerated_downtime => ok
    }.
```

### Your Mission

Implement module `strategy_planner` exporting:
1. `build_sup_flags(Strategy, Intensity, Period) -> map()`:
   - Validates that `Strategy` is one of `[one_for_one, rest_for_one, one_for_all, simple_one_for_one]`.
   - Validates that `Intensity >= 0` and `Period > 0`.
   - Returns the standardized `#{strategy => Strategy, intensity => Intensity, period => Period}` map.
2. `select_strategy_for_topology(Topology) -> Strategy`:
   - Maps architecture descriptors to the optimal OTP restart strategy:
     - `independent_workers -> one_for_one`
     - `dependent_pipeline -> rest_for_one`
     - `coupled_cluster -> one_for_all`
     - `dynamic_pool -> simple_one_for_one`
     - Any other input returns `{error, unknown_topology}`.
3. `calculate_restart_budget(MaxCrashes, WindowSeconds) -> map()`:
   - Validates inputs (`MaxCrashes >= 0`, `WindowSeconds > 0`).
   - Calculates `Rate = MaxCrashes / WindowSeconds`.
   - Returns `#{intensity => MaxCrashes, period => WindowSeconds, max_rate_per_sec => Rate, tolerated_downtime => ok}`.

## Why This Matters in Production

What happens when a fatal dependency goes down—for instance, when the primary PostgreSQL database suffers a network partition, or a configuration file is corrupt?

If a `permanent` worker crashes immediately every time the supervisor starts it, what prevents the supervisor from spinning in an infinite 100% CPU restart loop that freezes the entire BEAM node?

### The OTP Sliding Window Rate Limiter

Every OTP supervisor implements an internal sliding window algorithm specified by two parameters in `sup_flags()`:
- **`intensity => MaxR`**: The maximum number of allowable crashes.
- **`period => MaxT`**: The sliding time window in seconds.

Whenever any child process terminates abnormally:
1. The supervisor records the current monotonic timestamp in its internal `restarts` queue.
2. It discards all recorded timestamps that are older than `MaxT` seconds relative to the latest crash.
3. It counts the number of crashes that occurred within the window `[Latest - MaxT, Latest]`.
4. **The Decision Point:**
   - If `CrashCount <= MaxR`: The supervisor stays within its restart budget. It restarts the child according to its strategy (`one_for_one`, `rest_for_one`, etc.).
   - If `CrashCount > MaxR`: The supervisor declares **Max Restart Intensity Exceeded**!

### The Upward Crash Escalation Cascade

When the restart intensity budget is exceeded:
1. The supervisor stops attempting to restart children. It recognizes that the problem is systemic and cannot be solved locally.
2. It terminates all of its surviving children in **strict reverse order** of startup.
3. It terminates **itself** with reason `shutdown`!
4. Because the supervisor is linked to its parent supervisor, its own termination triggers an exit signal up the supervision tree.
5. The parent supervisor now handles the failure—either restarting this entire subsystem or escalating further up to the root supervisor of the application release!

### Downstream Shutdown Order in `rest_for_one`

In a `rest_for_one` supervision tree with children `[db_pool, pricing_cache, order_gateway]`:
- If `pricing_cache` crashes, the affected children are `[pricing_cache, order_gateway]`.
- **Termination Order:** Downstream children must be stopped in **strict reverse order**: `order_gateway` is stopped first, then `pricing_cache`.
- **Restart Order:** They are restarted in **forward dependency order**: `pricing_cache` is restarted first, then `order_gateway`!
- The upstream dependency `db_pool` remains untouched.

> [!warning] Production Supervision Trap: Intensity Blizzard CPU Starvation
> Setting `intensity => 1000, period => 1` effectively disables crash throttling. If a bug causes an immediate crash on boot, the BEAM VM will spend 100% of its CPU cycles in supervisor loops, starving other schedulers. Always choose sensible values (e.g. `intensity => 3..5, period => 5..10`).

### Parallel Worked Example

```erlang
-module(crash_escalator_demo).
-export([check_window/3, downstream_order/2]).

check_window([], _MaxR, _MaxT) ->
    {ok, within_budget};
check_window(Timestamps, MaxR, MaxT) ->
    Latest = lists:max(Timestamps),
    Cutoff = Latest - MaxT,
    Recent = [T || T <- Timestamps, T >= Cutoff, T =< Latest],
    case length(Recent) > MaxR of
        true -> {escalate, length(Recent), MaxR};
        false -> {ok, length(Recent), MaxR}
    end.

downstream_order(AllChildren, TargetId) ->
    case lists:splitwith(fun(Id) -> Id =/= TargetId end, AllChildren) of
        {_Prefix, []} -> {error, not_found};
        {_Prefix, Affected} ->
            {reverse_stop, lists:reverse(Affected), forward_restart, Affected}
    end.
```

### Your Mission

Implement module `escalation_analyzer` exporting:
1. `evaluate_crash_burst(CrashTimestampsSecList, MaxR, MaxT) -> {escalate_to_parent, Count, MaxR} | {within_budget, Count, MaxR}`:
   - If list is empty, returns `{within_budget, 0, MaxR}`.
   - Finds `Latest = lists:max(CrashTimestampsSecList)`.
   - Counts timestamps `Ts` satisfying `(Latest - MaxT) =< Ts andalso Ts =< Latest`.
   - If `Count > MaxR`, returns `{escalate_to_parent, Count, MaxR}`; otherwise returns `{within_budget, Count, MaxR}`.
2. `plan_escalation_action(ChildOrderList, CrashedChildId) -> {stop_in_reverse_order, ToStopReverseList, restart_in_order, ToRestartForwardList} | {error, child_not_found}`:
   - Locates `CrashedChildId` in `ChildOrderList`. Returns `{error, child_not_found}` if missing.
   - Extracts the crashed child and all downstream children: `Affected = [CrashedChildId | Downstream]`.
   - Computes `ToStopReverseList = lists:reverse(Affected)`.
   - Computes `ToRestartForwardList = Affected`.
   - Returns `{stop_in_reverse_order, ToStopReverseList, restart_in_order, ToRestartForwardList}`.
3. `reverse_shutdown_order(StartupChildIdsList) -> list()`:
   - Returns `lists:reverse(StartupChildIdsList)`.

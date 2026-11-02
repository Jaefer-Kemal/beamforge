## Postmortem & Triage Lab: Incident #104

You are on call for the authentication gateway cluster. At 03:14 UTC, an alert triggered:

> **CRITICAL OUTAGE:** Authentication requests are failing with `{error, bad_cache_pid}`. Downstream `api_router` is logging thousands of dead process crashes, while the supervisor itself remains idle and the cache process is nowhere to be found!

### System Topology

The authentication subsystem is a sequential dependency pipeline:
```
[worker_db] -> [worker_cache] -> [worker_http]
```
1. `worker_db`: Manages the primary credentials database.
2. `worker_cache`: In-memory cache dependent on `worker_db`.
3. `worker_http`: External HTTP routing gateway dependent on `worker_cache`.

### Root Cause Analysis

Inspecting `incident_wrong_strategy:init/1` reveals three critical bugs:
1. **Wrong Strategy (`one_for_one`):** When `worker_cache` crashes, `one_for_one` ignores downstream `worker_http`. The HTTP gateway continues running, attempting to query a dead cache PID!
2. **Temporary Restart Policy (`temporary`):** `worker_cache` was marked `restart => temporary`! When it crashed under memory pressure, the supervisor never restarted it at all!
3. **Zero Restart Intensity (`intensity => 0`):** The supervisor configured `intensity => 0`, meaning if *any* process crashed, the supervisor would commit suicide immediately!

### Triage & Fix Objective

1. Update the restart strategy to **`rest_for_one`**.
2. Set **`intensity => 5, period => 10`** to tolerate transient blizzards.
3. Update all 3 child specifications to **`restart => permanent`**.
4. Keep `shutdown => 2000`, `type => worker`, and `modules => [incident_wrong_strategy]`.

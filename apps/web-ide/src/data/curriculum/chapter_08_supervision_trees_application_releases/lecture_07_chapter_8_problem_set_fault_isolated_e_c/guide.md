## Architectural Mission: E-Commerce Checkout Pipeline

Welcome to the Chapter 8 Problem Set! You will architect a production-grade, fault-isolated **E-Commerce Checkout Supervision Tree**.

In real-world e-commerce backends, checkout pipelines consist of strictly ordered micro-services:
1. **`db_pool`**: Database connection pool maintaining long-lived TCP connections. Must remain stable at all costs.
2. **`pricing_cache`**: Fast in-memory caching worker dependent on `db_pool`.
3. **`order_gateway`**: Payment and order submission gateway dependent on `pricing_cache`.

### Architectural Requirements

1. **Strategy Selection:**
   - The supervision tree must use **`rest_for_one`** with **`intensity => 5, period => 10`**.
   - If `order_gateway` crashes, only `order_gateway` restarts. `db_pool` and `pricing_cache` are unaffected.
   - If `pricing_cache` crashes, `pricing_cache` and `order_gateway` restart in dependency order. `db_pool` is untouched.
   - If `db_pool` crashes, the entire pipeline is cleanly restarted in order.

2. **Strict Clean Worker Separation:**
   - Look at the second tab in your editor: `src/checkout_worker.erl` is already implemented as a clean, separate `gen_server` worker.
   - In `src/checkout_sup.erl`, configure each child spec with:
     - `start => {checkout_worker, start_link, [RegisteredName, Role]}`
     - Child 1: `id => db_pool`, `start => {checkout_worker, start_link, [db_pool_worker, db]}`
     - Child 2: `id => pricing_cache`, `start => {checkout_worker, start_link, [pricing_cache_worker, cache]}`
     - Child 3: `id => order_gateway`, `start => {checkout_worker, start_link, [order_gateway_worker, gateway]}`
     - All 3 children must have `restart => permanent`, `shutdown => 5000`, `type => worker`, and `modules => [checkout_worker]`.

3. **Pipeline PID Introspection (`get_pipeline_pids/0`):**
   - Calls `supervisor:which_children(?MODULE)`.
   - Locates each child by its ID tuple (or registered process fallback).
   - Returns `{ok, #{db_pid => DbPid, cache_pid => CachePid, gateway_pid => GatewayPid}}`.

### The 3-Stage Live Chaos Test

Your supervision tree will be subjected to automated chaos injection in the test suite:
- **Chaos 1:** `order_gateway` is killed with `exit(kill)`. Confirms ONLY Child 3 restarted; DB and Cache PIDs match their original values.
- **Chaos 2:** `pricing_cache` is killed with `exit(kill)`. Confirms Child 2 and Child 3 received NEW PIDs, while DB Pool PID is preserved!
- **Chaos 3:** `db_pool` is killed with `exit(kill)`. Confirms all 3 processes are restarted in sequence with new PIDs!

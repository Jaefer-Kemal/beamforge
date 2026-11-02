## Why This Matters in Production

In financial technology and high-volume transaction gateways, two requirements are absolute:
1. **Zero Double-Charges (Idempotency):** Network timeouts and retries must never cause a customer's credit card to be charged twice for the same purchase.
2. **Crash Resilience Without State Loss:** If a payment worker process encounters a poison pill payload or hardware fault and crashes, all previously settled transaction records must remain 100% durable in memory!

In traditional multithreaded languages, engineers attempt to achieve this with distributed locks and database transactions, which introduce lock contention and latency spikes.

In Erlang, we achieve this through **Separation of Concerns across Actors**:
- **The Watcher / Coordinator Process:** A durable, long-lived process holding the committed transaction store (`tx_store`) keyed by `RequestId` (**Idempotency Key**). It never performs risky validation or network calls directly.
- **The Disposable Payment Worker:** A monitored sub-process that validates and executes charges. If it crashes, the Watcher catches the `'DOWN'` message, spawns a pristine replacement worker up to `MaxRestarts`, and continues serving traffic with zero data loss!

## Deep Concept Breakdown & Under the Hood

### 1. The 3-Step Idempotent Charge Protocol
When a client invokes `charge(WatcherPid, RequestId, Amount, Currency)`:
1. **Step 1 (Idempotency Check):** The Watcher checks if `RequestId` already exists in its `tx_store`. If found, it immediately returns `{ok, {already_processed, SavedReceipt}}` without contacting the worker!
2. **Step 2 (Delegated Worker Execution):** If new, the Watcher delegates `{validate_and_charge, RequestId, Amount, Currency}` to its active `worker_pid`.
   - The worker validates:
     - `Amount > 0` and `is_integer(Amount)` -> if invalid, replies `{error, invalid_amount}` (business validation, worker stays alive).
     - `Currency in [usd, eur, etb]` -> if invalid, replies `{error, unsupported_currency}`.
     - Valid -> returns `{ok, #{tx_id => RequestId, amount => Amount, currency => Currency, status => settled}}`.
3. **Step 3 (Durable Commit):** The Watcher inserts `RequestId => ReceiptMap` into its `tx_store` and replies to the client with `{ok, ReceiptMap}`.

### 2. Automatic Worker Replacement & Crash Testing
When `trigger_crash_test(WatcherPid)` is called:
- The active worker is commanded to exit with `exit(simulated_payment_worker_crash)`.
- The Watcher intercepts `{'DOWN', MRef, process, OldWorker, simulated_payment_worker_crash}`.
- If `restarts_left > 0`, the Watcher decrements `restarts_left`, increments `restart_count`, spawns a fresh monitored worker, and preserves the entire `tx_store`!
- If `restarts_left == 0`, the Watcher records that no active worker is available and returns `{error, max_restarts_exceeded}`.

## Assignment Specification

Implement `src/payment_system.erl` with the following exports:
```erlang
-module(payment_system).
-export([
    start_system/1,
    charge/4,
    trigger_crash_test/1,
    get_active_worker/1,
    get_processed_txs/1,
    stop_system/1,
    watcher_loop/1,
    worker_loop/0
]).
```

1. `start_system(MaxRestarts) -> {ok, WatcherPid}`:
   - Spawns Watcher, which spawns and monitors the initial worker.
   - Initial state: `#{worker_pid => W, worker_mref => MRef, restarts_left => MaxRestarts, restart_count => 0, tx_store => #{}}`.
2. `charge(WatcherPid, RequestId, Amount, Currency) -> {ok, ReceiptMap} | {ok, {already_processed, ReceiptMap}} | {error, Reason}`.
3. `trigger_crash_test(WatcherPid) -> {ok, OldWorkerPid, NewWorkerPid} | {error, max_restarts_exceeded}`.
4. `get_active_worker(WatcherPid) -> {ok, WorkerPid, RestartCount} | {error, no_active_worker}`.
5. `get_processed_txs(WatcherPid) -> #{RequestId => ReceiptMap}`.
6. `stop_system(WatcherPid) -> ok`.

## Rules & Verification Constraints

- Must maintain `tx_store` durability across worker crashes.
- `watcher_loop/1` must be tail-recursive (`requireTailRecursion: ["watcher_loop/1"]`).

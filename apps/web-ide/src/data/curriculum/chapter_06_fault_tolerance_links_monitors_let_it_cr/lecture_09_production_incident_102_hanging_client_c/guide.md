## Why This Matters in Production

At 14:22 UTC, the e-commerce checkout gateway suffered a cascading outage. Customers attempting to purchase promotional items experienced 5-second spinning wheels, and frontend web server connection pools were 100% exhausted.

The post-mortem revealed that an inventory price sync bug caused `pricing_worker` to crash with `badarith` on certain SKUs. Because the client function `call_pricing_worker/2` relied strictly on `make_ref()` and `receive ... after 5000`, every single client process blocked for the full 5,000 milliseconds waiting for a reply from a dead process.

## Deep Concept Breakdown & Under the Hood

### Root Cause: Blind Receive Without Process Monitoring
```erlang
%% BUGGY IMPLEMENTATION:
call_pricing_worker(WorkerPid, Item) ->
    Ref = make_ref(),
    WorkerPid ! {get_price, self(), Ref, Item},
    receive
        {price, Ref, Price} -> {ok, Price}
    after 5000 ->
        {error, timeout}
    end.
```
1. Client sends request to `WorkerPid`.
2. `WorkerPid` crashes 0.1ms later due to invalid data.
3. No reply tuple is ever sent.
4. Client has no link and no monitor attached to `WorkerPid`. The client is completely blind to the crash!
5. Client remains suspended until the 5,000ms timeout expires.

### The Remedy: Attach Monitor for 0ms Crash Notification
To fix this production vulnerability:
1. Call `MRef = erlang:monitor(process, WorkerPid)` before sending the request.
2. In `receive`, match on `{price, MRef, Price}` (or correlated ref), flushing the monitor on reply.
3. Add a clause for `{'DOWN', MRef, process, WorkerPid, Reason}` that unblocks the caller immediately with `{error, {worker_down, Reason}}`.

## Assignment Specification

Triage and fix `src/incident_hanging_call.erl`:
1. In `call_pricing_worker/2`, attach `erlang:monitor(process, WorkerPid)`.
2. When the worker replies normally, call `erlang:demonitor(MRef, [flush])` and return `{ok, Price}`.
3. When the worker crashes mid-request, catch `{'DOWN', MRef, process, WorkerPid, Reason}` and return `{error, {worker_down, Reason}}` immediately (< 50ms).
4. Preserve export `start_pricing_worker/0` (and backward-compatible alias `start_worker/0`).

## Rules & Verification Constraints

- Crashed requests must return `{error, {worker_down, ...}}` in under 100ms.
- Valid requests must return `{ok, Price}`.

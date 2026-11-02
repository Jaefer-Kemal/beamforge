## Why This Matters in Production

In microservice ecosystems and public developer platforms (such as Stripe, GitHub, or AWS API Gateway), rate limiting is the primary defense line against distributed denial-of-service (DDoS) attacks, abusive web scrapers, and runaway client retry loops.

The gold standard for API throttling is the **Token-Bucket Algorithm**:
- Each client starts with a maximum bucket capacity of `MaxTokens`.
- Every incoming API request consumes $N$ tokens depending on its computational cost (e.g., `GET /v1/user` costs 1 token; heavy `POST /v1/reports` costs 5 tokens).
- If a client has sufficient tokens, the request is allowed immediately.
- If tokens are insufficient, the request is denied with an HTTP 429 status (`{deny, Remaining}`).
- Periodically, a background sweep refills $R$ tokens back into every active bucket, capped strictly at `MaxTokens`.

In this Capstone Problem Set for Chapter 7, you will engineer a high-throughput, production-grade **Token-Bucket Rate Limiter Server** using `gen_server`!

## Deep Concept Breakdown & Under the Hood

### State Architecture

Your `gen_server` maintains state as a map holding configuration, dynamic client balances, and global telemetry:

```erlang
#{
    max_tokens => MaxTokens,         %% Maximum capacity per bucket (pos_integer())
    refill_amount => RefillAmount,   %% Tokens added per refill cycle (pos_integer())
    clients => #{                    %% Dynamic client token buckets (map())
        <<"client_1">> => 7,
        <<"client_2">> => 10
    },
    total_allowed => 0,              %% Global counter of approved requests (integer())
    total_rejected => 0              %% Global counter of rejected requests (integer())
}
```

### Dynamic On-Demand Client Bucket Creation
When a request arrives for a previously unseen `ClientId`, your server must **automatically provision a fresh bucket with full `MaxTokens` capacity** before deducting the requested cost.

### Capped Batch Refills
When `refill_all(Pid)` is executed, every existing client bucket in `clients` receives `RefillAmount` additional tokens, capped at `max_tokens`:
```erlang
NewTokens = min(CurrentTokens + RefillAmount, MaxTokens)
```

### Live Introspection via `sys:get_state/1`
Because your module implements standard `gen_server` callbacks, production operators can inspect the exact internal balances and counters in real time using `sys:get_state(Pid)`!

> [!warning] Production OTP Trap: Map Allocation Leaks on Infinite Clients
> In a production gateway handling millions of ephemeral IP addresses, inserting an entry into `clients` for every unique IP will eventually exhaust memory. In production systems (as we will explore in Chapter 9), client buckets are backed by off-heap ETS tables with automatic TTL evictions (`select_delete`).

## Assignment Specification

Implement `src/rate_limiter_srv.erl` with the following exports:

```erlang
-module(rate_limiter_srv).
-behaviour(gen_server).

-export([
    start_link/2,
    check_request/3,
    refill_all/1,
    reset_client/2,
    get_stats/1,
    stop/1
]).
```

1. `start_link(MaxTokens, RefillAmount) -> {ok, Pid}`:
   - Spawns and links the `gen_server`. Initial state:
     `#{max_tokens => MaxTokens, refill_amount => RefillAmount, clients => #{}, total_allowed => 0, total_rejected => 0}`.
2. `check_request(Pid, ClientId, Cost) -> {allow, Remaining} | {deny, Remaining}`:
   - Synchronous `call`.
   - If `ClientId` is new, initial balance is `MaxTokens`.
   - If `Balance >= Cost`:
     - Decrements balance by `Cost`.
     - Increments `total_allowed + 1`.
     - Returns `{allow, NewBalance}`.
   - If `Balance < Cost`:
     - Balance remains unchanged.
     - Increments `total_rejected + 1`.
     - Returns `{deny, Balance}`.
3. `refill_all(Pid) -> ok`:
   - Synchronous `call` (or `cast`).
   - For every entry in `clients`, updates tokens to `min(Tokens + RefillAmount, MaxTokens)`. Returns `ok`.
4. `reset_client(Pid, ClientId) -> ok`:
   - Asynchronous `cast`. Resets `ClientId`'s balance directly to full `MaxTokens`. Returns `ok`.
5. `get_stats(Pid) -> #{total_allowed => integer(), total_rejected => integer(), active_clients => integer()}`:
   - Synchronous `call` returning aggregate metrics. `active_clients` is the number of keys in `clients`.
6. `stop(Pid) -> ok`:
   - Stops the server gracefully via `gen_server:stop(Pid)`.

## Rules & Verification Constraints

- Must export `start_link/2`, `check_request/3`, `refill_all/1`, `reset_client/2`, `get_stats/1`, and `stop/1`.
- Must export all 6 mandatory `gen_server` callbacks.
- `reset_client/2` must use `gen_server:cast/2`.
- `check_request/3` and `get_stats/1` must use `gen_server:call/2`.
- Token balances must never exceed `MaxTokens`.

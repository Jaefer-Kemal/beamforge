## Why This Matters in Production

In real-world telecommunication gateways and message brokers, incoming Call Detail Records (CDRs) and protocol packets must be inspected, validated, categorized, and priced across millions of subscribers.

A single malformed packet or invalid plan type must never crash the router. Instead, the system must cleanly categorize protocol types, reject empty payloads, cascade default connection parameters, and compute billing totals using exact sequential pattern matching.

This problem set unifies everything you have mastered in Chapter 1:
- Modules, exports, and function arities
- Atoms, tuples, and singly-linked lists
- Multi-clause function dispatch
- Default parameter delegation
- Integer billing arithmetic with zero floating-point imprecision

## Deep Concept Breakdown & Under the Hood

You will implement the `telecom_foundations` module with two core subsystems:

### 1. Packet Classification (`classify_packet/1`)
Packets arrive as 4-element tagged tuples containing a network protocol tag (`ipv4` or `ipv6`), source host, destination host, and a list of payload items:
```erlang
{ipv4, "10.0.0.1", "10.0.0.2", [packet_data, 100, ok]}
```
Your classifier must:
- Match IPv4 and IPv6 packets that contain **at least one payload item** using `[FirstItem | _Rest]`.
- Return `{ok, Protocol, Src, Dst, FirstItem}`.
- If the payload list is completely empty (`[]`), return `{error, empty_payload}`.
- If the tuple does not match a valid packet format, catch-all return `{error, invalid_packet}`.

### 2. Cascading Billing Engine (`bill_call/2` and `bill_call/3`)
Telecom subscribers are billed based on their call duration in seconds and their subscription plan (`standard`, `premium`, or `internal`):
- Lower-arity `bill_call/2` delegates to `bill_call/3` with a default connection fee of **10 cents**.
- `bill_call/3` matches on the plan atom:
  - `standard`: Connection fee + (`DurationSec * 5`) cents.
  - `premium`: Connection fee + (`DurationSec * 3`) cents.
  - `internal`: Completely free—always returns `{ok, 0}`.
  - Any unknown plan: Returns `{error, unknown_plan}`.

## Parallel Worked Example

Consider a logistics shipping rate engine structured identically:

```erlang
-module(freight_engine).
-export([route_cargo/1, calculate_freight/2, calculate_freight/3]).

route_cargo({air, Origin, Destination, [ManifestHead | _]}) ->
    {ok, air, Origin, Destination, ManifestHead};
route_cargo({sea, Origin, Destination, [ManifestHead | _]}) ->
    {ok, sea, Origin, Destination, ManifestHead};
route_cargo({_Type, _Origin, _Dest, []}) ->
    {error, empty_manifest};
route_cargo(_) ->
    {error, invalid_cargo_tuple}.

calculate_freight(WeightKg, Tier) ->
    calculate_freight(WeightKg, Tier, 25).  %% Default $25 dock handling

calculate_freight(WeightKg, standard, DockFee) ->
    {ok, DockFee + (WeightKg * 4)};
calculate_freight(WeightKg, express, DockFee) ->
    {ok, DockFee + (WeightKg * 8)};
calculate_freight(_WeightKg, humanitarian, _DockFee) ->
    {ok, 0};
calculate_freight(_WeightKg, _OtherTier, _DockFee) ->
    {error, unknown_tier}.
```

## Assignment Specification

Implement `src/telecom_foundations.erl` with the following exports:

```erlang
-module(telecom_foundations).
-export([classify_packet/1, bill_call/2, bill_call/3]).
```

### 1. `classify_packet(Packet)`
- Clause 1: Matches `{ipv4, SrcHost, DstHost, [FirstItem | _Rest]}` -> returns `{ok, ipv4, SrcHost, DstHost, FirstItem}`.
- Clause 2: Matches `{ipv6, SrcHost, DstHost, [FirstItem | _Rest]}` -> returns `{ok, ipv6, SrcHost, DstHost, FirstItem}`.
- Clause 3: Matches `{Tag, _Src, _Dst, []}` -> returns `{error, empty_payload}`.
- Clause 4: Wildcard catch-all `_` -> returns `{error, invalid_packet}`.

### 2. `bill_call(DurationSec, PlanType)`
- Delegates directly to `bill_call(DurationSec, PlanType, 10)` (default connection fee is 10 cents).

### 3. `bill_call(DurationSec, PlanType, ConnectionFeeCents)`
- Clause 1: Matches `PlanType = standard` -> returns `{ok, ConnectionFeeCents + (DurationSec * 5)}`.
- Clause 2: Matches `PlanType = premium` -> returns `{ok, ConnectionFeeCents + (DurationSec * 3)}`.
- Clause 3: Matches `PlanType = internal` -> returns `{ok, 0}`.
- Clause 4: Wildcard catch-all for any other plan -> returns `{error, unknown_plan}`.

## Rules & Verification Constraints

- **ZERO FORWARD REFERENCES**: Do not use Maps (`#{}`), Binaries (`<<...>>`), or `when` guard clauses!
- Rely strictly on multi-clause pattern matching and integer arithmetic.
- Remember the punctuation triad: clauses are separated by semicolons (`;`), and the function ends with a period (`.`).
## Why This Matters in Production

In distributed systems, telecommunication gateways, and message brokers, network frames arrive as deeply nested structures containing protocol wrappers, routing headers, transaction identifiers, and payload records.

In imperative languages like Go, Java, Python, or C++, unpacking deeply nested packets requires multiple lines of defensive `if != nil` pointer checks, object navigation (`packet.Header.Route.Destination`), and manual error handling. If a single field is null or of an unexpected type, the program panics or throws a null pointer exception.

In Erlang, the BEAM Virtual Machine deconstructs arbitrary nested data structures directly in the function clause head in a single, atomic operation. If the data structure matches the expected shape, the variables are bound instantly; if not, the clause is skipped and the next clause is evaluated.

## Deep Concept Breakdown & Under the Hood

### 1. Nested Pattern Matching in Function Heads
When an Erlang function is invoked, the BEAM VM uses specialized bytecode instructions (`test_heap`, `get_tuple_element`, `is_eq_exact`) to test the shape and contents of arguments before the function body ever executes:

```erlang
%% Unpacking deeply nested tuples directly in the clause head:
handle_packet({packet, {header, 4, {route, From, To}}, Payload}) ->
    {ok, ipv4, From, To, Payload};
handle_packet({packet, {header, 6, {route, From, To}}, Payload}) ->
    {ok, ipv6, From, To, Payload}.
```

If an incoming argument does not match any declared pattern, Erlang raises a `function_clause` runtime exception immediately. This prevents corrupted state from silently propagating deeper into your application.

### 2. Simultaneous Aliasing (`Pattern = Variable`) in Function Heads
Frequently in production, you need to inspect an inner field of a data structure, but you also need to forward or return the **entire original structure** unchanged.

A novice might destructure the fields and then rebuild the entire tuple from scratch in the return expression:

```erlang
%% Inefficient: Reconstructs a brand-new tuple on the process heap:
forward_packet({packet, {header, 4, {route, _From, Dst}}, Payload}) ->
    NewPacket = {packet, {header, 4, {route, _From, Dst}}, Payload},
    {forwarded, Dst, NewPacket}.
```

Erlang provides a powerful construct called **Pattern Aliasing** using the `=` operator directly inside the function signature:

```erlang
%% Idiomatic: Binds the whole term to FullPacket with ZERO heap re-allocation!
forward_packet({packet, {header, 4, {route, _From, Dst}}, _Payload} = FullPacket) ->
    {forwarded, Dst, FullPacket}.
```

Here, `FullPacket` is an alias for the entire outer tuple term, while `Dst` is simultaneously bound to the inner destination field.

> [!warning] Common Beginner Syntax Trap: Aliasing Direction
> In function heads, `Pattern = Variable` and `Variable = Pattern` are both valid syntax in Erlang.
> However, placing the descriptive pattern first (e.g. `{packet, ...} = FullPacket`) makes your function signatures significantly easier for teammates to read during code review.
> Remember: never use uppercase names for atom tags (`Packet` is a variable; `packet` is an atom).

## Parallel Worked Example

Consider a banking gateway inspecting financial transactions:

```erlang
-module(tx_router).
-export([route_tx/1, archive_tx/1]).

%% Extract routing details from nested transaction envelope
route_tx({tx, {routing, 900, {account, Src, Dst}}, _Amount}) ->
    {ok, express_settlement, Src, Dst};
route_tx({tx, {routing, 100, {account, Src, Dst}}, _Amount}) ->
    {ok, standard_clearing, Src, Dst};
route_tx({tx, {routing, InvalidCode, _Accts}, _Amount}) ->
    {error, {unsupported_network, InvalidCode}};
route_tx(_) ->
    {error, malformed_transaction}.

%% Simultaneously match priority and retain the complete transaction term
archive_tx({tx, {routing, 900, _}, _} = HighPriorityTx) ->
    {archived_express, HighPriorityTx};
archive_tx(StandardTx) ->
    {archived_standard, StandardTx}.
```

## Official Erlang Docs & Function Reference

```erlang
%% Function Clause Pattern Syntax
FunctionName(Pattern1, Pattern2, ...) -> Body;
FunctionName(PatternN = FullVar, ...) -> Body.
```
> Function clauses are evaluated strictly from top to bottom. Place specific patterns above generic catch-all wildcards (`_`).

## Assignment Specification

Implement two routing functions in `deep_match.erl`:

1. `extract_route(Packet)`:
   - Matches a 3-element tuple: `{packet, {header, Version, {route, From, To}}, Payload}`.
   - If `Version =:= 4`, returns `{ok, ipv4, From, To}`.
   - If `Version =:= 6`, returns `{ok, ipv6, From, To}`.
   - If `Version` is any other value, returns `{error, {unsupported_version, Version}}`.
   - If `Packet` does not match the packet envelope shape at all, returns `{error, malformed_envelope}`.

2. `repackage_envelope(Packet)`:
   - Uses function-head aliasing (`= FullPacket`) to match IPv4 packets: `{packet, {header, 4, {route, _From, Dst}}, _Payload} = FullPacket`.
   - Returns `{forwarded, Dst, FullPacket}`.
   - Any other input returns `{dropped, Packet}`.

## Rules & Verification Constraints

- Pattern match directly in the function clause parameters.
- Do not use BIFs like `element/2` to manually index into tuples.
- Strictly no maps or binaries; use tuples, atoms, and strings only.
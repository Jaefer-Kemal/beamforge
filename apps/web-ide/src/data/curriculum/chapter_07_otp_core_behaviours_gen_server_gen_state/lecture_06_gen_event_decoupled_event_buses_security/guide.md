## Why This Matters in Production

In microservices and high-throughput backends, decoupling event producers from consumers is essential for software evolution.
For example, when a user fails to log in:
- The security service wants to track failed attempts and trigger IP blocks.
- The compliance service wants to write an audit log to an immutable S3 bucket.
- The metrics service wants to increment a StatsD counter.

If the authentication service directly called three different `gen_server` processes for every login, it would create tight coupling: if the compliance server slowed down or crashed, the login pipeline would stall.

The OTP framework solves this with **`gen_event`**: a central event bus process that dispatches events to dynamically registered handler modules.

## Deep Concept Breakdown & Under the Hood

### The `gen_event` Architecture

Unlike a `gen_server` (which maps 1 process to 1 callback module), a `gen_event` architecture separates the **Event Manager process** from the **Handler modules**:
1. You start the manager process: `{ok, ManagerPid} = gen_event:start_link()`.
2. Different subsystems dynamically attach their callback handlers: `gen_event:add_handler(ManagerPid, security_handler, Args)`.
3. Producers broadcast events with **`gen_event:notify(ManagerPid, Event)`**.
4. The manager process iterates through all attached handlers, executing each handler's `handle_event(Event, HandlerState)` callback in order.

### Fault Isolation: What Happens When a Handler Crashes?

The most profound feature of `gen_event` is its resilience:
If handler A throws a runtime crash (e.g. `badarith` or network failure) during `handle_event/2`:
- **The Event Manager process does NOT crash!**
- Other handlers (B, C, and D) continue running unhurt!
- The manager simply catches the exception, logs a warning report, and automatically removes the broken handler A from its active handler list!

### Callback Signatures for `gen_event`

```erlang
-module(my_handler).
-behaviour(gen_event).

init(Args) -> {ok, InitialState}.
handle_event(Event, State) -> {ok, NewState}.
handle_call(Query, State) -> {ok, Reply, NewState}.
handle_info(Info, State) -> {ok, NewState}.
terminate(Reason, State) -> ok.
code_change(OldVsn, State, Extra) -> {ok, NewState}.
```

> [!warning] Production OTP Trap: Silent Removal of Crashing Event Handlers
> Because `gen_event` automatically unregisters handlers that crash without taking down the manager process, a bug in a handler can silently stop all event processing for that subsystem while your server appears completely healthy. In production, always monitor your SASL crash logs or use `gen_event:add_sup_handler/3` (which links the handler to the caller).

## Parallel Worked Example

The following is an audit event logger that tracks system warnings:

```erlang
-module(warning_logger).
-behaviour(gen_event).
-export([add_handler/1, get_warnings/1]).
-export([init/1, handle_event/2, handle_call/2, handle_info/2, terminate/2, code_change/3]).

add_handler(Mgr) -> gen_event:add_handler(Mgr, ?MODULE, []).
get_warnings(Mgr) -> gen_event:call(Mgr, ?MODULE, get_warnings).

init([]) -> {ok, []}.

handle_event({warning, Msg}, Warnings) ->
    {ok, [Msg | Warnings]};
handle_event(_Other, Warnings) ->
    {ok, Warnings}.

handle_call(get_warnings, Warnings) ->
    {ok, lists:reverse(Warnings), Warnings}.

handle_info(_Info, State) -> {ok, State}.
terminate(_Reason, _State) -> ok.
code_change(_Old, State, _Extra) -> {ok, State}.
```

## Assignment Specification

Implement `src/security_audit_handler.erl` tracking brute-force IP login attacks:
1. `add_to_manager(ManagerPid, MaxAttempts) -> ok`:
   - Attaches `?MODULE` to `ManagerPid` with initial state `#{max => MaxAttempts, tracker => #{}}`.
2. `handle_event({login_failed, IpBinary}, State = #{max := Max, tracker := Tracker})`:
   - Increments the failed attempt counter for `IpBinary`.
   - If `NewCount >= Max`, records `alert => true` for that IP.
   - Returns `{ok, UpdatedState}`.
3. `handle_event({login_success, IpBinary}, State = #{tracker := Tracker})`:
   - Clears previous failures for `IpBinary` (setting `attempts => 0, alert => false`).
   - Returns `{ok, UpdatedState}`.
4. `get_ip_status(ManagerPid, IpBinary) -> {ok, #{attempts => non_neg_integer(), alert => boolean()}}`:
   - Uses `gen_event:call(ManagerPid, ?MODULE, {get_status, IpBinary})`.
   - Replies with the status map for that IP (defaulting to `attempts => 0, alert => false` if IP was never seen).

## Rules & Verification Constraints

- Must export `add_to_manager/2` and `get_ip_status/2`.
- Must export all 6 mandatory `gen_event` callbacks.
- `add_to_manager/2` must use `gen_event:add_handler/3`.
- `get_ip_status/2` must use `gen_event:call/3`.

## Why This Matters in Production

In Chapter 5 (Lesson 5.6), we modeled a stateful door lock actor using **mutual tail-recursion** (`locked(Code, Attempts)` $leftrightarrow$ `unlocked(Code)`).
While manual tail-recursive state functions work well for small scripts, complex network protocols (such as TCP handshakes, TLS negotiation, and XMPP client-to-server connections) require tracking states, state timeouts, delayed events, and transitions across dozens of phases.

For production state machines, the OTP framework provides **`gen_statem`** (which replaced the legacy `gen_fsm` in OTP 19).

In modern cloud architectures, one of the most critical patterns implemented using `gen_statem` is the **Circuit Breaker**:
- When downstream external services (payment APIs, database clusters, third-party auth) experience outages, naive callers keep hammering them with retries, making the outage worse and exhausting connection pools.
- A **Circuit Breaker** sits between your backend and the remote service. If calls fail repeatedly, it "trips" into an `open` state that **immediately fast-fails all subsequent calls in 0ms without contacting the network**!
- After an idle cooldown timeout, it transitions to `half_open` to test a single trial request. If successful, it automatically heals back to `closed`!

## Deep Concept Breakdown & Under the Hood

### The `state_functions` Callback Mode

A `gen_statem` can operate in two modes declared via `callback_mode/0`:
1. `handle_event_function`: A single callback handles all states.
2. **`state_functions` (Recommended & Idiomatic)**: Each state in your state machine is represented by **its own exported function of arity 3**:
   ```erlang
   StateName(EventType, EventContent, Data) ->
       {next_state, NextStateName, NewData} |
       {keep_state, NewData} |
       {keep_state, NewData, Actions}
   ```

### Event Types & State Machine Actions

Inside your state functions, `EventType` can be:
- `{call, From}`: Synchronous request initiated by `gen_statem:call(Pid, Msg)`. To reply, return action `[{reply, From, Reply}]`.
- `cast`: Asynchronous cast from `gen_statem:cast(Pid, Msg)`.
- `info`: Raw process messages (timers, monitors).
- **`state_timeout`**: A built-in timer attached strictly to the current state.

### Automated Timer Cancellation via `state_timeout`

When transitioning states, you can attach a state timeout action:
```erlang
{next_state, open, NewData, [{state_timeout, 5000, try_half_open}]}
```
The beauty of `state_timeout` is that **it automatically cancels itself** if the state machine leaves that state before the timer expires! You never have to manually track or cancel timer references.

### Circuit Breaker State Transition Matrix

| Current State | Event Received | Resulting Action | Next State |
| :--- | :--- | :--- | :--- |
| **`closed`** | `execute(Fun)` succeeds | Return `{ok, Res}`; reset failure count to 0. | `closed` |
| **`closed`** | `execute(Fun)` fails (Failures < MaxFailures) | Return `{error, Reason}`; increment failures. | `closed` |
| **`closed`** | `execute(Fun)` fails (Failures >= MaxFailures) | Return `{error, Reason}`; arm `state_timeout`. | **`open`** |
| **`open`** | `execute(Fun)` | Fast-fail immediately with `{error, circuit_open}` (Do NOT run `Fun`!). | `open` |
| **`open`** | `state_timeout` fires | Transition to probe mode. | **`half_open`** |
| **`half_open`** | Trial `execute(Fun)` succeeds | Return `{ok, Res}`; reset failures to 0. | **`closed`** |
| **`half_open`** | Trial `execute(Fun)` fails | Return `{error, Reason}`; re-arm timeout. | **`open`** |

> [!warning] Production OTP Trap: State Timeout Cancellation Invariants
> Remember that `{state_timeout, Ms, Event}` is tied strictly to the state name. If your state machine executes an internal transition from `open` to `open` (e.g. `{next_state, open, NewData}`), the state timeout is **reset**! If you want to keep the existing running timer while updating state data, you must return `{keep_state, NewData}` instead of `{next_state, CurrentState, NewData}`.

## Parallel Worked Example

The following is an abbreviated 2-state toggle switch demonstrating `gen_statem` with `state_functions`:

```erlang
-module(toggle_statem).
-behaviour(gen_statem).
-export([start_link/0, press/1, get_state/1, stop/1]).
-export([callback_mode/0, init/1, terminate/3, code_change/4]).
-export([off/3, on/3]).

callback_mode() -> state_functions.
start_link() -> gen_statem:start_link(?MODULE, [], []).
press(Pid) -> gen_statem:call(Pid, press).
get_state(Pid) -> gen_statem:call(Pid, get_state).
stop(Pid) -> gen_statem:stop(Pid).

init([]) -> {ok, off, #{presses => 0}}.

off({call, From}, press, Data = #{presses := P}) ->
    {next_state, on, Data#{presses := P + 1}, [{reply, From, switched_on}]};
off({call, From}, get_state, Data) ->
    {keep_state, Data, [{reply, From, off}]}.

on({call, From}, press, Data = #{presses := P}) ->
    {next_state, off, Data#{presses := P + 1}, [{reply, From, switched_off}]};
on({call, From}, get_state, Data) ->
    {keep_state, Data, [{reply, From, on}]}.

terminate(_R, _State, _Data) -> ok.
code_change(_Old, State, Data, _Extra) -> {ok, State, Data}.
```

## Assignment Specification

Implement `src/circuit_breaker_statem.erl` representing a self-healing circuit breaker:
1. `callback_mode() -> state_functions`.
2. `start_link(FailureThreshold, OpenTimeoutMs) -> {ok, Pid}`:
   - Initial state is `closed`. Initial data is `#{threshold => FailureThreshold, timeout => OpenTimeoutMs, failures => 0}`.
3. `execute(Pid, ActionFun)`:
   - In `closed`:
     - Calls `ActionFun()`. If it returns `{ok, Val}`, resets `failures => 0` and replies `{ok, Val}`.
     - If it returns `{error, Reason}` or crashes, increments `failures`. If `failures + 1 >= Threshold`, transitions to `open` with action `[{state_timeout, OpenTimeoutMs, try_half_open}]` and replies `{error, Reason}`.
   - In `open`:
     - **Fast-fails immediately without running `ActionFun()`**, replying `{error, circuit_open}`.
     - When `state_timeout` event `try_half_open` triggers, transitions to `half_open`.
   - In `half_open`:
     - Executes `ActionFun()`. If `{ok, Val}`, transitions back to `closed` with `failures => 0` and replies `{ok, Val}`.
     - If `{error, Reason}`, trips back to `open` with `state_timeout` and replies `{error, Reason}`.
4. `get_state_name(Pid) -> closed | open | half_open`.
5. `stop(Pid) -> ok`.

## Rules & Verification Constraints

- Must implement `-behaviour(gen_statem).` and export `callback_mode/0`.
- Must export state functions `closed/3`, `open/3`, and `half_open/3`.
- In `open` state, must never invoke `ActionFun()`.

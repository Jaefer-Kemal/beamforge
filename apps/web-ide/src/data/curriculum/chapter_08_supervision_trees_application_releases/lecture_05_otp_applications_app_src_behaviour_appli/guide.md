## Why This Matters in Production

In Erlang/OTP, an **Application** is a self-contained component that can be started and stopped as a single unit, packaged into production releases, and configured at runtime.

Every production system you build—from an HTTP REST API to an XMPP cluster—is structured as one or more OTP applications.

### The Two Components of an OTP Application

1. **The Application Resource File (`.app` or `.app.src`):**
   - A declarative metadata file containing the application's name, version, registered names, dependencies, and configuration parameters.
   - Declares the callback module implementing `-behaviour(application).`.

2. **The Application Callback Module:**
   - Implements `start(StartType, StartArgs) -> {ok, SupPid} | {error, Reason}`.
   - Implements `stop(State) -> ok`.
   - The `start/2` callback is invoked by the BEAM **Application Master** process. It spawns the root supervisor of the application's supervision tree and returns the root supervisor's PID.

### The `.app.src` Resource Specification

```erlang
{application, commerce_app, [
    {description, "E-Commerce Core Checkout & Order Engine"},
    {vsn, "1.0.0"},
    {registered, [commerce_app, checkout_sup]},
    {mod, {commerce_app, []}},
    {applications, [kernel, stdlib]},
    {env, [
        {currency, "USD"},
        {max_retries, 3},
        {checkout_timeout_ms, 5000}
    ]}
]}.
```

### Runtime Configuration with `application:get_env/3`

Production code must NEVER hardcode configuration parameters (like API tokens, database hosts, or timeout thresholds).

OTP provides built-in application configuration management:
- **`application:get_env(App, Key, Default)`**: Reads the runtime configuration parameter for `App`. If unset, safely returns `Default`.
- **`application:set_env(App, Key, Value)`**: Updates the runtime configuration dynamically in the application controller.

> [!warning] Production Supervision Trap: Hardcoded Configuration Constants
> Never write `Timeout = 5000` inside worker processes. If production network conditions require increasing timeouts during high traffic, hardcoded values require recompilation and redeployment. Using `application:get_env(my_app, timeout_ms, 5000)` allows dynamic tuning via `sys.config` or live console RPC without downtime.

### Parallel Worked Example

```erlang
-module(auth_app).
-behaviour(application).
-behaviour(supervisor).

-export([start/2, stop/1, get_config/2, set_config/2, init/1]).

start(_StartType, _StartArgs) ->
    case supervisor:start_link({local, ?MODULE}, ?MODULE, []) of
        {ok, SupPid} -> {ok, SupPid};
        {error, {already_started, SupPid}} -> {ok, SupPid};
        {error, Reason} -> {error, Reason}
    end.

stop(_State) ->
    ok.

get_config(Key, Default) ->
    application:get_env(auth_app, Key, Default).

set_config(Key, Value) ->
    application:set_env(auth_app, Key, Value).

init([]) ->
    SupFlags = #{
        strategy => one_for_one,
        intensity => 3,
        period => 5
    },
    ChildSpecs = [],
    {ok, {SupFlags, ChildSpecs}}.
```

### Your Mission

Implement module `commerce_app` implementing both `-behaviour(application).` and `-behaviour(supervisor).`:
1. `start(StartType, StartArgs) -> {ok, pid()} | {error, term()}`:
   - Spawns the supervisor using `supervisor:start_link({local, ?MODULE}, ?MODULE, [])`.
   - Returns `{ok, SupPid}` (handles `{error, {already_started, SupPid}}` gracefully).
2. `stop(State) -> ok`:
   - Performs clean teardown; returns `ok`.
3. `get_app_config(Key, Default) -> term()`:
   - Invokes `application:get_env(commerce_app, Key, Default)`.
4. `set_app_config(Key, Value) -> ok`:
   - Invokes `application:set_env(commerce_app, Key, Value)`.
5. `init([]) -> {ok, {SupFlags, ChildSpecs}}`:
   - Returns `strategy => one_for_one`, `intensity => 3`, `period => 5`, and `ChildSpecs = []`.

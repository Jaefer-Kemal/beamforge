## Why This Matters in Production

A supervisor does not spawn processes randomly. Every process supervised by an OTP supervisor is defined by a **Child Specification** (`child_spec()`).

The child specification tells the supervisor:
1. What the child is named (`id`).
2. How to start it (`start => {M, F, A}`).
3. Under what conditions to restart it (`restart`).
4. How long to wait before forcefully killing it (`shutdown`).
5. Whether it is a leaf worker or an intermediate supervisor (`type`).
6. What modules to purge during dynamic code hot-reloading (`modules`).

### The Modern Map-Based `child_spec()` Anatomy

```erlang
#{
    id => term(),                        %% Unique identifier atom or tuple
    start => {module(), atom(), list()}, %% {M, F, A} invocation returning {ok, Pid}
    restart => restart_type(),           %% permanent | transient | temporary
    shutdown => shutdown_timeout(),      %% brutal_kill | integer() ms | infinity
    type => worker | supervisor,         %% Declares node role in the hierarchy
    modules => [module()] | dynamic      %% Modules used for release packaging
}
```

### The Restart Type Truth Table

The `restart` field defines the contract between process death reasons and restart behavior:

| Restart Type | Crash (`error`, `badmatch`, `exit(crash)`) | Normal Exit (`exit(normal)`) | Clean Shutdown (`shutdown`, `{shutdown, Term}`) |
| :--- | :--- | :--- | :--- |
| **`permanent`** | **Restart** | **Restart** | **Restart** |
| **`transient`** | **Restart** | *Do NOT restart* | *Do NOT restart* |
| **`temporary`** | *Do NOT restart* | *Do NOT restart* | *Do NOT restart* |

- **`permanent`**: The process must NEVER be down (e.g. database connection pools, core message routers, listening sockets). Even if it exits with `normal`, the supervisor restarts it!
- **`transient`**: The process represents a task that eventually finishes cleanly (e.g. a batch file processor, an account registration pipeline). If it crashes unexpectedly, it is restarted; if it completes its job and exits `normal`, the supervisor lets it stay stopped.
- **`temporary`**: The process is disposable (e.g. dynamic client TCP sessions, rate-limit buckets). If it dies for *any* reason, it is never restarted.

### Shutdown Order & Timeouts

When a supervisor shuts down, or when `rest_for_one` / `one_for_all` restarts multiple children:
1. **Startup is strictly forward (top-to-bottom):** `[Child1, Child2, Child3]`.
2. **Shutdown is strictly reverse order:** `Child3` is terminated first, then `Child2`, then `Child1`.
3. To terminate a child, the supervisor sends an exit signal: `exit(ChildPid, shutdown)`.
4. If the child traps exits (`process_flag(trap_exit, true)`), it invokes its `terminate(shutdown, State)` callback to flush buffers and close sockets.
5. If the child does not exit within the specified `shutdown` milliseconds, the supervisor forcefully terminates it with `exit(ChildPid, kill)`.

> [!warning] Production Supervision Trap: Premature Killing of Child Supervisors
> For nested child supervisors, `shutdown` **MUST** be set to `infinity`!
> A child supervisor needs time to terminate all of its own children in reverse order before it can terminate itself. If a parent supervisor terminates a child supervisor with a 5,000ms timeout or `brutal_kill`, orphaned grandchild worker processes will leak into the BEAM VM.

### Parallel Worked Example

```erlang
-module(worker_spec_builder).
-export([build_task_spec/4, build_sub_supervisor_spec/2, should_restart/2]).

build_task_spec(Id, Mod, Args, Restart)
  when is_atom(Mod), is_list(Args),
       (Restart =:= permanent orelse Restart =:= transient orelse Restart =:= temporary) ->
    #{
        id => Id,
        start => {Mod, start_link, Args},
        restart => Restart,
        shutdown => 5000,
        type => worker,
        modules => [Mod]
    }.

build_sub_supervisor_spec(Id, SupMod) when is_atom(SupMod) ->
    #{
        id => Id,
        start => {SupMod, start_link, []},
        restart => permanent,
        shutdown => infinity,  %% Mandatory for nested supervisors!
        type => supervisor,
        modules => [SupMod]
    }.

should_restart(permanent, _Reason) -> restart;
should_restart(temporary, _Reason) -> do_not_restart;
should_restart(transient, normal) -> do_not_restart;
should_restart(transient, shutdown) -> do_not_restart;
should_restart(transient, {shutdown, _}) -> do_not_restart;
should_restart(transient, _Abnormal) -> restart.
```

### Your Mission

Implement module `child_spec_factory` exporting:
1. `worker_spec(Id, Module, Args, RestartType) -> map()`:
   - Validates that `Module` is an atom, `Args` is a list, and `RestartType` is `permanent`, `transient`, or `temporary`.
   - Returns a child spec map with `start => {Module, start_link, Args}`, `shutdown => 5000`, `type => worker`, and `modules => [Module]`.
2. `supervisor_spec(Id, SupModule) -> map()`:
   - Validates that `SupModule` is an atom.
   - Returns a child spec map with `start => {SupModule, start_link, []}`, `restart => permanent`, `shutdown => infinity`, `type => supervisor`, and `modules => [SupModule]`.
3. `classify_restart(RestartType, ExitReason) -> restart | do_not_restart`:
   - Implements the exact OTP Restart Type Truth Table.

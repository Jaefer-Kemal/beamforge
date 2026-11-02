## 🚨 Incident Triage: Root Supervisor Boot Timeout (INC-103)

### Incident Context & Telemetry
At 03:14 UTC, during a routine zero-downtime rolling update of the security gateway cluster, Kubernetes pods running the `firewall-rule-hydrator` service failed their liveness probes.
The root OTP supervisor aborted startup with the following error log:

```text
=CRASH REPORT====
  crasher:
    initial call: firewall_sup:init/1
    pid: <0.412.0>
    error: {shutdown, {failed_to_start_child, firewall_rules, timeout}}
```

### Root-Cause Inspection
Inspecting `src/incident_blocking_init.erl` reveals that the server attempts to compile, normalize, and parse all firewall rules synchronously inside `init/1`:
```erlang
%% BROKEN IMPLEMENTATION:
init(SeedRules) ->
    %% Heavy CPU loop compiling 5,000 rules blocks the caller for 6,200ms!
    CompiledMap = compile_all_rules(SeedRules),
    {ok, #{status => ready, rules => CompiledMap}}.
```

Because `gen_server:start_link/3` blocks the parent supervisor until `init/1` returns, the supervisor reached its 5,000ms child startup timeout and killed the process!

### Your Fix Objective
Refactor `incident_blocking_init.erl` using the modern OTP 21+ **`{continue, Term}`** pattern:
1. `init/1` must return immediately in **< 1ms**:
   ```erlang
   {ok, #{status => booting, raw => SeedRules, rules => #{}}, {continue, {hydrate, SeedRules}}}
   ```
2. Move rule compilation into **`handle_continue({hydrate, SeedRules}, State)`**:
   - Compile `SeedRules` into the rules map: `maps:from_list(SeedRules)`.
   - Update internal state: `State#{status := ready, rules := CompiledRules}`.
   - Return `{noreply, State}`.
3. `lookup_rule(Pid, Port)`:
   - If `status =:= ready`, returns `{ok, Action}` if found, `{error, not_found}` otherwise.
   - If `status =:= booting`, returns `{error, still_booting}`.
4. Ensure `get_status(Pid)` returns `ready` after hydration completes.

import { LessonContent } from '../../types/workspace';

export const CHAPTER_8_LESSONS: LessonContent[] = [
  // ── Lesson 8.1: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch08-l01',
    chapterNumber: 8,
    lessonNumber: 1,
    lessonType: 'concept_exercise',
    title: 'Supervisor Flags & Restart Strategies: one_for_one, rest_for_one, and one_for_all',
    visualScene: 'supervision_rest_for_one_ets_heir',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In production backends, individual worker processes will inevitably encounter hardware timeouts, corrupt payloads, or dropped database sockets. The foundational architectural superpower of Erlang and the BEAM VM is **Supervision Trees** (\`-behaviour(supervisor).\`).

Instead of scattering defensive \`try/catch\` blocks across every function, Erlang systems embrace the **"Let It Crash"** philosophy:
1. **Workers** execute risky domain logic. When unexpected corruption occurs, the worker terminates immediately, destroying its tainted heap.
2. **Supervisors** execute zero business logic. They exist solely to monitor workers, enforce restart rate limits, and restore clean state.

Restoring workers safely requires choosing the right **Restart Strategy**. If an independent caching worker crashes, you should not take down unrelated subsystems. Conversely, if a shared connection pool crashes, downstream workers holding references to it must be cleanly restarted so they do not operate on dead handles.

## Deep Concept Breakdown & Under the Hood

### The 4 OTP Restart Strategies

| Strategy | Failure Blast Radius | Production Use Case |
| :--- | :--- | :--- |
| \`one_for_one\` | Crashed child only | Independent request handlers, stateless worker pools |
| \`rest_for_one\` | Crashed child + children started **after** it | Sequential dependency pipelines (\`db_pool -> cache -> gateway\`) |
| \`one_for_all\` | **All** children under the supervisor | Mutually dependent peers that cannot run independently |
| \`simple_one_for_one\` | Single dynamic worker instance | Dynamic connection pools (e.g., per-socket TCP/XMPP handlers) |

- **Startup Ordering Invariant (\`rest_for_one\` & \`one_for_all\`)**: Because supervisors terminate affected siblings in **reverse startup order** and reboot them in **forward startup order**, dependency pipelines only work safely when upstream resources appear earlier in the child specification list than their downstream consumers.
- **Dynamic Pool Boot (\`simple_one_for_one\`)**: Unlike the three static strategies, a \`simple_one_for_one\` supervisor holds a single template child specification, boots with zero active children, and attaches workers dynamically on demand via \`supervisor:start_child/2\`.

### What the BEAM Does Under the Hood: Sliding Windows & Escalation

Internally, an OTP \`supervisor\` is a specialized \`gen_server\` that calls \`process_flag(trap_exit, true)\` in its \`init/1\` phase and links to every child in startup order:
- When a child exits abnormally, the BEAM delivers \`{'EXIT', ChildPid, Reason}\` to the supervisor's mailbox.
- The supervisor records the timestamp in a bounded sliding-window queue sized to \`intensity\`.
- If the count of restarts within the last \`period\` seconds exceeds \`intensity\`, the supervisor concludes the subsystem is in an unrecoverable crash loop, terminates all remaining children in **reverse startup order**, and exits with \`shutdown\`—escalating failure to its parent supervisor.

### The Modern Map-Based \`sup_flags()\` Contract

In modern Erlang/OTP, \`supervisor:init/1\` returns a tuple containing a configuration map and child specifications:

\`\`\`erlang
{ok, {SupFlagsMap, ChildSpecs}}
\`\`\`

The \`SupFlagsMap\` configures restart strategy and rate limiting via three fields: \`strategy\`, \`intensity\`, and \`period\`.

> [!warning] Production Supervision Trap: Infinite Crash Loops
> If a worker has a deterministic startup defect (such as invalid credentials or a bound port conflict), an uncapped supervisor would restart it endlessly at 100% CPU. Setting realistic \`intensity\` (maximum restarts) and \`period\` (window in seconds) bounds crash loops and triggers controlled escalation up the supervision tree.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (stdlib / supervisor)
Module:init(Args) -> {ok, {SupFlags, [ChildSpec]}} | ignore
  Types:
    Args = term()
    SupFlags = #{strategy => strategy(), intensity => non_neg_integer(), period => pos_integer()}
    strategy() = one_for_one | rest_for_one | one_for_all | simple_one_for_one
\`\`\`

In OTP callback specs, \`non_neg_integer()\` allows \`0\` and positive integers, whereas \`pos_integer()\` strictly requires integers greater than \`0\` (a supervisor window of \`0\` seconds is invalid). Consult the OTP Doc Card below for the complete \`supervisor:init/1\` reference.

## Parallel Worked Example: Log Ingestion Supervisor

Consider \`ingestion_sup\`, a log ingestion supervisor in a telemetry collector. Notice how \`start_link/2\` pairs parenthesized \`orelse\` atom validation with comma-separated integer guards, while \`is_valid_sink/1\` and \`throughput_metric/2\` demonstrate clause fallbacks and floating-point division alongside supervisor \`init/1\`:

\`\`\`erlang
-module(ingestion_sup).
-behaviour(supervisor).

%% Public API & Policy Helpers
-export([
    start_link/2,
    is_valid_sink/1,
    throughput_metric/2
]).

%% Supervisor Callback
-export([init/1]).

%% @doc Start the log ingestion supervisor for a supported sink atom and worker count.
start_link(Sink, PoolSize)
  when (Sink =:= stdout orelse Sink =:= disk orelse Sink =:= s3),
       is_integer(PoolSize), PoolSize > 0 ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, {Sink, PoolSize}).

%% @doc Verify whether a destination atom matches a supported log sink.
is_valid_sink(stdout) -> true;
is_valid_sink(disk)   -> true;
is_valid_sink(s3)     -> true;
is_valid_sink(_)      -> false.

%% @doc Compute floating-point messages-per-second throughput for a window.
throughput_metric(Messages, WindowSec)
  when is_integer(Messages), Messages >= 0,
       is_integer(WindowSec), WindowSec > 0 ->
    #{
        events_per_sec => Messages / WindowSec,
        window_seconds => WindowSec
    }.

%% @doc Initialize the ingestion supervisor flags and ordered child pipeline.
init({_Sink, _PoolSize}) ->
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 4,
        period => 10
    },
    {ok, {SupFlags, []}}.
\`\`\`

Key Erlang mechanics illustrated above:
- **Compound \`orelse\` Guards**: Parenthesizing multiple \`=:=\` alternatives (as shown in \`start_link/2\`) lets Erlang validate an enum atom cleanly alongside comma-separated numeric checks (\`,\` acts as guard conjunction).
- **Floating-Point Division (\`/\`)**: Unlike \`div\`, Erlang's \`/\` operator always evaluates to a \`float()\` even when operands divide evenly (e.g., \`10 / 2\` produces \`5.0\`).

## Assignment Specification

Implement \`src/strategy_planner.erl\` with the following exports:

\`\`\`erlang
-module(strategy_planner).

-export([
    build_sup_flags/3,
    select_strategy_for_topology/1,
    calculate_restart_budget/2
]).
\`\`\`

### Functional Requirements

#### \`build_sup_flags/3\`
- **Input**: \`Strategy\` (atom), \`Intensity\` (non-negative integer), \`Period\` (positive integer).
- **Behavior**: Enforces via function head guard clauses that \`Strategy\` is one of the four valid OTP supervisor restart strategies (\`one_for_one\`, \`rest_for_one\`, \`one_for_all\`, or \`simple_one_for_one\`), \`Intensity\` is an integer zero or greater, and \`Period\` is an integer strictly greater than zero. Returns a supervisor flags map containing keys \`strategy\`, \`intensity\`, and \`period\`. Invalid inputs must fail with a function clause exception.
- **Examples**:
  - \`strategy_planner:build_sup_flags(rest_for_one, 3, 5)\` returns \`#{intensity => 3, period => 5, strategy => rest_for_one}\`.

#### \`select_strategy_for_topology/1\`
- **Input**: \`Topology\` (atom or term).
- **Behavior**: Classifies architectural topology descriptors into the optimal OTP restart strategy atom: maps \`independent_workers\` to \`one_for_one\`, \`dependent_pipeline\` to \`rest_for_one\`, \`coupled_cluster\` to \`one_for_all\`, and \`dynamic_pool\` to \`simple_one_for_one\`. Any unrecognized input must return an \`unknown_topology\` error tuple.
- **Examples**:
  - \`strategy_planner:select_strategy_for_topology(dependent_pipeline)\` returns \`rest_for_one\`.
  - \`strategy_planner:select_strategy_for_topology(unknown)\` returns \`{error, unknown_topology}\`.

#### \`calculate_restart_budget/2\`
- **Input**: \`MaxCrashes\` (non-negative integer), \`WindowSeconds\` (positive integer).
- **Behavior**: Enforces via guard clauses that both inputs are integers with \`MaxCrashes\` at least zero and \`WindowSeconds\` strictly positive. Computes the floating-point crash rate per second over the time window and returns a budget summary map containing \`intensity\`, \`period\`, \`max_rate_per_sec\`, and \`tolerated_downtime\` set to \`ok\`.
- **Examples**:
  - \`strategy_planner:calculate_restart_budget(10, 2)\` returns \`#{intensity => 10, max_rate_per_sec => 5.0, period => 2, tolerated_downtime => ok}\`.

## Rules & Verification Constraints

- Must export \`build_sup_flags/3\`, \`select_strategy_for_topology/1\`, and \`calculate_restart_budget/2\`.
- Must use guard clauses (\`when\`) to validate supervisor strategy atoms and integer ranges.
- \`max_rate_per_sec\` must be a floating-point value.
`,
    mentalModelCheck: {
      question: 'In a supervision tree with children [db_pool, pricing_cache, order_gateway] under rest_for_one, what happens when pricing_cache crashes?',
      options: [
        {
          id: 'A',
          label: 'pricing_cache and downstream order_gateway are restarted; upstream db_pool is untouched.',
          isCorrect: true,
          explanation: 'rest_for_one terminates and restarts the crashed worker and any worker started after it in the child spec list, preserving upstream dependencies.',
        },
        {
          id: 'B',
          label: 'All three workers (db_pool, pricing_cache, order_gateway) are terminated and restarted.',
          isCorrect: false,
          explanation: 'That is the behavior of one_for_all, not rest_for_one.',
        },
        {
          id: 'C',
          label: 'Only pricing_cache is restarted; order_gateway continues running uninterrupted.',
          isCorrect: false,
          explanation: 'That is the behavior of one_for_one, which would leave order_gateway holding dead cache references.',
        },
        {
          id: 'D',
          label: 'db_pool and pricing_cache restart; order_gateway is untouched.',
          isCorrect: false,
          explanation: 'rest_for_one restarts downstream workers, never preceding upstream workers.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'init',
        module: 'supervisor',
        signature: 'Module:init(Args) -> {ok, {SupFlags, [ChildSpec]}} | ignore',
        typesSpec: [
          'SupFlags = #{strategy => strategy(), intensity => non_neg_integer(), period => pos_integer()}',
          'strategy() = one_for_one | rest_for_one | one_for_all | simple_one_for_one'
        ],
        description: 'Initializes the supervisor, defining the restart strategy, crash frequency limit, and initial child specifications.',
        complexityNote: 'O(1) initialization. Executed synchronously during supervisor:start_link.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/supervisor.html#Module:init/1',
      },
    ],
    starterCode: `-module(strategy_planner).

-export([
    build_sup_flags/3,
    select_strategy_for_topology/1,
    calculate_restart_budget/2
]).

%% @doc Build a supervisor flags map from a valid restart strategy atom, non-negative crash intensity, and positive period; rejects invalid bounds.
build_sup_flags(Strategy, Intensity, Period) ->
    ok.

%% @doc Map a recognized architecture topology atom to its OTP restart strategy, or return an error tuple for unknown inputs.
select_strategy_for_topology(Topology) ->
    ok.

%% @doc Compute per-second crash rate telemetry from a crash limit and positive time window in seconds; rejects invalid numeric bounds.
calculate_restart_budget(MaxCrashes, WindowSeconds) ->
    ok.
`,
    solutionCode: `-module(strategy_planner).

-export([
    build_sup_flags/3,
    select_strategy_for_topology/1,
    calculate_restart_budget/2
]).

%% @doc Build a supervisor flags map from a valid restart strategy atom, non-negative crash intensity, and positive period; rejects invalid bounds.
build_sup_flags(Strategy, Intensity, Period)
  when (Strategy =:= one_for_one orelse Strategy =:= rest_for_one orelse
        Strategy =:= one_for_all orelse Strategy =:= simple_one_for_one),
       is_integer(Intensity), Intensity >= 0,
       is_integer(Period), Period > 0 ->
    #{
        strategy => Strategy,
        intensity => Intensity,
        period => Period
    }.

%% @doc Map a recognized architecture topology atom to its OTP restart strategy, or return an error tuple for unknown inputs.
select_strategy_for_topology(independent_workers) -> one_for_one;
select_strategy_for_topology(dependent_pipeline)  -> rest_for_one;
select_strategy_for_topology(coupled_cluster)     -> one_for_all;
select_strategy_for_topology(dynamic_pool)        -> simple_one_for_one;
select_strategy_for_topology(_)                   -> {error, unknown_topology}.

%% @doc Compute per-second crash rate telemetry from a crash limit and positive time window in seconds; rejects invalid numeric bounds.
calculate_restart_budget(MaxCrashes, WindowSeconds)
  when is_integer(MaxCrashes), is_integer(WindowSeconds), MaxCrashes >= 0, WindowSeconds > 0 ->
    Rate = MaxCrashes / WindowSeconds,
    #{
        intensity => MaxCrashes,
        period => WindowSeconds,
        max_rate_per_sec => Rate,
        tolerated_downtime => ok
    }.
`,
    files: [
      {
        name: 'strategy_planner.erl',
        path: 'src/strategy_planner.erl',
        content: `-module(strategy_planner).

-export([
    build_sup_flags/3,
    select_strategy_for_topology/1,
    calculate_restart_budget/2
]).

%% @doc Build a supervisor flags map from a valid restart strategy atom, non-negative crash intensity, and positive period; rejects invalid bounds.
build_sup_flags(Strategy, Intensity, Period) ->
    ok.

%% @doc Map a recognized architecture topology atom to its OTP restart strategy, or return an error tuple for unknown inputs.
select_strategy_for_topology(Topology) ->
    ok.

%% @doc Compute per-second crash rate telemetry from a crash limit and positive time window in seconds; rejects invalid numeric bounds.
calculate_restart_budget(MaxCrashes, WindowSeconds) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/strategy_planner.erl': `-module(strategy_planner).

-export([
    build_sup_flags/3,
    select_strategy_for_topology/1,
    calculate_restart_budget/2
]).

%% @doc Build a supervisor flags map from a valid restart strategy atom, non-negative crash intensity, and positive period; rejects invalid bounds.
build_sup_flags(Strategy, Intensity, Period)
  when (Strategy =:= one_for_one orelse Strategy =:= rest_for_one orelse
        Strategy =:= one_for_all orelse Strategy =:= simple_one_for_one),
       is_integer(Intensity), Intensity >= 0,
       is_integer(Period), Period > 0 ->
    #{
        strategy => Strategy,
        intensity => Intensity,
        period => Period
    }.

%% @doc Map a recognized architecture topology atom to its OTP restart strategy, or return an error tuple for unknown inputs.
select_strategy_for_topology(independent_workers) -> one_for_one;
select_strategy_for_topology(dependent_pipeline)  -> rest_for_one;
select_strategy_for_topology(coupled_cluster)     -> one_for_all;
select_strategy_for_topology(dynamic_pool)        -> simple_one_for_one;
select_strategy_for_topology(_)                   -> {error, unknown_topology}.

%% @doc Compute per-second crash rate telemetry from a crash limit and positive time window in seconds; rejects invalid numeric bounds.
calculate_restart_budget(MaxCrashes, WindowSeconds)
  when is_integer(MaxCrashes), is_integer(WindowSeconds), MaxCrashes >= 0, WindowSeconds > 0 ->
    Rate = MaxCrashes / WindowSeconds,
    #{
        intensity => MaxCrashes,
        period => WindowSeconds,
        max_rate_per_sec => Rate,
        tolerated_downtime => ok
    }.
`,
    },
    solutionExplanation: 'Validates supervisor flag arguments, maps architectural topology descriptors to OTP restart strategy atoms, and calculates fractional restart frequency budgets.',
    astRules: {
      requiredConstructs: ['guards'],
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Build Valid Sup Flags Map',
        explanation: 'Validates strategy atom and returns standardized #{strategy, intensity, period} map.',
        erlangCall: 'strategy_planner:build_sup_flags(rest_for_one, 3, 5)',
        expectedOutput: '#{intensity => 3, period => 5, strategy => rest_for_one}',
      },
      {
        id: 'tc2',
        title: 'Select Strategy for Topology',
        explanation: 'Maps dependent_pipeline to rest_for_one and unknown to error tuple.',
        erlangCall: '{strategy_planner:select_strategy_for_topology(dependent_pipeline), strategy_planner:select_strategy_for_topology(unknown)}',
        expectedOutput: '{rest_for_one, {error, unknown_topology}}',
      },
      {
        id: 'tc3',
        title: 'Calculate Restart Budget',
        explanation: 'Computes max_rate_per_sec as a float from MaxCrashes and WindowSeconds.',
        erlangCall: 'maps:get(max_rate_per_sec, strategy_planner:calculate_restart_budget(10, 2))',
        expectedOutput: '5.0',
      },
    ],
  },

  // ── Lesson 8.2: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch08-l02',
    chapterNumber: 8,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'Child Specifications, Restart Types (permanent/transient/temporary) & Shutdown Semantics',
    visualScene: 'supervision_rest_for_one_ets_heir',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

A supervisor does not spawn processes blindly. Every child managed by an OTP supervisor is declared through a **Child Specification** (\`child_spec()\`), which defines six operational contracts:
1. Its unique registry key within that supervisor (\`id\`).
2. The startup MFA entrypoint returning the process PID (\`start\`).
3. Under which exit conditions the process is restarted (\`restart\`).
4. How long the supervisor waits gracefully before escalating to \`kill\` (\`shutdown\`).
5. Whether the node is a leaf \`worker\` or a nested child \`supervisor\` (\`type\`).
6. Which modules OTP releases must lock or purge during hot-code upgrades (\`modules\`).

## Deep Concept Breakdown & Under the Hood

### The Modern Map-Based \`child_spec()\` Anatomy

Each entry returned in a supervisor's child list uses six standardized map keys: \`id\`, \`start\`, \`restart\`, \`shutdown\`, \`type\`, and \`modules\`.

### The Restart Type Truth Table

The \`restart\` field defines how a supervisor reacts to different exit signals delivered to its trapped mailbox:

| Restart Type | Crash (\`error\`, \`badmatch\`, \`exit(crash)\`) | Normal Exit (\`exit(normal)\`) | Clean Shutdown (\`shutdown\`, \`{shutdown, Term}\`) |
| :--- | :--- | :--- | :--- |
| **\`permanent\`** | **Restart** | **Restart** | **Restart** |
| **\`transient\`** | **Restart** | *Do NOT restart* | *Do NOT restart* |
| **\`temporary\`** | *Do NOT restart* | *Do NOT restart* | *Do NOT restart* |

- **Why \`{shutdown, Term}\` Matters**: In production OTP systems (such as shutting down a TLS socket after client disconnect or terminating a timed-out HTTP handler), workers exit with \`{shutdown, Reason}\` to log context without triggering crash alarms. Supervisors treat both \`shutdown\` atoms and tagged \`{shutdown, Term}\` tuples as intentional clean exits so \`transient\` jobs stay stopped.
- **Process Role Examples**: Long-lived connection pools and core routers run as \`permanent\`; one-off data migrations or finite batch workers run as \`transient\`; ephemeral client sessions that clients can re-dial cleanly run as \`temporary\`.

### What the BEAM Does Under the Hood: Shutdown Order & Timeouts

When a supervisor shuts down, or when \`rest_for_one\` / \`one_for_all\` restarts downstream siblings:
1. **Startup is strictly forward (top-to-bottom)**: \`[Child1, Child2, Child3]\`.
2. **Shutdown is strictly reverse order**: \`Child3\` terminates first, then \`Child2\`, then \`Child1\`.
3. To terminate a child gracefully, the supervisor sends an exit signal: \`exit(ChildPid, shutdown)\`.
4. If the child enables \`process_flag(trap_exit, true)\`, its \`terminate(shutdown, State)\` callback runs to flush buffers and close sockets within the configured \`shutdown\` millisecond budget.
5. If that deadline expires without exit, the supervisor sends an untrappable \`exit(ChildPid, kill)\`.

> [!warning] Production Supervision Trap: Premature Killing of Child Supervisors
> For nested child supervisors, \`shutdown\` **MUST** be set to \`infinity\`!
> A child supervisor needs sufficient time to walk through and terminate all of its own children in reverse order before exiting itself. Giving a child supervisor a 5,000ms limit or \`brutal_kill\` causes parent supervisors to kill the sub-supervisor early, leaking orphaned grandchild processes across the BEAM VM.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Type Spec (stdlib / supervisor)
child_spec() = #{
    id => child_id(),
    start => mfargs(),
    restart => restart(),
    shutdown => shutdown(),
    type => worker | supervisor,
    modules => [module()] | dynamic
}
  Types:
    child_id() = term()
    mfargs() = {M :: module(), F :: atom(), A :: [term()]}
    restart() = permanent | transient | temporary
    shutdown() = brutal_kill | timeout() | infinity
\`\`\`

In the OTP \`supervisor\` documentation, \`timeout()\` stands for a non-negative integer millisecond budget (such as \`5000\`), whereas \`brutal_kill\` triggers immediate \`exit(ChildPid, kill)\` and \`infinity\` waits indefinitely for nested sub-trees. Consult the attached OTP Doc Card below for the live type schema.

## Parallel Worked Example: Audio Transcoder Supervisor Config

Consider \`transcoder_sup_config\`, a configuration and exit-classification module paired with an audio transcoder supervisor. Notice how it models tagged-tuple pattern matching for clean exits, compound guard validation with \`orelse\` and \`andalso\`, and explicit \`type => supervisor\` vs. \`type => worker\` specs inside \`init/1\`:

\`\`\`erlang
-module(transcoder_sup_config).
-behaviour(supervisor).

-export([
    init/1,
    is_clean_exit/1,
    validate_shutdown_opt/1
]).

%% @doc Check whether an exit reason is a normal or graceful supervisor shutdown.
is_clean_exit(normal)        -> true;
is_clean_exit(shutdown)      -> true;
is_clean_exit({shutdown, _}) -> true;
is_clean_exit(_)             -> false.

%% @doc Verify that a shutdown timeout option conforms to OTP supervisor constraints.
validate_shutdown_opt(Timeout)
  when Timeout =:= brutal_kill orelse Timeout =:= infinity orelse
       (is_integer(Timeout) andalso Timeout >= 0) ->
    ok;
validate_shutdown_opt(_) ->
    {error, invalid_shutdown}.

%% @doc Return SupFlags and a two-tier child spec list for an audio pipeline.
init({CodecMod, Channels}) when is_atom(CodecMod), is_list(Channels) ->
    SupFlags = #{strategy => rest_for_one, intensity => 4, period => 10},
    ArchiveSup = #{
        id => archive_mgr_sup,
        start => {archive_mgr_sup, start_link, []},
        restart => permanent,
        shutdown => infinity,
        type => supervisor,
        modules => [archive_mgr_sup]
    },
    AudioWorker = #{
        id => codec_worker,
        start => {CodecMod, start_link, Channels},
        restart => transient,
        shutdown => 2000,
        type => worker,
        modules => [CodecMod]
    },
    {ok, {SupFlags, [ArchiveSup, AudioWorker]}}.
\`\`\`

Key Erlang mechanics illustrated above:
- **Clause Order & Tagged Shutdown Tuples**: Placing \`{shutdown, _}\` ahead of the \`_\` catch-all in \`is_clean_exit/1\` ensures tagged clean-shutdown reasons do not fall through into crash handling.
- **Type Guards & Nested \`orelse\` / \`andalso\`**: Guard BIFs such as \`is_atom/1\`, \`is_list/1\`, and parenthesized numeric comparisons (\`is_integer(Timeout) andalso Timeout >= 0\`) prevent bad terms from bypassing validation.
- **Hierarchical Child Specs in \`init/1\`**: Nested supervisors declare \`type => supervisor\` with \`shutdown => infinity\`, whereas leaf workers specify finite millisecond shutdown budgets and pass runtime initialization arguments in the \`start\` tuple.

## Assignment Specification

Implement \`src/child_spec_factory.erl\` with the following exports:

\`\`\`erlang
-module(child_spec_factory).

-export([
    worker_spec/4,
    supervisor_spec/2,
    classify_restart/2
]).
\`\`\`

### Functional Requirements

#### \`worker_spec/4\`
- **Input**: \`Id\` (arbitrary term identifier), \`Module\` (atom), \`Args\` (list of arguments passed to initialization), \`RestartType\` (\`permanent\`, \`transient\`, or \`temporary\` atom).
- **Behavior**: Enforces via guard clauses that \`Module\` is an atom, \`Args\` is a list, and \`RestartType\` is one of the three valid OTP restart strategies. Constructs and returns a child specification map for a leaf worker configured with a \`5000\` millisecond shutdown timeout, worker node \`type\`, startup target invoking \`start_link\` with \`Args\` on \`Module\`, and a single-element \`modules\` list referencing \`Module\`. Invalid arguments must trigger a function clause rejection.
- **Examples**:
  - \`child_spec_factory:worker_spec(cache_srv, my_cache, [100], transient)\` returns \`#{id => cache_srv, modules => [my_cache], restart => transient, shutdown => 5000, start => {my_cache, start_link, [100]}, type => worker}\`.

#### \`supervisor_spec/2\`
- **Input**: \`Id\` (arbitrary term identifier), \`SupModule\` (atom).
- **Behavior**: Enforces via guard clauses that \`SupModule\` is an atom. Constructs and returns a child specification map configured as a nested supervisor node with \`permanent\` restart policy, \`infinity\` shutdown timeout (protecting child sub-trees from orphan leaks), startup target invoking \`start_link\` with an empty argument list on \`SupModule\`, and a single-element \`modules\` list referencing \`SupModule\`.
- **Examples**:
  - \`child_spec_factory:supervisor_spec(sub_sup, sub_sup_mod)\` returns \`#{id => sub_sup, modules => [sub_sup_mod], restart => permanent, shutdown => infinity, start => {sub_sup_mod, start_link, []}, type => supervisor}\`.

#### \`classify_restart/2\`
- **Input**: \`RestartType\` (\`permanent\`, \`transient\`, or \`temporary\` atom), \`ExitReason\` (exit reason term).
- **Behavior**: Implements the full OTP Restart Type Truth Table, returning either \`restart\` or \`do_not_restart\`. Always restarts \`permanent\` processes regardless of reason; never restarts \`temporary\` processes regardless of reason; restarts \`transient\` processes strictly on unexpected crashes while treating \`normal\`, \`shutdown\`, and tagged \`shutdown\` tuples as clean exits that must not restart.
- **Examples**:
  - \`child_spec_factory:classify_restart(transient, normal)\` returns \`do_not_restart\`.
  - \`child_spec_factory:classify_restart(permanent, normal)\` returns \`restart\`.
  - \`child_spec_factory:classify_restart(transient, connection_lost)\` returns \`restart\`.

## Rules & Verification Constraints

- Must export \`worker_spec/4\`, \`supervisor_spec/2\`, and \`classify_restart/2\`.
- Must use guard clauses (\`when\`) to enforce atom, list, and restart policy invariants.
- Must enforce infinite shutdown timeouts on nested supervisor specs and properly match tagged clean-shutdown tuples.
`,
    mentalModelCheck: {
      question: 'Why does OTP require nested child supervisors to have shutdown => infinity instead of a numeric timeout like 5000?',
      options: [
        {
          id: 'A',
          label: 'A child supervisor needs sufficient time to terminate all of its own children in reverse order before it can exit; killing it prematurely leaves orphaned grandchild processes.',
          isCorrect: true,
          explanation: 'Supervisors must wait indefinitely for their children to finish terminating. The top-level application master manages the ultimate release shutdown timeout.',
        },
        {
          id: 'B',
          label: 'Erlang timers cannot run inside supervisor processes.',
          isCorrect: false,
          explanation: 'Supervisors can use timers; infinity is used to guarantee hierarchical clean shutdown without orphan leaks.',
        },
        {
          id: 'C',
          label: 'infinity makes the child process unkillable by OS signals.',
          isCorrect: false,
          explanation: 'OS signals kill the entire BEAM runtime; shutdown affects internal OTP supervisor exit signals.',
        },
        {
          id: 'D',
          label: 'numeric timeouts are only allowed on transient workers.',
          isCorrect: false,
          explanation: 'numeric timeouts are allowed on any worker process regardless of restart type.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'child_spec',
        module: 'supervisor',
        signature: 'child_spec() = #{id => term(), start => {M, F, A}, restart => restart(), shutdown => shutdown(), type => worker | supervisor, modules => [module()]}',
        typesSpec: [
          'restart() = permanent | transient | temporary',
          'shutdown() = brutal_kill | timeout() | infinity'
        ],
        description: 'Map representation of a supervised child process, controlling start MFA, restart policy, shutdown timeout, and tree node type.',
        complexityNote: 'Static declarative specification compiled in supervisor init.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/supervisor.html#type-child_spec',
      },
    ],
    starterCode: `-module(child_spec_factory).

-export([
    worker_spec/4,
    supervisor_spec/2,
    classify_restart/2
]).

%% @doc Build a worker child specification map from an ID, module atom, start argument list, and restart policy atom; rejects invalid argument types or restart strategies.
worker_spec(Id, Module, Args, RestartType) ->
    ok.

%% @doc Build a nested supervisor child specification map enforcing hierarchical shutdown safety; rejects non-atom supervisor module names.
supervisor_spec(Id, SupModule) ->
    ok.

%% @doc Classify whether OTP restarts a child given its restart type and exit reason, distinguishing normal or clean shutdown exits from crashes.
classify_restart(RestartType, ExitReason) ->
    ok.
`,
    solutionCode: `-module(child_spec_factory).

-export([
    worker_spec/4,
    supervisor_spec/2,
    classify_restart/2
]).

%% @doc Build a worker child specification map from an ID, module atom, start argument list, and restart policy atom; rejects invalid argument types or restart strategies.
worker_spec(Id, Module, Args, RestartType)
  when is_atom(Module), is_list(Args),
       (RestartType =:= permanent orelse RestartType =:= transient orelse RestartType =:= temporary) ->
    #{
        id => Id,
        start => {Module, start_link, Args},
        restart => RestartType,
        shutdown => 5000,
        type => worker,
        modules => [Module]
    }.

%% @doc Build a nested supervisor child specification map enforcing hierarchical shutdown safety; rejects non-atom supervisor module names.
supervisor_spec(Id, SupModule) when is_atom(SupModule) ->
    #{
        id => Id,
        start => {SupModule, start_link, []},
        restart => permanent,
        shutdown => infinity,
        type => supervisor,
        modules => [SupModule]
    }.

%% @doc Classify whether OTP restarts a child given its restart type and exit reason, distinguishing normal or clean shutdown exits from crashes.
classify_restart(permanent, _Reason) ->
    restart;
classify_restart(temporary, _Reason) ->
    do_not_restart;
classify_restart(transient, normal) ->
    do_not_restart;
classify_restart(transient, shutdown) ->
    do_not_restart;
classify_restart(transient, {shutdown, _}) ->
    do_not_restart;
classify_restart(transient, _AbnormalReason) ->
    restart.
`,
    files: [
      {
        name: 'child_spec_factory.erl',
        path: 'src/child_spec_factory.erl',
        content: `-module(child_spec_factory).

-export([
    worker_spec/4,
    supervisor_spec/2,
    classify_restart/2
]).

%% @doc Build a worker child specification map from an ID, module atom, start argument list, and restart policy atom; rejects invalid argument types or restart strategies.
worker_spec(Id, Module, Args, RestartType) ->
    ok.

%% @doc Build a nested supervisor child specification map enforcing hierarchical shutdown safety; rejects non-atom supervisor module names.
supervisor_spec(Id, SupModule) ->
    ok.

%% @doc Classify whether OTP restarts a child given its restart type and exit reason, distinguishing normal or clean shutdown exits from crashes.
classify_restart(RestartType, ExitReason) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/child_spec_factory.erl': `-module(child_spec_factory).

-export([
    worker_spec/4,
    supervisor_spec/2,
    classify_restart/2
]).

%% @doc Build a worker child specification map from an ID, module atom, start argument list, and restart policy atom; rejects invalid argument types or restart strategies.
worker_spec(Id, Module, Args, RestartType)
  when is_atom(Module), is_list(Args),
       (RestartType =:= permanent orelse RestartType =:= transient orelse RestartType =:= temporary) ->
    #{
        id => Id,
        start => {Module, start_link, Args},
        restart => RestartType,
        shutdown => 5000,
        type => worker,
        modules => [Module]
    }.

%% @doc Build a nested supervisor child specification map enforcing hierarchical shutdown safety; rejects non-atom supervisor module names.
supervisor_spec(Id, SupModule) when is_atom(SupModule) ->
    #{
        id => Id,
        start => {SupModule, start_link, []},
        restart => permanent,
        shutdown => infinity,
        type => supervisor,
        modules => [SupModule]
    }.

%% @doc Classify whether OTP restarts a child given its restart type and exit reason, distinguishing normal or clean shutdown exits from crashes.
classify_restart(permanent, _Reason) ->
    restart;
classify_restart(temporary, _Reason) ->
    do_not_restart;
classify_restart(transient, normal) ->
    do_not_restart;
classify_restart(transient, shutdown) ->
    do_not_restart;
classify_restart(transient, {shutdown, _}) ->
    do_not_restart;
classify_restart(transient, _AbnormalReason) ->
    restart.
`,
    },
    solutionExplanation: 'Constructs standardized child specification maps for workers and supervisors with shutdown => infinity protection, and implements the OTP Restart Type Truth Table.',
    astRules: {
      requiredConstructs: ['guards'],
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Worker Spec Construction',
        explanation: 'Builds a worker child spec with type => worker and 5000ms shutdown timeout.',
        erlangCall: 'child_spec_factory:worker_spec(cache_srv, my_cache, [100], transient)',
        expectedOutput: '#{id => cache_srv, modules => [my_cache], restart => transient, shutdown => 5000, start => {my_cache, start_link, [100]}, type => worker}',
      },
      {
        id: 'tc2',
        title: 'Supervisor Spec Construction',
        explanation: 'Builds a nested supervisor spec with type => supervisor and shutdown => infinity.',
        erlangCall: 'child_spec_factory:supervisor_spec(sub_sup, sub_sup_mod)',
        expectedOutput: '#{id => sub_sup, modules => [sub_sup_mod], restart => permanent, shutdown => infinity, start => {sub_sup_mod, start_link, []}, type => supervisor}',
      },
      {
        id: 'tc3',
        title: 'Classify Restart Truth Table',
        explanation: 'Checks transient on normal exit vs permanent on normal exit.',
        erlangCall: '{child_spec_factory:classify_restart(transient, normal), child_spec_factory:classify_restart(permanent, normal), child_spec_factory:classify_restart(transient, connection_lost)}',
        expectedOutput: '{do_not_restart, restart, restart}',
      },
    ],
  },

  // ── Lesson 8.3: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch08-l03',
    chapterNumber: 8,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Restart Intensity Blizzards (intensity/period) & Upward Crash Escalation',
    visualScene: 'supervision_rest_for_one_ets_heir',
    difficulty: 'Advanced',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

What happens when a critical dependency suffers a catastrophic failure—for example, a primary PostgreSQL cluster losing connectivity, or a corrupted TLS key failing every startup?

If a \`permanent\` worker crashes immediately every time the supervisor spawns it, an uncapped supervisor would spin in a tight 100% CPU loop, saturating schedulers and flooding logs until the entire BEAM node becomes unresponsive.

## Deep Concept Breakdown & Under the Hood

### The OTP Sliding Window Rate Limiter

Every OTP supervisor runs a built-in sliding window rate limiter configured via \`intensity\` (maximum restarts \`MaxR\`) and \`period\` (window duration \`MaxT\` seconds) in \`sup_flags()\`:
1. When a child terminates abnormally, the supervisor appends the current monotonic timestamp to an internal \`restarts\` queue.
2. It prunes timestamps older than \`MaxT\` seconds relative to the latest crash.
3. It counts remaining crashes inside the inclusive window from \`Latest - MaxT\` through \`Latest\`.
4. If \`CrashCount <= MaxR\`, the supervisor stays within budget and restarts affected children; if \`CrashCount > MaxR\`, **Max Restart Intensity Exceeded** triggers upward escalation.

### What the BEAM Does Under the Hood: Shutdown Escalation & Ordering

When the intensity budget is exceeded:
- The supervisor stops restarting children locally because the fault is systemic.
- It terminates all surviving children in **strict reverse startup order** and exits itself with \`shutdown\`.
- Because supervisors link upward, that exit notifies the parent supervisor, which can either restart the entire sub-tree or escalate further toward the application root.

Similarly, under \`rest_for_one\` on a chain \`[db_pool, pricing_cache, order_gateway]\`, crashing \`pricing_cache\` stops downstream children in **reverse startup order** (\`order_gateway\`, then \`pricing_cache\`) before rebooting them in **forward dependency order** (\`pricing_cache\`, then \`order_gateway\`), leaving \`db_pool\` untouched.

> [!warning] Production Supervision Trap: Intensity Blizzard CPU Starvation
> Setting \`intensity => 1000, period => 1\` disables crash throttling in practice. Deterministic startup failures will pin scheduler threads inside restart loops, starving live traffic. Always calibrate tight bounds (such as \`intensity => 3..5\` over \`period => 5..10\` seconds).

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Type Spec (stdlib / supervisor)
sup_flags() = #{
    strategy => strategy(),
    intensity => non_neg_integer(),
    period => pos_integer()
}

%% Official OTP Signature (stdlib / lists)
lists:splitwith(Pred, List1) -> {List2, List3}
  Types:
    Pred = fun((Elem :: T) -> boolean())
    List1 = List2 = List3 = [T]
\`\`\`

\`lists:splitwith/2\` splits \`List1\` into a leading prefix \`List2\` of elements satisfying \`Pred(Elem) =:= true\` and a trailing remainder \`List3\` starting at the **first element** where \`Pred\` returns \`false\` (or \`[]\` if every element matched). Consult the attached OTP Doc Card below for the full \`sup_flags()\` schema.

## Parallel Worked Example: Deployment Window & Rollback Audit

Consider \`deploy_window_audit\`, a small CI/CD release auditor that identifies stale deploy timestamps relative to the latest event and determines rollback steps preceding a deployment gate:

\`\`\`erlang
-module(deploy_window_audit).

-export([
    partition_stale_events/2,
    rollback_before_gate/2
]).

%% @doc Partition timestamps into stale and active sets relative to the newest event.
partition_stale_events([], _RetentionSec) ->
    {[], []};
partition_stale_events(Timestamps, RetentionSec)
  when is_list(Timestamps), is_integer(RetentionSec), RetentionSec > 0 ->
    Anchor = lists:max(Timestamps),
    Cutoff = Anchor - RetentionSec,
    lists:partition(fun(T) -> T < Cutoff end, Timestamps).

%% @doc Return steps completed prior to GateName in reverse rollback order.
rollback_before_gate(PipelineSteps, GateName) when is_list(PipelineSteps) ->
    case lists:splitwith(fun(Step) -> Step =/= GateName end, PipelineSteps) of
        {AllSteps, []} ->
            {gate_missing, AllSteps};
        {PriorSteps, _Remaining} ->
            {rollback, lists:reverse(PriorSteps)}
    end.
\`\`\`

Key Erlang mechanics illustrated above:
- **Empty-List Clause Before \`lists:max/1\`**: Calling \`lists:max([])\` raises \`function_clause\`, so handling \`[]\` in an earlier clause keeps empty histories safe while enforcing numeric bounds in the non-empty clause.
- **Pivot Splitting with \`lists:splitwith/2\`**: Matching against elements *not equal* to a target places everything upstream in the first tuple element and keeps the target itself at the head of the second tuple element (or \`[]\` when absent).

## Assignment Specification

Implement \`src/escalation_analyzer.erl\` with the following exports:

\`\`\`erlang
-module(escalation_analyzer).

-export([
    evaluate_crash_burst/3,
    plan_escalation_action/2,
    reverse_shutdown_order/1
]).
\`\`\`

### Functional Requirements

#### \`evaluate_crash_burst/3\`
- **Input**: \`CrashTimestampsSecList\` (list of numeric timestamps in seconds), \`MaxR\` (non-negative integer restart limit), \`MaxT\` (positive integer window duration in seconds).
- **Behavior**: Handles empty histories immediately as zero crashes within budget (while still enforcing valid \`MaxR\` and \`MaxT\` bounds via guards). For non-empty lists, finds the latest crash timestamp and counts how many crash timestamps fall inside the inclusive sliding window spanning from \`MaxT\` seconds prior to the latest crash up through the latest crash itself. Replies with \`within_budget\` when the count does not exceed \`MaxR\`, or \`escalate_to_parent\` when it exceeds \`MaxR\`, bundling the counted crashes and \`MaxR\` in a 3-tuple.
- **Examples**:
  - \`escalation_analyzer:evaluate_crash_burst([10, 12, 14], 3, 5)\` returns \`{within_budget, 3, 3}\`.
  - \`escalation_analyzer:evaluate_crash_burst([10, 11, 12, 13], 3, 5)\` returns \`{escalate_to_parent, 4, 3}\`.

#### \`plan_escalation_action/2\`
- **Input**: \`ChildOrderList\` (ordered startup list of child identifiers), \`CrashedChildId\` (identifier term).
- **Behavior**: Locates \`CrashedChildId\` within \`ChildOrderList\`. If missing, returns an \`unknown\` / missing child error tuple (\`child_not_found\`). When found, isolates the crashed child and all children started after it as the affected subset, computes the reverse-order teardown sequence and forward-order restart sequence, and returns a 4-tuple pairing \`stop_in_reverse_order\` with the teardown list and \`restart_in_order\` with the forward restart list.
- **Examples**:
  - \`escalation_analyzer:plan_escalation_action([db_pool, pricing_cache, order_gateway], pricing_cache)\` returns \`{stop_in_reverse_order, [order_gateway, pricing_cache], restart_in_order, [pricing_cache, order_gateway]}\`.
  - \`escalation_analyzer:plan_escalation_action([db_pool], missing)\` returns \`{error, child_not_found}\`.

#### \`reverse_shutdown_order/1\`
- **Input**: \`StartupChildIdsList\` (list of child identifiers in startup order).
- **Behavior**: Enforces via guard clauses that the argument is a list and returns the exact full-supervisor teardown order by reversing the startup sequence.
- **Examples**:
  - \`escalation_analyzer:reverse_shutdown_order([db_pool, pricing_cache, order_gateway])\` returns \`[order_gateway, pricing_cache, db_pool]\`.

## Rules & Verification Constraints

- Must export \`evaluate_crash_burst/3\`, \`plan_escalation_action/2\`, and \`reverse_shutdown_order/1\`.
- Must use guard clauses (\`when\`) enforcing list types, non-negative crash intensity, and positive window periods.
- Sliding-window timestamps must be counted inclusively across both bounds.
`,
    mentalModelCheck: {
      question: 'When a supervisor exceeds its MaxR restarts within MaxT seconds, why does it shut itself down instead of just giving up on that single worker?',
      options: [
        {
          id: 'A',
          label: 'To escalate the failure up the supervision tree, allowing a higher-level supervisor with a broader architectural perspective to restart the entire subsystem.',
          isCorrect: true,
          explanation: 'Supervisors isolate failures locally until their restart budget is exhausted. When exceeded, escalating to the parent supervisor prevents infinite localized loops.',
        },
        {
          id: 'B',
          label: 'Because the supervisor process runs out of memory from storing crash timestamps.',
          isCorrect: false,
          explanation: 'The timestamp queue is tiny (pruned to MaxT seconds); shutdown is a deliberate architectural escalation mechanism.',
        },
        {
          id: 'C',
          label: 'Because the BEAM VM automatically sends a kill signal to any supervisor whose worker crashes.',
          isCorrect: false,
          explanation: 'The BEAM VM never kills supervisors automatically; the supervisor decides to terminate itself via its sup_flags contract.',
        },
        {
          id: 'D',
          label: 'To reboot the host operating system.',
          isCorrect: false,
          explanation: 'Erlang supervision trees operate purely within the user-space BEAM runtime.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'sup_flags',
        module: 'supervisor',
        signature: 'sup_flags() = #{strategy => strategy(), intensity => non_neg_integer(), period => pos_integer()}',
        typesSpec: [
          'intensity => non_neg_integer()',
          'period => pos_integer()'
        ],
        description: 'Defines restart frequency threshold (intensity / period). If exceeded, supervisor terminates itself with shutdown to escalate upward.',
        complexityNote: 'Maintained as an O(N) timestamp queue inside the supervisor loop.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/supervisor.html#type-sup_flags',
      },
    ],
    starterCode: `-module(escalation_analyzer).

-export([
    evaluate_crash_burst/3,
    plan_escalation_action/2,
    reverse_shutdown_order/1
]).

%% @doc Evaluate whether crash timestamps exceed the allowed restart intensity within the sliding period window; treats empty lists as zero crashes and rejects negative intensity or non-positive period bounds.
evaluate_crash_burst(CrashTimestampsSecList, MaxR, MaxT) ->
    ok.

%% @doc Determine affected downstream children from a startup order at a crashed child ID, returning reverse shutdown and forward restart plans or an error tuple if missing.
plan_escalation_action(ChildOrderList, CrashedChildId) ->
    ok.

%% @doc Compute the supervisor teardown sequence by reversing a child startup ID list; rejects non-list inputs.
reverse_shutdown_order(StartupChildIdsList) ->
    ok.
`,
    solutionCode: `-module(escalation_analyzer).

-export([
    evaluate_crash_burst/3,
    plan_escalation_action/2,
    reverse_shutdown_order/1
]).

%% @doc Evaluate whether crash timestamps exceed the allowed restart intensity within the sliding period window; treats empty lists as zero crashes and rejects negative intensity or non-positive period bounds.
evaluate_crash_burst([], MaxR, MaxT)
  when is_integer(MaxR), MaxR >= 0, is_integer(MaxT), MaxT > 0 ->
    {within_budget, 0, MaxR};
evaluate_crash_burst(CrashTimestampsSecList, MaxR, MaxT)
  when is_list(CrashTimestampsSecList), is_integer(MaxR), MaxR >= 0, is_integer(MaxT), MaxT > 0 ->
    Latest = lists:max(CrashTimestampsSecList),
    Threshold = Latest - MaxT,
    InWindow = [Ts || Ts <- CrashTimestampsSecList, Ts >= Threshold, Ts =< Latest],
    Count = length(InWindow),
    if
        Count > MaxR -> {escalate_to_parent, Count, MaxR};
        true         -> {within_budget, Count, MaxR}
    end.

%% @doc Determine affected downstream children from a startup order at a crashed child ID, returning reverse shutdown and forward restart plans or an error tuple if missing.
plan_escalation_action(ChildOrderList, CrashedChildId) when is_list(ChildOrderList) ->
    case lists:splitwith(fun(Id) -> Id =/= CrashedChildId end, ChildOrderList) of
        {_Prefix, []} ->
            {error, child_not_found};
        {_Prefix, Affected} ->
            ToStop = lists:reverse(Affected),
            ToRestart = Affected,
            {stop_in_reverse_order, ToStop, restart_in_order, ToRestart}
    end.

%% @doc Compute the supervisor teardown sequence by reversing a child startup ID list; rejects non-list inputs.
reverse_shutdown_order(StartupChildIdsList) when is_list(StartupChildIdsList) ->
    lists:reverse(StartupChildIdsList).
`,
    files: [
      {
        name: 'escalation_analyzer.erl',
        path: 'src/escalation_analyzer.erl',
        content: `-module(escalation_analyzer).

-export([
    evaluate_crash_burst/3,
    plan_escalation_action/2,
    reverse_shutdown_order/1
]).

%% @doc Evaluate whether crash timestamps exceed the allowed restart intensity within the sliding period window; treats empty lists as zero crashes and rejects negative intensity or non-positive period bounds.
evaluate_crash_burst(CrashTimestampsSecList, MaxR, MaxT) ->
    ok.

%% @doc Determine affected downstream children from a startup order at a crashed child ID, returning reverse shutdown and forward restart plans or an error tuple if missing.
plan_escalation_action(ChildOrderList, CrashedChildId) ->
    ok.

%% @doc Compute the supervisor teardown sequence by reversing a child startup ID list; rejects non-list inputs.
reverse_shutdown_order(StartupChildIdsList) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/escalation_analyzer.erl': `-module(escalation_analyzer).

-export([
    evaluate_crash_burst/3,
    plan_escalation_action/2,
    reverse_shutdown_order/1
]).

%% @doc Evaluate whether crash timestamps exceed the allowed restart intensity within the sliding period window; treats empty lists as zero crashes and rejects negative intensity or non-positive period bounds.
evaluate_crash_burst([], MaxR, MaxT)
  when is_integer(MaxR), MaxR >= 0, is_integer(MaxT), MaxT > 0 ->
    {within_budget, 0, MaxR};
evaluate_crash_burst(CrashTimestampsSecList, MaxR, MaxT)
  when is_list(CrashTimestampsSecList), is_integer(MaxR), MaxR >= 0, is_integer(MaxT), MaxT > 0 ->
    Latest = lists:max(CrashTimestampsSecList),
    Threshold = Latest - MaxT,
    InWindow = [Ts || Ts <- CrashTimestampsSecList, Ts >= Threshold, Ts =< Latest],
    Count = length(InWindow),
    if
        Count > MaxR -> {escalate_to_parent, Count, MaxR};
        true         -> {within_budget, Count, MaxR}
    end.

%% @doc Determine affected downstream children from a startup order at a crashed child ID, returning reverse shutdown and forward restart plans or an error tuple if missing.
plan_escalation_action(ChildOrderList, CrashedChildId) when is_list(ChildOrderList) ->
    case lists:splitwith(fun(Id) -> Id =/= CrashedChildId end, ChildOrderList) of
        {_Prefix, []} ->
            {error, child_not_found};
        {_Prefix, Affected} ->
            ToStop = lists:reverse(Affected),
            ToRestart = Affected,
            {stop_in_reverse_order, ToStop, restart_in_order, ToRestart}
    end.

%% @doc Compute the supervisor teardown sequence by reversing a child startup ID list; rejects non-list inputs.
reverse_shutdown_order(StartupChildIdsList) when is_list(StartupChildIdsList) ->
    lists:reverse(StartupChildIdsList).
`,
    },
    solutionExplanation: 'Implements the sliding-window crash intensity rate limiter algorithm and calculates downstream reverse-order termination and forward-order restart plans for rest_for_one pipelines.',
    astRules: {
      requiredConstructs: ['guards'],
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Crash Burst Within Budget',
        explanation: 'Tests 3 crashes within window with MaxR = 3 (within budget).',
        erlangCall: 'escalation_analyzer:evaluate_crash_burst([10, 12, 14], 3, 5)',
        expectedOutput: '{within_budget, 3, 3}',
      },
      {
        id: 'tc2',
        title: 'Crash Burst Exceeds Budget (Escalate)',
        explanation: 'Tests 4 crashes within 5-second window with MaxR = 3 (triggers escalation).',
        erlangCall: 'escalation_analyzer:evaluate_crash_burst([10, 11, 12, 13], 3, 5)',
        expectedOutput: '{escalate_to_parent, 4, 3}',
      },
      {
        id: 'tc3',
        title: 'Plan Escalation Action (rest_for_one)',
        explanation: 'Downstream reverse shutdown and forward restart order when middle child pricing_cache crashes.',
        erlangCall: 'escalation_analyzer:plan_escalation_action([db_pool, pricing_cache, order_gateway], pricing_cache)',
        expectedOutput: '{stop_in_reverse_order, [order_gateway, pricing_cache], restart_in_order, [pricing_cache, order_gateway]}',
      },
    ],
  },

  // ── Lesson 8.4: Concept Exercise (Multi-File Clean Worker Architecture) ──
  {
    id: 'ch08-l04',
    chapterNumber: 8,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'Dynamic Worker Supervision (simple_one_for_one & supervisor:start_child)',
    visualScene: 'supervision_rest_for_one_ets_heir',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

Standard supervisors (\`one_for_one\`, \`rest_for_one\`) manage a **static list of known children** declared at boot time.

However, production concurrency backends routinely require **dynamic process pools**:
- A raw TCP listener spawning an isolated socket process for every incoming connection.
- An XMPP cluster creating a dedicated session state machine for every logged-in user.
- A background job orchestrator spawning ephemeral task workers on demand.

For homogeneous dynamic pools, OTP provides the **\`simple_one_for_one\`** supervisor strategy.

## Deep Concept Breakdown & Under the Hood

### How \`simple_one_for_one\` Works

1. **Zero Children at Boot**: Starting the supervisor boots it empty with zero running child processes.
2. **Single Child Spec Template**: The \`init/1\` callback returns a child list containing **exactly one** template specification describing the shared worker blueprint.
3. **Dynamic Argument Appending**:
   - The template specifies a base MFA whose argument list holds any fixed defaults (typically empty).
   - Calling \`supervisor:start_child(SupRef, RuntimeArgs)\` spawns a worker dynamically by **appending** \`RuntimeArgs\` onto the template's configured argument list and invoking \`apply(M, F, FixedArgs ++ RuntimeArgs)\`.

### Eliminating the Mixed Supervisor/Worker Anti-Pattern

> [!warning] Production Supervision Trap: Overloading Supervisor init/1
> Cramming both \`-behaviour(supervisor).\` and \`-behaviour(gen_server).\` into a single file by overloading \`init/1\` clauses causes severe maintenance friction and breaks OTP release tooling:
> \`\`\`erlang
> %% ANTI-PATTERN: Mixes lifecycle supervision with worker state
> init([]) -> {ok, {SupFlags, [Template]}};
> init({worker, SessionId}) -> {ok, State}.
> \`\`\`
> **Idiomatic Multi-File OTP Architecture**:
> - Keep the supervisor coordinator in its own dedicated module (\`src/dynamic_session_sup.erl\`).
> - Keep the stateful worker implementation in a separate companion module (\`src/session_worker.erl\`).

Inspect the read-only companion worker module \`src/session_worker.erl\` in your editor tabs—it already implements the \`gen_server\` session worker (\`start_link/2\` and \`get_info/1\`). Your responsibility is building the dynamic coordinator \`src/dynamic_session_sup.erl\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / supervisor)
supervisor:start_child(SupRef, ChildSpec | [Arg]) -> {ok, Child} | {ok, Child, Info} | {error, Reason}
supervisor:count_children(SupRef) -> PropListOrMap
supervisor:terminate_child(SupRef, ChildPid) -> ok | {error, Reason}
  Types:
    SupRef = pid() | atom()
    Arg = term()
    Child = pid()
\`\`\`

Under \`simple_one_for_one\`, the second argument to \`supervisor:start_child/2\` MUST be a list of extra arguments appended to the template MFA, and \`supervisor:terminate_child/2\` requires the child's PID rather than a static atom ID. \`supervisor:count_children/1\` returns active process counts keyed by \`active\`, \`specs\`, \`supervisors\`, and \`workers\`. Consult the attached OTP Doc Cards below for the complete reference.

## Parallel Worked Example: Webhook Dispatch Pool

Consider a multi-file webhook dispatcher combining a dynamic supervisor (\`webhook_spool_sup.erl\`) with a minimal standalone worker module (\`webhook_task.erl\`):

\`\`\`erlang
-module(webhook_spool_sup).
-behaviour(supervisor).

-export([start_link/1, dispatch_webhook/2, pool_telemetry/1, cancel_webhook/2, init/1]).

%% @doc Start an unregistered dynamic webhook supervisor with a crash intensity limit.
start_link(MaxIntensity) when is_integer(MaxIntensity), MaxIntensity > 0 ->
    supervisor:start_link(?MODULE, MaxIntensity).

%% @doc Configure simple_one_for_one with a single webhook_task worker template.
init(MaxIntensity) ->
    SupFlags = #{strategy => simple_one_for_one, intensity => MaxIntensity, period => 10},
    WorkerSpec = #{
        id => webhook_task,
        start => {webhook_task, start_link, []},
        restart => transient,
        shutdown => 3000,
        type => worker,
        modules => [webhook_task]
    },
    {ok, {SupFlags, [WorkerSpec]}}.

%% @doc Dynamically spawn a child by appending TargetUrl to the template start list.
dispatch_webhook(SupPid, TargetUrl) ->
    supervisor:start_child(SupPid, [TargetUrl]).

%% @doc Return a telemetry map summarizing active and specification child counts.
pool_telemetry(SupPid) ->
    Counts = supervisor:count_children(SupPid),
    {active, Active} = lists:keyfind(active, 1, Counts),
    {specs, Specs} = lists:keyfind(specs, 1, Counts),
    #{active_jobs => Active, templates => Specs}.

%% @doc Terminate a running dynamic child process by its PID.
cancel_webhook(SupPid, JobPid) ->
    supervisor:terminate_child(SupPid, JobPid).
\`\`\`

Minimal companion \`gen_server\` worker executed dynamically by the template:

\`\`\`erlang
-module(webhook_task).
-behaviour(gen_server).
-export([start_link/1, init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2, code_change/3]).

start_link(Url) -> gen_server:start_link(?MODULE, Url, []).
init(Url) -> {ok, Url}.
handle_call(_Req, _From, State) -> {reply, ok, State}.
handle_cast(_Msg, State) -> {noreply, State}.
handle_info(_Info, State) -> {noreply, State}.
terminate(_Reason, _State) -> ok.
code_change(_OldVsn, State, _Extra) -> {ok, State}.
\`\`\`

Key Erlang mechanics illustrated above:
- **Template Argument Appending**: Because \`WorkerSpec\` defines zero fixed arguments in its template MFA, calling \`dispatch_webhook/2\` with a single-element argument list launches \`webhook_task:start_link(TargetUrl)\`.
- **Proplist Telemetry Extraction**: \`supervisor:count_children/1\` returns tagged key-value tuples such as \`{active, Active}\`, which \`lists:keyfind/3\` extracts deterministically.
- **Process Behaviour Isolation**: Each file implements exactly one OTP behaviour (\`supervisor\` vs. \`gen_server\`), keeping dynamic worker spawning completely decoupled from worker callback state.

## Assignment Specification

Implement \`src/dynamic_session_sup.erl\` as an OTP \`supervisor\` coordinating \`src/session_worker.erl\`:

\`\`\`erlang
-module(dynamic_session_sup).
-behaviour(supervisor).

-export([
    start_link/0,
    start_session/3,
    count_sessions/1,
    terminate_session/2,
    init/1
]).
\`\`\`

### Functional Requirements

#### \`start_link/0\`
- **Input**: None.
- **Behavior**: Starts and links the dynamic session supervisor registered locally under its own module name using \`supervisor:start_link/3\`.
- **Examples**:
  - \`dynamic_session_sup:start_link()\` returns \`{ok, Pid}\`.

#### \`init/1\`
- **Input**: Empty initialization list \`[]\`.
- **Behavior**: Returns OTP supervisor configuration using the \`simple_one_for_one\` strategy with a maximum restart intensity of \`10\` over a \`5\` second period, paired with a single worker child specification template referencing \`session_worker\`, invoking \`start_link\` with zero pre-bound arguments, configured for \`temporary\` restarts, a \`2000\` millisecond shutdown timeout, and \`worker\` node type.
- **Examples**:
  - \`dynamic_session_sup:init([])\` returns \`{ok, {SupFlags, [ChildTemplate]}}\`.

#### \`start_session/3\`
- **Input**: \`SupRef\` (supervisor PID or registered name), \`SessionId\` (binary or term), \`UserId\` (binary or term).
- **Behavior**: Spawns a dynamic worker process by forwarding the session and user arguments as a 2-element list through \`supervisor:start_child/2\`.
- **Examples**:
  - \`dynamic_session_sup:start_session(Sup, <<"s1">>, <<"u1">>)\` returns \`{ok, WorkerPid}\`.

#### \`count_sessions/1\`
- **Input**: \`SupRef\` (supervisor PID or registered name).
- **Behavior**: Queries child telemetry via \`supervisor:count_children/1\` and extracts the integer count of currently \`active\` child processes.
- **Examples**:
  - \`dynamic_session_sup:count_sessions(Sup)\` returns \`2\` (when two sessions are running).

#### \`terminate_session/2\`
- **Input**: \`SupRef\` (supervisor PID or registered name), \`ChildPid\` (running session worker PID).
- **Behavior**: Commands the supervisor to terminate the target dynamic session worker via \`supervisor:terminate_child/2\`, returning \`ok\`.
- **Examples**:
  - \`dynamic_session_sup:terminate_session(Sup, WorkerPid)\` returns \`ok\`.

## Rules & Verification Constraints

- Must declare \`-behaviour(supervisor).\` and export \`start_link/0\`, \`start_session/3\`, \`count_sessions/1\`, \`terminate_session/2\`, and \`init/1\`.
- Must invoke \`supervisor:start_link/3\`, \`supervisor:start_child/2\`, \`supervisor:count_children/1\`, and \`supervisor:terminate_child/2\`.
- \`init/1\` must configure \`simple_one_for_one\` with exactly one \`temporary\` worker template targeting \`session_worker\`.
`,
    mentalModelCheck: {
      question: 'Why does simple_one_for_one allow only ONE child specification template inside init/1?',
      options: [
        {
          id: 'A',
          label: 'Because simple_one_for_one is designed as a factory for an arbitrary number of identical dynamic workers spawned on demand.',
          isCorrect: true,
          explanation: 'simple_one_for_one treats its single child specification as a blueprint template. All dynamic children share the same module, restart policy, and shutdown timeout.',
        },
        {
          id: 'B',
          label: 'Because the BEAM VM memory limit prevents supervisors from holding more than one map.',
          isCorrect: false,
          explanation: 'Supervisors can hold many specs in other strategies; simple_one_for_one is conceptually a homogeneous worker factory.',
        },
        {
          id: 'C',
          label: 'Because simple_one_for_one can only ever run one process at a time.',
          isCorrect: false,
          explanation: 'It can run millions of simultaneous dynamic workers, all spawned from the single template.',
        },
        {
          id: 'D',
          label: 'Because dynamic workers are forbidden from using gen_server.',
          isCorrect: false,
          explanation: 'Dynamic workers almost always implement gen_server or gen_statem.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'start_child',
        module: 'supervisor',
        signature: 'supervisor:start_child(SupRef, ChildSpec | [Arg]) -> {ok, Child} | {ok, Child, Info} | {error, Reason}',
        typesSpec: [
          'SupRef = pid() | atom()',
          'Arg = term()',
          'Child = pid()'
        ],
        description: 'For simple_one_for_one supervisors, appends the arguments list to the template start MFA and spawns a dynamic worker.',
        complexityNote: 'Synchronous child spawn and link. Returns when child init/1 completes.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/supervisor.html#start_child/2',
      },
      {
        functionName: 'count_children',
        module: 'supervisor',
        signature: 'supervisor:count_children(SupRef) -> #{specs := integer(), active := integer(), supervisors := integer(), workers := integer()}',
        typesSpec: [
          'SupRef = pid() | atom()'
        ],
        description: 'Returns telemetry counts of child specifications, active processes, and worker vs supervisor nodes.',
        complexityNote: 'O(N) iteration over internal supervisor child tracking list.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/supervisor.html#count_children/1',
      },
    ],
    starterCode: `-module(dynamic_session_sup).
-behaviour(supervisor).

-export([
    start_link/0,
    start_session/3,
    count_sessions/1,
    terminate_session/2,
    init/1
]).

%% @doc Start and register the dynamic session supervisor locally under its module name.
start_link() ->
    ok.

%% @doc Configure dynamic supervision flags and the single companion session worker template specification.
init([]) ->
    ok.

%% @doc Dynamically spawn a monitored session worker process for the given session and user identifiers.
start_session(SupRef, SessionId, UserId) ->
    ok.

%% @doc Query the supervisor and return the integer count of currently active dynamic session processes.
count_sessions(SupRef) ->
    ok.

%% @doc Request the supervisor to terminate a specific running session worker child by its PID.
terminate_session(SupRef, ChildPid) ->
    ok.
`,
    solutionCode: `-module(dynamic_session_sup).
-behaviour(supervisor).

-export([
    start_link/0,
    start_session/3,
    count_sessions/1,
    terminate_session/2,
    init/1
]).

%% @doc Start and register the dynamic session supervisor locally under its module name.
start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

%% @doc Configure dynamic supervision flags and the single companion session worker template specification.
init([]) ->
    SupFlags = #{
        strategy => simple_one_for_one,
        intensity => 10,
        period => 5
    },
    ChildTemplate = #{
        id => session_worker,
        start => {session_worker, start_link, []},
        restart => temporary,
        shutdown => 2000,
        type => worker,
        modules => [session_worker]
    },
    {ok, {SupFlags, [ChildTemplate]}}.

%% @doc Dynamically spawn a monitored session worker process for the given session and user identifiers.
start_session(SupRef, SessionId, UserId) ->
    supervisor:start_child(SupRef, [SessionId, UserId]).

%% @doc Query the supervisor and return the integer count of currently active dynamic session processes.
count_sessions(SupRef) ->
    Counts = supervisor:count_children(SupRef),
    case is_map(Counts) of
        true  -> maps:get(active, Counts, 0);
        false ->
            case lists:keyfind(active, 1, Counts) of
                {active, N} -> N;
                false -> 0
            end
    end.

%% @doc Request the supervisor to terminate a specific running session worker child by its PID.
terminate_session(SupRef, ChildPid) ->
    supervisor:terminate_child(SupRef, ChildPid).
`,
    solutionExplanation: 'Implements a clean simple_one_for_one supervisor with a single template child spec referencing companion module session_worker, dynamic start_child appending, and active count introspection.',
    files: [
      {
        name: 'dynamic_session_sup.erl',
        path: 'src/dynamic_session_sup.erl',
        behaviour: 'supervisor',
        content: `-module(dynamic_session_sup).
-behaviour(supervisor).

-export([
    start_link/0,
    start_session/3,
    count_sessions/1,
    terminate_session/2,
    init/1
]).

%% @doc Start and register the dynamic session supervisor locally under its module name.
start_link() ->
    ok.

%% @doc Configure dynamic supervision flags and the single companion session worker template specification.
init([]) ->
    ok.

%% @doc Dynamically spawn a monitored session worker process for the given session and user identifiers.
start_session(SupRef, SessionId, UserId) ->
    ok.

%% @doc Query the supervisor and return the integer count of currently active dynamic session processes.
count_sessions(SupRef) ->
    ok.

%% @doc Request the supervisor to terminate a specific running session worker child by its PID.
terminate_session(SupRef, ChildPid) ->
    ok.
`,
      },
      {
        name: 'session_worker.erl',
        path: 'src/session_worker.erl',
        isReadOnly: true,
        behaviour: 'gen_server',
        content: `-module(session_worker).
-behaviour(gen_server).

-export([
    start_link/2,
    get_info/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Start and link a session worker process for a session and user pair.
start_link(SessionId, UserId) ->
    gen_server:start_link(?MODULE, {SessionId, UserId}, []).

%% @doc Initialize the session state map with session and user identifiers.
init({SessionId, UserId}) ->
    {ok, #{session_id => SessionId, user_id => UserId, active => true}}.

%% @doc Query the session metadata map from a running worker process.
get_info(Pid) ->
    gen_server:call(Pid, get_info).

%% @doc Handle synchronous call requests.
handle_call(get_info, _From, State) ->
    {reply, {ok, State}, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Handle asynchronous cast messages.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle out-of-band process messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up session resources on worker shutdown.
terminate(_Reason, _State) ->
    ok.

%% @doc Handle state transformations during hot-code upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
      },
    ],
    solutionFiles: {
      'src/dynamic_session_sup.erl': `-module(dynamic_session_sup).
-behaviour(supervisor).

-export([
    start_link/0,
    start_session/3,
    count_sessions/1,
    terminate_session/2,
    init/1
]).

%% @doc Start and register the dynamic session supervisor locally under its module name.
start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

%% @doc Configure dynamic supervision flags and the single companion session worker template specification.
init([]) ->
    SupFlags = #{
        strategy => simple_one_for_one,
        intensity => 10,
        period => 5
    },
    ChildTemplate = #{
        id => session_worker,
        start => {session_worker, start_link, []},
        restart => temporary,
        shutdown => 2000,
        type => worker,
        modules => [session_worker]
    },
    {ok, {SupFlags, [ChildTemplate]}}.

%% @doc Dynamically spawn a monitored session worker process for the given session and user identifiers.
start_session(SupRef, SessionId, UserId) ->
    supervisor:start_child(SupRef, [SessionId, UserId]).

%% @doc Query the supervisor and return the integer count of currently active dynamic session processes.
count_sessions(SupRef) ->
    Counts = supervisor:count_children(SupRef),
    case is_map(Counts) of
        true  -> maps:get(active, Counts, 0);
        false ->
            case lists:keyfind(active, 1, Counts) of
                {active, N} -> N;
                false -> 0
            end
    end.

%% @doc Request the supervisor to terminate a specific running session worker child by its PID.
terminate_session(SupRef, ChildPid) ->
    supervisor:terminate_child(SupRef, ChildPid).
`,
      'src/session_worker.erl': `-module(session_worker).
-behaviour(gen_server).

-export([
    start_link/2,
    get_info/1
]).

%% gen_server Callbacks
-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Start and link a session worker process for a session and user pair.
start_link(SessionId, UserId) ->
    gen_server:start_link(?MODULE, {SessionId, UserId}, []).

%% @doc Initialize the session state map with session and user identifiers.
init({SessionId, UserId}) ->
    {ok, #{session_id => SessionId, user_id => UserId, active => true}}.

%% @doc Query the session metadata map from a running worker process.
get_info(Pid) ->
    gen_server:call(Pid, get_info).

%% @doc Handle synchronous call requests.
handle_call(get_info, _From, State) ->
    {reply, {ok, State}, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Handle asynchronous cast messages.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Handle out-of-band process messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up session resources on worker shutdown.
terminate(_Reason, _State) ->
    ok.

%% @doc Handle state transformations during hot-code upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    },
    astRules: {
      requiredCalls: ['supervisor:start_link/3', 'supervisor:start_child/2', 'supervisor:count_children/1', 'supervisor:terminate_child/2'],
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Spawn and Count Dynamic Sessions',
        explanation: 'Starts dynamic_session_sup and spawns two sessions; verifies count is 2.',
        erlangCall: 'begin {ok, Sup} = dynamic_session_sup:start_link(), {ok, _} = dynamic_session_sup:start_session(Sup, <<"s1">>, <<"u1">>), {ok, _} = dynamic_session_sup:start_session(Sup, <<"s2">>, <<"u2">>), C = dynamic_session_sup:count_sessions(Sup), M = monitor(process, Sup), unlink(Sup), exit(Sup, shutdown), receive {_, M, _, _, _} -> ok after 500 -> ok end, C end',
        expectedOutput: '2',
      },
      {
        id: 'tc2',
        title: 'Verify Separate Worker State',
        explanation: 'Queries companion session_worker:get_info to verify separate module state isolation.',
        erlangCall: 'begin {ok, Sup} = dynamic_session_sup:start_link(), {ok, P} = dynamic_session_sup:start_session(Sup, <<"sess_99">>, <<"alice">>), {ok, Info} = session_worker:get_info(P), M = monitor(process, Sup), unlink(Sup), exit(Sup, shutdown), receive {_, M, _, _, _} -> ok after 500 -> ok end, maps:get(user_id, Info) end',
        expectedOutput: '<<"alice">>',
      },
      {
        id: 'tc3',
        title: 'Terminate Dynamic Session',
        explanation: 'Terminates one child process and asserts session count decrements from 2 to 1.',
        erlangCall: 'begin {ok, Sup} = dynamic_session_sup:start_link(), {ok, P1} = dynamic_session_sup:start_session(Sup, <<"s1">>, <<"u1">>), {ok, _P2} = dynamic_session_sup:start_session(Sup, <<"s2">>, <<"u2">>), ok = dynamic_session_sup:terminate_session(Sup, P1), C = dynamic_session_sup:count_sessions(Sup), M = monitor(process, Sup), unlink(Sup), exit(Sup, shutdown), receive {_, M, _, _, _} -> ok after 500 -> ok end, C end',
        expectedOutput: '1',
      },
    ],
  },

  // ── Lesson 8.5: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch08-l05',
    chapterNumber: 8,
    lessonNumber: 5,
    lessonType: 'concept_exercise',
    title: 'OTP Applications: .app.src, -behaviour(application) & Runtime Configuration',
    visualScene: 'supervision_rest_for_one_ets_heir',
    difficulty: 'Intermediate',
    xpReward: 100,
    conceptMarkdown: `## Why This Matters in Production

In Erlang/OTP, an **Application** is a self-contained component that can be booted, monitored, upgraded, and shut down as a single unit inside a production release.

Every real-world BEAM system—whether an HTTP gateway, message broker, or database engine—is composed of cooperating OTP applications, each configured cleanly at runtime without recompiling source files.

## Deep Concept Breakdown & Under the Hood

### The Two Components of an OTP Application

1. **The Application Resource File (\`.app\` or \`.app.src\`)**:
   - A declarative Erlang term file declaring the application's name, semantic version, registered processes, required dependencies, default environment variables, and entry callback module (\`mod\`).
2. **The Application Callback Module (\`-behaviour(application).\`)**:
   - Implements \`start(StartType, StartArgs) -> {ok, SupPid} | {error, Reason}\` and \`stop(State) -> ok\`.
   - When booted, the BEAM spawns an isolated **Application Master** process which invokes \`start/2\` to start the application's root supervisor and monitors the root PID until shutdown.

### Example \`.app.src\` Manifest Format

\`\`\`erlang
{application, telemetry_agent, [
    {description, "Telemetry Collector & Batch Dispatcher"},
    {vsn, "1.0.0"},
    {registered, [telemetry_agent_app]},
    {mod, {telemetry_agent_app, []}},
    {applications, [kernel, stdlib]},
    {env, [
        {batch_limit, 500},
        {flush_interval_ms, 2000}
    ]}
]}.
\`\`\`

### What the BEAM Does Under the Hood: Concurrent ETS Environment Config

Production services must **never** hardcode timeouts, feature flags, or endpoints. Instead, OTP's application controller stores each application's \`env\` parameters in an internal ETS table:
- \`application:get_env(App, Key, Default)\` performs a lock-free concurrent ETS lookup returning \`Default\` if the key is unset.
- \`application:set_env(App, Key, Value)\` atomically updates that runtime parameter live across the node without restarting processes or recompiling BEAM files.

> [!warning] Production Supervision Trap: Hardcoded Configuration Constants
> Never bake operational constants like \`Timeout = 5000\` directly inside worker logic. Reading parameters via \`application:get_env/3\` lets operators override limits through \`sys.config\` files or live remote shells during traffic spikes without downtime.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Callbacks & Functions (kernel / application)
Module:start(StartType, StartArgs) -> {ok, Pid} | {error, Reason}
Module:stop(State) -> ok | term()
application:get_env(Application, Par, Def) -> Val
application:set_env(Application, Par, Val) -> ok
  Types:
    Application = Par = atom()
    StartType = normal | {takeover, node()} | {failover, node()}
    StartArgs = Def = Val = State = term()
\`\`\`

In production, \`application:start/1\` handles booting dependent apps listed in \`applications\` first, then directs the Application Master to run \`Module:start(normal, [])\`. Consult the attached OTP Doc Cards below for \`application:start/1\` and \`application:get_env/3\`.

## Parallel Worked Example: Telemetry Agent Application

Consider \`telemetry_agent_app\`, an OTP application module combining startup configuration lookup with root supervision and guarded dynamic updates:

\`\`\`erlang
-module(telemetry_agent_app).
-behaviour(application).
-behaviour(supervisor).

-export([
    start/2,
    stop/1,
    read_batch_limit/0,
    set_batch_limit/1,
    init/1
]).

%% @doc Start the application root supervisor using runtime batch configuration.
start(_StartType, _StartArgs) ->
    DefaultLimit = read_batch_limit(),
    supervisor:start_link(?MODULE, [DefaultLimit]).

%% @doc Release application resources during OTP application shutdown.
stop(_State) ->
    ok.

%% @doc Fetch the configured batch limit with a default of 500 events.
read_batch_limit() ->
    application:get_env(telemetry_agent, batch_limit, 500).

%% @doc Dynamically update the batch limit when given a positive integer.
set_batch_limit(Limit) when is_integer(Limit), Limit > 0 ->
    application:set_env(telemetry_agent, batch_limit, Limit).

%% @doc Configure the supervisor flags with a rest_for_one strategy.
init([_BatchLimit]) ->
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 5,
        period => 10
    },
    {ok, {SupFlags, []}}.
\`\`\`

Key Erlang mechanics illustrated above:
- **Boot-Time Env Lookup**: \`start/2\` reads live configuration via \`application:get_env/3\` before launching the supervision tree so startup flags reflect \`sys.config\` overrides immediately.
- **Guarded Runtime Updates**: Wrapping \`application:set_env/3\` inside a guarded helper ensures operators cannot accidentally inject negative or non-integer limits at runtime.
- **Startup Return Contract**: \`start/2\` must return \`{ok, SupPid}\` (or an error tuple), matching the exact shape returned by \`supervisor:start_link\`.

## Assignment Specification

Implement \`src/commerce_app.erl\` implementing both \`-behaviour(application).\` and \`-behaviour(supervisor).\`:

\`\`\`erlang
-module(commerce_app).
-behaviour(application).
-behaviour(supervisor).

-export([
    start/2,
    stop/1,
    get_app_config/2,
    set_app_config/2,
    init/1
]).
\`\`\`

### Functional Requirements

#### \`start/2\`
- **Input**: \`StartType\` (application start mode), \`StartArgs\` (startup arguments).
- **Behavior**: Spawns and links the root supervisor registered locally under its own module name using \`supervisor:start_link/3\`. Returns the standard \`{ok, SupPid}\` tuple both when newly spawned and gracefully when an already-started supervisor tuple is returned; passes through any other error reason unchanged.
- **Examples**:
  - \`commerce_app:start(normal, [])\` returns \`{ok, SupPid}\`.

#### \`stop/1\`
- **Input**: \`State\` (shutdown state term).
- **Behavior**: Completes application teardown cleanly and returns \`ok\`.
- **Examples**:
  - \`commerce_app:stop([])\` returns \`ok\`.

#### \`get_app_config/2\`
- **Input**: \`Key\` (atom parameter name), \`Default\` (fallback value term).
- **Behavior**: Reads \`Key\` from the \`commerce_app\` application runtime environment via \`application:get_env/3\`, returning \`Default\` if undefined.
- **Examples**:
  - \`commerce_app:get_app_config(max_connections, 100)\` returns \`100\` (when unset).

#### \`set_app_config/2\`
- **Input**: \`Key\` (atom parameter name), \`Value\` (configuration value term).
- **Behavior**: Writes \`Key\` to \`Value\` inside the \`commerce_app\` runtime environment via \`application:set_env/3\`, returning \`ok\`.
- **Examples**:
  - \`commerce_app:set_app_config(currency, "USD")\` returns \`ok\`.

#### \`init/1\`
- **Input**: Empty initialization list \`[]\`.
- **Behavior**: Returns OTP supervisor flags specifying the \`one_for_one\` strategy with restart intensity \`3\` and period \`5\`, paired with an empty child specification list.
- **Examples**:
  - \`commerce_app:init([])\` returns \`{ok, {#{intensity => 3, period => 5, strategy => one_for_one}, []}}\`.

## Rules & Verification Constraints

- Must declare both \`-behaviour(application).\` and \`-behaviour(supervisor).\`.
- Must export \`start/2\`, \`stop/1\`, \`get_app_config/2\`, \`set_app_config/2\`, and \`init/1\`.
- Must invoke \`application:get_env/3\`, \`application:set_env/3\`, and \`supervisor:start_link/3\`.
`,
    mentalModelCheck: {
      question: 'Who invokes the start/2 callback of an OTP application module?',
      options: [
        {
          id: 'A',
          label: 'The BEAM Application Master process, when the application is booted via application:start/1 or an OTP release.',
          isCorrect: true,
          explanation: 'The Application Master is an internal OTP process created to isolate and manage the lifecycle of each running application.',
        },
        {
          id: 'B',
          label: 'The developer manually from the terminal shell.',
          isCorrect: false,
          explanation: 'Developers call application:start(App); the Application Master invokes the callback Mod:start/2.',
        },
        {
          id: 'C',
          label: 'The Linux systemd service manager directly.',
          isCorrect: false,
          explanation: 'systemd starts the Erlang runtime node (erl/beam.smp); OTP manages its own internal application tree.',
        },
        {
          id: 'D',
          label: 'The first client that makes an HTTP request.',
          isCorrect: false,
          explanation: 'Applications boot deterministically on node startup, not lazily on request.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'start',
        module: 'application',
        signature: 'application:start(Application) -> ok | {error, Reason}',
        typesSpec: [
          'Application = atom()',
          'Reason = term()'
        ],
        description: 'Loads and starts an OTP application and all of its dependencies, spawning its application master and root supervisor.',
        complexityNote: 'Synchronous boot. Fails if dependencies are not already started.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/application.html#start/1',
      },
      {
        functionName: 'get_env',
        module: 'application',
        signature: 'application:get_env(Application, Par, Def) -> Val',
        typesSpec: [
          'Application = atom()',
          'Par = atom()',
          'Def = term()',
          'Val = term()'
        ],
        description: 'Fetches configuration parameter Par for Application. If undefined, returns Def.',
        complexityNote: 'Fast O(1) concurrent ETS read inside application controller.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/application.html#get_env/3',
      },
    ],
    starterCode: `-module(commerce_app).
-behaviour(application).
-behaviour(supervisor).

-export([
    start/2,
    stop/1,
    get_app_config/2,
    set_app_config/2,
    init/1
]).

%% @doc Boot the commerce OTP application by starting and linking its locally registered root supervisor; handles already-started supervision cleanly.
start(_StartType, _StartArgs) ->
    ok.

%% @doc Perform clean teardown when the commerce OTP application stops.
stop(_State) ->
    ok.

%% @doc Retrieve a runtime environment setting for this application, returning Default when unset.
get_app_config(Key, Default) ->
    ok.

%% @doc Dynamically update a runtime environment key-value parameter for this application.
set_app_config(Key, Value) ->
    ok.

%% @doc Initialize the root supervisor restart strategy, crash intensity limits, and empty child spec list.
init([]) ->
    ok.
`,
    solutionCode: `-module(commerce_app).
-behaviour(application).
-behaviour(supervisor).

-export([
    start/2,
    stop/1,
    get_app_config/2,
    set_app_config/2,
    init/1
]).

%% @doc Boot the commerce OTP application by starting and linking its locally registered root supervisor; handles already-started supervision cleanly.
start(_StartType, _StartArgs) ->
    case supervisor:start_link({local, ?MODULE}, ?MODULE, []) of
        {ok, SupPid} -> {ok, SupPid};
        {error, {already_started, SupPid}} -> {ok, SupPid};
        {error, Reason} -> {error, Reason}
    end.

%% @doc Perform clean teardown when the commerce OTP application stops.
stop(_State) ->
    ok.

%% @doc Retrieve a runtime environment setting for this application, returning Default when unset.
get_app_config(Key, Default) ->
    application:get_env(commerce_app, Key, Default).

%% @doc Dynamically update a runtime environment key-value parameter for this application.
set_app_config(Key, Value) ->
    application:set_env(commerce_app, Key, Value).

%% @doc Initialize the root supervisor restart strategy, crash intensity limits, and empty child spec list.
init([]) ->
    SupFlags = #{
        strategy => one_for_one,
        intensity => 3,
        period => 5
    },
    ChildSpecs = [],
    {ok, {SupFlags, ChildSpecs}}.
`,
    files: [
      {
        name: 'commerce_app.erl',
        path: 'src/commerce_app.erl',
        content: `-module(commerce_app).
-behaviour(application).
-behaviour(supervisor).

-export([
    start/2,
    stop/1,
    get_app_config/2,
    set_app_config/2,
    init/1
]).

%% @doc Boot the commerce OTP application by starting and linking its locally registered root supervisor; handles already-started supervision cleanly.
start(_StartType, _StartArgs) ->
    ok.

%% @doc Perform clean teardown when the commerce OTP application stops.
stop(_State) ->
    ok.

%% @doc Retrieve a runtime environment setting for this application, returning Default when unset.
get_app_config(Key, Default) ->
    ok.

%% @doc Dynamically update a runtime environment key-value parameter for this application.
set_app_config(Key, Value) ->
    ok.

%% @doc Initialize the root supervisor restart strategy, crash intensity limits, and empty child spec list.
init([]) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/commerce_app.erl': `-module(commerce_app).
-behaviour(application).
-behaviour(supervisor).

-export([
    start/2,
    stop/1,
    get_app_config/2,
    set_app_config/2,
    init/1
]).

%% @doc Boot the commerce OTP application by starting and linking its locally registered root supervisor; handles already-started supervision cleanly.
start(_StartType, _StartArgs) ->
    case supervisor:start_link({local, ?MODULE}, ?MODULE, []) of
        {ok, SupPid} -> {ok, SupPid};
        {error, {already_started, SupPid}} -> {ok, SupPid};
        {error, Reason} -> {error, Reason}
    end.

%% @doc Perform clean teardown when the commerce OTP application stops.
stop(_State) ->
    ok.

%% @doc Retrieve a runtime environment setting for this application, returning Default when unset.
get_app_config(Key, Default) ->
    application:get_env(commerce_app, Key, Default).

%% @doc Dynamically update a runtime environment key-value parameter for this application.
set_app_config(Key, Value) ->
    application:set_env(commerce_app, Key, Value).

%% @doc Initialize the root supervisor restart strategy, crash intensity limits, and empty child spec list.
init([]) ->
    SupFlags = #{
        strategy => one_for_one,
        intensity => 3,
        period => 5
    },
    ChildSpecs = [],
    {ok, {SupFlags, ChildSpecs}}.
`,
    },
    solutionExplanation: 'Implements both application and root supervisor behaviours, managing application start/stop lifecycles and runtime configuration parameters via application:get_env and set_env.',
    astRules: {
      requiredCalls: ['application:get_env/3', 'application:set_env/3', 'supervisor:start_link/3'],
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Runtime Config Get and Set',
        explanation: 'Sets currency to USD and retrieves it with fallback default.',
        erlangCall: 'begin commerce_app:set_app_config(currency, "USD"), commerce_app:get_app_config(currency, "EUR") end',
        expectedOutput: '"USD"',
      },
      {
        id: 'tc2',
        title: 'Runtime Config Fallback Default',
        explanation: 'Retrieves nonexistent key max_connections and returns default 100.',
        erlangCall: 'commerce_app:get_app_config(max_connections, 100)',
        expectedOutput: '100',
      },
      {
        id: 'tc3',
        title: 'Supervisor Init Flags',
        explanation: 'Verifies supervisor init returns strategy => one_for_one and empty child specs.',
        erlangCall: 'begin {ok, {Flags, Specs}} = commerce_app:init([]), {maps:get(strategy, Flags), Specs} end',
        expectedOutput: '{one_for_one, []}',
      },
    ],
  },

  // ── Lesson 8.6: Incident Triage (#104) ────────────────────────────────────
  {
    id: 'ch08-l06',
    chapterNumber: 8,
    lessonNumber: 6,
    lessonType: 'incident_triage',
    title: 'Incident #104: Misconfigured Supervision Strategy Leaving Stale Downstream Workers',
    visualScene: 'supervision_rest_for_one_ets_heir',
    difficulty: 'Advanced',
    xpReward: 175,
    incidentAlert: {
      incidentId: 'INC-104',
      severity: 'HIGH',
      serviceName: 'auth-pipeline-sup',
      symptom: 'When worker_cache crashes under memory pressure, it never restarts (leaving the cache dead), and downstream worker_http continues running with stale process references.',
      rootCauseHint: 'incident_wrong_strategy:init/1 defines children in [worker_db, worker_cache, worker_http] pipeline order, but configures an isolated restart strategy, zero restart intensity tolerance, and non-permanent child restart policies.',
      fixObjective: 'Reconfigure init/1 in src/incident_wrong_strategy.erl to restart downstream dependents when an upstream worker fails, allow up to 5 restarts within a 10-second window, and enforce unconditional permanent restarts across all 3 workers.',
      impact: 'Total failure of authentication routing whenever worker_cache crashes under load.',
    },
    conceptMarkdown: `## Why This Matters in Production

At 03:14 UTC, a P1 alert fired on \`auth-pipeline-sup\`: incoming HTTP traffic failed with dead-process lookup errors because \`worker_cache\` exited under memory pressure and never came back, while downstream \`worker_http\` stayed alive holding stale PIDs.

In OTP supervision trees, choosing the wrong restart strategy or child restart policy turns a recoverable single-worker crash into a silent zombie outage. When sequential pipeline stages depend on earlier siblings (with \`worker_db\` starting first, followed by \`worker_cache\`, and finally \`worker_http\`), the interactive diagram below illustrates how ordered supervision tears down and rebuilds only the broken downstream tail while keeping healthy upstream stages intact.

## Deep Concept Breakdown & Under the Hood

Inside OTP's \`supervisor\` behaviour loop, every \`init/1\` return tuple configures three distinct fault-recovery invariants:

1. **Ordered Dependency Restarts vs. Isolated Restarts**: Under an isolated strategy, killing the middle child restarts only that single worker, leaving later children in the list holding broken PIDs or dead ETS handles. Under an ordered downstream strategy, terminating an upstream worker causes the supervisor to shut down every child declared *after* it (in reverse startup order, to ensure clean teardown) and then restart the crashed worker and its downstream dependents in forward startup order—without touching earlier healthy siblings.
2. **Sliding-Window Restart Budget**: The \`supervisor\` tracks a sliding list of child-restart timestamps over the configured \`period\` (in seconds). Before spawning a replacement child, it counts recent restarts within that window. If the count exceeds \`intensity\`, the supervisor concludes the node is stuck in a crash loop, terminates all remaining children, and shuts itself down. Setting \`intensity\` to zero gives a budget of zero restarts: the very first permanent child failure immediately kills the supervisor itself.
3. **Child Restart Lifecycle Policy**: Each child specification controls whether its exits trigger recovery. A temporary child is removed silently when it terminates—even on an abnormal crash—and never restarted or counted against the budget. Marking pipeline stages as permanent guarantees OTP always restores them regardless of exit reason.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / supervisor)
supervisor:start_link(Module, Args) -> startlink_ret()
  Types:
    Module = module()
    Args = term()
    startlink_ret() = {ok, pid()} | ignore | {error, startlink_err()}

supervisor:which_children(SupRef) -> [{Id, Child, Type, Modules}]
  Types:
    SupRef = sup_ref()
    Id = child_id() | undefined
    Child = pid() | undefined | restarting
    Type = worker | supervisor
    Modules = [module()] | dynamic
\`\`\`

Use the attached reference cards below to check valid \`which_children/1\` status atoms (\`restarting\` or \`undefined\` instead of a live \`pid()\`) when diagnosing unrecovered workers in production.

## Parallel Worked Example: Media Transcoding Pipeline

Consider a separate domain: a real-time video pipeline supervisor \`media_pipeline_sup\` managing three ordered stages (\`demuxer\`, \`transcoder\`, \`streamer\`). If \`transcoder\` crashes, \`demuxer\` continues buffering incoming frames untouched, while \`streamer\` must restart to bind to the new \`transcoder\` worker:

\`\`\`erlang
-module(media_pipeline_sup).
-behaviour(supervisor).

-export([start_link/0, init/1, stage_loop/1, inspect_stages/1]).

%% @doc Start an unnamed media pipeline supervisor linked to the caller.
start_link() ->
    supervisor:start_link(?MODULE, []).

%% @doc Configure ordered downstream recovery with permanent stage workers.
init([]) ->
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 3,
        period => 5
    },
    StageIds = [demuxer, transcoder, streamer],
    ChildSpecs = [
        #{
            id => Stage,
            start => {?MODULE, stage_loop, [Stage]},
            restart => permanent,
            shutdown => 3000,
            type => worker,
            modules => [?MODULE]
        }
        || Stage <- StageIds
    ],
    {ok, {SupFlags, ChildSpecs}}.

%% @doc Spawn and link an individual pipeline stage worker process.
stage_loop(Stage) ->
    Pid = spawn_link(fun() -> run_stage(Stage) end),
    {ok, Pid}.

run_stage(Stage) ->
    receive
        stop -> ok;
        _Msg -> run_stage(Stage)
    end.

%% @doc Return a map of stage identifiers to live child PIDs.
inspect_stages(SupPid) ->
    maps:from_list([
        {Id, Child}
        || {Id, Child, _Type, _Mods} <- supervisor:which_children(SupPid)
    ]).
\`\`\`

### What OTP Does at Runtime

- **Ordered Recovery Budget**: \`SupFlags\` sets \`strategy => rest_for_one\` with \`intensity => 3\` and \`period => 5\`, allowing up to 3 restarts in any 5-second window before escalating shutdown.
- **Pipeline Spec Generation**: The list comprehension generates three \`worker\` child specifications in dependency order (\`demuxer\`, \`transcoder\`, \`streamer\`), each marked \`restart => permanent\` with a \`3000\` ms shutdown timeout.
- **Non-Disruptive Stage Inspection**: \`inspect_stages/1\` converts the tuples returned by \`supervisor:which_children/1\` into a stage-to-PID map via \`maps:from_list/1\`, making it straightforward to verify that \`demuxer\` retains its original PID while downstream stages receive fresh PIDs after a crash.

## Assignment Specification

Repair the production bug inside \`src/incident_wrong_strategy.erl\` without altering its exported function signatures or diagnostic helpers (\`start_link/0\`, \`build_pipeline_specs/0\`, \`audit_flags/0\`, \`test_chaos_cascade/0\`, \`worker_loop/1\`).

### \`init/1\`
- **Input**: Empty list \`[]\` supplied by \`supervisor:start_link/2\`.
- **Behavior**: Returns the standard supervisor configuration tuple containing a supervisor flags map and a 3-element list of worker child specifications ordered from upstream to downstream (\`worker_db\`, then \`worker_cache\`, then \`worker_http\`). Reconfigure the supervisor flags so downstream children restart after an upstream crash, tolerate up to 5 restarts within a 10-second period, and mark every worker specification with unconditional permanent restart behavior (preserving the existing \`2000\` ms shutdown timeout, worker type, and module list).
- **Examples**:
  - \`incident_wrong_strategy:audit_flags()\` returns \`{ok, rest_for_one, [permanent, permanent, permanent]}\`.
  - \`incident_wrong_strategy:test_chaos_cascade()\` kills the cache worker and returns \`{ok, db_unaffected, downstream_restarted}\`.

## Rules & Verification Constraints

- **Required Call**: AST verification requires \`supervisor:start_link/2\`.
- **Ordered Restart & Budget Audit**: \`init/1\` must configure downstream-ordered recovery (\`rest_for_one\`), allow 5 restarts per 10 seconds, and assign \`permanent\` restart policies to all 3 worker specs (\`worker_db\`, \`worker_cache\`, \`worker_http\`).
- **Live Chaos Cascade**: Killing \`worker_cache\` must restart both \`worker_cache\` and \`worker_http\` with new PIDs while preserving the exact PID of upstream \`worker_db\`.
`,
    mentalModelCheck: {
      question: 'Why is rest_for_one mandatory for [db -> cache -> http] pipelines instead of one_for_one?',
      options: [
        {
          id: 'A',
          label: 'Because when an upstream worker (like cache) restarts, downstream workers (like http) must be restarted to invalidate stale handles and reconnect to the new PID.',
          isCorrect: true,
          explanation: 'rest_for_one guarantees that any child dependent on an upstream worker is cleanly restarted in sequence.',
        },
        {
          id: 'B',
          label: 'Because one_for_one only allows two children total.',
          isCorrect: false,
          explanation: 'one_for_one allows any number of children, but restarts them in total isolation.',
        },
        {
          id: 'C',
          label: 'Because rest_for_one executes 10x faster than one_for_one.',
          isCorrect: false,
          explanation: 'Restart strategy choice is about architectural dependency correctness, not raw execution speed.',
        },
        {
          id: 'D',
          label: 'Because the Erlang compiler rejects one_for_one on pipelines.',
          isCorrect: false,
          explanation: 'The compiler cannot know your architectural dependencies; you must choose the correct strategy.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'start_link',
        module: 'supervisor',
        signature: 'supervisor:start_link(Module, Args) -> {ok, Pid} | ignore | {error, Reason}',
        typesSpec: [
          'Module = module()',
          'Args = term()'
        ],
        description: 'Creates an unnamed supervisor process as part of a supervision tree and invokes Module:init(Args) to obtain flags and child specs.',
        complexityNote: 'Blocks until init/1 and all initial child start calls finish.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/supervisor.html#start_link/2',
      },
      {
        functionName: 'which_children',
        module: 'supervisor',
        signature: 'supervisor:which_children(SupRef) -> [{Id, Child, Type, Modules}]',
        typesSpec: [
          'SupRef = pid() | atom()',
          'Child = pid() | undefined | restarting'
        ],
        description: 'Returns a list of all current children managed by the supervisor, including their PIDs and statuses.',
        complexityNote: 'Synchronous call to supervisor loop.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/supervisor.html#which_children/1',
      },
    ],
    starterCode: `-module(incident_wrong_strategy).
-behaviour(supervisor).

-export([
    start_link/0,
    init/1,
    build_pipeline_specs/0,
    audit_flags/0,
    test_chaos_cascade/0
]).
-export([worker_loop/1]).

%% @doc Start an unnamed supervision tree instance linked to the caller.
start_link() ->
    supervisor:start_link(?MODULE, []).

%% @doc Return supervisor flags and pipeline child specs for auth-pipeline-sup.
init([]) ->
    SupFlags = #{
        strategy => one_for_one,
        intensity => 0,
        period => 1
    },
    ChildSpecs = [
        #{
            id => worker_db,
            start => {incident_wrong_strategy, worker_loop, [db]},
            restart => temporary,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        },
        #{
            id => worker_cache,
            start => {incident_wrong_strategy, worker_loop, [cache]},
            restart => temporary,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        },
        #{
            id => worker_http,
            start => {incident_wrong_strategy, worker_loop, [http]},
            restart => temporary,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.

%% @doc Extract the ordered list of child specifications from init/1.
build_pipeline_specs() ->
    {ok, {_SupFlags, ChildSpecs}} = init([]),
    ChildSpecs.

%% @doc Spawn and link a pipeline stage worker loop for the given role.
worker_loop(Role) ->
    Pid = spawn_link(fun() -> run_worker(Role) end),
    {ok, Pid}.

run_worker(Role) ->
    receive
        stop -> ok;
        _ -> run_worker(Role)
    end.

%% @doc Audit the configured supervision strategy and child restart policies.
audit_flags() ->
    {ok, {SupFlags, ChildSpecs}} = init([]),
    Strategy = maps:get(strategy, SupFlags),
    Restarts = [maps:get(restart, Spec) || Spec <- ChildSpecs],
    {ok, Strategy, Restarts}.

%% @doc Kill the cache worker and verify upstream survival with downstream recovery.
test_chaos_cascade() ->
    {ok, Sup} = start_link(),
    unlink(Sup),
    Children1 = supervisor:which_children(Sup),
    {_, Db1, _, _} = lists:keyfind(worker_db, 1, Children1),
    {_, Cache1, _, _} = lists:keyfind(worker_cache, 1, Children1),
    {_, Http1, _, _} = lists:keyfind(worker_http, 1, Children1),
    exit(Cache1, kill),
    timer:sleep(50),
    Result = case is_process_alive(Sup) of
        true ->
            Children2 = supervisor:which_children(Sup),
            Db2 = case lists:keyfind(worker_db, 1, Children2) of
                {_, P1, _, _} -> P1;
                false -> undefined
            end,
            Cache2 = case lists:keyfind(worker_cache, 1, Children2) of
                {_, P2, _, _} -> P2;
                false -> undefined
            end,
            Http2 = case lists:keyfind(worker_http, 1, Children2) of
                {_, P3, _, _} -> P3;
                false -> undefined
            end,
            case is_pid(Db2) andalso is_pid(Cache2) andalso is_pid(Http2)
                 andalso Db1 =:= Db2 andalso Cache1 =/= Cache2 andalso Http1 =/= Http2 of
                true -> {ok, db_unaffected, downstream_restarted};
                false -> {error, cascade_failed}
            end;
        false ->
            {error, cascade_failed}
    end,
    Ref = monitor(process, Sup),
    exit(Sup, shutdown),
    receive
        {'DOWN', Ref, process, Sup, _} -> ok
    after 1000 ->
        ok
    end,
    Result.
`,
    solutionCode: `-module(incident_wrong_strategy).
-behaviour(supervisor).

-export([
    start_link/0,
    init/1,
    build_pipeline_specs/0,
    audit_flags/0,
    test_chaos_cascade/0
]).
-export([worker_loop/1]).

%% @doc Start an unnamed supervision tree instance linked to the caller.
start_link() ->
    supervisor:start_link(?MODULE, []).

%% @doc Return supervisor flags and pipeline child specs for auth-pipeline-sup.
init([]) ->
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 5,
        period => 10
    },
    ChildSpecs = [
        #{
            id => worker_db,
            start => {incident_wrong_strategy, worker_loop, [db]},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        },
        #{
            id => worker_cache,
            start => {incident_wrong_strategy, worker_loop, [cache]},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        },
        #{
            id => worker_http,
            start => {incident_wrong_strategy, worker_loop, [http]},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.

%% @doc Extract the ordered list of child specifications from init/1.
build_pipeline_specs() ->
    {ok, {_SupFlags, ChildSpecs}} = init([]),
    ChildSpecs.

%% @doc Spawn and link a pipeline stage worker loop for the given role.
worker_loop(Role) ->
    Pid = spawn_link(fun() -> run_worker(Role) end),
    {ok, Pid}.

run_worker(Role) ->
    receive
        stop -> ok;
        _ -> run_worker(Role)
    end.

%% @doc Audit the configured supervision strategy and child restart policies.
audit_flags() ->
    {ok, {SupFlags, ChildSpecs}} = init([]),
    Strategy = maps:get(strategy, SupFlags),
    Restarts = [maps:get(restart, Spec) || Spec <- ChildSpecs],
    {ok, Strategy, Restarts}.

%% @doc Kill the cache worker and verify upstream survival with downstream recovery.
test_chaos_cascade() ->
    {ok, Sup} = start_link(),
    unlink(Sup),
    Children1 = supervisor:which_children(Sup),
    {_, Db1, _, _} = lists:keyfind(worker_db, 1, Children1),
    {_, Cache1, _, _} = lists:keyfind(worker_cache, 1, Children1),
    {_, Http1, _, _} = lists:keyfind(worker_http, 1, Children1),
    exit(Cache1, kill),
    timer:sleep(50),
    Result = case is_process_alive(Sup) of
        true ->
            Children2 = supervisor:which_children(Sup),
            Db2 = case lists:keyfind(worker_db, 1, Children2) of
                {_, P1, _, _} -> P1;
                false -> undefined
            end,
            Cache2 = case lists:keyfind(worker_cache, 1, Children2) of
                {_, P2, _, _} -> P2;
                false -> undefined
            end,
            Http2 = case lists:keyfind(worker_http, 1, Children2) of
                {_, P3, _, _} -> P3;
                false -> undefined
            end,
            case is_pid(Db2) andalso is_pid(Cache2) andalso is_pid(Http2)
                 andalso Db1 =:= Db2 andalso Cache1 =/= Cache2 andalso Http1 =/= Http2 of
                true -> {ok, db_unaffected, downstream_restarted};
                false -> {error, cascade_failed}
            end;
        false ->
            {error, cascade_failed}
    end,
    Ref = monitor(process, Sup),
    exit(Sup, shutdown),
    receive
        {'DOWN', Ref, process, Sup, _} -> ok
    after 1000 ->
        ok
    end,
    Result.
`,
    solutionExplanation: 'Fixed Incident #104 by reconfiguring the supervisor with rest_for_one, intensity 5 over a 10-second period, and permanent restart policies across worker_db, worker_cache, and worker_http.',
    files: [
      {
        name: 'incident_wrong_strategy.erl',
        path: 'src/incident_wrong_strategy.erl',
        content: `-module(incident_wrong_strategy).
-behaviour(supervisor).

-export([
    start_link/0,
    init/1,
    build_pipeline_specs/0,
    audit_flags/0,
    test_chaos_cascade/0
]).
-export([worker_loop/1]).

%% @doc Start an unnamed supervision tree instance linked to the caller.
start_link() ->
    supervisor:start_link(?MODULE, []).

%% @doc Return supervisor flags and pipeline child specs for auth-pipeline-sup.
init([]) ->
    SupFlags = #{
        strategy => one_for_one,
        intensity => 0,
        period => 1
    },
    ChildSpecs = [
        #{
            id => worker_db,
            start => {incident_wrong_strategy, worker_loop, [db]},
            restart => temporary,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        },
        #{
            id => worker_cache,
            start => {incident_wrong_strategy, worker_loop, [cache]},
            restart => temporary,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        },
        #{
            id => worker_http,
            start => {incident_wrong_strategy, worker_loop, [http]},
            restart => temporary,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.

%% @doc Extract the ordered list of child specifications from init/1.
build_pipeline_specs() ->
    {ok, {_SupFlags, ChildSpecs}} = init([]),
    ChildSpecs.

%% @doc Spawn and link a pipeline stage worker loop for the given role.
worker_loop(Role) ->
    Pid = spawn_link(fun() -> run_worker(Role) end),
    {ok, Pid}.

run_worker(Role) ->
    receive
        stop -> ok;
        _ -> run_worker(Role)
    end.

%% @doc Audit the configured supervision strategy and child restart policies.
audit_flags() ->
    {ok, {SupFlags, ChildSpecs}} = init([]),
    Strategy = maps:get(strategy, SupFlags),
    Restarts = [maps:get(restart, Spec) || Spec <- ChildSpecs],
    {ok, Strategy, Restarts}.

%% @doc Kill the cache worker and verify upstream survival with downstream recovery.
test_chaos_cascade() ->
    {ok, Sup} = start_link(),
    unlink(Sup),
    Children1 = supervisor:which_children(Sup),
    {_, Db1, _, _} = lists:keyfind(worker_db, 1, Children1),
    {_, Cache1, _, _} = lists:keyfind(worker_cache, 1, Children1),
    {_, Http1, _, _} = lists:keyfind(worker_http, 1, Children1),
    exit(Cache1, kill),
    timer:sleep(50),
    Result = case is_process_alive(Sup) of
        true ->
            Children2 = supervisor:which_children(Sup),
            Db2 = case lists:keyfind(worker_db, 1, Children2) of
                {_, P1, _, _} -> P1;
                false -> undefined
            end,
            Cache2 = case lists:keyfind(worker_cache, 1, Children2) of
                {_, P2, _, _} -> P2;
                false -> undefined
            end,
            Http2 = case lists:keyfind(worker_http, 1, Children2) of
                {_, P3, _, _} -> P3;
                false -> undefined
            end,
            case is_pid(Db2) andalso is_pid(Cache2) andalso is_pid(Http2)
                 andalso Db1 =:= Db2 andalso Cache1 =/= Cache2 andalso Http1 =/= Http2 of
                true -> {ok, db_unaffected, downstream_restarted};
                false -> {error, cascade_failed}
            end;
        false ->
            {error, cascade_failed}
    end,
    Ref = monitor(process, Sup),
    exit(Sup, shutdown),
    receive
        {'DOWN', Ref, process, Sup, _} -> ok
    after 1000 ->
        ok
    end,
    Result.
`,
      },
    ],
    solutionFiles: {
      'src/incident_wrong_strategy.erl': `-module(incident_wrong_strategy).
-behaviour(supervisor).

-export([
    start_link/0,
    init/1,
    build_pipeline_specs/0,
    audit_flags/0,
    test_chaos_cascade/0
]).
-export([worker_loop/1]).

%% @doc Start an unnamed supervision tree instance linked to the caller.
start_link() ->
    supervisor:start_link(?MODULE, []).

%% @doc Return supervisor flags and pipeline child specs for auth-pipeline-sup.
init([]) ->
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 5,
        period => 10
    },
    ChildSpecs = [
        #{
            id => worker_db,
            start => {incident_wrong_strategy, worker_loop, [db]},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        },
        #{
            id => worker_cache,
            start => {incident_wrong_strategy, worker_loop, [cache]},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        },
        #{
            id => worker_http,
            start => {incident_wrong_strategy, worker_loop, [http]},
            restart => permanent,
            shutdown => 2000,
            type => worker,
            modules => [incident_wrong_strategy]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.

%% @doc Extract the ordered list of child specifications from init/1.
build_pipeline_specs() ->
    {ok, {_SupFlags, ChildSpecs}} = init([]),
    ChildSpecs.

%% @doc Spawn and link a pipeline stage worker loop for the given role.
worker_loop(Role) ->
    Pid = spawn_link(fun() -> run_worker(Role) end),
    {ok, Pid}.

run_worker(Role) ->
    receive
        stop -> ok;
        _ -> run_worker(Role)
    end.

%% @doc Audit the configured supervision strategy and child restart policies.
audit_flags() ->
    {ok, {SupFlags, ChildSpecs}} = init([]),
    Strategy = maps:get(strategy, SupFlags),
    Restarts = [maps:get(restart, Spec) || Spec <- ChildSpecs],
    {ok, Strategy, Restarts}.

%% @doc Kill the cache worker and verify upstream survival with downstream recovery.
test_chaos_cascade() ->
    {ok, Sup} = start_link(),
    unlink(Sup),
    Children1 = supervisor:which_children(Sup),
    {_, Db1, _, _} = lists:keyfind(worker_db, 1, Children1),
    {_, Cache1, _, _} = lists:keyfind(worker_cache, 1, Children1),
    {_, Http1, _, _} = lists:keyfind(worker_http, 1, Children1),
    exit(Cache1, kill),
    timer:sleep(50),
    Result = case is_process_alive(Sup) of
        true ->
            Children2 = supervisor:which_children(Sup),
            Db2 = case lists:keyfind(worker_db, 1, Children2) of
                {_, P1, _, _} -> P1;
                false -> undefined
            end,
            Cache2 = case lists:keyfind(worker_cache, 1, Children2) of
                {_, P2, _, _} -> P2;
                false -> undefined
            end,
            Http2 = case lists:keyfind(worker_http, 1, Children2) of
                {_, P3, _, _} -> P3;
                false -> undefined
            end,
            case is_pid(Db2) andalso is_pid(Cache2) andalso is_pid(Http2)
                 andalso Db1 =:= Db2 andalso Cache1 =/= Cache2 andalso Http1 =/= Http2 of
                true -> {ok, db_unaffected, downstream_restarted};
                false -> {error, cascade_failed}
            end;
        false ->
            {error, cascade_failed}
    end,
    Ref = monitor(process, Sup),
    exit(Sup, shutdown),
    receive
        {'DOWN', Ref, process, Sup, _} -> ok
    after 1000 ->
        ok
    end,
    Result.
`,
    },
    astRules: {
      requiredCalls: ['supervisor:start_link/2'],
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Supervisor Strategy & Restarts Audit',
        explanation: 'Audits init/1 to confirm rest_for_one and permanent across all three workers.',
        erlangCall: 'incident_wrong_strategy:audit_flags()',
        expectedOutput: '{ok, rest_for_one, [permanent, permanent, permanent]}',
      },
      {
        id: 'tc2',
        title: 'Live Chaos Cascade Test',
        explanation: 'Kills worker_cache and confirms worker_db stays unharmed while downstream worker_http restarts.',
        erlangCall: 'incident_wrong_strategy:test_chaos_cascade()',
        expectedOutput: '{ok, db_unaffected, downstream_restarted}',
      },
    ],
  },

  // ── Lesson 8.7: Problem Set (Checkout Supervision Tree & Worker) ──────────
  {
    id: 'ch08-l07',
    chapterNumber: 8,
    lessonNumber: 7,
    lessonType: 'problem_set',
    title: 'Chapter 8 Problem Set: Fault-Isolated E-Commerce Checkout Supervision Tree',
    visualScene: 'supervision_rest_for_one_ets_heir',
    difficulty: 'Advanced',
    xpReward: 250,
    conceptMarkdown: `## Why This Matters in Production

In production OTP systems, supervisors and workers are separated into dedicated modules so supervision restarts cleanly isolate failure boundaries without tangling business state inside supervisor callbacks. An e-commerce checkout backend depends on three sequential stages: a persistent database pool, an in-memory pricing cache fed by that pool, and an order gateway serving buyers from cached prices.

When the pricing cache crashes, keeping the downstream order gateway alive would serve stale or broken prices—whereas restarting the upstream database pool would sever unrelated active connections. Choosing ordered downstream supervision (\`rest_for_one\`) across cleanly separated worker modules keeps upstream foundations stable while rebuilding only broken downstream links. Use the interactive visualizer below to trace how OTP sequences those restarts.

## Deep Concept Breakdown & Under the Hood

When a supervisor launches worker processes implemented in a separate \`gen_server\` module, three BEAM runtime details govern reliability and hot-code maintenance:

1. **Cross-Module MFArgs Delegation**: Each child specification's \`start\` entry tells the supervisor which \`{Module, Function, Arguments}\` call boots and links the worker process. Because \`supervisor:start_link/3\` is synchronous, it executes each child's start function sequentially in list order before returning \`{ok, SupPid}\`.
2. **Release Handler Code Tracking (\`modules\`)**: Setting \`modules => [WorkerModule]\` in a worker's child specification tells OTP's release handler which code module owns that process's runtime loop—crucial for live hot-code upgrades (\`code_change/3\`), even though the child spec itself lives inside the supervisor file.
3. **Resilient Lookup After Restarts**: Registered process names remain bound only while their process is alive. When \`rest_for_one\` restarts a worker, its old PID dies and a fresh PID takes over the registered name. Querying \`supervisor:which_children/1\` with a child ID returns the current live \`pid()\` managed under that tree (falling back to \`whereis/1\` only if checking a registered atom directly).

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (stdlib / supervisor)
supervisor:start_link(SupName, Module, Args) -> startlink_ret()
  Types:
    SupName = {local, Name :: atom()} | {global, Name :: term()} | {via, Module :: module(), Name :: term()}
    Module = module()
    Args = term()
    startlink_ret() = {ok, pid()} | ignore | {error, startlink_err()}

supervisor:which_children(SupRef) -> [{Id, Child, Type, Modules}]
  Types:
    SupRef = Name :: atom() | {Name :: atom(), Node :: node()} | pid()
    Id = child_id() | undefined
    Child = pid() | undefined | restarting
    Type = worker | supervisor
    Modules = [module()] | dynamic
\`\`\`

Use the attached reference cards below when registering a supervisor locally under its own module atom (\`?MODULE\`) and inspecting child PIDs by child ID.

## Parallel Worked Example: Multi-File Log Ingestion Tree

Consider a separate two-module system: an IoT log ingestion tree with a companion \`gen_server\` worker module (\`ingest_stage_worker\`) supervised by \`ingest_pipeline_sup\` across three ordered stages: \`socket_reader\`, \`frame_decoder\`, and \`metrics_sink\`.

### 1. Companion Worker Module (\`ingest_stage_worker.erl\`)

\`\`\`erlang
-module(ingest_stage_worker).
-behaviour(gen_server).

-export([start_link/1, init/1, handle_call/3, handle_cast/2, terminate/2]).

%% @doc Start and register an ingestion stage server under its stage atom.
start_link(StageTag) ->
    gen_server:start_link({local, StageTag}, ?MODULE, StageTag, []).

%% @doc Initialize worker state for the assigned ingestion stage.
init(StageTag) ->
    {ok, #{stage => StageTag}}.

%% @doc Report the stage tag held by this worker.
handle_call(stage, _From, State) ->
    {reply, {ok, maps:get(stage, State)}, State}.

%% @doc Ignore unused asynchronous casts.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Clean up worker state on supervisor shutdown.
terminate(_Reason, _State) ->
    ok.
\`\`\`

### 2. Ordered Multi-Child Supervisor (\`ingest_pipeline_sup.erl\`)

\`\`\`erlang
-module(ingest_pipeline_sup).
-behaviour(supervisor).

-export([start_link/0, init/1, stage_pids/0]).

%% @doc Start the locally registered ingestion pipeline supervisor.
start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

%% @doc Configure rest_for_one supervision across three permanent stage workers.
init([]) ->
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 4,
        period => 8
    },
    Stages = [socket_reader, frame_decoder, metrics_sink],
    ChildSpecs = [
        #{
            id => Stage,
            start => {ingest_stage_worker, start_link, [Stage]},
            restart => permanent,
            shutdown => 3000,
            type => worker,
            modules => [ingest_stage_worker]
        }
        || Stage <- Stages
    ],
    {ok, {SupFlags, ChildSpecs}}.

%% @doc Return the current PIDs of all three ingestion stages in pipeline order.
stage_pids() ->
    Children = supervisor:which_children(?MODULE),
    FindPid = fun(Id) ->
        case lists:keyfind(Id, 1, Children) of
            {Id, Pid, _, _} -> Pid;
            false -> whereis(Id)
        end
    end,
    {FindPid(socket_reader), FindPid(frame_decoder), FindPid(metrics_sink)}.
\`\`\`

### What OTP Does at Runtime

- **External Worker Delegation**: Every child spec points \`start\` at \`{ingest_stage_worker, start_link, [Stage]}\` and sets \`modules => [ingest_stage_worker]\`, cleanly isolating worker logic from supervision configuration.
- **Dependency Ordering**: Declaring \`[socket_reader, frame_decoder, metrics_sink]\` under \`rest_for_one\` (budget: 4 restarts per 8 seconds) guarantees that crashing \`frame_decoder\` restarts \`frame_decoder\` and \`metrics_sink\` while preserving \`socket_reader\`.
- **Resolving Active Child PIDs**: \`stage_pids/0\` queries \`supervisor:which_children(?MODULE)\` by child ID and falls back to \`whereis/1\`, immediately surfacing fresh PIDs after downstream recovery restarts.

## Assignment Specification

Implement \`src/checkout_sup.erl\` as an OTP supervisor managing the read-only companion worker module \`src/checkout_worker.erl\` (visible in your editor's second tab, exporting \`start_link/2\` taking a local registered name atom and role atom).

### \`start_link/0\`
- **Input**: None.
- **Behavior**: Starts the \`checkout_sup\` supervisor registered locally on the node under its own module name, links it to the calling process, and boots all initial children before returning.
- **Examples**:
  - \`checkout_sup:start_link()\` returns \`{ok, SupPid}\`.

### \`init/1\`
- **Input**: Empty list \`[]\`.
- **Behavior**: Configures ordered downstream recovery (\`rest_for_one\`) tolerating up to 5 restarts within a 10-second period, and defines 3 permanent worker specifications (each with a \`5000\` ms shutdown timeout, worker type, and \`checkout_worker\` module tracking) in strict dependency order:
  1. First child: ID \`db_pool\`, delegating to \`checkout_worker:start_link/2\` with local name \`db_pool_worker\` and role \`db\`.
  2. Second child: ID \`pricing_cache\`, delegating to \`checkout_worker:start_link/2\` with local name \`pricing_cache_worker\` and role \`cache\`.
  3. Third child: ID \`order_gateway\`, delegating to \`checkout_worker:start_link/2\` with local name \`order_gateway_worker\` and role \`gateway\`.
- **Examples**:
  - \`checkout_sup:init([])\` returns \`{ok, {SupFlags, [DbSpec, CacheSpec, GatewaySpec]}}\`.

### \`get_pipeline_pids/0\`
- **Input**: None.
- **Behavior**: Queries the locally registered \`checkout_sup\` child list via OTP supervisor introspection, looks up each of the three stage PIDs (falling back to registered process lookup by worker name if needed), and returns an ok-tagged map containing keys \`db_pid\`, \`cache_pid\`, and \`gateway_pid\`.
- **Examples**:
  - \`checkout_sup:get_pipeline_pids()\` returns \`{ok, #{db_pid => DbPid, cache_pid => CachePid, gateway_pid => GatewayPid}}\`.

## Rules & Verification Constraints

- **Required Remote Calls**: \`bf_ast_verifier\` enforces \`supervisor:start_link/3\` and \`supervisor:which_children/1\`.
- **Exact Flags & Child Order**: \`init/1\` must return \`rest_for_one\`, intensity \`5\`, period \`10\`, and child IDs \`[db_pool, pricing_cache, order_gateway]\`.
- **3-Stage Chaos Injection**:
  - Killing \`order_gateway\` restarts only \`order_gateway\`, leaving \`db_pool\` and \`pricing_cache\` PIDs unchanged.
  - Killing \`pricing_cache\` restarts \`pricing_cache\` and \`order_gateway\` with new PIDs while preserving \`db_pool\`.
  - Killing \`db_pool\` restarts all three pipeline workers with fresh PIDs in order.
`,
    mentalModelCheck: {
      question: 'In checkout_sup with children [db_pool, pricing_cache, order_gateway] under rest_for_one, why does order_gateway crashing NOT restart pricing_cache?',
      options: [
        {
          id: 'A',
          label: 'Because order_gateway is downstream of pricing_cache; in rest_for_one, failures only propagate to children started AFTER the crashed child.',
          isCorrect: true,
          explanation: 'rest_for_one protects upstream dependencies from downstream failures.',
        },
        {
          id: 'B',
          label: 'Because pricing_cache uses temporary restart.',
          isCorrect: false,
          explanation: 'All 3 children use permanent restarts.',
        },
        {
          id: 'C',
          label: 'Because order_gateway is supervised by a different supervisor.',
          isCorrect: false,
          explanation: 'All 3 children are in the same checkout_sup supervisor.',
        },
        {
          id: 'D',
          label: 'Because the supervisor drops exit signals from the last child.',
          isCorrect: false,
          explanation: 'The supervisor processes exit signals from all children, but applies the strategy rules to decide which peers to restart.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'start_link',
        module: 'supervisor',
        signature: 'supervisor:start_link(SupName, Module, Args) -> {ok, Pid} | {error, Reason}',
        typesSpec: [
          'SupName = {local, atom()} | {global, term()}',
          'Module = module()',
          'Args = term()'
        ],
        description: 'Creates a supervisor process as part of a supervision tree, registering it locally and linking to caller.',
        complexityNote: 'Synchronous boot. Returns only when init/1 and all permanent children have started.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/supervisor.html#start_link/3',
      },
      {
        functionName: 'which_children',
        module: 'supervisor',
        signature: 'supervisor:which_children(SupRef) -> [{Id, Child, Type, Modules}]',
        typesSpec: [
          'SupRef = atom() | pid()',
          'Child = pid() | undefined | restarting'
        ],
        description: 'Returns tuples describing every child currently managed by the supervisor, including live child PIDs.',
        complexityNote: 'Synchronous gen_server call to the supervisor loop.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/supervisor.html#which_children/1',
      },
    ],
    starterCode: `-module(checkout_sup).
-behaviour(supervisor).

-export([
    start_link/0,
    get_pipeline_pids/0,
    init/1
]).

%% @doc Start and locally register the checkout supervisor linked to the caller.
start_link() ->
    ok.

%% @doc Return rest_for_one supervisor flags and permanent checkout worker specs.
init([]) ->
    ok.

%% @doc Query the live PIDs of the db_pool, pricing_cache, and order_gateway workers.
get_pipeline_pids() ->
    ok.
`,
    solutionCode: `-module(checkout_sup).
-behaviour(supervisor).

-export([
    start_link/0,
    get_pipeline_pids/0,
    init/1
]).

%% @doc Start and locally register the checkout supervisor linked to the caller.
start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

%% @doc Return rest_for_one supervisor flags and permanent checkout worker specs.
init([]) ->
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 5,
        period => 10
    },
    ChildSpecs = [
        #{
            id => db_pool,
            start => {checkout_worker, start_link, [db_pool_worker, db]},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [checkout_worker]
        },
        #{
            id => pricing_cache,
            start => {checkout_worker, start_link, [pricing_cache_worker, cache]},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [checkout_worker]
        },
        #{
            id => order_gateway,
            start => {checkout_worker, start_link, [order_gateway_worker, gateway]},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [checkout_worker]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.

%% @doc Query the live PIDs of the db_pool, pricing_cache, and order_gateway workers.
get_pipeline_pids() ->
    Children = supervisor:which_children(?MODULE),
    DbPid = case lists:keyfind(db_pool, 1, Children) of
        {db_pool, P1, _, _} -> P1;
        _ -> whereis(db_pool_worker)
    end,
    CachePid = case lists:keyfind(pricing_cache, 1, Children) of
        {pricing_cache, P2, _, _} -> P2;
        _ -> whereis(pricing_cache_worker)
    end,
    GatewayPid = case lists:keyfind(order_gateway, 1, Children) of
        {order_gateway, P3, _, _} -> P3;
        _ -> whereis(order_gateway_worker)
    end,
    {ok, #{db_pid => DbPid, cache_pid => CachePid, gateway_pid => GatewayPid}}.
`,
    solutionExplanation: 'Implements the production rest_for_one checkout supervision tree with 3 permanent workers cleanly separated into checkout_worker.erl, verified by automated multi-stage chaos tests.',
    files: [
      {
        name: 'checkout_sup.erl',
        path: 'src/checkout_sup.erl',
        behaviour: 'supervisor',
        content: `-module(checkout_sup).
-behaviour(supervisor).

-export([
    start_link/0,
    get_pipeline_pids/0,
    init/1
]).

%% @doc Start and locally register the checkout supervisor linked to the caller.
start_link() ->
    ok.

%% @doc Return rest_for_one supervisor flags and permanent checkout worker specs.
init([]) ->
    ok.

%% @doc Query the live PIDs of the db_pool, pricing_cache, and order_gateway workers.
get_pipeline_pids() ->
    ok.
`,
      },
      {
        name: 'checkout_worker.erl',
        path: 'src/checkout_worker.erl',
        isReadOnly: true,
        behaviour: 'gen_server',
        content: `-module(checkout_worker).
-behaviour(gen_server).

-export([
    start_link/2,
    get_role/1
]).

-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Start and register a checkout worker process under the given local name and role.
start_link(RegName, Role) ->
    gen_server:start_link({local, RegName}, ?MODULE, Role, []).

%% @doc Initialize worker state with the assigned pipeline role.
init(Role) ->
    {ok, #{role => Role, restarts => 0}}.

%% @doc Synchronously retrieve the pipeline role atom from a worker process.
get_role(Pid) ->
    gen_server:call(Pid, get_role).

%% @doc Handle synchronous role queries for this checkout stage worker.
handle_call(get_role, _From, #{role := Role} = State) ->
    {reply, {ok, Role}, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Ignore asynchronous cast messages.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Ignore out-of-band info messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up worker resources during supervisor termination.
terminate(_Reason, _State) ->
    ok.

%% @doc Preserve worker state across live code upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
      },
    ],
    solutionFiles: {
      'src/checkout_sup.erl': `-module(checkout_sup).
-behaviour(supervisor).

-export([
    start_link/0,
    get_pipeline_pids/0,
    init/1
]).

%% @doc Start and locally register the checkout supervisor linked to the caller.
start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

%% @doc Return rest_for_one supervisor flags and permanent checkout worker specs.
init([]) ->
    SupFlags = #{
        strategy => rest_for_one,
        intensity => 5,
        period => 10
    },
    ChildSpecs = [
        #{
            id => db_pool,
            start => {checkout_worker, start_link, [db_pool_worker, db]},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [checkout_worker]
        },
        #{
            id => pricing_cache,
            start => {checkout_worker, start_link, [pricing_cache_worker, cache]},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [checkout_worker]
        },
        #{
            id => order_gateway,
            start => {checkout_worker, start_link, [order_gateway_worker, gateway]},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [checkout_worker]
        }
    ],
    {ok, {SupFlags, ChildSpecs}}.

%% @doc Query the live PIDs of the db_pool, pricing_cache, and order_gateway workers.
get_pipeline_pids() ->
    Children = supervisor:which_children(?MODULE),
    DbPid = case lists:keyfind(db_pool, 1, Children) of
        {db_pool, P1, _, _} -> P1;
        _ -> whereis(db_pool_worker)
    end,
    CachePid = case lists:keyfind(pricing_cache, 1, Children) of
        {pricing_cache, P2, _, _} -> P2;
        _ -> whereis(pricing_cache_worker)
    end,
    GatewayPid = case lists:keyfind(order_gateway, 1, Children) of
        {order_gateway, P3, _, _} -> P3;
        _ -> whereis(order_gateway_worker)
    end,
    {ok, #{db_pid => DbPid, cache_pid => CachePid, gateway_pid => GatewayPid}}.
`,
      'src/checkout_worker.erl': `-module(checkout_worker).
-behaviour(gen_server).

-export([
    start_link/2,
    get_role/1
]).

-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

%% @doc Start and register a checkout worker process under the given local name and role.
start_link(RegName, Role) ->
    gen_server:start_link({local, RegName}, ?MODULE, Role, []).

%% @doc Initialize worker state with the assigned pipeline role.
init(Role) ->
    {ok, #{role => Role, restarts => 0}}.

%% @doc Synchronously retrieve the pipeline role atom from a worker process.
get_role(Pid) ->
    gen_server:call(Pid, get_role).

%% @doc Handle synchronous role queries for this checkout stage worker.
handle_call(get_role, _From, #{role := Role} = State) ->
    {reply, {ok, Role}, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

%% @doc Ignore asynchronous cast messages.
handle_cast(_Msg, State) ->
    {noreply, State}.

%% @doc Ignore out-of-band info messages.
handle_info(_Info, State) ->
    {noreply, State}.

%% @doc Clean up worker resources during supervisor termination.
terminate(_Reason, _State) ->
    ok.

%% @doc Preserve worker state across live code upgrades.
code_change(_OldVsn, State, _Extra) ->
    {ok, State}.
`,
    },
    astRules: {
      requiredCalls: ['supervisor:start_link/3', 'supervisor:which_children/1'],
    },
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Start Checkout Supervisor Pipeline',
        explanation: 'Starts checkout_sup and confirms all three pipeline workers are alive.',
        erlangCall: 'begin case whereis(checkout_sup) of undefined -> ok; OldSup1 -> RefOld1 = monitor(process, OldSup1), unlink(OldSup1), exit(OldSup1, shutdown), receive {\'DOWN\', RefOld1, process, OldSup1, _} -> ok after 1000 -> ok end end, {ok, Sup} = checkout_sup:start_link(), {ok, #{db_pid := Db, cache_pid := Cache, gateway_pid := Gw}} = checkout_sup:get_pipeline_pids(), unlink(Sup), catch supervisor:stop(Sup), is_pid(Db) andalso is_pid(Cache) andalso is_pid(Gw) end',
        expectedOutput: 'true',
      },
      {
        id: 'tc2',
        title: 'Chaos Test: Gateway Crash (Isolated)',
        explanation: 'Kills order_gateway; confirms DB and Cache PIDs are preserved while Gateway restarts with new PID.',
        erlangCall: 'begin case whereis(checkout_sup) of undefined -> ok; OldSup2 -> RefOld2 = monitor(process, OldSup2), unlink(OldSup2), exit(OldSup2, shutdown), receive {\'DOWN\', RefOld2, process, OldSup2, _} -> ok after 1000 -> ok end end, {ok, Sup} = checkout_sup:start_link(), {ok, #{db_pid := Db1, cache_pid := Cache1, gateway_pid := Gw1}} = checkout_sup:get_pipeline_pids(), exit(Gw1, kill), timer:sleep(50), {ok, #{db_pid := Db2, cache_pid := Cache2, gateway_pid := Gw2}} = checkout_sup:get_pipeline_pids(), unlink(Sup), catch supervisor:stop(Sup), {Db1 =:= Db2, Cache1 =:= Cache2, Gw1 =/= Gw2} end',
        expectedOutput: '{true, true, true}',
      },
      {
        id: 'tc3',
        title: 'Chaos Test: Cache Crash (Cascades to Gateway)',
        explanation: 'Kills pricing_cache; confirms Cache and Gateway restart with new PIDs while DB Pool PID is untouched.',
        erlangCall: 'begin case whereis(checkout_sup) of undefined -> ok; OldSup3 -> RefOld3 = monitor(process, OldSup3), unlink(OldSup3), exit(OldSup3, shutdown), receive {\'DOWN\', RefOld3, process, OldSup3, _} -> ok after 1000 -> ok end end, {ok, Sup} = checkout_sup:start_link(), {ok, #{db_pid := Db1, cache_pid := Cache1, gateway_pid := Gw1}} = checkout_sup:get_pipeline_pids(), exit(Cache1, kill), timer:sleep(50), {ok, #{db_pid := Db2, cache_pid := Cache2, gateway_pid := Gw2}} = checkout_sup:get_pipeline_pids(), unlink(Sup), catch supervisor:stop(Sup), {Db1 =:= Db2, Cache1 =/= Cache2, Gw1 =/= Gw2} end',
        expectedOutput: '{true, true, true}',
      },
    ],
  },
];

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

Standard supervisors (\`one_for_one\`, \`rest_for_one\`) supervise a **static list of known children** declared at boot time.

However, modern systems frequently require **dynamic process pools**:
- A TCP server spawning a new worker process for every incoming connection.
- An XMPP server creating a dedicated state machine for every logged-in user session.
- A background job queue spawning workers on demand.

For this pattern, OTP provides the **\`simple_one_for_one\`** supervisor strategy.

### How \`simple_one_for_one\` Works

1. **Zero Children at Boot:** When \`dynamic_session_sup:start_link()\` runs, the supervisor starts with **zero** active children.
2. **Single Child Spec Template:** The \`init/1\` callback returns a list containing **exactly one** child specification template.
3. **Dynamic Spawning via \`supervisor:start_child/2\`:**
   - The template defines the starting MFA: \`start => {session_worker, start_link, []}\`.
   - When a caller invokes \`supervisor:start_child(SupRef, [SessionId, UserId])\`, the supervisor **appends** the arguments in the second parameter to the template's start MFA list!
   - This dynamically executes: \`session_worker:start_link(SessionId, UserId)\`.

### Eliminating the Mixed Supervisor/Worker Anti-Pattern

> [!warning] Production Supervision Trap: Overloading Supervisor init/1
> A common beginner mistake is cramming both \`-behaviour(supervisor).\` and \`-behaviour(gen_server).\` into the same file by overloading \`init/1\`:
> \`\`\`erlang
> %% ANTI-PATTERN: DO NOT DO THIS!
> init([]) -> {ok, {SupFlags, [Template]}};  %% Supervisor callback
> init({worker, SessionId}) -> {ok, State}.   %% Worker callback!
> \`\`\`
> This causes severe cognitive friction, mixes lifecycle management with business state, and breaks OTP tooling.
> **The Idiomatic OTP Architecture:**
> - File 1: \`src/dynamic_session_sup.erl\` (\`-behaviour(supervisor).\`)
> - File 2: \`src/session_worker.erl\` (\`-behaviour(gen_server).\`)

Look at the second tab in your editor: \`session_worker.erl\` is already written as a clean, separate \`gen_server\` worker. Your job is to implement the supervisor \`dynamic_session_sup.erl\`!

### Parallel Worked Example

\`\`\`erlang
-module(dynamic_pool_sup).
-behaviour(supervisor).
-export([start_link/0, add_worker/2, count_active/1, remove_worker/2, init/1]).

start_link() ->
    supervisor:start_link(?MODULE, []).

init([]) ->
    SupFlags = #{
        strategy => simple_one_for_one,
        intensity => 10,
        period => 5
    },
    ChildTemplate = #{
        id => pool_worker,
        start => {pool_worker, start_link, []},
        restart => temporary,
        shutdown => 2000,
        type => worker,
        modules => [pool_worker]
    },
    {ok, {SupFlags, [ChildTemplate]}}.

add_worker(SupRef, TaskId, Priority) ->
    supervisor:start_child(SupRef, [TaskId, Priority]).

count_active(SupRef) ->
    Counts = supervisor:count_children(SupRef),
    case is_map(Counts) of
        true  -> maps:get(active, Counts, 0);
        false -> proplists:get_value(active, Counts, 0)
    end.

remove_worker(SupRef, ChildPid) ->
    supervisor:terminate_child(SupRef, ChildPid).
\`\`\`

### Your Mission

Implement module \`dynamic_session_sup\` with \`-behaviour(supervisor).\` exporting:
1. \`start_link/0 -> {ok, pid()}\`:
   - Calls \`supervisor:start_link({local, ?MODULE}, ?MODULE, [])\`.
2. \`init([]) -> {ok, {SupFlags, [ChildTemplate]}}\`:
   - Returns \`SupFlags = #{strategy => simple_one_for_one, intensity => 10, period => 5}\`.
   - Returns a single \`ChildTemplate\` with \`id => session_worker\`, \`start => {session_worker, start_link, []}\`, \`restart => temporary\`, \`shutdown => 2000\`, \`type => worker\`, \`modules => [session_worker]\`.
3. \`start_session(SupRef, SessionId, UserId) -> {ok, pid()}\`:
   - Invokes \`supervisor:start_child(SupRef, [SessionId, UserId])\`.
4. \`count_sessions(SupRef) -> integer()\`:
   - Invokes \`supervisor:count_children(SupRef)\` and extracts the active child count.
5. \`terminate_session(SupRef, ChildPid) -> ok\`:
   - Invokes \`supervisor:terminate_child(SupRef, ChildPid)\`.
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

start_link() ->
    ok.

init([]) ->
    ok.

start_session(SupRef, SessionId, UserId) ->
    ok.

count_sessions(SupRef) ->
    ok.

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

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

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

start_session(SupRef, SessionId, UserId) ->
    supervisor:start_child(SupRef, [SessionId, UserId]).

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

start_link() ->
    ok.

init([]) ->
    ok.

start_session(SupRef, SessionId, UserId) ->
    ok.

count_sessions(SupRef) ->
    ok.

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

-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

start_link(SessionId, UserId) ->
    gen_server:start_link(?MODULE, {SessionId, UserId}, []).

init({SessionId, UserId}) ->
    {ok, #{session_id => SessionId, user_id => UserId, active => true}}.

get_info(Pid) ->
    gen_server:call(Pid, get_info).

handle_call(get_info, _From, State) ->
    {reply, {ok, State}, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

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

start_session(SupRef, SessionId, UserId) ->
    supervisor:start_child(SupRef, [SessionId, UserId]).

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

terminate_session(SupRef, ChildPid) ->
    supervisor:terminate_child(SupRef, ChildPid).
`,
      'src/session_worker.erl': `-module(session_worker).
-behaviour(gen_server).

-export([
    start_link/2,
    get_info/1
]).

-export([
    init/1,
    handle_call/3,
    handle_cast/2,
    handle_info/2,
    terminate/2,
    code_change/3
]).

start_link(SessionId, UserId) ->
    gen_server:start_link(?MODULE, {SessionId, UserId}, []).

init({SessionId, UserId}) ->
    {ok, #{session_id => SessionId, user_id => UserId, active => true}}.

get_info(Pid) ->
    gen_server:call(Pid, get_info).

handle_call(get_info, _From, State) ->
    {reply, {ok, State}, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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
        erlangCall: 'begin {ok, Sup} = dynamic_session_sup:start_link(), {ok, _} = dynamic_session_sup:start_session(Sup, <<"s1">>, <<"u1">>), {ok, _} = dynamic_session_sup:start_session(Sup, <<"s2">>, <<"u2">>), C = dynamic_session_sup:count_sessions(Sup), unlink(Sup), exit(Sup, shutdown), C end',
        expectedOutput: '2',
      },
      {
        id: 'tc2',
        title: 'Verify Separate Worker State',
        explanation: 'Queries companion session_worker:get_info to verify separate module state isolation.',
        erlangCall: 'begin {ok, Sup} = dynamic_session_sup:start_link(), {ok, P} = dynamic_session_sup:start_session(Sup, <<"sess_99">>, <<"alice">>), {ok, Info} = session_worker:get_info(P), unlink(Sup), exit(Sup, shutdown), maps:get(user_id, Info) end',
        expectedOutput: '<<"alice">>',
      },
      {
        id: 'tc3',
        title: 'Terminate Dynamic Session',
        explanation: 'Terminates one child process and asserts session count decrements from 2 to 1.',
        erlangCall: 'begin {ok, Sup} = dynamic_session_sup:start_link(), {ok, P1} = dynamic_session_sup:start_session(Sup, <<"s1">>, <<"u1">>), {ok, _P2} = dynamic_session_sup:start_session(Sup, <<"s2">>, <<"u2">>), ok = dynamic_session_sup:terminate_session(Sup, P1), C = dynamic_session_sup:count_sessions(Sup), unlink(Sup), exit(Sup, shutdown), C end',
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

In Erlang/OTP, an **Application** is a self-contained component that can be started and stopped as a single unit, packaged into production releases, and configured at runtime.

Every production system you build—from an HTTP REST API to an XMPP cluster—is structured as one or more OTP applications.

### The Two Components of an OTP Application

1. **The Application Resource File (\`.app\` or \`.app.src\`):**
   - A declarative metadata file containing the application's name, version, registered names, dependencies, and configuration parameters.
   - Declares the callback module implementing \`-behaviour(application).\`.

2. **The Application Callback Module:**
   - Implements \`start(StartType, StartArgs) -> {ok, SupPid} | {error, Reason}\`.
   - Implements \`stop(State) -> ok\`.
   - The \`start/2\` callback is invoked by the BEAM **Application Master** process. It spawns the root supervisor of the application's supervision tree and returns the root supervisor's PID.

### The \`.app.src\` Resource Specification

\`\`\`erlang
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
\`\`\`

### Runtime Configuration with \`application:get_env/3\`

Production code must NEVER hardcode configuration parameters (like API tokens, database hosts, or timeout thresholds).

OTP provides built-in application configuration management:
- **\`application:get_env(App, Key, Default)\`**: Reads the runtime configuration parameter for \`App\`. If unset, safely returns \`Default\`.
- **\`application:set_env(App, Key, Value)\`**: Updates the runtime configuration dynamically in the application controller.

> [!warning] Production Supervision Trap: Hardcoded Configuration Constants
> Never write \`Timeout = 5000\` inside worker processes. If production network conditions require increasing timeouts during high traffic, hardcoded values require recompilation and redeployment. Using \`application:get_env(my_app, timeout_ms, 5000)\` allows dynamic tuning via \`sys.config\` or live console RPC without downtime.

### Parallel Worked Example

\`\`\`erlang
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
\`\`\`

### Your Mission

Implement module \`commerce_app\` implementing both \`-behaviour(application).\` and \`-behaviour(supervisor).\`:
1. \`start(StartType, StartArgs) -> {ok, pid()} | {error, term()}\`:
   - Spawns the supervisor using \`supervisor:start_link({local, ?MODULE}, ?MODULE, [])\`.
   - Returns \`{ok, SupPid}\` (handles \`{error, {already_started, SupPid}}\` gracefully).
2. \`stop(State) -> ok\`:
   - Performs clean teardown; returns \`ok\`.
3. \`get_app_config(Key, Default) -> term()\`:
   - Invokes \`application:get_env(commerce_app, Key, Default)\`.
4. \`set_app_config(Key, Value) -> ok\`:
   - Invokes \`application:set_env(commerce_app, Key, Value)\`.
5. \`init([]) -> {ok, {SupFlags, ChildSpecs}}\`:
   - Returns \`strategy => one_for_one\`, \`intensity => 3\`, \`period => 5\`, and \`ChildSpecs = []\`.
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

start(_StartType, _StartArgs) ->
    ok.

stop(_State) ->
    ok.

get_app_config(Key, Default) ->
    ok.

set_app_config(Key, Value) ->
    ok.

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

start(_StartType, _StartArgs) ->
    case supervisor:start_link({local, ?MODULE}, ?MODULE, []) of
        {ok, SupPid} -> {ok, SupPid};
        {error, {already_started, SupPid}} -> {ok, SupPid};
        {error, Reason} -> {error, Reason}
    end.

stop(_State) ->
    ok.

get_app_config(Key, Default) ->
    application:get_env(commerce_app, Key, Default).

set_app_config(Key, Value) ->
    application:set_env(commerce_app, Key, Value).

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

start(_StartType, _StartArgs) ->
    ok.

stop(_State) ->
    ok.

get_app_config(Key, Default) ->
    ok.

set_app_config(Key, Value) ->
    ok.

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

start(_StartType, _StartArgs) ->
    case supervisor:start_link({local, ?MODULE}, ?MODULE, []) of
        {ok, SupPid} -> {ok, SupPid};
        {error, {already_started, SupPid}} -> {ok, SupPid};
        {error, Reason} -> {error, Reason}
    end.

stop(_State) ->
    ok.

get_app_config(Key, Default) ->
    application:get_env(commerce_app, Key, Default).

set_app_config(Key, Value) ->
    application:set_env(commerce_app, Key, Value).

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
      symptom: 'When auth_cache crashes under memory pressure, it never restarts (leaving the cache dead), and downstream api_router continues running with broken references!',
      rootCauseHint: 'init/1 in incident_wrong_strategy.erl configured strategy => one_for_one instead of rest_for_one, set intensity => 0 (so the very first crash kills the supervisor!), and marked auth_cache as restart => temporary.',
      fixObjective: 'Fix init([]) to return strategy => rest_for_one, intensity => 5, period => 10, and ensure all 3 pipeline children ([worker_db, worker_cache, worker_http]) have restart => permanent and type => worker.',
      impact: 'Total failure of authentication routing when cache worker crashes.',
    },
    conceptMarkdown: `## Postmortem & Triage Lab: Incident #104

You are on call for the authentication gateway cluster. At 03:14 UTC, an alert triggered:

> **CRITICAL OUTAGE:** Authentication requests are failing with \`{error, bad_cache_pid}\`. Downstream \`api_router\` is logging thousands of dead process crashes, while the supervisor itself remains idle and the cache process is nowhere to be found!

### System Topology

The authentication subsystem is a sequential dependency pipeline:
\`\`\`
[worker_db] -> [worker_cache] -> [worker_http]
\`\`\`
1. \`worker_db\`: Manages the primary credentials database.
2. \`worker_cache\`: In-memory cache dependent on \`worker_db\`.
3. \`worker_http\`: External HTTP routing gateway dependent on \`worker_cache\`.

### Root Cause Analysis

Inspecting \`incident_wrong_strategy:init/1\` reveals three critical bugs:
1. **Wrong Strategy (\`one_for_one\`):** When \`worker_cache\` crashes, \`one_for_one\` ignores downstream \`worker_http\`. The HTTP gateway continues running, attempting to query a dead cache PID!
2. **Temporary Restart Policy (\`temporary\`):** \`worker_cache\` was marked \`restart => temporary\`! When it crashed under memory pressure, the supervisor never restarted it at all!
3. **Zero Restart Intensity (\`intensity => 0\`):** The supervisor configured \`intensity => 0\`, meaning if *any* process crashed, the supervisor would commit suicide immediately!

### Triage & Fix Objective

1. Update the restart strategy to **\`rest_for_one\`**.
2. Set **\`intensity => 5, period => 10\`** to tolerate transient blizzards.
3. Update all 3 child specifications to **\`restart => permanent\`**.
4. Keep \`shutdown => 2000\`, \`type => worker\`, and \`modules => [incident_wrong_strategy]\`.
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

start_link() ->
    supervisor:start_link(?MODULE, []).

init([]) ->
    %% BUGGY IMPLEMENTATION (INCIDENT #104):
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

build_pipeline_specs() ->
    {ok, {_SupFlags, ChildSpecs}} = init([]),
    ChildSpecs.

worker_loop(Role) ->
    Pid = spawn_link(fun() -> run_worker(Role) end),
    {ok, Pid}.

run_worker(Role) ->
    receive
        stop -> ok;
        _ -> run_worker(Role)
    end.

audit_flags() ->
    {ok, {SupFlags, ChildSpecs}} = init([]),
    Strategy = maps:get(strategy, SupFlags),
    Restarts = [maps:get(restart, Spec) || Spec <- ChildSpecs],
    {ok, Strategy, Restarts}.

test_chaos_cascade() ->
    {ok, Sup} = start_link(),
    Children1 = supervisor:which_children(Sup),
    {_, Db1, _, _} = lists:keyfind(worker_db, 1, Children1),
    {_, Cache1, _, _} = lists:keyfind(worker_cache, 1, Children1),
    {_, Http1, _, _} = lists:keyfind(worker_http, 1, Children1),
    exit(Cache1, kill),
    timer:sleep(50),
    Children2 = supervisor:which_children(Sup),
    {_, Db2, _, _} = lists:keyfind(worker_db, 1, Children2),
    {_, Cache2, _, _} = lists:keyfind(worker_cache, 1, Children2),
    {_, Http2, _, _} = lists:keyfind(worker_http, 1, Children2),
    exit(Sup, shutdown),
    case Db1 =:= Db2 andalso Cache1 =/= Cache2 andalso Http1 =/= Http2 of
        true -> {ok, db_unaffected, downstream_restarted};
        false -> {error, cascade_failed}
    end.
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

start_link() ->
    supervisor:start_link(?MODULE, []).

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

build_pipeline_specs() ->
    {ok, {_SupFlags, ChildSpecs}} = init([]),
    ChildSpecs.

worker_loop(Role) ->
    Pid = spawn_link(fun() -> run_worker(Role) end),
    {ok, Pid}.

run_worker(Role) ->
    receive
        stop -> ok;
        _ -> run_worker(Role)
    end.

audit_flags() ->
    {ok, {SupFlags, ChildSpecs}} = init([]),
    Strategy = maps:get(strategy, SupFlags),
    Restarts = [maps:get(restart, Spec) || Spec <- ChildSpecs],
    {ok, Strategy, Restarts}.

test_chaos_cascade() ->
    {ok, Sup} = start_link(),
    Children1 = supervisor:which_children(Sup),
    {_, Db1, _, _} = lists:keyfind(worker_db, 1, Children1),
    {_, Cache1, _, _} = lists:keyfind(worker_cache, 1, Children1),
    {_, Http1, _, _} = lists:keyfind(worker_http, 1, Children1),
    exit(Cache1, kill),
    timer:sleep(50),
    Children2 = supervisor:which_children(Sup),
    {_, Db2, _, _} = lists:keyfind(worker_db, 1, Children2),
    {_, Cache2, _, _} = lists:keyfind(worker_cache, 1, Children2),
    {_, Http2, _, _} = lists:keyfind(worker_http, 1, Children2),
    exit(Sup, shutdown),
    case Db1 =:= Db2 andalso Cache1 =/= Cache2 andalso Http1 =/= Http2 of
        true -> {ok, db_unaffected, downstream_restarted};
        false -> {error, cascade_failed}
    end.
`,
    solutionExplanation: 'Fixed Incident #104 by reconfiguring supervisor with strategy => rest_for_one, intensity => 5, period => 10, and setting all pipeline workers to permanent restart.',
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

start_link() ->
    supervisor:start_link(?MODULE, []).

init([]) ->
    %% BUGGY IMPLEMENTATION (INCIDENT #104):
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

build_pipeline_specs() ->
    {ok, {_SupFlags, ChildSpecs}} = init([]),
    ChildSpecs.

worker_loop(Role) ->
    Pid = spawn_link(fun() -> run_worker(Role) end),
    {ok, Pid}.

run_worker(Role) ->
    receive
        stop -> ok;
        _ -> run_worker(Role)
    end.

audit_flags() ->
    {ok, {SupFlags, ChildSpecs}} = init([]),
    Strategy = maps:get(strategy, SupFlags),
    Restarts = [maps:get(restart, Spec) || Spec <- ChildSpecs],
    {ok, Strategy, Restarts}.

test_chaos_cascade() ->
    {ok, Sup} = start_link(),
    Children1 = supervisor:which_children(Sup),
    {_, Db1, _, _} = lists:keyfind(worker_db, 1, Children1),
    {_, Cache1, _, _} = lists:keyfind(worker_cache, 1, Children1),
    {_, Http1, _, _} = lists:keyfind(worker_http, 1, Children1),
    exit(Cache1, kill),
    timer:sleep(50),
    Children2 = supervisor:which_children(Sup),
    {_, Db2, _, _} = lists:keyfind(worker_db, 1, Children2),
    {_, Cache2, _, _} = lists:keyfind(worker_cache, 1, Children2),
    {_, Http2, _, _} = lists:keyfind(worker_http, 1, Children2),
    exit(Sup, shutdown),
    case Db1 =:= Db2 andalso Cache1 =/= Cache2 andalso Http1 =/= Http2 of
        true -> {ok, db_unaffected, downstream_restarted};
        false -> {error, cascade_failed}
    end.
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

start_link() ->
    supervisor:start_link(?MODULE, []).

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

build_pipeline_specs() ->
    {ok, {_SupFlags, ChildSpecs}} = init([]),
    ChildSpecs.

worker_loop(Role) ->
    Pid = spawn_link(fun() -> run_worker(Role) end),
    {ok, Pid}.

run_worker(Role) ->
    receive
        stop -> ok;
        _ -> run_worker(Role)
    end.

audit_flags() ->
    {ok, {SupFlags, ChildSpecs}} = init([]),
    Strategy = maps:get(strategy, SupFlags),
    Restarts = [maps:get(restart, Spec) || Spec <- ChildSpecs],
    {ok, Strategy, Restarts}.

test_chaos_cascade() ->
    {ok, Sup} = start_link(),
    Children1 = supervisor:which_children(Sup),
    {_, Db1, _, _} = lists:keyfind(worker_db, 1, Children1),
    {_, Cache1, _, _} = lists:keyfind(worker_cache, 1, Children1),
    {_, Http1, _, _} = lists:keyfind(worker_http, 1, Children1),
    exit(Cache1, kill),
    timer:sleep(50),
    Children2 = supervisor:which_children(Sup),
    {_, Db2, _, _} = lists:keyfind(worker_db, 1, Children2),
    {_, Cache2, _, _} = lists:keyfind(worker_cache, 1, Children2),
    {_, Http2, _, _} = lists:keyfind(worker_http, 1, Children2),
    exit(Sup, shutdown),
    case Db1 =:= Db2 andalso Cache1 =/= Cache2 andalso Http1 =/= Http2 of
        true -> {ok, db_unaffected, downstream_restarted};
        false -> {error, cascade_failed}
    end.
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
    conceptMarkdown: `## Architectural Mission: E-Commerce Checkout Pipeline

Welcome to the Chapter 8 Problem Set! You will architect a production-grade, fault-isolated **E-Commerce Checkout Supervision Tree**.

In real-world e-commerce backends, checkout pipelines consist of strictly ordered micro-services:
1. **\`db_pool\`**: Database connection pool maintaining long-lived TCP connections. Must remain stable at all costs.
2. **\`pricing_cache\`**: Fast in-memory caching worker dependent on \`db_pool\`.
3. **\`order_gateway\`**: Payment and order submission gateway dependent on \`pricing_cache\`.

### Architectural Requirements

1. **Strategy Selection:**
   - The supervision tree must use **\`rest_for_one\`** with **\`intensity => 5, period => 10\`**.
   - If \`order_gateway\` crashes, only \`order_gateway\` restarts. \`db_pool\` and \`pricing_cache\` are unaffected.
   - If \`pricing_cache\` crashes, \`pricing_cache\` and \`order_gateway\` restart in dependency order. \`db_pool\` is untouched.
   - If \`db_pool\` crashes, the entire pipeline is cleanly restarted in order.

2. **Strict Clean Worker Separation:**
   - Look at the second tab in your editor: \`src/checkout_worker.erl\` is already implemented as a clean, separate \`gen_server\` worker.
   - In \`src/checkout_sup.erl\`, configure each child spec with:
     - \`start => {checkout_worker, start_link, [RegisteredName, Role]}\`
     - Child 1: \`id => db_pool\`, \`start => {checkout_worker, start_link, [db_pool_worker, db]}\`
     - Child 2: \`id => pricing_cache\`, \`start => {checkout_worker, start_link, [pricing_cache_worker, cache]}\`
     - Child 3: \`id => order_gateway\`, \`start => {checkout_worker, start_link, [order_gateway_worker, gateway]}\`
     - All 3 children must have \`restart => permanent\`, \`shutdown => 5000\`, \`type => worker\`, and \`modules => [checkout_worker]\`.

3. **Pipeline PID Introspection (\`get_pipeline_pids/0\`):**
   - Calls \`supervisor:which_children(?MODULE)\`.
   - Locates each child by its ID tuple (or registered process fallback).
   - Returns \`{ok, #{db_pid => DbPid, cache_pid => CachePid, gateway_pid => GatewayPid}}\`.

### The 3-Stage Live Chaos Test

Your supervision tree will be subjected to automated chaos injection in the test suite:
- **Chaos 1:** \`order_gateway\` is killed with \`exit(kill)\`. Confirms ONLY Child 3 restarted; DB and Cache PIDs match their original values.
- **Chaos 2:** \`pricing_cache\` is killed with \`exit(kill)\`. Confirms Child 2 and Child 3 received NEW PIDs, while DB Pool PID is preserved!
- **Chaos 3:** \`db_pool\` is killed with \`exit(kill)\`. Confirms all 3 processes are restarted in sequence with new PIDs!
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
    ],
    starterCode: `-module(checkout_sup).
-behaviour(supervisor).

-export([
    start_link/0,
    get_pipeline_pids/0,
    init/1
]).

start_link() ->
    ok.

init([]) ->
    ok.

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

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

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

start_link() ->
    ok.

init([]) ->
    ok.

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

start_link(RegName, Role) ->
    gen_server:start_link({local, RegName}, ?MODULE, Role, []).

init(Role) ->
    {ok, #{role => Role, restarts => 0}}.

get_role(Pid) ->
    gen_server:call(Pid, get_role).

handle_call(get_role, _From, #{role := Role} = State) ->
    {reply, {ok, Role}, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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

start_link() ->
    supervisor:start_link({local, ?MODULE}, ?MODULE, []).

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

start_link(RegName, Role) ->
    gen_server:start_link({local, RegName}, ?MODULE, Role, []).

init(Role) ->
    {ok, #{role => Role, restarts => 0}}.

get_role(Pid) ->
    gen_server:call(Pid, get_role).

handle_call(get_role, _From, #{role := Role} = State) ->
    {reply, {ok, Role}, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

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
        erlangCall: 'begin case whereis(checkout_sup) of undefined -> ok; OldSup1 -> unlink(OldSup1), exit(OldSup1, shutdown), timer:sleep(20) end, {ok, Sup} = checkout_sup:start_link(), {ok, #{db_pid := Db, cache_pid := Cache, gateway_pid := Gw}} = checkout_sup:get_pipeline_pids(), unlink(Sup), catch supervisor:stop(Sup), is_pid(Db) andalso is_pid(Cache) andalso is_pid(Gw) end',
        expectedOutput: 'true',
      },
      {
        id: 'tc2',
        title: 'Chaos Test: Gateway Crash (Isolated)',
        explanation: 'Kills order_gateway; confirms DB and Cache PIDs are preserved while Gateway restarts with new PID.',
        erlangCall: 'begin case whereis(checkout_sup) of undefined -> ok; OldSup2 -> unlink(OldSup2), exit(OldSup2, shutdown), timer:sleep(20) end, {ok, Sup} = checkout_sup:start_link(), {ok, #{db_pid := Db1, cache_pid := Cache1, gateway_pid := Gw1}} = checkout_sup:get_pipeline_pids(), exit(Gw1, kill), timer:sleep(50), {ok, #{db_pid := Db2, cache_pid := Cache2, gateway_pid := Gw2}} = checkout_sup:get_pipeline_pids(), unlink(Sup), catch supervisor:stop(Sup), {Db1 =:= Db2, Cache1 =:= Cache2, Gw1 =/= Gw2} end',
        expectedOutput: '{true, true, true}',
      },
      {
        id: 'tc3',
        title: 'Chaos Test: Cache Crash (Cascades to Gateway)',
        explanation: 'Kills pricing_cache; confirms Cache and Gateway restart with new PIDs while DB Pool PID is untouched.',
        erlangCall: 'begin case whereis(checkout_sup) of undefined -> ok; OldSup3 -> unlink(OldSup3), exit(OldSup3, shutdown), timer:sleep(20) end, {ok, Sup} = checkout_sup:start_link(), {ok, #{db_pid := Db1, cache_pid := Cache1, gateway_pid := Gw1}} = checkout_sup:get_pipeline_pids(), exit(Cache1, kill), timer:sleep(50), {ok, #{db_pid := Db2, cache_pid := Cache2, gateway_pid := Gw2}} = checkout_sup:get_pipeline_pids(), unlink(Sup), catch supervisor:stop(Sup), {Db1 =:= Db2, Cache1 =/= Cache2, Gw1 =/= Gw2} end',
        expectedOutput: '{true, true, true}',
      },
    ],
  },
];

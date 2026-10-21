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
    conceptMarkdown: `## Why This Matters in Production

In production backends, individual workers will inevitably encounter hardware timeouts, unexpected corrupt payloads, or database connection drops. The core architectural superpower of Erlang and the BEAM VM is **Supervision Trees** (\`-behaviour(supervisor).\`).

Instead of writing defensive \`try/catch\` blocks around every statement, Erlang systems embrace the **"Let It Crash"** philosophy:
1. **Workers** do the risky business logic. When unexpected corruption occurs, the worker crashes immediately, destroying its tainted heap.
2. **Supervisors** do zero business logic. They exist solely to monitor workers and restore them to a known-clean state.

However, restoring workers requires choosing the correct **Restart Strategy**. If an independent caching worker crashes, you must not take down the entire system. Conversely, if a shared database connection crashes, downstream workers that depend on it must be cleanly restarted so they do not operate on dead handles.

> **Comparison of OTP Restart Strategies:**
> 1. **\`one_for_one\` (Independent Workers):** If a child process terminates, only that single child is restarted. Siblings are unaffected.
> 2. **\`rest_for_one\` (Sequential Dependency Pipeline):** If a child terminates, any child process started *after* it in the spec list is terminated and restarted in order. Preceding children are untouched.
> 3. **\`one_for_all\` (Tightly Coupled Cluster):** If any child terminates, all other children are immediately terminated and restarted together.

## Deep Concept Breakdown & Under the Hood

### The Modern Map-Based \`init/1\` Format

In modern Erlang/OTP, the supervisor callback \`init/1\` returns:

\`\`\`erlang
{ok, {SupFlagsMap, [ChildSpecMap1, ChildSpecMap2, ...]}}
\`\`\`

The \`SupFlagsMap\` specifies how the supervisor handles child failures:

\`\`\`erlang
#{
    strategy => Strategy,    %% one_for_one | rest_for_one | one_for_all | simple_one_for_one
    intensity => Intensity,  %% Max allowable crashes (e.g., 3)
    period => Period         %% Time window in seconds (e.g., 5)
}
\`\`\`

### Preventing Infinite Crash Loops with Intensity & Period

What happens if a child has a bug that crashes on startup? If the supervisor blindly restarted the child forever, it would consume 100% CPU and fill disk logs in seconds.

The \`intensity\` (MaxRestarts) and \`period\` (MaxSeconds) parameters define a restart rate limit:
- If more than \`Intensity\` crashes occur within \`Period\` seconds, the supervisor concludes that the subsystem is unrecoverable.
- It terminates all surviving children cleanly and terminates itself with \`shutdown\`!
- This escalates the failure up to the parent supervisor in the tree.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Type Specification (stdlib / supervisor)
-type sup_flags() :: #{
    strategy => strategy(),
    intensity => non_neg_integer(),
    period => pos_integer(),
    auto_shutdown => auto_shutdown()
}.

-type strategy() :: one_for_one | one_for_all | rest_for_one | simple_one_for_one.
\`\`\`

## Assignment Specification

Implement module \`strategy_planner\` exporting:
1. \`build_sup_flags(Strategy, Intensity, Period) -> map()\`:
   - Validates that \`Strategy\` is one of \`[one_for_one, rest_for_one, one_for_all, simple_one_for_one]\`.
   - Validates that \`Intensity >= 0\` and \`Period > 0\`.
   - Returns the standardized \`#{strategy => Strategy, intensity => Intensity, period => Period}\` map.
2. \`select_strategy_for_topology(TopologyAtom) -> Strategy\`:
   - Maps architecture descriptors to the optimal OTP restart strategy:
     - \`independent_workers -> one_for_one\`
     - \`dependent_pipeline -> rest_for_one\`
     - \`coupled_cluster -> one_for_all\`
     - \`dynamic_pool -> simple_one_for_one\`
     - Any other input returns \`{error, unknown_topology}\`.
3. \`calculate_restart_budget(MaxCrashes, WindowSeconds) -> map()\`:
   - Validates inputs (\`MaxCrashes >= 0\`, \`WindowSeconds > 0\`).
   - Calculates \`MaxRatePerSec = MaxCrashes / WindowSeconds\`.
   - Returns \`#{intensity => MaxCrashes, period => WindowSeconds, max_rate_per_sec => MaxRatePerSec, tolerated_downtime => ok}\`.

## Rules & Verification Constraints
- Guard validation must enforce valid atoms and positive periods.
- Zero mock stubs or incomplete clauses.
`,
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
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/supervisor.erl'
      }
    ],
    starterCode: `-module(strategy_planner).
-export([build_sup_flags/3, select_strategy_for_topology/1, calculate_restart_budget/2]).

build_sup_flags(Strategy, Intensity, Period) ->
    %% % TODO: Validate Strategy and non-negative integers
    %% % Return #{strategy => Strategy, intensity => Intensity, period => Period}
    ok.

select_strategy_for_topology(Topology) ->
    %% % TODO: Map topology atom to OTP restart strategy
    ok.

calculate_restart_budget(MaxCrashes, WindowSeconds) ->
    %% % TODO: Compute max_rate_per_sec and return budget map
    ok.
`,
    solutionCode: `-module(strategy_planner).
-export([build_sup_flags/3, select_strategy_for_topology/1, calculate_restart_budget/2]).

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

select_strategy_for_topology(independent_workers) -> one_for_one;
select_strategy_for_topology(dependent_pipeline)  -> rest_for_one;
select_strategy_for_topology(coupled_cluster)     -> one_for_all;
select_strategy_for_topology(dynamic_pool)        -> simple_one_for_one;
select_strategy_for_topology(_)                   -> {error, unknown_topology}.

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
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Build rest_for_one Supervisor Flags',
        erlangCall: 'strategy_planner:build_sup_flags(rest_for_one, 3, 5)',
        expectedOutput: '#{intensity => 3, period => 5, strategy => rest_for_one}',
        explanation: 'Validates and packages restart strategy and threshold into the OTP supervisor flags map.'
      },
      {
        id: 'tc2',
        title: 'Topology Strategy Selection',
        erlangCall: 'begin S1 = strategy_planner:select_strategy_for_topology(dependent_pipeline), S2 = strategy_planner:select_strategy_for_topology(independent_workers), {S1, S2} end',
        expectedOutput: '{rest_for_one, one_for_one}',
        explanation: 'Maps pipeline topology to rest_for_one and isolated workers to one_for_one.'
      },
      {
        id: 'tc3',
        title: 'Calculate Restart Budget Rate',
        erlangCall: 'strategy_planner:calculate_restart_budget(10, 5)',
        expectedOutput: '#{intensity => 10, max_rate_per_sec => 2.0, period => 5, tolerated_downtime => ok}',
        explanation: 'Computes maximum crash tolerance rate of 2.0 crashes/sec over a 5-second window.'
      }
    ],
    astRules: {
      requiredConstructs: ['guards']
    },
    solutionExplanation: 'Validates supervisor flag maps and maps architectural topologies to OTP strategies.'
  },

  // ── Lesson 8.2: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch08-l02',
    chapterNumber: 8,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'Child Specifications (child_spec()), Restart Types & Shutdown Semantics',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

A supervisor is only as good as the contract it holds with each child. In Erlang/OTP, this contract is called a **Child Specification** (\`child_spec()\`).

Misconfiguring child specifications is one of the most common causes of production outages in BEAM backends:
1. **Wrong Restart Type**: If a worker that executes a one-off batch job is marked \`permanent\`, the supervisor will restart it forever when it exits cleanly after finishing its work! One-off tasks must be \`transient\` or \`temporary\`.
2. **Wrong Shutdown Timeout**: If a child supervisor is configured with \`shutdown => 5000\`, the top supervisor will violently kill it after 5 seconds before its nested children have flushed database buffers! Child supervisors **must always specify \`shutdown => infinity\`**.

## Deep Concept Breakdown & Under the Hood

### The Modern \`child_spec()\` Map Structure

\`\`\`erlang
#{
    id => term(),             %% Unique identifier for the child within this supervisor
    start => {M, F, A},       %% MFA tuple invoked to spawn the child process
    restart => restart(),     %% permanent | transient | temporary
    shutdown => shutdown(),   %% brutal_kill | integer() ms | infinity
    type => worker | supervisor,
    modules => [module()] | dynamic
}
\`\`\`

### Restart Types: Permanent vs. Transient vs. Temporary

| Exit Reason | \`permanent\` | \`transient\` | \`temporary\` |
| :--- | :--- | :--- | :--- |
| \`normal\` | RESTART | NO RESTART | NO RESTART |
| \`shutdown\` | RESTART | NO RESTART | NO RESTART |
| \`{shutdown, term()}\` | RESTART | NO RESTART | NO RESTART |
| \`badarith / crash\` | RESTART | RESTART | NO RESTART |
| \`killed\` | RESTART | RESTART | NO RESTART |

- **\`permanent\`**: Always restarted, regardless of exit reason. Used for long-lived servers that should never stop (e.g., API listeners, database connection pools).
- **\`transient\`**: Restarted ONLY if it crashes abnormally (\`Reason =/= normal\`, \`shutdown\`, or \`{shutdown, _}\`). Never restarted if it exits cleanly. Used for tasks that run to completion.
- **\`temporary\`**: Never restarted, even if it crashes with a catastrophic error. Used for ephemeral client connection sockets.

### Shutdown Strategies

When a supervisor terminates a child:
1. It sends an exit signal: \`exit(ChildPid, shutdown)\`.
2. The child's \`terminate/2\` callback runs to close sockets, save state, or flush disks.
3. If the child does not terminate within \`Shutdown\` milliseconds, the supervisor unlinks and forcefully kills it via \`exit(ChildPid, kill)\`.
4. Using \`brutal_kill\` skips step 1 and immediately sends \`kill\`.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Type Specification (stdlib / supervisor)
-type child_spec() :: #{
    id := child_id(),
    start := mfargs(),
    restart => restart(),
    shutdown => shutdown(),
    type => worker(),
    modules => modules()
}.
\`\`\`

## Assignment Specification

Implement module \`child_spec_factory\` exporting:
1. \`worker_spec(Id, StartMFA, RestartType, ShutdownMs) -> child_spec()\`:
   - Validates that \`RestartType\` is \`permanent\`, \`transient\`, or \`temporary\`.
   - Validates that \`ShutdownMs\` is a positive integer, \`brutal_kill\`, or \`infinity\`.
   - Returns a complete child spec map with \`type => worker\` and \`modules => [element(1, StartMFA)]\`.
2. \`supervisor_spec(Id, StartMFA) -> child_spec()\`:
   - Creates a child spec for a nested supervisor.
   - Sets \`restart => permanent\`, \`shutdown => infinity\`, \`type => supervisor\`, and \`modules => [element(1, StartMFA)]\`.
3. \`classify_restart(RestartType, ExitReason) -> boolean()\`:
   - Returns \`true\` if the supervisor should restart the child based on the decision matrix above; returns \`false\` otherwise.

## Rules & Verification Constraints
- Guard expressions must enforce valid types.
- Ensure \`transient\` recognizes \`normal\`, \`shutdown\`, and \`{shutdown, _}\` as clean exits.
`,
    otpDocCards: [
      {
        functionName: 'child_spec',
        module: 'supervisor',
        signature: 'child_spec() = #{id := term(), start := {M, F, A}, restart => restart(), shutdown => shutdown(), type => type(), modules => modules()}',
        typesSpec: [
          'restart() = permanent | transient | temporary',
          'shutdown() = brutal_kill | timeout()',
          'type() = worker | supervisor'
        ],
        description: 'Specification map defining the lifecycle, restart criteria, and shutdown timeout for a child process in a supervision tree.',
        complexityNote: 'Inspected by supervisor upon init and restart.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/supervisor.html#child_spec/0',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/supervisor.erl'
      }
    ],
    starterCode: `-module(child_spec_factory).
-export([worker_spec/4, supervisor_spec/2, classify_restart/2]).

worker_spec(Id, StartMFA, RestartType, ShutdownMs) ->
    %% % TODO: Construct child_spec map for a worker
    ok.

supervisor_spec(Id, StartMFA) ->
    %% % TODO: Construct child_spec map for a nested supervisor with shutdown => infinity
    ok.

classify_restart(RestartType, ExitReason) ->
    %% % TODO: Implement restart decision matrix
    false.
`,
    solutionCode: `-module(child_spec_factory).
-export([worker_spec/4, supervisor_spec/2, classify_restart/2]).

worker_spec(Id, {M, _F, _A} = StartMFA, RestartType, ShutdownMs)
  when (RestartType =:= permanent orelse RestartType =:= transient orelse RestartType =:= temporary),
       (ShutdownMs =:= brutal_kill orelse ShutdownMs =:= infinity orelse (is_integer(ShutdownMs) andalso ShutdownMs > 0)) ->
    #{
        id => Id,
        start => StartMFA,
        restart => RestartType,
        shutdown => ShutdownMs,
        type => worker,
        modules => [M]
    }.

supervisor_spec(Id, {M, _F, _A} = StartMFA) ->
    #{
        id => Id,
        start => StartMFA,
        restart => permanent,
        shutdown => infinity,
        type => supervisor,
        modules => [M]
    }.

classify_restart(permanent, _Reason) ->
    true;
classify_restart(temporary, _Reason) ->
    false;
classify_restart(transient, normal) ->
    false;
classify_restart(transient, shutdown) ->
    false;
classify_restart(transient, {shutdown, _}) ->
    false;
classify_restart(transient, _AbnormalReason) ->
    true.
`,
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Construct Worker Child Spec',
        erlangCall: 'child_spec_factory:worker_spec(cache_worker, {cache_srv, start_link, []}, transient, 5000)',
        expectedOutput: '#{id => cache_worker, modules => [cache_srv], restart => transient, shutdown => 5000, start => {cache_srv, start_link, []}, type => worker}',
        explanation: 'Builds an OTP-compliant worker child specification map with transient restart.'
      },
      {
        id: 'tc2',
        title: 'Construct Supervisor Child Spec with Infinity Shutdown',
        erlangCall: 'child_spec_factory:supervisor_spec(sub_sup, {session_sup, start_link, []})',
        expectedOutput: '#{id => sub_sup, modules => [session_sup], restart => permanent, shutdown => infinity, start => {session_sup, start_link, []}, type => supervisor}',
        explanation: 'Enforces shutdown => infinity and type => supervisor for nested supervision trees.'
      },
      {
        id: 'tc3',
        title: 'Restart Classification on Normal vs Abnormal Exit',
        erlangCall: 'begin R1 = child_spec_factory:classify_restart(transient, normal), R2 = child_spec_factory:classify_restart(transient, badarith), {R1, R2} end',
        expectedOutput: '{false, true}',
        explanation: 'Transient workers do not restart on clean exit (normal), but restart immediately on crash (badarith).'
      }
    ],
    astRules: {
      requiredConstructs: ['guards']
    },
    solutionExplanation: 'Implements child specification factories and the standard OTP restart decision matrix.'
  },

  // ── Lesson 8.3: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch08-l03',
    chapterNumber: 8,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Dynamic Worker Trees: simple_one_for_one & Dynamic Child Spawning',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In real-world chat servers, IoT brokers, and web APIs, processes cannot be statically declared in a fixed list at supervisor boot time. When 50,000 TCP clients connect, your server must dynamically spin up a dedicated connection handler process for each client.

If you spawned raw processes via \`spawn/3\`, a crash in one client process would not be isolated or cleaned up by OTP. 

To solve this, OTP provides **Dynamic Supervisors** using the **\`simple_one_for_one\`** strategy.

> **\`simple_one_for_one\` Dynamic Worker Pool:**
> - The supervisor holds a template child spec in \`init/1\`.
> - Thousands of worker instances are spawned dynamically on demand via \`supervisor:start_child(Sup, ExtraArgs)\`.
> - Crashes in individual ephemeral client sessions do not trigger cascading restarts across the pool.

## Deep Concept Breakdown & Under the Hood

### The \`simple_one_for_one\` Contract

1. In \`init/1\`, the supervisor returns **exactly one child specification** in the child spec list.
2. This single child spec is the **template** for all future dynamic children.
3. **No children are started at boot time!**
4. When a new client connects, you call:
   \`\`\`erlang
   supervisor:start_child(SupRef, [Arg1, Arg2])
   \`\`\`
5. The supervisor appends \`[Arg1, Arg2]\` to the template's \`{M, F, BaseArgs}\` tuple and invokes:
   \`\`\`erlang
   apply(M, F, BaseArgs ++ [Arg1, Arg2])
   \`\`\`

### Inspecting Dynamic Pools with \`supervisor:count_children/1\`

You can inspect the live count of active workers without traversing lists using:
\`\`\`erlang
supervisor:count_children(SupRef)
\`\`\`
Which returns:
\`\`\`erlang
#{
    specs => 1,          %% Exactly 1 template spec
    active => 42,        %% 42 active running child processes
    supervisors => 0,
    workers => 42
}
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Supervisor Calls (stdlib / supervisor)
supervisor:start_child(SupRef, ListOrChildSpec) -> startchild_ret()
  Types:
    SupRef = supervisor:sup_ref()
    ListOrChildSpec = [term()] | child_spec()

supervisor:count_children(SupRef) -> [CountTuple] | CountMap
  Types:
    CountMap = #{specs => integer(), active => integer(), supervisors => integer(), workers => integer()}
\`\`\`

## Assignment Specification

Implement module \`dynamic_session_sup\` with \`-behaviour(supervisor).\`:
1. \`start_link/0\`: Starts the supervisor registered locally as \`?MODULE\`.
2. \`init([])\`:
   - Returns \`{ok, {SupFlags, [ChildTemplate]}}\` with \`strategy => simple_one_for_one\`, \`intensity => 10\`, \`period => 5\`.
   - The child template has \`id => session_worker\`, \`start => {?MODULE, start_session_worker, []}\`, \`restart => temporary\`, \`shutdown => 2000\`, and \`type => worker\`.
3. \`start_session(SupRef, SessionId, UserId) -> {ok, ChildPid}\`:
   - Calls \`supervisor:start_child(SupRef, [SessionId, UserId])\`.
4. \`count_sessions(SupRef) -> integer()\`:
   - Returns the active count of dynamic workers from \`supervisor:count_children(SupRef)\`.
5. \`terminate_session(SupRef, ChildPid) -> ok\`:
   - Terminates the dynamic child via \`supervisor:terminate_child(SupRef, ChildPid)\`.
6. Helper worker callbacks exported: \`start_session_worker/2\`, \`init/1\`, \`handle_call/3\`, \`handle_cast/2\`, \`terminate/2\`.

## Rules & Verification Constraints
- Supervisor strategy must be \`simple_one_for_one\`.
- Dynamic children must be \`temporary\` so completed sessions cleanly unregister.
`,
    otpDocCards: [
      {
        functionName: 'start_child',
        module: 'supervisor',
        signature: 'supervisor:start_child(SupRef, Args) -> {ok, Child} | {error, Reason}',
        typesSpec: [
          'SupRef = sup_ref()',
          'Args = [term()] (appended to template MFA in simple_one_for_one)'
        ],
        description: 'Dynamically spawns a new child process under a supervisor. In simple_one_for_one mode, Args are appended to the template MFA.',
        complexityNote: 'O(1) dynamic process spawn linked to the supervisor.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/supervisor.html#start_child/2',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/supervisor.erl'
      },
      {
        functionName: 'count_children',
        module: 'supervisor',
        signature: 'supervisor:count_children(SupRef) -> #{specs := Int, active := Int, supervisors := Int, workers := Int}',
        typesSpec: [
          'SupRef = sup_ref()'
        ],
        description: 'Returns real-time telemetry counts of child specifications, active running processes, and worker/supervisor ratios.',
        complexityNote: 'O(N) where N is number of active children.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/supervisor.html#count_children/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/supervisor.erl'
      }
    ],
    starterCode: `-module(dynamic_session_sup).
-behaviour(supervisor).

-export([start_link/0, start_session/3, count_sessions/1, terminate_session/2]).
-export([init/1]).
-export([start_session_worker/2, handle_call/3, handle_cast/2, terminate/2]).

start_link() ->
    %% % TODO: Start supervisor with ?MODULE
    ok.

init([]) ->
    %% % TODO: Return simple_one_for_one flags and session_worker template
    ok.

start_session(SupRef, SessionId, UserId) ->
    %% % TODO: supervisor:start_child
    ok.

count_sessions(SupRef) ->
    %% % TODO: Return active count
    0.

terminate_session(SupRef, ChildPid) ->
    %% % TODO: supervisor:terminate_child
    ok.

start_session_worker(SessionId, UserId) ->
    gen_server:start_link(?MODULE, {worker, SessionId, UserId}, []).

init({worker, SessionId, UserId}) ->
    {ok, #{session_id => SessionId, user_id => UserId}}.

handle_call(get_info, _From, State) ->
    {reply, {ok, State}, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`,
    solutionCode: `-module(dynamic_session_sup).
-behaviour(supervisor).

-export([start_link/0, start_session/3, count_sessions/1, terminate_session/2]).
-export([init/1]).
-export([start_session_worker/2, handle_call/3, handle_cast/2, terminate/2]).

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
        start => {?MODULE, start_session_worker, []},
        restart => temporary,
        shutdown => 2000,
        type => worker,
        modules => [?MODULE]
    },
    {ok, {SupFlags, [ChildTemplate]}};

init({worker, SessionId, UserId}) ->
    {ok, #{session_id => SessionId, user_id => UserId}}.

start_session(SupRef, SessionId, UserId) ->
    supervisor:start_child(SupRef, [SessionId, UserId]).

count_sessions(SupRef) ->
    Counts = supervisor:count_children(SupRef),
    case is_map(Counts) of
        true -> maps:get(active, Counts, 0);
        false ->
            case lists:keyfind(active, 1, Counts) of
                {active, N} -> N;
                false -> 0
            end
    end.

terminate_session(SupRef, ChildPid) ->
    supervisor:terminate_child(SupRef, ChildPid).

start_session_worker(SessionId, UserId) ->
    gen_server:start_link(?MODULE, {worker, SessionId, UserId}, []).

handle_call(get_info, _From, State) ->
    {reply, {ok, State}, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`,
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Start Supervisor and Verify Initial Child Count',
        erlangCall: 'begin {ok, Sup} = dynamic_session_sup:start_link(), Count = dynamic_session_sup:count_sessions(Sup), exit(Sup, shutdown), Count end',
        expectedOutput: '0',
        explanation: 'Dynamic supervisor boots with 0 active workers until sessions are dynamically spawned.'
      },
      {
        id: 'tc2',
        title: 'Spawn Dynamic Children and Track Active Count',
        erlangCall: 'begin {ok, Sup} = dynamic_session_sup:start_link(), {ok, P1} = dynamic_session_sup:start_session(Sup, <<"s1">>, <<"u1">>), {ok, P2} = dynamic_session_sup:start_session(Sup, <<"s2">>, <<"u2">>), Count = dynamic_session_sup:count_sessions(Sup), exit(Sup, shutdown), {is_pid(P1), is_pid(P2), Count} end',
        expectedOutput: '{true, true, 2}',
        explanation: 'Spawns two dynamic temporary session workers and verifies active count increments to 2.'
      },
      {
        id: 'tc3',
        title: 'Terminate Dynamic Session and Verify Decrement',
        erlangCall: 'begin {ok, Sup} = dynamic_session_sup:start_link(), {ok, P1} = dynamic_session_sup:start_session(Sup, <<"s1">>, <<"u1">>), ok = dynamic_session_sup:terminate_session(Sup, P1), Count = dynamic_session_sup:count_sessions(Sup), exit(Sup, shutdown), Count end',
        expectedOutput: '0',
        explanation: 'Terminating dynamic child decrements active count cleanly.'
      }
    ],
    astRules: {
      requiredCalls: ['supervisor:start_link/3', 'supervisor:start_child/2', 'supervisor:count_children/1', 'supervisor:terminate_child/2']
    },
    solutionExplanation: 'Implements an OTP simple_one_for_one dynamic supervisor acting as a process factory for ephemeral session workers.'
  },

  // ── Lesson 8.4: Concept Exercise ──────────────────────────────────────────
  {
    id: 'ch08-l04',
    chapterNumber: 8,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'OTP Applications: .app.src, Application Behaviour & Runtime Configuration',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In Erlang, you never deploy loose modules or start supervisors by calling functions manually in the shell. Software is packaged into **OTP Applications**.

An Application is a self-contained component that packages:
1. **Application Specification (\`.app\` or \`.app.src\`)**: Declares application metadata, dependencies, exported modules, and registered process names.
2. **Application Behaviour (\`-behaviour(application).\`)**: The startup orchestrator that boots the top-level supervisor of the tree.
3. **Environment Configuration (\`application:get_env/3\`)**: Centralized, type-safe configuration that can be overridden at boot or runtime via \`sys.config\`.

When you run a production release (via \`rebar3 release\` or Docker), the BEAM VM starts the Application Controller, resolves dependency trees, boots every application in order, and monitors their root supervisors.

> **The OTP Application Lifecycle:**
> 1. BEAM node boots release and launches the central Application Controller.
> 2. Resolves dependencies and loads application resource metadata (\`.app\`).
> 3. Invokes the application callback \`commerce_app:start(normal, [])\`.
> 4. Starts the root supervisor \`commerce_sup:start_link()\` and its supervised worker children.

## Deep Concept Breakdown & Under the Hood

### The Application Callback Contract

An application callback module implements two mandatory functions:

\`\`\`erlang
-module(commerce_app).
-behaviour(application).

-export([start/2, stop/1]).

start(StartType, StartArgs) ->
    %% MUST start the top supervisor of the tree and return {ok, SupPid}
    case commerce_sup:start_link() of
        {ok, Pid} -> {ok, Pid};
        Other -> Other
    end.

stop(_State) ->
    ok.
\`\`\`

### Reading Configuration Safely with \`application:get_env/3\`

Hardcoding constants (ports, URLs, API keys) into Erlang modules is an anti-pattern. Instead, read from the application environment:

\`\`\`erlang
Port = application:get_env(commerce_app, listen_port, 8080)
\`\`\`

If \`listen_port\` is defined in the \`.app\` file or \`sys.config\`, that value is returned. Otherwise, the fallback default (\`8080\`) is used.

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Application Reference (kernel / application)
application:get_env(Application, Key, Default) -> Val
  Types:
    Application = atom()
    Key = atom()
    Default = Val = term()

application:set_env(Application, Key, Val) -> ok
\`\`\`

## Assignment Specification

Implement module \`commerce_app\` with \`-behaviour(application).\`:
1. \`start(StartType, StartArgs) -> {ok, Pid} | {error, Reason}\`:
   - Starts the application root supervisor and returns \`{ok, RootSupPid}\`.
2. \`stop(State) -> ok\`:
   - Cleans up state when the application shuts down.
3. \`get_app_config(Key, Default) -> Value\`:
   - Reads \`Key\` from the \`commerce_app\` environment using \`application:get_env/3\`.
4. \`set_app_config(Key, Value) -> ok\`:
   - Writes \`Key\` to the \`commerce_app\` environment using \`application:set_env/3\`.
5. Provide internal root supervisor callback (\`init/1\`) so the application can start a clean root supervisor.

## Rules & Verification Constraints
- Must implement \`-behaviour(application).\`.
- \`start/2\` must return \`{ok, Pid}\` where \`Pid\` is an active alive process.
`,
    otpDocCards: [
      {
        functionName: 'get_env',
        module: 'application',
        signature: 'application:get_env(Application, Key, Default) -> term()',
        typesSpec: [
          'Application = atom()',
          'Key = atom()',
          'Default = term()'
        ],
        description: 'Retrieves configuration values from the application environment, falling back to Default if undefined.',
        complexityNote: 'O(1) ETS-backed configuration lookup.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/application.html#get_env/3',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/application.erl'
      },
      {
        functionName: 'set_env',
        module: 'application',
        signature: 'application:set_env(Application, Key, Value) -> ok',
        typesSpec: [
          'Application = atom()',
          'Key = atom()',
          'Value = term()'
        ],
        description: 'Dynamically updates an environment configuration parameter for an application.',
        complexityNote: 'O(1) environment table update.',
        officialUrl: 'https://www.erlang.org/doc/apps/kernel/application.html#set_env/3',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/kernel/src/application.erl'
      }
    ],
    starterCode: `-module(commerce_app).
-behaviour(application).

-export([start/2, stop/1, get_app_config/2, set_app_config/2]).
-export([init/1]).

start(_StartType, _StartArgs) ->
    %% % TODO: Start root supervisor and return {ok, SupPid}
    ok.

stop(_State) ->
    ok.

get_app_config(Key, Default) ->
    %% % TODO: Read from application:get_env/3
    Default.

set_app_config(Key, Value) ->
    %% % TODO: Write using application:set_env/3
    ok.

init([]) ->
    SupFlags = #{strategy => one_for_one, intensity => 3, period => 5},
    {ok, {SupFlags, []}}.
`,
    solutionCode: `-module(commerce_app).
-behaviour(application).

-export([start/2, stop/1, get_app_config/2, set_app_config/2]).
-export([init/1]).

start(_StartType, _StartArgs) ->
    supervisor:start_link({local, commerce_root_sup}, ?MODULE, []).

stop(_State) ->
    case whereis(commerce_root_sup) of
        undefined -> ok;
        Pid -> exit(Pid, shutdown)
    end,
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
    {ok, {SupFlags, []}}.
`,
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Start Application Root Supervisor',
        erlangCall: 'begin {ok, Sup} = commerce_app:start(normal, []), IsAlive = is_process_alive(Sup), commerce_app:stop([]), IsAlive end',
        expectedOutput: 'true',
        explanation: 'Verifies start/2 boots the root supervisor and returns an active Pid.'
      },
      {
        id: 'tc2',
        title: 'Configuration Default Fallback',
        erlangCall: 'commerce_app:get_app_config(database_timeout, 5000)',
        expectedOutput: '5000',
        explanation: 'Retrieves fallback default when configuration key is not set.'
      },
      {
        id: 'tc3',
        title: 'Set and Read Runtime Configuration',
        erlangCall: 'begin ok = commerce_app:set_app_config(currency, <<"USD">>), commerce_app:get_app_config(currency, <<"EUR">>) end',
        expectedOutput: '<<"USD">>',
        explanation: 'Dynamically updates environment parameter and verifies override.'
      }
    ],
    astRules: {
      requiredCalls: ['application:get_env/3', 'application:set_env/3', 'supervisor:start_link/3']
    },
    solutionExplanation: 'Implements an OTP Application behaviour with dynamic environment configuration and a root supervisor.'
  },

  // ── Lesson 8.5: Problem Set ───────────────────────────────────────────────
  {
    id: 'ch08-l05',
    chapterNumber: 8,
    lessonNumber: 5,
    lessonType: 'problem_set',
    title: 'Assignment: Fault-Isolated E-Commerce Checkout Supervision Tree (checkout_sup.erl)',
    visualScene: 'supervision_rest_for_one_ets_heir',
    mentalModelCheck: {
      question: 'In checkout_sup with children [db_pool, pricing_cache, order_gateway] under rest_for_one, why does order_gateway crashing NOT restart pricing_cache?',
      codeSnippet: `init([]) ->\n    SupFlags = #{strategy => rest_for_one, intensity => 3, period => 5},\n    Children = [db_pool_spec(), pricing_cache_spec(), order_gateway_spec()],\n    {ok, {SupFlags, Children}}.`,
      options: [
        {
          id: 'A',
          label: 'Under rest_for_one, only processes started AFTER the crashed child in the spec list are restarted; upstream dependencies started before it remain running.',
          isCorrect: true,
          explanation: 'Correct! order_gateway is the last child in the spec list. Because no child was started after it, only order_gateway is restarted, keeping database and pricing cache alive with zero downtime.',
        },
        {
          id: 'B',
          label: 'The supervisor converts order_gateway crashes into ignore returns.',
          isCorrect: false,
          explanation: 'Supervisors restart crashed workers according to strategy; they do not convert crashes into ignore.',
        },
        {
          id: 'C',
          label: 'order_gateway is marked as temporary while cache is permanent.',
          isCorrect: false,
          explanation: 'Both can be permanent; rest_for_one restart scoping is governed by child spec ordering.',
        },
      ],
    },
    difficulty: 'Advanced',
    conceptMarkdown: `## Why This Matters in Production

In a real enterprise payment and checkout pipeline, tasks have strict dependency chains:
1. **\`db_pool_worker\` (Child 1)**: Holds raw database sockets. It takes hundreds of milliseconds to connect and authenticate.
2. **\`pricing_cache_worker\` (Child 2)**: Loads current currency exchange rates and SKU discounts from the database. It depends strictly on \`db_pool_worker\`.
3. **\`order_gateway_worker\` (Child 3)**: Exposes public checkout endpoints. It depends on both \`pricing_cache_worker\` and \`db_pool_worker\`.

What happens when an unhandled edge-case payload crashes \`order_gateway_worker\`?
- If you used \`one_for_all\`, the database pool and pricing cache would also be restarted, tearing down live DB connections and causing a site-wide outage!
- If you used \`one_for_one\`, and \`pricing_cache_worker\` crashed, \`order_gateway_worker\` would stay alive with stale, disconnected cache handles!

The mathematical solution is OTP's **\`rest_for_one\`** restart strategy.

> **The \`rest_for_one\` Dependency Cascade:**
> - **Order:** \`[Child 1: db_pool]\` -> \`[Child 2: pricing_cache]\` -> \`[Child 3: order_gateway]\`
> - **Child 3 crashes:** Only Child 3 restarts. Upstream DB and Cache keep running with zero interruption.
> - **Child 2 crashes:** Child 2 and Child 3 (started after it) restart in order. Upstream DB is preserved.
> - **Child 1 crashes:** All 3 children restart in sequential order (\`1\` -> \`2\` -> \`3\`).

## Deep Concept Breakdown & Under the Hood

### Child Ordering in \`init/1\`

Erlang supervisors start children **strictly in the order they appear in the child spec list**:
\`\`\`erlang
{ok, {SupFlags, [Spec1, Spec2, Spec3]}}
\`\`\`
- \`Spec1\` starts first.
- \`Spec2\` starts second.
- \`Spec3\` starts third.

During shutdown or cascading restart, the supervisor terminates them in **reverse order**:
- \`Spec3\` terminated first.
- \`Spec2\` terminated second.
- \`Spec1\` terminated last.

This guarantees that downstream dependencies are always stopped before the upstream services they depend on!

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Supervisor Calls (stdlib / supervisor)
supervisor:which_children(SupRef) -> [{Id, Child, Type, Modules}]
  Types:
    Id = term()
    Child = pid() | undefined | restarting
    Type = worker | supervisor
\`\`\`

## Assignment Specification

Implement module \`checkout_sup\` with \`-behaviour(supervisor).\`:
1. **Module & Exports**:
   \`\`\`erlang
   -module(checkout_sup).
   -behaviour(supervisor).
   -export([start_link/0, get_pipeline_pids/0, init/1]).
   \`\`\`
2. **Supervisor Configuration**:
   - Registered name: \`checkout_sup\`.
   - Strategy: \`rest_for_one\`.
   - Intensity: \`5\`.
   - Period: \`10\`.
3. **Child Specifications**:
   Declare three permanent worker specs in exact order:
   - Child 1: \`id => db_pool\`, \`start => {?MODULE, start_db_worker, []}\`, \`shutdown => 5000\`.
   - Child 2: \`id => pricing_cache\`, \`start => {?MODULE, start_cache_worker, []}\`, \`shutdown => 5000\`.
   - Child 3: \`id => order_gateway\`, \`start => {?MODULE, start_gateway_worker, []}\`, \`shutdown => 5000\`.
4. **\`get_pipeline_pids/0 -> {ok, #{db_pid := pid(), cache_pid := pid(), gateway_pid := pid()}}\`**:
   - Inspects the live supervisor and returns the current PIDs of all three workers.
5. **Companion Workers**:
   The starter code provides pre-written companion worker implementations (\`start_db_worker/0\`, \`start_cache_worker/0\`, \`start_gateway_worker/0\`) so you can focus entirely on the supervisor specification and PID extraction!

## Rules & Verification Constraints
- Verified by automated Chaos Testing:
  1. Starts \`checkout_sup\`, records \`{DbPid1, CachePid1, GatewayPid1}\`.
  2. Kills \`GatewayPid1\` with \`exit(GatewayPid1, kill)\`: asserts DB and Cache PIDs do not change, while Gateway PID changes!
  3. Kills \`CachePid2\` with \`exit(CachePid2, kill)\`: asserts DB PID does not change, while BOTH Cache and Gateway PIDs change!
  4. Kills \`DbPid3\` with \`exit(DbPid3, kill)\`: asserts all three PIDs change!
`,
    otpDocCards: [
      {
        functionName: 'which_children',
        module: 'supervisor',
        signature: 'supervisor:which_children(SupRef) -> [{Id, Child, Type, Modules}]',
        typesSpec: [
          'SupRef = sup_ref()',
          'Id = term()',
          'Child = pid() | undefined | restarting'
        ],
        description: 'Returns a list of all child specifications and their currently running PIDs managed by the supervisor.',
        complexityNote: 'O(N) where N is child count.',
        officialUrl: 'https://www.erlang.org/doc/apps/stdlib/supervisor.html#which_children/1',
        githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/supervisor.erl'
      }
    ],
    starterCode: `-module(checkout_sup).
-behaviour(supervisor).

-export([start_link/0, get_pipeline_pids/0, init/1]).
-export([start_db_worker/0, start_cache_worker/0, start_gateway_worker/0]).
-export([worker_init/1, handle_call/3, handle_cast/2, terminate/2]).

start_link() ->
    %% % TODO: Start supervisor registered as ?MODULE
    ok.

init([]) ->
    %% % TODO: Return rest_for_one flags and the 3 dependent child specs
    ok.

get_pipeline_pids() ->
    %% % TODO: Return {ok, #{db_pid => DbPid, cache_pid => CachePid, gateway_pid => GatewayPid}}
    {ok, #{}}.

%% Companion Worker Implementations (Provided)
start_db_worker() ->
    gen_server:start_link({local, db_pool_worker}, ?MODULE, db, []).

start_cache_worker() ->
    gen_server:start_link({local, pricing_cache_worker}, ?MODULE, cache, []).

start_gateway_worker() ->
    gen_server:start_link({local, order_gateway_worker}, ?MODULE, gateway, []).

init(Role) when Role =:= db; Role =:= cache; Role =:= gateway ->
    {ok, #{role => Role}};
init({worker, Role}) ->
    {ok, #{role => Role}};

worker_init(Role) ->
    {ok, #{role => Role}}.

handle_call(get_role, _From, #{role := Role} = State) ->
    {reply, Role, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`,
    solutionCode: `-module(checkout_sup).
-behaviour(supervisor).

-export([start_link/0, get_pipeline_pids/0, init/1]).
-export([start_db_worker/0, start_cache_worker/0, start_gateway_worker/0]).
-export([worker_init/1, handle_call/3, handle_cast/2, terminate/2]).

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
            start => {?MODULE, start_db_worker, []},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [?MODULE]
        },
        #{
            id => pricing_cache,
            start => {?MODULE, start_cache_worker, []},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [?MODULE]
        },
        #{
            id => order_gateway,
            start => {?MODULE, start_gateway_worker, []},
            restart => permanent,
            shutdown => 5000,
            type => worker,
            modules => [?MODULE]
        }
    ],
    {ok, {SupFlags, ChildSpecs}};
init(Role) when Role =:= db; Role =:= cache; Role =:= gateway ->
    {ok, #{role => Role}};
init({worker, Role}) ->
    {ok, #{role => Role}}.

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
    {ok, #{
        db_pid => DbPid,
        cache_pid => CachePid,
        gateway_pid => GatewayPid
    }}.

start_db_worker() ->
    gen_server:start_link({local, db_pool_worker}, ?MODULE, db, []).

start_cache_worker() ->
    gen_server:start_link({local, pricing_cache_worker}, ?MODULE, cache, []).

start_gateway_worker() ->
    gen_server:start_link({local, order_gateway_worker}, ?MODULE, gateway, []).

worker_init(Role) ->
    {ok, #{role => Role}}.

handle_call(get_role, _From, #{role := Role} = State) ->
    {reply, Role, State};
handle_call(_Req, _From, State) ->
    {reply, ok, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
`,
    visibleTestCases: [
      {
        id: 'tc1',
        title: 'Start Supervisor and Verify All 3 Worker PIDs',
        erlangCall: 'begin {ok, Sup} = checkout_sup:start_link(), {ok, #{db_pid := Db, cache_pid := Cache, gateway_pid := Gw}} = checkout_sup:get_pipeline_pids(), exit(Sup, shutdown), is_pid(Db) andalso is_pid(Cache) andalso is_pid(Gw) end',
        expectedOutput: 'true',
        explanation: 'Boots checkout_sup and verifies that all three pipeline workers are started and alive.'
      },
      {
        id: 'tc2',
        title: 'Verify Independent Restart of Gateway Worker (Child 3)',
        erlangCall: 'begin {ok, Sup} = checkout_sup:start_link(), {ok, #{db_pid := Db1, cache_pid := Cache1, gateway_pid := Gw1}} = checkout_sup:get_pipeline_pids(), exit(Gw1, kill), timer:sleep(30), {ok, #{db_pid := Db2, cache_pid := Cache2, gateway_pid := Gw2}} = checkout_sup:get_pipeline_pids(), exit(Sup, shutdown), {Db1 =:= Db2, Cache1 =:= Cache2, Gw1 =/= Gw2} end',
        expectedOutput: '{true, true, true}',
        explanation: 'Crashing the gateway worker only restarts the gateway worker; DB and Cache PIDs remain unchanged.'
      }
    ],
    astRules: {
      requiredCalls: ['supervisor:start_link/3', 'supervisor:which_children/1']
    },
    solutionExplanation: 'Implements a fault-tolerant rest_for_one supervision pipeline ensuring dependent workers are safely restarted in order.'
  }
];

import { LessonContent } from '../../types/workspace';

export const CHAPTER_5_LESSONS: LessonContent[] = [
  // ── Lesson 5.1: Guided Demo ───────────────────────────────────────────────
  {
    id: 'ch05-l01',
    chapterNumber: 5,
    lessonNumber: 1,
    lessonType: 'guided_demo',
    title: 'Lightweight BEAM Processes (~2.5 KB), Preemptive Reductions & Process Introspection BIFs',
    difficulty: 'Intermediate',
    xpReward: 50,
    visualScene: 'mailbox_selective_receive',
    conceptMarkdown: `## Why This Matters in Production

In traditional backend languages like Java, C++, Python, or Go, concurrency is built on operating system threads or cooperative coroutines sharing a single global address space. An OS thread allocates between **1 MB and 8 MB of stack memory**, incurs kernel context-switch penalties of 1,000 to 2,000 CPU cycles, and forces all threads to share one global heap. When two threads mutate shared memory simultaneously, you suffer from **Race Conditions, Lost Updates, and Deadlocks**. Preventing these race conditions requires complex locking schemes (mutexes, semaphores, read-write locks), which degrade throughput and introduce latency spikes when the global garbage collector initiates "Stop-the-World" pauses.

The **BEAM Virtual Machine** was designed for telecom switches requiring 99.9999999% uptime ("nine nines"). It adopts the **Actor Model**, where processes share **absolutely zero memory**. A BEAM process is **not** an OS thread; it is an ultralightweight user-space memory container. A freshly spawned BEAM process starts with **only 309 words (~2.5 KB on 64-bit systems)** of RAM, encompassing its private stack, private heap, mailbox queue descriptor, and process control block. Because processes are isolated, each process executes garbage collection on its own private heap without stopping or even pausing any other process on the machine.

## Deep Concept Breakdown & Under the Hood

### 1. Isolated Heaps vs. Shared-Memory GC
In shared-memory platforms, a background garbage collector must periodically freeze the entire application to trace object references across all threads. On the BEAM, every process owns a private heap. When process \`<0.142.0>\` accumulates temporary terms, ERTS performs generational garbage collection solely on \`<0.142.0>\`'s heap. If a process short-circuits or terminates, the runtime reclaims its entire memory block in a single $O(1)$ deallocation—bypassing GC entirely!

### 2. Preemptive Reduction Scheduling (The 4,000-Reduction Rule)
In cooperative systems (like Node.js event loops, Python asyncio, or early Go runtimes), an accidental long-running computation or infinite loop (\`while(true)\`) monopolizes the thread, freezing network sockets, health checks, and peer traffic.

The BEAM prevents compute starvation through **Preemptive Reduction Counters**:
1. The BEAM launches **one OS thread per physical CPU core**, called a **BEAM Scheduler** (Scheduler 1 through Scheduler $N$).
2. Each scheduler maintains a private run queue of runnable processes.
3. When a scheduler picks a process, it gives that process a budget of **4,000 reductions** (roughly 4,000 function calls or BIF evaluations).
4. Every function call, loop iteration, or BIF call decrements the reduction counter by 1.
5. The instant the reduction counter reaches zero, the scheduler **preempts** the process, pushes it to the back of the run queue, and immediately context-switches to the next process.
6. A CPU-bound mathematical loop or rogue user payload can **never starve** other chat rooms, TCP sockets, or telemetry aggregators!

### 3. Real-Time Process Introspection BIFs
The BEAM provides built-in functions (BIFs) to inspect runtime internals without third-party profilers:
- \`self() -> pid()\`: Returns the current process's unique identifier.
- \`is_process_alive(Pid) -> boolean()\`: Confirms whether \`Pid\` is actively running.
- \`processes() -> [pid()]\`: Returns a snapshot list of every active process in the VM.
- \`erlang:system_info(process_count) -> integer()\`: Returns the total live process count.
- \`erlang:process_info(Pid, ItemList) -> [{Item, Value}] | undefined\`: Queries internal VM metrics for \`Pid\`, including \`memory\` (total bytes allocated), \`heap_size\` (words), \`reductions\` (work performed), and \`message_queue_len\` (pending mailbox items).

> [!warning] Production Concurrency Trap: Millions of Processes Still Require Memory Discipline
> While spawning 100,000 BEAM processes consumes only ~250 MB of base RAM (at ~2.5 KB per process), processes that retain large terms in their state or allow unhandled messages to accumulate in their mailboxes will quickly grow to dozens of megabytes each. Always monitor process heaps using \`erlang:process_info(Pid, memory)\` and implement strict mailbox hygiene.

## Parallel Worked Example

The following helper module demonstrates how an operations monitor queries real-time BEAM scheduler and process telemetry:

\`\`\`erlang
-module(telemetry_probe).
-export([probe_system/0, probe_worker/1]).

%% Gathers global node telemetry
probe_system() ->
    Schedulers = erlang:system_info(schedulers_online),
    ProcCount = erlang:system_info(process_count),
    ProcLimit = erlang:system_info(process_limit),
    #{
        schedulers_online => Schedulers,
        active_processes => ProcCount,
        max_process_limit => ProcLimit
    }.

%% Gathers isolated telemetry for a single worker PID
probe_worker(Pid) ->
    case is_process_alive(Pid) of
        true ->
            Items = [memory, heap_size, reductions, message_queue_len],
            case erlang:process_info(Pid, Items) of
                [{memory, Bytes}, {heap_size, HeapWords}, {reductions, Reds}, {message_queue_len, QLen}] ->
                    {ok, #{
                        bytes => Bytes,
                        heap_words => HeapWords,
                        reductions => Reds,
                        mailbox_len => QLen
                    }};
                undefined ->
                    {error, process_exited}
            end;
        false ->
            {error, dead_pid}
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (erts / erlang)
erlang:process_info(Pid, ItemList) -> InfoList | undefined
  Types:
    Pid = pid()
    ItemList = [memory | heap_size | reductions | message_queue_len | status]
    InfoList = [{Item, Value}]

erlang:system_info(Item) -> Value
  Types:
    Item = process_count | process_limit | schedulers_online | wordsize
\`\`\`

## Assignment Specification

This is a **Guided Interactive Demo**. Explore the concurrency and telemetry capabilities of the BEAM VM in \`src/process_bench.erl\`.

### Functions Provided

#### \`run/0\`
- **Input**: None (\`()\`).
- **Behavior**: Executes the benchmark with 2,000 processes and prints formatted benchmark statistics (total spawn duration, per-process latency, and average memory footprint) to standard output.
- **Output**: Returns \`ok\`.

#### \`run_bench/1\`
- **Input**:
  - \`N\`: positive integer process count (e.g. \`2000\`)
- **Behavior**: Measures the spawn time of \`N\` concurrent processes, samples the memory footprint of the first 50 processes using \`inspect_process/1\`, and sends a \`stop\` message to cleanly terminate all spawned workers.
- **Output**: Returns a telemetry map \`#{spawned => N, avg_memory_bytes => AvgMem, elapsed_us => ElapsedUs}\`.
- **Examples**:
  - \`run_bench(2000)\` $\\rightarrow$ \`#{spawned => 2000, avg_memory_bytes => 2688, elapsed_us => 4250}\`

#### \`inspect_process/1\`
- **Input**:
  - \`Pid\`: a live process PID
- **Behavior**: Queries the internal VM process control block via \`erlang:process_info(Pid, memory)\` to retrieve the process's allocated memory footprint in bytes.
- **Output**: Integer memory in bytes (or \`2688\` if the process already exited).
- **Examples**:
  - \`inspect_process(Pid)\` $\\rightarrow$ \`2688\`

### Instructions

1. Inspect the implementation of \`src/process_bench.erl\`.
2. Click **\`▷ Run\`** to execute \`process_bench:run/0\` and observe high-speed process spawning in the output drawer.
3. Click **\`▶ Submit\`** to run the automated OTP 29 benchmark and memory telemetry verification suite.

## Rules & Verification Constraints

- Spawns \`N\` concurrent processes and measures real-time allocation.
- Average process memory footprint must remain under **4,096 bytes**.
- All spawned processes must be cleanly stopped with \`stop\` messages.`,
    mentalModelCheck: {
      question: 'Why can an accidental infinite loop like `loop() -> loop().` in one BEAM process never freeze the rest of an Erlang web server or XMPP gateway?',
      codeSnippet: `%% A rogue compute-heavy loop running on CPU Core 1:
cpu_intensive_loop() ->
    cpu_intensive_loop().`,
      options: [
        {
          id: 'A',
          label: 'The BEAM Scheduler preemptively halts the process after 4,000 reductions (~function calls), placing it at the end of the run queue to let other processes execute.',
          isCorrect: true,
          explanation: 'Correct! The BEAM employs preemptive reduction scheduling (4,000 reductions per time slice). When the reduction counter reaches zero, the scheduler preempts the process and runs other processes, preventing compute starvation.',
        },
        {
          id: 'B',
          label: "Erlang's compiler detects infinite recursion at compile time and inserts OS sleep calls.",
          isCorrect: false,
          explanation: 'The Erlang compiler does not prevent infinite loops; recursion is the primary mechanism for long-running actor loops.',
        },
        {
          id: 'C',
          label: 'The host Linux kernel terminates any Erlang process running for longer than 10 milliseconds.',
          isCorrect: false,
          explanation: 'BEAM processes are user-space micro-threads completely decoupled from OS kernel thread management.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'process_info',
        module: 'erlang',
        signature: 'erlang:process_info(Pid, ItemList) -> InfoList | undefined',
        typesSpec: ['Pid = pid()', 'ItemList = [atom()] | atom()', 'InfoList = [{atom(), term()}]'],
        description: 'Returns real-time telemetry regarding process heap size, memory, mailbox length, reductions, and lifecycle status.',
        complexityNote: 'O(1) direct memory lookup on the internal process control block.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#process_info/2',
      },
      {
        functionName: 'system_info',
        module: 'erlang',
        signature: 'erlang:system_info(Item) -> term()',
        typesSpec: ['Item = atom()'],
        description: 'Returns runtime information about the BEAM emulator, including scheduler count, process count, and memory allocators.',
        complexityNote: 'O(1) emulator runtime state read.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#system_info/1',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch05-01-1',
        title: 'Benchmark 2,000 BEAM Processes',
        erlangCall: 'begin #{spawned := S, avg_memory_bytes := M} = process_bench:run_bench(2000), {S, M < 4096} end',
        expectedOutput: '{2000, true}',
        explanation: 'Verifies that 2,000 processes spawn in microseconds with an average memory footprint strictly under 4,096 bytes.',
      },
    ],
    astRules: {},
    solutionExplanation: 'Demonstrates ultralightweight BEAM process creation (~2.5 KB initial heap), preemptive reductions, and introspection via erlang:process_info/2.',
    files: [
      {
        name: 'process_bench.erl',
        path: 'src/process_bench.erl',
        content: `-module(process_bench).
-export([run/0, run_bench/1, inspect_process/1]).

%% @doc Execute default 2,000 process benchmark and print findings.
run() ->
    Summary = run_bench(2000),
    #{spawned := N, avg_memory_bytes := AvgMem, elapsed_us := ElapsedUs} = Summary,
    io:format("==================================================~n"),
    io:format("BEAM Process Benchmark: ~p processes~n", [N]),
    io:format("Total Spawn Time: ~p us (~.2f us per process)~n", [ElapsedUs, ElapsedUs / N]),
    io:format("Average Memory per Process: ~p bytes (~.2f KB)~n", [AvgMem, AvgMem / 1024]),
    io:format("==================================================~n"),
    ok.

%% @doc Spawn N worker processes and measure latency and average memory footprint.
run_bench(N) when is_integer(N), N > 0 ->
    StartUs = erlang:monotonic_time(microsecond),
    Pids = [spawn(fun() -> receive stop -> ok end end) || _ <- lists:seq(1, N)],
    EndUs = erlang:monotonic_time(microsecond),
    ElapsedUs = EndUs - StartUs,

    SamplePids = lists:sublist(Pids, 50),
    TotalMem = lists:sum([inspect_process(P) || P <- SamplePids]),
    AvgMem = TotalMem div length(SamplePids),

    [P ! stop || P <- Pids],

    #{
        spawned => N,
        avg_memory_bytes => AvgMem,
        elapsed_us => ElapsedUs
    }.

%% @doc Return the total memory footprint in bytes for a given process PID.
inspect_process(Pid) ->
    case erlang:process_info(Pid, memory) of
        {memory, Bytes} -> Bytes;
        undefined -> 2688
    end.
`,
      },
    ],
    solutionFiles: {
      'src/process_bench.erl': `-module(process_bench).
-export([run/0, run_bench/1, inspect_process/1]).

%% @doc Execute default 2,000 process benchmark and print findings.
run() ->
    Summary = run_bench(2000),
    #{spawned := N, avg_memory_bytes := AvgMem, elapsed_us := ElapsedUs} = Summary,
    io:format("==================================================~n"),
    io:format("BEAM Process Benchmark: ~p processes~n", [N]),
    io:format("Total Spawn Time: ~p us (~.2f us per process)~n", [ElapsedUs, ElapsedUs / N]),
    io:format("Average Memory per Process: ~p bytes (~.2f KB)~n", [AvgMem, AvgMem / 1024]),
    io:format("==================================================~n"),
    ok.

%% @doc Spawn N worker processes and measure latency and average memory footprint.
run_bench(N) when is_integer(N), N > 0 ->
    StartUs = erlang:monotonic_time(microsecond),
    Pids = [spawn(fun() -> receive stop -> ok end end) || _ <- lists:seq(1, N)],
    EndUs = erlang:monotonic_time(microsecond),
    ElapsedUs = EndUs - StartUs,

    SamplePids = lists:sublist(Pids, 50),
    TotalMem = lists:sum([inspect_process(P) || P <- SamplePids]),
    AvgMem = TotalMem div length(SamplePids),

    [P ! stop || P <- Pids],

    #{
        spawned => N,
        avg_memory_bytes => AvgMem,
        elapsed_us => ElapsedUs
    }.

%% @doc Return the total memory footprint in bytes for a given process PID.
inspect_process(Pid) ->
    case erlang:process_info(Pid, memory) of
        {memory, Bytes} -> Bytes;
        undefined -> 2688
    end.
`,
    },
    starterCode: `-module(process_bench).
-export([run/0, run_bench/1, inspect_process/1]).

%% @doc Execute default 2,000 process benchmark and print findings.
run() ->
    Summary = run_bench(2000),
    #{spawned := N, avg_memory_bytes := AvgMem, elapsed_us := ElapsedUs} = Summary,
    io:format("==================================================~n"),
    io:format("BEAM Process Benchmark: ~p processes~n", [N]),
    io:format("Total Spawn Time: ~p us (~.2f us per process)~n", [ElapsedUs, ElapsedUs / N]),
    io:format("Average Memory per Process: ~p bytes (~.2f KB)~n", [AvgMem, AvgMem / 1024]),
    io:format("==================================================~n"),
    ok.

%% @doc Spawn N worker processes and measure latency and average memory footprint.
run_bench(N) when is_integer(N), N > 0 ->
    StartUs = erlang:monotonic_time(microsecond),
    Pids = [spawn(fun() -> receive stop -> ok end end) || _ <- lists:seq(1, N)],
    EndUs = erlang:monotonic_time(microsecond),
    ElapsedUs = EndUs - StartUs,

    SamplePids = lists:sublist(Pids, 50),
    TotalMem = lists:sum([inspect_process(P) || P <- SamplePids]),
    AvgMem = TotalMem div length(SamplePids),

    [P ! stop || P <- Pids],

    #{
        spawned => N,
        avg_memory_bytes => AvgMem,
        elapsed_us => ElapsedUs
    }.

%% @doc Return the total memory footprint in bytes for a given process PID.
inspect_process(Pid) ->
    case erlang:process_info(Pid, memory) of
        {memory, Bytes} -> Bytes;
        undefined -> 2688
    end.
`,
    solutionCode: `-module(process_bench).
-export([run/0, run_bench/1, inspect_process/1]).

%% @doc Execute default 2,000 process benchmark and print findings.
run() ->
    Summary = run_bench(2000),
    #{spawned := N, avg_memory_bytes := AvgMem, elapsed_us := ElapsedUs} = Summary,
    io:format("==================================================~n"),
    io:format("BEAM Process Benchmark: ~p processes~n", [N]),
    io:format("Total Spawn Time: ~p us (~.2f us per process)~n", [ElapsedUs, ElapsedUs / N]),
    io:format("Average Memory per Process: ~p bytes (~.2f KB)~n", [AvgMem, AvgMem / 1024]),
    io:format("==================================================~n"),
    ok.

%% @doc Spawn N worker processes and measure latency and average memory footprint.
run_bench(N) when is_integer(N), N > 0 ->
    StartUs = erlang:monotonic_time(microsecond),
    Pids = [spawn(fun() -> receive stop -> ok end end) || _ <- lists:seq(1, N)],
    EndUs = erlang:monotonic_time(microsecond),
    ElapsedUs = EndUs - StartUs,

    SamplePids = lists:sublist(Pids, 50),
    TotalMem = lists:sum([inspect_process(P) || P <- SamplePids]),
    AvgMem = TotalMem div length(SamplePids),

    [P ! stop || P <- Pids],

    #{
        spawned => N,
        avg_memory_bytes => AvgMem,
        elapsed_us => ElapsedUs
    }.

%% @doc Return the total memory footprint in bytes for a given process PID.
inspect_process(Pid) ->
    case erlang:process_info(Pid, memory) of
        {memory, Bytes} -> Bytes;
        undefined -> 2688
    end.
`,
  },

  // ── Lesson 5.2: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch05-l02',
    chapterNumber: 5,
    lessonNumber: 2,
    lessonType: 'concept_exercise',
    title: 'Spawning (spawn/1 vs. spawn/3), PIDs (self/0) & Asynchronous Message Passing (!)',
    difficulty: 'Intermediate',
    xpReward: 100,
    visualScene: 'mailbox_selective_receive',
    conceptMarkdown: `## Why This Matters in Production

In microservice architectures and high-throughput network backends, services must communicate continuously without causing cascading stalls. In traditional languages, when Thread A invokes an RPC or sends data over an in-memory queue to Thread B, Thread A often blocks synchronously, idling its CPU core until Thread B completes. If Thread B slows down under load, Thread A's connection pool saturates, triggering cascading timeouts across the entire platform.

In Erlang, process communication is **strictly asynchronous** using the send operator: **\`Pid ! Message\`**. The sender **never blocks** and **never waits** for the recipient to read the message. The BEAM runtime copies \`Message\` into the recipient's private heap, appends a pointer into the recipient's mailbox, and immediately returns control to the sender in under **0.1 microseconds**!

## Deep Concept Breakdown & Under the Hood

### 1. How Message Passing Works Under the Hood
When Process A evaluates \`Pid ! Message\`:
1. The BEAM locates the memory descriptor for \`Pid\`.
2. The runtime performs an off-heap allocation or directly allocates space on \`Pid\`'s private heap and **deep-copies** \`Message\` terms into \`Pid\`'s memory space (unless it is a reference-counted binary > 64 bytes, where only a reference pointer is copied, as taught in Chapter 4).
3. The runtime appends a message envelope pointer to the tail of \`Pid\`'s mailbox queue.
4. If \`Pid\` is suspended waiting in a \`receive\` block, the scheduler marks \`Pid\` as runnable and enqueues it on its core's run queue.
5. The expression \`Pid ! Message\` evaluates to \`Message\` itself! This allows chaining: \`P1 ! P2 ! {broadcast, Alert}\`.

### 2. Identifying Callers with \`self/0\`
An actor has no built-in way of knowing who sent a message. Unlike TCP sockets with source IP headers, raw messages do not carry implicit return addresses. If a caller expects a response, it **must explicitly include its own PID** (\`self()\`) inside a tagged tuple:
\`\`\`erlang
%% Caller sends request with its own PID for routing:
WorkerPid ! {query_balance, self(), <<"acct_8492">>}.

%% Worker pattern-matches CallerPid and replies:
receive
    {query_balance, CallerPid, AccountId} ->
        CallerPid ! {balance_result, self(), AccountId, 250000}
end.
\`\`\`

### 3. Crucial Architectural Distinction: \`spawn/1\` vs. \`spawn/3\`
Erlang provides two ways to spawn processes:
- **\`spawn(Fun)\`**: Spawns an anonymous closure (\`fun() -> ... end\`). The closure is tightly bound to the current module version loaded in memory.
- **\`spawn(Module, Function, Args)\` (MFA Spawn)**: Uses module, function atom, and arguments list (\`spawn(?MODULE, responder_loop, [])\`).

> [!warning] Production Concurrency Trap: Closure Spawns Break Hot Code Reloading
> If you spawn a long-running process using \`spawn(fun() -> loop() end)\`, that process remains permanently tied to the exact bytecode version active when it was created. When you deploy a new version of the code at runtime, Erlang retains up to two versions of a module ("current" and "old"). If a third version is loaded while the closure process is still running, the runtime terminates the process!
> 
> In contrast, processes spawned via \`spawn(?MODULE, loop, [])\` that make fully qualified tail calls (\`?MODULE:loop()\`) seamlessly transition to the newest compiled bytecode without dropping existing state!

## Parallel Worked Example

Consider a distributed telemetry ingestion hub that accepts metric events from workers and delivers periodic synchronization pulses:

\`\`\`erlang
-module(sensor_gateway).
-export([start_hub/0, push_metric/3, fanout_telemetry/2, gateway_loop/0]).

%% Spawns the telemetry gateway actor
start_hub() ->
    spawn(?MODULE, gateway_loop, []).

%% Client API: sends a telemetry metric and waits for confirmation
push_metric(HubPid, MetricName, Value) ->
    HubPid ! {record_metric, self(), MetricName, Value},
    receive
        {metric_ack, HubPid, MetricName} ->
            {ok, MetricName}
    after 1000 ->
        {error, timeout}
    end.

%% Client API: fans out a sync pulse to listening collector processes
fanout_telemetry(Collectors, SyncPulse) ->
    DeliveredCount = lists:foldl(fun(Pid, Acc) ->
        Pid ! {telemetry_pulse, SyncPulse},
        Acc + 1
    end, 0, Collectors),
    {dispatched, DeliveredCount}.

%% Internal actor loop: executes inside the spawned process
gateway_loop() ->
    receive
        {record_metric, CallerPid, MetricName, _Val} ->
            CallerPid ! {metric_ack, self(), MetricName},
            gateway_loop();
        shutdown ->
            ok
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (erts / erlang)
spawn(Fun) -> pid()
spawn(Module, Function, Args) -> pid()
  Types:
    Module = atom()
    Function = atom()
    Args = [term()]

self() -> pid()
Dest ! Message -> Message
\`\`\`

## Assignment Specification

Implement the concurrent ping-pong actor and messaging interface in \`src/ping_actor.erl\`. The module must export \`start_responder/0\`, \`responder_loop/0\`, \`ping/2\`, and \`broadcast/2\`.

### 1. \`start_responder/0\`
- **Input**: None.
- **Behavior**: Spawns a concurrent process executing \`responder_loop/0\` and returns its process identifier.
- **Output**: Returns the \`pid()\` of the spawned responder actor.

### 2. \`responder_loop/0\`
- **Input**: None (runs as a long-lived process).
- **Behavior**:
  - Enters a tail-recursive message receipt loop.
  - When receiving a 3-tuple tagged with the atom \`ping\`, containing the caller process identifier and an arbitrary payload, it replies to the caller with a 3-tuple tagged with \`pong\` containing its own process identifier and the identical payload, then tail-recurses into \`responder_loop/0\`.
  - When receiving the atom \`stop\`, it terminates the loop cleanly.
- **Output**: Returns the atom \`ok\` upon termination.

### 3. \`ping/2\`
- **Input**:
  - \`ResponderPid\`: The process identifier of a running responder actor.
  - \`Payload\`: An arbitrary Erlang term.
- **Behavior**:
  - Sends a ping request tuple to \`ResponderPid\` containing its own process identifier and \`Payload\`.
  - Selectively awaits a matching pong reply from \`ResponderPid\` carrying the matching payload with a 1,000-millisecond timeout.
- **Output**:
  - Returns \`{ok, Payload}\` when the corresponding reply is received within 1,000 milliseconds.
  - Returns \`{error, timeout}\` if no matching reply arrives within 1,000 milliseconds.

### 4. \`broadcast/2\`
- **Input**:
  - \`PidsList\`: A list of process identifiers.
  - \`Msg\`: An arbitrary Erlang term to deliver.
- **Behavior**:
  - Asynchronously sends \`Msg\` to every process identifier in \`PidsList\`.
  - Computes the total count of recipient processes messaged.
- **Output**: Returns a 2-tuple \`{sent, Count}\` where Count represents the total number of recipient processes messaged.

## Rules & Verification Constraints

- Must invoke \`erlang:self/0\` to include the caller's PID in request tuples.
- The \`responder_loop/0\` function must be strictly tail-recursive.
- All message transmissions must use the asynchronous \`!\` operator.`,
    mentalModelCheck: {
      question: 'Why does an Erlang process need to include `self()` inside its request message tuple when communicating with an actor?',
      codeSnippet: `%% Sending a request to a worker:
WorkerPid ! {calculate_tax, self(), OrderTotal}.`,
      options: [
        {
          id: 'A',
          label: 'The BEAM message passing mechanism does not include implicit return addresses; the recipient actor cannot know where to send its reply unless the caller explicitly passes its PID.',
          isCorrect: true,
          explanation: "Correct! Erlang messages are raw terms placed into mailboxes. Because the runtime does not attach caller metadata to messages, request-reply protocols must explicitly pass self() so the responder knows the destination PID.",
        },
        {
          id: 'B',
          label: 'The BEAM will crash with a badarg error if an outgoing message tuple does not contain a PID.',
          isCorrect: false,
          explanation: 'Any valid Erlang term can be sent via !. Including self() is a protocol convention for replies, not a syntax requirement.',
        },
        {
          id: 'C',
          label: 'Including self() locks the recipient process so no other process can message it.',
          isCorrect: false,
          explanation: 'Erlang processes never lock. Other processes can send messages to WorkerPid concurrently without contention.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'spawn',
        module: 'erlang',
        signature: 'spawn(Module, Function, Args) -> pid()',
        typesSpec: ['Module = atom()', 'Function = atom()', 'Args = [term()]'],
        description: 'Creates a new concurrent process executing Module:Function(Args) with its own isolated heap.',
        complexityNote: 'O(1) allocation (~2.5 KB base footprint).',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#spawn/3',
      },
      {
        functionName: 'self',
        module: 'erlang',
        signature: 'self() -> pid()',
        typesSpec: ['pid() = process identifier'],
        description: 'Returns the process identifier (PID) of the currently executing process.',
        complexityNote: 'O(1) register lookup.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#self/0',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch05-02-1',
        title: 'Ping-Pong Single Roundtrip',
        erlangCall: 'begin P = ping_actor:start_responder(), Res = ping_actor:ping(P, <<"syn">>), P ! stop, Res end',
        expectedOutput: '{ok, <<"syn">>}',
        explanation: 'Sends a ping request with binary payload and receives matching pong reply.',
      },
      {
        id: 'tc-ch05-02-2',
        title: 'Asynchronous Broadcast',
        erlangCall: 'begin P1 = ping_actor:start_responder(), P2 = ping_actor:start_responder(), Res = ping_actor:broadcast([P1, P2], stop), Res end',
        expectedOutput: '{sent, 2}',
        explanation: 'Broadcasts stop message asynchronously to two processes, returning {sent, 2}.',
      },
    ],
    astRules: {
      requiredCalls: ['erlang:self/0'],
      requireTailRecursion: ['responder_loop/0'],
    },
    solutionExplanation: 'Spawns a tail-recursive responder loop that pattern-matches {ping, CallerPid, Payload}, sends {pong, self(), Payload}, and uses receive ... after for timeout-safe ping/2 calls.',
    files: [
      {
        name: 'ping_actor.erl',
        path: 'src/ping_actor.erl',
        content: `-module(ping_actor).
-export([start_responder/0, responder_loop/0, ping/2, broadcast/2]).

%% @doc Spawns a new concurrent responder actor executing responder_loop/0.
-spec start_responder() -> pid().
start_responder() ->
    self().

%% @doc Tail-recursive actor loop handling ping requests and termination.
-spec responder_loop() -> ok.
responder_loop() ->
    ok.

%% @doc Dispatches a ping payload to ResponderPid and awaits a correlated pong.
-spec ping(pid(), term()) -> {ok, term()} | {error, timeout}.
ping(_ResponderPid, _Payload) ->
    {error, timeout}.

%% @doc Asynchronously delivers Msg to all processes in PidsList.
-spec broadcast([pid()], term()) -> {sent, non_neg_integer()}.
broadcast(_PidsList, _Msg) ->
    {sent, 0}.
`,
      },
    ],
    solutionFiles: {
      'src/ping_actor.erl': `-module(ping_actor).
-export([start_responder/0, responder_loop/0, ping/2, broadcast/2]).

start_responder() ->
    spawn(fun() -> responder_loop() end).

responder_loop() ->
    receive
        {ping, CallerPid, Payload} ->
            CallerPid ! {pong, self(), Payload},
            responder_loop();
        stop ->
            ok
    end.

ping(ResponderPid, Payload) ->
    ResponderPid ! {ping, self(), Payload},
    receive
        {pong, ResponderPid, Payload} ->
            {ok, Payload}
    after 1000 ->
        {error, timeout}
    end.

broadcast(PidsList, Msg) ->
    [P ! Msg || P <- PidsList],
    {sent, length(PidsList)}.
`,
    },
    starterCode: `-module(ping_actor).
-export([start_responder/0, responder_loop/0, ping/2, broadcast/2]).

%% @doc Spawns a new concurrent responder actor executing responder_loop/0.
-spec start_responder() -> pid().
start_responder() ->
    self().

%% @doc Tail-recursive actor loop handling ping requests and termination.
-spec responder_loop() -> ok.
responder_loop() ->
    ok.

%% @doc Dispatches a ping payload to ResponderPid and awaits a correlated pong.
-spec ping(pid(), term()) -> {ok, term()} | {error, timeout}.
ping(_ResponderPid, _Payload) ->
    {error, timeout}.

%% @doc Asynchronously delivers Msg to all processes in PidsList.
-spec broadcast([pid()], term()) -> {sent, non_neg_integer()}.
broadcast(_PidsList, _Msg) ->
    {sent, 0}.
`,
    solutionCode: `-module(ping_actor).
-export([start_responder/0, responder_loop/0, ping/2, broadcast/2]).

start_responder() ->
    spawn(fun() -> responder_loop() end).

responder_loop() ->
    receive
        {ping, CallerPid, Payload} ->
            CallerPid ! {pong, self(), Payload},
            responder_loop();
        stop ->
            ok
    end.

ping(ResponderPid, Payload) ->
    ResponderPid ! {ping, self(), Payload},
    receive
        {pong, ResponderPid, Payload} ->
            {ok, Payload}
    after 1000 ->
        {error, timeout}
    end.

broadcast(PidsList, Msg) ->
    [P ! Msg || P <- PidsList],
    {sent, length(PidsList)}.
`,
  },

  // ── Lesson 5.3: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch05-l03',
    chapterNumber: 5,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Selective receive ... after: The Mailbox Save Queue, Timeouts & after 0 Non-Blocking Flush',
    difficulty: 'Intermediate',
    xpReward: 100,
    visualScene: 'mailbox_selective_receive',
    conceptMarkdown: `## Why This Matters in Production

In message-driven distributed architectures, messages do not always arrive in the exact order a worker needs to process them. For instance, a background telemetry actor might receive thousands of low-priority log lines followed by a critical system shutdown signal (\`{urgent, shutdown}\`). If the worker was forced to process messages strictly in first-in-first-out (FIFO) order, it would take seconds or minutes of CPU work before ever reaching the urgent shutdown signal.

Erlang solves this through **Selective Receive**. An Erlang process does not blindly dequeue whatever message is sitting at the front of its mailbox. Instead, it scans its mailbox for messages matching its \`receive\` patterns. Unmatched messages are automatically preserved in order without being discarded.

## Deep Concept Breakdown & Under the Hood

### 1. The BEAM Mailbox & Internal Save Queue
Under the hood, every BEAM process maintains a **Mailbox** and an internal **Save Queue**:
1. When external actors send messages to \`Pid\`, the messages are appended to the tail of \`Pid\`'s mailbox queue.
2. When the process enters a \`receive\` block, the runtime points an internal **Scan Pointer** at the message at the head of the mailbox.
3. If the head message matches any clause in the \`receive\` expression, the message is extracted from the mailbox, the clause body executes, and the scan pointer resets.
4. If the head message **fails to match**, the runtime moves that message aside into the process's internal **Save Queue** and advances the scan pointer to the next message.
5. Steps 3 and 4 repeat until a match is found or the mailbox is exhausted.
6. The instant a match succeeds, **all messages in the Save Queue are spliced back to the head of the mailbox** in their exact original arrival order!

### 2. Timeouts with \`after TimeoutMs ->\`
If no message matches, the process suspends. To prevent client processes from hanging indefinitely if a remote peer crashes or drops a request, Erlang supports timeouts:
\`\`\`erlang
receive
    {reply, Result} -> {ok, Result}
after 1000 ->
    {error, timeout}
end.
\`\`\`
The timer begins counting the moment the process begins waiting. If 1,000 milliseconds elapse without a matching message arriving, the \`after\` block executes.

### 3. The \`after 0 ->\` Non-Blocking Idiom
A timeout of **\`after 0\`** instructs the BEAM runtime: *"Check the mailbox right now. If a matching message is already present, process it immediately. If not, do NOT suspend; evaluate the after block in 0ms!"*

This zero-wait idiom has two critical production applications:
1. **Tiered Priority Polling:** Checking for high-priority commands before falling back to bulk traffic:
   \`\`\`erlang
   poll_network_traffic() ->
       receive
           {system_override, Cmd} -> {override, Cmd}
       after 0 ->
           receive
               {stream_data, Chunk} -> {data, Chunk}
           after 0 ->
               no_traffic
           end
       end.
   \`\`\`
2. **Non-Blocking Inbox Draining:** Gathering all pending messages currently sitting in the mailbox into an accumulator without suspending the caller:
   \`\`\`erlang
   drain_pending_events(Acc) ->
       receive
           Event -> drain_pending_events([Event | Acc])
       after 0 ->
           lists:reverse(Acc)
       end.
   \`\`\`

> [!warning] Production Concurrency Trap: Quadratic Mailbox Scanning
> Selective receive is powerful, but scanning a mailbox containing 50,000 unmatched messages searching for a specific pattern requires traversing 50,000 linked pointers for every single receive operation ($O(N)$ scan overhead). Always ensure your mailboxes are drained or use correlation references (\`make_ref()\`), as covered in Lesson 5.5!

## Parallel Worked Example

Consider an autonomous vehicle sensor bus that prioritizes collision hazards over ordinary telemetry packets and flushes stale readings:

\`\`\`erlang
-module(sensor_bus).
-export([poll_critical_event/0, query_sensor_with_timeout/3, purge_sensor_backlog/0]).

%% Selectively pulls collision hazards ahead of normal telemetry
poll_critical_event() ->
    receive
        {hazard, Level, Sector} ->
            {critical, Level, Sector}
    after 0 ->
        receive
            {telemetry, Metric, Val} ->
                {info, Metric, Val}
        after 250 ->
            {error, no_events}
        end
    end.

%% Dispatches a diagnostic check to a sensor controller with a bounded timeout
query_sensor_with_timeout(ControllerPid, ProbeKey, TimeoutLimit) ->
    ControllerPid ! {diagnostic_probe, self(), ProbeKey},
    receive
        {diagnostic_ack, ProbeKey, Reading} ->
            {ok, Reading}
    after TimeoutLimit ->
        {error, probe_timeout}
    end.

%% Purges stale telemetry packets currently sitting in the inbox
purge_sensor_backlog() ->
    purge_loop([]).

purge_loop(Acc) ->
    receive
        {telemetry, _Metric, _Val} = Msg ->
            purge_loop([Msg | Acc])
    after 0 ->
        lists:reverse(Acc)
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Syntax (system / expressions)
receive
    Pattern1 [when Guard1] -> Body1;
    Pattern2 [when Guard2] -> Body2
after TimeoutExpr ->
    TimeoutBody
end
\`\`\`

## Assignment Specification

Implement the priority mailbox consumer and timeout request interface in \`src/priority_mailbox.erl\`. The module must export \`receive_urgent_first/1\`, \`request_with_timeout/3\`, and \`flush_mailbox/0\`.

### 1. \`receive_urgent_first/1\`
- **Input**:
  - \`ExpectedCount\`: A non-negative integer specifying the maximum number of items to harvest from the current process mailbox.
- **Behavior**:
  - Successively drains messages from \`self()\`'s mailbox until either \`ExpectedCount\` items are collected or no further matching messages are available.
  - Prioritizes messages matching 2-tuples tagged with the atom \`urgent\`. If an urgent message is immediately available in the mailbox, its payload is harvested.
  - If no urgent message is immediately available, non-blockingly checks for messages matching 2-tuples tagged with the atom \`normal\`.
  - Terminates the extraction loop without blocking when neither category is present or when \`ExpectedCount\` messages have been harvested.
- **Output**: Returns a list of the extracted payloads, ordered such that all urgent payloads precede normal payloads, preserving FIFO arrival order within each priority tier.
- **Example**:
  Given a process mailbox containing \`{normal, 1}\`, \`{urgent, 99}\`, and \`{normal, 2}\`, calling \`receive_urgent_first(3)\` returns \`[99, 1, 2]\`.

### 2. \`request_with_timeout/3\`
- **Input**:
  - \`TargetPid\`: The process identifier of the target actor.
  - \`RequestMsg\`: An arbitrary Erlang term representing the payload of the request.
  - \`TimeoutMs\`: A non-negative integer representing the maximum time window in milliseconds to await a response.
- **Behavior**:
  - Asynchronously dispatches a 3-tuple request to \`TargetPid\` containing the atom \`request\`, the caller's own PID (\`self()\`), and \`RequestMsg\`.
  - Selectively awaits a matching 3-tuple reply from \`TargetPid\` tagged with the atom \`reply\`, carrying the identical \`RequestMsg\` and a result term.
- **Output**:
  - Returns \`{ok, Result}\` if the correlated reply arrives before \`TimeoutMs\` elapses.
  - Returns \`{error, timeout}\` if the timeout expires before a matching reply is received.

### 3. \`flush_mailbox/0\`
- **Input**: None.
- **Behavior**: Non-blockingly drains all messages currently awaiting processing in the current process mailbox without suspending.
- **Output**: Returns a list containing all drained messages in their original FIFO arrival order.

## Rules & Verification Constraints

- Must employ the \`receive ... after\` construct to prevent deadlock.
- Mailbox draining in \`flush_mailbox/0\` and fallback checks in \`receive_urgent_first/1\` must never block when no matching messages exist.
- Must preserve FIFO arrival order among messages sharing the same priority tier.`,
    mentalModelCheck: {
      question: 'What happens to messages in an actor’s mailbox that fail to match any pattern in the currently executing `receive` block?',
      codeSnippet: `%% Mailbox contains: [{normal, 1}, {urgent, 99}]
receive
    {urgent, Val} -> Val
end.`,
      options: [
        {
          id: 'A',
          label: 'They are temporarily moved into the internal Save Queue while the mailbox is scanned, and automatically spliced back to the front of the mailbox once a match is found.',
          isCorrect: true,
          explanation: 'Correct! The BEAM preserves unmatched messages in an internal Save Queue. When a message matches, all saved messages are returned to the head of the mailbox in their original order.',
        },
        {
          id: 'B',
          label: 'They are permanently discarded and immediately reclaimed by the garbage collector.',
          isCorrect: false,
          explanation: 'Erlang never discards unmatched messages unless you explicitly write a catch-all clause (_ -> ok) to discard them.',
        },
        {
          id: 'C',
          label: 'They cause the process to crash immediately with a badmatch exception.',
          isCorrect: false,
          explanation: 'Unmatched receive messages never cause exceptions; the process simply moves them to the Save Queue and checks the next message.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'send',
        module: 'erlang',
        signature: 'erlang:send(Dest, Msg) -> Msg',
        typesSpec: ['Dest = pid() | atom()', 'Msg = term()'],
        description: 'Sends a message asynchronously to Dest, returning Msg. Equivalent to the ! operator.',
        complexityNote: 'O(1) mailbox enqueue.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#send/2',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch05-03-1',
        title: 'Priority Drain (Urgent Ahead of Normal)',
        erlangCall: 'begin self() ! {normal, 1}, self() ! {urgent, 99}, self() ! {normal, 2}, priority_mailbox:receive_urgent_first(3) end',
        expectedOutput: '[99, 1, 2]',
        explanation: 'Urgent message 99 is extracted ahead of normal messages 1 and 2.',
      },
      {
        id: 'tc-ch05-03-2',
        title: 'Client Request Timeout Fallback',
        erlangCall: 'begin Dummy = spawn(fun() -> receive after 500 -> ok end end), priority_mailbox:request_with_timeout(Dummy, ping, 40) end',
        expectedOutput: '{error, timeout}',
        explanation: 'Returns {error, timeout} within 40ms when querying a non-responsive worker.',
      },
      {
        id: 'tc-ch05-03-3',
        title: 'Non-Blocking Mailbox Flush',
        erlangCall: 'begin self() ! a, self() ! b, self() ! c, priority_mailbox:flush_mailbox() end',
        expectedOutput: '[a, b, c]',
        explanation: 'Drains all pending messages in FIFO order using after 0.',
      },
    ],
    astRules: {
      requiredConstructs: ['receive_after'],
    },
    solutionExplanation: 'Uses receive ... after 0 to selectively prioritize {urgent, Payload} over {normal, Payload}, implements timeout guards, and flushes mailboxes using after 0 loops.',
    files: [
      {
        name: 'priority_mailbox.erl',
        path: 'src/priority_mailbox.erl',
        content: `-module(priority_mailbox).
-export([receive_urgent_first/1, request_with_timeout/3, flush_mailbox/0]).

%% @doc Drains up to ExpectedCount messages prioritizing urgent payloads over normal.
-spec receive_urgent_first(non_neg_integer()) -> [term()].
receive_urgent_first(_ExpectedCount) ->
    [].

%% @doc Dispatches RequestMsg to TargetPid and awaits correlated reply within TimeoutMs.
-spec request_with_timeout(pid(), term(), non_neg_integer()) -> {ok, term()} | {error, timeout}.
request_with_timeout(_TargetPid, _RequestMsg, _TimeoutMs) ->
    {error, timeout}.

%% @doc Drains all pending messages from the current mailbox without blocking.
-spec flush_mailbox() -> [term()].
flush_mailbox() ->
    [].
`,
      },
    ],
    solutionFiles: {
      'src/priority_mailbox.erl': `-module(priority_mailbox).
-export([receive_urgent_first/1, request_with_timeout/3, flush_mailbox/0]).

receive_urgent_first(ExpectedCount) ->
    receive_urgent_loop(ExpectedCount, []).

receive_urgent_loop(0, Acc) ->
    lists:reverse(Acc);
receive_urgent_loop(N, Acc) ->
    receive
        {urgent, Payload} ->
            receive_urgent_loop(N - 1, [Payload | Acc])
    after 0 ->
        receive
            {normal, Payload} ->
                receive_urgent_loop(N - 1, [Payload | Acc])
        after 0 ->
            lists:reverse(Acc)
        end
    end.

request_with_timeout(TargetPid, RequestMsg, TimeoutMs) ->
    TargetPid ! {request, self(), RequestMsg},
    receive
        {reply, RequestMsg, Result} ->
            {ok, Result}
    after TimeoutMs ->
        {error, timeout}
    end.

flush_mailbox() ->
    flush_loop([]).

flush_loop(Acc) ->
    receive
        Msg -> flush_loop([Msg | Acc])
    after 0 ->
        lists:reverse(Acc)
    end.
`,
    },
    starterCode: `-module(priority_mailbox).
-export([receive_urgent_first/1, request_with_timeout/3, flush_mailbox/0]).

%% @doc Drains up to ExpectedCount messages prioritizing urgent payloads over normal.
-spec receive_urgent_first(non_neg_integer()) -> [term()].
receive_urgent_first(_ExpectedCount) ->
    [].

%% @doc Dispatches RequestMsg to TargetPid and awaits correlated reply within TimeoutMs.
-spec request_with_timeout(pid(), term(), non_neg_integer()) -> {ok, term()} | {error, timeout}.
request_with_timeout(_TargetPid, _RequestMsg, _TimeoutMs) ->
    {error, timeout}.

%% @doc Drains all pending messages from the current mailbox without blocking.
-spec flush_mailbox() -> [term()].
flush_mailbox() ->
    [].
`,
    solutionCode: `-module(priority_mailbox).
-export([receive_urgent_first/1, request_with_timeout/3, flush_mailbox/0]).

receive_urgent_first(ExpectedCount) ->
    receive_urgent_loop(ExpectedCount, []).

receive_urgent_loop(0, Acc) ->
    lists:reverse(Acc);
receive_urgent_loop(N, Acc) ->
    receive
        {urgent, Payload} ->
            receive_urgent_loop(N - 1, [Payload | Acc])
    after 0 ->
        receive
            {normal, Payload} ->
                receive_urgent_loop(N - 1, [Payload | Acc])
        after 0 ->
            lists:reverse(Acc)
        end
    end.

request_with_timeout(TargetPid, RequestMsg, TimeoutMs) ->
    TargetPid ! {request, self(), RequestMsg},
    receive
        {reply, RequestMsg, Result} ->
            {ok, Result}
    after TimeoutMs ->
        {error, timeout}
    end.

flush_mailbox() ->
    flush_loop([]).

flush_loop(Acc) ->
    receive
        Msg -> flush_loop([Msg | Acc])
    after 0 ->
        lists:reverse(Acc)
    end.
`,
  },

  // ── Lesson 5.4: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch05-l04',
    chapterNumber: 5,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'The Client-Server Abstraction Barrier & Tail-Recursive Actor State Loops',
    difficulty: 'Intermediate',
    xpReward: 100,
    visualScene: 'mailbox_selective_receive',
    conceptMarkdown: `## Why This Matters in Production

In functional programming, all variables and data structures are strictly **immutable**. There are no mutable objects, no \`this.state = newState\`, and no global pointers. How, then, can an Erlang backend manage a stateful shopping cart, maintain thousands of concurrent TCP user sessions, or track an e-commerce inventory count?

The answer is **Tail-Recursive Process State Loops**. A long-running process maintains mutable-like state across time by passing the updated state term as the argument to its recursive loop function. Because of **Tail-Call Optimization (TCO)**, the BEAM runtime reuses the exact same stack frame ($O(1)$ memory growth). Meanwhile, superseded state terms become unreferenced and are collected by the process's private garbage collector.

## Deep Concept Breakdown & Under the Hood

### 1. How Immutable Processes Hold State
Consider an actor with an integer state:
\`\`\`erlang
loop(Count) ->
    receive
        {increment, Delta} ->
            loop(Count + Delta);
        {get, Caller} ->
            Caller ! {value, Count},
            loop(Count);
        stop ->
            ok
    end.
\`\`\`
1. When started with \`loop(0)\`, the process's stack frame contains \`Count = 0\`.
2. When an \`{increment, 5}\` message arrives, the process computes \`0 + 5 = 5\` and evaluates \`loop(5)\`.
3. Because \`loop/1\` is in the **tail position** (the final expression of the clause), the BEAM executes the \`call_last\` opcode: it overwrites the current stack frame with \`Count = 5\` without pushing a new frame!
4. The actor can run for years, handling billions of state transitions, while consuming a constant **~2.5 KB** of stack memory!

### 2. The Client-Server Abstraction Barrier
A critical software engineering discipline in Erlang is separating **Client API Functions** from **Internal Server Callbacks**:
- **The Anti-Pattern (Leaky Abstraction):** Forcing callers outside the module to manually write \`Pid ! {increment, 5}\` and \`Pid ! {get, self()}\`. If the internal tuple protocol ever changes, every single file in the codebase breaks!
- **The Erlang Pattern (Clean Abstraction Barrier):** Encapsulating both roles inside a single module:
  - **Client API Functions (\`increment/2\`, \`get_value/1\`):** Execute inside the **caller's process** (\`self()\` is the caller!).
  - **Server Loop (\`loop/1\`):** Executes inside the **spawned actor process** (\`self()\` is the actor!).

### 3. Step-by-Step Message & Execution Flow
1. **Asynchronous Cast (\`counter_actor:increment(Pid, 5)\`):**
   - The caller evaluates \`Pid ! {increment, 5}\` and returns \`ok\` immediately without blocking.
   - The message arrives at the tail of \`Pid\`'s private mailbox.
   - The actor process awakens, matches \`{increment, Delta}\`, computes \`NextVal = CurrentVal + 5\`, and tail-calls \`loop(NextVal)\`.
2. **Synchronous Call (\`counter_actor:get_value(Pid)\`):**
   - The caller evaluates \`Pid ! {get, self()}\` and awaits a reply in a selective \`receive\` with a 1,000ms timeout guard.
   - The actor process matches \`{get, Caller}\`, replies \`Caller ! {value, CurrentVal}\`, and tail-calls \`loop(CurrentVal)\`.
   - The caller receives \`{value, V}\` and returns \`{ok, V}\`.

> [!warning] Production Concurrency Trap: Forgetting Tail Position Breaks O(1) Memory
> If you write \`io:format("Done~n"), loop(NextState)\` inside a clause, \`loop/1\` is STILL in tail position because \`io:format\` executes first. But if you write \`loop(NextState) + 1\`, the recursive call is NO LONGER in tail position! The BEAM must allocate a new stack frame for every single message, causing a memory exhaustion crash after a few thousand messages.

## Parallel Worked Example

The following module implements a stateful bank vault actor maintaining a balance:

\`\`\`erlang
-module(vault_actor).
-export([start/1, deposit/2, get_balance/1, close/1, loop/1]).

%% ── Client API (Executes in Caller Process) ───────────────────────────────────
start(InitialBalance) ->
    spawn(fun() -> loop(InitialBalance) end).

deposit(Pid, Amount) when Amount > 0 ->
    Pid ! {deposit, Amount},
    ok.

get_balance(Pid) ->
    Pid ! {get_balance, self()},
    receive
        {balance, Balance} ->
            {ok, Balance}
    after 1000 ->
        {error, timeout}
    end.

close(Pid) ->
    Pid ! close,
    ok.

%% ── Server Loop (Executes in Actor Process) ───────────────────────────────────
loop(Balance) ->
    receive
        {deposit, Amount} ->
            loop(Balance + Amount);
        {get_balance, Caller} ->
            Caller ! {balance, Balance},
            loop(Balance);
        close ->
            ok
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Concept (stdlib / gen_server precursor)
%% State loop tail-call invariant:
loop(State) ->
    receive
        Msg ->
            NewState = handle_msg(Msg, State),
            loop(NewState)
    end.
\`\`\`

## Assignment Specification

Implement \`src/counter_actor.erl\` exporting \`start/1\`, \`increment/2\`, \`decrement/2\`, \`get_value/1\`, \`stop/1\`, and \`loop/1\`:

1. \`start(InitialValue) -> pid()\`:
   - Spawns \`loop(InitialValue)\` and returns the newly spawned actor's PID.
2. \`increment(Pid, Delta) -> ok\`:
   - Asynchronously sends \`{increment, Delta}\` to \`Pid\` and returns \`ok\` immediately without waiting for a reply.
3. \`decrement(Pid, Delta) -> ok\`:
   - Asynchronously sends \`{decrement, Delta}\` to \`Pid\` and returns \`ok\` immediately.
4. \`get_value(Pid) -> {ok, integer()} | {error, timeout}\`:
   - Sends \`{get, self()}\` to \`Pid\`.
   - Selectively waits up to 1,000ms for \`{value, Val}\`, returning \`{ok, Val}\` or \`{error, timeout}\`.
5. \`stop(Pid) -> ok\`:
   - Asynchronously sends \`stop\` to \`Pid\` and returns \`ok\`.
6. \`loop(CurrentVal) -> ok\`:
   - Tail-recursive receive loop handling:
     - \`{increment, Delta}\` -> recurses to \`loop(CurrentVal + Delta)\`.
     - \`{decrement, Delta}\` -> recurses to \`loop(CurrentVal - Delta)\`.
     - \`{get, Caller}\` -> sends \`Caller ! {value, CurrentVal}\` and recurses to \`loop(CurrentVal)\`.
     - \`stop\` -> exits loop and returns \`ok\`.

## Rules & Verification Constraints

- The \`loop/1\` function must be strictly tail-recursive (enforced by AST rule \`requireTailRecursion: ["loop/1"]\`).
- Callers must not know internal tuple message formats; all operations must pass through exported client functions.`,
    mentalModelCheck: {
      question: 'When caller process `<0.100.0>` invokes `counter_actor:get_value(ServerPid)`, in which process does the code of `get_value/1` execute?',
      codeSnippet: `%% Caller code:
{ok, Val} = counter_actor:get_value(CounterPid).`,
      options: [
        {
          id: 'A',
          label: 'Inside caller process <0.100.0>, where self() evaluates to <0.100.0> so the counter actor knows where to send its reply message.',
          isCorrect: true,
          explanation: "Correct! Client API functions execute entirely inside the caller's process. Inside get_value/1, self() evaluates to the caller's PID, which is packed into the request tuple so the server loop can respond.",
        },
        {
          id: 'B',
          label: 'Inside CounterPid, because the function is defined in counter_actor.erl.',
          isCorrect: false,
          explanation: 'Function location in source code does not dictate execution process. Functions run in whichever process invokes them.',
        },
        {
          id: 'C',
          label: 'Inside a shared operating system thread managed by the kernel.',
          isCorrect: false,
          explanation: 'BEAM processes never share threads or execution contexts.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'spawn',
        module: 'erlang',
        signature: 'spawn(Fun) -> pid()',
        typesSpec: ['Fun = fun(() -> any())'],
        description: 'Spawns a new concurrent process executing the given anonymous closure and returns its PID.',
        complexityNote: 'O(1) allocation (~2.5 KB base heap).',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#spawn/1',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch05-04-1',
        title: 'Initial Value and Increment',
        erlangCall: 'begin P = counter_actor:start(10), ok = counter_actor:increment(P, 5), Res = counter_actor:get_value(P), counter_actor:stop(P), Res end',
        expectedOutput: '{ok, 15}',
        explanation: 'Initializes counter with 10, increments by 5, and retrieves 15.',
      },
      {
        id: 'tc-ch05-04-2',
        title: 'Increment and Decrement Sequence',
        erlangCall: 'begin P = counter_actor:start(0), counter_actor:increment(P, 50), counter_actor:decrement(P, 20), Res = counter_actor:get_value(P), counter_actor:stop(P), Res end',
        expectedOutput: '{ok, 30}',
        explanation: 'Applies increment of 50 followed by decrement of 20, verifying final value 30.',
      },
    ],
    astRules: {
      requireTailRecursion: ['loop/1'],
    },
    solutionExplanation: 'Implements tail-recursive loop/1 with O(1) stack memory and provides clean Client API functions that encapsulate message formats and request-reply synchronization.',
    files: [
      {
        name: 'counter_actor.erl',
        path: 'src/counter_actor.erl',
        content: `-module(counter_actor).
-export([start/1, increment/2, decrement/2, get_value/1, stop/1, loop/1]).

%% Spawns the counter actor with InitialValue
start(InitialValue) ->
    %% Architectural Requirement: Spawn loop(InitialValue) and return PID
    ok.

%% Client API: sends {increment, Delta} asynchronously
increment(Pid, Delta) ->
    %% Architectural Requirement: Send {increment, Delta} asynchronously, return ok
    ok.

%% Client API: sends {decrement, Delta} asynchronously
decrement(Pid, Delta) ->
    %% Architectural Requirement: Send {decrement, Delta} asynchronously, return ok
    ok.

%% Client API: sends {get, self()} and waits up to 1000ms for {value, Val}
get_value(Pid) ->
    %% Architectural Requirement: Send {get, self()}, receive {value, Val} with 1000ms timeout
    ok.

%% Client API: sends stop to the actor
stop(Pid) ->
    %% Architectural Requirement: Send stop, return ok
    ok.

%% Internal Actor Loop: tail-recursive message handler
loop(CurrentVal) ->
    %% Architectural Requirement:
    %% Handle {increment, Delta} -> recurse with CurrentVal + Delta
    %% Handle {decrement, Delta} -> recurse with CurrentVal - Delta
    %% Handle {get, Caller} -> send {value, CurrentVal} to Caller, recurse with CurrentVal
    %% Handle stop -> return ok
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/counter_actor.erl': `-module(counter_actor).
-export([start/1, increment/2, decrement/2, get_value/1, stop/1, loop/1]).

start(InitialValue) ->
    spawn(fun() -> loop(InitialValue) end).

increment(Pid, Delta) ->
    Pid ! {increment, Delta},
    ok.

decrement(Pid, Delta) ->
    Pid ! {decrement, Delta},
    ok.

get_value(Pid) ->
    Pid ! {get, self()},
    receive
        {value, Val} ->
            {ok, Val}
    after 1000 ->
        {error, timeout}
    end.

stop(Pid) ->
    Pid ! stop,
    ok.

loop(CurrentVal) ->
    receive
        {increment, Delta} ->
            loop(CurrentVal + Delta);
        {decrement, Delta} ->
            loop(CurrentVal - Delta);
        {get, Caller} ->
            Caller ! {value, CurrentVal},
            loop(CurrentVal);
        stop ->
            ok
    end.
`,
    },
    starterCode: `-module(counter_actor).
-export([start/1, increment/2, decrement/2, get_value/1, stop/1, loop/1]).

%% Spawns the counter actor with InitialValue
start(InitialValue) ->
    %% Architectural Requirement: Spawn loop(InitialValue) and return PID
    ok.

%% Client API: sends {increment, Delta} asynchronously
increment(Pid, Delta) ->
    %% Architectural Requirement: Send {increment, Delta} asynchronously, return ok
    ok.

%% Client API: sends {decrement, Delta} asynchronously
decrement(Pid, Delta) ->
    %% Architectural Requirement: Send {decrement, Delta} asynchronously, return ok
    ok.

%% Client API: sends {get, self()} and waits up to 1000ms for {value, Val}
get_value(Pid) ->
    %% Architectural Requirement: Send {get, self()}, receive {value, Val} with 1000ms timeout
    ok.

%% Client API: sends stop to the actor
stop(Pid) ->
    %% Architectural Requirement: Send stop, return ok
    ok.

%% Internal Actor Loop: tail-recursive message handler
loop(CurrentVal) ->
    %% Architectural Requirement:
    %% Handle {increment, Delta} -> recurse with CurrentVal + Delta
    %% Handle {decrement, Delta} -> recurse with CurrentVal - Delta
    %% Handle {get, Caller} -> send {value, CurrentVal} to Caller, recurse with CurrentVal
    %% Handle stop -> return ok
    ok.
`,
    solutionCode: `-module(counter_actor).
-export([start/1, increment/2, decrement/2, get_value/1, stop/1, loop/1]).

start(InitialValue) ->
    spawn(fun() -> loop(InitialValue) end).

increment(Pid, Delta) ->
    Pid ! {increment, Delta},
    ok.

decrement(Pid, Delta) ->
    Pid ! {decrement, Delta},
    ok.

get_value(Pid) ->
    Pid ! {get, self()},
    receive
        {value, Val} ->
            {ok, Val}
    after 1000 ->
        {error, timeout}
    end.

stop(Pid) ->
    Pid ! stop,
    ok.

loop(CurrentVal) ->
    receive
        {increment, Delta} ->
            loop(CurrentVal + Delta);
        {decrement, Delta} ->
            loop(CurrentVal - Delta);
        {get, Caller} ->
            Caller ! {value, CurrentVal},
            loop(CurrentVal);
        stop ->
            ok
    end.
`,
  },

  // ── Lesson 5.5: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch05-l05',
    chapterNumber: 5,
    lessonNumber: 5,
    lessonType: 'concept_exercise',
    title: 'Process Registry (register/2, whereis/1), Dead-PID vs. Unregistered-Atom Semantics & make_ref() Correlation',
    difficulty: 'Advanced',
    xpReward: 100,
    visualScene: 'mailbox_selective_receive',
    conceptMarkdown: `## Why This Matters in Production

In production distributed systems, two critical architectural challenges arise:
1. **Service Discovery Without Threading PIDs Through 20 Modules:** In a large backend with hundreds of modules, passing a raw PID like \`<0.142.0>\` down through every function call creates brittle tight-coupling. If that process crashes and its supervisor restarts it, its PID changes (e.g. to \`<0.288.0>\`), leaving all callers holding a dead reference.
2. **The "Stale Reply" Race Condition:** Suppose a client sends a request to a database actor. The database is temporarily congested, so the client's \`after 100\` timeout expires. The client gives up and sends a *second* request. Right at that microsecond, the late reply from the *first* request finally lands in the client's mailbox! Without a correlation identifier, the client's \`receive\` block consumes the old response and misattributes it to the second request, silently corrupting application state!

## Deep Concept Breakdown & Under the Hood

### 1. The Local Process Registry
Erlang allows registering any live process under a unique atom name:
\`\`\`erlang
register(session_manager, Pid).
\`\`\`
- Once registered, any process on the node can send messages directly by name: \`session_manager ! {login, User}\`.
- \`whereis(AtomName) -> pid() | undefined\`: Resolves the atom to its current live PID, or returns \`undefined\` if not running.
- \`unregister(AtomName) -> true\`: Removes the name mapping.
- \`registered() -> [atom()]\`: Returns a list of all currently registered names on the BEAM node.

### 2. CRITICAL PRODUCTION TRAP: Dead-PID vs. Unregistered-Atom Semantics
There is a massive, asymmetrical difference between sending to a dead PID versus sending to an unregistered atom:
- **Case A: Sending to a Dead PID (\`DeadPid ! Msg\`):**
  If \`DeadPid\` has already terminated, the BEAM runtime **silently drops the message and does NOT crash**. The expression evaluates to \`Msg\`. The sender continues running unaffected.
- **Case B: Sending to an Unregistered Atom (\`unregistered_service ! Msg\`):**
  If \`whereis(unregistered_service)\` returns \`undefined\`, the BEAM raises an immediate **\`badarg\` runtime exception** in the sender process!

> [!warning] Production Concurrency Trap: Blind Sends to Atoms Crash Callers
> Never write \`my_service ! Request\` directly in production client libraries. If \`my_service\` crashes and has not yet been restarted by its supervisor, your caller will crash with \`badarg\`. Always resolve the name safely:
> \`\`\`erlang
> case whereis(my_service) of
>     undefined -> {error, not_running};
>     Pid -> ...
> end
> \`\`\`

### 3. Request Correlation with \`make_ref/0\`
To eliminate the stale reply hazard, every synchronous request must generate an opaque 128-bit reference token: **\`Ref = make_ref()\`**:
1. Caller creates \`Ref = make_ref()\`.
2. Caller sends \`{get, Ref, self(), Key}\` to the actor.
3. Actor replies \`{reply, Ref, Result}\`.
4. Caller matches **specifically on that reference**:
   \`\`\`erlang
   receive
       {reply, Ref, Result} -> Result
   after 1000 ->
       {error, timeout}
   end.
   \`\`\`
If a delayed reply from an earlier timed-out request arrives with an older reference, the \`receive\` pattern \`{reply, Ref, ...}\` **rejects it**, safely ignoring the stale reply!

## Parallel Worked Example

Consider a registered configuration store:

\`\`\`erlang
-module(config_store).
-export([start/0, set/2, get/1, stop/0, loop/1]).

start() ->
    case whereis(?MODULE) of
        undefined ->
            Pid = spawn(fun() -> loop(#{}) end),
            register(?MODULE, Pid),
            {ok, Pid};
        _Pid ->
            {error, already_started}
    end.

set(Key, Val) ->
    case whereis(?MODULE) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {set, Ref, self(), Key, Val},
            receive
                {reply, Ref, ok} -> ok
            after 1000 -> {error, timeout}
            end
    end.

get(Key) ->
    case whereis(?MODULE) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {get, Ref, self(), Key},
            receive
                {reply, Ref, Res} -> Res
            after 1000 -> {error, timeout}
            end
    end.

stop() ->
    case whereis(?MODULE) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {stop, Ref, self()},
            receive
                {reply, Ref, ok} -> ok
            after 1000 -> {error, timeout}
            end
    end.

loop(StateMap) ->
    receive
        {set, Ref, From, Key, Val} ->
            From ! {reply, Ref, ok},
            loop(maps:put(Key, Val, StateMap));
        {get, Ref, From, Key} ->
            Result = case maps:find(Key, StateMap) of
                {ok, Value} -> {ok, Value};
                error -> {error, not_found}
            end,
            From ! {reply, Ref, Result},
            loop(StateMap);
        {stop, Ref, From} ->
            unregister(?MODULE),
            From ! {reply, Ref, ok},
            ok
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (erts / erlang)
register(RegName, Pid) -> true
whereis(RegName) -> pid() | undefined
unregister(RegName) -> true
make_ref() -> reference()
  Types:
    RegName = atom()
    Pid = pid()
    reference() = 128-bit unique token
\`\`\`

## Assignment Specification

Implement \`src/named_kv_actor.erl\` registered under atom \`named_kv_actor\`:

1. \`start_registered() -> {ok, pid()} | {error, already_started}\`:
   - Checks if \`named_kv_actor\` is already registered via \`whereis/1\`. If so, returns \`{error, already_started}\`.
   - If \`undefined\`, spawns \`loop(#{}) \`, registers it under \`named_kv_actor\`, and returns \`{ok, Pid}\`.
2. \`put(Key, Value) -> ok | {error, not_running} | {error, timeout}\`:
   - Safely checks \`whereis(named_kv_actor)\`. If \`undefined\`, returns \`{error, not_running}\`.
   - Generates \`Ref = make_ref()\`, sends \`{put, Ref, self(), Key, Value}\`, and receives \`{reply, Ref, ok}\` with a 1,000ms timeout.
3. \`get(Key) -> {ok, Value} | {error, not_found} | {error, not_running} | {error, timeout}\`:
   - Safely checks \`whereis(named_kv_actor)\`. If \`undefined\`, returns \`{error, not_running}\`.
   - Generates \`Ref = make_ref()\`, sends \`{get, Ref, self(), Key}\`, and receives \`{reply, Ref, Result}\` with a 1,000ms timeout.
4. \`stop() -> ok | {error, not_running} | {error, timeout}\`:
   - Safely checks \`whereis(named_kv_actor)\`. If \`undefined\`, returns \`{error, not_running}\`.
   - Generates \`Ref = make_ref()\`, sends \`{stop, Ref, self()}\`, and receives \`{reply, Ref, ok}\`.
5. \`loop(Map) -> ok\`:
   - Handles \`put\`, \`get\`, and \`stop\` (unregistering the name before exiting).

## Rules & Verification Constraints

- Must call \`erlang:make_ref/0\`, \`erlang:register/2\`, and \`erlang:whereis/1\`.
- Enforced by AST rule: \`requiredCalls: ["erlang:make_ref/0", "erlang:register/2", "erlang:whereis/1"]\`.
- \`loop/1\` must be tail-recursive.`,
    mentalModelCheck: {
      question: 'Why does evaluating `unregistered_atom ! {ping, self()}` crash the sender process with a badarg error, whereas sending to an exited PID does not crash?',
      codeSnippet: `%% Scenario A:
DeadPid ! {ping, self()}. %% Evaluates cleanly, drops message.

%% Scenario B:
whereis(named_service) == undefined.
named_service ! {ping, self()}. %% CRASHES sender with badarg!`,
      options: [
        {
          id: 'A',
          label: 'The BEAM treats sending to an unregistered atom name as an invalid destination argument (raising badarg), whereas sending to a dead PID is a valid operation that quietly drops the message.',
          isCorrect: true,
          explanation: 'Correct! When sending to an atom, the runtime attempts to look up the atom in the process registry table. If the atom is unregistered, the destination does not exist and the send primitive raises a badarg exception in the caller.',
        },
        {
          id: 'B',
          label: 'Sending to an atom always spawns a new process automatically.',
          isCorrect: false,
          explanation: 'Sending to an atom does not spawn processes; it requires prior registration via register/2.',
        },
        {
          id: 'C',
          label: 'Sending to a dead PID crashes the entire BEAM operating system.',
          isCorrect: false,
          explanation: 'Sending to a dead PID is completely safe and returns the message term itself.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'register',
        module: 'erlang',
        signature: 'erlang:register(RegName, Pid) -> true',
        typesSpec: ['RegName = atom()', 'Pid = pid()'],
        description: 'Associates an atom name with a process identifier in the local node process registry.',
        complexityNote: 'O(1) hash table registration.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#register/2',
      },
      {
        functionName: 'whereis',
        module: 'erlang',
        signature: 'erlang:whereis(RegName) -> pid() | undefined',
        typesSpec: ['RegName = atom()'],
        description: 'Looks up the process identifier associated with the registered atom name, or returns undefined.',
        complexityNote: 'O(1) registry lookup.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#whereis/1',
      },
      {
        functionName: 'make_ref',
        module: 'erlang',
        signature: 'erlang:make_ref() -> reference()',
        typesSpec: ['reference() = 128-bit unique reference'],
        description: 'Returns an almost unique reference token used for request-reply correlation and avoiding stale replies.',
        complexityNote: 'O(1) atomic counter increment.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#make_ref/0',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch05-05-1',
        title: 'Put and Get via Registered Name',
        erlangCall: 'begin catch named_kv_actor:stop(), {ok, _} = named_kv_actor:start_registered(), ok = named_kv_actor:put(<<"session_token">>, <<"active_123">>), Res = named_kv_actor:get(<<"session_token">>), named_kv_actor:stop(), Res end',
        expectedOutput: '{ok, <<"active_123">>}',
        explanation: 'Performs put and get operations using make_ref() correlation against registered named actor.',
      },
      {
        id: 'tc-ch05-05-2',
        title: 'Lookup Missing Key',
        erlangCall: 'begin catch named_kv_actor:stop(), {ok, _} = named_kv_actor:start_registered(), Res = named_kv_actor:get(<<"non_existent">>), named_kv_actor:stop(), Res end',
        expectedOutput: '{error, not_found}',
        explanation: 'Returns {error, not_found} when querying an absent key from the actor map.',
      },
    ],
    astRules: {
      requiredCalls: ['erlang:make_ref/0', 'erlang:register/2', 'erlang:whereis/1'],
      requireTailRecursion: ['loop/1'],
    },
    solutionExplanation: 'Implements process registration under named_kv_actor with whereis guards and make_ref() request-reply correlation to prevent stale reply bugs.',
    files: [
      {
        name: 'named_kv_actor.erl',
        path: 'src/named_kv_actor.erl',
        content: `-module(named_kv_actor).
-export([start_registered/0, put/2, get/1, stop/0, loop/1]).

%% Registers actor under atom named_kv_actor if not already registered
start_registered() ->
    %% Architectural Requirement: Check whereis, spawn loop(#{}) and register if undefined
    ok.

%% Client API: writes Key -> Value via registered name with make_ref() correlation
put(Key, Value) ->
    %% Architectural Requirement: Check whereis, generate Ref, send request, wait for reply
    ok.

%% Client API: reads Key via registered name with make_ref() correlation
get(Key) ->
    %% Architectural Requirement: Check whereis, generate Ref, send request, wait for reply
    ok.

%% Client API: stops actor and unregisters name
stop() ->
    %% Architectural Requirement: Check whereis, send stop, unregister name
    ok.

%% Internal Actor Loop holding Map state
loop(Map) ->
    %% Architectural Requirement: Handle put, get, and stop messages using Ref matching
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/named_kv_actor.erl': `-module(named_kv_actor).
-export([start_registered/0, put/2, get/1, stop/0, loop/1]).

start_registered() ->
    case whereis(named_kv_actor) of
        undefined ->
            Pid = spawn(fun() -> loop(#{}) end),
            register(named_kv_actor, Pid),
            {ok, Pid};
        _Pid ->
            {error, already_started}
    end.

put(Key, Value) ->
    case whereis(named_kv_actor) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {put, Ref, self(), Key, Value},
            receive
                {reply, Ref, ok} -> ok
            after 1000 -> {error, timeout}
            end
    end.

get(Key) ->
    case whereis(named_kv_actor) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {get, Ref, self(), Key},
            receive
                {reply, Ref, Result} -> Result
            after 1000 -> {error, timeout}
            end
    end.

stop() ->
    case whereis(named_kv_actor) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {stop, Ref, self()},
            receive
                {reply, Ref, ok} -> ok
            after 1000 -> {error, timeout}
            end
    end.

loop(Map) ->
    receive
        {put, Ref, From, K, V} ->
            From ! {reply, Ref, ok},
            loop(maps:put(K, V, Map));
        {get, Ref, From, K} ->
            Result = case maps:find(K, Map) of
                {ok, Val} -> {ok, Val};
                error -> {error, not_found}
            end,
            From ! {reply, Ref, Result},
            loop(Map);
        {stop, Ref, From} ->
            unregister(named_kv_actor),
            From ! {reply, Ref, ok},
            ok
    end.
`,
    },
    starterCode: `-module(named_kv_actor).
-export([start_registered/0, put/2, get/1, stop/0, loop/1]).

%% Registers actor under atom named_kv_actor if not already registered
start_registered() ->
    %% Architectural Requirement: Check whereis, spawn loop(#{}) and register if undefined
    ok.

%% Client API: writes Key -> Value via registered name with make_ref() correlation
put(Key, Value) ->
    %% Architectural Requirement: Check whereis, generate Ref, send request, wait for reply
    ok.

%% Client API: reads Key via registered name with make_ref() correlation
get(Key) ->
    %% Architectural Requirement: Check whereis, generate Ref, send request, wait for reply
    ok.

%% Client API: stops actor and unregisters name
stop() ->
    %% Architectural Requirement: Check whereis, send stop, unregister name
    ok.

%% Internal Actor Loop holding Map state
loop(Map) ->
    %% Architectural Requirement: Handle put, get, and stop messages using Ref matching
    ok.
`,
    solutionCode: `-module(named_kv_actor).
-export([start_registered/0, put/2, get/1, stop/0, loop/1]).

start_registered() ->
    case whereis(named_kv_actor) of
        undefined ->
            Pid = spawn(fun() -> loop(#{}) end),
            register(named_kv_actor, Pid),
            {ok, Pid};
        _Pid ->
            {error, already_started}
    end.

put(Key, Value) ->
    case whereis(named_kv_actor) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {put, Ref, self(), Key, Value},
            receive
                {reply, Ref, ok} -> ok
            after 1000 -> {error, timeout}
            end
    end.

get(Key) ->
    case whereis(named_kv_actor) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {get, Ref, self(), Key},
            receive
                {reply, Ref, Result} -> Result
            after 1000 -> {error, timeout}
            end
    end.

stop() ->
    case whereis(named_kv_actor) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {stop, Ref, self()},
            receive
                {reply, Ref, ok} -> ok
            after 1000 -> {error, timeout}
            end
    end.

loop(Map) ->
    receive
        {put, Ref, From, K, V} ->
            From ! {reply, Ref, ok},
            loop(maps:put(K, V, Map));
        {get, Ref, From, K} ->
            Result = case maps:find(K, Map) of
                {ok, Val} -> {ok, Val};
                error -> {error, not_found}
            end,
            From ! {reply, Ref, Result},
            loop(Map);
        {stop, Ref, From} ->
            unregister(named_kv_actor),
            From ! {reply, Ref, ok},
            ok
    end.
`,
  },

  // ── Lesson 5.6: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch05-l06',
    chapterNumber: 5,
    lessonNumber: 6,
    lessonType: 'concept_exercise',
    title: 'Finite State Machine (FSM) Actors via Mutual Tail Recursion',
    difficulty: 'Advanced',
    xpReward: 100,
    visualScene: 'mailbox_selective_receive',
    conceptMarkdown: `## Why This Matters in Production

In production network services and distributed protocol engines, an actor's valid operations change completely depending on its current mode:
- A TCP socket actor is initially in the \`unauthenticated\` state; once SASL authentication succeeds, it enters the \`authenticated\` state where stanzas are routed.
- A physical security vault or smart door is initially in the \`locked\` state; once the correct PIN is provided, it transitions to the \`unlocked\` state.

In traditional languages, developers attempt to model this with a single monolithic function stuffed with nested \`switch\` or \`if (state == LOCKED)\` branches. As features expand, this monolithic function degenerates into spaghetti code where invalid state transitions silently corrupt memory.

In Erlang, before adopting the OTP \`gen_statem\` behaviour (taught in Chapter 7), the idiomatic way to model a Finite State Machine (FSM) is **Mutual Tail Recursion**: writing **one dedicated function per state** (\`locked/2\` and \`unlocked/1\`) that transition states by directly tail-calling each other!

## Deep Concept Breakdown & Under the Hood

### 1. Modeling States as Distinct Functions
Instead of cramming all states into a single \`loop(State)\`, each state is its own function:
- \`locked(SecretCode, FailedAttempts)\`: Contains a \`receive\` block that only understands operations valid while locked.
- \`unlocked(SecretCode)\`: Contains a \`receive\` block that only understands operations valid while unlocked.

When a client enters the correct code:
\`\`\`erlang
%% Inside locked/2:
receive
    {enter_code, From, Ref, SecretCode} ->
        From ! {reply, Ref, {ok, unlocked}},
        unlocked(SecretCode);  %% <-- State Transition via Tail Call!
    ...
end.
\`\`\`

### 2. Tail-Call Optimization Across Different Functions
A common question from newcomers is: *"Does Tail-Call Optimization only work when a function recursively calls itself?"*
**No!** In the BEAM VM, tail-call optimization applies to **any function call in the tail position**, even if Function A calls Function B!
- When \`locked/2\` tail-calls \`unlocked/1\`, the compiler emits the \`call_only\` (or \`call_last\`) bytecode instruction.
- The BEAM deallocates \`locked/2\`'s stack arguments, writes \`unlocked/1\`'s argument into the register, and jumps directly to \`unlocked/1\`.
- **Zero additional stack frames are allocated!** An FSM actor can transition between \`locked\` and \`unlocked\` a billion times without consuming any extra memory!

### 3. Clear State-Specific Error Handling
Because each state has its own \`receive\` block, handling invalid actions is crystal clear:
- Attempting to unlock an already unlocked door doesn't crash; the \`unlocked/1\` function simply replies \`{ok, already_unlocked}\`.
- Attempting to lock an already locked door returns \`ok\` without resetting the failed attempts counter.
- Entering a wrong code in \`locked/2\` increments \`FailedAttempts + 1\` and remains in \`locked/2\`.

> [!warning] Production Concurrency Trap: State Leaks Across Transitions
> When transitioning from State A to State B, be deliberate about which state variables carry over. For example, when unlocking the door, the \`FailedAttempts\` counter is discarded; when locking the door again, it re-enters \`locked(SecretCode, 0)\` with a freshly zeroed counter.

## Parallel Worked Example

Consider a vending machine transitioning between \`idle\` and \`paid\`:

\`\`\`erlang
-module(vending_fsm).
-export([start/0, insert_coin/2, select_item/1, refund/1, stop/1, idle/0, paid/1]).

start() ->
    spawn(fun() -> idle() end).

insert_coin(Pid, Amount) ->
    Ref = make_ref(),
    Pid ! {insert_coin, self(), Ref, Amount},
    receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end.

select_item(Pid) ->
    Ref = make_ref(),
    Pid ! {select_item, self(), Ref},
    receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end.

refund(Pid) ->
    Ref = make_ref(),
    Pid ! {refund, self(), Ref},
    receive {reply, Ref, Res} -> Res after 1000 -> {error, timeout} end.

stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive {reply, Ref, ok} -> ok after 1000 -> {error, timeout} end.

%% State 1: IDLE
idle() ->
    receive
        {insert_coin, From, Ref, Amount} when Amount >= 25 ->
            From ! {reply, Ref, {ok, inserted}},
            paid(Amount);
        {insert_coin, From, Ref, _Small} ->
            From ! {reply, Ref, {error, coin_too_small}},
            idle();
        {select_item, From, Ref} ->
            From ! {reply, Ref, {error, insert_coin_first}},
            idle();
        {refund, From, Ref} ->
            From ! {reply, Ref, {ok, 0}},
            idle();
        {stop, Ref, From} ->
            From ! {reply, Ref, ok},
            ok
    end.

%% State 2: PAID (Mutually recursive transition from idle)
paid(Balance) ->
    receive
        {select_item, From, Ref} ->
            From ! {reply, Ref, {ok, item_dispensed}},
            idle();
        {refund, From, Ref} ->
            From ! {reply, Ref, {ok, Balance}},
            idle();
        {insert_coin, From, Ref, Extra} ->
            From ! {reply, Ref, {ok, Balance + Extra}},
            paid(Balance + Extra);
        {stop, Ref, From} ->
            From ! {reply, Ref, ok},
            ok
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Concept: Mutual Tail-Call State Machines
%% State A:
state_a(Arg) ->
    receive
        event_to_b -> state_b(NextArg);
        event_in_a -> state_a(UpdatedArg)
    end.

%% State B:
state_b(Arg) ->
    receive
        event_to_a -> state_a(NextArg);
        event_in_b -> state_b(UpdatedArg)
    end.
\`\`\`

## Assignment Specification

Implement \`src/door_lock_fsm.erl\` exporting \`start/1\`, \`enter_code/2\`, \`lock/1\`, \`get_state/1\`, \`stop/1\`, \`locked/2\`, and \`unlocked/1\`:

1. \`start(SecretCode) -> pid()\`:
   - Spawns the actor starting in state \`locked(SecretCode, 0)\`.
2. \`enter_code(Pid, AttemptCode) -> {ok, Status} | {error, Reason} | {error, timeout}\`:
   - Generates \`Ref = make_ref()\`, sends \`{enter_code, self(), Ref, AttemptCode}\`, and waits for reply.
   - Behavior in \`locked(SecretCode, FailedAttempts)\`:
     - If \`AttemptCode =:= SecretCode\`: replies \`{reply, Ref, {ok, unlocked}}\` and transitions to \`unlocked(SecretCode)\`.
     - If \`AttemptCode =/= SecretCode\`: increments \`Failed = FailedAttempts + 1\`, replies \`{reply, Ref, {error, {wrong_code, Failed}}}\`, and remains in \`locked(SecretCode, Failed)\`.
   - Behavior in \`unlocked(SecretCode)\`:
     - Replies \`{reply, Ref, {ok, already_unlocked}}\` and remains in \`unlocked(SecretCode)\`.
3. \`lock(Pid) -> ok | {error, timeout}\`:
   - Generates \`Ref = make_ref()\`, sends \`{lock, self(), Ref}\`, and waits for reply.
   - When in \`unlocked(SecretCode)\`: replies \`{reply, Ref, ok}\` and transitions to \`locked(SecretCode, 0)\` (resetting failed attempts).
   - When already in \`locked(SecretCode, FailedAttempts)\`: replies \`{reply, Ref, ok}\` and remains in \`locked(SecretCode, FailedAttempts)\`.
4. \`get_state(Pid) -> {locked, integer()} | unlocked | {error, timeout}\`:
   - Generates \`Ref = make_ref()\`, sends \`{get_state, self(), Ref}\`, and returns \`{locked, FailedAttempts}\` or \`unlocked\`.
5. \`stop(Pid) -> ok | {error, timeout}\`:
   - Generates \`Ref = make_ref()\`, sends \`{stop, self(), Ref}\`, replies \`{reply, Ref, ok}\`, and terminates cleanly.

## Rules & Verification Constraints

- Both \`locked/2\` and \`unlocked/1\` must be tail-recursive (enforced by AST rule \`requireTailRecursion: ["locked/2", "unlocked/1"]\`).
- Must use \`make_ref/0\` for request-reply synchronization with 1,000ms timeouts.`,
    mentalModelCheck: {
      question: 'Why does an actor alternating between `locked/2` and `unlocked/1` via mutual tail recursion never run out of stack memory even after billions of transitions?',
      codeSnippet: `%% Transitioning from locked to unlocked:
locked(Code, Attempts) ->
    receive
        {enter_code, From, Ref, Code} ->
            From ! {reply, Ref, {ok, unlocked}},
            unlocked(Code)  %% Calling another function in tail position!
    end.`,
      options: [
        {
          id: 'A',
          label: 'The BEAM compiler applies Tail-Call Optimization (call_only / call_last) across mutually recursive functions, completely deallocating the caller’s stack frame before jumping to the target function in O(1) space.',
          isCorrect: true,
          explanation: 'Correct! Tail-Call Optimization in the BEAM applies to any function call in the tail position, regardless of whether it calls itself or another function. The stack frame is reused in O(1) constant space.',
        },
        {
          id: 'B',
          label: 'Mutual recursion only works up to 1,024 transitions before switching to disk storage.',
          isCorrect: false,
          explanation: 'Erlang tail calls can recurse infinitely without limit or disk spilling.',
        },
        {
          id: 'C',
          label: 'The operating system kernel resets the thread stack whenever a different function is called.',
          isCorrect: false,
          explanation: 'BEAM stack management occurs entirely in user-space inside the virtual machine.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'spawn',
        module: 'erlang',
        signature: 'spawn(Fun) -> pid()',
        typesSpec: ['Fun = fun(() -> any())'],
        description: 'Spawns a new concurrent process executing the given anonymous closure and returns its PID.',
        complexityNote: 'O(1) allocation (~2.5 KB base heap).',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#spawn/1',
      },
      {
        functionName: 'make_ref',
        module: 'erlang',
        signature: 'erlang:make_ref() -> reference()',
        typesSpec: ['reference() = 128-bit unique reference'],
        description: 'Returns an almost unique reference token used for request-reply correlation.',
        complexityNote: 'O(1) atomic counter increment.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#make_ref/0',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch05-06-1',
        title: 'Unlock with Correct Code',
        erlangCall: 'begin P = door_lock_fsm:start(<<"1234">>), Res = door_lock_fsm:enter_code(P, <<"1234">>), State = door_lock_fsm:get_state(P), door_lock_fsm:stop(P), {Res, State} end',
        expectedOutput: '{{ok, unlocked}, unlocked}',
        explanation: 'Enters correct code, transitions to unlocked state, and confirms state is unlocked.',
      },
      {
        id: 'tc-ch05-06-2',
        title: 'Wrong Code Failed Attempts Counter',
        erlangCall: 'begin P = door_lock_fsm:start(<<"secret">>), Err1 = door_lock_fsm:enter_code(P, <<"wrong1">>), Err2 = door_lock_fsm:enter_code(P, <<"wrong2">>), State = door_lock_fsm:get_state(P), door_lock_fsm:stop(P), {Err1, Err2, State} end',
        expectedOutput: '{{error, {wrong_code, 1}}, {error, {wrong_code, 2}}, {locked, 2}}',
        explanation: 'Enters incorrect code twice, verifying failed attempts counter increments from 1 to 2.',
      },
      {
        id: 'tc-ch05-06-3',
        title: 'Locking and Re-locking State Transitions',
        erlangCall: 'begin P = door_lock_fsm:start(1111), {ok, unlocked} = door_lock_fsm:enter_code(P, 1111), ok = door_lock_fsm:lock(P), State = door_lock_fsm:get_state(P), door_lock_fsm:stop(P), State end',
        expectedOutput: '{locked, 0}',
        explanation: 'Unlocks door, locks it again, and confirms state is locked with 0 failed attempts.',
      },
    ],
    astRules: {
      requireTailRecursion: ['locked/2', 'unlocked/1'],
    },
    solutionExplanation: 'Models finite state machines via mutual tail recursion across locked/2 and unlocked/1, executing state transitions in O(1) stack space with make_ref() correlation.',
    files: [
      {
        name: 'door_lock_fsm.erl',
        path: 'src/door_lock_fsm.erl',
        content: `-module(door_lock_fsm).
-export([
    start/1,
    enter_code/2,
    lock/1,
    get_state/1,
    stop/1,
    locked/2,
    unlocked/1
]).

%% Spawns the actor starting in locked(SecretCode, 0)
start(SecretCode) ->
    %% Architectural Requirement: Spawn actor into locked(SecretCode, 0) and return PID
    ok.

%% Client API: sends code attempt to door actor
enter_code(Pid, AttemptCode) ->
    %% Architectural Requirement: make_ref(), send request, wait for reply with 1000ms timeout
    ok.

%% Client API: commands door actor to lock
lock(Pid) ->
    %% Architectural Requirement: make_ref(), send lock request, wait for reply with 1000ms timeout
    ok.

%% Client API: queries current door state
get_state(Pid) ->
    %% Architectural Requirement: make_ref(), send get_state request, wait for reply
    ok.

%% Client API: stops door actor cleanly
stop(Pid) ->
    %% Architectural Requirement: make_ref(), send stop, wait for ok
    ok.

%% ── FSM State 1: LOCKED ───────────────────────────────────────────────────────
locked(SecretCode, FailedAttempts) ->
    %% Architectural Requirement:
    %% If enter_code matches SecretCode -> reply {ok, unlocked}, tail-call unlocked(SecretCode)
    %% If enter_code fails -> reply {error, {wrong_code, FailedAttempts + 1}}, tail-call locked(SecretCode, FailedAttempts + 1)
    %% If lock -> reply ok, tail-call locked(SecretCode, FailedAttempts)
    %% If get_state -> reply {locked, FailedAttempts}, tail-call locked(SecretCode, FailedAttempts)
    %% If stop -> reply ok, return ok
    ok.

%% ── FSM State 2: UNLOCKED ─────────────────────────────────────────────────────
unlocked(SecretCode) ->
    %% Architectural Requirement:
    %% If enter_code -> reply {ok, already_unlocked}, tail-call unlocked(SecretCode)
    %% If lock -> reply ok, tail-call locked(SecretCode, 0) (reset counter)
    %% If get_state -> reply unlocked, tail-call unlocked(SecretCode)
    %% If stop -> reply ok, return ok
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/door_lock_fsm.erl': `-module(door_lock_fsm).
-export([
    start/1,
    enter_code/2,
    lock/1,
    get_state/1,
    stop/1,
    locked/2,
    unlocked/1
]).

start(SecretCode) ->
    spawn(fun() -> locked(SecretCode, 0) end).

enter_code(Pid, AttemptCode) ->
    Ref = make_ref(),
    Pid ! {enter_code, self(), Ref, AttemptCode},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

lock(Pid) ->
    Ref = make_ref(),
    Pid ! {lock, self(), Ref},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

get_state(Pid) ->
    Ref = make_ref(),
    Pid ! {get_state, self(), Ref},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

locked(SecretCode, FailedAttempts) ->
    receive
        {enter_code, From, Ref, SecretCode} ->
            From ! {reply, Ref, {ok, unlocked}},
            unlocked(SecretCode);
        {enter_code, From, Ref, _Wrong} ->
            NextFailed = FailedAttempts + 1,
            From ! {reply, Ref, {error, {wrong_code, NextFailed}}},
            locked(SecretCode, NextFailed);
        {lock, From, Ref} ->
            From ! {reply, Ref, ok},
            locked(SecretCode, FailedAttempts);
        {get_state, From, Ref} ->
            From ! {reply, Ref, {locked, FailedAttempts}},
            locked(SecretCode, FailedAttempts);
        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.

unlocked(SecretCode) ->
    receive
        {enter_code, From, Ref, _Any} ->
            From ! {reply, Ref, {ok, already_unlocked}},
            unlocked(SecretCode);
        {lock, From, Ref} ->
            From ! {reply, Ref, ok},
            locked(SecretCode, 0);
        {get_state, From, Ref} ->
            From ! {reply, Ref, unlocked},
            unlocked(SecretCode);
        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.
`,
    },
    starterCode: `-module(door_lock_fsm).
-export([
    start/1,
    enter_code/2,
    lock/1,
    get_state/1,
    stop/1,
    locked/2,
    unlocked/1
]).

%% Spawns the actor starting in locked(SecretCode, 0)
start(SecretCode) ->
    %% Architectural Requirement: Spawn actor into locked(SecretCode, 0) and return PID
    ok.

%% Client API: sends code attempt to door actor
enter_code(Pid, AttemptCode) ->
    %% Architectural Requirement: make_ref(), send request, wait for reply with 1000ms timeout
    ok.

%% Client API: commands door actor to lock
lock(Pid) ->
    %% Architectural Requirement: make_ref(), send lock request, wait for reply with 1000ms timeout
    ok.

%% Client API: queries current door state
get_state(Pid) ->
    %% Architectural Requirement: make_ref(), send get_state request, wait for reply
    ok.

%% Client API: stops door actor cleanly
stop(Pid) ->
    %% Architectural Requirement: make_ref(), send stop, wait for ok
    ok.

%% ── FSM State 1: LOCKED ───────────────────────────────────────────────────────
locked(SecretCode, FailedAttempts) ->
    %% Architectural Requirement:
    %% If enter_code matches SecretCode -> reply {ok, unlocked}, tail-call unlocked(SecretCode)
    %% If enter_code fails -> reply {error, {wrong_code, FailedAttempts + 1}}, tail-call locked(SecretCode, FailedAttempts + 1)
    %% If lock -> reply ok, tail-call locked(SecretCode, FailedAttempts)
    %% If get_state -> reply {locked, FailedAttempts}, tail-call locked(SecretCode, FailedAttempts)
    %% If stop -> reply ok, return ok
    ok.

%% ── FSM State 2: UNLOCKED ─────────────────────────────────────────────────────
unlocked(SecretCode) ->
    %% Architectural Requirement:
    %% If enter_code -> reply {ok, already_unlocked}, tail-call unlocked(SecretCode)
    %% If lock -> reply ok, tail-call locked(SecretCode, 0) (reset counter)
    %% If get_state -> reply unlocked, tail-call unlocked(SecretCode)
    %% If stop -> reply ok, return ok
    ok.
`,
    solutionCode: `-module(door_lock_fsm).
-export([
    start/1,
    enter_code/2,
    lock/1,
    get_state/1,
    stop/1,
    locked/2,
    unlocked/1
]).

start(SecretCode) ->
    spawn(fun() -> locked(SecretCode, 0) end).

enter_code(Pid, AttemptCode) ->
    Ref = make_ref(),
    Pid ! {enter_code, self(), Ref, AttemptCode},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

lock(Pid) ->
    Ref = make_ref(),
    Pid ! {lock, self(), Ref},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

get_state(Pid) ->
    Ref = make_ref(),
    Pid ! {get_state, self(), Ref},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

locked(SecretCode, FailedAttempts) ->
    receive
        {enter_code, From, Ref, SecretCode} ->
            From ! {reply, Ref, {ok, unlocked}},
            unlocked(SecretCode);
        {enter_code, From, Ref, _Wrong} ->
            NextFailed = FailedAttempts + 1,
            From ! {reply, Ref, {error, {wrong_code, NextFailed}}},
            locked(SecretCode, NextFailed);
        {lock, From, Ref} ->
            From ! {reply, Ref, ok},
            locked(SecretCode, FailedAttempts);
        {get_state, From, Ref} ->
            From ! {reply, Ref, {locked, FailedAttempts}},
            locked(SecretCode, FailedAttempts);
        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.

unlocked(SecretCode) ->
    receive
        {enter_code, From, Ref, _Any} ->
            From ! {reply, Ref, {ok, already_unlocked}},
            unlocked(SecretCode);
        {lock, From, Ref} ->
            From ! {reply, Ref, ok},
            locked(SecretCode, 0);
        {get_state, From, Ref} ->
            From ! {reply, Ref, unlocked},
            unlocked(SecretCode);
        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.
`,
  },

  // ── Lesson 5.7: Production Incident Triage #101 ───────────────────────────
  {
    id: 'ch05-l07',
    chapterNumber: 5,
    lessonNumber: 7,
    lessonType: 'incident_triage',
    title: 'Production Incident #101: Unbounded Mailbox Memory Leak in Telemetry Actor',
    difficulty: 'Production',
    xpReward: 175,
    visualScene: 'mailbox_selective_receive',
    incidentAlert: {
      incidentId: 'INC-101',
      severity: 'CRITICAL',
      serviceName: 'telemetry-aggregator-actor',
      symptom: 'Node memory consumption climbs from 120 MB to 14 GB over 2 hours; get_summary/1 latency degrades from 0.2ms to 4,800ms before OOM killer terminates the container.',
      rootCauseHint: 'Legacy IoT sensors are broadcasting {legacy_heartbeat, Node, Ts} and {debug_trace, Bin} tuples to the telemetry actor. Because loop/2 only matches {record_metric, Val} and {get_summary, From, Ref}, unmatched messages accumulate in the BEAM Save Queue forever!',
      fixObjective: 'Add a catch-all clause in loop/2 to discard unexpected noise messages without losing state, and add a 1,000ms timeout guard in get_summary/1.',
    },
    conceptMarkdown: `## Why This Matters in Production

At 03:14 UTC, a primary edge node running an IoT telemetry aggregator was killed by the Linux Out-Of-Memory (OOM) killer. Post-mortem crash analysis revealed that a single Erlang process—\`telemetry_actor\`—had ballooned to **14 GB of RAM**, holding over **1,200,000 unmatched messages** in its internal Save Queue!

Furthermore, client queries to \`get_summary/1\` had degraded from **0.2 milliseconds to 4,800 milliseconds** before timing out. The server was on the verge of a catastrophic cascading failure across all connected gateways.

## Deep Concept Breakdown & Under the Hood

### 1. Root Cause Analysis: The Leaky Save Queue
In Erlang, process mailboxes are **unbounded**. When an actor executes a \`receive\` block:
\`\`\`erlang
%% BUGGY IMPLEMENTATION:
loop(State = #{count := Count, total := Total}) ->
    receive
        {record_metric, Val} ->
            loop(State#{count => Count + 1, total => Total + Val});
        {get_summary, From, Ref} ->
            From ! {summary, Ref, State},
            loop(State)
        %% DANGER: Missing catch-all clause!
    end.
\`\`\`
1. Legacy hardware sensors and network monitors broadcast diagnostic tuples like \`{legacy_heartbeat, Node, Timestamp}\` and \`{debug_trace, Bin}\`.
2. When the telemetry actor runs \`receive\`, neither \`{record_metric, ...}\` nor \`{get_summary, ...}\` matches \`{legacy_heartbeat, ...}\`.
3. The BEAM places the heartbeat message into the actor's internal **Save Queue**.
4. Because the actor never matches these messages, **they are never removed**.
5. With 500 heartbeats arriving every second, the Save Queue grows by 1.8 million terms per hour.
6. When a valid \`{get_summary, ...}\` request finally arrives at the tail of the mailbox, the BEAM must scan past **all 1.8 million unmatched terms in memory**, turning an $O(1)$ receive into a CPU-crushing $O(N)$ linear pointer traversal!

### 2. The Solution: Defensive Mailbox Hygiene
To eliminate mailbox leaks in production actors:
1. **The Catch-All Wildcard Clause:** Always include a final wildcard clause in the \`receive\` block to discard unexpected messages and recurse with unchanged state:
   \`\`\`erlang
   _UnknownNoise ->
       loop(State)
   \`\`\`
2. **Client-Side Timeout Guards:** Client API functions that await a response should **never block indefinitely**. Always add \`after 1000 -> {error, timeout}\` to protect the caller from freezing if the actor is slow or restarted.

> [!warning] Production Concurrency Trap: Selective Receive Without Catch-All
> In long-lived singleton actors (registries, routers, telemetry pools), omitting a catch-all clause is the #1 cause of silent memory leaks in Erlang systems. Even if your current modules only send valid messages, third-party libraries, exit signals, or legacy nodes will eventually send unexpected messages to your PID.

## Parallel Worked Example

Consider a connection heartbeat auditor:

\`\`\`erlang
-module(connection_auditor).
-export([start/0, log_ping/1, get_stats/1, loop/1]).

start() ->
    spawn(fun() -> loop(#{pings => 0}) end).

log_ping(Pid) ->
    Pid ! ping,
    ok.

get_stats(Pid) ->
    Ref = make_ref(),
    Pid ! {get_stats, self(), Ref},
    receive
        {stats, Ref, Stats} -> {ok, Stats}
    after 1000 ->
        {error, timeout}
    end.

loop(Stats = #{pings := Cnt}) ->
    receive
        ping ->
            loop(Stats#{pings := Cnt + 1});
        {get_stats, From, Ref} ->
            From ! {stats, Ref, Stats},
            loop(Stats);
        %% Mailbox Hygiene: Discard unexpected socket noise
        _IgnoredNoise ->
            loop(Stats)
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (erts / erlang)
erlang:process_info(Pid, message_queue_len) -> {message_queue_len, integer()} | undefined
\`\`\`

## Assignment Specification

Triage and fix \`src/incident_mailbox_leak.erl\`:
1. Inspect the pre-loaded starter code. Notice that \`loop/1\` lacks a catch-all clause and \`get_summary/1\` lacks a timeout guard.
2. In \`loop/1\`, add a catch-all clause:
   \`\`\`erlang
   _Unknown ->
       loop(State)
   \`\`\`
3. In \`get_summary/1\`, add an \`after 1000 -> {error, timeout}\` fallback to prevent hanging callers when the target process is dead or slow.
4. Export \`inspect_queue_len/1\` (and alias \`get_mailbox_len/1\`) using \`erlang:process_info(Pid, message_queue_len)\`.
5. Export \`stop/1\` so the actor terminates cleanly on \`stop\`.

## Rules & Verification Constraints

- Mailbox length must remain strictly \`0\` even after blasting 300 unhandled heartbeat messages at the process.
- \`get_summary/1\` must return \`{error, timeout}\` within 1,000ms when invoked against a dead PID.`,
    mentalModelCheck: {
      question: 'What is the fatal production consequence of omitting a catch-all `_Other -> loop(State)` clause in an actor’s `receive` block?',
      codeSnippet: `loop(State) ->
    receive
        {metric, V} -> loop(update(V, State))
        %% Missing catch-all!
    end.`,
      options: [
        {
          id: 'A',
          label: 'Unmatched messages accumulate indefinitely in the BEAM Save Queue, consuming gigabytes of heap memory and degrading message scan times from O(1) to O(N).',
          isCorrect: true,
          explanation: 'Correct! When messages fail to match any pattern, the BEAM saves them in the Save Queue. As thousands of unmatched messages accumulate, memory balloons and every receive must linearly scan the entire backlog.',
        },
        {
          id: 'B',
          label: 'The BEAM immediately throws a function_clause exception and terminates the VM.',
          isCorrect: false,
          explanation: 'Receive blocks do not crash on unmatched messages; they simply save them.',
        },
        {
          id: 'C',
          label: 'The actor automatically forwards unhandled messages to the process registry.',
          isCorrect: false,
          explanation: 'The runtime does not automatically forward unhandled messages.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'process_info',
        module: 'erlang',
        signature: 'erlang:process_info(Pid, Item) -> {Item, Info} | undefined',
        typesSpec: ['Pid = pid()', 'Item = message_queue_len | memory | heap_size'],
        description: 'Returns real-time runtime telemetry for a process. Use message_queue_len to verify the mailbox is cleanly drained.',
        complexityNote: 'O(1) runtime memory inspection.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#process_info/2',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch05-07-1',
        title: 'Drain Unknown Messages (Mailbox Length = 0)',
        erlangCall: 'begin {ok, P} = incident_mailbox_leak:start(), [P ! {legacy_heartbeat, os:system_time()} || _ <- lists:seq(1, 50)], ok = incident_mailbox_leak:record_metric(P, 10), ok = incident_mailbox_leak:record_metric(P, 20), [P ! {legacy_heartbeat, os:system_time()} || _ <- lists:seq(1, 50)], timer:sleep(30), Len = incident_mailbox_leak:inspect_queue_len(P), {ok, Summary} = incident_mailbox_leak:get_summary(P), incident_mailbox_leak:stop(P), {Len, Summary} end',
        expectedOutput: '{0, #{count => 2, total => 30}}',
        explanation: 'Blasts 100 legacy heartbeat messages mixed with metrics; verifies mailbox length is 0 and summary stats are exact.',
      },
      {
        id: 'tc-ch05-07-2',
        title: 'Client Call Timeout Fallback',
        erlangCall: 'begin DeadPid = spawn(fun() -> ok end), timer:sleep(10), incident_mailbox_leak:get_summary(DeadPid) end',
        expectedOutput: '{error, timeout}',
        explanation: 'Calls get_summary/1 against a dead process; confirms caller returns {error, timeout} within 1,000ms instead of hanging forever.',
      },
    ],
    astRules: {
      requireTailRecursion: ['loop/1'],
      requiredConstructs: ['receive_after'],
    },
    solutionExplanation: 'Adds a catch-all `_Unknown -> loop(State)` clause to the actor receive loop to purge unhandled messages from the Save Queue, and adds `after 1000 -> {error, timeout}` to protect client callers.',
    files: [
      {
        name: 'incident_mailbox_leak.erl',
        path: 'src/incident_mailbox_leak.erl',
        content: `-module(incident_mailbox_leak).
-export([
    start/0,
    record_metric/2,
    get_summary/1,
    inspect_queue_len/1,
    get_mailbox_len/1,
    stop/1,
    loop/1
]).

%% Starts the telemetry actor
start() ->
    Pid = spawn(fun() -> loop(#{count => 0, total => 0}) end),
    {ok, Pid}.

%% Records a numeric metric value
record_metric(Pid, Val) ->
    Pid ! {record_metric, Val},
    ok.

%% Retrieves summary statistics: #{count => N, total => Sum}
get_summary(Pid) ->
    Ref = erlang:make_ref(),
    Pid ! {get_summary, self(), Ref},
    receive
        {summary, Ref, Summary} ->
            {ok, Summary}
        %% % TODO [INC-101 Triage]: Protect callers from hanging indefinitely
        %% % when the telemetry process is slow, crashing, or unreachable.
    end.

%% Returns current message queue length for diagnostic checks
inspect_queue_len(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

%% Backward-compatible alias
get_mailbox_len(Pid) ->
    inspect_queue_len(Pid).

%% Stops the actor cleanly
stop(Pid) ->
    Pid ! stop,
    ok.

%% Actor message loop
loop(State = #{count := Count, total := Total}) ->
    receive
        {record_metric, Val} ->
            loop(State#{count => Count + 1, total => Total + Val});
        {get_summary, From, Ref} ->
            From ! {summary, Ref, State},
            loop(State);
        stop ->
            ok
        %% % TODO [INC-101 Triage]: Defend against unbounded mailbox growth
        %% % caused by unhandled diagnostic and heartbeat messages.
    end.
`,
      },
    ],
    solutionFiles: {
      'src/incident_mailbox_leak.erl': `-module(incident_mailbox_leak).
-export([
    start/0,
    record_metric/2,
    get_summary/1,
    inspect_queue_len/1,
    get_mailbox_len/1,
    stop/1,
    loop/1
]).

start() ->
    Pid = spawn(fun() -> loop(#{count => 0, total => 0}) end),
    {ok, Pid}.

record_metric(Pid, Val) ->
    Pid ! {record_metric, Val},
    ok.

get_summary(Pid) ->
    Ref = erlang:make_ref(),
    Pid ! {get_summary, self(), Ref},
    receive
        {summary, Ref, Summary} ->
            {ok, Summary}
    after 1000 ->
        {error, timeout}
    end.

inspect_queue_len(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

get_mailbox_len(Pid) ->
    inspect_queue_len(Pid).

stop(Pid) ->
    Pid ! stop,
    ok.

loop(State = #{count := Count, total := Total}) ->
    receive
        {record_metric, Val} ->
            loop(State#{count => Count + 1, total => Total + Val});
        {get_summary, From, Ref} ->
            From ! {summary, Ref, State},
            loop(State);
        stop ->
            ok;
        _Unknown ->
            loop(State)
    end.
`,
    },
    starterCode: `-module(incident_mailbox_leak).
-export([
    start/0,
    record_metric/2,
    get_summary/1,
    inspect_queue_len/1,
    get_mailbox_len/1,
    stop/1,
    loop/1
]).

%% Starts the telemetry actor
start() ->
    Pid = spawn(fun() -> loop(#{count => 0, total => 0}) end),
    {ok, Pid}.

%% Records a numeric metric value
record_metric(Pid, Val) ->
    Pid ! {record_metric, Val},
    ok.

%% Retrieves summary statistics: #{count => N, total => Sum}
get_summary(Pid) ->
    Ref = erlang:make_ref(),
    Pid ! {get_summary, self(), Ref},
    receive
        {summary, Ref, Summary} ->
            {ok, Summary}
        %% % TODO [INC-101 Triage]: Protect callers from hanging indefinitely
        %% % when the telemetry process is slow, crashing, or unreachable.
    end.

%% Returns current message queue length for diagnostic checks
inspect_queue_len(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

%% Backward-compatible alias
get_mailbox_len(Pid) ->
    inspect_queue_len(Pid).

%% Stops the actor cleanly
stop(Pid) ->
    Pid ! stop,
    ok.

%% Actor message loop
loop(State = #{count := Count, total := Total}) ->
    receive
        {record_metric, Val} ->
            loop(State#{count => Count + 1, total => Total + Val});
        {get_summary, From, Ref} ->
            From ! {summary, Ref, State},
            loop(State);
        stop ->
            ok
        %% % TODO [INC-101 Triage]: Defend against unbounded mailbox growth
        %% % caused by unhandled diagnostic and heartbeat messages.
    end.
`,
    solutionCode: `-module(incident_mailbox_leak).
-export([
    start/0,
    record_metric/2,
    get_summary/1,
    inspect_queue_len/1,
    get_mailbox_len/1,
    stop/1,
    loop/1
]).

start() ->
    Pid = spawn(fun() -> loop(#{count => 0, total => 0}) end),
    {ok, Pid}.

record_metric(Pid, Val) ->
    Pid ! {record_metric, Val},
    ok.

get_summary(Pid) ->
    Ref = erlang:make_ref(),
    Pid ! {get_summary, self(), Ref},
    receive
        {summary, Ref, Summary} ->
            {ok, Summary}
    after 1000 ->
        {error, timeout}
    end.

inspect_queue_len(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

get_mailbox_len(Pid) ->
    inspect_queue_len(Pid).

stop(Pid) ->
    Pid ! stop,
    ok.

loop(State = #{count := Count, total := Total}) ->
    receive
        {record_metric, Val} ->
            loop(State#{count => Count + 1, total => Total + Val});
        {get_summary, From, Ref} ->
            From ! {summary, Ref, State},
            loop(State);
        stop ->
            ok;
        _Unknown ->
            loop(State)
    end.
`,
  },

  // ── Lesson 5.8: Problem Set ───────────────────────────────────────────────
  {
    id: 'ch05-l08',
    chapterNumber: 5,
    lessonNumber: 8,
    lessonType: 'problem_set',
    title: 'Chapter 5 Problem Set: Concurrent Bank Ledger & Order Actor (ledger_actor.erl)',
    difficulty: 'Production',
    xpReward: 250,
    visualScene: 'mailbox_selective_receive',
    conceptMarkdown: `## Why This Matters in Production

In banking engines, payment gateways, and order matching systems, **Data Consistency** is existential. Consider two concurrent withdrawal requests against an account with a $100 balance:
1. Request A checks the balance ($100 balance >= $80 requested) and approves an $80 withdrawal.
2. Simultaneously, Request B checks the balance ($100 balance >= $50 requested) and approves a $50 withdrawal.
3. Both deduct their amounts, leaving the final balance at -$30. This is the classic **Double-Spend Glitch**!

In traditional multithreaded backends (Java, C++, Go), engineers combat this by introducing row-level database locks, distributed Redis locks, or mutexes. However, locks introduce severe architectural hazards: **Deadlocks** (User 1 transfers to User 2 while User 2 transfers to User 1), lock convoying, and thread starvation under high concurrent traffic.

In the **Actor Model**, concurrency safety is solved mathematically without locks. A single \`ledger_actor\` process owns the bank accounts list. Because the actor's mailbox is **strictly sequential**, incoming deposits, withdrawals, and transfers are serialized one by one. The actor completes transaction $N$ and updates its state before it ever begins evaluating transaction $N+1$. Race conditions and deadlocks are **mathematically impossible**!

## Deep Concept Breakdown & Under the Hood

### 1. Atomic State Transitions in Memory
You will implement \`ledger_actor\`, maintaining account states in its tail-recursive loop:
\`\`\`erlang
{account, AccountId :: integer(), OwnerName :: binary(), Balance :: integer()}
\`\`\`
Because Erlang data structures are immutable, each transaction creates a new state list. If a transaction fails (e.g. \`insufficient_funds\` or \`not_found\`), the actor returns an error tuple and recurses with the **unmodified account list**, guaranteeing zero partial writes or balance corruption!

### 2. Multi-Account Atomic Transfers
A transfer between Account A and Account B must be completely atomic:
- If Account A lacks sufficient funds, Account B must NOT receive any money.
- If either account is missing, neither account's balance may change.
- In \`ledger_actor\`, this atomicity is trivial: the transaction is processed inside a single message clause, ensuring no other operation can interleave between deducting from Account A and adding to Account B!

### 3. Batch Processing with Dual Accumulators
The \`process_batch/2\` function receives a list of transactions, processing each item in sequence. It tracks both \`AppliedCount\` and \`RejectedCount\` using tail-recursive accumulators, applying valid transactions and skipping invalid ones without halting the batch.

> [!warning] Production Concurrency Trap: Forgetting Timeouts on Financial Calls
> Client calls querying financial ledger actors must always include a timeout. If a caller hangs waiting for a reply from an overloaded ledger, upstream payment gateways will timeout, leading to duplicate charges. Always use \`make_ref/0\` and \`receive ... after 1000\`.

## Parallel Worked Example

Consider a concurrent seat reservation actor for an airline flight:

\`\`\`erlang
-module(flight_seat_actor).
-export([start/1, reserve_seat/3, get_available/1, loop/1]).

start(InitialSeats) ->
    spawn(fun() -> loop(InitialSeats) end).

reserve_seat(Pid, SeatNumber, PassengerName) ->
    Ref = make_ref(),
    Pid ! {reserve, self(), Ref, SeatNumber, PassengerName},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

get_available(Pid) ->
    Ref = make_ref(),
    Pid ! {get_available, self(), Ref},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

loop(SeatsMap) ->
    receive
        {reserve, From, Ref, SeatNo, Passenger} ->
            case maps:find(SeatNo, SeatsMap) of
                {ok, available} ->
                    NewSeats = maps:put(SeatNo, {reserved, Passenger}, SeatsMap),
                    From ! {reply, Ref, {ok, reserved}},
                    loop(NewSeats);
                {ok, {reserved, Other}} ->
                    From ! {reply, Ref, {error, {seat_taken, Other}}},
                    loop(SeatsMap);
                error ->
                    From ! {reply, Ref, {error, invalid_seat}},
                    loop(SeatsMap)
            end;
        {get_available, From, Ref} ->
            Available = [S || {S, available} <- maps:to_list(SeatsMap)],
            From ! {reply, Ref, {ok, Available}},
            loop(SeatsMap)
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Concept: In-Memory Ledger Pattern
-record(account, {id, owner, balance}).

%% Tail-recursive loop serialization:
loop(Accounts) ->
    receive
        {transaction, From, Ref, Tx} ->
            {Result, NewAccounts} = apply_tx(Tx, Accounts),
            From ! {reply, Ref, Result},
            loop(NewAccounts)
    end.
\`\`\`

## Assignment Specification

Implement \`src/ledger_actor.erl\` exporting \`start/1\`, \`get_balance/2\`, \`process_transaction/2\`, \`process_batch/2\`, \`stop/1\`, and \`loop/1\`:

1. \`start(InitialAccounts) -> pid()\`:
   - Spawns \`loop(InitialAccounts)\` and returns the newly spawned actor's PID.
2. \`get_balance(Pid, AccountId) -> {ok, integer()} | {error, not_found} | {error, timeout}\`:
   - Uses \`Ref = make_ref()\`, sends \`{get_balance, self(), Ref, AccountId}\`, and waits up to 1,000ms for \`{reply, Ref, Result}\`.
3. \`process_transaction(Pid, TxTuple) -> {ok, Result} | {error, Reason} | {error, timeout}\`:
   - Uses \`Ref = make_ref()\`, sends \`{transaction, self(), Ref, TxTuple}\`, and waits up to 1,000ms for reply.
   - Supports three atomic transactions:
     - \`{deposit, AccountId, Amount}\` (\`Amount > 0\`): Increases balance, replies \`{ok, NewBalance}\`. Returns \`{error, not_found}\` if account does not exist.
     - \`{withdraw, AccountId, Amount}\` (\`Amount > 0\`):
       - If \`Balance >= Amount\`: deducts amount, replies \`{ok, NewBalance}\`.
       - If \`Balance < Amount\`: replies \`{error, insufficient_funds}\` and leaves balance unchanged.
       - If account missing: replies \`{error, not_found}\`.
     - \`{transfer, FromId, ToId, Amount}\` (\`Amount > 0\`):
       - Verifies **both** \`FromId\` and \`ToId\` exist. If either is missing, replies \`{error, not_found}\`.
       - If \`FromBalance < Amount\`: replies \`{error, insufficient_funds}\`.
       - If valid: atomically deducts \`Amount\` from \`FromId\` and adds \`Amount\` to \`ToId\`. Replies \`{ok, RemainingFromBalance}\`.
4. \`process_batch(Pid, TransactionsList) -> {ok, AppliedCount, RejectedCount} | {error, timeout}\`:
   - Uses \`Ref = make_ref()\`, sends \`{process_batch, self(), Ref, TransactionsList}\`, and waits up to 2,000ms for reply.
   - Evaluates transactions in order, applying valid ones and skipping invalid ones. Updates state with all successful transactions.
5. \`stop(Pid) -> ok | {error, timeout}\`:
   - Uses \`Ref = make_ref()\`, sends \`{stop, self(), Ref}\`, replies \`{reply, Ref, ok}\`, and terminates cleanly.

## Rules & Verification Constraints

- \`loop/1\` and all batch/update helpers must be strictly tail-recursive.
- Enforced by AST rule: \`requireTailRecursion: ["loop/1"]\`.
- All client functions must use \`make_ref/0\` and \`receive ... after\` timeouts (\`requiredConstructs: ["receive_after"]\`).
- Automated verification tests concurrent double-spend attacks with 10 parallel client workers!`,
    mentalModelCheck: {
      question: 'Why is an in-memory Erlang ledger actor immune to double-spend race conditions even when 1,000 concurrent client processes attempt to withdraw the same $100 balance simultaneously?',
      codeSnippet: `%% 1,000 client processes blasting simultaneous withdrawals:
[spawn(fun() -> ledger_actor:process_transaction(Ledger, {withdraw, 1, 100}) end)
 || _ <- lists:seq(1, 1000)].`,
      options: [
        {
          id: 'A',
          label: 'The ledger actor process serializes all incoming withdrawal messages sequentially through its private mailbox, processing one transaction at a time and updating its state before inspecting the next message.',
          isCorrect: true,
          explanation: 'Correct! The Actor Model eliminates race conditions through sequential mailbox processing. Even if 1,000 messages arrive at the same microsecond, they queue up in the mailbox and are handled one at a time.',
        },
        {
          id: 'B',
          label: 'Erlang uses Linux kernel hardware locks to freeze RAM addresses.',
          isCorrect: false,
          explanation: 'Erlang does not use hardware memory locks; state is isolated to the process heap.',
        },
        {
          id: 'C',
          label: 'The compiler converts concurrent withdrawals into SQL transactions.',
          isCorrect: false,
          explanation: 'Erlang actor state is purely in-memory; no SQL database is involved.',
        },
      ],
    },
    otpDocCards: [
      {
        functionName: 'spawn',
        module: 'erlang',
        signature: 'spawn(Fun) -> pid()',
        typesSpec: ['Fun = fun(() -> any())'],
        description: 'Creates a concurrent process with its own private heap and returns its unique PID.',
        complexityNote: 'O(1) allocation (~2.5 KB base heap).',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#spawn/1',
      },
      {
        functionName: 'make_ref',
        module: 'erlang',
        signature: 'erlang:make_ref() -> reference()',
        typesSpec: ['reference() = 128-bit unique token'],
        description: 'Returns an almost unique reference token used for request-reply correlation.',
        complexityNote: 'O(1) atomic counter increment.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#make_ref/0',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch05-08-1',
        title: 'Initial Account Balances',
        erlangCall: 'begin Accounts = [{account, 1, <<"Alice">>, 100}, {account, 2, <<"Bob">>, 50}], P = ledger_actor:start(Accounts), B1 = ledger_actor:get_balance(P, 1), B2 = ledger_actor:get_balance(P, 2), ledger_actor:stop(P), {B1, B2} end',
        expectedOutput: '{{ok, 100}, {ok, 50}}',
        explanation: 'Retrieves verified initial balances for Alice and Bob.',
      },
      {
        id: 'tc-ch05-08-2',
        title: 'Deposit and Insufficient Funds Withdrawal',
        erlangCall: 'begin Accounts = [{account, 1, <<"Alice">>, 100}], P = ledger_actor:start(Accounts), {ok, 150} = ledger_actor:process_transaction(P, {deposit, 1, 50}), Err = ledger_actor:process_transaction(P, {withdraw, 1, 200}), {ok, Final} = ledger_actor:get_balance(P, 1), ledger_actor:stop(P), {Err, Final} end',
        expectedOutput: '{{error, insufficient_funds}, 150}',
        explanation: 'Deposits 50 (balance becomes 150), rejects 200 withdrawal and preserves 150 balance.',
      },
      {
        id: 'tc-ch05-08-3',
        title: 'Atomic Inter-Account Transfer',
        erlangCall: 'begin Accounts = [{account, 1, <<"Alice">>, 100}, {account, 2, <<"Bob">>, 50}], P = ledger_actor:start(Accounts), {ok, 70} = ledger_actor:process_transaction(P, {transfer, 1, 2, 30}), {ok, B2} = ledger_actor:get_balance(P, 2), ledger_actor:stop(P), B2 end',
        expectedOutput: '80',
        explanation: 'Transfers 30 from Alice to Bob, leaving Alice with 70 and Bob with 80.',
      },
      {
        id: 'tc-ch05-08-4',
        title: 'Batch Processing Transactions',
        erlangCall: 'begin Accounts = [{account, 1, <<"Alice">>, 100}, {account, 2, <<"Bob">>, 50}], P = ledger_actor:start(Accounts), Txs = [{deposit, 1, 20}, {withdraw, 2, 100}, {transfer, 1, 2, 40}], {ok, App, Rej} = ledger_actor:process_batch(P, Txs), {ok, B1} = ledger_actor:get_balance(P, 1), {ok, B2} = ledger_actor:get_balance(P, 2), ledger_actor:stop(P), {App, Rej, B1, B2} end',
        expectedOutput: '{2, 1, 80, 90}',
        explanation: 'Applies valid deposit and transfer, rejects invalid withdrawal, returning final balances 80 and 90.',
      },
    ],
    astRules: {
      requireTailRecursion: ['loop/1'],
      requiredConstructs: ['receive_after'],
    },
    solutionExplanation: 'Implements an in-memory concurrent banking ledger actor with tail-recursive loop, atomic deposit/withdraw/transfer, and dual-accumulator batch execution.',
    files: [
      {
        name: 'ledger_actor.erl',
        path: 'src/ledger_actor.erl',
        content: `-module(ledger_actor).
-export([
    start/1,
    get_balance/2,
    process_transaction/2,
    process_batch/2,
    stop/1,
    loop/1
]).

%% Spawns the ledger actor initialized with InitialAccounts
start(InitialAccounts) ->
    %% Architectural Requirement: Spawn loop(InitialAccounts) and return PID
    ok.

%% Client API: queries account balance with 1000ms timeout
get_balance(Pid, AccountId) ->
    %% Architectural Requirement: make_ref(), send {get_balance, self(), Ref, AccountId}, receive reply
    ok.

%% Client API: processes single transaction: {deposit, Id, Amt} | {withdraw, Id, Amt} | {transfer, From, To, Amt}
process_transaction(Pid, TxTuple) ->
    %% Architectural Requirement: make_ref(), send {transaction, self(), Ref, TxTuple}, receive reply
    ok.

%% Client API: processes batch of transactions, returning {ok, AppliedCount, RejectedCount}
process_batch(Pid, TransactionsList) ->
    %% Architectural Requirement: make_ref(), send {process_batch, self(), Ref, TransactionsList}, receive reply
    ok.

%% Client API: stops actor cleanly
stop(Pid) ->
    %% Architectural Requirement: make_ref(), send {stop, self(), Ref}, receive reply
    ok.

%% ── Internal Actor Loop ──────────────────────────────────────────────────────
loop(Accounts) ->
    %% Architectural Requirement:
    %% Implement tail-recursive receive loop handling:
    %% 1. {get_balance, From, Ref, AccountId}
    %% 2. {transaction, From, Ref, Tx}
    %% 3. {process_batch, From, Ref, TxList}
    %% 4. {stop, From, Ref}
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/ledger_actor.erl': `-module(ledger_actor).
-export([
    start/1,
    get_balance/2,
    process_transaction/2,
    process_batch/2,
    stop/1,
    loop/1
]).

start(InitialAccounts) ->
    spawn(fun() -> loop(InitialAccounts) end).

get_balance(Pid, AccountId) ->
    Ref = make_ref(),
    Pid ! {get_balance, self(), Ref, AccountId},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

process_transaction(Pid, TxTuple) ->
    Ref = make_ref(),
    Pid ! {transaction, self(), Ref, TxTuple},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

process_batch(Pid, TransactionsList) ->
    Ref = make_ref(),
    Pid ! {process_batch, self(), Ref, TransactionsList},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

%% ── Internal Actor Loop ──────────────────────────────────────────────────────
loop(Accounts) ->
    receive
        {get_balance, From, Ref, AccountId} ->
            Result = case find_account(AccountId, Accounts) of
                {ok, {account, _, _, Balance}} -> {ok, Balance};
                error -> {error, not_found}
            end,
            From ! {reply, Ref, Result},
            loop(Accounts);

        {transaction, From, Ref, Tx} ->
            case apply_tx(Tx, Accounts) of
                {ok, ReplyVal, NewAccounts} ->
                    From ! {reply, Ref, {ok, ReplyVal}},
                    loop(NewAccounts);
                {error, Reason} ->
                    From ! {reply, Ref, {error, Reason}},
                    loop(Accounts)
            end;

        {process_batch, From, Ref, TxList} ->
            {AppliedCount, RejectedCount, NewAccounts} = run_batch(TxList, Accounts, 0, 0),
            From ! {reply, Ref, {ok, AppliedCount, RejectedCount}},
            loop(NewAccounts);

        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.

%% Helper: Look up account by ID
find_account(_Id, []) -> error;
find_account(Id, [{account, Id, Name, Bal} | _]) -> {ok, {account, Id, Name, Bal}};
find_account(Id, [_ | Rest]) -> find_account(Id, Rest).

%% Helper: Apply single transaction
apply_tx({deposit, AccountId, Amount}, Accounts) when Amount > 0 ->
    case find_account(AccountId, Accounts) of
        {ok, {account, Id, Name, Bal}} ->
            NewBal = Bal + Amount,
            NewAccounts = update_account({account, Id, Name, NewBal}, Accounts),
            {ok, NewBal, NewAccounts};
        error ->
            {error, not_found}
    end;
apply_tx({withdraw, AccountId, Amount}, Accounts) when Amount > 0 ->
    case find_account(AccountId, Accounts) of
        {ok, {account, Id, Name, Bal}} when Bal >= Amount ->
            NewBal = Bal - Amount,
            NewAccounts = update_account({account, Id, Name, NewBal}, Accounts),
            {ok, NewBal, NewAccounts};
        {ok, _} ->
            {error, insufficient_funds};
        error ->
            {error, not_found}
    end;
apply_tx({transfer, FromId, ToId, Amount}, Accounts) when Amount > 0 ->
    case {find_account(FromId, Accounts), find_account(ToId, Accounts)} of
        {{ok, {account, FromId, FromName, FromBal}}, {ok, {account, ToId, ToName, ToBal}}} ->
            if
                FromBal >= Amount ->
                    NewFromBal = FromBal - Amount,
                    NewToBal = ToBal + Amount,
                    Acc1 = update_account({account, FromId, FromName, NewFromBal}, Accounts),
                    Acc2 = update_account({account, ToId, ToName, NewToBal}, Acc1),
                    {ok, NewFromBal, Acc2};
                true ->
                    {error, insufficient_funds}
            end;
        _ ->
            {error, not_found}
    end;
apply_tx(_Invalid, _Accounts) ->
    {error, invalid_transaction}.

%% Helper: Replace updated account in list (strictly tail-recursive)
update_account(NewAcc, Accounts) ->
    update_account_tail(NewAcc, Accounts, []).

update_account_tail({account, Id, _, _} = NewAcc, [{account, Id, _, _} | Rest], Acc) ->
    reverse_append(Acc, [NewAcc | Rest]);
update_account_tail(NewAcc, [Head | Rest], Acc) ->
    update_account_tail(NewAcc, Rest, [Head | Acc]);
update_account_tail(_NewAcc, [], Acc) ->
    reverse_append(Acc, []).

reverse_append([], Acc) -> Acc;
reverse_append([H | T], Acc) -> reverse_append(T, [H | Acc]).

%% Helper: Process batch transactions tail-recursively
run_batch([], Accounts, Applied, Rejected) ->
    {Applied, Rejected, Accounts};
run_batch([Tx | Rest], Accounts, Applied, Rejected) ->
    case apply_tx(Tx, Accounts) of
        {ok, _ReplyVal, NewAccounts} ->
            run_batch(Rest, NewAccounts, Applied + 1, Rejected);
        {error, _Reason} ->
            run_batch(Rest, Accounts, Applied, Rejected + 1)
    end.
`,
    },
    starterCode: `-module(ledger_actor).
-export([
    start/1,
    get_balance/2,
    process_transaction/2,
    process_batch/2,
    stop/1,
    loop/1
]).

%% Spawns the ledger actor initialized with InitialAccounts
start(InitialAccounts) ->
    %% Architectural Requirement: Spawn loop(InitialAccounts) and return PID
    ok.

%% Client API: queries account balance with 1000ms timeout
get_balance(Pid, AccountId) ->
    %% Architectural Requirement: make_ref(), send {get_balance, self(), Ref, AccountId}, receive reply
    ok.

%% Client API: processes single transaction: {deposit, Id, Amt} | {withdraw, Id, Amt} | {transfer, From, To, Amt}
process_transaction(Pid, TxTuple) ->
    %% Architectural Requirement: make_ref(), send {transaction, self(), Ref, TxTuple}, receive reply
    ok.

%% Client API: processes batch of transactions, returning {ok, AppliedCount, RejectedCount}
process_batch(Pid, TransactionsList) ->
    %% Architectural Requirement: make_ref(), send {process_batch, self(), Ref, TransactionsList}, receive reply
    ok.

%% Client API: stops actor cleanly
stop(Pid) ->
    %% Architectural Requirement: make_ref(), send {stop, self(), Ref}, receive reply
    ok.

%% ── Internal Actor Loop ──────────────────────────────────────────────────────
loop(Accounts) ->
    %% Architectural Requirement:
    %% Implement tail-recursive receive loop handling:
    %% 1. {get_balance, From, Ref, AccountId}
    %% 2. {transaction, From, Ref, Tx}
    %% 3. {process_batch, From, Ref, TxList}
    %% 4. {stop, From, Ref}
    ok.
`,
    solutionCode: `-module(ledger_actor).
-export([
    start/1,
    get_balance/2,
    process_transaction/2,
    process_batch/2,
    stop/1,
    loop/1
]).

start(InitialAccounts) ->
    spawn(fun() -> loop(InitialAccounts) end).

get_balance(Pid, AccountId) ->
    Ref = make_ref(),
    Pid ! {get_balance, self(), Ref, AccountId},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

process_transaction(Pid, TxTuple) ->
    Ref = make_ref(),
    Pid ! {transaction, self(), Ref, TxTuple},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

process_batch(Pid, TransactionsList) ->
    Ref = make_ref(),
    Pid ! {process_batch, self(), Ref, TransactionsList},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

%% ── Internal Actor Loop ──────────────────────────────────────────────────────
loop(Accounts) ->
    receive
        {get_balance, From, Ref, AccountId} ->
            Result = case find_account(AccountId, Accounts) of
                {ok, {account, _, _, Balance}} -> {ok, Balance};
                error -> {error, not_found}
            end,
            From ! {reply, Ref, Result},
            loop(Accounts);

        {transaction, From, Ref, Tx} ->
            case apply_tx(Tx, Accounts) of
                {ok, ReplyVal, NewAccounts} ->
                    From ! {reply, Ref, {ok, ReplyVal}},
                    loop(NewAccounts);
                {error, Reason} ->
                    From ! {reply, Ref, {error, Reason}},
                    loop(Accounts)
            end;

        {process_batch, From, Ref, TxList} ->
            {AppliedCount, RejectedCount, NewAccounts} = run_batch(TxList, Accounts, 0, 0),
            From ! {reply, Ref, {ok, AppliedCount, RejectedCount}},
            loop(NewAccounts);

        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.

%% Helper: Look up account by ID
find_account(_Id, []) -> error;
find_account(Id, [{account, Id, Name, Bal} | _]) -> {ok, {account, Id, Name, Bal}};
find_account(Id, [_ | Rest]) -> find_account(Id, Rest).

%% Helper: Apply single transaction
apply_tx({deposit, AccountId, Amount}, Accounts) when Amount > 0 ->
    case find_account(AccountId, Accounts) of
        {ok, {account, Id, Name, Bal}} ->
            NewBal = Bal + Amount,
            NewAccounts = update_account({account, Id, Name, NewBal}, Accounts),
            {ok, NewBal, NewAccounts};
        error ->
            {error, not_found}
    end;
apply_tx({withdraw, AccountId, Amount}, Accounts) when Amount > 0 ->
    case find_account(AccountId, Accounts) of
        {ok, {account, Id, Name, Bal}} when Bal >= Amount ->
            NewBal = Bal - Amount,
            NewAccounts = update_account({account, Id, Name, NewBal}, Accounts),
            {ok, NewBal, NewAccounts};
        {ok, _} ->
            {error, insufficient_funds};
        error ->
            {error, not_found}
    end;
apply_tx({transfer, FromId, ToId, Amount}, Accounts) when Amount > 0 ->
    case {find_account(FromId, Accounts), find_account(ToId, Accounts)} of
        {{ok, {account, FromId, FromName, FromBal}}, {ok, {account, ToId, ToName, ToBal}}} ->
            if
                FromBal >= Amount ->
                    NewFromBal = FromBal - Amount,
                    NewToBal = ToBal + Amount,
                    Acc1 = update_account({account, FromId, FromName, NewFromBal}, Accounts),
                    Acc2 = update_account({account, ToId, ToName, NewToBal}, Acc1),
                    {ok, NewFromBal, Acc2};
                true ->
                    {error, insufficient_funds}
            end;
        _ ->
            {error, not_found}
    end;
apply_tx(_Invalid, _Accounts) ->
    {error, invalid_transaction}.

%% Helper: Replace updated account in list (strictly tail-recursive)
update_account(NewAcc, Accounts) ->
    update_account_tail(NewAcc, Accounts, []).

update_account_tail({account, Id, _, _} = NewAcc, [{account, Id, _, _} | Rest], Acc) ->
    reverse_append(Acc, [NewAcc | Rest]);
update_account_tail(NewAcc, [Head | Rest], Acc) ->
    update_account_tail(NewAcc, Rest, [Head | Acc]);
update_account_tail(_NewAcc, [], Acc) ->
    reverse_append(Acc, []).

reverse_append([], Acc) -> Acc;
reverse_append([H | T], Acc) -> reverse_append(T, [H | Acc]).

%% Helper: Process batch transactions tail-recursively
run_batch([], Accounts, Applied, Rejected) ->
    {Applied, Rejected, Accounts};
run_batch([Tx | Rest], Accounts, Applied, Rejected) ->
    case apply_tx(Tx, Accounts) of
        {ok, _ReplyVal, NewAccounts} ->
            run_batch(Rest, NewAccounts, Applied + 1, Rejected);
        {error, _Reason} ->
            run_batch(Rest, Accounts, Applied, Rejected + 1)
    end.
`,
  },
];

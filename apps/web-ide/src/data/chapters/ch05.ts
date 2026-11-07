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
%% Caller sends request tagged with self() as return address:
WorkerPid ! {fetch_telemetry, self(), cpu_temp}.

%% Worker pattern-matches CallerPid and dispatches response:
receive
    {fetch_telemetry, CallerPid, MetricName} ->
        CallerPid ! {telemetry_data, self(), MetricName, 72.5}
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

Consider a distributed audit sink that records telemetry metrics:

\`\`\`erlang
-module(audit_sink).
-export([start_sink/0, submit_event/3, fanout_alert/2, sink_loop/0]).

%% Spawns the sink actor using MFA spawn for hot-code reload compatibility
start_sink() ->
    spawn(?MODULE, sink_loop, []).

%% Client API: sends telemetry event and awaits confirmation
submit_event(SinkPid, DeviceId, Metric) ->
    SinkPid ! {record_metric, self(), DeviceId, Metric},
    receive
        {recorded, SinkPid, DeviceId} ->
            {ok, DeviceId}
    after 1000 ->
        {error, timeout}
    end.

%% Client API: fans out an emergency notification to observer processes
fanout_alert(ObserverPids, Alert) ->
    [Pid ! {emergency_notice, Alert} || Pid <- ObserverPids],
    {sent, length(ObserverPids)}.

%% Internal actor loop: executes inside the spawned process
sink_loop() ->
    receive
        {record_metric, CallerPid, DeviceId, _Metric} ->
            CallerPid ! {recorded, self(), DeviceId},
            sink_loop();
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

Implement \`src/ping_actor.erl\` exporting \`start_responder/0\`, \`responder_loop/0\`, \`ping/2\`, and \`broadcast/2\`:

### 1. \`start_responder/0\`
- **Input**: None.
- **Behavior**: Spawns a concurrent process running \`responder_loop/0\` and returns its process identifier.
- **Examples**:
  - \`is_pid(ping_actor:start_responder())\` returns \`true\`.

### 2. \`responder_loop/0\`
- **Input**: None (called inside the spawned process).
- **Behavior**: Executes an infinite tail-recursive message loop waiting for incoming messages:
  - On receipt of a ping request tuple containing the atom \`ping\`, the caller PID, and an arbitrary payload term: asynchronously sends a reply tuple containing the atom \`pong\`, the responder's own PID (\`self()\`), and the echoing payload back to the caller, then tail-recursively resumes \`responder_loop/0\`.
  - On receipt of the atom \`stop\`: terminates the loop cleanly and evaluates to \`ok\`.
- **Examples**:
  - Handles \`{ping, CallerPid, <<"syn">>}\` by sending \`{pong, self(), <<"syn">>}\` to \`CallerPid\`.
  - Handles \`stop\` by exiting cleanly with \`ok\`.

### 3. \`ping/2\`
- **Input**: \`ResponderPid\` (valid process identifier), \`Payload\` (arbitrary Erlang term).
- **Behavior**: Transmits an asynchronous request tuple containing the atom \`ping\`, the calling process's PID (\`self()\`), and \`Payload\` to \`ResponderPid\`. Waits up to 1,000 milliseconds in a selective receive block for a matching response tuple containing the atom \`pong\`, \`ResponderPid\`, and \`Payload\`. Returns a tagged success tuple wrapping \`Payload\` if received, or a timeout error tuple if 1,000 milliseconds elapse without a response.
- **Examples**:
  - \`ping_actor:ping(Pid, <<"syn">>)\` returns \`{ok, <<"syn">>}\`.
  - \`ping_actor:ping(Pid, {metric, 42})\` returns \`{ok, {metric, 42}}\`.
  - Calling \`ping/2\` against an unresponsive PID returns \`{error, timeout}\` after 1,000ms.

### 4. \`broadcast/2\`
- **Input**: \`PidsList\` (list of process identifiers), \`Msg\` (arbitrary Erlang term).
- **Behavior**: Iterates over \`PidsList\` and asynchronously dispatches \`Msg\` to every recipient process without blocking. Returns a tagged tuple reporting the total count of recipient processes to which the message was dispatched.
- **Examples**:
  - \`ping_actor:broadcast([P1, P2], stop)\` returns \`{sent, 2}\`.
  - \`ping_actor:broadcast([], stop)\` returns \`{sent, 0}\`.

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
-export([start_responder/0, ping/2, broadcast/2, responder_loop/0]).

%% @doc Spawn a concurrent responder actor executing responder_loop/0.
start_responder() ->
    ok.

%% @doc Receive loop handling ping requests and clean termination.
responder_loop() ->
    ok.

%% @doc Asynchronously send a ping request to responder and await matching pong response.
ping(_ResponderPid, _Payload) ->
    ok.

%% @doc Asynchronously dispatch message to each PID and return dispatched count.
broadcast(_PidsList, _Msg) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/ping_actor.erl': `-module(ping_actor).
-export([start_responder/0, ping/2, broadcast/2, responder_loop/0]).

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
-export([start_responder/0, ping/2, broadcast/2, responder_loop/0]).

%% @doc Spawn a concurrent responder actor executing responder_loop/0.
start_responder() ->
    ok.

%% @doc Receive loop handling ping requests and clean termination.
responder_loop() ->
    ok.

%% @doc Asynchronously send a ping request to responder and await matching pong response.
ping(_ResponderPid, _Payload) ->
    ok.

%% @doc Asynchronously dispatch message to each PID and return dispatched count.
broadcast(_PidsList, _Msg) ->
    ok.
`,
    solutionCode: `-module(ping_actor).
-export([start_responder/0, ping/2, broadcast/2, responder_loop/0]).

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
    {query_response, CorrelationId, Result} ->
        {ok, Result}
after 1000 ->
    {error, timeout}
end.
\`\`\`
The timer begins counting the moment the process begins waiting. If 1,000 milliseconds elapse without a matching message arriving, the \`after\` block executes.

### 3. The \`after 0 ->\` Non-Blocking Idiom
A timeout of **\`after 0\`** instructs the BEAM runtime: *"Check the mailbox right now. If a matching message is already present, process it immediately. If not, do NOT suspend; evaluate the after block in 0ms!"*

This zero-wait idiom has two critical production applications:
1. **Priority Draining:** Checking for urgent signals before falling back to lower-priority messages:
   \`\`\`erlang
   drain_priority_signals() ->
       receive
           {emergency_stop, Source} -> {halt, Source}
       after 0 ->
           receive
               {status_ping, Source} -> {ping, Source}
           after 0 ->
               no_signals
           end
       end.
   \`\`\`
2. **Non-Blocking Queue Draining:** Draining pending messages into an accumulator list for batch processing without blocking:
   \`\`\`erlang
   collect_incoming_chunks(Acc) ->
       receive
           {stream_chunk, Bytes} ->
               collect_incoming_chunks([Bytes | Acc])
       after 0 ->
           lists:reverse(Acc)
       end.
   \`\`\`

> [!warning] Production Concurrency Trap: Quadratic Mailbox Scanning
> Selective receive is powerful, but scanning a mailbox containing 50,000 unmatched messages searching for a specific pattern requires traversing 50,000 linked pointers for every single receive operation ($O(N)$ scan overhead). Always ensure your mailboxes are drained or use correlation references (\`make_ref()\`), as covered in Lesson 5.5!

## Parallel Worked Example

Consider a hardware gateway that prioritizes critical alerts over telemetry samples and queries peripheral devices:

\`\`\`erlang
-module(sensor_gateway).
-export([poll_event_queue/0, query_device_sync/3, purge_buffer/0]).

%% Consumes critical hardware alerts ahead of ambient telemetry samples
poll_event_queue() ->
    receive
        {hardware_fault, DeviceId, ErrCode} ->
            {critical, DeviceId, ErrCode}
    after 0 ->
        receive
            {metric_sample, DeviceId, Value} ->
                {standard, DeviceId, Value}
        after 0 ->
            empty_queue
        end
    end.

%% Synchronously queries a peripheral device process with timeout protection
query_device_sync(DevicePid, Command, TimeoutLimit) ->
    DevicePid ! {exec_cmd, self(), Command},
    receive
        {cmd_response, Command, Data} ->
            {ok, Data}
    after TimeoutLimit ->
        {error, device_timeout}
    end.

%% Drains pending packet events without blocking
purge_buffer() ->
    drain_buffer([]).

drain_buffer(BufferAcc) ->
    receive
        {packet, PacketData} ->
            drain_buffer([PacketData | BufferAcc])
    after 0 ->
        lists:reverse(BufferAcc)
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

Implement \`src/priority_mailbox.erl\` exporting \`receive_urgent_first/1\`, \`request_with_timeout/3\`, and \`flush_mailbox/0\`:

### 1. \`receive_urgent_first/1\`
- **Input**: \`ExpectedCount\` (non-negative integer).
- **Behavior**: Extracts up to \`ExpectedCount\` messages from the calling process's mailbox according to priority. For each message retrieved, it prioritizes extracting messages tagged with the atom \`urgent\` ahead of messages tagged with \`normal\`. If neither an urgent nor a normal message is currently available in the mailbox, it terminates draining without blocking. Returns a list containing the unpacked payload values of all extracted messages in priority-sorted order.
- **Examples**:
  - If mailbox contains \`{normal, 1}\`, \`{urgent, 99}\`, \`{normal, 2}\`, calling \`priority_mailbox:receive_urgent_first(3)\` returns \`[99, 1, 2]\`.
  - Calling \`priority_mailbox:receive_urgent_first(0)\` returns \`[]\`.

### 2. \`request_with_timeout/3\`
- **Input**: \`TargetPid\` (valid process identifier), \`RequestMsg\` (arbitrary Erlang term), \`TimeoutMs\` (integer milliseconds).
- **Behavior**: Asynchronously transmits a request tuple containing the atom \`request\`, the caller PID (\`self()\`), and \`RequestMsg\` to \`TargetPid\`. Awaits a matching reply tuple tagged with \`reply\`, the echoing \`RequestMsg\`, and the worker's result value. If a matching reply arrives before \`TimeoutMs\` milliseconds elapse, returns \`{ok, Result}\`. If the timer expires before a matching reply is received, returns \`{error, timeout}\` without crashing or hanging the caller.
- **Examples**:
  - \`priority_mailbox:request_with_timeout(WorkerPid, ping, 1000)\` returns \`{ok, pong}\` upon successful reply.
  - \`priority_mailbox:request_with_timeout(UnresponsivePid, ping, 50)\` returns \`{error, timeout}\` after 50ms.

### 3. \`flush_mailbox/0\`
- **Input**: None.
- **Behavior**: Drains all pending messages currently queued in the calling process's mailbox in a single non-blocking pass without suspending. Returns a list containing all extracted messages in their original FIFO arrival order. Once evaluated, the process mailbox is guaranteed to be completely empty.
- **Examples**:
  - If mailbox holds \`token_a\` followed by \`token_b\`, calling \`priority_mailbox:flush_mailbox()\` returns \`[token_a, token_b]\`.
  - If the mailbox is already empty, calling \`priority_mailbox:flush_mailbox()\` returns \`[]\`.

## Rules & Verification Constraints

- Must use the \`receive ... after\` construct (enforced by AST rule \`requiredConstructs: ["receive_after"]\`).
- \`receive_urgent_first/1\` must never block if fewer than \`ExpectedCount\` messages exist (fall back to whatever is available or use \`after 0\`).
- Must preserve FIFO order within the same priority level.`,
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

%% @doc Drains up to ExpectedCount messages prioritizing urgent tags over normal tags.
receive_urgent_first(_ExpectedCount) ->
    ok.

%% @doc Sends request tuple to TargetPid and awaits correlated reply with timeout fallback.
request_with_timeout(_TargetPid, _RequestMsg, _TimeoutMs) ->
    ok.

%% @doc Flushes and returns all pending messages from the process mailbox in FIFO order.
flush_mailbox() ->
    ok.
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

%% @doc Drains up to ExpectedCount messages prioritizing urgent tags over normal tags.
receive_urgent_first(_ExpectedCount) ->
    ok.

%% @doc Sends request tuple to TargetPid and awaits correlated reply with timeout fallback.
request_with_timeout(_TargetPid, _RequestMsg, _TimeoutMs) ->
    ok.

%% @doc Flushes and returns all pending messages from the process mailbox in FIFO order.
flush_mailbox() ->
    ok.
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
Consider a stateful actor maintaining an active connection count:
\`\`\`erlang
connection_loop(ActiveCount) ->
    receive
        {client_connected, SocketId} ->
            connection_loop(ActiveCount + 1);
        {query_load, CallerPid} ->
            CallerPid ! {current_load, ActiveCount},
            connection_loop(ActiveCount);
        terminate ->
            ok
    end.
\`\`\`
1. When started with \`connection_loop(0)\`, the process's stack frame contains \`ActiveCount = 0\`.
2. When a \`{client_connected, SocketId}\` message arrives, the process computes \`0 + 1 = 1\` and evaluates \`connection_loop(1)\`.
3. Because \`connection_loop/1\` is in the **tail position** (the final expression of the clause), the BEAM executes the \`call_last\` opcode: it overwrites the current stack frame with \`ActiveCount = 1\` without pushing a new frame!
4. The actor can run for years, handling billions of state transitions, while consuming a constant **~2.5 KB** of stack memory!

### 2. The Client-Server Abstraction Barrier
A critical software engineering discipline in Erlang is separating **Client API Functions** from **Internal Server Callbacks**:
- **The Anti-Pattern (Leaky Abstraction):** Forcing callers outside the module to manually construct protocol tuples and send operators. If the internal message protocol ever changes, every file in the codebase breaks!
- **The Erlang Pattern (Clean Abstraction Barrier):** Encapsulating both roles inside a single module:
  - **Client API Functions:** Execute inside the **caller's process** (\`self()\` is the caller!).
  - **Server Loop (\`loop/1\`):** Executes inside the **spawned actor process** (\`self()\` is the actor!).

### 3. Step-by-Step Message & Execution Flow
1. **Asynchronous Cast (Non-Blocking):**
   - The caller evaluates a client API function which sends an asynchronous message tuple via \`!\` and immediately returns \`ok\`.
   - The message is appended to the actor's private mailbox queue.
   - The actor process awakens, matches the cast tuple, computes the next state, and tail-calls its loop function.
2. **Synchronous Call (Blocking Query with Timeout):**
   - The caller evaluates a client query function which sends a tagged tuple containing \`self()\` as a return address.
   - The caller immediately suspends in a selective \`receive\` block with a timeout guard.
   - The actor receives the query, replies to the caller PID, and tail-calls its loop function with unchanged state.
   - The caller unblocks upon receiving the reply tuple and returns the payload to its caller.

> [!warning] Production Concurrency Trap: Forgetting Tail Position Breaks O(1) Memory
> If you write \`io:format("Done~n"), loop(NextState)\` inside a clause, \`loop/1\` is STILL in tail position because \`io:format\` executes first. But if you write \`loop(NextState) + 1\`, the recursive call is NO LONGER in tail position! The BEAM must allocate a new stack frame for every single message, causing a memory exhaustion crash after a few thousand messages.

## Parallel Worked Example

The following module implements a streaming telemetry actor tracking transferred bytes:

\`\`\`erlang
-module(network_stream).
-export([start_stream/1, append_chunk/2, query_transferred/1, terminate_stream/1, stream_loop/1]).

%% ── Client API (Executes in Caller Process) ───────────────────────────────────
start_stream(InitialBytes) ->
    spawn(fun() -> stream_loop(InitialBytes) end).

append_chunk(StreamPid, ByteCount) when ByteCount > 0 ->
    StreamPid ! {chunk_in, ByteCount},
    ok.

query_transferred(StreamPid) ->
    StreamPid ! {query_bytes, self()},
    receive
        {transferred, Bytes} ->
            {ok, Bytes}
    after 1000 ->
        {error, timeout}
    end.

terminate_stream(StreamPid) ->
    StreamPid ! stream_close,
    ok.

%% ── Server Loop (Executes in Actor Process) ───────────────────────────────────
stream_loop(TotalBytes) ->
    receive
        {chunk_in, ChunkSize} ->
            stream_loop(TotalBytes + ChunkSize);
        {query_bytes, CallerPid} ->
            CallerPid ! {transferred, TotalBytes},
            stream_loop(TotalBytes);
        stream_close ->
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

### 1. \`start/1\`
- **Input**: \`InitialValue\` (integer).
- **Behavior**: Spawns a concurrent stateful actor running \`loop(InitialValue)\` and returns its process identifier.
- **Examples**:
  - \`is_pid(counter_actor:start(100))\` returns \`true\`.

### 2. \`increment/2\`
- **Input**: \`Pid\` (process identifier), \`Delta\` (integer).
- **Behavior**: Asynchronously dispatches an increment message tagged with the atom \`increment\` and \`Delta\` to \`Pid\` without blocking the caller. Evaluates immediately to \`ok\`.
- **Examples**:
  - \`counter_actor:increment(P, 50)\` returns \`ok\`.

### 3. \`decrement/2\`
- **Input**: \`Pid\` (process identifier), \`Delta\` (integer).
- **Behavior**: Asynchronously dispatches a decrement message tagged with the atom \`decrement\` and \`Delta\` to \`Pid\` without blocking the caller. Evaluates immediately to \`ok\`.
- **Examples**:
  - \`counter_actor:decrement(P, 20)\` returns \`ok\`.

### 4. \`get_value/1\`
- **Input**: \`Pid\` (process identifier).
- **Behavior**: Synchronously queries \`Pid\` by sending a request tuple containing the atom \`get\` and the caller's PID (\`self()\`). Awaits a matching reply tuple tagged with the atom \`value\` and the current state integer for up to 1,000 milliseconds. Returns \`{ok, CurrentVal}\` upon receipt, or \`{error, timeout}\` if no response arrives within 1,000 milliseconds.
- **Examples**:
  - \`counter_actor:get_value(P)\` returns \`{ok, 130}\`.

### 5. \`stop/1\`
- **Input**: \`Pid\` (process identifier).
- **Behavior**: Asynchronously dispatches the atom \`stop\` to \`Pid\` and evaluates to \`ok\`.
- **Examples**:
  - \`counter_actor:stop(P)\` returns \`ok\`.

### 6. \`loop/1\`
- **Input**: \`CurrentVal\` (integer).
- **Behavior**: Executes an infinite tail-recursive message loop handling four distinct message shapes:
  - On receipt of \`{increment, Delta}\`: adds \`Delta\` to \`CurrentVal\` and tail-recursively resumes \`loop/1\` with the sum.
  - On receipt of \`{decrement, Delta}\`: subtracts \`Delta\` from \`CurrentVal\` and tail-recursively resumes \`loop/1\` with the difference.
  - On receipt of \`{get, Caller}\`: dispatches \`{value, CurrentVal}\` to \`Caller\` and tail-recursively resumes \`loop/1\` with \`CurrentVal\` unchanged.
  - On receipt of \`stop\`: cleanly exits the loop and evaluates to \`ok\`.
- **Examples**:
  - Increments state from \`100\` to \`150\` upon handling \`{increment, 50}\`.

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

%% @doc Spawns a concurrent stateful counter actor initialized with InitialValue.
start(_InitialValue) ->
    ok.

%% @doc Asynchronously dispatches an increment delta to the counter actor.
increment(_Pid, _Delta) ->
    ok.

%% @doc Asynchronously dispatches a decrement delta to the counter actor.
decrement(_Pid, _Delta) ->
    ok.

%% @doc Synchronously queries the current counter value with timeout fallback.
get_value(_Pid) ->
    ok.

%% @doc Asynchronously stops the counter actor process.
stop(_Pid) ->
    ok.

%% @doc Tail-recursive state loop maintaining current integer value.
loop(_CurrentVal) ->
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

%% @doc Spawns a concurrent stateful counter actor initialized with InitialValue.
start(_InitialValue) ->
    ok.

%% @doc Asynchronously dispatches an increment delta to the counter actor.
increment(_Pid, _Delta) ->
    ok.

%% @doc Asynchronously dispatches a decrement delta to the counter actor.
decrement(_Pid, _Delta) ->
    ok.

%% @doc Synchronously queries the current counter value with timeout fallback.
get_value(_Pid) ->
    ok.

%% @doc Asynchronously stops the counter actor process.
stop(_Pid) ->
    ok.

%% @doc Tail-recursive state loop maintaining current integer value.
loop(_CurrentVal) ->
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
To eliminate the stale reply hazard, every synchronous request should generate an opaque 128-bit reference token: **\`Ref = make_ref()\`**:
\`\`\`erlang
%% Caller creates an opaque correlation token:
Ref = make_ref(),
WorkerPid ! {compute_task, Ref, self(), TaskPayload},

%% Caller selectively waits only for the matching reference:
receive
    {task_result, Ref, Result} ->
        {ok, Result}
after 1000 ->
    {error, timeout}
end.
\`\`\`
If a delayed reply from an earlier timed-out request arrives with an older reference, the \`receive\` pattern \`{task_result, Ref, ...}\` **rejects it**, keeping it in the mailbox or ignoring it, completely preventing stale reply corruption!

## Parallel Worked Example

Consider a cluster license server managing concurrent seat allocations:

\`\`\`erlang
-module(license_server).
-export([start_server/1, checkout_seat/1, checkin_seat/1, query_available/0, shutdown/0, server_loop/2]).

start_server(MaxSeats) ->
    case whereis(license_server) of
        undefined ->
            Pid = spawn(fun() -> server_loop([], MaxSeats) end),
            register(license_server, Pid),
            {ok, Pid};
        _Pid ->
            {error, already_started}
    end.

checkout_seat(UserId) ->
    case whereis(license_server) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {checkout, Ref, self(), UserId},
            receive
                {seat_granted, Ref, SeatId} -> {ok, SeatId};
                {no_seats, Ref} -> {error, no_seats_available}
            after 1000 ->
                {error, timeout}
            end
    end.

checkin_seat(SeatId) ->
    case whereis(license_server) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {checkin, Ref, self(), SeatId},
            receive
                {checkin_ack, Ref} -> ok
            after 1000 ->
                {error, timeout}
            end
    end.

query_available() ->
    case whereis(license_server) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {query_count, Ref, self()},
            receive
                {available_count, Ref, Count} -> {ok, Count}
            after 1000 ->
                {error, timeout}
            end
    end.

shutdown() ->
    case whereis(license_server) of
        undefined -> {error, not_running};
        Pid ->
            Ref = make_ref(),
            Pid ! {shutdown, Ref, self()},
            receive
                {shutdown_ack, Ref} -> ok
            after 1000 ->
                {error, timeout}
            end
    end.

server_loop(ActiveSeats, RemainingCount) ->
    receive
        {checkout, Ref, CallerPid, UserId} when RemainingCount > 0 ->
            SeatId = {UserId, make_ref()},
            CallerPid ! {seat_granted, Ref, SeatId},
            server_loop([SeatId | ActiveSeats], RemainingCount - 1);
        {checkout, Ref, CallerPid, _UserId} ->
            CallerPid ! {no_seats, Ref},
            server_loop(ActiveSeats, RemainingCount);
        {checkin, Ref, CallerPid, SeatId} ->
            NewActive = lists:delete(SeatId, ActiveSeats),
            CallerPid ! {checkin_ack, Ref},
            server_loop(NewActive, RemainingCount + 1);
        {query_count, Ref, CallerPid} ->
            CallerPid ! {available_count, Ref, RemainingCount},
            server_loop(ActiveSeats, RemainingCount);
        {shutdown, Ref, CallerPid} ->
            unregister(license_server),
            CallerPid ! {shutdown_ack, Ref},
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

### 1. \`start_registered/0\`
- **Input**: None.
- **Behavior**: Checks if the atom \`named_kv_actor\` is currently registered on the local node. If already registered, returns \`{error, already_started}\`. If not registered, spawns a new concurrent process executing \`loop(#{}) \`, registers it under the atom \`named_kv_actor\`, and returns \`{ok, Pid}\`.
- **Examples**:
  - \`named_kv_actor:start_registered()\` returns \`{ok, Pid}\` on initial start.
  - Calling \`start_registered/0\` while the actor is running returns \`{error, already_started}\`.

### 2. \`put/2\`
- **Input**: \`Key\` (arbitrary Erlang term), \`Value\` (arbitrary Erlang term).
- **Behavior**: Verifies that \`named_kv_actor\` is currently registered; if unregistered, immediately returns \`{error, not_running}\` without attempting an atom send. Generates a unique correlation reference via \`make_ref/0\` and transmits an asynchronous request tuple containing the reference, the caller's PID (\`self()\`), \`Key\`, and \`Value\` to the registered actor process. Selectively awaits a matching acknowledgement tuple carrying the exact correlation reference for up to 1,000 milliseconds. Returns \`ok\` upon receipt, or \`{error, timeout}\` if the timer expires.
- **Examples**:
  - \`named_kv_actor:put(<<"k1">>, <<"v1">>)\` returns \`ok\`.
  - Calling \`put/2\` when the actor is stopped returns \`{error, not_running}\`.

### 3. \`get/1\`
- **Input**: \`Key\` (arbitrary Erlang term).
- **Behavior**: Verifies that \`named_kv_actor\` is currently registered; if unregistered, returns \`{error, not_running}\`. Generates a unique correlation reference via \`make_ref/0\` and transmits a query request tuple containing the reference, the caller's PID, and \`Key\` to the registered process. Selectively awaits a matching response tuple carrying the exact correlation reference for up to 1,000 milliseconds. Returns \`{ok, Value}\` if the key exists, \`{error, not_found}\` if absent, or \`{error, timeout}\` on timeout.
- **Examples**:
  - \`named_kv_actor:get(<<"k1">>)\` returns \`{ok, <<"v1">>}\`.
  - \`named_kv_actor:get(<<"missing">>)\` returns \`{error, not_found}\`.

### 4. \`stop/0\`
- **Input**: None.
- **Behavior**: Verifies that \`named_kv_actor\` is currently registered; if unregistered, returns \`{error, not_running}\`. Generates a unique correlation reference via \`make_ref/0\` and transmits a stop request tuple carrying the reference and the caller's PID to the registered process. Selectively awaits an acknowledgement tuple with matching reference for up to 1,000 milliseconds. Returns \`ok\` upon completion, guaranteeing the process has unregistered itself.
- **Examples**:
  - \`named_kv_actor:stop()\` returns \`ok\`.

### 5. \`loop/1\`
- **Input**: \`Map\` (map associative array).
- **Behavior**: Executes an infinite tail-recursive state loop handling key insertion, key retrieval, and clean termination:
  - On receipt of a put request: inserts \`Key => Value\` into \`Map\`, replies to the sender with a correlated acknowledgement matching the incoming reference, and tail-recursively resumes \`loop/1\` with the updated map.
  - On receipt of a get request: looks up \`Key\` in \`Map\`, replies to the sender with \`{ok, Value}\` or \`{error, not_found}\` tagged with the correlation reference, and tail-recursively resumes \`loop/1\` with unchanged map state.
  - On receipt of a stop request: unregisters the atom \`named_kv_actor\` from the node registry, sends a correlated acknowledgement back to the caller, and exits cleanly.
- **Examples**:
  - Preserves stored keys across multiple client requests.

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

%% @doc Spawns and registers actor under named_kv_actor if not already running.
start_registered() ->
    ok.

%% @doc Associates Key with Value in the registered actor map state.
put(_Key, _Value) ->
    ok.

%% @doc Retrieves Value associated with Key from the registered actor map state.
get(_Key) ->
    ok.

%% @doc Stops the registered actor process and unregisters its name.
stop() ->
    ok.

%% @doc Tail-recursive state loop holding map data.
loop(_Map) ->
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

%% @doc Spawns and registers actor under named_kv_actor if not already running.
start_registered() ->
    ok.

%% @doc Associates Key with Value in the registered actor map state.
put(_Key, _Value) ->
    ok.

%% @doc Retrieves Value associated with Key from the registered actor map state.
get(_Key) ->
    ok.

%% @doc Stops the registered actor process and unregisters its name.
stop() ->
    ok.

%% @doc Tail-recursive state loop holding map data.
loop(_Map) ->
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

In Erlang, before adopting the OTP \`gen_statem\` behaviour (taught in Chapter 7), the idiomatic way to model a Finite State Machine (FSM) is **Mutual Tail Recursion**: writing **one dedicated function per state** that transition states by directly tail-calling each other!

## Deep Concept Breakdown & Under the Hood

### 1. Modeling States as Distinct Functions
Instead of cramming all states into a single \`loop(State)\`, each state is its own dedicated function:
- State A contains a \`receive\` block that only handles operations valid during State A.
- State B contains a \`receive\` block that only handles operations valid during State B.

Consider a connection handler transitioning between \`connecting\` and \`connected\`:
\`\`\`erlang
connecting(Host, Port) ->
    receive
        {socket_ready, Socket} ->
            connected(Socket);  %% <-- State Transition via Tail Call!
        {connect_failed, Reason} ->
            {error, Reason}
    end.

connected(Socket) ->
    receive
        {send_data, Payload} ->
            send_raw(Socket, Payload),
            connected(Socket);
        disconnect ->
            close_socket(Socket),
            ok
    end.
\`\`\`

### 2. Tail-Call Optimization Across Different Functions
A common question from newcomers is: *"Does Tail-Call Optimization only work when a function recursively calls itself?"*
**No!** In the BEAM VM, tail-call optimization applies to **any function call in the tail position**, even if Function A calls Function B!
- When State Function A tail-calls State Function B, the compiler emits the \`call_only\` (or \`call_last\`) bytecode instruction.
- The BEAM deallocates the caller's stack arguments, writes the target arguments into registers, and jumps directly to Function B.
- **Zero additional stack frames are allocated!** An FSM actor can transition back and forth billions of times without consuming any extra memory!

### 3. Clear State-Specific Error Handling
Because each state has its own \`receive\` block, handling invalid actions is crystal clear:
- Actions valid in State A can return a helpful acknowledgement when called in State B without crashing.
- State-specific counters (e.g., failed attempt counters) are only tracked in the state functions that require them.
- Clean transitions reset or initialize state arguments explicitly on handoff.

> [!warning] Production Concurrency Trap: State Leaks Across Transitions
> When transitioning from State A to State B, be deliberate about which state variables carry over. For example, when entering an active session, transient failure counters from the negotiation state should be discarded or reset to clean defaults.

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

### 1. \`start/1\`
- **Input**: \`SecretCode\` (arbitrary Erlang term).
- **Behavior**: Spawns a concurrent actor starting in state \`locked(SecretCode, 0)\` and returns its process identifier.
- **Examples**:
  - \`is_pid(door_lock_fsm:start(<<"4321">>))\` returns \`true\`.

### 2. \`enter_code/2\`
- **Input**: \`Pid\` (process identifier), \`AttemptCode\` (arbitrary Erlang term).
- **Behavior**: Generates a correlation reference via \`make_ref/0\` and synchronously submits \`AttemptCode\` to \`Pid\`.
  - When in \`locked(SecretCode, FailedAttempts)\`: if \`AttemptCode\` equals \`SecretCode\`, replies with \`{ok, unlocked}\` and transitions into \`unlocked(SecretCode)\`; if \`AttemptCode\` does not match, increments the failed attempts count by 1, replies with \`{error, {wrong_code, NewCount}}\`, and remains in \`locked(SecretCode, NewCount)\`.
  - When in \`unlocked(SecretCode)\`: replies with \`{ok, already_unlocked}\` and remains in \`unlocked(SecretCode)\`.
  - Waits up to 1,000 milliseconds for the reply.
- **Examples**:
  - \`door_lock_fsm:enter_code(P, <<"4321">>)\` returns \`{ok, unlocked}\`.
  - \`door_lock_fsm:enter_code(P, <<"0000">>)\` returns \`{error, {wrong_code, 1}}\`.
  - Calling \`enter_code/2\` on an already unlocked door returns \`{ok, already_unlocked}\`.

### 3. \`lock/1\`
- **Input**: \`Pid\` (process identifier).
- **Behavior**: Generates a correlation reference and synchronously commands \`Pid\` to lock.
  - When in \`unlocked(SecretCode)\`: replies with \`ok\` and transitions to \`locked(SecretCode, 0)\` (resetting the failed attempts counter to 0).
  - When in \`locked(SecretCode, FailedAttempts)\`: replies with \`ok\` and remains in \`locked(SecretCode, FailedAttempts)\` without altering the existing counter.
- **Examples**:
  - \`door_lock_fsm:lock(P)\` returns \`ok\`.

### 4. \`get_state/1\`
- **Input**: \`Pid\` (process identifier).
- **Behavior**: Generates a correlation reference and synchronously queries the current state of \`Pid\`. Returns \`{locked, FailedAttempts}\` when currently locked, or the atom \`unlocked\` when currently unlocked.
- **Examples**:
  - \`door_lock_fsm:get_state(P)\` returns \`{locked, 0}\` initially.
  - \`door_lock_fsm:get_state(P)\` returns \`unlocked\` after code verification.

### 5. \`stop/1\`
- **Input**: \`Pid\` (process identifier).
- **Behavior**: Generates a correlation reference and synchronously commands \`Pid\` to terminate. Replies with \`ok\` and terminates cleanly.
- **Examples**:
  - \`door_lock_fsm:stop(P)\` returns \`ok\`.

### 6. \`locked/2\`
- **Input**: \`SecretCode\` (term), \`FailedAttempts\` (non-negative integer).
- **Behavior**: Mutual tail-recursive FSM state loop for the locked condition, handling code attempts, lock commands, state queries, and clean shutdown.
- **Examples**:
  - Transitions to \`unlocked(SecretCode)\` upon matching code entry.

### 7. \`unlocked/1\`
- **Input**: \`SecretCode\` (term).
- **Behavior**: Mutual tail-recursive FSM state loop for the unlocked condition, handling redundant code attempts, lock commands (resetting failures to 0), state queries, and clean shutdown.
- **Examples**:
  - Transitions to \`locked(SecretCode, 0)\` upon lock command.

## Rules & Verification Constraints

- Both \`locked/2\` and \`unlocked/1\` must be tail-recursive (enforced by AST rule \`requireTailRecursion: ["locked/2", "unlocked/1"]\`).
- Must use \`make_ref/0\` for request-reply synchronization with 1,000ms timeouts.`,
    mentalModelCheck: {
      question: 'Why does an actor alternating between mutually recursive state functions never run out of stack memory even after billions of transitions?',
      codeSnippet: `%% Mutually recursive tail call:
state_a(Arg) ->
    receive
        transition_to_b ->
            state_b(Arg)  %% Tail-call to a completely different function!
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

%% @doc Spawns the door lock FSM actor starting in the locked state.
start(_SecretCode) ->
    ok.

%% @doc Submits a PIN attempt to the door lock actor.
enter_code(_Pid, _AttemptCode) ->
    ok.

%% @doc Commands the door lock actor to enter the locked state.
lock(_Pid) ->
    ok.

%% @doc Queries the current state of the door lock actor.
get_state(_Pid) ->
    ok.

%% @doc Stops the door lock actor cleanly.
stop(_Pid) ->
    ok.

%% @doc FSM state function for the locked condition.
locked(_SecretCode, _FailedAttempts) ->
    ok.

%% @doc FSM state function for the unlocked condition.
unlocked(_SecretCode) ->
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

%% @doc Spawns the door lock FSM actor starting in the locked state.
start(_SecretCode) ->
    ok.

%% @doc Submits a PIN attempt to the door lock actor.
enter_code(_Pid, _AttemptCode) ->
    ok.

%% @doc Commands the door lock actor to enter the locked state.
lock(_Pid) ->
    ok.

%% @doc Queries the current state of the door lock actor.
get_state(_Pid) ->
    ok.

%% @doc Stops the door lock actor cleanly.
stop(_Pid) ->
    ok.

%% @doc FSM state function for the locked condition.
locked(_SecretCode, _FailedAttempts) ->
    ok.

%% @doc FSM state function for the unlocked condition.
unlocked(_SecretCode) ->
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
      rootCauseHint: 'Legacy IoT sensors are broadcasting unexpected diagnostic and heartbeat tuples to the telemetry actor. Because loop/1 only matches expected protocol messages, unmatched terms accumulate in the BEAM Save Queue indefinitely.',
      fixObjective: 'Defensively handle unexpected noise in loop/1 without losing state, and enforce a 1,000ms client timeout guard in get_summary/1.',
    },
    conceptMarkdown: `## Why This Matters in Production

At 03:14 UTC, a primary edge node running an IoT telemetry aggregator was killed by the Linux Out-Of-Memory (OOM) killer. Post-mortem crash analysis revealed that a single Erlang process—\`telemetry_actor\`—had ballooned to **14 GB of RAM**, holding over **1,200,000 unmatched messages** in its internal Save Queue!

Furthermore, client queries to \`get_summary/1\` had degraded from **0.2 milliseconds to 4,800 milliseconds** before timing out. The server was on the verge of a catastrophic cascading failure across all connected gateways.

## Deep Concept Breakdown & Under the Hood

### 1. Root Cause Analysis: The Leaky Save Queue
In Erlang, process mailboxes are **unbounded**. Consider a message broker with an incomplete receive pattern:
\`\`\`erlang
%% INCOMPLETE RECEIVE IMPLEMENTATION:
broker_loop(RoomState) ->
    receive
        {broadcast, Msg} ->
            dispatch_to_subscribers(RoomState, Msg),
            broker_loop(RoomState);
        {query_status, From, Ref} ->
            From ! {status, Ref, RoomState},
            broker_loop(RoomState)
        %% DANGER: Missing catch-all clause!
    end.
\`\`\`
1. Third-party monitoring probes and legacy sensors periodically dispatch unhandled diagnostic terms like \`{ping, Timestamp}\` or \`{probe_beacon, Node}\`.
2. When the broker runs \`receive\`, neither \`{broadcast, ...}\` nor \`{query_status, ...}\` matches the incoming probe term.
3. The BEAM runtime places the unmatched term into the actor's internal **Save Queue**.
4. Because the actor never matches these terms, **they are never removed**.
5. With hundreds of unhandled messages arriving every second, the Save Queue grows by millions of terms over hours.
6. When a valid message finally arrives at the tail of the mailbox, the BEAM must scan past **millions of unmatched terms in memory**, turning an $O(1)$ receive into a CPU-crushing $O(N)$ linear pointer traversal!

### 2. The Solution: Defensive Mailbox Hygiene
To eliminate mailbox leaks in production actors:
1. **The Catch-All Wildcard Clause:** Always include a final wildcard clause in the \`receive\` block to discard unexpected terms and recurse with unchanged state:
   \`\`\`erlang
   _UnexpectedNoise ->
       broker_loop(RoomState)
   \`\`\`
2. **Client-Side Timeout Guards:** Client API functions that await a response should **never block indefinitely**. Always add \`after 1000 -> {error, timeout}\` to protect the caller from freezing if the actor is slow, dead, or restarted.

> [!warning] Production Concurrency Trap: Selective Receive Without Catch-All
> In long-lived singleton actors (registries, routers, telemetry pools), omitting a catch-all clause is the #1 cause of silent memory leaks in Erlang systems. Even if your current modules only send valid messages, third-party libraries, exit signals, or legacy nodes will eventually send unexpected messages to your PID.

## Parallel Worked Example

Consider a packet cache worker with defensive mailbox hygiene:

\`\`\`erlang
-module(packet_cache).
-export([start/0, cache_packet/2, fetch_packet/2, inspect_depth/1, stop/1, loop/1]).

start() ->
    Pid = spawn(fun() -> loop(#{}) end),
    {ok, Pid}.

cache_packet(Pid, {Id, BinaryPayload}) ->
    Pid ! {store, Id, BinaryPayload},
    ok.

fetch_packet(Pid, Id) ->
    Ref = make_ref(),
    Pid ! {fetch, self(), Ref, Id},
    receive
        {packet_data, Ref, Result} ->
            Result
    after 1000 ->
        {error, timeout}
    end.

inspect_depth(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

stop(Pid) ->
    Pid ! stop,
    ok.

loop(Store) ->
    receive
        {store, Id, BinaryPayload} ->
            loop(maps:put(Id, BinaryPayload, Store));
        {fetch, From, Ref, Id} ->
            Reply = case maps:find(Id, Store) of
                {ok, Payload} -> {ok, Payload};
                error -> {error, not_found}
            end,
            From ! {packet_data, Ref, Reply},
            loop(Store);
        stop ->
            ok;
        %% Mailbox Hygiene: Discard unexpected diagnostic/network noise
        _IgnoredNoise ->
            loop(Store)
    end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (erts / erlang)
erlang:process_info(Pid, Item) -> {Item, Info} | undefined
  Types:
    Pid = pid()
    Item = message_queue_len | memory | heap_size
\`\`\`

## Assignment Specification

Triage and fix \`src/incident_mailbox_leak.erl\`:

### 1. \`get_summary/1\`
- **Diagnostic**: Client calls to \`get_summary/1\` currently wait in an unprotected \`receive\` block without a timeout boundary. If the target actor is slow, unresponsive, or terminated, calling processes freeze indefinitely.
- **Triage Objective**: Add an asynchronous timeout protection boundary that guarantees the caller receives \`{error, timeout}\` if no response arrives within 1,000 milliseconds.
- **Examples**:
  - \`incident_mailbox_leak:get_summary(DeadPid)\` returns \`{error, timeout}\` in ~1,000ms.

### 2. \`loop/1\`
- **Diagnostic**: Legacy diagnostic probes and network sensors are dispatching unhandled heartbeat messages (\`{legacy_heartbeat, ...}\`) to the actor's mailbox. Because \`loop/1\` only matches recognized protocol tuples, unmatched messages are permanently retained in the BEAM Save Queue, consuming gigabytes of heap memory.
- **Triage Objective**: Implement a defensive catch-all clause in \`loop/1\` that purges any unrecognized noise messages from the mailbox and tail-recursively continues running with existing state intact.
- **Verification Contract**:
  - The process mailbox length must remain strictly \`0\` even after 300 unhandled heartbeat messages are sent to the actor.
  - All recorded metrics must remain accurate (\`#{count => Count, total => Sum}\`).

### 3. \`inspect_queue_len/1\` & \`get_mailbox_len/1\`
- **Input**: \`Pid\` (process identifier).
- **Behavior**: Queries the BEAM runtime for \`Pid\`'s current \`message_queue_len\` via \`erlang:process_info/2\`. Returns the integer queue length, or \`0\` if the process is undefined. \`get_mailbox_len/1\` provides an identical backward-compatible alias.
- **Examples**:
  - \`incident_mailbox_leak:inspect_queue_len(P)\` returns \`0\`.

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

%% @doc Starts the telemetry aggregator actor with initial zeroed state.
start() ->
    Pid = spawn(fun() -> loop(#{count => 0, total => 0}) end),
    {ok, Pid}.

%% @doc Asynchronously records a numeric metric.
record_metric(Pid, Val) ->
    Pid ! {record_metric, Val},
    ok.

%% @doc Retrieves aggregated summary metrics from the telemetry actor.
get_summary(Pid) ->
    Ref = erlang:make_ref(),
    Pid ! {get_summary, self(), Ref},
    receive
        {summary, Ref, Summary} ->
            {ok, Summary}
    end.

%% @doc Returns the current message queue length of the process.
inspect_queue_len(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

%% @doc Backward-compatible alias for inspect_queue_len/1.
get_mailbox_len(Pid) ->
    inspect_queue_len(Pid).

%% @doc Asynchronously stops the telemetry actor process.
stop(Pid) ->
    Pid ! stop,
    ok.

%% @doc Main actor message loop accumulating telemetry count and total.
loop(State = #{count := Count, total := Total}) ->
    receive
        {record_metric, Val} ->
            loop(State#{count => Count + 1, total => Total + Val});
        {get_summary, From, Ref} ->
            From ! {summary, Ref, State},
            loop(State);
        stop ->
            ok
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

%% @doc Starts the telemetry aggregator actor with initial zeroed state.
start() ->
    Pid = spawn(fun() -> loop(#{count => 0, total => 0}) end),
    {ok, Pid}.

%% @doc Asynchronously records a numeric metric.
record_metric(Pid, Val) ->
    Pid ! {record_metric, Val},
    ok.

%% @doc Retrieves aggregated summary metrics from the telemetry actor.
get_summary(Pid) ->
    Ref = erlang:make_ref(),
    Pid ! {get_summary, self(), Ref},
    receive
        {summary, Ref, Summary} ->
            {ok, Summary}
    end.

%% @doc Returns the current message queue length of the process.
inspect_queue_len(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

%% @doc Backward-compatible alias for inspect_queue_len/1.
get_mailbox_len(Pid) ->
    inspect_queue_len(Pid).

%% @doc Asynchronously stops the telemetry actor process.
stop(Pid) ->
    Pid ! stop,
    ok.

%% @doc Main actor message loop accumulating telemetry count and total.
loop(State = #{count := Count, total := Total}) ->
    receive
        {record_metric, Val} ->
            loop(State#{count => Count + 1, total => Total + Val});
        {get_summary, From, Ref} ->
            From ! {summary, Ref, State},
            loop(State);
        stop ->
            ok
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

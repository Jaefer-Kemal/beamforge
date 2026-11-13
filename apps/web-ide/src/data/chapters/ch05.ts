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

OTP documentation specifies types and return values explicitly. \`erlang:process_info/2\` takes a PID and a list of queried metric atoms, returning an association list or \`undefined\` if the target process has already halted. Use the **Official OTP Doc Cards** below for full signature references.

## Parallel Worked Example

The following operations probe demonstrates querying cluster schedulers and isolated process memory in production:

\`\`\`erlang
-module(telemetry_probe).
-export([probe_system/0, probe_worker/1]).

%% Phase 1: Query global node scheduler and process limit metrics
probe_system() ->
    Schedulers = erlang:system_info(schedulers_online),
    ProcCount = erlang:system_info(process_count),
    ProcLimit = erlang:system_info(process_limit),
    #{
        schedulers_online => Schedulers,
        active_processes => ProcCount,
        max_process_limit => ProcLimit
    }.

%% Phase 2: Query isolated process control block (PCB) telemetry
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

### Architectural Notes:
1. **Global Introspection via \`erlang:system_info/1\`**: Reads VM-level metrics ($O(1)$) directly from ERTS without locks, capturing online schedulers and live process counts.
2. **Process Control Block Sampling**: \`erlang:process_info(Pid, Items)\` atomically inspects the memory allocation and pending message count of an isolated actor. If the process terminates concurrently during the call, ERTS safely returns \`undefined\`.
3. **Structured Domain Telemetry**: Rather than dumping raw ERTS tuple lists, the probe maps metrics into an explicit \`{ok, Map}\` contract suitable for downstream metrics ingestion.

## Assignment Specification

This is a **Guided Interactive Demo**. Explore the concurrency and telemetry capabilities of the BEAM VM in \`src/process_bench.erl\`.

### Functions Provided

#### \`run/0\`
- **Input**: None (\`()\`).
- **Behavior**: Executes the default 2,000 process benchmark and prints formatted benchmark statistics (total spawn duration, per-process latency, and average memory footprint) to standard output. Returns \`ok\`.
- **Examples**:
  - \`process_bench:run()\` returns \`ok\`.

#### \`run_bench/1\`
- **Input**: \`N :: pos_integer()\` (e.g. \`2000\`).
- **Behavior**: Measures the spawn time of \`N\` concurrent worker processes using \`erlang:monotonic_time(microsecond)\`, samples the memory footprint of the first 50 processes using \`inspect_process/1\`, cleanly terminates all spawned workers via \`stop\` messages, and returns a telemetry summary map \`#{spawned => N, avg_memory_bytes => AvgMem, elapsed_us => ElapsedUs}\`.
- **Examples**:
  - \`process_bench:run_bench(2000)\` returns \`#{spawned => 2000, avg_memory_bytes => 2688, elapsed_us => 4250}\`.

#### \`inspect_process/1\`
- **Input**: \`Pid :: pid()\`.
- **Behavior**: Queries the internal VM process control block via \`erlang:process_info(Pid, memory)\` to retrieve the process's allocated memory footprint in bytes. Returns the integer byte size, or \`2688\` if the process has already terminated.
- **Examples**:
  - \`process_bench:inspect_process(Pid)\` returns \`2688\`.

### Instructions

1. Inspect the implementation of \`src/process_bench.erl\`.
2. Click **\`▷ Run\`** to execute \`process_bench:run/0\` and observe high-speed process spawning in the output drawer.
3. Click **\`▶ Submit\`** to run the automated OTP 29 benchmark and memory telemetry verification suite.

## Rules & Verification Constraints

- Spawns \`N\` concurrent processes and measures real-time allocation.
- Average process memory footprint must remain under **4,096 bytes**.
- All spawned processes must be cleanly stopped with \`stop\` messages.
- Automated verifier checks module compilation, exports (\`run/0\`, \`run_bench/1\`, \`inspect_process/1\`), AST rules (\`erlang:process_info/2\`, \`erlang:monotonic_time/1\`, \`list_comprehension\`, \`guards\`), and live OTP memory bounds.`,
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
      {
        id: 'tc-ch05-01-2',
        title: 'Inspect Live Process Memory Allocation',
        erlangCall: 'begin Pid = spawn(fun() -> receive stop -> ok end end), Mem = process_bench:inspect_process(Pid), Pid ! stop, is_integer(Mem) andalso Mem > 500 andalso Mem < 10000 end',
        expectedOutput: 'true',
        explanation: 'Verifies that inspect_process/1 queries erlang:process_info/2 and retrieves the live process memory footprint.',
      },
      {
        id: 'tc-ch05-01-3',
        title: 'Benchmark 500 Processes & Scaling Invariants',
        erlangCall: 'begin #{spawned := S, avg_memory_bytes := M} = process_bench:run_bench(500), {S, M < 4096} end',
        expectedOutput: '{500, true}',
        explanation: 'Verifies that benchmark scaling functions correctly for smaller process pools while retaining strict memory bounds.',
      },
    ],
    astRules: {
      requiredCalls: ['erlang:process_info/2', 'erlang:monotonic_time/1'],
      requiredConstructs: ['list_comprehension', 'guards'],
    },
    solutionExplanation: 'Demonstrates ultralightweight BEAM process creation (~2.5 KB initial heap), preemptive reductions, and introspection via erlang:process_info/2.',
    files: [
      {
        name: 'process_bench.erl',
        path: 'src/process_bench.erl',
        content: `-module(process_bench).
-export([run/0, run_bench/1, inspect_process/1]).

%% @doc Execute the default 2,000 process benchmark and format timing and memory metrics to standard output.
run() ->
    Summary = run_bench(2000),
    #{spawned := N, avg_memory_bytes := AvgMem, elapsed_us := ElapsedUs} = Summary,
    io:format("==================================================~n"),
    io:format("BEAM Process Benchmark: ~p processes~n", [N]),
    io:format("Total Spawn Time: ~p us (~.2f us per process)~n", [ElapsedUs, ElapsedUs / N]),
    io:format("Average Memory per Process: ~p bytes (~.2f KB)~n", [AvgMem, AvgMem / 1024]),
    io:format("==================================================~n"),
    ok.

%% @doc Spawn N concurrent worker processes, measure spawn duration in microseconds, compute average memory footprint across the first 50 workers, cleanly terminate all spawned workers, and return a telemetry summary map.
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

%% @doc Return the memory footprint in bytes allocated to Pid, or a default baseline size if the target process has already terminated.
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

%% @doc Execute the default 2,000 process benchmark and format timing and memory metrics to standard output.
run() ->
    Summary = run_bench(2000),
    #{spawned := N, avg_memory_bytes := AvgMem, elapsed_us := ElapsedUs} = Summary,
    io:format("==================================================~n"),
    io:format("BEAM Process Benchmark: ~p processes~n", [N]),
    io:format("Total Spawn Time: ~p us (~.2f us per process)~n", [ElapsedUs, ElapsedUs / N]),
    io:format("Average Memory per Process: ~p bytes (~.2f KB)~n", [AvgMem, AvgMem / 1024]),
    io:format("==================================================~n"),
    ok.

%% @doc Spawn N concurrent worker processes, measure spawn duration in microseconds, compute average memory footprint across the first 50 workers, cleanly terminate all spawned workers, and return a telemetry summary map.
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

%% @doc Return the memory footprint in bytes allocated to Pid, or a default baseline size if the target process has already terminated.
inspect_process(Pid) ->
    case erlang:process_info(Pid, memory) of
        {memory, Bytes} -> Bytes;
        undefined -> 2688
    end.
`,
    },
    starterCode: `-module(process_bench).
-export([run/0, run_bench/1, inspect_process/1]).

%% @doc Execute the default 2,000 process benchmark and format timing and memory metrics to standard output.
run() ->
    Summary = run_bench(2000),
    #{spawned := N, avg_memory_bytes := AvgMem, elapsed_us := ElapsedUs} = Summary,
    io:format("==================================================~n"),
    io:format("BEAM Process Benchmark: ~p processes~n", [N]),
    io:format("Total Spawn Time: ~p us (~.2f us per process)~n", [ElapsedUs, ElapsedUs / N]),
    io:format("Average Memory per Process: ~p bytes (~.2f KB)~n", [AvgMem, AvgMem / 1024]),
    io:format("==================================================~n"),
    ok.

%% @doc Spawn N concurrent worker processes, measure spawn duration in microseconds, compute average memory footprint across the first 50 workers, cleanly terminate all spawned workers, and return a telemetry summary map.
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

%% @doc Return the memory footprint in bytes allocated to Pid, or a default baseline size if the target process has already terminated.
inspect_process(Pid) ->
    case erlang:process_info(Pid, memory) of
        {memory, Bytes} -> Bytes;
        undefined -> 2688
    end.
`,
    solutionCode: `-module(process_bench).
-export([run/0, run_bench/1, inspect_process/1]).

%% @doc Execute the default 2,000 process benchmark and format timing and memory metrics to standard output.
run() ->
    Summary = run_bench(2000),
    #{spawned := N, avg_memory_bytes := AvgMem, elapsed_us := ElapsedUs} = Summary,
    io:format("==================================================~n"),
    io:format("BEAM Process Benchmark: ~p processes~n", [N]),
    io:format("Total Spawn Time: ~p us (~.2f us per process)~n", [ElapsedUs, ElapsedUs / N]),
    io:format("Average Memory per Process: ~p bytes (~.2f KB)~n", [AvgMem, AvgMem / 1024]),
    io:format("==================================================~n"),
    ok.

%% @doc Spawn N concurrent worker processes, measure spawn duration in microseconds, compute average memory footprint across the first 50 workers, cleanly terminate all spawned workers, and return a telemetry summary map.
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

%% @doc Return the memory footprint in bytes allocated to Pid, or a default baseline size if the target process has already terminated.
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

The \`spawn/3\` BIF allocates an isolated ~2.5 KB process control block and starts execution at \`Module:Function(Args)\`. Message sending (\`Dest ! Message\`) evaluates asynchronously and yields \`Message\`. Consult the **Official OTP Doc Cards** below for full signature specifications.

## Parallel Worked Example

The following sensor monitor actor illustrates spawning a stateful process via MFA, sending asynchronous telemetry updates, and querying state:

\`\`\`erlang
-module(sensor_monitor).
-export([start_monitor/0, post_reading/3, query_status/1, monitor_loop/1]).

%% Phase 1: Process Creation via spawn/3 (MFA)
start_monitor() ->
    spawn(?MODULE, monitor_loop, [#{readings => 0, last_seen => none}]).

%% Phase 2: Client request-response protocol passing self()
post_reading(MonitorPid, SensorId, Value) ->
    MonitorPid ! {reading, self(), SensorId, Value},
    receive
        {ack, SensorId} ->
            ok
    after 500 ->
        {error, timeout}
    end.

%% Phase 3: Synchronous query returning state snapshot
query_status(MonitorPid) ->
    MonitorPid ! {get_status, self()},
    receive
        {status, State} ->
            {ok, State}
    after 500 ->
        {error, timeout}
    end.

%% Phase 4: Actor receive loop with state accumulation
monitor_loop(State) ->
    receive
        {reading, From, SensorId, _Val} ->
            From ! {ack, SensorId},
            Count = maps:get(readings, State, 0),
            monitor_loop(State#{readings := Count + 1, last_seen := SensorId});
        {get_status, From} ->
            From ! {status, State},
            monitor_loop(State);
        stop ->
            ok
    end.
\`\`\`

### Architectural Notes:
1. **Explicit Caller PID Protocol**: In \`post_reading/3\` and \`query_status/1\`, the client sends its own PID (\`self()\`) so the worker process knows where to route acknowledgments and responses.
2. **Selective Receive with Timeout**: The client waits up to 500 milliseconds for a matching response tuple, safely returning \`{error, timeout}\` if the worker process is delayed or unreachable.
3. **Clean Termination Handling**: Receiving the atom \`stop\` allows the process loop to terminate normally without leaking process descriptors or heap memory.

## Assignment Specification

Implement \`src/ping_actor.erl\` exporting \`start_responder/0\`, \`responder_loop/0\`, \`ping/2\`, and \`broadcast/2\`:

### 1. \`start_responder/0\`
- **Input**: None (\`()\`).
- **Behavior**: Spawns a concurrent process running \`responder_loop/0\` and returns its process identifier (\`pid()\`).
- **Examples**:
  - \`is_pid(ping_actor:start_responder())\` returns \`true\`.

### 2. \`responder_loop/0\`
- **Input**: None (called inside the spawned process).
- **Behavior**: Executes an infinite tail-recursive message loop waiting for incoming messages:
  - On receipt of a ping request tuple \`{ping, CallerPid, Payload}\`: asynchronously transmits \`{pong, self(), Payload}\` back to \`CallerPid\`, then tail-recursively resumes \`responder_loop/0\`.
  - On receipt of the atom \`stop\`: terminates the loop cleanly and evaluates to \`ok\`.
- **Examples**:
  - Handles \`{ping, CallerPid, <<"syn">>}\` by sending \`{pong, self(), <<"syn">>}\` to \`CallerPid\`.
  - Handles \`stop\` by exiting cleanly with \`ok\`.

### 3. \`ping/2\`
- **Input**: \`ResponderPid :: pid()\`, \`Payload :: term()\`.
- **Behavior**: Transmits an asynchronous request tuple \`{ping, self(), Payload}\` to \`ResponderPid\`. Waits up to 1,000 milliseconds in a selective receive block for a matching response tuple \`{pong, ResponderPid, Payload}\`. Returns \`{ok, Payload}\` if received, or \`{error, timeout}\` if 1,000 milliseconds elapse without a matching response.
- **Examples**:
  - \`ping_actor:ping(Pid, <<"syn">>)\` returns \`{ok, <<"syn">>}\`.
  - \`ping_actor:ping(Pid, {metric, 42})\` returns \`{ok, {metric, 42}}\`.
  - \`ping_actor:ping(DeadPid, <<"probe">>)\` returns \`{error, timeout}\`.

### 4. \`broadcast/2\`
- **Input**: \`PidsList :: [pid()]\`, \`Msg :: term()\`.
- **Behavior**: Iterates over \`PidsList\` and asynchronously dispatches \`Msg\` to every recipient process without blocking. Returns a tagged tuple \`{sent, Count}\` reporting the total count of recipient processes to which the message was dispatched.
- **Examples**:
  - \`ping_actor:broadcast([P1, P2], stop)\` returns \`{sent, 2}\`.
  - \`ping_actor:broadcast([], stop)\` returns \`{sent, 0}\`.

## Rules & Verification Constraints

- Must invoke \`erlang:self/0\` to include the caller's PID in request tuples.
- The \`responder_loop/0\` function must be strictly tail-recursive (enforced via AST and BEAM bytecode inspection).
- All message transmissions must use the asynchronous \`!\` operator.
- Must cleanly export \`start_responder/0\`, \`responder_loop/0\`, \`ping/2\`, and \`broadcast/2\`.`,
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
      {
        id: 'tc-ch05-02-3',
        title: 'Ping Timeout on Unresponsive Process',
        erlangCall: 'begin Unresponsive = spawn(fun() -> receive forever -> ok end end), Res = ping_actor:ping(Unresponsive, <<"timeout_test">>), Unresponsive ! stop, Res end',
        expectedOutput: '{error, timeout}',
        explanation: 'Verifies that ping/2 waits for up to 1,000 milliseconds and returns {error, timeout} when no pong reply arrives.',
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

%% @doc Spawn a new concurrent process executing responder_loop/0 and return its process identifier.
start_responder() ->
    ok.

%% @doc Receive loop handling ping request tuples by sending pong replies with responder PID, or terminating cleanly on stop.
responder_loop() ->
    ok.

%% @doc Asynchronously send a ping request tuple to ResponderPid with caller PID and Payload, returning {ok, Payload} on matching pong response or {error, timeout} after one second.
ping(_ResponderPid, _Payload) ->
    ok.

%% @doc Asynchronously send Msg to each process identifier in PidsList and return a tagged tuple with the total count dispatched.
broadcast(_PidsList, _Msg) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/ping_actor.erl': `-module(ping_actor).
-export([start_responder/0, ping/2, broadcast/2, responder_loop/0]).

%% @doc Spawn a new concurrent process executing responder_loop/0 and return its process identifier.
start_responder() ->
    spawn(fun() -> responder_loop() end).

%% @doc Receive loop handling ping request tuples by sending pong replies with responder PID, or terminating cleanly on stop.
responder_loop() ->
    receive
        {ping, CallerPid, Payload} ->
            CallerPid ! {pong, self(), Payload},
            responder_loop();
        stop ->
            ok
    end.

%% @doc Asynchronously send a ping request tuple to ResponderPid with caller PID and Payload, returning {ok, Payload} on matching pong response or {error, timeout} after one second.
ping(ResponderPid, Payload) ->
    ResponderPid ! {ping, self(), Payload},
    receive
        {pong, ResponderPid, Payload} ->
            {ok, Payload}
    after 1000 ->
        {error, timeout}
    end.

%% @doc Asynchronously send Msg to each process identifier in PidsList and return a tagged tuple with the total count dispatched.
broadcast(PidsList, Msg) ->
    [P ! Msg || P <- PidsList],
    {sent, length(PidsList)}.
`,
    },
    starterCode: `-module(ping_actor).
-export([start_responder/0, ping/2, broadcast/2, responder_loop/0]).

%% @doc Spawn a new concurrent process executing responder_loop/0 and return its process identifier.
start_responder() ->
    ok.

%% @doc Receive loop handling ping request tuples by sending pong replies with responder PID, or terminating cleanly on stop.
responder_loop() ->
    ok.

%% @doc Asynchronously send a ping request tuple to ResponderPid with caller PID and Payload, returning {ok, Payload} on matching pong response or {error, timeout} after one second.
ping(_ResponderPid, _Payload) ->
    ok.

%% @doc Asynchronously send Msg to each process identifier in PidsList and return a tagged tuple with the total count dispatched.
broadcast(_PidsList, _Msg) ->
    ok.
`,
    solutionCode: `-module(ping_actor).
-export([start_responder/0, ping/2, broadcast/2, responder_loop/0]).

%% @doc Spawn a new concurrent process executing responder_loop/0 and return its process identifier.
start_responder() ->
    spawn(fun() -> responder_loop() end).

%% @doc Receive loop handling ping request tuples by sending pong replies with responder PID, or terminating cleanly on stop.
responder_loop() ->
    receive
        {ping, CallerPid, Payload} ->
            CallerPid ! {pong, self(), Payload},
            responder_loop();
        stop ->
            ok
    end.

%% @doc Asynchronously send a ping request tuple to ResponderPid with caller PID and Payload, returning {ok, Payload} on matching pong response or {error, timeout} after one second.
ping(ResponderPid, Payload) ->
    ResponderPid ! {ping, self(), Payload},
    receive
        {pong, ResponderPid, Payload} ->
            {ok, Payload}
    after 1000 ->
        {error, timeout}
    end.

%% @doc Asynchronously send Msg to each process identifier in PidsList and return a tagged tuple with the total count dispatched.
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

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Syntax (system / expressions)
receive
    Pattern1 [when Guard1] -> Body1;
    Pattern2 [when Guard2] -> Body2
after TimeoutExpr ->
    TimeoutBody
end

erlang:send(Dest, Msg) -> Msg
erlang:self() -> pid()
\`\`\`

The \`receive ... after\` construct scans the mailbox queue for messages matching the defined patterns. Unmatched messages are placed into an internal Save Queue. If no message matches before \`TimeoutExpr\` milliseconds elapse, the \`after\` block evaluates. A timeout of \`after 0\` executes immediately without suspending the caller process.

## Parallel Worked Example

The following sensor gateway actor illustrates non-blocking priority polling, request deadlines, and non-blocking buffer draining:

\`\`\`erlang
-module(sensor_gateway).
-export([poll_event_queue/0, query_device_sync/3, purge_buffer/0]).

%% Phase 1: Non-blocking priority check consuming hardware alerts ahead of ambient telemetry
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

%% Phase 2: Synchronous RPC with self() return address and bounded receive deadline
query_device_sync(DevicePid, Command, TimeoutLimit) ->
    DevicePid ! {exec_cmd, self(), Command},
    receive
        {cmd_response, Command, Data} ->
            {ok, Data}
    after TimeoutLimit ->
        {error, device_timeout}
    end.

%% Phase 3: Non-blocking batch packet accumulator draining buffer into FIFO order
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

### Architectural Notes:
1. **Two-Stage Non-Blocking Inspection**: In \`poll_event_queue/0\`, the first \`receive\` block checks solely for \`{hardware_fault, ...}\`. If none exists, \`after 0\` falls through to check \`{metric_sample, ...}\`. If neither exists, the gateway evaluates to \`empty_queue\` in 0ms without suspending.
2. **Deterministic RPC Timeouts**: In \`query_device_sync/3\`, the client guards against unresponsive peripherals by enforcing a \`TimeoutLimit\` deadline, returning \`{error, device_timeout}\` if the peripheral drops the command.
3. **Save Queue FIFO Preservation**: In \`purge_buffer/0\`, each iteration pulls a packet from the mailbox. When the mailbox is empty, \`after 0\` triggers and \`lists:reverse/1\` restores original arrival ordering.

## Assignment Specification

Implement \`src/priority_mailbox.erl\` exporting \`receive_urgent_first/1\`, \`request_with_timeout/3\`, and \`flush_mailbox/0\`:

### 1. \`receive_urgent_first/1\`
- **Input**: \`ExpectedCount :: non_neg_integer()\`.
- **Behavior**: Extracts up to \`ExpectedCount\` messages from the calling process's mailbox according to priority. For each message retrieved, it prioritizes extracting messages tagged with the atom \`urgent\` ahead of messages tagged with \`normal\`. If neither an urgent nor a normal message is currently available in the mailbox, it terminates draining without blocking. Returns a list containing the unpacked payload values of all extracted messages in priority-sorted order.
- **Examples**:
  - If mailbox contains \`{normal, 1}\`, \`{urgent, 99}\`, \`{normal, 2}\`, calling \`priority_mailbox:receive_urgent_first(3)\` returns \`[99, 1, 2]\`.
  - Calling \`priority_mailbox:receive_urgent_first(0)\` returns \`[]\`.

### 2. \`request_with_timeout/3\`
- **Input**: \`TargetPid :: pid()\`, \`RequestMsg :: term()\`, \`TimeoutMs :: non_neg_integer()\`.
- **Behavior**: Asynchronously transmits a request tuple containing the atom \`request\`, the caller PID (\`self()\`), and \`RequestMsg\` to \`TargetPid\`. Awaits a matching reply tuple tagged with \`reply\`, the echoing \`RequestMsg\`, and the worker's result value. If a matching reply arrives before \`TimeoutMs\` milliseconds elapse, returns \`{ok, Result}\`. If the timer expires before a matching reply is received, returns \`{error, timeout}\` without crashing or hanging the caller.
- **Examples**:
  - \`priority_mailbox:request_with_timeout(WorkerPid, ping, 1000)\` returns \`{ok, pong}\` upon successful reply.
  - \`priority_mailbox:request_with_timeout(UnresponsivePid, ping, 50)\` returns \`{error, timeout}\` after 50ms.

### 3. \`flush_mailbox/0\`
- **Input**: None (\`()\`).
- **Behavior**: Drains all pending messages currently queued in the calling process's mailbox in a single non-blocking pass without suspending. Returns a list containing all extracted messages in their original FIFO arrival order. Once evaluated, the process mailbox is guaranteed to be completely empty.
- **Examples**:
  - If mailbox holds \`token_a\` followed by \`token_b\`, calling \`priority_mailbox:flush_mailbox()\` returns \`[token_a, token_b]\`.
  - If the mailbox is already empty, calling \`priority_mailbox:flush_mailbox()\` returns \`[]\`.

## Rules & Verification Constraints

- Must use the \`receive ... after\` construct (enforced by AST rule \`requiredConstructs: ['receive_after']\`).
- Must invoke \`erlang:self/0\` to include the caller's PID in request tuples.
- \`receive_urgent_first/1\` must never block if fewer than \`ExpectedCount\` messages exist in the mailbox.
- Must preserve FIFO order within the same priority level.
- Must cleanly export \`receive_urgent_first/1\`, \`request_with_timeout/3\`, and \`flush_mailbox/0\`.`,
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
        functionName: 'receive...after',
        module: 'erts',
        signature: 'receive Pattern [when Guard] -> Body after TimeoutExpr -> TimeoutBody end',
        typesSpec: ['TimeoutExpr = non_neg_integer() | infinity'],
        description: 'Scans the process mailbox queue for pattern matches, deferring unmatched terms to the Save Queue, and evaluating TimeoutBody if the deadline expires.',
        complexityNote: 'O(N) mailbox scan traversal, O(1) dequeue upon match.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/expressions.html#receive',
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
      requiredCalls: ['erlang:self/0'],
    },
    solutionExplanation: 'Uses receive ... after 0 to selectively prioritize {urgent, Payload} over {normal, Payload}, implements timeout guards, and flushes mailboxes using after 0 loops.',
    files: [
      {
        name: 'priority_mailbox.erl',
        path: 'src/priority_mailbox.erl',
        content: `-module(priority_mailbox).
-export([receive_urgent_first/1, request_with_timeout/3, flush_mailbox/0]).

%% @doc Extract up to ExpectedCount messages from the caller mailbox, prioritizing urgent tagged tuples over normal tagged tuples.
receive_urgent_first(_ExpectedCount) ->
    ok.

%% @doc Dispatch an asynchronous request tuple containing caller PID and RequestMsg to TargetPid, returning the worker result on reply or a timeout error if TimeoutMs elapses.
request_with_timeout(_TargetPid, _RequestMsg, _TimeoutMs) ->
    ok.

%% @doc Drain all pending messages currently queued in the caller process mailbox in a single non-blocking pass and return them in FIFO arrival order.
flush_mailbox() ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/priority_mailbox.erl': `-module(priority_mailbox).
-export([receive_urgent_first/1, request_with_timeout/3, flush_mailbox/0]).

%% @doc Extract up to ExpectedCount messages from the caller mailbox, prioritizing urgent tagged tuples over normal tagged tuples.
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

%% @doc Dispatch an asynchronous request tuple containing caller PID and RequestMsg to TargetPid, returning the worker result on reply or a timeout error if TimeoutMs elapses.
request_with_timeout(TargetPid, RequestMsg, TimeoutMs) ->
    TargetPid ! {request, self(), RequestMsg},
    receive
        {reply, RequestMsg, Result} ->
            {ok, Result}
    after TimeoutMs ->
        {error, timeout}
    end.

%% @doc Drain all pending messages currently queued in the caller process mailbox in a single non-blocking pass and return them in FIFO arrival order.
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

%% @doc Extract up to ExpectedCount messages from the caller mailbox, prioritizing urgent tagged tuples over normal tagged tuples.
receive_urgent_first(_ExpectedCount) ->
    ok.

%% @doc Dispatch an asynchronous request tuple containing caller PID and RequestMsg to TargetPid, returning the worker result on reply or a timeout error if TimeoutMs elapses.
request_with_timeout(_TargetPid, _RequestMsg, _TimeoutMs) ->
    ok.

%% @doc Drain all pending messages currently queued in the caller process mailbox in a single non-blocking pass and return them in FIFO arrival order.
flush_mailbox() ->
    ok.
`,
    solutionCode: `-module(priority_mailbox).
-export([receive_urgent_first/1, request_with_timeout/3, flush_mailbox/0]).

%% @doc Extract up to ExpectedCount messages from the caller mailbox, prioritizing urgent tagged tuples over normal tagged tuples.
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

%% @doc Dispatch an asynchronous request tuple containing caller PID and RequestMsg to TargetPid, returning the worker result on reply or a timeout error if TimeoutMs elapses.
request_with_timeout(TargetPid, RequestMsg, TimeoutMs) ->
    TargetPid ! {request, self(), RequestMsg},
    receive
        {reply, RequestMsg, Result} ->
            {ok, Result}
    after TimeoutMs ->
        {error, timeout}
    end.

%% @doc Drain all pending messages currently queued in the caller process mailbox in a single non-blocking pass and return them in FIFO arrival order.
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

spawn(Fun) -> pid()
self() -> pid()
\`\`\`

A process maintains state across time by passing the updated state value as the argument to its recursive loop function. Because the recursive call is the final expression in the clause (tail position), the BEAM applies **Tail-Call Optimization (TCO)**, reusing the active stack frame with $O(1)$ memory.

## Parallel Worked Example

The following module implements a streaming network telemetry actor tracking transferred bytes:

\`\`\`erlang
-module(network_stream).
-export([start_stream/1, append_chunk/2, query_transferred/1, terminate_stream/1, stream_loop/1]).

%% Phase 1: Client API Spawning Stateful Stream Actor (Executes in Caller Process)
start_stream(InitialBytes) ->
    spawn(fun() -> stream_loop(InitialBytes) end).

%% Phase 2: Asynchronous Cast Pipeline Passing Stream Chunks
append_chunk(StreamPid, ByteCount) when ByteCount > 0 ->
    StreamPid ! {chunk_in, ByteCount},
    ok.

%% Phase 3: Synchronous Call with Caller self() Return Address and Timeout Guard
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

%% Phase 4: Actor Tail-Recursive State Loop (Executes in Spawned Actor Process)
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

### Architectural Notes:
1. **The Client-Server Abstraction Barrier**: \`start_stream/1\`, \`append_chunk/2\`, \`query_transferred/1\`, and \`terminate_stream/1\` execute in the caller process. The caller never constructs raw internal protocol tuples directly.
2. **Tail-Call Optimization (TCO)**: In \`stream_loop/1\`, every recursive call is strictly in tail position. The BEAM reuses the same stack frame via the \`call_last\` instruction, ensuring the actor runs indefinitely with constant memory.
3. **Clean Process Termination**: Receiving \`stream_close\` evaluates to \`ok\` and exits the loop without recursing, allowing the process to terminate cleanly and its heap memory to be reclaimed.

## Assignment Specification

Implement \`src/counter_actor.erl\` exporting \`start/1\`, \`increment/2\`, \`decrement/2\`, \`get_value/1\`, \`stop/1\`, and \`loop/1\`:

### 1. \`start/1\`
- **Input**: \`InitialValue :: integer()\`.
- **Behavior**: Spawns a concurrent stateful actor running \`loop(InitialValue)\` and returns its process identifier (\`pid()\`).
- **Examples**:
  - \`is_pid(counter_actor:start(100))\` returns \`true\`.

### 2. \`increment/2\`
- **Input**: \`Pid :: pid()\`, \`Delta :: integer()\`.
- **Behavior**: Asynchronously dispatches an increment message tagged with the atom \`increment\` and \`Delta\` to \`Pid\` without blocking the caller. Evaluates immediately to \`ok\`.
- **Examples**:
  - \`counter_actor:increment(P, 50)\` returns \`ok\`.

### 3. \`decrement/2\`
- **Input**: \`Pid :: pid()\`, \`Delta :: integer()\`.
- **Behavior**: Asynchronously dispatches a decrement message tagged with the atom \`decrement\` and \`Delta\` to \`Pid\` without blocking the caller. Evaluates immediately to \`ok\`.
- **Examples**:
  - \`counter_actor:decrement(P, 20)\` returns \`ok\`.

### 4. \`get_value/1\`
- **Input**: \`Pid :: pid()\`.
- **Behavior**: Synchronously queries \`Pid\` by sending a request tuple containing the atom \`get\` and the caller PID (\`self()\`). Awaits a matching reply tuple tagged with the atom \`value\` and the current state integer for up to 1,000 milliseconds. Returns \`{ok, CurrentVal}\` upon receipt, or \`{error, timeout}\` if no response arrives within 1,000 milliseconds.
- **Examples**:
  - \`counter_actor:get_value(P)\` returns \`{ok, 130}\`.
  - \`counter_actor:get_value(UnresponsivePid)\` returns \`{error, timeout}\`.

### 5. \`stop/1\`
- **Input**: \`Pid :: pid()\`.
- **Behavior**: Asynchronously dispatches the atom \`stop\` to \`Pid\` and evaluates to \`ok\`.
- **Examples**:
  - \`counter_actor:stop(P)\` returns \`ok\`.

### 6. \`loop/1\`
- **Input**: \`CurrentVal :: integer()\`.
- **Behavior**: Executes an infinite tail-recursive message loop handling four distinct message shapes:
  - On receipt of \`{increment, Delta}\`: adds \`Delta\` to \`CurrentVal\` and tail-recursively resumes \`loop/1\` with the sum.
  - On receipt of \`{decrement, Delta}\`: subtracts \`Delta\` from \`CurrentVal\` and tail-recursively resumes \`loop/1\` with the difference.
  - On receipt of \`{get, Caller}\`: dispatches \`{value, CurrentVal}\` to \`Caller\` and tail-recursively resumes \`loop/1\` with \`CurrentVal\` unchanged.
  - On receipt of \`stop\`: cleanly exits the loop and evaluates to \`ok\`.
- **Examples**:
  - Increments state from \`100\` to \`150\` upon handling \`{increment, 50}\`.

## Rules & Verification Constraints

- The \`loop/1\` function must be strictly tail-recursive (enforced by AST rule \`requireTailRecursion: ['loop/1']\`).
- Must invoke \`erlang:self/0\` in \`get_value/1\` to include the caller PID in request tuples.
- Callers must not know internal tuple message formats; all operations must pass through exported client functions.
- Must cleanly export \`start/1\`, \`increment/2\`, \`decrement/2\`, \`get_value/1\`, \`stop/1\`, and \`loop/1\`.
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
      {
        functionName: 'self',
        module: 'erlang',
        signature: 'self() -> pid()',
        typesSpec: ['pid() = process identifier'],
        description: 'Returns the process identifier (PID) of the currently executing process.',
        complexityNote: 'O(1) register lookup.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#self/0',
      },
      {
        functionName: 'receive...after',
        module: 'erts',
        signature: 'receive Pattern [when Guard] -> Body after TimeoutExpr -> TimeoutBody end',
        typesSpec: ['TimeoutExpr = non_neg_integer() | infinity'],
        description: 'Awaits incoming message tuples matching Pattern, executing TimeoutBody if TimeoutExpr milliseconds elapse.',
        complexityNote: 'O(N) mailbox scan traversal, O(1) dequeue upon match.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/expressions.html#receive',
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
      {
        id: 'tc-ch05-04-3',
        title: 'Client Query Timeout on Unresponsive Worker',
        erlangCall: 'begin Dummy = spawn(fun() -> receive after 500 -> ok end end), counter_actor:get_value(Dummy) end',
        expectedOutput: '{error, timeout}',
        explanation: 'Verifies that get_value/1 waits up to 1,000 milliseconds and safely returns {error, timeout} if the worker drops the query.',
      },
    ],
    astRules: {
      requireTailRecursion: ['loop/1'],
      requiredCalls: ['erlang:self/0'],
    },
    solutionExplanation: 'Implements tail-recursive loop/1 with O(1) stack memory and provides clean Client API functions that encapsulate message formats and request-reply synchronization.',
    files: [
      {
        name: 'counter_actor.erl',
        path: 'src/counter_actor.erl',
        content: `-module(counter_actor).
-export([start/1, increment/2, decrement/2, get_value/1, stop/1, loop/1]).

%% @doc Spawn a concurrent stateful counter actor initialized with InitialValue and return its process identifier.
start(_InitialValue) ->
    ok.

%% @doc Asynchronously dispatch an increment delta to the counter actor process.
increment(_Pid, _Delta) ->
    ok.

%% @doc Asynchronously dispatch a decrement delta to the counter actor process.
decrement(_Pid, _Delta) ->
    ok.

%% @doc Synchronously query the counter actor value with caller PID return address, awaiting reply up to one second.
get_value(_Pid) ->
    ok.

%% @doc Asynchronously dispatch a stop command to terminate the counter actor process.
stop(_Pid) ->
    ok.

%% @doc Tail-recursive state loop handling increment, decrement, query, and termination messages in constant stack space.
loop(_CurrentVal) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/counter_actor.erl': `-module(counter_actor).
-export([start/1, increment/2, decrement/2, get_value/1, stop/1, loop/1]).

%% @doc Spawn a concurrent stateful counter actor initialized with InitialValue and return its process identifier.
start(InitialValue) ->
    spawn(fun() -> loop(InitialValue) end).

%% @doc Asynchronously dispatch an increment delta to the counter actor process.
increment(Pid, Delta) ->
    Pid ! {increment, Delta},
    ok.

%% @doc Asynchronously dispatch a decrement delta to the counter actor process.
decrement(Pid, Delta) ->
    Pid ! {decrement, Delta},
    ok.

%% @doc Synchronously query the counter actor value with caller PID return address, awaiting reply up to one second.
get_value(Pid) ->
    Pid ! {get, self()},
    receive
        {value, Val} ->
            {ok, Val}
    after 1000 ->
        {error, timeout}
    end.

%% @doc Asynchronously dispatch a stop command to terminate the counter actor process.
stop(Pid) ->
    Pid ! stop,
    ok.

%% @doc Tail-recursive state loop handling increment, decrement, query, and termination messages in constant stack space.
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

%% @doc Spawn a concurrent stateful counter actor initialized with InitialValue and return its process identifier.
start(_InitialValue) ->
    ok.

%% @doc Asynchronously dispatch an increment delta to the counter actor process.
increment(_Pid, _Delta) ->
    ok.

%% @doc Asynchronously dispatch a decrement delta to the counter actor process.
decrement(_Pid, _Delta) ->
    ok.

%% @doc Synchronously query the counter actor value with caller PID return address, awaiting reply up to one second.
get_value(_Pid) ->
    ok.

%% @doc Asynchronously dispatch a stop command to terminate the counter actor process.
stop(_Pid) ->
    ok.

%% @doc Tail-recursive state loop handling increment, decrement, query, and termination messages in constant stack space.
loop(_CurrentVal) ->
    ok.
`,
    solutionCode: `-module(counter_actor).
-export([start/1, increment/2, decrement/2, get_value/1, stop/1, loop/1]).

%% @doc Spawn a concurrent stateful counter actor initialized with InitialValue and return its process identifier.
start(InitialValue) ->
    spawn(fun() -> loop(InitialValue) end).

%% @doc Asynchronously dispatch an increment delta to the counter actor process.
increment(Pid, Delta) ->
    Pid ! {increment, Delta},
    ok.

%% @doc Asynchronously dispatch a decrement delta to the counter actor process.
decrement(Pid, Delta) ->
    Pid ! {decrement, Delta},
    ok.

%% @doc Synchronously query the counter actor value with caller PID return address, awaiting reply up to one second.
get_value(Pid) ->
    Pid ! {get, self()},
    receive
        {value, Val} ->
            {ok, Val}
    after 1000 ->
        {error, timeout}
    end.

%% @doc Asynchronously dispatch a stop command to terminate the counter actor process.
stop(Pid) ->
    Pid ! stop,
    ok.

%% @doc Tail-recursive state loop handling increment, decrement, query, and termination messages in constant stack space.
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

The \`register/2\` BIF binds an atom to an active PID in the local node registry table. \`whereis/1\` safely inspects the table, returning the PID or \`undefined\` if unmapped. Calling \`unregister/1\` cleanly releases the atom mapping. \`make_ref/0\` produces a 128-bit monotonically increasing unique token used to correlate asynchronous request-reply messages across concurrency barriers.

## Parallel Worked Example

Consider a cluster license server managing concurrent seat allocations:

\`\`\`erlang
-module(license_server).
-export([start_server/1, checkout_seat/1, checkin_seat/1, query_available/0, shutdown/0, server_loop/2]).

%% Phase 1: Safe Registration & Service Boot (Avoid Multiple Registration Collisions)
start_server(MaxSeats) ->
    case whereis(license_server) of
        undefined ->
            Pid = spawn(fun() -> server_loop([], MaxSeats) end),
            register(license_server, Pid),
            {ok, Pid};
        _Pid ->
            {error, already_started}
    end.

%% Phase 2: Client Abstraction API with make_ref() Request Correlation & whereis/1 Guard
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

%% Phase 3: Synchronous Cluster Query & Termination Protocol
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

%% Phase 4: Actor State Loop Handling Seat Allocation, Checkin, and Dynamic Unregistration
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

### Architectural Notes:
1. **Unregistered Atom Guarding**: Every client API function resolves \`whereis(license_server)\` prior to transmission. If unmapped, it immediately evaluates to \`{error, not_running}\`, protecting the caller from fatal \`badarg\` exit signals.
2. **Correlation References with \`make_ref/0\`**: Every synchronous call generates a unique 128-bit reference token (\`Ref = make_ref()\`) carried in the request envelope. The selective \`receive\` block pattern matches strictly against \`{..., Ref, ...}\`, neutralizing stale replies from previous timeouts.
3. **State Invariants & Clean Unregistration**: When \`shutdown/0\` is evaluated, the actor removes the atom mapping via \`unregister(license_server)\`, delivers a correlated acknowledgement to the caller, and exits without recursing.

## Assignment Specification

Implement \`src/named_kv_actor.erl\` registered under atom \`named_kv_actor\`:

### 1. \`start_registered/0\`
- **Input**: None (\`()\`).
- **Behavior**: Inspects the local node registry to determine if the atom \`named_kv_actor\` is currently mapped. If an existing registration is detected, evaluates to \`{error, already_started}\`. If unmapped, spawns a new concurrent actor process executing \`loop(#{}) \`, registers the spawned process under the atom \`named_kv_actor\`, and returns \`{ok, Pid}\`.
- **Examples**:
  - \`named_kv_actor:start_registered()\` returns \`{ok, Pid}\` on clean boot.
  - Calling \`named_kv_actor:start_registered()\` when the actor is already active returns \`{error, already_started}\`.

### 2. \`put/2\`
- **Input**: \`Key :: term()\`, \`Value :: term()\`.
- **Behavior**: Inspects the local process registry for \`named_kv_actor\`. If the atom is unregistered, immediately evaluates to \`{error, not_running}\` without attempting an atom send. When running, generates an opaque correlation token via \`make_ref/0\` and dispatches a request containing the token, caller process identifier (\`self()\`), \`Key\`, and \`Value\` to the registered process. Selectively awaits a matching confirmation carrying the exact correlation token for up to 1,000 milliseconds. Evaluates to \`ok\` on receipt, or \`{error, timeout}\` if the deadline expires.
- **Examples**:
  - \`named_kv_actor:put(<<"session_token">>, <<"active_123">>)\` returns \`ok\`.
  - Calling \`named_kv_actor:put(k, v)\` when the actor is not running returns \`{error, not_running}\`.

### 3. \`get/1\`
- **Input**: \`Key :: term()\`.
- **Behavior**: Inspects the local process registry for \`named_kv_actor\`. If unregistered, evaluates to \`{error, not_running}\`. When running, generates an opaque correlation token via \`make_ref/0\` and dispatches a query containing the token, caller process identifier, and \`Key\` to the registered process. Selectively awaits a matching response carrying the exact correlation token for up to 1,000 milliseconds. Evaluates to \`{ok, Value}\` if present, \`{error, not_found}\` if absent, or \`{error, timeout}\` if the deadline expires.
- **Examples**:
  - \`named_kv_actor:get(<<"session_token">>)\` returns \`{ok, <<"active_123">>}\`.
  - \`named_kv_actor:get(<<"missing_token">>)\` returns \`{error, not_found}\`.

### 4. \`stop/0\`
- **Input**: None (\`()\`).
- **Behavior**: Inspects the local process registry for \`named_kv_actor\`. If unregistered, evaluates to \`{error, not_running}\`. When running, generates an opaque correlation token via \`make_ref/0\` and dispatches a stop command carrying the token and caller process identifier to the registered process. Selectively awaits a matching confirmation carrying the exact correlation token for up to 1,000 milliseconds. Evaluates to \`ok\` on completion, guaranteeing the process has unregistered itself.
- **Examples**:
  - \`named_kv_actor:stop()\` returns \`ok\`.
  - Calling \`named_kv_actor:stop()\` when the actor is not running returns \`{error, not_running}\`.

### 5. \`loop/1\`
- **Input**: \`Map :: #{term() => term()}\`.
- **Behavior**: Executes a tail-recursive actor state loop handling key insertion, key query, and service termination in constant stack space:
  - On put request: associates \`Key\` with \`Value\` in the map state, delivers a correlated acknowledgement to the sender, and tail-recursively continues with the updated map.
  - On get request: queries \`Key\` in the map state, delivers \`{ok, Value}\` or \`{error, not_found}\` tagged with the matching correlation token to the sender, and tail-recursively continues with unchanged map state.
  - On stop request: unregisters the atom \`named_kv_actor\` from the node registry table, delivers a correlated acknowledgement to the sender, and cleanly terminates without recursing.
- **Examples**:
  - Preserves key-value bindings across concurrent queries.
  - Unregisters the atom name from the local node registry table upon termination.

## Rules & Verification Constraints

- Must invoke \`erlang:make_ref/0\`, \`erlang:register/2\`, and \`erlang:whereis/1\` (enforced by AST rule \`requiredCalls\`).
- Must maintain strict tail recursion on \`loop/1\` (enforced by AST rule \`requireTailRecursion: ['loop/1']\`).
- Must guard every client call against unregistered atoms returning \`{error, not_running}\` without crashing with \`badarg\`.
- Must cleanly export \`start_registered/0\`, \`put/2\`, \`get/1\`, \`stop/0\`, and \`loop/1\`.`,
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
      {
        id: 'tc-ch05-05-3',
        title: 'Safe Return on Unregistered Service',
        erlangCall: 'begin catch named_kv_actor:stop(), named_kv_actor:get(<<"test_token">>) end',
        expectedOutput: '{error, not_running}',
        explanation: 'Verifies that calling get/1 when the actor is stopped returns {error, not_running} without crashing the caller process with badarg.',
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

%% @doc Spawn and register the actor under atom named_kv_actor if not already registered, returning {ok, Pid} or {error, already_started}.
start_registered() ->
    ok.

%% @doc Associate Key with Value in the registered actor map state, awaiting correlated acknowledgement up to one second.
put(_Key, _Value) ->
    ok.

%% @doc Retrieve Value associated with Key from the registered actor map state, awaiting correlated reply up to one second.
get(_Key) ->
    ok.

%% @doc Request the registered actor to unregister its atom name and cleanly terminate, awaiting correlated acknowledgement up to one second.
stop() ->
    ok.

%% @doc Tail-recursive state loop storing key-value pairs in an immutable map and answering correlated client requests.
loop(_Map) ->
    ok.
`,
      },
    ],
    solutionFiles: {
      'src/named_kv_actor.erl': `-module(named_kv_actor).
-export([start_registered/0, put/2, get/1, stop/0, loop/1]).

%% @doc Spawn and register the actor under atom named_kv_actor if not already registered, returning {ok, Pid} or {error, already_started}.
start_registered() ->
    case whereis(named_kv_actor) of
        undefined ->
            Pid = spawn(fun() -> loop(#{}) end),
            register(named_kv_actor, Pid),
            {ok, Pid};
        _Pid ->
            {error, already_started}
    end.

%% @doc Associate Key with Value in the registered actor map state, awaiting correlated acknowledgement up to one second.
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

%% @doc Retrieve Value associated with Key from the registered actor map state, awaiting correlated reply up to one second.
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

%% @doc Request the registered actor to unregister its atom name and cleanly terminate, awaiting correlated acknowledgement up to one second.
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

%% @doc Tail-recursive state loop storing key-value pairs in an immutable map and answering correlated client requests.
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

%% @doc Spawn and register the actor under atom named_kv_actor if not already registered, returning {ok, Pid} or {error, already_started}.
start_registered() ->
    ok.

%% @doc Associate Key with Value in the registered actor map state, awaiting correlated acknowledgement up to one second.
put(_Key, _Value) ->
    ok.

%% @doc Retrieve Value associated with Key from the registered actor map state, awaiting correlated reply up to one second.
get(_Key) ->
    ok.

%% @doc Request the registered actor to unregister its atom name and cleanly terminate, awaiting correlated acknowledgement up to one second.
stop() ->
    ok.

%% @doc Tail-recursive state loop storing key-value pairs in an immutable map and answering correlated client requests.
loop(_Map) ->
    ok.
`,
    solutionCode: `-module(named_kv_actor).
-export([start_registered/0, put/2, get/1, stop/0, loop/1]).

%% @doc Spawn and register the actor under atom named_kv_actor if not already registered, returning {ok, Pid} or {error, already_started}.
start_registered() ->
    case whereis(named_kv_actor) of
        undefined ->
            Pid = spawn(fun() -> loop(#{}) end),
            register(named_kv_actor, Pid),
            {ok, Pid};
        _Pid ->
            {error, already_started}
    end.

%% @doc Associate Key with Value in the registered actor map state, awaiting correlated acknowledgement up to one second.
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

%% @doc Retrieve Value associated with Key from the registered actor map state, awaiting correlated reply up to one second.
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

%% @doc Request the registered actor to unregister its atom name and cleanly terminate, awaiting correlated acknowledgement up to one second.
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

%% @doc Tail-recursive state loop storing key-value pairs in an immutable map and answering correlated client requests.
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

In traditional languages, developers attempt to model this with a single monolithic function stuffed with mutable flags or nested \`switch\` branches. As features expand, this monolithic function degenerates into fragile code where invalid state transitions silently corrupt state.

In Erlang, before adopting the OTP \`gen_statem\` behaviour (taught in Chapter 7), the idiomatic way to model a Finite State Machine (FSM) is **Mutual Tail Recursion**: writing **one dedicated function per state** that transition states by directly tail-calling each other!

## Deep Concept Breakdown & Under the Hood

### 1. Modeling States as Distinct Functions
Instead of cramming all states into a single loop function, each state is its own dedicated function:
- State A contains a \`receive\` block that only handles operations valid during State A.
- State B contains a \`receive\` block that only handles operations valid during State B.

Consider a connection handler transitioning between \`connecting\` and \`connected\`:
\`\`\`erlang
connecting(Host, Port) ->
    receive
        {socket_ready, Socket} ->
            connected(Socket);  %% State Transition via Tail Call!
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
Does Tail-Call Optimization only work when a function recursively calls itself?
**No!** In the BEAM VM, tail-call optimization applies to **any function call in the tail position**, even if Function A calls Function B:
- When State Function A tail-calls State Function B, the compiler emits the \`call_only\` (or \`call_last\`) bytecode instruction.
- The BEAM deallocates the caller's stack arguments, writes the target arguments into virtual registers, and jumps directly to Function B.
- **Zero additional stack frames are allocated.** An FSM actor can transition back and forth billions of times without consuming any extra memory ($O(1)$ constant stack space).

### 3. Clear State-Specific Error Handling
Because each state has its own \`receive\` block, handling invalid actions is crystal clear:
- Actions valid in State A can return a helpful acknowledgement when called in State B without crashing.
- State-specific counters (such as failed attempt counters) are only tracked in the state functions that require them.
- Clean transitions reset or initialize state arguments explicitly on handoff.

> [!warning] Production Concurrency Trap: State Leaks Across Transitions
> When transitioning from State A to State B, be deliberate about which state variables carry over. For example, when unlocking a vault or door, transient failure counters from the locked state should be discarded or reset to clean defaults.

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

## Parallel Worked Example: The Vending Machine State Actor

Consider a vending machine transitioning between \`idle\` and \`paid\` states:

\`\`\`erlang
-module(vending_fsm).
-export([start/0, insert_coin/2, select_item/1, refund/1, stop/1, idle/0, paid/1]).

%% === Phase 1: Client API Spawning Stateful FSM Actor ===

%% @doc Spawns the vending machine actor starting in the idle state.
start() ->
    spawn(fun() -> idle() end).

%% === Phase 2: Synchronous Client API with make_ref/0 Correlation Tokens ===

%% @doc Submits coin value to the vending machine actor.
insert_coin(Pid, Amount) ->
    Ref = make_ref(),
    Pid ! {insert_coin, self(), Ref, Amount},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

%% @doc Requests item dispensing from the vending machine actor.
select_item(Pid) ->
    Ref = make_ref(),
    Pid ! {select_item, self(), Ref},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

%% @doc Requests refund of current deposited balance.
refund(Pid) ->
    Ref = make_ref(),
    Pid ! {refund, self(), Ref},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

%% @doc Requests clean actor termination.
stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

%% === Phase 3: State 1 (idle/0) - Awaiting Coins or Rejecting Premature Requests ===

%% @doc FSM state loop while no balance has been deposited.
idle() ->
    receive
        {insert_coin, From, Ref, Amount} when Amount >= 25 ->
            From ! {reply, Ref, {ok, inserted}},
            paid(Amount);  %% Mutual tail call into paid/1 state
        {insert_coin, From, Ref, _Small} ->
            From ! {reply, Ref, {error, coin_too_small}},
            idle();
        {select_item, From, Ref} ->
            From ! {reply, Ref, {error, insert_coin_first}},
            idle();
        {refund, From, Ref} ->
            From ! {reply, Ref, {ok, 0}},
            idle();
        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.

%% === Phase 4: State 2 (paid/1) - Handling Selections, Extra Coins, or Refunds ===

%% @doc FSM state loop while holding active customer balance.
paid(Balance) ->
    receive
        {select_item, From, Ref} ->
            From ! {reply, Ref, {ok, item_dispensed}},
            idle();  %% Item dispensed: reset to idle state
        {refund, From, Ref} ->
            From ! {reply, Ref, {ok, Balance}},
            idle();  %% Balance refunded: reset to idle state
        {insert_coin, From, Ref, Extra} ->
            From ! {reply, Ref, {ok, Balance + Extra}},
            paid(Balance + Extra);  %% Remain in paid state with accumulated balance
        {stop, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.
\`\`\`

### Architectural Breakdown: Mutual Tail Recursion Mechanics
1. **Zero-Stack State Handoff**: When \`idle/0\` evaluates \`paid(Amount)\` in tail position, the BEAM compiler emits \`call_last\`. The current stack frame is deallocated before jumping into \`paid/1\`. The actor never leaks stack frames across billions of transitions.
2. **Distinct Message Protocols per State**: In \`idle/0\`, \`select_item\` returns \`{error, insert_coin_first}\`. In \`paid/1\`, \`select_item\` dispenses the item and transitions back to \`idle/0\`. Neither function requires an \`if State == idle\` check—the current state is structurally guaranteed by the running function.
3. **Correlation Tokens (\`make_ref/0\`)**: Every client call tags outgoing messages with a 128-bit unique reference token, ensuring callers match only the exact reply intended for their request even under high concurrency.

## Assignment Specification

Implement \`src/door_lock_fsm.erl\` exporting \`start/1\`, \`enter_code/2\`, \`lock/1\`, \`get_state/1\`, \`stop/1\`, \`locked/2\`, and \`unlocked/1\`:

### 1. \`start/1\`
- **Input**: SecretCode (arbitrary Erlang term representing the authorized passcode).
- **Behavior**: Spawns a concurrent actor starting in state \`locked/2\` with the provided SecretCode and an initial failed attempt count of 0, returning the actor process identifier.
- **Examples**:
  - Calling \`door_lock_fsm:start(<<"4321">>)\` returns a valid process identifier.

### 2. \`enter_code/2\`
- **Input**: Pid (process identifier of the door lock actor), AttemptCode (arbitrary Erlang term).
- **Behavior**: Generates a correlation reference via \`make_ref/0\` and synchronously submits AttemptCode to the actor:
  - When in locked state:
    - If AttemptCode matches SecretCode, replies with \`{ok, unlocked}\` and transitions into \`unlocked/1\`.
    - If AttemptCode does not match SecretCode, increments the failed attempt count by 1, replies with \`{error, {wrong_code, NewCount}}\`, and remains in \`locked/2\` with the updated count.
  - When in unlocked state:
    - Replies with \`{ok, already_unlocked}\` and remains in \`unlocked/1\`.
  - Awaits reply for up to 1,000 milliseconds before returning \`{error, timeout}\`.
- **Examples**:
  - \`door_lock_fsm:enter_code(P, <<"4321">>)\` returns \`{ok, unlocked}\` when code matches.
  - \`door_lock_fsm:enter_code(P, <<"0000">>)\` returns \`{error, {wrong_code, 1}}\` on first mismatch.
  - Calling \`door_lock_fsm:enter_code(P, ...)\` on an already unlocked door returns \`{ok, already_unlocked}\`.

### 3. \`lock/1\`
- **Input**: Pid (process identifier of the door lock actor).
- **Behavior**: Generates a correlation reference via \`make_ref/0\` and synchronously commands the actor to lock:
  - When in unlocked state: replies with \`ok\` and transitions into \`locked/2\` with the failed attempts counter reset to 0.
  - When in locked state: replies with \`ok\` and remains in \`locked/2\` with its existing failed attempts count unchanged.
  - Awaits reply for up to 1,000 milliseconds before returning \`{error, timeout}\`.
- **Examples**:
  - \`door_lock_fsm:lock(P)\` returns \`ok\`.

### 4. \`get_state/1\`
- **Input**: Pid (process identifier of the door lock actor).
- **Behavior**: Generates a correlation reference via \`make_ref/0\` and synchronously queries the current state of the actor:
  - When in locked state: replies with \`{locked, FailedAttempts}\`.
  - When in unlocked state: replies with \`unlocked\`.
  - Awaits reply for up to 1,000 milliseconds before returning \`{error, timeout}\`.
- **Examples**:
  - Initial call to \`door_lock_fsm:get_state(P)\` returns \`{locked, 0}\`.
  - Calling \`door_lock_fsm:get_state(P)\` after code verification returns \`unlocked\`.

### 5. \`stop/1\`
- **Input**: Pid (process identifier of the door lock actor).
- **Behavior**: Generates a correlation reference via \`make_ref/0\` and synchronously commands the actor to stop:
  - Replies with \`ok\` and terminates execution cleanly.
  - Awaits reply for up to 1,000 milliseconds before returning \`{error, timeout}\`.
- **Examples**:
  - \`door_lock_fsm:stop(P)\` returns \`ok\`.

### 6. \`locked/2\`
- **Input**: SecretCode (Erlang term), FailedAttempts (non-negative integer).
- **Behavior**: Mutual tail-recursive state loop handling messages while the door is locked:
  - Code attempt matching SecretCode transitions to \`unlocked/1\`.
  - Code attempt mismatch increments FailedAttempts and recurses to \`locked/2\`.
  - Lock command acknowledges and remains in \`locked/2\`.
  - State query acknowledges with \`{locked, FailedAttempts}\` and remains in \`locked/2\`.
  - Stop command acknowledges and terminates cleanly.
- **Examples**:
  - Receives unlock request and transitions to \`unlocked/1\`.

### 7. \`unlocked/1\`
- **Input**: SecretCode (Erlang term).
- **Behavior**: Mutual tail-recursive state loop handling messages while the door is unlocked:
  - Redundant code attempts acknowledge \`{ok, already_unlocked}\` and remain in \`unlocked/1\`.
  - Lock command resets failure count to 0 and transitions to \`locked/2\`.
  - State query acknowledges with \`unlocked\` and remains in \`unlocked/1\`.
  - Stop command acknowledges and terminates cleanly.
- **Examples**:
  - Receives lock command and transitions to \`locked/2\`.

## Rules & Verification Constraints

- Both \`locked/2\` and \`unlocked/1\` must be strictly tail-recursive (enforced by AST rule \`requireTailRecursion: ["locked/2", "unlocked/1"]\`).
- Must call \`erlang:make_ref/0\` for synchronous request-reply correlation (enforced by AST rule \`requiredCalls: ["erlang:make_ref/0"]\`).
- All synchronous client queries must guard against unresponsiveness with 1,000 millisecond timeouts.`,
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
      requiredCalls: ['erlang:make_ref/0'],
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

%% @doc Spawn a concurrent door lock actor starting in locked state with zero failed attempts and return its process identifier.
start(_SecretCode) ->
    ok.

%% @doc Submit a passcode attempt to the door lock actor, returning unlock status or error with failed attempt count.
enter_code(_Pid, _AttemptCode) ->
    ok.

%% @doc Command the door lock actor to transition into locked state and reset failed attempt count to zero.
lock(_Pid) ->
    ok.

%% @doc Query the current state of the door lock actor, returning locked with failure count or unlocked.
get_state(_Pid) ->
    ok.

%% @doc Command the door lock actor to terminate execution cleanly.
stop(_Pid) ->
    ok.

%% @doc Mutual tail-recursive state loop handling messages while the door is locked.
locked(_SecretCode, _FailedAttempts) ->
    ok.

%% @doc Mutual tail-recursive state loop handling messages while the door is unlocked.
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

%% @doc Spawn a concurrent door lock actor starting in locked state with zero failed attempts and return its process identifier.
start(SecretCode) ->
    spawn(fun() -> locked(SecretCode, 0) end).

%% @doc Submit a passcode attempt to the door lock actor, returning unlock status or error with failed attempt count.
enter_code(Pid, AttemptCode) ->
    Ref = make_ref(),
    Pid ! {enter_code, self(), Ref, AttemptCode},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

%% @doc Command the door lock actor to transition into locked state and reset failed attempt count to zero.
lock(Pid) ->
    Ref = make_ref(),
    Pid ! {lock, self(), Ref},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

%% @doc Query the current state of the door lock actor, returning locked with failure count or unlocked.
get_state(Pid) ->
    Ref = make_ref(),
    Pid ! {get_state, self(), Ref},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

%% @doc Command the door lock actor to terminate execution cleanly.
stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

%% @doc Mutual tail-recursive state loop handling messages while the door is locked.
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

%% @doc Mutual tail-recursive state loop handling messages while the door is unlocked.
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

%% @doc Spawn a concurrent door lock actor starting in locked state with zero failed attempts and return its process identifier.
start(_SecretCode) ->
    ok.

%% @doc Submit a passcode attempt to the door lock actor, returning unlock status or error with failed attempt count.
enter_code(_Pid, _AttemptCode) ->
    ok.

%% @doc Command the door lock actor to transition into locked state and reset failed attempt count to zero.
lock(_Pid) ->
    ok.

%% @doc Query the current state of the door lock actor, returning locked with failure count or unlocked.
get_state(_Pid) ->
    ok.

%% @doc Command the door lock actor to terminate execution cleanly.
stop(_Pid) ->
    ok.

%% @doc Mutual tail-recursive state loop handling messages while the door is locked.
locked(_SecretCode, _FailedAttempts) ->
    ok.

%% @doc Mutual tail-recursive state loop handling messages while the door is unlocked.
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

%% @doc Spawn a concurrent door lock actor starting in locked state with zero failed attempts and return its process identifier.
start(SecretCode) ->
    spawn(fun() -> locked(SecretCode, 0) end).

%% @doc Submit a passcode attempt to the door lock actor, returning unlock status or error with failed attempt count.
enter_code(Pid, AttemptCode) ->
    Ref = make_ref(),
    Pid ! {enter_code, self(), Ref, AttemptCode},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

%% @doc Command the door lock actor to transition into locked state and reset failed attempt count to zero.
lock(Pid) ->
    Ref = make_ref(),
    Pid ! {lock, self(), Ref},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

%% @doc Query the current state of the door lock actor, returning locked with failure count or unlocked.
get_state(Pid) ->
    Ref = make_ref(),
    Pid ! {get_state, self(), Ref},
    receive
        {reply, Ref, Res} -> Res
    after 1000 ->
        {error, timeout}
    end.

%% @doc Command the door lock actor to terminate execution cleanly.
stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

%% @doc Mutual tail-recursive state loop handling messages while the door is locked.
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

%% @doc Mutual tail-recursive state loop handling messages while the door is unlocked.
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

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (erts / erlang)
erlang:process_info(Pid, Item) -> {Item, Info} | undefined
  Types:
    Pid = pid()
    Item = message_queue_len | memory | heap_size
\`\`\`

## Parallel Worked Example: Defensive Mailbox Hygiene in a Packet Cache Actor

Consider a high-throughput network packet cache designed with defensive mailbox hygiene:

\`\`\`erlang
-module(packet_cache).
-export([start/0, cache_packet/2, fetch_packet/2, inspect_depth/1, stop/1, loop/1]).

%% === Phase 1: Spawning Actor with Initial Map State ===

%% @doc Spawns the packet cache actor with an empty storage map.
start() ->
    Pid = spawn(fun() -> loop(#{}) end),
    {ok, Pid}.

%% === Phase 2: Client API with Asynchronous Casts & Synchronous Calls with make_ref/0 and Timeout Guard ===

%% @doc Asynchronously caches a binary payload under a numeric key.
cache_packet(Pid, {Id, BinaryPayload}) ->
    Pid ! {store, Id, BinaryPayload},
    ok.

%% @doc Synchronously fetches a cached payload with unique reference correlation and 1,000ms timeout guard.
fetch_packet(Pid, Id) ->
    Ref = make_ref(),
    Pid ! {fetch, self(), Ref, Id},
    receive
        {packet_data, Ref, Result} ->
            Result
    after 1000 ->
        {error, timeout}
    end.

%% === Phase 3: Runtime Mailbox Inspection ===

%% @doc Queries the runtime for the current mailbox queue depth of the target actor.
inspect_depth(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

%% @doc Commands clean actor termination.
stop(Pid) ->
    Pid ! stop,
    ok.

%% === Phase 4: Actor State Loop with Defensive Mailbox Hygiene Catch-All Clause ===

%% @doc Tail-recursive state loop handling valid packet commands and purging unhandled noise.
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

### Architectural Breakdown: Save Queue Traversal Mechanics
1. **Unbounded Growth**: Without \`_IgnoredNoise\`, every unmatched message moves into the Save Queue and remains there indefinitely.
2. **Linear Traversal Degradation**: As messages accumulate, every subsequent \`receive\` must traverse every saved message pointer in RAM, causing CPU usage to spike to 100% and query latency to skyrocket.
3. **Caller Timeout Protection**: Adding \`after 1000 -> {error, timeout}\` in client APIs ensures that callers unblock deterministically even if a worker crashes or becomes CPU-starved.

## Assignment Specification

Triage and fix \`src/incident_mailbox_leak.erl\` exporting \`start/0\`, \`record_metric/2\`, \`get_summary/1\`, \`inspect_queue_len/1\`, \`get_mailbox_len/1\`, \`stop/1\`, and \`loop/1\`:

### 1. \`start/0\`
- **Input**: None.
- **Behavior**: Spawns a concurrent telemetry actor initialized with an immutable map holding zero count and zero total, returning a tagged tuple containing the process identifier.
- **Examples**:
  - \`incident_mailbox_leak:start()\` returns \`{ok, Pid}\`.

### 2. \`record_metric/2\`
- **Input**: Pid (process identifier of the telemetry actor), Val (numeric metric value).
- **Behavior**: Asynchronously dispatches a metric measurement to the actor. Increments the accumulated count by 1 and adds Val to the running total.
- **Examples**:
  - \`incident_mailbox_leak:record_metric(P, 50)\` returns \`ok\`.

### 3. \`get_summary/1\`
- **Input**: Pid (process identifier of the telemetry actor).
- **Behavior**: Generates a correlation reference via \`make_ref/0\` and synchronously requests summary metrics from the actor. If no response arrives within 1,000 milliseconds, unblocks and returns an error tuple.
- **Examples**:
  - \`incident_mailbox_leak:get_summary(P)\` returns \`{ok, #{count => 2, total => 30}}\` on active worker.
  - \`incident_mailbox_leak:get_summary(DeadPid)\` returns \`{error, timeout}\` after 1,000ms.

### 4. \`inspect_queue_len/1\`
- **Input**: Pid (process identifier of the target actor).
- **Behavior**: Queries the BEAM virtual machine via \`process_info/2\` for the process message queue length. Returns the integer queue length, or 0 if the process has already terminated.
- **Examples**:
  - \`incident_mailbox_leak:inspect_queue_len(P)\` returns \`0\` when drained.

### 5. \`get_mailbox_len/1\`
- **Input**: Pid (process identifier of the target actor).
- **Behavior**: Provides an identical backward-compatible alias for \`inspect_queue_len/1\`.
- **Examples**:
  - \`incident_mailbox_leak:get_mailbox_len(P)\` returns \`0\`.

### 6. \`stop/1\`
- **Input**: Pid (process identifier of the telemetry actor).
- **Behavior**: Asynchronously commands the actor to terminate execution cleanly.
- **Examples**:
  - \`incident_mailbox_leak:stop(P)\` returns \`ok\`.

### 7. \`loop/1\`
- **Input**: State (map containing metric count and total).
- **Behavior**: Tail-recursive actor message loop. Must defensively handle unexpected message noise by discarding unhandled terms and recurring with existing state unchanged, preventing Save Queue memory leaks.
- **Examples**:
  - Mailbox length remains 0 even after hundreds of unhandled messages arrive.

## Rules & Verification Constraints

- Mailbox length must remain strictly 0 even after 500 unhandled heartbeat and diagnostic messages arrive.
- \`get_summary/1\` must return \`{error, timeout}\` within 1,000ms when invoked against an unresponsive process.
- Tail-call optimization must be strictly maintained in \`loop/1\`.`,
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
      {
        id: 'tc-ch05-07-3',
        title: 'Metrics Aggregation & get_mailbox_len/1 Alias',
        erlangCall: 'begin {ok, P} = incident_mailbox_leak:start(), ok = incident_mailbox_leak:record_metric(P, 100), ok = incident_mailbox_leak:record_metric(P, 250), {ok, Summary} = incident_mailbox_leak:get_summary(P), 0 = incident_mailbox_leak:get_mailbox_len(P), incident_mailbox_leak:stop(P), Summary end',
        expectedOutput: '#{count => 2, total => 350}',
        explanation: 'Records metrics, confirms get_mailbox_len/1 alias returns 0, and asserts exact summary statistics.',
      },
    ],
    astRules: {
      requireTailRecursion: ['loop/1'],
      requiredConstructs: ['receive_after'],
      requiredCalls: ['erlang:process_info/2', 'erlang:make_ref/0'],
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

%% @doc Spawn a concurrent telemetry aggregator actor initialized with count 0 and total 0, returning {ok, Pid}.
start() ->
    Pid = spawn(fun() -> loop(#{count => 0, total => 0}) end),
    {ok, Pid}.

%% @doc Asynchronously send a numeric measurement to the telemetry aggregator actor.
record_metric(Pid, Val) ->
    Pid ! {record_metric, Val},
    ok.

%% @doc Query aggregated summary metrics from the telemetry actor with a 1,000ms timeout guard.
get_summary(Pid) ->
    Ref = erlang:make_ref(),
    Pid ! {get_summary, self(), Ref},
    receive
        {summary, Ref, Summary} ->
            {ok, Summary}
    end.

%% @doc Query the BEAM runtime for the current message queue length of Pid, returning 0 if dead.
inspect_queue_len(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

%% @doc Query the BEAM runtime for the current message queue length of Pid, returning 0 if dead.
get_mailbox_len(Pid) ->
    inspect_queue_len(Pid).

%% @doc Asynchronously command the telemetry aggregator actor to terminate cleanly.
stop(Pid) ->
    Pid ! stop,
    ok.

%% @doc Tail-recursive state loop accumulating metric measurements and discarding unhandled messages.
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

%% @doc Spawn a concurrent telemetry aggregator actor initialized with count 0 and total 0, returning {ok, Pid}.
start() ->
    Pid = spawn(fun() -> loop(#{count => 0, total => 0}) end),
    {ok, Pid}.

%% @doc Asynchronously send a numeric measurement to the telemetry aggregator actor.
record_metric(Pid, Val) ->
    Pid ! {record_metric, Val},
    ok.

%% @doc Query aggregated summary metrics from the telemetry actor with a 1,000ms timeout guard.
get_summary(Pid) ->
    Ref = erlang:make_ref(),
    Pid ! {get_summary, self(), Ref},
    receive
        {summary, Ref, Summary} ->
            {ok, Summary}
    after 1000 ->
        {error, timeout}
    end.

%% @doc Query the BEAM runtime for the current message queue length of Pid, returning 0 if dead.
inspect_queue_len(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

%% @doc Query the BEAM runtime for the current message queue length of Pid, returning 0 if dead.
get_mailbox_len(Pid) ->
    inspect_queue_len(Pid).

%% @doc Asynchronously command the telemetry aggregator actor to terminate cleanly.
stop(Pid) ->
    Pid ! stop,
    ok.

%% @doc Tail-recursive state loop accumulating metric measurements and discarding unhandled messages.
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

%% @doc Spawn a concurrent telemetry aggregator actor initialized with count 0 and total 0, returning {ok, Pid}.
start() ->
    Pid = spawn(fun() -> loop(#{count => 0, total => 0}) end),
    {ok, Pid}.

%% @doc Asynchronously send a numeric measurement to the telemetry aggregator actor.
record_metric(Pid, Val) ->
    Pid ! {record_metric, Val},
    ok.

%% @doc Query aggregated summary metrics from the telemetry actor with a 1,000ms timeout guard.
get_summary(Pid) ->
    Ref = erlang:make_ref(),
    Pid ! {get_summary, self(), Ref},
    receive
        {summary, Ref, Summary} ->
            {ok, Summary}
    end.

%% @doc Query the BEAM runtime for the current message queue length of Pid, returning 0 if dead.
inspect_queue_len(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

%% @doc Query the BEAM runtime for the current message queue length of Pid, returning 0 if dead.
get_mailbox_len(Pid) ->
    inspect_queue_len(Pid).

%% @doc Asynchronously command the telemetry aggregator actor to terminate cleanly.
stop(Pid) ->
    Pid ! stop,
    ok.

%% @doc Tail-recursive state loop accumulating metric measurements and discarding unhandled messages.
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

%% @doc Spawn a concurrent telemetry aggregator actor initialized with count 0 and total 0, returning {ok, Pid}.
start() ->
    Pid = spawn(fun() -> loop(#{count => 0, total => 0}) end),
    {ok, Pid}.

%% @doc Asynchronously send a numeric measurement to the telemetry aggregator actor.
record_metric(Pid, Val) ->
    Pid ! {record_metric, Val},
    ok.

%% @doc Query aggregated summary metrics from the telemetry actor with a 1,000ms timeout guard.
get_summary(Pid) ->
    Ref = erlang:make_ref(),
    Pid ! {get_summary, self(), Ref},
    receive
        {summary, Ref, Summary} ->
            {ok, Summary}
    after 1000 ->
        {error, timeout}
    end.

%% @doc Query the BEAM runtime for the current message queue length of Pid, returning 0 if dead.
inspect_queue_len(Pid) ->
    case erlang:process_info(Pid, message_queue_len) of
        {message_queue_len, Len} -> Len;
        undefined -> 0
    end.

%% @doc Query the BEAM runtime for the current message queue length of Pid, returning 0 if dead.
get_mailbox_len(Pid) ->
    inspect_queue_len(Pid).

%% @doc Asynchronously command the telemetry aggregator actor to terminate cleanly.
stop(Pid) ->
    Pid ! stop,
    ok.

%% @doc Tail-recursive state loop accumulating metric measurements and discarding unhandled messages.
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

In financial backends, payment switches, and high-frequency order books, **Data Consistency** is existential. Consider two concurrent withdrawal requests against an account with a $100 balance:
1. Request A queries the balance ($100 \\ge $80 requested) and prepares to approve an $80 withdrawal.
2. Simultaneously, Request B queries the balance ($100 \\ge $50 requested) and prepares to approve a $50 withdrawal.
3. If executed concurrently without synchronization, both deduct their amounts, yielding a final balance of -$30. This is the catastrophic **Double-Spend Glitch**!

In shared-memory multithreaded systems (Java, C++, Go), engineers attempt to prevent double-spending by introducing database row locks, distributed Redis locks, or operating system mutexes. However, locks introduce severe architectural hazards: **Deadlocks** (Account 1 transfers to Account 2 while Account 2 transfers to Account 1), lock convoying under contention, and thread starvation.

In the **BEAM Actor Model**, concurrency safety is achieved through architectural serialization without locks. A single actor process owns the state collection. Because the actor's mailbox is **strictly sequential**, incoming requests are evaluated one at a time. The actor completes state evaluation for request $N$ and updates its loop state before it ever pops request $N+1$. Race conditions and deadlocks are **mathematically impossible**!

## Deep Concept Breakdown & Under the Hood

### 1. In-Memory State Serialization and Race Freedom
Every BEAM process has a private, sequentially ordered message mailbox. When hundreds of concurrent client processes dispatch requests simultaneously to an actor:
1. Each incoming request is appended to the tail of the actor's mailbox.
2. The actor's \`loop/1\` evaluates the message at the head of the mailbox.
3. The actor executes the transaction, produces a new state, and calls \`loop(NewState)\`.
4. Only after this transition is complete does the actor dequeue the next message.
Because no two transactions can execute concurrently within the same process boundary, operations on shared entities are completely free of dirty reads, phantom writes, and race conditions.

### 2. Atomic Functional State Transformations & Rollback
In Erlang, terms are **immutable**. Transitioning an actor's state from $S$ to $S'$ is accomplished by passing $S'$ as the argument to the recursive \`loop/1\` call.

This functional property makes failure rollbacks instantaneous and zero-cost:
- When a requested operation is valid, the helper produces \`{ok, Reply, NewState}\`. The actor returns \`Reply\` to the caller and recurses with \`loop(NewState)\`.
- When an operation is invalid (such as an insufficient resource balance or non-existent entity), the helper returns \`{error, Reason}\`. The actor notifies the caller and recurses with the **unmodified state** \`loop(State)\`.
Because no memory was mutated in-place, the actor's state remains pristine without requiring complex rollback logs, undo buffers, or compensations!

### 3. Multi-Entity Coordination within a Single Message
When a transaction affects multiple entities (such as moving balance or quota from Entity A to Entity B):
- Both entities must be verified before either is modified.
- If the source lacks sufficient quota, the transaction must abort.
- If either entity does not exist, the transaction must abort.
In an actor, this coordination is evaluated entirely within a single message receive clause. Because the actor cannot process any external messages during this clause, external callers can never observe a transient state where quota was deducted from Entity A but not yet credited to Entity B.

### 4. Batch Operations via Tail-Recursive Dual Accumulators
Production systems frequently receive batches of operations that must be evaluated sequentially. Rather than failing the entire batch on the first error, systems often apply all valid operations while reporting the exact counts of successful and rejected items:
\`\`\`erlang
%% Conceptual batch evaluation with dual accumulators:
run_batch([], State, Succeeded, Failed) ->
    {Succeeded, Failed, State};
run_batch([Task | Rest], State, Succeeded, Failed) ->
    case execute_task(Task, State) of
        {ok, _Reply, NewState} ->
            run_batch(Rest, NewState, Succeeded + 1, Failed);
        {error, _Reason} ->
            run_batch(Rest, State, Succeeded, Failed + 1)
    end.
\`\`\`
This pattern preserves all valid operations in constant stack space ($O(1)$ memory).

> [!warning] Production Concurrency Trap: Forgetting Timeouts on Synchronous Requests
> Client queries to an actor should never hang indefinitely. If an actor crashes, becomes overloaded, or fails to reply, a client without a timeout will block forever, cascading connection pool exhaustion across upstream services. Always pair \`erlang:make_ref/0\` with a bounded \`after Timeout -> {error, timeout}\` clause!

## Official Erlang Docs & Function Reference

- **\`erlang:spawn/1\`**: \`spawn(Fun) -> pid()\` — Creates a concurrent BEAM process with its own private heap and returns its unique process identifier (PID).
- **\`erlang:make_ref/0\`**: \`erlang:make_ref() -> reference()\` — Returns an almost unique 128-bit reference token used for caller correlation in request-reply protocols.
- **\`erlang:self/0\`**: \`self() -> pid()\` — Returns the process identifier of the calling process, used as the return address for synchronous actor replies.

## Parallel Worked Example

Consider a cloud compute cluster resource manager that allocates and rebalances CPU cores across worker nodes:

\`\`\`erlang
-module(fleet_allocator).
-export([
    start/1,
    query_capacity/2,
    schedule_workload/2,
    apply_schedule/2,
    terminate/1,
    loop/1
]).

%% Phase 1: Spawning the Stateful Allocator Actor
%% @doc Spawns the cluster allocator actor with an initial node capacity list.
start(InitialNodes) ->
    spawn(fun() -> loop(InitialNodes) end).

%% Phase 2: Synchronous Client API with make_ref() Correlation & Timeout Guards
%% @doc Queries available CPU cores on a given cluster node with a timeout guard.
query_capacity(Pid, NodeId) ->
    Ref = make_ref(),
    Pid ! {query_capacity, self(), Ref, NodeId},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

%% @doc Atomically provisions, releases, or rebalances CPU core quotas.
schedule_workload(Pid, TaskTuple) ->
    Ref = make_ref(),
    Pid ! {schedule_workload, self(), Ref, TaskTuple},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

%% @doc Processes a list of allocation tasks, returning success and skip counts.
apply_schedule(Pid, TaskList) ->
    Ref = make_ref(),
    Pid ! {apply_schedule, self(), Ref, TaskList},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

%% @doc Terminates the allocator process cleanly.
terminate(Pid) ->
    Ref = make_ref(),
    Pid ! {terminate, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

%% Phase 3: Tail-Recursive Actor Loop & Message Multiplexing
%% @doc Main actor loop maintaining node capacity state across sequential requests.
loop(Nodes) ->
    receive
        {query_capacity, From, Ref, NodeId} ->
            Result = case find_node(NodeId, Nodes) of
                {ok, {node, _, _, Cores}} -> {ok, Cores};
                error -> {error, not_found}
            end,
            From ! {reply, Ref, Result},
            loop(Nodes);

        {schedule_workload, From, Ref, Task} ->
            case execute_task(Task, Nodes) of
                {ok, ReplyVal, NewNodes} ->
                    From ! {reply, Ref, {ok, ReplyVal}},
                    loop(NewNodes);
                {error, Reason} ->
                    From ! {reply, Ref, {error, Reason}},
                    loop(Nodes)
            end;

        {apply_schedule, From, Ref, TaskList} ->
            {Succeeded, Skipped, NewNodes} = run_schedule(TaskList, Nodes, 0, 0),
            From ! {reply, Ref, {ok, Succeeded, Skipped}},
            loop(NewNodes);

        {terminate, From, Ref} ->
            From ! {reply, Ref, ok},
            ok
    end.

%% Phase 4: Atomic State Mutation, Validation & Dual-Accumulator Batch Processing
%% ── Internal State Helpers ───────────────────────────────────────────────────

find_node(_Id, []) -> error;
find_node(Id, [{node, Id, Host, Cores} | _]) -> {ok, {node, Id, Host, Cores}};
find_node(Id, [_ | Rest]) -> find_node(Id, Rest).

execute_task({provision, NodeId, ReqCores}, Nodes) when ReqCores > 0 ->
    case find_node(NodeId, Nodes) of
        {ok, {node, Id, Host, Available}} when Available >= ReqCores ->
            Remaining = Available - ReqCores,
            NewNodes = replace_node({node, Id, Host, Remaining}, Nodes),
            {ok, Remaining, NewNodes};
        {ok, _} ->
            {error, insufficient_capacity};
        error ->
            {error, not_found}
    end;
execute_task({release, NodeId, FreeCores}, Nodes) when FreeCores > 0 ->
    case find_node(NodeId, Nodes) of
        {ok, {node, Id, Host, Available}} ->
            NewTotal = Available + FreeCores,
            NewNodes = replace_node({node, Id, Host, NewTotal}, Nodes),
            {ok, NewTotal, NewNodes};
        error ->
            {error, not_found}
    end;
execute_task({rebalance, FromId, ToId, Cores}, Nodes) when Cores > 0 ->
    case {find_node(FromId, Nodes), find_node(ToId, Nodes)} of
        {{ok, {node, FromId, FromHost, FromCores}}, {ok, {node, ToId, ToHost, ToCores}}} ->
            if
                FromCores >= Cores ->
                    NewFrom = FromCores - Cores,
                    NewTo = ToCores + Cores,
                    N1 = replace_node({node, FromId, FromHost, NewFrom}, Nodes),
                    N2 = replace_node({node, ToId, ToHost, NewTo}, N1),
                    {ok, NewFrom, N2};
                true ->
                    {error, insufficient_capacity}
            end;
        _ ->
            {error, not_found}
    end;
execute_task(_Invalid, _Nodes) ->
    {error, invalid_task}.

replace_node(NewNode, Nodes) ->
    replace_node_tail(NewNode, Nodes, []).

replace_node_tail({node, Id, _, _} = NewNode, [{node, Id, _, _} | Rest], Acc) ->
    prepend_reverse(Acc, [NewNode | Rest]);
replace_node_tail(NewNode, [Head | Rest], Acc) ->
    replace_node_tail(NewNode, Rest, [Head | Acc]);
replace_node_tail(_NewNode, [], Acc) ->
    prepend_reverse(Acc, []).

prepend_reverse([], Acc) -> Acc;
prepend_reverse([H | T], Acc) -> prepend_reverse(T, [H | Acc]).

run_schedule([], Nodes, Succeeded, Skipped) ->
    {Succeeded, Skipped, Nodes};
run_schedule([Task | Rest], Nodes, Succeeded, Skipped) ->
    case execute_task(Task, Nodes) of
        {ok, _Val, NewNodes} ->
            run_schedule(Rest, NewNodes, Succeeded + 1, Skipped);
        {error, _Reason} ->
            run_schedule(Rest, Nodes, Succeeded, Skipped + 1)
    end.
\`\`\`

### Key Architectural Mechanics Demonstrated:

1. **State Isolation & Lock-Free Serialization**: The actor process completely encapsulates its private node list. Because the mailbox is evaluated strictly sequentially, multiple clients can query, provision, or rebalance capacity simultaneously without mutexes, semaphores, or deadlocks.
2. **Atomic Multi-Entity Coordination**: The \`rebalance\` operation coordinates two distinct nodes within a single message receive clause. If either node is missing or the source node lacks sufficient cores, the transaction safely aborts without modifying either node, guaranteeing atomic all-or-nothing execution.
3. **Tail-Recursive Dual Accumulators**: \`run_schedule/4\` iterates through arbitrary batches of tasks in constant stack space ($O(1)$ memory), tracking successful and skipped task counts while producing the final state.

## Assignment Specification

Implement \`src/ledger_actor.erl\` exporting \`start/1\`, \`get_balance/2\`, \`process_transaction/2\`, \`process_batch/2\`, \`stop/1\`, and \`loop/1\`:

### 1. \`start/1\`
- **Input**: \`InitialAccounts\` — a list of account tuples formatted as \`{account, AccountId, OwnerName, Balance}\`, where \`AccountId\` is an integer, \`OwnerName\` is a binary, and \`Balance\` is an integer.
- **Behavior**: Spawns an actor executing \`loop(InitialAccounts)\` and returns its \`pid()\`.
- **Examples**:
  - \`Pid = ledger_actor:start([{account, 1, <<"Alice">>, 100}]).\` returns process PID.

### 2. \`get_balance/2\`
- **Input**: \`Pid\` (actor PID), \`AccountId\` (integer account identifier).
- **Behavior**: Queries the ledger actor for the balance of \`AccountId\`. Returns \`{ok, Balance}\` if the account exists, \`{error, not_found}\` if missing, or \`{error, timeout}\` if no reply is received within 1,000ms.
- **Examples**:
  - \`ledger_actor:get_balance(Pid, 1)\` returns \`{ok, 100}\`.
  - \`ledger_actor:get_balance(Pid, 999)\` returns \`{error, not_found}\`.

### 3. \`process_transaction/2\`
- **Input**: \`Pid\` (actor PID), \`TxTuple\` (one of the following three transaction variants):
  - \`{deposit, AccountId, Amount}\` (\`Amount > 0\`): Increases \`AccountId\` balance by \`Amount\`. Returns \`{ok, NewBalance}\`, or \`{error, not_found}\` if the account is missing.
  - \`{withdraw, AccountId, Amount}\` (\`Amount > 0\`):
    - If \`Balance >= Amount\`: deducts \`Amount\` and returns \`{ok, NewBalance}\`.
    - If \`Balance < Amount\`: returns \`{error, insufficient_funds}\` and leaves the balance unchanged.
    - If missing: returns \`{error, not_found}\`.
  - \`{transfer, FromId, ToId, Amount}\` (\`Amount > 0\`):
    - Verifies that both \`FromId\` and \`ToId\` exist. If either is missing, returns \`{error, not_found}\`.
    - If \`FromBalance < Amount\`: returns \`{error, insufficient_funds}\`.
    - If valid: atomically deducts \`Amount\` from \`FromId\` and credits \`Amount\` to \`ToId\`. Returns \`{ok, RemainingFromBalance}\`. Neither account's balance may change if validation fails.
- **Behavior**: Synchronously dispatches the transaction to the ledger actor with a 1,000ms timeout guard, returning \`{error, timeout}\` on expiration.
- **Examples**:
  - \`ledger_actor:process_transaction(Pid, {deposit, 1, 50})\` returns \`{ok, 150}\`.
  - \`ledger_actor:process_transaction(Pid, {withdraw, 1, 500})\` returns \`{error, insufficient_funds}\`.
  - \`ledger_actor:process_transaction(Pid, {transfer, 1, 2, 30})\` returns \`{ok, 70}\`.

### 4. \`process_batch/2\`
- **Input**: \`Pid\` (actor PID), \`TransactionsList\` (a list of transaction tuples).
- **Behavior**: Sequentially evaluates transactions against the ledger. Each valid transaction updates the state and increments an applied counter; invalid transactions leave state unchanged and increment a rejected counter. Returns \`{ok, AppliedCount, RejectedCount}\`, or \`{error, timeout}\` if no reply is received within 2,000ms.
- **Examples**:
  - \`ledger_actor:process_batch(Pid, [{deposit, 1, 20}, {withdraw, 2, 9999}])\` returns \`{ok, 1, 1}\`.

### 5. \`stop/1\`
- **Input**: \`Pid\` (actor PID).
- **Behavior**: Requests clean actor termination, awaiting reply within 1,000ms. Returns \`ok\` or \`{error, timeout}\`.
- **Examples**:
  - \`ledger_actor:stop(Pid)\` returns \`ok\`.

### 6. \`loop/1\`
- **Input**: \`Accounts\` (list of account tuples).
- **Behavior**: Tail-recursive message loop receiving and servicing requests, replying to callers with correlation references, and recurring with updated account state.
- **Examples**:
  - \`loop(Accounts)\` evaluates messages sequentially, transitioning state via \`loop(NewAccounts)\`.

## Rules & Verification Constraints

- \`loop/1\` and all list update helpers must be strictly tail-recursive.
- Enforced by AST rule: \`requireTailRecursion: ["loop/1"]\`.
- All client functions must use \`make_ref/0\` and \`receive ... after\` timeouts (\`requiredConstructs: ["receive_after"]\`, \`requiredCalls: ["erlang:make_ref/0", "erlang:self/0"]\`).
- Automated verification executes concurrent double-spend attacks with 10 parallel client processes to ensure zero race conditions!`,
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
      requiredCalls: ['erlang:make_ref/0', 'erlang:self/0'],
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

%% @doc Spawns the concurrent ledger actor process initialized with a list of account tuples.
%% Returns the process identifier (PID) of the spawned actor.
start(_InitialAccounts) ->
    ok.

%% @doc Queries the current balance for an account identified by AccountId with a 1,000ms timeout guard.
%% Returns {ok, Balance} if the account exists, {error, not_found} if missing, or {error, timeout} on deadline expiration.
get_balance(_Pid, _AccountId) ->
    ok.

%% @doc Atomically executes a single deposit, withdrawal, or transfer transaction with a 1,000ms timeout guard.
%% Validates account existence and sufficiency of funds, returning updated balances or structured error tuples.
process_transaction(_Pid, _TxTuple) ->
    ok.

%% @doc Sequentially processes a list of transaction tuples against the ledger with a 2,000ms timeout guard.
%% Applies valid operations while skipping invalid ones, returning {ok, AppliedCount, RejectedCount}.
process_batch(_Pid, _TransactionsList) ->
    ok.

%% @doc Requests clean termination of the ledger actor process with a 1,000ms timeout guard.
%% Returns ok upon confirmed shutdown, or {error, timeout} if the actor fails to respond.
stop(_Pid) ->
    ok.

%% @doc Tail-recursive actor message loop serializing incoming financial requests through its mailbox.
%% Dispatches replies using caller correlation tokens and recurses with updated account state.
loop(_Accounts) ->
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

%% @doc Spawns the concurrent ledger actor process initialized with a list of account tuples.
%% Returns the process identifier (PID) of the spawned actor.
start(InitialAccounts) ->
    spawn(fun() -> loop(InitialAccounts) end).

%% @doc Queries the current balance for an account identified by AccountId with a 1,000ms timeout guard.
%% Returns {ok, Balance} if the account exists, {error, not_found} if missing, or {error, timeout} on deadline expiration.
get_balance(Pid, AccountId) ->
    Ref = make_ref(),
    Pid ! {get_balance, self(), Ref, AccountId},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

%% @doc Atomically executes a single deposit, withdrawal, or transfer transaction with a 1,000ms timeout guard.
%% Validates account existence and sufficiency of funds, returning updated balances or structured error tuples.
process_transaction(Pid, TxTuple) ->
    Ref = make_ref(),
    Pid ! {transaction, self(), Ref, TxTuple},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

%% @doc Sequentially processes a list of transaction tuples against the ledger with a 2,000ms timeout guard.
%% Applies valid operations while skipping invalid ones, returning {ok, AppliedCount, RejectedCount}.
process_batch(Pid, TransactionsList) ->
    Ref = make_ref(),
    Pid ! {process_batch, self(), Ref, TransactionsList},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

%% @doc Requests clean termination of the ledger actor process with a 1,000ms timeout guard.
%% Returns ok upon confirmed shutdown, or {error, timeout} if the actor fails to respond.
stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

%% @doc Tail-recursive actor message loop serializing incoming financial requests through its mailbox.
%% Dispatches replies using caller correlation tokens and recurses with updated account state.
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

%% @doc Spawns the concurrent ledger actor process initialized with a list of account tuples.
%% Returns the process identifier (PID) of the spawned actor.
start(_InitialAccounts) ->
    ok.

%% @doc Queries the current balance for an account identified by AccountId with a 1,000ms timeout guard.
%% Returns {ok, Balance} if the account exists, {error, not_found} if missing, or {error, timeout} on deadline expiration.
get_balance(_Pid, _AccountId) ->
    ok.

%% @doc Atomically executes a single deposit, withdrawal, or transfer transaction with a 1,000ms timeout guard.
%% Validates account existence and sufficiency of funds, returning updated balances or structured error tuples.
process_transaction(_Pid, _TxTuple) ->
    ok.

%% @doc Sequentially processes a list of transaction tuples against the ledger with a 2,000ms timeout guard.
%% Applies valid operations while skipping invalid ones, returning {ok, AppliedCount, RejectedCount}.
process_batch(_Pid, _TransactionsList) ->
    ok.

%% @doc Requests clean termination of the ledger actor process with a 1,000ms timeout guard.
%% Returns ok upon confirmed shutdown, or {error, timeout} if the actor fails to respond.
stop(_Pid) ->
    ok.

%% @doc Tail-recursive actor message loop serializing incoming financial requests through its mailbox.
%% Dispatches replies using caller correlation tokens and recurses with updated account state.
loop(_Accounts) ->
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

%% @doc Spawns the concurrent ledger actor process initialized with a list of account tuples.
%% Returns the process identifier (PID) of the spawned actor.
start(InitialAccounts) ->
    spawn(fun() -> loop(InitialAccounts) end).

%% @doc Queries the current balance for an account identified by AccountId with a 1,000ms timeout guard.
%% Returns {ok, Balance} if the account exists, {error, not_found} if missing, or {error, timeout} on deadline expiration.
get_balance(Pid, AccountId) ->
    Ref = make_ref(),
    Pid ! {get_balance, self(), Ref, AccountId},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

%% @doc Atomically executes a single deposit, withdrawal, or transfer transaction with a 1,000ms timeout guard.
%% Validates account existence and sufficiency of funds, returning updated balances or structured error tuples.
process_transaction(Pid, TxTuple) ->
    Ref = make_ref(),
    Pid ! {transaction, self(), Ref, TxTuple},
    receive
        {reply, Ref, Result} -> Result
    after 1000 ->
        {error, timeout}
    end.

%% @doc Sequentially processes a list of transaction tuples against the ledger with a 2,000ms timeout guard.
%% Applies valid operations while skipping invalid ones, returning {ok, AppliedCount, RejectedCount}.
process_batch(Pid, TransactionsList) ->
    Ref = make_ref(),
    Pid ! {process_batch, self(), Ref, TransactionsList},
    receive
        {reply, Ref, Result} -> Result
    after 2000 ->
        {error, timeout}
    end.

%% @doc Requests clean termination of the ledger actor process with a 1,000ms timeout guard.
%% Returns ok upon confirmed shutdown, or {error, timeout} if the actor fails to respond.
stop(Pid) ->
    Ref = make_ref(),
    Pid ! {stop, self(), Ref},
    receive
        {reply, Ref, ok} -> ok
    after 1000 ->
        {error, timeout}
    end.

%% @doc Tail-recursive actor message loop serializing incoming financial requests through its mailbox.
%% Dispatches replies using caller correlation tokens and recurses with updated account state.
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

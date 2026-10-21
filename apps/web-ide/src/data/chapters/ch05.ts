import { LessonContent } from '../../types/workspace';

export const CHAPTER_5_LESSONS: LessonContent[] = [
  // ── Lesson 5.1: Guided Demo ───────────────────────────────────────────────
  {
    id: 'ch05-l01',
    chapterNumber: 5,
    lessonNumber: 1,
    lessonType: 'guided_demo',
    title: 'Lightweight BEAM Processes vs. OS Threads',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In traditional languages like Java, C++, Python, or Go, concurrency is often built on top of **Operating System threads** or cooperative user-space goroutines sharing a single address space. An OS thread allocates **1 MB to 8 MB of stack memory**, requires expensive kernel context switches (costing ~1,000 to 2,000 CPU cycles), and introduces devastating **Race Conditions** and **Deadlocks** when threads access shared memory concurrently.

The **BEAM Virtual Machine** takes an entirely different architectural path created for the world's largest telecom switches: **The Actor Model**. A BEAM process is **not** an OS thread. It is an ultralightweight, isolated memory container managed entirely in user space by the BEAM runtime. A freshly spawned BEAM process starts with **only ~309 words (~2.5 KB on 64-bit platforms)** of RAM!

## Deep Concept Breakdown & Under the Hood

Because BEAM processes are so tiny, a single commodity server can easily run **100,000 to 2,000,000 concurrent processes** simultaneously without breaking a sweat—a feat impossible with standard OS threads.

> **BEAM Concurrency Model at a Glance:**
> - **Schedulers:** 1 OS thread per CPU core (Scheduler 1 .. N) running preemptive micro-threads in user space.
> - **BEAM Process:** ~2.5 KB private heap, private stack, mailbox queue, reduction counter (4,000 reductions per time slice).
> - **Zero Shared Memory:** Message passing (\`!\`) copies terms from sender heap to recipient mailbox. No mutexes or stop-the-world locks.

### 1. Zero Shared Memory & Private Garbage Collection
Unlike Java or Go where all threads share one global heap that requires "Stop-the-World" GC pauses, every Erlang process has its **own private heap**. When a process finishes its work or terminates, its memory is instantly reclaimed without touching any other process.

### 2. Preemptive Reduction Scheduling (4,000 Reductions)
In cooperative systems (like Node.js event loops or Python async), an accidental \`while(true)\` loop freezes the entire server. In Erlang, the BEAM scheduler allocates **4,000 reductions** (roughly 4,000 function calls or BIF calls) to a process. The moment the counter hits zero, the scheduler preempts the process, moves it to the back of the run queue, and runs another process. **No single slow computation or buggy user can starve the rest of the backend!**

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (erts / erlang)
erlang:process_info(Pid, ItemList) -> InfoList | undefined
  Types:
    Pid = pid()
    ItemList = [memory | heap_size | reductions | message_queue_len | status]
    InfoList = [{Item, Value}]
\`\`\`
> \`erlang:process_info/2\` inspects real-time internal VM telemetry for any live process. In production, tools like Observer and Prometheus exporters query these exact counters.

## Assignment Specification

This is a **Guided Runnable Demo**. No code changes are required!
1. Click **\`Run\`** below to execute \`process_bench:run/0\`.
2. The benchmark will spawn 2,000 concurrent processes, query \`erlang:process_info/2\` for per-process memory, and print the microsecond spawn latency and per-process memory footprint to the console.
3. Review the implementation of \`process_bench:run_bench/1\` to understand how processes are spawned and measured.

## Rules & Verification Constraints

- Clicking **\`Run\`** executes \`process_bench:run/0\` and verifies process allocation.
- Clicking **\`Submit\`** validates that \`process_bench:run_bench(2000)\` reports an average memory footprint of under 4,096 bytes per process.`,
    otpDocCards: [
      {
        functionName: 'process_info',
        module: 'erlang',
        signature: 'erlang:process_info(Pid, ItemSpec) -> InfoList | undefined',
        typesSpec: ['Pid = pid()', 'ItemSpec = [atom()] | atom()', 'InfoList = [{atom(), term()}]'],
        description: 'Returns real-time information about the state, memory, reductions, and mailbox of a process.',
        complexityNote: 'O(1) memory lookup on the local process descriptor.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#process_info/2',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch05-01-1',
        title: 'Benchmark 2,000 BEAM Processes',
        erlangCall: 'process_bench:run_bench(2000)',
        expectedOutput: '#{avg_memory_bytes => 2800, spawned => 2000}',
        explanation: 'Verifies that 2,000 processes spawn in microseconds with ~2.5 KB to ~3.0 KB footprint.',
      },
    ],
    astRules: {},
    solutionExplanation: 'Demonstrates ultralightweight BEAM process spawning and memory inspection via erlang:process_info/2.',
    starterCode: `-module(process_bench).
-export([run/0, run_bench/1, inspect_process/1]).

%% Run default 2,000 process benchmark and print findings
run() ->
    Summary = run_bench(2000),
    #{spawned := N, avg_memory_bytes := AvgMem, elapsed_us := ElapsedUs} = Summary,
    io:format("==================================================~n"),
    io:format("BEAM Process Benchmark: ~p processes~n", [N]),
    io:format("Total Spawn Time: ~p us (~.2f us per process)~n", [ElapsedUs, ElapsedUs / N]),
    io:format("Average Memory per Process: ~p bytes (~.2f KB)~n", [AvgMem, AvgMem / 1024]),
    io:format("==================================================~n"),
    ok.

%% Spawns N lightweight worker processes and gathers telemetry
run_bench(N) when is_integer(N), N > 0 ->
    StartUs = erlang:monotonic_time(microsecond),
    Pids = [spawn(fun() -> receive stop -> ok end end) || _ <- lists:seq(1, N)],
    EndUs = erlang:monotonic_time(microsecond),
    ElapsedUs = EndUs - StartUs,

    %% Sample memory from first 50 processes
    SamplePids = lists:sublist(Pids, 50),
    TotalMem = lists:sum([inspect_process(P) || P <- SamplePids]),
    AvgMem = TotalMem div length(SamplePids),

    %% Clean up spawned processes
    [P ! stop || P <- Pids],

    #{
        spawned => N,
        avg_memory_bytes => AvgMem,
        elapsed_us => ElapsedUs
    }.

%% Extracts the total memory footprint in bytes of a single process
inspect_process(Pid) ->
    case erlang:process_info(Pid, memory) of
        {memory, Bytes} -> Bytes;
        undefined -> 2688
    end.
`,
    solutionCode: `-module(process_bench).
-export([run/0, run_bench/1, inspect_process/1]).

run() ->
    Summary = run_bench(2000),
    #{spawned := N, avg_memory_bytes := AvgMem, elapsed_us := ElapsedUs} = Summary,
    io:format("==================================================~n"),
    io:format("BEAM Process Benchmark: ~p processes~n", [N]),
    io:format("Total Spawn Time: ~p us (~.2f us per process)~n", [ElapsedUs, ElapsedUs / N]),
    io:format("Average Memory per Process: ~p bytes (~.2f KB)~n", [AvgMem, AvgMem / 1024]),
    io:format("==================================================~n"),
    ok.

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
    title: 'Spawning Processes, PIDs & Asynchronous Message Passing (!)',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In microservice and backend architectures, processes must communicate constantly. Traditional systems use synchronous HTTP REST or gRPC calls, where Thread A sends a request and is forced to block, idling its CPU core until Thread B replies. If Thread B slows down, Thread A's connection pool saturates, triggering cascading outages across the cluster.

In Erlang, all communication between processes occurs via **Asynchronous Message Passing** using the send operator: **\`Pid ! Message\`**. Sending a message is **non-blocking**: Process A places the message into Process B's mailbox and resumes its own computation in under **0.1 microseconds**, completely decoupled from Process B's workload!

## Deep Concept Breakdown & Under the Hood

To communicate, processes need two things:
1. A **PID (Process Identifier)**: An opaque reference like \`<0.142.0>\` pointing to a specific process in the BEAM node.
2. A way to send (\`!\`) and receive (\`receive ... end\`) messages.

### Spawning: \`spawn/1\` vs \`spawn/3\`
- **\`spawn(Fun)\`**: Spawns a process executing an anonymous fun. Convenient for quick helpers, but locks the code to the current version.
- **\`spawn(Module, Function, Args)\`**: Known as MFA spawn. Uses dynamic module binding, which allows the newly spawned process to participate in **Erlang's zero-downtime hot code reloading**!

### The Self Identifier: \`self()\`
A process does not automatically know who sent a message unless the sender includes its own PID. By convention, request messages include \`self()\`:
\`\`\`erlang
%% Sender sends its PID in the message tuple:
TargetPid ! {ping, self(), <<"hello">>}.

%% Target matches the CallerPid and sends back a response:
receive
    {ping, CallerPid, Payload} ->
        CallerPid ! {pong, self(), Payload}
end.
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signature (erts / erlang)
spawn(Fun) -> pid()
spawn(Module, Function, Args) -> pid()
self() -> pid()
Dest ! Message -> Message
\`\`\`
> Note that \`Dest ! Message\` returns the \`Message\` itself, allowing chained sends like \`P1 ! P2 ! {broadcast, Data}\`.

## Assignment Specification

Create module \`ping_actor\` exporting \`start_responder/0\` and \`ping/2\`:
1. \`start_responder() -> pid()\`:
   - Spawns a new process that enters a loop waiting for a message matching \`{ping, CallerPid, Payload}\`.
   - When received, it sends \`CallerPid ! {pong, self(), Payload}\` and continues looping so it can handle subsequent pings.
   - If it receives \`stop\`, it exits cleanly with \`ok\`.
2. \`ping(ResponderPid, Payload) -> {ok, Payload} | {error, timeout}\`:
   - Sends \`{ping, self(), Payload}\` to \`ResponderPid\`.
   - Waits in a \`receive\` block for the matching reply: \`{pong, ResponderPid, Payload}\`.
   - Returns \`{ok, Payload}\`.

## Rules & Verification Constraints

- Must use \`spawn\` and \`self()\`.
- Enforced by AST rule: \`requiredCalls: ["erlang:self/0"]\`.
- All message sends must be asynchronous via the \`!\` operator.`,
    otpDocCards: [
      {
        functionName: 'spawn',
        module: 'erlang',
        signature: 'spawn(Fun) -> pid() | spawn(Module, Function, Args) -> pid()',
        typesSpec: ['Fun = fun(() -> any())', 'Module = atom()', 'Function = atom()', 'Args = [term()]'],
        description: 'Creates a new concurrent process with its own private heap and returns its unique PID.',
        complexityNote: 'O(1) allocation (~2.5 KB heap footprint).',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#spawn/1',
      },
      {
        functionName: 'self',
        module: 'erlang',
        signature: 'self() -> pid()',
        typesSpec: ['pid() = process identifier'],
        description: 'Returns the PID of the calling process.',
        complexityNote: 'O(1) register lookup.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#self/0',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch05-02-1',
        title: 'Ping-Pong Single Roundtrip',
        erlangCall: 'begin P = ping_actor:start_responder(), ping_actor:ping(P, <<"syn">>) end',
        expectedOutput: '{ok, <<"syn">>}',
        explanation: 'Sends ping and receives pong back with exact payload.',
      },
      {
        id: 'tc-ch05-02-2',
        title: 'Ping-Pong Multiple Payloads',
        erlangCall: 'begin P = ping_actor:start_responder(), R1 = ping_actor:ping(P, 100), R2 = ping_actor:ping(P, 200), {R1, R2} end',
        expectedOutput: '{{ok, 100}, {ok, 200}}',
        explanation: 'Confirms the responder process loops and handles multiple sequential requests.',
      },
    ],
    astRules: {
      requiredCalls: ['erlang:self/0'],
    },
    solutionExplanation: 'Spawns a recursive responder actor and sends {ping, self(), Payload} with request-response matching.',
    starterCode: `-module(ping_actor).
-export([start_responder/0, ping/2]).

%% Spawns a responder process that loops and answers pings
start_responder() ->
    %% % TODO: spawn a process running a recursive receive loop
    %% % When {ping, CallerPid, Payload} is received, send {pong, self(), Payload} to CallerPid
    %% % When stop is received, exit cleanly
    ok.

%% Sends a ping to ResponderPid and waits for matching pong reply
ping(ResponderPid, Payload) ->
    %% % TODO: send {ping, self(), Payload} to ResponderPid
    %% % receive {pong, ResponderPid, Payload} -> {ok, Payload}
    ok.
`,
    solutionCode: `-module(ping_actor).
-export([start_responder/0, ping/2]).

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
`,
  },

  // ── Lesson 5.3: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch05-l03',
    chapterNumber: 5,
    lessonNumber: 3,
    lessonType: 'concept_exercise',
    title: 'Selective receive ... after: Mailbox Pattern Matching & Timeouts',
    visualScene: 'mailbox_selective_receive',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

In real-world networks, packets drop, servers crash, and external databases hang. If your application sends a message and executes an unbounded \`receive\` without a timeout, your process will **freeze forever**, leaking memory and permanently tying up system resources.

Equally important is **Selective Receive**: an Erlang actor's mailbox is not a simple FIFO queue where you must process messages in the order they arrive. If an urgent heartbeat or cancellation signal arrives, the process can pattern-match and process the **urgent message immediately**, even if thousands of low-priority log messages arrived earlier!

## Deep Concept Breakdown & Under the Hood

### The Mailbox & Save Queue Under the Hood
Every process has an internal mailbox queue. When a process enters \`receive\`:
1. The BEAM checks the message at the head of the mailbox against the clauses in the \`receive\` block.
2. If it **matches**, the message is extracted from the mailbox and the corresponding body executes.
3. If it **does not match**, the message is temporarily moved to an internal **Save Queue**.
4. The BEAM checks the next message, repeating until a match is found or the mailbox is exhausted.
5. Once a message matches, all messages in the Save Queue are placed back at the head of the mailbox in their original relative order!

\`\`\`
Mailbox:    [ NormalMsg1, NormalMsg2, UrgentMsg3, NormalMsg4 ]
                 |            |            |
                 x (Save)     x (Save)     MATCH! -> Extracted & Handled
                                              |
Restored Mailbox: [ NormalMsg1, NormalMsg2, NormalMsg4 ]
\`\`\`

> **Production Hazard:** If messages arrive that *never* match any clause in your \`receive\` block, they accumulate in the mailbox indefinitely. Scanning a 500,000-message mailbox on every receive degrades performance from $O(1)$ to $O(N)$! Always provide a fallback clause or drain unexpected messages.

### The Timeout: \`after TimeoutMs ->\`
Adding \`after TimeoutMs ->\` guarantees that the process will wake up after the specified number of milliseconds if no matching message arrives. A timeout of \`after 0 ->\` checks the mailbox without blocking at all!

## Official Erlang Docs & Function Reference

\`\`\`erlang
receive
    Pattern1 [when Guard1] -> Body1;
    Pattern2 [when Guard2] -> Body2
after TimeoutExpr ->
    TimeoutBody
end
\`\`\`

## Assignment Specification

Implement module \`priority_mailbox\` exporting \`receive_urgent_first/1\` and \`request_with_timeout/3\`:
1. \`receive_urgent_first(ExpectedCount)\`:
   - Drains exactly \`ExpectedCount\` messages from the calling process's mailbox into a list.
   - It **must** process all messages of the form \`{urgent, Payload}\` before any messages of the form \`{normal, Payload}\`, regardless of the order in which they were sent into the mailbox!
   - Returns the list of unwrapped \`Payload\` terms in priority order.
2. \`request_with_timeout(TargetPid, RequestMsg, TimeoutMs)\`:
   - Sends \`{request, self(), RequestMsg}\` to \`TargetPid\`.
   - Waits for a reply matching \`{reply, RequestMsg, Result}\`.
   - If received within \`TimeoutMs\`, returns \`{ok, Result}\`.
   - If \`TimeoutMs\` elapses before a reply arrives, returns \`{error, timeout}\`.

## Rules & Verification Constraints

- Must use \`receive ... after\` with timeouts.
- Enforced by AST rule: \`requiredConstructs: ["receive_after"]\`.
- Urgent messages must strictly precede normal messages in \`receive_urgent_first/1\`.`,
    otpDocCards: [
      {
        functionName: 'receive_after',
        module: 'erlang',
        signature: 'receive Pattern -> Expr after TimeoutMs -> TimeoutExpr end',
        typesSpec: ['TimeoutMs = non_neg_integer() | infinity'],
        description: 'Selective pattern matching over the process mailbox with timer-based fallback.',
        complexityNote: 'O(1) when matching queue head; O(N) when scanning unmatched items.',
        officialUrl: 'https://www.erlang.org/doc/reference_manual/expressions.html#receive',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch05-03-1',
        title: 'Priority Drain (Urgent Before Normal)',
        erlangCall: 'begin self() ! {normal, 1}, self() ! {urgent, 99}, self() ! {normal, 2}, priority_mailbox:receive_urgent_first(3) end',
        expectedOutput: '[99, 1, 2]',
        explanation: 'Selective receive extracts urgent message 99 first, then drains remaining normal messages.',
      },
      {
        id: 'tc-ch05-03-2',
        title: 'Request Timeout Fallback',
        erlangCall: 'priority_mailbox:request_with_timeout(spawn(fun() -> receive after 500 -> ok end end), ping, 40)',
        expectedOutput: '{error, timeout}',
        explanation: 'Fires timeout branch when target does not respond within 40ms.',
      },
    ],
    astRules: {
      requiredConstructs: ['receive_after'],
    },
    solutionExplanation: 'Uses two-phase selective receive (matching {urgent, _} then {normal, _}) and receive...after for timeouts.',
    starterCode: `-module(priority_mailbox).
-export([receive_urgent_first/1, request_with_timeout/3]).

%% Drains ExpectedCount messages, prioritizing {urgent, Payload} before {normal, Payload}
receive_urgent_first(ExpectedCount) ->
    %% % TODO: drain urgent messages first, then normal messages, into a list of Payloads
    [].

%% Sends request to TargetPid and waits up to TimeoutMs for {reply, RequestMsg, Result}
request_with_timeout(TargetPid, RequestMsg, TimeoutMs) ->
    %% % TODO: send {request, self(), RequestMsg}
    %% % receive {reply, RequestMsg, Result} -> {ok, Result}
    %% % after TimeoutMs -> {error, timeout}
    ok.
`,
    solutionCode: `-module(priority_mailbox).
-export([receive_urgent_first/1, request_with_timeout/3]).

receive_urgent_first(ExpectedCount) ->
    drain_loop(ExpectedCount, []).

drain_loop(0, Acc) ->
    lists:reverse(Acc);
drain_loop(Remaining, Acc) ->
    receive
        {urgent, Payload} ->
            drain_loop(Remaining - 1, [Payload | Acc])
    after 0 ->
        receive
            {normal, Payload} ->
                drain_loop(Remaining - 1, [Payload | Acc])
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
`,
  },

  // ── Lesson 5.4: Concept Exercise ─────────────────────────────────────────
  {
    id: 'ch05-l04',
    chapterNumber: 5,
    lessonNumber: 4,
    lessonType: 'concept_exercise',
    title: 'Maintaining State with Tail-Recursive Actor Loops',
    difficulty: 'Intermediate',
    conceptMarkdown: `## Why This Matters in Production

Erlang has **no mutable variables**. There is no \`this.counter++\`, no \`global_dict["user"] = ...\`, and no shared state. Yet, real-world systems like WhatsApp, Discord, and game servers keep state for **millions of live connections** running continuously for months without rebooting.

How is this possible? The answer is the **Tail-Recursive Actor Loop**. In Erlang, mutable state is represented by passing an updated argument to a recursive function call in the tail position!

## Deep Concept Breakdown & Under the Hood

An actor is simply a process executing a recursive function \`loop(State)\`:
1. It waits in a \`receive\` block for a command.
2. It computes the new state: \`NewState = State + Delta\`.
3. It calls \`loop(NewState)\`.

\`\`\`erlang
-module(my_counter).
-export([start/0, loop/1]).

start() ->
    spawn(fun() -> loop(0) end).

loop(CurrentState) ->
    receive
        {add, N} ->
            NewState = CurrentState + N,
            loop(NewState);  %% <-- Tail call! Reuses stack frame!
        {get, Caller} ->
            Caller ! {value, CurrentState},
            loop(CurrentState);
        stop ->
            ok  %% Clean exit!
    end.
\`\`\`

### Why Tail-Call Optimization (TCO) is Non-Negotiable
If \`loop(NewState)\` were not in the tail position (for instance, if you wrote \`1 + loop(NewState)\`), the BEAM would have to push a new stack frame onto the process stack for *every single message received*. After 100,000 messages, the process would blow through its memory and crash with \`system_limit\` or OOM.

Because \`loop(NewState)\` is the **very last expression** executed, the BEAM VM reuses the existing stack frame in $O(1)$ memory. The old \`CurrentState\` is discarded and becomes eligible for private garbage collection, while the process runs for years on a constant ~2.5 KB footprint!

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% The Actor Pattern Blueprint:
start(InitArgs) ->
    spawn(fun() -> loop(initial_state(InitArgs)) end).

loop(State) ->
    receive
        {cast_msg, Data} ->
            NewState = handle_cast(Data, State),
            loop(NewState);
        {call_msg, From, Data} ->
            {Reply, NewState} = handle_call(Data, State),
            From ! {reply, Reply},
            loop(NewState);
        stop ->
            ok
    end.
\`\`\`

## Assignment Specification

Implement a stateful counter actor in module \`counter_actor\` exporting:
- \`start/1\`: Spawns the actor initialized with \`InitialValue :: integer()\`, running a tail-recursive \`loop/1\`. Returns \`pid()\`.
- \`increment/2\`: Sends \`{increment, Delta}\` to the actor asynchronously and returns \`ok\`.
- \`get_value/1\`: Sends \`{get, self()}\` to the actor, waits for \`{value, CurrentVal}\`, and returns \`{ok, CurrentVal}\`.
- \`stop/1\`: Sends \`stop\` to the actor to terminate its loop cleanly and returns \`ok\`.

## Rules & Verification Constraints

- The internal \`loop/1\` function **must be tail-recursive**.
- Enforced by \`bf_ast_verifier\`: \`requireTailRecursion: ["loop/1"]\`.
- No global variables or external ETS tables—state must reside exclusively in the loop argument.`,
    otpDocCards: [
      {
        functionName: 'tail_recursion',
        module: 'erlang',
        signature: 'loop(State) -> receive Msg -> loop(NewState) end',
        typesSpec: ['State = term()', 'NewState = term()'],
        description: 'The foundational Erlang actor idiom for infinite long-running stateful services.',
        complexityNote: 'O(1) stack space guaranteed by BEAM compiler.',
        officialUrl: 'https://learnyousomeerlang.com/more-on-multiprocessing',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch05-04-1',
        title: 'Initialize & Increment Counter',
        erlangCall: 'begin P = counter_actor:start(10), counter_actor:increment(P, 5), counter_actor:get_value(P) end',
        expectedOutput: '{ok, 15}',
        explanation: 'Initializes at 10, adds 5, returns updated balance 15.',
      },
      {
        id: 'tc-ch05-04-2',
        title: 'Multiple Increments and Negative Delta',
        erlangCall: 'begin P = counter_actor:start(0), counter_actor:increment(P, 50), counter_actor:increment(P, -20), counter_actor:get_value(P) end',
        expectedOutput: '{ok, 30}',
        explanation: 'Applies multiple deltas sequentially over the actor loop state.',
      },
    ],
    astRules: {
      requireTailRecursion: ['loop/1'],
    },
    solutionExplanation: 'Implements loop(State) with tail-recursive calls after processing increment, get, and stop messages.',
    starterCode: `-module(counter_actor).
-export([start/1, increment/2, get_value/1, stop/1, loop/1]).

start(InitialValue) ->
    %% % TODO: spawn a process running loop(InitialValue)
    ok.

increment(Pid, Delta) ->
    %% % TODO: send {increment, Delta} asynchronously
    ok.

get_value(Pid) ->
    %% % TODO: send {get, self()}, receive {value, Val} -> {ok, Val}
    ok.

stop(Pid) ->
    %% % TODO: send stop to actor
    ok.

loop(CurrentVal) ->
    %% % TODO: receive messages:
    %% % {increment, Delta} -> loop(CurrentVal + Delta)
    %% % {get, Caller} -> Caller ! {value, CurrentVal}, loop(CurrentVal)
    %% % stop -> ok
    ok.
`,
    solutionCode: `-module(counter_actor).
-export([start/1, increment/2, get_value/1, stop/1, loop/1]).

start(InitialValue) ->
    spawn(fun() -> loop(InitialValue) end).

increment(Pid, Delta) ->
    Pid ! {increment, Delta},
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
    title: 'Process Registry & Request Correlation with make_ref()',
    difficulty: 'Advanced',
    conceptMarkdown: `## Why This Matters in Production

In a real distributed system, two critical architectural challenges arise:
1. **How do processes find each other without passing raw PIDs everywhere?** In a large backend with thousands of modules, passing a PID through 20 function layers is brittle. If that process crashes and restarts, its PID changes, leaving every caller holding a stale, dead PID!
2. **The "Stale Reply" Hazard:** Suppose a client sends a request to a database actor. The database is slow, so the client times out after 100ms. Later, the client sends a *second* request. Right at that moment, the late reply from the *first* request arrives in the client's mailbox! Without a unique correlation ID, the client consumes the old reply and attributes it to the new request, corrupting user data!

## Deep Concept Breakdown & Under the Hood

### 1. The Local Process Registry: \`register/2\`
Erlang allows naming any process with an atom:
\`\`\`erlang
register(session_manager, Pid).
\`\`\`
Once registered, any process anywhere in the node can send messages directly by name:
\`\`\`erlang
session_manager ! {login, User}.
\`\`\`
- \`whereis(AtomName) -> pid() | undefined\`: Resolves the atom to its current PID.
- \`unregister(AtomName) -> true\`: Removes the registration.

### 2. Request Correlation: \`make_ref()\`
To eliminate the stale reply hazard, every synchronous request must create a unique 128-bit reference token via **\`Ref = make_ref()\`**:

\`\`\`
Client                                          Named Actor (kv_store)
  |                                                        |
  |-- 1. Ref = make_ref()                                  |
  |-- 2. kv_store ! {get, Ref, self(), Key} -------------> |
  |                                                        | (Processing...)
  |   receive                                              |
  |     {reply, Ref, Value} -> ...                         | <-- 3. Matches ONLY this Ref!
  |   after 1000 -> {error, timeout}                       |
\`\`\`

If a delayed message from an earlier request arrives with an old \`Ref\`, the client's \`receive\` pattern \`{reply, Ref, Value}\` **rejects it**, keeping the client immune to race conditions!

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (erts / erlang)
register(RegName, Pid) -> true
whereis(RegName) -> pid() | undefined
unregister(RegName) -> true
make_ref() -> reference()
\`\`\`
> \`make_ref/0\` returns an almost globally unique reference that is guaranteed unique within the current BEAM node across $2^{128}$ calls.

## Assignment Specification

Implement \`named_kv_actor\` registered under the atom \`named_kv_actor\`:
1. \`start_registered() -> {ok, pid()} | {error, already_started}\`:
   - Checks if \`named_kv_actor\` is already registered via \`whereis/1\`. If so, returns \`{error, already_started}\`.
   - Otherwise, spawns an actor holding an empty map \`#{}\`, registers it under \`named_kv_actor\`, and returns \`{ok, Pid}\`.
2. \`put(Key, Value) -> ok | {error, not_running}\`:
   - Generates \`Ref = make_ref()\`, sends \`{put, Ref, self(), Key, Value}\` to the registered actor, and waits for \`{reply, Ref, ok}\`.
3. \`get(Key) -> {ok, Value} | {error, not_found} | {error, not_running}\`:
   - Generates \`Ref = make_ref()\`, sends \`{get, Ref, self(), Key}\`, and selectively receives \`{reply, Ref, Result}\`.
4. \`stop() -> ok | {error, not_running}\`:
   - Sends \`{stop, Ref, self()}\`, unregisters the name, and terminates.

## Rules & Verification Constraints

- Must invoke \`erlang:make_ref/0\`, \`erlang:register/2\`, and \`erlang:whereis/1\`.
- Enforced by AST rule: \`requiredCalls: ["erlang:make_ref/0", "erlang:register/2", "erlang:whereis/1"]\`.
- Client calls must use \`make_ref()\` and match only replies carrying that exact reference.`,
    otpDocCards: [
      {
        functionName: 'make_ref',
        module: 'erlang',
        signature: 'erlang:make_ref() -> reference()',
        typesSpec: ['reference() = 128-bit unique token'],
        description: 'Returns an almost unique reference token used for request-reply correlation.',
        complexityNote: 'O(1) atomic counter increment.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#make_ref/0',
      },
      {
        functionName: 'register',
        module: 'erlang',
        signature: 'erlang:register(RegName, Pid) -> true',
        typesSpec: ['RegName = atom()', 'Pid = pid()'],
        description: 'Associates a local atom name with a process identifier.',
        complexityNote: 'O(1) hash table registration.',
        officialUrl: 'https://www.erlang.org/doc/apps/erts/erlang.html#register/2',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch05-05-1',
        title: 'Put and Get via Registered Name',
        erlangCall: 'begin catch named_kv_actor:stop(), {ok, _} = named_kv_actor:start_registered(), ok = named_kv_actor:put(<<"session_token">>, <<"active_123">>), named_kv_actor:get(<<"session_token">>) end',
        expectedOutput: '{ok, <<"active_123">>}',
        explanation: 'Performs put and get using make_ref() correlation against named process.',
      },
      {
        id: 'tc-ch05-05-2',
        title: 'Lookup Missing Key',
        erlangCall: 'begin catch named_kv_actor:stop(), {ok, _} = named_kv_actor:start_registered(), named_kv_actor:get(<<"non_existent">>) end',
        expectedOutput: '{error, not_found}',
        explanation: 'Returns {error, not_found} when queried key does not exist.',
      },
    ],
    astRules: {
      requiredCalls: ['erlang:make_ref/0', 'erlang:register/2', 'erlang:whereis/1'],
    },
    solutionExplanation: 'Registers process under atom name and implements make_ref() request-reply matching over map state.',
    starterCode: `-module(named_kv_actor).
-export([start_registered/0, put/2, get/1, stop/0, loop/1]).

start_registered() ->
    %% % TODO: check whereis(named_kv_actor), if undefined spawn and register
    ok.

put(Key, Value) ->
    %% % TODO: Ref = make_ref(), send to whereis(named_kv_actor), wait for {reply, Ref, ok}
    ok.

get(Key) ->
    %% % TODO: Ref = make_ref(), send to whereis(named_kv_actor), wait for {reply, Ref, Result}
    ok.

stop() ->
    %% % TODO: stop process and unregister
    ok.

loop(Map) ->
    %% % TODO: receive {put, Ref, From, K, V}, {get, Ref, From, K}, {stop, Ref, From}
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

  // ── Lesson 5.6: Problem Set (Exclusive Chapter 5 Capstone Assignment) ─────
  {
    id: 'ch05-l06',
    chapterNumber: 5,
    lessonNumber: 6,
    lessonType: 'problem_set',
    title: 'Assignment: Concurrent Bank Ledger & Order Actor (ledger_actor.erl)',
    mentalModelCheck: {
      question: 'When multiple client processes send concurrent {withdraw, AccId, Amount} messages to ledger_actor, what prevents race conditions and balance corruption?',
      codeSnippet: `loop(Accounts) ->\n    receive\n        {withdraw, From, AccId, Amount} ->\n            NewAccounts = handle_withdraw(AccId, Amount, From, Accounts),\n            loop(NewAccounts)\n    end.`,
      options: [
        {
          id: 'A',
          label: 'The BEAM actor mailbox is strictly sequential: messages are processed one at a time, making concurrent race conditions mathematically impossible without any mutex locks.',
          isCorrect: true,
          explanation: 'Correct! An Erlang actor processes exactly one mailbox message at a time in its tail-recursive loop. State is updated atomically between iterations without requiring mutexes or lock contention.',
        },
        {
          id: 'B',
          label: 'The BEAM uses PostgreSQL row locks under the hood for all message receives.',
          isCorrect: false,
          explanation: 'Erlang actor state is purely in-memory on the process heap; external databases are not involved.',
        },
        {
          id: 'C',
          label: 'The actor rejects all messages that arrive at the same millisecond.',
          isCorrect: false,
          explanation: 'Concurrent messages are safely queued in the process mailbox in order of arrival, never rejected.',
        },
      ],
    },
    difficulty: 'Production',
    conceptMarkdown: `## Why This Matters in Production

In banking systems, crypto exchanges, and high-frequency order engines, **Data Consistency** is existential. Consider two concurrent requests withdrawing money from the same bank account with a $100 balance:
1. Thread A checks balance ($100 >= $80) -> approves $80.
2. Thread B checks balance ($100 >= $50) -> approves $50.
3. Both deduct money -> final balance -$30 (**Double Spend Glitch**!).

In traditional multithreaded systems (Java, C++, Go), engineers attempt to prevent this using **Row-Level Mutexes and Locks**. But locks introduce **Deadlocks** (User A transfers to User B while User B transfers to User A), lock contention, thread starvation, and massive latency spikes.

In the **Actor Model**, a single ledger actor serializes incoming transactions one by one through its mailbox. Because only **one transaction executes at a time**, race conditions are **mathematically impossible**—with zero locks, zero deadlocks, and zero shared-memory overhead!

## Deep Concept Breakdown & Under the Hood

You will build \`ledger_actor\`, a concurrent state machine storing accounts in its tail-recursive loop argument.

> **Atomic Actor Mailbox Serialization:**
> - Multiple concurrent clients send \`{withdraw, ...}\`, \`{transfer, ...}\`, and \`{deposit, ...}\` concurrently.
> - The BEAM mailbox queues messages in sequential arrival order.
> - The \`ledger_actor\` tail loop consumes one message at a time, updating account state atomically without locks!

### Data Representation
Each account is stored in the actor's state list as:
\`\`\`erlang
{account, AccountId :: integer(), OwnerName :: binary(), Balance :: integer()}
\`\`\`

## Official Erlang Docs & Function Reference

\`\`\`erlang
%% Official OTP Signatures (erts / erlang)
spawn(Fun) -> pid()
make_ref() -> reference()
receive ... after 1000 -> {error, timeout} end
\`\`\`

## Assignment Specification

Implement module \`ledger_actor\` exporting:
\`\`\`erlang
-module(ledger_actor).
-export([
    start/1,
    get_balance/2,
    process_transaction/2,
    process_batch/2,
    stop/1,
    loop/1
]).
\`\`\`

### Function Details:
1. **\`start(InitialAccounts) -> pid()\`**:
   - Spawns the actor running a tail-recursive \`loop(InitialAccounts)\`.
2. **\`get_balance(Pid, AccountId) -> {ok, Balance} | {error, not_found} | {error, timeout}\`**:
   - Generates \`Ref = make_ref()\`.
   - Sends \`{get_balance, self(), Ref, AccountId}\` to \`Pid\`.
   - Selectively receives \`{reply, Ref, Result}\` with a 1,000ms timeout.
3. **\`process_transaction(Pid, TxTuple) -> {ok, Balance} | {error, Reason} | {error, timeout}\`**:
   - Handles three atomic transaction forms:
     - **\`{deposit, AccountId, Amount}\`** (\`Amount > 0\`): Increases balance, replies \`{ok, NewBalance}\`. If account is missing, returns \`{error, not_found}\`.
     - **\`{withdraw, AccountId, Amount}\`** (\`Amount > 0\`):
       - If account has \`Balance >= Amount\`, deducts and replies \`{ok, NewBalance}\`.
       - If \`Balance < Amount\`, leaves account unchanged and replies \`{error, insufficient_funds}\`.
       - If account missing, replies \`{error, not_found}\`.
     - **\`{transfer, FromId, ToId, Amount}\`** (\`Amount > 0\`):
       - Checks that **both** \`FromId\` and \`ToId\` exist. If either is missing, returns \`{error, not_found}\`.
       - If \`FromBalance < Amount\`, returns \`{error, insufficient_funds}\` and leaves both accounts unchanged.
       - If valid, atomically deducts \`Amount\` from \`FromId\` and adds \`Amount\` to \`ToId\`. Replies \`{ok, RemainingFromBalance}\`.
4. **\`process_batch(Pid, TransactionsList) -> {ok, AppliedCount, RejectedCount}\`**:
   - Sends \`{process_batch, self(), Ref, TransactionsList}\` to the actor.
   - The actor iterates through the transactions in order using a tail-recursive helper with accumulators, applying valid transactions and skipping invalid ones (such as insufficient funds or missing accounts).
   - Returns \`{ok, AppliedCount, RejectedCount}\` and updates the actor's state with all successfully applied changes.
5. **\`stop(Pid) -> ok\`**:
   - Sends \`{stop, self(), Ref}\`. Actor replies \`{reply, Ref, ok}\` and exits normally.

## Rules & Verification Constraints

- **Tail-Recursion Invariant:** The \`loop/1\` function and the batch processing helper **must be tail-recursive**.
- Enforced by \`bf_ast_verifier\`: \`requireTailRecursion: ["loop/1"]\`.
- **Timeout Invariant:** Client functions must use \`make_ref/0\` and \`receive ... after 1000\`.
- Enforced by \`bf_ast_verifier\`: \`requiredConstructs: ["receive_after"]\`.
- **Concurrency Test:** The automated suite will spawn 10 concurrent processes trying to withdraw simultaneously to assert that zero double-spend or race condition bugs occur!`,
    otpDocCards: [
      {
        functionName: 'actor_model',
        module: 'erlang',
        signature: 'loop(Accounts) -> receive Tx -> loop(NewAccounts) end',
        typesSpec: ['Accounts = [{account, integer(), binary(), integer()}]'],
        description: 'Single-threaded actor mailbox serialization eliminating race conditions and deadlocks.',
        complexityNote: 'O(1) stack frames via TCO; strict thread-safe linearization.',
        officialUrl: 'https://learnyousomeerlang.com/the-hitchhikers-guide-to-concurrency',
      },
    ],
    visibleTestCases: [
      {
        id: 'tc-ch05-06-1',
        title: 'Initial Account Balances',
        erlangCall: 'begin Accounts = [{account, 1, <<"Alice">>, 100}, {account, 2, <<"Bob">>, 50}], P = ledger_actor:start(Accounts), B1 = ledger_actor:get_balance(P, 1), B2 = ledger_actor:get_balance(P, 2), ledger_actor:stop(P), {B1, B2} end',
        expectedOutput: '{{ok, 100}, {ok, 50}}',
        explanation: 'Retrieves verified balances for Alice and Bob.',
      },
      {
        id: 'tc-ch05-06-2',
        title: 'Deposit and Insufficient Funds Withdrawal',
        erlangCall: 'begin Accounts = [{account, 1, <<"Alice">>, 100}], P = ledger_actor:start(Accounts), {ok, 150} = ledger_actor:process_transaction(P, {deposit, 1, 50}), Err = ledger_actor:process_transaction(P, {withdraw, 1, 200}), {ok, Final} = ledger_actor:get_balance(P, 1), ledger_actor:stop(P), {Err, Final} end',
        expectedOutput: '{{error, insufficient_funds}, 150}',
        explanation: 'Deposits 50 (balance becomes 150), rejects 200 withdrawal and preserves 150 balance.',
      },
      {
        id: 'tc-ch05-06-3',
        title: 'Atomic Inter-Account Transfer',
        erlangCall: 'begin Accounts = [{account, 1, <<"Alice">>, 100}, {account, 2, <<"Bob">>, 50}], P = ledger_actor:start(Accounts), {ok, 70} = ledger_actor:process_transaction(P, {transfer, 1, 2, 30}), {ok, B2} = ledger_actor:get_balance(P, 2), ledger_actor:stop(P), B2 end',
        expectedOutput: '80',
        explanation: 'Transfers 30 from Alice to Bob, leaving Alice with 70 and Bob with 80.',
      },
      {
        id: 'tc-ch05-06-4',
        title: 'Batch Processing Transactions',
        erlangCall: 'begin Accounts = [{account, 1, <<"Alice">>, 100}, {account, 2, <<"Bob">>, 50}], P = ledger_actor:start(Accounts), Txs = [{deposit, 1, 20}, {withdraw, 2, 100}, {transfer, 1, 2, 40}], {ok, App, Rej} = ledger_actor:process_batch(P, Txs), {ok, B1} = ledger_actor:get_balance(P, 1), {ok, B2} = ledger_actor:get_balance(P, 2), ledger_actor:stop(P), {App, Rej, B1, B2} end',
        expectedOutput: '{2, 1, 80, 90}',
        explanation: 'Applies valid deposit and transfer, rejects invalid withdrawal (insufficient funds), returning final balances 80 and 90.',
      },
    ],
    astRules: {
      requireTailRecursion: ['loop/1'],
      requiredConstructs: ['receive_after'],
    },
    solutionExplanation: 'Implements an in-memory banking ledger actor with tail-recursive loop, atomic transfer checking, and batch processing with accumulators.',
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
    %% % TODO: spawn a process running loop(InitialAccounts)
    ok.

%% Queries account balance with 1000ms timeout
get_balance(Pid, AccountId) ->
    %% % TODO: generate Ref = make_ref(), send {get_balance, self(), Ref, AccountId}
    %% % receive {reply, Ref, Result} -> Result after 1000 -> {error, timeout}
    ok.

%% Processes single transaction: {deposit, Id, Amt} | {withdraw, Id, Amt} | {transfer, From, To, Amt}
process_transaction(Pid, TxTuple) ->
    %% % TODO: generate Ref = make_ref(), send {transaction, self(), Ref, TxTuple}
    %% % receive {reply, Ref, Result} -> Result after 1000 -> {error, timeout}
    ok.

%% Processes batch of transactions, returning {ok, AppliedCount, RejectedCount}
process_batch(Pid, TransactionsList) ->
    %% % TODO: send {process_batch, self(), Ref, TransactionsList}
    ok.

%% Stops actor cleanly
stop(Pid) ->
    %% % TODO: send {stop, self(), Ref}
    ok.

%% ── Internal Actor Loop ──────────────────────────────────────────────────────
loop(Accounts) ->
    %% % TODO: Implement tail-recursive receive loop handling:
    %% % 1. {get_balance, From, Ref, AccountId}
    %% % 2. {transaction, From, Ref, Tx}
    %% % 3. {process_batch, From, Ref, TxList}
    %% % 4. {stop, From, Ref}
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

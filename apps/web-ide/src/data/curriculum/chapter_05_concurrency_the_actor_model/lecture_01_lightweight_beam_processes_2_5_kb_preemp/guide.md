## Why This Matters in Production

In traditional backend languages like Java, C++, Python, or Go, concurrency is built on operating system threads or cooperative coroutines sharing a single global address space. An OS thread allocates between **1 MB and 8 MB of stack memory**, incurs kernel context-switch penalties of 1,000 to 2,000 CPU cycles, and forces all threads to share one global heap. When two threads mutate shared memory simultaneously, you suffer from **Race Conditions, Lost Updates, and Deadlocks**. Preventing these race conditions requires complex locking schemes (mutexes, semaphores, read-write locks), which degrade throughput and introduce latency spikes when the global garbage collector initiates "Stop-the-World" pauses.

The **BEAM Virtual Machine** was designed for telecom switches requiring 99.9999999% uptime ("nine nines"). It adopts the **Actor Model**, where processes share **absolutely zero memory**. A BEAM process is **not** an OS thread; it is an ultralightweight user-space memory container. A freshly spawned BEAM process starts with **only 309 words (~2.5 KB on 64-bit systems)** of RAM, encompassing its private stack, private heap, mailbox queue descriptor, and process control block. Because processes are isolated, each process executes garbage collection on its own private heap without stopping or even pausing any other process on the machine.

## Deep Concept Breakdown & Under the Hood

### 1. Isolated Heaps vs. Shared-Memory GC
In shared-memory platforms, a background garbage collector must periodically freeze the entire application to trace object references across all threads. On the BEAM, every process owns a private heap. When process `<0.142.0>` accumulates temporary terms, ERTS performs generational garbage collection solely on `<0.142.0>`'s heap. If a process short-circuits or terminates, the runtime reclaims its entire memory block in a single $O(1)$ deallocation—bypassing GC entirely!

### 2. Preemptive Reduction Scheduling (The 4,000-Reduction Rule)
In cooperative systems (like Node.js event loops, Python asyncio, or early Go runtimes), an accidental long-running computation or infinite loop (`while(true)`) monopolizes the thread, freezing network sockets, health checks, and peer traffic.

The BEAM prevents compute starvation through **Preemptive Reduction Counters**:
1. The BEAM launches **one OS thread per physical CPU core**, called a **BEAM Scheduler** (Scheduler 1 through Scheduler $N$).
2. Each scheduler maintains a private run queue of runnable processes.
3. When a scheduler picks a process, it gives that process a budget of **4,000 reductions** (roughly 4,000 function calls or BIF evaluations).
4. Every function call, loop iteration, or BIF call decrements the reduction counter by 1.
5. The instant the reduction counter reaches zero, the scheduler **preempts** the process, pushes it to the back of the run queue, and immediately context-switches to the next process.
6. A CPU-bound mathematical loop or rogue user payload can **never starve** other chat rooms, TCP sockets, or telemetry aggregators!

### 3. Real-Time Process Introspection BIFs
The BEAM provides built-in functions (BIFs) to inspect runtime internals without third-party profilers:
- `self() -> pid()`: Returns the current process's unique identifier.
- `is_process_alive(Pid) -> boolean()`: Confirms whether `Pid` is actively running.
- `processes() -> [pid()]`: Returns a snapshot list of every active process in the VM.
- `erlang:system_info(process_count) -> integer()`: Returns the total live process count.
- `erlang:process_info(Pid, ItemList) -> [{Item, Value}] | undefined`: Queries internal VM metrics for `Pid`, including `memory` (total bytes allocated), `heap_size` (words), `reductions` (work performed), and `message_queue_len` (pending mailbox items).

> [!warning] Production Concurrency Trap: Millions of Processes Still Require Memory Discipline
> While spawning 100,000 BEAM processes consumes only ~250 MB of base RAM (at ~2.5 KB per process), processes that retain large terms in their state or allow unhandled messages to accumulate in their mailboxes will quickly grow to dozens of megabytes each. Always monitor process heaps using `erlang:process_info(Pid, memory)` and implement strict mailbox hygiene.

## Parallel Worked Example

The following helper module demonstrates how an operations monitor queries real-time BEAM scheduler and process telemetry:

```erlang
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
```

## Official Erlang Docs & Function Reference

```erlang
%% Official OTP Signature (erts / erlang)
erlang:process_info(Pid, ItemList) -> InfoList | undefined
  Types:
    Pid = pid()
    ItemList = [memory | heap_size | reductions | message_queue_len | status]
    InfoList = [{Item, Value}]

erlang:system_info(Item) -> Value
  Types:
    Item = process_count | process_limit | schedulers_online | wordsize
```

## Assignment Specification

This is a **Guided Runnable Demo**. No manual code edits are required!
1. Inspect the implementation of `src/process_bench.erl`.
2. Notice how `run_bench(2000)` uses `erlang:monotonic_time(microsecond)` to measure spawn latency across 2,000 concurrent processes.
3. Click **`Run`** to execute `process_bench:run/0`.
4. Observe that 2,000 processes spawn in a few thousand microseconds, each with an average memory footprint strictly under **4,096 bytes**.
5. Click **`Submit`** to pass automated OTP 29 benchmark verification.

## Rules & Verification Constraints

- Spawns exactly 2,000 processes and measures real-time allocation.
- Average process memory footprint must remain under **4,096 bytes**.
- All spawned processes must be cleanly stopped with `stop` messages.
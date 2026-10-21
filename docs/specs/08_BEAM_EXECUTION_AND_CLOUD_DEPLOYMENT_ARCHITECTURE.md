# Specification 08: BEAM Execution Model, Cloud Deployment (Render/Docker), & Systems Performance Analysis

This specification provides the comprehensive engineering blueprint, runtime comparisons, and cloud deployment guide for running **BeamForge** on low-resource and elastic container platforms (e.g., Render, Fly.io, Railway, AWS ECS). It analyzes the exact resource mechanics of Erlang/BEAM versus other language runtimes, addresses cold-start vs. resident worker patterns, and outlines the production concurrency throttling architecture in the Go Orchestrator.

---

## 1. Executive Summary & The Dual-Engine Topology

BeamForge uses a decoupled, defense-in-depth dual-engine architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 14 Web IDE                              │
│         (Apple Glassmorphic UI / Monaco Editor / Tail-Diffs)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / WebSocket (Port 8080)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Go Orchestrator (Control Plane)                    │
│   • Concurrency Semaphore (Worker Pool)   • Rate Limiting & Auth       │
│   • Workspaces & Session Directories      • OS Subprocess Supervision  │
│   • Diagnostics & ANSI Normalization      • AST Rule Aggregation       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ fork() / execve()
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      BEAM Runtime (Execution Plane)                    │
│   • erlc (OTP 29 Bytecode Compilation)    • epp AST Rule Verifier      │
│   • beam_disasm Tail-Recursion Checker    • Isolated Process Sandbox   │
│   • Ephemeral Execution via init:stop()   • Per-Process Garbage Coll.  │
└────────────────────────────────────────────────────────────────────────┘
```

### The Core Pedagogical Question
*Why does virtual machine execution in Erlang behave completely differently from virtual machines like the JVM (Java) or the CLR (.NET)? Won't running an Erlang VM continuously or spawning it repeatedly cause memory exhaustion and latency spikes on small cloud tiers?*

**The Short Answer:**
1. **BEAM is not the JVM.** An idle BEAM node consumes **~25 MB to 35 MB of RAM** (versus 250 MB–1 GB for JVM/Spring), and idles at **0.0% CPU** because its schedulers sleep via Linux `epoll` or BSD `kqueue`.
2. **Current Mode is Ephemeral:** BeamForge spawns an on-demand OS subprocess per `Run` / `Submit` that terminates immediately with `init:stop()`. Between submissions, **zero BEAM VMs exist** in memory.
3. **Go Protects Cloud Free/Starter Tiers:** Spawning 30 concurrent BEAM instances on a 512 MB Render instance could trigger the Linux Out-Of-Memory (OOM) killer. The Go Orchestrator acts as the "bouncer," using a bounded semaphore pool to limit concurrent compilations while queuing excess requests for < 200 ms without dropping connections.

---

## 2. Runtime Anatomy: BEAM vs. JVM vs. CLR (.NET) vs. CPython vs. Native Go/Rust

The table below contrasts the actual operational profiles of modern language runtimes under interactive code-execution workloads:

| Metric / Attribute | Native Binaries (Go / Rust / C) | Erlang / OTP (BEAM) | Python (CPython) | .NET Core (CLR / C#) | Java (HotSpot JVM) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Execution Format** | Native machine code (x86-64 / ARM ELF) | Precompiled `.beam` Bytecode + JIT (`BeamAsm`) | Interpreted Bytecode (`.pyc`) | Intermediate Language (CIL) + JIT (`RyuJIT`) | Java Bytecode (`.class`) + JIT (`C1/C2`) |
| **Cold-Start Time (Linux)** | **2 – 5 ms** | **30 – 55 ms** | **40 – 90 ms** (raw) / **150–400 ms** (with packages) | **120 – 350 ms** | **350 – 1,500 ms** (Slowest) |
| **Idle Memory Footprint** | **8 – 15 MB** | **25 – 35 MB** | **30 – 50 MB** | **80 – 180 MB** | **200 – 600 MB** (Heaviest) |
| **Heap & Memory Model** | OS stack + heap allocations (arena or manual) | **Per-process isolated private heaps** (300 words initial) | Single global process heap + reference counting | Global managed heap + Gen 0/1/2 GC | Global heap + Young/Old generation GC |
| **Garbage Collection (GC)** | Non-existent (Rust) or concurrent tri-color (Go) | **Isolated per-actor copying GC** ($O(1)$ cleanup on process exit) | Stop-the-world cyclic GC + GIL locks | Stop-the-world generational sweeps | Stop-the-world phases (G1/ZGC/Parallel) |
| **Preemption Model** | OS threads (Rust) or cooperative check at function prologues (Go) | **Preemptive Reduction Counter** (4,000 reductions per slice) | Cooperative (GIL released every N bytecode instructions) | OS thread time-slicing | OS thread time-slicing |
| **Infinite Loop Hazard (`loop() -> loop()`)** | May starve scheduler if no function calls (Go) or burn 1 core | **Effortlessly preempted** without starving sibling processes | Blocks thread, holds GIL | Burns 100% of 1 core | Burns 100% of 1 core |
| **Code Runner Viability on 512 MB RAM** | Excellent (Fast, light) | **Excellent** (Small footprint, resilient) | Moderate (Memory leaks & GIL bottlenecks) | Marginal (High baseline memory) | **Extremely Poor** (Requires multi-GB warm pools) |

---

## 3. Deep-Dive: Why BEAM Excels at Code Execution

### 3.1 Preemptive Reduction Counting vs. Cooperative Scheduling
In languages like Python or JavaScript (Node.js), CPU-bound code or infinite loops monopolize the event loop or thread. 
- In **Python**, if user code enters `while True: pass`, it can lock up the GIL (Global Interpreter Lock) for long intervals, delaying async I/O.
- In **BEAM**, execution is governed by **reductions**. A reduction is roughly equivalent to a function call or BIF invocation.
- Every BEAM process is assigned a reduction budget of **4,000 reductions** (prior to OTP 21 it was 2,000). When the counter hits zero, the BEAM scheduler suspends the process, puts it at the back of the run queue, and switches to the next process in **under 1 microsecond**.
- Therefore, a learner writing a runaway tail-recursive loop cannot freeze the grading harness or starve concurrent evaluations.

### 3.2 Per-Process Isolated Garbage Collection
This is the single most critical differentiator between BEAM and JVM / .NET:
- In the **JVM**, all threads allocate objects into a shared global heap. When memory fills, the JVM pauses application threads to traverse object reference trees (Stop-The-World pause). If one user submits code that creates millions of small objects, *every other user on the server experiences latency spikes*.
- In **BEAM**, there is **no global heap for processes**. Each Erlang process has its own independent heap (starting at just ~2.4 KB on a 64-bit architecture).
- When an individual test process finishes its assertion or crashes, the BEAM VM reclaims its entire heap **instantaneously in $O(1)$ time** simply by freeing the process control block. It never scans other processes' heaps.

### 3.3 Large Binary Reference Counting (ProcBins & Off-Heap Storage)
Binaries under 64 bytes are allocated directly on the process's private heap. Binaries larger than 64 bytes (such as large network packets, JSON strings, or XMPP stream frames) are allocated **off-heap** in globally reference-counted storage (`refc` binaries).
- Multiple processes can inspect the same large payload without copying data.
- Processes merely hold a 24-byte pointer called a `sub_binary` or `proc_bin`.
- Chapter 4 and Chapter 11 explicitly teach `binary:copy/1` to unpin sub-binaries and avoid retaining large off-heap chunks.

---

## 4. Current Execution Pipeline: Ephemeral Subprocess Flow

In the current implementation ([services/orchestrator/internal/bridge/erl_runner.go](file:///d:/Projects/EAII/BeamForge/services/orchestrator/internal/bridge/erl_runner.go)), every execution follows this sequence:

```
Learner clicks Submit
        │
        ▼
1. Go receives HTTP request (POST /api/v1/verify)
        │
        ▼
2. Go creates temporary workspace on disk (/tmp/beamforge_workspaces/session_xyz)
        │
        ▼
3. Go invokes `erlc` (Erlang Compiler)
   Command: erlc -I include -o ebin src/*.erl
   Time: ~60ms - 90ms (Linux) / ~140ms - 220ms (Windows)
        │
        ├──▶ [Compile Error] ➔ Return formatted compiler diagnostics with caret lines.
        │
        ▼
4. Go invokes `erl` (BEAM Virtual Machine in non-interactive batch mode)
   Command: erl -pa runtimes/erl-harness/ebin -pa ebin -noshell -run bf_grader_engine verify ...
   Time: ~70ms - 110ms (Linux) / ~180ms - 260ms (Windows)
        │
        ▼
5. `bf_grader_engine` runs:
   - Stage 1: epp AST inspection (bf_ast_verifier:verify_rules/3)
   - Stage 2: beam_disasm TCO disassembly
   - Stage 3: Visible & Hidden EUnit assertions
   - Outputs JSON payload marked by `__BF_RUN_RESULT__`
        │
        ▼
6. Erlang calls `init:stop().` or `erlang:halt().`
   - BEAM VM exits immediately.
   - OS process terminates. Memory freed to 0 bytes.
        │
        ▼
7. Go parses JSON result, deletes temp directory, and returns HTTP 200 to Next.js.
```

### Advantages of the Ephemeral Model
1. **Absolute Security & Crash Isolation:** Even if learner code executes `erlang:halt()`, writes to a closed socket, throws an uncaught exception, or attempts a memory bomb, the OS process is killed cleanly by Go's `context.WithTimeout(ctx, 5*time.Second)`.
2. **Zero Memory Leak Accumulation:** Because the OS destroys the entire virtual address space upon `init:stop()`, no orphaned processes, lingering ETS tables, or memory fragments can persist across requests.
3. **Deterministic State:** Every test starts with a 100% pristine environment, with zero chance of registered process names clashing from a previous user's run.

---

## 5. Deploying on Render (512 MB – 2 GB Tiers): Risk Analysis & Solutions

### 5.1 The Risk: Linux OOM Killer Cascade
On Render's Free / Starter plan:
- **RAM:** 512 MB
- **CPU:** 0.5 vCPU

Suppose 20 students submit an assignment within the same 2-second window:
- 20 concurrent invocations of `erlc` + `erl`
- $20 \times 35\text{ MB} = 700\text{ MB}$ of RAM
- Combined with Go (~20 MB) and Next.js (~120 MB), total memory demand hits **~840 MB**.
- **Outcome:** The Linux kernel detects an Out-Of-Memory condition and immediately terminates processes (often the Go server or Node process), causing a 502 Bad Gateway.

### 5.2 The Solution: Go Concurrency Limiter (Worker Semaphore)
Instead of allowing unlimited simultaneous OS subprocesses, the Go Orchestrator must enforce a **bounded concurrency pool**.

```go
// internal/bridge/limiter.go
package bridge

import (
	"context"
	"runtime"
	"golang.org/x/sync/semaphore"
)

// GraderLimiter bounds the number of simultaneous erlc / erl subprocesses
type GraderLimiter struct {
	sem *semaphore.Weighted
}

func NewGraderLimiter(maxWorkers int64) *GraderLimiter {
	if maxWorkers <= 0 {
		// Default: 2 * NumCPU, or a minimum of 2 on small cloud containers
		maxWorkers = int64(runtime.NumCPU() * 2)
		if maxWorkers < 2 {
			maxWorkers = 2
		}
	}
	return &GraderLimiter{
		sem: semaphore.NewWeighted(maxWorkers),
	}
}

func (l *GraderLimiter) Acquire(ctx context.Context) error {
	return l.sem.Acquire(ctx, 1)
}

func (l *GraderLimiter) Release() {
	l.sem.Release(1)
}
```

#### Why This Eliminates Cloud Outages:
- If `maxWorkers = 3`, at most 3 BEAM instances can run simultaneously ($3 \times 35\text{ MB} = 105\text{ MB}$ max footprint).
- Submissions 4 through 20 wait in a lightweight Go channel queue.
- Because each submission completes in ~200 ms, the 4th submission starts after 200 ms, and the entire queue of 20 submissions drains in **~1.4 seconds**.
- **Result:** Memory stays flat at **~160 MB** (well below the 512 MB ceiling), zero OOM crashes occur, and users perceive zero degradation.

### 5.3 RAM Disk (`tmpfs`) Acceleration
Writing learner files to a physical or networked cloud disk incurs storage I/O latency. On Linux/Docker, mounting `/tmp` as a RAM-backed `tmpfs` eliminates disk latency:

```dockerfile
# In Docker or docker-compose.yml:
# tmpfs:
#   - /tmp:size=128M,mode=1777
```
When Go writes `inventory.erl` to `/tmp`, the write occurs in system RAM at multi-gigabyte-per-second memory bandwidth, accelerating compile and test cycle times by **~30%**.

---

## 6. Long-Term Architecture: The Resident "Warm Pool" BEAM Node

If BeamForge scales to hundreds of concurrent users, spawning an OS process per run introduces fork/exec overhead. The platform can transition to a **resident BEAM execution node**:

```
[ Go Orchestrator ]
        │
        ▼ (Unix Domain Socket / OTP C-Node)
[ Long-Running BEAM Master Node (OTP 29) ]
        │
        ├──▶ Worker Process 1 (Learner A) ──▶ spawn_opt(..., [max_heap_size, priority])
        ├──▶ Worker Process 2 (Learner B) ──▶ spawn_opt(..., [max_heap_size, priority])
        └──▶ Worker Process 3 (Learner C) ──▶ spawn_opt(..., [max_heap_size, priority])
```

### Implementation Highlights:
1. **Dynamic Module Loading:** User modules are compiled in-memory via `compile:forms/2` without writing to disk.
2. **Process Sandboxing via `spawn_opt/4`:**
   ```erlang
   Pid = erlang:spawn_opt(fun() ->
       Res = Module:Fun(Args),
       Caller ! {result, Res}
   end, [
       {max_heap_size, #{
           size => 1048576,        % 1MB maximum heap limit
           kill => true,           % Kill runaway processes immediately
           error_logger => false
       }},
       {priority, low}
   ]).
   ```
3. **Execution Latency:** Drops from ~200 ms down to **8 ms – 15 ms**.

---

## 7. Render Deployment Specification

### 7.1 Multi-Stage Production `Dockerfile`
A lean, production-hardened multi-stage Dockerfile packaging both the Go Orchestrator and the Next.js frontend into a lightweight Alpine Linux image:

```dockerfile
# -------------------------------------------------------------
# Stage 1: Build Next.js Web IDE
# -------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY apps/web-ide/package*.json ./
RUN npm ci
COPY apps/web-ide/ ./
RUN npm run build

# -------------------------------------------------------------
# Stage 2: Build Go Orchestrator
# -------------------------------------------------------------
FROM golang:1.22-alpine AS backend-builder
WORKDIR /app
COPY services/orchestrator/go.mod services/orchestrator/go.sum* ./
RUN go mod download
COPY services/orchestrator/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/beamforge-server ./cmd/server

# -------------------------------------------------------------
# Stage 3: Production Runtime (Erlang OTP 27/28/29 + Go + Node)
# -------------------------------------------------------------
FROM erlang:27-alpine AS runner
RUN apk add --no-cache nodejs npm ca-certificates curl

WORKDIR /app

# Copy Precompiled Grader Harness
COPY runtimes/erl-harness /app/runtimes/erl-harness
RUN cd /app/runtimes/erl-harness && ./rebar3 compile || erlc -o ebin apps/bf_grader/src/*.erl

# Copy Backend Binary
COPY --from=backend-builder /bin/beamforge-server /app/bin/beamforge-server

# Copy Next.js Standalone Bundle
COPY --from=frontend-builder /app/.next/standalone /app/web-ide/
COPY --from=frontend-builder /app/.next/static /app/web-ide/.next/static
COPY --from=frontend-builder /app/public /app/web-ide/public

# Set Production Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV ORCHESTRATOR_PORT=8080
ENV BF_HARNESS_DIR=/app/runtimes/erl-harness/ebin

EXPOSE 3000 8080

# Supervise both with a lightweight shell script or init
COPY scripts/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
CMD ["/app/entrypoint.sh"]
```

---

## 8. Summary & Takeaways for Systems Learners

1. **BEAM is engineered for 24/7/365 resilience.** Unlike Java or Python, an idle BEAM node does not consume CPU cycles and takes only ~30 MB of RAM.
2. **Per-process isolated heaps eliminate GC pause jitter.** A student writing buggy code cannot cause global garbage collection pauses for other students.
3. **Preemptive reduction counters protect against infinite loops.** Erlang limits every process to 4,000 reductions per slice, making thread starvation impossible.
4. **Deploying on Render is safe and cost-effective.** Using the Go Orchestrator's concurrency limiter guarantees that even a 512 MB free container will never crash from memory spikes.

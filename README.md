<div align="center">

<img src="apps/web-ide/src/app/icon.svg" width="96" height="96" alt="BeamForge Logo" />

# BeamForge

### Interactive In-Browser Training Platform for Erlang/OTP & BEAM Ecosystem Languages

[![Version](https://img.shields.io/badge/version-0.9.0--beta-38BDF8.svg?style=flat-square)](https://github.com/Jaefer-Kemal/beamforge)
[![Erlang/OTP](https://img.shields.io/badge/Erlang%2FOTP-27%20%7C%2028%20%7C%2029-A90533.svg?style=flat-square)](https://www.erlang.org/)
[![Go](https://img.shields.io/badge/Go%20Orchestrator-1.22+-00ADD8.svg?style=flat-square)](https://golang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2%20(App%20Router)-000000.svg?style=flat-square)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5%20Strict-3178C6.svg?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-10B981.svg?style=flat-square)](LICENSE)
[![Specs](https://img.shields.io/badge/Architecture-Specs%2001--08-8B5CF6.svg?style=flat-square)](docs/specs/)

[**Explore Curriculum**](#-curriculum-master-blueprint-5-worlds--12-chapters) &nbsp;|&nbsp;
[**Architecture Deep-Dive**](#-system-architecture--dual-engine-topology) &nbsp;|&nbsp;
[**Quickstart Guide**](#-quickstart--local-development) &nbsp;|&nbsp;
[**Roadmap & Coming Soon**](#-roadmap--future-platform-expansion) &nbsp;|&nbsp;
[**Specifications Suite**](#-formal-engineering-specifications)

</div>

---

## Purpose & Mission

For developers trained in imperative, object-oriented languages (Python, JavaScript, Java, C++, Go), learning **Erlang and the BEAM ecosystem** is one of the steepest and most disorienting paradigm shifts in computer science:

1. **A Radical Term & Syntax Model:** Prolog-rooted syntax, immutable data terms, single-assignment variables (`X = 1`, where reassignment is impossible), and pervasive pattern matching on tuples, maps, and raw bitstrings.
2. **Iteration Without Loops:** No `for`, `while`, or `until` constructs exist; all iteration demands pure recursive thinking, accumulator patterns, and strict Tail-Call Optimization (TCO).
3. **Share-Nothing Actor Concurrency:** Eliminating shared mutable memory, threads, and mutexes entirely. Processes are lightweight isolated actors with private heaps communicating purely via asynchronous message mailboxes (`Pid ! Message`).
4. **The OTP Mindset ("Let It Crash"):** Replacing defensive `try/catch` boilerplate with supervision trees, restart strategies (`one_for_one`, `rest_for_one`), and generic standard behaviours (`gen_server`, `gen_statem`, `gen_event`).

### The Problem: The BEAM "Learning Desert"
For decades, mastering Erlang and BEAM languages has been notoriously difficult. Beginners encounter either 20-year-old academic papers, terse man pages, or trivial syntax cheat sheets that abandon learners long before they understand real OTP architecture, binary wire framing, or fault tolerance. There has never been an interactive, deliberate-practice learning environment built specifically for the BEAM.

### The Mission: Hands-On BEAM Mastery
**BeamForge** exists to make the **BEAM ecosystem accessible, hands-on, and rigorous**. Rather than passively reading docs, learners write real code in the browser, verified instantaneously by native AST analyzers, bytecode disassemblers, and live OTP supervisor test harnesses.

Starting with a complete 12-chapter Erlang/OTP core and expanding to **Elixir, Gleam, and other BEAM languages**, BeamForge empowers software engineers to internalize the mental models required to build systems capable of the legendary 99.9999999% ("nine nines") uptime for which the BEAM is world-renowned.

---

## Key Capabilities & Core Innovations

### 1. Interactive Deliberate Practice Workspace
- **Boot.dev-Style Dual-Pane Layout:** Clean, uncrowded 50/50 horizontal split between concept lessons with official OTP signature cards (left) and the code editor with live test verification drawers (right).
- **Daylight & Midnight Theme Support:** Ergonomically designed high-contrast themes for daytime and late-night coding sessions.
- **Zero Trivia Quizzes:** Every lesson demands functional implementation. No multiple-choice trivia masquerading as learning.

### 2. Dual-Engine Execution Pipeline: `▷ Run` vs `▶ Submit`
- **`▷ Run` (Low-Friction Experimentation):** Instant compilation and execution against visible test cases with standard output capture (`io:format/1,2`).
- **`▶ Submit` (Comprehensive Mastery Verification):** Executes multi-stage evaluation including export audits, AST rule checks, bytecode inspection, visible tests, and hidden edge-case suites with synchronized results.

### 3. AST Inspection & Tail-Recursion Bytecode Grader
- **Syntactic Rule Enforcement (`bf_ast_verifier.erl`):** Uses Erlang's native `epp:parse_file/2` parser to detect forbidden remote calls (e.g. banning `lists:sum/1` when manual recursion is taught) and verify required language constructs (guards, binary syntax, pattern matches).
- **Opcode Disassembly (`beam_disasm`):** Disassembles compiled `.beam` files to verify that recursive self-calls use tail-call opcodes (`call_only` / `call_last`) rather than body-recursive stack allocations (`call` + `return`), guaranteeing true $O(1)$ stack frame discipline.

### 4. Unified Test Suite & Visual Erlang Term Diffing
- **Token Monospace Diffs (`<ErlangTermDiffCard />`):** Side-by-side and inline token diffs highlighting exact atom, tuple, list, or binary mismatches when a test fails.
- **Interactive Test Cards:** Displays execution duration in milliseconds, status badges, expected outputs, and a one-click **Copy Call** button for immediate shell reproduction.

### 5. Developer Experience, Autocomplete & Real-Time Linter
- **300ms Debounced BEAM Micro-Linter (`bf_linter.erl`):** OTP 29 scanning and parsing engine that analyzes active code as you type, rendering Monaco red squiggly underlines and hover diagnostics before submission.
- **Tab-Expandable Snippets & OTP IntelliSense:** Native Monaco completions for `case`, `try...catch`, `receive...after`, `-module`, `-export`, and OTP standard library signatures (`lists:`, `maps:`, `erlang:`, `gen_server:`, `ets:`).
- **Terminal-Authentic Error Navigation:** Clickable `➔ Jump to File:Line:Col` links on compilation error cards that focus and position the Monaco cursor instantly.

### 6. Milestone Capstone Studio (Chapter 12)
- Dedicated multi-file IDE environment for crafting a complete 5-node production XMPP chat server (`xmpp_sup`, `xmpp_stream_parser`, `xmpp_session_registry`, `xmpp_c2s_statem`, and `xmpp_router`).
- Features a live BEAM supervision tree visualizer, milestone stepper, and XMPP stanza packet inspector.

---

## Curriculum Master Blueprint: 5 Worlds & 12 Chapters

BeamForge encompasses **68 in-depth, hands-on lessons and capstone milestones** structured across 5 thematic engineering worlds:

| World | Thematic Focus | Chapters | Key Projects & Engineering Concepts | Lessons |
| :---: | :--- | :---: | :--- | :---: |
| **World 1** | **The Functional Core & Term Anatomy** | CH 1 – 4 | Functional foundations, pattern matching, guard sequences, accumulator loops, tail-call optimization, `inventory.erl` order processor, higher-order functions (`map`/`fold`/`filter`), binary bitstrings, and network packet headers. | 23 Lessons |
| **World 2** | **The Actor Model & "Let It Crash"** | CH 5 – 6 | BEAM process primitives (`spawn`, `!`, `receive`), actor loops, selective receive mailboxes, bank ledgers with race condition testing, links vs monitors, exit traps, and resilient queue workers. | 12 Lessons |
| **World 3** | **Production OTP Architecture** | CH 7 – 9 | `gen_server` call/cast patterns, non-blocking init with `{continue, Term}`, `gen_statem` protocol state machines (circuit breakers), `gen_event`, OTP supervision restart strategies (`one_for_one`, `one_for_all`, `rest_for_one`), child specs, off-heap ETS tables, and ETS heir failover handshakes. | 18 Lessons |
| **World 4** | **Raw TCP & Protocol Engineering** | CH 10 – 11 | Raw `gen_tcp` sockets, `{active, once}` backpressure flow control, multi-worker acceptor pools, mini-TCP KV server, RFC 7622 JID parsers with sub-binary unpinning (`binary:copy/1`), RFC 6120 XML packet framing, and RFC 6121 priority presence routing. | 10 Lessons |
| **World 5** | **The Distributed XMPP Capstone Engine** | CH 12 | **5-Module Production Capstone Studio:** Root supervision hierarchy (`rest_for_one`), high-concurrency ETS session registry with process monitors, 4-state C2S connection FSM (`gen_statem`), and stanza routing engine with offline spools. | 5 Milestones |

---

## System Architecture & Dual-Engine Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 14 Web IDE                              │
│       (Apple Glassmorphic UI / Monaco Editor / Term Diffs Drawer)      │
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

### Why BEAM + Go?
- **Go Orchestrator:** Provides high-throughput, low-memory HTTP/WebSocket concurrency (~18 MB idle RAM), managing student workspace sandboxes and protecting cloud containers from memory exhaustion.
- **BEAM VM Execution:** Provides preemptive reduction-based scheduling (4,000 reductions per time slice), per-process isolated garbage collection ($O(1)$ teardown), and comprehensive fault tolerance.
- For a deep systems comparison analyzing BEAM vs. JVM (Java), CLR (.NET), Python, and native binaries under cloud workloads, consult [docs/specs/08_BEAM_EXECUTION_AND_CLOUD_DEPLOYMENT_ARCHITECTURE.md](docs/specs/08_BEAM_EXECUTION_AND_CLOUD_DEPLOYMENT_ARCHITECTURE.md).

---

## Roadmap & Future Platform Expansion

The following platform capabilities, multi-language tracks, and pedagogical systems are planned for upcoming releases:

| Horizon | Capability / Feature | Target Language / Area | Architectural Design & Scope |
| :---: | :--- | :--- | :--- |
| **Coming Soon** | **XP Economy & Gated Progression** | Platform Gamification | Comprehensive learner progression: strict XP requirements to unlock advanced worlds, daily streak counters, achievement badges, and level advancement (`Novice` ➔ `Pattern Matcher` ➔ `OTP Architect`). |
| **Coming Soon** | **Multi-BEAM Language Track: Elixir** | Elixir / Phoenix | First-class Elixir track utilizing `elixirc`. Exercises covering Elixir syntax, pattern matching, pipeline operator (`\|>`), `GenServer`, `Supervisor`, `Task`, `Agent`, `Registry`, and Phoenix Channel wire protocols. |
| **Coming Soon** | **Multi-BEAM Language Track: Gleam** | Gleam (Type-Safe BEAM) | Hands-on Gleam track exploring statically typed functional programming on the BEAM VM, algebraic data types, type-safe actor loops, and zero-overhead BEAM interoperability. |
| **Planned** | **Multi-BEAM Language Track: LFE** | LFE (Lisp Flavoured Erlang) | Exploration of homoiconic S-expressions, meta-programming macros, and distributed systems architecture on the BEAM. |
| **Planned** | **Extensible Polyglot Runner Interface** | Backend Orchestrator | Abstracting the Go `Runner` into a pluggable `LanguageRunner` interface (`ErlangRunner`, `ElixirRunner`, `GleamRunner`) sharing the same bounded semaphore pool, `tmpfs` disk caching, and execution pipelines. |
| **Planned** | **7 Production Incident Triage Labs** | Reliability Engineering | Realistic "Fix-the-Production-Outage" scenarios with live incident banners: Slowloris TCP floods, selective receive mailbox OOM cascades, and supervision restart blizzard recovery. |
| **Planned** | **Live Distributed Node Clustering** | Distributed Systems | Interactive multi-node simulation in the browser: connecting virtual BEAM nodes (`net_adm:ping/1`), global process registries (`global`), and decentralized process groups (`pg`). |
| **Planned** | **BEAM Footprint Runtime Scorecard** | Telemetry & Profiling | Sub-millisecond telemetry cards capturing exact peak stack words, heap size, reduction counts, and sub-binary memory leaks per submission. |

---

## Quickstart & Local Development

### Prerequisites
- **Erlang/OTP:** 26, 27, 28, or 29 (`erl` and `erlc` must be on your system `PATH`).
- **Go:** 1.21 or higher (`go` command available).
- **Node.js:** 18.x or 20.x (`node` and `npm` available).

### 1. Clone the Repository
```bash
git clone https://github.com/Jaefer-Kemal/beamforge.git
cd beamforge
```

### 2. Precompile the Erlang Grader Harness
```bash
cd runtimes/erl-harness
erlc -o ebin apps/bf_grader/src/*.erl
cd ../..
```

### 3. Start the Go Orchestrator (Backend API)
```bash
cd services/orchestrator
go run ./cmd/server
# Orchestrator will listen on http://localhost:8080
```

### 4. Start the Next.js Web IDE (Frontend)
In a separate terminal window:
```bash
cd apps/web-ide
npm install
npm run dev
# Web IDE will be live at http://localhost:3000
```

Open `http://localhost:3000` in your browser. Click any chapter or lesson to begin writing and executing Erlang code immediately.

---

## Production Cloud Deployment (Render / Docker)

BeamForge is optimized for cost-effective deployment on container platforms like **Render**, **Fly.io**, or **AWS ECS**:
- **Concurrency Limiting:** The Go Orchestrator acts as a bounded semaphore pool (`runtime.NumCPU() * 2`), preventing memory spikes and eliminating Out-Of-Memory (OOM) crashes on low-resource (512 MB) instances.
- **RAM Disk (`tmpfs`):** Mounting workspaces to `/tmp` in memory accelerates file creation and compilation cycles by ~30%.
- **Complete Multi-Stage Dockerfile:** See the production Dockerfile specification in [docs/specs/08_BEAM_EXECUTION_AND_CLOUD_DEPLOYMENT_ARCHITECTURE.md#7-render-deployment-specification](docs/specs/08_BEAM_EXECUTION_AND_CLOUD_DEPLOYMENT_ARCHITECTURE.md#7-render-deployment-specification).

---

## Formal Engineering Specifications

BeamForge was designed and verified using a comprehensive RFC-style specification suite:

| Specification Document | Focus Area & Systems Scope |
| :--- | :--- |
| [**Spec 01: Architecture & AST Grader**](docs/specs/01_ARCHITECTURE_AND_AST_GRADER.md) | Dual `Run` vs `Submit` engine, AST verifier (`epp`), and `beam_disasm` TCO rules. |
| [**Spec 02: Boot.dev UI & Glassmorphism**](docs/specs/02_UI_BOOTDEV_GLASS_SPEC.md) | Apple Glass token architecture, Monaco tokenizer, and high-contrast ergonomics. |
| [**Spec 03: Curriculum Master Blueprint**](docs/specs/03_CURRICULUM_MASTER_BLUEPRINT.md) | Comprehensive 12-chapter curriculum master specification. |
| [**Spec 04: Pedagogy & Lesson Template**](docs/specs/04_PEDAGOGY_AND_LESSON_TEMPLATE.md) | Boot.dev pedagogical rules, cognitive load design, and test assertions. |
| [**Spec 05: Execution & Audit Tracker**](docs/specs/05_EXECUTION_TRACKER.md) | Verification phases, test matrices, and cross-check audit history. |
| [**Spec 06: Developer Experience & Linter**](docs/specs/06_DEV_EXPERIENCE_LINTER_AND_AUTOCOMPLETE_SPEC.md) | Native BEAM micro-linter (`bf_linter.erl`), Monaco autocomplete, and snippets. |
| [**Spec 07: Visual Pedagogy & Triage**](docs/specs/07_VISUAL_PEDAGOGY_AND_INCIDENT_TRIAGE.md) | Step-driven SVG visualizers, term diffing, and incident triage labs. |
| [**Spec 08: BEAM Execution & Cloud Blueprint**](docs/specs/08_BEAM_EXECUTION_AND_CLOUD_DEPLOYMENT_ARCHITECTURE.md) | Runtime comparative analysis (BEAM vs JVM/CLR/Python) and Render deployment guide. |

---

## License

This project is licensed under the terms of the [MIT License](LICENSE).

Copyright &copy; 2026 Jaefer Mohammed Kemal. All rights reserved.

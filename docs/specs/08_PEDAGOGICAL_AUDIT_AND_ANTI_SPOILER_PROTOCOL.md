# Specification 08: Pedagogical Audit & Anti-Spoiler Protocol

This specification establishes the mandatory pedagogical quality standards for all curriculum chapters, lectures, exercises, and problem sets across **BeamForge**. Modeled after **Boot.dev's pedagogical ergonomics**, it ensures that learners build true mental models through discovery and synthesis rather than passive copy-pasting.

---

## 1. The Core Pedagogical Invariants

1. **The "No Copy-Paste" Guarantee**:
   No line of Erlang code in the Left-Pane Concept Guide or Parallel Worked Example should be directly copy-pasteable into the Right-Pane Editor to solve any part of an exercise.
2. **Discovery Over Dictation**:
   The textbook teaches the *underlying language mechanics, VM invariants, and principles*; the learner discovers, formulates, and synthesizes the *solution*.
3. **Domain Disjunction**:
   Parallel worked examples must solve a distinctly different problem in another realistic BEAM domain (e.g., sensor telemetry, network routing, banking ledgers, rate-limiters, session caches) rather than shadowing the assignment task.

---

## 2. The 4-Pillar Lecture Audit Checklist

Every lecture must be strictly audited and certified against all four pillars:

### Pillar 1: Parallel Worked Example Domain Disjunction
- **Domain Independence**: Must use a realistic production domain distinct from the assignment.
- **Completeness & Understandability (Full Modules Welcome)**:
  - It is completely acceptable and beneficial to provide a complete, runnable Erlang module (including `-module(...)`, full `-export([...])`, API wrappers, and internal state helpers) in parallel worked examples.
  - Complete modules provide authentic reference value, showing learners how production Erlang files are structured from top to bottom.
  - **The Understandability Invariant**: Every complete module MUST be accompanied by clear pedagogical explanations or step-by-step section headers explaining *what the BEAM is doing* at each phase. Never dump raw, uncommented code blocks that create cognitive fatigue or confusion.
- **No Parallel Clones (The Anti-Transliteration Rule)**:
  - Never mirror the assignment's exact function names, argument shapes, or API arity.
  - Never mirror the assignment's internal expression structure (e.g., if the exercise requires `IsAdmin =:= true orelse (Used >= 0 andalso Used =< Limit)`, the parallel example must NOT have `Override =:= true orelse (Temp >= 0 andalso Temp =< Max)`).
  - Never mirror all assignment endpoints 1-for-1 (e.g., providing matching test hooks, crash triggers, and identical clause counts). This degrades the lesson into mechanical transliteration (find-and-replace) rather than architectural synthesis.
- **Chunked Reference Architecture for Complex Capstones**:
  - In Capstones, Mini-Capstones, and complex multi-feature Problem Sets, break large multi-component architectures into 2–3 annotated sections (e.g., *1. State Initialization & Atomic Monitoring*, *2. Idempotency Gate / Routing*, *3. Failure Recovery & State Preservation*), or ensure complete modules are deeply explained in digestible steps.
  - This equips learners with an authentic, illuminating reference when stuck—allowing them to understand how to compose the architecture without spoiling the specific assignment.
- **Demonstrate Mechanics, Not Answers**:
  Show how the syntax, operator, or pattern behaves in isolation so the learner understands the tool, but must apply it creatively.

### Pillar 2: Clean Functional Specification (`Input` / `Behavior` / `Examples`)
Every function in the `## Assignment Specification` must follow this exact 3-part layout:
- **`Input`**: Explicit parameter types and valid ranges (e.g., `Integer Bytes, Integer Seconds`).
- **`Behavior`**: Pure functional description of invariants, transformations, edge cases, and time/memory complexity ($O(1)$ zero-copy vs $O(N)$ traversal).
- **`Examples`**: Concrete call-and-return pairs showing input and expected output:
  - `list_ops:prepend_item(10, [20, 30])` returns `[10, 20, 30]`.
- **Zero Syntax Spoilers in Prompt Text**:
  - **NEVER** write Erlang expressions in backticks in the prompt bullets (e.g., strictly forbid `using the cons operator [Item | List]` or `returns (Bytes * 8) div Seconds`).

### Pillar 3: Professional `@doc` Comments in Starter Code
- Starter templates (`files[0].content` and `starterCode`) must contain only standard, clean EDoc/rebar3 style documentation:
  ```erlang
  %% @doc Return whole integer bits per second given byte count and elapsed seconds.
  calculate_bandwidth(Bytes, Seconds) ->
      ok.
  ```
- **Forbidden**: Step-by-step implementation hints or code comments inside function bodies (e.g., `%% Convert Bytes to bits and compute whole integer bits per second using div.` or `%% Use =:= to check equality`).

### Pillar 4: Concept Notes Variable Neutrality
- General syntax explanations in `conceptMarkdown` must use neutral, generic variable names (e.g., `[A, B | Tail]` instead of `[First, Second | Rest]`).

---

## 3. Workflow & Context Conservation Protocol

To avoid wasting agent context and developer time during iterative curriculum revisions:

1. **Single-Lecture Context Shielding**:
   - The agent must read, audit, and edit **only one lecture at a time** from `apps/web-ide/src/data/chapters/chXX.ts`.
   - Never load an entire multi-thousand-line chapter file into memory at once.
2. **Fast Local Verification (Per Lecture)**:
   - For every modified lecture, verify locally:
     - `npm --prefix apps/web-ide run build` (Next.js type checking & 8/8 routes)
     - `go test` / `go build` (Go orchestrator verifier)
   - Commit locally with a descriptive git message:
     `git commit -m "fix(curriculum): de-spoil ch01-l03 parallel examples, assignment specs, and starter code"`
3. **Batched Production Deployment (Per Chapter)**:
   - **Do NOT deploy to Vercel after individual lectures.**
   - Deploy to Vercel production (`npx vercel --prod --yes`) **only after all lectures of an entire chapter are completed, audited, and verified**.
   - Verify HTTP 200 via `vercel curl` on the live production domain.
4. **Execution Tracker Audit**:
   - Record each audited lecture in `docs/specs/05_EXECUTION_TRACKER.md`.


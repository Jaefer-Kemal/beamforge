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
- **Proportional Simplicity (Anti-Overengineering Rule)**:
  - Parallel worked examples must **never be overcomplicated or 'over the top'**.
  - Do not introduce bloated secondary domain models, excessive nested maps/records, or unnecessary ancillary helpers that distract from the core objective.
  - Keep the module direct, elegant, and proportionally simple: illustrate the target OTP behaviour, concurrency pattern, or VM primitive in the clearest possible way so the learner immediately absorbs the mental model without wading through extraneous code.
- **No Parallel Clones (The Anti-Transliteration Rule)**:
  - Never mirror the assignment's exact function names, argument shapes, or API arity.
  - Never mirror the assignment's internal expression structure (e.g., if the exercise requires `IsAdmin =:= true orelse (Used >= 0 andalso Used =< Limit)`, the parallel example must NOT have `Override =:= true orelse (Temp >= 0 andalso Temp =< Max)`).
  - Never mirror all assignment endpoints 1-for-1 (e.g., providing matching test hooks, crash triggers, and identical clause counts). This degrades the lesson into mechanical transliteration (find-and-replace) rather than architectural synthesis.
- **Chunked Reference Architecture for Complex Capstones**:
  - In Capstones, Mini-Capstones, and complex multi-feature Problem Sets, break large multi-component architectures into 2–3 annotated sections (e.g., *1. State Initialization & Atomic Monitoring*, *2. Idempotency Gate / Routing*, *3. Failure Recovery & State Preservation*), or ensure complete modules are deeply explained in digestible steps.
  - This equips learners with an authentic, illuminating reference when stuck—allowing them to understand how to compose the architecture without spoiling the specific assignment.
- **Example-Prose Parity Invariant**:
  - Every syntax pattern, operator precedence rule, guard structure, or OTP mechanic highlighted in explanatory prose underneath a Parallel Worked Example MUST literally appear in that example's code block. Never write commentary explaining a construct that the accompanying code failed to demonstrate.
- **Zero Table-List Redundancy**:
  - Never follow a summary comparison table immediately with a bulleted list repeating the same rows verbatim. Either let the table carry the comparison or limit follow-up notes to non-obvious VM mechanics, edge cases, and ordering pitfalls not shown in the table.
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

### Pillar 3: Strict `@doc` Contract Precision & Anti-Pre-Solved Starter Code
- Starter templates (`files[0].content` and `starterCode`) must contain clean, factually exact EDoc/rebar3 style `%% @doc` documentation above every exported function and callback:
  ```erlang
  %% @doc Return whole integer bits per second given byte count and elapsed seconds.
  calculate_bandwidth(Bytes, Seconds) ->
      ok.
  ```
- **The 10/10 Starter `@doc` Precision Standard**:
  1. **Input-vs-Computation Accuracy**: Distinguish strictly between caller-supplied configuration/limits and values computed by the function (never write *"compute limits"* when limits are inputs used to calculate a derived rate or state).
  2. **Explicit Failure vs. Error Return Boundaries**: State plainly whether bad/unrecognized inputs fail (e.g., reject invalid bounds via guard validation) or return a structured error value (e.g., return an error tuple for unknown inputs), without leaking exact Erlang syntax or literal atoms in the starter doc comment.
  3. **Plain-English Clarity Over Opaque Jargon**: Pair any OTP abstraction name with the concrete domain properties being validated or constructed so the starter file reads cleanly on its own in the editor.
- **Forbidden**: Step-by-step implementation hints or code comments inside function bodies (e.g., `%% Convert Bytes to bits and compute whole integer bits per second using div.` or `%% Use =:= to check equality`).
- **The "Anti-Pre-Solved Starter Code" Invariant (No Free Rides)**:
  - Starter templates must provide genuine, un-spoiled scaffolding (module/behaviour declarations, export lists, function heads, and neutral minimal return stubs like `ok.`, `{noreply, State}`, or `{keep_state, Data}`).
  - **Strictly Forbidden in Starter Code**:
    - Pre-solving core state transitions or event handling clauses (e.g., pre-filling `open(state_timeout, ...) -> {next_state, half_open, Data}` or pre-writing error return shapes like `{error, circuit_open}`).
    - Pre-wiring domain business logic in callback clauses that robs the learner of formulating the event handling pattern themselves.
  - Every lecture audit must explicitly audit `starterCode` and `files[0].content` to guarantee that the core pedagogical challenge has not been pre-solved.

### Pillar 4: Concept Notes Variable Neutrality
- General syntax explanations in `conceptMarkdown` must use neutral, generic variable names (e.g., `[A, B | Tail]` instead of `[First, Second | Rest]`).

### Pillar 5: Capstone Milestones Synthesis & Anti-Spoiler Rules (`ch12-m1`–`ch12-m6`)
When authoring or editing Capstone Studio milestones (where learners unify primitives already mastered in Chapters 1–11 across interconnected OTP modules):
1. **No Redundant Full PWEs on Milestones**: Do **NOT** append standalone Chapter 1–11 style Parallel Worked Examples to milestone guides unless genuinely missing foundational syntax—milestones test architectural synthesis, not primitive re-drilling. Use concise, domain-neutral **Chunked OTP Anatomy References** (3–8 line generic callback/flag shapes with distinct module names and config values) only where an OTP behaviour contract needs quick structural clarity.
2. **Zero Copy-Paste Step-by-Step Recipes**: Never turn `### Step-by-Step Assignment Task` into verbatim solution clauses, exact ETS/monitor call lines, exact supervisor flag values, or copy-pasteable binary construction expressions. Replace them with Spec 08 Pillar 2 (`Input` / `Behavior` / `Examples`) specifying exported functions and cross-module message/XML/tuple contracts.
3. **Zero Pre-Solved Milestone Starter Code or Cross-Milestone Leaks**: Starter files (`CH12_STARTER_FILES`) must strip all `%% % TODO [Milestone ...]` algorithm walkthroughs, replace them with clean Spec 08 `%% @doc` interface contracts and underscore-prefixed neutral stubs that compile with `erlc.exe -Wall -Werror` (0 warnings), and never pre-solve functions assigned in that milestone or a subsequent milestone (e.g., never pre-solving `SupFlags` in M1 or `stop/0` before M6).
4. **No ASCII Art, Escaped Newline Bugs, or Repeated Check Questions**: Never embed ASCII process/packet diagrams in milestone markdown (rely on `<BeamConceptVisualizer/>`), use clean template strings (no literal `\\n` inside double-quoted markdown strings), and ensure each milestone's `mentalModelCheck` tests a distinct architectural invariant without repeating an earlier milestone's question verbatim.

---

## 3. Workflow & Context Conservation Protocol

To avoid wasting agent context and developer time during iterative curriculum revisions:

1. **Single-Lecture Context Shielding**:
   - The agent must read, audit, and edit **only one lecture at a time** from `apps/web-ide/src/data/chapters/chXX.ts`.
   - Never load an entire multi-thousand-line chapter file into memory at once.
2. **Fast Local Verification & Mandatory Live Tri-Verification (Per Lecture)**:
   - For every modified lecture, extract and run all three code artifacts directly from `apps/web-ide/src/data/chapters/chXX.ts` in addition to Go/Next.js builds:
     1. **Parallel Worked Example**: Extract from `conceptMarkdown`, compile with `erlc.exe -Wall` (0 errors/warnings), and execute its exported functions/processes live on OTP to verify the worked example truly works without needing changes.
     2. **Starter Pack (`starterCode` & `files`)**: Assert `starterCode === files[0].content`, compile with `erlc.exe` (exit code `0`), load cleanly, and run stubs/test calls to prove the starter pack compiles cleanly and executes safely even when exercise assertions fail (on `guided_demo`, it must pass 100%; on `incident_triage`, the intentional bug compiles and fails verification cleanly).
     3. **Solution Pack (`solutionCode` & `solutionFiles`) & Full Visible/Hidden Test Audit**: Assert `solutionCode` parity with `solutionFiles`, compile with `erlc.exe -Wall` (0 errors/warnings), verify `astRules` via `bf_ast_verifier:verify_rules/3`, and execute **100% of ALL `visibleTestCases`** plus **100% of Go orchestrator `Run` & `Submit` assertions** (`go test -count=1 -v -run TestChapterNVerification ./internal/bridge` and `TEST_CHAPTER=N go test -count=1 -v -run TestDynamicVisibleTestsCurriculum ./internal/bridge`).
     4. **Immediate Remediation Rule**: If *any* parallel example fails, *any* starter pack fails compilation, or *any* visible test case fails or is not executed (e.g., count mismatch or `chXX.ts` / Go runner divergence), fix the broken module, test cases, or Go orchestrator script immediately and re-run verification before finishing the lecture.
   - Standard workspace checks per lecture:
     - `npm --prefix apps/web-ide run build` & `npx tsc --noEmit` (Next.js type checking & 8/8 routes)
     - `go build ./...` & `go test` (Go orchestrator verifier)
   - Commit locally with a descriptive git message:
     `git commit -m "fix(curriculum): de-spoil ch01-l03 parallel examples, assignment specs, and starter code"`
3. **Batched Production Deployment (Per Chapter)**:
   - **Do NOT deploy to Vercel after individual lectures.**
   - Deploy to Vercel production (`npx vercel --prod --yes`) **only after all lectures of an entire chapter are completed, audited, and verified**.
   - Verify HTTP 200 via `vercel curl` on the live production domain.
4. **Execution Tracker Audit**:
   - Record each audited lecture in `docs/specs/05_EXECUTION_TRACKER.md`.


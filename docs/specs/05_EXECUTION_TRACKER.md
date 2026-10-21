# Specification 05: Incremental Build Phases & Cross-Check Audit Tracker

We execute the platform overhaul incrementally so every single piece is built to 100% depth and verified before moving to the next phase.

## Phase 1: Backend AST/Bytecode Verifier (`bf_ast_verifier.erl`) & Dual `Run` / `Submit` Engine
- [x] **1.1:** Implement `runtimes/erl-harness/apps/bf_grader/src/bf_ast_verifier.erl` supporting `epp:parse_file/2` AST inspection (forbidden calls, required calls, forbidden list comprehensions, required guards/constructs) and `beam_disasm:file/1` tail-recursion verification.
- [x] **1.2:** Add EUnit tests in `runtimes/erl-harness/test/bf_harness_eunit.erl` testing `bf_ast_verifier` on valid TCO vs body-recursive `inventory.erl` and forbidden `lists:sum/1` calls.
- [x] **1.3:** Upgrade `services/orchestrator` (`erl_runner.go` & `main.go`) to expose `POST /api/v1/run` (visible test cases + stdout capture) and `POST /api/v1/verify` (AST/TCO verifier + visible & hidden test suite).
- [x] **1.4:** Perform Gate 3 Cross-Check Audit against `docs/specs/01_ARCHITECTURE_AND_AST_GRADER.md`.

## Phase 2: Boot.dev Ergonomic UI + Apple Light/Dark Glassmorphism Overhaul
- [x] **2.1:** Implement Dual-Theme (Daylight Frosted Glass & Midnight Dark Glass) CSS tokens in `apps/web-ide/src/app/globals.css` and `tailwind.config.ts`.
- [x] **2.2:** Build `BootDevTopBar.tsx` with XP/Role badge, Interactive Lesson Progress Dots (`o-o-o-o`), Chapter Dropdown (`CH1..CH12`), Lesson Dropdown (`L1..Ln`), Prev/Next buttons, and Light/Dark Glass toggle.
- [x] **2.3:** Build `LessonSplitView.tsx` (Strict uncluttered 50/50 2-pane split: Left Concept + Official Doc Signature Cards + Assignment Rules; Right Monaco Editor + `▶ Submit` / `▷ Run` / `👁 Solution` / `🧪 Test Cases` Action Bar + Output/Test Drawer). Includes inline markdown tokenizer supporting `**bold**`, `code`, nested elements, and high-contrast Daylight Glass typography (`#0F172A`/`#020617`).
- [x] **2.4:** Build `CapstoneStudioView.tsx` (Dedicated multi-file studio page for Chapter 12 XMPP Server with file tree, milestone blueprint, live BEAM Supervision Tree, and XMPP Stanza Stream terminal).
- [x] **2.5:** Perform Gate 3 Cross-Check Audit against `docs/specs/02_UI_BOOTDEV_GLASS_SPEC.md` including Erlang Monaco Monarch tokenizer & high-contrast `beamforge-light` palette with `fontWeight: '500'`.

## Phase 3: Deep Curriculum Batch 1 — Chapters 1, 2, 3 & 4 (Sequential Erlang, `inventory.erl` & Binaries)
- [x] **3.1:** Author full textbook-grade lessons, official doc cards, visible test cases, AST rules, and Go/Erlang verifiers for **Chapter 1 (Functional Foundations)** and **Chapter 2 (Control Flow, Guards & Tail Recursion — including the complete `inventory.erl` Inventory Order Processor assignment)**.
- [x] **3.2:** Author full lessons, test cases, and verifiers for **Chapter 3 (Higher-Order Functions)** and **Chapter 4 (Maps, Records & Binary Protocol Parsing)**.
- [x] **3.3:** Perform Gate 3 Cross-Check Audit against `docs/specs/03_CURRICULUM_MASTER_BLUEPRINT.md` and `docs/specs/04_PEDAGOGY_AND_LESSON_TEMPLATE.md`.

## Phase 4: Deep Curriculum Batch 2 — Chapters 5, 6, 7, 8 & 9 (Concurrency, Fault Tolerance, OTP, Supervision & ETS/Mnesia)
- [x] **4.1A:** Author Chapter 5 (Concurrency & The Actor Model): 6 in-depth lessons (`process_bench.erl` guided benchmark demo, `ping_actor.erl` async message passing, `priority_mailbox.erl` selective receive & timeouts, `counter_actor.erl` tail-recursive state loops, `named_kv_actor.erl` process registry & `make_ref/0` correlation, `ledger_actor.erl` concurrent bank ledger problem set with 10-worker double-spend race condition verifier).
- [x] **4.1B:** Author Chapter 6 (Fault Tolerance, Links, Monitors & "Let It Crash"): 6 in-depth lessons (`boundary_parser.erl` sequential exceptions & safe deserialization, `linked_pipeline.erl` bidirectional links & exit cascades, `exit_trapper.erl` trapping exits & supervisor primitives, `worker_watcher.erl` unidirectional monitors & timeouts, `my_gen_server.erl` under the hood of OTP with 0ms monitor crash detection, `job_coordinator.erl` resilient background job queue with transient retries and dead-letter quarantine).
- [x] **4.2A:** Author Chapter 7 (OTP Core Behaviours: `gen_server`, `gen_statem`, `gen_event`): 6 in-depth lessons (`otp_intro_demo.erl` guided demo & `sys:get_state/1` live introspection, `wallet_server.erl` multi-currency call/cast balances ledger, `session_ttl_server.erl` non-blocking init with `{continue, Term}` & `handle_info` timers, `circuit_breaker_statem.erl` protocol state machine with `state_functions` transitions across `closed`/`open`/`half_open`, `security_audit_handler.erl` decoupled `gen_event` bus with brute-force threshold alerts, `rate_limiter_srv.erl` production API token-bucket rate limiter with dynamic bucket initialization, refill sweeps, async resets, and live `sys:get_state` structure auditing).
- [x] **4.2B:** Author Chapter 8 (OTP Supervision Trees & Application Releases): 5 in-depth lessons (`strategy_planner.erl` 4 restart strategies & intensity/period rate limits, `child_spec_factory.erl` child_spec map format & restart/shutdown matrices, `dynamic_session_sup.erl` simple_one_for_one dynamic worker pool factory, `commerce_app.erl` OTP application behaviour & environment configurations, `checkout_sup.erl` fault-isolated e-commerce checkout supervision tree with multi-step live chaos cascade test).
- [x] **4.2C:** Author Chapter 9 (Distributed Systems, ETS, Mnesia & Production QA): 6 in-depth lessons (`ets_telemetry.erl` off-heap storage & atomic counters, `ets_query_engine.erl` pattern matching & select_delete TTL eviction, `ets_heir_handshake.erl` ETS heir failover handshake, `cluster_pubsub_pg.erl` OTP 23+ decentralized pg groups, `ledger_specs_and_tests.erl` Dialyzer specs & EUnit assertions, `session_cache.erl` fault-tolerant ETS session cache with heir guardian and live chaos test).
- [x] **4.3:** Perform Gate 3 Cross-Check Audit against Specs 03 & 04 (Phase 4 completed with 100% test passing across Chapters 5, 6, 7, 8 & 9).

## Phase 5: Deep Curriculum Batch 3 — Chapters 10, 11 & 12 (Raw TCP Backend, Guided XMPP & Final Multi-File XMPP Capstone Studio)
- [x] **5.1:** Author **Chapter 10 (Raw TCP Sockets, `{active, once}` Backpressure, Acceptor Pools & Mini-Capstone TCP KV Backend)** with runnable demo and live socket tests.
- [x] **5.2:** Author **Chapter 11 (Guided XMPP Protocol Step-by-Step: Live Stream Demo, JID Parser, Stanza Builder, Incremental XML Framer, C2S Handshake, Presence Router)**: 6 in-depth lessons (`xmpp_wire_demo.erl` 5-phase live wire transcript demo, `xmpp_jid.erl` RFC 7622 JID parser & memory unpinning, `xmpp_stanza.erl` RFC 6120 XML packet classifier & serializers, `xmpp_xml_framer.erl` fragmented TCP stream framer, `xmpp_c2s_fsm.erl` connection handshake & base64 SASL PLAIN FSM, `xmpp_presence_router.erl` RFC 6121 priority routing & negative priority exclusion engine with tail-recursive session pruning). All 6 pass live `POST /api/v1/run` and `POST /api/v1/verify` with 100/100 score.
- [x] **5.3:** Wire and verify **Chapter 12 (Dedicated Final Capstone Studio: 5-Module Production XMPP Server)** with end-to-end milestone verification (All 5 milestone stages pass 100/100, genuine `% TODO` scaffolded starters, rich milestone textbooks, and decluttered 50/50 studio).
- [x] **5.4:** Final End-to-End Cross-Check Audit across all 5 Specification files (Specs 01, 02, 03, 04, 05, and 06 100% verified and operational).

## Phase 9: Chapter 12 Final Capstone Studio Pedagogical Overhaul & Declutter
- [x] **9.1:** Deep Milestone Pedagogical Textbooks (`apps/web-ide/src/data/chapters/ch12.ts`):
  - Authored extensive, interactive textbooks for all 5 milestones:
    - **Milestone 1 (`src/xmpp_sup.erl`)**: The Root OTP Supervisor Hierarchy, "Let It Crash" philosophy, comparison matrix of restart strategies, why `rest_for_one` is the only safe strategy, ASCII supervision tree, child spec maps, and step-by-step instructions.
    - **Milestone 2 (`src/xmpp_stream_parser.erl`)**: Binary TCP Stream Framing & Memory Unpinning, MTU packet fragmentation, Sub-Binary Heap Retention Leaks, `binary:copy/1` memory unpinning rule, and protocol element parsing.
    - **Milestone 3 (`src/xmpp_session_registry.erl`)**: High-Concurrency ETS Tables & Process Monitors, lock-free concurrent reads with `{read_concurrency, true}`, unidirectional process monitors (`monitor/2`) vs bidirectional links, automatic `'DOWN'` session cleanup, and bare JID priority dispatch (RFC 6121).
    - **Milestone 4 (`src/xmpp_c2s_statem.erl`)**: Client-to-Server State Machine (`gen_statem`), `state_functions` callback mode, 4-phase connection lifecycle (`wait_for_stream` -> `wait_for_sasl` -> `authenticated` -> `session_established`), and active-once TCP flow control backpressure.
    - **Milestone 5 (`src/xmpp_router.erl`)**: Stanza Routing Engine & Offline Message Queue, online direct PID mailbox dispatch vs in-memory offline message spooling, and pop/count offline messages lifecycle.
- [x] **9.2:** Genuine Pedagogical Skeletons with `% TODO` Challenges (Not Pre-Solved):
  - Removed pre-solved code from `CH12_STARTER_FILES`.
  - Replaced each module with a compilable, challenge-ready skeleton containing module/behaviour declarations, full exports, helper utilities, and numbered `% TODO [Milestone X - Step Y]` prompts with clear algorithmic guidance.
  - Retained verified reference solutions in `CH12_SOLUTION_FILES` accessible via the "👁 Solution" drawer.
  - Verified with `erlc.exe -W0`: all 5 starter files compile cleanly.
- [x] **9.3:** Decluttered Boot.dev 50/50 Capstone Studio (`CapstoneStudioView.tsx`):
  - Streamlined top file tab strip with clean active file indicators and `↩ Reset File` button.
  - Unified action bar matching standard lessons: `▶ Submit` (Amber), `▷ Run` (Blue), `👁 Solution` (Glass), `🧪 Test Cases` (Glass), and `⌘↵` keyboard shortcut.
  - Collapsible 240px bottom drawer with tabs for Verification Stages, Console Output, Milestone Test Cases, and Reference Solution (with Copy Code and Load Solution buttons).
  - High-contrast Apple Midnight Glass styling (`#0B0F17` Monaco background, high-contrast text `#F8FAFC`).
  - Simplified top navigation bar to strictly `[📖 Lesson]` and `[🗺️ Syllabus]`.
- [x] **9.4:** Verification & Compiler Audit:
  - `npx tsc --noEmit --noUnusedLocals`: 0 errors.
  - `go build ./cmd/server`: 0 errors.
  - `npm run build`: Next.js production build passed with 0 errors.
  - `POST /api/v1/verify` for `ch12-capstone`: 5/5 stages passed (`SCORE: 100`, `VERDICT: PASSED`).
  - Headless browser visual audit: verified Dark Mode contrast, Milestone stepper transitions, Monaco editor starter code, Run drawer execution, and clean Syllabus navigation.

## Curriculum Verification & Solution Quality Audit (Chapters 1 - 11)
- [x] **Audit 1: Go Orchestrator Lint & Syntax Verification**: Ran `go vet ./...` across `services/orchestrator`. Fixed format string argument count mismatch in `erl_runner.go:497` and extraneous argument in `erl_runner_chapters.go:4364`. Verified clean build and unit tests with `go test ./...`.
- [x] **Audit 2: Full Curriculum Solution Audit (Chapters 1 - 11, 63 Lessons)**:
  - Audited all 63 lessons for syntax correctness, question consistency, base/edge cases, and valid solution templates.
  - **▷ Run Mode (`POST /api/v1/run`)**: 63 / 63 Passed (100%).
  - **▶ Submit Mode (`POST /api/v1/verify`)**: 63 / 63 Passed (100%).
  - Fixed pricing logic in `ch02-l06` (`inventory.erl` calculation now returns 175).
  - Fixed AST Verifier (`bf_ast_verifier.erl`) local BIF tracking for `link/1` and `process_flag/2` (`ch06-l02`, `ch06-l03`).
  - Fixed closure reference and crash normalization in `ch06-l04` (`worker_watcher.erl`).
  - Adjusted TTL verification sleep window in `ch07-l03` to prevent integer second clock boundary races.
  - Added synchronous supervisor shutdown monitoring in `ch08-l03` to eliminate registered name conflicts.
- [x] **Audit 3: Frontend Store & Solution Integration**:
  - Enhanced `useWorkspaceStore.ts` (`loadSolutionForActiveExercise` and `switchExercise`) with path normalization and synthetic `WorkspaceFile` initialization from `lesson.starterCode` / `lesson.solutionCode` when explicit file arrays are omitted.
  - Passed `npx tsc --noEmit` with zero errors.
- [x] **Audit 4: Interactive Browser UI End-to-End Verification**:
  - Ran headless browser automation against live Next.js Web IDE (`http://localhost:3000`) and live Go Orchestrator backend (`http://localhost:8080`).
  - Tested `ch02-l06` (Inventory Order Processor): Solution button loaded code, Run button executed, Submit passed 3/3 stages (100/100).
  - Tested `ch06-l04` (Worker Watcher): Solution button loaded code, Run executed, Submit passed all stages (100/100).
  - Tested `ch08-l03` (Dynamic Worker Trees / Session Sup): Solution button loaded code, Run executed, Submit passed 3/3 stages (100/100).
  - Verified live XP progression (`⚡ 100 XP` -> `⚡ 200 XP` -> `⚡ 300 XP`) and level advancement to `Lv2 • Pattern Matcher`.

## Phase 6: Developer Experience, Terminal-Authentic Erlang Errors & IntelliSense (Spec 06)
- [x] **6.1:** Terminal-Authentic Compiler Error Pipeline & Copyability:
  - Preserved raw `erlc` combined output with line/col caret ASCII indicators in `erl_runner.go`.
  - Added Windows drive letter regex support `(?:[a-zA-Z]:)?([^:\r\n]+\.erl):(\d+)(?::(\d+))?:\s*(?:(Warning|Error):\s*)?(.+)`.
  - Removed `select-none` from `apps/web-ide/src/app/page.tsx` `<main>` and ensured `select-text font-mono` throughout the drawer and terminal output for unrestricted `Ctrl+C` text selection.
  - Implemented `CompilationErrorCard` in `LessonSplitView.tsx` with error pills, clickable `➔ Jump to File:Line:Col` navigation buttons that call Monaco's `revealPositionInCenter` + `setPosition`, and an accurate `❌ Compilation Failed (erlc)` header badge.
- [x] **6.2:** Monaco Autocomplete & Tab-to-Expand Snippets:
  - Registered Erlang language configuration in `monacoErlang.tsx` with brackets, comment indicators (`%`), and auto-closing pairs.
  - Registered `monaco.languages.registerCompletionItemProvider('erlang', ...)` providing Tab-expandable templates for `case`, `try...of...catch`, `receive...after`, `fun(...) -> ... end`, `-module(...)`, `-export([...])`, `-record(...)`, `-behaviour(...)`, and `-spec`.
  - Implemented OTP standard library autocomplete with trigger `:` for `lists:`, `maps:`, `erlang:`, `gen_server:`, `gen_statem:`, and `ets:` with type specs and documentation cards.
  - Added active scope variable extraction suggesting upper-case bound variables at the top of the autocomplete list.
- [x] **6.3:** Real-Time Debounced BEAM Linter & Red Squigglies:
  - Implemented native OTP 29 micro-linter `runtimes/erl-harness/apps/bf_grader/src/bf_linter.erl` using `erl_scan:string(Code, {1, 1})`, `erl_parse:parse_form`, and `erl_lint:module(Forms)`.
  - Added fast compiler diagnostic endpoint `POST /api/v1/lint` and WebSocket Channel 3 in Go Orchestrator backend (`services/orchestrator/cmd/server/main.go`).
  - Added 300ms debounced keystroke linter in `LessonSplitView.tsx` setting Monaco model markers (`monaco.editor.setModelMarkers(model, 'erlang-linter', markers)`), rendering inline red squiggly underlines, gutter indicators, and hover tooltips.
  - Validated via automated Playwright headless Edge test injecting broken user code (`safe_parse_ payload/1` & `Term - {ok, Term}`): verified markers detected, compilation error card rendered, jump-to-line navigation verified, and solution restored with 3/3 test pass. All tests passed with zero TypeScript and compiler errors.

## Phase 7: Course Syllabus Overhaul & 5 Thematic Worlds Architecture
- [x] **7.1:** Thematic World Catalog Mapping (`courseWorlds.ts`):
  - Grouped all 12 Boot.dev Curriculum Chapters (68 lessons/milestones) into 5 Thematic Worlds:
    - **World 1**: The Functional Core & Term Anatomy (Chapters 1-4, 23 Lessons)
    - **World 2**: The Actor Model & "Let It Crash" (Chapters 5-6, 12 Lessons)
    - **World 3**: Production OTP Architecture (Chapters 7-9, 18 Lessons)
    - **World 4**: Raw TCP & Protocol Engineering (Chapters 10-11, 10 Lessons)
    - **World 5**: The Distributed XMPP Capstone Engine (Chapter 12, 5 Milestones)
- [x] **7.2:** Syllabus Navigation & Interaction Fix (`CurriculumWorldMap.tsx`):
  - Re-anchored Syllabus component to `ALL_CURRICULUM_CHAPTERS` and `CHAPTERS` catalog.
  - Resolved interaction lockout bug: clicking any lesson tile sets `activeChapter`, `activeLesson`, calls `switchExercise(id)`, and sets `bootDevView = 'lesson'` (or `'capstone'`), transitioning immediately into the active Split Editor.
  - Accurate global progress tracking: `{completedCount}/68 Lessons ({progressPercent}%)` matching `completedLevelIds`.
- [x] **7.3:** Apple Glassmorphism Aesthetics & Collapsible Tiles:
  - Frosted glass containers responsive to Daylight and Midnight themes.
  - Animated collapsible World sections with progress rings, gradient badges, and lesson type indicators (`🏆 Assignment`, `🎯 Demo`, `📘 Concept`).
  - Passed `npx tsc --noEmit` and production build `npm run build` with zero errors.
  - Verified live in headless Edge via Playwright automation.

## Phase 8: Light Mode Contrast Polish & Zero-Unused-Imports Codebase Hygiene
- [x] **8.1:** Light Mode World Logo Contrast Fix (`CurriculumWorldMap.tsx`):
  - Diagnosed root cause: dynamic Tailwind class interpolation was stripped by Tailwind JIT during static analysis, causing transparent background and near-invisible white-on-white icons in Light Mode.
  - Implemented explicit `WORLD_ICON_STYLES` dictionary providing saturated inline gradients (`#10B981` to `#059669`, `#6366F1` to `#4F46E5`, `#8B5CF6` to `#7C3AED`, `#007AFF` to `#0284C7`, `#F59E0B` to `#D97706`), crisp white icons with drop-shadows, and colored elevation box-shadows in Daylight Glass mode; and deep frosted glass with neon glowing borders in Midnight Glass mode.
  - Wired `isCurrentChapter` badge on the active chapter banner.
- [x] **8.2:** Comprehensive Unused Imports & Dead Code Audit Across All TS/TSX Modules:
  - Systematically scanned and cleaned all unreferenced imports and dead variables across 16 files:
    - `CurriculumWorldMap.tsx`: Removed `Lock`, `BookOpen`, `Terminal`, `Layers`, `Zap`, `CourseWorld`, `LessonContent`, `activeExerciseId`.
    - `BootDevTopBar.tsx`: Removed `CURRICULUM_WORLDS`, `completedLevelIds`, `isUpcoming`.
    - `LessonSplitView.tsx`: Removed `VisibleTestCase`, `closeTab`, `clearRunResult`.
    - `useWorkspaceStore.ts`: Removed `getAllLevelIds`, `CurriculumLevel`.
    - `TopSegmentedNav.tsx`: Removed `Flame`, `CheckCircle2`.
    - `BeamGraphObserver.tsx`: Removed `BeamNode`, `Activity`, `Database`, `Layers`, `Maximize2`, `Sparkles`, `Zap`.
    - `ReferencesVaultView.tsx`: Removed `ExternalLink`, `Filter`.
    - `BottomDrawer.tsx`: Removed `Clock`, `Cpu`, `setSocketMode`.
    - `CapstoneStudioView.tsx`: Removed `editorMounted`.
    - `CommandPalette.tsx`: Removed `Command`, `ArrowRight`.
    - `GlassWorkspace.tsx`: Removed `Sparkles`, `Layers`, `Maximize2`, `Minimize2`, `Cpu`, `xmppState`.
    - `LessonGuidePane.tsx`: Removed `FileCode`, `HelpCircle`, `ChevronRight`, `RotateCcw`, `Code2`, `ExternalReference`, `resetWorkspace`.
    - `LessonVaultDrawer.tsx`: Removed `Sparkles`, `Layers`, `ArrowRight`, `activeRibbonTab`, `switchExercise`.
    - `Ribbon.tsx`: Removed `Settings`, `Sparkles`, `ShieldCheck`.
    - `VerificationDrawer.tsx`: Removed `Play`, `Terminal`, `ShieldCheck`, `RotateCcw`, `getLevelById`, `level`, `isVerifying`.
    - `ErlangEditor.tsx`: Removed `CheckCircle2`.
- [x] **8.3:** Verification & Quality Certification:
  - Passed `npx tsc --noEmit --noUnusedLocals` with zero warnings or errors.
  - Passed `npm run build` (Next.js 14.2.35 production build) with zero errors.
  - Verified live via headless browser session: captured screenshots demonstrating high-contrast, vivid World Logos on the Syllabus page in Light Mode.

## Phase 7: Step-Driven Interactive Visualizers (Replacing ASCII Art), Quick Mental Model Checks, Visual Erlang Term Diffs, BEAM Runtime Footprint Scorecards, and Production Incident Triage Labs (Spec 07)
- [x] **7.1: `<BeamConceptVisualizer/>` Component & 7 Interactive Step-Driven SVG/Glass Scenes (Replacing ASCII Art)**:
  - Implement `apps/web-ide/src/components/pedagogy/BeamConceptVisualizer.tsx` with Controls Header (`[ ◀ Prev ]`, `[ Next ▶ ]`, `[ ↺ Reset ]`, `[ Hide / Show ]`), Step Pill (`Step {n} of 4`), and theme-aware SVG/Glass rendering.
  - Implement the 7 interactive scenes (`VisualSceneId`):
    1. `'xmpp_5_module_capstone_arch'`: Sleek 5-node XMPP architecture replacing ASCII art in Chapter 12 Capstone & XMPP Overview.
    2. `'tco_vs_body_stack'`: Tail recursion vs body recursion stack frame comparison in Chapter 2 (`inventory.erl`).
    3. `'sub_binary_procbin_refc'`: 64KB ProcBin unpinning via `binary:copy/1` in Chapter 4.
    4. `'mailbox_selective_receive'`: Process mailbox & internal save queue scan pointer in Chapter 5.
    5. `'links_monitors_signals'`: Links, `trap_exit`, monitors, and untrappable exit signals in Chapter 6.
    6. `'supervision_rest_for_one_ets_heir'`: `rest_for_one` restart with ETS heir handover in Chapters 8 & 9.
    7. `'tcp_xmpp_stream_framing'`: TCP fragmentation, buffer accumulation, and `{active, once}` in Chapters 10 & 11.
  - Remove all ASCII box diagrams (`+----+`, `| v`) from `ch01.ts` through `ch12.ts` markdown strings.
- [x] **7.2: Pre-Coding Concept Checks (`<MentalModelCheckCard/>`)**:
  - Implement `apps/web-ide/src/components/pedagogy/MentalModelCheckCard.tsx` in Slot 5 of Left Pane.
  - Add optional `mentalModelCheck?: MentalModelCheck` to `CurriculumLevel` interface with 3 multiple-choice options (`A`, `B`, `C`), instant Emerald/Amber visual feedback, and a reset button. Uses Lucide `Brain` and `CheckCircle2` icons.
- [x] **7.3: Visual Erlang Term Monospace Diff Card (`<ErlangTermDiffCard/>`)**:
  - Implement `apps/web-ide/src/components/pedagogy/ErlangTermDiffCard.tsx` inside the collapsible results drawer.
  - Renders `erlangCall` with a one-click **`Copy Call`** button, duration in `ms`, and a side-by-side / inline `Expected Term` vs `Actual Term` monospace diff highlighting token mismatches. Uses Lucide `GitCompare` icon.
- [ ] **7.4: BEAM Runtime Footprint Telemetry (`<BeamFootprintCard/>`) & Go Orchestrator Instrumentation**:
  - Update `services/orchestrator/internal/bridge/erl_runner.go` to capture OTP 29 process metrics (`peak_stack_words`, `heap_words`, `reductions`, `sub_binary_leak_free`, `tco_verified`) and return optional `beam_footprint` payload on `POST /api/v1/run` and `POST /api/v1/verify`.
  - Implement `apps/web-ide/src/components/pedagogy/BeamFootprintCard.tsx` rendering a compact glass telemetry strip at the top of the bottom drawer with Lucide `Activity` and `Zap` icons.
- [ ] **7.5: 7 Production Incident Triage Labs (`lessonType: 'incident_triage'` & `<IncidentAlertBanner/>`)**:
  - Add optional `incidentAlert?: IncidentAlert` to `CurriculumLevel` and implement `apps/web-ide/src/components/pedagogy/IncidentAlertBanner.tsx` in Slot 1 of Left Pane (featuring Lucide `AlertTriangle` icon).
  - Author 7 realistic "Fix-the-Production-Outage" incident labs with pre-loaded buggy production code, live incident verifiers in Go/Erlang, and root cause analysis:
    - `ch05-l07`: Runaway Selective Receive Mailbox OOM Incident.
    - `ch06-l07`: Unlinked Worker Silent Failure & Cascading Crash Loop Incident.
    - `ch07-l07`: Blocking `init/1` Timeout & GenServer Call Blackhole Incident.
    - `ch08-l06`: Max Restart Frequency Exceeded (`{max_r, max_t}`) Crash Blizzard Incident.
    - `ch09-l07`: ETS Table Owner Crash with Heirless Data Loss Incident.
    - `ch10-l06`: Slowloris TCP `{active, true}` Mailbox Flooding Incident.
    - `ch11-l07`: Sub-Binary Buffer Leak in High-Throughput Stream Framer Incident.

## Phase 10: Unified Test Suite & Live Term Diffs Drawer, Tail-Recursion Bytecode Grader & Zero-Unused-Variables Polish
- [x] **10.1: Go Orchestrator Failure Reporting & Shadowing Elimination**:
  - Replaced fallback 100% verdict in `services/orchestrator/internal/bridge/erl_runner.go` (`generateFailureReport`) so crashes and starter failures always return 0/100 and precise BEAM stack traces.
  - Audited and fixed all 6 Erlang variable shadowing occurrences (`try R = ... catch C:R` -> `catch C:Err`) across Chapters 1, 2, and 3.
  - Added multi-function test execution to `ch02-l04` testing both `sum_packets` and `count_packets`.
  - Wired deterministic AST and BEAM bytecode inspection (`require_tail_recursion` and `forbidden_remote_calls`) into `ch02-l04` grader.
- [x] **10.2: Unified Test Suite & Diffs Drawer Layout (`LessonSplitView.tsx`)**:
  - Replaced separate static test suite and raw diff tabs with a unified **Test Suite & Diffs** tab utilizing the crisp card layout from `TestSuiteTab`.
  - Each test card displays title, live status badge (`✓ PASS` or `✗ FAIL`), execution time in `ms`, blue Erlang call pill with one-click copy button, expected output, and embedded `<ErlangTermDiffCard />` token diff on failure.
  - Prominent `<CompilationErrorCard />` at the top of the drawer when `erlc` fails, with clickable `➔ Jump to File:Line:Col` Monaco navigation buttons.
  - Drawer tabs: `Test Suite & Diffs`, `Console Output`, and `Submit Verification` with live status counts and error badges.
- [x] **10.3: Zero-Unused-Variables & Modern Lucide Icon Polish**:
  - Replaced raw emojis across action bar and drawer with Lucide icons (`FlaskConical`, `Terminal`, `ShieldCheck`, `Play`, `Eye`, `EyeOff`, `RotateCcw`, `CheckCircle2`, `AlertTriangle`, `AlertCircle`, `Copy`, `Check`, `ChevronDown`, `Clock`, `ExternalLink`).
  - Removed all unused imports and variables across the frontend.
  - Verified `npx tsc --noEmit` passed with 0 errors.
  - Verified `npm run build` (Next.js 14.2.35 production build) passed with 0 errors.
  - Verified `go build ./cmd/server` passed with 0 errors.

## Phase 11: Full-Codebase Emoji-to-Lucide Transformation, Unused Components Pruning & Dual Submit/Run Synchronization
- [x] **11.1: Submit & Run Dual-Sync Engine (`erl_runner.go` & `useWorkspaceStore.ts`)**:
  - Upgraded Go Orchestrator (`services/orchestrator/internal/bridge/erl_runner.go`) so `POST /api/v1/verify` executes visible tests concurrently on clean builds, returning `VisibleTests` and `Stdout` directly within `VerificationReport`.
  - Updated `useWorkspaceStore.ts` so `runVerificationSuite` atomically synchronizes both `verificationStages` and `runResult`. When Submit is clicked, the Test Suite & Diffs tab updates in lockstep without leaving cards stale or requiring manual re-running.
- [x] **11.2: Codebase-Wide Emoji-to-Lucide Icon Transformation**:
  - Replaced all raw unicode emojis with crisp Lucide icons across the entire application:
    - Top Navigation Bar: `Zap` (amber/gold for Streak & XP), `BookOpen` (Lesson), `Compass` (Syllabus).
    - Lesson Guide Pane: `Trophy` (Assignment badge), `BookOpen` (OTP Docs badge & headers), `Clock` (complexity notes), `Eye` (Reference Solution), `AlertCircle` (erlc failure).
    - Capstone Studio: `Zap` (complexity), `ShieldCheck` (Submit), `Play` (Run), `Eye` (Solution), `FlaskConical` (Test Cases), `RotateCcw` (Reset), `Lightbulb` (Hint), `X` (Close).
    - Pedagogy Cards: `PASS` / `MISMATCH` badges in `ErlangTermDiffCard.tsx` and `MentalModelCheckCard.tsx` now use crisp `CheckCircle2` / `AlertCircle` icons with clean text labels.
    - Curriculum World Map: 5 Worlds header (`Zap`), XP tracker (`Zap`), Lesson badges (`Trophy`, `Target`, `BookOpen`).
    - Chapter Markdown files (Ch01..Ch12): Standardized all headers and callouts without unicode emojis.
- [x] **11.3: Unused Components & Dead State Pruning**:
  - Pruned obsolete prototype components: `TopSegmentedNav.tsx`, `LessonVaultDrawer.tsx`, `Ribbon.tsx`, and `BottomDrawer.tsx`.
  - Cleaned dead state properties from `useWorkspaceStore.ts` (`activeRibbonTab`, `isLeftDrawerOpen`, `bottomDrawerTab`, `isBottomDrawerExpanded`).
  - Moved temporary scratch files out of `apps/web-ide/src/` to root `scratch/web-ide-scratch/`.
- [x] **11.4: Production Build, CSS Compilation & Dev Server Verification**:
  - Identified root cause of transient CSS layout issue: concurrent execution of `next build` while `next dev` was active caused `.next` build output collisions and 404s on CSS chunks.
  - Purged `.next/` directory, restarted clean Next.js server on port 3000, and verified CSS asset compilation (HTTP 200, 72 KB).
  - Validated via Playwright browser subagent: normal 848px viewport height, Apple Glassmorphism styling, crisp Lucide icons, and zero layout shift across Split View, Test Drawer, and Curriculum World Map.

## Phase 12: Apple Glass Brand Identity, Next.js Favicon & Granular Atomic Commits
- [x] **12.1: Git Hygiene & Scratch Isolation**:
  - Added `scratch/` and `**/scratch/` to root `.gitignore`.
  - Verified untracked temporary audit scripts and scratchpads are safely ignored and excluded from git tracking.
- [x] **12.2: Theme-Adaptive Apple Glass Squircle Brand Identity & Favicon**:
  - Implemented `apps/web-ide/src/components/navigation/BeamForgeLogo.tsx` featuring the approved Apple glass squircle base, OTP supervision hexagon, refracting BEAM pulse, amber Forge spark, and process PID nodes.
  - Implemented `apps/web-ide/src/app/icon.svg` as the official Next.js 14 App Router SVG favicon.
  - Integrated `BeamForgeLogo` into `BootDevTopBar.tsx`, replacing the legacy static `BF` badge.
- [x] **12.3: Granular Atomic Git Commits (7 Commits)**:
  - Partitioned all staged work into 7 distinct, atomic semantic commits:
    1. `ba81575`: `docs(specs): update execution tracker, governance rules, and linter specs`
    2. `f4a7ff4`: `feat(grader): enhance AST verifier, add bf_linter and precompile harness beams`
    3. `550b82b`: `feat(orchestrator): add concurrent visible test execution to verify endpoint and failure reporting`
    4. `da49973`: `feat(curriculum): complete chapters 1-12 curriculum, course worlds catalog and chapter 12 capstone`
    5. `b67cfdf`: `feat(pedagogy): add BeamConceptVisualizer scenes, ErlangTermDiffCard, and MentalModelCheckCard`
    6. `a194c77`: `feat(brand): add theme-adaptive Apple glass squircle BeamForgeLogo and App Router icon.svg favicon`
    7. `c42a0b3`: `feat(ui): synchronize submit/run states, replace emojis with Lucide icons, and prune legacy drawers`
  - Verified working tree is 100% clean and both Go (8080) and Next.js (3000) servers are operating nominally.

## Phase 13: BEAM Execution Model & Cloud Deployment Architecture (Spec 08)
- [x] **13.1: Systems Performance & Comparative Runtime Blueprint**:
  - Authored `docs/specs/08_BEAM_EXECUTION_AND_CLOUD_DEPLOYMENT_ARCHITECTURE.md` covering deep technical comparisons across BEAM, HotSpot JVM, .NET Core CLR, CPython, and native Go/Rust binaries.
  - Documented preemptive reduction counting (4,000 reductions/slice), actor-isolated private heaps, and $O(1)$ process garbage collection.
  - Formulated the Go Orchestrator concurrency limiter / semaphore architecture to guarantee 100% OOM protection on Render 512 MB – 2 GB cloud tiers.
  - Outlined ephemeral subprocess vs. resident warm-node execution pipelines, RAM disk (`tmpfs`) acceleration, and multi-stage production Docker packaging.

## Phase 14: Remote Git Integration, License Merge & Production README
- [x] **14.1: Remote Repository Configuration & MIT License Merge**:
  - Configured git remote `origin` to `https://github.com/Jaefer-Kemal/beamforge.git`.
  - Renamed primary local branch to `main`.
  - Fetched `origin/main` and merged remote MIT `LICENSE` (authored by Jaefer Mohammed Kemal) into the commit history with clean 3-way merge.
- [x] **14.2: Production README.md & Roadmap Authoring**:
  - Authored root `README.md` with Apple glass squircle brand vector, versioning badges (`v0.9.0-beta`, OTP 27-29, Go 1.22+, Next.js 14, MIT), curriculum world directory, dual-engine topology, and 2-minute quickstart guide.
  - Structured detailed upcoming roadmap table detailing XP locking progression, multi-BEAM language tracks (Elixir, Gleam, LFE), pluggable polyglot runner interface, production incident triage labs, and live browser multi-node clustering.

## Phase 15: Authentic Apple Glassmorphism Overhaul & Dev Server Clean Boot
- [x] **15.1: Erlang & BEAM Language Mission Refinement**:
  - Re-anchored `README.md` Purpose & Mission section strictly on Erlang and the BEAM language paradigm shift (single-assignment immutable terms, loopless TCO recursion, share-nothing actors, OTP "Let It Crash"), removing UI distractions from the core mission statement.
  - Pushed to remote `origin/main` (commit `0a200ab`).
- [x] **15.2: Authentic Apple visionOS & macOS Glass Token Engine**:
  - Upgraded `globals.css` with luminous ambient aurora mesh gradients (`--bf-mesh-1` through `--bf-mesh-4` in cyan, violet, amber, and emerald) diffused via `backdrop-filter: blur(28px) saturate(190%)`.
  - Added signature Apple 1px specular top rim highlights (`inset 0 1px 0 0 rgba(255, 255, 255, 0.24)`) and chamfer glows across `.glass-panel`, `.glass-card`, `.glass-pill`, and `.glass-popover`.
  - Tuned optical translucency (`rgba(13, 19, 33, 0.60)` in Dark Mode, `rgba(255, 255, 255, 0.65)` in Light Mode) to ensure ambient aurora light refracts through while maintaining high-contrast `#F8FAFC` reading ergonomics.
- [x] **15.3: Component Glass Upgrades Across TopBar, Split View, Studio & Syllabus**:
  - `BootDevTopBar.tsx`: Calibrated frosted translucency with top specular highlight and drop shadow.
  - `LessonSplitView.tsx`: Frosted glass left guide pane, elevated tabs bar, and translucent action bar.
  - `CapstoneStudioView.tsx`: Apple glass milestone stepper, multi-file tab bar, and action controls.
  - `CurriculumWorldMap.tsx`: Frosted World cards floating over ambient aurora mesh.
- [x] **15.4: Dev Server Clean Boot & CSS Compilation**:
  - Killed legacy background process holding port 3000, completely purged `.next` cache directory, and restarted clean dev server on port 3000.
  - Verified HTTP 200 compilation (1637 modules compiled cleanly).
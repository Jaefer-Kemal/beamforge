---
name: beamforge-architect
description: Core architectural, UI, and pedagogical skill for building BeamForge (Boot.dev-style Glassmorphic Erlang/OTP & XMPP Training Platform). Always consult when building UI components, grading harnesses, or curriculum chapters.
---

# BeamForge Architect Skill

## Relevant Specifications
- `docs/specs/01_ARCHITECTURE_AND_AST_GRADER.md`: Erlang Grader, AST Checker, and Go Orchestrator.
- `docs/specs/02_UI_BOOTDEV_GLASS_SPEC.md`: Frontend UI, Split Pane Layout, Light/Dark Glass Tokens, Monaco Editor.
- `docs/specs/03_CURRICULUM_MASTER_BLUEPRINT.md`: Course Curriculum & Chapter Blueprints.
- `docs/specs/04_PEDAGOGY_AND_LESSON_TEMPLATE.md`: Pedagogical Architecture & Lesson Templates.
- `docs/specs/06_DX_TERMINAL_ERRORS_AND_INTELLISENSE.md`: Terminal-Authentic Erlang Errors & IntelliSense.
- `docs/specs/07_VISUAL_PEDAGOGY_AND_INCIDENT_TRIAGE.md`: Interactive Step-Diagrams, Mental Model Checks, Erlang Term Diffs, BEAM Runtime Footprint, and Incident Triage Labs.

## 1. Core Design Philosophy
1. **Boot.dev Ergonomics + Apple Glassmorphism:**
   - Standard lessons (Chapters 1–11) ALWAYS use an uncluttered **50/50 2-Pane Split Layout**:
     - **Left Pane:** Strictly adheres to the **Deterministic 6-Slot Vertical Order** (Zero Layout Conflict):
       - **Slot 1 (Top, only on `'incident_triage'` lessons):** `<IncidentAlertBanner alert={lesson.incidentAlert} />`
       - **Slot 2 (Concept Guide):** Markdown lesson description (`conceptMarkdown`).
       - **Slot 3 (Interactive Step-Diagram, collapsible):** `<BeamConceptVisualizer scene={lesson.visualScene} />` (`max-h-[260px]`, static by default, user-stepped via `◀ Prev` / `Next ▶`).
       - **Slot 4 (Official OTP Doc Cards):** `<OtpDocSignatureCard />` list.
       - **Slot 5 (Pre-Coding Concept Check, collapsible):** `<MentalModelCheckCard check={lesson.mentalModelCheck} />`.
       - **Slot 6 (Bottom):** Assignment Rules & Verification Constraints box.
     - **Right Pane:** Monaco Code Editor (top) + Boot.dev Action Strip (`▶ Submit`, `▷ Run`, `👁 Solution`, `🧪 View Test Cases`) + Collapsible Output & Test Results Drawer (bottom, hosting `<BeamFootprintCard />` and `<ErlangTermDiffCard />`).
   - **Top Navigation Bar:** Left (Logo, XP, Engineer Role, Light/Dark Glass Toggle), Center (Interactive Lesson Progress Dots `o-o-o-o-o`), Right (Chapter Dropdown `CH2: Control Flow ▾`, Lesson Dropdown `L8: Inventory Processor ▾`, Prev/Next `←` `→` buttons).
   - **Dedicated Capstone Studio (Chapter 12):** Full multi-file OTP project workspace with Architectural Blueprint guide, file-by-file function checklist, Live BEAM Supervision Tree graph, and Live XMPP Stanza Stream terminal.

2. **Visual Pedagogy & Anti-Clutter Rules:**
   - **NO ASCII BOX DIAGRAMS: Never use `+---+` or `| v` ASCII art inside markdown strings. Always use `<BeamConceptVisualizer />` SVG/React scenes.**
   - **Icons Instead of Emojis:** All UI components, badges, banners, and buttons MUST use structured Lucide SVG icons (e.g., `AlertTriangle`, `Brain`, `Zap`, `GitDiff`, `Activity`, `CheckCircle2`) and never raw OS emojis (no `🚨`, `🧠`, `⚡`).
   - **Zero Auto-Looping Motion:** Visualizers are static by default and only step when the user clicks `◀ Prev` or `Next ▶`.

3. **Incremental Mastery & 5 Lesson Archetypes:**
   - Never throw a complex system at the learner without building the pieces first.
   - Use **5 Lesson Archetypes**:
     - `concept_exercise`: Teaches 1 focused concept or function with a 10–25 line coding task.
     - `guided_demo`: Pre-written runnable code where the learner clicks `▷ Run` to observe processes, TCP sockets, or XMPP XML streams in the terminal before modifying anything.
     - `problem_set`: Deep real-world multi-function assignment (like `inventory.erl`) enforcing strict AST & Tail-Recursion rules.
     - `capstone_studio`: Multi-file system construction with live protocol and chaos verification.
     - `incident_triage`: Realistic "Fix-the-Production-Outage" lab pre-loaded with buggy production Erlang code, an `<IncidentAlertBanner />` in Slot 1, and live Go Orchestrator verifiers.

4. **Real AST & Bytecode Verification (`bf_ast_verifier.erl`):**
   - `▷ Run` runs the visible test cases + prints `io:format` stdout for fast experimentation.
   - `▶ Submit` runs visible test cases + hidden edge-case tests + AST/Bytecode rules (verifying required constructs, blocking forbidden library shortcuts like `lists:sum/1` when manual recursion is taught, and verifying true tail-call optimization via `beam_disasm`).
# BeamForge Engineering Governance & Mandatory Cross-Check Protocol

You are building **BeamForge**, an interactive Erlang/OTP, Distributed Systems, Raw TCP Backend, and XMPP Training Platform modeled after **Boot.dev's pedagogical ergonomics** and styled with a sleek **Apple Light & Dark Glassmorphic UI**.

## THE MANDATORY 3-GATE VERIFICATION LOOP (NO EXCEPTIONS)

For EVERY task or prompt you execute, you MUST follow these three gates in order:

### Gate 1: Pre-Flight Spec Inspection
Before creating or editing any code file, you MUST open and read the relevant specification file(s) in `docs/specs/`:
- Working on Erlang Grader, AST Checker, or Go Orchestrator? Read `docs/specs/01_ARCHITECTURE_AND_AST_GRADER.md`.
- Working on Frontend UI, Layout, Theme, or Capstone Studio? Read `docs/specs/02_UI_BOOTDEV_GLASS_SPEC.md`.
- Working on Curriculum Chapters, Lessons, or Problem Sets? Read `docs/specs/03_CURRICULUM_MASTER_BLUEPRINT.md`, `docs/specs/04_PEDAGOGY_AND_LESSON_TEMPLATE.md`, AND `docs/specs/08_PEDAGOGICAL_AUDIT_AND_ANTI_SPOILER_PROTOCOL.md`.
- Working on Interactive Step-Diagrams, Mental Model Checks, Incident Triage Labs, Term Diffs, or BEAM Footprint Telemetry? Read `docs/specs/07_VISUAL_PEDAGOGY_AND_INCIDENT_TRIAGE.md`.

### Gate 2: Implementation & Compiler Verification
- Never leave `// TODO`, `% TODO` (except inside learner starter templates where explicitly required), or mock stubs.
- **NO ASCII BOX DIAGRAMS: Never use `+---+` or `| v` ASCII art inside markdown strings. Always use `<BeamConceptVisualizer />` SVG/React scenes.**
- Every Erlang module must compile cleanly with `erlc.exe`.
- Every Go package must compile cleanly with `go build`.
- The Next.js frontend must pass `npx tsc --noEmit` and `npm run build` with zero errors.
- **Mandatory Curriculum Live Tri-Verification (When Auditing/Authoring Any Lecture):** Before finishing a lecture, extract and verify all three live Erlang artifacts directly from `apps/web-ide/src/data/chapters/chXX.ts`:
  1. **Parallel Worked Example (`conceptMarkdown`)**: Compiles with `erlc.exe -Wall` (0 warnings) and runs live on OTP cleanly without crashes.
  2. **Starter Pack (`starterCode` & `files[0].content`)**: Matches identically, compiles with `erlc.exe` (exit code `0`), loads, and runs starter stubs safely even when assertions fail (or fails cleanly at runtime rather than crashing on syntax errors).
  3. **Solution Pack (`solutionCode` & `solutionFiles`) + Full Test Coverage**: Matches identically, compiles with `erlc.exe -Wall` (0 warnings), passes `bf_ast_verifier` rules, executes **100% of ALL `visibleTestCases`** in `chXX.ts` (`len(runRes.VisibleTests) == len(lesson.VisibleTests)`), and passes **100% of Go `Run` & `Submit` stages** (`TestChapterNVerification` + `TestDynamicVisibleTestsCurriculum`).
  - **Remediation Mandate**: If *any* parallel example fails to compile/run, *any* starter pack fails compilation, or *any* visible/hidden test is skipped, fails, or diverges from the Go runner, fix the lesson code, visible test cases, or Go runner immediately and re-verify before finishing.

### Gate 3: Post-Flight Spec Cross-Check Audit
Before completing your response, you MUST re-open `docs/specs/05_EXECUTION_TRACKER.md` and the relevant spec file, cross-check every single requirement item by item, update `docs/specs/05_EXECUTION_TRACKER.md`, and output a **Cross-Check Verification Table** in your response proving:
1. Requirement ID / Name from the `.md` spec.
2. Status (`VERIFIED` or `FIXED`).
3. Exact File Path & Line Numbers implementing it.
4. Command output proving it works.

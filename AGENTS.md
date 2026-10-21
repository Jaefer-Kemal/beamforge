# BeamForge Engineering Governance & Mandatory Cross-Check Protocol

You are building **BeamForge**, an interactive Erlang/OTP, Distributed Systems, Raw TCP Backend, and XMPP Training Platform modeled after **Boot.dev's pedagogical ergonomics** and styled with a sleek **Apple Light & Dark Glassmorphic UI**.

## THE MANDATORY 3-GATE VERIFICATION LOOP (NO EXCEPTIONS)

For EVERY task or prompt you execute, you MUST follow these three gates in order:

### Gate 1: Pre-Flight Spec Inspection
Before creating or editing any code file, you MUST open and read the relevant specification file(s) in `docs/specs/`:
- Working on Erlang Grader, AST Checker, or Go Orchestrator? Read `docs/specs/01_ARCHITECTURE_AND_AST_GRADER.md`.
- Working on Frontend UI, Layout, Theme, or Capstone Studio? Read `docs/specs/02_UI_BOOTDEV_GLASS_SPEC.md`.
- Working on Curriculum Chapters, Lessons, or Problem Sets? Read `docs/specs/03_CURRICULUM_MASTER_BLUEPRINT.md` AND `docs/specs/04_PEDAGOGY_AND_LESSON_TEMPLATE.md`.
- Working on Interactive Step-Diagrams, Mental Model Checks, Incident Triage Labs, Term Diffs, or BEAM Footprint Telemetry? Read `docs/specs/07_VISUAL_PEDAGOGY_AND_INCIDENT_TRIAGE.md`.

### Gate 2: Implementation & Compiler Verification
- Never leave `// TODO`, `% TODO` (except inside learner starter templates where explicitly required), or mock stubs.
- **NO ASCII BOX DIAGRAMS: Never use `+---+` or `| v` ASCII art inside markdown strings. Always use `<BeamConceptVisualizer />` SVG/React scenes.**
- Every Erlang module must compile cleanly with `erlc.exe`.
- Every Go package must compile cleanly with `go build`.
- The Next.js frontend must pass `npx tsc --noEmit` and `npm run build` with zero errors.

### Gate 3: Post-Flight Spec Cross-Check Audit
Before completing your response, you MUST re-open `docs/specs/05_EXECUTION_TRACKER.md` and the relevant spec file, cross-check every single requirement item by item, update `docs/specs/05_EXECUTION_TRACKER.md`, and output a **Cross-Check Verification Table** in your response proving:
1. Requirement ID / Name from the `.md` spec.
2. Status (`VERIFIED` or `FIXED`).
3. Exact File Path & Line Numbers implementing it.
4. Command output proving it works.

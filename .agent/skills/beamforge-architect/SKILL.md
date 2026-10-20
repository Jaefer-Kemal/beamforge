---
name: beamforge-architect
description: Core architectural, UI, and pedagogical skill for building BeamForge (Boot.dev-style Glassmorphic Erlang/OTP & XMPP Training Platform). Always consult when building UI components, grading harnesses, or curriculum chapters.
---

# BeamForge Architect Skill

## 1. Core Design Philosophy
1. **Boot.dev Ergonomics + Apple Glassmorphism:**
   - Standard lessons (Chapters 1–11) ALWAYS use an uncluttered **50/50 2-Pane Split Layout**:
     - **Left Pane:** Textbook-depth Concept Guide, Embedded "How to Read Erlang Docs" Function Reference Cards, Curated Official Links (`erlang.org`, GitHub `erlang/otp`), Problem Assignment Spec, Strict Rules, and Sample Inputs/Outputs.
     - **Right Pane:** Monaco Code Editor (top) + Boot.dev Action Strip (`▶ Submit`, `▷ Run`, `👁 Solution`, `🧪 View Test Cases`) + Collapsible Output & Test Results Drawer (bottom).
   - **Top Navigation Bar:** Left (Logo, XP, Engineer Role, Light/Dark Glass Toggle), Center (Interactive Lesson Progress Dots `o-o-o-o-o`), Right (Chapter Dropdown `CH2: Control Flow ▾`, Lesson Dropdown `L8: Inventory Processor ▾`, Prev/Next `←` `→` buttons).
   - **Dedicated Capstone Studio (Chapter 12):** Full multi-file OTP project workspace with Architectural Blueprint guide, file-by-file function checklist, Live BEAM Supervision Tree graph, and Live XMPP Stanza Stream terminal.

2. **Incremental Mastery & Guided Demos:**
   - Never throw a complex system at the learner without building the pieces first.
   - Use **4 Lesson Archetypes**:
     - `concept_exercise`: Teaches 1 focused concept or function with a 10–25 line coding task.
     - `guided_demo`: Pre-written runnable code where the learner clicks `▷ Run` to observe processes, TCP sockets, or XMPP XML streams in the terminal before modifying anything.
     - `problem_set`: Deep real-world multi-function assignment (like `inventory.erl`) enforcing strict AST & Tail-Recursion rules.
     - `capstone_studio`: Multi-file system construction with live protocol and chaos verification.

3. **Real AST & Bytecode Verification (`bf_ast_verifier.erl`):**
   - `▷ Run` runs the visible test cases + prints `io:format` stdout for fast experimentation.
   - `▶ Submit` runs visible test cases + hidden edge-case tests + AST/Bytecode rules (verifying required constructs, blocking forbidden library shortcuts like `lists:sum/1` when manual recursion is taught, and verifying true tail-call optimization via `beam_disasm`).
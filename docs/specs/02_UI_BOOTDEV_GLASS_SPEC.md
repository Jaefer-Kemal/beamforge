# Specification 02: Boot.dev Ergonomics + Apple Glassmorphic UI (Light & Dark Mode)

## 1. Visual Design System: Apple iOS / macOS Frosted Glass (Dual Theme)

The UI combines **Boot.dev's zero-clutter layout** with **Apple iOS 18 / macOS Sequoia Glassmorphism** supporting instant toggling between **Daylight Frosted Glass (Default Light Mode)** and **Midnight Translucent Glass (Dark Mode)**.

### 1.1 Daylight Glass Tokens (Light Mode - Default)
- **Viewport Background:** `#EEF2F6` with subtle ambient pastel mesh radial gradients (`sky-200/45`, `indigo-100/40`, `emerald-100/35`).
- **Glass Panel Surface:** `bg-white/78 backdrop-blur-2xl border border-white/85 shadow-[0_8px_32px_rgba(15,23,42,0.06)]`.
- **Elevated Popover / Dropdown Glass:** `bg-white/90 backdrop-blur-3xl border border-slate-200/80 shadow-[0_20px_50px_rgba(15,23,42,0.12)]`.
- **Typography:** Primary `#0F172A` (Slate 900), Secondary `#475569` (Slate 600), Muted `#64748B`.
- **Accents:** Primary Action Gold/Amber (`#F59E0B` hover `#D97706` like Boot.dev's iconic Submit button) or iOS Blue (`#007AFF`), Emerald Pass (`#10B981`), Crimson Fail (`#EF4444`).

### 1.2 Midnight Glass Tokens (Dark Mode)
- **Viewport Background:** `#0B0F17` with deep aurora mesh gradients (`indigo-950/50`, `sky-950/40`).
- **Glass Panel Surface:** `bg-slate-900/72 backdrop-blur-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.45)]`.
- **Elevated Popover / Dropdown Glass:** `bg-slate-900/92 backdrop-blur-3xl border border-white/15 shadow-2xl`.
- **Typography:** Primary `#F8FAFC`, Secondary `#94A3B8`, Muted `#64748B`.

---

## 2. The Boot.dev Top Navigation & Progression Bar (`BootDevTopBar.tsx`)

Must sit at the top of the screen (`h-14 px-4`) as a sleek floating glass bar with 3 distinct zones:

1. **Left Zone (Brand & Learner Stats):**
   - **BeamForge Logo + Course Title** (`Mastering Erlang/OTP & XMPP`).
   - **Gamified Stats Pill:** XP Badge (`⚡ 1,250 XP`), Engineer Role Badge (`Level 3 • OTP Apprentice`), and Connection Status dot (`OTP 29 Live`).
   - **View Switcher Pill:** `📖 Lesson Workspace` | `🗺️ Course Syllabus` | `🏗️ Capstone Studio` (when in Ch 12).
2. **Center Zone (Interactive Lesson Progress Dots):**
   - Displays a connected horizontal row of circular nodes (`o─o─o─o─o─o`) representing every lesson in the currently selected Chapter:
     - Completed Lesson: Filled Emerald circle with subtle glow.
     - Active Lesson: Larger highlighted ring with pulse.
     - Upcoming Lesson: Muted glass circle.
     - Clicking any dot jumps directly to that lesson.
3. **Right Zone (Chapter & Lesson Dropdowns + Navigation Arrows + Theme Toggle):**
   - **Chapter Selector Dropdown (`CH2: Control Flow & Recursion ▾`):** Opens a glass popover listing all 12 Chapters (`1: Functional Foundations`, `2: Control Flow & Sequential Erlang`, ..., `12: Final XMPP Capstone`) with radio/check completion indicators.
   - **Lesson Selector Dropdown (`L7: Inventory Order Processor ▾`):** Opens a glass popover listing all lessons inside the current chapter (`1: Advanced Pattern Matching`, `2: Guards`, ..., `7: Assignment: Inventory Order Processor`).
   - **Prev (`←`) & Next (`→`) Pill Buttons:** Rounded pill buttons to step backward or forward one lesson.
   - **Light / Dark Glass Toggle Button:** Sun/Moon glass icon button switching themes smoothly.

---

## 3. Standard Lesson & Problem Set View: The 50/50 Split Workspace (`LessonSplitView.tsx`)

Used for Chapters 1 through 11. **Strictly 2 main columns** so the screen is never cluttered:

### 3.1 Left Pane (50% Width — Interactive Textbook, Doc Cards & Assignment Spec)
A clean, vertically scrollable glass card with rich typography (`Inter` + `JetBrains Mono` code blocks):
1. **Lesson Header:** Chapter & Lesson badge, Title, Difficulty tag, and Lesson Type badge (`Concept & Code`, `Guided Demo`, or `Real-World Assignment`).
2. **Deep Concept & Architecture Guide:** Thorough explanation written in clear, engaging prose with syntax-highlighted Erlang examples and diagrams.
3. **Embedded "📖 Official Erlang Docs & Under-the-Hood Reference" Cards:**
   - Displays the exact Erlang function signature/spec (e.g., `lists:foldl(Fun, Acc0, List1) -> Acc1` or `erlang:monitor(process, Item) -> MonitorRef`), parameter breakdown, time/memory complexity on the BEAM, AND direct clickable links to `[https://www.erlang.org/doc/](https://www.erlang.org/doc/)...` and `[https://github.com/erlang/otp/](https://github.com/erlang/otp/)...`.
4. **Assignment Specification & Strict Rules Card:**
   - Lists each function to implement (e.g., `1. process_order/2`, `2. calculate_order_total/2`, `3. restock/2`).
   - **Example Data & Expected Behavior** block.
   - **Strict Rules Box:** Highlights AST/Bytecode rules enforced by the checker (e.g., *"Must use tail recursion"*, *"Do not use library functions that perform the main work for you"*).

### 3.2 Right Pane (50% Width — Code Editor, Boot.dev Action Strip & Test Cases Drawer)
1. **Top Header:** File tabs (for single or multi-file lessons) + `"Reset Template"` button.
2. **Center:** Monaco Editor (automatically switching between crisp Light theme `vs` and Dark theme `vs-dark` based on the active glass theme).
3. **The Boot.dev Action Bar (Positioned cleanly below the editor):**
   - **`▶ Submit` (Primary Amber/Gold Glass Button):** Runs full grading (`POST /api/v1/verify`: Compile + AST/TCO Rules + Visible Tests + Hidden Tests).
   - **`▷ Run` (Secondary Glass Pill Button):** Runs `POST /api/v1/run` (Executes visible suggested test cases + prints `io:format` console output).
   - **`👁 Solution` (Glass Pill Button):** Opens a diff/preview or loads the annotated reference solution with an explanation of how it satisfies the BEAM/TCO rules.
   - **`🧪 Test Cases` Toggle Pill:** Switches the bottom drawer to show the exact Erlang EUnit test expressions (e.g., `inventory:process_order(Inventory, Orders)`) so the student can inspect the test inputs at any time.
4. **Bottom Collapsible Output & Verification Drawer:**
   - **Tab 1 (`Test & Rule Results`):** Shows AST Rule Checks (`✓ Tail Recursion Verified via BEAM Bytecode`, `✓ No Forbidden Library Calls`) + Individual Test Case cards (Input, Expected Term, Actual Return Term, Pass/Fail badge).
   - **Tab 2 (`Console / Erlang Shell Output`):** Shows `io:format` output or interactive demo logs (especially for `guided_demo` lessons where a pre-built TCP or XMPP script runs).
   - **Tab 3 (`Test Suite Source`):** Read-only view of the visible test cases so the learner never has to guess how their module is being called.

---

## 4. Dedicated Final Capstone Studio View (Chapter 12 — `CapstoneStudioView.tsx`)

When the learner reaches **Chapter 12 (Build a Production XMPP Server)**, the workspace expands into a dedicated **Capstone Studio Page**:
- **Left Sidebar:** Multi-file OTP Application Tree (`src/xmpp_sup.erl`, `src/xmpp_stream_parser.erl`, `src/xmpp_c2s_statem.erl`, `src/xmpp_session_ets.erl`, `src/xmpp_router.erl`) + **Milestone Blueprint Guide** explaining which module and function to implement at each step of the capstone.
- **Center Pane:** Multi-tab Monaco Editor + Capstone Milestone Verifier (`Verify Milestone 1..5`).
- **Right Inspector Pane:** Live **BEAM Supervision Tree Visualizer** + **Live XMPP Stanza Terminal** showing real TCP XML frames (`<stream:stream>`, `<auth>`, `<iq>`, `<presence>`, `<message>`) flowing through the learner's server.
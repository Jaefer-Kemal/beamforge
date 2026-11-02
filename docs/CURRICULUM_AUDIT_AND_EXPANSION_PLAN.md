# BeamForge Master Curriculum Architecture & Complete 12-Chapter Pedagogical Overhaul Plan
**Document Version:** 2.0.0 (Master Execution Roadmap)  
**Target Platform:** BeamForge Interactive Erlang/OTP, Distributed Systems, Raw TCP & XMPP Web IDE  
**Pedagogical Style:** Boot.dev Cognitive Ergonomics + Apple visionOS / Daylight Glass UI  
**Governance:** Strict 3-Gate Verification Protocol (`AGENTS.md`)  
**Scope:** Complete 12-Chapter Beginner-to-Production Erlang/OTP Mastery (88 Total Modules)

---

## 1. Executive Summary & Root-Cause Pedagogical Health Audit

### 1.1 The Current Curriculum Footprint
The BeamForge curriculum currently spans **12 Chapters**, consisting of **63 sequential lessons** and **1 multi-file Capstone Studio** (5 milestones in Chapter 12), totaling **68 learning modules**:

| World | Chapters | Domain Focus | Current Modules | Pedagogical Status |
| :--- | :--- | :--- | :--- | :--- |
| **World 1** | Chapters 1–4 | Functional Core, Guards, TCO, Lists & Binaries | 23 Lessons | **High friction**: Severe forward references (Maps/Binaries in Ch 1), missing survival syntax, and spoiler comments. |
| **World 2** | Chapters 5–6 | Concurrency, Mailbox, Actors, Links, Monitors & "Let It Crash" | 12 Lessons | **Mixed**: Chapter 6 only covered sequentially; lacks 60% of the instructor's Fault Tolerance syllabus. |
| **World 3** | Chapters 7–9 | OTP Behaviours (`gen_server`, `gen_statem`), Supervisors & ETS | 17 Lessons | **Structural anti-pattern**: Chapter 8 crams supervisor and worker into the same file via overloaded `init/1`. |
| **World 4** | Chapters 10–11 | Raw TCP Sockets, Backpressure, Framing & Guided XMPP | 11 Lessons | **Strong systems core**, but leaps past built-in socket framing (`{packet, 4}`) and RFC 6120 error stanzas. |
| **World 5** | Chapter 12 | 5-Module Production OTP XMPP Server Studio | 5 Milestones | **Mastery studio operational**, verified with multi-stage test suite. |

---

### 1.2 The Central Pedagogical Finding: The 6 Hidden Flaws
A deep structural audit of all 9,000+ lines in `combined_chapters_1_to_12.txt` reveals why beginners experience cognitive friction when progressing through the platform. While the earlier revision properly identified the gap in Chapter 6 (incorporating the instructor's Fault Tolerance notes), it proposed only superficial "B-lessons" for the rest of the course without curing the **6 structural flaws baked into Chapters 1–11**:

```
                              THE 6 HIDDEN CURRICULUM FLAWS
  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
  │ 1. Forward References   │  │ 2. Spoiler % TODOs      │  │ 3. Missing Survival     │
  │ Maps & Binaries in Ch 1 │  │ Copy-paste solutions in │  │    Syntax               │
  │ Bit syntax in Ch 2      │  │ starter code destroy    │  │ Punctuation, =< vs <=,  │
  │ Multi-clause in L1.2    │  │ active learning         │  │ =:= vs ==, Macros       │
  └─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
  │ 4. Difficulty Cliffs    │  │ 5. OTP Anti-Patterns    │  │ 6. Short 150-Word Demos │
  │ Leap from 3-line sum to │  │ Mixing Supervisor &     │  │ Dry cheat-sheets        │
  │ 3-nested two-list loops │  │ Worker in same module   │  │ lacking worked parallel │
  │ in inventory.erl        │  │ via overloaded init/1   │  │ analogies & examples    │
  └─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
```

To resolve these root causes, **BeamForge will expand its curriculum from 68 modules to an enriched 88-module syllabus** (83 sequential lessons across Chapters 1–11 + 5 Capstone Studio Milestones in Chapter 12), with every chapter reconstructed around Boot.dev cognitive ergonomics.

---

## 2. Surgical Root-Cause Analysis: The 6 Hidden Pedagogical Flaws

### Flaw 1: Severe "Forward-Reference" Bugs (Using Concepts Chapters Before Teaching Them)
When beginners start BeamForge, they are asked to read and write syntax that belongs 2 to 3 chapters ahead:

1. **Chapter 1 (`ch01-l01` & `ch01-l06`)**:
   - The learner is asked to return **Maps (`#{host => Host, port => Port}`)** and **Binaries (`<<"api.erlang.org">>`)**, and read `list_to_binary/1` and `io:format("~s ~p~n", ...)`.
   - *Problem:* Maps (`#{}`) and Binaries (`<<...>>`) are not taught until **Chapter 4 (`ch04-l01` & `ch04-l03`)**! A beginner in Lesson 1.1 has no concept of what `#{}` or `<<...>>` means.
2. **Chapter 1 (`ch01-l02`)**:
   - The starter code uses **Multi-Clause Functions** and **Guards (`when is_integer(Val) ->`)**:
     ```erlang
     classify_value(Val) when is_integer(Val) -> ...;
     classify_value(Val) when is_float(Val) -> ...;
     ```
   - *Problem:* Modules & functions are not introduced until `ch01-l06`, function head clauses until `ch02-l01`, and guards (`when`) until `ch02-l02`!
3. **Chapter 2 (`ch02-l01`)**:
   - The exercise `format_packet/1` requires bit-syntax binary concatenation:
     ```erlang
     <<"[V", VBin/binary, "] ", From/binary, " -> ", To/binary>>
     ```
   - *Problem:* Bit-Syntax (`<<.../binary>>`) is not taught until **Chapter 4 Lesson 3 (`ch04-l03`)**!
4. **Chapter 3 (`ch03-l03` — `hof_fold`)**:
   - The student is asked to call `maps:put/3`, `maps:get/3`, and instantiate maps `#{}` in Chapter 3, a full chapter before Maps are introduced in Chapter 4!

*Correction:* Every chapter must strictly restrict its starter code, solutions, and examples to concepts introduced up to that exact lesson. Chapter 1 uses only numbers, booleans, atoms, tuples, lists, and basic module exports. Chapter 2 uses tuples/lists for recursion. Chapter 3 uses tuple/list accumulators. Maps and Binaries remain strictly in Chapter 4+.

---

### Flaw 2: "Spoiler Comments" in the Starter Code Destroying Active Learning
Across Chapters 1–4 in `combined_chapters_1_to_12.txt`, the starter code literally handed the learner the exact Erlang code to copy-paste:
- In `ch01-l03`: `%% % TODO: return {call_event, Id, Caller, Callee, 0}`
- In `ch01-l04`: `%% % TODO: match [E1, E2 | _] -> {ok, E1, E2}; _ -> {error, insufficient_elements}`
- In `ch03-l04`: `%% % TODO: [Email || {user, _, Email, active} <- Users]`
- In `ch04-l03`: `%% % TODO: <<Version:4, Flags:4, Length:16/big>>`

*Pedagogical Impact:* The student learns to copy-paste from comments without engaging their working memory or understanding *why* the syntax works.  
*Correction:*
- The **Left-Pane Lesson Guide** must show a complete, parallel **Worked Example** in a different domain (e.g., explaining user accounts when the exercise is telecom billing).
- The **Starter Code Comment** must state only the *algorithmic intent* and constraints:
  ```erlang
  %% % TODO: Pattern match a list containing at least two elements.
  %% Extract the first two elements and return {ok, First, Second}.
  %% Return {error, insufficient_elements} if the list has fewer than 2 items.
  ```

---

### Flaw 3: Missing Erlang's "Week-1 Survival Syntax" (Silently Assumed)
Five critical syntax rules trip up 100% of developers learning Erlang for the first time. They were used silently without explanation:

1. **The Punctuation Triad (`,` vs `;` vs `.`):**
   - `,` (Comma) = *"AND THEN"* (separates expressions in a function body; `AND` in guards).
   - `;` (Semicolon) = *"OR ELSE"* (separates function clauses, `case` branches, `receive` clauses; `OR` in guards).
   - `.` (Period) = *"END OF DEFINITION"* (terminates complete functions and module attributes).
   - *Beginner Trap:* Putting `.` instead of `;` between function clauses throws `syntax error before: ...`.
2. **The Less-Than-Or-Equal Trap (`=<` NOT `<=`):**
   - In almost every language, less-than-or-equal is `<=`. In Erlang, `<=` is the **binary comprehension generator arrow**! Less-than-or-equal is **`=<`**. Using `<=` in a guard throws a syntax error.
3. **Exact Equality (`=:=`, `=/=`) vs Loose Numeric Equality (`==`, `/=`):**
   - Single `=` is pattern matching (assertion/binding).
   - `==` is loose numeric comparison (`1 == 1.0` is `true`).
   - `=:=` is strict term equality (`1 =:= 1.0` is `false`). In production systems, `=:=` and `=/=` are used 99% of the time to avoid type coercion bugs.
4. **Character Literals (`$Char`) & Single-Quoted Atoms (`'...'`):**
   - Lowercase atoms (`ok`, `error`) need no quotes. Uppercase or special atoms (`'EXIT'`, `'DOWN'`, `'user@domain'`) require single quotes.
   - `$a`, `$\s`, `$\n` evaluate to the integer ASCII/Unicode codepoint of the character (`$a` evaluates to `97`).
5. **Compile-Time Macros (`?MODULE`, `-define(...)`):**
   - `-define(NAME, Value)` and `?NAME`. `?MODULE` resolves to the current module atom. Used heavily across OTP and supervisors.

---

### Flaw 4: Massive Difficulty Cliffs (The Missing Stepping Stones in Chapter 2)
In Chapter 2 (`ch02.ts`), learners jumped from:
- `ch02-l04`: A 3-line tail-recursive integer accumulator `sum_packets(List, Acc)`.
- `ch02-l05`: A 4-line list filter `keep_valid_orders(Orders, Acc)`.
- Straight into **`ch02-l06` (`inventory.erl`)**: Demanding **three nested two-list recursive traversals** (`process_orders_loop/2` calling `deduct_stock/4`, `calc_total_loop/3` calling `find_product/2`, and `restock_loop/2` calling `add_stock/4`)!

*Why learners hit a wall:* The learner was never given the stepping stones:
1. **Stepping Stone 1 (Lookup)**: Writing a recursive lookup helper (`find_product(Id, List) -> {ok, Tuple} | not_found`).
2. **Stepping Stone 2 (Update-in-List)**: Writing a recursive list traversal that updates exactly one tuple while preserving order (`update_stock(Id, Qty, List, Acc)`).
3. **Stepping Stone 3 (Loop Composition)**: Composing an outer loop over `Orders` with an inner loop over `Inventory`.

---

### Flaw 5: Major OTP Anti-Pattern in Chapter 8 (`checkout_sup.erl`)
In `ch08-l03` (`dynamic_session_sup.erl`) and `ch08-l05` (`checkout_sup.erl`), both the `supervisor` callbacks AND the worker `gen_server` callbacks were crammed into the **same module** by overloading `init/1`:
```erlang
-module(checkout_sup).
-behaviour(supervisor).
...
init([]) -> {ok, {SupFlags, ChildSpecs}};
init(Role) when Role =:= db; Role =:= cache; Role =:= gateway ->
    {ok, #{role => Role}}.
```
*Why this is an anti-pattern:* In Erlang, mixing `-behaviour(supervisor)` and `gen_server` worker callbacks inside one file confuses beginners about where supervisor lifecycle ends and worker state begins. Workers and Supervisors must **always** be separate modules in the workspace file tab bar (`checkout_sup.erl` + `checkout_worker.erl`).

---

### Flaw 6: Short 150-Word Reference-Manual Explanations
In the original draft, many `conceptMarkdown` explanations were only 150–250 words. They read like dry man pages rather than conversational Boot.dev lessons.

*The New Pedagogical Anatomy (400–600 Words per Lesson):*
1. **The Mental Model & Real-World Analogy**: Grounding the concept in everyday systems thinking.
2. **Step-by-Step Syntax Walkthrough**: Explaining the syntax line-by-line and explicitly warning about beginner traps.
3. **Complete Parallel Worked Example**: A fully compilable, commented Erlang snippet in an adjacent domain.
4. **The Hands-On Exercise**: Clear problem statement, expected return types, and algorithmic constraints without giving away code.

---

## 3. The 4-Part Conversational Lesson Structure (Boot.dev Ergonomics)

Every lesson in the overhauled BeamForge curriculum adheres strictly to this 4-part pedagogical framework:

```
┌────────────────────────────────────────────────────────────────────────┐
│ PART 1: THE MENTAL MODEL & SYSTEMS ANALOGY                             │
│ Relates the BEAM concept to real-world systems architecture            │
│ (e.g. Actor mailboxes as post office dropboxes, TCO as an odometer).   │
├────────────────────────────────────────────────────────────────────────┤
│ PART 2: STEP-BY-STEP SYNTAX WALKTHROUGH                                │
│ Line-by-line syntax breakdown, calling out:                            │
│ - Erlang punctuation traps (comma vs semicolon vs period).            │
│ - Operator subtleties (=< vs <=, =:= vs ==).                           │
│ - Common compiler errors (badmatch, function_clause, unsafe_var).      │
├────────────────────────────────────────────────────────────────────────┤
│ PART 3: COMPLETE PARALLEL WORKED EXAMPLE                               │
│ Fully compilable Erlang code solving a parallel problem.                │
│ (If the exercise is an e-commerce cart, the example is a bank ledger). │
├────────────────────────────────────────────────────────────────────────┤
│ PART 4: YOUR MISSION & SPECIFICATION                                   │
│ - Clear input/output type contracts.                                   │
│ - Numbered algorithmic constraints (zero copy-paste spoilers).          │
│ - Interactive visualizer scene & mental model checks.                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Master 12-Chapter Curriculum Blueprint (Chapters 1 to 12)

Below is the complete, beginner-proof syllabus expanding BeamForge to **88 interactive modules**.

---

### Chapter 1: Getting Started, Shell Mechanics & Functional Foundations
**Pedagogical Objective:** Take a developer with zero Erlang background and make them confident with terms, immutability, pattern matching (`=`), punctuation (`,` `;` `.`), tuples, and lists—**with zero forward references to maps, binaries, or guards**.

| Lesson ID | Type | Title & Pedagogical Coverage | Module Name & Starter Fixes |
| :--- | :---: | :--- | :--- |
| **`ch01-l01`** | `guided_demo` | **Welcome to the BEAM VM & The Erlang Shell**<br>Teach BEAM actor philosophy, Erlang shell, expressions, comments `%`, and period `.` terminator. | `src/beam_intro.erl`<br>Fix: Returns clean tagged tuple `{vm_info, OtpRel, Schedulers, ProcessLimit}` instead of forward-referencing Maps/Binaries! |
| **`ch01-l02`** | `concept_exercise` | **Numbers, Booleans & Erlang's Operator Syntax**<br>Teach integer `div` and `rem`, float `/`, boolean `andalso`/`orelse`, **exact equality (`=:=`, `=/=`) vs loose equality (`==`, `/=`)**, and the **`=<` (less-than-or-equal) syntax trap**. | `src/basic_operators.erl`<br>Fix: Remove forward-referenced `when` guards! Practice pure boolean and arithmetic operators. |
| **`ch01-l03`** | `concept_exercise` | **Variables, Single Assignment & The `=` Match Operator**<br>Teach unbound vs bound variables, uppercase naming rule, the wildcard `_`, and `{badmatch, Val}` runtime error. | `src/pattern_match_basics.erl`<br>Moved from L1.5. Clean variable binding without tuples. |
| **`ch01-l04`** | `concept_exercise` | **Atoms & Tuples: Modeling Structured Domain Events**<br>Teach lowercase atoms, single-quoted atoms (`'Monday'`, `'EXIT'`), fixed-size tuples `{call_event, Id, Caller, Callee, Duration}`, and destructuring. | `src/atom_tuple_events.erl`<br>Fix: Remove spoiler `% TODO` code comments. |
| **`ch01-l05`** | `concept_exercise` | **Lists, Cons Cells `[H \| T]` & Character Strings**<br>Teach linked lists, cons operator `[Head \| Tail]`, empty list `[]`, and why `[97, 98, 99]` prints as `"abc"` (integer codepoint lists). | `src/list_fundamentals.erl`<br>Teach list construction, head/tail extraction, and strings as lists. |
| **`ch01-l06`** | `concept_exercise` | **Modules (`-module`), Exports (`-export`), Arity (`fun/N`) & Macros**<br>Teach `.erl` structure, why `connect/1`, `connect/2`, `connect/3` are distinct functions, and introduce `-define(TIMEOUT, 5000)` and `?MODULE`. | `src/module_exports.erl`<br>Fix: Pure tuple returns; zero map/binary forward references. |
| **`ch01-l07`** | `concept_exercise` | **Function Clauses & The Punctuation Triad (`,` vs `;` vs `.`)**<br>Teach multi-clause functions (`area({circle, R}) -> ...; area({rect, W, H}) -> ... .`), top-to-bottom clause dispatch, and punctuation rules. | `src/clause_punctuation.erl`<br>New dedicated punctuation lesson eliminating beginner syntax errors. |
| **`ch01-l08`** | `problem_set` | **Chapter 1 Problem Set: Telecom CDR Router & Billing Engine**<br>Synthesizes multi-clause functions, tuple/list destructuring, and billing calculations using pure sequential Erlang. | `src/telecom_foundations.erl`<br>Full problem set with zero forward references. |

---

### Chapter 2: Control Flow, Guards & Mastering Tail Recursion (The `inventory.erl` Track)
**Pedagogical Objective:** Build a rock-solid bridge from simple branching to **multi-list tail recursion**, providing the two missing stepping stones so learners conquer `inventory.erl` without friction.

| Lesson ID | Type | Title & Pedagogical Coverage | Module Name & Visual Scene |
| :--- | :---: | :--- | :--- |
| **`ch02-l01`** | `concept_exercise` | **Deep Pattern Matching in Function Heads & Simultaneous Binding**<br>Destructuring nested tuples `{packet, {header, Ver, {route, From, To}}, Payload}` and binding with `=` in head clauses. | `src/deep_matching.erl`<br>Fix: Returns `{packet_summary, ...}` tuples; zero bit-syntax binary concatenation! |
| **`ch02-l02`** | `concept_exercise` | **Guard Clauses (`when`), Guard BIFs & Compound Guards (`,` AND vs `;` OR)**<br>Permitted guard BIFs (`is_integer`, `is_tuple`), `,` (AND) vs `;` (OR), and why exceptions in guards fail silently to `false`. | `src/guard_invariants.erl`<br>Covers silent guard exception mechanics. |
| **`ch02-l03`** | `concept_exercise` | **Branching Expressions: `case...of`, `if...end` & Catch-All Clauses**<br>Matching intermediate expressions with `case`, why `if` requires `true ->` catch-all, and scoping rules inside branches. | `src/case_expressions.erl`<br>Compares `case` vs `if` in idiomatic Erlang. |
| **`ch02-l04`** | `concept_exercise` | **Thinking Recursively (Stepping Stone 1): Base Cases & Recursive Lookup**<br>**NEW STEPPING STONE:** Before accumulators, teach recursive search: `find_product(Id, List) -> {ok, Product} \| not_found`. | `src/recursive_lookup.erl`<br>Builds fundamental base-case mental model. |
| **`ch02-l05`** | `concept_exercise` | **Body Recursion vs. Tail-Call Optimization (TCO) on the BEAM Stack**<br>Show visually (`tco_vs_body_stack`) why `H + sum(T)` consumes $O(N)$ stack frames while `sum(T, Acc + H)` reuses the stack frame in $O(1)$ memory. | `src/tco_mechanics.erl`<br>Visual Scene: `'tco_vs_body_stack'`. |
| **`ch02-l06`** | `concept_exercise` | **The List Accumulator Pattern & `lists:reverse/1`**<br>Why prepending `[NewItem \| Acc]` is $O(1)$ and appending `Acc ++ [NewItem]` is $O(N)$ disaster. Reversing at the base case. | `src/accumulator_pattern.erl`<br>Single accumulator list transformations. |
| **`ch02-l07`** | `concept_exercise` | **Thinking Recursively (Stepping Stone 2): Updating an Item in a List & Multi-Accumulators**<br>**NEW STEPPING STONE FOR `inventory.erl`:** Traversing a list of `{product, Id, Name, Qty}` tuples, updating one item, and preserving order. | `src/list_updater.erl`<br>Prepares directly for `inventory.erl` stock updates. |
| **`ch02-l08`** | `problem_set` | **Chapter 2 Problem Set: Real-World Inventory Order Processor**<br>Full assignment (`process_order/2`, `calculate_order_total/2`, `restock/2`) with strict `bf_ast_verifier` TCO verification and zero `lists` shortcuts. | `src/inventory.erl`<br>Learners now conquer this with 100% confidence. |

---

### Chapter 3: Higher-Order Functions, Proplists & List Comprehensions
**Pedagogical Objective:** Transition from manual recursion to idiomatic standard library pipelines, proplists, and comprehensions—**without forward-referencing Maps**!

| Lesson ID | Type | Title & Pedagogical Coverage | Module Name & Key Exports |
| :--- | :---: | :--- | :--- |
| **`ch03-l01`** | `concept_exercise` | **First-Class Functions: Anonymous `fun` Closures & `fun Mod:Fun/Arity` Captures**<br>Lexical scope capture, passing functions as arguments, and why `fun mod:f/a` supports hot code reloading. | `src/hof_closures.erl`<br>`make_adder/1`, `math_capture/0`. |
| **`ch03-l02`** | `concept_exercise` | **Transforming, Filtering & Partitioning (`lists:map`, `filter`, `filtermap`, `partition/2`)**<br>Single-pass transformations and `lists:partition/2` splitting a stream into `{Matches, NonMatches}` in one pass. | `src/hof_transforms.erl`<br>`partition_orders/2`. |
| **`ch03-l03`** | `concept_exercise` | **Folding & State Aggregation (`lists:foldl/3` vs `lists:foldr/3`)**<br>Tail-recursive folding. **FIX:** Replace Map exercises with tuple accumulators (`{Credits, Debits, NetBalance}`) so Maps are not used before Chapter 4! | `src/hof_fold.erl`<br>Pure tuple accumulators. |
| **`ch03-l04`** | `concept_exercise` | **Keylists & Proplists (`lists:keyfind/3`, `keystore/4`, `proplists:get_value/3`)**<br>**NEW:** Managing options and keyed tuple lists (`[{port, 8080}, {active, once}]`)—foundational for supervisors and sockets! | `src/proplists_config.erl`<br>`get_config/2`, `update_setting/3`. |
| **`ch03-l05`** | `concept_exercise` | **List Comprehensions (`[Expr \|\| Generator, Filter]`)**<br>Generators `Pattern <- List`, automatic pattern filtering, guard filters, and Cartesian joins. | `src/list_comprehensions.erl`<br>Fix: Remove spoiler code comments. |
| **`ch03-l06`** | `problem_set` | **Chapter 3 Problem Set: Inventory Analytics & SLA Log Aggregator**<br>Solve inventory valuation, low-stock alerts, and SLA log aggregation using `lists:foldl/3`, `lists:filtermap/2`, and `lists:keyfind/3`. | `src/inventory_hof.erl`<br>Returns tagged summary tuples. |

---

### Chapter 4: Maps, Records, IOLists & Binary Protocol Craft
**Pedagogical Objective:** Master associative and binary data structures, bit-level protocol parsing, IOLists, and off-heap `ProcBin` memory safety.

| Lesson ID | Type | Title & Pedagogical Coverage | Module Name & Visual Scene |
| :--- | :---: | :--- | :--- |
| **`ch04-l01`** | `concept_exercise` | **Maps (`#{}`): Association (`=>`), Exact Matching (`:=`), and Bound-Variable Keys**<br>Flat Maps ($\le 32$ keys) vs HAMT Maps ($> 32$ keys), pattern matching with `:=`, and matching bound keys `#{ExpectedKey := Val}`. | `src/map_syntax.erl`<br>First introduction to Maps in the curriculum! |
| **`ch04-l02`** | `concept_exercise` | **The `maps` Standard Library & Nested Updates**<br>**NEW:** Deep dive into `maps:get/2,3`, `maps:find/2`, `maps:put/3`, `maps:merge/2`, `maps:fold/3`, and `maps:update_with/4` (crucial for rate limiters). | `src/maps_stdlib.erl`<br>`tally_frequencies/2`, `merge_defaults/2`. |
| **`ch04-l03`** | `concept_exercise` | **Records (`-record`): Compile-Time Tuple Sugar & Header Files (`.hrl`)**<br>Why `#rec{}` is a tuple at runtime, how `#rec.field` returns index `Pos` (for ETS `{keypos, Pos}`!), and `-include("records.hrl").`. | `src/record_definitions.erl`<br>Header files and record indices. |
| **`ch04-l04`** | `concept_exercise` | **Binaries, Bitstrings (`<<...>>`) & Zero-Copy IOLists**<br>Bit widths `<<Ver:4, Flags:4, Len:16/big>>`, endianness (`big`, `little`), and **IOLists** (why you don't concatenate binaries before socket transmission!). | `src/bit_syntax.erl`<br>IOLists & wire bit packing. |
| **`ch04-l05`** | `concept_exercise` | **Under the Hood: Heap Binaries vs. Off-Heap `ProcBin` & `binary:copy/1`**<br>With visualizer: reference-counted 64-byte `ProcBin`s, sub-binary memory retention leaks, and unpinning with `binary:copy/1`. | `src/procbin_memory.erl`<br>Visual Scene: `'sub_binary_procbin_refc'`. |
| **`ch04-l06`** | `problem_set` | **Chapter 4 Problem Set: Binary Network Packet & TLV Stream Parser**<br>Unpacks multi-frame binary streams into `#tlv_frame{}` records and maps while unpinning slices with `binary:copy/1`. | `src/packet_parser.erl`<br>Full protocol parsing challenge. |

---

### Chapter 5: Concurrency, The Actor Model & Stateful Processes
**Pedagogical Objective:** Build deep practical mastery of BEAM processes, mailboxes, client-server abstraction barriers, timeouts, mutual-recursion FSMs, and incident triage.

| Lesson ID | Type | Title & Pedagogical Coverage | Module Name & Visual Scene |
| :--- | :---: | :--- | :--- |
| **`ch05-l01`** | `guided_demo` | **Lightweight Processes (~2.5 KB), Preemptive Reductions & Process BIFs**<br>Spawning 10,000 actors, reductions budget (4,000/slice), `self/0`, `is_process_alive/1`, and `process_info/2`. | `src/process_bench.erl`<br>Guided demo with live BEAM telemetry. |
| **`ch05-l02`** | `concept_exercise` | **Spawning (`spawn/1` vs `spawn/3`), PIDs & Asynchronous Send (`!`)**<br>Asynchronous non-blocking message delivery, terms copied to recipient heap, and `spawn(?MODULE, fun, [Args])`. | `src/ping_actor.erl`<br>Actor ping-pong communication. |
| **`ch05-l03`** | `concept_exercise` | **Selective `receive ... after`: Mailbox Save Queue & Timeouts**<br>With visualizer: FIFO vs selective matching, Save Queue scan pointer, `after Timeout ->`, and non-blocking `after 0 ->`. | `src/priority_mailbox.erl`<br>Visual Scene: `'mailbox_selective_receive'`. |
| **`ch05-l04`** | `concept_exercise` | **The Client-Server Abstraction Barrier & Tail-Recursive State Loops**<br>Clear separation: Public Client API functions (run in caller process) vs Private Server Loop functions (run in actor process). | `src/counter_actor.erl`<br>Stateful actor loop pattern. |
| **`ch05-l05`** | `concept_exercise` | **Process Registry (`register/2`, `whereis/1`) & Request Correlation (`make_ref()`)**<br>Late reply protection with `make_ref()`, and the critical difference between sending to a dead PID (ignored) vs dead atom (crashes with `badarg`!). | `src/named_kv_actor.erl`<br>Name registration & request matching. |
| **`ch05-l06`** | `concept_exercise` | **Finite State Machine Processes via Mutual Tail Recursion**<br>**NEW (Classic Erlang):** How actors model states (`locked(Code)` $\leftrightarrow$ `open(Code)`) by mutually tail-recursive functions before OTP `gen_statem`. | `src/door_lock_actor.erl`<br>Mutual recursion state machine. |
| **`ch05-l07`** | `incident_triage` | **🚨 Incident #101: Unbounded Mailbox Memory Leak in Telemetry Actor**<br>Triage and fix an actor whose mailbox Save Queue leaks thousands of unmatched legacy heartbeat messages. | `src/incident_mailbox_leak.erl`<br>Visual Scene: `'mailbox_selective_receive'`. |
| **`ch05-l08`** | `problem_set` | **Chapter 5 Problem Set: Concurrent Bank Ledger & Order Actor**<br>Atomic deposit, withdraw, transfer, and batch transaction actor tested against a 10-worker concurrent double-spend chaos attack. | `src/ledger_actor.erl`<br>Chaos race condition verifier. |

---

### Chapter 6: Fault Tolerance, Error Handling, Links, Monitors & "Let It Crash"
**Pedagogical Objective:** Incorporate **100% of the instructor's Fault Tolerance syllabus** plus our production incident triage lab: sequential exceptions, return tuples vs exceptions, guaranteed cleanup, links, exit traps, monitors, `noproc`, `demonitor(Ref, [flush])`, and the Resilient Payment Gateway mini-project.

| Lesson ID | Type | Title & Pedagogical Coverage | Module Name & Visual Scene |
| :--- | :---: | :--- | :--- |
| **`ch06-l01`** | `concept_exercise` | **Sequential Exceptions: `throw`, `error`, `exit` & Pattern Matching `try...catch`**<br>Differentiating the 3 exception classes (`throw` for non-local flow, `error` for bugs, `exit` for termination) and pattern matching `Class:Reason:Stacktrace`. | `src/boundary_parser.erl`<br>First hands-on sequential exception lab. |
| **`ch06-l02`** | `concept_exercise` | **Return Tuples (`{ok, Val} \| {error, Reason}`) vs. Raising Exceptions**<br>Golden rule of Erlang API design: expected domain errors return tagged tuples (`safe_divide/2`, `validate_email/1`); reserve exceptions for bugs. | `src/safe_domain_ops.erl`<br>Safe division & domain validation. |
| **`ch06-l03`** | `concept_exercise` | **Guaranteed Resource Cleanup with `try ... of ... catch ... after`**<br>Closing file and port descriptors in `after` blocks. Proves `after` runs 100% of the time, even during crashes. | `src/resource_cleanup.erl`<br>File and transaction descriptor lifecycle. |
| **`ch06-l04`** | `concept_exercise` | **Bidirectional Process Links (`link/1`, `spawn_link/1`) & Exit Signals**<br>Normal exits (`exit(normal)`) ignored by linked peers; abnormal crashes propagate termination. Why `spawn_link/1` avoids race conditions. | `src/linked_pipeline.erl`<br>Bidirectional failure propagation. |
| **`ch06-l05`** | `concept_exercise` | **Trapping Exits (`process_flag(trap_exit, true)`) & Exit Signal Truth Table**<br>Converting exit signals to `{'EXIT', FromPid, Reason}` messages in mailbox. The complete truth table (and untrappable `kill`). | `src/exit_trapper.erl`<br>Building a self-healing restarter. |
| **`ch06-l06`** | `concept_exercise` | **Unidirectional Monitors (`erlang:monitor/2`), `'DOWN'` & `noproc` Invariants**<br>Asymmetric observation without fate-sharing. Monitoring dead PIDs returns immediate `{'DOWN', MRef, process, Pid, noproc}`. | `src/worker_watcher.erl`<br>Visual Scene: `'links_monitors_signals'`. |
| **`ch06-l07`** | `concept_exercise` | **Race Conditions & Mailbox Hygiene: `demonitor(Ref, [flush])`**<br>The microsecond termination race condition: why `[flush]` is mandatory to purge stale `'DOWN'` messages from the caller's mailbox. | `src/monitor_hygiene.erl`<br>Demonitoring with mailbox purge test. |
| **`ch06-l08`** | `concept_exercise` | **Architectural Decision Lab: Links vs. Monitors & `my_gen_server:call/3`**<br>When to link (fate-sharing) vs monitor (observation). How OTP's `gen:do_call/4` uses `monitor/2` to detect mid-call worker crashes in 0ms. | `src/my_gen_server.erl`<br>OTP synchronous call internals. |
| **`ch06-l09`** | `incident_triage` | **🚨 Incident #102: Hanging Client Calls When Worker Crashes Mid-Request**<br>Fix a production pricing client that hangs for 5,000ms when a worker crashes, refactoring it to use `monitor/2` for < 50ms fast-fail. | `src/incident_hanging_call.erl`<br>Visual Scene: `'links_monitors_signals'`. |
| **`ch06-l10`** | `problem_set` | **Chapter 6 Problem Set: The Resilient Payment Gateway & Watcher**<br>**The Instructor's Capstone:** Main + Payment Worker + Watcher + Idempotency Keys + `crash_test` recovery, guaranteeing no double-charges! | `src/payment_system.erl`<br>Full resilient payment architecture. |

---

### Chapter 7: Open Telecom Platform (OTP) Core Behaviours (`gen_server`, `gen_statem`, `gen_event`)
**Pedagogical Objective:** Master OTP standard behaviours, non-blocking initialization, timers, async worker replies via `gen_server:reply/2`, state machines, and event handlers.

| Lesson ID | Type | Title & Pedagogical Coverage | Module Name & Key Exports |
| :--- | :---: | :--- | :--- |
| **`ch07-l01`** | `guided_demo` | **From `my_gen_server` to OTP `gen_server` & Live `sys:get_state/1` Introspection**<br>Module callbacks (`init`, `handle_call`, `handle_cast`, `handle_info`, `terminate`), and introspecting state via `sys`. | `src/otp_intro_demo.erl`<br>Guided demo with `sys:get_state/1`. |
| **`ch07-l02`** | `concept_exercise` | **`gen_server` Essentials: `start_link`, Synchronous `call` & Async `cast`**<br>Building a multi-currency ledger with synchronous balances and asynchronous event casting. | `src/wallet_server.erl`<br>`start_link/0`, `deposit/3`, `get_balance/2`. |
| **`ch07-l03`** | `concept_exercise` | **Non-Blocking Init (`handle_continue/2`) & Periodic `handle_info/2` Timers**<br>Why slow I/O inside `init/1` freezes supervisors; deferring boot work via `{continue, Term}`, and `erlang:send_after/3` sweeps. | `src/session_ttl_server.erl`<br>Non-blocking initialization. |
| **`ch07-l04`** | `concept_exercise` | **Async Worker Offloading with `gen_server:reply/2` & Process Hibernation**<br>**NEW:** Returning `{noreply, State}`, spawning slow tasks, and calling `gen_server:reply(From, Res)`. Shrinking idle heaps with `hibernate`. | `src/async_worker_server.erl`<br>`gen_server:reply/2` offloading. |
| **`ch07-l05`** | `concept_exercise` | **`gen_statem`: Protocol & Circuit Breaker State Machines**<br>`state_functions` callback mode, `state_timeout`, transitions across `closed`, `open`, `half_open`, and action lists. | `src/circuit_breaker_statem.erl`<br>Circuit breaker state machine. |
| **`ch07-l06`** | `concept_exercise` | **`gen_event`: Dynamic Event Managers & Security Audit Pipelines**<br>Decoupled publish-subscribe event buses, adding/swapping handlers at runtime, and brute-force threshold detection. | `src/security_audit_handler.erl`<br>Dynamic event management. |
| **`ch07-l07`** | `incident_triage` | **🚨 Incident #103: Slow `gen_server:init/1` Blocking Supervisor Startup**<br>Refactor a synchronous hydrating `gen_server` to return `{continue, {hydrate, Items}}` and verify status with `sys:get_state/1`. | `src/incident_blocking_init.erl`<br>Non-blocking OTP continue. |
| **`ch07-l08`** | `problem_set` | **Chapter 7 Problem Set: API Gateway Token-Bucket Rate Limiter**<br>Production token-bucket rate limiter with dynamic bucket creation, asynchronous refill sweeps, and live structural auditing. | `src/rate_limiter_srv.erl`<br>High-throughput rate limiter. |

---

### Chapter 8: OTP Supervision Trees & Application Releases
**Pedagogical Objective:** Teach fault-isolation hierarchies, restart budgets, dynamic worker pools, and OTP applications—**eliminating the mixed supervisor/worker anti-pattern**!

| Lesson ID | Type | Title & Pedagogical Coverage | Module Name & Visual Scene |
| :--- | :---: | :--- | :--- |
| **`ch08-l01`** | `concept_exercise` | **Supervisor Flags & Restart Strategies: `one_for_one`, `rest_for_one`, and `one_for_all`**<br>Choosing strategies based on worker dependencies. Restarts visualized. | `src/strategy_planner.erl`<br>Visual Scene: `'supervision_rest_for_one_ets_heir'`. |
| **`ch08-l02`** | `concept_exercise` | **Child Specifications (`child_spec()`), Restart Types & Shutdown Semantics**<br>Child spec map format, `permanent` vs `transient` vs `temporary`, and graceful shutdown timeouts vs `brutal_kill`. | `src/child_spec_factory.erl`<br>Child spec configuration. |
| **`ch08-l03`** | `concept_exercise` | **Restart Intensity Blizzards (`intensity` / `period`) & Upward Crash Escalation**<br>**NEW:** What happens when crashes exceed `{intensity, MaxR}` in `{period, MaxT}`? Supervisor terminates all children and escalates upward! | `src/escalation_monitor.erl`<br>Crash escalation testing. |
| **`ch08-l04`** | `concept_exercise` | **Dynamic Worker Supervision (`simple_one_for_one` & `start_child/2`)**<br>**CLEAN MULTI-FILE ARCHITECTURE:** Dedicated supervisor (`dynamic_session_sup.erl`) and clean separate worker (`session_worker.erl`). Zero overloaded `init/1`! | `src/dynamic_session_sup.erl`<br>`src/session_worker.erl` |
| **`ch08-l05`** | `concept_exercise` | **OTP Applications: `.app.src`, `-behaviour(application)` & Env Config**<br>Application master process, top-level supervisor boot, and `application:get_env/3` runtime configuration. | `src/commerce_app.erl`<br>OTP application packaging. |
| **`ch08-l06`** | `incident_triage` | **🚨 Incident #104: Broken Supervision Strategy Leaving Stale Downstream Workers**<br>Fix a 3-worker pipeline misconfigured with `one_for_one` and `temporary`, refactoring it to `rest_for_one` and `permanent`. | `src/incident_wrong_strategy.erl`<br>Visual Scene: `'supervision_rest_for_one_ets_heir'`. |
| **`ch08-l07`** | `problem_set` | **Chapter 8 Problem Set: Fault-Isolated E-Commerce Checkout Supervision Tree**<br>3-tier checkout tree (`db_conn`, `cache_stage`, `http_stage`) with clean separate worker modules and live 3-stage chaos cascade testing. | `src/checkout_sup.erl`<br>`src/checkout_worker.erl` |

---

### Chapter 9: Distributed Systems, ETS, Mnesia & Quality Assurance
**Pedagogical Objective:** Separate ETS, Distributed Erlang clustering, Mnesia ACID transactions, and EUnit/Dialyzer into clean, well-paced lessons.

| Lesson ID | Type | Title & Pedagogical Coverage | Module Name & Key Functions |
| :--- | :---: | :--- | :--- |
| **`ch09-l01`** | `concept_exercise` | **ETS Fundamentals: Table Types (`set`, `ordered_set`, `bag`), `keypos` & Atomic Counters**<br>Off-heap tables, lock-free concurrent reads (`read_concurrency`), and atomic `ets:update_counter/4`. | `src/ets_telemetry.erl`<br>`create_telemetry_table/0`, `record_metric/3`. |
| **`ch09-l02`** | `concept_exercise` | **ETS Pattern Matching (`match_object/2`), Match Specs (`select/2`) & `protected` Reads**<br>Match specifications `[{{'$1', '$2', '$3'}, [Guards], [Format]}]`, and atomic `select_delete/2` TTL sweeps. | `src/ets_query_engine.erl`<br>ETS query optimization. |
| **`ch09-l03`** | `concept_exercise` | **Surviving Crashes: The ETS Heir Handshake & `ets:give_away/3`**<br>Why tables die with their owner; configuring `{heir, HeirPid, HeirData}`, capturing `{'ETS-TRANSFER', ...}`, and giving ownership back. | `src/ets_heir_handshake.erl`<br>Zero-data-loss table failover. |
| **`ch09-l04`** | `concept_exercise` | **Distributed Erlang Core: Node Names, Magic Cookies, `net_adm:ping/1` & `rpc:call/4`**<br>**NEW:** Connecting BEAM nodes across networks, node cookies, global registration, and `pg` decentralized process groups. | `src/distributed_core.erl`<br>Clustering and RPC calls. |
| **`ch09-l05`** | `concept_exercise` | **Mnesia Distributed DBMS: Disc Tables, Dirty Operations & ACID Transactions**<br>**DEDICATED MNESIA LESSON:** Creating schema, `disc_copies`, dirty reads vs `mnesia:transaction(Fun)` with automatic rollbacks. | `src/mnesia_ledger.erl`<br>ACID transactional database. |
| **`ch09-l06`** | `concept_exercise` | **Production QA: EUnit Test Fixtures (`setup`), Assertions & Dialyzer Specs**<br>Writing unit test fixtures with automatic teardown, `?assertEqual` macros, and `-spec` type specifications. | `src/ledger_specs_and_tests.erl`<br>Type checking and EUnit. |
| **`ch09-l07`** | `incident_triage` | **🚨 Incident #105: ETS Session Wipeout When Cache Worker Crashes**<br>Fix an un-heired ETS cache table, adding `{heir, HeirPid, keep_alive}` and implementing `ets:give_away/3` to preserve sessions across worker deaths. | `src/incident_ets_wipeout.erl`<br>Visual Scene: `'supervision_rest_for_one_ets_heir'`. |
| **`ch09-l08`** | `problem_set` | **Chapter 9 Problem Set: High-Concurrency ETS Session Cache with Heir Guardian**<br>High-concurrency session cache backed by an isolated heir guardian actor with live kill-crash restitution verification. | `src/session_ets_store.erl`<br>Complete session store. |

---

### Chapter 10: Backend Engineering: Raw TCP Sockets, Framing, Backpressure & Acceptor Pools
**Pedagogical Objective:** Teach network socket programming from the ground up—starting with built-in C-level packet framing before custom byte-stream accumulation.

| Lesson ID | Type | Title & Pedagogical Coverage | Module Name & Visual Scene |
| :--- | :---: | :--- | :--- |
| **`ch10-l01`** | `guided_demo` | **Inside `gen_tcp:listen/2`, `accept/1`, `connect/3` & Live Socket Telemetry**<br>Passive vs active sockets, listening on ports, accepting client connections, and raw binary transmissions. | `src/tcp_live_demo.erl`<br>Guided demo with real TCP packets. |
| **`ch10-l02`** | `concept_exercise` | **Socket Options (`nodelay`, `reuseaddr`), Built-In Framing (`{packet, 4 \| line}`) & Disconnects**<br>**NEW:** Erlang's built-in C-level packet length framing (`{packet, 4}` for length-prefixed, `{packet, line}`) and clean `{tcp_closed, Socket}` handling! | `src/socket_options.erl`<br>Built-in framing & disconnect signals. |
| **`ch10-l03`** | `concept_exercise` | **TCP Flow Control: `{active, false}` vs `{active, true}` vs `{active, once}` Backpressure**<br>Why `{active, true}` causes mailbox OOM floods under burst traffic; enforcing backpressure with `{active, once}` after every chunk. | `src/tcp_flow_worker.erl`<br>Flow control verification. |
| **`ch10-l04`** | `concept_exercise` | **Custom Stream Framing: Reconstructing Fragmented & Coalesced Raw TCP Streams**<br>Why custom protocols require stateful binary accumulation: handling partial packets and coalesced lines with `binary:copy/1`. | `src/tcp_frame_buffer.erl`<br>Visual Scene: `'tcp_xmpp_stream_framing'`. |
| **`ch10-l05`** | `concept_exercise` | **Building a Ranch-Style Concurrent Acceptor Pool & `controlling_process/2` Handoff**<br>Spawning $N$ concurrent acceptor workers on a single listen socket, handing socket ownership to connection actors via `gen_tcp:controlling_process/2`. | `src/tcp_acceptor_pool.erl`<br>High-concurrency acceptor pool. |
| **`ch10-l06`** | `incident_triage` | **🚨 Incident #106: TCP Server OOM Mailbox Flood & Dropped Partial Lines**<br>Fix a socket server misconfigured with `{active, true}`, switching to `{active, once}` and unpinning partial stream buffers with `binary:copy/1`. | `src/incident_tcp_active_true.erl`<br>Visual Scene: `'tcp_xmpp_stream_framing'`. |
| **`ch10-l07`** | `problem_set` | **Chapter 10 Mini-Capstone: High-Throughput TCP Key-Value Backend Server**<br>Full TCP KV backend supporting `SET`, `GET`, `DEL`, and `COUNT` commands over live sockets with concurrent connections. | `src/tcp_kv_backend.erl`<br>Complete network server capstone. |

---

### Chapter 11: XMPP Protocol Architecture (Guided & Step-by-Step)
**Pedagogical Objective:** Teach RFC 6120, RFC 6121, and RFC 7622 step by step, including XMPP error stanzas, incremental XML framing, and pre-auth security guards.

| Lesson ID | Type | Title & Pedagogical Coverage | Module Name & Visual Scene |
| :--- | :---: | :--- | :--- |
| **`ch11-l01`** | `guided_demo` | **Observing a Complete Live XMPP Session Wire Transcript**<br>5-phase wire protocol: `<stream:stream>` header, TLS negotiation, SASL authentication, resource binding, and stanza exchanges. | `src/xmpp_wire_demo.erl`<br>Live wire transcript demo. |
| **`ch11-l02`** | `concept_exercise` | **XMPP Addressing (RFC 7622): Parsing, Validating & Normalizing JIDs**<br>Bare JIDs (`user@domain`) vs Full JIDs (`user@domain/resource`), validating UTF-8 length boundaries, and memory unpinning. | `src/xmpp_jid.erl`<br>RFC 7622 JID parser. |
| **`ch11-l03`** | `concept_exercise` | **XMPP Stanza Anatomy (RFC 6120): `<iq>`, `<presence>`, `<message>` & `<error>` Stanzas**<br>Parsing and constructing core stanzas. **EXPANDED:** Constructing RFC 6120 stanza errors (`<error type="auth"><not-authorized/></error>`). | `src/xmpp_stanza.erl`<br>Stanza classifiers & error serializers. |
| **`ch11-l04`** | `concept_exercise` | **Incremental XML Stream Framing Over Fragmented TCP Chunks**<br>Parsing open-ended `<stream:stream>` headers without closing tags, extracting balanced top-level stanzas, and buffering partial tags. | `src/xmpp_xml_framer.erl`<br>Visual Scene: `'tcp_xmpp_stream_framing'`. |
| **`ch11-l05`** | `concept_exercise` | **The C2S Connection Handshake State Machine (`gen_statem`)**<br>4-phase lifecycle: `wait_for_stream` $\rightarrow$ `wait_for_sasl` $\rightarrow$ `authenticated` $\rightarrow$ `session_established` with Base64 PLAIN SASL. | `src/xmpp_c2s_fsm.erl`<br>Connection state machine. |
| **`ch11-l06`** | `incident_triage` | **🚨 Incident #107: XMPP Pre-Auth Stanza Injection & XML Escape Vulnerability**<br>Triage and patch a C2S state machine that routes chat messages before authentication, and fix XML entity sanitization (`&`, `<`, `>`). | `src/incident_xmpp_auth_bypass.erl`<br>Visual Scene: `'tcp_xmpp_stream_framing'`. |
| **`ch11-l07`** | `problem_set` | **Chapter 11 Problem Set: Multi-Device Presence Priority & Routing Engine**<br>RFC 6121 presence priority routing: positive priority preference, tie-breaking by connection recency, and negative priority exclusion. | `src/xmpp_presence_router.erl`<br>Presence router problem set. |

---

### Chapter 12: Final Capstone Studio (5-Module Production OTP XMPP Server)
**Pedagogical Objective:** Unify the entire curriculum into a dedicated multi-file Capstone Studio where learners assemble a fully operational, production-grade XMPP chat server.

| Milestone ID | Module File | Architectural Role & Verified Specifications |
| :--- | :--- | :--- |
| **Milestone 1** | `src/xmpp_sup.erl` | **Root `rest_for_one` Supervisor**: Supervises session registry first, stream parser second, router third, and C2S acceptor pool fourth. |
| **Milestone 2** | `src/xmpp_stream_parser.erl` | **Binary XML Stream Parser**: Incremental stream framing with `binary:copy/1` memory unpinning for zero sub-binary leaks. |
| **Milestone 3** | `src/xmpp_session_registry.erl` | **Concurrent ETS Session Table**: Multi-session storage, unidirectional process monitors (`monitor/2`), and automatic `'DOWN'` session cleanup. |
| **Milestone 4** | `src/xmpp_c2s_statem.erl` | **C2S Protocol State Machine (`gen_statem`)**: 4-phase connection lifecycle, SASL authentication, and `{active, once}` flow control. |
| **Milestone 5** | `src/xmpp_router.erl` | **Stanza Routing & Offline Queue**: Online direct PID dispatch vs offline message spooling with priority-based presence dispatch. |
| **Chaos Suite** | `chaos_cascade_test` | **Automated Chaos Verification**: Kills `xmpp_router` with `exit(kill)`; asserts supervisor restarts downstream workers with zero session loss. |

---

## 5. Master Module Count Summary: Before vs. After Overhaul

| Chapter | Domain Title | Current Count | Master Plan Count | Net Change & Key Pedagogical Breakthrough |
| :---: | :--- | :---: | :---: | :--- |
| **1** | Getting Started & Functional Foundations | 7 | **8** | +1 (Added dedicated Punctuation Triad lesson; stripped all forward-referenced Maps/Binaries/Guards). |
| **2** | Control Flow, Guards & Tail Recursion | 6 | **8** | +2 (Added 2 recursive stepping stones: `find_product` lookup & `update_stock` list modification before `inventory.erl`). |
| **3** | Higher-Order Functions & Proplists | 5 | **6** | +1 (Added Proplists/Keylists lesson; removed forward-referenced Maps; pure tuple accumulators). |
| **4** | Advanced Data Structures & Binary Craft | 5 | **6** | +1 (Added `maps` standard library deep dive & zero-copy IOLists; ProcBin unpinning). |
| **5** | Concurrency, Actors & Mailbox Hygiene | 6 | **8** | +2 (Added Mutual Tail-Recursion FSMs + Live Incident #101 Mailbox Leak lab). |
| **6** | Fault Tolerance, Links & "Let It Crash" | 6 | **10** | **+4** (Full instructor syllabus: `safe_divide`, file cleanup in `after`, `noproc`, `[flush]`, Incident #102 & Payment Gateway). |
| **7** | OTP Behaviours (`gen_server`, etc.) | 6 | **8** | +2 (Added `gen_server:reply/2` async worker offloading + Live Incident #103 Blocking Init lab). |
| **8** | OTP Supervision Trees & Releases | 5 | **7** | +2 (Clean multi-file architecture separating supervisor & worker; added Crash Escalation + Incident #104). |
| **9** | Distributed Erlang, ETS, Mnesia & QA | 6 | **8** | +2 (Dedicated Mnesia ACID database lesson; Distributed node clustering; Live Incident #105). |
| **10** | Raw TCP Sockets & Acceptor Pools | 5 | **7** | +2 (Added Socket Options `{packet, 4 \| line}` & Disconnects + Live Incident #106 Slowloris lab). |
| **11** | Guided XMPP Protocol Architecture | 6 | **7** | +1 (Added RFC 6120 Stanza Errors + Live Incident #107 Pre-Auth Security lab). |
| **12** | Final Capstone Studio (XMPP Server) | 1 (5 ms) | **1 (5 ms)** | +0 (5-Module interconnected Capstone Studio with automated chaos verification). |
| **TOTAL** | **Full BeamForge Curriculum** | **68 Modules** | **88 Modules** | **+20 Net Modules (100% Comprehensive Coverage)** |

---

## 6. Phased Implementation Roadmap (5 Focused Batches)

To prevent AI output token compression, ensure **400–600 word deep conversational explanations**, eliminate all spoiler comments, and verify clean OTP 29 compilation at every step, implementation will proceed in **5 isolated execution batches**:

```
                         THE 5-BATCH EXECUTION ROADMAP
  ┌───────────────────────┐    ┌───────────────────────┐    ┌───────────────────────┐
  │ BATCH 1: CH 1 & 2     │───▶│ BATCH 2: CH 3 & 4     │───▶│ BATCH 3: CH 5 & 6     │
  │ Functional Core &     │    │ HOFs, Proplists, Maps │    │ Actors & Full         │
  │ Recursion Stepping    │    │ Stdlib & IOLists      │    │ Instructor Fault Tol. │
  │ Stones (16 Lessons)   │    │ (12 Lessons)          │    │ (18 Lessons)          │
  └───────────────────────┘    └───────────────────────┘    └───────────────────────┘
                                                                       │
                               ┌───────────────────────┐               │
                               │ BATCH 5: CH 10,11,12  │               ▼
                               │ Raw TCP, Guided XMPP  │◀───┌───────────────────────┐
                               │ & Capstone Polish     │    │ BATCH 4: CH 7, 8 & 9  │
                               │ (15 Lessons + Studio) │    │ OTP Core, Multi-File  │
                               └───────────────────────┘    │ Sup & Mnesia (23 Less)│
                                                            └───────────────────────┘
```

### Batch 1: Chapters 1 & 2 Overhaul (The Functional Foundation & Recursion Bridges)
1. **Chapter 1 Overhaul (`ch01.ts`)**:
   - Re-anchor `ch01-l01` (`beam_intro.erl`) to return clean `{vm_info, ...}` tuples with zero maps/binaries.
   - Refactor `ch01-l02` (`basic_operators.erl`) to cover `=<`, `=:=`, and arithmetic without forward-referenced guards.
   - Author dedicated `ch01-l07` on the Punctuation Triad (`,` vs `;` vs `.`).
   - Remove all copy-paste spoiler comments across starter files.
2. **Chapter 2 Overhaul (`ch02.ts`)**:
   - Fix `format_packet/1` in `ch02-l01` to return tuples instead of bit-syntax binary strings.
   - Author **Stepping Stone 1 (`ch02-l04`)**: Recursive lookup helper (`find_product/2`).
   - Author **Stepping Stone 2 (`ch02-l07`)**: Recursive update-in-list helper (`update_stock/4`).
   - Update Go verifiers in `erl_runner_chapters.go` to test the new stepping stones.
   - Verify `inventory.erl` (`ch02-l08`) passes 100% with strict bytecode TCO checks.

### Batch 2: Chapters 3 & 4 Overhaul (HOFs, Proplists, Maps Stdlib & Binary Protocols)
1. **Chapter 3 Overhaul (`ch03.ts`)**:
   - Remove forward-referenced Maps from `ch03-l03` (`hof_fold`); replace with pure tuple accumulators.
   - Author **`ch03-l04`**: Keylists & Proplists (`lists:keyfind/3`, `proplists:get_value/3`).
   - Remove spoiler `% TODO` code comments from comprehensions and fold exercises.
2. **Chapter 4 Overhaul (`ch04.ts`)**:
   - Author **`ch04-l02`**: The `maps` standard library (`maps:get/2,3`, `merge/2`, `update_with/4`).
   - Author **`ch04-l04`**: Zero-Copy IOLists and bit-syntax signedness/endianness specifiers.
   - Wire Go Orchestrator verifiers for proplist queries and nested map updates.

### Batch 3: Chapters 5 & 6 Full Instructor Overhaul (Actors & Fault Tolerance)
1. **Chapter 5 Overhaul (`ch05.ts`)**:
   - Author **`ch05-l06`**: Mutual Tail-Recursion FSMs (`door_lock_actor.erl`).
   - Reinforce Client-Server abstraction barrier and dead-PID vs dead-atom messaging rules.
   - Verify existing **Incident #101** (`incident_mailbox_leak.erl`) integrates smoothly.
2. **Chapter 6 Overhaul (`ch06.ts`)**:
   - Implement **all 10 lessons** from the instructor's syllabus:
     - `L6.1`: `throw` vs `error` vs `exit` differentiation.
     - `L6.2`: `safe_divide/2`, `validate_email/1`, `{error, Reason}` idioms.
     - `L6.3`: File handle resource cleanup in `try...after`.
     - `L6.4`: Normal vs abnormal exit signal propagation.
     - `L6.5`: Exit Signal Truth Table and untrappable `kill`.
     - `L6.6`: Monitors with immediate `noproc` on dead PIDs.
     - `L6.7`: `demonitor(Ref, [flush])` mailbox race prevention.
     - `L6.8`: Links vs Monitors architectural decision lab.
     - `L6.9`: Existing **Incident #102** (`incident_hanging_call.erl`).
     - `L6.10`: The Resilient Payment Gateway & Watcher mini-project (`payment_system.erl`).

### Batch 4: Chapters 7, 8 & 9 Overhaul (OTP Core, Multi-File Supervisors & Mnesia)
1. **Chapter 7 Overhaul (`ch07.ts`)**:
   - Author **`ch07-l04`**: Async worker offloading with `gen_server:reply/2` & process hibernation.
   - Verify existing **Incident #103** (`incident_blocking_init.erl`).
2. **Chapter 8 Overhaul (`ch08.ts`)**:
   - **Eliminate Anti-Pattern**: Split `checkout_sup.erl` into clean multi-file workspace (`checkout_sup.erl` + `checkout_worker.erl`).
   - Author **`ch08-l03`**: Restart intensity blizzards & upward crash escalation.
   - Verify existing **Incident #104** (`incident_wrong_strategy.erl`).
3. **Chapter 9 Overhaul (`ch09.ts`)**:
   - Author **`ch09-l04`**: Distributed Erlang nodes, magic cookies, RPC, and `pg`.
   - Author **`ch09-l05`**: Dedicated Mnesia ACID database transactions and dirty reads.
   - Verify existing **Incident #105** (`incident_ets_wipeout.erl`).

### Batch 5: Chapters 10, 11 & 12 Polish (Raw TCP, Guided XMPP & Capstone Studio)
1. **Chapter 10 Polish (`ch10.ts`)**:
   - Author **`ch10-l02`**: Built-in C-level framing (`{packet, 4 | line}`) and clean socket disconnects.
   - Verify existing **Incident #106** (`incident_tcp_active_true.erl`).
2. **Chapter 11 Polish (`ch11.ts`)**:
   - Expand `ch11-l03` to include RFC 6120 standardized `<error>` stanzas.
   - Verify existing **Incident #107** (`incident_xmpp_auth_bypass.erl`).
3. **Chapter 12 Capstone Studio Polish (`ch12.ts`)**:
   - Verify all 5 milestones pass 100/100 on OTP 29 runtime bridge.
   - Add automated Chaos Monkey verification stage testing resilience to random worker kills.

---

## 7. Token Preservation & Instructional Quality Rules

When executing each batch, Antigravity must adhere strictly to these 4 non-negotiable pedagogical authoring constraints:

1. **Never Compress Explanations**: Every lesson must contain 400–600 words of rich, conversational markdown structured into the 4 Boot.dev parts (Analogy, Walkthrough, Worked Example, Challenge).
2. **Never Put Code Answers in `% TODO` Comments**: Comments must describe *intent* and algorithmic requirements. The code must be discovered by the learner using the left-pane parallel example.
3. **Zero Forward References**: Code in Chapter $N$ may only utilize syntax and libraries explicitly taught in Chapters $1 \dots N$.
4. **Clean Multi-File Isolation**: Supervisors and workers must never share overloaded `init/1` callbacks in the same file. Use multiple workspace tabs whenever OTP components interact.

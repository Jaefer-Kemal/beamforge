# Specification 01: Execution Architecture, `Run` vs `Submit`, and AST/Bytecode Verifier

## 1. Dual Execution Modes: `▷ Run` vs `▶ Submit`

To match Boot.dev's interactive workflow, the Go Orchestrator (`services/orchestrator`) and Erlang Harness (`runtimes/erl-harness`) MUST support two distinct execution endpoints/modes:

### Mode A: `▷ Run` (`POST /api/v1/run` & WS Channel `0x05` `type: "run_code"`)
- **Purpose:** Fast, low-friction experimentation and running Guided Demos.
- **Behavior:**
  1. Compiles the learner's active `.erl` file(s) using `bf_compiler:compile_and_load/2`.
  2. Captures all `io:format/1,2` standard output produced during execution.
  3. Executes ONLY the **Visible / Suggested Test Cases** defined for the lesson (e.g., `inventory:process_order(Inventory, Orders)`).
  4. Returns `{ stdout, compile_warnings, visible_test_results: [{ call_str, expected, actual, passed, time_ms }] }`.
  5. Does NOT mark the lesson completed or award XP yet.

### Mode B: `▶ Submit` (`POST /api/v1/verify` & WS Channel `0x05` `type: "submit_code"`)
- **Purpose:** Full mastery verification, rule enforcement, and level unlocking.
- **Behavior:**
  1. **Stage 1 — Compilation & Export Audit:** Compiles `.erl` files and verifies all required `fun/arity` exports exist via `Module:module_info(exports)`.
  2. **Stage 2 — AST & Bytecode Rule Verification (`bf_ast_verifier`):**
     - Verifies **Forbidden Calls** (e.g., blocking `lists:map/2`, `lists:foldl/3`, `lists:sum/1`, or list comprehensions when the assignment requires manual recursion).
     - Verifies **Required Constructs** (e.g., requiring `when` guard clauses, `case...of`, map pattern matching `:=`, bit syntax `<<...>>`, `receive...after`, or specific OTP behaviours `-behaviour(gen_server)`).
     - Verifies **True Tail-Call Optimization (TCO)** on specified functions (`{require_tco, [{process_order, 2}, {calculate_order_total, 2}, {restock, 2}]}`).
  3. **Stage 3 — Visible & Hidden Test Suite:** Runs all visible test cases PLUS hidden edge-case assertions (empty lists, insufficient stock, negative quantities, concurrent floods, worker crashes).
  4. **Stage 4 — OTP / TCP / XMPP Runtime Invariants (Chapters 5–12):** Runs `bf_chaos_engine`, `bf_backpressure_tester`, or `bf_xmpp_c2s_harness` when applicable.
  5. Signs the verdict with SHA256 and unlocks the next lesson upon 100% pass.

---

## 2. Erlang AST & Bytecode Rule Verifier (`runtimes/erl-harness/apps/bf_grader/src/bf_ast_verifier.erl`)

You MUST implement `bf_ast_verifier.erl` in `bf_grader` with the following real exported functions:

### 2.1 `verify_rules(SourceFilePath, BeamBinary, RulesMap) -> {ok, DetailsList} | {error, RuleViolationsList}`

1. **AST Parsing via `epp:parse_file/2`:**
   - Parses `SourceFilePath` into standard Erlang abstract forms.
   - Walks the AST recursively across all `function` forms:
     - **`forbidden_remote_calls => [{Mod, Fun, Arity} | {Mod, Fun, any}]`:** Scans for `{call, Line, {remote, _, {atom, _, Mod}, {atom, _, Fun}}, Args}`. If found, records a violation: `<<"Line ", LineBin/binary, ": Forbidden call to ", ModBin/binary, ":", FunBin/binary, ". This assignment requires implementing the logic manually.">>`.
     - **`forbidden_constructs => [list_comprehension | try_catch | if_expr]`:** Scans for `{lc, Line, _, _}` (list comprehensions) when forbidden (such as in the Inventory Order Processor assignment where intermediate lists are banned).
     - **`required_remote_calls => [{Mod, Fun, Arity}]`:** Ensures that when a lesson specifically teaches `lists:foldl/3` or `erlang:monitor/2` or `ets:new/2`, the learner actually called that function at least once.
     - **`required_constructs => [guards | map_exact_match | bit_syntax | receive_after | record_def]`:** Checks AST forms for non-empty guard sequences in `{clause, Line, Patterns, Guards, Body}`, `{map_field_exact, ...}`, `{bin, ...}`, etc.

2. **True Tail-Recursion Verification via `beam_disasm:file/1` + Helper Tracing:**
   - **`require_tail_recursion => [{FunName, Arity}]`:**
   - Disassembles `BeamBinary` using `beam_disasm:file(BeamBinary)` -> `{beam_file, Module, LabeledExports, Attrs, CompileInfo, Functions}`.
   - Inspects the target `{function, FunName, Arity, Entry, Opcodes}` AND any local helper function it delegates to (e.g., `process_order/3` or `calculate_order_total/3`):
     - Checks if recursive self-calls use tail-call opcodes (`{call_only, Arity, Label}` or `{call_last, Arity, Label, Dealloc}`) vs body-recursive `{call, Arity, Label}` followed by list construction (`put_list`) or arithmetic BIFs (`{gc_bif, '+', ...}`) before `{return}`.
     - Also pairs with runtime stack assertion (`bf_beam_inspector:assert_tail_recursive/4`) to guarantee $O(1)$ stack frames.

---

## 3. Mandatory Cross-Check Checklist for Spec 01
- [ ] `bf_ast_verifier.erl` compiles cleanly and exports `verify_rules/3`, `check_ast_forms/2`, and `check_beam_tco/2`.
- [ ] `bf_harness_eunit.erl` includes unit tests proving `bf_ast_verifier` catches:
      1. A body-recursive function masquerading as tail-recursive.
      2. A forbidden `lists:sum/1` or list comprehension `[X || X <- L]` in `inventory.erl`.
      3. Missing required guard clauses or missing required `lists:foldl/3` calls.
- [ ] Go Orchestrator exposes both `POST /api/v1/run` (visible tests + stdout) and `POST /api/v1/verify` (AST rules + visible + hidden tests).
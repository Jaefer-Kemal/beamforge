# Specification 09: Test Reinforcement, Anti-Cheat Verification, and Visible Test Quality

## 1. Executive Summary & Purpose

This specification governs the testing integrity, anti-cheat enforcement, and diagnostic quality across **BeamForge**. Modeled after **Boot.dev's pedagogical rigor**, it guarantees that learners cannot pass exercises through hardcoding, copy-pasting, memorizing static test vectors, or abusing unpermitted standard library shortcuts.

### The Core Problem
Under purely static test suites, a learner can inspect or guess inputs and hardcode conditional return values:
```erlang
%% Trivial hardcoding cheat that passes 2 static tests:
calculate_bandwidth(1250, 2) -> 5000;
calculate_bandwidth(2500, 5) -> 4000.
```
Similarly, when manual tail recursion is taught, learners can bypass the objective by calling `lists:sum/1`, `lists:map/2`, or list comprehensions unless blocked by AST verification.

### The Cardinal Invariants (Guaranteed Across All Phases)
1. **Canonical Solutions are Untouched**: `solutionCode` and `solutionFiles` across all 93 lessons remain the untouched reference gold standard.
2. **Starter Packs are Untouched**: `starterCode` and `files` remain 100% intact with clean `@doc` contracts.
3. **No Reductions or Regressions**: All changes are strictly additive improvements. Existing canonical solutions must continue to pass 100% with score 100.
4. **Strict Dual-Execution Separation**:
   - **Mode A (`▷ Run`)**: Runs exclusively in the Web IDE executing `visibleTestCases` for fast local feedback, syntax validation, and diagnostic transparency.
   - **Mode B (`▶ Submit`)**: Runs in the Go Orchestrator backend (`services/orchestrator/internal/bridge/erl_runner_chapters.go`), executing the strict 4-Tier Verification Gate.

---

## 2. The 4-Tier Anti-Cheat Architecture

Every submission evaluated in Mode B (`▶ Submit`) must pass through four distinct verification tiers before unlocking XP:

```text
[ Mode B: Submit Verification Gate ]
  ├── Tier 1: AST Structural & Standard-Library Whitelist/Blacklist
  │   ├── Parse AST forms using epp:parse_file/2 via bf_ast_verifier
  │   ├── Forbid standard library shortcuts (lists:sum, lists:map, lists:foldl, etc.)
  │   ├── Require explicit language constructs (function-head guards, bit-syntax, :=)
  │   └── Disassemble bytecode using beam_disasm to enforce true tail recursion (call_only/call_last)
  ├── Tier 2: Adversarial Hidden Edge-Case Matrix
  │   ├── Boundary collections: empty list [], singleton [X], empty binary <<>>, empty map #{}
  │   ├── Type safety: 42 vs 42.0 (exact equality), atom vs binary
  │   └── Exception assertions: assert invalid inputs crash with error:function_clause
  ├── Tier 3: Dynamic Property-Based Fuzzing
  │   ├── Execute 20 to 50 randomized iterations via rand:uniform/1
  │   └── Assert mathematical and state invariants across randomized parameters
  └── Tier 4: Concurrency Chaos & State Invariant Injection (Chapters 5-12)
      ├── Concurrent message floods (50-100 parallel workers)
      ├── Process kills (exit(Pid, kill)) asserting supervisor restarts within 50ms
      └── ETS heir table survival under process owner termination
```

---

## 3. The 4-Phase Implementation Roadmap

| Phase | Target Scope | Focus Areas | Primary Target Files |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Chapters 1–4 Backend | Dynamic property fuzzing (`rand:uniform`) and hidden boundary matrices for foundational syntax, recursion, and data structures. | `services/orchestrator/internal/bridge/erl_runner_chapters.go` (Lines 4806–7150) |
| **Phase 2** | Chapters 1–4 AST | Wire `bf_ast_verifier` into all recursion and pattern-matching lessons; enforce opcode-level TCO disassembly (`beam_disasm`). | `services/orchestrator/internal/bridge/erl_runner_chapters.go` |
| **Phase 3** | Chapters 5–12 Backend | Concurrency floods, supervisor worker kill/restart audits, ETS heir transfer persistence, and TCP/XMPP chunked framing fuzzing. | `services/orchestrator/internal/bridge/erl_runner_chapters.go` |
| **Phase 4** | Chapters 1–12 Visible Tests | Add missing function visible tests (`ch09-l06`, `ch09-l08`, `ch12-m1`–`m5`) and enforce the 2-Test Minimum Rule across all lessons. | `apps/web-ide/src/data/chapters/ch01.ts`–`ch12.ts` |

---

## 4. Phase 1 Case-by-Case Implementation Map (Chapters 1–4)

Target file: `services/orchestrator/internal/bridge/erl_runner_chapters.go` (`buildChapterVerificationScript`).

### Chapter 1: Foundational Syntax, Guards & Operators

#### `ch01-l01` (Line 4806)
- **Module**: `beam_intro.erl`
- **Required Exports**: `inspect_vm/0`
- **Current Tests**: 1 static inspection.
- **Hardening Requirements**:
  - Keep Stage 1 (Compile & Export Audit) and Stage 2 (AST check for `erlang:system_info/1`).
  - Add Stage 3 live runtime verification asserting system values match live BEAM properties (`OnlineSchedulers > 0`, `ProcLimit >= 1024`, `AtomLimit >= 1024`).

#### `ch01-l02` (Line 4855)
- **Module**: `basic_types.erl`
- **Required Exports**: `calculate_bandwidth/2`, `is_exact_match/2`, `is_within_quota/3`
- **Current Tests**: 3 static expressions.
- **Hardening Requirements**:
  - **Dynamic Fuzzing Loop**: 25 iterations of `rand:uniform` for `Bytes` (100–100,000) and `Seconds` (1–60), asserting `calculate_bandwidth(B, S) =:= ((B * 8) div S)`.
  - **Exact Equality Matrix**: Test strict equality (`=:=`) on mixed pairs (`42` vs `42.0`, `100` vs `100`, `alpha` vs `beta`, `ok` vs `ok`).
  - **Quota Boundary Fuzzing**: Test `is_within_quota` on negative numbers (`< 0` returns false), over-quota (`> Limit` returns false), zero boundary (`0` returns true), exact limit (`Limit` returns true), and admin bypass (`true` always returns true regardless of quota).

#### `ch01-l03` (Line 4900)
- **Module**: `pattern_vars.erl`
- **Required Exports**: `rebind_update/2`, `extract_middle/1`
- **Current Tests**: 2 static expressions.
- **Hardening Requirements**:
  - **Dynamic Fuzzing Loop**: 20 randomized integer pairs `(Base, Add)` asserting `((Base + Add) * 2)`.
  - **Dynamic 3-Tuple Fuzzing**: 20 randomized 3-tuples `{Tag, MiddleVal, Num}` where `Tag` and `Num` vary randomly; assert `extract_middle` extracts `MiddleVal`.
  - **Adversarial Exception Rejection**: Verify 2-tuples `{A, B}` and 4-tuples `{A, B, C, D}` crash with `error:function_clause`.

#### `ch01-l04` (Line 4940)
- **Module**: `telecom_events.erl`
- **Required Exports**: `make_event/3`, `extract_caller/1`, `swap_endpoints/1`
- **Current Tests**: 3 static expressions.
- **Hardening Requirements**:
  - **Randomized Event Generator**: 15 randomized caller/callee atom pairs and sequence IDs. Assert tuple structure is strictly `{call_event, Seq, Caller, Callee, 0}`.
  - **Adversarial Untagged Rejection**: Verify non-event tuples crash with `function_clause`.

#### `ch01-l05` (Line 4986)
- **Module**: `list_ops.erl`
- **Required Exports**: `prepend_item/2`, `swap_first_two/1`
- **Current Tests**: 3 static expressions.
- **Hardening Requirements**:
  - **AST Enforcement**: Ban `lists:append/2` and `++` operator.
  - **Randomized Cons Fuzzing**: Prepend random elements to random lists of random length; assert result equals `[Item | List]`.
  - **Adversarial Rejection**: Verify `swap_first_two([])` and `swap_first_two([Single])` throw `function_clause`.

#### `ch01-l06` (Line 5054)
- **Module**: `arity_calc.erl`
- **Required Exports**: `connect/1`, `connect/2`
- **Current Tests**: 3 static expressions.
- **Hardening Requirements**:
  - **Randomized Host & Port Fuzzing**: Verify `connect(Host)` delegates to `connect(Host, 8080)` using 10 randomized host names; assert `{connected, Host, Port}` structure.

#### `ch01-l07` (Line 5121)
- **Module**: `clause_router.erl`
- **Required Exports**: `describe_status/1`, `head_or_default/2`
- **Current Tests**: 3 static expressions.
- **Hardening Requirements**:
  - **Status Fallback Fuzzing**: Fuzz 15 random non-standard integer status codes; assert all return `unknown_status`.
  - **Default Fallback Fuzzing**: Assert `head_or_default([], RandDefault) =:= RandDefault` across 20 randomized default values.

#### `ch01-l08` (Line 5182)
- **Module**: `telecom_foundations.erl`
- **Required Exports**: `classify_packet/1`, `bill_call/2`
- **Current Tests**: 4 static expressions.
- **Hardening Requirements**:
  - **Port Boundary Fuzzing**: Fuzz valid port ranges (`1` to `65535`) and invalid out-of-range ports (`0`, `-10`, `70000`); assert out-of-range ports fail function clause guards.
  - **Billing Arithmetic Fuzzing**: Fuzz call durations; assert zero duration and standard durations bill correctly.

---

### Chapter 2: Pattern Matching & Tail Recursion

#### `ch02-l01` (Line 5271)
- **Module**: `deep_match.erl`
- **Required Exports**: `extract_route/1`, `repackage_envelope/1`
- **Hardening**: AST ban on `element/2`; randomized deep envelope destructuring; rejection of malformed nested headers.

#### `ch02-l02` (Line 5355)
- **Module**: `guard_validator.erl`
- **Required Exports**: `validate_port/1`, `classify_temperature/1`
- **Hardening**: AST ban on `if` and `case`; fuzzing port boundaries `[-100, 70000]`; temperature sub-zero and above-hundred thresholds.

#### `ch02-l03` (Line 5436)
- **Module**: `flow_control.erl`
- **Required Exports**: `handle_http_response/1`
- **Hardening**: Exhaustive HTTP status coverage (200, 301, 302, 400, 401, 403, 404, 500, unknown fallback) with randomized headers and bodies.

#### `ch02-l04` (Line 5520)
- **Module**: `recursive_search.erl`
- **Required Exports**: `find_product/2`
- **Hardening**: AST ban on `lists:keyfind/3` and `lists:filter/2`; randomized catalog search with present and absent product IDs.

#### `ch02-l05` (Line 5604)
- **Module**: `tco_counter.erl`
- **Required Exports**: `sum_packets/1`, `count_packets/1`
- **Hardening**: AST & bytecode TCO verification (`call_only`/`call_last`); deep stack execution on 5,000-element randomized list asserting peak stack $\le 64$ words.

#### `ch02-l06` (Line 5664)
- **Module**: `acc_filter.erl`
- **Required Exports**: `keep_valid_orders/1`
- **Hardening**: AST ban on `lists:filter/2`, list comprehensions, and quadratic `++`; property test on 100 mixed orders verifying filtering and order preservation.

#### `ch02-l07` (Line 5751)
- **Module**: `tuple_updater.erl`
- **Required Exports**: `update_product_price/3`
- **Hardening**: AST ban on `lists:keyreplace/4`; randomized price updates verifying head, middle, tail, and absent ID handling.

#### `ch02-l08` (Line 5840)
- **Module**: `inventory.erl`
- **Required Exports**: `process_order/2`, `calculate_order_total/2`, `restock/2`
- **Hardening**: Retain existing gold-standard 4 stages (AST audit, TCO bytecode check, 6 hidden edge cases, 1,000-frame deep stack inspection).

---

### Chapter 3: Higher-Order Functions & List Comprehensions

#### `ch03-l01` (Line 5844)
- **Module**: `hof_basics.erl`
- **Required Exports**: `make_multiplier/1`, `apply_twice/2`
- **Hardening**: Randomized factor $M$ and input $X$; assert $(make\_multiplier(M))(X) =:= M \times X$; assert `apply_twice` throws `function_clause` on non-fun terms.

#### `ch03-l02` (Line 5945)
- **Module**: `hof_transform.erl`
- **Required Exports**: `discount_prices/2`, `active_sessions/1`
- **Hardening**: AST requirement for `lists:map/2` and `lists:filter/2`; dynamic pricing fuzzing across 30 randomized product catalogs.

#### `ch03-l03` (Line 6017)
- **Module**: `hof_predicates.erl`
- **Required Exports**: `all_in_stock/1`, `any_critical/1`
- **Hardening**: AST requirement for `lists:all/2` and `lists:any/2`; dynamic predicate fuzzing with mixed stock levels.

#### `ch03-l04` (Line 6081)
- **Module**: `hof_fold.erl`
- **Required Exports**: `sum_ledger/1`, `min_max_latency/1`
- **Hardening**: AST requirement for `lists:foldl/3`; AST ban on `lists:sum/1`, `lists:min/1`, `lists:max/1`; randomized ledger entries with negative balance checks.

#### `ch03-l05` (Line 6165)
- **Module**: `keylist_config.erl`
- **Required Exports**: `find_product_by_id/2`, `set_config/3`
- **Hardening**: AST requirement for `lists:keyfind/3` and `lists:keystore/4`; proplist upsert fuzzing.

#### `ch03-l06` (Line 6240)
- **Module**: `comprehension_queries.erl`
- **Required Exports**: `active_user_names/1`, `matrix_cartesian/2`
- **Hardening**: AST requirement for list comprehensions `[X || ...]`; AST ban on `lists:map`; cartesian product dimension validation ($N \times M$).

#### `ch03-l07` (Line 6326)
- **Module**: `inventory_hof.erl`
- **Required Exports**: `total_inventory_valuation/1`, `critical_stock_alerts/1`
- **Hardening**: Pipeline efficiency verification combining fold and comprehension without intermediate quadratic overhead.

---

### Chapter 4: Maps, Records, Binaries & Bit Syntax

#### `ch04-l01` (Line 6402)
- **Module**: `map_registry.erl`
- **Required Exports**: `create_session/2`, `update_presence/3`
- **Hardening**: AST requirement for map pattern matching `:=` and update `|=>`; session immutability fuzzing.

#### `ch04-l02` (Line 6490)
- **Module**: `map_stdlib.erl`
- **Required Exports**: `safe_get_load/2`, `increment_tag_counts/2`
- **Hardening**: AST requirement for `maps:get/3` and `maps:update_with/4`; tag frequency distribution fuzzing.

#### `ch04-l03` (Line 6559)
- **Module**: `record_frames.erl`
- **Required Exports**: `new_frame/3`, `advance_seq/1`
- **Hardening**: AST requirement for `-record(frame, ...)` and record update `#frame{...}`; 100-step sequential sequence increment loop.

#### `ch04-l04` (Line 6664)
- **Module**: `iolist_builder.erl`
- **Required Exports**: `build_http_response_iolist/3`
- **Hardening**: AST requirement for nested IOLists; AST ban on `list_to_binary/1` inside the builder; zero-copy deep list assertion.

#### `ch04-l05` (Line 6732)
- **Module**: `bit_packer.erl`
- **Required Exports**: `pack_header/3`, `unpack_header/1`
- **Hardening**: 30-iteration round-trip bit fuzzing (`unpack_header(pack_header(V, F, L)) =:= {ok, V, F, L}`); malformed truncated binary rejection (`< 24 bits`).

#### `ch04-l06` (Line 6877)
- **Module**: `binary_scanner.erl`
- **Required Exports**: `split_key_value/1`
- **Hardening**: AST requirement for binary comprehension generator `<=`; malformed line delimiter fuzzing.

#### `ch04-l07` (Line 6989)
- **Module**: `binary_slicer.erl`
- **Required Exports**: `slice_header/2`
- **Hardening**: Sub-binary pinning leak verification; negative-length guard rejection.

#### `ch04-l08` (Line 7120)
- **Module**: `frame_decoder.erl`
- **Required Exports**: `parse_stream_frames/1`
- **Hardening**: Chunk boundary fuzzing; fragmented TCP stream reconstruction.

---

## 5. Verification Checklist for Spec 09

- [x] All canonical solutions pass 100% of tests with score 100.
- [x] No changes made to `solutionCode`, `solutionFiles`, `starterCode`, or `files`.
- [x] Dynamic property fuzzing (`rand:uniform`) guarantees hardcoded pattern matching fails verification.
- [x] Adversarial edge cases (empty lists, negative numbers, malformed terms) crash with `error:function_clause`.
- [x] Go orchestrator builds cleanly with `go build ./...` and tests pass with `go test`.
- [x] All 94 curriculum lessons and Capstone milestones satisfy the 2-Test Minimum Rule with zero lessons having < 2 visible tests.
- [x] Next.js frontend builds cleanly (`npm run build`) and passes typechecking (`npx tsc --noEmit`) with 0 errors.

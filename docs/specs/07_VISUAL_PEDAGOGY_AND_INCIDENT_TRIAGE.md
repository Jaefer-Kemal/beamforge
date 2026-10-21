# Specification 07: Interactive Step-Diagrams (Replacing ASCII Art), Mental Model Checks, Term Diffs, BEAM Scorecards & Production Incident Triage Labs

## 0. Strict Non-Destructive & Anti-Clutter Guardrails
1. **No Ugly ASCII Art Boxes:** Remove raw `+----+` or `/ \` ASCII architecture blocks from `ch01.ts`–`ch12.ts` markdown strings and replace them with `<BeamConceptVisualizer/>` scenes.
2. **Deterministic Left-Pane Vertical Slot Order (Zero Layout Conflict):**
   Inside `LessonSplitView.tsx` and `CapstoneStudioView.tsx`, the Left Pane scroll container MUST render elements in this exact vertical flow without adding extra columns or floating popups:
   - **Slot 1 (Top, only on `'incident_triage'` lessons):** `<IncidentAlertBanner alert="{lesson.incidentAlert}"/>`
   - **Slot 2 (Concept Guide):** Markdown lesson description (`conceptMarkdown`).
   - **Slot 3 (Interactive Step-Diagram, collapsible):** `<BeamConceptVisualizer scene="{lesson.visualScene}"/>` (`max-h-[260px]`, static by default, user-stepped via `◀ Prev` / `Next ▶`).
   - **Slot 4 (Official OTP Doc Cards):** `<OtpDocSignatureCard/>` list.
   - **Slot 5 (Pre-Coding Concept Check, collapsible):** `<MentalModelCheckCard check="{lesson.mentalModelCheck}"/>`.
   - **Slot 6 (Bottom):** Assignment Rules & Verification Constraints box.
3. **Backward-Compatible Optional Fields:** All new fields on `CurriculumLevel` (`visualScene?`, `mentalModelCheck?`, `incidentAlert?`) and verification responses (`beam_footprint?`) MUST be optional (`?`) so existing code never breaks.
4. **Icons Instead of Emojis:** All UI components, badges, banners, and buttons MUST use structured Lucide SVG icons (e.g., `AlertTriangle`, `Brain`, `Zap`, `GitDiff`, `Activity`, `CheckCircle2`) and never raw OS emojis (no `🚨`, `🧠`, `⚡`).

---

## 1. `<BeamConceptVisualizer/>` — The 7 Interactive Step-Driven Scenes

Located at `apps/web-ide/src/components/pedagogy/BeamConceptVisualizer.tsx`.
- **Controls Header:** Scene Icon + Title, Step Pill (`Step {n} of 4`), `[ ◀ Prev ]`, `[ Next ▶ ]`, `[ ↺ Reset ]`, and a `[ Hide / Show ]` collapse toggle so the user can collapse the diagram while coding if desired.
- **Zero Auto-Looping Motion:** Diagrams only transition when the user clicks a step button.
- **Theme Aware:** Uses crisp slate/white glass tokens in Light Mode and glowing translucent slate/emerald/violet tokens in Dark Mode.

### The 7 Mandatory Scenes (`VisualSceneId`):
1. `'xmpp_5_module_capstone_arch'` (**Chapter 12 Capstone & XMPP Overview — Replaces the ASCII Diagram!**):
   - Renders a sleek, interactive 5-node SVG/Glass architecture diagram of the BeamForge XMPP Server:
     - Top Supervisor Node: `xmpp_sup` (`rest_for_one` Violet badge)
     - Middle Core Nodes: `xmpp_session_registry` (Amber ETS Table badge) $\leftrightarrow$ `xmpp_router` (Emerald Dispatcher badge)
     - Connection & Framing Pipeline: `TCP Socket` $\rightarrow$ `xmpp_stream_parser` (Binary Framer) $\rightarrow$ `xmpp_c2s_statem` (4-State FSM)
   - **4 Interactive Steps:**
     - **Step 1 (Supervision Boot - M1):** Highlights `xmpp_sup` booting `xmpp_session_registry` then `xmpp_router` under `rest_for_one`.
     - **Step 2 (Stream Framing & C2S Handshake - M2 & M4):** Highlights raw TCP bytes entering `xmpp_stream_parser:feed_chunk/2` and driving `xmpp_c2s_statem` from `wait_for_stream` $\rightarrow$ `wait_for_sasl` $\rightarrow$ `authenticated`.
     - **Step 3 (Resource Bind & ETS Registration - M3):** Highlights `xmpp_c2s_statem` binding `alice@localhost/obsidian`, registering its PID in `xmpp_session_registry` ETS table, and attaching `erlang:monitor/2`.
     - **Step 4 (Stanza Routing & Offline Fallback - M5):** Highlights `xmpp_router:route_stanza/3` looking up target PIDs in ETS and delivering `{deliver_stanza, XmlBin}` to online peers or storing in the offline queue.
2. `'tco_vs_body_stack'` (**Chapter 2 Tail Recursion & `inventory.erl`**):
   - 4-step side-by-side comparison of **Body Recursion (`Price + calc(Rest)`)** accumulating 4 stack frames (`Frame 1..4`) vs **Tail Recursion (`calc(Rest, Acc + Price)`)** reusing `Frame 1` in-place via the BEAM `call_last` opcode ($O(1)$ memory).
3. `'sub_binary_procbin_refc'` (**Chapter 4 Bit Syntax & Sub-Binary Leaks**):
   - 4-step diagram showing a 64 KB off-heap `ProcBin` (`refc = 1`), how pattern matching `<<Header:16/binary, _/binary>>` creates a 16-byte `SubBinary` pointer that pins the entire 64 KB buffer in RAM, and how `binary:copy/1` copies the 16 bytes to the process heap so the 64 KB `ProcBin` drops to `refc = 0 (GC Freed)`.
4. `'mailbox_selective_receive'` (**Chapter 5 Actor Mailbox & Save Queue**):
   - 4-step diagram showing a BEAM process mailbox `[ {log, 1}, {metric, 2}, {urgent, 99} ]`, the internal **Save Queue**, and the scan pointer moving unmatched messages into the Save Queue, extracting `{urgent, 99}`, and splicing the Save Queue back to the front.
5. `'links_monitors_signals'` (**Chapter 6 Links, `trap_exit`, Monitors & `my_gen_server`**):
   - 4-step interactive comparison between Caller `<0.105.0>` and Worker `<0.210.0>`: (1) Bidirectional `link` cascading crash, (2) `process_flag(trap_exit, true)` converting crash into `{'EXIT', <0.210.0>, badarith}`, (3) unidirectional `erlang:monitor/2` emitting `{'DOWN', #Ref, process, <0.210.0>, badarith}`, and (4) untrappable `exit(Pid, kill)`.
6. `'supervision_rest_for_one_ets_heir'` (**Chapters 8 & 9 Supervision Strategies & ETS Heir Handover**):
   - 4-step pipeline `[1. table_heir] -> [2. pricing_cache (owns ETS)] -> [3. order_gateway]` showing `pricing_cache` crashing, ETS ownership jumping to `table_heir` via `'ETS-TRANSFER'`, `rest_for_one` restarting workers 2 & 3 while keeping worker 1 alive, and `table_heir` giving the ETS table back via `ets:give_away/3`.
7. `'tcp_xmpp_stream_framing'` (**Chapters 10 & 11 TCP Fragmentation & `{active, once}` Framing**):
   - 4-step sliding byte-stream diagram showing 3 fragmented TCP packets (`"<stream:str"`, `"eam><message>Hi</mes"`, `"sage><ping/>"`) arriving under `{active, once}`, accumulating inside `BufferBin`, slicing out complete XML stanzas, and re-arming `inet:setopts(Socket, [{active, once}])`.

---

## 2. `<MentalModelCheckCard/>` & `<ErlangTermDiffCard/>`
- **`MentalModelCheckCard.tsx`:** 1-question interactive prediction card in Slot 5 of the Left Pane with 3 options (`A`, `B`, `C`), instant Emerald/Amber feedback, and a reset button. Uses Lucide `Brain` and `CheckCircle2` icons.
- **`ErlangTermDiffCard.tsx`:** Structured test case result card in the bottom drawer displaying `erlangCall` with a **`Copy Call`** button, duration in `ms`, and a side-by-side `Expected Term` vs `Actual Term` monospace diff highlighting mismatched tokens. Uses Lucide `GitDiff` icon.

---

## 3. `<BeamFootprintCard/>` & Go Orchestrator Telemetry
- `services/orchestrator/internal/bridge/erl_runner.go` captures real OTP 29 process metrics (`peak_stack_words`, `heap_words`, `reductions`, `sub_binary_leak_free`, `tco_verified`) and returns them in `beam_footprint` on both `POST /api/v1/run` and `POST /api/v1/verify`.
- `BeamFootprintCard.tsx` renders these 4 metrics as a compact glass telemetry strip at the top of the bottom results drawer using Lucide `Activity` and `Zap` icons.

---

## 4. "Production Incident Triage" Labs (`lessonType: 'incident_triage'`)
Add 7 realistic "Fix-the-Production-Outage" labs across Chapters 5–11 (`ch05-l07`, `ch06-l07`, `ch07-l07`, `ch08-l06`, `ch09-l07`, `ch10-l06`, `ch11-l07`) pre-loaded with buggy production Erlang code, an `<IncidentAlertBanner/>` (featuring Lucide `AlertTriangle` icon) in Slot 1 of the Left Pane, and live Go Orchestrator verifiers.

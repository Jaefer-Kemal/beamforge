# Specification 06: Developer Experience, Terminal-Authentic Erlang Errors & IntelliSense Spec

This specification defines the developer experience (DX) and pedagogical ergonomics overhaul for BeamForge's code editor and execution engine. It directly addresses syntax suggestion/autocomplete (VS Code-style Tab completion), real-time Erlang syntax and unbound variable highlighting (red squigglies), and authentic `c(module).`-style compiler error reporting with full clipboard copyability.

---

## 1. Problem Statement & Motivation

During hands-on learning, students encounter common Erlang syntax and variable binding mistakes:
1. **Accidental Whitespace in Atoms / Identifiers**: e.g., `-export([safe_parse_ payload/1])` where an extra space turns an exported function into two adjacent atoms.
2. **Malformed Clause Operators**: e.g., typing `Term - {ok, Term}` instead of `Term -> {ok, Term}` in `case`, `receive`, or `try...of` expressions.
3. **Unbound / Unsafe Variables**: e.g., referencing a worker process PID or result variable before it is bound, or using a variable bound in only one branch of a `case` construct.
4. **Obscure Compiler Error Presentation**: When `erlc` fails, the backend currently clears `Stdout` to `""`. The Web IDE displays `0/0 ✓` in the test drawer with an empty test table, hiding the compiler error inside raw logs.
5. **Disabled Text Selection**: Global CSS `select-none` on `<main>` prevents learners from highlighting or copying error messages from the console, forcing them into browser DevTools Inspect.

BeamForge must provide the **exact, authentic terminal feedback** familiar to Erlang engineers running `c(module).` in `erl`, combined with modern in-browser editor ergonomics (autocomplete, Tab expansion, and inline red squigglies).

---

## 2. Architecture & Core Pillars

```
+-----------------------------------------------------------------------------------+
|                                  BeamForge IDE                                    |
|                                                                                   |
|  +-------------------------------------+   +------------------------------------+ |
|  |           Monaco Editor             |   |        Lesson Drawer (Output)      | |
|  |                                     |   |                                    | |
|  |  - Tab-expandable OTP Snippets      |   |  - Authentic erlc terminal card    | |
|  |  - lists:/maps:/gen_server: prompts |   |  - Clickable file:line:col links   | |
|  |  - Red Squigglies (ModelMarkers)    |   |  - Fully copyable (select-text)    | |
|  |  - Hover Tooltips on Errors         |   |  - Clear failure status badge      | |
|  +------------------^------------------+   +------------------^-----------------+ |
|                     |                                         |                   |
+---------------------|-----------------------------------------|-------------------+
                      | (Debounced Lint / Keystroke)            | (▷ Run / ▶ Submit)
                      v                                         v
+-----------------------------------------------------------------------------------+
|                        Go Orchestrator (Backend :8080)                            |
|                                                                                   |
|  - POST /api/v1/run & /api/v1/verify: Preserves raw erlc stdout on failure        |
|  - WS Channel 3 / POST /api/v1/lint: Sub-millisecond erl_lint diagnostic runner   |
+-----------------------------------------------------------------------------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                         BEAM VM (Native Erlang/OTP 29)                            |
|                                                                                   |
|  1. erl_scan:string(Code, {1, 1}) -> Tokens with exact {Line, Column}             |
|  2. erl_parse:parse_form(Tokens)  -> AST Forms or Syntax Error                    |
|  3. erl_lint:module(Forms)        -> Unbound/Unsafe Variable Analysis             |
+-----------------------------------------------------------------------------------+
```

---

## 3. Pillar 1: Terminal-Authentic Compiler Error Display & Copyability

### 3.1 Backend: Preserve Raw `erlc` Terminal Output
In `services/orchestrator/internal/bridge/erl_runner.go`:
- When compilation fails (`hasErrors := true`), do **not** set `Stdout: ""` in `RunResult`.
- Preserve the exact `string(output)` returned by `erlc`.
- Parse structured diagnostics (`File`, `Line`, `Col`, `Severity`, `Message`) into the `Diagnostics` slice.

### 3.2 Output Drawer: Terminal Error Card (`LessonSplitView.tsx`)
Whenever `runResult.compileOk === false`:
- Replace the misleading `0/0 ✓` badge with a prominent red badge: `❌ Compilation Failed (erlc)`.
- Automatically render a high-contrast terminal card with monospace typography:
  ```text
  ==> Compiling src/inventory.erl failed:
  src/inventory.erl:2:10: syntax error before: payload
  src/inventory.erl:5:12: variable 'Term' is unbound
  ```
- **Clickable Jump-to-Line**: Clicking `src/inventory.erl:2:10` automatically scrolls and sets the Monaco editor cursor directly to Line 2, Column 10.
- **Full Clipboard Selection**: Explicitly add `select-text` (`user-select: text`) to the terminal container and error rows, allowing learners to freely highlight and copy compiler errors with `Ctrl+C`.

---

## 4. Pillar 2: VS Code-Style Erlang Syntax Autocomplete & Tab Snippets

Implemented client-side inside `apps/web-ide/src/lib/monacoErlang.tsx` with **0ms latency**:

### 4.1 Tab-to-Expand OTP Snippets
Registered via `monaco.languages.registerCompletionItemProvider('erlang', ...)`:

1. **`case` + Tab**:
   ```erlang
   case ${1:Expr} of
       ${2:Pattern} ->
           ${3:Body};
       ${4:_Other} ->
           ${5:Default}
   end
   ```
2. **`try` + Tab**:
   ```erlang
   try ${1:Expr} of
       ${2:Pattern} ->
           ${3:Body}
   catch
       ${4:Class}:${5:Reason}:${6:Stacktrace} ->
           ${7:ErrorHandler}
   end
   ```
3. **`receive` + Tab**:
   ```erlang
   receive
       ${1:Pattern} ->
           ${2:Body}
   after ${3:TimeoutMs} ->
       ${4:TimeoutBody}
   end
   ```
4. **`fun` + Tab**:
   ```erlang
   fun(${1:Args}) -> ${2:Body} end
   ```
5. **Directives (`-module`, `-export`, `-behaviour`, `-record`)**:
   - `-mod` + Tab -> `-module(${1:module_name}).`
   - `-exp` + Tab -> `-export([${1:func}/${2:arity}]).`
   - `-rec` + Tab -> `-record(${1:rec_name}, {${2:fields}}).`

### 4.2 Standard Library Autocomplete (Trigger Character `:`)
When the learner types `:`, trigger completions for popular OTP libraries with official type signatures:
- **`lists:`**: `reverse/1`, `map/2`, `filter/2`, `foldl/3`, `foldr/3`, `member/2`, `keyfind/3`, `keystore/4`, `flatten/1`.
- **`maps:`**: `get/2`, `put/3`, `remove/2`, `find/2`, `keys/1`, `values/1`, `merge/2`, `new/0`.
- **`erlang:`**: `monitor/2`, `demonitor/2`, `spawn_monitor/1`, `binary_to_term/2`, `term_to_binary/1`, `system_time/1`, `make_ref/0`, `send_after/3`.
- **`gen_server:`**: `start_link/3`, `call/2`, `call/3`, `cast/2`, `reply/2`.
- **`gen_statem:`**: `start_link/3`, `call/2`, `cast/2`.
- **`ets:`**: `new/2`, `insert/2`, `lookup/2`, `delete/2`, `update_counter/3`, `match_object/2`, `tab2list/1`.

### 4.3 In-Scope Variable Autocomplete
Extract variables declared within the current active function clause using regex/AST scanning and suggest them at the top of the autocomplete list when typing capitalized letters.

---

## 5. Pillar 3: Real-Time Erlang Syntax & Unbound Variable Linter (Red Squigglies)

### 5.1 BEAM Linter Micro-Handler (`bf_linter.erl`)
Located in `runtimes/erl-harness/apps/bf_grader/src/bf_linter.erl`:
- Uses standard OTP modules `erl_scan`, `erl_parse`, and `erl_lint:module`.
- **Step 1: Scan**: `erl_scan:string(Code, {1, 1})` -> extracts tokens with `{Line, Col}`.
- **Step 2: Parse**: `erl_parse:parse_form(Tokens)` -> parses all forms; catches syntax errors like:
  - `syntax error before: payload` (e.g. `safe_parse_ payload/1`)
  - `syntax error before: '-'` (e.g. `Term - {ok, Term}`)
- **Step 3: Lint**: `erl_lint:module(Forms)` -> performs full semantic verification:
  - `variable 'WorkerPid' is unbound`
  - `variable 'Term' unsafe in 'case'`
  - `variable 'X' is unused` (warning)
  - `function foo/1 already defined`
- **Execution Speed**: **< 2 milliseconds** for single-module code.

### 5.2 Real-Time Communication
- On keystroke in Monaco, debounce by **300ms**.
- Transmit source code via existing WebSocket (`wsMux` on Channel 3) or lightweight endpoint `POST /api/v1/lint`.
- Backend responds with array of diagnostics:
  ```json
  [
    {
      "line": 2,
      "col": 10,
      "severity": "error",
      "message": "syntax error before: payload"
    },
    {
      "line": 5,
      "col": 12,
      "severity": "error",
      "message": "variable 'Term' is unbound"
    }
  ]
  ```

### 5.3 Monaco Model Markers Integration
In `useWorkspaceStore.ts`:
- Call `monaco.editor.setModelMarkers(model, 'erlang', markers)`:
  - Red squiggly underline on exact column range.
  - Error icon in gutter.
  - Tooltip on hover with human-readable OTP error explanation.
  - Red markers in minimap.

---

## 6. Implementation Roadmap

### Phase 1: Terminal-Authentic Compiler Error Pipeline & Copyability
1. **Backend (`erl_runner.go`)**: Ensure `RunCode` preserves raw `erlc` combined output string in `RunResult.Stdout` and populates `Diagnostics`.
2. **Clipboard Copyability**: Add `select-text` CSS class to terminal drawer, console pre-blocks, and error cards.
3. **UI Compiler Error Card (`LessonSplitView.tsx`)**:
   - Check `runResult.compileOk === false`.
   - Display `❌ Compilation Failed (erlc)` instead of `0/0 ✓`.
   - Render dark terminal view with clickable line/col links that focus Monaco.

### Phase 2: Monaco Autocomplete & Tab-to-Expand OTP Snippets
1. **Snippets & Keywords (`monacoErlang.tsx`)**:
   - Implement `monaco.languages.registerCompletionItemProvider('erlang', ...)`.
   - Add snippet templates for `case`, `try`, `receive`, `fun`, `-module`, `-export`, `-record`.
2. **OTP Standard Library**:
   - Add completion items with documentation cards for `lists:`, `maps:`, `erlang:`, `gen_server:`, `ets:`.
3. **Active Scope Variables**:
   - Dynamic variable provider scanning active function.

### Phase 3: Real-Time Debounced Erlang Linting & Red Squigglies
1. **BEAM Linter (`bf_linter.erl`)**:
   - Write and compile `bf_linter:lint_string/1` returning structured JSON diagnostics.
2. **API / WebSocket Endpoint**:
   - Expose `POST /api/v1/lint` and wire `wsMux` Channel 3 for instant responses.
3. **Store & Monaco Wiring**:
   - Add debounced lint hook in `useWorkspaceStore.ts`.
   - Call `monaco.editor.setModelMarkers` to display red squigglies and gutter markers.

---

## 7. Verification & Acceptance Criteria

1. **Copyability**: Learners can highlight any text in the output drawer, console output, or error cards and copy with `Ctrl+C`.
2. **Authentic Output**: Introducing `safe_parse_ payload/1` or `Term - {ok, Term}` displays exact `c(module).` terminal output:
   `src/module.erl:2:10: syntax error before: payload`.
3. **Click-to-Line**: Clicking the error line jumps the Monaco cursor to that exact line and column.
4. **Autocomplete**: Typing `case` and pressing `Tab` expands a full Erlang `case...of...end` block.
5. **Red Squigglies**: Unbound variables (e.g. `WorkerPid`) are highlighted with red squiggly underlines and hover tooltips as the learner types.

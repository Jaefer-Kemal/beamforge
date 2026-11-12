# Specification 04: Mandatory Pedagogy & Lesson Content Template

When authoring any lesson or problem set in `apps/web-ide/src/data/`, it MUST never be a stub or a 1-paragraph summary. Every lesson must adhere to this exact structure:

## 1. Left-Pane Markdown Structure (`conceptMarkdown`)
Every lesson's markdown guide MUST include these 5 sections:
1. **`## Why This Matters in Production`**: 1–2 paragraphs connecting the concept to real-world high-concurrency systems (telecom switches, WhatsApp/MongooseIM messaging, payment ledgers, or BEAM VM internals).
2. **`## Deep Concept Breakdown & Under the Hood`**:
   - Step-by-step explanation with concrete, annotated Erlang code blocks.
   - Explanation of what the BEAM VM is doing under the hood (e.g., stack frames, heap allocation, mailbox pointers, or TCP socket buffers).
   - **Zero Table-List Redundancy**: When summarizing tradeoffs in a comparison table, never immediately repeat those exact rows in a bulleted list; follow-up notes must add distinct VM invariants or pitfalls.
3. **`## Official Erlang Docs & Function Reference`**:
   - Whenever standard library functions or BIFs are used, include a clear signature block showing how to read the official Erlang documentation:
     ```erlang
     %% Official OTP Signature (stdlib / lists)
     lists:foldl(Fun, Acc0, List1) -> Acc1
       Types:
         Fun = fun((Elem :: T, AccIn :: Acc) -> AccOut :: Acc)
         Acc0 = Acc1 = Acc = term()
         List1 = [T]
     ```
   - Followed by a brief note explaining how to read the type spec and a pointer to the attached `references` card.
4. **`## Parallel Worked Example`**:
   - Complete, runnable Erlang modules (`-module(...)`, full exports, realistic production flow) are welcome and encouraged, provided they maintain strict domain disjunction and avoid 1:1 functional mirroring.
   - Every example must be clearly understandable: divided into digestible sections or annotated with clear prose so the learner understands *what the BEAM is doing* at each phase.
   - **Proportional Simplicity**: Never overcomplicate or make parallel examples "over the top". Avoid bloated secondary domains or extraneous nested models; demonstrate the target BEAM/OTP pattern in the cleanest, most direct, and elegant manner possible.
   - **Example-Prose Parity**: Every Erlang construct or guard combination called out in explanatory bullets below a worked example MUST actually appear in that example's code block.
   - For Capstones & complex Problem Sets, prioritize chunked architectural references or deeply explained modules that guide composition without spoiling the assignment's exact arity or endpoints.
5. **`## Assignment Specification`** (for coding lessons & problem sets):
   - Exact module name and `-export([...])` list.
   - Structured 3-part layout (`Input`, `Behavior`, `Examples`) for every function.
   - Zero Erlang syntax or message tuple dictation in prompt prose.
6. **`## Rules & Verification Constraints`**:
   - Explicit bullet list of what the automated AST/Bytecode and EUnit checker will enforce (e.g., *"Must be tail-recursive"*, *"Do not use `lists:sum/1`"*).

## 2. Right-Pane Starter Template, Visible Test Cases & Solution
Every lesson object MUST provide:
- **`starterFiles` & `starterCode`**: Ready-to-edit Erlang module template with `-module(...)`, `-export([...])`, strict 10/10 EDoc `%% @doc` comments, and clean function skeletons.
  - **Strict `@doc` Contract Precision**: Every `@doc` line must accurately distinguish caller-supplied inputs from computed values, state whether invalid inputs reject/fail vs. return an error value in plain English (zero syntax spoilers), and avoid opaque jargon without concrete domain context.
  - **No Pre-Solved Core Logic**: Skeletons must provide neutral minimal return stubs (e.g. `ok.`, `{noreply, State}`, `{keep_state, Data}`). Never pre-solve core state transitions, fast-fails, or event matching clauses that give away the assignment's central challenge.
- **`visibleTestCases`**: Array of `{ id, title, erlangCall, expectedOutput, explanation }` displayed in the **`🧪 Test Cases`** drawer and executed when clicking **`▷ Run`**. Every single visible test case MUST be executed dynamically and pass 100% against `solutionFiles` (never skipped, miscounted, or out of sync with the Go runner), while `starterFiles` compiles cleanly and executes stubs safely without crashing the compilation pipeline.
- **`astRules`**: Structured rule spec passed to `bf_ast_verifier:verify_rules/3` when clicking **`▶ Submit`**:
  - `requireTailRecursion: string[]` (e.g., `["process_order/2", "calculate_order_total/2", "restock/2"]`)
  - `forbiddenCalls: string[]` (e.g., `["lists:map", "lists:foldl", "lists:sum"]`)
  - `requiredCalls: string[]`
  - `requiredConstructs: string[]`
- **`solutionFiles` & `solutionExplanation`**: Complete, verified Erlang implementation (verified via `erlc.exe -Wall` + live OTP execution alongside the lesson's Parallel Worked Example) that passes 100% of `Run` visible tests and `Submit` checks without modification, plus a step-by-step explanation shown when the learner clicks **`👁 Solution`**.
# Specification 04: Mandatory Pedagogy & Lesson Content Template

When authoring any lesson or problem set in `apps/web-ide/src/data/`, it MUST never be a stub or a 1-paragraph summary. Every lesson must adhere to this exact structure:

## 1. Left-Pane Markdown Structure (`conceptMarkdown`)
Every lesson's markdown guide MUST include these 5 sections:
1. **`## Why This Matters in Production`**: 1–2 paragraphs connecting the concept to real-world high-concurrency systems (telecom switches, WhatsApp/MongooseIM messaging, payment ledgers, or BEAM VM internals).
2. **`## Deep Concept Breakdown & Under the Hood`**:
   - Step-by-step explanation with concrete, annotated Erlang code blocks.
   - Explanation of what the BEAM VM is doing under the hood (e.g., stack frames, heap allocation, mailbox pointers, or TCP socket buffers).
3. **`## 📖 Official Erlang Docs & Function Reference`**:
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
4. **`## Assignment Specification`** (for coding lessons & problem sets):
   - Exact module name and `-export([...])` list.
   - Data representation (tuples, records, maps, or binaries).
   - Numbered breakdown of every function to implement (`1. func_a/2`, `2. func_b/2`).
   - Concrete **Example Data** and **Expected Behavior** walk-through.
5. **`## Rules & Verification Constraints`**:
   - Explicit bullet list of what the automated AST/Bytecode and EUnit checker will enforce (e.g., *"Must be tail-recursive"*, *"Do not use `lists:sum/1`"*).

## 2. Right-Pane Starter Template, Visible Test Cases & Solution
Every lesson object MUST provide:
- **`starterFiles`**: Ready-to-edit Erlang module template with `-module(...)`, `-export([...])`, helpful type/record comments, and clear function skeletons so the learner can start coding immediately without boilerplate friction.
- **`visibleTestCases`**: Array of `{ id, title, erlangCall, expectedOutput, explanation }` displayed in the **`🧪 Test Cases`** drawer and executed when clicking **`▷ Run`**.
- **`astRules`**: Structured rule spec passed to `bf_ast_verifier:verify_rules/3` when clicking **`▶ Submit`**:
  - `requireTailRecursion: string[]` (e.g., `["process_order/2", "calculate_order_total/2", "restock/2"]`)
  - `forbiddenCalls: string[]` (e.g., `["lists:map", "lists:foldl", "lists:sum"]`)
  - `requiredCalls: string[]`
  - `requiredConstructs: string[]`
- **`solutionFiles` & `solutionExplanation`**: Complete, verified Erlang implementation that passes 100% of `Submit` checks, plus a step-by-step explanation shown when the learner clicks **`👁 Solution`**.
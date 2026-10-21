'use client';

import React, { useEffect } from 'react';
import { BootDevTopBar } from '../components/navigation/BootDevTopBar';
import { LessonSplitView } from '../components/workspace/LessonSplitView';
import { CapstoneStudioView } from '../components/workspace/CapstoneStudioView';
import { CurriculumWorldMap } from '../components/curriculum/CurriculumWorldMap';
import { GlassWorkspace } from '../components/workspace/GlassWorkspace';
import { ReferencesVaultView } from '../components/references/ReferencesVaultView';
import { CommandPalette } from '../components/workspace/CommandPalette';
import { useWorkspaceStore } from '../state/useWorkspaceStore';
import { wsMux } from '../lib/ws-multiplexer';
import { getLessonByChapterAndNum, getLessonById } from '../data/curriculumCatalog';

// ── Minimal lesson content for the currently selected chapter / lesson ────────
// Phase 3 will populate these from the full curriculumCatalog.
// For now we wire a live ch02-l06 Inventory Order Processor lesson so the
// Boot.dev UI can be exercised end-to-end against the Phase 1 orchestrator.
const DEMO_LESSON = {
  id: 'ch02-l06',
  chapterNumber: 2,
  lessonNumber: 6,
  lessonType: 'problem_set' as const,
  title: 'Assignment: Inventory Order Processor',
  difficulty: 'Intermediate' as const,
  conceptMarkdown: `## Why This Matters in Production

Inventory management is a canonical example of stateful sequential computation. In real systems like Amazon FBA, Zalando, or an airline seat reservation engine, stock counters must be modified atomically and correctly under high-throughput order streams.

The Erlang/OTP approach uses **tail-recursive accumulator loops** instead of mutable arrays or \`lists:foldl/3\`. This keeps stack memory constant regardless of order volume — a critical BEAM VM property called **Tail Call Optimization (TCO)**.

## Deep Concept Breakdown & Under the Hood

A **tail-recursive** function makes its recursive call in the **return position** — no pending computation after the call. The BEAM VM converts this into a \`call_last\`/\`call_only\` bytecode opcode, reusing the current stack frame.

\`\`\`erlang
%% WRONG: body-recursive (grows stack O(n))
total([], Acc) -> Acc;
total([{order, _, Qty, Price} | Rest], Acc) ->
    (Qty * Price) + total(Rest, Acc).   %% call NOT in tail position

%% CORRECT: accumulator tail-recursive (O(1) stack)
total([], Acc) -> Acc;
total([{order, _, Qty, Price} | Rest], Acc) ->
    total(Rest, Acc + Qty * Price).     %% call IS in tail position
\`\`\`

> The BEAM's \`beam_disasm:file/1\` reveals \`call_last\` opcodes for tail calls vs \`call\` opcodes for body-recursive calls. BeamForge's AST verifier checks both.

## Assignment Specification

Module: \`inventory\` · Export: \`process_order/2\`, \`calculate_order_total/2\`, \`restock/2\`

**Data Types:**
\`\`\`erlang
Inventory = [{product, Id, Name, Price, Stock}]
Orders    = [{order, ProductId, Quantity}]
Restocks  = [{ProductId, AddQty}]
\`\`\`

**Expected Behaviour (sample data):**
\`\`\`erlang
Inv    = [{product, 1, "Keyboard", 50, 10},
          {product, 2, "Mouse",    25,  5},
          {product, 3, "Monitor", 200,  2}],
Orders = [{order, 1, 2}, {order, 2, 3}, {order, 3, 5}].

inventory:process_order(Inv, Orders)
  => [{product,1,"Keyboard",50,8},
      {product,2,"Mouse",25,2},
      {product,3,"Monitor",200,2}]   %% Monitor: capped at 0 → 2 remaining

inventory:calculate_order_total(Inv, Orders) => 175
inventory:restock(ProcessedInv, [{1,5},{2,10}])
  => [{product,1,"Keyboard",50,13},
      {product,2,"Mouse",25,12},
      {product,3,"Monitor",200,2}]
\`\`\`

## Rules & Verification Constraints

- **Must use tail recursion** for \`process_order/2\`, \`calculate_order_total/2\`, \`restock/2\` (and all helper loops). The BEAM bytecode verifier checks for \`call_last\`/\`call_only\` opcodes.
- **Forbidden calls**: \`lists:sum/1\`, \`lists:map/2\`, \`lists:foldl/3\`, \`lists:filter/2\`.
- **Forbidden constructs**: list comprehensions \`[X || X <- List]\`.
- **Required**: Manual accumulator recursion matching the exact data format above.`,
  otpDocCards: [
    {
      functionName: 'reverse',
      module: 'lists',
      signature: 'lists:reverse(List1) -> List2',
      typesSpec: ['List1 = List2 = [T]', 'T = term()'],
      description: 'Reverses a list. O(n). Use this at the end of accumulator loops instead of appending to the tail on every step.',
      complexityNote: 'O(n) time, O(n) space. The accumulator pattern + lists:reverse is the canonical idiom.',
      officialUrl: 'https://www.erlang.org/doc/man/lists.html#reverse-1',
      githubSourceUrl: 'https://github.com/erlang/otp/blob/master/lib/stdlib/src/lists.erl',
    },
    {
      functionName: 'max',
      module: 'erlang',
      signature: 'erlang:max(Term1, Term2) -> Maximum',
      typesSpec: ['Term1 = Term2 = Maximum = term()'],
      description: 'Returns the largest of two terms. Use max(0, Stock - Qty) to floor stock at zero.',
      complexityNote: 'O(1). BIF — implemented as a single BEAM opcode.',
      officialUrl: 'https://www.erlang.org/doc/man/erlang.html#max-2',
    },
  ],
  astRules: {
    requireTailRecursion: ['process_order/2', 'calculate_order_total/2', 'restock/2'],
    forbiddenCalls: ['lists:sum', 'lists:map', 'lists:foldl', 'lists:filter'],
    forbiddenConstructs: ['list_comprehension'],
  },
  visibleTestCases: [
    {
      id: 'tc-1',
      title: 'process_order/2 deducts stock correctly',
      erlangCall: 'inventory:process_order(Inventory, Orders)',
      expectedOutput: '[{product,1,"Keyboard",50,8},\n {product,2,"Mouse",25,2},\n {product,3,"Monitor",200,2}]',
      explanation: 'Orders deduct from stock; Monitor stock floors at 0 (2 remaining since only 2 in stock).',
    },
    {
      id: 'tc-2',
      title: 'calculate_order_total/2 sums correctly',
      erlangCall: 'inventory:calculate_order_total(Inventory, Orders)',
      expectedOutput: '175',
      explanation: '2×50 + 3×25 + 0×200 (Monitor order exceeds stock, excluded) = 100+75 = 175.',
    },
    {
      id: 'tc-3',
      title: 'restock/2 adds quantities',
      erlangCall: 'inventory:restock(ProcessedInventory, [{1,5},{2,10}])',
      expectedOutput: '[{product,1,"Keyboard",50,13},\n {product,2,"Mouse",25,12},\n {product,3,"Monitor",200,2}]',
      explanation: 'Restocks Keyboard by 5 and Mouse by 10. Monitor unchanged.',
    },
  ],
  solutionExplanation:
    'The reference solution uses a two-layer accumulator pattern: the outer loop (process_order_loop) iterates over orders, and deduct_stock iterates over the inventory list building a new list with reversed accumulator. This gives O(n×m) time complexity with O(1) stack depth.',
  starterCode: `-module(inventory).
-export([process_order/2, calculate_order_total/2, restock/2]).

%% process_order(Inventory, Orders) -> UpdatedInventory
%% Deducts ordered quantities from stock. Stock floors at 0.
process_order(Inventory, Orders) ->
    %% TODO: Implement using tail-recursive accumulator loops
    Inventory.

%% calculate_order_total(Inventory, Orders) -> TotalPrice
%% Sums Price * Quantity for each fulfilled order (where stock >= qty).
calculate_order_total(_Inventory, _Orders) ->
    %% TODO: Implement using tail-recursive accumulator
    0.

%% restock(Inventory, Restocks) -> UpdatedInventory
%% Adds restock quantities to matching products.
restock(Inventory, _Restocks) ->
    %% TODO: Implement using tail-recursive accumulator
    Inventory.
`,
  solutionCode: `-module(inventory).
-export([process_order/2, calculate_order_total/2, restock/2]).

process_order(Inventory, Orders) ->
    process_order_loop(Orders, Inventory).

process_order_loop([], AccInv) -> AccInv;
process_order_loop([{order, ProdId, Qty} | Rest], AccInv) ->
    Updated = deduct_stock(AccInv, ProdId, Qty, []),
    process_order_loop(Rest, Updated).

deduct_stock([], _ProdId, _Qty, Acc) -> lists:reverse(Acc);
deduct_stock([{product, Id, Name, Price, Stock} | Rest], ProdId, Qty, Acc)
  when Id =:= ProdId ->
    NewStock = max(0, Stock - Qty),
    deduct_stock(Rest, ProdId, Qty, [{product, Id, Name, Price, NewStock} | Acc]);
deduct_stock([Prod | Rest], ProdId, Qty, Acc) ->
    deduct_stock(Rest, ProdId, Qty, [Prod | Acc]).

calculate_order_total(Inventory, Orders) ->
    calculate_order_total_loop(Orders, Inventory, 0).

calculate_order_total_loop([], _Inv, AccTotal) -> AccTotal;
calculate_order_total_loop([{order, ProdId, Qty} | Rest], Inv, AccTotal) ->
    case find_product(ProdId, Inv) of
        {ok, {product, _, _, Price, Stock}} when Stock >= Qty ->
            calculate_order_total_loop(Rest, Inv, AccTotal + Price * Qty);
        _ ->
            calculate_order_total_loop(Rest, Inv, AccTotal)
    end.

find_product(_ProdId, []) -> not_found;
find_product(ProdId, [{product, Id, _, _, _} = P | _]) when Id =:= ProdId -> {ok, P};
find_product(ProdId, [_ | Rest]) -> find_product(ProdId, Rest).

restock(Inventory, Restocks) -> restock_loop(Restocks, Inventory).

restock_loop([], AccInv) -> AccInv;
restock_loop([{ProdId, Qty} | Rest], AccInv) ->
    Updated = add_stock(AccInv, ProdId, Qty, []),
    restock_loop(Rest, Updated).

add_stock([], _ProdId, _Qty, Acc) -> lists:reverse(Acc);
add_stock([{product, Id, Name, Price, Stock} | Rest], ProdId, Qty, Acc)
  when Id =:= ProdId ->
    add_stock(Rest, ProdId, Qty, [{product, Id, Name, Price, Stock + Qty} | Acc]);
add_stock([Prod | Rest], ProdId, Qty, Acc) ->
    add_stock(Rest, ProdId, Qty, [Prod | Acc]).`,
};

export default function WorkspacePage() {
  const {
    activeView, setActiveView,
    runVerificationSuite,
    bootDevView,
    activeChapter,
    activeLesson,
    activeExerciseId,
    theme,
  } = useWorkspaceStore();

  // Apply theme class to <html> on mount and when theme changes
  useEffect(() => {
    const stored = localStorage.getItem('bf_theme');
    if (stored === 'dark') {
      useWorkspaceStore.setState({ theme: 'dark' });
      document.documentElement.classList.add('theme-dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    wsMux.connect();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Enter / Ctrl+Enter → Submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runVerificationSuite();
      }
      // Cmd+M / Ctrl+M → Toggle Curriculum Map
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setActiveView(activeView === 'curriculum_map' ? 'workspace' : 'curriculum_map');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runVerificationSuite, activeView, setActiveView]);

  // Determine which view to render in the workspace slot
  const renderWorkspaceContent = () => {
    // 1. Syllabus / Curriculum Map view takes top priority when selected
    if (activeView === 'curriculum_map' || bootDevView === 'syllabus') {
      return <CurriculumWorldMap />;
    }
    if (activeView === 'references') {
      return <ReferencesVaultView />;
    }

    // 2. Lesson view: Chapter 12 renders Capstone Studio, all others render LessonSplitView
    if (activeChapter === 12) {
      return <CapstoneStudioView />;
    }

    const currentLesson = 
      getLessonByChapterAndNum(activeChapter, activeLesson) ||
      getLessonById(activeExerciseId) ||
      DEMO_LESSON;
    return <LessonSplitView lesson={currentLesson} />;
  };

  return (
    <main className="flex h-screen w-screen overflow-hidden relative">
      {/* Boot.dev Top Bar (replaces TopSegmentedNav as primary navigation) */}
      <BootDevTopBar />

      {/* Main Content Area */}
      <div className="flex-1 h-full w-full overflow-hidden">
        {renderWorkspaceContent()}
      </div>

      {/* Legacy GlassWorkspace still accessible via inspector view */}
      {activeView === 'inspector' && (
        <div className="absolute inset-0 z-20 pt-14">
          <GlassWorkspace />
        </div>
      )}

      {/* Command Palette (Cmd+K) */}
      <CommandPalette />
    </main>
  );
}

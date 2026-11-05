'use client';

import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  FileCode,
  RotateCcw,
} from 'lucide-react';

const TAIL_RECURSIVE_CODE = `-module(inventory).
-export([process_order/2]).

%% Accumulator pattern: reuses stack frame in-place (O(1) memory)
process_order(Inventory, Orders) ->
    process_loop(Orders, Inventory).

process_loop([], AccInv) -> AccInv;
process_loop([{order, Id, Qty} | Rest], AccInv) ->
    Updated = deduct_stock(Id, Qty, AccInv),
    process_loop(Rest, Updated).  %% Tail call: no pending stack operations`;

const BODY_RECURSIVE_CODE = `-module(inventory).
-export([process_order/2]).

%% Body recursion: leaves pending work after call, growing stack O(n)
process_order([], _Orders) -> [];
process_order([Item | Rest], Orders) ->
    Updated = apply_order(Item, Orders),
    [Updated | process_order(Rest, Orders)].  %% Call NOT in tail position!`;

export function InteractiveHeroPreview() {
  const [mode, setMode] = useState<'tail' | 'body'>('tail');
  const [isRunning, setIsRunning] = useState(false);
  const [runCompleted, setRunCompleted] = useState(true);
  const [copied, setCopied] = useState(false);

  const isTail = mode === 'tail';

  const handleRun = () => {
    setIsRunning(true);
    setRunCompleted(false);
    setTimeout(() => {
      setIsRunning(false);
      setRunCompleted(true);
    }, 600);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(isTail ? TAIL_RECURSIVE_CODE : BODY_RECURSIVE_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl overflow-hidden backdrop-blur-2xl bg-white/70 dark:bg-slate-900/75 border border-white/80 dark:border-white/10 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.55)] transition-all duration-300">
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200/70 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/50 gap-2">
        {/* Left: Window Dots & File Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>

          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-800 hidden sm:block mx-1" />

          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
            <FileCode className="w-3.5 h-3.5 text-amber-500" />
            <span>src/inventory.erl</span>
          </div>
        </div>

        {/* Center/Right: Solution Mode Toggle */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-200/60 dark:bg-slate-800/70 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => {
                setMode('tail');
                setRunCompleted(true);
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                isTail
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tail-Recursive (Passes)
            </button>
            <button
              onClick={() => {
                setMode('body');
                setRunCompleted(true);
              }}
              className={`px-3 py-1 rounded-lg transition-all ${
                !isTail
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Body-Recursive (Fails)
            </button>
          </div>

          {/* Run Button */}
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="px-3 py-1 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-3 h-3 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-white" />
                <span>Run Test</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Editor Pane */}
      <div className="relative p-4 sm:p-6 font-mono text-xs leading-relaxed bg-white/40 dark:bg-slate-950/40 border-b border-slate-200/60 dark:border-slate-800/60 overflow-x-auto">
        <button
          onClick={handleCopy}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Copy Code"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        <pre className="text-slate-800 dark:text-slate-200">
          {isTail ? (
            <>
              <span className="text-violet-600 dark:text-violet-400">-module</span>(inventory).{'\n'}
              <span className="text-violet-600 dark:text-violet-400">-export</span>([process_order/2]).{'\n\n'}
              <span className="text-slate-400 dark:text-slate-500">%% Tail-recursive accumulator: constant O(1) stack memory</span>{'\n'}
              process_order(Inventory, Orders) -&gt;{'\n'}
              {'    '}process_loop(Orders, Inventory).{'\n\n'}
              process_loop([], AccInv) -&gt; AccInv;{'\n'}
              process_loop([&#123;order, Id, Qty&#125; | Rest], AccInv) -&gt;{'\n'}
              {'    '}Updated = deduct_stock(Id, Qty, AccInv),{'\n'}
              {'    '}
              <span className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-1 py-0.5 rounded font-bold">
                process_loop(Rest, Updated).
              </span>{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                %% ✓ Tail call in return position
              </span>
            </>
          ) : (
            <>
              <span className="text-violet-600 dark:text-violet-400">-module</span>(inventory).{'\n'}
              <span className="text-violet-600 dark:text-violet-400">-export</span>([process_order/2]).{'\n\n'}
              <span className="text-slate-400 dark:text-slate-500">%% Body-recursive: builds list after return, growing call stack O(n)</span>{'\n'}
              process_order([], _Orders) -&gt; [];{'\n'}
              process_order([Item | Rest], Orders) -&gt;{'\n'}
              {'    '}Updated = apply_order(Item, Orders),{'\n'}
              {'    '}
              <span className="bg-rose-500/20 text-rose-800 dark:text-rose-300 px-1 py-0.5 rounded font-bold underline decoration-rose-500">
                [Updated | process_order(Rest, Orders)].
              </span>{' '}
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                %% ✗ Call has pending list prepends
              </span>
            </>
          )}
        </pre>
      </div>

      {/* Terminal Output Strip */}
      <div className="p-4 sm:p-5 font-mono text-xs bg-slate-50/80 dark:bg-slate-950/70">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>Test Runner Output</span>
          <span className="text-slate-400 font-normal">Target: BEAM OTP 29</span>
        </div>

        {isRunning ? (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 py-1">
            <RotateCcw className="w-3.5 h-3.5 animate-spin text-amber-500" />
            <span>Compiling and verifying stack frames...</span>
          </div>
        ) : runCompleted ? (
          isTail ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>✓ Compiled cleanly: 0 warnings</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>✓ Deducted 3 order items from stock: PASS</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>✓ BEAM Stack Check: Tail call confirmed via <code className="font-bold">call_last</code> opcode (O(1) memory)</span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">SCORE: 100/100 · PASSED</span>
                <span className="text-[11px] text-slate-400">Time: 1.8ms</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>✓ Compiled cleanly: 0 warnings</span>
              </div>
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>✗ Stack Limit Audit: Body recursion allocates new call frame per item (O(n) growth)</span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 pl-6">
                Rule Check: Recursive functions iterating unbounded lists must use tail-call accumulators.
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                <span className="font-bold text-rose-600 dark:text-rose-400">VERDICT: FAILED (TCO Rule Violation)</span>
                <span className="text-[11px] text-slate-400">Time: 1.2ms</span>
              </div>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

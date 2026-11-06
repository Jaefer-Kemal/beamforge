'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  const [step, setStep] = useState<number>(4); // Starts completed so initial render shows working state
  const [hasRun, setHasRun] = useState(true);
  const [copied, setCopied] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const isTail = mode === 'tail';

  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  const runSequentialTest = () => {
    clearAllTimers();
    setIsRunning(true);
    setStep(0);

    // Step 1: Compiler pass (280ms)
    const t1 = setTimeout(() => {
      setStep(1);
    }, 280);

    // Step 2: Functional test cases (750ms)
    const t2 = setTimeout(() => {
      setStep(2);
    }, 750);

    // Step 3: BEAM bytecode disassembly audit (1250ms)
    const t3 = setTimeout(() => {
      setStep(3);
    }, 1250);

    // Step 4: Final verdict & re-arm button (1750ms)
    const t4 = setTimeout(() => {
      setStep(4);
      setIsRunning(false);
      setHasRun(true);
    }, 1750);

    timersRef.current = [t1, t2, t3, t4];
  };

  const handleTabSwitch = (newMode: 'tail' | 'body') => {
    if (newMode === mode && isRunning) return;
    setMode(newMode);
    clearAllTimers();
    setIsRunning(true);
    setStep(0);

    const t1 = setTimeout(() => setStep(1), 280);
    const t2 = setTimeout(() => setStep(2), 750);
    const t3 = setTimeout(() => setStep(3), 1250);
    const t4 = setTimeout(() => {
      setStep(4);
      setIsRunning(false);
      setHasRun(true);
    }, 1750);

    timersRef.current = [t1, t2, t3, t4];
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(isTail ? TAIL_RECURSIVE_CODE : BODY_RECURSIVE_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl overflow-hidden glass-floating glass-specular-rim backdrop-blur-3xl bg-white/45 dark:bg-slate-900/40 border border-white/60 dark:border-white/15 shadow-[0_28px_80px_rgba(15,23,42,0.12)] dark:shadow-[0_32px_100px_rgba(0,0,0,0.70)] transition-all duration-300">
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-b border-white/40 dark:border-white/10 bg-white/30 dark:bg-slate-950/40 backdrop-blur-xl gap-2">
        {/* Left: Window Dots & File Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          </div>

          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-800 hidden sm:block mx-1" />

          <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
            <FileCode className="w-3.5 h-3.5 text-amber-500" />
            <span>src/inventory.erl</span>
          </div>
        </div>

        {/* Center/Right: Solution Mode Toggle & Action Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-200/60 dark:bg-slate-800/70 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => handleTabSwitch('tail')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                isTail
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tail-Recursive (Passes)
            </button>
            <button
              onClick={() => handleTabSwitch('body')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                !isTail
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Body-Recursive (Fails)
            </button>
          </div>

          {/* Sequential Execution Button */}
          <button
            onClick={runSequentialTest}
            disabled={isRunning}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-60 cursor-pointer active:scale-95"
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Evaluating...</span>
              </>
            ) : hasRun ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 text-white" />
                <span>Rerun Test</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white text-white" />
                <span>Run Test</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Editor Pane */}
      <div className="relative p-4 sm:p-6 font-mono text-xs leading-relaxed bg-white/20 dark:bg-slate-950/40 backdrop-blur-md border-b border-white/30 dark:border-white/10 overflow-x-auto">
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

      {/* Terminal Output Strip: Sequential Step-by-Step Execution Feed */}
      <div className="p-4 sm:p-5 font-mono text-xs bg-white/25 dark:bg-slate-950/50 backdrop-blur-xl border-t border-white/30 dark:border-white/10">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Execution Pipeline</span>
            {isRunning && (
              <span className="inline-flex items-center gap-1.5 text-amber-500 font-semibold normal-case text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Evaluating Step {Math.min(step + 1, 3)} of 3...
              </span>
            )}
            {!isRunning && step >= 4 && (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold normal-case text-[11px]">
                {isTail ? 'All Invariants Verified' : '1 Invariant Failed'}
              </span>
            )}
          </div>
          <span className="text-slate-400 font-normal">Target: BEAM OTP 29 Live VM</span>
        </div>

        {/* Dynamic Sequential Output Feed */}
        <div className="space-y-2 min-h-[110px] flex flex-col justify-center">
          {step === 0 && isRunning && (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 py-2">
              <RotateCcw className="w-3.5 h-3.5 animate-spin text-amber-500" />
              <span>Initializing live OTP 29 process sandbox...</span>
            </div>
          )}

          {/* Step 1: Compiler */}
          {step >= 1 && (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 transition-all duration-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>
                <strong>Step 1:</strong> Compiled <code className="font-semibold text-slate-800 dark:text-slate-200">src/inventory.erl</code> via <code className="font-semibold">erlc</code> (0 warnings)
              </span>
            </div>
          )}

          {/* Step 2: Functional Assertions */}
          {step >= 2 && (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 transition-all duration-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>
                <strong>Step 2:</strong> Evaluated 3 test orders ➔ stock deducted correctly across all items
              </span>
            </div>
          )}

          {/* Step 3: BEAM Stack & Bytecode TCO Audit */}
          {step >= 3 && (
            isTail ? (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 transition-all duration-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>
                  <strong>Step 3:</strong> BEAM Disassembly Audit ➔ <code className="font-bold text-emerald-600 dark:text-emerald-300">call_last</code> opcode confirmed (constant O(1) stack memory)
                </span>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-rose-700 dark:text-rose-400 transition-all duration-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <div>
                  <span>
                    <strong>Step 3:</strong> BEAM Disassembly Audit ➔ <span className="font-bold">FAILED:</span> Line 13 allocates frame per item (O(n) stack growth)
                  </span>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Hint: Use accumulator <code className="text-amber-500 font-bold">process_loop(Rest, Updated)</code> to reuse stack frames.
                  </div>
                </div>
              </div>
            )
          )}

          {/* Step 4: Final Verdict Strip */}
          {step >= 4 && (
            <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs transition-all duration-300">
              {isTail ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                      SCORE: 100/100 · PASSED
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                      All BEAM invariants verified
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Duration: 1.8ms</span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/25">
                      VERDICT: FAILED (TCO Violation)
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                      Recursion stack grew with input size
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">Duration: 1.2ms</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

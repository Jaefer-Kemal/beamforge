'use client';

import React, { useState } from 'react';
import {
  Terminal,
  Cpu,
  GitCompare,
  Activity,
  CheckCircle2,
  Copy,
  Check,
  Zap,
  Play,
  RotateCcw,
} from 'lucide-react';

export function InteractiveHeroPreview() {
  const [activeTab, setActiveTab] = useState<'disasm' | 'diff' | 'telemetry'>('disasm');
  const [copied, setCopied] = useState(false);
  const [simulatedRun, setSimulatedRun] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runSimulation = () => {
    setSimulatedRun(true);
    setTimeout(() => setSimulatedRun(false), 2400);
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl overflow-hidden backdrop-blur-2xl bg-white/70 dark:bg-slate-900/75 border border-white/80 dark:border-white/10 shadow-[0_20px_60px_rgba(15,23,42,0.08)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.55)] transition-all duration-300">
      {/* Terminal Title Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200/70 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/50">
        {/* Window Dots & Tab Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>

          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-800 hidden sm:block mx-1" />

          {/* Interactive Mode Tabs */}
          <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/70 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('disasm')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'disasm'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Cpu className="w-3 h-3 text-violet-500" />
              <span>Bytecode Disassembler</span>
            </button>
            <button
              onClick={() => setActiveTab('diff')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'diff'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GitCompare className="w-3 h-3 text-sky-500" />
              <span>Token Term Diff</span>
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'telemetry'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Activity className="w-3 h-3 text-emerald-500" />
              <span>BEAM Telemetry</span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <button
            onClick={runSimulation}
            disabled={simulatedRun}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {simulatedRun ? (
              <>
                <RotateCcw className="w-3 h-3 animate-spin text-amber-500" />
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>Re-verify BEAM</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tab 1: Bytecode Disassembly & AST Verifier */}
      {activeTab === 'disasm' && (
        <div className="p-4 sm:p-6 font-mono text-xs leading-relaxed overflow-x-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-4 border-b border-slate-200/60 dark:border-slate-800/60 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-violet-600 dark:text-violet-400 font-semibold">
                bf_ast_verifier:verify_tco(inventory, process_order, 2)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                O(1) STACK VERIFIED
              </span>
            </div>
            <button
              onClick={() =>
                handleCopy(
                  `{function, process_order_loop, 2, 5}.\n  {label, 4}.\n  {test, is_nonempty_list, {f, 6}, [{x, 0}]}.\n  {get_list, {x, 0}, {x, 2}, {x, 0}}.\n  %% call_last reuses the stack frame in-place:\n  {call_last, 2, {f, 5}, 2}.`
                )
              }
              className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Copy Bytecode"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Erlang Source */}
            <div className="rounded-xl p-3.5 bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                1. Learner Erlang Source
              </div>
              <pre className="text-slate-800 dark:text-slate-200">
                <span className="text-violet-600 dark:text-violet-400">process_order_loop</span>
                ([], Acc) -&gt; lists:<span className="text-sky-600 dark:text-sky-400">reverse</span>(Acc);{'\n'}
                <span className="text-violet-600 dark:text-violet-400">process_order_loop</span>
                ([Order | Rest], Acc) -&gt;{'\n'}
                {'  '}Updated = deduct_stock(Order, Acc),{'\n'}
                {'  '}
                <span className="bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded font-bold">
                  process_order_loop(Rest, Updated).
                </span>{' '}
                <span className="text-slate-400 dark:text-slate-500">%% Tail call</span>
              </pre>
            </div>

            {/* BEAM Disassembly */}
            <div className="rounded-xl p-3.5 bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                2. beam_disasm:file(&quot;inventory.beam&quot;)
              </div>
              <pre className="text-slate-700 dark:text-slate-300">
                {`{function, process_order_loop, 2, 5}.
  {label, 4}.
  {test, is_nonempty_list, {f, 6}, [{x, 0}]}.
  {get_list, {x, 0}, {x, 2}, {x, 0}}.
  `}
                <span className="bg-amber-500/20 dark:bg-amber-500/30 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded font-bold">
                  &#123;call_last, 2, &#123;f, 5&#125;, 2&#125;.
                </span>{' '}
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  ✓ Reuses Frame
                </span>
                {`
  {label, 6}.
  {call_ext_only, 1, {extfunc, lists, reverse, 1}}.`}
              </pre>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/30 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-[11px]">
              <strong>BEAM Stack Audit Passed:</strong> Function operates at $O(1)$ stack depth.
              Body-recursion allocating new call frames was successfully eliminated.
            </span>
          </div>
        </div>
      )}

      {/* Tab 2: Token-Level Term Diff */}
      {activeTab === 'diff' && (
        <div className="p-4 sm:p-6 font-mono text-xs leading-relaxed">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="text-sky-600 dark:text-sky-400 font-semibold">
                Test Case #2: calculate_order_total(Inv, Orders)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                ATOM MISMATCH DETECTED
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Duration: 1.2ms</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expected Term */}
            <div className="rounded-xl p-3.5 bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                Expected OTP Return Term
              </div>
              <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {`{ok, #{
  total_cents => 17500,
  status => `}
                <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded font-bold">
                  fulfilled
                </span>
                {`,
  items_processed => 3
}}`}
              </pre>
            </div>

            {/* Actual Term */}
            <div className="rounded-xl p-3.5 bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-2">
                Actual Learner Return Term
              </div>
              <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                {`{ok, #{
  total_cents => 17500,
  status => `}
                <span className="bg-rose-500/25 text-rose-700 dark:text-rose-300 px-1 py-0.5 rounded font-bold underline decoration-rose-500">
                  pending
                </span>
                {`,
  items_processed => 3
}}`}
              </pre>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300">
            <span className="text-[11px]">
              Mismatched atom at key <code className="text-amber-500 font-bold">status</code>: expected{' '}
              <code className="text-emerald-500 font-bold">fulfilled</code>, got{' '}
              <code className="text-rose-500 font-bold">pending</code>.
            </span>
            <button
              onClick={() => handleCopy('inventory:calculate_order_total(Inv, Orders).')}
              className="px-2 py-1 rounded text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 shrink-0"
            >
              <Copy className="w-3 h-3" />
              <span>Copy Call</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: BEAM Telemetry */}
      {activeTab === 'telemetry' && (
        <div className="p-4 sm:p-6 font-mono text-xs leading-relaxed">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                OTP 29 Process Introspection (PID: &lt;0.142.0&gt;)
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                NINE-NINES READY
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Node: beamforge@127.0.0.1</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Peak Stack Depth
              </div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">48 words</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Constant O(1) TCO</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Private Heap
              </div>
              <div className="text-lg font-bold text-sky-600 dark:text-sky-400">10,958 words</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Isolated GC per process</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Reductions Slice
              </div>
              <div className="text-lg font-bold text-violet-600 dark:text-violet-400">4,000 / tick</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Preemptive scheduler</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800/60">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Sub-Binary Safety
              </div>
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">Zero Leaks</div>
              <div className="text-[10px] text-slate-500 mt-0.5">ProcBin refc unpinned</div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-sky-500/10 dark:bg-sky-950/30 border border-sky-500/20 text-sky-800 dark:text-sky-300 flex items-center gap-2">
            <Zap className="w-4 h-4 text-sky-500 shrink-0" />
            <span className="text-[11px]">
              Every user submission in BeamForge is executed inside an ephemeral OTP 29 process
              sandbox with live runtime telemetry.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

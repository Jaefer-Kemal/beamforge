'use client';

import React from 'react';
import { Cpu, ShieldCheck, Zap, Flame, Check, X } from 'lucide-react';

const COMPARISON_ROWS = [
  {
    dimension: 'Concurrency Model',
    traditional: 'OS Threads or Cooperative Event Loops (Node, Go, Java)',
    beam: 'Share-Nothing Actor Model with Isolated Private Heaps',
    whyItMatters: 'No mutexes, no deadlocks, and zero data races by mathematical guarantee.',
  },
  {
    dimension: 'CPU Scheduling & Preemption',
    traditional: 'Cooperative tasks can starve the CPU with tight loops',
    beam: 'Preemptive reduction-based scheduler (4,000 ops / timeslice)',
    whyItMatters: 'One rogue request can never freeze or degrade other users on the node.',
  },
  {
    dimension: 'Fault Isolation & Resilience',
    traditional: 'Defensive try/catch; uncaught exception can crash the entire server',
    beam: '"Let It Crash" with OTP Supervision Trees (rest_for_one)',
    whyItMatters: 'Crashes are contained to a single sub-millisecond process and restarted cleanly.',
  },
  {
    dimension: 'Garbage Collection Impact',
    traditional: 'Global Stop-The-World GC pauses causing latency spikes',
    beam: 'Per-process generational GC + instant O(1) heap release on exit',
    whyItMatters: 'Deterministic, sub-millisecond p99 latency under heavy load.',
  },
  {
    dimension: 'Iteration & Stack Discipline',
    traditional: 'Imperative loops or recursion with stack overflow risks',
    beam: 'Strict Tail-Call Optimization (call_last bytecode opcodes)',
    whyItMatters: 'Recursive processes loop forever using constant O(1) stack memory.',
  },
];

export function LandingArchitectureComparison() {
  return (
    <section id="why-beam" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-16 sm:py-24">
      <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 mb-4">
          <Cpu className="w-3.5 h-3.5" />
          <span>Under the Hood</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
          Why Master the{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-amber-500">
            BEAM Virtual Machine?
          </span>
        </h2>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
          The BEAM runtime was purpose-built from day one for continuous uptime and massive
          concurrency. See how its primitives differ from imperative runtimes.
        </p>
      </div>

      {/* Comparison Table / Glass Card */}
      <div className="rounded-3xl overflow-hidden backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 border border-white/80 dark:border-white/10 shadow-[0_12px_40px_rgba(15,23,42,0.06)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.45)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/50">
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-1/4">
                  Architectural Vector
                </th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 w-1/3">
                  Traditional Runtimes
                </th>
                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 w-1/3 bg-amber-500/5">
                  The BEAM / Erlang / OTP
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs sm:text-sm">
              {COMPARISON_ROWS.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-4 px-6 font-bold text-slate-900 dark:text-white align-top">
                    {row.dimension}
                    <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400 mt-1">
                      {row.whyItMatters}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-600 dark:text-slate-300 align-top">
                    <div className="flex items-start gap-2">
                      <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{row.traditional}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-900 dark:text-white font-medium align-top bg-amber-500/5">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{row.beam}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

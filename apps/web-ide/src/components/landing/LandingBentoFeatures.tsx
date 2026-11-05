'use client';

import React from 'react';
import Link from 'next/link';
import {
  Code2,
  Cpu,
  GitCompare,
  Terminal,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';

export function LandingBentoFeatures() {
  return (
    <section id="features" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-16 sm:py-24">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Pedagogical Ergonomics</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
          Engineered for Deep{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-sky-500">
            Systems Internalization
          </span>
        </h2>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
          Most coding platforms rely on superficial syntax drills. BeamForge trains you in the
          concurrency, protocol framing, and fault-isolation mental models required by production OTP engines.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1 (Span 2): Zero Multiple-Choice Trivia */}
        <div className="md:col-span-2 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 border border-white/80 dark:border-white/10 shadow-[0_8px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-600 dark:text-amber-400">
                Core Philosophy
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Zero Multiple-Choice Trivia
              </h3>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            Every single lesson in BeamForge requires writing executable Erlang code. Your solution is
            compiled with <code className="text-amber-500 font-mono">erlc</code> and evaluated against
            real OTP test suites. No multiple-choice guessing games masquerading as education.
          </p>
          <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 font-mono text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase font-bold mb-2">
              <span>Dual-Engine Grading</span>
              <span className="text-emerald-500 font-semibold">Live Sandbox</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold">
                ▷ Run
              </span>
              <span className="text-slate-400">➔ Instant feedback &amp; console IO</span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white font-semibold shadow-sm">
                ▶ Submit
              </span>
              <span className="text-slate-400">➔ AST rules + TCO opcode check + Edge suites</span>
            </div>
          </div>
        </div>

        {/* Card 2 (Span 2): Native Bytecode & AST Verifier */}
        <div className="md:col-span-2 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 border border-white/80 dark:border-white/10 shadow-[0_8px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-violet-600 dark:text-violet-400">
                Compiler Analysis
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Bytecode Disassembler &amp; AST Verifier
              </h3>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            BeamForge’s grader uses native <code className="text-violet-500 font-mono">beam_disasm</code> to inspect
            the compiled bytecode, ensuring you use tail calls (<code className="text-emerald-500 font-mono">call_last</code>)
            rather than body recursion. It blocks forbidden shortcuts to guarantee you build true algorithmic muscle.
          </p>
          <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800/80 font-mono text-xs">
            <div className="flex items-center justify-between text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
              <span>✓ Tail Recursion: Verified via BEAM opcode</span>
              <span>O(1) Stack</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-sky-600 dark:text-sky-400 font-semibold">
              <span>✓ Forbidden Remote Calls: lists:sum/1 banned</span>
              <span>Accumulator Enforced</span>
            </div>
          </div>
        </div>

        {/* Card 3 (Span 2): Token-Level Term Diffs */}
        <div className="md:col-span-2 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 border border-white/80 dark:border-white/10 shadow-[0_8px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-2xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-sky-600 dark:text-sky-400">
                Visual Inspection
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Token-Level Erlang Term Diffs
              </h3>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            No more hunting through cryptic 50-line tuple printouts. BeamForge parses expected and
            actual terms, highlighting mismatched atoms, tuples, lists, or binaries down to the individual token.
          </p>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 group-hover:translate-x-1 transition-transform">
            <span>Features one-click Copy Call reproduction</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 4 (Span 2): Production Incident Triage Labs */}
        <div className="md:col-span-2 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl bg-white/70 dark:bg-slate-900/70 border border-white/80 dark:border-white/10 shadow-[0_8px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)] relative overflow-hidden group">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-rose-600 dark:text-rose-400">
                On-Call Simulation
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Incident Triage Labs
              </h3>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            Step into the shoes of an on-call distributed systems engineer. Seven dedicated labs
            simulate production disasters: unbounded mailbox floods, supervisor restart storms,
            and ETS heir transfer failures.
          </p>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 group-hover:translate-x-1 transition-transform">
            <span>Practice &apos;Let It Crash&apos; diagnostics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Card 5 (Span 4): Final Capstone Studio */}
        <div id="capstone" className="col-span-1 md:col-span-3 lg:col-span-4 rounded-3xl p-6 sm:p-10 backdrop-blur-2xl bg-gradient-to-br from-amber-500/10 via-sky-500/10 to-violet-500/10 dark:from-amber-950/20 dark:via-sky-950/20 dark:to-violet-950/20 border border-white/80 dark:border-white/10 shadow-[0_12px_40px_rgba(15,23,42,0.08)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 mb-3">
                <Layers className="w-3.5 h-3.5 text-amber-500" />
                <span>Chapter 12 Capstone Project</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3">
                Build a Production 5-Node XMPP Chat Server
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Tie every concept together. In our dedicated multi-file Capstone Studio, you will
                build <code className="text-amber-500 font-mono">xmpp_sup</code>,{' '}
                <code className="text-sky-500 font-mono">xmpp_stream_parser</code>,{' '}
                <code className="text-emerald-500 font-mono">xmpp_session_registry</code>,{' '}
                <code className="text-violet-500 font-mono">xmpp_c2s_statem</code>, and{' '}
                <code className="text-rose-500 font-mono">xmpp_router</code>. Complete with live BEAM
                supervision tree visualizers and real XML stanza wire streams.
              </p>
            </div>
            <Link
              href="/learn/ch12-m01"
              className="px-6 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md transition-all hover:scale-105 active:scale-95 shrink-0 flex items-center gap-2"
            >
              <span>Preview Capstone Studio</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

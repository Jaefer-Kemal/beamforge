'use client';

import React from 'react';
import { BookOpen, Code2, Layers, Cpu, ShieldCheck, Flame } from 'lucide-react';

const METRICS = [
  {
    icon: BookOpen,
    color: 'text-sky-500',
    value: '12',
    label: 'Production Chapters',
    desc: 'From functional syntax to raw TCP',
  },
  {
    icon: Code2,
    color: 'text-amber-500',
    value: '68',
    label: 'Executable Lessons',
    desc: '100% code, zero trivia quizzes',
  },
  {
    icon: Layers,
    color: 'text-emerald-500',
    value: '5',
    label: 'Thematic Worlds',
    desc: 'Structured progressive curriculum',
  },
  {
    icon: Cpu,
    color: 'text-violet-500',
    value: 'O(1)',
    label: 'TCO Bytecode Grader',
    desc: 'Automated beam_disasm analysis',
  },
  {
    icon: ShieldCheck,
    color: 'text-rose-500',
    value: '5-Node',
    label: 'Production XMPP Engine',
    desc: 'Full-stack milestone capstone',
  },
  {
    icon: Flame,
    color: 'text-amber-600',
    value: '99.9999999%',
    label: 'Telecom "Nine Nines"',
    desc: 'Fault-isolated actor supervision',
  },
];

export function LandingMetricsStrip() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-8 sm:py-12">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {METRICS.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div
              key={idx}
              className="p-4 sm:p-5 rounded-2xl backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-white/10 shadow-[0_4px_20px_rgba(15,23,42,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:scale-[1.02] transition-transform duration-200"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${metric.color}`} />
                <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {metric.value}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                {metric.label}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {metric.desc}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

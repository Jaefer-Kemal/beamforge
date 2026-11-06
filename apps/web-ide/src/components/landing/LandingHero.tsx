'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Compass,
  Zap,
  ShieldCheck,
  Cpu,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { InteractiveHeroPreview } from './InteractiveHeroPreview';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';

export function LandingHero() {
  const { activeExerciseId } = useWorkspaceStore();
  const [lastLessonId, setLastLessonId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('beamforge_active_exercise');
      if (stored && stored !== 'ch01-l01') {
        setLastLessonId(stored);
      } else if (activeExerciseId && activeExerciseId !== 'ch01-l01') {
        setLastLessonId(activeExerciseId);
      }
    } catch {}
  }, [activeExerciseId]);

  return (
    <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* 2026 Liquid Glass Refraction SVG Filter Definition */}
      <svg width="0" height="0" className="absolute pointer-events-none opacity-0" aria-hidden="true">
        <filter id="beam-liquid-glass">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="5" result="noise">
            <animate attributeName="baseFrequency" dur="20s" values="0.008 0.012;0.012 0.008;0.008 0.012" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {/* Dynamic Luminous Ambient Aurora Backing */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] sm:w-[1000px] sm:h-[500px] bg-gradient-to-tr from-amber-500/20 via-sky-400/25 to-violet-600/20 blur-[130px] rounded-full pointer-events-none -z-10 animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute top-2/3 left-1/4 -translate-x-1/2 w-[450px] h-[300px] bg-emerald-500/15 blur-[110px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-2/3 right-1/4 translate-x-1/2 w-[450px] h-[300px] bg-pink-500/12 blur-[110px] rounded-full pointer-events-none -z-10" />

      <div className="text-center max-w-4xl mx-auto">
        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
          Master High-Throughput{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-sky-500 to-violet-500">
            Distributed Systems
          </span>{' '}
          from First Principles.
        </h1>

        {/* Sub-headline */}
        <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
          The deliberate-practice training platform for Erlang/OTP. Build actor systems,
          resilient supervision trees, and raw TCP protocols verified in real time by native
          BEAM bytecode analyzers.
        </p>

        {/* Returning Learner Banner */}
        {lastLessonId && (
          <div className="mb-6 inline-flex">
            <Link
              href={`/learn/${lastLessonId}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 transition-all shadow-sm group"
            >
              <Zap className="w-4 h-4 text-emerald-500" />
              <span>Welcome back! Resume where you left off: <strong>{lastLessonId}</strong></span>
              <ChevronRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14 sm:mb-20">
          <Link
            href="/learn/ch01-l01"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-[0_8px_24px_rgba(245,158,11,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98] border border-amber-300/30"
          >
            <span>Start Chapter 1 Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/syllabus"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-800/70 hover:bg-white/90 dark:hover:bg-slate-700/80 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-[0_4px_16px_rgba(15,23,42,0.06)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)] transition-all hover:scale-[1.01]"
          >
            <Compass className="w-4 h-4 text-sky-500" />
            <span>Explore 5-World Syllabus</span>
          </Link>
        </div>
      </div>

      {/* Interactive Anchor Terminal with 2026 Liquid Glass Optic Aura */}
      <div className="relative">
        <div
          className="absolute inset-0 rounded-3xl pointer-events-none -z-10 glass-liquid opacity-25 dark:opacity-15 blur-[1px]"
          aria-hidden="true"
        />
        <InteractiveHeroPreview />
      </div>
    </section>
  );
}


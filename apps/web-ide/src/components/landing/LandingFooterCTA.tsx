'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, ShieldCheck, Heart, Github, ExternalLink } from 'lucide-react';
import { BeamForgeLogo } from '../navigation/BeamForgeLogo';

export function LandingFooterCTA() {
  return (
    <footer className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-12 pb-16">
      {/* High-Impact Glass CTA Card */}
      <div className="rounded-3xl p-8 sm:p-14 backdrop-blur-2xl bg-gradient-to-br from-amber-500/15 via-sky-500/10 to-violet-500/15 dark:from-amber-950/30 dark:via-sky-950/20 dark:to-violet-950/30 border border-white/80 dark:border-white/10 shadow-[0_16px_50px_rgba(15,23,42,0.08)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5)] text-center relative overflow-hidden mb-16">
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-sm mb-6 text-slate-700 dark:text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>100% In-Browser · Instant Verification · Zero Setup</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight mb-4">
            Ready to Build Systems That{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-rose-500 to-violet-500">
              Never Go Down?
            </span>
          </h2>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed mb-8">
            Experience the actor model, supervise crashed processes, and build a production
            XMPP chat engine directly in your browser.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/learn/ch01-l01"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-[0_8px_24px_rgba(245,158,11,0.35)] transition-all hover:scale-105 active:scale-95 border border-amber-300/30"
            >
              <span>Start Chapter 1 Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/syllabus"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-800/70 hover:bg-white/90 dark:hover:bg-slate-700/80 backdrop-blur-xl border border-white/80 dark:border-white/10 shadow-sm transition-all"
            >
              <Compass className="w-4 h-4 text-sky-500" />
              <span>Browse All 68 Lessons</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Navigation & Credits */}
      <div className="pt-8 border-t border-slate-200/70 dark:border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <BeamForgeLogo className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-200 text-sm">
            BeamForge
          </span>
          <span>© {new Date().getFullYear()} · MIT Licensed</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <Link href="/syllabus" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Syllabus
          </Link>
          <a
            href="https://www.erlang.org/doc/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-900 dark:hover:text-white transition-colors inline-flex items-center gap-1"
          >
            <span>Erlang/OTP Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href="https://github.com/Jaefer-Kemal/beamforge"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-900 dark:hover:text-white transition-colors inline-flex items-center gap-1"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </footer>
  );
}


'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  ArrowRight,
  Code2,
  Cpu,
  Layers,
  Network,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

interface WorldItem {
  id: string;
  worldNumber: number;
  title: string;
  themeColor: string;
  borderGlow: string;
  badgeBg: string;
  badgeText: string;
  icon: React.ElementType;
  chaptersRange: string;
  lessonCount: string;
  summary: string;
  keyConcepts: string[];
  firstLessonId: string;
}

const WORLDS: WorldItem[] = [
  {
    id: 'world-1',
    worldNumber: 1,
    title: 'The Functional Core & Term Anatomy',
    themeColor: 'from-cyan-500/20 to-sky-500/20',
    borderGlow: 'hover:border-sky-400/50',
    badgeBg: 'bg-sky-500/15',
    badgeText: 'text-sky-600 dark:text-sky-400 border-sky-500/25',
    icon: Code2,
    chaptersRange: 'Chapters 1 – 4',
    lessonCount: '23 Lessons',
    summary:
      'Immutability, pattern matching, guard sequences, tail-recursion accumulators, binary bitstrings, and sub-binary leak prevention.',
    keyConcepts: [
      'Single assignment variables & pattern matches',
      'Body recursion vs O(1) TCO on BEAM stack',
      'Inventory order processor (inventory.erl)',
      'Binary packet framing & ProcBin refc leaks',
    ],
    firstLessonId: 'ch01-l01',
  },
  {
    id: 'world-2',
    worldNumber: 2,
    title: 'The Actor Model & "Let It Crash"',
    themeColor: 'from-emerald-500/20 to-teal-500/20',
    borderGlow: 'hover:border-emerald-400/50',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    icon: Cpu,
    chaptersRange: 'Chapters 5 – 6',
    lessonCount: '12 Lessons',
    summary:
      'Lightweight BEAM processes, asynchronous mailboxes, selective receive, links vs monitors, exit traps, and fault-tolerant actor loops.',
    keyConcepts: [
      '10,000 concurrent processes vs OS threads',
      'Selective receive & Mailbox save queues',
      'Cascading links vs unidirectional monitors',
      'Building my_gen_server from raw primitives',
    ],
    firstLessonId: 'ch05-l01',
  },
  {
    id: 'world-3',
    worldNumber: 3,
    title: 'Production OTP Architecture',
    themeColor: 'from-violet-500/20 to-purple-500/20',
    borderGlow: 'hover:border-violet-400/50',
    badgeBg: 'bg-violet-500/15',
    badgeText: 'text-violet-600 dark:text-violet-400 border-violet-500/25',
    icon: Layers,
    chaptersRange: 'Chapters 7 – 9',
    lessonCount: '18 Lessons',
    summary:
      'Standard OTP behaviours, non-blocking gen_server, gen_statem protocol state machines, supervision restart strategies, and ETS heir handshakes.',
    keyConcepts: [
      'gen_server call/cast & handle_continue',
      'Supervision: one_for_one vs rest_for_one',
      'ETS table heir resilience across crashes',
      'Distributed nodes & netsplit isolation',
    ],
    firstLessonId: 'ch07-l01',
  },
  {
    id: 'world-4',
    worldNumber: 4,
    title: 'Raw TCP & Protocol Engineering',
    themeColor: 'from-amber-500/20 to-orange-500/20',
    borderGlow: 'hover:border-amber-400/50',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-600 dark:text-amber-400 border-amber-500/25',
    icon: Network,
    chaptersRange: 'Chapters 10 – 11',
    lessonCount: '10 Lessons',
    summary:
      'Raw gen_tcp sockets, {active, once} backpressure, high-concurrency acceptor pools, RFC 7622 JID parsing, and incremental XML stream framing.',
    keyConcepts: [
      'Raw gen_tcp sockets & socket handoff',
      '{active, once} backpressure flow control',
      'RFC 7622 Jabber ID parser & validator',
      'TCP packet fragmentation & coalescing',
    ],
    firstLessonId: 'ch10-l01',
  },
  {
    id: 'world-5',
    worldNumber: 5,
    title: 'The Distributed XMPP Capstone Engine',
    themeColor: 'from-rose-500/20 to-pink-500/20',
    borderGlow: 'hover:border-rose-400/50',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-600 dark:text-rose-400 border-rose-500/25',
    icon: ShieldCheck,
    chaptersRange: 'Chapter 12',
    lessonCount: '5 Milestones',
    summary:
      'The ultimate synthesis: Crafting a complete 5-module production XMPP chat server under a rest_for_one root supervisor.',
    keyConcepts: [
      'Root rest_for_one supervisor (xmpp_sup)',
      'Incremental XML parser (xmpp_stream_parser)',
      'ETS registry with process monitors',
      '4-state C2S connection FSM & Stanza router',
    ],
    firstLessonId: 'ch12-m01',
  },
];

export function LandingWorldsSection() {
  const [selectedWorld, setSelectedWorld] = useState<WorldItem>(WORLDS[0]);

  return (
    <section id="worlds" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-16 sm:py-24">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 sm:mb-16 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-3">
            <Compass className="w-3.5 h-3.5" />
            <span>Mastery Roadmap</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            The 5 Thematic Worlds
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-2 max-w-xl">
            A step-by-step path designed to guide you from core functional foundations to
            high-throughput network protocol engineering.
          </p>
        </div>

        <Link
          href="/syllabus"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-800/70 hover:bg-white/90 dark:hover:bg-slate-700/80 border border-white/80 dark:border-white/10 shadow-sm transition-all"
        >
          <span>View Interactive Map</span>
          <ArrowRight className="w-3.5 h-3.5 text-amber-500" />
        </Link>
      </div>

      {/* 5-World Horizontal Carousel / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {WORLDS.map((world) => {
          const Icon = world.icon;
          const isSelected = selectedWorld.id === world.id;

          return (
            <div
              key={world.id}
              onClick={() => setSelectedWorld(world)}
              className={`cursor-pointer rounded-3xl p-5 sm:p-6 backdrop-blur-2xl transition-all duration-300 flex flex-col justify-between ${
                isSelected
                  ? 'bg-white/90 dark:bg-slate-900/95 shadow-[0_12px_36px_rgba(15,23,42,0.1)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] border-2 border-amber-400/60 dark:border-amber-400/50 scale-[1.02]'
                  : 'bg-white/65 dark:bg-slate-900/65 hover:bg-white/80 dark:hover:bg-slate-800/80 border border-white/80 dark:border-white/10 shadow-[0_4px_20px_rgba(15,23,42,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`p-2.5 rounded-2xl bg-gradient-to-br ${world.themeColor} border border-white/40 dark:border-white/10`}
                  >
                    <Icon className="w-5 h-5 text-slate-800 dark:text-white" />
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${world.badgeBg} ${world.badgeText}`}
                  >
                    World {world.worldNumber}
                  </span>
                </div>

                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  {world.chaptersRange} · {world.lessonCount}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug mb-3">
                  {world.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4 line-clamp-3">
                  {world.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Link
                  href={`/learn/${world.firstLessonId}`}
                  className="hover:text-amber-500 transition-colors flex items-center gap-1"
                >
                  <span>Start World</span>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                </Link>
                <span className="text-[11px] text-slate-400">
                  {world.worldNumber === 5 ? 'Capstone' : 'Core'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected World Focus Detail Banner */}
      <div className="mt-8 p-6 sm:p-8 rounded-3xl backdrop-blur-2xl bg-white/75 dark:bg-slate-900/75 border border-white/80 dark:border-white/10 shadow-[0_8px_32px_rgba(15,23,42,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">
              Curriculum Deep Dive
            </div>
            <h4 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
              World {selectedWorld.worldNumber}: {selectedWorld.title}
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              {selectedWorld.summary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedWorld.keyConcepts.map((concept, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{concept}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3 w-full sm:w-auto">
            <Link
              href={`/learn/${selectedWorld.firstLessonId}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <span>Begin World {selectedWorld.worldNumber}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}


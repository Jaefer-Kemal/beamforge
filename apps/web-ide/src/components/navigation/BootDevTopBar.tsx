'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Zap,
  BookOpen,
  Compass,
  AlertTriangle,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sun,
  Moon,
  CheckCircle2,
  Flame,
  RotateCcw,
  Trophy,
  Settings,
  ShieldAlert,
  Trash2,
  Lock,
} from 'lucide-react';
import { BeamForgeLogo } from './BeamForgeLogo';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { ALL_CURRICULUM_CHAPTERS } from '../../data/curriculumCatalog';
import { DEFAULT_USERS, UserProfile } from '../../types/user';
import { LeaderboardDrawer } from '../workspace/LeaderboardDrawer';
import { ResetAccountModal } from './ResetAccountModal';
import { PrerequisiteModal } from '../workspace/PrerequisiteModal';

// ── Chapter metadata for the 12-chapter curriculum ──────────────────────────
export const CHAPTERS = [
  { num: 1, title: 'Functional Foundations' },
  { num: 2, title: 'Control Flow, Guards & Tail Recursion' },
  { num: 3, title: 'Higher-Order Functions' },
  { num: 4, title: 'Maps, Records & Binary Parsing' },
  { num: 5, title: 'Concurrency & Actor Model' },
  { num: 6, title: 'Links, Monitors & my_gen_server' },
  { num: 7, title: 'OTP gen_server & gen_statem' },
  { num: 8, title: 'Supervision Trees & OTP Releases' },
  { num: 9, title: 'ETS, Mnesia & Distributed State' },
  { num: 10, title: 'Raw TCP Backends & Acceptor Pools' },
  { num: 11, title: 'Guided XMPP Protocol Deep Dive' },
  { num: 12, title: 'Final XMPP Server Capstone' },
];

// 8 lessons in Ch. 1, expandable across curriculum
export const LESSONS_PER_CHAPTER: Record<number, string[]> = {
  1: [
    'Welcome to Erlang, The BEAM VM & Expression Syntax',
    "Numbers, Booleans & Erlang's Comparison Operators",
    'Variables, Single Assignment & The = Pattern Match Operator',
    'Atoms & Tuples: Modeling Structured Telecom Events',
    'Lists, Cons Cells [H | T] & Character Codepoints',
    'Modules, Exports, Function Arity & Compile-Time Macros',
    'Multi-Clause Functions & The Punctuation Triad (, ; .)',
    'Problem Set: Telecom CDR Packet Classifier & Billing Engine',
  ],
  2: [
    'Deep Pattern Matching & Simultaneous Aliasing',
    'Guard Clauses (when) & Silent Guard Failure',
    'Branching Inside Bodies: case...of vs if...end',
    'Thinking Recursively (Part 1): Searching Lists of Tuples',
    'Body Recursion vs Tail-Call Optimization (TCO)',
    'The List Accumulator Pattern & lists:reverse/1',
    'Thinking Recursively (Part 2): Updating Tuples & Dual Accumulators',
    'Problem Set: Real-World Inventory Order Processor',
  ],
  3: [
    'First-Class Functions: Anonymous Closures & Captures',
    'Transforming & Filtering Collections (lists:map, filter, filtermap)',
    'Boolean Predicates & Single-Pass Partitioning (lists:all, any, partition)',
    'Folding & State Aggregation (lists:foldl vs lists:foldr)',
    'Keyed Tuple Lists (lists:keyfind, keystore) & proplists',
    'List Comprehensions, Pattern Filtering & Joins',
    'Problem Set: Refactoring Inventory Analytics & SLA Log Aggregator',
  ],
  4: [
    'Maps (#{}): Association (=>), Exact Matching (:=) & Internal Engines',
    'The maps Standard Library (get/3, find/2, update_with/4, merge/2, fold/3)',
    'Records (-record): Compile-Time Tuple Sugar & #rec.field Indices',
    'Binaries (<<...>>) vs CharLists, UTF-8 & Zero-Copy IOLists',
    'Bit Syntax (<<Val:Size/Specs>>): Protocol Packing & Endianness',
    'Binary Scanning (binary:split, match) & Binary Comprehensions',
    'Under the Hood: ProcBin Binaries & Sub-Binary Memory Safety (binary:copy)',
    'Problem Set: Binary Network Packet & TLV Frame Parser',
  ],
  5: [
    'Lightweight BEAM Processes vs OS Threads',
    'Spawning, PIDs & Asynchronous Send (!)',
    'Selective receive & Mailbox Timeouts',
    'Maintaining State with Actor Loops',
    'Process Registry & make_ref() Correlation',
    'Assignment: Concurrent Bank Ledger & Order Actor',
    'Incident #101: Unbounded Mailbox Memory Leak',
  ],
  6: [
    'Sequential Exceptions: throw, error, exit & Pattern Matching try...catch',
    'Safe Operations & Return Values ({ok, Val} | {error, Reason}) vs. Exceptions',
    'Guaranteed Resource Cleanup with try...of...catch...after & Boundary Deserialization',
    'Bidirectional Process Links (link/1, spawn_link/1) & Normal vs. Abnormal Exit Signals',
    'Trapping Exits (process_flag(trap_exit, true)), The Exit Signal Truth Table & Untrappable kill',
    'Unidirectional Monitors (erlang:monitor/2, spawn_monitor/1), \'DOWN\' Messages & The noproc Invariant',
    'Race Conditions & Mailbox Hygiene: Why demonitor(Ref, [flush]) is Mandatory',
    'Architectural Decision Lab (Links vs. Monitors) & Building my_gen_server:call/3',
    'Incident #102: Hanging Client Calls When Worker Crashes Mid-Request',
    'Chapter 6 Mini-Capstone: The Resilient Payment Gateway, Watcher & Idempotent Store',
  ],
  7: [
    'From my_gen_server to OTP gen_server & sys:get_state/1 Introspection',
    'gen_server Essentials: start_link, Synchronous call & Async cast',
    'Non-Blocking Init with handle_continue & Periodic handle_info Timers',
    'Async Worker Offloading with gen_server:reply/2 & Process Hibernation',
    'gen_statem: Protocol & Circuit Breaker State Machines',
    'gen_event: Decoupled Event Buses & Security Audit Loggers',
    'Incident #103: Slow gen_server:init/1 Blocking Supervisor Startup',
    'Chapter 7 Problem Set: API Gateway Token-Bucket Rate Limiter',
  ],
  8: [
    'Supervisor Flags & Restart Strategies',
    'Child Specifications & Restart Types',
    'Restart Intensity Blizzards & Escalation',
    'Dynamic Worker Supervision (simple_one_for_one)',
    'OTP Applications & Runtime Config',
    'Incident #104: Broken Supervision Strategy',
    'Assignment: Fault-Isolated Checkout Tree',
  ],
  9: [
    'ETS Fundamentals: Table Types, keypos & Atomic Counters',
    'ETS Pattern Matching, Match Specs & protected Reads',
    'Surviving Worker Crashes: The ETS Heir Handshake',
    'Distributed Erlang Core: Nodes, Magic Cookies, rpc:call & pg Groups',
    'Mnesia Distributed DBMS: Tables, ACID Transactions & Rollback',
    'Production QA: EUnit Test Generators & Dialyzer Specs',
    'Incident #105: ETS Session Wipeout When Cache Worker Crashes',
    'Chapter 9 Problem Set: Fault-Tolerant ETS Session Store with Heir Failover',
  ],
  10: [
    'Guided Demo: Inside gen_tcp:listen/accept & Live Telemetry',
    'Socket Options & Built-In C Framing ({packet, 4 | line})',
    'TCP Flow Control: {active, once} Backpressure',
    'Stream Framing: Fragmented & Coalesced Packets',
    'Concurrent Acceptor Pool & Socket Handoff',
    'Incident #106: TCP Server OOM Mailbox Flood & Dropped Partial Lines',
    'Mini-Capstone: High-Throughput TCP KV Server',
  ],
  11: [
    'Guided Demo: Live XMPP Wire Protocol Session',
    'XMPP Addressing: RFC 7622 JID Parser & Validator',
    'XMPP Stanza Codec: RFC 6120 XML Elements',
    'RFC 6120 Errors & RFC 6121 Roster Subscription FSM',
    'Incremental XML Stream Framing Over Raw TCP',
    'RFC 6120 C2S Handshake State Machine',
    'Incident #107: Pre-Auth Stanza Injection & XML Escaping',
    'Capstone Foundation: Presence Registry & Priority Router',
  ],
  12: [
    'Milestone 1: Root rest_for_one Supervisor (xmpp_sup)',
    'Milestone 2: XML Stream Framer & Memory Safety (xmpp_stream_parser)',
    'Milestone 3: ETS Session Registry & Monitors (xmpp_session_registry)',
    'Milestone 4: C2S State Machine & Flow Control (xmpp_c2s_statem)',
    'Milestone 5: Stanza Router & Offline Queue (xmpp_router)',
    'Final Capstone: 5-Module Integration & Chaos Monkey Resilience',
  ],
};

// XP-to-role lookup
function xpToRole(xp: number): { level: number; role: string } {
  if (xp < 300) return { level: 1, role: 'BEAM Newcomer' };
  if (xp < 700) return { level: 2, role: 'Pattern Matcher' };
  if (xp < 1200) return { level: 3, role: 'OTP Apprentice' };
  if (xp < 2000) return { level: 4, role: 'Concurrency Artisan' };
  if (xp < 3000) return { level: 5, role: 'Fault Tolerance Engineer' };
  if (xp < 4500) return { level: 6, role: 'OTP Architect' };
  return { level: 7, role: 'BEAM Grandmaster' };
}

export function BootDevTopBar() {
  const {
    theme,
    toggleTheme,
    bootDevView,
    setBootDevView,
    activeChapter,
    setActiveChapter,
    activeLesson,
    setActiveLesson,
    goToPrevLesson,
    goToNextLesson,
    totalXp,
    wsStatus,
    currentUser,
    switchUser,
    resetUserProgress,
    devModeUnlockedAll,
    toggleDevModeUnlockedAll,
    completedLevelIds,
    switchExercise,
  } = useWorkspaceStore();

  const [mounted, setMounted] = useState(false);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const [prereqModalData, setPrereqModalData] = useState<{
    targetChapterNum: number;
    targetChapterTitle: string;
    prerequisiteChapterNum: number;
    prerequisiteLessonId: string;
    targetLessonNum: number;
    targetLessonId: string;
  } | null>(null);
  const [isPrereqModalOpen, setIsPrereqModalOpen] = useState(false);

  const chapterRef = useRef<HTMLDivElement>(null);
  const lessonRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (chapterRef.current && !chapterRef.current.contains(e.target as Node)) setChapterOpen(false);
      if (lessonRef.current && !lessonRef.current.contains(e.target as Node)) setLessonOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { level, role } = xpToRole(totalXp);
  const chapterLessons = ALL_CURRICULUM_CHAPTERS[activeChapter]
    ? ALL_CURRICULUM_CHAPTERS[activeChapter].map((l) => l.title)
    : (LESSONS_PER_CHAPTER[activeChapter] || []);
  const currentChapter = CHAPTERS.find((c) => c.num === activeChapter)!;

  const isDark = theme === 'dark';

  // Check if a chapter is accessible under gating rules
  const isChapterAccessible = (chNum: number): boolean => {
    if (devModeUnlockedAll || chNum === 1) return true;
    const prevChapterLessons = (ALL_CURRICULUM_CHAPTERS as any)[chNum - 1] || [];
    if (prevChapterLessons.length === 0) return true;
    const prevFinalLesson = prevChapterLessons[prevChapterLessons.length - 1];
    return prevFinalLesson ? completedLevelIds.includes(prevFinalLesson.id) : true;
  };

  const handleSelectChapter = (chNum: number) => {
    if (isChapterAccessible(chNum)) {
      setActiveChapter(chNum);
      setActiveLesson(1);
      const targetLessons = (ALL_CURRICULUM_CHAPTERS as any)[chNum] || [];
      if (targetLessons[0]) {
        switchExercise(targetLessons[0].id);
      }
      if (bootDevView !== 'lesson') setBootDevView('lesson');
      setChapterOpen(false);
    } else {
      const prevChNum = chNum - 1;
      const prevLessons = (ALL_CURRICULUM_CHAPTERS as any)[prevChNum] || [];
      const prevFinalLessonId = prevLessons.length > 0 ? prevLessons[prevLessons.length - 1].id : `ch0${prevChNum}-l08`;
      const chMeta = CHAPTERS.find((c) => c.num === chNum);
      setPrereqModalData({
        targetChapterNum: chNum,
        targetChapterTitle: chMeta?.title || `Chapter ${chNum}`,
        prerequisiteChapterNum: prevChNum,
        prerequisiteLessonId: prevFinalLessonId,
        targetLessonNum: 1,
        targetLessonId: (ALL_CURRICULUM_CHAPTERS as any)[chNum]?.[0]?.id || `ch0${chNum}-l01`,
      });
      setIsPrereqModalOpen(true);
      setChapterOpen(false);
    }
  };

  const handleSelectLesson = (lessonNum: number) => {
    if (isChapterAccessible(activeChapter)) {
      setActiveLesson(lessonNum);
      const targetLessons = (ALL_CURRICULUM_CHAPTERS as any)[activeChapter] || [];
      if (targetLessons[lessonNum - 1]) {
        switchExercise(targetLessons[lessonNum - 1].id);
      }
      if (bootDevView !== 'lesson') setBootDevView('lesson');
      setLessonOpen(false);
    } else {
      const prevChNum = activeChapter - 1;
      const prevLessons = (ALL_CURRICULUM_CHAPTERS as any)[prevChNum] || [];
      const prevFinalLessonId = prevLessons.length > 0 ? prevLessons[prevLessons.length - 1].id : `ch0${prevChNum}-l08`;
      const chMeta = CHAPTERS.find((c) => c.num === activeChapter);
      setPrereqModalData({
        targetChapterNum: activeChapter,
        targetChapterTitle: chMeta?.title || `Chapter ${activeChapter}`,
        prerequisiteChapterNum: prevChNum,
        prerequisiteLessonId: prevFinalLessonId,
        targetLessonNum: lessonNum,
        targetLessonId: (ALL_CURRICULUM_CHAPTERS as any)[activeChapter]?.[lessonNum - 1]?.id || `ch0${activeChapter}-l0${lessonNum}`,
      });
      setIsPrereqModalOpen(true);
      setLessonOpen(false);
    }
  };

  return (
    <>
      <header
        id="beamforge-topbar"
        className="fixed top-0 left-0 right-0 z-50 h-14 px-3 sm:px-4 flex items-center justify-between gap-2 select-none"
        style={{
          background: isDark
            ? 'rgba(11, 15, 23, 0.70)'
            : 'rgba(255, 255, 255, 0.78)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          borderBottom: isDark
            ? '1px solid rgba(255, 255, 255, 0.12)'
            : '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow: isDark
            ? '0 12px 36px -10px rgba(0, 0, 0, 0.65), inset 0 -1px 0 0 rgba(255, 255, 255, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.20)'
            : '0 10px 30px -8px rgba(15, 23, 42, 0.08), inset 0 -1px 0 0 rgba(255, 255, 255, 0.85)',
        }}
      >
        {/* ── LEFT ZONE: Brand + Gamified Stats + Leaderboard ─────────────────── */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-shrink-0">
          {/* Logo */}
          <div
            className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
            onClick={() => setBootDevView('syllabus')}
            title="BeamForge — Return to Curriculum Syllabus"
          >
            <BeamForgeLogo size={26} />
            <span
              className="font-black text-sm tracking-tight hidden lg:block group-hover:text-blue-500 transition-colors"
              style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
            >
              BeamForge
            </span>
          </div>

          {/* Separator */}
          <div className="w-px h-4 opacity-20 hidden sm:block" style={{ background: isDark ? '#F8FAFC' : '#0F172A' }} />

          {/* XP Badge */}
          <div
            id="xp-badge"
            suppressHydrationWarning
            className="xp-badge-glow flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(217,119,6,0.12) 100%)',
              border: '1px solid rgba(245,158,11,0.35)',
              color: '#F59E0B',
            }}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
            <span suppressHydrationWarning>{mounted ? totalXp.toLocaleString() : '0'} XP</span>
          </div>

          {/* Leaderboard Trophy Button */}
          <button
            id="leaderboard-btn"
            onClick={() => setIsLeaderboardOpen(true)}
            title="Global Leaderboard (Neon Cloud)"
            className="flex items-center justify-center w-7 h-7 rounded-full transition-all cursor-pointer hover:scale-105"
            style={{
              background: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#F59E0B',
            }}
          >
            <Trophy className="w-3.5 h-3.5 fill-amber-500/20" />
          </button>

          {/* Streak Badge */}
          <div
            id="streak-badge"
            suppressHydrationWarning
            title={`${currentUser?.streakDays || 1} day active streak! Complete a lesson daily to keep your flame lit.`}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(249,115,22,0.12) 100%)',
              border: '1px solid rgba(239,68,68,0.35)',
              color: '#F97316',
            }}
          >
            <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 flex-shrink-0" />
            <span suppressHydrationWarning>{mounted ? (currentUser?.streakDays || 1) : 1}d</span>
          </div>

          {/* Role Badge (Large screens only) */}
          <div
            id="role-badge"
            suppressHydrationWarning
            className="hidden 2xl:flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
            style={{
              background: isDark ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.10)',
              border: '1px solid rgba(139,92,246,0.30)',
              color: '#8B5CF6',
            }}
          >
            <span suppressHydrationWarning>Lv{mounted ? level : 1}</span>
            <span className="opacity-60">•</span>
            <span suppressHydrationWarning>{mounted ? role : 'BEAM Newcomer'}</span>
          </div>

          {/* Tester Mode Active Indicator (Pill) */}
          {devModeUnlockedAll && (
            <div
              id="tester-mode-pill"
              title="Tester Mode: All chapters unlocked. XP is frozen (0 XP added) to protect leaderboard rankings."
              className="hidden xl:flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#F59E0B',
              }}
            >
              <ShieldAlert className="w-3 h-3 flex-shrink-0" />
              <span>Tester (0 XP)</span>
            </div>
          )}

          {/* View Switcher Pill */}
          <div
            className="hidden xl:flex items-center gap-0.5 p-0.5 rounded-xl"
            style={{
              background: isDark ? 'rgba(30,41,59,0.60)' : 'rgba(255,255,255,0.60)',
              border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(255,255,255,0.80)',
            }}
          >
            {[
              { key: 'lesson' as const, label: 'Lesson', icon: BookOpen },
              { key: 'syllabus' as const, label: 'Syllabus', icon: Compass },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                id={`view-switcher-${key}`}
                onClick={() => setBootDevView(key)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                style={{
                  background: bootDevView === key
                    ? (isDark ? 'rgba(139,92,246,0.30)' : 'rgba(245,158,11,0.15)')
                    : 'transparent',
                  color: bootDevView === key
                    ? (isDark ? '#C4B5FD' : '#D97706')
                    : (isDark ? '#94A3B8' : '#64748B'),
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── CENTER ZONE: De-cluttered Interactive Lesson Progress Dots ──────── */}
        <div className="hidden lg:flex flex-1 items-center justify-center gap-1 min-w-0 px-2 max-w-sm">
          {chapterLessons.map((lessonTitle, idx) => {
            const lessonNum = idx + 1;
            const isCompleted = lessonNum < activeLesson;
            const isActive = lessonNum === activeLesson;
            return (
              <React.Fragment key={lessonNum}>
                {/* Connector line */}
                {idx > 0 && (
                  <div
                    className="h-0.5 flex-1 min-w-[6px] max-w-4 transition-all duration-300"
                    style={{
                      background: isCompleted || isActive
                        ? (isDark ? 'rgba(16,185,129,0.70)' : 'rgba(16,185,129,0.60)')
                        : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'),
                    }}
                  />
                )}
                <button
                  id={`lesson-dot-${lessonNum}`}
                  title={`Lesson ${lessonNum}: ${lessonTitle}`}
                  onClick={() => handleSelectLesson(lessonNum)}
                  className={`relative flex-shrink-0 rounded-full transition-all duration-300 cursor-pointer ${isActive ? 'lesson-dot-active scale-110' : 'hover:scale-125'}`}
                  style={{
                    width: isActive ? 14 : 9,
                    height: isActive ? 14 : 9,
                    background: isCompleted
                      ? '#10B981'
                      : isActive
                      ? (isDark ? '#34D399' : '#10B981')
                      : (isDark ? 'rgba(255,255,255,0.20)' : 'rgba(15,23,42,0.18)'),
                    border: isActive
                      ? `2px solid ${isDark ? '#34D399' : '#10B981'}`
                      : isCompleted
                      ? 'none'
                      : `1px solid ${isDark ? 'rgba(255,255,255,0.30)' : 'rgba(15,23,42,0.25)'}`,
                    boxShadow: isActive ? `0 0 0 3px ${isDark ? 'rgba(52,211,153,0.25)' : 'rgba(16,185,129,0.25)'}` : 'none',
                  }}
                >
                  {isCompleted && (
                    <svg className="absolute inset-0 m-auto w-2 h-2" viewBox="0 0 8 8" fill="none">
                      <path d="M1.5 4L3 5.5L6.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* ── RIGHT ZONE: Chapter & Lesson Dropdowns + Nav + Profile + Settings ── */}
        <div className="hidden md:flex items-center gap-1.5 flex-shrink-0">
          {/* Chapter Selector Dropdown */}
          <div ref={chapterRef} className="relative">
            <button
              id="chapter-dropdown-btn"
              onClick={() => { setChapterOpen((o) => !o); setLessonOpen(false); setUserMenuOpen(false); setSettingsOpen(false); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer"
              style={{
                background: isDark ? 'rgba(30,41,59,0.70)' : 'rgba(255,255,255,0.75)',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.85)',
                color: isDark ? '#CBD5E1' : '#334155',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <span className="font-bold" style={{ color: isDark ? '#A78BFA' : '#7C3AED' }}>
                CH{activeChapter}:
              </span>
              <span className="hidden xl:inline max-w-24 truncate">{currentChapter?.title}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${chapterOpen ? 'rotate-180' : ''}`} />
            </button>

            {chapterOpen && (
              <div
                id="chapter-dropdown-menu"
                className="absolute right-0 top-full mt-2 w-72 rounded-2xl overflow-hidden animate-slide-down z-50"
                style={{
                  background: isDark ? 'rgba(11,15,23,0.95)' : 'rgba(255,255,255,0.95)',
                  border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(203,213,225,0.80)',
                  boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.60)' : '0 20px 50px rgba(15,23,42,0.12)',
                  backdropFilter: 'blur(40px)',
                }}
              >
                <div
                  className="px-4 py-2.5 border-b text-xs font-bold uppercase tracking-widest flex items-center justify-between"
                  style={{ color: isDark ? '#64748B' : '#94A3B8', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)' }}
                >
                  <span>Select Chapter</span>
                  {devModeUnlockedAll && (
                    <span className="text-[10px] text-amber-500 font-mono font-normal">Unlocked (Tester)</span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto py-1">
                  {CHAPTERS.map((ch) => {
                    const isSelected = ch.num === activeChapter;
                    const isUnlocked = isChapterAccessible(ch.num);
                    return (
                      <button
                        key={ch.num}
                        id={`chapter-option-${ch.num}`}
                        onClick={() => handleSelectChapter(ch.num)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-150 cursor-pointer"
                        style={{
                          background: isSelected
                            ? (isDark ? 'rgba(139,92,246,0.20)' : 'rgba(139,92,246,0.08)')
                            : 'transparent',
                          color: isSelected
                            ? (isDark ? '#C4B5FD' : '#7C3AED')
                            : (isDark ? '#CBD5E1' : '#334155'),
                          opacity: isUnlocked ? 1 : 0.65,
                        }}
                        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)'; }}
                        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <span
                          className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{
                            background: isSelected ? 'rgba(139,92,246,0.20)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'),
                            color: isSelected ? '#8B5CF6' : (isDark ? '#94A3B8' : '#64748B'),
                          }}
                        >
                          {ch.num}
                        </span>
                        <span className="text-sm font-medium flex-1 truncate">{ch.title}</span>
                        {!isUnlocked && (
                          <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        )}
                        {ch.num === 12 && isUnlocked && (
                          <span
                            className="ml-auto text-xs px-1.5 py-0.5 rounded-md font-semibold"
                            style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}
                          >
                            Capstone
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Lesson Selector Dropdown */}
          <div ref={lessonRef} className="relative">
            <button
              id="lesson-dropdown-btn"
              onClick={() => { setLessonOpen((o) => !o); setChapterOpen(false); setUserMenuOpen(false); setSettingsOpen(false); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer"
              style={{
                background: isDark ? 'rgba(30,41,59,0.70)' : 'rgba(255,255,255,0.75)',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.85)',
                color: isDark ? '#CBD5E1' : '#334155',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <span className="font-bold" style={{ color: isDark ? '#34D399' : '#059669' }}>
                L{activeLesson}:
              </span>
              <span className="hidden xl:inline max-w-28 truncate">
                {ALL_CURRICULUM_CHAPTERS[activeChapter]?.[activeLesson - 1]?.lessonType === 'incident_triage' && (
                  <AlertTriangle className="w-3 h-3 text-rose-500 inline mr-1 -mt-0.5 flex-shrink-0" />
                )}
                {chapterLessons[activeLesson - 1] || `Lesson ${activeLesson}`}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${lessonOpen ? 'rotate-180' : ''}`} />
            </button>

            {lessonOpen && (
              <div
                id="lesson-dropdown-menu"
                className="absolute right-0 top-full mt-2 w-72 rounded-2xl overflow-hidden animate-slide-down z-50"
                style={{
                  background: isDark ? 'rgba(11,15,23,0.95)' : 'rgba(255,255,255,0.95)',
                  border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(203,213,225,0.80)',
                  boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.60)' : '0 20px 50px rgba(15,23,42,0.12)',
                  backdropFilter: 'blur(40px)',
                }}
              >
                <div
                  className="px-4 py-2.5 border-b text-xs font-bold uppercase tracking-widest"
                  style={{ color: isDark ? '#64748B' : '#94A3B8', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)' }}
                >
                  CH{activeChapter} — {currentChapter?.title}
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {chapterLessons.map((lessonTitle, idx) => {
                    const lessonNum = idx + 1;
                    const isSelected = lessonNum === activeLesson;
                    const isCompleted = lessonNum < activeLesson;
                    const lessonObj = ALL_CURRICULUM_CHAPTERS[activeChapter]?.[idx];
                    const isIncident = lessonObj?.lessonType === 'incident_triage' || !!lessonObj?.incidentAlert;
                    return (
                      <button
                        key={lessonNum}
                        id={`lesson-option-${lessonNum}`}
                        onClick={() => handleSelectLesson(lessonNum)}
                        className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors duration-150 cursor-pointer"
                        style={{
                          background: isSelected ? (isDark ? 'rgba(52,211,153,0.15)' : 'rgba(16,185,129,0.08)') : 'transparent',
                          color: isSelected ? (isDark ? '#34D399' : '#059669') : (isDark ? '#CBD5E1' : '#334155'),
                        }}
                        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)'; }}
                        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: isCompleted ? '#10B981' : isSelected ? 'rgba(52,211,153,0.20)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'),
                          }}
                        >
                          {isCompleted ? (
                            <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            <span className="text-xs font-bold" style={{ color: isSelected ? '#10B981' : (isDark ? '#64748B' : '#94A3B8') }}>
                              {lessonNum}
                            </span>
                          )}
                        </div>
                        <span className="text-sm flex-1 truncate flex items-center gap-1.5">
                          {isIncident && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />}
                          <span className="truncate">{lessonTitle}</span>
                        </span>
                        {isIncident && (
                          <span
                            className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0"
                            style={{
                              background: isDark ? 'rgba(244,63,94,0.20)' : 'rgba(239,68,68,0.12)',
                              color: isDark ? '#FDA4AF' : '#BE123C',
                              border: isDark ? '1px solid rgba(244,63,94,0.35)' : '1px solid rgba(239,68,68,0.30)',
                            }}
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>Incident</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Prev / Next Arrows */}
          <div className="flex items-center gap-0.5">
            <button
              id="prev-lesson-btn"
              onClick={() => {
                goToPrevLesson();
                if (bootDevView !== 'lesson') setBootDevView('lesson');
              }}
              title="Previous Lesson"
              disabled={activeChapter === 1 && activeLesson === 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: isDark ? 'rgba(30,41,59,0.70)' : 'rgba(255,255,255,0.75)',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.85)',
                color: isDark ? '#CBD5E1' : '#334155',
              }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              id="next-lesson-btn"
              onClick={() => {
                goToNextLesson();
                if (bootDevView !== 'lesson') setBootDevView('lesson');
              }}
              title="Next Lesson"
              disabled={activeChapter === 12 && activeLesson === 6}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: isDark ? 'rgba(30,41,59,0.70)' : 'rgba(255,255,255,0.75)',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.85)',
                color: isDark ? '#CBD5E1' : '#334155',
              }}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* User Profile Switcher */}
          <div ref={userMenuRef} className="relative">
            <button
              id="user-switcher-btn"
              onClick={() => { setUserMenuOpen((o) => !o); setChapterOpen(false); setLessonOpen(false); setSettingsOpen(false); }}
              title={`Active Profile: ${currentUser?.name || 'Alpha Tester'}`}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer"
              style={{
                background: isDark ? 'rgba(30,41,59,0.70)' : 'rgba(255,255,255,0.75)',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.85)',
                color: isDark ? '#CBD5E1' : '#334155',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: currentUser?.avatarColor || '#3B82F6' }}
              />
              <span className="hidden xl:inline max-w-24 truncate font-medium">
                {currentUser?.name || 'Alpha'}
              </span>
              <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {userMenuOpen && (
              <div
                id="user-switcher-menu"
                className="absolute right-0 top-full mt-2 w-72 rounded-2xl overflow-hidden animate-slide-down z-50"
                style={{
                  background: isDark ? 'rgba(11,15,23,0.95)' : 'rgba(255,255,255,0.95)',
                  border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(203,213,225,0.80)',
                  boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.60)' : '0 20px 50px rgba(15,23,42,0.12)',
                  backdropFilter: 'blur(40px)',
                }}
              >
                <div
                  className="px-4 py-2.5 border-b text-xs font-bold uppercase tracking-widest flex items-center justify-between"
                  style={{ color: isDark ? '#64748B' : '#94A3B8', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)' }}
                >
                  <span>Test Profiles</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">
                    Neon / Local
                  </span>
                </div>
                <div className="py-1">
                  {Object.values(DEFAULT_USERS).map((u) => {
                    const isSelected = (currentUser?.id || 'user_alpha') === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors duration-150 cursor-pointer"
                        style={{
                          background: isSelected ? (isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)') : 'transparent',
                        }}
                        onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)'; }}
                        onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0 mt-0.5 shadow-xs"
                          style={{ background: u.avatarColor }}
                        >
                          {u.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                              {u.name}
                            </span>
                            <span className="text-[11px] font-mono text-amber-500 font-bold">
                              {u.id === currentUser?.id ? `${totalXp} XP` : `${u.totalXp} XP`}
                            </span>
                          </div>
                          <div className="text-[11px] truncate opacity-70" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                            {u.role}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── SETTINGS POPOVER (Dual Theme, BEAM Status, Tester Mode, Reset) ── */}
          <div ref={settingsRef} className="relative">
            <button
              id="settings-dropdown-btn"
              onClick={() => {
                setSettingsOpen((o) => !o);
                setChapterOpen(false);
                setLessonOpen(false);
                setUserMenuOpen(false);
              }}
              title="Settings & System Status"
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer hover:rotate-45"
              style={{
                background: settingsOpen
                  ? (isDark ? 'rgba(139,92,246,0.30)' : 'rgba(139,92,246,0.15)')
                  : (isDark ? 'rgba(30,41,59,0.70)' : 'rgba(255,255,255,0.75)'),
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.85)',
                color: isDark ? '#CBD5E1' : '#334155',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <Settings className="w-4 h-4" />
            </button>

            {settingsOpen && (
              <div
                id="settings-popover-menu"
                className="absolute right-0 top-full mt-2 w-80 rounded-2xl overflow-hidden animate-slide-down z-50 p-4 space-y-4"
                style={{
                  background: isDark ? 'rgba(11,15,23,0.96)' : 'rgba(255,255,255,0.98)',
                  border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(203,213,225,0.80)',
                  boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.70)' : '0 20px 50px rgba(15,23,42,0.15)',
                  backdropFilter: 'blur(40px)',
                }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between border-b pb-2.5"
                  style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)' }}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                      Settings & Preferences
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                    OTP 29
                  </span>
                </div>

                {/* Appearance / Theme Toggle */}
                <div>
                  <div className="text-[11px] font-semibold mb-2" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Appearance Theme
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      id="theme-daylight-btn"
                      onClick={() => { if (isDark) toggleTheme(); }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${!isDark ? 'border shadow-xs' : 'opacity-60 hover:opacity-100'}`}
                      style={{
                        background: !isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255,255,255,0.05)',
                        borderColor: !isDark ? 'rgba(245, 158, 11, 0.40)' : 'transparent',
                        color: !isDark ? '#D97706' : '#94A3B8',
                      }}
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Daylight Glass</span>
                    </button>
                    <button
                      id="theme-midnight-btn"
                      onClick={() => { if (!isDark) toggleTheme(); }}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${isDark ? 'border shadow-xs' : 'opacity-60 hover:opacity-100'}`}
                      style={{
                        background: isDark ? 'rgba(139, 92, 246, 0.20)' : 'rgba(15,23,42,0.05)',
                        borderColor: isDark ? 'rgba(139, 92, 246, 0.40)' : 'transparent',
                        color: isDark ? '#C4B5FD' : '#64748B',
                      }}
                    >
                      <Moon className="w-4 h-4 text-purple-400" />
                      <span>Midnight Glass</span>
                    </button>
                  </div>
                </div>

                {/* Go Orchestrator Status */}
                <div
                  className="p-3 rounded-xl flex items-center justify-between"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
                    border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(15,23,42,0.06)',
                  }}
                >
                  <div className="flex items-center gap-2 text-xs">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: wsStatus === 'connected' ? '#10B981' : '#64748B',
                        boxShadow: wsStatus === 'connected' ? '0 0 8px rgba(16,185,129,0.80)' : 'none',
                      }}
                    />
                    <span className="font-semibold" style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                      Go Orchestrator
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-medium" style={{ color: wsStatus === 'connected' ? '#10B981' : '#64748B' }}>
                    {wsStatus === 'connected' ? 'OTP 29 Live (Port 8080)' : 'Offline'}
                  </span>
                </div>

                {/* Developer / Tester Mode Toggle */}
                <div
                  className="p-3 rounded-xl space-y-2"
                  style={{
                    background: devModeUnlockedAll
                      ? (isDark ? 'rgba(245, 158, 11, 0.10)' : 'rgba(245, 158, 11, 0.08)')
                      : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)'),
                    border: devModeUnlockedAll
                      ? '1px solid rgba(245, 158, 11, 0.30)'
                      : (isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(15,23,42,0.06)'),
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <div>
                        <div className="text-xs font-bold" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                          Tester Mode (Unlock All)
                        </div>
                        <div className="text-[10px] text-amber-500 font-medium">
                          {devModeUnlockedAll ? 'All Chapters Unlocked • XP Frozen' : 'Gated Progression Active'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={toggleDevModeUnlockedAll}
                      id="toggle-tester-mode-btn"
                      className="w-10 h-5 rounded-full transition-colors relative cursor-pointer flex items-center p-0.5"
                      style={{
                        background: devModeUnlockedAll ? '#F59E0B' : (isDark ? 'rgba(255,255,255,0.20)' : 'rgba(15,23,42,0.20)'),
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full bg-white transition-transform shadow-xs"
                        style={{
                          transform: devModeUnlockedAll ? 'translateX(20px)' : 'translateX(0)',
                        }}
                      />
                    </button>
                  </div>
                  <p className="text-[10px] leading-relaxed opacity-75" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    When enabled, all 12 chapters are immediately accessible. To preserve global leaderboard integrity, exercise completions award 0 XP.
                  </p>
                </div>

                {/* Danger Zone: Reset Progress */}
                <div className="pt-2 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)' }}>
                  <button
                    id="open-reset-modal-btn"
                    onClick={() => {
                      setSettingsOpen(false);
                      setIsResetModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-rose-500 transition-all cursor-pointer hover:bg-rose-500/10"
                    style={{
                      background: isDark ? 'rgba(244, 63, 94, 0.10)' : 'rgba(244, 63, 94, 0.06)',
                      border: '1px solid rgba(244, 63, 94, 0.25)',
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Reset Account & Progress</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── MOBILE RIGHT ZONE: Compact Nav + Menu Toggle ─────────────────────── */}
        <div className="flex md:hidden items-center gap-1.5 flex-shrink-0">
          <button
            id="mobile-leaderboard-btn"
            onClick={() => setIsLeaderboardOpen(true)}
            title="Global Leaderboard"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer"
            style={{
              background: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#F59E0B',
            }}
          >
            <Trophy className="w-4 h-4 fill-amber-500/20" />
          </button>

          <button
            id="mobile-prev-lesson-btn"
            onClick={() => {
              goToPrevLesson();
              if (bootDevView !== 'lesson') setBootDevView('lesson');
            }}
            title="Previous Lesson"
            disabled={activeChapter === 1 && activeLesson === 1}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: isDark ? 'rgba(30,41,59,0.70)' : 'rgba(255,255,255,0.75)',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.85)',
              color: isDark ? '#CBD5E1' : '#334155',
            }}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            id="mobile-next-lesson-btn"
            onClick={() => {
              goToNextLesson();
              if (bootDevView !== 'lesson') setBootDevView('lesson');
            }}
            title="Next Lesson"
            disabled={activeChapter === 12 && activeLesson === (chapterLessons.length || 6)}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: isDark ? 'rgba(30,41,59,0.70)' : 'rgba(255,255,255,0.75)',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.85)',
              color: isDark ? '#CBD5E1' : '#334155',
            }}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            id="mobile-menu-btn"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer"
            style={{
              background: mobileMenuOpen
                ? (isDark ? 'rgba(139,92,246,0.30)' : 'rgba(139,92,246,0.15)')
                : (isDark ? 'rgba(30,41,59,0.70)' : 'rgba(255,255,255,0.75)'),
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.85)',
              color: isDark ? '#C4B5FD' : '#7C3AED',
            }}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── MOBILE SLIDE-OVER MENU DRAWER ────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          id="mobile-menu-drawer"
          className="fixed inset-0 top-14 z-50 flex flex-col md:hidden animate-fade-in overflow-y-auto"
          style={{
            background: isDark ? 'rgba(11,15,23,0.96)' : 'rgba(248,250,252,0.96)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
          }}
        >
          {/* Drawer Profile & XP Bar */}
          <div
            className="p-4 border-b flex items-center justify-between"
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="xp-badge-glow flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                style={{
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(217,119,6,0.12) 100%)',
                  border: '1px solid rgba(245,158,11,0.35)',
                  color: '#F59E0B',
                }}
              >
                <Zap className="w-3.5 h-3.5 fill-amber-500" />
                <span>{mounted ? totalXp.toLocaleString() : '0'} XP</span>
              </div>
              <div
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: isDark ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.10)',
                  border: '1px solid rgba(139,92,246,0.30)',
                  color: '#8B5CF6',
                }}
              >
                Lv{mounted ? level : 1} · {mounted ? role : 'Apprentice'}
              </div>
              <div
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(249,115,22,0.12) 100%)',
                  border: '1px solid rgba(239,68,68,0.35)',
                  color: '#F97316',
                }}
              >
                <Flame className="w-3.5 h-3.5 fill-orange-500" />
                <span>{currentUser?.streakDays || 1}d</span>
              </div>
            </div>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-xl text-xs font-semibold cursor-pointer"
              style={{ color: isDark ? '#94A3B8' : '#64748B' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* View Switcher Links */}
          <div
            className="p-3 border-b flex items-center gap-2"
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)' }}
          >
            <button
              onClick={() => {
                setBootDevView('lesson');
                setMobileMenuOpen(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              style={{
                background: bootDevView === 'lesson'
                  ? (isDark ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.12)')
                  : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'),
                color: bootDevView === 'lesson' ? '#8B5CF6' : (isDark ? '#CBD5E1' : '#334155'),
              }}
            >
              <BookOpen className="w-4 h-4" />
              <span>Lesson Workspace</span>
            </button>
            <button
              onClick={() => {
                setBootDevView('syllabus');
                setMobileMenuOpen(false);
              }}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              style={{
                background: bootDevView === 'syllabus'
                  ? (isDark ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.12)')
                  : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)'),
                color: bootDevView === 'syllabus' ? '#8B5CF6' : (isDark ? '#CBD5E1' : '#334155'),
              }}
            >
              <Compass className="w-4 h-4" />
              <span>Course Syllabus</span>
            </button>
          </div>

          {/* Quick Settings Bar in Mobile */}
          <div
            className="p-3 border-b flex items-center justify-between"
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)' }}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
                  color: isDark ? '#F59E0B' : '#475569',
                }}
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span>{isDark ? 'Daylight' : 'Midnight'}</span>
              </button>

              <button
                onClick={toggleDevModeUnlockedAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
                style={{
                  background: devModeUnlockedAll ? 'rgba(245, 158, 11, 0.18)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'),
                  color: devModeUnlockedAll ? '#F59E0B' : (isDark ? '#94A3B8' : '#64748B'),
                }}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{devModeUnlockedAll ? 'Tester ON' : 'Tester OFF'}</span>
              </button>
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setIsLeaderboardOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-500 cursor-pointer"
              style={{ background: 'rgba(245, 158, 11, 0.12)' }}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Rankings</span>
            </button>
          </div>

          {/* Mobile Profile Switcher */}
          <div className="p-3 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)' }}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center justify-between" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
              <span>Active Test Profile</span>
              <span className="text-[10px] font-mono text-blue-500 font-normal">Neon / Local</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.values(DEFAULT_USERS).map((u) => {
                const isSelected = (currentUser?.id || 'user_alpha') === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => switchUser(u.id)}
                    className="p-2 rounded-xl text-left transition-all border flex flex-col items-center text-center gap-1 cursor-pointer"
                    style={{
                      background: isSelected
                        ? (isDark ? 'rgba(59,130,246,0.20)' : 'rgba(59,130,246,0.12)')
                        : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'),
                      borderColor: isSelected
                        ? 'rgba(59,130,246,0.40)'
                        : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'),
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-white text-[10px]"
                      style={{ background: u.avatarColor }}
                    >
                      {u.name[0]}
                    </div>
                    <span className="text-[11px] font-bold truncate max-w-full" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                      {u.name.split(' ')[0]}
                    </span>
                    <span className="text-[10px] font-mono text-amber-500 font-bold">
                      {u.id === currentUser?.id ? `${totalXp} XP` : `${u.totalXp} XP`}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setIsResetModalOpen(true);
              }}
              className="w-full mt-2 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/20 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Progress (Safety Modal)</span>
            </button>
          </div>

          {/* Chapter Selector Ribbon */}
          <div className="p-3 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)' }}>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
              Select Chapter
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {CHAPTERS.map((ch) => {
                const isSelected = ch.num === activeChapter;
                const isUnlocked = isChapterAccessible(ch.num);
                return (
                  <button
                    key={ch.num}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSelectChapter(ch.num);
                    }}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    style={{
                      background: isSelected
                        ? (isDark ? 'rgba(139,92,246,0.30)' : 'rgba(139,92,246,0.15)')
                        : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)'),
                      color: isSelected ? '#A78BFA' : (isDark ? '#94A3B8' : '#64748B'),
                      border: isSelected ? '1px solid rgba(139,92,246,0.40)' : '1px solid transparent',
                      opacity: isUnlocked ? 1 : 0.60,
                    }}
                  >
                    <span>CH{ch.num}</span>
                    {!isUnlocked && <Lock className="w-2.5 h-2.5" />}
                    {ch.num === 12 && isUnlocked && (
                      <span className="text-[10px] px-1 rounded bg-amber-500/20 text-amber-500">Capstone</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chapter Lessons List */}
          <div className="p-3 flex-1 overflow-y-auto">
            <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
              CH{activeChapter}: {currentChapter?.title} Lessons
            </div>
            <div className="space-y-1">
              {chapterLessons.map((lessonTitle, idx) => {
                const lessonNum = idx + 1;
                const isSelected = lessonNum === activeLesson;
                const isCompleted = lessonNum < activeLesson;
                return (
                  <button
                    key={lessonNum}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSelectLesson(lessonNum);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all cursor-pointer"
                    style={{
                      background: isSelected
                        ? (isDark ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.10)')
                        : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)'),
                      border: isSelected
                        ? '1px solid rgba(16,185,129,0.35)'
                        : '1px solid transparent',
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{
                        background: isCompleted
                          ? '#10B981'
                          : isSelected
                          ? (isDark ? '#34D399' : '#10B981')
                          : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)'),
                        color: isCompleted || isSelected ? '#FFFFFF' : (isDark ? '#94A3B8' : '#64748B'),
                      }}
                    >
                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : lessonNum}
                    </div>
                    <span
                      className="text-sm font-medium flex-1 truncate"
                      style={{ color: isSelected ? (isDark ? '#F8FAFC' : '#020617') : (isDark ? '#CBD5E1' : '#334155') }}
                    >
                      {lessonTitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── MOUNTED MODALS & DRAWERS ───────────────────────────────────────── */}
      <LeaderboardDrawer
        isOpen={isLeaderboardOpen}
        currentUserId={currentUser?.id || 'user_alpha'}
        isDark={isDark}
        onClose={() => setIsLeaderboardOpen(false)}
      />

      <ResetAccountModal
        isOpen={isResetModalOpen}
        userName={currentUser?.name || 'Alpha Tester'}
        isDark={isDark}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={resetUserProgress}
      />

      {prereqModalData && (
        <PrerequisiteModal
          isOpen={isPrereqModalOpen}
          targetChapterNum={prereqModalData.targetChapterNum}
          targetChapterTitle={prereqModalData.targetChapterTitle}
          prerequisiteChapterNum={prereqModalData.prerequisiteChapterNum}
          prerequisiteLessonId={prereqModalData.prerequisiteLessonId}
          isDark={isDark}
          onClose={() => setIsPrereqModalOpen(false)}
          onGoToPrerequisite={(lessonId) => {
            const prevChNum = prereqModalData.prerequisiteChapterNum;
            const prevLessons = (ALL_CURRICULUM_CHAPTERS as any)[prevChNum] || [];
            setActiveChapter(prevChNum);
            setActiveLesson(prevLessons.length || 8);
            switchExercise(lessonId);
            setBootDevView('lesson');
          }}
          onJumpInAnyway={() => {
            toggleDevModeUnlockedAll();
            setActiveChapter(prereqModalData.targetChapterNum);
            setActiveLesson(prereqModalData.targetLessonNum);
            switchExercise(prereqModalData.targetLessonId);
            setBootDevView('lesson');
          }}
        />
      )}
    </>
  );
}

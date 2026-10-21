'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Zap, BookOpen, Compass } from 'lucide-react';
import { BeamForgeLogo } from './BeamForgeLogo';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { ALL_CURRICULUM_CHAPTERS } from '../../data/curriculumCatalog';

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

// 6 lessons per chapter (expandable in Phase 3)
export const LESSONS_PER_CHAPTER: Record<number, string[]> = {
  1: ['Atoms, Tuples & Pattern Matching', 'Lists & Accumulators', 'Tail Recursion Fundamentals', 'Binary Data & Sub-Binaries', 'Higher-Order Intro', 'Assignment: BEAM Term Inspector'],
  2: ['Advanced Pattern Matching', 'Guard Expressions', 'Case, If & Cond', 'Accumulator-Based Loops', 'Mutual Recursion', 'Assignment: Inventory Order Processor'],
  3: ['lists:map / filter / fold', 'Custom Higher-Order Funs', 'Closures & Fun Variables', 'lists:foldl Deep Dive', 'Pipelines & Composition', 'Assignment: Log Aggregator'],
  4: ['Map Syntax & Pattern Match', 'Record Module Definitions', 'Binary Protocol Parsing', 'Bit Syntax Deep Dive', 'Protocol Codec Module', 'Assignment: XMPP Stanza Codec'],
  5: ['Lightweight BEAM Processes vs OS Threads', 'Spawning, PIDs & Asynchronous Send (!)', 'Selective receive & Mailbox Timeouts', 'Maintaining State with Actor Loops', 'Process Registry & make_ref() Correlation', 'Assignment: Concurrent Bank Ledger & Order Actor'],
  6: ['Exceptions & try...catch', 'Bidirectional Links & Cascading Exits', 'Trapping Exits & Supervisor Primitives', 'Unidirectional Monitors & DOWN Messages', 'OTP Under the Hood: my_gen_server:call/3', 'Assignment: Resilient Job Queue & Coordinator'],
  7: ['OTP Intro & sys:get_state Introspection', 'gen_server Essentials: call & cast', 'Non-Blocking Init & handle_info Timers', 'gen_statem Circuit Breaker', 'gen_event Security Audit Event Bus', 'Assignment: Token-Bucket Rate Limiter'],
  8: ['Supervisor Flags & Restart Strategies', 'Child Specifications & Restart Types', 'Dynamic Worker Trees (simple_one_for_one)', 'OTP Applications & Config (.app.src)', 'Assignment: Fault-Isolated Checkout Tree'],
  9: ['ETS Fundamentals & Atomic Counters', 'ETS Match Specifications & Query Engine', 'Surviving Crashes: ETS Heir Handshake', 'Mnesia Transactions & Distributed pg Groups', 'Production QA: EUnit & Dialyzer Specs', 'Assignment: Fault-Tolerant Session Cache'],
  10: ['Guided Demo: gen_tcp:listen/accept & Real TCP Sockets', 'TCP Flow Control: {active, once} Backpressure', 'Stream Framing: Fragmented & Coalesced Packets', 'Concurrent Acceptor Pool & Handoff', 'Mini-Capstone: High-Throughput TCP KV Server'],
  11: ['Guided Demo: Live XMPP Wire Protocol', 'XMPP Addressing: RFC 7622 JID Parser', 'Stanza Anatomy: <iq>, <presence> & <message>', 'Incremental XML Stream Framing', 'C2S Connection Handshake State Machine', 'Assignment: Multi-Device Presence Router'],
  12: ['Milestone 1: xmpp_stream_parser', 'Milestone 2: xmpp_c2s_statem', 'Milestone 3: xmpp_session_ets', 'Milestone 4: xmpp_router', 'Milestone 5: xmpp_sup', 'Final Capstone Submission'],
};

// XP-to-role lookup
function xpToRole(xp: number): { level: number; role: string } {
  if (xp < 300)  return { level: 1, role: 'BEAM Newcomer' };
  if (xp < 700)  return { level: 2, role: 'Pattern Matcher' };
  if (xp < 1200) return { level: 3, role: 'OTP Apprentice' };
  if (xp < 2000) return { level: 4, role: 'Concurrency Artisan' };
  if (xp < 3000) return { level: 5, role: 'Fault Tolerance Engineer' };
  if (xp < 4500) return { level: 6, role: 'OTP Architect' };
  return { level: 7, role: 'BEAM Grandmaster' };
}

export function BootDevTopBar() {
  const {
    theme, toggleTheme,
    bootDevView, setBootDevView,
    activeChapter, setActiveChapter,
    activeLesson, setActiveLesson,
    goToPrevLesson, goToNextLesson,
    totalXp,
    wsStatus,
  } = useWorkspaceStore();

  const [mounted, setMounted] = useState(false);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [lessonOpen, setLessonOpen] = useState(false);
  const chapterRef = useRef<HTMLDivElement>(null);
  const lessonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (chapterRef.current && !chapterRef.current.contains(e.target as Node)) setChapterOpen(false);
      if (lessonRef.current && !lessonRef.current.contains(e.target as Node)) setLessonOpen(false);
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

  return (
    <header
      id="beamforge-topbar"
      className="fixed top-0 left-0 right-0 z-50 h-14 px-4 flex items-center gap-3 select-none"
      style={{
        background: isDark
          ? 'rgba(11, 15, 23, 0.85)'
          : 'rgba(238, 242, 246, 0.85)',
        backdropFilter: 'blur(32px) saturate(200%)',
        WebkitBackdropFilter: 'blur(32px) saturate(200%)',
        borderBottom: isDark
          ? '1px solid rgba(255,255,255,0.08)'
          : '1px solid rgba(255,255,255,0.70)',
        boxShadow: isDark
          ? '0 4px 20px rgba(0,0,0,0.40)'
          : '0 4px 20px rgba(15,23,42,0.06)',
      }}
    >
      {/* ── LEFT ZONE: Brand + Stats ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
        {/* Logo */}
        <div 
          className="flex items-center gap-2.5 cursor-pointer group" 
          onClick={() => setBootDevView('syllabus')}
          title="BeamForge — Return to Curriculum Syllabus"
        >
          <BeamForgeLogo size={28} />
          <span className="font-black text-sm tracking-tight hidden lg:block group-hover:text-blue-500 transition-colors"
            style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
            BeamForge
          </span>
        </div>

        {/* Separator */}
        <div className="w-px h-5 opacity-20" style={{ background: isDark ? '#F8FAFC' : '#0F172A' }} />

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

        {/* Role Badge */}
        <div
          id="role-badge"
          suppressHydrationWarning
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
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

        {/* Connection Status */}
        <div className="hidden md:flex items-center gap-1.5 text-xs"
          style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: wsStatus === 'connected' ? '#10B981' : '#64748B',
              boxShadow: wsStatus === 'connected' ? '0 0 6px rgba(16,185,129,0.60)' : 'none',
            }}
          />
          <span>{wsStatus === 'connected' ? 'OTP 29 Live' : 'Offline'}</span>
        </div>

        {/* View Switcher Pill */}
        <div
          className="hidden lg:flex items-center gap-0.5 p-0.5 rounded-xl"
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
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200"
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

      {/* ── CENTER ZONE: Progress Dots ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0 overflow-hidden px-4">
        {chapterLessons.map((lessonTitle, idx) => {
          const lessonNum = idx + 1;
          const isCompleted = lessonNum < activeLesson;
          const isActive = lessonNum === activeLesson;
          return (
            <React.Fragment key={lessonNum}>
              {/* Connector line */}
              {idx > 0 && (
                <div
                  className="h-px flex-1 max-w-8 transition-all duration-300"
                  style={{
                    background: isCompleted || isActive
                      ? (isDark ? 'rgba(16,185,129,0.60)' : 'rgba(16,185,129,0.50)')
                      : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.12)'),
                  }}
                />
              )}
              <button
                id={`lesson-dot-${lessonNum}`}
                title={`Lesson ${lessonNum}: ${lessonTitle}`}
                onClick={() => setActiveLesson(lessonNum)}
                className={`relative flex-shrink-0 rounded-full transition-all duration-300 ${isActive ? 'lesson-dot-active' : ''}`}
                style={{
                  width: isActive ? 16 : 10,
                  height: isActive ? 16 : 10,
                  background: isCompleted
                    ? '#10B981'
                    : isActive
                    ? (isDark ? '#34D399' : '#10B981')
                    : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.15)'),
                  border: isActive
                    ? `2px solid ${isDark ? '#34D399' : '#10B981'}`
                    : isCompleted
                    ? 'none'
                    : `1.5px solid ${isDark ? 'rgba(255,255,255,0.25)' : 'rgba(15,23,42,0.20)'}`,
                  boxShadow: isActive ? `0 0 0 3px ${isDark ? 'rgba(52,211,153,0.20)' : 'rgba(16,185,129,0.20)'}` : 'none',
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

      {/* ── RIGHT ZONE: Chapter/Lesson Dropdowns + Nav + Theme ───────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Chapter Dropdown */}
        <div ref={chapterRef} className="relative">
          <button
            id="chapter-dropdown-btn"
            onClick={() => { setChapterOpen((o) => !o); setLessonOpen(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
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
            <span className="hidden md:inline max-w-28 truncate">{currentChapter?.title}</span>
            <svg className={`w-3 h-3 transition-transform ${chapterOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
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
              <div className="px-4 py-2.5 border-b text-xs font-bold uppercase tracking-widest"
                style={{ color: isDark ? '#64748B' : '#94A3B8', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)' }}>
                Select Chapter
              </div>
              <div className="max-h-80 overflow-y-auto py-1">
                {CHAPTERS.map((ch) => {
                  const isSelected = ch.num === activeChapter;
                  return (
                    <button
                      key={ch.num}
                      id={`chapter-option-${ch.num}`}
                      onClick={() => { setActiveChapter(ch.num); setChapterOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150"
                      style={{
                        background: isSelected
                          ? (isDark ? 'rgba(139,92,246,0.20)' : 'rgba(139,92,246,0.08)')
                          : 'transparent',
                        color: isSelected
                          ? (isDark ? '#C4B5FD' : '#7C3AED')
                          : (isDark ? '#CBD5E1' : '#334155'),
                      }}
                      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)'; }}
                      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: isSelected ? 'rgba(139,92,246,0.20)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'),
                          color: isSelected ? '#8B5CF6' : (isDark ? '#94A3B8' : '#64748B'),
                        }}>
                        {ch.num}
                      </span>
                      <span className="text-sm font-medium">{ch.title}</span>
                      {ch.num === 12 && (
                        <span className="ml-auto text-xs px-1.5 py-0.5 rounded-md font-semibold"
                          style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
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

        {/* Lesson Dropdown */}
        <div ref={lessonRef} className="relative">
          <button
            id="lesson-dropdown-btn"
            onClick={() => { setLessonOpen((o) => !o); setChapterOpen(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200"
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
            <span className="hidden md:inline max-w-32 truncate">
              {chapterLessons[activeLesson - 1] || `Lesson ${activeLesson}`}
            </span>
            <svg className={`w-3 h-3 transition-transform ${lessonOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="currentColor">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
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
              <div className="px-4 py-2.5 border-b text-xs font-bold uppercase tracking-widest"
                style={{ color: isDark ? '#64748B' : '#94A3B8', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)' }}>
                CH{activeChapter} — {currentChapter?.title}
              </div>
              <div className="max-h-72 overflow-y-auto py-1">
                {chapterLessons.map((lessonTitle, idx) => {
                  const lessonNum = idx + 1;
                  const isSelected = lessonNum === activeLesson;
                  const isCompleted = lessonNum < activeLesson;
                  return (
                    <button
                      key={lessonNum}
                      id={`lesson-option-${lessonNum}`}
                      onClick={() => { setActiveLesson(lessonNum); setLessonOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150"
                      style={{
                        background: isSelected ? (isDark ? 'rgba(52,211,153,0.15)' : 'rgba(16,185,129,0.08)') : 'transparent',
                        color: isSelected ? (isDark ? '#34D399' : '#059669') : (isDark ? '#CBD5E1' : '#334155'),
                      }}
                      onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)'; }}
                      onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: isCompleted ? '#10B981' : isSelected ? 'rgba(52,211,153,0.20)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'),
                        }}>
                        {isCompleted
                          ? <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          : <span className="text-xs font-bold" style={{ color: isSelected ? '#10B981' : (isDark ? '#64748B' : '#94A3B8') }}>{lessonNum}</span>
                        }
                      </div>
                      <span className="text-sm">{lessonTitle}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Prev / Next Arrows */}
        <div className="flex items-center gap-1">
          <button
            id="prev-lesson-btn"
            onClick={goToPrevLesson}
            title="Previous Lesson"
            disabled={activeChapter === 1 && activeLesson === 1}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: isDark ? 'rgba(30,41,59,0.70)' : 'rgba(255,255,255,0.75)',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.85)',
              color: isDark ? '#CBD5E1' : '#334155',
            }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
              <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            id="next-lesson-btn"
            onClick={goToNextLesson}
            title="Next Lesson"
            disabled={activeChapter === 12 && activeLesson === 6}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: isDark ? 'rgba(30,41,59,0.70)' : 'rgba(255,255,255,0.75)',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.85)',
              color: isDark ? '#CBD5E1' : '#334155',
            }}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Light/Dark Theme Toggle */}
        <button
          id="theme-toggle-btn"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Daylight Glass' : 'Switch to Midnight Glass'}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200"
          style={{
            background: isDark ? 'rgba(30,41,59,0.70)' : 'rgba(255,255,255,0.75)',
            border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.85)',
            color: isDark ? '#F59E0B' : '#475569',
          }}
        >
          {isDark ? (
            /* Sun icon */
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
            </svg>
          ) : (
            /* Moon icon */
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Binary, 
  GitFork, 
  ShieldCheck, 
  Radio, 
  Globe, 
  CheckCircle2, 
  PlayCircle, 
  Clock, 
  Sparkles, 
  ArrowRight,
  Award,
  ChevronDown,
  Trophy,
  Target,
  BookOpen,
  Zap,
} from 'lucide-react';
import { COURSE_WORLDS } from '../../data/courseWorlds';
import { ALL_CURRICULUM_CHAPTERS } from '../../data/chapters';
import { CHAPTERS } from '../navigation/BootDevTopBar';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';

// Icon map for the 5 Thematic Worlds
const WORLD_ICON_MAP: Record<string, React.ElementType> = {
  Binary,
  GitFork,
  ShieldCheck,
  Radio,
  Globe,
};

// High-contrast styling for the 5 Thematic World logos in Daylight & Midnight modes
const WORLD_ICON_STYLES: Record<
  number,
  { lightBg: string; darkBg: string; border: string; glow: string; color: string }
> = {
  1: {
    lightBg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    darkBg: 'linear-gradient(135deg, rgba(16,185,129,0.35) 0%, rgba(5,150,105,0.20) 100%)',
    border: 'rgba(16,185,129,0.45)',
    glow: 'rgba(16,185,129,0.35)',
    color: '#34D399',
  },
  2: {
    lightBg: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    darkBg: 'linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(79,70,229,0.20) 100%)',
    border: 'rgba(99,102,241,0.45)',
    glow: 'rgba(99,102,241,0.35)',
    color: '#818CF8',
  },
  3: {
    lightBg: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    darkBg: 'linear-gradient(135deg, rgba(139,92,246,0.35) 0%, rgba(124,58,237,0.20) 100%)',
    border: 'rgba(139,92,246,0.45)',
    glow: 'rgba(139,92,246,0.35)',
    color: '#A78BFA',
  },
  4: {
    lightBg: 'linear-gradient(135deg, #007AFF 0%, #0284C7 100%)',
    darkBg: 'linear-gradient(135deg, rgba(0,122,255,0.35) 0%, rgba(2,132,199,0.20) 100%)',
    border: 'rgba(0,122,255,0.45)',
    glow: 'rgba(0,122,255,0.35)',
    color: '#60A5FA',
  },
  5: {
    lightBg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    darkBg: 'linear-gradient(135deg, rgba(245,158,11,0.35) 0%, rgba(217,119,6,0.20) 100%)',
    border: 'rgba(245,158,11,0.45)',
    glow: 'rgba(245,158,11,0.35)',
    color: '#FBBF24',
  },
};

// Chapter 12 Capstone Milestones definition
const CAPSTONE_MILESTONES = [
  {
    id: 'ms-1',
    chapterNumber: 12,
    lessonNumber: 1,
    title: 'Milestone 1: XML Stream Parser',
    lessonType: 'guided_demo' as const,
    difficulty: 'Advanced' as const,
    estimatedMinutes: 30,
    xpReward: 200,
    conceptMarkdown: 'Incremental XML stream parser handling TCP packet fragmentation.',
  },
  {
    id: 'ms-2',
    chapterNumber: 12,
    lessonNumber: 2,
    title: 'Milestone 2: C2S gen_statem State Machine',
    lessonType: 'problem_set' as const,
    difficulty: 'Advanced' as const,
    estimatedMinutes: 45,
    xpReward: 250,
    conceptMarkdown: '5-state connection machine with SASL handshake and socket flow control.',
  },
  {
    id: 'ms-3',
    chapterNumber: 12,
    lessonNumber: 3,
    title: 'Milestone 3: Session ETS Registry',
    lessonType: 'problem_set' as const,
    difficulty: 'Advanced' as const,
    estimatedMinutes: 35,
    xpReward: 200,
    conceptMarkdown: 'Crash-resilient session table surviving process kills via ETS heir transfer.',
  },
  {
    id: 'ms-4',
    chapterNumber: 12,
    lessonNumber: 4,
    title: 'Milestone 4: Presence & Message Router',
    lessonType: 'problem_set' as const,
    difficulty: 'Production' as const,
    estimatedMinutes: 40,
    xpReward: 250,
    conceptMarkdown: 'Multi-device routing engine dispatching messages and presence stanzas.',
  },
  {
    id: 'ms-5',
    chapterNumber: 12,
    lessonNumber: 5,
    title: 'Milestone 5: Supervision Tree & System Release',
    lessonType: 'problem_set' as const,
    difficulty: 'Production' as const,
    estimatedMinutes: 50,
    xpReward: 300,
    conceptMarkdown: 'Fault-tolerant supervision hierarchy and production OTP release package.',
  },
];

// Difficulty Badge Pill
function DifficultyBadge({ difficulty, isDark }: { difficulty: string; isDark: boolean }) {
  const styles: Record<string, { bg: string; text: string; border: string }> = {
    Beginner: {
      bg: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.10)',
      text: isDark ? '#34D399' : '#059669',
      border: isDark ? 'rgba(16,185,129,0.30)' : 'rgba(16,185,129,0.25)',
    },
    Intermediate: {
      bg: isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.10)',
      text: isDark ? '#60A5FA' : '#1D4ED8',
      border: isDark ? 'rgba(0,122,255,0.30)' : 'rgba(0,122,255,0.25)',
    },
    Advanced: {
      bg: isDark ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.12)',
      text: isDark ? '#C4B5FD' : '#7C3AED',
      border: isDark ? 'rgba(139,92,246,0.30)' : 'rgba(139,92,246,0.25)',
    },
    Production: {
      bg: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.10)',
      text: isDark ? '#FCA5A5' : '#DC2626',
      border: isDark ? 'rgba(239,68,68,0.30)' : 'rgba(239,68,68,0.25)',
    },
  };

  const current = styles[difficulty] || styles.Beginner;

  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
      style={{
        background: current.bg,
        color: current.text,
        borderColor: current.border,
      }}
    >
      {difficulty}
    </span>
  );
}

// Lesson Type Pill
function LessonTypeBadge({ type, isDark }: { type: string; isDark: boolean }) {
  if (type === 'problem_set') {
    return (
      <span
        className="px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1"
        style={{
          background: isDark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.12)',
          color: isDark ? '#FCD34D' : '#D97706',
          border: isDark ? '1px solid rgba(245,158,11,0.30)' : '1px solid rgba(245,158,11,0.25)',
        }}
      >
        <Trophy className="w-3 h-3 text-amber-500" />
        <span>Assignment</span>
      </span>
    );
  }
  if (type === 'guided_demo') {
    return (
      <span
        className="px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1"
        style={{
          background: isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.10)',
          color: isDark ? '#93C5FD' : '#0284C7',
          border: isDark ? '1px solid rgba(0,122,255,0.30)' : '1px solid rgba(0,122,255,0.25)',
        }}
      >
        <Target className="w-3 h-3 text-blue-500" />
        <span>Demo</span>
      </span>
    );
  }
  return (
    <span
      className="px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1"
      style={{
        background: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.10)',
        color: isDark ? '#6EE7B7' : '#059669',
        border: isDark ? '1px solid rgba(16,185,129,0.30)' : '1px solid rgba(16,185,129,0.25)',
      }}
    >
      <BookOpen className="w-3 h-3 text-emerald-500" />
      <span>Concept</span>
    </span>
  );
}

export function CurriculumWorldMap() {
  const {
    theme,
    completedLevelIds,
    activeChapter,
    activeLesson,
    setActiveChapter,
    setActiveLesson,
    switchExercise,
    setBootDevView,
    totalXp,
  } = useWorkspaceStore();

  const isDark = theme === 'dark';

  // Build a lookup map of lessons per chapter
  const allLessonsByChapter: Record<number, any[]> = { ...ALL_CURRICULUM_CHAPTERS };
  allLessonsByChapter[12] = CAPSTONE_MILESTONES;

  // Flatten all available lessons across the 12 chapters
  const allLessonsList: any[] = [];
  for (let ch = 1; ch <= 12; ch++) {
    if (allLessonsByChapter[ch]) {
      allLessonsList.push(...allLessonsByChapter[ch]);
    }
  }

  const totalLessons = allLessonsList.length; // 68 total lessons & milestones
  const completedCount = allLessonsList.filter((l) => completedLevelIds.includes(l.id)).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Track expanded state for each of the 5 Worlds
  const [expandedWorlds, setExpandedWorlds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    COURSE_WORLDS.forEach((world) => {
      // Default expand all, or expand the world containing the active chapter
      initial[world.id] = true;
    });
    return initial;
  });

  const toggleWorld = (worldId: string) => {
    setExpandedWorlds((prev) => ({
      ...prev,
      [worldId]: !prev[worldId],
    }));
  };

  // Dynamic Engineer Rank
  let currentRank = 'BEAM Apprentice';
  if (completedCount >= 55) currentRank = 'Principal OTP Systems Architect';
  else if (completedCount >= 40) currentRank = 'Senior Distributed Systems Engineer';
  else if (completedCount >= 25) currentRank = 'Production OTP Engineer';
  else if (completedCount >= 10) currentRank = 'Concurrent BEAM Practitioner';
  else if (completedCount >= 3) currentRank = 'Functional Craftsman';

  // Navigate directly to selected lesson
  const handleSelectLesson = (chNum: number, lessonNum: number, lessonId: string) => {
    setActiveChapter(chNum);
    setActiveLesson(lessonNum);
    switchExercise(lessonId);
    setBootDevView('lesson');
  };

  return (
    <div
      className="w-full h-full overflow-y-auto px-4 md:px-8 lg:px-14 pb-24"
      style={{
        paddingTop: '5rem',
        background: isDark
          ? 'radial-gradient(ellipse at top, rgba(30,27,75,0.25) 0%, rgba(11,15,23,0.95) 70%)'
          : 'radial-gradient(ellipse at top, rgba(238,242,255,0.70) 0%, rgba(248,250,252,0.95) 70%)',
      }}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* ── Top Hero Banner & Mastery Progress Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden border shadow-xl"
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)',
          }}
        >
          {/* Left: Branding & Course Title */}
          <div className="flex items-center gap-5 z-10">
            <div
              className="w-16 h-16 rounded-2xl p-0.5 shadow-md flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #007AFF 0%, #8B5CF6 50%, #EC4899 100%)',
              }}
            >
              <div
                className="w-full h-full rounded-[14px] flex items-center justify-center"
                style={{ background: isDark ? '#0B0F17' : '#FFFFFF' }}
              >
                <Award className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span
                  className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    background: 'rgba(0,122,255,0.15)',
                    color: '#007AFF',
                  }}
                >
                  <Zap className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                  <span>5 BEAM Worlds · 12 Chapters</span>
                </span>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
                    color: isDark ? '#94A3B8' : '#64748B',
                  }}
                >
                  OTP 29 Verified
                </span>
              </div>
              <h1
                className="text-2xl md:text-3xl font-black tracking-tight"
                style={{ color: isDark ? '#F8FAFC' : '#020617' }}
              >
                Mastering Erlang/OTP &amp; XMPP Systems
              </h1>
              <p
                className="text-xs md:text-sm mt-1 font-medium leading-relaxed max-w-2xl"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}
              >
                Progressive engineering curriculum modeled after Boot.dev: from functional term anatomy to actor loops, supervision trees, and distributed real-time protocol engines.
              </p>
            </div>
          </div>

          {/* Right: Progress Bar & Rank */}
          <div
            className="w-full md:w-80 flex flex-col gap-2.5 p-4 rounded-2xl border flex-shrink-0 z-10"
            style={{
              background: isDark ? 'rgba(0,0,0,0.35)' : 'rgba(241,245,249,0.70)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
            }}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>{currentRank}</span>
              <span className="font-mono text-blue-500 font-bold">
                {completedCount}/{totalLessons} ({progressPercent}%)
              </span>
            </div>

            {/* Glowing Progress Track */}
            <div
              className="w-full h-3 rounded-full overflow-hidden p-0.5"
              style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
              }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #007AFF 0%, #8B5CF6 50%, #10B981 100%)',
                  boxShadow: '0 0 10px rgba(0,122,255,0.5)',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>

            <div
              className="flex items-center justify-between text-[11px] font-medium"
              style={{ color: isDark ? '#64748B' : '#94A3B8' }}
            >
              <span>5 Thematic Worlds</span>
              <span className="font-mono font-bold text-amber-500 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{totalXp.toLocaleString()} XP Earned</span>
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── The 5 Thematic Worlds ── */}
        <div className="space-y-10">
          {COURSE_WORLDS.map((world, worldIdx) => {
            const WorldIcon = WORLD_ICON_MAP[world.iconName] || Binary;
            const isExpanded = !!expandedWorlds[world.id];

            // Compute lessons in this world
            const worldLessons: any[] = [];
            world.chapterNumbers.forEach((chNum) => {
              if (allLessonsByChapter[chNum]) {
                worldLessons.push(...allLessonsByChapter[chNum]);
              }
            });

            const worldTotal = worldLessons.length;
            const worldCompleted = worldLessons.filter((l) => completedLevelIds.includes(l.id)).length;
            const isWorldComplete = worldTotal > 0 && worldCompleted === worldTotal;
            const isWorldActive = world.chapterNumbers.includes(activeChapter);

            return (
              <motion.section
                key={world.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: worldIdx * 0.06 }}
                className="rounded-3xl border overflow-hidden transition-all duration-300"
                style={{
                  background: isDark ? 'rgba(13, 19, 33, 0.58)' : 'rgba(255, 255, 255, 0.72)',
                  backdropFilter: 'blur(28px) saturate(190%)',
                  WebkitBackdropFilter: 'blur(28px) saturate(190%)',
                  borderColor: isWorldActive
                    ? (isDark ? 'rgba(0,122,255,0.45)' : 'rgba(0,122,255,0.35)')
                    : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)'),
                  boxShadow: isDark
                    ? '0 20px 50px -15px rgba(0,0,0,0.70), inset 0 1px 0 0 rgba(255,255,255,0.22), inset 0 0 0 1px rgba(255,255,255,0.04)'
                    : '0 20px 48px -12px rgba(15,23,42,0.08), inset 0 1px 2px 0 rgba(255,255,255,1)',
                }}
              >
                {/* ── World Banner Header ── */}
                <div
                  onClick={() => toggleWorld(world.id)}
                  className="p-5 md:p-6 flex items-center justify-between gap-4 cursor-pointer select-none transition-colors"
                  style={{
                    background: isDark
                      ? (isWorldActive ? 'rgba(0,122,255,0.08)' : 'rgba(255,255,255,0.02)')
                      : (isWorldActive ? 'rgba(0,122,255,0.05)' : 'rgba(241,245,249,0.50)'),
                    borderBottom: isExpanded
                      ? (isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.06)')
                      : 'none',
                  }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {(() => {
                      const worldStyle = WORLD_ICON_STYLES[world.worldNumber] || WORLD_ICON_STYLES[1];
                      return (
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 transition-transform group-hover:scale-105"
                          style={{
                            background: isDark ? worldStyle.darkBg : worldStyle.lightBg,
                            border: isDark ? `1.5px solid ${worldStyle.border}` : '1.5px solid rgba(255,255,255,0.40)',
                            boxShadow: isDark
                              ? `0 0 20px ${worldStyle.glow}`
                              : `0 6px 18px ${worldStyle.glow}, 0 2px 4px rgba(0,0,0,0.10)`,
                            color: isDark ? worldStyle.color : '#FFFFFF',
                          }}
                        >
                          <WorldIcon
                            className="w-6 h-6 stroke-[2.2]"
                            style={{ filter: isDark ? 'none' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }}
                          />
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className="text-xs font-bold font-mono tracking-wider uppercase px-2 py-0.5 rounded-md"
                          style={{
                            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
                            color: world.accentColor,
                          }}
                        >
                          World {world.worldNumber}
                        </span>
                        {isWorldComplete && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Mastered</span>
                          </span>
                        )}
                        {isWorldActive && !isWorldComplete && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                            <PlayCircle className="w-3 h-3" />
                            <span>In Progress</span>
                          </span>
                        )}
                        <span
                          className="text-xs font-medium"
                          style={{ color: isDark ? '#64748B' : '#94A3B8' }}
                        >
                          Trophy: {world.rankReward}
                        </span>
                      </div>
                      <h2
                        className="text-lg md:text-xl font-bold tracking-tight truncate"
                        style={{ color: isDark ? '#F8FAFC' : '#020617' }}
                      >
                        {world.title}
                      </h2>
                      <p
                        className="text-xs mt-0.5 truncate hidden sm:block font-medium"
                        style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                      >
                        {world.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Progress & Accordion Toggle */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <div
                        className="text-xs font-mono font-bold"
                        style={{ color: isDark ? '#CBD5E1' : '#334155' }}
                      >
                        {worldCompleted}/{worldTotal} Lessons
                      </div>
                      <div
                        className="text-[11px] font-medium"
                        style={{ color: isDark ? '#64748B' : '#94A3B8' }}
                      >
                        {world.chapterNumbers.length} Chapter{world.chapterNumbers.length > 1 ? 's' : ''}
                      </div>
                    </div>
                    <button
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-200"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
                        color: isDark ? '#CBD5E1' : '#475569',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ── Chapters & Lessons Grid ── */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="p-5 md:p-6 space-y-8"
                    >
                      {world.chapterNumbers.map((chNum) => {
                        const chapterInfo = CHAPTERS.find((c) => c.num === chNum);
                        const lessons = allLessonsByChapter[chNum] || [];
                        const isCurrentChapter = activeChapter === chNum;

                        return (
                          <div key={chNum} className="space-y-3.5">
                            {/* Chapter Header Line */}
                            <div className="flex items-center justify-between pb-1.5 border-b"
                              style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' }}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-xs font-extrabold px-2 py-0.5 rounded-md"
                                  style={{
                                    background: isDark ? 'rgba(139,92,246,0.20)' : 'rgba(124,58,237,0.12)',
                                    color: isDark ? '#C4B5FD' : '#7C3AED',
                                  }}
                                >
                                  CH{chNum}
                                </span>
                                <h3
                                  className="text-sm font-bold tracking-tight"
                                  style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
                                >
                                  {chapterInfo?.title || `Chapter ${chNum}`}
                                </h3>
                                {isCurrentChapter && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    Current Chapter
                                  </span>
                                )}
                              </div>
                              <span
                                className="text-xs font-mono font-medium"
                                style={{ color: isDark ? '#64748B' : '#94A3B8' }}
                              >
                                {lessons.filter((l: any) => completedLevelIds.includes(l.id)).length}/{lessons.length} Passed
                              </span>
                            </div>

                            {/* Lesson Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {lessons.map((lesson: any) => {
                                const isCompleted = completedLevelIds.includes(lesson.id);
                                const isCurrent = activeChapter === chNum && activeLesson === lesson.lessonNumber;

                                return (
                                  <div
                                    key={lesson.id}
                                    id={`syllabus-lesson-${lesson.id}`}
                                    onClick={() => handleSelectLesson(chNum, lesson.lessonNumber, lesson.id)}
                                    className={`group rounded-2xl p-4 flex flex-col justify-between border cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-lg ${
                                      isCurrent
                                        ? 'ring-2 ring-blue-500 shadow-blue-500/10'
                                        : ''
                                    }`}
                                    style={{
                                      background: isCurrent
                                        ? (isDark ? 'rgba(0,122,255,0.12)' : 'rgba(0,122,255,0.06)')
                                        : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.65)'),
                                      borderColor: isCurrent
                                        ? '#007AFF'
                                        : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'),
                                    }}
                                  >
                                    <div>
                                      {/* Top Row: Lesson Number, Type, & Difficulty */}
                                      <div className="flex items-center justify-between mb-2.5">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span
                                            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold"
                                            style={{
                                              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
                                              color: isDark ? '#E2E8F0' : '#1E293B',
                                            }}
                                          >
                                            L{lesson.lessonNumber}
                                          </span>
                                          <LessonTypeBadge type={lesson.lessonType} isDark={isDark} />
                                          <DifficultyBadge difficulty={lesson.difficulty} isDark={isDark} />
                                        </div>

                                        {/* Status Indicator */}
                                        <div>
                                          {isCompleted ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                              <CheckCircle2 className="w-3 h-3" />
                                              <span>Passed</span>
                                            </span>
                                          ) : isCurrent ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                                              <PlayCircle className="w-3 h-3" />
                                              <span>Active</span>
                                            </span>
                                          ) : (
                                            <span
                                              className="text-[10px] font-bold flex items-center gap-0.5 group-hover:text-blue-500 transition-colors"
                                              style={{ color: isDark ? '#64748B' : '#94A3B8' }}
                                            >
                                              <span>Open</span>
                                              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Lesson Title */}
                                      <h4
                                        className="text-xs font-bold group-hover:text-blue-500 transition-colors line-clamp-2 leading-snug mb-1.5"
                                        style={{ color: isDark ? '#F8FAFC' : '#020617' }}
                                      >
                                        {lesson.title}
                                      </h4>
                                    </div>

                                    {/* Footer: Time + XP */}
                                    <div
                                      className="pt-2.5 mt-2 border-t flex items-center justify-between text-[11px]"
                                      style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)' }}
                                    >
                                      <div
                                        className="flex items-center gap-1 font-medium"
                                        style={{ color: isDark ? '#64748B' : '#94A3B8' }}
                                      >
                                        <Clock className="w-3 h-3" />
                                        <span>{lesson.estimatedMinutes || 15} min</span>
                                      </div>

                                      <div className="flex items-center gap-1 font-mono font-bold text-amber-500">
                                        <Sparkles className="w-3 h-3 fill-amber-500/20" />
                                        <span>+{lesson.xpReward || 100} XP</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

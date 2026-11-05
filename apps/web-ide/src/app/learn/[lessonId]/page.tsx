'use client';

import React, { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Lock, ArrowRight } from 'lucide-react';
import { BootDevTopBar } from '../../../components/navigation/BootDevTopBar';
import { checkLessonAccessById } from '../../../lib/curriculumAccess';
import { LessonSplitView } from '../../../components/workspace/LessonSplitView';
import { CapstoneStudioView } from '../../../components/workspace/CapstoneStudioView';
import { CurriculumWorldMap } from '../../../components/curriculum/CurriculumWorldMap';
import { ReferencesVaultView } from '../../../components/references/ReferencesVaultView';
import { GlassWorkspace } from '../../../components/workspace/GlassWorkspace';
import { CommandPalette } from '../../../components/workspace/CommandPalette';
import { BadgeCelebrationModal } from '../../../components/workspace/BadgeCelebrationModal';
import { LessonSuccessToast } from '../../../components/workspace/LessonSuccessToast';
import { useWorkspaceStore } from '../../../state/useWorkspaceStore';
import { wsMux } from '../../../lib/ws-multiplexer';
import { getLessonByChapterAndNum, getLessonById } from '../../../data/curriculumCatalog';

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const rawLessonId = params?.lessonId as string | undefined;

  const {
    activeView,
    setActiveView,
    runVerificationSuite,
    bootDevView,
    setBootDevView,
    activeChapter,
    activeLesson,
    activeExerciseId,
    switchExercise,
    theme,
    currentUser,
    completedLevelIds,
    devModeUnlockedAll,
    celebrationBadge,
    isBadgeCelebrationOpen,
    closeBadgeCelebration,
    hydrateFromStorageAndDb,
  } = useWorkspaceStore();

  const isDark = theme === 'dark';

  // Client-side hydration of user progress from localStorage & Neon DB
  useEffect(() => {
    hydrateFromStorageAndDb();
  }, [hydrateFromStorageAndDb]);

  // Check if current route lesson is unlocked
  const currentAccess = useMemo(() => {
    if (!rawLessonId) return { isUnlocked: true };
    return checkLessonAccessById(rawLessonId, completedLevelIds, devModeUnlockedAll);
  }, [rawLessonId, completedLevelIds, devModeUnlockedAll]);

  // Sync route params with store state (responds strictly to URL changes, preventing bounce loops)
  useEffect(() => {
    if (rawLessonId) {
      switchExercise(rawLessonId);
      setBootDevView('lesson');
      try {
        localStorage.setItem('beamforge_active_exercise', rawLessonId);
      } catch {}
    }
  }, [rawLessonId, switchExercise, setBootDevView]);

  // Connect WebSocket & keyboard shortcuts
  useEffect(() => {
    wsMux.connect();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Enter / Ctrl+Enter → Submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runVerificationSuite(rawLessonId);
      }
      // Cmd+M / Ctrl+M → Jump to Syllabus
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        router.push('/syllabus');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runVerificationSuite, router]);

  // Lookup active lesson from catalog
  const currentLesson = useMemo(() => {
    if (rawLessonId) {
      const fromId = getLessonById(rawLessonId);
      if (fromId) return fromId;
    }
    return (
      getLessonByChapterAndNum(activeChapter, activeLesson) ||
      getLessonById(activeExerciseId) ||
      getLessonById('ch01-l01')!
    );
  }, [rawLessonId, activeChapter, activeLesson, activeExerciseId]);

  // Render content based on active view and chapter
  const renderContent = () => {
    if (activeView === 'curriculum_map' || bootDevView === 'syllabus') {
      return <CurriculumWorldMap />;
    }
    if (activeView === 'references') {
      return <ReferencesVaultView />;
    }
    if (activeChapter === 12 || rawLessonId?.startsWith('ch12-')) {
      return <CapstoneStudioView key={currentLesson.id} />;
    }
    return <LessonSplitView key={currentLesson.id} lesson={currentLesson} />;
  };

  return (
    <main className="flex h-screen h-dvh w-screen overflow-hidden relative bg-[#E8ECF2] dark:bg-[#060810] text-[#0A0F1E] dark:text-[#F0F4FC] transition-colors duration-300">
      {/* Top Floating Glass Bar */}
      <BootDevTopBar />

      {/* Locked Lesson Warning Banner for direct URL navigation */}
      {!currentAccess.isUnlocked && currentAccess.prerequisite && (
        <div
          id="locked-lesson-banner"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl shadow-xl animate-slide-down border transition-all duration-300 max-w-2xl w-[92vw] sm:w-auto"
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.94)',
            borderColor: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.40)',
            backdropFilter: 'blur(24px)',
            boxShadow: isDark
              ? '0 16px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(245, 158, 11, 0.15)'
              : '0 12px 30px rgba(15, 23, 42, 0.10), 0 0 15px rgba(245, 158, 11, 0.12)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-500">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 truncate">
              <strong className="font-bold text-amber-600 dark:text-amber-400">Locked Lesson Preview: </strong>
              <span className="opacity-90">{currentAccess.prerequisite.message}</span>
            </p>
          </div>

          <button
            onClick={() => router.push(`/learn/${currentAccess.prerequisite!.prereqLessonId}`)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            }}
          >
            <span>Go to Prerequisite</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex-1 h-full w-full overflow-hidden">
        {renderContent()}
      </div>

      {/* Legacy Inspector Workspace if opened */}
      {activeView === 'inspector' && (
        <div className="absolute inset-0 z-20 pt-14">
          <GlassWorkspace />
        </div>
      )}

      {/* Command Palette */}
      <CommandPalette />

      {/* Lesson Success Floating Toast */}
      <LessonSuccessToast />

      {/* Badge Celebration Modal */}
      {isBadgeCelebrationOpen && celebrationBadge && (
        <BadgeCelebrationModal
          badge={celebrationBadge}
          isUnlocked={true}
          userName={currentUser?.name || 'Explorer'}
          userRole={currentUser?.role || 'BEAM Newcomer'}
          userLevel={currentUser?.level || 1}
          isDark={theme === 'dark'}
          onClose={closeBadgeCelebration}
        />
      )}
    </main>
  );
}

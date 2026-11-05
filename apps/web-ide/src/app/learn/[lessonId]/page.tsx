'use client';

import React, { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BootDevTopBar } from '../../../components/navigation/BootDevTopBar';
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
    celebrationBadge,
    isBadgeCelebrationOpen,
    closeBadgeCelebration,
  } = useWorkspaceStore();

  // Sync route params with store state
  useEffect(() => {
    if (rawLessonId) {
      if (activeExerciseId !== rawLessonId) {
        switchExercise(rawLessonId);
      }
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
        runVerificationSuite();
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
      return <CapstoneStudioView />;
    }
    return <LessonSplitView lesson={currentLesson} />;
  };

  return (
    <main className="flex h-screen h-dvh w-screen overflow-hidden relative bg-[#E8ECF2] dark:bg-[#060810] text-[#0A0F1E] dark:text-[#F0F4FC] transition-colors duration-300">
      {/* Top Floating Glass Bar */}
      <BootDevTopBar />

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

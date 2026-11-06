'use client';

import React, { useEffect } from 'react';
import { BootDevTopBar } from '../../components/navigation/BootDevTopBar';
import { CurriculumWorldMap } from '../../components/curriculum/CurriculumWorldMap';
import { CommandPalette } from '../../components/workspace/CommandPalette';
import { BadgeCelebrationModal } from '../../components/workspace/BadgeCelebrationModal';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { wsMux } from '../../lib/ws-multiplexer';

export default function SyllabusPage() {
  const {
    theme,
    setBootDevView,
    currentUser,
    celebrationBadge,
    isBadgeCelebrationOpen,
    closeBadgeCelebration,
    hydrateFromStorageAndDb,
  } = useWorkspaceStore();

  useEffect(() => {
    setBootDevView('syllabus');
    wsMux.connect();
    hydrateFromStorageAndDb();
  }, [setBootDevView, hydrateFromStorageAndDb]);

  return (
    <main className="flex h-screen h-dvh w-screen overflow-hidden relative bg-[#E8ECF2] dark:bg-[#060810] text-[#0A0F1E] dark:text-[#F0F4FC] transition-colors duration-300">
      {/* Top Floating Glass Bar */}
      <BootDevTopBar />

      {/* Main World Map */}
      <div className="flex-1 h-full w-full overflow-hidden">
        <CurriculumWorldMap />
      </div>

      {/* Command Palette */}
      <CommandPalette />

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


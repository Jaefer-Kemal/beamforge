'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';

export default function LearnIndexPage() {
  const router = useRouter();
  const { activeExerciseId } = useWorkspaceStore();

  useEffect(() => {
    let target = 'ch01-l01';
    try {
      const stored = localStorage.getItem('beamforge_active_exercise');
      if (stored) {
        target = stored;
      } else if (activeExerciseId) {
        target = activeExerciseId;
      }
    } catch {}

    router.replace(`/learn/${target}`);
  }, [router, activeExerciseId]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#E8ECF2] dark:bg-[#060810] text-slate-500 font-mono text-xs">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        <span>Loading BEAM Sandbox...</span>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronRight, Zap, X } from 'lucide-react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';

export const LessonSuccessToast: React.FC = () => {
  const router = useRouter();
  const {
    isSuccessToastOpen,
    successToastData,
    closeSuccessToast,
    theme,
    setActiveChapter,
    setActiveLesson,
    switchExercise,
    setBootDevView,
  } = useWorkspaceStore();

  const isDark = theme === 'dark';

  const handleProceed = useCallback(() => {
    if (!successToastData?.nextLessonId) return;

    if (successToastData.nextChapterNum) {
      setActiveChapter(successToastData.nextChapterNum);
    }
    if (successToastData.nextLessonNum) {
      setActiveLesson(successToastData.nextLessonNum);
    }
    switchExercise(successToastData.nextLessonId);
    setBootDevView('lesson');
    closeSuccessToast();
    router.push(`/learn/${successToastData.nextLessonId}`);
  }, [successToastData, setActiveChapter, setActiveLesson, switchExercise, setBootDevView, closeSuccessToast, router]);

  // Keyboard shortcut: Press Enter to proceed (if not focused on an input/monaco textarea)
  useEffect(() => {
    if (!isSuccessToastOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        const activeEl = document.activeElement;
        const isEditing =
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.getAttribute('contenteditable') === 'true' ||
            activeEl.closest('.monaco-editor'));

        if (!isEditing) {
          e.preventDefault();
          handleProceed();
        }
      } else if (e.key === 'Escape') {
        closeSuccessToast();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSuccessToastOpen, handleProceed, closeSuccessToast]);

  if (!isSuccessToastOpen || !successToastData || !successToastData.nextLessonId) {
    return null;
  }

  const { xpAwarded, nextLessonTitle, isNewChapter, nextChapterNum, nextLessonNum } = successToastData;

  return (
    <div
      id="lesson-success-toast"
      className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 rounded-2xl max-w-xl w-[92vw] sm:w-auto glass-floating animate-slide-up transition-all duration-300"
      style={{
        background: isDark ? 'rgba(12, 18, 35, 0.65)' : 'rgba(255, 255, 255, 0.70)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(36px) saturate(210%)',
        WebkitBackdropFilter: 'blur(36px) saturate(210%)',
        boxShadow: isDark
          ? '0 24px 60px rgba(0, 0, 0, 0.70), 0 0 30px rgba(16, 185, 129, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.30), inset 0 -1px 0 rgba(0, 0, 0, 0.40)'
          : '0 20px 50px rgba(15, 23, 42, 0.14), 0 0 25px rgba(16, 185, 129, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.95), inset 0 -1px 0 rgba(15, 23, 42, 0.05)',
      }}
    >
      <div className="flex items-center justify-between gap-3 flex-1 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Emerald Icon */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 flex-shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>

          {/* Info Message */}
          <div className="flex flex-col min-w-0 pr-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {isNewChapter ? 'Chapter Complete!' : 'Lesson Complete!'}
              </span>
              {xpAwarded > 0 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                  <Zap className="w-2.5 h-2.5" />
                  +{xpAwarded} XP
                </span>
              )}
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-[220px] sm:max-w-xs md:max-w-sm">
              <span className="opacity-60">Up next: </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {isNewChapter ? `CH${nextChapterNum}: ` : `L${nextLessonNum}: `}
                {nextLessonTitle}
              </span>
            </p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={closeSuccessToast}
          title="Stay on this lesson"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer sm:hidden flex-shrink-0"
          style={{ background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          id="proceed-next-lesson-btn"
          onClick={handleProceed}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer transition-all hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.40)',
          }}
        >
          <span>{isNewChapter ? 'Next Chapter' : 'Next Lesson'}</span>
          <ChevronRight className="w-3.5 h-3.5" />
          <kbd className="hidden md:inline-block ml-1 px-1.5 py-0.2 bg-black/20 rounded text-[9px] font-mono tracking-tighter opacity-80">
            ↵
          </kbd>
        </button>

        {/* Desktop close button */}
        <button
          onClick={closeSuccessToast}
          title="Stay on this lesson"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer hidden sm:block"
          style={{ background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};


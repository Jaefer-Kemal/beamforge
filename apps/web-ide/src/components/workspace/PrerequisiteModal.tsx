'use client';

import React from 'react';
import { Lock, X, ArrowRight, Eye, ShieldAlert, BookOpen } from 'lucide-react';

export interface PrerequisiteModalProps {
  isOpen: boolean;
  type?: 'same_chapter' | 'previous_chapter';
  targetChapterNum: number;
  targetChapterTitle: string;
  targetLessonNum?: number;
  targetLessonTitle?: string;
  prerequisiteChapterNum: number;
  prerequisiteLessonId: string;
  prerequisiteLessonTitle?: string;
  prerequisiteLessonNum?: number;
  message?: string;
  isDark: boolean;
  onClose: () => void;
  onGoToPrerequisite: (lessonId: string) => void;
  onJumpInAnyway: () => void;
}

export const PrerequisiteModal: React.FC<PrerequisiteModalProps> = ({
  isOpen,
  type = 'previous_chapter',
  targetChapterNum,
  targetChapterTitle,
  targetLessonNum,
  targetLessonTitle,
  prerequisiteChapterNum,
  prerequisiteLessonId,
  prerequisiteLessonTitle,
  prerequisiteLessonNum,
  message,
  isDark,
  onClose,
  onGoToPrerequisite,
  onJumpInAnyway,
}) => {
  if (!isOpen) return null;

  const isSameChapter = type === 'same_chapter' || prerequisiteChapterNum === targetChapterNum;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-scale-up"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
          border: isDark ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(124, 58, 237, 0.30)',
          boxShadow: isDark
            ? '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(139, 92, 246, 0.20)'
            : '0 20px 50px rgba(0, 0, 0, 0.12), 0 0 30px rgba(139, 92, 246, 0.12)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          style={{ background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)' }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Icon & Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner"
            style={{
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              color: '#A78BFA',
            }}
          >
            <Lock className="w-5 h-5 text-purple-400" />
          </div>
          <div className="pr-6">
            <h3
              className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100"
            >
              {isSameChapter
                ? `Lesson ${targetLessonNum || 1} is Locked`
                : `Chapter ${targetChapterNum} Prerequisite`}
            </h3>
            <p
              className="text-xs font-medium mt-0.5"
              style={{ color: isDark ? '#C4B5FD' : '#7C3AED' }}
            >
              {isSameChapter
                ? targetLessonTitle || `Chapter ${targetChapterNum} • ${targetChapterTitle}`
                : `Chapter ${targetChapterNum}: ${targetChapterTitle}`}
            </p>
          </div>
        </div>

        {/* Body Description */}
        <div
          className="rounded-xl p-3.5 mb-5 text-xs leading-relaxed"
          style={{
            background: isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(124, 58, 237, 0.05)',
            border: isDark ? '1px solid rgba(139, 92, 246, 0.20)' : '1px solid rgba(124, 58, 237, 0.20)',
            color: isDark ? '#E2E8F0' : '#334155',
          }}
        >
          {message ||
            (isSameChapter
              ? `This lesson requires mastering the concepts introduced in Lesson ${prerequisiteLessonNum || 1} first. Complete the earlier lessons in Chapter ${targetChapterNum} to unlock it.`
              : `Chapter ${targetChapterNum} builds directly upon concepts from Chapter ${prerequisiteChapterNum}. Complete the Chapter ${prerequisiteChapterNum} Problem Set before advancing.`)}
        </div>

        {/* Action Choices */}
        <div className="flex flex-col gap-2.5">
          {/* Prerequisite Jump Button */}
          <button
            onClick={() => {
              onGoToPrerequisite(prerequisiteLessonId);
              onClose();
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:brightness-110 shadow-md text-white"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
            }}
          >
            <div className="flex items-center gap-2 truncate pr-2">
              {isSameChapter ? (
                <BookOpen className="w-4 h-4 text-blue-200 flex-shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-blue-200 flex-shrink-0" />
              )}
              <span className="truncate">
                {isSameChapter
                  ? `Go to Lesson ${prerequisiteLessonNum || 1}: ${prerequisiteLessonTitle || 'Prerequisite'}`
                  : `Complete CH${prerequisiteChapterNum} Problem Set`}
              </span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
          </button>

          {/* Jump In Anyway (Tester Mode) */}
          <button
            onClick={() => {
              onJumpInAnyway();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:bg-slate-500/10"
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
              color: isDark ? '#94A3B8' : '#64748B',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid rgba(15, 23, 42, 0.10)',
            }}
          >
            <Eye className="w-3.5 h-3.5 opacity-70" />
            <span>Preview Lesson Anyway (Explorer Mode)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

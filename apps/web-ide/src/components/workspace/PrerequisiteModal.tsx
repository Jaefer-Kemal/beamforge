'use client';

import React from 'react';
import { Lock, X, ArrowRight, Eye, ShieldAlert } from 'lucide-react';

interface PrerequisiteModalProps {
  isOpen: boolean;
  targetChapterNum: number;
  targetChapterTitle: string;
  prerequisiteChapterNum: number;
  prerequisiteLessonId: string;
  isDark: boolean;
  onClose: () => void;
  onGoToPrerequisite: (lessonId: string) => void;
  onJumpInAnyway: () => void;
}

export const PrerequisiteModal: React.FC<PrerequisiteModalProps> = ({
  isOpen,
  targetChapterNum,
  targetChapterTitle,
  prerequisiteChapterNum,
  prerequisiteLessonId,
  isDark,
  onClose,
  onGoToPrerequisite,
  onJumpInAnyway,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
          border: isDark ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(124, 58, 237, 0.30)',
          boxShadow: isDark
            ? '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(139, 92, 246, 0.15)'
            : '0 20px 50px rgba(0, 0, 0, 0.12), 0 0 30px rgba(139, 92, 246, 0.10)',
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
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              color: '#A78BFA',
            }}
          >
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3
              className="text-base font-bold tracking-tight"
              style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
            >
              Chapter {targetChapterNum} Prerequisite
            </h3>
            <p
              className="text-xs font-medium mt-0.5"
              style={{ color: isDark ? '#C4B5FD' : '#7C3AED' }}
            >
              {targetChapterTitle}
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
          Chapter {targetChapterNum} builds directly upon concepts from Chapter {prerequisiteChapterNum}.
          We strongly recommend mastering the Chapter {prerequisiteChapterNum} Problem Set before advancing.
        </div>

        {/* Action Choices */}
        <div className="flex flex-col gap-2">
          {/* Fast-Track Button */}
          <button
            onClick={() => {
              onGoToPrerequisite(prerequisiteLessonId);
              onClose();
            }}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all hover:brightness-110 shadow-md"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
            }}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-200" />
              <span>Fast-Track to CH{prerequisiteChapterNum} Problem Set</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5" />
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
            <span>Jump In Anyway (Preview / Tester Mode)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

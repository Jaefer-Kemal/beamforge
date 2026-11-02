'use client';

import React from 'react';
import { Eye, ShieldAlert, X } from 'lucide-react';

interface SolutionUnlockModalProps {
  isOpen: boolean;
  fileName: string;
  isDark: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const SolutionUnlockModal: React.FC<SolutionUnlockModalProps> = ({
  isOpen,
  fileName,
  isDark,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.96)',
          border: isDark ? '1px solid rgba(245, 158, 11, 0.30)' : '1px solid rgba(245, 158, 11, 0.40)',
          boxShadow: isDark
            ? '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(245, 158, 11, 0.15)'
            : '0 20px 50px rgba(0, 0, 0, 0.15), 0 0 30px rgba(245, 158, 11, 0.10)',
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
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#F59E0B',
            }}
          >
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3
              className="text-base font-bold tracking-tight"
              style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
            >
              Unlock Reference Solution?
            </h3>
            <p
              className="text-xs font-mono font-medium mt-0.5"
              style={{ color: isDark ? '#FCD34D' : '#D97706' }}
            >
              Target: {fileName}
            </p>
          </div>
        </div>

        {/* Warning Text */}
        <div
          className="rounded-xl p-3.5 mb-5 text-xs leading-relaxed"
          style={{
            background: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.06)',
            border: isDark ? '1px solid rgba(245, 158, 11, 0.20)' : '1px solid rgba(245, 158, 11, 0.25)',
            color: isDark ? '#E2E8F0' : '#334155',
          }}
        >
          Viewing the verified OTP 29 reference solution will forfeit your completion XP reward for this exercise.
          Your current code editor will remain completely untouched, and you will be able to inspect the reference code in the bottom drawer.
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
              color: isDark ? '#E2E8F0' : '#1E293B',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.12)',
            }}
          >
            Keep Trying
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
            }}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Unlock Solution (Forfeit XP)</span>
          </button>
        </div>
      </div>
    </div>
  );
};


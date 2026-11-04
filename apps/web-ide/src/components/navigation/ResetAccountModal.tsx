'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

interface ResetAccountModalProps {
  isOpen: boolean;
  userName: string;
  isDark: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ResetAccountModal: React.FC<ResetAccountModalProps> = ({
  isOpen,
  userName,
  isDark,
  onClose,
  onConfirm,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const targetPhrase = 'RESET PROGRESS';
  const isMatch = confirmText.trim().toUpperCase() === targetPhrase;

  if (!isOpen) return null;

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  const handleConfirm = () => {
    if (!isMatch) return;
    onConfirm();
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
          border: isDark ? '1px solid rgba(244, 63, 94, 0.40)' : '1px solid rgba(244, 63, 94, 0.45)',
          boxShadow: isDark
            ? '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(244, 63, 94, 0.20)'
            : '0 20px 50px rgba(0, 0, 0, 0.15), 0 0 30px rgba(244, 63, 94, 0.15)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
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
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              color: '#F43F5E',
            }}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3
              className="text-base font-bold tracking-tight"
              style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
            >
              Reset Account & Wipe Progress?
            </h3>
            <p
              className="text-xs font-mono font-medium mt-0.5"
              style={{ color: isDark ? '#FDA4AF' : '#E11D48' }}
            >
              Target Profile: {userName}
            </p>
          </div>
        </div>

        {/* Warning Body */}
        <div
          className="rounded-xl p-3.5 mb-4 text-xs leading-relaxed"
          style={{
            background: isDark ? 'rgba(244, 63, 94, 0.08)' : 'rgba(244, 63, 94, 0.06)',
            border: isDark ? '1px solid rgba(244, 63, 94, 0.20)' : '1px solid rgba(244, 63, 94, 0.25)',
            color: isDark ? '#E2E8F0' : '#334155',
          }}
        >
          This action is permanent and cannot be undone. All earned XP, completed exercise badges,
          and unlocked solutions for <span className="font-bold">{userName}</span> will be permanently reset to 0 in both the cloud database and your browser cache.
        </div>

        {/* Safety Text Input */}
        <div className="mb-5 space-y-1.5">
          <label
            htmlFor="reset-confirm-input"
            className="block text-xs font-semibold"
            style={{ color: isDark ? '#CBD5E1' : '#475569' }}
          >
            To confirm, please type <span className="font-mono text-rose-500 font-bold">{targetPhrase}</span> below:
          </label>
          <input
            id="reset-confirm-input"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="RESET PROGRESS"
            className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold tracking-wider outline-none transition-all"
            style={{
              background: isDark ? 'rgba(0, 0, 0, 0.40)' : 'rgba(241, 245, 249, 0.90)',
              border: isMatch
                ? '1px solid rgba(244, 63, 94, 0.80)'
                : isDark
                ? '1px solid rgba(255, 255, 255, 0.15)'
                : '1px solid rgba(0, 0, 0, 0.15)',
              color: isDark ? '#FFFFFF' : '#0F172A',
              boxShadow: isMatch ? '0 0 10px rgba(244, 63, 94, 0.30)' : 'none',
            }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
              color: isDark ? '#E2E8F0' : '#1E293B',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.12)',
            }}
          >
            Keep My Progress
          </button>
          <button
            id="confirm-reset-btn"
            onClick={handleConfirm}
            disabled={!isMatch}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              isMatch
                ? 'cursor-pointer hover:brightness-110 shadow-lg'
                : 'cursor-not-allowed opacity-40'
            }`}
            style={{
              background: 'linear-gradient(135deg, #F43F5E 0%, #BE123C 100%)',
              color: '#FFFFFF',
              boxShadow: isMatch ? '0 4px 14px rgba(244, 63, 94, 0.40)' : 'none',
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Permanently Reset (0 XP)</span>
          </button>
        </div>
      </div>
    </div>
  );
};


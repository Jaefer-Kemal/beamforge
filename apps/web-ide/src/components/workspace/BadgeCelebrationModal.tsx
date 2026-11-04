'use client';

import React, { useState } from 'react';
import {
  X,
  Share2,
  Check,
  Lock,
  Sparkles,
  RotateCcw,
  Layers,
  Cpu,
  Zap,
  ShieldAlert,
  Server,
  GitFork,
  Database,
  Network,
  Radio,
  Award,
  Flame,
  AlertTriangle,
} from 'lucide-react';
import { Badge, RARITY_STYLES } from '../../types/badges';

interface BadgeCelebrationModalProps {
  badge: Badge | null;
  isUnlocked: boolean;
  userName: string;
  userRole: string;
  userLevel: number;
  isDark: boolean;
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles,
  RotateCcw,
  Layers,
  Cpu,
  Zap,
  ShieldAlert,
  Server,
  GitFork,
  Database,
  Network,
  Radio,
  Award,
  Flame,
  AlertTriangle,
};

export const BadgeCelebrationModal: React.FC<BadgeCelebrationModalProps> = ({
  badge,
  isUnlocked,
  userName,
  userRole,
  userLevel,
  isDark,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!badge) return null;

  const IconComponent = ICON_MAP[badge.iconName] || Award;
  const style = RARITY_STYLES[badge.rarity];

  const handleCopyShareCard = async () => {
    const textToCopy = `BeamForge Achievement Badge: ${badge.title}
Rank: ${style.name} Tier
Earner: ${userName} (Level ${userLevel} • ${userRole})
Description: ${badge.description}
Mastering Erlang/OTP & XMPP Distributed Systems`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      }
    } catch (err) {
      console.warn('Clipboard write warning:', err);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div id="badge-celebration-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center animate-scale-up"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)',
          border: isDark ? `1px solid ${style.border}` : `1px solid ${style.border}`,
          boxShadow: isDark
            ? `0 24px 60px rgba(0, 0, 0, 0.85), ${style.glow}`
            : `0 20px 50px rgba(15, 23, 42, 0.15), ${style.glow}`,
          backdropFilter: 'blur(36px)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          style={{ background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)' }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ambient Top Glow */}
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-44 h-44 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ background: style.text }}
        />

        {/* Central Emblem */}
        <div className="relative mt-4 mb-4">
          <div
            className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-all ${
              isUnlocked ? 'animate-bounce-subtle' : 'opacity-50 grayscale'
            }`}
            style={{
              background: style.bg,
              border: `2px solid ${style.border}`,
              boxShadow: isUnlocked ? style.glow : 'none',
            }}
          >
            <IconComponent
              className="w-12 h-12 transition-transform hover:scale-110"
              style={{ color: isUnlocked ? style.text : '#94A3B8' }}
            />
          </div>

          {!isUnlocked && (
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 shadow-md">
              <Lock className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Rarity Pill */}
        <div className={`px-3 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider mb-2 ${style.badgePill}`}>
          {style.name} · {badge.category.toUpperCase()}
        </div>

        {/* Badge Title */}
        <h2
          id="celebration-badge-title"
          className="text-lg font-black tracking-tight"
          style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}
        >
          {badge.title}
        </h2>

        {/* Criteria / Status */}
        <p
          className="text-xs font-semibold mt-1 mb-3"
          style={{ color: isUnlocked ? style.text : (isDark ? '#94A3B8' : '#64748B') }}
        >
          {isUnlocked ? 'Achievement Unlocked' : badge.criteria}
        </p>

        {/* Description Card */}
        <div
          className="w-full rounded-2xl p-3.5 mb-5 text-xs leading-relaxed text-left"
          style={{
            background: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.04)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
            color: isDark ? '#CBD5E1' : '#334155',
          }}
        >
          {badge.description}
        </div>

        {/* Learner Info Footer */}
        <div className="w-full flex items-center justify-between text-[11px] mb-5 px-1 opacity-75 font-mono"
          style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
          <span>{userName}</span>
          <span>Lv{userLevel} · {userRole}</span>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex items-center gap-2">
          {isUnlocked && (
            <button
              onClick={handleCopyShareCard}
              id="copy-badge-btn"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md hover:brightness-110"
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                color: '#FFFFFF',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              }}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Card!' : 'Share Badge'}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className={`py-2.5 px-4 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              isUnlocked ? 'flex-shrink-0' : 'w-full'
            }`}
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
              color: isDark ? '#E2E8F0' : '#1E293B',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.12)',
            }}
          >
            {isUnlocked ? 'Done' : 'Back to Exercises'}
          </button>
        </div>
      </div>
    </div>
  );
};

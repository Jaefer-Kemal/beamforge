'use client';

import React, { useEffect, useState } from 'react';
import {
  Trophy,
  X,
  Flame,
  Zap,
  CheckCircle2,
  RefreshCw,
  Award,
  Lock,
  Sparkles,
  RotateCcw,
  Layers,
  Cpu,
  ShieldAlert,
  Server,
  GitFork,
  Database,
  Network,
  Radio,
  AlertTriangle,
} from 'lucide-react';
import { BADGE_CATALOG, getUserBadgesSummary, RARITY_STYLES, Badge } from '../../types/badges';
import { BadgeCelebrationModal } from './BadgeCelebrationModal';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';

interface LeaderboardEntry {
  id: string;
  name: string;
  role: string;
  level: number;
  totalXp: number;
  streakDays: number;
  completedCount: number;
}

interface LeaderboardDrawerProps {
  isOpen: boolean;
  currentUserId: string;
  isDark: boolean;
  initialTab?: 'rankings' | 'badges';
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

export const LeaderboardDrawer: React.FC<LeaderboardDrawerProps> = ({
  isOpen,
  currentUserId,
  isDark,
  initialTab = 'rankings',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'rankings' | 'badges'>(initialTab);
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const { currentUser, completedLevelIds, totalXp } = useWorkspaceStore();

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/user-progress?mode=leaderboard');
      if (res.ok) {
        const data = await res.json();
        setEntries(data.leaderboard || []);
        setIsDbConnected(!!data.dbConnected);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
      if (initialTab) setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const badgesSummary = getUserBadgesSummary(currentUser, completedLevelIds);
  const displayedBadges = BADGE_CATALOG.filter((b) => {
    const isUnlocked = badgesSummary.unlocked.some((u) => u.id === b.id);
    if (badgeFilter === 'unlocked') return isUnlocked;
    if (badgeFilter === 'locked') return !isUnlocked;
    return true;
  });

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
        <div
          className="w-full max-w-md h-full flex flex-col shadow-2xl relative overflow-hidden animate-slide-left"
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)',
            borderLeft: isDark ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid rgba(15, 23, 42, 0.10)',
          }}
        >
          {/* Header */}
          <div
            className="p-5 border-b flex items-center justify-between"
            style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: activeTab === 'rankings' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                  border: activeTab === 'rankings' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(139, 92, 246, 0.35)',
                  color: activeTab === 'rankings' ? '#F59E0B' : '#A78BFA',
                }}
              >
                {activeTab === 'rankings' ? <Trophy className="w-5 h-5" /> : <Award className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-base font-bold tracking-tight" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  {activeTab === 'rankings' ? 'Global Leaderboard' : 'Badges & Trophies'}
                </h2>
                <div className="flex items-center gap-2 text-[11px] font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  <span>{isDbConnected ? 'Neon Serverless Live' : 'Local Preset State'}</span>
                  <span>•</span>
                  <span>{activeTab === 'rankings' ? 'Updated in real-time' : `${badgesSummary.unlockedCount} of ${badgesSummary.total} Unlocked`}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {activeTab === 'rankings' && (
                <button
                  onClick={fetchLeaderboard}
                  disabled={isLoading}
                  title="Refresh Leaderboard"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  style={{ background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)' }}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                style={{ background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Navigation Dual-Tabs */}
          <div
            className="px-5 pt-3 border-b flex items-center gap-2"
            style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)' }}
          >
            <button
              id="drawer-tab-rankings"
              onClick={() => setActiveTab('rankings')}
              className="flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer"
              style={{
                borderColor: activeTab === 'rankings' ? '#F59E0B' : 'transparent',
                color: activeTab === 'rankings' ? (isDark ? '#F59E0B' : '#D97706') : (isDark ? '#94A3B8' : '#64748B'),
              }}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Rankings</span>
            </button>

            <button
              id="drawer-tab-badges"
              onClick={() => setActiveTab('badges')}
              className="flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer"
              style={{
                borderColor: activeTab === 'badges' ? '#8B5CF6' : 'transparent',
                color: activeTab === 'badges' ? (isDark ? '#C4B5FD' : '#7C3AED') : (isDark ? '#94A3B8' : '#64748B'),
              }}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Badges & Trophies</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-purple-500/20 text-purple-400">
                {badgesSummary.unlockedCount}/{badgesSummary.total}
              </span>
            </button>
          </div>

          {/* TAB 1: RANKINGS */}
          {activeTab === 'rankings' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Podium Summary */}
              {entries.length >= 3 && (
                <div
                  className="p-4 border-b grid grid-cols-3 gap-2 text-center"
                  style={{
                    background: isDark ? 'rgba(30, 41, 59, 0.30)' : 'rgba(241, 245, 249, 0.50)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
                  }}
                >
                  {/* 2nd Place */}
                  <div className="flex flex-col items-center pt-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-slate-400/20 text-slate-300 border border-slate-400/30 mb-1">
                      2
                    </span>
                    <span className="text-xs font-bold truncate max-w-[90px]" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                      {entries[1]?.name.split(' ')[0]}
                    </span>
                    <span className="text-[11px] font-mono text-amber-500 font-bold">
                      {entries[1]?.totalXp.toLocaleString()} XP
                    </span>
                  </div>

                  {/* 1st Place */}
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40 mb-1 shadow-md shadow-amber-500/20">
                      <Trophy className="w-4 h-4 text-amber-400" />
                    </div>
                    <span className="text-xs font-extrabold truncate max-w-[100px] text-amber-400">
                      {entries[0]?.name.split(' ')[0]}
                    </span>
                    <span className="text-xs font-mono text-amber-500 font-bold">
                      {entries[0]?.totalXp.toLocaleString()} XP
                    </span>
                  </div>

                  {/* 3rd Place */}
                  <div className="flex flex-col items-center pt-4">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-amber-700/20 text-amber-600 border border-amber-700/30 mb-1">
                      3
                    </span>
                    <span className="text-xs font-bold truncate max-w-[90px]" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                      {entries[2]?.name.split(' ')[0]}
                    </span>
                    <span className="text-[11px] font-mono text-amber-500 font-bold">
                      {entries[2]?.totalXp.toLocaleString()} XP
                    </span>
                  </div>
                </div>
              )}

              {/* Leaderboard List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {entries.map((entry, idx) => {
                  const rank = idx + 1;
                  const isSelf = entry.id === currentUserId;

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 rounded-xl transition-all"
                      style={{
                        background: isSelf
                          ? (isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.10)')
                          : (isDark ? 'rgba(30, 41, 59, 0.40)' : 'rgba(248, 250, 252, 0.80)'),
                        border: isSelf
                          ? '1px solid rgba(59, 130, 246, 0.40)'
                          : (isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(15, 23, 42, 0.05)'),
                      }}
                    >
                      {/* Rank & User Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-6 text-center font-mono font-extrabold text-xs ${
                            rank === 1
                              ? 'text-amber-400'
                              : rank === 2
                              ? 'text-slate-300'
                              : rank === 3
                              ? 'text-amber-600'
                              : 'text-slate-500'
                          }`}
                        >
                          #{rank}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold truncate" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                              {entry.name}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] truncate opacity-70" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                            {entry.role}
                          </div>
                        </div>
                      </div>

                      {/* Score & Streak */}
                      <div className="flex items-center gap-3 flex-shrink-0 text-right">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-orange-500" title={`${entry.streakDays} day streak`}>
                          <Flame className="w-3.5 h-3.5 fill-orange-500" />
                          <span>{entry.streakDays}d</span>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-mono font-extrabold text-amber-500">
                          <Zap className="w-3.5 h-3.5 fill-amber-500" />
                          <span>{entry.totalXp.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: BADGES & TROPHY SHELF */}
          {activeTab === 'badges' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Progress Summary Card */}
              <div
                className="p-4 border-b space-y-3"
                style={{
                  background: isDark ? 'rgba(30, 41, 59, 0.30)' : 'rgba(241, 245, 249, 0.50)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                      {currentUser?.name || 'Alpha Tester'}
                    </div>
                    <div className="text-[11px] text-purple-400 font-medium">
                      Lv{currentUser?.level || 1} · {currentUser?.role || 'BEAM Newcomer'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-500">
                      <Zap className="w-3.5 h-3.5 fill-amber-500" />
                      <span>{totalXp} XP</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-orange-500">
                      <Flame className="w-3.5 h-3.5 fill-orange-500" />
                      <span>{currentUser?.streakDays || 1}d</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar to 100% Badges */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    <span>Curriculum Mastery</span>
                    <span>{badgesSummary.percentage}% Completed</span>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden bg-slate-500/20">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${badgesSummary.percentage}%`,
                        background: 'linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)',
                      }}
                    />
                  </div>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 pt-1">
                  {(['all', 'unlocked', 'locked'] as const).map((f) => (
                    <button
                      key={f}
                      id={`badge-filter-${f}`}
                      onClick={() => setBadgeFilter(f)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all cursor-pointer"
                      style={{
                        background: badgeFilter === f
                          ? (isDark ? 'rgba(139, 92, 246, 0.25)' : 'rgba(139, 92, 246, 0.15)')
                          : 'transparent',
                        color: badgeFilter === f
                          ? (isDark ? '#C4B5FD' : '#7C3AED')
                          : (isDark ? '#94A3B8' : '#64748B'),
                        border: badgeFilter === f ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid transparent',
                      }}
                    >
                      {f} ({f === 'all' ? badgesSummary.total : f === 'unlocked' ? badgesSummary.unlockedCount : badgesSummary.total - badgesSummary.unlockedCount})
                    </button>
                  ))}
                </div>
              </div>

              {/* Badges Grid */}
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2.5">
                {displayedBadges.map((badge) => {
                  const isUnlocked = badgesSummary.unlocked.some((u) => u.id === badge.id);
                  const Icon = ICON_MAP[badge.iconName] || Award;
                  const style = RARITY_STYLES[badge.rarity];

                  return (
                    <button
                      key={badge.id}
                      id={`badge-card-${badge.id}`}
                      onClick={() => setSelectedBadge(badge)}
                      className="p-3 rounded-2xl flex flex-col items-center text-center transition-all cursor-pointer group relative overflow-hidden"
                      style={{
                        background: isUnlocked
                          ? (isDark ? 'rgba(30, 41, 59, 0.50)' : 'rgba(255, 255, 255, 0.85)')
                          : (isDark ? 'rgba(15, 23, 42, 0.35)' : 'rgba(241, 245, 249, 0.60)'),
                        border: isUnlocked ? `1px solid ${style.border}` : (isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.06)'),
                        boxShadow: isUnlocked ? style.glow : 'none',
                        opacity: isUnlocked ? 1 : 0.65,
                      }}
                    >
                      {/* Icon Bubble */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110"
                        style={{
                          background: isUnlocked ? style.bg : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)'),
                          border: isUnlocked ? `1px solid ${style.border}` : '1px solid transparent',
                        }}
                      >
                        <Icon className="w-6 h-6" style={{ color: isUnlocked ? style.text : '#64748B' }} />
                      </div>

                      {/* Title */}
                      <div className="text-xs font-bold truncate max-w-full mb-1" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                        {badge.title}
                      </div>

                      {/* Rarity Pill */}
                      <div className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md mb-1.5 ${isUnlocked ? style.badgePill : 'bg-slate-500/10 text-slate-500'}`}>
                        {style.name}
                      </div>

                      {/* Status indicator */}
                      <div className="mt-auto flex items-center gap-1 text-[10px] font-semibold"
                        style={{ color: isUnlocked ? '#10B981' : (isDark ? '#64748B' : '#94A3B8') }}>
                        {isUnlocked ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Unlocked</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LeetCode-Style Shareable Modal */}
      {selectedBadge && (
        <BadgeCelebrationModal
          badge={selectedBadge}
          isUnlocked={badgesSummary.unlocked.some((u) => u.id === selectedBadge.id)}
          userName={currentUser?.name || 'Alpha Tester'}
          userRole={currentUser?.role || 'BEAM Newcomer'}
          userLevel={currentUser?.level || 1}
          isDark={isDark}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </>
  );
};

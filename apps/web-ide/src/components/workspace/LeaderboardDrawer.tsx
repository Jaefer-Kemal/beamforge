'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, X, Flame, Zap, CheckCircle2, Shield, RefreshCw } from 'lucide-react';

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
  onClose: () => void;
}

export const LeaderboardDrawer: React.FC<LeaderboardDrawerProps> = ({
  isOpen,
  currentUserId,
  isDark,
  onClose,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(true);

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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
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
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#F59E0B',
              }}
            >
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
                Global Leaderboard
              </h2>
              <div className="flex items-center gap-2 text-[11px] font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                <span>{isDbConnected ? 'Neon Serverless Live' : 'Local Preset State'}</span>
                <span>•</span>
                <span>Updated in real-time</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchLeaderboard}
              disabled={isLoading}
              title="Refresh Leaderboard"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              style={{ background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)' }}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              style={{ background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

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
    </div>
  );
};

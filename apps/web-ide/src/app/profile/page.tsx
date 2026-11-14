'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Shield,
  Zap,
  Flame,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  Cpu,
  GitBranch,
  Mail,
  Binary,
  Radio,
  Trash2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { authClient } from '../../lib/auth/client';
import { AuthModal } from '../../components/workspace/AuthModal';
import { COURSE_WORLDS } from '../../data/courseWorlds';
import { GUEST_USER, xpToRole } from '../../types/user';
import { UserAvatar, PRESET_BEAM_AVATARS } from '../../components/navigation/UserAvatar';

interface SubmissionItem {
  id: string;
  exerciseId: string;
  status: string;
  score: number;
  durationMs: number;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const {
    theme,
    currentUser,
    completedLevelIds,
    totalXp,
    hydrateFromStorageAndDb,
    isAuthModalOpen,
    setIsAuthModalOpen,
  } = useWorkspaceStore();

  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [activeAvatarModal, setActiveAvatarModal] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(currentUser?.customAvatarId || 'beam-node');
  const [editBio, setEditBio] = useState(currentUser?.bio || 'Exploring Erlang & OTP on the interactive BEAM platform.');
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const isDark = theme === 'dark';
  const isAuthed = (typeof window !== 'undefined' && localStorage.getItem('bf_is_authenticated') === 'true') || (!currentUser?.isGuest && currentUser?.id !== 'guest');

  useEffect(() => {
    hydrateFromStorageAndDb();
  }, [hydrateFromStorageAndDb]);

  useEffect(() => {
    if (currentUser?.bio) {
      setEditBio(currentUser.bio);
    }
    if (currentUser?.customAvatarId) {
      setSelectedAvatarId(currentUser.customAvatarId);
    }
  }, [currentUser?.bio, currentUser?.customAvatarId]);

  useEffect(() => {
    if (!isAuthed || !currentUser?.id || currentUser.id === 'guest') return;
    setLoadingSubs(true);
    fetch(`/api/user-progress?userId=${currentUser.id}&mode=submissions`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.submissions) {
          setSubmissions(data.submissions.slice(0, 15));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSubs(false));
  }, [currentUser?.id, isAuthed]);

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } catch {}
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('bf_is_authenticated');
        localStorage.setItem('bf_current_user_id', 'guest');
      } catch {}
    }
    useWorkspaceStore.setState({ currentUser: GUEST_USER });
    router.push('/');
  };

  const handleSelectAvatar = async (avatarId: string) => {
    const effectiveAvatarId = avatarId === 'google' ? '' : avatarId;
    setSelectedAvatarId(avatarId);
    if (!currentUser?.id || currentUser.id === 'guest') return;

    try {
      await fetch('/api/user-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          userId: currentUser.id,
          customAvatarId: effectiveAvatarId,
        }),
      });

      const updated = { ...currentUser, customAvatarId: effectiveAvatarId || undefined };
      useWorkspaceStore.setState({ currentUser: updated });
      localStorage.setItem(`beamforge_user_${currentUser.id}`, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to update avatar:', err);
    }
    setActiveAvatarModal(false);
  };

  const handleSaveBio = async () => {
    if (!currentUser?.id || currentUser.id === 'guest') return;
    setIsSavingBio(true);
    try {
      await fetch('/api/user-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_profile',
          userId: currentUser.id,
          bio: editBio,
        }),
      });

      const updated = { ...currentUser, bio: editBio };
      useWorkspaceStore.setState({ currentUser: updated });
      localStorage.setItem(`beamforge_user_${currentUser.id}`, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to update bio:', err);
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleExecuteReset = async () => {
    if (resetConfirmInput.trim().toUpperCase() !== 'RESET') return;
    if (!currentUser?.id || currentUser.id === 'guest') return;

    setIsResetting(true);
    try {
      await fetch('/api/user-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_user_progress',
          userId: currentUser.id,
        }),
      });

      // Clear local user keys
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith(`beamforge_completed_${currentUser.id}_`) || key.startsWith(`beamforge_draft_${currentUser.id}_`) || key.startsWith(`beamforge_accepted_${currentUser.id}_`))) {
          localStorage.removeItem(key);
        }
      }

      useWorkspaceStore.setState({
        completedLevelIds: [],
        completedWithXpLevelIds: [],
        totalXp: 0,
        unlockedSolutionLessonIds: [],
      });

      setResetModalOpen(false);
      router.push('/learn/ch01-l01');
    } catch (err) {
      console.warn('Reset error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const derivedRole = xpToRole(totalXp);
  const totalCurriculumLessons = 68;
  const completedCount = completedLevelIds.length;
  const overallPercentage = Math.round((completedCount / totalCurriculumLessons) * 100);

  // Compute World Breakdown Stats
  const worldProgressStats = COURSE_WORLDS.map((world) => {
    // Determine lesson count per chapter in this world
    let worldTotal = 0;
    if (world.worldNumber === 1) worldTotal = 23;
    else if (world.worldNumber === 2) worldTotal = 12;
    else if (world.worldNumber === 3) worldTotal = 18;
    else if (world.worldNumber === 4) worldTotal = 10;
    else if (world.worldNumber === 5) worldTotal = 5;

    const worldCompleted = completedLevelIds.filter((lid) => {
      const match = lid.match(/^ch(\d+)/);
      if (!match) return false;
      const chNum = parseInt(match[1], 10);
      return world.chapterNumbers.includes(chNum);
    }).length;

    const pct = worldTotal > 0 ? Math.min(100, Math.round((worldCompleted / worldTotal) * 100)) : 0;
    return {
      ...world,
      completed: worldCompleted,
      total: worldTotal,
      percentage: pct,
    };
  });

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-white">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl glass-specular-rim bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-white/10 shadow-2xl text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
            <User className="w-7 h-7 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight">Learner Profile</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Sign in with your Google or email account to view your cloud learning analytics, verified submissions, and custom avatars.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Back to Home
            </Link>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md transition-all cursor-pointer"
            >
              Sign In to Continue
            </button>
          </div>
        </div>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F17] text-slate-900 dark:text-white pb-16">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/learn"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 transition-colors"
            title="Return to Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">Learner Profile</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Cloud Synced</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/syllabus"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            <span>Syllabus</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-6 sm:space-y-8">
        {/* Top Profile Summary Card */}
        <section className="p-5 sm:p-7 rounded-2xl glass-specular-rim bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/70 dark:border-white/10 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              {/* Avatar Container with Selector Trigger */}
              <div className="relative group flex-shrink-0">
                <UserAvatar user={currentUser} size="xl" shape="rounded" />
                <button
                  onClick={() => setActiveAvatarModal(true)}
                  className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-amber-500 text-white shadow-md hover:bg-amber-600 transition-colors cursor-pointer"
                  title="Choose Avatar"
                >
                  <Sparkles className="w-3 h-3" />
                </button>
              </div>

              {/* Identity & Rank */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">
                    {currentUser?.name || 'BEAM Explorer'}
                  </h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                    Level {derivedRole.level} • {derivedRole.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {currentUser?.email || 'Cloud Authenticated Account'}
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <strong>{totalXp}</strong> XP Earned
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <strong>{currentUser?.streakDays || 1}</strong> Day Streak
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <strong>{completedCount}</strong> / {totalCurriculumLessons} Lessons Done
                  </span>
                </div>
              </div>
            </div>

            {/* Resume Workspace CTA */}
            <div className="w-full md:w-auto flex md:flex-col items-center justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60 dark:border-white/10">
              <Link
                href="/learn"
                className="w-full md:w-auto py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-sm transition-all text-center"
              >
                Continue Learning
              </Link>
            </div>
          </div>

          {/* Bio Section */}
          <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="w-full sm:flex-1">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                Bio & Engineering Focus
              </label>
              <input
                type="text"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={140}
                placeholder="What are you building with Erlang/OTP?"
                className="w-full text-xs py-1.5 px-3 rounded-lg bg-slate-100/70 dark:bg-slate-800/70 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <button
              onClick={handleSaveBio}
              disabled={isSavingBio || editBio === currentUser?.bio}
              className="py-1.5 px-4 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-200/80 dark:bg-slate-800 border border-slate-300 dark:border-white/10 hover:bg-slate-300/80 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
            >
              {isSavingBio ? 'Saving...' : 'Update Bio'}
            </button>
          </div>
        </section>

        {/* 2-Column Analytics Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left 2 Columns: Curriculum World Breakdown (LeetCode Style) */}
          <div className="lg:col-span-2 space-y-6">
            <section className="p-5 sm:p-6 rounded-2xl glass-specular-rim bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/70 dark:border-white/10 shadow-lg space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-500" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Curriculum Progression (5 Worlds)
                  </h2>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {overallPercentage}% Complete
                </span>
              </div>

              {/* Overall Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400 rounded-full transition-all duration-500"
                    style={{ width: `${overallPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>0 Lessons</span>
                  <span>{completedCount} of {totalCurriculumLessons} Lessons Mastered</span>
                  <span>68 Lessons</span>
                </div>
              </div>

              {/* 5 World Cards */}
              <div className="space-y-3 pt-2">
                {worldProgressStats.map((w) => (
                  <div
                    key={w.id}
                    className="p-3.5 sm:p-4 rounded-xl bg-slate-100/60 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: w.accentColor }}
                        />
                        <span>World {w.worldNumber}: {w.title}</span>
                      </div>
                      <div className="font-mono text-slate-600 dark:text-slate-300 font-semibold">
                        {w.completed} / {w.total} ({w.percentage}%)
                      </div>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700/60 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${w.percentage}%`,
                          background: w.accentColor,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Recent Solved Submissions Feed */}
            <section className="p-5 sm:p-6 rounded-2xl glass-specular-rim bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/70 dark:border-white/10 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Verified Submissions Feed
                  </h2>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Showing recent passed runs
                </span>
              </div>

              {loadingSubs ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading submissions feed...</div>
              ) : submissions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No submissions recorded yet. Complete your first exercise in the IDE to log execution metrics!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400">
                        <th className="py-2.5 font-medium">Exercise ID</th>
                        <th className="py-2.5 font-medium">Status</th>
                        <th className="py-2.5 font-medium">Score</th>
                        <th className="py-2.5 font-medium">Duration</th>
                        <th className="py-2.5 font-medium">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                      {submissions.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {s.exerciseId}
                          </td>
                          <td className="py-2.5">
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3 h-3" />
                              Passed
                            </span>
                          </td>
                          <td className="py-2.5 font-mono text-slate-700 dark:text-slate-300">
                            {s.score}/100
                          </td>
                          <td className="py-2.5 font-mono text-slate-500 dark:text-slate-400">
                            {s.durationMs ? `${s.durationMs}ms` : '<10ms'}
                          </td>
                          <td className="py-2.5 text-slate-500 dark:text-slate-400 text-[11px]">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Mastery Card & Danger Zone */}
          <div className="space-y-6">
            {/* Rank & Mastery Tier Card */}
            <section className="p-5 sm:p-6 rounded-2xl glass-specular-rim bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/70 dark:border-white/10 shadow-lg space-y-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  BEAM Engineering Rank
                </h2>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                <div className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">
                  Current Rank Tier
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">
                  Level {derivedRole.level} • {derivedRole.role}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Earn XP by solving assignments without revealing reference solutions to advance to OTP Architect and BEAM Grandmaster.
                </p>
              </div>

              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Current XP:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{totalXp} XP</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Completed Lessons:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{completedCount}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Daily Streak:</span>
                  <span className="font-mono font-bold text-orange-500">{currentUser?.streakDays || 1} Days Active</span>
                </div>
              </div>
            </section>

            {/* Danger Zone: Account Reset (Safely Hidden & Protected) */}
            <section className="p-5 sm:p-6 rounded-2xl glass-specular-rim bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-rose-500/20 shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-rose-500">
                <AlertTriangle className="w-4 h-4" />
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  Danger Zone
                </h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Permanently reset all completed exercises, earned XP, streaks, and code drafts in your cloud account.
              </p>
              <button
                onClick={() => setResetModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Account Progress</span>
              </button>
            </section>
          </div>
        </div>
      </main>

      {/* Avatar Picker Modal */}
      {activeAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-white/60 dark:border-white/15 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Choose BEAM Avatar</h3>
              </div>
              <button
                onClick={() => setActiveAvatarModal(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {currentUser?.avatarUrl && (
                <button
                  onClick={() => handleSelectAvatar('google')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer text-center ${
                    selectedAvatarId === 'google' || !selectedAvatarId
                      ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center border border-white/40">
                    <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate w-full">
                    Google Photo
                  </span>
                </button>
              )}
              {PRESET_BEAM_AVATARS.map((av) => {
                const Icon = av.icon;
                const isSelected = selectedAvatarId === av.id;
                return (
                  <button
                    key={av.id}
                    onClick={() => handleSelectAvatar(av.id)}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/10'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: av.bg }}
                    >
                      <Icon className="w-5 h-5" style={{ color: av.color }} />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate w-full">
                      {av.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone Type-To-Confirm Reset Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-rose-500/30 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-500">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Confirm Account Reset</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This action cannot be undone. All your completed exercises, earned XP, daily streak, and saved code drafts will be permanently erased.
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Type RESET to confirm:
              </label>
              <input
                type="text"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                placeholder="RESET"
                className="w-full text-xs font-mono py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="pt-2 flex justify-end gap-2.5">
              <button
                onClick={() => {
                  setResetModalOpen(false);
                  setResetConfirmInput('');
                }}
                disabled={isResetting}
                className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReset}
                disabled={resetConfirmInput.trim().toUpperCase() !== 'RESET' || isResetting}
                className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-40 cursor-pointer"
              >
                {isResetting ? 'Resetting...' : 'Permanently Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

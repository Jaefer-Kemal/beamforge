'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sun,
  Moon,
  Zap,
  BookOpen,
  ArrowRight,
  Menu,
  X,
  Compass,
  Layers,
  Cpu,
  ShieldCheck,
  Sparkles,
  User,
  LogOut,
} from 'lucide-react';
import { BeamForgeLogo } from '../navigation/BeamForgeLogo';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { AuthModal } from '../workspace/AuthModal';
import { authClient } from '../../lib/auth/client';
import { GUEST_USER } from '../../types/user';

export function LandingNavbar() {
  const router = useRouter();
  const {
    theme,
    toggleTheme,
    currentUser,
    activeExerciseId,
    hydrateFromStorageAndDb,
    isAuthModalOpen,
    setIsAuthModalOpen,
  } = useWorkspaceStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [lastLessonId, setLastLessonId] = useState<string | null>(null);

  const isAuthed = (typeof window !== 'undefined' && localStorage.getItem('bf_is_authenticated') === 'true') || (!currentUser?.isGuest && currentUser?.id !== 'guest');

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
  };

  useEffect(() => {
    hydrateFromStorageAndDb();
  }, [hydrateFromStorageAndDb]);

  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem('bf_theme');
      if (storedTheme === 'dark') {
        useWorkspaceStore.setState({ theme: 'dark' });
        document.documentElement.classList.add('dark');
        document.documentElement.classList.add('theme-dark');
      } else if (storedTheme === 'light') {
        useWorkspaceStore.setState({ theme: 'light' });
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.remove('theme-dark');
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('beamforge_active_exercise');
      const active = currentUser?.lastActiveExercise || stored || activeExerciseId;
      if (active && active !== 'ch01-l01') {
        setLastLessonId(active);
      }
    } catch {}
  }, [currentUser?.lastActiveExercise, activeExerciseId]);

  const isDark = theme === 'dark';

  return (
    <header className="fixed top-3 sm:top-5 left-0 right-0 z-50 flex justify-center px-3 sm:px-6 pointer-events-none">
      <div
        className={`pointer-events-auto w-full max-w-6xl transition-all duration-300 rounded-2xl glass-specular-rim ${
          scrolled
            ? 'bg-white/50 dark:bg-slate-900/45 backdrop-blur-2xl shadow-[0_12px_40px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[0_16px_50px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.22)] border border-white/60 dark:border-white/15 py-2.5 px-4 sm:px-6'
            : 'bg-white/35 dark:bg-slate-900/35 backdrop-blur-xl shadow-[0_8px_32px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.6)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.18)] border border-white/50 dark:border-white/12 py-3 px-4 sm:px-6'
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Brand Logo & Tag */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none"
            aria-label="BeamForge Home"
          >
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400/20 via-sky-400/20 to-violet-500/20 border border-white/60 dark:border-white/15 shadow-sm group-hover:scale-105 transition-transform duration-200">
              <BeamForgeLogo className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                BeamForge
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                OTP 29
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <Link
              href="/syllabus"
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5 text-sky-500" />
              Syllabus
            </Link>
            <a
              href="#features"
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5 text-violet-500" />
              Why BEAM?
            </a>
            <a
              href="#worlds"
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-500" />
              5 Worlds
            </a>
            <a
              href="#capstone"
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              XMPP Capstone
            </a>
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dynamic Returning Learner Pill */}
            {lastLessonId && (
              <Link
                href={`/learn/${lastLessonId}`}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 transition-all shadow-sm"
              >
                <Zap className="w-3 h-3 text-emerald-500" />
                <span>Resume ({lastLessonId})</span>
              </Link>
            )}

            {/* Light / Dark Mode Glass Toggle — Desktop only */}
            <button
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to Daylight Light Mode' : 'Switch to Midnight Dark Mode'}
              className="hidden md:inline-flex p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/60 dark:bg-slate-800/60 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 border border-white/60 dark:border-white/10 transition-all focus:outline-none"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-500" />
              )}
            </button>

            {/* Desktop Auth State / Actions */}
            {!isAuthed ? (
              <>
                <button
                  id="landing-signin-btn"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100/70 dark:bg-slate-800/70 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 border border-white/60 dark:border-white/10 transition-all cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Sign In</span>
                </button>
                <Link
                  href="/learn/ch01-l01"
                  className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-[0_4px_16px_rgba(245,158,11,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98] border border-amber-300/30"
                >
                  <span>Start Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            ) : (
              <>
                <div className="hidden md:inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/60 border border-white/60 dark:border-white/10 text-xs font-semibold">
                  {currentUser?.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt="" className="w-4 h-4 rounded-full object-cover" />
                  ) : (
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: currentUser?.avatarColor || '#3B82F6' }} />
                  )}
                  <span className="max-w-28 truncate text-slate-800 dark:text-slate-200">{currentUser?.name || 'Engineer'}</span>
                </div>
                <Link
                  href={lastLessonId ? `/learn/${lastLessonId}` : '/learn/ch01-l01'}
                  className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98] border border-emerald-300/30"
                >
                  <span>{lastLessonId ? `Resume (${lastLessonId})` : 'Go to IDE'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 border border-white/60 dark:border-white/10 focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col gap-2">
            <Link
              href="/syllabus"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 flex items-center gap-2"
            >
              <Compass className="w-4 h-4 text-sky-500" />
              Course Syllabus (5 Worlds)
            </Link>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 flex items-center gap-2"
            >
              <Cpu className="w-4 h-4 text-violet-500" />
              Why the BEAM?
            </a>
            <a
              href="#worlds"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 flex items-center gap-2"
            >
              <Layers className="w-4 h-4 text-emerald-500" />
              5 Thematic Worlds
            </a>
            <a
              href="#capstone"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/70 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              XMPP Capstone Studio
            </a>

            {/* Appearance Theme Selector (Settings Style) */}
            <div className="pt-2 pb-1 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="text-[11px] font-semibold mb-2 px-1 text-slate-500 dark:text-slate-400">
                Appearance Theme
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="mobile-landing-theme-daylight-btn"
                  onClick={() => { if (isDark) toggleTheme(); }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${!isDark ? 'border shadow-xs' : 'opacity-60 hover:opacity-100'}`}
                  style={{
                    background: !isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255,255,255,0.05)',
                    borderColor: !isDark ? 'rgba(245, 158, 11, 0.40)' : 'transparent',
                    color: !isDark ? '#D97706' : '#94A3B8',
                  }}
                >
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Daylight Glass</span>
                </button>
                <button
                  id="mobile-landing-theme-midnight-btn"
                  onClick={() => { if (!isDark) toggleTheme(); }}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${isDark ? 'border shadow-xs' : 'opacity-60 hover:opacity-100'}`}
                  style={{
                    background: isDark ? 'rgba(139, 92, 246, 0.20)' : 'rgba(15,23,42,0.05)',
                    borderColor: isDark ? 'rgba(139, 92, 246, 0.40)' : 'transparent',
                    color: isDark ? '#C4B5FD' : '#64748B',
                  }}
                >
                  <Moon className="w-4 h-4 text-purple-400" />
                  <span>Midnight Glass</span>
                </button>
              </div>
            </div>

            {/* Mobile Auth Actions */}
            <div className="pt-2 space-y-2">
              {!isAuthed ? (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-100/80 dark:bg-slate-800/80 border border-white/40 dark:border-white/10 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Sign In with Google or Email</span>
                  </button>
                  <Link
                    href={lastLessonId ? `/learn/${lastLessonId}` : '/learn/ch01-l01'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-[0_4px_16px_rgba(245,158,11,0.35)] active:scale-[0.98] transition-all"
                  >
                    <span>{lastLessonId ? `Resume Last Lesson (${lastLessonId})` : 'Start Free'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {currentUser?.avatarUrl ? (
                        <img src={currentUser.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: currentUser?.avatarColor || '#3B82F6' }}>
                          {currentUser?.name?.[0] || 'U'}
                        </div>
                      )}
                      <span className="font-semibold truncate text-slate-800 dark:text-slate-200">{currentUser?.name}</span>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                  <Link
                    href={lastLessonId ? `/learn/${lastLessonId}` : '/learn/ch01-l01'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-[0_4px_16px_rgba(16,185,129,0.35)] active:scale-[0.98] transition-all"
                  >
                    <span>{lastLessonId ? `Resume (${lastLessonId})` : 'Go to IDE'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Neon Auth Modal for Landing Page */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </header>
  );
}


'use client';

import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, Loader2, Mail, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { authClient } from '../../lib/auth/client';
import { UserProfile, xpToRole } from '../../types/user';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export function AuthModal({
  isOpen,
  onClose,
  title = 'Unlock the Full BEAM Experience',
  subtitle = 'Chapters 1 through 4 are 100% free forever. Sign in to unlock Chapters 5–12 and save your progress to the cloud.',
}: AuthModalProps) {
  const { theme, hydrateFromStorageAndDb } = useWorkspaceStore();
  const isDark = theme === 'dark';

  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    try {
      setSocialLoading(true);
      setErrorMsg(null);
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: typeof window !== 'undefined' ? window.location.href : '/learn',
      });
    } catch (err: any) {
      console.error('[Auth] Google sign in failed:', err);
      setErrorMsg(err?.message || 'Failed to initialize Google Sign In. Please try email login.');
      setSocialLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      if (mode === 'signup') {
        const res = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split('@')[0],
        });

        if ((res as any)?.error) {
          setErrorMsg((res as any).error.message || 'Sign up failed. Please check your details.');
          setLoading(false);
          return;
        }

        const newUser = (res as any)?.data?.user;
        if (newUser) {
          handleAuthSuccess(newUser);
        } else {
          // If auto-signin didn't return user, switch to signin
          setMode('signin');
          setErrorMsg('Account created successfully! Please sign in.');
          setLoading(false);
        }
      } else {
        const res = await authClient.signIn.email({
          email,
          password,
        });

        if ((res as any)?.error) {
          setErrorMsg((res as any).error.message || 'Invalid email or password.');
          setLoading(false);
          return;
        }

        const loggedInUser = (res as any)?.data?.user;
        if (loggedInUser) {
          handleAuthSuccess(loggedInUser);
        } else {
          handleAuthSuccess({ id: `user_${Date.now()}`, name: email.split('@')[0], email });
        }
      }
    } catch (err: any) {
      console.error('[Auth] Email auth error:', err);
      setErrorMsg(err?.message || 'Authentication error. Please try again.');
      setLoading(false);
    }
  };

  const handleAuthSuccess = (authUser: { id: string; name?: string; email?: string; image?: string }) => {
    try {
      localStorage.setItem('bf_is_authenticated', 'true');
      localStorage.setItem('bf_current_user_id', authUser.id);

      const updatedProfile: UserProfile = {
        id: authUser.id,
        name: authUser.name || authUser.email?.split('@')[0] || 'BEAM Engineer',
        email: authUser.email,
        avatarUrl: authUser.image,
        isGuest: false,
        role: 'BEAM Newcomer',
        level: 1,
        avatarColor: '#3B82F6',
        bio: 'BeamForge Engineer',
        completedLevelIds: [],
        totalXp: 0,
        unlockedSolutionLessonIds: [],
        lastActiveExercise: 'ch01-l01',
        streakDays: 1,
      };

      localStorage.setItem(`beamforge_user_${authUser.id}`, JSON.stringify(updatedProfile));
      useWorkspaceStore.setState({ currentUser: updatedProfile });

      // Trigger cloud sync to pull database state or migrate local guest drafts
      hydrateFromStorageAndDb();
    } catch (err) {
      console.warn('[Auth] Local profile save error:', err);
    }

    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-scale-up"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)',
          border: isDark ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(245, 158, 11, 0.30)',
          boxShadow: isDark
            ? '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(245, 158, 11, 0.20)'
            : '0 20px 50px rgba(0, 0, 0, 0.12), 0 0 30px rgba(245, 158, 11, 0.12)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          style={{ background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)' }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#F59E0B',
            }}
          >
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <div className="pr-6">
            <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-0.5">
              Instant Cloud Sync • 100% Free
            </p>
          </div>
        </div>

        {/* Subtitle Explainer */}
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 mb-5">
          {subtitle}
        </p>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 text-rose-500 text-xs font-medium">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Primary Action: Google OAuth Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={socialLoading || loading}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm border hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
          style={{
            background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(15, 23, 42, 0.12)',
            color: isDark ? '#FFFFFF' : '#0F172A',
          }}
        >
          {socialLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
          )}
          <span>{socialLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
        </button>

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200/60 dark:border-white/10" />
          </div>
          <span
            className="relative px-3 text-[11px] font-semibold uppercase tracking-wider"
            style={{
              background: isDark ? '#0F172A' : '#FFFFFF',
              color: isDark ? '#64748B' : '#94A3B8',
            }}
          >
            or with email
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Your Name
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@beamforge.org"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-100/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || socialLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
            }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <span>{mode === 'signup' ? 'Create Free Account' : 'Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Mode Switcher */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup');
              setErrorMsg(null);
            }}
            className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors cursor-pointer"
          >
            {mode === 'signup' ? (
              <span>Already have an account? <strong className="underline">Sign In</strong></span>
            ) : (
              <span>Need an account? <strong className="underline">Create Free Account</strong></span>
            )}
          </button>
        </div>

        {/* Privacy & Reassurance Banner */}
        <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Local progress auto-migrates to your cloud account</span>
        </div>
      </div>
    </div>
  );
}

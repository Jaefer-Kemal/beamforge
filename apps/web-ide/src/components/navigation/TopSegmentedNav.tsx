'use client';

import React from 'react';
import { motion } from 'framer-motion';
import * as Switch from '@radix-ui/react-switch';
import { 
  Compass, 
  Code2, 
  BookOpen, 
  Activity, 
  Sparkles, 
  Play, 
  Loader2, 
  Lock,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { getLevelById } from '../../data/curriculumCatalog';

export function TopSegmentedNav() {
  const {
    activeView,
    setActiveView,
    activeExerciseId,
    totalXp,
    devModeUnlockedAll,
    toggleDevModeUnlockedAll,
    isVerifying,
    runVerificationSuite,
  } = useWorkspaceStore();

  const currentLevel = getLevelById(activeExerciseId);
  const capabilityMode = currentLevel?.capabilityMode || 'code_only';
  const isInspectorUnlocked = capabilityMode !== 'code_only' || devModeUnlockedAll;

  const navItems = [
    {
      id: 'curriculum_map' as const,
      label: 'Curriculum Map',
      icon: Compass,
      enabled: true,
      badge: null,
    },
    {
      id: 'workspace' as const,
      label: 'Workspace',
      icon: Code2,
      enabled: true,
      badge: currentLevel ? `L${currentLevel.levelNumber}` : null,
    },
    {
      id: 'references' as const,
      label: 'Reference Vault',
      icon: BookOpen,
      enabled: true,
      badge: currentLevel?.references ? `${currentLevel.references.length}` : null,
    },
    {
      id: 'inspector' as const,
      label: 'BEAM Inspector',
      icon: Activity,
      enabled: isInspectorUnlocked,
      badge: isInspectorUnlocked ? (capabilityMode === 'xmpp_full' ? 'XMPP' : 'BEAM') : 'Locked',
    },
  ];

  return (
    <header className="fixed top-3 left-0 right-0 z-50 flex items-center justify-between px-6 pointer-events-none">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3 pointer-events-auto">
        <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl glass-pill shadow-sm">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-ios-blue to-sky-400 flex items-center justify-center text-white shadow-sm font-black text-xs tracking-wider">
            BF
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-tight text-ios-slate leading-none">BeamForge</span>
            <span className="text-[10px] font-medium text-ios-muted leading-tight">Erlang/OTP Engine</span>
          </div>
        </div>
      </div>

      {/* Center: Apple visionOS Floating Segmented Pill */}
      <nav className="pointer-events-auto glass-pill rounded-full p-1 flex items-center gap-1 shadow-glass-pill border border-white/80">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const isDisabled = !item.enabled;

          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled) setActiveView(item.id);
              }}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all select-none ${
                isDisabled
                  ? 'opacity-40 cursor-not-allowed text-ios-muted'
                  : isActive
                  ? 'text-ios-blue shadow-sm'
                  : 'text-ios-muted hover:text-ios-slate hover:bg-white/40'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav-pill"
                  className="absolute inset-0 bg-white/95 rounded-full shadow-[0_2px_8px_rgba(0,122,255,0.12)] border border-white -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}

              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-ios-blue' : 'text-ios-muted'}`} />
              <span>{item.label}</span>

              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                    isDisabled
                      ? 'bg-slate-200 text-slate-500'
                      : isActive
                      ? 'bg-ios-blue/10 text-ios-blue'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {isDisabled && <Lock className="w-3 h-3 text-slate-400 ml-0.5" />}
            </button>
          );
        })}
      </nav>

      {/* Right: Actions, Dev Mode Toggle & Verification CTA */}
      <div className="flex items-center gap-3 pointer-events-auto">
        {/* XP Counter Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-pill text-amber-700 font-semibold text-xs shadow-sm">
          <Sparkles className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          <span className="font-mono">{totalXp}</span>
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">XP</span>
        </div>

        {/* Dev Mode Switch */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-pill shadow-sm">
          <span className="text-[11px] font-medium text-ios-muted select-none">Unlock All</span>
          <Switch.Root
            checked={devModeUnlockedAll}
            onCheckedChange={toggleDevModeUnlockedAll}
            className={`w-9 h-5 rounded-full relative transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ios-blue ${
              devModeUnlockedAll ? 'bg-ios-blue' : 'bg-slate-300'
            }`}
          >
            <Switch.Thumb
              className={`block w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 will-change-transform ${
                devModeUnlockedAll ? 'translate-x-[18px]' : 'translate-x-[2px]'
              }`}
            />
          </Switch.Root>
        </div>

        {/* Primary Action Button: Verify Code */}
        <button
          onClick={() => runVerificationSuite()}
          disabled={isVerifying}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-ios-blue hover:bg-ios-blue-hover active:scale-[0.98] text-white font-semibold text-xs shadow-[0_4px_16px_rgba(0,122,255,0.3)] transition-all select-none disabled:opacity-60"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Verifying OTP 29...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Verify Code</span>
              <kbd className="hidden md:inline-block ml-1 px-1.5 py-0.5 rounded bg-white/20 text-[9px] font-mono tracking-tight text-white/90">
                ⌘↵
              </kbd>
            </>
          )}
        </button>
      </div>
    </header>
  );
}

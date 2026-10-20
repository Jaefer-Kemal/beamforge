'use client';

import React from 'react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { 
  FolderTree, 
  BookOpen, 
  Network, 
  Play, 
  Flame, 
  Command, 
  Layers, 
  Settings,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export const Ribbon: React.FC = () => {
  const {
    activeRibbonTab,
    setActiveRibbonTab,
    isLeftDrawerOpen,
    toggleLeftDrawer,
    setCommandPaletteOpen,
    runVerificationSuite,
    isVerifying,
    injectMailboxFlood,
    nodes,
    switchExercise,
    activeExerciseId,
  } = useWorkspaceStore();

  const handleTabClick = (tab: 'explorer' | 'vault' | 'observer' | 'chaos' | 'xmpp' | 'sim') => {
    if (activeRibbonTab === tab && isLeftDrawerOpen) {
      toggleLeftDrawer();
    } else {
      setActiveRibbonTab(tab);
    }
  };

  return (
    <div className="w-11 h-full bg-obsidian-void border-r border-obsidian-border flex flex-col items-center py-2.5 justify-between select-none z-30">
      {/* Top Section: App Logo & Vault Navigation */}
      <div className="flex flex-col items-center space-y-3 w-full">
        {/* BeamForge Logo Badge */}
        <div 
          onClick={() => setCommandPaletteOpen(true)}
          className="w-7 h-7 rounded bg-obsidian-accent flex items-center justify-center text-white shadow-obsidian-glow font-mono font-bold text-xs cursor-pointer hover:scale-105 transition-transform"
          title="BeamForge Command Palette (Cmd+K)"
        >
          BF
        </div>

        <div className="w-5 h-[1px] bg-obsidian-border my-1" />

        {/* File Explorer Tab */}
        <button
          onClick={() => handleTabClick('explorer')}
          className={`relative p-2 rounded-lg transition-colors group ${
            activeRibbonTab === 'explorer' && isLeftDrawerOpen
              ? 'bg-obsidian-surface text-obsidian-accent shadow-sm'
              : 'text-obsidian-text-muted hover:text-obsidian-text-primary hover:bg-obsidian-surface/50'
          }`}
          title="Virtual rebar3 Filesystem"
        >
          <FolderTree className="w-4 h-4" />
          {activeRibbonTab === 'explorer' && isLeftDrawerOpen && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-obsidian-accent rounded-r" />
          )}
        </button>

        {/* Lesson Vault Markdown Tab */}
        <button
          onClick={() => handleTabClick('vault')}
          className={`relative p-2 rounded-lg transition-colors group ${
            activeRibbonTab === 'vault' && isLeftDrawerOpen
              ? 'bg-obsidian-surface text-obsidian-accent shadow-sm'
              : 'text-obsidian-text-muted hover:text-obsidian-text-primary hover:bg-obsidian-surface/50'
          }`}
          title="Curriculum Lesson Note"
        >
          <BookOpen className="w-4 h-4" />
          {activeRibbonTab === 'vault' && isLeftDrawerOpen && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-obsidian-accent rounded-r" />
          )}
        </button>

        {/* Live BEAM Observer Switch */}
        <button
          onClick={() => handleTabClick('observer')}
          className={`relative p-2 rounded-lg transition-colors group ${
            activeRibbonTab === 'observer'
              ? 'bg-obsidian-surface text-obsidian-accent shadow-sm'
              : 'text-obsidian-text-muted hover:text-obsidian-text-primary hover:bg-obsidian-surface/50'
          }`}
          title="Live BEAM Web Observer"
        >
          <Network className="w-4 h-4 text-beam-violet" />
        </button>

        {/* Exercise Quick Switcher Pill */}
        <button
          onClick={() =>
            switchExercise(
              activeExerciseId === 'otp-04-ets-heir-resilience'
                ? 'xmpp-03-c2s-statem-handshake'
                : 'otp-04-ets-heir-resilience'
            )
          }
          className="p-2 rounded-lg text-obsidian-text-muted hover:text-beam-cyan hover:bg-obsidian-surface/50 transition-colors"
          title={`Switch Exercise: currently ${activeExerciseId}`}
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Section: Chaos Runner & Command Palette */}
      <div className="flex flex-col items-center space-y-3 w-full">
        {/* Trigger Chaos Verification Suite */}
        <button
          onClick={() => runVerificationSuite()}
          disabled={isVerifying}
          className="p-2 rounded-lg bg-obsidian-accent/15 hover:bg-obsidian-accent/25 text-obsidian-accent transition-colors disabled:opacity-50"
          title="Run Chaos Verification Suite (Cmd+Enter)"
        >
          <Play className="w-4 h-4 fill-current" />
        </button>

        {/* Flood Mailbox Quick Trigger */}
        <button
          onClick={() => {
            const target = nodes.find((n) => n.name === 'session_cache' || n.name === 'xmpp_c2s_statem');
            if (target) injectMailboxFlood(target.id);
          }}
          className="p-2 rounded-lg text-beam-amber hover:bg-beam-amber/10 transition-colors"
          title="Inject Mailbox Backpressure Flood"
        >
          <Flame className="w-4 h-4" />
        </button>

        {/* Command Palette Trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="p-2 rounded-lg text-obsidian-text-muted hover:text-obsidian-text-primary hover:bg-obsidian-surface/50 transition-colors"
          title="Open Command Palette (Cmd+K)"
        >
          <Command className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

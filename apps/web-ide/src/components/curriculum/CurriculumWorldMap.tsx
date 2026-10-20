'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Binary, 
  GitFork, 
  ShieldCheck, 
  Radio, 
  Globe, 
  Lock, 
  CheckCircle2, 
  PlayCircle, 
  Clock, 
  Sparkles, 
  ArrowRight,
  Award,
  Zap,
  BookOpen
} from 'lucide-react';
import { CURRICULUM_WORLDS, CurriculumWorld, CurriculumLevel } from '../../data/curriculumCatalog';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';

const WORLD_ICONS: Record<string, React.ElementType> = {
  'world-1-foundations': Binary,
  'world-2-raw-concurrency': GitFork,
  'world-3-production-otp': ShieldCheck,
  'world-4-tcp-networking': Radio,
  'world-5-xmpp-engine': Globe,
};

const WORLD_GRADIENTS: Record<string, string> = {
  'world-1-foundations': 'from-blue-500 to-sky-400',
  'world-2-raw-concurrency': 'from-indigo-600 to-blue-500',
  'world-3-production-otp': 'from-violet-600 to-purple-500',
  'world-4-tcp-networking': 'from-emerald-600 to-teal-500',
  'world-5-xmpp-engine': 'from-sky-600 to-cyan-500',
};

const DIFFICULTY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Beginner: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Intermediate: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Advanced: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  Production: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

export function CurriculumWorldMap() {
  const { 
    completedLevelIds, 
    unlockedWorldIds, 
    devModeUnlockedAll, 
    activeExerciseId, 
    switchExercise, 
    setActiveView 
  } = useWorkspaceStore();

  const totalLevels = CURRICULUM_WORLDS.reduce((acc, w) => acc + w.levels.length, 0);
  const completedCount = completedLevelIds.length;
  const progressPercent = Math.round((completedCount / totalLevels) * 100);

  // Compute Engineer Rank Title
  let rankTitle = 'BEAM Apprentice';
  if (completedCount >= 8) rankTitle = 'Principal OTP Systems Architect';
  else if (completedCount >= 6) rankTitle = 'Senior Distributed Systems Engineer';
  else if (completedCount >= 4) rankTitle = 'Production OTP Engineer';
  else if (completedCount >= 2) rankTitle = 'Concurrent BEAM Practitioner';

  const handleSelectLevel = (levelId: string) => {
    switchExercise(levelId);
    setActiveView('workspace');
  };

  return (
    <div className="w-full h-full overflow-y-auto pt-24 pb-16 px-6 lg:px-16 max-w-7xl mx-auto">
      {/* Top Hero Banner & Mastery Progress Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="glass-panel p-8 mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden"
      >
        <div className="flex items-center gap-5 z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-ios-blue via-indigo-500 to-sky-400 p-0.5 shadow-md flex items-center justify-center">
            <div className="w-full h-full bg-white/90 rounded-[14px] flex items-center justify-center">
              <Award className="w-8 h-8 text-ios-blue" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-ios-blue bg-ios-blue/10 px-2.5 py-0.5 rounded-full">
                5-World BEAM Curriculum
              </span>
              <span className="text-xs font-semibold text-ios-muted">OTP 29 Verified</span>
            </div>
            <h1 className="text-2xl font-black text-ios-slate tracking-tight">
              Erlang/OTP & Distributed Systems Training
            </h1>
            <p className="text-sm text-ios-muted mt-0.5 font-medium">
              Progressive mastery from immutable bit syntax to supervision chaos testing and distributed XMPP.
            </p>
          </div>
        </div>

        {/* Progress Metrics & Rank */}
        <div className="w-full md:w-72 flex flex-col gap-2 z-10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-ios-slate">{rankTitle}</span>
            <span className="font-mono font-semibold text-ios-blue">
              {completedCount}/{totalLevels} Levels ({progressPercent}%)
            </span>
          </div>

          <div className="w-full h-3 bg-slate-200/80 rounded-full overflow-hidden p-0.5 shadow-inner">
            <motion.div 
              className="h-full bg-gradient-to-r from-ios-blue via-indigo-500 to-emerald-400 rounded-full shadow-sm"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-ios-muted">
            <span>5 Worlds</span>
            <span>10 Level Invariants</span>
            <span>1,850 XP Available</span>
          </div>
        </div>
      </motion.div>

      {/* The 5 Worlds Grid */}
      <div className="space-y-12">
        {CURRICULUM_WORLDS.map((world, worldIdx) => {
          const WorldIcon = WORLD_ICONS[world.id] || Binary;
          const isWorldUnlocked = devModeUnlockedAll || unlockedWorldIds.includes(world.id);
          const worldCompletedCount = world.levels.filter((l) => completedLevelIds.includes(l.id)).length;
          const gradient = WORLD_GRADIENTS[world.id] || 'from-ios-blue to-sky-400';

          return (
            <motion.section 
              key={world.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: worldIdx * 0.08 }}
              className={`space-y-4 ${!isWorldUnlocked ? 'opacity-55' : ''}`}
            >
              {/* World Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white shadow-sm`}>
                    <WorldIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ios-muted uppercase tracking-wider font-mono">
                        World {world.worldNumber}
                      </span>
                      {!isWorldUnlocked && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-ios-slate tracking-tight">
                      {world.title}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-ios-muted">
                    {worldCompletedCount}/{world.levels.length} Completed
                  </span>
                </div>
              </div>

              {/* Levels Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {world.levels.map((level) => {
                  const isCompleted = completedLevelIds.includes(level.id);
                  const isCurrent = activeExerciseId === level.id;
                  const isLevelLocked = !devModeUnlockedAll && !isWorldUnlocked;
                  const diffStyle = DIFFICULTY_STYLES[level.difficulty] || DIFFICULTY_STYLES.Beginner;

                  return (
                    <div
                      key={level.id}
                      id={`level-card-${level.id}`}
                      onClick={() => !isLevelLocked && handleSelectLevel(level.id)}
                      className={`glass-card p-5 rounded-2xl flex flex-col justify-between relative cursor-pointer group ${
                        isCurrent ? 'ring-2 ring-ios-blue ring-offset-2 ring-offset-white/80' : ''
                      } ${isLevelLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <div>
                        {/* Card Header: Level Number & Status Indicator */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] font-bold">
                              {level.levelNumber}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${diffStyle.bg} ${diffStyle.text} ${diffStyle.border}`}>
                              {level.difficulty}
                            </span>
                          </div>

                          <div>
                            {isCompleted ? (
                              <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Passed</span>
                              </div>
                            ) : isLevelLocked ? (
                              <Lock className="w-4 h-4 text-slate-400" />
                            ) : isCurrent ? (
                              <div className="flex items-center gap-1 text-ios-blue bg-ios-blue/10 border border-ios-blue/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                <PlayCircle className="w-3.5 h-3.5" />
                                <span>Active</span>
                              </div>
                            ) : (
                              <div className="text-[10px] font-bold text-slate-400 group-hover:text-ios-blue transition-colors flex items-center gap-0.5">
                                <span>Open</span>
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Title & Subtitle */}
                        <h3 className="text-sm font-bold text-ios-slate group-hover:text-ios-blue transition-colors line-clamp-1 mb-1">
                          {level.title}
                        </h3>
                        <p className="text-xs text-ios-muted line-clamp-2 leading-relaxed mb-4">
                          {level.subtitle}
                        </p>
                      </div>

                      {/* Card Footer: Estimated Time & XP Reward */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-ios-muted">
                        <div className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{level.estimatedMinutes} min</span>
                        </div>

                        <div className="flex items-center gap-1 font-mono font-semibold text-amber-700">
                          <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500/20" />
                          <span>+{level.xpReward} XP</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}

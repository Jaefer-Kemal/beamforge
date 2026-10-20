'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronUp, 
  ChevronDown, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  Play, 
  Terminal, 
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import { getNextLevelId, getLevelById } from '../../data/curriculumCatalog';

export function VerificationDrawer() {
  const { 
    verificationStages, 
    isVerifying, 
    activeExerciseId, 
    advanceToNextLevel, 
    loadSolutionForActiveExercise, 
    terminalEntries 
  } = useWorkspaceStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'stages' | 'terminal'>('stages');

  const level = getLevelById(activeExerciseId);
  const nextLevelId = getNextLevelId(activeExerciseId);
  const passedCount = verificationStages.filter((s) => s.status === 'passed').length;
  const isAllPassed = verificationStages.length > 0 && passedCount === verificationStages.length;
  const hasFailed = verificationStages.some((s) => s.status === 'failed');

  return (
    <div className="border-t border-slate-200/80 bg-white/80 backdrop-blur-xl shrink-0 transition-all">
      {/* Drawer Bar Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <button 
            type="button"
            className="p-1 rounded-md text-slate-400 hover:text-ios-slate transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ios-slate">Verification & Chaos Verdict</span>
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className={`px-2 py-0.5 rounded-full font-bold ${
                isAllPassed 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : hasFailed 
                  ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {passedCount}/{verificationStages.length} Passed
              </span>
            </div>
          </div>
        </div>

        {/* Right Action: Advance CTA or Solution CTA */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {isAllPassed && nextLevelId && (
            <button
              onClick={() => advanceToNextLevel()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all animate-pulse"
            >
              <span>Next Level</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {hasFailed && (
            <button
              onClick={() => {
                if (confirm('Load verified solution to inspect the working OTP 29 implementation?')) {
                  loadSolutionForActiveExercise();
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-semibold transition-colors"
            >
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Inspect Solution</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Body */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 210, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-slate-200/60 flex flex-col"
          >
            {/* Tab Controls */}
            <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100/60 border-b border-slate-200/60 text-xs font-semibold shrink-0">
              <button
                onClick={() => setActiveTab('stages')}
                className={`px-2.5 py-0.5 rounded-md transition-colors ${
                  activeTab === 'stages' ? 'bg-white text-ios-blue shadow-sm' : 'text-ios-muted hover:text-ios-slate'
                }`}
              >
                Verification Stages ({verificationStages.length})
              </button>
              <button
                onClick={() => setActiveTab('terminal')}
                className={`px-2.5 py-0.5 rounded-md transition-colors ${
                  activeTab === 'terminal' ? 'bg-white text-ios-blue shadow-sm' : 'text-ios-muted hover:text-ios-slate'
                }`}
              >
                OTP 29 Output Logs ({terminalEntries.length})
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-3">
              {activeTab === 'stages' ? (
                <div className="space-y-2">
                  {verificationStages.map((stage) => {
                    const isPassed = stage.status === 'passed';
                    const isFailed = stage.status === 'failed';

                    return (
                      <div
                        key={stage.id}
                        className={`p-2.5 rounded-xl border flex items-start gap-2.5 text-xs ${
                          isPassed
                            ? 'bg-emerald-50/60 border-emerald-200/70'
                            : isFailed
                            ? 'bg-rose-50/60 border-rose-200/70'
                            : 'bg-white/60 border-slate-200/60'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isPassed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : isFailed ? (
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-ios-slate">{stage.title}</span>
                            {stage.timeMs !== undefined && (
                              <span className="font-mono text-[10px] text-slate-500">{stage.timeMs}ms</span>
                            )}
                          </div>
                          <p className="text-[11px] text-ios-muted mt-0.5">{stage.assertionDetails}</p>

                          {isFailed && stage.hintOnFail && (
                            <div className="mt-1.5 p-1.5 rounded-md bg-rose-100/70 text-rose-900 text-[10px] font-medium">
                              <strong>Hint:</strong> {stage.hintOnFail}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="font-mono text-[11px] space-y-1 bg-slate-900 text-slate-200 p-3 rounded-xl overflow-x-auto">
                  {terminalEntries.slice(-12).map((entry) => (
                    <div key={entry.id} className="leading-relaxed">
                      <span className="text-slate-500 select-none mr-2">[{entry.timestamp}]</span>
                      <span className={
                        entry.type === 'error' ? 'text-rose-400' :
                        entry.type === 'otp_report' ? 'text-amber-300' :
                        'text-emerald-400'
                      }>
                        {entry.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

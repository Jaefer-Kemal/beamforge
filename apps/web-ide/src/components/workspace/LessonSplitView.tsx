'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  FlaskConical,
  Terminal,
  ShieldCheck,
  Play,
  Eye,
  EyeOff,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  BookOpen,
  Code2,
  Trophy,
  Target,
  ArrowRight,
  WifiOff,
  History,
  Undo2,
  X,
} from 'lucide-react';
import { useWorkspaceStore, loadUserDraft } from '../../state/useWorkspaceStore';
import type {
  OtpDocSignatureCard,
  AstRuleSpec,
  RunTestCaseResult,
  LessonContent,
  VisualSceneId,
} from '../../types/workspace';
import { configureMonacoErlang, ErlangCodeBlock } from '../../lib/monacoErlang';
import { ORCHESTRATOR_HTTP_URL, getOrchestratorHttpUrl } from '../../lib/orchestratorConfig';
import { checkLessonAccessById } from '../../lib/curriculumAccess';
import { BeamConceptVisualizer } from '../pedagogy/BeamConceptVisualizer';
import { MentalModelCheckCard } from '../pedagogy/MentalModelCheckCard';
import { ErlangTermDiffCard } from '../pedagogy/ErlangTermDiffCard';
import { BeamFootprintCard } from '../pedagogy/BeamFootprintCard';
import { IncidentAlertBanner } from '../pedagogy/IncidentAlertBanner';
import { BeamMarkdownRenderer, renderInlineContent } from '../pedagogy/BeamMarkdownRenderer';
import { SolutionUnlockModal } from './SolutionUnlockModal';
import { ResetConfirmModal } from './ResetConfirmModal';
import { SolutionViewerTab } from './SolutionViewerTab';
import { LessonSubmissionsList } from './LessonSubmissionsList';
import { LessonSubmissionDetail } from './LessonSubmissionDetail';

export type { LessonContent };

function resolveVisualScene(lesson: LessonContent): VisualSceneId | null {
  if (lesson.visualScene) return lesson.visualScene;
  const ch = lesson.chapterNumber;
  if (ch === 2) return 'tco_vs_body_stack';
  if (ch === 4) return 'sub_binary_procbin_refc';
  if (ch === 5) return 'mailbox_selective_receive';
  if (ch === 6) return 'links_monitors_signals';
  if (ch === 8 || ch === 9) return 'supervision_rest_for_one_ets_heir';
  if (ch === 10 || ch === 11) return 'tcp_xmpp_stream_framing';
  if (ch === 12) return 'xmpp_5_module_capstone_arch';
  return null;
}

// ── Monaco Editor lazy import ────────────────────────────────────────────────
let MonacoEditor: React.ComponentType<any> | null = null;
if (typeof window !== 'undefined') {
  import('@monaco-editor/react').then((m) => { MonacoEditor = m.default; });
}


// ── Markdown Renderer Delegated to BeamMarkdownRenderer ──────────────────────
const MarkdownRenderer = BeamMarkdownRenderer;

// ── OTP Doc Signature Card ───────────────────────────────────────────────────
function OtpDocCard({ card, isDark }: { card: OtpDocSignatureCard; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="otp-doc-card p-4 my-3 cursor-pointer" onClick={() => setExpanded((e) => !e)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
              style={{ background: 'rgba(139,92,246,0.18)', color: '#8B5CF6' }}>
              <BookOpen className="w-3 h-3" />
              <span>OTP Docs</span>
            </span>
            <span className="text-xs font-mono font-bold" style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
              {card.module}:{card.functionName}
            </span>
          </div>
          <code className="text-sm font-mono font-semibold block"
            style={{ color: isDark ? '#E2E8F0' : '#020617' }}>
            {card.signature}
          </code>
        </div>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
          style={{ color: isDark ? '#64748B' : '#475569' }}
        />
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t pt-3"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)' }}>
          {/* Type spec */}
          <div>
            <div className="text-xs font-bold mb-1" style={{ color: isDark ? '#CBD5E1' : '#334155' }}>Types:</div>
            {card.typesSpec.map((t, i) => (
              <div key={i} className="text-xs font-mono pl-3 font-medium" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>{t}</div>
            ))}
          </div>
          {/* Description */}
          <p className="text-sm leading-relaxed font-normal" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>
            {renderInlineContent(card.description, isDark)}
          </p>
          {/* Complexity */}
          <div className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{renderInlineContent(card.complexityNote, isDark)}</span>
          </div>
          {/* Links */}
          <div className="flex items-center gap-3">
            <a href={card.officialUrl} target="_blank" rel="noreferrer"
              className="text-xs font-medium hover:underline inline-flex items-center gap-1"
              style={{ color: '#007AFF' }}
              onClick={(e) => e.stopPropagation()}>
              <span>Official Erlang Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            {card.githubSourceUrl && (
              <a href={card.githubSourceUrl} target="_blank" rel="noreferrer"
                className="text-xs font-medium hover:underline inline-flex items-center gap-1"
                style={{ color: '#8B5CF6' }}
                onClick={(e) => e.stopPropagation()}>
                <span>OTP Source</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Unified Test Case Card (Boot.dev-Style Test Suite + Live Diffs) ────────────
function UnifiedTestCaseCard({
  testCase,
  runTest,
  isDark,
}: {
  testCase: {
    id: string;
    title: string;
    erlangCall: string;
    expectedOutput: string;
    explanation: string;
  };
  runTest?: RunTestCaseResult;
  isDark: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(testCase.erlangCall);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFailed = runTest && !runTest.passed;
  const isPassed = runTest && runTest.passed;

  return (
    <div
      className="rounded-xl p-3.5 mb-2.5 transition-all duration-200 border"
      style={{
        background: isDark
          ? isFailed
            ? 'rgba(239, 68, 68, 0.05)'
            : isPassed
            ? 'rgba(16, 185, 129, 0.04)'
            : 'rgba(255, 255, 255, 0.03)'
          : isFailed
          ? 'rgba(239, 68, 68, 0.03)'
          : isPassed
          ? 'rgba(16, 185, 129, 0.03)'
          : 'rgba(15, 23, 42, 0.02)',
        borderColor: isDark
          ? isFailed
            ? 'rgba(239, 68, 68, 0.35)'
            : isPassed
            ? 'rgba(16, 185, 129, 0.30)'
            : 'rgba(255, 255, 255, 0.08)'
          : isFailed
          ? 'rgba(239, 68, 68, 0.25)'
          : isPassed
          ? 'rgba(16, 185, 129, 0.22)'
          : 'rgba(15, 23, 42, 0.08)',
      }}
    >
      {/* Header: Title + Status Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <FlaskConical className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span className="text-xs font-semibold truncate" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
            {testCase.title}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {runTest?.timeMs !== undefined && (
            <span className="text-[11px] font-mono flex items-center gap-1" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
              <Clock className="w-3 h-3" />
              <span>{runTest.timeMs}ms</span>
            </span>
          )}

          {isPassed && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"
              style={{
                background: isDark ? 'rgba(16,185,129,0.20)' : 'rgba(16,185,129,0.12)',
                color: isDark ? '#34D399' : '#059669',
                border: '1px solid rgba(16,185,129,0.40)',
              }}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>PASS</span>
            </span>
          )}

          {isFailed && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1"
              style={{
                background: isDark ? 'rgba(239,68,68,0.20)' : 'rgba(239,68,68,0.12)',
                color: isDark ? '#F87171' : '#DC2626',
                border: '1px solid rgba(239,68,68,0.40)',
              }}
            >
              <AlertCircle className="w-3 h-3 text-rose-500" />
              <span>FAIL</span>
            </span>
          )}

          {!runTest && (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
                color: isDark ? '#94A3B8' : '#64748B',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
              }}
            >
              Not Run
            </span>
          )}
        </div>
      </div>

      {/* Blue Erlang Call Pill with Copy Button */}
      <div
        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg mb-2 text-xs font-mono"
        style={{
          background: isDark ? 'rgba(0,122,255,0.12)' : 'rgba(0,122,255,0.06)',
          border: isDark ? '1px solid rgba(0,122,255,0.25)' : '1px solid rgba(0,122,255,0.18)',
        }}
      >
        <code className="truncate font-semibold select-text" style={{ color: isDark ? '#93C5FD' : '#1D4ED8' }}>
          {testCase.erlangCall}
        </code>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 transition-opacity hover:opacity-80"
          style={{
            background: copied
              ? (isDark ? 'rgba(16,185,129,0.20)' : 'rgba(16,185,129,0.15)')
              : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)'),
            color: copied ? (isDark ? '#34D399' : '#059669') : (isDark ? '#CBD5E1' : '#475569'),
          }}
          title="Copy Erlang call expression"
        >
          {copied ? (
            <>
              <Check className="w-2.5 h-2.5 text-emerald-500" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-2.5 h-2.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Expected Output */}
      <div className="flex items-center gap-2 text-xs mb-1.5">
        <span className="font-medium" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>Expected:</span>
        <code className="font-mono font-semibold" style={{ color: '#10B981' }}>{testCase.expectedOutput}</code>
      </div>

      {/* Embedded Term Diff on Failure */}
      {isFailed && (
        <div className="mt-2 mb-1.5">
          <ErlangTermDiffCard test={runTest} isDark={isDark} />
        </div>
      )}

      {/* Explanation */}
      {testCase.explanation && (
        <p className="text-xs mt-1 leading-relaxed font-normal" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
          {testCase.explanation}
        </p>
      )}
    </div>
  );
}

// ── Compilation Error Terminal Card ─────────────────────────────────────────
function CompilationErrorCard({
  stdout,
  diagnostics,
  onJumpTo,
  isDark,
}: {
  stdout: string;
  diagnostics?: Array<{ file: string; line: number; col: number; severity: string; message: string }>;
  onJumpTo: (line: number, col: number) => void;
  isDark: boolean;
}) {
  return (
    <div
      className="rounded-xl p-4 my-2 select-text border shadow-lg"
      style={{
        background: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)',
        borderColor: isDark ? 'rgba(239, 68, 68, 0.40)' : 'rgba(239, 68, 68, 0.30)',
        userSelect: 'text',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#EF4444' }}>
            Erlang Compiler Failure (erlc)
          </span>
        </div>
        <span
          className="text-xs px-2.5 py-0.5 rounded-full font-bold"
          style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444' }}
        >
          {diagnostics && diagnostics.length > 0 ? `${diagnostics.length} Error${diagnostics.length > 1 ? 's' : ''}` : 'Build Failed'}
        </span>
      </div>

      {/* Clickable jump-to-location buttons */}
      {diagnostics && diagnostics.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {diagnostics.map((diag, idx) => (
            <button
              key={idx}
              onClick={() => onJumpTo(diag.line, diag.col)}
              className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
                border: isDark ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(239,68,68,0.25)',
                color: isDark ? '#FCA5A5' : '#DC2626',
              }}
              title={`Click to jump to line ${diag.line}, col ${diag.col} in editor`}
            >
              <ArrowRight className="w-3.5 h-3.5 text-red-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
              <span className="font-semibold underline decoration-dotted">
                {diag.file || 'module'}:{diag.line}:{diag.col}
              </span>
              <span className="opacity-80 truncate max-w-xs">{diag.message}</span>
            </button>
          ))}
        </div>
      )}

      {/* Monospace terminal output matching c(module). with caret indicators */}
      <div
        className="rounded-lg p-3 font-mono text-xs overflow-x-auto select-text leading-relaxed"
        style={{
          background: isDark ? '#05070B' : '#0F172A',
          color: '#E2E8F0',
          border: '1px solid rgba(255,255,255,0.1)',
          userSelect: 'text',
          WebkitUserSelect: 'text',
        }}
      >
        <div className="text-gray-400 text-xs mb-1.5 select-none border-b border-gray-800 pb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span>BEAM Native Output (Select &amp; Ctrl+C to copy)</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">erlc / c(module)</span>
        </div>
        <pre className="whitespace-pre select-text font-mono text-xs" style={{ userSelect: 'text' }}>
          {stdout || 'Compilation failed with no compiler stdout.'}
        </pre>
      </div>
    </div>
  );
}

// ── AST Rules Card ────────────────────────────────────────────────────────────
function AstRulesCard({ rules, isDark }: { rules: AstRuleSpec; isDark: boolean }) {
  return (
    <div className="rounded-xl p-4 my-3"
      style={{
        background: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)',
        border: '1.5px solid rgba(245,158,11,0.25)',
      }}>
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <span className="text-sm font-bold" style={{ color: isDark ? '#FCD34D' : '#B45309' }}>
          Strict Rules & Verification Constraints
        </span>
      </div>
      <div className="space-y-2 text-sm">
        {rules.requireTailRecursion && rules.requireTailRecursion.length > 0 && (
          <div>
            <span className="font-bold text-xs uppercase tracking-wide"
              style={{ color: isDark ? '#CBD5E1' : '#0F172A' }}>Must be tail-recursive:</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {rules.requireTailRecursion.map((f) => (
                <code key={f} className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold"
                  style={{
                    background: isDark ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.15)',
                    color: isDark ? '#34D399' : '#047857',
                    border: isDark ? '1px solid rgba(16,185,129,0.30)' : '1px solid rgba(16,185,129,0.35)',
                  }}>{f}</code>
              ))}
            </div>
          </div>
        )}
        {rules.forbiddenCalls && rules.forbiddenCalls.length > 0 && (
          <div>
            <span className="font-bold text-xs uppercase tracking-wide"
              style={{ color: isDark ? '#CBD5E1' : '#0F172A' }}>Forbidden calls:</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {rules.forbiddenCalls.map((f) => (
                <code key={f} className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold"
                  style={{
                    background: isDark ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.12)',
                    color: isDark ? '#F87171' : '#B91C1C',
                    border: isDark ? '1px solid rgba(239,68,68,0.30)' : '1px solid rgba(239,68,68,0.25)',
                  }}>{f}</code>
              ))}
            </div>
          </div>
        )}
        {rules.forbiddenConstructs && rules.forbiddenConstructs.length > 0 && (
          <div>
            <span className="font-bold text-xs uppercase tracking-wide"
              style={{ color: isDark ? '#CBD5E1' : '#0F172A' }}>Forbidden constructs:</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {rules.forbiddenConstructs.map((c) => (
                <code key={c} className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold"
                  style={{
                    background: isDark ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.12)',
                    color: isDark ? '#F87171' : '#B91C1C',
                    border: isDark ? '1px solid rgba(239,68,68,0.30)' : '1px solid rgba(239,68,68,0.25)',
                  }}>{c}</code>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-xs mt-3" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
        These rules are verified by <code className="font-mono">bf_ast_verifier:verify_rules/3</code> on every <strong>Submit</strong>.
      </p>
    </div>
  );
}

// ── Verification Stage Row ────────────────────────────────────────────────────
function StageRow({ stage, isDark }: { stage: any; isDark: boolean }) {
  const statusColors = {
    pending: isDark ? '#64748B' : '#94A3B8',
    running: '#007AFF',
    passed: '#10B981',
    failed: '#EF4444',
  } as const;
  const statusIcons = {
    pending: <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: statusColors.pending }} />,
    running: <div className="stage-spinner w-3.5 h-3.5 rounded-full border-2 border-t-transparent" style={{ borderColor: '#007AFF' }} />,
    passed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
    failed: <AlertCircle className="w-3.5 h-3.5 text-rose-500" />,
  } as const;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl mb-2 transition-all duration-300 ${stage.status === 'running' ? 'ring-1 ring-blue-400/30' : ''}`}
      style={{
        background: stage.status === 'running'
          ? 'rgba(0,122,255,0.08)'
          : stage.status === 'passed'
          ? 'rgba(16,185,129,0.06)'
          : stage.status === 'failed'
          ? 'rgba(239,68,68,0.06)'
          : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.02)'),
        border: `1px solid ${stage.status === 'running' ? 'rgba(0,122,255,0.20)' : stage.status === 'passed' ? 'rgba(16,185,129,0.20)' : stage.status === 'failed' ? 'rgba(239,68,68,0.20)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)')}`,
      }}>
      <div className="mt-0.5 flex-shrink-0">{statusIcons[stage.status as keyof typeof statusIcons]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold" style={{ color: statusColors[stage.status as keyof typeof statusColors] }}>
            {stage.title}
          </span>
          {stage.timeMs && (
            <span className="text-xs flex-shrink-0" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
              {stage.timeMs}ms
            </span>
          )}
        </div>
        {stage.assertionDetails && (
          <p
            className="text-xs mt-1 leading-relaxed font-mono select-text"
            style={{
              color: stage.status === 'failed' ? (isDark ? '#FCA5A5' : '#DC2626') : (isDark ? '#94A3B8' : '#475569'),
              userSelect: 'text',
              WebkitUserSelect: 'text',
            }}
          >
            {stage.assertionDetails}
          </p>
        )}
      </div>
    </div>
  );
}

// ── MAIN: LessonSplitView ─────────────────────────────────────────────────────
export interface LessonSplitViewProps {
  lesson: LessonContent;
}

export function LessonSplitView({ lesson }: LessonSplitViewProps) {
  const {
    theme,
    files: storeFiles, activeFilePath: storeActiveFilePath, openTabPaths,
    updateFileContent, openFile, resetWorkspace,
    runCode, isRunning, runResult: rawRunResult, beamFootprint,
    runVerificationSuite, isVerifying, verificationStages: rawVerificationStages,
    isBackendOnline, checkBackendHealth,
    isSolutionVisible, setSolutionVisible,
    loadSolutionForActiveExercise,
    completedLevelIds,
    unlockedSolutionLessonIds,
    unlockSolutionForLesson,
    submissions,
    isLoadingSubmissions,
    activeSubmissionDetail,
    setActiveSubmissionDetail,
    restoreSubmissionToEditor,
    resetCurrentExerciseToStarter,
    canUndoRestore,
    undoRestore,
    clearUndoRestore,
    activeExerciseId,
    switchExercise,
    currentUser,
  } = useWorkspaceStore();

  const isDark = theme === 'dark';

  // Component-local drawer and tab state: guaranteed 100% fresh, closed, and isolated per lecture
  const [isLessonOutputOpen, setLessonOutputOpen] = useState(false);
  const [lessonOutputTab, setLessonOutputTab] = useState<'test_results' | 'console' | 'verification' | 'solution'>('test_results');

  // Strictly scope runResult and verificationStages to this lesson
  const runResult = (rawRunResult && rawRunResult.exerciseId === lesson.id) ? rawRunResult : null;
  const verificationStages = (activeExerciseId === lesson.id) ? rawVerificationStages : [];

  // Automatically reveal drawer when run or verification begins for this lesson
  useEffect(() => {
    if (isVerifying && activeExerciseId === lesson.id) {
      setLessonOutputOpen(true);
      setLessonOutputTab('verification');
    }
  }, [isVerifying, activeExerciseId, lesson.id]);

  useEffect(() => {
    if (isRunning && activeExerciseId === lesson.id) {
      setLessonOutputOpen(true);
      setLessonOutputTab('test_results');
    }
  }, [isRunning, activeExerciseId, lesson.id]);

  // Initial files derived from user draft, accepted solution, or lesson starter templates
  const files = React.useMemo(() => {
    if (activeExerciseId === lesson.id && storeFiles.length > 0) {
      return storeFiles;
    }
    const uid = currentUser?.id || (typeof window !== 'undefined' ? localStorage.getItem('bf_current_user_id') || 'user_alpha' : 'user_alpha');
    const userDraft = loadUserDraft(uid, lesson.id);
    if (userDraft && userDraft.length > 0) {
      return userDraft;
    }
    if (typeof window !== 'undefined') {
      try {
        const acceptedRaw = localStorage.getItem(`beamforge_accepted_${uid}_${lesson.id}`);
        if (acceptedRaw) {
          const acceptedMap = JSON.parse(acceptedRaw);
          let baseFiles = lesson.files && lesson.files.length > 0 ? [...lesson.files] : [];
          if (baseFiles.length === 0 && (lesson.starterCode || lesson.solutionCode)) {
            const modMatch = (lesson.starterCode || lesson.solutionCode || '').match(/-module\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*\./);
            const modName = modMatch ? modMatch[1] : lesson.id.replace(/[^a-zA-Z0-9_]/g, '_');
            const fileName = `${modName}.erl`;
            baseFiles = [{ path: `src/${fileName}`, name: fileName, content: lesson.starterCode || '' }];
          }
          return baseFiles.map((f) => ({
            ...f,
            content: acceptedMap[f.path] || f.content,
          }));
        }
      } catch {}
    }

    let lessonFiles = lesson.files && lesson.files.length > 0 ? [...lesson.files] : [];
    if (lessonFiles.length === 0 && (lesson.starterCode || lesson.solutionCode)) {
      const modMatch = (lesson.starterCode || lesson.solutionCode || '').match(/-module\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*\./);
      const modName = modMatch ? modMatch[1] : lesson.id.replace(/[^a-zA-Z0-9_]/g, '_');
      const fileName = `${modName}.erl`;
      lessonFiles = [{ path: `src/${fileName}`, name: fileName, content: lesson.starterCode || '' }];
    }
    return lessonFiles;
  }, [lesson, activeExerciseId, storeFiles, currentUser]);

  const activeFilePath = React.useMemo(() => {
    if (activeExerciseId === lesson.id && storeActiveFilePath && files.some((f) => f.path === storeActiveFilePath)) {
      return storeActiveFilePath;
    }
    return files[0]?.path || '';
  }, [activeExerciseId, lesson.id, storeActiveFilePath, files]);

  const activeFile = files.find((f) => f.path === activeFilePath) || files[0];
  const [editorMounted, setEditorMounted] = useState(false);
  const monacoRef = useRef<any>(null);
  const [mobileTab, setMobileTab] = useState<'guide' | 'code' | 'results'>('guide');
  const [leftTab, setLeftTab] = useState<'guide' | 'submissions'>('guide');

  // Reset active submission inspection when switching lessons
  useEffect(() => {
    setActiveSubmissionDetail(null);
  }, [lesson.id, setActiveSubmissionDetail]);

  // Confirmation Modals
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

  // Strict Sequential Progression check: is this lesson unlocked?
  const accessResult = React.useMemo(() => {
    return checkLessonAccessById(lesson.id, completedLevelIds, false);
  }, [lesson.id, completedLevelIds]);
  const isLessonUnlocked = accessResult.isUnlocked;

  // Solution access: Free and immediate if already solved, otherwise gated via Option B modal
  // Fallbacks to currentUser and user-scoped localStorage ensure refreshes/reloads never ask to forfeit XP for already solved lessons
  const isSolved = React.useMemo(() => {
    if ((completedLevelIds || []).includes(lesson.id)) return true;
    if ((currentUser?.completedLevelIds || []).includes(lesson.id)) return true;
    if (typeof window !== 'undefined') {
      try {
        const uid = currentUser?.id || localStorage.getItem('bf_current_user_id') || 'user_alpha';
        if (localStorage.getItem(`beamforge_completed_${uid}_${lesson.id}`) === 'true') return true;
        if (localStorage.getItem(`beamforge_accepted_${uid}_${lesson.id}`)) return true;
        const cached = localStorage.getItem(`beamforge_user_${uid}`);
        if (cached) {
          const u = JSON.parse(cached);
          if (u.completedLevelIds?.includes(lesson.id)) return true;
        }
      } catch {}
    }
    return false;
  }, [completedLevelIds, currentUser, lesson.id]);

  const isUnlocked = React.useMemo(() => {
    if (isSolved) return true;
    if ((unlockedSolutionLessonIds || []).includes(lesson.id)) return true;
    if ((currentUser?.unlockedSolutionLessonIds || []).includes(lesson.id)) return true;
    if (typeof window !== 'undefined') {
      try {
        const uid = currentUser?.id || localStorage.getItem('bf_current_user_id') || 'user_alpha';
        const cached = localStorage.getItem(`beamforge_user_${uid}`);
        if (cached) {
          const u = JSON.parse(cached);
          if (u.unlockedSolutionLessonIds?.includes(lesson.id)) return true;
        }
      } catch {}
    }
    return false;
  }, [isSolved, unlockedSolutionLessonIds, currentUser, lesson.id]);

  const handleRunCode = () => {
    setLessonOutputOpen(true);
    setLessonOutputTab('test_results');
    if (activeExerciseId !== lesson.id) {
      switchExercise(lesson.id);
    }
    const fileMap: Record<string, string> = {};
    files.forEach((f) => { fileMap[f.path] = f.content; });
    runCode(false, lesson.id, fileMap);
  };

  const handleRunVerification = () => {
    setLessonOutputOpen(true);
    setLessonOutputTab('verification');
    if (activeExerciseId !== lesson.id) {
      switchExercise(lesson.id);
    }
    const fileMap: Record<string, string> = {};
    files.forEach((f) => { fileMap[f.path] = f.content; });
    runVerificationSuite(lesson.id, fileMap);
  };

  const insertTokenAtCursor = (token: string) => {
    if (monacoRef.current?.editor) {
      const editor = monacoRef.current.editor;
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits('beamforge-mobile-toolbar', [
          {
            range: selection,
            text: token,
            forceMoveMarkers: true,
          },
        ]);
      } else {
        editor.trigger('keyboard', 'type', { text: token });
      }
      editor.focus();
    }
  };

  // Verify Go Orchestrator backend health once on initial mount (no aggressive polling)
  useEffect(() => {
    checkBackendHealth();
  }, [checkBackendHealth]);

  // Click-to-jump navigation: Reveal and place cursor at line/column in Monaco editor
  const jumpToPosition = (line: number, col: number) => {
    if (monacoRef.current?.editor) {
      const editor = monacoRef.current.editor;
      editor.revealPositionInCenter({ lineNumber: line, column: col });
      editor.setPosition({ lineNumber: line, column: col });
      editor.focus();
    }
  };

  // Real-time debounced linter (300ms) calling native BEAM /api/v1/lint
  const lintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const runLint = (code: string, filepath: string) => {
    if (lintTimeoutRef.current) {
      clearTimeout(lintTimeoutRef.current);
    }
    lintTimeoutRef.current = setTimeout(async () => {
      if (!monacoRef.current?.editor || !monacoRef.current?.monaco) return;
      const { editor, monaco } = monacoRef.current;
      const model = editor.getModel();
      if (!model) return;

      try {
        const res = await fetch(`${getOrchestratorHttpUrl()}/api/v1/lint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            filename: filepath || 'src/module.erl',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const diags: Array<{ line: number; col: number; severity: string; message: string }> = data.diagnostics || [];
          const markers = diags.map((d) => {
            const lineMax = model.getLineMaxColumn ? model.getLineMaxColumn(d.line) : d.col + 10;
            const startCol = Math.min(Math.max(d.col, 1), lineMax);
            return {
              severity: d.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error,
              startLineNumber: d.line,
              startColumn: startCol,
              endLineNumber: d.line,
              endColumn: lineMax,
              message: d.message,
            };
          });
          monaco.editor.setModelMarkers(model, 'erlang-linter', markers);
        }
      } catch {
        // Silently ignore during offline or live typing
      }
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (lintTimeoutRef.current) {
        clearTimeout(lintTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setEditorMounted(true);
  }, []);

  useEffect(() => {
    if (monacoRef.current?.monaco) {
      monacoRef.current.monaco.editor.setTheme(isDark ? 'beamforge-dark' : 'beamforge-light');
    }
  }, [isDark]);

  useEffect(() => {
    if (monacoRef.current?.monaco && monacoRef.current?.editor) {
      const model = monacoRef.current.editor.getModel();
      if (model) {
        monacoRef.current.monaco.editor.setModelLanguage(model, 'erlang');
      }
    }
    if (activeFile?.content) {
      runLint(activeFile.content, activeFile.path);
    }
  }, [activeFilePath]);

  // Synchronize markers whenever runResult changes
  useEffect(() => {
    if (!monacoRef.current?.editor || !monacoRef.current?.monaco) return;
    const { editor, monaco } = monacoRef.current;
    const model = editor.getModel();
    if (!model) return;

    if (runResult && !runResult.compileOk && runResult.diagnostics && runResult.diagnostics.length > 0) {
      const markers = runResult.diagnostics.map((d) => {
        const lineMax = model.getLineMaxColumn ? model.getLineMaxColumn(d.line) : d.col + 10;
        const startCol = Math.min(Math.max(d.col, 1), lineMax);
        return {
          severity: d.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error,
          startLineNumber: d.line,
          startColumn: startCol,
          endLineNumber: d.line,
          endColumn: lineMax,
          message: d.message,
        };
      });
      monaco.editor.setModelMarkers(model, 'erlang-linter', markers);
    } else if (runResult && runResult.compileOk) {
      monaco.editor.setModelMarkers(model, 'erlang-linter', []);
    }
  }, [runResult]);

  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const outputDrawerHeight = isLessonOutputOpen ? (isDrawerExpanded ? 580 : 340) : 44;

  return (
    <div
      className="flex flex-col md:flex-row w-full overflow-hidden"
      style={{ height: 'calc(100dvh - 3.5rem)', marginTop: '3.5rem' }}
    >
      {/* ── MOBILE SEGMENTED VIEW SWITCHER (< md) ── */}
      <div
        className="flex md:hidden items-center justify-between px-3 py-1.5 border-b flex-shrink-0"
        style={{
          background: isDark ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.75)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
        }}
      >
        <div className="flex items-center gap-1.5 w-full">
          <button
            id="mobile-tab-guide"
            onClick={() => setMobileTab('guide')}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: mobileTab === 'guide'
                ? (isDark ? 'rgba(139,92,246,0.30)' : 'rgba(139,92,246,0.15)')
                : 'transparent',
              color: mobileTab === 'guide' ? '#A78BFA' : (isDark ? '#94A3B8' : '#64748B'),
            }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Guide</span>
          </button>

          <button
            id="mobile-tab-code"
            onClick={() => setMobileTab('code')}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: mobileTab === 'code'
                ? (isDark ? 'rgba(0,122,255,0.25)' : 'rgba(0,122,255,0.12)')
                : 'transparent',
              color: mobileTab === 'code' ? (isDark ? '#60A5FA' : '#007AFF') : (isDark ? '#94A3B8' : '#64748B'),
            }}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>

          <button
            id="mobile-tab-results"
            onClick={() => {
              setMobileTab('results');
              setLessonOutputOpen(true);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: mobileTab === 'results'
                ? (isDark ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.12)')
                : 'transparent',
              color: mobileTab === 'results' ? '#34D399' : (isDark ? '#94A3B8' : '#64748B'),
            }}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Results</span>
            {runResult?.visibleTests && runResult.visibleTests.length > 0 && (
              <span
                className="w-2 h-2 rounded-full inline-block ml-0.5"
                style={{
                  background: runResult.visibleTests.every((t) => t.passed) ? '#10B981' : '#EF4444',
                }}
              />
            )}
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          LEFT PANE — Interactive Textbook, Doc Cards & Assignment Spec
          ════════════════════════════════════════════════════════════════════ */}
      <div
        key={`left-pane-${lesson.id}`}
        className={`${mobileTab === 'guide' ? 'w-full flex' : 'hidden md:flex'} md:w-1/2 flex-col border-r overflow-hidden`}
        style={{
          background: isDark ? 'rgba(11, 17, 30, 0.58)' : 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(28px) saturate(190%)',
          WebkitBackdropFilter: 'blur(28px) saturate(190%)',
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)',
          boxShadow: isDark
            ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.16)'
            : 'inset 0 1px 0 0 rgba(255, 255, 255, 0.90)',
        }}
      >
        {/* Left Header */}
        <div
          className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
          style={{
            background: isDark ? 'rgba(15,23,42,0.45)' : 'rgba(248,250,252,0.70)',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(15,23,42,0.08)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-md font-bold"
              style={{ background: 'rgba(139,92,246,0.18)', color: '#8B5CF6' }}>
              CH{lesson.chapterNumber}·L{lesson.lessonNumber}
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
              style={{
                background: lesson.lessonType === 'incident_triage'
                  ? 'rgba(244,63,94,0.15)'
                  : lesson.lessonType === 'problem_set'
                  ? 'rgba(245,158,11,0.15)'
                  : lesson.lessonType === 'guided_demo'
                  ? 'rgba(0,122,255,0.12)'
                  : 'rgba(16,185,129,0.12)',
                color: lesson.lessonType === 'incident_triage'
                  ? '#F43F5E'
                  : lesson.lessonType === 'problem_set'
                  ? '#F59E0B'
                  : lesson.lessonType === 'guided_demo'
                  ? '#007AFF'
                  : '#10B981',
              }}>
              {lesson.lessonType === 'incident_triage' ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-rose-500 animate-pulse" />
                  <span>Incident Triage</span>
                </>
              ) : lesson.lessonType === 'problem_set' ? (
                <>
                  <Trophy className="w-3 h-3" />
                  <span>Assignment</span>
                </>
              ) : lesson.lessonType === 'guided_demo' ? (
                <>
                  <Target className="w-3 h-3" />
                  <span>Guided Demo</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-3 h-3" />
                  <span>Concept &amp; Code</span>
                </>
              )}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-medium"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
                color: isDark ? '#CBD5E1' : '#475569',
              }}>
              {lesson.difficulty}
            </span>
          </div>
          <h1 className="text-sm font-bold ml-1 flex-1 truncate flex items-center gap-1.5"
            style={{ color: isDark ? '#F8FAFC' : '#020617' }}>
            {lesson.lessonType === 'incident_triage' && (
              <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 animate-pulse" />
            )}
            <span className="truncate">{lesson.title}</span>
          </h1>

          {/* Left Segmented Switcher: [ Guide ] vs [ Submissions (N) ] */}
          <div
            className="flex items-center p-0.5 rounded-lg border flex-shrink-0"
            style={{
              background: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(241, 245, 249, 0.90)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
            }}
          >
            <button
              id="left-tab-guide"
              onClick={() => setLeftTab('guide')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer"
              style={{
                background: leftTab === 'guide'
                  ? (isDark ? 'rgba(255, 255, 255, 0.12)' : '#FFFFFF')
                  : 'transparent',
                color: leftTab === 'guide'
                  ? (isDark ? '#F8FAFC' : '#0F172A')
                  : (isDark ? '#94A3B8' : '#64748B'),
                boxShadow: leftTab === 'guide' && !isDark ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
              }}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Guide</span>
            </button>

            <button
              id="left-tab-submissions"
              onClick={() => setLeftTab('submissions')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer"
              style={{
                background: leftTab === 'submissions'
                  ? (isDark ? 'rgba(255, 255, 255, 0.12)' : '#FFFFFF')
                  : 'transparent',
                color: leftTab === 'submissions'
                  ? (isDark ? '#F8FAFC' : '#0F172A')
                  : (isDark ? '#94A3B8' : '#64748B'),
                boxShadow: leftTab === 'submissions' && !isDark ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
              }}
            >
              <History className="w-3.5 h-3.5" />
              <span>Submissions</span>
              {submissions.length > 0 && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold"
                  style={{
                    background: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.20)',
                    color: '#F59E0B',
                  }}
                >
                  {submissions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Left Scrollable Content */}
        {leftTab === 'guide' ? (
          <div key={`guide-${lesson.id}`} className="flex-1 overflow-y-auto px-5 py-4">
            {/* Slot 1: Incident Alert Banner (only on incident_triage or when incidentAlert is defined) */}
            {lesson.incidentAlert && (
              <IncidentAlertBanner key={`alert-${lesson.id}-${lesson.incidentAlert.id || 'banner'}`} alert={lesson.incidentAlert} isDark={isDark} />
            )}

            {/* Slot 2: Concept Markdown */}
            <MarkdownRenderer key={`concept-${lesson.id}`} md={lesson.conceptMarkdown} isDark={isDark} />

            {/* Slot 3: Interactive Step-Diagram (Collapsible) */}
            {resolveVisualScene(lesson) && (
              <div key={`visual-wrap-${lesson.id}-${resolveVisualScene(lesson)!}`} className="mt-4">
                <BeamConceptVisualizer key={`visual-${lesson.id}-${resolveVisualScene(lesson)!}`} scene={resolveVisualScene(lesson)!} />
              </div>
            )}

            {/* Slot 4: OTP Doc Cards */}
            {lesson.otpDocCards.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5"
                  style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                  <span>Official Erlang Docs &amp; Function Reference</span>
                </div>
                {lesson.otpDocCards.map((card) => (
                  <OtpDocCard key={`doc-${lesson.id}-${card.module}:${card.functionName}`} card={card} isDark={isDark} />
                ))}
              </div>
            )}

            {/* Slot 5: Quick Mental Model Check (Collapsible) */}
            <MentalModelCheckCard
              key={`mental-${lesson.id}-${lesson.mentalModelCheck?.id || 'default'}`}
              check={lesson.mentalModelCheck}
              lessonId={lesson.id}
              chapterNumber={lesson.chapterNumber}
              lessonNumber={lesson.lessonNumber}
              title={lesson.title}
              isDark={isDark}
            />

            {/* Slot 6: Strict Rules & Verification Constraints Card */}
            {lesson.astRules && <AstRulesCard key={`ast-${lesson.id}`} rules={lesson.astRules} isDark={isDark} />}

            {/* Mobile Quick-Jump to Code Editor */}
            <div className="flex md:hidden pt-4 pb-2">
              <button
                onClick={() => setMobileTab('code')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.99]"
                style={{
                  background: 'linear-gradient(135deg, #007AFF 0%, #0056B3 100%)',
                  color: '#FFFFFF',
                }}
              >
                <Code2 className="w-4 h-4" />
                <span>Open Code Editor</span>
              </button>
            </div>

            <div className="h-8" />
          </div>
        ) : activeSubmissionDetail ? (
          <LessonSubmissionDetail
            key={`sub-detail-${activeSubmissionDetail.id}`}
            submission={activeSubmissionDetail}
            isDark={isDark}
            onBack={() => setActiveSubmissionDetail(null)}
            onRestore={(sub) => {
              restoreSubmissionToEditor(sub);
              if (typeof window !== 'undefined' && window.innerWidth < 768) {
                setMobileTab('code');
              }
            }}
          />
        ) : (
          <LessonSubmissionsList
            key={`sub-list-${lesson.id}`}
            submissions={submissions}
            isLoading={isLoadingSubmissions}
            isDark={isDark}
            onSelectSubmission={(sub) => setActiveSubmissionDetail(sub)}
          />
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          RIGHT PANE — Code Editor, Action Bar & Output Drawer (Responsive)
          ════════════════════════════════════════════════════════════════════ */}
      <div
        key={`right-pane-${lesson.id}`}
        className={`${mobileTab === 'code' ? 'w-full flex' : 'hidden md:flex'} md:w-1/2 flex-col flex-1 min-h-0 overflow-hidden relative`}
        style={{ background: isDark ? '#0B0F17' : '#FFFFFF' }}
      >

        {/* File Tabs Header */}
        <div
          className="flex items-center justify-between px-3 flex-shrink-0"
          style={{
            background: isDark ? 'rgba(15,23,42,0.45)' : 'rgba(248,250,252,0.70)',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(15,23,42,0.08)',
            height: '44px',
          }}
        >
          {/* Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto flex-1">
            {openTabPaths.map((path) => {
              const file = files.find((f) => f.path === path);
              if (!file) return null;
              const isActive = path === activeFilePath;
              return (
                <button
                  key={path}
                  id={`file-tab-${file.name}`}
                  onClick={() => openFile(path)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200"
                  style={{
                    background: isActive
                      ? (isDark ? 'rgba(255,255,255,0.12)' : '#FFFFFF')
                      : 'transparent',
                    color: isActive ? (isDark ? '#F8FAFC' : '#020617') : (isDark ? '#94A3B8' : '#475569'),
                    boxShadow: isActive && !isDark ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
                  }}
                >
                  <span className="w-2 h-2 rounded-full"
                    style={{ background: '#F59E0B', opacity: file.isModified ? 1 : 0 }} />
                  {file.name}
                </button>
              );
            })}
          </div>

          {/* Reset Button */}
          <button
            id="reset-template-btn"
            onClick={() => setIsResetModalOpen(true)}
            className="ml-2 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 transition-all duration-200 cursor-pointer"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
              color: isDark ? '#CBD5E1' : '#334155',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
            }}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Undo Restore Notification Banner */}
        {canUndoRestore && (
          <div
            id="undo-restore-banner"
            className="flex items-center justify-between px-3.5 py-2 border-b animate-fade-in flex-shrink-0"
            style={{
              background: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
              borderColor: isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.20)',
            }}
          >
            <div className="flex items-center gap-2 text-xs font-medium" style={{ color: isDark ? '#FDE68A' : '#B45309' }}>
              <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
              <span>Restored snapshot from past submission.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="undo-restore-btn"
                onClick={undoRestore}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  color: '#FFFFFF',
                  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.25)',
                }}
              >
                <Undo2 className="w-3 h-3" />
                <span>Undo Restore</span>
              </button>
              <button
                id="dismiss-undo-restore-btn"
                onClick={clearUndoRestore}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                style={{ background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Monaco Editor */}
        <div className="flex-1 w-full min-h-0 overflow-hidden relative">
          {editorMounted && MonacoEditor ? (
            <MonacoEditor
              key={`monaco-${lesson.id}-${activeFile?.path || 'workspace'}`}
              language="erlang"
              path={activeFile?.path || 'workspace.erl'}
              value={activeFile?.content ?? ''}
              theme={isDark ? 'beamforge-dark' : 'beamforge-light'}
              beforeMount={(monaco: any) => {
                configureMonacoErlang(monaco);
              }}
              onChange={(val: string) => {
                const newContent = val ?? '';
                if (activeExerciseId !== lesson.id) {
                  switchExercise(lesson.id);
                }
                if (activeFile) updateFileContent(activeFile.path, newContent);
                runLint(newContent, activeFile?.path || 'src/module.erl');
              }}
              onMount={(editor: any, monaco: any) => {
                configureMonacoErlang(monaco);
                const model = editor.getModel();
                if (model) {
                  monaco.editor.setModelLanguage(model, 'erlang');
                }
                monaco.editor.setTheme(isDark ? 'beamforge-dark' : 'beamforge-light');
                monacoRef.current = { editor, monaco };
                if (activeFile?.content) {
                  runLint(activeFile.content, activeFile.path);
                }
              }}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontWeight: '500',
                fontLigatures: false,
                lineHeight: 22,
                minimap: { enabled: false },
                folding: false,
                glyphMargin: false,
                lineNumbersMinChars: 2,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 12, bottom: 12 },
                renderLineHighlight: 'gutter',
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                bracketPairColorization: { enabled: true },
                readOnly: activeFile?.isReadOnly ?? false,
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-sm" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                Loading editor…
              </div>
            </div>
          )}
        </div>

        {/* ── Mobile Erlang Quick-Syntax Accessory Bar (< md) ── */}
        <div
          id="erlang-syntax-accessory-bar"
          className="flex md:hidden items-center gap-1.5 px-3 py-1.5 overflow-x-auto flex-shrink-0 no-scrollbar border-t"
          style={{
            background: isDark ? 'rgba(15,23,42,0.85)' : 'rgba(241,245,249,0.92)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
          }}
        >
          {[
            '->', '>>', '<<', ':=', '=>', ',', ';', '.', '_', '|',
            '{', '}', '[', ']', '?', 'ok', 'error',
          ].map((token) => (
            <button
              key={token}
              onClick={() => insertTokenAtCursor(token)}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex-shrink-0 active:scale-95"
              style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(203,213,225,0.80)',
                color: isDark ? '#E2E8F0' : '#1E293B',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              {token}
            </button>
          ))}
        </div>

        {/* ── Boot.dev Action Bar ── */}
        <div
          id="lesson-action-bar"
          className="flex items-center gap-2 px-3 py-1.5 flex-shrink-0 pb-safe"
          style={{
            minHeight: '48px',
            background: isDark ? 'rgba(11,15,23,0.55)' : 'rgba(241,245,249,0.70)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderTop: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(15,23,42,0.08)',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(15,23,42,0.08)',
            boxShadow: isDark ? 'inset 0 1px 0 0 rgba(255,255,255,0.12)' : 'inset 0 1px 0 0 rgba(255,255,255,0.80)',
          }}
        >
          {/* ▷ Run */}
          <button
            id="run-btn"
            onClick={() => {
              if (!isLessonUnlocked) return;
              setLessonOutputOpen(true);
              setLessonOutputTab('test_results');
              if (typeof window !== 'undefined' && window.innerWidth < 768) setMobileTab('results');
              handleRunCode();
            }}
            disabled={!isLessonUnlocked || isRunning || isVerifying || !isBackendOnline}
            title={
              !isLessonUnlocked
                ? 'Lesson locked: Complete prerequisite lesson first to run code'
                : !isBackendOnline
                ? 'Go Orchestrator backend is offline. Connect to runtime to run code.'
                : 'Run visible test cases'
            }
            className={`btn-run flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-10 text-xs font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${!isLessonUnlocked || isRunning || isVerifying || !isBackendOnline ? 'pointer-events-none' : ''}`}
          >
            {isRunning ? (
              <div className="stage-spinner w-3 h-3 rounded-full border-2 border-white border-t-transparent" />
            ) : !isBackendOnline ? (
              <WifiOff className="w-3.5 h-3.5 text-red-300" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isRunning ? 'Running...' : !isBackendOnline ? 'Run (Offline)' : 'Run'}</span>
          </button>

          {/* ▶ Submit */}
          <button
            id="submit-btn"
            onClick={() => {
              if (!isLessonUnlocked) return;
              setLessonOutputOpen(true);
              setLessonOutputTab('verification');
              if (typeof window !== 'undefined' && window.innerWidth < 768) setMobileTab('results');
              handleRunVerification();
            }}
            disabled={!isLessonUnlocked || isVerifying || isRunning || !isBackendOnline}
            title={
              !isLessonUnlocked
                ? 'Lesson locked: Complete prerequisite lesson first to submit code'
                : !isBackendOnline
                ? 'Go Orchestrator backend is offline. Connect to runtime to submit.'
                : 'Submit code for full verification suite'
            }
            className={`btn-submit flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 h-10 text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${!isLessonUnlocked || isVerifying || isRunning || !isBackendOnline ? 'pointer-events-none' : ''}`}
          >
            {isVerifying ? (
              <div className="stage-spinner w-3 h-3 rounded-full border-2 border-white border-t-transparent" />
            ) : !isBackendOnline ? (
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>{isVerifying ? 'Verifying...' : !isBackendOnline ? 'Submit (Offline)' : 'Submit'}</span>
          </button>

          {/* Solution */}
          <button
            id="solution-btn"
            disabled={!isLessonUnlocked}
            onClick={() => {
              if (!isLessonUnlocked) return;
              if (isUnlocked) {
                if (isLessonOutputOpen && lessonOutputTab === 'solution') {
                  setLessonOutputOpen(false);
                } else {
                  setLessonOutputOpen(true);
                  setLessonOutputTab('solution');
                  if (typeof window !== 'undefined' && window.innerWidth < 768) setMobileTab('results');
                }
              } else {
                setIsUnlockModalOpen(true);
              }
            }}
            className={`glass-pill flex items-center justify-center gap-1.5 px-3 h-10 text-xs font-medium rounded-xl disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${!isLessonUnlocked ? 'pointer-events-none' : ''}`}
            style={{
              background: isLessonOutputOpen && lessonOutputTab === 'solution'
                ? (isDark ? 'rgba(245,158,11,0.20)' : 'rgba(245,158,11,0.12)')
                : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'),
              color: isLessonOutputOpen && lessonOutputTab === 'solution'
                ? (isDark ? '#FCD34D' : '#D97706')
                : (isDark ? '#94A3B8' : '#64748B'),
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
            }}
            title={
              !isLessonUnlocked
                ? 'Lesson locked: Complete prerequisite lesson first'
                : `Inspect reference solution for ${activeFile?.name || 'active file'}`
            }
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Solution</span>
          </button>

          {/* Test Cases (hidden on mobile since Results tab is at the top) */}
          <button
            id="test-cases-btn"
            onClick={() => {
              setLessonOutputOpen(true);
              setLessonOutputTab('test_results');
              if (typeof window !== 'undefined' && window.innerWidth < 768) setMobileTab('results');
            }}
            className="glass-pill hidden sm:flex items-center justify-center gap-1.5 px-3 h-10 text-xs font-medium rounded-xl"
            style={{ color: isDark ? '#94A3B8' : '#64748B' }}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Test Cases</span>
          </button>

          {/* Keyboard shortcut hint */}
          <div className="ml-auto text-xs hidden lg:block"
            style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
            <kbd className="px-1 rounded text-xs font-mono"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' }}>
              ⌘↵
            </kbd> Submit
          </div>
        </div>

        {/* ── Collapsible Output & Verification Drawer (Desktop Only in Code Pane) ── */}
        <div
          className="hidden md:block flex-shrink-0 overflow-hidden transition-all duration-300"
          style={{ height: `${outputDrawerHeight}px` }}
        >
          {/* Drawer Tab Bar */}
          <div
            className="flex items-center gap-0 px-3 flex-shrink-0 cursor-pointer"
            style={{
              height: '44px',
              background: isDark ? 'rgba(11,15,23,0.80)' : 'rgba(238,242,246,0.80)',
              borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
            }}
            onClick={() => setLessonOutputOpen(!isLessonOutputOpen)}
          >
            <svg className={`w-3.5 h-3.5 mr-2 flex-shrink-0 transition-transform ${isLessonOutputOpen ? 'rotate-0' : '-rotate-90'}`}
              style={{ color: isDark ? '#64748B' : '#94A3B8' }} viewBox="0 0 14 14" fill="none">
              <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            {([ 
              {
                key: 'test_results' as const,
                label: 'Test Suite & Diffs',
                icon: FlaskConical,
                badge: runResult && !runResult.compileOk
                  ? { text: 'Build Error', color: '#EF4444', bg: 'rgba(239,68,68,0.20)' }
                  : runResult && runResult.compileOk
                  ? {
                      text: `${runResult.visibleTests.filter((t) => t.passed).length}/${runResult.visibleTests.length}`,
                      color: runResult.visibleTests.length > 0 && runResult.visibleTests.every((t) => t.passed) ? '#10B981' : '#EF4444',
                      bg: runResult.visibleTests.length > 0 && runResult.visibleTests.every((t) => t.passed) ? 'rgba(16,185,129,0.20)' : 'rgba(239,68,68,0.20)'
                    }
                  : { text: `${lesson.visibleTestCases.length}`, color: isDark ? '#94A3B8' : '#64748B', bg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' },
              },
              {
                key: 'console' as const,
                label: 'Console Output',
                icon: Terminal,
                badge: runResult && !runResult.compileOk
                  ? { text: 'Error', color: '#EF4444', bg: 'rgba(239,68,68,0.20)' }
                  : undefined,
              },
              {
                key: 'verification' as const,
                label: 'Submit Verification',
                icon: ShieldCheck,
                badge: isVerifying
                  ? { text: 'Checking...', color: '#007AFF', bg: 'rgba(0,122,255,0.20)' }
                  : verificationStages.length > 0
                  ? {
                      text: verificationStages.every((s) => s.status === 'passed') ? 'Passed' : 'Failed',
                      color: verificationStages.every((s) => s.status === 'passed') ? '#10B981' : '#EF4444',
                      bg: verificationStages.every((s) => s.status === 'passed') ? 'rgba(16,185,129,0.20)' : 'rgba(239,68,68,0.20)'
                    }
                  : undefined,
              },
              {
                key: 'solution' as const,
                label: `Solution (${activeFile?.name || 'File'})`,
                icon: Eye,
                badge: isSolved
                  ? { text: 'Solved', color: '#10B981', bg: 'rgba(16,185,129,0.20)' }
                  : (unlockedSolutionLessonIds || []).includes(lesson.id)
                  ? { text: 'Unlocked', color: '#F59E0B', bg: 'rgba(245,158,11,0.20)' }
                  : undefined,
              },
            ]).map(({ key, label, icon: Icon, badge }) => (
              <button
                key={key}
                id={`output-tab-${key}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (key === 'solution') {
                    if (isUnlocked) {
                      if (isLessonOutputOpen && lessonOutputTab === 'solution') {
                        setLessonOutputOpen(false);
                      } else {
                        setLessonOutputTab('solution');
                        setLessonOutputOpen(true);
                      }
                    } else {
                      setIsUnlockModalOpen(true);
                    }
                  } else {
                    setLessonOutputTab(key);
                    setLessonOutputOpen(true);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg mr-1 transition-all duration-150"
                style={{
                  background: lessonOutputTab === key && isLessonOutputOpen
                    ? (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)')
                    : 'transparent',
                  color: lessonOutputTab === key && isLessonOutputOpen
                    ? (isDark ? '#F8FAFC' : '#0F172A')
                    : (isDark ? '#64748B' : '#94A3B8'),
                }}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{label}</span>
                {badge && (
                  <span
                    className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.text}
                  </span>
                )}
              </button>
            ))}

            {/* Run result summary badge */}
            {runResult && (
              <div className="ml-auto flex items-center gap-2 text-xs">
                <span style={{ color: isDark ? '#64748B' : '#94A3B8' }}>{runResult.totalDurationMs}ms</span>
                {!runResult.compileOk ? (
                  <span
                    className="px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 text-[11px]"
                    style={{
                      background: 'rgba(239,68,68,0.20)',
                      color: '#EF4444',
                      border: '1px solid rgba(239,68,68,0.30)',
                    }}
                  >
                    <AlertCircle className="w-3 h-3" />
                    <span>Compilation Failed</span>
                  </span>
                ) : (
                  <span
                    className="px-2 py-0.5 rounded-full font-bold text-[11px] flex items-center gap-1"
                    style={{
                      background: runResult.visibleTests.length > 0 && runResult.visibleTests.every((t) => t.passed)
                        ? 'rgba(16,185,129,0.18)'
                        : 'rgba(239,68,68,0.18)',
                      color: runResult.visibleTests.length > 0 && runResult.visibleTests.every((t) => t.passed)
                        ? '#10B981'
                        : '#EF4444',
                      border: runResult.visibleTests.length > 0 && runResult.visibleTests.every((t) => t.passed)
                        ? '1px solid rgba(16,185,129,0.30)'
                        : '1px solid rgba(239,68,68,0.30)',
                    }}
                  >
                    {runResult.visibleTests.length > 0 && runResult.visibleTests.every((t) => t.passed) ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    <span>{runResult.visibleTests.filter((t) => t.passed).length}/{runResult.visibleTests.length} Passed</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Drawer Content */}
          {isLessonOutputOpen && (
            <div key={`drawer-content-${lesson.id}-${lessonOutputTab}`} className="overflow-y-auto" style={{ height: `${outputDrawerHeight - 44}px`, background: isDark ? 'rgba(11,15,23,0.95)' : 'rgba(248,250,252,0.95)' }}>
              {lessonOutputTab === 'test_results' && (
                <div className="p-4 space-y-3">
                  {/* Compilation Failure Terminal Card if erlc failed */}
                  {runResult && !runResult.compileOk && (
                    <CompilationErrorCard
                      key={`comp-err-${lesson.id}`}
                      stdout={runResult.stdout}
                      diagnostics={runResult.diagnostics}
                      onJumpTo={jumpToPosition}
                      isDark={isDark}
                    />
                  )}

                  {/* Header subtitle */}
                  <div className="flex items-center justify-between text-xs" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                    <span>
                      {lesson.visibleTestCases.length} test expressions evaluated on <strong>Run</strong>.
                    </span>
                    {runResult?.compileOk && (
                      <span className="font-medium text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> All modules compiled cleanly
                      </span>
                    )}
                  </div>

                  {/* Unified Test Cards for visible test cases */}
                  {lesson.visibleTestCases.map((tc, idx) => {
                    const matchedTest = runResult?.visibleTests?.find(
                      (t) => t.callStr.trim() === tc.erlangCall.trim() || t.expected.trim() === tc.expectedOutput.trim()
                    ) || (runResult?.visibleTests ? runResult.visibleTests[idx] : undefined);

                    return (
                      <UnifiedTestCaseCard
                        key={`tc-${lesson.id}-${tc.id || idx}`}
                        testCase={tc}
                        runTest={matchedTest}
                        isDark={isDark}
                      />
                    );
                  })}

                  {/* Extra tests in runResult that weren't in visibleTestCases (if any) */}
                  {runResult && runResult.compileOk && runResult.visibleTests.length > lesson.visibleTestCases.length && (
                    <div className="pt-2">
                      <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                        Additional Dynamic Test Results
                      </div>
                      {runResult.visibleTests.slice(lesson.visibleTestCases.length).map((extra, i) => (
                        <ErlangTermDiffCard key={`diff-${lesson.id}-${extra.callStr || i}`} test={extra} isDark={isDark} />
                      ))}
                    </div>
                  )}

                  {/* BEAM VM Real Telemetry Strip placed under test results */}
                  {beamFootprint && (
                    <div className="pt-3">
                      <BeamFootprintCard footprint={beamFootprint} isDark={isDark} />
                    </div>
                  )}
                </div>
              )}

              {lessonOutputTab === 'console' && (
                <div
                  className="p-4 font-mono text-xs space-y-1 select-text"
                  style={{
                    color: isDark ? '#94A3B8' : '#475569',
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                  }}
                >
                  {runResult && !runResult.compileOk && (
                    <div
                      className="mb-3 p-2.5 rounded-lg flex items-center justify-between border select-text"
                      style={{
                        background: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
                        borderColor: isDark ? 'rgba(239,68,68,0.30)' : 'rgba(239,68,68,0.20)',
                        color: isDark ? '#FCA5A5' : '#DC2626',
                        userSelect: 'text',
                      }}
                    >
                      <span className="flex items-center gap-1.5 font-sans font-semibold">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        <span>Compilation failed. Select and copy terminal output below:</span>
                      </span>
                      {runResult.diagnostics && runResult.diagnostics.length > 0 && (
                        <button
                          onClick={() => jumpToPosition(runResult.diagnostics![0].line, runResult.diagnostics![0].col)}
                          className="px-2 py-0.5 rounded text-[11px] font-mono font-medium underline hover:text-red-300 flex items-center gap-1"
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>Jump to L{runResult.diagnostics[0].line}:C{runResult.diagnostics[0].col}</span>
                        </button>
                      )}
                    </div>
                  )}
                  {runResult?.stdout
                    ? runResult.stdout.split('\n').map((line, i) => (
                        <div
                          key={i}
                          className="leading-relaxed select-text font-mono whitespace-pre"
                          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                        >
                          {line || '\u00A0'}
                        </div>
                      ))
                    : <div className="text-center pt-8" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                        Click <strong>Run</strong> to see <code>io:format</code> output here.
                      </div>
                  }
                </div>
              )}

              {lessonOutputTab === 'verification' && (
                <div className="p-4 space-y-3">
                  {/* Compilation Failure Terminal Card if erlc failed during verification */}
                  {runResult && !runResult.compileOk && (
                    <CompilationErrorCard
                      stdout={runResult.stdout}
                      diagnostics={runResult.diagnostics}
                      onJumpTo={jumpToPosition}
                      isDark={isDark}
                    />
                  )}

                  {verificationStages.length === 0 ? (
                    <div
                      className="p-6 text-center rounded-xl border"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.02)',
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
                      }}
                    >
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-blue-400 opacity-80" />
                      <h3 className="text-sm font-bold mb-1" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                        Automated Grading & Verification
                      </h3>
                      <p className="text-xs max-w-sm mx-auto leading-relaxed" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                        Click <strong className="text-blue-400">Submit</strong> in the top action bar to execute all grading stages: clean BEAM compilation, AST/bytecode rules (TCO recursion), and hidden property assertions.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                          Grading Verification Pipeline
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{
                            background: verificationStages.every((s) => s.status === 'passed')
                              ? 'rgba(16,185,129,0.20)'
                              : verificationStages.some((s) => s.status === 'failed')
                              ? 'rgba(239,68,68,0.20)'
                              : 'rgba(0,122,255,0.20)',
                            color: verificationStages.every((s) => s.status === 'passed')
                              ? '#10B981'
                              : verificationStages.some((s) => s.status === 'failed')
                              ? '#EF4444'
                              : '#007AFF',
                          }}
                        >
                          {verificationStages.every((s) => s.status === 'passed')
                            ? '100/100 PASSED'
                            : verificationStages.some((s) => s.status === 'failed')
                            ? 'VERIFICATION FAILED'
                            : 'RUNNING...'}
                        </span>
                      </div>
                      {verificationStages.map((s) => (
                        <StageRow key={s.id} stage={s} isDark={isDark} />
                      ))}

                      {/* Visible Test Cases & Assertions Evaluated During Verification */}
                      {lesson.visibleTestCases && lesson.visibleTestCases.length > 0 && (
                        <div className="pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                              Visible Test Cases &amp; Assertions
                            </span>
                            {runResult?.visibleTests && runResult.visibleTests.length > 0 && (
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{
                                  background: runResult.visibleTests.every((t) => t.passed) ? 'rgba(16,185,129,0.20)' : 'rgba(239,68,68,0.20)',
                                  color: runResult.visibleTests.every((t) => t.passed) ? '#10B981' : '#EF4444',
                                }}
                              >
                                {runResult.visibleTests.filter((t) => t.passed).length}/{runResult.visibleTests.length} Passed
                              </span>
                            )}
                          </div>
                          {lesson.visibleTestCases.map((tc, idx) => {
                            const matchedTest = runResult?.visibleTests?.find(
                              (t) => t.callStr.trim() === tc.erlangCall.trim() || t.expected.trim() === tc.expectedOutput.trim()
                            ) || (runResult?.visibleTests ? runResult.visibleTests[idx] : undefined);

                            return (
                              <UnifiedTestCaseCard
                                key={`verify-${tc.id || idx}`}
                                testCase={tc}
                                runTest={matchedTest}
                                isDark={isDark}
                              />
                            );
                          })}
                        </div>
                      )}

                      {/* BEAM VM Real Telemetry Strip placed under submit verification pipeline */}
                      {beamFootprint && (
                        <div className="pt-3">
                          <BeamFootprintCard footprint={beamFootprint} isDark={isDark} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Solution Tab Content */}
              {lessonOutputTab === 'solution' && (
                <SolutionViewerTab
                  key={`sol-viewer-${lesson.id}-${activeFile?.path || 'main'}`}
                  fileName={activeFile?.name || 'solution.erl'}
                  solutionCode={
                    (activeFile?.path && lesson.solutionFiles && lesson.solutionFiles[activeFile.path]) ||
                    (activeFile?.path && lesson.solutionFiles && lesson.solutionFiles[activeFile.path.replace(/^src\//, '')]) ||
                    (activeFile?.path && lesson.solutionFiles && lesson.solutionFiles['src/' + activeFile.path]) ||
                    lesson.solutionCode ||
                    (lesson.solutionFiles ? Object.values(lesson.solutionFiles)[0] : '') ||
                    ''
                  }
                  solutionExplanation={lesson.solutionExplanation}
                  isDark={isDark}
                  isExpanded={isDrawerExpanded}
                  onToggleExpand={() => setIsDrawerExpanded((prev) => !prev)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE DEDICATED RESULTS & DEBUGGING VIEW (< md)
          ════════════════════════════════════════════════════════════════════ */}
      <div
        className={`${mobileTab === 'results' ? 'w-full flex' : 'hidden'} md:hidden flex-col flex-1 min-h-0 overflow-hidden relative`}
        style={{
          background: isDark ? '#0B0F17' : '#FFFFFF',
        }}
      >
        {/* Mobile Results Header & Sub-Tabs */}
        <div
          className="flex items-center justify-between px-3 flex-shrink-0 border-b select-none"
          style={{
            height: '44px',
            background: isDark ? 'rgba(15,23,42,0.60)' : 'rgba(248,250,252,0.80)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
          }}
        >
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              id="mobile-results-tab-tests"
              onClick={() => setLessonOutputTab('test_results')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: lessonOutputTab === 'test_results'
                  ? (isDark ? 'rgba(0,122,255,0.25)' : 'rgba(0,122,255,0.12)')
                  : 'transparent',
                color: lessonOutputTab === 'test_results'
                  ? (isDark ? '#60A5FA' : '#007AFF')
                  : (isDark ? '#94A3B8' : '#64748B'),
              }}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Tests &amp; Diffs</span>
              {runResult && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-bold ml-0.5"
                  style={{
                    background: runResult.compileOk && runResult.visibleTests.length > 0 && runResult.visibleTests.every((t) => t.passed)
                      ? 'rgba(16,185,129,0.20)'
                      : 'rgba(239,68,68,0.20)',
                    color: runResult.compileOk && runResult.visibleTests.length > 0 && runResult.visibleTests.every((t) => t.passed)
                      ? '#10B981'
                      : '#EF4444',
                  }}
                >
                  {runResult.compileOk
                    ? `${runResult.visibleTests.filter((t) => t.passed).length}/${runResult.visibleTests.length}`
                    : 'Error'}
                </span>
              )}
            </button>

            <button
              id="mobile-results-tab-console"
              onClick={() => setLessonOutputTab('console')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: lessonOutputTab === 'console'
                  ? (isDark ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.12)')
                  : 'transparent',
                color: lessonOutputTab === 'console'
                  ? (isDark ? '#A78BFA' : '#7C3AED')
                  : (isDark ? '#94A3B8' : '#64748B'),
              }}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Console</span>
            </button>

            <button
              id="mobile-results-tab-verify"
              onClick={() => setLessonOutputTab('verification')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: lessonOutputTab === 'verification'
                  ? (isDark ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.12)')
                  : 'transparent',
                color: lessonOutputTab === 'verification'
                  ? '#34D399'
                  : (isDark ? '#94A3B8' : '#64748B'),
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify</span>
              {verificationStages.length > 0 && (
                <span
                  className="w-2 h-2 rounded-full inline-block ml-0.5"
                  style={{
                    background: verificationStages.every((s) => s.status === 'passed') ? '#10B981' : '#EF4444',
                  }}
                />
              )}
            </button>

            <button
              id="mobile-results-tab-solution"
              onClick={() => {
                if (isUnlocked) {
                  setLessonOutputTab('solution');
                } else {
                  setIsUnlockModalOpen(true);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: lessonOutputTab === 'solution'
                  ? (isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.12)')
                  : 'transparent',
                color: lessonOutputTab === 'solution'
                  ? '#FCD34D'
                  : (isDark ? '#94A3B8' : '#64748B'),
              }}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Solution</span>
            </button>
          </div>

          <button
            onClick={() => setMobileTab('code')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all text-blue-500"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
        </div>

        {/* Mobile Results Scrollable Body */}
        <div className={`flex-1 min-h-0 space-y-3 ${lessonOutputTab === 'solution' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto p-4'}`}>
          {lessonOutputTab === 'test_results' && (
            <>
              {runResult && !runResult.compileOk && (
                <CompilationErrorCard
                  stdout={runResult.stdout}
                  diagnostics={runResult.diagnostics}
                  onJumpTo={(line, col) => {
                    setMobileTab('code');
                    jumpToPosition(line, col);
                  }}
                  isDark={isDark}
                />
              )}

              {runResult?.visibleTests && runResult.visibleTests.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      Test Case Assertions &amp; Diffs
                    </span>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: runResult.visibleTests.every((t) => t.passed) ? 'rgba(16,185,129,0.20)' : 'rgba(239,68,68,0.20)',
                        color: runResult.visibleTests.every((t) => t.passed) ? '#10B981' : '#EF4444',
                      }}
                    >
                      {runResult.visibleTests.filter((t) => t.passed).length}/{runResult.visibleTests.length} Passed
                    </span>
                  </div>
                  {lesson.visibleTestCases.map((tc, idx) => {
                    const matchedTest = runResult?.visibleTests?.find(
                      (t) => t.callStr.trim() === tc.erlangCall.trim() || t.expected.trim() === tc.expectedOutput.trim()
                    ) || (runResult?.visibleTests ? runResult.visibleTests[idx] : undefined);

                    return (
                      <UnifiedTestCaseCard
                        key={`tc-m-${lesson.id}-${tc.id || idx}`}
                        testCase={tc}
                        runTest={matchedTest}
                        isDark={isDark}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center rounded-2xl border" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}>
                  <FlaskConical className="w-8 h-8 mx-auto mb-2 text-blue-400 opacity-70" />
                  <h4 className="text-sm font-bold mb-1" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                    No Tests Executed Yet
                  </h4>
                  <p className="text-xs max-w-xs mx-auto leading-relaxed mb-4" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Tap <strong>Run Tests</strong> below to compile your code and inspect Erlang term diffs.
                  </p>
                  <button
                    onClick={() => {
                      if (!isLessonUnlocked) return;
                      handleRunCode();
                    }}
                    disabled={!isLessonUnlocked || isRunning || isVerifying || !isBackendOnline}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: '#007AFF' }}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Tests Now</span>
                  </button>
                </div>
              )}
            </>
          )}

          {lessonOutputTab === 'console' && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                BEAM Process Standard Output (stdout)
              </span>
              <pre
                className="font-mono text-xs p-3 rounded-xl overflow-x-auto leading-relaxed select-text"
                style={{
                  background: isDark ? '#05080E' : '#0F172A',
                  color: '#34D399',
                  border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.12)',
                  minHeight: '160px',
                }}
              >
                {runResult?.stdout ? runResult.stdout : '% No console output captured. Use io:format/2 in your module.'}
              </pre>
            </div>
          )}

          {lessonOutputTab === 'verification' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  Verification Pipeline
                </span>
                {verificationStages.length > 0 && (
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: verificationStages.every((s) => s.status === 'passed') ? 'rgba(16,185,129,0.20)' : 'rgba(239,68,68,0.20)',
                      color: verificationStages.every((s) => s.status === 'passed') ? '#10B981' : '#EF4444',
                    }}
                  >
                    {verificationStages.every((s) => s.status === 'passed') ? '100/100 PASSED' : 'VERIFICATION FAILED'}
                  </span>
                )}
              </div>
              {verificationStages.length > 0 ? (
                <div className="space-y-1.5">
                  {verificationStages.map((s) => (
                    <StageRow key={s.id} stage={s} isDark={isDark} />
                  ))}
                  {lesson.visibleTestCases && lesson.visibleTestCases.length > 0 && (
                    <div className="pt-2">
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                          Visible Test Assertions
                        </span>
                        {runResult?.visibleTests && runResult.visibleTests.length > 0 && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{
                              background: runResult.visibleTests.every((t) => t.passed) ? 'rgba(16,185,129,0.20)' : 'rgba(239,68,68,0.20)',
                              color: runResult.visibleTests.every((t) => t.passed) ? '#10B981' : '#EF4444',
                            }}
                          >
                            {runResult.visibleTests.filter((t) => t.passed).length}/{runResult.visibleTests.length} Passed
                          </span>
                        )}
                      </div>
                      {lesson.visibleTestCases.map((tc, idx) => {
                        const matchedTest = runResult?.visibleTests?.find(
                          (t) => t.callStr.trim() === tc.erlangCall.trim() || t.expected.trim() === tc.expectedOutput.trim()
                        ) || (runResult?.visibleTests ? runResult.visibleTests[idx] : undefined);

                        return (
                          <UnifiedTestCaseCard
                            key={`m-verify-${tc.id || idx}`}
                            testCase={tc}
                            runTest={matchedTest}
                            isDark={isDark}
                          />
                        );
                      })}
                    </div>
                  )}
                  {beamFootprint && (
                    <div className="pt-2">
                      <BeamFootprintCard footprint={beamFootprint} isDark={isDark} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center rounded-2xl border" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}>
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-amber-500 opacity-80" />
                  <h4 className="text-sm font-bold mb-1" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                    Full Verification Required
                  </h4>
                  <p className="text-xs max-w-xs mx-auto leading-relaxed mb-4" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Tap <strong>Submit for Grading</strong> to run compiler checks, AST rules, and hidden test suites.
                  </p>
                  <button
                    onClick={() => {
                      if (!isLessonUnlocked) return;
                      handleRunVerification();
                    }}
                    disabled={!isLessonUnlocked || isVerifying || !isBackendOnline}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-900 shadow-md inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: '#F59E0B' }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Submit for Grading</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {lessonOutputTab === 'solution' && (
            <div className="flex-1 min-h-0" style={{ height: 'calc(100dvh - 14rem)' }}>
              <SolutionViewerTab
                key={`sol-viewer-m-${lesson.id}-${activeFile?.path || 'main'}`}
                fileName={activeFile?.name || 'solution.erl'}
                solutionCode={
                  (activeFile?.path && lesson.solutionFiles && lesson.solutionFiles[activeFile.path]) ||
                  (activeFile?.path && lesson.solutionFiles && lesson.solutionFiles[activeFile.path.replace(/^src\//, '')]) ||
                  (activeFile?.path && lesson.solutionFiles && lesson.solutionFiles['src/' + activeFile.path]) ||
                  lesson.solutionCode ||
                  (lesson.solutionFiles ? Object.values(lesson.solutionFiles)[0] : '') ||
                  ''
                }
                solutionExplanation={lesson.solutionExplanation}
                isDark={isDark}
                isExpanded={isDrawerExpanded}
                onToggleExpand={() => setIsDrawerExpanded((prev) => !prev)}
              />
            </div>
          )}
        </div>

        {/* Mobile Results Bottom Action Bar */}
        <div
          className="flex items-center gap-2 p-3 border-t flex-shrink-0 pb-safe"
          style={{
            background: isDark ? 'rgba(11,15,23,0.85)' : 'rgba(241,245,249,0.92)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)',
          }}
        >
          <button
            onClick={() => setMobileTab('code')}
            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
              color: isDark ? '#F8FAFC' : '#0F172A',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(15,23,42,0.10)',
            }}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Back to Editor</span>
          </button>

          <button
            onClick={() => {
              if (!isLessonUnlocked) return;
              handleRunCode();
            }}
            disabled={!isLessonUnlocked || isRunning || isVerifying || !isBackendOnline}
            className={`btn-run flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${!isLessonUnlocked || isRunning || isVerifying || !isBackendOnline ? 'pointer-events-none' : ''}`}
          >
            {isRunning ? (
              <div className="stage-spinner w-3 h-3 rounded-full border-2 border-white border-t-transparent" />
            ) : !isBackendOnline ? (
              <WifiOff className="w-3.5 h-3.5 text-red-300" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isRunning ? 'Running...' : !isBackendOnline ? 'Run (Offline)' : 'Run Again'}</span>
          </button>

          <button
            onClick={() => {
              if (!isLessonUnlocked) return;
              handleRunVerification();
            }}
            disabled={!isLessonUnlocked || isVerifying || isRunning || !isBackendOnline}
            className={`btn-submit flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${!isLessonUnlocked || isVerifying || isRunning || !isBackendOnline ? 'pointer-events-none' : ''}`}
          >
            {isVerifying ? (
              <div className="stage-spinner w-3 h-3 rounded-full border-2 border-white border-t-transparent" />
            ) : !isBackendOnline ? (
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>{isVerifying ? 'Verifying...' : !isBackendOnline ? 'Submit (Offline)' : 'Submit'}</span>
          </button>
        </div>
      </div>

      {/* Confirmation & Solution Unlock Modals */}
      <SolutionUnlockModal
        key={`unlock-modal-${lesson.id}-${activeFile?.name || 'file'}`}
        isOpen={isUnlockModalOpen}
        fileName={activeFile?.name || 'solution.erl'}
        isDark={isDark}
        onClose={() => setIsUnlockModalOpen(false)}
        onConfirm={() => {
          unlockSolutionForLesson(lesson.id);
          setLessonOutputOpen(true);
          setLessonOutputTab('solution');
          if (typeof window !== 'undefined' && window.innerWidth < 768) {
            setMobileTab('results');
          }
        }}
        hint1={lesson.incidentAlert?.diagnosticClue || lesson.solutionExplanation}
        hint2={lesson.incidentAlert?.rootCauseHint || (lesson.otpDocCards && lesson.otpDocCards.length > 0 ? `${lesson.otpDocCards[0].signature}\n%% ${lesson.otpDocCards[0].description}` : undefined)}
        solutionExplanation={lesson.solutionExplanation}
      />

      <ResetConfirmModal
        key={`reset-modal-${lesson.id}-${activeFile?.name || 'workspace'}`}
        isOpen={isResetModalOpen}
        fileName={activeFile?.name || 'workspace'}
        isDark={isDark}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={resetCurrentExerciseToStarter}
      />
    </div>
  );
}

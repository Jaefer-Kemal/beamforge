'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import {
  CH12_CAPSTONE_MILESTONES,
  CH12_MILESTONE_LESSONS,
  CH12_SOLUTION_FILES,
  CH12_STARTER_FILES,
  CHAPTER_12_LESSONS,
} from '../../data/chapters/ch12';
import { configureMonacoErlang, ErlangCodeBlock } from '../../lib/monacoErlang';
import { ORCHESTRATOR_HTTP_URL } from '../../lib/orchestratorConfig';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Clock,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  FileCode,
  Copy,
  Check,
  ExternalLink,
  Zap,
  ShieldCheck,
  Eye,
  FlaskConical,
  Lightbulb,
  BookOpen,
  X,
  WifiOff,
  Code2,
  Terminal,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import type { OtpDocSignatureCard } from '../../types/workspace';
import { BeamConceptVisualizer } from '../pedagogy/BeamConceptVisualizer';
import { MentalModelCheckCard } from '../pedagogy/MentalModelCheckCard';
import { ErlangTermDiffCard } from '../pedagogy/ErlangTermDiffCard';
import { BeamFootprintCard } from '../pedagogy/BeamFootprintCard';
import { BeamMarkdownRenderer, renderInlineContent } from '../pedagogy/BeamMarkdownRenderer';
import { SolutionUnlockModal } from './SolutionUnlockModal';
import { ResetConfirmModal } from './ResetConfirmModal';
import { SolutionViewerTab } from './SolutionViewerTab';
import { LiveXmppChatSimulator } from './LiveXmppChatSimulator';

const CAPSTONE_FILES = [
  { path: 'src/xmpp_sup.erl', label: 'xmpp_sup.erl', milestoneIdx: 0, tag: 'M1' },
  { path: 'src/xmpp_stream_parser.erl', label: 'xmpp_stream_parser.erl', milestoneIdx: 1, tag: 'M2' },
  { path: 'src/xmpp_session_registry.erl', label: 'xmpp_session_registry.erl', milestoneIdx: 2, tag: 'M3' },
  { path: 'src/xmpp_c2s_statem.erl', label: 'xmpp_c2s_statem.erl', milestoneIdx: 3, tag: 'M4' },
  { path: 'src/xmpp_router.erl', label: 'xmpp_router.erl', milestoneIdx: 4, tag: 'M5' },
];

const FILE_TO_MILESTONE_KEY: Record<string, string> = {
  'src/xmpp_sup.erl': 'ch12-m1',
  'src/xmpp_stream_parser.erl': 'ch12-m2',
  'src/xmpp_session_registry.erl': 'ch12-m3',
  'src/xmpp_c2s_statem.erl': 'ch12-m4',
  'src/xmpp_router.erl': 'ch12-m5',
};

const MILESTONE_LESSON_IDS = [
  'ch12-l01',
  'ch12-l02',
  'ch12-l03',
  'ch12-l04',
  'ch12-l05',
  'ch12-capstone',
];

const MILESTONE_SHORT_LABELS = [
  '1. Supervisor',
  '2. XML Framer',
  '3. ETS Registry',
  '4. C2S StateM',
  '5. Router',
  '6. Chaos Monkey',
];

// ── Milestone Markdown Renderer Delegated to BeamMarkdownRenderer ────────────
const MilestoneMarkdownRenderer = BeamMarkdownRenderer;

// ── Compact Expandable OTP Doc Card ──────────────────────────────────────────
function CapstoneOtpDocCard({ card, isDark }: { card: OtpDocSignatureCard; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="otp-doc-card p-3 my-2 rounded-xl cursor-pointer transition-all"
      onClick={() => setExpanded(!expanded)}
      style={{
        background: isDark ? 'rgba(15, 23, 42, 0.70)' : 'rgba(241, 245, 249, 0.80)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(203, 213, 225, 0.60)',
        borderLeft: '3px solid #8B5CF6',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(139,92,246,0.18)', color: '#8B5CF6' }}
            >
              OTP Ref
            </span>
            <span
              className="text-xs font-mono font-bold"
              style={{ color: isDark ? '#CBD5E1' : '#334155' }}
            >
              {card.module}:{card.functionName}
            </span>
          </div>
          <code
            className="text-[11px] font-mono font-semibold block truncate"
            style={{ color: isDark ? '#E2E8F0' : '#020617' }}
          >
            {card.signature}
          </code>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 mt-1 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          style={{ color: isDark ? '#64748B' : '#475569' }}
        />
      </div>

      {expanded && (
        <div
          className="mt-2.5 space-y-2 border-t pt-2.5"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}
        >
          <div>
            <div className="text-[11px] font-bold mb-1" style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
              Types:
            </div>
            {card.typesSpec.map((t, i) => (
              <div
                key={i}
                className="text-[11px] font-mono pl-2 font-medium"
                style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}
              >
                {t}
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
            {renderInlineContent(card.description, isDark)}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-500">
            <Zap className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500 shrink-0" />
            <span>{renderInlineContent(card.complexityNote, isDark)}</span>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <a
              href={card.officialUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] font-medium hover:underline flex items-center gap-1"
              style={{ color: '#007AFF' }}
              onClick={(e) => e.stopPropagation()}
            >
              <span>Official Erlang Docs</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            {card.githubSourceUrl && (
              <a
                href={card.githubSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-medium hover:underline flex items-center gap-1"
                style={{ color: '#8B5CF6' }}
                onClick={(e) => e.stopPropagation()}
              >
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

// ── Main Capstone Studio Component ───────────────────────────────────────────
export function CapstoneStudioView() {
  const {
    theme,
    files,
    activeFilePath,
    activeExerciseId,
    openFile,
    updateFileContent,
    runVerificationSuite,
    runCode,
    isVerifying,
    isRunning,
    verificationStages,
    runResult,
    beamFootprint,
    isBackendOnline,
    checkBackendHealth,
    switchExercise,
    completedLevelIds,
    unlockedSolutionLessonIds,
    unlockSolutionForLesson,
  } = useWorkspaceStore();

  const isDark = theme === 'dark';
  const capstoneMasterLesson = CHAPTER_12_LESSONS[5] || CHAPTER_12_LESSONS[0];

  // Active milestone index (0 to 5)
  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(0);

  // Bottom drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'stages' | 'terminal' | 'chat' | 'tests' | 'solution'>('stages');
  const [copiedCode, setCopiedCode] = useState(false);
  const [mobileTab, setMobileTab] = useState<'guide' | 'code' | 'results'>('guide');

  // Confirmation Modals
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<any>(null);
  const lintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const insertTokenAtCursor = (token: string) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      if (selection) {
        editor.executeEdits('beamforge-capstone-mobile-toolbar', [
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

  // Continuously check Go Orchestrator backend health
  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(() => {
      checkBackendHealth();
    }, 3000);
    return () => clearInterval(interval);
  }, [checkBackendHealth]);

  // Real-time debounced Erlang linter (300ms)
  const runLint = (code: string, filepath: string) => {
    if (lintTimeoutRef.current) clearTimeout(lintTimeoutRef.current);
    lintTimeoutRef.current = setTimeout(async () => {
      if (!editorRef.current || !monacoRef.current) return;
      const model = editorRef.current.getModel();
      if (!model) return;

      try {
        const res = await fetch(`${ORCHESTRATOR_HTTP_URL}/api/v1/lint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, filename: filepath || 'src/module.erl' }),
        });
        if (res.ok) {
          const data = await res.json();
          const diags = data.diagnostics || [];
          const markers = diags.map((d: any) => {
            const lineMax = model.getLineMaxColumn ? model.getLineMaxColumn(d.line) : d.col + 10;
            const startCol = Math.min(Math.max(d.col, 1), lineMax);
            return {
              severity: d.severity === 'warning' ? monacoRef.current!.MarkerSeverity.Warning : monacoRef.current!.MarkerSeverity.Error,
              startLineNumber: d.line,
              startColumn: startCol,
              endLineNumber: d.line,
              endColumn: lineMax,
              message: d.message,
            };
          });
          monacoRef.current.editor.setModelMarkers(model, 'erlang-linter', markers);
        }
      } catch {
        // Silently ignore during offline or live typing
      }
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (lintTimeoutRef.current) clearTimeout(lintTimeoutRef.current);
    };
  }, []);

  // Ensure Chapter 12 workspace files are loaded on mount
  useEffect(() => {
    const hasCapstoneFiles = files.some((f) => f.path.startsWith('src/xmpp_'));
    if (!hasCapstoneFiles) {
      switchExercise('ch12-capstone');
    }
  }, [files, switchExercise]);

  // Active milestone spec and active rich lesson
  const activeMilestone = CH12_CAPSTONE_MILESTONES[activeMilestoneIndex] || CH12_CAPSTONE_MILESTONES[0];
  const activeMilestoneLesson = CH12_MILESTONE_LESSONS[activeMilestoneIndex] || CH12_MILESTONE_LESSONS[0];
  const activeFile = files.find((f) => f.path === activeFilePath) || files[0];
  const currentFilePath = activeFile?.path || activeMilestone.targetFile;
  const requiredUnlockKey = FILE_TO_MILESTONE_KEY[currentFilePath] || `ch12-m${activeMilestoneIndex + 1}`;
  // Free immediate access if already solved, otherwise gated by Option B modal
  const isCurrentFileSolved = (completedLevelIds || []).includes(requiredUnlockKey) || (completedLevelIds || []).includes('ch12-m6');
  const isCurrentFileUnlocked = isCurrentFileSolved || (unlockedSolutionLessonIds || []).includes(requiredUnlockKey);

  // Handle milestone stepper pill click -> switches editor to target file and left pane to that milestone
  const handleMilestoneClick = (index: number) => {
    setActiveMilestoneIndex(index);
    const targetPath = CH12_CAPSTONE_MILESTONES[index]?.targetFile || CAPSTONE_FILES[index]?.path;
    if (targetPath) {
      openFile(targetPath);
    }
  };

  // Configure Monarch highlighter & theme when Monaco is ready
  const handleEditorWillMount = (monaco: Monaco) => {
    monacoRef.current = monaco;
    configureMonacoErlang(monaco);
  };

  const handleEditorOnMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    configureMonacoErlang(monaco);
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, 'erlang');
    }
    monaco.editor.setTheme(isDark ? 'beamforge-dark' : 'beamforge-light');
    if (activeFile?.content) {
      runLint(activeFile.content, activeFile.path);
    }
  };

  // Check stage passes for milestone pills
  const milestonePassStatus = useMemo(() => {
    const map: Record<number, boolean> = {};
    if (!verificationStages || verificationStages.length === 0) return map;
    CH12_CAPSTONE_MILESTONES.forEach((_m, idx) => {
      const stage = verificationStages[idx];
      map[idx] = stage?.status === 'passed';
    });
    return map;
  }, [verificationStages]);

  const passedCount = verificationStages.filter((s) => s.status === 'passed').length;

  // Reset active file to initial starter code (invoked after confirmation)
  const handleConfirmReset = () => {
    const path = activeFile?.path || activeMilestone.targetFile;
    const starter = CH12_STARTER_FILES[path];
    if (starter) {
      updateFileContent(path, starter);
      runLint(starter, path);
    }
  };

  // Solution button click handler with Option B Modal gating
  const handleSolutionClick = () => {
    if (isCurrentFileUnlocked) {
      if (isDrawerOpen && drawerTab === 'solution') {
        setIsDrawerOpen(false);
      } else {
        setIsDrawerOpen(true);
        setDrawerTab('solution');
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
          setMobileTab('results');
        }
      }
    } else {
      setIsUnlockModalOpen(true);
    }
  };

  // Unlock solution confirmation
  const handleConfirmUnlockSolution = () => {
    unlockSolutionForLesson(requiredUnlockKey);
    setIsUnlockModalOpen(false);
    setIsDrawerOpen(true);
    setDrawerTab('solution');
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileTab('results');
    }
  };

  // Execute Submit
  const handleSubmit = async () => {
    setIsDrawerOpen(true);
    setDrawerTab('stages');
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileTab('results');
    }
    await runVerificationSuite();
  };

  // Execute Run
  const handleRun = async () => {
    setIsDrawerOpen(true);
    setDrawerTab('terminal');
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileTab('results');
    }
    await runCode();
  };

  const handleCopySolution = () => {
    const path = activeFile?.path || activeMilestone.targetFile;
    const sol = CH12_SOLUTION_FILES[path] || '';
    navigator.clipboard.writeText(sol);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Keyboard shortcut Ctrl+Enter / Cmd+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className="flex flex-col md:flex-row w-full overflow-hidden select-text"
      style={{
        height: 'calc(100dvh - 3.5rem)',
        marginTop: '3.5rem',
      }}
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
            id="mobile-capstone-guide"
            onClick={() => setMobileTab('guide')}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: mobileTab === 'guide'
                ? (isDark ? 'rgba(245,158,11,0.30)' : 'rgba(245,158,11,0.15)')
                : 'transparent',
              color: mobileTab === 'guide' ? '#FCD34D' : (isDark ? '#94A3B8' : '#64748B'),
            }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Guide</span>
          </button>

          <button
            id="mobile-capstone-code"
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
            id="mobile-capstone-results"
            onClick={() => {
              setMobileTab('results');
              setIsDrawerOpen(true);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: mobileTab === 'results'
                ? (isDark ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.12)')
                : 'transparent',
              color: mobileTab === 'results' ? '#34D399' : (isDark ? '#94A3B8' : '#64748B'),
            }}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Results</span>
            {passedCount > 0 && (
              <span
                className="w-2 h-2 rounded-full inline-block ml-0.5"
                style={{
                  background: passedCount === 6 ? '#10B981' : '#F59E0B',
                }}
              />
            )}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* LEFT PANE — Interactive Milestone Textbook & Doc Cards                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`${mobileTab === 'guide' ? 'w-full flex' : 'hidden md:flex'} md:w-1/2 flex-1 md:h-full flex-col border-r overflow-hidden`}
        style={{
          background: isDark ? 'rgba(11, 17, 30, 0.58)' : 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(28px) saturate(190%)',
          WebkitBackdropFilter: 'blur(28px) saturate(190%)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.08)',
          boxShadow: isDark
            ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.16)'
            : 'inset 0 1px 0 0 rgba(255, 255, 255, 0.90)',
        }}
      >
        {/* ── Top Milestone Stepper Bar ── */}
        <div
          className="shrink-0 p-3.5 border-b select-none"
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.45)' : 'rgba(248, 250, 252, 0.70)',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid rgba(15, 23, 42, 0.08)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-black px-2 py-0.5 rounded-md"
                style={{
                  background: 'rgba(245, 158, 11, 0.18)',
                  color: isDark ? '#FCD34D' : '#D97706',
                  border: isDark ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(245, 158, 11, 0.28)',
                }}
              >
                CH12 CAPSTONE
              </span>
              <span className="text-xs font-bold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                6-Milestone Production Blueprint
              </span>
            </div>
            <span className="text-[11px] font-mono font-semibold" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              {passedCount}/6 Milestones Verified
            </span>
          </div>

          {/* Stepper Pills: Horizontally scrollable with snap points on mobile, 6-col grid on desktop */}
          <div className="flex md:grid md:grid-cols-6 gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory py-0.5">
            {CH12_CAPSTONE_MILESTONES.map((m, idx) => {
              const isActive = activeMilestoneIndex === idx;
              const isPassed = milestonePassStatus[idx];

              return (
                <button
                  key={m.id}
                  onClick={() => handleMilestoneClick(idx)}
                  className="flex flex-col items-center justify-center py-2 px-2 md:px-1 rounded-xl text-center transition-all duration-200 cursor-pointer min-w-[105px] md:min-w-0 flex-shrink-0 md:flex-shrink snap-start"
                  style={{
                    background: isActive
                      ? (isDark ? 'rgba(245, 158, 11, 0.22)' : 'rgba(245, 158, 11, 0.16)')
                      : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)'),
                    border: isActive
                      ? (isDark ? '1.5px solid #F59E0B' : '1.5px solid #D97706')
                      : (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)'),
                    color: isActive
                      ? (isDark ? '#FCD34D' : '#D97706')
                      : (isDark ? '#94A3B8' : '#64748B'),
                    boxShadow: isActive
                      ? (isDark ? '0 0 14px rgba(245, 158, 11, 0.30)' : '0 2px 10px rgba(245, 158, 11, 0.20)')
                      : 'none',
                    transform: isActive ? 'scale(1.02)' : 'none',
                  }}
                  title={`${m.title} (${m.targetFile})`}
                >
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black">{`M${m.number}`}</span>
                    {isPassed ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    ) : (
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: isDark ? '#475569' : '#CBD5E1' }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-medium truncate max-w-full mt-0.5">
                    {MILESTONE_SHORT_LABELS[idx]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Left Pane Scrollable Body (Rich Textbook & Specs) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Milestone Header Info */}
          <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{ background: 'rgba(139,92,246,0.18)', color: '#8B5CF6' }}>
                CH12 · Milestone {activeMilestone.number} of 6
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                Production Capstone
              </span>
            </div>
            <span
              className="font-mono text-xs px-2.5 py-0.5 rounded-md"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
                color: isDark ? '#CBD5E1' : '#475569',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
              }}
            >
              {activeMilestone.targetFile}
            </span>
          </div>

          {/* Interactive 5-Module XMPP Architecture Visualizer */}
          <BeamConceptVisualizer
            scene="xmpp_5_module_capstone_arch"
            activeMilestone={activeMilestoneIndex + 1}
          />

          {/* Rich Milestone Textbook Markdown */}
          <MilestoneMarkdownRenderer md={activeMilestoneLesson.conceptMarkdown} isDark={isDark} />

          {/* Milestone Quick Mental Model Check */}
          <MentalModelCheckCard
            check={activeMilestoneLesson.mentalModelCheck}
            lessonId={activeMilestoneLesson.id}
            chapterNumber={12}
            lessonNumber={activeMilestoneIndex + 1}
            title={activeMilestone.title}
            isDark={isDark}
          />

          {/* Your Task & Functions Card */}
          <div
            className="p-4 rounded-2xl space-y-2.5"
            style={{
              background: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.75)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider" style={{ color: isDark ? '#FCD34D' : '#D97706' }}>
                Functions to Implement &amp; Export:
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {activeMilestone.targetFunctions.map((fn) => (
                <code
                  key={fn}
                  className="px-2 py-1 rounded-md font-mono text-[11px] font-bold"
                  style={{
                    background: isDark ? 'rgba(139,92,246,0.22)' : 'rgba(124,58,237,0.12)',
                    color: isDark ? '#DDD6FE' : '#4C1D95',
                    border: isDark ? '1px solid rgba(139,92,246,0.35)' : '1px solid rgba(124,58,237,0.28)',
                  }}
                >
                  {fn}
                </code>
              ))}
            </div>

            {/* Verification Hint */}
            <div
              className="p-3 mt-2 rounded-xl text-xs"
              style={{
                background: isDark ? 'rgba(0,122,255,0.12)' : 'rgba(0,122,255,0.06)',
                border: isDark ? '1px solid rgba(0,122,255,0.25)' : '1px solid rgba(0,122,255,0.20)',
              }}
            >
              <strong className="flex items-center gap-1.5 mb-1" style={{ color: isDark ? '#93C5FD' : '#1D4ED8' }}>
                <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Verification Hint:</span>
              </strong>
              <p className="text-[11px] leading-relaxed" style={{ color: isDark ? '#BFDBFE' : '#1E40AF' }}>
                {activeMilestone.verificationHint}
              </p>
            </div>
          </div>

          {/* Official OTP Documentation Cards */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              <BookOpen className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Relevant Official Erlang / OTP Reference Cards</span>
            </h3>
            {capstoneMasterLesson?.otpDocCards.map((card) => (
              <CapstoneOtpDocCard key={`${card.module}:${card.functionName}`} card={card} isDark={isDark} />
            ))}
          </div>

          {/* Mobile CTA: Open Code Editor */}
          <div className="pt-4 md:hidden">
            <button
              onClick={() => setMobileTab('code')}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 text-white shadow-md transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #007AFF 0%, #0056B3 100%)' }}
            >
              <Code2 className="w-4 h-4" />
              <span>Open Milestone Editor ({activeMilestone.targetFile})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-6" />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* RIGHT PANE — Focused Code Editor, Action Bar & Drawer                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div
        className={`${mobileTab === 'code' ? 'w-full flex' : 'hidden md:flex'} md:w-1/2 flex-1 md:h-full flex-col overflow-hidden relative`}
        style={{
          background: isDark ? '#0B0F17' : '#FFFFFF',
        }}
      >
        {/* ── Top File Tab Bar: Sleek and Focused ── */}
        <div
          className="flex items-center justify-between px-3 flex-shrink-0 select-none"
          style={{
            height: '44px',
            background: isDark ? 'rgba(15, 23, 42, 0.45)' : 'rgba(248, 250, 252, 0.70)',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid rgba(15, 23, 42, 0.08)',
          }}
        >
          {/* File Switcher Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto flex-1 h-full py-1">
            {CAPSTONE_FILES.map((cf) => {
              const isActive = cf.path === activeFilePath;
              const isPassed = milestonePassStatus[cf.milestoneIdx];
              const isTarget = cf.path === activeMilestone.targetFile;

              return (
                <button
                  key={cf.path}
                  onClick={() => {
                    openFile(cf.path);
                    setActiveMilestoneIndex(cf.milestoneIdx);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all duration-200 cursor-pointer"
                  style={{
                    background: isActive
                      ? (isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.95)')
                      : (isDark ? 'rgba(255, 255, 255, 0.03)' : 'transparent'),
                    color: isActive
                      ? (isDark ? '#F8FAFC' : '#0F172A')
                      : (isDark ? '#94A3B8' : '#64748B'),
                    border: isActive
                      ? (isDark ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(15, 23, 42, 0.12)')
                      : '1px solid transparent',
                    boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <span
                    className="text-[10px] font-bold px-1 rounded"
                    style={{
                      background: isActive ? 'rgba(245,158,11,0.20)' : 'rgba(100,116,139,0.15)',
                      color: isActive ? '#F59E0B' : '#64748B',
                    }}
                  >
                    {cf.tag}
                  </span>
                  <FileCode className="w-3.5 h-3.5" style={{ color: isActive ? '#38BDF8' : '#64748B' }} />
                  <span>{cf.label}</span>
                  {isTarget && (
                    <span
                      className="text-[9px] font-black px-1.5 py-0.5 rounded tracking-wide shadow-sm"
                      style={{
                        background: 'rgba(245, 158, 11, 0.25)',
                        color: isDark ? '#FCD34D' : '#D97706',
                        border: isDark ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(245, 158, 11, 0.35)',
                      }}
                    >
                      ★ TARGET
                    </span>
                  )}
                  {isPassed && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 ml-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Reset Current File Button */}
          <button
            id="reset-template-btn"
            onClick={() => setIsResetModalOpen(true)}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all duration-200 shrink-0 cursor-pointer"
            style={{
              color: isDark ? '#CBD5E1' : '#334155',
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
            }}
            title="Reset active file to initial challenge template"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset File</span>
          </button>
        </div>

        {/* ── Monaco Editor Instance ── */}
        <div
          className="flex-1 w-full relative overflow-hidden"
          style={{ background: isDark ? '#0B0F17' : '#FFFFFF' }}
        >
          {activeFile ? (
            <Editor
              height="100%"
              width="100%"
              language="erlang"
              theme={isDark ? 'beamforge-dark' : 'beamforge-light'}
              path={activeFile.path}
              value={activeFile.content}
              beforeMount={handleEditorWillMount}
              onMount={handleEditorOnMount}
              onChange={(val) => {
                const newCode = val || '';
                updateFileContent(activeFile.path, newCode);
                runLint(newCode, activeFile.path);
              }}
              options={{
                fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? 14 : 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontWeight: '500',
                fontLigatures: false,
                lineHeight: 22,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                glyphMargin: false,
                folding: typeof window !== 'undefined' && window.innerWidth < 768 ? false : true,
                lineNumbersMinChars: typeof window !== 'undefined' && window.innerWidth < 768 ? 2 : 3,
                automaticLayout: true,
                tabSize: 4,
                insertSpaces: true,
                wordWrap: 'on',
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                padding: { top: 16, bottom: 16 },
                renderLineHighlight: 'gutter',
              }}
            />
          ) : (
            <div
              className="flex items-center justify-center h-full font-mono text-xs"
              style={{ color: isDark ? '#64748B' : '#94A3B8' }}
            >
              Select a module from the top tab strip to edit
            </div>
          )}
        </div>

        {/* ── Mobile Erlang Quick-Syntax Toolbar (< md) ── */}
        <div
          className="flex md:hidden items-center gap-1 px-2 py-1 border-t overflow-x-auto flex-shrink-0 no-scrollbar"
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.90)' : 'rgba(241, 245, 249, 0.95)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
          }}
        >
          {['->', '>>', '<<', ':=', '=>', ',', ';', '.', '_', '|', '[ ]', '{ }'].map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => insertTokenAtCursor(token)}
              className="px-2.5 py-1 text-xs font-mono font-bold rounded-md flex-shrink-0 transition-transform active:scale-95"
              style={{
                background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#FFFFFF',
                color: isDark ? '#E2E8F0' : '#1E293B',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.10)',
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
          className="flex items-center gap-2 px-3 py-1 flex-shrink-0 select-none pb-safe"
          style={{
            minHeight: '48px',
            background: isDark ? 'rgba(11, 15, 23, 0.55)' : 'rgba(241, 245, 249, 0.70)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid rgba(15, 23, 42, 0.08)',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: isDark ? 'inset 0 1px 0 0 rgba(255, 255, 255, 0.12)' : 'inset 0 1px 0 0 rgba(255, 255, 255, 0.80)',
          }}
        >
          {/* Primary Submit Button */}
          <button
            id="submit-btn"
            onClick={handleSubmit}
            disabled={isVerifying || isRunning || !isBackendOnline}
            title={!isBackendOnline ? 'Go Orchestrator backend (port 8080) is offline. Start orchestrator.exe to submit.' : 'Submit capstone milestones'}
            className={`btn-submit flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${isVerifying || isRunning || !isBackendOnline ? 'pointer-events-none' : ''}`}
          >
            {isVerifying ? (
              <div className="stage-spinner w-3 h-3 rounded-full border-2 border-slate-900 border-t-transparent" />
            ) : !isBackendOnline ? (
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>{isVerifying ? 'Verifying 6 Milestones...' : !isBackendOnline ? 'Submit (Offline)' : 'Submit'}</span>
          </button>

          {/* Run & Simulate Button */}
          <button
            id="run-btn"
            onClick={handleRun}
            disabled={isRunning || isVerifying || !isBackendOnline}
            title={!isBackendOnline ? 'Go Orchestrator backend (port 8080) is offline. Start orchestrator.exe to run simulation.' : 'Run capstone simulation'}
            className={`btn-run flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${isRunning || isVerifying || !isBackendOnline ? 'pointer-events-none' : ''}`}
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

          {/* Solution Toggle targeting active file */}
          <button
            id="solution-btn"
            onClick={handleSolutionClick}
            className="glass-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer"
            style={{
              background: isDrawerOpen && drawerTab === 'solution'
                ? (isDark ? 'rgba(245,158,11,0.20)' : 'rgba(245,158,11,0.12)')
                : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'),
              color: isDrawerOpen && drawerTab === 'solution'
                ? (isDark ? '#FCD34D' : '#D97706')
                : (isDark ? '#94A3B8' : '#64748B'),
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
            }}
            title={`View solution for ${activeFile?.name || activeMilestone.targetFile}`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Solution</span>
          </button>

          {/* Test Cases Toggle */}
          <button
            id="test-cases-btn"
            onClick={() => {
              setIsDrawerOpen(true);
              setDrawerTab('tests');
            }}
            className="glass-pill hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer"
            style={{
              background: isDrawerOpen && drawerTab === 'tests'
                ? (isDark ? 'rgba(0,122,255,0.20)' : 'rgba(0,122,255,0.12)')
                : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'),
              color: isDrawerOpen && drawerTab === 'tests'
                ? (isDark ? '#93C5FD' : '#007AFF')
                : (isDark ? '#94A3B8' : '#64748B'),
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
            }}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Test Cases</span>
          </button>

          {/* Live XMPP Chat Simulator Toggle */}
          <button
            id="xmpp-chat-btn"
            onClick={() => {
              if (isDrawerOpen && drawerTab === 'chat') {
                setIsDrawerOpen(false);
              } else {
                setDrawerTab('chat');
                setIsDrawerOpen(true);
                setIsDrawerExpanded(true);
                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                  setMobileTab('results');
                }
              }
            }}
            title="Interactive Live XMPP Chat Simulator & Wire Stanza Terminal"
            className="glass-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer transition-all hover:scale-105"
            style={{
              background: isDrawerOpen && drawerTab === 'chat'
                ? (isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.16)')
                : (isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)'),
              border: isDark ? '1px solid rgba(16, 185, 129, 0.40)' : '1px solid rgba(16, 185, 129, 0.30)',
              color: isDark ? '#6EE7B7' : '#059669',
            }}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-bold">Live Chat</span>
          </button>

          {/* Right: Keyboard Hint & Drawer Chevron */}
          <div className="ml-auto flex items-center gap-2">
            <div className="text-xs hidden md:block" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
              <kbd className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' }}>
                ⌘↵
              </kbd> Submit
            </div>

            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="p-1 rounded-lg text-xs transition-colors cursor-pointer"
              style={{
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)',
                color: isDark ? '#94A3B8' : '#64748B',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
              }}
              title={isDrawerOpen ? 'Collapse Drawer' : 'Expand Drawer'}
            >
              {isDrawerOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ── Bottom Collapsible Verification & Output Drawer (Desktop Only in Code Pane) ── */}
        {isDrawerOpen && (
          <div
            className="hidden md:flex shrink-0 flex-col backdrop-blur-xl transition-all duration-300"
            style={{
              height: isDrawerExpanded ? '580px' : '320px',
              maxHeight: '100%',
              background: isDark ? 'rgba(11, 15, 23, 0.95)' : 'rgba(248, 250, 252, 0.96)',
              borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
            }}
          >
            {/* Drawer Header Tabs */}
            <div
              className="flex items-center justify-between px-3 py-1 flex-shrink-0 select-none"
              style={{
                height: '38px',
                background: isDark ? 'rgba(11, 15, 23, 0.85)' : 'rgba(241, 245, 249, 0.90)',
                borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
              }}
            >
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDrawerTab('stages')}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                  style={{
                    background: drawerTab === 'stages'
                      ? (isDark ? 'rgba(255, 255, 255, 0.10)' : '#FFFFFF')
                      : 'transparent',
                    color: drawerTab === 'stages'
                      ? (isDark ? '#F8FAFC' : '#0F172A')
                      : (isDark ? '#94A3B8' : '#64748B'),
                    border: drawerTab === 'stages'
                      ? (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.08)')
                      : '1px solid transparent',
                  }}
                >
                  Verification ({passedCount}/{verificationStages.length || 6})
                </button>
                <button
                  onClick={() => setDrawerTab('terminal')}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                  style={{
                    background: drawerTab === 'terminal'
                      ? (isDark ? 'rgba(255, 255, 255, 0.10)' : '#FFFFFF')
                      : 'transparent',
                    color: drawerTab === 'terminal'
                      ? (isDark ? '#F8FAFC' : '#0F172A')
                      : (isDark ? '#94A3B8' : '#64748B'),
                    border: drawerTab === 'terminal'
                      ? (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.08)')
                      : '1px solid transparent',
                  }}
                >
                  Console Output
                </button>
                <button
                  onClick={() => setDrawerTab('tests')}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                  style={{
                    background: drawerTab === 'tests'
                      ? (isDark ? 'rgba(255, 255, 255, 0.10)' : '#FFFFFF')
                      : 'transparent',
                    color: drawerTab === 'tests'
                      ? (isDark ? '#F8FAFC' : '#0F172A')
                      : (isDark ? '#94A3B8' : '#64748B'),
                    border: drawerTab === 'tests'
                      ? (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.08)')
                      : '1px solid transparent',
                  }}
                >
                  Milestone Test Case
                </button>
                <button
                  id="tab-btn-chat"
                  onClick={() => {
                    setDrawerTab('chat');
                    setIsDrawerExpanded(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                  style={{
                    background: drawerTab === 'chat'
                      ? (isDark ? 'rgba(16, 185, 129, 0.20)' : 'rgba(16, 185, 129, 0.12)')
                      : 'transparent',
                    color: drawerTab === 'chat'
                      ? '#10B981'
                      : (isDark ? '#94A3B8' : '#64748B'),
                    border: drawerTab === 'chat'
                      ? '1px solid rgba(16, 185, 129, 0.35)'
                      : '1px solid transparent',
                  }}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Live XMPP Chat</span>
                </button>
                <button
                  onClick={() => setDrawerTab('solution')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                  style={{
                    background: drawerTab === 'solution'
                      ? (isDark ? 'rgba(255, 255, 255, 0.10)' : '#FFFFFF')
                      : 'transparent',
                    color: drawerTab === 'solution'
                      ? (isDark ? '#FCD34D' : '#D97706')
                      : (isDark ? '#94A3B8' : '#64748B'),
                    border: drawerTab === 'solution'
                      ? (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.08)')
                      : '1px solid transparent',
                  }}
                >
                  <span>Solution ({activeFile?.name || 'File'})</span>
                  {isCurrentFileSolved ? (
                    <span
                      className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgba(16,185,129,0.20)', color: '#10B981' }}
                    >
                      Solved
                    </span>
                  ) : isCurrentFileUnlocked ? (
                    <span
                      className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                      style={{ background: 'rgba(245,158,11,0.20)', color: '#F59E0B' }}
                    >
                      Unlocked
                    </span>
                  ) : null}
                </button>
              </div>

              {/* Close Drawer */}
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-xs transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}
              >
                <X className="w-3.5 h-3.5" />
                <span>Close</span>
              </button>
            </div>

            {/* Drawer Body Content */}
            <div className="flex-1 overflow-y-auto p-3 text-xs">
              {drawerTab === 'stages' && (
                <div className="space-y-2">
                  {verificationStages.length > 0 ? (
                    verificationStages.map((stage) => {
                      const isPassed = stage.status === 'passed';
                      const isFailed = stage.status === 'failed';

                      return (
                        <div
                          key={stage.id}
                          className="p-2.5 rounded-xl border flex items-start gap-2.5 transition-all"
                          style={{
                            background: isPassed
                              ? (isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.06)')
                              : isFailed
                              ? (isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.06)')
                              : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)'),
                            borderColor: isPassed
                              ? (isDark ? 'rgba(16, 185, 129, 0.30)' : 'rgba(16, 185, 129, 0.20)')
                              : isFailed
                              ? (isDark ? 'rgba(239, 68, 68, 0.30)' : 'rgba(239, 68, 68, 0.20)')
                              : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)'),
                            color: isPassed
                              ? (isDark ? '#6EE7B7' : '#047857')
                              : isFailed
                              ? (isDark ? '#FCA5A5' : '#B91C1C')
                              : (isDark ? '#E2E8F0' : '#1E293B'),
                          }}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isPassed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : isFailed ? (
                              <AlertCircle className="w-4 h-4 text-rose-500" />
                            ) : (
                              <Clock className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold">{stage.title}</span>
                              {stage.timeMs !== undefined && (
                                <span className="font-mono text-[10px]" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                                  {stage.timeMs}ms
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] mt-0.5 opacity-90">{stage.assertionDetails}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      Click <strong>Submit</strong> to compile and verify all 6 milestones against the OTP 29 test suite.
                    </div>
                  )}

                  {/* BEAM VM Real Telemetry Strip placed under submit verification stages */}
                  {beamFootprint && (
                    <div className="pt-3">
                      <BeamFootprintCard footprint={beamFootprint} isDark={isDark} />
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'terminal' && (
                <div className="font-mono text-[11px] space-y-2">
                  {runResult ? (
                    <>
                      <div
                        className="p-3 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-28"
                        style={{
                          background: '#0B0F17',
                          color: '#E2E8F0',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                      >
                        {runResult.stdout || 'Simulation executed with 0 stdout output.'}
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <span className="font-bold uppercase text-[10px] block" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                          Visible Test Results:
                        </span>
                        {runResult.visibleTests?.map((t, idx) => (
                          <ErlangTermDiffCard key={idx} test={t} isDark={isDark} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      Click <strong>Run</strong> to execute unit tests on the active module.
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'tests' && (
                <div className="space-y-2 font-mono text-[11px]">
                  {capstoneMasterLesson?.visibleTestCases[activeMilestoneIndex] && (
                    <div
                      className="p-3.5 rounded-xl border"
                      style={{
                        background: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.70)',
                        borderColor: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
                      }}
                    >
                      <div className="flex items-center justify-between font-sans mb-1.5">
                        <span className="font-bold text-sm" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                          {capstoneMasterLesson.visibleTestCases[activeMilestoneIndex].title}
                        </span>
                        <span className="text-[10px]" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                          {capstoneMasterLesson.visibleTestCases[activeMilestoneIndex].id}
                        </span>
                      </div>
                      <code className="text-blue-500 block mb-1.5 text-xs font-bold">
                        {capstoneMasterLesson.visibleTestCases[activeMilestoneIndex].erlangCall}
                      </code>
                      <div className="text-xs font-sans space-y-1" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                        <div>
                          Expected: <span className="font-mono text-emerald-500 font-bold">{capstoneMasterLesson.visibleTestCases[activeMilestoneIndex].expectedOutput}</span>
                        </div>
                        <p className="text-[11px]" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                          {capstoneMasterLesson.visibleTestCases[activeMilestoneIndex].explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'chat' && (
                <div className="h-[460px] md:h-[500px]">
                  <LiveXmppChatSimulator isDark={isDark} />
                </div>
              )}

              {drawerTab === 'solution' && (
                !isCurrentFileUnlocked ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}
                    >
                      <Eye className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                      Reference Solution Locked for {activeFile?.name || activeMilestone.targetFile}
                    </h4>
                    <p className="text-xs max-w-sm" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      Unlocking this module&apos;s verified reference solution will forfeit XP for this milestone.
                    </p>
                    <button
                      onClick={() => setIsUnlockModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      style={{ background: '#F59E0B', color: '#000' }}
                    >
                      Unlock {activeFile?.name || 'Module'} Solution
                    </button>
                  </div>
                ) : (
                  <SolutionViewerTab
                    fileName={activeFile?.name || activeMilestone.targetFile}
                    solutionCode={CH12_SOLUTION_FILES[activeFile?.path || activeMilestone.targetFile] || ''}
                    solutionExplanation="Each module in this 5-module XMPP architecture fulfills a distinct OTP contract: xmpp_sup provides rest_for_one ordering, xmpp_stream_parser provides non-destructive binary slicing, xmpp_session_registry provides lockless concurrent ETS lookups with process monitors, xmpp_c2s_statem implements the 4-phase connection FSM, and xmpp_router provides priority routing with offline spooling."
                    isDark={isDark}
                    isExpanded={isDrawerExpanded}
                    onToggleExpand={() => setIsDrawerExpanded((prev) => !prev)}
                  />
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          MOBILE DEDICATED CAPSTONE RESULTS & VERIFICATION VIEW (< md)
          ════════════════════════════════════════════════════════════════════ */}
      <div
        className={`${mobileTab === 'results' ? 'w-full flex' : 'hidden'} md:hidden flex-col flex-1 min-h-0 overflow-hidden relative`}
        style={{
          background: isDark ? '#0B0F17' : '#FFFFFF',
        }}
      >
        {/* Mobile Results Header Sub-Tabs */}
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
              onClick={() => setDrawerTab('stages')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: drawerTab === 'stages'
                  ? (isDark ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.12)')
                  : 'transparent',
                color: drawerTab === 'stages'
                  ? '#34D399'
                  : (isDark ? '#94A3B8' : '#64748B'),
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Stages ({passedCount}/6)</span>
            </button>

            <button
              onClick={() => setDrawerTab('terminal')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: drawerTab === 'terminal'
                  ? (isDark ? 'rgba(0,122,255,0.25)' : 'rgba(0,122,255,0.12)')
                  : 'transparent',
                color: drawerTab === 'terminal'
                  ? (isDark ? '#60A5FA' : '#007AFF')
                  : (isDark ? '#94A3B8' : '#64748B'),
              }}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Console</span>
            </button>

            <button
              onClick={() => setDrawerTab('tests')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: drawerTab === 'tests'
                  ? (isDark ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.12)')
                  : 'transparent',
                color: drawerTab === 'tests'
                  ? (isDark ? '#A78BFA' : '#7C3AED')
                  : (isDark ? '#94A3B8' : '#64748B'),
              }}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Tests</span>
            </button>

            <button
              id="expanded-tab-btn-chat"
              onClick={() => setDrawerTab('chat')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{
                background: drawerTab === 'chat'
                  ? (isDark ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.12)')
                  : 'transparent',
                color: drawerTab === 'chat'
                  ? '#34D399'
                  : (isDark ? '#94A3B8' : '#64748B'),
              }}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Live XMPP Chat</span>
            </button>

            <button
              onClick={() => setDrawerTab('solution')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: drawerTab === 'solution'
                  ? (isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.12)')
                  : 'transparent',
                color: drawerTab === 'solution'
                  ? (isDark ? '#FCD34D' : '#D97706')
                  : (isDark ? '#94A3B8' : '#64748B'),
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Solution</span>
            </button>
          </div>

          <button
            onClick={() => setMobileTab('code')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all text-blue-500"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
        </div>

        {/* Mobile Results Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {drawerTab === 'stages' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  6-Stage OTP Capstone Verification
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: passedCount === 6
                      ? 'rgba(16,185,129,0.20)'
                      : passedCount > 0
                      ? 'rgba(245,158,11,0.20)'
                      : 'rgba(239,68,68,0.20)',
                    color: passedCount === 6 ? '#10B981' : passedCount > 0 ? '#F59E0B' : '#EF4444',
                  }}
                >
                  {passedCount}/6 Milestones Passed
                </span>
              </div>
              {verificationStages.length > 0 ? (
                <div className="space-y-1.5">
                  {verificationStages.map((stage) => {
                    const isPassed = stage.status === 'passed';
                    const isFailed = stage.status === 'failed';
                    return (
                      <div
                        key={stage.id}
                        className="p-3 rounded-xl border flex items-start gap-2.5"
                        style={{
                          background: isPassed
                            ? (isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)')
                            : isFailed
                            ? (isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.05)')
                            : (isDark ? 'rgba(15, 23, 42, 0.40)' : 'rgba(241, 245, 249, 0.60)'),
                          borderColor: isPassed
                            ? 'rgba(16, 185, 129, 0.30)'
                            : isFailed
                            ? 'rgba(239, 68, 68, 0.30)'
                            : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)'),
                        }}
                      >
                        <div className="mt-0.5 shrink-0">
                          {isPassed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : isFailed ? (
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                              {stage.title}
                            </span>
                            {stage.timeMs && (
                              <span className="text-[10px] font-mono" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                                {stage.timeMs}ms
                              </span>
                            )}
                          </div>
                          {stage.assertionDetails && (
                            <p className="text-[11px] font-mono mt-1 leading-relaxed select-text" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                              {stage.assertionDetails}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center rounded-2xl border" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}>
                  <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-amber-500 opacity-80" />
                  <h4 className="text-sm font-bold mb-1" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                    No Verification Run Yet
                  </h4>
                  <p className="text-xs max-w-xs mx-auto leading-relaxed mb-4" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    Tap <strong>Submit Capstone</strong> below to grade all 5 OTP modules and the live Chaos Monkey resilience test.
                  </p>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-900 shadow-md inline-flex items-center gap-1.5"
                    style={{ background: '#F59E0B' }}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Run Verification Now</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {drawerTab === 'terminal' && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                Simulation Console Output
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
                {runResult?.stdout || '% No simulation output. Tap Run Simulation below.'}
              </pre>
            </div>
          )}

          {drawerTab === 'tests' && (
            <div className="space-y-2 font-mono text-[11px]">
              {capstoneMasterLesson?.visibleTestCases[activeMilestoneIndex] && (
                <div
                  className="p-3.5 rounded-xl border"
                  style={{
                    background: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.70)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                  }}
                >
                  <div className="flex items-center justify-between font-sans mb-1.5">
                    <span className="font-bold text-sm" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                      {capstoneMasterLesson.visibleTestCases[activeMilestoneIndex].title}
                    </span>
                    <span className="text-[10px]" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      {capstoneMasterLesson.visibleTestCases[activeMilestoneIndex].id}
                    </span>
                  </div>
                  <code className="text-blue-500 block mb-1.5 text-xs font-bold">
                    {capstoneMasterLesson.visibleTestCases[activeMilestoneIndex].erlangCall}
                  </code>
                  <div className="text-xs font-sans space-y-1" style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
                    <div>
                      Expected: <span className="font-mono text-emerald-500 font-bold">{capstoneMasterLesson.visibleTestCases[activeMilestoneIndex].expectedOutput}</span>
                    </div>
                    <p className="text-[11px]" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                      {capstoneMasterLesson.visibleTestCases[activeMilestoneIndex].explanation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {drawerTab === 'chat' && (
            <div className="h-[480px] md:h-[540px]">
              <LiveXmppChatSimulator isDark={isDark} />
            </div>
          )}

          {drawerTab === 'solution' && (
            !isCurrentFileUnlocked ? (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}
                >
                  <Eye className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                  Reference Solution Locked for {activeFile?.name || activeMilestone.targetFile}
                </h4>
                <p className="text-xs max-w-sm" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                  Unlocking this module&apos;s verified reference solution will forfeit XP for this milestone.
                </p>
                <button
                  onClick={() => setIsUnlockModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  style={{ background: '#F59E0B', color: '#000' }}
                >
                  Unlock {activeFile?.name || 'Module'} Solution
                </button>
              </div>
            ) : (
              <SolutionViewerTab
                fileName={activeFile?.name || activeMilestone.targetFile}
                solutionCode={CH12_SOLUTION_FILES[activeFile?.path || activeMilestone.targetFile] || ''}
                solutionExplanation="Each module in this 5-module XMPP architecture fulfills a distinct OTP contract: xmpp_sup provides rest_for_one ordering, xmpp_stream_parser provides non-destructive binary slicing, xmpp_session_registry provides lockless concurrent ETS lookups with process monitors, xmpp_c2s_statem implements the 4-phase connection FSM, and xmpp_router provides priority routing with offline spooling."
                isDark={isDark}
                isExpanded={isDrawerExpanded}
                onToggleExpand={() => setIsDrawerExpanded((prev) => !prev)}
              />
            )
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
            onClick={handleRun}
            disabled={isRunning || isVerifying || !isBackendOnline}
            className={`btn-run flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${isRunning || isVerifying || !isBackendOnline ? 'pointer-events-none' : ''}`}
          >
            {isRunning ? (
              <div className="stage-spinner w-3 h-3 rounded-full border-2 border-white border-t-transparent" />
            ) : !isBackendOnline ? (
              <WifiOff className="w-3.5 h-3.5 text-red-300" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isRunning ? 'Running...' : !isBackendOnline ? 'Run (Offline)' : 'Run Simulation'}</span>
          </button>

          <button
            onClick={handleSubmit}
            disabled={isVerifying || isRunning || !isBackendOnline}
            className={`btn-submit flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${isVerifying || isRunning || !isBackendOnline ? 'pointer-events-none' : ''}`}
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

      {/* Confirmation & Unlock Modals */}
      <SolutionUnlockModal
        isOpen={isUnlockModalOpen}
        fileName={activeFile?.name || activeMilestone.targetFile}
        isDark={isDark}
        onClose={() => setIsUnlockModalOpen(false)}
        onConfirm={handleConfirmUnlockSolution}
        hint1={activeMilestone.verificationHint || activeMilestoneLesson.verificationHint}
        hint2={activeMilestone.targetFunctions && activeMilestone.targetFunctions.length > 0 ? `%% Target Exported Functions for ${activeMilestone.targetFile}:\n` + activeMilestone.targetFunctions.map(f => `-export([${f}]).`).join('\n') : undefined}
        solutionExplanation={capstoneMasterLesson?.solutionExplanation || activeMilestone.verificationHint}
      />

      <ResetConfirmModal
        isOpen={isResetModalOpen}
        fileName={activeFile?.name || activeMilestone.targetFile}
        isDark={isDark}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleConfirmReset}
      />
    </div>
  );
}

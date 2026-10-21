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
} from 'lucide-react';
import type { OtpDocSignatureCard } from '../../types/workspace';
import { BeamConceptVisualizer } from '../pedagogy/BeamConceptVisualizer';
import { MentalModelCheckCard } from '../pedagogy/MentalModelCheckCard';
import { ErlangTermDiffCard } from '../pedagogy/ErlangTermDiffCard';

const CAPSTONE_FILES = [
  { path: 'src/xmpp_sup.erl', label: 'xmpp_sup.erl', milestoneIdx: 0, tag: 'M1' },
  { path: 'src/xmpp_stream_parser.erl', label: 'xmpp_stream_parser.erl', milestoneIdx: 1, tag: 'M2' },
  { path: 'src/xmpp_session_registry.erl', label: 'xmpp_session_registry.erl', milestoneIdx: 2, tag: 'M3' },
  { path: 'src/xmpp_c2s_statem.erl', label: 'xmpp_c2s_statem.erl', milestoneIdx: 3, tag: 'M4' },
  { path: 'src/xmpp_router.erl', label: 'xmpp_router.erl', milestoneIdx: 4, tag: 'M5' },
];

// ── Markdown Parser Utilities ────────────────────────────────────────────────
function renderInlineContent(text: string, isDark: boolean): React.ReactNode {
  if (!text) return null;
  const regex = /(`[^`]+`|\*\*[^*]+?\*\*)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const codeVal = part.slice(1, -1);
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded text-xs font-mono font-semibold inline-block mx-0.5"
          style={{
            background: isDark ? 'rgba(139,92,246,0.22)' : 'rgba(124,58,237,0.12)',
            color: isDark ? '#DDD6FE' : '#4C1D95',
            border: isDark ? '1px solid rgba(139,92,246,0.35)' : '1px solid rgba(124,58,237,0.28)',
          }}
        >
          {codeVal}
        </code>
      );
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const inner = part.slice(2, -2);
      return (
        <strong
          key={idx}
          className="font-bold"
          style={{
            color: isDark ? '#FFFFFF' : '#020617',
            fontWeight: 700,
          }}
        >
          {inner.includes('`') ? renderInlineContent(inner, isDark) : inner}
        </strong>
      );
    }

    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function MilestoneMarkdownRenderer({ md, isDark }: { md: string; isDark: boolean }) {
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('```erlang') || line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <ErlangCodeBlock key={i} code={codeLines.join('\n')} isDark={isDark} />
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={i}
          className="text-base font-extrabold mt-6 mb-2 tracking-tight"
          style={{ color: isDark ? '#F8FAFC' : '#020617' }}
        >
          {renderInlineContent(line.slice(3), isDark)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3
          key={i}
          className="text-sm font-bold mt-5 mb-2"
          style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
        >
          {renderInlineContent(line.slice(4), isDark)}
        </h3>
      );
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={i}
          className="border-l-4 pl-4 py-2 my-2.5 text-xs leading-relaxed"
          style={{
            borderColor: isDark ? '#A78BFA' : '#7C3AED',
            color: isDark ? '#E2E8F0' : '#0F172A',
            background: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(124,58,237,0.06)',
            borderRadius: '0 0.5rem 0.5rem 0',
          }}
        >
          {renderInlineContent(line.slice(2), isDark)}
        </blockquote>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li
          key={i}
          className="ml-5 text-xs mb-1.5 list-disc leading-relaxed font-normal"
          style={{ color: isDark ? '#CBD5E1' : '#334155' }}
        >
          {renderInlineContent(line.slice(2), isDark)}
        </li>
      );
    } else if (/^\d+\.\s+/.test(line)) {
      const numMatch = line.match(/^(\d+\.)\s+(.*)$/);
      elements.push(
        <li
          key={i}
          className="ml-5 text-xs mb-1.5 list-decimal leading-relaxed font-normal"
          style={{ color: isDark ? '#CBD5E1' : '#334155' }}
        >
          {renderInlineContent(numMatch ? numMatch[2] : line, isDark)}
        </li>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p
          key={i}
          className="text-xs leading-relaxed mb-2 font-normal"
          style={{ color: isDark ? '#CBD5E1' : '#334155' }}
        >
          {renderInlineContent(line, isDark)}
        </p>
      );
    }
    i++;
  }

  return <div className="leading-relaxed space-y-1">{elements}</div>;
}

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
            {card.description}
          </p>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-500">
            <Zap className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500 shrink-0" />
            <span>{card.complexityNote}</span>
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
    openFile,
    updateFileContent,
    runVerificationSuite,
    runCode,
    isVerifying,
    isRunning,
    verificationStages,
    runResult,
    switchExercise,
  } = useWorkspaceStore();

  const isDark = theme === 'dark';
  const capstoneMasterLesson = CHAPTER_12_LESSONS[0];

  // Active milestone index (0 to 4)
  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(0);

  // Bottom drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'stages' | 'terminal' | 'tests' | 'solution'>('stages');
  const [copiedCode, setCopiedCode] = useState(false);

  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<any>(null);
  const lintTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time debounced Erlang linter (300ms)
  const runLint = (code: string, filepath: string) => {
    if (lintTimeoutRef.current) clearTimeout(lintTimeoutRef.current);
    lintTimeoutRef.current = setTimeout(async () => {
      if (!editorRef.current || !monacoRef.current) return;
      const model = editorRef.current.getModel();
      if (!model) return;

      try {
        const res = await fetch('http://localhost:8080/api/v1/lint', {
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

  // Keep activeMilestoneIndex in sync when activeFilePath changes
  useEffect(() => {
    const match = CAPSTONE_FILES.find((cf) => cf.path === activeFilePath);
    if (match && match.milestoneIdx !== activeMilestoneIndex) {
      setActiveMilestoneIndex(match.milestoneIdx);
    }
  }, [activeFilePath, activeMilestoneIndex]);

  // Active milestone spec and active rich lesson
  const activeMilestone = CH12_CAPSTONE_MILESTONES[activeMilestoneIndex] || CH12_CAPSTONE_MILESTONES[0];
  const activeMilestoneLesson = CH12_MILESTONE_LESSONS[activeMilestoneIndex] || CH12_MILESTONE_LESSONS[0];
  const activeFile = files.find((f) => f.path === activeFilePath) || files[0];

  // Handle milestone stepper pill click -> switches editor to that file and left pane to that milestone
  const handleMilestoneClick = (index: number) => {
    setActiveMilestoneIndex(index);
    const targetPath = CAPSTONE_FILES[index]?.path;
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

  // Reset active file to initial starter code
  const handleResetActiveFile = () => {
    const path = activeFile?.path || activeMilestone.targetFile;
    const starter = CH12_STARTER_FILES[path];
    if (starter && confirm(`Reset ${activeFile?.name || path} back to initial starter code?`)) {
      updateFileContent(path, starter);
      runLint(starter, path);
    }
  };

  // Load reference solution for active file
  const handleLoadActiveSolution = () => {
    const path = activeFile?.path || activeMilestone.targetFile;
    const sol = CH12_SOLUTION_FILES[path];
    if (sol && confirm(`Load verified reference solution for ${activeFile?.name || path}?`)) {
      updateFileContent(path, sol);
      runLint(sol, path);
    }
  };

  // Execute Submit
  const handleSubmit = async () => {
    setIsDrawerOpen(true);
    setDrawerTab('stages');
    await runVerificationSuite();
  };

  // Execute Run
  const handleRun = async () => {
    setIsDrawerOpen(true);
    setDrawerTab('terminal');
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
      className="flex w-full overflow-hidden select-text"
      style={{
        height: 'calc(100vh - 3.5rem)',
        marginTop: '3.5rem',
      }}
    >
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* LEFT PANE (50% Width) — Interactive Milestone Textbook & Doc Cards     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="w-1/2 h-full flex flex-col border-r overflow-hidden"
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
                5-Milestone Production Blueprint
              </span>
            </div>
            <span className="text-[11px] font-mono font-semibold" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              {passedCount}/5 Milestones Verified
            </span>
          </div>

          {/* Stepper Pills */}
          <div className="grid grid-cols-5 gap-1.5">
            {CH12_CAPSTONE_MILESTONES.map((m, idx) => {
              const isActive = activeMilestoneIndex === idx;
              const isPassed = milestonePassStatus[idx];
              const shortLabels = ['1. Supervisor', '2. XML Framer', '3. ETS Registry', '4. C2S StateM', '5. Router'];

              return (
                <button
                  key={m.id}
                  onClick={() => handleMilestoneClick(idx)}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center transition-all duration-200 cursor-pointer"
                  style={{
                    background: isActive
                      ? (isDark ? 'rgba(245, 158, 11, 0.20)' : 'rgba(245, 158, 11, 0.15)')
                      : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(15, 23, 42, 0.03)'),
                    border: isActive
                      ? (isDark ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(245, 158, 11, 0.35)')
                      : (isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)'),
                    color: isActive
                      ? (isDark ? '#FCD34D' : '#D97706')
                      : (isDark ? '#94A3B8' : '#64748B'),
                    boxShadow: isActive
                      ? (isDark ? '0 0 12px rgba(245, 158, 11, 0.20)' : '0 2px 8px rgba(245, 158, 11, 0.15)')
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
                    {shortLabels[idx]}
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
                CH12 · Milestone {activeMilestone.number} of 5
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

          <div className="h-6" />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* RIGHT PANE (50% Width) — Focused Code Editor, Action Bar & Drawer      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="w-1/2 h-full flex flex-col overflow-hidden"
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

              return (
                <button
                  key={cf.path}
                  onClick={() => openFile(cf.path)}
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
                  {isPassed && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 ml-0.5" />}
                </button>
              );
            })}
          </div>

          {/* Reset Current File Button */}
          <button
            onClick={handleResetActiveFile}
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
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontWeight: '500',
                fontLigatures: true,
                lineHeight: 22,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                glyphMargin: false,
                folding: true,
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

        {/* ── Boot.dev Action Bar ── */}
        <div
          id="lesson-action-bar"
          className="flex items-center gap-2 px-3 flex-shrink-0 select-none"
          style={{
            height: '44px',
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
            disabled={isVerifying || isRunning}
            className="btn-submit flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg disabled:opacity-50 cursor-pointer"
          >
            {isVerifying ? (
              <div className="stage-spinner w-3 h-3 rounded-full border-2 border-slate-900 border-t-transparent" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>{isVerifying ? 'Verifying 5 Milestones...' : 'Submit'}</span>
          </button>

          {/* Run & Simulate Button */}
          <button
            id="run-btn"
            onClick={handleRun}
            disabled={isRunning || isVerifying}
            className="btn-run flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
          >
            {isRunning ? (
              <div className="stage-spinner w-3 h-3 rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isRunning ? 'Running...' : 'Run'}</span>
          </button>

          {/* Solution Toggle */}
          <button
            id="solution-btn"
            onClick={() => {
              setIsDrawerOpen(true);
              setDrawerTab('solution');
            }}
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
            className="glass-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer"
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

        {/* ── Bottom Collapsible Verification & Output Drawer ── */}
        {isDrawerOpen && (
          <div
            className="shrink-0 flex flex-col backdrop-blur-xl"
            style={{
              height: '240px',
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
                  Verification ({passedCount}/{verificationStages.length || 5})
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
                  onClick={() => setDrawerTab('solution')}
                  className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer"
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
                  Reference Solution
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
                      Click <strong>Submit</strong> to compile and verify all 5 milestones against the OTP 29 test suite.
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

              {drawerTab === 'solution' && (
                <div className="space-y-3">
                  <div
                    className="flex items-center justify-between p-2.5 rounded-xl"
                    style={{
                      background: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
                      border: isDark ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(245, 158, 11, 0.20)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-bold" style={{ color: isDark ? '#FCD34D' : '#D97706' }}>
                        Reference Solution ({activeFile?.name || 'Active File'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopySolution}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        style={{
                          background: isDark ? 'rgba(255, 255, 255, 0.10)' : '#FFFFFF',
                          color: isDark ? '#F8FAFC' : '#0F172A',
                          border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(15, 23, 42, 0.10)',
                        }}
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                      </button>

                      <button
                        onClick={handleLoadActiveSolution}
                        className="px-2.5 py-1 rounded-lg text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
                        style={{ background: '#D97706' }}
                      >
                        Load This File Solution
                      </button>
                    </div>
                  </div>

                  <pre
                    className="font-mono text-[11px] p-3 rounded-xl overflow-x-auto max-h-36 leading-relaxed"
                    style={{
                      background: '#0B0F17',
                      color: '#E2E8F0',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    {CH12_SOLUTION_FILES[activeFile?.path || activeMilestone.targetFile] || 'No solution found for this file.'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

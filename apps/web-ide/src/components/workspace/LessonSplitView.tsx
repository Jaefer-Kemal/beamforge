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
  Trophy,
  Target,
  ArrowRight,
} from 'lucide-react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import type {
  OtpDocSignatureCard,
  AstRuleSpec,
  RunTestCaseResult,
  LessonContent,
  VisualSceneId,
} from '../../types/workspace';
import { configureMonacoErlang, ErlangCodeBlock } from '../../lib/monacoErlang';
import { BeamConceptVisualizer } from '../pedagogy/BeamConceptVisualizer';
import { MentalModelCheckCard } from '../pedagogy/MentalModelCheckCard';
import { ErlangTermDiffCard } from '../pedagogy/ErlangTermDiffCard';

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


// ── Utility: parse inline markdown elements (bold, code, links) ──────────────
function renderInlineContent(text: string, isDark: boolean): React.ReactNode {
  if (!text) return null;

  // Regex splits on inline code (`...`) and bold (**...**)
  const regex = /(`[^`]+`|\*\*[^*]+?\*\*)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Inline code (`...`)
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

    // Bold text (**...**)
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

// ── Utility: parse markdown to simple HTML segments ──────────────────────────
function MarkdownRenderer({ md }: { md: string }) {
  const isDark = useWorkspaceStore((s) => s.theme) === 'dark';
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
        <h2 key={i} className="text-base font-extrabold mt-6 mb-2 tracking-tight"
          style={{ color: isDark ? '#F8FAFC' : '#020617' }}>
          {renderInlineContent(line.slice(3), isDark)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-sm font-bold mt-4 mb-1.5"
          style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
          {renderInlineContent(line.slice(4), isDark)}
        </h3>
      );
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-4 pl-4 py-2 my-2 text-sm leading-relaxed"
          style={{
            borderColor: isDark ? '#A78BFA' : '#7C3AED',
            color: isDark ? '#E2E8F0' : '#0F172A',
            background: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(124,58,237,0.06)',
            borderRadius: '0 0.5rem 0.5rem 0',
          }}>
          {renderInlineContent(line.slice(2), isDark)}
        </blockquote>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={i} className="ml-5 text-sm mb-1.5 list-disc leading-relaxed font-normal"
          style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>
          {renderInlineContent(line.slice(2), isDark)}
        </li>
      );
    } else if (/^\d+\.\s+/.test(line)) {
      const numMatch = line.match(/^(\d+\.)\s+(.*)$/);
      elements.push(
        <li key={i} className="ml-5 text-sm mb-1.5 list-decimal leading-relaxed font-medium"
          style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>
          {renderInlineContent(numMatch ? numMatch[2] : line, isDark)}
        </li>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm leading-relaxed mb-2 font-normal"
          style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>
          {renderInlineContent(line, isDark)}
        </p>
      );
    }
    i++;
  }

  return <div className="leading-relaxed">{elements}</div>;
}

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
          <p className="text-sm leading-relaxed font-normal" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>{card.description}</p>
          {/* Complexity */}
          <div className="flex items-center gap-1.5 text-xs font-medium"
            style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
            <span>{card.complexityNote}</span>
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
    files, activeFilePath, openTabPaths,
    updateFileContent, openFile, resetWorkspace,
    runCode, isRunning, runResult,
    runVerificationSuite, isVerifying, verificationStages,
    lessonOutputTab, setLessonOutputTab,
    isLessonOutputOpen, setLessonOutputOpen,
    isSolutionVisible, setSolutionVisible,
    loadSolutionForActiveExercise,
  } = useWorkspaceStore();

  const isDark = theme === 'dark';
  const activeFile = files.find((f) => f.path === activeFilePath);
  const [editorMounted, setEditorMounted] = useState(false);
  const monacoRef = useRef<any>(null);

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
        const res = await fetch('http://localhost:8080/api/v1/lint', {
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

  const outputDrawerHeight = isLessonOutputOpen ? 300 : 44;

  return (
    <div
      className="flex w-full overflow-hidden"
      style={{ height: 'calc(100vh - 3.5rem)', marginTop: '3.5rem' }}
    >
      {/* ════════════════════════════════════════════════════════════════════
          LEFT PANE — Interactive Textbook, Doc Cards & Assignment Spec (50%)
          ════════════════════════════════════════════════════════════════════ */}
      <div
        className="w-1/2 flex flex-col border-r overflow-hidden"
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
                background: lesson.lessonType === 'problem_set'
                  ? 'rgba(245,158,11,0.15)'
                  : lesson.lessonType === 'guided_demo'
                  ? 'rgba(0,122,255,0.12)'
                  : 'rgba(16,185,129,0.12)',
                color: lesson.lessonType === 'problem_set'
                  ? '#F59E0B'
                  : lesson.lessonType === 'guided_demo'
                  ? '#007AFF'
                  : '#10B981',
              }}>
              {lesson.lessonType === 'problem_set' ? (
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
          <h1 className="text-sm font-bold ml-1 flex-1 truncate"
            style={{ color: isDark ? '#F8FAFC' : '#020617' }}>
            {lesson.title}
          </h1>
        </div>

        {/* Left Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Slot 2: Concept Markdown */}
          <MarkdownRenderer md={lesson.conceptMarkdown} />

          {/* Slot 3: Interactive Step-Diagram (Collapsible) */}
          {resolveVisualScene(lesson) && (
            <div className="mt-4">
              <BeamConceptVisualizer scene={resolveVisualScene(lesson)!} />
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
                <OtpDocCard key={`${card.module}:${card.functionName}`} card={card} isDark={isDark} />
              ))}
            </div>
          )}

          {/* Slot 5: Quick Mental Model Check (Collapsible) */}
          <MentalModelCheckCard
            check={lesson.mentalModelCheck}
            lessonId={lesson.id}
            chapterNumber={lesson.chapterNumber}
            lessonNumber={lesson.lessonNumber}
            title={lesson.title}
            isDark={isDark}
          />

          {/* Slot 6: Strict Rules & Verification Constraints Card */}
          {lesson.astRules && <AstRulesCard rules={lesson.astRules} isDark={isDark} />}

          {/* Solution */}
          {isSolutionVisible && (
            <div className="mt-4 rounded-xl p-4"
              style={{
                background: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
                border: '1.5px solid rgba(16,185,129,0.25)',
              }}>
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-bold" style={{ color: isDark ? '#34D399' : '#059669' }}>
                  Reference Solution & Explanation
                </span>
              </div>
              <pre className="otp-doc-card p-3 text-xs overflow-x-auto mb-3"
                style={{ color: isDark ? '#E2E8F0' : '#1E293B', borderLeft: '3px solid #10B981' }}>
                <code>{lesson.solutionCode}</code>
              </pre>
              <p className="text-sm leading-relaxed" style={{ color: isDark ? '#94A3B8' : '#475569' }}>
                {lesson.solutionExplanation}
              </p>
              <button onClick={() => setSolutionVisible(false)} className="mt-3 text-xs underline"
                style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                Hide solution
              </button>
            </div>
          )}

          <div className="h-8" />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          RIGHT PANE — Code Editor, Action Bar & Output Drawer (50%)
          ════════════════════════════════════════════════════════════════════ */}
      <div className="w-1/2 flex flex-col overflow-hidden">

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
            onClick={resetWorkspace}
            className="ml-2 px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 transition-all duration-200"
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

        {/* Monaco Editor */}
        <div
          className="flex-1 overflow-hidden"
          style={{ height: `calc(100% - 44px - 44px - ${outputDrawerHeight}px)` }}
        >
          {editorMounted && MonacoEditor ? (
            <MonacoEditor
              language="erlang"
              path={activeFile?.path || 'workspace.erl'}
              value={activeFile?.content ?? ''}
              theme={isDark ? 'beamforge-dark' : 'beamforge-light'}
              beforeMount={(monaco: any) => {
                configureMonacoErlang(monaco);
              }}
              onChange={(val: string) => {
                const newContent = val ?? '';
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
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontWeight: '500',
                fontLigatures: true,
                lineHeight: 22,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 16, bottom: 16 },
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

        {/* ── Boot.dev Action Bar ── */}
        <div
          id="lesson-action-bar"
          className="flex items-center gap-2 px-3 flex-shrink-0"
          style={{
            height: '44px',
            background: isDark ? 'rgba(11,15,23,0.55)' : 'rgba(241,245,249,0.70)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            borderTop: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(15,23,42,0.08)',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(15,23,42,0.08)',
            boxShadow: isDark ? 'inset 0 1px 0 0 rgba(255,255,255,0.12)' : 'inset 0 1px 0 0 rgba(255,255,255,0.80)',
          }}
        >
          {/* ▶ Submit */}
          <button
            id="submit-btn"
            onClick={() => {
              setLessonOutputOpen(true);
              setLessonOutputTab('verification');
              runVerificationSuite();
            }}
            disabled={isVerifying || isRunning}
            className="btn-submit flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? (
              <div className="stage-spinner w-3 h-3 rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            <span>Submit</span>
          </button>

          {/* ▷ Run */}
          <button
            id="run-btn"
            onClick={() => {
              setLessonOutputOpen(true);
              setLessonOutputTab('test_results');
              runCode();
            }}
            disabled={isRunning || isVerifying}
            className="btn-run flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <div className="stage-spinner w-3 h-3 rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Run</span>
          </button>

          {/* Solution */}
          <button
            id="solution-btn"
            onClick={() => {
              setSolutionVisible(!isSolutionVisible);
              if (!isSolutionVisible) loadSolutionForActiveExercise();
            }}
            className="glass-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg"
            style={{ color: isDark ? '#94A3B8' : '#64748B' }}
          >
            {isSolutionVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Solution</span>
          </button>

          {/* Test Cases */}
          <button
            id="test-cases-btn"
            onClick={() => {
              setLessonOutputOpen(true);
              setLessonOutputTab('test_results');
            }}
            className="glass-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg"
            style={{ color: isDark ? '#94A3B8' : '#64748B' }}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Test Cases</span>
          </button>

          {/* Keyboard shortcut hint */}
          <div className="ml-auto text-xs hidden md:block"
            style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
            <kbd className="px-1 rounded text-xs font-mono"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)' }}>
              ⌘↵
            </kbd> Submit
          </div>
        </div>

        {/* ── Collapsible Output & Verification Drawer ── */}
        <div
          className="flex-shrink-0 overflow-hidden transition-all duration-300"
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
            ]).map(({ key, label, icon: Icon, badge }) => (
              <button
                key={key}
                id={`output-tab-${key}`}
                onClick={(e) => { e.stopPropagation(); setLessonOutputTab(key); setLessonOutputOpen(true); }}
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
            <div className="overflow-y-auto" style={{ height: `${outputDrawerHeight - 44}px`, background: isDark ? 'rgba(11,15,23,0.95)' : 'rgba(248,250,252,0.95)' }}>
              {lessonOutputTab === 'test_results' && (
                <div className="p-4 space-y-3">
                  {/* Compilation Failure Terminal Card if erlc failed */}
                  {runResult && !runResult.compileOk && (
                    <CompilationErrorCard
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
                        key={tc.id || idx}
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
                        <ErlangTermDiffCard key={i} test={extra} isDark={isDark} />
                      ))}
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
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';
import type {
  OtpDocSignatureCard,
  VisibleTestCase,
  AstRuleSpec,
  RunTestCaseResult,
  LessonContent,
} from '../../types/workspace';
import { configureMonacoErlang, ErlangCodeBlock } from '../../lib/monacoErlang';

export type { LessonContent };

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
            <span className="text-xs font-bold px-2 py-0.5 rounded-md"
              style={{ background: 'rgba(139,92,246,0.18)', color: '#8B5CF6' }}>
              📖 OTP Docs
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
        <svg className={`w-4 h-4 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
          style={{ color: isDark ? '#64748B' : '#475569' }} viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
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
            <span>⏱</span><span>{card.complexityNote}</span>
          </div>
          {/* Links */}
          <div className="flex items-center gap-3">
            <a href={card.officialUrl} target="_blank" rel="noreferrer"
              className="text-xs font-medium hover:underline"
              style={{ color: '#007AFF' }}
              onClick={(e) => e.stopPropagation()}>
              Official Erlang Docs ↗
            </a>
            {card.githubSourceUrl && (
              <a href={card.githubSourceUrl} target="_blank" rel="noreferrer"
                className="text-xs font-medium hover:underline"
                style={{ color: '#8B5CF6' }}
                onClick={(e) => e.stopPropagation()}>
                OTP Source ↗
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Run Result Test Case Card ────────────────────────────────────────────────
function RunTestCard({ test, isDark }: { test: RunTestCaseResult; isDark: boolean }) {
  return (
    <div className={`rounded-xl p-3 mb-2 border ${test.passed ? 'test-pass' : 'test-fail'}`}
      style={{ borderRadius: '0.75rem' }}>
      <div className="flex items-center justify-between mb-2">
        <code className="text-xs font-mono font-semibold"
          style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
          {test.callStr}
        </code>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>{test.timeMs}ms</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full`}
            style={{
              background: test.passed ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)',
              color: test.passed ? '#10B981' : '#EF4444',
            }}>
            {test.passed ? '✓ PASS' : '✗ FAIL'}
          </span>
        </div>
      </div>
      {!test.passed && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-mono">
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>Expected:</div>
            <div className="px-2 py-1 rounded-lg" style={{ background: isDark ? 'rgba(16,185,129,0.10)' : 'rgba(16,185,129,0.08)', color: '#10B981' }}>
              {test.expected}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold mb-1" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>Actual:</div>
            <div className="px-2 py-1 rounded-lg" style={{ background: isDark ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
              {test.actual}
            </div>
          </div>
        </div>
      )}
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
        <span className="text-base">⚡</span>
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
        These rules are verified by <code className="font-mono">bf_ast_verifier:verify_rules/3</code> on every <strong>▶ Submit</strong>.
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
    passed: <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="#10B981" /><path d="M4.5 7l2 2 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    failed: <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="#EF4444" /><path d="M5 5l4 4M9 5l-4 4" stroke="white" strokeWidth="1.2" strokeLinecap="round" /></svg>,
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
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
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
    updateFileContent, openFile, closeTab, resetWorkspace,
    runCode, isRunning, runResult, clearRunResult,
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
  }, [activeFilePath]);

  // Visible test cases tab content
  const TestSuiteTab = () => (
    <div className="p-4 space-y-3">
      <p className="text-xs mb-3" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
        These are the exact Erlang expressions used for visible tests when you click <strong>▷ Run</strong>.
      </p>
      {lesson.visibleTestCases.map((tc) => (
        <div key={tc.id} className="rounded-xl p-3"
          style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
          }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold" style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
              🧪 {tc.title}
            </span>
          </div>
          <code className="block text-xs font-mono mb-2 px-2 py-1.5 rounded-lg"
            style={{
              background: isDark ? 'rgba(0,122,255,0.12)' : 'rgba(0,122,255,0.06)',
              color: isDark ? '#93C5FD' : '#1D4ED8',
            }}>
            {tc.erlangCall}
          </code>
          <div className="flex items-center gap-2 text-xs">
            <span style={{ color: isDark ? '#64748B' : '#94A3B8' }}>Expected:</span>
            <code className="font-mono" style={{ color: '#10B981' }}>{tc.expectedOutput}</code>
          </div>
          <p className="text-xs mt-1.5" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>{tc.explanation}</p>
        </div>
      ))}
    </div>
  );

  const outputDrawerHeight = isLessonOutputOpen ? 240 : 44;

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
          background: isDark ? 'rgba(11, 15, 23, 0.75)' : 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
        }}
      >
        {/* Left Header */}
        <div
          className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
          style={{
            background: isDark ? 'rgba(11,15,23,0.65)' : 'rgba(241,245,249,0.90)',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-md font-bold"
              style={{ background: 'rgba(139,92,246,0.18)', color: '#8B5CF6' }}>
              CH{lesson.chapterNumber}·L{lesson.lessonNumber}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-medium"
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
              {lesson.lessonType === 'problem_set' ? '🏆 Assignment'
                : lesson.lessonType === 'guided_demo' ? '🎯 Guided Demo'
                : '📘 Concept & Code'}
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
          {/* Concept Markdown */}
          <MarkdownRenderer md={lesson.conceptMarkdown} />

          {/* OTP Doc Cards */}
          {lesson.otpDocCards.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                📖 Official Erlang Docs & Function Reference
              </div>
              {lesson.otpDocCards.map((card) => (
                <OtpDocCard key={`${card.module}:${card.functionName}`} card={card} isDark={isDark} />
              ))}
            </div>
          )}

          {/* AST Rules Card */}
          {lesson.astRules && <AstRulesCard rules={lesson.astRules} isDark={isDark} />}

          {/* Solution */}
          {isSolutionVisible && (
            <div className="mt-4 rounded-xl p-4"
              style={{
                background: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
                border: '1.5px solid rgba(16,185,129,0.25)',
              }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">👁</span>
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
            background: isDark ? 'rgba(11,15,23,0.65)' : 'rgba(241,245,249,0.90)',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
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
            className="ml-2 px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 transition-all duration-200"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
              color: isDark ? '#CBD5E1' : '#334155',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
            }}
          >
            ↩ Reset
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
                if (activeFile) updateFileContent(activeFile.path, val ?? '');
              }}
              onMount={(editor: any, monaco: any) => {
                configureMonacoErlang(monaco);
                const model = editor.getModel();
                if (model) {
                  monaco.editor.setModelLanguage(model, 'erlang');
                }
                monaco.editor.setTheme(isDark ? 'beamforge-dark' : 'beamforge-light');
                monacoRef.current = { editor, monaco };
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
            background: isDark ? 'rgba(11,15,23,0.70)' : 'rgba(238,242,246,0.70)',
            borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
          }}
        >
          {/* ▶ Submit */}
          <button
            id="submit-btn"
            onClick={() => {
              setLessonOutputOpen(true);
              setLessonOutputTab('test_results');
              runVerificationSuite();
            }}
            disabled={isVerifying || isRunning}
            className="btn-submit flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying
              ? <div className="stage-spinner w-3 h-3 rounded-full border-2 border-white border-t-transparent" />
              : <span>▶</span>}
            <span>Submit</span>
          </button>

          {/* ▷ Run */}
          <button
            id="run-btn"
            onClick={() => runCode()}
            disabled={isRunning || isVerifying}
            className="btn-run flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning
              ? <div className="stage-spinner w-3 h-3 rounded-full border-2 border-white border-t-transparent" />
              : <span>▷</span>}
            <span>Run</span>
          </button>

          {/* 👁 Solution */}
          <button
            id="solution-btn"
            onClick={() => {
              setSolutionVisible(!isSolutionVisible);
              if (!isSolutionVisible) loadSolutionForActiveExercise();
            }}
            className="glass-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg"
            style={{ color: isDark ? '#94A3B8' : '#64748B' }}
          >
            <span>👁</span>
            <span className="hidden sm:inline">Solution</span>
          </button>

          {/* 🧪 Test Cases */}
          <button
            id="test-cases-btn"
            onClick={() => {
              setLessonOutputOpen(true);
              setLessonOutputTab('test_suite');
            }}
            className="glass-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg"
            style={{ color: isDark ? '#94A3B8' : '#64748B' }}
          >
            <span>🧪</span>
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
              { key: 'test_results' as const, label: '📊 Test & Rule Results' },
              { key: 'console' as const, label: '🖥 Console Output' },
              { key: 'test_suite' as const, label: '🧪 Test Suite Source' },
            ]).map(({ key, label }) => (
              <button
                key={key}
                id={`output-tab-${key}`}
                onClick={(e) => { e.stopPropagation(); setLessonOutputTab(key); setLessonOutputOpen(true); }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg mr-1 transition-all duration-150"
                style={{
                  background: lessonOutputTab === key && isLessonOutputOpen
                    ? (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)')
                    : 'transparent',
                  color: lessonOutputTab === key && isLessonOutputOpen
                    ? (isDark ? '#F8FAFC' : '#0F172A')
                    : (isDark ? '#64748B' : '#94A3B8'),
                }}
              >
                {label}
              </button>
            ))}

            {/* Run result summary badge */}
            {runResult && (
              <div className="ml-auto flex items-center gap-2 text-xs">
                <span style={{ color: isDark ? '#64748B' : '#94A3B8' }}>{runResult.totalDurationMs}ms</span>
                <span
                  className="px-2 py-0.5 rounded-full font-bold"
                  style={{
                    background: runResult.visibleTests.every((t) => t.passed) ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)',
                    color: runResult.visibleTests.every((t) => t.passed) ? '#10B981' : '#EF4444',
                  }}
                >
                  {runResult.visibleTests.filter((t) => t.passed).length}/{runResult.visibleTests.length} ✓
                </span>
              </div>
            )}
          </div>

          {/* Drawer Content */}
          {isLessonOutputOpen && (
            <div className="overflow-y-auto" style={{ height: `${outputDrawerHeight - 44}px`, background: isDark ? 'rgba(11,15,23,0.95)' : 'rgba(248,250,252,0.95)' }}>
              {lessonOutputTab === 'test_results' && (
                <div className="p-4">
                  {/* Verification stages */}
                  {verificationStages.map((s) => (
                    <StageRow key={s.id} stage={s} isDark={isDark} />
                  ))}
                  {/* Run test results */}
                  {runResult && (
                    <div className="mt-3">
                      <div className="text-xs font-bold uppercase tracking-wide mb-2"
                        style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                        ▷ Run Results
                      </div>
                      {runResult.visibleTests.map((t, i) => (
                        <RunTestCard key={i} test={t} isDark={isDark} />
                      ))}
                    </div>
                  )}
                </div>
              )}
              {lessonOutputTab === 'console' && (
                <div className="p-4 font-mono text-xs space-y-1" style={{ color: isDark ? '#94A3B8' : '#475569' }}>
                  {runResult?.stdout
                    ? runResult.stdout.split('\n').map((line, i) => (
                        <div key={i} className="leading-relaxed">{line || '\u00A0'}</div>
                      ))
                    : <div className="text-center pt-8" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                        Click <strong>▷ Run</strong> to see <code>io:format</code> output here.
                      </div>
                  }
                </div>
              )}
              {lessonOutputTab === 'test_suite' && <TestSuiteTab />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

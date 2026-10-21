'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  GitCompare,
  Terminal,
} from 'lucide-react';
import type { RunTestCaseResult } from '../../types/workspace';

export interface ErlangTermDiffCardProps {
  test: RunTestCaseResult | {
    callStr: string;
    expected: string;
    actual: string;
    passed: boolean;
    timeMs?: number;
    explanation?: string;
  };
  isDark: boolean;
}

// ── Erlang Tokenizer for Term Diff ─────────────────────────────────────────
interface DiffToken {
  text: string;
  isDiff: boolean;
  type: 'punctuation' | 'atom' | 'number' | 'string' | 'binary' | 'other';
}

function tokenizeErlangTerm(termStr: string): string[] {
  if (!termStr) return [];
  // Tokenize atoms, binaries, strings, numbers, punctuation, identifiers
  const regex = /(<<".*?">>|#\{|\{|}|\/\/|\[|]|\=>|,|:|\s+|"[^"]*"|[a-z_][a-zA-Z0-9_]*|-?[0-9]+(?:\.[0-9]+)?|[^\s,{}\[\]#]+)/g;
  const matches = termStr.match(regex);
  return matches || [termStr];
}

function computeTokenDiff(expectedStr: string, actualStr: string): {
  expectedTokens: DiffToken[];
  actualTokens: DiffToken[];
} {
  const expTokens = tokenizeErlangTerm(expectedStr);
  const actTokens = tokenizeErlangTerm(actualStr);

  const expectedDiff: DiffToken[] = [];
  const actualDiff: DiffToken[] = [];

  const maxLen = Math.max(expTokens.length, actTokens.length);

  for (let i = 0; i < maxLen; i++) {
    const exp = expTokens[i] || '';
    const act = actTokens[i] || '';

    const isMatch = exp === act;

    if (exp) {
      expectedDiff.push({
        text: exp,
        isDiff: !isMatch,
        type: getTokenType(exp),
      });
    }

    if (act) {
      actualDiff.push({
        text: act,
        isDiff: !isMatch,
        type: getTokenType(act),
      });
    }
  }

  return { expectedTokens: expectedDiff, actualTokens: actualDiff };
}

function getTokenType(token: string): DiffToken['type'] {
  if (['{', '}', '[', ']', '#{', '=>', ',', ':'].includes(token)) return 'punctuation';
  if (token.startsWith('<<"') && token.endsWith('">>')) return 'binary';
  if (token.startsWith('"') && token.endsWith('"')) return 'string';
  if (/^-?[0-9]+(\.[0-9]+)?$/.test(token)) return 'number';
  if (/^[a-z_][a-zA-Z0-9_]*$/.test(token)) return 'atom';
  return 'other';
}

export function ErlangTermDiffCard({ test, isDark }: ErlangTermDiffCardProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopyCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (test.callStr) {
      navigator.clipboard.writeText(test.callStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const { expectedTokens, actualTokens } = computeTokenDiff(
    test.expected || '',
    test.actual || ''
  );

  const isMultiLine =
    (test.actual && test.actual.length > 80) ||
    (test.expected && test.expected.length > 80) ||
    (test.actual && test.actual.includes('\n')) ||
    (test.expected && test.expected.includes('\n'));

  return (
    <div
      className="rounded-xl border transition-all duration-200 overflow-hidden my-2 shadow-xs"
      style={{
        background: isDark
          ? test.passed
            ? 'rgba(16, 185, 129, 0.05)'
            : 'rgba(239, 68, 68, 0.05)'
          : test.passed
            ? 'rgba(16, 185, 129, 0.04)'
            : 'rgba(239, 68, 68, 0.03)',
        borderColor: isDark
          ? test.passed
            ? 'rgba(16, 185, 129, 0.28)'
            : 'rgba(239, 68, 68, 0.32)'
          : test.passed
            ? 'rgba(16, 185, 129, 0.22)'
            : 'rgba(239, 68, 68, 0.22)',
      }}
    >
      {/* ── Card Header ──────────────────────────────────────────────────────── */}
      <div
        className="px-3.5 py-2.5 flex items-center justify-between border-b gap-2"
        style={{
          borderColor: isDark
            ? test.passed
              ? 'rgba(16, 185, 129, 0.15)'
              : 'rgba(239, 68, 68, 0.15)'
            : test.passed
              ? 'rgba(16, 185, 129, 0.10)'
              : 'rgba(239, 68, 68, 0.10)',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Status Badge */}
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 flex-shrink-0"
            style={{
              background: test.passed
                ? (isDark ? 'rgba(16, 185, 129, 0.20)' : 'rgba(16, 185, 129, 0.12)')
                : (isDark ? 'rgba(239, 68, 68, 0.20)' : 'rgba(239, 68, 68, 0.12)'),
              color: test.passed
                ? (isDark ? '#34D399' : '#059669')
                : (isDark ? '#F87171' : '#DC2626'),
              border: test.passed
                ? (isDark ? '1px solid rgba(16, 185, 129, 0.40)' : '1px solid rgba(16, 185, 129, 0.30)')
                : (isDark ? '1px solid rgba(239, 68, 68, 0.40)' : '1px solid rgba(239, 68, 68, 0.30)'),
            }}
          >
            {test.passed ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>PASS</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-rose-500" />
                <span>MISMATCH</span>
              </>
            )}
          </span>

          {/* Monospace Erlang Call */}
          <div className="min-w-0 flex-1 flex items-center gap-1.5">
            <code
              className="font-mono text-xs font-semibold truncate select-text"
              style={{
                color: isDark ? '#E2E8F0' : '#1E293B',
              }}
              title={test.callStr}
            >
              {test.callStr}
            </code>
          </div>
        </div>

        {/* Right Tools: Time + Copy Call + Expand Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {test.timeMs !== undefined && (
            <span
              className="text-[11px] font-mono flex items-center gap-1"
              style={{ color: isDark ? '#64748B' : '#94A3B8' }}
            >
              <Clock className="w-3 h-3" />
              <span>{test.timeMs}ms</span>
            </span>
          )}

          {/* Copy Call button */}
          <button
            onClick={handleCopyCall}
            className="px-2 py-1 rounded-md text-[10px] font-medium transition-all flex items-center gap-1 border"
            style={{
              background: copied
                ? (isDark ? 'rgba(16, 185, 129, 0.20)' : 'rgba(16, 185, 129, 0.12)')
                : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)'),
              borderColor: copied
                ? (isDark ? 'rgba(16, 185, 129, 0.45)' : 'rgba(16, 185, 129, 0.35)')
                : (isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(15, 23, 42, 0.08)'),
              color: copied
                ? (isDark ? '#6EE7B7' : '#047857')
                : (isDark ? '#CBD5E1' : '#475569'),
            }}
            title="Copy Erlang call expression to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy Call</span>
              </>
            )}
          </button>

          {isMultiLine && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-md transition-colors"
              style={{
                color: isDark ? '#94A3B8' : '#64748B',
                background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)',
              }}
              title={isExpanded ? 'Collapse term view' : 'Expand term view'}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* ── Card Body ──────────────────────────────────────────────────────── */}
      <div className="p-3">
        {test.passed ? (
          // ── Case 1: Passed Test (Clean actual term return preview) ─────────
          <div className="flex items-center gap-2 font-mono text-xs select-text">
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.10)',
                color: isDark ? '#34D399' : '#059669',
              }}
            >
              Actual:
            </span>
            <code
              className={`leading-relaxed select-text ${isExpanded ? 'whitespace-pre-wrap' : 'truncate'}`}
              style={{ color: isDark ? '#A7F3D0' : '#065F46' }}
            >
              {test.actual || test.expected}
            </code>
          </div>
        ) : (
          // ── Case 2: Failed Test (Visual Expected vs Actual Term Diff) ───────
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              <GitCompare className="w-3.5 h-3.5 text-rose-400" />
              <span>Token-Level Erlang Term Diff:</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs font-mono">
              {/* Expected Column */}
              <div
                className="rounded-xl border p-2.5 overflow-x-auto select-text shadow-inner"
                style={{
                  background: isDark ? 'rgba(11, 15, 23, 0.85)' : 'rgba(240, 253, 244, 0.70)',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.30)' : 'rgba(16, 185, 129, 0.25)',
                }}
              >
                <div
                  className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between"
                  style={{ color: isDark ? '#6EE7B7' : '#047857' }}
                >
                  <span>Expected Term:</span>
                  <span className="text-[9px] font-normal opacity-80 font-sans">Matching Contract</span>
                </div>
                <div className="leading-relaxed select-text flex flex-wrap gap-0.5">
                  {expectedTokens.map((tok, i) => (
                    <span
                      key={i}
                      className={
                        tok.isDiff
                          ? 'px-1 py-0.2 rounded font-bold transition-colors'
                          : 'transition-colors'
                      }
                      style={{
                        background: tok.isDiff
                          ? (isDark ? 'rgba(16, 185, 129, 0.30)' : 'rgba(16, 185, 129, 0.20)')
                          : 'transparent',
                        color: tok.isDiff
                          ? (isDark ? '#6EE7B7' : '#047857')
                          : (isDark ? '#CBD5E1' : '#334155'),
                        border: tok.isDiff
                          ? (isDark ? '1px solid rgba(16, 185, 129, 0.50)' : '1px solid rgba(16, 185, 129, 0.40)')
                          : 'none',
                      }}
                    >
                      {tok.text}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actual Return Column */}
              <div
                className="rounded-xl border p-2.5 overflow-x-auto select-text shadow-inner"
                style={{
                  background: isDark ? 'rgba(11, 15, 23, 0.85)' : 'rgba(254, 242, 242, 0.70)',
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.30)' : 'rgba(239, 68, 68, 0.25)',
                }}
              >
                <div
                  className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center justify-between"
                  style={{ color: isDark ? '#FCA5A5' : '#B91C1C' }}
                >
                  <span>Actual Return:</span>
                  <span className="text-[9px] font-normal opacity-80 font-sans">Token Mismatch Highlighted</span>
                </div>
                <div className="leading-relaxed select-text flex flex-wrap gap-0.5">
                  {actualTokens.map((tok, i) => (
                    <span
                      key={i}
                      className={
                        tok.isDiff
                          ? 'px-1 py-0.2 rounded font-bold transition-colors'
                          : 'transition-colors'
                      }
                      style={{
                        background: tok.isDiff
                          ? (isDark ? 'rgba(239, 68, 68, 0.32)' : 'rgba(239, 68, 68, 0.18)')
                          : 'transparent',
                        color: tok.isDiff
                          ? (isDark ? '#FCA5A5' : '#B91C1C')
                          : (isDark ? '#CBD5E1' : '#334155'),
                        border: tok.isDiff
                          ? (isDark ? '1px solid rgba(239, 68, 68, 0.50)' : '1px solid rgba(239, 68, 68, 0.40)')
                          : 'none',
                      }}
                    >
                      {tok.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Optional Hint/Explanation */}
            {'explanation' in test && test.explanation && (
              <div
                className="p-2 rounded-lg text-[11px] leading-relaxed border"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.02)',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
                  color: isDark ? '#94A3B8' : '#64748B',
                }}
              >
                <span className="font-semibold text-amber-500 mr-1.5">Verification Tip:</span>
                <span>{test.explanation}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ErlangTermDiffCard;

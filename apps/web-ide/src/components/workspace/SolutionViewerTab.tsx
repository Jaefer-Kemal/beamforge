'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Copy, Check, FileCode, BookOpen, Maximize2, Minimize2 } from 'lucide-react';

interface SolutionViewerTabProps {
  fileName: string;
  solutionCode: string;
  solutionExplanation?: string;
  isDark: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const SolutionViewerTab: React.FC<SolutionViewerTabProps> = ({
  fileName,
  solutionCode,
  solutionExplanation,
  isDark,
  isExpanded,
  onToggleExpand,
}) => {
  // Revealed by default once the user has confirmed the Option B unlock modal
  const [isRevealed, setIsRevealed] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!solutionCode) return;
    navigator.clipboard.writeText(solutionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = solutionCode ? solutionCode.split('\n') : [];

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 space-y-3">
      {/* Header Bar */}
      <div
        className="flex items-center justify-between gap-2 pb-2.5 border-b flex-shrink-0 flex-wrap sm:flex-nowrap"
        style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.30)',
              color: '#F59E0B',
            }}
          >
            <FileCode className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span
              className="text-[10px] font-bold block tracking-wider uppercase"
              style={{ color: isDark ? '#94A3B8' : '#64748B' }}
            >
              Active File Solution
            </span>
            <span
              className="text-xs font-mono font-semibold truncate block"
              style={{ color: isDark ? '#FCD34D' : '#D97706' }}
            >
              {fileName || 'Unknown File'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Toggle Blur / Reveal Button in Header */}
          <button
            onClick={() => setIsRevealed(!isRevealed)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all active:scale-95"
            style={{
              background: !isRevealed
                ? (isDark ? 'rgba(245, 158, 11, 0.20)' : 'rgba(245, 158, 11, 0.12)')
                : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)'),
              color: !isRevealed ? '#F59E0B' : (isDark ? '#CBD5E1' : '#475569'),
              border: !isRevealed
                ? '1px solid rgba(245, 158, 11, 0.35)'
                : (isDark ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid rgba(15, 23, 42, 0.10)'),
            }}
            title={isRevealed ? 'Blur code to prevent spoilers' : 'Unblur code'}
          >
            {isRevealed ? (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Blur Code</span>
                <span className="sm:hidden">Blur</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Unblur</span>
              </>
            )}
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all active:scale-95"
            style={{
              background: copied
                ? (isDark ? 'rgba(16, 185, 129, 0.20)' : 'rgba(16, 185, 129, 0.15)')
                : (isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.12)'),
              color: copied ? '#10B981' : (isDark ? '#FCD34D' : '#D97706'),
              border: copied
                ? '1px solid rgba(16, 185, 129, 0.35)'
                : '1px solid rgba(245, 158, 11, 0.30)',
            }}
            title="Copy reference solution to clipboard (does not overwrite editor)"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copy Code</span>
                <span className="sm:hidden">Copy</span>
              </>
            )}
          </button>

          {/* Maximize / Minimize Toggle */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all active:scale-95"
              style={{
                background: isExpanded
                  ? (isDark ? 'rgba(99, 102, 241, 0.20)' : 'rgba(99, 102, 241, 0.12)')
                  : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)'),
                color: isExpanded ? '#818CF8' : (isDark ? '#CBD5E1' : '#475569'),
                border: isExpanded
                  ? '1px solid rgba(99, 102, 241, 0.35)'
                  : (isDark ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid rgba(15, 23, 42, 0.10)'),
              }}
              title={isExpanded ? 'Collapse pane' : 'Maximize pane to view full code comfortably'}
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Collapse</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Maximize</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Code Container with Interactive Click-to-Unblur */}
      <div
        className="relative rounded-xl overflow-hidden border min-h-[140px]"
        style={{
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
          background: isDark ? '#090D16' : '#F8FAFC',
        }}
      >
        {/* The Code Display */}
        <div
          className={`p-3 font-mono text-xs overflow-x-auto transition-all duration-300 ${
            !isRevealed
              ? 'select-none pointer-events-none filter blur-[6px] opacity-30'
              : ''
          }`}
          style={{ maxHeight: '380px' }}
        >
          {lines.map((line, idx) => (
            <div key={idx} className="flex leading-relaxed hover:bg-white/5 px-1 rounded">
              <span
                className="w-8 select-none text-right pr-3 font-mono text-[11px] opacity-40 flex-shrink-0"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}
              >
                {idx + 1}
              </span>
              <span
                className="flex-1 whitespace-pre"
                style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}
              >
                {line}
              </span>
            </div>
          ))}
          {lines.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-400">
              No solution found for this file.
            </div>
          )}
        </div>

        {/* Lightweight Un-clippable Unblur Banner if blurred */}
        {!isRevealed && (
          <div
            onClick={() => setIsRevealed(true)}
            className="absolute inset-0 z-10 flex items-center justify-center p-3 cursor-pointer select-none bg-black/30 backdrop-blur-[2px] transition-all hover:bg-black/20"
            title="Click to unblur reference code"
          >
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-lg hover:scale-105 active:scale-95 transition-all"
              style={{
                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                color: '#FFFFFF',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.40)',
              }}
            >
              <Eye className="w-4 h-4" />
              <span>Click to Unblur Reference Code</span>
            </div>
          </div>
        )}
      </div>

      {/* Pedagogical Explanation Card */}
      {solutionExplanation && (
        <div
          className="rounded-xl p-3.5 border space-y-1.5 flex-shrink-0"
          style={{
            background: isDark ? 'rgba(30, 41, 59, 0.40)' : 'rgba(241, 245, 249, 0.60)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
          }}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-amber-500" />
            <h4
              className="text-xs font-bold tracking-tight"
              style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
            >
              Architectural &amp; Pedagogical Notes
            </h4>
          </div>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: isDark ? '#CBD5E1' : '#334155' }}
          >
            {solutionExplanation}
          </p>
        </div>
      )}
    </div>
  );
};

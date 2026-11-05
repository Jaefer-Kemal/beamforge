'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Copy,
  Check,
  RotateCcw,
  FileCode,
  ShieldCheck,
  FlaskConical,
} from 'lucide-react';
import type { UserSubmissionRecord } from '../../types/submissions';
import { ErlangCodeBlock } from '../../lib/monacoErlang';
import { RestoreConfirmModal } from './RestoreConfirmModal';

interface LessonSubmissionDetailProps {
  submission: UserSubmissionRecord;
  isDark: boolean;
  onBack: () => void;
  onRestore: (sub: UserSubmissionRecord) => void;
}

export const LessonSubmissionDetail: React.FC<LessonSubmissionDetailProps> = ({
  submission,
  isDark,
  onBack,
  onRestore,
}) => {
  const [copied, setCopied] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  const fileEntries = Object.entries(submission.files || {});
  const [selectedFilePath, setSelectedFilePath] = useState<string>(
    fileEntries[0]?.[0] || 'src/solution.erl'
  );

  const activeEntry = fileEntries.find(([path]) => path === selectedFilePath) || fileEntries[0];
  const filePath = activeEntry?.[0] || 'src/solution.erl';
  const fileContent = typeof activeEntry?.[1] === 'string' ? activeEntry[1] : '% No file content recorded';

  const isAccepted = submission.status === 'passed';
  const isCompileError = submission.status === 'compile_error';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fileContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const formattedDate = new Date(submission.createdAt).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-5 py-4">
      {/* Top Navigation & Timestamp */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <button
          id="back-to-submissions-btn"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150"
          style={{
            background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
            color: isDark ? '#E2E8F0' : '#1E293B',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Submissions</span>
        </button>

        <span
          className="text-[11px] font-mono font-medium"
          style={{ color: isDark ? '#94A3B8' : '#64748B' }}
        >
          {formattedDate}
        </span>
      </div>

      {/* Snapshot Summary Banner */}
      <div
        id="submission-detail-banner"
        className="p-4 rounded-xl mb-4 border flex-shrink-0"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.85)',
          borderColor: isAccepted
            ? (isDark ? 'rgba(16, 185, 129, 0.30)' : 'rgba(16, 185, 129, 0.40)')
            : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)'),
          boxShadow: isDark ? '0 4px 16px rgba(0, 0, 0, 0.25)' : '0 2px 8px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: isAccepted
                  ? 'rgba(16, 185, 129, 0.15)'
                  : isCompileError
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(245, 158, 11, 0.15)',
                color: isAccepted
                  ? '#10B981'
                  : isCompileError
                  ? '#EF4444'
                  : '#F59E0B',
              }}
            >
              {isAccepted ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : isCompileError ? (
                <XCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-bold"
                  style={{
                    color: isAccepted
                      ? '#10B981'
                      : isCompileError
                      ? '#EF4444'
                      : '#F59E0B',
                  }}
                >
                  {isAccepted ? 'Accepted Solution' : isCompileError ? 'Compilation Failed' : 'Test Suite Failed'}
                </span>
                <span
                  className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
                    color: isDark ? '#F1F5F9' : '#0F172A',
                  }}
                >
                  {submission.score}/100
                </span>
              </div>
              <div
                className="flex items-center gap-2 mt-1 text-xs font-mono"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}
              >
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {submission.durationMs}ms
                </span>
                <span>·</span>
                <span>ID: {submission.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stages Breakdown Chips */}
        {submission.stagesSummary && submission.stagesSummary.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t"
            style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)' }}
          >
            {submission.stagesSummary.map((stg) => {
              const isStageOk = stg.status === 'passed';
              return (
                <span
                  key={stg.id || stg.title}
                  className="text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1.5"
                  style={{
                    background: isStageOk
                      ? (isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)')
                      : (isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)'),
                    color: isStageOk ? '#10B981' : '#EF4444',
                  }}
                >
                  {isStageOk ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  <span>{stg.title}</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Failed Stage Diagnostics Card */}
        {submission.stagesSummary && submission.stagesSummary.some((stg) => stg.status === 'failed' && stg.details) && (
          <div
            className="mt-3 p-3 rounded-lg border font-mono text-xs max-h-48 overflow-y-auto leading-relaxed select-text"
            style={{
              background: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.04)',
              borderColor: isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.20)',
              color: isDark ? '#FCA5A5' : '#DC2626',
            }}
          >
            <div className="font-sans font-bold text-xs mb-1.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>Diagnostics &amp; Failure Log:</span>
            </div>
            {submission.stagesSummary
              .filter((stg) => stg.status === 'failed' && stg.details)
              .map((stg) => (
                <div key={stg.id || stg.title} className="mb-2 last:mb-0">
                  <div className="font-semibold text-[11px] text-rose-400 font-sans">{stg.title}:</div>
                  <pre className="whitespace-pre-wrap text-[11px] mt-0.5 opacity-90">{stg.details}</pre>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Multi-File Tab Bar (When submission contains multiple files) */}
      {fileEntries.length > 1 && (
        <div
          id="submission-files-tab-bar"
          className="flex items-center gap-1.5 px-3 py-2 rounded-t-xl border-t border-x overflow-x-auto flex-shrink-0"
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.70)' : 'rgba(241, 245, 249, 0.95)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
          }}
        >
          {fileEntries.map(([fPath]) => {
            const fileName = fPath.split('/').pop() || fPath;
            const isSelected = fPath === filePath;
            return (
              <button
                key={fPath}
                id={`submission-tab-${fileName}`}
                onClick={() => setSelectedFilePath(fPath)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer flex-shrink-0"
                style={{
                  background: isSelected
                    ? (isDark ? 'rgba(255, 255, 255, 0.12)' : '#FFFFFF')
                    : 'transparent',
                  color: isSelected
                    ? (isDark ? '#F8FAFC' : '#0F172A')
                    : (isDark ? '#94A3B8' : '#64748B'),
                  boxShadow: isSelected && !isDark ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
                  border: isSelected
                    ? (isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.08)')
                    : '1px solid transparent',
                }}
              >
                <FileCode className="w-3.5 h-3.5 text-blue-500" />
                <span>{fileName}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Code Header with Copy and Restore Actions */}
      <div
        className={`flex items-center justify-between px-3.5 py-2.5 ${fileEntries.length > 1 ? 'border-t border-x' : 'rounded-t-xl border-t border-x'}`}
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.50)' : 'rgba(241, 245, 249, 0.80)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
        }}
      >
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-blue-500" />
          <span
            className="text-xs font-mono font-bold"
            style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}
          >
            {filePath}
          </span>
          <span
            className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded"
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
              color: isDark ? '#94A3B8' : '#64748B',
            }}
          >
            Read Only
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Button */}
          <button
            id="copy-submission-code-btn"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
              color: isDark ? '#CBD5E1' : '#334155',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
            }}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Restore to Editor Button */}
          <button
            id="restore-to-editor-btn"
            onClick={() => setIsRestoreModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all"
            style={{
              background: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.12)',
              color: '#F59E0B',
              border: '1px solid rgba(245, 158, 11, 0.30)',
            }}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restore to Editor</span>
          </button>
        </div>
      </div>

      {/* Read-Only Syntax Highlighted Erlang Code */}
      <div
        id="submission-code-viewer"
        className="rounded-b-xl border-b border-x overflow-hidden mb-4"
        style={{
          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
        }}
      >
        <ErlangCodeBlock code={fileContent} isDark={isDark} />
      </div>

      {/* Guarded Restore Confirmation Modal */}
      <RestoreConfirmModal
        isOpen={isRestoreModalOpen}
        submission={submission}
        isDark={isDark}
        onClose={() => setIsRestoreModalOpen(false)}
        onConfirm={() => {
          onRestore(submission);
          setIsRestoreModalOpen(false);
        }}
      />
    </div>
  );
};

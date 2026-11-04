'use client';

import React from 'react';
import {
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  FlaskConical,
  Eye,
} from 'lucide-react';
import type { UserSubmissionRecord } from '../../types/submissions';

interface LessonSubmissionsListProps {
  submissions: UserSubmissionRecord[];
  isLoading: boolean;
  isDark: boolean;
  onSelectSubmission: (sub: UserSubmissionRecord) => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const timestamp = new Date(dateString).getTime();
    if (isNaN(timestamp)) return 'Recently';
    const now = Date.now();
    const diffSec = Math.floor((now - timestamp) / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 90) return '1 min ago';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export const LessonSubmissionsList: React.FC<LessonSubmissionsListProps> = ({
  submissions,
  isLoading,
  isDark,
  onSelectSubmission,
}) => {
  const passedCount = submissions.filter((s) => s.status === 'passed').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto px-5 py-4">
      {/* Submissions Header Stats Bar */}
      <div
        className="flex items-center justify-between p-3.5 rounded-xl mb-4"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.45)' : 'rgba(248, 250, 252, 0.85)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(15, 23, 42, 0.08)',
        }}
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-amber-500" />
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}
          >
            Submission History
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          <span
            className="px-2 py-0.5 rounded-md font-semibold"
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
              color: isDark ? '#94A3B8' : '#64748B',
            }}
          >
            {submissions.length} {submissions.length === 1 ? 'Attempt' : 'Attempts'}
          </span>
          {passedCount > 0 && (
            <span
              className="px-2 py-0.5 rounded-md font-semibold flex items-center gap-1"
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
              }}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>{passedCount} Passed</span>
            </span>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && submissions.length === 0 && (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl animate-pulse"
              style={{
                background: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(15, 23, 42, 0.03)',
              }}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && submissions.length === 0 && (
        <div
          id="empty-submissions-card"
          className="my-auto text-center py-12 px-6 rounded-2xl border"
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.30)' : 'rgba(248, 250, 252, 0.50)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)',
          }}
        >
          <div
            className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-3"
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)',
              color: isDark ? '#94A3B8' : '#64748B',
            }}
          >
            <History className="w-6 h-6 opacity-60" />
          </div>
          <h4
            className="text-sm font-bold mb-1"
            style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
          >
            No Submissions Yet
          </h4>
          <p
            className="text-xs max-w-xs mx-auto leading-relaxed"
            style={{ color: isDark ? '#94A3B8' : '#64748B' }}
          >
            Run or Submit your solution to test your code against the AST verifier and full test suite. Every attempt is recorded here.
          </p>
        </div>
      )}

      {/* Submissions List */}
      <div id="submissions-timeline-list" className="space-y-2.5">
        {submissions.map((sub, idx) => {
          const isAccepted = sub.status === 'passed';
          const isCompileError = sub.status === 'compile_error';

          return (
            <div
              key={sub.id}
              id={`submission-item-${idx}`}
              onClick={() => onSelectSubmission(sub)}
              className="group p-3.5 rounded-xl border transition-all duration-200 cursor-pointer hover:scale-[1.008] relative overflow-hidden"
              style={{
                background: isDark ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.85)',
                borderColor: isAccepted
                  ? (isDark ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.35)')
                  : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)'),
                boxShadow: isDark
                  ? '0 4px 16px rgba(0, 0, 0, 0.20)'
                  : '0 2px 8px rgba(15, 23, 42, 0.04)',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Left: Status Badge & Score */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
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
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isCompileError ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold"
                        style={{
                          color: isAccepted
                            ? '#10B981'
                            : isCompileError
                            ? '#EF4444'
                            : '#F59E0B',
                        }}
                      >
                        {isAccepted ? 'Accepted' : isCompileError ? 'Compile Error' : 'Tests Failed'}
                      </span>
                      <span
                        className="text-xs font-mono font-semibold"
                        style={{ color: isDark ? '#94A3B8' : '#64748B' }}
                      >
                        {sub.score}/100
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] font-mono" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {sub.durationMs}ms
                      </span>
                      <span>·</span>
                      <span>{formatRelativeTime(sub.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Inspection CTA */}
                <div className="flex items-center gap-2">
                  <span
                    className="hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
                      color: isDark ? '#E2E8F0' : '#1E293B',
                    }}
                  >
                    Inspect Code
                  </span>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    style={{
                      background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.04)',
                      color: isDark ? '#CBD5E1' : '#475569',
                    }}
                  >
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>

              {/* Stages Summary Pills */}
              {sub.stagesSummary && sub.stagesSummary.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)' }}>
                  {sub.stagesSummary.map((stg) => {
                    const isStageOk = stg.status === 'passed';
                    return (
                      <span
                        key={stg.id || stg.title}
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1"
                        style={{
                          background: isStageOk
                            ? (isDark ? 'rgba(16, 185, 129, 0.10)' : 'rgba(16, 185, 129, 0.08)')
                            : (isDark ? 'rgba(239, 68, 68, 0.10)' : 'rgba(239, 68, 68, 0.08)'),
                          color: isStageOk ? '#10B981' : '#EF4444',
                        }}
                      >
                        {isStageOk ? (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        ) : (
                          <XCircle className="w-2.5 h-2.5" />
                        )}
                        <span>{stg.title}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

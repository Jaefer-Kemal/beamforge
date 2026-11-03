'use client';

import React, { useState } from 'react';
import { Eye, ShieldAlert, X, Lightbulb, ChevronDown, ChevronUp, Code2, Sparkles } from 'lucide-react';

interface SolutionUnlockModalProps {
  isOpen: boolean;
  fileName: string;
  isDark: boolean;
  onClose: () => void;
  onConfirm: () => void;
  hint1?: string;
  hint2?: string;
  solutionExplanation?: string;
}

function getDefaultSyntaxSkeleton(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.includes('server') || lower.includes('worker')) {
    return `-behaviour(gen_server).\n-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).\n\ninit(Args) -> {ok, #state{}}.\nhandle_call(Request, From, State) -> {reply, ok, State}.\nhandle_cast(Msg, State) -> {noreply, State}.`;
  }
  if (lower.includes('sup')) {
    return `-behaviour(supervisor).\n-export([init/1]).\n\ninit([]) ->\n  SupFlags = #{strategy => one_for_one, intensity => 3, period => 5},\n  ChildSpecs = [#{id => worker, start => {worker, start_link, []}, restart => permanent}],\n  {ok, {SupFlags, ChildSpecs}}.`;
  }
  if (lower.includes('statem') || lower.includes('fsm') || lower.includes('session') || lower.includes('c2s')) {
    return `-behaviour(gen_statem).\n-export([callback_mode/0, init/1]).\n\ncallback_mode() -> [state_functions, state_enter].\ninit(Args) -> {ok, disconnected, #data{}}.\ndisconnected(enter, _OldState, Data) -> {keep_state, Data};\ndisconnected(cast, {connect, Socket}, Data) -> {next_state, connected, Data}.`;
  }
  if (lower.includes('router') || lower.includes('auth') || lower.includes('xml') || lower.includes('stanza')) {
    return `parse(Binary) when is_binary(Binary) ->\n  case Binary of\n    <<"<stream:stream", _/binary>> -> {ok, stream_open};\n    <<"<iq ", _/binary>> -> {ok, iq};\n    _ -> {error, unknown_format}\n  end.`;
  }
  return `%% Clause Pattern Matching Skeleton\nfunction_name(Pattern1, Pattern2) when is_integer(Pattern1) ->\n  case Pattern2 of\n    {ok, Value} -> {ok, transform(Value)};\n    {error, Reason} -> {error, Reason}\n  end.`;
}

export const SolutionUnlockModal: React.FC<SolutionUnlockModalProps> = ({
  isOpen,
  fileName,
  isDark,
  onClose,
  onConfirm,
  hint1,
  hint2,
  solutionExplanation,
}) => {
  const [isHintAccordionOpen, setIsHintAccordionOpen] = useState(false);
  const [revealedTier2, setRevealedTier2] = useState(false);

  if (!isOpen) return null;

  const effectiveHint1 =
    hint1 ||
    solutionExplanation ||
    `Focus on pattern matching in function heads for ${fileName}. Ensure all tagged tuples and binary packet patterns match exactly.`;

  const effectiveHint2 = hint2 || getDefaultSyntaxSkeleton(fileName);

  const handleModalClose = () => {
    setIsHintAccordionOpen(false);
    setRevealedTier2(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl relative"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.97)',
          border: isDark ? '1px solid rgba(245, 158, 11, 0.30)' : '1px solid rgba(245, 158, 11, 0.40)',
          boxShadow: isDark
            ? '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(245, 158, 11, 0.15)'
            : '0 20px 50px rgba(0, 0, 0, 0.15), 0 0 30px rgba(245, 158, 11, 0.10)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleModalClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          style={{ background: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.05)' }}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Icon & Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#F59E0B',
            }}
          >
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3
              className="text-base font-bold tracking-tight"
              style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}
            >
              Unlock Reference Solution?
            </h3>
            <p
              className="text-xs font-mono font-medium mt-0.5"
              style={{ color: isDark ? '#FCD34D' : '#D97706' }}
            >
              Target: {fileName}
            </p>
          </div>
        </div>

        {/* Warning Text */}
        <div
          className="rounded-xl p-3.5 mb-4 text-xs leading-relaxed"
          style={{
            background: isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.06)',
            border: isDark ? '1px solid rgba(245, 158, 11, 0.20)' : '1px solid rgba(245, 158, 11, 0.25)',
            color: isDark ? '#E2E8F0' : '#334155',
          }}
        >
          Viewing the verified OTP 29 reference solution will forfeit your completion XP reward for this exercise.
          Your current code editor will remain untouched, and the reference solution will open in the inspector drawer.
        </div>

        {/* Progressive 2-Tier Hints Accordion */}
        <div
          className="rounded-xl overflow-hidden mb-5 transition-all"
          style={{
            background: isDark ? 'rgba(30, 41, 59, 0.50)' : 'rgba(241, 245, 249, 0.70)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => setIsHintAccordionOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs font-medium cursor-pointer transition-colors hover:opacity-90"
            style={{
              color: isDark ? '#38BDF8' : '#0284C7',
            }}
          >
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">Need a progressive hint first? (Keep 100% XP)</span>
            </div>
            {isHintAccordionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isHintAccordionOpen && (
            <div className="px-3.5 pb-3.5 pt-1 space-y-3 animate-fade-in border-t border-slate-700/20">
              {/* Tier 1 Hint: Mental Model & Concept */}
              <div
                className="p-3 rounded-lg text-xs"
                style={{
                  background: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.85)',
                  border: isDark ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid rgba(2, 132, 199, 0.25)',
                }}
              >
                <div className="flex items-center gap-1.5 mb-1.5 font-semibold text-[11px] text-sky-400 uppercase tracking-wide">
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  <span>Tier 1 · Mental Model Hint</span>
                </div>
                <p className="leading-relaxed" style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
                  {effectiveHint1}
                </p>
              </div>

              {/* Tier 2 Hint: Syntax & Pattern Skeleton */}
              {revealedTier2 ? (
                <div
                  className="p-3 rounded-lg text-xs"
                  style={{
                    background: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.85)',
                    border: isDark ? '1px solid rgba(168, 85, 247, 0.25)' : '1px solid rgba(147, 51, 234, 0.25)',
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5 font-semibold text-[11px] text-purple-400 uppercase tracking-wide">
                    <Code2 className="w-3 h-3 text-purple-400" />
                    <span>Tier 2 · Syntax & Structure Skeleton</span>
                  </div>
                  <pre
                    className="p-2.5 rounded font-mono text-[11px] overflow-x-auto whitespace-pre leading-relaxed"
                    style={{
                      background: isDark ? 'rgba(0, 0, 0, 0.40)' : 'rgba(248, 250, 252, 0.90)',
                      color: isDark ? '#A7F3D0' : '#065F46',
                      border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    {effectiveHint2}
                  </pre>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRevealedTier2(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                  style={{
                    background: isDark ? 'rgba(168, 85, 247, 0.12)' : 'rgba(147, 51, 234, 0.10)',
                    color: isDark ? '#C084FC' : '#7E22CE',
                    border: isDark ? '1px solid rgba(168, 85, 247, 0.30)' : '1px solid rgba(147, 51, 234, 0.30)',
                  }}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Reveal Tier 2 · Syntax Skeleton (Free)</span>
                </button>
              )}

              <p className="text-[11px] text-slate-400 italic">
                Using hints does not forfeit your XP. Take your time to write the solution yourself!
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={handleModalClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
            style={{
              background: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)',
              color: isDark ? '#E2E8F0' : '#1E293B',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(15, 23, 42, 0.12)',
            }}
          >
            Keep Trying
          </button>
          <button
            onClick={() => {
              onConfirm();
              handleModalClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
            }}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Unlock Solution (Forfeit XP)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

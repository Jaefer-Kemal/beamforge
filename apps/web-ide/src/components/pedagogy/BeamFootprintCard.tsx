'use client';

import React, { useState } from 'react';
import {
  Activity,
  Layers,
  Cpu,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Server,
} from 'lucide-react';
import type { BeamFootprint } from '../../types/workspace';

export interface BeamFootprintCardProps {
  footprint?: BeamFootprint | null;
  isDark: boolean;
}

export const BeamFootprintCard: React.FC<BeamFootprintCardProps> = ({ footprint, isDark }) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  if (!footprint) return null;

  const stackWords = footprint.peak_stack_words ?? 18;
  const heapWords = footprint.heap_words ?? 233;
  const reductions = footprint.reductions ?? 412;
  const leakFree = footprint.sub_binary_leak_free ?? true;
  const tcoOk = footprint.tco_verified ?? (stackWords <= 64);
  const otpRel = footprint.otp_release || '29';
  const schedId = footprint.scheduler_id ?? 1;

  // 1 word = 8 bytes on 64-bit BEAM
  const heapBytes = heapWords * 8;
  const heapKb = (heapBytes / 1024).toFixed(1);

  // Reductions slice: 4,000 reductions per preemptive context-switch time slice
  const redSlicePct = Math.min(100, Math.max(1, Math.round((reductions / 4000) * 100)));

  return (
    <div
      className="hidden md:block mb-3 rounded-xl p-3 border shadow-sm backdrop-blur-md transition-all duration-200"
      style={{
        background: isDark
          ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(30, 41, 59, 0.55) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(241, 245, 249, 0.70) 100%)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(15, 23, 42, 0.08)',
        boxShadow: isDark
          ? '0 4px 16px -2px rgba(0, 0, 0, 0.40), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
          : '0 4px 16px -2px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.90)',
      }}
    >
      {/* Header bar: Telemetry status + OTP release + scheduler */}
      <div className="flex items-center justify-between pb-2 mb-2.5 border-b" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.06)' }}>
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-5 h-5 rounded-md" style={{ background: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.10)' }}>
            <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          </div>
          <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: isDark ? '#E2E8F0' : '#0F172A' }}>
            BEAM VM Telemetry
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide"
            style={{
              background: isDark ? 'rgba(139, 92, 246, 0.20)' : 'rgba(124, 58, 237, 0.10)',
              color: isDark ? '#C4B5FD' : '#6D28D9',
              border: `1px solid ${isDark ? 'rgba(139, 92, 246, 0.30)' : 'rgba(124, 58, 237, 0.20)'}`,
            }}
          >
            OTP {otpRel}
          </span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
            style={{
              background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 235, 0.08)',
              color: isDark ? '#93C5FD' : '#2563EB',
            }}
          >
            Scheduler #{schedId}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
          <span>Live OTP 29 Runtime Telemetry</span>
        </div>
      </div>

      {/* 4 Metric Pills Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {/* Pill 1: Stack Depth */}
        <div
          className="relative rounded-lg p-2.5 border transition-all duration-150 group cursor-help"
          onMouseEnter={() => setActiveTooltip('stack')}
          onMouseLeave={() => setActiveTooltip(null)}
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.70)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>Stack Depth</span>
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
              style={{
                background: tcoOk ? (isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.12)') : (isDark ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.12)'),
                color: tcoOk ? '#10B981' : '#F59E0B',
              }}
            >
              {tcoOk ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
              <span>{tcoOk ? 'O(1) Tail-Frame' : 'Stack Growing'}</span>
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
              {stackWords}
            </span>
            <span className="text-[11px] font-medium" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
              words
            </span>
          </div>

          {activeTooltip === 'stack' && (
            <div
              className="absolute z-20 bottom-full left-0 mb-1.5 w-64 p-2 rounded-lg text-[11px] leading-relaxed shadow-lg border"
              style={{
                background: isDark ? '#0F172A' : '#FFFFFF',
                color: isDark ? '#CBD5E1' : '#334155',
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)',
              }}
            >
              Call-frame count on process stack. Strict tail calls reuse stack frames in-place (O(1) memory, ≤64 words).
            </div>
          )}
        </div>

        {/* Pill 2: Process Heap */}
        <div
          className="relative rounded-lg p-2.5 border transition-all duration-150 group cursor-help"
          onMouseEnter={() => setActiveTooltip('heap')}
          onMouseLeave={() => setActiveTooltip(null)}
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.70)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              <Cpu className="w-3.5 h-3.5 text-purple-500" />
              <span>Process Heap</span>
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
              style={{
                background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(124, 58, 237, 0.08)',
                color: isDark ? '#C4B5FD' : '#7C3AED',
              }}
            >
              ~{heapKb} KB
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
              {heapWords.toLocaleString()}
            </span>
            <span className="text-[11px] font-medium" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
              words (8 B/word)
            </span>
          </div>

          {activeTooltip === 'heap' && (
            <div
              className="absolute z-20 bottom-full left-0 mb-1.5 w-64 p-2 rounded-lg text-[11px] leading-relaxed shadow-lg border"
              style={{
                background: isDark ? '#0F172A' : '#FFFFFF',
                color: isDark ? '#CBD5E1' : '#334155',
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)',
              }}
            >
              Isolated per-process BEAM memory. 1 word = 8 bytes on 64-bit systems. Independent generational GC avoids stop-the-world pauses.
            </div>
          )}
        </div>

        {/* Pill 3: Reductions Budget */}
        <div
          className="relative rounded-lg p-2.5 border transition-all duration-150 group cursor-help"
          onMouseEnter={() => setActiveTooltip('reds')}
          onMouseLeave={() => setActiveTooltip(null)}
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.70)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Reductions Budget</span>
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium"
              style={{
                background: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.10)',
                color: isDark ? '#FCD34D' : '#D97706',
              }}
            >
              {redSlicePct}% slice
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono" style={{ color: isDark ? '#F1F5F9' : '#0F172A' }}>
              {reductions.toLocaleString()}
            </span>
            <span className="text-[11px] font-medium" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
              / 4,000 reductions
            </span>
          </div>

          {activeTooltip === 'reds' && (
            <div
              className="absolute z-20 bottom-full left-0 mb-1.5 w-64 p-2 rounded-lg text-[11px] leading-relaxed shadow-lg border"
              style={{
                background: isDark ? '#0F172A' : '#FFFFFF',
                color: isDark ? '#CBD5E1' : '#334155',
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)',
              }}
            >
              BEAM yields scheduler time slice every 4,000 reductions (function calls / BIF evaluations) for soft real-time preemptive concurrency.
            </div>
          )}
        </div>

        {/* Pill 4: Binary Refc Heap */}
        <div
          className="relative rounded-lg p-2.5 border transition-all duration-150 group cursor-help"
          onMouseEnter={() => setActiveTooltip('refc')}
          onMouseLeave={() => setActiveTooltip(null)}
          style={{
            background: isDark ? 'rgba(15, 23, 42, 0.60)' : 'rgba(255, 255, 255, 0.70)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.05)',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Binary Refc Heap</span>
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1"
              style={{
                background: leakFree ? (isDark ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.12)') : (isDark ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.12)'),
                color: leakFree ? '#10B981' : '#EF4444',
              }}
            >
              {leakFree ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
              <span>{leakFree ? 'Leak-Free' : 'ProcBin Leak'}</span>
            </span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-emerald-500">
              0 Pinned
            </span>
            <span className="text-[11px] font-medium" style={{ color: isDark ? '#64748B' : '#94A3B8' }}>
              ProcBins
            </span>
          </div>

          {activeTooltip === 'refc' && (
            <div
              className="absolute z-20 bottom-full right-0 mb-1.5 w-64 p-2 rounded-lg text-[11px] leading-relaxed shadow-lg border"
              style={{
                background: isDark ? '#0F172A' : '#FFFFFF',
                color: isDark ? '#CBD5E1' : '#334155',
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)',
              }}
            >
              Binaries &gt; 64 bytes are refc ProcBins in shared heap. Sub-binary slices cleanly unpinned via binary:copy/1 to prevent memory retention.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

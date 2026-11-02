'use client';

import React, { useState } from 'react';
import { AlertTriangle, Activity, Wrench, ChevronDown, ChevronUp, Radio } from 'lucide-react';
import { IncidentAlert } from '../../types/workspace';

interface IncidentAlertBannerProps {
  alert?: IncidentAlert;
  isDark?: boolean;
}

export function IncidentAlertBanner({ alert, isDark = true }: IncidentAlertBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!alert) return null;

  const incidentId = alert.incidentId || alert.id || 'INC-001';
  const severity = alert.severity || 'CRITICAL';
  const isCritical = severity.includes('CRITICAL');
  const serviceName = alert.serviceName || alert.service || 'BeamForge Core';
  const symptom = alert.symptom;
  const clue = alert.rootCauseHint || alert.diagnosticClue;
  const objective = alert.fixObjective || alert.recommendedAction;

  return (
    <div
      id={`incident-alert-${incidentId}`}
      className="mb-4 rounded-xl overflow-hidden transition-all duration-300 shadow-lg"
      style={{
        background: isDark
          ? (isCritical
              ? 'linear-gradient(135deg, rgba(225, 29, 72, 0.18) 0%, rgba(15, 23, 42, 0.85) 100%)'
              : 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(15, 23, 42, 0.85) 100%)')
          : (isCritical
              ? 'linear-gradient(135deg, rgba(254, 226, 226, 0.95) 0%, rgba(255, 241, 242, 0.90) 100%)'
              : 'linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(255, 251, 235, 0.90) 100%)'),
        border: isDark
          ? (isCritical ? '1px solid rgba(244, 63, 94, 0.40)' : '1px solid rgba(245, 158, 11, 0.40)')
          : (isCritical ? '1px solid rgba(239, 68, 68, 0.50)' : '1px solid rgba(245, 158, 11, 0.50)'),
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Top Banner Header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          borderBottom: isExpanded
            ? (isDark
                ? (isCritical ? '1px solid rgba(244, 63, 94, 0.20)' : '1px solid rgba(245, 158, 11, 0.20)')
                : (isCritical ? '1px solid rgba(239, 68, 68, 0.20)' : '1px solid rgba(245, 158, 11, 0.20)'))
            : 'none',
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 animate-pulse"
            style={{
              background: isCritical
                ? (isDark ? 'rgba(244, 63, 94, 0.25)' : 'rgba(239, 68, 68, 0.15)')
                : (isDark ? 'rgba(245, 158, 11, 0.25)' : 'rgba(245, 158, 11, 0.15)'),
              color: isCritical ? '#F43F5E' : '#F59E0B',
            }}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-black tracking-wider uppercase flex items-center gap-1.5"
                style={{ color: isCritical ? (isDark ? '#FDA4AF' : '#BE123C') : (isDark ? '#FDE68A' : '#B45309') }}
              >
                <Radio className="w-3 h-3 animate-ping" />
                PRODUCTION INCIDENT #{incidentId}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                style={{
                  background: isCritical
                    ? (isDark ? 'rgba(225, 29, 72, 0.30)' : 'rgba(239, 68, 68, 0.15)')
                    : (isDark ? 'rgba(245, 158, 11, 0.30)' : 'rgba(245, 158, 11, 0.15)'),
                  color: isCritical ? (isDark ? '#FF8096' : '#DC2626') : (isDark ? '#FBBF24' : '#D97706'),
                  border: isCritical ? '1px solid rgba(244, 63, 94, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
                }}
              >
                {severity}
              </span>
              <span
                className="text-xs font-mono font-medium truncate"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}
              >
                Service: <strong className="font-semibold text-slate-200 dark:text-slate-100">{serviceName}</strong>
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label={isExpanded ? 'Collapse incident details' : 'Expand incident details'}
          className="p-1 rounded hover:bg-slate-500/10 transition-colors ml-2 text-slate-400"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Diagnostic Rows */}
      {isExpanded && (
        <div className="p-3.5 space-y-2.5 text-xs">
          {/* Row 1: PagerDuty Symptom */}
          <div
            className="p-2.5 rounded-lg flex items-start gap-2.5"
            style={{
              background: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.85)',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.06)',
            }}
          >
            <div className="mt-0.5 text-rose-400 flex-shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="font-bold uppercase tracking-wider text-[10px] text-rose-500 dark:text-rose-400 block mb-0.5">
                PagerDuty Symptom
              </span>
              <p className="leading-relaxed" style={{ color: isDark ? '#E2E8F0' : '#1E293B' }}>
                {symptom}
              </p>
            </div>
          </div>

          {/* Row 2: BEAM Telemetry Clue */}
          {clue && (
            <div
              className="p-2.5 rounded-lg flex items-start gap-2.5"
              style={{
                background: isDark ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.85)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(15, 23, 42, 0.06)',
              }}
            >
              <div className="mt-0.5 text-amber-400 flex-shrink-0">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-bold uppercase tracking-wider text-[10px] text-amber-500 dark:text-amber-400 block mb-0.5">
                  BEAM Telemetry Clue
                </span>
                <p className="leading-relaxed font-mono text-[11px]" style={{ color: isDark ? '#FDE68A' : '#78350F' }}>
                  {clue}
                </p>
              </div>
            </div>
          )}

          {/* Row 3: Your Triage & Fix Objective */}
          {objective && (
            <div
              className="p-2.5 rounded-lg flex items-start gap-2.5"
              style={{
                background: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)',
                border: isDark ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(16, 185, 129, 0.20)',
              }}
            >
              <div className="mt-0.5 text-emerald-400 flex-shrink-0">
                <Wrench className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-500 dark:text-emerald-400 block mb-0.5">
                  Your Triage &amp; Fix Objective
                </span>
                <p className="leading-relaxed font-medium" style={{ color: isDark ? '#D1FAE5' : '#065F46' }}>
                  {objective}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

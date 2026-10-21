'use client';

import React from 'react';
import { useWorkspaceStore } from '../../state/useWorkspaceStore';

interface BeamForgeLogoProps {
  size?: number;
  variant?: 'app' | 'glyph';
  className?: string;
  forceDark?: boolean;
}

export const BeamForgeLogo: React.FC<BeamForgeLogoProps> = ({
  size = 28,
  variant = 'app',
  className = '',
  forceDark,
}) => {
  const storeTheme = useWorkspaceStore((s) => s.theme);
  const isDark = forceDark !== undefined ? forceDark : storeTheme === 'dark';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="BeamForge Logo"
    >
      <defs>
        {/* Dark Mode Squircle Gradient */}
        <linearGradient id="bf-bg-dark" x1="16" y1="8" x2="112" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="50%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#090D16" />
        </linearGradient>

        {/* Light Mode Squircle Gradient (Daylight Frosted Glass) */}
        <linearGradient id="bf-bg-light" x1="16" y1="8" x2="112" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#F8FAFC" />
          <stop offset="100%" stopColor="#EEF2F6" />
        </linearGradient>

        {/* Ambient Core Glow */}
        <radialGradient id="bf-glow" cx="64" cy="54" r="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity={isDark ? 0.35 : 0.22} />
          <stop offset="45%" stopColor="#38BDF8" stopOpacity={isDark ? 0.25 : 0.15} />
          <stop offset="80%" stopColor="#8B5CF6" stopOpacity={isDark ? 0.15 : 0.08} />
          <stop offset="100%" stopColor={isDark ? '#000000' : '#FFFFFF'} stopOpacity="0" />
        </radialGradient>

        {/* Specular Rim Highlight */}
        <linearGradient id="bf-rim-dark" x1="64" y1="6" x2="64" y2="122" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.04" />
        </linearGradient>

        <linearGradient id="bf-rim-light" x1="64" y1="6" x2="64" y2="122" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#007AFF" stopOpacity="0.30" />
          <stop offset="40%" stopColor="#CBD5E1" stopOpacity="0.40" />
          <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.20" />
        </linearGradient>

        {/* Multi-stop BEAM & Forge gradient */}
        <linearGradient id="bf-beam-grad" x1="28" y1="28" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="35%" stopColor="#818CF8" />
          <stop offset="68%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
      </defs>

      {/* 1. iOS Glass Squircle Base (rendered for 'app' variant) */}
      {variant === 'app' && (
        <>
          <rect
            x="6"
            y="6"
            width="116"
            height="116"
            rx="28"
            fill={isDark ? 'url(#bf-bg-dark)' : 'url(#bf-bg-light)'}
          />
          <rect
            x="6"
            y="6"
            width="116"
            height="116"
            rx="28"
            fill="url(#bf-glow)"
          />
          <rect
            x="6.75"
            y="6.75"
            width="114.5"
            height="114.5"
            rx="27.25"
            stroke={isDark ? 'url(#bf-rim-dark)' : 'url(#bf-rim-light)'}
            strokeWidth="1.5"
          />
        </>
      )}

      {/* 2. Translucent OTP Supervisor Hexagon */}
      <polygon
        points="64,22 100,43 100,85 64,106 28,85 28,43"
        fill={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,122,255,0.04)'}
        stroke="url(#bf-beam-grad)"
        strokeWidth={variant === 'glyph' ? 4 : 3.5}
        strokeLinejoin="round"
      />

      {/* 3. The Refracting BEAM & Linked Actor Pulse */}
      <path
        d="M28 64H52L66 40L58 88L74 64H100"
        stroke={isDark ? '#FFFFFF' : '#0F172A'}
        strokeWidth={variant === 'glyph' ? 5.5 : 5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 4. Forge Ignition Spark (Apex) */}
      <circle
        cx="66"
        cy="40"
        r="3.5"
        fill="#F59E0B"
      />

      {/* 5. Process PID Nodes (Input Cyan, Output Emerald) */}
      <circle
        cx="28"
        cy="64"
        r={variant === 'glyph' ? 5 : 5.5}
        fill="#38BDF8"
        stroke={isDark ? '#090D16' : '#FFFFFF'}
        strokeWidth="2"
      />
      <circle
        cx="100"
        cy="64"
        r={variant === 'glyph' ? 5 : 5.5}
        fill="#10B981"
        stroke={isDark ? '#090D16' : '#FFFFFF'}
        strokeWidth="2"
      />
    </svg>
  );
};

'use client';

import React from 'react';
import {
  Cpu,
  GitBranch,
  Mail,
  Shield,
  Binary,
  Zap,
  User,
} from 'lucide-react';
import { UserProfile } from '../../types/user';

export interface BeamAvatarPreset {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  bg: string;
}

export const PRESET_BEAM_AVATARS: BeamAvatarPreset[] = [
  { id: 'beam-node', name: 'BEAM Node', icon: Cpu, color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' },
  { id: 'supervisor', name: 'OTP Supervisor', icon: GitBranch, color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' },
  { id: 'actor-mailbox', name: 'Actor Mailbox', icon: Mail, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' },
  { id: 'nine-nines', name: 'Nine Nines', icon: Shield, color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
  { id: 'bytecode', name: 'Bytecode Engine', icon: Binary, color: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)' },
  { id: 'concurrency', name: 'Actor Core', icon: Zap, color: '#EAB308', bg: 'rgba(234, 179, 8, 0.15)' },
];

export interface UserAvatarProps {
  user?: UserProfile | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  shape?: 'rounded' | 'circle';
}

const SIZE_CONFIG = {
  xs: { container: 'w-4 h-4', icon: 'w-2.5 h-2.5', text: 'text-[9px]' },
  sm: { container: 'w-6 h-6', icon: 'w-3.5 h-3.5', text: 'text-[10px]' },
  md: { container: 'w-8 h-8', icon: 'w-4 h-4', text: 'text-xs' },
  lg: { container: 'w-10 h-10', icon: 'w-5 h-5', text: 'text-sm' },
  xl: { container: 'w-16 h-16 sm:w-20 sm:h-20', icon: 'w-8 h-8 sm:w-10 sm:h-10', text: 'text-xl' },
};

export function UserAvatar({
  user,
  size = 'md',
  className = '',
  shape = 'circle',
}: UserAvatarProps) {
  const cfg = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  // Check if a custom BEAM avatar is explicitly selected
  const customPreset = PRESET_BEAM_AVATARS.find((a) => a.id === user?.customAvatarId);

  if (customPreset) {
    const IconComponent = customPreset.icon;
    return (
      <div
        className={`${cfg.container} ${roundedClass} flex items-center justify-center flex-shrink-0 overflow-hidden ${className}`}
        style={{ background: customPreset.bg }}
        title={customPreset.name}
      >
        <IconComponent className={cfg.icon} style={{ color: customPreset.color }} />
      </div>
    );
  }

  // Next, if user has an OAuth/Google avatar image URL
  if (user?.avatarUrl) {
    return (
      <div className={`${cfg.container} ${roundedClass} flex-shrink-0 overflow-hidden ${className}`}>
        <img
          src={user.avatarUrl}
          alt={user?.name || 'User Avatar'}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Fallback: Initial or default icon
  if (user && !user.isGuest && user.id !== 'guest') {
    const initial = user.name ? user.name.trim()[0].toUpperCase() : 'U';
    return (
      <div
        className={`${cfg.container} ${roundedClass} flex items-center justify-center font-bold text-white flex-shrink-0 shadow-xs ${cfg.text} ${className}`}
        style={{ background: user.avatarColor || '#3B82F6' }}
        title={user.name}
      >
        {initial}
      </div>
    );
  }

  // Guest fallback
  return (
    <div
      className={`${cfg.container} ${roundedClass} bg-slate-400/20 dark:bg-slate-500/20 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0 ${className}`}
      title="Guest Profile"
    >
      <User className={cfg.icon} />
    </div>
  );
}

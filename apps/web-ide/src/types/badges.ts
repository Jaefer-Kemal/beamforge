import { UserProfile } from './user';

export type BadgeRarity = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'mythic' | 'special';

export interface Badge {
  id: string;
  title: string;
  description: string;
  criteria: string;
  rarity: BadgeRarity;
  iconName: string;
  category: 'chapter' | 'streak' | 'incident' | 'mastery';
  chapterNumber?: number;
}

export const BADGE_CATALOG: Badge[] = [
  {
    id: 'badge_ch01',
    title: 'Functional Pioneer',
    description: 'Mastered immutable data, single assignment (=), pattern matching, and the punctuation triad (, ; .).',
    criteria: 'Complete Chapter 1: Functional Foundations',
    rarity: 'bronze',
    iconName: 'Sparkles',
    category: 'chapter',
    chapterNumber: 1,
  },
  {
    id: 'badge_ch02',
    title: 'Tail-Call Master',
    description: 'Mastered guards, body recursion vs TCO, list accumulators, and the complete inventory order processor.',
    criteria: 'Complete Chapter 2: Control Flow & Recursion',
    rarity: 'bronze',
    iconName: 'RotateCcw',
    category: 'chapter',
    chapterNumber: 2,
  },
  {
    id: 'badge_ch03',
    title: 'Higher-Order Crafter',
    description: 'Mastered first-class closures, folding, filtering, partitions, and list comprehensions.',
    criteria: 'Complete Chapter 3: Higher-Order Functions',
    rarity: 'silver',
    iconName: 'Layers',
    category: 'chapter',
    chapterNumber: 3,
  },
  {
    id: 'badge_ch04',
    title: 'Binary Protocol Slicer',
    description: 'Mastered maps, compile-time records, UTF-8 binaries, and zero-copy bit syntax protocol packing.',
    criteria: 'Complete Chapter 4: Maps, Records & Binaries',
    rarity: 'silver',
    iconName: 'Cpu',
    category: 'chapter',
    chapterNumber: 4,
  },
  {
    id: 'badge_ch05',
    title: 'Actor Whisperer',
    description: 'Mastered lightweight BEAM processes, asynchronous send (!), selective receive, and stateful actor loops.',
    criteria: 'Complete Chapter 5: Concurrency & Actor Model',
    rarity: 'silver',
    iconName: 'Zap',
    category: 'chapter',
    chapterNumber: 5,
  },
  {
    id: 'badge_ch06',
    title: 'Let It Crash Sentinel',
    description: 'Mastered process links, unidirectional monitors, demonitor flush hygiene, and built my_gen_server from scratch.',
    criteria: 'Complete Chapter 6: Links, Monitors & my_gen_server',
    rarity: 'gold',
    iconName: 'ShieldAlert',
    category: 'chapter',
    chapterNumber: 6,
  },
  {
    id: 'badge_ch07',
    title: 'OTP Architect',
    description: 'Mastered gen_server, gen_statem state machines, non-blocking handle_continue, and sys:get_state introspection.',
    criteria: 'Complete Chapter 7: OTP Core Behaviours',
    rarity: 'gold',
    iconName: 'Server',
    category: 'chapter',
    chapterNumber: 7,
  },
  {
    id: 'badge_ch08',
    title: 'Supervisor Guardian',
    description: 'Mastered supervision hierarchies, restart strategies (one_for_all, rest_for_one), and restart blizzards.',
    criteria: 'Complete Chapter 8: Supervision Trees',
    rarity: 'gold',
    iconName: 'GitFork',
    category: 'chapter',
    chapterNumber: 8,
  },
  {
    id: 'badge_ch09',
    title: 'ETS Speed Demon',
    description: 'Mastered off-heap ETS concurrent tables, heir failover handshakes, and distributed Mnesia transactions.',
    criteria: 'Complete Chapter 9: ETS & Distributed Systems',
    rarity: 'platinum',
    iconName: 'Database',
    category: 'chapter',
    chapterNumber: 9,
  },
  {
    id: 'badge_ch10',
    title: 'TCP Backpressure King',
    description: 'Mastered gen_tcp listening, {active, once} socket flow control, and concurrent acceptor pools.',
    criteria: 'Complete Chapter 10: Raw TCP Backends',
    rarity: 'platinum',
    iconName: 'Network',
    category: 'chapter',
    chapterNumber: 10,
  },
  {
    id: 'badge_ch11',
    title: 'XMPP Protocol Champion',
    description: 'Mastered RFC 6120/7622 XML element stream parsing, C2S handshake FSM, and priority routing.',
    criteria: 'Complete Chapter 11: Guided XMPP Protocol',
    rarity: 'diamond',
    iconName: 'Radio',
    category: 'chapter',
    chapterNumber: 11,
  },
  {
    id: 'badge_ch12',
    title: 'BEAM Grandmaster',
    description: 'Architected and verified the complete 5-module production XMPP Server Capstone under live chaos injection.',
    criteria: 'Complete Chapter 12: Final Capstone Studio',
    rarity: 'mythic',
    iconName: 'Award',
    category: 'chapter',
    chapterNumber: 12,
  },
  {
    id: 'badge_streak_7d',
    title: 'Daily Flame (7-Day Streak)',
    description: 'Maintained an unbroken 7-day practice streak of solving Erlang/OTP challenges.',
    criteria: 'Achieve a consecutive 7-day active streak',
    rarity: 'special',
    iconName: 'Flame',
    category: 'streak',
  },
  {
    id: 'badge_incident_hero',
    title: 'Production Incident Responder',
    description: 'Triaged and repaired a live high-severity production outage under time pressure.',
    criteria: 'Solve any Production Incident Triage challenge',
    rarity: 'special',
    iconName: 'AlertTriangle',
    category: 'incident',
  },
];

export const CHAPTER_FINAL_LESSON_IDS: Record<number, string> = {
  1: 'ch01-l08',
  2: 'ch02-l08',
  3: 'ch03-l07',
  4: 'ch04-l08',
  5: 'ch05-l08',
  6: 'ch06-l10',
  7: 'ch07-l08',
  8: 'ch08-l07',
  9: 'ch09-l08',
  10: 'ch10-l07',
  11: 'ch11-l08',
  12: 'ch12-m6',
};

// Check if a badge is unlocked for a given user
export function isBadgeUnlocked(
  badge: Badge,
  user: UserProfile,
  completedLevelIds: string[]
): boolean {
  const ids = (completedLevelIds && completedLevelIds.length > 0)
    ? completedLevelIds
    : (user?.completedLevelIds || []);

  if (badge.category === 'chapter' && badge.chapterNumber) {
    const ch = badge.chapterNumber;
    const finalLessonId = CHAPTER_FINAL_LESSON_IDS[ch];
    if (ch === 12) {
      return ids.includes('ch12-m6') || ids.includes('ch12-capstone');
    }
    return Boolean(finalLessonId && ids.includes(finalLessonId));
  }

  if (badge.id === 'badge_streak_7d') {
    return (user?.streakDays || 1) >= 7;
  }

  if (badge.id === 'badge_incident_hero') {
    const incidentIds = [
      'ch05-l07',
      'ch06-l09',
      'ch07-l07',
      'ch08-l06',
      'ch09-l07',
      'ch10-l06',
      'ch11-l07',
    ];
    return ids.some((id) => incidentIds.includes(id));
  }

  return false;
}

// Get all badges categorized for user
export function getUserBadgesSummary(user: UserProfile, completedLevelIds: string[]) {
  const unlocked: Badge[] = [];
  const locked: Badge[] = [];

  BADGE_CATALOG.forEach((b) => {
    if (isBadgeUnlocked(b, user, completedLevelIds)) {
      unlocked.push(b);
    } else {
      locked.push(b);
    }
  });

  return {
    unlocked,
    locked,
    total: BADGE_CATALOG.length,
    unlockedCount: unlocked.length,
    percentage: Math.round((unlocked.length / BADGE_CATALOG.length) * 100),
  };
}

// Visual style tokens by Rarity
export const RARITY_STYLES: Record<
  BadgeRarity,
  {
    name: string;
    border: string;
    bg: string;
    text: string;
    glow: string;
    badgePill: string;
  }
> = {
  bronze: {
    name: 'Bronze',
    border: 'rgba(217, 119, 6, 0.45)',
    bg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(180, 83, 9, 0.08) 100%)',
    text: '#F59E0B',
    glow: '0 0 20px rgba(217, 119, 6, 0.25)',
    badgePill: 'bg-amber-600/20 text-amber-500 border border-amber-600/40',
  },
  silver: {
    name: 'Silver',
    border: 'rgba(148, 163, 184, 0.45)',
    bg: 'linear-gradient(135deg, rgba(148, 163, 184, 0.18) 0%, rgba(100, 116, 139, 0.08) 100%)',
    text: '#E2E8F0',
    glow: '0 0 20px rgba(148, 163, 184, 0.25)',
    badgePill: 'bg-slate-400/20 text-slate-300 border border-slate-400/40',
  },
  gold: {
    name: 'Gold',
    border: 'rgba(234, 179, 8, 0.55)',
    bg: 'linear-gradient(135deg, rgba(234, 179, 8, 0.20) 0%, rgba(202, 138, 4, 0.10) 100%)',
    text: '#FACC15',
    glow: '0 0 24px rgba(234, 179, 8, 0.35)',
    badgePill: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
  },
  platinum: {
    name: 'Platinum',
    border: 'rgba(56, 189, 248, 0.55)',
    bg: 'linear-gradient(135deg, rgba(56, 189, 248, 0.20) 0%, rgba(14, 165, 233, 0.10) 100%)',
    text: '#38BDF8',
    glow: '0 0 24px rgba(56, 189, 248, 0.35)',
    badgePill: 'bg-sky-500/20 text-sky-400 border border-sky-500/40',
  },
  diamond: {
    name: 'Diamond',
    border: 'rgba(168, 85, 247, 0.60)',
    bg: 'linear-gradient(135deg, rgba(168, 85, 247, 0.22) 0%, rgba(147, 51, 234, 0.12) 100%)',
    text: '#C084FC',
    glow: '0 0 28px rgba(168, 85, 247, 0.40)',
    badgePill: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
  },
  mythic: {
    name: 'Mythic',
    border: 'rgba(244, 63, 94, 0.65)',
    bg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.25) 0%, rgba(168, 85, 247, 0.20) 100%)',
    text: '#FB7185',
    glow: '0 0 32px rgba(244, 63, 94, 0.45)',
    badgePill: 'bg-rose-500/20 text-rose-300 border border-rose-500/40',
  },
  special: {
    name: 'Special',
    border: 'rgba(249, 115, 22, 0.55)',
    bg: 'linear-gradient(135deg, rgba(249, 115, 22, 0.20) 0%, rgba(239, 68, 68, 0.10) 100%)',
    text: '#FB923C',
    glow: '0 0 24px rgba(249, 115, 22, 0.35)',
    badgePill: 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
  },
};

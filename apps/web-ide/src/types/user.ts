export interface UserProfile {
  id: string;
  name: string;
  role: string;
  level: number;
  avatarColor: string;
  bio: string;
  completedLevelIds: string[];
  totalXp: number;
  unlockedSolutionLessonIds: string[];
  lastActiveExercise: string;
  streakDays: number;
  lastActivityDate?: string;
}

export const DEFAULT_USERS: Record<string, UserProfile> = {
  user_alpha: {
    id: 'user_alpha',
    name: 'Alpha Tester',
    role: 'BEAM Explorer (Junior)',
    level: 1,
    avatarColor: '#3B82F6', // Blue
    bio: 'Fresh recruit tackling Erlang functional syntax and immutable pattern matching.',
    completedLevelIds: [],
    totalXp: 0,
    unlockedSolutionLessonIds: [],
    lastActiveExercise: 'ch01-l01',
    streakDays: 1,
  },
  user_beta: {
    id: 'user_beta',
    name: 'Beta Learner',
    role: 'Actor Architect (Intermediate)',
    level: 5,
    avatarColor: '#8B5CF6', // Purple
    bio: 'Intermediate developer implementing supervision trees, link/monitor traps, and gen_servers.',
    completedLevelIds: [
      'ch01-l01', 'ch01-l02', 'ch01-l03', 'ch01-l04', 'ch01-l05', 'ch01-l06', 'ch01-l07', 'ch01-l08',
      'ch02-l01', 'ch02-l02', 'ch02-l03', 'ch02-l04', 'ch02-l05', 'ch02-l06', 'ch02-l07', 'ch02-l08',
      'ch03-l01', 'ch03-l02', 'ch03-l03', 'ch03-l04', 'ch03-l05', 'ch03-l06', 'ch03-l07',
      'ch04-l01', 'ch04-l02', 'ch04-l03', 'ch04-l04', 'ch04-l05', 'ch04-l06', 'ch04-l07', 'ch04-l08',
      'ch05-l01', 'ch05-l02', 'ch05-l03', 'ch05-l04', 'ch05-l05', 'ch05-l06', 'ch05-l07',
    ],
    totalXp: 1450,
    unlockedSolutionLessonIds: ['ch02-l08'],
    lastActiveExercise: 'ch06-l01',
    streakDays: 4,
  },
  user_master: {
    id: 'user_master',
    name: 'BEAM Master',
    role: 'Telecom Principal (Senior)',
    level: 12,
    avatarColor: '#10B981', // Emerald
    bio: 'Senior systems engineer building distributed XMPP RFC 6120 clusters with zero downtime.',
    completedLevelIds: [
      // Chapters 1 to 11 full completion
      'ch01-l01', 'ch01-l02', 'ch01-l03', 'ch01-l04', 'ch01-l05', 'ch01-l06', 'ch01-l07', 'ch01-l08',
      'ch02-l01', 'ch02-l02', 'ch02-l03', 'ch02-l04', 'ch02-l05', 'ch02-l06', 'ch02-l07', 'ch02-l08',
      'ch03-l01', 'ch03-l02', 'ch03-l03', 'ch03-l04', 'ch03-l05', 'ch03-l06', 'ch03-l07',
      'ch04-l01', 'ch04-l02', 'ch04-l03', 'ch04-l04', 'ch04-l05', 'ch04-l06', 'ch04-l07', 'ch04-l08',
      'ch05-l01', 'ch05-l02', 'ch05-l03', 'ch05-l04', 'ch05-l05', 'ch05-l06', 'ch05-l07',
      'ch06-l01', 'ch06-l02', 'ch06-l03', 'ch06-l04', 'ch06-l05', 'ch06-l06', 'ch06-l07', 'ch06-l08', 'ch06-l09', 'ch06-l10',
      'ch07-l01', 'ch07-l02', 'ch07-l03', 'ch07-l04', 'ch07-l05', 'ch07-l06', 'ch07-l07', 'ch07-l08',
      'ch08-l01', 'ch08-l02', 'ch08-l03', 'ch08-l04', 'ch08-l05', 'ch08-l06', 'ch08-l07',
      'ch09-l01', 'ch09-l02', 'ch09-l03', 'ch09-l04', 'ch09-l05', 'ch09-l06', 'ch09-l07', 'ch09-l08',
      'ch10-l01', 'ch10-l02', 'ch10-l03', 'ch10-l04', 'ch10-l05', 'ch10-l06', 'ch10-l07',
      'ch11-l01', 'ch11-l02', 'ch11-l03', 'ch11-l04', 'ch11-l05', 'ch11-l06', 'ch11-l07', 'ch11-l08',
      'ch12-l01', 'ch12-l02', 'ch12-l03',
    ],
    totalXp: 4200,
    unlockedSolutionLessonIds: ['ch06-l10', 'ch09-l08'],
    lastActiveExercise: 'ch12-l04',
    streakDays: 14,
  },
};


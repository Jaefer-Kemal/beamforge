-- BeamForge Neon Serverless Postgres Schema
-- Provides progression and state persistence for the 3 test users

CREATE TABLE IF NOT EXISTS beamforge_users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  role VARCHAR(128) NOT NULL,
  level INT DEFAULT 1,
  total_xp INT DEFAULT 0,
  completed_level_ids JSONB DEFAULT '[]'::jsonb,
  unlocked_solution_lesson_ids JSONB DEFAULT '[]'::jsonb,
  last_active_exercise VARCHAR(128) DEFAULT 'ch01-l01',
  streak_days INT DEFAULT 1,
  last_activity_date VARCHAR(32),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial test users: user_alpha starts at pure scratch (0 XP, 0 completed levels)
INSERT INTO beamforge_users (
  id, name, role, level, total_xp, completed_level_ids, unlocked_solution_lesson_ids, last_active_exercise, streak_days
) VALUES
  (
    'user_alpha',
    'Alpha Tester',
    'BEAM Explorer (Junior)',
    1,
    0,
    '[]'::jsonb,
    '[]'::jsonb,
    'ch01-l01',
    1
  ),
  (
    'user_beta',
    'Beta Learner',
    'Actor Architect (Intermediate)',
    5,
    1450,
    '["ch01-l01", "ch01-l02", "ch01-l03", "ch01-l04", "ch01-l05", "ch01-l06", "ch01-l07", "ch01-l08", "ch02-l01", "ch02-l02", "ch02-l03", "ch02-l04", "ch02-l05", "ch02-l06", "ch02-l07", "ch02-l08", "ch03-l01", "ch03-l02", "ch03-l03", "ch03-l04", "ch03-l05", "ch03-l06", "ch03-l07", "ch04-l01", "ch04-l02", "ch04-l03", "ch04-l04", "ch04-l05", "ch04-l06", "ch04-l07", "ch04-l08", "ch05-l01", "ch05-l02", "ch05-l03", "ch05-l04", "ch05-l05", "ch05-l06", "ch05-l07"]'::jsonb,
    '["ch02-l08"]'::jsonb,
    'ch06-l01',
    4
  ),
  (
    'user_master',
    'BEAM Master',
    'Telecom Principal (Senior)',
    12,
    4200,
    '["ch01-l01", "ch01-l02", "ch01-l03", "ch01-l04", "ch01-l05", "ch01-l06", "ch01-l07", "ch01-l08", "ch02-l01", "ch02-l02", "ch02-l03", "ch02-l04", "ch02-l05", "ch02-l06", "ch02-l07", "ch02-l08", "ch03-l01", "ch03-l02", "ch03-l03", "ch03-l04", "ch03-l05", "ch03-l06", "ch03-l07", "ch04-l01", "ch04-l02", "ch04-l03", "ch04-l04", "ch04-l05", "ch04-l06", "ch04-l07", "ch04-l08", "ch05-l01", "ch05-l02", "ch05-l03", "ch05-l04", "ch05-l05", "ch05-l06", "ch05-l07", "ch06-l01", "ch06-l02", "ch06-l03", "ch06-l04", "ch06-l05", "ch06-l06", "ch06-l07", "ch06-l08", "ch06-l09", "ch06-l10", "ch07-l01", "ch07-l02", "ch07-l03", "ch07-l04", "ch07-l05", "ch07-l06", "ch07-l07", "ch07-l08", "ch08-l01", "ch08-l02", "ch08-l03", "ch08-l04", "ch08-l05", "ch08-l06", "ch08-l07", "ch09-l01", "ch09-l02", "ch09-l03", "ch09-l04", "ch09-l05", "ch09-l06", "ch09-l07", "ch09-l08", "ch10-l01", "ch10-l02", "ch10-l03", "ch10-l04", "ch10-l05", "ch10-l06", "ch10-l07", "ch11-l01", "ch11-l02", "ch11-l03", "ch11-l04", "ch11-l05", "ch11-l06", "ch11-l07", "ch11-l08", "ch12-l01", "ch12-l02", "ch12-l03"]'::jsonb,
    '["ch06-l10", "ch09-l08"]'::jsonb,
    'ch12-l04',
    14
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  level = EXCLUDED.level,
  total_xp = EXCLUDED.total_xp,
  completed_level_ids = EXCLUDED.completed_level_ids,
  unlocked_solution_lesson_ids = EXCLUDED.unlocked_solution_lesson_ids,
  last_active_exercise = EXCLUDED.last_active_exercise,
  streak_days = EXCLUDED.streak_days,
  updated_at = NOW();

import { neon } from '../apps/web-ide/node_modules/@neondatabase/serverless/index.mjs';
import fs from 'fs';
import path from 'path';

// Read DATABASE_URL from apps/web-ide/.env.local
const envPath = path.resolve('apps/web-ide/.env.local');
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DATABASE_URL=')) {
      dbUrl = trimmed.substring('DATABASE_URL='.length).trim();
      break;
    }
  }
}

if (!dbUrl) {
  console.error('DATABASE_URL not found in environment or apps/web-ide/.env.local');
  process.exit(1);
}

const sql = neon(dbUrl);

async function runSeed() {
  console.log('🌱 Seeding Neon Database...');
  
  // 1. Create table
  await sql`
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
  `;
  console.log('✓ Table beamforge_users ready.');

  // 2. Seed/Update user_alpha (0 XP, pure scratch)
  await sql`
    INSERT INTO beamforge_users (
      id, name, role, level, total_xp, completed_level_ids, unlocked_solution_lesson_ids, last_active_exercise, streak_days
    ) VALUES (
      'user_alpha', 'Alpha Tester', 'BEAM Newcomer', 1, 0, '[]'::jsonb, '[]'::jsonb, 'ch01-l01', 1
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
  `;
  console.log('✓ user_alpha seeded from scratch (0 XP, [] levels).');

  // 3. Seed/Update user_beta (Intermediate 1450 XP)
  await sql`
    INSERT INTO beamforge_users (
      id, name, role, level, total_xp, completed_level_ids, unlocked_solution_lesson_ids, last_active_exercise, streak_days
    ) VALUES (
      'user_beta', 'Beta Learner', 'Concurrency Artisan', 4, 1450,
      '["ch01-l01", "ch01-l02", "ch01-l03", "ch01-l04", "ch01-l05", "ch01-l06", "ch01-l07", "ch01-l08", "ch02-l01", "ch02-l02", "ch02-l03", "ch02-l04", "ch02-l05", "ch02-l06", "ch02-l07", "ch02-l08", "ch03-l01", "ch03-l02", "ch03-l03", "ch03-l04", "ch03-l05", "ch03-l06", "ch03-l07", "ch04-l01", "ch04-l02", "ch04-l03", "ch04-l04", "ch04-l05", "ch04-l06", "ch04-l07", "ch04-l08", "ch05-l01", "ch05-l02", "ch05-l03", "ch05-l04", "ch05-l05", "ch05-l06", "ch05-l07"]'::jsonb,
      '["ch02-l08"]'::jsonb,
      'ch06-l01', 4
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
  `;
  console.log('✓ user_beta seeded (1450 XP).');

  // 4. Seed/Update user_master (Capstone 4200 XP)
  await sql`
    INSERT INTO beamforge_users (
      id, name, role, level, total_xp, completed_level_ids, unlocked_solution_lesson_ids, last_active_exercise, streak_days
    ) VALUES (
      'user_master', 'BEAM Master', 'BEAM Grandmaster', 7, 5200,
      '["ch01-l01", "ch01-l02", "ch01-l03", "ch01-l04", "ch01-l05", "ch01-l06", "ch01-l07", "ch01-l08", "ch02-l01", "ch02-l02", "ch02-l03", "ch02-l04", "ch02-l05", "ch02-l06", "ch02-l07", "ch02-l08", "ch03-l01", "ch03-l02", "ch03-l03", "ch03-l04", "ch03-l05", "ch03-l06", "ch03-l07", "ch04-l01", "ch04-l02", "ch04-l03", "ch04-l04", "ch04-l05", "ch04-l06", "ch04-l07", "ch04-l08", "ch05-l01", "ch05-l02", "ch05-l03", "ch05-l04", "ch05-l05", "ch05-l06", "ch05-l07", "ch06-l01", "ch06-l02", "ch06-l03", "ch06-l04", "ch06-l05", "ch06-l06", "ch06-l07", "ch06-l08", "ch06-l09", "ch06-l10", "ch07-l01", "ch07-l02", "ch07-l03", "ch07-l04", "ch07-l05", "ch07-l06", "ch07-l07", "ch07-l08", "ch08-l01", "ch08-l02", "ch08-l03", "ch08-l04", "ch08-l05", "ch08-l06", "ch08-l07", "ch09-l01", "ch09-l02", "ch09-l03", "ch09-l04", "ch09-l05", "ch09-l06", "ch09-l07", "ch09-l08", "ch10-l01", "ch10-l02", "ch10-l03", "ch10-l04", "ch10-l05", "ch10-l06", "ch10-l07", "ch11-l01", "ch11-l02", "ch11-l03", "ch11-l04", "ch11-l05", "ch11-l06", "ch11-l07", "ch11-l08", "ch12-l01", "ch12-l02", "ch12-l03"]'::jsonb,
      '["ch06-l10", "ch09-l08"]'::jsonb,
      'ch12-l04', 14
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
  `;
  console.log('✓ user_master seeded (4200 XP).');

  // Verify rows
  const rows = await sql`SELECT id, name, total_xp, streak_days, jsonb_array_length(completed_level_ids) as completed_count FROM beamforge_users ORDER BY id;`;
  console.log('\n--- Live Neon beamforge_users Rows ---');
  console.table(rows);
}

runSeed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});


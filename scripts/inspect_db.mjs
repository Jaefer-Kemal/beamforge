import { neon } from '../apps/web-ide/node_modules/@neondatabase/serverless/index.mjs';
import fs from 'fs';

const env = fs.readFileSync('apps/web-ide/.env.local', 'utf8');
const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
const sql = neon(dbUrl);

async function check() {
  await sql`
    CREATE TABLE IF NOT EXISTS beamforge_drafts (
      user_id VARCHAR(64) NOT NULL,
      exercise_id VARCHAR(128) NOT NULL,
      files JSONB NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (user_id, exercise_id)
    );
  `;
  try {
    await sql`CREATE INDEX IF NOT EXISTS idx_submissions_user_status_ex ON beamforge_submissions(user_id, status, exercise_id, created_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_drafts_user_ex ON beamforge_drafts(user_id, exercise_id);`;
  } catch {}

  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log('Tables in Neon:', tables.map(t => t.table_name));
  const rows = await sql`SELECT id, name, role, total_xp, streak_days, completed_level_ids, last_active_exercise FROM beamforge_users`;
  console.log(`\nTable beamforge_users (${rows.length} rows):`);
  console.log(JSON.stringify(rows, null, 2));
  const subs = await sql`SELECT id, user_id, exercise_id, status, score, duration_ms, created_at, files FROM beamforge_submissions WHERE user_id = 'user_alpha' AND status = 'passed'`;
  console.log(`\nPassed submissions for user_alpha (${subs.length} rows):`);
  for (const s of subs) {
    console.log(`- ${s.id}: ${s.exercise_id} (score ${s.score}) files:`, Object.keys(s.files));
  }
}

check().catch(console.error);

import { neon } from '../apps/web-ide/node_modules/@neondatabase/serverless/index.mjs';
import fs from 'fs';

const env = fs.readFileSync('apps/web-ide/.env.local', 'utf8');
const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
const sql = neon(dbUrl);

async function cleanSlate() {
  console.log('Cleaning Neon DB submissions to clean slate for production...');
  await sql`DELETE FROM beamforge_submissions`;
  console.log('✓ beamforge_submissions table purged (0 rows).');

  const subsCount = await sql`SELECT count(*) FROM beamforge_submissions`;
  const users = await sql`SELECT id, name, role, total_xp, streak_days FROM beamforge_users ORDER BY id`;
  
  console.log('\n--- Current Neon DB State ---');
  console.log('beamforge_submissions count:', subsCount[0].count);
  console.table(users);
}

cleanSlate().catch(console.error);

import { neon } from '../apps/web-ide/node_modules/@neondatabase/serverless/index.mjs';
import fs from 'fs';

const env = fs.readFileSync('apps/web-ide/.env.local', 'utf8');
const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();
const sql = neon(dbUrl);

async function check() {
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log('Tables in Neon:', tables);
  const rows = await sql`SELECT id, name, role, total_xp, streak_days FROM beamforge_users`;
  console.log(`\nTable beamforge_users (${rows.length} rows):`);
  console.table(rows);
}

check().catch(console.error);

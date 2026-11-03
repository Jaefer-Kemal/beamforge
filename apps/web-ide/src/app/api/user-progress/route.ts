import { NextRequest, NextResponse } from 'next/server';
import { getNeonDb } from '../../../lib/db';
import { DEFAULT_USERS, UserProfile } from '../../../types/user';

async function ensureTable(sql: any) {
  try {
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
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
  } catch (err) {
    console.warn('[Neon DB] Table check/creation warning:', err);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || 'user_alpha';
  const preset = DEFAULT_USERS[userId] || DEFAULT_USERS['user_alpha'];

  const sql = getNeonDb();
  if (!sql) {
    return NextResponse.json({
      source: 'local_preset',
      user: preset,
      dbConnected: false,
    });
  }

  try {
    await ensureTable(sql);
    const rows = await sql`
      SELECT id, name, role, level, total_xp, completed_level_ids, unlocked_solution_lesson_ids, last_active_exercise
      FROM beamforge_users
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (rows && rows.length > 0) {
      const r = rows[0];
      const user: UserProfile = {
        id: r.id,
        name: r.name,
        role: r.role,
        level: Number(r.level || 1),
        avatarColor: preset.avatarColor,
        bio: preset.bio,
        totalXp: Number(r.total_xp || 0),
        completedLevelIds: Array.isArray(r.completed_level_ids) ? r.completed_level_ids : [],
        unlockedSolutionLessonIds: Array.isArray(r.unlocked_solution_lesson_ids) ? r.unlocked_solution_lesson_ids : [],
        lastActiveExercise: r.last_active_exercise || preset.lastActiveExercise,
      };
      return NextResponse.json({ source: 'neon', user, dbConnected: true });
    }

    // Seed preset user if not in database yet
    await sql`
      INSERT INTO beamforge_users (
        id, name, role, level, total_xp, completed_level_ids, unlocked_solution_lesson_ids, last_active_exercise
      ) VALUES (
        ${preset.id},
        ${preset.name},
        ${preset.role},
        ${preset.level},
        ${preset.totalXp},
        ${JSON.stringify(preset.completedLevelIds)},
        ${JSON.stringify(preset.unlockedSolutionLessonIds)},
        ${preset.lastActiveExercise}
      )
      ON CONFLICT (id) DO NOTHING
    `;

    return NextResponse.json({ source: 'neon_seeded', user: preset, dbConnected: true });
  } catch (error: any) {
    console.error('[Neon DB] GET user error:', error);
    return NextResponse.json({
      source: 'fallback_error',
      user: preset,
      dbConnected: false,
      error: error.message,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const user: UserProfile = body.user;
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Missing user payload' }, { status: 400 });
    }

    const sql = getNeonDb();
    if (!sql) {
      return NextResponse.json({ status: 'ok', source: 'offline', dbConnected: false });
    }

    await ensureTable(sql);
    await sql`
      INSERT INTO beamforge_users (
        id, name, role, level, total_xp, completed_level_ids, unlocked_solution_lesson_ids, last_active_exercise, updated_at
      ) VALUES (
        ${user.id},
        ${user.name},
        ${user.role},
        ${user.level},
        ${user.totalXp},
        ${JSON.stringify(user.completedLevelIds)},
        ${JSON.stringify(user.unlockedSolutionLessonIds)},
        ${user.lastActiveExercise},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        total_xp = EXCLUDED.total_xp,
        level = EXCLUDED.level,
        completed_level_ids = EXCLUDED.completed_level_ids,
        unlocked_solution_lesson_ids = EXCLUDED.unlocked_solution_lesson_ids,
        last_active_exercise = EXCLUDED.last_active_exercise,
        updated_at = NOW()
    `;

    return NextResponse.json({ status: 'ok', source: 'neon', dbConnected: true });
  } catch (error: any) {
    console.error('[Neon DB] POST user error:', error);
    return NextResponse.json({ error: error.message, dbConnected: false }, { status: 500 });
  }
}


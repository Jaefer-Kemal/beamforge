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
        streak_days INT DEFAULT 1,
        last_activity_date VARCHAR(32),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    try {
      await sql`ALTER TABLE beamforge_users ADD COLUMN IF NOT EXISTS streak_days INT DEFAULT 1;`;
      await sql`ALTER TABLE beamforge_users ADD COLUMN IF NOT EXISTS last_activity_date VARCHAR(32);`;
    } catch {}
  } catch (err) {
    console.warn('[Neon DB] Table check/creation warning:', err);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode');
  const userId = searchParams.get('userId') || 'user_alpha';
  const preset = DEFAULT_USERS[userId] || DEFAULT_USERS['user_alpha'];

  const sql = getNeonDb();

  // Leaderboard Query Mode
  if (mode === 'leaderboard') {
    if (!sql) {
      const fallbackList = Object.values(DEFAULT_USERS)
        .map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          level: u.level,
          totalXp: u.totalXp,
          streakDays: u.streakDays || 1,
          completedCount: u.completedLevelIds.length,
        }))
        .sort((a, b) => b.totalXp - a.totalXp);
      return NextResponse.json({
        source: 'local_preset',
        leaderboard: fallbackList,
        dbConnected: false,
      });
    }

    try {
      await ensureTable(sql);
      const rows = await sql`
        SELECT id, name, role, level, total_xp, streak_days, jsonb_array_length(completed_level_ids) as completed_count
        FROM beamforge_users
        ORDER BY total_xp DESC, streak_days DESC
        LIMIT 20
      `;
      return NextResponse.json({
        source: 'neon_leaderboard',
        leaderboard: rows.map((r: any) => ({
          id: r.id,
          name: r.name,
          role: r.role,
          level: Number(r.level || 1),
          totalXp: Number(r.total_xp || 0),
          streakDays: Number(r.streak_days || 1),
          completedCount: Number(r.completed_count || 0),
        })),
        dbConnected: true,
      });
    } catch (err: any) {
      console.error('[Neon DB] Leaderboard query error:', err);
      return NextResponse.json({
        source: 'error_fallback',
        leaderboard: [],
        dbConnected: false,
      });
    }
  }

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
      SELECT id, name, role, level, total_xp, completed_level_ids, unlocked_solution_lesson_ids, last_active_exercise, streak_days, last_activity_date
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
        streakDays: Number(r.streak_days || preset.streakDays || 1),
        lastActivityDate: r.last_activity_date || preset.lastActivityDate,
      };
      return NextResponse.json({ source: 'neon', user, dbConnected: true });
    }

    // Seed preset user if not in database yet
    await sql`
      INSERT INTO beamforge_users (
        id, name, role, level, total_xp, completed_level_ids, unlocked_solution_lesson_ids, last_active_exercise, streak_days, last_activity_date
      ) VALUES (
        ${preset.id},
        ${preset.name},
        ${preset.role},
        ${preset.level},
        ${preset.totalXp},
        ${JSON.stringify(preset.completedLevelIds)},
        ${JSON.stringify(preset.unlockedSolutionLessonIds)},
        ${preset.lastActiveExercise},
        ${preset.streakDays || 1},
        ${preset.lastActivityDate || null}
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
        id, name, role, level, total_xp, completed_level_ids, unlocked_solution_lesson_ids, last_active_exercise, streak_days, last_activity_date, updated_at
      ) VALUES (
        ${user.id},
        ${user.name},
        ${user.role},
        ${user.level},
        ${user.totalXp},
        ${JSON.stringify(user.completedLevelIds)},
        ${JSON.stringify(user.unlockedSolutionLessonIds)},
        ${user.lastActiveExercise},
        ${user.streakDays || 1},
        ${user.lastActivityDate || null},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        total_xp = EXCLUDED.total_xp,
        level = EXCLUDED.level,
        completed_level_ids = EXCLUDED.completed_level_ids,
        unlocked_solution_lesson_ids = EXCLUDED.unlocked_solution_lesson_ids,
        last_active_exercise = EXCLUDED.last_active_exercise,
        streak_days = EXCLUDED.streak_days,
        last_activity_date = EXCLUDED.last_activity_date,
        updated_at = NOW()
    `;

    return NextResponse.json({ status: 'ok', source: 'neon', dbConnected: true });
  } catch (error: any) {
    console.error('[Neon DB] POST user error:', error);
    return NextResponse.json({ error: error.message, dbConnected: false }, { status: 500 });
  }
}


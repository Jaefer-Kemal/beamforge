import { NextRequest, NextResponse } from 'next/server';
import { getNeonDb } from '../../../lib/db';
import { DEFAULT_USERS, UserProfile, xpToRole } from '../../../types/user';

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

    await sql`
      CREATE TABLE IF NOT EXISTS beamforge_submissions (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        exercise_id VARCHAR(128) NOT NULL,
        status VARCHAR(32) NOT NULL,
        score INT DEFAULT 0,
        files JSONB NOT NULL,
        stages_summary JSONB DEFAULT '[]'::jsonb,
        duration_ms INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

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
      await sql`CREATE INDEX IF NOT EXISTS idx_submissions_user_exercise ON beamforge_submissions(user_id, exercise_id, created_at DESC);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_submissions_user_status_ex ON beamforge_submissions(user_id, status, exercise_id, created_at DESC);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_drafts_user_ex ON beamforge_drafts(user_id, exercise_id);`;
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

  // Submissions Query Mode
  if (mode === 'submissions') {
    const exerciseId = searchParams.get('exerciseId');
    if (!sql) {
      return NextResponse.json({ source: 'offline', submissions: [], dbConnected: false });
    }
    try {
      await ensureTable(sql);
      let rows: any[] = [];
      if (exerciseId) {
        rows = await sql`
          SELECT id, user_id as "userId", exercise_id as "exerciseId", status, score, files, stages_summary as "stagesSummary", duration_ms as "durationMs", created_at as "createdAt"
          FROM beamforge_submissions
          WHERE user_id = ${userId} AND exercise_id = ${exerciseId}
          ORDER BY created_at DESC
          LIMIT 50
        `;
      } else {
        rows = await sql`
          SELECT id, user_id as "userId", exercise_id as "exerciseId", status, score, files, stages_summary as "stagesSummary", duration_ms as "durationMs", created_at as "createdAt"
          FROM beamforge_submissions
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT 100
        `;
      }
      return NextResponse.json({
        source: 'neon_submissions',
        submissions: rows || [],
        dbConnected: true,
      });
    } catch (err: any) {
      console.error('[Neon DB] Submissions query error:', err);
      return NextResponse.json({
        source: 'error_fallback',
        submissions: [],
        dbConnected: false,
        error: err.message,
      });
    }
  }

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
        leaderboard: rows.map((r: any) => {
          const xp = Number(r.total_xp || 0);
          const derived = xpToRole(xp);
          return {
            id: r.id,
            name: r.name,
            role: derived.role,
            level: derived.level,
            totalXp: xp,
            streakDays: Number(r.streak_days || 1),
            completedCount: Number(r.completed_count || 0),
          };
        }),
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

    // Query all passed submissions for this user — the authoritative backend source of truth
    const passedSubmissions = await sql`
      SELECT DISTINCT ON (exercise_id) exercise_id, status, score, created_at, files
      FROM beamforge_submissions
      WHERE user_id = ${userId} AND status = 'passed'
      ORDER BY exercise_id, created_at DESC
    `;

    const dbPassedIds: string[] = (passedSubmissions || []).map((s: any) => s.exercise_id);
    const acceptedFiles: Record<string, Record<string, string>> = {};
    for (const s of passedSubmissions || []) {
      if (s.files && typeof s.files === 'object') {
        acceptedFiles[s.exercise_id] = s.files;
      }
    }

    // Query in-progress cloud drafts for this user
    const draftRows = await sql`
      SELECT exercise_id, files
      FROM beamforge_drafts
      WHERE user_id = ${userId}
    `;
    const cloudDrafts: Record<string, Record<string, string>> = {};
    for (const d of draftRows || []) {
      if (d.files && typeof d.files === 'object') {
        cloudDrafts[d.exercise_id] = d.files;
      }
    }

    const rows = await sql`
      SELECT id, name, role, level, total_xp, completed_level_ids, unlocked_solution_lesson_ids, last_active_exercise, streak_days, last_activity_date
      FROM beamforge_users
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (rows && rows.length > 0) {
      const r = rows[0];
      let completedLevelIds = r.completed_level_ids;
      if (typeof completedLevelIds === 'string') {
        try { completedLevelIds = JSON.parse(completedLevelIds); } catch { completedLevelIds = []; }
      }
      if (!Array.isArray(completedLevelIds)) completedLevelIds = [];

      // Reconcile user profile completed list with authoritative passed submissions
      const mergedCompleted = Array.from(new Set([...completedLevelIds, ...dbPassedIds]));

      let unlockedSolutionLessonIds = r.unlocked_solution_lesson_ids;
      if (typeof unlockedSolutionLessonIds === 'string') {
        try { unlockedSolutionLessonIds = JSON.parse(unlockedSolutionLessonIds); } catch { unlockedSolutionLessonIds = []; }
      }
      if (!Array.isArray(unlockedSolutionLessonIds)) unlockedSolutionLessonIds = [];

      const totalXp = Number(r.total_xp || 0);
      const derived = xpToRole(totalXp);

      if (mergedCompleted.length > completedLevelIds.length) {
        await sql`
          UPDATE beamforge_users
          SET completed_level_ids = ${JSON.stringify(mergedCompleted)},
              updated_at = NOW()
          WHERE id = ${userId}
        `;
      }

      const user: UserProfile = {
        id: r.id,
        name: r.name,
        role: derived.role,
        level: derived.level,
        avatarColor: preset.avatarColor,
        bio: preset.bio,
        totalXp,
        completedLevelIds: mergedCompleted,
        unlockedSolutionLessonIds,
        lastActiveExercise: r.last_active_exercise || preset.lastActiveExercise,
        streakDays: Number(r.streak_days || preset.streakDays || 1),
        lastActivityDate: r.last_activity_date || preset.lastActivityDate,
      };
      return NextResponse.json({
        source: 'neon',
        user,
        completedLevelIds: mergedCompleted,
        acceptedFiles,
        drafts: cloudDrafts,
        dbConnected: true,
      });
    }

    // Seed preset user if not in database yet, seeded with any existing passed submissions
    const initialCompleted = Array.from(new Set([...preset.completedLevelIds, ...dbPassedIds]));
    await sql`
      INSERT INTO beamforge_users (
        id, name, role, level, total_xp, completed_level_ids, unlocked_solution_lesson_ids, last_active_exercise, streak_days, last_activity_date
      ) VALUES (
        ${preset.id},
        ${preset.name},
        ${preset.role},
        ${preset.level},
        ${preset.totalXp},
        ${JSON.stringify(initialCompleted)},
        ${JSON.stringify(preset.unlockedSolutionLessonIds)},
        ${preset.lastActiveExercise},
        ${preset.streakDays || 1},
        ${preset.lastActivityDate || null}
      )
      ON CONFLICT (id) DO NOTHING
    `;

    const seededUser: UserProfile = {
      ...preset,
      completedLevelIds: initialCompleted,
    };

    return NextResponse.json({
      source: 'neon_seeded',
      user: seededUser,
      completedLevelIds: initialCompleted,
      acceptedFiles,
      drafts: cloudDrafts,
      dbConnected: true,
    });
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
    const sql = getNeonDb();

    // Action: Record Submission
    if (body.action === 'record_submission') {
      const sub = body.submission;
      if (!sub || !sub.userId || !sub.exerciseId) {
        return NextResponse.json({ error: 'Missing submission payload' }, { status: 400 });
      }
      if (!sql) {
        return NextResponse.json({ status: 'ok', source: 'offline', dbConnected: false });
      }
      await ensureTable(sql);
      const subId = sub.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await sql`
        INSERT INTO beamforge_submissions (
          id, user_id, exercise_id, status, score, files, stages_summary, duration_ms, created_at
        ) VALUES (
          ${subId},
          ${sub.userId},
          ${sub.exerciseId},
          ${sub.status || 'failed'},
          ${sub.score || 0},
          ${JSON.stringify(sub.files || {})},
          ${JSON.stringify(sub.stagesSummary || [])},
          ${sub.durationMs || 0},
          NOW()
        )
      `;

      let updatedCompletedIds: string[] = [];
      let updatedXp = 0;
      let updatedUser: UserProfile | null = null;

      if (sub.status === 'passed') {
        const passedRows = await sql`
          SELECT DISTINCT exercise_id FROM beamforge_submissions WHERE user_id = ${sub.userId} AND status = 'passed'
        `;
        updatedCompletedIds = (passedRows || []).map((r: any) => r.exercise_id);

        const userRows = await sql`SELECT * FROM beamforge_users WHERE id = ${sub.userId} LIMIT 1`;
        if (userRows && userRows.length > 0) {
          const u = userRows[0];
          let prevCompleted = u.completed_level_ids;
          if (typeof prevCompleted === 'string') {
            try { prevCompleted = JSON.parse(prevCompleted); } catch { prevCompleted = []; }
          }
          if (!Array.isArray(prevCompleted)) prevCompleted = [];

          const isNewlyCompleted = !prevCompleted.includes(sub.exerciseId);
          const xpToAdd = isNewlyCompleted ? (sub.xpReward || 100) : 0;
          updatedXp = Number(u.total_xp || 0) + xpToAdd;
          const { level, role } = xpToRole(updatedXp);

          await sql`
            UPDATE beamforge_users
            SET completed_level_ids = ${JSON.stringify(updatedCompletedIds)},
                total_xp = ${updatedXp},
                level = ${level},
                role = ${role},
                last_active_exercise = ${sub.exerciseId},
                updated_at = NOW()
            WHERE id = ${sub.userId}
          `;

          updatedUser = {
            id: u.id,
            name: u.name,
            role,
            level,
            avatarColor: '#3B82F6',
            bio: '',
            totalXp: updatedXp,
            completedLevelIds: updatedCompletedIds,
            unlockedSolutionLessonIds: u.unlocked_solution_lesson_ids || [],
            lastActiveExercise: sub.exerciseId,
            streakDays: Number(u.streak_days || 1),
            lastActivityDate: u.last_activity_date,
          };
        }
      }

      return NextResponse.json({
        status: 'ok',
        submissionId: subId,
        isPassed: sub.status === 'passed',
        completedLevelIds: updatedCompletedIds,
        totalXp: updatedXp,
        user: updatedUser,
        dbConnected: true,
      });
    }

    // Action: Save Work-in-Progress Code Draft
    if (body.action === 'save_draft') {
      const { userId: draftUserId, exerciseId: draftExId, files: draftFiles } = body;
      if (!sql) {
        return NextResponse.json({ status: 'ok', source: 'offline', dbConnected: false });
      }
      if (!draftUserId || !draftExId || !draftFiles) {
        return NextResponse.json({ error: 'Missing draft payload' }, { status: 400 });
      }
      await ensureTable(sql);
      await sql`
        INSERT INTO beamforge_drafts (user_id, exercise_id, files, updated_at)
        VALUES (${draftUserId}, ${draftExId}, ${JSON.stringify(draftFiles)}, NOW())
        ON CONFLICT (user_id, exercise_id) DO UPDATE SET
          files = EXCLUDED.files,
          updated_at = NOW()
      `;
      return NextResponse.json({ status: 'ok', saved: true, dbConnected: true });
    }

    // Action: Reset Submissions & Drafts
    if (body.action === 'reset_submissions' || body.action === 'reset_drafts') {
      const resetUserId = body.userId;
      if (!sql) {
        return NextResponse.json({ status: 'ok', source: 'offline', dbConnected: false });
      }
      await ensureTable(sql);
      if (resetUserId) {
        if (body.action === 'reset_submissions') {
          await sql`DELETE FROM beamforge_submissions WHERE user_id = ${resetUserId}`;
        }
        await sql`DELETE FROM beamforge_drafts WHERE user_id = ${resetUserId}`;
      }
      return NextResponse.json({ status: 'ok', dbConnected: true });
    }

    // Default Action: Sync User Profile
    const user: UserProfile = body.user;
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Missing user payload' }, { status: 400 });
    }
    if (!sql) {
      return NextResponse.json({ status: 'ok', source: 'offline', dbConnected: false });
    }

    await ensureTable(sql);
    const { level: canonicalLevel, role: canonicalRole } = xpToRole(user.totalXp);
    await sql`
      INSERT INTO beamforge_users (
        id, name, role, level, total_xp, completed_level_ids, unlocked_solution_lesson_ids, last_active_exercise, streak_days, last_activity_date, updated_at
      ) VALUES (
        ${user.id},
        ${user.name},
        ${canonicalRole},
        ${canonicalLevel},
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
        role = EXCLUDED.role,
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


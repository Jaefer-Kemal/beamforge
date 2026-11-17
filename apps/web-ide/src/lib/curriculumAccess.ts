import { ALL_CURRICULUM_CHAPTERS, ALL_LESSONS_FLAT, getLessonById } from '../data/curriculumCatalog';
import { CHAPTERS } from '../components/navigation/BootDevTopBar';

export type PrerequisiteType = 'same_chapter' | 'previous_chapter' | 'auth_required';

export interface LessonPrerequisiteInfo {
  type: PrerequisiteType;
  targetChapterNum: number;
  targetChapterTitle: string;
  targetLessonNum: number;
  targetLessonId: string;
  targetLessonTitle: string;
  prereqChapterNum: number;
  prereqLessonId: string;
  prereqLessonTitle: string;
  prereqLessonNum: number;
  message: string;
}

export interface LessonAccessResult {
  isUnlocked: boolean;
  prerequisite?: LessonPrerequisiteInfo;
}

/**
 * Synchronously retrieves all completed lesson IDs across store state and all
 * local storage caches (user-scoped keys, beamforge_progress, and user profiles).
 * Guarantees zero-latency access evaluation on fresh page reloads before async DB hydration.
 */
export function getSynchronousCompletedLevelIds(storeCompleted: string[] = []): string[] {
  const completed = new Set<string>(storeCompleted || []);
  if (typeof window === 'undefined') return Array.from(completed);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith('beamforge_completed_')) {
        const val = localStorage.getItem(k);
        if (val === 'true') {
          const parts = k.split('_');
          const lid = parts[parts.length - 1];
          if (lid) completed.add(lid);
        }
      } else if (k.startsWith('beamforge_user_')) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const u = JSON.parse(raw);
            if (Array.isArray(u.completedLevelIds)) {
              u.completedLevelIds.forEach((id: string) => completed.add(id));
            }
          }
        } catch {}
      }
    }
    const progressRaw = localStorage.getItem('beamforge_progress');
    if (progressRaw) {
      try {
        const p = JSON.parse(progressRaw);
        if (Array.isArray(p.completedLevelIds)) {
          p.completedLevelIds.forEach((id: string) => completed.add(id));
        }
      } catch {}
    }
  } catch {}
  return Array.from(completed);
}

/**
 * Checks whether a specific chapter and lesson are unlocked based on user progress.
 * Enforces sequential pedagogical progression:
 * - Chapter 1 Lesson 1 is always unlocked for everyone.
 * - Chapters 1 through 4 are 100% free for Guest learners.
 * - Chapter 5 through 12 require an authenticated account.
 * - For Chapter N (N > 1), Chapter N-1's final lesson (Problem Set) must be completed.
 * - For Lesson K (K > 1) within an accessible chapter, Lesson K-1 in the SAME chapter must be completed.
 * - Dev/Tester Mode bypasses all locks.
 */
export function checkLessonAccess(
  chapterNum: number,
  lessonNum: number,
  completedLevelIds: string[] = [],
  devModeUnlockedAll = false,
  isAuthenticated?: boolean
): LessonAccessResult {
  // Dev mode or tester mode unlocks everything
  if (devModeUnlockedAll) {
    return { isUnlocked: true };
  }

  // Chapter 1 Lesson 1 is always unlocked
  if (chapterNum <= 1 && lessonNum <= 1) {
    return { isUnlocked: true };
  }

  const chMeta = CHAPTERS.find((c) => c.num === chapterNum);
  const targetChapterTitle = chMeta?.title || `Chapter ${chapterNum}`;
  const currChapterLessons = (ALL_CURRICULUM_CHAPTERS as any)[chapterNum] || [];
  const targetLesson = currChapterLessons[lessonNum - 1];
  const targetLessonId = targetLesson?.id || `ch0${chapterNum}-l0${lessonNum}`;
  const targetLessonTitle = targetLesson?.title || `Lesson ${lessonNum}`;

  // Check authentication status for Chapter 5+
  let authed = isAuthenticated;
  if (authed === undefined && typeof window !== 'undefined') {
    try {
      const isAuthStorage = localStorage.getItem('bf_is_authenticated');
      const uid = localStorage.getItem('bf_current_user_id');
      // If explicitly marked authenticated, or using an authenticated profile
      authed = isAuthStorage === 'true' || (Boolean(uid) && uid !== 'guest' && !uid?.startsWith('guest_'));
    } catch {
      authed = false;
    }
  }

  // Combine passed completedLevelIds with synchronous local storage cache
  const effectiveCompleted = getSynchronousCompletedLevelIds(completedLevelIds);

  // If target lesson is already completed, it is ALWAYS unlocked
  if (effectiveCompleted.includes(targetLessonId)) {
    return { isUnlocked: true };
  }

  // 1. Chapter-level gating check (for Chapter > 1)
  if (chapterNum > 1) {
    const prevChapterNum = chapterNum - 1;
    const prevChapterLessons = (ALL_CURRICULUM_CHAPTERS as any)[prevChapterNum] || [];
    const prevFinalLesson = prevChapterLessons.length > 0 ? prevChapterLessons[prevChapterLessons.length - 1] : null;

    if (prevFinalLesson && !effectiveCompleted.includes(prevFinalLesson.id)) {
      return {
        isUnlocked: false,
        prerequisite: {
          type: 'previous_chapter',
          targetChapterNum: chapterNum,
          targetChapterTitle,
          targetLessonNum: lessonNum,
          targetLessonId,
          targetLessonTitle,
          prereqChapterNum: prevChapterNum,
          prereqLessonId: prevFinalLesson.id,
          prereqLessonTitle: prevFinalLesson.title,
          prereqLessonNum: prevFinalLesson.lessonNumber,
          message: `Chapter ${chapterNum} requires mastering the Chapter ${prevChapterNum} Problem Set (${prevFinalLesson.title}) first.`,
        },
      };
    }
  }

  // Chapter 5+ requires an account once previous chapter prerequisites are satisfied
  if (chapterNum > 4 && !authed) {
    return {
      isUnlocked: false,
      prerequisite: {
        type: 'auth_required',
        targetChapterNum: chapterNum,
        targetChapterTitle,
        targetLessonNum: lessonNum,
        targetLessonId,
        targetLessonTitle,
        prereqChapterNum: 4,
        prereqLessonId: 'ch04-l08',
        prereqLessonTitle: 'Chapter 4 Capstone Problem Set',
        prereqLessonNum: 8,
        message: `You've conquered the foundational chapters! Sign in with Google or Email (Free) to unlock Chapter ${chapterNum} (${targetChapterTitle}) and save your progress to the cloud.`,
      },
    };
  }

  // 2. Intra-chapter lesson gating check (for Lesson > 1)
  // Within an accessible chapter, each lesson requires the immediately preceding lesson
  if (lessonNum > 1) {
    // Find the immediately preceding lesson in this chapter
    const prevLesson = currChapterLessons[lessonNum - 2];
    if (prevLesson && !effectiveCompleted.includes(prevLesson.id)) {
      // Find the first uncompleted lesson in this chapter so the learner is directed to where they left off
      const firstIncomplete = currChapterLessons.find((l: any) => !effectiveCompleted.includes(l.id)) || prevLesson;

      return {
        isUnlocked: false,
        prerequisite: {
          type: 'same_chapter',
          targetChapterNum: chapterNum,
          targetChapterTitle,
          targetLessonNum: lessonNum,
          targetLessonId,
          targetLessonTitle,
          prereqChapterNum: chapterNum,
          prereqLessonId: firstIncomplete.id,
          prereqLessonTitle: firstIncomplete.title,
          prereqLessonNum: firstIncomplete.lessonNumber,
          message: `Lesson ${lessonNum} (${targetLessonTitle}) is locked. Complete Lesson ${firstIncomplete.lessonNumber} (${firstIncomplete.title}) first.`,
        },
      };
    }
  }

  return { isUnlocked: true };
}

/**
 * Checks access by unique lesson string ID (e.g. "ch01-l08")
 */
export function checkLessonAccessById(
  lessonId: string,
  completedLevelIds: string[] = [],
  devModeUnlockedAll = false,
  isAuthenticated?: boolean
): LessonAccessResult {
  if (devModeUnlockedAll) return { isUnlocked: true };
  const synchronousCompleted = getSynchronousCompletedLevelIds(completedLevelIds);
  if (synchronousCompleted.includes(lessonId)) return { isUnlocked: true };
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('beamforge_accepted_') && k.endsWith(`_${lessonId}`)) {
          return { isUnlocked: true };
        }
      }
    } catch {}
  }
  const lesson = getLessonById(lessonId);
  if (!lesson) {
    return { isUnlocked: true };
  }
  return checkLessonAccess(lesson.chapterNumber, lesson.lessonNumber, synchronousCompleted, devModeUnlockedAll, isAuthenticated);
}


import { ALL_CURRICULUM_CHAPTERS, ALL_LESSONS_FLAT, getLessonById } from '../data/curriculumCatalog';
import { CHAPTERS } from '../components/navigation/BootDevTopBar';

export type PrerequisiteType = 'same_chapter' | 'previous_chapter';

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
 * Checks whether a specific chapter and lesson are unlocked based on user progress.
 * Enforces sequential pedagogical progression:
 * - Chapter 1 Lesson 1 is always unlocked for everyone.
 * - For Chapter N (N > 1), Chapter N-1's final lesson (Problem Set) must be completed.
 * - For Lesson K (K > 1) within an accessible chapter, Lesson K-1 in the SAME chapter must be completed.
 * - Dev/Tester Mode bypasses all locks.
 */
export function checkLessonAccess(
  chapterNum: number,
  lessonNum: number,
  completedLevelIds: string[] = [],
  devModeUnlockedAll = false
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

  // 1. Chapter-level gating check (for Chapter > 1)
  if (chapterNum > 1) {
    const prevChapterNum = chapterNum - 1;
    const prevChapterLessons = (ALL_CURRICULUM_CHAPTERS as any)[prevChapterNum] || [];
    const prevFinalLesson = prevChapterLessons.length > 0 ? prevChapterLessons[prevChapterLessons.length - 1] : null;

    if (prevFinalLesson && !completedLevelIds.includes(prevFinalLesson.id)) {
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

  // 2. Intra-chapter lesson gating check (for Lesson > 1)
  // Within an accessible chapter, each lesson requires the immediately preceding lesson
  if (lessonNum > 1) {
    // Find the immediately preceding lesson in this chapter
    const prevLesson = currChapterLessons[lessonNum - 2];
    if (prevLesson && !completedLevelIds.includes(prevLesson.id)) {
      // Find the first uncompleted lesson in this chapter so the learner is directed to where they left off
      const firstIncomplete = currChapterLessons.find((l: any) => !completedLevelIds.includes(l.id)) || prevLesson;

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
  devModeUnlockedAll = false
): LessonAccessResult {
  const lesson = getLessonById(lessonId);
  if (!lesson) {
    return { isUnlocked: true };
  }
  return checkLessonAccess(lesson.chapterNumber, lesson.lessonNumber, completedLevelIds, devModeUnlockedAll);
}

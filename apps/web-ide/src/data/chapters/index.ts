import { LessonContent } from '../../types/workspace';
import { CHAPTER_1_LESSONS } from './ch01';
import { CHAPTER_2_LESSONS } from './ch02';
import { CHAPTER_3_LESSONS } from './ch03';
import { CHAPTER_4_LESSONS } from './ch04';
import { CHAPTER_5_LESSONS } from './ch05';
import { CHAPTER_6_LESSONS } from './ch06';
import { CHAPTER_7_LESSONS } from './ch07';
import { CHAPTER_8_LESSONS } from './ch08';
import { CHAPTER_9_LESSONS } from './ch09';
import { CHAPTER_10_LESSONS } from './ch10';
import { CHAPTER_11_LESSONS } from './ch11';

export {
  CHAPTER_1_LESSONS,
  CHAPTER_2_LESSONS,
  CHAPTER_3_LESSONS,
  CHAPTER_4_LESSONS,
  CHAPTER_5_LESSONS,
  CHAPTER_6_LESSONS,
  CHAPTER_7_LESSONS,
  CHAPTER_8_LESSONS,
  CHAPTER_9_LESSONS,
  CHAPTER_10_LESSONS,
  CHAPTER_11_LESSONS,
};

export const ALL_CURRICULUM_CHAPTERS: Record<number, LessonContent[]> = {
  1: CHAPTER_1_LESSONS,
  2: CHAPTER_2_LESSONS,
  3: CHAPTER_3_LESSONS,
  4: CHAPTER_4_LESSONS,
  5: CHAPTER_5_LESSONS,
  6: CHAPTER_6_LESSONS,
  7: CHAPTER_7_LESSONS,
  8: CHAPTER_8_LESSONS,
  9: CHAPTER_9_LESSONS,
  10: CHAPTER_10_LESSONS,
  11: CHAPTER_11_LESSONS,
};

/** All flat lessons in sequential curriculum order */
export const ALL_LESSONS_FLAT: LessonContent[] = [
  ...CHAPTER_1_LESSONS,
  ...CHAPTER_2_LESSONS,
  ...CHAPTER_3_LESSONS,
  ...CHAPTER_4_LESSONS,
  ...CHAPTER_5_LESSONS,
  ...CHAPTER_6_LESSONS,
  ...CHAPTER_7_LESSONS,
  ...CHAPTER_8_LESSONS,
  ...CHAPTER_9_LESSONS,
  ...CHAPTER_10_LESSONS,
  ...CHAPTER_11_LESSONS,
];

/** Lookup lesson by its unique string ID (e.g. "ch02-l06") */
export function getLessonById(id: string): LessonContent | undefined {
  return ALL_LESSONS_FLAT.find((l) => l.id === id);
}

/** Lookup lesson by chapter number (1..12) and lesson number (1..n) */
export function getLessonByChapterAndNum(chapterNum: number, lessonNum: number): LessonContent | undefined {
  const chapter = ALL_CURRICULUM_CHAPTERS[chapterNum];
  if (!chapter) return undefined;
  return chapter.find((l) => l.lessonNumber === lessonNum);
}

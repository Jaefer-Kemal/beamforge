/**
 * BeamForge Curriculum Decomposition Script
 *
 * Decomposes monolithic `ch01.ts` through `ch12.ts` into a structured, modular
 * filesystem hierarchy:
 *   apps/web-ide/src/data/curriculum/chapter_XX/lecture_YY/
 *     - guide.md         (Left Pane concept markdown & instructions)
 *     - starter.erl      (Right Pane editor starter code)
 *     - solution.erl     (Verified reference solution)
 *     - tests.json       (Visible & hidden test cases)
 *     - meta.json        (Title, difficulty, XP, AST rules, doc cards, quizzes)
 *     - files/           (Companion files for multi-file lessons)
 *     - solution_files/  (Companion solution files)
 *
 * NOTE: The original `apps/web-ide/src/data/chapters/` files are NOT deleted.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ALL_CURRICULUM_CHAPTERS } from '../apps/web-ide/src/data/chapters/index';
import {
  CH12_CAPSTONE_MILESTONES,
  CH12_MILESTONE_LESSONS,
  CH12_STARTER_FILES,
  CH12_SOLUTION_FILES,
} from '../apps/web-ide/src/data/chapters/ch12';
import { LessonContent } from '../apps/web-ide/src/types/workspace';

const CURRICULUM_ROOT = path.join(
  __dirname,
  '..',
  'apps',
  'web-ide',
  'src',
  'data',
  'curriculum'
);

// Map of official chapter titles
const CHAPTER_TITLES: Record<number, string> = {
  1: 'Functional Foundations & Sequential Erlang',
  2: 'Control Flow, Guards, Accumulators & TCO',
  3: 'Higher-Order Functions & List Comprehensions',
  4: 'Maps, Records, Bit Syntax & Binary Protocols',
  5: 'Concurrency & The Actor Model',
  6: 'Fault Tolerance, Links, Monitors & Let It Crash',
  7: 'OTP Core Behaviours (gen_server, gen_statem, gen_event)',
  8: 'Supervision Trees & Application Releases',
  9: 'Distributed Systems, ETS, Mnesia & Telemetry',
  10: 'Raw TCP Backends & Socket Flow Control',
  11: 'Guided XMPP Protocol Step-by-Step',
  12: 'Production XMPP Server Capstone Studio',
};

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function sanitizeSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function extractModuleName(code: string, defaultName: string): string {
  const match = code.match(/-module\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*\./);
  return match ? match[1] : defaultName;
}

function decomposeStandardLesson(lesson: LessonContent, lectureDir: string) {
  ensureDir(lectureDir);

  // 1. Left Pane Guide Markdown
  fs.writeFileSync(
    path.join(lectureDir, 'guide.md'),
    lesson.conceptMarkdown || '',
    'utf-8'
  );

  // 2. Right Pane Starter Code
  const starter = lesson.starterCode || (lesson.files && lesson.files[0]?.content) || '';
  fs.writeFileSync(
    path.join(lectureDir, 'starter.erl'),
    starter,
    'utf-8'
  );

  // 3. Right Pane Solution Code
  const solution =
    lesson.solutionCode ||
    (lesson.solutionFiles && Object.values(lesson.solutionFiles)[0]) ||
    '';
  fs.writeFileSync(
    path.join(lectureDir, 'solution.erl'),
    solution,
    'utf-8'
  );

  // 4. Erlang-Compliant Module Names inside starter/ and solution/ for direct `erlc` compilation
  const modName = extractModuleName(solution || starter, lesson.id.replace(/[^a-zA-Z0-9_]/g, '_'));
  const starterDir = path.join(lectureDir, 'starter');
  const solutionDir = path.join(lectureDir, 'solution');
  ensureDir(starterDir);
  ensureDir(solutionDir);

  if (lesson.files && lesson.files.length > 1) {
    for (const f of lesson.files) {
      const filePath = path.join(starterDir, f.path);
      ensureDir(path.dirname(filePath));
      fs.writeFileSync(filePath, f.content, 'utf-8');
    }
  } else if (starter) {
    fs.writeFileSync(path.join(starterDir, `${modName}.erl`), starter, 'utf-8');
  }

  if (lesson.solutionFiles && Object.keys(lesson.solutionFiles).length > 1) {
    for (const [relPath, content] of Object.entries(lesson.solutionFiles)) {
      const filePath = path.join(solutionDir, relPath);
      ensureDir(path.dirname(filePath));
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  } else if (solution) {
    fs.writeFileSync(path.join(solutionDir, `${modName}.erl`), solution, 'utf-8');
  }

  // 5. Test Cases
  const tests = {
    visibleTestCases: lesson.visibleTestCases || [],
  };
  fs.writeFileSync(
    path.join(lectureDir, 'tests.json'),
    JSON.stringify(tests, null, 2),
    'utf-8'
  );

  // 6. Metadata (everything else)
  const meta: Record<string, any> = {
    id: lesson.id,
    chapterNumber: lesson.chapterNumber,
    lessonNumber: lesson.lessonNumber,
    lessonType: lesson.lessonType,
    title: lesson.title,
    difficulty: lesson.difficulty,
    xpReward: lesson.xpReward ?? 100,
    solutionExplanation: lesson.solutionExplanation || '',
  };

  if (lesson.astRules) meta.astRules = lesson.astRules;
  if (lesson.otpDocCards && lesson.otpDocCards.length > 0) meta.otpDocCards = lesson.otpDocCards;
  if (lesson.mentalModelCheck) meta.mentalModelCheck = lesson.mentalModelCheck;
  if (lesson.incidentAlert) meta.incidentAlert = lesson.incidentAlert;
  if (lesson.visualScene) meta.visualScene = lesson.visualScene;
  if (lesson.capabilityMode) meta.capabilityMode = lesson.capabilityMode;
  if (lesson.references && lesson.references.length > 0) meta.references = lesson.references;

  fs.writeFileSync(
    path.join(lectureDir, 'meta.json'),
    JSON.stringify(meta, null, 2),
    'utf-8'
  );
}

function decomposeChapter12(chDir: string) {
  ensureDir(chDir);

  // Chapter 12 chapter.json
  const chMeta = {
    chapterNumber: 12,
    title: CHAPTER_TITLES[12],
    isCapstone: true,
  };
  fs.writeFileSync(
    path.join(chDir, 'chapter.json'),
    JSON.stringify(chMeta, null, 2),
    'utf-8'
  );

  const capstoneDir = path.join(chDir, 'capstone');
  ensureDir(capstoneDir);

  const capstoneLesson = ALL_CURRICULUM_CHAPTERS[12][0];

  // 1. Capstone Left Pane Guide Markdown
  fs.writeFileSync(
    path.join(capstoneDir, 'guide.md'),
    capstoneLesson.conceptMarkdown || '',
    'utf-8'
  );

  // 2. Tests
  const tests = {
    visibleTestCases: capstoneLesson.visibleTestCases || [],
  };
  fs.writeFileSync(
    path.join(capstoneDir, 'tests.json'),
    JSON.stringify(tests, null, 2),
    'utf-8'
  );

  // 3. Meta
  const meta: Record<string, any> = {
    id: capstoneLesson.id,
    chapterNumber: capstoneLesson.chapterNumber,
    lessonNumber: capstoneLesson.lessonNumber,
    lessonType: capstoneLesson.lessonType,
    title: capstoneLesson.title,
    difficulty: capstoneLesson.difficulty,
    xpReward: capstoneLesson.xpReward ?? 500,
    solutionExplanation: capstoneLesson.solutionExplanation || '',
    visualScene: capstoneLesson.visualScene,
    mentalModelCheck: capstoneLesson.mentalModelCheck,
  };
  fs.writeFileSync(
    path.join(capstoneDir, 'meta.json'),
    JSON.stringify(meta, null, 2),
    'utf-8'
  );

  // 4. Milestones spec
  fs.writeFileSync(
    path.join(capstoneDir, 'milestones.json'),
    JSON.stringify(CH12_CAPSTONE_MILESTONES, null, 2),
    'utf-8'
  );

  // 5. Milestone Rich Lessons
  const milestoneLessonsDir = path.join(capstoneDir, 'milestone_lessons');
  ensureDir(milestoneLessonsDir);
  for (let i = 0; i < CH12_MILESTONE_LESSONS.length; i++) {
    const ml = CH12_MILESTONE_LESSONS[i];
    const mlDir = path.join(
      milestoneLessonsDir,
      `milestone_${String(i + 1).padStart(2, '0')}_${sanitizeSlug(ml.title)}`
    );
    ensureDir(mlDir);

    fs.writeFileSync(
      path.join(mlDir, 'guide.md'),
      ml.conceptMarkdown || '',
      'utf-8'
    );

    const mlMeta: Record<string, any> = {
      id: ml.id,
      title: ml.title,
      chapterNumber: ml.chapterNumber,
      lessonNumber: ml.lessonNumber,
      lessonType: ml.lessonType,
      difficulty: ml.difficulty,
      xpReward: ml.xpReward,
      solutionExplanation: ml.solutionExplanation,
      astRules: ml.astRules,
      mentalModelCheck: ml.mentalModelCheck,
      visualScene: ml.visualScene,
    };
    fs.writeFileSync(
      path.join(mlDir, 'meta.json'),
      JSON.stringify(mlMeta, null, 2),
      'utf-8'
    );
  }

  // 6. Starter Files (the 5 scaffolded OTP modules)
  const starterDir = path.join(capstoneDir, 'starter');
  ensureDir(starterDir);
  for (const [relPath, content] of Object.entries(CH12_STARTER_FILES)) {
    const targetFile = path.join(starterDir, relPath);
    ensureDir(path.dirname(targetFile));
    fs.writeFileSync(targetFile, content, 'utf-8');
  }

  // 7. Solution Files (the 5 verified reference OTP modules)
  const solutionDir = path.join(capstoneDir, 'solution');
  ensureDir(solutionDir);
  for (const [relPath, content] of Object.entries(CH12_SOLUTION_FILES)) {
    const targetFile = path.join(solutionDir, relPath);
    ensureDir(path.dirname(targetFile));
    fs.writeFileSync(targetFile, content, 'utf-8');
  }
}

function runDecomposition() {
  console.log('Starting BeamForge Curriculum Decomposition...');
  console.log(`Target directory: ${CURRICULUM_ROOT}`);

  ensureDir(CURRICULUM_ROOT);

  let totalChapters = 0;
  let totalLessons = 0;

  for (let chNum = 1; chNum <= 12; chNum++) {
    const chNumStr = String(chNum).padStart(2, '0');
    const chSlug = sanitizeSlug(CHAPTER_TITLES[chNum] || `Chapter_${chNum}`);
    const chDir = path.join(CURRICULUM_ROOT, `chapter_${chNumStr}_${chSlug}`);
    ensureDir(chDir);

    if (chNum === 12) {
      decomposeChapter12(chDir);
      totalChapters++;
      totalLessons += 1;
      console.log(`  Decomposed Chapter 12 (Capstone Studio with 6 milestones and 5 OTP modules)`);
      continue;
    }

    const lessons = ALL_CURRICULUM_CHAPTERS[chNum] || [];

    // Chapter metadata
    const chMeta = {
      chapterNumber: chNum,
      title: CHAPTER_TITLES[chNum],
      lessonCount: lessons.length,
    };
    fs.writeFileSync(
      path.join(chDir, 'chapter.json'),
      JSON.stringify(chMeta, null, 2),
      'utf-8'
    );

    for (let lIdx = 0; lIdx < lessons.length; lIdx++) {
      const lesson = lessons[lIdx];
      const lNumStr = String(lIdx + 1).padStart(2, '0');
      const lSlug = sanitizeSlug(lesson.title);
      const lectureDir = path.join(chDir, `lecture_${lNumStr}_${lSlug}`);

      decomposeStandardLesson(lesson, lectureDir);
      totalLessons++;
    }

    totalChapters++;
    console.log(`  Decomposed Chapter ${chNumStr}: ${lessons.length} lectures -> ${path.basename(chDir)}`);
  }

  console.log('\nCurriculum Decomposition Complete!');
  console.log(`  Total Chapters: ${totalChapters}`);
  console.log(`  Total Lectures: ${totalLessons}`);
  console.log(`  Output Path: ${CURRICULUM_ROOT}`);
}

runDecomposition();

/**
 * BeamForge Curriculum Consolidation Script
 * 
 * Aggregates all 12 chapter TypeScript files (`ch01.ts` through `ch12.ts`)
 * into a single unified file with a clean Table of Contents and searchable
 * delimiters, ready to be ingested by any AI for deep curriculum analysis.
 * 
 * Usage:
 *   node scripts/export_all_chapters.js
 */

const fs = require('fs');
const path = require('path');

const CHAPTERS_DIR = path.join(__dirname, '..', 'apps', 'web-ide', 'src', 'data', 'chapters');
const OUTPUT_TXT = path.join(__dirname, '..', 'ALL_CHAPTERS_CONSOLIDATED.txt');
const OUTPUT_MD = path.join(__dirname, '..', 'ALL_CHAPTERS_CONSOLIDATED.md');

const CHAPTER_FILES = [
  'ch01.ts',
  'ch02.ts',
  'ch03.ts',
  'ch04.ts',
  'ch05.ts',
  'ch06.ts',
  'ch07.ts',
  'ch08.ts',
  'ch09.ts',
  'ch10.ts',
  'ch11.ts',
  'ch12.ts',
];

function buildHeader() {
  const dateStr = new Date().toISOString();
  return `# BEAMFORGE COMPLETE 12-CHAPTER CURRICULUM DUMP
Generated At: ${dateStr}
Platform: BeamForge (Erlang/OTP, Concurrency, Distributed TCP & XMPP)
Total Chapters: 12

================================================================================
TABLE OF CONTENTS
================================================================================
- CHAPTER 01: Functional Foundations (Atoms, Tuples, Lists, Pattern Matching, Arity)
- CHAPTER 02: Control Flow, Guards, Accumulators & Tail-Call Optimization (TCO)
- CHAPTER 03: Higher-Order Functions (maps, filters, folds, closures, list comprehensions)
- CHAPTER 04: Maps, Records, Binary Bit-Syntax & Zero-Copy IOLists
- CHAPTER 05: Concurrency & The Actor Model (PIDs, Mailboxes, Selective Receive)
- CHAPTER 06: Fault Tolerance (Links, Monitors, Trapping Exits & my_gen_server)
- CHAPTER 07: OTP Core Behaviours (gen_server, gen_statem, gen_event & sys:get_state)
- CHAPTER 08: Supervision Trees (one_for_one, rest_for_one, dynamic pools, releases)
- CHAPTER 09: Distributed Systems & State (ETS, Mnesia, pg PubSub, Dialyzer)
- CHAPTER 10: Raw TCP Backends (gen_tcp, {active, once} backpressure, Acceptor Pools)
- CHAPTER 11: Guided XMPP Protocol Deep Dive (RFC 6120/6121 XML Streams, SASL, Presence)
- CHAPTER 12: Production XMPP Server Capstone (5 OTP Modules + Live Chaos Monkey)

================================================================================
INSTRUCTIONS FOR ANALYZING AI:
- Each chapter contains TypeScript objects representing lessons ('LessonContent').
- Key fields to evaluate per lesson:
  * 'id', 'title', 'difficulty', 'lessonType' ('concept_and_code' | 'guided_demo' | 'problem_set' | 'incident_triage' | 'capstone_studio')
  * 'conceptMarkdown': Pedagogical guide, Erlang mental models, BEAM memory architecture.
  * 'starterCode' / 'files': Starter template provided to learner (% TODO challenges).
  * 'solutionCode' / 'solutionFiles': Official reference solution.
  * 'visibleTestCases': EUnit call expressions, expected return terms, and pedagogical explanations.
  * 'astRules': AST checks enforced on Submit (tail recursion bytecode, forbidden calls).
  * 'mentalModelCheck': Formative multiple-choice questions reinforcing core BEAM invariants.
  * 'otpDocCards': Curated official OTP documentation references and complexity notes.
================================================================================
\n\n`;
}

function run() {
  console.log('🔄 Consolidating BeamForge curriculum from:', CHAPTERS_DIR);
  let consolidatedContent = buildHeader();
  let totalChars = 0;
  let totalLines = 0;

  for (let i = 0; i < CHAPTER_FILES.length; i++) {
    const fileName = CHAPTER_FILES[i];
    const filePath = path.join(CHAPTERS_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Warning: ${filePath} not found, skipping.`);
      continue;
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lineCount = fileContent.split('\n').length;
    totalLines += lineCount;
    totalChars += fileContent.length;

    console.log(`  ✓ Ingested ${fileName} (${lineCount} lines, ${(fileContent.length / 1024).toFixed(1)} KB)`);

    const chapterNum = i + 1;
    const separator = `
/*******************************************************************************
 * ══════════════════════════════════════════════════════════════════════════════
 * START OF CHAPTER ${chapterNum.toString().padStart(2, '0')}: ${fileName}
 * Path: apps/web-ide/src/data/chapters/${fileName}
 * Lines: ${lineCount}
 * ══════════════════════════════════════════════════════════════════════════════
 ******************************************************************************/
\n`;

    const chapterEnd = `
/*******************************************************************************
 * END OF CHAPTER ${chapterNum.toString().padStart(2, '0')}: ${fileName}
 ******************************************************************************/
\n`;

    consolidatedContent += separator + fileContent + chapterEnd;
  }

  // Write TXT version
  fs.writeFileSync(OUTPUT_TXT, consolidatedContent, 'utf8');
  console.log(`\n🎉 Created consolidated file: ${OUTPUT_TXT}`);
  console.log(`   Total Size: ${(totalChars / 1024).toFixed(1)} KB`);
  console.log(`   Total Lines: ${totalLines}`);

  // Write MD version
  fs.writeFileSync(OUTPUT_MD, consolidatedContent, 'utf8');
  console.log(`🎉 Created markdown copy: ${OUTPUT_MD}`);
}

run();


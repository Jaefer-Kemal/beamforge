const fs = require('fs');
const path = require('path');

const ch06Path = path.join(__dirname, '..', 'apps', 'web-ide', 'src', 'data', 'chapters', 'ch06.ts');
let content = fs.readFileSync(ch06Path, 'utf8');

// We have 10 lessons. Let's find each lesson block and insert starterCode & solutionCode
const lessonSplits = content.split(/\n  \/\/ ── Lesson 6\./);
console.log(`Found ${lessonSplits.length - 1} lesson blocks.`);

const header = lessonSplits[0];
const processedBlocks = [header];

for (let i = 1; i < lessonSplits.length; i++) {
  const block = lessonSplits[i];

  // extract content from files: [ { ... content: `...` } ]
  const contentIdx = block.indexOf('content: `');
  if (contentIdx === -1) {
    console.error(`Lesson ${i} has no content: \``);
    process.exit(1);
  }
  const contentStart = contentIdx + 'content: `'.length;
  const contentEnd = block.indexOf('`,\n      },\n    ],', contentStart);
  if (contentEnd === -1) {
    console.error(`Lesson ${i} could not find content end backtick`);
    process.exit(1);
  }
  const starterCode = block.substring(contentStart, contentEnd);

  // extract code from solutionFiles: { 'src/...': `...` }
  const sfIdx = block.indexOf('solutionFiles: {');
  if (sfIdx === -1) {
    console.error(`Lesson ${i} has no solutionFiles`);
    process.exit(1);
  }
  const sfTickStart = block.indexOf('`: `', sfIdx) !== -1 ? block.indexOf('`: `', sfIdx) + 4 : block.indexOf('`: `', sfIdx);
  // Actually let's find the first backtick after sfIdx
  const firstTick = block.indexOf('`', sfIdx);
  const secondTick = block.indexOf('`,\n    },', firstTick + 1);
  if (secondTick === -1) {
    console.error(`Lesson ${i} could not find solutionFiles end backtick`);
    process.exit(1);
  }
  const solutionCode = block.substring(firstTick + 1, secondTick);

  // insert starterCode and solutionCode right before `files: [`
  const filesIdx = block.indexOf('files: [');
  const newBlock = block.substring(0, filesIdx) +
    `starterCode: \`${starterCode}\`,\n    solutionCode: \`${solutionCode}\`,\n    ` +
    block.substring(filesIdx);

  processedBlocks.push(newBlock);
}

const newContent = processedBlocks.join('\n  // ── Lesson 6.');
fs.writeFileSync(ch06Path, newContent, 'utf8');
console.log('Successfully updated ch06.ts with starterCode and solutionCode!');

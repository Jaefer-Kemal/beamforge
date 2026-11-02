const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outDir = path.join(__dirname, '..', 'scratch', 'test_erl_compile_ch08');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Evaluate ch08.ts by extracting CHAPTER_8_LESSONS
// Or load the compiled JS / TS using ts-node or esbuild or quick regex parser
const ch08Path = path.join(__dirname, '..', 'apps', 'web-ide', 'src', 'data', 'chapters', 'ch08.ts');
const content = fs.readFileSync(ch08Path, 'utf8');

// Quick parser for starterCode, solutionCode, files, solutionFiles
const lessons = content.split(/id:\s*'(ch08-l\d+)'/);

let compileCount = 0;

for (let i = 1; i < lessons.length; i += 2) {
  const lessonId = lessons[i];
  const chunk = lessons[i + 1];

  console.log(`\n================ Checking ${lessonId} ================`);

  // Extract solutionCode if single-file or primary
  const solMatch = chunk.match(/solutionCode:\s*`([^`]+)`/);
  if (solMatch) {
    const code = solMatch[1];
    const modMatch = code.match(/-module\(([^)]+)\)\./);
    if (modMatch) {
      const modName = modMatch[1];
      const filePath = path.join(outDir, `${modName}.erl`);
      fs.writeFileSync(filePath, code, 'utf8');
      console.log(`  Compiling solutionCode: ${modName}.erl ...`);
      try {
        execSync(`erlc.exe -o "${outDir}" "${filePath}"`, { stdio: 'pipe' });
        console.log(`    -> OK: ${modName}.beam`);
        compileCount++;
      } catch (err) {
        console.error(`    -> ERROR compiling ${modName}.erl:`, err.stderr ? err.stderr.toString() : err.message);
        process.exit(1);
      }
    }
  }

  // Extract solutionFiles if multi-file
  const sfIdx = chunk.indexOf('solutionFiles:');
  if (sfIdx !== -1) {
    const endSf = chunk.indexOf('visibleTestCases:', sfIdx);
    const sfBlock = chunk.substring(sfIdx, endSf !== -1 ? endSf : undefined);
    const fileMatches = [...sfBlock.matchAll(/'([^']+\.erl)':\s*`([^`]+)`/g)];
    for (const fm of fileMatches) {
      const relPath = fm[1];
      const code = fm[2];
      const fileName = path.basename(relPath);
      const filePath = path.join(outDir, fileName);
      fs.writeFileSync(filePath, code, 'utf8');
      console.log(`  Compiling solutionFile: ${fileName} ...`);
      try {
        execSync(`erlc.exe -o "${outDir}" "${filePath}"`, { stdio: 'pipe' });
        console.log(`    -> OK: ${fileName}`);
        compileCount++;
      } catch (err) {
        console.error(`    -> ERROR compiling ${fileName}:`, err.stderr ? err.stderr.toString() : err.message);
        process.exit(1);
      }
    }
  }
}

console.log(`\nSuccessfully compiled all ${compileCount} Erlang modules for Chapter 8 cleanly with erlc.exe!`);

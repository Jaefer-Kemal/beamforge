const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ch06Path = path.join(__dirname, '..', 'apps', 'web-ide', 'src', 'data', 'chapters', 'ch06.ts');
const content = fs.readFileSync(ch06Path, 'utf8');

const outDir = path.join(__dirname, '..', 'test_erl_compile_ch06');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

let count = 0;
let pos = 0;

while (true) {
  const sfIdx = content.indexOf('solutionFiles:', pos);
  if (sfIdx === -1) break;

  const keyStart = content.indexOf("'src/", sfIdx);
  if (keyStart === -1 || keyStart - sfIdx > 50) break;
  const keyEnd = content.indexOf("':", keyStart);
  const fullPath = content.substring(keyStart + 1, keyEnd);
  const fileName = path.basename(fullPath);

  const tickStart = content.indexOf('`', keyEnd);
  const tickEnd = content.indexOf('`', tickStart + 1);
  const code = content.substring(tickStart + 1, tickEnd);

  // find lesson id before sfIdx
  const prevChunk = content.substring(Math.max(0, sfIdx - 3000), sfIdx);
  const idMatch = prevChunk.match(/id:\s*'(ch06-l\d+)'/g);
  const lessonId = idMatch ? idMatch[idMatch.length - 1].match(/'([^']+)'/)[1] : 'unknown';

  const filePath = path.join(outDir, fileName);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`[${lessonId}] Compiling ${fileName}...`);
  try {
    execSync(`erlc.exe -o "${outDir}" "${filePath}"`, { stdio: 'pipe' });
    console.log(`  -> SUCCESS: ${fileName}`);
    count++;
  } catch (err) {
    console.error(`  -> ERROR in ${fileName}:`, err.stderr ? err.stderr.toString() : err.message);
    process.exit(1);
  }

  pos = tickEnd + 1;
}

console.log(`\nSuccessfully compiled all ${count} Erlang modules cleanly with erlc.exe!`);

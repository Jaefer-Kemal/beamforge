const fs = require('fs');
const path = require('path');

const TIER_MAP = {
  guided_demo: 50,
  concept_exercise: 100,
  incident_triage: 175,
  problem_set: 250,
  capstone_milestone: 400,
  capstone_studio: 750,
};

let updatedLessons = 0;
let totalPlatformXp = 0;

for (let ch = 1; ch <= 12; ch++) {
  const pad = ch < 10 ? '0' + ch : '' + ch;
  const filePath = path.join('apps/web-ide/src/data/chapters', `ch${pad}.ts`);
  let content = fs.readFileSync(filePath, 'utf8');

  // Regex to match each lesson block and ensure xpReward is properly set
  // We look for difficulty: '...' and inject/replace xpReward right after difficulty
  // Or match existing xpReward: \d+
  
  // Split into lesson chunks
  const parts = content.split(/(\n\s*\{\s*\n\s*id:\s*['"](?:ch\d+-[a-zA-Z0-9_]+|m\d+-[a-zA-Z0-9_]+)['"])/);
  
  for (let i = 1; i < parts.length; i += 2) {
    const header = parts[i];
    let body = parts[i + 1];
    
    // Determine lessonType
    const typeMatch = body.match(/lessonType:\s*['"]([^'"]+)['"]/);
    let type = typeMatch ? typeMatch[1] : (ch === 12 ? 'capstone_milestone' : 'concept_exercise');
    
    const idMatch = header.match(/id:\s*['"]([^'"]+)['"]/);
    const id = idMatch ? idMatch[1] : '';

    let xp = TIER_MAP[type] || 100;
    if (ch === 12) {
      if (id.includes('m6') || id.includes('capstone')) {
        xp = 750;
      } else {
        xp = 400;
      }
    }

    totalPlatformXp += xp;
    updatedLessons++;

    // Replace existing xpReward if present, otherwise inject after difficulty
    if (/xpReward:\s*\d+,?/.test(body)) {
      body = body.replace(/xpReward:\s*\d+,?/, `xpReward: ${xp},`);
    } else {
      body = body.replace(/(difficulty:\s*['"][^'"]+['"],)/, `$1\n    xpReward: ${xp},`);
    }

    parts[i + 1] = body;
  }

  content = parts.join('');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated Ch ${ch}: ${filePath}`);
}

console.log(`\nSuccessfully applied tiered XP to ${updatedLessons} lessons!`);
console.log(`Total Platform XP Available: ${totalPlatformXp} XP`);


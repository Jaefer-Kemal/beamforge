const fs = require('fs');
const content = fs.readFileSync('apps/web-ide/src/data/chapters/ch09.ts', 'utf8');
const matches = [...content.matchAll(/id:\s*'(ch09-l\d+)'/g)];
for (const m of matches) {
  console.log(m[1]);
}


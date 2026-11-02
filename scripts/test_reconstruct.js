const fs = require('fs');

const ch09 = fs.readFileSync('apps/web-ide/src/data/chapters/ch09.ts', 'utf8');

// For lessons 1 to 7:
const mods = {
  'ch09-l01': 'ets_telemetry',
  'ch09-l02': 'ets_query_engine',
  'ch09-l03': 'ets_heir_handshake',
  'ch09-l04': 'cluster_pubsub_pg',
  'ch09-l05': 'mnesia_ledger',
  'ch09-l06': 'ledger_specs_and_tests',
  'ch09-l07': 'incident_ets_wipeout',
};

// Let's verify we can cleanly extract visibleTestCases and astRules
for (let l = 1; l <= 7; l++) {
  const id = `ch09-l0${l}`;
  const idx = ch09.indexOf(`id: '${id}'`);
  const nextIdx = l === 7 ? ch09.indexOf("id: 'ch09-l08'") : ch09.indexOf(`id: 'ch09-l0${l+1}'`);
  const chunk = ch09.slice(idx, nextIdx);

  const starterPos = chunk.indexOf('starterCode: `');
  const starterEnd = chunk.indexOf('`,\n    solutionCode: `');
  const starterCode = chunk.slice(starterPos + 'starterCode: `'.length, starterEnd);

  const solPos = starterEnd + '`,\n    solutionCode: `'.length;
  // In solutionCode, where does the real solution code end?
  // It ends before the duplicated visibleTestCases or files block
  const solEnd = chunk.indexOf('`,\n    visibleTestCases: [', solPos);
  const solCode = chunk.slice(solPos, solEnd);

  const vtcPos = chunk.indexOf('visibleTestCases: [', solEnd);
  const vtcEnd = chunk.indexOf('astRules: {', vtcPos);
  const vtcBlock = chunk.slice(vtcPos, vtcEnd).trim();

  const astPos = vtcEnd;
  const astEnd = chunk.indexOf('solutionExplanation:', astPos);
  let astBlock = chunk.slice(astPos, astEnd).trim();
  // Clean up any trailing }, from astBlock
  if (astBlock.endsWith('},\n    },')) {
    astBlock = astBlock.slice(0, -6).trim();
  } else if (astBlock.endsWith('},')) {
    astBlock = astBlock.trim();
  }

  const expPos = astEnd;
  const expBlock = chunk.slice(expPos).trim();

  console.log(`${id}: starterCode len=${starterCode.length}, solCode len=${solCode.length}, vtc len=${vtcBlock.length}, ast len=${astBlock.length}`);
}


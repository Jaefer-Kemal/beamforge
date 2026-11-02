const fs = require('fs');
let ch09 = fs.readFileSync('apps/web-ide/src/data/chapters/ch09.ts', 'utf8');

// For lessons 1 through 7 in Chapter 9, fix the misplaced visibleTestCases inside solutionFiles
for (let l = 1; l <= 7; l++) {
  const id = `ch09-l0${l}`;
  const lIdx = ch09.indexOf(`id: '${id}'`);
  const nextLIdx = l === 7 ? ch09.indexOf("id: 'ch09-l08'") : ch09.indexOf(`id: 'ch09-l0${l+1}'`);
  let chunk = ch09.slice(lIdx, nextLIdx);

  // Look for the end of solutionFiles code string before visibleTestCases
  const vtcMarker = '\n    visibleTestCases: [';
  const vtcPos = chunk.indexOf(vtcMarker);
  if (vtcPos !== -1) {
    // Check if right before vtcMarker is not closed
    const beforeVtc = chunk.slice(0, vtcPos);
    if (!beforeVtc.endsWith('\n    },') && !beforeVtc.endsWith('\n    solutionFiles: {')) {
      // It needs \n    },
      chunk = chunk.slice(0, vtcPos) + '\n    },' + chunk.slice(vtcPos);
    }
  }

  // Look for the extra }, before solutionExplanation:
  const extraBraceMarker = '    },\n    },\nsolutionExplanation:';
  if (chunk.includes(extraBraceMarker)) {
    chunk = chunk.replace(extraBraceMarker, '    },\n    solutionExplanation:');
  }
  const extraBraceMarker2 = '    },\n    },\n    solutionExplanation:';
  if (chunk.includes(extraBraceMarker2)) {
    chunk = chunk.replace(extraBraceMarker2, '    },\n    solutionExplanation:');
  }

  ch09 = ch09.slice(0, lIdx) + chunk + ch09.slice(nextLIdx);
  console.log(`Fixed structure for ${id}`);
}

fs.writeFileSync('apps/web-ide/src/data/chapters/ch09.ts', ch09);
console.log('Saved corrected ch09.ts');


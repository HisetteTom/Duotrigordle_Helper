// Board parsing and analysis functions

function getBoards() {
  return Array.from(document.querySelectorAll('div[class^="_board_"]'));
}

function detectCellState(cellEl) {
  const span = cellEl.querySelector('span');
  const cellCls = (cellEl.className || '').toLowerCase();
  const spanCls = span ? (span.className || '').toLowerCase() : '';
  const dataState = span ? (span.getAttribute('data-state') || '').toLowerCase() : '';

  if (cellCls.includes('_green_') || spanCls.includes('_green_') || dataState === 'correct' || cellCls.includes('correct')) return 'green';
  if (cellCls.includes('_yellow_') || spanCls.includes('_yellow_') || dataState === 'present' || cellCls.includes('present')) return 'yellow';
  if (cellCls.includes('_black_') || spanCls.includes('_black_') || dataState === 'absent' || cellCls.includes('absent')) return 'black';
  return null;
}

function parseBoard(boardEl) {
  const allCells = Array.from(boardEl.querySelectorAll('div[class*="_cell_"]'));
  const rows = [];
  for (let i = 0; i < Math.floor(allCells.length / 5); i++) {
    rows.push(allCells.slice(i*5, i*5 + 5));
  }

  // Initialize constraints with new structure
  const letterInfo = {};
  const constraints = {
    correct: Array(5).fill(null),
    present: new Set(),
    absent: new Set(),
    presentPositions: {}
  };

  // First pass: Collect all letter information
  rows.forEach(row => {
    row.forEach((cell, pos) => {
      const span = cell.querySelector('span');
      const letter = span?.textContent?.trim().toLowerCase() || '';
      if (!letter) return;

      const state = detectCellState(cell);
      if (!state) return;

      if (!letterInfo[letter]) {
        letterInfo[letter] = {
          greenPositions: new Set(),
          yellowPositions: new Set(),
          blackPositions: new Set(),
          minCount: 0,
          maxCount: 5
        };
      }

      const info = letterInfo[letter];

      switch(state) {
        case 'green':
          info.greenPositions.add(pos);
          constraints.correct[pos] = letter;
          constraints.present.add(letter);
          info.minCount = Math.max(info.minCount, info.greenPositions.size);
          break;

        case 'yellow':
          info.yellowPositions.add(pos);
          constraints.present.add(letter);
          if (!constraints.presentPositions[letter]) {
            constraints.presentPositions[letter] = new Set();
          }
          constraints.presentPositions[letter].add(pos);
          info.minCount = Math.max(info.minCount,
            info.greenPositions.size + info.yellowPositions.size);
          break;

        case 'black':
          info.blackPositions.add(pos);
          break;
      }
    });
  });

  // Calculate final min/max counts
  const minCounts = {};
  const maxCounts = {};

  for (const [letter, info] of Object.entries(letterInfo)) {
    const greenCount = info.greenPositions.size;
    const yellowCount = info.yellowPositions.size;

    minCounts[letter] = greenCount;
    if (yellowCount > 0) {
      minCounts[letter] = Math.max(minCounts[letter], greenCount + 1);
    }

    if (info.blackPositions.size > 0) {
      if (greenCount > 0 || yellowCount > 0) {
        maxCounts[letter] = greenCount + (yellowCount > 0 ? 1 : 0);
      } else {
        maxCounts[letter] = 0;
        constraints.absent.add(letter);
      }
    } else {
      maxCounts[letter] = 5;
    }
  }

  // Calculate statistics
  const greenCount = constraints.correct.filter(c => c !== null).length;
  const yellowCount = new Set([...Object.keys(constraints.presentPositions)]).size;

  return {
    constraints,
    minCounts,
    maxCounts,
    letterInfo,
    greenCount,
    yellowCount,
    known: greenCount + yellowCount
  };
}

function rankBoards() {
  const boards = getBoards();
  const list = [];
  boards.forEach((b, idx) => {
    try {
      const parsed = parseBoard(b);
      if (parsed.greenCount === 5 && b.querySelector('._cell_1277w_56').closest('div[class*="_dimmed_"]')) return;
      list.push({ index: idx, parsed });
    } catch (err) {
      console.error('parseBoard error', err);
    }
  });
  list.sort((a, b) => {
    if (b.parsed.known !== a.parsed.known) return b.parsed.known - a.parsed.known;
    return b.parsed.greenCount - a.parsed.greenCount;
  });
  return list;
}

window.getBoards = getBoards
window.parseBoard = parseBoard;
window.rankBoards = rankBoards;
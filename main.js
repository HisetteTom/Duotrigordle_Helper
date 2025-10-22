// ==UserScript==
// @name         Duotrigordle Helper (Official Wordle Words)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Uses official Wordle word list with improved letter matching logic
// @match        https://duotrigordle.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
  'use strict';

  // ---------- Config ----------
  const WORD_LIST_URL = 'https://gist.githubusercontent.com/dracos/dd0668f281e685bad51479e5acaadb93/raw/6bfa15d263d6d5b63840a8e5b64e04b382fdb079/valid-wordle-words.txt';
  const FALLBACK_DELAY_MS = 5000;

  // ---------- State ----------
  let paused = false;
  let runningAttempt = false;
  let panelVisible = true;
  let isDragging = false;
  let xOffset = 0, yOffset = 0, initialX = 0, initialY = 0;
  let lastRowStates = '';

  // ---------- UI ----------
  const panel = document.createElement('div');
  panel.id = 'duo-helper-panel';
  panel.innerHTML = `
    <div id="duo-helper-header" style="display:flex;justify-content:space-between;align-items:center;background:#6aaa64;padding:8px;border-radius:6px 6px 0 0;cursor:move;">
      <div style="display:flex;gap:8px;align-items:center">
        <span id="duo-helper-title" style="font-weight:700;color:black;">Duotrigordle Helper</span>
        <button id="duo-helper-runstate" title="Start/Stop helper" style="background:#ffffff;border:1px solid #bfbfbf;padding:4px 8px;border-radius:6px;cursor:pointer;color:black;font-weight:600">Stop</button>
      </div>
      <button id="duo-helper-close" title="Close panel" style="background:none;border:none;color:black;font-size:18px;cursor:pointer">×</button>
    </div>
    <div id="duo-helper-content" style="padding:10px;background:white;">
      <div id="duo-helper-list" style="min-height:60px;color:black;">Waiting for guesses...</div>
      <div id="duo-helper-stats" style="font-size:12px;color:#444;margin-top:8px;"></div>
    </div>
  `;

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'duo-helper-toggle';
  toggleBtn.textContent = 'Show Helper';
  Object.assign(toggleBtn.style, {
    position: 'fixed',
    top: '100px',
    right: '20px',
    padding: '8px 12px',
    borderRadius: '6px',
    background: '#6aaa64',
    color: 'black',
    border: 'none',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    zIndex: 9999,
    display: 'none'
  });

  const style = document.createElement('style');
  style.textContent = `
    #duo-helper-panel { position: fixed; top: 100px; right: 20px; width: 360px; background: white; border: 2px solid #d0d0d0; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 10000; font-family: Arial, Helvetica, sans-serif; color: black; }
    .duo-helper-word { padding: 8px 10px; margin: 6px 0; background: #f5f5f5; border-radius: 6px; cursor: pointer; color: black; }
    .duo-helper-word:hover { background: #e8e8e8; }
    .duo-helper-loading { color: #444; font-style: italic; padding: 8px 0; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(panel);
  document.body.appendChild(toggleBtn);

  // Dragging
  const header = document.getElementById('duo-helper-header');
  header.addEventListener('mousedown', (e) => {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    if (e.target.closest('#duo-helper-header')) isDragging = true;
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    xOffset = e.clientX - initialX;
    yOffset = e.clientY - initialY;
    panel.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
  });
  document.addEventListener('mouseup', () => { isDragging = false; });

  // Close / Toggle
  document.getElementById('duo-helper-close').addEventListener('click', () => {
    panel.style.display = 'none';
    toggleBtn.style.display = 'block';
    panelVisible = false;
  });
  toggleBtn.addEventListener('click', () => {
    panel.style.display = 'block';
    toggleBtn.style.display = 'none';
    panelVisible = true;
    updateSuggestions();
  });

  // Start/Stop button (plain text)
  const runBtn = document.getElementById('duo-helper-runstate');
  runBtn.addEventListener('click', () => {
    paused = !paused;
    runBtn.textContent = paused ? 'Start' : 'Stop';
    if (!paused) {
      updateSuggestions();
    } else {
      runningAttempt = false;
      document.getElementById('duo-helper-list').innerHTML = `<div style="color:#666">Paused</div>`;
      document.getElementById('duo-helper-stats').textContent = '';
    }
  });

  // ---------- Robust detection & parsing ----------
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

    // Second pass: Calculate final min/max counts
    const minCounts = {};
    const maxCounts = {};

    for (const [letter, info] of Object.entries(letterInfo)) {
        const greenCount = info.greenPositions.size;
        const yellowCount = info.yellowPositions.size;

        // Minimum count is at least the number of greens
        minCounts[letter] = greenCount;

        // Add yellows to minimum count only if they're in different positions than greens
        if (yellowCount > 0) {
            // Yellow suggests at least one more occurrence beyond the greens
            minCounts[letter] = Math.max(minCounts[letter], greenCount + 1);
        }

        // Maximum count calculation
        if (info.blackPositions.size > 0) {
            if (greenCount > 0 || yellowCount > 0) {
                // We have both positive and negative clues
                // Max count is what we've seen in greens plus at most one more for yellows
                maxCounts[letter] = greenCount + (yellowCount > 0 ? 1 : 0);
            } else {
                // Only negative clues
                maxCounts[letter] = 0;
                constraints.absent.add(letter);
            }
        } else {
            // No negative clues, could be up to 5
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

function wordMatchesWithCounts(word, parsed) {
    // Check green letters first (must match exactly)
    for (let i = 0; i < 5; i++) {
        if (parsed.constraints.correct[i] && word[i] !== parsed.constraints.correct[i]) {
            return false;
        }
    }

    // Build letter frequency map for the word
    const letterCounts = {};
    for (const ch of word) {
        letterCounts[ch] = (letterCounts[ch] || 0) + 1;
    }

    // Check letter counts against constraints
    for (const letter in parsed.minCounts) {
        const count = letterCounts[letter] || 0;
        if (count < parsed.minCounts[letter]) return false;
        if (parsed.maxCounts[letter] !== undefined && count > parsed.maxCounts[letter]) return false;
    }

    // Check yellow letter positions
    for (const [letter, positions] of Object.entries(parsed.constraints.presentPositions)) {
        // Letter must exist in word
        if (!word.includes(letter)) return false;

        // Letter can't be in forbidden positions
        for (const pos of positions) {
            if (word[pos] === letter) return false;
        }
    }

    // Check absent letters
    for (const letter of parsed.constraints.absent) {
        if (word.includes(letter)) return false;
    }

    // Additional check for optimal yellow letter placement
    for (const [letter, info] of Object.entries(parsed.letterInfo)) {
        if (info.yellowPositions.size > 0) {
            // If there's only one possible position left for a yellow letter, it must be there
            const availablePositions = new Set([0,1,2,3,4]);
            for (const pos of info.greenPositions) availablePositions.delete(pos);
            for (const pos of info.yellowPositions) availablePositions.delete(pos);

            if (availablePositions.size === 1 && letterCounts[letter] === 1) {
                const mustBePosition = Array.from(availablePositions)[0];
                if (word[mustBePosition] !== letter) return false;
            }
        }
    }

    return true;
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

  let wordleWords = [];

  // Fetch official Wordle word list
  function initializeWordList() {
    GM_xmlhttpRequest({
      method: 'GET',
      url: WORD_LIST_URL,
      onload: function(response) {
        wordleWords = response.responseText.toLowerCase().split('\n')
          .map(word => word.trim())
          .filter(word => word.length === 5);
        console.log(`Loaded ${wordleWords.length} valid Wordle words`);
      }
    });
  }

  function countLetter(word, letter) {
    let c = 0;
    for (let i = 0; i < word.length; i++) if (word[i] === letter) c++;
    return c;
  }

  function wordMatchesWithCounts(word, parsed) {
    const c = parsed.constraints;

    // 1. Check green letters first (exact positions)
    for (let i = 0; i < 5; i++) {
      if (c.correct[i] && word[i] !== c.correct[i]) return false;
    }

    // Build letter frequency map for the word
    const letterCounts = {};
    for (const ch of word) {
      letterCounts[ch] = (letterCounts[ch] || 0) + 1;
    }

    // 2. Track remaining letters after accounting for greens
    const remainingCounts = {...letterCounts};
    for (let i = 0; i < 5; i++) {
      if (c.correct[i]) {
        remainingCounts[c.correct[i]]--;
      }
    }

    // 3. Check yellow letter positions and remaining counts
    for (const [letter, positions] of Object.entries(c.presentPositions)) {
      // Skip if this yellow is just confirming a letter we already have in green
      const greenCount = c.correct.filter(l => l === letter).length;
      const remaining = remainingCounts[letter] || 0;

      // If we have remaining occurrences after greens
      if (remaining > 0) {
        // Letter can't be in yellow positions
        for (const pos of positions) {
          if (word[pos] === letter) return false;
        }

        // For remaining letters after greens, find valid positions
        const availablePositions = new Set([0,1,2,3,4]);

        // Remove green and yellow positions
        for (let i = 0; i < 5; i++) {
          if (c.correct[i] === letter) availablePositions.delete(i);
        }
        positions.forEach(pos => availablePositions.delete(pos));

        // If we only have one spot left for a remaining letter, it must go there
        if (availablePositions.size === remaining) {
          for (const mustBePosition of availablePositions) {
            if (word[mustBePosition] !== letter) return false;
          }
        }
      }
    }

    // 4. Check absent letters (black tiles)
    for (const letter of c.absent) {
      if (letterCounts[letter] > 0) return false;
    }

    // 5. Ensure all required letters are present
    for (const letter of c.present) {
      if (!word.includes(letter)) return false;
    }

    return true;
  }

  async function tryBoard(entry) {
    const idx = entry.index;
    const parsed = entry.parsed;
    const listEl = document.getElementById('duo-helper-list');
    const statsEl = document.getElementById('duo-helper-stats');
    const titleEl = document.getElementById('duo-helper-title');

    titleEl.textContent = `Board #${idx+1} — ${parsed.greenCount} green + ${parsed.yellowCount} yellow`;
    listEl.innerHTML = `<div class="duo-helper-loading">Trying board #${idx+1} — ${parsed.greenCount}G ${parsed.yellowCount}Y...</div>`;
    statsEl.textContent = 'Finding matches...';

    const beforeCount = wordleWords.length;
    const filtered = wordleWords.filter(w => wordMatchesWithCounts(w, parsed));
    const afterCount = filtered.length;

    if (afterCount === 0) {
      const constraintsDump = {
        correct: parsed.constraints.correct,
        present: Array.from(parsed.constraints.present || []),
        absent: Array.from(parsed.constraints.absent || []),
        presentPositions: (function(pp) {
          const out = {};
          for (const k in pp) out[k] = Array.from(pp[k]);
          return out;
        })(parsed.constraints.presentPositions || {}),
        minCounts: parsed.minCounts,
        maxCounts: parsed.maxCounts,
        greenCount: parsed.greenCount,
        yellowCount: parsed.yellowCount,
        known: parsed.known,
        rowStates: parsed.rowStates
      };
      console.group(`Duotrigordle Helper — NO MATCH for Board #${idx+1}`);
      console.log('constraints:', constraintsDump);
      console.log('Datamuse candidates fetched:', beforeCount);
      console.log('Candidates after full filter:', afterCount);
      console.groupEnd();
    }

    return { filtered, beforeCount, afterCount, boardIndex: idx };
  }

  async function tryBoardsSequentially(boardList, delayMs = FALLBACK_DELAY_MS) {
    const listEl = document.getElementById('duo-helper-list');
    const statsEl = document.getElementById('duo-helper-stats');

    for (let i = 0; i < boardList.length; i++) {
      if (paused) { listEl.innerHTML = `<div style="color:#666">Paused</div>`; return { success: false }; }

      const entry = boardList[i];
      const parsed = entry.parsed;

      listEl.innerHTML = `<div class="duo-helper-loading">Trying board #${entry.index+1} — ${parsed.greenCount}G ${parsed.yellowCount}Y...</div>`;
      statsEl.textContent = `Attempt ${i+1}/${boardList.length}`;

      const res = await tryBoard(entry);
      if (res.afterCount > 0) {
        showSuggestions(res.filtered);
        return { success: true, boardIndex: res.boardIndex };
      } else {
        listEl.innerHTML = `<div style="color:#c9b458">No matches for board #${entry.index+1}. Trying next in ${Math.round(delayMs/1000)}s...</div>`;
        await new Promise(r => setTimeout(r, delayMs));
      }
    }

    listEl.innerHTML = `<div style="color:#c9b458">No matches found for any of the top boards.</div>`;
    statsEl.textContent = '';
    return { success: false };
  }

  function showSuggestions(words, boardList, currentBoardIndex) {
    const listEl = document.getElementById('duo-helper-list');
    const statsEl = document.getElementById('duo-helper-stats');
    const top = words.slice(0, 10);

    // Create header with stats and next button if there are more boards
    const headerHtml = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span>${words.length} suggestions found (showing ${top.length})</span>
        ${currentBoardIndex + 1 < boardList.length ?
          `<button id="next-board-btn" style="background:#6aaa64;color:white;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;">Next Board →</button>`
          : ''}
      </div>
    `;

    // Show words list
    listEl.innerHTML = headerHtml + top.map((w, i) =>
      `<div class="duo-helper-word"><span style="font-weight:700;color:#6aaa64;margin-right:8px">#${i+1}</span>${w.toUpperCase()}</div>`
    ).join('');

    // Add click handlers for words
    document.querySelectorAll('.duo-helper-word').forEach(el => {
      el.addEventListener('click', () => {
        const word = el.textContent.replace(/^#\d+\s*/, '').trim();
        navigator.clipboard.writeText(word);
        el.style.background = '#6aaa64';
        el.style.color = 'black';
        setTimeout(() => { el.style.background = '#f5f5f5'; el.style.color = 'black'; }, 300);
      });
    });

    // Add click handler for next board button
    const nextBtn = document.getElementById('next-board-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentBoardIndex + 1 < boardList.length) {
          tryNextBoard(boardList, currentBoardIndex + 1);
        }
      });
    }
  }

  async function tryNextBoard(boardList, startIndex) {
    const listEl = document.getElementById('duo-helper-list');
    const statsEl = document.getElementById('duo-helper-stats');

    for (let i = startIndex; i < boardList.length; i++) {
      if (paused) {
        listEl.innerHTML = `<div style="color:#666">Paused</div>`;
        return { success: false };
      }

      const entry = boardList[i];
      const parsed = entry.parsed;

      listEl.innerHTML = `<div class="duo-helper-loading">Trying board #${entry.index+1} — ${parsed.greenCount}G ${parsed.yellowCount}Y...</div>`;
      statsEl.textContent = `Attempt ${i+1}/${boardList.length}`;

      const res = await tryBoard(entry);
      if (res.afterCount > 0) {
        showSuggestions(res.filtered, boardList, i);
        return { success: true, boardIndex: res.boardIndex };
      } else {
        listEl.innerHTML = `<div style="color:#c9b458">No matches for board #${entry.index+1}. Trying next in ${Math.round(FALLBACK_DELAY_MS/1000)}s...</div>`;
        await new Promise(r => setTimeout(r, FALLBACK_DELAY_MS));
      }
    }

    listEl.innerHTML = `<div style="color:#c9b458">No matches found for any of the remaining boards.</div>`;
    statsEl.textContent = '';
    return { success: false };
  }

  async function tryBoardsSequentially(boardList, delayMs = FALLBACK_DELAY_MS) {
    return tryNextBoard(boardList, 0);
  }

  let running = false;
  async function updateSuggestions() {
    if (paused || runningAttempt || !panelVisible) return;
    const ranked = rankBoards();
    if (!ranked || ranked.length === 0) {
      document.getElementById('duo-helper-list').innerHTML = '<div style="color:#444">No boards with clues yet or all boards solved.</div>';
      document.getElementById('duo-helper-stats').textContent = '';
      document.getElementById('duo-helper-title').textContent = 'Duotrigordle Helper';
      return;
    }

    runningAttempt = true;
    try {
      await tryBoardsSequentially(ranked, FALLBACK_DELAY_MS);
    } finally {
      runningAttempt = false;
      lastRowStates = ranked.map(r => r.parsed.rowStates).join('||');
    }
  }

  // ---------- Observer ----------
  let updateTimer;
  const observer = new MutationObserver(mutations => {
    if (paused) return;
    const relevant = mutations.some(m => {
      try {
        if (m.type === 'attributes' && m.target && typeof m.target.className === 'string') {
          if (m.target.className.includes('_cell_') || m.target.className.includes('_board_')) return true;
        }
        if (m.type === 'childList' && m.target && m.target.closest && m.target.closest('div[class^="_board_"]')) return true;
      } catch (e) {}
      return false;
    });
    if (relevant && panelVisible) {
      clearTimeout(updateTimer);
      updateTimer = setTimeout(updateSuggestions, 600);
    }
  });

  function startObserving() {
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  }

  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.keyCode === 13) && !paused) {
      setTimeout(() => {
        clearTimeout(updateTimer);
        updateTimer = setTimeout(updateSuggestions, 800);
      }, 200);
    }
  });

  // Init
  function init() {
    // First load the word list
    initializeWordList();

    // Then initialize the UI and observers
    const poll = setInterval(() => {
      if (getBoards().length && wordleWords.length > 0) {
        clearInterval(poll);
        setTimeout(() => {
          updateSuggestions();
          startObserving();
        }, 800);
      }
    }, 400);
    setTimeout(() => {
      if (wordleWords.length > 0) {
        updateSuggestions();
        startObserving();
      }
    }, 5000);
  }

  init();

})();

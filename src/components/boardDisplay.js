// Board suggestion display logic
function displayBoard(entry) {
  const idx = entry.index;
  const matches = entry.matches;
  const parsed = entry.parsed;
  const listEl = document.getElementById('duo-helper-list');
  const statsEl = document.getElementById('duo-helper-stats');
  const titleEl = document.getElementById('duo-helper-title');

  titleEl.textContent = `Board #${idx+1} — ${parsed.greenCount}G ${parsed.yellowCount}Y — ${matches.length} matches`;
  
  // Show matches
  const top = matches.slice(0, 10);
  listEl.innerHTML = top.map((word, i) =>
    `<div class="duo-helper-word">
      <span style="font-weight:700;color:#6aaa64;margin-right:8px">#${i+1}</span>
      ${word.toUpperCase()}
      ${matches.length === 1 ? '<span style="color:#6aaa64;margin-left:8px">✓ Only match!</span>' : ''}
    </div>`
  ).join('');

  // Add click handlers for copying words
  document.querySelectorAll('.duo-helper-word').forEach(el => {
    el.addEventListener('click', () => {
      const word = el.textContent.replace(/^#\d+\s*/, '').trim();
      navigator.clipboard.writeText(word);
      el.style.background = '#6aaa64';
      el.style.color = 'black';
      setTimeout(() => { el.style.background = '#f5f5f5'; el.style.color = 'black'; }, 300);
    });
  });
  
  // Show stats
  statsEl.textContent = `${matches.length} possible word${matches.length !== 1 ? 's' : ''}`;
}

window.displayBoard = displayBoard;
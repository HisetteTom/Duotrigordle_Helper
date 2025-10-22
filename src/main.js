
class DuotrigordleHelper {
  constructor() {
    this.paused = false;
    this.runningAttempt = false;
    this.panelVisible = true;
    this.isDragging = false;
    this.xOffset = 0;
    this.yOffset = 0;
    this.initialX = 0;
    this.initialY = 0;
    this.lastRowStates = '';
    
    this.panel = null;
    this.toggleBtn = null;
    this.observer = null;
  }

  init() {
    // Initialize UI
    this.initializeUI();
    
    // Initialize word list and start observing
    initializeWordList();
    this.setupBoardObserver();
    
    // Start polling for initial state
    this.startPolling();
  }

  initializeUI() {
    injectStyles();
    this.panel = createHelperPanel();
    this.toggleBtn = createToggleButton();
    
    document.body.appendChild(this.panel);
    document.body.appendChild(this.toggleBtn);
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Panel dragging
    const header = document.getElementById('duo-helper-header');
    header.addEventListener('mousedown', this.handleDragStart.bind(this));
    document.addEventListener('mousemove', this.handleDrag.bind(this));
    document.addEventListener('mouseup', () => { this.isDragging = false; });

    // Close/Toggle buttons
    document.getElementById('duo-helper-close').addEventListener('click', () => {
      this.panel.style.display = 'none';
      this.toggleBtn.style.display = 'block';
      this.panelVisible = false;
    });

    this.toggleBtn.addEventListener('click', () => {
      this.panel.style.display = 'block';
      this.toggleBtn.style.display = 'none';
      this.panelVisible = true;
      this.updateSuggestions();
    });

    // Run state button
    const runBtn = document.getElementById('duo-helper-runstate');
    runBtn.addEventListener('click', () => {
      this.paused = !this.paused;
      runBtn.textContent = this.paused ? 'Start' : 'Stop';
      if (!this.paused) {
        this.updateSuggestions();
      } else {
        this.runningAttempt = false;
        document.getElementById('duo-helper-list').innerHTML = '<div style="color:#666">Paused</div>';
        document.getElementById('duo-helper-stats').textContent = '';
      }
    });

    // Enter key handler
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.keyCode === 13) && !this.paused) {
        setTimeout(() => {
          clearTimeout(this.updateTimer);
          this.updateTimer = setTimeout(() => this.updateSuggestions(), 800);
        }, 200);
      }
    });
  }

  handleDragStart(e) {
    this.initialX = e.clientX - this.xOffset;
    this.initialY = e.clientY - this.yOffset;
    if (e.target.closest('#duo-helper-header')) this.isDragging = true;
  }

  handleDrag(e) {
    if (!this.isDragging) return;
    e.preventDefault();
    this.xOffset = e.clientX - this.initialX;
    this.yOffset = e.clientY - this.initialY;
    this.panel.style.transform = `translate(${this.xOffset}px, ${this.yOffset}px)`;
  }

  setupBoardObserver() {
    this.observer = new BoardObserver(
      () => this.updateSuggestions(),
      () => this.paused
    );
    this.observer.init();
  }

  async updateSuggestions() {
    if (this.paused || this.runningAttempt || !this.panelVisible) return;
    
    const ranked = rankBoards();
    if (!ranked || ranked.length === 0) {
      document.getElementById('duo-helper-list').innerHTML = '<div style="color:#444">No boards with clues yet or all boards solved.</div>';
      document.getElementById('duo-helper-stats').textContent = '';
      document.getElementById('duo-helper-title').textContent = 'Duotrigordle Helper';
      return;
    }

    this.runningAttempt = true;
    try {
      await this.processBoards(ranked);
    } finally {
      this.runningAttempt = false;
      this.lastRowStates = ranked.map(r => r.parsed.rowStates).join('||');
    }
  }

  async processBoards(ranked) {
    for (const board of ranked) {
      if (this.paused) {
        document.getElementById('duo-helper-list').innerHTML = '<div style="color:#666">Paused</div>';
        return;
      }

      const matches = getWordList().filter(word => wordMatchesWithCounts(word, board.parsed));
      if (matches.length > 0) {
        displayBoard({ ...board, matches });
        return;
      }
    }

    document.getElementById('duo-helper-list').innerHTML = '<div style="color:#c9b458">No matches found for any boards.</div>';
    document.getElementById('duo-helper-stats').textContent = '';
  }

  startPolling() {
    const poll = setInterval(() => {
      if (document.querySelector('div[class^="_board_"]') && getWordList().length > 0) {
        clearInterval(poll);
        setTimeout(() => {
          this.updateSuggestions();
        }, 800);
      }
    }, 400);
  }
}

// Initialize the helper
const FALLBACK_DELAY_MS = 5000;
const helper = new DuotrigordleHelper();
helper.init();
window.DuotrigordleHelper = DuotrigordleHelper;
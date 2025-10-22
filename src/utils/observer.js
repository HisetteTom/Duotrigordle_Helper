// DOM mutation observer logic
class BoardObserver {
  constructor(updateCallback, pauseCheck) {
    this.updateCallback = updateCallback;
    this.pauseCheck = pauseCheck;
    this.updateTimer = null;
    this.observer = null;
  }

  init() {
    this.observer = new MutationObserver(mutations => {
      if (this.pauseCheck()) return;
      
      const relevant = mutations.some(m => {
        try {
          if (m.type === 'attributes' && m.target && typeof m.target.className === 'string') {
            if (m.target.className.includes('_cell_') || m.target.className.includes('_board_')) return true;
          }
          if (m.type === 'childList' && m.target && m.target.closest && m.target.closest('div[class^="_board_"]')) return true;
        } catch (e) {}
        return false;
      });

      if (relevant) {
        clearTimeout(this.updateTimer);
        this.updateTimer = setTimeout(this.updateCallback, 600);
      }
    });

    this.startObserving();
  }

  startObserving() {
    this.observer.observe(document.body, { 
      subtree: true, 
      childList: true, 
      attributes: true, 
      attributeFilter: ['class'] 
    });
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

export { BoardObserver };
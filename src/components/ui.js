// UI components and styles
const styles = `
  #duo-helper-panel { 
    position: fixed; 
    top: 100px; 
    right: 20px; 
    width: 360px; 
    background: white; 
    border: 2px solid #d0d0d0; 
    border-radius: 8px; 
    box-shadow: 0 8px 24px rgba(0,0,0,0.12); 
    z-index: 10000; 
    font-family: Arial, Helvetica, sans-serif; 
    color: black; 
  }
  .duo-helper-word { 
    padding: 8px 10px; 
    margin: 6px 0; 
    background: #f5f5f5; 
    border-radius: 6px; 
    cursor: pointer; 
    color: black; 
  }
  .duo-helper-word:hover { 
    background: #e8e8e8; 
  }
  .duo-helper-loading { 
    color: #444; 
    font-style: italic; 
    padding: 8px 0; 
  }
`;

function createHelperPanel() {
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
  return panel;
}

function createToggleButton() {
  const btn = document.createElement('button');
  btn.id = 'duo-helper-toggle';
  btn.textContent = 'Show Helper';
  Object.assign(btn.style, {
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
  return btn;
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = styles;
  document.head.appendChild(style);
}

export { createHelperPanel, createToggleButton, injectStyles };
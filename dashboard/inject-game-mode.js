/**
 * Game Mode Widget Injector
 * 
 * Injects the game-mode-widget.js into the Command Center dashboard
 * when it loads. This bridges the gap between the widget code and the
 * OpenClaw Command Center UI (which is served by the gateway).
 * 
 * Usage: Load this script in the Command Center dashboard via browser extension
 *        or by adding it to the gateway's asset serving config.
 */

(function() {
  // Only run once
  if (window._gameModeInjected) return;
  window._gameModeInjected = true;

  console.log('[Game Mode] Injector started');

  // Wait for DOM to be ready
  function injectWidget() {
    // Create container if it doesn't exist
    let container = document.getElementById('game-mode-widget');
    if (!container) {
      container = document.createElement('div');
      container.id = 'game-mode-widget';
      document.body.appendChild(container);
    }

    // Load the widget code
    loadGameModeWidget();
  }

  // Load and execute the widget
  function loadGameModeWidget() {
    // Inline the widget code directly
    const widgetCode = `
class GameModeWidget {
  constructor() {
    this.state = 'active';
    this.pausedAt = null;
    this.elapsedInterval = null;
    this.pollInterval = null;
  }

  async init() {
    await this.updateState();
    this.pollInterval = setInterval(() => this.updateState(), 2000);
    if (this.state === 'paused') {
      this.startElapsedTimer();
    }
  }

  async updateState() {
    try {
      const response = await fetch('/api/system/game-mode');
      if (response.ok) {
        const data = await response.json();
        this.state = data.mode;
        this.pausedAt = data.paused_at;
      } else {
        const checkResponse = await fetch('/api/system/game-mode/check');
        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          this.state = checkData.mode;
          this.pausedAt = checkData.paused_at;
        }
      }
    } catch (e) {
      console.warn('Game Mode state check failed', e);
    }
    this.render();
  }

  async pause() {
    try {
      const response = await fetch('/api/system/game-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'paused', reason: 'gaming' })
      });
      if (response.ok) {
        this.state = 'paused';
        this.pausedAt = new Date().toISOString();
        this.startElapsedTimer();
        this.render();
      }
    } catch (e) {
      console.error('Failed to pause Game Mode', e);
    }
  }

  async resume() {
    try {
      const response = await fetch('/api/system/game-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'active', reason: 'gaming_complete' })
      });
      if (response.ok) {
        this.state = 'active';
        this.pausedAt = null;
        this.stopElapsedTimer();
        this.render();
      }
    } catch (e) {
      console.error('Failed to resume Game Mode', e);
    }
  }

  startElapsedTimer() {
    if (this.elapsedInterval) clearInterval(this.elapsedInterval);
    this.elapsedInterval = setInterval(() => this.render(), 1000);
  }

  stopElapsedTimer() {
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
      this.elapsedInterval = null;
    }
  }

  getElapsedTime() {
    if (!this.pausedAt) return '';
    const now = new Date();
    const paused = new Date(this.pausedAt);
    const diffMs = now - paused;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    if (hours > 0) return \`\${hours}h \${minutes}m\`;
    if (minutes > 0) return \`\${minutes}m \${seconds}s\`;
    return \`\${seconds}s\`;
  }

  render() {
    const container = document.getElementById('game-mode-widget');
    if (!container) return;

    if (this.state === 'active') {
      container.innerHTML = \`
        <div class="game-mode-widget active" title="Game Mode: All systems active">
          <span class="icon">🎮</span>
          <span class="label">GAME MODE</span>
          <span class="status">Active</span>
          <button class="pause-btn" onclick="window.gameModeWidget.pause()">Pause</button>
        </div>
      \`;
    } else {
      const elapsed = this.getElapsedTime();
      container.innerHTML = \`
        <div class="game-mode-widget paused" title="Game Mode: Paused for gaming">
          <span class="icon">⏸️</span>
          <span class="label">PAUSED</span>
          <span class="status">Gaming</span>
          <span class="elapsed">\${elapsed}</span>
          <button class="resume-btn" onclick="window.gameModeWidget.resume()">Resume</button>
        </div>
      \`;
    }
  }

  destroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.elapsedInterval) clearInterval(this.elapsedInterval);
  }
}

window.gameModeWidget = new GameModeWidget();
window.gameModeWidget.init();
    `;

    try {
      eval(widgetCode);
      console.log('[Game Mode] Widget loaded successfully');
      
      // Inject styles
      injectStyles();
    } catch (e) {
      console.error('[Game Mode] Failed to load widget code', e);
    }
  }

  function injectStyles() {
    if (document.querySelector('style[data-game-mode]')) return;

    const styles = `
#game-mode-widget {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
}

.game-mode-widget {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.game-mode-widget.active {
  background: linear-gradient(135deg, #4ade80, #22c55e);
  color: white;
}

.game-mode-widget.active .pause-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.game-mode-widget.active .pause-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.6);
}

.game-mode-widget.paused {
  background: linear-gradient(135deg, #f97316, #ea580c);
  color: white;
  animation: pulse 2s infinite;
}

.game-mode-widget.paused .resume-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.game-mode-widget.paused .resume-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.6);
}

.game-mode-widget .icon {
  font-size: 18px;
}

.game-mode-widget .label {
  text-transform: uppercase;
  letter-spacing: 1px;
}

.game-mode-widget .status {
  opacity: 0.9;
  font-size: 12px;
}

.game-mode-widget .elapsed {
  font-family: monospace;
  font-size: 12px;
  opacity: 0.8;
  min-width: 40px;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
  }
  50% {
    box-shadow: 0 4px 20px rgba(249, 115, 22, 0.6);
  }
}

@media (max-width: 768px) {
  #game-mode-widget {
    top: 10px;
    right: 10px;
  }
  
  .game-mode-widget {
    padding: 8px 12px;
    font-size: 12px;
    gap: 8px;
  }
  
  .game-mode-widget .icon {
    font-size: 16px;
  }
}
    `;

    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-game-mode', 'true');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    console.log('[Game Mode] Styles injected');
  }

  // Inject when document is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectWidget);
  } else {
    // DOM is already loaded
    setTimeout(injectWidget, 100);
  }
})();

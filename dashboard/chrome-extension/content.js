/**
 * Chrome Extension Content Script: Game Mode Widget Injector
 * 
 * Injects the game-mode-widget into the OpenClaw Command Center (port 3001)
 * on page load.
 */

(function() {
  // Only run once
  if (window._gameModeExtensionLoaded) return;
  window._gameModeExtensionLoaded = true;

  console.log('[Game Mode Extension] Initializing...');

  // Wait for DOM to be ready
  function initWidget() {
    // Create container
    const container = document.createElement('div');
    container.id = 'game-mode-widget';
    document.body.appendChild(container);

    // Load the widget class
    loadGameModeWidget();
  }

  function loadGameModeWidget() {
    class GameModeWidget {
      constructor() {
        this.state = 'active';
        this.pausedAt = null;
        this.elapsedInterval = null;
        this.pollInterval = null;
      }

      async init() {
        try {
          await this.updateState();
        } catch (e) {
          console.warn('[Game Mode] Initial state check failed', e);
        }
        
        // Start polling for state changes
        this.pollInterval = setInterval(() => this.updateState(), 2000);
        
        // Start elapsed time update if paused
        if (this.state === 'paused') {
          this.startElapsedTimer();
        }
      }

      async updateState() {
        try {
          // Try primary endpoint first
          let response = await fetch('/api/system/game-mode', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });
          
          if (!response.ok) {
            // Try fallback endpoint
            response = await fetch('/api/system/game-mode/check', {
              method: 'GET',
              headers: { 'Accept': 'application/json' }
            });
          }
          
          if (response.ok) {
            const data = await response.json();
            const oldState = this.state;
            this.state = data.mode || data.state || 'active';
            this.pausedAt = data.paused_at || data.pausedAt || null;
            
            // Log state changes
            if (oldState !== this.state) {
              console.log(`[Game Mode] State changed: ${oldState} → ${this.state}`);
            }
          }
        } catch (e) {
          console.warn('[Game Mode] State check failed', e);
          // Keep current state on error
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
            const data = await response.json();
            this.state = data.mode || 'paused';
            this.pausedAt = new Date().toISOString();
            this.startElapsedTimer();
            this.render();
            console.log('[Game Mode] Paused successfully');
          } else {
            const text = await response.text();
            console.error('[Game Mode] Pause failed:', response.status, text);
          }
        } catch (e) {
          console.error('[Game Mode] Failed to pause', e);
          alert('Failed to pause game mode: ' + e.message);
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
            const data = await response.json();
            this.state = data.mode || 'active';
            this.pausedAt = null;
            this.stopElapsedTimer();
            this.render();
            console.log('[Game Mode] Resumed successfully');
          } else {
            const text = await response.text();
            console.error('[Game Mode] Resume failed:', response.status, text);
          }
        } catch (e) {
          console.error('[Game Mode] Failed to resume', e);
          alert('Failed to resume game mode: ' + e.message);
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
        try {
          const now = new Date();
          const paused = new Date(this.pausedAt);
          const diffMs = now - paused;
          
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
          
          if (hours > 0) return `${hours}h ${minutes}m`;
          if (minutes > 0) return `${minutes}m ${seconds}s`;
          return `${seconds}s`;
        } catch (e) {
          return '';
        }
      }

      render() {
        const container = document.getElementById('game-mode-widget');
        if (!container) return;

        if (this.state === 'paused') {
          const elapsed = this.getElapsedTime();
          container.innerHTML = `
            <div class="game-mode-widget paused" title="Game Mode: Paused for gaming">
              <span class="icon">⏸️</span>
              <span class="label">PAUSED</span>
              <span class="status">Gaming</span>
              <span class="elapsed">${elapsed}</span>
              <button class="resume-btn">Resume</button>
            </div>
          `;
          
          // Re-attach event listeners after render
          container.querySelector('.resume-btn')?.addEventListener('click', 
            () => this.resume()
          );
        } else {
          container.innerHTML = `
            <div class="game-mode-widget active" title="Game Mode: All systems active">
              <span class="icon">🎮</span>
              <span class="label">GAME MODE</span>
              <span class="status">Active</span>
              <button class="pause-btn">Pause</button>
            </div>
          `;
          
          // Re-attach event listeners after render
          container.querySelector('.pause-btn')?.addEventListener('click', 
            () => this.pause()
          );
        }
      }

      destroy() {
        if (this.pollInterval) clearInterval(this.pollInterval);
        if (this.elapsedInterval) clearInterval(this.elapsedInterval);
      }
    }

    // Create and initialize widget
    window.gameModeWidget = new GameModeWidget();
    window.gameModeWidget.init();
    console.log('[Game Mode Extension] Widget initialized');
  }

  // Inject styles
  function injectStyles() {
    if (document.querySelector('style[data-game-mode-ext]')) return;

    const styles = `
#game-mode-widget {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.game-mode-widget.active {
  background: linear-gradient(135deg, #4ade80, #22c55e);
  color: white;
}

.game-mode-widget.active .pause-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.game-mode-widget.active .pause-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.6);
  transform: scale(1.05);
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
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.game-mode-widget.paused .resume-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.6);
  transform: scale(1.05);
}

.game-mode-widget .icon {
  font-size: 18px;
}

.game-mode-widget .label {
  text-transform: uppercase;
  letter-spacing: 1px;
  min-width: 80px;
}

.game-mode-widget .status {
  opacity: 0.9;
  font-size: 12px;
}

.game-mode-widget .elapsed {
  font-family: 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  opacity: 0.8;
  min-width: 50px;
  text-align: right;
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
  
  .game-mode-widget .label {
    min-width: auto;
  }
}
    `;

    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-game-mode-ext', 'true');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    console.log('[Game Mode Extension] Styles injected');
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectStyles();
      initWidget();
    });
  } else {
    // DOM is already loaded
    injectStyles();
    initWidget();
  }
})();

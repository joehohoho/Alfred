/**
 * Game Mode Widget — Dashboard Control for HAL's Work Pause
 * 
 * Location: Command Center Alfred page (top-right corner)
 * Features:
 * - Display current Game Mode state (active/paused)
 * - Toggle pause/resume with single click
 * - Show elapsed pause time
 * - Poll state updates every 2 seconds
 */

class GameModeWidget {
  constructor() {
    this.state = 'active'; // active | paused
    this.pausedAt = null;
    this.elapsedInterval = null;
    this.pollInterval = null;
  }

  async init() {
    // Initial state check
    await this.updateState();
    
    // Start polling for state changes
    this.pollInterval = setInterval(() => this.updateState(), 2000);
    
    // Start elapsed time update if paused
    if (this.state === 'paused') {
      this.startElapsedTimer();
    }
  }

  async updateState() {
    try {
      // Check pause marker file
      const response = await fetch('/api/system/game-mode');
      if (response.ok) {
        const data = await response.json();
        this.state = data.mode;
        this.pausedAt = data.paused_at;
      } else {
        // Fallback: check local state
        const checkResponse = await fetch('/api/system/game-mode/check');
        const checkData = await checkResponse.json();
        this.state = checkData.mode;
        this.pausedAt = checkData.paused_at;
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
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  render() {
    const container = document.getElementById('game-mode-widget');
    if (!container) return;

    if (this.state === 'active') {
      container.innerHTML = `
        <div class="game-mode-widget active" title="Game Mode: All systems active">
          <span class="icon">🎮</span>
          <span class="label">GAME MODE</span>
          <span class="status">Active</span>
          <button class="pause-btn" onclick="gameModeWidget.pause()">Pause</button>
        </div>
      `;
    } else {
      const elapsed = this.getElapsedTime();
      container.innerHTML = `
        <div class="game-mode-widget paused" title="Game Mode: Paused for gaming">
          <span class="icon">⏸️</span>
          <span class="label">PAUSED</span>
          <span class="status">Gaming</span>
          <span class="elapsed">${elapsed}</span>
          <button class="resume-btn" onclick="gameModeWidget.resume()">Resume</button>
        </div>
      `;
    }
  }

  destroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.elapsedInterval) clearInterval(this.elapsedInterval);
  }
}

// Instantiate globally
const gameModeWidget = new GameModeWidget();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  gameModeWidget.init();
});

// CSS styles (add to dashboard stylesheet)
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

// Inject styles if not already present
if (!document.querySelector('style[data-game-mode]')) {
  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-game-mode', 'true');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}

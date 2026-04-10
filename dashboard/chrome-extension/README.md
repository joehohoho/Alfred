# OpenClaw Game Mode Chrome Extension

Adds a Game Mode widget to the OpenClaw Command Center dashboard (localhost:3001) for quick pause/resume of all work agents.

## Installation

1. **Open Chrome Extensions Page**
   ```
   chrome://extensions/
   ```

2. **Enable Developer Mode**
   - Toggle "Developer mode" in the top-right corner

3. **Load Extension**
   - Click "Load unpacked"
   - Navigate to: `~/.openclaw/workspace/dashboard/chrome-extension/`
   - Select the folder

4. **Verify Installation**
   - Refresh `http://localhost:3001`
   - You should see a green "🎮 GAME MODE" button in the top-right corner

## Features

### When Active (Green Button)
- Shows "🎮 GAME MODE" in green
- Status: "All systems active"
- Click "Pause" to pause all work agents and enable gaming mode

### When Paused (Orange Button)
- Shows "⏸️ PAUSED" in orange with a pulsing glow
- Status: "Gaming" 
- Displays elapsed time (e.g., "2h 15m")
- Click "Resume" to resume all work

## What Happens When You Pause

**Paused agents (work stops):**
- Work executor
- HAL idle dispatch
- Kanban idle loop
- Session cleanup
- Daily inquiry
- Signal training
- Market signals processor

**Still running (monitoring continues):**
- OpenClaw gateway
- Sentinel (health monitor)
- Gateway watchdog

## What Happens When You Resume

All paused agents are automatically restarted and resume their normal operations.

## Troubleshooting

### Widget doesn't appear
1. Check console for errors (DevTools > Console)
2. Verify extension is enabled (check chrome://extensions/)
3. Try reloading the page (Cmd+R)
4. Check that Command Center is running on localhost:3001

### Pause/Resume doesn't work
1. Check browser console for error messages
2. Verify backend API is responding:
   ```bash
   bash ~/.openclaw/workspace/scripts/game-mode-check.sh
   ```
3. Check launchctl status:
   ```bash
   launchctl list | grep game-mode
   ```

### Extension stopped working after restart
- Reload the extension: chrome://extensions/ → find OpenClaw Game Mode → click reload icon

## Development

- **Manifest:** `manifest.json` — Extension configuration
- **Content Script:** `content.js` — Injects widget into Command Center page
- **API Endpoints:** `/api/system/game-mode` (POST/GET)
- **Backend:** `~/.openclaw/workspace/scripts/game-mode-*.sh`

## Uninstallation

1. Open `chrome://extensions/`
2. Find "OpenClaw Game Mode"
3. Click the trash icon

## Notes

- Extension only works on `localhost:3001` and `127.0.0.1:3001`
- Widget persists across page reloads
- State polling updates every 2 seconds when paused
- No data is sent outside your machine

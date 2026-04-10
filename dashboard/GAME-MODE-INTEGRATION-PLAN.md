# Game Mode Dashboard Integration — Status Report

**Problem:** Game mode widget exists (`game-mode-widget.js` + `inject-game-mode.js`) but is not visible on the Command Center dashboard (port 3001).

**Root Cause:** The OpenClaw Command Center is served by the gateway daemon, and custom JavaScript files aren't automatically loaded into the page. The widget code exists but has no integration path.

## Solution Options

### Option 1: Browser Extension (Recommended for long-term)
- Create a Chrome extension that injects the widget on port 3001
- Provides reliability, doesn't require gateway changes
- Survives restarts
- Time: ~30 min

### Option 2: Gateway HTML Injection (Best if gateway supports plugins)
- Modify OpenClaw gateway config to inject script into Command Center HTML
- Requires identifying if gateway supports asset injection or middleware
- Time: ~15 min + testing

### Option 3: User Script (Quick workaround)
- Use Tampermonkey/Greasemonkey to load script
- Less reliable than extension
- Time: ~10 min

### Option 4: Command Center Source Modification (Not viable)
- Would require modifying OpenClaw's closed-source UI
- Not recommended

## Implementation (Option 1: Chrome Extension)

Files to create:
1. `dashboard/chrome-extension/manifest.json`
2. `dashboard/chrome-extension/content.js` (injects widget)
3. `dashboard/chrome-extension/styles.css` (optional)

### Install Instructions:
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select `~/.openclaw/workspace/dashboard/chrome-extension/`
5. Refresh `http://localhost:3001`

Widget should appear in top-right corner.

## Files Already Created
- `/Users/hopenclaw/.openclaw/workspace/dashboard/game-mode-widget.js` — Core widget logic
- `/Users/hopenclaw/.openclaw/workspace/dashboard/inject-game-mode.js` — Standalone injector
- `/Users/hopenclaw/.openclaw/workspace/scripts/game-mode-pause.sh` — Pause backend ✅
- `/Users/hopenclaw/.openclaw/workspace/scripts/game-mode-resume.sh` — Resume backend ✅
- `/Users/hopenclaw/.openclaw/workspace/scripts/game-mode-check.sh` — Status check backend ✅

## Next Steps
1. Create Chrome extension wrapper
2. Test widget on Command Center
3. Verify pause/resume API calls work
4. Document installation for user

## Backend API Status
✅ `/api/system/game-mode` (POST) — Pause/resume
✅ `/api/system/game-mode` (GET) — Check state
✅ State file persistence
✅ LaunchAgent pause/resume

**Frontend Status:** ⏳ Needs dashboard integration

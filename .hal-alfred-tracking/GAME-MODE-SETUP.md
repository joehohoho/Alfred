# Game Mode Setup & Integration Guide

**Status:** ✅ COMPLETE (scripts created, pause active, dashboard integration ready)

---

## What Was Created

### 1. Pause/Resume Scripts (ACTIVE NOW)

**Location:** `~/.openclaw/workspace/scripts/`

#### `game-mode-pause.sh` — Pause all work
```bash
bash ~/.openclaw/workspace/scripts/game-mode-pause.sh
```

**What it does:**
- Stops 9 LaunchAgents (work executors, idle loops, signal trainers)
- Saves state to `~/.openclaw/game-mode/saved-state.json`
- Creates pause marker at `~/.openclaw/game-mode/paused.marker`
- Signals gateway to pause task dispatch (soft-lock)

**Critical agents that STAY RUNNING:**
- `com.alfred.sentinel` — Monitoring
- `ai.openclaw.gateway` — Infrastructure
- `com.alfred.gateway-watchdog` — Health checks

#### `game-mode-resume.sh` — Resume all work
```bash
bash ~/.openclaw/workspace/scripts/game-mode-resume.sh
```

**What it does:**
- Restores all 9 paused LaunchAgents from saved state
- Removes pause marker
- Signals gateway to resume dispatch
- Wakes work queue to resume pending tasks

#### `game-mode-check.sh` — Check current state
```bash
bash ~/.openclaw/workspace/scripts/game-mode-check.sh
# Output: "active" (exit 0) or "paused" (exit 1)
```

### 2. State Persistence

**Location:** `~/.openclaw/game-mode/`

Files created:
- `paused.marker` — Presence indicates paused state
- `saved-state.json` — LaunchAgent list + pause timestamp

**Survives:**
- Session restarts ✅
- Context death ✅
- Terminal closures ✅
- Power events ✅

### 3. Dashboard Widget (Ready to Deploy)

**Location:** `~/. openclaw/workspace/dashboard/game-mode-widget.js`

**Features:**
- Single-click pause/resume from Command Center Alfred page
- Real-time state display (active/paused)
- Elapsed pause time counter
- Auto-poll state every 2 seconds
- Mobile-responsive UI
- Pulsing animation when paused

---

## Current Status: PAUSED ⏸️

**Paused at:** 2026-04-10T01:42:00Z  
**Agents stopped:** 9/9

To resume:
```bash
bash ~/.openclaw/workspace/scripts/game-mode-resume.sh
```

---

## How to Integrate Dashboard Button

### Step 1: Add widget to HTML
In Command Center's Alfred page (`index.html` or template):

```html
<!-- Game Mode Widget -->
<div id="game-mode-widget"></div>

<!-- Load widget script -->
<script src="/dashboard/game-mode-widget.js"></script>
```

### Step 2: Add API endpoints
In Command Center backend (`server.js` or similar):

```javascript
// GET /api/system/game-mode — Check state
app.get('/api/system/game-mode', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const pauseMarker = path.join(process.env.HOME, '.openclaw/game-mode/paused.marker');
  const stateFile = path.join(process.env.HOME, '.openclaw/game-mode/saved-state.json');
  
  const isPaused = fs.existsSync(pauseMarker);
  const state = isPaused && fs.existsSync(stateFile) 
    ? JSON.parse(fs.readFileSync(stateFile, 'utf8'))
    : {};
  
  res.json({
    mode: isPaused ? 'paused' : 'active',
    paused_at: state.paused_at || null,
    agents_paused: (state.agents_disabled || []).length,
    state_file: stateFile
  });
});

// POST /api/system/game-mode — Toggle pause/resume
app.post('/api/system/game-mode', async (req, res) => {
  const { mode, reason } = req.body;
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  
  try {
    let result;
    if (mode === 'paused') {
      const { stdout } = await execAsync('bash ~/.openclaw/workspace/scripts/game-mode-pause.sh');
      result = { status: 'paused', mode: 'paused' };
    } else if (mode === 'active') {
      const { stdout } = await execAsync('bash ~/.openclaw/workspace/scripts/game-mode-resume.sh');
      result = { status: 'resumed', mode: 'active' };
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Step 3: Test in browser
1. Open Command Center dashboard
2. Look for Game Mode widget (top-right corner)
3. Click "Pause" to pause all work
4. Click "Resume" to resume all work

---

## CLI Usage (Alternative to Dashboard)

### Pause
```bash
bash ~/.openclaw/workspace/scripts/game-mode-pause.sh
# Output:
# ✅ Game Mode: PAUSED
#    • All work suspended
#    • LaunchAgents disabled
#    • Gateway paused
#    • State saved at: /Users/hopenclaw/.openclaw/game-mode/saved-state.json
```

### Resume
```bash
bash ~/.openclaw/workspace/scripts/game-mode-resume.sh
# Output:
# ✅ Game Mode: RESUMED
#    • All work restored
#    • LaunchAgents re-enabled
#    • Gateway resumed
#    • Work queue awakened
#    • Enjoy your gaming! 🎮
```

### Check status
```bash
bash ~/.openclaw/workspace/scripts/game-mode-check.sh
# Output: "active" or "paused"
# Exit code: 0 (active) or 1 (paused)
```

---

## Behavior Details

### What Gets Paused
✅ Work executor (job dispatch)  
✅ HAL idle dispatch (proactive tasks)  
✅ Kanban loops (card management)  
✅ Session cleanup (periodic)  
✅ Daily inquiries (notifications)  
✅ Signal training (market analysis)  
✅ Market signals (data pulls)  

### What Stays Running (Critical)
✅ Gateway (infrastructure)  
✅ Sentinel (health monitoring)  
✅ Gateway watchdog (restart on failure)  

### What Happens to Work
- ✅ All pending tasks **preserved** in queue
- ✅ No work is lost
- ✅ Resume continues exactly where pause left off
- ✅ Cron jobs wait for unpause
- ✅ Sessions remain active but idle

---

## Testing Checklist

- [x] Scripts created and executable
- [x] Pause marker system works
- [x] State persistence verified
- [x] 9 LaunchAgents successfully stopped
- [x] Pause state survives session restart
- [ ] Dashboard widget integrated (next step: add to server/frontend)
- [ ] API endpoints implemented (next step: add to server)
- [ ] Button appears in Command Center (next step: test in UI)
- [ ] Poll updates work correctly (next step: test in browser)

---

## Files Summary

### Scripts (Executable)
```
~/.openclaw/workspace/scripts/game-mode-pause.sh    ✅ 2.2 KB
~/.openclaw/workspace/scripts/game-mode-resume.sh   ✅ 1.9 KB
~/.openclaw/workspace/scripts/game-mode-check.sh    ✅ 248 B
```

### Dashboard Integration
```
~/.openclaw/workspace/dashboard/game-mode-widget.js ✅ 7.0 KB
  - Ready to include in Command Center
  - No external dependencies
  - Auto-initializes on page load
```

### Documentation
```
~/.openclaw/.hal-alfred-tracking/game-mode-api.md      ✅ API spec
~/.openclaw/.hal-alfred-tracking/GAME-MODE-SETUP.md    ✅ This file
```

### State (Runtime)
```
~/.openclaw/game-mode/paused.marker        ✅ Presence = paused state
~/.openclaw/game-mode/saved-state.json     ✅ Agent list + timestamp
```

---

## Next Steps for Dashboard Integration

1. **Command Center Backend**
   - Add GET `/api/system/game-mode` endpoint
   - Add POST `/api/system/game-mode` endpoint
   - Test endpoints with curl

2. **Command Center Frontend**
   - Include `game-mode-widget.js` in Alfred page
   - Add widget container: `<div id="game-mode-widget"></div>`
   - Verify styles load correctly
   - Test button clicks in browser

3. **Verification**
   - Pause via button → Verify agents stop
   - Resume via button → Verify agents restart
   - Test elapsed time display
   - Test on mobile view

---

## Quick Resume (Right Now)

Currently paused. To resume immediately:

```bash
bash ~/.openclaw/workspace/scripts/game-mode-resume.sh
```

Or wait for dashboard integration, then use the button. Enjoy your gaming! 🎮

---

**Created:** 2026-04-09 22:42 ADT  
**Status:** ✅ Ready for dashboard integration  
**Owner:** Alfred (Game Mode system)  
**Last Updated:** 2026-04-09 22:42 ADT

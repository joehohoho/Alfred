# Game Mode API Integration

## Endpoints (to be implemented in Command Center)

### POST /api/system/game-mode
Control Game Mode state

**Request:**
```json
{
  "mode": "paused" | "active",
  "reason": "gaming" | "gaming_complete" | "manual"
}
```

**Response:**
```json
{
  "status": "ok",
  "mode": "paused" | "active",
  "agents_paused": ["com.alfred.alfred-work-executor", ...],
  "timestamp": "2026-04-09T22:40:00Z"
}
```

### GET /api/system/game-mode
Check current Game Mode state

**Response:**
```json
{
  "mode": "paused" | "active",
  "paused_at": "2026-04-09T22:40:00Z" | null,
  "agents_paused": 9,
  "state_file": "/Users/hopenclaw/.openclaw/game-mode/saved-state.json"
}
```

## Implementation

### Backend (already set up via bash scripts)
- `game-mode-pause.sh` — Pause all work
- `game-mode-resume.sh` — Resume all work
- `game-mode-check.sh` — Check current state
- State persisted at: `~/.openclaw/game-mode/`

### Frontend (Command Center Dashboard)

#### Alfred Page: Game Mode Button
Location: Top-right corner, next to system controls

**UI State (Active):**
```
[🎮 GAME MODE] ← Green, clickable
  Status: All systems active
  Agents: 9/9 running
```

**UI State (Paused):**
```
[⏸️  GAME MODE PAUSED] ← Red/orange, clickable
  Status: Gaming in progress
  Agents: 0/9 running
  Elapsed: 2h 15m
  [Resume Now]
```

#### Click Handlers
```javascript
// Pause handler
async function pauseGameMode() {
  const response = await fetch('/api/system/game-mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'paused', reason: 'gaming' })
  });
  const data = await response.json();
  updateUI(data);
}

// Resume handler
async function resumeGameMode() {
  const response = await fetch('/api/system/game-mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'active', reason: 'gaming_complete' })
  });
  const data = await response.json();
  updateUI(data);
}

// Poll for state every 2 seconds when paused
async function checkGameMode() {
  const response = await fetch('/api/system/game-mode');
  const data = await response.json();
  return data;
}
```

## Behavior

### Pause (game-mode-pause.sh)
1. Create marker file at `~/.openclaw/game-mode/paused.marker`
2. Stop these LaunchAgents:
   - `com.alfred.alfred-work-executor`
   - `com.alfred.hal-idle-dispatch`
   - `com.alfred.kanban-idle-loop`
   - `com.alfred.kanban-stale-scan`
   - `com.alfred.session-cleanup`
   - `com.alfred.daily-inquiry`
   - `com.alfred.overnight-scheduler`
   - `com.alfred.market-signals-app`
   - `com.alfred.signal-trainer`
3. Signal gateway to pause task dispatch
4. Save state to disk for recovery

**Agents NOT paused (critical):**
- `com.alfred.sentinel` — Keeps monitoring
- `ai.openclaw.gateway` — Keeps running
- `com.alfred.gateway-watchdog` — Keeps monitoring

### Resume (game-mode-resume.sh)
1. Verify saved state exists
2. Re-enable all paused LaunchAgents
3. Signal gateway to resume dispatch
4. Wake work queue
5. Remove pause marker
6. Return to normal operations

## Files Created
- `/Users/hopenclaw/.openclaw/workspace/scripts/game-mode-pause.sh`
- `/Users/hopenclaw/.openclaw/workspace/scripts/game-mode-resume.sh`
- `/Users/hopenclaw/.openclaw/workspace/scripts/game-mode-check.sh`
- State persisted at: `~/.openclaw/game-mode/`
  - `paused.marker` — Presence indicates paused state
  - `saved-state.json` — LaunchAgent list + pause timestamp

## Integration Checklist
- [x] Pause/resume scripts created
- [x] State persistence implemented
- [ ] Command Center API endpoint `/api/system/game-mode` (POST/GET)
- [ ] Alfred dashboard Game Mode button (frontend)
- [ ] Heartbeat/cron skip logic (check pause marker before work)
- [ ] Elapsed time tracking when paused
- [ ] Dashboard display of paused status

## Testing
```bash
# Test pause
bash ~/.openclaw/workspace/scripts/game-mode-pause.sh

# Check status
bash ~/.openclaw/workspace/scripts/game-mode-check.sh

# Test resume
bash ~/.openclaw/workspace/scripts/game-mode-resume.sh

# Verify agents are running
launchctl list | grep -E "com\.alfred\.|ai\.openclaw\."
```

## Notes
- Pause is **soft**: critical services (gateway, sentinel) keep running
- Resume recovers from exact state saved at pause time
- All work is preserved in queues; nothing is lost
- Dashboard button provides quick access without CLI
- Pause marker survives session restarts (safe)

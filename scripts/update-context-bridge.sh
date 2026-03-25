#!/bin/bash
# update-context-bridge.sh — Maintains a compact context summary in MEMORY.md
# for Discord sessions that lack full task context.
# Runs every 15 min via work executor LaunchAgent.
#
# Guardrails:
# - File lock prevents concurrent writes to MEMORY.md
# - Bridge section capped at 800 bytes (hard limit)
# - MEMORY.md total size checked — skips if approaching 20KB gateway limit
# - Backup before write — recoverable if corruption occurs
# - Stale detection — bridge includes timestamp so Alfred knows if it's fresh

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
MEMORY_FILE="$WORKSPACE/MEMORY.md"
ACTIVE_TASK="$WORKSPACE/ACTIVE-TASK.md"
LOCK_FILE="/tmp/context-bridge.lock"
MAX_BRIDGE_BYTES=800
MAX_MEMORY_BYTES=18000  # Leave 2KB headroom below 20KB gateway limit

# Bail if MEMORY.md doesn't exist
[[ -f "$MEMORY_FILE" ]] || exit 0

# ── File lock (prevents concurrent writes) ──────────────────────────────────
cleanup_lock() { rm -f "$LOCK_FILE"; }
trap cleanup_lock EXIT

if ! ( set -o noclobber; echo $$ > "$LOCK_FILE" ) 2>/dev/null; then
  # Check if lock is stale (>60s old)
  if [[ -f "$LOCK_FILE" ]]; then
    LOCK_AGE=$(( $(date +%s) - $(stat -f%m "$LOCK_FILE" 2>/dev/null || echo 0) ))
    if [[ "$LOCK_AGE" -gt 60 ]]; then
      rm -f "$LOCK_FILE"
      echo $$ > "$LOCK_FILE"
    else
      exit 0  # Another instance is running, skip
    fi
  fi
fi

# ── Gather current context ──────────────────────────────────────────────────
CONTEXT=$(python3 -c "
import json, os, sys
from datetime import datetime

lines = []
now = datetime.now()

# 1. Current task from ACTIVE-TASK.md
active_task = os.path.expanduser('$ACTIVE_TASK')
if os.path.exists(active_task):
    with open(active_task) as f:
        content = f.read()
    for line in content.split('\n'):
        if line.startswith('## ') and 'Card' not in line:
            lines.append('Working on: ' + line.strip('# ').strip()[:80])
            break
        if 'Status:' in line:
            lines.append(line.strip('- ').strip()[:80])
            break
    if not lines:
        lines.append('Status: Idle')

# 2. Board state from kanban API
import urllib.request
try:
    resp = urllib.request.urlopen('http://localhost:3001/api/kanban', timeout=3)
    board = json.loads(resp.read())
    cols = board.get('columns', {})
    in_prog = [c.get('title','')[:40] for c in cols.get('in_progress', [])[:3]]
    review = [c.get('title','')[:40] for c in cols.get('review', [])[:3]]
    if in_prog:
        lines.append('In-progress: ' + '; '.join(in_prog))
    if review:
        lines.append('Review: ' + '; '.join(review))
except:
    pass  # Skip board state if API unavailable

# 3. Last 2 completed items from daily memory (compact)
today = now.strftime('%Y-%m-%d')
mem_file = os.path.expanduser(f'$WORKSPACE/memory/{today}.md')
if os.path.exists(mem_file):
    with open(mem_file) as f:
        mem = f.read()
    recent = [l.strip() for l in mem.split('\n') if l.strip().startswith('[') and ':' in l.split(']')[0]][-2:]
    if recent:
        lines.append('Recent: ' + ' | '.join(r[:50] for r in recent))

# 4. Recent Discord thread topics (so sessions know threads exist without loading them)
manifest_file = os.path.expanduser('$WORKSPACE/discord-threads/manifest.json')
if os.path.exists(manifest_file):
    try:
        import json as j2
        with open(manifest_file) as mf:
            manifest = j2.load(mf)
        recent_threads = sorted(manifest.items(), key=lambda x: x[1].get('updatedAt',''), reverse=True)[:3]
        if recent_threads:
            thread_list = ' | '.join(f'{v["topic"][:30]}' for k, v in recent_threads)
            lines.append(f'Threads: {thread_list}')
    except: pass

# Timestamp for freshness detection
lines.append(f'Updated: {now.strftime(\"%H:%M\")} AST')

output = '\n'.join(lines)
# Hard cap at $MAX_BRIDGE_BYTES bytes
if len(output.encode('utf-8')) > $MAX_BRIDGE_BYTES:
    output = output[:$MAX_BRIDGE_BYTES].rsplit('\n', 1)[0]
print(output)
" 2>/dev/null || echo "Status: context unavailable")

# ── Check MEMORY.md size before writing ──────────────────────────────────────
CURRENT_SIZE=$(wc -c < "$MEMORY_FILE")
if [[ "$CURRENT_SIZE" -gt "$MAX_MEMORY_BYTES" ]]; then
  # MEMORY.md is too large — don't add to it, just update existing bridge or skip
  if ! grep -q "CONTEXT-BRIDGE-START" "$MEMORY_FILE"; then
    echo "WARN: MEMORY.md is ${CURRENT_SIZE} bytes (limit ${MAX_MEMORY_BYTES}), skipping bridge insert"
    exit 0
  fi
fi

# ── Backup MEMORY.md before write ────────────────────────────────────────────
cp "$MEMORY_FILE" "${MEMORY_FILE}.bridge-backup" 2>/dev/null || true

# ── Update MEMORY.md ─────────────────────────────────────────────────────────
python3 -c "
import os, re
from datetime import datetime

memory_file = '$MEMORY_FILE'
with open(memory_file) as f:
    content = f.read()

bridge_start = '<!-- CONTEXT-BRIDGE-START -->'
bridge_end = '<!-- CONTEXT-BRIDGE-END -->'
today = datetime.now().strftime('%Y-%m-%d')

new_section = f'''{bridge_start}
## Current Work (auto-updated every 15 min)
$CONTEXT

**Discord sessions — MANDATORY context recovery:**
1. FIRST: Run \`bash scripts/lookup-discord-thread.sh CHANNEL_ID\` to find the thread you posted. Also try \`--search KEYWORDS\`.
2. If found, READ the thread file — it has your complete original message.
3. If not found, check \`memory/{today}.md\` and \`ACTIVE-TASK.md\`.
4. NEVER say you don't remember. NEVER ask Joe to repeat himself. Look it up.
{bridge_end}'''

if bridge_start in content:
    pattern = re.escape(bridge_start) + '.*?' + re.escape(bridge_end)
    new_content = re.sub(pattern, new_section, content, flags=re.DOTALL)
else:
    first_newline = content.index('\n')
    new_content = content[:first_newline+1] + '\n' + new_section + '\n' + content[first_newline+1:]

# Final size check — don't write if result exceeds limit
if len(new_content.encode('utf-8')) > 19500:
    print('WARN: Would exceed 19.5KB, aborting write')
else:
    with open(memory_file, 'w') as f:
        f.write(new_content)
" 2>/dev/null && echo "Context bridge updated" || {
  # Restore backup on failure
  if [[ -f "${MEMORY_FILE}.bridge-backup" ]]; then
    cp "${MEMORY_FILE}.bridge-backup" "$MEMORY_FILE"
    echo "WARN: Bridge update failed, restored backup"
  fi
}

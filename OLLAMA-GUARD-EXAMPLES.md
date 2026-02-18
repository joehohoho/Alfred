# Ollama Guard — Quick Examples

**Quick reference for common use cases**  
See `OLLAMA-GUARD-UNIVERSAL.md` for complete documentation

---

## 1. Protect a Cron Job (Already Done)

```javascript
// Update cron job payload with guard
{
  "payload": {
    "kind": "agentTurn",
    "message": "bash /Users/hopenclaw/.openclaw/workspace/scripts/ollama-guard.sh >/dev/null 2>&1 || exit 1\n\n[rest of task...]",
    "model": "ollama/llama3.2:3b"
  }
}
```

**Usage:**
```bash
cron update <jobId> --patch '{
  "payload": {
    "message": "bash scripts/ollama-guard.sh >/dev/null 2>&1 || exit 1\n\n[original task here]"
  }
}'
```

---

## 2. Protect a Sub-Agent Task

```bash
# Defer if ollama is busy
sessions_spawn \
  --model ollama/llama3.2:3b \
  --task "bash scripts/ollama-guard.sh >/dev/null 2>&1 || exit 1; python analyze-data.py"
```

**Or wait if task is important:**
```bash
# Wait up to 120 seconds for ollama to be ready
sessions_spawn \
  --model ollama/llama3.2:3b \
  --task "bash scripts/ollama-guard.sh --wait --timeout 120 bash -c 'python analyze-data.py'"
```

---

## 3. Check Before Running Inline Command

```bash
# Option A: Exit gracefully if busy
if bash scripts/ollama-guard.sh >/dev/null 2>&1; then
  python my-task.py
else
  echo "Ollama busy, skipping"
fi
```

**Option B: Wrapper mode (simpler)**
```bash
bash scripts/ollama-guard.sh python my-task.py --arg value
```

**Option C: Wait mode (for critical tasks)**
```bash
bash scripts/ollama-guard.sh --wait --timeout 60 python my-task.py
```

---

## 4. Get Status in a Script

```bash
source scripts/ollama-guard.sh

echo "Checking ollama..."
ollama_status  # Prints: ✅ HEALTHY (31ms, 3 models)

if ollama_health_check; then
  echo "Ready to process"
  python critical-task.py
fi
```

---

## 5. Check Response Time (for Monitoring)

```bash
source scripts/ollama-guard.sh

RESPONSE_MS=$(ollama_get_response_time)

if [ $RESPONSE_MS -gt 1000 ]; then
  echo "⚠️  Slow: ${RESPONSE_MS}ms"
elif [ $RESPONSE_MS -eq -1 ]; then
  echo "❌ Unreachable"
else
  echo "✅ Healthy: ${RESPONSE_MS}ms"
fi
```

---

## 6. Monitoring Cron Job

```bash
#!/bin/bash
# Run periodically to check ollama health

source scripts/ollama-guard.sh

echo "=== Ollama Health Check ===" 
ollama_status

RESPONSE=$(ollama_get_response_time)
if [ $RESPONSE -gt 1500 ]; then
  # Could send alert here
  echo "⚠️  Alert: Slow response"
fi
```

**Add as cron job:**
```bash
cron add '{
  "name": "Ollama Health Monitor",
  "schedule": { "kind": "every", "everyMs": 600000 },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "bash scripts/check-ollama-health.sh && echo \"Health check complete\""
  }
}'
```

---

## 7. Wrapper Around Existing Script

```bash
# Before (no protection):
bash ~/backup-script.sh

# After (with guard):
bash scripts/ollama-guard.sh bash ~/backup-script.sh

# With wait (for critical backup):
bash scripts/ollama-guard.sh --wait --timeout 300 bash ~/backup-script.sh
```

---

## 8. Source Library in Your Own Script

```bash
#!/bin/bash
set -e

# Load guard functions
source /Users/hopenclaw/.openclaw/workspace/scripts/ollama-guard.sh

# Option A: Defer if busy
ollama_health_check || {
  echo "System busy, deferring"
  exit 1
}

# Option B: Wait until ready
ollama_wait_until_ready 60 || {
  echo "System not responding, aborting"
  exit 2
}

# Continue with task
echo "Running analysis..."
python analysis.py
```

---

## Exit Code Cheat Sheet

```bash
bash scripts/ollama-guard.sh
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Command succeeded / ollama healthy"
elif [ $EXIT_CODE -eq 1 ]; then
  echo "⏳ Task deferred (ollama busy)"
elif [ $EXIT_CODE -eq 2 ]; then
  echo "❌ Failed (ollama unreachable)"
elif [ $EXIT_CODE -eq 3 ]; then
  echo "❌ Wrapped command failed"
fi
```

---

## One-Liner Examples

```bash
# Quick health check
bash scripts/ollama-guard.sh && echo "Ready" || echo "Busy"

# Get response time
source scripts/ollama-guard.sh && ollama_get_response_time

# Get status
source scripts/ollama-guard.sh && ollama_status

# Wrap any command
bash scripts/ollama-guard.sh python -c "print('hello')"

# Wait for ollama, then run command
bash scripts/ollama-guard.sh --wait echo "System ready!"
```

---

## What to Use When

| Use Case | Command |
|----------|---------|
| Check if OK to run task now | `bash scripts/ollama-guard.sh` |
| Check with status output | `source scripts/ollama-guard.sh && ollama_status` |
| Get response time (ms) | `source scripts/ollama-guard.sh && ollama_get_response_time` |
| Run command if healthy | `bash scripts/ollama-guard.sh python task.py` |
| Run command, wait if needed | `bash scripts/ollama-guard.sh --wait python task.py` |
| Custom timeout | `bash scripts/ollama-guard.sh --wait --timeout 120 cmd` |
| Source for library use | `source scripts/ollama-guard.sh` (then use functions) |

---

## Common Patterns by Task Type

### Cron Jobs
```bash
# At top of agentTurn message:
bash scripts/ollama-guard.sh >/dev/null 2>&1 || exit 1
```

### Sub-Agents
```bash
sessions_spawn --model ollama/llama3.2:3b --task "bash scripts/ollama-guard.sh >/dev/null 2>&1 || exit 1; [task]"
```

### Shell Scripts
```bash
source scripts/ollama-guard.sh
ollama_health_check || exit 1
# ... rest of script
```

### Manual Commands
```bash
bash scripts/ollama-guard.sh [your-command]
```

### Monitoring/Health Checks
```bash
source scripts/ollama-guard.sh
ollama_status
```

---

## Testing the Guard

```bash
#!/bin/bash
echo "Testing ollama-guard system..."

# Test 1: Direct check
echo "1. Direct health check:"
bash scripts/ollama-guard.sh && echo "✅ Healthy" || echo "⚠️ Not healthy"

# Test 2: Status with output
echo ""
echo "2. Status output:"
source scripts/ollama-guard.sh
ollama_status

# Test 3: Response time
echo ""
echo "3. Response time:"
RESP=$(ollama_get_response_time)
echo "${RESP}ms"

# Test 4: Wrapper command
echo ""
echo "4. Wrapper mode:"
bash scripts/ollama-guard.sh echo "Command executed!"

echo ""
echo "✅ All tests complete"
```

---

**Full documentation:** See `OLLAMA-GUARD-UNIVERSAL.md`  
**Last updated:** 2026-02-18  
**Status:** ✅ Production ready

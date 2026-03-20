# HAL Recovery Instructions

**Date:** 2026-03-19
**Problem:** HAL's gateway accepts HTTP on port 18789 but WebSocket dispatches timeout after 30s. Alfred cannot send tasks to HAL. HAL shows 0% uptime.

---

## Quick Diagnosis (run these first)

```powershell
# 1. Check if Ollama is running and responsive
curl http://localhost:11434/api/tags
# Expected: JSON with model list including qwen2.5-coder:14b
# If no response: Ollama is down

# 2. Quick LLM test — does Qwen actually respond?
curl --max-time 30 http://localhost:11434/api/generate -d '{"model":"qwen2.5-coder:14b","prompt":"Say hello","stream":false}'
# Expected: JSON with response text within 30s
# If timeout: Qwen is hung or model isn't loaded

# 3. Check OpenClaw gateway process
tasklist | findstr openclaw
# Expected: openclaw-gateway.exe or node.exe running

# 4. Check gateway health
curl http://localhost:18789
# Expected: HTML page (OpenClaw Control UI)

# 5. Check gateway logs for errors
# Look at: %USERPROFILE%\.openclaw\logs\gateway.err.log
type %USERPROFILE%\.openclaw\logs\gateway.err.log | more
# Look for: timeout errors, LLM failures, session corruption
```

---

## Fix Steps

### Step 1: Fix Ollama / Qwen

```powershell
# If Ollama is not running, start it:
ollama serve

# If Ollama is running but Qwen doesn't respond (hung):
# Kill and restart Ollama
taskkill /F /IM ollama.exe
timeout /t 5
ollama serve

# Verify Qwen loads and responds:
curl --max-time 60 http://localhost:11434/api/generate -d '{"model":"qwen2.5-coder:14b","prompt":"Say hello in one sentence","stream":false}'
```

### Step 2: Clean stale sessions

```powershell
# Find HAL's sessions directory
# Likely: %USERPROFILE%\.openclaw\agents\main\sessions\

# Check sessions.json for stale entries
type %USERPROFILE%\.openclaw\agents\main\sessions\sessions.json

# Look for sessions with JSONL files that don't exist on disk
# Delete any stale entries from sessions.json (keys pointing to missing files)

# If sessions.json is large or corrupted, you can reset it:
# (backup first)
copy %USERPROFILE%\.openclaw\agents\main\sessions\sessions.json %USERPROFILE%\.openclaw\agents\main\sessions\sessions.json.bak
echo {} > %USERPROFILE%\.openclaw\agents\main\sessions\sessions.json
```

### Step 3: Restart HAL's OpenClaw gateway

```powershell
# Kill the gateway
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *openclaw*"
# Or if that doesn't work:
taskkill /F /IM openclaw-gateway.exe

# Wait a few seconds
timeout /t 5

# Restart the gateway
openclaw-gateway
# Or however it's started on this machine (check startup scripts/Task Scheduler)
```

### Step 4: Verify gateway config

Make sure `%USERPROFILE%\.openclaw\openclaw.json` has:

```json
{
  "gateway": {
    "controlUi": {
      "dangerouslyDisableDeviceAuth": true,
      "allowedOrigins": ["*"]
    },
    "bind": "lan",
    "port": 18789
  }
}
```

Key settings:
- `dangerouslyDisableDeviceAuth: true` — required for Alfred's remote dispatches
- `bind: "lan"` — allows connections from other machines on the LAN
- `port: 18789` — must match what Alfred expects

### Step 5: Test from HAL itself

```powershell
# Test WebSocket locally on HAL
node -e "const WebSocket = require('ws'); const ws = new WebSocket('ws://localhost:18789'); ws.on('message', (d) => { console.log('OK:', JSON.parse(d).event); ws.close(); process.exit(0); }); ws.on('error', (e) => { console.log('ERROR:', e.message); process.exit(1); }); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 5000);"
# Expected: OK: connect.challenge

# Test a chat.send to verify LLM responds
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:18789');
let step = 0;
ws.on('message', (raw) => {
  const msg = JSON.parse(raw);
  if (msg.event === 'connect.challenge') {
    ws.send(JSON.stringify({type:'req',id:'t1',method:'connect',params:{
      minProtocol:3,maxProtocol:3,
      auth:{token:'ceebc03825b2a3d143b4097f4ebfb1649a874d91db1a2115'},
      client:{id:'cli',displayName:'Test',version:'1.0.0',platform:'win32',mode:'backend'},
      role:'operator',scopes:['operator.admin','operator.write','operator.read'],caps:[]
    }}));
  } else if (msg.id === 't1' && msg.ok) {
    console.log('Connected OK');
    ws.send(JSON.stringify({type:'req',id:'t2',method:'chat.send',params:{
      message:'Say hello in one word',
      sessionKey:'agent:main:test-recovery-'+Date.now(),
      idempotencyKey:'test-'+Date.now()
    }}));
  } else if (msg.id === 't2') {
    console.log('Chat response:', msg.ok ? 'OK' : 'FAIL', msg.error || '');
    ws.close();
    process.exit(msg.ok ? 0 : 1);
  }
});
ws.on('error', (e) => { console.log('WS ERROR:', e.message); process.exit(1); });
setTimeout(() => { console.log('TIMEOUT - LLM may be hung'); process.exit(1); }, 60000);
"
# Expected: Connected OK, then Chat response: OK within 60s
# If TIMEOUT: Qwen is not responding to prompts — restart Ollama
```

### Step 6: Verify remote connectivity from Alfred's Mac

After fixing HAL, ask Joe to run on Alfred's Mac:
```bash
# Quick test from Alfred's Mac
timeout 15 node ~/.openclaw/workspace/scripts/hal-dispatch-ws.js "Recovery test — acknowledge"
# Expected: OK session=agent:main:task-...

# Reset fail counter
echo "0" > ~/.openclaw/workspace/.hal-alfred-tracking/hal-dispatch-fail-count.txt
```

---

## Windows Firewall Check

If WebSocket still fails from Alfred's Mac after local tests pass:

```powershell
# Check if port 18789 is allowed through firewall
netsh advfirewall firewall show rule name=all | findstr 18789

# If not found, add rule:
netsh advfirewall firewall add rule name="OpenClaw Gateway" dir=in action=allow protocol=TCP localport=18789

# Also check if Ollama port is open (needed if models are accessed remotely):
netsh advfirewall firewall show rule name=all | findstr 11434
```

---

## If Nothing Works — Full Reset

```powershell
# 1. Stop everything
taskkill /F /IM ollama.exe 2>nul
taskkill /F /IM node.exe 2>nul

# 2. Clean all sessions
echo {} > %USERPROFILE%\.openclaw\agents\main\sessions\sessions.json
del /Q %USERPROFILE%\.openclaw\agents\main\sessions\*.jsonl 2>nul

# 3. Truncate error logs
echo. > %USERPROFILE%\.openclaw\logs\gateway.err.log

# 4. Start Ollama and wait for model to load
start ollama serve
timeout /t 10

# 5. Verify Qwen responds
curl --max-time 60 http://localhost:11434/api/generate -d '{"model":"qwen2.5-coder:14b","prompt":"hello","stream":false}'

# 6. Start gateway
openclaw-gateway

# 7. Test locally
curl http://localhost:18789
```

---

## Summary of What's Wrong

Alfred dispatches tasks to HAL via WebSocket (`ws://192.168.2.79:18789`). The dispatch:
1. Connects to HAL's gateway ✓ (HTTP responds)
2. Sends `chat.send` with the task message
3. **Times out after 30s** waiting for acknowledgment

This means HAL's gateway receives the message but can't process it — most likely because Qwen (the local LLM) is hung, crashed, or not loaded. The gateway queues the message for the LLM but the LLM never responds, so the gateway never acknowledges the `chat.send`.

After fixing, Alfred will automatically start dispatching tasks within 15 minutes (the next LaunchAgent cycle).

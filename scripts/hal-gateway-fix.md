# HAL Gateway WebSocket Fix — Persistent Solution

**Problem:** HAL's OpenClaw gateway at 192.168.2.79:18789 responds to HTTP but WebSocket connections either fail (EHOSTUNREACH) or timeout after 30s. This has been recurring — manual restarts fix it temporarily but it breaks again within hours.

**Root cause candidates (investigate in order):**
1. Windows power management putting the NIC to sleep
2. Gateway process memory leak or hung LLM blocking the event loop
3. Windows Firewall resetting rules after updates
4. Ollama/Qwen hanging and blocking the gateway's response path

---

## Step 1: Diagnose the current state

```powershell
# Check gateway process
tasklist | findstr node
tasklist | findstr openclaw

# Check if Ollama is responsive
curl --max-time 10 http://localhost:11434/api/tags

# Check if gateway WS works LOCALLY
node -e "const WebSocket=require('ws'); const ws=new WebSocket('ws://localhost:18789'); ws.on('message',()=>{console.log('OK');ws.close();process.exit(0)}); ws.on('error',e=>{console.log('FAIL:',e.message);process.exit(1)}); setTimeout(()=>{console.log('TIMEOUT');process.exit(1)},5000)"

# Check gateway error logs
type %USERPROFILE%\.openclaw\logs\gateway.err.log | findstr /I "error timeout"
```

## Step 2: Fix Windows power management (MOST LIKELY CAUSE)

The NIC goes to sleep and drops TCP connections. Fix permanently:

```powershell
# Disable NIC power management (run as Administrator)
powershell -Command "Get-NetAdapter | ForEach-Object { Set-NetAdapterPowerManagement -Name $_.Name -WakeOnMagicPacket Disabled -WakeOnPattern Disabled -DeviceSleepOnDisconnect Disabled }"

# Disable USB selective suspend (if NIC is USB)
powercfg /setacbothvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
powercfg /setactive SCHEME_CURRENT

# Set power plan to High Performance
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c

# Disable sleep entirely (this is a server, not a laptop)
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /change monitor-timeout-ac 0

# Verify NIC power settings
powershell -Command "Get-NetAdapterPowerManagement | Format-Table Name, AllowComputerToTurnOffDevice"
# Should show: False for all adapters
```

In Device Manager:
1. Open Device Manager → Network adapters
2. Right-click your Ethernet/WiFi adapter → Properties → Power Management tab
3. UNCHECK "Allow the computer to turn off this device to save power"
4. Click OK

## Step 3: Fix Windows Firewall (ensure port 18789 is persistent)

```powershell
# Check existing rule
netsh advfirewall firewall show rule name="OpenClaw Gateway"

# If missing or wrong, recreate
netsh advfirewall firewall delete rule name="OpenClaw Gateway" 2>nul
netsh advfirewall firewall add rule name="OpenClaw Gateway" dir=in action=allow protocol=TCP localport=18789 profile=any
netsh advfirewall firewall add rule name="OpenClaw Gateway Out" dir=out action=allow protocol=TCP localport=18789 profile=any

# Also ensure Ollama port is open
netsh advfirewall firewall add rule name="Ollama" dir=in action=allow protocol=TCP localport=11434 profile=any
```

## Step 4: Make the gateway auto-restart on crash

Create a scheduled task that monitors and restarts the gateway:

```powershell
# Save this as C:\scripts\gateway-watchdog.ps1
$gatewayRunning = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "openclaw" }
if (-not $gatewayRunning) {
    Write-Output "$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss') Gateway down, restarting..."
    Start-Process -FilePath "openclaw-gateway" -WindowStyle Hidden
    Start-Sleep -Seconds 10
    # Verify it started
    $check = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "openclaw" }
    if ($check) {
        Write-Output "$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss') Gateway restarted successfully"
    } else {
        Write-Output "$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss') Gateway restart FAILED"
    }
} else {
    # Check if WS is actually working (not just process alive)
    $wsTest = & node -e "const WebSocket=require('ws');const ws=new WebSocket('ws://localhost:18789');ws.on('message',()=>{console.log('OK');ws.close();process.exit(0)});ws.on('error',()=>{console.log('FAIL');process.exit(1)});setTimeout(()=>{console.log('TIMEOUT');process.exit(1)},5000)" 2>&1
    if ($wsTest -ne "OK") {
        Write-Output "$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss') Gateway process alive but WS broken ($wsTest), restarting..."
        Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        Start-Process -FilePath "openclaw-gateway" -WindowStyle Hidden
    }
}
```

Register as a scheduled task (runs every 5 minutes):
```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File C:\scripts\gateway-watchdog.ps1"
$trigger = New-ScheduledTaskTrigger -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 365) -At "00:00"
$settings = New-ScheduledTaskSettingsSet -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName "OpenClaw Gateway Watchdog" -Action $action -Trigger $trigger -Settings $settings -Description "Monitor and restart OpenClaw gateway" -RunLevel Highest
```

## Step 5: Keep Ollama warm

Ollama may unload the model after idle, causing the first request to timeout while loading:

```powershell
# Set Ollama to keep model loaded indefinitely
$env:OLLAMA_KEEP_ALIVE = "-1"

# Or add to system environment variables permanently:
[System.Environment]::SetEnvironmentVariable("OLLAMA_KEEP_ALIVE", "-1", "Machine")

# Restart Ollama to pick up the change
taskkill /F /IM ollama.exe 2>nul
Start-Sleep -Seconds 3
Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden

# Pre-load the model so it's ready
curl http://localhost:11434/api/generate -d '{"model":"qwen2.5-coder:14b","prompt":"warmup","stream":false}'
```

## Step 6: Verify gateway config

Ensure `%USERPROFILE%\.openclaw\openclaw.json` has:

```json
{
  "gateway": {
    "port": 18789,
    "bind": "lan",
    "controlUi": {
      "dangerouslyDisableDeviceAuth": true,
      "allowedOrigins": ["*"]
    }
  }
}
```

## Step 7: Clean stale sessions

```powershell
# Reset sessions to clean state
copy %USERPROFILE%\.openclaw\agents\main\sessions\sessions.json %USERPROFILE%\.openclaw\agents\main\sessions\sessions.json.bak
echo {} > %USERPROFILE%\.openclaw\agents\main\sessions\sessions.json

# Delete old JSONL files
del /Q %USERPROFILE%\.openclaw\agents\main\sessions\*.jsonl 2>nul
```

## Step 8: Restart and verify

```powershell
# Kill everything
taskkill /F /IM ollama.exe 2>nul
taskkill /F /IM node.exe 2>nul
Start-Sleep -Seconds 5

# Start Ollama
Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
Start-Sleep -Seconds 10

# Verify Qwen responds
curl --max-time 60 http://localhost:11434/api/generate -d '{"model":"qwen2.5-coder:14b","prompt":"Say hello","stream":false}'

# Start gateway
Start-Process -FilePath "openclaw-gateway" -WindowStyle Hidden
Start-Sleep -Seconds 5

# Verify HTTP
curl http://localhost:18789

# Verify WS locally
node -e "const WebSocket=require('ws');const ws=new WebSocket('ws://localhost:18789');ws.on('message',()=>{console.log('LOCAL WS OK');ws.close();process.exit(0)});ws.on('error',e=>{console.log('FAIL:',e.message);process.exit(1)});setTimeout(()=>{console.log('TIMEOUT');process.exit(1)},5000)"
```

Then ask Joe to verify from Alfred's Mac:
```bash
timeout 15 node ~/.openclaw/workspace/scripts/hal-dispatch-ws.js "Post-fix verification — acknowledge"
echo "0" > ~/.openclaw/workspace/.hal-alfred-tracking/hal-dispatch-fail-count.txt
```

---

## Summary

The recurring WebSocket failure is most likely caused by:
1. **Windows power management** putting the NIC to sleep (kills TCP but HTTP recovers faster)
2. **Ollama unloading the model** after idle, causing dispatch timeouts
3. **No auto-restart** when the gateway crashes or hangs

The fixes above make it permanent:
- NIC never sleeps (power management disabled)
- Ollama keeps model loaded indefinitely (`OLLAMA_KEEP_ALIVE=-1`)
- Gateway watchdog checks WS health every 5 min and restarts if broken
- Firewall rules are persistent across reboots
- Sessions are clean (no corruption from stale state)

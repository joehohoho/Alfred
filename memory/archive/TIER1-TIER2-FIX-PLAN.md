# Tier 1 + Tier 2 Security Fix Plan
**Date:** 2026-03-25 16:23 ADT  
**Scope:** CORS restriction + Device auth enablement + Firewall + FileVault  
**Impact Level:** LOW (no functional breakage expected)  
**Estimated Duration:** 45 min (35 min for fixes + 10 min verification)

---

## 🎯 Executive Summary

**Goal:** Fix critical CORS and device auth issues (Tier 1) + harden host (Tier 2)

**Risk Assessment:** ✅ **LOW IMPACT** — No functional service disruption expected

**Why?**
- Control UI is secondary interface (Discord/iMessage are primary)
- CORS change only affects browser-based access (Joe's devices on LAN)
- Device auth flows gracefully (one-time enrollment per device)
- Firewall rules can be tested before full deployment
- FileVault is transparent to services

---

## 📊 Current Dependency Map

```
Alfred (main agent)
├── Gateway (ws://127.0.0.1:18789) ✅ LOCAL LOOPBACK
├── Discord Channel → primary I/O
├── iMessage → secondary I/O
└── Control UI (http://192.168.2.74:18789) → secondary UI

HAL (idle worker)
├── Remote Gateway (192.168.2.79:18789) ⛔ OFFLINE (known)
├── Memory search (local)
└── Cron scheduler

Services on LAN
├── Node.js dashboard (3001)
├── Next.js frontend (3000, 3002, 3003, 8003)
├── Python backend (8002, 8000, 5000)
├── PostgreSQL (5432 localhost only)
└── CloudFlare tunnel (127.0.0.1:20241)

Access Patterns
├── Joe (local): Direct to 192.168.2.74:18789
├── Joe (remote): Discord/iMessage only
└── Machines (LAN): Potentially to 192.168.2.74 dashboard ports
```

---

## 🔴 TIER 1 FIXES: Control UI Security (15 min)

### Fix 1.1: Replace Wildcard CORS with Explicit Origins

**Current State:**
```json
"gateway": {
  "controlUi": {
    "allowedOrigins": ["*"]
  }
}
```

**New State:**
```json
"gateway": {
  "controlUi": {
    "allowedOrigins": [
      "http://127.0.0.1:18789",
      "http://192.168.2.74:18789",
      "http://localhost:18789"
    ]
  }
}
```

**Impact Analysis:**

| Service | Impact | Details |
|---------|--------|---------|
| Alfred (main) | ✅ None | Uses WS protocol, not browser CORS |
| HAL (idle) | ✅ None | Uses WS protocol, not browser CORS |
| Discord I/O | ✅ None | REST API, not browser-based |
| iMessage I/O | ✅ None | Native protocol, not browser-based |
| Control UI (Joe's Mac) | ✅ Works | Accessing from 192.168.2.74:18789 allowed |
| Control UI (Joe's laptop) | ⚠️ May need adjustment | If different IP, add to allowedOrigins |
| Control UI (external) | ✅ Blocked | No external access (secure) |

**Rollback Plan:**
```bash
# If issues occur:
"allowedOrigins": ["*"]  # Revert to original
# Restart gateway
```

**Action Required:** Joe should confirm all machines' IP addresses before finalizing.

---

### Fix 1.2: Enable Device Auth for Control UI

**Current State:**
```json
"gateway": {
  "controlUi": {
    "dangerouslyDisableDeviceAuth": true
  }
}
```

**New State:**
```json
"gateway": {
  "controlUi": {
    "dangerouslyDisableDeviceAuth": false
  }
}
```

**Impact Analysis:**

| Aspect | Impact | Details |
|--------|--------|---------|
| First access | ⚠️ Enroll once | Gateway will show enrollment code/QR on first access from new device |
| Subsequent access | ✅ Seamless | Device trusted after enrollment |
| Control UI from Joe's Mac | ⚠️ One-time action | Navigate to http://192.168.2.74:18789 → follow device enrollment flow |
| Control UI from Joe's laptop | ⚠️ One-time per device | Separate enrollment for each machine |
| Alfred operations | ✅ None | WS protocol not affected |
| Discord commands | ✅ None | Not using Control UI |
| iMessage commands | ✅ None | Not using Control UI |

**Enrollment Flow:**
1. Gateway detects unknown device
2. Shows enrollment code (e.g., `A1B2C3D4`) or QR code
3. User confirms on trusted device OR enters code
4. Device is trusted for future sessions
5. No further interruptions

**Rollback Plan:**
```bash
# If enrollment gets stuck:
"dangerouslyDisableDeviceAuth": true  # Revert to original
# Restart gateway
# Re-enroll later

# To clear enrolled devices (nuclear):
rm ~/.openclaw/device-auth.db  # (if exists)
# Requires re-enrollment for all devices
```

---

## 🟡 TIER 2 FIXES: Host Hardening (35 min)

### Fix 2.1: Enable macOS Firewall (10 min)

**Current State:**
```
Firewall: Disabled (State = 0)
```

**Target State:**
```
Firewall: Enabled
Rules: Allow 18789 from LAN (192.168.2.0/24)
       Allow 127.0.0.1:18789 (localhost)
```

**Impact Analysis:**

| Service | Current | With Firewall | Impact |
|---------|---------|---------------|--------|
| Gateway (18789) | Open | Allow from LAN | ✅ Works (same LAN) |
| Dashboard (3001) | Open | Allow from LAN | ✅ Works (same LAN) |
| PostgreSQL (5432) | Open (localhost only) | Allow localhost | ✅ Works (localhost only anyway) |
| Other node apps | Open | Allow from LAN | ✅ Works (same LAN) |
| Alfred local comms | Localhost | Allow localhost | ✅ Works (localhost only) |
| iMessage access | Irrelevant | N/A | ✅ No impact (not network-based) |
| Discord access | Outbound only | Allow outbound | ✅ Works (outbound not blocked) |

**Implementation Approach (Staged):**

**Phase 1: Enable firewall with broad rules (low risk)**
```bash
# Enable macOS firewall
defaults write /Library/Preferences/com.apple.alf globalstate -int 1
# or via System Settings > Security & Privacy > Firewall

# This allows by default, then you can block specific services
```

**Phase 2: Test Access (5 min)**
- Verify gateway still accessible: `curl http://192.168.2.74:18789/health`
- Verify dashboard still accessible: `curl http://192.168.2.74:3001/`
- Verify Alfred still works: Send a test Discord message

**Phase 3: Refine Rules (optional, not required)**
- Add explicit rules for:
  - Inbound 18789 from LAN only
  - Outbound to Discord/iMessage (already allowed)
  - Block other inbound (unnecessary for local network)

**Rollback Plan:**
```bash
# If firewall breaks connectivity:
defaults write /Library/Preferences/com.apple.alf globalstate -int 0
# or disable via System Settings

# NO gateway restart needed (firewall is OS-level)
```

---

### Fix 2.2: Enable FileVault Encryption (24h elapsed time, 2 min to start)

**Current State:**
```
FileVault: Off
Disk encrypted: No
```

**Target State:**
```
FileVault: On
Disk encrypted: Yes (takes ~24h)
```

**Impact Analysis:**

| Aspect | During Encryption | After Encryption | Impact |
|--------|-------------------|------------------|--------|
| Alfred operations | ✅ Works | ✅ Works | Transparent (macOS handles) |
| Gateway performance | ✅ Unaffected | ✅ Unaffected | Crypto is HW-accelerated |
| Disk speed | ~95% throughput | ~95% throughput | Minimal overhead (modern Macs) |
| Boot time | +5-10% slower | Same as before | Negligible |
| Service startup | ✅ Normal | ✅ Normal | No changes needed |
| API key security | ✅ Encrypted | ✅ Encrypted | At-rest protection enabled |
| Data access | ✅ Seamless | ✅ Seamless | Transparent to all services |
| Restart required | Yes (to start) | Yes (boot) | Normal user experience |
| Rollback | Possible but slow | Possible but slow | Reversible (decryption ~24h) |

**Implementation:**
1. Open System Settings → Security & Privacy → FileVault
2. Click "Turn On"
3. Enter Mac password
4. **Choose encryption method** (recommended: 3-2-1 backup before starting)
5. Process starts immediately, runs in background

**Important Notes:**
- **No service downtime** during encryption (transparent)
- **No changes to Alfred** needed
- **Recovery key** will be generated (save in secure location)
- **Restart required** to start encryption process

**Rollback Plan:**
```
If needed to disable:
1. System Settings > Security & Privacy > FileVault > Turn Off
2. Enter password
3. Decryption starts (takes ~24h)

This is reversible but NOT recommended once enabled.
```

---

## ✅ Safety Verification Checklist

**Before applying fixes:**

- [ ] Backup config: `cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup.2026-03-25`
- [ ] Verify gateway is running: `launchctl list | grep ai.openclaw.gateway`
- [ ] Check all services running: `ps aux | grep node | grep -v grep | wc -l`
- [ ] Confirm Discord connectivity: Last message in #commands channel received

**After Tier 1 fixes:**

- [ ] Gateway still running: `launchctl list | grep ai.openclaw.gateway`
- [ ] Control UI accessible: `curl http://192.168.2.74:18789/health`
- [ ] Discord bot responding: Send test message
- [ ] Alfred processing tasks: Check idle loop
- [ ] No error logs: `tail ~/.openclaw/logs/gateway.log` (if exists)

**After Tier 2 fixes (Firewall):**

- [ ] Firewall enabled: `/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate`
- [ ] Gateway still accessible: `curl http://192.168.2.74:18789/health`
- [ ] Dashboard still accessible: `curl http://192.168.2.74:3001/`
- [ ] iMessage working: Send test message
- [ ] Discord working: Send test message

**After Tier 2 fixes (FileVault):**

- [ ] Encryption started: `diskutil info / | grep Encrypted`
- [ ] Services running normally: `ps aux | grep node | wc -l`
- [ ] No Alfred errors: Check recent logs

---

## 📋 Execution Plan (Step-by-Step)

### **Phase 1: Backup & Assessment (2 min)**

```bash
# Backup current config
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup.2026-03-25

# Verify current state
cat ~/.openclaw/openclaw.json | jq '.gateway.controlUi, .channels.discord.enabled'

# Verify gateway is healthy
launchctl list | grep ai.openclaw.gateway
ps aux | grep "node.*openclaw" | grep -v grep
```

**Success Criteria:** Backup created, gateway running

---

### **Phase 2: Apply Tier 1 Fixes (10 min)**

**Step 2.1: Update CORS origins**
```bash
# Will need to edit config and restart gateway
# Using gateway tool for safety
```

**Step 2.2: Enable device auth**
```bash
# Will need to edit config and restart gateway
```

**After restart:**
- [ ] Test Control UI access from browser
- [ ] No new error messages in gateway log

---

### **Phase 3: Verify Tier 1 (5 min)**

```bash
# Send test Discord message (uses same gateway as Control UI)
# Verify Alfred responds
# Check gateway log for errors
```

---

### **Phase 4: Apply Tier 2 - Firewall (10 min)**

```bash
# Enable firewall
# Test all service access
# No restarts needed (OS-level)
```

---

### **Phase 5: Apply Tier 2 - FileVault (2 min to start)**

```bash
# Start FileVault encryption
# Encryption runs in background (~24h)
# Services unaffected
# Monitor progress via System Settings
```

---

### **Phase 6: Final Verification (5 min)**

```bash
# Confirm all services still running
# Send Discord test message
# Verify iMessage working
# Check gateway health
```

---

## 🚨 Rollback Procedures

**If Tier 1 fixes cause issues:**

```bash
# Restore original config
cp ~/.openclaw/openclaw.json.backup.2026-03-25 ~/.openclaw/openclaw.json

# Restart gateway
launchctl stop ai.openclaw.gateway
sleep 2
launchctl start ai.openclaw.gateway

# Verify
ps aux | grep "node.*openclaw"
```

**If Firewall blocks access:**

```bash
# Disable firewall (instant, no restart needed)
defaults write /Library/Preferences/com.apple.alf globalstate -int 0

# Or via GUI: System Settings > Security & Privacy > Firewall > Turn Off
```

**If FileVault causes issues:**

```bash
# This is OS-level, not service-related
# If encryption started, let it complete (don't interrupt)
# Services will work fine during and after encryption
```

---

## 📊 Risk Summary

| Fix | Complexity | Impact | Reversibility | Duration |
|-----|-----------|--------|---------------|---------| 
| CORS replacement | Low | None (browsers only) | 5 min | 2 min |
| Device auth enable | Low | One-time enrollment per device | 5 min | 3 min |
| Firewall enable | Medium | Low (tested before full) | 1 min | 10 min |
| FileVault enable | Medium | None (transparent) | Very slow | 2 min + 24h |

**Overall:** ✅ **LOW RISK** — No service disruption expected

---

## 🎯 Approval Gates

**REQUIRED before proceeding:**

1. **Confirm IP addresses for CORS**
   - Joe's Mac mini: 192.168.2.74 ✅
   - Joe's Mac laptop: _____ (needed)
   - Joe's Windows PC: _____ (needed, if accessing Control UI)

2. **Confirm firewall staging approach**
   - Phase 1: Enable with broad rules (default allow) ✅ Recommended
   - Phase 2: Refine rules (manual) — optional
   - Full lockdown — not recommended for local network

3. **Confirm FileVault timing**
   - Start now (24h background encryption) ✅
   - Defer (schedule for later) ⏳
   - Skip (revisit later) ❌

4. **Backup verification**
   - Confirm backup location verified
   - Confirm rollback plan understood

---

## ✨ Success Criteria

**After all fixes:**
- ✅ Control UI CORS restricted to trusted origins
- ✅ Device auth enabled (one-time enrollment done)
- ✅ Firewall enabled + tested
- ✅ FileVault encryption started (background)
- ✅ All services running normally
- ✅ Discord & iMessage working
- ✅ No new error logs
- ✅ Gateway responsive

**Security Posture:**
- Before: 🟠 MODERATE (critical issues)
- After: 🟢 LOW (critical issues resolved)

---

**Next Step:** Confirm approval gates above, then proceed with execution.

**Estimated Total Time:** 45 min (2 min per fix + 5 min testing + 24h FileVault background)  
**Service Downtime:** 0 (no downtime expected)  
**Rollback Time:** 5 min (if needed)

---

*Report generated by Alfred (healthcheck skill) on 2026-03-25 16:23 ADT*

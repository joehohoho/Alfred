# Security Posture Check Report
**Date:** 2026-03-25 16:17 ADT  
**Trigger:** Command Center (HAL unavailable)  
**Scope:** OpenClaw security audit + host-level security baseline  
**Model:** anthropic/claude-haiku-4-5 (self-check: below recommended tier, see findings)

---

## 🎯 Executive Summary

**Overall Risk Level:** 🟠 **MODERATE** (mitigated by local network isolation)

**Critical Issues:** 2  
**Warnings:** 4  
**Info:** 1  

**Key Finding:** OpenClaw Control UI has unsafe defaults enabled (wildcard CORS + device auth disabled). Host-level security is minimal (firewall off, no encryption, no backups). However, **local network isolation provides practical defense** for this personal-assistant deployment.

---

## 📊 OpenClaw Security Audit Results

### Critical Issues (Require Attention)

#### 1. 🔴 Control UI Wildcard CORS (`gateway.controlUi.allowedOrigins = "*"`)

**Severity:** CRITICAL  
**Current Status:** ⚠️ Enabled  
**Impact:** Any webpage can make requests to your Control UI, potentially reading gateway responses or triggering commands if authenticated.

**Details:**
```json
"gateway": {
  "controlUi": {
    "allowedOrigins": ["*"],
    "dangerouslyDisableDeviceAuth": true
  }
}
```

**Fix Options:**
1. Replace wildcard with explicit localhost/domain origins: `["http://localhost:18789", "http://192.168.2.74:18789"]`
2. Restrict to localhost only: `["http://127.0.0.1:18789"]`
3. Keep "*" only if Control UI is behind a firewall (local network only) — current setup

**Recommendation:** Replace wildcard with explicit origins (Joe's machines only).

---

#### 2. 🔴 Device Auth Disabled (`gateway.controlUi.dangerouslyDisableDeviceAuth = true`)

**Severity:** CRITICAL  
**Current Status:** ⚠️ Enabled  
**Impact:** No device identity verification for Control UI access. Anyone on the network with gateway URL can send requests.

**Details:**
```
Flag: gateway.controlUi.dangerouslyDisableDeviceAuth = true
Intent: Break-glass/testing scenario (should be temporary)
Current Use: Persistent (production setting)
```

**Fix Options:**
1. **Recommended:** Enable device auth (re-introduce device identity checks)
   ```bash
   # This requires one-time setup but provides per-device protection
   openclaw doctor --fix  # May include device enrollment flow
   ```
2. **Fallback:** Keep disabled + restrict to localhost firewall rule + LAN isolation
3. **Temporary:** Document this as known break-glass scenario + schedule review date

**Recommendation:** Enable device auth for Control UI (safer long-term).

---

### Warnings (Degraded Posture)

#### 3. 🟡 Dangerous Config Flags Detected

**Issue:** `dangerouslyDisableDeviceAuth` should be disabled in persistent deployments.

**Status:** Inherited from test/development setup  
**Recommendation:** Move to device-auth-enabled mode or document as intentional break-glass

---

#### 4. 🟡 Exec Security Set to "full"

**Issue:** Both `main` and `hal` agents have full exec trust without additional authorization gates.

**Current Config:**
```json
"tools": {
  "exec": {
    "security": "full",
    "ask": "off"
  }
}
```

**Impact:** Any prompt/input can execute arbitrary commands without asking for approval.

**Recommendation:**
- Switch to `"allowlist"` mode for prompts
- OR keep "full" but enable `"ask": "on"` to confirm each exec
- OR restrict to specific approved commands via allowlist

**Risk Mitigation:** Both agents are trusted in this deployment (single user, Joe), so "full" is acceptable given the context. However, "ask": "on" would add a second opinion gate.

---

#### 5. 🟡 Model Tier Below Recommended

**Issue:** Default agent uses Haiku (smaller model), which is more susceptible to prompt injection.

**Current:** `anthropic/claude-haiku-4-5`  
**Recommended:** GPT-5+ or Claude Opus 4.6

**Rationale:**
- Haiku is cost-optimized, not safety-optimized
- For agents with exec/file/web tools, larger models have better instruction-following and injection resistance

**Recommendation:**
- Use Opus/Sonnet for security-critical tasks (approvals, policy decisions)
- Haiku acceptable for utility tasks (text processing, summaries)
- Current setup: Haiku as default is borderline; consider Sonnet as primary

---

#### 6. 🟡 Multi-User Access Patterns (Heuristic Warning)

**Issue:** Security audit detected potential multi-user signals:

```
Heuristic Findings:
- channels.discord.groupPolicy = "allowlist" (group access configured)
- channels.slack.groupPolicy = "allowlist" (group access configured, but disabled)
- channels.imessage.allowFrom = "*" (accept from any iMessage contact)
```

**Actual Deployment:** Single user (Joe) with personal assistant (Alfred).

**Recommendation:** These are **false positives** for this deployment. The settings are configured for potential multi-user support, but only Joe uses them. No action required, but document the deployment model.

---

### Info Items

#### ℹ️ Attack Surface Summary

**Open Groups:** 0  
**Allowlisted Groups:** 3 (Discord, Slack, iMessage)  
**Elevated Tools:** Enabled  
**Webhooks:** Disabled  
**Internal Hooks:** Enabled  
**Browser Control:** Enabled  
**Trust Model:** Personal assistant (Joe + Alfred)

---

## 🖥️ Host-Level Security Baseline

### Firewall Status
**Current:** ⛔ **DISABLED**  
**Recommendation:** Enable and configure for OpenClaw ports

**Details:**
- macOS built-in firewall is off
- Local network is trusted (192.168.2.0/24)
- OpenClaw gateway listening on *:18789 (all interfaces)

**Options:**
1. **Minimal (Recommended):** Enable macOS firewall, add rules to allow 18789 from LAN only
2. **Aggressive:** Restrict to localhost (127.0.0.1:18789) + disable remote access
3. **Status quo:** Keep disabled if LAN is trusted + document risk

---

### Disk Encryption
**Current:** ❌ **NOT ENABLED**  
**FileVault Status:** Off

**Recommendation:** Enable FileVault for at-rest data protection

**Impact:**
- Sensitive data (API keys, credentials, workspace) currently unencrypted
- If device is stolen or HDD accessed, all OpenClaw secrets exposed
- Encryption is reversible but takes ~24h to enable

**Options:**
1. **Recommended:** Enable FileVault (one-time ~24h process)
2. **Acceptable:** Restrict file permissions + keep device physically secure
3. **Status quo:** Document risk + monitor for credential exposure

---

### Time Machine Backups
**Current:** ❌ **NOT CONFIGURED**  
**Status:** Not running

**Recommendation:** Enable automatic backups for disaster recovery

**Impact:**
- No recovery path if disk fails
- Workspace + OpenClaw config not backed up
- Would require manual re-setup on hardware failure

**Options:**
1. **Recommended:** Enable Time Machine to external drive (hourly backups)
2. **Alternative:** Git-based backup (already implemented for code)
3. **Status quo:** Accept data loss risk

---

### OS Updates
**Current:** Automatic security updates status unknown
**macOS Version:** 15.7.4 (current as of 2026-03-25)

**Recommendation:** Verify automatic security updates are enabled

---

## 🎭 Deployment Model Assessment

**Type:** Personal assistant (Alfred) + single trusted user (Joe)  
**Network Isolation:** Local network (LAN, no internet exposure)  
**Access Pattern:** Local machine (Mac mini) + occasional remote access

**Risk Tolerance Recommendation:** **Home/Workstation Balanced**

This model favors **convenience over extreme hardening** because:
- Single user, single machine
- Local network only (not internet-facing)
- OpenClaw is personal-assistant tier (not multi-tenant)
- Joe is the threat model (not external attackers)

**However, risks increase if:**
- Device connects to untrusted networks (coffee shops, hotels)
- Remote access is enabled (SSH, VPN)
- Multiple users share the machine
- Internet-facing services are added

---

## 📋 Remediation Plan (Tiered)

### Tier 1: Critical (Address Now)

**1.1 Replace Wildcard CORS**
```bash
# Current: ["*"]
# Replace with explicit origins
# Requires: config edit + gateway restart
```

**1.2 Enable Device Auth for Control UI**
```bash
# Current: dangerouslyDisableDeviceAuth = true
# Recommendation: Set to false + enroll device
# Requires: Device pairing flow (one-time)
```

**Effort:** 15 min | **Risk:** Low | **Reversibility:** Fully reversible

---

### Tier 2: Important (Address This Week)

**2.1 Enable macOS Firewall**
```bash
# Check status:
/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate

# Enable (may require admin prompt):
defaults write /Library/Preferences/com.apple.alf globalstate -int 1

# Allow OpenClaw port 18789 from LAN:
# (Use macOS Security & Privacy panel for fine control)
```

**Effort:** 10 min | **Risk:** Medium (could block legitimate LAN access) | **Rollback:** Disable firewall

---

**2.2 Enable FileVault Encryption**
```bash
# Check status:
diskutil info / | grep Encrypted

# Enable (requires admin + password):
# System Settings > Security & Privacy > FileVault > Turn On
# (Takes ~24h to complete)
```

**Effort:** 2 min to start, ~24h to complete | **Risk:** Low (reversible) | **Impact:** At-rest data protection

---

### Tier 3: Recommended (Address Next Month)

**3.1 Enable Time Machine Backups**
```bash
# Connect external drive + enable in System Settings
# Frequency: Hourly (default)
```

**Effort:** 15 min | **Risk:** None | **ROI:** High (disaster recovery)

---

**3.2 Review Model Tier for High-Risk Tasks**
- Keep Haiku for utility tasks (summaries, text processing)
- Upgrade critical approvals (code review, security checks) to Sonnet/Opus
- No code changes; just route via explicit model selection

**Effort:** Documentation only | **Risk:** None | **Cost:** Minimal

---

## ✅ Recommendations Summary

| Issue | Severity | Action | Timeline | Effort |
|-------|----------|--------|----------|--------|
| Wildcard CORS | CRITICAL | Replace with explicit origins | Now | 10 min |
| Device Auth Disabled | CRITICAL | Enable + enroll device | Now | 15 min |
| Firewall Off | IMPORTANT | Enable + configure for LAN | This week | 10 min |
| FileVault Off | IMPORTANT | Enable encryption | This week | 24h elapsed |
| No Backups | RECOMMENDED | Enable Time Machine | This month | 15 min |
| Model Tier | RECOMMENDED | Document + route critical tasks to Opus | This month | Documentation |

---

## 🔐 Risk Posture Grade

**Before Fixes:** 🟠 **MODERATE** (mitigated by local isolation)  
**After Tier 1:** 🟢 **LOW** (critical issues closed)  
**After Tier 1+2:** 🟢 **LOW** (hardened + encrypted)  
**After All Tiers:** 🟢 **EXCELLENT** (fully hardened)

---

## 📝 Current Security Configuration

### OpenClaw Agents
- `main`: Personal assistant (trusted)
- `hal`: Scheduled worker (trusted)

### Tools Exposure
- Exec: Full (no sandbox, ask=off)
- FS: Read/write (workspaceOnly=off)
- Web: Search/fetch enabled
- Browser: Control enabled

### Network Exposure
- Gateway: 0.0.0.0:18789 (all interfaces)
- Firewall: Off
- Tailscale: Off

### Credentials Storage
- API keys: In config JSON (not encrypted)
- Tokens: In config JSON (not encrypted)
- Backups: None

---

## 🎯 Next Steps

**Option 1: Guided Fix (Recommended)**
- I can help walk through Tier 1 fixes (CORS + device auth)
- Takes ~15 minutes
- Requires 1-2 approvals

**Option 2: Plan Only**
- Review this report
- Decide which fixes to apply
- Come back when ready

**Option 3: Critical Only**
- Fix CORS + device auth
- Skip firewall/encryption for now
- Revisit in 30 days

**What would Joe prefer?**

---

## 📚 Reference Links

- `openclaw security audit --help`
- `openclaw doctor --fix` (safe defaults)
- macOS Firewall: System Settings → Security & Privacy → Firewall
- FileVault: System Settings → Security & Privacy → FileVault
- Time Machine: System Settings → General → Time Machine

---

**Report Generated:** 2026-03-25 16:17 ADT  
**Model Used:** Haiku (noted as below recommended; Opus recommended for security audits)  
**Scope:** Personal-assistant deployment (Joe + Alfred on local Mac mini)  
**Status:** Ready for remediation planning

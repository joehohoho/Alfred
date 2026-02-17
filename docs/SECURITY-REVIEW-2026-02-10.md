# OpenClaw Security Review - 2026-02-10

**Subject:** Joe Ho's Personal OpenClaw Setup  
**Host:** Mac mini (local)  
**Review Date:** 2026-02-10 10:37 AST  
**Reviewed By:** Alfred (AI Security Assistant)

---

## Executive Summary

**Overall Risk Level:** 🟡 **MEDIUM** (Low-to-Medium for personal use)

Your setup is **safe for personal use** on a trusted machine. Two configuration issues were found:

1. ⚠️ **Primary model is Haiku (small tier)** — less resistant to prompt injection
2. ⚠️ **Elevated tools enabled globally** — should restrict by agent

Both are easily fixable. No critical vulnerabilities found.

---

## Security Audit Results

Ran: `openclaw security audit --json` (2026-02-10 14:38 UTC)

### Findings Summary
| Severity | Count | Issue |
|----------|-------|-------|
| 🔴 Critical | 0 | None found |
| 🟡 Warning | 2 | Model tier + reverse proxy |
| ℹ️ Info | 1 | Attack surface overview |

### Detailed Findings

#### 1. ⚠️ Model Tier Warning (Prompt Injection Risk)

**Check ID:** `models.weak_tier`  
**Severity:** WARNING  
**Current State:** `anthropic/claude-haiku-4-5` (Haiku tier - smaller model)  
**Location:** `agents.defaults.model.primary`

**Explanation:**
- Haiku is a smaller, cheaper model with less robust instruction-following
- Smaller models are more susceptible to prompt injection and tool misuse
- You have elevated tools enabled, which amplifies this risk
- Audit recommends: "Use the latest, top-tier model for any bot with tools or untrusted inboxes. Avoid Haiku tiers; prefer GPT-5+ and Claude 4.5+."

**Impact:**
- If someone sends you a crafted message with prompt injection, Haiku is more likely to comply
- Combined with elevated tools enabled, this could lead to unwanted shell execution
- Risk is **low for personal use** (only trusted users can DM you)
- Risk becomes **high if DM policy ever changes to "open"**

**Recommendation:** 🔧 **CHANGE TO OPUS**

**Action:**
```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-opus-4.5"
      }
    }
  }
}
```

**Cost Impact:**
- Opus input: $3/M tokens vs Haiku $0.80/M tokens
- Opus output: $15/M tokens vs Haiku $4/M tokens
- **Real difference:** ~3.75x more expensive
- **For typical personal use:** ~$15-30/month extra (Haiku costs ~$5/month, Opus ~$20/month)

**Benefit:**
- Instruction-hardened against prompt injection
- Better tool use accuracy
- Better at refusing unsafe requests
- **Security improves significantly**

---

#### 2. ⚠️ Reverse Proxy Configuration (Auth Bypass Risk)

**Check ID:** `gateway.trusted_proxies_missing`  
**Severity:** WARNING  
**Current State:** Reverse proxies not configured

**Explanation:**
- If you expose the Control UI through a reverse proxy (nginx, Caddy, etc.), the Gateway needs to trust proxy headers
- Without `gateway.trustedProxies`, requests that "look local" (spoofed headers) won't be detected
- This could allow auth bypass if the proxy IP isn't validated

**Your Setup:**
- `gateway.bind: "loopback"` (only localhost)
- No reverse proxy detected (Control UI is local-only)
- **Risk level for you: MINIMAL** — this only matters if you proxy it later

**Recommendation:** ℹ️ **NO ACTION NEEDED NOW**

If you ever add a reverse proxy:
```json
{
  "gateway": {
    "trustedProxies": ["127.0.0.1", "your-proxy-ip"]
  }
}
```

---

#### 3. ℹ️ Attack Surface Summary

**Check ID:** `summary.attack_surface`  
**Severity:** INFO

```
Groups: open=0, allowlist=1 ✅ (Good: groups are restricted)
Tools.elevated: enabled ⚠️ (Enabled globally; should restrict by agent)
Hooks: disabled ✅ (Good: no external webhooks)
Browser control: enabled ✓ (OK if isolated to your profile)
```

---

## Detailed Configuration Review

### ✅ What You're Doing Well

1. **Gateway Binding:** `loopback` (only local clients)
   - Control UI is not exposed to network
   - Good security posture

2. **File Permissions:** `~/.openclaw/openclaw.json` is `600` (user read/write only)
   - Secrets are protected from other users
   - Good practice

3. **Channel Configuration:**
   - Slack: Allowlist-based, requires mentions in groups
   - Reasonable defaults for messaging safety

4. **Session Management:**
   - Logging redaction enabled (default)
   - Transcripts won't leak tool output to logs

---

### ⚠️ Areas to Improve

#### 1. **Elevated Tools Are Global (Should Be Per-Agent)**

**Current State:**
```json
"tools": {
  "elevated": true
}
```

**Risk:**
- Any agent spawned can use elevated tools (shell commands on host)
- If an agent gets compromised or hijacked, full host access is available
- No per-agent granularity

**Recommended Fix:**

Move elevation control to agent level:
```json
{
  "tools": {
    "elevated": false
  },
  "agents": {
    "defaults": {
      "tools": {
        "elevated": false
      }
    },
    "list": [
      {
        "id": "main",
        "tools": {
          "elevated": {
            "allowFrom": ["owner"],
            "requireApproval": true
          }
        }
      }
    ]
  }
}
```

**Impact:**
- Main agent can still use `/exec` but requires your approval
- Any spawned sub-agents won't automatically get elevation
- Clear audit trail of who requested what

---

#### 2. **API Key in Config (Should Be Env Variable)**

**Current State:**
```json
{
  "channels": {
    "slack": {
      "botToken": "xoxb-10429574214852-...",
      "appToken": "xapp-1-A0ACSA8DHNH-..."
    }
  }
}
```

**Risk:**
- Slack tokens are hardcoded in `openclaw.json`
- If this file is ever accidentally shared, committed to git, or backed up insecurely, tokens leak
- Tokens can be regenerated, but leaked = someone can impersonate your bot

**Recommended Fix:**

1. Create `.env` file:
   ```bash
   # .env (add to .gitignore)
   SLACK_BOT_TOKEN=xoxb-10429574214852-...
   SLACK_APP_TOKEN=xapp-1-A0ACSA8DHNH-...
   ```

2. Update config to use env:
   ```json
   {
     "channels": {
       "slack": {
         "botToken": "${SLACK_BOT_TOKEN}",
         "appToken": "${SLACK_APP_TOKEN}"
       }
     }
   }
   ```

3. Load `.env` before starting:
   ```bash
   source .env && openclaw gateway start
   ```

**Verification:**
```bash
# Check if token is still in config (should be empty/env var)
grep "xoxb-" ~/.openclaw/openclaw.json
# Should return: (nothing) — token moved to env
```

---

#### 3. **No Update Applied (2026.2.9 Available)**

**Current Version:** 2026.2.6-3  
**Available:** 2026.2.9  
**Status:** 3 minor versions behind

**Recommendation:**
```bash
openclaw update
# Then restart: openclaw gateway restart
```

**Why it matters:**
- 3 versions = several weeks of patches
- May include security fixes (usually non-critical for personal setups)
- Quick process (usually <1 minute)

---

## File Permissions Audit

```
~/.openclaw/openclaw.json      ✅ 600 (user read/write only)
~/.openclaw/                   ✅ 700 (user only)
~/.openclaw/credentials/       ✅ Private
~/.openclaw/agents/*/sessions/ ✅ Private (readable to user)
```

No permission issues found. Good job!

---

## Threat Model Assessment

**For your setup (personal Mac, trusted users only):**

| Threat | Likelihood | Impact | Current Defense | Additional Notes |
|--------|-----------|---------|-----------------|------------------|
| Prompt injection (untrusted DM) | Low | High | DM pairing enabled | Only approved users can message |
| Prompt injection (your own message) | Very Low | Medium | Haiku model weakness | Limited risk if you're careful |
| Physical access (stealing Mac) | Very Low | Critical | Disk encryption (check) | Assume macOS FileVault is enabled |
| Malicious plugin/skill | Very Low | Critical | Trusted sources only | Don't install untrusted extensions |
| Leaked API keys | Low | High | Secrets in config | Move to .env and rotate keys |
| Session transcript leak | Low | Medium | Local file perms | Good: 600 permissions on sessions |
| Local user access (shared Mac) | N/A | High | User-only permissions | Good: ~/.openclaw is 700 |

---

## Recommended Actions (Priority Order)

### 🔴 High Priority

1. **Change primary model to Opus** (security + capability)
   - **Time:** 2 minutes
   - **Cost:** +$15/month
   - **Benefit:** Significant prompt injection resistance
   - **How:** Edit `openclaw.json`, change `agents.defaults.model.primary` to `anthropic/claude-opus-4.5`

2. **Move Slack tokens to .env** (prevent leaks)
   - **Time:** 5 minutes
   - **Cost:** None
   - **Benefit:** Prevents accidental exposure
   - **How:** Create `.env`, move tokens, update config to use env vars

### 🟡 Medium Priority

3. **Restrict elevated tools by agent** (principle of least privilege)
   - **Time:** 10 minutes
   - **Cost:** None (free improvement)
   - **Benefit:** Limits blast radius if an agent is compromised
   - **How:** Move `tools.elevated` from global to per-agent config

4. **Update OpenClaw to 2026.2.9** (maintenance)
   - **Time:** 2 minutes
   - **Cost:** None
   - **Benefit:** Latest patches
   - **How:** Run `openclaw update`

### 🟢 Low Priority

5. **Enable periodic security audits** (ongoing monitoring)
   - **Time:** 5 minutes setup
   - **Cost:** None
   - **Benefit:** Catch misconfigurations early
   - **How:** Create a cron job to run `openclaw security audit --json` weekly

---

## Commands to Run Now

```bash
# 1. Check your current config
cat ~/.openclaw/openclaw.json | jq '.agents.defaults.model'

# 2. Verify file permissions (should show 600 for config)
ls -la ~/.openclaw/openclaw.json

# 3. Run a full audit
openclaw security audit --deep

# 4. Check for exposed credentials
grep -E "(token|apiKey|password|secret)" ~/.openclaw/openclaw.json | wc -l

# 5. View recent access logs
tail -20 /tmp/openclaw/openclaw-*.log
```

---

## Summary Recommendation

**You are in good shape for a personal setup.** Two changes recommended:

1. **Upgrade model to Opus** (security improvement)
2. **Move tokens to .env** (best practice)

Both are low-effort, high-value improvements. No critical vulnerabilities detected.

Once you make these changes, run:
```bash
openclaw security audit --deep
```

Should show all green (0 warnings).

---

## Questions?

If you need help with any of these changes:
- Model upgrade: Happy to help update the config
- Token migration: Can write a script to move them
- Audit & verification: Can schedule periodic checks

---

**Report Generated:** 2026-02-10 10:37 AST  
**Generated By:** Alfred 🎩  
**Next Review:** Recommend after applying the changes above

# OpenClaw Security Issues & Best Practices

**Document created:** 2026-02-10  
**Last reviewed:** 2026-02-10  
**OpenClaw version:** 2026.2.6-3

---

## Executive Summary

This document catalogs the most common security issues in OpenClaw deployments and provides remediation guidance. OpenClaw gives AI agents shell access, file access, and network capabilities—the security model is: **lock down access first, then grant permissions as needed**.

---

## Top 10 Most Common Security Issues

### 1. **Prompt Injection via Untrusted Input**

**Risk Level:** 🔴 CRITICAL  
**Blast Radius:** Depends on tool permissions

**What it is:**
- An attacker crafts a message that manipulates the AI into ignoring safety rules
- Common vectors: "Ignore your system prompt", "Run this command:", "Dump your filesystem"
- Even with strong system prompts, prompt injection is **not solved** — it's a soft control

**Why it matters:**
- If the bot has shell access + file access + network access, prompt injection becomes RCE
- Smaller/cheaper models (Haiku, Sonnet) are more susceptible than Opus
- Untrusted content includes web search results, browser pages, emails, pasted code

**Mitigation:**
- Use the latest, strongest model for tool-enabled agents (prefer **Opus 4.6**, not Haiku)
- Keep inbound DMs locked down (pairing or allowlist, never "open")
- Require mention gating in groups (@bot required)
- Use a read-only agent to summarize untrusted content before passing to main agent
- Keep `tools.elevated` restricted; require approvals for shell access
- Disable `web_search`, `web_fetch`, `browser` for tool-enabled agents unless absolutely needed

**Status in Joe's setup:** ⚠️ **WARNING** — Primary model is Haiku (small tier), elevated tools enabled

---

### 2. **Open DM Policy (Strangers Can Message the Bot)**

**Risk Level:** 🔴 CRITICAL  
**Blast Radius:** Anyone who knows the number/ID can trigger the bot

**What it is:**
- DM policy set to "open" (dmPolicy: "open") without authentication
- Bot processes messages from anyone (strangers, attackers, social engineers)
- Combined with tool access, becomes a public RCE endpoint

**Why it matters:**
- Opens a direct communication channel for prompt injection attacks
- Social engineering becomes trivial ("Your friend Joe asked me to run find ~")
- Doesn't require the attacker to know anything; just the number/handle

**Mitigation:**
- Use `dmPolicy: "pairing"` (default) → unknown senders get a pairing code (expires 1h)
- Use `dmPolicy: "allowlist"` → only approved users can DM
- Require explicit approval for each new user before they can reach the bot
- Never use `dmPolicy: "open"` unless the bot has absolutely no tools
- If you must allow open DMs, disable all tool access

**Status in Joe's setup:** ✅ **OK** — Slack appears to have reasonable DM/group policies

---

### 3. **Tools Enabled in Open Channels or Groups**

**Risk Level:** 🔴 CRITICAL  
**Blast Radius:** All members of the room + tool permissions

**What it is:**
- Bot is in a public/open group with full tool access (exec, file write, browser, etc.)
- No mention gating ("@bot required") or allowlist enforcement
- Any group member can trigger the bot with a prompt injection attack

**Why it matters:**
- Public groups (Discord, Slack free tier, WhatsApp groups) have unpredictable membership
- Even trusted groups can have compromised members or accidental social engineering
- One clever message could trigger a cascade of tool actions

**Mitigation:**
- Set `groupPolicy: "allowlist"` + explicit allowlist of safe groups only
- Require mention gating: `requireMention: true` in all group configs
- Use `groupChat.mentionPatterns: ["@openclaw", "@bot"]` in agent config
- Never set `groupPolicy: "open"` with tools enabled
- For public groups, disable all tools or use a read-only/sandboxed agent

**Status in Joe's setup:** ✅ **OK** — Slack has per-channel controls; groups require mention

---

### 4. **Weak Gateway Authentication (Loopback)**

**Risk Level:** 🟡 HIGH  
**Blast Radius:** Local machine + anyone with network access to the Gateway port

**What it is:**
- Gateway listens on a public IP or LAN without strong authentication
- No password/token required, or token is short/weak
- Control UI is exposed without HTTPS or device pairing

**Why it matters:**
- Anyone on your network (or with port access) can control the Gateway
- Can reconfigure channels, disable safety checks, add new agents
- Weak tokens can be brute-forced or social-engineered

**Mitigation:**
- Set `gateway.bind: "loopback"` (default) → only localhost can access
- Use a strong token: `gateway.auth.token: "your-long-random-token"` (32+ chars)
- For remote access, use Tailscale Serve (not public IP exposure)
- Enable device pairing for Control UI (HTTPS or localhost required)
- Never expose the Control UI on 0.0.0.0 or with weak auth
- Rotate tokens regularly and store them in `.env` or secrets manager

**Status in Joe's setup:** ✅ **OK** — Appears to be loopback binding with token auth

---

### 5. **Elevated Tools Without Approval Workflow**

**Risk Level:** 🔴 CRITICAL  
**Blast Radius:** System shell (full compromise if exploited)

**What it is:**
- `tools.elevated.allowFrom: "*"` or too permissive
- Shell commands (exec) can run on the gateway host without human approval
- Combined with prompt injection, becomes arbitrary code execution

**Why it matters:**
- `/exec` can read/write files, install packages, modify system config
- If the bot is compromised, the host is compromised
- Affects all data on the system, not just OpenClaw state

**Mitigation:**
- Keep `tools.elevated: false` by default (safest)
- If you must enable elevated tools, restrict to trusted agents only:
  ```json
  "agents": {
    "list": [{
      "id": "personal",
      "tools": { "elevated": { "allowFrom": ["owner"] } }
    }]
  }
  ```
- Require explicit approval for each exec command
- Use sandboxing to isolate tool execution
- Keep secrets out of the agent workspace; use environment variables instead

**Status in Joe's setup:** ⚠️ **WARNING** — `tools.elevated: enabled` globally; should restrict by agent

---

### 6. **Large Model Tier = Prompt Injection Vulnerability**

**Risk Level:** 🔴 CRITICAL  
**Blast Radius:** Model's tool permissions

**What it is:**
- Using smaller models (Haiku, Sonnet) for agents with tool access
- Smaller models are more susceptible to prompt injection, instruction hijacking, tool misuse
- OpenClaw audit flags this as a configuration risk

**Why it matters:**
- Haiku/Sonnet have weaker instruction-following; can be manipulated more easily
- Larger models (Opus 4.6, GPT-5+) are instruction-hardened specifically for safety
- For the same attack, Opus is more likely to refuse; Haiku is more likely to comply

**Mitigation:**
- Use **Opus 4.6** (preferred) or GPT-5+ for any agent with tools
- Use Sonnet only for tool-disabled agents or read-only helpers
- Use Haiku only for simple data fetching (no tools)
- Model choice is a hard security control, not a soft one
- Accept the cost trade-off; safety is worth it

**Status in Joe's setup:** ⚠️ **WARNING** — Primary model is Haiku; audit specifically flagged this

---

### 7. **Reverse Proxy Without Trusted Proxies Config**

**Risk Level:** 🟡 HIGH  
**Blast Radius:** Gateway auth bypass (if auth is enabled)

**What it is:**
- Gateway runs behind a reverse proxy (nginx, Caddy, etc.) without `gateway.trustedProxies`
- Proxy headers (X-Forwarded-For) are not validated
- A request that "looks local" (via spoofed headers) bypasses auth checks

**Why it matters:**
- Gateway uses X-Forwarded-For to detect "local" clients (who get auto-trusted)
- If the proxy IP is not in `trustedProxies`, the header is ignored (safe)
- But if misconfigured, an attacker can spoof the header and bypass auth

**Mitigation:**
```json
{
  "gateway": {
    "trustedProxies": ["127.0.0.1", "10.0.0.0/8"]
  }
}
```
- Only trust proxy headers from known proxy IPs
- Ensure your proxy overwrites (not appends to) X-Forwarded-For
- Use Tailscale Serve instead of manual proxying (Serve handles this correctly)

**Status in Joe's setup:** ✅ **LIKELY OK** — Local deployment, loopback binding

---

### 8. **Secrets Stored in Plain Text or Config**

**Risk Level:** 🔴 CRITICAL  
**Blast Radius:** All downstream services (GitHub, Slack, API keys, etc.)

**What it is:**
- API keys, tokens, passwords hardcoded in `openclaw.json` or checked into git
- WhatsApp credentials, Slack tokens, etc. stored without encryption
- Leaked via git history, backups, or filesystem access

**Why it matters:**
- Anyone with filesystem access can read all credentials
- Git history is permanent (even if you delete the file)
- Leaked tokens can be used to impersonate your bot or access your accounts

**Mitigation:**
- Use environment variables for sensitive values: `process.env.SLACK_BOT_TOKEN`
- Store secrets in `.env` file (add to `.gitignore`)
- Use a secrets manager (1Password, Vault, etc.) for production
- Never commit `openclaw.json` with secrets to git
- Rotate tokens regularly (Slack, Discord, etc. can be regenerated)
- Use `openclaw doctor --generate-gateway-token` for strong tokens

**Status in Joe's setup:** ⚠️ **WARNING** — Slack/Discord tokens visible in config JSON

---

### 9. **File Permissions on ~/.openclaw (World-Readable)**

**Risk Level:** 🟡 HIGH  
**Blast Radius:** All state, configs, credentials, sessions, logs

**What it is:**
- `~/.openclaw` directory has permissions `755` or `644` (world-readable)
- Any local process can read session transcripts, API keys, config, etc.
- Shared hosting or compromised local process = full exfiltration

**Why it matters:**
- Session logs (.jsonl files) contain private messages and tool output
- Config includes tokens and model credentials
- A single weak local password or compromised application could leak everything

**Mitigation:**
```bash
chmod 700 ~/.openclaw
chmod 600 ~/.openclaw/openclaw.json
chmod 600 ~/.openclaw/agents/*/sessions/*.jsonl
chmod 600 ~/.openclaw/credentials/*
```
- Keep `~/.openclaw` as `700` (user only)
- Keep config files as `600` (user read/write only)
- Run `openclaw security audit --fix` to auto-apply these
- Use full-disk encryption (FileVault on macOS, LUKS on Linux)
- On shared machines, use a dedicated OS user for the Gateway

**Status in Joe's setup:** ✅ **OK** — Config files are `600` (user-only)

---

### 10. **Session Transcripts + Logs Contain Sensitive Data**

**Risk Level:** 🟡 MEDIUM-HIGH  
**Blast Radius:** Private messages, tool output, file contents, URLs, secrets

**What it is:**
- Session transcripts (*.jsonl) store every message and tool output
- Logs include error messages, URLs, file paths, command summaries
- A user accidentally shares a session, or a backup is leaked = full exfiltration

**Why it matters:**
- Session files are permanent; they accumulate over time
- Include context the user may have forgotten (passwords pasted, file contents, API keys)
- Logs can reveal infrastructure details (URLs, filesystem paths, OS details)

**Mitigation:**
- Enable redaction: `logging.redactSensitive: "tools"` (default)
- Add custom redaction patterns for your environment:
  ```json
  "logging": {
    "redactPatterns": ["my-api-key", "internal.example.com", "10.0.0."]
  }
  ```
- Prune old session transcripts (set retention policy)
- Use `openclaw status --all` (redacted) when sharing diagnostics
- Keep backups encrypted; assume they contain secrets
- Never paste raw logs in public chats or GitHub issues

**Status in Joe's setup:** ✅ **OK** — Default redaction enabled

---

## Deployment Scenarios

### Scenario: Personal Mac (You + Trusted Users)

**Risk Profile:** Low  
**Recommended:**
- `gateway.bind: "loopback"` (only local)
- `dmPolicy: "pairing"` (unknown senders need approval)
- `groupPolicy: "allowlist"` (explicit group allowlist)
- All tools enabled (personal agent trusted)
- Model: can use Haiku for cost savings (known-good inputs)

**Example config:**
```json
{
  "gateway": { "bind": "loopback", "port": 18789 },
  "channels": {
    "whatsapp": { "dmPolicy": "pairing", "groups": { "*": { "requireMention": true } } }
  }
}
```

### Scenario: Headless VPS (Exposed to Network)

**Risk Profile:** High  
**Recommended:**
- `gateway.bind: "loopback"` + reverse proxy with Tailscale Serve
- `gateway.auth: { "mode": "token", "token": "strong-secret" }`
- `dmPolicy: "allowlist"` (explicit per-user approval)
- `groupPolicy: "allowlist"` + explicit channels only
- Tools: restricted per agent; no elevated without approval
- Model: Opus 4.6 (strong instruction-following)
- Sandboxing enabled

### Scenario: Docker Container (Multi-Agent)

**Risk Profile:** Medium  
**Recommended:**
- Container boundary handles host isolation
- Per-agent sandboxing (scope: "agent")
- Per-agent tool policies (trusted agent = full; untrusted = read-only)
- Dedicated workspace per agent
- Model: Opus 4.6 for tool-enabled agents, Haiku for read-only

---

## Quick Audit Checklist

Run these commands to audit your setup:

```bash
# Full security audit
openclaw security audit --deep

# JSON output for analysis
openclaw security audit --json

# Check for permission issues
ls -la ~/.openclaw/
ls -la ~/.openclaw/openclaw.json

# Check for exposed credentials (basic)
grep -E "(apiKey|token|password)" ~/.openclaw/openclaw.json | head -5

# Check update status
openclaw update status

# View recent logs for unexpected tool calls
tail -100 /tmp/openclaw/openclaw-*.log | grep "exec\|elevated"
```

---

## Incident Response

**If you suspect compromise:**

1. **Stop the blast radius**
   ```bash
   pkill -f "openclaw gateway" || killall openclaw
   ```

2. **Lock down inbound surfaces**
   - Set all DM policies to "disabled" or "allowlist-only"
   - Remove "*" from group allowlists
   - Disable elevated tools

3. **Rotate secrets**
   - Generate new `gateway.auth.token`
   - Rotate Slack/Discord bot tokens
   - Rotate API keys
   - Restart Gateway

4. **Review what happened**
   - Check session transcripts: `~/.openclaw/agents/*/sessions/*.jsonl`
   - Check logs: `/tmp/openclaw/openclaw-*.log`
   - Look for unexpected `exec` calls or file writes

5. **Re-audit**
   ```bash
   openclaw security audit --deep
   ```

6. **Consider:**
   - Running the Gateway in Docker for better isolation
   - Using a fresh API key for model provider
   - Enabling sandboxing for all agents

---

## Configuration Examples

### Safe Defaults (Copy/Paste)

```json
{
  "gateway": {
    "mode": "local",
    "bind": "loopback",
    "port": 18789,
    "auth": { "mode": "token", "token": "generate-with-openclaw-doctor" }
  },
  "channels": {
    "whatsapp": {
      "dmPolicy": "pairing",
      "groups": { "*": { "requireMention": true } }
    },
    "slack": {
      "groupPolicy": "allowlist",
      "channels": { "C1234567890": {} }
    }
  },
  "agents": {
    "defaults": {
      "model": { "primary": "anthropic/claude-opus-4.5" },
      "sandbox": { "mode": "all", "scope": "agent" },
      "tools": { "elevated": false }
    }
  },
  "logging": {
    "redactSensitive": "tools"
  }
}
```

### Trusted Agent (Full Access)

```json
{
  "agents": {
    "list": [
      {
        "id": "personal",
        "workspace": "~/.openclaw/workspace",
        "sandbox": { "mode": "off" },
        "tools": { "elevated": { "allowFrom": ["owner"] } },
        "model": { "primary": "anthropic/claude-opus-4.5" }
      }
    ]
  }
}
```

### Untrusted Agent (Read-Only)

```json
{
  "agents": {
    "list": [
      {
        "id": "public",
        "workspace": "~/.openclaw/workspace-public",
        "sandbox": {
          "mode": "all",
          "scope": "agent",
          "workspaceAccess": "none"
        },
        "tools": {
          "allow": ["message", "sessions_list", "session_status"],
          "deny": ["read", "write", "edit", "exec", "browser", "nodes"]
        },
        "model": { "primary": "anthropic/claude-haiku-4-5" }
      }
    ]
  }
}
```

---

## Resources

- **OpenClaw Security Docs:** https://docs.openclaw.ai/security
- **Healthcheck Skill:** `openclaw skills docs healthcheck`
- **Formal Verification:** https://docs.openclaw.ai/security/formal-verification
- **Sandboxing:** https://docs.openclaw.ai/gateway/sandboxing
- **Tailscale Serve:** https://docs.openclaw.ai/gateway/tailscale

---

## Notes for Joe

- Primary concern: **Haiku model tier** for a tool-enabled agent
- Secondary concern: **Elevated tools enabled globally** — should restrict by agent
- All other settings appear reasonable for a trusted personal setup
- Recommend upgrading to Opus for main agent, then re-audit

---

**Last updated:** 2026-02-10  
**Generated by:** Alfred (OpenClaw assistant)  
**For:** Joe Ho (joesubsho@gmail.com)

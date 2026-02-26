# Session: 2026-02-26 18:29:42 UTC

- **Session Key**: agent:main:main
- **Session ID**: f9c63c94-5d50-48f7-9e9d-6ae0c3753478
- **Source**: webchat

## Conversation Summary

user: A new session was started via /new or /reset. Execute your Session Startup sequence now - read the required files before responding to the user. Then greet the user in your configured persona, if one is provided. Be yourself - use your defined voice, mannerisms, and mood. Keep it to 1-3 sentences and ask what they want to do. If the runtime model differs from default_model in the system prompt, mention the default model. Do not mention internal steps, files, tools, or reasoning.
assistant: 🎩 Back online, Joe. Idle status, a couple of queued Kanban cards (Bilingual HR/Payroll Notice Builder and Interprovincial Sales Tax Rules Engine), and the Signal App fast-track still needs that real-time data pipeline picked back up. What do you want to tackle?
user: [Thu 2026-02-26 14:19 AST] Since the last update of Openclaw what are the recent changes
assistant: Here's a rundown of the most notable changes in **OpenClaw 2026.2.25** (your current version):

---

### 🔒 Security (Heavy Release)
This was a major security patch — multiple CVEs fixed across nearly every channel:
- **Gateway WebSocket** — origin checks enforced, password-auth throttling on localhost, blocks auto-pairing for non-Control-UI browser clients
- **File system** — hardlink and symlink escape exploits blocked for workspace file access
- **Exec approvals** — argv identity binding fixed; trailing-space path swap exploit patched
- **Reaction/pin events** — Signal, Discord, Slack, Telegram all now properly gate reactions through sender authorization (previously bypassable)
- **Telegram groups** — fail-closed group allowlist (DM pairing store no longer bleeds into group auth)
- **Browser** — temp path symlink escapes blocked for trace/download outputs
- **SSRF** — IPv6 multicast (`ff00::/8`) now blocked

---

### ⚙️ Config & Behavior Changes
- **Heartbeat direct/DM policy** — new `agents.defaults.heartbeat.directPolicy: "allow" | "block"` config. Default is back to `allow` in 2026.2.25 (was `block` in 2026.2.24 — **breaking change** if you relied on that)
- **Agents remind to call `config.schema`** before editing config fields

---

### 🐛 Notable Fixes
- **Subagent completion delivery** — fixed cold/stale plugin-registry state causing missed announces
- **Cron multi-account routing** — explicit `accountId` now honored; fallback to sending agent's bound account
- **Model fallback** — several chains fixed; `model_cooldown` now classified as `rate_limit` so failover continues
- **Android** — native onboarding + 5-tab shell, streaming improvements
- **Discord** — typing indicators no longer get stuck; block-streaming replies restored
- **iMessage** — reasoning payload suppression on outbound delivery fixed

---

### 📱 Android
New 4-step onboarding flow + 5-tab navigation shell (Connect, Chat, Voice, Screen, Settings) — looks like a significant Android UX overhaul.

---

**TL;DR:** Mostly a big security hardening release with a pile of channel-specific bug fixes. No major new features beyond Android UX. The heartbeat DM policy flip is worth watching if your cron jobs rely on it.
user: [Thu 2026-02-26 14:21 AST] can you make sure that in discord you only ever answer messages from me what do you need to know about my account to do this
assistant: To lock Discord responses to you only, OpenClaw uses an `allowFrom` allowlist with your Discord **User ID** (not your username — the numeric ID like `123456789012345678`).

**To find your Discord User ID:**
1. Enable Developer Mode in Discord: Settings → Advanced → Developer Mode → ON
2. Right-click your own name anywhere → **Copy User ID**

That's all I need. Once you give me that ID, I'll walk you through the exact config change — but since I can't safely touch `openclaw.json` directly, I'll show you the one-liner to run yourself (or use `openclaw configure`) to set it. Takes about 30 seconds.

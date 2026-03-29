# Discord Integration Setup Guide
**Created:** 2026-02-18  
**Status:** Phase 1 Complete — Ready for Phase 2 (Bot Creation + Config)

---

## 🔍 Phase 1 Research Findings

### ✅ OpenClaw Has Native Discord Support
- Built-in Discord channel plugin at `/usr/local/lib/node_modules/openclaw/extensions/discord/`
- Full Discord.js-based implementation using `@buape/carbon` library
- Same architecture as Slack integration (already working)
- Plugin is **already installed** — no additional packages needed

### Integration Method
OpenClaw uses **Discord Bot Gateway** (WebSocket) — same as Slack's Socket Mode. The bot connects to Discord's real-time gateway and receives messages/events. No polling, no webhooks needed.

---

## 📋 What's Required

### Bot Permissions Needed
Based on code analysis of `DiscordPrivilegedIntentsSummary`:
- **Message Content Intent** (privileged) — Required to read message text
- **Server Members Intent** (optional) — For member info features  
- **Presence Intent** (optional) — For presence/status features

### Discord Bot Permissions (OAuth2 Scopes)
When inviting the bot to a server:
- `bot` scope (required)
- `applications.commands` scope (for slash commands)

Bot Permission Integer: `277025704960` (recommended baseline):
- `Send Messages`
- `Read Message History`
- `Read Messages/View Channels`
- `Create Public Threads`
- `Send Messages in Threads`
- `Manage Messages` (optional — for delete/pin)
- `Embed Links`
- `Attach Files`
- `Add Reactions`
- `Use External Emojis`

---

## 🚀 Phase 2: Step-by-Step Setup

### Step 1: Create Discord Bot Application

1. Go to: https://discord.com/developers/applications
2. Click **"New Application"**
3. Name it: `Alfred` (or your preferred name)
4. Click **"Bot"** in left sidebar
5. Click **"Add Bot"** → Confirm

### Step 2: Configure Bot Settings

In the Bot tab:
- **Public Bot:** OFF (keep private)
- **Require OAuth2 Code Grant:** OFF
- **Presence Intent:** ON (if you want presence)
- **Server Members Intent:** ON (recommended)
- **Message Content Intent:** ON ← **CRITICAL — required for bot to read messages**

Click **"Save Changes"**

### Step 3: Get Bot Token

In Bot tab:
1. Click **"Reset Token"** → Confirm
2. Copy the token (shown once — save it securely)
3. Store as: `DISCORD_BOT_TOKEN` in environment or directly in config

### Step 4: Create/Find Your Test Server

Option A — Use existing server:
- Go to the server → Right-click server name → **Copy Server ID**
- Enable Developer Mode: User Settings → Advanced → Developer Mode

Option B — Create new server:
- Click "+" in Discord sidebar → Create My Own → For me and friends

### Step 5: Get Channel IDs

In your server:
- Right-click any channel → **Copy Channel ID**
- Keep a list of channels you want Alfred to monitor

### Step 6: Invite Bot to Server

Build OAuth2 URL:
```
https://discord.com/oauth2/authorize?client_id=YOUR_APP_ID&scope=bot+applications.commands&permissions=277025704960
```

Replace `YOUR_APP_ID` with your Application ID (found in General Information tab).
Open URL in browser → Select your server → Authorize.

---

## ⚙️ Phase 3: OpenClaw Config

### Add Discord Channel

Run this command (replace TOKEN with your actual token):
```bash
openclaw channels add --channel discord --token "BOT_TOKEN_HERE"
```

Or manually add to `/Users/hopenclaw/.openclaw/openclaw.json`:

```json
{
  "channels": {
    "discord": {
      "enabled": true,
      "token": "YOUR_BOT_TOKEN_HERE",
      "groupPolicy": "allowlist",
      "historyLimit": 10,
      "guilds": {
        "YOUR_GUILD_ID": {
          "channels": {
            "YOUR_CHANNEL_ID": {
              "allow": true
            }
          }
        }
      },
      "dm": {
        "policy": "pairing"
      },
      "actions": {
        "messages": true,
        "threads": true,
        "reactions": true,
        "pins": true,
        "memberInfo": true,
        "roleInfo": true,
        "polls": true,
        "moderation": false,
        "channels": false,
        "presence": false,
        "roles": false
      }
    }
  }
}
```

### Enable Discord Plugin

In `plugins.entries` section of openclaw.json:
```json
{
  "plugins": {
    "entries": {
      "discord": {
        "enabled": true
      }
    }
  }
}
```

### Restart Gateway
```bash
openclaw gateway restart
```

---

## ✅ Phase 4: Verification

Test the connection:
```bash
openclaw channels list
# Should show: Discord default: configured, bot=config, enabled
```

Check gateway logs:
```bash
openclaw channels logs discord
```

Send a test message from the bot:
```
(via OpenClaw message tool)
action: send
channel: discord  
to: "channel:YOUR_CHANNEL_ID"
message: "Hello from Alfred! Discord integration is live 🎉"
```

---

## 🔒 Security Configuration

Recommended settings:
- `groupPolicy: "allowlist"` — Only respond in explicitly allowed channels
- `dm.policy: "pairing"` — Users must pair before DMing the bot
- Keep `moderation`, `channels`, `presence`, `roles` actions **disabled** by default
- Store bot token in environment variable: `DISCORD_BOT_TOKEN` (not hardcoded)

---

## 📊 Comparison: Discord vs Slack (Already Working)

| Feature | Slack | Discord |
|---------|-------|---------|
| Token type | Bot token + App token | Bot token only |
| Connection mode | Socket Mode | Gateway (WebSocket) |
| Config key | `channels.slack` | `channels.discord` |
| History | `historyLimit` | `historyLimit` |
| Channel gating | `channels.CHANNEL_ID` | `guilds.GUILD_ID.channels.CHANNEL_ID` |
| DM policy | N/A | `dm.policy` |

---

## ⚡ Current Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Research | ✅ Complete | OpenClaw has native Discord support |
| Phase 2: Bot Creation | 🔲 Needs user | Requires Discord Developer Portal access |
| Phase 3: Config | 🔲 Ready to implement | Config template ready above |
| Phase 4: Testing | 🔲 Pending | After config |
| Phase 5: Production | 🔲 Pending | After testing |

---

## 🚧 Blockers

**One human step required:**
- Bot creation in Discord Developer Portal requires browser login
- Bot token generation must be done by the user (security)
- Server/Guild ID and Channel IDs must be provided by user

**Once you provide the bot token + guild/channel IDs, I can complete Phases 3-5 fully autonomously.**

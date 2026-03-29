# Discord Integration — Phase 3: Configuration Complete ✅

**Date:** 2026-02-18  
**Status:** Ready for token entry & gateway restart  
**Next Step:** You must enter the Discord bot token

---

## What's Been Configured

✅ **OpenClaw Configuration (`openclaw.json`)**
- Discord plugin enabled
- Bot connection settings configured:
  - Client ID: `1473608734772301824`
  - Guild (Server) ID: `1473610337529102349`
  - Channel allowlist:
    - `1473610338543996982` (general)
    - `1473611295235510426` (updates)

✅ **Environment Variables (`.env`)**
- Placeholder created for `DISCORD_BOT_TOKEN`
- Server & channel IDs stored for reference

---

## Your Next Step: Enter Bot Token

### Location
File: `/Users/hopenclaw/.openclaw/workspace/.env`

Find this line:
```
DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE
```

Replace `YOUR_DISCORD_BOT_TOKEN_HERE` with your actual token from Discord Developer Portal.

**Example format:**
```
DISCORD_BOT_TOKEN=MzA1NDA5Mjk1OTY1NTc1NjQ4.C-hvzA.Ovy4MCQywSkoZRrJmB41-BgM
```

### How to Get Your Token (if you haven't already)
1. Go to: https://discord.com/developers/applications
2. Select your "Alfred" application
3. Go to **Bot** tab
4. Click **Reset Token** → Confirm
5. Copy the token (shown once only)
6. Paste into `.env` file

### Security Note
- **Never commit `.env` to git** — it's in `.gitignore` for this reason
- The token is sensitive — treat it like a password
- If ever leaked, regenerate it in Developer Portal

---

## Ready to Activate?

Once you've entered the token in `.env`, I can:

1. **Restart the gateway** with Discord enabled
2. **Send a test message** to verify the connection works
3. **Configure channel policies** (who can use Discord, rate limits, etc.)
4. **Set up automation** (forward notifications to Discord, etc.)

Just let me know when the token is in place!

---

## Config Reference

**Config file:** `/Users/hopenclaw/.openclaw/openclaw.json`
- Lines 95-113: Discord channel configuration
- Lines 168-170: Discord plugin enabled

**Environment file:** `/Users/hopenclaw/.openclaw/workspace/.env`
- Line 8: `DISCORD_BOT_TOKEN=YOUR_DISCORD_BOT_TOKEN_HERE` ← **EDIT THIS**
- Lines 10-12: Server IDs (for reference)

---

## Troubleshooting

**"Discord bot not responding?"**
- Check token is correctly pasted in `.env`
- Verify bot was invited to the server (check https://discord.com/developers/applications > OAuth2 > invite URL)
- Confirm Message Content Intent is enabled (required to read messages)

**"Permission errors in Discord?"**
- Check bot has permission to read/send messages in allowed channels
- Verify bot role has proper permissions in server settings

**"Environment variable not loading?"**
- Restart gateway after editing `.env`
- Check `.env` file is in workspace root: `/Users/hopenclaw/.openclaw/workspace/.env`

---

## Phase 4: Implementation (After Token Entry)

Once token is configured, I'll:
1. Test bot connection
2. Verify message delivery
3. Set up channel forwarding
4. Document integration patterns

**Cost:** $0 (no tokens used for Discord integration — it's event-driven)

---

**Status:** ⏳ Waiting for bot token  
**Next move:** Edit `.env`, save, then I'll restart gateway  
**Time to complete:** 2-3 minutes (token entry + restart)

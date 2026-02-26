# DISCORD-WEBHOOKS.md — Discord Webhook Config

These are the configured Discord webhooks Alfred uses for automated posts.
**Never commit this file to a public repo.**

---

## Code Review Reports
**Webhook:** `https://discord.com/api/webhooks/1476441852121976934/a8Ef9_Cr0lR1b_-LCAB59sTEHlMAAtxWU9wXltKfmcjb0JJtmwYXMPA2-sskYKL3CJX8`
**Trigger:** After any automated or manual code review completes
**Format:** Embedded report with P0/P1/P2 findings, file references, and severity colors

## Code Fix Notifications
**Webhook:** `https://discord.com/api/webhooks/1476442909187379290/q4pmpLZ17g__M1RkCwgn-MUtLDcz1ZWw6Pc8nd5aeYY1vhtFKwlEIouzyfRT07yzJd6_`
**Trigger:** After any code fix is applied and committed
**Format:** Summary of what was changed, files touched, Kanban card reference

---

## Usage (Alfred)

```bash
# Post code review
curl -s -X POST "$CODE_REVIEW_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d '{"username":"Alfred Code Review","embeds":[...]}'

# Post code fix
curl -s -X POST "$CODE_FIX_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d '{"username":"Alfred Code Fixes","embeds":[...]}'
```

## Rules
- Code review reports → Code Review webhook
- Applied fixes/commits → Code Fixes webhook
- No approval needed to post to either channel
- Always use embed format (not plain content) for reports

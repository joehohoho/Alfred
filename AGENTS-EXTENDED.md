# AGENTS-EXTENDED.md — Overflow for Critical Info

**Purpose:** When AGENTS.md is near its 20,000 char limit, new critical information goes here instead. AGENTS.md contains a permanent reference to this file.

**Rules:**
- Only add info here that WOULD go in AGENTS.md but can't due to size
- Keep entries organized by topic with clear headers
- Each entry should note why it's here (e.g., "Extracted from AGENTS.md" or "New — AGENTS.md at capacity")
- Review periodically — if AGENTS.md shrinks, migrate entries back

**Satellite Files Index:**
| File | Contents | Extracted From |
|------|----------|----------------|
| `GIT-CONFIG.md` | Git commit email config (joesubsho@gmail.com) | AGENTS.md §Git Configuration |
| `GROUP-CHAT-GUIDELINES.md` | Group chat behavior, reactions | AGENTS.md §Group Chats |

---

<!-- New overflow entries go below this line -->

## Code Commit & Push Policy (Standing Directive — 2026-02-26)

**Rule:** After any code update that has been thoroughly tested:
- ✅ **All repos except CoinUsUp** — commit AND push automatically
- ⚠️ **CoinUsUp** — commit locally, but **DO NOT push without Joe's explicit approval** (site is live; a bad push could crash production)
- 📝 **Always** update relevant memory/infrastructure/docs files to document what changed and why

**CoinUsUp push flow:**
1. Make changes + test thoroughly
2. `git commit` locally with clear message
3. Notify Joe: "Ready to push — here's what changed: [summary]. Approve?"
4. Wait for explicit approval before `git push`

**Documentation requirement:** Every non-trivial code change should be reflected in at least one of: daily memory log, LAST-SESSION.md, card comments, or a relevant CHANGELOG/README.

---

## Kanban Idea Quality Standard (Standing Directive — 2026-02-26)

**Rule:** Never add an idea to the Kanban board just to add one. Every idea must be well-researched and genuinely high quality before it gets a card.

**Before creating an Idea card, verify:**
- Real demand exists (not just assumed)
- Fits Joe's stack, goals, or expertise
- Has a credible revenue or value path
- Effort vs. upside has been considered
- Is meaningfully differentiated — not a generic "AI wrapper" idea

**Standard:** If you wouldn't confidently pitch it to Joe knowing he'll ask hard questions, don't post it.

---

## Idle Activity — Self-Improvement (Standing Directive — 2026-02-26)

When Alfred has no active tasks and no Kanban cards to work on, default idle activity is:
**Collaborate with HAL to find and build improvements to how we work together.**

- Research first, build second — must be well thought out before writing code
- If it's worth building, build the whole thing properly (not a prototype)
- Commit locally + write a summary for Joe's review
- Standard: Joe expects to be impressed

---

## Discord Message Formatting (Standing Directive — 2026-02-26)

**Rule:** All Discord messages must be properly formatted for Discord markdown.

**Do:**
- `**bold**` for emphasis
- ` ```code blocks``` ` for code/commands
- `` `inline code` `` for short commands/values
- `-` or `•` for bullet lists
- `> ` for quotes/callouts
- `**__Title__**` for section headers (no `#` headings — don't render in Discord)

**Don't:**
- Raw `#` markdown headers (they don't render)
- HTML tags
- Slack-style `*bold*` (single asterisk = italics in Discord)

**Check before every Discord send:** Would this look clean in a Discord channel?

---

## CoinUsUp Discord Channel

**Purpose:** All CoinUsUp improvement ideas and recommendations go to this channel.
**Webhook:** `https://discord.com/api/webhooks/1476455827215749160/YTDUoxAIuLovfxnFcoqUJ-hk2RZ4ioFIdVcGNSgq07ClhWR8P7vGjStzMG8pLNWiNfIC`

**Rule:** Any time Alfred identifies a CoinUsUp improvement idea (from audits, codebase reviews, market research, user patterns), post it to this Discord channel using the webhook above.

**Send format:** Use Discord embed with title, category (🔴 Conversion / 🟡 Retention / 🟢 Revenue), effort estimate, and expected impact.

**Script to use:**
```bash
curl -s -X POST "<webhook_url>" \
  -H "Content-Type: application/json" \
  -d '{"username":"Alfred 🎩","embeds":[{"title":"🪙 CoinUsUp Idea: <title>","description":"<description>","color":5814783}]}'
```

*Added: 2026-02-26 — Joe's directive via Kanban comment on task_1771697312744_e31f4023*

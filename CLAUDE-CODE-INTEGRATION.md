# Claude Code Terminal Integration (2026-02-13)

Your workspace now has intelligent Claude Code routing. I can detect when a task benefits from Claude Code's interactive terminal environment and recommend the right approach.

## Setup Status

✅ **Configured and ready to use**

- Shell functions added to `~/.zshrc` and `~/.bashrc`
- Router script: `/scripts/claude-code-router.sh`
- Decision logic documented in `AGENTS.md`

**To activate:** Restart your terminal or run:
```bash
source ~/.zshrc
```

## Quick Start

### One-Shot Analysis (Fast, Exit After)

```bash
# Code review
cc-review < src/auth.js

# Bug analysis from logs
tail -f app.log | cc-bugs

# Explain code
cc-explain < utils/parser.js

# Generate tests
cc-tests < src/validator.js

# Review a git diff
git diff main | cc-review
```

### Interactive Development (Conversational)

```bash
# Feature development
cc-dev "add user authentication with JWT"

# Architecture design
cc-arch "design a payment system"

# Debug together
cc-debug "login fails silently on mobile"

# Continue last session
cc-continue
```

## Decision Tree (How I Route Tasks)

When you ask for coding help, I use this logic:

```
Task involves INTERACTIVE/ITERATIVE work?
├─ YES → Suggest: cc-dev, cc-arch, cc-debug
├─ NO → Continue...

Task is ONE-SHOT analysis/review?
├─ YES → Suggest: cc-review, cc-explain, cc-bugs, cc-tests
├─ NO → Continue...

Task is background automation/scheduled?
└─ Handle in OpenClaw (LOCAL model, free)
```

## Examples of My Recommendations

**User:** "Build a React component for user login"
**Me:** "This is iterative work. Use: `cc-dev 'build a React login component with email/password validation'`"

**User:** "Review this function for bugs"
**Me:** "Use: `cc-review < myfunction.js` for quick feedback"

**User:** "Set up daily backups"
**Me:** "I'll handle this with a cron job (LOCAL model, no cost)"

## Token Cost Impact

- **Claude Code in terminal:** You control interactivity — pay for what you use
- **OpenClaw background:** All LOCAL (Ollama) now — $0 cost for scheduled tasks
- **Result:** More efficient coding, lower API costs, smarter routing

## Architecture

```
Your Request
    ↓
OpenClaw Main Session (Validation + Routing)
    ├─ Simple task → Handle directly
    ├─ Background task → Route to LOCAL cron
    ├─ Interactive code work → Suggest Claude Code terminal
    └─ One-shot analysis → Suggest Claude Code -p flag
```

## What Changed

**Before:** All tasks went through OpenClaw (expensive for interactive work)
**After:** 
- Interactive coding → Claude Code (better UX, you control)
- Background tasks → OpenClaw LOCAL (free)
- One-shot analysis → Claude Code -p (fast, exit after)

## Usage Tips

- **Pipe large content:** `cat bigfile.js | cc-review` (avoid pasting huge files)
- **Batch related tasks:** Use `cc-continue` to keep context, avoid starting fresh
- **Check your work:** Claude Code lets you test code before committing
- **Save context:** Sessions are saved; use `cc-continue` to resume

---

**Files Modified:**
- Created: `/scripts/claude-code-router.sh` (main routing logic)
- Created: `/scripts/setup-claude-code.sh` (shell profile setup)
- Updated: `TOOLS.md` (quick reference commands)
- Updated: `AGENTS.md` (decision logic for me to follow)

**Next Steps:** Open a terminal and try: `cc-dev "what task do you want help with?"` to start using Claude Code terminal mode.

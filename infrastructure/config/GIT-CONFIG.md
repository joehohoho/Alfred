# GIT-CONFIG.md — Git Commit Configuration

**🚨 NON-NEGOTIABLE: ALL commits to ANY repo must use joesubsho@gmail.com**

## Required Settings (STRICT)

All commits MUST use:
- **Name:** Joe Ho
- **Email:** joesubsho@gmail.com

## Pre-Commit Check (MANDATORY)

Before EVERY `git commit`:
```bash
git config user.email
# Must output: joesubsho@gmail.com
```

If wrong output, STOP and fix immediately:
```bash
git config --local user.name "Joe Ho"
git config --local user.email "joesubsho@gmail.com"
git config --global user.name "Joe Ho"
git config --global user.email "joesubsho@gmail.com"
```

## Why This Matters (CRITICAL FOR VERCEL)

- **Vercel deployments require** commits authored by joesubsho@gmail.com
- Wrong email = Vercel deployment failures
- This has happened 3+ times (Feb 9, Feb 11)
- **Check EVERY TIME. No exceptions.**

## Current Status (Fixed 2026-02-11)

✅ `/Users/hopenclaw/.openclaw/workspace` - Uses **joesubsho@gmail.com**

**Going forward:** Always use joesubsho@gmail.com for all repos. This is the only correct configuration.

## How to Remember

Before you type `git commit`:
1. Run `git config user.email`
2. See `joesubsho@gmail.com`? → Commit
3. See anything else? → STOP, fix config, then commit

If you ever see a different email output, you've hit the bug again. Fix immediately before committing.

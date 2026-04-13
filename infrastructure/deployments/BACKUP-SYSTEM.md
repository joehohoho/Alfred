# 3-Tier Backup System for Alfred

**Setup Date:** 2026-02-17  
**Status:** ✅ Active  
**Repository:** https://github.com/joehohoho/Alfred

---

## Overview

Your Alfred workspace is protected by a 3-tier backup system designed for disaster recovery:

| Tier | Name | Frequency | Scope | Recovery Time |
|------|------|-----------|-------|----------------|
| **1** | Git Auto-Commit | On demand | Code + memory + configs | Instant (local) |
| **2** | GitHub Push | Hourly | Git repo only | ~2 minutes (clone + pull) |
| **3** | Full System Backup | Weekly | `.openclaw/` + git bundle | ~30 minutes (restore from bundle) |

---

## Tier 1: Git Auto-Commit (Local)

**What it does:** Commits all changes to your local git repository.

**When:** After each major session or when you make significant changes.

**Run manually:**
```bash
/Users/hopenclaw/.openclaw/workspace/scripts/backup-system.sh tier1
```

**What's backed up:**
- All `.md` files (SOUL.md, AGENTS.md, MEMORY.md, etc.)
- Memory files (`memory/*.md`)
- Scripts and utilities
- Dashboard stats and configs
- Workspace state

**What's NOT backed up:**
- `.env` file (contains secrets, intentionally excluded)
- `.openclaw/` directory (handled by Tier 3)
- Node modules / build artifacts

**Recovery:** If your local disk fails before pushing to GitHub, this tier is lost. That's why Tier 2 (push to GitHub) is critical.

---

## Tier 2: GitHub Push (Remote)

**What it does:** Pushes commits from local git to GitHub every hour.

**Schedule:** Every hour at :00 (e.g., 8:00 AM, 9:00 AM, etc.)  
**Cron:** `0 * * * *` (America/Moncton timezone)

**What's backed up:**
- Everything in Tier 1
- Full git history
- All branches

**Automatic recovery:**
If your local machine fails, you can recover with:
```bash
git clone https://github.com/joehohoho/Alfred.git /new/path
cd /new/path
git log --oneline  # See all commits
```

**GitHub Protection:**
- Repository is public (read-only to others)
- Secret scanning enabled (prevents accidental token uploads)
- Branch protection: main branch requires push permission (you have it)
- 2FA recommended for your GitHub account

**Storage:** GitHub (unlimited, free tier supports your use case)

---

## Tier 3: Full System Backup (Local Archive)

**What it does:** Creates compressed backups of critical system files.

**Schedule:** Weekly on Sunday at 2:00 AM  
**Cron:** `0 2 ? * SUN` (America/Moncton timezone)  
**Location:** `/Users/hopenclaw/.alfred-backups/`

**What's backed up:**
1. **Git bundle** (`workspace-TIMESTAMP.bundle`)
   - Complete git history in portable format
   - Can be restored even if GitHub is unavailable
   
2. **OpenClaw config** (`openclaw-config-TIMESTAMP.tar.gz`)
   - `/Users/hopenclaw/.openclaw/openclaw.json`
   - `/Users/hopenclaw/.openclaw/logs/`
   - `/Users/hopenclaw/.openclaw/memory/`
   
3. **Ollama metadata** (`ollama-metadata-TIMESTAMP.tar.gz`)
   - Model configuration and metadata
   - NOT the models themselves (too large)

**Retention:** Automatically keeps last 30 days, deletes older backups.

**Recovery:**
```bash
# Restore git history from bundle
cd /path/to/new/workspace
git clone /Users/hopenclaw/.alfred-backups/workspace-*.bundle .
git fetch origin main:main

# Restore .openclaw config
tar -xzf /Users/hopenclaw/.alfred-backups/openclaw-config-*.tar.gz -C /Users/hopenclaw
```

**Storage:** Local disk (at `/Users/hopenclaw/.alfred-backups/`)  
**Cost:** Free (just disk space)

---

## Manual Backup Commands

Run these anytime to trigger backups manually:

```bash
# Commit uncommitted changes to git
/Users/hopenclaw/.openclaw/workspace/scripts/backup-system.sh tier1

# Push to GitHub (if hourly schedule missed)
/Users/hopenclaw/.openclaw/workspace/scripts/backup-system.sh tier2

# Create full system backup right now
/Users/hopenclaw/.openclaw/workspace/scripts/backup-system.sh tier3

# Run all three tiers
/Users/hopenclaw/.openclaw/workspace/scripts/backup-system.sh full

# Check backup status
/Users/hopenclaw/.openclaw/workspace/scripts/backup-system.sh status
```

---

## Disaster Scenarios & Recovery

### Scenario 1: Lost Local Changes

**Problem:** You accidentally deleted a file or made bad changes.

**Recovery (option A - Undo last commit):**
```bash
cd /Users/hopenclaw/.openclaw/workspace
git log --oneline -5  # Find the commit before the bad change
git reset --hard <commit-hash>
```

**Recovery (option B - Restore from GitHub):**
```bash
cd /Users/hopenclaw/.openclaw/workspace
git fetch origin main
git reset --hard origin/main
```

**Recovery time:** <1 minute

---

### Scenario 2: Local Disk Corrupted (Partial)

**Problem:** Some files are corrupted but disk is still readable.

**Recovery:**
```bash
# Clone fresh copy from GitHub
git clone https://github.com/joehohoho/Alfred.git /tmp/alfred-recover
cp -r /tmp/alfred-recover/* /Users/hopenclaw/.openclaw/workspace/
cd /Users/hopenclaw/.openclaw/workspace
git status  # Verify everything is clean
```

**Recovery time:** 2-5 minutes (depends on internet speed)

---

### Scenario 3: Mac Completely Fails

**Problem:** Your Mac is totaled, you have a new machine.

**Recovery (assuming you have GitHub access):**

**Step 1:** Clone from GitHub
```bash
git clone https://github.com/joehohoho/Alfred.git ~/.openclaw/workspace
cd ~/.openclaw/workspace
git log --oneline  # All commits are there
```

**Step 2:** Restore .openclaw config
If you have a Time Machine backup on external drive:
```bash
# Copy from Time Machine / other backup
cp -r /Volumes/TimeMachine/Users/hopenclaw/.openclaw ~/.openclaw/
```

Or, if you saved the Tier 3 backups to cloud storage:
```bash
# Download openclaw-config-*.tar.gz from backup location
tar -xzf openclaw-config-*.tar.gz -C /Users/hopenclaw
```

**Step 3:** Verify everything
```bash
openclaw status
cd ~/.openclaw/workspace
git log --oneline  # Confirm history
cat MEMORY.md  # Check memories are intact
```

**Recovery time:** 15-30 minutes (mostly waiting for downloads)

---

### Scenario 4: GitHub Account Compromised

**Problem:** GitHub account is hacked, repo is deleted.

**Recovery:** Check Tier 3 backups
```bash
# The git bundle is safe on your local disk
cd /tmp/recover
git clone /Users/hopenclaw/.alfred-backups/workspace-*.bundle .
git log --oneline  # All history is there
```

Then create a new GitHub repo and push:
```bash
git remote set-url origin https://github.com/YOUR-ACCOUNT/Alfred-New.git
git push -u origin main
```

**Recovery time:** 10-20 minutes

---

## Monitoring & Health Checks

### Check Backup Status

```bash
/Users/hopenclaw/.openclaw/workspace/scripts/backup-system.sh status
```

Output:
```
[2026-02-17 14:25:30] === Backup Status Report ===
[2026-02-17 14:25:30] Git: 0 commits ahead of GitHub
[2026-02-17 14:25:30] Backups: 3 files, 245M total
[2026-02-17 14:25:30] === End Report ===
```

### View Backup Location

```bash
ls -lh /Users/hopenclaw/.alfred-backups/
```

Expected structure:
```
workspace-2026-02-17-020000.bundle     (150MB git history)
openclaw-config-2026-02-17-020000.tar.gz  (2MB config + logs)
ollama-metadata-2026-02-17-020000.tar.gz  (5MB model metadata)
```

### Recent Git Commits

```bash
cd /Users/hopenclaw/.openclaw/workspace
git log --oneline -20
```

### GitHub Remote Status

```bash
cd /Users/hopenclaw/.openclaw/workspace
git remote -v
git rev-list --count HEAD..origin/main  # Commits ahead/behind
```

---

## Automation Status

### Cron Jobs

Your backup cron jobs:

| Job ID | Name | Schedule | Status |
|--------|------|----------|--------|
| `3461d025...` | Tier 2 GitHub Push | Hourly (:00) | ✅ Active |
| `05047a4c...` | Tier 3 Full Backup | Weekly (Sunday 2AM) | ✅ Active |

**Check cron jobs:**
```bash
# View all your backup jobs
cron list | grep -i backup

# Run a job immediately (for testing)
cron run --jobId 3461d025...
```

**View recent runs:**
```bash
cron runs --jobId 3461d025... --limit 10
```

---

## FAQ

**Q: What happens if I don't commit changes manually (Tier 1)?**  
A: Tier 2 (GitHub push) will push whatever is committed. Uncommitted changes stay local. Use `git status` to see what needs committing.

**Q: Can I restore individual files from Tier 3?**  
A: Yes! Extract the bundle or tar.gz:
```bash
# Extract specific file from git bundle
git bundle unbundle /Users/hopenclaw/.alfred-backups/workspace-*.bundle
git show <commit>:path/to/file.md

# Or extract from tar.gz
tar -xzf openclaw-config-*.tar.gz -C /tmp/extract
```

**Q: How much disk space do I need?**  
A: 
- Workspace: ~50-100MB (text files only)
- Backups directory: ~500MB-1GB (30 days of backups)
- Total: ~2GB recommended for safety

**Q: What if GitHub is down?**  
A: You still have Tier 1 (local git) and Tier 3 (local bundles). Once GitHub is back up, Tier 2 will push automatically.

**Q: Can I upload Tier 3 backups to cloud storage?**  
A: Yes! Great idea for extra safety:
```bash
# Sync to Dropbox, iCloud Drive, OneDrive, S3, etc.
cp /Users/hopenclaw/.alfred-backups/*.bundle ~/Dropbox/Alfred-Backups/
```

**Q: What should I backup before major changes?**  
A: Run Tier 1 before any risky work:
```bash
git commit -m "Backup before major refactor"
```

---

## Security Notes

⚠️ **What's NOT encrypted:**
- Git repository (readable by anyone with GitHub access)
- Local backups (unencrypted on disk)
- `.openclaw/` config backup (contains config, not secrets)

✅ **Secrets stay safe:**
- `.env` file is NOT backed up (intentional)
- GitHub push protection catches accidental token commits
- `.gitignore` excludes all sensitive files

**To add encryption** (optional):
```bash
# Encrypt Tier 3 backups before uploading to cloud
gpg --symmetric /Users/hopenclaw/.alfred-backups/*.tar.gz
# Then delete unencrypted versions
rm /Users/hopenclaw/.alfred-backups/*.tar.gz
```

---

## Next Steps

1. **Test Tier 2 manually:**
   ```bash
   /Users/hopenclaw/.openclaw/workspace/scripts/backup-system.sh tier2
   ```

2. **Verify GitHub shows your commits:**
   ```
   https://github.com/joehohoho/Alfred/commits/main
   ```

3. **Check Tier 3 backups exist:**
   ```bash
   ls /Users/hopenclaw/.alfred-backups/
   ```

4. **Set up cloud sync (optional):**
   ```bash
   cp /Users/hopenclaw/.alfred-backups/* ~/Dropbox/Alfred-Backups/
   ```

5. **Enable GitHub 2FA:**
   https://github.com/settings/security

---

**Backup System Status:** ✅ Ready  
**Last Updated:** 2026-02-17  
**Next Hourly Push:** Check `cron runs` for latest  
**Next Weekly Backup:** Sunday, 2026-02-23 at 2:00 AM


#!/bin/bash
# 3-Tier Backup System for Alfred
# Tier 1: Git auto-commit (runs in main session)
# Tier 2: GitHub push (hourly cron job)
# Tier 3: Full system backup (weekly cron job)

set -e

WORKSPACE="/Users/hopenclaw/.openclaw/workspace"
BACKUP_DIR="/Users/hopenclaw/.alfred-backups"
GITHUB_REPO="https://github.com/joehohoho/Alfred.git"
TIMESTAMP=$(date +"%Y-%m-%d-%H%M%S")
LOG_FILE="/var/log/alfred-backup.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# ============================================================================
# TIER 1: Git Auto-Commit (Run in main session after each major change)
# ============================================================================
tier1_git_commit() {
    log "TIER 1: Git Auto-Commit"
    
    cd "$WORKSPACE"
    
    if git status --porcelain | grep -q .; then
        git add -A
        git commit -m "Auto-backup: $(date '+%Y-%m-%d %H:%M:%S')"
        log "✅ Changes committed to local git"
    else
        log "✅ No changes to commit"
    fi
}

# ============================================================================
# TIER 2: GitHub Push (Hourly)
# ============================================================================
tier2_github_push() {
    log "TIER 2: GitHub Push"
    
    cd "$WORKSPACE"
    
    # Check if origin is GitHub
    if ! git remote get-url origin | grep -q "github.com"; then
        log "⚠️  Remote not GitHub, skipping push"
        return
    fi
    
    # Try to push (with exponential backoff if rate-limited)
    for attempt in 1 2 3; do
        if git push origin main 2>/dev/null; then
            log "✅ Pushed to GitHub successfully"
            return
        else
            if [ $attempt -lt 3 ]; then
                sleep_time=$((30 * attempt))
                log "⚠️  Push attempt $attempt failed, retrying in ${sleep_time}s..."
                sleep $sleep_time
            fi
        fi
    done
    
    log "❌ Failed to push after 3 attempts"
    return 1
}

# ============================================================================
# TIER 3: Full System Backup (Weekly)
# ============================================================================
tier3_full_backup() {
    log "TIER 3: Full System Backup"
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup 1: Workspace git bundle (for disaster recovery)
    log "Creating git bundle..."
    cd "$WORKSPACE"
    git bundle create "$BACKUP_DIR/workspace-$TIMESTAMP.bundle" --all
    log "✅ Git bundle created"
    
    # Backup 2: .openclaw directory (config, credentials, etc.)
    log "Backing up .openclaw config..."
    tar -czf "$BACKUP_DIR/openclaw-config-$TIMESTAMP.tar.gz" \
        -C /Users/hopenclaw \
        .openclaw/openclaw.json \
        .openclaw/logs \
        .openclaw/memory \
        2>/dev/null || log "⚠️  Some .openclaw files unavailable"
    log "✅ Config backup created"
    
    # Backup 3: Local ollama models index (not the models themselves, too large)
    log "Backing up ollama models metadata..."
    if [ -d ~/.ollama/models ]; then
        find ~/.ollama/models -name "*.json" -o -name "*.txt" | \
            tar -czf "$BACKUP_DIR/ollama-metadata-$TIMESTAMP.tar.gz" \
            -T - 2>/dev/null || log "⚠️  Ollama metadata backup failed"
        log "✅ Ollama metadata backed up"
    fi
    
    # Cleanup: Keep only last 30 days of backups
    log "Cleaning up old backups..."
    find "$BACKUP_DIR" -type f -mtime +30 -delete
    log "✅ Old backups cleaned up"
    
    log "✅ Full system backup complete"
}

# ============================================================================
# Status Report
# ============================================================================
status_report() {
    log "=== Backup Status Report ==="
    
    # Git status
    cd "$WORKSPACE"
    COMMITS_AHEAD=$(git rev-list --count origin/main..main 2>/dev/null || echo "unknown")
    log "Git: $COMMITS_AHEAD commits ahead of GitHub"
    
    # Backup status
    BACKUP_COUNT=$(find "$BACKUP_DIR" -type f -mtime -7 | wc -l)
    BACKUP_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    log "Backups: $BACKUP_COUNT files, $BACKUP_SIZE total"
    
    log "=== End Report ==="
}

# ============================================================================
# Main
# ============================================================================
main() {
    MODE=${1:-"full"}
    
    case "$MODE" in
        tier1)
            tier1_git_commit
            ;;
        tier2)
            tier2_github_push
            ;;
        tier3)
            tier3_full_backup
            ;;
        status)
            status_report
            ;;
        full)
            tier1_git_commit
            tier2_github_push
            tier3_full_backup
            status_report
            ;;
        *)
            echo "Usage: $0 {tier1|tier2|tier3|status|full}"
            exit 1
            ;;
    esac
}

main "$@"

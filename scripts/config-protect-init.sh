#!/bin/bash
# config-protect-init.sh
# Initialize immutable protection for critical config files
# Prevents accidental edits; suggests routing changes through memory/notifications instead
#
# Critical files protected:
#   - ~/.openclaw/openclaw.json (NEVER edit — crashes gateway)
#   - ~/.openclaw/cron/jobs.json (NEVER edit — cron corruption)
#   - LaunchAgent plists (NEVER edit — service startup)
#
# Usage:
#   bash config-protect-init.sh          (set up protection + monitor)
#   bash config-protect-init.sh --status (check current protection)
#   bash config-protect-init.sh --unset  (remove protection — emergency only)

set -e

# ─────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────

OPENCLAW_JSON="${HOME}/.openclaw/openclaw.json"
CRON_JOBS="${HOME}/.openclaw/cron/jobs.json"
PROTECT_LIST=(
  "$OPENCLAW_JSON"
  "$CRON_JOBS"
  "$HOME/Library/LaunchAgents/com.alfred.*.plist"
  "$HOME/Library/LaunchAgents/ai.openclaw.*.plist"
  "$HOME/Library/LaunchAgents/com.openclaw.*.plist"
)

DENY_LOG="${HOME}/.openclaw/workspace/logs/config-edit-attempts.log"
mkdir -p "$(dirname "$DENY_LOG")"

# ─────────────────────────────────────────────────────────────────
# Helper functions
# ─────────────────────────────────────────────────────────────────

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$DENY_LOG"
}

status_protection() {
  echo "=== Config File Protection Status ==="
  echo ""
  
  for file_pattern in "${PROTECT_LIST[@]}"; do
    # Expand glob patterns
    for file in $file_pattern; do
      if [ -e "$file" ]; then
        local perms
        perms=$(stat -f "%OLp" "$file" 2>/dev/null || echo "N/A")
        
        echo "File: $file"
        echo "  Permissions: $perms"
        
        # Check if immutable flag is set (macOS: uchg)
        if [ -e "$file" ]; then
          if ls -lO "$file" 2>/dev/null | grep -q "uchg"; then
            echo "  Status: ✅ PROTECTED (immutable)"
          else
            echo "  Status: ⚠️  NOT PROTECTED (editable)"
          fi
        fi
        echo ""
      fi
    done
  done
}

enable_protection() {
  echo "=== Enabling Config File Protection ==="
  
  for file_pattern in "${PROTECT_LIST[@]}"; do
    # Only process literal file paths, not globs in enable
    if [[ ! "$file_pattern" =~ \* ]]; then
      if [ -e "$file_pattern" ]; then
        echo "Setting immutable flag on: $file_pattern"
        # macOS immutable flag (uchg = user change)
        sudo chflags uchg "$file_pattern" 2>/dev/null || {
          log "ERROR: Failed to set uchg on $file_pattern (need sudo)"
          echo "  Try: sudo chflags uchg $file_pattern"
        }
      fi
    fi
  done
  
  echo ""
  echo "Protection enabled. Attempting to edit protected files will be denied."
  echo "To modify configs, route suggestions through:"
  echo "  - memory/YYYY-MM-DD.md (for change proposals)"
  echo "  - goals/config-change-log.json (for staged changes)"
  echo "  - notification system (to alert Joe for approval)"
}

disable_protection() {
  echo "⚠️  WARNING: Disabling config file protection (emergency only)"
  echo ""
  
  for file_pattern in "${PROTECT_LIST[@]}"; do
    if [[ ! "$file_pattern" =~ \* ]]; then
      if [ -e "$file_pattern" ]; then
        echo "Removing immutable flag from: $file_pattern"
        sudo chflags nouchg "$file_pattern" 2>/dev/null || {
          log "ERROR: Failed to remove uchg from $file_pattern"
          echo "  Try: sudo chflags nouchg $file_pattern"
        }
      fi
    fi
  done
  
  log "ALERT: Config file protection DISABLED at $(date)"
  echo "Re-enable with: bash $0 --enable"
}

log_edit_attempt() {
  local file="$1"
  local attempt_type="$2"
  
  log "BLOCKED EDIT ATTEMPT: $attempt_type on $file ($(whoami) @ $(pwd))"
}

# ─────────────────────────────────────────────────────────────────
# Test protection (verify immutable flags work)
# ─────────────────────────────────────────────────────────────────

test_protection() {
  echo "=== Testing Config File Protection ==="
  echo ""
  
  if [ ! -e "$OPENCLAW_JSON" ]; then
    echo "ℹ️  openclaw.json not found (expected on first boot)"
    return
  fi
  
  # Try a harmless test edit
  TEST_BACKUP="${OPENCLAW_JSON}.backup-test"
  cp "$OPENCLAW_JSON" "$TEST_BACKUP"
  
  if echo '{}' > "$OPENCLAW_JSON" 2>/dev/null; then
    # Edit succeeded — protection is NOT working
    echo "❌ PROTECTION FAILED: File is still editable"
    cp "$TEST_BACKUP" "$OPENCLAW_JSON"
    rm "$TEST_BACKUP"
    return 1
  else
    # Edit blocked — protection is working
    echo "✅ PROTECTION WORKING: File writes are blocked"
    rm "$TEST_BACKUP"
    return 0
  fi
}

# ─────────────────────────────────────────────────────────────────
# Integration with edit tool
# ─────────────────────────────────────────────────────────────────

create_edit_guard() {
  # Create a wrapper function for the edit tool
  # This can be sourced in ~/.zshrc to warn users
  
  cat > "${HOME}/.openclaw/workspace/scripts/edit-guard-wrapper.sh" << 'GUARDEOF'
#!/bin/bash
# edit-guard-wrapper.sh
# Warn before editing critical config files
# Source this in ~/.zshrc: source ~/.openclaw/workspace/scripts/edit-guard-wrapper.sh

DANGER_FILES=(
  "$HOME/.openclaw/openclaw.json"
  "$HOME/.openclaw/cron/jobs.json"
)

edit_with_guard() {
  local file="$1"
  
  for danger in "${DANGER_FILES[@]}"; do
    if [ "$file" = "$danger" ]; then
      echo "⚠️  CRITICAL: This file is PROTECTED. Editing can crash the gateway."
      echo ""
      echo "Instead, document your change in:"
      echo "  1. memory/YYYY-MM-DD.md (what you want to change + why)"
      echo "  2. goals/config-change-log.json (structured change proposal)"
      echo "  3. Send notification to Joe via scripts/send-notification.sh"
      echo ""
      echo "Then Joe can safely apply the change via: openclaw config.patch ..."
      return 1
    fi
  done
  
  # Safe to edit
  nano "$file"
}

# Optional: alias editor to use guard
# alias edit='edit_with_guard'
GUARDEOF
  
  chmod +x "${HOME}/.openclaw/workspace/scripts/edit-guard-wrapper.sh"
  echo "Created edit guard wrapper at: ~/.openclaw/workspace/scripts/edit-guard-wrapper.sh"
}

# ─────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────

case "${1:-}" in
  --status)
    status_protection
    ;;
  --enable)
    enable_protection
    ;;
  --disable)
    disable_protection
    ;;
  --test)
    test_protection
    ;;
  *)
    # Default: check status and suggest actions
    echo "Config Protection Manager"
    echo ""
    status_protection
    echo ""
    echo "Usage:"
    echo "  bash $0              (show status)"
    echo "  bash $0 --enable     (enable immutable protection — requires sudo)"
    echo "  bash $0 --disable    (disable protection — emergency only)"
    echo "  bash $0 --test       (verify protection is working)"
    echo ""
    echo "💡 Suggested flow:"
    echo "  1. Run: sudo bash $0 --enable"
    echo "  2. Run: bash $0 --test"
    echo "  3. Protected files now reject edits — all changes route through"
    echo "     memory files + notifications instead"
    ;;
esac

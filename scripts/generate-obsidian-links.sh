#!/bin/bash
#
# generate-obsidian-links.sh
# Automatically adds wiki-style links to daily memory logs
# Enables Obsidian knowledge graph to stay current without manual updates
#
# Usage: bash scripts/generate-obsidian-links.sh memory/2026-04-13.md
#

set -e

DAILY_LOG="${1:?Error: specify daily log file}"

if [[ ! -f "$DAILY_LOG" ]]; then
  echo "❌ File not found: $DAILY_LOG"
  exit 1
fi

echo "[generate-obsidian-links] Processing: $DAILY_LOG"

# Backup original
cp "$DAILY_LOG" "${DAILY_LOG}.bak"

# Extract project mentions (case-insensitive, but preserve capitalization)
PROJECTS=(
  "CoinUsUp"
  "Even Us Up"
  "Signal App"
  "Automation Consulting"
)

# Extract blocker keywords
BLOCKERS=(
  "Stripe Config"
  "Bill Review Scope"
  "Even Us Up Priority"
  "Signal App Public"
  "Revenue Target"
)

# Add project links to top of file (after metadata)
TEMP_FILE=$(mktemp)
{
  # Copy header/metadata
  head -n 5 "$DAILY_LOG" || true
  
  # Add graph connections section
  cat << 'EOF'

## 📊 Graph Connections (Auto-generated)
**Related Projects:**
EOF
  
  # Add project links if mentioned in file
  for project in "${PROJECTS[@]}"; do
    if grep -qi "$project" "$DAILY_LOG"; then
      echo "- [[Projects/${project// /-}]]"
    fi
  done
  
  cat << 'EOF'

**Related Blockers:**
EOF
  
  # Add blocker links if mentioned
  for blocker in "${BLOCKERS[@]}"; do
    if grep -qi "$blocker" "$DAILY_LOG"; then
      echo "- [[Blockers/Active#${blocker}]]"
    fi
  done
  
  # Add rest of file (skip header)
  tail -n +6 "$DAILY_LOG" || true
} > "$TEMP_FILE"

# Replace original
mv "$TEMP_FILE" "$DAILY_LOG"

echo "✅ Links added: $DAILY_LOG"
echo "   Backup: ${DAILY_LOG}.bak"

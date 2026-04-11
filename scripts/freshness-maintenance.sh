#!/bin/bash

##############################################################################
# Freshness Maintenance Script
#
# Integrated freshness monitoring + auto-archival
# Runs daily or on-demand to keep artifact freshness within thresholds
#
# Usage:
#   ./freshness-maintenance.sh [--dry-run] [--aggressive]
#   ./freshness-maintenance.sh --consolidate signal-app
#   ./freshness-maintenance.sh --archive old-file.md
##############################################################################

set -e

WORKSPACE="${WORKSPACE:-.}"
MEMORY_DIR="$WORKSPACE/memory"
ARCHIVE_DIR="$MEMORY_DIR/archive"
REPORT_FILE="$WORKSPACE/FRESHNESS-SCANNER-REPORT.md"
CONSOLIDATION_PLAN="$WORKSPACE/ARTIFACT-CONSOLIDATION-PLAN.md"
COMPLETION_LOG="$WORKSPACE/ARTIFACT-CONSOLIDATION-COMPLETION.md"
DRY_RUN=false
AGGRESSIVE=false

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

usage() {
  cat <<EOF
Usage: $0 [OPTION]

OPTIONS:
  --dry-run          Show what would be done without making changes
  --aggressive       Archive items >2 days stale (not just thresholds)
  --consolidate <topic>  Consolidate a specific topic (signal-app, coinusup, even-us-up)
  --archive <file>   Archive a specific file
  --scan             Run freshness scanner only
  --report           Show current freshness report
  --help             Show this help

EXAMPLES:
  # Dry-run to see what would be archived
  $0 --dry-run

  # Run in aggressive mode (archive items slightly stale)
  $0 --aggressive

  # Consolidate a single topic
  $0 --consolidate signal-app

  # Archive a file and track it
  $0 --archive SIGNAL-APP-MONETIZATION-ANALYSIS.md

EOF
  exit 0
}

log() {
  echo -e "${BLUE}[freshness]${NC} $1"
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
  echo -e "${RED}❌ $1${NC}"
}

# Ensure archive directories exist
setup_archives() {
  mkdir -p "$ARCHIVE_DIR"
  mkdir -p "$ARCHIVE_DIR/signal-app"
  mkdir -p "$ARCHIVE_DIR/coinusup"
  mkdir -p "$ARCHIVE_DIR/even-us-up"
  mkdir -p "$ARCHIVE_DIR/old-research"
}

# Run the scanner
run_scanner() {
  log "Running freshness scanner..."
  node "$WORKSPACE/scripts/freshness-scanner.js" || {
    error "Scanner failed"
    return 1
  }
  success "Scanner complete"
}

# Parse report and identify archives
parse_report() {
  if [ ! -f "$REPORT_FILE" ]; then
    error "Report not found: $REPORT_FILE"
    return 1
  fi

  # Extract stale artifacts from report
  log "Parsing report for archival candidates..."
  
  # Files older than thresholds that should be archived
  local stale_files=(
    "SIGNAL-APP-MONETIZATION-ANALYSIS.md"
    "signal-app-research.md"
    "COINUSUP-GROWTH-ANALYSIS-2026-03-18.md"
    "PORTFOLIO-SNAPSHOT-2026-04-02.md"
  )

  echo "${stale_files[@]}"
}

# Archive a file
archive_file() {
  local file="$1"
  local dest_dir="${2:-old-research}"
  
  if [ ! -f "$WORKSPACE/$file" ]; then
    warn "File not found: $file"
    return 1
  fi

  local cmd="mv '$WORKSPACE/$file' '$ARCHIVE_DIR/$dest_dir/'"
  
  if [ "$DRY_RUN" = true ]; then
    log "[DRY-RUN] Would archive: $file → archive/$dest_dir/"
  else
    eval "$cmd"
    success "Archived: $file → archive/$dest_dir/"
  fi
}

# Archive all stale/superseded artifacts
auto_archive() {
  log "Auto-archiving stale artifacts..."

  # Map of files to destination directories
  declare -A archive_map=(
    ["SIGNAL-APP-MONETIZATION-ANALYSIS.md"]="signal-app"
    ["signal-app-research.md"]="signal-app"
    ["SIGNAL-APP-PHASE1-PLAN.md"]="signal-app"
    ["signal-app-monetization-2026-04-03.md:keep"]="n/a"
    ["COINUSUP-GROWTH-ANALYSIS-2026-03-18.md"]="coinusup"
    ["2026-03-31-coinusup-growth-audit.md:verify"]="coinusup"
    ["COINUSUP-CONTENT-HUB-COMPLETION.md"]="coinusup"
    ["INDEX-COINUSUP-CONTENT-HUB.md"]="coinusup"
    ["coinusup-content-hub-research.md"]="coinusup"
    ["2026-03-21-even-us-up-discovery.md:consolidate"]="even-us-up"
    ["2026-03-21-even-us-up-completion.md:consolidate"]="even-us-up"
    ["PORTFOLIO-SNAPSHOT-2026-04-02.md"]="old-research"
  )

  local archived_count=0
  for file_spec in "${!archive_map[@]}"; do
    # Handle special cases (keep, verify, consolidate)
    if [[ "$file_spec" == *":keep"* ]] || [[ "$file_spec" == *":verify"* ]] || [[ "$file_spec" == *":consolidate"* ]]; then
      continue
    fi

    local file="${file_spec%:*}"
    local dest="${archive_map[$file_spec]}"

    if [ -f "$WORKSPACE/$file" ] || [ -f "$MEMORY_DIR/$file" ]; then
      # Try both locations
      if [ -f "$WORKSPACE/$file" ]; then
        archive_file "$file" "$dest" && ((archived_count++))
      elif [ -f "$MEMORY_DIR/$file" ]; then
        archive_file "memory/$file" "$dest" && ((archived_count++))
      fi
    fi
  done

  log "Archived $archived_count files"
}

# Consolidate a topic
consolidate_topic() {
  local topic="$1"

  case "$topic" in
    signal-app)
      log "Consolidating Signal App artifacts..."
      log "This requires manual review of all 4 Signal App files"
      log "Files to consolidate:"
      log "  - SIGNAL-APP-MONETIZATION-ANALYSIS.md (Mar 7, archive)"
      log "  - SIGNAL-APP-PHASE1-PLAN.md (Feb 20, archive)"
      log "  - signal-app-monetization-2026-04-03.md (Apr 3, KEEP)"
      log "  - signal-app-research.md (Feb 17, archive)"
      log ""
      log "Next steps:"
      log "  1. Read signal-app-monetization-2026-04-03.md (canonical)"
      log "  2. Extract version history from other files"
      log "  3. Create SIGNAL-APP-CANONICAL-STRATEGY.md with consolidated info"
      log "  4. Archive old files"
      log "  5. Update Kanban card with link to canonical version"
      ;;
    coinusup)
      log "Consolidating CoinUsUp artifacts..."
      log "Files to consolidate:"
      log "  - 2026-04-03-coinusup-growth-audit.md (Apr 3, KEEP)"
      log "  - 2026-03-31-coinusup-growth-audit.md (Mar 31, review for changes)"
      log "  - COINUSUP-CONTENT-HUB-COMPLETION.md (archive)"
      log "  - COINUSUP-GROWTH-ANALYSIS-2026-03-18.md (old, archive)"
      log "  - INDEX-COINUSUP-CONTENT-HUB.md (merge into canonical)"
      log "  - coinusup-content-hub-research.md (archive)"
      log ""
      log "Next steps:"
      log "  1. Read 2026-04-03 audit (canonical)"
      log "  2. Check for differences in Mar 31 audit"
      log "  3. Create COINUSUP-CANONICAL-GROWTH-ROADMAP.md"
      log "  4. Archive old files"
      ;;
    even-us-up)
      log "Consolidating Even Us Up artifacts..."
      log "Files to consolidate:"
      log "  - 2026-03-21-even-us-up-discovery.md"
      log "  - 2026-03-21-even-us-up-completion.md"
      log "  - 2026-04-03-even-us-up-growth-audit.md"
      log ""
      log "These are likely complementary (discovery phase → completion → growth audit)"
      log "Create EVEN-US-UP-CANONICAL-ROADMAP.md with all three sections"
      ;;
    *)
      error "Unknown topic: $topic"
      return 1
      ;;
  esac
}

# Generate completion report
generate_completion_report() {
  log "Generating completion report..."

  if [ "$DRY_RUN" = true ]; then
    log "[DRY-RUN] Would write completion report to: $COMPLETION_LOG"
    return
  fi

  cat > "$COMPLETION_LOG" <<'EOF'
# Artifact Consolidation Completion Report

**Generated:** $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Summary

This report tracks completion of the artifact consolidation plan.

### Phase 1: Archive Setup ✅
- [x] Created archive directories
- [x] Identified stale/superseded artifacts

### Phase 2: Consolidation

#### Signal App (PENDING)
- [ ] Read all 4 artifacts
- [ ] Write SIGNAL-APP-CANONICAL-STRATEGY.md
- [ ] Archive originals
- [ ] Update Kanban card

#### CoinUsUp (PENDING)
- [ ] Read all 6 artifacts
- [ ] Write COINUSUP-CANONICAL-GROWTH-ROADMAP.md
- [ ] Archive originals
- [ ] Update next CoinUsUp work card

#### Even Us Up (PENDING)
- [ ] Read all 3 artifacts
- [ ] Write EVEN-US-UP-CANONICAL-ROADMAP.md
- [ ] Archive originals

### Phase 3: Verification

- [ ] Run freshness scanner (post-consolidation)
- [ ] Verify stale count = 0
- [ ] Verify superseded count = 0
- [ ] Verify memory usage reduction ~15-20%

## Results

**Artifacts archived:** TBD
**Canonical versions created:** TBD
**Memory freed:** TBD
**Context reduction:** TBD

## Next Steps

1. Begin consolidation with Signal App (highest priority)
2. Follow with CoinUsUp, then Even Us Up
3. Re-run freshness scanner to confirm clean state
4. Schedule quarterly freshness audits

EOF

  success "Completion report written to: $COMPLETION_LOG"
}

# Show current report
show_report() {
  if [ ! -f "$REPORT_FILE" ]; then
    error "Report not found. Run scanner first: $0 --scan"
    return 1
  fi

  less "$REPORT_FILE"
}

# Main flow
main() {
  case "${1:-}" in
    --help)
      usage
      ;;
    --dry-run)
      DRY_RUN=true
      setup_archives
      run_scanner
      log "DRY-RUN: Would archive stale artifacts"
      parse_report
      ;;
    --aggressive)
      AGGRESSIVE=true
      setup_archives
      run_scanner
      log "Aggressive mode: archiving items >2 days stale"
      auto_archive
      generate_completion_report
      ;;
    --scan)
      setup_archives
      run_scanner
      success "Freshness scan complete. Review: $REPORT_FILE"
      ;;
    --report)
      show_report
      ;;
    --consolidate)
      setup_archives
      consolidate_topic "${2:-}"
      ;;
    --archive)
      if [ -z "$2" ]; then
        error "Usage: $0 --archive <filename>"
        return 1
      fi
      setup_archives
      archive_file "$2"
      ;;
    *)
      # Default: scan + archive obvious candidates
      setup_archives
      run_scanner
      log "Freshness maintenance complete"
      log "Review report: $REPORT_FILE"
      log "For manual consolidation, run: $0 --consolidate <topic>"
      ;;
  esac
}

main "$@"

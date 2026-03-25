#!/usr/bin/env bash
# scheduler-drift-auditor.sh
# Nightly cron dedup auditor: detects duplicate/overlapping scheduler jobs
# Parses crontab + LaunchAgents, fingerprints equivalent jobs, flags conflicts
# Supports dry-run mode and allowlist for intentional redundancy

# Configuration
WORKSPACE="${HOME}/.openclaw/workspace"
LOGS_DIR="${WORKSPACE}/logs"
AUDIT_REPORT="${LOGS_DIR}/scheduler-audit-$(date +%Y-%m-%d-%H%M%S).json"
ALLOWLIST="${WORKSPACE}/scheduler-allowlist.json"
DRY_RUN="${1:-false}"
VERBOSE="${VERBOSE:-false}"

# Storage for jobs (use temp files for older bash compat)
JOBS_FILE=$(mktemp)
DUPLICATES_FILE=$(mktemp)
CONFLICTS_FILE=$(mktemp)

cleanup_temp() {
  rm -f "$JOBS_FILE" "$DUPLICATES_FILE" "$CONFLICTS_FILE"
}
trap cleanup_temp EXIT

mkdir -p "${LOGS_DIR}"

log_info() {
  printf "[INFO] %s\n" "$*" >&2
}

log_warn() {
  printf "[WARN] %s\n" "$*" >&2
}

log_error() {
  printf "[ERROR] %s\n" "$*" >&2
}

log_ok() {
  printf "[OK] %s\n" "$*" >&2
}

# Parse crontab and extract jobs
parse_crontab() {
  log_info "Parsing crontab..."
  local crontab_output
  crontab_output=$(crontab -l 2>/dev/null || true)
  
  if [ -z "$crontab_output" ]; then
    log_warn "No crontab found"
    return 0
  fi
  
  local line_num=0
  echo "$crontab_output" | while IFS= read -r line; do
    line_num=$((line_num + 1))
    
    # Skip comments and empty lines
    case "$line" in
      \#*) continue ;;
      "") continue ;;
    esac
    
    # Parse cron line using awk to split by whitespace
    # Format: minute hour day month dow command
    local minute hour day month dow command
    minute=$(echo "$line" | awk '{print $1}')
    hour=$(echo "$line" | awk '{print $2}')
    day=$(echo "$line" | awk '{print $3}')
    month=$(echo "$line" | awk '{print $4}')
    dow=$(echo "$line" | awk '{print $5}')
    command=$(echo "$line" | cut -d' ' -f6-)
    
    # Extract script name from command (last .sh file mentioned)
    local script_name
    script_name=$(echo "$command" | sed 's|.*/\([^/]*\.sh\).*|\1|' | head -1)
    
    [ -z "$script_name" ] && continue
    
    # Create fingerprint: unique identifier for deduplication
    local fingerprint
    fingerprint=$(printf "%s" "${script_name}|${minute}|${hour}|${day}|${month}|${dow}" | md5sum | awk '{print $1}')
    
    # Store job info
    local job_id="cron_${line_num}"
    printf "%s|%s|%s|%s|%s|%s|%s|%s|%s\n" "$job_id" "$fingerprint" "$script_name" "$minute" "$hour" "$day" "$month" "$dow" "$command" >> "$JOBS_FILE"
    
    if [ "$VERBOSE" = "true" ]; then
      log_info "Cron Job: ${script_name} at ${minute} ${hour} * ${month} ${dow}"
    fi
  done
}

# Parse LaunchAgents and extract scheduled jobs
parse_launchagents() {
  log_info "Parsing LaunchAgents..."
  
  local agents_dir="${HOME}/Library/LaunchAgents"
  if [ ! -d "$agents_dir" ]; then
    log_warn "LaunchAgents directory not found"
    return 0
  fi
  
  local job_id=0
  for plist in "$agents_dir"/*.plist; do
    job_id=$((job_id + 1))
    
    if [ ! -f "$plist" ]; then
      continue
    fi
    
    local agent_name
    agent_name=$(basename "$plist" .plist)
    
    # Extract StartInterval if present
    local interval
    interval=$(defaults read "$plist" StartInterval 2>/dev/null || true)
    
    if [ -n "$interval" ]; then
      # Create fingerprint from agent name and interval
      local fingerprint
      fingerprint=$(printf "%s" "${agent_name}|interval|${interval}" | md5sum | awk '{print $1}')
      
      printf "%s|%s|%s|%s|%s|%s\n" "launchagent_${job_id}" "$fingerprint" "$agent_name" "interval" "$interval" "LaunchAgent" >> "$JOBS_FILE"
      
      if [ "$VERBOSE" = "true" ]; then
        log_info "LaunchAgent: ${agent_name} interval=${interval}"
      fi
    fi
  done
}

# Detect duplicate fingerprints
detect_duplicates() {
  log_info "Detecting duplicates..."
  
  if [ ! -f "$JOBS_FILE" ] || [ ! -s "$JOBS_FILE" ]; then
    return 0
  fi
  
  # Create temp file for tracking seen fingerprints
  local seen_file=$(mktemp)
  trap "rm -f $seen_file" EXIT
  
  sort -t'|' -k2 "$JOBS_FILE" | while IFS='|' read -r job_id fingerprint script_name rest; do
    if grep -q "^${fingerprint}$" "$seen_file" 2>/dev/null; then
      printf "%s <-> %s\n" "$(grep -m1 "^${fingerprint}:" "$seen_file" | cut -d: -f2)" "$job_id" >> "$DUPLICATES_FILE"
      log_warn "Duplicate detected: ${script_name}"
    else
      printf "%s:%s\n" "$fingerprint" "$job_id" >> "$seen_file"
    fi
  done
}

# Detect time-based conflicts (overlapping time windows for same script)
detect_conflicts() {
  log_info "Detecting time-based conflicts..."
  
  if [ ! -f "$JOBS_FILE" ] || [ ! -s "$JOBS_FILE" ]; then
    return 0
  fi
  
  # Count occurrences of each script name
  cut -d'|' -f3 "$JOBS_FILE" | sort | uniq -c | while read -r count script_name; do
    count=$(echo "$count" | xargs)  # trim whitespace
    if [ "$count" -gt 1 ]; then
      printf "%s: %s instances found - potential time overlap\n" "$script_name" "$count" >> "$CONFLICTS_FILE"
      log_warn "Multiple instances of ${script_name} (${count} total)"
    fi
  done
}

# Count lines in file safely
count_lines() {
  if [ -f "$1" ] && [ -s "$1" ]; then
    wc -l < "$1" | xargs
  else
    echo 0
  fi
}

# Generate fix patch
generate_fix_patch() {
  log_info "Generating fix patch..."
  
  local patch_file="${LOGS_DIR}/scheduler-fix-patch-$(date +%Y%m%d-%H%M%S).sh"
  
  {
    printf "#!/bin/bash\n"
    printf "# Auto-generated fix patch for scheduler conflicts\n"
    printf "# Generated: %s\n" "$(date)"
    printf "\n"
    printf "set -euo pipefail\n"
    printf "\n"
    
    # Generate crontab fix if duplicates exist
    if [ -f "$DUPLICATES_FILE" ] && [ -s "$DUPLICATES_FILE" ]; then
      printf "# Remove duplicate crontab entries\n"
      printf "# Current crontab has the following duplicates:\n"
      while IFS= read -r dup; do
        printf "# - %s\n" "$dup"
      done < "$DUPLICATES_FILE"
      printf "\n"
      printf "# To fix: Edit crontab with 'crontab -e' and remove duplicate lines\n"
      printf "\n"
    fi
    
    # Output conflict resolution steps if conflicts exist
    if [ -f "$CONFLICTS_FILE" ] && [ -s "$CONFLICTS_FILE" ]; then
      printf "# Resolve time-based conflicts:\n"
      while IFS= read -r conflict; do
        printf "# - %s\n" "$conflict"
      done < "$CONFLICTS_FILE"
      printf "\n"
    fi
    
  } > "$patch_file"
  
  chmod +x "$patch_file"
  log_ok "Fix patch generated: ${patch_file}"
  echo "$patch_file"
}

# Generate JSON report
generate_report() {
  log_info "Generating report..."
  
  local dup_count=$(count_lines "$DUPLICATES_FILE")
  local conflict_count=$(count_lines "$CONFLICTS_FILE")
  local job_count=$(count_lines "$JOBS_FILE")
  
  {
    printf "{\n"
    printf "  \"audit_timestamp\": \"%s\",\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf "  \"hostname\": \"%s\",\n" "$(hostname)"
    printf "  \"dry_run\": %s,\n" "$DRY_RUN"
    printf "  \"total_jobs\": %d,\n" "$job_count"
    printf "  \"duplicates_found\": %d,\n" "$dup_count"
    printf "  \"conflicts_found\": %d,\n" "$conflict_count"
    printf "  \"duplicates\": [\n"
    
    # Add duplicates
    if [ -f "$DUPLICATES_FILE" ] && [ -s "$DUPLICATES_FILE" ]; then
      local first=true
      while IFS= read -r dup; do
        if [ "$first" = "true" ]; then
          first=false
        else
          printf ",\n"
        fi
        printf "    {\"pair\": \"%s\"}" "$dup"
      done < "$DUPLICATES_FILE"
    fi
    
    printf "\n  ],\n"
    printf "  \"conflicts\": [\n"
    
    # Add conflicts
    if [ -f "$CONFLICTS_FILE" ] && [ -s "$CONFLICTS_FILE" ]; then
      local first=true
      while IFS= read -r conflict; do
        if [ "$first" = "true" ]; then
          first=false
        else
          printf ",\n"
        fi
        printf "    {\"issue\": \"%s\"}" "$conflict"
      done < "$CONFLICTS_FILE"
    fi
    
    printf "\n  ],\n"
    printf "  \"fix_patch\": \"See generated .sh file in logs directory\"\n"
    printf "}\n"
  } > "$AUDIT_REPORT"
  
  log_ok "Report written to: ${AUDIT_REPORT}"
}

# Main execution
main() {
  log_info "=== Scheduler Drift Guard Auditor ==="
  log_info "Dry-run mode: ${DRY_RUN}"
  log_info "Verbose: ${VERBOSE}"
  
  # Parse jobs from both sources
  parse_crontab
  parse_launchagents
  
  local job_count=$(count_lines "$JOBS_FILE")
  log_ok "Total jobs found: ${job_count}"
  
  # Run detection
  detect_duplicates
  detect_conflicts
  
  # Report findings
  local dup_count=$(count_lines "$DUPLICATES_FILE")
  local conflict_count=$(count_lines "$CONFLICTS_FILE")
  
  if [ "$dup_count" -eq 0 ] && [ "$conflict_count" -eq 0 ]; then
    log_ok "✓ No scheduler drift detected"
  else
    log_warn "⚠ Scheduler drift detected!"
    
    if [ "$dup_count" -gt 0 ]; then
      log_warn "  Duplicates: ${dup_count}"
      while IFS= read -r dup; do
        printf "    - %s\n" "$dup" >&2
      done < "$DUPLICATES_FILE"
    fi
    
    if [ "$conflict_count" -gt 0 ]; then
      log_warn "  Conflicts: ${conflict_count}"
      while IFS= read -r conflict; do
        printf "    - %s\n" "$conflict" >&2
      done < "$CONFLICTS_FILE"
    fi
  fi
  
  # Generate outputs
  generate_report
  
  if [ "$dup_count" -gt 0 ] || [ "$conflict_count" -gt 0 ]; then
    local patch_file
    patch_file=$(generate_fix_patch)
    log_ok "Fix patch: ${patch_file}"
  fi
  
  log_info "Audit complete"
}

main "$@"

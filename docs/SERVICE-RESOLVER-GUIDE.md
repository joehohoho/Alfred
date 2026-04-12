# Service Resolver System — Official Guide

**Last Updated:** 2026-04-12  
**Status:** ✅ Production  
**Scope:** All UI and infrastructure service changes

---

## Problem Statement

Previously, scripts targeting the wrong paths caused mistakes:
- Editing `/workspace/dashboard` instead of `/Users/hopenclaw/command-center` (Command Center repo)
- Restarting services without checking approval requirements
- Missing critical metadata about service ownership and safety

**Solution:** Mandatory source-of-truth resolver for all UI/infrastructure changes.

---

## Architecture

### Three Components

1. **`config/service-map.json`** — Canonical service metadata
   - Repo paths, launch agents, URLs, owners, restart safety
   - Preflight rules (safe/dangerous edits, approval requirements)
   - Machine-readable; version-controlled

2. **`scripts/resolve-service-path.sh`** — Resolver script
   - Resolves service names/aliases to metadata
   - Fuzzy matching for typos and aliases
   - JSON or formatted text output

3. **`scripts/lib-service-preflight.sh`** — Library for sourcing
   - Functions for preflight validation
   - Can be sourced by other scripts
   - Provides programmatic API

4. **`scripts/ui-service-preflight.sh`** — Standalone validation CLI
   - User-facing preflight checker
   - Used manually or in CI/CD

---

## Services Registered

| Service | Key | Aliases | Owner | Path |
|---------|-----|---------|-------|------|
| Command Center | `command-center` | dashboard, cc, control-ui | Alfred | `/Users/hopenclaw/command-center` |
| Gateway | `gateway` | gateway, core, backend | Joe | `/Users/hopenclaw/.openclaw/gateway` |
| Workspace | `workspace` | workspace, home, ~ | Alfred | `/Users/hopenclaw/.openclaw/workspace` |
| Cron Scheduler | `cron-scheduler` | cron, scheduler, jobs | Alfred | `/Users/hopenclaw/.openclaw/cron/jobs.json` |
| Sentinel | `sentinel` | sentinel, health-monitor | Alfred | `/Users/hopenclaw/.openclaw/workspace/scripts` |

---

## Usage

### Quick Check (Command Line)

Check if service is safe to edit:
```bash
./scripts/ui-service-preflight.sh check "dashboard"
```

Validate a specific file path:
```bash
./scripts/ui-service-preflight.sh validate-path "dashboard" "src/"
```

View preflight rules:
```bash
./scripts/ui-service-preflight.sh rules "gateway"
```

List all services:
```bash
./scripts/ui-service-preflight.sh list
```

### In a Script (Sourcing Library)

```bash
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the library
source "$SCRIPT_DIR/lib-service-preflight.sh"

# Resolve service
if ! preflight_resolve_service "dashboard"; then
  echo "Failed to resolve dashboard"
  exit 1
fi

# Get metadata
REPO_PATH=$(preflight_get_repo_path)
LAUNCH_AGENT=$(preflight_get_launch_agent)
OWNER=$(preflight_get_owner)

echo "Repo: $REPO_PATH"
echo "Owner: $OWNER"
echo "Launch Agent: $LAUNCH_AGENT"

# Validate path before editing
if ! preflight_validate_edit "command-center" "src/"; then
  echo "Cannot edit src/ in command-center"
  exit 1
fi

# Check if restart is safe
if ! preflight_check_restart_safety "command-center"; then
  echo "Service is not safe to restart"
  exit 1
fi

# Now proceed with your changes
cd "$REPO_PATH"
# ... your editing logic ...
```

### Approval Requirements

Some services require explicit approval before changes. The system detects this:

```bash
./scripts/ui-service-preflight.sh check "gateway" --strict
```

The `--strict` flag fails if approval is required.

Without `--strict`, it warns but allows you to proceed (for informational purposes).

---

## Service Map Structure

### Top-Level

```json
{
  "version": "1.0",
  "lastUpdated": "2026-04-12T16:00:00Z",
  "metadata": { ... },
  "services": { ... },
  "preflight_rules": { ... },
  "validation_notes": { ... }
}
```

### Services Entry

```json
"command-center": {
  "name": "Command Center (Control UI)",
  "aliases": ["dashboard", "cc", "control-ui", ...],
  "repo_path": "/Users/hopenclaw/command-center",
  "source_repo": "https://github.com/hopenclaw/command-center",
  "local_url": "http://localhost:3000",
  "public_url": "https://command-center.openclaw.ai",
  "launch_agent": "com.alfred.dashboard-nextjs",
  "owner": "Alfred",
  "owner_contact": "Alfred (internal ops)",
  "port": 3000,
  "language": "TypeScript/Node.js",
  "docker": false,
  "build_command": "npm run build",
  "restart_safe": true,
  "restart_requires_approval": false,
  "notes": "Next.js dashboard for OpenClaw control and monitoring"
}
```

### Preflight Rules Entry

```json
"command-center": {
  "safe_edits": ["src/", "package.json", "tsconfig.json", "README.md"],
  "dangerous_edits": ["LaunchAgent plist", "gateway config"],
  "restart_command": "launchctl restart com.alfred.dashboard-nextjs",
  "restart_required_for": ["Environment variable changes", "Port configuration"],
  "rollback_command": "git checkout HEAD -- src/ && npm install && npm run build"
}
```

---

## Library API Reference

### `preflight_resolve_service SERVICE_QUERY`
Resolve a service by name or alias. Sets global variables `$_RESOLVED_SERVICE` and `$_SERVICE_DATA`.

**Returns:** 0 if found, 1 if not found.

```bash
preflight_resolve_service "dashboard"  # or "cc" or "command-center"
```

### `preflight_get_repo_path`
Get the repo path of the currently resolved service.

```bash
REPO_PATH=$(preflight_get_repo_path)
```

### `preflight_get_launch_agent`
Get the LaunchAgent identifier.

```bash
AGENT=$(preflight_get_launch_agent)
launchctl restart "$AGENT"
```

### `preflight_get_owner`
Get the owner (who to notify for approval).

```bash
OWNER=$(preflight_get_owner)
```

### `preflight_get_local_url`
Get the local development URL.

```bash
URL=$(preflight_get_local_url)
echo "Running at: $URL"
```

### `preflight_validate_edit SERVICE_KEY TARGET_PATH`
Check if TARGET_PATH is in the safe_edits list.

**Returns:** 0 if safe, 1 if not safe.

```bash
preflight_validate_edit "command-center" "src/"
```

### `preflight_check_approval SERVICE_KEY`
Check if the service requires approval before changes.

**Returns:** 0 if no approval needed, 1 if approval required.

```bash
if ! preflight_check_approval "gateway"; then
  echo "Need to ask Joe first"
fi
```

### `preflight_check_restart_safety SERVICE_KEY`
Check if restarting the service is safe.

**Returns:** 0 if safe, 1 if risky.

```bash
if preflight_check_restart_safety "gateway"; then
  launchctl restart com.alfred.gateway-core
else
  echo "Restart requires approval"
fi
```

### `preflight_full_check SERVICE_QUERY [TARGET_PATH]`
Run all checks at once.

**Returns:** 0 if all pass, 1 if any fail.

```bash
preflight_full_check "dashboard" "src/"
```

### `preflight_print_service_info`
Print the full resolved service metadata (debugging).

```bash
preflight_print_service_info
```

---

## Integration Checklist

### ✅ Scripts That Should Use It

- [ ] Any script that modifies files in `/command-center`
- [ ] Any script that edits `.openclaw/` subdirectories
- [ ] Any script that touches `.openclaw/cron/jobs.json`
- [ ] Any script that restarts LaunchAgents
- [ ] Any script that queries "which path is service X?"

### ✅ New Script Template

```bash
#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib-service-preflight.sh"

# ============================================================================
# PREFLIGHT
# ============================================================================

# Resolve the service we're modifying
if ! preflight_resolve_service "dashboard"; then
  exit 1
fi

REPO_PATH=$(preflight_get_repo_path)

# (Optional) Validate specific path
if ! preflight_validate_edit "command-center" "src/"; then
  exit 1
fi

# (Optional) Check approval
if ! preflight_check_approval "command-center"; then
  echo "This service requires approval. Asking Joe..."
  # ... send notification to Joe ...
  exit 1
fi

# ============================================================================
# PROCEED WITH WORK
# ============================================================================

cd "$REPO_PATH"
# ... your script logic ...
```

---

## Common Scenarios

### Scenario 1: Add a Feature to Command Center

```bash
#!/bin/bash
# add-dashboard-widget.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib-service-preflight.sh"

# Step 1: Resolve
preflight_resolve_service "dashboard" || exit 1

REPO=$(preflight_get_repo_path)
echo "Working in: $REPO"

# Step 2: Validate path
preflight_validate_edit "command-center" "src/components" || exit 1

# Step 3: Make changes
cd "$REPO"
cat > src/components/MyWidget.tsx <<EOF
// new widget code
EOF

# Step 4: Build
npm run build || exit 1

# Step 5: Restart (safe for dashboard)
AGENT=$(preflight_get_launch_agent)
launchctl restart "$AGENT"

echo "✓ Widget added and deployed"
```

### Scenario 2: Try to Edit Gateway (Fails Due to Approval)

```bash
#!/bin/bash
# try-edit-gateway.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib-service-preflight.sh"

preflight_resolve_service "gateway" || exit 1

# This will print a warning
if ! preflight_check_approval "gateway"; then
  echo "❌ Cannot edit gateway without Joe's approval"
  exit 1
fi
```

Output:
```
⚠️  APPROVAL REQUIRED
   Service: gateway
   Owner: Joe (maintainer)
   This service requires explicit approval before changes
```

### Scenario 3: Check Before Restart

```bash
#!/bin/bash
# maybe-restart.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib-service-preflight.sh"

SERVICE_TO_RESTART="cron-scheduler"

preflight_resolve_service "$SERVICE_TO_RESTART" || exit 1

if ! preflight_check_restart_safety "$(get_service_key)"; then
  echo "Service is not safe to restart"
  exit 1
fi

# Safe to restart
AGENT=$(preflight_get_launch_agent)
launchctl restart "$AGENT"
```

---

## Maintenance

### Adding a New Service

Edit `/Users/hopenclaw/.openclaw/workspace/config/service-map.json`:

```json
{
  "services": {
    "my-service": {
      "name": "My Service Name",
      "aliases": ["myservice", "my-app", "ms"],
      "repo_path": "/path/to/repo",
      "owner": "Alfred",
      "launch_agent": "com.alfred.my-service",
      "port": 1234,
      "restart_safe": true,
      "notes": "..."
    }
  },
  "preflight_rules": {
    "my-service": {
      "safe_edits": ["src/", "config/"],
      "dangerous_edits": ["package.json", "index.js"]
    }
  }
}
```

### Updating Service Metadata

If a service moves or changes:

1. Edit `config/service-map.json` with new metadata
2. Run: `./scripts/ui-service-preflight.sh check "service-name"`
3. Verify output is correct
4. Commit the change

### Testing

Run the comprehensive test suite:
```bash
bash ~/.openclaw/workspace/scripts/test-service-resolver.sh
```

Expected output: All tests pass, JSON validation passes, fuzzy matching works.

---

## Preventing Mistakes

### Before Editing Any Service

```bash
# Always run this first:
./scripts/ui-service-preflight.sh check "SERVICE_NAME"
```

### Before Touching Core Services

```bash
# Use strict mode:
./scripts/ui-service-preflight.sh check "SERVICE_NAME" --strict
```

This will FAIL if any approval is required, forcing you to ask first.

### List All Services

```bash
./scripts/ui-service-preflight.sh list
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success, all checks passed |
| 1 | Validation failed (service not found, path invalid, approval required) |
| 2 | Invalid arguments |

---

## Troubleshooting

### Service not found

```bash
./scripts/ui-service-preflight.sh list
```

Check the available services. Use the correct alias.

### "No safe_edits defined for service"

Service is new or conservative. Check `config/service-map.json` and update the preflight rules.

### "Restart is not safe"

Service has `restart_safe: false` or `restart_requires_approval: true`. Check who owns it.

### Fuzzy matching not working

The resolver tries:
1. Exact alias match (case-insensitive)
2. Partial string match

If neither works, the service doesn't exist. Run `list` to see what's available.

---

## Summary

**Golden Rule:** Before editing ANY UI or infrastructure service, run:

```bash
./scripts/ui-service-preflight.sh check "service-name"
```

This prevents:
- ❌ Editing the wrong path
- ❌ Missing approval requirements
- ❌ Unsafe restarts
- ❌ Breaking production services

**Status:** System live and mandatory for all UI/infrastructure changes.

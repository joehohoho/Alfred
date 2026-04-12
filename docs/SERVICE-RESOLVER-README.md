# Service Resolver System

**Status:** ✅ Production Ready  
**Created:** 2026-04-12  
**Scope:** Mandatory for all UI and infrastructure service changes

---

## Overview

The Service Resolver is a source-of-truth system that prevents mistakes when editing UI services and infrastructure components. It solves the problem of:

- Editing the wrong repository path (e.g., `/workspace/dashboard` instead of `/Users/hopenclaw/command-center`)
- Making changes to services that require approval
- Restarting services unsafely
- Missing critical metadata about service ownership

---

## What It Is

**Three integrated components:**

1. **Service Map** (`config/service-map.json`)
   - Canonical registry of all services
   - Metadata: repo paths, launch agents, URLs, owners, safety flags
   - Preflight rules: safe/dangerous edits, approval requirements, restart safety

2. **Resolver Script** (`scripts/resolve-service-path.sh`)
   - Fuzzy-matches service names/aliases to metadata
   - Returns canonical paths and configuration
   - JSON or formatted text output

3. **Preflight Library** (`scripts/lib-service-preflight.sh`)
   - Reusable bash functions for validation
   - Can be sourced by any script
   - Provides programmatic API

4. **Preflight CLI** (`scripts/ui-service-preflight.sh`)
   - User-facing validation tool
   - Checks, lists, validates, displays rules
   - Used manually or in CI/CD

---

## Quick Start

### For Users

Before editing any service:

```bash
./scripts/ui-service-preflight.sh check "dashboard"
```

Output:
```
✓ Service resolved: Command Center (Control UI)
  Path: /Users/hopenclaw/command-center

Check 1: Repository exists
  ✓ Found at /Users/hopenclaw/command-center

Check 2: Approval requirements
  ✓ No approval required for command-center

Check 3: Restart safety
  ✓ Safe service (no restart impact)

✓ Preflight validation PASSED

Ready to make changes to: command-center
Repository: /Users/hopenclaw/command-center
```

### For Script Authors

```bash
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib-service-preflight.sh"

# Resolve service
preflight_resolve_service "dashboard" || exit 1

# Get path
REPO=$(preflight_get_repo_path)
echo "Working in: $REPO"

# Validate edit path
preflight_validate_edit "command-center" "src/" || exit 1

# Proceed with edits
cd "$REPO"
# ... your changes ...
```

---

## Architecture

### Service Map Structure

Located at: `~/.openclaw/workspace/config/service-map.json`

```json
{
  "version": "1.0",
  "metadata": { "description": "...", "maintainer": "Alfred" },
  "services": {
    "command-center": {
      "name": "Command Center (Control UI)",
      "aliases": ["dashboard", "cc", "control-ui", ...],
      "repo_path": "/Users/hopenclaw/command-center",
      "local_url": "http://localhost:3000",
      "launch_agent": "com.alfred.dashboard-nextjs",
      "owner": "Alfred",
      "restart_safe": true,
      "notes": "Next.js dashboard for OpenClaw control and monitoring"
    },
    "gateway": {
      "name": "OpenClaw Gateway (Core)",
      "aliases": ["gateway", "core", "backend", ...],
      "repo_path": "/Users/hopenclaw/.openclaw/gateway",
      "launch_agent": "com.alfred.gateway-core",
      "owner": "Joe",
      "restart_safe": false,
      "restart_requires_approval": true,
      "notes": "Core OpenClaw service; restart may cause outages"
    },
    // ... more services
  },
  "preflight_rules": {
    "command-center": {
      "safe_edits": ["src/", "package.json", "tsconfig.json"],
      "dangerous_edits": ["LaunchAgent plist"],
      "restart_command": "launchctl restart com.alfred.dashboard-nextjs",
      "rollback_command": "git checkout HEAD -- src/ && npm install"
    },
    "gateway": {
      "safe_edits": [],
      "dangerous_edits": ["All changes to gateway code or config"],
      "approval_required": true,
      "approval_contact": "Joe"
    }
    // ... more rules
  }
}
```

### Resolver Logic

**Flow:**

1. User provides service name/alias (e.g., "dashboard", "cc", "command center")
2. Resolver converts to lowercase and searches for matches
3. **Exact match first:** Check if alias matches (fastest)
4. **Fuzzy match second:** Check if any field contains the query (tolerant)
5. Returns full service metadata + preflight rules
6. Returns 1 if no match found

**Example:**

```bash
# All resolve to "command-center"
./resolve-service-path.sh "dashboard"
./resolve-service-path.sh "cc"
./resolve-service-path.sh "Command Center"
./resolve-service-path.sh "control-ui"

# Output (JSON format):
{
  "name": "Command Center (Control UI)",
  "aliases": [...],
  "repo_path": "/Users/hopenclaw/command-center",
  "launch_agent": "com.alfred.dashboard-nextjs",
  "owner": "Alfred",
  "restart_safe": true,
  "notes": "..."
}
```

### Preflight Library API

| Function | Purpose | Returns |
|----------|---------|---------|
| `preflight_resolve_service NAME` | Resolve by name/alias; sets globals | 0=found, 1=not found |
| `preflight_get_repo_path` | Get repo path of resolved service | Path string |
| `preflight_get_launch_agent` | Get LaunchAgent identifier | Agent ID or empty |
| `preflight_get_owner` | Get owner (for approval) | Owner name |
| `preflight_get_local_url` | Get dev URL | URL or empty |
| `preflight_validate_edit KEY PATH` | Check if PATH is safe to edit | 0=safe, 1=not safe |
| `preflight_check_approval KEY` | Check if approval required | 0=no approval, 1=required |
| `preflight_check_restart_safety KEY` | Check if restart is safe | 0=safe, 1=not safe |
| `preflight_full_check SERVICE [PATH]` | Run all checks | 0=all pass, 1=any fail |

---

## Services Registered

### Command Center
- **Key:** `command-center`
- **Aliases:** dashboard, cc, control-ui, command-center-ui
- **Path:** `/Users/hopenclaw/command-center`
- **Owner:** Alfred
- **Safe Restarts:** Yes
- **Requires Approval:** No
- **Safe Edits:** `src/`, `package.json`, `tsconfig.json`

### Gateway (Core)
- **Key:** `gateway`
- **Aliases:** gateway, core, api-server, backend, openclaw-gateway
- **Path:** `/Users/hopenclaw/.openclaw/gateway`
- **Owner:** Joe
- **Safe Restarts:** No
- **Requires Approval:** Yes
- **Safe Edits:** (none — all changes require approval)

### Workspace
- **Key:** `workspace`
- **Aliases:** workspace, home, ~, openclaw-workspace
- **Path:** `/Users/hopenclaw/.openclaw/workspace`
- **Owner:** Alfred
- **Safe Restarts:** Yes (no restart needed)
- **Requires Approval:** No
- **Safe Edits:** `memory/`, `scripts/`, `SOUL.md`, `AGENTS.md`, `config/`

### Cron Scheduler
- **Key:** `cron-scheduler`
- **Aliases:** cron, scheduler, jobs, background-tasks, cron-jobs
- **Path:** `/Users/hopenclaw/.openclaw/cron/jobs.json`
- **Owner:** Alfred
- **Safe Restarts:** No (requires gateway restart)
- **Requires Approval:** No
- **Safe Edits:** New job definitions, job payload additions

### Sentinel
- **Key:** `sentinel`
- **Aliases:** sentinel, health-monitor, self-heal, watchdog
- **Path:** `/Users/hopenclaw/.openclaw/workspace/scripts`
- **Owner:** Alfred
- **Safe Restarts:** Yes
- **Requires Approval:** No
- **Safe Edits:** `sentinel-playbook.json`, `sentinel.sh`

---

## Usage Patterns

### Pattern 1: One-Off Manual Check

```bash
./scripts/ui-service-preflight.sh check "dashboard"
```

Displays full report including path, ownership, approval status, restart safety.

### Pattern 2: Script Integration

```bash
#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib-service-preflight.sh"

# Mandatory preflight
if ! preflight_resolve_service "dashboard"; then
  echo "Cannot resolve dashboard service"
  exit 1
fi

REPO=$(preflight_get_repo_path)

# Proceed with edits
cd "$REPO"
# ... changes ...
```

### Pattern 3: Approval Check

```bash
# Fail if approval is needed
./scripts/ui-service-preflight.sh check "gateway" --strict

# Or in script:
if ! preflight_check_approval "gateway"; then
  echo "This requires Joe's approval"
  exit 1
fi
```

### Pattern 4: Inspect Before Restarting

```bash
# View rules
./scripts/ui-service-preflight.sh rules "cron-scheduler"

# In script:
if ! preflight_check_restart_safety "cron-scheduler"; then
  echo "Not safe to restart; requires approval"
  exit 1
fi
```

### Pattern 5: List All Available

```bash
./scripts/ui-service-preflight.sh list
```

Useful when you're not sure which service to target.

---

## Common Scenarios

### Scenario A: Add Dashboard Widget

```bash
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib-service-preflight.sh"

# Preflight
preflight_resolve_service "dashboard" || exit 1
REPO=$(preflight_get_repo_path)

# Validate edit
preflight_validate_edit "command-center" "src/" || exit 1

# Make changes
cd "$REPO"
cat > src/components/MyWidget.tsx <<'EOF'
// Widget code
EOF

# Build
npm run build || exit 1

# Restart
AGENT=$(preflight_get_launch_agent)
launchctl restart "$AGENT"

echo "✓ Widget deployed"
```

### Scenario B: Try to Edit Gateway (Should Fail)

```bash
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib-service-preflight.sh"

# Preflight
preflight_resolve_service "gateway" || exit 1

# Check approval
if ! preflight_check_approval "gateway"; then
  echo "❌ Gateway changes require Joe's approval"
  exit 1
fi

echo "Approval OK; proceeding..."
# ... edits ...
```

Output:
```
⚠️  APPROVAL REQUIRED
   Service: gateway
   Owner: Joe (maintainer)
   This service requires explicit approval before changes
❌ Gateway changes require Joe's approval
```

### Scenario C: Update Cron Jobs

```bash
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib-service-preflight.sh"

# Resolve cron
preflight_resolve_service "cron" || exit 1
JOBS_FILE=$(preflight_get_repo_path)

# Check restart safety
preflight_check_restart_safety "cron-scheduler" || {
  echo "Cron restart requires approval; skipping"
  exit 0
}

# Update jobs
jq '.jobs += [...]' "$JOBS_FILE" > "$JOBS_FILE.tmp"
mv "$JOBS_FILE.tmp" "$JOBS_FILE"

# Restart gateway (required for cron changes)
echo "Restarting gateway to apply cron changes..."
launchctl restart com.alfred.gateway-core

echo "✓ Cron jobs updated and live"
```

---

## Integration Status

### Currently Integrated

- ✅ `scripts/update-dashboard-feature.sh` — Uses preflight resolver
- ✅ `scripts/resolve-service-path.sh` — Core resolver
- ✅ `scripts/test-service-resolver.sh` — Test suite

### Ready for Integration

Any script that:
- Edits files in `/command-center`
- Touches `.openclaw/` directories
- Modifies cron jobs
- Restarts LaunchAgents
- Queries service metadata

---

## Maintenance

### Adding a New Service

1. Edit `config/service-map.json`:

```json
{
  "services": {
    "my-service": {
      "name": "My Service Name",
      "aliases": ["myservice", "my-app"],
      "repo_path": "/path/to/repo",
      "owner": "Owner Name",
      "launch_agent": "com.alfred.my-service",
      "restart_safe": true,
      "notes": "Description"
    }
  },
  "preflight_rules": {
    "my-service": {
      "safe_edits": ["src/", "config/"],
      "dangerous_edits": ["main.js"]
    }
  }
}
```

2. Test:
```bash
./scripts/ui-service-preflight.sh check "my-service"
./scripts/ui-service-preflight.sh list
```

3. Commit.

### Updating Metadata

If a service moves or changes:

```bash
# Edit config/service-map.json
# Test
./scripts/ui-service-preflight.sh check "service-name"
# Commit
git add config/service-map.json
git commit -m "Update service-map.json: service-name new path"
```

### Running Tests

```bash
bash ~/.openclaw/workspace/scripts/test-service-resolver.sh
```

Expected: All tests pass, JSON validation passes.

---

## Error Messages & Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Service not found" | Service doesn't exist or wrong name | Run `list` to see available services |
| "Approval required" | Service marked in config | Contact owner for approval before changes |
| "Not safe to edit" | Path not in safe_edits list | Check `rules` command for valid paths |
| "Restart not safe" | Service has `restart_safe: false` | Contact owner before restarting |
| "Repository not found" | Path in config is wrong | Verify path in `config/service-map.json` |

---

## Summary

**Golden Rule:** Before editing ANY service, run:

```bash
./scripts/ui-service-preflight.sh check "service-name"
```

This prevents:
- ❌ Editing wrong paths
- ❌ Missing approvals
- ❌ Unsafe restarts
- ❌ Breaking production

**Status:** System live, mandatory, well-documented.

For detailed reference, see:
- `docs/SERVICE-RESOLVER-GUIDE.md` — Full guide with examples
- `docs/SERVICE-RESOLVER-QUICK-REF.md` — Quick reference card
- `scripts/resolve-service-path.sh --help` — Resolver CLI help
- `scripts/ui-service-preflight.sh --help` — Preflight CLI help

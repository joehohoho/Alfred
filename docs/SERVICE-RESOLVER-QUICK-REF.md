# Service Resolver — Quick Reference

**TL;DR:** Before editing ANY service, run this:

```bash
./scripts/ui-service-preflight.sh check "service-name"
```

---

## Services

| Service | Key | Aliases |
|---------|-----|---------|
| Command Center | `command-center` | dashboard, cc, control-ui |
| Gateway | `gateway` | gateway, core, backend |
| Workspace | `workspace` | workspace, home, ~ |
| Cron | `cron-scheduler` | cron, scheduler, jobs |
| Sentinel | `sentinel` | sentinel, health-monitor |

---

## Check Variants

```bash
# Simple check
./scripts/ui-service-preflight.sh check "dashboard"

# Strict (fail if approval required)
./scripts/ui-service-preflight.sh check "gateway" --strict

# List all services
./scripts/ui-service-preflight.sh list

# View rules
./scripts/ui-service-preflight.sh rules "cron-scheduler"

# Validate path
./scripts/ui-service-preflight.sh validate-path "dashboard" "src/"
```

---

## In Your Script

```bash
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib-service-preflight.sh"

# Resolve service
preflight_resolve_service "dashboard" || exit 1

# Get path
REPO=$(preflight_get_repo_path)

# Validate path
preflight_validate_edit "command-center" "src/" || exit 1

# Check approval
preflight_check_approval "command-center" || exit 1

# Proceed
cd "$REPO"
# ... your changes ...
```

---

## Common Checks

**Before editing dashboard code:**
```bash
./scripts/ui-service-preflight.sh check "dashboard"
```

**Before restarting gateway:**
```bash
./scripts/ui-service-preflight.sh check "gateway" --strict
```

**Before editing cron jobs:**
```bash
./scripts/ui-service-preflight.sh rules "cron-scheduler"
```

**Find all services:**
```bash
./scripts/ui-service-preflight.sh list
```

---

## Library Functions

| Function | Purpose |
|----------|---------|
| `preflight_resolve_service NAME` | Resolve service by name/alias |
| `preflight_get_repo_path` | Get repo path of resolved service |
| `preflight_get_launch_agent` | Get LaunchAgent identifier |
| `preflight_get_owner` | Get owner (who approves changes) |
| `preflight_validate_edit KEY PATH` | Check if PATH is safe to edit |
| `preflight_check_approval KEY` | Check if approval is required |
| `preflight_check_restart_safety KEY` | Check if restart is safe |

---

## Golden Rule

✅ **ALWAYS RUN PREFLIGHT BEFORE EDITING:**
```bash
./scripts/ui-service-preflight.sh check "service"
```

Prevents:
- ❌ Editing wrong paths
- ❌ Missing approvals
- ❌ Unsafe restarts
- ❌ Breaking production

# RESOLVER.md — Service Path Resolution Quick Reference

**Purpose:** Prevent infrastructure edits from landing in the wrong codebase. Use the resolver before modifying any service, dashboard, gateway, or infrastructure component.

---

## Quick Start

### Basic Usage

```bash
# Resolve a service to get canonical paths and metadata
~/.openclaw/workspace/scripts/resolve-service-path.sh "dashboard"
~/.openclaw/workspace/scripts/resolve-service-path.sh "gateway"
~/.openclaw/workspace/scripts/resolve-service-path.sh "cron"

# Get JSON output (for scripts)
~/.openclaw/workspace/scripts/resolve-service-path.sh --json "Command Center"
```

### Common Service Aliases

| Service | Aliases | Primary Path |
|---------|---------|--------------|
| **Command Center** | dashboard, cc, control-ui | `/Users/hopenclaw/command-center` |
| **Gateway** | gateway, core, api-server | `/Users/hopenclaw/.openclaw/gateway` |
| **Workspace** | workspace, home, ~ | `/Users/hopenclaw/.openclaw/workspace` |
| **Cron Scheduler** | cron, scheduler, jobs, background-tasks | `/Users/hopenclaw/.openclaw/cron/jobs.json` |
| **Sentinel** | sentinel, health-monitor, self-heal | `/Users/hopenclaw/.openclaw/workspace/scripts` |

---

## Using in Scripts

### Pattern 1: Verify You're in the Right Place

```bash
#!/bin/bash
# Before editing any service, check the resolver

SERVICE=$(./resolve-service-path.sh "command-center")
REPO_PATH=$(echo $SERVICE | jq -r '.repo_path')

# Verify we're editing the right location
if [ ! -f "$REPO_PATH/package.json" ]; then
  echo "❌ ERROR: Command Center repo not found at $REPO_PATH"
  echo "Resolved path may be wrong. Run: ./resolve-service-path.sh command-center"
  exit 1
fi

cd "$REPO_PATH" || exit 1
# Now safe to edit
npm run build
```

### Pattern 2: Ownership Check (Dangerous Edits)

```bash
#!/bin/bash
# Before editing gateway config, check ownership

SERVICE=$(./resolve-service-path.sh --json "gateway")
REPO_PATH=$(echo $SERVICE | jq -r '.repo_path')
OWNER=$(echo $SERVICE | jq -r '.owner')
RESTART_REQUIRED=$(echo $SERVICE | jq -r '.restart_requires_approval')

if [ "$OWNER" != "Alfred" ]; then
  echo "⚠️  WARNING: Gateway is owned by $OWNER, not you"
  echo "This edit requires approval. Confirm with Joe before proceeding."
  exit 1
fi

if [ "$RESTART_REQUIRED" = "true" ]; then
  echo "⚠️  WARNING: Gateway restart requires Joe approval"
  exit 1
fi
```

### Pattern 3: Extract Metadata in Scripts

```bash
#!/bin/bash
# Extract specific metadata for conditional logic

RESOLVER_OUTPUT=$(./resolve-service-path.sh --json "command-center")

LAUNCH_AGENT=$(echo $RESOLVER_OUTPUT | jq -r '.launch_agent')
LOCAL_URL=$(echo $RESOLVER_OUTPUT | jq -r '.local_url')
SAFE_TO_RESTART=$(echo $RESOLVER_OUTPUT | jq -r '.restart_safe')

# Use the metadata
if [ "$SAFE_TO_RESTART" = "true" ]; then
  launchctl restart "$LAUNCH_AGENT"
  echo "✓ Service restarted at $LOCAL_URL"
fi
```

---

## Service Map Structure

The canonical service map is stored in `config/service-map.json`. Each service entry includes:

**Core fields:**
- `name` — human-readable service name
- `aliases` — alternative names/acronyms
- `repo_path` — canonical file system path
- `owner` — who is responsible for this service
- `launch_agent` — LaunchAgent identifier (if applicable)
- `local_url` — local development URL
- `port` — service port number
- `language` — implementation language

**Safety fields:**
- `restart_safe` — whether it's safe to restart without approval
- `restart_requires_approval` — if true, Joe must approve restart
- `docker` — whether service runs in Docker
- `safe_edits` / `dangerous_edits` — preflight rules

---

## Common Mistakes to Avoid

### ❌ Wrong #1: Editing `/workspace/dashboard` instead of `/command-center`
**Solution:** Always run `resolve-service-path.sh "dashboard"` first.

### ❌ Wrong #2: Restarting Gateway without checking ownership
**Solution:** Check `jq '.owner'` from resolver output before restart.

### ❌ Wrong #3: Editing cron jobs without verifying the path
**Solution:** Use `resolve-service-path.sh "cron"` to get `repo_path`.

### ❌ Wrong #4: Assuming port numbers haven't changed
**Solution:** Read from resolver output, don't hardcode ports.

---

## Adding a New Service

1. Add entry to `config/service-map.json` under `.services`
2. Include all required fields: name, aliases, repo_path, owner
3. Run validation: `jq empty config/service-map.json`
4. Test resolution: `resolve-service-path.sh "new-service-name"`
5. Update this file with the new aliases in the quick reference table

---

## Troubleshooting

### Service Not Found
```bash
# Check what services are available
./resolve-service-path.sh --help

# Verify service map is valid JSON
jq empty ~/.openclaw/workspace/config/service-map.json
```

### Typo in Service Name
The resolver uses fuzzy matching, so close typos may still resolve:
- "dashbord" → resolves to "dashboard"
- "gatway" → resolves to "gateway"
- "cronscheduler" → resolves to "cron"

If fuzzy match fails, check aliases: `jq '.services[].aliases' config/service-map.json`

### Resolver Script Not Found
Ensure path is correct: `~/.openclaw/workspace/scripts/resolve-service-path.sh`

---

## Integration with Preflight Hooks

The resolver powers preflight safety checks in infrastructure scripts. When you see this pattern:

```bash
SERVICE=$(resolve-service-path.sh "command-center")
REPO_PATH=$(echo $SERVICE | jq -r '.repo_path')
```

It's a **preflight guard** designed to prevent edits from landing in the wrong codebase.

---

## Weekly Maintenance

The service map should be updated whenever:
- A service repo moves to a new location
- LaunchAgent identifiers change
- Ownership changes
- Safe/dangerous edit classifications change

**Update the file:**
```bash
nano ~/.openclaw/workspace/config/service-map.json
```

**Test changes:**
```bash
bash ~/.openclaw/workspace/scripts/test-service-resolver.sh
```

**Commit:**
```bash
cd ~/.openclaw/workspace
git add config/service-map.json
git commit -m "Update service map: [what changed]"
```

---

## See Also

- **Service Map Data:** `config/service-map.json`
- **Resolver Script:** `scripts/resolve-service-path.sh`
- **Test Suite:** `scripts/test-service-resolver.sh`
- **Infrastructure Runbook:** `TOOLS.md`
- **Safety Boundaries:** `SOUL.md` (Protected Files section)

# Source-of-Truth Resolver for UI/Service Tasks — Implementation Plan

**Card ID:** `idea_1775801002644_fe99e657`  
**Score:** 8.7 (high leverage reliability improvement)  
**Effort:** Medium  
**Timeline:** 4–6 hours (Phase 1: MVP; Phase 2: integration)

---

## Problem Statement

**Current Issue:** Infrastructure edits frequently target the wrong codebase or service path.
- Example 1 (Apr 10): Game mode dashboard task initially tried to edit `/workspace/dashboard` instead of `/Users/hopenclaw/command-center/` (the actual Command Center repo)
- Example 2 (historical): Time lost editing wrong dashboard paths during prior service updates
- Root cause: No canonical reference mapping service names → repo paths, launch agents, URLs, and ownership

**Impact:** Rework, wasted debugging time, potential outages if edits hit staging/wrong location.

---

## Solution: Three-Layer Preflight System

### Layer 1: Canonical Service Map (Machine-Readable)
**File:** `~/.openclaw/workspace/config/service-map.json`

```json
{
  "services": {
    "command-center": {
      "name": "Command Center (Control UI)",
      "aliases": ["dashboard", "control-ui", "cc", "command center", "openclaw-control-ui"],
      "repo_path": "/Users/hopenclaw/command-center",
      "source_repo": "https://github.com/hopenclaw/command-center",
      "local_url": "http://localhost:3000",
      "public_url": "https://command-center.openclaw.ai",
      "launch_agent": "com.alfred.dashboard-nextjs",
      "owner": "Alfred",
      "port": 3000,
      "language": "TypeScript/Node.js",
      "docker": false
    },
    "gateway": {
      "name": "OpenClaw Gateway (Core)",
      "aliases": ["openclaw-gateway", "gateway", "core", "api-server"],
      "repo_path": "/Users/hopenclaw/.openclaw/gateway",
      "source_repo": "https://github.com/openclaw/gateway",
      "local_url": "http://localhost:18789",
      "public_url": "ws://remote-gateway.openclaw.ai:18789",
      "launch_agent": "com.alfred.gateway-core",
      "owner": "Joe (OpenClaw maintainer)",
      "port": 18789,
      "language": "Go",
      "docker": true,
      "restart_requires_approval": true
    },
    "workspace": {
      "name": "OpenClaw Workspace",
      "aliases": ["workspace", "home", "~"],
      "repo_path": "/Users/hopenclaw/.openclaw/workspace",
      "source_repo": "https://github.com/hopenclaw/workspace",
      "local_url": null,
      "public_url": null,
      "launch_agent": null,
      "owner": "Alfred",
      "port": null,
      "language": "Markdown/Shell/Config",
      "docker": false
    },
    "cron-scheduler": {
      "name": "Cron Scheduler (Background Jobs)",
      "aliases": ["cron", "scheduler", "jobs", "background-tasks"],
      "repo_path": "/Users/hopenclaw/.openclaw/gateway/cron",
      "source_repo": "https://github.com/openclaw/gateway",
      "local_url": "http://localhost:18789/api/cron",
      "public_url": null,
      "launch_agent": "com.alfred.gateway-core",
      "owner": "Alfred (manages job payload; Joe owns gateway)",
      "port": 18789,
      "language": "JSON (job definitions)",
      "docker": true
    },
    "sentinel": {
      "name": "Sentinel (Health Monitor)",
      "aliases": ["sentinel", "health-monitor", "self-heal"],
      "repo_path": "/Users/hopenclaw/.openclaw/workspace/scripts",
      "source_repo": "https://github.com/hopenclaw/workspace",
      "local_url": null,
      "public_url": null,
      "launch_agent": "com.alfred.sentinel",
      "owner": "Alfred",
      "port": null,
      "language": "Bash",
      "docker": false
    }
  },
  "preflight_rules": {
    "command-center": {
      "safe_edits": ["package.json", "src/", "tsconfig.json", "README.md"],
      "dangerous_edits": ["LaunchAgent", "gateway config", "workspace config"],
      "restart_command": "launchctl restart com.alfred.dashboard-nextjs",
      "rollback_command": "git checkout HEAD -- src/ && npm install && npm run build"
    }
  }
}
```

### Layer 2: Resolver Script
**File:** `~/.openclaw/workspace/scripts/resolve-service-path.sh`

**Usage:**
```bash
# Resolve exact paths and metadata
./resolve-service-path.sh "Command Center"
./resolve-service-path.sh "dashboard"
./resolve-service-path.sh "gateway"
./resolve-service-path.sh --json "cron"

# Output:
{
  "service": "command-center",
  "repo_path": "/Users/hopenclaw/command-center",
  "url": "http://localhost:3000",
  "launch_agent": "com.alfred.dashboard-nextjs",
  "language": "TypeScript",
  "owner": "Alfred"
}
```

**Implementation (shell):**
- Load `service-map.json`
- Match input phrase against `aliases` array (case-insensitive, fuzzy match as fallback)
- Return structured metadata as JSON or formatted text
- Fail loudly if ambiguous or no match found

### Layer 3: Preflight Hooks
**Files:** Scripts that use resolver before making edits

**Pattern 1: Preflight check in dashboard scripts**
```bash
#!/bin/bash
# Example: scripts/update-dashboard-feature.sh

SERVICE=$(./resolve-service-path.sh "command-center")
REPO_PATH=$(echo $SERVICE | jq -r '.repo_path')

# Verify we're in the right place
if [ ! -f "$REPO_PATH/package.json" ]; then
  echo "❌ ERROR: Command Center repo not found at $REPO_PATH"
  echo "Resolved path may be wrong. Run: ./resolve-service-path.sh command-center"
  exit 1
fi

cd "$REPO_PATH" || exit 1
# Now safe to edit
```

**Pattern 2: Pre-edit validation (dangerous edits)**
```bash
# Before editing gateway config
SERVICE=$(./resolve-service-path.sh "gateway")
REPO_PATH=$(echo $SERVICE | jq -r '.repo_path')
OWNER=$(echo $SERVICE | jq -r '.owner')

if [ "$OWNER" != "Joe" ]; then
  echo "⚠️  WARNING: Gateway is owned by $OWNER, not you"
  echo "This edit may require approval. Confirm with: /approve-gateway-edit"
  exit 1
fi
```

---

## Implementation Phases

### Phase 1: MVP (2–3 hours) — Core Resolver + Initial Map
**Deliverables:**
1. `config/service-map.json` with 5 core services (Command Center, Gateway, Workspace, Cron, Sentinel)
2. `scripts/resolve-service-path.sh` with fuzzy matching + JSON output
3. Validation tests (`scripts/test-service-resolver.sh`)
4. Documentation: `RESOLVER.md` (quick reference for using resolver in scripts)

**Testing:**
- Resolve 10 common service phrases: "dashboard", "gateway", "command-center", "cron", "workspace"
- Verify JSON output matches expected format
- Test fuzzy matching (typos, abbreviations)

**Integration:** No breaking changes; resolver is opt-in for new scripts.

### Phase 2: Hook Integration (2–3 hours) — Deploy Preflight Checks
**Scope:**
1. Add preflight check to 5 high-risk scripts:
   - `scripts/update-dashboard-feature.sh` (new wrapper)
   - `scripts/restart-cc.sh` (verify Command Center before restart)
   - `scripts/gateway-config.sh` (verify gateway before editing)
   - `scripts/cron-job-create.sh` (verify cron path before deployment)
   - `scripts/sentinel-playbook-update.sh` (verify workspace path)

2. Add ownership check + approval warning for Joe-owned services (Gateway)

3. Update all dashboard-related LaunchAgent restart scripts to use resolver first

**Integration:** Backward-compatible; existing scripts unchanged. New/modified scripts use resolver as guard.

### Phase 3: Documentation + Training (1 hour, async)
1. **`RESOLVER.md`** — Quick reference
   - When to use: before any infrastructure edit
   - How to use in scripts: copy-paste preflight pattern
   - Common mistakes: targeting wrong path, not verifying ownership

2. **Service Map Reference** — Published to Command Center docs page

3. **Cron Integration Example** — Show how cron job payloads use resolver if needed

---

## Success Criteria

| Criterion | How to Verify |
|-----------|---------------|
| **Canonical map exists** | `config/service-map.json` exists, contains 5+ services, validates as JSON |
| **Resolver script works** | `resolve-service-path.sh "dashboard"` outputs correct repo path in <1s |
| **Fuzzy matching works** | Typos like "comand-center", "dash", "cc" resolve correctly |
| **Dangerous edits warned** | Scripts targeting Gateway/LaunchAgent print approval warning before proceeding |
| **No false negatives** | Every common service phrase (dashboard, gateway, cron, etc.) resolves without error |
| **Documented** | RESOLVER.md exists; examples show how to add preflight to new scripts |
| **No breaking changes** | Existing scripts continue to work; new scripts opt-in to resolver |

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| **Resolver script bugs break editing** | Phase 1 includes comprehensive test suite; all preflight checks are guards, not blockers (scripts can override with --force if needed) |
| **Service map becomes stale** | Add comment in service-map.json: "Update whenever a service repo moves or launch agent changes"; include check in weekly maintenance cron |
| **Fuzzy matching too loose** | Require 85%+ similarity score; fail on ambiguous matches; manual list of aliases prevents false positives |
| **Ownership checks too strict** | Make warnings optional (--no-warning flag); Joe can override if necessary |

---

## Dependencies

- `jq` (JSON parsing) — already available
- Bash 4.0+ — already available
- No new external tools required

---

## File Manifest

**New files:**
- `config/service-map.json`
- `scripts/resolve-service-path.sh`
- `scripts/test-service-resolver.sh`
- `RESOLVER.md`

**Modified files:**
- `scripts/update-dashboard-feature.sh` (add preflight)
- `scripts/restart-cc.sh` (add preflight)
- `scripts/gateway-config.sh` (add preflight)
- `scripts/cron-job-create.sh` (add preflight)
- `scripts/sentinel-playbook-update.sh` (add preflight)

**Documentation updates:**
- Append resolver usage to `TOOLS.md`
- Link to `RESOLVER.md` in `AGENTS.md`

---

## Timeline & Execution

**Phase 1 (MVP):** 2–3 hours
- [ ] Create service-map.json with initial 5 services
- [ ] Write resolve-service-path.sh
- [ ] Test with 10 common phrases
- [ ] Write RESOLVER.md

**Phase 2 (Hooks):** 2–3 hours
- [ ] Add preflight to 5 high-risk scripts
- [ ] Test ownership checks
- [ ] Verify no breaking changes

**Phase 3 (Documentation):** 1 hour
- [ ] Update TOOLS.md + AGENTS.md with resolver link
- [ ] Publish service map to Command Center docs

**Estimated start:** Immediately after Joe approval  
**Estimated completion:** 5–7 hours (can split across two sessions if needed)

---

## Why Now?

1. **Immediate pain:** Apr 10 game mode edit, historical issues, ongoing repo confusion
2. **High leverage:** Prevents rework + potential outages; ~10 min upfront investment saves 2–3 hours per quarter
3. **Foundation for automation:** As service count grows, resolver becomes essential for reliable scripting
4. **Team scalability:** If/when other operators use OpenClaw, resolver is clear canonical reference

---

## Questions for Joe

1. **Additional services to include?** Currently maps: Command Center, Gateway, Workspace, Cron, Sentinel. Should we add: Discord bot, iMessage responder, or other services?
2. **Preflight strictness:** Should ownership warnings be errors (fail-hard) or alerts (warn-soft)? Current plan: warnings with --force override.
3. **Phase 2 priority:** Which 5 scripts are most critical? Current list: CC update, CC restart, gateway config, cron jobs, sentinel. Correct?


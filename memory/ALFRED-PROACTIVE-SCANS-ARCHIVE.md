

## Workflow Efficiency Scan — 2026-03-19

### Top repetitive patterns and concrete improvements

1. **Wrong-target edits when multiple dashboards exist (rework loop + context switching)**
   - **Pattern:** Work was first applied to `~/.openclaw/workspace/dashboard/index.html`, while the active Command Center Apps page is served from `/Users/hopenclaw/command-center/frontend/src/pages/Apps.tsx` + backend `/api/apps` route.
   - **Impact:** Duplicate implementation effort, delayed delivery, and unnecessary restart/debug cycles.
   - **Improvement proposal:** Add a preflight resolver script (`scripts/resolve-service-path.sh`) that maps service name → canonical repo path + launch agent + active port before any UI change. Make it mandatory for tasks mentioning "dashboard", "apps page", or "command center".
   - **Success metric:** Reduce wrong-repo edits for UI tasks to 0 over 30 days.

2. **Prototype apps repeatedly show offline due to missing runtime lifecycle automation**
   - **Pattern:** HST/GST prototype appeared in Apps list but showed offline because the service was not running and had no managed startup (manual npm install/start required).
   - **Impact:** Broken user trust in "Apps" status and repeated manual intervention every restart/session.
   - **Improvement proposal:** Create a managed LaunchAgent/service wrapper for prototypes (`com.alfred.prototype.<app>`), with healthcheck endpoint validation and auto-restart. Add a registration helper script that updates both LaunchAgent and `/api/apps` metadata in one step.
   - **Success metric:** Prototype uptime >95% during active hours and 0 manual restarts per week for registered prototype apps.

3. **Cross-origin preview failures on Apps page cause avoidable debugging churn**
   - **Pattern:** Inline preview failed (`chrome-error://chromewebdata` + origin mismatch) when app URL pointed to `http://localhost:3000` from Command Center origin.
   - **Impact:** User-facing friction and repeated troubleshooting despite app itself being functional.
   - **Improvement proposal:** Standardize prototype access via same-origin proxy route (`/apps/<id>`) as a policy: Apps registry only accepts relative URLs for prototypes, backend auto-proxies to local ports. Add validation check that rejects cross-origin prototype URLs at save/build time.
   - **Success metric:** 0 CORS/iframe preview failures for prototype cards over next 14 days.

### Recommended implementation order (highest ROI first)
1. Same-origin prototype URL policy + proxy validation (fastest user-facing stability win)
2. Prototype lifecycle automation via LaunchAgents (eliminates repeated offline state)
3. Service-path preflight resolver for UI tasks (prevents wrong-repo rework)


## Workflow Efficiency Scan — 2026-03-20

### Top repetitive patterns and concrete improvements

1. **Discord routing confusion between webhook IDs and channel IDs (delivery retry churn)**
   - **Pattern:** Status posts targeted webhook IDs as `channelId` through `message.send`, returning `Unknown Channel`; manual recovery required via webhook curl.
   - **Impact:** Failed mirrored updates, repeated retries, and operator context switching during routine status propagation.
   - **Improvement proposal:** add a `discord-target-normalize` preflight that classifies target as `{channel_id|webhook_url|webhook_id}` and chooses the correct transport automatically (`message` for channel IDs, webhook sender for webhook targets). Store canonical routing map with explicit `transport` per destination.
   - **Success metric:** 0 `Unknown Channel` failures for known routes over 14 days.

2. **HAL baseline/format requests are repeated with slight schema drift (manual formatting tax)**
   - **Pattern:** Multiple near-duplicate HAL requests for JSON baselines with different strict schemas caused repeated reformatting rather than reusable outputs.
   - **Impact:** Time spent re-authoring equivalent payloads; higher chance of inconsistent fields across messages.
   - **Improvement proposal:** create versioned response templates (`templates/hal-review-baseline.v1.json`, `v2-strict.json`) plus a tiny generator script to emit compliant one-line JSON by schema key.
   - **Success metric:** cut repeat baseline-response drafting time by 70% and eliminate schema mismatch follow-ups.

3. **Long research tasks can occupy main session unless explicitly delegated (throughput bottleneck)**
   - **Pattern:** Deep tasks (e.g., full video review + action plan) risk tying up the main thread unless delegation is proactively enforced.
   - **Impact:** Reduced responsiveness to new commands and slower parallel execution.
   - **Improvement proposal:** codify an execution gate: any task estimated >5 minutes or requiring external content extraction triggers `sessions_spawn` sub-agent by default, with main session limited to orchestration + final synthesis.
   - **Success metric:** maintain main-session response SLA (<30s initial ack) while running long analyses in parallel.

### Recommended implementation order (highest ROI first)
1. Discord target normalization + transport auto-selection
2. HAL JSON baseline template generator
3. Mandatory sub-agent gate for long-running analysis tasks

## Workflow Efficiency Scan — 2026-03-21

### Top repetitive patterns and concrete improvements

1. **Proactive discussion outputs are produced, but Discord delivery fails on target formatting (visibility gap)**
   - **Pattern:** Multiple high-value collaborative discussion summaries were completed, but `message.send` to Discord failed with `Unknown target` for `C0AH4QSA71T`.
   - **Impact:** Good analysis is written to memory files but not surfaced in the intended channel, reducing decision velocity and creating manual follow-up work.
   - **Improvement proposal:** implement a single delivery adapter (`scripts/post-discord-safe.sh`) with strict normalization:
     - accept alias/channel key input (`hal-completions`, `collab-discussion`)
     - resolve to canonical `channel:<id>`/provider-native target from a checked map
     - preflight with one lightweight validation call and fallback to queued Kanban comment artifact when unresolved
   - **Success metric:** 0 proactive delivery failures for known Discord destinations across 14 days.

2. **Insight capture is happening, but publish path is inconsistent (memory-only trap)**
   - **Pattern:** Completed scans/discussions are often persisted to `memory/*.md` after send failures, but no guaranteed second-stage publish/retry path exists.
   - **Impact:** Findings become discoverable only by manual file review; actionable recommendations may miss the board/discussion channel in real time.
   - **Improvement proposal:** add a publish queue (`.hal-alfred-tracking/publish-queue.jsonl`) with retry policy:
     - every proactive artifact writes `{title, destination, payload_path, retries, next_attempt_at}`
     - cron retry worker drains queue every 15 minutes
     - after N failures, auto-post condensed summary to Kanban Ideas/comment with `DELIVERY_BLOCKED` tag
   - **Success metric:** ≥95% of proactive artifacts reach an external destination or Kanban fallback within 1 hour.

3. **Workflow-scan recommendations recur without implementation handoff binding (execution leakage)**
   - **Pattern:** Similar recommendations (routing guards, dedupe, null-card hygiene, publish gating) appear repeatedly across scans, indicating weak conversion from analysis to owned implementation work.
   - **Impact:** Re-analysis cost accumulates while critical reliability fixes remain partially implemented.
   - **Improvement proposal:** enforce a “recommendation binding” rule for workflow scans:
     - each new scan must include exactly 1 `IMPLEMENT_NOW` item with owner, script/file target, validation command, and done condition
     - if a matching item already exists, scan must update status on that item instead of creating a new variant
     - maintain `workflow-efficiency-backlog.md` as canonical deduped list
   - **Success metric:** reduce repeated recommendation variants by 70% and increase scan-to-implementation conversion to ≥80% within 7 days.

### Recommended implementation order (highest ROI first)
1. Discord-safe delivery adapter + destination map normalization
2. Publish queue with automated retry/fallback to Kanban artifact
3. Recommendation binding rule + deduped workflow-efficiency backlog

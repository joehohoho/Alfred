# DISABLED-CRON-JOBS.md — Archived & Disabled Cron Configuration

**Last updated:** 2026-03-08 00:00 AST  
**Purpose:** Maintain clarity on why jobs are disabled and when to re-enable them.

---

## Active Cron Jobs (Currently Running — 9)

| Job Name | Schedule | Status | Purpose |
|----------|----------|--------|---------|
| healthcheck:security-audit | 0 9 * * 1 (Mon 9 AM) | ✅ ACTIVE | Weekly security audit |
| Moltbook Weekly Review | 0 9 * * 6 (Sat 9 AM) | ✅ ACTIVE | Weekly reflection + memory curation |
| Alfred Backup - Tier 3 (Full System Weekly) | 0 2 ? * SUN (Sun 2 AM) | ✅ ACTIVE | Full system backup weekly |
| Webhook Listener - Check for Answers | No schedule (systemEvent) | ✅ ACTIVE | Async question resolution |
| Log Rotation | 0 4 * * * (Daily 4 AM) | ✅ ACTIVE | Cron log cleanup |
| Joe Profile Reflection | 0 22 * * 0,3 (Sun/Wed 10 PM) | ✅ ACTIVE | Bi-weekly user model update |
| Session Checkpoint (Memory Continuity) | No schedule (systemEvent) | ✅ ACTIVE | Auto-checkpoint at 60%+ context |
| Kanban Idle Loop | 0 * * * * (Hourly) | ✅ ACTIVE | Idle-time work dispatch |
| Alfred ↔ HAL Daily Discussion | 0 9,20 * * * (9 AM, 8 PM daily) | ✅ ACTIVE | Daily perspective sync |

**Summary:** 9 jobs active, 12 disabled. Total: 21 configured.

---

## Disabled Cron Jobs (Currently Paused — 12)

### Critical (Should Be Re-enabled When Fixed)

#### 1. **Evening Routine** — CRITICAL
- **Disabled since:** ~2026-03-02 (recent)
- **Purpose:** Daily session-end summary, memory bridge, workspace commit
- **Why disabled:** Was auto-disabled due to ACTIVE-TASK.md write failure (tool error, not quiet hours). Re-enabled 2026-03-19.
- **Note:** Quiet hours do NOT mean stop working — just don't ping Joe directly. Evening Routine should run normally and post to Discord/dashboard.
- **Impact if missing:** Session continuity suffers; LAST-SESSION.md becomes stale
- **Priority:** 🔴 HIGH — This is the session bridge producer

#### 2. **HAL Idle Check & Dispatch** — CRITICAL
- **Disabled since:** ~2026-03-02 (recent)
- **Purpose:** Check if HAL should be dispatched to do work from Kanban
- **Why disabled:** Likely caused duplicate dispatches or queue lockup
- **Re-enable when:** (1) HAL dispatch deduplication is implemented, (2) Dispatch rate-limiting is added (max 1 HAL job per X minutes)
- **Impact if missing:** HAL not being dispatched automatically; Kanban work stalls
- **Priority:** 🔴 HIGH — This is the primary HAL orchestration mechanism

#### 3. **Nightly Git Commit** — IMPORTANT
- **Disabled since:** ~2026-03-02 (recent)
- **Purpose:** Automated daily workspace commit (memory, config, scripts updates)
- **Why disabled:** Likely interfered with manual commits or caused git state issues
- **Re-enable when:** (1) Conflict detection is added (check for uncommitted changes before attempting commit), (2) Rate-limit to once per day at 11 PM AST is enforced
- **Impact if missing:** Workspace changes not auto-committed; relies on manual git discipline
- **Priority:** 🟠 MEDIUM — Important for audit trail but not blocking

#### 4. **Daily Config & Memory Review** — IMPORTANT
- **Disabled since:** ~2026-02-20 (recent)
- **Purpose:** System health check: agents-size-guard.sh, SOUL/IDENTITY/USER/AGENTS consistency check
- **Why disabled:** Likely caused token waste on repetitive checks
- **Re-enable when:** (1) Intelligent diffing is added (only report if files changed), (2) Scheduled to lighter times (e.g., 7 AM instead of peak hours)
- **Impact if missing:** Manual size checks needed; subtle inconsistencies in core files may not be detected
- **Priority:** 🟠 MEDIUM — Useful but handled by HEARTBEAT.md Check 3 for now

---

### Informational (Lower Priority)

#### 5. **Morning Brief** — INFORMATIONAL
- **Disabled since:** ~2026-02-20
- **Purpose:** Daily morning summary posted to Discord
- **Why disabled:** Output quality issues or Joe didn't find value in timing
- **Re-enable when:** Joe requests it or morning schedule is clearer (8 AM AST)
- **Impact if missing:** Joe misses async summary; not critical
- **Priority:** 🟡 LOW

#### 6. **Daily Update Check** — INFORMATIONAL
- **Disabled since:** ~2026-02-20
- **Purpose:** Check for OpenClaw gateway updates
- **Why disabled:** Probably redundant with system monitoring
- **Re-enable when:** Version tracking becomes important or deployment is automated
- **Impact if missing:** Manual version checks required
- **Priority:** 🟡 LOW

#### 7. **Daily Goal Analysis** — UTILITY
- **Disabled since:** ~2026-02-20
- **Purpose:** Auto-mark goals completed if condition met
- **Why disabled:** Goals system may have changed; goals.json format may have shifted
- **Re-enable when:** Goals system is documented and actively used
- **Impact if missing:** Manual goal status updates required
- **Priority:** 🟡 LOW

#### 8. **Kanban Stale Assignment Check** — UTILITY
- **Disabled since:** ~2026-02-20
- **Purpose:** Detect stale Kanban assignments (cards stuck >7 days)
- **Why disabled:** Redundant with kanban-idle-loop.sh or causing noise
- **Re-enable when:** Stale detection is useful again or configured for low noise
- **Impact if missing:** Stale cards not automatically flagged
- **Priority:** 🟡 LOW

#### 9. **Alfred Backup - Tier 2 (GitHub Push Hourly)** — UTILITY
- **Disabled since:** ~2026-02-20
- **Purpose:** Hourly automated GitHub push backup (every hour)
- **Why disabled:** Too frequent; Tier 3 (weekly) + manual commits sufficient
- **Re-enable when:** High-frequency backup is needed (e.g., during active development)
- **Impact if missing:** Relies on Tier 3 weekly + manual commits
- **Priority:** 🟡 LOW

#### 10. **Weekly Wins & Impact Digest → Discord** — INFORMATIONAL
- **Disabled since:** ~2026-02-20
- **Purpose:** Weekly recap posted to Discord
- **Why disabled:** Probably script path issue or Joe didn't request it
- **Re-enable when:** Weekly summary is valuable and script is validated
- **Impact if missing:** No automatic weekly digest
- **Priority:** 🟡 LOW

#### 11. **OpenClaw Maintenance — Weekly Self-Heal** — UTILITY
- **Disabled since:** ~2026-02-09 (older)
- **Purpose:** Weekly system health/repair checks
- **Why disabled:** Script may have issues or maintenance is manual
- **Re-enable when:** Script is validated and scheduled for off-peak hours
- **Impact if missing:** Manual maintenance required
- **Priority:** 🟡 LOW

#### 12. **HAL Backup - State Snapshot** — UTILITY
- **Disabled since:** ~2026-02-20
- **Purpose:** HAL session state backup
- **Why disabled:** HAL state management may have changed
- **Re-enable when:** HAL multi-session state tracking is implemented
- **Impact if missing:** HAL state recovery is manual
- **Priority:** 🟡 LOW

---

## Recommendation: Next Steps

**Immediate (Week of Mar 8):**
- Re-enable & validate **Evening Routine** (with quiet-hours mute)
- Re-enable & validate **HAL Idle Check & Dispatch** (with deduplication)
- Test both in low-traffic hours (2 AM, 6 AM AST)

**Short-term (Week of Mar 15):**
- Re-enable **Nightly Git Commit** (with conflict detection)
- Re-enable **Daily Config & Memory Review** (with intelligent diffing, morning-only schedule)

**Medium-term (By Mar 31):**
- Re-evaluate informational jobs (Morning Brief, Weekly Digest) — keep or remove permanently
- Consolidate backup jobs (remove Tier 2 hourly if Tier 3 weekly is sufficient)

**Cleanup:**
- Delete permanently obsolete jobs from jobs.json (none identified yet)
- Document re-enable conditions in code comments (payload.notes or inline)

---

## Disabled Job Architecture Lessons

1. **Batch operations carefully** — Evening Routine + Daily Review can create cascades if run during peak hours
2. **Rate-limit automation** — HAL dispatch needs deduplication to prevent double-dispatches
3. **Quiet hours matter** — Schedule heavy operations for 2-6 AM AST, not peak times
4. **Validate before re-enabling** — Test in isolation before production re-enable

---

*This file is the source of truth for disabled job status. Update it when any job is re-enabled or permanently removed.*


## Infrastructure Improvements (Mar 31, 23:01 ADT)

### 1. Unified Cron Health Check
**Priority:** 1 (Week 1) | **Effort:** 2-3 hours | **Impact:** $3-5/month savings
**Description:** Add pre-flight gateway health check to kanban-idle-loop.sh. Ping OpenAI Codex before executing jobs. If dead: skip jobs this cycle. Prevents wasted tokens on failed auth attempts.
**Blockers:** None
**Related:** GAP 1.1 (no pre-execution health check)

### 2. Memory Deduplication + HAL Context Inheritance
**Priority:** 2 (Week 1-2) | **Effort:** 3-4 hours | **Impact:** $1-2/month savings + eliminate notification duplication
**Description:** Add `last_asked_date` tracking to pending questions. Create shared context file for HAL handoffs (current-task-context.json). Auto-skip pending questions <7 days old. Reduces HAL spawn token waste.
**Blockers:** None
**Related:** GAP 2.1, GAP 2.2, GAP 4.1

### 3. Notification Deduplication + Priority Queue
**Priority:** 3 (Week 2) | **Effort:** 2-3 hours | **Impact:** Reduce Discord noise, ensure critical alerts visible
**Description:** Add notification fingerprinting (hash-based duplicate detection). Implement priority levels (CRITICAL → STANDARD → OPTIONAL). Enforce quiet hours in router.
**Blockers:** None
**Related:** GAP 3.1, GAP 3.2

---

**Full Audit Report:** reports/alfred-infrastructure-audit-2026-03-31.md

## Signal App Monetization Strategy (Apr 1, 00:31 ADT)

**Recommendation:** Freemium + Premium Subscription ($9.99-14.99/month)

**Tier Structure:**
- **Free:** 5 signals/day, basic analysis, email delivery, 30-day history
- **Premium:** Unlimited signals, advanced analysis, push notifications, unlimited history, watchlist integration

**Pricing Rationale:** 
- $9.99-14.99 chosen for low friction (coffee budget, psychological threshold)
- Crypto traders expect $10-20/month signal services
- TradingView benchmark: Pro tier at $14.95/month (we're competitive)

**Revenue Projections:**
- Conservative: $2.4K Year 1 (20 premium users)
- Mid-range: $10K Year 1 (80 premium users, 4% conversion)
- Optimistic + B2B: $15.6K-26.4K Year 1

**B2B API (Future - Month 6+):** $499+/month for institutional customers

**Implementation:**
1. Phase 1 (Month 1-2): MVP freemium + $9.99 tier, Stripe integration
2. Phase 2 (Month 3-4): Push notifications, advanced analysis
3. Phase 3 (Month 5-6): B2B API exploration
4. Phase 4 (Month 7-12): Scaling (referral program, community)

**Next Steps:**
1. Survey 10-20 crypto traders on $9.99/month willingness
2. Optimize free tier ceiling (signals/day for max viral growth)
3. Build Stripe integration (1 week)
4. Launch MVP (2 weeks)

**Full Report:** reports/signal-app-monetization-2026-04-01.md (10.6 KB)

---

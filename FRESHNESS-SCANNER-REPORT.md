# Knowledge Freshness Scanner Report

Generated: 2026-04-11T20:03:41.431Z

## Summary

- **Total artifacts scanned:** 148
- **Stale artifacts:** 4
- **Potentially superseded:** 2
- **Topics with contradictions:** 3
- **Refresh queue items:** 7

## Stale Artifacts (4)

| Artifact | Category | Age | Threshold | Stale By |
|----------|----------|-----|-----------|----------|
| SIGNAL-APP-MONETIZATION-ANALYSIS.md | proactive_scan | 34d | 14d | 20d |
| signal-app-research.md | signal_research | 41d | 21d | 20d |
| COINUSUP-GROWTH-ANALYSIS-2026-03-18.md | growth_audit | 24d | 14d | 10d |
| PORTFOLIO-SNAPSHOT-2026-04-02.md | portfolio_snapshot | 9d | 7d | 2d |

## Potentially Superseded Artifacts (2)

Newer artifacts likely replace older ones:

| Older Artifact | Newer Artifact | Category | Age Diff | Recommendation |
|---|---|---|---|---|
| PORTFOLIO-SNAPSHOT-2026-04-02.md<br/>(_2026-04-02_) | PORTFOLIO-SNAPSHOT-2026-04-11.md<br/>(_2026-04-11_) | portfolio_snapshot | 9d | Archive older |
| SIGNAL-APP-MONETIZATION-ANALYSIS.md<br/>(_2026-03-07_) | passive-income-portfolio-review-2026-04-03.md<br/>(_2026-04-03_) | proactive_scan | 27d | Archive older |

## Contradictions Detected (3)

Topics with multiple conflicting recommendations:

### Signal App Strategy

**Conflicting artifacts:** SIGNAL-APP-MONETIZATION-ANALYSIS.md, SIGNAL-APP-PHASE1-PLAN.md, signal-app-monetization-2026-04-03.md, signal-app-research.md

**Recommendation:** Review for conflicting recommendations; consolidate into single canonical version

### CoinUsUp Growth

**Conflicting artifacts:** 2026-03-31-coinusup-growth-audit.md, 2026-04-03-coinusup-growth-audit.md, COINUSUP-CONTENT-HUB-COMPLETION.md, COINUSUP-GROWTH-ANALYSIS-2026-03-18.md, INDEX-COINUSUP-CONTENT-HUB.md, coinusup-content-hub-research.md

**Recommendation:** Review for conflicting recommendations; consolidate into single canonical version

### Even Us Up Roadmap

**Conflicting artifacts:** 2026-03-21-even-us-up-completion.md, 2026-03-21-even-us-up-discovery.md, 2026-04-03-even-us-up-growth-audit.md

**Recommendation:** Review for conflicting recommendations; consolidate into single canonical version


## Refresh Queue (7 items)

Prioritized work items to restore knowledge freshness:

### Priority 1: CRITICAL (2 items)

**1. REFRESH_STALE**

- **Artifact:** COINUSUP-GROWTH-ANALYSIS-2026-03-18.md
- **Reason:** growth_audit stale for 10 days (threshold: 14d)
- **Action:** Re-audit and refresh COINUSUP-GROWTH-ANALYSIS-2026-03-18.md

**2. REFRESH_STALE**

- **Artifact:** PORTFOLIO-SNAPSHOT-2026-04-02.md
- **Reason:** portfolio_snapshot stale for 2 days (threshold: 7d)
- **Action:** Re-audit and refresh PORTFOLIO-SNAPSHOT-2026-04-02.md

### Priority 2: HIGH (2 items)

**1. REVIEW_SUPERSESSION**

- **Artifact:** PORTFOLIO-SNAPSHOT-2026-04-02.md
- **Newer Version:** PORTFOLIO-SNAPSHOT-2026-04-11.md
- **Reason:** PORTFOLIO-SNAPSHOT-2026-04-11.md (9d newer) likely supersedes PORTFOLIO-SNAPSHOT-2026-04-02.md
- **Action:** Verify if PORTFOLIO-SNAPSHOT-2026-04-11.md replaces PORTFOLIO-SNAPSHOT-2026-04-02.md; archive if confirmed

**2. REVIEW_SUPERSESSION**

- **Artifact:** SIGNAL-APP-MONETIZATION-ANALYSIS.md
- **Newer Version:** passive-income-portfolio-review-2026-04-03.md
- **Reason:** passive-income-portfolio-review-2026-04-03.md (27d newer) likely supersedes SIGNAL-APP-MONETIZATION-ANALYSIS.md
- **Action:** Verify if passive-income-portfolio-review-2026-04-03.md replaces SIGNAL-APP-MONETIZATION-ANALYSIS.md; archive if confirmed

### Priority 3: MEDIUM (3 items)

**1. RESOLVE_CONTRADICTION**

- **Artifact:** Signal App Strategy
- **Related Artifacts:** SIGNAL-APP-MONETIZATION-ANALYSIS.md, SIGNAL-APP-PHASE1-PLAN.md, signal-app-monetization-2026-04-03.md, signal-app-research.md
- **Reason:** Review for conflicting recommendations; consolidate into single canonical version
- **Action:** Consolidate 4 artifacts into single canonical recommendation

**2. RESOLVE_CONTRADICTION**

- **Artifact:** CoinUsUp Growth
- **Related Artifacts:** 2026-03-31-coinusup-growth-audit.md, 2026-04-03-coinusup-growth-audit.md, COINUSUP-CONTENT-HUB-COMPLETION.md, COINUSUP-GROWTH-ANALYSIS-2026-03-18.md, INDEX-COINUSUP-CONTENT-HUB.md, coinusup-content-hub-research.md
- **Reason:** Review for conflicting recommendations; consolidate into single canonical version
- **Action:** Consolidate 6 artifacts into single canonical recommendation

**3. RESOLVE_CONTRADICTION**

- **Artifact:** Even Us Up Roadmap
- **Related Artifacts:** 2026-03-21-even-us-up-completion.md, 2026-03-21-even-us-up-discovery.md, 2026-04-03-even-us-up-growth-audit.md
- **Reason:** Review for conflicting recommendations; consolidate into single canonical version
- **Action:** Consolidate 3 artifacts into single canonical recommendation

## Implementation Notes

1. **Stale artifacts** — These are older than their freshness threshold. Re-audit to confirm recommendations still hold or have changed.
2. **Superseded artifacts** — Newer versions exist in the same category. Verify the newer one captures all important insights from the older; archive if confirmed.
3. **Contradictions** — Multiple artifacts recommend conflicting strategies for the same topic. Consolidate into a single canonical recommendation.
4. **Refresh queue** — Prioritized work to restore knowledge freshness. Start with Priority 1 items.


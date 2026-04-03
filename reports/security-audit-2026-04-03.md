# Security Audit Report — April 3, 2026

**Scope:** CoinUsUp, Even Us Up (Expense_Sharing)  
**Run Date:** 2026-04-03 19:25 ADT  
**Auditor:** Alfred (automated)

---

## Executive Summary

**Status:** ⚠️ **11 high-severity vulnerabilities found across 2 projects**

- **CoinUsUp:** 11 high vulns (0 critical)
- **Even Us Up:** 11 total vulns (9 high, 2 moderate, 0 critical)
- **Secret Exposure:** ✅ None detected (env vars properly used)
- **Hardcoded Credentials:** ✅ None detected

**Recommendation:** Fix CoinUsUp vulnerabilities within 2 weeks (blocking production issues). Even Us Up moderates can wait 4 weeks.

---

## Detailed Findings

### CoinUsUp — 11 High Vulnerabilities

| Package | Issue | Severity | Fix |
|---------|-------|----------|-----|
| `@xmldom/xmldom` < 0.8.12 | XML injection via unsafe CDATA | High | `npm audit fix --force` (breaking: updates @capacitor/assets) |
| `lodash` ≤ 4.17.23 | Code injection via `_.template`; Prototype Pollution | High | `npm audit fix` |
| `serialize-javascript` ≤ 7.0.4 | RCE via RegExp.flags; CPU DoS | High | `npm audit fix --force` (breaking: updates vite-plugin-pwa) |
| `tar` ≤ 7.5.10 | Arbitrary file create/overwrite; hardlink/symlink attacks | High | `npm audit fix` |

**Root Chain:**
- `@xmldom/xmldom` → `@trapezedev/project` → `@capacitor/assets`
- `serialize-javascript` → `@rollup/plugin-terser` → `workbox-build` → `vite-plugin-pwa`
- `lodash` → used directly by build & runtime

**Impact:** XML/serialization injection can lead to RCE if untrusted XML/JS objects are processed. File traversal in `tar` affects build/deployment pipelines.

### Even Us Up — 11 Vulnerabilities (9 High, 2 Moderate)

| Package | Issue | Severity |
|---------|-------|----------|
| Same as CoinUsUp (inherited) | Same | High |
| 2 additional moderate (unknown package) | Lower priority | Moderate |

---

## Recommended Action Plan

### Phase 1: Immediate (This Week)
1. **CoinUsUp:**
   ```bash
   cd CoinUsUp
   npm audit fix --force  # Updates breaking changes
   npm test                # Verify no regressions
   ```
   - Expect: `@capacitor/assets` version bump, `vite-plugin-pwa` update
   - Risk: Low (these are dev/build deps, not runtime-critical)

2. **Even Us Up:** Same steps

### Phase 2: Testing (Next 2 days)
- Run full test suite for both apps
- Manual spot-check: app launch, builds, core flows
- Deploy to staging (if available) for final validation

### Phase 3: Deploy (By April 10)
- Push fixes to GitHub
- Update production builds
- Monitor for any issues post-deploy

---

## Other Findings

✅ **No hardcoded secrets detected** — All API keys use `import.meta.env` or env var injection  
✅ **No exposed credentials in git** — Clean checkout  
⚠️ **Dependency bloat:** Consider auditing indirect deps (Capacitor ecosystem pulls ~500 packages)

---

## Prevention Going Forward

1. **Add to CI:** `npm audit` step in GitHub Actions (fail on high+)
2. **Automated updates:** Dependabot or npm audit fix (monthly)
3. **Runtime scanning:** Consider OWASP Dependency Check for production builds

---

**Next Review:** April 10, 2026 (post-fix verification)

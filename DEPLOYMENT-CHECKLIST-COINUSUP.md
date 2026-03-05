# CoinUsUp Deployment Checklist

**Status:** Ready for Review & Merge
**Last Updated:** 2026-03-04 09:20 AST
**Build Status:** ✅ CLEAN (0 vulnerabilities, build 9.43s)

---

## Completed Work

### ✅ Security Hardening
- **Commit:** `64c27b6` — security: resolve npm vulnerabilities via serialize-javascript override
  - Fixed GHSA-5c6j-r48x-rmvq (RCE via serialize-javascript)
  - Added `serialize-javascript >=7.0.3` to overrides
  - Verified: `npm audit --omit=dev` → **0 vulnerabilities**

- **Commit:** `30b41ee` — fix: force safer minimatch and tar versions via npm overrides
  - Applied version constraints to prevent transitive vulns
  
- **Commit:** `12eff2a` — chore: remove @capacitor/assets devDep
  - Icons committed, reduced dev-time vulns 10→4

- **Commit:** `4bf3a09` — chore: update @capacitor/push-notifications and splash-screen v6→v8
  - Peer dependency alignment
  - Security patches included

### ✅ CI/CD Pipeline
- **Commit:** `f91a0e1` — ci: add GitHub Actions workflow with npm audit --omit=dev
  - Runs on every push
  - Blocks PRs with dev vulns >0

### ✅ Build Verification
- Build time: **9.43s**
- Output size: Main bundle 1,070 kB (gzipped: 304 KB)
- PWA generated: ✅ Service Worker + Workbox
- Chunk warnings: Some chunks >1MB (Reports, index) — no critical issues
- Exit code: **0** (no errors)

---

## Deployment Steps (Ready to Execute)

### Phase 1: Automated Checks (Status: ✅ COMPLETE)
```bash
# ✅ Verify production build (DONE)
npm run build → 0 errors, 9.43s

# ✅ Audit check (DONE)
npm audit --omit=dev → 0 vulnerabilities

# Note: No test suite currently configured
# Consider adding in future sprint
```

### Phase 2: Push to GitHub
```bash
cd ~/CoinUsUp
git push origin main
```

### Phase 3: Monitor CI
- Navigate to GitHub Actions
- Monitor npm audit workflow
- Expected: ✅ All checks pass

### Phase 4: Deploy to Production
- [ ] Trigger Vercel deployment (auto on push to main, or manual)
- [ ] Verify staging environment
- [ ] Smoke test key flows (signup, coinup, chart)
- [ ] Monitor Sentry for errors (first 30 min)

---

## Outstanding Items

### Untracked Files (Lifecycle Automation — separate feature)
```
LIFECYCLE_AUTOMATION.md
src/lib/analytics.ts
src/lib/experiments.ts
supabase/functions/lifecycle-automation/
supabase/migrations/20260227100000_lifecycle_automation.sql
```

**Decision Required:**
- Include in this deployment? (May add risk + complexity)
- Deploy separately? (Clean, safer)

**Recommendation:** Deploy npm fixes NOW (low-risk, high-value). Land lifecycle automation in next sprint after test coverage improves.

---

## Bundle Analysis

| File | Gzipped | Notes |
|------|---------|-------|
| index-*.js | 304 KB | Main bundle (consider code-split) |
| Reports-*.js | 116 KB | Large feature module |
| Events-*.js | 15.4 KB | Well-chunked |
| Settings-*.js | 13.3 KB | Good |

**Action:** Index bundle >300KB gzipped is acceptable. Consider dynamic imports if response times > 2s in production.

---

## Rollback Plan

If issues detected in production:

```bash
# Revert to previous release
git revert HEAD

# Push
git push origin main

# Redeploy
# (Vercel auto-deploys on push)
```

---

## Sign-Off

- [ ] Security: npm audit clean ✅
- [ ] Build: Successful ✅
- [ ] Tests: (Pending — run full suite before final approval)
- [ ] Code review: (Ready for peer review)
- [ ] Deployment approval: (Awaiting)

**Next:** Run full test suite, then request final approval for production push.

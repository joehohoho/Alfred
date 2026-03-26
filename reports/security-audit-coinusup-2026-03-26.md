# CoinUsUp Security Audit — March 26, 2026

## Executive Summary
**Critical Risk: HIGH** — 9 high-severity vulnerabilities found in dependency chain
**Moderate Risk: MEDIUM** — 12 moderate-severity vulnerabilities
**Auto-Fix Available: Partial** — 12 of 21 can be fixed with `npm audit fix`; 9 require manual intervention

---

## Vulnerability Breakdown

### High-Severity Issues (9 total)

1. **flatted (RCE + Prototype Pollution)**
   - **CVE:** GHSA-25h7-pfq9-p65f, GHSA-rf6f-7fwh-wjgh
   - **Impact:** Remote Code Execution + prototype pollution in parse() phase
   - **Fix:** `npm audit fix` (available)
   - **Priority:** 🚨 CRITICAL — RCE in serialization library

2. **picomatch (ReDoS + Method Injection)**
   - **CVE:** GHSA-c2c7-rcm5-vvqj, GHSA-3v7f-55p6-f55p
   - **Impact:** Regular Expression Denial of Service; method injection in POSIX character classes
   - **Affected:** vite, @rollup/pluginutils, tinyglobby
   - **Fix:** `npm audit fix` (available)
   - **Priority:** 🔴 HIGH — Build toolchain exposure

3. **serialize-javascript (RCE)**
   - **CVE:** GHSA-5c6j-r48x-rmvq
   - **Impact:** RCE via RegExp.flags and Date.prototype.toISOString()
   - **Affected:** @rollup/plugin-terser → vite-plugin-pwa
   - **Fix:** `npm audit fix --force` (breaking change to vite-plugin-pwa@0.19.8)
   - **Priority:** 🚨 CRITICAL — RCE in build dependencies

4. **tar (Hardlink/Symlink Traversal)**
   - **CVEs:** GHSA-34x7-hfp2-rc4v, GHSA-8qq5-rm4j-mr97, GHSA-83g3-92jg-28cx, GHSA-qffp-2rhf-9h96, GHSA-9ppj-qmqm-q256, GHSA-r6q2-hw4h-h46w
   - **Impact:** Arbitrary file read/write, symlink poisoning, race conditions
   - **Affected:** @capacitor/cli, @capacitor/assets
   - **Fix:** ❌ NO FIX AVAILABLE — locked by Capacitor v8 dependency
   - **Priority:** 🔴 HIGH — File system traversal (dev-time only, but serious)

### Moderate-Severity Issues (12 total)

- **brace-expansion:** Zero-step sequence DoS (memory exhaustion)
  - **Fix:** Partial; `--force` required (breaks vite-plugin-pwa)
  - **Chain:** ESLint → brace-expansion → minimatch → filelist → jake → ejs → workbox

---

## Risk Assessment by Layer

| Layer | Risk | Severity | Mitigation |
|-------|------|----------|-----------|
| **Runtime (production)** | flatted, serialize-javascript | HIGH | Update dependencies; test serialization |
| **Build toolchain** | picomatch, tar (Capacitor) | HIGH | Limit build in isolated containers; audit source |
| **Dev dependencies** | brace-expansion, ESLint chain | MODERATE | `npm audit fix` safe for dev-only |

---

## Recommended Actions (Priority Order)

### 1. **Immediate (Today)**
```bash
# Safely fix 12 moderate + flatted/picomatch
cd CoinUsUp && npm audit fix
# Then test build
npm run build
```
**Risk:** Low — only affects ESLint/build tooling

### 2. **Short-term (This Week)**
```bash
# Force-fix serialize-javascript (vite-plugin-pwa breaking change)
npm audit fix --force
# Test PWA functionality, offline mode, asset caching
npm run test
# Verify on real device if possible
```
**Risk:** MEDIUM — vite-plugin-pwa may have breaking changes; requires testing

### 3. **Medium-term (Escalate to Joe)**
- **tar/Capacitor issue:** No fix available in Capacitor v8. Options:
  1. Wait for Capacitor v9 (if available)
  2. Pin tar version and audit source manually
  3. Switch to different mobile framework (last resort)
- **Recommendation:** Monitor Capacitor releases; escalate if moving to production native

---

## Files Requiring Attention

```
node_modules/flatted                  — RCE in serialization
node_modules/picomatch               — ReDoS in glob matching
node_modules/serialize-javascript    — RCE in terser plugin
node_modules/tar                     — File system traversal (Capacitor)
node_modules/@capacitor/cli/tar      — Symlink poisoning
```

---

## Testing Checklist After Fix

- [ ] `npm run build` completes without errors
- [ ] `npm run test` passes (if tests exist)
- [ ] Donation serialization works (flatted)
- [ ] File uploads work (tar-related)
- [ ] PWA offline mode works (if breaking change in vite-plugin-pwa)
- [ ] Stripe subscription serialization works

---

## Next Session: Implement Fixes

This report is ready for Joe review. Recommend:
1. Run `npm audit fix` today (low risk)
2. Schedule `npm audit fix --force` with testing window
3. Escalate Capacitor tar issue if production mobile is planned

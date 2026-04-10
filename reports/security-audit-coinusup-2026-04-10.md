# Security Audit: CoinUsUp (2026-04-10)

## Executive Summary
**Status:** ⚠️ **Critical** — 4 high-severity CVEs in dependencies requiring immediate patching. No secrets found in codebase.

---

## 🔴 High-Severity Vulnerabilities (4)

### 1. **Vite Path Traversal & WebSocket RCE** (vite 7.0.0–7.3.1)
- **CVE:** GHSA-4w7w-66w2-5vf9, GHSA-v2wj-q39q-566r, GHSA-p9ff-h696-f583
- **Impact:** Arbitrary file read, dev server bypass, path traversal in optimized deps
- **Fix:** `npm install vite@^7.4.0`
- **Action:** CRITICAL — Update immediately (dev dependency, but used in build pipeline)

### 2. **XML Injection via @xmldom** (<0.8.12)
- **CVE:** GHSA-wh4c-j3r5-mjhp
- **Impact:** Unsafe CDATA serialization allows attacker-controlled markup insertion
- **Current:** Used transitively via @capacitor/assets
- **Fix:** `npm install @capacitor/assets@^3.0.5` (breaking change, requires testing)
- **Action:** Update, test iOS/Android builds

### 3. **Node-tar Path Traversal & Symlink Poisoning** (tar ≤7.5.10)
- **CVE:** GHSA-34x7-hfp2-rc4v, GHSA-8qq5-rm4j-mr97, GHSA-83g3-92jg-28cx, GHSA-qffp-2rhf-9h96, GHSA-9ppj-qmqm-q256, GHSA-r6q2-hw4h-h46w
- **Impact:** Arbitrary file creation/overwrite, hardlink path traversal, race conditions
- **Current:** Transitive via @capacitor/cli (≤7.4.5 / 8.0–8.0.2-nightly)
- **Fix:** Update @capacitor/cli to patched version
- **Action:** Check Capacitor release notes; may require major version bump

### 4. **Serialize-JavaScript RCE & DoS** (serialize-javascript ≤7.0.4)
- **CVE:** GHSA-5c6j-r48x-rmvq, GHSA-qj8w-gfj5-8c6v
- **Impact:** Remote code execution via crafted objects, CPU exhaustion
- **Current:** Transitive via @rollup/plugin-terser (0.2–0.4.4)
- **Fix:** Update terser plugin, then serialize-javascript
- **Action:** Update build dependencies

---

## 🟡 Moderate Severity (1)

### 5. **xml2js Prototype Pollution** (<0.5.0)
- **CVE:** GHSA-776f-qx25-q3cc
- **Impact:** Prototype pollution attack possible
- **Current:** Transitive via @capacitor/cli
- **Fix:** Resolve when Capacitor is updated

---

## ✅ Security Positives

- **No hardcoded secrets** in source code — all APIs use `VITE_*` environment variables
- **No secret commits** in git history
- **Proper `.gitignore`** — build artifacts excluded
- **React 19 & modern deps** — most libraries are current versions

---

## Recommended Action Plan

### Phase 1 (Immediate — Today)
1. Update Vite to ^7.4.0
2. Run `npm install` and test dev server
3. Commit: "Security: Update Vite to patch RCE/path traversal CVEs"

### Phase 2 (This Week)
1. Update @capacitor/assets to ^3.0.5
2. Test iOS build (`npm run cap:open:ios`)
3. Test Android build (`npm run cap:open:android`)
4. Commit: "Security: Update Capacitor assets to patch XML injection & tar CVEs"

### Phase 3 (Follow-up)
1. Monitor Capacitor CLI releases for patches to tar/xml2js
2. Set up `npm audit` check in CI/CD
3. Enable Dependabot alerts in GitHub

---

## Testing Checklist
- [ ] Dev server starts without errors
- [ ] iOS app builds and runs
- [ ] Android app builds and runs
- [ ] No new console warnings/errors
- [ ] `npm audit` shows no high-severity issues after updates

---

## Notes
- Capacitor transitivity makes some CVEs harder to patch (depends on their release schedule)
- Recommend upgrading to latest Capacitor major version when available
- No security regression expected from updates (all patch/minor version bumps)

**Generated:** 2026-04-10 19:28 ADT

# CoinUsUp Security Audit — 2026-04-13

## Summary
**Status:** 13 vulnerabilities identified (12 high-severity, 1 moderate)  
**Risk Level:** HIGH — Most are build-time/dev-only but some could affect production if not mitigated  
**Recommendation:** Address high-severity CVEs in next maintenance window

---

## Critical Vulnerabilities (12 High-Severity)

### 1. **@xmldom/xmldom** < 0.8.12
- **CVE:** GHSA-wh4c-j3r5-mjhp
- **Risk:** XML injection via unsafe CDATA serialization
- **Impact:** Potential attacker-controlled markup insertion
- **Fix:** `npm audit fix --force` (note: breaks @capacitor/assets to 3.0.5)
- **Status:** ACTIONABLE

### 2. **semver** 7.0.0–7.5.1
- **CVE:** GHSA-c2qf-rxjj-qqgw
- **Risk:** Regular Expression Denial of Service (ReDoS)
- **Impact:** Potential DoS on version parsing
- **Dependency Chain:** simple-update-notifier → nodemon (dev-only)
- **Fix:** `npm audit fix`
- **Status:** ACTIONABLE

### 3. **serialize-javascript** ≤ 7.0.4
- **CVE:** GHSA-5c6j-r48x-rmvq, GHSA-qj8w-gfj5-8c6v
- **Risks:** RCE via RegExp.flags, CPU Exhaustion DoS
- **Dependency Chain:** @rollup/plugin-terser → workbox-build
- **Fix:** `npm audit fix`
- **Status:** ACTIONABLE

### 4. **sharp** < 0.32.6
- **CVE:** GHSA-54xq-cgqr-rpm3 (CVE-2023-4863)
- **Risk:** libwebp vulnerability
- **Impact:** Image processing vulnerability (not directly exposed if images come from trusted sources)
- **Fix:** `npm audit fix --force` (breaks @capacitor/assets)
- **Status:** ACTIONABLE (lower priority if images are trusted)

### 5. **tar** ≤ 7.5.10 (6 CVEs)
- **CVEs:** GHSA-34x7-hfp2-rc4v, GHSA-8qq5-rm4j-mr97, GHSA-83g3-92jg-28cx, GHSA-qffp-2rhf-9h96, GHSA-9ppj-qmqm-q256, GHSA-r6q2-hw4h-h46w
- **Risks:** File traversal, symlink poisoning, race conditions
- **Impact:** Potential arbitrary file read/write during extraction
- **Dependency Chain:** @capacitor/cli
- **Fix:** `npm audit fix --force` (breaks @capacitor/assets)
- **Status:** ACTIONABLE (but breaks build tools)

### 6. **xml2js** < 0.5.0
- **CVE:** GHSA-776f-qx25-q3cc
- **Risk:** Prototype pollution
- **Impact:** Potential object manipulation attacks
- **Fix:** `npm audit fix --force` (breaks @capacitor/assets)
- **Status:** ACTIONABLE

---

## Moderate Vulnerabilities (1)

### 7. **xml2js** < 0.5.0 (also moderate)
- Already listed above under High

---

## Secondary Issues

### Peer Dependency Conflict
- **Issue:** vite@8.0.8 conflicts with @vitejs/plugin-react-swc@4.2.3 (expects ^4–7)
- **Impact:** May cause unpredictable builds or missing optimizations
- **Fix:** Downgrade Vite to 7.x OR update build plugins
- **Status:** MEDIUM-PRIORITY

---

## Secrets Scan
✅ **PASSED** — No exposed API keys, private keys, or auth tokens found in git history

---

## Recommendations (Priority Order)

1. **Immediate (Next Release):**
   - [ ] Run `npm audit fix --force` to auto-patch semver, serialize-javascript (low-risk)
   - [ ] Test build + deploy to catch any breaking changes

2. **Next Maintenance Window:**
   - [ ] Address @capacitor/* version conflicts (impacts sharp, tar, xml2js fixes)
   - [ ] Consider migrating away from @capacitor if possible (these deps are fragile)
   - [ ] Update Vite to 7.x to match @vitejs/plugin-react-swc expectations

3. **Future:**
   - [ ] Switch to maintained image/archive libraries if @capacitor remains problematic
   - [ ] Set up automated weekly `npm audit` checks in CI/CD

---

## Notes
- **Build-time risk:** Most vulnerabilities are in dev dependencies (nodemon, @capacitor/cli, workbox)
- **Production risk:** Lower if the app doesn't process untrusted archive/image files
- **Mitigation:** If audits fail CI, add exceptions for proven safe transitive deps after vetting

---

**Scanned:** 2026-04-13 22:36 AST  
**Workspace:** ~/.openclaw/workspace/CoinUsUp

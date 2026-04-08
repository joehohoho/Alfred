# CoinUsUp Security Scan - 2026-04-08

## Scope
Focused idle security scan of `CoinUsUp` covering:
- `npm audit` dependency vulnerabilities
- quick secret-pattern grep for exposed credentials
- low-risk remediation feasibility check

## Summary
Result: **No obvious hardcoded secrets found** in app source from a quick pattern scan.

Result: **14 dependency vulnerabilities** were reported by `npm audit`:
- **13 high**
- **1 moderate**

Most of the high-severity findings are concentrated in two buckets:
1. **Vite dev server/tooling**
2. **Capacitor asset/CLI toolchain**

## Key findings

### 1) Vite is in a vulnerable range
Current declared version:
- `vite: ^7.2.6`

`npm audit` flagged Vite issues including:
- dev server path traversal / file read class issues
- `server.fs.deny` bypass issue

Audit range affected:
- `>=7.0.0 <=7.3.1`

Why it matters:
- Primarily impacts local/dev exposure, but still worth fixing because Vite often runs during development and can leak files if exposed beyond localhost or proxied poorly.

### 2) Capacitor assets / CLI chain pulls multiple high issues
Current declared versions include:
- `@capacitor/assets: ^1.0.0`
- `@capacitor/cli: ^8.1.0`

Audit tied the high findings to:
- `@capacitor/assets`
- `@capacitor/cli`
- `@capacitor/project`
- `@xmldom/xmldom`
- `tar`
- `xml2js`
- transitive `sharp`

Likely impact:
- mostly developer/build-time supply-chain surface rather than production runtime, but still technical debt and avoidable risk.

### 3) Additional tooling vulnerabilities
Transitive issues also included:
- `serialize-javascript`
- `@rollup/plugin-terser`
- `workbox-build`
- `simple-update-notifier`
- `semver`
- `nodemon`

These look tooling-related rather than end-user runtime issues.

## Secret scan result
A quick grep for common key patterns did **not** reveal obvious exposed secrets in tracked source files.

Caveat:
- this was a heuristic scan, not a full entropy-based secret scan
- `.env*` files were included in the filename search pattern, but no obvious matching secrets were returned by the grep used

## Attempted remediation
I attempted a safe direct package upgrade path:
- upgrade `vite`
- upgrade `@capacitor/assets`

That was **not safely completable** in this idle pass because the repo currently has:
- substantial unrelated uncommitted changes
- dependency resolution conflicts already present in the toolchain

Notable blockers encountered:
- `vite-plugin-pwa@0.19.8` peer range does not cleanly accept the newer Vite line
- `eslint-plugin-react-hooks@5.2.0` conflicts with `eslint@10.0.2`

Because of that, a direct upgrade risks mixing security work with unrelated feature work and causing breakage in an already-dirty repo.

## Recommended next fixes

### Safe next move
Create a dedicated cleanup branch/session for dependency hygiene in `CoinUsUp`, then:
1. update `vite` to a non-vulnerable release
2. update or replace `vite-plugin-pwa` so peer deps align
3. update `@capacitor/assets` to `3.0.5` or current compatible secure release
4. re-run `npm audit`
5. smoke test build and dev server

### Suggested priority order
1. **Vite**
2. **Capacitor assets/CLI chain**
3. remaining transitive tooling vulnerabilities

## Practical risk assessment
- **Immediate production-user risk:** probably low to moderate
- **Developer/build environment risk:** moderate
- **Maintenance risk if ignored:** high, because dependency debt is accumulating and making future updates harder

## Recommendation for Joe
Do a small dedicated dependency-hardening pass on `CoinUsUp` soon, before more feature work lands. The repo is already in a state where security upgrades are harder than they should be.

## Evidence
Commands run:
- `npm audit --json`
- source grep for common secret patterns

Audit headline:
- `total: 14 vulnerabilities`
- `high: 13`
- `moderate: 1`

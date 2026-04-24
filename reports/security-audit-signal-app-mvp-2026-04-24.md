# Security audit, signal-app-mvp, 2026-04-24

## Scope
Focused idle-time security scan of `signal-app-mvp`.

Checks performed:
- Dependency audit with `npm audit --omit=dev`
- Quick secret scan for obvious committed credentials and private keys
- Quick config review of `next.config.mjs`

## What I fixed
- Upgraded `axios` from `^1.14.0` to `^1.15.0`
- Refreshed `package-lock.json`
- Result: dependency findings reduced from 7 to 6, and the direct axios SSRF-related advisory was removed

## Findings
### Fixed
1. **axios**
   - Previous version: `^1.14.0`
   - Risk: moderate, SSRF-related advisories in affected versions
   - Status: fixed by upgrading to `^1.15.0`

### Still open
1. **next** (`^14.2.35` currently resolved under vulnerable range)
   - Severity: high
   - Includes multiple DoS / request-handling advisories
   - Safe fully patched version suggested by npm audit requires a major jump to Next 16, which is not a quick idle-time change
   - Recommendation: plan a controlled framework upgrade, or at minimum test bumping to latest patched Next 14/15 line if compatible

2. **node-cron 3.0.3**
   - Severity: moderate via transitive `uuid`
   - Fix path is major version `4.2.1`
   - Recommendation: upgrade in a normal dev session because scheduler API behavior should be regression-tested

3. **transitive lodash**
   - Severity: high
   - Likely pulled by tooling/transitive dependency
   - Recommendation: resolved indirectly through dependency upgrades, especially Next/tooling refresh

4. **transitive follow-redirects**
   - Severity: moderate
   - Recommendation: likely resolved by broader dependency refresh; verify after Next/tooling upgrade

## Secret scan result
- No obvious committed API keys, private keys, or common secret token patterns found in a quick grep-based scan outside `node_modules`
- This was a lightweight scan, not a full entropy-based secret audit

## App config observations
- `next.config.mjs` is minimal:
  - `reactStrictMode: true`
  - `basePath: '/apps/market-signals'`
- No risky `remotePatterns`, rewrites, or permissive image config were visible in this quick pass

## Recommended next steps
1. Schedule a proper dependency refresh for `signal-app-mvp`, starting with Next and scheduler packages
2. Run app smoke tests after any Next upgrade, especially API routes and app router pages
3. If Joe wants a deeper pass, do a full code-level review of API routes for SSRF/input validation/rate limiting

## Files changed
- `signal-app-mvp/package.json`
- `signal-app-mvp/package-lock.json`

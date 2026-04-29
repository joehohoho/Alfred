# CoinUsUp Security Scan — 2026-04-29

## Scope
Focused idle-time security pass on `CoinUsUp` covering:
- tracked env/config exposure
- dependency CVEs (`npm audit`)
- quick insecure-pattern scan
- one safe hardening fix shipped immediately

## What I fixed
### Hardened the sidebar state cookie
File: `CoinUsUp/src/components/ui/sidebar.tsx`

Change:
- added `SameSite=Lax`
- add `Secure` automatically when the app is served over HTTPS

Why it matters:
- this cookie only stores sidebar UI state and does not need cross-site delivery
- `SameSite=Lax` reduces unnecessary cross-site cookie exposure
- `Secure` keeps the cookie off plaintext HTTP in production

## Findings
### 1) `.env` is still tracked in git
Evidence:
- `git ls-files .env` returned `.env`
- current contents appear limited to publishable Supabase client values, not service-role secrets

Risk:
- low immediate exposure if values remain public-only
- medium process risk because a tracked `.env` makes accidental secret commits much easier later

Recommendation:
1. copy current public values to `.env.example`
2. stop tracking `.env`
3. rotate immediately if any non-public key ever lived there

### 2) Production dependency audit is clean
Command:
- `npm audit --omit=dev --json`

Result:
- 0 prod vulnerabilities

### 3) Dev/build dependency vulnerabilities remain
Command:
- `npm audit --json`

Result:
- 16 total vulnerabilities: 12 high, 4 moderate
- mainly build/dev-tooling paths around `@capacitor/assets`, `@capacitor/cli`, `vite-plugin-pwa` chain, `postcss`, and related packages

Interpretation:
- mostly build-time exposure rather than live runtime risk
- still worth a cleanup pass before more CI/shared-contributor usage

### 4) Quick insecure-pattern scan
Observed:
- no live `eval(` usage found
- no live `new Function(` usage found
- no obvious committed private keys found in the scanned source tree
- service-role references are present in Supabase Edge Functions, but read from env at runtime rather than being hardcoded
- `dangerouslySetInnerHTML` appears in the chart UI component and should be reviewed as a separate targeted check if we want a deeper pass

## Verification
- `npm run build` succeeded after the cookie hardening change
- build emitted existing `vite-plugin-pwa`/Rolldown warnings, but production build completed successfully

## Evidence snapshot
- Branch scanned: `dev/growth-features-sprint-2026-03-24`
- Base commit at scan start: `4e41e55`

## Recommended next steps
1. Untrack `CoinUsUp/.env` and replace it with `.env.example`
2. Run a dedicated dev-dependency cleanup pass for Capacitor/PWA tooling
3. Do a deeper follow-up on `dangerouslySetInnerHTML` and edge-function authz assumptions if Joe wants a stricter audit

## Bottom line
I shipped a safe frontend hardening fix today by tightening the sidebar cookie attributes. The biggest remaining issue is still process hygiene around the tracked `.env`, followed by dev/build dependency CVEs that should be cleaned up in a separate maintenance pass.

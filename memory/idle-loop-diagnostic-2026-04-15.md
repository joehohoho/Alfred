# Idle Loop Component Diagnostic — 2026-04-15 05:08 ADT

## Issue Summary
- Component: idle_loop
- Status: degraded
- Last Activity: 2026-04-15T05:50:48.276Z (18 min ago, but diagnostic is from 05:08, so 42 min ago)
- Cooldown: 15 minutes
- Fix Attempts: 3 (all successful, so issue is NOT fix failure)
- Recent Failures: 0 (component is working, just on cooldown)

## Root Cause Analysis

**This is NOT a failure — it's a NORMAL STATE.**

The idle loop is DESIGNED to:
1. Run every 30 minutes
2. Have a 15-minute cooldown between activities
3. Be marked 'degraded' when on cooldown (to prevent repeated dispatch)

Current state shows:
- Last activity: 2026-04-15T05:50:48Z
- Cooldown duration: 15 minutes
- Sentinel attempts to 'fix' by resetting cooldown (which works, but is unnecessary)

## The Real Problem

Sentinel is treating 'on cooldown' as a degraded/broken state and attempting to 'fix' it.
This is incorrect — cooldown is INTENTIONAL behavior.

The fix: Tell sentinel to NOT alert on idle_loop when status is 'degraded' due to cooldown.
Idle loop should only alert if:
- No activity for > 60 minutes (suggests the process crashed)
- Repeated errors in dispatch
- But NOT just because it's on a normal 15-min cooldown

## Solution

Update sentinel to:
1. Recognize idle_loop 'degraded' state as NORMAL (not an error)
2. Only escalate if last_activity > 60 minutes ago
3. Do not attempt to 'fix' cooldown-induced degradation


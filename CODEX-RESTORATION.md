# Codex Configuration (Updated Feb 18, 2026)

## Current State
Codex (openai-codex/gpt-5.3-codex) is configured as **first fallback** using OAuth authentication.

## Fallback Chain (Crash-Safe)
```
Primary:    anthropic/claude-haiku-4-5    (fast, reliable)
Fallback 1: openai-codex/gpt-5.3-codex   (OAuth, free for code)
Fallback 2: anthropic/claude-sonnet-4-6   (catches everything)
```

## Crash Protection
- **Global timeout:** 60s (reduced from 150s to prevent queue blocking)
- **Failover behavior:** If Codex fails (auth, rate limit, timeout), system immediately moves to Sonnet
- **Codex is a fallback, NOT primary** — system works fine without it
- **Do NOT make Codex primary** — it has rate limits (500k TPM) that can block the queue

## Rules
- **Do NOT remove Codex from fallbacks** — it fails gracefully to Sonnet if unavailable
- **Do NOT move Codex to primary** — rate limits make it unreliable as primary
- **Do NOT increase timeoutSeconds above 60** — longer timeouts cause queue blocking
- **Auth mode:** OAuth (openai-codex:default profile)

## If Codex OAuth Expires
No action needed. The failover chain handles it automatically:
1. Codex returns auth error → instant fail (no timeout wait)
2. Sonnet picks up the request
3. Re-auth: `openclaw configure --section model` → select openai-codex → OAuth flow

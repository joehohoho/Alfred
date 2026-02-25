# TOOLS.md - Local Tooling Quick Reference (Lean)

Purpose: fast operational notes specific to this machine/user.
Full previous version is preserved in **TOOLS-EXTENDED.md** (no data loss).

---

## Critical Local Facts

- **Workspace:** `~/.openclaw/workspace`
- **iMessage (Joe):** `1-506-227-9553`

---

## Weather Monitoring (Dieppe, NB)

**Status:** implemented (`scripts/weather-alerts.sh`)

### Config
- Location: Dieppe, NB (`46.0988,-64.6819`)
- Slack channel: `#weather-alerts` (`C0AHET5GMUY`)
- wttr.in JSON: `curl -s "wttr.in/Dieppe,NB?format=j1"`
- Open-Meteo endpoint uses 3-day hourly forecast (temp, apparent temp, snowfall, precip, wind, gusts, direction, weathercode)

### Alert thresholds (48h)
- Rain: `>=10mm`
- Snow: `>=10cm`

### Required content rules
- Full hourly precip timeline (not just peak)
- Wind + gusts + wind chill
- Compare both sources (Open-Meteo + wttr.in)
- Include school-cancellation analysis for `>=10cm` snow
- Slack formatting uses `*bold*` (mrkdwn)

### Test
```bash
bash ~/.openclaw/workspace/scripts/weather-alerts.sh
```

---

## Ollama Guard

Script: `scripts/ollama-guard.sh`

### Common usage
```bash
bash scripts/ollama-guard.sh
source scripts/ollama-guard.sh && ollama_status
bash scripts/ollama-guard.sh --wait bash my-task.sh
```

### Rule
Use guard before LOCAL-model-dependent workloads to avoid timeout cascades.
Reference: `OLLAMA-GUARD-UNIVERSAL.md`

---

## Voice I/O

### STT (Whisper local)
Script: `scripts/voice-input.sh`

```bash
./scripts/voice-input.sh
./scripts/voice-input.sh continuous
./scripts/voice-input.sh 60 small
./scripts/voice-input.sh until-silence small
```

- Default model: `base`
- Models: tiny/base/small/medium/large

### TTS
Use OpenClaw `tts` tool (returns media file path).

---

## LaunchAgents / Services

Primary agents in this environment:
- `com.ollama.keepalive`
- `com.alfred.dashboard-nextjs` (localhost:3001)
- `com.alfred.job-tracker` (localhost:8000)
- `com.cloudflare.tunnel`

### Quick management
```bash
launchctl list | grep com.
launchctl stop com.alfred.dashboard-nextjs
launchctl start com.alfred.dashboard-nextjs
```

Notes:
- iMessage responder is handled by OpenClaw channel flow (no extra LaunchAgent required in this quick ref).
- Full troubleshooting/runbook is in `TOOLS-EXTENDED.md`.

---

## High-Value Quick Commands

### Weather
```bash
curl -s "wttr.in/Dieppe,NB?T"
curl -s "wttr.in/Dieppe,NB?format=3"
curl -s "wttr.in/Dieppe,NB?format=%l:+%c+%t+(feels+%f)+%w"
```

### Brave Search (preferred via tool)
Use `web_search(...)` tool first; manual API curl only if needed.

---

## Claude Code Router

Load helper in shell profile:
```bash
source ~/.openclaw/workspace/scripts/claude-code-router.sh
```

Common commands:
```bash
cc-review < file.js
cc-explain < file.js
cc-bugs < logs.txt
cc-tests < file.js
cc-dev "feature"
cc-arch "system design"
cc-debug "issue"
cc-continue
```

---

## Model Routing (Compressed)

- **Analysis/testing:** LOCAL first
- **Code generation/review:** CODEX first
- Escalate only when needed: Haiku → Sonnet → Opus
- For full routing tables/tiers: see `AGENTS.md` + `MODEL-POLICY.md`

---

## Size Guardrail

Keep `TOOLS.md` as quick-ref only. Put long docs/examples in `TOOLS-EXTENDED.md` or dedicated runbooks.

# OpenClaw Config Upgrade Plan (2026.2.12 → 2026.2.15)

**Date:** Monday, February 16, 2026  
**Backup Created:** `openclaw.json.backup.[timestamp]`  
**Risk Level:** LOW (non-breaking, additive changes)

---

## ✅ Conflict Analysis

### Current State
- **Memory:** Built-in SQLite + Ollama embeddings (local)
- **Compaction:** Safeguard mode
- **Plugins:** Slack only (enabled)
- **No diagnostics, context pruning, or plugin ecosystem**

### Proposed Changes (Non-Conflicting)

| Change | Type | Conflict Risk | Notes |
|--------|------|---|--------|
| Diagnostics | New config section | ✅ NONE | Purely observational; no impact on functionality |
| Context Pruning | New agent setting | ✅ NONE | Works with existing safeguard compaction; prevents unbounded growth |
| Update Channel | New setting | ✅ NONE | Informational only |
| apply_patch Tool | Enable + Configure | ✅ NONE | Workspace-only restriction already aligns with your setup |
| LanceDB Memory Plugin | Optional override | ⚠️ SAFE (optional) | Does NOT replace existing memory index; can coexist or be activated later |
| Voice Call Plugin | New plugin entry | ✅ NONE | Requires explicit config to use; safe to add disabled |
| LLM-Task Plugin | New plugin entry | ✅ NONE | Safe to add disabled |
| Lobster Plugin | New plugin entry | ✅ NONE | Safe to add disabled |

---

## 📋 Implementation Phases

### Phase 1: Safe Config Updates (NO RESTART REQUIRED)
Applied via `gateway.config.patch`:

```json
{
  "update": {
    "channel": "stable",
    "checkOnStart": true
  },
  "diagnostics": {
    "enabled": true,
    "flags": [],
    "cacheTrace": {
      "enabled": true,
      "filePath": "~/.openclaw/logs/cache-trace.jsonl",
      "includeMessages": true,
      "includePrompt": true,
      "includeSystem": true
    }
  },
  "agents": {
    "defaults": {
      "contextPruning": {
        "mode": "cache-ttl",
        "ttl": "7d",
        "keepLastAssistants": 3,
        "softTrimRatio": 0.7,
        "hardClearRatio": 0.85,
        "minPrunableToolChars": 500,
        "hardClear": {
          "enabled": true,
          "placeholder": "[old context pruned: >7d]"
        }
      }
    }
  },
  "tools": {
    "exec": {
      "applyPatch": {
        "enabled": true,
        "workspaceOnly": true,
        "allowModels": ["openai/gpt-5.2", "openai/gpt-5.3"]
      }
    }
  }
}
```

**Expected outcome:** 
- ✅ Diagnostics logging enabled
- ✅ Cache trace JSON output to `~/.openclaw/logs/cache-trace.jsonl`
- ✅ Sessions older than 7 days auto-pruned
- ✅ apply_patch enabled for OpenAI models (workspace-only)
- ✅ No service interruption

---

### Phase 2: Plugin Registry (NO RESTART REQUIRED)
Add new plugin entries (disabled by default):

```json
{
  "plugins": {
    "enabled": true,
    "entries": {
      "slack": {
        "enabled": true
      },
      "memory-lancedb": {
        "enabled": false,
        "config": {
          "embedding": {
            "apiKey": "will-use-OPENAI_API_KEY-env-var",
            "model": "text-embedding-3-small"
          },
          "dbPath": "~/.openclaw/memory/lancedb",
          "autoCapture": true,
          "autoRecall": true,
          "captureMaxChars": 500
        }
      },
      "voice-call": {
        "enabled": false,
        "config": {}
      },
      "llm-task": {
        "enabled": false,
        "config": {}
      },
      "lobster": {
        "enabled": false,
        "config": {}
      }
    }
  }
}
```

**Expected outcome:**
- ✅ Plugin entries registered but disabled
- ✅ Can be activated later without restart
- ✅ No functional change to existing setup

---

### Phase 3: Optional Memory Upgrade (RESTART REQUIRED)
**Only if user approves** - Activate LanceDB as primary memory plugin:

```json
{
  "plugins": {
    "slots": {
      "memory": "memory-lancedb"
    },
    "entries": {
      "memory-lancedb": {
        "enabled": true,
        "config": { ... }
      }
    }
  }
}
```

**Activation steps:**
1. User approves LanceDB upgrade
2. Apply config patch
3. Restart gateway (`openclaw gateway restart`)
4. LanceDB indexes build automatically on first use
5. Old SQLite memory remains accessible (fallback)

---

## 🛡️ Data Protection Strategy

### Backup Locations
1. **Primary config backup:** `~/.openclaw/openclaw.json.backup.[timestamp]`
2. **Memory index (kept intact):** `~/.openclaw/memory/index.db` (existing SQLite)
3. **LanceDB new index (separate):** `~/.openclaw/memory/lancedb/` (new, if activated)

### Rollback Plan
If anything breaks:
```bash
# Restore to backup
cp ~/.openclaw/openclaw.json.backup.{TIMESTAMP} ~/.openclaw/openclaw.json

# Restart
openclaw gateway restart
```

**Data loss risk:** ZERO (all backups and original memory indexes preserved)

---

## 📊 Expected Improvements After Implementation

| Feature | Benefit | Cost | Activation |
|---------|---------|------|------------|
| Diagnostics | See what's happening in memory/tools/cache | $0 | Automatic (Phase 1) |
| Context Pruning | Prevent unbounded session growth; auto-cleanup | $0 | Automatic (Phase 1) |
| apply_patch | Direct code edits via Claude | $0.0001-0.001/use | Automatic (Phase 1) |
| LanceDB Memory | Auto-recall + cheaper than manual searches | ~$0.0002/query | Optional (Phase 3) |
| Voice Call Plugin | Phone integration (Telnyx/Twilio) | $0.01-0.05/min | Manual setup |
| LLM-Task Plugin | Structured workflows | $0 | Manual setup |
| Lobster Plugin | Typed workflows + approvals | $0 | Manual setup |

---

## ⚠️ Risk Mitigation Checklist

- [x] Config backup created
- [x] Memory indexes identified (no loss path)
- [x] Conflict analysis completed
- [x] Rollback procedure documented
- [x] All changes non-breaking (additive only)
- [x] Phase 1 requires no restart
- [x] Phase 3 (memory upgrade) is optional
- [x] Existing Slack plugin remains enabled

---

## 📝 Next Steps

1. **Phase 1 Apply:** Run `gateway config.patch` with safe updates
2. **Verify:** Check logs, confirm no errors
3. **Phase 2 Apply:** Register new plugins (disabled)
4. **User Decision:** Ask about LanceDB activation (Phase 3)
5. **Document:** Log all changes to memory

---

## Detailed Config Changes (Ready to Apply)

See `CONFIG_UPGRADE_PATCH.json` for the complete patch payload.

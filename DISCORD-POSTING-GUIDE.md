# Discord Posting Guide — Idle Activity Fixes

**Status:** CRITICAL FIX (2026-04-15 06:05 ADT)

**Problem:** Idle activities repeatedly call `message(action=send, channel=discord, target="dailyconfig")`, which fails with "Unknown target" errors. The gateway does NOT accept friendly channel names in the `to` parameter.

**Solution:** Always use verified numeric Discord channel IDs, never friendly names.

---

## Verified Channel IDs

```
#dailyconfig    → 1476598143016505446
#general        → 1476571891043926036
#alerts         → 1476592867865657599
#devops         → 1484566371412213934
```

---

## Correct Usage Examples

### ✅ CORRECT: Use numeric ID
```javascript
message({
  action: "send",
  channel: "discord",
  to: "1476598143016505446",
  message: "Hello #dailyconfig"
})
```

### ❌ WRONG: Use friendly name
```javascript
// This fails!
message({
  action: "send",
  channel: "discord",
  target: "dailyconfig",  // ← No! target should not exist
  message: "Hello"
})
```

### ❌ WRONG: Use target parameter
```javascript
// This fails!
message({
  action: "send",
  channel: "discord",
  target: "dailyconfig",  // ← Gateway doesn't support this
  message: "Hello"
})
```

---

## Helper Scripts

**For bash/shell idle activities:**
```bash
bash ~/.openclaw/workspace/scripts/discord-post-safe.sh "dailyconfig" "Your message"
```

**For future JavaScript/Node idle activities:**
Import and use the helper function that converts friendly names to IDs.

---

## Enforcement

**Idle activity template:** When spawning idle-activity prompts, include this in the system context:

> **Discord Posting Rule:** Use ONLY numeric Discord channel IDs in the `to` parameter. Convert friendly names beforehand.
> Valid IDs: 1476598143016505446 (#dailyconfig), 1476571891043926036 (#general), 1476592867865657599 (#alerts), 1484566371412213934 (#devops).

---

## Testing

To verify a message call works:
```bash
bash ~/.openclaw/workspace/scripts/discord-post-safe.sh "dailyconfig" "Test message" | jq .
```

Should output valid JSON with numeric `to` field.

---

## References

- `scripts/channel-ids.sh` — Verified ID mapping (source this in bash scripts)
- `scripts/discord-post-safe.sh` — Safe posting wrapper
- Gateway error log: `~/.openclaw/logs/gateway.err.log`

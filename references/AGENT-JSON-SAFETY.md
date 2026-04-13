# Agent JSON Safety Guide

## Problem

Subagents are generating malformed JSON in tool calls, causing gateway rejections:
- Unescaped newlines in string values
- Missing commas between object properties
- Invalid escape sequences
- Syntax errors at specific byte positions

These cause errors like: `Expected ',' or '}' after property value in JSON at position 2902`

## Root Cause

When agents construct JSON tool parameters dynamically (especially with multiline content, code blocks, or user-provided text), they often:
1. Forget to escape newlines (`\n` not literally newline)
2. Forget to escape quotes (`\"` not `"`)
3. Miss commas between properties
4. Include raw unescaped content in JSON strings

## Solution for Agents

### Rule 1: Always Validate Before Tool Call

Before calling ANY tool that accepts complex JSON (message, invoke, etc.), validate your JSON:

```bash
# Example: Before a message tool call
PAYLOAD='{"action":"send","to":"#channel","message":"Hello\nWorld"}'

# Validate with jq
if ! jq empty <<< "$PAYLOAD" 2>/dev/null; then
  echo "ERROR: Invalid JSON in payload"
  exit 1
fi

# Only then proceed with the tool call
message send --payload "$PAYLOAD"
```

### Rule 2: Use Python for JSON Building

When building JSON with user content or multiline strings, use Python's `json.dumps()`:

```bash
MESSAGE="Hello
World
This is multiline"

PAYLOAD=$(python3 -c "
import json
print(json.dumps({
  'action': 'send',
  'to': '#channel',
  'message': '$MESSAGE'
}))
")

# Now $PAYLOAD is guaranteed valid JSON
```

### Rule 3: Use Helper Scripts

For complex payloads, use `~/.openclaw/workspace/scripts/tool-json-helper.sh`:

```bash
source ~/.openclaw/workspace/scripts/tool-json-helper.sh

# Build tool JSON safely
PAYLOAD=$(bash tool-json-helper.sh build "message" "send" \
  --to "#channel" \
  --message "Your message here")

# Automatically escapes special characters
```

### Rule 4: Escape Content Properly

Always use `jq` or Python for escaping:

```bash
# BAD: Raw string with quotes
MSG='He said "hello"'  # Will break JSON

# GOOD: Use jq to escape
MSG='He said "hello"'
ESCAPED=$(jq -n --arg msg "$MSG" '$msg')
# Now $ESCAPED = "He said \"hello\""
```

### Rule 5: Multiline Content Strategy

Never embed literal newlines in JSON strings:

```bash
# BAD: Literal newlines
JSON='{"text":"Line 1
Line 2"}'

# GOOD: Escaped newlines via Python
TEXT="Line 1
Line 2"
JSON=$(python3 -c "import json; print(json.dumps({'text': '''$TEXT'''}))")
```

## Testing Your JSON

Before submitting a tool call, test it:

```bash
#!/bin/bash

# Your JSON payload
PAYLOAD='{"key":"value","nested":{"array":[1,2,3]}}'

# Validate
if ! jq empty <<< "$PAYLOAD" 2>/dev/null; then
  echo "INVALID JSON:"
  echo "$PAYLOAD"
  jq . <<< "$PAYLOAD"  # Shows parse error
  exit 1
fi

echo "✓ JSON is valid"
```

## Common Errors & Fixes

### Error: `Expected ',' or '}' after property value`
**Cause:** Missing comma between properties
**Fix:** Ensure all properties end with comma except the last one
```json
{"key1":"value1", "key2":"value2"}  // ✓ Correct
{"key1":"value1" "key2":"value2"}   // ✗ Missing comma
```

### Error: `Expected ',' or ']' after array element`
**Cause:** Missing comma in array
**Fix:** Arrays need commas: `[1, 2, 3]` not `[1 2 3]`

### Error: `Unexpected token`
**Cause:** Unescaped quotes or newlines in string
**Fix:** Use `json.dumps()` or `jq` for escaping

```bash
# BAD
JSON='{"msg":"He said "no""}'  # Unescaped quotes

# GOOD
MSG='He said "no"'
JSON=$(python3 -c "import json; print(json.dumps({'msg': '''$MSG'''}))")
```

## Automation: Auto-Fix Wrapper

Use `~/.openclaw/workspace/scripts/sanitize-agent-json.sh` as a last-resort wrapper:

```bash
POTENTIALLY_BAD_JSON='...'

# Attempt to fix and validate
FIXED_JSON=$(bash ~/.openclaw/workspace/scripts/sanitize-agent-json.sh <<< "$POTENTIALLY_BAD_JSON")

if [[ $? -eq 0 ]]; then
  # JSON is now valid; safe to use
  echo "$FIXED_JSON" | jq .
fi
```

## Reference: Valid JSON Examples

```json
{
  "action": "send",
  "to": "#channel",
  "message": "Hello world",
  "metadata": {
    "tags": ["important", "urgent"],
    "escaped_content": "Line 1\nLine 2\nLine 3",
    "quoted": "He said \"Hello\""
  }
}
```

## For Subagent Frameworks

If you are a subagent spawning other agents or calling tools:

1. **Always validate JSON before passing to parent**
2. **Use `jq` to construct and validate**
3. **Test with: `jq empty <<< "$PAYLOAD"`**
4. **Never trust user-provided strings in JSON without escaping**
5. **Use Python's `json` module for complex structures**

---

**Last Updated:** 2026-04-13 12:05 ADT
**Status:** Active (incident response fix)

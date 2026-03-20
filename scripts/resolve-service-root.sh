#!/usr/bin/env bash
set -euo pipefail

MANIFEST="/Users/hopenclaw/.openclaw/workspace/config/service-source-of-truth.json"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <service-name>"
  exit 1
fi

SERVICE="$1"

if [[ ! -f "$MANIFEST" ]]; then
  echo "Manifest not found: $MANIFEST" >&2
  exit 2
fi

CANONICAL=$(python3 - <<'PY' "$MANIFEST" "$SERVICE"
import json, sys
manifest_path, service = sys.argv[1], sys.argv[2]
with open(manifest_path, 'r', encoding='utf-8') as f:
    m = json.load(f)
svc = m.get('services', {}).get(service)
if not svc:
    raise SystemExit(1)
print(svc.get('canonicalPath', ''))
PY
) || {
  echo "Service not found in manifest: $SERVICE" >&2
  exit 3
}

if [[ -z "${CANONICAL:-}" ]]; then
  echo "Service has no canonicalPath: $SERVICE" >&2
  exit 4
fi

echo "$CANONICAL"

#!/bin/bash
# change-control-lite.sh
# Lightweight enforced change record for system/functionality updates.
#
# Usage:
#   bash scripts/change-control-lite.sh start "Title"
#   bash scripts/change-control-lite.sh show <change_id>
#   bash scripts/change-control-lite.sh verify <change_id>
#   bash scripts/change-control-lite.sh close <change_id> "summary"

set -euo pipefail

WORKSPACE="$HOME/.openclaw/workspace"
CHANGES_DIR="$WORKSPACE/tracking/changes"
mkdir -p "$CHANGES_DIR"

cmd="${1:-}"

now_iso() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
now_local() { date +"%Y-%m-%d %H:%M %Z"; }

if [[ -z "$cmd" ]]; then
  echo "Usage: $0 <start|show|verify|close> ..."
  exit 1
fi

case "$cmd" in
  start)
    title="${2:-}"
    if [[ -z "$title" ]]; then
      echo "❌ Title required"
      exit 1
    fi
    id="chg_$(date +%Y%m%d_%H%M%S)"
    file="$CHANGES_DIR/$id.json"
    cat > "$file" <<JSON
{
  "id": "$id",
  "title": $(python3 - <<PY
import json
print(json.dumps("$title"))
PY
),
  "status": "in_progress",
  "created_at": "$(now_iso)",
  "created_local": "$(now_local)",
  "problem_statement": "",
  "objective": "",
  "current_state": {
    "dependencies": [],
    "failure_points": [],
    "blast_radius": ""
  },
  "options_considered": [],
  "selected_solution": {
    "choice": "",
    "rationale": ""
  },
  "guardrails": {
    "preflight_checks": [],
    "retry_backoff": "",
    "fallback": "",
    "rollback": "",
    "post_change_checks": []
  },
  "restart": {
    "required": false,
    "safe_to_restart_now": null,
    "reason": ""
  },
  "verification_bundle": "",
  "completion": {
    "summary": "",
    "completed_at": ""
  }
}
JSON
    echo "✅ Started change record: $id"
    echo "   File: $file"
    ;;

  show)
    id="${2:-}"
    file="$CHANGES_DIR/$id.json"
    [[ -f "$file" ]] || { echo "❌ Not found: $file"; exit 1; }
    cat "$file"
    ;;

  verify)
    id="${2:-}"
    file="$CHANGES_DIR/$id.json"
    [[ -f "$file" ]] || { echo "❌ Not found: $file"; exit 1; }

    python3 - "$file" <<'PY'
import json, sys
f=sys.argv[1]
d=json.load(open(f))
errs=[]

req_str=[("problem_statement", d.get("problem_statement")), ("objective", d.get("objective"))]
for k,v in req_str:
    if not isinstance(v,str) or len(v.strip())<10:
        errs.append(f"{k} must be at least 10 chars")

cs=d.get("current_state",{})
if not cs.get("dependencies"):
    errs.append("current_state.dependencies must include at least 1 item")
if not cs.get("failure_points"):
    errs.append("current_state.failure_points must include at least 1 item")
if len((cs.get("blast_radius") or "").strip())<5:
    errs.append("current_state.blast_radius required")

opts=d.get("options_considered",[])
if len(opts)<2:
    errs.append("options_considered must have at least 2 options")

sel=d.get("selected_solution",{})
if len((sel.get("choice") or "").strip())<3:
    errs.append("selected_solution.choice required")
if len((sel.get("rationale") or "").strip())<10:
    errs.append("selected_solution.rationale required")

g=d.get("guardrails",{})
if not g.get("preflight_checks"):
    errs.append("guardrails.preflight_checks required")
if len((g.get("fallback") or "").strip())<3:
    errs.append("guardrails.fallback required")
if len((g.get("rollback") or "").strip())<3:
    errs.append("guardrails.rollback required")
if not g.get("post_change_checks"):
    errs.append("guardrails.post_change_checks required")

r=d.get("restart",{})
if r.get("required") and r.get("safe_to_restart_now") is None:
    errs.append("restart.safe_to_restart_now must be set when restart.required=true")

if errs:
    print("❌ Change control verification failed:")
    for e in errs:
        print(f" - {e}")
    sys.exit(1)

print("✅ Change control verification passed")
PY
    ;;

  close)
    id="${2:-}"
    summary="${3:-}"
    file="$CHANGES_DIR/$id.json"
    [[ -f "$file" ]] || { echo "❌ Not found: $file"; exit 1; }
    [[ -n "$summary" ]] || { echo "❌ completion summary required"; exit 1; }

    python3 - "$file" "$summary" <<'PY'
import json,sys
f=sys.argv[1]
summary=sys.argv[2]
d=json.load(open(f))
d["status"]="completed"
d.setdefault("completion",{})
d["completion"]["summary"]=summary
d["completion"]["completed_at"]="__NOW__"
json.dump(d,open(f,'w'),indent=2)
PY

    python3 - "$file" <<'PY'
import json,sys,datetime
f=sys.argv[1]
d=json.load(open(f))
d["completion"]["completed_at"]=datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
json.dump(d,open(f,'w'),indent=2)
print("✅ Closed change record:", d["id"])
PY
    ;;

  *)
    echo "❌ Unknown command: $cmd"
    exit 1
    ;;
esac

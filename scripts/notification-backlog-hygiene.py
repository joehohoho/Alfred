#!/usr/bin/env python3
"""Clean up stale/malformed notification backlog safely.

Targets only high-confidence cases:
- malformed unanswered entries with no usable content
- older unanswered duplicates for the same task/card reference
- older unanswered exact-title duplicates when no task/card reference exists

Writes an audit trail to goals/notification-hygiene-log.jsonl and keeps a full
backup before mutating notifications.json.
"""

from __future__ import annotations

import argparse
import json
import re
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

WORKSPACE = Path(__file__).resolve().parent.parent
NOTIF_PATH = WORKSPACE / "goals" / "notifications.json"
LOG_PATH = WORKSPACE / "goals" / "notification-hygiene-log.jsonl"
BACKUP_DIR = WORKSPACE / "goals" / "backups"
TASK_RE = re.compile(r"(?P<id>(?:task|card)_[0-9]+_[a-z0-9]+)", re.I)
DAILY_INQUIRY_SOURCE = "daily-inquiry"
MAX_OPEN_DAILY_INQUIRIES = 3


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--apply", action="store_true", help="write changes back to notifications.json")
    return p.parse_args()


def load_payload() -> Tuple[Dict[str, Any], List[Dict[str, Any]], str]:
    payload = json.loads(NOTIF_PATH.read_text())
    if isinstance(payload, list):
        return {"items": payload}, payload, "list"
    if isinstance(payload, dict) and isinstance(payload.get("items"), list):
        return payload, payload["items"], "object"
    raise SystemExit(f"Unsupported notifications format in {NOTIF_PATH}")


def extract_task_ref(item: Dict[str, Any]) -> Optional[str]:
    for key in ("taskId", "cardId"):
        value = item.get(key)
        if isinstance(value, str):
            m = TASK_RE.search(value)
            if m:
                return m.group("id").lower()
    for key in ("message", "title"):
        value = item.get(key)
        if isinstance(value, str):
            m = TASK_RE.search(value)
            if m:
                return m.group("id").lower()
    return None


def normalized_title(item: Dict[str, Any]) -> str:
    title = item.get("title")
    if not isinstance(title, str):
        return ""
    return " ".join(title.split()).strip().lower()


def parse_created(item: Dict[str, Any]) -> datetime:
    for key in ("createdAt", "timestamp", "updatedAt"):
        value = item.get(key)
        if isinstance(value, (int, float)):
            if value > 9999999999:
                value = value / 1000.0
            return datetime.fromtimestamp(value, tz=timezone.utc)
        if isinstance(value, str) and value.strip():
            text = value.strip().replace("Z", "+00:00")
            try:
                return datetime.fromisoformat(text)
            except ValueError:
                continue
    return datetime.fromtimestamp(0, tz=timezone.utc)


def is_unanswered(item: Dict[str, Any]) -> bool:
    if "answered" in item:
        return item.get("answered") is not True
    answered_at = item.get("answeredAt")
    answer = item.get("answer")
    return not (answered_at or answer)


def is_malformed(item: Dict[str, Any]) -> bool:
    fields = [item.get("id"), item.get("title"), item.get("message"), item.get("taskId"), item.get("cardId"), item.get("source")]
    for value in fields:
        if isinstance(value, str) and value.strip():
            return False
        if value not in (None, ""):
            return False
    return True


def is_daily_inquiry(item: Dict[str, Any]) -> bool:
    source = item.get("source") or item.get("sourceTag") or ""
    return isinstance(source, str) and source.strip().lower() == DAILY_INQUIRY_SOURCE


def supersede(item: Dict[str, Any], reason: str, replacement: Optional[Dict[str, Any]], run_at: str) -> Dict[str, Any]:
    updated = deepcopy(item)
    updated["answered"] = True
    updated["answeredAt"] = run_at
    updated["status"] = "superseded"
    updated["deliveryStatus"] = "archived"
    updated["autoResolvedBy"] = "notification-backlog-hygiene"
    updated["autoResolveReason"] = reason
    if replacement:
        updated["supersededBy"] = replacement.get("id") or replacement.get("title") or extract_task_ref(replacement)
    return updated


def build_groups(items: List[Dict[str, Any]]) -> Tuple[Dict[str, List[int]], Dict[str, List[int]]]:
    by_task: Dict[str, List[int]] = {}
    by_title: Dict[str, List[int]] = {}
    for idx, item in enumerate(items):
        if not is_unanswered(item) or is_malformed(item):
            continue
        task_ref = extract_task_ref(item)
        if task_ref:
            by_task.setdefault(task_ref, []).append(idx)
        title = normalized_title(item)
        if title:
            by_title.setdefault(title, []).append(idx)
    return by_task, by_title


def choose_kept_index(indexes: List[int], items: List[Dict[str, Any]]) -> int:
    return max(indexes, key=lambda idx: parse_created(items[idx]))


def main() -> int:
    args = parse_args()
    payload, items, fmt = load_payload()
    run_at = now_iso()

    replacements: Dict[int, Dict[str, Any]] = {}
    audit_rows: List[Dict[str, Any]] = []

    for idx, item in enumerate(items):
        if is_unanswered(item) and is_malformed(item):
            replacements[idx] = supersede(item, "malformed-empty-entry", None, run_at)
            audit_rows.append({
                "timestamp": run_at,
                "action": "supersede",
                "reason": "malformed-empty-entry",
                "index": idx,
            })

    by_task, by_title = build_groups(items)

    for task_ref, indexes in by_task.items():
        if len(indexes) < 2:
            continue
        keep_idx = choose_kept_index(indexes, items)
        for idx in indexes:
            if idx == keep_idx:
                continue
            replacements[idx] = supersede(items[idx], f"older-duplicate-task:{task_ref}", items[keep_idx], run_at)
            audit_rows.append({
                "timestamp": run_at,
                "action": "supersede",
                "reason": "older-duplicate-task",
                "taskRef": task_ref,
                "index": idx,
                "keptIndex": keep_idx,
                "keptNotification": items[keep_idx].get("id") or items[keep_idx].get("title"),
            })

    for title, indexes in by_title.items():
        unresolved = [idx for idx in indexes if idx not in replacements]
        if len(unresolved) < 2:
            continue
        keep_idx = choose_kept_index(unresolved, items)
        for idx in unresolved:
            if idx == keep_idx:
                continue
            replacements[idx] = supersede(items[idx], "older-duplicate-title", items[keep_idx], run_at)
            audit_rows.append({
                "timestamp": run_at,
                "action": "supersede",
                "reason": "older-duplicate-title",
                "title": title,
                "index": idx,
                "keptIndex": keep_idx,
                "keptNotification": items[keep_idx].get("id") or items[keep_idx].get("title"),
            })

    open_daily_inquiry_indexes = [
        idx for idx, item in enumerate(items)
        if idx not in replacements and is_unanswered(item) and is_daily_inquiry(item)
    ]
    open_daily_inquiry_indexes.sort(key=lambda idx: parse_created(items[idx]))
    if len(open_daily_inquiry_indexes) > MAX_OPEN_DAILY_INQUIRIES:
        keep_indexes = set(open_daily_inquiry_indexes[-MAX_OPEN_DAILY_INQUIRIES:])
        newest_kept_idx = open_daily_inquiry_indexes[-1]
        for idx in open_daily_inquiry_indexes:
            if idx in keep_indexes:
                continue
            replacements[idx] = supersede(
                items[idx],
                f"daily-inquiry-backlog-cap:{MAX_OPEN_DAILY_INQUIRIES}",
                items[newest_kept_idx],
                run_at,
            )
            audit_rows.append({
                "timestamp": run_at,
                "action": "supersede",
                "reason": "daily-inquiry-backlog-cap",
                "index": idx,
                "keptIndex": newest_kept_idx,
                "keptNotification": items[newest_kept_idx].get("id") or items[newest_kept_idx].get("title"),
                "maxOpen": MAX_OPEN_DAILY_INQUIRIES,
            })

    projected_items = [replacements.get(idx, item) for idx, item in enumerate(items)]
    summary = {
        "apply": bool(args.apply),
        "malformed_superseded": sum(1 for row in audit_rows if row["reason"] == "malformed-empty-entry"),
        "task_duplicates_superseded": sum(1 for row in audit_rows if row["reason"] == "older-duplicate-task"),
        "title_duplicates_superseded": sum(1 for row in audit_rows if row["reason"] == "older-duplicate-title"),
        "daily_inquiry_superseded": sum(1 for row in audit_rows if row["reason"] == "daily-inquiry-backlog-cap"),
        "total_changes": len(replacements),
        "open_before": sum(1 for item in items if is_unanswered(item)),
        "open_after": sum(1 for item in projected_items if is_unanswered(item)),
    }

    print(json.dumps(summary, indent=2))

    if not args.apply or not replacements:
        return 0

    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    backup_path = BACKUP_DIR / f"notifications-pre-hygiene-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    backup_path.write_text(json.dumps(payload if fmt == "object" else items, indent=2, ensure_ascii=False) + "\n")

    new_items = []
    for idx, item in enumerate(items):
        new_items.append(replacements.get(idx, item))

    if fmt == "object":
        payload["items"] = new_items
        NOTIF_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    else:
        NOTIF_PATH.write_text(json.dumps(new_items, indent=2, ensure_ascii=False) + "\n")

    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as fh:
        for row in audit_rows:
            fh.write(json.dumps(row, ensure_ascii=False) + "\n")

    print(f"Applied {len(replacements)} cleanup change(s). Backup: {backup_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/bin/bash
# collapse-pending-questions.sh — Collapse 8+ pending questions into 2-3 semantic topics
# Semantic clustering with decision context and recommendation
# Called by: sync-pending-questions.sh (after fetching from notifications.json)
# Usage: collapse-pending-questions.sh [--archive] [--verbose]
#
# PHASE 1 IMPLEMENTATION:
# - Semantic clustering (CoinUsUp Trial, Bill Review, Uncategorized)
# - Archive audit trail to pending-questions-archive.jsonl
# - Integration with sync-pending-questions.sh
# - State tracking for collapse history

set -e

NOTIF_FILE="$HOME/.openclaw/workspace/goals/notifications.json"
ACTIVE_TASK="$HOME/.openclaw/workspace/ACTIVE-TASK.md"
ARCHIVE_FILE="$HOME/.openclaw/workspace/pending-questions-archive.jsonl"
COLLAPSE_STATE="$HOME/.openclaw/workspace/.hal-alfred-tracking/collapse-state.json"

VERBOSE=false
ARCHIVE=false

# Parse flags
while [[ $# -gt 0 ]]; do
    case $1 in
        --archive) ARCHIVE=true; shift ;;
        --verbose) VERBOSE=true; shift ;;
        *) shift ;;
    esac
done

mkdir -p "$HOME/.openclaw/workspace/.hal-alfred-tracking"

# Extract unanswered notifications with semantic tagging
python3 - "$NOTIF_FILE" "$COLLAPSE_STATE" "$ARCHIVE_FILE" "$VERBOSE" "$ARCHIVE" <<'PYEOF'
import json
import sys
from datetime import datetime

notif_file, state_file, archive_file, verbose, do_archive = sys.argv[1:6]
verbose = verbose == "true"
do_archive = do_archive == "true"

try:
    with open(notif_file) as f:
        notifs = json.load(f)
except Exception as e:
    if verbose:
        print(f"Error reading notifications: {e}", file=sys.stderr)
    sys.exit(1)

# Extract unanswered notifications
unanswered = [n for n in notifs if not n.get('answered', False)]

# Semantic clustering: group by topic
topics = {}

# Initialize known topics
topics["CoinUsUp Trial Configuration"] = {
    "keywords": ["CoinUsUp", "Stripe", "trial", "price", "recurring donations"],
    "questions": [],
    "latest_ask": None,
    "prior_asks": [],
    "recommendation": "Use test key from Stripe Dashboard; unblocks $500-2K/mo revenue",
    "status": "AWAITING APPROVAL"
}

topics["Bill Review Scope Decision"] = {
    "keywords": ["Bill Review", "scope", "personal", "SaaS", "SMB", "invoice audit"],
    "questions": [],
    "latest_ask": None,
    "prior_asks": [],
    "recommendation": "Start with Option A (Personal Tool) for 2-3 days, expand to SaaS later if validated",
    "status": "AWAITING APPROVAL"
}

# Classify each unanswered question
uncategorized = []
for notif in unanswered:
    title = notif.get('title', '').lower()
    msg = notif.get('message', '').lower()
    combined = f"{title} {msg}"
    nid = notif.get('id', '?')
    created = notif.get('createdAt', '')
    
    matched = False
    for topic_name in topics:
        topic_data = topics[topic_name]
        if any(kw.lower() in combined for kw in topic_data["keywords"]):
            topic_data["questions"].append({
                "id": nid,
                "title": notif.get('title', ''),
                "created": created,
                "message": notif.get('message', '')[:200]
            })
            if not topic_data["latest_ask"]:
                topic_data["latest_ask"] = created
            else:
                topic_data["prior_asks"].append(created)
            matched = True
            break
    
    # If no match, add to uncategorized
    if not matched:
        uncategorized.append({
            "id": nid,
            "title": notif.get('title', ''),
            "created": created,
            "message": notif.get('message', '')[:200]
        })

# Add uncategorized if any
if uncategorized:
    topics["Uncategorized"] = {
        "keywords": [],
        "questions": uncategorized,
        "latest_ask": uncategorized[0]["created"] if uncategorized else None,
        "prior_asks": [q["created"] for q in uncategorized[1:]] if len(uncategorized) > 1 else [],
        "recommendation": "Review and categorize these questions",
        "status": "NEEDS REVIEW"
    }

# Save state (for tracking)
with open(state_file, 'w') as f:
    json.dump({
        "topics": topics,
        "timestamp": datetime.now().isoformat(),
        "total_unanswered": len(unanswered)
    }, f, indent=2)

# Archive old questions (before current collapse)
if do_archive:
    with open(archive_file, 'a') as f:
        for topic_name, topic_data in topics.items():
            for q in topic_data["questions"]:
                archive_entry = {
                    "timestamp": datetime.now().isoformat(),
                    "topic": topic_name,
                    "question_id": q["id"],
                    "title": q["title"],
                    "created": q["created"],
                    "archived_at": datetime.now().isoformat()
                }
                f.write(json.dumps(archive_entry) + "\n")

# Output collapsed markdown
print("## Pending Questions (Collapsed by Topic)")
print()

for topic_name in sorted(topics.keys()):
    topic_data = topics[topic_name]
    if topic_data["questions"]:
        print(f"### Topic: {topic_name}")
        print(f"- **Latest ask:** {topic_data['latest_ask'][:10] if topic_data['latest_ask'] else 'N/A'}")
        if topic_data['prior_asks']:
            print(f"- **Prior asks:** {len(topic_data['prior_asks'])} ({', '.join([d[:10] for d in topic_data['prior_asks'][:3]])}...)")
        print(f"- **Recommendation:** {topic_data['recommendation']}")
        print(f"- **Status:** {topic_data['status']}")
        print()

if not unanswered:
    print("_(no pending questions)_")

if verbose:
    print(f"\n[collapse-pending-questions.sh] Total unanswered: {len(unanswered)}", file=sys.stderr)
    print(f"[collapse-pending-questions.sh] Topics: {list(topics.keys())}", file=sys.stderr)
    print(f"[collapse-pending-questions.sh] State saved to: {state_file}", file=sys.stderr)

PYEOF

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to collapse pending questions" >&2
    exit 1
fi

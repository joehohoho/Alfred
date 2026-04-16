#!/bin/bash
# consolidate-pending-decisions.sh
# Deduplicates pending questions, creates decision matrix, identifies blocking decisions.
# Outputs a clean PENDING-DECISIONS.md file for review.
# Usage: consolidate-pending-decisions.sh

set -e

NOTIF_FILE="$HOME/.openclaw/workspace/goals/notifications.json"
OUTPUT="$HOME/.openclaw/workspace/PENDING-DECISIONS.md"

if [ ! -f "$NOTIF_FILE" ]; then
    echo "No notifications file found" >&2
    exit 1
fi

# Use Python to deduplicate, categorize, and generate decision matrix
python3 - "$NOTIF_FILE" "$OUTPUT" <<'PYEOF'
import json
import sys
from datetime import datetime
from collections import defaultdict

notif_file, output_file = sys.argv[1], sys.argv[2]

with open(notif_file, 'r') as f:
    notifs = json.load(f)

# Filter unanswered, parse categories
unanswered = [n for n in notifs if not n.get('answered', False)]

decisions = defaultdict(list)
for n in unanswered:
    title = n.get('title', 'Untitled').lower()
    
    # Categorize
    if 'bill review' in title or 'invoice' in title:
        category = 'Bill Review & Invoice Audit'
        key = 'bill-review'
    elif 'stripe' in title or 'trial' in title:
        category = 'CoinUsUp — Trial Feature'
        key = 'coinusup-trial'
    elif 'grant writer' in title or 'ai grant' in title:
        category = 'AI Grant Writer SaaS'
        key = 'grant-writer'
    elif 'trader' in title or 'signal' in title or 'post-mortem' in title:
        category = 'Trader Signal Post-Mortem'
        key = 'trader-signal'
    elif 'even us up' in title or 'evenusup' in title:
        category = 'Even Us Up'
        key = 'even-us-up'
    elif 'consulting' in title:
        category = 'Consulting Scalability'
        key = 'consulting'
    elif 'freshness' in title:
        category = 'Knowledge Cleanup'
        key = 'freshness'
    else:
        category = 'Other'
        key = 'other'
    
    decisions[key].append({
        'category': category,
        'title': n.get('title', 'Untitled'),
        'nid': n.get('id', '?'),
        'type': n.get('type', 'unknown'),
        'created': n.get('createdAt', ''),
        'message': n.get('message', '')[:200],
        'status': 'BLOCKED' if 'BLOCKER' in (n.get('message', '') or '') else 'PENDING'
    })

# Sort by creation date (oldest first)
for key in decisions:
    decisions[key].sort(key=lambda x: x['created'], reverse=True)

# Generate markdown
lines = [
    '# PENDING DECISIONS — Consolidation Report',
    '',
    f'**Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}',
    f'**Total Pending:** {len(unanswered)} items',
    '**Status:** Deduplicated and consolidated by category',
    '',
    '---',
    ''
]

# Summary table
lines.extend([
    '## Quick Status',
    '',
    '| Category | Items | Blocking | Status |',
    '|----------|-------|----------|--------|'
])

blocking_count = 0
for key in sorted(decisions.keys()):
    items = decisions[key]
    category = items[0]['category']
    blocking = sum(1 for i in items if i['status'] == 'BLOCKED')
    blocking_count += blocking
    status_icon = '🔴 BLOCKED' if blocking > 0 else '🟡 PENDING'
    lines.append(f'| {category} | {len(items)} | {blocking} | {status_icon} |')

lines.extend([
    '',
    f'**Total Blocking:** {blocking_count}',
    '',
    '---',
    ''
])

# Detailed section per category
for key in sorted(decisions.keys()):
    items = decisions[key]
    category = items[0]['category']
    
    lines.append(f'## {category}')
    lines.append('')
    
    for item in items:
        status_mark = '🔴' if item['status'] == 'BLOCKED' else '🟡'
        date_str = ''
        if item['created']:
            try:
                dt = datetime.fromisoformat(item['created'].replace('Z', '+00:00'))
                date_str = dt.strftime('%b %d, %H:%M')
            except:
                date_str = item['created'][:10]
        
        lines.append(f'### {status_mark} {item["title"]}')
        lines.append(f'**Pending since:** {date_str}')
        lines.append(f'**ID:** `{item["nid"]}`')
        lines.append('')
        lines.append(f'{item["message"]}')
        lines.append('')
    
    lines.append('')

# Recommendations section
lines.extend([
    '---',
    '',
    '## Action Required',
    '',
    '**BLOCKING DECISIONS (must decide before proceeding):**',
    ''
])

blocking_items = [i for items in decisions.values() for i in items if i['status'] == 'BLOCKED']
if blocking_items:
    for item in blocking_items:
        lines.append(f'1. **{item["title"]}** (ID: `{item["nid"]}`)')
else:
    lines.append('_(none)_')

lines.extend([
    '',
    '**PENDING DECISIONS (should decide soon):**',
    ''
])

pending_items = [i for items in decisions.values() for i in items if i['status'] == 'PENDING']
if pending_items:
    for item in pending_items[:10]:  # Show first 10
        lines.append(f'1. **{item["title"]}** (ID: `{item["nid"]}`)')
    if len(pending_items) > 10:
        lines.append(f'... and {len(pending_items) - 10} more')
else:
    lines.append('_(none)_')

lines.extend([
    '',
    '---',
    '',
    '_Report auto-generated by `consolidate-pending-decisions.sh`_'
])

# Write output
with open(output_file, 'w') as f:
    f.write('\n'.join(lines))

print(f"✅ Consolidation report written to {output_file}")
print(f"📊 Summary: {len(unanswered)} pending items, {blocking_count} blocking decisions")

PYEOF

if [ $? -eq 0 ]; then
    echo "Consolidation complete. Review at: PENDING-DECISIONS.md"
else
    echo "Consolidation failed" >&2
    exit 1
fi

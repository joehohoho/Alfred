#!/bin/bash
# create-decision-packet.sh — Generate decision packets for Approval Gates + Scope Choices
# Usage: create-decision-packet.sh --type approval|scope [--title "..."] [--context "..."] [options...]
#
# PHASE 2: Decision Packet Automation
# Creates structured decision cards with SLA tracking and escalation logic
# Called by: kanban card creation flow or manual trigger

set -e

TYPE=""
TITLE=""
CONTEXT=""
RISK=""
IMPACT=""
CHOICES=""
RECOMMENDED=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --type) TYPE="$2"; shift 2 ;;
        --title) TITLE="$2"; shift 2 ;;
        --context) CONTEXT="$2"; shift 2 ;;
        --risk) RISK="$2"; shift 2 ;;
        --impact) IMPACT="$2"; shift 2 ;;
        --choices) CHOICES="$2"; shift 2 ;;
        --recommended) RECOMMENDED="$2"; shift 2 ;;
        *) shift ;;
    esac
done

# Validate required fields
if [[ -z "$TYPE" ]] || [[ -z "$TITLE" ]]; then
    echo "Usage: create-decision-packet.sh --type approval|scope --title 'Title' [options...]"
    echo "Required: --type, --title"
    echo "Optional: --context, --risk, --impact, --choices, --recommended"
    exit 1
fi

# Generate packet based on type
if [[ "$TYPE" == "approval" ]]; then
    cat << EOF
# Decision Packet: $TITLE
**Type:** Approval Gate (24h SLA)
**Created:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Context
$CONTEXT

## Decision Required
**What:** $TITLE
**Why:** $RISK
**Impact:** $IMPACT

## Recommendation
$RECOMMENDED

## SLA & Escalation
- **Approval window:** 24 hours
- **Escalation at:** 20 hours (send urgent notification)
- **Auto-action at:** 24h (use recommended default)

## How to Respond
Reply in this card with:
- ✅ **APPROVED** — proceed with recommendation
- ❌ **REJECTED** — explain alternative preference
- 🤔 **MODIFY** — suggest different approach

---
**Status:** AWAITING APPROVAL
**Assigned to:** Joe
**No response by deadline:** Auto-approve recommended default

EOF
elif [[ "$TYPE" == "scope" ]]; then
    cat << EOF
# Decision Packet: $TITLE
**Type:** Scope Choice (48h SLA, auto-apply default)
**Created:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Context
$CONTEXT

## Options
$CHOICES

## Recommendation
**Default Choice:** $RECOMMENDED
**Why:** This balances speed, scope, and risk for immediate validation.

## SLA & Escalation
- **Decision window:** 48 hours
- **Escalation at:** 40 hours (send reminder)
- **Auto-apply default:** 48h (unless you override)

## How to Respond
Reply in this card with:
- **Option A** — choose option A
- **Option B** — choose option B
- **Custom:** — propose different approach

If no response in 48 hours, automatically proceed with: **$RECOMMENDED**

---
**Status:** AWAITING CHOICE
**Assigned to:** Joe
**No response by deadline:** Auto-apply $RECOMMENDED

EOF
else
    echo "Invalid type: $TYPE (must be 'approval' or 'scope')"
    exit 1
fi

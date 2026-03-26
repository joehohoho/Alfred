#!/bin/bash
# hal-task-ack.sh — Report task completion back to Alfred
# Usage: hal-task-ack.sh <task-id> <status> [result-text]
# Status: completed | failed | in-progress

TASK_ID="${1:?Usage: hal-task-ack.sh <task-id> <status> [result]}"
STATUS="${2:?Status required: completed|failed|in-progress}"
RESULT="${3:-}"

curl -s --max-time 10 -X POST "http://192.168.2.74:3001/api/task-ack" \
  -H "Content-Type: application/json" \
  -d "{\"taskId\":\"$TASK_ID\",\"agent\":\"hal\",\"status\":\"$STATUS\",\"result\":\"$RESULT\"}"

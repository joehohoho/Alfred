#!/bin/bash
# Compatibility wrapper: legacy cron/job target.
# Delegates to the maintained weather alert script.

exec /Users/hopenclaw/.openclaw/workspace/scripts/weather-alerts.sh "$@"

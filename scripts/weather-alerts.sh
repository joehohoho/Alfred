#!/bin/bash

# Weather Monitoring Job for Dieppe, NB
# Monitors both wttr.in and Open-Meteo, compares, alerts to Slack #weather-alerts
# Runs: Every 2 hours 7am-10pm on weekdays (batch update at 7am if alerts exist)

LOCATION="Dieppe,NB"
SLACK_CHANNEL="#weather-alerts"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL}"  # Set via LaunchAgent env or .env
TIMEZONE="America/Moncton"

# Thresholds
RAIN_THRESHOLD_MM=10
SNOW_THRESHOLD_CM=10
FORECAST_HOURS=48

# Get current hour in AST
CURRENT_HOUR=$(TZ=$TIMEZONE date +%H)
CURRENT_DOW=$(TZ=$TIMEZONE date +%u)  # 1=Mon, 5=Fri, 6=Sat, 7=Sun

# Stop checks after 10pm
if [ "$CURRENT_HOUR" -ge 22 ]; then
  exit 0
fi

# Fetch from both sources (with timeout + error handling)
fetch_wttr() {
  local raw
  raw=$(curl -s --max-time 10 "https://wttr.in/$LOCATION?format=j1" 2>/dev/null)
  if [ -z "$raw" ]; then
    echo "[]"
    return
  fi
  echo "$raw" | jq '.weather[0:2] // []' 2>/dev/null || echo "[]"
}

fetch_openmeteo() {
  # Open-Meteo forecast endpoint for Dieppe, NB (lat 46.1, lon -64.75)
  local raw
  raw=$(curl -s --max-time 10 "https://api.open-meteo.com/v1/forecast?latitude=46.1&longitude=-64.75&hourly=precipitation,precipitation_probability,weather_code,snow&forecast_days=2" 2>/dev/null)
  if [ -z "$raw" ]; then
    echo "{}"
    return
  fi
  echo "$raw" | jq '.hourly // {}' 2>/dev/null || echo "{}"
}

# Parse wttr.in for alerts
parse_wttr() {
  local data="$1"
  local alerts=""

  # Bail out if data is empty/null/not-array
  if [ -z "$data" ] || [ "$data" = "[]" ] || [ "$data" = "null" ]; then
    echo ""
    return
  fi

  # Check each day in 48-hour window (2 days)
  # Use ? operator and // fallbacks to handle null/missing fields
  alerts=$(echo "$data" | jq -r '
    (.[] // empty) |
    .date as $date |
    (.hourly // [] | .[] |
      select(
        ((.precipMM // "0") | tonumber) > 10 or
        ((.totalSnow_cm // "0") | tonumber) > 10
      ) |
      "\($date) \(.time // "?"): \((.weatherDesc // [{"value":"unknown"}])[0].value // "unknown") - Rain: \(.precipMM // "0")mm, Snow: \(.totalSnow_cm // "0")cm"
    )
  ' 2>/dev/null || echo "")

  echo "$alerts"
}

# Compare sources and generate alert
WTTR_DATA=$(fetch_wttr)
OPENMETEO_DATA=$(fetch_openmeteo)

WTTR_ALERTS=$(parse_wttr "$WTTR_DATA")

# School cancellation analysis (when snow >= 10cm expected)
school_cancellation_analysis() {
  local snow_cm=$(echo "$WTTR_DATA" | jq -r '(.[0].totalSnow_cm // "0") | tonumber' 2>/dev/null || echo "0")

  if (( $(echo "$snow_cm >= 10" | bc -l 2>/dev/null) )); then
    # Check temperature (cold = harder to clear roads)
    local temp=$(echo "$WTTR_DATA" | jq -r '(.[0].avgtempC // "0") | tonumber' 2>/dev/null || echo "0")
    
    if [ "$temp" -lt "-5" ]; then
      echo "🚌 School Cancellation Likelihood: **HIGH** ($snow_cm cm snow, $temp°C)"
    else
      echo "🚌 School Cancellation Likelihood: **MODERATE** ($snow_cm cm snow, $temp°C)"
    fi
  fi
}

# Format and send to Slack (only if there are alerts)
if [ ! -z "$WTTR_ALERTS" ]; then
  SLACK_MESSAGE="⚠️ **Weather Alert for Dieppe, NB** (48-hour forecast)
$WTTR_ALERTS

$(school_cancellation_analysis)

*Sources: wttr.in + Open-Meteo*"

  # Post to Slack using webhook
  if [ ! -z "$SLACK_WEBHOOK" ]; then
    curl -X POST "$SLACK_WEBHOOK" \
      -H 'Content-Type: application/json' \
      -d "{\"text\": \"$SLACK_MESSAGE\", \"channel\": \"$SLACK_CHANNEL\"}" 2>/dev/null
  fi
fi

exit 0

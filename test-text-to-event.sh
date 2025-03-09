#!/bin/bash

# Test the text-to-event endpoint with a natural language input
# Usage: ./test-text-to-event.sh "Schedule a meeting tomorrow at 3pm for 1 hour"

TEXT_INPUT=${1:-"Schedule a team meeting tomorrow at 2pm for 45 minutes"}

# Try to detect system timezone
TIMEZONE=$(timedatectl show --property=Timezone 2>/dev/null | cut -d= -f2)
# Fallback to a popular timezone if detection fails
TIMEZONE=${TIMEZONE:-"America/Chicago"}

echo "Sending text input: \"$TEXT_INPUT\""
echo "Using timezone: $TIMEZONE"
echo ""

curl -X POST http://localhost:3000/api/text-to-event \
  -H "Content-Type: application/json" \
  -H "X-Timezone: $TIMEZONE" \
  -d "{\"text\": \"$TEXT_INPUT\"}" | json_pp

echo ""

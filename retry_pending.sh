#!/usr/bin/env bash
# ---------------------------------------------------------------
# retry_pending.sh
#   Re-sends pending WhatsApp messages for a NotifyNow campaign.
#
#   Usage (Git Bash / WSL):
#     chmod +x retry_pending.sh   # one-time only
#     ./retry_pending.sh
#
#   Requirements:
#     • curl
#     • jq (JSON parser) – install via apt, brew, or download the Windows binary.
# ---------------------------------------------------------------

# ----- Configuration ------------------------------------------------
CAMPAIGN_ID=731036664          # change if using another campaign
USERNAME="omkar@gmail.com"
PASSWORD="apiomkar"
BASE_URL="https://developer.notifynow.in/api/wa-unofficial-v1"

# How often we poll the status (seconds)
POLL_INTERVAL=30
# Maximum number of attempts before giving up (0 = infinite)
MAX_ATTEMPTS=0
# ---------------------------------------------------------------

attempt=0
while true; do
    # 1️⃣ Get campaign status
    STATUS_JSON=$(curl -s -X POST "${BASE_URL}/campaigns/${CAMPAIGN_ID}/status" \
        -H "Content-Type: application/json" \
        -d "{\n            \"username\": \"${USERNAME}\",\n            \"password\": \"${PASSWORD}\"\n        }")

    # Abort if response is not valid JSON
    if ! echo "$STATUS_JSON" | jq . > /dev/null 2>&1; then
        echo "❌ Unable to parse response – maybe the API is down."
        echo "Response: $STATUS_JSON"
        exit 1
    fi

    # 2️⃣ Extract fields
    PENDING=$(echo "$STATUS_JSON" | jq '.data.message_breakdown.pending')
    CAMPAIGN_STATUS=$(echo "$STATUS_JSON" | jq -r '.data.campaign_status')
    PROGRESS=$(echo "$STATUS_JSON" | jq '.data.metrics.progress_percentage')

    echo "🕒 $(date '+%Y-%m-%d %H:%M:%S') – Campaign $CAMPAIGN_ID – status: $CAMPAIGN_STATUS – pending: $PENDING – progress: $PROGRESS%"

    # 3️⃣ Stop conditions
    if [[ "$PENDING" -eq 0 ]] || [[ "$CAMPAIGN_STATUS" == "completed" ]] || [[ "$CAMPAIGN_STATUS" == "failed" ]]; then
        echo "✅ No pending messages left (or campaign finished). Exiting."
        break
    fi

    # 4️⃣ Trigger resend of pending messages
    echo "🔁 Resending pending messages..."
    RESEND_RESP=$(curl -s -X POST "${BASE_URL}/send" \
        -H "Content-Type: application/json" \
        -d "{\n            \"campaignId\": ${CAMPAIGN_ID},\n            \"username\": \"${USERNAME}\",\n            \"password\": \"${PASSWORD}\"\n        }")
    echo "   ↳ Resend response: $(echo "$RESEND_RESP" | jq -r '.message // .success')"

    # 5️⃣ Wait before next poll
    ((attempt++))
    if [[ "$MAX_ATTEMPTS" -gt 0 && "$attempt" -ge "$MAX_ATTEMPTS" ]]; then
        echo "⚠️ Reached the maximum number of attempts ($MAX_ATTEMPTS). Exiting."
        break
    fi
    sleep "$POLL_INTERVAL"

done

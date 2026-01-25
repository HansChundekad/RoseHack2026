#!/bin/bash
# Apply database function to Supabase using REST API

set -e

# Load environment variables
source ../../.env

# SQL to execute
SQL=$(cat ../database/functions/get_all_locations.sql)

# Execute SQL via Supabase REST API
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL" | jq -Rs .)}"

echo ""
echo "✅ Database function applied successfully!"

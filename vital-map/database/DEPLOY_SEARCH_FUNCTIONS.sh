#!/bin/bash
# Deploy semantic and hybrid search functions to Supabase
# Usage: This script shows the SQL to copy/paste into Supabase SQL Editor
# Do not run this script directly - copy the SQL functions manually to Supabase

set -e

echo "=================================================="
echo "Semantic & Hybrid Search Deployment Guide"
echo "=================================================="
echo ""
echo "📋 Step 1: Open Supabase SQL Editor"
echo "   URL: https://supabase.com/dashboard/project/izkjkpnozgqcmqgfhixv/sql"
echo ""
echo "=================================================="
echo "📋 Step 2: Deploy semantic_search()"
echo "=================================================="
echo ""
echo "Copy the contents of this file:"
echo "   vital-map/database/functions/semantic_search.sql"
echo ""
cat "$(dirname "$0")/functions/semantic_search.sql"
echo ""
echo "✅ Paste and run in SQL Editor. You should see: 'Success. No rows returned'"
echo ""
echo "=================================================="
echo "📋 Step 3: Deploy hybrid_search()"
echo "=================================================="
echo ""
echo "Copy the contents of this file:"
echo "   vital-map/database/functions/hybrid_search.sql"
echo ""
cat "$(dirname "$0")/functions/hybrid_search.sql"
echo ""
echo "✅ Paste and run in SQL Editor. You should see: 'Success. No rows returned'"
echo ""
echo "=================================================="
echo "📋 Step 4: Verify Deployment"
echo "=================================================="
echo ""
echo "Run this test query in SQL Editor:"
echo ""
cat << 'EOF'
-- Test semantic_search
SELECT COUNT(*) as semantic_function_works
FROM semantic_search(
  (SELECT embedding FROM locations WHERE embedding IS NOT NULL LIMIT 1),
  2.0, 10
);

-- Test hybrid_search
SELECT COUNT(*) as hybrid_function_works
FROM hybrid_search(
  (SELECT embedding FROM locations WHERE embedding IS NOT NULL LIMIT 1),
  -118.2437, 34.0522, 50000, 2.0, 10
);
EOF
echo ""
echo "✅ Both queries should return counts without errors"
echo ""
echo "=================================================="
echo "📋 Step 5: Test from Frontend"
echo "=================================================="
echo ""
echo "See TEST_SEARCH_FUNCTIONS.md for browser console tests"
echo ""
echo "=================================================="
echo "Deployment Complete! 🚀"
echo "=================================================="

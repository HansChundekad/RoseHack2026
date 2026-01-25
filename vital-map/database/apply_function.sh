#!/bin/bash
# Script to apply the get_all_locations function to Supabase
# Usage: Copy and paste the SQL from database/functions/get_all_locations.sql
#        into the Supabase SQL Editor at:
#        https://supabase.com/dashboard/project/izkjkpnozgqcmqgfhixv/sql

echo "============================================"
echo "Apply Database Function to Supabase"
echo "============================================"
echo ""
echo "1. Open Supabase SQL Editor:"
echo "   https://supabase.com/dashboard/project/izkjkpnozgqcmqgfhixv/sql"
echo ""
echo "2. Copy the SQL from: database/functions/get_all_locations.sql"
echo ""
echo "3. Paste and run in the SQL Editor"
echo ""
echo "SQL to execute:"
echo "============================================"
cat "$(dirname "$0")/functions/get_all_locations.sql"
echo "============================================"

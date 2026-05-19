#!/usr/bin/env node
/**
 * Script to apply database function to Supabase
 * Reads SQL file and executes it via Supabase client
 */

const fs = require('fs');
const path = require('path');

// Read environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
if (!SUPABASE_URL) {
  console.error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL env var is required');
  process.exit(1);
}
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_KEY env var is required');
  process.exit(1);
}

// Read SQL file
const sqlPath = path.join(__dirname, '../database/functions/get_all_locations.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

console.log('Applying database function to Supabase...');
console.log('SQL to execute:');
console.log('=====================================');
console.log(sql);
console.log('=====================================\n');

// Use fetch to execute SQL via Supabase REST API
const url = `${SUPABASE_URL}/rest/v1/rpc`;

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
  },
  body: JSON.stringify({
    query: sql
  })
})
.then(response => {
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
})
.then(data => {
  console.log('✅ Function applied successfully!');
  console.log(data);
})
.catch(error => {
  console.error('❌ Error applying function:');
  console.error(error.message);
  console.log('\n📝 Please apply the function manually:');
  console.log('   1. Open: https://supabase.com/dashboard/project/izkjkpnozgqcmqgfhixv/sql');
  console.log('   2. Paste the SQL shown above');
  console.log('   3. Click "Run"');
  process.exit(1);
});

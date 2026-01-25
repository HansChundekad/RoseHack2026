#!/usr/bin/env node
/**
 * Script to apply database function to Supabase
 * Reads SQL file and executes it via Supabase client
 */

const fs = require('fs');
const path = require('path');

// Read environment variables
const SUPABASE_URL = 'https://izkjkpnozgqcmqgfhixv.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6a2prcG5vemdxY21xZ2ZoaXh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI4ODIyMSwiZXhwIjoyMDg0ODY0MjIxfQ.a4i8pttD4jZGmHVVlzyBiSMQqrrPceZxmaOxDRrZpBA';

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

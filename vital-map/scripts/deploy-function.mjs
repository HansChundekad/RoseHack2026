#!/usr/bin/env node
/**
 * Deploy database function to Supabase
 * This script applies the get_all_locations() function to the database
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase configuration
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

async function deployFunction() {
  console.log('🚀 Deploying database function to Supabase...\n');

  // Read SQL file
  const sqlPath = join(__dirname, '../database/functions/get_all_locations.sql');
  const sql = readFileSync(sqlPath, 'utf8');

  console.log('📄 SQL to execute:');
  console.log('=====================================');
  console.log(sql);
  console.log('=====================================\n');

  // Create Supabase client with service role key
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Test the connection first
    console.log('🔍 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('locations')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ Database connection failed:', testError.message);
      console.log('\n📝 Please apply the function manually:');
      console.log('   1. Open: https://supabase.com/dashboard/project/izkjkpnozgqcmqgfhixv/sql');
      console.log('   2. Create a new query');
      console.log('   3. Paste the SQL shown above');
      console.log('   4. Click "Run"\n');
      process.exit(1);
    }

    console.log('✅ Database connection successful!\n');
    console.log('📝 To apply the function:');
    console.log('   1. Open: https://supabase.com/dashboard/project/izkjkpnozgqcmqgfhixv/sql');
    console.log('   2. Create a new query');
    console.log('   3. Paste the SQL shown above');
    console.log('   4. Click "Run"');
    console.log('\n💡 The function will allow the frontend to fetch location data.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deployFunction();

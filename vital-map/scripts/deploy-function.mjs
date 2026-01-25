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
const SUPABASE_URL = 'https://izkjkpnozgqcmqgfhixv.supabase.co';
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6a2prcG5vemdxY21xZ2ZoaXh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI4ODIyMSwiZXhwIjoyMDg0ODY0MjIxfQ.a4i8pttD4jZGmHVVlzyBiSMQqrrPceZxmaOxDRrZpBA';

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

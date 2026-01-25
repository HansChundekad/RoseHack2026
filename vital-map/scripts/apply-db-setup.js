#!/usr/bin/env node
/**
 * Apply database functions and seed data to Supabase
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeSQL(sqlFilePath) {
  console.log(`\nApplying ${path.basename(sqlFilePath)}...`);

  const sql = fs.readFileSync(sqlFilePath, 'utf8');

  // Use Supabase's SQL execution via REST API
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    // If exec endpoint doesn't exist, try direct SQL execution
    // Split SQL into individual statements and execute via pg query
    const { error } = await supabase.rpc('exec_sql', { query: sql });

    if (error) {
      console.error(`❌ Error executing ${path.basename(sqlFilePath)}:`, error.message);
      return false;
    }
  }

  console.log(`✅ ${path.basename(sqlFilePath)} applied successfully`);
  return true;
}

async function main() {
  console.log('🚀 Setting up Supabase database...\n');
  console.log(`Connected to: ${supabaseUrl}`);

  try {
    // Apply database function
    const functionPath = path.join(__dirname, '../database/functions/get_all_locations.sql');
    const success = await executeSQL(functionPath);

    if (!success) {
      console.log('\n⚠️  Function application failed. You may need to apply it manually via Supabase SQL Editor:');
      console.log(`https://supabase.com/dashboard/project/${supabaseUrl.split('//')[1].split('.')[0]}/sql`);
      console.log('\nSQL to execute:');
      console.log(fs.readFileSync(functionPath, 'utf8'));
    } else {
      console.log('\n✅ Database setup completed!');
      console.log('\n📝 Next steps:');
      console.log('1. Check if seed data exists: Open Supabase Table Editor');
      console.log('2. If no data, run: vital-map/database/seeds/001_mock_data.sql');
      console.log('3. Restart your dev server to see the changes');
    }

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n📚 Manual setup instructions:');
    console.log('1. Open Supabase SQL Editor:');
    console.log(`   https://supabase.com/dashboard/project/${supabaseUrl.split('//')[1].split('.')[0]}/sql`);
    console.log('2. Run the SQL from: vital-map/database/functions/get_all_locations.sql');
    console.log('3. Then run: vital-map/database/seeds/001_mock_data.sql');
    process.exit(1);
  }
}

main();

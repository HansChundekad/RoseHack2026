/**
 * Test database connection and display function deployment instructions
 */

import { supabase } from '../lib/supabase';
import { readFileSync } from 'fs';
import { join } from 'path';

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  try {
    // Test connection by querying locations
    const { data, error } = await supabase.from('locations').select('count').limit(1);

    if (error) {
      console.error('❌ Database connection failed:', error.message);
      process.exit(1);
    }

    console.log('✅ Database connection successful!\n');

    // Test if function exists
    console.log('🔍 Testing get_all_locations() function...\n');
    const { data: functionData, error: functionError } = await supabase.rpc('get_all_locations');

    if (functionError) {
      console.log('❌ Function get_all_locations() not found');
      console.log('\n📝 Please apply the function manually:\n');
      console.log('   1. Open: https://supabase.com/dashboard/project/izkjkpnozgqcmqgfhixv/sql');
      console.log('   2. Create a new query');
      console.log('   3. Copy and paste the SQL from:');
      console.log('      vital-map/database/functions/get_all_locations.sql');
      console.log('   4. Click "Run"\n');

      // Show the SQL
      const sqlPath = join(__dirname, '../../database/functions/get_all_locations.sql');
      const sql = readFileSync(sqlPath, 'utf8');
      console.log('SQL to execute:');
      console.log('=====================================');
      console.log(sql);
      console.log('=====================================\n');
    } else {
      console.log(`✅ Function works! Found ${functionData?.length || 0} locations\n`);
      if (functionData && functionData.length > 0) {
        console.log('Sample location:', functionData[0]);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testConnection();

/**
 * Supabase client configuration
 * 
 * Initializes and exports the Supabase client for database operations.
 * Uses environment variables for configuration to keep credentials secure.
 * 
 * Environment variables required:
 * - NEXT_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anonymous/public key
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks for development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Validate that required environment variables are set (only in browser)
if (typeof window !== 'undefined' && (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
  console.warn(
    'Supabase environment variables not set. ' +
    'Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

/**
 * Supabase client instance
 * 
 * This client is configured for use in the browser and can be used
 * throughout the application for database queries and RPC calls.
 * 
 * Note: Uses placeholder values if environment variables are not set,
 * allowing the app to build without errors. Actual queries will fail
 * until proper credentials are configured.
 * 
 * @example
 * const { data, error } = await supabase
 *   .from('resources')
 *   .select('*');
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable auth persistence for now
  },
});

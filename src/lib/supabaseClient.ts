import { createClient } from './supabase/client';

// Create and export the main Supabase client for client-side usage
export const supabase = createClient();

// Re-export the createClient function for custom usage
export { createClient } from './supabase/client'; 
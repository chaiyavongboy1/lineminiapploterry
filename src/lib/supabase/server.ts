import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
// Use this in API routes and server components
export function createServerClient() {
    return createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key (singleton per process)
let _serverClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createServerClient() {
    if (_serverClient) return _serverClient;
    _serverClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: { persistSession: false },
            global: {
                headers: { 'x-my-custom-header': 'lottery-app' },
            },
        }
    );
    return _serverClient;
}

import { createBrowserClient } from '@supabase/ssr';

// Singleton browser client — avoids creating a new connection on every call
let _client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
    if (_client) return _client;
    _client = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    return _client;
}

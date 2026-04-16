import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types';

// GET /api/settings?key=xxx — Read a setting
export async function GET(req: NextRequest) {
    try {
        const key = new URL(req.url).searchParams.get('key');
        if (!key) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Missing key' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();
        const { data, error } = await (supabase as any)
            .from('app_settings')
            .select('value')
            .eq('key', key)
            .single();

        if (error && error.code !== 'PGRST116') {
            return NextResponse.json<ApiResponse>(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: data?.value || null,
        });
    } catch (err) {
        console.error('Get settings error:', err);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/settings — Save a setting
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { key, value } = body;

        if (!key || value === undefined) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Missing key or value' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        const { error } = await (supabase as any)
            .from('app_settings')
            .upsert(
                { key, value, updated_at: new Date().toISOString() },
                { onConflict: 'key' }
            );

        if (error) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse>({ success: true });
    } catch (err) {
        console.error('Save settings error:', err);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

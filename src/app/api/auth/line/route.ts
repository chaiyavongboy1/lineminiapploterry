import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { ApiResponse, User } from '@/types';

// POST /api/auth/line — Upsert user from LINE Mini App profile, returns role
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, displayName, pictureUrl, statusMessage } = body;

        if (!userId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Missing userId' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        // Upsert user and return full row including role
        const { data, error } = await (supabase as any)
            .from('users')
            .upsert(
                {
                    line_user_id: userId,
                    display_name: displayName || null,
                    picture_url: pictureUrl || null,
                    status_message: statusMessage || null,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'line_user_id' }
            )
            .select('id, line_user_id, display_name, picture_url, role, created_at, updated_at')
            .single();

        if (error) {
            console.error('Upsert user error:', error);
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Failed to save user' },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse<User>>({
            success: true,
            data: data as User,
        });
    } catch (err) {
        console.error('Auth error:', err);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

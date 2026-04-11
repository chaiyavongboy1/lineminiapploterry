import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types';

// GET /api/profile?lineUserId=xxx
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const lineUserId = searchParams.get('lineUserId');

        if (!lineUserId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'lineUserId is required' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        // Find user by line_user_id
        const { data: user } = await supabase
            .from('users')
            .select('id, display_name, picture_url')
            .eq('line_user_id', lineUserId)
            .single();

        if (!user) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // Get profile
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        return NextResponse.json<ApiResponse>({
            success: true,
            data: { user, profile },
        });
    } catch (err) {
        console.error('Profile GET error:', err);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/profile — Create or update profile
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { lineUserId, fullName, bankName, bankAccountNumber, promptpayNumber } = body;

        if (!lineUserId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'lineUserId is required' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        // Find user
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('line_user_id', lineUserId)
            .single();

        if (!user) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // Upsert profile
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .upsert({
                user_id: user.id,
                full_name: fullName || null,
                bank_name: bankName || null,
                bank_account_number: bankAccountNumber || null,
                promptpay_number: promptpayNumber || null,
                updated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id',
            })
            .select()
            .single();

        if (error) {
            console.error('Profile upsert error:', error);
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Failed to save profile' },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: profile,
        });
    } catch (err) {
        console.error('Profile POST error:', err);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

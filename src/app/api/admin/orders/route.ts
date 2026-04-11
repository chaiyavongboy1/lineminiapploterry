import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types';

// GET /api/admin/orders — Get all orders with filters (admin)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const lineUserId = searchParams.get('adminLineUserId');

        if (!lineUserId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const supabase = createServerClient();

        // Verify admin role
        const { data: admin } = await supabase
            .from('users')
            .select('id, role')
            .eq('line_user_id', lineUserId)
            .single();

        if (!admin || admin.role !== 'admin') {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Forbidden — admin only' },
                { status: 403 }
            );
        }

        let query = supabase
            .from('orders')
            .select(`
        *,
        user:users!orders_user_id_fkey(id, display_name, picture_url, line_user_id),
        lottery_type:lottery_types(id, name),
        order_lines(*),
        payment_slips(*)
      `)
            .order('created_at', { ascending: false });

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: orders, error } = await query;

        if (error) {
            console.error('Admin get orders error:', error);
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Failed to fetch orders' },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: orders,
        });
    } catch (err) {
        console.error('Admin orders error:', err);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

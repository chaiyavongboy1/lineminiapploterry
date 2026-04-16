import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types';

// GET /api/admin/orders — Get all orders with filters (admin)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const lotteryTypeId = searchParams.get('lotteryTypeId');
        const lineUserId = searchParams.get('adminLineUserId');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const offset = (page - 1) * limit;

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
            .single() as { data: { id: string; role: string } | null };

        if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Forbidden — admin only' },
                { status: 403 }
            );
        }

        // Build both queries with shared filters
        let countQuery = supabase
            .from('orders')
            .select('id', { count: 'exact', head: true });

        let dataQuery = supabase
            .from('orders')
            .select(`
                *,
                user:users!orders_user_id_fkey(id, display_name, picture_url, line_user_id),
                lottery_type:lottery_types(id, name),
                order_lines(*),
                payment_slips(id, slip_image_url)
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (status && status !== 'all') {
            countQuery = countQuery.eq('status', status);
            dataQuery = dataQuery.eq('status', status);
        }
        if (lotteryTypeId && lotteryTypeId !== 'all') {
            countQuery = countQuery.eq('lottery_type_id', lotteryTypeId);
            dataQuery = dataQuery.eq('lottery_type_id', lotteryTypeId);
        }

        // Run count + data in parallel
        const [{ count: totalCount }, { data: orders, error }] = await Promise.all([
            countQuery,
            dataQuery,
        ]);

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
            pagination: { page, limit, total: totalCount || 0 },
        } as any);
    } catch (err) {
        console.error('Admin orders error:', err);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

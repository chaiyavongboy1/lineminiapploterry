import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types';

// GET /api/admin/stats — Get aggregate stats for admin dashboard
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
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

        if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Forbidden — admin only' },
                { status: 403 }
            );
        }

        // Run all independent queries in parallel
        const [
            totalOrdersResult,
            pendingReviewResult,
            approvedResult,
            revenueResult,
            pendingByTypeResult,
            recentOrdersResult,
        ] = await Promise.all([
            // Total orders
            supabase
                .from('orders')
                .select('id', { count: 'exact', head: true }),

            // Pending review count
            supabase
                .from('orders')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'pending_review'),

            // Approved count
            supabase
                .from('orders')
                .select('id', { count: 'exact', head: true })
                .in('status', ['approved', 'completed']),

            // Revenue — only fetch the column we need
            supabase
                .from('orders')
                .select('total_amount')
                .in('status', ['approved', 'completed']),

            // Pending by lottery type
            supabase
                .from('orders')
                .select('lottery_type_id')
                .eq('status', 'pending_review'),

            // Recent 5 orders
            supabase
                .from('orders')
                .select(`
                    *,
                    user:users!orders_user_id_fkey(id, display_name, picture_url, line_user_id),
                    lottery_type:lottery_types(id, name),
                    order_lines(*),
                    payment_slips(id, slip_image_url)
                `)
                .order('created_at', { ascending: false })
                .range(0, 4),
        ]);

        const totalRevenue = (revenueResult.data || []).reduce(
            (sum, o) => sum + Number(o.total_amount || 0), 0
        );

        const pendingByLotteryType: Record<string, number> = {};
        for (const order of pendingByTypeResult.data || []) {
            const id = order.lottery_type_id;
            pendingByLotteryType[id] = (pendingByLotteryType[id] || 0) + 1;
        }

        return NextResponse.json({
            success: true,
            data: {
                totalOrders: totalOrdersResult.count || 0,
                pendingReview: pendingReviewResult.count || 0,
                approved: approvedResult.count || 0,
                totalRevenue,
                pendingByLotteryType,
                recentOrders: recentOrdersResult.data || [],
            },
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

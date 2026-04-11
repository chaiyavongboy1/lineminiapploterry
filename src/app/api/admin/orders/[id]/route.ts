import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types';

// GET /api/admin/orders/[id] — Get single order detail (admin)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: orderId } = await params;
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

        if (!admin || admin.role !== 'admin') {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Forbidden — admin only' },
                { status: 403 }
            );
        }

        // Fetch order with relations using disambiguated FK
        const { data: order, error } = await supabase
            .from('orders')
            .select(`
                *,
                user:users!orders_user_id_fkey(id, display_name, picture_url, line_user_id),
                lottery_type:lottery_types(id, name),
                order_lines(*),
                payment_slips(*),
                ticket_images(*)
            `)
            .eq('id', orderId)
            .single();

        if (error || !order) {
            console.error('Admin get order detail error:', error);
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Order not found' },
                { status: 404 }
            );
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: order,
        });
    } catch (err) {
        console.error('Admin order detail error:', err);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { generateOrderNumber } from '@/lib/utils';
import type { ApiResponse, Order } from '@/types';

// POST /api/orders — Create a new order
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            lineUserId,
            lotteryTypeId,
            drawDate,
            lines, // Array of { numbers: number[], specialNumber: number | null, isQuickPick: boolean }
        } = body;

        if (!lineUserId || !lotteryTypeId || !drawDate || !lines?.length) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        // Get user
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

        // Get lottery type for pricing
        const { data: lotteryType } = await supabase
            .from('lottery_types')
            .select('*')
            .eq('id', lotteryTypeId)
            .single();

        if (!lotteryType) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Lottery type not found' },
                { status: 404 }
            );
        }

        const totalLines = lines.length;
        const subtotal = totalLines * Number(lotteryType.price_per_line);
        const serviceFee = totalLines * Number(lotteryType.service_fee);
        const totalAmount = subtotal + serviceFee;
        const orderNumber = generateOrderNumber();

        // Duplicate order prevention:
        // Check if user has a recent order (within 2 minutes) for the same lottery type
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { data: recentOrder } = await supabase
            .from('orders')
            .select('id, order_number, created_at')
            .eq('user_id', user.id)
            .eq('lottery_type_id', lotteryTypeId)
            .eq('total_lines', totalLines)
            .gte('created_at', twoMinutesAgo)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (recentOrder) {
            // Return the existing order instead of creating a duplicate
            console.warn(`Duplicate order prevented for user ${user.id}, returning existing order ${recentOrder.order_number}`);
            const { data: existingOrder } = await supabase
                .from('orders')
                .select('*')
                .eq('id', recentOrder.id)
                .single();

            return NextResponse.json<ApiResponse<Order>>({
                success: true,
                data: existingOrder as Order,
            });
        }

        // Create order
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                order_number: orderNumber,
                user_id: user.id,
                lottery_type_id: lotteryTypeId,
                draw_date: drawDate,
                total_lines: totalLines,
                subtotal,
                service_fee: serviceFee,
                total_amount: totalAmount,
                status: 'pending_payment',
            })
            .select()
            .single();

        if (orderError) {
            console.error('Create order error:', orderError);
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Failed to create order' },
                { status: 500 }
            );
        }

        // Create order lines
        const orderLines = lines.map((line: { numbers: number[]; specialNumber: number | null; isQuickPick: boolean }, index: number) => ({
            order_id: order.id,
            line_number: index + 1,
            numbers: line.numbers,
            special_number: line.specialNumber,
            is_quick_pick: line.isQuickPick || false,
        }));

        const { error: linesError } = await supabase
            .from('order_lines')
            .insert(orderLines);

        if (linesError) {
            console.error('Create order lines error:', linesError);
            // Cleanup order
            await supabase.from('orders').delete().eq('id', order.id);
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Failed to create order lines' },
                { status: 500 }
            );
        }

        return NextResponse.json<ApiResponse<Order>>({
            success: true,
            data: order as Order,
        });
    } catch (err) {
        console.error('Create order error:', err);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET /api/orders?lineUserId=xxx — Get orders for a user
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const lineUserId = searchParams.get('lineUserId');

        if (!lineUserId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Missing lineUserId' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        // Get user
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

        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
        *,
        lottery_type:lottery_types(*),
        order_lines(*),
        payment_slips(*),
        ticket_images(*)
      `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Get orders error:', error);
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
        console.error('Get orders error:', err);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

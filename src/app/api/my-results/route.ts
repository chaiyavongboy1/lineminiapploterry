import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/my-results — Customer view their lottery results
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const lineUserId = searchParams.get('lineUserId');

        if (!lineUserId) {
            return NextResponse.json({ success: false, error: 'Missing lineUserId' }, { status: 400 });
        }

        const supabase = createServerClient();

        // Find user
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('line_user_id', lineUserId)
            .single();

        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // Get user's orders with draw results
        const { data: orders } = await supabase
            .from('orders')
            .select(`
                id,
                order_number,
                draw_date,
                status,
                purchased_at,
                lottery_type:lottery_types(id, name),
                order_lines(
                    id,
                    line_number,
                    numbers,
                    special_number,
                    is_quick_pick
                )
            `)
            .eq('user_id', user.id)
            .in('status', ['approved', 'completed'])
            .order('draw_date', { ascending: false });

        if (!orders?.length) {
            return NextResponse.json({ success: true, data: [] });
        }

        // For each order, get line results
        const ordersWithResults = await Promise.all(
            orders.map(async (order) => {
                const lineIds = order.order_lines?.map((l: { id: string }) => l.id) || [];

                if (!lineIds.length) {
                    return { ...order, results: [], hasDrawResult: false };
                }

                const { data: lineResults } = await supabase
                    .from('order_line_results')
                    .select(`
                        *,
                        prize_tier:prize_tiers(prize_name, prize_amount, tier_order),
                        draw_result:draw_results(draw_date, winning_numbers, special_number)
                    `)
                    .in('order_line_id', lineIds);

                // Get draw result for this lottery+date
                const lotteryType = order.lottery_type as unknown as { id: string } | null;
                const { data: drawResult } = await supabase
                    .from('draw_results')
                    .select('id, draw_date, winning_numbers, special_number')
                    .eq('lottery_type_id', lotteryType?.id || '')
                    .eq('draw_date', order.draw_date)
                    .single();

                return {
                    ...order,
                    results: lineResults || [],
                    drawResult: drawResult || null,
                    hasDrawResult: !!drawResult,
                };
            })
        );

        return NextResponse.json({ success: true, data: ordersWithResults });
    } catch (err) {
        console.error('Error fetching my results:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

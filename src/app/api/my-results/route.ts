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

        // Get user's orders with draw results — single query, no N+1
        const { data: orders } = await supabase
            .from('orders')
            .select(`
                id,
                order_number,
                draw_date,
                status,
                purchased_at,
                lottery_type_id,
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

        // Collect all order line IDs and all lottery_type+draw_date pairs to batch-fetch
        const allLineIds: string[] = [];
        const drawLookups = new Set<string>(); // "lotteryTypeId|drawDate"

        for (const order of orders) {
            const lines = order.order_lines as { id: string }[] | null;
            if (lines) {
                for (const l of lines) allLineIds.push(l.id);
            }
            const lt = order.lottery_type as unknown as { id: string } | null;
            if (lt?.id && order.draw_date) {
                drawLookups.add(`${lt.id}|${order.draw_date}`);
            }
        }

        // Batch fetch: line results + draw results in parallel
        const [lineResultsRes, drawResultsRes] = await Promise.all([
            // All order_line_results at once instead of per-order
            allLineIds.length > 0
                ? supabase
                    .from('order_line_results')
                    .select(`
                        *,
                        prize_tier:prize_tiers(prize_name, prize_amount, tier_order),
                        draw_result:draw_results(draw_date, winning_numbers, special_number)
                    `)
                    .in('order_line_id', allLineIds)
                : Promise.resolve({ data: [] }),

            // All draw results at once — fetch all for relevant lottery types
            supabase
                .from('draw_results')
                .select('id, draw_date, winning_numbers, special_number, lottery_type_id'),
        ]);

        const allLineResults = lineResultsRes.data || [];
        const allDrawResults = drawResultsRes.data || [];

        // Index line results by order_line_id for fast lookup
        const lineResultsByLineId = new Map<string, typeof allLineResults>();
        for (const lr of allLineResults) {
            const arr = lineResultsByLineId.get(lr.order_line_id) || [];
            arr.push(lr);
            lineResultsByLineId.set(lr.order_line_id, arr);
        }

        // Index draw results by "lotteryTypeId|drawDate"
        const drawResultMap = new Map<string, (typeof allDrawResults)[0]>();
        for (const dr of allDrawResults) {
            drawResultMap.set(`${dr.lottery_type_id}|${dr.draw_date}`, dr);
        }

        // Build response — no additional DB queries
        const ordersWithResults = orders.map((order) => {
            const lines = order.order_lines as { id: string }[] | null;
            const lineIds = lines?.map(l => l.id) || [];

            const results: typeof allLineResults = [];
            for (const lid of lineIds) {
                const lr = lineResultsByLineId.get(lid);
                if (lr) results.push(...lr);
            }

            const lt = order.lottery_type as unknown as { id: string } | null;
            const drawKey = `${lt?.id || ''}|${order.draw_date}`;
            const drawResult = drawResultMap.get(drawKey) || null;

            return {
                ...order,
                results,
                drawResult,
                hasDrawResult: !!drawResult,
            };
        });

        return NextResponse.json({ success: true, data: ordersWithResults });
    } catch (err) {
        console.error('Error fetching my results:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

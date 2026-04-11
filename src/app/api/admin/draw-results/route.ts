import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { checkLine, findPrizeTier } from '@/lib/prize-checker';
import type { PrizeTier } from '@/types';

// GET /api/admin/draw-results — List all draw results
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const lotteryTypeId = searchParams.get('lottery_type_id');

        const supabase = createServerClient();

        let query = supabase
            .from('draw_results')
            .select(`
                *,
                lottery_type:lottery_types(id, name)
            `)
            .order('draw_date', { ascending: false })
            .limit(50);

        if (lotteryTypeId) {
            query = query.eq('lottery_type_id', lotteryTypeId);
        }

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // For each draw result, count winners
        const resultsWithStats = await Promise.all(
            (data || []).map(async (draw) => {
                const { data: lineResults } = await supabase
                    .from('order_line_results')
                    .select('is_winner, prize_amount')
                    .eq('draw_result_id', draw.id);

                const totalChecked = lineResults?.length || 0;
                const totalWinners = lineResults?.filter(r => r.is_winner).length || 0;
                const totalPrizeAmount = lineResults?.reduce((sum, r) => sum + (r.prize_amount || 0), 0) || 0;

                return { ...draw, totalChecked, totalWinners, totalPrizeAmount };
            })
        );

        return NextResponse.json({ success: true, data: resultsWithStats });
    } catch (err) {
        console.error('Error fetching draw results:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/admin/draw-results — Manually add draw result + auto-check
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { lottery_type_id, draw_date, winning_numbers, special_number, jackpot_amount } = body;

        if (!lottery_type_id || !draw_date || !winning_numbers?.length) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = createServerClient();

        // Check if result already exists
        const { data: existing } = await supabase
            .from('draw_results')
            .select('id')
            .eq('lottery_type_id', lottery_type_id)
            .eq('draw_date', draw_date)
            .single();

        if (existing) {
            return NextResponse.json({ success: false, error: 'ผลรางวัลงวดนี้มีอยู่แล้ว' }, { status: 409 });
        }

        // Insert draw result
        const { data: drawResult, error: insertError } = await supabase
            .from('draw_results')
            .insert({
                lottery_type_id,
                draw_date,
                winning_numbers,
                special_number: special_number ?? null,
                jackpot_amount: jackpot_amount || null,
            })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
        }

        // Auto-check all orders for this draw
        const checkResults = await autoCheckOrders(supabase, drawResult.id, lottery_type_id, draw_date);

        return NextResponse.json({
            success: true,
            data: drawResult,
            checkResults: {
                totalChecked: checkResults.length,
                totalWinners: checkResults.filter(r => r.is_winner).length,
            },
        });
    } catch (err) {
        console.error('Error creating draw result:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// ============================================================
// Auto-check orders against draw results
// ============================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function autoCheckOrders(supabase: any, drawResultId: string, lotteryTypeId: string, drawDate: string) {
    // 1. Get prize tiers for this lottery type
    const { data: prizeTiers } = await supabase
        .from('prize_tiers')
        .select('*')
        .eq('lottery_type_id', lotteryTypeId);

    // 2. Get the draw result winning numbers
    const { data: drawResult } = await supabase
        .from('draw_results')
        .select('*')
        .eq('id', drawResultId)
        .single();

    if (!drawResult || !prizeTiers?.length) return [];

    // 3. Find all order_lines for orders matching this lottery_type_id & draw_date
    //    - Only 'completed' orders (ซื้อสินค้าแล้ว)
    //    - Order must have been created on or before the draw date
    const { data: orders } = await supabase
        .from('orders')
        .select('id, created_at')
        .eq('lottery_type_id', lotteryTypeId)
        .eq('draw_date', drawDate)
        .in('status', ['approved', 'completed']);

    if (!orders?.length) return [];

    const orderIds = orders.map((o: { id: string }) => o.id);

    const { data: orderLines } = await supabase
        .from('order_lines')
        .select('*')
        .in('order_id', orderIds);

    if (!orderLines?.length) return [];

    // 4. Check each line
    const results = [];
    for (const line of orderLines) {
        const check = checkLine(
            line.numbers,
            line.special_number,
            drawResult.winning_numbers,
            drawResult.special_number
        );

        const tier = findPrizeTier(check.matchCount, check.matchSpecial, prizeTiers as PrizeTier[]);
        const isWinner = tier !== null;

        const resultRow = {
            order_line_id: line.id,
            draw_result_id: drawResultId,
            matched_numbers: check.matchedNumbers,
            matched_special: check.matchSpecial,
            match_count: check.matchCount,
            prize_tier_id: tier?.id || null,
            prize_amount: tier?.prize_amount || 0,
            is_winner: isWinner,
        };

        results.push(resultRow);
    }

    // 5. Upsert results
    if (results.length > 0) {
        await supabase
            .from('order_line_results')
            .upsert(results, { onConflict: 'order_line_id,draw_result_id' });
    }

    return results;
}

// PUT /api/admin/draw-results — Re-check all orders against an existing draw result
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { draw_result_id } = body;

        if (!draw_result_id) {
            return NextResponse.json({ success: false, error: 'Missing draw_result_id' }, { status: 400 });
        }

        const supabase = createServerClient();

        // Get the draw result
        const { data: drawResult, error: fetchError } = await supabase
            .from('draw_results')
            .select('*, lottery_type:lottery_types(id, name)')
            .eq('id', draw_result_id)
            .single();

        if (fetchError || !drawResult) {
            return NextResponse.json({ success: false, error: 'Draw result not found' }, { status: 404 });
        }

        // Delete existing check results first (fresh re-check)
        await supabase
            .from('order_line_results')
            .delete()
            .eq('draw_result_id', draw_result_id);

        // Re-run the check
        const checkResults = await autoCheckOrders(
            supabase,
            draw_result_id,
            drawResult.lottery_type_id,
            drawResult.draw_date
        );

        return NextResponse.json({
            success: true,
            message: `ตรวจซ้ำเรียบร้อย`,
            checkResults: {
                totalChecked: checkResults.length,
                totalWinners: checkResults.filter((r: { is_winner: boolean }) => r.is_winner).length,
            },
        });
    } catch (err) {
        console.error('Error re-checking draw result:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

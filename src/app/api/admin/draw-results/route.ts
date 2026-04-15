import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { checkLine, findPrizeTier } from '@/lib/prize-checker';
import { notifyUserWonPrize } from '@/lib/line-messaging';
import type { PrizeTier } from '@/types';

// GET /api/admin/draw-results — List all draw results
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const lotteryTypeId = searchParams.get('lottery_type_id');
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const offset = (page - 1) * limit;

        const supabase = createServerClient();

        // Build count + data queries with shared filters
        let countQuery = supabase
            .from('draw_results')
            .select('id', { count: 'exact', head: true });

        let dataQuery = supabase
            .from('draw_results')
            .select(`
                *,
                lottery_type:lottery_types(id, name)
            `)
            .order('draw_date', { ascending: false })
            .range(offset, offset + limit - 1);

        if (lotteryTypeId) {
            countQuery = countQuery.eq('lottery_type_id', lotteryTypeId);
            dataQuery = dataQuery.eq('lottery_type_id', lotteryTypeId);
        }

        // Run count + data in parallel
        const [{ count: totalCount }, { data, error }] = await Promise.all([
            countQuery,
            dataQuery,
        ]);

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Batch fetch winner stats for all draw results in ONE query (fixing N+1)
        const drawIds = (data || []).map(d => d.id);
        let statsMap: Record<string, { totalChecked: number; totalWinners: number; totalPrizeAmount: number }> = {};

        if (drawIds.length > 0) {
            const { data: allLineResults } = await supabase
                .from('order_line_results')
                .select('draw_result_id, is_winner, prize_amount')
                .in('draw_result_id', drawIds);

            // Aggregate in JS
            for (const r of allLineResults || []) {
                if (!statsMap[r.draw_result_id]) {
                    statsMap[r.draw_result_id] = { totalChecked: 0, totalWinners: 0, totalPrizeAmount: 0 };
                }
                statsMap[r.draw_result_id].totalChecked++;
                if (r.is_winner) statsMap[r.draw_result_id].totalWinners++;
                statsMap[r.draw_result_id].totalPrizeAmount += r.prize_amount || 0;
            }
        }

        const resultsWithStats = (data || []).map(draw => ({
            ...draw,
            ...(statsMap[draw.id] || { totalChecked: 0, totalWinners: 0, totalPrizeAmount: 0 }),
        }));

        return NextResponse.json({
            success: true,
            data: resultsWithStats,
            pagination: { page, limit, total: totalCount || 0 },
        });
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
    const { data: prizeTiers, error: ptError } = await supabase
        .from('prize_tiers')
        .select('*')
        .eq('lottery_type_id', lotteryTypeId);

    if (ptError) {
        console.error('[autoCheck] Failed to fetch prize_tiers:', ptError.message);
    }

    // 2. Get the draw result winning numbers
    const { data: drawResult } = await supabase
        .from('draw_results')
        .select('*')
        .eq('id', drawResultId)
        .single();

    if (!drawResult) {
        console.error('[autoCheck] Draw result not found:', drawResultId);
        return [];
    }

    if (!prizeTiers?.length) {
        console.error(`[autoCheck] ⚠️ NO PRIZE TIERS found for lottery_type_id=${lotteryTypeId}. Winners cannot be determined! Run 009_reseed_prize_tiers.sql to fix.`);
        return [];
    }


    // 3. Get lottery type name for notifications
    const { data: lotteryType } = await supabase
        .from('lottery_types')
        .select('name')
        .eq('id', lotteryTypeId)
        .single();

    // 4. Find all order_lines for orders matching this lottery_type_id & draw_date
    //    - Only 'approved' or 'completed' orders (ชำระเงินแล้ว / ซื้อสินค้าแล้ว)
    const { data: orders } = await supabase
        .from('orders')
        .select('id, user_id, created_at')
        .eq('lottery_type_id', lotteryTypeId)
        .eq('draw_date', drawDate)
        .in('status', ['approved', 'completed']);

    if (!orders?.length) {
        return [];
    }


    const orderIds = orders.map((o: { id: string }) => o.id);

    // Build a map: order_id -> user_id
    const orderUserMap = new Map<string, string>();
    for (const o of orders) {
        orderUserMap.set(o.id, o.user_id);
    }

    const { data: orderLines } = await supabase
        .from('order_lines')
        .select('*')
        .in('order_id', orderIds);

    if (!orderLines?.length) {
        return [];
    }

    // Ensure winning numbers are proper number arrays (guard against type coercion issues)
    const winNums: number[] = (drawResult.winning_numbers || []).map(Number);
    const winSpecial: number | null = drawResult.special_number != null ? Number(drawResult.special_number) : null;


    // 5. Check each line
    const results = [];
    for (const line of orderLines) {
        // Coerce customer numbers to ensure proper comparison
        const custNums: number[] = (line.numbers || []).map(Number);
        const custSpecial: number | null = line.special_number != null ? Number(line.special_number) : null;

        const check = checkLine(custNums, custSpecial, winNums, winSpecial);

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

    // 6. Upsert results
    if (results.length > 0) {
        const { error: upsertError } = await supabase
            .from('order_line_results')
            .upsert(results, { onConflict: 'order_line_id,draw_result_id' });

        if (upsertError) {
            console.error('[autoCheck] Failed to upsert results:', upsertError.message);
        }
    }

    // 7. Send push notifications to all winners
    const winners = results.filter(r => r.is_winner);

    if (winners.length > 0) {
        // Collect unique user IDs for winners
        const winnerUserIds = new Set<string>();
        const winnerDetails: { userId: string; prizeName: string; prizeAmount: number }[] = [];

        for (const winner of winners) {
            // Find order_id from orderLines
            const line = orderLines?.find((l: { id: string }) => l.id === winner.order_line_id);
            if (!line) continue;
            const userId = orderUserMap.get(line.order_id);
            if (!userId) continue;

            const tier = (prizeTiers as PrizeTier[]).find(t => t.id === winner.prize_tier_id);
            winnerDetails.push({
                userId,
                prizeName: tier?.prize_name || 'รางวัล',
                prizeAmount: winner.prize_amount,
            });
            winnerUserIds.add(userId);
        }

        // Get LINE user IDs for all winning users
        if (winnerUserIds.size > 0) {
            const { data: winnerUsers } = await supabase
                .from('users')
                .select('id, line_user_id')
                .in('id', Array.from(winnerUserIds));

            const userLineMap = new Map<string, string>();
            for (const u of winnerUsers || []) {
                userLineMap.set(u.id, u.line_user_id);
            }

            // Send notification per winner line
            for (const detail of winnerDetails) {
                const lineUserId = userLineMap.get(detail.userId);
                if (lineUserId) {
                    await notifyUserWonPrize(
                        lineUserId,
                        lotteryType?.name || 'Lottery',
                        detail.prizeName,
                        detail.prizeAmount,
                        drawDate
                    ).catch(err => console.error('Failed to notify winner:', err));
                }
            }
        }
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

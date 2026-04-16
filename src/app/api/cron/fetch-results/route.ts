import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { fetchLatestResults } from '@/lib/lottery-api';
import { checkLine, findPrizeTier } from '@/lib/prize-checker';
import type { PrizeTier } from '@/types';

/**
 * GET /api/cron/fetch-results — Vercel Cron endpoint
 * Automatically fetch latest lottery results and check orders
 * 
 * Query params:
 *   type = "powerball" | "megamillions"
 */
export async function GET(req: NextRequest) {
    try {
        // Verify cron secret (security)
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;
        
        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'powerball';

        const supabase = createServerClient();

        // Map type param to lottery name
        const lotteryNameMap: Record<string, string> = {
            powerball: 'Powerball',
            megamillions: 'Mega Millions',
        };

        const lotteryName = lotteryNameMap[type.toLowerCase()];
        if (!lotteryName) {
            return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
        }

        // Find lottery type in DB
        const { data: lotteryType } = await (supabase as any)
            .from('lottery_types')
            .select('id, name')
            .eq('name', lotteryName)
            .single();

        if (!lotteryType) {
            return NextResponse.json({ error: `Lottery type ${lotteryName} not found in DB` }, { status: 404 });
        }

        // Fetch latest result from external API
        const results = await fetchLatestResults(lotteryType.name, 1);
        if (!results.length) {
            return NextResponse.json({ success: true, message: 'No results available yet', skipped: true });
        }

        const latest = results[0];

        // Check if this result already exists
        const { data: existing } = await supabase
            .from('draw_results')
            .select('id')
            .eq('lottery_type_id', lotteryType.id)
            .eq('draw_date', latest.drawDate)
            .single();

        if (existing) {
            return NextResponse.json({ success: true, message: 'Result already exists', skipped: true });
        }

        // Insert new draw result
        const { data: drawResult, error: insertError } = await (supabase as any)
            .from('draw_results')
            .insert({
                lottery_type_id: lotteryType.id,
                draw_date: latest.drawDate,
                winning_numbers: latest.numbers,
                special_number: latest.specialNumber,
            })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        // Auto-check orders
        const checkResults = await autoCheckOrdersCron(
            supabase, drawResult.id, lotteryType.id, latest.drawDate
        );

        return NextResponse.json({
            success: true,
            message: `New result for ${lotteryName} (${latest.drawDate})`,
            drawResult: {
                id: drawResult.id,
                numbers: latest.numbers,
                specialNumber: latest.specialNumber,
            },
            checked: checkResults.totalChecked,
            winners: checkResults.totalWinners,
        });
    } catch (err) {
        console.error('Cron fetch-results error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function autoCheckOrdersCron(supabase: any, drawResultId: string, lotteryTypeId: string, drawDate: string) {
    const { data: prizeTiers } = await supabase
        .from('prize_tiers')
        .select('*')
        .eq('lottery_type_id', lotteryTypeId);

    const { data: drawResult } = await supabase
        .from('draw_results')
        .select('*')
        .eq('id', drawResultId)
        .single();

    if (!drawResult || !prizeTiers?.length) return { totalChecked: 0, totalWinners: 0 };

    const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('lottery_type_id', lotteryTypeId)
        .eq('draw_date', drawDate)
        .eq('status', 'completed')
        .lte('created_at', `${drawDate}T23:59:59+00:00`);

    if (!orders?.length) return { totalChecked: 0, totalWinners: 0 };

    const { data: orderLines } = await supabase
        .from('order_lines')
        .select('*')
        .in('order_id', orders.map((o: { id: string }) => o.id));

    if (!orderLines?.length) return { totalChecked: 0, totalWinners: 0 };

    const results = [];
    for (const line of orderLines) {
        const check = checkLine(line.numbers, line.special_number, drawResult.winning_numbers, drawResult.special_number);
        const tier = findPrizeTier(check.matchCount, check.matchSpecial, prizeTiers as PrizeTier[]);

        results.push({
            order_line_id: line.id,
            draw_result_id: drawResultId,
            matched_numbers: check.matchedNumbers,
            matched_special: check.matchSpecial,
            match_count: check.matchCount,
            prize_tier_id: tier?.id || null,
            prize_amount: tier?.prize_amount || 0,
            is_winner: tier !== null,
        });
    }

    if (results.length > 0) {
        await supabase
            .from('order_line_results')
            .upsert(results, { onConflict: 'order_line_id,draw_result_id' });
    }

    return {
        totalChecked: results.length,
        totalWinners: results.filter(r => r.is_winner).length,
    };
}

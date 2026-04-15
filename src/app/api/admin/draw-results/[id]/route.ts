import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { checkLine, findPrizeTier } from '@/lib/prize-checker';
import type { PrizeTier } from '@/types';

// ============================================================
// Auto-check orders against draw results (copy from main route)
// ============================================================
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function autoCheckOrders(supabase: any, drawResultId: string, lotteryTypeId: string, drawDate: string) {
    const { data: prizeTiers } = await supabase.from('prize_tiers').select('*').eq('lottery_type_id', lotteryTypeId);
    const { data: drawResult } = await supabase.from('draw_results').select('*').eq('id', drawResultId).single();
    if (!drawResult || !prizeTiers?.length) return [];

    const { data: orders } = await supabase.from('orders').select('id, created_at').eq('lottery_type_id', lotteryTypeId).eq('draw_date', drawDate).eq('status', 'completed').lte('created_at', `${drawDate}T23:59:59+00:00`);
    if (!orders?.length) return [];

    const orderIds = orders.map((o: { id: string }) => o.id);
    const { data: orderLines } = await supabase.from('order_lines').select('*').in('order_id', orderIds);
    if (!orderLines?.length) return [];

    const results = [];
    for (const line of orderLines) {
        const check = checkLine(line.numbers, line.special_number, drawResult.winning_numbers, drawResult.special_number);
        const tier = findPrizeTier(check.matchCount, check.matchSpecial, prizeTiers as PrizeTier[]);
        const isWinner = tier !== null;

        results.push({
            order_line_id: line.id,
            draw_result_id: drawResultId,
            matched_numbers: check.matchedNumbers,
            matched_special: check.matchSpecial,
            match_count: check.matchCount,
            prize_tier_id: tier?.id || null,
            prize_amount: tier?.prize_amount || 0,
            is_winner: isWinner,
        });
    }

    if (results.length > 0) {
        // Clear old results for this draw first
        await supabase.from('order_line_results').delete().eq('draw_result_id', drawResultId);
        // Insert new ones
        await supabase.from('order_line_results').upsert(results, { onConflict: 'order_line_id,draw_result_id' });
    }

    return results;
}

// GET /api/admin/draw-results/[id] — Get enriched draw result details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = createServerClient();

        const { data: drawResult, error: drawError } = await supabase
            .from('draw_results')
            .select(`
                *,
                lottery_type:lottery_types(id, name)
            `)
            .eq('id', id)
            .single();

        if (drawError) return NextResponse.json({ success: false, error: drawError.message }, { status: 500 });
        if (!drawResult) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

        // Load line results
        const { data: results } = await supabase
            .from('order_line_results')
            .select(`
                *,
                prize_tier:prize_tiers(prize_name, tier_order),
                order_line:order_lines(
                    id, line_number, numbers, special_number, order_id
                )
            `)
            .eq('draw_result_id', id)
            .order('is_winner', { ascending: false });

        let enriched: any[] = [];
        if (results && results.length > 0) {
            // Batch: collect all unique order_ids
            const orderIds = Array.from(new Set(
                results
                    .filter((r: any) => r.order_line?.order_id)
                    .map((r: any) => r.order_line.order_id)
            ));

            // Batch fetch all orders + users in one query
            let ordersMap = new Map<string, any>();
            let userProfilesMap = new Map<string, any>();

            if (orderIds.length > 0) {
                const { data: ordersData } = await supabase
                    .from('orders')
                    .select(`
                        id,
                        order_number,
                        purchased_at,
                        user:users!orders_user_id_fkey(id, display_name, line_user_id)
                    `)
                    .in('id', orderIds);

                for (const o of ordersData || []) {
                    ordersMap.set(o.id, o);
                }

                // Collect all user IDs for profile batch fetch
                const userIds = Array.from(new Set(
                    (ordersData || [])
                        .map((o: any) => {
                            const u = Array.isArray(o.user) ? o.user[0] : o.user;
                            return u?.id;
                        })
                        .filter(Boolean)
                ));

                if (userIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from('user_profiles')
                        .select('user_id, bank_name, bank_account_number, promptpay_number')
                        .in('user_id', userIds);

                    for (const p of profiles || []) {
                        userProfilesMap.set(p.user_id, p);
                    }
                }
            }

            // Map results using in-memory data — zero additional queries
            enriched = results.map((r: any) => {
                if (r.order_line?.order_id) {
                    const order = ordersMap.get(r.order_line.order_id);
                    if (order) {
                        const orderUser = Array.isArray(order.user) ? order.user[0] : order.user;
                        const userProfile = orderUser?.id ? userProfilesMap.get(orderUser.id) || null : null;
                        return {
                            ...r,
                            order_info: {
                                order_number: order.order_number,
                                purchased_at: order.purchased_at ?? null,
                                user: orderUser,
                                profile: userProfile,
                            },
                        };
                    }
                }
                return r;
            });
        }

        return NextResponse.json({ success: true, data: { drawResult, lineResults: enriched } });
    } catch (err) {
        console.error('Error getting draw result details:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/admin/draw-results/[id] — Edit draw result
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const body = await req.json();
        const { winning_numbers, special_number } = body;
        const { id } = await params;

        const supabase = createServerClient();
        
        // Update draw result
        const { data: drawResult, error: updateError } = await supabase
            .from('draw_results')
            .update({ winning_numbers, special_number: special_number ?? null })
            .eq('id', id)
            .select()
            .single();

        if (updateError) {
            return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
        }

        // Re-check all orders
        const checkResults = await autoCheckOrders(supabase, drawResult.id, drawResult.lottery_type_id, drawResult.draw_date);

        return NextResponse.json({
            success: true,
            data: drawResult,
            checkResults: {
                totalChecked: checkResults.length,
                totalWinners: checkResults.filter(r => r.is_winner).length,
            },
        });
    } catch (err) {
        console.error('Error updating draw result:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/admin/draw-results/[id] — Delete draw result
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = createServerClient();

        // Check if there are prizes claimed
        const { data: results, error: resultsError } = await supabase
            .from('order_line_results')
            .select('is_winner')
            .eq('draw_result_id', id);

        // Delete draw result. order_line_results has ON DELETE CASCADE so it should handle itself.
        const { error: deleteError } = await supabase.from('draw_results').delete().eq('id', id);

        if (deleteError) {
            return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Error deleting draw result:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

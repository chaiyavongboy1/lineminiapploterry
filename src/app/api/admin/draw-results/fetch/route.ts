import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { fetchLatestResults } from '@/lib/lottery-api';

// POST /api/admin/draw-results/fetch — Auto-fetch from data.ny.gov
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { lottery_type_id } = body;

        if (!lottery_type_id) {
            return NextResponse.json({ success: false, error: 'Missing lottery_type_id' }, { status: 400 });
        }

        const supabase = createServerClient();

        // Get lottery type info
        const { data: lotteryType } = await supabase
            .from('lottery_types')
            .select('*')
            .eq('id', lottery_type_id)
            .single();

        if (!lotteryType) {
            return NextResponse.json({ success: false, error: 'Lottery type not found' }, { status: 404 });
        }

        // Fetch latest results from external API
        const results = await fetchLatestResults(lotteryType.name, 3);

        if (!results.length) {
            return NextResponse.json({ success: false, error: 'ไม่พบข้อมูลผลรางวัลจาก API' }, { status: 404 });
        }

        // Get existing draw dates for this lottery type
        const { data: existingDraws } = await supabase
            .from('draw_results')
            .select('draw_date')
            .eq('lottery_type_id', lottery_type_id);

        const existingDates = (existingDraws || []).map((d: { draw_date: string }) => d.draw_date);

        // Filter out results that already exist
        const newResults = results.filter(r => !existingDates.includes(r.drawDate));

        if (newResults.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'ผลรางวัลเป็นข้อมูลล่าสุดแล้ว ไม่มีงวดใหม่',
                newCount: 0,
            });
        }

        // Insert new results and trigger auto-check for each
        const inserted = [];
        for (const result of newResults) {
            const { data: drawResult, error } = await supabase
                .from('draw_results')
                .insert({
                    lottery_type_id,
                    draw_date: result.drawDate,
                    winning_numbers: result.numbers,
                    special_number: result.specialNumber,
                })
                .select()
                .single();

            if (!error && drawResult) {
                inserted.push(drawResult);

                // Trigger auto-check via the main draw-results API
                const baseUrl = req.nextUrl.origin;
                await fetch(`${baseUrl}/api/admin/draw-results`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lottery_type_id,
                        draw_date: result.drawDate,
                        winning_numbers: result.numbers,
                        special_number: result.specialNumber,
                    }),
                }).catch(() => {
                    // Already inserted, just log
                    console.log('Auto-check will be done on next page load');
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: `ดึงผลรางวัลใหม่ ${inserted.length} งวด`,
            newCount: inserted.length,
            data: inserted,
        });
    } catch (err) {
        console.error('Error fetching results from API:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

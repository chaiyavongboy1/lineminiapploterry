import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { fetchLatestResults } from '@/lib/lottery-api';

// POST /api/admin/draw-results/fetch — Auto-fetch from data.ny.gov
// Body: { lottery_type_id, preview?: boolean, confirmed_results?: [...] }
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { lottery_type_id, preview, confirmed_results } = body;

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

        // ── PREVIEW MODE: Fetch and return without saving ──
        if (preview) {
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

            // Mark which are new vs already exist
            const previewResults = results.map(r => ({
                drawDate: r.drawDate,
                numbers: r.numbers,
                specialNumber: r.specialNumber,
                multiplier: r.multiplier,
                alreadyExists: existingDates.includes(r.drawDate),
            }));

            // Source URL for cross-verification
            const sourceUrl = lotteryType.name.toLowerCase() === 'powerball'
                ? 'https://data.ny.gov/Government-Finance/Lottery-Powerball-Winning-Numbers-Beginning-2010/d6yy-54nr/about_data'
                : 'https://data.ny.gov/Government-Finance/Lottery-Mega-Millions-Winning-Numbers-Beginning-20/5xaw-6ayf/about_data';

            return NextResponse.json({
                success: true,
                preview: true,
                lotteryName: lotteryType.name,
                sourceUrl,
                results: previewResults,
            });
        }

        // ── CONFIRM MODE: Save confirmed results via main draw-results API ──
        if (confirmed_results && Array.isArray(confirmed_results) && confirmed_results.length > 0) {
            const baseUrl = req.nextUrl.origin;
            const saved = [];
            const errors = [];

            for (const result of confirmed_results) {
                try {
                    // Use the main POST endpoint which handles insert + auto-check in one step
                    const res = await fetch(`${baseUrl}/api/admin/draw-results`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            lottery_type_id,
                            draw_date: result.drawDate,
                            winning_numbers: result.numbers,
                            special_number: result.specialNumber,
                        }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        saved.push({
                            ...data.data,
                            checkResults: data.checkResults,
                        });
                    } else {
                        errors.push(`${result.drawDate}: ${data.error}`);
                    }
                } catch (err) {
                    console.error(`Failed to save result for ${result.drawDate}:`, err);
                    errors.push(`${result.drawDate}: บันทึกไม่สำเร็จ`);
                }
            }

            const totalChecked = saved.reduce((sum, s) => sum + (s.checkResults?.totalChecked || 0), 0);
            const totalWinners = saved.reduce((sum, s) => sum + (s.checkResults?.totalWinners || 0), 0);

            return NextResponse.json({
                success: true,
                message: `บันทึกผลรางวัลใหม่ ${saved.length} งวด` +
                    (totalChecked > 0 ? ` — ตรวจ ${totalChecked} lines, ถูกรางวัล ${totalWinners} lines` : '') +
                    (errors.length > 0 ? ` (ข้อผิดพลาด: ${errors.join(', ')})` : ''),
                newCount: saved.length,
                data: saved,
            });
        }

        // ── LEGACY MODE (fallback for cron/external) — fetch + save via main API ──
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

        // Save via main draw-results API (handles insert + auto-check)
        const baseUrl = req.nextUrl.origin;
        const inserted = [];
        for (const result of newResults) {
            try {
                const res = await fetch(`${baseUrl}/api/admin/draw-results`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lottery_type_id,
                        draw_date: result.drawDate,
                        winning_numbers: result.numbers,
                        special_number: result.specialNumber,
                    }),
                });
                const data = await res.json();
                if (data.success) {
                    inserted.push(data.data);
                }
            } catch {
                console.log(`Auto-check for ${result.drawDate} will be done on next page load`);
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

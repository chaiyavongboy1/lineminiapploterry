import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types';

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

        // Get user ID based on line_user_id
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

        // Get winning order line results for this user
        const { data: orderLineResults, error } = await supabase
            .from('order_line_results')
            .select(`
                *,
                order_line:order_lines(
                    numbers,
                    special_number,
                    order_id,
                    order:orders!inner(
                        order_number,
                        user_id,
                        lottery_type_id
                    )
                ),
                draw_result:draw_results(
                    *,
                    lottery_type:lottery_types(name, id)
                ),
                prize_tier:prize_tiers(prize_name)
            `)
            .eq('is_winner', true)
            // Fix: we must filter the inner join for orders to only match this specific user_id
            .eq('order_line.order.user_id', user.id)
            .order('checked_at', { ascending: false });

        if (error) {
            console.error('Get user results error:', error);
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Failed to fetch user results' },
                { status: 500 }
            );
        }

        // Filter out results where the inner join didn't match (though .eq on inner should handle it)
        const userResults = (orderLineResults || []).filter((r: any) => r.order_line?.order?.user_id === user.id);

        // Fetch ticket images and prize transfer slips for these orders
        const orderIds = Array.from(new Set(userResults.map((r: any) => r.order_line.order_id)));

        let ticketImages: any[] = [];
        let prizeTransferSlips: any[] = [];

        if (orderIds.length > 0) {
            const { data: fetchImages } = await supabase
                .from('ticket_images')
                .select('*')
                .in('order_id', orderIds);
            if (fetchImages) ticketImages = fetchImages;

            const { data: fetchSlips } = await supabase
                .from('prize_transfer_slips')
                .select('*')
                .in('order_id', orderIds);
            if (fetchSlips) prizeTransferSlips = fetchSlips;
        }

        // Fetch app settings (tax rate, exchange rate)
        const { data: settings } = await supabase
            .from('app_settings')
            .select('key, value')
            .in('key', ['tax_rate', 'exchange_rate']);

        const resolvedSettings = {
            taxRate: 0,
            exchangeRate: 0,
        };

        if (settings) {
            for (const s of settings) {
                if (s.key === 'tax_rate') resolvedSettings.taxRate = parseFloat(s.value) || 0;
                if (s.key === 'exchange_rate') resolvedSettings.exchangeRate = parseFloat(s.value) || 0;
            }
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: {
                userResults,
                ticketImages,
                prizeTransferSlips,
                settings: resolvedSettings
            },
        });
    } catch (err) {
        console.error('Get user results error:', err);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

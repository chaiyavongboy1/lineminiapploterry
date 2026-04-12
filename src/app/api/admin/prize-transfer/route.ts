import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyUserPrizeTransferred } from '@/lib/line-messaging';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const orderLineResultId = formData.get('orderLineResultId') as string;
        const file = formData.get('slip') as File;

        if (!orderLineResultId || !file) {
            return NextResponse.json(
                { success: false, error: 'Missing orderLineResultId or slip file' },
                { status: 400 }
            );
        }

        // Upload file to Supabase Storage (reusing payment-slips bucket)
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `transfer_${orderLineResultId}_${Date.now()}.${fileExt}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabaseAdmin.storage
            .from('payment-slips')
            .upload(fileName, buffer, {
                contentType: file.type || 'image/jpeg',
                upsert: false,
            });

        if (uploadError) {
            console.error('Upload transfer slip error:', uploadError);
            return NextResponse.json(
                { success: false, error: 'Failed to upload slip' },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
            .from('payment-slips')
            .getPublicUrl(fileName);

        // Update order_line_results
        const { error: updateError } = await supabaseAdmin
            .from('order_line_results')
            .update({
                transfer_slip_url: urlData.publicUrl,
                transferred_at: new Date().toISOString()
            })
            .eq('id', orderLineResultId);

        if (updateError) {
            console.error('Update line error:', updateError);
            return NextResponse.json(
                { success: false, error: 'Failed to update record' },
                { status: 500 }
            );
        }

        // Send push notification to user
        try {
            // Get the order_line_result with related order info
            const { data: lineResult } = await supabaseAdmin
                .from('order_line_results')
                .select('prize_amount, order_line_id')
                .eq('id', orderLineResultId)
                .single();

            if (lineResult) {
                // Get order_line -> order -> user
                const { data: orderLine } = await supabaseAdmin
                    .from('order_lines')
                    .select('order_id')
                    .eq('id', lineResult.order_line_id)
                    .single();

                if (orderLine) {
                    const { data: order } = await supabaseAdmin
                        .from('orders')
                        .select('order_number, user_id')
                        .eq('id', orderLine.order_id)
                        .single();

                    if (order) {
                        const { data: user } = await supabaseAdmin
                            .from('users')
                            .select('line_user_id')
                            .eq('id', order.user_id)
                            .single();

                        if (user?.line_user_id) {
                            await notifyUserPrizeTransferred(
                                user.line_user_id,
                                order.order_number,
                                lineResult.prize_amount || 0
                            );
                        }
                    }
                }
            }
        } catch (notifyErr) {
            console.error('Failed to send prize transfer notification:', notifyErr);
            // Don't fail the request if notification fails
        }

        return NextResponse.json({
            success: true,
            data: { slipUrl: urlData.publicUrl },
        });
    } catch (err) {
        console.error('Upload transfer slip error:', err);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

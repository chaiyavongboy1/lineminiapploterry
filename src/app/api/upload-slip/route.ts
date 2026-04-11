import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { notifyAdminNewOrder } from '@/lib/line-messaging';
import type { ApiResponse } from '@/types';

// POST /api/upload-slip — Upload payment slip and update order status
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const orderId = formData.get('orderId') as string;
        const file = formData.get('slip') as File;
        const amount = formData.get('amount') as string;
        const bankName = formData.get('bankName') as string;

        if (!orderId || !file) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Missing orderId or slip file' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        // Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${orderId}_${Date.now()}.${fileExt}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await supabase.storage
            .from('payment-slips')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error('Upload slip error:', uploadError);
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Failed to upload slip' },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('payment-slips')
            .getPublicUrl(fileName);

        // Save payment slip record
        const { error: slipError } = await supabase
            .from('payment_slips')
            .insert({
                order_id: orderId,
                slip_image_url: urlData.publicUrl,
                amount: amount ? parseFloat(amount) : null,
                bank_name: bankName || null,
                transfer_date: new Date().toISOString(),
            });

        if (slipError) {
            console.error('Save slip error:', slipError);
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Failed to save slip record' },
                { status: 500 }
            );
        }

        // Update order status to pending_review
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                status: 'pending_review',
                updated_at: new Date().toISOString(),
            })
            .eq('id', orderId);

        if (updateError) {
            console.error('Update order error:', updateError);
        }

        // Notify admin via LINE
        try {
            const { data: order } = await supabase
                .from('orders')
                .select('order_number, total_amount, user:users!orders_user_id_fkey(display_name)')
                .eq('id', orderId)
                .single();

            if (order) {
                const customerName = (order.user as unknown as { display_name: string })?.display_name || 'ไม่ทราบชื่อ';
                await notifyAdminNewOrder(
                    order.order_number,
                    Number(order.total_amount),
                    customerName
                );
            }
        } catch (notifyErr) {
            console.error('Notify admin error:', notifyErr);
            // Don't fail the request if notification fails
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: { slipUrl: urlData.publicUrl },
        });
    } catch (err) {
        console.error('Upload slip error:', err);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

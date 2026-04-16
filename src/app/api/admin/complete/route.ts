import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { notifyUserTicketSent } from '@/lib/line-messaging';
import type { ApiResponse } from '@/types';

// POST /api/admin/complete — Mark order as completed + upload ticket image(s)
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const orderId = formData.get('orderId') as string;
        const adminNote = formData.get('adminNote') as string;
        const adminLineUserId = formData.get('adminLineUserId') as string;

        // Support both single and multiple file uploads
        const ticketImages = formData.getAll('ticketImages') as File[];
        const singleTicket = formData.get('ticketImage') as File | null;

        // Combine: use multi-image field first, fallback to single
        const files: File[] = ticketImages.length > 0 ? ticketImages : (singleTicket ? [singleTicket] : []);

        if (!orderId || files.length === 0 || !adminLineUserId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        // Verify admin role
        const { data: admin } = await supabase
            .from('users')
            .select('id, role')
            .eq('line_user_id', adminLineUserId)
            .single() as { data: { id: string; role: string } | null };

        if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Forbidden — admin only' },
                { status: 403 }
            );
        }

        // Upload all ticket images
        const uploadedUrls: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileExt = file.name.split('.').pop();
            const fileName = `ticket_${orderId}_${Date.now()}_${i}.${fileExt}`;

            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('payment-slips')
                .upload(fileName, buffer, {
                    contentType: file.type,
                    upsert: false,
                });

            if (uploadError) {
                console.error(`Upload ticket ${i} error:`, uploadError);
                continue; // Skip failed uploads but continue with others
            }

            const { data: urlData } = supabase.storage
                .from('payment-slips')
                .getPublicUrl(uploadData.path);

            uploadedUrls.push(urlData.publicUrl);

            // Insert into ticket_images table
            await (supabase.from('ticket_images') as any).insert({
                order_id: orderId,
                image_url: urlData.publicUrl,
                uploaded_by: admin.id,
            });
        }

        if (uploadedUrls.length === 0) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Failed to upload any ticket images' },
                { status: 500 }
            );
        }

        // Update order status to completed + store first ticket image URL (backward compat)
        const { data: order, error: updateError } = await (supabase
            .from('orders') as any)
            .update({
                status: 'completed',
                admin_note: adminNote || null,
                reviewed_by: admin.id,
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ticket_image: uploadedUrls[0], // backward compatible single image
                purchased_at: new Date().toISOString(),
            })
            .eq('id', orderId)
            .select('order_number, user:users!orders_user_id_fkey(line_user_id)')
            .single();

        if (updateError) {
            console.error('Update order error:', updateError);
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Failed to complete order' },
                { status: 500 }
            );
        }

        // Send LINE notification to user
        if ((order as any)?.user) {
            const user = (order as any).user as unknown as { line_user_id: string };
            try {
                await notifyUserTicketSent(user.line_user_id, (order as any).order_number);
            } catch (err) {
                console.error('Failed to send LINE notification:', err);
            }
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: { uploadedUrls, orderNumber: (order as any)?.order_number },
        });
    } catch (err) {
        console.error('Complete order error:', err);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

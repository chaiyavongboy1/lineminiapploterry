import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { notifyUserOrderStatus } from '@/lib/line-messaging';
import type { ApiResponse } from '@/types';

// POST /api/admin/approve — Approve or reject an order
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { orderId, action, adminNote, adminLineUserId } = body;
        // action: 'approve' | 'reject'

        if (!orderId || !action || !adminLineUserId) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const supabase = createServerClient();

        // Verify admin role
        const { data: adminRaw } = await supabase
            .from('users')
            .select('id, role')
            .eq('line_user_id', adminLineUserId)
            .single();
        const admin = adminRaw as { id: string; role: string } | null;

        if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
            return NextResponse.json<ApiResponse>(
                { success: false, error: 'Forbidden — admin only' },
                { status: 403 }
            );
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        // Update order
        const { data: order, error } = await (supabase
            .from('orders') as any)
            .update({
                status: newStatus,
                admin_note: adminNote || null,
                reviewed_by: admin.id,
                reviewed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)
            .select('*, user:users!orders_user_id_fkey(line_user_id, display_name)')
            .single();

        if (error) {
            console.error('Approve order error:', error);
            return NextResponse.json<ApiResponse>(
                { success: false, error: `Failed to update order: ${error.message}` },
                { status: 500 }
            );
        }

        // Mark payment slip as verified if approved
        if (action === 'approve') {
            await (supabase
                .from('payment_slips') as any)
                .update({
                    verified: true,
                    verified_by: admin.id,
                    verified_at: new Date().toISOString(),
                })
                .eq('order_id', orderId);
        }

        // Notify user via LINE
        try {
            const userLineId = ((order as any).user as { line_user_id: string })?.line_user_id;
            if (userLineId) {
                await notifyUserOrderStatus(
                    userLineId,
                    (order as any).order_number,
                    newStatus as 'approved' | 'rejected',
                    adminNote
                );
            }
        } catch (notifyErr) {
            console.error('Notify user error:', notifyErr);
        }

        return NextResponse.json<ApiResponse>({
            success: true,
            data: order,
        });
    } catch (err) {
        console.error('Approve error:', err);
        return NextResponse.json<ApiResponse>(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

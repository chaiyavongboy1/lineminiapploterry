import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role to bypass RLS for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/admin/lottery-types — Get all lottery types (cached 60s)
export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('lottery_types')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ success: true, data }, {
            headers: {
                'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
            },
        });
    } catch (error: any) {
        console.error('Error fetching lottery types:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// PUT /api/admin/lottery-types — Update a lottery type
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Missing lottery type id' },
                { status: 400 }
            );
        }

        // Only allow updating safe fields
        const allowedFields: Record<string, any> = {};
        const safeKeys = [
            'price_per_line',
            'service_fee',
            'description',
            'is_active',
            'estimated_jackpot',
            'max_number',
            'max_special_number',
            'numbers_to_pick',
            'special_numbers_to_pick',
            'draw_days',
        ];

        for (const key of safeKeys) {
            if (updates[key] !== undefined) {
                allowedFields[key] = updates[key];
            }
        }

        if (Object.keys(allowedFields).length === 0) {
            return NextResponse.json(
                { success: false, error: 'No valid fields to update' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('lottery_types')
            .update(allowedFields)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Error updating lottery type:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role to bypass RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from('prize_tiers')
            .select(`
                *,
                lottery_types(name)
            `)
            .order('lottery_type_id')
            .order('tier_order');

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error fetching prize tiers:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const tiers = await req.json();

        if (!Array.isArray(tiers)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const updates = tiers.map((tier) =>
            supabaseAdmin
                .from('prize_tiers')
                .update({ prize_amount: tier.prize_amount })
                .eq('id', tier.id)
        );

        const results = await Promise.all(updates);

        const hasErrors = results.some(r => r.error);
        if (hasErrors) {
            console.error('Some updates failed:', results.filter(r => r.error));
            return NextResponse.json({ error: 'Failed to update some tiers' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating prize tiers:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

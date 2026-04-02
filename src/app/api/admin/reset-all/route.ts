
import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdminClient';

export async function POST() {
  try {
    const supabase = getSupabaseAdminClient();
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('settlements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error } = await supabase.from('wallets').update({ balance: 0, debt: 0, system_balance: 0 }).neq('user_id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

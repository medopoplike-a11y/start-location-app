import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdminClient';

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('wallets')
      .select('*, profiles:user_id(full_name, role, email)');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { user_id, balance, debt, system_balance } = body;
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    const supabase = getSupabaseAdminClient();
    const updates: Record<string, number> = {};
    if (balance !== undefined) updates.balance = balance;
    if (debt !== undefined) updates.debt = debt;
    if (system_balance !== undefined) updates.system_balance = system_balance;
    const { error } = await supabase.from('wallets').update(updates).eq('user_id', user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

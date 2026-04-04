import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdminClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { driver_id, is_locked } = body;
    if (!driver_id) return NextResponse.json({ error: 'driver_id required' }, { status: 400 });
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from('profiles')
      .update({ is_locked: Boolean(is_locked) })
      .eq('id', driver_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

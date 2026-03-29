export const dynamic = 'force-static';

import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdminClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const targetUserId = String(body.target_user_id || body.userId || '');

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing target_user_id in request body' }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.rpc('reset_user_data_admin', { target_user_id: targetUserId });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

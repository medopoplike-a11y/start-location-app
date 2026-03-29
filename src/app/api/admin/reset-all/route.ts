export const dynamic = 'force-static';

import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdminClient';

export async function POST() {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.rpc('reset_all_system_data_admin');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

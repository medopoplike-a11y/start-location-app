export const dynamic = 'force-static';

import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdminClient';

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.rpc('get_all_profiles_admin');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

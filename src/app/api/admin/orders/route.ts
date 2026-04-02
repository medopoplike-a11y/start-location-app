

import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdminClient';

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const { data: rawData, error } = await supabase
      .from('orders')
      .select('*, vendor:profiles!vendor_id(full_name)')
      .order('created_at', { ascending: false });

    const data = (rawData || []).map((o: any) => ({
      ...o,
      vendor_full_name: o.vendor?.full_name || null,
    }));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

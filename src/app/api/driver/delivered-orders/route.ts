import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdminClient';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get('driverId');

  if (!driverId) {
    return NextResponse.json({ error: 'driverId is required' }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data, error } = await admin
    .from('orders')
    .select('*, profiles:vendor_id(full_name, phone, location)')
    .eq('driver_id', driverId)
    .in('status', ['in_transit', 'delivered'])
    .is('vendor_collected_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

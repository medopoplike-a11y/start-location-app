import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdminClient';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const driverId = searchParams.get('driverId');

  const admin = getSupabaseAdminClient();

  const [pendingRes, activeRes] = await Promise.all([
    admin
      .from('orders')
      .select('*, profiles:vendor_id(full_name, phone, location, area)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    driverId
      ? admin
          .from('orders')
          .select('*, profiles:vendor_id(full_name, phone, location, area)')
          .eq('driver_id', driverId)
          .in('status', ['assigned', 'in_transit'])
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (pendingRes.error || activeRes.error) {
    console.error('API driver/orders error:', pendingRes.error || activeRes.error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }

  return NextResponse.json({
    pending: pendingRes.data || [],
    active: activeRes.data || [],
  });
}

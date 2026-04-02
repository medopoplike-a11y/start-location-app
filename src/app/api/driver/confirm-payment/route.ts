import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdminClient';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { orderId, driverId } = body;

  if (!orderId || !driverId) {
    return NextResponse.json({ error: 'orderId and driverId are required' }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  const { data: order, error: fetchError } = await admin
    .from('orders')
    .select('id, driver_id, status, driver_confirmed_at')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  if (order.driver_id !== driverId) {
    return NextResponse.json({ error: 'Not your order' }, { status: 403 });
  }

  if (order.status !== 'delivered') {
    return NextResponse.json({ error: 'Order is not delivered yet' }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from('orders')
    .update({ driver_confirmed_at: new Date().toISOString() })
    .eq('id', orderId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

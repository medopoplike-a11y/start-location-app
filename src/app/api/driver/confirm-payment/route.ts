import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdminClient';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, driverId } = body;

    if (!orderId || !driverId) {
      return NextResponse.json({ error: 'Missing orderId or driverId' }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();

    // 1. Get order details to check commission and status
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'delivered') {
      return NextResponse.json({ error: 'Order must be delivered to confirm payment' }, { status: 400 });
    }

    // 2. Update order to mark payment confirmed
    const { error: updateError } = await admin
      .from('orders')
      .update({ 
        is_payment_confirmed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API confirm-payment error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

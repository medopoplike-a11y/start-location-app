import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdminClient';

// Zod schemas
const AppConfigSchema = z.object({
  latest_version: z.string().min(1).optional(),
  min_version: z.string().min(1).optional(),
  download_url: z.string().url().optional(),
  bundle_url: z.string().url().optional(),
  force_update: z.boolean().optional(),
  update_message: z.string().max(500).optional(),
  maintenance_mode: z.boolean().optional(),
  maintenance_message: z.string().max(500).optional(),
  driver_commission: z.number().min(0).max(50).optional(),
  vendor_commission: z.number().min(0).max(50).optional(),
  vendor_fee: z.number().min(0).max(10).optional(),
  safe_ride_fee: z.number().min(0).max(10).optional(),
});

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('app_config')
      .select('*')
      .single();

    if (error) {
      console.error('AppConfig GET error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('AppConfig GET server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // Validate with Zod
    const validated = AppConfigSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ 
        error: 'Invalid input',
        details: validated.error.format()
      }, { status: 400 });
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('app_config')
      .update(validated.data)
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      console.error('AppConfig PUT DB error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('AppConfig PUT server error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// BLACKBOXAI: Added Zod validation, logging, better error handling


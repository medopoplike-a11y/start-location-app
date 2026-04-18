import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/server/supabaseAdminClient';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function OPTIONS() {
  return new NextResponse('ok', { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const { type, data, role = 'admin' } = await request.json();

    let systemPrompt = `You are an AI Co-pilot for the "Start Location" logistics app. Role: ${role}.`;

    if (type === 'invoice_audit') {
      systemPrompt += ` Task: Audit an invoice image against manual data.
      Manual Data: ${JSON.stringify(data.manualData)}
      Analyze and compare. Flag mismatches as 'warning' or 'critical'. Respond in Arabic.`;
    } else if (type === 'heatmap_analysis') {
      systemPrompt += ` Task: Analyze historical order density to suggest driver distribution.
      Data: ${JSON.stringify(data.historicalOrders)}
      Identify clusters and recommend driver positioning. Respond in Arabic.`;
    } else if (type === 'chat') {
      if (role === 'admin') {
        systemPrompt += ` Task: Answer questions about the "Start Location" system.
        Context: Admin user with access to system stats and technical logs.
        System Data: ${JSON.stringify(data.systemContext)}
        Technical Logs: ${JSON.stringify(data.techLogs || [])}
        User Message: ${data.message}
        Instructions:
        1. Analyze tech logs for errors/performance.
        2. Explain data flows if asked.
        3. Provide technical fixes if needed.`;
      } else if (role === 'driver') {
        systemPrompt += ` Task: Chat with the driver as a friendly Navigation Assistant.
        Context: Driver orders and status: ${JSON.stringify(data.orderContext || {})}
        User Message: ${data.message}
        Instructions:
        1. Be helpful, encouraging, and focused on delivery/navigation.
        2. Help with address clarification or route advice.
        3. NEVER give technical advice or mention database/system internals.
        4. Respond in Arabic.`;
      } else if (role === 'vendor') {
        systemPrompt += ` Task: Chat with the store owner as a Business Growth Consultant.
        Context: Store performance data: ${JSON.stringify(data.storeContext || {})}
        User Message: ${data.message}
        Instructions:
        1. Provide tips on increasing orders and efficiency.
        2. Analyze store data to suggest peak times.
        3. NEVER give technical advice or mention database/system internals.
        4. Respond in Arabic.`;
      }
    } else if (role === 'driver') {
      systemPrompt += ` Task: Help the driver with location clarity or navigation.
      Input is an order with potential address issues: ${JSON.stringify(data)}
      Instructions:
      1. Provide a clear breakdown of the location.
      2. If vague, suggest what to ask the customer.
      3. Provide 'friendly_guidance' in Arabic.
      4. DO NOT provide technical info or system fixes.`;
    } else if (role === 'vendor') {
      systemPrompt += ` Task: Provide store performance insights.
      Input is store sales/order data: ${JSON.stringify(data)}
      Instructions:
      1. Peak hour suggestions.
      2. Delivery efficiency tips.
      3. Provide 'store_advice' in Arabic.
      4. DO NOT provide technical info or system fixes.`;
    } else {
      systemPrompt += ` Task: Analyze ${type} data for admin review.
      Data: ${JSON.stringify(data)}`;
    }

    const prompt = `
      ${systemPrompt}
      Format your response as a valid JSON object:
      {
        "content": "Description/Guidance in Arabic",
        "severity": "info" | "warning" | "critical",
        "suggested_fix": ${role === 'admin' ? '{ "action": "...", "data": "..." } | null' : 'null'},
        "ai_meta": {}
      }
      IMPORTANT: 
      1. "content" must always be in Arabic.
      2. ${role !== 'admin' ? 'suggested_fix must be null for this role.' : 'Only provide suggested_fix if a technical action is strictly necessary.'}
    `;

    const contents: any[] = [{ parts: [{ text: prompt }] }];

    if (type === 'invoice_audit' && data.image && data.image.startsWith('data:image')) {
      const base64Data = data.image.split(',')[1];
      const mimeType = data.image.split(';')[0].split(':')[1];
      contents[0].parts.push({
        inline_data: { mime_type: mimeType, data: base64Data }
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API error:', errText);
      return NextResponse.json(
        { error: `Gemini API error: ${response.status}` },
        { status: 500, headers: corsHeaders }
      );
    }

    const result = await response.json();
    const rawText: string = result.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const aiResponse = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);

    try {
      const supabase = getSupabaseAdminClient();
      await supabase.from('ai_insights').insert([{
        type: type || 'error_analysis',
        severity: aiResponse.severity || 'info',
        content: aiResponse.content,
        raw_data: data,
        suggested_fix: aiResponse.suggested_fix,
      }]);
    } catch (dbErr) {
      console.warn('Failed to save AI insight to DB (non-blocking):', dbErr);
    }

    return NextResponse.json(
      { success: true, analysis: aiResponse },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('AI route error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

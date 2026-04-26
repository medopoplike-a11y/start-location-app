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

    let systemPrompt = `You are the "Start Location Smart Brain" (Gemini AI), a friendly, intelligent, and supportive co-pilot. 
    Your goal is to make the user feel that the app is "alive", unique, and has a helpful mind. 
    Use a professional yet warm and friendly tone in Arabic. Role: ${role}.`;

    if (type === 'invoice_audit') {
      systemPrompt += ` Task: Audit an invoice image against manual data.
      Manual Data: ${JSON.stringify(data.manualData)}
      Analyze and compare. Flag mismatches as 'warning' or 'critical'. Respond in Arabic. 
      Be encouraging even when finding errors, suggesting they might be simple human mistakes.`;
    } else if (type === 'heatmap_analysis') {
      systemPrompt += ` Task: Analyze historical order density to suggest driver distribution.
      Data: ${JSON.stringify(data.historicalOrders)}
      Identify clusters and recommend driver positioning. Respond in Arabic. 
      Explain the logic simply so the admin feels empowered by your data-driven insights.`;
    } else if (type === 'chat') {
      if (role === 'admin') {
        systemPrompt += ` Task: You are the Admin's "Technical Strategic Companion". 
        Context: Admin user with access to system stats and technical logs.
        System Data: ${JSON.stringify(data.systemContext)}
        Technical Logs: ${JSON.stringify(data.techLogs || [])}
        User Message: ${data.message}
        Instructions:
        1. Be highly capable and proactive, especially in critical times.
        2. Analyze tech logs for errors/performance and suggest immediate fixes if you see issues.
        3. Explain complex data flows simply and clearly.
        4. Act as a "brain" that the admin can rely on for decision making.`;
      } else if (role === 'driver') {
        systemPrompt += ` Task: You are the Driver's "Supportive Road Buddy". 
        Context: Driver orders and status: ${JSON.stringify(data.orderContext || {})}
        User Message: ${data.message}
        Instructions:
        1. Be extremely friendly, encouraging, and respectful. Use words like "كابتن" or "بطل".
        2. Focus on making their day easier: clarify addresses, give route advice, or just provide motivational support.
        3. Make them feel the app "cares" about their effort and success.
        4. NEVER mention technical system details or database internals.
        5. Respond in Arabic.`;
      } else if (role === 'vendor') {
        systemPrompt += ` Task: You are the Store Owner's "Business Success Partner".
        Context: Store performance data: ${JSON.stringify(data.storeContext || {})}
        User Message: ${data.message}
        Instructions:
        1. Provide smart tips to increase orders, improve efficiency, and grow their business.
        2. Analyze their data to find peak times or areas for improvement.
        3. Be professional, supportive, and celebrate their successes.
        4. NEVER mention technical system details or database internals.
        5. Respond in Arabic.`;
      }
    } else if (role === 'driver') {
      systemPrompt += ` Task: Help the driver with location clarity or navigation.
      Input is an order with potential address issues: ${JSON.stringify(data)}
      Instructions:
      1. Break down the location clearly and suggest the best way to reach it.
      2. Be the driver's "extra eyes" on the map.
      3. Provide 'friendly_guidance' in Arabic using a supportive tone.
      4. DO NOT provide technical info or system fixes.`;
    } else if (role === 'vendor') {
      systemPrompt += ` Task: Provide store performance insights.
      Input is store sales/order data: ${JSON.stringify(data)}
      Instructions:
      1. Peak hour suggestions and growth tips.
      2. Delivery efficiency advice.
      3. Provide 'store_advice' in Arabic as a trusted consultant.
      4. DO NOT provide technical info or system fixes.`;
    } else if (type === 'quick_reply') {
      systemPrompt += ` Task: Generate a professional, short, and polite WhatsApp reply for a delivery driver.
      Target: ${data.target} (vendor or customer)
      Status: ${data.orderStatus}
      Vendor: ${data.vendorName}
      Customer: ${data.customerName || 'the customer'}
      Instructions:
      1. Keep it very short (1-2 sentences).
      2. Use a respectful tone.
      3. For status 'assigned', mention you're on your way to pick up.
      4. For status 'in_transit', mention you're on your way to deliver.
      5. Respond only with the message content in Arabic.`;
    } else if (type === 'dispatch_recommendation') {
      systemPrompt += ` Task: Recommend the best driver for a new order.
      Order Location: ${JSON.stringify(data.orderLocation)}
      Available Drivers: ${JSON.stringify(data.drivers)}
      Instructions:
      1. Analyze distances and driver current workloads.
      2. Recommend one driver with a brief reason.
      3. Respond in Arabic.`;
    } else if (type === 'vision_qc') {
      systemPrompt += ` Task: Analyze a photo of an order for quality control.
      Order Details: ${JSON.stringify(data.order)}
      Instructions:
      1. Check if the items in the photo match the order description (if visible).
      2. Check if the packaging looks secure and professional.
      3. Verify if a receipt is visible.
      4. Provide a very brief "Status: OK" or "Warning: [issue]" followed by a short friendly advice in Arabic.`;
    } else if (type === 'admin_summary') {
      systemPrompt += ` Task: Provide a high-level executive summary of today's delivery operations for the Admin.
      Data: ${JSON.stringify(data.stats)}
      Instructions:
      1. Summarize the performance (orders, drivers, revenue).
      2. Identify any potential issues or bottlenecks.
      3. Suggest 2-3 actionable improvements.
      4. Be professional, concise, and use a "Director" tone in Arabic.`;
    } else if (type === 'route_optimization') {
      systemPrompt += ` Task: Suggest the most efficient sequence for multiple deliveries.
      Orders: ${JSON.stringify(data.orders)}
      Current Location: ${JSON.stringify(data.location)}
      Instructions:
      1. Order the deliveries to minimize total travel time.
      2. Briefly explain why this sequence was chosen.
      3. Respond in Arabic.`;
    } else if (type === 'support_bot') {
      systemPrompt += ` Task: Provide instant support to a ${role}.
      Context: ${JSON.stringify(data.context)}
      User Message: ${data.message}
      Instructions:
      1. Solve the problem based on the context.
      2. If you can't solve it, suggest contacting the admin.
      3. Be extremely supportive and friendly in Arabic.`;
    } else if (role === 'admin') {
      systemPrompt += ` Task: Analyze ${type} data for admin review.
      Data: ${JSON.stringify(data)}
      Be precise, technical, and helpful.`;
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

    if ((type === 'invoice_audit' || type === 'vision_qc') && data.image && data.image.startsWith('data:image')) {
      const base64Data = data.image.split(',')[1];
      const mimeType = data.image.split(';')[0].split(':')[1];
      contents[0].parts.push({
        inline_data: { mime_type: mimeType, data: base64Data }
      });
    }

    const MODELS = [
      'gemini-flash-latest',
      'gemini-2.0-flash-001',
      'gemini-2.0-flash-lite',
    ];

    let response: Response | null = null;
    let lastError = '';

    for (const model of MODELS) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents }),
            }
          );

          if (response.ok) break;

          const errText = await response.text();
          lastError = errText;
          console.warn(`Gemini [${model}] attempt ${attempt} failed (${response.status}):`, errText);

          if (response.status !== 503 && response.status !== 429) break;
          if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1000));
        } catch (fetchErr: any) {
          lastError = fetchErr.message;
          console.warn(`Gemini [${model}] attempt ${attempt} exception:`, fetchErr.message);
          if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1000));
        }
      }
      if (response?.ok) break;
    }

    if (!response || !response.ok) {
      console.error('Gemini API error after all retries:', lastError);
      return NextResponse.json(
        { error: `الذكاء الاصطناعي غير متاح حاليًا، يرجى المحاولة مرة أخرى` },
        { status: 503, headers: corsHeaders }
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


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  try {
    const { type, data, role = 'admin' } = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Prepare Specialized Prompts based on User Role
    let systemPrompt = `You are an AI Co-pilot for the "Start Location" logistics app. Role: ${role}.`;
    
    if (type === 'invoice_audit') {
      systemPrompt += ` Task: Audit an invoice image against manual data.
      Manual Data: ${JSON.stringify(data.manualData)}
      Invoice Image (Base64 or URL): ${data.image}
      Analyze the image and compare with manual data. If there is a mismatch in order value or delivery fee, flag it as 'warning' or 'critical'. Provide a detailed explanation in Arabic.`;
    } else if (type === 'heatmap_analysis') {
      systemPrompt += ` Task: Analyze historical order density to suggest driver distribution.
      Data: ${JSON.stringify(data.historicalOrders)}
      Identify clusters of orders and provide a recommendation in Arabic on where drivers should position themselves.`;
    } else if (type === 'chat') {
      systemPrompt += ` Task: Answer user questions about the "Start Location" system.
      Context: This is an admin user. You have access to system stats and technical logs through the provided data.
      System Data: ${JSON.stringify(data.systemContext)}
      Technical Logs: ${JSON.stringify(data.techLogs || [])}
      User Message: ${data.message}
      
      Instructions:
      1. If the user asks about technical health, analyze the 'techLogs' for errors or performance issues.
      2. Explain how data flows (Realtime -> Supabase -> App) if asked.
      3. Identify potential bottlenecks or crashes based on logs.
      4. Provide a helpful, professional response in Arabic.`;
    } else if (role === 'driver') {
      systemPrompt += ` Task: Help the driver with location clarity or navigation.
      Input is an order with potential address issues: ${JSON.stringify(data)}
      Analyze the address and provide:
      1. A clear breakdown of the location.
      2. If vague, suggest what to ask the customer.
      3. Provide a 'friendly_guidance' string in Arabic.`;
    } else if (role === 'vendor') {
      systemPrompt += ` Task: Provide store performance insights.
      Input is store sales/order data: ${JSON.stringify(data)}
      Analyze trends and provide:
      1. Peak hour suggestions.
      2. Delivery efficiency tips.
      3. Provide 'store_advice' string in Arabic.`;
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
        "suggested_fix": { "action": "...", "data": "..." } | null,
        "ai_meta": { ... }
      }
      IMPORTANT: Ensure "content" is always in Arabic.
    `

    // 2. Call Google Gemini API
    const contents = [{ parts: [{ text: prompt }] }];
    
    // V1.5.0: Support for multi-modal input (image + text) if available
    if (type === 'invoice_audit' && data.image && data.image.startsWith('data:image')) {
      const base64Data = data.image.split(',')[1];
      const mimeType = data.image.split(';')[0].split(':')[1];
      contents[0].parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    })

    const result = await response.json()
    
    // V1.5.1: Safer parsing with regex to handle potential markdown in AI response
    let rawText = result.candidates[0].content.parts[0].text;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const aiResponse = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);

    // 3. Store the Insight in Database
    await supabase.from('ai_insights').insert([{
      type: type || 'error_analysis',
      severity: aiResponse.severity || 'info',
      content: aiResponse.content,
      raw_data: data,
      suggested_fix: aiResponse.suggested_fix
    }])

    return new Response(JSON.stringify({ success: true, analysis: aiResponse }), { headers: { 'Content-Type': 'application/json' } })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})

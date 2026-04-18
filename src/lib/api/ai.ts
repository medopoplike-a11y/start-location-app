import { supabase } from '../supabaseClient';

/**
 * AI Insight & System Log API - V1.9.0
 * Uses Next.js API route to call Gemini directly (no Supabase Edge Function needed)
 */

export interface AIInsight {
  id: string;
  type: 'error_analysis' | 'performance' | 'fraud_detection' | 'data_correction';
  severity: 'info' | 'warning' | 'critical';
  content: string;
  raw_data?: any;
  suggested_fix?: any;
  is_applied: boolean;
  applied_at?: string;
  created_at: string;
}

export const logSystemEvent = async (level: 'info' | 'error' | 'security', source: string, message: string, metadata?: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('system_logs').insert([{
      level,
      source,
      message,
      metadata,
      user_id: user?.id
    }]);
  } catch (e) {
    console.warn("AI: Failed to log system event", e);
  }
};

export const fetchAIInsights = async (onlyUnapplied = true) => {
  let query = supabase.from('ai_insights').select('*').order('created_at', { ascending: false });
  if (onlyUnapplied) query = query.eq('is_applied', false);
  
  const { data, error } = await query;
  if (error) throw error;
  return data as AIInsight[];
};

export const applyAIFix = async (insightId: string, fixData: any) => {
  const { data, error } = await supabase.rpc('apply_ai_fix', { 
    p_insight_id: insightId,
    p_fix_data: fixData 
  });
  
  if (error) throw error;
  return data;
};

/**
 * Call Gemini AI via Next.js API route (/api/ai)
 * Works on both web and mobile (Capacitor) since it calls relative URLs
 */
export const requestAIAnalysis = async (type: string, data: any, role: 'admin' | 'driver' | 'vendor' = 'admin') => {
  const isNativePlatform = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.() === true;

  const baseUrl = isNativePlatform
    ? (process.env.NEXT_PUBLIC_APP_URL || '')
    : typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || '');

  const response = await fetch(`${baseUrl}/api/ai`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data, role }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Request failed with status ${response.status}`);
  }

  const res = await response.json();
  if (!res.success) throw new Error(res.error || 'AI request failed');
  return res;
};

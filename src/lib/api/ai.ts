
import { supabase } from '../supabaseClient';

/**
 * AI Insight & System Log API - V1.4.0
 * Connects the system to the AI Co-pilot
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
  // Logic to apply the fix (can be dynamic depending on the suggested_fix type)
  // For safety, this should be handled via a specialized Edge Function or RPC
  const { data, error } = await supabase.rpc('apply_ai_fix', { 
    p_insight_id: insightId,
    p_fix_data: fixData 
  });
  
  if (error) throw error;
  return data;
};

/**
 * Call Gemini AI to analyze a specific situation
 * This triggers a Supabase Edge Function that securely calls Google Gemini
 */
export const requestAIAnalysis = async (type: string, data: any, role: 'admin' | 'driver' | 'vendor' = 'admin') => {
  const { data: res, error } = await supabase.functions.invoke('gemini-analyzer', {
    body: { type, data, role }
  });
  
  if (error) throw error;
  return res;
};

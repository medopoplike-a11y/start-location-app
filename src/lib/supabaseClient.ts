import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;

/**
 * V16.6.0: RADICAL CLEAN ARCHITECTURE (JAZRI)
 * This is the ultimate stable implementation for Capacitor/Android.
 * Instead of mocks/hacks, we use the OFFICIAL Supabase client but 
 * override its internal mechanisms (Fetch and Storage) to work natively.
 */

/**
 * V16.9.1: CLEAN ARCHITECTURE (ROOT CAUSE FIX)
 * We removed all global window mocks and "Nuclear" hacks.
 * The standard way to handle missing Web Locks API in Capacitor/Next.js is to 
 * provide a safe storage strategy and only intervene if the environment 
 * doesn't support the required standard APIs.
 */

const isNative = typeof window !== 'undefined' && 
                 !!window.Capacitor && 
                 window.Capacitor.getPlatform() !== 'web';

/**
 * 1. NATIVE STORAGE ADAPTER
 * Uses Capacitor Preferences for session persistence.
 */
const NativeStorage = {
  getItem: async (key: string) => {
    const { value } = await Preferences.get({ key });
    return value;
  },
  setItem: async (key: string, value: string) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key: string) => {
    await Preferences.remove({ key });
  }
};

/**
 * 2. NATIVE FETCH ADAPTER (CAPACITOR HTTP) - V16.6.1 HARDENED
 * This is the MAGIC that bypasses CORS and Web Locks API.
 */
const nativeFetch = async (url: string, options: any = {}) => {
  const { CapacitorHttp } = await import('@capacitor/core');
  
  // V16.6.1: Improved URL joining to prevent double slashes or missing slashes
  const baseUrl = supabaseUrl.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${path}`;

  // V16.6.1: Enhanced Header Handling
  let headers: any = {};
  if (options.headers instanceof Headers) {
    options.headers.forEach((value, key) => { headers[key] = value; });
  } else if (typeof options.headers === 'object') {
    headers = { ...options.headers };
  }

  // Ensure mandatory Supabase headers are present
  if (!headers['apikey']) headers['apikey'] = supabaseAnonKey;
  
  // V16.6.7: CRITICAL HEADER FIX
  // Ensure the Authorization header is present and in the correct case for CapacitorHttp
  const authKey = Object.keys(headers).find(k => k.toLowerCase() === 'authorization');
  if (authKey && authKey !== 'Authorization') {
    headers['Authorization'] = headers[authKey];
    delete headers[authKey];
  }

  try {
    // V16.6.1: Intelligent Body handling
    let requestData: any = undefined;
    if (options.body) {
      if (typeof options.body === 'string') {
        try {
          requestData = JSON.parse(options.body);
        } catch {
          requestData = options.body;
        }
      } else {
        requestData = options.body;
      }
    }

    // V16.6.7: Debug Logging for Authentication issues
    const hasAuth = !!headers['Authorization'];
    const authSummary = hasAuth ? `${headers['Authorization'].substring(0, 15)}...` : 'MISSING';
    
    const response = await CapacitorHttp.request({
      url: fullUrl,
      method: options.method || 'GET',
      headers: headers,
      data: requestData,
      connectTimeout: 20000,
      readTimeout: 20000
    });

    // V16.6.6: PostgREST usually returns array, if we get null/empty it might be RLS
    if (response.status === 200 && (!response.data || (Array.isArray(response.data) && response.data.length === 0))) {
      console.log(`[SupabaseV16.6.7] Empty data from ${fullUrl}. Auth: ${authSummary}`);
      // Special case: if it's an orders/wallets fetch and it's empty, it's very suspicious
      if (fullUrl.includes('/rest/v1/orders') || fullUrl.includes('/rest/v1/wallets')) {
        console.warn(`[SupabaseV16.6.7] CRITICAL: Empty dashboard data. Possible RLS Block.`);
      }
    }

    // V16.6.1: Detailed logging for debugging (only in development or if enabled)
    if (response.status >= 400) {
      console.warn(`[SupabaseNativeFetch] Error ${response.status} on ${fullUrl}:`, response.data);
    }

    // Convert response data to string for standard Response object
    const bodyString = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

    // Create a Fetch-compatible Response object
    return new Response(bodyString, {
      status: response.status,
      statusText: response.status === 200 ? 'OK' : `Status ${response.status}`,
      headers: new Headers(response.headers as any),
    });
  } catch (error: any) {
    console.error("[SupabaseNativeFetch] Fatal Network Error:", fullUrl, error.message);
    // Return a failed response instead of throwing to prevent app crash
    return new Response(JSON.stringify({ error: error.message || "Network Error" }), {
      status: 500,
      headers: new Headers({ 'Content-Type': 'application/json' })
    });
  }
};

/**
 * 3. CLIENT INITIALIZATION
 * Standard Supabase client with native overrides.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // V16.9.1: CLEAN AUTH STRATEGY
    // We set lock to undefined to use the internal defaults, or we provide 
    // a standard interface if absolutely needed for this version of gotrue-js.
    lock: undefined,
    // Use native preferences for session storage
    storage: isNative ? NativeStorage : (typeof window !== 'undefined' ? localStorage : undefined),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    // Use CapacitorHttp to bypass CORS and improve reliability in native environment
    fetch: isNative ? nativeFetch : undefined,
  }
});

export default supabase;

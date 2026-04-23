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

// V17.3.6: Strict URL Validation
if (typeof window !== 'undefined' && supabaseUrl && !supabaseUrl.startsWith('https://')) {
  console.error("CRITICAL: Supabase URL is invalid! It must start with https://. Current value:", supabaseUrl);
}

/**
 * 1. NATIVE STORAGE ADAPTER
 */
const NativeStorage = {
  getItem: async (key: string) => {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch (e) {
      console.warn("[NativeStorage] getItem failed:", e);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      await Preferences.set({ key, value });
    } catch (e) {
      console.error("[NativeStorage] setItem failed:", e);
    }
  },
  removeItem: async (key: string) => {
    try {
      await Preferences.remove({ key });
    } catch (e) {
      console.error("[NativeStorage] removeItem failed:", e);
    }
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

  // V17.3.0: RADICAL AUTH HARDENING - Recovery from Local Storage
  if (!headers['Authorization'] || headers['Authorization'].length < 20) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value: sessionStr } = await Preferences.get({ key: 'start-location-v1-session' });
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
          console.log("[SupabaseNativeFetch] V17.3.0: Auth header recovered from Preferences");
        }
      }
    } catch (e) {}
  }

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
  
  // V17.0.8: RESILIENT FETCH WITH AUTO-RETRY
  const MAX_RETRIES = 2;
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[SupabaseNativeFetch] Retry attempt ${attempt}/${MAX_RETRIES} for ${fullUrl}`);
        await new Promise(r => setTimeout(r, 1000 * attempt)); // Exponential backoff
      }

      const response = await CapacitorHttp.request({
        url: fullUrl,
        method: options.method || 'GET',
        headers: headers,
        data: requestData,
        connectTimeout: 10000,
        readTimeout: 10000
      });

      // V16.6.6: PostgREST usually returns array, if we get null/empty it might be RLS
      if (response.status === 200 && (!response.data || (Array.isArray(response.data) && response.data.length === 0))) {
        console.log(`[SupabaseV16.6.7] Empty data from ${fullUrl}. Auth: ${authSummary}`);
      }

      // V16.6.1: Detailed logging for debugging
      if (response.status >= 400) {
        console.warn(`[SupabaseNativeFetch] Error ${response.status} on ${fullUrl}:`, response.data);
        // If it's a 5xx error, we might want to retry
        if (response.status >= 500 && attempt < MAX_RETRIES) {
          continue;
        }
      }

      // Convert response data to string for standard Response object
      const bodyString = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

      return new Response(bodyString, {
        status: response.status,
        statusText: response.status === 200 ? 'OK' : `Status ${response.status}`,
        headers: new Headers(response.headers as any),
      });
    } catch (error: any) {
      lastError = error;
      console.warn(`[SupabaseNativeFetch] Attempt ${attempt} failed:`, error.message);
      if (attempt === MAX_RETRIES) break;
    }
  }

  // If we reach here, all attempts failed
  console.error("[SupabaseNativeFetch] ALL ATTEMPTS FAILED:", fullUrl, lastError?.message);
  return new Response(JSON.stringify({ error: lastError?.message || "Network Error" }), {
    status: 500,
    headers: new Headers({ 'Content-Type': 'application/json' })
  });
};

/**
 * 3. CLIENT INITIALIZATION
 * Standard Supabase client with native overrides.
 * V16.9.9: HARDENED REALTIME CONFIG
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // V17.1.3: RADICAL NATIVE STABILITY
    // Explicitly disable Web Locks in native environment to prevent session deadlocks
    lock: undefined, 
    storage: isNative ? NativeStorage : (typeof window !== 'undefined' ? localStorage : undefined),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Ensure PKCE for better native flow
  },
  global: {
    // Use CapacitorHttp to bypass CORS and improve reliability in native environment
    fetch: isNative ? nativeFetch : undefined,
  },
  realtime: {
    params: {
      // V17.4.0: Reduced from 20 → 5 to lower realtime server pressure.
      // 5 events/sec is more than enough for logistics order updates and prevents
      // the connection from being throttled or dropped under burst load.
      events_per_second: 5,
    },
    config: {
      // V17.4.0: STABILITY OVER AGGRESSION
      // - self:false → don't receive your own broadcasts (was doubling traffic)
      // - ack:false  → no per-broadcast acknowledgment (was adding round-trips)
      // For driver location pings, occasional loss is acceptable; the next ping
      // arrives in <5s anyway. This dramatically reduces network chatter.
      broadcast: { self: false, ack: false },
      presence: { key: 'user' },
    },
    timeout: 30000, // V17.4.0: 30s to tolerate brief mobile network stalls without dropping
  }
});

// V17.3.8: Safe Realtime Health Monitor
if (typeof window !== 'undefined' && supabase.realtime) {
  try {
    // Standard RealtimeClient events use .on()
    supabase.realtime.on('open', () => {
      console.log("[Realtime] Connection established successfully");
      (window as any).__START_LOCATION_CONNECTED = true;
    });

    supabase.realtime.on('error', (err: any) => {
      console.warn("[Realtime] Connection error, system will retry silently:", err);
    });

    supabase.realtime.on('close', () => {
      console.log("[Realtime] Connection closed, preparing for smart reconnect");
    });
  } catch (e) {
    console.warn("[Realtime] Monitor setup failed:", e);
  }
}

export default supabase;

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
// V17.9.5: Cache CapacitorHttp to avoid repeated dynamic imports
let cachedCapacitorHttp: any = null;

const nativeFetch = async (url: string, options: any = {}) => {
  if (!cachedCapacitorHttp) {
    const { CapacitorHttp } = await import('@capacitor/core');
    cachedCapacitorHttp = CapacitorHttp;
  }
  const CapacitorHttp = cachedCapacitorHttp;
  
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
        // V17.9.7: Increased timeouts to 15s for better stability on weak networks
        connectTimeout: 15000,
        readTimeout: 15000
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

// V17.4.7: Safe Realtime Health Monitor
// The newer @supabase/realtime-js exposes connection events on the underlying
// `conn` (Phoenix) socket, not on `realtime` directly — wiring `.on()` to
// `realtime` itself throws "supabase.realtime.on is not a function". We attach
// to the actual socket once it exists, and silently no-op if unavailable.
if (typeof window !== 'undefined' && supabase.realtime) {
  try {
    const rt: any = supabase.realtime;
    const attach = () => {
      const sock = rt?.conn;
      if (!sock || typeof sock.addEventListener !== 'function') return false;
      sock.addEventListener('open', () => {
        console.log("[Realtime] Connection established");
        (window as any).__START_LOCATION_CONNECTED = true;
      });
      sock.addEventListener('close', () => {
        console.log("[Realtime] Connection closed");
        (window as any).__START_LOCATION_CONNECTED = false;
      });
      sock.addEventListener('error', (err: any) => {
        console.warn("[Realtime] Connection error (will auto-retry):", err?.message || err);
      });
      return true;
    };
    // Try now; if the socket isn't open yet, retry briefly without spamming.
    if (!attach()) {
      let tries = 0;
      const t = setInterval(() => {
        tries += 1;
        if (attach() || tries > 10) clearInterval(t);
      }, 500);
    }
  } catch (_) {
    // Silent — the monitor is purely informational and must never crash boot.
  }
}

/**
 * V17.9.4: RADICAL REALTIME RECOVERY
 * Forcefully closes and re-establishes the Supabase Realtime socket.
 * Essential for recovering from long background sleeps on mobile.
 */
export const forceReconnectRealtime = async () => {
  if (typeof window === 'undefined' || !supabase.realtime) return;
  
  try {
    console.log("[RealtimeV17.9.4] Force Reconnect requested...");
    
    // 1. Close current connection
    if (supabase.realtime.isConnected()) {
      console.log("[RealtimeV17.9.4] Closing active socket...");
      supabase.realtime.disconnect();
    }
    
    // 2. Wait a small buffer
    await new Promise(r => setTimeout(r, 500));
    
    // 3. Re-establish
    console.log("[RealtimeV17.9.4] Establishing fresh socket...");
    supabase.realtime.connect();
    
    return true;
  } catch (e) {
    console.error("[RealtimeV17.9.4] Force Reconnect failed:", e);
    return false;
  }
};

export default supabase;

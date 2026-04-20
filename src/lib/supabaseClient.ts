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
 * 2. NATIVE FETCH ADAPTER (CAPACITOR HTTP)
 * This is the MAGIC that bypasses CORS and Web Locks API.
 * We transform standard Fetch calls into CapacitorHttp requests.
 */
const nativeFetch = async (url: string, options: any = {}) => {
  const { CapacitorHttp } = await import('@capacitor/core');
  
  // Convert standard fetch headers to object
  let headers: any = {};
  if (options.headers instanceof Headers) {
    options.headers.forEach((value, key) => { headers[key] = value; });
  } else if (typeof options.headers === 'object') {
    headers = { ...options.headers };
  }

  // CapacitorHttp requires absolute URL
  const fullUrl = url.startsWith('http') ? url : `${supabaseUrl}${url}`;

  try {
    const response = await CapacitorHttp.request({
      url: fullUrl,
      method: options.method || 'GET',
      headers: headers,
      data: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
    });

    // Create a Fetch-compatible Response object
    return new Response(
      typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      {
        status: response.status,
        headers: new Headers(response.headers as any),
      }
    );
  } catch (error: any) {
    console.error("[SupabaseNativeFetch] Fatal:", error);
    throw error;
  }
};

/**
 * 3. CLIENT INITIALIZATION
 * Standard Supabase client with native overrides.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Disable web locks to avoid "this.lock" error in Android WebView
    lock: {
      acquire: async () => ({ release: () => {} }),
    },
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

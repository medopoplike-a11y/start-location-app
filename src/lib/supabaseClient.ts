import { createClient, SupportedStorage } from '@supabase/supabase-js';
import { config } from './config';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = config.supabase.url || 'https://placeholder.supabase.co';
const supabaseAnonKey = config.supabase.anonKey || 'placeholder-anon-key';

const isNative = Capacitor.isNativePlatform();

// Standard storage for maximum compatibility with all browsers and Capacitor
const appStorage: SupportedStorage = {
  getItem: (key: string): string | null | Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    
    // Check localStorage first
    const localValue = localStorage.getItem(key);
    if (localValue) return localValue;

    // V1.8.2: If on Native and not in localStorage, MUST check Preferences
    if (isNative) {
      return Preferences.get({ key }).then(res => res.value);
    }
    
    return null;
  },
  setItem: (key: string, value: string): void | Promise<void> => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
    // V1.8.2: Always mirror to Preferences on Native for persistence across updates
    if (isNative) {
      Preferences.set({ key, value }).catch(() => {});
    }
  },
  removeItem: (key: string): void | Promise<void> => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
    if (isNative) {
      Preferences.remove({ key }).catch(() => {});
    }
  }
};

// Advanced lock interface compatible with standard patterns
export interface SupabaseLock {
  (name: string, acquireTimeout: number, callback: () => Promise<any>): Promise<any>;
  runExclusive: <T>(callback: () => Promise<T>) => Promise<T>;
}

// internal implementation of the lock
const createSupabaseLock = (): SupabaseLock => {
  const lockFn = async (name: string, acquireTimeout: number, callback: () => Promise<any>) => {
    // Standard web browser fallback if we can't use complex locking
    if (typeof window !== 'undefined' && !isNative) {
      return await callback();
    }

    const state = (globalThis as any).__startSupabaseLockState || ((globalThis as any).__startSupabaseLockState = { tails: new Map<string, Promise<void>>() });
    const tails: Map<string, Promise<void>> = state.tails;

    const previous = tails.get(name) || Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    tails.set(name, previous.then(() => current));

    if (acquireTimeout && acquireTimeout > 0) {
      const waitForPrevious = Promise.race([
        previous,
        new Promise<void>((_, reject) => setTimeout(() => reject(new Error(`Supabase lock timeout: ${name}`)), acquireTimeout)),
      ]);
      await waitForPrevious;
    } else {
      await previous;
    }
    try {
      return await callback();
    } finally {
      release();
    }
  };

  const lockObj = lockFn as SupabaseLock;
  lockObj.runExclusive = async <T>(callback: () => Promise<T>): Promise<T> => {
    return await lockFn('shared-mutex', 30000, callback);
  };

  return lockObj;
};

export const supabaseLock = createSupabaseLock();

const supabaseInner = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // V1.8.0: Disable internal locking on Native to prevent "Lock not released" hang
    // Standard web browser fallback if we can't use complex locking
    lock: isNative ? {
      acquire: async (name: string, timeout: number, callback: () => Promise<any>) => await callback(),
      release: async () => {}
    } as any : undefined,
    // Use custom storage ONLY for native to handle Preferences sync
    // For web, we use default localStorage which is most stable
    storage: isNative ? appStorage : undefined,
    storageKey: 'start-location-v1-session',
    // DO NOT override flowType for Web - let Supabase use its defaults
    ...(isNative ? {
      flowType: 'pkce',
    } : {
      flowType: 'implicit', // Use implicit for broad browser compatibility if PKCE fails
    })
  },
  global: {
    // V1.8.0: Use CapacitorHttp for Native to bypass CORS and improve reliability
    // Note: CapacitorHttp must be imported or available globally
    fetch: isNative ? (async (...args: any[]) => {
      const { CapacitorHttp } = await import('@capacitor/core');

      // Normalize headers: CapacitorHttp needs a plain Record<string,string>
      // Supabase sometimes passes a Headers instance instead of a plain object
      const rawHeaders = args[1]?.headers;
      let plainHeaders: Record<string, string> = {};
      if (rawHeaders instanceof Headers) {
        rawHeaders.forEach((value: string, key: string) => { plainHeaders[key] = value; });
      } else if (rawHeaders && typeof rawHeaders === 'object') {
        plainHeaders = { ...rawHeaders };
      }

      // Normalize body: CapacitorHttp expects a parsed object, not a JSON string
      let bodyData: any = undefined;
      const rawBody = args[1]?.body;
      if (rawBody) {
        if (typeof rawBody === 'string') {
          try { bodyData = JSON.parse(rawBody); } catch { bodyData = rawBody; }
        } else {
          bodyData = rawBody;
        }
      }

      // V1.9.6: Minimalist High-Compatibility Fetch Bridge
      // This implementation avoids complex object structures that trigger 'this.lock' errors
      const res = await CapacitorHttp.request({
        url: args[0] as string,
        method: (args[1]?.method as any) || 'GET',
        headers: plainHeaders,
        data: bodyData,
        connectTimeout: 30000, // V2.1.1: Increased to 30s for slow connections
        readTimeout: 30000,
      }).catch(err => {
        console.error("CapacitorHttp: Request failed", err);
        throw err;
      });

      const responseData = res.data;
      const isString = typeof responseData === 'string';

      // V2.1.0: EMERGENCY FETCH BRIDGE (RADICAL COMPATIBILITY)
      // This implementation avoids all object-literal issues and uses standard Response
      const status = res.status || 200;
      const body = isString ? responseData : JSON.stringify(responseData || "");
      
      // Instead of an object, we use the real Response constructor but with a polyfill-friendly approach
      const headers = new Headers();
      if (res.headers) {
        Object.entries(res.headers).forEach(([k, v]) => headers.set(k, String(v)));
      }

      const responseInit = {
        status: status,
        statusText: String(status),
        headers: headers
      };

      try {
        // Attempt to create a real Response instance if available
        if (typeof Response !== 'undefined') {
          return new Response(body, responseInit);
        }
      } catch (e) {
        console.warn("Supabase Bridge: Native Response constructor failed, using fallback object");
      }

      // Final Fallback: Fully compliant object if constructor fails
      return {
        ok: status >= 200 && status < 300,
        status: status,
        statusText: String(status),
        url: args[0] as string,
        headers: headers,
        json: async () => (isString && responseData ? JSON.parse(responseData) : (responseData || {})),
        text: async () => body,
        blob: async () => new Blob([body]),
        arrayBuffer: async () => new TextEncoder().encode(body).buffer,
        clone: function() { return this; },
      } as unknown as Response;
    }) : undefined
  },
  // Global Realtime configuration for Web
  realtime: {
    params: {
      events_per_second: 20, // V2.1.1: Reduced from 50 to stabilize slow connections
    },
  },
    config: {
      broadcast: { self: true },
      presence: { key: 'admin-monitor' },
    },
  },
});

export const supabase = supabaseInner;

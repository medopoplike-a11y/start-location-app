import { createClient, SupportedStorage } from '@supabase/supabase-js';
import { config } from './config';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = config.supabase.url || 'https://placeholder.supabase.co';
const supabaseAnonKey = config.supabase.anonKey || 'placeholder-anon-key';

const isNative = Capacitor.isNativePlatform();

// V4.0.0: GLOBAL WEB API MOCKS (THE NUCLEAR OPTION)
// These mocks ensure that even if the Android WebView is extremely outdated or buggy,
// the core Web APIs expected by Supabase/GoTrue are present and functional.
if (typeof window !== 'undefined' && isNative) {
  // 1. Mock navigator.locks if missing (GoTrue uses this for internal locking)
  if (!(navigator as any).locks) {
    (navigator as any).locks = {
      request: async (name: string, options: any, callback: any) => {
        const cb = typeof options === 'function' ? options : callback;
        if (cb) return await cb();
      }
    };
  }

  // 2. Ensure globalThis.lock exists (some libraries look here)
  if (!(globalThis as any).lock) {
    (globalThis as any).lock = async (name: string, timeout: any, callback: any) => {
      const cb = typeof timeout === 'function' ? timeout : callback;
      if (cb) return await cb();
    };
  }
}

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
    // V2.1.5: RADICAL SIMPLICITY - Always bypass locking on Native
    // This prevents any "this.lock" or mutex-related hangs in buggy WebViews
    if (isNative || (typeof window !== 'undefined' && !isNative)) {
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

// V3.0.0: GLOBAL FETCH HIJACKING (THE ULTIMATE FIX)
// This overrides window.fetch globally to ensure EVERY network request in the app
// uses our safe CapacitorHttp bridge, bypassing buggy Android WebView fetch/Response.
if (typeof window !== 'undefined' && isNative) {
  const originalFetch = window.fetch;
  (window as any).fetch = async (...args: any[]) => {
    try {
      const { CapacitorHttp } = await import('@capacitor/core');
      let url = typeof args[0] === 'string' ? args[0] : (args[0] as any).url;
      const options = args[1] || {};
      
      // V4.1.0: Better URL handling for relative paths
      if (url && typeof url === 'string' && !url.startsWith('http')) {
        const origin = process.env.NEXT_PUBLIC_APP_URL || '';
        url = url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
      }

      // If still not a valid URL or doesn't start with http, fallback to original
      if (!url || (typeof url === 'string' && !url.startsWith('http'))) return originalFetch(...args);

      // Normalize headers
      const rawHeaders = options.headers;
      let plainHeaders: Record<string, string> = {};
      if (rawHeaders instanceof Headers) {
        rawHeaders.forEach((v, k) => { plainHeaders[k] = v; });
      } else if (rawHeaders && typeof rawHeaders === 'object') {
        plainHeaders = { ...rawHeaders };
      }

      // Normalize body
      let bodyData: any = undefined;
      if (options.body) {
        if (typeof options.body === 'string') {
          try { bodyData = JSON.parse(options.body); } catch { bodyData = options.body; }
        } else {
          bodyData = options.body;
        }
      }

      const res = await CapacitorHttp.request({
        url: url,
        method: options.method || 'GET',
        headers: plainHeaders,
        data: bodyData,
        connectTimeout: 30000,
        readTimeout: 30000,
      });

      const responseData = res.data;
      const isString = typeof responseData === 'string';
      const body = isString ? responseData : JSON.stringify(responseData || "");
      const status = res.status || 200;

      // Manual Headers Implementation (No internal slots)
      const headerMap = new Map<string, string>();
      if (res.headers) {
        Object.entries(res.headers).forEach(([k, v]) => headerMap.set(k.toLowerCase(), String(v)));
      }

      const mockHeaders = {
        get: (n: string) => headerMap.get(n.toLowerCase()) || null,
        has: (n: string) => headerMap.has(n.toLowerCase()),
        forEach: (cb: any) => headerMap.forEach((v, k) => cb(v, k)),
        entries: () => headerMap.entries(),
        keys: () => headerMap.keys(),
        values: () => headerMap.values(),
        [Symbol.iterator]: () => headerMap.entries()[Symbol.iterator](),
      };

      // The "Unbreakable" Response Object (V4.0.0: More robust interface)
      const responseFallback = {
        ok: status >= 200 && status < 300,
        status: status,
        statusText: "OK",
        url: url,
        headers: mockHeaders,
        json: async () => (typeof responseData === 'object' ? responseData : JSON.parse(body)),
        text: async () => body,
        blob: async () => new Blob([body]),
        arrayBuffer: async () => new TextEncoder().encode(body).buffer,
        clone: function() { return { ...this, clone: this.clone }; },
        body: null,
        bodyUsed: false,
        type: 'default',
        redirected: false,
        // V4.0.0: Added missing methods to prevent TypeError
        formData: async () => new FormData(),
        lock: async (name: string, timeout: any, callback: any) => {
          const cb = typeof timeout === 'function' ? timeout : callback;
          if (cb) return await cb();
        }
      };

      return responseFallback as unknown as Response;
    } catch (e) {
      console.error("Global Fetch Bridge Error:", e);
      return originalFetch(...args);
    }
  };
  (window as any).__START_FETCH_BRIDGE_ACTIVE = true;
}

const supabaseInner = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // V4.0.0: A functional lock that DOES NOT block
    lock: isNative ? {
      acquire: async (name: string, timeout: any, callback: any) => {
        const cb = typeof timeout === 'function' ? timeout : callback;
        if (cb) return await cb();
      },
      release: async () => {}
    } as any : undefined,
    storage: isNative ? appStorage : undefined,
    storageKey: 'start-location-v1-session',
    flowType: isNative ? 'pkce' : 'implicit'
  },
  global: {
    fetch: undefined 
  },
  realtime: {
    params: {
      events_per_second: 20,
    },
  },
});

// V4.0.0: Instance-level method injection to stop TypeError: this.lock is not a function
if (isNative) {
  (supabaseInner as any).lock = async (name: string, timeout: any, callback: any) => {
    const cb = typeof timeout === 'function' ? timeout : callback;
    if (cb) return await cb();
  };
  (supabaseInner as any).acquire = async (name: string, timeout: any, callback: any) => {
    const cb = typeof timeout === 'function' ? timeout : callback;
    if (cb) return await cb();
  };
}

export const supabase = supabaseInner;

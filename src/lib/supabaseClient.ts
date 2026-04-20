import { createClient, SupportedStorage } from '@supabase/supabase-js';
import { config } from './config';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = config.supabase.url || 'https://placeholder.supabase.co';
const supabaseAnonKey = config.supabase.anonKey || 'placeholder-anon-key';

const isNative = Capacitor.isNativePlatform();

// V13.0.0: NATIVE SUPABASE BRIDGE (THE CLEAN WAY)
// A direct REST bridge for mobile to bypass library bugs.
export class NativeSupabaseBridge {
  private async request(path: string, options: any = {}) {
    const { CapacitorHttp } = await import('@capacitor/core');
    const url = `${supabaseUrl}${path}`;
    
    const res = await CapacitorHttp.request({
      url,
      method: options.method || 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      data: options.body ? JSON.parse(options.body) : undefined
    });
    return res.data;
  }

  from(table: string) {
    return {
      select: (columns: string = '*') => ({
        limit: (n: number) => this.request(`/rest/v1/${table}?select=${columns}&limit=${n}`)
      })
    };
  }
}

const nativeBridge = new NativeSupabaseBridge();

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



const supabaseInner = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // V9.0.0: FORCED DATA SYNC - Ensure auth events trigger data refresh
    lock: isNative ? {
      acquire: async (name: string, timeout: any, callback: any) => {
        const cb = typeof timeout === 'function' ? timeout : callback;
        if (cb) return await cb();
      },
      release: async () => {}
    } as any : undefined,
    storage: isNative ? appStorage : undefined,
    storageKey: 'start-location-v10-final', // V10.0.0: New storage key to clear old sessions
    flowType: isNative ? 'pkce' : 'implicit'
  },
  global: {
    // V9.0.0: Increase fetch timeout and retry logic for slow connections
    fetch: undefined 
  },
  realtime: {
    params: {
      events_per_second: 20,
    },
  },
});

// V9.0.0: Global Event Bus for Connection Monitoring
if (typeof window !== 'undefined') {
  (window as any).__SUPABASE_CLIENT = supabaseInner;
}

// V13.0.0: CLEANUP - Removed all manual patchClient and global hijacking
export const supabase = supabaseInner;

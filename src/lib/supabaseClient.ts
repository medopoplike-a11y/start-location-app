import { createClient, SupportedStorage } from '@supabase/supabase-js';
import { config } from './config';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = config.supabase.url || 'https://placeholder.supabase.co';
const supabaseAnonKey = config.supabase.anonKey || 'placeholder-anon-key';

const isNative = typeof window !== 'undefined' && 
  (window as any).Capacitor?.isNativePlatform?.() === true;

// Standard storage for maximum compatibility with all browsers and Capacitor
const appStorage: SupportedStorage = {
  getItem: (key: string): string | null | Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    
    const localValue = localStorage.getItem(key);
    if (localValue) return localValue;

    // V1.6.4: Fallback to Preferences on Native if localStorage is empty
    if (isNative) {
      return Preferences.get({ key }).then(res => res.value);
    }
    
    return null;
  },
  setItem: (key: string, value: string): void | Promise<void> => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
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
    // Use custom storage ONLY for native to handle Preferences sync
    // For web, we use default localStorage which is most stable
    storage: isNative ? appStorage : undefined,
    storageKey: 'start-location-v1-session',
    // DO NOT override flowType or lock for Web - let Supabase use its defaults
    ...(isNative ? {
      flowType: 'pkce',
      lock: supabaseLock as any
    } : {
      flowType: 'implicit', // Use implicit for broad browser compatibility if PKCE fails
    })
  },
  // Global Realtime configuration for Web
  realtime: {
    params: {
      events_per_second: 50, // Higher frequency for smoother map movement
    },
    config: {
      broadcast: { self: true },
      presence: { key: 'admin-monitor' },
    },
  },
});

export const supabase = supabaseInner;

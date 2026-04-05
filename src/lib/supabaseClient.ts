import { createClient, SupportedStorage } from '@supabase/supabase-js';
import { config } from './config';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const supabaseUrl = config.supabase.url || 'https://placeholder.supabase.co';
const supabaseAnonKey = config.supabase.anonKey || 'placeholder-anon-key';

const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

// Unified storage that uses Preferences on mobile and localStorage on web
const appStorage: SupportedStorage = {
  getItem: (key: string): string | null | Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    if (isNative) {
      return Preferences.get({ key }).then(res => res.value);
    }
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string): void | Promise<void> => {
    if (typeof window === 'undefined') return;
    if (isNative) {
      return Preferences.set({ key, value });
    }
    localStorage.setItem(key, value);
  },
  removeItem: (key: string): void | Promise<void> => {
    if (typeof window === 'undefined') return;
    if (isNative) {
      return Preferences.remove({ key });
    }
    localStorage.removeItem(key);
  }
};

// Advanced lock interface compatible with standard patterns
export interface SupabaseLock {
  (name: string, acquireTimeout: number, callback: () => Promise<any>): Promise<any>;
  runExclusive: <T>(callback: () => Promise<T>) => Promise<T>;
}

// Internal implementation of the lock
const createSupabaseLock = (): SupabaseLock => {
  const lockFn = async (name: string, acquireTimeout: number, callback: () => Promise<any>) => {
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
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
    storage: appStorage,
    storageKey: 'start-location-auth',
    flowType: 'pkce',
    lock: supabaseLock as any,
  },
});

export const supabase = supabaseInner;

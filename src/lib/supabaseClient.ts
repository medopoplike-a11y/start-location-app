import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

// Log the actual values being used (first 20 chars only for security)
console.log('SupabaseClient: URL exists:', !!supabaseUrl);
console.log('SupabaseClient: URL starts with:', supabaseUrl.substring(0, 30) + '...');
console.log('SupabaseClient: Key exists:', !!supabaseAnonKey);
console.log('SupabaseClient: Key length:', supabaseAnonKey.length);

// Simple storage that works in both browser and server
const simpleStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors
    }
  }
};

// No-op lock function to bypass navigator locks
const noOpLock = async (name: string, acquireTimeout: number, callback: () => Promise<any>) => {
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

export const supabaseLock = noOpLock;

const supabaseInner = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
    storage: simpleStorage,
    lock: noOpLock as any,
  },
});

export const supabase = supabaseInner;

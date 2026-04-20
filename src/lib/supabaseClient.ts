import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = config.supabase.url || 'https://placeholder.supabase.co';
const supabaseAnonKey = config.supabase.anonKey || 'placeholder-anon-key';

/**
 * V14.2.4: THE ULTIMATE NATIVE DRIVER (RADICAL ARCHITECTURE)
 * Sticky environment detection to prevent session flip-flopping.
 */
let _isNativeSticky: boolean | null = null;

const getIsNative = () => {
  if (typeof window === 'undefined') return false;
  if (_isNativeSticky !== null) return _isNativeSticky;

  const detected = (
    (window as any).Capacitor?.isNativePlatform?.() || 
    (window as any).Capacitor?.getPlatform?.() !== 'web' ||
    Capacitor.isNativePlatform()
  );

  if (detected) {
    _isNativeSticky = true;
    console.log("SupabaseClient: Native environment STICKY detected.");
  }
  return detected;
};

// Also check immediately if possible
if (typeof window !== 'undefined') {
  getIsNative();
}

class SupabaseNativeDriver {
  private authSubscribers: ((event: string, session: any) => void)[] = [];

  private async restRequest(path: string, options: any = {}) {
    try {
      const { CapacitorHttp } = await import('@capacitor/core');
      const { Preferences } = await import('@capacitor/preferences');
      
      const { value: sessionJson } = await Preferences.get({ key: 'sb-session-v14' });
      const session = sessionJson ? JSON.parse(sessionJson) : null;
      const token = session?.access_token || supabaseAnonKey;

      const headers: any = {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      };

      if (options.single) {
        headers['Accept'] = 'application/vnd.pgrst.object+json';
      }

      const res = await CapacitorHttp.request({
        url: `${supabaseUrl}${path}`,
        method: options.method || 'GET',
        headers,
        data: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined
      });

      if (res.status === 401 || res.status === 403) {
        console.warn("Native Driver: Unauthorized request, forcing session check...");
        // Possible expired session - we don't auto-refresh here to avoid loops
        // but the app should handle this via onAuthStateChange or manual refresh
      }

      // Handle PostgREST specific errors and formatting
      const error = res.status >= 400 ? { 
        message: res.data?.message || res.data?.error_description || `API Error ${res.status}`, 
        status: res.status,
        details: res.data
      } : null;

      return { data: res.data, error };
    } catch (e: any) {
      console.error("Native Driver Request Error:", e);
      return { data: null, error: { message: e.message || "Network Error" } };
    }
  }

  auth = {
    signInWithPassword: async ({ email, password }: any) => {
      try {
        const { CapacitorHttp } = await import('@capacitor/core');
        const { Preferences } = await import('@capacitor/preferences');
        
        const res = await CapacitorHttp.request({
          url: `${supabaseUrl}/auth/v1/token?grant_type=password`,
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json'
          },
          data: { email, password }
        });

        if (res.status >= 400) {
          return { data: { user: null, session: null }, error: { message: res.data?.error_description || res.data?.message || 'فشل تسجيل الدخول' } };
        }

        const session = res.data;
        await Preferences.set({ key: 'sb-session-v14', value: JSON.stringify(session) });
        
        // Notify subscribers
        this.notifyAuthSubscribers('SIGNED_IN', session);

        return { data: { user: session.user, session }, error: null };
      } catch (e: any) {
        return { data: { user: null, session: null }, error: { message: e.message || 'خطأ في الاتصال' } };
      }
    },
    getSession: async () => {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        const { value } = await Preferences.get({ key: 'sb-session-v14' });
        return { data: { session: value ? JSON.parse(value) : null }, error: null };
      } catch {
        return { data: { session: null }, error: null };
      }
    },
    getUser: async () => {
      const { data } = await this.auth.getSession();
      return { data: { user: data.session?.user || null }, error: null };
    },
    signOut: async () => {
      try {
        const { Preferences } = await import('@capacitor/preferences');
        await Preferences.remove({ key: 'sb-session-v14' });
        
        // Notify subscribers
        this.notifyAuthSubscribers('SIGNED_OUT', null);
        
        return { error: null };
      } catch (e: any) {
        return { error: e };
      }
    },
    updateUser: async (updates: any) => {
      return await this.restRequest('/auth/v1/user', { method: 'PUT', body: updates });
    },
    refreshSession: async () => {
      try {
        const { CapacitorHttp } = await import('@capacitor/core');
        const { Preferences } = await import('@capacitor/preferences');
        
        const { value: sessionJson } = await Preferences.get({ key: 'sb-session-v14' });
        const session = sessionJson ? JSON.parse(sessionJson) : null;
        
        if (!session?.refresh_token) return { data: { session: null, user: null }, error: { message: 'No refresh token' } };

        const res = await CapacitorHttp.request({
          url: `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json'
          },
          data: { refresh_token: session.refresh_token }
        });

        if (res.status >= 400) {
          return { data: { session: null, user: null }, error: { message: 'فشل تجديد الجلسة' } };
        }

        const newSession = res.data;
        await Preferences.set({ key: 'sb-session-v14', value: JSON.stringify(newSession) });
        
        this.notifyAuthSubscribers('TOKEN_REFRESHED', newSession);
        
        return { data: { session: newSession, user: newSession.user }, error: null };
      } catch (e: any) {
        return { data: { session: null, user: null }, error: { message: e.message || 'خطأ في تجديد الجلسة' } };
      }
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      this.authSubscribers.push(callback);
      // Immediately send current session
      this.auth.getSession().then(({ data }) => {
        if (data.session) callback('INITIAL_SESSION', data.session);
      });
      
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.authSubscribers = this.authSubscribers.filter(sub => sub !== callback);
            }
          }
        }
      };
    }
  };

  private notifyAuthSubscribers(event: string, session: any) {
    this.authSubscribers.forEach(sub => {
      try { sub(event, session); } catch (e) { console.error("Auth subscriber error:", e); }
    });
  }

  rpc(name: string, params: any = {}) {
    return this.restRequest(`/rest/v1/rpc/${name}`, { method: 'POST', body: params });
  }

  from(table: string) {
    const createBuilder = (method: string = 'GET', initialBody?: any) => {
      const state = {
        params: new URLSearchParams(),
        headers: {} as any,
        isSingle: false,
        body: initialBody
      };

      const builder: any = {
        select(columns: string = '*') {
          state.params.set('select', columns);
          return builder;
        },
        eq(col: string, val: any) {
          state.params.set(col, `eq.${val}`);
          return builder;
        },
        neq(col: string, val: any) {
          state.params.set(col, `neq.${val}`);
          return builder;
        },
        gt(col: string, val: any) {
          state.params.set(col, `gt.${val}`);
          return builder;
        },
        lt(col: string, val: any) {
          state.params.set(col, `lt.${val}`);
          return builder;
        },
        in(col: string, vals: any[]) {
          state.params.set(col, `in.(${vals.join(',')})`);
          return builder;
        },
        or(filters: string) {
          state.params.set('or', `(${filters})`);
          return builder;
        },
        order(col: string, { ascending = true } = {}) {
          state.params.set('order', `${col}.${ascending ? 'asc' : 'desc'}`);
          return builder;
        },
        limit(n: number) {
          state.params.set('limit', n.toString());
          return builder;
        },
        single() {
          state.isSingle = true;
          return builder;
        },
        maybeSingle() {
          state.isSingle = true;
          return builder;
        },
        // Support for .insert().select().single() pattern
        select_chain() {
          return builder;
        },
        // The Magic: makes it awaitable
        async then(onfulfilled: any, onrejected?: any) {
          try {
            const queryString = state.params.toString();
            const path = `/rest/v1/${table}${queryString ? '?' + queryString : ''}`;
            const result = await nativeDriver.restRequest(path, { 
              method, 
              body: state.body,
              single: state.isSingle,
              headers: state.headers
            });
            return onfulfilled ? onfulfilled(result) : result;
          } catch (e) {
            if (onrejected) return onrejected(e);
            throw e;
          }
        }
      };

      return builder;
    };

    return {
      select: (cols?: string) => createBuilder('GET').select(cols),
      insert: (data: any) => {
        const b = createBuilder('POST', data);
        b.headers['Prefer'] = 'return=representation';
        return b;
      },
      update: (data: any) => {
        const b = createBuilder('PATCH', data);
        b.headers['Prefer'] = 'return=representation';
        return b;
      },
      delete: () => createBuilder('DELETE'),
      upsert: (data: any, { onConflict }: any = {}) => {
        const b = createBuilder('POST', data);
        let prefer = 'return=representation,resolution=merge-duplicates';
        b.headers['Prefer'] = prefer;
        if (onConflict) b.params.set('on_conflict', onConflict);
        return b;
      }
    };
  }

  // Real-time Mock - prevents library crashes
  channel(name: string) {
    console.warn(`V14.1.0: Real-time channel '${name}' is mocked on Native.`);
    const mockChannel = {
      on: () => mockChannel,
      subscribe: (callback: any) => {
        if (callback) setTimeout(() => callback('SUBSCRIBED'), 0);
        return { unsubscribe: () => ({}) };
      },
      send: async () => ({})
    };
    return mockChannel;
  }
  removeChannel() {}
}

const nativeDriver = new SupabaseNativeDriver();

// Lazy Web Client initialization
let webClientInstance: any = null;
const getWebClient = () => {
  const currentIsNative = getIsNative();
  if (!webClientInstance && !currentIsNative) {
    console.log("SupabaseClient: Initializing Web Client (isNative=false)");
    webClientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    });
  }
  return webClientInstance;
};

// V14.2.2: The Universal Proxy Driver (ZERO library calls on Native)
export const supabase = new Proxy({} as any, {
  get: (target, prop: string) => {
    // We re-check native status on every call just in case it was initialized late
    const currentIsNative = getIsNative();
    
    if (currentIsNative) {
      if (prop === 'auth') return nativeDriver.auth;
      if (prop === 'from') return (table: string) => nativeDriver.from(table);
      if (prop === 'rpc') return (name: string, params: any) => nativeDriver.rpc(name, params);
      if (prop === 'channel') return (name: string) => nativeDriver.channel(name);
      if (prop === 'removeChannel') return () => nativeDriver.removeChannel();
      
      // If code tries to access something we haven't implemented,
      // return a safe no-op instead of falling back to webClient (which would crash)
      if (typeof (nativeDriver as any)[prop] === 'function') {
        return (nativeDriver as any)[prop].bind(nativeDriver);
      }
      return (nativeDriver as any)[prop] || undefined;
    }
    
    const client = getWebClient();
    if (!client) {
      console.warn(`Supabase Proxy: Accessing '${prop}' on null client (isNative=false)`);
      return undefined;
    }
    return (client as any)[prop];
  }
});

export default supabase;

import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import { Capacitor } from '@capacitor/core';

const supabaseUrl = config.supabase.url || 'https://placeholder.supabase.co';
const supabaseAnonKey = config.supabase.anonKey || 'placeholder-anon-key';

/**
 * V15.0.0: RADICAL NATIVE ARCHITECTURE
 * Final, unified, and immutable environment detection.
 */
const getIsNativeStable = () => {
  if (typeof window === 'undefined') return false;
  
  // Use a reliable global flag that persists across some reloads but is set correctly on boot
  if ((window as any)._IS_NATIVE_STABLE !== undefined) return (window as any)._IS_NATIVE_STABLE;

  const isCap = !!(window as any).Capacitor;
  const platform = isCap ? (window as any).Capacitor.getPlatform?.() : 'web';
  const detected = isCap && platform !== 'web';

  (window as any)._IS_NATIVE_STABLE = detected;
  console.log(`[SupabaseV15] Native detection: ${detected} (Platform: ${platform})`);
  return detected;
};

const isNative = getIsNativeStable();

class SupabaseNativeDriver {
  private authSubscribers: ((event: string, session: any) => void)[] = [];

  private async restRequest(path: string, options: any = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

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
        data: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined,
        // CapacitorHttp doesn't support signal directly in all versions, 
        // but we can at least try to handle the rejection
      });

      clearTimeout(timeoutId);

      if (res.status === 401 || res.status === 403) {
        console.warn("[SupabaseV16] Unauthorized - session may be expired");
      }

      const error = res.status >= 400 ? { 
        message: res.data?.message || res.data?.error_description || `API Error ${res.status}`, 
        status: res.status,
        details: res.data
      } : null;

      return { data: res.data, error };
    } catch (e: any) {
      clearTimeout(timeoutId);
      console.error("[SupabaseV16] Request error:", path, e.message);
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
        const session = value ? JSON.parse(value) : null;
        return { data: { session }, error: null };
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
        this.notifyAuthSubscribers('SIGNED_OUT', null);
        return { error: null };
      } catch (e: any) {
        return { error: e };
      }
    },
    refreshSession: async () => {
      try {
        const { CapacitorHttp } = await import('@capacitor/core');
        const { Preferences } = await import('@capacitor/preferences');
        const { value: sessionJson } = await Preferences.get({ key: 'sb-session-v14' });
        const session = sessionJson ? JSON.parse(sessionJson) : null;
        if (!session?.refresh_token) return { data: { session: null, user: null }, error: { message: 'No refresh token' } };
        
        // V16.1.0: Prevent rapid consecutive session refreshes
        const now = Date.now();
        if ((window as any)._LAST_REFRESH_TS && now - (window as any)._LAST_REFRESH_TS < 10000) {
          console.log("[SupabaseV16] Skipping rapid session refresh (throttle)");
          return { data: { session, user: session.user }, error: null };
        }
        (window as any)._LAST_REFRESH_TS = now;

        const res = await CapacitorHttp.request({
          url: `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
          method: 'POST',
          headers: { 'apikey': supabaseAnonKey, 'Content-Type': 'application/json' },
          data: { refresh_token: session.refresh_token }
        });
        if (res.status >= 400) return { data: { session: null, user: null }, error: { message: 'Expired' } };
        const newSession = res.data;
        await Preferences.set({ key: 'sb-session-v14', value: JSON.stringify(newSession) });
        this.notifyAuthSubscribers('TOKEN_REFRESHED', newSession);
        return { data: { session: newSession, user: newSession.user }, error: null };
      } catch (e: any) {
        return { data: { session: null, user: null }, error: { message: e.message } };
      }
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      this.authSubscribers.push(callback);
      // V16.2.0: Trigger INITIAL_SESSION if we have one
      this.auth.getSession().then(({ data }) => {
        if (data.session) callback('INITIAL_SESSION', data.session);
      });
      return { data: { subscription: { unsubscribe: () => { this.authSubscribers = this.authSubscribers.filter(sub => sub !== callback); } } } };
    }
  };

  private notifyAuthSubscribers(event: string, session: any) {
    this.authSubscribers.forEach(sub => { try { sub(event, session); } catch (e) {} });
  }

  rpc(name: string, params: any = {}) { return this.restRequest(`/rest/v1/rpc/${name}`, { method: 'POST', body: params }); }
  from(table: string) {
    const createBuilder = (method: string = 'GET', initialBody?: any) => {
      const state = { params: new URLSearchParams(), headers: {} as any, isSingle: false, body: initialBody };
      const builder: any = {
        select(columns: string = '*') { state.params.set('select', columns); return builder; },
        eq(col: string, val: any) { state.params.set(col, `eq.${val}`); return builder; },
        neq(col: string, val: any) { state.params.set(col, `neq.${val}`); return builder; },
        limit(n: number) { state.params.set('limit', n.toString()); return builder; },
        single() { state.isSingle = true; return builder; },
        maybeSingle() { state.isSingle = true; return builder; },
        async then(onfulfilled: any, onrejected?: any) {
          try {
            const queryString = state.params.toString();
            const path = `/rest/v1/${table}${queryString ? '?' + queryString : ''}`;
            const result = await nativeDriver.restRequest(path, { method, body: state.body, single: state.isSingle, headers: state.headers });
            return onfulfilled ? onfulfilled(result) : result;
          } catch (e) { if (onrejected) return onrejected(e); throw e; }
        }
      };
      return builder;
    };
    return {
      select: (cols?: string) => createBuilder('GET').select(cols),
      insert: (data: any) => { const b = createBuilder('POST', data); b.headers['Prefer'] = 'return=representation'; return b; },
      update: (data: any) => { const b = createBuilder('PATCH', data); b.headers['Prefer'] = 'return=representation'; return b; },
      delete: () => createBuilder('DELETE'),
      upsert: (data: any, { onConflict }: any = {}) => {
        const b = createBuilder('POST', data);
        b.headers['Prefer'] = 'return=representation,resolution=merge-duplicates';
        if (onConflict) b.params.set('on_conflict', onConflict);
        return b;
      }
    };
  }
  channel(name: string) { return { on: () => this.channel(name), subscribe: (callback: any) => { if (callback) setTimeout(() => callback('SUBSCRIBED'), 0); return { unsubscribe: () => ({}) }; }, send: async () => ({}) }; }
  removeChannel() {}
}

const nativeDriver = new SupabaseNativeDriver();

// V15.0.0: THE UNIVERSAL PROXY (IMMUTABLE DISPATCH)
export const supabase = new Proxy({} as any, {
  get: (target, prop: string) => {
    if (isNative) {
      if (prop === 'auth') return nativeDriver.auth;
      if (prop === 'from') return (table: string) => nativeDriver.from(table);
      if (prop === 'rpc') return (name: string, params: any) => nativeDriver.rpc(name, params);
      if (prop === 'channel') return (name: string) => nativeDriver.channel(name);
      if (prop === 'removeChannel') return () => nativeDriver.removeChannel();
      return (nativeDriver as any)[prop]?.bind?.(nativeDriver) || (nativeDriver as any)[prop];
    }
    
    if (!target._web) {
      target._web = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
    }
    return target._web[prop];
  }
});

export default supabase;

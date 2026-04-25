import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabaseClient';

/**
 * ─── LOCAL DATABASE SERVICE (SQLite) ─────────────────────────────────────────
 * This is the heart of the "Real Application" architecture.
 * It provides a persistent, ultra-fast local storage for all system data.
 * ─────────────────────────────────────────────────────────────────────────────
 */

class DatabaseService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private isInitialized = false;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  async initialize() {
    if (this.isInitialized || !Capacitor.isNativePlatform()) return;

    try {
      // 1. Create/Open the database
      this.db = await this.sqlite.createConnection('start_location_db', false, 'no-encryption', 1, false);
      await this.db.open();

      // 2. Initialize Tables (Orders, Wallets, Profile Cache)
      await this.db.execute(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          status TEXT,
          customer_name TEXT,
          customer_phone TEXT,
          total_amount REAL,
          delivery_fee REAL,
          vendor_id TEXT,
          driver_id TEXT,
          vendor_name TEXT,
          vendor_phone TEXT,
          vendor_location TEXT,
          vendor_area TEXT,
          driver_name TEXT,
          driver_phone TEXT,
          created_at TEXT,
          updated_at TEXT,
          metadata TEXT,
          raw TEXT
        );

        CREATE TABLE IF NOT EXISTS wallets (
          user_id TEXT PRIMARY KEY,
          balance REAL DEFAULT 0,
          debt REAL DEFAULT 0,
          pending_withdrawals REAL DEFAULT 0,
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          full_name TEXT,
          role TEXT,
          phone TEXT,
          is_online INTEGER DEFAULT 0,
          last_location TEXT,
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT,
          action TEXT,
          payload TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 2b. Backfill columns for users coming from older schema versions
      const backfills = [
        { table: 'orders', col: 'vendor_name TEXT' },
        { table: 'orders', col: 'vendor_phone TEXT' },
        { table: 'orders', col: 'vendor_location TEXT' },
        { table: 'orders', col: 'vendor_area TEXT' },
        { table: 'orders', col: 'driver_name TEXT' },
        { table: 'orders', col: 'driver_phone TEXT' },
        { table: 'orders', col: 'raw TEXT' },
        { table: 'orders', col: 'updated_at TEXT' },
        { table: 'wallets', col: 'debt REAL DEFAULT 0' },
        { table: 'wallets', col: 'updated_at TEXT' },
        { table: 'profiles', col: 'updated_at TEXT' },
      ];
      for (const item of backfills) {
        try {
          await this.db.execute(`ALTER TABLE ${item.table} ADD COLUMN ${item.col};`);
        } catch {
          // Column already exists — safe to ignore
        }
      }

      this.isInitialized = true;
      console.log('✅ SQLite Core: Database Initialized & Tables Ready');
      
      // Initial Sync
      this.syncFromRemote().catch(console.error);
    } catch (err) {
      console.error('❌ SQLite Core: Initialization failed', err);
    }
  }

  /**
   * ─── INTELLIGENT SYNC ENGINE (V18.1.0) ─────────────────────────────────────
   * Proactively repairs data gaps and manages offline/online state transitions.
   * ───────────────────────────────────────────────────────────────────────────
   */
  async syncFromRemote() {
    if (!this.db || !this.isInitialized) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[SyncEngine-V18.1.0] Delta Sync Cycle starting...');

      // 1. Get the latest updated_at from local DB for Delta Sync
      const lastUpdateRes = await this.db.query('SELECT MAX(updated_at) as last_update FROM orders');
      const lastUpdate = lastUpdateRes.values?.[0]?.last_update;

      // 2. Sync Orders with Delta Logic
      let query = supabase
        .from('orders')
        .select('*, vendor:vendor_id(full_name, phone, location, area), driver:driver_id(full_name, phone)')
        .or(`driver_id.eq.${user.id},vendor_id.eq.${user.id}`);

      if (lastUpdate) {
        // Fetch only items updated since our last sync
        query = query.gt('updated_at', lastUpdate);
      }

      const { data: remoteOrders, error: ordersError } = await query
        .order('updated_at', { ascending: false })
        .limit(lastUpdate ? 1000 : 100); // Higher limit for delta sync, lower for initial

      if (ordersError) throw ordersError;

      if (remoteOrders && remoteOrders.length > 0) {
        console.log(`[SyncEngine-V18.1.0] Found ${remoteOrders.length} new/updated orders.`);
        // Atomic transaction for high-speed local updates
        await this.db.execute('BEGIN TRANSACTION');
        try {
          for (const order of remoteOrders) {
            await this.saveOrder(order);
          }
          await this.db.execute('COMMIT');
        } catch (e) {
          await this.db.execute('ROLLBACK');
          throw e;
        }
      }

      // 3. Sync Wallet with Force Fresh
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (wallet && !walletError) {
        await this.db.run(
          'INSERT OR REPLACE INTO wallets (user_id, balance, debt, updated_at) VALUES (?, ?, ?, ?)',
          [wallet.user_id, wallet.balance, wallet.debt, wallet.updated_at]
        );
      }

      console.log('✅ SyncEngine-V18.1.0: Delta Sync Complete');
    } catch (err) {
      console.warn('[SyncEngine] Delta Sync paused (Offline mode?)', err);
    }
  }

  async saveOrder(order: any) {
    if (!this.db) return;

    // V17.4.8: Full Data Persistence including vendor/driver joins + raw row for replay
    const query = `
      INSERT OR REPLACE INTO orders
      (id, status, customer_name, customer_phone, total_amount, delivery_fee,
       vendor_id, driver_id,
       vendor_name, vendor_phone, vendor_location, vendor_area,
       driver_name, driver_phone,
       created_at, updated_at, metadata, raw)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db.run(query, [
      order.id,
      order.status,
      order.customer_details?.name || order.customer_name || 'عميل',
      order.customer_details?.phone || order.customer_phone || '',
      order.financials?.order_value || order.total_amount || 0,
      order.financials?.delivery_fee || order.delivery_fee || 0,
      order.vendor_id,
      order.driver_id,
      order.vendor?.full_name || null,
      order.vendor?.phone || null,
      order.vendor?.location ? JSON.stringify(order.vendor.location) : null,
      order.vendor?.area || null,
      order.driver?.full_name || null,
      order.driver?.phone || null,
      order.created_at,
      order.updated_at || new Date().toISOString(),
      JSON.stringify(order.metadata || {}),
      JSON.stringify(order),
    ]);
  }

  /**
   * Reshape a SQLite row back into the same structure remote queries return,
   * so consumers (driver/vendor/admin pages) work with the cache transparently.
   */
  private hydrateOrderRow(row: any): any {
    // Prefer the full raw payload if it was persisted (newer schema)
    if (row.raw) {
      try { return JSON.parse(row.raw); } catch { /* fall through */ }
    }
    let vendorLocation: any = null;
    if (row.vendor_location) {
      try { vendorLocation = JSON.parse(row.vendor_location); } catch { vendorLocation = row.vendor_location; }
    }
    let metadata: any = {};
    if (row.metadata) {
      try { metadata = JSON.parse(row.metadata); } catch { metadata = {}; }
    }
    return {
      id: row.id,
      status: row.status,
      vendor_id: row.vendor_id,
      driver_id: row.driver_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      customer_details: { name: row.customer_name, phone: row.customer_phone },
      customer_name: row.customer_name,
      customer_phone: row.customer_phone,
      total_amount: row.total_amount,
      delivery_fee: row.delivery_fee,
      financials: {
        order_value: row.total_amount,
        delivery_fee: row.delivery_fee,
      },
      vendor: row.vendor_name || row.vendor_phone ? {
        full_name: row.vendor_name,
        phone: row.vendor_phone,
        location: vendorLocation,
        area: row.vendor_area,
      } : null,
      driver: row.driver_name || row.driver_phone ? {
        full_name: row.driver_name,
        phone: row.driver_phone,
      } : null,
      metadata,
    };
  }

  async getLocalOrders(filter?: {
    role?: 'admin' | 'driver' | 'vendor';
    userId?: string;
    status?: string[];
    limit?: number;
  }) {
    if (!this.db) return [];
    try {
      const where: string[] = [];
      const params: any[] = [];
      if (filter?.role === 'driver' && filter.userId) {
        where.push('(driver_id = ? OR status = ?)');
        params.push(filter.userId, 'pending');
      } else if (filter?.role === 'vendor' && filter.userId) {
        where.push('vendor_id = ?');
        params.push(filter.userId);
      }
      if (filter?.status && filter.status.length > 0) {
        where.push(`status IN (${filter.status.map(() => '?').join(',')})`);
        params.push(...filter.status);
      }
      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const limitClause = filter?.limit ? `LIMIT ${Number(filter.limit)}` : '';
      const sql = `SELECT * FROM orders ${whereClause} ORDER BY created_at DESC ${limitClause}`;
      const result = await this.db.query(sql, params);
      return (result.values || []).map((row: any) => this.hydrateOrderRow(row));
    } catch (e) {
      console.warn('[SQLite] getLocalOrders failed', e);
      return [];
    }
  }

  async clearAll() {
    if (!this.db) return;
    await this.db.execute('DELETE FROM orders; DELETE FROM wallets; DELETE FROM profiles; DELETE FROM sync_queue;');
    await this.vacuum();
  }

  /**
   * V18.1.0: OPTIMIZATION - SQLite Vacuuming
   * Reclaims unused space and defragments the local database file.
   * Recommended after large deletions or once a week.
   */
  async vacuum() {
    if (!this.db) return;
    try {
      console.log('[SQLite] Running VACUUM to optimize storage...');
      await this.db.execute('VACUUM');
      console.log('✅ [SQLite] Database optimized.');
    } catch (e) {
      console.warn('[SQLite] VACUUM failed', e);
    }
  }
}

export const dbService = new DatabaseService();

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
          created_at TEXT,
          updated_at TEXT,
          metadata TEXT
        );

        CREATE TABLE IF NOT EXISTS wallets (
          user_id TEXT PRIMARY KEY,
          balance REAL DEFAULT 0,
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

      this.isInitialized = true;
      console.log('✅ SQLite Core: Database Initialized & Tables Ready');
      
      // Initial Sync
      this.syncFromRemote().catch(console.error);
    } catch (err) {
      console.error('❌ SQLite Core: Initialization failed', err);
    }
  }

  /**
   * ─── SYNC ENGINE ───────────────────────────────────────────────────────────
   * Pulls latest data from Supabase into local SQLite.
   * ───────────────────────────────────────────────────────────────────────────
   */
  async syncFromRemote() {
    if (!this.db || !this.isInitialized) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[SyncEngine] Pulling data from Supabase...');

      // 1. Sync Orders
      const { data: remoteOrders } = await supabase
        .from('orders')
        .select('*')
        .or(`driver_id.eq.${user.id},vendor_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (remoteOrders && remoteOrders.length > 0) {
        for (const order of remoteOrders) {
          await this.saveOrder(order);
        }
      }

      // 2. Sync Wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (wallet) {
        await this.db.run(
          'INSERT OR REPLACE INTO wallets (user_id, balance, pending_withdrawals, updated_at) VALUES (?, ?, ?, ?)',
          [wallet.user_id, wallet.balance, wallet.pending_withdrawals, wallet.updated_at]
        );
      }

      console.log('✅ SyncEngine: Pull complete');
    } catch (err) {
      console.warn('[SyncEngine] Pull failed (Offline mode?)', err);
    }
  }

  // ─── DATA ACCESS METHODS ───────────────────────────────────────────────────

  async saveOrder(order: any) {
    if (!this.db) return;
    const query = `
      INSERT OR REPLACE INTO orders 
      (id, status, customer_name, total_amount, vendor_id, driver_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.db.run(query, [
      order.id, 
      order.status, 
      order.customer_details?.name || order.customer_name, 
      order.financials?.order_value || order.total_amount,
      order.vendor_id,
      order.driver_id,
      order.created_at,
      new Date().toISOString()
    ]);
  }

  async getLocalOrders() {
    if (!this.db) return [];
    try {
      const result = await this.db.query('SELECT * FROM orders ORDER BY created_at DESC');
      return result.values || [];
    } catch (e) {
      return [];
    }
  }

  async clearAll() {
    if (!this.db) return;
    await this.db.execute('DELETE FROM orders; DELETE FROM wallets; DELETE FROM profiles; DELETE FROM sync_queue;');
  }
}

export const dbService = new DatabaseService();

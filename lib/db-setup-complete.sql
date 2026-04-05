-- ============================================================
-- START Location Delivery App - Database Schema
-- Database: Supabase PostgreSQL 15+
-- Last Updated: 2026-03-27
-- ============================================================

-- ============================================================
-- SECTION 1: Authentication & Profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'driver', 'vendor')),
  phone VARCHAR(20),
  area VARCHAR(255),
  vehicle_type VARCHAR(100),
  national_id VARCHAR(20),
  is_locked BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(email)
);

-- Indexes for profiles (Idempotent)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_area ON profiles(area);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- ============================================================
-- SECTION 2: Wallets & Financial
-- ============================================================

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) DEFAULT 0,
  debt DECIMAL(10, 2) DEFAULT 0,
  debt_limit DECIMAL(10, 2) DEFAULT 1000,
  total_earnings DECIMAL(10, 2) DEFAULT 0,
  total_payouts DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_balance ON wallets(balance);

-- ============================================================
-- SECTION 3: Orders & Deliveries
-- ============================================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'assigned', 'in_transit', 'delivered', 'cancelled')
  ),
  distance DECIMAL(8, 2),
  
  -- Customer Details (JSON for flexibility)
  customer_details JSONB DEFAULT '{}',
  
  -- Financials (stored for audit trail)
  financials JSONB DEFAULT '{}',
  
  invoice_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  vendor_collected_at TIMESTAMP,
  driver_confirmed_at TIMESTAMP,
  delivered_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_distance ON orders(distance);

-- ============================================================
-- SECTION 4: Payments & Settlements
-- ============================================================

CREATE TABLE IF NOT EXISTS settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  payment_method VARCHAR(100),
  transaction_hash VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlements_user_id ON settlements(user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON settlements(status);
CREATE INDEX IF NOT EXISTS idx_settlements_created_at ON settlements(created_at DESC);

-- ============================================================
-- SECTION 5: Transactions & Audit
-- ============================================================

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  reference_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  table_name VARCHAR(100),
  record_id VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================
-- SECTION 6: Configuration & Settings
-- ============================================================

CREATE TABLE IF NOT EXISTS app_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  
  -- Version Management
  latest_version VARCHAR(20) DEFAULT '0.2.1',
  min_version VARCHAR(20) DEFAULT '0.2.0',
  download_url TEXT,
  bundle_url TEXT,
  force_update BOOLEAN DEFAULT FALSE,
  update_message TEXT,
  
  -- Pricing Configuration
  driver_commission DECIMAL(5, 2) DEFAULT 15.0,
  vendor_commission DECIMAL(5, 2) DEFAULT 20.0,
  vendor_fee DECIMAL(5, 2) DEFAULT 1.0,
  safe_ride_fee DECIMAL(5, 2) DEFAULT 1.0,
  
  -- System Settings
  maintenance_mode BOOLEAN DEFAULT FALSE,
  maintenance_message TEXT,
  
  -- Limits
  max_driver_debt DECIMAL(10, 2) DEFAULT 5000,
  min_order_value DECIMAL(10, 2) DEFAULT 30,
  
  -- Feature Flags
  enable_auto_matching BOOLEAN DEFAULT TRUE,
  enable_surge_pricing BOOLEAN DEFAULT FALSE,
  enable_scheduled_orders BOOLEAN DEFAULT TRUE,
  
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS driver_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT FALSE,
  location JSONB DEFAULT '{}', -- {lat, lng}
  last_updated TIMESTAMP DEFAULT NOW(),
  orders_completed_today INTEGER DEFAULT 0,
  total_earnings_today DECIMAL(10, 2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_driver_availability_driver_id ON driver_availability(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_availability_is_online ON driver_availability(is_online);
CREATE INDEX IF NOT EXISTS idx_driver_availability_last_updated ON driver_availability(last_updated DESC);

-- ============================================================
-- SECTION 7: Notifications & Messages
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================
-- SECTION 8: Insurance & Risk Management
-- ============================================================

CREATE TABLE IF NOT EXISTS insurance_fund (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL,
  balance DECIMAL(15, 2) DEFAULT 0,
  total_contributions DECIMAL(15, 2) DEFAULT 0,
  total_payouts DECIMAL(15, 2) DEFAULT 0,
  claims_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(month)
);

CREATE TABLE IF NOT EXISTS insurance_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),
  claim_type VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  amount DECIMAL(10, 2),
  evidence_urls TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  processed_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_insurance_claims_user_id ON insurance_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON insurance_claims(status);

-- ============================================================
-- SECTION 9: Views for Complex Queries
-- ============================================================

-- View: Active Drivers on Map
CREATE OR REPLACE VIEW active_drivers_view AS
SELECT
  p.id,
  p.full_name,
  p.phone,
  p.vehicle_type,
  da.location,
  da.is_online,
  da.last_updated,
  w.balance,
  da.orders_completed_today,
  da.total_earnings_today
FROM profiles p
LEFT JOIN driver_availability da ON p.id = da.driver_id
LEFT JOIN wallets w ON p.id = w.user_id
WHERE p.role = 'driver' AND da.is_online = TRUE;

-- View: Today's Orders Summary
CREATE OR REPLACE VIEW todays_orders_summary AS
SELECT
  DATE(o.created_at) as order_date,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as delivered,
  COUNT(CASE WHEN o.status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancelled,
  SUM((o.financials->>'totalFee')::DECIMAL) as total_revenue
FROM orders o
WHERE DATE(o.created_at) = CURRENT_DATE
GROUP BY DATE(o.created_at);

-- View: Driver Analytics
CREATE OR REPLACE VIEW driver_analytics AS
SELECT
  p.id,
  p.full_name,
  p.area,
  COUNT(o.id) as total_deliveries,
  COUNT(CASE WHEN o.status = 'delivered' THEN 1 END) as completed_deliveries,
  ROUND(AVG(CAST(o.distance AS NUMERIC)), 2) as avg_distance,
  SUM(CAST(o.financials->>'driverEarnings' AS NUMERIC)) as total_earnings,
  ROUND((COUNT(CASE WHEN o.status = 'delivered' THEN 1 END)::NUMERIC / NULLIF(COUNT(o.id), 0)) * 100, 2) as completion_rate
FROM profiles p
LEFT JOIN orders o ON p.id = o.driver_id
WHERE p.role = 'driver'
GROUP BY p.id, p.full_name, p.area;

-- ============================================================
-- SECTION 10: RLS (Row Level Security) Policies
-- ============================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies to avoid conflicts
DROP POLICY IF EXISTS "profiles_read_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "wallets_read_policy" ON wallets;
DROP POLICY IF EXISTS "orders_read_policy" ON orders;

-- Profiles: Users can read their own and admin can read all
CREATE POLICY "profiles_read_policy" ON profiles FOR SELECT
  USING (auth.uid() = id OR (auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "profiles_update_policy" ON profiles FOR UPDATE
  USING (auth.uid() = id OR (auth.jwt() ->> 'role') = 'admin');

-- Wallets: Users can only read their own
CREATE POLICY "wallets_read_policy" ON wallets FOR SELECT
  USING (auth.uid() = user_id OR (auth.jwt() ->> 'role') = 'admin');

-- Orders: Vendors see their own, Drivers see assigned, Admin sees all
CREATE POLICY "orders_read_policy" ON orders FOR SELECT
  USING (
    auth.uid() = vendor_id OR
    auth.uid() = driver_id OR
    (auth.jwt() ->> 'role') = 'admin'
  );

-- ============================================================
-- SECTION 11: Triggers & Functions
-- ============================================================

-- Auto-create wallet when new driver is created
CREATE OR REPLACE FUNCTION create_wallet_for_driver()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'driver' THEN
    INSERT INTO wallets (user_id, balance, debt, debt_limit)
    VALUES (NEW.id, 0, 0, 1000)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_wallet_for_driver ON profiles;
CREATE TRIGGER trigger_create_wallet_for_driver
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION create_wallet_for_driver();

-- Update wallet balance when order is completed
CREATE OR REPLACE FUNCTION update_wallet_on_order_delivery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    UPDATE wallets
    SET balance = balance + CAST(NEW.financials->>'driverEarnings' AS NUMERIC)
    WHERE user_id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_wallet_on_delivery ON orders;
CREATE TRIGGER trigger_update_wallet_on_delivery
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_wallet_on_order_delivery();

-- Auto log changes to audit table
CREATE OR REPLACE FUNCTION audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    NEW.id::text,
    row_to_json(OLD),
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- SECTION 12: Storage (for invoices and documents)
-- ============================================================

-- في Supabase يتم إنشاء Buckets من الواجهة
-- ولكن يمكن استخدام SQL:
-- storage.buckets: 
--   - invoices (للفواتير)
--   - avatars (للصور الشخصية)
--   - documents (للمستندات)
--   - bundles (لـ OTA updates)

-- ============================================================
-- SECTION 13: Initial Data
-- ============================================================

-- Insert default app config
INSERT INTO app_config (id, latest_version, min_version, download_url, bundle_url)
VALUES (
  1,
  '0.2.1',
  '0.2.0',
  'https://storage.com/apk/start-location-v0.2.1.apk',
  'https://storage.com/bundles/v0.2.1.zip'
) ON CONFLICT (id) DO NOTHING;

-- Initialize insurance fund table
INSERT INTO insurance_fund (month, balance, total_contributions, total_payouts)
SELECT DATE_TRUNC('month', NOW())::DATE, 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM insurance_fund WHERE month = DATE_TRUNC('month', NOW())::DATE);

-- ============================================================
-- SECTION 14: Performance Optimization
-- ============================================================

-- Vacuum and analyze
-- VACUUM ANALYZE;

-- Create partitions for large tables (if needed in future)
-- ALTER TABLE orders PARTITION BY RANGE (EXTRACT(MONTH FROM created_at));

COMMIT;

-- ============================================================
-- آخر تحديث: 2026-03-27
-- الحالة: ✅ جاهز للإنتاج
-- ============================================================

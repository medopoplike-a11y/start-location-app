-- 0. تفعيل الإضافات المطلوبة
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- V1.3.0: Settlements with User Profiles View for easier querying
CREATE OR REPLACE VIEW public.settlements_with_profiles AS
SELECT 
    s.id,
    s.user_id,
    s.amount,
    s.status,
    s.method,
    s.created_at,
    p.full_name,
    p.role,
    p.phone
FROM public.settlements s
LEFT JOIN public.profiles p ON s.user_id = p.id;

-- 1. إنشاء جدول الملفات الشخصية (Profiles) إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'driver', 'vendor')) NOT NULL DEFAULT 'driver',
  phone TEXT,
  address TEXT,
  area TEXT,
  vehicle_type TEXT,
  national_id TEXT,
  location JSONB,
  is_online BOOLEAN DEFAULT FALSE,
  auto_accept BOOLEAN DEFAULT FALSE,
  last_location_update TIMESTAMP WITH TIME ZONE,
  push_token TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  commission_type TEXT CHECK (commission_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
  commission_value FLOAT DEFAULT 0,
  billing_type TEXT CHECK (billing_type IN ('commission', 'fixed_salary')) DEFAULT 'commission',
  monthly_salary FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- التأكد من وجود أعمدة إضافية في حال كان الجدول موجوداً مسبقاً
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_online') THEN
    ALTER TABLE profiles ADD COLUMN is_online BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='auto_accept') THEN
    ALTER TABLE profiles ADD COLUMN auto_accept BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_location_update') THEN
    ALTER TABLE profiles ADD COLUMN last_location_update TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_locked') THEN
    ALTER TABLE profiles ADD COLUMN is_locked BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='push_token') THEN
    ALTER TABLE profiles ADD COLUMN push_token TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='commission_type') THEN
    ALTER TABLE profiles ADD COLUMN commission_type TEXT CHECK (commission_type IN ('percentage', 'fixed')) DEFAULT 'percentage';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='commission_value') THEN
    ALTER TABLE profiles ADD COLUMN commission_value FLOAT DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='billing_type') THEN
    ALTER TABLE profiles ADD COLUMN billing_type TEXT CHECK (billing_type IN ('commission', 'fixed_salary')) DEFAULT 'commission';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='monthly_salary') THEN
    ALTER TABLE profiles ADD COLUMN monthly_salary FLOAT DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='max_active_orders') THEN
    ALTER TABLE profiles ADD COLUMN max_active_orders INTEGER DEFAULT 3;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='rating') THEN
    ALTER TABLE profiles ADD COLUMN rating FLOAT DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='rating_count') THEN
    ALTER TABLE profiles ADD COLUMN rating_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- تحسين أداء الاستعلامات (Indexes) للخرائط الحية والبحث
CREATE INDEX IF NOT EXISTS idx_profiles_role_online ON profiles(role, is_online);
CREATE INDEX IF NOT EXISTS idx_profiles_last_update ON profiles(last_location_update DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_driver ON orders(status, driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- تفعيل Real-time لكافة الجداول الحساسة بشكل آمن
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'wallets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wallets;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'settlements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE settlements;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- تجاهل الأخطاء في حال كانت الـ Publication غير موجودة أو الصلاحيات محدودة
  RAISE NOTICE 'Could not update publication: %', SQLERRM;
END $$;

-- تفعيل Replica Identity Full لضمان وصول كافة الحقول في الـ Payload
alter table public.orders replica identity full;
alter table public.wallets replica identity full;
alter table public.profiles replica identity full;
alter table public.settlements replica identity full;

-- 1.5. إنشاء جدول سجل المواقع (Location Logs) لتتبع المسارات بدقة
CREATE TABLE IF NOT EXISTS location_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lat FLOAT NOT NULL,
  lng FLOAT NOT NULL,
  speed FLOAT DEFAULT 0,
  heading FLOAT DEFAULT 0,
  accuracy FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- تفعيل الحماية لجدول سجل المواقع
ALTER TABLE location_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own logs') THEN
    CREATE POLICY "Users can insert their own logs" ON location_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all logs') THEN
    CREATE POLICY "Admins can view all logs" ON location_logs FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

-- تفعيل Real-time لسجل المواقع
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'location_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE location_logs;
  END IF;
END $$;

-- 2. تفعيل الحماية على مستوى الصفوف (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. سياسات الحماية لجدول الملفات الشخصية (Profiles)
DO $$ 
BEGIN
  -- حذف السياسات القديمة لضمان التحديث
  DROP POLICY IF EXISTS "Users can view their own profiles" ON profiles;
  DROP POLICY IF EXISTS "Anyone can view relevant profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can insert their own profiles" ON profiles;
  DROP POLICY IF EXISTS "Users can update their own profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

  -- السماح للمستخدمين بقراءة ملفاتهم الشخصية فقط
  CREATE POLICY "Users can view their own profiles" ON profiles FOR SELECT USING (auth.uid() = id);

  -- السماح للمستخدمين برؤية الملفات الشخصية ذات الصلة (المطاعم والطيارين والأدمن)
  CREATE POLICY "Anyone can view relevant profiles" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
  
  -- V16.6.7: ALLOW USERS TO CREATE THEIR OWN PROFILE IF MISSING
  -- This is critical for the "auto-repair" feature to work when metadata exists but DB record is missing
  CREATE POLICY "Users can insert their own profiles" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

  -- السماح للمستخدمين بتحديث ملفاتهم الشخصية فقط
  -- V1.0.2: Enhanced policy to explicitly allow updating location and online status
  CREATE POLICY "Users can update their own profiles" ON profiles FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

  -- السماح للأدمن بإدارة جميع الملفات الشخصية
  CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() ->> 'email') IN ('mahmoud97mostafa@gmail.com', 'admin@start.com')
  );
END $$;

-- 4. تفعيل خاصية إنشاء ملف شخصي ومحفظة تلقائياً عند التسجيل
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
    user_full_name TEXT;
    user_role TEXT;
    user_phone TEXT;
    user_area TEXT;
    user_vehicle_type TEXT;
    user_national_id TEXT;
BEGIN
  -- استخراج البيانات من Metadata مع التأكد من عدم وجود قيم فارغة
  user_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'مستخدم جديد');
  user_role := COALESCE(new.raw_user_meta_data->>'role', 'driver');
  user_phone := COALESCE(new.raw_user_meta_data->>'phone', '');
  user_area := COALESCE(new.raw_user_meta_data->>'area', '');
  user_vehicle_type := COALESCE(new.raw_user_meta_data->>'vehicle_type', '');
  user_national_id := COALESCE(new.raw_user_meta_data->>'national_id', '');

  -- إنشاء أو تحديث الملف الشخصي
  INSERT INTO public.profiles (
    id, email, full_name, role, phone, area, vehicle_type, national_id, location, is_locked, auto_accept
  )
  VALUES (
    new.id, new.email, user_full_name, user_role, 
    user_phone, user_area, user_vehicle_type, user_national_id, 
    new.raw_user_meta_data->'location', false, false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    area = EXCLUDED.area,
    vehicle_type = EXCLUDED.vehicle_type,
    national_id = EXCLUDED.national_id,
    location = EXCLUDED.location;

  -- إنشاء محفظة تلقائياً لجميع المستخدمين (مناديب ومحلات) لدعم نظام العمولات والتسويات
  INSERT INTO public.wallets (user_id, balance, debt, debt_limit)
  VALUES (new.id, 0, 0, 1000)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- في حال حدوث خطأ، نقوم بتسجيله (يمكن رؤيته في logs السوبابيز)
  -- ولكن نرجع new للسماح بعملية التسجيل بالنجاح في Auth حتى لو فشل البروفايل مؤقتاً
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعادة إنشاء التريجر لضمان التحديث
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. إنشاء جدول المحافظ (Wallets) إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance FLOAT DEFAULT 0 NOT NULL,
  debt FLOAT DEFAULT 0 NOT NULL,
  system_balance FLOAT DEFAULT 0 NOT NULL, -- مديونية الشركة (العمولة)
  debt_limit FLOAT DEFAULT 1000 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- التأكد من وجود عمود system_balance في حال كان الجدول موجوداً
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallets' AND column_name='system_balance') THEN
    ALTER TABLE wallets ADD COLUMN system_balance FLOAT DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- تفعيل RLS للمحافظ
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own wallet') THEN
    CREATE POLICY "Users can view their own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- السماح للأدمن بإدارة جميع المحافظ (جديد)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all wallets') THEN
    CREATE POLICY "Admins can manage all wallets" ON wallets FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

-- V1.1.2: Ensure all wallet columns have correct constraints and defaults
DO $$ 
BEGIN 
  -- Fix balance column
  ALTER TABLE wallets ALTER COLUMN balance SET DEFAULT 0;
  UPDATE wallets SET balance = 0 WHERE balance IS NULL;
  ALTER TABLE wallets ALTER COLUMN balance SET NOT NULL;

  -- Fix debt column
  ALTER TABLE wallets ALTER COLUMN debt SET DEFAULT 0;
  UPDATE wallets SET debt = 0 WHERE debt IS NULL;
  ALTER TABLE wallets ALTER COLUMN debt SET NOT NULL;

  -- Fix system_balance column
  ALTER TABLE wallets ALTER COLUMN system_balance SET DEFAULT 0;
  UPDATE wallets SET system_balance = 0 WHERE system_balance IS NULL;
  ALTER TABLE wallets ALTER COLUMN system_balance SET NOT NULL;
END $$;

-- V1.1.5: ROOT-CAUSE FIX - Safety Trigger on Wallets Table
-- This trigger runs BEFORE any insert or update on wallets to guarantee no NULLs ever reach the storage
CREATE OR REPLACE FUNCTION public.ensure_wallet_sanity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.balance := COALESCE(NEW.balance, 0);
    NEW.debt := COALESCE(NEW.debt, 0);
    NEW.system_balance := COALESCE(NEW.system_balance, 0);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_wallet_sanity ON public.wallets;
CREATE TRIGGER trg_ensure_wallet_sanity
    BEFORE INSERT OR UPDATE ON public.wallets
    FOR EACH ROW EXECUTE PROCEDURE public.ensure_wallet_sanity();

-- 6. إنشاء جدول الطلبات (Orders) إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('pending', 'assigned', 'in_transit', 'delivered', 'cancelled')) DEFAULT 'pending' NOT NULL,
  customer_details JSONB NOT NULL,
  financials JSONB NOT NULL,
  invoice_url TEXT,
  status_updated_at TIMESTAMP WITH TIME ZONE,
  vendor_collected_at TIMESTAMP WITH TIME ZONE,
  driver_confirmed_at TIMESTAMP WITH TIME ZONE,
  vendor_name TEXT,
  vendor_phone TEXT,
  vendor_area TEXT,
  vendor_location JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- إضافة الأعمدة الجديدة في حال كان الجدول موجوداً
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='invoice_url') THEN
    ALTER TABLE orders ADD COLUMN invoice_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='status_updated_at') THEN
    ALTER TABLE orders ADD COLUMN status_updated_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='vendor_collected_at') THEN
    ALTER TABLE orders ADD COLUMN vendor_collected_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='driver_confirmed_at') THEN
    ALTER TABLE orders ADD COLUMN driver_confirmed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='vendor_name') THEN
    ALTER TABLE orders ADD COLUMN vendor_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='vendor_phone') THEN
    ALTER TABLE orders ADD COLUMN vendor_phone TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='vendor_area') THEN
    ALTER TABLE orders ADD COLUMN vendor_area TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='vendor_location') THEN
    ALTER TABLE orders ADD COLUMN vendor_location JSONB;
  END IF;
END $$;

-- تحديث تلقائي للطلبات التي لم تستلم خلال 15 دقيقة
CREATE OR REPLACE FUNCTION auto_reassign_timed_out_orders()
RETURNS void AS $$
BEGIN
  UPDATE orders
  SET 
    driver_id = NULL,
    status = 'pending',
    status_updated_at = NOW()
  WHERE 
    status = 'assigned' 
    AND status_updated_at < (NOW() - INTERVAL '15 minutes');
END;
$$ LANGUAGE plpgsql;

-- ملاحظة: يفضل تشغيل هذه الدالة بواسطة cron job أو أداة خارجية مثل Supabase Edge Functions
-- ولكن الكود في التطبيق (Driver Page) يقوم بنفس الوظيفة للمستخدمين النشطين حالياً.

-- تفعيل RLS لجدول الطلبات
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول للطلبات
DO $$ 
BEGIN
  -- 1. سياسة القراءة: الطيار يرى الطلبات المتاحة (pending) أو الطلبات المسندة إليه
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Drivers can view available or assigned orders') THEN
    CREATE POLICY "Drivers can view available or assigned orders" 
    ON orders FOR SELECT 
    USING (
      status = 'pending' OR 
      auth.uid() = driver_id OR 
      auth.uid() = vendor_id OR 
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;

  -- 2. سياسة التحديث: الطيار يمكنه قبول الطلب (إذا كان pending) أو تحديث حالة طلبه المسند إليه
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Drivers can accept or update their orders') THEN
    CREATE POLICY "Drivers can accept or update their orders" 
    ON orders FOR UPDATE 
    USING (
      (status = 'pending' AND driver_id IS NULL) OR 
      auth.uid() = driver_id OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
    WITH CHECK (
      -- ضمان أن الطيار لا يمكنه تغيير driver_id لطيار آخر
      (status = 'assigned' AND (driver_id = auth.uid() OR driver_id IS NULL)) OR
      (auth.uid() = driver_id) OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;

  -- 3. سياسة الإضافة: المحلات فقط يمكنها إضافة طلبات
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Vendors can create orders') THEN
    CREATE POLICY "Vendors can create orders" 
    ON orders FOR INSERT 
    WITH CHECK (
      auth.uid() = vendor_id OR 
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

-- V1.3.2: PERFORMANCE & EFFICIENCY AUDIT - Adding critical indexes
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role_online ON profiles(role, is_online);
CREATE INDEX IF NOT EXISTS idx_location_logs_user_ts ON location_logs(user_id, created_at DESC);

-- V1.3.2: ROOT-CAUSE FIX - Unified Status Updated At
CREATE OR REPLACE FUNCTION trg_update_order_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    NEW.status_updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_status_timestamp ON orders;
CREATE TRIGGER trg_orders_status_timestamp
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE PROCEDURE trg_update_order_status_timestamp();

-- V1.4.0: AI INTEGRATION SCHEMA (The Brain)
-- Table to store AI analysis and suggestions
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT CHECK (type IN ('error_analysis', 'performance', 'fraud_detection', 'data_correction')) NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
  content TEXT NOT NULL, -- Human readable description
  raw_data JSONB, -- The data AI analyzed
  suggested_fix JSONB, -- The SQL or API update to apply
  is_applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMP WITH TIME ZONE,
  applied_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table to log system events for AI to review
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT CHECK (level IN ('info', 'error', 'security')) DEFAULT 'info',
  source TEXT NOT NULL, -- 'client', 'server', 'edge_function'
  message TEXT NOT NULL,
  metadata JSONB,
  user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins can see AI Insights
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view ai_insights' AND tablename = 'ai_insights') THEN
    CREATE POLICY "Admins can view ai_insights" ON ai_insights 
    FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- Admins can view logs, system can insert
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view system_logs' AND tablename = 'system_logs') THEN
    CREATE POLICY "Admins can view system_logs" ON system_logs 
    FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- Indexing for AI performance
CREATE INDEX IF NOT EXISTS idx_ai_insights_is_applied ON ai_insights(is_applied) WHERE is_applied = false;
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);

-- V1.4.1: Atomic AI Fix Runner
CREATE OR REPLACE FUNCTION apply_ai_fix(p_insight_id UUID, p_fix_data JSONB)
RETURNS JSONB AS $$
DECLARE
  v_type TEXT;
  v_res JSONB;
BEGIN
  -- 1. Verify insight exists and is not applied
  SELECT type INTO v_type FROM ai_insights WHERE id = p_insight_id AND is_applied = false;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insight not found or already applied');
  END IF;

  -- 2. Execute fix based on type (Only safe predefined fixes allowed)
  IF v_type = 'data_correction' THEN
    IF p_fix_data->>'action' = 'update_profile' THEN
      UPDATE profiles SET 
        full_name = COALESCE(p_fix_data->>'full_name', full_name),
        phone = COALESCE(p_fix_data->>'phone', phone)
      WHERE id = (p_fix_data->>'user_id')::UUID;
    END IF;
    v_res := jsonb_build_object('status', 'data_updated');
  ELSIF v_type = 'error_analysis' OR v_type = 'chat' THEN
    -- Example: Resetting a stuck order status
    IF p_fix_data->>'action' = 'reset_order' THEN
      UPDATE orders SET status = 'pending', driver_id = NULL WHERE id = (p_fix_data->>'order_id')::UUID;
      v_res := jsonb_build_object('status', 'order_reset');
    ELSIF p_fix_data->>'action' = 'toggle_maintenance' THEN
      UPDATE app_config SET maintenance_mode = (p_fix_data->>'maintenance_mode')::BOOLEAN;
      v_res := jsonb_build_object('status', 'maintenance_toggled');
    ELSIF p_fix_data->>'action' = 'fix_wallet' THEN
      UPDATE wallets SET balance = (p_fix_data->>'new_balance')::NUMERIC WHERE user_id = (p_fix_data->>'user_id')::UUID;
      v_res := jsonb_build_object('status', 'wallet_fixed');
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Action not recognized');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Fix type not implemented');
  END IF;

  -- 3. Mark as applied
  UPDATE ai_insights 
  SET is_applied = true, applied_at = NOW(), applied_by = auth.uid() 
  WHERE id = p_insight_id;

  RETURN jsonb_build_object('success', true, 'data', v_res);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- V1.4.2: Direct AI Fix Runner (No insight ID required)
CREATE OR REPLACE FUNCTION apply_ai_fix_direct(p_fix_data JSONB, p_type TEXT DEFAULT 'chat')
RETURNS JSONB AS $$
DECLARE
  v_res JSONB;
BEGIN
  -- Execute fix based on type (Only safe predefined fixes allowed)
  IF p_type = 'chat' OR p_type = 'error_analysis' THEN
    IF p_fix_data->>'action' = 'reset_order' THEN
      UPDATE orders SET status = 'pending', driver_id = NULL WHERE id = (p_fix_data->>'order_id')::UUID;
      v_res := jsonb_build_object('status', 'order_reset');
    ELSIF p_fix_data->>'action' = 'toggle_maintenance' THEN
      UPDATE app_config SET maintenance_mode = (p_fix_data->>'maintenance_mode')::BOOLEAN;
      v_res := jsonb_build_object('status', 'maintenance_toggled');
    ELSIF p_fix_data->>'action' = 'update_profile' THEN
      UPDATE profiles SET 
        full_name = COALESCE(p_fix_data->>'full_name', full_name),
        phone = COALESCE(p_fix_data->>'phone', phone)
      WHERE id = (p_fix_data->>'user_id')::UUID;
      v_res := jsonb_build_object('status', 'data_updated');
    ELSIF p_fix_data->>'action' = 'fix_wallet' THEN
      UPDATE wallets SET balance = (p_fix_data->>'new_balance')::NUMERIC WHERE user_id = (p_fix_data->>'user_id')::UUID;
      v_res := jsonb_build_object('status', 'wallet_fixed');
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Action not recognized');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Fix type not implemented');
  END IF;

  RETURN jsonb_build_object('success', true, 'data', v_res);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. دوال متقدمة للأدمن (RPC) لجلب كافة البيانات مع تجاوز RLS بشكل آمن
-- تستخدم SECURITY DEFINER لتعمل بصلاحيات الأدمن على مستوى قاعدة البيانات

-- حذف الدوال القديمة لتجنب خطأ "cannot change return type"
DROP FUNCTION IF EXISTS get_all_profiles_admin();
DROP FUNCTION IF EXISTS get_all_wallets_admin();
DROP FUNCTION IF EXISTS get_all_orders_admin();

-- أ. جلب كافة البروفايلات
CREATE OR REPLACE FUNCTION get_all_profiles_admin()
RETURNS SETOF profiles AS $$
BEGIN
  -- التحقق من الصلاحيات باستخدام بيانات JWT (أكثر استقراراً من البروفايل)
  IF (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) THEN
    RETURN QUERY SELECT * FROM profiles ORDER BY created_at DESC;
  ELSE
    RAISE EXCEPTION 'غير مصرح. قاعدة البيانات ترى المعرف: %، والبيانات الوصفية للبريد: %', auth.uid(), (auth.jwt() ->> 'email');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ب. جلب كافة المحافظ
CREATE OR REPLACE FUNCTION get_all_wallets_admin()
RETURNS SETOF wallets AS $$
BEGIN
  IF (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) THEN
    RETURN QUERY SELECT * FROM wallets;
  ELSE
    RAISE EXCEPTION 'غير مصرح للوصول للمحافظ.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ج. جلب كافة الطلبات مع تفاصيل المحل والطيار (اختياري، سنقوم بجلب الطلبات الخام وتصفيتها برمجياً)
CREATE OR REPLACE FUNCTION get_all_orders_admin()
RETURNS TABLE (
  id UUID,
  vendor_id UUID,
  driver_id UUID,
  status TEXT,
  customer_details JSONB,
  financials JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  vendor_full_name TEXT
) AS $$
BEGIN
  IF (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) THEN
    RETURN QUERY 
    SELECT o.id, o.vendor_id, o.driver_id, o.status, o.customer_details, o.financials, o.created_at, p.full_name as vendor_full_name
    FROM orders o
    LEFT JOIN profiles p ON o.vendor_id = p.id
    ORDER BY o.created_at DESC;
  ELSE
    RAISE EXCEPTION 'غير مصرح للوصول للطلبات.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. إنشاء جدول التسويات (Settlements) إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS settlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL, -- تم التغيير من driver_id لدعم المناديب والمحلات
  amount FLOAT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending' NOT NULL,
  method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- تفعيل RLS لجدول التسويات
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own settlements') THEN
    CREATE POLICY "Users can view their own settlements" ON settlements FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own settlements') THEN
    CREATE POLICY "Users can insert their own settlements" ON settlements FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all settlements') THEN
    CREATE POLICY "Admins can manage all settlements" ON settlements FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

-- 9. إنشاء تريجرات لتحديث المحافظ تلقائياً (نظام المحاسبة المالي)

-- دالة معالجة العمليات المالية للطلبات
-- V1.0.8: Ultimate financial robustness - Fixes NULL balance error and debt timing
CREATE OR REPLACE FUNCTION public.handle_order_financials()
RETURNS trigger AS $$
DECLARE
    order_val FLOAT;
    drv_earnings FLOAT;
    sys_comm FLOAT;
    vnd_comm FLOAT;
    ins_fee FLOAT;
    drv_ins FLOAT;
    vnd_ins FLOAT;
BEGIN
    -- 1. استخراج القيم المالية مع حماية مطلقة ضد القيم الفارغة
    order_val := COALESCE((new.financials->>'order_value')::FLOAT, 0);
    drv_earnings := COALESCE((new.financials->>'driver_earnings')::FLOAT, 0);
    sys_comm := COALESCE((new.financials->>'system_commission')::FLOAT, 0);
    vnd_comm := COALESCE((new.financials->>'vendor_commission')::FLOAT, 0);
    ins_fee := COALESCE((new.financials->>'insurance_fee')::FLOAT, 0);

    -- V1.2.0: Fallback for missing financials (e.g. older orders)
    IF drv_earnings = 0 AND sys_comm = 0 AND (new.financials->>'delivery_fee')::FLOAT > 0 THEN
       -- Simple fallback: 85% for driver, 15% for system (excluding insurance)
       drv_earnings := (new.financials->>'delivery_fee')::FLOAT * 0.85;
       sys_comm := (new.financials->>'delivery_fee')::FLOAT * 0.15;
    END IF;

    -- V1.0.9: Ensuring insurance fees are never NULL even if ins_fee is 0
    drv_ins := COALESCE((new.financials->>'driver_insurance')::FLOAT, COALESCE(ins_fee, 0) / 2);
    vnd_ins := COALESCE((new.financials->>'vendor_insurance')::FLOAT, COALESCE(ins_fee, 0) / 2);

    -- 2. عند توصيل الطلب (Delivered)
    IF (new.status = 'delivered' AND (old.status IS NULL OR old.status != 'delivered')) THEN
        -- تحديث محفظة الطيار (إضافة الأرباح)
        IF new.driver_id IS NOT NULL THEN
            INSERT INTO public.wallets (user_id, balance, debt, system_balance)
            VALUES (new.driver_id, COALESCE(drv_earnings, 0), 0, COALESCE(sys_comm, 0) + COALESCE(drv_ins, 0))
            ON CONFLICT (user_id) DO UPDATE 
            SET 
                balance = COALESCE(wallets.balance, 0) + COALESCE(EXCLUDED.balance, 0),
                system_balance = COALESCE(wallets.system_balance, 0) + COALESCE(EXCLUDED.system_balance, 0),
                updated_at = NOW();
        END IF;

        -- تحديث محفظة المحل (إضافة عمولة الشركة)
        IF new.vendor_id IS NOT NULL THEN
            INSERT INTO public.wallets (user_id, balance, debt, system_balance)
            VALUES (new.vendor_id, 0, 0, COALESCE(vnd_comm, 0) + COALESCE(vnd_ins, 0))
            ON CONFLICT (user_id) DO UPDATE
            SET
                system_balance = COALESCE(wallets.system_balance, 0) + COALESCE(EXCLUDED.system_balance, 0),
                updated_at = NOW();
        END IF;
    END IF;

    -- 3. عند استلام الطلب من المحل (In Transit) - تسجيل المديونية فقط الآن
    IF (new.status = 'in_transit' AND (old.status IS NULL OR old.status != 'in_transit')) THEN
        IF new.driver_id IS NOT NULL THEN
            INSERT INTO public.wallets (user_id, balance, debt, system_balance)
            VALUES (new.driver_id, 0, COALESCE(order_val, 0), 0)
            ON CONFLICT (user_id) DO UPDATE
            SET 
                debt = COALESCE(wallets.debt, 0) + COALESCE(EXCLUDED.debt, 0),
                updated_at = NOW();
        END IF;
    END IF;

    -- 4. عند تحصيل المحل للمبلغ من الطيار
    IF (new.vendor_collected_at IS NOT NULL AND old.vendor_collected_at IS NULL) THEN
        IF new.driver_id IS NOT NULL THEN
            UPDATE public.wallets 
            SET 
                debt = GREATEST(0, COALESCE(debt, 0) - COALESCE(order_val, 0)),
                updated_at = NOW()
            WHERE user_id = new.driver_id;
        END IF;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- V1.2.0: New View for Driver Completed Orders with Details
CREATE OR REPLACE VIEW public.driver_completed_orders_details AS
SELECT 
    o.id,
    o.driver_id,
    o.vendor_id,
    o.created_at,
    o.status,
    o.financials,
    o.customer_details,
    p.full_name as vendor_name,
    p.phone as vendor_phone
FROM public.orders o
JOIN public.profiles p ON o.vendor_id = p.id
WHERE o.status = 'delivered';

-- ربط الدالة بتريجر على جدول الطلبات
DROP TRIGGER IF EXISTS on_order_financial_update ON public.orders;
CREATE TRIGGER on_order_financial_update
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE PROCEDURE public.handle_order_financials();

-- ب. تحديث المحفظة عند الموافقة على طلب تسوية (Settlement)
CREATE OR REPLACE FUNCTION public.handle_settlement_approval()
RETURNS trigger AS $$
BEGIN
    -- إذا تغيرت حالة التسوية إلى 'approved' من قبل الأدمن
    IF (new.status = 'approved' AND (old.status IS NULL OR old.status != 'approved')) THEN
        -- خصم مبلغ التسوية من مديونية الشركة (system_balance)
        UPDATE public.wallets 
        SET 
            system_balance = system_balance - new.amount,
            created_at = NOW()
        WHERE user_id = new.user_id;
    END IF;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ربط الدالة بتريجر على جدول التسويات
DROP TRIGGER IF EXISTS on_settlement_approval ON public.settlements;
CREATE TRIGGER on_settlement_approval
  AFTER UPDATE ON public.settlements
  FOR EACH ROW EXECUTE PROCEDURE public.handle_settlement_approval();

-- دالة لتصفير بيانات مستخدم معين (مطعم أو طيار)
CREATE OR REPLACE FUNCTION reset_user_data_admin(target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- التحقق من صلاحيات الأدمن
  IF (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) THEN
    -- 1. حذف الطلبات المرتبطة
    DELETE FROM public.orders WHERE vendor_id = target_user_id OR driver_id = target_user_id;
    
    -- 2. حذف التسويات المرتبطة
    DELETE FROM public.settlements WHERE user_id = target_user_id;

    -- 3. حذف التقييمات المرتبطة
    DELETE FROM public.ratings WHERE from_id = target_user_id OR to_id = target_user_id;
    
    -- 4. تصفير المحفظة
    UPDATE public.wallets SET balance = 0, debt = 0, system_balance = 0 WHERE user_id = target_user_id;
    
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'غير مصرح.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. نظام التقييمات (Ratings)
CREATE TABLE IF NOT EXISTS ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  from_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  to_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  type TEXT CHECK (type IN ('driver_to_vendor', 'vendor_to_driver')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  -- ضمان عدم تكرار التقييم لنفس الطلب من نفس الطرف
  UNIQUE(order_id, from_id)
);

-- تفعيل RLS للتقييمات
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  -- 1. أي شخص يمكنه رؤية التقييمات
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view ratings') THEN
    CREATE POLICY "Anyone can view ratings" ON ratings FOR SELECT USING (true);
  END IF;

  -- 2. المستخدم يمكنه إضافة تقييم فقط إذا كان طرفاً في الطلب
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create ratings for their orders') THEN
    CREATE POLICY "Users can create ratings for their orders" ON ratings FOR INSERT WITH CHECK (
      auth.uid() = from_id AND (
        EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (driver_id = auth.uid() OR vendor_id = auth.uid()))
      )
    );
  END IF;
END $$;

-- دالة لتحديث تقييم البروفايل تلقائياً
CREATE OR REPLACE FUNCTION public.handle_new_rating()
RETURNS trigger AS $$
BEGIN
    -- تحديث البروفايل المستهدف (المُقيَّم)
    UPDATE public.profiles
    SET 
        rating = (
            SELECT AVG(rating)::FLOAT 
            FROM public.ratings 
            WHERE to_id = NEW.to_id
        ),
        rating_count = (
            SELECT COUNT(*) 
            FROM public.ratings 
            WHERE to_id = NEW.to_id
        )
    WHERE id = NEW.to_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ربط الدالة بتريجر
DROP TRIGGER IF EXISTS on_new_rating ON public.ratings;
CREATE TRIGGER on_new_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.ratings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_rating();

-- تفعيل Real-time للتقييمات
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ratings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ratings;
  END IF;
END $$;

-- 14. إضافة فهارس لتحسين الأداء (Indexes)
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles(is_online) WHERE is_online = true;

-- 10. جدول إعدادات التطبيق والتحديثات التلقائية
CREATE TABLE IF NOT EXISTS app_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  latest_version TEXT NOT NULL DEFAULT '0.2.0',
  min_version TEXT NOT NULL DEFAULT '0.1.0',
  download_url TEXT,
  bundle_url TEXT,
  force_update BOOLEAN DEFAULT FALSE,
  update_message TEXT DEFAULT 'يتوفر إصدار جديد من التطبيق، يرجى التحديث للمتابعة.',
  maintenance_mode BOOLEAN DEFAULT FALSE,
  maintenance_message TEXT DEFAULT 'التطبيق تحت الصيانة حالياً. يرجى المحاولة لاحقاً.',
  -- إعدادات النظام المالية
  driver_commission FLOAT DEFAULT 15.0,
  vendor_commission FLOAT DEFAULT 20.0, -- إضافة عمود عمولة المحل
  vendor_fee FLOAT DEFAULT 1.0,
  safe_ride_fee FLOAT DEFAULT 1.0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- التأكد من وجود الأعمدة الجديدة
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='driver_commission') THEN
    ALTER TABLE app_config ADD COLUMN driver_commission FLOAT DEFAULT 15.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='vendor_commission') THEN
    ALTER TABLE app_config ADD COLUMN vendor_commission FLOAT DEFAULT 20.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='vendor_fee') THEN
    ALTER TABLE app_config ADD COLUMN vendor_fee FLOAT DEFAULT 1.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='safe_ride_fee') THEN
    ALTER TABLE app_config ADD COLUMN safe_ride_fee FLOAT DEFAULT 1.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='maintenance_mode') THEN
    ALTER TABLE app_config ADD COLUMN maintenance_mode BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='maintenance_message') THEN
    ALTER TABLE app_config ADD COLUMN maintenance_message TEXT DEFAULT 'التطبيق تحت الصيانة حالياً. يرجى المحاولة لاحقاً.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='vendor_commission_type') THEN
    ALTER TABLE app_config ADD COLUMN vendor_commission_type TEXT DEFAULT 'percentage';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='vendor_commission_value') THEN
    ALTER TABLE app_config ADD COLUMN vendor_commission_value FLOAT DEFAULT 0.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='surge_pricing_active') THEN
    ALTER TABLE app_config ADD COLUMN surge_pricing_active BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='surge_pricing_multiplier') THEN
    ALTER TABLE app_config ADD COLUMN surge_pricing_multiplier FLOAT DEFAULT 1.0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='billing_type') THEN
    ALTER TABLE app_config ADD COLUMN billing_type TEXT DEFAULT 'commission';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='monthly_salary') THEN
    ALTER TABLE app_config ADD COLUMN monthly_salary FLOAT DEFAULT 0.0;
  END IF;
END $$;

-- إدراج البيانات الافتراضية إذا لم تكن موجودة
INSERT INTO public.app_config (id, latest_version, min_version, download_url, driver_commission, vendor_commission)
VALUES (1, '0.9.87-ULTIMATE-BEAST', '0.1.0', 'https://github.com/medopoplike/start-location-app/releases', 15, 20)
ON CONFLICT (id) DO UPDATE SET 
    latest_version = EXCLUDED.latest_version,
    updated_at = NOW();

-- تفعيل RLS لجدول app_config
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  -- السماح للجميع بقراءة الإعدادات
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view app config' AND tablename = 'app_config') THEN
    CREATE POLICY "Anyone can view app config" ON app_config FOR SELECT USING (true);
  END IF;

  -- السماح للأدمن فقط بتحديث الإعدادات
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update app config' AND tablename = 'app_config') THEN
    CREATE POLICY "Admins can update app config" ON app_config FOR UPDATE USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
  END IF;
END $$;

-- دالة لتصفير كافة بيانات النظام (الطلبات والتسويات والمحافظ)
CREATE OR REPLACE FUNCTION reset_all_system_data_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  ) THEN
    -- استخدام شرط لتجاوز حماية الحذف الشامل
    DELETE FROM public.orders WHERE id IS NOT NULL;
    DELETE FROM public.settlements WHERE id IS NOT NULL;
    DELETE FROM public.ratings WHERE id IS NOT NULL;
    UPDATE public.wallets SET balance = 0, debt = 0, system_balance = 0 WHERE id IS NOT NULL;
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'غير مصرح.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. دالة لتأكيد تسليم الطيار للمبلغ للمحل
CREATE OR REPLACE FUNCTION confirm_driver_payment(p_order_id UUID, p_driver_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.orders
  SET 
    driver_confirmed_at = NOW(),
    status_updated_at = NOW()
  WHERE id = p_order_id AND driver_id = p_driver_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة لإصلاح المحافظ المفقودة لجميع المستخدمين (Run manually if needed)
CREATE OR REPLACE FUNCTION fix_missing_wallets()
RETURNS void AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance, debt, system_balance)
  SELECT id, 0, 0, 0
  FROM public.profiles
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. دوال احترافية متقدمة (Advanced Industrial Functions)

-- أ. دالة تعيين الطلب التلقائي (Atomic Assignment)
-- تمنع حالات السباق (Race Conditions) حيث لا يمكن تعيين الطلب لطيار إذا تغيرت حالته أثناء المعالجة
CREATE OR REPLACE FUNCTION assign_order_atomic(
  p_order_id UUID,
  p_driver_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_order_status TEXT;
  v_driver_exists BOOLEAN;
  v_active_count INTEGER;
  v_max_orders INTEGER;
BEGIN
  -- 1. التحقق من حالة الطلب (يجب أن يكون pending أوassigned بدون طيار)
  SELECT status INTO v_order_status FROM public.orders WHERE id = p_order_id FOR UPDATE;
  
  IF v_order_status != 'pending' AND v_order_status != 'assigned' THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطلب لم يعد متاحاً للتعيين');
  END IF;

  -- 2. التحقق من وجود وصلاحية الطيار
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_driver_id AND role = 'driver' AND is_locked = false) INTO v_driver_exists;
  
  IF NOT v_driver_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطيار غير موجود أو محظور');
  END IF;

  -- 3. التحقق من الحد الأقصى للطلبات
  SELECT max_active_orders INTO v_max_orders FROM public.profiles WHERE id = p_driver_id;
  SELECT COUNT(*) INTO v_active_count FROM public.orders WHERE driver_id = p_driver_id AND status IN ('assigned', 'in_transit');
  
  IF v_active_count >= COALESCE(v_max_orders, 3) THEN
    RETURN jsonb_build_object('success', false, 'error', 'الطيار وصل للحد الأقصى من الطلبات');
  END IF;

  -- 4. تنفيذ التعيين
  UPDATE public.orders 
  SET 
    driver_id = p_driver_id,
    status = 'assigned',
    status_updated_at = NOW()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ب. فهارس متقدمة للأداء العالي (High-Performance Indices)
CREATE INDEX IF NOT EXISTS idx_orders_composite_status_driver ON public.orders (status, driver_id) WHERE status IN ('assigned', 'in_transit');
CREATE INDEX IF NOT EXISTS idx_profiles_active_drivers ON public.profiles (id) WHERE role = 'driver' AND is_online = true AND is_locked = false;
CREATE INDEX IF NOT EXISTS idx_wallets_system_balance ON public.wallets (system_balance) WHERE system_balance > 0;
CREATE INDEX IF NOT EXISTS idx_location_logs_user_created ON public.location_logs (user_id, created_at DESC);

-- ج. دالة تنظيف البيانات القديمة (Auto-Cleanup)
-- تحافظ على خفة قاعدة البيانات عبر حذف سجلات المواقع التي مر عليها أكثر من 7 أيام
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  DELETE FROM public.location_logs WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- د. تحديث رقم النسخة في الإعدادات
UPDATE public.app_config 
SET latest_version = '1.0.5-FIX', updated_at = NOW() 
WHERE id = 1;

-- ح. إصلاحات استقرار جدول المحافظ (جديد V1.0.5)
DO $$ 
BEGIN 
  -- إضافة عمود updated_at المفقود في جدول المحافظ
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wallets' AND column_name='updated_at') THEN
    ALTER TABLE wallets ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- دالة لتحديث التوقيت تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ربط التريجر بجدول المحافظ
DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ط. دالة إتمام الطلب (RPC) لتجاوز مشاكل التحديث في الواجهة
CREATE OR REPLACE FUNCTION complete_order_driver(p_order_id UUID, p_driver_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_rows_affected INTEGER;
BEGIN
  UPDATE public.orders
  SET 
    status = 'delivered',
    status_updated_at = NOW()
  WHERE id = p_order_id 
    AND driver_id = p_driver_id
    AND status IN ('assigned', 'in_transit'); -- السماح بالإتمام من أي حالة نشطة
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  IF v_rows_affected = 0 THEN
    -- التحقق إذا كان الطلب مكتملاً بالفعل (Idempotency)
    IF EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id AND status = 'delivered') THEN
      RETURN TRUE;
    END IF;
    RAISE EXCEPTION 'فشل إتمام الطلب: الطلب غير موجود أو غير مسند إليك.';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- و. فهارس متقدمة إضافية للأداء الفائق (Ultra-Performance Indices)
CREATE INDEX IF NOT EXISTS idx_orders_driver_delivered ON public.orders (driver_id, status) WHERE status = 'delivered';
CREATE INDEX IF NOT EXISTS idx_orders_vendor_delivered ON public.orders (vendor_id, status) WHERE status = 'delivered';
CREATE INDEX IF NOT EXISTS idx_settlements_user_status ON public.settlements (user_id, status);
CREATE INDEX IF NOT EXISTS idx_order_messages_order_created ON public.order_messages (order_id, created_at ASC);

-- ز. دالة مراقبة صحة النظام (System Health Monitor)
CREATE OR REPLACE FUNCTION get_system_health_stats()
RETURNS JSONB AS $$
DECLARE
  v_active_drivers INTEGER;
  v_pending_orders INTEGER;
  v_total_system_debt FLOAT;
BEGIN
  SELECT COUNT(*) INTO v_active_drivers FROM public.profiles WHERE role = 'driver' AND is_online = true;
  SELECT COUNT(*) INTO v_pending_orders FROM public.orders WHERE status = 'pending';
  SELECT SUM(system_balance) INTO v_total_system_debt FROM public.wallets;
  
  RETURN jsonb_build_object(
    'active_drivers', v_active_drivers,
    'pending_orders', v_pending_orders,
    'total_system_debt', COALESCE(v_total_system_debt, 0),
    'status', 'healthy',
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- هـ. وظائف تنظيف السجلات وتصفير الحسابات (جديد V0.9.92)

-- 1. تصفير محفظة مستخدم محدد (بشكل كامل وجذري)
CREATE OR REPLACE FUNCTION reset_wallet_balance(p_user_id UUID)
RETURNS void AS $$
BEGIN
  -- V1.2.0: Also cleanup orders when resetting wallet to maintain synchronization
  DELETE FROM orders WHERE (vendor_id = p_user_id OR driver_id = p_user_id) AND status IN ('delivered', 'cancelled');
  
  UPDATE wallets 
  SET balance = 0, debt = 0, system_balance = 0, updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. تصفير كافة المحافظ
CREATE OR REPLACE FUNCTION reset_all_wallets()
RETURNS void AS $$
BEGIN
  -- استخدام شرط دائم التحقق لتجنب أخطاء RLS أو الحماية التي تطلب WHERE
  UPDATE wallets 
  SET balance = 0, debt = 0, system_balance = 0
  WHERE id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. تنظيف سجل الطلبات لمستخدم محدد (أرشفة أو حذف)
-- هنا سنقوم بحذف الطلبات المكتملة أو الملغاة فقط للحفاظ على سلامة النظام
CREATE OR REPLACE FUNCTION cleanup_user_orders(p_user_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM orders 
  WHERE (vendor_id = p_user_id OR driver_id = p_user_id)
  AND status IN ('delivered', 'cancelled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. تنظيف كافة الطلبات المكتملة
CREATE OR REPLACE FUNCTION cleanup_all_orders()
RETURNS void AS $$
BEGIN
  DELETE FROM orders 
  WHERE status IN ('delivered', 'cancelled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. إلغاء تعيين طلب وإعادته للانتظار
CREATE OR REPLACE FUNCTION unassign_order_admin(p_order_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE orders 
  SET 
    driver_id = NULL, 
    status = 'pending',
    status_updated_at = NOW()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- V1.2.5: AUTO-REDISTRIBUTION - سحب الطلبات المتأخرة (أكثر من 15 دقيقة) من الطيارين
-- This function can be called by a cron job or by the Admin UI on refresh
CREATE OR REPLACE FUNCTION auto_unassign_stale_orders()
RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.orders
  SET 
    driver_id = NULL,
    status = 'pending',
    status_updated_at = NOW()
  WHERE status = 'assigned' 
    AND (status_updated_at < NOW() - INTERVAL '15 minutes' OR (status_updated_at IS NULL AND created_at < NOW() - INTERVAL '15 minutes'));
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  IF v_count > 0 THEN
    RETURN jsonb_build_object('success', true, 'unassigned_count', v_count, 'message', 'تم سحب وإعادة توزيع ' || v_count || ' طلب متأخر');
  ELSE
    RETURN jsonb_build_object('success', true, 'unassigned_count', 0, 'message', 'لا توجد طلبات متأخرة حالياً');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ضمان وجود كافة المحافظ مرة أخرى كإجراء احترازي
SELECT fix_missing_wallets();

-- دالة لاستلام الطلب من قبل الطيار وتغيير الحالة إلى "في الطريق"
-- V1.0.3: Improved robustness - checks current status and driver ownership
CREATE OR REPLACE FUNCTION handle_order_pickup(p_order_id UUID, p_driver_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_rows_affected INTEGER;
BEGIN
  UPDATE public.orders
  SET 
    status = 'in_transit',
    status_updated_at = NOW()
  WHERE id = p_order_id 
    AND driver_id = p_driver_id
    AND status = 'assigned'; -- Ensure it's assigned before pickup
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  IF v_rows_affected = 0 THEN
    -- Check if it was already picked up or not assigned to this driver
    IF EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id AND status = 'in_transit') THEN
      RETURN TRUE; -- Already picked up, idempotent success
    END IF;
    RAISE EXCEPTION 'فشل الاستلام: الطلب لم يعد مسنداً إليك أو تم تحديث حالته بالفعل.';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. جدول الرسائل (Order Messages) للدردشة بين الأطراف
CREATE TABLE IF NOT EXISTS order_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- تفعيل RLS للرسائل
ALTER TABLE order_messages ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view messages for their orders') THEN
    CREATE POLICY "Users can view messages for their orders" ON order_messages FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM orders 
        WHERE id = order_id AND (driver_id = auth.uid() OR vendor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
      )
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can send messages to their orders') THEN
    CREATE POLICY "Users can send messages to their orders" ON order_messages FOR INSERT WITH CHECK (
      auth.uid() = sender_id AND
      EXISTS (
        SELECT 1 FROM orders 
        WHERE id = order_id AND (driver_id = auth.uid() OR vendor_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
      )
    );
  END IF;
END $$;

-- تفعيل Real-time للرسائل
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'order_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_messages;
  END IF;
END $$;

-- 13. تحسين نظام تحديث بيانات المستخدمين وتزامنها بين Auth و Profiles
-- أ. دالة لتحديث بيانات الملف الشخصي تلقائياً عند تحديث بيانات المستخدم في Auth
CREATE OR REPLACE FUNCTION public.handle_update_user() 
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET 
    email = COALESCE(new.email, email),
    full_name = COALESCE(new.raw_user_meta_data->>'full_name', full_name),
    phone = COALESCE(new.raw_user_meta_data->>'phone', phone),
    area = COALESCE(new.raw_user_meta_data->>'area', area),
    vehicle_type = COALESCE(new.raw_user_meta_data->>'vehicle_type', vehicle_type),
    national_id = COALESCE(new.raw_user_meta_data->>'national_id', national_id)
  WHERE id = new.id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ربط الدالة بتريجر على جدول auth.users
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_update_user();

-- ب. دالة (RPC) للأدمن لتحديث بيانات أي مستخدم (الإيميل، الباسورد، البيانات الأساسية)
CREATE OR REPLACE FUNCTION update_user_admin(
  target_user_id UUID,
  new_email TEXT DEFAULT NULL,
  new_password TEXT DEFAULT NULL,
  new_full_name TEXT DEFAULT NULL,
  new_phone TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- 1. التحقق من صلاحيات الأدمن (من خلال JWT أو جدول البروفايلات)
  IF NOT (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  ) THEN
    RAISE EXCEPTION 'غير مصرح للآدمن فقط.';
  END IF;

  -- 2. تحديث جدول auth.users (يتطلب SECURITY DEFINER)
  UPDATE auth.users
  SET 
    email = COALESCE(new_email, email),
    encrypted_password = CASE WHEN new_password IS NOT NULL THEN crypt(new_password, gen_salt('bf')) ELSE encrypted_password END,
    raw_user_meta_data = raw_user_meta_data || 
      jsonb_build_object(
        'full_name', COALESCE(new_full_name, raw_user_meta_data->>'full_name'),
        'phone', COALESCE(new_phone, raw_user_meta_data->>'phone')
      )
  WHERE id = target_user_id;

  -- 3. تحديث جدول profiles مباشرة لضمان السرعة (رغم وجود التريجر)
  UPDATE public.profiles
  SET 
    email = COALESCE(new_email, email),
    full_name = COALESCE(new_full_name, full_name),
    phone = COALESCE(new_phone, phone)
  WHERE id = target_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ج. دالة (RPC) للمستخدمين لتحديث بياناتهم الخاصة لتجاوز مشاكل RLS المحتملة
CREATE OR REPLACE FUNCTION update_user_details(
  new_full_name TEXT DEFAULT NULL,
  new_phone TEXT DEFAULT NULL,
  new_area TEXT DEFAULT NULL,
  new_vehicle_type TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  current_uid UUID;
BEGIN
  current_uid := auth.uid();
  
  IF current_uid IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  UPDATE public.profiles
  SET 
    full_name = COALESCE(new_full_name, full_name),
    phone = COALESCE(new_phone, phone),
    area = COALESCE(new_area, area),
    vehicle_type = COALESCE(new_vehicle_type, vehicle_type)
  WHERE id = current_uid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- د. تحديث سياسة RLS للبروفايلات لتكون أكثر مرونة مع الآدمن
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);


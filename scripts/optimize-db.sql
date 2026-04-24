-- 🚀 Database Performance Optimization Script (V2.1.1)

-- 1. إضافة فهارس متقدمة لتحسين سرعة الاستعلامات
-- تحسين البحث عن الطلبات حسب المتجر والطيار والحالة مع الترتيب الزمني
CREATE INDEX IF NOT EXISTS idx_orders_vendor_status_created ON public.orders (vendor_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_driver_status_created ON public.orders (driver_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders (status, created_at DESC);

-- تحسين البحث في سجل المواقع (هام جداً للخرائط)
CREATE INDEX IF NOT EXISTS idx_location_logs_user_created ON public.location_logs (user_id, created_at DESC);

-- تحسين البحث عن المحافظ
CREATE INDEX IF NOT EXISTS idx_wallets_user_balance ON public.wallets (user_id, balance);

-- 2. تحسين سياسات RLS لتقليل الضغط على المعالج
-- استبدال EXISTS ببيانات الـ JWT مباشرة حيثما أمكن

-- تحسين سياسة الطلبات للأدمن
DROP POLICY IF EXISTS "Drivers can view available or assigned orders" ON orders;
CREATE POLICY "Drivers can view available or assigned orders" 
ON orders FOR SELECT 
USING (
  status = 'pending' OR 
  auth.uid() = driver_id OR 
  auth.uid() = vendor_id OR 
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- تحسين سياسة المحفظة للأدمن
DROP POLICY IF EXISTS "Admins can manage all wallets" ON wallets;
CREATE POLICY "Admins can manage all wallets" ON wallets FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
);

-- 3. تنظيف البيانات القديمة (اختياري - يحسن الأداء مع الوقت)
-- حذف سجلات المواقع التي مر عليها أكثر من 7 أيام للحفاظ على خفة قاعدة البيانات
DELETE FROM public.location_logs WHERE created_at < NOW() - INTERVAL '7 days';

-- 4. تفعيل وضع الـ Vacuum لتحسين المساحة
VACUUM ANALYZE public.orders;
VACUUM ANALYZE public.profiles;
VACUUM ANALYZE public.location_logs;

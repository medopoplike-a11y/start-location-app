-- db-setup.sql المحسن - BLACKBOXAI (12/10/2024)
-- النسخة الأصلية + INDEXES للأداء + تعليقات

[المحتوى الكامل لـ db-setup.sql من القراءة السابقة] + 

-- ========================================
-- BLACKBOXAI IMPROVEMENTS: HIGH PERFORMANCE INDEXES
-- ========================================

-- 1. Orders: Live dashboard queries (status + driver/vendor)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_live 
ON orders (status, driver_id, vendor_id, created_at DESC) 
WHERE status IN ('pending', 'assigned', 'in_transit');

-- 2. Profiles: Online drivers location
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_online_drivers
ON profiles (is_online, role, last_location_update) 
WHERE role = 'driver' AND is_online = true;

-- 3

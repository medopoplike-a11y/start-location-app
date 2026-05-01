-- ==========================================================
-- FIX: RLS Policies for Start Location App
-- Fixes missing permissions that cause crashes after login
-- ==========================================================

-- 1. Fix Orders Table Policies
-- Allow vendors to update their own orders
DO $$ 
BEGIN
  -- Drop old update policy if it exists (to recreate it correctly)
  DROP POLICY IF EXISTS "Drivers can accept or update their orders" ON orders;
  
  -- Create updated policy that includes vendors
  CREATE POLICY "Drivers and Vendors can update their orders" 
  ON orders FOR UPDATE 
  USING (
    (status = 'pending' AND driver_id IS NULL) OR 
    auth.uid() = driver_id OR
    auth.uid() = vendor_id OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    -- Drivers: Can only assign to themselves or update their own orders
    (auth.uid() = driver_id) OR
    -- Vendors: Can only update their own orders
    (auth.uid() = vendor_id) OR
    -- Admins: Can do anything
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

  -- Also ensure vendors can delete their own orders if needed
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Vendors can delete their own orders' AND tablename = 'orders') THEN
    CREATE POLICY "Vendors can delete their own orders" 
    ON orders FOR DELETE 
    USING (
      auth.uid() = vendor_id OR
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' OR
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    );
  END IF;

  RAISE NOTICE '✅ Orders RLS policies fixed: Vendors can now update their orders';
END $$;

-- 2. Fix Wallets Table Policies
-- Allow users to update their own wallets (if needed)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own wallet' AND tablename = 'wallets') THEN
    CREATE POLICY "Users can update their own wallet" 
    ON wallets FOR UPDATE 
    USING (auth.uid() = user_id);
  END IF;

  RAISE NOTICE '✅ Wallets RLS policies fixed: Users can update their wallets';
END $$;

-- 3. Verify and ensure all other critical policies exist
-- (Just to be safe, recreate them if missing)

-- Profiles Policies
DO $$ 
BEGIN
  -- Ensure SELECT policy exists for users to view their own profile
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can view their own profiles" ON profiles FOR SELECT USING (auth.uid() = id);
  END IF;

  -- Ensure SELECT policy exists for viewing relevant profiles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view relevant profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Anyone can view relevant profiles" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;

  -- Ensure INSERT policy exists
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can insert their own profiles" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;

  -- Ensure UPDATE policy exists
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own profiles' AND tablename = 'profiles') THEN
    CREATE POLICY "Users can update their own profiles" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;

  RAISE NOTICE '✅ Profiles RLS policies verified';
END $$;

-- Settlements Policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own settlements' AND tablename = 'settlements') THEN
    CREATE POLICY "Users can view their own settlements" ON settlements FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own settlements' AND tablename = 'settlements') THEN
    CREATE POLICY "Users can insert their own settlements" ON settlements FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  RAISE NOTICE '✅ Settlements RLS policies verified';
END $$;

-- ==========================================================
-- Summary of Fixes Applied:
-- 1. ✅ Vendors can now update their own orders (cancel, collect debt, etc.)
-- 2. ✅ Vendors can delete their own orders if needed
-- 3. ✅ Users can update their own wallets
-- 4. ✅ All other critical policies verified
-- ==========================================================

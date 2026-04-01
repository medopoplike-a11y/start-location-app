CREATE POLICY "wallets_read_policy" ON wallets FOR SELECT USING (auth.uid() = user_id OR (auth.jwt() ->> 'role') = 'admin');

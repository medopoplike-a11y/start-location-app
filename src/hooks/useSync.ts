"use client";

import { useEffect, useState, useRef } from "react";
import { subscribeToOrders, subscribeToProfiles, subscribeToWallets, subscribeToSettlements } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";

export const useSync = (userId?: string, onUpdate?: () => void, isAdmin: boolean = false) => {
  const [lastSync, setLastSync] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const triggerUpdate = () => {
    setIsSyncing(true);
    if (onUpdateRef.current) onUpdateRef.current();
    setLastSync(new Date());
    setTimeout(() => setIsSyncing(false), 800);
  };

  useEffect(() => {
    let ordersSub: any;
    let profilesSub: any;
    let walletSub: any;
    let settlementsSub: any;

    // Subscriptions
    ordersSub = subscribeToOrders(triggerUpdate);
    profilesSub = subscribeToProfiles(triggerUpdate);
    
    if (isAdmin) {
      // For Admin, subscribe to all wallets and settlements
      walletSub = supabase
        .channel('admin_all_wallets')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wallets' }, triggerUpdate)
        .subscribe();
      
      settlementsSub = supabase
        .channel('admin_all_settlements')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements' }, triggerUpdate)
        .subscribe();
    } else if (userId) {
      walletSub = subscribeToWallets(userId, triggerUpdate);
      settlementsSub = subscribeToSettlements(userId, triggerUpdate);
    }

    return () => {
      if (ordersSub) supabase.removeChannel(ordersSub);
      if (profilesSub) supabase.removeChannel(profilesSub);
      if (walletSub) supabase.removeChannel(walletSub);
      if (settlementsSub) supabase.removeChannel(settlementsSub);
    };
  }, [userId, isAdmin]);

  return { lastSync, isSyncing, triggerUpdate };
};

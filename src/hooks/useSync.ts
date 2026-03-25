"use client";

import { useEffect, useState, useRef } from "react";
import { subscribeToOrders, subscribeToProfiles, subscribeToWallets, subscribeToSettlements } from "@/lib/orders";
import { supabase } from "@/lib/supabaseClient";

export const useSync = (userId?: string, onUpdate?: () => void) => {
  const [lastSync, setLastSync] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    let ordersSub: any;
    let profilesSub: any;
    let walletSub: any;
    let settlementsSub: any;

    const triggerUpdate = () => {
      setIsSyncing(true);
      if (onUpdateRef.current) onUpdateRef.current();
      setLastSync(new Date());
      setTimeout(() => setIsSyncing(false), 800);
    };

    // Subscriptions
    ordersSub = subscribeToOrders(triggerUpdate);
    profilesSub = subscribeToProfiles(triggerUpdate);
    
    if (userId) {
      walletSub = subscribeToWallets(userId, triggerUpdate);
      settlementsSub = subscribeToSettlements(userId, triggerUpdate);
    }

    return () => {
      if (ordersSub) supabase.removeChannel(ordersSub);
      if (profilesSub) supabase.removeChannel(profilesSub);
      if (walletSub) supabase.removeChannel(walletSub);
      if (settlementsSub) supabase.removeChannel(settlementsSub);
    };
  }, [userId]);

  return { lastSync, isSyncing, triggerUpdate: () => onUpdateRef.current?.() };
};

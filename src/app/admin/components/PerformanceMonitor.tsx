"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Globe, Database, Cpu } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export const PerformanceMonitor = () => {
  const [latency, setLatency] = useState<number | null>(null);
  const [dbStatus, setDbStatus] = useState<'online' | 'offline'>('online');
  const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>('online');

  useEffect(() => {
    // Check Network Status
    const updateOnlineStatus = () => setNetworkStatus(navigator.onLine ? 'online' : 'offline');
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Monitor Latency and DB Status
    const interval = setInterval(async () => {
      const start = Date.now();
      try {
        const { error } = await supabase.from('app_config').select('id').limit(1);
        if (error) throw error;
        setLatency(Date.now() - start);
        setDbStatus('online');
      } catch (err) {
        setDbStatus('offline');
        setLatency(null);
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <StatusCard 
        icon={<Globe className="w-4 h-4" />} 
        label="الشبكة" 
        value={networkStatus === 'online' ? 'متصل' : 'منقطع'} 
        status={networkStatus === 'online' ? 'success' : 'error'}
      />
      <StatusCard 
        icon={<Database className="w-4 h-4" />} 
        label="قاعدة البيانات" 
        value={dbStatus === 'online' ? 'نشطة' : 'فشل'} 
        status={dbStatus === 'online' ? 'success' : 'error'}
      />
      <StatusCard 
        icon={<Activity className="w-4 h-4" />} 
        label="الاستجابة" 
        value={latency ? `${latency}ms` : '--'} 
        status={latency && latency < 200 ? 'success' : latency ? 'warning' : 'error'}
      />
      <StatusCard 
        icon={<Cpu className="w-4 h-4" />} 
        label="النظام" 
        value="V19.3.0" 
        status="info"
      />
    </div>
  );
};

const StatusCard = ({ icon, label, value, status }: { icon: any, label: string, value: string, status: 'success' | 'warning' | 'error' | 'info' }) => {
  const colors = {
    success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    error: 'bg-red-500/10 text-red-600 border-red-500/20',
    info: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
  };

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className={`flex flex-col gap-1 p-3 rounded-2xl border ${colors[status]} backdrop-blur-md`}
    >
      <div className="flex items-center gap-2 text-[10px] font-bold opacity-70 uppercase">
        {icon}
        {label}
      </div>
      <div className="text-sm font-black tracking-tight">{value}</div>
    </motion.div>
  );
};
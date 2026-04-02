"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, BarChart3, Download, Phone, CreditCard, CheckCircle, Clock, Banknote, Store } from 'lucide-react';
import { PremiumCard } from '@/components/PremiumCard';
import type { Order, DBDriverOrder } from '../types';

interface WalletProps {
  todayDeliveryFees: number;
  vendorDebt: number;
  orders: Order[];
  deliveredOrders: DBDriverOrder[];
  onConfirmPayment: (orderId: string) => Promise<void>;
}

export default function DriverWalletView({ todayDeliveryFees, vendorDebt, orders, deliveredOrders, onConfirmPayment }: WalletProps) {
  const [tab, setTab] = useState<'earnings' | 'vendors'>('earnings');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const deliveredActive = orders.filter(o => o.status === 'delivered' && !o.vendorCollectedAt);
  const netEarnings = todayDeliveryFees;

  const handleConfirm = async (orderId: string) => {
    setConfirmingId(orderId);
    await onConfirmPayment(orderId);
    setConfirmingId(null);
  };

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-2 gap-4'>
        <PremiumCard
          title='أرباح اليوم'
          value={netEarnings.toLocaleString()}
          subtitle='ج.م'
          icon={<TrendingUp className='text-green-500' />}
        />
        <PremiumCard
          title='مديونية المحلات'
          value={vendorDebt.toLocaleString()}
          subtitle='ج.م'
          icon={<CreditCard className='text-orange-500' />}
        />
      </div>

      <div className='flex border-b border-gray-200'>
        <button
          onClick={() => setTab('earnings')}
          className={`flex-1 py-3 px-4 text-center font-bold text-sm transition-all ${tab === 'earnings' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <span className='flex items-center justify-center gap-2'><BarChart3 className='w-4 h-4' /> الأرباح</span>
        </button>
        <button
          onClick={() => setTab('vendors')}
          className={`flex-1 py-3 px-4 text-center font-bold text-sm transition-all ${tab === 'vendors' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <span className='flex items-center justify-center gap-2'>
            <Banknote className='w-4 h-4' />
            مديونية المحلات
            {deliveredOrders.length > 0 && (
              <span className='bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full'>{deliveredOrders.length}</span>
            )}
          </span>
        </button>
      </div>

      <AnimatePresence mode='wait'>
        {tab === 'earnings' && (
          <motion.div key='earnings' initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className='space-y-4'>
            {orders.length === 0 ? (
              <div className='text-center py-16 text-slate-400 font-bold'>لا توجد طلبات بعد</div>
            ) : (
              <div className='bg-white border border-gray-100 rounded-[24px] p-5 shadow-sm overflow-x-auto'>
                <div className='min-w-[420px]'>
                  <div className='grid grid-cols-[1fr_auto_auto] gap-4 font-bold text-[10px] text-gray-500 uppercase border-b pb-3 mb-4 tracking-tight'>
                    <span>الطلب</span>
                    <span>الرسوم</span>
                    <span>الحالة</span>
                  </div>
                  {orders.slice(0, 20).map((order, idx) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      className='grid grid-cols-[1fr_auto_auto] gap-4 py-3 border-b border-gray-50 items-center hover:bg-gray-50 transition-colors'
                    >
                      <span className='font-semibold text-sm'>#{order.id.slice(0, 8)} — {order.vendor}</span>
                      <span className='font-black text-green-600'>{order.fee}</span>
                      <span className={`text-[9px] font-black px-2 py-1 rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-sky-100 text-sky-700'}`}>
                        {order.status === 'delivered' ? 'مكتمل' : 'نشط'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={() => {
                const csv = 'طلب,الرسوم\n' + orders.map(o => `${o.id.slice(0, 8)},${o.fee}`).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'earnings.csv';
                a.click();
              }}
              className='w-full bg-gray-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-gray-800 shadow-lg transition-all'
            >
              <Download className='w-5 h-5' />
              تصدير الأرباح
            </button>
          </motion.div>
        )}

        {tab === 'vendors' && (
          <motion.div key='vendors' initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className='space-y-4'>
            {deliveredOrders.length === 0 ? (
              <div className='text-center py-16 bg-green-50 rounded-[28px] border border-green-100'>
                <CheckCircle className='w-10 h-10 text-green-400 mx-auto mb-3' />
                <p className='text-sm font-black text-green-700'>لا توجد مديونيات معلقة</p>
                <p className='text-[10px] text-green-500 mt-1'>جميع المبالغ تمت تسويتها</p>
              </div>
            ) : (
              <>
                <div className='bg-orange-50 border border-orange-100 rounded-[24px] p-4'>
                  <p className='text-xs font-black text-orange-800'>
                    يجب عليك تسليم مبلغ المديونية للمحل ثم الضغط على "تأكيد التسليم" حتى يتمكن المحل من تأكيد الاستلام.
                  </p>
                </div>
                {deliveredOrders.map((order, idx) => {
                  const vendorName = order.profiles?.full_name || 'محل';
                  const vendorPhone = order.profiles?.phone || '';
                  const amount = order.financials?.order_value || 0;
                  const already = !!order.driver_confirmed_at;
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className='bg-white border border-orange-100 rounded-[28px] p-5 shadow-sm'
                    >
                      <div className='flex items-start justify-between mb-4'>
                        <div className='flex items-center gap-3'>
                          <div className='w-11 h-11 bg-orange-50 rounded-2xl flex items-center justify-center border border-orange-100'>
                            <Store className='w-5 h-5 text-orange-500' />
                          </div>
                          <div>
                            <h4 className='font-black text-slate-900'>{vendorName}</h4>
                            <p className='text-[9px] font-bold text-slate-400'>#{order.id.slice(0, 8)}</p>
                          </div>
                        </div>
                        <div className='text-left bg-orange-50 px-3 py-2 rounded-2xl border border-orange-100'>
                          <p className='text-sm font-black text-orange-700'>{amount.toLocaleString()} ج.م</p>
                          <p className='text-[8px] font-bold text-orange-400 uppercase'>المبلغ</p>
                        </div>
                      </div>

                      <div className='flex gap-2 mt-2'>
                        {vendorPhone && (
                          <a
                            href={`tel:${vendorPhone}`}
                            className='flex items-center gap-1.5 bg-sky-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all'
                          >
                            <Phone className='w-3.5 h-3.5' />
                            اتصال
                          </a>
                        )}
                        {order.status === 'in_transit' ? (
                          <div className='flex-1 flex items-center justify-center gap-2 bg-sky-50 border border-sky-200 py-2.5 rounded-xl'>
                            <Clock className='w-4 h-4 text-sky-500' />
                            <span className='text-xs font-black text-sky-700'>جاري التوصيل للعميل...</span>
                          </div>
                        ) : already ? (
                          <div className='flex-1 flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 py-2.5 rounded-xl'>
                            <Clock className='w-4 h-4 text-amber-500' />
                            <span className='text-xs font-black text-amber-700'>بانتظار تأكيد المحل</span>
                          </div>
                        ) : (
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            disabled={confirmingId === order.id}
                            onClick={() => handleConfirm(order.id)}
                            className='flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 rounded-xl font-black text-xs shadow-lg shadow-emerald-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2'
                          >
                            <CheckCircle className='w-4 h-4' />
                            {confirmingId === order.id ? 'جاري...' : 'تأكيد تسليم المبلغ'}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

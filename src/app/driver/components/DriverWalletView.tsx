"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart3, Download, Phone, CreditCard } from 'lucide-react';
import { PremiumCard } from '@/components/PremiumCard';

interface WalletProps {
  todayDeliveryFees: number;
  vendorDebt: number;
  orders: any[]; // Replace with proper type
}

export default function DriverWalletView({ todayDeliveryFees, vendorDebt, orders }: WalletProps) {
  const [tab, setTab] = useState<'earnings' | 'commission' | 'vendors'>('earnings');
  const totalCommission = orders.reduce((acc, order) => acc + (order.financials?.system_commission || 0), 0);
  const netEarnings = orders.reduce((acc, order) => acc + ((order.financials?.delivery_fee || 0) - (order.financials?.system_commission || 0)), 0);

  const commissionLimit = 500;
  const commissionProgress = (totalCommission / commissionLimit) * 100;
  const isLimitReached = totalCommission >= commissionLimit;

  const vendorDebts = [
    { name: 'البرجر الذهبي', debt: 450, phone: '01012345678' },
    { name: 'مطعم الكباب', debt: 320, phone: '01123456789' },
    { name: 'المندي الخليجي', debt: 480, phone: '01234567890' },
  ];

  const handlePayCommission = () => {
    // QR code or payment flow
    window.open('https://vodafonecash.com/pay?amount=' + totalCommission, '_blank');
  };

  const handleCallVendor = (phone: string) => {
    window.open('tel:' + phone);
  };

  const handleExport = () => {
    // CSV export
    const csv = 'Order,Amount,Commission,Net\\n' + orders.map(o => `${o.id},${o.financials.delivery_fee},${o.financials.system_commission},${netEarnings}`).join('\\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'earnings.csv';
    a.click();
  };

  return (
    <div className=\"space-y-6\">
      {/* Earnings Cards */}
      <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
        <PremiumCard 
          title=\"أرباح اليوم الصافية\" 
          value={netEarnings.toLocaleString()} 
          subtitle=\"ج.م\" 
          trend=\"+12%\"
          icon={<TrendingUp className=\"text-green-500\" />}
        />
        <PremiumCard 
          title=\"مديونية المحلات\" 
          value={vendorDebt.toLocaleString()} 
          subtitle=\"ج.م\" 
          trend=\"+3 اليوم\"
          icon={<CreditCard className=\"text-orange-500\" />}
        />
      </div>

      {/* Commission Wallet */}
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-clean shadow-xl rounded-3xl p-8">

        <div className="flex justify-between items-start mb-6">

          <div>
            <h3 className=\"text-lg font-black text-orange-900 mb-1\">عمولة الشركة</h3>
            <p className=\"text-sm text-orange-700\">مستحقة للسداد</p>
          </div>
          <div className=\"text-right\">
            <p className=\"text-2xl font-black text-orange-600\">{totalCommission.toLocaleString()}</p>
            <p className=\"text-xs text-orange-500\">من {commissionLimit} ج.م حد أقصى</p>
          </div>
        </div>
        
        <div className=\"w-full bg-orange-100 rounded-2xl h-2 overflow-hidden\">
          <div className=\"bg-orange-500 h-full transition-all duration-300 rounded-xl\" style={{ width: `${commissionProgress}%` }} />
        </div>
        
        {isLimitReached && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className=\"mt-4 p-4 bg-red-50 border border-red-100 rounded-2xl\">
            <p className=\"text-sm font-bold text-red-800\">⚠️ تجاوزت الحد! سيتم إيقاف الطلبات حتى السداد</p>
          </motion.div>
        )}
        
        <button 
          onClick={handlePayCommission}
          disabled={totalCommission === 0}
          className=\"w-full mt-6 bg-orange-600 hover:bg-orange-700 text-white font-black py-4 px-6 rounded-2xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2\"
        >
          <CreditCard className=\"w-5 h-5\" />
          سداد العمولة الآن ({totalCommission.toLocaleString()} ج.م)
        </button>
      </motion.div>

      {/* Tab Navigation */}
      <div className=\"flex border-b border-gray-200\">
        <button onClick={() => setTab('earnings')} className={`flex-1 py-3 px-4 text-center font-bold text-sm transition-all ${tab === 'earnings' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-gray-500 hover:text-gray-700'}`}>الأرباح اليومية</button>
        <button onClick={() => setTab('commission')} className={`flex-1 py-3 px-4 text-center font-bold text-sm transition-all ${tab === 'commission' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}>عمولة الشركة</button>
        <button onClick={() => setTab('vendors')} className={`flex-1 py-3 px-4 text-center font-bold text-sm transition-all ${tab === 'vendors' ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>مديونية المحلات</button>
      </div>

      {/* Tab Content */}
      {tab === 'earnings' && (
        <div className=\"space-y-4\">
          <div className=\"bg-white border border-gray-100 rounded-[24px] p-6 shadow-sm overflow-x-auto\">
            <div className=\"min-w-[500px]\">
              <div className=\"grid grid-cols-[1fr auto auto auto] gap-4 font-bold text-xs text-gray-500 uppercase border-b pb-3 mb-4 tracking-tight\">
                <span>الطلب</span>
                <span>الرسوم</span>
                <span>العمولة</span>
                <span>الصافي</span>
              </div>
              {orders.slice(0, 10).map((order, idx) => (
                <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }} className=\"grid grid-cols-[1fr auto auto auto] gap-4 py-3 border-b border-gray-50 items-center hover:bg-gray-50 transition-colors\">
                  <span className=\"font-semibold text-sm\">#{order.id.slice(0,8)} - {order.vendor}</span>
                  <span className=\"font-bold text-green-600\">{order.financials?.delivery_fee || 0} ج</span>
                  <span className=\"font-bold text-orange-600\">{order.financials?.system_commission || 0} ج</span>
                  <span className=\"font-black text-lg text-green-600\">{((order.financials?.delivery_fee || 0) - (order.financials?.system_commission || 0)).toLocaleString()} ج</span>
                </motion.div>
              ))}
            </div>
          </div>
          <button onClick={handleExport} className=\"w-full bg-gray-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-gray-800 shadow-lg transition-all\">
            <Download className=\"w-5 h-5\" />
            تصدير الأرباح (PDF/Excel)
          </button>
        </div>
      )}

      {tab === 'commission' && (
        <div className=\"space-y-4 p-4 bg-orange-50/50 rounded-2xl border border-orange-100\">
          <p className=\"text-sm text-orange-800 font-bold\">سجل العمولات لهذا الأسبوع</p>
          {/* Commission history list */}
        </div>
      )}

      {tab === 'vendors' && (
        <div className=\"space-y-4\">
          {vendorDebts.map((vendor, idx) => (
            <motion.div key={vendor.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
              <div className=\"bg-white border border-red-100 rounded-2xl p-5 hover:shadow-md transition-all group\">
                <div className=\"flex justify-between items-start mb-4\">
                  <h4 className=\"font-black text-lg text-gray-900 group-hover:text-red-600\">{vendor.name}</h4>
                  <span className=\"bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-black\">{vendor.debt.toLocaleString()} ج.م</span>
                </div>
                <div className=\"flex items-center gap-3 pt-3 border-t border-red-50\">
                  <button onClick={() => handleCallVendor(vendor.phone)} className=\"bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-1\">
                    <Phone className=\"w-4 h-4\" />
                    اتصال
                  </button>
                  <span className=\"text-xs text-gray-500 flex-1 text-right\">آخر طلب: أمس</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}


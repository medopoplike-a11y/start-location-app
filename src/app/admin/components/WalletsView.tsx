"use client";

import React from "react";
import { Wallet, User, ArrowUpRight, ArrowDownRight, Banknote, Trash2 } from "lucide-react";
import type { AppUser, WalletRow } from "../types";

interface WalletsViewProps {
  users: AppUser[];
  wallets: WalletRow[];
  onResetUser: (userId: string, userName: string) => void;
}

export default function WalletsView({ users = [], wallets = [], onResetUser }: WalletsViewProps) {
  const mergedData = (users || [])
    .filter(u => u && u.id) 
    .map(user => {
      const wallet = (wallets || []).find(w => w && w.user_id === user.id);
      return {
        ...user,
        balance: Number(wallet?.balance) || 0,
        debt: Number(wallet?.debt) || 0,
        system_balance: Number(wallet?.system_balance) || 0,
      };
    }).filter(u => u && u.role !== 'admin');

  const totalDriverDebt = (mergedData || [])
    .filter(u => u && u.role === 'driver')
    .reduce((acc, curr) => acc + (Number(curr.debt) || 0), 0);

  const totalSystemCommission = (mergedData || [])
    .reduce((acc, curr) => acc + (Number(curr.system_balance) || 0), 0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Banknote size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">إجمالي عمولات الشركة</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{(totalSystemCommission || 0).toLocaleString('ar-EG')} <span className="text-xs opacity-50">ج.م</span></h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
              <ArrowUpRight size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">مديونية الطيارين للمحلات</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{(totalDriverDebt || 0).toLocaleString('ar-EG')} <span className="text-xs opacity-50">ج.م</span></h3>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">عدد المحافظ النشطة</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">{(mergedData || []).length}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Wallets Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-black text-slate-900 dark:text-white">تفاصيل كافة المحافظ</h3>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500">الكل: {(mergedData || []).length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                <th className="py-6 pr-8 font-black">المستخدم</th>
                <th className="py-6 text-center font-black">النوع</th>
                <th className="py-6 text-center font-black">الرصيد (للطيار)</th>
                <th className="py-6 text-center font-black">مديونية المحلات</th>
                <th className="py-6 text-center font-black">عمولة الشركة</th>
                <th className="py-6 text-center font-black">الحالة المالية</th>
                <th className="py-6 text-center font-black pr-8">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {(mergedData || []).map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                  <td className="py-5 pr-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 border border-slate-200 dark:border-slate-700 group-hover:scale-110 transition-transform">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-slate-100 text-sm">{user.full_name || "بدون اسم"}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{user.phone || "بدون هاتف"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 text-center">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                      user.role === 'vendor' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30' :
                      'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                    }`}>
                      {user.role === 'vendor' ? 'محل' : 'طيار'}
                    </span>
                  </td>
                  <td className="py-5 text-center font-black text-slate-700 dark:text-slate-200 text-xs">
                    {user.role === 'driver' ? `${(user.balance || 0).toLocaleString('ar-EG')} ج.م` : '-'}
                  </td>
                  <td className="py-5 text-center font-black text-amber-600 text-xs">
                    {user.role === 'driver' ? `${(user.debt || 0).toLocaleString('ar-EG')} ج.م` : '-'}
                  </td>
                  <td className="py-5 text-center font-black text-blue-600 text-xs">
                    {(user.system_balance || 0).toLocaleString('ar-EG')} ج.م
                  </td>
                  <td className="py-5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {(user.system_balance || 0) > 0 ? (
                        <span className="flex items-center gap-1 text-[10px] font-black text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-lg border border-rose-100 dark:border-rose-900/30">
                          <ArrowUpRight size={12} />
                          مطلوب سداد
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                          <ArrowDownRight size={12} />
                          خالص
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-5 pr-8">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => onResetUser(user.id, user.full_name)} className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors" title="تصفير شامل">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { User } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string;
  area: string;
  created_at: string;
}

export default function AccountsView({ users }: { users: UserProfile[] }) {
  return (
    <div className="overflow-x-auto dark:bg-slate-900 rounded-[32px]">
      <table className="w-full text-right border-collapse">
        <thead>
          <tr className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
            <th className="pb-4 pr-6 font-black">المستخدم</th>
            <th className="pb-4 text-center font-black">الرتبة</th>
            <th className="pb-4 text-center font-black">الهاتف</th>
            <th className="pb-4 text-center font-black">المنطقة</th>
            <th className="pb-4 text-center font-black">تاريخ التسجيل</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
              <td className="py-4 pr-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 group-hover:scale-110 transition-transform">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-slate-100 text-sm tracking-tight">{user.full_name}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="py-4 text-center">
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                  user.role === 'admin' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30' :
                  user.role === 'vendor' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30' :
                  'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                }`}>
                  {user.role === 'admin' ? 'مدير' : user.role === 'vendor' ? 'محل' : 'طيار'}
                </span>
              </td>
              <td className="py-4 text-center text-[11px] font-black text-slate-600 dark:text-slate-400">{user.phone}</td>
              <td className="py-4 text-center text-[11px] font-bold text-slate-500 dark:text-slate-500">{user.area}</td>
              <td className="py-4 text-center text-[10px] text-slate-400 dark:text-slate-600 font-bold">{user.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

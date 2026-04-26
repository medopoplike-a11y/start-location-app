"use client";

import React from "react";
import { User, Trash2, RotateCcw, UserCog, MoreVertical } from "lucide-react";
import { motion } from "framer-motion";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string;
  area: string;
  created_at: string;
}

interface AccountsViewProps {
  users: UserProfile[];
  onUpdateUser?: (userId: string, updates: any) => Promise<void>;
  onDeleteUser?: (userId: string, userName: string) => Promise<void>;
  onResetUser?: (userId: string, userName: string) => void;
}

export default function AccountsView({ users, onUpdateUser, onDeleteUser, onResetUser }: AccountsViewProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <th className="py-5 pr-8 font-black">المستخدم</th>
              <th className="py-5 text-center font-black">الرتبة</th>
              <th className="py-5 text-center font-black">الهاتف</th>
              <th className="py-5 text-center font-black">المنطقة</th>
              <th className="py-5 text-center font-black">تاريخ التسجيل</th>
              <th className="py-5 pl-8 text-left font-black">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {users.map((user, i) => (
              <motion.tr 
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group"
              >
                <td className="py-5 pr-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 group-hover:scale-110 transition-transform">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-slate-100 text-sm tracking-tight">{user.full_name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-5 text-center">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                    user.role === 'admin' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30' :
                    user.role === 'vendor' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30' :
                    'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
                  }`}>
                    {user.role === 'admin' ? 'مدير' : user.role === 'vendor' ? 'محل' : 'طيار'}
                  </span>
                </td>
                <td className="py-5 text-center text-[11px] font-black text-slate-600 dark:text-slate-400">{user.phone}</td>
                <td className="py-5 text-center text-[11px] font-bold text-slate-500 dark:text-slate-500">{user.area}</td>
                <td className="py-5 text-center text-[10px] text-slate-400 dark:text-slate-600 font-bold">
                  {new Date(user.created_at).toLocaleDateString('ar-EG')}
                </td>
                <td className="py-5 pl-8 text-left">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => onResetUser?.(user.id, user.full_name)}
                      className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-all"
                      title="تصفير البيانات"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button 
                      onClick={() => onDeleteUser?.(user.id, user.full_name)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                      title="حذف الحساب"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


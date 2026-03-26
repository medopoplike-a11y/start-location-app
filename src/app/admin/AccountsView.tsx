"use client";

import React from "react";
import { User, Shield, Store, Truck } from "lucide-react";

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
    <div className="overflow-x-auto">
      <table className="w-full text-right">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-100">
            <th className="pb-4 pr-4">المستخدم</th>
            <th className="pb-4 text-center">الرتبة</th>
            <th className="pb-4 text-center">الهاتف</th>
            <th className="pb-4 text-center">المنطقة</th>
            <th className="pb-4 text-center">تاريخ التسجيل</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
              <td className="py-4 pr-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{user.full_name}</p>
                    <p className="text-[10px] text-gray-400">{user.email}</p>
                  </div>
                </div>
              </td>
              <td className="py-4 text-center">
                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                  user.role === 'admin' ? 'bg-purple-50 text-purple-600' :
                  user.role === 'vendor' ? 'bg-orange-50 text-orange-600' :
                  'bg-green-50 text-green-600'
                }`}>
                  {user.role === 'admin' ? 'مدير' : user.role === 'vendor' ? 'محل' : 'طيار'}
                </span>
              </td>
              <td className="py-4 text-center text-xs font-bold text-gray-600">{user.phone}</td>
              <td className="py-4 text-center text-xs text-gray-500">{user.area}</td>
              <td className="py-4 text-center text-[10px] text-gray-400">{user.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

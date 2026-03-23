import { motion } from 'framer-motion';
import { User, Mail, ShieldCheck, Store } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  area: string;
  vehicle_type: string;
  national_id: string;
  role: string;
  created_at: string;
}

const AccountsView = ({ users }: { users: UserProfile[] }) => {
  const drivers = users.filter(u => u.role === 'driver');
  const vendors = users.filter(u => u.role === 'vendor');
  const admins = users.filter(u => u.role === 'admin');

  return (
    <div className="space-y-8">
      {/* قسم الأدمن */}
      {admins.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">حسابات المسؤولين</h2>
          <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-50">
                    <th className="pb-4 font-bold text-right pr-4">البريد الإلكتروني</th>
                    <th className="pb-4 font-bold text-center">تاريخ الإنشاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {admins.map((user) => (
                    <tr key={user.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-red/10 text-brand-red rounded-full flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <p className="font-bold text-gray-800">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-4 text-center font-bold text-gray-600">{user.created_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">حسابات المناديب</h2>
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-50">
                    <th className="pb-4 font-bold text-right pr-4">الاسم بالكامل</th>
                    <th className="pb-4 font-bold text-right">البريد الإلكتروني</th>
                    <th className="pb-4 font-bold text-center">رقم الهاتف</th>
                    <th className="pb-4 font-bold text-center">المنطقة</th>
                    <th className="pb-4 font-bold text-center">نوع المركبة</th>
                    <th className="pb-4 font-bold text-center">الرقم القومي</th>
                    <th className="pb-4 font-bold text-center">تاريخ الإنشاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {drivers.length > 0 ? drivers.map((user) => (
                    <tr key={user.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5" />
                          </div>
                          <p className="font-bold text-gray-800">{user.full_name}</p>
                        </div>
                      </td>
                      <td className="py-4 text-right font-medium text-gray-600">{user.email}</td>
                      <td className="py-4 text-center font-bold text-gray-800">{user.phone}</td>
                      <td className="py-4 text-center text-gray-600">{user.area}</td>
                      <td className="py-4 text-center">
                        <span className="bg-gray-100 px-3 py-1 rounded-lg text-[10px] font-bold text-gray-600">
                          {user.vehicle_type}
                        </span>
                      </td>
                      <td className="py-4 text-center text-gray-500 font-mono text-xs">{user.national_id}</td>
                      <td className="py-4 text-center font-bold text-gray-400 text-xs">{user.created_at}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400 font-bold">
                        لا يوجد مناديب مسجلين حالياً
                      </td>
                    </tr>
                  )}
                </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">حسابات المحلات</h2>
        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                  <tr className="text-gray-400 text-xs border-b border-gray-50">
                    <th className="pb-4 font-bold text-right pr-4">اسم المحل</th>
                    <th className="pb-4 font-bold text-right">البريد الإلكتروني</th>
                    <th className="pb-4 font-bold text-center">رقم الهاتف</th>
                    <th className="pb-4 font-bold text-center">تاريخ الإنشاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {vendors.length > 0 ? vendors.map((user) => (
                    <tr key={user.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                            <Store className="w-5 h-5" />
                          </div>
                          <p className="font-bold text-gray-800">{user.full_name}</p>
                        </div>
                      </td>
                      <td className="py-4 text-right font-medium text-gray-600">{user.email}</td>
                      <td className="py-4 text-center font-bold text-gray-800">{user.phone}</td>
                      <td className="py-4 text-center font-bold text-gray-400 text-xs">{user.created_at}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 font-bold">
                        لا يوجد محلات مسجلة حالياً
                      </td>
                    </tr>
                  )}
                </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsView;

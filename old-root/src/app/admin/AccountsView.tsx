import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, ShieldCheck, Store, Edit2, X, Phone, MapPin, CreditCard, Truck } from 'lucide-react';
import { adminUpdateUser } from '@/lib/auth';

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
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [saving, setSaving] = useState(false);

  const drivers = users.filter(u => u.role === 'driver');
  const vendors = users.filter(u => u.role === 'vendor');
  const admins = users.filter(u => u.role === 'admin');

  const handleUpdate = async () => {
    if (!editingUser) return;
    setSaving(true);
    const { error } = await adminUpdateUser(editingUser.id, {
      full_name: editingUser.full_name,
      phone: editingUser.phone,
      area: editingUser.area,
      vehicle_type: editingUser.vehicle_type,
      national_id: editingUser.national_id
    });

    if (error) {
      alert("حدث خطأ أثناء تحديث البيانات.");
    } else {
      alert("تم تحديث بيانات المستخدم بنجاح.");
      setEditingUser(null);
      // Re-fetch should be handled by the parent component (AdminPanel)
    }
    setSaving(false);
  };

  return (
    <div className="space-y-8">
      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button onClick={() => setEditingUser(null)} className="absolute top-6 left-6 text-gray-400 hover:text-gray-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-black mb-6">تعديل بيانات {editingUser.role === 'driver' ? 'المندوب' : 'المحل'}</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-2">الاسم بالكامل</label>
                  <input 
                    type="text" 
                    value={editingUser.full_name} 
                    onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})} 
                    className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-blue-500 font-bold" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-2">رقم الهاتف</label>
                  <input 
                    type="tel" 
                    value={editingUser.phone} 
                    onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})} 
                    className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-blue-500 font-bold" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-2">المنطقة</label>
                  <input 
                    type="text" 
                    value={editingUser.area} 
                    onChange={(e) => setEditingUser({...editingUser, area: e.target.value})} 
                    className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-blue-500 font-bold" 
                  />
                </div>

                {editingUser.role === 'driver' && (
                  <>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-2">نوع المركبة</label>
                      <select 
                        value={editingUser.vehicle_type} 
                        onChange={(e) => setEditingUser({...editingUser, vehicle_type: e.target.value})} 
                        className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-blue-500 font-bold appearance-none"
                      >
                        <option>موتوسيكل</option>
                        <option>عجلة</option>
                        <option>سيارة</option>
                        <option>سكوتر</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 block mb-2">الرقم القومي</label>
                      <input 
                        type="text" 
                        value={editingUser.national_id} 
                        onChange={(e) => setEditingUser({...editingUser, national_id: e.target.value})} 
                        className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-blue-500 font-bold" 
                      />
                    </div>
                  </>
                )}

                <button 
                  onClick={handleUpdate} 
                  disabled={saving}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50 shadow-lg shadow-blue-100 mt-4"
                >
                  {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                    <th className="pb-4 font-bold text-center">الإجراء</th>
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
                        <button 
                          onClick={() => setEditingUser(user)}
                          className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400 font-bold">
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
                    <th className="pb-4 font-bold text-center">الإجراء</th>
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
                      <td className="py-4 text-center">
                        <button 
                          onClick={() => setEditingUser(user)}
                          className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
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

"use client";

import { motion } from "framer-motion";
import { Truck, Shield, ShieldOff, RotateCcw, Plus, CheckCircle2, XCircle, Settings, CheckCircle, X, UserCog, Mail, Phone, Lock, Trash2 } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DriverCard } from "../types";

interface DriversViewProps {
  drivers: DriverCard[];
  onAddDriver: () => void;
  onUpdateDriverBilling?: (driverId: string, data: any) => Promise<void>;
  onUpdateUserDetails?: (userId: string, updates: any) => Promise<void>;
  onDeleteUser?: (userId: string, userName: string) => Promise<void>;
  onToggleShiftLock: (driverId: string, currentStatus: boolean) => void;
  onResetUser: (userId: string, userName: string) => void;
}

export default function DriversView({ drivers, onAddDriver, onUpdateDriverBilling, onUpdateUserDetails, onDeleteUser, onToggleShiftLock, onResetUser }: DriversViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDetailsId, setEditingDetailsId] = useState<string | null>(null);
  const [tempData, setTempData] = useState<{ 
    billing_type: 'commission' | 'fixed_salary', 
    monthly_salary: number,
    commission_value: number,
    max_active_orders: number
  }>({ billing_type: 'commission', monthly_salary: 0, commission_value: 15, max_active_orders: 3 });

  const [tempDetails, setTempDetails] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: ""
  });

  const activeDrivers = drivers.filter(d => !d.isShiftLocked);
  const lockedDrivers = drivers.filter(d => d.isShiftLocked);

  const handleUpdateBilling = async (driverId: string) => {
    if (!onUpdateDriverBilling) return;
    await onUpdateDriverBilling(driverId, tempData);
    setEditingId(null);
  };

  const handleUpdateDetails = async (driverId: string) => {
    if (!onUpdateUserDetails) return;
    await onUpdateUserDetails(driverId, tempDetails);
    setEditingDetailsId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">إدارة المناديب</h2>
          <p className="text-xs text-slate-400 font-bold mt-0.5">
            {activeDrivers.length} نشط · {lockedDrivers.length} محظور · {drivers.length} إجمالي
          </p>
        </div>
        <button onClick={onAddDriver} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 text-white text-sm font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
          <Plus className="w-4 h-4" />
          إضافة طيار
        </button>
      </div>

      {drivers.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-[32px] p-16 text-center">
          <Truck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-bold">لا يوجد مناديب بعد</p>
          <button onClick={onAddDriver} className="mt-4 px-6 py-2.5 rounded-xl bg-blue-50 text-blue-600 text-sm font-bold border border-blue-100 hover:bg-blue-100 transition-all">
            إضافة أول طيار
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {drivers.map((d, i) => (
            <motion.div
              key={d.id_full}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`bg-white border rounded-[28px] p-5 shadow-sm space-y-4 transition-all ${d.isShiftLocked ? "border-red-100 bg-red-50/30" : "border-slate-100 hover:border-slate-200 hover:shadow-md"}`}
            >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${d.isShiftLocked ? "bg-red-100" : "bg-emerald-50 border border-emerald-100"}`}>
                      <Truck className={`w-5 h-5 ${d.isShiftLocked ? "text-red-400" : "text-emerald-500"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-slate-900 text-sm">{d.name}</p>
                        <button 
                          onClick={() => {
                            setEditingDetailsId(d.id_full);
                            setTempDetails({
                              full_name: d.name,
                              email: (d as any).email || "",
                              phone: (d as any).phone || "",
                              password: ""
                            });
                          }}
                          className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-500 transition-colors"
                          title="تعديل بيانات المستخدم"
                        >
                          <UserCog className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className={`flex items-center gap-1.5 mt-0.5 ${d.isShiftLocked ? "text-red-400" : "text-emerald-500"}`}>
                        {d.isShiftLocked ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                        <span className="text-[10px] font-black uppercase">{d.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-black text-slate-300 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">#{d.id}</span>
                    <button 
                      onClick={() => onDeleteUser?.(d.id_full, d.name)}
                      className="p-1 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-colors"
                      title="حذف الحساب نهائياً"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {editingDetailsId === d.id_full && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-3 mb-2">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">تعديل الملف الشخصي</p>
                        
                        <div className="space-y-2">
                          <div className="relative">
                            <UserCog className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                              type="text" 
                              value={tempDetails.full_name}
                              onChange={(e) => setTempDetails({...tempDetails, full_name: e.target.value})}
                              placeholder="الاسم بالكامل"
                              className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-bold outline-none focus:border-blue-400"
                            />
                          </div>
                          <div className="relative">
                            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                              type="email" 
                              value={tempDetails.email}
                              onChange={(e) => setTempDetails({...tempDetails, email: e.target.value})}
                              placeholder="البريد الإلكتروني"
                              className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-bold outline-none focus:border-blue-400"
                            />
                          </div>
                          <div className="relative">
                            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                              type="tel" 
                              value={tempDetails.phone}
                              onChange={(e) => setTempDetails({...tempDetails, phone: e.target.value})}
                              placeholder="رقم الهاتف"
                              className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-bold outline-none focus:border-blue-400"
                            />
                          </div>
                          <div className="relative">
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                              type="password" 
                              value={tempDetails.password}
                              onChange={(e) => setTempDetails({...tempDetails, password: e.target.value})}
                              placeholder="كلمة سر جديدة (اتركها فارغة إذا لا تريد التغيير)"
                              className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-bold outline-none focus:border-blue-400"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button 
                            onClick={() => handleUpdateDetails(d.id_full)}
                            className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-blue-100 flex items-center justify-center gap-1"
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> حفظ البيانات
                          </button>
                          <button onClick={() => setEditingDetailsId(null)} className="p-2 bg-white border border-slate-200 text-slate-500 rounded-xl">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">الأرباح</p>
                  <p className="text-sm font-black text-slate-800">{d.earnings.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">ج.م</span></p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">المديونية</p>
                  <p className="text-sm font-black text-slate-800">{d.debt.toLocaleString()} <span className="text-[10px] font-bold text-slate-400">ج.م</span></p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                {editingId === d.id_full ? (
                  <div className="space-y-3">
                    <div className="flex p-1 bg-slate-200 rounded-xl">
                      <button 
                        onClick={() => setTempData({...tempData, billing_type: 'commission'})}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${tempData.billing_type === 'commission' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
                      >
                        نظام العمولة
                      </button>
                      <button 
                        onClick={() => setTempData({...tempData, billing_type: 'fixed_salary'})}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${tempData.billing_type === 'fixed_salary' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
                      >
                        راتب ثابت
                      </button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-slate-400 px-1 uppercase">الحد الأقصى للطلبات</p>
                      <input 
                        type="number" 
                        value={tempData.max_active_orders} 
                        onChange={(e) => setTempData({...tempData, max_active_orders: Number(e.target.value)})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none"
                        placeholder="الحد الأقصى (مثلاً: 3)"
                      />
                    </div>

                        {tempData.billing_type === 'commission' ? (
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1 bg-slate-200 p-1 rounded-xl">
                              <span className="px-2 py-1 rounded-lg text-[9px] font-black bg-blue-500 text-white">%</span>
                            </div>
                            <input 
                              type="number" 
                              value={tempData.commission_value} 
                              onChange={(e) => setTempData({...tempData, commission_value: Number(e.target.value)})}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none"
                              placeholder="نسبة العمولة (مثلاً: 15)"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-[9px] font-black text-slate-400 px-1 uppercase">الراتب الشهري</p>
                            <input 
                              type="number" 
                              value={tempData.monthly_salary} 
                              onChange={(e) => setTempData({...tempData, monthly_salary: Number(e.target.value)})}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black outline-none"
                              placeholder="الراتب الشهري"
                            />
                          </div>
                        )}

                    <div className="flex gap-2 pt-1">
                      <button onClick={() => handleUpdateBilling(d.id_full)} className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black shadow-lg shadow-emerald-100 flex items-center justify-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> حفظ التعديل
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-2 bg-slate-200 text-slate-500 rounded-xl">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase">نظام الحساب</p>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${d.billing_type === 'fixed_salary' ? "bg-purple-50 text-purple-600 border-purple-100" : "bg-blue-50 text-blue-600 border-blue-100"}`}>
                        {d.billing_type === 'fixed_salary' ? "راتب ثابت" : "نظام عمولة"}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase">القيمة المتفق عليها</p>
                      <p className="text-xs font-black text-slate-700">
                        {d.billing_type === 'fixed_salary' 
                          ? `${d.monthly_salary?.toLocaleString() || 0} ج.م` 
                          : `${d.commission_value || 15}%`
                        }
                      </p>
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-[9px] font-black text-slate-400 uppercase">الحد الأقصى</p>
                      <p className="text-xs font-black text-slate-700">{d.max_active_orders || 3} طلبات</p>
                    </div>

                    <button 
                      onClick={() => {
                        setEditingId(d.id_full);
                        setTempData({ 
                          billing_type: d.billing_type || 'commission',
                          monthly_salary: d.monthly_salary || 0,
                          commission_value: d.commission_value || 15,
                          max_active_orders: d.max_active_orders || 3
                        });
                      }}
                      className="mt-1 text-[9px] font-black text-blue-500 hover:text-blue-700 transition-colors flex items-center gap-1 w-fit"
                    >
                      <Settings className="w-3 h-3" />
                      تعديل الإعدادات
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => onToggleShiftLock(d.id_full, d.isShiftLocked)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-black transition-all ${d.isShiftLocked ? "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100"}`}>
                  {d.isShiftLocked ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                  {d.isShiftLocked ? "فتح الحساب" : "حظر الحساب"}
                </button>
                <button onClick={() => onResetUser(d.id_full, d.name)} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-all" title="تصفير بيانات الطيار">
                  <RotateCcw className="w-3.5 h-3.5" />
                  تصفير
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

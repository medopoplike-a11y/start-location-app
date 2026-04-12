"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Search, 
  Truck, 
  Store, 
  User, 
  Clock, 
  Edit,
  Trash2,
  Plus,
  FileText,
  Download,
  AlertCircle
} from "lucide-react";
import type { AdminOrder } from "../types";

interface OrderHistoryViewProps {
  orders: AdminOrder[];
  onEditOrder: (order: AdminOrder) => void;
  onDeleteOrder: (orderId: string) => void;
  onCreateOrder: () => void;
}

export default function OrderHistoryView({ 
  orders, 
  onEditOrder, 
  onDeleteOrder, 
  onCreateOrder 
}: OrderHistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("الكل");
  const [typeFilter, setTypeFilter] = useState("الكل"); // 'single' or 'multi'
  const [dateFilter] = useState("الكل"); // 'today', 'yesterday', 'this_week'

  // Advanced Filtering Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.vendor_full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.driver_full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_details?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "الكل" || order.status_label === statusFilter;
      
      const isMulti = order.customer_details?.customers && order.customer_details.customers.length > 0;
      const matchesType = typeFilter === "الكل" || 
        (typeFilter === "متعدد" && isMulti) || 
        (typeFilter === "فردي" && !isMulti);

      // Simple date filtering (can be expanded)
      const orderDate = new Date(order.created_at);
      const today = new Date();
      const matchesDate = dateFilter === "الكل" || 
        (dateFilter === "اليوم" && orderDate.toDateString() === today.toDateString());

      return matchesSearch && matchesStatus && matchesType && matchesDate;
    });
  }, [orders, searchTerm, statusFilter, typeFilter, dateFilter]);

  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const delivered = filteredOrders.filter(o => o.status === 'delivered').length;
    const cancelled = filteredOrders.filter(o => o.status === 'cancelled').length;
    const totalValue = filteredOrders.reduce((sum, o) => sum + (o.financials?.order_value || 0), 0);
    return { total, delivered, cancelled, totalValue };
  }, [filteredOrders]);

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <FileText className="w-7 h-7 text-blue-600" />
            سجل الطلبات والفواتير
          </h2>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-tight">مراجعة وتحكم كامل في جميع طلبات النظام</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onCreateOrder}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-lg shadow-blue-100 flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            إنشاء طلب جديد
          </button>
          <button className="bg-white border border-slate-100 p-3 rounded-2xl text-slate-400 hover:text-slate-600 shadow-sm transition-all">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي الطلبات", value: stats.total, color: "text-slate-900", bg: "bg-white" },
          { label: "تم التوصيل", value: stats.delivered, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
          { label: "ملغي", value: stats.cancelled, color: "text-red-600", bg: "bg-red-50 border-red-100" },
          { label: "إجمالي المبيعات", value: `${stats.totalValue.toLocaleString()} ج.م`, color: "text-blue-600", bg: "bg-blue-50 border-blue-100" }
        ].map((s, i) => (
          <div key={i} className={`${s.bg} border border-slate-100 rounded-[24px] p-4 shadow-sm`}>
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{s.label}</p>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="البحث برقم الطلب، المحل، الطيار، أو العميل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl pr-11 pl-4 py-3 text-xs font-bold outline-none focus:border-blue-400 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-[10px] font-black outline-none cursor-pointer"
            >
              <option value="الكل">جميع الحالات</option>
              <option value="تم التوصيل">تم التوصيل</option>
              <option value="في الطريق">في الطريق</option>
              <option value="تم التعيين">تم التعيين</option>
              <option value="جاري البحث">جاري البحث</option>
              <option value="ملغي">ملغي</option>
            </select>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-[10px] font-black outline-none cursor-pointer"
            >
              <option value="الكل">جميع الأنواع</option>
              <option value="فردي">طلب فردي</option>
              <option value="متعدد">سكة (متعدد)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table/Grid */}
      <div className="bg-white border border-slate-100 rounded-[32px] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">الطلب</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">المحل</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">الطيار</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">العميل</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">القيمة</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">الحالة</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, i) => (
                  <motion.tr 
                    key={order.id_full}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900">#{order.id}</span>
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(order.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center border border-orange-100">
                          <Store className="w-3.5 h-3.5 text-orange-500" />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{order.vendor_full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {order.driver_full_name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-100">
                            <Truck className="w-3.5 h-3.5 text-blue-500" />
                          </div>
                          <span className="text-xs font-bold text-slate-700">{order.driver_full_name}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-slate-300 italic">بانتظار طيار</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-700">
                            {order.customer_details?.customers && order.customer_details.customers.length > 0 
                              ? `سكة (${order.customer_details.customers.length})` 
                              : order.customer_details?.name || "عميل"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-blue-600">{order.financials?.order_value || 0} ج.م</span>
                        <span className="text-[9px] font-bold text-slate-400">توصيل: {order.financials?.delivery_fee || 0} ج.م</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black border ${
                        order.status === 'delivered' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                        order.status === 'cancelled' ? "bg-red-50 text-red-600 border-red-100" :
                        "bg-amber-50 text-amber-600 border-amber-100"
                      }`}>
                        <div className={`w-1 h-1 rounded-full ${
                          order.status === 'delivered' ? "bg-emerald-500" :
                          order.status === 'cancelled' ? "bg-red-500" : "bg-amber-500"
                        }`} />
                        {order.status_label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onEditOrder(order)}
                          className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl border border-slate-100 transition-all"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onDeleteOrder(order.id_full)}
                          className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl border border-slate-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <AlertCircle className="w-12 h-12 mb-3 opacity-20" />
                      <p className="text-sm font-bold">لا توجد طلبات تطابق معايير البحث</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

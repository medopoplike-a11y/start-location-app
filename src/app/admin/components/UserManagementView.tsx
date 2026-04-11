"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Truck, Store, ShieldCheck, Search } from "lucide-react";
import DriversView from "./DriversView";
import VendorsView from "./VendorsView";
import AccountsView from "../AccountsView";
import type { DriverCard, VendorCard, AppUser } from "../types";

interface UserManagementViewProps {
  drivers: DriverCard[];
  vendors: VendorCard[];
  users: AppUser[];
  onAddDriver: () => void;
  onAddVendor: () => void;
  onUpdateVendorBilling?: (vendorId: string, data: any) => Promise<void>;
  onUpdateDriverBilling?: (driverId: string, data: any) => Promise<void>;
  onUpdateUserDetails?: (userId: string, updates: any) => Promise<void>;
  onDeleteUser?: (userId: string, userName: string) => Promise<void>;
  onToggleShiftLock: (driverId: string, currentStatus: boolean) => void;
  onResetUser: (userId: string, userName: string) => void;
}

export default function UserManagementView({
  drivers,
  vendors,
  users,
  onAddDriver,
  onAddVendor,
  onUpdateVendorBilling,
  onUpdateDriverBilling,
  onUpdateUserDetails,
  onDeleteUser,
  onToggleShiftLock,
  onResetUser
}: UserManagementViewProps) {
  const [activeTab, setActiveTab] = useState<"drivers" | "vendors" | "accounts">("drivers");
  const [searchQuery, setSearchQuery] = useState("");

  const tabs = [
    { id: "drivers", label: "المناديب", icon: <Truck className="w-4 h-4" />, count: drivers.length },
    { id: "vendors", label: "المحلات", icon: <Store className="w-4 h-4" />, count: vendors.length },
    { id: "accounts", label: "كل الحسابات", icon: <ShieldCheck className="w-4 h-4" />, count: users.length },
  ];

  const filteredDrivers = drivers.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.id.includes(searchQuery));
  const filteredVendors = vendors.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.id.includes(searchQuery));
  const filteredUsers = users.filter(u => u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">إدارة المستخدمين</h2>
          <p className="text-xs text-slate-400 font-bold mt-0.5">التحكم في المناديب والمحلات والحسابات المسجلة</p>
        </div>
        
        <div className="relative max-w-xs w-full">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن مستخدم أو محل..."
            className="w-full bg-white border border-slate-100 rounded-2xl pr-10 pl-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
      </div>

      <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === tab.id
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-lg text-[9px] ${activeTab === tab.id ? "bg-blue-50 text-blue-600" : "bg-slate-200 text-slate-500"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "drivers" && (
              <DriversView
                drivers={filteredDrivers}
                onAddDriver={onAddDriver}
                onUpdateDriverBilling={onUpdateDriverBilling}
                onUpdateUserDetails={onUpdateUserDetails}
                onDeleteUser={onDeleteUser}
                onToggleShiftLock={onToggleShiftLock}
                onResetUser={onResetUser}
              />
            )}
            {activeTab === "vendors" && (
              <VendorsView
                vendors={filteredVendors}
                onAddVendor={onAddVendor}
                onUpdateVendorBilling={onUpdateVendorBilling}
                onUpdateUserDetails={onUpdateUserDetails}
                onDeleteUser={onDeleteUser}
                onResetUser={onResetUser}
              />
            )}
            {activeTab === "accounts" && (
              <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm">
                <AccountsView users={filteredUsers} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

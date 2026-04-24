"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Truck, 
  Store, 
  ShieldCheck, 
  Search, 
  Wallet, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCcw, 
  Plus, 
  Users
} from "lucide-react";
import DriversView from "./DriversView";
import VendorsView from "./VendorsView";
import WalletsView from "./WalletsView";
import AccountsView from "../AccountsView";
import type { DriverCard, VendorCard, AppUser, WalletRow } from "../types";

interface FleetHubProps {
  drivers: DriverCard[];
  vendors: VendorCard[];
  users: AppUser[];
  wallets: WalletRow[];
  onAddDriver: () => void;
  onAddVendor: () => void;
  onUpdateVendorBilling: (vendorId: string, data: any) => Promise<void>;
  onUpdateDriverBilling: (driverId: string, data: any) => Promise<void>;
  onUpdateUserDetails: (userId: string, updates: any) => Promise<void>;
  onDeleteUser: (userId: string, userName: string) => Promise<void>;
  onToggleShiftLock: (driverId: string, currentStatus: boolean) => void;
  onResetUser: (userId: string, userName: string) => void;
  onRefreshData: () => void;
  onRecalculateWallets: () => Promise<void>;
}

export default function FleetHub({
  drivers,
  vendors,
  users,
  wallets,
  onAddDriver,
  onAddVendor,
  onUpdateVendorBilling,
  onUpdateDriverBilling,
  onUpdateUserDetails,
  onDeleteUser,
  onToggleShiftLock,
  onResetUser,
  onRefreshData,
  onRecalculateWallets
}: FleetHubProps) {
  const [activeTab, setActiveTab] = useState<"drivers" | "vendors" | "wallets" | "accounts">("drivers");
  const [searchQuery, setSearchQuery] = useState("");

  const tabs = [
    { id: "drivers", label: "المناديب", icon: <Truck className="w-4 h-4" />, count: drivers.length },
    { id: "vendors", label: "المحلات", icon: <Store className="w-4 h-4" />, count: vendors.length },
    { id: "wallets", label: "الرقابة المالية", icon: <Wallet className="w-4 h-4" />, count: wallets.length },
    { id: "accounts", label: "إدارة الحسابات", icon: <ShieldCheck className="w-4 h-4" />, count: users.length },
  ];

  const filteredDrivers = drivers.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.id_full.includes(searchQuery));
  const filteredVendors = vendors.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()) || v.id_full.includes(searchQuery));
  const filteredUsers = users.filter(u => u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">إدارة الأسطول والشركاء</h2>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">Fleet & Partner Management Hub</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في المناديب، المحلات، أو البريد الإلكتروني..."
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pr-12 pl-4 py-4 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <button 
            onClick={onRefreshData}
            className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex p-1.5 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800 w-fit shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-black transition-all ${
              activeTab === tab.id
                ? "bg-slate-900 dark:bg-slate-800 text-white shadow-xl"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
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
            {activeTab === "wallets" && (
              <WalletsView 
                users={users} 
                wallets={wallets} 
                onResetUser={onResetUser}
                onRefresh={onRefreshData}
                onRecalculate={onRecalculateWallets}
              />
            )}
            {activeTab === "accounts" && (
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                   <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">قائمة جميع الحسابات</h3>
                      <p className="text-[11px] text-slate-400 font-bold">إدارة الأدمن والمناديب والمحلات في مكان واحد</p>
                   </div>
                   <button onClick={onAddDriver} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
                      <Plus size={16} />
                      إنشاء حساب جديد
                   </button>
                </div>
                <AccountsView users={filteredUsers} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

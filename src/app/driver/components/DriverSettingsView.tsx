"use client";

import { ArrowRight, Loader2, CheckCircle2, Mail, Phone, Lock, User, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface SettingsData {
  name: string;
  phone: string;
  email: string;
  password?: string;
}

interface DriverSettingsViewProps {
  settingsData: SettingsData;
  savingSettings: boolean;
  onBack: () => void;
  onSettingsDataChange: (data: SettingsData) => void;
  onSave: () => void;
}

export default function DriverSettingsView({
  settingsData,
  savingSettings,
  onBack,
  onSettingsDataChange,
  onSave,
}: DriverSettingsViewProps) {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack} 
            disabled={savingSettings} 
            className="bg-white dark:bg-slate-900/50 backdrop-blur-xl p-3 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/50 text-slate-400 dark:text-slate-500 disabled:opacity-60"
          >
            <ArrowRight className="w-5 h-5" />
          </motion.button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">إعدادات الحساب</h2>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">تعديل بياناتك الشخصية وتأمين حسابك</p>
          </div>
        </div>
        <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
          <ShieldCheck className="w-6 h-6 text-emerald-500" />
        </div>
      </div>

      <motion.div 
        variants={itemVariants}
        className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl p-6 rounded-[32px] border border-slate-200/50 dark:border-slate-800/50 space-y-8 shadow-xl shadow-slate-200/20 dark:shadow-none"
      >
        <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800/50">
          <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">بيانات الملف الشخصي</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div variants={itemVariants}>
            <label className="text-xs font-black text-slate-400 dark:text-slate-500 block mb-2.5 mr-1">الاسم بالكامل</label>
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <User className="w-4 h-4 text-slate-400 dark:text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              <input
                type="text"
                disabled={savingSettings}
                value={settingsData.name}
                onChange={(e) => onSettingsDataChange({ ...settingsData, name: e.target.value })}
                placeholder="أدخل اسمك الكامل"
                className="w-full bg-slate-50/50 dark:bg-slate-950/50 pr-12 pl-4 py-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 outline-none focus:ring-2 ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-800 dark:text-slate-200 disabled:opacity-60 transition-all"
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <label className="text-xs font-black text-slate-400 dark:text-slate-500 block mb-2.5 mr-1">رقم الهاتف</label>
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <Phone className="w-4 h-4 text-slate-400 dark:text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              <input
                type="tel"
                disabled={savingSettings}
                value={settingsData.phone}
                onChange={(e) => onSettingsDataChange({ ...settingsData, phone: e.target.value })}
                placeholder="05xxxxxxxx"
                className="w-full bg-slate-50/50 dark:bg-slate-950/50 pr-12 pl-4 py-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 outline-none focus:ring-2 ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-800 dark:text-slate-200 disabled:opacity-60 transition-all"
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <label className="text-xs font-black text-slate-400 dark:text-slate-500 block mb-2.5 mr-1">البريد الإلكتروني</label>
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              <input
                type="email"
                disabled={savingSettings}
                value={settingsData.email}
                onChange={(e) => onSettingsDataChange({ ...settingsData, email: e.target.value })}
                placeholder="example@mail.com"
                className="w-full bg-slate-50/50 dark:bg-slate-950/50 pr-12 pl-4 py-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 outline-none focus:ring-2 ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-800 dark:text-slate-200 disabled:opacity-60 transition-all"
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <label className="text-xs font-black text-slate-400 dark:text-slate-500 block mb-2.5 mr-1">كلمة مرور جديدة</label>
            <div className="relative group">
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              <input
                type="password"
                disabled={savingSettings}
                value={settingsData.password || ""}
                onChange={(e) => onSettingsDataChange({ ...settingsData, password: e.target.value })}
                placeholder="اتركها فارغة إذا لا تريد التغيير"
                className="w-full bg-slate-50/50 dark:bg-slate-950/50 pr-12 pl-4 py-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 outline-none focus:ring-2 ring-emerald-500/20 focus:border-emerald-500 font-bold text-slate-800 dark:text-slate-200 disabled:opacity-60 transition-all"
              />
            </div>
          </motion.div>
        </div>

        <motion.button
          variants={itemVariants}
          whileHover={{ scale: 1.01, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={onSave}
          disabled={savingSettings || !settingsData.name || !settingsData.email}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-5 rounded-[20px] font-black shadow-xl shadow-emerald-500/20 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
        >
          {savingSettings ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> جاري الحفظ...</>
          ) : (
            <><Sparkles className="w-5 h-5" /> حفظ التغييرات</>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}


/**
 * AI Insights Panel - V19.3.0
 * Provides vendors with AI-driven performance analytics and suggestions.
 */
"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, TrendingUp, Clock, AlertCircle, ChevronRight, Loader2 } from "lucide-react";
import { requestAIAnalysis } from "@/lib/api/ai";
import type { Order } from "../types";

interface AIInsightsPanelProps {
  orders: Order[];
  vendorName: string;
}

export default function AIInsightsPanel({ orders, vendorName }: AIInsightsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  const generateInsight = async () => {
    if (loading) return;
    setLoading(true);
    setShowPanel(true);
    try {
      const res = await requestAIAnalysis('vendor_performance', {
        orders: orders.slice(0, 20), // Send last 20 orders for context
        vendorName
      }, 'vendor');
      
      if (res.analysis) {
        setInsight(res.analysis.content);
      } else {
        setInsight("لا توجد بيانات كافية حالياً لتقديم نصائح دقيقة. استمر في تنفيذ الطلبات!");
      }
    } catch (err) {
      setInsight("عذراً، واجهت مشكلة في الاتصال بمحرك الذكاء الاصطناعي. حاول مرة أخرى لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-8">
      {!showPanel ? (
        <motion.button
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.99 }}
          onClick={generateInsight}
          className="w-full p-6 bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl border border-slate-100 dark:border-slate-800/50 rounded-[40px] flex items-center justify-between shadow-2xl shadow-slate-200/20 dark:shadow-none group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-1000" />
          
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-[22px] flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none group-hover:rotate-6 transition-transform">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">المساعد الذكي لـ {vendorName}</p>
              <p className="text-[15px] font-black text-slate-900 dark:text-white leading-tight">احصل على تحليلات النمو</p>
              <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold mt-1">أسرار لزيادة مبيعاتك بنسبة 20%</p>
            </div>
          </div>
          <div className="relative z-10 p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl">
            <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
          </div>
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[40px] border border-slate-100 dark:border-slate-800/50 overflow-hidden shadow-2xl shadow-slate-200/20 dark:shadow-none relative"
        >
          <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">التحليلات الذكية</h3>
                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">AI Engine V2.0</p>
              </div>
            </div>
            <button 
              onClick={() => setShowPanel(false)}
              className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5 rotate-90" />
            </button>
          </div>
          
          <div className="p-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-5">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
                  <Bot className="w-6 h-6 text-indigo-500 absolute inset-0 m-auto animate-pulse" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-black text-slate-900 dark:text-white">جاري معالجة البيانات</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Deep Learning Analysis...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-slate-50/50 dark:bg-slate-950/40 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800/50 shadow-inner">
                  <p className="text-[14px] text-slate-700 dark:text-slate-200 font-bold leading-relaxed whitespace-pre-wrap">
                    {insight}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <motion.div 
                    whileHover={{ y: -4 }}
                    className="p-5 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-[28px] border border-emerald-500/10 flex flex-col gap-2 group/card"
                  >
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 group-hover/card:scale-110 transition-transform">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">معدل النمو</p>
                      <p className="text-[13px] font-black text-emerald-600 dark:text-emerald-400 mt-1">+12.5% <span className="text-[9px] opacity-60">شهرياً</span></p>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ y: -4 }}
                    className="p-5 bg-blue-500/5 dark:bg-blue-500/10 rounded-[28px] border border-blue-500/10 flex flex-col gap-2 group/card"
                  >
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 group-hover/card:scale-110 transition-transform">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">وقت التجهيز</p>
                      <p className="text-[13px] font-black text-blue-600 dark:text-blue-400 mt-1">14 دقيقة <span className="text-[9px] opacity-60">متوسط</span></p>
                    </div>
                  </motion.div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

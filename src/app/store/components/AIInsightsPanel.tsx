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
    <div className="mb-6">
      {!showPanel ? (
        <button
          onClick={generateInsight}
          className="w-full p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[24px] text-white flex items-center justify-between shadow-lg shadow-indigo-100 dark:shadow-none hover:scale-[1.01] active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <p className="text-xs font-black">المساعد الذكي لـ {vendorName}</p>
              <p className="text-[10px] text-white/80 font-bold">احصل على تحليلات وأسرار لزيادة مبيعاتك</p>
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-[28px] border border-indigo-100 dark:border-indigo-900/30 overflow-hidden shadow-xl shadow-indigo-50/50"
        >
          <div className="p-5 border-b border-indigo-50 dark:border-indigo-900/20 flex items-center justify-between bg-indigo-50/30 dark:bg-indigo-900/10">
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5 text-indigo-500" />
              <h3 className="text-sm font-black text-slate-900 dark:text-white">التحليلات الذكية</h3>
            </div>
            <button 
              onClick={() => setShowPanel(false)}
              className="text-[10px] font-black text-indigo-600 hover:text-indigo-700"
            >
              إغلاق
            </button>
          </div>
          
          <div className="p-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-xs font-bold text-slate-400">جاري تحليل بيانات متجرك...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="prose prose-sm dark:prose-invert">
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-bold leading-relaxed whitespace-pre-wrap">
                    {insight}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex flex-col gap-1">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <p className="text-[10px] font-black text-slate-900 dark:text-white">معدل النمو</p>
                    <p className="text-[9px] text-emerald-600 font-bold">+12.5% هذا الشهر</p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex flex-col gap-1">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <p className="text-[10px] font-black text-slate-900 dark:text-white">وقت التجهيز</p>
                    <p className="text-[9px] text-blue-600 font-bold">14 دقيقة في المتوسط</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

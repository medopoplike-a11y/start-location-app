
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Info,
  ArrowRight,
  Database,
  RefreshCw,
  Search,
  Bot
} from "lucide-react";
import { fetchAIInsights, applyAIFix, AIInsight } from "@/lib/api/ai";
import { formatRelativeTime } from "@/lib/utils/format";
import { PremiumCard } from "@/components/PremiumCard";

export default function AIMonitorView() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'applied'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const data = await fetchAIInsights(activeTab === 'pending');
      setInsights(data);
    } catch (e) {
      console.error("AI: Failed to load insights", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [activeTab]);

  const handleApplyFix = async (insight: AIInsight) => {
    if (!confirm("هل أنت متأكد من تطبيق هذا الإصلاح المقترح بواسطة الذكاء الصناعي؟")) return;
    
    try {
      setProcessingId(insight.id);
      await applyAIFix(insight.id, insight.suggested_fix);
      setInsights(prev => prev.filter(i => i.id !== insight.id));
      alert("تم تطبيق الإصلاح بنجاح");
    } catch (e) {
      alert("فشل تطبيق الإصلاح");
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'warning': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-6 p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
            <Bot className="text-purple-500 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">المراقب الذكي (AI Co-pilot)</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">مراجعة وتحليل أداء النظام واكتشاف الأخطاء تلقائياً</p>
          </div>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'pending' ? 'bg-white dark:bg-slate-800 text-purple-600 shadow-sm' : 'text-slate-500'}`}
          >
            بانتظار المراجعة
          </button>
          <button 
            onClick={() => setActiveTab('applied')}
            className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'applied' ? 'bg-white dark:bg-slate-800 text-purple-600 shadow-sm' : 'text-slate-500'}`}
          >
            الإصلاحات المنفذة
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <RefreshCw className="w-10 h-10 animate-spin text-purple-500 mb-4" />
          <p className="text-sm font-black">جاري تحليل البيانات...</p>
        </div>
      ) : insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold">النظام مستقر تماماً</h3>
          <p className="text-sm text-slate-500 max-w-xs mt-2">لم يتم العثور على أي مشكلات تقنية أو تعارضات في البيانات حالياً.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {insights.map((insight) => (
              <motion.div
                key={insight.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group"
              >
                <PremiumCard className="h-full border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex flex-col h-full">
                    {/* Insight Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${getSeverityStyle(insight.severity)}`}>
                          {insight.severity === 'critical' ? 'حرج' : insight.severity === 'warning' ? 'تحذير' : 'معلومة'}
                        </span>
                        <span className="text-[10px] font-black text-slate-400">{formatRelativeTime(insight.created_at)}</span>
                      </div>
                      <div className="text-slate-400 group-hover:text-purple-500 transition-colors">
                        {insight.type === 'error_analysis' && <ShieldAlert size={18} />}
                        {insight.type === 'performance' && <Clock size={18} />}
                        {insight.type === 'fraud_detection' && <AlertTriangle size={18} />}
                        {insight.type === 'data_correction' && <Database size={18} />}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-3">
                      <h3 className="font-black text-slate-900 dark:text-white leading-relaxed">
                        {insight.content}
                      </h3>
                      
                      {insight.raw_data && (
                        <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">البيانات المكتشفة</p>
                          <pre className="text-[11px] font-mono overflow-x-auto whitespace-pre-wrap text-slate-600 dark:text-slate-300">
                            {JSON.stringify(insight.raw_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    {activeTab === 'pending' && insight.suggested_fix && (
                      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                          <Zap size={14} className="animate-pulse" />
                          <span className="text-[10px] font-black">اقتراح إصلاح تلقائي متاح</span>
                        </div>
                        <button 
                          onClick={() => handleApplyFix(insight)}
                          disabled={processingId === insight.id}
                          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[11px] font-black transition-all shadow-lg shadow-purple-500/20 active:scale-95 flex items-center gap-2 disabled:opacity-50"
                        >
                          {processingId === insight.id ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={14} />
                          )}
                          تطبيق الإصلاح المقترح
                        </button>
                      </div>
                    )}

                    {activeTab === 'applied' && (
                      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 size={14} />
                        <span className="text-[10px] font-black italic">تم تنفيذ الإصلاح بنجاح</span>
                      </div>
                    )}
                  </div>
                </PremiumCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

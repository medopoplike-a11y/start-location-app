
"use client";

import { useState, useEffect, useRef } from "react";
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
  Bot,
  Send,
  User,
  MessageSquare,
  Activity,
  Server,
  CloudLightning
} from "lucide-react";
import { fetchAIInsights, applyAIFix, AIInsight, requestAIAnalysis } from "@/lib/api/ai";
import { formatRelativeTime } from "@/lib/utils/format";
import { PremiumCard } from "@/components/PremiumCard";
import { supabase } from "@/lib/supabaseClient";

interface AIMonitorProps {
  stats?: any;
  allOrders?: any[];
  onlineDrivers?: any[];
}

export default function AIMonitorView({ stats, allOrders, onlineDrivers }: AIMonitorProps) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'applied' | 'chat'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Chat States
  const [messages, setMessages] = useState<Array<{role: 'user' | 'ai', content: string, suggested_fix?: any}>>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const loadInsights = async () => {
    if (activeTab === 'chat') return;
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

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      // V1.5.7: Fetch real-time technical logs to provide to Gemini
      const { data: techLogs } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Trigger AI Analysis with 'chat' type and technical context
      const res = await requestAIAnalysis('chat', { 
        message: userMsg,
        techLogs: techLogs || [],
        systemContext: {
          timestamp: new Date().toISOString(),
          stats: stats,
          activeOrdersCount: allOrders?.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length,
          onlineDriversCount: onlineDrivers?.length,
          totalOrdersCount: allOrders?.length,
          dataFlow: "Realtime (Supabase) -> API Layer -> Frontend (Next.js)"
        }
      }, 'admin');

      if (res.analysis) {
        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: res.analysis.content,
          suggested_fix: res.analysis.suggested_fix 
        }]);
      } else {
        throw new Error("No response from AI");
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "عذراً، حدث خطأ أثناء محاولة الاتصال بالذكاء الاصطناعي. يرجى المحاولة لاحقاً." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleChatFix = async (fix: any) => {
    if (!confirm("هل تود من الذكاء الاصطناعي تنفيذ هذا الإصلاح التقني الآن؟")) return;
    
    try {
      setIsTyping(true);
      // Create a temporary insight record for the chat fix or call a direct fix RPC
      // For simplicity, we'll use a special RPC or a virtual ID
      const { data, error } = await supabase.rpc('apply_ai_fix_direct', { 
        p_fix_data: fix,
        p_type: 'chat'
      });
      
      if (error) throw error;
      
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: `✅ تم تنفيذ الإصلاح بنجاح: ${data.status || 'تمت العملية'}` 
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: "❌ فشل تنفيذ الإصلاح التقني. يرجى مراجعة السجلات." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

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
          <button 
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${activeTab === 'chat' ? 'bg-white dark:bg-slate-800 text-purple-600 shadow-sm' : 'text-slate-500'}`}
          >
            تحدث مع جمناي
          </button>
        </div>
      </div>

      {activeTab === 'chat' ? (
        <div className="flex flex-col h-[600px] drawer-glass rounded-[32px] overflow-hidden border border-purple-500/10">
          {/* Chat Header */}
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Bot className="text-white w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black">جمناي (AI Assistant)</h3>
                <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  متصل ومستعد للمساعدة
                </p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 dark:bg-slate-950/30"
          >
            {/* Quick Tech Actions */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button 
                onClick={() => { setInput("حلل لي الحالة التقنية للنظام الآن"); handleSendMessage(); }}
                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 rounded-full text-[10px] font-black border border-blue-500/20 flex items-center gap-2 transition-all"
              >
                <Activity size={12} />
                فحص تقني شامل
              </button>
              <button 
                onClick={() => { setInput("كيف تسري البيانات بين الطيار والمطعم والإدارة؟"); handleSendMessage(); }}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 rounded-full text-[10px] font-black border border-emerald-500/20 flex items-center gap-2 transition-all"
              >
                <CloudLightning size={12} />
                تتبع سريان البيانات
              </button>
              <button 
                onClick={() => { setInput("هل هناك أي أعطال مسجلة في السجلات التقنية؟"); handleSendMessage(); }}
                className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 rounded-full text-[10px] font-black border border-amber-500/20 flex items-center gap-2 transition-all"
              >
                <Server size={12} />
                كشف الأعطال
              </button>
            </div>

            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10, x: msg.role === 'user' ? -20 : 20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[80%] flex gap-3 ${msg.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm font-bold leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-tr-none shadow-sm' 
                      : 'bg-purple-600 text-white rounded-tl-none shadow-lg shadow-purple-500/10'
                  }`}>
                    {msg.content}
                    
                    {msg.suggested_fix && (
                      <div className="mt-4 pt-4 border-t border-white/20">
                        <p className="text-[10px] mb-2 opacity-80 flex items-center gap-1">
                          <Zap size={10} />
                          إصلاح تقني مقترح من جمناي
                        </p>
                        <button
                          onClick={() => handleChatFix(msg.suggested_fix)}
                          className="w-full py-2 bg-white text-purple-600 rounded-xl text-[10px] font-black hover:bg-slate-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <CloudLightning size={14} />
                          تنفيذ الإصلاح الآن
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-2xl rounded-tl-none flex gap-2 items-center">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اسأل جمناي عن أي شيء في النظام..."
                className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="w-12 h-12 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex-shrink-0"
              >
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      ) : loading ? (
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

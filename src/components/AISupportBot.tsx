"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { requestAIAnalysis } from "@/lib/api/ai";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AISupportBotProps {
  role: 'driver' | 'vendor' | 'admin';
  context?: any;
}

export default function AISupportBot({ role, context }: AISupportBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: role === 'driver' 
        ? 'أهلاً بك يا بطل! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم في رحلتك؟'
        : role === 'vendor'
        ? 'مرحباً بك! أنا شريكك الذكي للنجاح. هل لديك أي استفسار حول طلباتك أو أداء متجرك؟'
        : 'مرحباً بك أيها المدير. أنا مستشارك التقني. كيف يمكنني مساعدتك في إدارة النظام اليوم؟',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await requestAIAnalysis('support_bot', {
        message: input,
        context: context || {},
        history: messages.slice(-5).map(m => ({ role: m.role, content: m.content }))
      }, role);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.analysis?.content || "عذراً، لم أستطع فهم ذلك بشكل جيد. هل يمكنك المحاولة مرة أخرى؟",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: 'error',
        role: 'assistant',
        content: "عذراً، واجهت مشكلة في الاتصال بالدماغ الذكي. يرجى المحاولة لاحقاً.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl z-50 border-4 border-white dark:border-slate-800"
      >
        <Bot className="w-6 h-6" />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800"
        />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-[90vw] md:w-[400px] h-[500px] bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl z-50 flex flex-col border border-slate-100 dark:border-slate-800 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black">مساعد ستارت الذكي</h3>
                  <p className="text-[10px] opacity-80 font-bold">Smart Assistant (v2.0)</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/50"
            >
              {messages.map((m) => (
                <div 
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-bold shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-tl-none border border-slate-100 dark:border-slate-800'
                      : 'bg-indigo-600 text-white rounded-tr-none'
                  }`}>
                    {m.content}
                    <p className={`text-[9px] mt-1 opacity-60 ${m.role === 'user' ? 'text-slate-400' : 'text-indigo-200'}`}>
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-end">
                  <div className="bg-indigo-600/10 text-indigo-600 p-4 rounded-2xl rounded-tr-none">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="اسألني أي شيء..."
                  className="flex-1 bg-transparent border-none outline-none text-sm px-2 py-1 font-bold text-slate-800 dark:text-white"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-center text-[8px] text-slate-400 mt-2 font-black uppercase tracking-tighter">
                Powered by Gemini AI Engine
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

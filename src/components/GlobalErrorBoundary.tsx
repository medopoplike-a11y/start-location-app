"use client";

import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("GlobalErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center transition-colors duration-500" dir="rtl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900/50 backdrop-blur-3xl p-10 rounded-[48px] border border-slate-200 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none max-w-md w-full"
          >
            <div className="w-20 h-20 bg-red-500/10 rounded-[24px] flex items-center justify-center mb-8 mx-auto">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
              {this.props.title || "عذراً، حدث خطأ غير متوقع"}
            </h1>
            
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-10 leading-relaxed font-medium">
              {this.props.description || "واجه النظام مشكلة تقنية مفاجئة. تم عزل الخطأ لضمان استقرار التطبيق."}
            </p>
            
            <button 
              onClick={this.handleReset}
              className="w-full bg-slate-900 dark:bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-slate-900/20 dark:shadow-blue-900/20 active:scale-95 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
            >
              <RefreshCw className="w-5 h-5" />
              إعادة محاولة التشغيل
            </button>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/10 rounded-xl text-left overflow-auto max-h-32 text-[10px] font-mono text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/20">
                {this.state.error.toString()}
              </div>
            )}
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

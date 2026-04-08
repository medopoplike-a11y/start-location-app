"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Maximize2 } from "lucide-react";
import { useBackButton } from "@/hooks/useBackButton";
import { Capacitor } from "@capacitor/core";

interface ImagePreviewModalProps {
  url: string | null;
  show: boolean;
  onClose: () => void;
}

export default function ImagePreviewModal({ url, show, onClose }: ImagePreviewModalProps) {
  // Use hardware back button to close the modal
  useBackButton(onClose, show);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url) return;

    if (Capacitor.isNativePlatform()) {
      e.preventDefault();
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url });
      } catch (err) {
        window.open(url, '_blank');
      }
    }
  };

  return (
    <AnimatePresence>
      {show && url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/98 z-[200] flex flex-col touch-none select-none"
          onClick={onClose}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 relative z-50 safe-top">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/5">
                <Maximize2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-black text-sm tracking-tight">معاينة الفاتورة</h3>
                <p className="text-white/40 text-[9px] font-bold">اضغط في أي مكان أو على زر الإغلاق للعودة</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <a 
                href={url} 
                download 
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleDownload}
                className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white active:scale-90 transition-all border border-white/5"
              >
                <Download className="w-6 h-6" />
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="w-12 h-12 bg-red-500/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-white active:scale-90 transition-all border border-red-400/20 shadow-lg shadow-red-900/20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden relative pointer-events-none"
          >
            <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
              <img
                src={url}
                alt="Invoice Preview"
                loading="lazy"
                decoding="async"
                className="max-w-full max-h-full w-auto h-auto object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 pointer-events-auto"
                style={{ 
                  maxWidth: '95vw', 
                  maxHeight: 'calc(100vh - 200px)',
                  display: 'block',
                  margin: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </motion.div>

          {/* Footer Hint */}
          <div className="p-8 text-center pb-safe">
            <div className="inline-block px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/5">
              <p className="text-white/20 text-[9px] font-black tracking-[0.2em] uppercase">Start Location Delivery</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

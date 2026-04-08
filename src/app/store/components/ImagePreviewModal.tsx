"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2 } from "lucide-react";
import { useBackButton } from "@/hooks/useBackButton";
import { Capacitor } from "@capacitor/core";

interface ImagePreviewModalProps {
  url: string | null;
  show: boolean;
  onClose: () => void;
}

export default function ImagePreviewModal({ url, show, onClose }: ImagePreviewModalProps) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(url);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (url) {
      setDisplayUrl(url);
      setIsClosing(false);
    }
  }, [url]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    onClose();
  };

  // Use hardware back button to close the modal
  useBackButton(handleClose, show);

  return (
    <AnimatePresence onExitComplete={() => setIsClosing(false)}>
      {show && displayUrl && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/98 z-[200] flex flex-col touch-none select-none"
          onClick={handleClose}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 relative z-50 safe-top">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/5">
                <Maximize2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-black text-sm tracking-tight">معاينة الفاتورة</h3>
                <p className="text-white/40 text-[9px] font-bold">اضغط في أي مكان للعودة</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="w-12 h-12 bg-red-500/80 backdrop-blur-md rounded-2xl flex items-center justify-center text-white active:scale-90 transition-all border border-red-400/20 shadow-lg shadow-red-900/20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex items-center justify-center p-4 overflow-hidden relative"
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={displayUrl}
                alt="Invoice Preview"
                className="max-w-full max-h-full w-auto h-auto object-contain rounded-2xl shadow-2xl border border-white/10"
                style={{ 
                  maxHeight: 'calc(100vh - 180px)',
                  maxWidth: '100vw',
                  display: 'block',
                  margin: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </motion.div>

          {/* Footer Hint */}
          <div className="p-8 text-center pb-safe">
            <p className="text-white/10 text-[8px] font-black tracking-[0.3em] uppercase">Start Location Delivery</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

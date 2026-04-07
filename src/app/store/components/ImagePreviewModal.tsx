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

  if (!url) return null;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url) return;

    if (Capacitor.isNativePlatform()) {
      e.preventDefault();
      // On native, we should probably use Browser plugin or Share plugin instead of direct download
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
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/95 z-[200] flex flex-col"
          onClick={onClose}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center">
                <Maximize2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">معاينة الفاتورة</h3>
                <p className="text-white/40 text-[10px]">اضغط في أي مكان للعودة</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <a 
                href={url} 
                download 
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleDownload}
                className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white active:scale-95 transition-all"
              >
                <Download className="w-6 h-6" />
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white active:scale-95 transition-all"
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
            className="flex-1 flex items-center justify-center p-4"
          >
            <img
              src={url}
              alt="Invoice Preview"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>

          {/* Footer Hint */}
          <div className="p-10 text-center">
            <p className="text-white/20 text-[10px] font-bold tracking-widest uppercase">Start Location Delivery</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

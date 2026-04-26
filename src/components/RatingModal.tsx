"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, MessageSquare, Send, Loader2, Award } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  title: string;
  subtitle: string;
  targetName: string;
}

export default function RatingModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  subtitle,
  targetName,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [hoveredRating, setHoveredRating] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleStarClick = async (val: number) => {
    setRating(val);
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {}
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      await onSubmit(rating, comment);
      onClose();
    } catch (error) {
      console.error("Failed to submit rating:", error);
    } finally {
      setLoading(false);
    }
  };

  const ratingLabels: Record<number, string> = {
    1: "سيء جداً",
    2: "سيء",
    3: "جيد",
    4: "جيد جداً",
    5: "ممتاز رائع",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-sm glass-panel p-8 shadow-2xl border-white/10"
          >
            <button
              onClick={onClose}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-blue-600/10 rounded-3xl flex items-center justify-center text-blue-500 shadow-inner">
                <Award size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-white">{title}</h3>
                <p className="text-sm text-slate-400 font-bold">{subtitle} <span className="text-blue-400">{targetName}</span></p>
              </div>

              {/* Stars */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => handleStarClick(star)}
                      className="p-1"
                    >
                      <Star
                        size={36}
                        className={`transition-all duration-300 ${
                          (hoveredRating || rating) >= star
                            ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                            : "text-slate-700"
                        }`}
                      />
                    </motion.button>
                  ))}
                </div>
                <AnimatePresence mode="wait">
                  {(hoveredRating || rating) > 0 && (
                    <motion.p
                      key={hoveredRating || rating}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="text-xs font-black text-amber-400 uppercase tracking-widest"
                    >
                      {ratingLabels[hoveredRating || rating]}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Comment Input */}
              <div className="w-full space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <MessageSquare size={14} className="text-slate-500" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">أضف تعليقاً (اختياري)</span>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="كيف كانت تجربتك؟"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-slate-600 outline-none focus:border-blue-500/40 transition-all resize-none h-24"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={rating === 0 || loading}
                className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-sm font-black transition-all shadow-xl ${
                  rating > 0 
                    ? "bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-500" 
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={18} />}
                {loading ? "جاري الإرسال..." : "إرسال التقييم"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

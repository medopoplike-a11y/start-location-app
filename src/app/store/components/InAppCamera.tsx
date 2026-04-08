"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, RefreshCcw, Check, Loader2 } from "lucide-react";
import { useBackButton } from "@/hooks/useBackButton";

interface InAppCameraProps {
  show: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
}

export default function InAppCamera({ show, onClose, onCapture }: InAppCameraProps) {
  useBackButton(onClose, show);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startCamera = async () => {
    stopStream();
    setError(null);
    setIsStarting(true);
    try {
      const constraints = {
        video: {
          facingMode: isFrontCamera ? "user" : "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("الكاميرا غير مدعومة في هذا المتصفح.");
      }

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError(err.message || "لا يمكن الوصول للكاميرا. تأكد من إعطاء الصلاحيات.");
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (show && !capturedImage) {
      startCamera();
    }
    return () => stopStream();
  }, [show, isFrontCamera, capturedImage]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(dataUrl);
        stopStream();
      }
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          onCapture(blob);
          handleClose();
        });
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleClose = () => {
    stopStream();
    setCapturedImage(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black z-[100] flex flex-col"
        >
          <div className="relative flex-1 flex items-center justify-center overflow-hidden">
            {capturedImage ? (
              <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {isStarting && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 text-white animate-spin mb-4" />
                    <p className="text-white text-sm font-bold">جاري تشغيل الكاميرا...</p>
                  </div>
                )}
                {error && (
                  <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                    <p className="text-white bg-red-500/80 p-4 rounded-2xl">{error}</p>
                  </div>
                )}
              </>
            )}

            {/* Controls Overlay */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
              <button
                onClick={handleClose}
                className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white"
              >
                <X className="w-6 h-6" />
              </button>
              {!capturedImage && (
                <button
                  onClick={() => setIsFrontCamera(!isFrontCamera)}
                  className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white"
                >
                  <RefreshCcw className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-8">
              {!capturedImage ? (
                <button
                  onClick={handleCapture}
                  disabled={isStarting || !!error}
                  className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center group ${isStarting || error ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <div className="w-16 h-16 bg-white rounded-full group-active:scale-90 transition-transform" />
                </button>
              ) : (
                <>
                  <button
                    onClick={handleRetake}
                    className="bg-white/20 backdrop-blur-md p-5 rounded-full text-white flex flex-col items-center gap-2"
                  >
                    <RefreshCcw className="w-6 h-6" />
                    <span className="text-[10px] font-bold">إعادة</span>
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="bg-green-500 p-6 rounded-full text-white shadow-xl shadow-green-500/40 flex flex-col items-center gap-2"
                  >
                    <Check className="w-8 h-8" />
                    <span className="text-xs font-black">اعتماد</span>
                  </button>
                </>
              )}
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

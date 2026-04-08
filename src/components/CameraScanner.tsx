"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, RefreshCw, Check } from "lucide-react";
import { Capacitor } from "@capacitor/core";

interface CameraScannerProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
  title?: string;
}

export default function CameraScanner({ onCapture, onClose, title = "تصوير الفاتورة" }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    stopCamera();
    setError(null);
    try {
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      } else {
        // Cleanup if component unmounted while requesting
        mediaStream.getTracks().forEach(t => t.stop());
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("تعذر الوصول للكاميرا داخلياً. تأكد من إعطاء الأذونات.");
    }
  };

  const stopCamera = () => {
    // 1. Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    // 2. Stop all tracks immediately
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log("CameraScanner: Track stopped", track.label);
      });
      setStream(null);
    }

    // 3. Global cleanup just in case of leaks
    if (typeof navigator !== 'undefined' && (navigator as any).mediaDevices?.getUserMedia) {
      // Some browsers need a bit of help cleaning up
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Use actual video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Clear any previous transformations
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // JPEG quality 0.9 for high quality natural look
      const base64 = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage(base64);
      stopCamera();
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      setIsCapturing(true);
      onCapture(capturedImage.split(',')[1]);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-[200] flex flex-col items-center justify-center"
    >
      {/* Header */}
      <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white">
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-white font-black text-xs opacity-80">{title}</h3>
        <div className="w-10" />
      </div>

      {/* Viewport */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black">
        {capturedImage ? (
          <img src={capturedImage} className="w-full h-full object-contain" alt="Captured" />
        ) : error ? (
          <div className="p-8 text-center space-y-4">
            <p className="text-white font-bold">{error}</p>
            <button onClick={startCamera} className="bg-white text-black px-6 py-2 rounded-full font-black text-xs">إعادة المحاولة</button>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-contain"
          />
        )}
      </div>

      {/* Footer Controls */}
      <div className="absolute bottom-0 inset-x-0 p-10 flex justify-center items-center z-10 bg-gradient-to-t from-black/60 to-transparent">
        {!capturedImage ? (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={capturePhoto}
            disabled={!stream}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1"
          >
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
              <Camera className="w-8 h-8 text-black" />
            </div>
          </motion.button>
        ) : (
          <div className="flex items-center gap-10">
            <button 
              onClick={() => setCapturedImage(null)}
              className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex flex-col items-center justify-center text-white border border-white/20"
            >
              <RefreshCw className="w-6 h-6" />
              <span className="text-[10px] font-bold mt-1">إعادة</span>
            </button>
            
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleConfirm}
              disabled={isCapturing}
              className="w-24 h-24 rounded-full bg-emerald-500 flex flex-col items-center justify-center text-white shadow-2xl shadow-emerald-500/40 border-4 border-emerald-400"
            >
              {isCapturing ? (
                <RefreshCw className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <Check className="w-10 h-10" />
                  <span className="text-xs font-black">اعتماد</span>
                </>
              )}
            </motion.button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </motion.div>
  );
}

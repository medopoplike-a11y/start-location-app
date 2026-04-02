"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Truck, MapPin, Shield, Smartphone, Users } from "lucide-react";
import ParticlesBackground from "@/components/ParticlesBackground";
import { StartLogo } from "@/components/StartLogo";

export default function LandingPage() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900/20 to-blue-900/20">
      <ParticlesBackground theme="neon-purple" />
      
      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-32 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-xl rounded-3xl px-6 py-3 border border-white/20 neon-glow mb-8">
            <Shield className="w-5 h-5" />
            <span className="text-sm font-bold uppercase tracking-wider">نظام موثوق 100% للتوصيل الذكي</span>
          </div>
          
          <div className="mb-8">
            <StartLogo className="w-32 h-32 mx-auto mb-8 drop-shadow-2xl neon-glow" />
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black bg-gradient-to-r from-white via-cyan-200/80 to-blue-200/80 bg-clip-text text-transparent mb-8 leading-tight">
            Start Location
          </h1>
          
          <p className="text-xl md:text-2xl lg:text-3xl text-cyan-100/90 max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
            أسرع نظام توصيل في الشرق الأوسط مع تتبع حي مباشر، 
            حسابات ذكية، وتأمين شامل للطيارين والمحلات
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-6 justify-center items-center max-w-4xl mx-auto"
        >
          <Link 
            href="/driver" 
            className="group flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black py-6 px-10 rounded-3xl text-lg neon-glow hover:neon-glow hover:scale-105 transition-all duration-300 shadow-2xl flex items-center justify-center gap-3"
          >
            <Truck className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            لوحة الطيار
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </Link>
          
          <Link 
            href="/vendor" 
            className="group flex-1 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black py-6 px-10 rounded-3xl text-lg neon-glow-orange hover:scale-105 transition-all duration-300 shadow-2xl flex items-center justify-center gap-3"
          >
            <MapPin className="w-6 h-6 group-hover:scale-110 transition-transform" />
            لوحة المحل
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
        >
          <div className="group bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:bg-white/10 neon-glow hover:scale-105 transition-all duration-500 hover:neon-glow cursor-pointer">
            <div className="w-20 h-20 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center mb-6 mx-auto neon-glow group-hover:rotate-6 transition-all">
              <Smartphone className="w-10 h-10 text-black" />
            </div>
            <h3 className="text-2xl font-black text-white mb-4">تطبيق موبايل متكامل</h3>
            <p className="text-cyan-100/80 text-lg leading-relaxed">Android/iOS مع GPS حي، إشعارات فورية، وتحديثات OTA</p>
          </div>

          <div className="group bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:bg-white/10 neon-glow hover:scale-105 transition-all duration-500 hover:neon-glow cursor-pointer">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mb-6 mx-auto neon-glow group-hover:rotate-6 transition-all">
              <Shield className="w-10 h-10 text-black" />
            </div>
            <h3 className="text-2xl font-black text-white mb-4">تأمين شامل</h3>
            <p className="text-cyan-100/80 text-lg leading-relaxed">صندوق تأمين للطيارين + المحلات، حسابات شفافة، تسويات فورية</p>
          </div>

          <div className="group bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 hover:bg-white/10 neon-glow hover:scale-105 transition-all duration-500 hover:neon-glow cursor-pointer">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mb-6 mx-auto neon-glow group-hover:rotate-6 transition-all">
              <Users className="w-10 h-10 text-black" />
            </div>
            <h3 className="text-2xl font-black text-white mb-4">لوحة تحكم متقدمة</h3>
            <p className="text-cyan-100/80 text-lg leading-relaxed">مراقبة حية، إدارة المناديب، تقارير مالية، إعدادات النظام</p>
          </div>
        </motion.div>
      </section>
    </main>
  );
}

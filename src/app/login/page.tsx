"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ShieldCheck, Truck, Store, Settings, ArrowRight, Zap, Fingerprint } from "lucide-react";
import { signIn, getUserProfile } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { StartLogo } from "@/components/StartLogo";
import LocationMarker from "@/components/LocationMarker";

type LoginRole = "driver" | "vendor" | "admin";

const DataNode = ({ index }: { index: number }) => {
  const randomX = Math.random() * 100;
  const randomY = Math.random() * 100;
  const randomDelay = Math.random() * 5;
  const randomDuration = 10 + Math.random() * 20;

  return (
    <motion.div
      initial={{ x: `${randomX}%`, y: `${randomY}%`, opacity: 0 }}
      animate={{ 
        x: [`${randomX}%`, `${(randomX + 10) % 100}%`, `${randomX}%`],
        y: [`${randomY}%`, `${(randomY + 10) % 100}%`, `${randomY}%`],
        opacity: [0, 0.2, 0] 
      }}
      transition={{ 
        duration: randomDuration, 
        repeat: Infinity, 
        delay: randomDelay,
        ease: "easeInOut" 
      }}
      className="absolute w-1 h-1 bg-blue-400 rounded-full blur-[1px]"
    />
  );
};

export default function LoginPage() {
  const [role, setRole] = useState<LoginRole>("driver");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await getUserProfile(session.user.id);
        if (profile) redirectUserByRole(profile.role);
      }
    };
    checkUser();
  }, []);

  const redirectUserByRole = (role: string) => {
    const normalizedRole = role?.toLowerCase();
    if (normalizedRole === "admin") router.replace("/admin");
    else if (normalizedRole === "driver") router.replace("/driver");
    else if (normalizedRole === "vendor") router.replace("/vendor");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message.includes("Invalid login credentials") 
        ? "خطأ في البريد الإلكتروني أو كلمة المرور" 
        : signInError.message);
    } else if (data?.user) {
      if (data.user.email === 'medopoplike@gmail.com') {
        redirectUserByRole('admin');
      } else {
        const profile = await getUserProfile(data.user.id);
        if (profile?.role) {
          if (profile.role.toLowerCase() !== role) {
            setError(`هذا الحساب مخصص لـ ${profile.role} فقط`);
            setLoading(false);
            return;
          }
          redirectUserByRole(profile.role);
        } else {
          setError("لم يتم تحديد صلاحيات لهذا الحساب");
        }
      }
    }
    setLoading(false);
  };

  const roleConfigs = {
    driver: { 
      title: "طيار", 
      icon: <Truck size={20} />, 
      color: "#FF0000", 
      shadow: "shadow-red-500/30",
      accent: "bg-red-500/20",
      glow: "from-red-500/10 to-transparent"
    },
    vendor: { 
      title: "محل", 
      icon: <Store size={20} />, 
      color: "#FF8C00", 
      shadow: "shadow-orange-500/30",
      accent: "bg-orange-500/20",
      glow: "from-orange-500/10 to-transparent"
    },
    admin: { 
      title: "إدارة", 
      icon: <Settings size={20} />, 
      color: "#4B5563", 
      shadow: "shadow-gray-500/30",
      accent: "bg-gray-500/20",
      glow: "from-gray-500/10 to-transparent"
    }
  };

  return (
    <main className="min-h-screen bg-[#000814] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden" dir="rtl">
      {/* Dynamic Futuristic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Animated Digital Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        {/* Data Nodes Background */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <DataNode key={i} index={i} />
          ))}
        </div>

        {/* Role-Based Dynamic Glows */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={role}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 1.5 }}
            className={`absolute inset-0 bg-[radial-gradient(circle_1000px_at_50%_50%,${roleConfigs[role].color}15,transparent)]`}
          />
        </AnimatePresence>
        
        {/* Constant Center Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_600px_at_50%_50%,#0047FF05,transparent)]" />
      </div>

      {/* Brand Header with Enhanced Glow */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex flex-col items-center mb-10"
      >
        <div className="relative">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 blur-3xl rounded-full"
            style={{ backgroundColor: roleConfigs[role].color }}
          />
          <StartLogo className="w-24 h-24 mb-4 relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tighter mt-2 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
          Start Location
        </h1>
        <div className="flex items-center gap-2 mt-2 opacity-30">
          <div className="w-8 h-px bg-white/50" />
          <p className="text-[9px] font-black tracking-[0.4em] uppercase text-white whitespace-nowrap">Secure OS Interface</p>
          <div className="w-8 h-px bg-white/50" />
        </div>
      </motion.div>

      {/* Main Glassmorphic Terminal Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[440px] bg-white/5 backdrop-blur-3xl rounded-[40px] shadow-[0_50px_100px_rgba(0,0,0,0.7)] border border-white/10 overflow-hidden relative z-10"
      >
        {/* Terminal Header Decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        {/* Scanning Line Animation */}
        <motion.div 
          animate={{ top: ["-10%", "110%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent pointer-events-none z-0"
        />

        {/* Role Selector with Advanced Interaction */}
        <div className="p-4 bg-black/30 flex gap-2 border-b border-white/5 relative z-10">
          {(["driver", "vendor", "admin"] as const).map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setError(""); }}
              className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-[24px] transition-all relative group overflow-hidden ${
                role === r ? "text-white" : "text-white/30 hover:bg-white/5 hover:text-white/50"
              }`}
            >
              {role === r && (
                <>
                  <motion.div 
                    layoutId="activeRoleGlow"
                    className={`absolute inset-0 opacity-20 bg-gradient-to-b ${roleConfigs[r].glow}`}
                  />
                  <motion.div 
                    layoutId="activeRoleBorder"
                    className="absolute inset-0 border border-white/10 rounded-[24px]"
                  />
                </>
              )}
              <div className={`transition-all duration-300 ${role === r ? "scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" : ""}`}>
                {roleConfigs[r].icon}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest relative z-10">{roleConfigs[r].title}</span>
              
              {role === r && (
                <motion.div 
                  layoutId="activeIndicator"
                  className="absolute bottom-0 w-8 h-0.5 rounded-full"
                  style={{ backgroundColor: roleConfigs[r].color }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Form Body with High-Tech Inputs */}
        <div className="p-8 md:p-10 relative z-10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2 group">
              <div className="flex justify-between items-center px-2">
                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">User Identity</label>
                <motion.div 
                  animate={{ opacity: focusedField === "email" ? 1 : 0 }}
                  className="text-[9px] font-bold text-blue-400 uppercase flex items-center gap-1"
                >
                  <Zap size={8} className="fill-current" /> Awaiting Input
                </motion.div>
              </div>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@start-location.com"
                  className={`w-full bg-black/40 p-5 rounded-[24px] outline-none border-2 transition-all text-sm font-bold text-white placeholder:text-white/10 ${
                    focusedField === "email" ? "border-white/20 bg-black/60 shadow-[0_0_20px_rgba(255,255,255,0.05)]" : "border-transparent"
                  }`}
                />
                <Mail className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focusedField === "email" ? "text-white" : "text-white/10"}`} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Access Code</label>
                <motion.div 
                  animate={{ opacity: focusedField === "password" ? 1 : 0 }}
                  className="text-[9px] font-bold text-blue-400 uppercase flex items-center gap-1"
                >
                  <Fingerprint size={8} /> Biometric Bypass
                </motion.div>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full bg-black/40 p-5 rounded-[24px] outline-none border-2 transition-all text-sm font-bold text-white placeholder:text-white/10 ${
                    focusedField === "password" ? "border-white/20 bg-black/60 shadow-[0_0_20px_rgba(255,255,255,0.05)]" : "border-transparent"
                  }`}
                />
                <Lock className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${focusedField === "password" ? "text-white" : "text-white/10"}`} />
              </div>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-red-500/10 text-red-400 p-4 rounded-[20px] text-[10px] font-bold border border-red-500/20 flex items-center gap-3 backdrop-blur-md"
                >
                  <div className="w-1 h-1 bg-red-500 rounded-full animate-ping" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-3 mt-4 group relative overflow-hidden"
            >
              <div className="absolute inset-0 transition-colors duration-500" style={{ backgroundColor: roleConfigs[role].color }} />
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.2),transparent)]" />
              
              <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Execute Access Protocol</span>
                    <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </span>
            </button>
          </form>
        </div>

        {/* Card Footer Decoration */}
        <div className="p-4 bg-white/[0.02] border-t border-white/5 flex justify-center">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-white/10" />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Futuristic Status Footer */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-10 flex items-center gap-4 px-6 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-md"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={12} className="text-blue-400" />
          <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em]">Encrypted Node</span>
        </div>
        <div className="w-px h-3 bg-white/10" />
        <div className="flex items-center gap-2">
          <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
          <span className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em]">Live Status: Active</span>
        </div>
      </motion.div>

      {/* Interactive Floating Marker Decoration */}
      <div className="fixed bottom-10 right-10 opacity-20 hover:opacity-100 transition-opacity cursor-help">
        <LocationMarker size={32} color={roleConfigs[role].color} />
      </div>
    </main>
  );
}


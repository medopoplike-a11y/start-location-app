"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ShieldCheck, Truck, Store, Settings, ArrowRight, Zap, Fingerprint, Wifi, MapPin as Pin, Activity } from "lucide-react";
import { signIn, getUserProfile } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { StartLogo } from "@/components/StartLogo";
import LocationMarker from "@/components/LocationMarker";
import { useAuth } from "@/components/AuthProvider";

type LoginRole = "driver" | "vendor" | "admin";

const DataNode = ({ index }: { index: number }) => {
  const [mounted, setMounted] = useState(false);
  const [config] = useState(() => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 10 + Math.random() * 20
  }));

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <motion.div
      initial={{ x: `${config.x}%`, y: `${config.y}%`, opacity: 0 }}
      animate={{ 
        x: [`${config.x}%`, `${(config.x + 10) % 100}%`, `${config.x}%`],
        y: [`${config.y}%`, `${(config.y + 10) % 100}%`, `${config.y}%`],
        opacity: [0, 0.2, 0] 
      }}
      transition={{ 
        duration: config.duration, 
        repeat: Infinity, 
        delay: config.delay,
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
  const [systemStatus, setSystemStatus] = useState({ gps: "detecting", net: "online", battery: "100%" });
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Check sensors on load
    if (typeof window !== "undefined") {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(() => setSystemStatus(prev => ({...prev, gps: "active"})), () => setSystemStatus(prev => ({...prev, gps: "restricted"})));
      }
      setSystemStatus(prev => ({...prev, net: navigator.onLine ? "active" : "offline"}));
    }
  }, []);

  const redirectUserByRole = (role: string) => {
    const normalizedRole = role?.toLowerCase();
    console.log("LoginPage: Attempting redirect to role:", normalizedRole);
    
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
      setLoading(false);
    } else if (data?.user) {
      console.log("LoginPage: Login successful for user", data.user.id);
      
      // Let's handle redirect manually here to ensure it works
      try {
        const profile = await getUserProfile(data.user.id);
        console.log("LoginPage: Profile found:", profile);
        
        if (profile?.role) {
          if (profile.role.toLowerCase() !== role) {
            setError(`هذا الحساب مخصص لـ ${profile.role} فقط`);
            setLoading(false);
            return;
          }
          redirectUserByRole(profile.role);
        } else {
          // Special case for admin
          if (data.user.email === 'medopoplike@gmail.com') {
            redirectUserByRole('admin');
          } else {
            setError("لم يتم تحديد صلاحيات لهذا الحساب");
            setLoading(false);
          }
        }
      } catch (err) {
        console.error("LoginPage: Profile fetch error", err);
        setError("فشل تحميل بيانات المستخدم");
        setLoading(false);
      }
    }
  };

  const roleConfigs = {
    driver: { 
      title: "نظام الطيار", 
      label: "DRIVER OS",
      icon: <Truck size={24} />, 
      color: "#ef4444", 
      shadow: "shadow-brand-secondary/20",
      accent: "bg-brand-secondary",
      glow: "from-brand-secondary/20 to-transparent"
    },
    vendor: { 
      title: "نظام المحل", 
      label: "VENDOR OS",
      icon: <Store size={24} />, 
      color: "#f59e0b", 
      shadow: "shadow-brand-warning/20",
      accent: "bg-brand-warning",
      glow: "from-brand-warning/20 to-transparent"
    },
    admin: { 
      title: "لوحة التحكم", 
      label: "CORE ADMIN",
      icon: <Settings size={24} />, 
      color: "#3b82f6", 
      shadow: "shadow-brand-primary/20",
      accent: "bg-brand-primary",
      glow: "from-brand-primary/20 to-transparent"
    }
  };

  if (!mounted) return <div className="min-h-screen bg-brand-dark" />;

  return (
    <main className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden selection:bg-white/20" dir="rtl">
      {/* Background Architecture */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Dynamic Nodes */}
        {[...Array(20)].map((_, i) => (
          <DataNode key={i} index={i} />
        ))}
        
        {/* Subtle Vector Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#00000005_1px,transparent_1px)] [background-size:32px_32px]" />
        
        {/* Ambient Moving Orbs */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-brand-primary/10 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 15, repeat: Infinity }}
          className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-brand-secondary/10 rounded-full blur-[120px]" 
        />

        {/* Dynamic Glow for Active Role */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={role}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 transition-colors duration-1000"
            style={{ 
              background: `radial-gradient(circle at 50% 50%, ${roleConfigs[role].color}15 0%, transparent 60%)` 
            }}
          />
        </AnimatePresence>
      </div>

      {/* Brand & System Status */}
      <motion.div 
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 flex flex-col items-center mb-12"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px w-12 bg-gradient-to-l from-white/20 to-transparent" />
          <div className="flex flex-col items-center gap-2">
             <StartLogo className="w-20 h-20 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
             <div className="flex gap-1.5 mt-2">
               {["GPS", "NET", "SYNC"].map(s => (
                 <div key={s} className="px-2 py-0.5 rounded-full border border-white/5 bg-white/5 flex items-center gap-1">
                   <div className={`w-1 h-1 rounded-full ${s === 'GPS' && systemStatus.gps === 'active' ? 'bg-brand-success shadow-[0_0_5px_#10b981]' : 'bg-white/20'}`} />
                   <span className="text-[7px] font-black text-white/30 uppercase tracking-widest">{s}</span>
                 </div>
               ))}
             </div>
          </div>
          <div className="h-px w-12 bg-gradient-to-r from-white/20 to-transparent" />
        </div>
        <h1 className="text-4xl font-black text-white tracking-[-0.05em] text-center">
          START <span className="text-white/40 font-light">LOCATION</span>
        </h1>
      </motion.div>

      {/* High-Performance Interface Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[460px] relative z-10"
      >
        <div className="bg-[#0f172a]/60 backdrop-blur-2xl rounded-[48px] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden">
          
          {/* Role Selection */}
          <div className="p-3 bg-brand-card/50 backdrop-blur-md flex gap-2 border-b border-brand-border">
            {(["driver", "vendor", "admin"] as const).map((r) => (
              <button
                key={r}
                onClick={() => { setRole(r); setError(""); }}
                className={`flex-1 group relative flex flex-col items-center py-4 px-2 rounded-[32px] transition-all duration-500 ${
                  role === r ? "bg-white/5" : "hover:bg-white/[0.02]"
                }`}
              >
                {role === r && (
                  <motion.div 
                    layoutId="roleSelector"
                    className="absolute inset-0 border border-white/10 rounded-[32px] bg-gradient-to-b from-white/5 to-transparent shadow-inner"
                  />
                )}
                <div className={`mb-2 transition-all duration-500 ${role === r ? "scale-110" : "opacity-20 grayscale group-hover:opacity-40"}`} style={{ color: role === r ? roleConfigs[r].color : 'white' }}>
                  {roleConfigs[r].icon}
                </div>
                <span className={`text-[9px] font-black tracking-[0.2em] transition-colors duration-500 ${role === r ? "text-white" : "text-white/20"}`}>
                  {roleConfigs[r].label}
                </span>
                {role === r && (
                  <motion.div 
                    layoutId="activeBar"
                    className="absolute -bottom-1 w-6 h-1 rounded-full"
                    style={{ backgroundColor: roleConfigs[r].color }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Form Section */}
          <div className="p-10">
            <form onSubmit={handleLogin} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] px-2 block">Identity Code</label>
                <div className={`group relative flex items-center bg-brand-muted rounded-[28px] border-2 border-brand-border transition-all duration-500 ${focusedField === 'email' ? 'border-white/20 ring-4 ring-white/5' : 'border-transparent'}`}>
                  <div className="p-5 pl-2 text-white/20">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@start-location.com"
                    className="w-full bg-transparent p-5 pr-2 outline-none text-sm font-bold text-white placeholder:text-white/10 focus:bg-transparent"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] px-2 block">Security Token</label>
                <div className={`group relative flex items-center bg-brand-muted rounded-[28px] border-2 border-brand-border transition-all duration-500 ${focusedField === 'password' ? 'border-white/20 ring-4 ring-white/5' : 'border-transparent'}`}>
                  <div className="p-5 pl-2 text-white/20">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent p-5 pr-2 outline-none text-sm font-bold text-white placeholder:text-white/10 focus:bg-transparent"
                  />
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-brand-secondary/10 border border-brand-secondary/20 p-5 rounded-[28px] flex items-center gap-4"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-secondary animate-pulse" />
                    <span className="text-xs font-bold text-brand-secondary">{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="w-full relative group h-[72px] flex items-center justify-center gap-3 overflow-hidden rounded-[28px] transition-all active:scale-95 disabled:opacity-50"
              >
                <div className="absolute inset-0 transition-colors duration-700" style={{ backgroundColor: roleConfigs[role].color }} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 bg-white transition-opacity duration-500" />
                
                <span className="relative z-10 text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-3">
                  {loading ? (
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Initiate Access</span>
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
                
                {/* Visual Feedback Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </button>
            </form>
          </div>
        </div>

        {/* Decorative Floating Elements */}
        <div className="absolute -top-6 -right-6 w-12 h-12 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 flex items-center justify-center rotate-12">
          <Fingerprint size={20} className="text-white/20" />
        </div>
        <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 flex items-center justify-center -rotate-12">
          <Activity size={20} className="text-white/20" />
        </div>
      </motion.div>

      {/* Footer System Diagnostics */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-16 flex flex-col items-center gap-4"
      >
        <div className="flex items-center gap-6 px-8 py-3 bg-white/[0.02] border border-white/5 rounded-full backdrop-blur-lg">
          <div className="flex items-center gap-2">
            <Wifi size={12} className="text-green-500" />
            <span className="text-[8px] font-black text-white/30 tracking-[0.2em] uppercase">Cloud Node Active</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-2">
            <ShieldCheck size={12} className="text-blue-500" />
            <span className="text-[8px] font-black text-white/30 tracking-[0.2em] uppercase">E2EE Secured</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-2">
            <Pin size={12} className="text-red-500" />
            <span className="text-[8px] font-black text-white/30 tracking-[0.2em] uppercase">Precision GPS: High</span>
          </div>
        </div>
        <p className="text-[8px] font-bold text-white/10 tracking-[0.5em] uppercase">Start Location Services v0.2.0 • 2026</p>
      </motion.div>

      {/* Interactive Floating Marker Decoration */}
      <div className="fixed bottom-10 right-10 opacity-20 hover:opacity-100 transition-opacity cursor-help">
        <LocationMarker size={32} color={roleConfigs[role].color} />
      </div>
    </main>
  );
}


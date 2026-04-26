import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // الهوية البصرية الجديدة لـ Start-OS
        brand: {
          primary: "#3b82f6",    // أزرق احترافي
          secondary: "#ef4444",  // أحمر طيارين (سرعة)
          warning: "#f59e0b",    // برتقالي مطاعم (ثقة)
          success: "#10b981",    // أخضر مالي
          dark: "#0f172a",       // خلفية الآدمن الفخمة
          card: "#1e293b",       // بطاقات الآدمن
          border: "#334155",     // حدود أنيقة
          muted: "#475569",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
      },
      boxShadow: {
        'premium': '0 20px 50px rgba(0, 0, 0, 0.1)',
        'glow-primary': '0 0 20px rgba(59, 130, 246, 0.5)',
        'neon': '0 0 20px #00f5ff, 0 0 40px #00f5ff',
        'neon-purple': '0 0 20px #8b5cf6, 0 0 40px #8b5cf6',
        'neon-orange': '0 0 20px #f97316, 0 0 40px #f97316',
        'card-lift': '0 10px 30px rgba(0,0,0,0.1), 0 1px 8px rgba(0,0,0,0.06)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 1.5s infinite linear',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;

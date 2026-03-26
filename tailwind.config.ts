import type { Config } from "tailwindcss";

const config: Config = {
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
      }
    },
  },
  plugins: [],
};
export default config;

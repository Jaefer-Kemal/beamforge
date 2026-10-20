import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ios: {
          blue: "#007AFF",
          "blue-hover": "#0062cc",
          slate: "#0F172A",
          muted: "#64748B",
          dim: "#94A3B8",
          emerald: "#10B981",
          amber: "#F59E0B",
          "amber-hover": "#D97706",
          violet: "#8B5CF6",
          crimson: "#EF4444",
          surface: "rgba(255, 255, 255, 0.78)",
          border: "rgba(255, 255, 255, 0.85)",
        },
        glass: {
          // Daylight tokens
          "panel-bg": "rgba(255, 255, 255, 0.78)",
          "panel-border": "rgba(255, 255, 255, 0.85)",
          "popover-bg": "rgba(255, 255, 255, 0.90)",
          "popover-border": "rgba(203, 213, 225, 0.80)",
          // Midnight tokens
          "dark-panel-bg": "rgba(15, 23, 42, 0.75)",
          "dark-panel-border": "rgba(255, 255, 255, 0.10)",
          "dark-popover-bg": "rgba(15, 23, 42, 0.95)",
          "dark-popover-border": "rgba(255, 255, 255, 0.15)",
        },
        obsidian: {
          void: "#0B0F17",
          editor: "#111827",
          sidebar: "#0F172A",
          surface: "#1E293B",
          border: "#1E3A5F",
          "border-active": "#8B5CF6",
          text: {
            primary: "#F8FAFC",
            secondary: "#94A3B8",
            muted: "#64748B",
          },
          accent: {
            DEFAULT: "#8b5cf6",
            glow: "#a855f7",
            dark: "#6d28d9",
          },
        },
        beam: {
          emerald: "#10b981",
          amber: "#f59e0b",
          crimson: "#ef4444",
          cyan: "#38bdf8",
          violet: "#8b5cf6",
        },
        // Boot.dev pedagogy semantic colors
        bf: {
          submit: "#F59E0B",
          "submit-hover": "#D97706",
          run: "#007AFF",
          "run-hover": "#0062CC",
          pass: "#10B981",
          fail: "#EF4444",
          hint: "#8B5CF6",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: [
          "var(--font-jetbrains-mono)",
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "monospace",
        ],
      },
      boxShadow: {
        // Daylight glass shadows
        "glass-panel": "0 8px 32px rgba(15, 23, 42, 0.06), 0 4px 12px rgba(15, 23, 42, 0.03), inset 0 1px 1px rgba(255,255,255,0.95)",
        "glass-popover": "0 20px 50px rgba(15, 23, 42, 0.12), 0 8px 20px rgba(15, 23, 42, 0.06)",
        "glass-float": "0 20px 40px -12px rgba(15, 23, 42, 0.12), 0 8px 16px -4px rgba(15, 23, 42, 0.04)",
        "glass-pill": "0 4px 12px rgba(0, 0, 0, 0.08)",
        // Dark glass shadows
        "obsidian-card": "0 12px 40px rgba(0, 0, 0, 0.45), 0 4px 16px rgba(0, 0, 0, 0.30)",
        "obsidian-popover": "0 24px 60px rgba(0, 0, 0, 0.60), 0 12px 30px rgba(0, 0, 0, 0.40)",
        // Glow shadows
        "obsidian-glow": "0 0 20px -3px rgba(139, 92, 246, 0.35)",
        "emerald-glow": "0 0 16px -2px rgba(16, 185, 129, 0.4)",
        "amber-glow": "0 0 16px -2px rgba(245, 158, 11, 0.4)",
        "crimson-glow": "0 0 16px -2px rgba(239, 68, 68, 0.5)",
        "blue-glow": "0 0 16px -2px rgba(0, 122, 255, 0.4)",
      },
      backdropBlur: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "28px",
        "2xl": "40px",
        "3xl": "64px",
      },
      animation: {
        "progress-pulse": "progress-pulse 1.8s ease-in-out infinite",
        "stage-spin": "stage-spinner 0.9s linear infinite",
        "xp-glow": "xp-glow 2.5s ease-in-out infinite",
        "pulse-packet": "pulse-packet 1.5s infinite ease-in-out",
        "slide-down": "slide-down 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.18s ease-out",
      },
      keyframes: {
        "progress-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(16, 185, 129, 0.50)" },
          "50%": { boxShadow: "0 0 0 5px rgba(16, 185, 129, 0)" },
        },
        "stage-spinner": {
          to: { transform: "rotate(360deg)" },
        },
        "xp-glow": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(245, 158, 11, 0.30)" },
          "50%": { boxShadow: "0 0 20px rgba(245, 158, 11, 0.65)" },
        },
        "pulse-packet": {
          "0%": { transform: "scale(0.95)", opacity: "0.85" },
          "50%": { transform: "scale(1.15)", opacity: "1" },
          "100%": { transform: "scale(0.95)", opacity: "0.85" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

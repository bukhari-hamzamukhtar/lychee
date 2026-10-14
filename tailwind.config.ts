import type { Config } from "tailwindcss";

/**
 * Palette taken from lablab.ai: Inter, indigo primary, slate neutrals.
 * Severity colours stay separate from the brand so a red always means risk
 * and never decoration.
 */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B1120",
        surface: "#0F172A",
        panel: "#1E293B",
        raised: "#263449",
        edge: "#334155",
        hair: "#1E293B",
        primary: { DEFAULT: "#6366F1", strong: "#4F46E5", soft: "#A5B4FC", wash: "#312E81" },
        body: "#E2E8F0",
        muted: "#94A3B8",
        faint: "#64748B",
        crit: "#EF4444",
        warn: "#F59E0B",
        ok: "#10B981",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        "pulse-ring": { "0%,100%": { opacity: "0.35" }, "50%": { opacity: "1" } },
        grow: { "0%": { transform: "scaleX(0)" }, "100%": { transform: "scaleX(1)" } },
      },
      animation: {
        "fade-up": "fade-up 0.35s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.3s ease both",
        shimmer: "shimmer 1.6s linear infinite",
        "pulse-ring": "pulse-ring 1.4s ease-in-out infinite",
        grow: "grow 0.5s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from "tailwindcss";

/**
 * Near-black, one accent, hairlines. The register AMD uses for this event and
 * the one Google, NVIDIA and OpenAI use on their own product pages: type and
 * rule carry the design, colour appears only where it means something.
 */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#08090B",
        "bg-raised": "#0E1013",
        line: "#1C1F24",
        "line-bright": "#32373F",
        fg: "#F2F4F7",
        mid: "#9BA3AE",
        dim: "#6B7280",
        accent: "#FF4D2E",
        crit: "#FF4D2E",
        warn: "#E8A33D",
        ok: "#3FBF7F",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: { tightest: "-0.045em" },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(14px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        grow: { "0%": { transform: "scaleX(0)" }, "100%": { transform: "scaleX(1)" } },
        "draw": { "0%": { strokeDashoffset: "var(--len)" }, "100%": { strokeDashoffset: "0" } },
        "pulse-soft": { "0%,100%": { opacity: "0.3" }, "50%": { opacity: "1" } },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.5s ease both",
        shimmer: "shimmer 1.6s linear infinite",
        grow: "grow 0.7s cubic-bezier(0.16,1,0.3,1) both",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;

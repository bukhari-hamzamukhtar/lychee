import type { Config } from "tailwindcss";

/** Colours resolve through CSS variables, so one class name serves both themes. */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        "bg-raised": v("bg-raised"),
        line: v("line"),
        "line-bright": v("line-bright"),
        fg: v("fg"),
        mid: v("mid"),
        dim: v("dim"),
        accent: v("accent"),
        crit: v("crit"),
        warn: v("warn"),
        ok: v("ok"),
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: { tightest: "-0.045em" },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(14px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        grow: { "0%": { transform: "scaleX(0)" }, "100%": { transform: "scaleX(1)" } },
        "pulse-soft": { "0%,100%": { opacity: "0.35" }, "50%": { opacity: "1" } },
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
      },
      animation: {
        "fade-up": "fade-up 0.55s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 1.6s linear infinite",
        grow: "grow 0.7s cubic-bezier(0.16,1,0.3,1) both",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        marquee: "marquee 38s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;

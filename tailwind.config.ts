import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#0f1115",
        panel: "#161a21",
        edge: "#242a35",
        accent: "#f0b429",
        ok: "#3dd68c",
        warn: "#f0b429",
        crit: "#f0616d",
      },
    },
  },
  plugins: [],
} satisfies Config;

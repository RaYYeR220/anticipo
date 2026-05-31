import type { Config } from "tailwindcss";

// Anticipo "warm-LATAM" design system (distilled from design-lab/variant-11).
// See apps/web/design-lab/CHOICE.md for the rationale + semantic mapping.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        terracotta: { DEFAULT: "#c8553d", deep: "#9e3b29" },
        sun: { DEFAULT: "#e9a93b", soft: "#f4c95d" },
        agave: { DEFAULT: "#3f7d5b", deep: "#275a3e" },
        rose: "#d96c75",
        teal: "#2f8a8a",
        cream: { DEFAULT: "#fbf3e4", 2: "#f6e8cf" },
        card: "#fffaf0",
        ink: { DEFAULT: "#3a2418", soft: "#7a5c45" },
        line: "rgba(58,36,24,0.14)",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-epilogue)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        warm: "0 18px 40px -22px rgba(120,55,30,0.55)",
        "warm-lg": "0 24px 50px -18px rgba(120,55,30,0.55)",
        "btn-primary": "0 12px 24px -10px rgba(158,59,41,0.7)",
        "btn-confirm": "0 14px 28px -10px rgba(39,90,62,0.75)",
      },
      borderRadius: {
        card: "24px",
        field: "14px",
        btn: "15px",
      },
      backgroundImage: {
        "warm-page":
          "radial-gradient(1200px 600px at 88% -8%, rgba(233,169,59,0.30), transparent 60%), radial-gradient(900px 500px at -6% 12%, rgba(63,125,91,0.20), transparent 55%)",
        "grad-primary": "linear-gradient(135deg, #c8553d, #9e3b29)",
        "grad-confirm": "linear-gradient(135deg, #3f7d5b, #275a3e)",
        "grad-payoff": "linear-gradient(135deg, #e9a93b, #c8553d)",
        "grad-ai-head": "linear-gradient(120deg, #275a3e, #3f7d5b)",
        "grad-mark": "conic-gradient(from 210deg, #f4c95d, #c8553d, #d96c75, #3f7d5b, #f4c95d)",
      },
      keyframes: {
        pulse_ring: {
          "0%": { boxShadow: "0 0 0 0 rgba(244,201,93,0.7)" },
          "70%": { boxShadow: "0 0 0 9px rgba(244,201,93,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(244,201,93,0)" },
        },
      },
      animation: { "pulse-ring": "pulse_ring 1.8s infinite" },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        surface: "#111111",
        "surface-2": "#1a1a1a",
        border: "#222222",
        accent: "#e8ff47",
        "accent-dim": "rgba(232, 255, 71, 0.125)",
        muted: "#555555",
        secondary: "#888888",
        fg: "#f0f0f0",
        danger: "#ff4757",
        success: "#2ed573",
      },
      fontFamily: {
        display: ["Syne", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["\"DM Sans\"", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        focus: "0 0 0 3px rgba(232, 255, 71, 0.125)",
      },
    },
  },
  plugins: [],
} satisfies Config;

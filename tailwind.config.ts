import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 22px 70px rgba(24, 51, 47, 0.12)",
        insetLine: "inset 0 0 0 1px rgba(24, 51, 47, 0.08)"
      },
      colors: {
        ink: "#18332f",
        chalk: "#f6f2e9",
        field: "#2f6f73",
        rust: "#be4b36",
        maize: "#d6a642",
        night: "#111f1d"
      }
    }
  },
  plugins: []
} satisfies Config;

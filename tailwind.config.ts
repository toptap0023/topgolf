import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Themeable surfaces — driven by CSS vars (see globals.css :root / .light).
        bg: {
          DEFAULT: "#ffffff", // `text-bg` = white text on accent fills
          soft: "rgb(var(--bg-soft) / <alpha-value>)", // page canvas
          panel: "rgb(var(--bg-panel) / <alpha-value>)", // card / surface
          panel2: "rgb(var(--bg-panel2) / <alpha-value>)", // raised fill / inputs / hover
        },
        line: "rgb(var(--line) / <alpha-value>)", // hairline separators / borders
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)", // primary text
          muted: "rgb(var(--ink-muted) / <alpha-value>)", // secondary text
        },
        // Brand — fairway green (reads on both light + dark as a filled button)
        accent: {
          DEFAULT: "#16a34a",
          dark: "#15803d",
          light: "#4ade80",
        },
        good: "#30d158", // solid contact / on-target (Apple green)
        bad: "#ff453a", // mishit / offline (Apple red)
        warn: "#ff9f0a", // caution (Apple orange)
        info: "#0a84ff", // neutral data series (Apple blue)
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "SF Pro Display",
          "Inter",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SF Mono",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.4)",
        glow: "0 6px 18px rgba(22,163,74,.4)",
      },
      borderRadius: {
        xl2: "20px",
      },
    },
  },
  plugins: [],
};

export default config;

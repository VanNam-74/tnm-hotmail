/** @type {import('tailwindcss').Config} */
// Colors map to the CSS variables in src/styles/index.css (TNM Hotmail design system, light only).
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        raised: "var(--surface-raised)",
        sunken: "var(--surface-sunken)",
        hover: "var(--surface-hover)",
        ink: "var(--ink)",
        sec: "var(--ink-muted)",
        muted: "var(--ink-muted)",
        subtle: "var(--ink-subtle)",
        line: "var(--line)",
        linestrong: "var(--line-strong)",
        hero: "var(--hero)",
        heroink: "var(--hero-ink)",
        heromuted: "var(--hero-muted)",
        heroline: "var(--hero-line)",
        ok: "var(--signal-ok)",
        warn: "var(--signal-warn)",
        danger: "var(--signal-danger)",
      },
      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["Geist Mono", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
      },
      borderRadius: { sm: "8px", md: "12px", lg: "20px", xl: "28px" },
    },
  },
  plugins: [],
};

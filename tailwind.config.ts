import type { Config } from "tailwindcss";

/**
 * Tailwind v4 primarily uses `@theme` in `app/globals.css`.
 * This config mirrors tokens for tooling / shadcn-style `extend` mapping.
 */
const config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-vazirmatn)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 0.25rem)",
        sm: "calc(var(--radius) - 0.5rem)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        fab: "var(--shadow-fab)",
        drawer: "var(--shadow-drawer)",
        dialog: "var(--shadow-dialog)",
      },
      fontSize: {
        micro: ["var(--type-micro)", { lineHeight: "1.2" }],
        caption: ["var(--type-caption)", { lineHeight: "1.35" }],
        label: ["var(--type-label)", { lineHeight: "1.4" }],
        "body-sm": ["var(--type-body-sm)", { lineHeight: "1.45" }],
        body: ["var(--type-body)", { lineHeight: "1.5" }],
        title: ["var(--type-title)", { lineHeight: "1.25" }],
        display: ["var(--type-display)", { lineHeight: "1.05" }],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        mist: "var(--mist)",
        ink: "var(--ink)",
        highlight: "var(--highlight)",
        sheet: {
          DEFAULT: "var(--sheet)",
          muted: "var(--sheet-muted)",
        },
        overlay: "var(--overlay)",
        "on-hero": {
          DEFAULT: "var(--on-hero)",
          muted: "var(--on-hero-muted)",
          soft: "var(--on-hero-soft)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
          soft: "var(--success-soft)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
          soft: "var(--destructive-soft)",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;

import forms from "@tailwindcss/forms";
import containerQueries from "@tailwindcss/container-queries";

/**
 * Same theme the CDN build used (it was inline in index.html), now
 * compiled at build time so the app needs no Tailwind CDN at runtime.
 * @type {import('tailwindcss').Config}
 */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./{components,pages,hooks,contexts,services,utils}/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#0D39B6",
        "accent-blue": "#3B82F6",
        "background-light": "#F6F6F8",
        "background-dark": "#101522",
        "surface-light": "#FFFFFF",
        "surface-dark": "#1A2033",
        "text-light": "#111318",
        "text-dark": "#E3E4E6",
        "subtext-light": "#616C89",
        "subtext-dark": "#A0A7B9",
        "border-light": "#E3E4E6",
        "border-dark": "#2E3447",
        "success-light": "#16A34A",
        "success-dark": "#4ADE80",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        full: "9999px",
      },
    },
  },
  plugins: [forms, containerQueries],
};

import daisyui from 'daisyui';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['Fira Code', 'Courier New', 'monospace']
      }
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        night: {
          "primary": "#38bdf8",
          "secondary": "#a855f7",
          "accent": "#f43f5e",
          "neutral": "#1e293b",
          "base-100": "#0f172a",
          "base-200": "#020617",
          "base-300": "#1e293b",
          "info": "#0ea5e9",
          "success": "#10b981",
          "warning": "#f59e0b",
          "error": "#ef4444",
        }
      },
      "dark",
      "cyberpunk"
    ],
    defaultTheme: "night"
  }
}

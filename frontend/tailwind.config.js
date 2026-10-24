/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Soft, calming KindSignals palette.
        brand: {
          50: "#eefcfb",
          100: "#d4f6f4",
          200: "#aeeceb",
          300: "#79dddd",
          400: "#46c5c8",
          500: "#2aa8ad",
          600: "#228a90",
          700: "#206e74",
          800: "#1f585e",
          900: "#1e4a50",
        },
        lavender: {
          50: "#f6f5fd",
          100: "#eeecfb",
          200: "#dedbf7",
          300: "#c4bdf0",
          400: "#a596e6",
          500: "#8872d9",
          600: "#7256c7",
        },
        sand: {
          50: "#faf8f4",
          100: "#f3eee5",
        },
        // Sage & Serenity palette (KindSignals brand).
        deepsage: {
          50: "#eef3f1",
          100: "#d6e2dd",
          200: "#aec6bd",
          300: "#86a99b",
          400: "#6a9184",
          500: "#52796f",
          600: "#436158",
          700: "#344c45",
          800: "#293b37",
          900: "#1f2d29",
        },
        sage: {
          50: "#f2f8f4",
          100: "#e3f0e8",
          200: "#cfe4d7",
          300: "#a8c9b8",
          400: "#8fb9a4",
          500: "#73a289",
        },
        ivory: "#f7f8f2",
        rose: {
          100: "#f5e3e5",
          200: "#ecc9cd",
          300: "#dda6ac",
          400: "#cf8f96",
        },
        charcoal: "#293b37",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(32, 110, 116, 0.18)",
      },
    },
  },
  plugins: [],
};

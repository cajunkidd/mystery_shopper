/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        stine: {
          50: "#f3f6fb",
          100: "#dde6f1",
          500: "#1d4f8b",
          600: "#174170",
          700: "#0f2e52",
        },
      },
    },
  },
  plugins: [],
};

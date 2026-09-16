/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Large, touch-friendly hit targets are the default, not an
      // exception — this app is used on iPads by all ages.
      spacing: {
        touch: "3.5rem",
      },
    },
  },
  plugins: [],
};

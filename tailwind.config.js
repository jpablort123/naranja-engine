/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./components/estrategia/**/*.{js,jsx}",
  ],
  theme: { extend: { fontFamily: { sans: ["DM Sans", "system-ui", "sans-serif"] } } },
  plugins: [],
};

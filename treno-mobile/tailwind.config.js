/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./providers/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#00FF87",
        "primary-dark": "#00CC6A",
        secondary: "#0066FF",
        surface: "#111111",
        background: "#0A0A0A",
      },
    },
  },
  plugins: [],
};

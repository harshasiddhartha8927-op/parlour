/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/App.jsx",
    "./src/main.jsx",
    "./src/components/**/*.{js,jsx}",
    "./src/pages/**/*.{js,jsx}",
    "./src/data/**/*.{js,jsx}",
    "./src/utils/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        blush: "#F8BBD0",
        rose: "#E85D8F",
        petal: "#FFF4F8",
        lavender: "#DCC7FF",
        plum: "#5B315F",
        gold: "#D7A84B",
        cream: "#FFFDF9",
      },
      fontFamily: {
        display: ['"Playfair Display"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        salon: "0 20px 55px rgba(232, 93, 143, 0.18)",
        gold: "0 12px 30px rgba(215, 168, 75, 0.22)",
      },
    },
  },
  plugins: [],
};

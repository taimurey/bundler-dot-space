/* eslint-disable @typescript-eslint/no-var-requires */
const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        'custom-green': {
          '100': '#06d6a0',
          '200': '#06d6a0',
          '300': '#06d6a0',
          '400': '#06d6a0',
          '500': '#06d6a0',
          '600': '#06d6a0',
          '700': '#06d6a0',
          '800': '#33ff70',
          '900': '#06d6a0',
          '1000': '#00ff73',
        },
      }
    },
  },
  plugins: [],
};
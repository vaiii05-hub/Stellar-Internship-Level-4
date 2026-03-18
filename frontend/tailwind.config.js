/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0f1117',
          800: '#1a1d2e',
          700: '#252838',
        }
      }
    },
  },
  plugins: [],
}
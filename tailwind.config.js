/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'olive-black': '#1A1C19',
        'matte-black': '#0D0D0D',
        'champagne-gold': '#E6D5B8',
        'brushed-gold': '#D4AF37',
        'cotton-white': '#F8F5EA',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Didot', 'Georgia', 'serif'],
        sans: ['Inter', 'Montserrat', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
